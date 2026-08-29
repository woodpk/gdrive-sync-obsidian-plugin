import type { CheckpointId, PlannedOperation, SynchronizationPlan } from "../contracts";

export interface DestructiveSafetySettings {
  readonly absoluteDestructiveLimit: number;
  readonly affectedFractionLimit: number;
  readonly abnormalMultiple: number;
}

export interface DestructiveSafetyContext {
  readonly totalManagedPaths: number;
  readonly recentAverageDestructiveOperations?: number;
  readonly stateCondition: "trusted" | "reconstructed" | "untrusted";
}

export interface DestructiveSafetyAssessment {
  readonly suspicious: boolean;
  readonly requiresApproval: boolean;
  readonly recoveryCheckpointRequired: boolean;
  readonly signals: readonly string[];
}

export interface ApprovedDestructivePlan {
  readonly planId: SynchronizationPlan["planId"];
  readonly checkpointId: CheckpointId;
  readonly destructiveOperationIds: readonly PlannedOperation["operationId"][];
}

export const DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS: DestructiveSafetySettings = {
  absoluteDestructiveLimit: 25,
  affectedFractionLimit: 0.20,
  abnormalMultiple: 3,
};

/** Evaluates a complete plan; it never mutates or bypasses any operation-level safeguards. */
export class DestructiveSafetyPolicy {
  constructor(private readonly settings: DestructiveSafetySettings = DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS) {
    if (settings.absoluteDestructiveLimit < 1) throw new Error("absoluteDestructiveLimit must be positive");
    if (!(settings.affectedFractionLimit > 0 && settings.affectedFractionLimit <= 1)) throw new Error("affectedFractionLimit must be in (0,1]");
    if (settings.abnormalMultiple < 1) throw new Error("abnormalMultiple must be >= 1");
  }

  assess(operations: readonly PlannedOperation[], context: DestructiveSafetyContext): DestructiveSafetyAssessment {
    const destructiveCount = operations.filter(operation => operation.destructive).length;
    if (destructiveCount === 0) {
      return { suspicious: false, requiresApproval: false, recoveryCheckpointRequired: false, signals: [] };
    }

    const signals: string[] = [];
    if (destructiveCount >= this.settings.absoluteDestructiveLimit) signals.push("absolute-count");
    const denominator = Math.max(context.totalManagedPaths, destructiveCount, 1);
    if (destructiveCount / denominator >= this.settings.affectedFractionLimit) signals.push("affected-percentage");
    const recent = context.recentAverageDestructiveOperations;
    if (recent !== undefined && recent > 0 && destructiveCount >= Math.max(2, Math.ceil(recent * this.settings.abnormalMultiple))) {
      signals.push("abnormal-divergence");
    }
    if (context.stateCondition !== "trusted") signals.push("state-integrity-or-rebuild");

    const suspicious = signals.length > 0;
    return {
      suspicious,
      requiresApproval: suspicious,
      recoveryCheckpointRequired: suspicious,
      signals,
    };
  }

  /** Approval is scoped to the exact plan and requires a concrete recovery checkpoint. */
  authorizeReviewedPlan(plan: SynchronizationPlan, checkpointId: CheckpointId): ApprovedDestructivePlan {
    if (!plan.recoveryCheckpointRequired || plan.executionDisposition !== "requires-user-approval" || plan.globalExecutionGate !== "destructive-approval-required") {
      throw new Error("plan is not eligible for destructive review approval");
    }
    const destructiveOperationIds = plan.operations.filter(operation => operation.destructive).map(operation => operation.operationId);
    if (destructiveOperationIds.length === 0) throw new Error("reviewed destructive plan contains no destructive operations");
    return { planId: plan.planId, checkpointId, destructiveOperationIds };
  }
}
