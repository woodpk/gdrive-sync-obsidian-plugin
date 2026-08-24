import type { DeviceIdentity, DeviceStateEntry, TombstoneEntry, TrustedSynchronizationState } from "../contracts";
import { contractId } from "../contracts";

export interface TombstoneRetentionSettings {
  readonly retentionMs: number;
}

export const DEFAULT_TOMBSTONE_RETENTION: TombstoneRetentionSettings = {
  retentionMs: 90 * 24 * 60 * 60 * 1000,
};

/**
 * Bounded tombstone-retention policy. A tombstone is never eligible to expire while any
 * known device is stale, and an undated tombstone is retained conservatively.
 */
export class TombstoneRetentionPolicy {
  constructor(private readonly settings: TombstoneRetentionSettings = DEFAULT_TOMBSTONE_RETENTION) {
    if (!Number.isFinite(settings.retentionMs) || settings.retentionMs <= 0) throw new Error("retentionMs must be positive");
  }

  canExpire(tombstone: TombstoneEntry, knownDevices: readonly DeviceStateEntry[], nowMs: number): boolean {
    if (knownDevices.some(device => device.stale)) return false;
    if (tombstone.advisoryRecordedAtMs === undefined) return false;
    return nowMs - tombstone.advisoryRecordedAtMs >= this.settings.retentionMs;
  }

  retain(tombstones: readonly TombstoneEntry[], knownDevices: readonly DeviceStateEntry[], nowMs: number): readonly TombstoneEntry[] {
    return tombstones.filter(tombstone => !this.canExpire(tombstone, knownDevices, nowMs));
  }
}

/**
 * Creates a random installation identity without hardware fingerprinting. Randomness is injected
 * for deterministic tests; production defaults to Web Crypto, available in supported web runtimes.
 */
export function generateDeviceIdentity(randomBytes?: (target: Uint8Array) => void): DeviceIdentity {
  const bytes = new Uint8Array(16);
  if (randomBytes) randomBytes(bytes);
  else {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.getRandomValues) throw new Error("secure random generation is unavailable");
    cryptoApi.getRandomValues(bytes);
  }
  const value = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  if (/^0+$/.test(value)) throw new Error("device identity randomness produced an invalid all-zero identifier");
  return contractId<"DeviceIdentity">(`device:${value}`) as DeviceIdentity;
}

/**
 * Removes a deauthorized device from device coordination state only. Shared base history,
 * mappings, tombstones, and vault content evidence are deliberately preserved.
 */
export function removeKnownDevice(state: TrustedSynchronizationState, deviceId: DeviceIdentity): TrustedSynchronizationState {
  if (deviceId === state.deviceIdentity) throw new Error("the active installation cannot remove its own device identity through this transition");
  return { ...state, knownDevices: state.knownDevices.filter(device => device.deviceId !== deviceId) };
}
