import type { ContentEvidence, OperationId, PlanId, RemoteObjectId, SyncSide, VaultPath, VersionReference } from "./common";
import type { ExactBaseAuthority, IdentityAuthorityProof } from "./synchronization-foundation";
import type { PathSnapshot } from "./snapshot";
import type { StateLoadResult } from "./state";

export const PLAN_OPERATION_KINDS = ["noop","upload-create","upload-update","download-create","download-update","identity-preserving-move","clean-text-merge","unresolved-conflict","trash-local","trash-remote","blocked-unsafe","recovery-required"] as const;
export type PlanOperationKind = (typeof PLAN_OPERATION_KINDS)[number];

/** Preconditions that are sufficient execution authority in the frozen synchronization path. */
export type OperationPrecondition =
  | { readonly kind: "path-observation"; readonly side: SyncSide; readonly path: VaultPath; readonly expected: "present" | "absent"; readonly observationToken?: string }
  | { readonly kind: "content-evidence"; readonly side: SyncSide; readonly path: VaultPath; readonly expected: ContentEvidence }
  | { readonly kind: "remote-object"; readonly remoteObjectId: RemoteObjectId; readonly expectedRevision?: string }
  | { readonly kind: "base-authority"; readonly authority: ExactBaseAuthority }
  | { readonly kind: "identity-authority"; readonly proof: IdentityAuthorityProof }
  | { readonly kind: "remote-enumeration-complete" }
  | { readonly kind: "file-stable"; readonly path: VaultPath };

/**
 * Compatibility-only planner markers emitted by the pre-foundation planner.
 * They are deliberately excluded from ExecutablePlannedOperation and therefore
 * can never authorize the new synchronization execution path.
 */
export type LegacyPlanningPrecondition =
  | { readonly kind: "base-trusted" }
  | { readonly kind: "identity-unambiguous"; readonly path: VaultPath };

export interface PlanReason { readonly code: string; readonly summary: string; readonly evidenceRefs?: readonly string[]; }

/** Existing planner DTO. It may still contain compatibility-only markers until Workstream D migrates it. */
export interface PlannedOperation {
  readonly operationId: OperationId;
  readonly kind: PlanOperationKind;
  readonly path: VaultPath;
  readonly targetSide?: SyncSide;
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
  readonly remoteObjectId?: RemoteObjectId;
  readonly contentVersion?: VersionReference;
  readonly conflictId?: string;
  readonly destructive: boolean;
  readonly preconditions: readonly (OperationPrecondition | LegacyPlanningPrecondition)[];
  readonly reasons: readonly PlanReason[];
}

/** Only this authority-complete form is accepted by the frozen execution seam. */
export interface ExecutablePlannedOperation extends Omit<PlannedOperation, "preconditions"> {
  readonly authorityComplete: true;
  readonly preconditions: readonly OperationPrecondition[];
}

export type ExecutableOperationAssessment =
  | { readonly status: "ready"; readonly operation: ExecutablePlannedOperation }
  | { readonly status: "incomplete-authority"; readonly rejected: readonly LegacyPlanningPrecondition[] };

/** Converts a plan DTO to execution-ready form only when no nominal authority remains. */
export function assessExecutableOperation(operation: PlannedOperation): ExecutableOperationAssessment {
  const rejected = operation.preconditions.filter(
    (value): value is LegacyPlanningPrecondition => value.kind === "base-trusted" || value.kind === "identity-unambiguous",
  );
  if (rejected.length > 0) return { status: "incomplete-authority", rejected };
  return {
    status: "ready",
    operation: {
      ...operation,
      authorityComplete: true,
      preconditions: operation.preconditions as readonly OperationPrecondition[],
    },
  };
}

export type PlanExecutionDisposition = "safe-auto-eligible" | "requires-user-approval" | "blocked";
/** Run-wide authority is deliberately separate from path-local attention. */
export type PlanGlobalExecutionGate = "none" | "destructive-approval-required" | "globally-blocked";
export interface SynchronizationPlan { readonly planId: PlanId; readonly advisoryCreatedAtMs?: number; readonly trigger: "manual" | "startup-resume" | "local-change" | "periodic" | "verify-reconcile"; readonly operations: readonly PlannedOperation[]; readonly executionDisposition: PlanExecutionDisposition; readonly recoveryCheckpointRequired: boolean; readonly globalExecutionGate: PlanGlobalExecutionGate; }
export interface PlanningInput { readonly snapshots: readonly PathSnapshot[]; readonly state: StateLoadResult; }
export interface SynchronizationPlanner { plan(input: PlanningInput): Promise<SynchronizationPlan>; }
