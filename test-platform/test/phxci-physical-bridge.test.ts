/**
 * S09-BR01 initial TDD RED suite — requirements before implementation.
 *
 * Requirements: DEC-345; WS-07 fixed-PHX-CI consumer bridge §§3–9;
 * BVP-VER-002/004, BVP-RUN-003/004, BVP-LIVE-003/006, BVP-EVID-004/005.
 *
 * Only PHX-CI may execute these tests. A missing adapter at this commit is
 * intentional RED, not failed feature qualification or physical authorization.
 * S09-BR02 will add adversarial and actual two-invocation PHX-CI integration proof.
 */
import { deepStrictEqual, doesNotMatch, match, rejects, strictEqual, throws } from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { createScenarioCheckpoint, encodeScenarioCheckpoint, scenarioDefinitionDigest } from "../src/scenario/scenario-checkpoint";
import { defineScenario } from "../src/scenario/scenario-contract";
import {
  buildLiveRunnerArguments,
  decodeBridgeAttempt,
  encodeBridgeAttempt,
  loadPublishedBridgeAttempt,
  type BridgeAttempt,
  type BridgeExpectation,
  type GitEvidencePort,
} from "./batteries/phxci-physical-bridge";

const sourceCommit = "a".repeat(40);
const priorCommit = "b".repeat(40);
const currentCommit = "c".repeat(40);
const artifactSha256 = "d".repeat(64);
const deviceIds = { windows: "device:fixture-windows" };
const logicalRunId = "bvp-tdd-bridge-example";
const firstPhxRunId = "6149253b-e638-4a84-ad22-032a7785b3ba";
const secondPhxRunId = "a1f626d9-e87f-4cd2-b27e-f3e2e1e82a0e";
const batteryName = "s09a-windows-initial-sync";
const evidencePath = "dev/test-results/20261020T153900Z-bvp-physical-test-aabbccddeeff.json";
const scenario = defineScenario({
  id: "phxci-tdd-human-checkpoint",
  description: "TDD fixture: PHX-CI must not accept incomplete BVP physical execution",
  traceability: { targets: [{ kind: "requirement", id: "BVP-LIVE-006" }] },
  executionModes: ["live"],
  steps: [
    { id: "owner-action", kind: "checkpoint", operation: "capture", checkpointId: "owner-action" },
    { id: "observe-after-human", kind: "observe", subject: "device-state", device: "windows", captureAs: "after" },
  ],
});
const scenarioDigest = scenarioDefinitionDigest(scenario);

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
function checkpoint(): string {
  const created = createScenarioCheckpoint({
    checkpointId: "owner-action",
    scenario,
    runId: logicalRunId,
    executionMode: "live",
    nextStepIndex: 1,
    disposition: "awaiting-resume",
    steps: [{
      index: 0,
      stepId: "owner-action",
      kind: "checkpoint",
      status: "blocked",
      classification: "human-checkpoint-required",
      matchedExpectation: false,
    }],
    deviceIdentities: [deviceIds.windows],
    requiredResumeEvidence: ["human-confirmation"],
    sourceIdentity: sourceCommit,
  });
  if (!created.ok) throw new Error("invalid pre-build test checkpoint: " + created.classification);
  return encodeScenarioCheckpoint(created.value);
}
function rawResult(status: "completed" | "blocked" | "failed"): string {
  return JSON.stringify({
    battery: { name: batteryName },
    result: {
      scenarioId: scenario.id,
      status,
      ...(status === "blocked" ? { classification: "human-checkpoint-required" } : {}),
      steps: [],
      evidence: { machine: {
        schemaVersion: 1, scenarioId: scenario.id, executionMode: "live",
        deviceIdentities: [deviceIds.windows],
        liveIdentity: { runId: logicalRunId, sourceCommit },
        verdict: { status },
      } },
    },
  });
}
function initial(exitCode: 0 | 1 | 3 = 3): BridgeAttempt {
  return {
    schemaVersion: 1,
    mode: "initial",
    bvpRunId: logicalRunId,
    phxRunId: firstPhxRunId,
    attemptIndex: 1,
    battery: batteryName,
    scenarioId: scenario.id,
    scenarioDigest,
    sourceCommit,
    artifactSha256,
    deviceIds,
    exitCode,
    resultJson: rawResult(exitCode === 0 ? "completed" : exitCode === 3 ? "blocked" : "failed"),
    ...(exitCode === 3 ? { checkpointJson: checkpoint() } : {}),
  };
}
function expected(attempt: BridgeAttempt = initial()): BridgeExpectation {
  return {
    bvpRunId: attempt.bvpRunId,
    phxRunId: attempt.phxRunId,
    attemptIndex: attempt.attemptIndex,
    battery: attempt.battery,
    scenarioId: attempt.scenarioId,
    scenarioDigest: attempt.scenarioDigest,
    sourceCommit: attempt.sourceCommit,
    artifactSha256: attempt.artifactSha256,
    deviceIds: attempt.deviceIds,
    mode: attempt.mode,
    ...(attempt.predecessor ? { predecessor: attempt.predecessor } : {}),
  };
}
function published(attempt = initial()): string {
  return JSON.stringify({
    schemaVersion: "1",
    runId: attempt.phxRunId,
    status: attempt.exitCode === 0 ? "COMPLETE" : "BLOCKED",
    verification: {
      changeSet: { status: attempt.exitCode === 0 ? "PASS" : "FAIL" },
      overall: { status: attempt.exitCode === 0 ? "PASS" : "BLOCKED" },
    },
    repository: { verifiedHead: sourceCommit },
    stages: [{
      name: "test-focused",
      runId: attempt.phxRunId,
      exitCode: attempt.exitCode,
      result: attempt.exitCode === 0 ? "PASS" : "FAIL",
      stdout: "BVP deterministic suite complete\n" + encodeBridgeAttempt(attempt),
      stderr: "",
    }],
  });
}
function gitPort(text: string = published(), paths: readonly string[] = ["dev/_ca-output.md", evidencePath]): GitEvidencePort {
  return {
    async readBlobAtCommit(commitSha, relativePath) {
      strictEqual(commitSha, priorCommit, "must fetch exact immutable evidence commit");
      strictEqual(relativePath, evidencePath, "must fetch actual published evidence file");
      return text;
    },
    async isAncestor(ancestor, descendant) {
      if (ancestor === priorCommit && descendant === currentCommit) return true;
      if (ancestor === sourceCommit && descendant === sourceCommit) return true;
      return false;
    },
    async changedPaths() { return paths; },
  };
}
const publishedRef = {
  commitSha: priorCommit,
  historyPath: evidencePath,
  currentHead: currentCommit,
};

test("TDD-01 nominal: completed BVP attempt round-trips through bounded PHX stdout framing", () => {
  const attempt = initial(0);
  const frame = encodeBridgeAttempt(attempt);
  const recovered = decodeBridgeAttempt("existing focused tests\n" + frame + "normal stage log\n", expected(attempt));
  deepStrictEqual(recovered, attempt);
  match(frame, /BVP.*(?:BRIDGE|ATTEMPT).*V1/i);
  doesNotMatch(frame, /"resultJson"|"checkpointJson"/, "raw JSON must not accidentally escape into logs");
});

test("TDD-02 checkpoint: exit 3 and original v2 BVP checkpoint persist without manufacturing PASS", () => {
  const attempt = initial(3);
  const decoded = decodeBridgeAttempt(encodeBridgeAttempt(attempt), expected(attempt));
  strictEqual(decoded.exitCode, 3);
  strictEqual(decoded.checkpointJson, attempt.checkpointJson);
  strictEqual(sha(decoded.checkpointJson!), sha(checkpoint()));
  strictEqual(JSON.parse(decoded.resultJson).result.status, "blocked");
  throws(() => encodeBridgeAttempt({ ...attempt, exitCode: 0 }), /checkpoint|exit|status|invalid/i);
});

test("TDD-03 boundaries: missing, duplicate, malformed, truncated and altered transport must reject", () => {
  const line = encodeBridgeAttempt(initial());
  for (const stdout of [
    "",
    "unrelated PHX CI stage text",
    line + line,
    line.slice(0, -14),
    line.replace(/[A-Za-z0-9]/, "Z"),
    "BVP-PHXCI-BRIDGE-V1 not-base64-or-json",
  ]) {
    throws(() => decodeBridgeAttempt(stdout, expected()), /bridge|frame|integrity|missing|duplicate|malformed|digest|version/i);
  }
});

test("TDD-04 privacy: secrets and personal note contents cannot enter published PHX stdout", () => {
  const attempt = initial();
  const alteredResult = JSON.stringify({ ...JSON.parse(attempt.resultJson), refreshToken: "sentinel-private-value" });
  throws(() => encodeBridgeAttempt({ ...attempt, resultJson: alteredResult }), /secret|sensitive|private|forbidden|redact/i);
  throws(() => encodeBridgeAttempt({ ...attempt, resultJson: rawResult("blocked") + "PERSONAL_VAULT_NOTE_BODY" }), /privacy|invalid|sensitive|result/i);
  const good = encodeBridgeAttempt(attempt);
  doesNotMatch(good, /refreshToken|sentinel-private-value|PERSONAL_VAULT_NOTE_BODY/);
});

test("TDD-05 identity: source, PHX run, logical run, scenario, artifact and device mismatch fail closed", () => {
  const good = encodeBridgeAttempt(initial());
  const variants: BridgeExpectation[] = [
    { ...expected(), sourceCommit: "f".repeat(40) },
    { ...expected(), phxRunId: secondPhxRunId },
    { ...expected(), bvpRunId: "another-logical-run" },
    { ...expected(), scenarioDigest: "sha256:" + "f".repeat(64) },
    { ...expected(), scenarioId: "another-scenario" },
    { ...expected(), artifactSha256: "f".repeat(64) },
    { ...expected(), deviceIds: { windows: "device:another-windows" } },
  ];
  for (const wrong of variants) {
    throws(() => decodeBridgeAttempt(good, wrong), /identity|source|device|scenario|artifact|context|mismatch/i);
  }
});

test("TDD-06 forbidden states: invalid initial/resume numbering and missing predecessor cannot dispatch", () => {
  const attempt = initial();
  throws(() => encodeBridgeAttempt({ ...attempt, attemptIndex: 2 }), /attempt|predecessor|invalid/i);
  throws(() => encodeBridgeAttempt({ ...attempt, mode: "checkpoint-resume" }), /resume|predecessor|invalid/i);
  throws(() => encodeBridgeAttempt({ ...attempt, mode: "verified-late-receipt", checkpointJson: checkpoint() }), /checkpoint|recovery|exclusive|invalid/i);
});

test("TDD-07 persistence: recover exact checkpoint from immutable published PHX FAILED stage / BLOCKED run", async () => {
  const result = await loadPublishedBridgeAttempt(gitPort(), publishedRef, expected());
  deepStrictEqual(result, initial());
  strictEqual(result.exitCode, 3);
  strictEqual(result.checkpointJson, checkpoint());
});

test("TDD-08 evidence trust: absent, forged, inconsistent or successful predecessor PHX records reject", async () => {
  const baseRecord = JSON.parse(published()) as any;
  const cases = [
    { ...baseRecord, status: "COMPLETE" },
    { ...baseRecord, runId: secondPhxRunId },
    { ...baseRecord, repository: { verifiedHead: "e".repeat(40) } },
    { ...baseRecord, stages: [] },
    { ...baseRecord, stages: [{ ...baseRecord.stages[0], runId: secondPhxRunId }] },
    { ...baseRecord, stages: [{ ...baseRecord.stages[0], exitCode: 0, result: "PASS" }] },
    { ...baseRecord, stages: [{ ...baseRecord.stages[0], stdout: "no BVP evidence" }] },
  ];
  for (const mutated of cases) {
    await rejects(loadPublishedBridgeAttempt(gitPort(JSON.stringify(mutated)), publishedRef, expected()), /evidence|run|stage|status|source|invalid|mismatch|missing|blocked/i);
  }
});

test("TDD-09 changed code, untrusted history paths and broken ancestry block resumed execution", async () => {
  await rejects(loadPublishedBridgeAttempt(gitPort(published(), ["test-platform/test/batteries/run-live-battery.ts"]), publishedRef, expected()), /source|drift|changed|code|evidence/i);
  await rejects(loadPublishedBridgeAttempt(gitPort(), { ...publishedRef, historyPath: "../secrets.json" }, expected()), /path|history|forbidden|relative/i);
  const broken: GitEvidencePort = {
    ...gitPort(),
    async isAncestor() { return false; },
  };
  await rejects(loadPublishedBridgeAttempt(broken, publishedRef, expected()), /ancestor|lineage|commit|evidence/i);
});

test("TDD-10 runner contracts: existing live CLI receives stable BVP ID, approved paths and no extra arguments", () => {
  const args = buildLiveRunnerArguments(initial(), {
    relayRoot: "C:\\temp\\fixture\\relay",
    checkpointFile: "C:\\temp\\fixture\\checkpoint.json",
    resultFile: "C:\\temp\\fixture\\result.json",
  });
  const arg = (name: string) => args[args.indexOf(name) + 1];
  strictEqual(arg("--battery"), batteryName);
  strictEqual(arg("--run-id"), logicalRunId);
  strictEqual(arg("--validation-source-commit"), sourceCommit);
  strictEqual(arg("--checkpoint-file"), "C:\\temp\\fixture\\checkpoint.json");
  strictEqual(arg("--result-file"), "C:\\temp\\fixture\\result.json");
  deepStrictEqual(JSON.parse(arg("--device-map-json")), deviceIds);
  strictEqual(args.includes("--recover-timed-out-result-file"), false);
  strictEqual(args.includes("--resume-evidence-json"), false);
  strictEqual(args.some(x => /Invoke-BVP-Battery|github.actions|git.push/i.test(x)), false);
});

test("TDD-11 replay safety: recovery and human confirmation cannot be mixed", () => {
  const attempt: BridgeAttempt = {
    ...initial(),
    mode: "checkpoint-resume",
    attemptIndex: 2,
    phxRunId: secondPhxRunId,
    predecessor: { commitSha: priorCommit, historyPath: evidencePath, phxRunId: firstPhxRunId, attemptIndex: 1 },
  };
  const paths = {
    relayRoot: "C:\\temp\\fixture\\relay",
    checkpointFile: "C:\\temp\\fixture\\checkpoint.json",
    resultFile: "C:\\temp\\fixture\\result.json",
    previousResultFile: "C:\\temp\\fixture\\previous-result.json",
  };
  throws(() => buildLiveRunnerArguments(attempt, paths, ["human-confirmation"], true), /exclusive|recovery|checkpoint|resume/i);
  const args = buildLiveRunnerArguments(attempt, paths, ["human-confirmation"]);
  strictEqual(args.includes("--resume-evidence-json"), true);
  strictEqual(args.includes("--recover-timed-out-result-file"), false);
});

test("TDD-12 end-to-end proof boundary: reconstituted checkpoint cannot by itself certify completion", async () => {
  const recovered = await loadPublishedBridgeAttempt(gitPort(), publishedRef, expected());
  strictEqual(recovered.exitCode, 3);
  strictEqual(JSON.parse(recovered.resultJson).result.status, "blocked");
  const next = {
    ...recovered,
    mode: "checkpoint-resume" as const,
    attemptIndex: 2,
    phxRunId: secondPhxRunId,
    predecessor: { commitSha: priorCommit, historyPath: evidencePath, phxRunId: firstPhxRunId, attemptIndex: 1 },
  };
  const accepted = encodeBridgeAttempt({
    ...next,
    exitCode: 0,
    checkpointJson: undefined,
    resultJson: rawResult("completed"),
  });
  const decoded = decodeBridgeAttempt(accepted, expected({
    ...next, exitCode: 0, checkpointJson: undefined, resultJson: rawResult("completed"),
  }));
  strictEqual(decoded.phxRunId, secondPhxRunId);
  strictEqual(decoded.bvpRunId, logicalRunId);
  strictEqual(decoded.exitCode, 0);
  strictEqual(recovered.exitCode, 3, "the immutable original BLOCKED run remains BLOCKED");
});
