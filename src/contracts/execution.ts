import type { ContentEvidence, OperationId, OperationalFailureProvenance, RemoteObjectId, StateRevision } from "./common";
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

export type RetryableOperationalFailure = Extract<OperationalFailureProvenance, { readonly kind: "transient-failure" | "rate-limited" }>;

export type ExecutionResult =
  | { readonly status: "durable-verified-success"; readonly receipt: VerifiedExecutionReceipt }
  | { readonly status: "retryable-failure"; readonly reason: string; readonly retryAfterMs?: number; readonly operationalFailure?: RetryableOperationalFailure }
  | { readonly status: "stale-precondition"; readonly reason: string; readonly failed?: readonly OperationPrecondition[] }
  | { readonly status: "blocking-failure" | "uncertain" | "recovery-required"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenance }
  | { readonly status: "cancelled"; readonly reason?: string };

export type OperationalFailureDisposition =
  | { readonly status: "authentication-required"; readonly retry: "after-reauthentication" }
  | { readonly status: "deferred"; readonly retry: "bounded-backoff"; readonly retryAfterMs?: number }
  | { readonly status: "blocking-failure"; readonly retry: "none" }
  | { readonly status: "recovery-required"; readonly retry: "none" };

/** Operational disposition never changes physical-effect certainty in ExecutionResult. */
export function operationalFailureDisposition(provenance: OperationalFailureProvenance): OperationalFailureDisposition {
  switch (provenance.kind) {
    case "authentication-required": return { status: "authentication-required", retry: "after-reauthentication" };
    case "transient-failure": return { status: "deferred", retry: "bounded-backoff" };
    case "rate-limited": return { status: "deferred", retry: "bounded-backoff", ...(provenance.retryAfterMs === undefined ? {} : { retryAfterMs: provenance.retryAfterMs }) };
    case "permission-denied":
    case "quota-exhausted": return { status: "blocking-failure", retry: "none" };
    case "recovery-required":
    case "semantic-failure":
    case "unclassified": return { status: "recovery-required", retry: "none" };
  }
}

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
