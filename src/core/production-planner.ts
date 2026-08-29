import type { PlannedOperation, PlanningInput, SynchronizationPlan, SynchronizationPlanner } from "../contracts";
import { semanticPlanId, withSemanticOperationId } from "./semantic-identifiers";

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
    // A pre-existing global gate remains authoritative. In particular, stale-device isolation must
    // never turn a checkpoint-backed destructive approval plan into an automatically eligible one.
    if (plan.globalExecutionGate !== "none" || plan.recoveryCheckpointRequired) return plan;

    const operations = plan.operations.map((operation, index): PlannedOperation => {
      if (!operation.destructive) return operation;
      return withSemanticOperationId({
        kind: "blocked-unsafe",
        path: operation.path,
        ...(operation.fromPath ? { fromPath: operation.fromPath } : {}),
        ...(operation.toPath ? { toPath: operation.toPath } : {}),
        destructive: false,
        preconditions: [],
        reasons: [{ code: "stale-device-destructive-gate", summary: "This device is stale and must reconcile before it can authorize destructive propagation." }],
      }, index);
    });
    const executionDisposition = "requires-user-approval" as const;
    const globalExecutionGate = "none" as const;
    return {
      ...plan,
      planId: semanticPlanId({ trigger: plan.trigger, operations, executionDisposition, recoveryCheckpointRequired: false, globalExecutionGate }),
      operations,
      executionDisposition,
      recoveryCheckpointRequired: false,
      globalExecutionGate,
    };
  }
}
