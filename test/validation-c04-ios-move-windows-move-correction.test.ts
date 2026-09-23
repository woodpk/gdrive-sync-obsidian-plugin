import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type LocalVaultPort,
  type ObservationToken,
  type PlannedOperation,
  type ProductSurfaceState,
  type SynchronizationPlan,
  type UserAction,
  type VaultPath,
} from "../src/contracts";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  ValidationFixtureManager,
} from "../src/validation/fixture-manager";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";\nimport { ValidationProductionDiagnosticFixture } from "./validation-production-diagnostic-fixture";
import {
  C04_AUTHORITY_CYCLES,
  C04_NEW_RELATIVE_PATH,
  C04_OLD_RELATIVE_PATH,
  createC04ModuleOverrides,
  createC04ScenarioDefinition,
  type C04ParticipantHandoffPort,
} from "../src/validation/scenarios/c04-ios-move-windows-move";
import {
  validationDeviceIdentity,
  validationRunIdentity,
  validationSandboxOwnership,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationRunnerPersistentState,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { ValidationModeRuntime } from "../src/validation/validation-mode-runtime";

const id = <T extends string>(value: string) => contractId<T>(value);
const FIXTURE_ROOT = "__brain_validation__/vh17-c04-correction";
const OLD_PATH = id<"VaultPath">(`${FIXTURE_ROOT}/${C04_OLD_RELATIVE_PATH}`);
const NEW_PATH = id<"VaultPath">(`${FIXTURE_ROOT}/${C04_NEW_RELATIVE_PATH}`);
const STABLE_REMOTE_ID = id<"RemoteObjectId">("drive:c04:stable");

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

type MemoryEntry = { kind: "file"; bytes: Uint8Array } | { kind: "folder" };

class MemoryLocalVault {
  readonly entries = new Map<string, MemoryEntry>();

  readonly port = {
    validatePath: async (path: VaultPath) => ({
      status: "compatible" as const,
      normalizedComparisonPath: String(path).toLowerCase(),
    }),
    observe: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry) return { status: "absent" as const, path };
      return {
        status: "present" as const,
        path,
        entityKind: entry.kind,
        stability: "stable" as const,
        observationToken: id<"ObservationToken">(`token:${String(path)}`) as ObservationToken,
      };
    },
    readFile: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry || entry.kind !== "file") throw new Error(`not a file: ${String(path)}`);
      const bytes = entry.bytes.slice();
      return {
        content: {
          sizeBytes: bytes.byteLength,
          async *openChunks(): AsyncIterable<Uint8Array> { yield bytes; },
        },
        evidence: { sizeBytes: bytes.byteLength },
        stability: "stable" as const,
      };
    },
    createFile: async (path: VaultPath, source: BinaryContentSource) => {
      if (this.entries.has(String(path))) throw new Error("exists");
      this.entries.set(String(path), { kind: "file", bytes: await this.collect(source) });
      return { path };
    },
    replaceFile: async (path: VaultPath, source: BinaryContentSource) => {
      const entry = this.entries.get(String(path));
      if (!entry || entry.kind !== "file") throw new Error("missing");
      this.entries.set(String(path), { kind: "file", bytes: await this.collect(source) });
      return { path };
    },
    createFolder: async (path: VaultPath) => {
      this.entries.set(String(path), { kind: "folder" });
      return { path };
    },
    move: async (fromPath: VaultPath, toPath: VaultPath) => {
      const entry = this.entries.get(String(fromPath));
      if (!entry || this.entries.has(String(toPath))) throw new Error("invalid move");
      this.entries.delete(String(fromPath));
      this.entries.set(String(toPath), entry);
      return { path: toPath };
    },
    trash: async (path: VaultPath) => { this.entries.delete(String(path)); },
  } as unknown as LocalVaultPort;

  private async collect(source: BinaryContentSource): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of source.openChunks()) {
      const copy = chunk.slice();
      chunks.push(copy);
      size += copy.byteLength;
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  }
}

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
  readonly remoteObjectId?: typeof STABLE_REMOTE_ID;
  readonly destructive?: boolean;
}): PlannedOperation {
  return {
    operationId: id<"OperationId">(input.id),
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{ code: "vh17-correction-test", summary: "C04 repaired-runner test plan." }],
  };
}

function plan(planId: string, operations: readonly PlannedOperation[]): SynchronizationPlan {
  return {
    planId: id<"PlanId">(planId),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function successPlans() {
  return {
    mobile: [
      plan("plan:c04:mobile-lineage", [
        operation({
          id: "op:c04:mobile-lineage",
          kind: "upload-create",
          path: OLD_PATH,
          targetSide: "remote",
        }),
      ]),
      plan("plan:c04:mobile-move", [
        operation({
          id: "op:c04:mobile-move",
          kind: "identity-preserving-move",
          path: NEW_PATH,
          targetSide: "remote",
          fromPath: OLD_PATH,
          toPath: NEW_PATH,
          remoteObjectId: STABLE_REMOTE_ID,
        }),
      ]),
    ],
    windows: [
      plan("plan:c04:windows-lineage", [
        operation({
          id: "op:c04:windows-lineage",
          kind: "download-create",
          path: OLD_PATH,
          targetSide: "local",
          remoteObjectId: STABLE_REMOTE_ID,
        }),
      ]),
      plan("plan:c04:windows-move", [
        operation({
          id: "op:c04:windows-move",
          kind: "identity-preserving-move",
          path: NEW_PATH,
          targetSide: "local",
          fromPath: OLD_PATH,
          toPath: NEW_PATH,
          remoteObjectId: STABLE_REMOTE_ID,
        }),
      ]),
    ],
  };
}

function scriptedController(label: "mobile" | "windows", plans: readonly SynchronizationPlan[]) {
  let previewIndex = 0;
  const previewedPlanIds: string[] = [];
  const executedPlanIds: string[] = [];
  const actions: UserAction[] = [];
  const surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };\n  const productionDiagnostics = new ValidationProductionDiagnosticFixture();

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      const observed = plans[previewIndex++];
      if (!observed) throw new Error(`${label} has no scripted plan for preview ${previewIndex}.`);
      previewedPlanIds.push(String(observed.planId));
      return observed;
    },
    previewVerifyReconcile: async () => undefined,
    runAutomatic: async () => undefined,
    request: async action => {
      actions.push(action);
      return { status: "accepted" };
    },
    requestPreviewAction: async (action, diagnosticRunId) => {
      actions.push(action);
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentDiagnosticCorrelation: () => productionDiagnostics.current(),\n    diagnosticSnapshot: () => productionDiagnostics.snapshot(),\n    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("No active run evidence required by C04 focused tests."); },
  };

  return { controller, previewedPlanIds, executedPlanIds, actions };
}

class PassingVerifier {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    return {
      result: { verdict: "pass" } as ValidationStateConvergenceReport["result"],
      evidence: [{
        ref: validationEvidenceRef(`vh17-c04:verification:${this.requests.length}`),
        source: "convergence",
        summary: "Deterministic C04 verifier witness.",
      }],
    };
  }
}

function harness(plans = successPlans()) {
  const run = validationRunIdentity("run:vh17:c04:correction", "C04");
  const mobileDeviceId = validationDeviceIdentity("device:c04:mobile", "iphone").deviceId;
  const windowsDeviceId = validationDeviceIdentity("device:c04:windows", "windows-desktop").deviceId;
  const vault = new MemoryLocalVault();
  const ownership = validationSandboxOwnership({
    resourceId: "vh17-c04-fixture-root",
    surface: "vault-fixture",
    owner: run,
  });
  const fixtures = new ValidationFixtureManager({
    run,
    fixtureRoot: FIXTURE_ROOT,
    ownership,
    local: vault.port,
    authorize: request => ({ status: "authorized", ownership: request.ownership }),
  });

  const mobile = scriptedController("mobile", plans.mobile);
  const windows = scriptedController("windows", plans.windows);
  let active: "mobile" | "windows" = "mobile";
  const handoffs: string[] = [];
  const handoff: C04ParticipantHandoffPort = {
    async handoff(input) {
      handoffs.push(`${input.reason}:${input.target}`);
      active = input.target;
    },
  };
  const productionRuntime = {
    productController: () => active === "mobile" ? mobile.controller : windows.controller,
  };

  const verifier = new PassingVerifier();
  const identityCalls: string[] = [];
  const definition = createC04ScenarioDefinition({ oldPath: OLD_PATH, newPath: NEW_PATH });
  const moduleOverrides = createC04ModuleOverrides({
    fixtureManager: fixtures,
    participantHandoff: handoff,
    verifier,
    stableRemoteIdentity: {
      async resolveStableRemoteObjectId(input) {
        identityCalls.push(String(input.path));
        return input.path === OLD_PATH || input.path === NEW_PATH ? STABLE_REMOTE_ID : undefined;
      },
    },
    evidenceRecorder: {
      async record() {
        return [validationEvidenceRef("vh17-c04:evidence")];
      },
    },
    mobileDeviceId,
    windowsDeviceId,
    oldPath: OLD_PATH,
    newPath: NEW_PATH,
  });

  const runtime = new ValidationModeRuntime({
    productionRuntime,
    definitions: [definition],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides,
    createRunId: () => String(run.runId),
    currentDevice: () => validationDeviceIdentity("device:c04:windows", "windows-desktop"),
  });

  return {
    runtime,
    definition,
    moduleOverrides,
    vault,
    mobile,
    windows,
    verifier,
    handoffs,
    identityCalls,
  };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected real H6B runner result.");
  return result.result;
}

test("VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles", async () => {
  const subject = harness();

  assert.equal(subject.definition.scenarioId, "C04");
  assert.equal(subject.definition.prerequisiteIds.length, 0);
  assert.equal("production-path-driver" in subject.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in subject.moduleOverrides, false);

  const fixedCycles = subject.definition.steps
    .filter(step => step.module === "production-path-driver" || step.module === "plan-assertion-engine")
    .map(step => (step.input as { readonly authorityCycleId?: string } | undefined)?.authorityCycleId)
    .filter((value): value is string => value !== undefined);
  assert.deepEqual(new Set(fixedCycles), new Set(Object.values(C04_AUTHORITY_CYCLES)));

  subject.runtime.setEnabled(true);
  const result = runnerResult(await subject.runtime.startScenario("C04"));
  assert.equal(result.status, "PASS");

  assert.deepEqual(subject.mobile.previewedPlanIds, [
    "plan:c04:mobile-lineage",
    "plan:c04:mobile-move",
  ]);
  assert.deepEqual(subject.mobile.executedPlanIds, subject.mobile.previewedPlanIds);
  assert.deepEqual(subject.windows.previewedPlanIds, [
    "plan:c04:windows-lineage",
    "plan:c04:windows-move",
  ]);
  assert.deepEqual(subject.windows.executedPlanIds, subject.windows.previewedPlanIds);

  assert.deepEqual(subject.handoffs, [
    "trusted-lineage-download:windows",
    "mobile-move:mobile",
    "windows-move:windows",
  ]);
  assert.equal(subject.vault.entries.has(String(OLD_PATH)), false);
  assert.equal(subject.vault.entries.has(String(NEW_PATH)), true);

  assert.equal(subject.verifier.requests.length, 3);
  const lineage = subject.verifier.requests[0]!;
  assert.ok(lineage.state.some(item =>
    item.kind === "remote-content"
    && item.path === OLD_PATH
    && item.remoteObjectId === STABLE_REMOTE_ID
  ));
  const remoteMove = subject.verifier.requests[1]!;
  assert.ok(remoteMove.state.some(item =>
    item.kind === "live-trash-absence-state"
    && item.path === OLD_PATH
    && item.expectedState === "absent"
  ));
  assert.ok(remoteMove.state.some(item =>
    item.kind === "remote-content"
    && item.path === NEW_PATH
    && item.remoteObjectId === STABLE_REMOTE_ID
  ));
  const final = subject.verifier.requests[2]!;
  assert.ok(final.convergence.some(item =>
    item.kind === "cross-device-authority"
    && item.path === NEW_PATH
    && item.expectedRemoteObjectId === STABLE_REMOTE_ID
  ));
  assert.ok(final.convergence.some(item =>
    item.kind === "cross-device-path"
    && item.path === OLD_PATH
    && item.expected === "absent"
  ));
});

test("VH17 correction C04 unexpected move plan fails in fixed assertion before execution", async () => {
  const plans = successPlans();
  plans.mobile[1] = plan("plan:c04:unexpected-mobile-move", [
    operation({
      id: "op:c04:unexpected-mobile-move",
      kind: "download-update",
      path: NEW_PATH,
      targetSide: "local",
      remoteObjectId: STABLE_REMOTE_ID,
    }),
  ]);
  const subject = harness(plans);
  subject.runtime.setEnabled(true);

  const result = runnerResult(await subject.runtime.startScenario("C04"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /identity-preserving-move|forbidden operation|Expected operation/i);
  }

  assert.deepEqual(subject.mobile.executedPlanIds, ["plan:c04:mobile-lineage"]);
  assert.deepEqual(subject.windows.executedPlanIds, ["plan:c04:windows-lineage"]);
  assert.deepEqual(subject.windows.previewedPlanIds, ["plan:c04:windows-lineage"]);
});

test("VH17 correction C04 rejects delete/create substitution and never executes substituted plan", async () => {
  const plans = successPlans();
  plans.mobile[1] = plan("plan:c04:delete-create-substitution", [
    operation({
      id: "op:c04:trash-old",
      kind: "trash-remote",
      path: OLD_PATH,
      targetSide: "remote",
      remoteObjectId: STABLE_REMOTE_ID,
      destructive: true,
    }),
    operation({
      id: "op:c04:create-new",
      kind: "upload-create",
      path: NEW_PATH,
      targetSide: "remote",
    }),
  ]);
  const subject = harness(plans);
  subject.runtime.setEnabled(true);

  const result = runnerResult(await subject.runtime.startScenario("C04"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /forbidden operation|destructive|identity-preserving-move/i);
  }

  assert.deepEqual(subject.mobile.previewedPlanIds, [
    "plan:c04:mobile-lineage",
    "plan:c04:delete-create-substitution",
  ]);
  assert.deepEqual(subject.mobile.executedPlanIds, ["plan:c04:mobile-lineage"]);
  assert.deepEqual(subject.windows.previewedPlanIds, ["plan:c04:windows-lineage"]);
  assert.deepEqual(subject.windows.executedPlanIds, ["plan:c04:windows-lineage"]);
  assert.equal(subject.verifier.requests.length, 1);
  assert.deepEqual(subject.identityCalls, [String(OLD_PATH)]);
});
