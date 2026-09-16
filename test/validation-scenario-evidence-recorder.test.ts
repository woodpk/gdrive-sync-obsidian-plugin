import assert from "node:assert/strict";
import test from "node:test";

import type { SynchronizationPlan } from "../src/contracts";
import {
  packageValidationScenarioEvidence,
  packageValidationSuiteEvidence,
  recordValidationScenarioEvidence,
  serializeValidationEvidence,
  validationAssertionId,
  validationDeviceId,
  validationDeviceIdentity,
  validationEvidenceRef,
  validationFixtureIdentity,
  validationRunIdentity,
  validationStepId,
  verifyValidationScenarioEvidenceIntegrity,
  verifyValidationSuiteEvidenceIntegrity,
  type ValidationAssertionObservation,
  type ValidationPlanExpectation,
  type ValidationScenarioEvidenceInput,
} from "../src/validation";

const run = validationRunIdentity("run-vh09", "D01");
const desktop = validationDeviceIdentity("device-windows", "windows-desktop");
const mobile = validationDeviceIdentity("device-mobile", "iphone");
const path = "Clients/Very Private Note.md" as SynchronizationPlan["operations"][number]["path"];
const remoteObjectId = "remote-object-1" as NonNullable<SynchronizationPlan["operations"][number]["remoteObjectId"]>;

const actualPlan: SynchronizationPlan = {
  planId: "plan-1" as SynchronizationPlan["planId"],
  trigger: "manual",
  operations: [{
    operationId: "operation-1" as SynchronizationPlan["operations"][number]["operationId"],
    kind: "upload-update",
    path,
    targetSide: "remote",
    remoteObjectId,
    destructive: false,
    preconditions: [],
    reasons: [{ code: "fixture-change", summary: "Private reason text is not serialized." }],
  }],
  executionDisposition: "safe-auto-eligible",
  recoveryCheckpointRequired: false,
  globalExecutionGate: "none",
};

const expectedPlan: ValidationPlanExpectation = {
  run,
  expectedTrigger: "manual",
  expectedOperations: [{ kind: "upload-update", path, destructive: false, targetSide: "remote", remoteObjectId }],
  allowedBackgroundKinds: ["noop"],
  forbiddenKinds: ["trash-local", "trash-remote"],
  conflictExpectation: "forbidden",
  destructiveExpectation: "forbidden",
  expectedExecutionDisposition: "safe-auto-eligible",
  expectedGlobalExecutionGate: "none",
};

const satisfied: ValidationAssertionObservation = {
  status: "satisfied",
  assertion: {
    assertionId: validationAssertionId("assertion-state-1"),
    kind: "base-authority",
    subject: "private subject is not evidence output",
    expectation: "private expectation is not evidence output",
  },
  evidenceRefs: [validationEvidenceRef("diag-assertion-1")],
};

function baseInput(overrides: Partial<ValidationScenarioEvidenceInput> = {}): ValidationScenarioEvidenceInput {
  return {
    run,
    primaryDeviceId: desktop.deviceId,
    devices: [desktop, mobile],
    build: { version: "0.1.18", commitSha: "abc123" },
    capturedAt: "2026-09-15T23:30:00.000Z",
    preDiagnosticRefs: [validationEvidenceRef("diag-pre")],
    postDiagnosticRefs: [validationEvidenceRef("diag-post")],
    fixtures: [{
      fixture: validationFixtureIdentity(run, "fixture-1"),
      sizeBytes: 42,
      contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }],
    expectedPlan,
    actualPlan,
    correlations: {
      intentIds: ["intent-1"],
      effectIds: ["effect-1"],
      requestIds: ["request-1"],
      remoteObjectIds: ["remote-object-1"],
    },
    revisions: [{
      operationId: "operation-1",
      remoteObjectId: "remote-object-1",
      expectedRevision: "revision-before",
      observedRevision: "revision-after",
      persistenceRevision: 7,
      semanticGeneration: 4,
      stateRevision: 9,
    }],
    timing: { planningMs: 11, executionMs: 29, elapsedMs: 40 },
    faults: [],
    checkpoints: [],
    assertions: [satisfied],
    requiredEvidence: ["pre-diagnostics", "post-diagnostics", "fixtures", "expected-plan", "actual-plan", "correlations", "revisions", "timing", "assertions"],
    requestedStatus: "PASS",
    ...overrides,
  };
}

test("VH09 emits deterministic privacy-safe machine and human scenario evidence", () => {
  const first = packageValidationScenarioEvidence(baseInput());
  const second = packageValidationScenarioEvidence(baseInput());
  assert.equal(first.record.verdict.status, "PASS");
  assert.equal(first.record.integrityDigest, second.record.integrityDigest);
  assert.equal(first.machineReadable, second.machineReadable);
  assert.equal(verifyValidationScenarioEvidenceIntegrity(first.record), true);
  assert.match(first.record.integrityDigest, /^sha256:[0-9a-f]{64}$/);
  assert.match(first.humanReadable, /Verdict: \*\*PASS\*\*/);
  assert.doesNotMatch(first.machineReadable, /Clients\/Very Private Note\.md/);
  assert.doesNotMatch(first.machineReadable, /Private reason text|private subject|private expectation/);
  assert.match(first.machineReadable, /path-sha256:/);
  assert.equal(first.record.evidenceRecords.every(value => value.privacy.contentPolicy === "metadata-and-digests-only"), true);
  assert.equal(first.record.evidenceRecords.every(value => value.privacy.credentialsIncluded === false), true);
  assert.equal(first.record.evidenceRecords.every(value => value.privacy.privateContentIncluded === false), true);
});

test("canonical serialization sorts object keys without changing array order", () => {
  assert.equal(serializeValidationEvidence({ z: 1, a: { y: 2, b: 3 }, list: [2, 1] }), '{"a":{"b":3,"y":2},"list":[2,1],"z":1}');
});

test("missing declared mandatory evidence cannot be emitted as PASS", () => {
  const record = recordValidationScenarioEvidence(baseInput({ actualPlan: undefined }));
  assert.equal(record.verdict.status, "BLOCKED");
  assert.deepEqual(record.missingRequiredEvidence, ["actual-plan"]);
  if (record.verdict.status === "BLOCKED") assert.deepEqual(record.verdict.blockerReasons, ["missing-required-evidence:actual-plan"]);
});

test("failed assertions force FAIL even when PASS was requested", () => {
  const failed: ValidationAssertionObservation = {
    status: "failed",
    assertion: { assertionId: validationAssertionId("assertion-failed"), kind: "terminal-product-result", subject: "subject", expectation: "expectation" },
    reason: "private details are intentionally omitted from evidence output",
    evidenceRefs: [validationEvidenceRef("diag-failure")],
  };
  const record = recordValidationScenarioEvidence(baseInput({ assertions: [failed] }));
  assert.equal(record.verdict.status, "FAIL");
  if (record.verdict.status === "FAIL") assert.deepEqual(record.verdict.failedAssertionIds, ["assertion-failed"]);
  assert.doesNotMatch(serializeValidationEvidence(record), /private details/);
});

test("not-observable assertions force BLOCKED instead of false PASS", () => {
  const notObservable: ValidationAssertionObservation = {
    status: "not-observable",
    assertion: { assertionId: validationAssertionId("assertion-unobservable"), kind: "remote-identity", subject: "subject", expectation: "expectation" },
    reason: "cannot inspect required proof",
    evidenceRefs: [],
  };
  const record = recordValidationScenarioEvidence(baseInput({ assertions: [notObservable] }));
  assert.equal(record.verdict.status, "BLOCKED");
  if (record.verdict.status === "BLOCKED") assert.deepEqual(record.verdict.blockerReasons, ["assertion-not-observable:assertion-unobservable"]);
});

test("sensitive-looking correlation metadata is sanitized before serialization", () => {
  const record = recordValidationScenarioEvidence(baseInput({ correlations: { requestIds: ["access_token=super-secret"], intentIds: ["intent-1"], effectIds: ["effect-1"] } }));
  const serialized = serializeValidationEvidence(record);
  assert.doesNotMatch(serialized, /super-secret/);
  assert.match(serialized, /redacted/);
});

test("fixture hashes and numeric evidence are validated fail closed", () => {
  assert.throws(() => recordValidationScenarioEvidence(baseInput({ fixtures: [{ fixture: validationFixtureIdentity(run, "fixture-1"), sizeBytes: 42, contentHash: "not-a-hash" }] })), /canonical SHA-256/);
  assert.throws(() => recordValidationScenarioEvidence(baseInput({ timing: { elapsedMs: -1 } })), /non-negative/);
});

test("suite aggregation is deterministic, verifies scenario integrity, and counts verdicts", () => {
  const pass = recordValidationScenarioEvidence(baseInput());
  const run2 = validationRunIdentity("run-vh09-2", "D02");
  const blocked = recordValidationScenarioEvidence(baseInput({
    run: run2,
    fixtures: [{ fixture: validationFixtureIdentity(run2, "fixture-2"), sizeBytes: 0, contentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }],
    expectedPlan: { ...expectedPlan, run: run2 },
    preDiagnosticRefs: [],
  }));
  const suite = packageValidationSuiteEvidence([blocked, pass]);
  assert.equal(suite.record.scenarioCount, 2);
  assert.equal(suite.record.counts.PASS, 1);
  assert.equal(suite.record.counts.BLOCKED, 1);
  assert.equal(verifyValidationSuiteEvidenceIntegrity(suite.record), true);
  assert.deepEqual(suite.record.scenarios.map(value => value.scenarioId), ["D01", "D02"]);
  assert.match(suite.humanReadable, /Phase 6 Validation Suite Evidence/);
});

test("PAUSED requires an explicit resume step and primary device must be a participant", () => {
  assert.throws(() => recordValidationScenarioEvidence(baseInput({ requestedStatus: "PAUSED" })), /resumeStepId/);
  const paused = recordValidationScenarioEvidence(baseInput({ requestedStatus: "PAUSED", resumeStepId: validationStepId("resume-1") }));
  assert.equal(paused.verdict.status, "PAUSED");
  assert.throws(() => recordValidationScenarioEvidence(baseInput({ primaryDeviceId: validationDeviceId("other-device") })), /Primary evidence device/);
});
