import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type ContentHash,
  type DeviceIdentity,
  type GoogleDrivePort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type OperationId,
  type PersistenceRevision,
  type PlannedOperation,
  type ReliableRemoteMutationPort,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import { AuthorityCompleteExecutionCoordinator } from "../../../src/core/execution-coordinator";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";
import { DurableEffectLifecycleCoordinator } from "../../../src/product/operation-isolation";
import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";

const id = <T extends string>(value: string) => contractId<T>(value);
const p = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const rev = (value: string) => id<"StateRevision">(value) as StateRevision;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const target = p("notes/lat04.md");
const vault = id<"VaultIdentity">("vault:lat04") as VaultIdentity;
const device = id<"DeviceIdentity">("device:lat04") as DeviceIdentity;
const remoteRoot = rid("root:lat04");
const expectedRemote = rid("remote:lat04:predecessor");
const candidateRemote = rid("remote:lat04:candidate");
const hash = id<"ContentHash">("hash:lat04") as ContentHash;
const baseFingerprint = id<"BaseFingerprint">("base:lat04");
const initialGeneration = generation("semantic:lat04:1");
const managedRemote: ManagedRemoteIdentity = { rootId: remoteRoot, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const stateContext: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const bytes: BinaryContentSource = { sizeBytes: 3, async *openChunks() { yield new Uint8Array([1, 2, 3]); } };

function canonicalState(): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: rev("state:lat04:1"),
    vaultIdentity: vault,
    deviceIdentity: device,
    base: [{ path: target, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: expectedRemote, content: { hash, sizeBytes: 3 } }],
    remoteMappings: [{ path: target, entityKind: "file", remoteObjectId: expectedRemote }],
    tombstones: [],
    operations: [],
    knownDevices: [],
  };
}

function initialAuthority(): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: rev("authority:lat04:1") as PersistenceRevision,
    semanticGeneration: initialGeneration,
    learnedRemoteBatches: [],
    pathConvergence: [{ path: target, state: { status: "converged", generation: initialGeneration, baseFingerprint } }],
    operationIntents: [],
    localTransactions: [],
  };
}

class AuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  value = initialAuthority();
  readonly snapshots: SynchronizationAuthorityMetadataV1_1[] = [];
  readonly lifecycleStages: string[] = [];
  readonly diagnosticEvents: { event: string; result?: unknown; observationSource?: unknown }[] = [];
  fullValidationStarts = 0;
  private revisionSequence = 1;

  readonly executionLifecycleObserver = (_operation: PlannedOperation, stage: string, result?: string) => {
    this.lifecycleStages.push(`${stage}${result ? `:${result}` : ""}`);
  };

  readonly executionDiagnosticEmitter = (_operation: PlannedOperation, _component: string, event: string, fields?: Record<string, unknown>) => {
    if (event === "authority-resolution-start") this.fullValidationStarts += 1;
    this.diagnosticEvents.push({ event, result: fields?.result, observationSource: fields?.observationSource });
  };

  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }

  async saveAuthority(
    candidate: SynchronizationAuthorityMetadataV1_1,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    if (expectedPersistenceRevision !== this.value.persistenceRevision) {
      return { status: "stale-persistence", actualPersistenceRevision: this.value.persistenceRevision };
    }
    if (expectedSemanticGeneration && expectedSemanticGeneration !== this.value.semanticGeneration) {
      return { status: "stale-semantic-authority", actualSemanticGeneration: this.value.semanticGeneration };
    }
    this.revisionSequence += 1;
    const persistenceRevision = rev(`authority:lat04:${this.revisionSequence}`) as PersistenceRevision;
    this.value = { ...candidate, persistenceRevision };
    this.snapshots.push(this.value);
    return { status: "saved", persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }

  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> {
    return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }

  advanceSemanticGeneration(): void {
    this.revisionSequence += 1;
    const next = generation(`semantic:lat04:${this.revisionSequence}`);
    this.value = {
      ...this.value,
      persistenceRevision: rev(`authority:lat04:${this.revisionSequence}`) as PersistenceRevision,
      semanticGeneration: next,
      pathConvergence: this.value.pathConvergence.map(entry => entry.state.status === "converged"
        ? { ...entry, state: { ...entry.state, generation: next } }
        : entry),
    };
  }
}

function plannedOperation(): PlannedOperation {
  return {
    operationId: id<"OperationId">("op:lat04") as OperationId,
    kind: "upload-update",
    path: target,
    targetSide: "remote",
    remoteObjectId: expectedRemote,
    contentVersion: {
      path: target,
      entityKind: "file",
      content: { hash, sizeBytes: 3 },
      observationToken: id<"ObservationToken">("local:lat04:1"),
    },
    destructive: false,
    preconditions: [
      { kind: "base-trusted" },
      { kind: "identity-unambiguous", path: target },
      { kind: "path-observation", side: "local", path: target, expected: "present", observationToken: "local:lat04:1" },
      { kind: "content-evidence", side: "local", path: target, expected: { hash, sizeBytes: 3 } },
      { kind: "file-stable", path: target },
      { kind: "remote-object", remoteObjectId: expectedRemote, expectedRevision: "remote-revision:lat04:1" },
    ],
    reasons: [],
  };
}

type Harness = ReturnType<typeof harness>;
function harness(
  onReserve?: (h: { setLocalToken(value: string): void; setRemote(remoteObjectId: RemoteObjectId, revision: string): void; authority: AuthorityStore }) => void,
  throwDuringFullValidation = false,
) {
  const authority = new AuthorityStore();
  const canonical = canonicalState();
  let localToken = "local:lat04:1";
  let remoteObjectId = expectedRemote;
  let remoteRevision = "remote-revision:lat04:1";
  let physicalMutations = 0;
  let ordinaryValidationCalls = 0;
  let reserveHookCalled = false;

  const local = {
    observe: async () => ({
      status: "present",
      side: "local",
      path: target,
      entityKind: "file",
      content: { hash, sizeBytes: 3 },
      stability: "stable",
      observationToken: id<"ObservationToken">(localToken),
    }),
    readFile: async (_path: VaultPath, expected?: string) => {
      if (expected && expected !== localToken) throw new Error("stale local source token");
      return { content: bytes, evidence: { hash, sizeBytes: 3 }, stability: "stable", observationToken: id<"ObservationToken">(localToken) };
    },
    validatePath: async () => ({ status: "compatible" }),
  } as unknown as LocalVaultPort;

  const drive = {
    observe: async () => ({ ok: true, value: {
      status: "present",
      side: "remote",
      path: target,
      entityKind: "file",
      remoteObjectId,
      content: { hash, sizeBytes: 3, revision: remoteRevision },
      stability: "stable",
    } }),
    listForReconciliation: async () => ({ ok: true, value: {
      entries: [{ path: target, entityKind: "file", remoteObjectId, content: { hash, sizeBytes: 3, revision: remoteRevision }, trashed: false }],
      completeness: { status: "complete" },
    } }),
  } as unknown as GoogleDrivePort;

  const stateStore = {
    load: async () => ({ status: "trusted" as const, state: canonical }),
    saveTrusted: async () => ({ status: "saved" as const, stateRevision: canonical.stateRevision }),
  };
  const legacy = new ProductSynchronizationExecutor(local, drive, stateStore as never, stateContext, () => ({ managedRemote, remoteEnumerationComplete: true }));
  const originalValidate = legacy.validatePreconditions.bind(legacy);
  legacy.validatePreconditions = async operation => {
    ordinaryValidationCalls += 1;
    if (throwDuringFullValidation && ordinaryValidationCalls === 1) throw new Error("LAT-04 validation provenance fixture");
    return originalValidate(operation);
  };

  const hookApi = {
    setLocalToken(value: string) { localToken = value; },
    setRemote(value: RemoteObjectId, revisionValue: string) { remoteObjectId = value; remoteRevision = revisionValue; },
    authority,
  };

  const reliableRemote: ReliableRemoteMutationPort = {
    async reserveFileCreateIdentity(_root, intentId, path, intendedContent) {
      if (!reserveHookCalled) { reserveHookCalled = true; onReserve?.(hookApi); }
      return { ok: true, value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: candidateRemote, path, intendedContent } };
    },
    async reserveFolderCreateIdentity() { throw new Error("not used"); },
    async createReserved() { throw new Error("not used"); },
    async updateExisting(identity) {
      physicalMutations += 1;
      remoteObjectId = identity.candidateRemoteObjectId;
      remoteRevision = "remote-revision:lat04:candidate";
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "immutable-candidate-preservation",
          candidateRemoteObjectId: identity.candidateRemoteObjectId,
          predecessorRemoteObjectId: identity.remoteObjectId,
          predecessorRevision: identity.expectedRevision,
          intendedContent: identity.intendedContent,
          verifiedContent: identity.intendedContent,
          preservedRemoteObjectIds: [identity.remoteObjectId, identity.candidateRemoteObjectId],
        },
      };
    },
    async moveExisting() { throw new Error("not used"); },
    async trashExisting() { throw new Error("not used"); },
  };

  const executor = createAuthoritativeProductExecutor(legacy, authority, stateStore as never, stateContext, managedRemote, { reliableRemoteMutationPort: reliableRemote });
  const coordinator = new AuthorityCompleteExecutionCoordinator(
    authority,
    executor,
    { commitVerifiedSuccess: async (_operation, _receipt, expectedRevision) => ({ status: "committed" as const, newStateRevision: expectedRevision ?? canonical.stateRevision }) },
    stateStore as never,
    stateContext,
  );

  return {
    authority,
    coordinator,
    get ordinaryValidationCalls() { return ordinaryValidationCalls; },
    get physicalMutations() { return physicalMutations; },
  };
}

function firstEffectStages(store: AuthorityStore): string[] {
  return store.snapshots.flatMap(snapshot => snapshot.operationIntents[0]?.effects[0]?.stage ? [snapshot.operationIntents[0].effects[0].stage] : []);
}

function assertOrderedStages(stages: readonly string[], expected: readonly string[]): void {
  let prior = -1;
  for (const stage of expected) {
    const index = stages.indexOf(stage);
    assert.ok(index > prior, `${stage} must occur after ${expected[Math.max(0, expected.indexOf(stage) - 1)] ?? "start"}`);
    prior = index;
  }
}

test("LAT-04 normal physical operation uses one full authority validation and preserves lifecycle ordering", async () => {
  const h = harness();
  const result = await h.coordinator.executeOperation(plannedOperation());
  assert.equal(result.status, "committed");
  assert.equal(h.authority.fullValidationStarts, 1, "full authority-complete validation must execute exactly once");
  assert.equal(h.ordinaryValidationCalls, 2, "one ordinary check belongs to full validation and one is the narrow dispatch guard");
  assert.equal(h.physicalMutations, 1);
  assertOrderedStages(firstEffectStages(h.authority), ["intent-persisted", "dispatch-authorized", "effect-verified", "state-committed"]);
  assert.equal(h.authority.lifecycleStages.some(value => value.startsWith("operation-precondition-validated")), false, "coordinator must not emit a duplicate successful validation lifecycle");
});

test("LAT-04 execute-boundary validation throw retains exact precondition diagnostic provenance", async () => {
  const h = harness(undefined, true);
  await assert.rejects(() => h.coordinator.executeOperation(plannedOperation()), /LAT-04 validation provenance fixture/);
  assert.equal(h.authority.fullValidationStarts, 1);
  assert.equal(h.physicalMutations, 0);
  assert.equal(h.authority.lifecycleStages.some(value => value === "operation-precondition-validation-failed:threw"), true);
  assert.equal(h.authority.lifecycleStages.some(value => value === "content-mutation-failed:threw"), false);
});

test("LAT-04 dispatch guard rejects LOCAL token changes after full validation and before mutation", async () => {
  const h = harness(api => api.setLocalToken("local:lat04:changed"));
  const result = await h.coordinator.executeOperation(plannedOperation());
  assert.equal(result.status, "stale-precondition");
  assert.equal(h.authority.fullValidationStarts, 1);
  assert.equal(h.physicalMutations, 0);
  assert.equal(h.authority.value.operationIntents.length, 0, "verified-not-applied guard failure must retire the unattempted physical intent");
  assert.ok(h.authority.diagnosticEvents.some(event => event.event === "physical-result-classified" && event.result === "verified-not-applied" && event.observationSource === "dispatch-guard"));
});

test("LAT-04 dispatch guard rejects REMOTE revision/object identity changes after full validation", async () => {
  for (const mode of ["revision", "identity"] as const) {
    const h = harness(api => mode === "revision"
      ? api.setRemote(expectedRemote, "remote-revision:lat04:changed")
      : api.setRemote(rid("remote:lat04:intruder"), "remote-revision:lat04:1"));
    const result = await h.coordinator.executeOperation(plannedOperation());
    assert.equal(result.status, "stale-precondition", mode);
    assert.equal(h.authority.fullValidationStarts, 1, mode);
    assert.equal(h.physicalMutations, 0, mode);
    assert.equal(h.authority.value.operationIntents.length, 0, mode);
  }
});

test("LAT-04 semantic generation race after full validation fails closed before dispatch", async () => {
  const h = harness(api => api.authority.advanceSemanticGeneration());
  const result = await h.coordinator.executeOperation(plannedOperation());
  assert.equal(result.status, "recovery-required");
  assert.equal(h.authority.fullValidationStarts, 1);
  assert.equal(h.physicalMutations, 0);
  const intent = h.authority.value.operationIntents[0];
  assert.ok(intent, "stale-generation unattempted intent remains recoverable rather than being redispatched");
  assert.equal(intent?.effects[0]?.stage, "intent-persisted");
  assert.notEqual(intent?.semanticAuthority.generation, h.authority.value.semanticGeneration);
  assert.equal(h.authority.lifecycleStages.some(value => value.startsWith("operation-precondition-validated")), false);
  assert.equal(h.authority.lifecycleStages.some(value => value === "operation-complete:recovery-required"), true);
});

test("LAT-04 destructive stale semantic authority cannot cross dispatch authorization", async () => {
  const store = new AuthorityStore();
  const currentGeneration = generation("semantic:lat04:current");
  const staleGeneration = generation("semantic:lat04:stale");
  const operationId = id<"OperationId">("op:lat04:trash") as OperationId;
  const effectId = "effect:lat04:trash";
  store.value = {
    ...store.value,
    semanticGeneration: currentGeneration,
    pathConvergence: [{ path: target, state: { status: "converged", generation: currentGeneration, baseFingerprint } }],
    operationIntents: [{
      logicalKind: "single-effect",
      operationId,
      intentId: id<"MutationIntentId">("intent:lat04:trash"),
      semanticAuthority: { generation: staleGeneration },
      effects: [{
        effectId,
        stage: "intent-persisted",
        descriptor: {
          kind: "trash",
          targetSide: "remote",
          path: target,
          remoteObjectId: expectedRemote,
          baseAuthority: { generation: staleGeneration, path: target, fingerprint: baseFingerprint },
          identityAuthority: { generation: staleGeneration, status: "unique", path: target, remoteObjectId: expectedRemote },
        },
      }],
    } as never],
  };
  let dispatchCalls = 0;
  const lifecycle = new DurableEffectLifecycleCoordinator(store, {
    dispatch: async () => { dispatchCalls += 1; return { status: "verified-effect", verificationEvidenceRef: "must-not-dispatch" }; },
  });
  const result = await lifecycle.dispatchPersistedEffect(String(operationId), effectId);
  assert.equal(result.status, "stale-authority");
  assert.equal(dispatchCalls, 0);
  assert.equal(store.value.operationIntents[0]?.effects[0]?.stage, "intent-persisted");
});
