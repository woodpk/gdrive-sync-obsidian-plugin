import { deepEqual, equal, notEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  createProductionVerificationControl,
  type ProductionVerificationControllerSource,
} from "../../src/product/live-validation-control-seam";

test("bounded production verification control delegates exact existing controller authority", async () => {
  equal(createProductionVerificationControl(undefined), undefined);

  const actions: any[] = [];
  const manualPlan = {
    planId: "plan:manual",
    trigger: "manual",
    operations: [],
    executionDisposition: "requires-user-approval",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  } as any;
  const reconcilePlan = {
    ...manualPlan,
    planId: "plan:verify",
    trigger: "verify-reconcile",
  } as any;
  const surface = { status: { kind: "idle-ready" }, conflicts: [] } as any;
  const receipt = {
    runId: "product-run:test",
    trigger: "manual",
    planId: manualPlan.planId,
    terminal: "complete",
    requiredEffectsCommittedAndVerified: true,
    committedOperationCount: 1,
    skippedOperationCount: 0,
  } as any;

  const source: ProductionVerificationControllerSource = {
    async previewManual() { return manualPlan; },
    async previewVerifyReconcile() { return reconcilePlan; },
    async request(action) { actions.push(action); return { status: "accepted" }; },
    currentSurface() { return surface; },
    latestProductionRunReceipt() { return receipt; },
  };

  const control = createProductionVerificationControl(source);
  ok(control);
  deepEqual(Object.keys(control).sort(), [
    "cancelActiveSync",
    "currentSurface",
    "executePlan",
    "latestProductionRunReceipt",
    "pause",
    "previewManual",
    "previewVerifyReconcile",
    "resume",
  ]);

  equal(await control.previewManual(), manualPlan);
  equal(await control.previewVerifyReconcile(), reconcilePlan);
  deepEqual(await control.executePlan(manualPlan.planId), { status: "accepted" });
  deepEqual(await control.pause(), { status: "accepted" });
  deepEqual(await control.resume(), { status: "accepted" });
  deepEqual(await control.cancelActiveSync(), { status: "accepted" });
  deepEqual(actions, [
    { kind: "execute-plan", planId: manualPlan.planId },
    { kind: "pause" },
    { kind: "resume" },
    { kind: "cancel-active-sync" },
  ]);
  equal(control.currentSurface(), surface);

  const observedReceipt = control.latestProductionRunReceipt();
  deepEqual(observedReceipt, receipt);
  notEqual(observedReceipt, receipt);
});

test("shipping plugin exposes the bounded facade accessor without importing test-platform implementation", () => {
  const source = readFileSync(resolve(process.cwd(), "src/main.ts"), "utf8");
  equal(source.includes("productionVerificationControl(): ProductionVerificationControl | undefined"), true);
  equal(source.includes("createProductionVerificationControl(this.runtime?.productController())"), true);
  equal(source.includes("test-platform/"), false);
});
