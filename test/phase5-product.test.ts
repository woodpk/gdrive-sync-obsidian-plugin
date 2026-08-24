import assert from "node:assert/strict";
import test from "node:test";
import type { AuditRecord, BinaryContentSource, ContentEvidence, ManagedRemoteIdentity, PathSnapshot, PlannedOperation, SynchronizationPlan } from "../src/contracts";
import { contractId } from "../src/contracts";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { automaticNetworkDecision } from "../src/product/network-policy";
import { DEFAULT_SETTINGS, PluginDataRepository } from "../src/product/plugin-data";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../src/product/text-version-store";
import { WebLocksRunLeasePort } from "../src/product/web-lock-run-lease";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { CrashSafeExecutionCoordinator } from "../src/core/execution-coordinator";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:phase5");
const device = id<"DeviceIdentity">("device:phase5");
const root = id<"RemoteObjectId">("remote:root");
const remoteIdentity: ManagedRemoteIdentity = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const context = { expectation: "existing-pairing" as const, expectedVaultIdentity: vault, expectedDeviceIdentity: device };

const plan = (sizeBytes = 0): SynchronizationPlan => ({
  planId: id<"PlanId">("plan:phase5"), trigger: "periodic", executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false,
  operations: sizeBytes ? [{ operationId: id<"OperationId">("op:large"), kind: "download-create", path: id<"VaultPath">("large.bin"), destructive: false, preconditions: [], reasons: [{ code: "test", summary: "large transfer" }], contentVersion: { path: id<"VaultPath">("large.bin"), entityKind: "file", content: { sizeBytes }, remoteObjectId: id<"RemoteObjectId">("rid:1") } }] : [],
});
function source(text: string): BinaryContentSource { return { sizeBytes: new TextEncoder().encode(text).byteLength, async *openChunks() { yield new TextEncoder().encode(text); } }; }
async function readSource(value: BinaryContentSource): Promise<string> { const decoder = new TextDecoder(); let text = ""; for await (const chunk of value.openChunks()) text += decoder.decode(chunk, { stream: true }); return text + decoder.decode(); }
async function trustedStore() { const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage()); await store.saveTrusted(createInitialTrustedState({ stateRevision: id<"StateRevision">("state:0"), vaultIdentity: vault, deviceIdentity: device })); return store; }

test("Phase 5 audit history is bounded and stores only frozen metadata records", async () => {
  const history = new BoundedAuditHistory(new MemoryAuditPersistence(), 2);
  const records: AuditRecord[] = [{ id: "1", event: "plan-created", advisoryAtMs: 1 }, { id: "2", event: "operation-completed", advisoryAtMs: 2 }, { id: "3", event: "sync-cancelled", advisoryAtMs: 3 }];
  for (const record of records) await history.append(record);
  assert.deepEqual((await history.read()).map(record => record.id), ["2", "3"]);
  assert.equal(JSON.stringify(await history.read()).includes("accessToken"), false);
  assert.equal(JSON.stringify(await history.read()).includes("content"), false);
  await history.setLimit(1); assert.equal((await history.read()).length, 1);
});

test("Phase 5 mobile Wi-Fi-only automatic policy fails closed when Wi-Fi cannot be proven", () => {
  const decision = automaticNetworkDecision(plan(), { ...DEFAULT_SETTINGS, wifiOnlyAutomatic: true }, true);
  assert.equal(decision.allowed, false); assert.match(decision.reason ?? "", /cannot prove a Wi-Fi connection/);
});
test("Phase 5 desktop automatic policy does not invent a mobile network restriction", () => { assert.deepEqual(automaticNetworkDecision(plan(100_000_000), DEFAULT_SETTINGS, false), { allowed: true }); });

test("Phase 5 plugin data repository serializes settings exclusions recovery gate and audit without clobbering projections", async () => {
  let persisted: unknown;
  const repository = new PluginDataRepository({ loadData: async () => persisted, saveData: async data => { persisted = structuredClone(data); } });
  await repository.saveSettings({ ...DEFAULT_SETTINGS, vaultIdentity: "vault:test", deviceIdentity: "device:test", recoveryInProgress: true, userExclusionPatterns: ["private/**"] });
  await repository.save([{ id: "a", event: "plan-created", advisoryAtMs: 1 }]);
  const settings = await repository.loadSettings(); assert.equal(settings.vaultIdentity, "vault:test"); assert.equal(settings.recoveryInProgress, true); assert.deepEqual(settings.userExclusionPatterns, ["private/**"]); assert.equal((await repository.load()).length, 1);
});

test("Phase 5 Web Locks lease excludes a concurrent live writer and releases cleanly", async () => {
  let held = false;
  const locks = { async request<T>(_name: string, options: { ifAvailable: true }, callback: (lock: { name: string } | null) => Promise<T>): Promise<T> { if (options.ifAvailable && held) return callback(null); held = true; try { return await callback({ name: "brain" }); } finally { held = false; } } };
  const port = new WebLocksRunLeasePort(locks as never); const first = await port.tryAcquire(vault, device, "first"); assert.ok(first); assert.equal(await port.tryAcquire(vault, device, "second"), undefined); await first.release(); const third = await port.tryAcquire(vault, device, "third"); assert.ok(third); await third.release();
});

test("Phase 5 upload-create carries verified allocated Drive identity into authoritative trusted state", async () => {
  const path = id<"VaultPath">("note.md"), canonical = sha256Text("hello"), evidence: ContentEvidence = { hash: canonical, sizeBytes: 5 };
  let createCalls = 0; const token = id<"ObservationToken">("local:note:1");
  const local = { observe: async () => ({ status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content: evidence, stability: "stable" as const, observationToken: token }), readFile: async () => ({ content: source("hello"), evidence, stability: "stable" as const, observationToken: token }) } as never;
  const remoteId = id<"RemoteObjectId">("remote:new-note");
  const drive = {
    observe: async () => createCalls ? ({ ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: remoteId, content: evidence, stability: "stable" as const } }) : ({ ok: true as const, value: { status: "absent" as const, side: "remote" as const, path } }),
    create: async (_root: unknown, request: { content?: BinaryContentSource }) => { createCalls += 1; if (request.content) assert.equal(await readSource(request.content), "hello"); return { ok: true as const, value: { remoteObjectId: remoteId, path, evidence } }; },
  } as never;
  const store = await trustedStore(); const executor = new ProductSynchronizationExecutor(local, drive, store, context, () => ({ managedRemote: remoteIdentity, remoteEnumerationComplete: true }));
  const operation: PlannedOperation = { operationId: id<"OperationId">("op:create"), kind: "upload-create", path, targetSide: "remote", contentVersion: { path, entityKind: "file", content: evidence, observationToken: token }, destructive: false, preconditions: [{ kind: "path-observation", side: "remote", path, expected: "absent" }, { kind: "path-observation", side: "local", path, expected: "present", observationToken: String(token) }, { kind: "content-evidence", side: "local", path, expected: evidence }], reasons: [{ code: "test", summary: "create" }] };
  const result = await new CrashSafeExecutionCoordinator(executor, new StateCommitCoordinator(store, context)).executeOperation(operation); assert.equal(result.status, "committed"); assert.equal(createCalls, 1);
  const loaded = await store.load(context); assert.equal(loaded.status, "trusted"); if (loaded.status === "trusted") { assert.equal(loaded.state.base[0].content?.hash, canonical); assert.equal(loaded.state.base[0].remoteObjectId, remoteId); assert.equal(loaded.state.remoteMappings[0].remoteObjectId, remoteId); }
});

test("Phase 5 clean-text-merge materializes exact canonical SHA-256 merge output and verifies both sides", async () => {
  const path = id<"VaultPath">("merge.md"), remoteId = id<"RemoteObjectId">("remote:merge"), text = "base\nlocal\nremote\n", token = id<"ObservationToken">("tok"), revision = "7";
  const evidence: ContentEvidence = { hash: sha256Text(text), sizeBytes: new TextEncoder().encode(text).byteLength, revision };
  let localWritten = "", remoteWritten = "";
  const local = { observe: async () => ({ status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content: evidence, stability: "stable" as const, observationToken: token }), replaceFile: async (_p: unknown, content: BinaryContentSource) => { localWritten = await readSource(content); return { path, evidence, observationToken: token }; } } as never;
  const drive = { update: async (request: { content: BinaryContentSource; expectedRemoteRevision?: string }) => { assert.equal(request.expectedRemoteRevision, revision); remoteWritten = await readSource(request.content); return { ok: true as const, value: { remoteObjectId: remoteId, path, evidence } }; }, observe: async () => ({ ok: true as const, value: { status: "present" as const, side: "remote" as const, path, entityKind: "file" as const, remoteObjectId: remoteId, content: evidence, stability: "stable" as const } }) } as never;
  const versions = new ProductTextVersionStore(new MemoryTextVersionPersistence(), local, drive); const merged = { path, entityKind: "file" as const, content: evidence, remoteObjectId: remoteId }; assert.equal(await versions.persistText(merged, text), true);
  const executor = new ProductSynchronizationExecutor(local, drive, {} as never, context, () => ({ managedRemote: remoteIdentity, remoteEnumerationComplete: true }), versions);
  const result = await executor.execute({ operationId: id<"OperationId">("op:merge"), kind: "clean-text-merge", path, remoteObjectId: remoteId, contentVersion: merged, destructive: false, preconditions: [{ kind: "path-observation", side: "local", path, expected: "present", observationToken: String(token) }, { kind: "content-evidence", side: "local", path, expected: evidence }, { kind: "remote-object", remoteObjectId: remoteId, expectedRevision: revision }, { kind: "content-evidence", side: "remote", path, expected: evidence }], reasons: [{ code: "clean-three-way-merge", summary: "clean" }] });
  assert.equal(result.status, "durable-verified-success"); assert.equal(localWritten, text); assert.equal(remoteWritten, text);
});

test("Phase 5 retained text with mismatched canonical hash is rejected as corrupt BASE material", async () => {
  const path = id<"VaultPath">("corrupt.md"); const persistence = new MemoryTextVersionPersistence(); const expected = { path, entityKind: "file" as const, content: { hash: sha256Text("expected") } };
  await persistence.put(`hash:${String(expected.content.hash)}`, "corrupt"); const versions = new ProductTextVersionStore(persistence, {} as never, {} as never); assert.equal(await versions.retainedText(expected), undefined);
});

test("Phase 5 first-sync identical no-op carries stable remote version and establishes trusted BASE", async () => {
  const path = id<"VaultPath">("same.md"), remoteId = id<"RemoteObjectId">("remote:same"), canonical = sha256Text("same"), token = id<"ObservationToken">("same:1");
  const snapshot: PathSnapshot = { path, local: { status: "present", side: "local", path, entityKind: "file", content: { hash: canonical }, stability: "stable", observationToken: token }, remote: { status: "present", side: "remote", path, entityKind: "file", content: { hash: canonical }, remoteObjectId: remoteId, stability: "stable" }, base: { status: "uninitialized" }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" } };
  const planner = new DeterministicSynchronizationPlanner(new ThreeWayConflictResolver({ readText: async () => undefined })); const planned = await planner.plan({ snapshots: [snapshot], state: { status: "uninitialized" } }); assert.equal(planned.operations[0].kind, "noop"); assert.equal(planned.operations[0].contentVersion?.remoteObjectId, remoteId);
  const store = await trustedStore(); const journal = new StateCommitCoordinator(store, context); await journal.markPending(planned.operations[0]); const committed = await journal.commitVerifiedSuccess(planned.operations[0], { operationId: planned.operations[0].operationId, durable: true, integrityVerified: true, evidence: { hash: canonical } }); assert.equal(committed.status, "committed");
  const loaded = await store.load(context); assert.equal(loaded.status, "trusted"); if (loaded.status === "trusted") { assert.equal(loaded.state.base[0].remoteObjectId, remoteId); assert.equal(loaded.state.base[0].content?.hash, canonical); }
});

test("Phase 5 full reconciliation acquires candidate Changes cursor before remote listing", async () => {
  const calls: string[] = [], cursor = id<"ChangeCursor">("cursor:before-list"); const local = { enumerate: async () => ({ entries: [], completeness: { status: "complete" as const } }) } as never;
  const drive = { validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: remoteIdentity } }), getStartCursor: async () => { calls.push("cursor"); return { ok: true as const, value: cursor }; }, listForReconciliation: async () => { calls.push("list"); return { ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } }; } } as never;
  const state = { load: async () => ({ status: "uninitialized" as const }) } as never; const assembled = await new ProductSnapshotAssembler(local, drive, state, { expectation: "new-installation" }, async () => remoteIdentity).assembleFull(); assert.deepEqual(calls, ["cursor", "list"]); assert.equal(assembled.nextCursor, cursor);
});

function blockedOperation(kind: PlannedOperation["kind"]): PlannedOperation { return { operationId: id<"OperationId">(`op:${kind}`), kind, path: id<"VaultPath">("note.md"), destructive: false, preconditions: [], reasons: [{ code: "test", summary: "safety" }] }; }
test("Phase 5 unresolved conflict and recovery operations never enter ordinary mutation paths", async () => {
  const executor = new ProductSynchronizationExecutor({} as never, {} as never, {} as never, context, () => { throw new Error("unused"); });
  assert.equal((await executor.execute(blockedOperation("unresolved-conflict"))).status, "blocking-failure"); assert.equal((await executor.execute(blockedOperation("recovery-required"))).status, "recovery-required");
});
