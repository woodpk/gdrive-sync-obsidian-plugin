import assert from "node:assert/strict";
import test from "node:test";
import type {
  ConflictAssessment,
  ManagedRemoteIdentity,
  ProductSurfaceState,
  SynchronizationPlan,
  UserAction,
  UserActionResult,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor, type ExecutorRunEvidence } from "../src/product/production-executor";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { SynchronizationStateAuthorityAdapter } from "../src/product/synchronization-adapters";
import {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
} from "../src/state/persistent-state-store";
import {
  ValidationProductionPathDriver,
  type ValidationProductionControllerPort,
} from "../src/validation/production-path-driver";
import {
  matchedValidationPlanAssertion,
  validationPlanAssertionId,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";

const id = <T extends string>(value: string) => contractId<T>(value);
const step = validationStepId("step:vh06");

function plan(trigger: SynchronizationPlan["trigger"], suffix: string = trigger): SynchronizationPlan {
  return {
    planId: id<"PlanId">(`plan:vh06:${suffix}`),
    trigger,
    operations: [],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function recordingController(input?: {
  readonly manualPlan?: SynchronizationPlan;
  readonly verifyPlan?: SynchronizationPlan;
  readonly actionResult?: UserActionResult;
}) {
  const manualPlan = input?.manualPlan ?? plan("manual");
  const verifyPlan = input?.verifyPlan ?? plan("verify-reconcile");
  const actionResult = input?.actionResult ?? ({ status: "accepted" } as const);
  const calls: string[] = [];
  const actions: UserAction[] = [];
  let listener: ((surface: ProductSurfaceState) => void) | undefined;
  let surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [], planPreview: manualPlan };
  const evidence: ExecutorRunEvidence = {
    managedRemote: {
      rootId: id<"RemoteObjectId">("remote:vh06"),
      vaultIdentity: id<"VaultIdentity">("vault:vh06"),
      protocolVersion: id<"ProtocolVersion">("1"),
    },
    remoteEnumerationComplete: true,
  };
  const controller: ValidationProductionControllerPort = {
    previewManual: async () => { calls.push("preview-manual"); return manualPlan; },
    previewVerifyReconcile: async () => { calls.push("preview-verify-reconcile"); return verifyPlan; },
    runAutomatic: async trigger => { calls.push(`automatic:${trigger}`); },
    request: async action => { calls.push(`request:${action.kind}`); actions.push(action); return actionResult; },
    requestPreviewAction: async action => { calls.push(`preview-action:${action.kind}`); actions.push(action); return actionResult; },
    currentSurface: () => surface,
    onSurface: next => { calls.push("on-surface"); listener = next; return () => { listener = undefined; }; },
    currentRunEvidence: () => evidence,
  };
  return {
    controller,
    calls,
    actions,
    get surface() { return surface; },
    evidence,
    emit: (value: ProductSurfaceState) => listener?.(value),
    setSurface: (value: ProductSurfaceState) => { surface = value; },
  };
}

function unresolvedTextConflict(conflictId: string, pathValue: string): Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> {
  const path = id<"VaultPath">(pathValue);
  return {
    kind: "unresolved-text",
    conflictId: id<"ConflictId">(conflictId),
    path,
    preserved: {
      local: { source: "local", version: { path, entityKind: "file" } },
      remote: { source: "remote", version: { path, entityKind: "file" } },
    },
  };
}

test("VH06 driver delegates planning, Verify/Reconcile, automatic sync, cancellation, status, and lifecycle observation to production seams", async () => {
  const fixture = recordingController();
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const run = validationRunIdentity("run:vh06:delegation", "C03");

  const manual = await driver.dispatch({ kind: "preview-manual", run, stepId: step });
  assert.equal(manual.status, "plan-observed");
  if (manual.status === "plan-observed") assert.strictEqual(manual.plan, fixture.surface.planPreview);

  const verify = await driver.dispatch({ kind: "preview-verify-reconcile", run, stepId: step });
  assert.equal(verify.status, "plan-observed");
  if (verify.status === "plan-observed") assert.equal(verify.plan.trigger, "verify-reconcile");

  const automatic = await driver.dispatch({ kind: "run-automatic", run, stepId: step, trigger: "periodic" });
  assert.deepEqual(automatic, { status: "request-accepted", run, requestKind: "run-automatic", productionOutcomeEstablished: false });

  const cancelled = await driver.dispatch({ kind: "cancel-active-sync", run, stepId: step });
  assert.deepEqual(cancelled, { status: "request-accepted", run, requestKind: "cancel-active-sync", productionOutcomeEstablished: false });
  assert.equal(fixture.actions.at(-1)?.kind, "cancel-active-sync");

  assert.strictEqual(driver.currentSurface(), fixture.surface);
  assert.strictEqual(driver.currentRunEvidence(), fixture.evidence);
  let observed: ProductSurfaceState | undefined;
  const unsubscribe = driver.onSurface(surface => { observed = surface; });
  const changed: ProductSurfaceState = { status: { kind: "paused" }, conflicts: [] };
  fixture.emit(changed);
  assert.strictEqual(observed, changed);
  unsubscribe();

  assert.deepEqual(fixture.calls, [
    "preview-manual",
    "preview-verify-reconcile",
    "automatic:periodic",
    "request:cancel-active-sync",
    "on-surface",
  ]);
});

test("H6B resolve-observed-conflict delegates only the exact production conflict observed for the same run", async () => {
  for (const resolutionKind of ["keep-local", "keep-remote", "keep-both"] as const) {
    const fixture = recordingController();
    const conflict = unresolvedTextConflict("conflict:h6b:exact:" + resolutionKind, "Notes/conflict.md");
    fixture.setSurface({ status: { kind: "conflict-present", conflictCount: 1 }, conflicts: [conflict] });
    const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
    const run = validationRunIdentity("run:h6b:exact:" + resolutionKind, "D02");

    const preview = await driver.dispatch({ kind: "preview-manual", run, stepId: step });
    assert.equal(preview.status, "plan-observed");

    const result = await driver.dispatch({
      kind: "resolve-observed-conflict",
      run,
      stepId: step,
      expectedVaultPath: conflict.path,
      expectedConflictKind: "unresolved-text",
      resolution: { kind: resolutionKind },
    });
    assert.deepEqual(result, {
      status: "request-accepted",
      run,
      requestKind: "resolve-observed-conflict",
      productionOutcomeEstablished: false,
    });
    assert.deepEqual(fixture.actions.at(-1), {
      kind: "resolve-conflict",
      conflictId: conflict.conflictId,
      resolution: { kind: resolutionKind },
    });
  }
});

test("H6B resolve-observed-conflict fails closed for wrong run, path, kind, ambiguity, and stale current surface", async () => {
  const conflict = unresolvedTextConflict("conflict:h6b:guarded", "Notes/guarded.md");
  const replacement = unresolvedTextConflict("conflict:h6b:replacement", "Notes/guarded.md");
  const fixture = recordingController();
  fixture.setSurface({ status: { kind: "conflict-present", conflictCount: 1 }, conflicts: [conflict] });
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const runA = validationRunIdentity("run:h6b:a", "D02");
  const runB = validationRunIdentity("run:h6b:b", "D02");
  assert.equal((await driver.dispatch({ kind: "preview-manual", run: runA, stepId: step })).status, "plan-observed");

  const before = fixture.actions.length;
  assert.equal((await driver.dispatch({
    kind: "resolve-observed-conflict",
    run: runB,
    stepId: step,
    expectedVaultPath: conflict.path,
    expectedConflictKind: "unresolved-text",
    resolution: { kind: "keep-local" },
  })).status, "request-rejected");
  assert.equal((await driver.dispatch({
    kind: "resolve-observed-conflict",
    run: runA,
    stepId: step,
    expectedVaultPath: id<"VaultPath">("Notes/wrong.md"),
    expectedConflictKind: "unresolved-text",
    resolution: { kind: "keep-local" },
  })).status, "request-rejected");
  assert.equal((await driver.dispatch({
    kind: "resolve-observed-conflict",
    run: runA,
    stepId: step,
    expectedVaultPath: conflict.path,
    expectedConflictKind: "opaque-binary",
    resolution: { kind: "keep-local" },
  } as never)).status, "request-rejected");
  assert.equal(fixture.actions.length, before);

  fixture.setSurface({
    status: { kind: "conflict-present", conflictCount: 2 },
    conflicts: [conflict, unresolvedTextConflict("conflict:h6b:ambiguous", "Notes/guarded.md")],
    planPreview: fixture.surface.planPreview,
  });
  assert.equal((await driver.dispatch({ kind: "preview-manual", run: runA, stepId: step })).status, "plan-observed");
  assert.equal((await driver.dispatch({
    kind: "resolve-observed-conflict",
    run: runA,
    stepId: step,
    expectedVaultPath: conflict.path,
    expectedConflictKind: "unresolved-text",
    resolution: { kind: "keep-both" },
  })).status, "request-rejected");
  assert.equal(fixture.actions.length, before);

  fixture.setSurface({ status: { kind: "conflict-present", conflictCount: 1 }, conflicts: [conflict] });
  assert.equal((await driver.dispatch({ kind: "preview-manual", run: runA, stepId: step })).status, "plan-observed");
  fixture.setSurface({ status: { kind: "conflict-present", conflictCount: 1 }, conflicts: [replacement] });
  assert.equal((await driver.dispatch({
    kind: "resolve-observed-conflict",
    run: runA,
    stepId: step,
    expectedVaultPath: conflict.path,
    expectedConflictKind: "unresolved-text",
    resolution: { kind: "keep-remote" },
  })).status, "request-rejected");
  assert.equal(fixture.actions.length, before);
});

test("H6B resolve-observed-conflict preserves production rejection and never converts request acceptance into convergence proof", async () => {
  const conflict = unresolvedTextConflict("conflict:h6b:rejected", "Notes/rejected.md");
  const fixture = recordingController({ actionResult: { status: "rejected", reason: "conflict is no longer current" } });
  fixture.setSurface({ status: { kind: "conflict-present", conflictCount: 1 }, conflicts: [conflict] });
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const run = validationRunIdentity("run:h6b:rejected", "D02");
  assert.equal((await driver.dispatch({ kind: "preview-manual", run, stepId: step })).status, "plan-observed");

  const rejected = await driver.dispatch({
    kind: "resolve-observed-conflict",
    run,
    stepId: step,
    expectedVaultPath: conflict.path,
    expectedConflictKind: "unresolved-text",
    resolution: { kind: "keep-local" },
  });
  assert.deepEqual(rejected, {
    status: "request-rejected",
    run,
    reason: "conflict is no longer current",
    productionOutcomeEstablished: false,
  });
});

test("VH06 asserted execution is run-bound, must reference a plan observed by the driver, and never manufactures production success", async () => {
  const fixture = recordingController();
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const run = validationRunIdentity("run:vh06:execute", "D01");
  const otherRun = validationRunIdentity("run:vh06:other", "D01");
  const observed = await driver.dispatch({ kind: "preview-manual", run, stepId: step });
  assert.equal(observed.status, "plan-observed");
  if (observed.status !== "plan-observed") return;

  const matched = matchedValidationPlanAssertion({ assertionId: "assertion:vh06", run, plan: observed.plan });
  const accepted = await driver.dispatch({ kind: "execute-asserted-plan", run, stepId: step, authorization: matched.authorization });
  assert.deepEqual(accepted, { status: "request-accepted", run, requestKind: "execute-asserted-plan", productionOutcomeEstablished: false });
  assert.deepEqual(fixture.actions.at(-1), { kind: "execute-plan", planId: observed.plan.planId });

  const beforeMismatch = fixture.actions.length;
  const mismatched = await driver.dispatch({
    kind: "execute-asserted-plan",
    run,
    stepId: step,
    authorization: {
      assertionId: validationPlanAssertionId("assertion:other-run"),
      run: otherRun,
      planId: observed.plan.planId,
      executionAuthorized: true,
    },
  });
  assert.equal(mismatched.status, "request-rejected");
  assert.equal(fixture.actions.length, beforeMismatch);

  const unseenPlan = plan("manual", "unseen");
  const unseen = await driver.dispatch({
    kind: "execute-asserted-plan",
    run,
    stepId: step,
    authorization: {
      assertionId: validationPlanAssertionId("assertion:unseen"),
      run,
      planId: unseenPlan.planId,
      executionAuthorized: true,
    },
  });
  assert.equal(unseen.status, "request-rejected");
  assert.equal(fixture.actions.length, beforeMismatch);
});

test("VH06 preserves production rejection and failure instead of converting either into success", async () => {
  const rejectedFixture = recordingController({ actionResult: { status: "rejected", reason: "plan is stale or no longer current" } });
  const rejectedDriver = new ValidationProductionPathDriver({ productController: () => rejectedFixture.controller });
  const run = validationRunIdentity("run:vh06:reject", "E07");
  const preview = await rejectedDriver.dispatch({ kind: "preview-manual", run, stepId: step });
  assert.equal(preview.status, "plan-observed");
  if (preview.status !== "plan-observed") return;
  const authorization = matchedValidationPlanAssertion({ assertionId: "assertion:reject", run, plan: preview.plan }).authorization;
  const rejected = await rejectedDriver.dispatch({ kind: "execute-asserted-plan", run, stepId: step, authorization });
  assert.deepEqual(rejected, {
    status: "request-rejected",
    run,
    reason: "plan is stale or no longer current",
    productionOutcomeEstablished: false,
  });

  const failingController = { ...rejectedFixture.controller, previewManual: async () => { throw new Error("production planning failed"); } };
  const failingDriver = new ValidationProductionPathDriver({ productController: () => failingController });
  const failed = await failingDriver.dispatch({ kind: "preview-manual", run, stepId: step });
  assert.deepEqual(failed, {
    status: "request-failed",
    run,
    reason: "production planning failed",
    productionOutcomeEstablished: false,
  });

  const unavailable = new ValidationProductionPathDriver({ productController: () => undefined });
  const unavailableResult = await unavailable.dispatch({ kind: "cancel-active-sync", run, stepId: step });
  assert.deepEqual(unavailableResult, {
    status: "request-failed",
    run,
    reason: "production controller is unavailable",
    productionOutcomeEstablished: false,
  });
});

test("VH06 delegates a reviewed manual plan through the real ProductController authoritative execute-plan path", async () => {
  const vault = id<"VaultIdentity">("vault:vh06:production");
  const device = id<"DeviceIdentity">("device:vh06:production");
  const remote: ManagedRemoteIdentity = {
    rootId: id<"RemoteObjectId">("remote:vh06:production"),
    vaultIdentity: vault,
    protocolVersion: id<"ProtocolVersion">("1"),
  };
  const context = { expectation: "new-installation" as const, expectedVaultIdentity: vault, expectedDeviceIdentity: device };
  const rawStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await rawStore.saveTrusted(createInitialAuthorityState({
    persistenceRevision: id<"StateRevision">("persistence:vh06:1"),
    semanticGeneration: id<"SemanticStateGeneration">("semantic:vh06:1"),
    vaultIdentity: vault,
    deviceIdentity: device,
  }));
  const state = new SynchronizationStateAuthorityAdapter(rawStore);
  const assembly = {
    input: { snapshots: [], state: { status: "uninitialized" as const } },
    managedRemote: remote,
    remoteEnumeration: { status: "complete" as const },
    mode: "full" as const,
  };
  let controller: ProductController;
  const executor = new ProductSynchronizationExecutor({} as never, {} as never, state, context, () => controller.currentRunEvidence());
  controller = new ProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: state,
    authorityStore: state,
    snapshotAssembler: { assembleFull: async () => assembly, assemble: async () => assembly } as never,
    executor,
    conflictResolver: { assess: async () => ({ kind: "none" as const }) },
    plannerForTrigger: trigger => ({ plan: async () => plan(trigger, "production") }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20),
    holderId: "vh06-production-driver-test",
  });

  const driver = new ValidationProductionPathDriver({ productController: () => controller });
  const run = validationRunIdentity("run:vh06:production", "C06");
  const preview = await driver.dispatch({ kind: "preview-manual", run, stepId: step });
  assert.equal(preview.status, "plan-observed");
  if (preview.status !== "plan-observed") return;
  assert.equal(preview.plan.trigger, "manual");

  const authorization = matchedValidationPlanAssertion({ assertionId: "assertion:production", run, plan: preview.plan }).authorization;
  const execution = await driver.dispatch({ kind: "execute-asserted-plan", run, stepId: step, authorization });
  assert.deepEqual(execution, { status: "request-accepted", run, requestKind: "execute-asserted-plan", productionOutcomeEstablished: false });
  assert.equal(driver.currentSurface().status.kind, "idle-ready");
  assert.throws(() => driver.currentRunEvidence(), /no active synchronization run evidence/);
});