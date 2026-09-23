import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type ContentHash,
  type LocalVaultPort,
  type PlannedOperation,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
  type UserAction,
  type VaultPath,
} from "../src/contracts";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import { ValidationProductionDiagnosticFixture } from "./validation-production-diagnostic-fixture";
import {
  ValidationFixtureManager,
} from "../src/validation/fixture-manager";
import {
  C08_AUTHORITY_CYCLES,
  C08_FIXTURE_ID,
  C08_FIXTURE_ROOT,
  C08_GUARD_PATH,
  C08_NEW_PATH,
  C08_OLD_PATH,
  C08_SCENARIO_DEFINITION,
  C08_SCENARIO_REGISTRATION,
  c08EvidenceRef,
  createC08ScenarioModuleOverrides,
  type C08DeviceRole,
} from "../src/validation/scenarios/c08-windows-move-ios-move";
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
const MAIN_REMOTE_ID = id<"RemoteObjectId">("drive:c08:stable-main") as RemoteObjectId;
const GUARD_REMOTE_ID = id<"RemoteObjectId">("drive:c08:stable-guard") as RemoteObjectId;
const WINDOWS_DEVICE = validationDeviceIdentity("device:c08:windows", "windows-desktop").deviceId;
const MOBILE_DEVICE = validationDeviceIdentity("device:c08:mobile", "iphone").deviceId;
const RUN_ID = "run:vh21:c08";
const RUN = validationRunIdentity(RUN_ID, "C08");

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

async function collect(source: BinaryContentSource): Promise<Uint8Array> {
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

function source(bytes: Uint8Array): BinaryContentSource {
  const stable = bytes.slice();
  return {
    sizeBytes: stable.byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> {
      yield stable.slice();
    },
  };
}

function hash(bytes: Uint8Array): ContentHash {
  return id<"ContentHash">(`sha256:${createHash("sha256").update(bytes).digest("hex")}`) as ContentHash;
}

class MemoryVault {
  readonly entries = new Map<string, Uint8Array>();

  readonly port = {
    validatePath: async (pathValue: VaultPath) => ({
      status: "compatible" as const,
      normalizedComparisonPath: String(pathValue).toLowerCase(),
    }),
    observe: async (pathValue: VaultPath) => {
      const bytes = this.entries.get(String(pathValue));
      return bytes === undefined
        ? { status: "absent" as const, path: pathValue }
        : {
            status: "present" as const,
            path: pathValue,
            entityKind: "file" as const,
            stability: "stable" as const,
            observationToken: id<"ObservationToken">(`obs:${String(pathValue)}`),
          };
    },
    readFile: async (pathValue: VaultPath) => {
      const bytes = this.require(pathValue);
      return {
        content: source(bytes),
        evidence: { hash: hash(bytes), sizeBytes: bytes.byteLength },
        stability: "stable" as const,
      };
    },
    readFileBypassingEvidenceCache: async (pathValue: VaultPath) => {
      const bytes = this.require(pathValue);
      return {
        content: source(bytes),
        evidence: { hash: hash(bytes), sizeBytes: bytes.byteLength },
        stability: "stable" as const,
      };
    },
    enumerate: async () => ({ entries: [], completeness: { status: "complete" as const } }),
    createFile: async (pathValue: VaultPath, content: BinaryContentSource) => {
      if (this.entries.has(String(pathValue))) throw new Error("file already exists");
      this.entries.set(String(pathValue), await collect(content));
      return { path: pathValue };
    },
    replaceFile: async (pathValue: VaultPath, content: BinaryContentSource) => {
      if (!this.entries.has(String(pathValue))) throw new Error("file does not exist");
      this.entries.set(String(pathValue), await collect(content));
      return { path: pathValue };
    },
    createFolder: async () => { throw new Error("C08 does not create folders"); },
    move: async (fromPath: VaultPath, toPath: VaultPath) => {
      const bytes = this.entries.get(String(fromPath));
      if (bytes === undefined || this.entries.has(String(toPath))) throw new Error("invalid local move");
      this.entries.delete(String(fromPath));
      this.entries.set(String(toPath), bytes);
      return { path: toPath };
    },
    trash: async (pathValue: VaultPath) => {
      this.entries.delete(String(pathValue));
    },
  } as unknown as LocalVaultPort;

  put(pathValue: VaultPath, bytes: Uint8Array): void {
    this.entries.set(String(pathValue), bytes.slice());
  }

  move(pathFrom: VaultPath, pathTo: VaultPath): void {
    const bytes = this.require(pathFrom);
    this.entries.delete(String(pathFrom));
    this.entries.set(String(pathTo), bytes);
  }

  require(pathValue: VaultPath): Uint8Array {
    const bytes = this.entries.get(String(pathValue));
    if (bytes === undefined) throw new Error(`missing local file: ${String(pathValue)}`);
    return bytes.slice();
  }
}

interface RemoteObject {
  readonly id: RemoteObjectId;
  path: VaultPath;
  bytes: Uint8Array;
}

class C08World {
  readonly windows = new MemoryVault();
  readonly mobile = new MemoryVault();
  readonly remote = new Map<string, RemoteObject>();
  readonly mappings = {
    windows: new Map<string, RemoteObjectId>(),
    mobile: new Map<string, RemoteObjectId>(),
  };
  readonly previewedPlanIds: string[] = [];
  readonly executedPlanIds: string[] = [];
  readonly actions: UserAction[] = [];
  readonly handoffs: C08DeviceRole[] = [];
  readonly productionDiagnostics = new ValidationProductionDiagnosticFixture();
  activeRole: C08DeviceRole = "windows";
  private readonly previewIndex = { windows: 0, mobile: 0 };

  constructor(
    readonly windowsPlans: readonly SynchronizationPlan[],
    readonly mobilePlans: readonly SynchronizationPlan[],
  ) {}

  readonly controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      const plans = this.activeRole === "windows" ? this.windowsPlans : this.mobilePlans;
      const index = this.previewIndex[this.activeRole]++;
      const plan = plans[index];
      if (!plan) return undefined;
      this.previewedPlanIds.push(String(plan.planId));
      this.productionDiagnostics.begin("manual", plan.planId);
      return plan;
    },
    previewVerifyReconcile: async () => undefined,
    runAutomatic: async () => undefined,
    request: async action => {
      this.actions.push(action);
      return { status: "accepted" as const };
    },
    requestPreviewAction: async (action, diagnosticRunId) => {
      this.actions.push(action);
      this.executedPlanIds.push(String(action.planId));
      this.apply(String(action.planId));
      if (diagnosticRunId !== undefined) this.productionDiagnostics.complete(diagnosticRunId);
      return { status: "accepted" as const };
    },
    currentDiagnosticCorrelation: () => this.productionDiagnostics.current(),
    diagnosticSnapshot: () => this.productionDiagnostics.snapshot(),
    currentSurface: (): ProductSurfaceState => ({ status: { kind: "idle-ready" }, conflicts: [] }),
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("C08 focused runtime test does not require executor run evidence."); },
  };

  remoteId(role: C08DeviceRole, pathValue: VaultPath): RemoteObjectId | undefined {
    return this.mappings[role].get(String(pathValue));
  }

  remoteAt(pathValue: VaultPath): RemoteObject | undefined {
    return [...this.remote.values()].find(item => item.path === pathValue);
  }

  handoff(target: C08DeviceRole): void {
    this.activeRole = target;
    this.handoffs.push(target);
  }

  private apply(planId: string): void {
    switch (planId) {
      case "plan:c08:windows-lineage":
        this.uploadLineage();
        return;
      case "plan:c08:mobile-lineage":
        this.downloadLineage();
        return;
      case "plan:c08:windows-move":
        this.moveRemote();
        return;
      case "plan:c08:mobile-move":
        this.moveMobile();
        return;
      default:
        throw new Error(`unexpected executed plan: ${planId}`);
    }
  }

  private uploadLineage(): void {
    const mainBytes = this.windows.require(C08_OLD_PATH);
    const guardBytes = this.windows.require(C08_GUARD_PATH);
    this.remote.set(String(MAIN_REMOTE_ID), { id: MAIN_REMOTE_ID, path: C08_OLD_PATH, bytes: mainBytes });
    this.remote.set(String(GUARD_REMOTE_ID), { id: GUARD_REMOTE_ID, path: C08_GUARD_PATH, bytes: guardBytes });
    this.mappings.windows.set(String(C08_OLD_PATH), MAIN_REMOTE_ID);
    this.mappings.windows.set(String(C08_GUARD_PATH), GUARD_REMOTE_ID);
  }

  private downloadLineage(): void {
    const main = this.remote.get(String(MAIN_REMOTE_ID));
    const guard = this.remote.get(String(GUARD_REMOTE_ID));
    if (!main || !guard) throw new Error("remote lineage is incomplete");
    this.mobile.put(C08_OLD_PATH, main.bytes);
    this.mobile.put(C08_GUARD_PATH, guard.bytes);
    this.mappings.mobile.set(String(C08_OLD_PATH), MAIN_REMOTE_ID);
    this.mappings.mobile.set(String(C08_GUARD_PATH), GUARD_REMOTE_ID);
  }

  private moveRemote(): void {
    const main = this.remote.get(String(MAIN_REMOTE_ID));
    if (!main || main.path !== C08_OLD_PATH) throw new Error("stable remote object is not at the old path");
    main.path = C08_NEW_PATH;
    this.mappings.windows.delete(String(C08_OLD_PATH));
    this.mappings.windows.set(String(C08_NEW_PATH), MAIN_REMOTE_ID);
  }

  private moveMobile(): void {
    this.mobile.move(C08_OLD_PATH, C08_NEW_PATH);
    this.mappings.mobile.delete(String(C08_OLD_PATH));
    this.mappings.mobile.set(String(C08_NEW_PATH), MAIN_REMOTE_ID);
  }
}

function operation(input: {
  readonly operationId: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly remoteObjectId?: RemoteObjectId;
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
  readonly destructive?: boolean;
}): PlannedOperation {
  return {
    operationId: id<"OperationId">(input.operationId),
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{ code: "vh21-c08-test", summary: "Deterministic C08 focused test operation." }],
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

function noopGuard(idValue: string): PlannedOperation {
  return operation({
    operationId: idValue,
    kind: "noop",
    path: C08_GUARD_PATH,
  });
}

function successPlans() {
  return {
    windows: [
      plan("plan:c08:windows-lineage", [
        operation({ operationId: "op:c08:windows-main-create", kind: "upload-create", path: C08_OLD_PATH, targetSide: "remote" }),
        operation({ operationId: "op:c08:windows-guard-create", kind: "upload-create", path: C08_GUARD_PATH, targetSide: "remote" }),
      ]),
      plan("plan:c08:windows-move", [
        operation({
          operationId: "op:c08:windows-move",
          kind: "identity-preserving-move",
          path: C08_NEW_PATH,
          targetSide: "remote",
          remoteObjectId: MAIN_REMOTE_ID,
          fromPath: C08_OLD_PATH,
          toPath: C08_NEW_PATH,
        }),
        noopGuard("op:c08:windows-guard-noop"),
      ]),
    ],
    mobile: [
      plan("plan:c08:mobile-lineage", [
        operation({ operationId: "op:c08:mobile-main-create", kind: "download-create", path: C08_OLD_PATH, targetSide: "local", remoteObjectId: MAIN_REMOTE_ID }),
        operation({ operationId: "op:c08:mobile-guard-create", kind: "download-create", path: C08_GUARD_PATH, targetSide: "local", remoteObjectId: GUARD_REMOTE_ID }),
      ]),
      plan("plan:c08:mobile-move", [
        operation({
          operationId: "op:c08:mobile-move",
          kind: "identity-preserving-move",
          path: C08_NEW_PATH,
          targetSide: "local",
          remoteObjectId: MAIN_REMOTE_ID,
          fromPath: C08_OLD_PATH,
          toPath: C08_NEW_PATH,
        }),
        noopGuard("op:c08:mobile-guard-noop"),
      ]),
    ],
  };
}

class WorldVerifier {
  private sequence = 0;

  constructor(private readonly world: C08World) {}

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    const failures: string[] = [];
    for (const item of request.state) this.verifyState(item, failures);
    for (const item of request.convergence) this.verifyConvergence(item, failures);
    this.sequence += 1;
    return {
      result: { verdict: failures.length === 0 ? "pass" : "fail" } as ValidationStateConvergenceReport["result"],
      evidence: [{
        ref: c08EvidenceRef(`world-verification-${this.sequence}`),
        source: "convergence",
        summary: failures.length === 0 ? "C08 world state matched all requested postconditions." : failures.join(" | "),
      }],
    };
  }

  private verifyState(item: ValidationStateConvergenceRequest["state"][number], failures: string[]): void {
    switch (item.kind) {
      case "local-content":
        this.expectLocal(item.deviceId, item.path, item.content.hash, item.content.sizeBytes, failures);
        return;
      case "remote-content":
        this.expectRemote(item.path, item.remoteObjectId, item.content.hash, item.content.sizeBytes, failures);
        return;
      case "live-trash-absence-state":
        if (item.expectedState === "absent" && this.world.remoteAt(item.path) !== undefined) {
          failures.push(`remote path should be absent: ${String(item.path)}`);
        }
        return;
      case "base-authority":
        if (item.expectedRemoteObjectId !== undefined && this.mapping(item.deviceId, item.path) !== item.expectedRemoteObjectId) {
          failures.push(`base authority identity mismatch at ${String(item.path)}`);
        }
        if (item.expectedContent) this.expectLocal(item.deviceId, item.path, item.expectedContent.hash, item.expectedContent.sizeBytes, failures);
        return;
      case "mapping-or-tombstone": {
        const mapping = this.mapping(item.deviceId, item.path);
        if (item.expected === "mapping" && mapping !== item.remoteObjectId) failures.push(`mapping mismatch at ${String(item.path)}`);
        if (item.expected === "neither" && mapping !== undefined) failures.push(`old mapping still present at ${String(item.path)}`);
        return;
      }
      case "unrelated-mutation-absence":
        for (const local of item.local) {
          if (local.state === "file" && local.content) this.expectLocal(local.deviceId, local.path, local.content.hash, local.content.sizeBytes, failures);
        }
        for (const remote of item.remote) {
          if (remote.state === "live" && remote.content) this.expectRemote(remote.path, remote.remoteObjectId, remote.content.hash, remote.content.sizeBytes, failures);
        }
        return;
      case "durable-intent-or-effect":
        if (item.expected !== "none-outstanding") failures.push("focused C08 world only models the required no-outstanding-intent state");
        return;
      default:
        failures.push(`focused C08 world cannot verify state kind ${item.kind}`);
    }
  }

  private verifyConvergence(item: ValidationStateConvergenceRequest["convergence"][number], failures: string[]): void {
    switch (item.kind) {
      case "cross-device-content":
        for (const deviceId of item.deviceIds) this.expectLocal(deviceId, item.path, item.content.hash, item.content.sizeBytes, failures);
        return;
      case "cross-device-path":
        for (const deviceId of item.deviceIds) {
          const present = this.vault(deviceId).entries.has(String(item.path));
          if (item.expected === "absent" && present) failures.push(`local path should be absent: ${String(item.path)}`);
          if (item.expected === "file" && !present) failures.push(`local path should be a file: ${String(item.path)}`);
        }
        return;
      case "cross-device-authority":
        for (const deviceId of item.deviceIds) {
          if (item.expectedRemoteObjectId !== undefined && this.mapping(deviceId, item.path) !== item.expectedRemoteObjectId) {
            failures.push(`cross-device authority mismatch at ${String(item.path)}`);
          }
        }
        return;
      default:
        failures.push(`focused C08 world cannot verify convergence kind ${item.kind}`);
    }
  }

  private expectLocal(
    deviceId: typeof WINDOWS_DEVICE,
    pathValue: VaultPath,
    expectedHash: ContentHash,
    expectedSize: number | undefined,
    failures: string[],
  ): void {
    const bytes = this.vault(deviceId).entries.get(String(pathValue));
    if (!bytes) {
      failures.push(`missing local content: ${String(pathValue)}`);
      return;
    }
    if (hash(bytes) !== expectedHash || (expectedSize !== undefined && bytes.byteLength !== expectedSize)) {
      failures.push(`local bytes changed: ${String(pathValue)}`);
    }
  }

  private expectRemote(
    pathValue: VaultPath,
    expectedId: RemoteObjectId | undefined,
    expectedHash: ContentHash,
    expectedSize: number | undefined,
    failures: string[],
  ): void {
    const remote = expectedId === undefined
      ? this.world.remoteAt(pathValue)
      : this.world.remote.get(String(expectedId));
    if (!remote || remote.path !== pathValue) {
      failures.push(`missing/stale remote identity at ${String(pathValue)}`);
      return;
    }
    if (hash(remote.bytes) !== expectedHash || (expectedSize !== undefined && remote.bytes.byteLength !== expectedSize)) {
      failures.push(`remote bytes changed: ${String(pathValue)}`);
    }
  }

  private vault(deviceId: typeof WINDOWS_DEVICE): MemoryVault {
    return deviceId === WINDOWS_DEVICE ? this.world.windows : this.world.mobile;
  }

  private mapping(deviceId: typeof WINDOWS_DEVICE, pathValue: VaultPath): RemoteObjectId | undefined {
    return deviceId === WINDOWS_DEVICE
      ? this.world.mappings.windows.get(String(pathValue))
      : this.world.mappings.mobile.get(String(pathValue));
  }
}

function fixtureManager(world: C08World): ValidationFixtureManager {
  const ownership = validationSandboxOwnership({
    resourceId: "c08-fixture-root",
    surface: "vault-fixture",
    owner: RUN,
  });
  return new ValidationFixtureManager({
    run: RUN,
    fixtureRoot: C08_FIXTURE_ROOT,
    ownership,
    local: world.windows.port,
    authorize: request => ({ status: "authorized", ownership: request.ownership }),
  });
}

function harness(plans = successPlans()) {
  const world = new C08World(plans.windows, plans.mobile);
  const verifier = new WorldVerifier(world);
  const evidenceRecords: Array<{
    readonly remoteObjectId: RemoteObjectId;
    readonly guardRemoteObjectId: RemoteObjectId;
    readonly contentHash: ContentHash;
  }> = [];

  const moduleOverrides = createC08ScenarioModuleOverrides({
    windowsDeviceId: WINDOWS_DEVICE,
    mobileDeviceId: MOBILE_DEVICE,
    windowsFixtures: fixtureManager(world),
    mappingReader: {
      async remoteObjectId(deviceId, pathValue) {
        return deviceId === WINDOWS_DEVICE
          ? world.mappings.windows.get(String(pathValue))
          : world.mappings.mobile.get(String(pathValue));
      },
    },
    verifier: verifier as never,
    handoff: {
      currentRole: () => world.activeRole,
      async handoff(input) {
        world.handoff(input.targetRole);
        return [c08EvidenceRef(`handoff-${input.targetRole}`)];
      },
    },
    evidence: {
      async record(input) {
        evidenceRecords.push({
          remoteObjectId: input.remoteObjectId,
          guardRemoteObjectId: input.guardRemoteObjectId,
          contentHash: input.contentHash,
        });
        return [c08EvidenceRef("final-record")];
      },
    },
  });

  const runtime = new ValidationModeRuntime({
    productionRuntime: { productController: () => world.controller },
    definitions: [C08_SCENARIO_DEFINITION],
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    moduleOverrides,
    currentDevice: () => world.activeRole === "windows"
      ? validationDeviceIdentity("device:c08:windows", "windows-desktop")
      : validationDeviceIdentity("device:c08:mobile", "iphone"),
    createRunId: () => RUN_ID,
  });
  runtime.setEnabled(true);
  return { runtime, world, evidenceRecords };
}

function assertRunner(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
  status: "PASS" | "FAIL" | "BLOCKED",
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("expected runner result");
  assert.equal(result.result.status, status);
  return result.result;
}

test("VH21 C08 registers one-to-one and uses four explicit repaired-H6B authority cycles without caller authorization", () => {
  assert.equal(C08_SCENARIO_REGISTRATION.scenarioId, "C08");
  assert.strictEqual(C08_SCENARIO_REGISTRATION.definition, C08_SCENARIO_DEFINITION);
  assert.equal(C08_SCENARIO_DEFINITION.scenarioId, "C08");
  assert.deepEqual(C08_SCENARIO_DEFINITION.prerequisiteIds, []);
  assert.equal(new Set(C08_SCENARIO_DEFINITION.steps.map(step => String(step.stepId))).size, C08_SCENARIO_DEFINITION.steps.length);

  const productionSteps = C08_SCENARIO_DEFINITION.steps.filter(step => step.module === "production-path-driver");
  const assertionSteps = C08_SCENARIO_DEFINITION.steps.filter(step => step.module === "plan-assertion-engine");
  assert.equal(productionSteps.filter(step => step.operation === "preview-manual").length, 4);
  assert.equal(productionSteps.filter(step => step.operation === "execute-asserted-plan").length, 4);
  assert.equal(assertionSteps.length, 4);
  assert.deepEqual(
    productionSteps
      .filter(step => step.operation === "preview-manual")
      .map(step => (step.input as { readonly authorityCycleId: string }).authorityCycleId),
    [
      C08_AUTHORITY_CYCLES.lineageWindows,
      C08_AUTHORITY_CYCLES.lineageMobile,
      C08_AUTHORITY_CYCLES.moveWindows,
      C08_AUTHORITY_CYCLES.moveMobile,
    ],
  );
  for (const step of productionSteps.filter(step => step.operation === "execute-asserted-plan")) {
    assert.equal(Object.prototype.hasOwnProperty.call(step.input ?? {}, "authorization"), false);
  }
});

test("VH21 C08 deterministically preserves Drive identity, old-path absence, bytes, and unrelated guard through the real H6B route", async () => {
  const subject = harness();
  const result = assertRunner(await subject.runtime.startScenario("C08"), "PASS");
  assert.equal(result.status, "PASS");

  assert.deepEqual(subject.world.previewedPlanIds, [
    "plan:c08:windows-lineage",
    "plan:c08:mobile-lineage",
    "plan:c08:windows-move",
    "plan:c08:mobile-move",
  ]);
  assert.deepEqual(subject.world.executedPlanIds, subject.world.previewedPlanIds);
  assert.deepEqual(subject.world.handoffs, ["mobile", "windows", "mobile"]);

  const movedRemote = subject.world.remote.get(String(MAIN_REMOTE_ID));
  assert.ok(movedRemote);
  assert.equal(movedRemote?.id, MAIN_REMOTE_ID);
  assert.equal(movedRemote?.path, C08_NEW_PATH);
  assert.equal(subject.world.remoteAt(C08_OLD_PATH), undefined);
  assert.equal(subject.world.windows.entries.has(String(C08_OLD_PATH)), false);
  assert.equal(subject.world.mobile.entries.has(String(C08_OLD_PATH)), false);
  assert.equal(subject.world.windows.entries.has(String(C08_NEW_PATH)), true);
  assert.equal(subject.world.mobile.entries.has(String(C08_NEW_PATH)), true);

  const windowsBytes = subject.world.windows.require(C08_NEW_PATH);
  const mobileBytes = subject.world.mobile.require(C08_NEW_PATH);
  assert.equal(hash(windowsBytes), hash(mobileBytes));
  assert.equal(hash(movedRemote!.bytes), hash(windowsBytes));

  const guardRemote = subject.world.remote.get(String(GUARD_REMOTE_ID));
  assert.ok(guardRemote);
  assert.equal(guardRemote?.path, C08_GUARD_PATH);
  assert.equal(hash(guardRemote!.bytes), hash(subject.world.windows.require(C08_GUARD_PATH)));
  assert.equal(hash(guardRemote!.bytes), hash(subject.world.mobile.require(C08_GUARD_PATH)));

  assert.equal(subject.world.mappings.windows.get(String(C08_NEW_PATH)), MAIN_REMOTE_ID);
  assert.equal(subject.world.mappings.mobile.get(String(C08_NEW_PATH)), MAIN_REMOTE_ID);
  assert.equal(subject.world.mappings.windows.has(String(C08_OLD_PATH)), false);
  assert.equal(subject.world.mappings.mobile.has(String(C08_OLD_PATH)), false);

  assert.equal(subject.evidenceRecords.length, 1);
  assert.equal(subject.evidenceRecords[0]?.remoteObjectId, MAIN_REMOTE_ID);
  assert.equal(subject.evidenceRecords[0]?.guardRemoteObjectId, GUARD_REMOTE_ID);
  assert.equal(subject.evidenceRecords[0]?.contentHash, hash(windowsBytes));
});

test("VH21 C08 rejects delete/create substitution before production execution", async () => {
  const plans = successPlans();
  const replacement = {
    ...plans,
    windows: [
      plans.windows[0]!,
      plan("plan:c08:windows-delete-create-substitution", [
        operation({
          operationId: "op:c08:bad-trash",
          kind: "trash-remote",
          path: C08_OLD_PATH,
          targetSide: "remote",
          remoteObjectId: MAIN_REMOTE_ID,
          destructive: true,
        }),
        operation({
          operationId: "op:c08:bad-create",
          kind: "upload-create",
          path: C08_NEW_PATH,
          targetSide: "remote",
        }),
        noopGuard("op:c08:bad-guard-noop"),
      ]),
    ],
  };
  const subject = harness(replacement);
  const result = assertRunner(await subject.runtime.startScenario("C08"), "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /forbidden operation|Expected operation was not observed|destructive/i);
  }

  assert.deepEqual(subject.world.previewedPlanIds, [
    "plan:c08:windows-lineage",
    "plan:c08:mobile-lineage",
    "plan:c08:windows-delete-create-substitution",
  ]);
  assert.deepEqual(subject.world.executedPlanIds, [
    "plan:c08:windows-lineage",
    "plan:c08:mobile-lineage",
  ]);
  assert.equal(subject.world.remote.get(String(MAIN_REMOTE_ID))?.path, C08_OLD_PATH);
  assert.equal(subject.world.remoteAt(C08_NEW_PATH), undefined);
  assert.equal(subject.world.mobile.entries.has(String(C08_OLD_PATH)), true);
});

test("VH21 C08 hard-stops an unexpected move-plan mutation before production execution", async () => {
  const plans = successPlans();
  const replacement = {
    ...plans,
    windows: [
      plans.windows[0]!,
      plan("plan:c08:windows-unexpected-mutation", [
        operation({
          operationId: "op:c08:expected-move",
          kind: "identity-preserving-move",
          path: C08_NEW_PATH,
          targetSide: "remote",
          remoteObjectId: MAIN_REMOTE_ID,
          fromPath: C08_OLD_PATH,
          toPath: C08_NEW_PATH,
        }),
        operation({
          operationId: "op:c08:unexpected-guard-update",
          kind: "upload-update",
          path: C08_GUARD_PATH,
          targetSide: "remote",
          remoteObjectId: GUARD_REMOTE_ID,
        }),
      ]),
    ],
  };
  const subject = harness(replacement);
  const result = assertRunner(await subject.runtime.startScenario("C08"), "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /upload-update|outside the scenario contract|forbidden/i);
  }

  assert.deepEqual(subject.world.executedPlanIds, [
    "plan:c08:windows-lineage",
    "plan:c08:mobile-lineage",
  ]);
  assert.equal(subject.world.remote.get(String(MAIN_REMOTE_ID))?.path, C08_OLD_PATH);
  assert.equal(subject.world.remote.get(String(GUARD_REMOTE_ID))?.path, C08_GUARD_PATH);
});
