import assert from "node:assert/strict";
import test from "node:test";
import type {
  ChangeCursor,
  ContentEvidence,
  DeviceIdentity,
  ManagedRemoteIdentity,
  ObservationToken,
  PlannedOperation,
  RemoteObjectId,
  StateLoadContext,
  SynchronizationPlan,
  VaultIdentity,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { SyncAttentionLedger, type SyncAttentionPersistence, type SyncAttentionRecord } from "../src/product/sync-attention-ledger";
import { DiagnosticLogger, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { createInitialTrustedState, MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";
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

async function controllerHarness(plan: SynchronizationPlan, executor: {
  validatePreconditions(operation: PlannedOperation): Promise<any>;
  execute(operation: PlannedOperation): Promise<any>;
  failureScope(operation: PlannedOperation, reason: string): "path" | "global";
}) {
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const initial = createInitialTrustedState({ stateRevision: id<"StateRevision">("state:remediation:0"), vaultIdentity: vault, deviceIdentity: device });
  const oldCursor = id<"ChangeCursor">("cursor:old") as ChangeCursor;
  await store.saveTrusted({ ...initial, changeCursor: oldCursor });
  const persistence = new MemoryAttentionPersistence();
  const ledger = new SyncAttentionLedger(persistence, 20);
  let diagnosticState: DiagnosticStoreState | undefined;
  const diagnostics = new DiagnosticLogger({
    persistence: { loadDiagnostics: async () => diagnosticState, saveDiagnostics: async state => { diagnosticState = state; } },
    level: "trace", retentionLimit: 500, consoleMirror: false, platform: "mobile",
  });
  await diagnostics.initialize();
  let plannerCalls = 0;
  const executed: PlannedOperation[] = [];
  const wrappedExecutor = {
    validatePreconditions: (operation: PlannedOperation) => executor.validatePreconditions(operation),
    execute: async (operation: PlannedOperation) => { executed.push(operation); return executor.execute(operation); },
    failureScope: (operation: PlannedOperation, reason: string) => executor.failureScope(operation, reason),
  };
  const assembly = {
    input: { snapshots: [], state: await store.load(context) }, managedRemote: managed,
    remoteEnumeration: { status: "complete" as const }, localEnumeration: { status: "complete" as const },
    mode: "incremental" as const, nextCursor: id<"ChangeCursor">("cursor:candidate") as ChangeCursor,
  };
  const controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: context, stateStore: store,
    snapshotAssembler: { assemble: async () => assembly } as never,
    executor: wrappedExecutor as never,
    conflictResolver: { assess: async () => ({ kind: "none" as const }) },
    plannerForTrigger: () => ({ plan: async () => {
      plannerCalls += 1;
      if (plannerCalls > 1) throw new Error("stale operation self-scheduled an immediate replan");
      return plan;
    } }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) },
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100), holderId: "full-remediation-test",
    attentionLedger: ledger, diagnostics,
  });
  return { controller, store, oldCursor, ledger, diagnostics, executed, plannerCalls: () => plannerCalls };
}

test("operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs", async () => {
  const stale = staleUpload("actively-edited.md");
  const safe = upload("independent.md");
  const h = await controllerHarness(automaticPlan([stale, safe]), {
    validatePreconditions: async operation => operation.operationId === stale.operationId
      ? { status: "stale" as const, failed: [stale.preconditions[0]!] }
      : { status: "valid" as const },
    execute: async operation => ({ status: "durable-verified-success" as const, receipt: { operationId: operation.operationId, durable: true as const, integrityVerified: true as const, evidence: operation.contentVersion?.content, resultingRemoteObjectId: id<"RemoteObjectId">(`remote:${String(operation.path)}`) } }),
    failureScope: () => "global",
  });

  await h.controller.runAutomatic("local-change");
  await h.diagnostics.flush();

  assert.equal(h.plannerCalls(), 1, "staleness must not generate its own immediate automatic run");
  assert.deepEqual(h.executed.map(operation => String(operation.path)), ["independent.md"]);
  const current = await h.ledger.current();
  assert.ok(current.some(record => String(record.path) === "actively-edited.md" && record.reasonCode === "runtime-stale-precondition"));
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

test("post-journal stale intent is safely retired before unrelated work continues", async () => {
  const stale = staleUpload("changed-after-journal.md");
  const safe = upload("safe-after-stale.md");
  const h = await controllerHarness(automaticPlan([stale, safe]), {
    validatePreconditions: async () => ({ status: "valid" as const }),
    execute: async operation => operation.operationId === stale.operationId
      ? { status: "stale-precondition" as const, reason: "planned source changed at the mutation boundary" }
      : { status: "durable-verified-success" as const, receipt: { operationId: operation.operationId, durable: true as const, integrityVerified: true as const, evidence: operation.contentVersion?.content, resultingRemoteObjectId: id<"RemoteObjectId">(`remote:${String(operation.path)}`) } },
    failureScope: () => "global",
  });

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
  let localObservations = 0;
  let remoteObservations = 0;
  let stateLoads = 0;
  const executor = new ProductSynchronizationExecutor(
    { observe: async () => { localObservations += 1; return { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content, stability: "stable" as const, observationToken: token("coherent-token") }; } } as never,
    { observe: async () => { remoteObservations += 1; return { ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: remoteFile, content: { ...content, revision: "revision-1" }, stability: "stable" as const } }; } } as never,
    { load: async () => { stateLoads += 1; return { status: "trusted" as const, state: createInitialTrustedState({ stateRevision: id<"StateRevision">("state:coherent:0"), vaultIdentity: vault, deviceIdentity: device }) }; } } as never,
    context,
    () => ({ managedRemote: managed, remoteEnumerationComplete: true }),
  );
  const operation: PlannedOperation = {
    operationId: id<"OperationId">("op:coherent"), kind: "upload-update", path, targetSide: "remote", remoteObjectId: remoteFile, destructive: false,
    preconditions: [
      { kind: "base-trusted" },
      { kind: "path-observation", side: "local", path, expected: "present", observationToken: "coherent-token" },
      { kind: "content-evidence", side: "local", path, expected: content },
      { kind: "file-stable", path },
      { kind: "remote-object", remoteObjectId: remoteFile, expectedRevision: "revision-1" },
      { kind: "content-evidence", side: "remote", path, expected: { ...content, revision: "revision-1" } },
    ],
    reasons: [{ code: "fixture", summary: "Coherent validation fixture." }],
  };

  assert.deepEqual(await executor.validatePreconditions(operation), { status: "valid" });
  assert.equal(localObservations, 1);
  assert.equal(remoteObservations, 1);
  assert.equal(stateLoads, 1);
});

test("path and subtree enumeration uncertainty do not contaminate unrelated absent paths", async () => {
  const vanished = vp("Untitled.md");
  const portable = vp("__brain_sync_portable_config__/hotkeys.json");
  const child = vp("uncertain-folder/child.md");
  const other = vp("other.md");
  const remoteEntries = [vanished, portable, child, other].map((path, index) => ({ path, entityKind: "file" as const, remoteObjectId: id<"RemoteObjectId">(`remote:scope:${index}`), content: evidence(String(path)), trashed: false }));
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }),
    getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:scope") }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: remoteEntries, completeness: { status: "complete" as const } } }),
  };
  const state = { load: async () => ({ status: "uninitialized" as const }) };
  const assemble = async (listing: unknown) => new ProductSnapshotAssembler(
    { enumerate: async () => listing } as never, drive as never, state as never, { expectation: "new-installation" }, async () => managed,
  ).assembleFull();

  const exact = await assemble({
    entries: [{ status: "unknown", side: "local", path: vanished, reason: "listed file disappeared before observation" }],
    completeness: { status: "partial", reason: "one exact path changed during listing" },
    uncertainties: [{ scope: "path", path: vanished, reason: "listed file disappeared before observation" }],
  });
  assert.equal(exact.input.snapshots.find(snapshot => snapshot.path === vanished)?.local.status, "unknown");
  assert.equal(exact.input.snapshots.find(snapshot => snapshot.path === portable)?.local.status, "absent");

  const subtree = await assemble({
    entries: [], completeness: { status: "partial", reason: "one subtree could not be listed" },
    uncertainties: [{ scope: "subtree", path: vp("uncertain-folder"), reason: "subtree could not be listed" }],
  });
  assert.equal(subtree.input.snapshots.find(snapshot => snapshot.path === child)?.local.status, "unknown");
  assert.equal(subtree.input.snapshots.find(snapshot => snapshot.path === other)?.local.status, "absent");
});
