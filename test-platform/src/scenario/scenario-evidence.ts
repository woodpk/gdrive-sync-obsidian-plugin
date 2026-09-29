import { createHash } from "node:crypto";

import type {
  ScenarioAssertionStep,
  ScenarioDefinition,
  ScenarioFixtureContent,
  ScenarioObservationStep,
} from "./scenario-contract";
import type {
  ScenarioCapabilityResult,
  ScenarioRunnerHookContext,
  ScenarioRunnerHooks,
} from "./scenario-runner";
import { virtualDrivePath } from "../virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../virtual-world/in-memory-local-vault";

type JsonScalar = string | number | boolean | null;
type SafeValue = JsonScalar | readonly JsonScalar[];

export interface ScenarioEvidenceStepRecord {
  readonly stepId: string;
  readonly status: string;
  readonly classification?: string;
  readonly matchedExpectation: boolean;
}

export interface ScenarioEvidenceInput {
  readonly scenarioId: string;
  readonly status: string;
  readonly steps: readonly ScenarioEvidenceStepRecord[];
  readonly captures: Readonly<Record<string, unknown>>;
  readonly deviceIdentities: readonly string[];
  readonly classification?: string;
  readonly reason?: string;
}

export interface CanonicalScenarioEvidenceMachine {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly executionMode: "deterministic";
  readonly traceability: readonly { readonly kind: string; readonly id: string }[];
  readonly fixtures: readonly {
    readonly stepId: string;
    readonly operation: string;
    readonly device?: string;
    readonly path?: string;
    readonly fromPath?: string;
    readonly toPath?: string;
    readonly contentHash?: string;
    readonly sizeBytes?: number;
  }[];
  readonly deviceIdentities: readonly string[];
  readonly observations: readonly {
    readonly stepId: string;
    readonly captureAs: string;
    readonly value: Readonly<Record<string, SafeValue>>;
  }[];
  readonly assertions: readonly ScenarioEvidenceStepRecord[];
  readonly verdict: {
    readonly status: string;
    readonly classification?: string;
    readonly reason?: string;
  };
}

export interface CanonicalScenarioEvidence {
  readonly machine: CanonicalScenarioEvidenceMachine;
  readonly machineJson: string;
  readonly human: string;
}

const SAFE_OBSERVATION_FIELDS = new Set([
  "status", "exists", "side", "entityKind", "hash", "sizeBytes", "revision",
  "remoteObjectId", "stateRevision", "changeCursor", "operationKinds",
  "knownDeviceIds", "operationCount", "baseCount", "mappingCount",
  "tombstoneCount", "classification", "reason", "planId", "schemaVersion",
  "deviceIdentity", "vaultIdentity",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const safeScalar = (value: unknown): value is JsonScalar =>
  value === null || typeof value === "string" || typeof value === "boolean" ||
  (typeof value === "number" && Number.isFinite(value));

function safeObservation(value: unknown): Readonly<Record<string, SafeValue>> {
  if (!isRecord(value)) return {};
  const result: Record<string, SafeValue> = {};
  for (const [key, candidate] of Object.entries(value)) {
    if (!SAFE_OBSERVATION_FIELDS.has(key)) continue;
    if (safeScalar(candidate)) result[key] = candidate;
    else if (Array.isArray(candidate) && candidate.every(safeScalar)) result[key] = candidate as JsonScalar[];
  }
  return result;
}

async function streamedContentIdentity(source: { openChunks(): AsyncIterable<Uint8Array> }): Promise<{ hash: string; sizeBytes: number }> {
  const hash = createHash("sha256");
  let sizeBytes = 0;
  for await (const chunk of source.openChunks()) {
    hash.update(chunk);
    sizeBytes += chunk.byteLength;
  }
  return { hash: `sha256:${hash.digest("hex")}`, sizeBytes };
}

function contentIdentity(content: ScenarioFixtureContent): { hash: string; sizeBytes: number } {
  const bytes = content.encoding === "utf8"
    ? new TextEncoder().encode(content.value)
    : Uint8Array.from(content.value);
  return {
    hash: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength,
  };
}

function fixtureIdentity(
  step: ScenarioDefinition["steps"][number],
): CanonicalScenarioEvidenceMachine["fixtures"][number] | undefined {
  if (step.kind !== "fixture") return undefined;
  const base: {
    stepId: string; operation: string; device?: string; path?: string;
    fromPath?: string; toPath?: string; contentHash?: string; sizeBytes?: number;
  } = { stepId: step.id, operation: step.operation };
  if ("device" in step) base.device = step.device;
  if ("path" in step) base.path = step.path;
  if ("fromPath" in step) base.fromPath = step.fromPath;
  if ("toPath" in step) base.toPath = step.toPath;
  if ("content" in step) {
    const identity = contentIdentity(step.content);
    base.contentHash = identity.hash;
    base.sizeBytes = identity.sizeBytes;
  }
  return base;
}

function productionSummary(value: unknown): Readonly<Record<string, SafeValue>> {
  if (!isRecord(value)) return {};
  const result: Record<string, SafeValue> = {};
  for (const key of ["status", "reason", "classification", "planId"]) {
    if (safeScalar(value[key])) result[key] = value[key] as JsonScalar;
  }
  if (Array.isArray(value.operations)) {
    result.operationCount = value.operations.length;
    result.operationKinds = value.operations
      .map(operation => isRecord(operation) && typeof operation.kind === "string" ? operation.kind : undefined)
      .filter((kind): kind is string => kind !== undefined);
  }
  return result;
}

async function observe(step: ScenarioObservationStep, context: ScenarioRunnerHookContext): Promise<ScenarioCapabilityResult> {
  if (step.subject === "production-plan" || step.subject === "production-result") {
    const captured = context.readCapture(step.inputRef);
    return captured === undefined
      ? { status: "blocked", classification: "missing-required-result", reason: step.inputRef }
      : { status: "completed", value: productionSummary(captured) };
  }
  if (step.subject === "device-state") {
    const loaded = await context.world.deviceBacking(step.device).load();
    if (loaded.status !== "trusted") {
      return {
        status: "completed",
        value: {
          status: loaded.status,
          ...("reason" in loaded ? { reason: loaded.reason } : {}),
        },
      };
    }
    const state = loaded.state;
    return {
      status: "completed",
      value: {
        status: "trusted",
        schemaVersion: state.schemaVersion,
        stateRevision: String(state.stateRevision),
        deviceIdentity: String(state.deviceIdentity),
        vaultIdentity: String(state.vaultIdentity),
        baseCount: state.base.length,
        mappingCount: state.remoteMappings.length,
        tombstoneCount: state.tombstones.length,
        changeCursor: state.changeCursor === undefined ? null : String(state.changeCursor),
        knownDeviceIds: state.knownDevices.map(device => String(device.deviceId)).sort(),
      },
    };
  }
  if (step.subject === "remote-change-state") {
    const cursor = await context.world.drive.getStartCursor(context.world.managedRemote.rootId);
    return cursor.ok
      ? { status: "completed", value: { status: "present", changeCursor: String(cursor.value) } }
      : { status: "failed", classification: cursor.signal.kind };
  }
  if (step.subject === "local-entry") {
    const observed = await context.world.deviceBacking(step.device).local.observe(virtualVaultPath(step.path));
    const value: Record<string, SafeValue> = {
      status: observed.status,
      exists: observed.status === "present",
      side: "local",
    };
    if (observed.status === "present") {
      value.entityKind = observed.entityKind;
      if (observed.content?.sizeBytes !== undefined) value.sizeBytes = observed.content.sizeBytes;
      if (observed.content?.revision !== undefined) value.revision = observed.content.revision;
      if (observed.entityKind === "file" && observed.stability === "stable") {
        const read = await context.world.deviceBacking(step.device).local.readFile(
          virtualVaultPath(step.path),
          observed.observationToken,
        );
        const identity = await streamedContentIdentity(read.content);
        value.hash = identity.hash;
        value.sizeBytes = identity.sizeBytes;
      }
    } else if ("reason" in observed) value.reason = observed.reason;
    return { status: "completed", value };
  }
  if (step.subject !== "remote-entry") {
    return { status: "unsupported", classification: "observation-subject-unsupported" };
  }
  const observed = await context.world.drive.observe(
    context.world.managedRemote.rootId,
    virtualDrivePath(step.path),
  );
  if (!observed.ok) return { status: "failed", classification: observed.signal.kind };
  const value: Record<string, SafeValue> = {
    status: observed.value.status,
    exists: observed.value.status === "present",
    side: "remote",
  };
  if (observed.value.status === "present") {
    value.entityKind = observed.value.entityKind;
    if (observed.value.remoteObjectId !== undefined) value.remoteObjectId = String(observed.value.remoteObjectId);
    if (observed.value.content?.hash !== undefined) value.hash = String(observed.value.content.hash);
    if (observed.value.content?.sizeBytes !== undefined) value.sizeBytes = observed.value.content.sizeBytes;
    if (observed.value.content?.revision !== undefined) value.revision = observed.value.content.revision;
  } else if ("reason" in observed.value) value.reason = observed.value.reason;
  return { status: "completed", value };
}

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

async function assertObservation(step: ScenarioAssertionStep, context: ScenarioRunnerHookContext): Promise<ScenarioCapabilityResult> {
  const observed = context.readCapture(step.observationRef);
  if (observed === undefined) return { status: "blocked", classification: "missing-observation", reason: step.observationRef };
  const record = isRecord(observed) ? observed : undefined;
  let pass = false;

  if (step.assertion === "equals" || step.assertion === "not-equals") {
    pass = same(observed, step.expected);
    if (step.assertion === "not-equals") pass = !pass;
  } else if (step.assertion === "status") {
    if (!record || record.status === undefined) return { status: "blocked", classification: "missing-observation-field", reason: "status" };
    pass = record.status === step.expectedStatus;
  } else if (step.assertion === "exists") {
    if (!record || typeof record.exists !== "boolean") return { status: "blocked", classification: "missing-observation-field", reason: "exists" };
    pass = record.exists === step.expected;
  } else if ("field" in step) {
    if (!record || record[step.field] === undefined) return { status: "blocked", classification: "missing-observation-field", reason: step.field };
    const actual = record[step.field];
    if (step.assertion === "field-equals" || step.assertion === "field-not-equals") {
      pass = same(actual, step.expected);
      if (step.assertion === "field-not-equals") pass = !pass;
    } else if (step.assertion === "contains") {
      pass = Array.isArray(actual)
        ? actual.some(value => same(value, step.expected))
        : typeof actual === "string" && typeof step.expected === "string" && actual.includes(step.expected);
    } else if (step.assertion === "count") {
      pass = (Array.isArray(actual) || typeof actual === "string") && actual.length === step.expectedCount;
    }
  }
  return pass ? { status: "completed" } : { status: "failed", classification: "assertion-mismatch" };
}

export function createScenarioEvidenceHooks(): ScenarioRunnerHooks {
  return { observe, assert: assertObservation };
}

export function buildScenarioEvidence(
  scenario: ScenarioDefinition,
  execution: ScenarioEvidenceInput,
): CanonicalScenarioEvidence {
  const observations = scenario.steps
    .filter((step): step is ScenarioObservationStep => step.kind === "observe")
    .map(step => ({ stepId: step.id, captureAs: step.captureAs, value: safeObservation(execution.captures[step.captureAs]) }));
  const assertionIds = new Set(scenario.steps.filter(step => step.kind === "assert").map(step => step.id));
  const machine: CanonicalScenarioEvidenceMachine = {
    schemaVersion: 1,
    scenarioId: execution.scenarioId,
    executionMode: "deterministic",
    traceability: scenario.traceability.targets.map(target => ({ kind: target.kind, id: target.id })),
    fixtures: scenario.steps.map(fixtureIdentity).filter((value): value is NonNullable<typeof value> => value !== undefined),
    deviceIdentities: [...execution.deviceIdentities].sort(),
    observations,
    assertions: execution.steps.filter(step => assertionIds.has(step.stepId)),
    verdict: {
      status: execution.status,
      ...(execution.classification === undefined ? {} : { classification: execution.classification }),
      ...(execution.status === "completed" || execution.classification === undefined
        ? {}
        : { reason: execution.classification }),
    },
  };
  const machineJson = JSON.stringify(machine);
  const passed = machine.assertions.filter(assertion => assertion.status === "completed" && assertion.matchedExpectation).length;
  return {
    machine,
    machineJson,
    human: `Scenario ${machine.scenarioId} [${machine.executionMode}] verdict=${machine.verdict.status}; assertions=${passed}/${machine.assertions.length}; observations=${machine.observations.length}; traceability=${machine.traceability.map(target => target.id).join(",")}`,
  };
}
