import {
  restartRecoveryDirective,
  type LocalMutationTransaction,
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
  | { readonly status: "persisted" | "dispatch-authorized" | "effect-verified" | "state-committed"; readonly authority: SynchronizationAuthorityMetadataV1_1 }
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

function replaceLocalTransaction(
  authority: SynchronizationAuthorityMetadataV1_1,
  transaction: LocalMutationTransaction,
): SynchronizationAuthorityMetadataV1_1 {
  const retained = authority.localTransactions.filter(existing => existing.transactionId !== transaction.transactionId);
  return { ...authority, localTransactions: [...retained, transaction] };
}

function findEffect(authority: SynchronizationAuthorityMetadataV1_1, operationId: string, effectId: string): RecoverableMutationEffectV1_1 | undefined {
  return authority.operationIntents.find(intent => String(intent.operationId) === operationId)?.effects.find(effect => effect.effectId === effectId);
}

/**
 * D-owned durable physical-effect state machine. Persistence is deliberately
 * separated from dispatch so production can durably authorize an exact effect,
 * checkpoint LOCAL transaction progress, and reconcile restart states without
 * ever interpreting dispatch-authorized/outcome-unknown as blind retry authority.
 */
export class DurableEffectLifecycleCoordinator {
  constructor(
    private readonly authorityStore: SynchronizationAuthorityStoreV1_1,
    private readonly dispatcher?: PhysicalEffectDispatcher,
  ) {}

  async loadAuthority(): Promise<{ readonly status: "trusted"; readonly state: SynchronizationAuthorityMetadataV1_1 } | { readonly status: "recovery-required"; readonly reason: string }> {
    const loaded = await this.authorityStore.loadAuthority();
    return loaded.status === "trusted"
      ? { status: "trusted", state: loaded.state }
      : { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
  }

  async persistIntent(intent: RecoverableOperationIntentV1_1, localTransactions: readonly LocalMutationTransaction[] = []): Promise<DurableEffectLifecycleResult> {
    if (intent.effects.some(effect => effect.stage !== "intent-persisted")) {
      return { status: "recovery-required", reason: "new operation intent must begin with every physical effect at intent-persisted" };
    }
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    if (loaded.state.operationIntents.some(existing => String(existing.operationId) === String(intent.operationId))) {
      return { status: "recovery-required", reason: "operation intent already exists; restart/recovery must consume durable evidence instead of replacing it" };
    }
    const existingTransactions = new Set(loaded.state.localTransactions.map(transaction => String(transaction.transactionId)));
    if (localTransactions.some(transaction => existingTransactions.has(String(transaction.transactionId)))) {
      return { status: "recovery-required", reason: "local mutation transaction identity is already present; restart/recovery must consume it" };
    }
    return this.save({
      ...loaded.state,
      operationIntents: [...loaded.state.operationIntents, intent],
      localTransactions: [...loaded.state.localTransactions, ...localTransactions],
    }, loaded.state);
  }

  /** Persist dispatch-authorized before returning the descriptor to the caller. */
  async authorizePersistedEffect(operationId: string, effectId: string): Promise<DurableEffectLifecycleResult> {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const effect = findEffect(loaded.state, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "persisted physical effect not found" };
    if (effect.stage !== "intent-persisted") {
      return { status: "already-progressed", stage: effect.stage, recoveryAction: restartRecoveryDirective(effect).action };
    }
    const dispatchAuthorized = replaceIntentEffect(loaded.state, operationId, effectId, current => ({ ...current, stage: "dispatch-authorized" }));
    const saved = await this.save(dispatchAuthorized, loaded.state);
    return saved.status === "persisted" ? { status: "dispatch-authorized", authority: saved.authority } : saved;
  }

  /** Persist the exact LOCAL transaction returned by the frozen transactional seam. */
  async persistLocalTransaction(transaction: LocalMutationTransaction): Promise<DurableEffectLifecycleResult> {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    if (!loaded.state.localTransactions.some(existing => existing.transactionId === transaction.transactionId)) {
      return { status: "recovery-required", reason: "LOCAL transaction progress cannot be persisted because its durable transaction intent is missing" };
    }
    return this.save(replaceLocalTransaction(loaded.state, transaction), loaded.state);
  }

  /**
   * Record a physical result after dispatch OR conservative restart reconciliation.
   * Only an exact verified-effect may advance to effect-verified. All ambiguous or
   * conflicting post-dispatch states remain outcome-unknown and restart-recoverable.
   */
  async recordPhysicalResult(operationId: string, effectId: string, physical: PhysicalEffectDispatchResult): Promise<DurableEffectLifecycleResult> {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const effect = findEffect(loaded.state, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "persisted physical effect not found while recording outcome" };
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") {
      if (effect.stage === "effect-verified" || effect.stage === "state-committed") {
        return { status: "already-progressed", stage: effect.stage, recoveryAction: restartRecoveryDirective(effect).action };
      }
      return { status: "recovery-required", reason: `physical result cannot be recorded from ${effect.stage}` };
    }

    if (physical.status === "verified-effect") {
      const verified = replaceIntentEffect(loaded.state, operationId, effectId, current => ({
        ...current,
        stage: "effect-verified",
        verificationEvidenceRef: physical.verificationEvidenceRef,
      }));
      const saved = await this.save(verified, loaded.state);
      return saved.status === "persisted" ? { status: "effect-verified", authority: saved.authority } : saved;
    }

    const uncertain = replaceIntentEffect(loaded.state, operationId, effectId, current => ({ ...current, stage: "outcome-unknown" }));
    const saved = await this.save(uncertain, loaded.state);
    if (saved.status !== "persisted") return saved;
    return { status: physical.status, reason: physical.reason, authority: saved.authority };
  }

  /** Compatibility helper retained for isolated lifecycle tests; production may use the split methods above. */
  async dispatchPersistedEffect(operationId: string, effectId: string): Promise<DurableEffectLifecycleResult> {
    if (!this.dispatcher) return { status: "recovery-required", reason: "no physical dispatcher is configured" };
    const authorized = await this.authorizePersistedEffect(operationId, effectId);
    if (authorized.status !== "dispatch-authorized") return authorized;
    const effect = findEffect(authorized.authority, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "dispatch-authorized effect disappeared after durable save" };
    const physical = await this.dispatcher.dispatch(effect.descriptor);
    return this.recordPhysicalResult(operationId, effectId, physical);
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
