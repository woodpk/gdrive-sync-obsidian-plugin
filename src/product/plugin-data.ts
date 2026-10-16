import type { AuditRecord } from "../contracts";
import type { DiagnosticLogLevel, DiagnosticPersistence, DiagnosticStoreState } from "../diagnostics/diagnostic-logger";
import { DEFAULT_DIAGNOSTIC_RETENTION } from "../diagnostics/diagnostic-logger";
import type { AuditPersistence } from "./audit-history";
import type { SyncAttentionPersistence, SyncAttentionRecord } from "./sync-attention-ledger";
import { normalizeSyncPlanErrorsRelocationJournal, type SyncPlanErrorsRelocationJournal } from "./sync-plan-errors-path";

export interface BrainSyncSettings {
  oauthClientId: string;
  oauthRedirectUri: string;
  remoteRootId: string;
  vaultIdentity: string;
  deviceIdentity: string;
  firstSyncCompleted: boolean;
  /** Empty retains pre-G1-04 IndexedDB storage keys for existing installations. */
  pairingStateNamespace?: string;
  recoveryInProgress: boolean;
  recoveryBackupId: string;
  userExclusionPatterns: string[];
  syncPlanErrorsDirectory: string;
  managedSyncPlanErrorsExclusion: string;
  syncPlanErrorsRelocation: SyncPlanErrorsRelocationJournal | null;
  scopeReconcileRequired: boolean;
  /** Monotonic token prevents older full runs from clearing a newer scope edit. */
  scopeReconcileGeneration?: number;
  startupResumeEnabled: boolean;
  localChangeEnabled: boolean;
  periodicEnabled: boolean;
  periodicIntervalMinutes: number;
  localDebounceMs: number;
  wifiOnlyAutomatic: boolean;
  wifiOnlyLargeTransfers: boolean;
  largeTransferThresholdBytes: number;
  auditRetention: number;
  diagnosticLogLevel: DiagnosticLogLevel;
  diagnosticConsoleMirror: boolean;
  diagnosticRetention: number;
}

export const DEFAULT_SETTINGS: BrainSyncSettings = {
  oauthClientId: "",
  oauthRedirectUri: "",
  remoteRootId: "",
  vaultIdentity: "",
  deviceIdentity: "",
  firstSyncCompleted: false,
  pairingStateNamespace: "",
  recoveryInProgress: false,
  recoveryBackupId: "",
  userExclusionPatterns: [],
  syncPlanErrorsDirectory: "",
  managedSyncPlanErrorsExclusion: "",
  syncPlanErrorsRelocation: null,
  scopeReconcileRequired: false,
  scopeReconcileGeneration: 0,
  startupResumeEnabled: false,
  localChangeEnabled: false,
  periodicEnabled: false,
  periodicIntervalMinutes: 15,
  localDebounceMs: 1500,
  wifiOnlyAutomatic: true,
  wifiOnlyLargeTransfers: true,
  largeTransferThresholdBytes: 25 * 1024 * 1024,
  auditRetention: 500,
  diagnosticLogLevel: "info",
  diagnosticConsoleMirror: false,
  diagnosticRetention: DEFAULT_DIAGNOSTIC_RETENTION,
};

interface PersistedPluginData {
  readonly settings?: Partial<BrainSyncSettings>;
  readonly audit?: readonly AuditRecord[];
  readonly diagnostics?: unknown;
  readonly syncAttention?: readonly SyncAttentionRecord[];
}
interface MutablePluginData {
  settings: BrainSyncSettings;
  audit: AuditRecord[];
  diagnostics?: unknown;
  syncAttention: SyncAttentionRecord[];
}

/**
 * A persisted data.json must not silently become a new or unpaired installation
 * when a required identity or first-sync authority field is absent.
 * Optional settings may still migrate via DEFAULT_SETTINGS.
 */
function assertPersistedSettingsIdentity(raw: Record<string, unknown>): void {
  const settings = raw.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Existing BRAIN data.json has missing or invalid settings; refusing identity reset.");
  }
  const value = settings as Record<string, unknown>;
  for (const key of ["deviceIdentity", "vaultIdentity", "remoteRootId"] as const) {
    if (typeof value[key] !== "string") {
      throw new Error(`Existing BRAIN data.json is missing a valid ${key}; refusing identity reset.`);
    }
  }
  if (!(value.deviceIdentity as string).trim()) {
    throw new Error("Existing BRAIN data.json has no device identity; refusing identity reset.");
  }
  if (typeof value.firstSyncCompleted !== "boolean") {
    throw new Error("Existing BRAIN data.json has no valid first-sync authority; refusing identity reset.");
  }
  if (value.firstSyncCompleted && (!(value.vaultIdentity as string).trim() || !(value.remoteRootId as string).trim())) {
    throw new Error("Existing BRAIN data.json has inconsistent completed-sync identity; refusing identity reset.");
  }
  if (Object.prototype.hasOwnProperty.call(value, "pairingStateNamespace") &&
      (typeof value.pairingStateNamespace !== "string" ||
       (value.pairingStateNamespace.length > 0 && !value.pairingStateNamespace.trim()))) {
    throw new Error("Existing BRAIN data.json has invalid pairing storage identity; refusing identity reset.");
  }
}


/** Reject write-time pairing corruption and require isolated authority on deauthorization. */
function assertWritableSettingsIdentity(next: BrainSyncSettings, current: BrainSyncSettings): void {
  if (next.firstSyncCompleted && ![next.deviceIdentity, next.vaultIdentity, next.remoteRootId]
    .every(identity => typeof identity === "string" && identity.trim().length > 0)) {
    throw new Error("Cannot persist incomplete completed-sync identity; deauthorize this device before changing pairing.");
  }

  // A remote with firstSyncCompleted=false can already have a trusted BASE after a
  // partial run. It is just as bound to that remote as a completed installation.
  if (current.remoteRootId.trim()) {
    const identityChanged = next.deviceIdentity !== current.deviceIdentity ||
      next.vaultIdentity !== current.vaultIdentity ||
      next.remoteRootId !== current.remoteRootId ||
      next.pairingStateNamespace !== current.pairingStateNamespace;
    if (identityChanged || (current.firstSyncCompleted && !next.firstSyncCompleted)) {
      const deauthorized = next.deviceIdentity === current.deviceIdentity &&
        next.vaultIdentity === current.vaultIdentity &&
        next.remoteRootId === "" &&
        !next.firstSyncCompleted &&
        Boolean(next.pairingStateNamespace?.trim()) &&
        next.pairingStateNamespace !== current.pairingStateNamespace &&
        !next.startupResumeEnabled && !next.localChangeEnabled && !next.periodicEnabled;
      if (!deauthorized) {
        throw new Error("Existing remote pairing (including incomplete first sync) must be deauthorized before changing identity or storage namespace.");
      }
      return;
    }
  }

  // Even a legacy installation with an empty remoteRootId may retain the old
  // root's BASE under an identity-only key. First validated pairing must never
  // read that key: rotate the namespace before persisting a remote ID.
  if (!current.remoteRootId.trim() && next.remoteRootId.trim()) {
    if (!next.pairingStateNamespace?.trim() ||
        next.pairingStateNamespace === current.pairingStateNamespace ||
        next.startupResumeEnabled || next.localChangeEnabled || next.periodicEnabled) {
      throw new Error("A newly paired remote requires fresh isolated state and automatic sync disabled.");
    }
  }
  if (current.firstSyncCompleted && !next.firstSyncCompleted) {
    throw new Error("Completed pairing must be deauthorized with fresh isolated state and automatic sync disabled.");
  }
}

/** Legacy installs keep historical keys; new pairing epochs isolate subsequent authority. */
export function pairingStorageKey(
  prefix: "brain-google-drive-sync" | "brain-google-drive-sync-text",
  settings: Pick<BrainSyncSettings, "vaultIdentity" | "deviceIdentity" | "remoteRootId" | "pairingStateNamespace">,
): string {
  const legacy = `${prefix}:${settings.vaultIdentity}:${settings.deviceIdentity}`;
  return settings.pairingStateNamespace
    ? `${legacy}:pairing:${settings.pairingStateNamespace}:${settings.remoteRootId}`
    : legacy;
}

export function assertNewPairingAllowed(settings: BrainSyncSettings): void {
  if (settings.firstSyncCompleted || settings.remoteRootId.trim()) {
    throw new Error("Deauthorize the existing remote pairing (including incomplete first sync) before creating or pairing a different managed remote.");
  }
}

export interface PluginDataHost {
  loadData(): Promise<unknown>;
  /** Distinguishes a new installation from an existing unreadable data.json. */
  dataFileExists(): Promise<boolean>;
  saveData(data: unknown): Promise<void>;
}

/** One serialized device-local persistence owner prevents settings/audit/diagnostic writers from clobbering each other. */
export class PluginDataRepository implements AuditPersistence, DiagnosticPersistence, SyncAttentionPersistence {
  private loaded?: Promise<MutablePluginData>;
  private saveChain = Promise.resolve();
  private uncertainWrite = false;
  private confirmedAbsent = false;
  private confirmedData: unknown;

  constructor(private readonly host: PluginDataHost) {}

  async loadSettings(): Promise<BrainSyncSettings> {
    const settings = (await this.data()).settings;
    return { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
  }
  async saveSettings(settings: BrainSyncSettings): Promise<void> {
    const copy = { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
    await this.persist(current => {
      assertWritableSettingsIdentity(copy, current.settings);
      return { ...current, settings: copy };
    });
  }

  /** Evaluate runtime/UI settings mutations against the latest committed document inside saveChain. */
  async mutateSettings(update: (latest: BrainSyncSettings) => BrainSyncSettings): Promise<BrainSyncSettings> {
    let committed: BrainSyncSettings | undefined;
    await this.persist(current => {
      const prior = { ...current.settings, userExclusionPatterns: [...current.settings.userExclusionPatterns] };
      const changed = update(prior);
      const next = { ...changed, userExclusionPatterns: [...changed.userExclusionPatterns] };
      assertWritableSettingsIdentity(next, current.settings);
      committed = next;
      return { ...current, settings: next };
    });
    if (!committed) throw new Error("Settings mutation was not committed.");
    return { ...committed, userExclusionPatterns: [...committed.userExclusionPatterns] };
  }

  /** Partial UI patches share the same atomic authority as runtime transitions. */
  async patchSettings(patch: Partial<BrainSyncSettings>): Promise<BrainSyncSettings> {
    const captured = { ...patch, ...(patch.userExclusionPatterns ? { userExclusionPatterns: [...patch.userExclusionPatterns] } : {}) };
    return this.mutateSettings(latest => ({ ...latest, ...captured }));
  }
  async load(): Promise<readonly AuditRecord[]> { return [...(await this.data()).audit]; }
  async save(records: readonly AuditRecord[]): Promise<void> {
    const audit = [...records];
    await this.persist(current => ({ ...current, audit }));
  }
  async loadDiagnostics(): Promise<unknown> { return (await this.data()).diagnostics; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> {
    const diagnostics = {
      records: state.records.map(record => ({ ...record, ...(record.fields ? { fields: { ...record.fields } } : {}) })),
      nextSequence: state.nextSequence,
      nextAttemptId: state.nextAttemptId,
      nextRunId: state.nextRunId,
    };
    await this.persist(current => ({ ...current, diagnostics }));
  }
  async loadSyncAttention(): Promise<readonly SyncAttentionRecord[]> {
    return (await this.data()).syncAttention.map(record => ({ ...record }));
  }
  async saveSyncAttention(records: readonly SyncAttentionRecord[]): Promise<void> {
    const syncAttention = records.map(record => ({ ...record }));
    await this.persist(current => ({ ...current, syncAttention }));
  }

  private data(): Promise<MutablePluginData> {
    this.loaded ??= this.host.loadData().then(async raw => {
      if (raw == null) {
        if (await this.host.dataFileExists()) {
          throw new Error("Existing BRAIN data.json could not be loaded; refusing to replace it with default settings.");
        }
      } else if (typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error("BRAIN data.json has an invalid top-level structure; refusing to overwrite persisted settings.");
      } else {
        assertPersistedSettingsIdentity(raw as Record<string, unknown>);
      }
      this.confirmedAbsent = raw == null;
      this.confirmedData = raw == null ? undefined : JSON.parse(JSON.stringify(raw));
      const value = (raw ?? {}) as PersistedPluginData;
      const merged = { ...DEFAULT_SETTINGS, ...(value.settings ?? {}) };
      merged.pairingStateNamespace = typeof merged.pairingStateNamespace === "string" ? merged.pairingStateNamespace : "";
      merged.userExclusionPatterns = Array.isArray(merged.userExclusionPatterns) ? merged.userExclusionPatterns.filter(value => typeof value === "string") : [];
      merged.syncPlanErrorsDirectory = typeof merged.syncPlanErrorsDirectory === "string" ? merged.syncPlanErrorsDirectory : "";
      merged.managedSyncPlanErrorsExclusion = typeof merged.managedSyncPlanErrorsExclusion === "string" ? merged.managedSyncPlanErrorsExclusion : "";
      merged.syncPlanErrorsRelocation = normalizeSyncPlanErrorsRelocationJournal(merged.syncPlanErrorsRelocation);
      merged.scopeReconcileRequired = Boolean(merged.scopeReconcileRequired);
      merged.scopeReconcileGeneration = Number.isSafeInteger(merged.scopeReconcileGeneration) && merged.scopeReconcileGeneration >= 0 ? merged.scopeReconcileGeneration : 0;
      if (!["off", "error", "warn", "info", "debug", "trace"].includes(merged.diagnosticLogLevel)) merged.diagnosticLogLevel = DEFAULT_SETTINGS.diagnosticLogLevel;
      merged.diagnosticConsoleMirror = Boolean(merged.diagnosticConsoleMirror);
      if (!Number.isSafeInteger(merged.diagnosticRetention)) merged.diagnosticRetention = DEFAULT_DIAGNOSTIC_RETENTION;
      return { settings: merged, audit: Array.isArray(value.audit) ? [...value.audit] : [], diagnostics: value.diagnostics, syncAttention: Array.isArray(value.syncAttention) ? value.syncAttention.map(record => ({ ...record })) : [] };
    });
    return this.loaded;
  }

  /** After a rejected save, read actual storage before allowing another writer to proceed. */
  private async reconcileUncertainWrite(): Promise<void> {
    if (!this.uncertainWrite) return;
    let matches = false;
    try {
      const [actual, exists] = await Promise.all([this.host.loadData(), this.host.dataFileExists()]);
      matches = this.confirmedAbsent
        ? !exists && actual == null
        : exists && actual != null && JSON.stringify(actual) === JSON.stringify(this.confirmedData);
    } catch {
      // Unreadable state remains untrusted; do not overwrite it.
    }
    if (!matches) {
      throw new Error("Previous BRAIN data.json save is uncertain; stored state differs from the last confirmed value or cannot be read.");
    }
    this.uncertainWrite = false;
  }

  private async persist(update: (current: MutablePluginData) => MutablePluginData): Promise<void> {
    const write = this.saveChain.then(async () => {
      await this.reconcileUncertainWrite();
      const current = await this.data();
      const next = update(current);
      assertWritableSettingsIdentity(next.settings, next.settings);
      const payload = structuredClone({
        settings: { ...next.settings, userExclusionPatterns: [...next.settings.userExclusionPatterns] },
        audit: next.audit.map(record => ({ ...record })),
        diagnostics: next.diagnostics,
        syncAttention: next.syncAttention.map(record => ({ ...record })),
      });
      try {
        await this.host.saveData(payload);
      } catch (error) {
        this.uncertainWrite = true;
        throw error;
      }
      this.loaded = Promise.resolve(next);
      this.confirmedData = JSON.parse(JSON.stringify(payload));
      this.confirmedAbsent = false;
    });
    this.saveChain = write.catch(() => undefined);
    await write;
  }
}
