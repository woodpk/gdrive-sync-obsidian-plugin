import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentHash,
  type PlannedOperation,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import { createInitialAuthorityState } from "../src/state/persistent-state-store";
import {
  validationAssertionGroupResult,
  validationEvidenceRef,
  validationVerificationResult,
  type ValidationAssertionObservation,
  type ValidationProductionDriverRequest,
  type ValidationProductionDriverResult,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  type ValidationFixtureDescriptor,
  type ValidationFixtureSpec,
} from "../src/validation/fixture-manager";
import {
  C09_SENTINEL_RELATIVE_PATH,
  C09_TARGET_RELATIVE_PATH,
  createC09WindowsDeleteIosTrashScenario,
} from "../src/validation/scenarios/c09-windows-delete-ios-trash";
import { composeValidationScenarioRunner } from "../src/validation/scenario-runner";
import type {
  ValidationRunnerPersistentState,
  ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import type {
  ValidationRunnerResumeAdoptionJournal,
  ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  validationDeviceIdentity,
  validationFixtureIdentity,
  validationRunIdentity,
  type ValidationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";

const run = validationRunIdentity("vh22-c09-focused", "C09");
const windows = validationDeviceIdentity("vh22-windows", "windows-desktop");
const mobile = validationDeviceIdentity("vh22-iphone", "iphone");
const targetPath = contractId<"VaultPath">(C09_TARGET_RELATIVE_PATH);
const sentinelPath = contractId<"VaultPath">(C09_SENTINEL_RELATIVE_PATH);
const targetRemoteId = contractId<"RemoteObjectId">("drive-c09-target");
const sentinelRemoteId = contractId<"RemoteObjectId">("drive-c09-sentinel");
const wrongRemoteId = contractId<"RemoteObjectId">("drive-c09-wrong");
const targetHash = contractId<"ContentHash">("sha256:" + "a".repeat(64));
const sentinelHash = contractId<"ContentHash">("sha256:" + "b".repeat(64));

function revisionOf(value: unknown): number | null {
  if (value === null || value === undefined || typeof value !== "object") return null;
  const revision = (value as { readonly revision?: unknown }).revision;
  return typeof revision === "number" ? revision : null;
}

class MemoryRunnerStateStore implements ValidationRunnerStateStore {
  private value: ValidationRunnerPersistentState | null = null;

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
  private value: ValidationRunnerResumeAdoptionJournal | null = null;

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

class FakeFixtureManager {
  readonly created: ValidationFixtureDescriptor[] = [];
  readonly deleted: string[] = [];

  async create(spec: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    const path = contractId<"VaultPath">(spec.relativePath);
    const descriptor: ValidationFixtureDescriptor = {
      identity: validationFixtureIdentity(run, spec.fixtureId),
      relativePath: spec.relativePath,
      path,
      kind: spec.kind,
      purpose: spec.purpose,
      version: spec.version,
      sizeBytes: spec.fixtureId.includes("sentinel") ? 23 : 19,
      hash: spec.fixtureId.includes("sentinel") ? sentinelHash : targetHash,
    };
    this.created.push(descriptor);
    return descriptor;
  }

  async delete(fixtureId: string): Promise<ValidationFixtureDescriptor> {
    const descriptor = this.created.find(value => String(value.identity.fixtureId) === fixtureId);
    if (!descriptor) throw new Error("fixture unavailable: " + fixtureId);
    this.deleted.push(fixtureId);
    return descriptor;
  }
}

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly destructive?: boolean;
  readonly remoteObjectId?: RemoteObjectId;
}): PlannedOperation {
  return {
    operationId: contractId<"OperationId">(input.id),
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{ code: "vh22-c09-test", summary: "Focused C09 scenario test plan." }],
  };
}

function plan(id: string, operations: readonly PlannedOperation[]): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(id),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function windowsEstablishPlan(): SynchronizationPlan {
  return plan("c09-windows-establish", [
    operation({ id: "op-target-upload", kind: "upload-create", path: targetPath, targetSide: "remote" }),
    operation({ id: "op-sentinel-upload", kind: "upload-create", path: sentinelPath, targetSide: "remote" }),
  ]);
}

function mobileEstablishPlan(): SynchronizationPlan {
  return plan("c09-mobile-establish", [
    operation({ id: "op-target-download", kind: "download-create", path: targetPath, targetSide: "local", remoteObjectId: targetRemoteId }),
    operation({ id: "op-sentinel-download", kind: "download-create", path: sentinelPath, targetSide: "local", remoteObjectId: sentinelRemoteId }),
  ]);
}

function windowsDeletePlan(
  remoteObjectId: RemoteObjectId = targetRemoteId,
  extra: readonly PlannedOperation[] = [],
): SynchronizationPlan {
  return plan("c09-windows-delete", [
    operation({
      id: "op-target-trash-remote",
      kind: "trash-remote",
      path: targetPath,
      targetSide: "remote",
      destructive: true,
      remoteObjectId,
    }),
    operation({ id: "op-sentinel-noop-windows", kind: "noop", path: sentinelPath }),
    ...extra,
  ]);
}

function mobileDeletePlan(): SynchronizationPlan {
  return plan("c09-mobile-delete", [
    operation({
      id: "op-target-trash-local",
      kind: "trash-local",
      path: targetPath,
      targetSide: "local",
      destructive: true,
    }),
    operation({ id: "op-sentinel-noop-mobile", kind: "noop", path: sentinelPath }),
  ]);
}

class FakeProductionDriver {
  readonly requests: ValidationProductionDriverRequest[] = [];
  private previewIndex = 0;

  constructor(private readonly previews: readonly SynchronizationPlan[]) {}

  async dispatch(request: ValidationProductionDriverRequest): Promise<ValidationProductionDriverResult> {
    this.requests.push(request);
    if (request.kind === "preview-manual") {
      const observed = this.previews[this.previewIndex++];
      if (!observed) return { status: "no-plan-observed", run: request.run, reason: "no queued plan" };
      return { status: "plan-observed", run: request.run, plan: observed };
    }
    if (request.kind === "execute-asserted-plan") {
      return {
        status: "request-accepted",
        run: request.run,
        requestKind: "execute-asserted-plan",
        productionOutcomeEstablished: false,
      };
    }
    return {
      status: "request-rejected",
      run: request.run,
      reason: "unsupported focused-test request",
      productionOutcomeEstablished: false,
    };
  }
}

function trustedAuthority() {
  const state = createInitialAuthorityState({
    persistenceRevision: contractId<"StateRevision">("state-1"),
    semanticGeneration: contractId<"SemanticStateGeneration">("generation-1"),
    vaultIdentity: contractId<"VaultIdentity">("vault-c09"),
    deviceIdentity: contractId<"DeviceIdentity">("device-c09-windows"),
  });
  return {
    async loadAuthority() {
      return {
        status: "trusted" as const,
        state: {
          ...state,
          base: [
            {
              path: targetPath,
              entityKind: "file" as const,
              localExisted: true,
              remoteExisted: true,
              content: { hash: targetHash, sizeBytes: 19 },
              remoteObjectId: targetRemoteId,
            },
            {
              path: sentinelPath,
              entityKind: "file" as const,
              localExisted: true,
              remoteExisted: true,
              content: { hash: sentinelHash, sizeBytes: 23 },
              remoteObjectId: sentinelRemoteId,
            },
          ],
          remoteMappings: [
            { path: targetPath, remoteObjectId: targetRemoteId, entityKind: "file" as const },
            { path: sentinelPath, remoteObjectId: sentinelRemoteId, entityKind: "file" as const },
          ],
        },
      };
    },
  };
}

class CapturingVerifier {
  readonly requests: ValidationStateConvergenceRequest[] = [];

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.requests.push(request);
    const stateObservations = request.state.map((postcondition, index) => ({
      status: "satisfied" as const,
      assertion: postcondition.assertion,
      evidenceRefs: [validationEvidenceRef("c09-test:state:" + (index + 1))] as const,
    })) as unknown as [ValidationAssertionObservation, ...ValidationAssertionObservation[]];
    const convergenceObservations = request.convergence.map((postcondition, index) => ({
      status: "satisfied" as const,
      assertion: postcondition.assertion,
      evidenceRefs: [validationEvidenceRef("c09-test:convergence:" + (index + 1))] as const,
    })) as unknown as [ValidationAssertionObservation, ...ValidationAssertionObservation[]];
    const state = validationAssertionGroupResult(stateObservations);
    const convergence = validationAssertionGroupResult(convergenceObservations);
    return {
      result: validationVerificationResult(request.run, state, convergence),
      evidence: [
        {
          ref: validationEvidenceRef("c09-test:objective:" + this.requests.length),
          source: "convergence",
          summary: "Focused test observed the requested C09 verification surface.",
        },
      ],
    };
  }
}

function createHarness(input?: {
  readonly windowsDelete?: SynchronizationPlan;
}) {
  const fixtures = new FakeFixtureManager();
  const windowsDriver = new FakeProductionDriver([
    windowsEstablishPlan(),
    input?.windowsDelete ?? windowsDeletePlan(),
  ]);
  const mobileDriver = new FakeProductionDriver([
    mobileEstablishPlan(),
    mobileDeletePlan(),
  ]);
  const verifier = new CapturingVerifier();
  const handoffs: string[] = [];

  const scenario = createC09WindowsDeleteIosTrashScenario({
    windowsFixtures: fixtures,
    windowsProduction: windowsDriver,
    mobileProduction: mobileDriver,
    windowsAuthority: trustedAuthority(),
    verifier,
    handoffs: {
      async handoff(input) {
        handoffs.push(input.phase);
        return [validationEvidenceRef("c09-test:handoff:" + input.phase)];
      },
    },
    windowsDevice: windows,
    mobileDevice: mobile,
    build: { version: "vh22-focused", commitSha: "focused-test" },
    capturedAt: () => "2026-09-18T14:30:00.000Z",
  });

  const composition = composeValidationScenarioRunner({
    stateStore: new MemoryRunnerStateStore(),
    resumeAdoptionStore: new MemoryResumeAdoptionStore(),
    prerequisites: scenario.prerequisites,
    modules: scenario.modules,
    humanCheckpoints: {
      async consumeResume() {
        throw new Error("C09 must not require a human checkpoint.");
      },
    },
    definitions: [scenario.definition],
  });

  return { scenario, composition, fixtures, windowsDriver, mobileDriver, verifier, handoffs };
}

async function executeScenario(harness: ReturnType<typeof createHarness>) {
  let result = await harness.composition.runner.startScenario({
    run,
    definition: harness.scenario.definition,
  });
  let advances = 0;
  while (result.status === "RUNNING" && advances < 40) {
    result = await harness.composition.runner.advance({
      run,
      expectedRevision: result.state.revision,
    });
    advances += 1;
  }
  assert.ok(advances < 40, "C09 focused scenario must terminate deterministically.");
  return result;
}

test("VH22 C09 deterministically establishes trust, deletes on Windows, trashes the exact remote object, and applies mobile recoverable deletion", async () => {
  const harness = createHarness();
  const result = await executeScenario(harness);

  assert.equal(result.status, "PASS");
  assert.deepEqual(harness.handoffs, [
    "establish-to-mobile",
    "delete-to-windows",
    "delete-to-mobile",
  ]);
  assert.deepEqual(harness.fixtures.deleted, ["c09-delete-target"]);

  const windowsExecutes = harness.windowsDriver.requests.filter(request => request.kind === "execute-asserted-plan");
  const mobileExecutes = harness.mobileDriver.requests.filter(request => request.kind === "execute-asserted-plan");
  assert.equal(windowsExecutes.length, 2);
  assert.equal(mobileExecutes.length, 2);

  assert.equal(harness.verifier.requests.length, 2);
  const final = harness.verifier.requests[1]!;
  const remoteTrash = final.state.find(postcondition => postcondition.kind === "live-trash-absence-state");
  assert.ok(remoteTrash && remoteTrash.kind === "live-trash-absence-state");
  assert.equal(remoteTrash.expectedState, "trashed");
  assert.equal(remoteTrash.remoteObjectId, targetRemoteId);

  const tombstones = final.state.filter(postcondition => postcondition.kind === "mapping-or-tombstone");
  assert.equal(tombstones.length, 2);
  assert.ok(tombstones.every(postcondition =>
    postcondition.kind === "mapping-or-tombstone"
    && postcondition.expected === "tombstone"
    && postcondition.remoteObjectId === targetRemoteId
  ));

  const livePath = final.convergence.find(postcondition => postcondition.kind === "cross-device-path");
  assert.ok(livePath && livePath.kind === "cross-device-path");
  assert.equal(livePath.expected, "absent");

  const unrelated = final.state.find(postcondition => postcondition.kind === "unrelated-mutation-absence");
  assert.ok(unrelated && unrelated.kind === "unrelated-mutation-absence");
  assert.equal(unrelated.local.length, 2);
  assert.equal(unrelated.remote.length, 1);
  assert.equal(unrelated.remote[0]?.remoteObjectId, sentinelRemoteId);

  assert.equal(harness.scenario.evidenceRecord()?.verdict.status, "PASS");
});

test("VH22 C09 hard-stops before destructive execution when Windows plans the wrong remote object", async () => {
  const harness = createHarness({ windowsDelete: windowsDeletePlan(wrongRemoteId) });
  const result = await executeScenario(harness);

  assert.equal(result.status, "FAIL");
  const windowsExecutes = harness.windowsDriver.requests.filter(request => request.kind === "execute-asserted-plan");
  assert.equal(windowsExecutes.length, 1, "only trusted-fixture establishment may execute");
  assert.equal(
    harness.mobileDriver.requests.filter(request => request.kind === "preview-manual").length,
    1,
    "mobile deletion must not begin after wrong-object plan rejection",
  );
  assert.equal(harness.verifier.requests.length, 1, "final deletion verification must not run after the hard stop");
});

test("VH22 C09 hard-stops an unexpected additional destructive mutation before Windows delete execution", async () => {
  const unexpected = operation({
    id: "op-unexpected-sentinel-trash",
    kind: "trash-remote",
    path: sentinelPath,
    targetSide: "remote",
    destructive: true,
    remoteObjectId: sentinelRemoteId,
  });
  const harness = createHarness({
    windowsDelete: windowsDeletePlan(targetRemoteId, [unexpected]),
  });
  const result = await executeScenario(harness);

  assert.equal(result.status, "FAIL");
  const windowsExecutes = harness.windowsDriver.requests.filter(request => request.kind === "execute-asserted-plan");
  assert.equal(windowsExecutes.length, 1, "unexpected destructive plan must not be dispatched");
  assert.equal(harness.scenario.evidenceRecord(), undefined);
});
