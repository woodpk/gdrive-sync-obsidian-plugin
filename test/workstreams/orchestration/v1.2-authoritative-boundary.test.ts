import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type AuthorityCompletePreconditionValidationResult,
  type AuthorityCompleteSuccessCommitter,
  type AuthoritativeSynchronizationExecutor,
  type CommitResult,
  type DurableRemoteChangeBatch,
  type ExecutablePlannedOperation,
  type ExecutionResult,
  type FileCommonStateProof,
  type OperationId,
  type PlannedOperation,
  type RemoteIngestionBatchId,
  type SemanticStateGeneration,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type VaultPath,
  type VerifiedExecutionReceipt,
} from "../../../src/contracts";
import {
  AuthorityCompleteExecutionCoordinator,
  commonStateBaseHealingTransition,
  withLearnedRemoteBatch,
} from "../../../src/core/execution-coordinator";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const stateRevision = (value: string) => id<"StateRevision">(value) as StateRevision;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;

function authority(): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: stateRevision("p:authority"),
    semanticGeneration: generation("g:authority"),
    learnedRemoteBatches: [],
    pathConvergence: [{
      path: path("notes/a.md"),
      state: { status: "converged", generation: generation("g:authority"), baseFingerprint: id<"BaseFingerprint">("base:a") },
    }],
    operationIntents: [],
    localTransactions: [],
  };
}

class MemoryAuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  constructor(readonly value: SynchronizationAuthorityMetadataV1_1 = authority()) {}
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
}

class RecordingAuthoritativeExecutor implements AuthoritativeSynchronizationExecutor {
  validated: ExecutablePlannedOperation[] = [];
  executed: ExecutablePlannedOperation[] = [];
  constructor(
    private readonly validation: AuthorityCompletePreconditionValidationResult = { status: "valid" },
    private readonly result?: ExecutionResult,
  ) {}
  async validatePreconditions(operation: ExecutablePlannedOperation): Promise<AuthorityCompletePreconditionValidationResult> {
    this.validated.push(operation);
    return this.validation;
  }
  async execute(operation: ExecutablePlannedOperation): Promise<ExecutionResult> {
    this.executed.push(operation);
    return this.result ?? {
      status: "durable-verified-success",
      receipt: { operationId: operation.operationId, durable: true, integrityVerified: true, verificationEvidenceRef: "verified:a" },
    };
  }
}

class RecordingCommitter implements AuthorityCompleteSuccessCommitter {
  calls: { operation: ExecutablePlannedOperation; receipt: VerifiedExecutionReceipt; expected?: StateRevision }[] = [];
  constructor(private readonly result: CommitResult = { status: "committed", newStateRevision: stateRevision("p:next") }) {}
  async commitVerifiedSuccess(operation: ExecutablePlannedOperation, receipt: VerifiedExecutionReceipt, expectedStateRevision?: StateRevision): Promise<CommitResult> {
    this.calls.push({ operation, receipt, expected: expectedStateRevision });
    return this.result;
  }
}

function planned(): PlannedOperation {
  const target = path("notes/a.md");
  return {
    operationId: id<"OperationId">("op:authoritative") as OperationId,
    kind: "upload-update",
    path: target,
    targetSide: "remote",
    remoteObjectId: id<"RemoteObjectId">("remote:a"),
    destructive: false,
    preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path: target }],
    reasons: [],
  };
}

test("D authoritative coordinator never passes nominal authority markers to execution or commit", async () => {
  const executor = new RecordingAuthoritativeExecutor();
  const committer = new RecordingCommitter();
  const coordinator = new AuthorityCompleteExecutionCoordinator(new MemoryAuthorityStore(), executor, committer);
  const result = await coordinator.executeOperation(planned());
  assert.equal(result.status, "committed");
  assert.equal(executor.executed.length, 1);
  assert.equal(committer.calls.length, 1);
  for (const operation of [...executor.validated, ...executor.executed, ...committer.calls.map(call => call.operation)]) {
    assert.equal(operation.authorityComplete, true);
    const kinds: string[] = operation.preconditions.map(item => item.kind);
    assert.equal(kinds.includes("base-trusted"), false);
    assert.equal(kinds.includes("identity-unambiguous"), false);
    assert.equal(kinds.includes("base-authority"), true);
    assert.equal(kinds.includes("identity-authority"), true);
  }
  assert.equal(committer.calls[0]?.expected, stateRevision("p:authority"));
});

test("D authoritative coordinator isolates stale exact precondition before physical execution", async () => {
  const executor = new RecordingAuthoritativeExecutor({ status: "stale", failed: [] });
  const committer = new RecordingCommitter();
  const coordinator = new AuthorityCompleteExecutionCoordinator(new MemoryAuthorityStore(), executor, committer);
  const result = await coordinator.executeOperation(planned());
  assert.equal(result.status, "stale-precondition");
  assert.equal(executor.executed.length, 0);
  assert.equal(committer.calls.length, 0);
});

test("D authoritative coordinator refuses mutation when exact BASE convergence authority is unavailable", async () => {
  const value = authority();
  const store = new MemoryAuthorityStore({ ...value, pathConvergence: [] });
  const executor = new RecordingAuthoritativeExecutor();
  const coordinator = new AuthorityCompleteExecutionCoordinator(store, executor, new RecordingCommitter());
  const result = await coordinator.executeOperation(planned());
  assert.equal(result.status, "recovery-required");
  assert.equal(executor.validated.length, 0);
  assert.equal(executor.executed.length, 0);
});

test("D remote-feed learning progresses independently while an unrelated path remains conflicted", () => {
  const value: SynchronizationAuthorityMetadataV1_1 = {
    ...authority(),
    pathConvergence: [{ path: path("blocked.md"), state: { status: "conflict", reasonCode: "independent-remote-object" } }],
  };
  const batch: DurableRemoteChangeBatch = {
    checkpoint: {
      batchId: id<"RemoteIngestionBatchId">("batch:1") as RemoteIngestionBatchId,
      startingToken: id<"ChangeCursor">("cursor:1"),
      terminalStartToken: id<"ChangeCursor">("cursor:2"),
      persistenceRevision: stateRevision("p:batch"),
      status: "learned",
    },
    changes: [],
  };
  const learned = withLearnedRemoteBatch(value, batch);
  assert.equal(learned.learnedRemoteBatches.length, 1);
  assert.equal(learned.pathConvergence[0]?.state.status, "conflict");
  const repeated = withLearnedRemoteBatch(learned, batch);
  assert.equal(repeated.learnedRemoteBatches.length, 1, "remote batch retirement/progress must be idempotent");
});

test("D exact common-state proof produces BASE healing transition without a content rewrite operation", () => {
  const proof: FileCommonStateProof = {
    kind: "file-common",
    path: path("notes/heal.md"),
    entityKind: "file",
    generation: generation("g:heal"),
    localObservationToken: id<"ObservationToken">("local:heal"),
    remoteObjectId: id<"RemoteObjectId">("remote:heal"),
    remoteRevision: id<"RemoteRevisionId">("revision:heal"),
    canonicalContent: { algorithm: "sha256", hash: id<"ContentHash">("hash:heal"), sizeBytes: 10 },
    identity: "unambiguous",
  };
  const transition = commonStateBaseHealingTransition(proof, id<"BaseFingerprint">("base:heal"));
  assert.equal(transition.kind, "heal-common-state");
  assert.equal(transition.proof, proof);
});
