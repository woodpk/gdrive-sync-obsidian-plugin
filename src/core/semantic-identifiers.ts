import type { OperationId, PlanId, PlannedOperation, SynchronizationPlan } from "../contracts";
import { contractId } from "../contracts";
import { sha256Text } from "../util/sha256";

function canonicalize(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const canonical = canonicalize(record[key]);
    if (canonical !== undefined) result[key] = canonical;
  }
  return result;
}

export function semanticFingerprint(value: unknown): string {
  return String(sha256Text(JSON.stringify(canonicalize(value)))).slice("sha256:".length);
}

export type OperationIntent = Omit<PlannedOperation, "operationId">;

export function semanticOperationId(intent: OperationIntent, ordinal = 0): OperationId {
  return contractId<"OperationId">(`op:${semanticFingerprint({ ordinal, intent })}`) as OperationId;
}

export function withSemanticOperationId(intent: OperationIntent, ordinal = 0): PlannedOperation {
  return { operationId: semanticOperationId(intent, ordinal), ...intent };
}

export function semanticPlanId(values: {
  readonly trigger: SynchronizationPlan["trigger"];
  readonly operations: readonly PlannedOperation[];
  readonly executionDisposition: SynchronizationPlan["executionDisposition"];
  readonly recoveryCheckpointRequired: boolean;
  readonly globalExecutionGate: SynchronizationPlan["globalExecutionGate"];
}): PlanId {
  return contractId<"PlanId">(`plan:${semanticFingerprint({
    trigger: values.trigger,
    operations: values.operations.map(operation => ({ operationId: operation.operationId })),
    executionDisposition: values.executionDisposition,
    recoveryCheckpointRequired: values.recoveryCheckpointRequired,
    globalExecutionGate: values.globalExecutionGate,
  })}`) as PlanId;
}
