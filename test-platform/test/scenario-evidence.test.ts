import {
  deepStrictEqual,
  notStrictEqual,
  doesNotMatch,
  match,
  strictEqual,
} from "node:assert/strict";
import { test } from "node:test";

import { defineScenario, type ScenarioDefinition } from "../src/scenario/scenario-contract";
import { buildScenarioEvidence, createScenarioEvidenceHooks } from "../src/scenario/scenario-evidence";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";

function scenario(id: string, steps: ScenarioDefinition["steps"]): ScenarioDefinition {
  return defineScenario({
    id,
    description: "S05C evidence fixture",
    traceability: {
      targets: [
        { kind: "requirement", id: "REQ-S05C-EVIDENCE" },
        { kind: "invariant", id: "INV-OBSERVATION-AUTHORITY" },
      ],
    },
    executionModes: ["deterministic"],
    steps,
  });
}

test("canonical local observation and assertions produce privacy-safe deterministic evidence", async () => {
  const definition = scenario("local-evidence", [
    {
      id: "seed",
      kind: "fixture",
      operation: "put-local-file",
      device: "device-a",
      path: "private.md",
      content: { encoding: "utf8", value: "private note body" },
    },
    {
      id: "observe",
      kind: "observe",
      subject: "local-entry",
      device: "device-a",
      path: "private.md",
      captureAs: "local",
    },
    { id: "status", kind: "assert", assertion: "status", observationRef: "local", expectedStatus: "present" },
    { id: "exists", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "hash", kind: "assert", assertion: "field-not-equals", observationRef: "local", field: "hash", expected: "wrong-hash" },
  ]);

  const first = await DeterministicScenarioRunner.canonical().run(definition);
  const second = await DeterministicScenarioRunner.canonical().run(definition);

  strictEqual(first.status, "completed");
  strictEqual(first.evidence?.machine.verdict.status, "completed");
  strictEqual(first.evidence?.machine.observations[0]?.value.exists, true);
  strictEqual(typeof first.evidence?.machine.observations[0]?.value.hash, "string");
  strictEqual(first.evidence?.machine.assertions.length, 3);
  strictEqual(first.evidence?.machine.fixtures[0]?.sizeBytes, 17);
  doesNotMatch(first.evidence?.machineJson ?? "", /private note body/);
  match(first.evidence?.human ?? "", /verdict=completed/);
  strictEqual(first.evidence?.machineJson, second.evidence?.machineJson);
});

test("wrong objective expectation fails and one failing assertion prevents overall PASS", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(
    scenario("wrong-expectation", [
      {
        id: "seed",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "wrong.md",
        content: { encoding: "utf8", value: "x" },
      },
      {
        id: "observe",
        kind: "observe",
        subject: "local-entry",
        device: "device-a",
        path: "wrong.md",
        captureAs: "local",
      },
      { id: "good", kind: "assert", assertion: "status", observationRef: "local", expectedStatus: "present" },
      { id: "bad", kind: "assert", assertion: "field-equals", observationRef: "local", field: "hash", expected: "definitely-wrong" },
    ]),
  );

  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
  deepStrictEqual(
    result.evidence?.machine.assertions.map(assertion => assertion.status),
    ["completed", "failed"],
  );
  strictEqual(result.evidence?.machine.verdict.status, "failed");
});

test("missing required observation fails closed as blocked evidence", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(
    scenario("missing-observation", [
      { id: "assert", kind: "assert", assertion: "status", observationRef: "missing", expectedStatus: "present" },
    ]),
  );
  strictEqual(result.status, "blocked");
  strictEqual(result.classification, "missing-observation");
  strictEqual(result.evidence?.machine.verdict.status, "blocked");
});

test("production plan observation supports bounded collection membership", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(
    scenario("plan-observation", [
      {
        id: "seed",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "plan.bin",
        content: { encoding: "bytes", value: [1, 2, 3] },
      },
      { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
      { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-observation" },
      { id: "contains", kind: "assert", assertion: "contains", observationRef: "plan-observation", field: "operationKinds", expected: "upload-create" },
    ]),
  );

  strictEqual(result.status, "completed");
  const kinds = result.evidence?.machine.observations[0]?.value.operationKinds;
  strictEqual(Array.isArray(kinds), true);
  strictEqual((kinds as readonly unknown[]).includes("upload-create"), true);
  strictEqual(typeof result.evidence?.machine.observations[0]?.value.operationCount, "number");
});

test("bounded count assertion checks controlled collection cardinality", async () => {
  const hooks = createScenarioEvidenceHooks();
  const result = await new DeterministicScenarioRunner({
    ...hooks,
    observe: async () => ({
      status: "completed",
      value: { status: "present", knownDeviceIds: ["device-a", "device-b"] },
    }),
  }).run(
    scenario("count-assertion", [
      { id: "observe", kind: "observe", subject: "remote-change-state", captureAs: "devices" },
      { id: "count", kind: "assert", assertion: "count", observationRef: "devices", field: "knownDeviceIds", expectedCount: 2 },
    ]),
  );

  strictEqual(result.status, "completed");
  deepStrictEqual(result.evidence?.machine.observations[0]?.value.knownDeviceIds, ["device-a", "device-b"]);
});

test("production terminal result is observed from the real controller result", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(
    scenario("production-result", [
      {
        id: "seed",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "result.bin",
        content: { encoding: "utf8", value: "result" },
      },
      { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
      { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", captureAs: "result" },
      { id: "observe-result", kind: "observe", subject: "production-result", inputRef: "result", captureAs: "terminal" },
      { id: "status", kind: "assert", assertion: "status", observationRef: "terminal", expectedStatus: "accepted" },
    ]),
  );

  strictEqual(result.status, "completed");
  strictEqual(result.evidence?.machine.observations[0]?.value.status, "accepted");
});

test("remote and durable device observations expose bounded identity revision and state facts", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(
    scenario("remote-device-state", [
      {
        id: "remote",
        kind: "fixture",
        operation: "put-remote-file",
        path: "remote.bin",
        content: { encoding: "bytes", value: [4, 5] },
      },
      { id: "remote-observe", kind: "observe", subject: "remote-entry", path: "remote.bin", captureAs: "remote-entry" },
      { id: "remote-status", kind: "assert", assertion: "status", observationRef: "remote-entry", expectedStatus: "present" },
      { id: "remote-exists", kind: "assert", assertion: "exists", observationRef: "remote-entry", expected: true },
      { id: "state-observe", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state" },
      { id: "state-status", kind: "assert", assertion: "status", observationRef: "state", expectedStatus: "trusted" },
    ]),
  );

  strictEqual(result.status, "completed");
  const observations = result.evidence?.machine.observations ?? [];
  const remote = observations.find(observation => observation.captureAs === "remote-entry")?.value;
  const state = observations.find(observation => observation.captureAs === "state")?.value;
  strictEqual(typeof remote?.remoteObjectId, "string");
  strictEqual(typeof remote?.revision, "string");
  strictEqual(typeof state?.stateRevision, "string");
  strictEqual(typeof state?.deviceIdentity, "string");
});

test("diagnostic-looking custom observation cannot substitute for authoritative fields or leak into evidence", async () => {
  const hooks = createScenarioEvidenceHooks();
  const runner = new DeterministicScenarioRunner({
    ...hooks,
    observe: async () => ({
      status: "completed",
      value: {
        diagnostic: "success",
        accessToken: "secret-token",
        content: "unrelated note content",
      },
    }),
  });
  const result = await runner.run(
    scenario("diagnostic-is-not-authority", [
      { id: "observe", kind: "observe", subject: "remote-change-state", captureAs: "observation" },
      { id: "assert", kind: "assert", assertion: "status", observationRef: "observation", expectedStatus: "present" },
    ]),
  );

  strictEqual(result.status, "blocked");
  strictEqual(result.classification, "missing-observation-field");
  const json = result.evidence?.machineJson ?? "";
  doesNotMatch(json, /secret-token|unrelated note content|"diagnostic":/);
});

test("canonical evidence retains traceability and derives human text from the same machine verdict", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(
    scenario("traceability", [
      { id: "changes", kind: "observe", subject: "remote-change-state", captureAs: "change-state" },
      { id: "status", kind: "assert", assertion: "status", observationRef: "change-state", expectedStatus: "present" },
    ]),
  );

  strictEqual(result.status, "completed");
  deepStrictEqual(
    result.evidence?.machine.traceability.map(target => target.id),
    ["REQ-S05C-EVIDENCE", "INV-OBSERVATION-AUTHORITY"],
  );
  match(result.evidence?.human ?? "", new RegExp(`verdict=${result.evidence?.machine.verdict.status}`));
});

test("failure evidence preserves distinct privacy-safe reasons without copying free-form secret material", () => {
  const definition=scenario("reason-evidence",[{id:"observe",kind:"observe",subject:"remote-change-state",captureAs:"value"}]);
  const base={scenarioId:definition.id,status:"failed",steps:[],captures:{},deviceIdentities:[],executionMode:"deterministic" as const,classification:"step-exception"};
  const first=buildScenarioEvidence(definition,{...base,reason:"first private failure detail"});
  const second=buildScenarioEvidence(definition,{...base,reason:"second private failure detail"});
  notStrictEqual(first.machine.verdict.reason,second.machine.verdict.reason);
  strictEqual(first.machine.verdict.reason?.startsWith("reason-sha256:"),true);
  strictEqual(first.machineJson.includes("first private failure detail"),false);
  const token=buildScenarioEvidence(definition,{...base,reason:"oauth_token_super_secret_value"});
  strictEqual(token.machineJson.includes("super_secret_value"),false);
  const codeShaped=buildScenarioEvidence(definition,{...base,reason:"project-apollo-roadmap"});
  strictEqual(codeShaped.machine.verdict.reason?.startsWith("reason-sha256:"),true);
  strictEqual(codeShaped.machineJson.includes("project-apollo-roadmap"),false);
  const trusted=buildScenarioEvidence(definition,{...base,reason:"status"});
  strictEqual(trusted.machine.verdict.reason,"status");
  const classificationOnly=buildScenarioEvidence(definition,{...base,reason:undefined});
  strictEqual(classificationOnly.machine.verdict.reason,"step-exception");
});

test("live product status kind is retained in canonical evidence without widening unsafe fields", () => {
  const definition = scenario("live-product-kind-evidence", [
    {
      id: "observe-product",
      kind: "observe",
      subject: "device-state",
      device: "device-a",
      captureAs: "product",
    },
  ]);

  const evidence = buildScenarioEvidence(definition, {
    scenarioId: definition.id,
    status: "completed",
    steps: [
      {
        stepId: "observe-product",
        status: "completed",
        matchedExpectation: true,
      },
    ],
    captures: {
      product: {
        kind: "idle-ready",
        accessToken: "must-not-be-recorded",
      },
    },
    deviceIdentities: ["device:test"],
    executionMode: "live",
    runIdentity: "run:test",
    buildIdentity: "0123456789012345678901234567890123456789",
  });

  strictEqual(evidence.machine.observations[0]?.value.kind, "idle-ready");
  strictEqual(evidence.machineJson.includes("must-not-be-recorded"), false);
});

test("production-result evidence exposes bounded receipt authority from a live executor capture", () => {
  const definition = defineScenario({
    id: "live-production-receipt-evidence",
    description: "Live receipt summary fixture.",
    traceability: { targets: [{ kind: "completion-evidence", id: "LIVE-RECEIPT" }] },
    executionModes: ["live"],
    steps: [
      {
        id: "observe-result",
        kind: "observe",
        subject: "production-result",
        inputRef: "result",
        captureAs: "receipt",
      },
    ],
  });

  const evidence = buildScenarioEvidence(definition, {
    scenarioId: definition.id,
    status: "completed",
    steps: [
      {
        index: 0,
        stepId: "observe-result",
        kind: "observe",
        status: "completed",
        matchedExpectation: true,
      },
    ],
    captures: {
      receipt: {
        terminal: "complete",
        productionRunId: "production-run-1",
        planId: "plan-1",
        trigger: "manual",
        requiredEffectsCommittedAndVerified: true,
        committedOperationCount: 2,
        skippedOperationCount: 0,
        unsafeDetail: "must-not-be-recorded",
      },
    },
    deviceIdentities: ["device:test"],
    executionMode: "live",
    runIdentity: "bvp-run-1",
    buildIdentity: "0123456789012345678901234567890123456789",
  });

  const value = evidence.machine.observations[0]?.value;
  strictEqual(value?.terminal, "complete");
  strictEqual(value?.productionRunId, "production-run-1");
  strictEqual(value?.requiredEffectsCommittedAndVerified, true);
  strictEqual(value?.committedOperationCount, 2);
  strictEqual(value?.skippedOperationCount, 0);
  strictEqual(evidence.machineJson.includes("must-not-be-recorded"), false);
});

