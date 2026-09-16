import type {
  ProductSurfaceState,
  SynchronizationPlan,
  UserAction,
  UserActionResult,
} from "../contracts";
import type { ExecutorRunEvidence } from "../product/production-executor";
import type {
  ValidationProductionDriverRequest,
  ValidationProductionDriverResult,
} from "./driver-plan-fault-verifier-contracts";
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
  ): Promise<UserActionResult>;
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

function runKey(run: ValidationRunIdentity): string {
  return `${String(run.scenarioId)}\u0000${String(run.runId)}`;
}

function failureReason(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "production request failed without an Error reason";
}

/**
 * Thin validation-only adapter over ProductRuntime/ProductController.
 *
 * It deliberately returns request acknowledgement rather than mutation success.
 * Physical success remains established by production execution plus independent
 * validation evidence/verifiers.
 */
export class ValidationProductionPathDriver {
  private readonly observedPlanByRun = new Map<string, SynchronizationPlan["planId"]>();

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
        case "preview-manual":
          return this.observePlan(request.run, await controller.previewManual());
        case "preview-verify-reconcile":
          return this.observePlan(request.run, await controller.previewVerifyReconcile());
        case "run-automatic":
          await controller.runAutomatic(request.trigger);
          return this.accepted(request.run, request.kind);
        case "cancel-active-sync":
          return this.fromActionResult(request.run, request.kind, await controller.request({ kind: "cancel-active-sync" }));
        case "execute-asserted-plan": {
          const authorization = request.authorization;
          if (!sameRun(request.run, authorization.run)) {
            return this.rejected(request.run, "execution authorization belongs to a different validation run");
          }
          if (authorization.executionAuthorized !== true) {
            return this.rejected(request.run, "execution authorization is not asserted");
          }
          if (this.observedPlanByRun.get(runKey(request.run)) !== authorization.planId) {
            return this.rejected(request.run, "asserted plan was not observed by this driver for the active validation run");
          }
          return this.fromActionResult(
            request.run,
            request.kind,
            await controller.requestPreviewAction({ kind: "execute-plan", planId: authorization.planId }),
          );
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

  private observePlan(run: ValidationRunIdentity, plan: SynchronizationPlan | undefined): ValidationProductionDriverResult {
    const key = runKey(run);
    if (!plan) {
      this.observedPlanByRun.delete(key);
      return {
        status: "no-plan-observed",
        run,
        reason: `production planning returned no plan (status: ${this.requireController().currentSurface().status.kind})`,
      };
    }
    this.observedPlanByRun.set(key, plan.planId);
    return { status: "plan-observed", run, plan };
  }

  private accepted(
    run: ValidationRunIdentity,
    requestKind: "run-automatic" | "execute-asserted-plan" | "cancel-active-sync",
  ): ValidationProductionDriverResult {
    return { status: "request-accepted", run, requestKind, productionOutcomeEstablished: false };
  }

  private rejected(run: ValidationRunIdentity, reason: string): ValidationProductionDriverResult {
    return { status: "request-rejected", run, reason, productionOutcomeEstablished: false };
  }

  private fromActionResult(
    run: ValidationRunIdentity,
    requestKind: "execute-asserted-plan" | "cancel-active-sync",
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
