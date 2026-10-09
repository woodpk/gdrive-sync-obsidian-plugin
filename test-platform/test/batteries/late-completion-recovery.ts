import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import type { ScenarioDefinition, ScenarioAssertionStep } from "../../src/scenario/scenario-contract";
import type { ScenarioExecutionResult } from "../../src/scenario/scenario-runner";
import { assertScenarioObservation } from "../../src/scenario/scenario-evidence";
import type { DeviceCommandResult } from "../../src/live-device/device-command-agent";
import { liveCommandId, liveSequenceFor, type LiveScenarioExecutor } from "../../src/live-device/live-scenario-executor";

export interface LateCompletionRecovery {
  readonly prior: ScenarioExecutionResult;
  readonly completedStepIndex: number;
  readonly result: DeviceCommandResult;
}

interface RecoveryOptions {
  readonly scenario: ScenarioDefinition;
  readonly runId: string;
  readonly deviceIds: Readonly<Record<string, string>>;
  readonly sourceCommit: string;
  readonly relayRoot: string;
  readonly previousResultFile: string;
}

function reject(reason: string): never {
  throw new Error("late-completion-recovery-" + reason);
}

function record(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Fail-closed continuation from a timed-out, already-committed production execution.
 * This function is read-only. It MUST run before controller-lease acquisition and
 * cannot dispatch or repeat a synchronization operation.
 */
export async function loadLateCompletionRecovery(options: RecoveryOptions): Promise<LateCompletionRecovery> {
  const { scenario, runId, deviceIds, sourceCommit, relayRoot, previousResultFile } = options;
  const raw: unknown = JSON.parse(await readFile(previousResultFile, "utf8"));
  if (!record(raw) || !record(raw.result)) reject("prior-envelope-invalid");
  const prior = raw.result as ScenarioExecutionResult;
  if (prior.scenarioId !== scenario.id || prior.status !== "blocked" ||
      prior.classification !== "device-result-unavailable" ||
      !Array.isArray(prior.steps) || !record(prior.captures)) reject("prior-verdict-invalid");
  const identities = Object.values(deviceIds).sort();
  const machine = prior.evidence?.machine;
  if (machine?.executionMode !== "live" || machine.liveIdentity?.runId !== runId ||
      machine.liveIdentity?.sourceCommit !== sourceCommit ||
      JSON.stringify([...machine.deviceIdentities].sort()) !== JSON.stringify(identities)) {
    reject("prior-identity-mismatch");
  }

  const index = prior.steps.length - 1;
  const step = scenario.steps[index];
  if (index < 1 || !step || step.kind !== "production" ||
      (step.operation !== "synchronize" && step.operation !== "reconcile") ||
      !("device" in step) || typeof step.device !== "string" ||
      !deviceIds[step.device] || prior.steps.length >= scenario.steps.length) reject("unsupported-timeout-step");
  for (let i = 0; i <= index; i++) {
    const previous = prior.steps[i]!;
    const defined = scenario.steps[i]!;
    if (previous.index !== i || previous.stepId !== defined.id || previous.kind !== defined.kind ||
        (i < index && (previous.status !== "completed" || previous.matchedExpectation !== true)) ||
        (i === index && (previous.status !== "blocked" || previous.classification !== "device-result-unavailable"))) {
      reject("prior-step-mismatch");
    }
    if (i < index && "captureAs" in defined && typeof defined.captureAs === "string" &&
        !Object.prototype.hasOwnProperty.call(prior.captures, defined.captureAs)) reject("prior-capture-missing");
    if (i < index && defined.kind === "production") reject("prior-production-replay-unsupported");
  }
  // A captured reference must not cross the recovery seam except via the saved
  // prior captures; every re-evaluated assertion uses that original evidence.
  for (const folder of ["outbox", "sent"]) {
    const pending = await readdir(join(relayRoot, folder));
    if (pending.length !== 0) reject("pending-relay-command");
  }
  const sequence = liveSequenceFor(scenario, step.device, index, 1);
  const id = liveCommandId(runId, scenario.id, index, 1);
  const rawResult: unknown = JSON.parse(await readFile(join(relayRoot, "inbox", id + ".json.result.json"), "utf8"));
  if (!record(rawResult)) reject("receipt-invalid");
  const receipt = rawResult as DeviceCommandResult;
  if (receipt.runId !== runId || receipt.deviceId !== deviceIds[step.device] ||
      receipt.validationBuild?.schemaVersion !== 1 || receipt.validationBuild.sourceCommit !== sourceCommit ||
      receipt.commandId !== id || receipt.sequence !== sequence || receipt.kind !== "production-execute" ||
      receipt.status !== "completed" || receipt.classification !== "production-complete" ||
      receipt.actionResult?.status !== "accepted" || receipt.receipt?.terminal !== "complete" ||
      receipt.receipt?.requiredEffectsCommittedAndVerified !== true ||
      !receipt.receipt.planId) reject("receipt-not-authoritative-complete");
  return { prior, completedStepIndex: index, result: receipt };
}

/** Reuse the canonical runner and live executor; completed prefix never reaches the device. */
export function withLateCompletionRecovery(executor: LiveScenarioExecutor, recovery: LateCompletionRecovery): LiveScenarioExecutor {
  return {
    executionMode: executor.executionMode,
    deviceIdentities: executor.deviceIdentities,
    runIdentity: executor.runIdentity,
    buildIdentity: executor.buildIdentity,
    pendingCheckpoint: () => executor.pendingCheckpoint(),
    async dispose() { await executor.dispose?.(); },
    async execute(step, context) {
      if (context.stepIndex > recovery.completedStepIndex) return executor.execute(step, context);
      if (context.stepIndex === recovery.completedStepIndex) {
        return { status: "completed", value: recovery.result };
      }
      if (step.kind === "assert") return assertScenarioObservation(step as ScenarioAssertionStep, context);
      if ("captureAs" in step && typeof step.captureAs === "string") {
        return { status: "completed", value: recovery.prior.captures[step.captureAs] };
      }
      return { status: "completed" };
    },
  };
}
