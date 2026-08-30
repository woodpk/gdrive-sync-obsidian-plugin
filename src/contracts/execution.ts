import type { ContentEvidence, OperationId, RemoteObjectId, StateRevision } from "./common";
import type { ExecutableOperationPrecondition, ExecutablePlannedOperation, OperationPrecondition, PlannedOperation } from "./plan";

export type PreconditionValidationResult =
  | { readonly status: "valid" }
  | { readonly status: "stale"; readonly failed: readonly OperationPrecondition[] }
  | { readonly status: "blocked" | "recovery-required"; readonly reason: string };

export interface VerifiedExecutionReceipt {
  readonly operationId: OperationId;
  readonly durable: true;
  readonly integrityVerified: true;
  readonly evidence?: ContentEvidence;
  readonly resultingRemoteObjectId?: RemoteObjectId;
  readonly verificationEvidenceRef?: string;
}

export type ExecutionResult =
  | { readonly status: "durable-verified-success"; readonly receipt: VerifiedExecutionReceipt }
  | { readonly status: "retryable-failure"; readonly reason: string; readonly retryAfterMs?: number }
  | { readonly status: "stale-precondition"; readonly reason: string; readonly failed?: readonly OperationPrecondition[] }
  | { readonly status: "blocking-failure" | "uncertain" | "recovery-required"; readonly reason: string }
  | { readonly status: "cancelled"; readonly reason?: string };

/** Compatibility seam used by the existing pre-foundation execution coordinator. Not authoritative for the new synchronization path. */
export interface SynchronizationExecutor {
  validatePreconditions(operation: PlannedOperation): Promise<PreconditionValidationResult>;
  execute(operation: PlannedOperation): Promise<ExecutionResult>;
}

export type AuthorityCompletePreconditionValidationResult =
  | { readonly status: "valid" }
  | { readonly status: "stale"; readonly failed: readonly ExecutableOperationPrecondition[] }
  | { readonly status: "blocked" | "recovery-required"; readonly reason: string };

/** Frozen Workstream D execution seam. Nominal BASE/identity markers are structurally impossible here. */
export interface AuthoritativeSynchronizationExecutor {
  validatePreconditions(operation: ExecutablePlannedOperation): Promise<AuthorityCompletePreconditionValidationResult>;
  execute(operation: ExecutablePlannedOperation): Promise<ExecutionResult>;
}

export type CommitResult =
  | { readonly status: "committed"; readonly newStateRevision: StateRevision }
  | { readonly status: "stale-state"; readonly actualRevision?: StateRevision }
  | { readonly status: "recovery-required"; readonly reason: string };

/** Compatibility committer for the existing coordinator. */
export interface AuthoritativeSuccessCommitter {
  commitVerifiedSuccess(operation: PlannedOperation, receipt: VerifiedExecutionReceipt, expectedStateRevision?: StateRevision): Promise<CommitResult>;
}

/** Frozen new-path committer: only an authority-complete operation may advance authoritative synchronization state. */
export interface AuthorityCompleteSuccessCommitter {
  commitVerifiedSuccess(operation: ExecutablePlannedOperation, receipt: VerifiedExecutionReceipt, expectedStateRevision?: StateRevision): Promise<CommitResult>;
}
