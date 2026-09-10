import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ContentEvidence,
  ExecutablePlannedOperation,
  LocalMutationTransaction,
  ManagedRemoteIdentity,
  ObservationToken,
  OperationPrecondition,
  PersistenceRevision,
  RemoteEntry,
  RemoteObjectId,
  SemanticStateGeneration,
  StateLoadContext,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { AuthorityCompleteExecutionCoordinator, resolveAuthorityCompleteOperation } from "../src/core/execution-coordinator";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { createAuthoritativeProductExecutor } from "../src/product/authoritative-production-executor";
import { ProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { SynchronizationStateAuthorityAdapter } from "../src/product/synchronization-adapters";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../src/product/text-version-store";
import {
  createInitialAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  type DurableSynchronizationAuthorityState,
} from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const gen = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const prev = (value: string) => id<"StateRevision">(value) as unknown as PersistenceRevision;
const bytes = (text: string) => new TextEncoder().encode(text);
const evidence = (text: string, revision?: string): ContentEvidence => ({
  hash: sha256Text(text),
  sizeBytes: bytes(text).byteLength,
  ...(revision ? { revision } : {}),
});
const source = (text: string): BinaryContentSource => ({ sizeBytes: bytes(text).byteLength, async *openChunks() { yield bytes(text); } });
async function textOf(content: BinaryContentSource): Promise<string> {
  const decoder = new TextDecoder();
  let out = "";
  for await (const chunk of content.openChunks()) out += decoder.decode(chunk, { stream: true });
  return out + decoder.decode();
}

type LocalFile = { text: string; evidence: ContentEvidence; token: ObservationToken };
type RemoteFile = { path: VaultPath; text: string; evidence: ContentEvidence; remoteObjectId: RemoteObjectId };

class Boundary {
  readonly localFiles = new Map<string, LocalFile>();
  readonly remoteFiles = new Map<string, RemoteFile>();
  readonly preserved = new Map<string, RemoteFile>();
  readonly extras: RemoteEntry[] = [];
  readonly updateCalls: string[] = [];
  readonly createCalls: string[] = [];
  readonly localReplaceCalls: string[] = [];
  private readonly staged = new Map<string, string>();
  private tokenCounter = 0;
  private remoteCounter = 0;

  constructor(readonly identity: ManagedRemoteIdentity) {}

  setLocal(path: VaultPath, text: string): void {
    this.localFiles.set(String(path), { text, evidence: evidence(text), token: id<"ObservationToken">(`local:${++this.tokenCounter}:${String(path)}`) as ObservationToken });
  }
  setRemote(path: VaultPath, text: string, remoteObjectId: RemoteObjectId): void {
    this.remoteFiles.set(String(path), { path, text, evidence: evidence(text, `r${++this.remoteCounter}`), remoteObjectId });
  }
  changeRemote(path: VaultPath, text: string, remoteObjectId?: RemoteObjectId): void {
    const prior = this.remoteFiles.get(String(path));
    assert.ok(prior);
    this.remoteFiles.set(String(path), {
      path,
      text,
      evidence: evidence(text, `r${++this.remoteCounter}`),
      remoteObjectId: remoteObjectId ?? prior.remoteObjectId,
    });
  }
  addDuplicate(path: VaultPath, text: string, remoteObjectId: RemoteObjectId): void {
    this.extras.push({ path, entityKind: "file", content: evidence(text, `r${++this.remoteCounter}`), remoteObjectId, trashed: false });
  }

  readonly local = {
    activeConfigurationDirectory: async () => vp(".obsidian"),
    enumerate: async () => ({
      entries: [...this.localFiles].map(([raw, file]) => ({ status: "present" as const, side: "local" as const, path: vp(raw), entityKind: "file" as const, content: file.evidence, stability: "stable" as const, observationToken: file.token })),
      completeness: { status: "complete" as const },
    }),
    observe: async (path: VaultPath) => {
      const file = this.localFiles.get(String(path));
      return file
        ? { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content: file.evidence, stability: "stable" as const, observationToken: file.token }
        : { status: "absent" as const, side: "local" as const, path };
    },
    readFile: async (path: VaultPath, expectedToken?: ObservationToken) => {
      const file = this.localFiles.get(String(path));
      if (!file) throw new Error("missing local file");
      if (expectedToken && expectedToken !== file.token) throw new Error("stale local observation token");
      return { content: source(file.text), evidence: file.evidence, stability: "stable" as const, observationToken: file.token };
    },
    createFile: async (path: VaultPath, content: BinaryContentSource) => {
      const text = await textOf(content); this.setLocal(path, text); const file = this.localFiles.get(String(path))!; return { path, evidence: file.evidence, observationToken: file.token };
    },
    replaceFile: async (path: VaultPath, content: BinaryContentSource) => {
      const text = await textOf(content); this.localReplaceCalls.push(String(path)); this.setLocal(path, text); const file = this.localFiles.get(String(path))!; return { path, evidence: file.evidence, observationToken: file.token };
    },
    createFolder: async (path: VaultPath) => ({ path }),
    move: async () => { throw new Error("move outside C1 fixture"); },
    trash: async () => { throw new Error("trash outside C1 fixture"); },
    validatePath: async (path: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(path) }),
    classifyConfiguration: async () => ({ classification: "unknown" as const, reason: "C1 fixture" }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };

  readonly drive = {
    authenticationState: async () => ({ status: "authenticated" as const }),
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: this.identity } }),
    getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:c1") }),
    readChanges: async () => ({ ok: true as const, value: { changes: [], nextCursor: id<"ChangeCursor">("cursor:c1"), completeness: { status: "complete" as const } } }),
    listForReconciliation: async () => ({
      ok: true as const,
      value: {
        entries: [
          ...this.remoteFiles.values(),
          ...this.extras,
        ].map(entry => "text" in entry
          ? { path: entry.path, entityKind: "file" as const, content: entry.evidence, remoteObjectId: entry.remoteObjectId, trashed: false }
          : entry),
        completeness: { status: "complete" as const },
      },
    }),
    observe: async (_root: RemoteObjectId, path: VaultPath) => {
      const file = this.remoteFiles.get(String(path));
      return file
        ? { ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: file.remoteObjectId, content: file.evidence, stability: "stable" as const } }
        : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path } };
    },
    download: async (remoteObjectId: RemoteObjectId) => {
      const file = [...this.remoteFiles.values(), ...this.preserved.values()].find(value => value.remoteObjectId === remoteObjectId);
      return file
        ? { ok: true as const, value: { remoteObjectId, content: source(file.text), evidence: file.evidence } }
        : { ok: false as const, signal: { kind: "not-found" as const, remoteObjectId } };
    },
    create: async () => { throw new Error("legacy create outside C1 fixture"); },
    update: async () => { throw new Error("legacy update outside C1 fixture"); },
    move: async () => { throw new Error("legacy move outside C1 fixture"); },
    trash: async () => { throw new Error("legacy trash outside C1 fixture"); },
  };

  readonly reliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_root: ManagedRemoteIdentity, intentId: any, path: VaultPath, intendedContent: any) => ({
      ok: true as const,
      value: { kind: "reserved-file-create" as const, intentId, reservedRemoteObjectId: rid(`candidate:${++this.remoteCounter}:${String(path)}`), path, intendedContent },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder create outside C1 fixture"); },
    createReserved: async (identity: any, content?: BinaryContentSource) => {
      if (identity.kind !== "reserved-file-create" || !content) return { status: "outcome-unknown" as const, reason: "invalid create fixture call" };
      const text = await textOf(content);
      this.createCalls.push(String(identity.path));
      this.remoteFiles.set(String(identity.path), { path: identity.path, text, evidence: evidence(text, `r${++this.remoteCounter}`), remoteObjectId: identity.reservedRemoteObjectId });
      return { status: "verified-effect" as const, applicationProof: { kind: "reserved-create" as const, remoteObjectId: identity.reservedRemoteObjectId, path: identity.path, verifiedContent: identity.intendedContent } };
    },
    updateExisting: async (identity: any, content: BinaryContentSource) => {
      const predecessor = this.remoteFiles.get(String(identity.path));
      if (!predecessor || predecessor.remoteObjectId !== identity.remoteObjectId || predecessor.evidence.revision !== String(identity.expectedRevision)) return { status: "verified-not-applied" as const, reason: "predecessor authority changed" };
      const text = await textOf(content);
      this.updateCalls.push(String(identity.path));
      this.preserved.set(String(predecessor.remoteObjectId), predecessor);
      this.remoteFiles.set(String(identity.path), { path: identity.path, text, evidence: evidence(text, `r${++this.remoteCounter}`), remoteObjectId: identity.candidateRemoteObjectId });
      return {
        status: "verified-effect" as const,
        applicationProof: {
          kind: "immutable-candidate-preservation" as const,
          candidateRemoteObjectId: identity.candidateRemoteObjectId,
          predecessorRemoteObjectId: identity.remoteObjectId,
          predecessorRevision: identity.expectedRevision,
          intendedContent: identity.intendedContent,
          verifiedContent: identity.intendedContent,
          preservedRemoteObjectIds: [identity.remoteObjectId, identity.candidateRemoteObjectId],
        },
      };
    },
    moveExisting: async () => { throw new Error("move outside C1 fixture"); },
    trashExisting: async () => { throw new Error("trash outside C1 fixture"); },
  } as never;

  readonly localTransactionalMutationPort = {
    stageAndVerify: async (transaction: LocalMutationTransaction, content: BinaryContentSource) => {
      const text = await textOf(content);
      this.staged.set(String(transaction.transactionId), text);
      return { status: "staged-verified" as const, transaction: { ...transaction, stage: "staged-verified" } as LocalMutationTransaction };
    },
    commitVerifiedStage: async (transaction: LocalMutationTransaction) => {
      const text = this.staged.get(String(transaction.transactionId));
      if (text === undefined) return { status: "outcome-unknown" as const, reason: "missing staged content", transaction };
      this.localReplaceCalls.push(String(transaction.path));
      this.setLocal(transaction.path, text);
      this.staged.delete(String(transaction.transactionId));
      return { status: "committed" as const, transaction: { ...transaction, stage: "completed" } as LocalMutationTransaction, resultingObservationToken: this.localFiles.get(String(transaction.path))!.token };
    },
    recover: async (transaction: LocalMutationTransaction) => ({ status: "blocked" as const, reason: "no interrupted local transaction in fixture", transaction }),
  } as never;
}

type FirstSyncLifecycle = { firstSyncCompleted: boolean; recoveryInProgress: boolean };
type Harness = {
  boundary: Boundary;
  store: SynchronizationStateAuthorityAdapter;
  context: StateLoadContext;
  controller: ProductController;
  vault: any;
  device: any;
  lifecycle: FirstSyncLifecycle;
  stateLoads: string[];
};

async function harness(options: {
  base?: { path: string; text: string; remoteObjectId: string };
  local?: readonly [string, string][];
  remote?: readonly [string, string, string][];
  lifecycle?: Partial<FirstSyncLifecycle>;
} = {}): Promise<Harness> {
  const vault = id<"VaultIdentity">("vault:a03:c1");
  const device = id<"DeviceIdentity">("device:a03:c1");
  const identity: ManagedRemoteIdentity = { rootId: rid("root:a03:c1"), vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
  const boundary = new Boundary(identity);
  for (const [path, text] of options.local ?? []) boundary.setLocal(vp(path), text);
  for (const [path, text, remoteObjectId] of options.remote ?? []) boundary.setRemote(vp(path), text, rid(remoteObjectId));
  const semanticGeneration = gen("semantic:a03:c1");
  const initial = createInitialAuthorityState({ persistenceRevision: prev("persistence:a03:c1"), semanticGeneration, vaultIdentity: vault, deviceIdentity: device });
  const basePath = options.base?.path ? vp(options.base.path) : undefined;
  const baseRemoteId = options.base?.remoteObjectId ? rid(options.base.remoteObjectId) : undefined;
  const baseFingerprint = basePath ? id<"BaseFingerprint">(`base:a03:${String(basePath)}`) : undefined;
  const seeded: DurableSynchronizationAuthorityState = options.base && basePath && baseRemoteId && baseFingerprint
    ? {
      ...initial,
      base: [{ path: basePath, entityKind: "file", localExisted: true, remoteExisted: true, content: evidence(options.base.text), remoteObjectId: baseRemoteId }],
      remoteMappings: [{ path: basePath, entityKind: "file", remoteObjectId: baseRemoteId }],
      baseAuthority: [{ path: basePath, fingerprint: baseFingerprint }],
      pathConvergence: [{ path: basePath, state: { status: "converged", generation: semanticGeneration, baseFingerprint } }],
    }
    : initial;
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  if (options.base) assert.equal((await rawStore.saveTrusted(seeded)).status, "saved");
  const store = new SynchronizationStateAuthorityAdapter(rawStore);
  const stateLoads: string[] = [];
  const originalLoad = store.load.bind(store);
  (store as any).load = async (loadContext: StateLoadContext) => {
    const loaded = await originalLoad(loadContext);
    stateLoads.push(loaded.status);
    return loaded;
  };
  const lifecycle: FirstSyncLifecycle = {
    firstSyncCompleted: Boolean(options.base),
    recoveryInProgress: false,
    ...options.lifecycle,
  };
  const context: StateLoadContext = {
    expectation: options.base ? "existing-pairing" : "new-installation",
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const assembler = new ProductSnapshotAssembler(boundary.local as never, boundary.drive as never, store, context, async () => identity);
  const versions = new ProductTextVersionStore(new MemoryTextVersionPersistence(), boundary.local as never, boundary.drive as never);
  const conflicts = new ThreeWayConflictResolver(versions, versions, device);
  let controller!: ProductController;
  const executor = new ProductSynchronizationExecutor(boundary.local as never, boundary.drive as never, store, context, () => controller.currentRunEvidence(), versions);
  controller = new ProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: assembler,
    executor,
    reliableRemoteMutationPort: boundary.reliableRemoteMutationPort,
    localTransactionalMutationPort: boundary.localTransactionalMutationPort,
    conflictResolver: conflicts,
    plannerForTrigger: trigger => new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger })),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100),
    holderId: "a03-c1",
    firstSyncActive: () => !lifecycle.firstSyncCompleted && !lifecycle.recoveryInProgress,
    recoveryActive: () => lifecycle.recoveryInProgress,
  });
  return { boundary, store, context, controller, vault, device, lifecycle, stateLoads };
}

async function registerAndExecuteFirstSyncConflict(h: Harness, path = "collision.bin") {
  const plan = await h.controller.previewManual();
  assert.ok(plan);
  const conflict = plan.operations.find(operation => operation.kind === "unresolved-conflict" && String(operation.path) === path);
  assert.ok(conflict);
  const before = await h.store.load(h.context);
  assert.equal(before.status, "uninitialized");
  assert.equal((await h.controller.request({ kind: "execute-plan", planId: plan.planId })).status, "accepted");
  const assessment = h.controller.currentSurface().conflicts.find(value => "conflictId" in value && String(value.path) === path);
  assert.ok(assessment && "conflictId" in assessment);
  return assessment.conflictId;
}

test("C1 reviewed first-sync Keep local crosses only the unresolved-path authority boundary and commits authority after verified mutation", async () => {
  const h = await harness({
    local: [["collision.bin", "LOCAL"], ["safe-local.bin", "SAFE"]],
    remote: [["collision.bin", "REMOTE", "remote:collision"]],
  });
  const conflictId = await registerAndExecuteFirstSyncConflict(h);
  const afterSafeWork = await h.store.load(h.context);
  assert.equal(afterSafeWork.status, "trusted");
  if (afterSafeWork.status === "trusted") {
    assert.equal(afterSafeWork.state.base.some(entry => String(entry.path) === "safe-local.bin"), true, "safe first-sync work establishes authority elsewhere");
    assert.equal(afterSafeWork.state.base.some(entry => String(entry.path) === "collision.bin"), false);
    assert.equal(afterSafeWork.state.remoteMappings.some(entry => String(entry.path) === "collision.bin"), false);
  }
  const originalRemote = h.boundary.remoteFiles.get("collision.bin")!;
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "accepted", result.status === "rejected" ? result.reason : undefined);
  assert.deepEqual(h.boundary.updateCalls, ["collision.bin"]);
  assert.equal(h.boundary.remoteFiles.get("collision.bin")?.text, "LOCAL");
  assert.equal(h.boundary.preserved.get(String(originalRemote.remoteObjectId))?.text, "REMOTE", "immutable predecessor identity remains preserved");
  assert.equal(h.boundary.preserved.get(String(originalRemote.remoteObjectId))?.evidence.revision, originalRemote.evidence.revision);
  const committed = await h.store.load(h.context);
  assert.equal(committed.status, "trusted");
  if (committed.status === "trusted") {
    assert.equal(committed.state.base.some(entry => String(entry.path) === "collision.bin" && entry.content?.hash === sha256Text("LOCAL")), true);
    assert.equal(committed.state.remoteMappings.some(entry => String(entry.path) === "collision.bin"), true);
  }
  const next = await h.controller.previewManual();
  assert.ok(next);
  assert.equal(next.operations.find(operation => String(operation.path) === "collision.bin")?.kind, "noop");
  assert.equal(next.operations.some(operation => operation.kind === "blocked-unsafe" && String(operation.path) === "collision.bin"), false);
  assert.equal(h.controller.currentSurface().conflicts.some(value => "conflictId" in value && value.conflictId === conflictId), false, "conflict is removed only after authoritative completion");
});

test("C1 portable app.json Keep local leaves one planner-visible candidate and a clean subsequent plan", async () => {
  const path = "__brain_sync_portable_config__/app.json";
  const h = await harness({ local: [[path, "LOCAL-PORTABLE"]], remote: [[path, "REMOTE-PORTABLE", "remote:portable-app-predecessor"]] });
  const conflictId = await registerAndExecuteFirstSyncConflict(h, path);
  const predecessor = h.boundary.remoteFiles.get(path)!;
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "accepted", result.status === "rejected" ? result.reason : undefined);
  const listing = await h.boundary.drive.listForReconciliation();
  assert.equal(listing.value.entries.filter(entry => String(entry.path) === path).length, 1);
  assert.equal(h.boundary.preserved.get(String(predecessor.remoteObjectId))?.text, "REMOTE-PORTABLE");
  const committed = await h.store.load(h.context);
  assert.equal(committed.status, "trusted");
  if (committed.status === "trusted") {
    const mapping = committed.state.remoteMappings.find(entry => String(entry.path) === path);
    const base = committed.state.base.find(entry => String(entry.path) === path);
    assert.equal(mapping?.remoteObjectId, h.boundary.remoteFiles.get(path)?.remoteObjectId);
    assert.equal(base?.content?.hash, sha256Text("LOCAL-PORTABLE"));
  }
  const next = await h.controller.previewManual();
  assert.ok(next);
  assert.equal(next.operations.find(operation => String(operation.path) === path)?.kind, "noop");
  assert.equal(next.operations.some(operation => operation.kind === "blocked-unsafe" && String(operation.path) === path), false);
});

test("C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation", async () => {
  const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
  const conflictId = await registerAndExecuteFirstSyncConflict(h);
  h.boundary.setLocal(vp("collision.bin"), "LOCAL-CHANGED");
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "rejected");
  assert.deepEqual(h.boundary.updateCalls, []);
  assert.equal(h.boundary.remoteFiles.get("collision.bin")?.text, "REMOTE");
});

test("C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation", async t => {
  for (const variant of ["revision", "identity"] as const) {
    await t.test(variant, async () => {
      const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
      const conflictId = await registerAndExecuteFirstSyncConflict(h);
      h.boundary.changeRemote(vp("collision.bin"), variant === "revision" ? "REMOTE-CHANGED" : "REMOTE", variant === "identity" ? rid("remote:replacement") : undefined);
      const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-local" } });
      assert.equal(result.status, "rejected");
      assert.deepEqual(h.boundary.updateCalls, []);
    });
  }
});

test("C1 ambiguous duplicate REMOTE identity fails closed before reviewed first-sync mutation", async () => {
  const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
  const conflictId = await registerAndExecuteFirstSyncConflict(h);
  h.boundary.addDuplicate(vp("collision.bin"), "OTHER", rid("remote:duplicate"));
  const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "rejected");
  assert.deepEqual(h.boundary.updateCalls, []);
  assert.equal(h.boundary.remoteFiles.get("collision.bin")?.text, "REMOTE");
});

test("C1 symmetric no-BASE Keep remote and Keep both resolutions use the bounded reviewed-conflict authority model", async t => {
  await t.test("keep-remote", async () => {
    const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
    const conflictId = await registerAndExecuteFirstSyncConflict(h);
    const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-remote" } });
    assert.equal(result.status, "accepted", result.status === "rejected" ? result.reason : undefined);
    assert.equal(h.boundary.localFiles.get("collision.bin")?.text, "REMOTE");
    assert.deepEqual(h.boundary.localReplaceCalls, ["collision.bin"]);
  });
  await t.test("keep-both", async () => {
    const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
    const conflictId = await registerAndExecuteFirstSyncConflict(h);
    const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-both" } });
    assert.equal(result.status, "accepted", result.status === "rejected" ? result.reason : undefined);
    assert.equal(h.boundary.remoteFiles.get("collision.bin")?.text, "LOCAL");
    assert.equal([...h.boundary.localFiles.values()].some(file => file.text === "REMOTE"), true, "REMOTE alternate survives as the deterministic conflict copy");
  });
});

test("C1 manual exact-current-local first-sync resolution succeeds without preexisting path BASE", async () => {
  const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
  const conflictId = await registerAndExecuteFirstSyncConflict(h);
  const result = await h.controller.resolveWithCurrentLocal(conflictId);
  assert.equal(result.status, "accepted", result.status === "rejected" ? result.reason : undefined);
  assert.equal(h.boundary.remoteFiles.get("collision.bin")?.text, "LOCAL");
});

function resolutionPreconditions(path: VaultPath, remoteObjectId: RemoteObjectId): OperationPrecondition[] {
  return [
    { kind: "base-trusted" },
    { kind: "identity-unambiguous", path },
    { kind: "path-observation", side: "local", path, expected: "present", observationToken: "local-token" },
    { kind: "content-evidence", side: "local", path, expected: evidence("LOCAL") },
    { kind: "file-stable", path },
    { kind: "path-observation", side: "remote", path, expected: "present" },
    { kind: "remote-object", remoteObjectId, expectedRevision: "r1" },
    { kind: "content-evidence", side: "remote", path, expected: evidence("REMOTE", "r1") },
  ];
}

function updateOperation(reasonCode: string): any {
  const path = vp("authority.bin");
  const remoteObjectId = rid("remote:authority");
  return {
    operationId: id<"OperationId">(`op:${reasonCode}`),
    kind: "upload-update",
    path,
    targetSide: "remote",
    remoteObjectId,
    contentVersion: { path, entityKind: "file", content: evidence("LOCAL"), observationToken: id<"ObservationToken">("local-token") },
    destructive: false,
    preconditions: resolutionPreconditions(path, remoteObjectId),
    reasons: [{ code: reasonCode, summary: reasonCode }],
  };
}

test("C1 ordinary non-conflict upload-update without trusted BASE remains rejected", () => {
  const operation = updateOperation("ordinary-local-modification");
  const authority = createInitialAuthorityState({ persistenceRevision: prev("p:ordinary"), semanticGeneration: gen("g:ordinary"), vaultIdentity: id<"VaultIdentity">("v"), deviceIdentity: id<"DeviceIdentity">("d") });
  const result = resolveAuthorityCompleteOperation(operation, authority, []);
  assert.equal(result.status, "incomplete-authority");
});

test("C1 post-BASE conflict resolution retains the ordinary exact BASE plus mapping authority path", () => {
  const operation = updateOperation("user-keep-local");
  const authority = createInitialAuthorityState({ persistenceRevision: prev("p:post-base"), semanticGeneration: gen("g:post-base"), vaultIdentity: id<"VaultIdentity">("v2"), deviceIdentity: id<"DeviceIdentity">("d2") });
  const baseFingerprint = id<"BaseFingerprint">("base:post-base");
  const path = operation.path as VaultPath;
  const remoteObjectId = operation.remoteObjectId as RemoteObjectId;
  const trusted = {
    ...authority,
    pathConvergence: [{ path, state: { status: "converged" as const, generation: authority.semanticGeneration, baseFingerprint } }],
  };
  const result = resolveAuthorityCompleteOperation(trusted ? operation : operation, trusted, [{ path, entityKind: "file", remoteObjectId }]);
  assert.equal(result.status, "ready");
  if (result.status === "ready") {
    assert.equal(result.operation.preconditions.some(value => value.kind === "base-authority"), true);
    assert.equal(result.operation.preconditions.some(value => value.kind === "identity-authority"), true);
  }
});

test("C1 durable effect-verified retry recovers the reviewed first-sync update without replaying REMOTE mutation", async () => {
  const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
  const plan = await h.controller.previewManual();
  assert.ok(plan);
  await h.controller.request({ kind: "execute-plan", planId: plan.planId });
  const conflict = h.controller.currentSurface().conflicts.find(value => "conflictId" in value && String(value.path) === "collision.bin");
  assert.ok(conflict && "conflictId" in conflict);

  const assessment: any = conflict;
  const localVersion = assessment.preserved.local.version;
  const remoteVersion = assessment.preserved.remote.version;
  const planned = updateOperation("user-keep-local");
  planned.reasons = [...planned.reasons, { code: "reviewed-first-sync-resolution", summary: "reviewed first-sync resolution" }];
  planned.path = vp("collision.bin");
  planned.remoteObjectId = remoteVersion.remoteObjectId;
  planned.contentVersion = localVersion;
  planned.preconditions = [
    { kind: "base-trusted" },
    { kind: "identity-unambiguous", path: planned.path },
    { kind: "path-observation", side: "local", path: planned.path, expected: "present", observationToken: String(localVersion.observationToken) },
    { kind: "content-evidence", side: "local", path: planned.path, expected: localVersion.content },
    { kind: "file-stable", path: planned.path },
    { kind: "path-observation", side: "remote", path: planned.path, expected: "present" },
    { kind: "remote-object", remoteObjectId: remoteVersion.remoteObjectId, expectedRevision: remoteVersion.content.revision },
    { kind: "content-evidence", side: "remote", path: planned.path, expected: remoteVersion.content },
  ];
  const authority = await h.store.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") return;
  const canonical = await h.store.load(h.context);
  assert.equal(canonical.status, "trusted");
  if (canonical.status !== "trusted") return;
  const resolved = resolveAuthorityCompleteOperation(planned, authority.state, canonical.state.remoteMappings, true);
  assert.equal(resolved.status, "ready");
  if (resolved.status !== "ready") return;

  const executor = new ProductSynchronizationExecutor(h.boundary.local as never, h.boundary.drive as never, h.store, h.context, () => ({ managedRemote: h.boundary.identity } as never));
  const authoritative = createAuthoritativeProductExecutor(executor, h.store, h.store, h.context, h.boundary.identity, {
    reliableRemoteMutationPort: h.boundary.reliableRemoteMutationPort,
    localTransactionalMutationPort: h.boundary.localTransactionalMutationPort,
  });
  const first = await authoritative.execute(resolved.operation as ExecutablePlannedOperation);
  assert.equal(first.status, "durable-verified-success");
  assert.equal(h.boundary.updateCalls.length, 1);
  const second = await authoritative.execute(resolved.operation as ExecutablePlannedOperation);
  assert.equal(second.status, "durable-verified-success");
  assert.equal(h.boundary.updateCalls.length, 1, "matching durable intent recovery must not dispatch the REMOTE update twice");
});

test("C1 genuine first-sync multi-conflict provenance survives synthetic resolution subplans", async () => {
  const h = await harness({
    local: [["alpha.bin", "LOCAL-A"], ["beta.bin", "LOCAL-B"]],
    remote: [["alpha.bin", "REMOTE-A", "remote:alpha"], ["beta.bin", "REMOTE-B", "remote:beta"]],
  });
  const plan = await h.controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations.filter(operation => operation.kind === "unresolved-conflict").length, 2);
  assert.equal((await h.controller.request({ kind: "execute-plan", planId: plan.planId })).status, "accepted");

  const conflicts = h.controller.currentSurface().conflicts.filter((value): value is Exclude<typeof value, { kind: "none" | "clean-merge" }> => "conflictId" in value);
  const alpha = conflicts.find(value => String(value.path) === "alpha.bin");
  const beta = conflicts.find(value => String(value.path) === "beta.bin");
  assert.ok(alpha && beta);

  const first = await h.controller.request({ kind: "resolve-conflict", conflictId: alpha.conflictId, resolution: { kind: "keep-local" } });
  assert.equal(first.status, "accepted", first.status === "rejected" ? first.reason : undefined);
  const second = await h.controller.request({ kind: "resolve-conflict", conflictId: beta.conflictId, resolution: { kind: "keep-local" } });
  assert.equal(second.status, "accepted", second.status === "rejected" ? second.reason : undefined);
  assert.deepEqual(h.boundary.updateCalls, ["alpha.bin", "beta.bin"]);
});

test("C1 fresh trusted-state Verify/Reconcile retains first-sync provenance until durable first-sync completion", async () => {
  const h = await harness({
    local: [["collision.bin", "LOCAL"], ["safe-local.bin", "SAFE"]],
    remote: [["collision.bin", "REMOTE", "remote:collision"]],
  });
  assert.equal(h.lifecycle.firstSyncCompleted, false);
  assert.equal(h.lifecycle.recoveryInProgress, false);

  const initial = await h.controller.previewManual();
  assert.ok(initial);
  assert.equal((await h.controller.request({ kind: "execute-plan", planId: initial.planId })).status, "accepted");
  const afterSafeWork = await h.store.load(h.context);
  assert.equal(afterSafeWork.status, "trusted");
  if (afterSafeWork.status === "trusted") {
    assert.equal(afterSafeWork.state.base.some(entry => String(entry.path) === "safe-local.bin"), true);
    assert.equal(afterSafeWork.state.base.some(entry => String(entry.path) === "collision.bin"), false);
    assert.equal(afterSafeWork.state.remoteMappings.some(entry => String(entry.path) === "collision.bin"), false);
  }

  h.stateLoads.length = 0;
  const fresh = await h.controller.previewVerifyReconcile();
  assert.ok(fresh);
  assert.equal(h.stateLoads[0], "trusted", "fresh Verify/Reconcile must actually load the now-trusted persistent state");
  const conflict = h.controller.currentSurface().conflicts.find(value => "conflictId" in value && String(value.path) === "collision.bin");
  assert.ok(conflict && "conflictId" in conflict);
  const internal = h.controller as any;
  assert.equal(internal.reviewedFirstSyncConflictOrigins.get(String(conflict.conflictId)), true, "trusted state does not end the durable first-sync lifecycle");

  const result = await h.controller.request({ kind: "resolve-conflict", conflictId: conflict.conflictId, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "accepted", result.status === "rejected" ? result.reason : undefined);
  assert.deepEqual(h.boundary.updateCalls, ["collision.bin"]);
  const committed = await h.store.load(h.context);
  assert.equal(committed.status, "trusted");
  if (committed.status === "trusted") {
    assert.equal(committed.state.base.some(entry => String(entry.path) === "collision.bin" && entry.content?.hash === sha256Text("LOCAL")), true);
    assert.equal(committed.state.remoteMappings.some(entry => String(entry.path) === "collision.bin"), true);
  }
});

test("C1 completed first-sync lifecycle dynamically removes no-BASE bootstrap provenance on a fresh plan", async () => {
  const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
  const initial = await h.controller.previewManual();
  assert.ok(initial);
  assert.equal((await h.controller.request({ kind: "execute-plan", planId: initial.planId })).status, "accepted");
  const firstConflict = h.controller.currentSurface().conflicts.find(value => "conflictId" in value && String(value.path) === "collision.bin");
  assert.ok(firstConflict && "conflictId" in firstConflict);
  const internal = h.controller as any;
  assert.equal(internal.reviewedFirstSyncConflictOrigins.get(String(firstConflict.conflictId)), true);

  h.lifecycle.firstSyncCompleted = true;
  h.stateLoads.length = 0;
  const fresh = await h.controller.previewVerifyReconcile();
  assert.ok(fresh);
  assert.equal(h.stateLoads[0], "trusted");
  const freshConflict = h.controller.currentSurface().conflicts.find(value => "conflictId" in value && String(value.path) === "collision.bin");
  assert.ok(freshConflict && "conflictId" in freshConflict);
  assert.equal(internal.reviewedFirstSyncConflictOrigins.get(String(freshConflict.conflictId)), false, "fresh planning must observe lifecycle completion dynamically");

  const result = await h.controller.request({ kind: "resolve-conflict", conflictId: freshConflict.conflictId, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "rejected");
  assert.deepEqual(h.boundary.updateCalls, []);
});

test("C1 recovery and reconstruction remain ineligible for reviewed first-sync bootstrap provenance", async t => {
  await t.test("recovery-active lifecycle", async () => {
    const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
    const plan = await h.controller.previewManual();
    assert.ok(plan);
    const internal = h.controller as any;
    const conflict = h.controller.currentSurface().conflicts.find(value => "conflictId" in value && String(value.path) === "collision.bin");
    assert.ok(conflict && "conflictId" in conflict);
    h.lifecycle.recoveryInProgress = true;
    await internal.refreshConflicts(plan, internal.planned.assembly);
    assert.equal(internal.reviewedFirstSyncConflictOrigins.get(String(conflict.conflictId)), false);
  });

  await t.test("reconstruction assembly", async () => {
    const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
    const plan = await h.controller.previewManual();
    assert.ok(plan);
    const internal = h.controller as any;
    const conflict = h.controller.currentSurface().conflicts.find(value => "conflictId" in value && String(value.path) === "collision.bin");
    assert.ok(conflict && "conflictId" in conflict);
    assert.equal(h.lifecycle.firstSyncCompleted, false);
    assert.equal(h.lifecycle.recoveryInProgress, false);
    await internal.refreshConflicts(plan, { ...internal.planned.assembly, reconstruction: true });
    assert.equal(internal.reviewedFirstSyncConflictOrigins.get(String(conflict.conflictId)), false);
  });
});

test("C1 missing registered conflict-origin provenance fails closed", async () => {
  const h = await harness({ local: [["collision.bin", "LOCAL"]], remote: [["collision.bin", "REMOTE", "remote:collision"]] });
  const conflictId = await registerAndExecuteFirstSyncConflict(h);
  const internal = h.controller as any;
  internal.reviewedFirstSyncConflictOrigins.delete(String(conflictId));

  const result = await h.controller.request({ kind: "resolve-conflict", conflictId, resolution: { kind: "keep-local" } });
  assert.equal(result.status, "rejected");
  assert.deepEqual(h.boundary.updateCalls, []);
  const reasons = internal.planned?.plan.operations.flatMap((operation: any) => operation.reasons.map((reason: any) => reason.code)) ?? [];
  assert.equal(reasons.includes("reviewed-first-sync-resolution"), false);
});
