import type {
  DeviceIdentity,
  SynchronizationCancellationSignal,
  SynchronizationLifecycleState,
  VaultIdentity,
} from "../contracts";

export interface RunLease {
  readonly release: () => Promise<void>;
}

export interface RunLeasePort {
  tryAcquire(vaultIdentity: VaultIdentity, deviceIdentity: DeviceIdentity, holderId: string): Promise<RunLease | undefined>;
}

export type BeginRunResult = { readonly status: "started" } | { readonly status: "already-running" | "paused" | "lease-unavailable" };

/**
 * Lifecycle authority is process-local because Obsidian v1 supports one BRAIN
 * vault per plugin runtime. The Web Locks lease remains the cross-instance
 * authority. Keeping this gate here means every CoreRunCoordinator observes the
 * stopping state even when a controller already queued a follow-up trigger.
 */
let lifecycleState: SynchronizationLifecycleState = "active";
let lifecycleEpoch = 0;
let deferredReconciliationAcrossLifecycle = false;

export function synchronizationLifecycleState(): SynchronizationLifecycleState { return lifecycleState; }

export function enterSynchronizationLifecycle(next: SynchronizationLifecycleState): void {
  if (lifecycleState === "unloading" && next !== "active") return;
  if (lifecycleState === next) return;
  lifecycleState = next;
  lifecycleEpoch += 1;
}

export function noteDeferredReconciliationAcrossLifecycle(): void {
  deferredReconciliationAcrossLifecycle = true;
}

export function consumeDeferredReconciliationAcrossLifecycle(): boolean {
  const value = deferredReconciliationAcrossLifecycle;
  deferredReconciliationAcrossLifecycle = false;
  return value;
}

class MutableCancellationSignal implements SynchronizationCancellationSignal {
  private cancelledValue = false;
  private readonly listeners = new Set<() => void>();

  get cancelled(): boolean { return this.cancelledValue; }

  cancel(): void {
    if (this.cancelledValue) return;
    this.cancelledValue = true;
    for (const listener of [...this.listeners]) listener();
  }

  onCancellation(listener: () => void): () => void {
    if (this.cancelledValue) {
      listener();
      return () => undefined;
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Phase-2 run semantics plus the Phase-6 lifecycle/cancellation authority gate. */
export class CoreRunCoordinator {
  private active = false;
  private acquiring = false;
  private paused = false;
  private deferredReconciliation = false;
  private lease?: RunLease;
  private cancellation = new MutableCancellationSignal();

  constructor(
    private readonly vaultIdentity: VaultIdentity,
    private readonly deviceIdentity: DeviceIdentity,
    private readonly leasePort: RunLeasePort,
    private readonly holderId: string,
  ) {}

  async beginRun(): Promise<BeginRunResult> {
    if (this.paused || lifecycleState !== "active") return { status: "paused" };
    if (this.active || this.acquiring) {
      this.deferredReconciliation = true;
      return { status: "already-running" };
    }

    this.acquiring = true;
    const expectedEpoch = lifecycleEpoch;
    let lease: RunLease | undefined;
    try {
      lease = await this.leasePort.tryAcquire(this.vaultIdentity, this.deviceIdentity, this.holderId);
      if (!lease) return { status: "lease-unavailable" };

      // Suspension/unload/pause may race an awaited lease acquisition. A lease
      // obtained after the gate changed is released without granting run authority.
      if (this.paused || lifecycleState !== "active" || lifecycleEpoch !== expectedEpoch || this.active) {
        await lease.release();
        if (this.active) {
          this.deferredReconciliation = true;
          return { status: "already-running" };
        }
        return { status: "paused" };
      }

      this.lease = lease;
      this.active = true;
      this.cancellation = new MutableCancellationSignal();
      return { status: "started" };
    } finally {
      this.acquiring = false;
    }
  }

  requestCancellation(): void {
    if (this.active || this.acquiring) this.cancellation.cancel();
  }

  cancellationSignal(): SynchronizationCancellationSignal { return this.cancellation; }

  canStartNextOperation(): boolean {
    return this.active && !this.paused && lifecycleState === "active" && !this.cancellation.cancelled;
  }

  noteLocalOrRemoteChangeDuringRun(): void {
    if (this.active || this.acquiring) this.deferredReconciliation = true;
  }

  pause(): void {
    this.paused = true;
    this.requestCancellation();
  }

  resume(): void { this.paused = false; }
  isPaused(): boolean { return this.paused; }
  isCancellationRequested(): boolean { return this.cancellation.cancelled || lifecycleState !== "active"; }
  isRunActive(): boolean { return this.active || this.acquiring; }

  async finishRun(): Promise<{ readonly reconcileAgain: boolean }> {
    const reconcileAgain = this.deferredReconciliation;
    this.active = false;
    this.deferredReconciliation = false;
    const lease = this.lease;
    this.lease = undefined;
    if (lease) await lease.release();

    // A controller may otherwise immediately start its own deferred pass from a
    // finally block after suspension. Preserve the fact, but replay it only when
    // an active lifecycle opportunity exists again.
    if (reconcileAgain && lifecycleState !== "active") {
      noteDeferredReconciliationAcrossLifecycle();
      return { reconcileAgain: false };
    }
    return { reconcileAgain };
  }
}

/** Deterministic test/in-process implementation; production hosts can supply a durable platform lease. */
export class InMemoryRunLeasePort implements RunLeasePort {
  private readonly holders = new Map<string, string>();
  async tryAcquire(vaultIdentity: VaultIdentity, _deviceIdentity: DeviceIdentity, holderId: string): Promise<RunLease | undefined> {
    const key = String(vaultIdentity);
    if (this.holders.has(key)) return undefined;
    this.holders.set(key, holderId);
    return {
      release: async () => {
        if (this.holders.get(key) === holderId) this.holders.delete(key);
      },
    };
  }
}
