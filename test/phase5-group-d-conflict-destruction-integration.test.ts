import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ContentEvidence,
  LocalMutationTransaction,
  LocalTransactionalMutationPort,
  ManagedRemoteIdentity,
  ObservationToken,
  PersistenceRevision,
  ReliableRemoteMutationPort,
  RemoteObjectId,
  SemanticStateGeneration,
  StateLoadContext,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { IntegratedSynchronizationStateStore } from "../src/product/phase6-sync-integration";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../src/product/text-version-store";
import {
  createInitialAuthorityState,
  type DurableSynchronizationAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
} from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const gen = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const prev = (value: string) => id<"StateRevision">(value) as unknown as PersistenceRevision;
const ev = (text: string, revision?: string): ContentEvidence => ({
  hash: sha256Text(text),
  sizeBytes: new TextEncoder().encode(text).length,
  ...(revision ? { revision } : {}),
});
const src = (text: string): BinaryContentSource => ({
  sizeBytes: new TextEncoder().encode(text).length,
  async *openChunks() { yield new TextEncoder().encode(text); },
});
async function txt(s: BinaryContentSource): Promise<string> {
  let out = "";
  const d = new TextDecoder();
  for await (const c of s.openChunks()) out += d.decode(c, { stream: true });
  return out + d.decode();
}

interface LF { t: string; e: ContentEvidence; tok: ObservationToken }
interface RF { path: VaultPath; t: string; e: ContentEvidence; id: RemoteObjectId }

class Boundary {
  local = new Map<string, LF>();
  remote = new Map<string, RF>();
  localTrash: string[] = [];
  remoteTrash: string[] = [];
  localMoves: string[] = [];
  remoteMoves: string[] = [];
  private token = 0;
  private rev = 0;
  private readonly stagedLocalTransactions = new Map<string, { text: string; evidence: ContentEvidence }>();
  private readonly preservedRemotePredecessors = new Map<string, RF>();

  constructor(readonly identity: ManagedRemoteIdentity) {}

  setLocal(path: VaultPath, t: string) {
    this.local.set(String(path), {
      t,
      e: ev(t),
      tok: id<"ObservationToken">(`tok:${++this.token}`) as ObservationToken,
    });
  }

  setRemote(path: VaultPath, t: string, remoteObjectId = rid(`rid:${++this.rev}`)) {
    const f = { path, t, e: ev(t, `r${++this.rev}`), id: remoteObjectId };
    this.remote.set(String(path), f);
    return remoteObjectId;
  }

  readonly l = {
    activeConfigurationDirectory: async () => vp(".obsidian"),
    enumerate: async () => ({
      entries: [...this.local.entries()].map(([p, f]) => ({
        status: "present" as const,
        side: "local" as const,
        path: vp(p),
        entityKind: "file" as const,
        content: f.e,
        stability: "stable" as const,
        observationToken: f.tok,
      })),
      completeness: { status: "complete" as const },
    }),
    observe: async (p: VaultPath) => {
      const f = this.local.get(String(p));
      return f
        ? {
            status: "present" as const,
            side: "local" as const,
            path: p,
            entityKind: "file" as const,
            content: f.e,
            stability: "stable" as const,
            observationToken: f.tok,
          }
        : { status: "absent" as const, side: "local" as const, path: p };
    },
    readFile: async (p: VaultPath) => {
      const f = this.local.get(String(p));
      if (!f) throw new Error("missing");
      return { content: src(f.t), evidence: f.e, stability: "stable" as const, observationToken: f.tok };
    },
    createFile: async (p: VaultPath, s: BinaryContentSource) => {
      const t = await txt(s);
      this.setLocal(p, t);
      return { path: p, evidence: ev(t) };
    },
    replaceFile: async (p: VaultPath, s: BinaryContentSource) => {
      const t = await txt(s);
      this.setLocal(p, t);
      return { path: p, evidence: ev(t) };
    },
    createFolder: async (p: VaultPath) => ({ path: p }),
    move: async (a: VaultPath, z: VaultPath) => {
      const f = this.local.get(String(a));
      if (!f) throw new Error("missing");
      this.local.delete(String(a));
      this.local.set(String(z), f);
      this.localMoves.push(`${a}->${z}`);
      return { path: z, evidence: f.e };
    },
    trash: async (p: VaultPath) => {
      this.localTrash.push(String(p));
      this.local.delete(String(p));
      return { path: p };
    },
    validatePath: async (p: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(p) }),
    classifyConfiguration: async () => ({ classification: "unknown" as const, reason: "test" }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };

  readonly d = {
    authenticationState: async () => ({ status: "authenticated" as const }),
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: this.identity } }),
    getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:start") }),
    listForReconciliation: async () => ({
      ok: true as const,
      value: {
        entries: [...this.remote.values()].map(f => ({
          path: f.path,
          entityKind: "file" as const,
          remoteObjectId: f.id,
          content: f.e,
          trashed: false,
        })),
        completeness: { status: "complete" as const },
      },
    }),
    readChanges: async () => ({
      ok: true as const,
      value: {
        changes: [],
        nextCursor: id<"ChangeCursor">("cursor:next"),
        completeness: { status: "complete" as const },
      },
    }),
    observe: async (_r: RemoteObjectId, p: VaultPath) => {
      const f = this.remote.get(String(p));
      return f
        ? {
            ok: true as const,
            value: {
              status: "present" as const,
              side: "remote" as const,
              path: p,
              entityKind: "file" as const,
              remoteObjectId: f.id,
              content: f.e,
              stability: "stable" as const,
            },
          }
        : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path: p } };
    },
    download: async (remoteObjectId: RemoteObjectId) => {
      const f = [...this.remote.values(), ...this.preservedRemotePredecessors.values()]
        .find(x => x.id === remoteObjectId);
      if (!f) return { ok: false as const, signal: { kind: "not-found" as const, remoteObjectId } };
      return { ok: true as const, value: { remoteObjectId, content: src(f.t), evidence: f.e } };
    },
    create: async (_root: RemoteObjectId, req: any) => {
      const remoteObjectId = rid(`rid:${++this.rev}`);
      const t = req.content ? await txt(req.content) : "";
      this.remote.set(String(req.path), { path: req.path, t, e: ev(t, `r${++this.rev}`), id: remoteObjectId });
      return { ok: true as const, value: { remoteObjectId, path: req.path, evidence: ev(t) } };
    },
    update: async (req: any) => {
      const t = await txt(req.content);
      const f = { path: req.path, t, e: ev(t, `r${++this.rev}`), id: req.remoteObjectId };
      this.remote.set(String(req.path), f);
      return { ok: true as const, value: { remoteObjectId: f.id, path: f.path, evidence: f.e } };
    },
    move: async (remoteObjectId: RemoteObjectId, a: VaultPath, z: VaultPath) => {
      const f = this.remote.get(String(a));
      if (!f) return { ok: false as const, signal: { kind: "not-found" as const, remoteObjectId } };
      this.remote.delete(String(a));
      this.remote.set(String(z), { ...f, path: z });
      this.remoteMoves.push(`${a}->${z}`);
      return { ok: true as const, value: { remoteObjectId, path: z, evidence: f.e } };
    },
    trash: async (remoteObjectId: RemoteObjectId) => {
      this.remoteTrash.push(String(remoteObjectId));
      for (const [k, f] of this.remote) if (f.id === remoteObjectId) this.remote.delete(k);
      return { ok: true as const, value: undefined };
    },
  };

  readonly localTransactionalMutationPort: LocalTransactionalMutationPort = {
    stageAndVerify: async (transaction, content) => {
      const text = await txt(content);
      const evidence = ev(text);
      if (evidence.hash !== transaction.expectedNewEvidence.hash
        || evidence.sizeBytes !== transaction.expectedNewEvidence.sizeBytes) {
        return { status: "blocked", reason: "fixture staged bytes do not match intended content", transaction };
      }
      this.stagedLocalTransactions.set(String(transaction.transactionId), { text, evidence });
      return {
        status: "staged-verified",
        transaction: { ...transaction, stage: "staged-verified" } as LocalMutationTransaction,
      };
    },
    commitVerifiedStage: async transaction => {
      const staged = this.stagedLocalTransactions.get(String(transaction.transactionId));
      if (!staged) return { status: "outcome-unknown", reason: "fixture stage is missing", transaction };
      this.setLocal(transaction.path, staged.text);
      this.stagedLocalTransactions.delete(String(transaction.transactionId));
      const resulting = this.local.get(String(transaction.path));
      return {
        status: "committed",
        transaction: { ...transaction, stage: "completed" } as LocalMutationTransaction,
        ...(resulting ? { resultingObservationToken: resulting.tok } : {}),
      };
    },
    recover: async transaction => ({
      status: "blocked",
      reason: "fixture has no interrupted local transaction",
      transaction,
    }),
  };

  readonly reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_root, intentId, path, intendedContent) => ({
      ok: true,
      value: {
        kind: "reserved-file-create",
        intentId,
        reservedRemoteObjectId: rid(`rid:reserved:${++this.rev}`),
        path,
        intendedContent,
      },
    }),
    reserveFolderCreateIdentity: async (_root, intentId, path) => ({
      ok: true,
      value: {
        kind: "reserved-folder-create",
        intentId,
        reservedRemoteObjectId: rid(`rid:reserved-folder:${++this.rev}`),
        path,
      },
    }),
    createReserved: async (identity, content) => {
      if (identity.kind === "reserved-folder-create") {
        return {
          status: "verified-effect",
          applicationProof: { kind: "reserved-create", remoteObjectId: identity.reservedRemoteObjectId, path: identity.path },
        };
      }
      if (!content) return { status: "outcome-unknown", reason: "fixture reserved file create requires content" };
      const text = await txt(content);
      const actual = ev(text);
      if (actual.hash !== identity.intendedContent.hash || actual.sizeBytes !== identity.intendedContent.sizeBytes) {
        return { status: "verified-not-applied", reason: "fixture create content does not match reserved identity" };
      }
      const next: RF = {
        path: identity.path,
        t: text,
        e: ev(text, `r${++this.rev}`),
        id: identity.reservedRemoteObjectId,
      };
      this.remote.set(String(identity.path), next);
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "reserved-create",
          remoteObjectId: identity.reservedRemoteObjectId,
          path: identity.path,
          verifiedContent: identity.intendedContent,
        },
      };
    },
    updateExisting: async (identity, content) => {
      const predecessor = this.remote.get(String(identity.path));
      if (!predecessor
        || predecessor.id !== identity.remoteObjectId
        || predecessor.e.revision !== String(identity.expectedRevision)) {
        return { status: "verified-not-applied", reason: "fixture predecessor authority changed before update" };
      }
      const text = await txt(content);
      const actual = ev(text);
      if (actual.hash !== identity.intendedContent.hash || actual.sizeBytes !== identity.intendedContent.sizeBytes) {
        return { status: "verified-not-applied", reason: "fixture update content does not match intended identity" };
      }
      this.preservedRemotePredecessors.set(String(predecessor.id), predecessor);
      const candidate: RF = {
        path: identity.path,
        t: text,
        e: ev(text, `r${++this.rev}`),
        id: identity.candidateRemoteObjectId,
      };
      this.remote.set(String(identity.path), candidate);
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
    moveExisting: async identity => {
      const current = this.remote.get(String(identity.fromPath));
      if (!current || current.id !== identity.remoteObjectId) {
        return { status: "verified-not-applied", reason: "fixture move source no longer matches durable identity" };
      }
      this.remote.delete(String(identity.fromPath));
      this.remote.set(String(identity.toPath), { ...current, path: identity.toPath });
      this.remoteMoves.push(`${identity.fromPath}->${identity.toPath}`);
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "identity-preserving-move",
          remoteObjectId: identity.remoteObjectId,
          fromPath: identity.fromPath,
          toPath: identity.toPath,
        },
      };
    },
    trashExisting: async identity => {
      this.remoteTrash.push(String(identity.remoteObjectId));
      for (const [key, current] of this.remote) {
        if (current.id === identity.remoteObjectId) this.remote.delete(key);
      }
      return {
        status: "verified-effect",
        applicationProof: {
          kind: "trash",
          remoteObjectId: identity.remoteObjectId,
          path: identity.path,
          trashed: true,
        },
      };
    },
  };
}

function state(
  vault: any,
  device: any,
  entries: Array<{ path: VaultPath; text: string; remoteObjectId: RemoteObjectId }>,
  stale = false,
): DurableSynchronizationAuthorityState {
  const semanticGeneration = gen("semantic:g2:conflict:0");
  const s = createInitialAuthorityState({
    persistenceRevision: prev("persistence:g2:conflict:0"),
    semanticGeneration,
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  const baseAuthority = entries.map(x => ({
    path: x.path,
    fingerprint: id<"BaseFingerprint">(`base:g2:conflict:${String(x.path)}`),
  }));
  return {
    ...s,
    base: entries.map(x => ({
      path: x.path,
      entityKind: "file" as const,
      localExisted: true,
      remoteExisted: true,
      content: ev(x.text),
      remoteObjectId: x.remoteObjectId,
    })),
    remoteMappings: entries.map(x => ({
      path: x.path,
      entityKind: "file" as const,
      remoteObjectId: x.remoteObjectId,
    })),
    baseAuthority,
    pathConvergence: baseAuthority.map(x => ({
      path: x.path,
      state: {
        status: "converged" as const,
        generation: semanticGeneration,
        baseFingerprint: x.fingerprint,
      },
    })),
    knownDevices: [{ deviceId: device, stale }],
    changeCursor: id<"ChangeCursor">("cursor:0"),
  };
}

async function make(
  entries: Array<{ path: VaultPath; base: string; rid: RemoteObjectId }>,
  local: Array<{ path: VaultPath; t: string }>,
  remote: Array<{ path: VaultPath; t: string; rid: RemoteObjectId }>,
  opts: { stale?: boolean } = {},
) {
  const vault = id<"VaultIdentity">("vault:g2");
  const device = id<"DeviceIdentity">("device:g2");
  const identity: ManagedRemoteIdentity = {
    rootId: rid("root:g2"),
    vaultIdentity: vault,
    protocolVersion: id<"ProtocolVersion">("1"),
  };
  const b = new Boundary(identity);
  for (const x of local) b.setLocal(x.path, x.t);
  for (const x of remote) b.setRemote(x.path, x.t, x.rid);

  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const st = state(
    vault,
    device,
    entries.map(x => ({ path: x.path, text: x.base, remoteObjectId: x.rid })),
    opts.stale,
  );
  await rawStore.saveTrusted(st);
  const store = new IntegratedSynchronizationStateStore(rawStore);
  const context: StateLoadContext = {
    expectation: "existing-pairing",
    expectedVaultIdentity: vault,
    expectedDeviceIdentity: device,
  };
  const assembler = new ProductSnapshotAssembler(
    b.l as never,
    b.d as never,
    store,
    context,
    async () => identity,
    () => true,
    () => false,
  );
  const vpersist = new MemoryTextVersionPersistence();
  for (const x of entries) await vpersist.put({
    path: x.path,
    content: x.base,
    evidence: ev(x.base),
    recordedAt: "2020-01-01T00:00:00.000Z",
  });
  const versions = new ProductTextVersionStore(vpersist);
  const conflicts = new ThreeWayConflictResolver({
    readText: async v => {
      if (v.source === "base") return versions.read(v.path, v.evidence);
      if (v.source === "local") {
        const f = b.local.get(String(v.path));
        return f?.t;
      }
      if (v.source === "remote" && v.remoteObjectId) {
        const r = await b.d.download(v.remoteObjectId);
        return r.ok ? txt(r.value.content) : undefined;
      }
      return undefined;
    },
  });

  let controller!: IntegratedProductController;
  const executor = new ProductSynchronizationExecutor(
    b.l as never,
    b.d as never,
    store,
    context,
    () => controller.currentRunEvidence(),
    versions,
  );
  controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    authorityStore: store,
    snapshotAssembler: assembler,
    executor,
    reliableRemoteMutationPort: b.reliableRemoteMutationPort,
    localTransactionalMutationPort: b.localTransactionalMutationPort,
    conflictResolver: conflicts,
    plannerForTrigger: trigger => new ProductionSynchronizationPlanner(
      new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger }),
    ),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100),
    holderId: "g2",
  });
  return { b, store, context, controller };
}

test("G2 scenario 10 clean three-way text merge executes through controller and commits merged authority", async () => {
  const path = vp("merge.md"), r = rid("rid:merge");
  const { b, controller } = await make(
    [{ path, base: "a\nb\nc\n", rid: r }],
    [{ path, t: "a\nLOCAL\nc\n" }],
    [{ path, t: "a\nb\nREMOTE\n", rid: r }],
  );
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0]?.kind, "clean-text-merge");
  assert.equal((await controller.request({ kind: "execute-plan", planId: plan.planId })).status, "accepted");
  assert.equal(b.local.get("merge.md")?.t, "a\nLOCAL\nREMOTE\n");
  assert.equal(b.remote.get("merge.md")?.t, "a\nLOCAL\nREMOTE\n");
});

test("G2 scenario 11 true text conflict preserves complete local and remote alternates without mutation", async () => {
  const path = vp("conflict.md"), r = rid("rid:conflict");
  const { b, controller } = await make(
    [{ path, base: "base\n", rid: r }],
    [{ path, t: "local\n" }],
    [{ path, t: "remote\n", rid: r }],
  );
  const beforeLocal = b.local.get("conflict.md")?.t, beforeRemote = b.remote.get("conflict.md")?.t;
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0]?.kind, "unresolved-conflict");
  assert.deepEqual(new Set(plan.operations[0]?.preservedVersions?.map(x => x.source)), new Set(["local", "remote"]));
  assert.equal(b.local.get("conflict.md")?.t, beforeLocal);
  assert.equal(b.remote.get("conflict.md")?.t, beforeRemote);
});

test("G2 scenario 12 binary conflict preserves both complete opaque versions", async () => {
  const path = vp("image.bin"), r = rid("rid:bin");
  const { b, controller } = await make(
    [{ path, base: "base-bytes", rid: r }],
    [{ path, t: "local-bytes" }],
    [{ path, t: "remote-bytes", rid: r }],
  );
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations[0]?.kind, "unresolved-conflict");
  assert.equal(plan.operations[0]?.preservedVersions?.length, 2);
  assert.equal(b.local.get("image.bin")?.t, "local-bytes");
  assert.equal(b.remote.get("image.bin")?.t, "remote-bytes");
});

test("G2 scenario 14 stable Drive identity produces and executes an identity-preserving remote move", async () => {
  const oldp = vp("old.md"), newp = vp("new.md"), r = rid("rid:move");
  const { b, controller } = await make(
    [{ path: oldp, base: "same", rid: r }],
    [{ path: oldp, t: "same" }],
    [{ path: newp, t: "same", rid: r }],
  );
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.ok(plan.operations.some(x => x.kind === "identity-preserving-move" && String(x.path) === "new.md"));
  assert.equal((await controller.request({ kind: "execute-plan", planId: plan.planId })).status, "accepted");
  assert.equal(b.local.has("old.md"), false);
  assert.equal(b.local.get("new.md")?.t, "same");
  assert.equal(b.remote.get("new.md")?.id, r);
});

test("G2 scenarios 15/18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction", async () => {
  const entries = Array.from({ length: 6 }, (_, i) => ({
    path: vp(`d${i}.md`),
    base: `${i}`,
    rid: rid(`rid:d${i}`),
  }));
  const { b, controller } = await make(entries, [], []);
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations.length, 6);
  assert.ok(plan.operations.every(x => x.kind === "trash-remote"));
  assert.equal(plan.recoveryCheckpointRequired, true);
  const rejected = await controller.request({ kind: "execute-plan", planId: plan.planId });
  assert.equal(rejected.status, "rejected");
  const checkpoint = await controller.request({ kind: "create-recovery-checkpoint", planId: plan.planId });
  assert.equal(checkpoint.status, "accepted");
  const wrong = await controller.request({
    kind: "approve-destructive-plan",
    planId: plan.planId,
    checkpointId: id<"RecoveryCheckpointId">("checkpoint:wrong"),
  });
  assert.equal(wrong.status, "rejected");
  assert.ok("checkpointId" in checkpoint);
  const approved = await controller.request({
    kind: "approve-destructive-plan",
    planId: plan.planId,
    checkpointId: checkpoint.checkpointId!,
  });
  assert.equal(approved.status, "accepted");
  assert.equal(b.remoteTrash.length, 6);
});

test("G2 scenario 16 delete-vs-modify is a conflict and the independently modified remote survives", async () => {
  const path = vp("keep.md"), r = rid("rid:keep");
  const { b, controller } = await make(
    [{ path, base: "base", rid: r }],
    [],
    [{ path, t: "remote-change", rid: r }],
  );
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.operations[0]?.kind, "unresolved-conflict");
  assert.equal(b.remote.get("keep.md")?.t, "remote-change");
  assert.equal(b.remoteTrash.length, 0);
});

test("G2 scenario 17 bulk destruction is circuit-broken before mutation", async () => {
  const entries = Array.from({ length: 10 }, (_, i) => ({
    path: vp(`x${i}.md`),
    base: `${i}`,
    rid: rid(`rid:x${i}`),
  }));
  const { b, controller } = await make(entries, [], []);
  const plan = await controller.previewManual();
  assert.ok(plan);
  assert.equal(plan.recoveryCheckpointRequired, true);
  assert.equal(plan.executionDisposition, "requires-user-approval");
  const result = await controller.request({ kind: "execute-plan", planId: plan.planId });
  assert.equal(result.status, "rejected");
  assert.equal(controller.currentStatus().state, "destructive-plan-blocked");
  assert.equal(b.remoteTrash.length + b.localTrash.length, 0);
});
