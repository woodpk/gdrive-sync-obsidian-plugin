import type { DeviceIdentity, VaultIdentity } from "../contracts";
import type { RunLease, RunLeasePort } from "../core/run-coordinator";

interface LockLike { readonly name?: string; }
interface LockManagerLike {
  request<T>(
    name: string,
    options: { readonly mode: "exclusive"; readonly ifAvailable: true },
    callback: (lock: LockLike | null) => Promise<T>,
  ): Promise<T>;
}

function runtimeLocks(): LockManagerLike | undefined {
  const navigatorValue = globalThis.navigator as Navigator & { readonly locks?: LockManagerLike };
  return navigatorValue?.locks;
}

/** Cross-instance, crash-releasing vault exclusion using the browser Web Locks API. */
export class WebLocksRunLeasePort implements RunLeasePort {
  constructor(private readonly locks: LockManagerLike | undefined = runtimeLocks()) {}

  async tryAcquire(vaultIdentity: VaultIdentity, _deviceIdentity: DeviceIdentity, holderId: string): Promise<RunLease | undefined> {
    if (!this.locks) return undefined;
    const name = `brain-gdrive-sync:${String(vaultIdentity)}`;
    let releaseGate: (() => void) | undefined;
    let resolveAcquired: ((value: boolean) => void) | undefined;
    const acquired = new Promise<boolean>(resolve => { resolveAcquired = resolve; });
    const released = new Promise<void>(resolve => { releaseGate = resolve; });

    void this.locks.request(name, { mode: "exclusive", ifAvailable: true }, async lock => {
      if (!lock) {
        resolveAcquired?.(false);
        return;
      }
      resolveAcquired?.(true);
      await released;
    }).catch(() => resolveAcquired?.(false));

    if (!await acquired) return undefined;
    let releasedOnce = false;
    return {
      release: async () => {
        if (releasedOnce) return;
        releasedOnce = true;
        releaseGate?.();
      },
    };
  }
}
