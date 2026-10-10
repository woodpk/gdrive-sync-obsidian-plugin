import type { ProductionVerificationControl } from "../../../src/product/live-validation-control-seam";

type ProductionReceipt = Exclude<ReturnType<ProductionVerificationControl["latestProductionRunReceipt"]>, undefined>;
type ProductionStatus = ReturnType<ProductionVerificationControl["currentStatus"]>;
type ProductionActionResult = Awaited<ReturnType<ProductionVerificationControl["executePlan"]>>;

interface CommandHeader {
  readonly runId: string;
  readonly deviceId: string;
  readonly sequence: number;
  readonly commandId: string;
}

export type DeviceCommand = CommandHeader & (
  | { readonly kind: "fixture-put"; readonly path: string; readonly content: { readonly type: "text"; readonly text: string } | { readonly type: "pattern"; readonly byteLength: number; readonly seed: string } }
  | { readonly kind: "fixture-remove"; readonly path: string }
  | { readonly kind: "observe-file"; readonly path: string }
  | { readonly kind: "production-preview"; readonly mode: "manual" | "verify-reconcile" }
  | { readonly kind: "production-execute"; readonly planId: string }
  | { readonly kind: "production-control"; readonly action: "pause" | "resume" | "cancel-active-sync" }
  | { readonly kind: "observe-product" }
);

export interface FixtureObservation {
  readonly exists: boolean;
  readonly sizeBytes?: number;
  readonly sha256?: string;
}

export interface DeviceFixturePort {
  putText(path: string, text: string): Promise<void>;
  putPattern(path: string, byteLength: number, seed: string): Promise<void>;
  remove(path: string): Promise<void>;
  observe(path: string): Promise<FixtureObservation>;
}

export interface ValidationBuildIdentity { readonly schemaVersion: 1; readonly sourceCommit: string; }

export interface DeviceCommandResult {
  readonly validationBuild: ValidationBuildIdentity;
  readonly runId: string;
  readonly deviceId: string;
  readonly sequence: number;
  readonly commandId: string;
  readonly kind: DeviceCommand["kind"] | "invalid";
  readonly status: "completed" | "rejected" | "failed";
  readonly classification: string;
  readonly replayed?: true;
  readonly plan?: {
    readonly planId: string;
    readonly trigger: string;
    readonly operationCount: number;
    readonly operationKinds?: readonly string[];
    readonly executionDisposition: string;
    readonly recoveryCheckpointRequired: boolean;
    readonly globalExecutionGate: string;
  };
  readonly actionResult?: ProductionActionResult;
  readonly receipt?: ProductionReceipt;
  readonly productStatus?: ProductionStatus;
  readonly fixture?: FixtureObservation;
}

export type DeviceSequenceState =
  | { readonly sequence: number; readonly commandKey: string; readonly phase: "claimed" }
  | { readonly sequence: number; readonly commandKey: string; readonly phase: "completed"; readonly result: DeviceCommandResult };

export interface DeviceSequenceStateStore {
  load(runId: string, deviceId: string): Promise<DeviceSequenceState | undefined>;
  compareAndSave(runId: string, deviceId: string, expected: DeviceSequenceState | undefined, next: DeviceSequenceState): Promise<boolean>;
}

export interface DeviceCommandAgentOptions {
  readonly runId: string;
  readonly deviceId: string;
  readonly fixtureRoot: string;
  readonly validationBuild: ValidationBuildIdentity;
  readonly fixtures: DeviceFixturePort;
  readonly sequenceState: DeviceSequenceStateStore;
  readonly production?: ProductionVerificationControl;
  readonly maxInlineTextChars?: number;
  readonly maxPatternBytes?: number;
}

export interface BoundedDeviceCommandAgent {
  execute(input: unknown): Promise<DeviceCommandResult>;
}

const commandKinds = new Set([
  "fixture-put",
  "fixture-remove",
  "observe-file",
  "production-preview",
  "production-execute",
  "production-control",
  "observe-product",
]);

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function boundedString(value: unknown, max = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function canonical(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined";
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map(key => JSON.stringify(key) + ":" + canonical(record[key])).join(",") + "}";
}

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseCommand(value: unknown): DeviceCommand | undefined {
  const record = objectValue(value);
  if (!record || !boundedString(record.runId, 128) || !boundedString(record.deviceId, 128) ||
      !Number.isSafeInteger(record.sequence) || Number(record.sequence) <= 0 ||
      !boundedString(record.commandId, 128) || typeof record.kind !== "string" || !commandKinds.has(record.kind)) return undefined;
  const base = record as Record<string, any>;
  switch (record.kind) {
    case "fixture-put": {
      if (!boundedString(record.path, 512)) return undefined;
      const content = objectValue(record.content);
      if (!content || (content.type !== "text" && content.type !== "pattern")) return undefined;
      if (content.type === "text" && typeof content.text !== "string") return undefined;
      if (content.type === "pattern" && (!Number.isSafeInteger(content.byteLength) || Number(content.byteLength) < 0 || !boundedString(content.seed, 128))) return undefined;
      return base as DeviceCommand;
    }
    case "fixture-remove":
    case "observe-file":
      return boundedString(record.path, 512) ? base as DeviceCommand : undefined;
    case "production-preview":
      return record.mode === "manual" || record.mode === "verify-reconcile" ? base as DeviceCommand : undefined;
    case "production-execute":
      return boundedString(record.planId, 256) ? base as DeviceCommand : undefined;
    case "production-control":
      return typeof record.action === "string" && ["pause", "resume", "cancel-active-sync"].includes(record.action) ? base as DeviceCommand : undefined;
    case "observe-product":
      return base as DeviceCommand;
    default:
      return undefined;
  }
}

function safeFixtureRoot(root: string): boolean {
  return /^BVP-VALIDATION\/[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/.test(root);
}

function fixturePath(root: string, relativePath: string): string | undefined {
  if (relativePath.startsWith("/") || relativePath.includes("\\") || /[<>:"|?*\u0000-\u001f]/.test(relativePath)) return undefined;
  const parts = relativePath.split("/");
  if (parts.some(part => part.length === 0 || part === "." || part === "..")) return undefined;
  return root + "/" + relativePath;
}

function resultFor(options: DeviceCommandAgentOptions, command: DeviceCommand | undefined, status: DeviceCommandResult["status"], classification: string): DeviceCommandResult {
  return {
    validationBuild: copy(options.validationBuild),
    runId: options.runId,
    deviceId: options.deviceId,
    sequence: command?.sequence ?? 0,
    commandId: command?.commandId ?? "invalid",
    kind: command?.kind ?? "invalid",
    status,
    classification,
  };
}

function verifiedFixture(observation: FixtureObservation, shouldExist: boolean): boolean {
  if (observation.exists !== shouldExist) return false;
  if (!shouldExist) return true;
  return Number.isSafeInteger(observation.sizeBytes) && Number(observation.sizeBytes) >= 0 &&
    typeof observation.sha256 === "string" && /^[0-9a-f]{64}$/i.test(observation.sha256);
}

export function createBoundedDeviceCommandAgent(options: DeviceCommandAgentOptions): BoundedDeviceCommandAgent {
  if (!boundedString(options.runId, 128) || !boundedString(options.deviceId, 128) || !safeFixtureRoot(options.fixtureRoot) ||
      options.validationBuild.schemaVersion !== 1 || !/^[0-9a-f]{40}$/i.test(options.validationBuild.sourceCommit)) {
    throw new Error("device command agent identity/fixture scope/build identity is invalid");
  }
  const maxInlineTextChars = options.maxInlineTextChars ?? 65_536;
  const maxPatternBytes = options.maxPatternBytes ?? 33_554_432;

  async function dispatch(command: DeviceCommand): Promise<DeviceCommandResult> {
    const base = resultFor(options, command, "completed", "completed");
    if (command.kind === "fixture-put" || command.kind === "fixture-remove" || command.kind === "observe-file") {
      const path = fixturePath(options.fixtureRoot, command.path);
      if (!path) return resultFor(options, command, "rejected", "fixture-path-out-of-scope");
      if (command.kind === "fixture-put") {
        if (command.content.type === "text") {
          if (command.content.text.length > maxInlineTextChars) return resultFor(options, command, "rejected", "fixture-content-too-large");
          await options.fixtures.putText(path, command.content.text);
        } else {
          if (command.content.byteLength > maxPatternBytes) return resultFor(options, command, "rejected", "fixture-pattern-too-large");
          await options.fixtures.putPattern(path, command.content.byteLength, command.content.seed);
        }
        const observed = await options.fixtures.observe(path);
        return verifiedFixture(observed, true)
          ? { ...base, classification: "fixture-verified", fixture: copy(observed) }
          : resultFor(options, command, "failed", "fixture-verification-failed");
      }
      if (command.kind === "fixture-remove") {
        await options.fixtures.remove(path);
        const observed = await options.fixtures.observe(path);
        return verifiedFixture(observed, false)
          ? { ...base, classification: "fixture-removal-verified", fixture: copy(observed) }
          : resultFor(options, command, "failed", "fixture-removal-unverified");
      }
      const observed = await options.fixtures.observe(path);
      if (observed.exists && !verifiedFixture(observed, true)) return resultFor(options, command, "failed", "fixture-observation-incomplete");
      return { ...base, classification: "fixture-observed", fixture: copy(observed) };
    }

    const production = options.production;
    if (!production) return resultFor(options, command, "rejected", "production-unavailable");

    if (command.kind === "production-preview") {
      const plan = command.mode === "manual" ? await production.previewManual() : await production.previewVerifyReconcile();
      if (!plan) return resultFor(options, command, "rejected", "production-preview-unavailable");
      return {
        ...base,
        classification: "production-preview-ready",
        plan: {
          planId: String(plan.planId),
          trigger: plan.trigger,
          operationCount: plan.operations.length,
          operationKinds: [...new Set(plan.operations.map(operation => String(operation.kind)))].sort(),
          executionDisposition: plan.executionDisposition,
          recoveryCheckpointRequired: plan.recoveryCheckpointRequired,
          globalExecutionGate: plan.globalExecutionGate,
        },
      };
    }

    if (command.kind === "production-execute") {
      const before = production.latestProductionRunReceipt();
      const actionResult = await production.executePlan(command.planId as Parameters<ProductionVerificationControl["executePlan"]>[0]);
      if (actionResult.status === "rejected") {
        return { ...resultFor(options, command, "rejected", "production-action-rejected"), actionResult: copy(actionResult) };
      }
      const receipt = production.latestProductionRunReceipt();
      if (!receipt || receipt.runId === before?.runId || String(receipt.planId) !== command.planId) {
        return { ...resultFor(options, command, "failed", "production-receipt-missing-or-stale"), actionResult: copy(actionResult) };
      }
      return {
        ...base,
        classification: "production-" + receipt.terminal,
        actionResult: copy(actionResult),
        receipt: copy(receipt),
      };
    }

    if (command.kind === "production-control") {
      const actionResult = command.action === "pause"
        ? await production.pause()
        : command.action === "resume"
          ? await production.resume()
          : await production.cancelActiveSync();
      return {
        ...resultFor(options, command, actionResult.status === "accepted" ? "completed" : "rejected",
          actionResult.status === "accepted" ? "production-control-accepted" : "production-control-rejected"),
        actionResult: copy(actionResult),
        productStatus: copy(production.currentStatus()),
      };
    }

    const receipt = production.latestProductionRunReceipt();
    return {
      ...base,
      classification: "product-observed",
      productStatus: copy(production.currentStatus()),
      ...(receipt ? { receipt: copy(receipt) } : {}),
    };
  }

  return {
    async execute(input: unknown): Promise<DeviceCommandResult> {
      const command = parseCommand(input);
      if (!command) return resultFor(options, undefined, "rejected", "invalid-command");
      if (command.runId !== options.runId) return resultFor(options, command, "rejected", "run-mismatch");
      if (command.deviceId !== options.deviceId) return resultFor(options, command, "rejected", "device-mismatch");
      const commandKey = canonical(command);

      let claim: DeviceSequenceState;
      for (;;) {
        let state: DeviceSequenceState | undefined;
        try { state = await options.sequenceState.load(options.runId, options.deviceId); }
        catch { return resultFor(options, command, "failed", "sequence-state-unavailable"); }
        if (state) {
          if (command.sequence < state.sequence) return resultFor(options, command, "rejected", "stale-sequence");
          if (command.sequence === state.sequence) {
            if (commandKey !== state.commandKey) return resultFor(options, command, "rejected", "sequence-conflict");
            if (state.phase === "claimed") return resultFor(options, command, "failed", "prior-outcome-uncertain");
            return { ...copy(state.result), replayed: true };
          }
          if (state.phase === "claimed") return resultFor(options, command, "failed", "prior-outcome-uncertain");
          if (command.sequence !== state.sequence + 1) return resultFor(options, command, "rejected", "sequence-gap");
        } else if (command.sequence !== 1) return resultFor(options, command, "rejected", "sequence-gap");
        claim = { sequence: command.sequence, commandKey, phase: "claimed" };
        try { if (await options.sequenceState.compareAndSave(options.runId, options.deviceId, state, claim)) break; }
        catch { return resultFor(options, command, "failed", "sequence-claim-failed"); }
      }

      let terminal: DeviceCommandResult;
      try {
        terminal = await dispatch(command);
      } catch {
        terminal = resultFor(options, command, "failed", "command-handler-failed");
      }

      try {
        const completed: DeviceSequenceState = { sequence: command.sequence, commandKey, phase: "completed", result: copy(terminal) };
        if (!await options.sequenceState.compareAndSave(options.runId, options.deviceId, claim, completed)) {
          return resultFor(options, command, "failed", "sequence-state-finalization-failed");
        }
      } catch { return resultFor(options, command, "failed", "sequence-state-finalization-failed"); }
      return terminal;
    },
  };
}
