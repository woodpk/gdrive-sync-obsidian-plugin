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
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, win32 } from "node:path";
import { getLiveBattery } from "./battery-registry";
import { liveCommandId } from "../../src/live-device/live-scenario-executor";
import { S09A_VALIDATION_ARTIFACTS } from "./s09a-validation-artifacts";
import { scenarioDefinitionDigest } from "../../src/scenario/scenario-checkpoint";
import { bvpDiagnostic, type BvpDiagnostic } from "../../src/scenario/scenario-diagnostics";

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
  // Raw captures are private scenario-runner working memory, not PHX-CI evidence.
  // The canonical machine contains the narrowly projected, source-bound observations.
  // Discard raw captures ONLY for the registered Windows smoke, and only after
  // proving that each retained canonical observation agrees with its raw source.
  if (result.captures !== undefined) {
    const captures = record(result.captures);
    if (Object.keys(captures).length !== 0) {
      const registered = getLiveBattery("windows-live-smoke");
      const scenario = registered?.createScenario();
      if (!scenario || record(payload.battery).name !== "windows-live-smoke" ||
          result.scenarioId !== scenario.id || !evidence?.machine) {
        fail("privacy-raw-captures-unregistered");
      }
      const observations = record(evidence.machine).observations;
      if (!Array.isArray(observations)) fail("privacy-capture-observation-missing");
      const captureSteps = scenario.steps.filter(step =>
        "captureAs" in step && typeof step.captureAs === "string");
      for (const [captureAs, rawCapture] of Object.entries(captures)) {
        const sourceStep = captureSteps.find(step =>
          "captureAs" in step && step.captureAs === captureAs);
        if (!sourceStep) fail("privacy-capture-not-source-derived");
        const matches = observations.filter(value => {
          const observation = record(value);
          return observation.stepId === sourceStep.id && observation.captureAs === captureAs;
        });
        if (matches.length !== 1) fail("privacy-capture-observation-missing");
        const projected = record(record(matches[0]).value);
        const rawValue = record(rawCapture);
        for (const [field, value] of Object.entries(projected)) {
          if (JSON.stringify(rawValue[field]) !== JSON.stringify(value)) {
            fail("privacy-capture-observation-mismatch");
          }
        }
      }
      result.captures = {};
    }
  }
  if (payload.installationObservation !== undefined) {
    const install = record(payload.installationObservation);
    const devices = record(install.devices);
    // A timeout can legitimately produce no installed-device measurement.
    // Preserve that BLOCKED/FAILED evidence without inventing an observation.
    // A purported COMPLETED run, however, must still prove the exact device.
    if (Object.keys(devices).length === 0 && result.status !== "completed") {
      install.devices = {};
    } else {
      if (Object.keys(devices).length !== 1 || devices[raw] === undefined) {
        fail("privacy-physical-installation-mismatch");
      }
      install.devices = { [publicId]: devices[raw] };
    }
  }
  const publicJson = JSON.stringify(payload);
  if (publicJson.includes(raw)) fail("privacy-physical-device-id-leak");
  return publicJson;
}


/**
 * Strictly bounded S09A readiness privacy projection for the existing physical
 * PHX-CI bridge. Both real device IDs stay inside the controller process.
 * No claim of iOS physical readiness is made by calling this pure function.
 *
 * Only the registered observation-only battery is accepted; no synchronization
 * battery or arbitrary result may use the two-device projection.
 */
export function projectPhysicalDualReadinessResultForEvidence(
  resultJson: string, rawByLabel: Readonly<Record<string, string>>,
): string {
  if (!rawByLabel || typeof rawByLabel !== "object" || Array.isArray(rawByLabel) ||
      JSON.stringify(Object.keys(rawByLabel).sort()) !== JSON.stringify(["ios", "windows"])) {
    fail("privacy-dual-physical-device-labels-invalid");
  }
  const rawIds = [rawByLabel.windows!, rawByLabel.ios!];
  if (new Set(rawIds).size !== 2) fail("privacy-dual-physical-device-identity-duplicate");
  const publicIds = rawIds.map(publicPhysicalDeviceId);
  if (new Set(publicIds).size !== 2) fail("privacy-dual-physical-public-identity-duplicate");
  if (Buffer.byteLength(resultJson, "utf8") > MAX_RESULT_BYTES) fail("result-oversize");
  let payload: Record<string, unknown>;
  try { payload = record(JSON.parse(resultJson)); }
  catch { fail("privacy-dual-result-malformed"); }
  const expected = getLiveBattery("s09a-dual-device-readiness");
  const battery = record(payload.battery), result = record(payload.result);
  if (!expected || battery.name !== expected.name ||
      result.scenarioId !== expected.createScenario().id) {
    fail("privacy-dual-registered-battery-mismatch");
  }
  if (!["completed", "blocked", "failed"].includes(String(result.status))) {
    fail("privacy-dual-verdict-invalid");
  }
  const evidence = record(result.evidence);
  const machine = record(evidence.machine);
  if (evidence.machineJson !== undefined &&
      evidence.machineJson !== JSON.stringify(machine)) {
    fail("privacy-dual-original-machine-json-mismatch");
  }
  const actualIds = machine.deviceIdentities;
  if (!Array.isArray(actualIds) || actualIds.length !== 2 ||
      JSON.stringify([...actualIds].sort()) !== JSON.stringify([...rawIds].sort())) {
    fail("privacy-dual-machine-device-identities-mismatch");
  }
  if (record(machine.verdict).status !== result.status) fail("privacy-dual-verdict-mismatch");
  machine.deviceIdentities = [...publicIds].sort();
  evidence.machineJson = JSON.stringify(machine);

  // The raw captures are not transportable. Prove every projected observation
  // derives from that exact registered capture before dropping the private raw.
  if (result.captures !== undefined) {
    const captures = record(result.captures);
    const captureSteps = expected.createScenario().steps.filter(step =>
      "captureAs" in step && typeof step.captureAs === "string");
    const observations = machine.observations;
    if (!Array.isArray(observations)) fail("privacy-dual-observations-missing");
    for (const [captureAs, rawCapture] of Object.entries(captures)) {
      const step = captureSteps.find(candidate =>
        "captureAs" in candidate && candidate.captureAs === captureAs);
      if (!step) fail("privacy-dual-unregistered-capture");
      const matching = observations.filter(item => {
        const observed = record(item);
        return observed.stepId === step.id && observed.captureAs === captureAs;
      });
      if (matching.length !== 1) fail("privacy-dual-capture-observation-missing");
      const projected = record(record(matching[0]).value);
      const original = record(rawCapture);
      for (const [key, value] of Object.entries(projected)) {
        if (JSON.stringify(original[key]) !== JSON.stringify(value)) {
          fail("privacy-dual-capture-observation-mismatch");
        }
      }
    }
    result.captures = {};
  }

  const installed = record(payload.installationObservation);
  if (installed.sourceCommit !== S09A_VALIDATION_ARTIFACTS.sourceCommit ||
      installed.artifactSha256 !== S09A_VALIDATION_ARTIFACTS.artifactSha256 ||
      installed.manifestSha256 !== S09A_VALIDATION_ARTIFACTS.windowsManifestSha256) {
    fail("privacy-dual-installation-source-or-windows-manifest-mismatch");
  }
  const installations = record(installed.devices);
  const safeInstallations: Record<string, unknown> = {};
  for (const [id, observation] of Object.entries(installations)) {
    const index = rawIds.indexOf(id);
    if (index < 0) fail("privacy-dual-unapproved-installation-device");
    const actual = record(observation);
    const expectedManifest = index === 0
      ? S09A_VALIDATION_ARTIFACTS.windowsManifestSha256
      : S09A_VALIDATION_ARTIFACTS.iosManifestSha256;
    if (actual.artifactSha256 !== S09A_VALIDATION_ARTIFACTS.artifactSha256 ||
        actual.manifestSha256 !== expectedManifest) {
      fail("privacy-dual-installed-device-manifest-or-artifact-mismatch");
    }
    safeInstallations[publicIds[index]!] = actual;
  }
  if (result.status === "completed" && Object.keys(safeInstallations).length !== 2) {
    fail("privacy-dual-complete-missing-installed-device");
  }
  installed.devices = safeInstallations;
  const projected = JSON.stringify(payload);
  if (rawIds.some(id => projected.includes(id))) fail("privacy-dual-physical-device-id-leak");
  return projected;
}

function publicDeviceId(value: unknown): boolean {
  return typeof value === "string" && (PUBLIC_DEVICE_ID.test(value) ||
    (!!process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL &&
      PHX_FIXTURE_DEVICE_IDS.has(value)));
}
function deviceIdClaims(value: unknown): void {
  if (!publicDeviceId(value)) fail("privacy-device-identity-not-allowlisted");
}
const PRODUCTION_STATUS_KINDS: ReadonlySet<string> = new Set([
  "idle-ready", "planning", "syncing", "offline-deferred",
  "authentication-required", "paused", "attention-required",
  "conflict-present", "destructive-plan-blocked", "recovery-required", "error",
]);
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
      !(key === "kind" && PRODUCTION_STATUS_KINDS.has(item)) &&
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
      const dualReadiness = attempt.battery === "s09a-dual-device-readiness";
      if (dualReadiness &&
          (attempt.sourceCommit !== S09A_VALIDATION_ARTIFACTS.sourceCommit ||
           attempt.artifactSha256 !== S09A_VALIDATION_ARTIFACTS.artifactSha256 ||
           observed.manifestSha256 !== S09A_VALIDATION_ARTIFACTS.windowsManifestSha256)) {
        fail("s09a-installed-build-allowlist-mismatch");
      }
      const pairs = record(observed.devices);
      for (const [label,deviceId] of Object.entries(attempt.deviceIds)) {
        const pair = record(pairs[deviceId]);
        const expectedManifest = dualReadiness && label === "ios"
          ? S09A_VALIDATION_ARTIFACTS.iosManifestSha256 : observed.manifestSha256;
        if (pair.artifactSha256 !== attempt.artifactSha256 ||
            pair.manifestSha256 !== expectedManifest) {
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
      (live.runId !== attempt.bvpRunId && live.runId !== "run-sha256:"+digest(attempt.bvpRunId).slice(0,24)) || live.sourceCommit !== attempt.sourceCommit) {
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
  const dualReadiness = attempt.battery === "s09a-dual-device-readiness";
  if (privatePhysicalDeviceIds) {
    const expectedLabels = dualReadiness ? ["ios", "windows"] : ["windows"];
    if (!physical ||
        JSON.stringify(Object.keys(privatePhysicalDeviceIds).sort()) !== JSON.stringify(expectedLabels) ||
        Object.keys(privatePhysicalDeviceIds).some(label =>
          typeof privatePhysicalDeviceIds[label] !== "string" ||
          publicPhysicalDeviceId(privatePhysicalDeviceIds[label]!) !== attempt.deviceIds[label]) ||
        new Set(Object.values(privatePhysicalDeviceIds)).size !== expectedLabels.length) {
      fail("privacy-physical-device-routing-mismatch");
    }
  } else if (physical && dualReadiness) {
    fail("privacy-dual-physical-device-routing-required");
  }
  if (physical && (paths.physicalPluginRelayRoot !== paths.relayRoot ||
      !isApprovedWindowsPluginRelay(paths.relayRoot) ||
      !["windows-live-smoke", "s09a-dual-device-readiness"].includes(attempt.battery) ||
      JSON.stringify(Object.keys(attempt.deviceIds).sort()) !==
        JSON.stringify(dualReadiness ? ["ios", "windows"] : ["windows"]))) {
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
  // Live Drive propagation required >60s in BOTH observed physical attempts.
  // Only the approved Windows physical smoke gets the longer deadline.
  // The existing 15min PHX-owned child cap remains unchanged.
  if (physical) args.push("--result-timeout-ms", "240000");
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


/** Strictly verify a late first-device observation. Never turn the original
 * timed-out PHX-CI verdict into PASS or equate a receipt with a full battery. */
export function validateOriginalWindowsTimeoutReconciliation(
  original: unknown, late: unknown,
  expected: {runId:string; deviceId:string; sourceCommit:string; artifactSha256:string;
    manifestSha256:string; scenarioId:string; commandId:string},
): void {
  const outer=record(original), battery=record(outer.battery), result=record(outer.result);
  const steps=result.steps;
  if (battery.name!=="windows-live-smoke" || result.scenarioId!==expected.scenarioId ||
      result.status!=="blocked" || result.classification!=="device-result-unavailable" ||
      !Array.isArray(steps) || steps.length!==1 ||
      record(steps[0]).stepId!=="observe-windows-product" ||
      record(steps[0]).status!=="blocked") {
    fail("reconcile-original-not-exact-first-timeout");
  }
  const observation=record(outer.installationObservation),devices=record(observation.devices);
  if (Object.keys(devices).length!==0 ||
      observation.sourceCommit!==expected.sourceCommit ||
      observation.artifactSha256!==expected.artifactSha256 ||
      observation.manifestSha256!==expected.manifestSha256) {
    fail("reconcile-original-not-unmeasured-timeout");
  }
  const response=record(late),build=record(response.validationBuild);
  if (response.runId!==expected.runId || response.deviceId!==expected.deviceId ||
      response.sequence!==1 || response.commandId!==expected.commandId ||
      response.kind!=="observe-product" || response.status!=="completed" ||
      response.classification!=="product-observed" ||
      !response.productStatus || typeof response.productStatus!=="object" ||
      build.schemaVersion!==1 || build.sourceCommit!==expected.sourceCommit ||
      build.artifactSha256!==expected.artifactSha256 ||
      build.manifestSha256!==expected.manifestSha256) {
    fail("reconcile-late-device-receipt-invalid");
  }
}

/** The old first-command timeout left a protective, fail-closed lease. Resume
 * physical verification only after exact immutable PHX evidence and the
 * corresponding installed-build receipt prove that no old effect is pending.
 * This is state reconciliation, NOT a retroactive PHX-CI PASS or test launcher.
 */
function reconcileWindowsTimeout(target:"original"|"second"): void {
  // Retain each immutable, distinct failed PHX attempt. Reconciliation never
  // retroactively passes either run and never silently dispatches work.
  const spec=target==="original" ? {
    phx:"4edfe226-f3ef-414d-979c-78f0f3f6ea49",
    evidence:"75ebf0a24142b2c765d9e9c58b32650cfd16b794",
    verified:"46528edcf6991dedd1f2bf283e4f2a2db47524a5",
  } : {
    phx:"906d8abb-204a-4715-989b-9a88ee65beac",
    evidence:"d4d17daaac99d67142d5a8387ae466f973263af3",
    verified:"e17c2535c08b3a34a6d59960a4dd1267ca7f7803",
  };
  const oldPhx=spec.phx,oldEvidenceSha=spec.evidence,oldVerifiedSha=spec.verified;
  const sourceCommit="2bf51ca15aec9c752e3ac7769fcf3ac237df99df";
  const artifactSha256="90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7";
  const manifestSha256="d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965";
  const oldRunId="bvp-win-"+oldPhx;
  if (process.platform!=="win32" || process.env.BVP_OWNER_PHYSICAL_APPROVAL!=="YES" ||
      process.env.BVP_EXISTING_MAILBOX_ROOT_CONFIRMED!=="YES" ||
      !process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL ||
      currentRunId(resolve(process.cwd()))===oldPhx) {
    fail("reconcile-current-phx-owner-approval-required");
  }
  const ancestor=spawnSync("git",["-C",resolve(process.cwd()),"merge-base","--is-ancestor",oldEvidenceSha,"HEAD"],
    {encoding:"utf8",timeout:15000,windowsHide:true});
  const evidenceRead=spawnSync("git",["-C",resolve(process.cwd()),"show",oldEvidenceSha+":dev/_ca-output.json"],
    {encoding:"utf8",timeout:15000,maxBuffer:2*1024*1024,windowsHide:true});
  if (ancestor.error || ancestor.status!==0 || evidenceRead.error || evidenceRead.status!==0 ||
      typeof evidenceRead.stdout!=="string") fail("reconcile-original-phx-evidence-unavailable");
  const canonical=record(JSON.parse(evidenceRead.stdout)),checks=record(canonical.verification),
    changeSet=record(checks.changeSet),repoCheck=record(checks.repository);
  const originalFocused=Array.isArray(canonical.stages) ?
    canonical.stages.filter((value:unknown)=>record(value).name==="test-focused") : [];
  if (canonical.runId!==oldPhx || canonical.status!=="BLOCKED" ||
      record(canonical.repository).verifiedHead!==oldVerifiedSha ||
      changeSet.status!=="FAIL" || changeSet.stage!=="test-focused" ||
      changeSet.exitCode!==1 || repoCheck.status!=="PASS" ||
      originalFocused.length!==1 || record(originalFocused[0]).exitCode!==1 ||
      !(target==="original"
        ? String(record(originalFocused[0]).stderr??"").includes("privacy-physical-installation-mismatch")
        : String(record(originalFocused[0]).stdout??"").includes("BVP-PHXCI-BRIDGE-V1 "))) {
    fail("reconcile-original-phx-evidence-identity-mismatch");
  }
  const relay="D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay";
  const pluginRoot=win32.dirname(relay);
  const settings=record(record(JSON.parse(readFileSync(win32.join(pluginRoot,"data.json"),"utf8"))).settings);
  if (typeof settings.deviceIdentity!=="string" || !settings.vaultIdentity ||
      !settings.remoteRootId || settings.firstSyncCompleted!==true ||
      settings.startupResumeEnabled!==false || settings.localChangeEnabled!==false ||
      settings.periodicEnabled!==false) fail("reconcile-installed-pairing-changed");
  const rawId=settings.deviceIdentity,publicId=publicPhysicalDeviceId(rawId);
  if (createHash("sha256").update(readFileSync(win32.join(pluginRoot,"main.js"))).digest("hex")!==artifactSha256 ||
      createHash("sha256").update(readFileSync(win32.join(pluginRoot,"manifest.json"))).digest("hex")!==manifestSha256) {
    fail("reconcile-installed-artifact-changed");
  }
  const oldCandidates:{root:string;request:BridgeRequest}[]=[];
  for(const entry of readdirSync("C:\\temp",{withFileTypes:true})){
    if(!entry.isDirectory() || !/^[a-f0-9]{32}$/i.test(entry.name))continue;
    const root=win32.join("C:\\temp",entry.name),reqFile=win32.join(root,"bridge-request.json");
    if(!existsSync(reqFile))continue;
    if(lstatSync(root).isSymbolicLink() || lstatSync(reqFile).isSymbolicLink()) {
      fail("reconcile-original-scratch-reparse-point");
    }
    let candidate:BridgeRequest;
    try{candidate=record(JSON.parse(readFileSync(reqFile,"utf8"))) as unknown as BridgeRequest;}
    catch{continue;} // Unrelated scratch requests are not part of this exact timeout.
    if(candidate!.expectation?.phxRunId===oldPhx)oldCandidates.push({root,request:candidate!});
  }
  if(oldCandidates.length!==1)fail("reconcile-original-request-not-unique");
  const {root:oldScratch,request}=oldCandidates[0]!;
  // The second run can be released only after the first run was already
  // reconciled and its exclusive locks are no longer held.
  if(target==="second"){
    const firstRun="bvp-win-4edfe226-f3ef-414d-979c-78f0f3f6ea49";
    const priorLogical=win32.join("C:\\temp",createHash("sha256")
      .update("bvp-s09-r2-lease-v1:logical:"+firstRun).digest("hex").slice(0,32));
    if(!existsSync(win32.join(priorLogical,"index-1")) ||
       existsSync(win32.join(priorLogical,"active"))){
      fail("reconcile-prior-first-run-unreconciled");
    }
  }
  const def=getLiveBattery("windows-live-smoke");
  if(!def)fail("reconcile-smoke-battery-missing");
  const scenario=def.createScenario();
  if(request.schemaVersion!==1 || request.executionClass!=="owner-approved-physical" ||
      request.expectation.mode!=="initial" || request.expectation.attemptIndex!==1 ||
      request.expectation.bvpRunId!==oldRunId ||
      request.expectation.sourceCommit!==sourceCommit ||
      request.expectation.artifactSha256!==artifactSha256 ||
      request.expectation.scenarioId!==scenario.id ||
      request.expectation.scenarioDigest!==scenarioDefinitionDigest(scenario) ||
      request.expectation.deviceIds.windows!==publicId ||
      request.paths.relayRoot!==relay ||
      win32.normalize(request.paths.resultFile).toLowerCase()!==
        win32.normalize(win32.join(oldScratch,"result.json")).toLowerCase()) {
    fail("reconcile-original-request-identity-mismatch");
  }
  const originalResultFile=win32.join(oldScratch,"result.json");
  if(!existsSync(originalResultFile) || lstatSync(originalResultFile).isSymbolicLink()) {
    fail("reconcile-original-result-file-invalid");
  }
  const original=JSON.parse(readFileSync(originalResultFile,"utf8")) as unknown;
  const commandId=liveCommandId(oldRunId,scenario.id,0,0);
  const inbox=win32.join(relay,"inbox");
  const replies:unknown[]=[];
  for(const file of readdirSync(inbox,{withFileTypes:true})){
    if(!file.isFile() || !file.name.endsWith(".result.json"))continue;
    const full=win32.join(inbox,file.name);
    if(lstatSync(full).isSymbolicLink())fail("reconcile-inbox-symlink");
    const data=record(JSON.parse(readFileSync(full,"utf8")));
    if(data.runId===oldRunId)replies.push(data);
  }
  if(replies.length!==1)fail("reconcile-original-receipt-not-unique");
  validateOriginalWindowsTimeoutReconciliation(original,replies[0]!,{
    runId:oldRunId,deviceId:rawId,sourceCommit,artifactSha256,manifestSha256,
    scenarioId:scenario.id,commandId,
  });
  // The timed-out run reached precisely the observation, never the fixture put.
  const vault=win32.dirname(win32.dirname(win32.dirname(win32.dirname(relay))));
  if(existsSync(win32.join(vault,"BVP-VALIDATION",oldRunId,"windows-first-sync-canary.md"))) {
    fail("reconcile-original-fixture-effect-unexpected");
  }
  for(const dir of ["outbox","sent"]){
    const location=win32.join(relay,dir);
    if(!existsSync(location) || readdirSync(location).length!==0)
      fail("reconcile-relay-has-pending-commands");
  }
  const authorityDir=win32.join(relay,"controller-authority");
  const authorityKey=createHash("sha256").update(rawId).digest("hex");
  const authorityFile=win32.join(authorityDir,authorityKey+".json");
  const stored=record(JSON.parse(readFileSync(authorityFile,"utf8")));
  if(stored.schemaVersion!==1 || stored.deviceId!==rawId || stored.runId!==oldRunId ||
      !Number.isSafeInteger(stored.generation) || Number(stored.generation)<=0) {
    fail("reconcile-original-controller-authority-mismatch");
  }
  const key=(label:string)=>win32.join("C:\\temp",
    createHash("sha256").update("bvp-s09-r2-lease-v1:"+label).digest("hex").slice(0,32));
  const logical=key("logical:"+oldRunId),device=key("device:"+publicId);
  if(logical===device)fail("reconcile-lease-key-collision");
  for(const directory of [logical,device]){
    if(!existsSync(directory) || lstatSync(directory).isSymbolicLink() ||
        !existsSync(win32.join(directory,"active")) ||
        !lstatSync(win32.join(directory,"active")).isDirectory() ||
        readdirSync(win32.join(directory,"active")).length!==0) {
      fail("reconcile-exclusive-lease-not-intact");
    }
  }
  if(!existsSync(win32.join(logical,"index-1")) ||
      !existsSync(win32.join(logical,"phx-"+oldPhx))) {
    fail("reconcile-original-lease-journal-incomplete");
  }
  // Serialize with the same per-device filesystem lock as the live executor.
  const lock=authorityFile+".lock";
  let fd:number;
  try{fd=openSync(lock,"wx");}catch{fail("reconcile-controller-authority-in-use");}
  try{
    const current=record(JSON.parse(readFileSync(authorityFile,"utf8")));
    if(current.runId!==oldRunId || current.deviceId!==rawId ||
        current.generation!==stored.generation)fail("reconcile-controller-authority-raced");
    for(const dir of ["outbox","sent"]){
      if(readdirSync(win32.join(relay,dir)).length!==0)fail("reconcile-pending-command-race");
    }
    const tmp=win32.join(authorityDir,"."+authorityKey+".reconcile-"+process.pid+".tmp");
    writeFileSync(tmp,JSON.stringify({...current,runId:null}),{flag:"wx",encoding:"utf8"});
    renameSync(tmp,authorityFile);
    rmdirSync(win32.join(device,"active"));
    rmdirSync(win32.join(logical,"active"));
  }finally{closeSync(fd!);rmSync(lock,{force:true});}
  console.log("BVP_WINDOWS_TIMEOUT_RECONCILED attempt="+target+" status=BLOCKED lateReceipt=COMPLETED oldFixture=ABSENT pendingCommands=0 oldLeases=RELEASED");
}

/** Recover exact previously executed physical evidence without another device command.
 * This is PHX-CI-focused retrospective observation; it never re-runs the
 * six-step scenario or changes the original PHX-CI BLOCKED verdict.
 */
function recoverPrivacyBlockedWindowsSmoke(): void {
  const oldPhx="9103e8af-eb3d-4579-bff9-6230ff0a6bec";
  const evidenceSha="18d12ee3d3cd67dd36824ed78356da4d4e94d75a";
  const oldHead="f77017b00d73dc283b83aa56d0ac5916184fa8c0";
  const root=resolve(process.cwd());
  if (process.platform!=="win32" || !process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL ||
      currentRunId(root)===oldPhx) fail("privacy-recovery-phx-context-required");
  const git=(args:string[])=>spawnSync("git",["-C",root,...args],
    {encoding:"utf8",timeout:15000,maxBuffer:2*1024*1024,windowsHide:true});
  const ancestor=git(["merge-base","--is-ancestor",evidenceSha,"HEAD"]);
  const prior=git(["show",evidenceSha+":dev/_ca-output.json"]);
  if(ancestor.status!==0 || prior.status!==0 || prior.error ||
      typeof prior.stdout!=="string") fail("privacy-recovery-original-evidence-unavailable");
  const envelope=record(JSON.parse(prior.stdout)),verify=record(envelope.verification);
  const focused=Array.isArray(envelope.stages)?
    envelope.stages.filter((v:unknown)=>record(v).name==="test-focused"):[];
  if(envelope.runId!==oldPhx || envelope.status!=="BLOCKED" ||
      record(envelope.repository).verifiedHead!==oldHead ||
      record(verify.changeSet).status!=="FAIL" ||
      record(verify.repository).status!=="PASS" ||
      focused.length!==1 || record(focused[0]).exitCode!==1 ||
      !String(record(focused[0]).stderr??"").includes("privacy-raw-captures-not-transportable") ||
      !String(record(focused[0]).stdout??"").includes("BVP_WINDOWS_TIMEOUT_RECONCILED attempt=second")) {
    fail("privacy-recovery-original-failure-identity-mismatch");
  }
  // On the original failed stage, the child result file was fully persisted;
  // only the privacy projection/publisher failed after child completion.
  const candidates:{root:string;request:BridgeRequest}[]=[];
  for (const item of readdirSync("C:\\temp",{withFileTypes:true})) {
    if (!item.isDirectory() || !/^[a-f0-9]{32}$/i.test(item.name)) continue;
    const scratch=win32.join("C:\\temp",item.name),file=win32.join(scratch,"bridge-request.json");
    if (!existsSync(file)) continue;
    if (lstatSync(scratch).isSymbolicLink() || lstatSync(file).isSymbolicLink()) {
      fail("privacy-recovery-scratch-reparse-point");
    }
    let request:BridgeRequest;
    try { request=record(JSON.parse(readFileSync(file,"utf8"))) as unknown as BridgeRequest; }
    catch { continue; }
    if (request.expectation?.phxRunId===oldPhx) candidates.push({root:scratch,request});
  }
  if (candidates.length!==1) fail("privacy-recovery-original-request-not-unique");
  const {root:scratch,request}=candidates[0]!;
  const originalBattery=getLiveBattery("windows-live-smoke");
  const scenario=originalBattery?.createScenario();
  if (request.executionClass!=="owner-approved-physical" ||
      request.ownerPhysicalApproval?.approved!==true ||
      request.expectation.phxRunId!==oldPhx ||
      request.expectation.bvpRunId!=="bvp-win-"+oldPhx ||
      request.expectation.attemptIndex!==1 ||
      request.expectation.mode!=="initial" ||
      request.expectation.battery!=="windows-live-smoke" ||
      request.expectation.scenarioId!==scenario?.id ||
      request.expectation.scenarioDigest!==scenarioDefinitionDigest(scenario!) ||
      request.expectation.sourceCommit!=="2bf51ca15aec9c752e3ac7769fcf3ac237df99df" ||
      request.expectation.artifactSha256!=="90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7" ||
      !request.paths.physicalPluginRelayRoot ||
      !isApprovedWindowsPluginRelay(request.paths.relayRoot) ||
      request.paths.physicalPluginRelayRoot!==request.paths.relayRoot ||
      win32.normalize(request.paths.resultFile).toLowerCase()!==
        win32.join(scratch,"result.json").toLowerCase()) {
    fail("privacy-recovery-original-request-invalid");
  }
  enforceScratch(request.paths);
  const resultFile=win32.join(scratch,"result.json");
  if (!existsSync(resultFile) || lstatSync(resultFile).isSymbolicLink()) {
    fail("privacy-recovery-original-result-missing");
  }
  const rawJson=readFileSync(resultFile,"utf8"),rawResult=record(JSON.parse(rawJson));
  const status=record(rawResult.result).status;
  if (!["completed","blocked","failed"].includes(String(status))) {
    fail("privacy-recovery-unsupported-result-status");
  }
  const deviceSetting=record(record(JSON.parse(readFileSync(
    win32.join(win32.dirname(request.paths.relayRoot),"data.json"),"utf8"))).settings);
  const rawId=deviceSetting.deviceIdentity;
  if(typeof rawId!=="string" ||
      publicPhysicalDeviceId(rawId)!==request.expectation.deviceIds.windows) {
    fail("privacy-recovery-physical-device-identity-changed");
  }
  const publicResult=projectPhysicalResultForEvidence(rawJson,rawId,
    request.expectation.deviceIds.windows!);
  const attempt:BridgeAttempt={
    ...request.expectation,schemaVersion:1,
    // A blocked non-checkpoint attempt is a completed runner with exit 1, not
    // checkpoint exit 3; only durable checkpoint results may use exit 3.
    exitCode:status==="completed"?0:1,
    resultJson:publicResult,
  };
  // Decode+validate the exact recovered public transport shape in memory.
  // No raw capture, private device identity or original text may reach stdout.
  const frame=encodeBridgeAttempt(attempt);
  const verified=decodeBridgeAttempt(frame,request.expectation);
  const result=record(JSON.parse(verified.resultJson)),machine=record(record(record(result.result).evidence).machine);
  const steps=record(result.result).steps;
  if (!Array.isArray(steps) || !Array.isArray(machine.assertions)) {
    fail("privacy-recovery-derived-evidence-incomplete");
  }
  const complete=steps.length===scenario!.steps.length &&
    steps.every((v:unknown)=>record(v).status==="completed");
  // A complete original battery can be independently observed without rerunning
  // any fixture; partial results remain blocked as originally recorded.
  console.log("BVP_S09_ORIGINAL_PHYSICAL_EVIDENCE_RECOVERED status="+String(status)+
    " steps="+steps.length+"/"+scenario!.steps.length+
    " allStepsCompleted="+(complete?"YES":"NO")+
    " originalPhx=BLOCKED rawCaptures=REDACTED");
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
  const installedSource = S09A_VALIDATION_ARTIFACTS.sourceCommit;
  const installedHash = S09A_VALIDATION_ARTIFACTS.artifactSha256;
  const manifestHash = S09A_VALIDATION_ARTIFACTS.windowsManifestSha256;
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


/**
 * Prepares a distinct S09A readiness request from the same already-approved
 * Windows validation installation. The iOS ID is furnished privately by the
 * owner from the isolated iOS test vault; the digest alone enters PHX evidence.
 *
 * This creates only a local request. The PHX runner remains subject to separate
 * physical approval, exact installed-build receipts, and all bridge gates.
 */
function prepareApprovedS09ADualReadinessRequest(): string {
  if (process.env.BVP_S09A_DUAL_OWNER_APPROVAL !== "YES" ||
      process.env.BVP_IOS_VALIDATION_READY_CONFIRMED !== "YES") {
    fail("s09a-dual-physical-authorization-required");
  }
  const rawIos = process.env.BVP_IOS_DEVICE_ID;
  if (!rawIos) fail("s09a-ios-private-routing-identity-required");
  const publicIos = publicPhysicalDeviceId(rawIos);
  const windowsRequestPath = prepareApprovedWindowsSmokeRequest();
  const base = record(JSON.parse(readFileSync(windowsRequestPath, "utf8")));
  const original = record(base.expectation);
  const windowsIds = record(original.deviceIds);
  const windowPublic = windowsIds.windows;
  if (typeof windowPublic !== "string" || windowPublic === publicIos) {
    fail("s09a-distinct-physical-device-identity-required");
  }
  const registered = getLiveBattery("s09a-dual-device-readiness");
  if (!registered ||
      JSON.stringify(registered.requiredDeviceLabels) !== JSON.stringify(["windows", "ios"]) ||
      registered.createScenario().steps.some(step =>
        !["observe", "assert"].includes(step.kind))) {
    fail("s09a-dual-observation-only-battery-invalid");
  }
  const scenario = registered.createScenario();
  const dual: BridgeRequest = {
    schemaVersion: 1, executionClass: "owner-approved-physical",
    ownerPhysicalApproval: { approved: true, scope: "S09A-DUAL-OBSERVATION-ONLY" },
    expectation: {
      ...original as unknown as BridgeExpectation,
      bvpRunId: "bvp-s09a-" + String(original.phxRunId),
      battery: registered.name, scenarioId: scenario.id,
      scenarioDigest: scenarioDefinitionDigest(scenario),
      deviceIds: { windows: windowPublic, ios: publicIos },
    },
    paths: base.paths as LiveRunnerPaths,
  };
  const dualFile = win32.join(dirname(windowsRequestPath), "s09a-dual-bridge-request.json");
  writeFileSync(dualFile, JSON.stringify(dual), { encoding: "utf8", flag: "wx" });
  return dualFile;
}

/** PHX-only stage subcommand: no external status publisher or checkpoint repository writer. */
export async function main(): Promise<void> {
  if (process.argv.includes("--recover-privacy-blocked-windows-smoke")) {
    recoverPrivacyBlockedWindowsSmoke();
    return;
  }
  if (process.argv.includes("--reconcile-original-windows-timeout")) {
    reconcileWindowsTimeout("original");
    return;
  }
  if (process.argv.includes("--reconcile-second-windows-timeout")) {
    reconcileWindowsTimeout("second");
    return;
  }
  const file = cliArgument("--bridge-request-file") ?? (
    process.argv.includes("--run-approved-s09a-dual-readiness")
      ? prepareApprovedS09ADualReadinessRequest()
      : process.argv.includes("--run-approved-windows-smoke")
        ? prepareApprovedWindowsSmokeRequest() : undefined
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
    request.ownerPhysicalApproval.scope !== (
      request.expectation.battery === "s09a-dual-device-readiness"
        ? "S09A-DUAL-OBSERVATION-ONLY" : "S09-EXACT-OWNER-APPROVED") ||
    process.env.BVP_OWNER_PHYSICAL_APPROVAL !== "YES" ||
    (request.expectation.battery === "s09a-dual-device-readiness" &&
      (process.env.BVP_S09A_DUAL_OWNER_APPROVAL !== "YES" ||
       process.env.BVP_IOS_VALIDATION_READY_CONFIRMED !== "YES"))) {
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
        !["windows-live-smoke", "s09a-dual-device-readiness"].includes(request.expectation.battery)) {
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
      // Controller-only adaptation: installed 0.1.19 Windows bytes and plugin
      // source remain frozen. These files only correlate exact iOS prerelease proof.
      "test-platform/test/batteries/s09a-validation-artifacts.ts",
      "test-platform/src/live-device/live-scenario-executor.ts",
      "test-platform/test/batteries/run-live-battery.ts",
      "test-platform/test/s09-windows-direct-relay-route.test.ts",
      "test-platform/test/s09-windows-privacy-transport.test.ts",
      "test-platform/test/s09a-dual-device-readiness.test.ts",
      "test-platform/test/s09a-physical-dual-bridge.test.ts",
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
  let privateIosDeviceId: string | undefined;
  const dualReadiness = request.expectation.battery === "s09a-dual-device-readiness";
  // No shipping plugin changes: verify the *actual* installed Windows validation
  // files and settled pairing. On iOS, the physical device's returned installed
  // build measurement must independently prove the matching validation artifact.
  if (!simulated) {
    if (!["windows-live-smoke", "s09a-dual-device-readiness"].includes(request.expectation.battery) ||
        !request.paths.physicalPluginRelayRoot ||
        JSON.stringify(Object.keys(request.expectation.deviceIds).sort()) !==
          JSON.stringify(dualReadiness ? ["ios", "windows"] : ["windows"])) {
      fail("physical-approved-readiness-only");
    }
    if (dualReadiness) {
      privateIosDeviceId = process.env.BVP_IOS_DEVICE_ID;
      if (!privateIosDeviceId ||
          publicPhysicalDeviceId(privateIosDeviceId) !== request.expectation.deviceIds.ios ||
          process.env.BVP_IOS_VALIDATION_READY_CONFIRMED !== "YES") {
        fail("s09a-ios-identity-or-approval-mismatch");
      }
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
  const physicalDeviceMap = privatePhysicalDeviceId ? {
    windows: privatePhysicalDeviceId,
    ...(dualReadiness && privateIosDeviceId ? { ios: privateIosDeviceId } : {}),
  } : undefined;
  const args = buildLiveRunnerArguments(staged, request.paths,
    request.resumeEvidence ?? [], request.expectation.mode === "verified-late-receipt",
    physicalDeviceMap);
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
  const resultJson = dualReadiness && physicalDeviceMap ?
    projectPhysicalDualReadinessResultForEvidence(rawResultJson, physicalDeviceMap) :
    privatePhysicalDeviceId ?
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
/** Fixed-boundary bridge diagnostic; no assumptions about device dispatch or effects. */
export function bridgeFailureDiagnostic(error:unknown):{
  readonly code:string;readonly diagnostic:BvpDiagnostic;
}{
  const candidate=error instanceof Error?error.message:"";
  const code=/^bvp-phxci-bridge-[a-z0-9-]{1,70}$/.test(candidate)?
    candidate:"bvp-phxci-bridge-unexpected-internal-error";
  const diagnostic=bvpDiagnostic({
    classification:code.replace(/^bvp-phxci-/,""),component:"battery-runner",
    phase:"bridge-controller",lastConfirmedBoundary:"bridge-entrypoint",
    firstUnconfirmedBoundary:"bridge-outcome",effect:"unknown",
    recommendedAction:"inspect-bridge-evidence",
  });
  return{code,diagnostic};
}
if (require.main === module) {
  main().catch(error => {
    // Never print an original stack, exception message, raw path or device ID.
    const failure=bridgeFailureDiagnostic(error);
    console.error("BVP_PHXCI_BRIDGE_BLOCKED "+failure.code);
    console.error("BVP_PHXCI_BRIDGE_DIAGNOSTIC "+JSON.stringify(failure.diagnostic));
    process.exitCode=1;
  });
}
