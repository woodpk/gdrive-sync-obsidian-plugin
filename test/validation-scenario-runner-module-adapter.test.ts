import assert from "node:assert/strict";
import test from "node:test";
import { validationEvidenceRef } from "../src/validation/driver-plan-fault-verifier-contracts";
import {
  VALIDATION_RUNNER_MODULE_COMPLETION_PROOFS,
  ValidationRunnerModuleAdapter,
  type ValidationRunnerApprovedModuleDelegate,
  type ValidationRunnerApprovedModuleDelegates,
  type ValidationRunnerApprovedModuleResult,
  type ValidationRunnerModuleAdapterOptions,
} from "../src/validation/scenario-runner-module-adapter";
import {
  VALIDATION_RUNNER_MODULE_IDS,
  type ValidationRunnerCompletionProof,
  type ValidationRunnerModuleId,
  type ValidationRunnerPrerequisiteResult,
  type ValidationRunnerStepDefinition,
} from "../src/validation/scenario-runner-contracts";
import {
  humanCheckpoint,
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";

const run = validationRunIdentity("vh14-d-run", "C03");
const otherRun = validationRunIdentity("vh14-d-other-run", "C03");
const evidence = validationEvidenceRef("evidence:vh14-d:delegated");

function completed(evidenceRefs = [evidence]): ValidationRunnerApprovedModuleResult {
  return { status: "completed", evidenceRefs };
}

function delegates(
  overrides: Partial<Record<ValidationRunnerModuleId, ValidationRunnerApprovedModuleDelegate>> = {},
): ValidationRunnerApprovedModuleDelegates {
  return Object.fromEntries(VALIDATION_RUNNER_MODULE_IDS.map(module => [
    module,
    overrides[module] ?? { execute: async () => completed() },
  ])) as unknown as ValidationRunnerApprovedModuleDelegates;
}

function adapter(input: {
  readonly modules?: ValidationRunnerApprovedModuleDelegates;
  readonly prerequisites?: ValidationRunnerModuleAdapterOptions["prerequisites"];
} = {}): ValidationRunnerModuleAdapter {
  return new ValidationRunnerModuleAdapter({
    modules: input.modules ?? delegates(),
    prerequisites: input.prerequisites ?? {
      evaluate: async request => request.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "satisfied" as const,
        summary: "Delegated prerequisite satisfied.",
        evidenceRefs: [evidence],
      })),
    },
  });
}

function step(
  module: ValidationRunnerModuleId,
  requiredCompletionProof: ValidationRunnerCompletionProof = VALIDATION_RUNNER_MODULE_COMPLETION_PROOFS[module],
): ValidationRunnerStepDefinition {
  return {
    stepId: validationStepId(`vh14-d-${module}`),
    module,
    operation: `delegate-${module}`,
    requiredCompletionProof,
    input: { sentinel: module },
  };
}

test("VH14-D freezes exact module ownership and routes every step only to its approved VH04-VH13 delegate", async () => {
  assert.deepEqual(VALIDATION_RUNNER_MODULE_COMPLETION_PROOFS, {
    "safety-sandbox": "operation-complete",
    "fixture-manager": "operation-complete",
    "production-path-driver": "operation-complete",
    "plan-assertion-engine": "operation-complete",
    "state-convergence-verifier": "verification-passed",
    "scenario-evidence-recorder": "evidence-recorded",
    "transport-coverage-faults": "operation-complete",
    "state-ambiguity-cancel-fault-hooks": "operation-complete",
    "cross-device-coordinator": "operation-complete",
    "human-checkpoint-resume-controller": "operation-complete",
  });

  const calls: Array<{ readonly module: ValidationRunnerModuleId; readonly operation: string; readonly input: unknown }> = [];
  const moduleDelegates = delegates(Object.fromEntries(VALIDATION_RUNNER_MODULE_IDS.map(module => [
    module,
    {
      execute: async (request: { readonly operation: string; readonly input?: unknown }) => {
        calls.push({ module, operation: request.operation, input: request.input });
        return completed();
      },
    },
  ])) as Partial<Record<ValidationRunnerModuleId, ValidationRunnerApprovedModuleDelegate>>);
  const facade = adapter({ modules: moduleDelegates });

  for (const module of VALIDATION_RUNNER_MODULE_IDS) {
    const result = await facade.executeStep({ run, step: step(module) });
    assert.deepEqual(result, {
      status: "completed",
      proof: VALIDATION_RUNNER_MODULE_COMPLETION_PROOFS[module],
      evidenceRefs: [evidence],
    });
  }
  assert.deepEqual(calls.map(call => call.module), VALIDATION_RUNNER_MODULE_IDS);
  assert.deepEqual(calls.map(call => call.operation), VALIDATION_RUNNER_MODULE_IDS.map(module => `delegate-${module}`));
  assert.deepEqual(calls.map(call => call.input), VALIDATION_RUNNER_MODULE_IDS.map(module => ({ sentinel: module })));
});

test("VH14-D preserves prerequisite order and fails closed on missing, duplicate, or thrown delegated results", async () => {
  const reversed: readonly ValidationRunnerPrerequisiteResult[] = [
    { prerequisiteId: "second", status: "blocked", summary: "Second is not observable.", evidenceRefs: [evidence] },
    { prerequisiteId: "first", status: "satisfied", summary: "First is ready.", evidenceRefs: [evidence] },
  ];
  const ordered = await adapter({ prerequisites: { evaluate: async () => reversed } }).evaluatePrerequisites({
    run,
    prerequisiteIds: ["first", "second"],
  });
  assert.deepEqual(ordered.map(result => result.prerequisiteId), ["first", "second"]);
  assert.deepEqual(ordered.map(result => result.status), ["satisfied", "blocked"]);

  const missing = await adapter({
    prerequisites: { evaluate: async () => reversed.slice(0, 1) },
  }).evaluatePrerequisites({ run, prerequisiteIds: ["first", "second"] });
  assert.deepEqual(missing.map(result => result.status), ["blocked", "blocked"]);
  assert.match(missing[0]!.summary, /omitted/i);

  const duplicate = await adapter().evaluatePrerequisites({
    run,
    prerequisiteIds: ["same", "same"],
  });
  assert.deepEqual(duplicate.map(result => result.status), ["blocked", "blocked"]);
  assert.match(duplicate[0]!.summary, /duplicated/i);

  const thrown = await adapter({
    prerequisites: { evaluate: async () => { throw new Error("not durable proof"); } },
  }).evaluatePrerequisites({ run, prerequisiteIds: ["ready"] });
  assert.equal(thrown[0]!.status, "blocked");
  assert.match(thrown[0]!.summary, /failed closed/i);
});

test("VH14-D proof ownership prevents planner, executor, and injected faults from manufacturing verification or evidence", async () => {
  let productionCalls = 0;
  let transportFaultCalls = 0;
  const facade = adapter({
    modules: delegates({
      "production-path-driver": { execute: async () => { productionCalls += 1; return completed(); } },
      "plan-assertion-engine": {
        execute: async () => ({
          status: "failed",
          summary: "Observed plan contains an unexpected mutation.",
          evidenceRefs: [evidence],
        }),
      },
      "transport-coverage-faults": { execute: async () => { transportFaultCalls += 1; return completed(); } },
    }),
  });

  const assertionMismatch = await facade.executeStep({ run, step: step("plan-assertion-engine") });
  assert.equal(assertionMismatch.status, "failed");
  assert.equal(productionCalls, 0, "an assertion mismatch must not dispatch production mutation");

  const productionProof = await facade.executeStep({
    run,
    step: step("production-path-driver", "verification-passed"),
  });
  const faultProof = await facade.executeStep({
    run,
    step: step("transport-coverage-faults", "verification-passed"),
  });
  assert.equal(productionProof.status, "blocked");
  assert.equal(faultProof.status, "blocked");
  if (productionProof.status === "blocked") assert.equal(productionProof.reason.kind, "completion-proof-missing");
  if (faultProof.status === "blocked") assert.equal(faultProof.reason.kind, "completion-proof-missing");
  assert.equal(productionCalls, 0, "an invalid proof request must stop before production dispatch");
  assert.equal(transportFaultCalls, 0, "a fault must never be dispatched as a verifier");
});

test("VH14-D preserves VH11 uncertainty as operation completion until a separate VH08 observation establishes physical reality", async () => {
  const calls: ValidationRunnerModuleId[] = [];
  const facade = adapter({
    modules: delegates({
      "state-ambiguity-cancel-fault-hooks": {
        execute: async () => {
          calls.push("state-ambiguity-cancel-fault-hooks");
          return {
            status: "physical-outcome-uncertain",
            summary: "A dispatched remote effect remains physically uncertain.",
            evidenceRefs: [evidence],
          };
        },
      },
      "state-convergence-verifier": {
        execute: async () => {
          calls.push("state-convergence-verifier");
          return completed();
        },
      },
    }),
  });

  const uncertain = await facade.executeStep({ run, step: step("state-ambiguity-cancel-fault-hooks") });
  assert.deepEqual(uncertain, { status: "completed", proof: "operation-complete", evidenceRefs: [evidence] });
  assert.notEqual(uncertain.status === "completed" ? uncertain.proof : undefined, "verification-passed");

  const observed = await facade.executeStep({ run, step: step("state-convergence-verifier") });
  assert.deepEqual(observed, { status: "completed", proof: "verification-passed", evidenceRefs: [evidence] });
  assert.deepEqual(calls, ["state-ambiguity-cancel-fault-hooks", "state-convergence-verifier"]);
});

test("VH14-D rejects missing, malformed, and evidence-free delegated proof and converts throws to module failure", async () => {
  const noResult = await adapter({
    modules: delegates({ "fixture-manager": { execute: async () => undefined } }),
  }).executeStep({ run, step: step("fixture-manager") });
  assert.equal(noResult.status, "blocked");

  const noVerifierEvidence = await adapter({
    modules: delegates({ "state-convergence-verifier": { execute: async () => completed([]) } }),
  }).executeStep({ run, step: step("state-convergence-verifier") });
  assert.equal(noVerifierEvidence.status, "blocked");
  if (noVerifierEvidence.status === "blocked") assert.equal(noVerifierEvidence.reason.kind, "completion-proof-missing");

  const noRecorderEvidence = await adapter({
    modules: delegates({ "scenario-evidence-recorder": { execute: async () => completed([]) } }),
  }).executeStep({ run, step: step("scenario-evidence-recorder") });
  assert.equal(noRecorderEvidence.status, "blocked");

  const thrown = await adapter({
    modules: delegates({
      "plan-assertion-engine": { execute: async () => { throw new Error("assertion crash"); } },
    }),
  }).executeStep({ run, step: step("plan-assertion-engine") });
  assert.equal(thrown.status, "failed");
  if (thrown.status === "failed") assert.equal(thrown.reason.kind, "module-failed");

  const missingModules = delegates() as unknown as Record<string, ValidationRunnerApprovedModuleDelegate>;
  delete missingModules["fixture-manager"];
  const missingDelegate = await adapter({
    modules: missingModules as unknown as ValidationRunnerApprovedModuleDelegates,
  }).executeStep({ run, step: step("fixture-manager") });
  assert.equal(missingDelegate.status, "blocked");
});

test("VH14-D accepts pause/resume only from VH13 for the exact active run", async () => {
  const checkpoint = humanCheckpoint({
    checkpointId: "vh14-d-human-checkpoint",
    run,
    deviceId: "iphone-a",
    requestedAction: "restart-obsidian",
    instruction: "Restart Obsidian.",
  });
  const resumable = {
    state: "resumable" as const,
    checkpoint,
    acknowledgement: "acknowledged",
    verification: "observed",
    resumeStepId: validationStepId("vh14-d-resume-step"),
  };
  const vh13 = adapter({
    modules: delegates({
      "human-checkpoint-resume-controller": {
        execute: async request => request.operation === "resume"
          ? { status: "resumable", resume: resumable, evidenceRefs: [evidence] }
          : { status: "paused-human-action", checkpoint, evidenceRefs: [evidence] },
      },
    }),
  });
  const paused = await vh13.executeStep({ run, step: step("human-checkpoint-resume-controller") });
  assert.equal(paused.status, "paused-human-action");
  const resumed = await vh13.executeStep({
    run,
    step: { ...step("human-checkpoint-resume-controller"), operation: "resume" },
  });
  assert.equal(resumed.status, "resumable");

  const unauthorizedPause = await adapter({
    modules: delegates({
      "cross-device-coordinator": { execute: async () => ({ status: "paused-human-action", checkpoint, evidenceRefs: [evidence] }) },
    }),
  }).executeStep({ run, step: step("cross-device-coordinator") });
  assert.equal(unauthorizedPause.status, "blocked");

  const wrongCheckpoint = humanCheckpoint({
    checkpointId: "vh14-d-wrong-run-checkpoint",
    run: otherRun,
    deviceId: "iphone-a",
    requestedAction: "restart-obsidian",
    instruction: "Restart Obsidian.",
  });
  const wrongRun = await adapter({
    modules: delegates({
      "human-checkpoint-resume-controller": {
        execute: async () => ({ status: "paused-human-action", checkpoint: wrongCheckpoint, evidenceRefs: [evidence] }),
      },
    }),
  }).executeStep({ run, step: step("human-checkpoint-resume-controller") });
  assert.equal(wrongRun.status, "blocked");
});
