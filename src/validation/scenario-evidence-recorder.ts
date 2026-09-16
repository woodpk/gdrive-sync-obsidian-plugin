import type { SynchronizationPlan } from "../contracts";
import { diagnosticPathKey, sanitizeDiagnosticText } from "../diagnostics/diagnostic-logger";
import { isCanonicalSha256, sha256Text } from "../util/sha256";
import {
  PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
  VALIDATION_EVIDENCE_PRIVACY,
  VALIDATION_EVIDENCE_SCHEMA_VERSION,
  scenarioEvidenceVerdict,
  validationEvidenceId,
  type ValidationEvidenceRecord,
  type ValidationScenarioEvidenceVerdict,
} from "./coordination-evidence-contracts";
import type {
  ValidationAssertionObservation,
  ValidationEvidenceRef,
  ValidationFaultResult,
  ValidationPlanExpectation,
} from "./driver-plan-fault-verifier-contracts";
import type {
  HumanCheckpoint,
  HumanCheckpointResumeState,
  ValidationDeviceId,
  ValidationDeviceIdentity,
  ValidationFixtureIdentity,
  ValidationRunIdentity,
  ValidationStepId,
} from "./run-sandbox-checkpoint-contracts";

export const VALIDATION_SCENARIO_EVIDENCE_RECORD_SCHEMA_VERSION = 1 as const;
export const VALIDATION_SUITE_EVIDENCE_SCHEMA_VERSION = 1 as const;

export const VALIDATION_SCENARIO_EVIDENCE_REQUIREMENTS = [
  "pre-diagnostics",
  "post-diagnostics",
  "fixtures",
  "expected-plan",
  "actual-plan",
  "correlations",
  "revisions",
  "timing",
  "faults",
  "checkpoints",
  "assertions",
] as const;
export type ValidationScenarioEvidenceRequirement = (typeof VALIDATION_SCENARIO_EVIDENCE_REQUIREMENTS)[number];

export interface ValidationBuildEvidence {
  readonly version: string;
  readonly commitSha?: string;
}

export interface ValidationFixtureEvidenceInput {
  readonly fixture: ValidationFixtureIdentity;
  readonly sizeBytes: number;
  readonly contentHash: string;
}

export interface ValidationCorrelationEvidenceInput {
  readonly intentIds?: readonly string[];
  readonly effectIds?: readonly string[];
  readonly requestIds?: readonly string[];
  readonly remoteObjectIds?: readonly string[];
}

export interface ValidationRevisionEvidenceInput {
  readonly operationId?: string;
  readonly remoteObjectId?: string;
  readonly expectedRevision?: string;
  readonly observedRevision?: string;
  readonly persistenceRevision?: number;
  readonly semanticGeneration?: number;
  readonly stateRevision?: number;
}

export interface ValidationTimingEvidenceInput {
  readonly planningMs?: number;
  readonly executionMs?: number;
  readonly elapsedMs?: number;
}

export interface ValidationCheckpointEvidenceInput {
  readonly checkpoint: HumanCheckpoint;
  readonly state: HumanCheckpointResumeState;
}

export interface ValidationScenarioEvidenceInput {
  readonly run: ValidationRunIdentity;
  readonly primaryDeviceId: ValidationDeviceId;
  readonly devices: readonly ValidationDeviceIdentity[];
  readonly build: ValidationBuildEvidence;
  readonly capturedAt: string;
  readonly preDiagnosticRefs: readonly ValidationEvidenceRef[];
  readonly postDiagnosticRefs: readonly ValidationEvidenceRef[];
  readonly fixtures: readonly ValidationFixtureEvidenceInput[];
  readonly expectedPlan?: ValidationPlanExpectation;
  readonly actualPlan?: SynchronizationPlan;
  readonly correlations?: ValidationCorrelationEvidenceInput;
  readonly revisions: readonly ValidationRevisionEvidenceInput[];
  readonly timing?: ValidationTimingEvidenceInput;
  readonly faults: readonly ValidationFaultResult[];
  readonly checkpoints: readonly ValidationCheckpointEvidenceInput[];
  readonly assertions: readonly ValidationAssertionObservation[];
  readonly requiredEvidence: readonly ValidationScenarioEvidenceRequirement[];
  readonly requestedStatus: "PASS" | "FAIL" | "BLOCKED" | "PAUSED";
  readonly blockerCodes?: readonly string[];
  readonly resumeStepId?: ValidationStepId;
}

interface SafePlanOperationEvidence {
  readonly operationId?: string;
  readonly kind: string;
  readonly pathKey: string;
  readonly destructive: boolean;
  readonly targetSide?: string;
  readonly fromPathKey?: string;
  readonly toPathKey?: string;
  readonly remoteObjectId?: string;
}

interface SafeExpectedPlanEvidence {
  readonly expectedTrigger?: string;
  readonly operationCount: number;
  readonly operations: readonly SafePlanOperationEvidence[];
  readonly allowedBackgroundKinds: readonly string[];
  readonly forbiddenKinds: readonly string[];
  readonly conflictExpectation: string;
  readonly destructiveExpectation: string;
  readonly expectedExecutionDisposition?: string;
  readonly expectedGlobalExecutionGate?: string;
}

interface SafeActualPlanEvidence {
  readonly planId: string;
  readonly trigger: string;
  readonly operationCount: number;
  readonly actionCounts: Readonly<Record<string, number>>;
  readonly operations: readonly SafePlanOperationEvidence[];
  readonly executionDisposition: string;
  readonly recoveryCheckpointRequired: boolean;
  readonly globalExecutionGate: string;
}

interface SafeFaultEvidence {
  readonly kind: string;
  readonly boundary: string;
  readonly occurrence: number;
  readonly status: string;
  readonly physicalEffectStatus?: string;
}

interface SafeCheckpointEvidence {
  readonly checkpointId: string;
  readonly deviceId: string;
  readonly requestedAction: string;
  readonly state: HumanCheckpointResumeState;
}

interface SafeAssertionEvidence {
  readonly assertionId: string;
  readonly kind: string;
  readonly status: ValidationAssertionObservation["status"];
  readonly evidenceRefs: readonly string[];
}

export interface ValidationScenarioEvidenceRecord {
  readonly schemaVersion: typeof VALIDATION_SCENARIO_EVIDENCE_RECORD_SCHEMA_VERSION;
  readonly harnessVersion: typeof PHASE6_LIVE_VALIDATION_HARNESS_VERSION;
  readonly run: ValidationRunIdentity;
  readonly primaryDeviceId: ValidationDeviceId;
  readonly build: Readonly<{ version: string; commitSha?: string }>;
  readonly devices: readonly ValidationDeviceIdentity[];
  readonly capturedAt: string;
  readonly diagnostics: Readonly<{ pre: readonly string[]; post: readonly string[] }>;
  readonly fixtures: readonly Readonly<{ fixtureId: string; sizeBytes: number; contentHash: string }>[];
  readonly expectedPlan?: SafeExpectedPlanEvidence;
  readonly actualPlan?: SafeActualPlanEvidence;
  readonly correlations: Readonly<{
    operationIds: readonly string[];
    intentIds: readonly string[];
    effectIds: readonly string[];
    requestIds: readonly string[];
    remoteObjectIds: readonly string[];
  }>;
  readonly revisions: readonly Readonly<ValidationRevisionEvidenceInput>[];
  readonly timing?: Readonly<ValidationTimingEvidenceInput>;
  readonly faults: readonly SafeFaultEvidence[];
  readonly checkpoints: readonly SafeCheckpointEvidence[];
  readonly assertions: readonly SafeAssertionEvidence[];
  readonly requiredEvidence: readonly ValidationScenarioEvidenceRequirement[];
  readonly missingRequiredEvidence: readonly ValidationScenarioEvidenceRequirement[];
  readonly evidenceRecords: readonly ValidationEvidenceRecord[];
  readonly verdict: ValidationScenarioEvidenceVerdict;
  readonly integrityDigest: string;
}

export interface ValidationScenarioEvidencePackage {
  readonly record: ValidationScenarioEvidenceRecord;
  readonly machineReadable: string;
  readonly humanReadable: string;
}

export interface ValidationSuiteEvidenceRecord {
  readonly schemaVersion: typeof VALIDATION_SUITE_EVIDENCE_SCHEMA_VERSION;
  readonly harnessVersion: typeof PHASE6_LIVE_VALIDATION_HARNESS_VERSION;
  readonly scenarioCount: number;
  readonly counts: Readonly<Record<"PASS" | "FAIL" | "BLOCKED" | "PAUSED", number>>;
  readonly scenarios: readonly Readonly<{
    runId: string;
    scenarioId: string;
    status: "PASS" | "FAIL" | "BLOCKED" | "PAUSED";
    integrityDigest: string;
  }>[];
  readonly integrityDigest: string;
}

export interface ValidationSuiteEvidencePackage {
  readonly record: ValidationSuiteEvidenceRecord;
  readonly machineReadable: string;
  readonly humanReadable: string;
}

function safeText(value: unknown, label: string): string {
  const safe = sanitizeDiagnosticText(value);
  if (!safe) throw new Error(`${label} must be a non-empty safe metadata string.`);
  return safe;
}

function safeCode(value: string, label: string): string {
  const safe = safeText(value, label);
  if (!/^[A-Za-z0-9._:/-]+$/.test(safe)) throw new Error(`${label} must contain metadata-code characters only.`);
  return safe;
}

function safeOptional(value: string | undefined, label: string): string | undefined {
  return value === undefined ? undefined : safeText(value, label);
}

function nonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite non-negative number.`);
  return value;
}

function safeRefs(refs: readonly ValidationEvidenceRef[]): readonly string[] {
  return Object.freeze(refs.map((value, index) => safeText(value, `Evidence reference ${index + 1}`)));
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(Array.from(new Set(values)).sort());
}

function safeOperation(input: {
  readonly operationId?: unknown;
  readonly kind: string;
  readonly path: string;
  readonly destructive: boolean;
  readonly targetSide?: string;
  readonly fromPath?: string;
  readonly toPath?: string;
  readonly remoteObjectId?: unknown;
}): SafePlanOperationEvidence {
  return Object.freeze({
    ...(input.operationId !== undefined ? { operationId: safeText(String(input.operationId), "Operation ID") } : {}),
    kind: safeCode(input.kind, "Operation kind"),
    pathKey: diagnosticPathKey(input.path),
    destructive: input.destructive,
    ...(input.targetSide !== undefined ? { targetSide: safeCode(input.targetSide, "Target side") } : {}),
    ...(input.fromPath !== undefined ? { fromPathKey: diagnosticPathKey(input.fromPath) } : {}),
    ...(input.toPath !== undefined ? { toPathKey: diagnosticPathKey(input.toPath) } : {}),
    ...(input.remoteObjectId !== undefined ? { remoteObjectId: safeText(String(input.remoteObjectId), "Remote object ID") } : {}),
  });
}

function expectedPlanEvidence(plan: ValidationPlanExpectation | undefined): SafeExpectedPlanEvidence | undefined {
  if (!plan) return undefined;
  return Object.freeze({
    ...(plan.expectedTrigger !== undefined ? { expectedTrigger: plan.expectedTrigger } : {}),
    operationCount: plan.expectedOperations.length,
    operations: Object.freeze(plan.expectedOperations.map(operation => safeOperation({ ...operation, path: String(operation.path), fromPath: operation.fromPath === undefined ? undefined : String(operation.fromPath), toPath: operation.toPath === undefined ? undefined : String(operation.toPath) }))),
    allowedBackgroundKinds: Object.freeze([...plan.allowedBackgroundKinds]),
    forbiddenKinds: Object.freeze([...plan.forbiddenKinds]),
    conflictExpectation: plan.conflictExpectation,
    destructiveExpectation: plan.destructiveExpectation,
    ...(plan.expectedExecutionDisposition !== undefined ? { expectedExecutionDisposition: plan.expectedExecutionDisposition } : {}),
    ...(plan.expectedGlobalExecutionGate !== undefined ? { expectedGlobalExecutionGate: plan.expectedGlobalExecutionGate } : {}),
  });
}

function actualPlanEvidence(plan: SynchronizationPlan | undefined): SafeActualPlanEvidence | undefined {
  if (!plan) return undefined;
  const counts: Record<string, number> = {};
  for (const operation of plan.operations) counts[operation.kind] = (counts[operation.kind] ?? 0) + 1;
  const actionCounts: Record<string, number> = {};
  for (const key of Object.keys(counts).sort()) actionCounts[key] = counts[key];
  return Object.freeze({
    planId: safeText(String(plan.planId), "Plan ID"),
    trigger: plan.trigger,
    operationCount: plan.operations.length,
    actionCounts: Object.freeze(actionCounts),
    operations: Object.freeze(plan.operations.map(operation => safeOperation({
      operationId: operation.operationId,
      kind: operation.kind,
      path: String(operation.path),
      destructive: operation.destructive,
      targetSide: operation.targetSide,
      fromPath: operation.fromPath === undefined ? undefined : String(operation.fromPath),
      toPath: operation.toPath === undefined ? undefined : String(operation.toPath),
      remoteObjectId: operation.remoteObjectId,
    }))),
    executionDisposition: plan.executionDisposition,
    recoveryCheckpointRequired: plan.recoveryCheckpointRequired,
    globalExecutionGate: plan.globalExecutionGate,
  });
}

function safeRevisions(revisions: readonly ValidationRevisionEvidenceInput[]): readonly Readonly<ValidationRevisionEvidenceInput>[] {
  return Object.freeze(revisions.map((revision, index) => Object.freeze({
    ...(revision.operationId !== undefined ? { operationId: safeText(revision.operationId, `Revision operation ID ${index + 1}`) } : {}),
    ...(revision.remoteObjectId !== undefined ? { remoteObjectId: safeText(revision.remoteObjectId, `Revision remote object ID ${index + 1}`) } : {}),
    ...(revision.expectedRevision !== undefined ? { expectedRevision: safeText(revision.expectedRevision, `Expected revision ${index + 1}`) } : {}),
    ...(revision.observedRevision !== undefined ? { observedRevision: safeText(revision.observedRevision, `Observed revision ${index + 1}`) } : {}),
    ...(revision.persistenceRevision !== undefined ? { persistenceRevision: nonNegative(revision.persistenceRevision, `Persistence revision ${index + 1}`) } : {}),
    ...(revision.semanticGeneration !== undefined ? { semanticGeneration: nonNegative(revision.semanticGeneration, `Semantic generation ${index + 1}`) } : {}),
    ...(revision.stateRevision !== undefined ? { stateRevision: nonNegative(revision.stateRevision, `State revision ${index + 1}`) } : {}),
  })));
}

function safeTiming(timing: ValidationTimingEvidenceInput | undefined): Readonly<ValidationTimingEvidenceInput> | undefined {
  if (!timing) return undefined;
  return Object.freeze({
    ...(timing.planningMs !== undefined ? { planningMs: nonNegative(timing.planningMs, "Planning time") } : {}),
    ...(timing.executionMs !== undefined ? { executionMs: nonNegative(timing.executionMs, "Execution time") } : {}),
    ...(timing.elapsedMs !== undefined ? { elapsedMs: nonNegative(timing.elapsedMs, "Elapsed time") } : {}),
  });
}

function safeFaults(faults: readonly ValidationFaultResult[]): readonly SafeFaultEvidence[] {
  return Object.freeze(faults.map(result => Object.freeze({
    kind: result.specification.kind,
    boundary: result.specification.boundary,
    occurrence: result.specification.occurrence,
    status: result.status,
    ...(result.status === "triggered-non-mutation" || result.status === "triggered-pre-dispatch" || result.status === "triggered-post-dispatch"
      ? { physicalEffectStatus: result.physicalEffect.status }
      : {}),
  })));
}

function safeCheckpoints(checkpoints: readonly ValidationCheckpointEvidenceInput[]): readonly SafeCheckpointEvidence[] {
  return Object.freeze(checkpoints.map(({ checkpoint, state }) => Object.freeze({
    checkpointId: safeText(String(checkpoint.checkpointId), "Checkpoint ID"),
    deviceId: safeText(String(checkpoint.deviceId), "Checkpoint device ID"),
    requestedAction: checkpoint.requestedAction,
    state,
  })));
}

function safeAssertions(assertions: readonly ValidationAssertionObservation[]): readonly SafeAssertionEvidence[] {
  return Object.freeze(assertions.map(observation => Object.freeze({
    assertionId: safeText(String(observation.assertion.assertionId), "Assertion ID"),
    kind: observation.assertion.kind,
    status: observation.status,
    evidenceRefs: safeRefs(observation.evidenceRefs),
  })));
}

function presentRequirements(input: {
  pre: readonly string[];
  post: readonly string[];
  fixtures: readonly unknown[];
  expectedPlan?: unknown;
  actualPlan?: unknown;
  correlations: { operationIds: readonly string[]; intentIds: readonly string[]; effectIds: readonly string[]; requestIds: readonly string[]; remoteObjectIds: readonly string[] };
  revisions: readonly unknown[];
  timing?: ValidationTimingEvidenceInput;
  faults: readonly unknown[];
  checkpoints: readonly unknown[];
  assertions: readonly unknown[];
}): Readonly<Record<ValidationScenarioEvidenceRequirement, boolean>> {
  const correlationCount = Object.values(input.correlations).reduce((sum, values) => sum + values.length, 0);
  const timingCount = input.timing ? Object.keys(input.timing).length : 0;
  return {
    "pre-diagnostics": input.pre.length > 0,
    "post-diagnostics": input.post.length > 0,
    fixtures: input.fixtures.length > 0,
    "expected-plan": input.expectedPlan !== undefined,
    "actual-plan": input.actualPlan !== undefined,
    correlations: correlationCount > 0,
    revisions: input.revisions.length > 0,
    timing: timingCount > 0,
    faults: input.faults.length > 0,
    checkpoints: input.checkpoints.length > 0,
    assertions: input.assertions.length > 0,
  };
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical evidence cannot contain non-finite numbers.");
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== undefined) result[key] = canonicalize(child);
    }
    return result;
  }
  throw new Error(`Canonical evidence cannot contain ${typeof value} values.`);
}

export function serializeValidationEvidence(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function integrityDigest(value: unknown): string {
  return String(sha256Text(serializeValidationEvidence(value)));
}

function makeEvidenceRecord(input: {
  readonly run: ValidationRunIdentity;
  readonly deviceId: ValidationDeviceId;
  readonly capturedAt: string;
  readonly kind: ValidationEvidenceRecord["kind"];
  readonly index: number;
  readonly summary: string;
  readonly references: readonly ValidationEvidenceRef[];
}): ValidationEvidenceRecord {
  const base = {
    schemaVersion: VALIDATION_EVIDENCE_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    evidenceId: validationEvidenceId(`${input.run.runId}:${input.kind}:${input.index}`),
    run: input.run,
    deviceId: input.deviceId,
    kind: input.kind,
    capturedAt: input.capturedAt,
    summary: safeText(input.summary, "Evidence summary"),
    references: input.references,
    privacy: VALIDATION_EVIDENCE_PRIVACY,
  } as const;
  return Object.freeze({ ...base, integrityDigest: integrityDigest(base) });
}

function collectEvidenceRecords(input: ValidationScenarioEvidenceInput): readonly ValidationEvidenceRecord[] {
  const records: ValidationEvidenceRecord[] = [];
  const push = (kind: ValidationEvidenceRecord["kind"], summary: string, refs: readonly ValidationEvidenceRef[] = []) => {
    records.push(makeEvidenceRecord({ run: input.run, deviceId: input.primaryDeviceId, capturedAt: input.capturedAt, kind, index: records.length + 1, summary, references: refs }));
  };
  push("identity", "Build, run, scenario, platform, and device identity captured.");
  if (input.fixtures.length > 0) push("content-hash", "Fixture sizes and content hashes captured.");
  if (input.expectedPlan || input.actualPlan) push("plan", "Expected and actual plan evidence captured.");
  if (input.faults.length > 0) push("fault", "Fault injection history captured.");
  if (input.checkpoints.length > 0) push("human-checkpoint", "Human checkpoint history captured.");
  if (input.assertions.length > 0) push("assertion", "Scenario assertion observations captured.", input.assertions.flatMap(value => value.evidenceRefs));
  const diagnosticRefs = [...input.preDiagnosticRefs, ...input.postDiagnosticRefs];
  if (diagnosticRefs.length > 0) push("state", "Pre/post diagnostic references captured.", diagnosticRefs);
  push("terminal", "Terminal scenario verdict evidence captured.");
  return Object.freeze(records);
}

function deriveVerdict(
  input: ValidationScenarioEvidenceInput,
  evidenceRecords: readonly ValidationEvidenceRecord[],
  missing: readonly ValidationScenarioEvidenceRequirement[],
): ValidationScenarioEvidenceVerdict {
  const failed = uniqueSorted(input.assertions.filter(value => value.status === "failed").map(value => String(value.assertion.assertionId)));
  const unobservable = uniqueSorted(input.assertions.filter(value => value.status === "not-observable").map(value => `assertion-not-observable:${String(value.assertion.assertionId)}`));
  const explicitBlockers = uniqueSorted((input.blockerCodes ?? []).map((value, index) => safeCode(value, `Blocker code ${index + 1}`)));
  const blockers = uniqueSorted([
    ...missing.map(value => `missing-required-evidence:${value}`),
    ...unobservable,
    ...explicitBlockers,
  ]);
  const evidenceIds = evidenceRecords.map(value => value.evidenceId);

  if (input.requestedStatus === "PAUSED") {
    if (!input.resumeStepId) throw new Error("PAUSED scenario evidence requires resumeStepId.");
    if (failed.length > 0) throw new Error("A scenario with failed assertions cannot be emitted as PAUSED.");
    return scenarioEvidenceVerdict({ status: "PAUSED", run: input.run, evidenceIds, failedAssertionIds: [], blockerReasons: [], resumeStepId: input.resumeStepId, summary: "Scenario paused for an authorized bounded checkpoint." });
  }
  if (failed.length > 0) {
    return scenarioEvidenceVerdict({ status: "FAIL", run: input.run, evidenceIds, failedAssertionIds: failed as readonly [string, ...string[]], blockerReasons: [], summary: "One or more required scenario assertions failed." });
  }
  if (blockers.length > 0) {
    return scenarioEvidenceVerdict({ status: "BLOCKED", run: input.run, evidenceIds, failedAssertionIds: [], blockerReasons: blockers as readonly [string, ...string[]], summary: "Required scenario proof is incomplete or not observable." });
  }
  if (input.requestedStatus === "FAIL") throw new Error("FAIL cannot be emitted without a failed assertion.");
  if (input.requestedStatus === "BLOCKED") throw new Error("BLOCKED cannot be emitted without a blocker or missing required evidence.");
  return scenarioEvidenceVerdict({ status: "PASS", run: input.run, evidenceIds, failedAssertionIds: [], blockerReasons: [], summary: "All declared required evidence is present and all observed assertions passed." });
}

export function recordValidationScenarioEvidence(input: ValidationScenarioEvidenceInput): ValidationScenarioEvidenceRecord {
  if (input.devices.length === 0) throw new Error("Scenario evidence requires at least one device identity.");
  if (!input.devices.some(device => device.deviceId === input.primaryDeviceId)) throw new Error("Primary evidence device must be present in devices.");
  if (input.requiredEvidence.length === 0) throw new Error("Scenario evidence must declare its mandatory evidence requirements.");
  if (!Number.isFinite(Date.parse(input.capturedAt))) throw new Error("capturedAt must be an ISO-compatible timestamp.");
  const version = safeText(input.build.version, "Build version");
  const commitSha = safeOptional(input.build.commitSha, "Build commit SHA");
  const pre = safeRefs(input.preDiagnosticRefs);
  const post = safeRefs(input.postDiagnosticRefs);
  const fixtures = Object.freeze(input.fixtures.map(({ fixture, sizeBytes, contentHash }, index) => {
    if (fixture.run.runId !== input.run.runId || fixture.run.scenarioId !== input.run.scenarioId) throw new Error(`Fixture ${index + 1} belongs to a different validation run.`);
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new Error(`Fixture ${index + 1} size must be a non-negative safe integer.`);
    if (!isCanonicalSha256(contentHash)) throw new Error(`Fixture ${index + 1} contentHash must be canonical SHA-256.`);
    return Object.freeze({ fixtureId: safeText(String(fixture.fixtureId), `Fixture ID ${index + 1}`), sizeBytes, contentHash: String(contentHash) });
  }));
  const expectedPlan = expectedPlanEvidence(input.expectedPlan);
  const actualPlan = actualPlanEvidence(input.actualPlan);
  const operationIds = actualPlan ? actualPlan.operations.flatMap(value => value.operationId ? [value.operationId] : []) : [];
  const actualRemoteIds = actualPlan ? actualPlan.operations.flatMap(value => value.remoteObjectId ? [value.remoteObjectId] : []) : [];
  const correlations = Object.freeze({
    operationIds: uniqueSorted(operationIds),
    intentIds: uniqueSorted((input.correlations?.intentIds ?? []).map((value, index) => safeText(value, `Intent ID ${index + 1}`))),
    effectIds: uniqueSorted((input.correlations?.effectIds ?? []).map((value, index) => safeText(value, `Effect ID ${index + 1}`))),
    requestIds: uniqueSorted((input.correlations?.requestIds ?? []).map((value, index) => safeText(value, `Request ID ${index + 1}`))),
    remoteObjectIds: uniqueSorted([...actualRemoteIds, ...(input.correlations?.remoteObjectIds ?? []).map((value, index) => safeText(value, `Remote object ID ${index + 1}`))]),
  });
  const revisions = safeRevisions(input.revisions);
  const timing = safeTiming(input.timing);
  const faults = safeFaults(input.faults);
  const checkpoints = safeCheckpoints(input.checkpoints);
  const assertions = safeAssertions(input.assertions);
  const requiredEvidence = uniqueSorted(input.requiredEvidence) as readonly ValidationScenarioEvidenceRequirement[];
  for (const requirement of requiredEvidence) {
    if (!(VALIDATION_SCENARIO_EVIDENCE_REQUIREMENTS as readonly string[]).includes(requirement)) throw new Error(`Unsupported scenario evidence requirement: ${String(requirement)}`);
  }
  const present = presentRequirements({ pre, post, fixtures, expectedPlan, actualPlan, correlations, revisions, timing, faults, checkpoints, assertions });
  const missingRequiredEvidence = Object.freeze(requiredEvidence.filter(requirement => !present[requirement]));
  const evidenceRecords = collectEvidenceRecords(input);
  const verdict = deriveVerdict(input, evidenceRecords, missingRequiredEvidence);
  const withoutDigest = {
    schemaVersion: VALIDATION_SCENARIO_EVIDENCE_RECORD_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    run: input.run,
    primaryDeviceId: input.primaryDeviceId,
    build: Object.freeze({ version, ...(commitSha !== undefined ? { commitSha } : {}) }),
    devices: Object.freeze([...input.devices]),
    capturedAt: input.capturedAt,
    diagnostics: Object.freeze({ pre, post }),
    fixtures,
    ...(expectedPlan ? { expectedPlan } : {}),
    ...(actualPlan ? { actualPlan } : {}),
    correlations,
    revisions,
    ...(timing ? { timing } : {}),
    faults,
    checkpoints,
    assertions,
    requiredEvidence,
    missingRequiredEvidence,
    evidenceRecords,
    verdict,
  } as const;
  return Object.freeze({ ...withoutDigest, integrityDigest: integrityDigest(withoutDigest) });
}

export function verifyValidationScenarioEvidenceIntegrity(record: ValidationScenarioEvidenceRecord): boolean {
  const { integrityDigest: claimed, ...withoutDigest } = record;
  return claimed === integrityDigest(withoutDigest);
}

function markdownText(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

export function renderValidationScenarioEvidenceMarkdown(record: ValidationScenarioEvidenceRecord): string {
  const lines = [
    `# Phase 6 Scenario Evidence — ${record.run.scenarioId}`,
    "",
    `- Run: \`${markdownText(String(record.run.runId))}\``,
    `- Verdict: **${record.verdict.status}**`,
    `- Build: \`${markdownText(record.build.version)}\`${record.build.commitSha ? ` (\`${markdownText(record.build.commitSha)}\`)` : ""}`,
    `- Primary device: \`${markdownText(String(record.primaryDeviceId))}\``,
    `- Devices: ${record.devices.map(device => `\`${markdownText(String(device.deviceId))}\` (${device.platform})`).join(", ")}`,
    `- Captured: ${markdownText(record.capturedAt)}`,
    `- Integrity: \`${record.integrityDigest}\``,
    "",
    "## Evidence summary",
    "",
    `- Diagnostics: ${record.diagnostics.pre.length} pre / ${record.diagnostics.post.length} post references`,
    `- Fixtures: ${record.fixtures.length}`,
    `- Expected plan operations: ${record.expectedPlan?.operationCount ?? "not captured"}`,
    `- Actual plan operations: ${record.actualPlan?.operationCount ?? "not captured"}`,
    `- Correlations: ${Object.values(record.correlations).reduce((sum, values) => sum + values.length, 0)}`,
    `- Revisions: ${record.revisions.length}`,
    `- Fault observations: ${record.faults.length}`,
    `- Checkpoints: ${record.checkpoints.length}`,
    `- Assertions: ${record.assertions.length}`,
    `- Missing required evidence: ${record.missingRequiredEvidence.length ? record.missingRequiredEvidence.join(", ") : "none"}`,
    "",
    "## Assertions",
    "",
    "| Assertion | Kind | Status | Evidence refs |",
    "| --- | --- | --- | ---: |",
    ...record.assertions.map(assertion => `| ${markdownText(assertion.assertionId)} | ${assertion.kind} | ${assertion.status} | ${assertion.evidenceRefs.length} |`),
    "",
    "## Verdict",
    "",
    markdownText(record.verdict.summary),
    "",
  ];
  return lines.join("\n");
}

export function packageValidationScenarioEvidence(input: ValidationScenarioEvidenceInput): ValidationScenarioEvidencePackage {
  const record = recordValidationScenarioEvidence(input);
  return Object.freeze({ record, machineReadable: serializeValidationEvidence(record), humanReadable: renderValidationScenarioEvidenceMarkdown(record) });
}

export function aggregateValidationSuiteEvidence(records: readonly ValidationScenarioEvidenceRecord[]): ValidationSuiteEvidenceRecord {
  const seen = new Set<string>();
  const sorted = [...records].sort((left, right) => `${left.run.scenarioId}\u0000${left.run.runId}`.localeCompare(`${right.run.scenarioId}\u0000${right.run.runId}`));
  for (const record of sorted) {
    if (!verifyValidationScenarioEvidenceIntegrity(record)) throw new Error(`Scenario evidence integrity verification failed for ${record.run.runId}.`);
    const key = `${record.run.scenarioId}\u0000${record.run.runId}`;
    if (seen.has(key)) throw new Error(`Duplicate scenario evidence record: ${record.run.scenarioId}/${record.run.runId}`);
    seen.add(key);
  }
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, PAUSED: 0 };
  for (const record of sorted) counts[record.verdict.status] += 1;
  const withoutDigest = {
    schemaVersion: VALIDATION_SUITE_EVIDENCE_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    scenarioCount: sorted.length,
    counts: Object.freeze(counts),
    scenarios: Object.freeze(sorted.map(record => Object.freeze({ runId: String(record.run.runId), scenarioId: record.run.scenarioId, status: record.verdict.status, integrityDigest: record.integrityDigest }))),
  } as const;
  return Object.freeze({ ...withoutDigest, integrityDigest: integrityDigest(withoutDigest) });
}

export function verifyValidationSuiteEvidenceIntegrity(record: ValidationSuiteEvidenceRecord): boolean {
  const { integrityDigest: claimed, ...withoutDigest } = record;
  return claimed === integrityDigest(withoutDigest);
}

export function renderValidationSuiteEvidenceMarkdown(record: ValidationSuiteEvidenceRecord): string {
  return [
    "# Phase 6 Validation Suite Evidence",
    "",
    `- Scenarios: ${record.scenarioCount}`,
    `- PASS: ${record.counts.PASS}`,
    `- FAIL: ${record.counts.FAIL}`,
    `- BLOCKED: ${record.counts.BLOCKED}`,
    `- PAUSED: ${record.counts.PAUSED}`,
    `- Integrity: \`${record.integrityDigest}\``,
    "",
    "| Scenario | Run | Verdict | Integrity |",
    "| --- | --- | --- | --- |",
    ...record.scenarios.map(scenario => `| ${scenario.scenarioId} | ${markdownText(scenario.runId)} | ${scenario.status} | \`${scenario.integrityDigest}\` |`),
    "",
  ].join("\n");
}

export function packageValidationSuiteEvidence(records: readonly ValidationScenarioEvidenceRecord[]): ValidationSuiteEvidencePackage {
  const record = aggregateValidationSuiteEvidence(records);
  return Object.freeze({ record, machineReadable: serializeValidationEvidence(record), humanReadable: renderValidationSuiteEvidenceMarkdown(record) });
}
