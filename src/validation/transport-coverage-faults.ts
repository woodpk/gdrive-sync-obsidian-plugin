import type { RemoteObjectId } from "../contracts/common";
import type { DriveResult, RemoteListing } from "../contracts/google-drive";
import type { FetchLike } from "../drive/auth";
import type {
  ValidationFaultBoundary,
  ValidationFaultKind,
  ValidationFaultResult,
  ValidationFaultSpecification,
} from "./driver-plan-fault-verifier-contracts";
import type { ValidationRunIdentity, ValidationStepId } from "./run-sandbox-checkpoint-contracts";

export const VALIDATION_TRANSPORT_COVERAGE_FAULT_KINDS = [
  "partial-remote-enumeration",
  "transport-offline",
  "authentication-required",
  "rate-limited",
  "quota-exhausted",
] as const satisfies readonly ValidationFaultKind[];

export type ValidationTransportCoverageFaultKind = (typeof VALIDATION_TRANSPORT_COVERAGE_FAULT_KINDS)[number];
export type ValidationTransportCoverageFaultSpecification = Extract<
  ValidationFaultSpecification,
  { readonly kind: ValidationTransportCoverageFaultKind }
>;

type ValidationTransportCoverageFaultBoundary = Extract<
  ValidationFaultBoundary,
  "remote-enumeration" | "transport-request" | "authentication-response" | "rate-limit-response" | "quota-response"
>;

const VALIDATION_TRANSPORT_COVERAGE_FAULT_KIND_SET: ReadonlySet<string> = new Set(VALIDATION_TRANSPORT_COVERAGE_FAULT_KINDS);
const PARTIAL_ENUMERATION_REASON = "validation-fault:partial-remote-enumeration";

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function isTransportCoverageFault(
  specification: ValidationFaultSpecification,
): specification is ValidationTransportCoverageFaultSpecification {
  return VALIDATION_TRANSPORT_COVERAGE_FAULT_KIND_SET.has(specification.kind);
}

/**
 * Explicit validation-only activation for VH10 fault adapters.
 *
 * The schedule is bound to one exact validation run and step. Production code does
 * not construct or import this type; adapters in this module require it explicitly.
 * Repeating a fault is represented by multiple specifications for successive
 * one-based occurrences at the same H0 boundary.
 */
export class ValidationTransportCoverageFaultSchedule {
  private readonly counts = new Map<ValidationTransportCoverageFaultBoundary, number>();
  private readonly triggered: ValidationFaultResult[] = [];
  private readonly specifications: readonly ValidationTransportCoverageFaultSpecification[];

  constructor(
    readonly run: ValidationRunIdentity,
    readonly stepId: ValidationStepId,
    specifications: readonly ValidationFaultSpecification[],
  ) {
    const accepted: ValidationTransportCoverageFaultSpecification[] = [];
    const occupied = new Set<string>();
    for (const specification of specifications) {
      if (!isTransportCoverageFault(specification)) {
        throw new Error(`VH10 does not own validation fault kind: ${specification.kind}`);
      }
      if (!sameRun(specification.run, run)) {
        throw new Error("VH10 fault specification must match the active validation run and scenario.");
      }
      if (specification.stepId !== stepId) {
        throw new Error("VH10 fault specification must match the active validation step.");
      }
      const slot = `${specification.boundary}:${specification.occurrence}`;
      if (occupied.has(slot)) throw new Error(`Duplicate VH10 fault occurrence: ${slot}`);
      occupied.add(slot);
      accepted.push(specification);
    }
    this.specifications = Object.freeze([...accepted]);
  }

  reach(boundary: ValidationTransportCoverageFaultBoundary): ValidationTransportCoverageFaultSpecification | undefined {
    const occurrence = (this.counts.get(boundary) ?? 0) + 1;
    this.counts.set(boundary, occurrence);
    return this.specifications.find(specification => specification.boundary === boundary && specification.occurrence === occurrence);
  }

  recordPreDispatch(specification: ValidationTransportCoverageFaultSpecification): void {
    this.triggered.push(Object.freeze({
      status: "triggered-pre-dispatch",
      specification,
      physicalEffect: Object.freeze({ status: "verified-not-applied", basis: "fault-before-dispatch" }),
    }));
  }

  recordNonMutation(specification: ValidationTransportCoverageFaultSpecification): void {
    this.triggered.push(Object.freeze({
      status: "triggered-non-mutation",
      specification,
      physicalEffect: Object.freeze({ status: "not-applicable" }),
    }));
  }

  history(): readonly ValidationFaultResult[] {
    return Object.freeze([...this.triggered]);
  }
}

function googleErrorResponse(status: number, reason: string, retryAfterSeconds?: number): Response {
  const headers = new Headers({ "content-type": "application/json" });
  if (retryAfterSeconds !== undefined) headers.set("retry-after", String(retryAfterSeconds));
  return new Response(JSON.stringify({
    error: {
      code: status,
      errors: [{ reason }],
      status: status === 401 ? "UNAUTHENTICATED" : "RESOURCE_EXHAUSTED",
      message: reason,
    },
  }), { status, headers });
}

/**
 * Wraps the existing FetchLike seam consumed by GoogleHttpTransport. Injected
 * responses therefore pass through the production retry and DriveSignal classifier.
 * No real fetch is dispatched for an injected VH10 transport/auth/rate/quota fault.
 */
export function validationTransportFaultFetch(
  delegate: FetchLike,
  schedule: ValidationTransportCoverageFaultSchedule,
): FetchLike {
  return async (input, init) => {
    const offline = schedule.reach("transport-request");
    if (offline?.kind === "transport-offline") {
      schedule.recordPreDispatch(offline);
      throw new TypeError("validation-injected-offline-transport-failure");
    }

    const authentication = schedule.reach("authentication-response");
    if (authentication?.kind === "authentication-required") {
      schedule.recordPreDispatch(authentication);
      return googleErrorResponse(401, "invalidCredentials");
    }

    const rate = schedule.reach("rate-limit-response");
    if (rate?.kind === "rate-limited") {
      schedule.recordPreDispatch(rate);
      return googleErrorResponse(429, "userRateLimitExceeded", 1);
    }

    const quota = schedule.reach("quota-response");
    if (quota?.kind === "quota-exhausted") {
      schedule.recordPreDispatch(quota);
      return googleErrorResponse(403, "storageQuotaExceeded");
    }

    return delegate(input, init);
  };
}

export interface ValidationRemoteEnumerationPort {
  listForReconciliation(rootId: RemoteObjectId): Promise<DriveResult<RemoteListing>>;
}

/**
 * Read-side adapter for E04. A successful complete production enumeration is
 * deterministically truncated and marked partial. The adapter never converts a
 * real failure into success and never represents an incomplete listing as complete.
 */
export class ValidationRemoteEnumerationFaultAdapter implements ValidationRemoteEnumerationPort {
  constructor(
    private readonly delegate: ValidationRemoteEnumerationPort,
    private readonly schedule: ValidationTransportCoverageFaultSchedule,
  ) {}

  async listForReconciliation(rootId: RemoteObjectId): Promise<DriveResult<RemoteListing>> {
    const observed = await this.delegate.listForReconciliation(rootId);
    if (!observed.ok || observed.value.completeness.status !== "complete") return observed;

    const specification = this.schedule.reach("remote-enumeration");
    if (specification?.kind !== "partial-remote-enumeration") return observed;

    this.schedule.recordNonMutation(specification);
    const retained = observed.value.entries.length === 0
      ? []
      : observed.value.entries.slice(0, observed.value.entries.length - 1);
    return {
      ok: true,
      value: {
        entries: Object.freeze(retained),
        completeness: { status: "partial", reason: PARTIAL_ENUMERATION_REASON },
      },
    };
  }
}
