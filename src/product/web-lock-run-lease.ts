import type { DeviceIdentity, VaultIdentity } from "../contracts";
import type { RunLease, RunLeasePort } from "../core/run-coordinator";

interface LockLike { readonly name?: string; }
interface LockManagerLike {
  request<T>(name: string, options: { readonly mode: "exclusive"; readonly ifAvailable: true }, callback: (lock: LockLike | null) => Promise<T>): Promise<T>;
}

function runtimeLocks(): LockManagerLike | undefined {
  const navigatorValue = globalThis.navigator as Navigator & { readonly locks?: LockManagerLike };
  return navigatorValue?.locks;
}

// Some supported WebViews do not expose Web Locks. Within one JavaScript realm,
// retain an exclusion fallback instead of treating missing browser API support as
// permission for concurrent mutation runs. Separate realms still use Web Locks
// where the platform provides the cross-instance primitive.
const inProcessFallbackHolders = new Map<string, string>();

/** Cross-instance, crash-releasing vault exclusion using the browser Web Locks API. */
export class WebLocksRunLeasePort implements RunLeasePort {
  constructor(private readonly locks: LockManagerLike | undefined = runtimeLocks()) {}

  async tryAcquire(vaultIdentity: VaultIdentity, _deviceIdentity: DeviceIdentity, holderId: string): Promise<RunLease | undefined> {
    const name = `brain-gdrive-sync:${String(vaultIdentity)}`;
    if (!this.locks) return this.tryAcquireInProcess(name, holderId);

    let releaseGate: (() => void) | undefined;
    let resolveAcquired: ((value: boolean) => void) | undefined;
    const acquired = new Promise<boolean>(resolve => { resolveAcquired = resolve; });
    const released = new Promise<void>(resolve => { releaseGate = resolve; });
    const requestCompletion = this.locks.request(name, { mode: "exclusive", ifAvailable: true }, async lock => {
      if (!lock) { resolveAcquired?.(false); return; }
      resolveAcquired?.(true);
      await released;
    }).catch(() => resolveAcquired?.(false));

    if (!await acquired) { await requestCompletion; return undefined; }
    let releasedOnce = false;
    return {
      release: async () => {
        if (!releasedOnce) { releasedOnce = true; releaseGate?.(); }
        await requestCompletion;
      },
    };
  }

  private async tryAcquireInProcess(name: string, holderId: string): Promise<RunLease | undefined> {
    if (inProcessFallbackHolders.has(name)) return undefined;
    inProcessFallbackHolders.set(name, holderId);
    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        if (inProcessFallbackHolders.get(name) === holderId) inProcessFallbackHolders.delete(name);
      },
    };
  }
}
