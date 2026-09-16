import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type DeviceIdentity, type VaultIdentity } from "../src/contracts";
import { CoreRunCoordinator, InMemoryRunLeasePort, enterSynchronizationLifecycle } from "../src/core/run-coordinator";
import {
  ValidationFaultOccurrenceCounter,
  ValidationRemoteMutationAmbiguityHook,
  applyDeterministicCancellationFault,
  applyValidationStateFault,
  resolveValidationAmbiguousRemoteMutation,
  type ValidationDisposableStateMutationPort,
  type ValidationStateSafetyEvidence,
} from "../src/validation/state-ambiguity-cancel-fault-hooks";
import {
  validationEvidenceRef,
  validationFaultSpecification,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  validationRunIdentity,
  validationSandboxOwnership,
  validationStepId,
  type ValidationSandboxAuthorization,
} from "../src/validation/run-sandbox-checkpoint-contracts";

const run = validationRunIdentity("run-vh11-e02", "E02");
const stepId = validationStepId("vh11-fault-hook");

function authorizedState() {
  const ownership = validationSandboxOwnership({
    resourceId: "state-copy:run-vh11-e02",
    surface: "validation-vault-state-copy",
    owner: run,
  });
  const authorization: ValidationSandboxAuthorization = { status: "authorized", ownership };
  const safetyEvidence: ValidationStateSafetyEvidence = {
    backup: {
      run,
      resourceId: ownership.resourceId,
      evidenceRef: validationEvidenceRef("evidence:state-backup:run-vh11-e02"),
    },
    preFaultCheckpoint: {
      run,
      resourceId: ownership.resourceId,
      evidenceRef: validationEvidenceRef("evidence:checkpoint:run-vh11-e02"),
      sentinelPreserved: true,
    },
  };
  return { authorization, safetyEvidence, resourceId: ownership.resourceId };
}

function recordingStatePort() {
  const calls: Array<{ action: string; resourceId: string }> = [];
  const port: ValidationDisposableStateMutationPort = {
    corruptState: resourceId => { calls.push({ action: "corrupt-state", resourceId: String(resourceId) }); },
    removeState: resourceId => { calls.push({ action: "remove-state", resourceId: String(resourceId) }); },
    removeCursor: resourceId => { calls.push({ action: "remove-cursor", resourceId: String(resourceId) }); },
  };
  return { calls, port };
}

test("post-dispatch response loss cannot precede durable intent persistence and dispatch evidence", () => {
  const hook = new ValidationRemoteMutationAmbiguityHook();
  assert.throws(() => hook.recordRemoteMutationDispatched("evidence:dispatch"), /before durable-intent persistence/);

  const specification = validationFaultSpecification({ run, stepId, kind: "post-dispatch-response-loss" });
  assert.throws(
    () => hook.injectResponseLoss(specification, new ValidationFaultOccurrenceCounter()),
    /requires durable-intent and remote-dispatch evidence/,
  );

  hook.recordDurableIntentPersisted("evidence:intent-persisted");
  hook.recordRemoteMutationDispatched("evidence:remote-dispatched");
  const result = hook.injectResponseLoss(specification, new ValidationFaultOccurrenceCounter());
  assert.equal(result.status, "triggered-post-dispatch");
  if (result.status !== "triggered-post-dispatch") return;
  assert.equal(result.physicalEffect.status, "outcome-unknown");
  assert.equal(result.requiresObservation, true);
  assert.equal(String(result.durableDispatch.durableIntentEvidenceRef), "evidence:intent-persisted");
  assert.equal(String(result.durableDispatch.remoteDispatchEvidenceRef), "evidence:remote-dispatched");
});

test("response-loss occurrence is deterministic and possibly dispatched effects remain uncertain until observed", () => {
  const hook = new ValidationRemoteMutationAmbiguityHook();
  hook.recordDurableIntentPersisted("evidence:intent");
  hook.recordRemoteMutationDispatched("evidence:dispatch");
  const specification = validationFaultSpecification({ run, stepId, kind: "post-dispatch-response-loss", occurrence: 2 });
  const occurrences = new ValidationFaultOccurrenceCounter();

  assert.equal(hook.injectResponseLoss(specification, occurrences).status, "not-triggered");
  const ambiguous = hook.injectResponseLoss(specification, occurrences);
  assert.equal(ambiguous.status, "triggered-post-dispatch");
  if (ambiguous.status !== "triggered-post-dispatch") return;
  assert.equal(ambiguous.physicalEffect.status, "outcome-unknown");
  assert.throws(() => resolveValidationAmbiguousRemoteMutation(ambiguous, undefined), /requires independent observation evidence/);

  const resolved = resolveValidationAmbiguousRemoteMutation(ambiguous, {
    status: "verified-applied",
    evidenceRef: validationEvidenceRef("evidence:independent-remote-observation"),
  });
  assert.equal(resolved.status, "observed-resolution");
  assert.equal(resolved.physicalEffect.status, "verified-applied");
});

test("direct state manipulation refuses non-disposable/primary state authority before touching the port", async () => {
  const { calls, port } = recordingStatePort();
  const specification = validationFaultSpecification({ run, stepId, kind: "validation-state-corruption" });
  const rejected: ValidationSandboxAuthorization = { status: "rejected", reason: "surface-out-of-scope" };

  await assert.rejects(
    applyValidationStateFault({
      specification,
      action: "remove-state",
      authorization: rejected,
      safetyEvidence: undefined,
      port,
      occurrences: new ValidationFaultOccurrenceCounter(),
    }),
    /sandbox authorization is rejected/,
  );
  assert.deepEqual(calls, []);
});

test("an authorized sandbox surface that is not a disposable state copy is still refused", async () => {
  const ownership = validationSandboxOwnership({
    resourceId: "primary-or-fixture-state:vh11",
    surface: "vault-fixture",
    owner: run,
  });
  const authorization: ValidationSandboxAuthorization = { status: "authorized", ownership };
  const { calls, port } = recordingStatePort();
  const specification = validationFaultSpecification({ run, stepId, kind: "validation-state-corruption" });
  const safetyEvidence: ValidationStateSafetyEvidence = {
    backup: { run, resourceId: ownership.resourceId, evidenceRef: validationEvidenceRef("evidence:wrong-surface-backup") },
    preFaultCheckpoint: { run, resourceId: ownership.resourceId, evidenceRef: validationEvidenceRef("evidence:wrong-surface-checkpoint"), sentinelPreserved: true },
  };

  await assert.rejects(
    applyValidationStateFault({
      specification,
      action: "remove-state",
      authorization,
      safetyEvidence,
      port,
      occurrences: new ValidationFaultOccurrenceCounter(),
    }),
    /allowed only on an authorized disposable validation-vault-state-copy/,
  );
  assert.deepEqual(calls, []);
});

test("direct state manipulation requires both backup and pre-fault checkpoint evidence", async () => {
  const { authorization } = authorizedState();
  const { calls, port } = recordingStatePort();
  const specification = validationFaultSpecification({ run, stepId, kind: "validation-state-corruption" });

  await assert.rejects(
    applyValidationStateFault({
      specification,
      action: "corrupt-state",
      authorization,
      safetyEvidence: undefined,
      port,
      occurrences: new ValidationFaultOccurrenceCounter(),
    }),
    /requires backup and pre-fault checkpoint evidence/,
  );
  assert.deepEqual(calls, []);
});

test("state loss and cursor loss are bounded to the authorized disposable validation state resource", async () => {
  const { authorization, safetyEvidence, resourceId } = authorizedState();
  const { calls, port } = recordingStatePort();

  const stateLoss = await applyValidationStateFault({
    specification: validationFaultSpecification({ run, stepId, kind: "validation-state-corruption" }),
    action: "remove-state",
    authorization,
    safetyEvidence,
    port,
    occurrences: new ValidationFaultOccurrenceCounter(),
  });
  assert.equal(stateLoss.fault.status, "triggered-non-mutation");

  const cursorLoss = await applyValidationStateFault({
    specification: validationFaultSpecification({ run, stepId, kind: "validation-cursor-loss" }),
    action: "remove-cursor",
    authorization,
    safetyEvidence,
    port,
    occurrences: new ValidationFaultOccurrenceCounter(),
  });
  assert.equal(cursorLoss.fault.status, "triggered-non-mutation");
  assert.deepEqual(calls, [
    { action: "remove-state", resourceId: String(resourceId) },
    { action: "remove-cursor", resourceId: String(resourceId) },
  ]);
});

test("cursor loss cannot be widened into whole-state corruption", async () => {
  const { authorization, safetyEvidence } = authorizedState();
  const { calls, port } = recordingStatePort();
  await assert.rejects(
    applyValidationStateFault({
      specification: validationFaultSpecification({ run, stepId, kind: "validation-cursor-loss" }),
      action: "corrupt-state",
      authorization,
      safetyEvidence,
      port,
      occurrences: new ValidationFaultOccurrenceCounter(),
    }),
    /may remove only the approved validation cursor/,
  );
  assert.deepEqual(calls, []);
});

test("post-dispatch cancellation uses production run authority and leaves the in-flight atomic operation untouched", async () => {
  enterSynchronizationLifecycle("active");
  const vault = contractId<"VaultIdentity">("vault:vh11") as VaultIdentity;
  const device = contractId<"DeviceIdentity">("device:vh11") as DeviceIdentity;
  const coordinator = new CoreRunCoordinator(vault, device, new InMemoryRunLeasePort(), "vh11-holder");
  assert.deepEqual(await coordinator.beginRun(), { status: "started" });
  assert.equal(coordinator.canStartNextOperation(), true);

  let finishOperation!: () => void;
  let operationCompleted = false;
  const inFlightAtomicOperation = new Promise<void>(resolve => { finishOperation = resolve; })
    .then(() => { operationCompleted = true; });

  const result = applyDeterministicCancellationFault({
    specification: validationFaultSpecification({ run, stepId, kind: "cancellation-timing" }),
    point: "post-dispatch-pre-response",
    authority: coordinator,
    occurrences: new ValidationFaultOccurrenceCounter(),
  });

  assert.equal(result.status, "triggered-cancellation");
  if (result.status !== "triggered-cancellation") return;
  assert.equal(result.currentOperationEffect.status, "outcome-unknown");
  assert.equal(coordinator.isCancellationRequested(), true);
  assert.equal(coordinator.canStartNextOperation(), false);
  assert.equal(operationCompleted, false);

  finishOperation();
  await inFlightAtomicOperation;
  assert.equal(operationCompleted, true);
  assert.equal(coordinator.canStartNextOperation(), false);
  await coordinator.finishRun();
});

test("pre-dispatch cancellation deterministically blocks the next atomic operation before dispatch", async () => {
  enterSynchronizationLifecycle("active");
  const vault = contractId<"VaultIdentity">("vault:vh11-pre") as VaultIdentity;
  const device = contractId<"DeviceIdentity">("device:vh11-pre") as DeviceIdentity;
  const coordinator = new CoreRunCoordinator(vault, device, new InMemoryRunLeasePort(), "vh11-holder-pre");
  assert.deepEqual(await coordinator.beginRun(), { status: "started" });

  const result = applyDeterministicCancellationFault({
    specification: validationFaultSpecification({ run, stepId, kind: "cancellation-timing" }),
    point: "before-operation-dispatch",
    authority: coordinator,
    occurrences: new ValidationFaultOccurrenceCounter(),
  });
  assert.equal(result.status, "triggered-cancellation");
  if (result.status !== "triggered-cancellation") return;
  assert.deepEqual(result.currentOperationEffect, { status: "verified-not-applied", basis: "fault-before-dispatch" });
  assert.equal(coordinator.canStartNextOperation(), false);
  await coordinator.finishRun();
});
