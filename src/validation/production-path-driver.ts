import type {
  ConflictAssessment,
  ConflictProvenance,
  ContentEvidence,
  ProductSurfaceState,
  SynchronizationPlan,
  UserAction,
  UserActionResult,
  VaultPath,
  VersionReference,
} from "../contracts";
import type { DiagnosticEvent } from "../diagnostics/diagnostic-logger";
import type { ProductionDiagnosticCorrelation, ProductionDiagnosticRequestKind } from "../diagnostics/production-diagnostic-correlation";
import type { ExecutorRunEvidence } from "../product/production-executor";
import {
  VALIDATION_OBSERVED_CONFLICT_RESOLUTION_KINDS,
  type ValidationProductionDriverRequest,
  type ValidationProductionDriverResult,
} from "./driver-plan-fault-verifier-contracts";
import {
  bindValidationProductionDiagnostic,
  exactValidationProductionTerminal,
  validationAuthorityCycleKey,
  validValidationAuthorityCycleId,
  type ValidationProductionDiagnosticBinding,
} from "./production-diagnostic-correlation";
import type { ValidationRunIdentity } from "./run-sandbox-checkpoint-contracts";

/**
 * Narrow structural view of the existing production controller used by the
 * validation harness. This adapter owns no synchronization policy or authority.
 */
export interface ValidationProductionControllerPort {
  previewManual(): Promise<SynchronizationPlan | undefined>;
  previewVerifyReconcile(): Promise<SynchronizationPlan | undefined>;
  runAutomatic(trigger: "startup-resume" | "local-change" | "periodic"): Promise<void>;
  request(action: UserAction): Promise<UserActionResult>;
  requestPreviewAction(
    action: Extract<UserAction, { readonly kind: "execute-plan" | "approve-destructive-plan" }>,
    diagnosticRunId?: number,
  ): Promise<UserActionResult>;
  currentDiagnosticCorrelation(): ProductionDiagnosticCorrelation | undefined;
  diagnosticSnapshot(): readonly DiagnosticEvent[];
  currentSurface(): ProductSurfaceState;
  onSurface(listener: (surface: ProductSurfaceState) => void): () => void;
  currentRunEvidence(): ExecutorRunEvidence;
}

/** Runtime seam already exposed by ProductRuntime.productController(). */
export interface ValidationProductionRuntimePort {
  productController(): ValidationProductionControllerPort | undefined;
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function failureReason(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "production request failed without an Error reason";
}

type ObservedContentEvidence = Omit<ContentEvidence, "advisoryModifiedTimeMs">;
type ObservedVersionReference = Omit<VersionReference, "content"> & {
  readonly content?: ObservedContentEvidence;
};
type ObservedConflictProvenance = Omit<ConflictProvenance, "version" | "advisoryObservedAtMs"> & {
  readonly version: ObservedVersionReference;
};
interface ObservedConcurrentAlternates {
  readonly local: ObservedConflictProvenance;
  readonly remote: ObservedConflictProvenance;
  readonly base?: ObservedConflictProvenance;
}
interface ObservedProductionConflict {
  readonly kind: "unresolved-text";
  readonly conflictId: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>["conflictId"];
  readonly path: VaultPath;
  readonly preserved: ObservedConcurrentAlternates;
}

function captureContentEvidence(content: ContentEvidence | undefined): ObservedContentEvidence | undefined {
  if (!content) return undefined;
  return Object.freeze({
    hash: content.hash,
    sizeBytes: content.sizeBytes,
    revision: content.revision,
  });
}

function captureVersionReference(version: VersionReference): ObservedVersionReference {
  return Object.freeze({
    path: version.path,
    entityKind: version.entityKind,
    content: captureContentEvidence(version.content),
    remoteObjectId: version.remoteObjectId,
    observationToken: version.observationToken,
  });
}

function captureConflictProvenance(provenance: ConflictProvenance): ObservedConflictProvenance {
  return Object.freeze({
    source: provenance.source,
    version: captureVersionReference(provenance.version),
    deviceId: provenance.deviceId,
    remoteObjectId: provenance.remoteObjectId,
  });
}

function captureConcurrentAlternates(
  preserved: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>["preserved"],
): ObservedConcurrentAlternates {
  const base = preserved.base;
  return Object.freeze({
    local: captureConflictProvenance(preserved.local),
    remote: captureConflictProvenance(preserved.remote),
    ...(base ? { base: captureConflictProvenance(base) } : {}),
  });
}

function sameContentEvidence(
  observed: ObservedContentEvidence | undefined,
  current: ContentEvidence | undefined,
): boolean {
  if (!observed || !current) return observed === current;
  return observed.hash === current.hash
    && observed.sizeBytes === current.sizeBytes
    && observed.revision === current.revision;
}

function sameVersionReference(observed: ObservedVersionReference, current: VersionReference): boolean {
  return observed.path === current.path
    && observed.entityKind === current.entityKind
    && observed.remoteObjectId === current.remoteObjectId
    && observed.observationToken === current.observationToken
    && sameContentEvidence(observed.content, current.content);
}

function sameConflictProvenance(observed: ObservedConflictProvenance, current: ConflictProvenance): boolean {
  return observed.source === current.source
    && observed.deviceId === current.deviceId
    && observed.remoteObjectId === current.remoteObjectId
    && sameVersionReference(observed.version, current.version);
}

function sameConcurrentAlternates(
  observed: ObservedConcurrentAlternates,
  current: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>["preserved"],
): boolean {
  const sameBase = observed.base === undefined
    ? current.base === undefined
    : current.base !== undefined && sameConflictProvenance(observed.base, current.base);
  return sameBase
    && sameConflictProvenance(observed.local, current.local)
    && sameConflictProvenance(observed.remote, current.remote);
}

function isSupportedObservedConflictResolution(value: unknown): value is "keep-local" | "keep-remote" | "keep-both" {
  return typeof value === "string"
    && (VALIDATION_OBSERVED_CONFLICT_RESOLUTION_KINDS as readonly string[]).includes(value);
}

/**
 * Thin validation-only adapter over ProductRuntime/ProductController.
 *
 * It deliberately returns request acknowledgement rather than mutation success.
 * Physical success remains established by production execution plus independent
 * validation evidence/verifiers.
 */
export class ValidationProductionPathDriver {
  private readonly observedPlanByCycle = new Map<string, { readonly planId: SynchronizationPlan["planId"]; readonly binding: ValidationProductionDiagnosticBinding }>();
  private readonly observedConflictsByCycle = new Map<string, { readonly run: ValidationRunIdentity; readonly authorityCycleId: string; readonly conflicts: readonly ObservedProductionConflict[] }>();

  constructor(private readonly runtime: ValidationProductionRuntimePort) {}

  currentSurface(): ProductSurfaceState {
    return this.requireController().currentSurface();
  }

  onSurface(listener: (surface: ProductSurfaceState) => void): () => void {
    return this.requireController().onSurface(listener);
  }

  currentRunEvidence(): ExecutorRunEvidence {
    return this.requireController().currentRunEvidence();
  }

  async dispatch(request: ValidationProductionDriverRequest): Promise<ValidationProductionDriverResult> {
    const controller = this.runtime.productController();
    if (!controller) {
      return {
        status: "request-failed",
        run: request.run,
        reason: "production controller is unavailable",
        productionOutcomeEstablished: false,
      };
    }

    try {
      switch (request.kind) {
        case "preview-manual": {
          if (!validValidationAuthorityCycleId(request.authorityCycleId)) {
            return this.rejected(request.run, "manual preview requires an exact validation authority cycle");
          }
          const key = validationAuthorityCycleKey(request.run, request.authorityCycleId);
          this.observedConflictsByCycle.delete(key);
          const plan = await controller.previewManual();
          this.observeConflicts(request.run, request.authorityCycleId, controller.currentSurface());
          return this.observePlan(request.run, request.authorityCycleId, "manual", plan);
        }
        case "preview-verify-reconcile": {
          if (!validValidationAuthorityCycleId(request.authorityCycleId)) {
            return this.rejected(request.run, "Verify/Reconcile preview requires an exact validation authority cycle");
          }
          const key = validationAuthorityCycleKey(request.run, request.authorityCycleId);
          this.observedConflictsByCycle.delete(key);
          const plan = await controller.previewVerifyReconcile();
          this.observeConflicts(request.run, request.authorityCycleId, controller.currentSurface());
          return this.observePlan(request.run, request.authorityCycleId, "verify-reconcile", plan);
        }
        case "run-automatic":
          await controller.runAutomatic(request.trigger);
          return this.accepted(request.run, request.kind);
        case "cancel-active-sync":
          return this.fromActionResult(request.run, request.kind, await controller.request({ kind: "cancel-active-sync" }));
        case "execute-asserted-plan": {
          const authorization = request.authorization;
          if (!validValidationAuthorityCycleId(request.authorityCycleId)) {
            return this.rejected(request.run, "asserted execution requires an exact validation authority cycle");
          }
          if (!sameRun(request.run, authorization.run)) {
            return this.rejected(request.run, "execution authorization belongs to a different validation run");
          }
          if (authorization.executionAuthorized !== true) {
            return this.rejected(request.run, "execution authorization is not asserted");
          }
          const observed = this.observedPlanByCycle.get(validationAuthorityCycleKey(request.run, request.authorityCycleId));
          if (!observed || observed.planId !== authorization.planId) {
            return this.rejected(request.run, "asserted plan was not observed by this driver for the exact validation authority cycle");
          }
          const action = await controller.requestPreviewAction(
            { kind: "execute-plan", planId: authorization.planId },
            observed.binding.diagnosticRunId,
          );
          return this.fromCorrelatedActionResult(request.run, request.kind, action, observed.binding);
        }
        case "resolve-observed-conflict": {
          if (Object.prototype.hasOwnProperty.call(request, "conflictId")) {
            return this.rejected(request.run, "caller-supplied conflictId is prohibited");
          }
          if (
            typeof request.expectedVaultPath !== "string"
            || request.expectedVaultPath.length === 0
            || request.expectedVaultPath.trim() !== request.expectedVaultPath
            || request.expectedVaultPath.includes("\u0000")
          ) {
            return this.rejected(request.run, "expected conflict vault path is malformed");
          }
          if (request.expectedConflictKind !== "unresolved-text") {
            return this.rejected(request.run, "expected conflict kind is not supported by this validation path");
          }
          if (
            !request.resolution
            || !isSupportedObservedConflictResolution(request.resolution.kind)
            || Object.keys(request.resolution).some(key => key !== "kind")
          ) {
            return this.rejected(request.run, "conflict resolution choice is malformed or unsupported");
          }

          const observedCycles = [...this.observedConflictsByCycle.values()]
            .filter(entry => sameRun(entry.run, request.run))
            .map(entry => ({
              entry,
              matches: entry.conflicts.filter(
                conflict => conflict.path === request.expectedVaultPath
                  && conflict.kind === request.expectedConflictKind,
              ),
            }))
            .filter(candidate => candidate.matches.length > 0);
          if (observedCycles.length !== 1 || observedCycles[0]!.matches.length !== 1) {
            return this.rejected(
              request.run,
              observedCycles.length === 0
                ? "requested conflict was not observed by this driver during production planning for this validation run"
                : "requested conflict is ambiguous across validation authority cycles or production conflict observations",
            );
          }

          const observedCycle = observedCycles[0]!.entry;
          const observed = observedCycles[0]!.matches[0]!;
          const currentMatches = controller.currentSurface().conflicts.filter(
            (conflict): conflict is Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> =>
              conflict.kind === request.expectedConflictKind
              && conflict.path === request.expectedVaultPath,
          );
          const current = currentMatches[0];
          if (
            currentMatches.length !== 1
            || !current
            || current.conflictId !== observed.conflictId
            || !sameConcurrentAlternates(observed.preserved, current.preserved)
          ) {
            return this.rejected(
              request.run,
              "observed conflict is absent, stale, ambiguous, or replaced on the current production surface",
            );
          }

          const action = await controller.request({
            kind: "resolve-conflict",
            conflictId: observed.conflictId,
            resolution: request.resolution,
          });
          if (action.status !== "accepted") return this.fromActionResult(request.run, request.kind, action);
          const binding = bindValidationProductionDiagnostic({
            run: request.run,
            authorityCycleId: observedCycle.authorityCycleId,
            correlation: controller.currentDiagnosticCorrelation(),
            expectedRequestKind: "conflict-resolution",
          });
          if (!binding) {
            return {
              status: "request-accepted",
              run: request.run,
              requestKind: request.kind,
              productionOutcomeEstablished: false,
              terminalProofReason: "Conflict resolution completed without exact production diagnostic correlation for its validation authority cycle.",
            };
          }
          return this.correlatedAccepted(request.run, request.kind, binding);
        }
      }
    } catch (error) {
      return {
        status: "request-failed",
        run: request.run,
        reason: failureReason(error),
        productionOutcomeEstablished: false,
      };
    }
  }

  private observePlan(
    run: ValidationRunIdentity,
    authorityCycleId: string,
    expectedRequestKind: Extract<ProductionDiagnosticRequestKind, "manual" | "verify-reconcile">,
    plan: SynchronizationPlan | undefined,
  ): ValidationProductionDriverResult {
    const key = validationAuthorityCycleKey(run, authorityCycleId);
    if (!plan) {
      this.observedPlanByCycle.delete(key);
      return {
        status: "no-plan-observed",
        run,
        reason: `production planning returned no plan (status: ${this.requireController().currentSurface().status.kind})`,
      };
    }
    const binding = bindValidationProductionDiagnostic({
      run,
      authorityCycleId,
      correlation: this.requireController().currentDiagnosticCorrelation(),
      expectedRequestKind,
      expectedPlanId: plan.planId,
    });
    if (!binding) {
      this.observedPlanByCycle.delete(key);
      return {
        status: "request-failed",
        run,
        reason: "Production preview did not expose an exact diagnostic run/plan binding for the validation authority cycle.",
        productionOutcomeEstablished: false,
      };
    }
    this.observedPlanByCycle.set(key, Object.freeze({ planId: plan.planId, binding }));
    return { status: "plan-observed", run, plan, diagnosticBinding: binding };
  }

  private observeConflicts(run: ValidationRunIdentity, authorityCycleId: string, surface: ProductSurfaceState): void {
    const observations = surface.conflicts
      .filter(
        (conflict): conflict is Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> =>
          conflict.kind === "unresolved-text",
      )
      .map(conflict => Object.freeze({
        kind: conflict.kind,
        conflictId: conflict.conflictId,
        path: conflict.path,
        preserved: captureConcurrentAlternates(conflict.preserved),
      }));
    const key = validationAuthorityCycleKey(run, authorityCycleId);
    this.observedConflictsByCycle.set(key, Object.freeze({
      run,
      authorityCycleId,
      conflicts: Object.freeze(observations),
    }));
  }

  private accepted(
    run: ValidationRunIdentity,
    requestKind: "run-automatic" | "execute-asserted-plan" | "resolve-observed-conflict" | "cancel-active-sync",
  ): ValidationProductionDriverResult {
    return { status: "request-accepted", run, requestKind, productionOutcomeEstablished: false };
  }

  private correlatedAccepted(
    run: ValidationRunIdentity,
    requestKind: "execute-asserted-plan" | "resolve-observed-conflict",
    binding: ValidationProductionDiagnosticBinding,
  ): ValidationProductionDriverResult {
    const terminal = exactValidationProductionTerminal(this.requireController().diagnosticSnapshot(), binding);
    if (terminal.status !== "established") {
      return {
        status: "request-accepted",
        run,
        requestKind,
        productionOutcomeEstablished: false,
        diagnosticBinding: binding,
        terminalProofReason: terminal.reason,
      };
    }
    return {
      status: "request-accepted",
      run,
      requestKind,
      productionOutcomeEstablished: true,
      diagnosticBinding: binding,
      terminalResult: terminal.result,
    };
  }

  private fromCorrelatedActionResult(
    run: ValidationRunIdentity,
    requestKind: "execute-asserted-plan",
    result: UserActionResult,
    binding: ValidationProductionDiagnosticBinding,
  ): ValidationProductionDriverResult {
    return result.status === "accepted"
      ? this.correlatedAccepted(run, requestKind, binding)
      : this.rejected(run, result.reason);
  }

  private rejected(run: ValidationRunIdentity, reason: string): ValidationProductionDriverResult {
    return { status: "request-rejected", run, reason, productionOutcomeEstablished: false };
  }

  private fromActionResult(
    run: ValidationRunIdentity,
    requestKind: "execute-asserted-plan" | "resolve-observed-conflict" | "cancel-active-sync",
    result: UserActionResult,
  ): ValidationProductionDriverResult {
    return result.status === "accepted"
      ? this.accepted(run, requestKind)
      : this.rejected(run, result.reason);
  }

  private requireController(): ValidationProductionControllerPort {
    const controller = this.runtime.productController();
    if (!controller) throw new Error("production controller is unavailable");
    return controller;
  }
}
