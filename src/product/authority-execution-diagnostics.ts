import type {
  OperationPrecondition,
  PlannedOperation,
  RecoverableMutationEffectV1_1,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthorityStoreV1_1,
} from "../contracts";
import type { ExecutionLifecycleObserver, ExecutionLifecycleStage } from "../core/execution-coordinator";
import { diagnosticPathKey, type DiagnosticLogger, type SafeDiagnosticFields } from "../diagnostics/diagnostic-logger";

export type AuthorityPersistenceFailureStage = "pending-journal-failed" | "uncertain-state-journal-failed";

export type ExecutionDiagnosticEmitter = (
  operation: PlannedOperation,
  component: "sync.execute" | "sync.effect",
  event: string,
  fields?: SafeDiagnosticFields,
  error?: unknown,
) => void;

type ObservableLifecycleObserver = ExecutionLifecycleObserver & {
  readonly executionDiagnosticEmitter?: ExecutionDiagnosticEmitter;
};

export type ObservableSynchronizationAuthorityStore = SynchronizationAuthorityStoreV1_1 & {
  readonly executionLifecycleObserver?: ExecutionLifecycleObserver;
  readonly executionDiagnosticEmitter?: ExecutionDiagnosticEmitter;
  readonly consumeAuthorityPersistenceFailureStage?: (error: unknown) => AuthorityPersistenceFailureStage | undefined;
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

function operationFields(operation: PlannedOperation, operationIndex: number, planId?: string): SafeDiagnosticFields {
  return {
    ...(planId ? { planId } : {}),
    operationId: String(operation.operationId),
    pathKey: diagnosticPathKey(String(operation.path)),
    operationIndex,
    operationKind: operation.kind,
    direction: operation.kind.startsWith("upload-")
      ? "local-to-remote"
      : operation.kind.startsWith("download-")
        ? "remote-to-local"
        : operation.targetSide ?? "none",
    target: operation.targetSide ?? "none",
    preconditionCount: operation.preconditions.length,
    destructiveCount: operation.destructive ? 1 : 0,
    ...(operation.remoteObjectId ? { remoteObjectId: String(operation.remoteObjectId) } : {}),
  };
}

function effectFor(
  state: SynchronizationAuthorityMetadataV1_1 | undefined,
  operation: PlannedOperation,
  effectId: string,
): RecoverableMutationEffectV1_1 | undefined {
  return state?.operationIntents
    .find(intent => intent.operationId === operation.operationId)
    ?.effects.find(effect => effect.effectId === effectId);
}

function finalizationTransitions(
  previous: SynchronizationAuthorityMetadataV1_1 | undefined,
  candidate: SynchronizationAuthorityMetadataV1_1,
  operation: PlannedOperation | undefined,
): readonly { readonly intentId: string; readonly effect: RecoverableMutationEffectV1_1 }[] {
  if (!previous || !operation) return [];
  const candidateIntent = candidate.operationIntents.find(intent => intent.operationId === operation.operationId);
  if (!candidateIntent) return [];
  return candidateIntent.effects
    .filter(effect => effect.stage === "state-committed" && effectFor(previous, operation, effect.effectId)?.stage === "effect-verified")
    .map(effect => ({ intentId: String(candidateIntent.intentId), effect }));
}

export function authoritativeDiagnostics(
  logger: DiagnosticLogger | undefined,
): { readonly logger?: DiagnosticLogger; readonly observer?: ExecutionLifecycleObserver } {
  if (!logger) return {};
  let runId: number | undefined;
  let operationIndex = 0;
  let planId: string | undefined;
  let physicalVerified = false;
  let commitStarted = false;

  const proxied = new Proxy(logger, {
    get(target, property, receiver) {
      if (property === "syncTrace") {
        return (component: Parameters<DiagnosticLogger["syncTrace"]>[0], event: string, currentRunId: number, fields?: SafeDiagnosticFields) => {
          runId = currentRunId;
          if (typeof fields?.planId === "string") planId = fields.planId;
          if (component === "sync.execute" && event === "operation-start") {
            operationIndex = typeof fields?.operationIndex === "number" ? fields.operationIndex : operationIndex;
            physicalVerified = false;
            commitStarted = false;
          }
          return target.syncTrace(component, event, currentRunId, fields);
        };
      }
      if (property === "syncInfo") {
        return (component: Parameters<DiagnosticLogger["syncInfo"]>[0], event: string, currentRunId: number, fields?: SafeDiagnosticFields) => {
          runId = currentRunId;
          if (typeof fields?.planId === "string") planId = fields.planId;
          return target.syncInfo(component, event, currentRunId, fields);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as DiagnosticLogger;

  const emitter: ExecutionDiagnosticEmitter = (operation, component, event, fields = {}, error) => {
    if (runId === undefined) return;
    const completeFields: SafeDiagnosticFields = {
      ...operationFields(operation, operationIndex, planId),
      ...fields,
    };
    if (error !== undefined) logger.syncFailure(component, event, runId, error, completeFields);
    else logger.syncTrace(component, event, runId, completeFields);
  };

  const observer = ((operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string, error?: unknown, failed?: readonly OperationPrecondition[]) => {
    if (runId === undefined) return;
    const failure = failureBoundary(stage);
    if (stage === "operation-start") {
      physicalVerified = false;
      commitStarted = false;
      emitter(operation, "sync.execute", "operation-entry", { stage: "operation-start" });
      return;
    }
    // The base controller already emits this exact start marker with the active operation index.
    if (stage === "operation-precondition-validation-start") return;
    if (stage === "integrity-verification-complete" && result === "verified") physicalVerified = true;
    if (stage === "state-commit-start") commitStarted = true;

    let classification = failure?.classification;
    if (stage === "state-commit-failed" && result === "durable-finalization-failed") classification = "durable-finalization-failure";
    if (stage === "operation-complete" && result === "recovery-required" && physicalVerified && !commitStarted) {
      classification = "post-verification-authority-unavailable";
    }

    const fields: SafeDiagnosticFields = {
      ...operationFields(operation, operationIndex, planId),
      stage: failure?.stage ?? stage,
      ...failedFields(failed),
      ...(result ? { result } : {}),
      ...(stage.startsWith("state-commit") && result ? { commitStatus: result } : {}),
      ...(classification ? { classification } : {}),
    };
    logger.syncTrace("sync.execute", stage, runId, fields);
    if (!failure) return;
    if (error !== undefined) logger.syncFailure("sync.execute", stage, runId, error, fields);
    else logger.syncError("sync.execute", stage, runId, fields);
  }) as ObservableLifecycleObserver;
  Object.defineProperty(observer, "executionDiagnosticEmitter", { value: emitter, enumerable: false });

  return { logger: proxied, observer };
}

function activeIntent(
  state: SynchronizationAuthorityMetadataV1_1,
  operation: PlannedOperation,
) {
  return state.operationIntents.find(intent => intent.operationId === operation.operationId);
}

function classifyAuthorityPersistenceTransition(
  previous: SynchronizationAuthorityMetadataV1_1 | undefined,
  candidate: SynchronizationAuthorityMetadataV1_1,
  operation: PlannedOperation | undefined,
): AuthorityPersistenceFailureStage | undefined {
  if (!previous || !operation) return undefined;
  const priorIntent = activeIntent(previous, operation);
  const candidateIntent = activeIntent(candidate, operation);
  if (!priorIntent && candidateIntent?.effects.length
    && candidateIntent.effects.every(effect => effect.stage === "intent-persisted")) {
    return "pending-journal-failed";
  }
  if (!priorIntent || !candidateIntent) return undefined;
  const priorEffects = new Map(priorIntent.effects.map(effect => [effect.effectId, effect.stage]));
  if (candidateIntent.effects.some(effect => effect.stage === "outcome-unknown"
    && priorEffects.has(effect.effectId)
    && priorEffects.get(effect.effectId) !== "outcome-unknown")) {
    return "uncertain-state-journal-failed";
  }
  return undefined;
}

export function executionDiagnosticEmitterFor(
  store: SynchronizationAuthorityStoreV1_1,
): ExecutionDiagnosticEmitter | undefined {
  return (store as ObservableSynchronizationAuthorityStore).executionDiagnosticEmitter;
}

export function withExecutionLifecycleObserver(
  store: SynchronizationAuthorityStoreV1_1,
  observer: ExecutionLifecycleObserver | undefined,
): ObservableSynchronizationAuthorityStore {
  if (!observer) return store;
  const diagnosticEmitter = (observer as ObservableLifecycleObserver).executionDiagnosticEmitter;
  let activeOperation: PlannedOperation | undefined;
  let previousTrustedAuthority: SynchronizationAuthorityMetadataV1_1 | undefined;
  let classifiedFailure: { readonly error: unknown; readonly stage: AuthorityPersistenceFailureStage } | undefined;

  const trackedObserver: ExecutionLifecycleObserver = (operation, stage, result, error, failed) => {
    if (stage === "operation-start") activeOperation = operation;
    observer(operation, stage, result, error, failed);
    if (stage === "operation-complete") activeOperation = undefined;
  };

  return {
    executionLifecycleObserver: trackedObserver,
    executionDiagnosticEmitter: diagnosticEmitter,
    loadAuthority: async () => {
      const loaded = await store.loadAuthority();
      if (loaded.status === "trusted") previousTrustedAuthority = loaded.state;
      return loaded;
    },
    saveAuthority: async (state, expectedPersistenceRevision, expectedSemanticGeneration) => {
      const stage = classifyAuthorityPersistenceTransition(previousTrustedAuthority, state, activeOperation);
      const finalizations = finalizationTransitions(previousTrustedAuthority, state, activeOperation);
      if (activeOperation && diagnosticEmitter) {
        for (const { intentId, effect } of finalizations) diagnosticEmitter(activeOperation, "sync.effect", "durable-finalization-start", {
          intentId,
          effectId: effect.effectId,
          fromStage: "effect-verified",
          toStage: "state-committed",
          classification: effect.descriptor.kind,
          target: effect.descriptor.targetSide,
          ...(effect.verificationEvidenceRef ? { verificationEvidenceRef: effect.verificationEvidenceRef } : {}),
          persistenceRevision: String(expectedPersistenceRevision),
          ...(expectedSemanticGeneration ? { semanticGeneration: String(expectedSemanticGeneration) } : {}),
        });
      }
      try {
        const saved = await store.saveAuthority(state, expectedPersistenceRevision, expectedSemanticGeneration);
        if (saved.status === "saved") {
          previousTrustedAuthority = {
            ...state,
            persistenceRevision: saved.persistenceRevision,
            semanticGeneration: saved.semanticGeneration,
          };
        }
        if (activeOperation && diagnosticEmitter) {
          for (const { intentId, effect } of finalizations) diagnosticEmitter(activeOperation, "sync.effect", saved.status === "saved" ? "durable-finalization-complete" : "durable-finalization-failed", {
            intentId,
            effectId: effect.effectId,
            fromStage: "effect-verified",
            toStage: "state-committed",
            classification: effect.descriptor.kind,
            target: effect.descriptor.targetSide,
            commitStatus: saved.status,
            ...(effect.verificationEvidenceRef ? { verificationEvidenceRef: effect.verificationEvidenceRef } : {}),
            ...(saved.status === "saved" ? {
              persistenceRevision: String(saved.persistenceRevision),
              semanticGeneration: String(saved.semanticGeneration),
            } : {}),
          });
        }
        return saved;
      } catch (error) {
        if (stage) classifiedFailure = { error, stage };
        if (activeOperation && diagnosticEmitter) {
          for (const { intentId, effect } of finalizations) diagnosticEmitter(activeOperation, "sync.effect", "durable-finalization-failed", {
            intentId,
            effectId: effect.effectId,
            fromStage: "effect-verified",
            toStage: "state-committed",
            classification: "durable-finalization-failure",
            target: effect.descriptor.targetSide,
          }, error);
        }
        throw error;
      }
    },
    commitBaseTransition: (transition, expectedPersistenceRevision, expectedSemanticGeneration) => store.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration),
    consumeAuthorityPersistenceFailureStage: error => {
      if (!classifiedFailure || !Object.is(classifiedFailure.error, error)) return undefined;
      const stage = classifiedFailure.stage;
      classifiedFailure = undefined;
      return stage;
    },
  };
}
