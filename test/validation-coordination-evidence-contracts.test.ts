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
  type ValidationScenarioEvidenceVerdict,
} from "../src/validation";

const run = validationRunIdentity("run-vh03", "D01");
const controller = validationDeviceId("device-windows");
const mobile = validationDeviceId("device-mobile");
const unrelatedDevice = validationDeviceId("device-unrelated");
const step = validationStepId("step-2");

type ActiveCoordinationState = ValidationCoordinationState & {
  readonly status: "active";
  readonly terminalClassification?: never;
};
type StepCompleteCoordinationMessage = Extract<ValidationCoordinationMessage, { readonly kind: "step-complete" }>;

function coordinationState(overrides: Partial<ActiveCoordinationState> = {}): ActiveCoordinationState {
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

function coordinationMessage(overrides: Partial<StepCompleteCoordinationMessage> = {}): StepCompleteCoordinationMessage {
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

test("coordination accepts only a current run/scenario/device/role/step-owner/event message", () => {
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

test("coordination enforces device-role, participant-recipient, and step-owner authority", () => {
  const controllerClaimingMobile = evaluateValidationCoordinationMessage(
    coordinationState(),
    mobile,
    coordinationMessage({ senderDeviceId: controller, senderRole: "mobile-participant", recipientDeviceId: mobile }),
  );
  assert.equal(controllerClaimingMobile.status, "rejected");
  if (controllerClaimingMobile.status === "rejected") assert.equal(controllerClaimingMobile.reason, "sender-role-mismatch");

  const mobileClaimingController = evaluateValidationCoordinationMessage(
    coordinationState(),
    controller,
    coordinationMessage({ senderDeviceId: mobile, senderRole: "controller", recipientDeviceId: controller }),
  );
  assert.equal(mobileClaimingController.status, "rejected");
  if (mobileClaimingController.status === "rejected") assert.equal(mobileClaimingController.reason, "sender-role-mismatch");

  const unrelatedRecipient = evaluateValidationCoordinationMessage(
    coordinationState(),
    unrelatedDevice,
    coordinationMessage({ recipientDeviceId: unrelatedDevice }),
  );
  assert.equal(unrelatedRecipient.status, "rejected");
  if (unrelatedRecipient.status === "rejected") assert.equal(unrelatedRecipient.reason, "recipient-not-participant");

  const wrongStepOwner = evaluateValidationCoordinationMessage(
    coordinationState(),
    mobile,
    coordinationMessage({ senderDeviceId: controller, senderRole: "controller", recipientDeviceId: mobile }),
  );
  assert.equal(wrongStepOwner.status, "rejected");
  if (wrongStepOwner.status === "rejected") assert.equal(wrongStepOwner.reason, "step-owner-mismatch");
});

test("coordination rejects stale step, unexpected event, and terminal-state traffic", () => {
  const wrongStep = evaluateValidationCoordinationMessage(
    coordinationState(), controller, coordinationMessage({ stepId: validationStepId("old-step") }),
  );
  assert.equal(wrongStep.status, "rejected");
  if (wrongStep.status === "rejected") assert.equal(wrongStep.reason, "step-mismatch");

  const pauseMessage: ValidationCoordinationMessage = { ...coordinationMessage(), kind: "pause" };
  const unexpected = evaluateValidationCoordinationMessage(coordinationState(), controller, pauseMessage);
  assert.equal(unexpected.status, "rejected");
  if (unexpected.status === "rejected") assert.equal(unexpected.reason, "unexpected-event");

  const terminalState: ValidationCoordinationState = {
    ...coordinationState(),
    status: "terminal",
    terminalClassification: "pass",
  };
  const terminal = evaluateValidationCoordinationMessage(terminalState, controller, coordinationMessage());
  assert.equal(terminal.status, "rejected");
  if (terminal.status === "rejected") assert.equal(terminal.reason, "terminal-state");
});

test("terminal coordination message and state semantics are structurally discriminated", () => {
  const terminalMessage: ValidationCoordinationMessage = {
    ...coordinationMessage(),
    kind: "terminal",
    terminalClassification: "pass",
  };
  const activeAwaitingTerminal = coordinationState({ expectedNextEvent: "terminal" });
  assert.equal(evaluateValidationCoordinationMessage(activeAwaitingTerminal, controller, terminalMessage).status, "accepted");

  const terminalState: ValidationCoordinationState = {
    ...coordinationState(),
    status: "terminal",
    terminalClassification: "blocked",
  };
  assert.equal(terminalState.terminalClassification, "blocked");

  // @ts-expect-error A terminal coordination message requires terminalClassification.
  const terminalMessageMissingClassification: ValidationCoordinationMessage = { ...coordinationMessage(), kind: "terminal" };
  // @ts-expect-error A non-terminal coordination message cannot carry terminalClassification.
  const nonTerminalMessageWithClassification: ValidationCoordinationMessage = { ...coordinationMessage(), terminalClassification: "pass" };
  // @ts-expect-error A terminal coordination state requires terminalClassification.
  const terminalStateMissingClassification: ValidationCoordinationState = { ...coordinationState(), status: "terminal" };
  // @ts-expect-error An active coordination state cannot carry terminalClassification.
  const activeStateWithClassification: ValidationCoordinationState = { ...coordinationState(), terminalClassification: "pass" };
  void terminalMessageMissingClassification;
  void nonTerminalMessageWithClassification;
  void terminalStateMissingClassification;
  void activeStateWithClassification;
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

test("PASS FAIL BLOCKED and PAUSED verdicts carry statically non-confusable semantics", () => {
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

  // @ts-expect-error FAIL requires a statically non-empty failedAssertionIds tuple.
  const invalidFail: ValidationScenarioEvidenceVerdict = { status: "FAIL", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: [], summary: "invalid" };
  // @ts-expect-error BLOCKED requires a statically non-empty blockerReasons tuple.
  const invalidBlocked: ValidationScenarioEvidenceVerdict = { status: "BLOCKED", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: [], summary: "invalid" };
  // @ts-expect-error PASS cannot carry failed assertions.
  const invalidPassFailure: ValidationScenarioEvidenceVerdict = { status: "PASS", run, evidenceIds: [], failedAssertionIds: ["assertion-1"], blockerReasons: [], summary: "invalid" };
  // @ts-expect-error PASS cannot carry blocker reasons.
  const invalidPassBlocker: ValidationScenarioEvidenceVerdict = { status: "PASS", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: ["blocked"], summary: "invalid" };
  // @ts-expect-error PAUSED cannot carry failed assertions.
  const invalidPausedFailure: ValidationScenarioEvidenceVerdict = { status: "PAUSED", run, evidenceIds: [], failedAssertionIds: ["assertion-1"], blockerReasons: [], resumeStepId: validationStepId("resume-step"), summary: "invalid" };
  // @ts-expect-error PAUSED cannot carry blocker reasons.
  const invalidPausedBlocker: ValidationScenarioEvidenceVerdict = { status: "PAUSED", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: ["blocked"], resumeStepId: validationStepId("resume-step"), summary: "invalid" };
  void invalidFail;
  void invalidBlocked;
  void invalidPassFailure;
  void invalidPassBlocker;
  void invalidPausedFailure;
  void invalidPausedBlocker;

  const runtimeInvalidFail = {
    status: "FAIL", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: [], summary: "No failure evidence.",
  } as unknown as ValidationScenarioEvidenceVerdict;
  assert.throws(() => scenarioEvidenceVerdict(runtimeInvalidFail), /at least one failed assertion/);

  const runtimeInvalidBlocked = {
    status: "BLOCKED", run, evidenceIds: [], failedAssertionIds: [], blockerReasons: [], summary: "No blocker proof.",
  } as unknown as ValidationScenarioEvidenceVerdict;
  assert.throws(() => scenarioEvidenceVerdict(runtimeInvalidBlocked), /at least one blocker reason/);
});
