import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import type {
  BinaryContentSource,
  ContentHash,
  ManagedRemoteIdentity,
  ProductSurfaceState,
  RemoteObjectId,
  SynchronizationPlan,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import type { DiagnosticEvent } from "../src/diagnostics/diagnostic-logger";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import { ValidationProductionDiagnosticFixture } from "./validation-production-diagnostic-fixture";
import {
  validationDeviceId,
  validationDeviceIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerPersistentState,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerApprovedModuleDelegate,
  ValidationRunnerPrerequisiteDelegate,
} from "../src/validation/scenario-runner-module-adapter";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  StateConvergenceVerifier,
  type ValidationDeviceObservationSource,
  type ValidationRemoteObservationSource,
} from "../src/validation/state-convergence-verifier";
import {
  ValidationModeRuntime,
  type ValidationModeModuleOverrides,
} from "../src/validation/validation-mode-runtime";
import {
  C03_AUTHORITY_CYCLES,
  C03_FIXTURE_RELATIVE_PATH,
  C03_LIVE_PACKAGE,
  C03_PREREQUISITE_ID,
  C03_SCENARIO_OPERATIONS,
  createC03ScenarioDefinition,
  createC03VerificationRequest,
  verifyC03VerifiedReplacementCommitOrdering,
} from "../src/validation/scenarios/c03-ios-update-windows-download";

function revisionOf(value: unknown): number | null {
  if (value === null || value === undefined || typeof value !== "object") return null;
  const revision = (value as { readonly revision?: unknown }).revision;
  return typeof revision === "number" ? revision : null;
}

class MemoryRunnerStateStore implements ValidationRunnerStateStore {
  value: ValidationRunnerPersistentState | null = null;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    if (revisionOf(this.value) !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    return true;
  }
}

class MemoryResumeAdoptionStore implements ValidationRunnerResumeAdoptionStore {
  value: ValidationRunnerResumeAdoptionJournal | null = null;

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerResumeAdoptionJournal,
  ): Promise<boolean> {
    if (revisionOf(this.value) !== expectedRevision) return false;
    this.value = structuredClone(next);
    return true;
  }
}

const fixturePath = contractId<"VaultPath">(`validation/c03/${C03_FIXTURE_RELATIVE_PATH}`) as VaultPath;
const unrelatedPath = contractId<"VaultPath">("validation/c03/protected-unrelated.md") as VaultPath;
const remoteObjectId = contractId<"RemoteObjectId">("remote:c03:fixture") as RemoteObjectId;
const unrelatedRemoteObjectId = contractId<"RemoteObjectId">("remote:c03:unrelated") as RemoteObjectId;
const mobileDeviceId = validationDeviceId("device:c03:mobile");
const windowsDeviceId = validationDeviceId("device:c03:windows");
const remoteIdentity: ManagedRemoteIdentity = {
  rootId: contractId<"RemoteObjectId">("remote:c03:root"),
  vaultIdentity: contractId<"VaultIdentity">("vault:c03"),
  protocolVersion: contractId<"ProtocolVersion">("1"),
};

const baseBytes = new TextEncoder().encode("C03 baseline\n");
const editedBytes = new TextEncoder().encode("C03 edited on mobile\n");
const unrelatedBytes = new TextEncoder().encode("unrelated protected bytes\n");

function hash(bytes: Uint8Array): ContentHash {
  return contractId<"ContentHash">(`sha256:${createHash("sha256").update(bytes).digest("hex")}`) as ContentHash;
}

const baseHash = hash(baseBytes);
const editedHash = hash(editedBytes);
const unrelatedHash = hash(unrelatedBytes);

function binary(bytes: Uint8Array): BinaryContentSource {
  return {
    sizeBytes: bytes.byteLength,
    async *openChunks() {
      yield bytes;
    },
  };
}

function operation(
  id: string,
  kind: "upload-update" | "download-update",
  targetSide: "remote" | "local",
): SynchronizationPlan["operations"][number] {
  return {
    operationId: contractId<"OperationId">(id),
    kind,
    path: fixturePath,
    targetSide,
    remoteObjectId,
    destructive: false,
    preconditions: [],
    reasons: [],
  };
}

function mobilePlan(): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">("plan:c03:mobile"),
    trigger: "manual",
    operations: [operation("op:c03:mobile", "upload-update", "remote")],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function windowsPlan(kind: "download-update" | "upload-update" = "download-update"): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(`plan:c03:windows:${kind}`),
    trigger: "manual",
    operations: [operation(`op:c03:windows:${kind}`, kind, kind === "download-update" ? "local" : "remote")],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

interface World {
  mobileBytes: Uint8Array;
  windowsBytes: Uint8Array;
  remoteBytes: Uint8Array;
  unrelatedLocalBytes: Uint8Array;
  unrelatedRemoteBytes: Uint8Array;
  mobileEdited: boolean;
  mobileSynced: boolean;
  handedOff: boolean;
  windowsSynced: boolean;
  windowsDiagnosticRunId?: number;
  windowsDiagnostics: DiagnosticEvent[];
}

function freshWorld(): World {
  return {
    mobileBytes: baseBytes,
    windowsBytes: baseBytes,
    remoteBytes: baseBytes,
    unrelatedLocalBytes: unrelatedBytes,
    unrelatedRemoteBytes: unrelatedBytes,
    mobileEdited: false,
    mobileSynced: false,
    handedOff: false,
    windowsSynced: false,
    windowsDiagnostics: [],
  };
}

function diagnostic(diagnosticRunId: number, sequence: number, event: string, fields: DiagnosticEvent["fields"]): DiagnosticEvent {
  return {
    timestamp: `2026-09-18T23:00:0${sequence}.000-04:00`,
    sequence,
    level: "trace",
    component: event === "sync-run-complete" ? "sync.controller" : "sync.execute",
    event,
    runId: diagnosticRunId,
    platform: "desktop",
    fields,
  };
}

function productionFixture(world: World, windowsObservedPlan: SynchronizationPlan) {
  const plans = [mobilePlan(), windowsObservedPlan] as const;
  let previewIndex = 0;
  const calls: string[] = [];
  const previewedPlanIds: string[] = [];
  const executedPlanIds: string[] = [];
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
  const productionDiagnostics = new ValidationProductionDiagnosticFixture();

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      if (previewIndex === 0) {
        assert.equal(world.mobileEdited, true, "mobile edit must precede mobile production preview");
      } else {
        assert.equal(world.mobileSynced, true, "mobile production execution must precede Windows preview");
        assert.equal(world.handedOff, true, "cross-device handoff must precede Windows preview");
      }
      const observed = plans[Math.min(previewIndex, plans.length - 1)]!;
      previewIndex += 1;
      calls.push("preview-manual");
      previewedPlanIds.push(String(observed.planId));
      productionDiagnostics.begin("manual", observed.planId);
      return observed;
    },
    previewVerifyReconcile: async () => {
      throw new Error("C03 must use manual production preview.");
    },
    runAutomatic: async () => {
      throw new Error("C03 must not invoke automatic synchronization.");
    },
    request: async action => {
      calls.push(`request:${action.kind}`);
      return { status: "accepted" };
    },
    requestPreviewAction: async (action, diagnosticRunId) => {
      calls.push(`execute:${String(action.planId)}`);
      executedPlanIds.push(String(action.planId));
      if (action.planId === plans[0].planId) {
        assert.equal(world.mobileEdited, true);
        world.remoteBytes = world.mobileBytes;
        world.mobileSynced = true;
      } else if (action.planId === plans[1].planId) {
        assert.equal(world.handedOff, true);
        assert.notEqual(diagnosticRunId, undefined, "Windows execution must carry its exact H6C production diagnostic run ID.");
        if (diagnosticRunId === undefined) throw new Error("Windows execution omitted its exact H6C production diagnostic run ID.");
        world.windowsDiagnosticRunId = diagnosticRunId;
        world.windowsBytes = world.remoteBytes;
        world.windowsSynced = true;
        world.windowsDiagnostics = [
          diagnostic(diagnosticRunId, 1, "integrity-verification-complete", {
            operationKind: "download-update",
            operationId: "op:c03:windows:download-update",
            remoteObjectId: String(remoteObjectId),
            result: "verified",
          }),
          diagnostic(diagnosticRunId, 2, "state-commit-complete", {
            operationKind: "download-update",
            operationId: "op:c03:windows:download-update",
            remoteObjectId: String(remoteObjectId),
            commitStatus: "committed",
          }),
        ];
      } else {
        throw new Error("Unexpected plan ID reached production execution.");
      }
      if (diagnosticRunId !== undefined) {
        productionDiagnostics.complete(diagnosticRunId);
        if (action.planId === plans[1].planId) {
          const terminal = productionDiagnostics.snapshot().find(event =>
            event.runId === diagnosticRunId
            && event.component === "sync.controller"
            && event.event === "sync-run-complete"
          );
          assert.ok(terminal, "Windows exact production terminal diagnostic must exist for the captured run.");
          world.windowsDiagnostics.push(terminal);
        }
      }
      return { status: "accepted" };
    },
    currentDiagnosticCorrelation: () => productionDiagnostics.current(),
    diagnosticSnapshot: () => productionDiagnostics.snapshot(),
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => ({ managedRemote: remoteIdentity, remoteEnumerationComplete: true }),
  };

  return {
    runtime: { productController: () => controller },
    calls,
    previewedPlanIds,
    executedPlanIds,
  };
}

function authorityState(world: World, device: "mobile" | "windows") {
  const bytes = device === "mobile" ? world.mobileBytes : world.windowsBytes;
  const contentHash = hash(bytes);
  const generation = contractId<"SemanticStateGeneration">("generation:c03:2");
  const fingerprint = contractId<"BaseFingerprint">("fingerprint:c03:2");
  return {
    schemaVersion: 1,
    stateRevision: contractId<"StateRevision">("state:c03:2"),
    vaultIdentity: remoteIdentity.vaultIdentity,
    deviceIdentity: contractId<"DeviceIdentity">(`device-state:c03:${device}`),
    base: [{
      path: fixturePath,
      entityKind: "file",
      localExisted: true,
      remoteExisted: true,
      content: { hash: contentHash, sizeBytes: bytes.byteLength },
      remoteObjectId,
    }],
    remoteMappings: [{ path: fixturePath, remoteObjectId, entityKind: "file" }],
    tombstones: [],
    operations: [],
    knownDevices: [],
    authoritySchemaVersion: 2,
    persistenceRevision: contractId<"StateRevision">("persistence:c03:2"),
    semanticGeneration: generation,
    operationIntents: [],
    learnedRemoteBatches: [],
    pathConvergence: [{ path: fixturePath, state: { status: "converged", generation, baseFingerprint: fingerprint } }],
    baseAuthority: [{ path: fixturePath, fingerprint }],
    learnedRemoteReductions: [],
  };
}

function localSource(world: World, device: "mobile" | "windows"): ValidationDeviceObservationSource {
  const deviceId = device === "mobile" ? mobileDeviceId : windowsDeviceId;
  const bytesFor = (path: VaultPath) => {
    if (path === fixturePath) return device === "mobile" ? world.mobileBytes : world.windowsBytes;
    if (path === unrelatedPath) return world.unrelatedLocalBytes;
    return undefined;
  };
  return {
    deviceId,
    local: {
      enumerate: async () => ({ entries: [], completeness: { status: "complete" } }),
      observe: async (path: VaultPath) => {
        const bytes = bytesFor(path);
        return bytes
          ? {
              status: "present",
              side: "local",
              path,
              entityKind: "file",
              content: { hash: hash(bytes) },
              stability: "stable",
              observationToken: contractId<"ObservationToken">(`token:${String(path)}`),
            }
          : { status: "absent", side: "local", path };
      },
      readFileBypassingEvidenceCache: async (path: VaultPath) => {
        const bytes = bytesFor(path);
        if (!bytes) throw new Error(`Missing test bytes at ${String(path)}`);
        return {
          content: binary(bytes),
          evidence: { hash: hash(bytes) },
          stability: "stable",
          observationToken: contractId<"ObservationToken">(`token:${String(path)}`),
        };
      },
    },
    authority: {
      loadAuthority: async () => ({ status: "trusted", state: authorityState(world, device) }),
    },
    diagnostics: {
      snapshot: () => device === "windows" ? world.windowsDiagnostics : [],
    },
  } as unknown as ValidationDeviceObservationSource;
}

function remoteSource(world: World): ValidationRemoteObservationSource {
  return {
    identity: remoteIdentity,
    drive: {
      validateManagedRoot: async () => ({ ok: true, value: { status: "valid", identity: remoteIdentity } }),
      listForReconciliation: async () => ({
        ok: true,
        value: {
          entries: [
            {
              path: fixturePath,
              entityKind: "file",
              remoteObjectId,
              content: { hash: hash(world.remoteBytes) },
              trashed: false,
            },
            {
              path: unrelatedPath,
              entityKind: "file",
              remoteObjectId: unrelatedRemoteObjectId,
              content: { hash: hash(world.unrelatedRemoteBytes) },
              trashed: false,
            },
          ],
          completeness: { status: "complete" },
        },
      }),
      download: async (id: RemoteObjectId) => {
        if (id === remoteObjectId) {
          return {
            ok: true,
            value: {
              content: binary(world.remoteBytes),
              remoteObjectId,
              evidence: { hash: hash(world.remoteBytes) },
            },
          };
        }
        if (id === unrelatedRemoteObjectId) {
          return {
            ok: true,
            value: {
              content: binary(world.unrelatedRemoteBytes),
              remoteObjectId: unrelatedRemoteObjectId,
              evidence: { hash: hash(world.unrelatedRemoteBytes) },
            },
          };
        }
        return { ok: false, signal: { kind: "not-found", remoteObjectId: id } };
      },
    },
  } as unknown as ValidationRemoteObservationSource;
}

function fixtureDelegate(world: World): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      assert.equal(request.operation, C03_SCENARIO_OPERATIONS.mobileEdit);
      assert.equal((request.input as { fixtureId?: string }).fixtureId, "c03-fixture");
      world.mobileBytes = editedBytes;
      world.mobileEdited = true;
      return { status: "completed", evidenceRefs: [] };
    },
  };
}

function coordinatorDelegate(world: World): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      assert.equal(request.operation, C03_SCENARIO_OPERATIONS.handoffToWindows);
      assert.equal(world.mobileSynced, true);
      assert.equal(hash(world.remoteBytes), editedHash);
      world.handedOff = true;
      return {
        status: "completed",
        evidenceRefs: [validationEvidenceRef("vh16-c03:handoff")],
      };
    },
  };
}

function verifierDelegate(world: World): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      assert.equal(request.operation, C03_SCENARIO_OPERATIONS.verify);
      assert.equal(world.windowsSynced, true);

      const verifier = new StateConvergenceVerifier({
        devices: [localSource(world, "mobile"), localSource(world, "windows")],
        remote: remoteSource(world),
      });
      const windowsDiagnosticRunId = world.windowsDiagnosticRunId;
      if (windowsDiagnosticRunId === undefined) {
        return {
          status: "blocked",
          summary: "C03 exact Windows production diagnostic run ID was not captured.",
          evidenceRefs: [],
        };
      }

      const verification = createC03VerificationRequest(request.run, {
        fixturePath,
        editedHash,
        editedSizeBytes: editedBytes.byteLength,
        remoteObjectId,
        remoteIdentity,
        mobileDeviceId,
        windowsDeviceId,
        unrelatedLocal: [{
          deviceId: windowsDeviceId,
          path: unrelatedPath,
          state: "file",
          content: { hash: unrelatedHash, sizeBytes: unrelatedBytes.byteLength },
        }],
        unrelatedRemote: [{
          path: unrelatedPath,
          state: "live",
          remoteObjectId: unrelatedRemoteObjectId,
          content: { hash: unrelatedHash, sizeBytes: unrelatedBytes.byteLength },
        }],
        windowsTerminalDiagnostic: {
          deviceId: windowsDeviceId,
          component: "sync.controller",
          event: "sync-run-complete",
          diagnosticRunId: windowsDiagnosticRunId,
          expectedFields: { stage: "terminal", result: "complete" },
        },
      });
      const report = await verifier.verify(verification);
      if (report.result.verdict !== "pass") {
        return {
          status: report.result.verdict === "fail" ? "failed" : "blocked",
          summary: "C03 objective state/convergence verification did not pass.",
          evidenceRefs: report.evidence.map(item => item.ref),
        };
      }

      const ordering = verifyC03VerifiedReplacementCommitOrdering(world.windowsDiagnostics, remoteObjectId);
      if (ordering.status !== "verified") {
        return {
          status: ordering.status === "failed" ? "failed" : "blocked",
          summary: ordering.reason,
          evidenceRefs: report.evidence.map(item => item.ref),
        };
      }
      return {
        status: "completed",
        evidenceRefs: [
          ...report.evidence.map(item => item.ref),
          validationEvidenceRef(`vh16-c03:ordering:${ordering.verificationSequence}:${ordering.stateCommitSequence}`),
        ],
      };
    },
  };
}

const recorder: ValidationRunnerApprovedModuleDelegate = {
  async execute(request) {
    assert.equal(request.operation, C03_SCENARIO_OPERATIONS.recordEvidence);
    return {
      status: "completed",
      evidenceRefs: [validationEvidenceRef("vh16-c03:evidence")],
    };
  },
};

const prerequisites: ValidationRunnerPrerequisiteDelegate = {
  async evaluate(input) {
    return input.prerequisiteIds.map(prerequisiteId => ({
      prerequisiteId,
      status: prerequisiteId === C03_PREREQUISITE_ID ? "satisfied" as const : "blocked" as const,
      summary: prerequisiteId === C03_PREREQUISITE_ID
        ? "Harness-owned fixture has trusted C02-equivalent baseline."
        : "Unexpected prerequisite.",
      evidenceRefs: prerequisiteId === C03_PREREQUISITE_ID
        ? [validationEvidenceRef("vh16-c03:c02-baseline")]
        : [],
    }));
  },
};

function runtimeFor(world: World, observedWindowsPlan: SynchronizationPlan) {
  const production = productionFixture(world, observedWindowsPlan);
  const moduleOverrides: ValidationModeModuleOverrides = {
    "fixture-manager": fixtureDelegate(world),
    "cross-device-coordinator": coordinatorDelegate(world),
    "state-convergence-verifier": verifierDelegate(world),
    "scenario-evidence-recorder": recorder,
  };
  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [createC03ScenarioDefinition({
      fixtureId: "c03-fixture",
      fixturePath,
      remoteObjectId,
    })],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites,
    moduleOverrides,
    currentDevice: () => validationDeviceIdentity("device:c03:windows", "windows-desktop"),
    createRunId: () => "run:vh16:c03:correction-01",
  });
  return { runtime, production };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected validation runner result.");
  return result.result;
}

test("VH16 correction C03 is declarative over fixed H6B preview/assert/execute operations", () => {
  const definition = createC03ScenarioDefinition({
    fixtureId: "c03-fixture",
    fixturePath,
    remoteObjectId,
  });
  assert.equal(C03_LIVE_PACKAGE, "C03-ios-update-windows-download.md");
  assert.equal(definition.scenarioId, "C03");
  assert.deepEqual(definition.prerequisiteIds, ["C02:PASS"]);

  const productionSteps = definition.steps.filter(step =>
    step.module === "production-path-driver" || step.module === "plan-assertion-engine",
  );
  assert.deepEqual(productionSteps.map(step => [step.module, step.operation]), [
    ["production-path-driver", "preview-manual"],
    ["plan-assertion-engine", "assert-observed-plan"],
    ["production-path-driver", "execute-asserted-plan"],
    ["production-path-driver", "preview-manual"],
    ["plan-assertion-engine", "assert-observed-plan"],
    ["production-path-driver", "execute-asserted-plan"],
  ]);
  assert.deepEqual(productionSteps.map(step => (step.input as { authorityCycleId?: string }).authorityCycleId), [
    C03_AUTHORITY_CYCLES.mobile,
    C03_AUTHORITY_CYCLES.mobile,
    C03_AUTHORITY_CYCLES.mobile,
    C03_AUTHORITY_CYCLES.windows,
    C03_AUTHORITY_CYCLES.windows,
    C03_AUTHORITY_CYCLES.windows,
  ]);
  for (const step of productionSteps.filter(step => step.operation === "execute-asserted-plan")) {
    assert.deepEqual(Object.keys(step.input as Record<string, unknown>), ["authorityCycleId"]);
  }

  const source = readFileSync("src/validation/scenarios/c03-ios-update-windows-download.ts", "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/production-path-driver["']/);
  assert.doesNotMatch(source, /from ["']\.\.\/plan-assertion-engine["']/);
  assert.doesNotMatch(source, /ValidationProductionPathDriver/);
  assert.doesNotMatch(source, /assertValidationPlan/);
});

test("VH16 correction C03 success runs both exact plans through the real repaired ValidationModeRuntime handoff", async () => {
  const world = freshWorld();
  const windows = windowsPlan();
  const { runtime, production } = runtimeFor(world, windows);
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C03"));
  assert.equal(result.status, "PASS");
  assert.deepEqual(production.previewedPlanIds, [
    String(mobilePlan().planId),
    String(windows.planId),
  ]);
  assert.deepEqual(production.executedPlanIds, production.previewedPlanIds);
  assert.deepEqual(production.calls, [
    "preview-manual",
    `execute:${String(mobilePlan().planId)}`,
    "preview-manual",
    `execute:${String(windows.planId)}`,
  ]);
  assert.equal(hash(world.windowsBytes), editedHash);
  assert.equal(hash(world.remoteBytes), editedHash);
  assert.equal(hash(world.unrelatedLocalBytes), unrelatedHash);
  assert.equal(hash(world.unrelatedRemoteBytes), unrelatedHash);
  assert.deepEqual(
    verifyC03VerifiedReplacementCommitOrdering(world.windowsDiagnostics, remoteObjectId).status,
    "verified",
  );
});

test("VH16 correction C03 unexpected Windows plan fails in the fixed assertion step before Windows execution", async () => {
  const world = freshWorld();
  const unexpected = windowsPlan("upload-update");
  const { runtime, production } = runtimeFor(world, unexpected);
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C03"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /download-update|forbidden operation kind|Expected operation was not observed/i);
  }
  assert.deepEqual(production.previewedPlanIds, [
    String(mobilePlan().planId),
    String(unexpected.planId),
  ]);
  assert.deepEqual(production.executedPlanIds, [String(mobilePlan().planId)]);
  assert.equal(world.windowsSynced, false);
});

test("VH16 correction C03 execution cannot proceed when its fixed assertion-derived authorization is absent", async () => {
  const world = freshWorld();
  const production = productionFixture(world, windowsPlan());
  const full = createC03ScenarioDefinition({
    fixtureId: "c03-fixture",
    fixturePath,
    remoteObjectId,
  });
  const windowsAssertIndex = full.steps.findIndex(step =>
    step.module === "plan-assertion-engine"
    && (step.input as { authorityCycleId?: string }).authorityCycleId === C03_AUTHORITY_CYCLES.windows,
  );
  assert.ok(windowsAssertIndex > 0);
  const definition = {
    ...full,
    steps: full.steps.filter((_, index) => index !== windowsAssertIndex),
  };

  const runtime = new ValidationModeRuntime({
    productionRuntime: production.runtime,
    definitions: [definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites,
    moduleOverrides: {
      "fixture-manager": fixtureDelegate(world),
      "cross-device-coordinator": coordinatorDelegate(world),
      "state-convergence-verifier": verifierDelegate(world),
      "scenario-evidence-recorder": recorder,
    },
    createRunId: () => "run:vh16:c03:no-auth",
  });
  runtime.setEnabled(true);

  const result = runnerResult(await runtime.startScenario("C03"));
  assert.equal(result.status, "BLOCKED");
  if (result.status === "BLOCKED") {
    assert.match(result.reason.summary, /No asserted execution authorization/);
  }
  assert.deepEqual(production.executedPlanIds, [String(mobilePlan().planId)]);
  assert.equal(world.windowsSynced, false);
});
