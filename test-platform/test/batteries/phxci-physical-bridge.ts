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
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, win32 } from "node:path";
import { getLiveBattery } from "./battery-registry";
import { scenarioDefinitionDigest } from "../../src/scenario/scenario-checkpoint";

import { decodeScenarioCheckpoint } from "../../src/scenario/scenario-checkpoint";
import type { ScenarioResumeEvidence } from "../../src/scenario/scenario-checkpoint";

const MARKER = "BVP-PHXCI-BRIDGE-V1";
const MAX_FRAME_BYTES = 96 * 1024;
const MAX_PUBLISHED_EVIDENCE_BYTES = 2 * 1024 * 1024;
const MAX_RESULT_BYTES = 48 * 1024;
const MAX_CHECKPOINT_BYTES = 32 * 1024;
const HEX40 = /^[a-f0-9]{40}$/i;
const HEX64 = /^[a-f0-9]{64}$/i;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SAFE_BATTERY = /^[a-z0-9][a-z0-9-]{0,127}$/;
const ALLOWED_RESUME: ReadonlySet<string> = new Set([
  "human-confirmation", "external-observation", "production-result", "canonical-evidence",
]);
const SENSITIVE_KEY = /access.?token|refresh.?token|authorization.?code|client.?secret|password|passcode|api.?key|credential|private.?key|note.?body|vault.?content|content.?body|secret/i;
const SENSITIVE_VALUE = /(?:PERSONAL_VAULT|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|Bearer\s+\S+|ya29\.[^\s]+|(?:password|refresh.?token|access.?token|secret)\s*[:=])/i;
const SYNTHETIC_TRANSPORT_SCENARIOS = new Set([
  "phxci-tdd-human-checkpoint", "s09-br02-checkpoint", "br02-phxci-synthetic-checkpoint",
]);
const SAFE_CODE = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
// Transport only one-way pseudonyms for actual devices. Legacy fixed test
// identifiers are allowed solely inside a genuine PHX-CI focused stage.
const PUBLIC_DEVICE_ID = /^device:sha256:[a-f0-9]{64}$/i;
const PHX_FIXTURE_DEVICE_IDS = new Set([
  "device:fixture-windows", "device:another-windows", "device:isolated-windows",
  "device:synthetic-windows", "device:synthetic-ios", "device:synthetic-br02-only",
  "device:simulated-windows",
]);
/** One-way public identifier for the existing stable, private BRAIN device ID. */
export function publicPhysicalDeviceId(raw: string): string {
  if (typeof raw !== "string" || !/^device:[a-f0-9]{32}$/i.test(raw)) {
    fail("privacy-physical-device-id-invalid");
  }
  return "device:sha256:" + createHash("sha256")
    .update("brain-bvp-physical-device-v1\u0000" + raw)
    .digest("hex");
}

/** Retain command-routing identities privately; evidence accepts only one-way IDs.
 * Do not perform a global text substitution, which might hide stray private data.
 */
export function projectPhysicalResultForEvidence(resultJson: string, raw: string, publicId: string): string {
  if (publicPhysicalDeviceId(raw) !== publicId) fail("privacy-physical-device-mapping-invalid");
  if (Buffer.byteLength(resultJson, "utf8") > MAX_RESULT_BYTES) fail("result-oversize");
  const payload = record(JSON.parse(resultJson));
  const result = record(payload.result);
  const evidence = result.evidence === undefined ? undefined : record(result.evidence);
  if (evidence?.machine !== undefined) {
    const machine = record(evidence.machine);
    if (!Array.isArray(machine.deviceIdentities) || machine.deviceIdentities.length !== 1 ||
        machine.deviceIdentities[0] !== raw) fail("privacy-physical-device-result-mismatch");
    machine.deviceIdentities = [publicId];
    evidence.machineJson = JSON.stringify(machine);
  }
  if (payload.installationObservation !== undefined) {
    const install = record(payload.installationObservation);
    const devices = record(install.devices);
    if (Object.keys(devices).length !== 1 || devices[raw] === undefined) {
      fail("privacy-physical-installation-mismatch");
    }
    install.devices = { [publicId]: devices[raw] };
  }
  const publicJson = JSON.stringify(payload);
  if (publicJson.includes(raw)) fail("privacy-physical-device-id-leak");
  return publicJson;
}

function publicDeviceId(value: unknown): boolean {
  return typeof value === "string" && (PUBLIC_DEVICE_ID.test(value) ||
    (!!process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL &&
      PHX_FIXTURE_DEVICE_IDS.has(value)));
}
function deviceIdClaims(value: unknown): void {
  if (!publicDeviceId(value)) fail("privacy-device-identity-not-allowlisted");
}
const ALLOWED_OBSERVATION_STRINGS: ReadonlySet<string> = new Set([
  "completed", "blocked", "failed", "rejected", "none", "present", "absent",
  "local", "remote", "windows", "ios", "file", "folder", "idle",
  "pending", "unknown", "matched", "mismatched", "safe", "unsafe",
  "manual", "automatic", "enabled", "disabled", "synchronized", "ready",
  "not-ready", "retry", "cancelled", "conflict", "pass", "fail", "ok",
  "allowed", "denied", "pending-checkpoint", "human-checkpoint-required",
]);
function screenedObservation(value: unknown): void {
  const obj=record(value);
  for (const [key, item] of Object.entries(obj)) {
    if (typeof item === "string" &&
      !(key === "hash" && HEX64.test(item)) &&
      !ALLOWED_OBSERVATION_STRINGS.has(item)) fail("privacy-unapproved-observation-value");
  }
}
const SAFE_KEYS: Readonly<Record<string, readonly string[]>> = {
  root: ["battery", "result", "checkpoint", "recovery", "installationObservation"],
  battery: ["name", "description", "requiredDeviceLabels"],
  result: ["scenarioId", "status", "steps", "captures", "classification", "reason", "evidence"],
  evidence: ["machine", "machineJson", "human"],
  machine: ["schemaVersion", "scenarioId", "executionMode", "traceability", "fixtures",
    "deviceIdentities", "liveIdentity", "observations", "assertions", "verdict"],
  liveIdentity: ["runId", "sourceCommit"],
  verdict: ["status", "classification", "reason"],
  traceability: ["kind", "id"],
  fixture: ["stepId", "operation", "device", "path", "fromPath", "toPath", "contentHash", "sizeBytes"],
  observation: ["stepId", "captureAs", "value"],
  assertion: ["stepId", "status", "classification", "reason", "matchedExpectation", "index", "kind"],
  step: ["index", "stepId", "kind", "status", "classification", "reason", "matchedExpectation"],
  observationValue: ["kind", "status", "exists", "side", "entityKind", "hash", "sizeBytes",
    "stateRevision", "operationKinds", "nonNoopOperationCount",
    "executionDisposition", "globalExecutionGate", "recoveryCheckpointRequired",
    "operationCount", "baseCount", "mappingCount", "tombstoneCount",
    "classification", "reason", "schemaVersion"],
};
function allowedShape(value: unknown, shape: keyof typeof SAFE_KEYS, depth = 0): void {
  const v = record(value);
  const allowed = SAFE_KEYS[shape];
  for (const [key, item] of Object.entries(v)) {
    if (!allowed.includes(key)) fail("privacy-unapproved-" + shape + "-field");
    if (depth > 16) fail("privacy-shape-depth");
    if (shape === "root" && key === "battery") allowedShape(item, "battery", depth + 1);
    else if (shape === "root" && key === "result") allowedShape(item, "result", depth + 1);
    else if (shape === "root" && key === "installationObservation") {
      const obs=record(item);
      for(const field of Object.keys(obs)) if(!["sourceCommit","artifactSha256","manifestSha256","devices"].includes(field))fail("privacy-installation-field-unapproved");
      const devices=record(obs.devices);
      for(const [id,d] of Object.entries(devices)){deviceIdClaims(id);const pair=record(d);
        if(Object.keys(pair).some(k=>!["artifactSha256","manifestSha256"].includes(k))||
          !HEX64.test(String(pair.artifactSha256??""))||!HEX64.test(String(pair.manifestSha256??"")))
          fail("privacy-installed-device-identity-invalid");
      }
    }
    else if (shape === "result" && key === "evidence") allowedShape(item, "evidence", depth + 1);
    else if (shape === "evidence" && key === "machine") allowedShape(item, "machine", depth + 1);
    else if (shape === "machine" && key === "liveIdentity") allowedShape(item, "liveIdentity", depth + 1);
    else if (shape === "machine" && key === "verdict") allowedShape(item, "verdict", depth + 1);
    else if (shape === "machine" && key === "traceability") { if (!Array.isArray(item)) fail("privacy-traceability-array"); item.forEach(v => allowedShape(v, "traceability", depth + 1)); }
    else if (shape === "machine" && key === "fixtures") { if (!Array.isArray(item)) fail("privacy-fixtures-array"); item.forEach(v => allowedShape(v, "fixture", depth + 1)); }
    else if (shape === "machine" && key === "observations") { if (!Array.isArray(item)) fail("privacy-observations-array"); item.forEach(v => allowedShape(v, "observation", depth + 1)); }
    else if (shape === "machine" && key === "assertions") { if (!Array.isArray(item)) fail("privacy-assertions-array"); item.forEach(v => allowedShape(v, "assertion", depth + 1)); }
    else if (shape === "observation" && key === "value") {
      screenedObservation(item);
      allowedShape(item, "observationValue", depth + 1);
    } else if (shape === "result" && key === "steps") {
      if (!Array.isArray(item)) fail("privacy-steps-array");
      item.forEach(v => allowedShape(v, "step", depth + 1));
    } else if (shape === "result" && key === "captures") {
      const captures = record(item);
      // Any raw capture may include private notes, receipts, paths or names;
      // the transport may not publish it until a dedicated field policy exists.
      if (Object.keys(captures).length) fail("privacy-raw-captures-not-transportable");
    } else if (shape === "root" && key === "checkpoint") {
      // Original checkpoint is validated separately as canonical BVP schema v2.
      if (!item || typeof item !== "object") fail("privacy-checkpoint-invalid");
    } else if (shape === "root" && key === "recovery") {
      allowedShape(item, "observationValue", depth + 1);
    } else if (typeof item === "string") {
      if (item.length > (key === "machineJson" ? MAX_RESULT_BYTES : 256) || SENSITIVE_VALUE.test(item)) fail("privacy-untrusted-string");
      if (["stepId","kind","operation","captureAs","classification","status","device","scenarioId","sourceCommit","runId"].includes(key) &&
          !SAFE_CODE.test(item)) fail("privacy-unapproved-code");
      if (["reason","human","description","machineJson"].includes(key)) {
        // These are permitted ONLY after an exact source-derived comparison in
        // parseResult below; generic free-text is not accepted.
        if (key === "reason" && !/^(?:[a-z0-9-]{1,96}|reason-sha256:[a-f0-9]{24})$/.test(item)) fail("privacy-free-text-unapproved");
      }
      if (["path","fromPath","toPath"].includes(key) &&
          (item.includes("..") || !/^[a-zA-Z0-9._/-]{1,128}$/.test(item))) fail("privacy-fixture-path-unapproved");
    } else if (Array.isArray(item)) {
      if (item.length > 16 || !item.every(x => typeof x === "string" && SAFE_CODE.test(x))) fail("privacy-array-unapproved");
      if (key === "deviceIdentities") item.forEach(deviceIdClaims);
      if (shape === "observationValue") fail("privacy-observation-array-not-approved");
    } else if (item !== null && typeof item === "object") {
      fail("privacy-nested-object-unapproved");
    } else if (typeof item === "number" && !Number.isSafeInteger(item)) fail("privacy-number-unapproved");
  }
}

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
  readonly buildIdentityFile?: string;
  /** Explicit matching D: relay of the already installed disposable BVP plugin. */
  readonly physicalPluginRelayRoot?: string;
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
  // No raw controller or device identities may enter a published frame.
  Object.values(attempt.deviceIds).forEach(deviceIdClaims);
  // Canonical BVP evidence has derived JSON and a derived human summary:
  // neither is an arbitrary user text carrier.
  const resultShape = record(parsed.result);
  const evidenceShape = resultShape.evidence ? record(resultShape.evidence) : undefined;
  if (evidenceShape && typeof evidenceShape.machineJson === "string" &&
      evidenceShape.machineJson !== JSON.stringify(evidenceShape.machine)) {
    fail("privacy-machine-json-untrusted");
  }
  if (evidenceShape && typeof evidenceShape.human === "string") {
    const m = record(evidenceShape.machine);
    const trace = Array.isArray(m.traceability) ? m.traceability : [];
    const assertions = Array.isArray(m.assertions) ? m.assertions : [];
    const observations = Array.isArray(m.observations) ? m.observations : [];
    const passed = assertions.filter(a => record(a).status === "completed" &&
      record(a).matchedExpectation === true).length;
    const expectedHuman = `Scenario ${m.scenarioId} [${m.executionMode}] verdict=${record(m.verdict).status}; assertions=${passed}/${assertions.length}; observations=${observations.length}; traceability=${trace.map(t => record(t).id).join(",")}`;
    if (evidenceShape.human !== expectedHuman) fail("privacy-human-summary-untrusted");
  }
  allowedShape(parsed, "root");
  const battery = record(parsed.battery);
  const registered = getLiveBattery(attempt.battery);
  if (registered && attempt.scenarioId === registered.createScenario().id) {
    const scenario=registered.createScenario();
    const steps=scenario.steps;
    const stepIds=new Set(steps.map(v=>v.id));
    const machine=evidenceShape?.machine ? record(evidenceShape.machine) : undefined;
    if (machine) {
      if (machine.traceability !== undefined &&
          JSON.stringify(machine.traceability) !== JSON.stringify(scenario.traceability?.targets ?? [])) {
        fail("privacy-traceability-not-source-derived");
      }
      for (const event of Array.isArray(machine.observations) ? machine.observations : []) {
        const o=record(event);
        if (!stepIds.has(String(o.stepId??"")) ||
            !steps.some(v=>v.id===o.stepId && "captureAs" in v && v.captureAs===o.captureAs)) {
          fail("privacy-observation-not-source-derived");
        }
      }
      for (const assertion of Array.isArray(machine.assertions) ? machine.assertions : []) {
        const a=record(assertion);
        if (!stepIds.has(String(a.stepId??""))) fail("privacy-assertion-not-source-derived");
      }
    }
    for (const completed of Array.isArray(resultShape.steps) ? resultShape.steps : []) {
      const v=record(completed);
      if (!Number.isSafeInteger(v.index) || !steps[Number(v.index)] ||
          steps[Number(v.index)]!.id !== v.stepId ||
          steps[Number(v.index)]!.kind !== v.kind) fail("privacy-step-not-source-derived");
    }
    if (battery.description !== undefined && battery.description !== registered.description) {
      fail("privacy-battery-description-untrusted");
    }
    if (parsed.checkpoint !== undefined &&
        !Object.values(registered.checkpoints ?? {}).some(v =>
          JSON.stringify(v) === JSON.stringify(parsed.checkpoint))) {
      fail("privacy-checkpoint-instruction-untrusted");
    }
    const modelFixtures = registered.createScenario().steps.filter(v => v.kind === "fixture")
      .flatMap(v => ["path", "fromPath", "toPath"].filter(k => k in v)
        .map(k => String((v as unknown as Record<string, unknown>)[k])));
    const actualFixtures = Array.isArray(evidenceShape && record(evidenceShape.machine).fixtures)
      ? (record(evidenceShape!.machine).fixtures as unknown[]) : [];
    for (const fi of actualFixtures) {
      const f = record(fi);
      for (const k of ["path","fromPath","toPath"]) {
        if (f[k] !== undefined && !modelFixtures.includes(String(f[k]))) {
          fail("privacy-unregistered-fixture-path");
        }
      }
    }
  }
  const result = record(parsed.result);
  if (battery.name !== attempt.battery || result.scenarioId !== attempt.scenarioId) fail("result-identity-mismatch");
  const status = attempt.exitCode === 0 ? "completed" : attempt.exitCode === 3 ? "blocked" : undefined;
  if (status ? result.status !== status : !["blocked", "failed"].includes(String(result.status))) {
    fail("result-exit-status-mismatch");
  }
  // An exception-only result may lack live evidence; only ordinary 0/3
  // results are accepted as resumable/certifiable physical execution.
  if (attempt.exitCode !== 1) {
    const registered = getLiveBattery(attempt.battery);
    if (registered && attempt.scenarioId === registered.createScenario().id) {
      if (parsed.installationObservation === undefined) fail("installed-artifact-manifest-proof-unverified");
      const observed = record(parsed.installationObservation);
      if (observed.sourceCommit !== attempt.sourceCommit ||
          observed.artifactSha256 !== attempt.artifactSha256 ||
          typeof observed.manifestSha256 !== "string" || !HEX64.test(observed.manifestSha256)) {
        fail("installed-artifact-manifest-proof-unverified");
      }
      const pairs = record(observed.devices);
      for (const deviceId of Object.values(attempt.deviceIds)) {
        const pair = record(pairs[deviceId]);
        if (pair.artifactSha256 !== attempt.artifactSha256 ||
            pair.manifestSha256 !== observed.manifestSha256) {
          fail("installed-device-measurement-mismatch");
        }
      }
    }
    const evidence = record(result.evidence), machine = record(evidence.machine);
    const verdict = record(machine.verdict);
    if (verdict.status !== result.status) fail("result-machine-verdict-mismatch");
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
function validateAttempt(attempt: BridgeAttempt, validatePublishedResult = true): void {
  if (attempt.schemaVersion !== 1) fail("bridge-version-invalid");
  // Test-only historic synthetic transport fixtures are not physical identities.
  // Real bridge.main() separately requires an exact registered battery binding.
  const definition = getLiveBattery(attempt.battery);
  if (!definition || attempt.scenarioId !== definition.createScenario().id) {
    if (!SYNTHETIC_TRANSPORT_SCENARIOS.has(attempt.scenarioId) ||
        !process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL) {
      fail("scenario-registered-battery-mismatch");
    }
  } else {
    if (scenarioDefinitionDigest(definition.createScenario()) !== attempt.scenarioDigest) {
      fail("scenario-registered-digest-mismatch");
    }
    if (JSON.stringify(Object.keys(attempt.deviceIds).sort()) !==
        JSON.stringify([...definition.requiredDeviceLabels].sort())) {
      fail("scenario-required-device-labels-mismatch");
    }
  }
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
  Object.values(attempt.deviceIds).forEach(deviceIdClaims);
  if (attempt.mode === "verified-late-receipt" && attempt.exitCode === 3) fail("recovery-checkpoint-exclusive");
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
    cp.deviceIdentities.forEach(deviceIdClaims);
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
  if (validatePublishedResult) parseResult(attempt);
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
  if (Buffer.byteLength(raw, "utf8") > MAX_PUBLISHED_EVIDENCE_BYTES) fail("publication-evidence-oversize");
  let obj: Record<string, unknown>;
  try { obj = record(JSON.parse(raw)); } catch { fail("publication-evidence-malformed"); }
  if (obj.schemaVersion !== "1") fail("publication-evidence-schema-unsupported");
  if (obj.runId !== expected.phxRunId) fail("publication-run-mismatch");
  const repository = record(obj.repository), verification = record(obj.verification);
  const overall = record(verification.overall);
  const changeSet = record(verification.changeSet);
  const repositoryVerification = record(verification.repository);
  // The focused and independent full-test dimensions are PHX-CI's sole
  // verification authority; an inner stdout frame can NEVER override either.
  if (repositoryVerification.status !== "PASS" ||
      repositoryVerification.stage !== "test" ||
      repositoryVerification.exitCode !== 0) {
    fail("publication-repository-verification-not-pass");
  }
  if (typeof repository.verifiedHead !== "string" ||
    !HEX40.test(repository.verifiedHead)) fail("publication-source-mismatch");
  if (repository.verifiedHead !== expected.sourceCommit) {
    // Matching filenames do not authorize an unrelated commit: prove ancestry
    // BEFORE accepting any evidence-only descendant as source-equivalent.
    if (!(await git.isAncestor(expected.sourceCommit, repository.verifiedHead))) {
      fail("publication-source-not-ancestor");
    }
    const sourceChanged = await git.changedPaths(expected.sourceCommit, repository.verifiedHead);
    if (sourceChanged.some(p =>
      p !== "dev/_ca-output.md" && p !== "dev/_ca-output.json" &&
      !(p.startsWith("dev/test-results/") && !p.includes("..") && !p.includes("\\")))) {
      fail("publication-source-mismatch");
    }
  }
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
  if (changeSet.stage !== "test-focused" ||
    changeSet.status !== (attempt.exitCode === 0 ? "PASS" : "FAIL") ||
    changeSet.exitCode !== attempt.exitCode) {
    fail("publication-change-set-verification-mismatch");
  }
  if (attempt.exitCode === 0) {
    if (obj.status !== "COMPLETE" || overall.status !== "PASS") fail("publication-status-mismatch");
  } else {
    if (obj.status !== "BLOCKED" || overall.status !== "BLOCKED") fail("publication-blocked-status-mismatch");
  }
  return attempt;
}
/** Physically installed Windows BVP relay, never a personal or arbitrary vault. */
function isApprovedWindowsPluginRelay(path: string): boolean {
  return typeof path === "string" && !path.includes("..") &&
    !path.includes("\0") && !path.startsWith("\\\\") &&
    win32.isAbsolute(path) &&
    /^D:\\bvp-s08f-vault-[a-f0-9]{32}\\\.obsidian\\plugins\\brain-google-drive-sync\\\.bvp-relay$/i.test(path) &&
    win32.normalize(path).toLowerCase() === path.toLowerCase();
}

/** Construct only the existing BVP CLI's supported arguments, never a shell command. */
export function buildLiveRunnerArguments(
  attempt: BridgeAttempt,
  paths: LiveRunnerPaths,
  resumeEvidence: readonly ScenarioResumeEvidence[] = [],
  recoverLateCompletion = false,
  privatePhysicalDeviceIds?: Readonly<Record<string, string>>,
): string[] {
  validateAttempt(attempt, false);
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
  // One explicit, installed disposable D: relay may be shared directly
  // with Obsidian; all checkpoint/results/identity stay in C:\temp\<GUID>.
  const physical = paths.physicalPluginRelayRoot !== undefined;
  if (privatePhysicalDeviceIds) {
    if (!physical || Object.keys(privatePhysicalDeviceIds).length !== 1 ||
        typeof privatePhysicalDeviceIds.windows !== "string" ||
        publicPhysicalDeviceId(privatePhysicalDeviceIds.windows) !== attempt.deviceIds.windows) {
      fail("privacy-physical-device-routing-mismatch");
    }
  }
  if (physical && (paths.physicalPluginRelayRoot !== paths.relayRoot ||
      !isApprovedWindowsPluginRelay(paths.relayRoot) ||
      attempt.battery !== "windows-live-smoke" ||
      Object.keys(attempt.deviceIds).length !== 1 ||
      typeof attempt.deviceIds.windows !== "string")) {
    fail("physical-windows-relay-scope-invalid");
  }
  const pathsAll = [
    ...(physical ? [] : [paths.relayRoot]),
    paths.checkpointFile, paths.resultFile,
    ...(paths.previousResultFile ? [paths.previousResultFile] : []),
    ...(paths.buildIdentityFile ? [paths.buildIdentityFile] : []),
  ];
  const normalized = pathsAll.map(p => win32.normalize(p));
  const anchor = physical ? paths.checkpointFile : paths.relayRoot;
  const rootMatch = /^C:\\temp\\([a-f0-9]{32})\\/i.exec(win32.normalize(anchor));
  if (!rootMatch || pathsAll.some((p,i) =>
    !win32.isAbsolute(p) || p.includes("..") || p.startsWith("\\\\") ||
    !normalized[i]!.toLowerCase().startsWith(("C:\\temp\\" + rootMatch[1] + "\\").toLowerCase()))) {
    fail("relay-ownership-scratch-root-outside");
  }
  if ((!physical && win32.normalize(paths.relayRoot).toLowerCase() !==
        ("C:\\temp\\" + rootMatch[1] + "\\relay").toLowerCase()) ||
      new Set(normalized.map(v => v.toLowerCase())).size !== normalized.length ||
      (paths.buildIdentityFile && !win32.normalize(paths.buildIdentityFile).toLowerCase()
        .startsWith(("C:\\temp\\" + rootMatch[1] + "\\installed\\").toLowerCase()))) {
    fail("relay-scope-path-invalid");
  }
  const args = [
    "--battery", attempt.battery,
    "--run-id", attempt.bvpRunId,
    "--device-map-json", JSON.stringify(privatePhysicalDeviceIds ?? attempt.deviceIds),
    "--relay-root", paths.relayRoot,
    "--checkpoint-file", paths.checkpointFile,
    "--result-file", paths.resultFile,
    "--validation-source-commit", attempt.sourceCommit,
  ];
  if (resumeEvidence.length) args.push("--resume-evidence-json", JSON.stringify([...new Set(resumeEvidence)].sort()));
  if (recoverLateCompletion) args.push("--recover-timed-out-result-file", paths.previousResultFile!);
  if (paths.buildIdentityFile) args.push("--validation-build-identity-file", paths.buildIdentityFile);
  return args;
}

/** Real immutable reads: fixed commit SHA + safe repo-relative evidence path. */
function gitEvidencePort(root: string): GitEvidencePort {
  const git = (...args: string[]): string => {
    const out = spawnSync("git", ["-C", root, ...args], {
      encoding: "utf8", maxBuffer: MAX_PUBLISHED_EVIDENCE_BYTES, timeout: 15000, windowsHide: true,
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
  readonly ownerPhysicalApproval?: { readonly approved: true; readonly scope: string };
  readonly executionClass?: "owner-approved-physical" | "nonphysical-simulation";
  readonly prior?: PublishedAttemptRef;
  readonly resumeEvidence?: readonly ScenarioResumeEvidence[];
  readonly previousExpectation?: BridgeExpectation;
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
  const physical = paths.physicalPluginRelayRoot !== undefined;
  if (physical && (paths.physicalPluginRelayRoot !== paths.relayRoot ||
      !isApprovedWindowsPluginRelay(paths.relayRoot) ||
      !existsSync(paths.relayRoot))) {
    fail("installed-plugin-relay-path-invalid");
  }
  const scratch = [
    ...(physical ? [] : [paths.relayRoot]),
    paths.checkpointFile, paths.resultFile,
    ...(paths.previousResultFile ? [paths.previousResultFile] : []),
    ...(paths.buildIdentityFile ? [paths.buildIdentityFile] : []),
  ];
  const normalized = scratch.map(p => win32.normalize(p));
  const root = win32.normalize(physical ? paths.checkpointFile : paths.relayRoot);
  const match = /^C:\\temp\\([a-f0-9]{32})\\/i.exec(root);
  if (!match) fail("relay-owned-run-root-invalid");
  const prefix = ("C:\\temp\\" + match[1] + "\\").toLowerCase();
  for (let i = 0; i < scratch.length; i++) {
    const value = scratch[i]!;
    if (!win32.isAbsolute(value) || value.includes("..") || value.startsWith("\\\\") ||
        !normalized[i]!.toLowerCase().startsWith(prefix)) {
      fail("relay-owned-run-root-outside");
    }
  }
  if ((!physical && win32.normalize(paths.relayRoot).toLowerCase() !== prefix + "relay") ||
      (paths.buildIdentityFile &&
        !win32.normalize(paths.buildIdentityFile).toLowerCase().startsWith(prefix + "installed\\"))) {
    fail("relay-scope-path-invalid");
  }
  // Reject junctions/symlinks in the physical vault and C: workspace.
  for (const candidate of [...scratch, ...(physical ? [paths.relayRoot] : [])]) {
    const parts = win32.normalize(candidate).split("\\");
    for (let n = 2; n < parts.length; n++) {
      const segment = parts.slice(0, n + 1).join("\\");
      if (existsSync(segment) && lstatSync(segment).isSymbolicLink()) {
        fail("relay-junction-or-symlink");
      }
    }
  }
}

/**
 * Durable, shared single-writer authority. The PHX verification worktree and
 * attempt scratch GUID change on each invocation: neither can be the lease
 * authority. For each controller machine, stable SHA-derived 32-hex roots
 * under C:\temp fence the logical run and every participating device.
 *
 * A claimed attempt-index/predecessor is never automatically consumed twice.
 * Crash/uncertain execution retains the active directory and blocks future
 * dispatch pending separate authorized reconciliation. No TTL/lease stealing.
 *
 * This local controller lease does NOT attest a distributed multi-controller
 * coordinator. A physical deployment requiring separate simultaneous host
 * controllers must provide separate owner-approved shared authority.
 */
export interface BridgeAttemptAuthority {
  finish(outcome: "blocked" | "completed" | "failed"): void;
}
export function claimBridgeAttemptAuthority(
  attempt: BridgeExpectation,
  namespaceRoot: string,
): BridgeAttemptAuthority {
  if (process.platform !== "win32" ||
      !(win32.normalize(namespaceRoot).toLowerCase() === "c:\\temp" ||
        /^c:\\temp\\[a-f0-9]{32}$/i.test(win32.normalize(namespaceRoot))) ||
      namespaceRoot.includes("..") || namespaceRoot.startsWith("\\\\")) {
    fail("attempt-authority-namespace-invalid");
  }
  stringField(attempt.bvpRunId, SAFE_ID, "authority-logical-run");
  stringField(attempt.phxRunId, GUID, "authority-phx-run");
  if (!Number.isSafeInteger(attempt.attemptIndex) || attempt.attemptIndex < 1) fail("authority-attempt-index");
  if (attempt.predecessor) validatePredecessor(attempt.predecessor);
  if (!attempt.deviceIds || !Object.values(attempt.deviceIds).length) fail("authority-devices-missing");
  Object.values(attempt.deviceIds).forEach(deviceIdClaims);
  // Device lock keys are also pseudonyms. Never write raw device identifiers.
  const key=(label: string):string => join(namespaceRoot,
    createHash("sha256").update("bvp-s09-r2-lease-v1:"+label).digest("hex").slice(0,32));
  const logical=key("logical:"+attempt.bvpRunId);
  const resources=[logical,...Object.values(attempt.deviceIds).map(id=>key("device:"+id))].sort();
  const acquired:string[]=[];
  let journalStarted=false;
  const release=():void => {
    for (const p of acquired.reverse()) rmSync(join(p,"active"),{recursive:true,force:false});
  };
  try {
    for (const p of resources) {
      if (existsSync(p) && lstatSync(p).isSymbolicLink()) fail("authority-junction");
      mkdirSync(p,{recursive:true});
      mkdirSync(join(p,"active")); // atomic across independent Node processes
      acquired.push(p);
    }
    if (existsSync(join(logical,"closed"))) fail("authority-logical-run-completed");
    const idx=join(logical,"index-"+attempt.attemptIndex);
    const current=join(logical,"phx-"+attempt.phxRunId);
    const consumed=attempt.predecessor ?
      join(logical,"consumed-"+digest(JSON.stringify(attempt.predecessor))) : undefined;
    if (existsSync(idx) || existsSync(current) || (consumed && existsSync(consumed))) {
      fail("authority-attempt-or-predecessor-already-consumed");
    }
    if (attempt.attemptIndex > 1 &&
        (!attempt.predecessor ||
         !existsSync(join(logical,"index-"+attempt.predecessor.attemptIndex)) ||
         !existsSync(join(logical,"phx-"+attempt.predecessor.phxRunId)))) {
      fail("authority-previous-attempt-not-recorded");
    }
    journalStarted=true;
    mkdirSync(idx);
    mkdirSync(current);
    if (consumed) mkdirSync(consumed);
  } catch (e) {
    // When no journal was written, undo only our just-acquired active leases.
    // After ANY journal write, retain them so an ambiguous operation cannot
    // automatically be retried or have its predecessor consumed twice.
    if (!journalStarted) release();
    throw e;
  }
  let finished=false;
  return {
    finish(outcome) {
      if (finished) fail("authority-finish-twice");
      finished=true;
      if (outcome === "completed") mkdirSync(join(logical,"closed"));
      if (outcome === "completed" || outcome === "blocked") release();
      // Failed or uncertain execution preserves exclusive locks indefinitely.
    },
  };
}

/** PHX-stage-owned initial Windows smoke request. No raw ID leaves this process.
 * The operator never supplies the identity, build digest, scenario, or PHX run ID.
 */
function prepareApprovedWindowsSmokeRequest(): string {
  const root = resolve(process.cwd());
  const phxRunId = currentRunId(root);
  if (process.env.BVP_OWNER_PHYSICAL_APPROVAL !== "YES" ||
      process.env.BVP_EXISTING_MAILBOX_ROOT_CONFIRMED !== "YES") {
    fail("physical-approval-or-existing-mailbox-unconfirmed");
  }
  const scratch = process.env.BVP_WINDOWS_SMOKE_SCRATCH;
  if (!scratch || !/^C:\\temp\\[a-f0-9]{32}$/i.test(scratch) ||
      scratch.includes("..") || scratch.startsWith("\\\\") || existsSync(scratch)) {
    fail("physical-smoke-scratch-must-be-new");
  }
  const relayRoot = "D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay";
  if (!existsSync(relayRoot)) fail("physical-installed-relay-not-ready");
  const pluginRoot = win32.dirname(relayRoot);
  const original = win32.join(pluginRoot, "build-identity.json");
  if (!existsSync(original)) fail("physical-installed-build-identity-missing");
  const build = record(JSON.parse(readFileSync(original, "utf8")));
  const installedSource = "2bf51ca15aec9c752e3ac7769fcf3ac237df99df";
  const installedHash = "90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7";
  const manifestHash = "d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965";
  if (build.schemaVersion !== 1 || build.sourceCommit !== installedSource ||
      build.artifactSha256 !== installedHash || build.manifestSha256 !== manifestHash) {
    fail("physical-installed-build-identity-unexpected");
  }
  const installed = win32.join(scratch, "installed");
  mkdirSync(installed, {recursive:true});
  for (const name of ["main.js", "manifest.json", "build-identity.json"]) {
    const src = win32.join(pluginRoot, name);
    const dest = win32.join(installed, name);
    if (!existsSync(src)) fail("physical-installed-artifact-file-missing");
    writeFileSync(dest, readFileSync(src), {flag:"wx"});
  }
  const data = record(JSON.parse(readFileSync(win32.join(pluginRoot,"data.json"),"utf8")));
  const settings = record(data.settings);
  if (typeof settings.deviceIdentity !== "string") fail("physical-installed-identity-invalid");
  const pseudonym = publicPhysicalDeviceId(settings.deviceIdentity);
  const battery = getLiveBattery("windows-live-smoke");
  if (!battery || JSON.stringify(battery.requiredDeviceLabels)!==JSON.stringify(["windows"])) {
    fail("physical-registered-smoke-battery-invalid");
  }
  const scenario = battery.createScenario();
  const request: BridgeRequest = {
    schemaVersion:1, executionClass:"owner-approved-physical",
    ownerPhysicalApproval:{approved:true,scope:"S09-EXACT-OWNER-APPROVED"},
    expectation: {
      bvpRunId:"bvp-win-"+phxRunId,phxRunId,attemptIndex:1,
      battery:"windows-live-smoke",scenarioId:scenario.id,
      scenarioDigest:scenarioDefinitionDigest(scenario),
      sourceCommit:installedSource,artifactSha256:installedHash,
      deviceIds:{windows:pseudonym},mode:"initial",
    },
    paths:{
      relayRoot,physicalPluginRelayRoot:relayRoot,
      checkpointFile:win32.join(scratch,"checkpoint.json"),
      resultFile:win32.join(scratch,"result.json"),
      buildIdentityFile:win32.join(installed,"build-identity.json"),
    },
  };
  const file = win32.join(scratch, "bridge-request.json");
  writeFileSync(file,JSON.stringify(request),{encoding:"utf8",flag:"wx"});
  return file;
}

/** PHX-only stage subcommand: no external status publisher or checkpoint repository writer. */
export async function main(): Promise<void> {
  const file = cliArgument("--bridge-request-file") ?? (
    process.argv.includes("--run-approved-windows-smoke") ? prepareApprovedWindowsSmokeRequest() : undefined
  );
  if (!file) fail("bridge-request-file-required");
  const root = resolve(process.cwd());
  const request = record(JSON.parse(readFileSync(file, "utf8"))) as unknown as BridgeRequest;
  if (request.schemaVersion !== 1 || !request.expectation || !request.paths) fail("request-invalid");
  const simulated = request.executionClass === "nonphysical-simulation";
  if (!simulated && !Object.values(request.expectation.deviceIds).every(v => PUBLIC_DEVICE_ID.test(v))) {
    fail("privacy-physical-device-must-be-digest");
  }
  if (simulated) {
    if (!process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL ||
      process.env.BVP_NONPHYSICAL_SIMULATION !== "YES" ||
      request.expectation.battery !== "s09-br02-simulated-checkpoint" ||
      !Object.values(request.expectation.deviceIds).every(v=>v.startsWith("device:simulated-"))) {
      fail("nonphysical-simulation-scope-invalid");
    }
  } else if (request.executionClass !== "owner-approved-physical" ||
    request.ownerPhysicalApproval?.approved !== true ||
    request.ownerPhysicalApproval.scope !== "S09-EXACT-OWNER-APPROVED" ||
    process.env.BVP_OWNER_PHYSICAL_APPROVAL !== "YES") {
    fail("owner-physical-authorization-required");
  }
  const phxRun = currentRunId(root);
  if (phxRun !== request.expectation.phxRunId) fail("phx-run-id-mismatch");
  enforceScratch(request.paths);
  const head = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8", timeout: 10000 });
  if (head.status !== 0 || !HEX40.test(head.stdout.trim())) fail("source-unavailable");
  const currentHead = head.stdout.trim();
  if (request.expectation.mode === "initial" && currentHead !== request.expectation.sourceCommit) {
    // Installed 0.1.19 BVP bytes remain pinned to the original source. Only
    // this nonshipping controller bridge, its focused tests and state/evidence
    // may advance; no product, scenario, manifest or PHX-CI config drift.
    if (simulated || !request.paths.physicalPluginRelayRoot ||
        request.expectation.battery !== "windows-live-smoke") {
      fail("source-identity-mismatch");
    }
    const anc = spawnSync("git", ["-C", root, "merge-base", "--is-ancestor",
      request.expectation.sourceCommit, currentHead],
      { encoding: "utf8", timeout: 15000, windowsHide: true });
    const diff = spawnSync("git", ["-C", root, "diff", "--name-only",
      request.expectation.sourceCommit + ".." + currentHead],
      { encoding: "utf8", timeout: 15000, windowsHide: true });
    if (anc.error || anc.status !== 0 || diff.error || diff.status !== 0 ||
        typeof diff.stdout !== "string") fail("source-compatibility-unproven");
    const allowed = new Set([
      "test-platform/test/batteries/phxci-physical-bridge.ts",
      "test-platform/test/s09-windows-direct-relay-route.test.ts",
      "test-platform/test/s09-windows-privacy-transport.test.ts",
      "test-platform/test/architecture-metrics.test.ts",
      "test-platform/test/batteries/deterministic-battery-registry.ts",
      "tests/adversarial/s09-g1-runtime-authority-interleavings.test.ts",
      "dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1",
    ]);
    const changed = diff.stdout.trim().split(/\r?\n/).filter(Boolean);
    if (!changed.length || changed.some(v => !allowed.has(v) &&
        !/^dev\/(?:planning\/|state\/|reviews\/|test-results\/|_ca-output\.(?:md|json)$)/.test(v))) {
      fail("installed-source-executable-drift");
    }
  }
  const actualBattery = getLiveBattery(request.expectation.battery);
  if (!actualBattery || actualBattery.createScenario().id !== request.expectation.scenarioId ||
      scenarioDefinitionDigest(actualBattery.createScenario()) !== request.expectation.scenarioDigest ||
      JSON.stringify([...actualBattery.requiredDeviceLabels].sort()) !==
      JSON.stringify(Object.keys(request.expectation.deviceIds).sort())) {
    fail("registered-executable-scenario-mismatch");
  }
  if (!request.paths.buildIdentityFile || !existsSync(request.paths.buildIdentityFile)) {
    fail("installed-build-identity-file-required");
  }
  // Controller derives its own expected bytes from the frozen installed-build
  // candidate; never take a digest from the owner request as its sole proof.
  const build = record(JSON.parse(readFileSync(request.paths.buildIdentityFile, "utf8")));
  if (build.schemaVersion !== 1 || build.sourceCommit !== request.expectation.sourceCommit ||
      build.artifactSha256 !== request.expectation.artifactSha256 ||
      typeof build.manifestSha256 !== "string" || !HEX64.test(build.manifestSha256)) {
    fail("installed-build-identity-mismatch");
  }
  const artifactFile = join(dirname(request.paths.buildIdentityFile), "main.js");
  const manifestFile = join(dirname(request.paths.buildIdentityFile), "manifest.json");
  if (!existsSync(artifactFile) || !existsSync(manifestFile)) {
    fail("installed-artifact-files-missing");
  }
  const hashFile = (path: string): string => createHash("sha256").update(readFileSync(path)).digest("hex");
  if (hashFile(artifactFile) !== build.artifactSha256 ||
      hashFile(manifestFile) !== build.manifestSha256) {
    fail("installed-artifact-manifest-bytes-mismatch");
  }
  let privatePhysicalDeviceId: string | undefined;
  // No shipping plugin changes: verify the *actual* installed validation files
  // and settled pairing prior to using the Obsidian relay. Never print data.json.
  if (!simulated) {
    if (request.expectation.battery !== "windows-live-smoke" ||
        !request.paths.physicalPluginRelayRoot ||
        Object.keys(request.expectation.deviceIds).length !== 1 ||
        typeof request.expectation.deviceIds.windows !== "string") {
      fail("physical-windows-smoke-only");
    }
    const pluginRoot = win32.dirname(request.paths.relayRoot);
    for (const [name, expected] of [
      ["main.js", build.artifactSha256],
      ["manifest.json", build.manifestSha256],
    ] as const) {
      const candidate = win32.join(pluginRoot, name);
      if (!existsSync(candidate) || hashFile(candidate) !== expected) {
        fail("installed-windows-plugin-bytes-mismatch");
      }
    }
    const installedData = win32.join(pluginRoot, "data.json");
    let settings: Record<string, unknown>;
    try { settings = record(record(JSON.parse(readFileSync(installedData, "utf8"))).settings); }
    catch { fail("installed-windows-plugin-data-invalid"); }
    if (typeof settings!.deviceIdentity !== "string" ||
        publicPhysicalDeviceId(settings!.deviceIdentity) !== request.expectation.deviceIds.windows ||
        !settings!.vaultIdentity || !settings!.remoteRootId ||
        settings!.firstSyncCompleted !== true ||
        settings!.startupResumeEnabled !== false ||
        settings!.localChangeEnabled !== false ||
        settings!.periodicEnabled !== false) {
      fail("installed-windows-device-identity-or-pairing-mismatch");
    }
    privatePhysicalDeviceId = settings!.deviceIdentity as string;
    for (const dir of ["outbox", "sent"]) {
      const queue = win32.join(request.paths.relayRoot, dir);
      if (existsSync(queue) && readdirSync(queue).length !== 0) {
        fail("installed-windows-relay-pending-commands");
      }
    }
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
    // Later checkpoints require an explicit, immutable prior-chain description;
    // never guess an intermediate predecessor or rewrite history.
    const previous: BridgeExpectation = request.previousExpectation ?? {
      ...request.expectation, phxRunId: request.expectation.predecessor.phxRunId,
      attemptIndex: request.expectation.predecessor.attemptIndex,
      mode: "initial", predecessor: undefined,
    };
    if (previous.bvpRunId !== request.expectation.bvpRunId ||
      previous.sourceCommit !== request.expectation.sourceCommit ||
      previous.scenarioDigest !== request.expectation.scenarioDigest ||
      previous.artifactSha256 !== request.expectation.artifactSha256 ||
      !sameDeviceIds(previous.deviceIds, request.expectation.deviceIds) ||
      previous.phxRunId !== request.expectation.predecessor.phxRunId ||
      previous.attemptIndex !== request.expectation.predecessor.attemptIndex ||
      (previous.attemptIndex > 1 && !request.previousExpectation)) {
      fail("resume-predecessor-identity-mismatch");
    }
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
    request.resumeEvidence ?? [], request.expectation.mode === "verified-late-receipt",
    privatePhysicalDeviceId ? {windows: privatePhysicalDeviceId} : undefined);
  const runner = join(root, ".test-build", "bvp", "test-platform", "test", "batteries", "run-live-battery.js");
  if (!existsSync(runner)) fail("compiled-bvp-runner-missing");
  // Claim durable logical-run + per-device authority BEFORE any effects.
  // No duplicate attempt/predecessor may race through this gate.
  const authority = claimBridgeAttemptAuthority(request.expectation, "C:\\temp");
  const child = spawnSync(process.execPath, [runner, ...args], {
    cwd: root, encoding: "utf8", maxBuffer: MAX_FRAME_BYTES * 4,
    timeout: 15 * 60 * 1000, windowsHide: true,
  });
  if (child.error || child.status === null) fail("physical-result-uncertain");
  if (![0, 1, 3].includes(child.status)) fail("physical-runner-exit-unsupported");
  if (!existsSync(request.paths.resultFile)) fail("physical-result-file-missing");
  const rawResultJson = readFileSync(request.paths.resultFile, "utf8");
  const resultJson = privatePhysicalDeviceId ?
    projectPhysicalResultForEvidence(rawResultJson, privatePhysicalDeviceId,
      request.expectation.deviceIds.windows!) : rawResultJson;
  const checkpointJson = child.status === 3 && existsSync(request.paths.checkpointFile) ?
    readFileSync(request.paths.checkpointFile, "utf8") : undefined;
  const attempt: BridgeAttempt = {
    ...request.expectation, schemaVersion: 1,
    exitCode: child.status as 0 | 1 | 3, resultJson,
    ...(checkpointJson === undefined ? {} : { checkpointJson }),
  };
  const framed = encodeBridgeAttempt(attempt);
  process.stdout.write(framed);
  authority.finish(attempt.exitCode === 0 ? "completed" :
    attempt.exitCode === 3 ? "blocked" : "failed");
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
