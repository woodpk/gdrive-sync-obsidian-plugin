import type { ContentEvidence, OperationId, PlanId, RemoteObjectId, SyncSide, VaultPath, VersionReference } from "./common";
import type { PathSnapshot } from "./snapshot";
import type { StateLoadResult } from "./state";
export const PLAN_OPERATION_KINDS = ["noop","upload-create","upload-update","download-create","download-update","identity-preserving-move","clean-text-merge","unresolved-conflict","trash-local","trash-remote","blocked-unsafe","recovery-required"] as const;
export type PlanOperationKind = (typeof PLAN_OPERATION_KINDS)[number];
export type OperationPrecondition =
  | { readonly kind: "path-observation"; readonly side: SyncSide; readonly path: VaultPath; readonly expected: "present" | "absent"; readonly observationToken?: string }
  | { readonly kind: "content-evidence"; readonly side: SyncSide; readonly path: VaultPath; readonly expected: ContentEvidence }
  | { readonly kind: "remote-object"; readonly remoteObjectId: RemoteObjectId; readonly expectedRevision?: string }
  | { readonly kind: "base-trusted" }
  | { readonly kind: "remote-enumeration-complete" }
  | { readonly kind: "file-stable"; readonly path: VaultPath }
  | { readonly kind: "identity-unambiguous"; readonly path: VaultPath };
export interface PlanReason { readonly code: string; readonly summary: string; readonly evidenceRefs?: readonly string[]; }
export interface PlannedOperation { readonly operationId: OperationId; readonly kind: PlanOperationKind; readonly path: VaultPath; readonly targetSide?: SyncSide; readonly fromPath?: VaultPath; readonly toPath?: VaultPath; readonly remoteObjectId?: RemoteObjectId; readonly contentVersion?: VersionReference; readonly conflictId?: string; readonly destructive: boolean; readonly preconditions: readonly OperationPrecondition[]; readonly reasons: readonly PlanReason[]; }
export type PlanExecutionDisposition = "safe-auto-eligible" | "requires-user-approval" | "blocked";
/** Run-wide authority is deliberately separate from path-local attention. */
export type PlanGlobalExecutionGate = "none" | "destructive-approval-required" | "globally-blocked";
export interface SynchronizationPlan { readonly planId: PlanId; readonly advisoryCreatedAtMs?: number; readonly trigger: "manual" | "startup-resume" | "local-change" | "periodic" | "verify-reconcile"; readonly operations: readonly PlannedOperation[]; readonly executionDisposition: PlanExecutionDisposition; readonly recoveryCheckpointRequired: boolean; readonly globalExecutionGate: PlanGlobalExecutionGate; }
export interface PlanningInput { readonly snapshots: readonly PathSnapshot[]; readonly state: StateLoadResult; }
export interface SynchronizationPlanner { plan(input: PlanningInput): Promise<SynchronizationPlan>; }
