import type { DeviceIdentity, VaultIdentity } from "../contracts";

export interface RunLease {
  readonly release: () => Promise<void>;
}

export interface RunLeasePort {
  tryAcquire(vaultIdentity: VaultIdentity, deviceIdentity: DeviceIdentity, holderId: string): Promise<RunLease | undefined>;
}

export type BeginRunResult = { readonly status: "started" } | { readonly status: "already-running" | "paused" | "lease-unavailable" };

/** Phase-2 run semantics; trigger scheduling and product UI remain Phase 5. */
export class CoreRunCoordinator {
  private active = false;
  private paused = false;
  private cancellationRequested = false;
  private deferredReconciliation = false;
  private lease?: RunLease;

  constructor(
    private readonly vaultIdentity: VaultIdentity,
    private readonly deviceIdentity: DeviceIdentity,
    private readonly leasePort: RunLeasePort,
    private readonly holderId: string,
  ) {}

  async beginRun(): Promise<BeginRunResult> {
    if (this.paused) return { status: "paused" };
    if (this.active) {
      this.deferredReconciliation = true;
      return { status: "already-running" };
    }
    const lease = await this.leasePort.tryAcquire(this.vaultIdentity, this.deviceIdentity, this.holderId);
    if (!lease) return { status: "lease-unavailable" };
    this.lease = lease;
    this.active = true;
    this.cancellationRequested = false;
    return { status: "started" };
  }

  requestCancellation(): void {
    if (this.active) this.cancellationRequested = true;
  }

  canStartNextOperation(): boolean {
    return this.active && !this.paused && !this.cancellationRequested;
  }

  noteLocalOrRemoteChangeDuringRun(): void {
    if (this.active) this.deferredReconciliation = true;
  }

  pause(): void {
    this.paused = true;
    if (this.active) this.cancellationRequested = true;
  }

  resume(): void { this.paused = false; }
  isPaused(): boolean { return this.paused; }
  isCancellationRequested(): boolean { return this.cancellationRequested; }

  async finishRun(): Promise<{ readonly reconcileAgain: boolean }> {
    const reconcileAgain = this.deferredReconciliation;
    this.active = false;
    this.cancellationRequested = false;
    this.deferredReconciliation = false;
    const lease = this.lease;
    this.lease = undefined;
    if (lease) await lease.release();
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
