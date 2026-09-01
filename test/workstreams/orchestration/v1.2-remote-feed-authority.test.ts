import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ChangeCursor,
  type DeviceIdentity,
  type DurableRemoteChangeBatch,
  type GoogleDrivePort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type PersistenceRevision,
  type PlannedOperation,
  type ReliableRemoteChangePort,
  type RemoteObjectId,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import { InMemoryRunLeasePort } from "../../../src/core/run-coordinator";
import { IntegratedProductController } from "../../../src/product/product-controller";
import { ProductSnapshotAssembler } from "../../../src/product/snapshot-assembler";

const id = <T extends string>(value: string) => contractId<T>(value);
const cursor = (value: string) => id<"ChangeCursor">(value) as ChangeCursor;
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const revision = (value: string) => id<"StateRevision">(value) as StateRevision;
const vault = id<"VaultIdentity">("vault:feed-authority") as VaultIdentity;
const device = id<"DeviceIdentity">("device:feed-authority") as DeviceIdentity;
const generation = id<"SemanticStateGeneration">("generation:feed-authority");
const identity: ManagedRemoteIdentity = { rootId: remoteId("root:feed"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };

function initialTrusted(): TrustedSynchronizationState {
  return {
    schemaVersion: 1, stateRevision: revision("state:1"), vaultIdentity: vault, deviceIdentity: device,
    base: [{ path: path("a.md"), entityKind: "file", localExisted: false, remoteExisted: true, remoteObjectId: remoteId("remote:a") }],
    remoteMappings: [{ path: path("a.md"), entityKind: "file", remoteObjectId: remoteId("remote:a") }],
    tombstones: [], changeCursor: cursor("cursor:0"), operations: [], knownDevices: [],
  };
}
class MutableStateStore {
  value = initialTrusted();
  saves: TrustedSynchronizationState[] = [];
  async load() { return { status: "trusted" as const, state: this.value }; }
  async saveTrusted(candidate: TrustedSynchronizationState, expected?: StateRevision) {
    if (expected && expected !== this.value.stateRevision) return { status: "stale-revision" as const, actualRevision: this.value.stateRevision };
    this.value = candidate; this.saves.push(candidate); return { status: "saved" as const, stateRevision: candidate.stateRevision };
  }
}
class WritableAuthority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1 = {
    persistenceRevision: revision("authority:1") as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: [{ path: path("a.md"), state: { status: "conflict", reasonCode: "independent-remote-object" } }],
    operationIntents: [], localTransactions: [],
  };
  saves: SynchronizationAuthorityMetadataV1_1[] = [];
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    if (expected !== this.value.persistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: this.value.persistenceRevision };
    const next = revision(`authority:${this.saves.length + 2}`) as PersistenceRevision;
    this.value = { ...candidate, persistenceRevision: next }; this.saves.push(this.value);
    return { status: "saved", persistenceRevision: next, semanticGeneration: this.value.semanticGeneration };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> { return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: this.value.semanticGeneration }; }
}
function local(): LocalVaultPort { return { enumerate: async () => ({ entries: [], completeness: { status: "complete" } }) } as unknown as LocalVaultPort; }
function drive(): GoogleDrivePort {
  return {
    validateManagedRoot: async () => ({ ok: true, value: { status: "valid", identity } }),
    readChanges: async () => { throw new Error("legacy readChanges must not be called"); },
    getStartCursor: async () => ({ ok: true, value: cursor("cursor:full") }),
    listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "complete" } } }),
  } as unknown as GoogleDrivePort;
}
function pages(calls: string[]): ReliableRemoteChangePort {
  return {
    async readChangePage(_identity, requestedToken) {
      calls.push(String(requestedToken));
      if (requestedToken === cursor("cursor:0")) return { ok: true, value: { kind: "intermediate", requestedToken, changes: [{ kind: "removed", remoteObjectId: remoteId("remote:a"), lastKnownPath: path("a.md") }], nextPageToken: cursor("page:1") } };
      if (requestedToken === cursor("page:1")) return { ok: true, value: { kind: "terminal", requestedToken, changes: [{ kind: "upsert", entry: { path: path("a.md"), entityKind: "file", remoteObjectId: remoteId("remote:a2"), trashed: false } }], newStartPageToken: cursor("cursor:1") } };
      assert.equal(requestedToken, cursor("cursor:1"));
      return { ok: true, value: { kind: "terminal", requestedToken, changes: [{ kind: "upsert", entry: { path: path("b.md"), entityKind: "file", remoteObjectId: remoteId("remote:b"), trashed: false } }], newStartPageToken: cursor("cursor:2") } };
    },
  };
}
function conflictOperation(sequence: number): PlannedOperation {
  return {
    operationId: id<"OperationId">(`op:feed-conflict:${sequence}`),
    kind: "unresolved-conflict",
    path: path("a.md"),
    destructive: false,
    preconditions: [],
    reasons: [{ code: "remote-path-ambiguous", summary: "persisted path-local conflict remains unresolved" }],
  };
}
function controller(state: MutableStateStore, authority: WritableAuthority, reliable: ReliableRemoteChangePort, actualConflict = false) {
  const assembler = new ProductSnapshotAssembler(local(), drive(), state as never, context, async () => identity, () => true, () => false, undefined, reliable);
  let plans = 0;
  return new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: context, stateStore: state as never, authorityStore: authority,
    snapshotAssembler: assembler, executor: {} as never, conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: () => ({ plan: async () => {
      plans += 1;
      return { planId: id<"PlanId">(`plan:${plans}:${String(state.value.changeCursor)}`), trigger: "periodic", operations: actualConflict ? [conflictOperation(plans)] : [], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" };
    } }),
    leasePort: new InMemoryRunLeasePort(), audit: { append: async () => undefined, read: async () => [] } as never, holderId: "test:feed-authority",
  });
}

test("D terminal two-page batch is durably learned before cursor advancement while sibling path conflict remains unresolved", async () => {
  const state = new MutableStateStore(); const authority = new WritableAuthority(); const calls: string[] = [];
  const c = controller(state, authority, pages(calls));
  await c.runAutomatic("periodic");
  assert.deepEqual(calls, ["cursor:0", "page:1"]);
  assert.equal(authority.value.learnedRemoteBatches.length, 1);
  const batch = authority.value.learnedRemoteBatches[0]!;
  assert.equal(batch.checkpoint.startingToken, cursor("cursor:0")); assert.equal(batch.checkpoint.terminalStartToken, cursor("cursor:1"));
  assert.deepEqual(batch.changes.map(change => change.kind), ["removed", "upsert"]);
  assert.equal(authority.value.pathConvergence[0]?.state.status, "conflict", "unrelated unresolved path authority survives feed learning");
  assert.equal(state.value.changeCursor, cursor("cursor:1"), "terminal checkpoint mirror advances only after durable batch save");
  assert.equal(authority.saves.length >= 1, true);
});

test("D later unrelated REMOTE changes continue from durable learned terminal while prior conflicted facts remain in backlog", async () => {
  const state = new MutableStateStore(); const authority = new WritableAuthority(); const calls: string[] = []; const c = controller(state, authority, pages(calls));
  await c.runAutomatic("periodic"); await c.runAutomatic("periodic");
  assert.deepEqual(calls, ["cursor:0", "page:1", "cursor:1"]);
  assert.equal(authority.value.learnedRemoteBatches.length, 2);
  assert.equal(authority.value.learnedRemoteBatches[0]?.changes.some(change => change.kind === "removed"), true);
  assert.equal(authority.value.learnedRemoteBatches[1]?.changes.some(change => change.kind === "upsert" && change.entry.path === path("b.md")), true);
  assert.equal(state.value.changeCursor, cursor("cursor:2"));
  assert.equal(authority.value.pathConvergence[0]?.state.status, "conflict");
});

test("D-C9 actual partial conflict run still learns terminal batch and next run progresses to later REMOTE facts", async () => {
  const state = new MutableStateStore(); const authority = new WritableAuthority(); const calls: string[] = [];
  const c = controller(state, authority, pages(calls), true);
  await c.runAutomatic("periodic");
  assert.equal(c.currentSurface().status.kind, "attention-required", "actual unresolved-conflict operation makes the run partial rather than complete");
  assert.equal(authority.value.learnedRemoteBatches.length, 1);
  assert.equal(state.value.changeCursor, cursor("cursor:1"), "feed authority progresses independently of path execution partiality");
  assert.equal(authority.value.pathConvergence[0]?.state.status, "conflict");

  await c.runAutomatic("periodic");
  assert.deepEqual(calls, ["cursor:0", "page:1", "cursor:1"]);
  assert.equal(c.currentSurface().status.kind, "attention-required");
  assert.equal(authority.value.learnedRemoteBatches.length, 2, "later batch is learned although prior path conflict is still unresolved");
  assert.equal(authority.value.learnedRemoteBatches[1]?.changes.some(change => change.kind === "upsert" && change.entry.path === path("b.md")), true);
  assert.equal(state.value.changeCursor, cursor("cursor:2"));
  assert.equal(authority.value.pathConvergence[0]?.state.status, "conflict");
});

test("D repeated already-learned terminal batch is idempotent", async () => {
  const state = new MutableStateStore(); const authority = new WritableAuthority(); const calls: string[] = [];
  await controller(state, authority, pages(calls)).runAutomatic("periodic");
  const savedBatch: DurableRemoteChangeBatch = authority.value.learnedRemoteBatches[0]!;
  const count = authority.value.learnedRemoteBatches.length;
  const duplicateAssembler = { bindAuthorityStore: () => undefined, assemble: async () => ({ input: { snapshots: [], state: { status: "trusted", state: state.value } }, managedRemote: identity, localEnumeration: { status: "complete" }, remoteEnumeration: { status: "complete" }, nextCursor: savedBatch.checkpoint.terminalStartToken, remoteChangeBatch: savedBatch, mode: "incremental" }) } as never;
  const duplicate = new IntegratedProductController({ vaultIdentity: vault, deviceIdentity: device, stateContext: context, stateStore: state as never, authorityStore: authority, snapshotAssembler: duplicateAssembler, executor: {} as never, conflictResolver: { assess: async () => ({ kind: "none" }) } as never, plannerForTrigger: () => ({ plan: async () => ({ planId: id<"PlanId">("plan:duplicate"), trigger: "periodic", operations: [], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" }) }), leasePort: new InMemoryRunLeasePort(), audit: { append: async () => undefined, read: async () => [] } as never, holderId: "test:duplicate" });
  await duplicate.runAutomatic("periodic");
  assert.equal(authority.value.learnedRemoteBatches.length, count);
});

test("D absent writable authority store cannot advance terminal REMOTE feed checkpoint", async () => {
  const state = new MutableStateStore(); const calls: string[] = [];
  const assembler = new ProductSnapshotAssembler(local(), drive(), state as never, context, async () => identity, () => true, () => false, undefined, pages(calls));
  const c = new IntegratedProductController({ vaultIdentity: vault, deviceIdentity: device, stateContext: context, stateStore: state as never, snapshotAssembler: assembler, executor: {} as never, conflictResolver: { assess: async () => ({ kind: "none" }) } as never, plannerForTrigger: () => ({ plan: async () => ({ planId: id<"PlanId">("plan:no-write"), trigger: "periodic", operations: [], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none" }) }), leasePort: new InMemoryRunLeasePort(), audit: { append: async () => undefined, read: async () => [] } as never, holderId: "test:no-write" });
  await c.runAutomatic("periodic");
  assert.equal(c.currentSurface().status.kind, "recovery-required"); assert.equal(state.value.changeCursor, cursor("cursor:0"));
});

test("D failure before terminal creates no learned batch and advances no checkpoint", async () => {
  const state = new MutableStateStore(); const authority = new WritableAuthority();
  const failing: ReliableRemoteChangePort = { async readChangePage(_identity, requestedToken) { return requestedToken === cursor("cursor:0") ? { ok: true, value: { kind: "intermediate", requestedToken, changes: [], nextPageToken: cursor("page:failure") } } : { ok: false, signal: { kind: "transient-failure", detail: "boom" } }; } };
  const c = controller(state, authority, failing);
  await c.runAutomatic("periodic");
  assert.equal(c.currentSurface().status.kind, "offline-deferred"); assert.equal(authority.value.learnedRemoteBatches.length, 0); assert.equal(state.value.changeCursor, cursor("cursor:0"));
});