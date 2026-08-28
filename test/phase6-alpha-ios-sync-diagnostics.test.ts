import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentEvidence,
  type ManagedRemoteIdentity,
  type PlannedOperation,
  type StateLoadContext,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { beginManualSyncDiagnostics, presentManualSyncPreview } from "../src/diagnostics/sync-diagnostics";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:ios-sync-diagnostics");
const device = id<"DeviceIdentity">("device:ios-sync-diagnostics");
const filePath = id<"VaultPath">("SENTINEL_PRIVATE_NOTE_PATH.md") as VaultPath;
const protectedFailureMessage = "SENTINEL_PRIVATE_NOTE_PATH.md SENTINEL_NOTE_BODY_FRAGMENT SENTINEL_DRIVE_OBJECT_ID access_token=SENTINEL_TOKEN https://example.invalid/private?state=SENTINEL_STATE";
const protectedFailurePattern = /SENTINEL_PRIVATE_NOTE_PATH|SENTINEL_NOTE_BODY_FRAGMENT|SENTINEL_DRIVE_OBJECT_ID|SENTINEL_TOKEN|SENTINEL_STATE|example\.invalid/i;
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
  controller.recordPreviewPresented(plan.planId, runId);
  controller.recordExecuteClick(plan.planId, runId);
  const request = await controller.requestPreviewAction({ kind: "execute-plan", planId: plan.planId }, runId);
  await diagnostics.flush();
  return { diagnostics, persistence, controller, store, runId, plan, semanticPlan, request };
}

function eventIndex(events: readonly { event: string }[], name: string): number {
  const index = events.findIndex(event => event.event === name);
  assert.notEqual(index, -1, `missing diagnostic event ${name}`);
  return index;
}

function assertRunClosed(diagnostics: DiagnosticLogger, runId: number): void {
  diagnostics.syncInfo("sync.controller", "closure-probe", runId, { stage: "test-probe" });
  assert.equal(diagnostics.snapshot().at(-1)?.elapsedMs, undefined);
}

async function planningOnlyController(diagnostics: DiagnosticLogger, samePlanEveryTime = false) {
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await store.saveTrusted(createInitialTrustedState({ stateRevision: id<"StateRevision">("state:planning-only:0"), vaultIdentity: vault, deviceIdentity: device }));
  const trusted = await store.load(context);
  assert.equal(trusted.status, "trusted");
  const conflicts = new ThreeWayConflictResolver({ readText: async () => undefined });
  let planNumber = 0;
  const assembly = { input: { snapshots: [], state: trusted }, managedRemote: managed, remoteEnumeration: { status: "complete" as const }, mode: "full" as const };
  const controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: context, stateStore: store,
    snapshotAssembler: { assembleFull: async () => assembly } as never,
    executor: {} as never,
    conflictResolver: conflicts,
    plannerForTrigger: trigger => ({ plan: async (): Promise<SynchronizationPlan> => {
      planNumber += 1;
      return {
        planId: id<"PlanId">(samePlanEveryTime ? "plan:diagnostic:same-semantic-plan" : `plan:diagnostic:${planNumber}`),
        trigger, operations: [], executionDisposition: "requires-user-approval", recoveryCheckpointRequired: false,
      };
    } }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) },
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20), holderId: "planning-only", diagnostics,
  });
  return controller;
}

type ExecutionFailurePoint = "precondition" | "pending" | "mutation" | "uncertain-journal" | "commit" | "returned-mutation" | "run-lease";

async function failingExecution(failurePoint: ExecutionFailurePoint) {
  const { diagnostics } = await makeLogger();
  const realStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await realStore.saveTrusted(createInitialTrustedState({ stateRevision: id<"StateRevision">("state:failure:0"), vaultIdentity: vault, deviceIdentity: device }));
  const loaded = await realStore.load(context);
  assert.equal(loaded.status, "trusted");
  let loadCalls = 0;
  const scriptedStore = {
    load: async (loadContext: StateLoadContext) => {
      loadCalls += 1;
      if (failurePoint === "pending" && loadCalls === 2) throw new Error("client_secret=SENTINEL_PENDING");
      if (failurePoint === "uncertain-journal" && loadCalls === 3) throw new Error("access_token=SENTINEL_UNCERTAIN");
      if (failurePoint === "commit" && loadCalls === 3) throw new Error("refresh_token=SENTINEL_COMMIT");
      return realStore.load(loadContext);
    },
    saveTrusted: realStore.saveTrusted.bind(realStore),
    replaceRecoveryState: realStore.replaceRecoveryState.bind(realStore),
    createRecoveryBackup: realStore.createRecoveryBackup.bind(realStore),
  };
  const operation: PlannedOperation = {
    operationId: id<"OperationId">("operation:failure-fixture"), kind: "noop", path: filePath, destructive: false, preconditions: [], reasons: [{ code: "fixture", summary: "fixture" }],
  };
  const plan: SynchronizationPlan = {
    planId: id<"PlanId">("plan:failure-fixture"), trigger: "manual", operations: [operation], executionDisposition: "requires-user-approval", recoveryCheckpointRequired: false,
  };
  const assembly = { input: { snapshots: [], state: loaded }, managedRemote: managed, remoteEnumeration: { status: "complete" as const }, mode: "full" as const };
  const executor = {
    validatePreconditions: async () => {
      if (failurePoint === "precondition") throw new Error("access_token=SENTINEL_PRECONDITION");
      return { status: "valid" as const };
    },
    execute: async (candidate: PlannedOperation) => {
      if (failurePoint === "mutation") throw new Error(protectedFailureMessage);
      if (failurePoint === "uncertain-journal") return { status: "uncertain" as const, reason: "transport uncertain" };
      if (failurePoint === "returned-mutation") return { status: "blocking-failure" as const, reason: "fixed fixture failure" };
      return { status: "durable-verified-success" as const, receipt: { operationId: candidate.operationId, durable: true as const, integrityVerified: true as const, verificationEvidenceRef: "fixture" } };
    },
    failureScope: () => "global" as const,
  };
  const conflicts = new ThreeWayConflictResolver({ readText: async () => undefined });
  const controller = new IntegratedProductController({
    vaultIdentity: vault, deviceIdentity: device, stateContext: context, stateStore: scriptedStore as never,
    snapshotAssembler: { assembleFull: async () => assembly } as never,
    executor: executor as never,
    conflictResolver: conflicts,
    plannerForTrigger: () => ({ plan: async () => plan }),
    leasePort: failurePoint === "run-lease"
      ? { tryAcquire: async () => { throw new Error("oauth_state=SENTINEL_LEASE"); } }
      : { tryAcquire: async () => ({ release: async () => undefined }) },
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20), holderId: `failure:${failurePoint}`, diagnostics,
  });
  const runId = beginManualSyncDiagnostics(diagnostics, `test-${failurePoint}`)!;
  const preview = await controller.previewManual(runId);
  assert.ok(preview);
  controller.recordPreviewPresented(preview.planId, runId);
  controller.recordExecuteClick(preview.planId, runId);
  let request: Awaited<ReturnType<IntegratedProductController["request"]>> | undefined;
  let thrown: unknown;
  try { request = await controller.requestPreviewAction({ kind: "execute-plan", planId: preview.planId }, runId); }
  catch (error) { thrown = error; }
  return { diagnostics, controller, runId, request, thrown };
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

test("manual sync planning failure is terminal, correlated, and metadata-only", async () => {
  const { diagnostics } = await makeLogger();
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const conflicts = new ThreeWayConflictResolver({ readText: async () => undefined });
  const controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    snapshotAssembler: { assembleFull: async () => { throw new Error(protectedFailureMessage); } } as never,
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
  assert.equal(failure?.level, "error");
  assert.equal(failure?.fields?.stage, "planning");
  assert.equal(failure?.fields?.classification, "planning-failure");
  assert.equal(failure?.fields?.errorName, "Error");
  assert.equal(failure?.fields?.safeMessage, "Synchronization failure details suppressed.");
  assert.doesNotMatch(diagnostics.renderText(), protectedFailurePattern);
  const nextRunId = beginManualSyncDiagnostics(diagnostics, "next-attempt")!;
  assert.equal(nextRunId, runId + 1);
});

test("preview-presentation exception is sanitized at the preview stage and closes the same run", async () => {
  const { diagnostics } = await makeLogger();
  const controller = await planningOnlyController(diagnostics);
  const runId = beginManualSyncDiagnostics(diagnostics, "preview-failure")!;
  const plan = await controller.previewManual(runId);
  assert.ok(plan);
  assert.throws(() => presentManualSyncPreview(
    () => { throw new Error("access_token=SENTINEL_PREVIEW"); },
    () => controller.recordPreviewPresented(plan.planId, runId),
    error => controller.recordPreviewPresentationFailure(plan.planId, error, runId),
  ));
  const failure = diagnostics.snapshot().find(event => event.level === "error" && event.fields?.stage === "preview-presentation");
  assert.equal(failure?.runId, runId);
  assert.equal(failure?.fields?.classification, "preview-presentation-failure");
  assert.doesNotMatch(diagnostics.renderText(), /SENTINEL_PREVIEW/);
  assertRunClosed(diagnostics, runId);
});

test("stale Execute rejection is Error-level under the original run and later dismissal cancels it", async () => {
  const { diagnostics } = await makeLogger();
  const controller = await planningOnlyController(diagnostics);
  const firstRunId = beginManualSyncDiagnostics(diagnostics, "first-preview")!;
  const first = await controller.previewManual(firstRunId);
  assert.ok(first);
  controller.recordPreviewPresented(first.planId, firstRunId);
  controller.recordExecuteClick(first.planId, firstRunId);
  const secondRunId = beginManualSyncDiagnostics(diagnostics, "replacement-preview")!;
  const second = await controller.previewManual(secondRunId);
  assert.ok(second);
  const rejected = await controller.requestPreviewAction({ kind: "execute-plan", planId: first.planId }, firstRunId);
  assert.equal(rejected.status, "rejected");
  const failure = diagnostics.snapshot().find(event => event.level === "error" && event.fields?.stage === "execute-request" && event.runId === firstRunId);
  assert.equal(failure?.event, "execute-request-rejected");
  assert.equal(failure?.fields?.classification, "stale-plan");
  controller.recordPreviewDismissed(first.planId, firstRunId);
  assert.ok(diagnostics.snapshot().some(event => event.event === "sync-run-cancelled" && event.runId === firstRunId));
  assertRunClosed(diagnostics, firstRunId);
  controller.recordPreviewDismissed(second.planId, secondRunId);
});

test("identical semantic plans retain independent explicit diagnostic run ownership", async () => {
  const { diagnostics } = await makeLogger();
  const controller = await planningOnlyController(diagnostics, true);
  const run1 = beginManualSyncDiagnostics(diagnostics, "same-plan-first")!;
  const plan1 = await controller.previewManual(run1);
  assert.ok(plan1);
  controller.recordPreviewPresented(plan1.planId, run1);

  const run2 = beginManualSyncDiagnostics(diagnostics, "same-plan-second")!;
  const plan2 = await controller.previewManual(run2);
  assert.ok(plan2);
  controller.recordPreviewPresented(plan2.planId, run2);

  assert.notEqual(run1, run2);
  assert.equal(plan1.planId, plan2.planId);
  const presented = diagnostics.snapshot().filter(event => event.event === "plan-preview-presented");
  assert.deepEqual(presented.map(event => event.runId), [run1, run2]);

  controller.recordExecuteClick(plan1.planId, run1);
  const firstResult = await controller.requestPreviewAction({ kind: "execute-plan", planId: plan1.planId }, run1);
  assert.equal(firstResult.status, "accepted");
  assert.ok(diagnostics.snapshot().some(event => event.event === "execute-click-handler-enter" && event.runId === run1));
  assertRunClosed(diagnostics, run1);

  diagnostics.syncInfo("sync.controller", "second-run-still-open-probe", run2, { stage: "test-probe" });
  assert.equal(typeof diagnostics.snapshot().at(-1)?.elapsedMs, "number");
  controller.recordPreviewDismissed(plan2.planId, run2);
  assert.ok(diagnostics.snapshot().some(event => event.event === "sync-run-cancelled" && event.runId === run2));
  assertRunClosed(diagnostics, run2);
});

for (const [failurePoint, expectedStage] of [
  ["precondition", "operation-precondition-validation"],
  ["pending", "pending-journal"],
  ["mutation", "content-mutation"],
  ["uncertain-journal", "uncertain-state-journal"],
  ["commit", "state-commit"],
] as const) {
  test(`${failurePoint} throw is Error-level at its exact execution substage and closes the run`, async () => {
    const run = await failingExecution(failurePoint);
    assert.ok(run.thrown);
    const failure = run.diagnostics.snapshot().find(event => event.level === "error" && event.fields?.stage === expectedStage);
    assert.equal(failure?.runId, run.runId);
    assert.equal(failure?.component, "sync.execute");
    assert.doesNotMatch(run.diagnostics.renderText(), /SENTINEL_PRECONDITION|SENTINEL_PENDING|SENTINEL_MUTATION|SENTINEL_UNCERTAIN|SENTINEL_COMMIT/);
    if (failurePoint === "mutation") {
      assert.equal(failure?.fields?.classification, "content-mutation-failure");
      assert.equal(failure?.fields?.errorName, "Error");
      assert.equal(failure?.fields?.safeMessage, "Synchronization failure details suppressed.");
      assert.doesNotMatch(run.diagnostics.renderText(), protectedFailurePattern);
    }
    assertRunClosed(run.diagnostics, run.runId);
  });
}

test("returned content-mutation failure emits Error evidence rather than Trace-only evidence", async () => {
  const run = await failingExecution("returned-mutation");
  assert.equal(run.thrown, undefined);
  assert.equal(run.request?.status, "rejected");
  const failures = run.diagnostics.snapshot().filter(event => event.event === "content-mutation-failed");
  assert.ok(failures.some(event => event.level === "trace"));
  assert.ok(failures.some(event => event.level === "error" && event.fields?.stage === "content-mutation" && event.runId === run.runId));
  assertRunClosed(run.diagnostics, run.runId);
});

test("run-lease acquisition throw emits a stage-specific terminal Error and closes the run", async () => {
  const run = await failingExecution("run-lease");
  assert.ok(run.thrown);
  const failure = run.diagnostics.snapshot().find(event => event.level === "error" && event.fields?.stage === "run-lease");
  assert.equal(failure?.event, "sync-run-failed");
  assert.equal(failure?.runId, run.runId);
  assert.equal(failure?.fields?.classification, "run-lease-acquisition-failure");
  assert.doesNotMatch(run.diagnostics.renderText(), /SENTINEL_LEASE/);
  assertRunClosed(run.diagnostics, run.runId);
});
