import { createHash } from "node:crypto";

import type { ScenarioDefinition, ScenarioExecutionMode } from "./scenario-contract";
import type { CanonicalScenarioEvidence } from "./scenario-evidence";
import type { ScenarioExecutionStatus, ScenarioStepExecution } from "./scenario-runner";

const SCHEMA_VERSION = 1 as const;
const MAX_BYTES = 32 * 1024;
const MAX_RESULTS = 256;
const MAX_DEVICES = 16;
const MAX_TEXT = 256;
declare const checkpointBrand: unique symbol;

export type ScenarioResumeDisposition =
  | "not-issued"
  | "awaiting-resume"
  | "reobserve-required"
  | "completed-recorded";
export type ScenarioResumeEvidence =
  | "human-confirmation"
  | "external-observation"
  | "production-result"
  | "canonical-evidence";

export interface ScenarioCheckpointStepResult {
  readonly index: number;
  readonly stepId: string;
  readonly status: ScenarioExecutionStatus;
  readonly classification?: string;
  readonly matchedExpectation: boolean;
}

export interface ScenarioCheckpointEvidenceSummary {
  readonly digest: string;
  readonly verdictStatus: string;
  readonly assertionCount: number;
  readonly observationCount: number;
}

interface ScenarioCheckpointData {
  readonly schemaVersion: 1;
  readonly checkpointId: string;
  readonly scenarioId: string;
  readonly runId: string;
  readonly executionMode: ScenarioExecutionMode;
  readonly scenarioStepCount: number;
  readonly nextStepIndex: number;
  readonly disposition: ScenarioResumeDisposition;
  readonly results: readonly ScenarioCheckpointStepResult[];
  readonly deviceIdentities: readonly string[];
  readonly requiredResumeEvidence: readonly ScenarioResumeEvidence[];
  readonly evidence?: ScenarioCheckpointEvidenceSummary;
}

export type ScenarioCheckpoint = ScenarioCheckpointData & {
  readonly [checkpointBrand]: true;
};

export type ScenarioCheckpointFailure =
  | "checkpoint-malformed"
  | "checkpoint-incompatible-version"
  | "checkpoint-scenario-mismatch"
  | "checkpoint-run-mismatch"
  | "checkpoint-execution-mode-mismatch"
  | "checkpoint-execution-context-mismatch";

export type ScenarioCheckpointResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly classification: ScenarioCheckpointFailure };

export interface CreateScenarioCheckpointInput {
  readonly checkpointId: string;
  readonly scenario: ScenarioDefinition;
  readonly runId: string;
  readonly executionMode: ScenarioExecutionMode;
  readonly nextStepIndex: number;
  readonly disposition: ScenarioResumeDisposition;
  readonly steps?: readonly ScenarioStepExecution[];
  readonly deviceIdentities?: readonly string[];
  readonly requiredResumeEvidence?: readonly ScenarioResumeEvidence[];
  readonly evidence?: CanonicalScenarioEvidence;
}

export interface ScenarioResumeContext {
  readonly scenario: ScenarioDefinition;
  readonly runId: string;
  readonly executionMode: ScenarioExecutionMode;
  readonly deviceIdentities?: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= MAX_TEXT;
const integer = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const exactKeys = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean => {
  const keys = Object.keys(value);
  return required.every(key => keys.includes(key)) &&
    keys.every(key => required.includes(key) || optional.includes(key));
};
const sortedUnique = (values: readonly string[]): string[] => [...new Set(values)].sort();
const sameStrings = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const STATUSES = new Set<ScenarioExecutionStatus>(["completed", "failed", "blocked", "unsupported"]);
const MODES = new Set<ScenarioExecutionMode>(["deterministic", "live"]);
const DISPOSITIONS = new Set<ScenarioResumeDisposition>(["not-issued", "awaiting-resume", "reobserve-required", "completed-recorded"]);
const RESUME_EVIDENCE = new Set<ScenarioResumeEvidence>(["human-confirmation", "external-observation", "production-result", "canonical-evidence"]);

function evidenceSummary(evidence: CanonicalScenarioEvidence | undefined): ScenarioCheckpointEvidenceSummary | undefined {
  if (!evidence) return undefined;
  return {
    digest: `sha256:${createHash("sha256").update(evidence.machineJson).digest("hex")}`,
    verdictStatus: evidence.machine.verdict.status,
    assertionCount: evidence.machine.assertions.length,
    observationCount: evidence.machine.observations.length,
  };
}

function validStepResult(value: unknown): value is ScenarioCheckpointStepResult {
  if (!isRecord(value) || !exactKeys(value, ["index", "stepId", "status", "matchedExpectation"], ["classification"])) return false;
  return integer(value.index) && text(value.stepId) && STATUSES.has(value.status as ScenarioExecutionStatus) &&
    typeof value.matchedExpectation === "boolean" && (value.classification === undefined || text(value.classification));
}

function validEvidence(value: unknown): value is ScenarioCheckpointEvidenceSummary {
  if (!isRecord(value) || !exactKeys(value, ["digest", "verdictStatus", "assertionCount", "observationCount"])) return false;
  return typeof value.digest === "string" && /^sha256:[0-9a-f]{64}$/.test(value.digest) &&
    text(value.verdictStatus) && integer(value.assertionCount) && integer(value.observationCount);
}

function validateData(value: unknown): ScenarioCheckpointResult<ScenarioCheckpoint> {
  if (!isRecord(value)) return { ok: false, classification: "checkpoint-malformed" };
  if (value.schemaVersion !== SCHEMA_VERSION) return { ok: false, classification: "checkpoint-incompatible-version" };
  if (!exactKeys(value, [
    "schemaVersion", "checkpointId", "scenarioId", "runId", "executionMode", "scenarioStepCount",
    "nextStepIndex", "disposition", "results", "deviceIdentities", "requiredResumeEvidence",
  ], ["evidence"])) return { ok: false, classification: "checkpoint-malformed" };

  if (!text(value.checkpointId) || !text(value.scenarioId) || !text(value.runId) ||
      !MODES.has(value.executionMode as ScenarioExecutionMode) ||
      !integer(value.scenarioStepCount) || !integer(value.nextStepIndex) ||
      value.nextStepIndex > value.scenarioStepCount ||
      !DISPOSITIONS.has(value.disposition as ScenarioResumeDisposition) ||
      !Array.isArray(value.results) || value.results.length > MAX_RESULTS || !value.results.every(validStepResult) ||
      !Array.isArray(value.deviceIdentities) || value.deviceIdentities.length > MAX_DEVICES || !value.deviceIdentities.every(text) ||
      !Array.isArray(value.requiredResumeEvidence) || !value.requiredResumeEvidence.every(item => RESUME_EVIDENCE.has(item as ScenarioResumeEvidence)) ||
      (value.evidence !== undefined && !validEvidence(value.evidence))) {
    return { ok: false, classification: "checkpoint-malformed" };
  }

  const results = value.results as ScenarioCheckpointStepResult[];
  if (results.some((result, index) => result.index >= value.nextStepIndex || (index > 0 && result.index <= results[index - 1]!.index))) {
    return { ok: false, classification: "checkpoint-malformed" };
  }
  const devices = value.deviceIdentities as string[];
  const resumeEvidence = value.requiredResumeEvidence as ScenarioResumeEvidence[];
  if (!sameStrings(devices, sortedUnique(devices)) || resumeEvidence.length !== new Set(resumeEvidence).size) {
    return { ok: false, classification: "checkpoint-malformed" };
  }
  if (value.disposition === "awaiting-resume" && resumeEvidence.length === 0) {
    return { ok: false, classification: "checkpoint-malformed" };
  }

  return { ok: true, value: value as unknown as ScenarioCheckpoint };
}

export function createScenarioCheckpoint(input: CreateScenarioCheckpointInput): ScenarioCheckpointResult<ScenarioCheckpoint> {
  if (!input.scenario.executionModes.includes(input.executionMode)) {
    return { ok: false, classification: "checkpoint-execution-mode-mismatch" };
  }
  const results = (input.steps ?? [])
    .filter(step => step.index < input.nextStepIndex)
    .map(step => ({
      index: step.index,
      stepId: step.stepId,
      status: step.status,
      ...(step.classification === undefined ? {} : { classification: step.classification }),
      matchedExpectation: step.matchedExpectation,
    }));
  const data: ScenarioCheckpointData = {
    schemaVersion: SCHEMA_VERSION,
    checkpointId: input.checkpointId,
    scenarioId: input.scenario.id,
    runId: input.runId,
    executionMode: input.executionMode,
    scenarioStepCount: input.scenario.steps.length,
    nextStepIndex: input.nextStepIndex,
    disposition: input.disposition,
    results,
    deviceIdentities: sortedUnique(input.deviceIdentities ?? []),
    requiredResumeEvidence: [...new Set(input.requiredResumeEvidence ?? [])].sort(),
    ...(input.evidence === undefined ? {} : { evidence: evidenceSummary(input.evidence)! }),
  };
  return validateData(data);
}

export function encodeScenarioCheckpoint(checkpoint: ScenarioCheckpoint): string {
  return JSON.stringify(checkpoint);
}

export function decodeScenarioCheckpoint(serialized: string): ScenarioCheckpointResult<ScenarioCheckpoint> {
  if (serialized.length === 0 || Buffer.byteLength(serialized, "utf8") > MAX_BYTES) {
    return { ok: false, classification: "checkpoint-malformed" };
  }
  try {
    return validateData(JSON.parse(serialized));
  } catch {
    return { ok: false, classification: "checkpoint-malformed" };
  }
}

export function validateScenarioCheckpointForResume(
  checkpoint: ScenarioCheckpoint,
  context: ScenarioResumeContext,
): ScenarioCheckpointResult<ScenarioCheckpoint> {
  if (checkpoint.scenarioId !== context.scenario.id || checkpoint.scenarioStepCount !== context.scenario.steps.length) {
    return { ok: false, classification: "checkpoint-scenario-mismatch" };
  }
  if (checkpoint.runId !== context.runId) return { ok: false, classification: "checkpoint-run-mismatch" };
  if (checkpoint.executionMode !== context.executionMode || !context.scenario.executionModes.includes(context.executionMode)) {
    return { ok: false, classification: "checkpoint-execution-mode-mismatch" };
  }
  const expectedDevices = sortedUnique(context.deviceIdentities ?? []);
  if (!sameStrings(checkpoint.deviceIdentities, expectedDevices)) {
    return { ok: false, classification: "checkpoint-execution-context-mismatch" };
  }
  return { ok: true, value: checkpoint };
}

export class InMemoryScenarioCheckpointStore {
  private readonly encoded = new Map<string, string>();

  save(checkpoint: ScenarioCheckpoint): void {
    this.encoded.set(checkpoint.checkpointId, encodeScenarioCheckpoint(checkpoint));
  }

  load(checkpointId: string): ScenarioCheckpointResult<ScenarioCheckpoint> {
    const stored = this.encoded.get(checkpointId);
    return stored === undefined
      ? { ok: false, classification: "checkpoint-malformed" }
      : decodeScenarioCheckpoint(stored);
  }
}
