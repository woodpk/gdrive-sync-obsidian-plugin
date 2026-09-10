import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  DeviceIdentity,
  ManagedRemoteIdentity,
  ObservationToken,
  PersistenceRevision,
  PlannedOperation,
  ReliableRemoteMutationPort,
  RemoteObjectId,
  SemanticStateGeneration,
  StateLoadContext,
  SynchronizationPlan,
  VaultIdentity,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { ProductController } from "../src/product/product-controller";
import { SynchronizationStateAuthorityAdapter } from "../src/product/synchronization-adapters";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { SyncAttentionLedger, type SyncAttentionPersistence, type SyncAttentionRecord } from "../src/product/sync-attention-ledger";
import { DiagnosticLogger, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { createInitialAuthorityState, createInitialTrustedState, MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const token = (value: string) => id<"ObservationToken">(value) as ObservationToken;
const vault = id<"VaultIdentity">("vault:full-remediation") as VaultIdentity;
const device = id<"DeviceIdentity">("device:full-remediation") as DeviceIdentity;
const root = id<"RemoteObjectId">("root:full-remediation") as RemoteObjectId;
const remoteFile = id<"RemoteObjectId">("remote:full-remediation") as RemoteObjectId;
const managed: ManagedRemoteIdentity = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const evidence = (value: string): ContentEvidence => ({ hash: sha256Text(value), sizeBytes: new TextEncoder().encode(value).byteLength });
const source = (value: string): BinaryContentSource => ({ sizeBytes: new TextEncoder().encode(value).byteLength, async *openChunks() { yield new TextEncoder().encode(value); } });

function upload(path: string, operationId = path): PlannedOperation {
  const target = vp(path);
  return {
    operationId: id<"OperationId">(`op:${operationId}`), kind: "upload-create", path: target, targetSide: "remote", destructive: false,
    contentVersion: { path: target, entityKind: "file", content: evidence(path), observationToken: token(`token:${path}`) },
    preconditions: [], reasons: [{ code: "safe-upload", summary: "Independent safe upload." }],
  };
}

function staleUpload(path: string): PlannedOperation {
  const target = vp(path);
  return {
    operationId: id<"OperationId">(`op:stale:${path}`), kind: "upload-update", path: target, targetSide: "remote", remoteObjectId: remoteFile, destructive: false,
    contentVersion: { path: target, entityKind: "file", content: evidence("planned"), observationToken: token(`planned:${path}`), remoteObjectId: remoteFile },
    preconditions: [
      { kind: "path-observation", side: "local", path: target, expected: "present", observationToken: `planned:${path}` },
      { kind: "content-evidence", side: "local", path: target, expected: evidence("planned") },
      { kind: "file-stable", path: target },
    ],
    reasons: [{ code: "local-only-change", summary: "Upload the planned local version." }],
  };
}

function automaticPlan(operations: readonly PlannedOperation[]): SynchronizationPlan {
  return {
    planId: id<"PlanId">(`plan:${operations.map(operation => String(operation.operationId)).join(":")}`),
    trigger: "local-change", operations, executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false, globalExecutionGate: "none",
  };
}

class MemoryAttentionPersistence implements SyncAttentionPersistence {
  records: SyncAttentionRecord[] = [];
  async loadSyncAttention(): Promise<readonly SyncAttentionRecord[]> { return this.records.map(record => ({ ...record })); }
  async saveSyncAttention(records: readonly SyncAttentionRecord[]): Promise<void> { this.records = records.map(record => ({ ...record })); }
}

type StaleMode = { readonly operationId: PlannedOperation["operationId"]; readonly phase: "first-validation" | "execution-revalidation" } | undefined;

async function controllerHarness(planOrPlans: SynchronizationPlan | readonly SynchronizationPlan[], staleMode?: StaleMode) {
  const plans = Array.isArray(planOrPlans) ? planOrPlans : [planOrPlans];
  const allOperations = plans.flatMap(plan => plan.operations);
  const staleOperation = allOperations.find(operation => operation.operationId === staleMode?.operationId);
  const generation = id<"SemanticStateGeneration">("semantic:remediation:0") as SemanticStateGeneration;
  const initial = createInitialAuthorityState({
    persistenceRevision: id<"StateRevision">("persistence:remediation:0") as unknown as PersistenceRevision,
    semanticGeneration: generation,
    vaultIdentity: vault,
    deviceIdentity: device,
  });
  const oldCursor = id<"ChangeCursor">("cursor:old") as ChangeCursor;
  const stalePath = staleOperation?.path;
  const fingerprint = stalePath ? id<"BaseFingerprint">(`base:${String(stalePath)}`) : undefined;
  const seeded = stalePath && fingerprint ? {
    ...initial,
    changeCursor: oldCursor,
    base: [{ path: stalePath, entityKind: "file" as const, localExisted: true, remoteExisted: true, content: evidence("planned"), remoteObjectId: remoteFile }],
    remoteMappings: [{ path: stalePath, entityKind: "file" as const, remoteObjectId: remoteFile }],
    baseAuthority: [{ path: stalePath, fingerprint }],
    pathConvergence: [{ path: stalePath, state: { status: "converged" as const, generation, baseFingerprint: fingerprint } }],
  } : { ...initial, changeCursor: oldCursor };
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  assert.equal((await rawStore.saveTrusted(seeded)).status, "saved");
  const store = new SynchronizationStateAuthorityAdapter(rawStore);

  const persistence = new MemoryAttentionPersistence();
  const ledger = new SyncAttentionLedger(persistence, 20);
  let diagnosticState: DiagnosticStoreState | undefined;
  const diagnostics = new DiagnosticLogger({
    persistence: { loadDiagnostics: async () => diagnosticState, saveDiagnostics: async state => { diagnosticState = state; } },
    level: "trace", retentionLimit: 500, consoleMirror: false, platform: "mobile",
  });
  await diagnostics.initialize();

  const localTexts = new Map<string, string>();
  for (const operation of allOperations) {
    if (operation.kind === "upload-create") localTexts.set(String(operation.path), String(operation.path));
    if (operation.operationId === staleMode?.operationId) localTexts.set(String(operation.path), "planned");
  }
  const observationCounts = new Map<string, number>();
  const executed: PlannedOperation[] = [];
  const attempted = new Set<string>();
  const local = {
    observe: async (path: VaultPath) => {
      const text = localTexts.get(String(path));
      if (text === undefined) return { status: "absent" as const, side: "local" as const, path };
      const count = (observationCounts.get(String(path)) ?? 0) + 1;
      observationCounts.set(String(path), count);
      const operation = allOperations.find(candidate => candidate.path === path && candidate.operationId === staleMode?.operationId);
      const staleNow = Boolean(operation) && (staleMode?.phase === "first-validation" ? count >= 1 : count >= 2);
      if (staleNow && staleMode?.phase === "execution-revalidation" && !attempted.has(String(operation!.operationId))) {
        attempted.add(String(operation!.operationId));
        executed.push(operation!);
      }
      const actualText = text;
      const actualToken = staleNow ? token(`changed:${String(path)}`) : token(`planned:${String(path)}`);
      return { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content: evidence(actualText), stability: "stable" as const, observationToken: actualToken };
    },
    readFile: async (path: VaultPath) => {
      const text = localTexts.get(String(path));
      if (text === undefined) throw new Error(`missing local ${String(path)}`);
      const operation = allOperations.find(candidate => candidate.path === path && candidate.operationId === staleMode?.operationId);
      const staleNow = Boolean(operation) && staleMode?.phase === "first-validation";
      const actualText = text;
      const actualToken = staleNow ? token(`changed:${String(path)}`) : (operation ? token(`planned:${String(path)}`) : token(`token:${String(path)}`));
      return { content: source(actualText), evidence: evidence(actualText), stability: "stable" as const, observationToken: actualToken };
    },
    validatePath: async (path: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(path) }),
  } as never;

  const remote = new Map<string, { readonly id: RemoteObjectId; readonly content: ContentEvidence }>();
  if (stalePath) remote.set(String(stalePath), { id: remoteFile, content: { ...evidence("planned"), revision: "revision-1" } });
  const drive = {
    observe: async (_root: RemoteObjectId, path: VaultPath) => {
      const current = remote.get(String(path));
      return current
        ? { ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: current.id, content: current.content, stability: "stable" as const } }
        : { ok: true as const, value: { status: "absent" as const, side: "remote" as const, path } };
    },
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [...remote.entries()].map(([raw, current]) => ({ path: vp(raw), entityKind: "file" as const, remoteObjectId: current.id, content: current.content, trashed: false })), completeness: { status: "complete" as const } } }),
    create: async () => { throw new Error("raw Drive create must not execute"); },
    update: async () => { throw new Error("raw Drive update must not execute"); },
  } as never;
  let reservation = 0;
  const reliableRemoteMutationPort: ReliableRemoteMutationPort = {
    reserveFileCreateIdentity: async (_identity, intentId, path, intendedContent) => ({ ok: true as const, value: { kind: "reserved-file-create" as const, intentId, reservedRemoteObjectId: id<"RemoteObjectId">(`reserved:${++reservation}:${String(path)}`) as RemoteObjectId, path, intendedContent } }),
    reserveFolderCreateIdentity: async () => { throw new Error("folder creation is not used by remediation fixture"); },
    createReserved: async (reserved, content) => {
      if (reserved.kind !== "reserved-file-create" || !content) return { status: "outcome-unknown" as const, reason: "file content is required" };
      const operation = allOperations.find(candidate => candidate.path === reserved.path && candidate.kind === "upload-create");
      if (operation) executed.push(operation);
      let text = ""; const decoder = new TextDecoder(); for await (const chunk of content.openChunks()) text += decoder.decode(chunk, { stream: true }); text += decoder.decode();
      const actual = evidence(text);
      assert.equal(actual.hash, reserved.intendedContent.hash);
      assert.equal(actual.sizeBytes, reserved.intendedContent.sizeBytes);
      remote.set(String(reserved.path), { id: reserved.reservedRemoteObjectId, content: actual });
      return { status: "verified-effect" as const, applicationProof: { kind: "reserved-create" as const, remoteObjectId: reserved.reservedRemoteObjectId, path: reserved.path, verifiedContent: reserved.intendedContent } };
    },
    updateExisting: async () => { throw new Error("stale remediation fixtures must stop before REMOTE update dispatch"); },
    moveExisting: async () => { throw new Error("move is not used by remediation fixture"); },
    trashExisting: async () => { throw new Error("trash is not used by remediation fixture"); },
  };

  let plannerCalls = 0;
  const assembly = {
    input: { snapshots: [], state: await store.load(context) }, managedRemote: managed,
    remoteEnumeration: { status: "complete" as const }, localEnumeration: { status: "complete" as const },
    mode: "incremental" as const, nextCursor: id<"ChangeCursor">("cursor:candidate") as ChangeCursor,
  };
  let controller!: ProductController;
  const executor = new ProductSynchronizationExecutor(local, drive, store, context, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: context, stateStore: store, authorityStore: store,
    snapshotAssembler: { assemble: async () => assembly } as never,
    executor, reliableRemoteMutationPort,
    conflictResolver: { assess: async () => ({ kind: "none" as const }) },
    plannerForTrigger: () => ({ plan: async () => {
      const planned = plans[plannerCalls]; plannerCalls += 1;
      if (!planned) throw new Error("stale operation self-scheduled an immediate replan");
      return planned;
    } }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) },
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100), holderId: "full-remediation-test",
    attentionLedger: ledger, diagnostics,
  });
  return { controller, store, oldCursor, ledger, diagnostics, executed, plannerCalls: () => plannerCalls };
}

test("operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs", async () => {
  const stale = staleUpload("actively-edited.md");
  const dependent = { ...upload("dependent-on-edit.md"), preconditions: [{ kind: "path-observation" as const, side: "local" as const, path: stale.path, expected: "present" as const }] };
  const safe = upload("independent.md");
  const h = await controllerHarness(automaticPlan([stale, dependent, safe]), { operationId: stale.operationId, phase: "first-validation" });
  await h.controller.runAutomatic("local-change");
  await h.diagnostics.flush();
  assert.equal(h.plannerCalls(), 1, "staleness must not generate its own immediate automatic run");
  assert.deepEqual(h.executed.map(operation => String(operation.path)), ["independent.md"]);
  const current = await h.ledger.current();
  assert.ok(current.some(record => String(record.path) === "actively-edited.md" && record.reasonCode === "runtime-stale-precondition"));
  assert.ok(current.some(record => String(record.path) === "dependent-on-edit.md" && record.reasonCode === "dependency-on-skipped-operation"));
  const loaded = await h.store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.changeCursor, h.oldCursor, "partial stale-path run cannot advance the cursor");
    assert.ok(loaded.state.base.some(entry => String(entry.path) === "independent.md"));
  }
  const terminal = h.diagnostics.snapshot().find(event => event.event === "sync-run-complete");
  assert.equal(terminal?.fields?.result, "partial");
  assert.equal(terminal?.fields?.safeCommittedCount, 1);
  const staleDiagnostic = h.diagnostics.snapshot().find(event => event.event === "operation-precondition-validation-failed");
  const fields = staleDiagnostic?.fields as Record<string, unknown> | undefined;
  assert.equal(fields?.failedPreconditionCount, 1);
  assert.equal(fields?.failedPreconditionKinds, "path-observation");
  assert.equal(fields?.failedPreconditionSides, "local");
  assert.doesNotMatch(h.diagnostics.renderText(), /actively-edited\.md|independent\.md/u);
});

test("a later stable no-op reconciliation resolves transient stale attention without a content mutation", async () => {
  const stale = staleUpload("transient-edit.md");
  const stableNoop: PlannedOperation = { operationId: id<"OperationId">("op:stable-noop"), kind: "noop", path: stale.path, destructive: false, preconditions: [], reasons: [{ code: "already-reconciled", summary: "The path is now reconciled without a content mutation." }] };
  const h = await controllerHarness([automaticPlan([stale]), automaticPlan([stableNoop])], { operationId: stale.operationId, phase: "first-validation" });
  await h.controller.runAutomatic("local-change");
  assert.equal((await h.ledger.current()).length, 1);
  await h.controller.runAutomatic("periodic");
  assert.equal((await h.ledger.current()).length, 0);
  assert.ok((await h.ledger.all()).some(record => String(record.path) === "transient-edit.md" && !record.current));
  assert.equal(h.plannerCalls(), 2);
});

test("post-journal stale intent is safely retired before unrelated work continues", async () => {
  const stale = staleUpload("changed-after-journal.md");
  const safe = upload("safe-after-stale.md");
  const h = await controllerHarness(automaticPlan([stale, safe]), { operationId: stale.operationId, phase: "execution-revalidation" });
  await h.controller.runAutomatic("local-change");
  assert.equal(h.plannerCalls(), 1);
  assert.deepEqual(h.executed.map(operation => String(operation.path)), ["changed-after-journal.md", "safe-after-stale.md"]);
  const loaded = await h.store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.operations.some(entry => entry.operationId === stale.operationId && entry.status === "pending"), false);
    assert.ok(loaded.state.operations.some(entry => entry.operationId === safe.operationId && entry.status === "completed"));
  }
  assert.ok((await h.ledger.current()).some(record => String(record.path) === "changed-after-journal.md"));
});

test("one validation pass reuses one coherent local and remote observation per path", async () => {
  const path = vp("coherent.md");
  const content = evidence("coherent");
  let localObservations = 0, remoteObservations = 0, stateLoads = 0;
  const executor = new ProductSynchronizationExecutor(
    { observe: async () => { localObservations += 1; return { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content, stability: "stable" as const, observationToken: token("coherent-token") }; } } as never,
    { observe: async () => { remoteObservations += 1; return { ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: remoteFile, content: { ...content, revision: "revision-1" }, stability: "stable" as const } }; } } as never,
    { load: async () => { stateLoads += 1; return { status: "trusted" as const, state: createInitialTrustedState({ stateRevision: id<"StateRevision">("state:coherent:0"), vaultIdentity: vault, deviceIdentity: device }) }; } } as never,
    context, () => ({ managedRemote: managed, remoteEnumerationComplete: true }),
  );
  const operation: PlannedOperation = {
    operationId: id<"OperationId">("op:coherent"), kind: "upload-update", path, targetSide: "remote", remoteObjectId: remoteFile, destructive: false,
    preconditions: [
      { kind: "base-trusted" }, { kind: "path-observation", side: "local", path, expected: "present", observationToken: "coherent-token" },
      { kind: "content-evidence", side: "local", path, expected: content }, { kind: "file-stable", path },
      { kind: "remote-object", remoteObjectId: remoteFile, expectedRevision: "revision-1" },
      { kind: "content-evidence", side: "remote", path, expected: { ...content, revision: "revision-1" } },
    ], reasons: [{ code: "fixture", summary: "Coherent validation fixture." }],
  };
  assert.deepEqual(await executor.validatePreconditions(operation), { status: "valid" });
  assert.equal(localObservations, 1); assert.equal(remoteObservations, 1); assert.equal(stateLoads, 1);
});

test("path and subtree enumeration uncertainty do not contaminate unrelated absent paths", async () => {
  const vanished = vp("Untitled.md"), portable = vp("__brain_sync_portable_config__/hotkeys.json"), child = vp("uncertain-folder/child.md"), other = vp("other.md");
  const remoteEntries = [vanished, portable, child, other].map((path, index) => ({ path, entityKind: "file" as const, remoteObjectId: id<"RemoteObjectId">(`remote:scope:${index}`), content: evidence(String(path)), trashed: false }));
  const drive = { validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }), getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:scope") }), listForReconciliation: async () => ({ ok: true as const, value: { entries: remoteEntries, completeness: { status: "complete" as const } } }) };
  const state = { load: async () => ({ status: "uninitialized" as const }) };
  const assemble = async (listing: unknown) => new ProductSnapshotAssembler({ enumerate: async () => listing } as never, drive as never, state as never, { expectation: "new-installation" }, async () => managed).assembleFull();
  const exact = await assemble({ entries: [{ status: "unknown", side: "local", path: vanished, reason: "listed file disappeared before observation" }], completeness: { status: "partial", reason: "one exact path changed during listing" }, uncertainties: [{ scope: "path", path: vanished, reason: "listed file disappeared before observation" }] });
  assert.equal(exact.input.snapshots.find(snapshot => snapshot.path === vanished)?.local.status, "unknown");
  assert.equal(exact.input.snapshots.find(snapshot => snapshot.path === portable)?.local.status, "absent");
  const subtree = await assemble({ entries: [], completeness: { status: "partial", reason: "one subtree could not be listed" }, uncertainties: [{ scope: "subtree", path: vp("uncertain-folder"), reason: "subtree could not be listed" }] });
  assert.equal(subtree.input.snapshots.find(snapshot => snapshot.path === child)?.local.status, "unknown");
  assert.equal(subtree.input.snapshots.find(snapshot => snapshot.path === other)?.local.status, "absent");
});
