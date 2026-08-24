import assert from "node:assert/strict";
import test from "node:test";
import type { AuditRecord, PlannedOperation, SynchronizationPlan } from "../src/contracts";
import { contractId } from "../src/contracts";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { automaticNetworkDecision } from "../src/product/network-policy";
import { DEFAULT_SETTINGS, PluginDataRepository } from "../src/product/plugin-data";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { WebLocksRunLeasePort } from "../src/product/web-lock-run-lease";

const plan = (sizeBytes = 0): SynchronizationPlan => ({
  planId: contractId<"PlanId">("plan:phase5"),
  trigger: "periodic",
  createdFrom: "snapshot:phase5",
  executionDisposition: "safe-auto-eligible",
  recoveryCheckpointRequired: false,
  operations: sizeBytes ? [{
    operationId: contractId<"OperationId">("op:large"),
    kind: "download-create",
    path: contractId<"VaultPath">("large.bin"),
    destructive: false,
    preconditions: [],
    reasons: [{ code: "test", summary: "large transfer" }],
    contentVersion: { source: "remote", entityKind: "file", content: { sizeBytes }, remoteObjectId: contractId<"RemoteObjectId">("rid:1") },
  }] : [],
});

test("Phase 5 audit history is bounded and stores only frozen metadata records", async () => {
  const history = new BoundedAuditHistory(new MemoryAuditPersistence(), 2);
  const records: AuditRecord[] = [
    { id: "1", event: "plan-created", advisoryAtMs: 1 },
    { id: "2", event: "operation-completed", advisoryAtMs: 2 },
    { id: "3", event: "sync-cancelled", advisoryAtMs: 3 },
  ];
  for (const record of records) await history.append(record);
  assert.deepEqual((await history.read()).map(record => record.id), ["2", "3"]);
  assert.equal(JSON.stringify(await history.read()).includes("accessToken"), false);
  assert.equal(JSON.stringify(await history.read()).includes("content"), false);
});

test("Phase 5 mobile Wi-Fi-only automatic policy fails closed when Wi-Fi cannot be proven", () => {
  const decision = automaticNetworkDecision(plan(), { ...DEFAULT_SETTINGS, wifiOnlyAutomatic: true }, true);
  assert.equal(decision.allowed, false);
  assert.match(decision.reason ?? "", /cannot prove a Wi-Fi connection/);
});

test("Phase 5 desktop automatic policy does not invent a mobile network restriction", () => {
  assert.deepEqual(automaticNetworkDecision(plan(100_000_000), DEFAULT_SETTINGS, false), { allowed: true });
});

test("Phase 5 plugin data repository serializes settings and audit without clobbering either projection", async () => {
  let persisted: unknown;
  const repository = new PluginDataRepository({
    loadData: async () => persisted,
    saveData: async data => { persisted = structuredClone(data); },
  });
  const settings = { ...DEFAULT_SETTINGS, vaultIdentity: "vault:test", deviceIdentity: "device:test" };
  await repository.saveSettings(settings);
  await repository.save([{ id: "a", event: "plan-created" }]);
  assert.equal((await repository.loadSettings()).vaultIdentity, "vault:test");
  assert.equal((await repository.load()).length, 1);
});

test("Phase 5 Web Locks lease excludes a concurrent live writer and releases cleanly", async () => {
  let held = false;
  const locks = {
    async request<T>(_name: string, options: { ifAvailable: true }, callback: (lock: { name: string } | null) => Promise<T>): Promise<T> {
      if (options.ifAvailable && held) return callback(null);
      held = true;
      try { return await callback({ name: "brain" }); }
      finally { held = false; }
    },
  };
  const port = new WebLocksRunLeasePort(locks as never);
  const vault = contractId<"VaultIdentity">("vault:test");
  const device = contractId<"DeviceIdentity">("device:test");
  const first = await port.tryAcquire(vault, device, "first");
  assert.ok(first);
  const second = await port.tryAcquire(vault, device, "second");
  assert.equal(second, undefined);
  await first.release();
  const third = await port.tryAcquire(vault, device, "third");
  assert.ok(third);
  await third.release();
});

function blockedOperation(kind: PlannedOperation["kind"]): PlannedOperation {
  return {
    operationId: contractId<"OperationId">(`op:${kind}`),
    kind,
    path: contractId<"VaultPath">("note.md"),
    destructive: false,
    preconditions: [],
    reasons: [{ code: "test", summary: "contract blocker" }],
    ...(kind === "upload-create" ? { contentVersion: { source: "local" as const, entityKind: "file" as const, content: { hash: "h", sizeBytes: 1 } } } : {}),
  };
}

test("Phase 5 upload-create fails closed before any Drive mutation because receipt cannot persist new Drive identity", async () => {
  let driveMutations = 0;
  const executor = new ProductSynchronizationExecutor({} as never, { create: async () => { driveMutations += 1; throw new Error("must not run"); } } as never, {} as never, {} as never, () => { throw new Error("run evidence should not be required"); });
  const result = await executor.execute(blockedOperation("upload-create"));
  assert.equal(result.status, "blocking-failure");
  assert.equal(driveMutations, 0);
  assert.match(result.reason, /VerifiedExecutionReceipt/);
});

test("Phase 5 clean-text-merge fails closed rather than fabricating missing merged bytes", async () => {
  const executor = new ProductSynchronizationExecutor({} as never, {} as never, {} as never, {} as never, () => { throw new Error("unused"); });
  const result = await executor.execute(blockedOperation("clean-text-merge"));
  assert.equal(result.status, "blocking-failure");
  assert.match(result.reason, /merged bytes/);
});

test("Phase 5 unresolved conflict and recovery operations never enter a mutation path", async () => {
  const executor = new ProductSynchronizationExecutor({} as never, {} as never, {} as never, {} as never, () => { throw new Error("unused"); });
  assert.equal((await executor.execute(blockedOperation("unresolved-conflict"))).status, "blocking-failure");
  assert.equal((await executor.execute(blockedOperation("recovery-required"))).status, "recovery-required");
});
