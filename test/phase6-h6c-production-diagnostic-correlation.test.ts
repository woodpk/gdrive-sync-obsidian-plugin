import assert from "node:assert/strict";
import test from "node:test";
import type {
  ConflictAssessment,
  ProductSurfaceState,
  SynchronizationPlan,
  UserAction,
  UserActionResult,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import {
  matchedValidationPlanAssertion,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  ValidationProductionPathDriver,
  type ValidationProductionControllerPort,
} from "../src/validation/production-path-driver";
import {
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import { ValidationProductionDiagnosticFixture } from "./validation-production-diagnostic-fixture";

const stepId = validationStepId("step:h6c");
const cycleA = "cycle:h6c:a";
const cycleB = "cycle:h6c:b";

function plan(trigger: SynchronizationPlan["trigger"], id: string): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(id),
    trigger,
    operations: [],
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

function conflict(): Extract<ConflictAssessment, { readonly kind: "unresolved-text" }> {
  const path = contractId<"VaultPath">("Notes/h6c-conflict.md");
  return {
    kind: "unresolved-text",
    conflictId: contractId<"ConflictId">("conflict:h6c"),
    path,
    preserved: {
      local: { source: "local", version: { path, entityKind: "file" } },
      remote: { source: "remote", version: { path, entityKind: "file" } },
    },
  };
}

type TerminalMode = "complete" | "missing" | "failed" | "cancelled" | "duplicate" | "wrong-run";

function controllerFixture(input?: {
  readonly manualPlan?: SynchronizationPlan;
  readonly verifyPlan?: SynchronizationPlan;
  readonly conflict?: Extract<ConflictAssessment, { readonly kind: "unresolved-text" }>;
  readonly terminalMode?: TerminalMode;
}) {
  const manualPlan = input?.manualPlan ?? plan("manual", "plan:h6c:manual");
  const verifyPlan = input?.verifyPlan ?? plan("verify-reconcile", "plan:h6c:verify");
  const diagnostics = new ValidationProductionDiagnosticFixture();
  const terminalMode = input?.terminalMode ?? "complete";
  const passedDiagnosticRunIds: number[] = [];
  const actions: UserAction[] = [];
  const surface: ProductSurfaceState = input?.conflict
    ? { status: { kind: "conflict-present", conflictCount: 1 }, conflicts: [input.conflict] }
    : { status: { kind: "idle-ready" }, conflicts: [] };

  const emitTerminal = (diagnosticRunId: number): void => {
    switch (terminalMode) {
      case "complete":
        diagnostics.complete(diagnosticRunId);
        return;
      case "missing":
        return;
      case "failed":
        diagnostics.fail(diagnosticRunId);
        return;
      case "cancelled":
        diagnostics.cancel(diagnosticRunId);
        return;
      case "duplicate":
        diagnostics.complete(diagnosticRunId);
        diagnostics.duplicateComplete(diagnosticRunId);
        return;
      case "wrong-run":
        diagnostics.complete(diagnosticRunId + 1000);
        return;
    }
  };

  const controller: ValidationProductionControllerPort = {
    previewManual: async () => {
      diagnostics.begin("manual", manualPlan.planId);
      return manualPlan;
    },
    previewVerifyReconcile: async () => {
      diagnostics.begin("verify-reconcile", verifyPlan.planId);
      return verifyPlan;
    },
    runAutomatic: async () => undefined,
    request: async (action): Promise<UserActionResult> => {
      actions.push(action);
      if (action.kind === "resolve-conflict") {
        const diagnosticRunId = diagnostics.begin(
          "conflict-resolution",
          contractId<"PlanId">("plan:h6c:conflict-resolution"),
        );
        emitTerminal(diagnosticRunId);
      }
      return { status: "accepted" };
    },
    requestPreviewAction: async (action, diagnosticRunId) => {
      actions.push(action);
      if (diagnosticRunId !== undefined) {
        passedDiagnosticRunIds.push(diagnosticRunId);
        emitTerminal(diagnosticRunId);
      }
      return { status: "accepted" };
    },
    currentDiagnosticCorrelation: () => diagnostics.current(),
    diagnosticSnapshot: () => diagnostics.snapshot(),
    currentSurface: () => surface,
    onSurface: () => () => undefined,
    currentRunEvidence: () => { throw new Error("H6C focused correlation tests do not require executor evidence."); },
  };

  return {
    controller,
    diagnostics,
    passedDiagnosticRunIds,
    actions,
  };
}

async function observeAndAuthorize(
  driver: ValidationProductionPathDriver,
  run: ReturnType<typeof validationRunIdentity>,
  authorityCycleId: string,
  kind: "preview-manual" | "preview-verify-reconcile",
) {
  const observed = await driver.dispatch({ kind, run, stepId, authorityCycleId });
  assert.equal(observed.status, "plan-observed");
  if (observed.status !== "plan-observed") throw new Error("Expected correlated plan observation.");
  return {
    observed,
    authorization: matchedValidationPlanAssertion({
      assertionId: `assertion:${authorityCycleId}`,
      run,
      plan: observed.plan,
    }).authorization,
  };
}

test("H6C manual and Verify/Reconcile execution bind exact production diagnostic runs and terminal results", async () => {
  const fixture = controllerFixture();
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const run = validationRunIdentity("run:h6c:manual-verify", "D02");

  const manual = await observeAndAuthorize(driver, run, cycleA, "preview-manual");
  const manualResult = await driver.dispatch({
    kind: "execute-asserted-plan",
    run,
    stepId,
    authorityCycleId: cycleA,
    authorization: manual.authorization,
  });
  assert.equal(manualResult.status, "request-accepted");
  if (manualResult.status !== "request-accepted") return;
  assert.equal(manualResult.productionOutcomeEstablished, true);
  if (!manualResult.productionOutcomeEstablished) return;
  assert.equal(manualResult.diagnosticBinding.diagnosticRunId, manual.observed.diagnosticBinding.diagnosticRunId);
  assert.equal(manualResult.diagnosticBinding.planId, manual.observed.plan.planId);
  assert.equal(manualResult.terminalResult, "complete");

  const verify = await observeAndAuthorize(driver, run, cycleB, "preview-verify-reconcile");
  const verifyResult = await driver.dispatch({
    kind: "execute-asserted-plan",
    run,
    stepId,
    authorityCycleId: cycleB,
    authorization: verify.authorization,
  });
  assert.equal(verifyResult.status, "request-accepted");
  if (verifyResult.status !== "request-accepted" || !verifyResult.productionOutcomeEstablished) return;
  assert.equal(verifyResult.diagnosticBinding.requestKind, "verify-reconcile");
  assert.equal(verifyResult.diagnosticBinding.diagnosticRunId, verify.observed.diagnosticBinding.diagnosticRunId);
  assert.notEqual(verifyResult.diagnosticBinding.diagnosticRunId, manualResult.diagnosticBinding.diagnosticRunId);
  assert.equal(verifyResult.terminalResult, "complete");
});

test("H6C sequential cycles with the same semantic plan ID retain distinct diagnostic runs without contamination", async () => {
  const repeatedPlan = plan("manual", "plan:h6c:repeated-semantic");
  const fixture = controllerFixture({ manualPlan: repeatedPlan });
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const run = validationRunIdentity("run:h6c:sequential", "D05");

  const first = await observeAndAuthorize(driver, run, cycleA, "preview-manual");
  const firstResult = await driver.dispatch({
    kind: "execute-asserted-plan",
    run,
    stepId,
    authorityCycleId: cycleA,
    authorization: first.authorization,
  });
  const second = await observeAndAuthorize(driver, run, cycleB, "preview-manual");
  const secondResult = await driver.dispatch({
    kind: "execute-asserted-plan",
    run,
    stepId,
    authorityCycleId: cycleB,
    authorization: second.authorization,
  });

  assert.equal(firstResult.status, "request-accepted");
  assert.equal(secondResult.status, "request-accepted");
  if (
    firstResult.status !== "request-accepted"
    || secondResult.status !== "request-accepted"
    || !firstResult.productionOutcomeEstablished
    || !secondResult.productionOutcomeEstablished
  ) return;
  assert.equal(firstResult.diagnosticBinding.planId, secondResult.diagnosticBinding.planId);
  assert.notEqual(firstResult.diagnosticBinding.diagnosticRunId, secondResult.diagnosticBinding.diagnosticRunId);
  assert.deepEqual(fixture.passedDiagnosticRunIds, [
    firstResult.diagnosticBinding.diagnosticRunId,
    secondResult.diagnosticBinding.diagnosticRunId,
  ]);
});

test("H6C a different authority cycle or validation run cannot consume another cycle's observed production run", async () => {
  const fixture = controllerFixture();
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const runA = validationRunIdentity("run:h6c:a", "D02");
  const runB = validationRunIdentity("run:h6c:b", "D02");
  const observed = await observeAndAuthorize(driver, runA, cycleA, "preview-manual");

  const wrongCycle = await driver.dispatch({
    kind: "execute-asserted-plan",
    run: runA,
    stepId,
    authorityCycleId: cycleB,
    authorization: observed.authorization,
  });
  assert.equal(wrongCycle.status, "request-rejected");

  const wrongRunAuthorization = matchedValidationPlanAssertion({
    assertionId: "assertion:h6c:wrong-run",
    run: runB,
    plan: observed.observed.plan,
  }).authorization;
  const wrongRun = await driver.dispatch({
    kind: "execute-asserted-plan",
    run: runB,
    stepId,
    authorityCycleId: cycleA,
    authorization: wrongRunAuthorization,
  });
  assert.equal(wrongRun.status, "request-rejected");
  assert.deepEqual(fixture.passedDiagnosticRunIds, []);
});

test("H6C conflict resolution binds the observed conflict cycle to a fresh exact production diagnostic run", async () => {
  const observedConflict = conflict();
  const fixture = controllerFixture({ conflict: observedConflict });
  const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
  const run = validationRunIdentity("run:h6c:conflict", "D02");

  await observeAndAuthorize(driver, run, cycleA, "preview-manual");
  const result = await driver.dispatch({
    kind: "resolve-observed-conflict",
    run,
    stepId,
    expectedVaultPath: observedConflict.path,
    expectedConflictKind: "unresolved-text",
    resolution: { kind: "keep-both" },
  });

  assert.equal(result.status, "request-accepted");
  if (result.status !== "request-accepted" || !result.productionOutcomeEstablished) return;
  assert.equal(result.diagnosticBinding.authorityCycleId, cycleA);
  assert.equal(result.diagnosticBinding.requestKind, "conflict-resolution");
  assert.equal(result.terminalResult, "complete");
  assert.equal(fixture.actions.at(-1)?.kind, "resolve-conflict");
});

for (const mode of ["missing", "wrong-run", "duplicate"] as const) {
  test(`H6C accepted execution remains unproven for ${mode} terminal correlation`, async () => {
    const fixture = controllerFixture({ terminalMode: mode });
    const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
    const run = validationRunIdentity(`run:h6c:${mode}`, "D03");
    const observed = await observeAndAuthorize(driver, run, cycleA, "preview-manual");
    const result = await driver.dispatch({
      kind: "execute-asserted-plan",
      run,
      stepId,
      authorityCycleId: cycleA,
      authorization: observed.authorization,
    });
    assert.equal(result.status, "request-accepted");
    if (result.status !== "request-accepted") return;
    assert.equal(result.productionOutcomeEstablished, false);
    if (!result.productionOutcomeEstablished) assert.ok(result.terminalProofReason);
  });
}

for (const mode of ["failed", "cancelled"] as const) {
  test(`H6C exact ${mode} terminal remains distinguishable from successful completion`, async () => {
    const fixture = controllerFixture({ terminalMode: mode });
    const driver = new ValidationProductionPathDriver({ productController: () => fixture.controller });
    const run = validationRunIdentity(`run:h6c:${mode}`, "D04");
    const observed = await observeAndAuthorize(driver, run, cycleA, "preview-manual");
    const result = await driver.dispatch({
      kind: "execute-asserted-plan",
      run,
      stepId,
      authorityCycleId: cycleA,
      authorization: observed.authorization,
    });
    assert.equal(result.status, "request-accepted");
    if (result.status !== "request-accepted") return;
    assert.equal(result.productionOutcomeEstablished, true);
    if (result.productionOutcomeEstablished) assert.equal(result.terminalResult, mode);
  });
}
