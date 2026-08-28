import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentEvidence,
  type ManagedRemoteIdentity,
  type PlannedOperation,
  type StateLoadContext,
  type VaultPath,
} from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { beginManualSyncDiagnostics } from "../src/diagnostics/sync-diagnostics";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:ios-sync-diagnostics");
const device = id<"DeviceIdentity">("device:ios-sync-diagnostics");
const filePath = id<"VaultPath">("SENTINEL_PRIVATE_NOTE_PATH.md") as VaultPath;
const evidence: ContentEvidence = { hash: id<"ContentHash">("sha256:fixture"), sizeBytes: 23 };
const managed: ManagedRemoteIdentity = {
  rootId: id<"RemoteObjectId">("root:ios-sync-diagnostics"),
  vaultIdentity: vault,
  protocolVersion: id<"ProtocolVersion">("1"),
};
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

async function makeLogger(level: "info" | "debug" | "trace" = "trace") {
  const persistence = new MemoryDiagnostics();
  let tick = 0;
  const diagnostics = new DiagnosticLogger({
    persistence,
    level,
    retentionLimit: 500,
    consoleMirror: false,
    platform: "mobile",
    now: () => new Date(1_800_000_000_000 + tick++),
    monotonicNow: () => tick++,
  });
  await diagnostics.initialize();
  return { diagnostics, persistence };
}

async function successfulManualRun() {
  const { diagnostics, persistence } = await makeLogger();
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await store.saveTrusted(createInitialTrustedState({ stateRevision: id<"StateRevision">("state:0"), vaultIdentity: vault, deviceIdentity: device }));
  const local = {
    enumerate: async () => ({
      entries: [{ status: "present" as const, side: "local" as const, path: filePath, entityKind: "file" as const, content: evidence, stability: "stable" as const, observationToken: id<"ObservationToken">("token:fixture") }],
      completeness: { status: "complete" as const },
    }),
  };
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }),
    getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:next") }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } }),
  };
  const assembler = new ProductSnapshotAssembler(local as never, drive as never, store, context, async () => managed, undefined, undefined, diagnostics);
  const executor = {
    validatePreconditions: async () => ({ status: "valid" as const }),
    execute: async (operation: PlannedOperation) => ({
      status: "durable-verified-success" as const,
      receipt: { operationId: operation.operationId, durable: true as const, integrityVerified: true as const, evidence: operation.contentVersion?.content, verificationEvidenceRef: "fixture-verification" },
    }),
    failureScope: () => "global" as const,
  };
  const conflicts = new ThreeWayConflictResolver({ readText: async () => undefined });
  const controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    snapshotAssembler: assembler,
    executor: executor as never,
    conflictResolver: conflicts,
    plannerForTrigger: trigger => new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) },
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 50),
    holderId: "ios-sync-diagnostic-test",
    diagnostics,
  });

  const runId = beginManualSyncDiagnostics(diagnostics, "test-sync-now")!;
  const plan = await controller.previewManual(runId);
  assert.ok(plan);
  const semanticPlan = structuredClone(plan);
  controller.recordPreviewPresented(plan.planId);
  controller.recordExecuteClick(plan.planId);
  const request = await controller.request({ kind: "execute-plan", planId: plan.planId });
  await diagnostics.flush();
  return { diagnostics, persistence, controller, store, runId, plan, semanticPlan, request };
}

function eventIndex(events: readonly { event: string }[], name: string): number {
  const index = events.findIndex(event => event.event === name);
  assert.notEqual(index, -1, `missing diagnostic event ${name}`);
  return index;
}

test("iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle", async () => {
  const run = await successfulManualRun();
  const events = run.diagnostics.snapshot();
  assert.equal(events.every(event => event.runId === run.runId), true);
  assert.equal(run.persistence.state?.nextRunId, run.runId + 1);

  const ordered = [
    "sync-now-click-handler-enter",
    "manual-sync-request-enter",
    "planning-start",
    "base-state-load-start",
    "base-state-load-complete",
    "local-observation-start",
    "remote-observation-start",
    "local-observation-complete",
    "remote-observation-complete",
    "planning-complete",
    "plan-preview-preparation-start",
    "plan-preview-presented",
    "execute-click-handler-enter",
    "execution-start",
    "operation-start",
    "operation-precondition-validated",
    "content-mutation-start",
    "content-mutation-complete",
    "integrity-verification-complete",
    "state-commit-start",
    "state-commit-complete",
    "operation-complete",
    "sync-run-complete",
  ];
  const indexes = ordered.map(name => eventIndex(events, name));
  for (let index = 1; index < indexes.length; index++) assert.ok(indexes[index]! > indexes[index - 1]!, `${ordered[index]} must follow ${ordered[index - 1]}`);

  const planSummary = events.find(event => event.event === "plan-preview-preparation-start")!;
  assert.equal(planSummary.fields?.operationCount, 1);
  assert.equal(planSummary.fields?.uploadCount, 1);
  assert.equal(planSummary.fields?.conflictCount, 0);
  assert.equal(planSummary.fields?.blockedCount, 0);
  assert.equal(planSummary.fields?.destructiveCount, 0);
  assert.equal(planSummary.fields?.planDisposition, run.plan.executionDisposition);
  assert.equal(planSummary.fields?.stateStatus, "trusted");
  assert.equal(planSummary.fields?.localCompleteness, "complete");
  assert.equal(events[eventIndex(events, "integrity-verification-complete")]!.sequence < events[eventIndex(events, "state-commit-start")]!.sequence, true);
});

test("sync diagnostics preserve plan/execution semantics and never export vault path or content", async () => {
  const run = await successfulManualRun();
  assert.equal(run.request.status, "accepted");
  assert.deepEqual(run.plan, run.semanticPlan);
  assert.equal(run.plan.operations.length, 1);
  assert.equal(run.plan.operations[0]?.kind, "upload-create");
  const loaded = await run.store.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.operations[0]?.status, "completed");
    assert.equal(loaded.state.base[0]?.content?.hash, evidence.hash);
  }
  const exported = run.diagnostics.renderText();
  assert.doesNotMatch(exported, /SENTINEL_PRIVATE_NOTE_PATH|private note body|access_token|refresh_token|client_secret/i);
});

test("manual sync planning failure is terminal, correlated, and credential-sanitized", async () => {
  const { diagnostics } = await makeLogger();
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const conflicts = new ThreeWayConflictResolver({ readText: async () => undefined });
  const controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    snapshotAssembler: { assembleFull: async () => { throw new Error("access_token=SENTINEL_ACCESS client_secret=SENTINEL_SECRET"); } } as never,
    executor: {} as never,
    conflictResolver: conflicts,
    plannerForTrigger: trigger => new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) },
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "ios-sync-diagnostic-failure-test",
    diagnostics,
  });
  const runId = beginManualSyncDiagnostics(diagnostics, "test-failure")!;
  assert.equal(await controller.previewManual(runId), undefined);
  const failure = diagnostics.snapshot().find(event => event.event === "sync-run-failed");
  assert.equal(failure?.runId, runId);
  assert.equal(failure?.fields?.stage, "planning");
  assert.equal(failure?.fields?.classification, "planning-failure");
  assert.doesNotMatch(diagnostics.renderText(), /SENTINEL_ACCESS|SENTINEL_SECRET/);
  const nextRunId = beginManualSyncDiagnostics(diagnostics, "next-attempt")!;
  assert.equal(nextRunId, runId + 1);
});
