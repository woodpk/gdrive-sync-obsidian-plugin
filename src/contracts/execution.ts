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

/** V1.3 operational provenance types used by successor mutation/execution seams. */
export type OperationalFailureProvenanceV1_3 = import("./common").OperationalFailureProvenanceV1_3;
export type RetryableOperationalFailureV1_3 = Extract<OperationalFailureProvenanceV1_3, { readonly kind: "transient-failure" | "rate-limited" }>;
export type BlockingOperationalFailureV1_3 = Extract<OperationalFailureProvenanceV1_3, { readonly kind: "permission-denied" | "quota-exhausted" }>;
export type RecoveryOperationalFailureV1_3 = Extract<OperationalFailureProvenanceV1_3, { readonly kind: "recovery-required" | "unclassified" }>;

/**
 * Explicit physical authority required before ordinary mutation retry/redispatch.
 * A transient/429 cause alone is never this proof.
 */
export type RetrySafePhysicalAuthorityV1_3 =
  | { readonly status: "verified-no-unresolved-effect"; readonly basis: "pre-dispatch-rejection" }
  | { readonly status: "verified-no-unresolved-effect"; readonly basis: "verified-not-applied"; readonly verificationEvidenceRef?: string };

/** V1.3 successor preserves predecessor physical distinctions and adds provenance only where defined. */
export type RemoteMutationOutcomeV1_3 =
  | Extract<import("./synchronization-foundation").RemoteMutationOutcome, { readonly status: "verified-effect" }>
  | Extract<import("./synchronization-foundation").RemoteMutationOutcome, { readonly status: "conflict-preserved" }>
  | { readonly status: "verified-not-applied"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenanceV1_3 }
  | { readonly status: "outcome-unknown"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenanceV1_3 };

/** Successor remote mutation port; predecessor remains compatibility-only for new/resumed affected workstreams after V1.3 adoption. */
export interface ReliableRemoteMutationPortV1_3 {
  reserveFileCreateIdentity(
    root: import("./google-drive").ManagedRemoteIdentity,
    intentId: import("./common").MutationIntentId,
    path: import("./common").VaultPath,
    intendedContent: import("./synchronization-foundation").CanonicalFileContentProof,
  ): Promise<import("./google-drive").DriveResult<Extract<import("./synchronization-foundation").RemoteMutationIdentity, { readonly kind: "reserved-file-create" }>>>;
  reserveFolderCreateIdentity(
    root: import("./google-drive").ManagedRemoteIdentity,
    intentId: import("./common").MutationIntentId,
    path: import("./common").VaultPath,
  ): Promise<import("./google-drive").DriveResult<Extract<import("./synchronization-foundation").RemoteMutationIdentity, { readonly kind: "reserved-folder-create" }>>>;
  createReserved(
    identity: Extract<import("./synchronization-foundation").RemoteMutationIdentity, { readonly kind: "reserved-file-create" | "reserved-folder-create" }>,
    content?: import("./common").BinaryContentSource,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<RemoteMutationOutcomeV1_3>;
  updateExisting(
    identity: Extract<import("./synchronization-foundation").RemoteMutationIdentity, { readonly kind: "existing-file-content-update" }>,
    content: import("./common").BinaryContentSource,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<RemoteMutationOutcomeV1_3>;
  moveExisting(
    identity: Extract<import("./synchronization-foundation").RemoteMutationIdentity, { readonly kind: "identity-preserving-move" }>,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<RemoteMutationOutcomeV1_3>;
  trashExisting(
    identity: Extract<import("./synchronization-foundation").RemoteMutationIdentity, { readonly kind: "trash" }>,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<RemoteMutationOutcomeV1_3>;
}

export type CoherentRemoteDownloadV1_3 =
  | Extract<import("./synchronization-foundation").CoherentRemoteDownload, { readonly status: "coherent" }>
  | { readonly status: "changed-during-transfer"; readonly reason: string }
  | { readonly status: "outcome-unknown"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenanceV1_3 };

export interface CoherentRemoteReadPortV1_3 {
  downloadVersion(
    remoteObjectId: import("./common").RemoteObjectId,
    expectedRevision: import("./common").RemoteRevisionId,
    expectedEvidence: import("./common").ContentEvidence,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<import("./google-drive").DriveResult<CoherentRemoteDownloadV1_3>>;
}

export type LocalTransactionResultV1_3 =
  | { readonly status: "staged-verified" | "committed" | "recovered"; readonly transaction: import("./synchronization-foundation").LocalMutationTransaction; readonly resultingObservationToken?: import("./common").ObservationToken }
  | { readonly status: "stale" | "blocked"; readonly reason: string; readonly transaction: import("./synchronization-foundation").LocalMutationTransaction }
  | { readonly status: "outcome-unknown"; readonly reason: string; readonly transaction: import("./synchronization-foundation").LocalMutationTransaction; readonly operationalFailure?: OperationalFailureProvenanceV1_3 };

export interface LocalTransactionalMutationPortV1_3 {
  stageAndVerify(
    transaction: import("./synchronization-foundation").LocalMutationTransaction,
    content: import("./common").BinaryContentSource,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResultV1_3>;
  commitVerifiedStage(
    transaction: import("./synchronization-foundation").LocalMutationTransaction,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResultV1_3>;
  recover(
    transaction: import("./synchronization-foundation").LocalMutationTransaction,
    cancellation?: import("./synchronization-foundation").SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResultV1_3>;
}

/**
 * V1.3 execution result: operational retry is distinct from unresolved physical recovery.
 * Rate-limit timing exists only inside the structured rate-limited provenance member.
 */
export type ExecutionResultV1_3 =
  | { readonly status: "durable-verified-success"; readonly receipt: VerifiedExecutionReceipt }
  | { readonly status: "retryable-failure"; readonly reason: string; readonly operationalFailure: RetryableOperationalFailureV1_3; readonly retrySafety: RetrySafePhysicalAuthorityV1_3 }
  | { readonly status: "stale-precondition"; readonly reason: string; readonly failed?: readonly OperationPrecondition[] }
  | { readonly status: "blocking-failure"; readonly reason: string; readonly operationalFailure?: BlockingOperationalFailureV1_3; readonly effectSafety: RetrySafePhysicalAuthorityV1_3 }
  | { readonly status: "uncertain"; readonly reason: string; readonly operationalFailure?: OperationalFailureProvenanceV1_3 }
  | { readonly status: "recovery-required"; readonly reason: string; readonly operationalFailure?: RecoveryOperationalFailureV1_3 }
  | { readonly status: "cancelled"; readonly reason?: string };

export interface AuthoritativeSynchronizationExecutorV1_3 {
  validatePreconditions(operation: ExecutablePlannedOperation): Promise<AuthorityCompletePreconditionValidationResult>;
  execute(operation: ExecutablePlannedOperation): Promise<ExecutionResultV1_3>;
}

export type ExecutionDispositionV1_3 = {
  readonly primary: "success" | "authentication-required" | "deferred" | "blocking-failure" | "recovery-required" | "stale-precondition" | "cancelled";
  readonly physicalReconciliationRequired: boolean;
  readonly retryMode: "none" | "ordinary-retry" | "reauthenticate-then-reconcile" | "reconcile-before-redispatch";
  readonly retryAfterMs?: number;
  readonly mutationRedispatchAuthorized: boolean;
};

/** Complete V1.3 disposition derived from both physical execution state and operational cause. */
export function executionDispositionV1_3(result: ExecutionResultV1_3): ExecutionDispositionV1_3 {
  switch (result.status) {
    case "durable-verified-success":
      return { primary: "success", physicalReconciliationRequired: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "stale-precondition":
      return { primary: "stale-precondition", physicalReconciliationRequired: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "cancelled":
      return { primary: "cancelled", physicalReconciliationRequired: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "blocking-failure":
      return { primary: "blocking-failure", physicalReconciliationRequired: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "retryable-failure": {
      const retryAfterMs = result.operationalFailure.kind === "rate-limited" ? result.operationalFailure.retryAfterMs : undefined;
      return {
        primary: "deferred",
        physicalReconciliationRequired: false,
        retryMode: "ordinary-retry",
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        mutationRedispatchAuthorized: true,
      };
    }
    case "recovery-required":
      return { primary: "recovery-required", physicalReconciliationRequired: true, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
    case "uncertain": {
      const provenance = result.operationalFailure;
      if (!provenance) {
        return { primary: "recovery-required", physicalReconciliationRequired: true, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
      }
      switch (provenance.kind) {
        case "authentication-required":
          return { primary: "authentication-required", physicalReconciliationRequired: true, retryMode: "reauthenticate-then-reconcile", mutationRedispatchAuthorized: false };
        case "transient-failure":
          return { primary: "deferred", physicalReconciliationRequired: true, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
        case "rate-limited":
          return {
            primary: "deferred",
            physicalReconciliationRequired: true,
            retryMode: "reconcile-before-redispatch",
            ...(provenance.retryAfterMs === undefined ? {} : { retryAfterMs: provenance.retryAfterMs }),
            mutationRedispatchAuthorized: false,
          };
        case "permission-denied":
        case "quota-exhausted":
          return { primary: "blocking-failure", physicalReconciliationRequired: true, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
        case "recovery-required":
        case "unclassified":
          return { primary: "recovery-required", physicalReconciliationRequired: true, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
      }
    }
  }
}
