/**
 * PHX-CI-consumed BVP physical-battery bridge (DEC-345 / S09-BR01).
 *
 * One consumer adapter; NOT a verification authority or standalone launcher.
 * The existing PHX-CI focused stage captures this module's bounded stdout;
 * its normal evidence publisher (not this module) publishes the stage record.
 * No PHX-CI source/config change or physical execution is authorized here.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve, sep, win32 } from "node:path";

import { decodeScenarioCheckpoint } from "../../src/scenario/scenario-checkpoint";
import type { ScenarioResumeEvidence } from "../../src/scenario/scenario-checkpoint";

const MARKER = "BVP-PHXCI-BRIDGE-V1";
const MAX_FRAME_BYTES = 96 * 1024;
const MAX_RESULT_BYTES = 48 * 1024;
const MAX_CHECKPOINT_BYTES = 32 * 1024;
const HEX40 = /^[a-f0-9]{40}$/i;
const HEX64 = /^[a-f0-9]{64}$/i;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_BATTERY = /^[a-z0-9][a-z0-9-]{0,127}$/;
const ALLOWED_RESUME: ReadonlySet<string> = new Set([
  "human-confirmation", "canonical-evidence",
]);
const SENSITIVE_KEY = /(?:^|[_-])(access.?token|refresh.?token|authorization.?code|client.?secret|password|passcode|api.?key|credential|private.?key|note.?body|vault.?content|content.?body|secret)(?:$|[_-])/i;
const SENSITIVE_VALUE = /(?:PERSONAL_VAULT|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|Bearer\s+\S+|ya29\.[^\s]+|(?:password|refresh.?token|access.?token|secret)\s*[:=])/i;

export type BridgeMode = "initial" | "checkpoint-resume" | "verified-late-receipt";
export interface BridgePredecessor {
  readonly commitSha: string;
  readonly historyPath: string;
  readonly phxRunId: string;
  readonly attemptIndex: number;
}
export interface BridgeExpectation {
  readonly bvpRunId: string;
  readonly phxRunId: string;
  readonly attemptIndex: number;
  readonly battery: string;
  readonly scenarioId: string;
  readonly scenarioDigest: string;
  readonly sourceCommit: string;
  readonly artifactSha256: string;
  readonly deviceIds: Readonly<Record<string, string>>;
  readonly mode: BridgeMode;
  readonly predecessor?: BridgePredecessor;
}
export interface BridgeAttempt extends BridgeExpectation {
  readonly schemaVersion: 1;
  readonly exitCode: 0 | 1 | 3;
  readonly resultJson: string;
  readonly checkpointJson?: string;
}
export interface GitEvidencePort {
  readBlobAtCommit(commitSha: string, historyPath: string): Promise<string>;
  isAncestor(ancestorSha: string, descendantSha: string): Promise<boolean>;
  changedPaths(ancestorSha: string, descendantSha: string): Promise<readonly string[]>;
}
export interface PublishedAttemptRef {
  readonly commitSha: string;
  readonly historyPath: string;
  readonly currentHead: string;
}
export interface LiveRunnerPaths {
  readonly relayRoot: string;
  readonly checkpointFile: string;
  readonly resultFile: string;
  readonly previousResultFile?: string;
}

function fail(reason: string): never {
  throw new Error("bvp-phxci-bridge-" + reason);
}
function digest(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}
function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("invalid-object");
  return value as Record<string, unknown>;
}
function stringField(value: unknown, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) fail(label + "-invalid");
  return value;
}
function safeHistoryPath(path: string): boolean {
  return path.startsWith("dev/test-results/") &&
    path.endsWith(".json") && path.length < 300 &&
    !path.includes("\\") && !path.includes("..") &&
    /^[a-zA-Z0-9_./-]+$/.test(path);
}
function validatePredecessor(value: BridgePredecessor): void {
  stringField(value.commitSha, HEX40, "predecessor-commit");
  stringField(value.phxRunId, GUID, "predecessor-phx-run");
  if (!safeHistoryPath(value.historyPath)) fail("predecessor-history-path-invalid");
  if (!Number.isSafeInteger(value.attemptIndex) || value.attemptIndex < 1) fail("predecessor-attempt-invalid");
}
function sameDeviceIds(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const keysA = Object.keys(a).sort(), keysB = Object.keys(b).sort();
  return keysA.length === keysB.length && keysA.every((k, i) => k === keysB[i] && a[k] === b[k]);
}
function inspectSensitive(value: unknown, depth = 0): void {
  if (depth > 24) fail("privacy-depth-exceeded");
  if (typeof value === "string") {
    if (value.length > 8 * 1024 || SENSITIVE_VALUE.test(value)) fail("privacy-sensitive-value");
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 1024) fail("privacy-array-too-large");
    for (const item of value) inspectSensitive(item, depth + 1);
    return;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length > 128) fail("privacy-field-count");
    for (const [key, v] of entries) {
      if (SENSITIVE_KEY.test(key)) fail("privacy-sensitive-field");
      inspectSensitive(v, depth + 1);
    }
  }
}
function parseResult(attempt: BridgeAttempt): void {
  if (Buffer.byteLength(attempt.resultJson) > MAX_RESULT_BYTES) fail("result-oversize");
  let parsed: Record<string, unknown>;
  try { parsed = record(JSON.parse(attempt.resultJson)); }
  catch { fail("result-invalid-json"); }
  inspectSensitive(parsed);
  const battery = record(parsed.battery);
  const result = record(parsed.result);
  if (battery.name !== attempt.battery || result.scenarioId !== attempt.scenarioId) fail("result-identity-mismatch");
  const status = attempt.exitCode === 0 ? "completed" : attempt.exitCode === 3 ? "blocked" : undefined;
  if (status ? result.status !== status : !["blocked", "failed"].includes(String(result.status))) {
    fail("result-exit-status-mismatch");
  }
  // An exception-only result may lack live evidence; only ordinary 0/3
  // results are accepted as resumable/certifiable physical execution.
  if (attempt.exitCode !== 1) {
    const evidence = record(result.evidence), machine = record(evidence.machine);
    const live = record(machine.liveIdentity);
    if (machine.scenarioId !== attempt.scenarioId ||
      machine.executionMode !== "live" ||
      !Array.isArray(machine.deviceIdentities) ||
      (machine.deviceIdentities as unknown[]).some(v => typeof v !== "string") ||
      JSON.stringify([...machine.deviceIdentities].sort()) !== JSON.stringify(Object.values(attempt.deviceIds).sort()) ||
      live.runId !== attempt.bvpRunId || live.sourceCommit !== attempt.sourceCommit) {
      fail("result-live-identity-mismatch");
    }
  }
}
function validateAttempt(attempt: BridgeAttempt): void {
  if (attempt.schemaVersion !== 1) fail("bridge-version-invalid");
  stringField(attempt.bvpRunId, SAFE_ID, "bvp-run");
  stringField(attempt.phxRunId, GUID, "phx-run");
  stringField(attempt.battery, SAFE_BATTERY, "battery");
  stringField(attempt.scenarioId, SAFE_ID, "scenario");
  if (!/^sha256:[a-f0-9]{64}$/i.test(attempt.scenarioDigest)) fail("scenario-digest-invalid");
  stringField(attempt.sourceCommit, HEX40, "source");
  stringField(attempt.artifactSha256, HEX64, "artifact");
  if (!Number.isSafeInteger(attempt.attemptIndex) || attempt.attemptIndex < 1) fail("attempt-index-invalid");
  if (!["initial", "checkpoint-resume", "verified-late-receipt"].includes(attempt.mode)) fail("mode-invalid");
  if (!attempt.deviceIds || typeof attempt.deviceIds !== "object" || Array.isArray(attempt.deviceIds) ||
    !Object.keys(attempt.deviceIds).length || Object.keys(attempt.deviceIds).length > 4) fail("device-identities-invalid");
  const labels = Object.keys(attempt.deviceIds);
  for (const [key, value] of Object.entries(attempt.deviceIds)) {
    stringField(key, SAFE_ID, "device-label");
    stringField(value, SAFE_ID, "device-identity");
  }
  if (new Set(labels.map(k => attempt.deviceIds[k])).size !== labels.length) fail("device-identity-duplicate");
  if (attempt.mode === "initial") {
    if (attempt.attemptIndex !== 1 || attempt.predecessor) fail("initial-attempt-predecessor-invalid");
  } else {
    if (!attempt.predecessor) fail("resume-predecessor-required");
    validatePredecessor(attempt.predecessor);
    if (attempt.predecessor.attemptIndex !== attempt.attemptIndex - 1 ||
      attempt.predecessor.phxRunId === attempt.phxRunId) fail("resume-attempt-chain-invalid");
  }
  if (![0, 1, 3].includes(attempt.exitCode)) fail("exit-code-invalid");
  if (attempt.exitCode === 3) {
    if (!attempt.checkpointJson || Buffer.byteLength(attempt.checkpointJson, "utf8") > MAX_CHECKPOINT_BYTES) {
      fail("checkpoint-missing-or-oversize");
    }
    const parsed = decodeScenarioCheckpoint(attempt.checkpointJson);
    if (!parsed.ok) fail("checkpoint-malformed");
    const cp = parsed.value;
    if (cp.runId !== attempt.bvpRunId || cp.scenarioId !== attempt.scenarioId ||
      cp.scenarioDigest !== attempt.scenarioDigest ||
      cp.sourceIdentity !== attempt.sourceCommit ||
      cp.executionMode !== "live" ||
      !sameDeviceIds(Object.fromEntries(cp.deviceIdentities.map((value, i) => [String(i), value])),
        Object.fromEntries(Object.values(attempt.deviceIds).sort().map((value, i) => [String(i), value])))) {
      fail("checkpoint-identity-mismatch");
    }
  } else if (attempt.checkpointJson !== undefined) {
    fail("checkpoint-exit-status-invalid");
  }
  parseResult(attempt);
}
function checkExpectation(attempt: BridgeAttempt, expected: BridgeExpectation): void {
  const fields: (keyof BridgeExpectation)[] = [
    "bvpRunId", "phxRunId", "attemptIndex", "battery", "scenarioId",
    "scenarioDigest", "sourceCommit", "artifactSha256", "mode",
  ];
  for (const key of fields) if (attempt[key] !== expected[key]) fail("identity-" + key + "-mismatch");
  if (!sameDeviceIds(attempt.deviceIds, expected.deviceIds)) fail("identity-device-mismatch");
  if (JSON.stringify(attempt.predecessor ?? null) !== JSON.stringify(expected.predecessor ?? null)) {
    fail("identity-predecessor-mismatch");
  }
}
/** One bounded opaque line; PHX-CI's existing stage record publishes it unchanged. */
export function encodeBridgeAttempt(attempt: BridgeAttempt): string {
  validateAttempt(attempt);
  const raw = JSON.stringify(attempt);
  if (Buffer.byteLength(raw, "utf8") > MAX_FRAME_BYTES / 2) fail("bridge-frame-oversize");
  const b64 = Buffer.from(raw, "utf8").toString("base64url");
  const framed = MARKER + " " + b64 + " " + digest(raw) + "\n";
  if (Buffer.byteLength(framed, "utf8") > MAX_FRAME_BYTES) fail("bridge-frame-oversize");
  return framed;
}
/** Ignores ordinary deterministic test logs, but never accepts 0 or 2+ frames. */
export function decodeBridgeAttempt(stdout: string, expected: BridgeExpectation): BridgeAttempt {
  if (Buffer.byteLength(stdout, "utf8") > MAX_FRAME_BYTES * 4) fail("bridge-stdout-oversize");
  const candidates = stdout.split(/\r?\n/).filter(line => line.startsWith("BVP-PHXCI-BRIDGE-"));
  if (!candidates.length) fail("bridge-frame-missing");
  if (candidates.length !== 1) fail("bridge-frame-duplicate");
  const m = /^BVP-PHXCI-BRIDGE-V1 ([A-Za-z0-9_-]+) ([a-f0-9]{64})$/.exec(candidates[0]!);
  if (!m) fail("bridge-frame-malformed");
  if (m[1]!.length > MAX_FRAME_BYTES) fail("bridge-frame-oversize");
  const bytes = Buffer.from(m[1]!, "base64url");
  if (bytes.toString("base64url") !== m[1]) fail("bridge-frame-noncanonical");
  const raw = bytes.toString("utf8");
  if (Buffer.byteLength(raw, "utf8") !== bytes.byteLength || digest(raw) !== m[2]) fail("bridge-frame-digest-mismatch");
  let attempt: BridgeAttempt;
  try { attempt = JSON.parse(raw) as BridgeAttempt; }
  catch { fail("bridge-frame-malformed-json"); }
  validateAttempt(attempt);
  checkExpectation(attempt, expected);
  return attempt;
}
/**
 * The port MUST read from immutable Git object identities in production.
 * This function authenticates source/run/stage/evidence continuity, never PASS.
 */
export async function loadPublishedBridgeAttempt(
  git: GitEvidencePort,
  ref: PublishedAttemptRef,
  expected: BridgeExpectation,
): Promise<BridgeAttempt> {
  stringField(ref.commitSha, HEX40, "publication-commit");
  stringField(ref.currentHead, HEX40, "publication-head");
  if (!safeHistoryPath(ref.historyPath)) fail("publication-history-path-invalid");
  if (!(await git.isAncestor(ref.commitSha, ref.currentHead))) fail("publication-commit-not-ancestor");
  const changed = await git.changedPaths(ref.commitSha, ref.currentHead);
  if (changed.some(p =>
    p !== "dev/_ca-output.md" && p !== "dev/_ca-output.json" &&
    !(p.startsWith("dev/test-results/") && !p.includes("..") && !p.includes("\\")))) {
    fail("publication-source-drift");
  }
  const raw = await git.readBlobAtCommit(ref.commitSha, ref.historyPath);
  if (Buffer.byteLength(raw, "utf8") > MAX_FRAME_BYTES * 4) fail("publication-evidence-oversize");
  let obj: Record<string, unknown>;
  try { obj = record(JSON.parse(raw)); } catch { fail("publication-evidence-malformed"); }
  if (obj.runId !== expected.phxRunId) fail("publication-run-mismatch");
  const repository = record(obj.repository), verification = record(obj.verification);
  const overall = record(verification.overall);
  if (typeof repository.verifiedHead !== "string" ||
    !HEX40.test(repository.verifiedHead) ||
    (repository.verifiedHead !== expected.sourceCommit &&
      (await git.changedPaths(expected.sourceCommit, repository.verifiedHead)).some(p =>
        p !== "dev/_ca-output.md" && p !== "dev/_ca-output.json" &&
        !p.startsWith("dev/test-results/")))) fail("publication-source-mismatch");
  if (!Array.isArray(obj.stages)) fail("publication-stage-missing");
  const stages = obj.stages.filter((v: unknown) => {
    try { return record(v).name === "test-focused"; } catch { return false; }
  });
  if (stages.length !== 1) fail("publication-stage-missing-or-duplicate");
  const stage = record(stages[0]);
  if (stage.runId !== expected.phxRunId || typeof stage.stdout !== "string" ||
    ![0, 1, 3].includes(Number(stage.exitCode))) fail("publication-stage-identity-invalid");
  const attempt = decodeBridgeAttempt(stage.stdout, expected);
  if (stage.exitCode !== attempt.exitCode ||
    stage.result !== (attempt.exitCode === 0 ? "PASS" : "FAIL")) fail("publication-stage-exit-mismatch");
  if (attempt.exitCode === 0) {
    if (obj.status !== "COMPLETE" || overall.status !== "PASS") fail("publication-status-mismatch");
  } else {
    if (obj.status !== "BLOCKED" || overall.status !== "BLOCKED") fail("publication-blocked-status-mismatch");
  }
  return attempt;
}
/** Construct only the existing BVP CLI's supported arguments, never a shell command. */
export function buildLiveRunnerArguments(
  attempt: BridgeAttempt,
  paths: LiveRunnerPaths,
  resumeEvidence: readonly ScenarioResumeEvidence[] = [],
  recoverLateCompletion = false,
): string[] {
  validateAttempt(attempt);
  if (recoverLateCompletion && (attempt.mode !== "verified-late-receipt" || resumeEvidence.length)) {
    fail("recovery-and-checkpoint-resume-exclusive");
  }
  if (attempt.mode === "verified-late-receipt" && !recoverLateCompletion) fail("late-receipt-mode-required");
  if (attempt.mode !== "checkpoint-resume" && resumeEvidence.length) fail("resume-evidence-invalid-mode");
  for (const value of [paths.relayRoot, paths.checkpointFile, paths.resultFile]) {
    if (typeof value !== "string" || !value.trim() || value.includes("\u0000")) fail("runner-path-invalid");
  }
  if (resumeEvidence.some(s => !ALLOWED_RESUME.has(s))) fail("resume-evidence-invalid");
  if (recoverLateCompletion && !paths.previousResultFile) fail("recovery-previous-result-required");
  const args = [
    "--battery", attempt.battery,
    "--run-id", attempt.bvpRunId,
    "--device-map-json", JSON.stringify(attempt.deviceIds),
    "--relay-root", paths.relayRoot,
    "--checkpoint-file", paths.checkpointFile,
    "--result-file", paths.resultFile,
    "--validation-source-commit", attempt.sourceCommit,
  ];
  if (resumeEvidence.length) args.push("--resume-evidence-json", JSON.stringify([...new Set(resumeEvidence)].sort()));
  if (recoverLateCompletion) args.push("--recover-timed-out-result-file", paths.previousResultFile!);
  return args;
}

/** Real immutable reads: fixed commit SHA + safe repo-relative evidence path. */
function gitEvidencePort(root: string): GitEvidencePort {
  const git = (...args: string[]): string => {
    const out = spawnSync("git", ["-C", root, ...args], {
      encoding: "utf8", maxBuffer: MAX_FRAME_BYTES * 4, timeout: 15000, windowsHide: true,
    });
    if (out.error || out.status !== 0 || typeof out.stdout !== "string") fail("git-read-unavailable");
    return out.stdout.trimEnd();
  };
  return {
    async readBlobAtCommit(commit, path) {
      stringField(commit, HEX40, "git-evidence-commit");
      if (!safeHistoryPath(path)) fail("git-evidence-history-path-invalid");
      return git("show", commit + ":" + path);
    },
    async isAncestor(ancestor, descendant) {
      if (!HEX40.test(ancestor) || !HEX40.test(descendant)) fail("git-ancestry-invalid");
      const v = spawnSync("git", ["-C", root, "merge-base", "--is-ancestor", ancestor, descendant], {
        encoding: "utf8", timeout: 15000, windowsHide: true,
      });
      if (v.error || ![0, 1].includes(v.status ?? -1)) fail("git-ancestry-unavailable");
      return v.status === 0;
    },
    async changedPaths(a, b) {
      stringField(a, HEX40, "git-source");
      stringField(b, HEX40, "git-target");
      const lines = git("diff", "--name-only", a, b);
      return lines ? lines.split(/\r?\n/) : [];
    },
  };
}
interface BridgeRequest {
  readonly schemaVersion: 1;
  readonly expectation: BridgeExpectation;
  readonly paths: LiveRunnerPaths;
  readonly ownerPhysicalApproval: { readonly approved: true; readonly scope: string };
  readonly prior?: PublishedAttemptRef;
  readonly resumeEvidence?: readonly ScenarioResumeEvidence[];
}
function cliArgument(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx > 0 ? process.argv[idx + 1] : undefined;
}
function currentRunId(root: string): string {
  // PHX-CI creates this in the ephemeral worktree before the focused stage.
  const phx = join(root, ".phx-ci", "run.json");
  const rec = join(root, ".phx-ci", "records", "typecheck.json");
  if (!existsSync(phx) || !existsSync(rec) || !process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL) {
    fail("phxci-active-stage-required");
  }
  const run = record(JSON.parse(readFileSync(phx, "utf8")));
  const stage = record(JSON.parse(readFileSync(rec, "utf8")));
  if (typeof run.runId !== "string" || stage.runId !== run.runId ||
    stage.result !== "PASS" || stage.exitCode !== 0) fail("phxci-run-context-mismatch");
  return run.runId;
}
function enforceScratch(paths: LiveRunnerPaths): void {
  if (process.platform !== "win32") fail("physical-platform-unsupported");
  const scratch = win32.normalize("C:\\temp\\");
  for (const path of [paths.checkpointFile, paths.resultFile, paths.previousResultFile].filter(
    (v): v is string => typeof v === "string")) {
    if (!win32.isAbsolute(path) || !win32.normalize(path).toLowerCase().startsWith(scratch.toLowerCase()) ||
      path.includes("..")) fail("physical-scratch-path-invalid");
  }
  if (!isAbsolute(paths.relayRoot)) fail("physical-relay-absolute-path-required");
}
/** PHX-only stage subcommand: no external status publisher or checkpoint repository writer. */
export async function main(): Promise<void> {
  const file = cliArgument("--bridge-request-file");
  if (!file) fail("bridge-request-file-required");
  const root = resolve(process.cwd());
  const request = record(JSON.parse(readFileSync(file, "utf8"))) as unknown as BridgeRequest;
  if (request.schemaVersion !== 1 || !request.expectation || !request.paths) fail("request-invalid");
  if (request.ownerPhysicalApproval?.approved !== true ||
    request.ownerPhysicalApproval.scope !== "S09-EXACT-OWNER-APPROVED" ||
    process.env.BVP_OWNER_PHYSICAL_APPROVAL !== "YES") fail("owner-physical-authorization-required");
  const phxRun = currentRunId(root);
  if (phxRun !== request.expectation.phxRunId) fail("phx-run-id-mismatch");
  enforceScratch(request.paths);
  const head = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 10000 });
  if (head.status !== 0 || !HEX40.test(head.stdout.trim())) fail("source-unavailable");
  const currentHead = head.stdout.trim();
  if (request.expectation.mode === "initial" && currentHead !== request.expectation.sourceCommit) {
    fail("source-identity-mismatch");
  }
  if (request.expectation.mode !== "initial" && !request.prior) fail("resume-published-reference-required");
  let recovered: BridgeAttempt | undefined;
  if (request.prior) {
    if (request.prior.currentHead !== currentHead) fail("resume-head-mismatch");
    if (!request.expectation.predecessor ||
      request.prior.commitSha !== request.expectation.predecessor.commitSha ||
      request.prior.historyPath !== request.expectation.predecessor.historyPath) fail("resume-predecessor-mismatch");
    // The prior attempt has a DIFFERENT PHX run ID but the same logical BVP
    // identity and same source/install identity.
    const previous: BridgeExpectation = {
      ...request.expectation, phxRunId: request.expectation.predecessor.phxRunId,
      attemptIndex: request.expectation.predecessor.attemptIndex,
      mode: request.expectation.predecessor.attemptIndex === 1 ? "initial" : request.expectation.mode,
      predecessor: undefined,
    };
    recovered = await loadPublishedBridgeAttempt(gitEvidencePort(root), request.prior, previous);
    if (recovered.exitCode !== 3 && request.expectation.mode === "checkpoint-resume") {
      fail("resume-previous-checkpoint-not-blocked");
    }
    if (recovered.checkpointJson) {
      mkdirSync(resolve(request.paths.checkpointFile, ".."), { recursive: true });
      writeFileSync(request.paths.checkpointFile, recovered.checkpointJson, { flag: "wx", encoding: "utf8" });
    }
    if (request.expectation.mode === "verified-late-receipt" && request.paths.previousResultFile) {
      writeFileSync(request.paths.previousResultFile, recovered.resultJson, { flag: "wx", encoding: "utf8" });
    }
  }
  const staged: BridgeAttempt = {
    ...request.expectation,
    schemaVersion: 1,
    exitCode: 1,
    resultJson: JSON.stringify({
      battery: { name: request.expectation.battery },
      result: { scenarioId: request.expectation.scenarioId, status: "failed", classification: "not-dispatched" },
    }),
  };
  const args = buildLiveRunnerArguments(staged, request.paths,
    request.resumeEvidence ?? [], request.expectation.mode === "verified-late-receipt");
  const runner = join(root, ".test-build", "bvp", "test-platform", "test", "batteries", "run-live-battery.js");
  if (!existsSync(runner)) fail("compiled-bvp-runner-missing");
  const child = spawnSync(process.execPath, [runner, ...args], {
    cwd: root, encoding: "utf8", maxBuffer: MAX_FRAME_BYTES * 4,
    timeout: 15 * 60 * 1000, windowsHide: true,
  });
  if (child.error || child.status === null) fail("physical-result-uncertain");
  if (![0, 1, 3].includes(child.status)) fail("physical-runner-exit-unsupported");
  if (!existsSync(request.paths.resultFile)) fail("physical-result-file-missing");
  const resultJson = readFileSync(request.paths.resultFile, "utf8");
  const checkpointJson = child.status === 3 && existsSync(request.paths.checkpointFile) ?
    readFileSync(request.paths.checkpointFile, "utf8") : undefined;
  const attempt: BridgeAttempt = {
    ...request.expectation, schemaVersion: 1,
    exitCode: child.status as 0 | 1 | 3, resultJson,
    ...(checkpointJson === undefined ? {} : { checkpointJson }),
  };
  const framed = encodeBridgeAttempt(attempt);
  process.stdout.write(framed);
  process.exitCode = attempt.exitCode;
}
if (require.main === module) {
  main().catch(error => {
    // Never print error.stack or BVP's original output: either can contain
    // paths/identifiers/fixture data. Fail closed with a fixed diagnostic.
    console.error("BVP_PHXCI_BRIDGE_BLOCKED " + (
      error instanceof Error && error.message.startsWith("bvp-phxci-bridge-")
        ? error.message : "unclassified-error"));
    process.exitCode = 1;
  });
}
