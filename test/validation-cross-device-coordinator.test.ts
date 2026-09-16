import assert from "node:assert/strict";
import test from "node:test";
import {
  DriveValidationCoordinationTransport,
  VALIDATION_COORDINATION_DRIVE_ROLE_KEY,
  VALIDATION_COORDINATION_DRIVE_ROLE_ROOT,
  ValidationCrossDeviceCoordinator,
  acceptValidationCoordinationRecord,
  coordinationRecord,
  type ValidationCoordinationTransition,
  type ValidationCoordinationTransitionAuthority,
  type ValidationCoordinationTransport,
  type ValidationCrossDeviceCoordinationRecord,
  type ValidationDriveRequestTransport,
} from "../src/validation/cross-device-coordinator";
import {
  PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
  VALIDATION_COORDINATION_SCHEMA_VERSION,
  validationCoordinationMessageId,
  type ValidationCoordinationMessage,
  type ValidationCoordinationState,
} from "../src/validation/coordination-evidence-contracts";
import { validationDeviceId, validationRunIdentity, validationStepId } from "../src/validation/run-sandbox-checkpoint-contracts";

class MemoryTransport implements ValidationCoordinationTransport {
  readonly records: ValidationCrossDeviceCoordinationRecord[] = [];
  async publish(record: ValidationCrossDeviceCoordinationRecord): Promise<void> { this.records.push(record); }
  async read(): Promise<readonly ValidationCrossDeviceCoordinationRecord[]> { return [...this.records]; }
}

const run = validationRunIdentity("run-vh12", "C03");
const controller = validationDeviceId("windows-installation-a");
const mobile = validationDeviceId("iphone-installation-b");
const step1 = validationStepId("windows-prepares-handoff");
const step2 = validationStepId("mobile-completes-handoff");
const step3 = validationStepId("windows-verifies-handoff");

function initialState(): ValidationCoordinationState {
  return {
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    run,
    controllerDeviceId: controller,
    mobileParticipantDeviceId: mobile,
    currentStepId: step1,
    owningRole: "controller",
    expectedNextEvent: "step-complete",
    lastAcceptedSequenceByDevice: {},
    evidenceRefs: [],
    status: "active",
  };
}

const handoffAuthority: ValidationCoordinationTransitionAuthority = {
  authorizeSuccessor(state, message): ValidationCoordinationTransition {
    if (state.currentStepId === step1 && message.kind === "step-complete") {
      return { status: "active", currentStepId: step2, owningRole: "mobile-participant", expectedNextEvent: "step-complete" };
    }
    if (state.currentStepId === step2 && message.kind === "step-complete") {
      return { status: "active", currentStepId: step3, owningRole: "controller", expectedNextEvent: "step-ready" };
    }
    throw new Error(`No authorized VH12 handoff successor for ${String(state.currentStepId)}:${message.kind}`);
  },
};

const delayedAuthority: ValidationCoordinationTransitionAuthority = {
  authorizeSuccessor(state, message): ValidationCoordinationTransition {
    if (state.currentStepId === step1 && message.kind === "step-complete") {
      return { status: "paused", currentStepId: step2, owningRole: "mobile-participant", expectedNextEvent: "resume" };
    }
    throw new Error(`No authorized VH12 delayed successor for ${String(state.currentStepId)}:${message.kind}`);
  },
};

function coordinator(
  state: ValidationCoordinationState,
  localDeviceId: typeof controller,
  role: "controller" | "mobile-participant",
  transport: ValidationCoordinationTransport,
  suffix: string,
  transitionAuthority: ValidationCoordinationTransitionAuthority = handoffAuthority,
) {
  let ids = 0;
  return new ValidationCrossDeviceCoordinator({
    state,
    localDeviceId,
    localRole: role,
    transport,
    transitionAuthority,
    now: () => `2026-09-15T20:00:0${ids}.000Z`,
    messageId: () => `vh12-${suffix}-${++ids}`,
  });
}

async function authorizedFirstHandoff(suffix: string): Promise<ValidationCrossDeviceCoordinationRecord> {
  const transport = new MemoryTransport();
  const windows = coordinator(initialState(), controller, "controller", transport, suffix);
  return await windows.send("step-complete", {
    status: "active",
    currentStepId: step2,
    owningRole: "mobile-participant",
    expectedNextEvent: "step-complete",
  });
}

function withNext(record: ValidationCrossDeviceCoordinationRecord, next: ValidationCoordinationTransition): ValidationCrossDeviceCoordinationRecord {
  return { ...record, next };
}

test("VH12 coordinates a deterministic Windows-to-mobile-to-Windows handoff under explicit local transition authority", async () => {
  const transport = new MemoryTransport();
  const windows = coordinator(initialState(), controller, "controller", transport, "windows");
  const phone = coordinator(initialState(), mobile, "mobile-participant", transport, "mobile");
  const outgoing = await windows.send("step-complete", {
    status: "active",
    currentStepId: step2,
    owningRole: "mobile-participant",
    expectedNextEvent: "step-complete",
  });
  assert.equal(outgoing.stepOwner, "controller");
  assert.equal(outgoing.expectedNextEvent, "step-complete");
  assert.equal(outgoing.message.run.runId, run.runId);
  assert.equal(outgoing.message.run.scenarioId, "C03");
  assert.equal(outgoing.message.senderDeviceId, controller);
  assert.equal(outgoing.message.recipientDeviceId, mobile);
  const phoneOutcomes = await phone.poll();
  assert.equal(phoneOutcomes.length, 1);
  assert.equal(phoneOutcomes[0].status, "accepted");
  assert.equal(phone.state.currentStepId, step2);
  assert.equal(phone.state.owningRole, "mobile-participant");
  await phone.send("step-complete", {
    status: "active",
    currentStepId: step3,
    owningRole: "controller",
    expectedNextEvent: "step-ready",
  });
  const windowsOutcomes = await windows.poll();
  assert.equal(windowsOutcomes.filter(value => value.status === "accepted").length, 1);
  assert.equal(windows.state.currentStepId, step3);
  assert.equal(windows.state.owningRole, "controller");
});

test("VH12 rejects a valid current message carrying an unauthorized next step without mutating local state", async () => {
  const record = await authorizedFirstHandoff("bad-step");
  const tampered = withNext(record, { ...record.next, currentStepId: step3 });
  const phone = coordinator(initialState(), mobile, "mobile-participant", new MemoryTransport(), "phone-bad-step");
  const before = phone.state;
  const result = phone.accept(tampered);
  assert.equal(result.status, "rejected");
  if (result.status === "rejected") assert.equal(result.reason, "transition-mismatch");
  assert.strictEqual(phone.state, before);
});

test("VH12 rejects unauthorized successor ownership transfer", async () => {
  const record = await authorizedFirstHandoff("bad-owner");
  const tampered = withNext(record, { ...record.next, owningRole: "controller" });
  const phone = coordinator(initialState(), mobile, "mobile-participant", new MemoryTransport(), "phone-bad-owner");
  const result = phone.accept(tampered);
  assert.equal(result.status, "rejected");
  if (result.status === "rejected") assert.equal(result.reason, "transition-mismatch");
  assert.equal(phone.state.owningRole, "controller");
  assert.equal(phone.state.currentStepId, step1);
});

test("VH12 rejects unauthorized successor expected-next-event selection", async () => {
  const record = await authorizedFirstHandoff("bad-event");
  const tampered = withNext(record, { ...record.next, expectedNextEvent: "step-ready" });
  const phone = coordinator(initialState(), mobile, "mobile-participant", new MemoryTransport(), "phone-bad-event");
  const result = phone.accept(tampered);
  assert.equal(result.status, "rejected");
  if (result.status === "rejected") assert.equal(result.reason, "transition-mismatch");
  assert.equal(phone.state.expectedNextEvent, "step-complete");
});

test("VH12 generic invariant forbids nonterminal messages from manufacturing terminal outcomes even if local policy is wrong", async () => {
  const record = await authorizedFirstHandoff("bad-terminal");
  const manufactured: ValidationCoordinationTransition = {
    status: "terminal",
    currentStepId: step2,
    owningRole: "mobile-participant",
    expectedNextEvent: "terminal",
    terminalClassification: "pass",
  };
  const tampered = withNext(record, manufactured);
  const unsafeAuthority: ValidationCoordinationTransitionAuthority = { authorizeSuccessor: () => manufactured };
  const phone = coordinator(initialState(), mobile, "mobile-participant", new MemoryTransport(), "phone-bad-terminal", unsafeAuthority);
  const result = phone.accept(tampered);
  assert.equal(result.status, "rejected");
  if (result.status === "rejected") assert.equal(result.reason, "transition-mismatch");
  assert.equal(phone.state.status, "active");
});

test("VH12 terminal message disposition and classification must agree with the successor independently of scenario policy", () => {
  const terminalState: ValidationCoordinationState = { ...initialState(), expectedNextEvent: "terminal" };
  const terminalMessage: ValidationCoordinationMessage = {
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    messageId: validationCoordinationMessageId("terminal-message"),
    sequence: 1,
    run,
    senderDeviceId: controller,
    senderRole: "controller",
    recipientDeviceId: mobile,
    stepId: step1,
    createdAt: "2026-09-15T20:05:00.000Z",
    evidenceRefs: [],
    kind: "terminal",
    terminalClassification: "pass",
  };
  const passTransition: ValidationCoordinationTransition = {
    status: "terminal",
    currentStepId: step1,
    owningRole: "controller",
    expectedNextEvent: "terminal",
    terminalClassification: "pass",
  };
  const validAuthority: ValidationCoordinationTransitionAuthority = { authorizeSuccessor: () => passTransition };
  const valid = coordinationRecord(terminalState, terminalMessage, passTransition, validAuthority);

  const wrongClassification: ValidationCoordinationTransition = { ...passTransition, terminalClassification: "fail" };
  const wrongClassificationAuthority: ValidationCoordinationTransitionAuthority = { authorizeSuccessor: () => wrongClassification };
  const classificationResult = acceptValidationCoordinationRecord(
    terminalState,
    mobile,
    withNext(valid, wrongClassification),
    wrongClassificationAuthority,
  );
  assert.equal(classificationResult.status, "rejected");
  if (classificationResult.status === "rejected") assert.equal(classificationResult.reason, "transition-mismatch");

  const nonterminal: ValidationCoordinationTransition = {
    status: "active",
    currentStepId: step1,
    owningRole: "controller",
    expectedNextEvent: "terminal",
  };
  const nonterminalAuthority: ValidationCoordinationTransitionAuthority = { authorizeSuccessor: () => nonterminal };
  const dispositionResult = acceptValidationCoordinationRecord(terminalState, mobile, withNext(valid, nonterminal), nonterminalAuthority);
  assert.equal(dispositionResult.status, "rejected");
  if (dispositionResult.status === "rejected") assert.equal(dispositionResult.reason, "transition-mismatch");
});

test("VH12 send path refuses a successor rejected by its own local transition authority", async () => {
  const transport = new MemoryTransport();
  const windows = coordinator(initialState(), controller, "controller", transport, "sender-reject");
  await assert.rejects(
    windows.send("step-complete", {
      status: "active",
      currentStepId: step3,
      owningRole: "mobile-participant",
      expectedNextEvent: "step-complete",
    }),
    /transition-mismatch/,
  );
  assert.equal(transport.records.length, 0);
  assert.equal(windows.state.currentStepId, step1);
});

test("VH12 rejects duplicate/stale messages after first acceptance", async () => {
  const transport = new MemoryTransport();
  const windows = coordinator(initialState(), controller, "controller", transport, "windows-stale");
  const phone = coordinator(initialState(), mobile, "mobile-participant", transport, "mobile-stale");
  await windows.send("step-complete", { status: "active", currentStepId: step2, owningRole: "mobile-participant", expectedNextEvent: "step-complete" });
  assert.equal((await phone.poll())[0].status, "accepted");
  const duplicate = (await phone.poll())[0];
  assert.equal(duplicate.status, "rejected");
  if (duplicate.status === "rejected") assert.equal(duplicate.reason, "stale-sequence");
});

test("VH12 tolerates a delayed or suspended participant by replaying durable run-scoped records", async () => {
  const transport = new MemoryTransport();
  const windows = coordinator(initialState(), controller, "controller", transport, "delayed", delayedAuthority);
  await windows.send("step-complete", { status: "paused", currentStepId: step2, owningRole: "mobile-participant", expectedNextEvent: "resume" });
  const resumedPhone = coordinator(initialState(), mobile, "mobile-participant", transport, "resumed", delayedAuthority);
  const outcomes = await resumedPhone.poll();
  assert.equal(outcomes[0].status, "accepted");
  assert.equal(resumedPhone.state.status, "paused");
  assert.equal(resumedPhone.state.currentStepId, step2);
  assert.equal(resumedPhone.state.expectedNextEvent, "resume");
});

test("VH12 requires distinct physical installation identities and correct role binding", () => {
  const state = { ...initialState(), mobileParticipantDeviceId: controller } as ValidationCoordinationState;
  assert.throws(() => coordinator(state, controller, "controller", new MemoryTransport(), "collision"), /distinct device identities/);
  assert.throws(() => coordinator(initialState(), controller, "mobile-participant", new MemoryTransport(), "role"), /role does not match/);
});

test("VH12 fails closed on mismatched run and scenario identity", () => {
  const current = initialState();
  const otherRunState = { ...current, run: validationRunIdentity("other-run", "C03") };
  const otherRunMessage: ValidationCoordinationMessage = {
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    messageId: validationCoordinationMessageId("other-run-message"),
    sequence: 1,
    run: otherRunState.run,
    senderDeviceId: controller,
    senderRole: "controller",
    recipientDeviceId: mobile,
    stepId: step1,
    createdAt: "2026-09-15T20:10:00.000Z",
    evidenceRefs: [],
    kind: "step-complete",
  };
  const otherRunRecord = coordinationRecord(
    otherRunState,
    otherRunMessage,
    { status: "active", currentStepId: step2, owningRole: "mobile-participant", expectedNextEvent: "step-complete" },
    handoffAuthority,
  );
  const runResult = acceptValidationCoordinationRecord(current, mobile, otherRunRecord, handoffAuthority);
  assert.equal(runResult.status, "rejected");
  if (runResult.status === "rejected") assert.equal(runResult.reason, "run-mismatch");

  const otherScenarioState = { ...current, run: validationRunIdentity("run-vh12", "C04") };
  const otherScenarioMessage = { ...otherRunMessage, messageId: validationCoordinationMessageId("other-scenario-message"), run: otherScenarioState.run } as ValidationCoordinationMessage;
  const otherScenarioRecord = coordinationRecord(
    otherScenarioState,
    otherScenarioMessage,
    { status: "active", currentStepId: step2, owningRole: "mobile-participant", expectedNextEvent: "step-complete" },
    handoffAuthority,
  );
  const scenarioResult = acceptValidationCoordinationRecord(current, mobile, otherScenarioRecord, handoffAuthority);
  assert.equal(scenarioResult.status, "rejected");
  if (scenarioResult.status === "rejected") assert.equal(scenarioResult.reason, "scenario-mismatch");
});

test("VH12 Drive transport creates validation control outside the managed vault namespace", async () => {
  const requests: Array<{ url: string; init?: { readonly method?: string; readonly body?: unknown }; retry?: boolean }> = [];
  let postCount = 0;
  const drive: ValidationDriveRequestTransport = {
    async request(url, init, retry) {
      requests.push({ url, init, retry });
      if ((init?.method ?? "GET") === "GET") return { ok: true as const, value: new Response(JSON.stringify({ files: [] }), { status: 200 }) };
      postCount += 1;
      return { ok: true as const, value: new Response(JSON.stringify({ id: postCount === 1 ? "validation-root-id" : "record-id" }), { status: 200 }) };
    },
  };
  const transport = new DriveValidationCoordinationTransport(drive);
  const message: ValidationCoordinationMessage = {
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    messageId: validationCoordinationMessageId("drive-record-1"),
    sequence: 1,
    run,
    senderDeviceId: controller,
    senderRole: "controller",
    recipientDeviceId: mobile,
    stepId: step1,
    createdAt: "2026-09-15T20:20:00.000Z",
    evidenceRefs: [],
    kind: "step-complete",
  };
  const record = coordinationRecord(
    initialState(),
    message,
    { status: "active", currentStepId: step2, owningRole: "mobile-participant", expectedNextEvent: "step-complete" },
    handoffAuthority,
  );
  await transport.publish(record);
  const rootCreate = requests.find(request => request.init?.method === "POST");
  assert.ok(rootCreate?.init?.body);
  const rootMetadata = JSON.parse(String(rootCreate.init.body)) as { parents?: unknown; appProperties?: Record<string, string> };
  assert.equal(rootMetadata.parents, undefined, "validation root must be a top-level app-created Drive object, not a child of BRAIN Sync");
  assert.equal(rootMetadata.appProperties?.[VALIDATION_COORDINATION_DRIVE_ROLE_KEY], VALIDATION_COORDINATION_DRIVE_ROLE_ROOT);
  assert.equal(rootMetadata.appProperties?.brainSyncRole, undefined, "validation metadata must not use the ordinary managed-vault role namespace");
  assert.equal(requests.some(request => request.url.includes("appDataFolder")), false, "transport must not require the drive.appdata OAuth scope");
  assert.equal(requests.some(request => String(request.init?.body ?? "").includes("brainSyncRole")), false);
});
