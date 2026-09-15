import assert from "node:assert/strict";
import test from "node:test";
import {
  HUMAN_CHECKPOINT_ACTIONS,
  VALIDATION_SANDBOX_REJECTION_REASONS,
  VALIDATION_SANDBOX_SURFACES,
  VALIDATION_SCENARIO_IDS,
  humanCheckpoint,
  isHumanCheckpointAction,
  isValidationSandboxSurface,
  isValidationScenarioId,
  validationDeviceIdentity,
  validationFixtureIdentity,
  validationRunIdentity,
  validationSandboxOwnership,
  validationStepId,
  type HumanCheckpointResume,
  type ValidationScenarioId,
  type ValidationScenarioLifecycle,
  type ValidationSandboxAuthorization,
} from "../src/validation/run-sandbox-checkpoint-contracts";

test("VH01 freezes exactly the C03-F03 harness scenario IDs in execution order", () => {
  assert.deepEqual(VALIDATION_SCENARIO_IDS, [
    "C03", "C04", "C05", "C06", "C07", "C08", "C09",
    "D01", "D02", "D03", "D04", "D05", "D06",
    "E01", "E02", "E03", "E04", "E05", "E06", "E07",
    "F01", "F02", "F03",
  ]);
  assert.equal(isValidationScenarioId("C03"), true);
  assert.equal(isValidationScenarioId("F03"), true);
  assert.equal(isValidationScenarioId("C02"), false);
  assert.equal(isValidationScenarioId("F04"), false);
});

test("validation run and device identities reject blank or unsupported representations", () => {
  const run = validationRunIdentity("run-7f9d", "D05");
  assert.equal(run.scenarioId, "D05");
  assert.equal(String(run.runId), "run-7f9d");
  assert.deepEqual(validationDeviceIdentity("desktop-installation-1", "windows-desktop"), { deviceId: "desktop-installation-1", platform: "windows-desktop" });
  assert.deepEqual(validationDeviceIdentity("mobile-installation-1", "iphone"), { deviceId: "mobile-installation-1", platform: "iphone" });
  assert.deepEqual(validationDeviceIdentity("mobile-installation-2", "ipad"), { deviceId: "mobile-installation-2", platform: "ipad" });
  assert.throws(() => validationRunIdentity("", "C03"), /non-empty/);
  assert.throws(() => validationRunIdentity(" run-1", "C03"), /trim-stable/);
  assert.throws(() => validationRunIdentity("run-1", "C02"), /Unsupported/);
  assert.throws(() => validationDeviceIdentity("device-1", "android"), /Unsupported/);
});

test("human-checkpoint vocabulary is bounded to the approved external action classes", () => {
  assert.deepEqual(HUMAN_CHECKPOINT_ACTIONS, [
    "disable-mobile-connectivity",
    "restore-mobile-connectivity",
    "establish-stale-device-condition",
    "terminate-obsidian",
    "restart-obsidian",
    "restore-google-authentication",
    "disable-plugin",
    "uninstall-plugin",
    "reinstall-plugin",
    "unlink-device",
  ]);
  assert.equal(isHumanCheckpointAction("terminate-obsidian"), true);
  assert.equal(isHumanCheckpointAction("assume-action-complete"), false);
  const run = validationRunIdentity("run-e01", "E01");
  const checkpoint = humanCheckpoint({
    checkpointId: "checkpoint-terminate",
    run,
    deviceId: "mobile-1",
    requestedAction: "terminate-obsidian",
    instruction: "Terminate Obsidian after the harness reaches the recorded in-flight checkpoint.",
  });
  assert.equal(checkpoint.requestedAction, "terminate-obsidian");
  assert.throws(() => humanCheckpoint({ ...checkpoint, checkpointId: "other", deviceId: "mobile-1", requestedAction: "tap-random-ui", instruction: "Do it." }), /Unsupported/);
  assert.throws(() => humanCheckpoint({ checkpointId: "checkpoint-2", run, deviceId: "mobile-1", requestedAction: "restart-obsidian", instruction: "   " }), /must not be blank/);
});

test("checkpoint resume vocabulary distinguishes human action, verification, and safe resumability", () => {
  const run = validationRunIdentity("run-f03", "F03");
  const checkpoint = humanCheckpoint({
    checkpointId: "checkpoint-reinstall",
    run,
    deviceId: "mobile-1",
    requestedAction: "reinstall-plugin",
    instruction: "Reinstall the validation build, then reopen Obsidian.",
  });
  const awaiting: HumanCheckpointResume = { state: "awaiting-human-action", checkpoint };
  const verifying: HumanCheckpointResume = { state: "awaiting-verification", checkpoint, acknowledgement: "Operator reported reinstall complete." };
  const resumable: HumanCheckpointResume = {
    state: "resumable",
    checkpoint,
    acknowledgement: "Operator reported reinstall complete.",
    verification: "Expected installed validation build identity observed.",
    resumeStepId: validationStepId("post-reinstall-verify"),
  };
  assert.deepEqual([awaiting.state, verifying.state, resumable.state], ["awaiting-human-action", "awaiting-verification", "resumable"]);
});

test("fixture identity stays bound to exactly one validation run and scenario", () => {
  const run = validationRunIdentity("run-c06", "C06");
  const fixture = validationFixtureIdentity(run, "fixture-create-1");
  assert.equal(fixture.run, run);
  assert.equal(fixture.fixtureId, "fixture-create-1");
  assert.throws(() => validationFixtureIdentity(run, ""), /non-empty/);
});

test("sandbox ownership can represent only approved disposable validation surfaces", () => {
  assert.deepEqual(VALIDATION_SANDBOX_SURFACES, ["vault-fixture", "validation-vault-state-copy", "validation-remote", "validation-metadata"]);
  for (const unsafe of ["ordinary-brain-content", "canonical-external-brain-assets", "credentials", "primary-authoritative-state"]) {
    assert.equal(isValidationSandboxSurface(unsafe), false);
  }
  const run = validationRunIdentity("run-e03", "E03");
  const owned = validationSandboxOwnership({ resourceId: "state-copy-1", surface: "validation-vault-state-copy", owner: run });
  assert.equal(owned.owner, run);
  assert.equal(owned.surface, "validation-vault-state-copy");
  assert.throws(() => validationSandboxOwnership({ resourceId: "prod-state", surface: "primary-authoritative-state", owner: run }), /Unsupported/);
  assert.throws(() => validationSandboxOwnership({ resourceId: "", surface: "validation-remote", owner: run }), /non-empty/);
});

test("sandbox authorization vocabulary preserves fail-closed rejection reasons", () => {
  assert.deepEqual(VALIDATION_SANDBOX_REJECTION_REASONS, ["ownership-unproven", "ownership-ambiguous", "run-mismatch", "scenario-mismatch", "surface-out-of-scope"]);
  const run = validationRunIdentity("run-d01", "D01");
  const ownership = validationSandboxOwnership({ resourceId: "fixture-surface-1", surface: "vault-fixture", owner: run });
  const authorized: ValidationSandboxAuthorization = { status: "authorized", ownership };
  const rejected: ValidationSandboxAuthorization = { status: "rejected", reason: "ownership-ambiguous" };
  assert.equal(authorized.status, "authorized");
  assert.equal(rejected.status, "rejected");
});

const scenarioIdTypeCheck: ValidationScenarioId = "C03";
void scenarioIdTypeCheck;
// @ts-expect-error C02 is outside the frozen C03-F03 scenario set.
const invalidScenarioIdTypeCheck: ValidationScenarioId = "C02";
void invalidScenarioIdTypeCheck;

const terminalLifecycleTypeCheck: ValidationScenarioLifecycle = { kind: "terminal", verdict: "pass", summary: "All required postconditions independently observed." };
void terminalLifecycleTypeCheck;
// @ts-expect-error terminal lifecycle state must carry a PASS/FAIL/BLOCKED verdict.
const invalidTerminalLifecycleTypeCheck: ValidationScenarioLifecycle = { kind: "terminal", summary: "Missing verdict." };
void invalidTerminalLifecycleTypeCheck;

const runForLifecycle = validationRunIdentity("run-typecheck", "E01");
const checkpointForLifecycle = humanCheckpoint({ checkpointId: "checkpoint-typecheck", run: runForLifecycle, deviceId: "mobile-typecheck", requestedAction: "terminate-obsidian", instruction: "Terminate Obsidian." });
// @ts-expect-error resumable lifecycle requires a verified resumable checkpoint, not an awaiting-human-action checkpoint.
const invalidResumableLifecycleTypeCheck: ValidationScenarioLifecycle = { kind: "resumable", resume: { state: "awaiting-human-action", checkpoint: checkpointForLifecycle } };
void invalidResumableLifecycleTypeCheck;
