/**
 * S09-BR02 PHX-CI-only *nonphysical* two-publication contract probe.
 * It NEVER invokes a device, a BVP live battery, or a product action.
 * It is not a verifier: only the pinned PHX-CI may determine/report PASS.
 *
 * Usage (as the second command of an actual PHX-CI focused stage, after
 * npm run test:bvp-root has compiled the file):
 *   node .test-build/bvp/test-platform/test/batteries/phxci-transport-probe.js checkpoint
 *   node .test-build/bvp/test-platform/test/batteries/phxci-transport-probe.js continue
 *      --source-commit SHA --prior-commit SHA
 *      --prior-path dev/test-results/ACTUAL-REPORT.json --prior-run-id GUID
 *
 * It outputs synthetic valid BVP checkpoint/result fixture bytes solely via
 * the existing versioned bridge framing into PHX-CI-captured stdout.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  createScenarioCheckpoint, encodeScenarioCheckpoint, scenarioDefinitionDigest,
} from "../../src/scenario/scenario-checkpoint";
import { defineScenario } from "../../src/scenario/scenario-contract";
import {
  encodeBridgeAttempt, loadPublishedBridgeAttempt,
  type BridgeAttempt, type BridgeExpectation, type GitEvidencePort,
} from "./phxci-physical-bridge";

const SHA = /^[0-9a-f]{40}$/i;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEVICE_IDS = { windows: "device:synthetic-br02-only" };
const RUN_ID = "br02-nonphysical-publication-probe";
const BATTERY = "s09a-windows-initial-sync";
const ARTIFACT_SHA = "1".repeat(64); // synthetic fixture, NOT an installed artifact
const SCENARIO = defineScenario({
  id: "br02-phxci-synthetic-checkpoint",
  description: "Nonphysical transport only: no device, account or vault",
  executionModes: ["live"],
  traceability: { targets: [{ kind: "requirement", id: "BVP-EVID-005" }] },
  steps: [
    { id: "human-step", kind: "checkpoint", operation: "capture", checkpointId: "synthetic-human" },
    { id: "observe", kind: "observe", device: "windows", subject: "device-state", captureAs: "after" },
  ],
});
const SCENARIO_SHA = scenarioDefinitionDigest(SCENARIO);

function block(reason: string): never {
  throw new Error("br02-probe-" + reason);
}
function commandGit(...args: string[]): string {
  const r = spawnSync("git", [...args], {
    encoding: "utf8", timeout: 15000, windowsHide: true, maxBuffer: 3 * 1024 * 1024,
  });
  if (r.error || r.status !== 0 || typeof r.stdout !== "string") block("immutable-git-read-failure");
  return r.stdout.trimEnd();
}
function option(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index > 1 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) block("missing-" + name.slice(2));
  return value;
}
function stageIdentity(): { runId: string; sourceHead: string } {
  if (!process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL) block("PHX-CI-context-required");
  const run = JSON.parse(readFileSync(join(".phx-ci", "run.json"), "utf8"));
  const typecheck = JSON.parse(readFileSync(join(".phx-ci", "records", "typecheck.json"), "utf8"));
  if (!GUID.test(run.runId) || typecheck.runId !== run.runId ||
      typecheck.exitCode !== 0 || typecheck.result !== "PASS") {
    block("PHX-CI-recorded-preconditions-required");
  }
  const sourceHead = commandGit("rev-parse", "HEAD");
  if (!SHA.test(sourceHead)) block("source-head-invalid");
  return { runId: run.runId as string, sourceHead };
}
function fixtureResult(sourceSha: string, status: "blocked" | "completed"): string {
  return JSON.stringify({
    battery: { name: BATTERY },
    result: {
      scenarioId: SCENARIO.id, status,
      classification: status === "blocked" ? "human-checkpoint-required" : undefined,
      steps: [],
      evidence: { machine: {
        schemaVersion: 1, scenarioId: SCENARIO.id, executionMode: "live",
        deviceIdentities: [DEVICE_IDS.windows],
        liveIdentity: { runId: RUN_ID, sourceCommit: sourceSha },
        verdict: { status },
      } },
    },
  });
}
function syntheticCheckpoint(sourceSha: string): string {
  const built = createScenarioCheckpoint({
    checkpointId: "synthetic-human", scenario: SCENARIO,
    runId: RUN_ID, executionMode: "live", sourceIdentity: sourceSha,
    nextStepIndex: 1, disposition: "awaiting-resume",
    deviceIdentities: [DEVICE_IDS.windows],
    requiredResumeEvidence: ["human-confirmation"],
    steps: [{
      index: 0, stepId: "human-step", kind: "checkpoint",
      status: "blocked", classification: "human-checkpoint-required",
      matchedExpectation: false,
    }],
  });
  if (!built.ok) block("fixture-checkpoint-invalid");
  return encodeScenarioCheckpoint(built.value);
}
function expectation(sourceSha: string, runId: string): BridgeExpectation {
  return {
    bvpRunId: RUN_ID, phxRunId: runId,
    attemptIndex: 1, battery: BATTERY, scenarioId: SCENARIO.id,
    scenarioDigest: SCENARIO_SHA, sourceCommit: sourceSha,
    artifactSha256: ARTIFACT_SHA, deviceIds: DEVICE_IDS, mode: "initial",
  };
}
function immutableGit(): GitEvidencePort {
  return {
    async readBlobAtCommit(commitSha, path) {
      return commandGit("show", commitSha + ":" + path);
    },
    async isAncestor(ancestor, descendant) {
      if (!SHA.test(ancestor) || !SHA.test(descendant)) block("ancestor-invalid");
      const r = spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
        encoding: "utf8", timeout: 15000, windowsHide: true,
      });
      if (r.error || r.status === null || ![0, 1].includes(r.status)) block("ancestry-check-failed");
      return r.status === 0;
    },
    async changedPaths(a, b) {
      if (!SHA.test(a) || !SHA.test(b)) block("diff-sha-invalid");
      const s = commandGit("diff", "--name-only", a, b);
      return s ? s.split(/\r?\n/) : [];
    },
  };
}
async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== "checkpoint" && mode !== "continue") block("unsupported-mode");
  const { runId: phxRunId, sourceHead } = stageIdentity();
  if (mode === "checkpoint") {
    // Source is read from the exact PHX-CI verified Git checkout itself.
    const attempt: BridgeAttempt = {
      ...expectation(sourceHead, phxRunId),
      schemaVersion: 1, exitCode: 3,
      resultJson: fixtureResult(sourceHead, "blocked"),
      checkpointJson: syntheticCheckpoint(sourceHead),
    };
    process.stdout.write(encodeBridgeAttempt(attempt));
    process.exitCode = 3; // Intentional PHX-CI BLOCKED; never invent PASS.
    return;
  }
  // Second run MUST be at an evidence-only descendant, not a changed SUT.
  const sourceSha = option("--source-commit");
  const priorCommit = option("--prior-commit");
  const priorPath = option("--prior-path");
  const priorRunId = option("--prior-run-id");
  if (!SHA.test(sourceSha) || !SHA.test(priorCommit) || !GUID.test(priorRunId) ||
      phxRunId === priorRunId) block("continuation-identities-invalid");
  const earlier = await loadPublishedBridgeAttempt(immutableGit(), {
    commitSha: priorCommit, historyPath: priorPath, currentHead: sourceHead,
  }, expectation(sourceSha, priorRunId));
  if (earlier.exitCode !== 3 || !earlier.checkpointJson ||
      earlier.checkpointJson !== syntheticCheckpoint(sourceSha)) {
    block("prior-checkpoint-not-published-or-not-equal");
  }
  const attempt: BridgeAttempt = {
    ...expectation(sourceSha, phxRunId),
    schemaVersion: 1, mode: "checkpoint-resume",
    attemptIndex: 2,
    predecessor: {
      commitSha: priorCommit, historyPath: priorPath,
      phxRunId: priorRunId, attemptIndex: 1,
    },
    exitCode: 0, resultJson: fixtureResult(sourceSha, "completed"),
  };
  process.stdout.write(encodeBridgeAttempt(attempt));
  process.exitCode = 0; // PHX-CI alone determines if the complete run passes.
}
main().catch(error => {
  // Deliberately no message/stack from untrusted evidence files in logs.
  const classification = error instanceof Error && /^br02-probe-[A-Za-z0-9-]+$/.test(error.message)
    ? error.message : "br02-probe-evidence-or-context-invalid";
  process.stderr.write("BR02_TRANSPORT_PROBE_BLOCKED " + classification + "\n");
  process.exitCode = 1;
});
