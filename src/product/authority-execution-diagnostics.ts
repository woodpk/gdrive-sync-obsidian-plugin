import type { OperationPrecondition, PlannedOperation, SynchronizationAuthorityStoreV1_1 } from "../contracts";
import type { ExecutionLifecycleObserver, ExecutionLifecycleStage } from "../core/execution-coordinator";
import type { DiagnosticLogger, SafeDiagnosticFields } from "../diagnostics/diagnostic-logger";

export type ObservableSynchronizationAuthorityStore = SynchronizationAuthorityStoreV1_1 & {
  readonly executionLifecycleObserver?: ExecutionLifecycleObserver;
};

function failureBoundary(stage: ExecutionLifecycleStage): { readonly stage: string; readonly classification: string } | undefined {
  switch (stage) {
    case "operation-precondition-validation-failed": return { stage: "operation-precondition-validation", classification: "operation-precondition-validation-failure" };
    case "pending-journal-failed": return { stage: "pending-journal", classification: "pending-journal-failure" };
    case "pending-journal-discard-failed": return { stage: "pending-journal-discard", classification: "pending-journal-discard-failure" };
    case "content-mutation-failed": return { stage: "content-mutation", classification: "content-mutation-failure" };
    case "uncertain-state-journal-failed": return { stage: "uncertain-state-journal", classification: "uncertain-state-journal-failure" };
    case "state-commit-failed": return { stage: "state-commit", classification: "state-commit-failure" };
    default: return undefined;
  }
}

function failedFields(failed?: readonly OperationPrecondition[]): SafeDiagnosticFields {
  if (!failed?.length) return {};
  return {
    failedPreconditionCount: failed.length,
    failedPreconditionKinds: [...new Set(failed.map(precondition => precondition.kind))].sort().join(","),
    failedPreconditionSides: [...new Set(failed.map(precondition => {
      if ("side" in precondition) return precondition.side;
      if (precondition.kind === "file-stable") return "local";
      if (precondition.kind === "remote-object" || precondition.kind === "remote-enumeration-complete") return "remote";
      if (precondition.kind === "base-trusted" || precondition.kind === "base-authority") return "state";
      return "identity";
    }))].sort().join(","),
  };
}

export function authoritativeDiagnostics(
  logger: DiagnosticLogger | undefined,
): { readonly logger?: DiagnosticLogger; readonly observer?: ExecutionLifecycleObserver } {
  if (!logger) return {};
  let runId: number | undefined;
  let operationIndex = 0;

  const proxied = new Proxy(logger, {
    get(target, property, receiver) {
      if (property === "syncTrace") {
        return (component: Parameters<DiagnosticLogger["syncTrace"]>[0], event: string, currentRunId: number, fields?: SafeDiagnosticFields) => {
          if (component === "sync.execute" && event === "operation-start") {
            runId = currentRunId;
            operationIndex = typeof fields?.operationIndex === "number" ? fields.operationIndex : operationIndex;
          }
          return target.syncTrace(component, event, currentRunId, fields);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as DiagnosticLogger;

  const observer: ExecutionLifecycleObserver = (operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string, error?: unknown, failed?: readonly OperationPrecondition[]) => {
    if (runId === undefined) return;
    // The base controller already emits these two entry markers.
    if (stage === "operation-start" || stage === "operation-precondition-validation-start") return;
    const failure = failureBoundary(stage);
    const fields: SafeDiagnosticFields = {
      stage: failure?.stage ?? stage,
      operationIndex,
      operationKind: operation.kind,
      direction: operation.kind.startsWith("upload-") ? "local-to-remote" : operation.kind.startsWith("download-") ? "remote-to-local" : operation.targetSide ?? "none",
      preconditionCount: operation.preconditions.length,
      destructiveCount: operation.destructive ? 1 : 0,
      ...failedFields(failed),
      ...(result ? { result } : {}),
      ...(failure ? { classification: failure.classification } : {}),
    };
    logger.syncTrace("sync.execute", stage, runId, fields);
    if (!failure) return;
    if (error !== undefined) logger.syncFailure("sync.execute", stage, runId, error, fields);
    else logger.syncError("sync.execute", stage, runId, fields);
  };

  return { logger: proxied, observer };
}

export function withExecutionLifecycleObserver(
  store: SynchronizationAuthorityStoreV1_1,
  observer: ExecutionLifecycleObserver | undefined,
): ObservableSynchronizationAuthorityStore {
  if (!observer) return store;
  return {
    executionLifecycleObserver: observer,
    loadAuthority: () => store.loadAuthority(),
    saveAuthority: (state, expectedPersistenceRevision, expectedSemanticGeneration) => store.saveAuthority(state, expectedPersistenceRevision, expectedSemanticGeneration),
    commitBaseTransition: (transition, expectedPersistenceRevision, expectedSemanticGeneration) => store.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration),
  };
}
