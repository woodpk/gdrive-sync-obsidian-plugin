import {
  contractId,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  SynchronizationStateAuthorityAdapter,
  TombstoneRetentionPolicy,
  ageKnownDevices,
  createInitialAuthorityState,
  generateDeviceIdentity,
  markKnownDeviceReconciled,
  registerKnownDevice,
  type ChangeCursor,
  type DeviceIdentity,
  type DurableSynchronizationAuthorityState,
  type PersistenceRevision,
  type SemanticStateGeneration,
  type StateLoadContext,
  type StateLoadResult,
  type StateRevision,
  type TrustedSynchronizationState,
  type VaultIdentity,
} from "../../../src/product/local-vault-boundary-seam";
import { InMemoryGoogleDriveCore } from "./in-memory-google-drive";
import { InMemoryLocalVault } from "./in-memory-local-vault";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function persistenceRevision(value: string): PersistenceRevision {
  return contractId<"StateRevision">(value) as PersistenceRevision;
}

function semanticGeneration(value: string): SemanticStateGeneration {
  return contractId<"SemanticStateGeneration">(value) as SemanticStateGeneration;
}

export const virtualDeviceVaultIdentity = (value: string): VaultIdentity =>
  contractId<"VaultIdentity">(value) as VaultIdentity;

export const virtualStateChangeCursor = (value: string): ChangeCursor =>
  contractId<"ChangeCursor">(value) as ChangeCursor;

export function deterministicDeviceIdentity(seed: number): DeviceIdentity {
  if (!Number.isSafeInteger(seed) || seed <= 0) {
    throw new Error("deterministic device seed must be a positive safe integer");
  }
  return generateDeviceIdentity(target => {
    for (let index = 0; index < target.length; index += 1) {
      target[index] = ((seed * 37 + index * 17) % 255) + 1;
    }
  });
}

export class DeterministicClock {
  constructor(private currentMs: number = 0) {
    if (!Number.isFinite(currentMs)) {
      throw new Error("deterministic clock requires a finite initial time");
    }
  }

  nowMs(): number {
    return this.currentMs;
  }

  set(nowMs: number): void {
    if (!Number.isFinite(nowMs)) {
      throw new Error("deterministic clock time must be finite");
    }
    this.currentMs = nowMs;
  }

  advanceBy(deltaMs: number): number {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) {
      throw new Error("deterministic clock advance must be finite and non-negative");
    }
    this.currentMs += deltaMs;
    return this.currentMs;
  }
}

interface PendingOrderedAction<T = unknown> {
  readonly label: string;
  readonly action: () => Promise<T> | T;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

/**
 * Narrow external observation-order gate for deterministic tests.
 * It does not own retries, synchronization decisions, verdicts, or durable workflow state.
 */
export class DeterministicOrderGate {
  private readonly pending = new Map<string, PendingOrderedAction>();

  defer<T>(label: string, action: () => Promise<T> | T): Promise<T> {
    if (!label || this.pending.has(label)) {
      throw new Error(`deterministic order label must be unique: ${label}`);
    }
    return new Promise<T>((resolve, reject) => {
      this.pending.set(label, { label, action, resolve, reject });
    });
  }

  pendingLabels(): readonly string[] {
    return [...this.pending.keys()];
  }

  async release(label: string): Promise<void> {
    const pending = this.pending.get(label);
    if (!pending) {
      throw new Error(`no deterministic action is pending for: ${label}`);
    }
    this.pending.delete(label);
    try {
      const result = await pending.action();
      pending.resolve(result);
    } catch (error) {
      pending.reject(error);
      throw error;
    }
  }
}

export interface VirtualDeviceRuntimeSnapshot {
  readonly generation: number;
  readonly deviceIdentity: DeviceIdentity;
  readonly vaultIdentity: VaultIdentity;
  readonly local: InMemoryLocalVault;
  readonly drive: InMemoryGoogleDriveCore;
}

export class VirtualDeviceRuntime {
  private raw?: PersistentSynchronizationStateStore;
  private authority?: SynchronizationStateAuthorityAdapter;
  private destroyed = false;

  constructor(
    readonly generation: number,
    readonly deviceIdentity: DeviceIdentity,
    readonly vaultIdentity: VaultIdentity,
    readonly local: InMemoryLocalVault,
    readonly drive: InMemoryGoogleDriveCore,
    storage: MemoryStateByteStorage,
  ) {
    this.raw = new PersistentSynchronizationStateStore(storage);
    this.authority = new SynchronizationStateAuthorityAdapter(this.raw);
  }

  rawStateStore(): PersistentSynchronizationStateStore {
    this.assertActive();
    return this.raw!;
  }

  stateStore(): SynchronizationStateAuthorityAdapter {
    this.assertActive();
    return this.authority!;
  }

  loadContext(expectation: StateLoadContext["expectation"] = "existing-pairing"): StateLoadContext {
    return {
      expectation,
      expectedVaultIdentity: this.vaultIdentity,
      expectedDeviceIdentity: this.deviceIdentity,
    };
  }

  snapshot(): VirtualDeviceRuntimeSnapshot {
    this.assertActive();
    return {
      generation: this.generation,
      deviceIdentity: this.deviceIdentity,
      vaultIdentity: this.vaultIdentity,
      local: this.local,
      drive: this.drive,
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.raw = undefined;
    this.authority = undefined;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  private assertActive(): void {
    if (this.destroyed) {
      throw new Error("virtual device runtime has been destroyed");
    }
  }
}

export interface VirtualDeviceBackingOptions {
  readonly deviceIdentity?: DeviceIdentity;
  readonly vaultIdentity: VaultIdentity;
  readonly local?: InMemoryLocalVault;
  readonly clock?: DeterministicClock;
}

export class VirtualDeviceBacking {
  readonly deviceIdentity: DeviceIdentity;
  readonly vaultIdentity: VaultIdentity;
  readonly local: InMemoryLocalVault;
  readonly storage = new MemoryStateByteStorage();
  readonly clock: DeterministicClock;
  private nextRuntimeGeneration = 1;

  constructor(options: VirtualDeviceBackingOptions) {
    this.deviceIdentity = options.deviceIdentity ?? deterministicDeviceIdentity(1);
    this.vaultIdentity = options.vaultIdentity;
    this.local = options.local ?? new InMemoryLocalVault();
    this.clock = options.clock ?? new DeterministicClock();
  }

  async initializeAuthority(
    changeCursor?: ChangeCursor,
  ): Promise<DurableSynchronizationAuthorityState> {
    const state = createInitialAuthorityState({
      persistenceRevision: persistenceRevision("state:1"),
      semanticGeneration: semanticGeneration("semantic:1"),
      vaultIdentity: this.vaultIdentity,
      deviceIdentity: this.deviceIdentity,
    });
    const candidate = changeCursor === undefined ? state : { ...state, changeCursor };
    const raw = new PersistentSynchronizationStateStore(this.storage);
    const saved = await raw.saveTrusted(candidate);
    if (saved.status !== "saved") {
      throw new Error(`unable to initialize virtual device authority: ${saved.status}`);
    }
    return candidate;
  }

  reconstruct(drive: InMemoryGoogleDriveCore): VirtualDeviceRuntime {
    return new VirtualDeviceRuntime(
      this.nextRuntimeGeneration++,
      this.deviceIdentity,
      this.vaultIdentity,
      this.local,
      drive,
      this.storage,
    );
  }

  async load(
    expectation: StateLoadContext["expectation"] = "existing-pairing",
  ): Promise<StateLoadResult> {
    const runtime = new PersistentSynchronizationStateStore(this.storage);
    return runtime.load({
      expectation,
      expectedVaultIdentity: this.vaultIdentity,
      expectedDeviceIdentity: this.deviceIdentity,
    });
  }

  async loadAuthority(): Promise<
    Awaited<ReturnType<PersistentSynchronizationStateStore["loadAuthority"]>>
  > {
    return new PersistentSynchronizationStateStore(this.storage).loadAuthority();
  }

  async setChangeCursor(changeCursor: ChangeCursor | undefined): Promise<void> {
    const raw = new PersistentSynchronizationStateStore(this.storage);
    const authority = new SynchronizationStateAuthorityAdapter(raw);
    const context: StateLoadContext = {
      expectation: "existing-pairing",
      expectedVaultIdentity: this.vaultIdentity,
      expectedDeviceIdentity: this.deviceIdentity,
    };
    const loaded = await authority.load(context);
    if (loaded.status !== "trusted") {
      throw new Error(`cannot set cursor while state is ${loaded.status}`);
    }
    const candidate: TrustedSynchronizationState = {
      ...loaded.state,
      ...(changeCursor === undefined ? { changeCursor: undefined } : { changeCursor }),
    };
    const saved = await authority.saveTrusted(
      candidate,
      loaded.state.stateRevision,
    );
    if (saved.status !== "saved") {
      throw new Error(`unable to persist virtual cursor: ${saved.status}`);
    }
  }

  clearStateBytes(): void {
    this.storage.bytes = undefined;
  }

  truncateStateBytes(): void {
    const bytes = this.requireBytes();
    this.storage.bytes = bytes.slice(0, Math.max(1, Math.floor(bytes.byteLength / 2)));
  }

  corruptChecksum(): void {
    const raw = decoder.decode(this.requireBytes());
    const match = /"checksum":"(fnv1a32:)([0-9a-f]{8})"/.exec(raw);
    if (!match) {
      throw new Error("persisted state checksum field is unavailable");
    }
    const original = match[2];
    const replacement = `${original[0] === "0" ? "1" : "0"}${original.slice(1)}`;
    this.storage.bytes = encoder.encode(
      raw.replace(match[0], `"checksum":"${match[1]}${replacement}"`),
    );
  }

  async installIncompatibleSchemaVersion(schemaVersion: number): Promise<void> {
    if (!Number.isSafeInteger(schemaVersion) || schemaVersion <= 1) {
      throw new Error("incompatible schema version must be an integer greater than 1");
    }
    const state = createInitialAuthorityState({
      persistenceRevision: persistenceRevision(`state:schema-${schemaVersion}`),
      semanticGeneration: semanticGeneration(`semantic:schema-${schemaVersion}`),
      vaultIdentity: this.vaultIdentity,
      deviceIdentity: this.deviceIdentity,
      schemaVersion,
    });
    const writer = new PersistentSynchronizationStateStore(
      this.storage,
      schemaVersion,
    );
    const saved = await writer.saveTrusted(state);
    if (saved.status !== "saved") {
      throw new Error(`unable to install incompatible schema state: ${saved.status}`);
    }
  }

  async loadWithExpectedDevice(
    expectedDeviceIdentity: DeviceIdentity,
  ): Promise<StateLoadResult> {
    return new PersistentSynchronizationStateStore(this.storage).load({
      expectation: "existing-pairing",
      expectedVaultIdentity: this.vaultIdentity,
      expectedDeviceIdentity,
    });
  }

  ageKnownDevices(
    state: TrustedSynchronizationState,
    staleAfterMs: number,
  ): TrustedSynchronizationState {
    return ageKnownDevices(state, this.clock.nowMs(), { staleAfterMs });
  }

  registerDevice(
    state: TrustedSynchronizationState,
    deviceIdentity: DeviceIdentity,
  ): TrustedSynchronizationState {
    return registerKnownDevice(state, deviceIdentity);
  }

  markDeviceReconciled(
    state: TrustedSynchronizationState,
    deviceIdentity: DeviceIdentity,
  ): TrustedSynchronizationState {
    return markKnownDeviceReconciled(
      state,
      deviceIdentity,
      this.clock.nowMs(),
    );
  }

  tombstoneRetention(retentionMs: number): TombstoneRetentionPolicy {
    return new TombstoneRetentionPolicy({ retentionMs });
  }

  persistedBytes(): Uint8Array | undefined {
    return this.storage.bytes?.slice();
  }

  private requireBytes(): Uint8Array {
    const bytes = this.storage.bytes;
    if (!bytes || bytes.byteLength === 0) {
      throw new Error("virtual device has no persisted state bytes");
    }
    return bytes.slice();
  }
}

export const virtualStateRevision = (value: string): StateRevision =>
  contractId<"StateRevision">(value) as StateRevision;
