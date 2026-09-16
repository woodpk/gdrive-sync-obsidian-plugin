import { normalizeVaultPath, normalizedComparisonPath, validateCrossPlatformPath } from "../local/path-policy";
import {
  VALIDATION_SANDBOX_MUTATIONS,
  isValidationSandboxSurface,
  validationSandboxOwnership,
  type ValidationRunIdentity,
  type ValidationSandboxAuthorization,
  type ValidationSandboxAuthorizationRequest,
  type ValidationSandboxOwnership,
  type ValidationSandboxRejectionReason,
  type ValidationSandboxSurface,
} from "./run-sandbox-checkpoint-contracts";

export const VALIDATION_SANDBOX_PROVENANCE_STATES = ["allocated", "created", "removed"] as const;
export type ValidationSandboxProvenanceState = (typeof VALIDATION_SANDBOX_PROVENANCE_STATES)[number];

export interface ValidationSandboxSurfaceRoot {
  readonly surface: ValidationSandboxSurface;
  readonly root: string;
}

export interface ValidationSandboxProvenanceRecord {
  readonly ownership: ValidationSandboxOwnership;
  readonly locator: string;
  readonly state: ValidationSandboxProvenanceState;
}

export interface ValidationSafetySandboxSnapshot {
  readonly run: ValidationRunIdentity;
  readonly roots: readonly ValidationSandboxSurfaceRoot[];
  readonly provenance: readonly ValidationSandboxProvenanceRecord[];
}

export type ValidationSandboxOwnershipIssue =
  | {
      readonly status: "issued";
      readonly ownership: ValidationSandboxOwnership;
      readonly provenance: ValidationSandboxProvenanceRecord;
    }
  | { readonly status: "rejected"; readonly reason: ValidationSandboxRejectionReason };

export interface ValidationSafetySandboxOptions {
  readonly run: ValidationRunIdentity;
  readonly roots: readonly ValidationSandboxSurfaceRoot[];
  readonly provenance?: readonly ValidationSandboxProvenanceRecord[];
}

const PROVENANCE_STATE_SET: ReadonlySet<string> = new Set(VALIDATION_SANDBOX_PROVENANCE_STATES);
const SANDBOX_MUTATION_SET: ReadonlySet<string> = new Set(VALIDATION_SANDBOX_MUTATIONS);

function sameRunId(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId;
}

function sameScenario(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.scenarioId === right.scenarioId;
}

function normalizedStrictDescendant(candidate: string, root: string): boolean {
  if (validateCrossPlatformPath(candidate).status !== "compatible") return false;
  if (validateCrossPlatformPath(root).status !== "compatible") return false;
  const candidateComparison = normalizedComparisonPath(candidate);
  const rootComparison = normalizedComparisonPath(root);
  return candidateComparison !== rootComparison && candidateComparison.startsWith(`${rootComparison}/`);
}

function rootsOverlap(left: string, right: string): boolean {
  const leftComparison = normalizedComparisonPath(left);
  const rightComparison = normalizedComparisonPath(right);
  return leftComparison === rightComparison
    || leftComparison.startsWith(`${rightComparison}/`)
    || rightComparison.startsWith(`${leftComparison}/`);
}

function freezeOwnership(ownership: ValidationSandboxOwnership): ValidationSandboxOwnership {
  return validationSandboxOwnership({
    resourceId: String(ownership.resourceId),
    surface: ownership.surface,
    owner: ownership.owner,
  });
}

function freezeProvenance(record: ValidationSandboxProvenanceRecord): ValidationSandboxProvenanceRecord {
  if (!PROVENANCE_STATE_SET.has(record.state)) {
    throw new Error(`Unsupported validation sandbox provenance state: ${String(record.state)}`);
  }
  return Object.freeze({
    ownership: freezeOwnership(record.ownership),
    locator: normalizeVaultPath(record.locator),
    state: record.state,
  });
}

function authorized(ownership: ValidationSandboxOwnership): ValidationSandboxAuthorization {
  return Object.freeze({ status: "authorized", ownership });
}

function rejected(reason: ValidationSandboxRejectionReason): ValidationSandboxAuthorization {
  return Object.freeze({ status: "rejected", reason });
}

/**
 * Validation-only authorization and provenance guard for disposable Phase 6 harness surfaces.
 *
 * This class deliberately performs no filesystem, Google Drive, or production-state mutation.
 * Consumers must obtain authorization here before a harness-owned adapter performs setup,
 * mutation, or cleanup, and ordinary production synchronization has no dependency on this type.
 */
export class ValidationSafetySandbox {
  readonly #run: ValidationRunIdentity;
  readonly #roots: readonly ValidationSandboxSurfaceRoot[];
  readonly #rootBySurface: ReadonlyMap<ValidationSandboxSurface, string>;
  readonly #provenance: ValidationSandboxProvenanceRecord[];
  #sequence = 0;

  public constructor(options: ValidationSafetySandboxOptions) {
    this.#run = options.run;

    const roots: ValidationSandboxSurfaceRoot[] = [];
    const rootBySurface = new Map<ValidationSandboxSurface, string>();
    for (const configured of options.roots) {
      if (!isValidationSandboxSurface(String(configured.surface))) {
        throw new Error(`Unsupported validation sandbox surface root: ${String(configured.surface)}`);
      }
      if (rootBySurface.has(configured.surface)) {
        throw new Error(`Validation sandbox surface has more than one configured root: ${configured.surface}`);
      }
      const validation = validateCrossPlatformPath(configured.root);
      if (validation.status !== "compatible") {
        throw new Error(`Validation sandbox root must be a safe vault-relative path: ${configured.root}`);
      }
      const root = normalizeVaultPath(configured.root);
      for (const peer of roots) {
        if (rootsOverlap(peer.root, root)) {
          throw new Error(`Validation sandbox roots must not overlap: ${peer.root} and ${root}`);
        }
      }
      const frozen = Object.freeze({ surface: configured.surface, root });
      roots.push(frozen);
      rootBySurface.set(configured.surface, root);
    }

    this.#roots = Object.freeze(roots);
    this.#rootBySurface = rootBySurface;
    this.#provenance = (options.provenance ?? []).map(freezeProvenance);
  }

  public issueOwnership(input: {
    readonly surface: ValidationSandboxSurface;
    readonly locator: string;
  }): ValidationSandboxOwnershipIssue {
    if (!isValidationSandboxSurface(String(input.surface))) {
      return Object.freeze({ status: "rejected", reason: "surface-out-of-scope" });
    }
    const root = this.#rootBySurface.get(input.surface);
    if (root === undefined || !normalizedStrictDescendant(input.locator, root)) {
      return Object.freeze({ status: "rejected", reason: "surface-out-of-scope" });
    }

    const locator = normalizeVaultPath(input.locator);
    if (this.#recordsForLocator(input.surface, locator).length !== 0) {
      return Object.freeze({ status: "rejected", reason: "ownership-ambiguous" });
    }

    let ownership: ValidationSandboxOwnership;
    do {
      this.#sequence += 1;
      ownership = validationSandboxOwnership({
        resourceId: `vh04:${String(this.#run.runId)}:${this.#run.scenarioId}:${input.surface}:${this.#sequence}`,
        surface: input.surface,
        owner: this.#run,
      });
    } while (this.#recordsForResource(ownership).length !== 0);

    const provenance = Object.freeze({ ownership, locator, state: "allocated" as const });
    this.#provenance.push(provenance);
    return Object.freeze({ status: "issued", ownership, provenance });
  }

  public authorize(request: ValidationSandboxAuthorizationRequest): ValidationSandboxAuthorization {
    if (!sameRunId(request.run, this.#run)) return rejected("run-mismatch");
    if (!sameScenario(request.run, this.#run)) return rejected("scenario-mismatch");
    if (!sameRunId(request.ownership.owner, this.#run)) return rejected("run-mismatch");
    if (!sameScenario(request.ownership.owner, this.#run)) return rejected("scenario-mismatch");
    if (!isValidationSandboxSurface(String(request.ownership.surface))) return rejected("surface-out-of-scope");
    if (!SANDBOX_MUTATION_SET.has(String(request.mutation))) return rejected("ownership-unproven");

    const root = this.#rootBySurface.get(request.ownership.surface);
    if (root === undefined) return rejected("surface-out-of-scope");

    const resourceRecords = this.#recordsForResource(request.ownership);
    if (resourceRecords.length === 0) return rejected("ownership-unproven");
    if (resourceRecords.length !== 1) return rejected("ownership-ambiguous");

    const record = resourceRecords[0];
    if (record.ownership.surface !== request.ownership.surface) return rejected("ownership-unproven");
    if (!sameRunId(record.ownership.owner, request.ownership.owner)) return rejected("ownership-unproven");
    if (!sameScenario(record.ownership.owner, request.ownership.owner)) return rejected("ownership-unproven");
    if (!normalizedStrictDescendant(record.locator, root)) return rejected("surface-out-of-scope");
    if (this.#recordsForLocator(record.ownership.surface, record.locator).length !== 1) {
      return rejected("ownership-ambiguous");
    }

    if (request.mutation === "setup") {
      return record.state === "allocated" ? authorized(record.ownership) : rejected("ownership-unproven");
    }
    return record.state === "created" ? authorized(record.ownership) : rejected("ownership-unproven");
  }

  public recordCreated(ownership: ValidationSandboxOwnership): ValidationSandboxAuthorization {
    const authorization = this.authorize({ run: this.#run, mutation: "setup", ownership });
    if (authorization.status === "rejected") return authorization;
    this.#transition(authorization.ownership, "allocated", "created");
    return authorized(authorization.ownership);
  }

  public recordRemoved(ownership: ValidationSandboxOwnership): ValidationSandboxAuthorization {
    const authorization = this.authorize({ run: this.#run, mutation: "cleanup", ownership });
    if (authorization.status === "rejected") return authorization;
    this.#transition(authorization.ownership, "created", "removed");
    return authorized(authorization.ownership);
  }

  public snapshot(): ValidationSafetySandboxSnapshot {
    return Object.freeze({
      run: this.#run,
      roots: Object.freeze(this.#roots.map(root => Object.freeze({ ...root }))),
      provenance: Object.freeze(this.#provenance.map(record => freezeProvenance(record))),
    });
  }

  #recordsForResource(ownership: ValidationSandboxOwnership): ValidationSandboxProvenanceRecord[] {
    return this.#provenance.filter(record => record.ownership.resourceId === ownership.resourceId);
  }

  #recordsForLocator(surface: ValidationSandboxSurface, locator: string): ValidationSandboxProvenanceRecord[] {
    const comparison = normalizedComparisonPath(locator);
    return this.#provenance.filter(record =>
      record.ownership.surface === surface
      && validateCrossPlatformPath(record.locator).status === "compatible"
      && normalizedComparisonPath(record.locator) === comparison
    );
  }

  #transition(
    ownership: ValidationSandboxOwnership,
    expected: ValidationSandboxProvenanceState,
    next: ValidationSandboxProvenanceState
  ): void {
    const index = this.#provenance.findIndex(record =>
      record.ownership.resourceId === ownership.resourceId
      && record.ownership.surface === ownership.surface
      && sameRunId(record.ownership.owner, ownership.owner)
      && sameScenario(record.ownership.owner, ownership.owner)
      && record.state === expected
    );
    if (index < 0) throw new Error("Authorized validation sandbox provenance transition could not be resolved.");
    const current = this.#provenance[index];
    this.#provenance[index] = Object.freeze({ ...current, state: next });
  }
}
