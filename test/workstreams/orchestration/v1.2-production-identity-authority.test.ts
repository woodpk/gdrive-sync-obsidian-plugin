import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BaseEntry,
  type ContentHash,
  type DeviceIdentity,
  type OperationId,
  type PathSnapshot,
  type PersistenceRevision,
  type PlannedOperation,
  type RemoteObjectId,
  type RemoteObjectMapping,
  type StateRevision,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthoritySaveResult,
  type SynchronizationAuthorityStoreV1_1,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import { AuthorityCompleteExecutionCoordinator, resolveAuthorityCompleteOperation } from "../../../src/core/execution-coordinator";
import { DeterministicSynchronizationPlanner } from "../../../src/core/planner";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const hash = (value: string) => id<"ContentHash">(value) as ContentHash;
const revision = (value: string) => id<"StateRevision">(value) as StateRevision;
const generation = id<"SemanticStateGeneration">("g:d-c10");
const vaultIdentity = id<"VaultIdentity">("vault:d-c10") as VaultIdentity;
const deviceIdentity = id<"DeviceIdentity">("device:d-c10") as DeviceIdentity;
const managedRemote = { rootId: remoteId("root:d-c10"), vaultIdentity, protocolVersion: id<"ProtocolVersion">("1") };
const stateContext = { expectation: "existing-pairing", expectedVaultIdentity: vaultIdentity, expectedDeviceIdentity: deviceIdentity } as const;
const target = path("notes/identity.md");
const stableRemoteId = remoteId("remote:identity");
const baseHash = hash("hash:base");
const localHash = hash("hash:local");

function baseEntry(): BaseEntry {
  return {
    path: target,
    entityKind: "file",
    localExisted: true,
    remoteExisted: true,
    content: { hash: baseHash, revision: "revision:base", sizeBytes: 3 },
    remoteObjectId: stableRemoteId,
  };
}

function mapping(remoteObjectId = stableRemoteId, mappedPath = target): RemoteObjectMapping {
  return { path: mappedPath, entityKind: "file", remoteObjectId };
}

function trustedState(mappings: readonly RemoteObjectMapping[] = [mapping()]): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: revision("state:d-c10"),
    vaultIdentity,
    deviceIdentity,
    base: [baseEntry()],
    remoteMappings: mappings,
    tombstones: [],
    operations: [],
    knownDevices: [],
  };
}

function snapshot(kind: "upload-update" | "trash-remote"): PathSnapshot {
  const base = baseEntry();
  return {
    path: target,
    local: kind === "upload-update"
      ? { status: "present", side: "local", path: target, entityKind: "file", content: { hash: localHash, revision: "revision:local", sizeBytes: 3 }, stability: "stable", observationToken: id<"ObservationToken">("obs:local") }
      : { status: "absent", side: "local", path: target },
    remote: { status: "present", side: "remote", path: target, entityKind: "file", content: { hash: baseHash, revision: "revision:base", sizeBytes: 3 }, stability: "stable", remoteObjectId: stableRemoteId },
    base: { status: "trusted", entry: base },
    remoteEnumeration: { status: "complete" },
    identity: { status: "unambiguous" },
  };
}

const planner = new DeterministicSynchronizationPlanner({
  assess: async () => { throw new Error("D-C10 fixture must not enter conflict resolution"); },
} as never);

async function plannerOperation(kind: "upload-update" | "trash-remote"): Promise<PlannedOperation> {
  const plan = await planner.plan({ snapshots: [snapshot(kind)], state: { status: "trusted", state: trustedState() } });
  const operation = plan.operations[0];
  assert.equal(operation?.kind, kind);
  assert.equal(operation?.preconditions.some(value => value.kind === "identity-authority"), false, "nominal planner output must not carry executable identity authority");
  return operation!;
}

function authority(): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: revision("authority:1") as PersistenceRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: [{ path: target, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:d-c10") } }],
    operationIntents: [],
    localTransactions: [],
  };
}

function assertExactIdentity(operation: PlannedOperation, mappings: readonly RemoteObjectMapping[]) {
  const resolved = resolveAuthorityCompleteOperation(operation, authority(), mappings);
  assert.equal(resolved.status, "ready");
  if (resolved.status !== "ready") return;
  const proofs = resolved.operation.preconditions.filter(value => value.kind === "identity-authority");
  assert.equal(proofs.length, 1);
  assert.equal(proofs[0]?.kind, "identity-authority");
  if (proofs[0]?.kind === "identity-authority") {
    assert.equal(proofs[0].proof.path, target);
    assert.equal(proofs[0].proof.remoteObjectId, stableRemoteId);
    assert.equal(proofs[0].proof.generation, generation);
    assert.equal(proofs[0].proof.status, "unique");
  }
  assert.equal(resolved.operation.preconditions.some(value => value.kind === "identity-unambiguous"), false);
}

for (const kind of ["upload-update", "trash-remote"] as const) {
  test(`D-C10 planner-generated ${kind} gains exactly one trusted identity authority proof`, async () => {
    assertExactIdentity(await plannerOperation(kind), [mapping()]);
  });

  test(`D-C10 ${kind} blocks missing, duplicate, and contradictory identity mappings`, async () => {
    const operation = await plannerOperation(kind);
    assert.equal(resolveAuthorityCompleteOperation(operation, authority(), []).status, "incomplete-authority");
    assert.equal(resolveAuthorityCompleteOperation(operation, authority(), [mapping(), { ...mapping() }]).status, "incomplete-authority", "duplicate path mapping must block");
    assert.equal(resolveAuthorityCompleteOperation(operation, authority(), [mapping(), mapping(stableRemoteId, path("notes/other.md"))]).status, "incomplete-authority", "duplicate REMOTE-ID mapping must block");
    assert.equal(resolveAuthorityCompleteOperation(operation, authority(), [mapping(remoteId("remote:other"), target), mapping(stableRemoteId, path("notes/other.md"))]).status, "incomplete-authority", "path/ID contradiction must block");
  });
}

test("D-C10 nominal identity-unambiguous marker cannot manufacture executable authority", async () => {
  const operation = await plannerOperation("upload-update");
  const marked: PlannedOperation = { ...operation, preconditions: [...operation.preconditions, { kind: "identity-unambiguous", path: operation.path }] };
  assert.equal(resolveAuthorityCompleteOperation(marked, authority(), []).status, "incomplete-authority");
});

class WritableAuthorityStore implements SynchronizationAuthorityStoreV1_1 {
  value = authority();
  private saves = 0;
  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }
  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1, expected: PersistenceRevision): Promise<SynchronizationAuthoritySaveResult> {
    assert.equal(expected, this.value.persistenceRevision);
    this.saves += 1;
    const persistenceRevision = revision(`authority:${this.saves + 1}`) as PersistenceRevision;
    this.value = { ...candidate, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: generation };
  }
  async commitBaseTransition(): Promise<SynchronizationAuthoritySaveResult> {
    return { status: "saved", persistenceRevision: this.value.persistenceRevision, semanticGeneration: generation };
  }
}

function productionHarness(kind: "upload-update" | "trash-remote") {
  let canonical = trustedState();
  let remoteEntries = [{ path: target, entityKind: "file" as const, remoteObjectId: stableRemoteId, hash: String(baseHash), sizeBytes: 3, trashed: false }];
  const seamCalls: string[] = [];
  const forbiddenRawCalls: string[] = [];
  let reserve = 0;
  const stateStore = { load: async () => ({ status: "trusted" as const, state: canonical }) };
  const bytes = { sizeBytes: 3, async *openChunks() { yield new Uint8Array([1, 2, 3]); } };
  const local = {
    observe: async () => snapshot(kind).local,
    readFile: async () => ({ content: bytes, evidence: { hash: localHash, sizeBytes: 3 }, observationToken: id<"ObservationToken">("obs:local") }),
  };
  const drive = {
    listForReconciliation: async () => ({ ok: true, value: { entries: remoteEntries, completeness: { status: "complete" } } }),
    create: async () => { forbiddenRawCalls.push("create"); throw new Error("raw create forbidden"); },
    update: async () => { forbiddenRawCalls.push("update"); throw new Error("raw update forbidden"); },
    move: async () => { forbiddenRawCalls.push("move"); throw new Error("raw move forbidden"); },
    trash: async () => { forbiddenRawCalls.push("trash"); throw new Error("raw trash forbidden"); },
  };
  const legacy = {
    local,
    drive,
    validatePreconditions: async () => ({ status: "valid" as const }),
    versionStillCurrent: async () => true,
    runEvidence: () => ({ managedRemote, remoteEnumerationComplete: true }),
  };
  const reliableRemoteMutationPort = {
    async reserveFileCreateIdentity(_root: unknown, intentId: unknown, pathValue: VaultPath, intendedContent: unknown) {
      reserve += 1;
      return { ok: true, value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: remoteId(`candidate:${reserve}`), path: pathValue, intendedContent } };
    },
    async updateExisting(descriptor: any) {
      seamCalls.push("updateExisting");
      remoteEntries = [{ path: target, entityKind: "file", remoteObjectId: descriptor.candidateRemoteObjectId, hash: String(localHash), sizeBytes: 3, trashed: false }];
      return { status: "verified-effect", applicationProof: { kind: "immutable-candidate-preservation", candidateRemoteObjectId: descriptor.candidateRemoteObjectId, predecessorRemoteObjectId: descriptor.remoteObjectId, predecessorRevision: descriptor.expectedRevision, intendedContent: descriptor.intendedContent, verifiedContent: descriptor.intendedContent, preservedRemoteObjectIds: [descriptor.remoteObjectId, descriptor.candidateRemoteObjectId] } };
    },
    async trashExisting(descriptor: any) {
      seamCalls.push("trashExisting");
      remoteEntries = [];
      return { status: "verified-effect", applicationProof: { kind: "trash", remoteObjectId: descriptor.remoteObjectId, path: descriptor.path, trashed: true } };
    },
  };
  const committer = {
    async commitVerifiedSuccess(operation: any, receipt: any) {
      canonical = {
        ...canonical,
        stateRevision: revision(`state:committed:${kind}`),
        operations: [...canonical.operations, { operationId: operation.operationId as OperationId, kind: operation.kind, path: operation.path, status: "completed" as const, verificationEvidenceRef: receipt.verificationEvidenceRef }],
      };
      return { status: "committed" as const, newStateRevision: canonical.stateRevision };
    },
  };
  return { stateStore, legacy, reliableRemoteMutationPort, committer, seamCalls, forbiddenRawCalls };
}

for (const kind of ["upload-update", "trash-remote"] as const) {
  test(`D-C10 planner-generated ${kind} reaches the real frozen REMOTE mutation seam through the authority-complete coordinator`, async () => {
    const operation = await plannerOperation(kind);
    const authorityStore = new WritableAuthorityStore();
    const h = productionHarness(kind);
    const executor = createAuthoritativeProductExecutor(
      h.legacy as never,
      authorityStore,
      h.stateStore as never,
      stateContext as never,
      managedRemote as never,
      { reliableRemoteMutationPort: h.reliableRemoteMutationPort as never },
    );
    const coordinator = new AuthorityCompleteExecutionCoordinator(authorityStore, executor, h.committer as never, h.stateStore as never, stateContext as never);
    const result = await coordinator.executeOperation(operation);
    assert.equal(result.status, "committed");
    assert.deepEqual(h.seamCalls, [kind === "upload-update" ? "updateExisting" : "trashExisting"]);
    assert.deepEqual(h.forbiddenRawCalls, []);
    const intent = authorityStore.value.operationIntents.find(value => value.operationId === operation.operationId);
    assert.ok(intent);
    assert.equal(intent?.effects.every(effect => effect.stage === "state-committed"), true);
    const descriptor = intent?.effects[0]?.descriptor;
    if (kind === "upload-update") {
      assert.equal(descriptor?.kind, "remote-file");
      if (descriptor?.kind === "remote-file" && descriptor.remoteMutation.kind === "existing-file-content-update") {
        assert.equal(descriptor.remoteMutation.identityAuthority.remoteObjectId, stableRemoteId);
      }
    } else {
      assert.equal(descriptor?.kind, "trash");
      if (descriptor?.kind === "trash") assert.equal(descriptor.identityAuthority?.remoteObjectId, stableRemoteId);
    }
  });
}
