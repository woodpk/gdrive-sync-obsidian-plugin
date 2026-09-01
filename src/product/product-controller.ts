import {
  appendDurableRemoteChangeBatch,
  contractId,
  type LocalTransactionalMutationPort,
  type RemoteFolderCreateRecoveryReadPort,
  type ReliableRemoteMutationPort,
  type StateRevision,
  type SynchronizationAuthorityStoreV1_1,
} from "../contracts";
import {
  IntegratedProductController as BaseIntegratedProductController,
  type ProductControllerOptions as BaseProductControllerOptions,
} from "./product-controller-base";
import { authoritativeDiagnostics, withExecutionLifecycleObserver } from "./authority-execution-diagnostics";
import type { RecoverableProductionMutationDependencies } from "./authoritative-production-executor";
import { recoverOutstandingDurableIntents, type DurableIntentRecoveryDependencies } from "./durable-intent-recovery";
import { SnapshotAssemblyError, type AssembledPlanningInput, type ProductSnapshotAssembler } from "./snapshot-assembler";
import { TrustedStateSynchronizationAuthorityStore } from "./trusted-state-authority-store";

export type { AutomaticExecutionDecision, PlannerFactory } from "./product-controller-base";

export interface ProductControllerOptions extends BaseProductControllerOptions {
  /** Frozen synchronization mutation seams. Omission is fail-closed for physical mutation. */
  readonly reliableRemoteMutationPort?: ReliableRemoteMutationPort;
  readonly localTransactionalMutationPort?: LocalTransactionalMutationPort;
  readonly remoteFolderCreateRecoveryReadPort?: RemoteFolderCreateRecoveryReadPort;
}

function nextRevision(current: StateRevision): StateRevision {
  const raw = String(current);
  const match = /^(.*?)(\d+)$/.exec(raw);
  return contractId<"StateRevision">(match ? `${match[1]}${Number(match[2]) + 1}` : `${raw}:1`) as StateRevision;
}

async function persistLearnedRemoteBatch(
  assembly: AssembledPlanningInput,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  options: ProductControllerOptions,
): Promise<void> {
  const batch = assembly.remoteChangeBatch;
  if (!batch) return;
  const loaded = await authorityStore.loadAuthority();
  if (loaded.status !== "trusted") throw new SnapshotAssemblyError("recovery-required", "terminal REMOTE Changes batch cannot be learned without trusted writable synchronization authority");
  const existing = loaded.state.learnedRemoteBatches.find(value => value.checkpoint.batchId === batch.checkpoint.batchId);
  if (!existing) {
    const candidate = {
      ...loaded.state,
      learnedRemoteBatches: appendDurableRemoteChangeBatch(loaded.state.learnedRemoteBatches, {
        ...batch,
        checkpoint: { ...batch.checkpoint, persistenceRevision: loaded.state.persistenceRevision },
      }),
    };
    const saved = await authorityStore.saveAuthority(candidate, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
    if (saved.status !== "saved") throw new SnapshotAssemblyError("recovery-required", `terminal REMOTE Changes batch was fully read but could not be durably learned (${saved.status})`);
  }
  // The learned batch is primary feed authority. The canonical cursor is only a
  // mirror and can move after, never before, the durable batch save.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await options.stateStore.load(options.stateContext);
    if (state.status !== "trusted") throw new SnapshotAssemblyError("recovery-required", "durable REMOTE batch exists but trusted canonical cursor state is unavailable");
    if (state.state.changeCursor === batch.checkpoint.terminalStartToken) return;
    const candidate = { ...state.state, stateRevision: nextRevision(state.state.stateRevision), changeCursor: batch.checkpoint.terminalStartToken };
    const saved = await options.stateStore.saveTrusted(candidate, state.state.stateRevision);
    if (saved.status === "saved") return;
    if (saved.status !== "stale-revision") throw new SnapshotAssemblyError("recovery-required", `durable REMOTE batch exists but cursor mirror could not advance: ${saved.reason}`);
  }
  throw new SnapshotAssemblyError("recovery-required", "durable REMOTE batch exists but cursor mirror repeatedly raced with trusted-state persistence");
}

function authorityLearningAssembler(
  assembler: ProductSnapshotAssembler,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  options: ProductControllerOptions,
  recoveryDependencies: DurableIntentRecoveryDependencies,
): ProductSnapshotAssembler {
  // D tests use structural assembler doubles. Bind whatever methods exist. Every
  // production assembly entry is wrapped so durable intent recovery is complete
  // before the base controller can invoke the current planner.
  const structural = assembler as ProductSnapshotAssembler & {
    bindAuthorityStore?: (store: SynchronizationAuthorityStoreV1_1) => void;
  };
  structural.bindAuthorityStore?.(authorityStore);

  const methods = new Map<PropertyKey, (...args: never[]) => Promise<AssembledPlanningInput>>();
  for (const property of ["assemble", "assembleFull", "assembleRecovery"] as const) {
    const method = Reflect.get(assembler as object, property);
    if (typeof method === "function") methods.set(property, method.bind(assembler));
  }
  if (!methods.size) return assembler;

  return new Proxy(assembler, {
    get(target, property, receiver) {
      const original = methods.get(property);
      if (!original) return Reflect.get(target, property, receiver);
      return async (...args: never[]) => {
        let assembly = await original(...args);
        await persistLearnedRemoteBatch(assembly, authorityStore, options);

        const recovery = await recoverOutstandingDurableIntents(
          options.executor,
          authorityStore,
          options.stateStore,
          options.stateContext,
          assembly.managedRemote,
          recoveryDependencies,
        );
        if (recovery.status === "recovery-required") throw new SnapshotAssemblyError("recovery-required", recovery.reason);

        // Recovery may commit canonical BASE, finalize effects, or retire an
        // unattempted intent. Refresh the exact same assembly mode once so the
        // current planner consumes post-recovery reality rather than stale input.
        if (recovery.changed) {
          assembly = await original(...args);
          await persistLearnedRemoteBatch(assembly, authorityStore, options);
          const residual = await recoverOutstandingDurableIntents(
            options.executor,
            authorityStore,
            options.stateStore,
            options.stateContext,
            assembly.managedRemote,
            recoveryDependencies,
          );
          if (residual.status === "recovery-required") throw new SnapshotAssemblyError("recovery-required", residual.reason);
          if (residual.changed) throw new SnapshotAssemblyError("recovery-required", "durable recovery did not reach a stable pre-planning authority state in one bounded refresh");
        }
        return assembly;
      };
    },
  });
}

/**
 * Production controller entrypoint. A caller-supplied writable frozen authority
 * store is required for physical mutation and durable REMOTE feed progress. The
 * default trusted-state bridge is read-only, so persistence-dependent work fails
 * closed rather than silently using raw legacy mutation or fake authority saves.
 */
export class IntegratedProductController extends BaseIntegratedProductController {
  constructor(options: ProductControllerOptions) {
    const diagnostics = authoritativeDiagnostics(options.diagnostics);
    const rawAuthorityStore = options.authorityStore ?? new TrustedStateSynchronizationAuthorityStore(options.stateStore, options.stateContext);
    const authorityStore = withExecutionLifecycleObserver(rawAuthorityStore, diagnostics.observer);
    const dependencies: RecoverableProductionMutationDependencies = {
      reliableRemoteMutationPort: options.reliableRemoteMutationPort,
      localTransactionalMutationPort: options.localTransactionalMutationPort,
      remoteFolderCreateRecoveryReadPort: options.remoteFolderCreateRecoveryReadPort,
    };
    const recoveryDependencies: DurableIntentRecoveryDependencies = {
      localTransactionalMutationPort: options.localTransactionalMutationPort,
      remoteFolderCreateRecoveryReadPort: options.remoteFolderCreateRecoveryReadPort,
    };
    (options.executor as unknown as { recoverableProductionMutationDependencies?: RecoverableProductionMutationDependencies }).recoverableProductionMutationDependencies = dependencies;
    super({
      ...options,
      snapshotAssembler: authorityLearningAssembler(options.snapshotAssembler, authorityStore, options, recoveryDependencies),
      ...(diagnostics.logger ? { diagnostics: diagnostics.logger } : {}),
      authorityStore,
    });
  }
}
