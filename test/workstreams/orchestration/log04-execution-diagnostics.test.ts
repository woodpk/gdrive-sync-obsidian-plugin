import assert from "node:assert/strict";
import test from "node:test";

import type {
  PlannedOperation,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthorityStoreV1_1,
} from "../../../src/contracts";
import { DiagnosticLogger, diagnosticPathKey } from "../../../src/diagnostics/diagnostic-logger";
import {
  authoritativeDiagnostics,
  executionDiagnosticEmitterFor,
  withExecutionLifecycleObserver,
} from "../../../src/product/authority-execution-diagnostics";

function operation(path = "Private/Client Notes/alpha.md"): PlannedOperation {
  return {
    operationId: "op:log04-focused" as PlannedOperation["operationId"],
    kind: "download-create",
    path: path as PlannedOperation["path"],
    targetSide: "local",
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
    retentionLimit: 200,
    consoleMirror: false,
    platform: "desktop",
    now: () => new Date("2026-09-09T00:00:00.000Z"),
    monotonicNow: () => 1,
  });
}

function trustedAuthority(stage: "effect-verified" | "state-committed"): SynchronizationAuthorityMetadataV1_1 {
  return {
    persistenceRevision: "persist:1",
    semanticGeneration: "generation:1",
    pathConvergence: [],
    localTransactions: [],
    operationIntents: [{
      operationId: "op:log04-focused",
      intentId: "intent:op:log04-focused",
      logicalKind: "single-effect",
      semanticAuthority: { generation: "generation:1" },
      effects: [{
        effectId: "effect:op:log04-focused:local-folder",
        stage,
        descriptor: {
          kind: "local-folder-create",
          targetSide: "local",
          mutationKind: "create",
          intentId: "intent:op:log04-focused",
          targetPath: "Private/Client Notes/alpha.md",
          pathAuthority: {
            generation: "generation:1",
            targetPath: "Private/Client Notes/alpha.md",
            parentPath: "Private/Client Notes",
            pathComparisonKey: "private/client notes/alpha.md",
            expectedTarget: "absent",
          },
        },
        verificationEvidenceRef: "safe-proof:log04",
      }],
    }],
  } as unknown as SynchronizationAuthorityMetadataV1_1;
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
  diagnostics.observer(op, "operation-precondition-validation-complete", "valid");
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
  assert.equal(entry.fields?.operationId, "op:log04-focused");
  assert.equal(entry.fields?.operationIndex, 4);
  assert.equal(entry.fields?.pathKey, diagnosticPathKey("Private/Client Notes/alpha.md"));

  const completion = records.find(record => record.event === "operation-complete");
  assert.equal(completion?.fields?.classification, "post-verification-authority-unavailable");
  assert.equal(completion?.fields?.result, "recovery-required");

  const rendered = diagnosticLogger.renderText();
  assert.equal(rendered.includes("Private/Client Notes/alpha.md"), false);
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
  assert.equal(start.fields?.operationId, "op:log04-focused");
  assert.equal(start.fields?.intentId, "intent:op:log04-focused");
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
      intentId: "intent:op:log04-focused",
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
    assert.equal(record.fields?.operationId, "op:log04-focused");
    assert.equal(record.fields?.intentId, "intent:op:log04-focused");
    assert.equal(record.fields?.effectId, "effect:op:log04-focused:local-folder");
  }
});
