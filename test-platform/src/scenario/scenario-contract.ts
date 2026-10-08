export type ScenarioExecutionMode = "deterministic" | "live";
export type ScenarioTraceabilityKind = "requirement" | "invariant" | "completion-evidence";

export interface ScenarioTraceabilityTarget {
  readonly kind: ScenarioTraceabilityKind;
  readonly id: string;
}

export interface ScenarioTraceability {
  readonly targets: readonly [ScenarioTraceabilityTarget, ...ScenarioTraceabilityTarget[]];
  readonly legacyLabels?: readonly string[];
}

export type ScenarioExpectedOutcome =
  | { readonly status: "success" }
  | { readonly status: "blocked" | "failed"; readonly classification: string };

export type ScenarioFixtureContent =
  | { readonly encoding: "utf8"; readonly value: string }
  | { readonly encoding: "bytes"; readonly value: readonly number[] };

type Step<T> = { readonly id: string; readonly expect?: ScenarioExpectedOutcome } & T;

export type ScenarioFixtureStep = Step<
  | { readonly kind: "fixture"; readonly operation: "put-local-file"; readonly device: string; readonly path: string; readonly content: ScenarioFixtureContent } | { readonly kind: "fixture"; readonly operation: "put-local-pattern"; readonly device: string; readonly path: string; readonly byteLength: number; readonly seed: string }
  | { readonly kind: "fixture"; readonly operation: "put-local-folder"; readonly device: string; readonly path: string }
  | { readonly kind: "fixture"; readonly operation: "put-remote-file"; readonly path: string; readonly content: ScenarioFixtureContent }
  | { readonly kind: "fixture"; readonly operation: "put-remote-folder"; readonly path: string }
  | { readonly kind: "fixture"; readonly operation: "move-local"; readonly device: string; readonly fromPath: string; readonly toPath: string }
  | { readonly kind: "fixture"; readonly operation: "move-remote"; readonly fromPath: string; readonly toPath: string }
  | { readonly kind: "fixture"; readonly operation: "remove-local"; readonly device: string; readonly path: string }
  | { readonly kind: "fixture"; readonly operation: "remove-remote"; readonly path: string }
>;

export type ScenarioProductionStep = Step<
  | { readonly kind: "production"; readonly device: string; readonly operation: "execute-reviewed-plan"; readonly inputRef: string; readonly captureAs?: string }
  | { readonly kind: "production"; readonly device: string; readonly operation: "preview" | "synchronize" | "reconcile" | "automatic-sync"; readonly inputRef?: string; readonly captureAs?: string }
>;

export type ScenarioExternalStateStep = Step<
  | { readonly kind: "external-state"; readonly transition: "set-device-connectivity"; readonly device: string; readonly state: "online" | "offline" }
  | { readonly kind: "external-state"; readonly transition: "set-local-access"; readonly device: string; readonly path: string; readonly state: "readable" | "unreadable" | "inaccessible" | "disk-full" }
  | { readonly kind: "external-state"; readonly transition: "advance-device-time"; readonly device: string; readonly deltaMs: number }
  | { readonly kind: "external-state"; readonly transition: "set-remote-listing-completeness" | "set-remote-change-completeness"; readonly completeness: "complete" | "partial"; readonly reason?: string }
  | { readonly kind: "external-state"; readonly transition: "inject-remote-mutation-fault"; readonly operation: "create" | "update" | "move" | "trash"; readonly effect: "not-applied" | "applied-before-failure"; readonly classification: string }
  | { readonly kind: "external-state"; readonly transition: "inject-post-mutation-observation-failure"; readonly device: string; readonly classification: string }
  | { readonly kind: "external-state"; readonly transition: "request-cancellation"; readonly device: string; readonly boundary?: "before-remote-dispatch" | "after-remote-effect" }
  | { readonly kind: "external-state"; readonly transition: "inject-crash-boundary"; readonly device: string; readonly boundary: "before-remote-dispatch" | "after-remote-effect" | "before-canonical-state-write" | "after-canonical-state-write" }
  | { readonly kind: "external-state"; readonly transition: "fault-device-state"; readonly device: string; readonly fault: "corrupt-checksum" | "truncate" | "incompatible-schema" | "copy-from-device"; readonly schemaVersion?: number; readonly sourceDevice?: string }
  | { readonly kind: "external-state"; readonly transition: "invalidate-change-cursor"; readonly device: string; readonly reason: "invalid" | "lost" | "stale" }
  | { readonly kind: "external-state"; readonly transition: "fault-managed-root"; readonly state: "missing" | "identity-mismatch" | "incompatible-protocol" }
>;

export type ScenarioCheckpointStep = Step<
  | { readonly kind: "checkpoint"; readonly operation: "capture"; readonly checkpointId: string }
  | { readonly kind: "checkpoint"; readonly operation: "restart-device"; readonly device: string; readonly checkpointRef?: string }
>;

export type ScenarioObservationStep = Step<
  | { readonly kind: "observe"; readonly subject: "local-entry"; readonly captureAs: string; readonly device: string; readonly path: string }
  | { readonly kind: "observe"; readonly subject: "remote-entry"; readonly captureAs: string; readonly path: string }
  | { readonly kind: "observe"; readonly subject: "device-state"; readonly captureAs: string; readonly device: string }
  | { readonly kind: "observe"; readonly subject: "production-plan" | "production-result"; readonly captureAs: string; readonly inputRef: string }
  | { readonly kind: "observe"; readonly subject: "remote-change-state"; readonly captureAs: string }
>;

export type ScenarioLiteral = string | number | boolean | null | readonly string[] | readonly number[];
export type ScenarioObservationField =
  | "kind" | "status" | "hash" | "sizeBytes" | "remoteObjectId" | "revision" | "entityKind"
  | "stateRevision" | "changeCursor" | "operationKinds" | "knownDeviceIds"
  | "operationCount" | "baseCount" | "mappingCount" | "tombstoneCount";
export type ScenarioAssertionStep = Step<
  | { readonly kind: "assert"; readonly assertion: "equals" | "not-equals"; readonly observationRef: string; readonly expected: ScenarioLiteral }
  | { readonly kind: "assert"; readonly assertion: "status"; readonly observationRef: string; readonly expectedStatus: string }
  | { readonly kind: "assert"; readonly assertion: "exists"; readonly observationRef: string; readonly expected: boolean }
  | { readonly kind: "assert"; readonly assertion: "field-equals" | "field-not-equals"; readonly observationRef: string; readonly field: ScenarioObservationField; readonly expected: ScenarioLiteral }
  | { readonly kind: "assert"; readonly assertion: "contains"; readonly observationRef: string; readonly field: ScenarioObservationField; readonly expected: ScenarioLiteral }
  | { readonly kind: "assert"; readonly assertion: "count"; readonly observationRef: string; readonly field: ScenarioObservationField; readonly expectedCount: number }
>;

export type ScenarioStep = ScenarioFixtureStep | ScenarioProductionStep | ScenarioExternalStateStep | ScenarioCheckpointStep | ScenarioObservationStep | ScenarioAssertionStep;

export interface ScenarioDefinition {
  readonly id: string;
  readonly description: string;
  readonly traceability: ScenarioTraceability;
  readonly executionModes: readonly [ScenarioExecutionMode, ...ScenarioExecutionMode[]];
  readonly steps: readonly [ScenarioStep, ...ScenarioStep[]];
}

export type ScenarioValidationResult =
  | { readonly ok: true; readonly value: ScenarioDefinition }
  | { readonly ok: false; readonly issues: readonly string[] };

type RecordValue = Record<string, unknown>;
type StepSchema = { readonly discriminator: string; readonly required: readonly string[]; readonly allowed: readonly string[] };

const STEP_SCHEMAS: Readonly<Record<string, StepSchema>> = {
  "fixture:put-local-file": { discriminator: "operation", required: ["device", "path", "content"], allowed: ["device", "path", "content"] }, "fixture:put-local-pattern": { discriminator: "operation", required: ["device", "path", "byteLength", "seed"], allowed: ["device", "path", "byteLength", "seed"] },
  "fixture:put-local-folder": { discriminator: "operation", required: ["device", "path"], allowed: ["device", "path"] },
  "fixture:put-remote-file": { discriminator: "operation", required: ["path", "content"], allowed: ["path", "content"] },
  "fixture:put-remote-folder": { discriminator: "operation", required: ["path"], allowed: ["path"] },
  "fixture:move-local": { discriminator: "operation", required: ["device", "fromPath", "toPath"], allowed: ["device", "fromPath", "toPath"] },
  "fixture:move-remote": { discriminator: "operation", required: ["fromPath", "toPath"], allowed: ["fromPath", "toPath"] },
  "fixture:remove-local": { discriminator: "operation", required: ["device", "path"], allowed: ["device", "path"] },
  "fixture:remove-remote": { discriminator: "operation", required: ["path"], allowed: ["path"] },
  "production:preview": { discriminator: "operation", required: ["device"], allowed: ["device", "inputRef", "captureAs"] },
  "production:execute-reviewed-plan": { discriminator: "operation", required: ["device", "inputRef"], allowed: ["device", "inputRef", "captureAs"] },
  "production:synchronize": { discriminator: "operation", required: ["device"], allowed: ["device", "inputRef", "captureAs"] },
  "production:reconcile": { discriminator: "operation", required: ["device"], allowed: ["device", "inputRef", "captureAs"] },
  "production:automatic-sync": { discriminator: "operation", required: ["device"], allowed: ["device", "captureAs"] },
  "external-state:set-device-connectivity": { discriminator: "transition", required: ["device", "state"], allowed: ["device", "state"] },
  "external-state:set-local-access": { discriminator: "transition", required: ["device", "path", "state"], allowed: ["device", "path", "state"] },
  "external-state:advance-device-time": { discriminator: "transition", required: ["device", "deltaMs"], allowed: ["device", "deltaMs"] },
  "external-state:set-remote-listing-completeness": { discriminator: "transition", required: ["completeness"], allowed: ["completeness", "reason"] },
  "external-state:set-remote-change-completeness": { discriminator: "transition", required: ["completeness"], allowed: ["completeness", "reason"] },
  "external-state:inject-remote-mutation-fault": { discriminator: "transition", required: ["operation", "effect", "classification"], allowed: ["operation", "effect", "classification"] },
  "external-state:inject-post-mutation-observation-failure": { discriminator: "transition", required: ["device", "classification"], allowed: ["device", "classification"] },
  "external-state:request-cancellation": { discriminator: "transition", required: ["device"], allowed: ["device", "boundary"] },
  "external-state:inject-crash-boundary": { discriminator: "transition", required: ["device", "boundary"], allowed: ["device", "boundary"] },
  "external-state:fault-device-state": { discriminator: "transition", required: ["device", "fault"], allowed: ["device", "fault", "schemaVersion", "sourceDevice"] },
  "external-state:invalidate-change-cursor": { discriminator: "transition", required: ["device", "reason"], allowed: ["device", "reason"] },
  "external-state:fault-managed-root": { discriminator: "transition", required: ["state"], allowed: ["state"] },
  "checkpoint:capture": { discriminator: "operation", required: ["checkpointId"], allowed: ["checkpointId"] },
  "checkpoint:restart-device": { discriminator: "operation", required: ["device"], allowed: ["device", "checkpointRef"] },
  "observe:local-entry": { discriminator: "subject", required: ["captureAs", "device", "path"], allowed: ["captureAs", "device", "path", "inputRef"] },
  "observe:remote-entry": { discriminator: "subject", required: ["captureAs", "path"], allowed: ["captureAs", "device", "path", "inputRef"] },
  "observe:device-state": { discriminator: "subject", required: ["captureAs", "device"], allowed: ["captureAs", "device", "path", "inputRef"] },
  "observe:production-plan": { discriminator: "subject", required: ["captureAs", "inputRef"], allowed: ["captureAs", "device", "path", "inputRef"] },
  "observe:production-result": { discriminator: "subject", required: ["captureAs", "inputRef"], allowed: ["captureAs", "device", "path", "inputRef"] },
  "observe:remote-change-state": { discriminator: "subject", required: ["captureAs"], allowed: ["captureAs", "device", "path", "inputRef"] },
  "assert:equals": { discriminator: "assertion", required: ["observationRef", "expected"], allowed: ["observationRef", "expected"] },
  "assert:not-equals": { discriminator: "assertion", required: ["observationRef", "expected"], allowed: ["observationRef", "expected"] },
  "assert:status": { discriminator: "assertion", required: ["observationRef", "expectedStatus"], allowed: ["observationRef", "expectedStatus"] },
  "assert:exists": { discriminator: "assertion", required: ["observationRef", "expected"], allowed: ["observationRef", "expected"] },
  "assert:field-equals": { discriminator: "assertion", required: ["observationRef", "field", "expected"], allowed: ["observationRef", "field", "expected"] },
  "assert:field-not-equals": { discriminator: "assertion", required: ["observationRef", "field", "expected"], allowed: ["observationRef", "field", "expected"] },
  "assert:contains": { discriminator: "assertion", required: ["observationRef", "field", "expected"], allowed: ["observationRef", "field", "expected"] },
  "assert:count": { discriminator: "assertion", required: ["observationRef", "field", "expectedCount"], allowed: ["observationRef", "field", "expectedCount"] },
};

const isRecord = (value: unknown): value is RecordValue => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const jsonSafe = (value: unknown): boolean => value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) || (Array.isArray(value) && value.every(jsonSafe)) || (isRecord(value) && Object.values(value).every(jsonSafe));

function validateStep(step: unknown, index: number, issues: string[]): void {
  const at = `steps[${index}]`;
  if (!isRecord(step) || !text(step.id) || !text(step.kind)) { issues.push(`${at} requires id and kind`); return; }
  const discriminator = step.kind === "external-state" ? "transition" : step.kind === "observe" ? "subject" : step.kind === "assert" ? "assertion" : "operation";
  const key = `${step.kind}:${String(step[discriminator] ?? "")}`;
  const schema = STEP_SCHEMAS[key];
  if (!schema) { issues.push(`${at} has unsupported step '${key}'`); return; }
  const allowed = new Set(["id", "kind", schema.discriminator, "expect", ...schema.allowed]);
  for (const field of Object.keys(step)) if (!allowed.has(field)) issues.push(`${at} has unsupported field '${field}'`);
  for (const field of schema.required) if (step[field] === undefined || (typeof step[field] === "string" && !text(step[field]))) issues.push(`${at}.${field} is required`);
  if (step.expect !== undefined) {
    const expect = step.expect;
    if (!isRecord(expect) || Object.keys(expect).some(field => !["status", "classification"].includes(field)) || (expect.status !== "success" && expect.status !== "blocked" && expect.status !== "failed")) issues.push(`${at}.expect is invalid`);
    else if ((expect.status === "blocked" || expect.status === "failed") && !text(expect.classification)) issues.push(`${at}.expect ${expect.status} requires classification`);
    else if (expect.status === "success" && expect.classification !== undefined) issues.push(`${at}.expect success cannot carry classification`);
  }
  if (step.kind === "fixture" && step.operation === "put-local-pattern" && (typeof step.byteLength !== "number" || !Number.isSafeInteger(step.byteLength) || step.byteLength <= 0 || step.byteLength > 33_554_432 || !text(step.seed) || step.seed.length > 256)) issues.push(`${at} pattern fixture is invalid`); if (step.kind === "fixture" && (step.operation === "put-local-file" || step.operation === "put-remote-file")) {
    const content = step.content;
    if (!isRecord(content) || (content.encoding === "utf8" ? typeof content.value !== "string" : content.encoding === "bytes" ? !Array.isArray(content.value) || content.value.some(value => typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 255) : true)) issues.push(`${at}.content is invalid`);
  }
  if (step.kind === "external-state" && String(step.transition).includes("completeness") && step.completeness !== "complete" && step.completeness !== "partial") issues.push(`${at}.completeness is invalid`);
  if (step.kind === "external-state" && step.transition === "set-device-connectivity" && step.state !== "online" && step.state !== "offline") issues.push(`${at}.state is invalid`);
  if (step.kind === "external-state" && step.transition === "set-local-access" && !["readable", "unreadable", "inaccessible", "disk-full"].includes(String(step.state))) issues.push(`${at}.state is invalid`);
  if (step.kind === "external-state" && step.transition === "advance-device-time" && (typeof step.deltaMs !== "number" || !Number.isFinite(step.deltaMs) || step.deltaMs < 0)) issues.push(`${at}.deltaMs must be finite and non-negative`);
  if (step.kind === "external-state" && ((step.transition === "inject-crash-boundary" && !["before-remote-dispatch", "after-remote-effect", "before-canonical-state-write", "after-canonical-state-write"].includes(String(step.boundary))) || (step.transition === "request-cancellation" && step.boundary !== undefined && !["before-remote-dispatch", "after-remote-effect"].includes(String(step.boundary))))) issues.push(`${at}.boundary is invalid`);
  if (step.kind === "external-state" && step.transition === "inject-remote-mutation-fault" && (!["create", "update", "move", "trash"].includes(String(step.operation)) || !["not-applied", "applied-before-failure"].includes(String(step.effect)))) issues.push(`${at} remote mutation fault is invalid`);
  if (step.kind === "external-state" && step.transition === "fault-device-state" && (!["corrupt-checksum", "truncate", "incompatible-schema", "copy-from-device"].includes(String(step.fault)) || (step.fault === "incompatible-schema" && (typeof step.schemaVersion !== "number" || !Number.isSafeInteger(step.schemaVersion) || step.schemaVersion <= 1)) || (step.fault === "copy-from-device" && (typeof step.sourceDevice !== "string" || step.sourceDevice.length === 0)))) issues.push(`${at} state fault is invalid`);
  if (step.kind === "external-state" && step.transition === "invalidate-change-cursor" && !["invalid", "lost", "stale"].includes(String(step.reason))) issues.push(`${at}.reason is invalid`);
  if (step.kind === "external-state" && step.transition === "fault-managed-root" && !["missing", "identity-mismatch", "incompatible-protocol"].includes(String(step.state))) issues.push(`${at}.state is invalid`);
  if (step.kind === "assert" && step.assertion === "exists" && typeof step.expected !== "boolean") issues.push(`${at}.expected must be boolean`);
  if (step.kind === "assert" && step.assertion === "count") {
    const expectedCount = step.expectedCount;
    if (typeof expectedCount !== "number" || !Number.isInteger(expectedCount) || expectedCount < 0) issues.push(`${at}.expectedCount must be a non-negative integer`);
  }
  if (!jsonSafe(step)) issues.push(`${at} must contain JSON-safe declarative data only`);
}

export function validateScenarioDefinition(input: unknown): ScenarioValidationResult {
  const issues: string[] = [];
  if (!isRecord(input)) return { ok: false, issues: ["scenario must be an object"] };
  for (const field of Object.keys(input)) if (!["id", "description", "traceability", "executionModes", "steps"].includes(field)) issues.push(`scenario has unsupported field '${field}'`);
  if (!text(input.id)) issues.push("scenario.id is required");
  if (!text(input.description)) issues.push("scenario.description is required");
  if (!isRecord(input.traceability) || !Array.isArray(input.traceability.targets) || input.traceability.targets.length === 0) issues.push("scenario.traceability.targets must be non-empty");
  else for (const [index, target] of input.traceability.targets.entries()) if (!isRecord(target) || !["requirement", "invariant", "completion-evidence"].includes(String(target.kind)) || !text(target.id)) issues.push(`scenario.traceability.targets[${index}] is invalid`);
  if (!Array.isArray(input.executionModes) || input.executionModes.length === 0 || input.executionModes.some(mode => mode !== "deterministic" && mode !== "live")) issues.push("scenario.executionModes must contain supported modes");
  else if (new Set(input.executionModes).size !== input.executionModes.length) issues.push("scenario.executionModes must not contain duplicates");
  if (!Array.isArray(input.steps) || input.steps.length === 0) issues.push("scenario.steps must be non-empty");
  else {
    input.steps.forEach((step, index) => validateStep(step, index, issues));
    const ids = input.steps.filter(isRecord).map(step => step.id).filter(text);
    if (new Set(ids).size !== ids.length) issues.push("scenario.steps must use unique ids");
  }
  if (!jsonSafe(input)) issues.push("scenario must contain JSON-safe declarative data only");
  return issues.length ? { ok: false, issues } : { ok: true, value: input as unknown as ScenarioDefinition };
}

export function defineScenario(definition: ScenarioDefinition): ScenarioDefinition {
  const result = validateScenarioDefinition(definition);
  if (!result.ok) throw new Error(`invalid scenario definition: ${result.issues.join("; ")}`);
  return definition;
}

export function assertNeverScenarioStep(step: never): never {
  throw new Error(`unsupported scenario step: ${JSON.stringify(step)}`);
}
