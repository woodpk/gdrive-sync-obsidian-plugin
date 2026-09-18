import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type ObservationToken,
  type LocalVaultPort,
  type PlannedOperation,
  type ProductSurfaceState,
  type SynchronizationPlan,
  type UserAction,
  type VaultPath,
} from "../src/contracts";
import type { ExecutorRunEvidence } from "../src/product/production-executor";
import {
  ValidationFixtureManager,
} from "../src/validation/fixture-manager";
import {
  ValidationProductionPathDriver,
  type ValidationProductionControllerPort,
} from "../src/validation/production-path-driver";
import {
  C04_NEW_RELATIVE_PATH,
  C04_OLD_RELATIVE_PATH,
  C04_SCENARIO_DEFINITION,
  C04_SCENARIO_REGISTRATION,
  C04ScenarioExecutor,
  c04FixturePath,
  type C04VerifierPort,
} from "../src/validation/scenarios/c04-ios-move-windows-move";
import {
  validationDeviceIdentity,
  validationRunIdentity,
  validationSandboxOwnership,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";

const id = <T extends string>(value: string) => contractId<T>(value);
const FIXTURE_ROOT = "__brain_validation__/run-c04";
const OLD_PATH = c04FixturePath(FIXTURE_ROOT, C04_OLD_RELATIVE_PATH);
const NEW_PATH = c04FixturePath(FIXTURE_ROOT, C04_NEW_RELATIVE_PATH);
const STABLE_REMOTE_ID = id<"RemoteObjectId">("drive:c04:stable");

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly remoteObjectId?: ReturnType<typeof remoteId>;
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
  readonly destructive?: boolean;
}): PlannedOperation {
  return {
    operationId: id<"OperationId">(input.id),
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{ code: "vh17-test", summary: "VH17 C04 deterministic scenario fixture." }],
  };
}

function remoteId(value: string) {
  return id<"RemoteObjectId">(value);
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

class MemoryLocalVault {
  readonly entries = new Map<string, { kind: "file"; bytes: Uint8Array } | { kind: "folder" }>();

  readonly port = {
    validatePath: async (path: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(path).toLowerCase() }),
    observe: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry) return { status: "absent" as const, path };
      return {
        status: "present" as const,
        path,
        entityKind: entry.kind,
        stability: "stable" as const,
        observationToken: id<"ObservationToken">("token:" + String(path)) as ObservationToken,
      };
    },
    readFile: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry || entry.kind !== "file") throw new Error("not a file");
      const bytes = entry.bytes.slice();
      return {
        content: { sizeBytes: bytes.byteLength, async *openChunks(): AsyncIterable<Uint8Array> { yield bytes; } },
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
      const existing = this.entries.get(String(path));
      if (!existing || existing.kind !== "file") throw new Error("missing");
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
    let length = 0;
    for await (const chunk of source.openChunks()) { chunks.push(chunk.slice()); length += chunk.byteLength; }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  }
}

function fixtureManager(run: ReturnType<typeof validationRunIdentity>, vault: MemoryLocalVault): ValidationFixtureManager {
  const ownership = validationSandboxOwnership({ resourceId: "c04-fixture-root", surface: "vault-fixture", owner: run });
  return new ValidationFixtureManager({
    run,
    fixtureRoot: FIXTURE_ROOT,
    ownership,
    local: vault.port,
    authorize: request => ({ status: "authorized", ownership: request.ownership }),
  });
}

function scriptedDriver(plans: readonly SynchronizationPlan[]) {
  let index = 0;
  let currentPlan: SynchronizationPlan | undefined;
  const previewed: string[] = [];
  const actions: UserAction[] = [];
  const surface = (): ProductSurfaceState => ({ status: { kind: "idle-ready" }, conflicts: [], ...(currentPlan ? { planPreview: currentPlan } : {}) });
  const evidence: ExecutorRunEvidence = {
    managedRemote: {
      rootId: remoteId("drive:c04:root"),
      vaultIdentity: id<"VaultIdentity">("vault:c04"),
      protocolVersion: id<"ProtocolVersion">("1"),
    },
    remoteEnumerationComplete: true,
  };
  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      currentPlan = plans[index++];
      if (currentPlan) previewed.push(String(currentPlan.planId));
      return currentPlan;
    },
    previewVerifyReconcile: async () => undefined,
    runAutomatic: async () => undefined,
    request: async action => { actions.push(action); return { status: "accepted" as const }; },
    requestPreviewAction: async action => { actions.push(action); return { status: "accepted" as const }; },
    currentSurface: surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => evidence,
  };
  return {
    driver: new ValidationProductionPathDriver({ productController: () => controller }),
    previewed,
    actions,
  };
}

class PassingVerifier implements C04VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    return {
      result: { verdict: "pass" } as unknown as ValidationStateConvergenceReport["result"],
      evidence: [],
    };
  }
}

function successPlans() {
  const mobile = [
    plan("plan:c04:mobile-seed", [operation({ id: "op:c04:mobile-seed", kind: "upload-create", path: OLD_PATH, targetSide: "remote" })]),
    plan("plan:c04:mobile-move", [operation({
      id: "op:c04:mobile-move",
      kind: "identity-preserving-move",
      path: NEW_PATH,
      targetSide: "remote",
      remoteObjectId: STABLE_REMOTE_ID,
      fromPath: OLD_PATH,
      toPath: NEW_PATH,
    })]),
  ];
  const windows = [
    plan("plan:c04:windows-seed", [operation({ id: "op:c04:windows-seed", kind: "download-create", path: OLD_PATH, targetSide: "local", remoteObjectId: STABLE_REMOTE_ID })]),
    plan("plan:c04:windows-move", [operation({
      id: "op:c04:windows-move",
      kind: "identity-preserving-move",
      path: NEW_PATH,
      targetSide: "local",
      remoteObjectId: STABLE_REMOTE_ID,
      fromPath: OLD_PATH,
      toPath: NEW_PATH,
    })]),
  ];
  return { mobile, windows };
}

function executorFixture(plans = successPlans()) {
  const run = validationRunIdentity("run:vh17:c04", "C04");
  const mobileDeviceId = validationDeviceIdentity("device:c04:mobile", "iphone").deviceId;
  const windowsDeviceId = validationDeviceIdentity("device:c04:windows", "windows-desktop").deviceId;
  const vault = new MemoryLocalVault();
  const mobile = scriptedDriver(plans.mobile);
  const windows = scriptedDriver(plans.windows);
  const verifier = new PassingVerifier();
  const executor = new C04ScenarioExecutor({
    run,
    mobileDeviceId,
    windowsDeviceId,
    mobileFixtures: fixtureManager(run, vault),
    mobileProduction: mobile.driver,
    windowsProduction: windows.driver,
    verifier,
  });
  return { executor, vault, mobile, windows, verifier, mobileDeviceId, windowsDeviceId };
}

test("VH17 C04 is registered exactly as C04 and self-establishes trusted lineage instead of requiring live C03", () => {
  assert.equal(C04_SCENARIO_REGISTRATION.scenarioId, "C04");
  assert.strictEqual(C04_SCENARIO_REGISTRATION.definition, C04_SCENARIO_DEFINITION);
  assert.equal(C04_SCENARIO_DEFINITION.scenarioId, "C04");
  assert.deepEqual(C04_SCENARIO_DEFINITION.prerequisiteIds, []);
  assert.equal(new Set(C04_SCENARIO_DEFINITION.steps.map(step => String(step.stepId))).size, C04_SCENARIO_DEFINITION.steps.length);
  assert.equal(C04_SCENARIO_DEFINITION.steps.at(-1)?.module, "scenario-evidence-recorder");
});

test("VH17 C04 establishes trusted lineage, preserves the Drive ID, and requires identity-preserving move plans on mobile and Windows", async () => {
  const subject = executorFixture();
  const result = await subject.executor.execute();

  assert.equal(result.status, "completed");
  if (result.status !== "completed") return;
  assert.equal(result.remoteObjectId, STABLE_REMOTE_ID);
  assert.equal(result.oldPath, OLD_PATH);
  assert.equal(result.newPath, NEW_PATH);
  assert.match(String(result.contentHash), /^sha256:[0-9a-f]{64}$/);
  assert.equal(subject.vault.entries.has(String(OLD_PATH)), false);
  assert.equal(subject.vault.entries.has(String(NEW_PATH)), true);

  assert.deepEqual(subject.mobile.previewed, ["plan:c04:mobile-seed", "plan:c04:mobile-move"]);
  assert.deepEqual(subject.windows.previewed, ["plan:c04:windows-seed", "plan:c04:windows-move"]);
  assert.deepEqual(subject.mobile.actions, [
    { kind: "execute-plan", planId: id<"PlanId">("plan:c04:mobile-seed") },
    { kind: "execute-plan", planId: id<"PlanId">("plan:c04:mobile-move") },
  ]);
  assert.deepEqual(subject.windows.actions, [
    { kind: "execute-plan", planId: id<"PlanId">("plan:c04:windows-seed") },
    { kind: "execute-plan", planId: id<"PlanId">("plan:c04:windows-move") },
  ]);

  assert.equal(subject.verifier.requests.length, 3);
  const lineage = subject.verifier.requests[0]!;
  assert.ok(lineage.state.some(item => item.kind === "base-authority" && item.path === OLD_PATH && item.expectedRemoteObjectId === STABLE_REMOTE_ID));
  assert.ok(lineage.convergence.some(item => item.kind === "cross-device-authority" && item.path === OLD_PATH && item.expectedRemoteObjectId === STABLE_REMOTE_ID));

  const remoteMove = subject.verifier.requests[1]!;
  assert.ok(remoteMove.state.some(item => item.kind === "live-trash-absence-state" && item.path === OLD_PATH && item.expectedState === "absent"));
  assert.ok(remoteMove.state.some(item => item.kind === "remote-content" && item.path === NEW_PATH && item.remoteObjectId === STABLE_REMOTE_ID));

  const final = subject.verifier.requests[2]!;
  assert.ok(final.state.some(item => item.kind === "remote-content" && item.path === NEW_PATH && item.remoteObjectId === STABLE_REMOTE_ID));
  assert.equal(final.state.filter(item => item.kind === "base-authority" && item.path === NEW_PATH && item.expectedRemoteObjectId === STABLE_REMOTE_ID).length, 2);
  assert.equal(final.state.filter(item => item.kind === "mapping-or-tombstone" && item.path === OLD_PATH && item.expected === "neither").length, 2);
  assert.ok(final.convergence.some(item => item.kind === "cross-device-path" && item.path === OLD_PATH && item.expected === "absent"));
  assert.ok(final.convergence.some(item => item.kind === "cross-device-content" && item.path === NEW_PATH));
  assert.ok(final.convergence.some(item => item.kind === "cross-device-authority" && item.path === NEW_PATH && item.expectedRemoteObjectId === STABLE_REMOTE_ID));
});

test("VH17 C04 fails closed before remote mutation when mobile rename is represented as delete/create substitution", async () => {
  const plans = successPlans();
  plans.mobile[1] = plan("plan:c04:mobile-substitution", [
    operation({
      id: "op:c04:trash-old",
      kind: "trash-remote",
      path: OLD_PATH,
      targetSide: "remote",
      remoteObjectId: STABLE_REMOTE_ID,
      destructive: true,
    }),
    operation({ id: "op:c04:create-new", kind: "upload-create", path: NEW_PATH, targetSide: "remote" }),
  ]);
  const subject = executorFixture(plans);

  const result = await subject.executor.execute();

  assert.equal(result.status, "failed");
  if (result.status === "completed") return;
  assert.equal(result.phase, "mobile-move-plan");
  assert.ok(result.planAssertion?.status === "mismatch");
  if (result.planAssertion?.status === "mismatch") {
    assert.ok(result.planAssertion.failures.some(failure => failure.kind === "forbidden-operation-kind"));
    assert.ok(result.planAssertion.failures.some(failure => failure.kind === "destructive-expectation-mismatch"));
  }
  assert.deepEqual(subject.mobile.actions, [
    { kind: "execute-plan", planId: id<"PlanId">("plan:c04:mobile-seed") },
  ]);
  assert.deepEqual(subject.windows.actions, [
    { kind: "execute-plan", planId: id<"PlanId">("plan:c04:windows-seed") },
  ]);
  assert.deepEqual(subject.windows.previewed, ["plan:c04:windows-seed"]);
  assert.equal(subject.verifier.requests.length, 1);
  assert.equal(subject.vault.entries.has(String(OLD_PATH)), false);
  assert.equal(subject.vault.entries.has(String(NEW_PATH)), true);
});
