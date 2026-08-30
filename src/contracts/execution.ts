import type { ContentEvidence, OperationId, RemoteObjectId, StateRevision } from "./common";
import type { ExecutablePlannedOperation, OperationPrecondition } from "./plan";

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

/** The new synchronization execution path accepts only authority-complete planned operations. */
export interface SynchronizationExecutor {
  validatePreconditions(operation: ExecutablePlannedOperation): Promise<PreconditionValidationResult>;
  execute(operation: ExecutablePlannedOperation): Promise<ExecutionResult>;
}

export type CommitResult =
  | { readonly status: "committed"; readonly newStateRevision: StateRevision }
  | { readonly status: "stale-state"; readonly actualRevision?: StateRevision }
  | { readonly status: "recovery-required"; readonly reason: string };

/** Only a durable, integrity-verified receipt from an authority-complete operation can enter authoritative success state. */
export interface AuthoritativeSuccessCommitter {
  commitVerifiedSuccess(operation: ExecutablePlannedOperation, receipt: VerifiedExecutionReceipt, expectedStateRevision?: StateRevision): Promise<CommitResult>;
}
