import type { PlannedOperation, PlanningInput, SynchronizationPlan, SynchronizationPlanner, VaultPath } from "../contracts";
import { contractId } from "../contracts";

/**
 * Required production safety wrapper around the deterministic planner. A device explicitly known
 * to be stale may inspect/reconcile, but cannot authorize destructive propagation until its state
 * has been refreshed and the stale flag cleared by later orchestration/reconciliation.
 */
export class ProductionSynchronizationPlanner implements SynchronizationPlanner {
  constructor(private readonly inner: SynchronizationPlanner) {}

  async plan(input: PlanningInput): Promise<SynchronizationPlan> {
    const plan = await this.inner.plan(input);
    if (input.state.status !== "trusted") return plan;

    const trustedState = input.state.state;
    const currentDevice = trustedState.knownDevices.find(device => device.deviceId === trustedState.deviceIdentity);
    if (!currentDevice?.stale || !plan.operations.some(operation => operation.destructive)) return plan;

    const path = (plan.operations.find(operation => operation.destructive)?.path ?? contractId<"VaultPath">("__stale_device__")) as VaultPath;
    const guard: PlannedOperation = {
      operationId: contractId<"OperationId">(`stale-device-guard:${String(trustedState.deviceIdentity)}:${String(plan.planId)}`),
      kind: "blocked-unsafe",
      path,
      destructive: false,
      preconditions: [],
      reasons: [{ code: "stale-device-destructive-gate", summary: "This device is stale and must reconcile before it can authorize destructive propagation." }],
    };
    return { ...plan, operations: [...plan.operations, guard], executionDisposition: "blocked", recoveryCheckpointRequired: plan.recoveryCheckpointRequired, globalExecutionGate: "globally-blocked" };
  }
}
