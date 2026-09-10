from pathlib import Path

ROOT = Path.cwd()


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


HELPER = '''import type {
  DiagnosticComponent,
  SafeDiagnosticFields,
} from "./diagnostic-logger";
import type { DiagnosticLogger } from "./diagnostic-logger";

export type StateRecoveryDiagnosticLevel = "error" | "warn" | "info" | "debug" | "trace";

/**
 * LOG-05 non-authoritative diagnostic emission seam. The frozen LOG-01 logger
 * remains the sole sanitizer/serializer. Diagnostic failures are intentionally
 * swallowed so observability can never alter state/CAS/recovery behavior.
 */
export function emitStateRecoveryDiagnostic(
  logger: DiagnosticLogger | undefined,
  level: StateRecoveryDiagnosticLevel,
  component: DiagnosticComponent,
  event: string,
  fields?: SafeDiagnosticFields,
): void {
  if (!logger) return;
  try {
    const runId = logger.currentSyncRunId();
    if (runId !== undefined) {
      if (level === "error") logger.syncError(component, event, runId, fields);
      else if (level === "warn") logger.syncWarn(component, event, runId, fields);
      else if (level === "info") logger.syncInfo(component, event, runId, fields);
      else if (level === "debug") logger.syncDebug(component, event, runId, fields);
      else logger.syncTrace(component, event, runId, fields);
      return;
    }
    if (level === "error") logger.error(component, event, fields);
    else if (level === "warn") logger.warn(component, event, fields);
    else if (level === "info") logger.info(component, event, fields);
    else if (level === "debug") logger.debug(component, event, fields);
    else logger.trace(component, event, fields);
  } catch {
    // Diagnostics are strictly non-authoritative.
  }
}
'''
write("src/diagnostics/authority-state-recovery-diagnostics.ts", HELPER)

# ---------------------------------------------------------------------------
# persistent-state-store.ts
# ---------------------------------------------------------------------------
p = "src/state/persistent-state-store.ts"
t = read(p)
t = once(t, 'import {\n  appendDurableRemoteChangeBatch,', 'import type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";\nimport { emitStateRecoveryDiagnostic } from "../diagnostics/authority-state-recovery-diagnostics";\nimport {\n  appendDurableRemoteChangeBatch,', "state imports")
t = once(
    t,
    '  constructor(private readonly storage: StateByteStorage, readonly currentSchemaVersion = 1, semanticValidator: DurableSemanticStateValidator = new DurableSemanticStateValidator()) { this.semanticValidator = semanticValidator; }',
    '  constructor(private readonly storage: StateByteStorage, readonly currentSchemaVersion = 1, semanticValidator: DurableSemanticStateValidator = new DurableSemanticStateValidator(), private readonly diagnostics?: DiagnosticLogger) { this.semanticValidator = semanticValidator; }',
    "state constructor",
)

old_load = '''  async load(context: StateLoadContext): Promise<StateLoadResult> {
    const bytes = await this.storage.read();'''
new_load = '''  async load(context: StateLoadContext): Promise<StateLoadResult> {
    const result = await this.loadCore(context);
    if (result.status === "trusted") {
      const state = result.state;
      emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.authority", "state-load-result", {
        stateStatus: "trusted",
        stateRevision: String(state.stateRevision),
        ...(isDurableSynchronizationAuthorityState(state) ? {
          persistenceRevision: String(state.persistenceRevision),
          semanticGeneration: String(state.semanticGeneration),
          operationCount: state.operationIntents.length,
          localCount: state.localTransactions.length,
          count: state.learnedRemoteBatches.length,
          cursorPresent: state.changeCursor !== undefined,
        } : {}),
      });
    } else {
      emitStateRecoveryDiagnostic(this.diagnostics, result.status === "recovery-required" ? "warn" : "debug", "state.authority", "state-load-result", {
        stateStatus: result.status,
        ...(result.status === "recovery-required" ? { reason: result.reason } : {}),
      });
    }
    return result;
  }

  private async loadCore(context: StateLoadContext): Promise<StateLoadResult> {
    const bytes = await this.storage.read();'''
t = once(t, old_load, new_load, "wrap state load")

old_save_trusted = '''  async saveTrusted(state: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult> {
    if (!validateLegacyStateShape(state)'''
new_save_trusted = '''  async saveTrusted(state: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.cas", "trusted-state-save-start", {
      stateRevision: String(state.stateRevision),
      ...(expectedRevision ? { expectedRevision: String(expectedRevision) } : {}),
      ...(isDurableSynchronizationAuthorityState(state) ? {
        persistenceRevision: String(state.persistenceRevision),
        semanticGeneration: String(state.semanticGeneration),
        operationCount: state.operationIntents.length,
        localCount: state.localTransactions.length,
      } : {}),
    });
    const result = await this.saveTrustedCore(state, expectedRevision);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "debug" : "warn", "state.cas", "trusted-state-save-result", {
      commitStatus: result.status,
      ...(result.status === "saved" ? { stateRevision: String(result.stateRevision) } : {}),
      ...(result.status === "stale-revision" && result.actualRevision ? { observedRevision: String(result.actualRevision) } : {}),
      ...(result.status === "recovery-required" ? { reason: result.reason } : {}),
    });
    return result;
  }

  private async saveTrustedCore(state: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult> {
    if (!validateLegacyStateShape(state)'''
t = once(t, old_save_trusted, new_save_trusted, "wrap saveTrusted")

old_load_auth = '''  async loadAuthority(): Promise<SynchronizationAuthorityLoadResultV1_1<DurableSynchronizationAuthorityState>> {
    const bytes = await this.storage.read(); if (!bytes) return { status: "uninitialized" };'''
new_load_auth = '''  async loadAuthority(): Promise<SynchronizationAuthorityLoadResultV1_1<DurableSynchronizationAuthorityState>> {
    const result = await this.loadAuthorityCore();
    if (result.status === "trusted") {
      emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.authority", "authority-load-result", {
        stateStatus: "trusted",
        stateRevision: String(result.state.stateRevision),
        persistenceRevision: String(result.state.persistenceRevision),
        semanticGeneration: String(result.state.semanticGeneration),
        operationCount: result.state.operationIntents.length,
        localCount: result.state.localTransactions.length,
        count: result.state.learnedRemoteBatches.length,
        cursorPresent: result.state.changeCursor !== undefined,
      });
    } else {
      emitStateRecoveryDiagnostic(this.diagnostics, result.status === "recovery-required" ? "warn" : "debug", "state.authority", "authority-load-result", {
        stateStatus: result.status,
        ...(result.status === "recovery-required" && result.issues[0] ? { reason: result.issues[0].code } : {}),
      });
    }
    return result;
  }

  private async loadAuthorityCore(): Promise<SynchronizationAuthorityLoadResultV1_1<DurableSynchronizationAuthorityState>> {
    const bytes = await this.storage.read(); if (!bytes) return { status: "uninitialized" };'''
t = once(t, old_load_auth, new_load_auth, "wrap loadAuthority")

old_save_auth = '''  async saveAuthority(state: DurableSynchronizationAuthorityState, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration?: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    if (!this.storage.compareAndSwap)'''
new_save_auth = '''  async saveAuthority(state: DurableSynchronizationAuthorityState, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration?: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.cas", "authority-save-start", {
      stateRevision: String(state.stateRevision),
      persistenceRevision: String(state.persistenceRevision),
      semanticGeneration: String(state.semanticGeneration),
      expectedRevision: String(expectedPersistenceRevision),
      ...(expectedSemanticGeneration ? { observedRevision: String(expectedSemanticGeneration) } : {}),
      operationCount: state.operationIntents.length,
      localCount: state.localTransactions.length,
      count: state.learnedRemoteBatches.length,
    });
    const result = await this.saveAuthorityCore(state, expectedPersistenceRevision, expectedSemanticGeneration);
    if (result.status === "saved") {
      const semanticChanged = String(result.semanticGeneration) !== String(state.semanticGeneration);
      emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.cas", "authority-save-result", {
        commitStatus: "saved",
        persistenceRevision: String(result.persistenceRevision),
        semanticGeneration: String(result.semanticGeneration),
        semanticChanged,
      });
      if (semanticChanged) {
        emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.authority", "semantic-generation-before", {
          persistenceRevision: String(state.persistenceRevision),
          semanticGeneration: String(state.semanticGeneration),
          semanticChanged: true,
        });
        emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.authority", "semantic-generation-after", {
          persistenceRevision: String(result.persistenceRevision),
          semanticGeneration: String(result.semanticGeneration),
          semanticChanged: true,
        });
      }
    } else if (result.status === "stale-persistence") {
      emitStateRecoveryDiagnostic(this.diagnostics, "warn", "state.cas", "authority-save-stale-persistence", {
        commitStatus: result.status,
        expectedRevision: String(expectedPersistenceRevision),
        ...(result.actualPersistenceRevision ? { persistenceRevision: String(result.actualPersistenceRevision) } : {}),
      });
    } else if (result.status === "stale-semantic-authority") {
      emitStateRecoveryDiagnostic(this.diagnostics, "warn", "state.cas", "authority-save-stale-semantic-authority", {
        commitStatus: result.status,
        ...(expectedSemanticGeneration ? { semanticGeneration: String(expectedSemanticGeneration) } : {}),
        ...(result.actualSemanticGeneration ? { observedRevision: String(result.actualSemanticGeneration) } : {}),
      });
    } else {
      emitStateRecoveryDiagnostic(this.diagnostics, "warn", "state.cas", "authority-save-recovery-required", {
        commitStatus: result.status,
        ...(result.issues[0] ? { reason: result.issues[0].code } : {}),
      });
    }
    return result;
  }

  private async saveAuthorityCore(state: DurableSynchronizationAuthorityState, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration?: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    if (!this.storage.compareAndSwap)'''
t = once(t, old_save_auth, new_save_auth, "wrap saveAuthority")

old_commit = '''  async commitBaseTransition(transition: AuthoritativeBaseTransition, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
new_commit = '''  async commitBaseTransition(transition: AuthoritativeBaseTransition, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.authority", "base-transition-start", {
      classification: transition.kind,
      expectedRevision: String(expectedPersistenceRevision),
      semanticGeneration: String(expectedSemanticGeneration),
    });
    const result = await this.commitBaseTransitionCore(transition, expectedPersistenceRevision, expectedSemanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "info" : "warn", "state.authority", "base-transition-result", {
      classification: transition.kind,
      result: result.status,
      ...(result.status === "saved" ? { persistenceRevision: String(result.persistenceRevision), semanticGeneration: String(result.semanticGeneration) } : {}),
    });
    return result;
  }

  private async commitBaseTransitionCore(transition: AuthoritativeBaseTransition, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
t = once(t, old_commit, new_commit, "wrap base transition")

old_batch = '''  async appendLearnedRemoteBatch(batch: DurableRemoteChangeBatch, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    return this.saveAuthority({ ...loaded.state, learnedRemoteBatches: appendDurableRemoteChangeBatch(loaded.state.learnedRemoteBatches, batch), changeCursor: batch.checkpoint.terminalStartToken }, expectedPersistenceRevision, expectedSemanticGeneration);
  }'''
new_batch = '''  async appendLearnedRemoteBatch(batch: DurableRemoteChangeBatch, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.remote-learning", "remote-batch-learn-start", {
      remoteBatchId: String(batch.checkpoint.batchId),
      changeCount: batch.changes.length,
      cursorPresent: true,
      expectedRevision: String(expectedPersistenceRevision),
      semanticGeneration: String(expectedSemanticGeneration),
    });
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const result = await this.saveAuthority({ ...loaded.state, learnedRemoteBatches: appendDurableRemoteChangeBatch(loaded.state.learnedRemoteBatches, batch), changeCursor: batch.checkpoint.terminalStartToken }, expectedPersistenceRevision, expectedSemanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "info" : "warn", "state.remote-learning", "remote-batch-learn-result", {
      remoteBatchId: String(batch.checkpoint.batchId), changeCount: batch.changes.length, cursorPresent: true, result: result.status,
      ...(result.status === "saved" ? { persistenceRevision: String(result.persistenceRevision), semanticGeneration: String(result.semanticGeneration), semanticChanged: String(result.semanticGeneration) !== String(expectedSemanticGeneration) } : {}),
    });
    return result;
  }'''
t = once(t, old_batch, new_batch, "remote batch")

old_reduction = '''  async recordRemoteBatchReduction(batchId: RemoteIngestionBatchId, durableFactRefs: readonly string[], complete: boolean, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (!loaded.state.learnedRemoteBatches.some(batch => batch.checkpoint.batchId === batchId)) return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "cannot reduce a remote batch that is not durably learned", undefined, "remote-ingestion")] };
    return this.saveAuthority({ ...loaded.state, learnedRemoteReductions: [...loaded.state.learnedRemoteReductions.filter(entry => entry.batchId !== batchId), { batchId, durableFactRefs: [...durableFactRefs], complete }] }, expectedPersistenceRevision, expectedSemanticGeneration);
  }'''
new_reduction = '''  async recordRemoteBatchReduction(batchId: RemoteIngestionBatchId, durableFactRefs: readonly string[], complete: boolean, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.remote-learning", "remote-batch-reduction-start", { remoteBatchId: String(batchId), count: durableFactRefs.length, decision: complete ? "complete" : "partial", expectedRevision: String(expectedPersistenceRevision), semanticGeneration: String(expectedSemanticGeneration) });
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (!loaded.state.learnedRemoteBatches.some(batch => batch.checkpoint.batchId === batchId)) return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "cannot reduce a remote batch that is not durably learned", undefined, "remote-ingestion")] };
    const result = await this.saveAuthority({ ...loaded.state, learnedRemoteReductions: [...loaded.state.learnedRemoteReductions.filter(entry => entry.batchId !== batchId), { batchId, durableFactRefs: [...durableFactRefs], complete }] }, expectedPersistenceRevision, expectedSemanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "debug" : "warn", "state.remote-learning", "remote-batch-reduction-result", { remoteBatchId: String(batchId), count: durableFactRefs.length, decision: complete ? "complete" : "partial", result: result.status });
    return result;
  }'''
t = once(t, old_reduction, new_reduction, "batch reduction")

old_retire = '''  async retireLearnedRemoteBatch(batchId: RemoteIngestionBatchId, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };'''
new_retire = '''  async retireLearnedRemoteBatch(batchId: RemoteIngestionBatchId, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.remote-learning", "remote-batch-retirement-start", { remoteBatchId: String(batchId), expectedRevision: String(expectedPersistenceRevision), semanticGeneration: String(expectedSemanticGeneration) });
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };'''
t = once(t, old_retire, new_retire, "batch retirement start")
t = once(t, '''    return this.saveAuthority({ ...loaded.state, learnedRemoteBatches: loaded.state.learnedRemoteBatches.filter(item => item.checkpoint.batchId !== batchId), learnedRemoteReductions: loaded.state.learnedRemoteReductions.filter(item => item.batchId !== batchId) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async persistOperationIntent''', '''    const result = await this.saveAuthority({ ...loaded.state, learnedRemoteBatches: loaded.state.learnedRemoteBatches.filter(item => item.checkpoint.batchId !== batchId), learnedRemoteReductions: loaded.state.learnedRemoteReductions.filter(item => item.batchId !== batchId) }, expectedPersistenceRevision, expectedSemanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "info" : "warn", "state.remote-learning", "remote-batch-retirement-result", { remoteBatchId: String(batchId), result: result.status, cursorPresent: loaded.state.changeCursor !== undefined });
    return result;
  }

  async persistOperationIntent''', "batch retirement result")

old_persist_intent = '''  async persistOperationIntent(intent: RecoverableOperationIntentV1_1, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
new_persist_intent = '''  async persistOperationIntent(intent: RecoverableOperationIntentV1_1, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.recovery", "operation-intent-persist-start", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectCount: intent.effects.length, semanticGeneration: String(intent.semanticAuthority.generation), expectedRevision: String(expectedPersistenceRevision) });
    const result = await this.persistOperationIntentCore(intent, expectedPersistenceRevision, expectedSemanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "info" : "warn", "state.recovery", "operation-intent-persist-result", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectCount: intent.effects.length, semanticGeneration: String(intent.semanticAuthority.generation), result: result.status, ...(result.status === "stale-semantic-authority" ? { reason: "persisted durable intent belongs to stale semantic generation" } : {}) });
    return result;
  }

  private async persistOperationIntentCore(intent: RecoverableOperationIntentV1_1, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
t = once(t, old_persist_intent, new_persist_intent, "wrap persist intent")

old_advance = '''  async advanceOperationEffect(operationId: RecoverableOperationIntentV1_1["operationId"], effectId: string, stage: RecoverableMutationEffectV1_1["stage"], verificationEvidenceRef: string | undefined, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
new_advance = '''  async advanceOperationEffect(operationId: RecoverableOperationIntentV1_1["operationId"], effectId: string, stage: RecoverableMutationEffectV1_1["stage"], verificationEvidenceRef: string | undefined, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const result = await this.advanceOperationEffectCore(operationId, effectId, stage, verificationEvidenceRef, expectedPersistenceRevision, expectedSemanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "debug" : "warn", "state.recovery", "operation-effect-stage-transition-result", { operationId: String(operationId), effectId, toStage: stage, semanticGeneration: String(expectedSemanticGeneration), result: result.status });
    return result;
  }

  private async advanceOperationEffectCore(operationId: RecoverableOperationIntentV1_1["operationId"], effectId: string, stage: RecoverableMutationEffectV1_1["stage"], verificationEvidenceRef: string | undefined, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
t = once(t, old_advance, new_advance, "wrap advance effect")
t = once(t, '''    const currentEffect = intent.effects.find(effect => effect.effectId === effectId); if (!currentEffect) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect ID is not durable", undefined, "journal-reference")] };
    const from = stages.indexOf(currentEffect.stage);''', '''    const currentEffect = intent.effects.find(effect => effect.effectId === effectId); if (!currentEffect) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect ID is not durable", undefined, "journal-reference")] };
    emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.recovery", "operation-effect-stage-transition-start", { operationId: String(operationId), intentId: String(intent.intentId), effectId, fromStage: currentEffect.stage, toStage: stage, semanticGeneration: String(intent.semanticAuthority.generation) });
    const from = stages.indexOf(currentEffect.stage);''', "effect from/to")

old_gc = '''  async garbageCollectCompletedOperation(operationId: RecoverableOperationIntentV1_1["operationId"], expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
new_gc = '''  async garbageCollectCompletedOperation(operationId: RecoverableOperationIntentV1_1["operationId"], expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const result = await this.garbageCollectCompletedOperationCore(operationId, expectedPersistenceRevision, expectedSemanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "info" : "warn", "state.recovery", "operation-intent-retirement-result", { operationId: String(operationId), semanticGeneration: String(expectedSemanticGeneration), result: result.status });
    return result;
  }

  private async garbageCollectCompletedOperationCore(operationId: RecoverableOperationIntentV1_1["operationId"], expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();'''
t = once(t, old_gc, new_gc, "wrap gc")
write(p, t)

# ---------------------------------------------------------------------------
# synchronization-adapters.ts
# ---------------------------------------------------------------------------
p = "src/product/synchronization-adapters.ts"
t = read(p)
t = once(t, 'import type { DataAdapter } from "obsidian";\n', 'import type { DataAdapter } from "obsidian";\nimport type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";\nimport { emitStateRecoveryDiagnostic } from "../diagnostics/authority-state-recovery-diagnostics";\n', "adapter imports")
t = once(t, '''  constructor(private readonly source: PersistentSynchronizationStateStore) {
    super(new MemoryStateByteStorage(), source.currentSchemaVersion);
  }''', '''  constructor(private readonly source: PersistentSynchronizationStateStore, private readonly diagnostics?: DiagnosticLogger) {
    super(new MemoryStateByteStorage(), source.currentSchemaVersion, undefined, diagnostics);
  }''', "adapter constructor")
old_adapter_save = '''  override async saveAuthority(
    state: DurableSynchronizationAuthorityState,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") {
      return loaded.status === "uninitialized"
        ? { status: "stale-persistence" }
        : { status: "recovery-required", issues: loaded.issues };
    }
    const semanticChanged = authorityProjection(loaded.state) !== authorityProjection(state);
    const targetGeneration = semanticChanged
      ? nextSemanticGeneration(loaded.state.semanticGeneration)
      : loaded.state.semanticGeneration;
    const withCompletedIntents = rebaseCompletedIntentSemanticAuthority(state, targetGeneration);
    const candidate = semanticChanged
      ? rebaseConvergenceGeneration(withCompletedIntents, targetGeneration)
      : withCompletedIntents;
    return this.source.saveAuthority(candidate, expectedPersistenceRevision, expectedSemanticGeneration);
  }'''
new_adapter_save = '''  override async saveAuthority(
    state: DurableSynchronizationAuthorityState,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") {
      return loaded.status === "uninitialized"
        ? { status: "stale-persistence" }
        : { status: "recovery-required", issues: loaded.issues };
    }
    const semanticChanged = authorityProjection(loaded.state) !== authorityProjection(state);
    const targetGeneration = semanticChanged
      ? nextSemanticGeneration(loaded.state.semanticGeneration)
      : loaded.state.semanticGeneration;
    emitStateRecoveryDiagnostic(this.diagnostics, "debug", "state.authority", "authority-adapter-save-start", {
      persistenceRevision: String(loaded.state.persistenceRevision), semanticGeneration: String(loaded.state.semanticGeneration), expectedRevision: String(expectedPersistenceRevision), semanticChanged,
    });
    if (semanticChanged) emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.authority", "adapter-semantic-generation-before", { persistenceRevision: String(loaded.state.persistenceRevision), semanticGeneration: String(loaded.state.semanticGeneration), semanticChanged: true });
    const withCompletedIntents = rebaseCompletedIntentSemanticAuthority(state, targetGeneration);
    const candidate = semanticChanged
      ? rebaseConvergenceGeneration(withCompletedIntents, targetGeneration)
      : withCompletedIntents;
    const result = await this.source.saveAuthority(candidate, expectedPersistenceRevision, expectedSemanticGeneration);
    if (semanticChanged && result.status === "saved") emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.authority", "adapter-semantic-generation-after", { persistenceRevision: String(result.persistenceRevision), semanticGeneration: String(result.semanticGeneration), semanticChanged: true });
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "debug" : "warn", "state.authority", "authority-adapter-save-result", { result: result.status, semanticChanged, ...(result.status === "saved" ? { persistenceRevision: String(result.persistenceRevision), semanticGeneration: String(result.semanticGeneration) } : {}) });
    return result;
  }'''
t = once(t, old_adapter_save, new_adapter_save, "adapter saveAuthority")
old_adapter_commit = '''  override async commitBaseTransition(
    transition: AuthoritativeBaseTransition,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const first = await this.source.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration);
    if (first.status !== "saved") return first;
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized"
      ? { status: "stale-persistence" }
      : { status: "recovery-required", issues: loaded.issues };
    const staleConvergence = loaded.state.pathConvergence.some(entry => entry.state.status === "converged" && entry.state.generation !== loaded.state.semanticGeneration);
    if (!staleConvergence) return first;
    const candidate = rebaseConvergenceGeneration(loaded.state, nextSemanticGeneration(loaded.state.semanticGeneration));
    return this.source.saveAuthority(candidate, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
  }'''
new_adapter_commit = '''  override async commitBaseTransition(
    transition: AuthoritativeBaseTransition,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.authority", "adapter-base-transition-start", { classification: transition.kind, expectedRevision: String(expectedPersistenceRevision), semanticGeneration: String(expectedSemanticGeneration) });
    const first = await this.source.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration);
    if (first.status !== "saved") return first;
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized"
      ? { status: "stale-persistence" }
      : { status: "recovery-required", issues: loaded.issues };
    const staleConvergence = loaded.state.pathConvergence.some(entry => entry.state.status === "converged" && entry.state.generation !== loaded.state.semanticGeneration);
    if (!staleConvergence) return first;
    const target = nextSemanticGeneration(loaded.state.semanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, "info", "state.authority", "convergence-generation-rebase-before", { persistenceRevision: String(loaded.state.persistenceRevision), semanticGeneration: String(loaded.state.semanticGeneration), semanticChanged: true });
    const candidate = rebaseConvergenceGeneration(loaded.state, target);
    const result = await this.source.saveAuthority(candidate, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
    emitStateRecoveryDiagnostic(this.diagnostics, result.status === "saved" ? "info" : "warn", "state.authority", "convergence-generation-rebase-after", { result: result.status, ...(result.status === "saved" ? { persistenceRevision: String(result.persistenceRevision), semanticGeneration: String(result.semanticGeneration), semanticChanged: true } : {}) });
    return result;
  }'''
t = once(t, old_adapter_commit, new_adapter_commit, "adapter base transition")
write(p, t)

# ---------------------------------------------------------------------------
# durable-intent-recovery-base.ts
# ---------------------------------------------------------------------------
p = "src/product/durable-intent-recovery-base.ts"
t = read(p)
t = once(t, 'import { StateCommitCoordinator } from "../core/commit-coordinator";\n', 'import { StateCommitCoordinator } from "../core/commit-coordinator";\nimport type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";\nimport { emitStateRecoveryDiagnostic } from "../diagnostics/authority-state-recovery-diagnostics";\n', "base recovery imports")
t = once(t, 'async function recoverOne(snapshot: RecoverableOperationIntentV1_1, legacy: ProductSynchronizationExecutor, authorityStore: SynchronizationAuthorityStoreV1_1, stateStore: SynchronizationStateStore, stateContext: StateLoadContext, remote: ManagedRemoteIdentity, deps: DurableIntentRecoveryDependencies): Promise<{ status: "recovered"; changed: boolean; retired: boolean } | { status: "recovery-required"; reason: string }> {', 'async function recoverOne(snapshot: RecoverableOperationIntentV1_1, legacy: ProductSynchronizationExecutor, authorityStore: SynchronizationAuthorityStoreV1_1, stateStore: SynchronizationStateStore, stateContext: StateLoadContext, remote: ManagedRemoteIdentity, deps: DurableIntentRecoveryDependencies, diagnostics?: DiagnosticLogger): Promise<{ status: "recovered"; changed: boolean; retired: boolean } | { status: "recovery-required"; reason: string }> {', "recoverOne signature")
t = once(t, '''  const intent = authority.state.operationIntents.find(value => value.operationId === snapshot.operationId);
  if (!intent) return { status: "recovered", changed: false, retired: false };
  const invalid = validateIntent(intent, authority.state);
  if (invalid) return { status: "recovery-required", reason: invalid };''', '''  const intent = authority.state.operationIntents.find(value => value.operationId === snapshot.operationId);
  if (!intent) return { status: "recovered", changed: false, retired: false };
  emitStateRecoveryDiagnostic(diagnostics, "info", "state.recovery", "recovery-intent-selected", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectCount: intent.effects.length, semanticGeneration: String(intent.semanticAuthority.generation), persistenceRevision: String(authority.state.persistenceRevision) });
  emitStateRecoveryDiagnostic(diagnostics, "debug", "state.recovery", "recovery-authority-generation", { operationId: String(intent.operationId), semanticGeneration: String(authority.state.semanticGeneration), persistenceRevision: String(authority.state.persistenceRevision) });
  const invalid = validateIntent(intent, authority.state);
  if (invalid) { emitStateRecoveryDiagnostic(diagnostics, "warn", "state.recovery", "recovery-intent-validation-failed", { operationId: String(intent.operationId), intentId: String(intent.intentId), semanticGeneration: String(intent.semanticAuthority.generation), reason: invalid }); return { status: "recovery-required", reason: invalid }; }
  emitStateRecoveryDiagnostic(diagnostics, "debug", "state.recovery", "recovery-intent-validation-succeeded", { operationId: String(intent.operationId), intentId: String(intent.intentId), semanticGeneration: String(intent.semanticAuthority.generation) });''', "recoverOne selection")
t = once(t, '''  if (intent.effects.every(effect => effect.stage === "intent-persisted")) {
    const retired = await lifecycle.retireUnattemptedIntent(String(intent.operationId));
    return retired.status === "persisted" ? { status: "recovered", changed: true, retired: true } : { status: "recovery-required", reason: `unattempted intent could not be retired (${retired.status})` };
  }''', '''  if (intent.effects.every(effect => effect.stage === "intent-persisted")) {
    const retired = await lifecycle.retireUnattemptedIntent(String(intent.operationId));
    emitStateRecoveryDiagnostic(diagnostics, retired.status === "persisted" ? "info" : "warn", "state.recovery", "recovery-unattempted-intent-retirement", { operationId: String(intent.operationId), intentId: String(intent.intentId), result: retired.status });
    return retired.status === "persisted" ? { status: "recovered", changed: true, retired: true } : { status: "recovery-required", reason: `unattempted intent could not be retired (${retired.status})` };
  }''', "unattempted retire")
t = once(t, '''    const physical = effect.descriptor.kind === "local-file"
      ? await recoverLocalFile(lifecycle, intent, effect, authority.state, legacy, deps)
      : await observePersistedEffect(legacy, effect.descriptor, remote, deps);
    const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, physical);''', '''    emitStateRecoveryDiagnostic(diagnostics, "debug", "state.recovery", "recovery-effect-selected", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectId: effect.effectId, fromStage: effect.stage, semanticGeneration: String(intent.semanticAuthority.generation) });
    const physical = effect.descriptor.kind === "local-file"
      ? await recoverLocalFile(lifecycle, intent, effect, authority.state, legacy, deps)
      : await observePersistedEffect(legacy, effect.descriptor, remote, deps);
    emitStateRecoveryDiagnostic(diagnostics, physical.status === "verified-effect" ? "info" : "warn", "state.recovery", "recovery-physical-observation", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectId: effect.effectId, fromStage: effect.stage, result: physical.status, ...(physical.status === "verified-effect" ? { verificationEvidenceRef: physical.verificationEvidenceRef } : { reason: physical.reason }) });
    const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, physical);
    emitStateRecoveryDiagnostic(diagnostics, recorded.status === "effect-verified" || recorded.status === "already-progressed" ? "info" : "warn", "state.recovery", "recovery-physical-result-recorded", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectId: effect.effectId, result: recorded.status, ...("reason" in recorded ? { reason: recorded.reason } : {}) });''', "physical recovery trace")
t = once(t, '''  const reconstructed = reconstructDurableRecovery(verified, canonical.state, entries);
  if (!reconstructed) return { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" };''', '''  const reconstructed = reconstructDurableRecovery(verified, canonical.state, entries);
  if (!reconstructed) { emitStateRecoveryDiagnostic(diagnostics, "warn", "state.recovery", "recovery-receipt-reconstruction", { operationId: String(verified.operationId), intentId: String(verified.intentId), reconstructed: false, reason: "persisted descriptors cannot reconstruct one verified recovery receipt" }); return { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" }; }
  emitStateRecoveryDiagnostic(diagnostics, "info", "state.recovery", "recovery-receipt-reconstruction", { operationId: String(verified.operationId), intentId: String(verified.intentId), effectCount: verified.effects.length, reconstructed: true, verificationEvidenceRef: reconstructed.receipt.verificationEvidenceRef });''', "receipt reconstruction")
t = once(t, '''  const failed = await finalizeIntent(lifecycle, latestIntent);
  return failed ? { status: "recovery-required", reason: failed } : { status: "recovered", changed: true, retired: false };''', '''  const failed = await finalizeIntent(lifecycle, latestIntent);
  emitStateRecoveryDiagnostic(diagnostics, failed ? "warn" : "info", "state.recovery", "recovery-intent-final-result", { operationId: String(latestIntent.operationId), intentId: String(latestIntent.intentId), result: failed ? "recovery-required" : "recovered", ...(failed ? { reason: failed } : {}) });
  return failed ? { status: "recovery-required", reason: failed } : { status: "recovered", changed: true, retired: false };''', "recoverOne final")
old_export = '''export async function recoverOutstandingDurableIntents(legacy: ProductSynchronizationExecutor, authorityStore: SynchronizationAuthorityStoreV1_1, stateStore: SynchronizationStateStore, stateContext: StateLoadContext, remote: ManagedRemoteIdentity, deps: DurableIntentRecoveryDependencies = {}): Promise<DurableIntentRecoveryResult> {
  const loaded = await new DurableEffectLifecycleCoordinator(authorityStore).loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  let changed = false;'''
new_export = '''export async function recoverOutstandingDurableIntents(legacy: ProductSynchronizationExecutor, authorityStore: SynchronizationAuthorityStoreV1_1, stateStore: SynchronizationStateStore, stateContext: StateLoadContext, remote: ManagedRemoteIdentity, deps: DurableIntentRecoveryDependencies = {}, diagnostics?: DiagnosticLogger): Promise<DurableIntentRecoveryResult> {
  const loaded = await new DurableEffectLifecycleCoordinator(authorityStore).loadAuthority();
  if (loaded.status !== "trusted") { emitStateRecoveryDiagnostic(diagnostics, "warn", "state.recovery", "recovery-entry", { stateStatus: loaded.status, ...(loaded.status === "recovery-required" ? { reason: loaded.reason } : {}) }); return loaded; }
  emitStateRecoveryDiagnostic(diagnostics, "info", "state.recovery", "recovery-entry", { stateStatus: "trusted", persistenceRevision: String(loaded.state.persistenceRevision), semanticGeneration: String(loaded.state.semanticGeneration), operationCount: loaded.state.operationIntents.length, localCount: loaded.state.localTransactions.length });
  let changed = false;'''
t = once(t, old_export, new_export, "base exported recovery")
t = once(t, '    const result = await recoverOne(snapshot, legacy, authorityStore, stateStore, stateContext, remote, deps);', '    const result = await recoverOne(snapshot, legacy, authorityStore, stateStore, stateContext, remote, deps, diagnostics);', "pass diagnostics recoverOne")
t = once(t, '''  return { status: "recovered", changed, recoveredCount, retiredCount };
}''', '''  const result = { status: "recovered" as const, changed, recoveredCount, retiredCount };
  emitStateRecoveryDiagnostic(diagnostics, "info", "state.recovery", "recovery-final-result", { result: result.status, operationCount: loaded.state.operationIntents.length, count: recoveredCount + retiredCount });
  return result;
}''', "base final result")
write(p, t)

# ---------------------------------------------------------------------------
# durable-intent-recovery.ts
# ---------------------------------------------------------------------------
p = "src/product/durable-intent-recovery.ts"
t = read(p)
t = once(t, 'import { sha256Text } from "../util/sha256";\n', 'import { sha256Text } from "../util/sha256";\nimport type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";\nimport { emitStateRecoveryDiagnostic } from "../diagnostics/authority-state-recovery-diagnostics";\n', "recovery imports")
t = once(t, '''async function preverifyOutstandingRemoteUpdates(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<string | undefined> {''', '''async function preverifyOutstandingRemoteUpdates(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
  diagnostics?: DiagnosticLogger,
): Promise<string | undefined> {''', "preverify signature")
t = once(t, '''  if (loaded.status !== "trusted") return loaded.reason;
  let remotePromise''', '''  if (loaded.status !== "trusted") return loaded.reason;
  emitStateRecoveryDiagnostic(diagnostics, "debug", "state.recovery", "remote-update-preverification-entry", { persistenceRevision: String(loaded.state.persistenceRevision), semanticGeneration: String(loaded.state.semanticGeneration), operationCount: loaded.state.operationIntents.length });
  let remotePromise''', "preverify entry")
t = once(t, '''  for (const intent of loaded.state.operationIntents) {
    const invalid = validateIntent(intent, loaded.state);
    if (invalid) return invalid;
    for (const effect of intent.effects) {''', '''  for (const intent of loaded.state.operationIntents) {
    const invalid = validateIntent(intent, loaded.state);
    if (invalid) { emitStateRecoveryDiagnostic(diagnostics, "warn", "state.recovery", "remote-update-preverification-validation-failed", { operationId: String(intent.operationId), intentId: String(intent.intentId), semanticGeneration: String(intent.semanticAuthority.generation), reason: invalid }); return invalid; }
    for (const effect of intent.effects) {''', "preverify validation")
t = once(t, '''      const convergence = verifyPreservedRemoteUpdateConvergence(effect.descriptor, entries);
      if (convergence.status === "predecessor-retirement-required") {''', '''      const convergence = verifyPreservedRemoteUpdateConvergence(effect.descriptor, entries);
      emitStateRecoveryDiagnostic(diagnostics, convergence.status === "converged" ? "info" : "debug", "state.recovery", "remote-update-preverification-classification", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectId: effect.effectId, fromStage: effect.stage, semanticGeneration: String(intent.semanticAuthority.generation), classification: convergence.status });
      if (convergence.status === "predecessor-retirement-required") {''', "preverify convergence")
t = once(t, '''      const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, observed);
      if (recorded.status !== "effect-verified"''', '''      const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, observed);
      emitStateRecoveryDiagnostic(diagnostics, recorded.status === "effect-verified" || recorded.status === "already-progressed" ? "info" : "warn", "state.recovery", "remote-update-preverification-record-result", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectId: effect.effectId, result: recorded.status, ...("reason" in recorded ? { reason: recorded.reason } : {}) });
      if (recorded.status !== "effect-verified"''', "preverify record")
# This exact loop appears a second time in preflight; only first occurrence above was changed. Add diagnostics param and a safe validation marker there.
t = once(t, '''async function preflightVerifiedEffects(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
): Promise<string | undefined> {''', '''async function preflightVerifiedEffects(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies,
  diagnostics?: DiagnosticLogger,
): Promise<string | undefined> {''', "preflight signature")
t = once(t, '''      const failure = await verifyCurrentPhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries);
      if (failure) return `${effect.effectId}: effect-verified physical reality is not currently converged (${failure})`;''', '''      const failure = await verifyCurrentPhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries);
      emitStateRecoveryDiagnostic(diagnostics, failure ? "warn" : "debug", "state.recovery", "effect-verified-preflight-observation", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectId: effect.effectId, fromStage: effect.stage, result: failure ? "outcome-unknown" : "verified-effect", ...(failure ? { reason: failure } : {}) });
      if (failure) return `${effect.effectId}: effect-verified physical reality is not currently converged (${failure})`;''', "preflight observation")
# Matching recovery: optional diagnostics + selection/receipt result.
t = once(t, '''  operationId: OperationId,
  dependencies: DurableIntentRecoveryDependencies = {},
): Promise<DurableIntentVerifiedRecoveryResult> {''', '''  operationId: OperationId,
  dependencies: DurableIntentRecoveryDependencies = {},
  diagnostics?: DiagnosticLogger,
): Promise<DurableIntentVerifiedRecoveryResult> {''', "matching signature")
t = once(t, '''  let intent = matches[0]!;
  const invalid = validateIntent(intent, loaded.state);
  if (invalid) return { status: "recovery-required", reason: invalid };''', '''  let intent = matches[0]!;
  emitStateRecoveryDiagnostic(diagnostics, "info", "state.recovery", "matching-recovery-intent-selected", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectCount: intent.effects.length, semanticGeneration: String(intent.semanticAuthority.generation), persistenceRevision: String(loaded.state.persistenceRevision) });
  const invalid = validateIntent(intent, loaded.state);
  if (invalid) { emitStateRecoveryDiagnostic(diagnostics, "warn", "state.recovery", "matching-recovery-intent-validation-failed", { operationId: String(intent.operationId), intentId: String(intent.intentId), reason: invalid }); return { status: "recovery-required", reason: invalid }; }''', "matching validation")
t = once(t, '''  const reconstructed = reconstructDurableRecovery(intent, canonical.state, entries);
  return reconstructed
    ? { status: "verified", receipt: reconstructed.receipt }
    : { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" };''', '''  const reconstructed = reconstructDurableRecovery(intent, canonical.state, entries);
  emitStateRecoveryDiagnostic(diagnostics, reconstructed ? "info" : "warn", "state.recovery", "matching-recovery-receipt-reconstruction", { operationId: String(intent.operationId), intentId: String(intent.intentId), effectCount: intent.effects.length, reconstructed: Boolean(reconstructed), ...(reconstructed ? { verificationEvidenceRef: reconstructed.receipt.verificationEvidenceRef } : { reason: "persisted descriptors cannot reconstruct one verified recovery receipt" }) });
  return reconstructed
    ? { status: "verified", receipt: reconstructed.receipt }
    : { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" };''', "matching receipt")
old_outer = '''export async function recoverOutstandingDurableIntents(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  stateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies = {},
): Promise<DurableIntentRecoveryResult> {
  const updateFailure = await preverifyOutstandingRemoteUpdates(legacy, authorityStore, remote, dependencies);
  if (updateFailure) return { status: "recovery-required", reason: updateFailure };
  const failure = await preflightVerifiedEffects(legacy, authorityStore, remote, dependencies);
  if (failure) return { status: "recovery-required", reason: failure };
  return recoverBaseOutstandingDurableIntents(legacy, authorityStore, stateStore, stateContext, remote, dependencies);
}'''
new_outer = '''export async function recoverOutstandingDurableIntents(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  stateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  remote: ManagedRemoteIdentity,
  dependencies: DurableIntentRecoveryDependencies = {},
  diagnostics?: DiagnosticLogger,
): Promise<DurableIntentRecoveryResult> {
  emitStateRecoveryDiagnostic(diagnostics, "info", "state.recovery", "outstanding-recovery-preverification-entry", { stateStatus: "starting" });
  const updateFailure = await preverifyOutstandingRemoteUpdates(legacy, authorityStore, remote, dependencies, diagnostics);
  if (updateFailure) { emitStateRecoveryDiagnostic(diagnostics, "warn", "state.recovery", "outstanding-recovery-final-result", { result: "recovery-required", reason: updateFailure }); return { status: "recovery-required", reason: updateFailure }; }
  const failure = await preflightVerifiedEffects(legacy, authorityStore, remote, dependencies, diagnostics);
  if (failure) { emitStateRecoveryDiagnostic(diagnostics, "warn", "state.recovery", "outstanding-recovery-final-result", { result: "recovery-required", reason: failure }); return { status: "recovery-required", reason: failure }; }
  const result = await recoverBaseOutstandingDurableIntents(legacy, authorityStore, stateStore, stateContext, remote, dependencies, diagnostics);
  emitStateRecoveryDiagnostic(diagnostics, result.status === "recovered" ? "info" : "warn", "state.recovery", "outstanding-recovery-final-result", { result: result.status, ...(result.status === "recovery-required" ? { reason: result.reason } : { count: result.recoveredCount + result.retiredCount }) });
  return result;
}'''
t = once(t, old_outer, new_outer, "outer recovery")
write(p, t)

# ---------------------------------------------------------------------------
# Focused state tests
# ---------------------------------------------------------------------------
p = "test/workstreams/state/state-authority-v1-1.test.ts"
t = read(p)
t = once(t, 'import test from "node:test";\n', 'import test from "node:test";\nimport { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../../../src/diagnostics/diagnostic-logger";\n', "state test logger import")
append_state = r'''

class Log05MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

async function log05Logger() {
  const persistence = new Log05MemoryDiagnostics();
  const logger = new DiagnosticLogger({ persistence, level: "trace", retentionLimit: 500, consoleMirror: false, platform: "desktop" });
  await logger.initialize();
  return logger;
}

test("LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition", async () => {
  const logger = await log05Logger();
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage, 1, undefined, logger);
  const initial = createInitialAuthorityState({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await store.saveTrusted(initial)).status, "saved");
  logger.clear();
  const loaded = await store.loadAuthority();
  assert.equal(loaded.status, "trusted");
  const loadEvent = logger.snapshot().find(event => event.event === "authority-load-result");
  assert.equal(loadEvent?.fields?.stateStatus, "trusted");
  assert.equal(loadEvent?.fields?.persistenceRevision, String(rev(1)));
  assert.equal(loadEvent?.fields?.semanticGeneration, String(gen(1)));
  assert.equal(loadEvent?.fields?.operationCount, 0);
  logger.clear();
  const saved = await store.persistOperationIntent(localFolder(), rev(1), gen(1));
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.equal(saved.semanticGeneration, gen(1));
  const result = logger.snapshot().find(event => event.event === "authority-save-result");
  assert.equal(result?.fields?.semanticChanged, false);
  assert.equal(logger.snapshot().some(event => event.event === "semantic-generation-after"), false);
});

test("LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events", async () => {
  const logger = await log05Logger();
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage, 1, undefined, logger);
  const initial = createInitialAuthorityState({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await store.saveTrusted(initial)).status, "saved");
  const current = await trusted(store);
  const changed = { ...current, changeCursor: id<"ChangeCursor">("cursor:sentinel") };
  logger.clear();
  const semantic = await store.saveAuthority(changed, current.persistenceRevision, current.semanticGeneration);
  assert.equal(semantic.status, "saved");
  if (semantic.status !== "saved") return;
  const events = logger.snapshot();
  const before = events.findIndex(event => event.event === "semantic-generation-before");
  const after = events.findIndex(event => event.event === "semantic-generation-after");
  assert.ok(before >= 0 && after > before);
  assert.equal(events[before]?.fields?.semanticGeneration, String(gen(1)));
  assert.equal(events[after]?.fields?.semanticGeneration, String(semantic.semanticGeneration));
  logger.clear();
  const stalePersistence = await store.saveAuthority(changed, rev(1), semantic.semanticGeneration);
  assert.equal(stalePersistence.status, "stale-persistence");
  assert.ok(logger.snapshot().some(event => event.event === "authority-save-stale-persistence"));
  const latest = await trusted(store);
  logger.clear();
  const staleSemantic = await store.saveAuthority(latest, latest.persistenceRevision, gen(1));
  assert.equal(staleSemantic.status, "stale-semantic-authority");
  assert.ok(logger.snapshot().some(event => event.event === "authority-save-stale-semantic-authority"));
});

test("LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content", async () => {
  const logger = await log05Logger();
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage, 1, undefined, logger);
  const initial = createInitialAuthorityState({ persistenceRevision: rev(1), semanticGeneration: gen(1), vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await store.saveTrusted(initial)).status, "saved");
  logger.clear();
  const rawPath = "PRIVATE/LOG05-SENTINEL-CONTENT.md";
  const batch = {
    checkpoint: {
      batchId: id<"RemoteIngestionBatchId">("batch:log05"),
      startingToken: id<"ChangeCursor">("cursor:0"),
      terminalStartToken: id<"ChangeCursor">("cursor:1"),
      persistenceRevision: rev(1),
      status: "learned" as const,
    },
    changes: [{ kind: "removed" as const, remoteObjectId: remoteId("remote:log05"), lastKnownPath: path(rawPath) }],
  };
  const result = await store.appendLearnedRemoteBatch(batch, rev(1), gen(1));
  assert.equal(result.status, "saved");
  const event = logger.snapshot().find(value => value.event === "remote-batch-learn-result");
  assert.equal(event?.fields?.remoteBatchId, "batch:log05");
  assert.equal(event?.fields?.changeCount, 1);
  assert.equal(event?.fields?.cursorPresent, true);
  assert.equal(logger.renderText().includes(rawPath), false);
  assert.equal(logger.renderText().includes("LOG05-SENTINEL-CONTENT"), false);
});
'''
t += append_state
write(p, t)

# ---------------------------------------------------------------------------
# Focused recovery tests reuse this file's existing realistic fixtures.
# ---------------------------------------------------------------------------
p = "test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts"
t = read(p)
t = once(t, 'import test from "node:test";\n', 'import test from "node:test";\nimport { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../../../src/diagnostics/diagnostic-logger";\n', "recovery test logger import")
append_recovery = r'''

class Log05RecoveryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

async function log05RecoveryLogger() {
  const persistence = new Log05RecoveryDiagnostics();
  const logger = new DiagnosticLogger({ persistence, level: "trace", retentionLimit: 500, consoleMirror: false, platform: "desktop" });
  await logger.initialize();
  return logger;
}

test("LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output", async () => {
  const canonical = new CanonicalStore();
  const authority = new AuthorityStore([createIntent()]);
  const f = fixture(canonical, () => [entry()]);
  const logger = await log05RecoveryLogger();
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, context, managedRemote, {}, logger);
  assert.equal(result.status, "recovered");
  assert.equal(f.raw(), 0);
  const events = logger.snapshot();
  assert.ok(events.some(event => event.event === "recovery-intent-selected" && event.fields?.semanticGeneration === String(gen)));
  assert.ok(events.some(event => event.event === "recovery-physical-observation" && event.fields?.result === "verified-effect"));
  assert.ok(events.some(event => event.event === "recovery-receipt-reconstruction" && event.fields?.reconstructed === true));
  assert.ok(events.some(event => event.event === "outstanding-recovery-final-result" && event.fields?.result === "recovered"));
  assert.equal(logger.renderText().includes(String(target)), false);
});

test("LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable", async () => {
  const canonical = new CanonicalStore();
  const authority = new AuthorityStore([createIntent("dispatch-authorized", v1, reserved, staleGen)]);
  const f = fixture(canonical, () => [entry()]);
  const logger = await log05RecoveryLogger();
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, context, managedRemote, {}, logger);
  assert.equal(result.status, "recovery-required");
  if (result.status !== "recovery-required") return;
  assert.equal(result.reason, "persisted durable intent belongs to stale semantic generation");
  const failed = logger.snapshot().find(event => event.event === "remote-update-preverification-validation-failed" || event.event === "recovery-intent-validation-failed");
  assert.equal(failed?.fields?.reason, "persisted durable intent belongs to stale semantic generation");
  assert.ok(logger.snapshot().some(event => event.event === "remote-update-preverification-entry" && event.fields?.semanticGeneration === String(gen)));
});
'''
t += append_recovery
write(p, t)

print("LOG-05 transform applied")
