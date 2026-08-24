import type {
  DeviceIdentity,
  StateBackupReceipt,
  StateLoadContext,
  StateLoadResult,
  StateMigrationAssessment,
  StateRevision,
  StateSaveResult,
  SynchronizationStateStore,
  TrustedSynchronizationState,
  VaultIdentity,
} from "../contracts";

export interface StateByteStorage {
  read(): Promise<Uint8Array | undefined>;
  write(bytes: Uint8Array): Promise<void>;
  backup(bytes: Uint8Array): Promise<string>;
}

interface PersistedEnvelope {
  readonly envelopeVersion: 1;
  readonly checksum: string;
  readonly state: TrustedSynchronizationState;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function isString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function unique(values: readonly string[]): boolean { return new Set(values).size === values.length; }

function validateState(state: unknown): state is TrustedSynchronizationState {
  if (!state || typeof state !== "object") return false;
  const s = state as Record<string, unknown>;
  if (!Number.isInteger(s.schemaVersion) || !isString(s.stateRevision) || !isString(s.vaultIdentity) || !isString(s.deviceIdentity)) return false;
  if (!Array.isArray(s.base) || !Array.isArray(s.remoteMappings) || !Array.isArray(s.tombstones) || !Array.isArray(s.operations) || !Array.isArray(s.knownDevices)) return false;
  const basePaths = s.base.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).path ?? "") : "");
  const mappingIds = s.remoteMappings.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).remoteObjectId ?? "") : "");
  const operationIds = s.operations.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).operationId ?? "") : "");
  const deviceIds = s.knownDevices.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).deviceId ?? "") : "");
  if (basePaths.some(path => path.length === 0) || mappingIds.some(id => id.length === 0) || operationIds.some(id => id.length === 0) || deviceIds.some(id => id.length === 0)) return false;
  return unique(basePaths) && unique(mappingIds) && unique(operationIds) && unique(deviceIds);
}

function parseEnvelope(bytes: Uint8Array): { status: "ok"; envelope: PersistedEnvelope } | { status: "malformed" | "truncated" | "integrity-check-failed" | "internally-inconsistent"; detail: string } {
  const raw = decoder.decode(bytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const trimmed = raw.trim();
    return { status: trimmed.startsWith("{") && !trimmed.endsWith("}") ? "truncated" : "malformed", detail: error instanceof Error ? error.message : "invalid JSON" };
  }
  if (!parsed || typeof parsed !== "object") return { status: "malformed", detail: "state envelope must be an object" };
  const envelope = parsed as Partial<PersistedEnvelope>;
  if (envelope.envelopeVersion !== 1 || !isString(envelope.checksum) || !validateState(envelope.state)) {
    return { status: "internally-inconsistent", detail: "state envelope or required state fields are inconsistent" };
  }
  const payload = JSON.stringify(envelope.state);
  if (checksum(payload) !== envelope.checksum) return { status: "integrity-check-failed", detail: "persisted state checksum does not match payload" };
  return { status: "ok", envelope: envelope as PersistedEnvelope };
}

function serialize(state: TrustedSynchronizationState): Uint8Array {
  const payload = JSON.stringify(state);
  return encoder.encode(JSON.stringify({ envelopeVersion: 1, checksum: checksum(payload), state } satisfies PersistedEnvelope));
}

export class MemoryStateByteStorage implements StateByteStorage {
  bytes?: Uint8Array;
  readonly backups = new Map<string, Uint8Array>();
  async read(): Promise<Uint8Array | undefined> { return this.bytes ? this.bytes.slice() : undefined; }
  async write(bytes: Uint8Array): Promise<void> { this.bytes = bytes.slice(); }
  async backup(bytes: Uint8Array): Promise<string> {
    const id = `backup-${this.backups.size + 1}`;
    this.backups.set(id, bytes.slice());
    return id;
  }
}

export type StateMigration = (state: TrustedSynchronizationState, targetSchemaVersion: number) => TrustedSynchronizationState;

/** Mobile-neutral durable-state implementation over an injected byte store. */
export class PersistentSynchronizationStateStore implements SynchronizationStateStore {
  constructor(
    private readonly storage: StateByteStorage,
    readonly currentSchemaVersion = 1,
  ) {}

  async load(context: StateLoadContext): Promise<StateLoadResult> {
    const bytes = await this.storage.read();
    if (!bytes) {
      return context.expectation === "new-installation"
        ? { status: "uninitialized" }
        : { status: "recovery-required", reason: "expected-state-missing" };
    }
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: parsed.status, detail: parsed.detail };
    const state = parsed.envelope.state;
    if (state.schemaVersion !== this.currentSchemaVersion) {
      return { status: "recovery-required", reason: "incompatible-version", detail: `state schema ${state.schemaVersion}, runtime schema ${this.currentSchemaVersion}` };
    }
    if (context.expectedVaultIdentity && state.vaultIdentity !== context.expectedVaultIdentity) {
      return { status: "recovery-required", reason: "internally-inconsistent", detail: "vault identity does not match expected pairing" };
    }
    if (context.expectedDeviceIdentity && state.deviceIdentity !== context.expectedDeviceIdentity) {
      return { status: "recovery-required", reason: "clone-or-restore-suspected", detail: "persisted device identity does not match this installation" };
    }
    return { status: "trusted", state };
  }

  async saveTrusted(state: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult> {
    if (!validateState(state)) return { status: "recovery-required", reason: "refusing to persist internally inconsistent trusted state" };
    if (state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "refusing to persist incompatible state schema" };
    const currentBytes = await this.storage.read();
    if (currentBytes) {
      const current = parseEnvelope(currentBytes);
      if (current.status !== "ok") return { status: "recovery-required", reason: `existing state is ${current.status}` };
      if (expectedRevision && current.envelope.state.stateRevision !== expectedRevision) {
        return { status: "stale-revision", actualRevision: current.envelope.state.stateRevision };
      }
    } else if (expectedRevision) {
      return { status: "stale-revision" };
    }
    await this.storage.write(serialize(state));
    return { status: "saved", stateRevision: state.stateRevision };
  }

  async createRecoveryBackup(): Promise<StateBackupReceipt> {
    const bytes = await this.storage.read();
    const backupId = await this.storage.backup(bytes ?? new Uint8Array());
    let sourceRevision: StateRevision | undefined;
    if (bytes) {
      const parsed = parseEnvelope(bytes);
      if (parsed.status === "ok") sourceRevision = parsed.envelope.state.stateRevision;
    }
    return { backupId, sourceRevision };
  }

  async assessMigration(targetSchemaVersion: number): Promise<StateMigrationAssessment> {
    const bytes = await this.storage.read();
    if (!bytes) return { status: "compatible", toVersion: targetSchemaVersion };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "incompatible", toVersion: targetSchemaVersion };
    const fromVersion = parsed.envelope.state.schemaVersion;
    if (fromVersion === targetSchemaVersion) return { status: "compatible", fromVersion, toVersion: targetSchemaVersion };
    if (fromVersion < targetSchemaVersion) return { status: "migration-required", fromVersion, toVersion: targetSchemaVersion };
    return { status: "incompatible", fromVersion, toVersion: targetSchemaVersion };
  }

  /** Safe migration helper: backup first, then transform and persist only a validated target schema. */
  async migrate(targetSchemaVersion: number, migration: StateMigration): Promise<{ status: "migrated"; backup: StateBackupReceipt } | { status: "incompatible" | "recovery-required"; reason: string }> {
    const assessment = await this.assessMigration(targetSchemaVersion);
    if (assessment.status === "incompatible") return { status: "incompatible", reason: "state cannot be safely migrated to the requested schema" };
    if (assessment.status === "compatible") return { status: "incompatible", reason: "migration is not required" };
    const loadedBytes = await this.storage.read();
    if (!loadedBytes) return { status: "recovery-required", reason: "state disappeared before migration" };
    const parsed = parseEnvelope(loadedBytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: `state became ${parsed.status}` };
    const backup = await this.createRecoveryBackup();
    const migrated = migration(parsed.envelope.state, targetSchemaVersion);
    if (!validateState(migrated) || migrated.schemaVersion !== targetSchemaVersion) return { status: "recovery-required", reason: "migration produced invalid target state" };
    await this.storage.write(serialize(migrated));
    return { status: "migrated", backup };
  }

  async exportDiagnosticState(): Promise<Uint8Array> {
    const bytes = await this.storage.read();
    if (!bytes) return encoder.encode(JSON.stringify({ status: "uninitialized" }));
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return encoder.encode(JSON.stringify({ status: "recovery-required", reason: parsed.status }));
    const state = parsed.envelope.state;
    // Explicit projection prevents runtime-added secret/content fields from leaking through diagnostics.
    const diagnostic = {
      schemaVersion: state.schemaVersion,
      stateRevision: state.stateRevision,
      vaultIdentity: state.vaultIdentity,
      deviceIdentity: state.deviceIdentity,
      base: state.base.map(entry => ({ path: entry.path, entityKind: entry.entityKind, localExisted: entry.localExisted, remoteExisted: entry.remoteExisted, contentEvidence: entry.content, remoteObjectId: entry.remoteObjectId })),
      remoteMappings: state.remoteMappings,
      tombstones: state.tombstones,
      changeCursor: state.changeCursor,
      operations: state.operations,
      knownDevices: state.knownDevices,
    };
    return encoder.encode(JSON.stringify(diagnostic));
  }
}

export function createInitialTrustedState(values: {
  stateRevision: StateRevision;
  vaultIdentity: VaultIdentity;
  deviceIdentity: DeviceIdentity;
  schemaVersion?: number;
}): TrustedSynchronizationState {
  return {
    schemaVersion: values.schemaVersion ?? 1,
    stateRevision: values.stateRevision,
    vaultIdentity: values.vaultIdentity,
    deviceIdentity: values.deviceIdentity,
    base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [{ deviceId: values.deviceIdentity, stale: false }],
  };
}
