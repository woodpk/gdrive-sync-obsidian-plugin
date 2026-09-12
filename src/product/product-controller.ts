import {
  appendDurableRemoteChangeBatch,
  contractId,
  type LocalTransactionalMutationPort,
  type RemoteFolderCreateRecoveryReadPort,
  type ReliableRemoteMutationPort,
  type StateRevision,
  type SynchronizationAuthorityStoreV1_1,
} from "../contracts";
import type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";
import {
  ProductControllerBase,
  type ProductControllerOptions as BaseProductControllerOptions,
} from "./product-controller-base";
import { authoritativeDiagnostics, withExecutionLifecycleObserver } from "./authority-execution-diagnostics";
import type { RecoverableProductionMutationDependencies } from "./authoritative-production-executor";
import { recoverOutstandingDurableIntents, type DurableIntentRecoveryDependencies, type RemoteUpdateFinalizationPort } from "./durable-intent-recovery";
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

async function reconstructionMayBypassDurableRecovery(
  assembly: AssembledPlanningInput,
  options: ProductControllerOptions,
): Promise<boolean> {
  if (!assembly.reconstruction) return false;
  const persisted = await options.stateStore.load(options.stateContext);
  if (persisted.status === "recovery-required") return true;
  if (persisted.status === "trusted") return false;
  throw new SnapshotAssemblyError("recovery-required", `reconstruction requires persisted recovery-required or trusted recovery-in-progress state; found ${persisted.status}`);
}

function authorityLearningAssembler(
  assembler: ProductSnapshotAssembler,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  options: ProductControllerOptions,
  recoveryDependencies: DurableIntentRecoveryDependencies,
  diagnostics?: DiagnosticLogger,
): ProductSnapshotAssembler {
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
        if (await reconstructionMayBypassDurableRecovery(assembly, options)) return assembly;
        if (!assembly.reconstruction && assembly.input.state.status === "uninitialized") return assembly;
        await persistLearnedRemoteBatch(assembly, authorityStore, options);

        const recovery = await recoverOutstandingDurableIntents(
          options.executor,
          authorityStore,
          options.stateStore,
          options.stateContext,
          assembly.managedRemote,
          recoveryDependencies,
          diagnostics,
        );
        if (recovery.status === "recovery-required") throw new SnapshotAssemblyError("recovery-required", recovery.reason);

        if (recovery.changed) {
          assembly = await original(...args);
          if (assembly.reconstruction) {
            const persisted = await options.stateStore.load(options.stateContext);
            if (persisted.status !== "trusted") throw new SnapshotAssemblyError("recovery-required", `trusted recovery-in-progress state became ${persisted.status} during durable recovery refresh`);
          }
          await persistLearnedRemoteBatch(assembly, authorityStore, options);
          const residual = await recoverOutstandingDurableIntents(
            options.executor,
            authorityStore,
            options.stateStore,
            options.stateContext,
            assembly.managedRemote,
            recoveryDependencies,
            diagnostics,
          );
          if (residual.status === "recovery-required") throw new SnapshotAssemblyError("recovery-required", residual.reason);
          if (residual.changed) throw new SnapshotAssemblyError("recovery-required", "durable recovery did not reach a stable pre-planning authority state in one bounded refresh");
        }
        return assembly;
      };
    },
  });
}

export class ProductController extends ProductControllerBase {
  private readonly inFlight = new Set<Promise<unknown>>();
  private readonly runtimeDiagnostics?: DiagnosticLogger;
  private disposing = false;

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
      remoteUpdateFinalizationPort: options.reliableRemoteMutationPort as (ReliableRemoteMutationPort & RemoteUpdateFinalizationPort) | undefined,
    };
    (options.executor as unknown as { recoverableProductionMutationDependencies?: RecoverableProductionMutationDependencies }).recoverableProductionMutationDependencies = dependencies;
    super({
      ...options,
      snapshotAssembler: authorityLearningAssembler(options.snapshotAssembler, authorityStore, options, recoveryDependencies, diagnostics.logger),
      ...(diagnostics.logger ? { diagnostics: diagnostics.logger } : {}),
      authorityStore,
    });
    this.runtimeDiagnostics = diagnostics.logger;
  }

  override previewManual(runId?: Parameters<ProductControllerBase["previewManual"]>[0]): ReturnType<ProductControllerBase["previewManual"]> {
    if (this.disposing) {
      if (runId !== undefined) {
        this.runtimeDiagnostics?.syncInfo("sync.controller", "sync-run-deferred", runId, {
          stage: "runtime-disposal",
          result: "runtime-stopping",
          classification: "runtime-disposal",
        });
        this.runtimeDiagnostics?.endSyncRun(runId);
      }
      return Promise.resolve(undefined);
    }
    return this.track(super.previewManual(runId));
  }

  override previewVerifyReconcile(): ReturnType<ProductControllerBase["previewVerifyReconcile"]> {
    if (this.disposing) return Promise.resolve(undefined);
    return this.track(super.previewVerifyReconcile());
  }

  override runAutomatic(trigger: Parameters<ProductControllerBase["runAutomatic"]>[0]): Promise<void> {
    if (this.disposing) return Promise.resolve();
    return this.track(super.runAutomatic(trigger));
  }

  override request(action: Parameters<ProductControllerBase["request"]>[0]): ReturnType<ProductControllerBase["request"]> {
    if (this.disposing && action.kind !== "cancel-active-sync" && action.kind !== "pause") {
      return Promise.resolve({ status: "rejected", reason: "synchronization runtime is stopping" });
    }
    return this.track(super.request(action));
  }

  override requestPreviewAction(
    action: Parameters<ProductControllerBase["requestPreviewAction"]>[0],
    diagnosticRunId?: Parameters<ProductControllerBase["requestPreviewAction"]>[1],
  ): ReturnType<ProductControllerBase["requestPreviewAction"]> {
    if (this.disposing) return Promise.resolve({ status: "rejected", reason: "synchronization runtime is stopping" });
    return this.track(super.requestPreviewAction(action, diagnosticRunId));
  }

  override resolveWithCurrentLocal(
    id: Parameters<ProductControllerBase["resolveWithCurrentLocal"]>[0],
  ): ReturnType<ProductControllerBase["resolveWithCurrentLocal"]> {
    if (this.disposing) return Promise.resolve({ status: "rejected", reason: "synchronization runtime is stopping" });
    return this.track(super.resolveWithCurrentLocal(id));
  }

  async beginRuntimeDisposal(): Promise<void> {
    if (!this.disposing) {
      this.disposing = true;
      await super.request({ kind: "pause" });
      await super.request({ kind: "cancel-active-sync" });
    }
    await this.awaitQuiescence();
  }

  async awaitQuiescence(): Promise<void> {
    while (this.inFlight.size > 0) await Promise.allSettled([...this.inFlight]);
  }

  private track<T>(promise: Promise<T>): Promise<T> {
    this.inFlight.add(promise);
    void promise.finally(() => this.inFlight.delete(promise)).catch(() => undefined);
    return promise;
  }
}
