import assert from "node:assert/strict";
import test from "node:test";

import {
  PHASE6_LIVE_VALIDATION_H0_CONTRACTS_FROZEN,
  PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
  VALIDATION_COORDINATION_SCHEMA_VERSION,
  VALIDATION_EVIDENCE_PRIVACY,
  VALIDATION_EVIDENCE_SCHEMA_VERSION,
  evaluateValidationCoordinationMessage,
  scenarioEvidenceVerdict,
  toScenarioLifecycleVerdict,
  validationCoordinationMessageId,
  validationDeviceId,
  validationEvidenceId,
  validationEvidenceRef,
  validationRunIdentity,
  validationStepId,
  type ValidationCoordinationMessage,
  type ValidationCoordinationState,
  type ValidationEvidenceRecord,
} from "../src/validation";

const run = validationRunIdentity("run-vh03", "D01");
const controller = validationDeviceId("device-windows");
const mobile = validationDeviceId("device-mobile");
const step = validationStepId("step-2");

function coordinationState(overrides: Partial<ValidationCoordinationState> = {}): ValidationCoordinationState {
  return {
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    run,
    controllerDeviceId: controller,
    mobileParticipantDeviceId: mobile,
    currentStepId: step,
    owningRole: "mobile-participant",
    expectedNextEvent: "step-complete",
    lastAcceptedSequenceByDevice: { [mobile]: 4 },
    evidenceRefs: [],
    status: "active",
    ...overrides,
  };
}

function coordinationMessage(overrides: Partial<ValidationCoordinationMessage> = {}): ValidationCoordinationMessage {
  return {
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    messageId: validationCoordinationMessageId("message-5"),
    sequence: 5,
    run,
    senderDeviceId: mobile,
    senderRole: "mobile-participant",
    recipientDeviceId: controller,
    stepId: step,
    kind: "step-complete",
    createdAt: "2026-09-15T15:00:00.000Z",
    evidenceRefs: [validationEvidenceRef("evidence-ref-1")],
    ...overrides,
  };
}

test("VH03 freezes the complete H0 harness version through the validation barrel", () => {
  assert.equal(PHASE6_LIVE_VALIDATION_HARNESS_VERSION, "phase6-live-validation-harness-v1");
  assert.equal(PHASE6_LIVE_VALIDATION_H0_CONTRACTS_FROZEN, true);
});

test("coordination accepts only a current run/scenario/device/step/event message", () => {
  const result = evaluateValidationCoordinationMessage(coordinationState(), controller, coordinationMessage());
  assert.equal(result.status, "accepted");
});

test("coordination rejects stale and mismatched run/scenario/device messages fail closed", () => {
  assert.equal(
    evaluateValidationCoordinationMessage(coordinationState(), controller, coordinationMessage({ sequence: 4 })).status,
    "rejected",
  );
  assert.deepEqual(
    evaluateValidationCoordinationMessage(
      coordinationState(),
      controller,
      coordinationMessage({ run: validationRunIdentity("other-run", "D01") }),
    ),
    { status: "rejected", message: coordinationMessage({ run: validationRunIdentity("other-run", "D01") }), reason: "run-mismatch" },
  );
  const scenarioMismatch = evaluateValidationCoordinationMessage(
    coordinationState(),
    controller,
    coordinationMessage({ run: validationRunIdentity("run-vh03", "D02") }),
  );
  assert.equal(scenarioMismatch.status, "rejected");
  if (scenarioMismatch.status === "rejected") assert.equal(scenarioMismatch.reason, "scenario-mismatch");

  const recipientMismatch = evaluateValidationCoordinationMessage(
    coordinationState(),
    mobile,
    coordinationMessage(),
  );
  assert.equal(recipientMismatch.status, "rejected");
  if (recipientMismatch.status === "rejected") assert.equal(recipientMismatch.reason, "recipient-mismatch");
});

test("coordination rejects stale step, unexpected event, and terminal-state traffic", () => {
  const wrongStep = evaluateValidationCoordinationMessage(
    coordinationState(), controller, coordinationMessage({ stepId: validationStepId("old-step") }),
  );
  assert.equal(wrongStep.status, "rejected");
  if (wrongStep.status === "rejected") assert.equal(wrongStep.reason, "step-mismatch");

  const unexpected = evaluateValidationCoordinationMessage(
    coordinationState(), controller, coordinationMessage({ kind: "pause" }),
  );
  assert.equal(unexpected.status, "rejected");
  if (unexpected.status === "rejected") assert.equal(unexpected.reason, "unexpected-event");

  const terminal = evaluateValidationCoordinationMessage(
    coordinationState({ status: "terminal", terminalClassification: "pass" }), controller, coordinationMessage(),
  );
  assert.equal(terminal.status, "rejected");
  if (terminal.status === "rejected") assert.equal(terminal.reason, "terminal-state");
});

test("canonical evidence is run/scenario/device bound and structurally privacy-safe", () => {
  const evidence: ValidationEvidenceRecord = {
    schemaVersion: VALIDATION_EVIDENCE_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    evidenceId: validationEvidenceId("evidence-1"),
    run,
    deviceId: controller,
    stepId: step,
    kind: "content-hash",
    capturedAt: "2026-09-15T15:01:00.000Z",
    summary: "Fixture hash matched expected digest.",
    integrityDigest: "sha256:example",
    references: [],
    privacy: VALIDATION_EVIDENCE_PRIVACY,
  };
  assert.equal(evidence.run.scenarioId, "D01");
  assert.equal(evidence.deviceId, controller);
  assert.equal(evidence.privacy.contentPolicy, "metadata-and-digests-only");
  assert.equal(evidence.privacy.credentialsIncluded, false);
  assert.equal(evidence.privacy.privateContentIncluded, false);

  // @ts-expect-error Evidence privacy cannot claim credentials are included.
  const unsafeCredentials: ValidationEvidenceRecord["privacy"] = { contentPolicy: "metadata-and-digests-only", credentialsIncluded: true, privateContentIncluded: false };
  void unsafeCredentials;
});

test("PASS FAIL BLOCKED and PAUSED verdicts carry non-confusable semantics", () => {
  const pass = scenarioEvidenceVerdict({
    status: "PASS", run, evidenceIds: [validationEvidenceId("e-pass")], failedAssertionIds: [], blockerReasons: [], summary: "All required proof satisfied.",
  });
  assert.equal(toScenarioLifecycleVerdict(pass), "pass");

  const fail = scenarioEvidenceVerdict({
    status: "FAIL", run, evidenceIds: [validationEvidenceId("e-fail")], failedAssertionIds: ["assertion-1"], blockerReasons: [], summary: "Observed state violated an assertion.",
  });
  assert.equal(toScenarioLifecycleVerdict(fail), "fail");

  const blocked = scenarioEvidenceVerdict({
    status: "BLOCKED", run, evidenceIds: [validationEvidenceId("e-blocked")], failedAssertionIds: [], blockerReasons: ["required proof not observable"], summary: "Required proof could not be established.",
  });
  assert.equal(toScenarioLifecycleVerdict(blocked), "blocked");

  const paused = scenarioEvidenceVerdict({
    status: "PAUSED", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: [], resumeStepId: validationStepId("resume-step"), summary: "Awaiting bounded human action.",
  });
  assert.equal(paused.status, "PAUSED");

  assert.throws(() => scenarioEvidenceVerdict({
    status: "FAIL", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: [], summary: "No failure evidence.",
  }), /at least one failed assertion/);
  assert.throws(() => scenarioEvidenceVerdict({
    status: "BLOCKED", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: [], summary: "No blocker proof.",
  }), /at least one blocker reason/);
});
