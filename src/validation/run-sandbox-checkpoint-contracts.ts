/**
 * Frozen H0A contracts for the Phase 6 live-validation harness.
 *
 * These types are validation-only vocabulary. They do not confer production
 * synchronization authority and intentionally depend on no Node/Electron APIs.
 */
type ValidationBrand<Name extends string> = string & { readonly __validationBrand: Name };

export type ValidationRunId = ValidationBrand<"ValidationRunId">;
export type ValidationDeviceId = ValidationBrand<"ValidationDeviceId">;
export type ValidationStepId = ValidationBrand<"ValidationStepId">;
export type ValidationFixtureId = ValidationBrand<"ValidationFixtureId">;
export type ValidationSandboxResourceId = ValidationBrand<"ValidationSandboxResourceId">;
export type HumanCheckpointId = ValidationBrand<"HumanCheckpointId">;

function validationId<Name extends string>(value: string, label: string): ValidationBrand<Name> {
  if (value.length === 0 || value.trim() !== value) throw new Error(`${label} must be a non-empty, trim-stable string.`);
  return value as ValidationBrand<Name>;
}

export const validationRunId = (value: string): ValidationRunId => validationId<"ValidationRunId">(value, "Validation run ID");
export const validationDeviceId = (value: string): ValidationDeviceId => validationId<"ValidationDeviceId">(value, "Validation device ID");
export const validationStepId = (value: string): ValidationStepId => validationId<"ValidationStepId">(value, "Validation step ID");
export const validationFixtureId = (value: string): ValidationFixtureId => validationId<"ValidationFixtureId">(value, "Validation fixture ID");
export const validationSandboxResourceId = (value: string): ValidationSandboxResourceId => validationId<"ValidationSandboxResourceId">(value, "Validation sandbox resource ID");
export const humanCheckpointId = (value: string): HumanCheckpointId => validationId<"HumanCheckpointId">(value, "Human checkpoint ID");

export const VALIDATION_SCENARIO_IDS = [
  "C03", "C04", "C05", "C06", "C07", "C08", "C09",
  "D01", "D02", "D03", "D04", "D05", "D06",
  "E01", "E02", "E03", "E04", "E05", "E06", "E07",
  "F01", "F02", "F03",
] as const;
export type ValidationScenarioId = (typeof VALIDATION_SCENARIO_IDS)[number];
const VALIDATION_SCENARIO_ID_SET: ReadonlySet<string> = new Set(VALIDATION_SCENARIO_IDS);
export function isValidationScenarioId(value: string): value is ValidationScenarioId {
  return VALIDATION_SCENARIO_ID_SET.has(value);
}
export function validationScenarioId(value: string): ValidationScenarioId {
  if (!isValidationScenarioId(value)) throw new Error(`Unsupported Phase 6 validation scenario: ${value}`);
  return value;
}

export interface ValidationRunIdentity {
  readonly runId: ValidationRunId;
  readonly scenarioId: ValidationScenarioId;
}
export function validationRunIdentity(runId: string, scenarioId: string): ValidationRunIdentity {
  return Object.freeze({ runId: validationRunId(runId), scenarioId: validationScenarioId(scenarioId) });
}

export const VALIDATION_DEVICE_PLATFORMS = ["windows-desktop", "iphone", "ipad"] as const;
export type ValidationDevicePlatform = (typeof VALIDATION_DEVICE_PLATFORMS)[number];
const VALIDATION_DEVICE_PLATFORM_SET: ReadonlySet<string> = new Set(VALIDATION_DEVICE_PLATFORMS);
export function isValidationDevicePlatform(value: string): value is ValidationDevicePlatform {
  return VALIDATION_DEVICE_PLATFORM_SET.has(value);
}
export interface ValidationDeviceIdentity {
  readonly deviceId: ValidationDeviceId;
  readonly platform: ValidationDevicePlatform;
}
export function validationDeviceIdentity(deviceId: string, platform: string): ValidationDeviceIdentity {
  if (!isValidationDevicePlatform(platform)) throw new Error(`Unsupported validation device platform: ${platform}`);
  return Object.freeze({ deviceId: validationDeviceId(deviceId), platform });
}

export const VALIDATION_SCENARIO_LIFECYCLE_KINDS = ["pending", "running", "paused-human-action", "resumable", "terminal"] as const;
export type ValidationScenarioLifecycleKind = (typeof VALIDATION_SCENARIO_LIFECYCLE_KINDS)[number];
export const VALIDATION_SCENARIO_VERDICTS = ["pass", "fail", "blocked"] as const;
export type ValidationScenarioVerdict = (typeof VALIDATION_SCENARIO_VERDICTS)[number];

export const HUMAN_CHECKPOINT_ACTIONS = [
  "disable-mobile-connectivity",
  "restore-mobile-connectivity",
  "establish-stale-device-condition",
  "terminate-obsidian",
  "restart-obsidian",
  "restore-google-authentication",
  "disable-plugin",
  "uninstall-plugin",
  "reinstall-plugin",
  "unlink-device",
] as const;
export type HumanCheckpointAction = (typeof HUMAN_CHECKPOINT_ACTIONS)[number];
const HUMAN_CHECKPOINT_ACTION_SET: ReadonlySet<string> = new Set(HUMAN_CHECKPOINT_ACTIONS);
export function isHumanCheckpointAction(value: string): value is HumanCheckpointAction {
  return HUMAN_CHECKPOINT_ACTION_SET.has(value);
}

export interface HumanCheckpoint {
  readonly checkpointId: HumanCheckpointId;
  readonly run: ValidationRunIdentity;
  readonly deviceId: ValidationDeviceId;
  readonly requestedAction: HumanCheckpointAction;
  readonly instruction: string;
}
export function humanCheckpoint(input: {
  readonly checkpointId: string;
  readonly run: ValidationRunIdentity;
  readonly deviceId: string;
  readonly requestedAction: string;
  readonly instruction: string;
}): HumanCheckpoint {
  if (!isHumanCheckpointAction(input.requestedAction)) throw new Error(`Unsupported human checkpoint action: ${input.requestedAction}`);
  if (input.instruction.trim().length === 0) throw new Error("Human checkpoint instruction must not be blank.");
  return Object.freeze({
    checkpointId: humanCheckpointId(input.checkpointId),
    run: input.run,
    deviceId: validationDeviceId(input.deviceId),
    requestedAction: input.requestedAction,
    instruction: input.instruction,
  });
}

export const HUMAN_CHECKPOINT_RESUME_STATES = ["awaiting-human-action", "awaiting-verification", "resumable"] as const;
export type HumanCheckpointResumeState = (typeof HUMAN_CHECKPOINT_RESUME_STATES)[number];
export type HumanCheckpointResume =
  | { readonly state: "awaiting-human-action"; readonly checkpoint: HumanCheckpoint }
  | { readonly state: "awaiting-verification"; readonly checkpoint: HumanCheckpoint; readonly acknowledgement: string }
  | { readonly state: "resumable"; readonly checkpoint: HumanCheckpoint; readonly acknowledgement: string; readonly verification: string; readonly resumeStepId: ValidationStepId };

export type ValidationScenarioLifecycle =
  | { readonly kind: "pending" }
  | { readonly kind: "running"; readonly stepId: ValidationStepId }
  | { readonly kind: "paused-human-action"; readonly checkpoint: HumanCheckpoint }
  | { readonly kind: "resumable"; readonly resume: Extract<HumanCheckpointResume, { readonly state: "resumable" }> }
  | { readonly kind: "terminal"; readonly verdict: ValidationScenarioVerdict; readonly summary: string };

export const VALIDATION_SANDBOX_SURFACES = ["vault-fixture", "validation-vault-state-copy", "validation-remote", "validation-metadata"] as const;
export type ValidationSandboxSurface = (typeof VALIDATION_SANDBOX_SURFACES)[number];
const VALIDATION_SANDBOX_SURFACE_SET: ReadonlySet<string> = new Set(VALIDATION_SANDBOX_SURFACES);
export function isValidationSandboxSurface(value: string): value is ValidationSandboxSurface {
  return VALIDATION_SANDBOX_SURFACE_SET.has(value);
}

export interface ValidationFixtureIdentity {
  readonly fixtureId: ValidationFixtureId;
  readonly run: ValidationRunIdentity;
}
export function validationFixtureIdentity(run: ValidationRunIdentity, fixtureId: string): ValidationFixtureIdentity {
  return Object.freeze({ fixtureId: validationFixtureId(fixtureId), run });
}

export interface ValidationSandboxOwnership {
  readonly resourceId: ValidationSandboxResourceId;
  readonly surface: ValidationSandboxSurface;
  readonly owner: ValidationRunIdentity;
}
export function validationSandboxOwnership(input: {
  readonly resourceId: string;
  readonly surface: string;
  readonly owner: ValidationRunIdentity;
}): ValidationSandboxOwnership {
  if (!isValidationSandboxSurface(input.surface)) throw new Error(`Unsupported validation sandbox surface: ${input.surface}`);
  return Object.freeze({ resourceId: validationSandboxResourceId(input.resourceId), surface: input.surface, owner: input.owner });
}

export const VALIDATION_SANDBOX_MUTATIONS = ["setup", "mutate", "cleanup"] as const;
export type ValidationSandboxMutation = (typeof VALIDATION_SANDBOX_MUTATIONS)[number];
export interface ValidationSandboxAuthorizationRequest {
  readonly run: ValidationRunIdentity;
  readonly mutation: ValidationSandboxMutation;
  readonly ownership: ValidationSandboxOwnership;
}
export const VALIDATION_SANDBOX_REJECTION_REASONS = [
  "ownership-unproven",
  "ownership-ambiguous",
  "run-mismatch",
  "scenario-mismatch",
  "surface-out-of-scope",
] as const;
export type ValidationSandboxRejectionReason = (typeof VALIDATION_SANDBOX_REJECTION_REASONS)[number];
export type ValidationSandboxAuthorization =
  | { readonly status: "authorized"; readonly ownership: ValidationSandboxOwnership }
  | { readonly status: "rejected"; readonly reason: ValidationSandboxRejectionReason };
