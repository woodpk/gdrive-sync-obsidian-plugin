/**
 * DEC351 test-only Node --require preload. Never imported by the public CLI.
 * A hardcoded in-process fixture introduces real deterministic runner outcomes
 * while keeping the 70-item production catalog and CLI argv contract unchanged.
 * The env mode is read ONLY by this preloaded test file, not by BVP itself.
 */
import { writeFileSync } from "node:fs";
import { freshLocalOnlyScenario } from "../../scenarios/06a/fresh-local-only";
import { DeterministicScenarioRunner } from "../../src/scenario/scenario-runner";

const mode = process.env.BVP_DEC351_TEST_CASE;
const marker = process.env.BVP_DEC351_TEST_DISPATCH_MARKER;

if (marker) {
  const execute = DeterministicScenarioRunner.prototype.run;
  DeterministicScenarioRunner.prototype.run = function (scenario) {
    writeFileSync(marker, "runner-invoked", { flag: "wx" });
    return execute.call(this, scenario);
  };
}
if (mode === "failed") {
  // Intentionally WRONG assertion: the seeded file has exactly three bytes.
  const step = freshLocalOnlyScenario.steps.find(x => x.id === "assert-size");
  if (!step || step.kind !== "assert" || step.assertion !== "field-equals")
    throw new Error("DEC351 test fixture drift: failed oracle");
  (step as { expected: unknown }).expected = 4;
} else if (mode === "blocked") {
  // The canonical runner must report an actual missing captured production plan.
  const step = freshLocalOnlyScenario.steps.find(x => x.id === "execute");
  if (!step || step.kind !== "production" || step.operation !== "execute-reviewed-plan")
    throw new Error("DEC351 test fixture drift: blocked outcome");
  (step as { inputRef: string }).inputRef = "never-captured";
} else if (mode === "unsupported") {
  // Unsupported preview inputRef is a genuine canonical deterministic outcome.
  const step = freshLocalOnlyScenario.steps.find(x => x.id === "preview");
  if (!step || step.kind !== "production" || step.operation !== "preview")
    throw new Error("DEC351 test fixture drift: unsupported outcome");
  (step as { inputRef?: string }).inputRef = "never-captured";
}
