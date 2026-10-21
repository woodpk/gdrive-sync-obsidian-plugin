/**
 * WS-07/S09-BR02 — requirements-derived adversarial test authorship.
 *
 * Ten-family traceability:
 * 01 nominal success                 BR-001 / BVP-VER-002
 * 02 malformed, truncation, bounds   BR-005 / BVP-EVID-004
 * 03 permitted/forbidden states      BR-004 / BVP-RUN-004
 * 04 retry, duplicate, idempotence   BR-006 / BVP-RUN-003
 * 05 concurrency/order/staleness     BR-006 / BVP-RUN-004
 * 06 immutable persistence/restart   BR-003 / BVP-EVID-005
 * 07 identity/security/trust         BR-004 / BVP-LIVE-003
 * 08 PHX-CI integration contract     DEC-345 / BVP-VER-002
 * 09 ownership/frozen architecture   DEC-345 / BVP-VER-004
 * 10 end-to-end safety/fail-closed   BR-009 / BVP-LIVE-006
 *
 * The Git evidence port below simulates PHX-CI-published IMMUTABLE objects.
 * These executable tests run ONLY as a subordinate of real PHX-CI.
 * Passing them is NOT proof that two PHX-CI invocations actually published
 * checkpoint/resume payloads in the fixed runtime. That remains a gate.
 */
import { deepStrictEqual, doesNotMatch, match, rejects, strictEqual, throws } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { createScenarioCheckpoint, encodeScenarioCheckpoint, scenarioDefinitionDigest } from "../src/scenario/scenario-checkpoint";
import { defineScenario } from "../src/scenario/scenario-contract";
import {
  buildLiveRunnerArguments, decodeBridgeAttempt, encodeBridgeAttempt,
  loadPublishedBridgeAttempt,
  type BridgeAttempt, type BridgeExpectation, type GitEvidencePort,
  type PublishedAttemptRef,
} from "./batteries/phxci-physical-bridge";

const src = "a".repeat(40), evidence1 = "b".repeat(40), head1 = "c".repeat(40);
const evidence2 = "d".repeat(40), head2 = "e".repeat(40), extra = "f".repeat(40);
const run1 = "132cda51-eaa4-4fcb-8871-124c4bbbf6f0";
const run2 = "743b11bc-c244-44b4-83dd-1b583373f759";
const artifact = "9".repeat(64);
const id = "bridge-adversarial-run";
const battery = "s09a-windows-initial-sync";
const deviceIds = { windows: "device:isolated-windows" };
const path1 = "dev/test-results/20261020T130000Z-physical-battery-run1.json";
const path2 = "dev/test-results/20261020T140000Z-physical-battery-run2.json";
const scenario = defineScenario({
  id: "s09-br02-checkpoint",
  description: "S09 BR02 nonphysical checkpoint/resume transport model",
  traceability: { targets: [{ kind: "requirement", id: "BVP-LIVE-006" }] },
  executionModes: ["live"],
  steps: [
    { id: "human", kind: "checkpoint", operation: "capture", checkpointId: "human" },
    { id: "after", kind: "observe", subject: "device-state", device: "windows", captureAs: "after" },
  ],
});
const digest = scenarioDefinitionDigest(scenario);

function checkpoint(): string {
  const value = createScenarioCheckpoint({
    scenario, checkpointId: "human", runId: id, executionMode: "live",
    sourceIdentity: src, deviceIdentities: [deviceIds.windows],
    nextStepIndex: 1, disposition: "awaiting-resume",
    requiredResumeEvidence: ["human-confirmation"],
    steps: [{ index: 0, stepId: "human", kind: "checkpoint", status: "blocked",
      classification: "human-checkpoint-required", matchedExpectation: false }],
  });
  if (!value.ok) throw new Error("fixture checkpoint: " + value.classification);
  return encodeScenarioCheckpoint(value.value);
}
function result(status: "blocked" | "completed" | "failed", machine = status): string {
  return JSON.stringify({
    battery: { name: battery },
    result: {
      scenarioId: scenario.id, status, steps: [],
      evidence: { machine: {
        schemaVersion: 1, scenarioId: scenario.id, executionMode: "live",
        deviceIdentities: [deviceIds.windows],
        liveIdentity: { runId: id, sourceCommit: src },
        verdict: { status: machine },
      } },
    },
  });
}
function first(): BridgeAttempt {
  return {
    schemaVersion: 1, mode: "initial",
    bvpRunId: id, phxRunId: run1, attemptIndex: 1,
    battery, scenarioId: scenario.id, scenarioDigest: digest,
    sourceCommit: src, artifactSha256: artifact, deviceIds,
    exitCode: 3, checkpointJson: checkpoint(), resultJson: result("blocked"),
  };
}
function second(): BridgeAttempt {
  return {
    ...first(), mode: "checkpoint-resume", attemptIndex: 2, phxRunId: run2,
    predecessor: { commitSha: evidence1, historyPath: path1, phxRunId: run1, attemptIndex: 1 },
    exitCode: 0, checkpointJson: undefined, resultJson: result("completed"),
  };
}
function expectAttempt(a: BridgeAttempt): BridgeExpectation {
  const { schemaVersion: _version, exitCode: _code, checkpointJson: _cp, resultJson: _result, ...identity } = a;
  return identity;
}
function phxRecord(a: BridgeAttempt): Record<string, any> {
  const success = a.exitCode === 0;
  return {
    schemaVersion: "1",
    frameworkVersion: "0.2.0-dev.2",
    runId: a.phxRunId, status: success ? "COMPLETE" : "BLOCKED",
    verification: {
      changeSet: { stage: "test-focused", status: success ? "PASS" : "FAIL", exitCode: a.exitCode },
      repository: { stage: "test", status: "PASS", exitCode: 0 },
      overall: { status: success ? "PASS" : "BLOCKED" },
    },
    repository: { verifiedHead: src, expectedHead: src },
    stages: [
      { name: "preflight", runId: a.phxRunId, result: "PASS", exitCode: 0, stdout: "" },
      { name: "test-focused", runId: a.phxRunId, result: success ? "PASS" : "FAIL",
        exitCode: a.exitCode, stdout: "prior deterministic suite PASS\n" + encodeBridgeAttempt(a), stderr: "" },
      { name: "test", runId: a.phxRunId, result: "PASS", exitCode: 0, stdout: "" },
    ],
  };
}
function json(value: unknown): string { return JSON.stringify(value); }
const ref1: PublishedAttemptRef = { commitSha: evidence1, historyPath: path1, currentHead: head1 };
const ref2: PublishedAttemptRef = { commitSha: evidence2, historyPath: path2, currentHead: head2 };
function port(contents: Record<string, string> = {
  [evidence1 + ":" + path1]: json(phxRecord(first())),
  [evidence2 + ":" + path2]: json(phxRecord(second())),
}, opts: {
  readonly ancestry?: (a: string, b: string) => boolean;
  readonly changed?: (a: string, b: string) => readonly string[];
} = {}): GitEvidencePort {
  return {
    async readBlobAtCommit(commit, path) {
      const data = contents[commit + ":" + path];
      if (data === undefined) throw new Error("immutable-evidence-not-found");
      return data;
    },
    async isAncestor(a, b) {
      return opts.ancestry ? opts.ancestry(a, b) :
        (a === evidence1 && b === head1) ||
        (a === evidence2 && b === head2) ||
        (a === src && (b === src || b === head1 || b === head2));
    },
    async changedPaths(a, b) {
      return opts.changed ? opts.changed(a, b) :
        ["dev/_ca-output.md", path1, path2];
    },
  };
}

test("BR02-F01/F06/F10: two simulated immutable PHX attempts preserve BLOCKED original and later PASS", async () => {
  const git = port();
  const original = await loadPublishedBridgeAttempt(git, ref1, expectAttempt(first()));
  const continuation = await loadPublishedBridgeAttempt(git, ref2, expectAttempt(second()));
  strictEqual(original.exitCode, 3);
  strictEqual(continuation.exitCode, 0);
  strictEqual(original.phxRunId, run1);
  strictEqual(continuation.phxRunId, run2);
  strictEqual(original.bvpRunId, continuation.bvpRunId);
  strictEqual(original.checkpointJson, checkpoint());
  strictEqual(JSON.parse(original.resultJson).result.status, "blocked");
  strictEqual(JSON.parse(continuation.resultJson).result.status, "completed");
  strictEqual(continuation.predecessor?.commitSha, evidence1);
  strictEqual(continuation.predecessor?.phxRunId, run1);
});

test("BR02-F07/F08: a forged PASS verification dimension cannot certify a blocked attempt", async () => {
  const spoofed = phxRecord(first());
  spoofed.verification.changeSet.status = "PASS";
  await rejects(
    loadPublishedBridgeAttempt(port({ [evidence1 + ":" + path1]: json(spoofed) }), ref1, expectAttempt(first())),
    /publication|verification|change.set|status|mismatch|inconsistent/i,
  );
});

test("BR02-F07/F08/F10: completed attempt cannot claim PHX overall PASS while repository check is FAIL", async () => {
  const spoofed = phxRecord(second());
  spoofed.verification.repository.status = "FAIL";
  await rejects(
    loadPublishedBridgeAttempt(port({ [evidence2 + ":" + path2]: json(spoofed) }), ref2, expectAttempt(second())),
    /publication|verification|repository|status|mismatch|inconsistent/i,
  );
});

test("BR02-F02/F08: PHX evidence schema version must remain exactly supported", async () => {
  const spoofed = phxRecord(first());
  spoofed.schemaVersion = "999";
  await rejects(
    loadPublishedBridgeAttempt(port({ [evidence1 + ":" + path1]: json(spoofed) }), ref1, expectAttempt(first())),
    /publication|schema|version|unsupported|invalid/i,
  );
});

test("BR02-F03/F07: a runner-result success and BVP machine verdict contradiction is rejected", () => {
  const contradicting = { ...second(), resultJson: result("completed", "failed") };
  throws(() => encodeBridgeAttempt(contradicting), /result|verdict|status|mismatch|invalid/i);
});

test("BR02-F02/F07: unrelated arbitrary result metadata is not permitted to exfiltrate fixture content", () => {
  const payload = JSON.parse(first().resultJson);
  payload.discussion = "ordinary narrative passage from a non-disposable personal vault";
  throws(
    () => encodeBridgeAttempt({ ...first(), resultJson: json(payload) }),
    /result|allowlist|privacy|unexpected|forbidden|field/i,
  );
});

test("BR02-F02/F07: tokens, credentials, passphrases and vault bodies never enter PHX stdout", () => {
  const variants: readonly [string, string][] = [
    ["authorizationCode", "BRAIN_PRIVATE_CODE"],
    ["apiKey", "BRAIN_PRIVATE_KEY"],
    ["refreshToken", "BRAIN_PRIVATE_REFRESH"],
    ["passcode", "1234"],
    ["vaultContent", "fixture private note"],
  ];
  for (const [key, value] of variants) {
    const r = JSON.parse(first().resultJson);
    r.result.evidence.machine[key] = value;
    throws(() => encodeBridgeAttempt({ ...first(), resultJson: json(r) }), /private|sensitive|credential|result|forbidden/i, key);
  }
});

test("BR02-F02/F07: oversize payloads and recursively deep JSON fail closed", () => {
  const original = first();
  throws(
    () => encodeBridgeAttempt({ ...original, resultJson: result("blocked") + "x".repeat(60 * 1024) }),
    /oversize|invalid|result/i,
  );
  const deep = JSON.parse(original.resultJson);
  let part = deep.result.evidence.machine as Record<string, unknown>;
  for (let n = 0; n < 30; n++) { part.nested = {}; part = part.nested as Record<string, unknown>; }
  throws(() => encodeBridgeAttempt({ ...original, resultJson: json(deep) }), /depth|invalid|privacy|result/i);
});

test("BR02-F02/F05/F07: duplicate, stale or badly framed stdout cannot be recovered", () => {
  const line = encodeBridgeAttempt(first());
  const alterations = [
    line + line, line.slice(0, -5), "untrusted stage output",
    "BVP-PHXCI-BRIDGE-V2 a b\n",
    line.replace("BVP-PHXCI-BRIDGE-V1", "BVP-PHXCI-BRIDGE-V9"),
    line + "BVP-PHXCI-BRIDGE-V1 bad-material bad-digest\n",
  ];
  for (const out of alterations) {
    throws(() => decodeBridgeAttempt(out, expectAttempt(first())), /bridge|frame|invalid|malformed|missing|duplicate|digest/i);
  }
  throws(() => decodeBridgeAttempt(line, { ...expectAttempt(first()), phxRunId: run2 }), /identity|run|mismatch/i);
});

test("BR02-F05/F06/F07: unrelated Git branch ancestry blocks immutable recovery", async () => {
  await rejects(
    loadPublishedBridgeAttempt(port(undefined, { ancestry: () => false }), ref1, expectAttempt(first())),
    /ancestor|lineage|publication|commit/i,
  );
  await rejects(
    loadPublishedBridgeAttempt(port(undefined, {
      changed: () => ["dev/_ca-output.md", "src/product/runtime.ts"],
    }), ref1, expectAttempt(first())),
    /drift|source|publication/i,
  );
});

test("BR02-F04/F05: previously used identity, stale predecessor and attempt-order inconsistencies reject", () => {
  const original = second();
  const variants = [
    { ...original, phxRunId: run1 },
    { ...original, attemptIndex: 1 },
    { ...original, attemptIndex: 4 },
    { ...original, predecessor: { ...original.predecessor!, phxRunId: run2 } },
    { ...original, predecessor: { ...original.predecessor!, attemptIndex: 5 } },
  ];
  for (const attempt of variants) throws(() => encodeBridgeAttempt(attempt), /attempt|chain|predecessor|run/i);
});

test("BR02-F04/F10: human checkpoint continuation and late-receipt recovery cannot mix", () => {
  const resume = second();
  const paths = {
    relayRoot: "C:\\temp\\abcdef0123456789abcdef0123456789\\relay",
    checkpointFile: "C:\\temp\\abcdef0123456789abcdef0123456789\\checkpoint.json",
    resultFile: "C:\\temp\\abcdef0123456789abcdef0123456789\\result.json",
    previousResultFile: "C:\\temp\\abcdef0123456789abcdef0123456789\\prior.json",
  };
  const resumeArgs = buildLiveRunnerArguments(resume, paths, ["human-confirmation", "external-observation"]);
  strictEqual(resumeArgs.includes("--resume-evidence-json"), true);
  strictEqual(resumeArgs.includes("--recover-timed-out-result-file"), false);
  const recovery: BridgeAttempt = {
    ...resume, mode: "verified-late-receipt", exitCode: 1,
    resultJson: result("blocked"),
  };
  const lateArgs = buildLiveRunnerArguments(recovery, paths, [], true);
  strictEqual(lateArgs.includes("--resume-evidence-json"), false);
  strictEqual(lateArgs.includes("--recover-timed-out-result-file"), true);
  throws(() => buildLiveRunnerArguments(recovery, paths, ["human-confirmation"], true), /exclusive|resume|recovery/i);
  throws(() => buildLiveRunnerArguments(resume, paths, [], true), /exclusive|resume|recovery/i);
});

test("BR02-F09/F10: stand-alone adapter without PHX request cannot launch live battery", () => {
  const compiled = join(__dirname, "batteries", "phxci-physical-bridge.js");
  strictEqual(existsSync(compiled), true, "PHX-CI focused stage must first compile BVP tests");
  const child = spawnSync(process.execPath, [compiled], {
    cwd: resolve(__dirname, "../../../.."),
    encoding: "utf8", timeout: 10_000, windowsHide: true,
    env: { ...process.env, BVP_OWNER_PHYSICAL_APPROVAL: "" },
  });
  strictEqual(child.status, 1);
  match((child.stderr || "") + (child.stdout || ""), /BVP_PHXCI_BRIDGE_BLOCKED.*bridge-request-file-required/i);
  doesNotMatch((child.stderr || "") + (child.stdout || ""), /https:\/\/|token=[^ ]+|private key/i);
});

test("BR02-F07/F09: immutable evidence validation never writes a result or makes a Git mutation", async () => {
  const calls: string[] = [];
  const original = port();
  const observe: GitEvidencePort = {
    async readBlobAtCommit(commit, p) { calls.push("read"); return original.readBlobAtCommit(commit, p); },
    async isAncestor(a, b) { calls.push("ancestor"); return original.isAncestor(a, b); },
    async changedPaths(a, b) { calls.push("diff"); return original.changedPaths(a, b); },
  };
  const restored = await loadPublishedBridgeAttempt(observe, ref1, expectAttempt(first()));
  strictEqual(restored.exitCode, 3);
  deepStrictEqual(calls.includes("read"), true);
  deepStrictEqual(calls.every(x => ["read", "diff", "ancestor"].includes(x)), true);
});
