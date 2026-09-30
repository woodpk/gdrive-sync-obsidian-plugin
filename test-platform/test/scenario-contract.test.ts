import {
  deepStrictEqual,
  match,
  strictEqual,
  throws,
} from "node:assert/strict";
import { test } from "node:test";

import {
  defineScenario,
  validateScenarioDefinition,
  type ScenarioDefinition,
  type ScenarioStep,
} from "../src/scenario/scenario-contract";

const representative: ScenarioDefinition = {
  id: "typed-contract-canary",
  description: "Exercises every S05A capability family as declarative data.",
  traceability: {
    targets: [
      { kind: "requirement", id: "REQ-SYNC-001" },
      { kind: "invariant", id: "INV-AUTHORITY-001" },
      { kind: "completion-evidence", id: "EVIDENCE-S05A-001" },
    ],
    legacyLabels: ["C03-migration-reference"],
  },
  executionModes: ["deterministic", "live"],
  steps: [
    {
      id: "fixture-local",
      kind: "fixture",
      operation: "put-local-file",
      device: "device-a",
      path: "notes/example.md",
      content: { encoding: "utf8", value: "hello" },
    },
    {
      id: "preview",
      kind: "production",
      device: "device-a",
      operation: "preview",
      captureAs: "plan-1",
    },
    {
      id: "fault",
      kind: "external-state",
      transition: "inject-remote-mutation-fault",
      operation: "create",
      effect: "applied-before-failure",
      classification: "simulated-response-loss",
      expect: { status: "failed", classification: "outcome-unknown" },
    },
    {
      id: "checkpoint",
      kind: "checkpoint",
      operation: "capture",
      checkpointId: "before-restart",
    },
    {
      id: "observe",
      kind: "observe",
      subject: "production-plan",
      inputRef: "plan-1",
      captureAs: "observed-plan",
    },
    {
      id: "assert",
      kind: "assert",
      assertion: "status",
      observationRef: "observed-plan",
      expectedStatus: "ready",
    },
  ],
};

void representative;

// @ts-expect-error traceability is mandatory
const missingTraceability: ScenarioDefinition = {
  id: "missing-traceability",
  description: "invalid",
  executionModes: ["deterministic"],
  steps: [{ id: "observe", kind: "observe", subject: "remote-change-state", captureAs: "changes" }],
};
void missingTraceability;

// @ts-expect-error local fixture writes require a device
const missingLocalDevice: ScenarioStep = {
  id: "bad-local-fixture",
  kind: "fixture",
  operation: "put-local-file",
  path: "note.md",
  content: { encoding: "utf8", value: "x" },
};
void missingLocalDevice;

// @ts-expect-error executing a reviewed plan requires an input reference
const missingPlanReference: ScenarioStep = {
  id: "missing-plan",
  kind: "production",
  device: "device-a",
  operation: "execute-reviewed-plan",
};
void missingPlanReference;

const callbackStep: ScenarioStep = {
  id: "callback",
  kind: "production",
  device: "device-a",
  operation: "preview",
  // @ts-expect-error arbitrary callbacks are not part of the declarative step vocabulary
  callback: () => undefined,
};
void callbackStep;

function assertInvalid(input: unknown, expected: RegExp): void {
  const result = validateScenarioDefinition(input);
  strictEqual(result.ok, false);
  if (result.ok) return;
  match(result.issues.join("\n"), expected);
}

test("representative scenario covers all six capability families as serializable ordered data", () => {
  const scenario = defineScenario(representative);
  deepStrictEqual(
    scenario.steps.map(step => step.kind),
    ["fixture", "production", "external-state", "checkpoint", "observe", "assert"],
  );
  const roundTrip = JSON.parse(JSON.stringify(scenario));
  const parsed = validateScenarioDefinition(roundTrip);
  strictEqual(parsed.ok, true);
  if (parsed.ok) deepStrictEqual(parsed.value, scenario);
});

test("traceability and execution applicability are mandatory and fail closed", () => {
  const withoutTraceability = { ...representative } as Record<string, unknown>;
  delete withoutTraceability.traceability;
  assertInvalid(withoutTraceability, /traceability\.targets must be non-empty/);

  assertInvalid(
    { ...representative, traceability: { targets: [] } },
    /traceability\.targets must be non-empty/,
  );
  assertInvalid(
    { ...representative, executionModes: [] },
    /executionModes must contain supported modes/,
  );
  assertInvalid(
    { ...representative, executionModes: ["deterministic", "unknown"] },
    /executionModes must contain supported modes/,
  );
});

test("generic local-access and deterministic-time controls validate narrowly", () => {
  const valid = validateScenarioDefinition({
    ...representative,
    id: "generic-external-controls",
    steps: [
      {
        id: "local-access",
        kind: "external-state",
        transition: "set-local-access",
        device: "device-a",
        path: "note.md",
        state: "unreadable",
      },
      {
        id: "advance-time",
        kind: "external-state",
        transition: "advance-device-time",
        device: "device-a",
        deltaMs: 60000,
      },
    ],
  });
  strictEqual(valid.ok, true);

  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "external-state", transition: "set-local-access", device: "device-a", path: "note.md", state: "blocked" }],
    },
    /state is invalid/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "external-state", transition: "advance-device-time", device: "device-a", deltaMs: -1 }],
    },
    /deltaMs must be finite and non-negative/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "external-state", transition: "set-local-access", device: "device-a", state: "unreadable" }],
    },
    /path is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "external-state", transition: "advance-device-time", device: "device-a" }],
    },
    /deltaMs is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "external-state", transition: "advance-device-time", device: "device-a", deltaMs: Number.POSITIVE_INFINITY }],
    },
    /deltaMs must be finite and non-negative/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "external-state", transition: "advance-device-time", device: "device-a", deltaMs: 1, arbitrary: true }],
    },
    /unsupported field 'arbitrary'/,
  );
});

test("generic crash-boundary controls validate narrowly", () => {
  for (const boundary of ["before-remote-dispatch", "after-remote-effect", "before-canonical-state-write", "after-canonical-state-write"] as const) {
    const valid = validateScenarioDefinition({
      ...representative,
      id: `crash-${boundary}`,
      steps: [{ id: "crash", kind: "external-state", transition: "inject-crash-boundary", device: "device-a", boundary }],
    });
    strictEqual(valid.ok, true);
  }
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "external-state", transition: "inject-crash-boundary", device: "device-a", boundary: "somewhere-else" }] },
    /boundary is invalid/,
  );
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "external-state", transition: "inject-crash-boundary", boundary: "before-remote-dispatch" }] },
    /device is required/,
  );
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "external-state", transition: "inject-crash-boundary", device: "device-a", boundary: "before-remote-dispatch", arbitrary: true }] },
    /unsupported field 'arbitrary'/,
  );
});

test("generic empty-folder fixtures validate narrowly", () => {
  const valid = validateScenarioDefinition({
    ...representative,
    id: "generic-empty-folders",
    steps: [
      { id: "local-folder", kind: "fixture", operation: "put-local-folder", device: "device-a", path: "empty-local" },
      { id: "remote-folder", kind: "fixture", operation: "put-remote-folder", path: "empty-remote" },
    ],
  });
  strictEqual(valid.ok, true);

  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "fixture", operation: "put-local-folder", path: "empty-local" }] },
    /device is required/,
  );
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "fixture", operation: "put-remote-folder" }] },
    /path is required/,
  );
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "fixture", operation: "put-local-folder", device: "device-a", path: "empty-local", content: { encoding: "utf8", value: "marker" } }] },
    /unsupported field 'content'/,
  );
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "fixture", operation: "put-remote-folder", path: "empty-remote", device: "device-a" }] },
    /unsupported field 'device'/,
  );
});

test("generic remote move fixture validates narrowly", () => {
  const valid = validateScenarioDefinition({
    ...representative,
    id: "generic-remote-move",
    steps: [{
      id: "move-remote",
      kind: "fixture",
      operation: "move-remote",
      fromPath: "before/note.md",
      toPath: "after/note.md",
    }],
  });
  strictEqual(valid.ok, true);

  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "fixture", operation: "move-remote", toPath: "after.md" }],
    },
    /fromPath is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "fixture", operation: "move-remote", fromPath: "before.md" }],
    },
    /toPath is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "fixture", operation: "move-remote", fromPath: "before.md", toPath: "after.md", device: "device-a" }],
    },
    /unsupported field 'device'/,
  );
});

test("each capability family requires its essential fields", () => {
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "fixture", operation: "put-local-file", path: "x", content: { encoding: "utf8", value: "x" } }],
    },
    /device is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "production", device: "device-a", operation: "execute-reviewed-plan" }],
    },
    /inputRef is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "external-state", transition: "inject-remote-mutation-fault", operation: "create", effect: "not-applied" }],
    },
    /classification is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "checkpoint", operation: "capture" }],
    },
    /checkpointId is required/,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "observe", subject: "local-entry", captureAs: "local" }],
    },
    /device is required.*path is required/s,
  );
  assertInvalid(
    {
      ...representative,
      steps: [{ id: "x", kind: "assert", assertion: "status", observationRef: "result" }],
    },
    /expectedStatus is required/,
  );
});

test("unknown step kinds and operations cannot silently become no-op scenarios", () => {
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "future-magic" }] },
    /unsupported step/,
  );
  assertInvalid(
    { ...representative, steps: [{ id: "x", kind: "fixture", operation: "teleport" }] },
    /unsupported step/,
  );
});

test("declared ordering and explicit execution modes are preserved", () => {
  const parsed = validateScenarioDefinition(representative);
  strictEqual(parsed.ok, true);
  if (!parsed.ok) return;
  deepStrictEqual(
    parsed.value.steps.map(step => step.id),
    ["fixture-local", "preview", "fault", "checkpoint", "observe", "assert"],
  );
  deepStrictEqual(parsed.value.executionModes, ["deterministic", "live"]);
  assertInvalid(
    { ...representative, executionModes: ["deterministic", "deterministic"] },
    /must not contain duplicates/,
  );
});

test("expected blocking or failure conditions require an explicit classification", () => {
  assertInvalid(
    {
      ...representative,
      steps: [
        {
          id: "preview",
          kind: "production",
          device: "device-a",
          operation: "preview",
          expect: { status: "blocked" },
        },
      ],
    },
    /blocked requires classification/,
  );
});

test("runtime validation rejects executable callbacks and unsupported fields", () => {
  assertInvalid(
    {
      ...representative,
      steps: [
        {
          id: "callback",
          kind: "production",
          device: "device-a",
          operation: "preview",
          callback: () => undefined,
        },
      ],
    },
    /unsupported field 'callback'/,
  );
  throws(
    () => defineScenario({ ...representative, id: "" }),
    /invalid scenario definition/,
  );
});
