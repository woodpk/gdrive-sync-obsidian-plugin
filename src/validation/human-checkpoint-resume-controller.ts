import {
  humanCheckpoint,
  humanCheckpointId,
  isHumanCheckpointAction,
  isValidationDevicePlatform,
  validationDeviceIdentity,
  validationRunIdentity,
  validationStepId,
  type HumanCheckpoint,
  type HumanCheckpointAction,
  type HumanCheckpointId,
  type ValidationDeviceIdentity,
  type ValidationDevicePlatform,
  type ValidationRunIdentity,
  type ValidationStepId,
} from "./run-sandbox-checkpoint-contracts";

export const HUMAN_CHECKPOINT_STATE_SCHEMA_VERSION = 1 as const;

export type HumanCheckpointPersistenceDurability = "device-local" | "external-coordination";
export type HumanCheckpointDurableStatus = "awaiting-human-action" | "awaiting-verification" | "resumable";

export interface HumanCheckpointDurableState {
  readonly schemaVersion: typeof HUMAN_CHECKPOINT_STATE_SCHEMA_VERSION;
  readonly revision: number;
  readonly status: HumanCheckpointDurableStatus;
  readonly checkpoint: HumanCheckpoint;
  readonly devicePlatform: ValidationDevicePlatform;
  readonly resumeStepId: ValidationStepId;
  readonly createdAt: string;
  readonly timeoutAt?: string;
  readonly acknowledgedAt?: string;
  readonly verifiedAt?: string;
}

export interface HumanCheckpointStateStore {
  readonly durability: HumanCheckpointPersistenceDurability;
  load(): Promise<unknown>;
  compareAndSet(expectedRevision: number | null, next: HumanCheckpointDurableState | null): Promise<boolean>;
}

export interface HumanCheckpointResumeCommitPort {
  /**
   * Durably adopt the resume step before VH13 removes the checkpoint.
   * Implementations must be idempotent for an identical run/checkpoint/resume-step tuple.
   */
  commitResume(input: {
    readonly run: ValidationRunIdentity;
    readonly checkpointId: HumanCheckpointId;
    readonly resumeStepId: ValidationStepId;
  }): Promise<void>;
}

export type HumanCheckpointPostconditionObservation =
  | { readonly status: "verified" }
  | { readonly status: "pending" }
  | { readonly status: "ambiguous" };

export interface HumanCheckpointPostconditionProbe {
  observe(input: {
    readonly run: ValidationRunIdentity;
    readonly checkpointId: HumanCheckpointId;
    readonly action: HumanCheckpointAction;
    readonly device: ValidationDeviceIdentity;
  }): Promise<HumanCheckpointPostconditionObservation>;
}

export type HumanCheckpointControllerPauseReason =
  | "human-action-required"
  | "postcondition-not-observed"
  | "postcondition-ambiguous"
  | "postcondition-probe-failed"
  | "verification-timeout"
  | "resume-adoption-failed"
  | "persisted-state-invalid"
  | "state-changed";

export type HumanCheckpointControllerRejectionReason =
  | "active-checkpoint-exists"
  | "checkpoint-not-found"
  | "checkpoint-mismatch"
  | "run-mismatch"
  | "wrong-state"
  | "duplicate-acknowledgement"
  | "device-mismatch"
  | "device-switch-not-safe"
  | "external-persistence-required"
  | "invalid-timeout";

export type HumanCheckpointControllerResult =
  | { readonly status: "paused"; readonly reason: HumanCheckpointControllerPauseReason; readonly state?: HumanCheckpointDurableState }
  | { readonly status: "rejected"; readonly reason: HumanCheckpointControllerRejectionReason; readonly state?: HumanCheckpointDurableState }
  | { readonly status: "resumable"; readonly state: HumanCheckpointDurableState }
  | { readonly status: "resumed"; readonly checkpointId: HumanCheckpointId; readonly resumeStepId: ValidationStepId }
  | { readonly status: "empty" };

const EXTERNAL_PERSISTENCE_ACTIONS: ReadonlySet<HumanCheckpointAction> = new Set([
  "uninstall-plugin",
  "reinstall-plugin",
]);

const MOBILE_PLATFORMS: ReadonlySet<ValidationDevicePlatform> = new Set(["iphone", "ipad"]);

const ACTION_INSTRUCTIONS: Readonly<Record<HumanCheckpointAction, string>> = Object.freeze({
  "disable-mobile-connectivity": "Disable mobile network connectivity for the selected validation device, then acknowledge this checkpoint.",
  "restore-mobile-connectivity": "Restore mobile network connectivity for the selected validation device, then acknowledge this checkpoint.",
  "establish-stale-device-condition": "Leave the selected validation device genuinely stale/offline until the scenario condition is actually satisfied, then acknowledge this checkpoint.",
  "terminate-obsidian": "Terminate Obsidian on the selected validation device after the harness has recorded this durable checkpoint.",
  "restart-obsidian": "Restart Obsidian on the selected validation device, then acknowledge this checkpoint.",
  "restore-google-authentication": "Restore Google authentication through the genuine production authorization flow, then acknowledge this checkpoint.",
  "disable-plugin": "Disable the BRAIN Google Drive Sync plugin, then acknowledge this checkpoint when the harness is available again.",
  "uninstall-plugin": "Uninstall the BRAIN Google Drive Sync plugin as required by the F03 scenario, then acknowledge this checkpoint after the harness is available again.",
  "reinstall-plugin": "Reinstall the approved validation build of the BRAIN Google Drive Sync plugin, then acknowledge this checkpoint after the harness is available again.",
  "unlink-device": "Perform the approved device-unlink action, then acknowledge this checkpoint when the harness is available again.",
});

function isoNow(clock: () => Date): string {
  return clock().toISOString();
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function copyState(state: HumanCheckpointDurableState): HumanCheckpointDurableState {
  return Object.freeze({
    ...state,
    checkpoint: Object.freeze({
      ...state.checkpoint,
      run: Object.freeze({ ...state.checkpoint.run }),
    }),
  });
}

type LoadedState =
  | { readonly kind: "empty" }
  | { readonly kind: "valid"; readonly state: HumanCheckpointDurableState }
  | { readonly kind: "invalid" };

function hydrate(raw: unknown): LoadedState {
  if (raw === null || raw === undefined) return { kind: "empty" };
  if (!raw || typeof raw !== "object") return { kind: "invalid" };
  const value = raw as Record<string, unknown>;
  if (value.schemaVersion !== HUMAN_CHECKPOINT_STATE_SCHEMA_VERSION) return { kind: "invalid" };
  if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 1) return { kind: "invalid" };
  if (!["awaiting-human-action", "awaiting-verification", "resumable"].includes(String(value.status))) return { kind: "invalid" };
  if (!value.checkpoint || typeof value.checkpoint !== "object") return { kind: "invalid" };
  const rawCheckpoint = value.checkpoint as Record<string, unknown>;
  if (!rawCheckpoint.run || typeof rawCheckpoint.run !== "object") return { kind: "invalid" };
  const rawRun = rawCheckpoint.run as Record<string, unknown>;
  if (
    typeof rawRun.runId !== "string" ||
    typeof rawRun.scenarioId !== "string" ||
    typeof rawCheckpoint.checkpointId !== "string" ||
    typeof rawCheckpoint.deviceId !== "string" ||
    typeof rawCheckpoint.requestedAction !== "string" ||
    typeof rawCheckpoint.instruction !== "string" ||
    !isHumanCheckpointAction(rawCheckpoint.requestedAction) ||
    rawCheckpoint.instruction !== ACTION_INSTRUCTIONS[rawCheckpoint.requestedAction] ||
    typeof value.devicePlatform !== "string" ||
    !isValidationDevicePlatform(value.devicePlatform) ||
    typeof value.resumeStepId !== "string" ||
    !isIsoTimestamp(value.createdAt) ||
    (value.timeoutAt !== undefined && !isIsoTimestamp(value.timeoutAt)) ||
    (value.acknowledgedAt !== undefined && !isIsoTimestamp(value.acknowledgedAt)) ||
    (value.verifiedAt !== undefined && !isIsoTimestamp(value.verifiedAt))
  ) return { kind: "invalid" };

  try {
    const run = validationRunIdentity(rawRun.runId, rawRun.scenarioId);
    const checkpoint = humanCheckpoint({
      checkpointId: rawCheckpoint.checkpointId,
      run,
      deviceId: rawCheckpoint.deviceId,
      requestedAction: rawCheckpoint.requestedAction,
      instruction: rawCheckpoint.instruction,
    });
    const status = value.status as HumanCheckpointDurableStatus;
    const acknowledgedAt = value.acknowledgedAt as string | undefined;
    const verifiedAt = value.verifiedAt as string | undefined;
    if (status === "awaiting-human-action" && (acknowledgedAt !== undefined || verifiedAt !== undefined)) return { kind: "invalid" };
    if (status === "awaiting-verification" && (acknowledgedAt === undefined || verifiedAt !== undefined)) return { kind: "invalid" };
    if (status === "resumable" && (acknowledgedAt === undefined || verifiedAt === undefined)) return { kind: "invalid" };

    return {
      kind: "valid",
      state: copyState({
        schemaVersion: HUMAN_CHECKPOINT_STATE_SCHEMA_VERSION,
        revision: value.revision as number,
        status,
        checkpoint,
        devicePlatform: value.devicePlatform,
        resumeStepId: validationStepId(value.resumeStepId),
        createdAt: value.createdAt,
        ...(value.timeoutAt ? { timeoutAt: value.timeoutAt as string } : {}),
        ...(acknowledgedAt ? { acknowledgedAt } : {}),
        ...(verifiedAt ? { verifiedAt } : {}),
      }),
    };
  } catch {
    return { kind: "invalid" };
  }
}

export class HumanCheckpointResumeController {
  constructor(
    private readonly store: HumanCheckpointStateStore,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async current(): Promise<HumanCheckpointControllerResult> {
    const loaded = hydrate(await this.store.load());
    if (loaded.kind === "empty") return { status: "empty" };
    if (loaded.kind === "invalid") return { status: "paused", reason: "persisted-state-invalid" };
    if (loaded.state.status === "resumable") return { status: "resumable", state: loaded.state };
    return {
      status: "paused",
      reason: loaded.state.status === "awaiting-human-action" ? "human-action-required" : "postcondition-not-observed",
      state: loaded.state,
    };
  }

  async begin(input: {
    readonly run: ValidationRunIdentity;
    readonly checkpointId: string;
    readonly device: ValidationDeviceIdentity;
    readonly action: HumanCheckpointAction;
    readonly resumeStepId: string;
    readonly timeoutMs?: number;
  }): Promise<HumanCheckpointControllerResult> {
    if (EXTERNAL_PERSISTENCE_ACTIONS.has(input.action) && this.store.durability !== "external-coordination") {
      return { status: "rejected", reason: "external-persistence-required" };
    }
    if (
      input.timeoutMs !== undefined &&
      (!Number.isSafeInteger(input.timeoutMs) || input.timeoutMs <= 0)
    ) return { status: "rejected", reason: "invalid-timeout" };

    const loaded = hydrate(await this.store.load());
    if (loaded.kind === "invalid") return { status: "paused", reason: "persisted-state-invalid" };
    if (loaded.kind === "valid") return { status: "rejected", reason: "active-checkpoint-exists", state: loaded.state };

    const createdAt = isoNow(this.clock);
    const checkpoint = humanCheckpoint({
      checkpointId: input.checkpointId,
      run: input.run,
      deviceId: String(input.device.deviceId),
      requestedAction: input.action,
      instruction: ACTION_INSTRUCTIONS[input.action],
    });
    const next = copyState({
      schemaVersion: HUMAN_CHECKPOINT_STATE_SCHEMA_VERSION,
      revision: 1,
      status: "awaiting-human-action",
      checkpoint,
      devicePlatform: input.device.platform,
      resumeStepId: validationStepId(input.resumeStepId),
      createdAt,
      ...(input.timeoutMs !== undefined
        ? { timeoutAt: new Date(Date.parse(createdAt) + input.timeoutMs).toISOString() }
        : {}),
    });
    if (!await this.store.compareAndSet(null, next)) return { status: "paused", reason: "state-changed" };
    return { status: "paused", reason: "human-action-required", state: next };
  }

  async acknowledge(run: ValidationRunIdentity, checkpointId: string): Promise<HumanCheckpointControllerResult> {
    const loaded = hydrate(await this.store.load());
    const checked = this.requireMatching(loaded, run, checkpointId);
    if ("result" in checked) return checked.result;
    const state = checked.state;
    if (state.status !== "awaiting-human-action") {
      return {
        status: "rejected",
        reason: state.acknowledgedAt ? "duplicate-acknowledgement" : "wrong-state",
        state,
      };
    }
    const next = copyState({
      ...state,
      revision: state.revision + 1,
      status: "awaiting-verification",
      acknowledgedAt: isoNow(this.clock),
    });
    if (!await this.store.compareAndSet(state.revision, next)) return { status: "paused", reason: "state-changed", state };
    return { status: "paused", reason: "postcondition-not-observed", state: next };
  }

  async verify(
    run: ValidationRunIdentity,
    checkpointId: string,
    currentDevice: ValidationDeviceIdentity,
    probe: HumanCheckpointPostconditionProbe,
  ): Promise<HumanCheckpointControllerResult> {
    const loaded = hydrate(await this.store.load());
    const checked = this.requireMatching(loaded, run, checkpointId);
    if ("result" in checked) return checked.result;
    const state = checked.state;
    if (state.status === "resumable") return { status: "resumable", state };
    if (state.status !== "awaiting-verification") return { status: "rejected", reason: "wrong-state", state };
    if (state.checkpoint.deviceId !== currentDevice.deviceId || state.devicePlatform !== currentDevice.platform) {
      return { status: "rejected", reason: "device-mismatch", state };
    }
    if (state.timeoutAt && this.clock().getTime() >= Date.parse(state.timeoutAt)) {
      return { status: "paused", reason: "verification-timeout", state };
    }

    let observation: HumanCheckpointPostconditionObservation;
    try {
      observation = await probe.observe({
        run: state.checkpoint.run,
        checkpointId: state.checkpoint.checkpointId,
        action: state.checkpoint.requestedAction,
        device: validationDeviceIdentity(String(state.checkpoint.deviceId), state.devicePlatform),
      });
    } catch {
      return { status: "paused", reason: "postcondition-probe-failed", state };
    }
    if (observation.status === "pending") return { status: "paused", reason: "postcondition-not-observed", state };
    if (observation.status === "ambiguous") return { status: "paused", reason: "postcondition-ambiguous", state };

    const next = copyState({
      ...state,
      revision: state.revision + 1,
      status: "resumable",
      verifiedAt: isoNow(this.clock),
    });
    if (!await this.store.compareAndSet(state.revision, next)) return { status: "paused", reason: "state-changed", state };
    return { status: "resumable", state: next };
  }

  async switchMobileDevice(
    run: ValidationRunIdentity,
    checkpointId: string,
    replacement: ValidationDeviceIdentity,
  ): Promise<HumanCheckpointControllerResult> {
    const loaded = hydrate(await this.store.load());
    const checked = this.requireMatching(loaded, run, checkpointId);
    if ("result" in checked) return checked.result;
    const state = checked.state;
    if (
      state.status !== "awaiting-human-action" ||
      !MOBILE_PLATFORMS.has(state.devicePlatform) ||
      !MOBILE_PLATFORMS.has(replacement.platform) ||
      state.checkpoint.deviceId === replacement.deviceId
    ) return { status: "rejected", reason: "device-switch-not-safe", state };

    const checkpoint = humanCheckpoint({
      checkpointId: String(state.checkpoint.checkpointId),
      run: state.checkpoint.run,
      deviceId: String(replacement.deviceId),
      requestedAction: state.checkpoint.requestedAction,
      instruction: state.checkpoint.instruction,
    });
    const next = copyState({
      ...state,
      revision: state.revision + 1,
      checkpoint,
      devicePlatform: replacement.platform,
    });
    if (!await this.store.compareAndSet(state.revision, next)) return { status: "paused", reason: "state-changed", state };
    return { status: "paused", reason: "human-action-required", state: next };
  }

  async consumeResume(
    run: ValidationRunIdentity,
    checkpointId: string,
    currentDevice: ValidationDeviceIdentity,
    resumeCommit: HumanCheckpointResumeCommitPort,
  ): Promise<HumanCheckpointControllerResult> {
    const loaded = hydrate(await this.store.load());
    const checked = this.requireMatching(loaded, run, checkpointId);
    if ("result" in checked) return checked.result;
    const state = checked.state;
    if (state.status !== "resumable") return { status: "rejected", reason: "wrong-state", state };
    if (state.checkpoint.deviceId !== currentDevice.deviceId || state.devicePlatform !== currentDevice.platform) {
      return { status: "rejected", reason: "device-mismatch", state };
    }

    try {
      await resumeCommit.commitResume({
        run: state.checkpoint.run,
        checkpointId: state.checkpoint.checkpointId,
        resumeStepId: state.resumeStepId,
      });
    } catch {
      return { status: "paused", reason: "resume-adoption-failed", state };
    }

    if (!await this.store.compareAndSet(state.revision, null)) {
      return { status: "paused", reason: "state-changed", state };
    }
    return {
      status: "resumed",
      checkpointId: state.checkpoint.checkpointId,
      resumeStepId: state.resumeStepId,
    };
  }

  private requireMatching(
    loaded: LoadedState,
    run: ValidationRunIdentity,
    checkpointId: string,
  ): { readonly state: HumanCheckpointDurableState } | { readonly result: HumanCheckpointControllerResult } {
    if (loaded.kind === "invalid") return { result: { status: "paused", reason: "persisted-state-invalid" } };
    if (loaded.kind === "empty") return { result: { status: "rejected", reason: "checkpoint-not-found" } };
    if (!sameRun(loaded.state.checkpoint.run, run)) {
      return { result: { status: "rejected", reason: "run-mismatch", state: loaded.state } };
    }
    let expected: HumanCheckpointId;
    try {
      expected = humanCheckpointId(checkpointId);
    } catch {
      return { result: { status: "rejected", reason: "checkpoint-mismatch", state: loaded.state } };
    }
    if (loaded.state.checkpoint.checkpointId !== expected) {
      return { result: { status: "rejected", reason: "checkpoint-mismatch", state: loaded.state } };
    }
    return { state: loaded.state };
  }
}
