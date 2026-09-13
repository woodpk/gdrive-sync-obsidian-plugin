import type { PlannedOperation } from "../contracts";
import { CONFIG_REMOTE_NAMESPACE } from "./path-scope";

export interface PlanOperationGroups {
  readonly vaultChanges: readonly PlannedOperation[];
  readonly system: readonly PlannedOperation[];
  readonly unchangedVault: readonly PlannedOperation[];
}

export function isSystemPlanOperation(operation: PlannedOperation): boolean {
  const path = String(operation.path);
  return path === CONFIG_REMOTE_NAMESPACE || path.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`);
}

export function groupPlanOperations(operations: readonly PlannedOperation[]): PlanOperationGroups {
  const vaultChanges: PlannedOperation[] = [];
  const system: PlannedOperation[] = [];
  const unchangedVault: PlannedOperation[] = [];

  for (const operation of operations) {
    if (isSystemPlanOperation(operation)) system.push(operation);
    else if (operation.kind === "noop") unchangedVault.push(operation);
    else vaultChanges.push(operation);
  }

  return { vaultChanges, system, unchangedVault };
}

export function shouldExpandSystemGroup(operations: readonly PlannedOperation[]): boolean {
  return operations.some(operation => operation.kind !== "noop");
}
