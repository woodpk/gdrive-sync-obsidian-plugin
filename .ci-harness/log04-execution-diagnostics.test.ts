import assert from "node:assert/strict";
import test from "node:test";

import type {
  AuthoritativeSynchronizationExecutor,
  ExecutablePlannedOperation,
  PlannedOperation,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationPlan,
} from "../../../src/contracts";
import { StateCommitCoordinator } from "../../../src/core/commit-coordinator";
import { AuthorityCompleteExecutionCoordinator } from "../../../src/core/execution-coordinator";
import { DiagnosticLogger, diagnosticPathKey } from "../../../src/diagnostics/diagnostic-logger";
import { createAuthoritativeProductExecutor } from "../../../src/product/authoritative-production-executor-base";
import {
  authoritativeDiagnostics,
  executionDiagnosticEmitterFor,
  withExecutionLifecycleObserver,
} from "../../../src/product/authority-execution-diagnostics";
import { ProductControllerBase } from "../../../src/product/product-controller-base";

const RAW_PATH = "Private/Client Notes/alpha.md";
const OPERATION_ID = "op:log04-focused";
const INTENT_ID = `intent:${OPERATION_ID}`;
const EFFECT_ID = `effect:${OPERATION_ID}:remote-file`;
const REMOTE_OBJECT_ID = "remote:log04-reserved";
const PLAN_ID = "plan:log04-production";
const CONTENT_SENTINEL = "SENTINEL-FILE-CONTENT-LOG04";
const CONTENT_EVIDENCE = { hash: "sha256:log04-content", sizeBytes: 3 } as const;
const MANAGED_REMOTE = {
  rootId: "remote:root",
  vaultIdentity: "vault:log04",
  protocolVersion: "1",
} as never;
const STATE_CONTEXT = {
  expectation: "existing-pairing",
  expectedVaultIdentity: "vault:log04",
  expectedDeviceIdentity: "device:log04",
} as never;

function operation(path = RAW_PATH): PlannedOperation {
  return {
    operationId: OPERATION_ID as PlannedOperation["operationId"],
    kind: "upload-create",
    path: path as PlannedOperation["path"],
    targetSide: "remote",
    contentVersion: {
      path: path as PlannedOperation["path"],
      entityKind: "file",
      content: CONTENT_EVIDENCE as never,
      observationToken: "observation:log04" as never,
    },
    destructive: false,
    preconditions: [],
    reasons: [],
  } as unknown as PlannedOperation;
}

function logger(): DiagnosticLogger {
  return new DiagnosticLogger({
    persistence: {
      loadDiagnostics: async () => undefined,
      saveDiagnostics: async () => undefined,
    },
    level: "trace",
    retentionLimit: 500,
    consoleMirror: false,
    platform: "desktop",
    now: () => new Date("2026-09-09T00:00:00.000Z"),
    monotonicNow: () => 1,
  });
}

type EffectStage = "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified" | "state-committed";

function authorityState(stage?: EffectStage): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: "persist:1",
    semanticGeneration: "generation:1",
    learnedRemoteBatches: [],
    pathConvergence: [],
    localTransactions: [],
    operationIntents: stage ? [{
      operationId: OPERATION_ID,
      intentId: INTENT_ID,
      logicalKind: "single-effect",
      semanticAuthority: { generation: "generation:1" },
      effects: [{
        effectId: EFFECT_ID,
        stage,
        descriptor: {
          kind: "remote-file",
          targetSide: "remote",
          mutationKind: "create",
          targetPath: RAW_PATH,
          remoteMutation: {
            kind: "reserved-file-create",
            intentId: INTENT_ID,
            reservedRemoteObjectId: REMOTE_OBJECT_ID,
            path: RAW_PATH,
            intendedContent: CONTENT_EVIDENCE,
          },
          intendedContent: CONTENT_EVIDENCE,
        },
        ...(stage === "effect-verified" || stage === "state-committed"
          ? { verificationEvidenceRef: "safe-proof:log04" }
          : {}),
      }],
    }] : [],
  } as unknown as SynchronizationAuthorityMetadataV1_1;
}

function trustedAuthority(stage: "effect-verified" | "state-committed"): SynchronizationAuthorityMetadataV1_1 {
  const state = authorityState(stage);
  return {
    ...state,
    operationIntents: state.operationIntents.map(intent => ({
      ...intent,
      effects: intent.effects.map(effect => ({
        ...effect,
        effectId: "effect:op:log04-focused:local-folder",
        descriptor: {
          kind: "local-folder-create",
          targetSide: "local",
          mutationKind: "create",
          intentId: INTENT_ID,
          targetPath: RAW_PATH,
          pathAuthority: {
            generation: "generation:1",
            targetPath: RAW_PATH,
            parentPath: "Private/Client Notes",
            pathComparisonKey: "private/client notes/alpha.md",
            expectedTarget: "absent",
          },
        },
      })),
    })),
  } as unknown as SynchronizationAuthorityMetadataV1_1;
}

class MemoryAuthority implements SynchronizationAuthorityStoreV1_1 {
  value: SynchronizationAuthorityMetadataV1_1;
  private revision = 1;
  failFinalization = false;

  constructor(stage?: EffectStage) { this.value = authorityState(stage); }

  async loadAuthority() { return { status: "trusted" as const, state: this.value }; }

  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1) {
    const finalizing = candidate.operationIntents.some(intent => intent.effects.some(effect => effect.stage === "state-committed"));
    if (this.failFinalization && finalizing) {
      return {
        status: "recovery-required",
        issues: [{ code: "other-semantic-inconsistency", detail: "focused finalization failure" }],
      } as never;
    }
    this.revision += 1;
    const persistenceRevision = `persist:${this.revision}` as never;
    this.value = { ...candidate, persistenceRevision };
    return { status: "saved", persistenceRevision, semanticGeneration: this.value.semanticGeneration } as never;
  }

  async commitBaseTransition() {
    return {
      status: "saved",
      persistenceRevision: this.value.persistenceRevision,
      semanticGeneration: this.value.semanticGeneration,
    } as never;
  }
}

function canonicalState() {
  return {
    schemaVersion: 1,
    stateRevision: "state:1",
    vaultIdentity: "vault:log04",
    deviceIdentity: "device:log04",
    base: [],
    remoteMappings: [],
    tombstones: [],
    operations: [],
    knownDevices: [],
  } as never;
}

async function diagnosticHarness(stage?: EffectStage) {
  const diagnosticLogger = logger();
  await diagnosticLogger.initialize();
  const diagnostics = authoritativeDiagnostics(diagnosticLogger);
  assert.ok(diagnostics.logger);
  assert.ok(diagnostics.observer);
  const runId = diagnosticLogger.beginSyncRun("focused-log04");
  diagnostics.logger.syncInfo("sync.controller", "execution-start", runId, {
    planId: PLAN_ID,
    operationCount: 1,
    stage: "execution",
  });
  diagnostics.logger.syncTrace("sync.execute", "operation-start", runId, {
    operationIndex: 1,
  });
  const rawAuthority = new MemoryAuthority(stage);
  const authority = withExecutionLifecycleObserver(rawAuthority, diagnostics.observer);
  return { diagnosticLogger, diagnostics, runId, rawAuthority, authority };
}

function physicalHarnessOptions(values: {
  readonly outcome?: "verified-effect" | "outcome-unknown";
  readonly validation?: "valid" | "stale" | "blocked" | "recovery-required";
  readonly existingStage?: EffectStage;
  readonly failFinalization?: boolean;
} = {}) {
  return {
    outcome: values.outcome ?? "verified-effect",
    validation: values.validation ?? "valid",
    existingStage: values.existingStage,
    failFinalization: values.failFinalization ?? false,
  } as const;
}

async function realPhysicalHarness(values: Parameters<typeof physicalHarnessOptions>[0] = {}) {
  const options = physicalHarnessOptions(values);
  const d = await diagnosticHarness(options.existingStage);
  d.rawAuthority.failFinalization = options.failFinalization;
  let canonical = canonicalState();
  let dispatchCalls = 0;
  let remoteEntries: unknown[] = options.existingStage
    ? [{
      path: RAW_PATH,
      entityKind: "file",
      remoteObjectId: REMOTE_OBJECT_ID,
      content: CONTENT_EVIDENCE,
      trashed: false,
    }]
    : [];
  const bytes = {
    sizeBytes: 3,
    async *openChunks() { yield new Uint8Array([1, 2, 3]); },
  };
  const identityStateStore = {
    load: async () => ({ status: "trusted", state: canonical }),
    saveTrusted: async (candidate: typeof canonical, expected?: string) => {
      if (expected !== undefined && expected !== String(canonical.stateRevision)) {
        return { status: "stale-revision", actualRevision: canonical.stateRevision };
      }
      canonical = candidate;
      return { status: "saved", stateRevision: candidate.stateRevision };
    },
  } as never;
  const legacy = {
    local: {
      readFile: async () => ({ content: bytes, evidence: CONTENT_EVIDENCE, observationToken: "observation:log04" }),
      observe: async () => ({ status: "present", side: "local", path: RAW_PATH, entityKind: "file", content: CONTENT_EVIDENCE, stability: "stable", observationToken: "observation:log04" }),
    },
    drive: {
      listForReconciliation: async () => ({
        ok: true,
        value: { entries: remoteEntries, completeness: { status: "complete" } },
      }),
    },
    runEvidence: () => ({ managedRemote: MANAGED_REMOTE, remoteEnumerationComplete: true }),
    validatePreconditions: async () => {
      if (options.validation === "valid") return { status: "valid" };
      if (options.validation === "stale") return { status: "stale", failed: [] };
      if (options.validation === "blocked") return { status: "blocked", reason: "focused-blocked" };
      return { status: "recovery-required", reason: "focused-recovery" };
    },
    versionStillCurrent: async () => true,
  } as never;
  const remoteMutation = {
    reserveFileCreateIdentity: async (_root: unknown, intentId: unknown, targetPath: unknown, intendedContent: unknown) => ({
      ok: true,
      value: {
        kind: "reserved-file-create",
        intentId,
        reservedRemoteObjectId: REMOTE_OBJECT_ID,
        path: targetPath,
        intendedContent,
      },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("not used"); },
    createReserved: async (identity: any) => {
      dispatchCalls += 1;
      if (options.outcome === "outcome-unknown") return { status: "outcome-unknown", reason: "focused-uncertain" };
      remoteEntries = [{
        path: identity.path,
        entityKind: "file",
        remoteObjectId: identity.reservedRemoteObjectId,
        content: identity.intendedContent,
        trashed: false,
      }];
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
    updateExisting: async () => { throw new Error("not used"); },
    moveExisting: async () => { throw new Error("not used"); },
    trashExisting: async () => { throw new Error("not used"); },
  } as never;
  const executor = createAuthoritativeProductExecutor(
    legacy,
    d.authority,
    identityStateStore,
    STATE_CONTEXT,
    MANAGED_REMOTE,
    { reliableRemoteMutationPort: remoteMutation } as never,
  );
  const coordinator = new AuthorityCompleteExecutionCoordinator(
    d.authority,
    executor,
    new StateCommitCoordinator(identityStateStore, STATE_CONTEXT),
    identityStateStore,
    STATE_CONTEXT,
  );
  return {
    ...d,
    executor,
    coordinator,
    dispatchCalls: () => dispatchCalls,
    canonical: () => canonical,
  };
}

function eventIndex(records: readonly { readonly event: string }[], event: string): number {
  const index = records.findIndex(record => record.event === event);
  assert.notEqual(index, -1, `missing diagnostic event ${event}`);
  return index;
}

function assertOrdered(records: readonly { readonly event: string }[], events: readonly string[]): void {
  let prior = -1;
  for (const event of events) {
    const index = eventIndex(records, event);
    assert.ok(index > prior, `${event} must occur after ${prior >= 0 ? records[prior]?.event : "start"}`);
    prior = index;
  }
}

test("LOG-04 correlates execution lifecycle with safe path identity and distinguishes post-verification authority failure", async () => {
  const diagnosticLogger = logger();
  await diagnosticLogger.initialize();
  const diagnostics = authoritativeDiagnostics(diagnosticLogger);
  assert.ok(diagnostics.logger);
  assert.ok(diagnostics.observer);

  const runId = diagnosticLogger.beginSyncRun("focused-log04");
  diagnostics.logger.syncTrace("sync.execute", "operation-start", runId, {
    operationIndex: 4,
    planId: "plan:log04-focused",
  });

  const op = operation();
  diagnostics.observer(op, "operation-start");
  diagnostics.observer(op, "operation-precondition-validated", "valid");
  diagnostics.observer(op, "content-mutation-start");
  diagnostics.observer(op, "content-mutation-complete", "durable-verified-success");
  diagnostics.observer(op, "integrity-verification-complete", "verified");
  diagnostics.observer(op, "operation-complete", "recovery-required");
  await diagnosticLogger.flush();

  const records = diagnosticLogger.snapshot().filter(record => record.component === "sync.execute");
  const entry = records.find(record => record.event === "operation-entry");
  assert.ok(entry);
  assert.equal(entry.runId, runId);
  assert.equal(entry.fields?.planId, "plan:log04-focused");
  assert.equal(entry.fields?.operationId, OPERATION_ID);
  assert.equal(entry.fields?.operationIndex, 4);
  assert.equal(entry.fields?.pathKey, diagnosticPathKey(RAW_PATH));

  const completion = records.find(record => record.event === "operation-complete");
  assert.equal(completion?.fields?.classification, "post-verification-authority-unavailable");
  assert.equal(completion?.fields?.result, "recovery-required");

  const rendered = diagnosticLogger.renderText();
  assert.equal(rendered.includes(RAW_PATH), false);
  assert.equal(rendered.includes("path-sha256:"), true);
});

test("LOG-04 exposes durable finalization as effect-verified to state-committed without changing store result", async () => {
  const diagnosticLogger = logger();
  await diagnosticLogger.initialize();
  const diagnostics = authoritativeDiagnostics(diagnosticLogger);
  assert.ok(diagnostics.logger);
  assert.ok(diagnostics.observer);

  const runId = diagnosticLogger.beginSyncRun("focused-log04");
  diagnostics.logger.syncTrace("sync.execute", "operation-start", runId, {
    operationIndex: 0,
    planId: "plan:log04-finalization",
  });

  let current = trustedAuthority("effect-verified");
  const rawStore = {
    loadAuthority: async () => ({ status: "trusted", state: current }),
    saveAuthority: async (state: SynchronizationAuthorityMetadataV1_1) => {
      current = state;
      return {
        status: "saved",
        persistenceRevision: "persist:2",
        semanticGeneration: "generation:1",
      };
    },
    commitBaseTransition: async () => { throw new Error("not used by this focused test"); },
  } as unknown as SynchronizationAuthorityStoreV1_1;

  const wrapped = withExecutionLifecycleObserver(rawStore, diagnostics.observer);
  const op = operation();
  wrapped.executionLifecycleObserver?.(op, "operation-start");
  const loaded = await wrapped.loadAuthority();
  assert.equal(loaded.status, "trusted");

  const candidate = trustedAuthority("state-committed");
  const saved = await wrapped.saveAuthority(candidate, "persist:1" as never, "generation:1" as never);
  assert.equal(saved.status, "saved");
  await diagnosticLogger.flush();

  const effectEvents = diagnosticLogger.snapshot().filter(record => record.component === "sync.effect");
  const start = effectEvents.find(record => record.event === "durable-finalization-start");
  const complete = effectEvents.find(record => record.event === "durable-finalization-complete");
  assert.ok(start);
  assert.ok(complete);
  assert.equal(start.fields?.operationId, OPERATION_ID);
  assert.equal(start.fields?.intentId, INTENT_ID);
  assert.equal(start.fields?.effectId, "effect:op:log04-focused:local-folder");
  assert.equal(start.fields?.fromStage, "effect-verified");
  assert.equal(start.fields?.toStage, "state-committed");
  assert.equal(complete.fields?.commitStatus, "saved");
  assert.equal(complete.fields?.verificationEvidenceRef, "safe-proof:log04");
});

test("LOG-04 execution emitter keeps operation, intent, and effect correlation on exact physical-result classifications", async () => {
  const diagnosticLogger = logger();
  await diagnosticLogger.initialize();
  const diagnostics = authoritativeDiagnostics(diagnosticLogger);
  assert.ok(diagnostics.logger);
  assert.ok(diagnostics.observer);

  const runId = diagnosticLogger.beginSyncRun("focused-log04");
  diagnostics.logger.syncTrace("sync.execute", "operation-start", runId, {
    operationIndex: 2,
    planId: "plan:log04-effect",
  });

  const rawStore = {
    loadAuthority: async () => ({ status: "trusted", state: trustedAuthority("effect-verified") }),
    saveAuthority: async () => ({ status: "conflict" }),
    commitBaseTransition: async () => ({ status: "conflict" }),
  } as unknown as SynchronizationAuthorityStoreV1_1;
  const wrapped = withExecutionLifecycleObserver(rawStore, diagnostics.observer);
  const op = operation();
  wrapped.executionLifecycleObserver?.(op, "operation-start");
  const emit = executionDiagnosticEmitterFor(wrapped);
  assert.ok(emit);

  for (const result of ["verified-effect", "verified-not-applied", "conflict-preserved", "outcome-unknown"] as const) {
    emit(op, "sync.effect", "physical-result-classified", {
      intentId: INTENT_ID,
      effectId: "effect:op:log04-focused:local-folder",
      result,
      classification: result,
      fromStage: "dispatch-authorized",
      toStage: result === "verified-effect" ? "effect-verified" : result === "verified-not-applied" ? undefined : "outcome-unknown",
      observationSource: "focused-test",
    });
  }
  await diagnosticLogger.flush();

  const results = diagnosticLogger.snapshot().filter(record => record.event === "physical-result-classified");
  assert.deepEqual(results.map(record => record.fields?.result), [
    "verified-effect",
    "verified-not-applied",
    "conflict-preserved",
    "outcome-unknown",
  ]);
  for (const record of results) {
    assert.equal(record.fields?.planId, "plan:log04-effect");
    assert.equal(record.fields?.operationId, OPERATION_ID);
    assert.equal(record.fields?.intentId, INTENT_ID);
    assert.equal(record.fields?.effectId, "effect:op:log04-focused:local-folder");
  }
});

test("LOG-04 real physical success is reconstructible in order through durable finalization and final success", async () => {
  const h = await realPhysicalHarness();
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "committed");
  assert.equal(h.dispatchCalls(), 1);
  assert.equal(h.rawAuthority.value.operationIntents[0]?.effects[0]?.stage, "state-committed");
  assert.equal(h.canonical().base.length, 1, "canonical BASE commit must occur before durable finalization completes");
  await h.diagnosticLogger.flush();

  const records = h.diagnosticLogger.snapshot();
  assertOrdered(records, [
    "operation-entry",
    "operation-precondition-validation-start",
    "authority-resolution-start",
    "authority-resolution-complete",
    "operation-precondition-validated",
    "durable-intent-persistence-start",
    "durable-intent-persistence-complete",
    "durable-effect-transition-start",
    "durable-effect-transition-complete",
    "physical-dispatch-start",
    "physical-result-classified",
    "convergence-verification-start",
    "convergence-verification-complete",
    "physical-verification-complete",
    "content-mutation-complete",
    "integrity-verification-complete",
    "state-commit-start",
    "state-commit-complete",
    "durable-finalization-start",
    "durable-finalization-complete",
    "operation-complete",
  ]);

  const correlated = records.filter(record => record.component === "sync.effect");
  assert.ok(correlated.length > 0);
  for (const record of correlated) {
    assert.equal(record.fields?.planId, PLAN_ID);
    assert.equal(record.fields?.operationId, OPERATION_ID);
    if (record.fields?.effectId !== undefined) {
      assert.equal(record.fields.intentId, INTENT_ID);
      assert.equal(record.fields.effectId, EFFECT_ID);
    }
  }
  assert.equal(records.find(record => record.event === "operation-complete")?.fields?.result, "committed");

  h.diagnostics.logger?.syncTrace("sync.execute", "privacy-probe", h.runId, {
    path: RAW_PATH,
    content: CONTENT_SENTINEL,
    body: CONTENT_SENTINEL,
  } as never);
  await h.diagnosticLogger.flush();
  const rendered = h.diagnosticLogger.renderText();
  assert.equal(rendered.includes(RAW_PATH), false);
  assert.equal(rendered.includes(CONTENT_SENTINEL), false);
});

test("LOG-04 stale precondition has no physical-dispatch success evidence", async () => {
  const h = await realPhysicalHarness({ validation: "stale" });
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "stale-precondition");
  assert.equal(h.dispatchCalls(), 0);
  const records = h.diagnosticLogger.snapshot();
  assert.equal(records.some(record => record.event === "physical-dispatch-start"), false);
  assert.equal(records.some(record => record.event === "physical-result-classified" && record.fields?.result === "verified-effect"), false);
});

test("LOG-04 outcome-unknown remains distinct from verified success and is never represented as committed", async () => {
  const h = await realPhysicalHarness({ outcome: "outcome-unknown" });
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "uncertain");
  assert.equal(h.rawAuthority.value.operationIntents[0]?.effects[0]?.stage, "outcome-unknown");
  const classified = h.diagnosticLogger.snapshot().find(record => record.event === "physical-result-classified");
  assert.equal(classified?.fields?.result, "outcome-unknown");
  assert.equal(h.diagnosticLogger.snapshot().some(record => record.event === "durable-finalization-complete"), false);
  assert.equal(h.diagnosticLogger.snapshot().some(record => record.event === "operation-complete" && record.fields?.result === "committed"), false);
});

test("LOG-04 verified physical effect followed by durable finalization failure is distinct from a no-effect failure", async () => {
  const h = await realPhysicalHarness({ failFinalization: true });
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "recovery-required");
  assert.equal(h.dispatchCalls(), 1);
  assert.equal(h.canonical().base.length, 1, "canonical commit must have occurred before finalization failure");
  assert.equal(h.rawAuthority.value.operationIntents[0]?.effects[0]?.stage, "effect-verified");
  const records = h.diagnosticLogger.snapshot();
  assert.ok(records.some(record => record.event === "physical-result-classified" && record.fields?.result === "verified-effect"));
  assert.ok(records.some(record => record.event === "durable-finalization-failed"));
  assert.ok(records.some(record => record.event === "state-commit-failed" && record.fields?.classification === "durable-finalization-failure"));
});

test("LOG-04 existing-intent restart re-observes without falsely logging a new physical dispatch", async () => {
  const h = await realPhysicalHarness({ existingStage: "dispatch-authorized" });
  const result = await h.coordinator.executeOperation(operation());
  assert.equal(result.status, "committed");
  assert.equal(h.dispatchCalls(), 0);
  const records = h.diagnosticLogger.snapshot();
  assert.ok(records.some(record => record.event === "restart-recovery-entry"));
  assert.ok(records.some(record => record.event === "recovery-observation-start"));
  assert.ok(records.some(record => record.event === "physical-result-classified" && record.fields?.observationSource === "restart-recovery"));
  assert.equal(records.some(record => record.event === "physical-dispatch-start"), false);
});

test("LOG-04 controller production execution-start supplies planId to the existing diagnostic seam", async () => {
  const diagnosticLogger = logger();
  await diagnosticLogger.initialize();
  const diagnostics = authoritativeDiagnostics(diagnosticLogger);
  assert.ok(diagnostics.logger);
  const plan: SynchronizationPlan = {
    planId: PLAN_ID as SynchronizationPlan["planId"],
    trigger: "manual",
    operations: [],
    executionDisposition: "requires-user-approval",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
  const canonical = canonicalState();
  const assembly = {
    input: { snapshots: [], state: { status: "trusted", state: canonical } },
    managedRemote: MANAGED_REMOTE,
    remoteEnumeration: { status: "complete" },
    mode: "full",
  } as never;
  const controller = new ProductControllerBase({
    vaultIdentity: "vault:log04" as never,
    deviceIdentity: "device:log04" as never,
    stateContext: STATE_CONTEXT,
    stateStore: { load: async () => ({ status: "trusted", state: canonical }) } as never,
    snapshotAssembler: { assembleFull: async () => assembly } as never,
    executor: {} as never,
    conflictResolver: { assess: async () => ({ kind: "none" }) } as never,
    plannerForTrigger: () => ({ plan: async () => plan }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: { append: async () => undefined, read: async () => [] } as never,
    holderId: "focused-log04",
    diagnostics: diagnostics.logger,
  });
  const runId = diagnosticLogger.beginSyncRun("controller-focused");
  const preview = await controller.previewManual(runId);
  assert.ok(preview);
  await controller.requestPreviewAction({ kind: "execute-plan", planId: preview.planId }, runId);
  await diagnosticLogger.flush();
  const executionStart = diagnosticLogger.snapshot().find(record => record.component === "sync.controller" && record.event === "execution-start");
  assert.equal(executionStart?.fields?.planId, PLAN_ID);
});

test("LOG-04 cancellation, blocked, and recovery-required outcomes retain their result semantics", async () => {
  const cases = [
    [{ status: "cancelled", reason: "focused-cancelled" }, "cancelled"],
    [{ status: "blocking-failure", reason: "focused-blocked" }, "blocked"],
    [{ status: "recovery-required", reason: "focused-recovery" }, "recovery-required"],
  ] as const;

  for (const [execution, expected] of cases) {
    const d = await diagnosticHarness();
    const executor: AuthoritativeSynchronizationExecutor = {
      validatePreconditions: async () => ({ status: "valid" }),
      execute: async () => execution as never,
    };
    const identityStateStore = { load: async () => ({ status: "trusted", state: canonicalState() }) } as never;
    const coordinator = new AuthorityCompleteExecutionCoordinator(
      d.authority,
      executor,
      { commitVerifiedSuccess: async () => { throw new Error("must not commit failed execution"); } } as never,
      identityStateStore,
      STATE_CONTEXT,
    );
    const result = await coordinator.executeOperation(operation());
    assert.equal(result.status, expected);
    const terminal = d.diagnosticLogger.snapshot().find(record => record.event === "operation-complete");
    assert.equal(terminal?.fields?.result, expected);
    assert.equal(d.diagnosticLogger.snapshot().some(record => record.event === "durable-finalization-complete"), false);
  }
});
