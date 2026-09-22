import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ConflictAssessment,
  type ContentHash,
  type PlannedOperation,
  type ProductSurfaceState,
  type RemoteObjectId,
  type SynchronizationPlan,
  type UserAction,
  type VaultPath,
} from "../src/contracts";
import {
  validationEvidenceRef,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type {
  ValidationFixtureDescriptor,
  ValidationFixtureSpec,
  ValidationTextVariant,
} from "../src/validation/fixture-manager";
import type { ValidationProductionControllerPort } from "../src/validation/production-path-driver";
import {
  D02_AUTHORITY_CYCLES,
  D02_GUARD_FIXTURE_ID,
  D02_GUARD_RELATIVE_PATH,
  D02_OPERATIONS,
  D02_RESOLUTION,
  D02_TARGET_FIXTURE_ID,
  D02_TARGET_RELATIVE_PATH,
  createD02ConcurrentOverlappingTextConflictScenario,
  type D02FixtureManagerPort,
  type D02StateVerifierPort,
} from "../src/validation/scenarios/d02-true-text-conflict";
import {
  validationDeviceIdentity,
  validationFixtureIdentity,
  validationRunIdentity,
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

const RUN = validationRunIdentity("run:d02:focused", "D02");
const WINDOWS = validationDeviceIdentity("validation-device:d02:windows", "windows-desktop");
const MOBILE = validationDeviceIdentity("validation-device:d02:mobile", "iphone");

const ROOT = "__brain_validation__/d02";
const TARGET_PATH = id<"VaultPath">(ROOT + "/" + D02_TARGET_RELATIVE_PATH) as VaultPath;
const GUARD_PATH = id<"VaultPath">(ROOT + "/" + D02_GUARD_RELATIVE_PATH) as VaultPath;
const TARGET_REMOTE_ID = id<"RemoteObjectId">("remote:d02:target") as RemoteObjectId;
const GUARD_REMOTE_ID = id<"RemoteObjectId">("remote:d02:guard") as RemoteObjectId;
const CONFLICT_ID = id<"ConflictId">("conflict:d02:overlap");

const BASE_HASH = id<"ContentHash">("sha256:d02-base") as ContentHash;
const WINDOWS_HASH = id<"ContentHash">("sha256:d02-windows-overlap-a") as ContentHash;
const MOBILE_HASH = id<"ContentHash">("sha256:d02-mobile-overlap-b") as ContentHash;
const GUARD_HASH = id<"ContentHash">("sha256:d02-guard") as ContentHash;

const BASE_SIZE = 101;
const WINDOWS_SIZE = 109;
const MOBILE_SIZE = 111;
const GUARD_SIZE = 73;

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

function hashFor(relativePath: string, variant: ValidationTextVariant | undefined): {
  readonly hash: ContentHash;
  readonly sizeBytes: number;
} {
  if (relativePath === D02_GUARD_RELATIVE_PATH) return { hash: GUARD_HASH, sizeBytes: GUARD_SIZE };
  if (variant === "overlap-a") return { hash: WINDOWS_HASH, sizeBytes: WINDOWS_SIZE };
  if (variant === "overlap-b") return { hash: MOBILE_HASH, sizeBytes: MOBILE_SIZE };
  return { hash: BASE_HASH, sizeBytes: BASE_SIZE };
}

function pathFor(relativePath: string): VaultPath {
  if (relativePath === D02_TARGET_RELATIVE_PATH) return TARGET_PATH;
  if (relativePath === D02_GUARD_RELATIVE_PATH) return GUARD_PATH;
  throw new Error("Unexpected D02 fixture path: " + relativePath);
}

class ScriptedFixtureManager implements D02FixtureManagerPort {
  private readonly values = new Map<string, ValidationFixtureDescriptor>();

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    if (this.values.has(spec.fixtureId)) throw new Error("duplicate fixture");
    const descriptor = this.descriptor(spec.fixtureId, spec.relativePath, spec.version, spec.textVariant, spec.purpose);
    this.values.set(spec.fixtureId, descriptor);
    return descriptor;
  }

  async edit(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    const current = this.values.get(fixtureId);
    if (!current) throw new Error("missing fixture");
    const descriptor = this.descriptor(fixtureId, current.relativePath, version, textVariant, current.purpose);
    this.values.set(fixtureId, descriptor);
    return descriptor;
  }

  async hash(fixtureId: string): Promise<ContentHash> {
    const current = this.values.get(fixtureId);
    if (!current?.hash) throw new Error("missing fixture hash");
    return current.hash;
  }

  private descriptor(
    fixtureId: string,
    relativePath: string,
    version: number,
    variant: ValidationTextVariant | undefined,
    purpose: ValidationFixtureDescriptor["purpose"],
  ): ValidationFixtureDescriptor {
    const content = hashFor(relativePath, variant);
    return Object.freeze({
      identity: validationFixtureIdentity(RUN, fixtureId),
      relativePath,
      path: pathFor(relativePath),
      kind: "text" as const,
      purpose,
      version,
      sizeBytes: content.sizeBytes,
      hash: content.hash,
    });
  }
}

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly remoteObjectId?: RemoteObjectId;
  readonly conflictId?: string;
}): PlannedOperation {
  return {
    operationId: id<"OperationId">(input.id),
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    ...(input.conflictId === undefined ? {} : { conflictId: input.conflictId }),
    destructive: false,
    preconditions: [],
    reasons: [{
      code: "d02-focused-test",
      summary: "Deterministic D02 focused scenario plan.",
    }],
  };
}

function plan(
  planId: string,
  operations: readonly PlannedOperation[],
  disposition: SynchronizationPlan["executionDisposition"] = "safe-auto-eligible",
): SynchronizationPlan {
  return {
    planId: id<"PlanId">(planId),
    trigger: "manual",
    operations,
    executionDisposition: disposition,
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function seedWindowsPlan(): SynchronizationPlan {
  return plan("plan:d02:seed-windows", [
    operation({ id: "op:d02:seed-target", kind: "upload-create", path: TARGET_PATH, targetSide: "remote" }),
    operation({ id: "op:d02:seed-guard", kind: "upload-create", path: GUARD_PATH, targetSide: "remote" }),
  ]);
}

function seedMobilePlan(): SynchronizationPlan {
  return plan("plan:d02:seed-mobile", [
    operation({ id: "op:d02:seed-mobile-target", kind: "noop", path: TARGET_PATH }),
    operation({ id: "op:d02:seed-mobile-guard", kind: "noop", path: GUARD_PATH }),
  ]);
}

function publishWindowsPlan(): SynchronizationPlan {
  return plan("plan:d02:publish-windows", [
    operation({ id: "op:d02:publish-windows-target", kind: "upload-update", path: TARGET_PATH, targetSide: "remote", remoteObjectId: TARGET_REMOTE_ID }),
    operation({ id: "op:d02:publish-windows-guard", kind: "noop", path: GUARD_PATH }),
  ]);
}

function unresolvedConflictPlan(): SynchronizationPlan {
  return plan("plan:d02:mobile-conflict", [
    operation({ id: "op:d02:mobile-conflict-target", kind: "unresolved-conflict", path: TARGET_PATH, conflictId: String(CONFLICT_ID) }),
    operation({ id: "op:d02:mobile-conflict-guard", kind: "noop", path: GUARD_PATH }),
  ], "requires-user-approval");
}

function silentOverwritePlan(): SynchronizationPlan {
  return plan("plan:d02:silent-overwrite", [
    operation({ id: "op:d02:silent-overwrite-target", kind: "download-update", path: TARGET_PATH, targetSide: "local", remoteObjectId: TARGET_REMOTE_ID }),
    operation({ id: "op:d02:silent-overwrite-guard", kind: "noop", path: GUARD_PATH }),
  ]);
}

function convergeWindowsPlan(): SynchronizationPlan {
  return plan("plan:d02:converge-windows", [
    operation({ id: "op:d02:converge-windows-target", kind: "download-update", path: TARGET_PATH, targetSide: "local", remoteObjectId: TARGET_REMOTE_ID }),
    operation({ id: "op:d02:converge-windows-guard", kind: "noop", path: GUARD_PATH }),
  ]);
}

function provenance(
  source: "base" | "local" | "remote",
  hash: ContentHash,
  sizeBytes: number,
  input?: {
    readonly remoteObjectId?: RemoteObjectId;
    readonly observationToken?: string;
  },
) {
  return {
    source,
    version: {
      path: TARGET_PATH,
      entityKind: "file" as const,
      content: { hash, sizeBytes },
      ...(input?.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
      ...(input?.observationToken === undefined ? {} : {
        observationToken: id<"ObservationToken">(input.observationToken),
      }),
    },
    ...(source === "local"
      ? { deviceId: id<"DeviceIdentity">("product-device:d02:mobile") }
      : {}),
    ...(input?.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
  };
}

function unresolvedConflict(input?: {
  readonly omitBase?: boolean;
  readonly localHash?: ContentHash;
}): Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> {
  return {
    kind: "unresolved-text",
    conflictId: CONFLICT_ID,
    path: TARGET_PATH,
    preserved: {
      local: provenance(
        "local",
        input?.localHash ?? MOBILE_HASH,
        MOBILE_SIZE,
        { observationToken: "token:d02:mobile" },
      ),
      remote: provenance(
        "remote",
        WINDOWS_HASH,
        WINDOWS_SIZE,
        { remoteObjectId: TARGET_REMOTE_ID },
      ),
      ...(input?.omitBase
        ? {}
        : {
            base: provenance(
              "base",
              BASE_HASH,
              BASE_SIZE,
              { remoteObjectId: TARGET_REMOTE_ID },
            ),
          }),
    },
  };
}

interface ScriptedController {
  readonly controller: ValidationProductionControllerPort;
  readonly previewedPlanIds: string[];
  readonly executedPlanIds: string[];
  readonly requestedActions: UserAction[];
}

function controllerFor(
  role: "windows" | "mobile",
  plans: readonly SynchronizationPlan[],
  conflict: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>,
): ScriptedController {
  let previewIndex = 0;
  let surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
  const previewedPlanIds: string[] = [];
  const executedPlanIds: string[] = [];
  const requestedActions: UserAction[] = [];

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      const observed = plans[previewIndex++];
      if (!observed) throw new Error(role + " has no scripted D02 plan for preview " + previewIndex + ".");
      previewedPlanIds.push(String(observed.planId));
      if (observed.operations.some(item => item.kind === "unresolved-conflict")) {
        surface = {
          status: { kind: "conflict-present", conflictCount: 1 },
          planPreview: observed,
          conflicts: [conflict],
        };
      } else {
        surface = { status: { kind: "idle-ready" }, planPreview: observed, conflicts: [] };
      }
      return observed;
    },
    previewVerifyReconcile: async () => undefined,
    runAutomatic: async () => undefined,
    request: async action => {
      requestedActions.push(action);
      if (action.kind === "resolve-conflict") {
        if (role !== "mobile") return { status: "rejected", reason: "D02 resolution belongs to mobile." };
        if (action.conflictId !== CONFLICT_ID) return { status: "rejected", reason: "wrong conflict identity" };
        if (action.resolution.kind !== D02_RESOLUTION.kind) return { status: "rejected", reason: "wrong resolution" };
        surface = { status: { kind: "idle-ready" }, conflicts: [] };
      }
      return { status: "accepted" };
    },
    requestPreviewAction: async action => {
      if (action.kind !== "execute-plan") return { status: "rejected", reason: "D02 focused harness executes reviewed plans only." };
      requestedActions.push(action);
      executedPlanIds.push(String(action.planId));
      return { status: "accepted" };
    },
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => {
      throw new Error("D02 focused tests do not require active-run evidence.");
    },
  };

  return { controller, previewedPlanIds, executedPlanIds, requestedActions };
}

class CapturingVerifier implements D02StateVerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  constructor(
    private readonly verdictFor: (
      request: ValidationStateConvergenceRequest,
      index: number,
    ) => "pass" | "fail" | "blocked" = () => "pass",
  ) {}

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    const verdict = this.verdictFor(request, this.requests.length - 1);
    return {
      result: { verdict } as ValidationStateConvergenceReport["result"],
      evidence: [{
        ref: validationEvidenceRef("d02:verification:" + String(this.requests.length)),
        source: "convergence",
        summary: "Deterministic D02 objective-verifier witness.",
      }],
    };
  }
}

function harness(input?: {
  readonly conflict?: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>;
  readonly mobileConflictPlan?: SynchronizationPlan;
  readonly verifierVerdict?: (
    request: ValidationStateConvergenceRequest,
    index: number,
  ) => "pass" | "fail" | "blocked";
}) {
  let active: "windows" | "mobile" = "windows";
  const conflict = input?.conflict ?? unresolvedConflict();
  const windows = controllerFor("windows", [
    seedWindowsPlan(),
    publishWindowsPlan(),
    convergeWindowsPlan(),
  ], conflict);
  const mobile = controllerFor("mobile", [
    seedMobilePlan(),
    input?.mobileConflictPlan ?? unresolvedConflictPlan(),
  ], conflict);
  const verifier = new CapturingVerifier(input?.verifierVerdict);
  const handoffs: string[] = [];
  const evidenceInputs: Array<{
    conflictId: string;
    baseHash: ContentHash;
    windowsEditHash: ContentHash;
    mobileEditHash: ContentHash;
  }> = [];

  const scenario = createD02ConcurrentOverlappingTextConflictScenario({
    targetPath: TARGET_PATH,
    guardPath: GUARD_PATH,
    windowsDevice: WINDOWS,
    mobileDevice: MOBILE,
    windowsFixtures: new ScriptedFixtureManager(),
    mobileFixtures: new ScriptedFixtureManager(),
    handoff: {
      currentRole: () => active,
      async handoff(handoff) {
        active = handoff.targetRole;
        handoffs.push(handoff.reason + ":" + handoff.targetRole);
        return [validationEvidenceRef("d02:handoff:" + handoff.reason)];
      },
    },
    mappingReader: {
      async remoteObjectId(_deviceId, path) {
        if (path === TARGET_PATH) return TARGET_REMOTE_ID;
        if (path === GUARD_PATH) return GUARD_REMOTE_ID;
        return undefined;
      },
    },
    conflictSurface: {
      currentSurface: () => active === "windows"
        ? windows.controller.currentSurface()
        : mobile.controller.currentSurface(),
    },
    verifier,
    evidence: {
      async record(record) {
        evidenceInputs.push({
          conflictId: record.conflictId,
          baseHash: record.baseHash,
          windowsEditHash: record.windowsEditHash,
          mobileEditHash: record.mobileEditHash,
        });
        return [validationEvidenceRef("d02:evidence")];
      },
    },
  });

  const runtime = new ValidationModeRuntime({
    productionRuntime: {
      productController: () => active === "windows" ? windows.controller : mobile.controller,
    },
    definitions: [scenario.definition],
    prerequisites: scenario.prerequisites,
    moduleOverrides: scenario.moduleOverrides,
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    currentDevice: () => active === "windows" ? WINDOWS : MOBILE,
    createRunId: () => String(RUN.runId),
  });

  return {
    runtime,
    scenario,
    windows,
    mobile,
    verifier,
    handoffs,
    evidenceInputs,
  };
}

function runnerResult(
  result: Awaited<ReturnType<ValidationModeRuntime["startScenario"]>>,
) {
  assert.equal(result.status, "runner");
  if (result.status !== "runner") throw new Error("Expected D02 H6B runner result.");
  return result.result;
}

test("VH25 D02 preserves both overlapping originals, resolves through fixed H6B production path, and converges safely", async () => {
  const subject = harness();

  assert.equal(subject.scenario.scenarioId, "D02");
  assert.equal("production-path-driver" in subject.scenario.moduleOverrides, false);
  assert.equal("plan-assertion-engine" in subject.scenario.moduleOverrides, false);

  const productionSteps = subject.scenario.definition.steps.filter(
    step => step.module === "production-path-driver" || step.module === "plan-assertion-engine",
  );
  assert.ok(productionSteps.some(step =>
    step.module === "production-path-driver"
    && step.operation === "resolve-observed-conflict"
  ));

  subject.runtime.setEnabled(true);
  const result = runnerResult(await subject.runtime.startScenario("D02"));
  assert.equal(result.status, "PASS");

  assert.deepEqual(subject.windows.previewedPlanIds, [
    "plan:d02:seed-windows",
    "plan:d02:publish-windows",
    "plan:d02:converge-windows",
  ]);
  assert.deepEqual(subject.windows.executedPlanIds, subject.windows.previewedPlanIds);
  assert.deepEqual(subject.mobile.previewedPlanIds, [
    "plan:d02:seed-mobile",
    "plan:d02:mobile-conflict",
  ]);
  assert.deepEqual(subject.mobile.executedPlanIds, subject.mobile.previewedPlanIds);

  const resolutions = subject.mobile.requestedActions.filter(
    action => action.kind === "resolve-conflict",
  );
  assert.deepEqual(resolutions, [{
    kind: "resolve-conflict",
    conflictId: CONFLICT_ID,
    resolution: D02_RESOLUTION,
  }]);

  assert.equal(subject.verifier.requests.length, 4);
  const conflictVerification = subject.verifier.requests[1]!;
  assert.ok(conflictVerification.state.some(item =>
    item.kind === "local-content"
    && item.deviceId === WINDOWS.deviceId
    && item.path === TARGET_PATH
    && item.content.hash === WINDOWS_HASH
  ));
  assert.ok(conflictVerification.state.some(item =>
    item.kind === "local-content"
    && item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
    && item.content.hash === MOBILE_HASH
  ));
  assert.ok(conflictVerification.state.some(item =>
    item.kind === "remote-content"
    && item.path === TARGET_PATH
    && item.remoteObjectId === TARGET_REMOTE_ID
    && item.content.hash === WINDOWS_HASH
  ));
  assert.ok(conflictVerification.state.some(item =>
    item.kind === "base-authority"
    && item.deviceId === MOBILE.deviceId
    && item.path === TARGET_PATH
    && item.expectedRemoteObjectId === TARGET_REMOTE_ID
    && item.expectedContent?.hash === BASE_HASH
  ));

  const finalVerification = subject.verifier.requests[3]!;
  assert.ok(finalVerification.convergence.some(item =>
    item.kind === "cross-device-conflict-resolution"
    && item.path === TARGET_PATH
    && item.remoteObjectId === TARGET_REMOTE_ID
    && item.content.hash === MOBILE_HASH
    && item.deviceIds.includes(WINDOWS.deviceId)
    && item.deviceIds.includes(MOBILE.deviceId)
  ));
  assert.ok(finalVerification.state.some(item =>
    item.kind === "unrelated-mutation-absence"
  ));

  assert.deepEqual(subject.handoffs, [
    "seed-mobile:mobile",
    "seed-windows:windows",
    "baseline-mobile:mobile",
    "edit-windows:windows",
    "conflict-mobile:mobile",
    "final-windows:windows",
  ]);
  assert.deepEqual(subject.evidenceInputs, [{
    conflictId: String(CONFLICT_ID),
    baseHash: BASE_HASH,
    windowsEditHash: WINDOWS_HASH,
    mobileEditHash: MOBILE_HASH,
  }]);

  const authorityCycles = productionSteps
    .map(step => (step.input as { readonly authorityCycleId?: string } | undefined)?.authorityCycleId)
    .filter((value): value is string => value !== undefined);
  for (const cycle of Object.values(D02_AUTHORITY_CYCLES)) {
    assert.ok(authorityCycles.includes(cycle));
  }
});

test("VH25 D02 rejects newest-wins silent overwrite before conflicting mobile plan execution", async () => {
  const subject = harness({ mobileConflictPlan: silentOverwritePlan() });
  subject.runtime.setEnabled(true);

  const result = runnerResult(await subject.runtime.startScenario("D02"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /unresolved-conflict|forbidden operation|Expected operation|execution disposition/i);
  }

  assert.deepEqual(subject.mobile.executedPlanIds, ["plan:d02:seed-mobile"]);
  assert.equal(subject.mobile.requestedActions.some(action => action.kind === "resolve-conflict"), false);
  assert.deepEqual(subject.windows.executedPlanIds, [
    "plan:d02:seed-windows",
    "plan:d02:publish-windows",
  ]);
  assert.equal(subject.verifier.requests.length, 1);
});

test("VH25 D02 rejects incomplete conflict preservation before explicit resolution", async () => {
  const subject = harness({ conflict: unresolvedConflict({ omitBase: true }) });
  subject.runtime.setEnabled(true);

  const result = runnerResult(await subject.runtime.startScenario("D02"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /preserve exact local, remote, and BASE provenance/i);
  }

  assert.equal(subject.mobile.requestedActions.some(action => action.kind === "resolve-conflict"), false);
  assert.equal(subject.verifier.requests.length, 1);
  assert.deepEqual(subject.mobile.executedPlanIds, [
    "plan:d02:seed-mobile",
    "plan:d02:mobile-conflict",
  ]);
});

test("VH25 D02 rejects premature mobile BASE authority commit before resolution", async () => {
  const subject = harness({
    verifierVerdict(request, index) {
      if (index !== 1) return "pass";
      const baseExpectation = request.state.find(item =>
        item.kind === "base-authority"
        && item.deviceId === MOBILE.deviceId
        && item.path === TARGET_PATH
      );
      assert.ok(baseExpectation && baseExpectation.kind === "base-authority");
      assert.equal(baseExpectation.expectedContent?.hash, BASE_HASH);
      return "fail";
    },
  });
  subject.runtime.setEnabled(true);

  const result = runnerResult(await subject.runtime.startScenario("D02"));
  assert.equal(result.status, "FAIL");
  if (result.status === "FAIL") {
    assert.match(result.reason.summary, /pre-resolution conflict preservation objective verification failed/i);
  }

  assert.equal(subject.mobile.requestedActions.some(action => action.kind === "resolve-conflict"), false);
  assert.equal(subject.verifier.requests.length, 2);
  assert.deepEqual(subject.windows.previewedPlanIds, [
    "plan:d02:seed-windows",
    "plan:d02:publish-windows",
  ]);
});
