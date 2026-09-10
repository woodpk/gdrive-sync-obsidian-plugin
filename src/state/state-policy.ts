import type { DeviceIdentity, DeviceStateEntry, TombstoneEntry, TrustedSynchronizationState } from "../contracts";
import { contractId } from "../contracts";

export interface TombstoneRetentionSettings {
  readonly retentionMs: number;
}

export interface StaleDevicePolicySettings {
  readonly staleAfterMs: number;
}

export const DEFAULT_TOMBSTONE_RETENTION: TombstoneRetentionSettings = {
  retentionMs: 90 * 24 * 60 * 60 * 1000,
};

export const DEFAULT_STALE_DEVICE_POLICY: StaleDevicePolicySettings = {
  staleAfterMs: 30 * 24 * 60 * 60 * 1000,
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
 * Registers a newly observed peer device as stale until that device has completed an authoritative
 * reconciliation. Registration therefore cannot grant destructive authority merely by appearing.
 */
export function registerKnownDevice(state: TrustedSynchronizationState, deviceId: DeviceIdentity): TrustedSynchronizationState {
  if (state.knownDevices.some(device => device.deviceId === deviceId)) return state;
  return { ...state, knownDevices: [...state.knownDevices, { deviceId, stale: deviceId !== state.deviceIdentity }] };
}

/** Explicitly removes destructive authority from a known device until it reconciles again. */
export function markKnownDeviceStale(state: TrustedSynchronizationState, deviceId: DeviceIdentity): TrustedSynchronizationState {
  if (!state.knownDevices.some(device => device.deviceId === deviceId)) throw new Error("cannot mark an unknown device stale");
  return {
    ...state,
    knownDevices: state.knownDevices.map(device => device.deviceId === deviceId ? { ...device, stale: true } : device),
  };
}

/**
 * Clears stale state only after the caller has completed the authoritative reconciliation gate.
 * The time value is retained strictly as advisory aging metadata; it is never conflict/deletion truth.
 */
export function markKnownDeviceReconciled(
  state: TrustedSynchronizationState,
  deviceId: DeviceIdentity,
  advisoryReconciledAtMs?: number,
): TrustedSynchronizationState {
  if (!state.knownDevices.some(device => device.deviceId === deviceId)) throw new Error("cannot reconcile an unknown device");
  if (advisoryReconciledAtMs !== undefined && !Number.isFinite(advisoryReconciledAtMs)) throw new Error("advisory reconciliation time must be finite");
  return {
    ...state,
    knownDevices: state.knownDevices.map(device => device.deviceId === deviceId
      ? { ...device, stale: false, ...(advisoryReconciledAtMs === undefined ? {} : { advisoryLastReconciledAtMs: advisoryReconciledAtMs }) }
      : device),
  };
}

/**
 * Ages peer devices into stale authority based on advisory last-reconciled metadata. The active
 * installation is never self-demoted by this peer-aging pass. Missing peer timestamps fail closed.
 */
export function ageKnownDevices(
  state: TrustedSynchronizationState,
  nowMs: number,
  settings: StaleDevicePolicySettings = DEFAULT_STALE_DEVICE_POLICY,
): TrustedSynchronizationState {
  if (!Number.isFinite(nowMs)) throw new Error("nowMs must be finite");
  if (!Number.isFinite(settings.staleAfterMs) || settings.staleAfterMs <= 0) throw new Error("staleAfterMs must be positive");
  return {
    ...state,
    knownDevices: state.knownDevices.map(device => {
      if (device.deviceId === state.deviceIdentity || device.stale) return device;
      const last = device.advisoryLastReconciledAtMs;
      return last === undefined || nowMs - last >= settings.staleAfterMs ? { ...device, stale: true } : device;
    }),
  };
}

export function staleDeviceBlocksDestructiveAuthority(state: TrustedSynchronizationState): boolean {
  return state.knownDevices.some(device => device.stale);
}

/**
 * Removes a deauthorized device from device coordination state only. Shared base history,
 * mappings, tombstones, and vault content evidence are deliberately preserved.
 */
export function removeKnownDevice(state: TrustedSynchronizationState, deviceId: DeviceIdentity): TrustedSynchronizationState {
  if (deviceId === state.deviceIdentity) throw new Error("the active installation cannot remove its own device identity through this transition");
  return { ...state, knownDevices: state.knownDevices.filter(device => device.deviceId !== deviceId) };
}
