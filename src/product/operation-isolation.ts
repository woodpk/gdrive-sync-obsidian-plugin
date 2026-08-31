import {
  restartRecoveryDirective,
  type PlannedOperation,
  type RecoverableMutationEffectV1_1,
  type RecoverableOperationIntentV1_1,
  type RecoverablePhysicalMutationDescriptorV1_1,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthorityStoreV1_1,
  type VaultPath,
} from "../contracts";

function value(path: VaultPath | undefined): string | undefined { return path === undefined ? undefined : String(path).replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""); }
function ancestor(parent: string, child: string): boolean { return child === parent || child.startsWith(`${parent}/`); }
function paths(operation: PlannedOperation): string[] {
  return [operation.path, operation.fromPath, operation.toPath, ...operation.preconditions.flatMap(precondition => "path" in precondition ? [precondition.path] : [])]
    .map(value).filter((path): path is string => path !== undefined);
}

/** Conservative dependency proof: a skipped ancestor/move/collision keeps dependants isolated too. */
export function dependsOnSkippedOperation(candidate: PlannedOperation, skipped: readonly PlannedOperation[]): boolean {
  const candidates = paths(candidate);
  for (const blocked of skipped) {
    const blockedPaths = paths(blocked);
    for (const blockedPath of blockedPaths) for (const candidatePath of candidates) {
      if (ancestor(blockedPath, candidatePath)) return true;
      if ((candidate.destructive || candidate.kind === "identity-preserving-move" || blocked.kind === "identity-preserving-move") && ancestor(candidatePath, blockedPath)) return true;
    }
  }
  return false;
}

export type PhysicalEffectDispatchResult =
  | { readonly status: "verified-effect"; readonly verificationEvidenceRef: string }
  | { readonly status: "verified-not-applied"; readonly reason: string }
  | { readonly status: "conflict-preserved"; readonly reason: string }
  | { readonly status: "outcome-unknown"; readonly reason: string };

export interface PhysicalEffectDispatcher {
  dispatch(descriptor: RecoverablePhysicalMutationDescriptorV1_1): Promise<PhysicalEffectDispatchResult>;
}

export type DurableEffectLifecycleResult =
  | { readonly status: "persisted" | "effect-verified" | "state-committed"; readonly authority: SynchronizationAuthorityMetadataV1_1 }
  | { readonly status: "verified-not-applied" | "conflict-preserved" | "outcome-unknown" | "recovery-required"; readonly reason: string; readonly authority?: SynchronizationAuthorityMetadataV1_1 }
  | { readonly status: "already-progressed"; readonly stage: RecoverableMutationEffectV1_1["stage"]; readonly recoveryAction: ReturnType<typeof restartRecoveryDirective>["action"] }
  | { readonly status: "stale-authority"; readonly reason: string };

function replaceEffect(
  intent: RecoverableOperationIntentV1_1,
  effectId: string,
  update: (effect: RecoverableMutationEffectV1_1) => RecoverableMutationEffectV1_1,
): RecoverableOperationIntentV1_1 {
  const effects = intent.effects.map(effect => effect.effectId === effectId ? update(effect) : effect);
  return { ...intent, effects } as unknown as RecoverableOperationIntentV1_1;
}

function replaceIntentEffect(
  authority: SynchronizationAuthorityMetadataV1_1,
  operationId: string,
  effectId: string,
  update: (effect: RecoverableMutationEffectV1_1) => RecoverableMutationEffectV1_1,
): SynchronizationAuthorityMetadataV1_1 {
  return {
    ...authority,
    operationIntents: authority.operationIntents.map(intent => String(intent.operationId) === operationId ? replaceEffect(intent, effectId, update) : intent),
  };
}

function findEffect(authority: SynchronizationAuthorityMetadataV1_1, operationId: string, effectId: string): RecoverableMutationEffectV1_1 | undefined {
  return authority.operationIntents.find(intent => String(intent.operationId) === operationId)?.effects.find(effect => effect.effectId === effectId);
}

/**
 * D-owned durable dispatch authority. Every effect is persisted at intent-persisted,
 * then persisted again at dispatch-authorized before the physical dispatcher can run.
 * Any post-dispatch ambiguity remains restart-reconcilable and is never rewritten as
 * definitely unattempted. State-committed is a separate, explicit final step.
 */
export class DurableEffectLifecycleCoordinator {
  constructor(
    private readonly authorityStore: SynchronizationAuthorityStoreV1_1,
    private readonly dispatcher: PhysicalEffectDispatcher,
  ) {}

  async persistIntent(intent: RecoverableOperationIntentV1_1): Promise<DurableEffectLifecycleResult> {
    if (intent.effects.some(effect => effect.stage !== "intent-persisted")) {
      return { status: "recovery-required", reason: "new operation intent must begin with every physical effect at intent-persisted" };
    }
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    if (loaded.state.operationIntents.some(existing => String(existing.operationId) === String(intent.operationId))) {
      return { status: "recovery-required", reason: "operation intent already exists; restart/recovery must consume durable evidence instead of replacing it" };
    }
    return this.save({ ...loaded.state, operationIntents: [...loaded.state.operationIntents, intent] }, loaded.state);
  }

  async dispatchPersistedEffect(operationId: string, effectId: string): Promise<DurableEffectLifecycleResult> {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const effect = findEffect(loaded.state, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "persisted physical effect not found" };
    if (effect.stage !== "intent-persisted") {
      return { status: "already-progressed", stage: effect.stage, recoveryAction: restartRecoveryDirective(effect).action };
    }

    const dispatchAuthorized = replaceIntentEffect(loaded.state, operationId, effectId, current => ({ ...current, stage: "dispatch-authorized" }));
    const persistedDispatch = await this.save(dispatchAuthorized, loaded.state);
    if (persistedDispatch.status !== "persisted") return persistedDispatch;

    const authorizedEffect = findEffect(persistedDispatch.authority, operationId, effectId);
    if (!authorizedEffect) return { status: "recovery-required", reason: "dispatch-authorized effect disappeared after durable save" };

    const physical = await this.dispatcher.dispatch(authorizedEffect.descriptor);
    if (physical.status === "verified-effect") {
      const verified = replaceIntentEffect(persistedDispatch.authority, operationId, effectId, current => ({
        ...current,
        stage: "effect-verified",
        verificationEvidenceRef: physical.verificationEvidenceRef,
      }));
      const saved = await this.save(verified, persistedDispatch.authority);
      return saved.status === "persisted" ? { status: "effect-verified", authority: saved.authority } : saved;
    }

    // A dispatch occurred. Even a transport-level claim of non-application or a
    // preserved conflict must not be rewritten to intent-persisted. Persist the
    // uncertainty boundary so restart performs physical reconciliation first.
    const uncertain = replaceIntentEffect(persistedDispatch.authority, operationId, effectId, current => ({ ...current, stage: "outcome-unknown" }));
    const saved = await this.save(uncertain, persistedDispatch.authority);
    if (saved.status !== "persisted") return saved;
    return { status: physical.status, reason: physical.reason, authority: saved.authority };
  }

  async markEffectStateCommitted(operationId: string, effectId: string, verificationEvidenceRef: string): Promise<DurableEffectLifecycleResult> {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const effect = findEffect(loaded.state, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "verified physical effect not found" };
    if (effect.stage === "state-committed") return { status: "state-committed", authority: loaded.state };
    if (effect.stage !== "effect-verified" || effect.verificationEvidenceRef !== verificationEvidenceRef) {
      return { status: "recovery-required", reason: "state commit requires the exact durable physical verification reference" };
    }
    const committed = replaceIntentEffect(loaded.state, operationId, effectId, current => ({ ...current, stage: "state-committed" }));
    const saved = await this.save(committed, loaded.state);
    return saved.status === "persisted" ? { status: "state-committed", authority: saved.authority } : saved;
  }

  private async save(
    candidate: SynchronizationAuthorityMetadataV1_1,
    expected: SynchronizationAuthorityMetadataV1_1,
  ): Promise<DurableEffectLifecycleResult> {
    const result = await this.authorityStore.saveAuthority(candidate, expected.persistenceRevision, expected.semanticGeneration);
    if (result.status === "saved") {
      return { status: "persisted", authority: { ...candidate, persistenceRevision: result.persistenceRevision, semanticGeneration: result.semanticGeneration } };
    }
    if (result.status === "stale-persistence") return { status: "stale-authority", reason: "persistence revision changed while advancing physical effect lifecycle" };
    if (result.status === "stale-semantic-authority") return { status: "stale-authority", reason: "semantic generation changed while advancing physical effect lifecycle" };
    return { status: "recovery-required", reason: "authoritative metadata failed semantic validation during physical effect lifecycle" };
  }
}
