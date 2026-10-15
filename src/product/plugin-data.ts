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
  recoveryInProgress: boolean;
  recoveryBackupId: string;
  userExclusionPatterns: string[];
  syncPlanErrorsDirectory: string;
  managedSyncPlanErrorsExclusion: string;
  syncPlanErrorsRelocation: SyncPlanErrorsRelocationJournal | null;
  scopeReconcileRequired: boolean;
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
  recoveryInProgress: false,
  recoveryBackupId: "",
  userExclusionPatterns: [],
  syncPlanErrorsDirectory: "",
  managedSyncPlanErrorsExclusion: "",
  syncPlanErrorsRelocation: null,
  scopeReconcileRequired: false,
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
}


/** Reject live writes that would make completed synchronization impossible to reload. */
function assertWritableSettingsIdentity(next: BrainSyncSettings, current: BrainSyncSettings): void {
  if (!next.firstSyncCompleted) return;
  if (![next.deviceIdentity, next.vaultIdentity, next.remoteRootId]
    .every(identity => typeof identity === "string" && identity.trim().length > 0)) {
    throw new Error("Cannot persist incomplete completed-sync identity; deauthorize this device before changing pairing.");
  }
  if (current.firstSyncCompleted && (
    next.deviceIdentity !== current.deviceIdentity ||
    next.vaultIdentity !== current.vaultIdentity ||
    next.remoteRootId !== current.remoteRootId
  )) {
    throw new Error("Cannot change completed-sync identity; deauthorize this device before re-pairing.");
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

  constructor(private readonly host: PluginDataHost) {}

  async loadSettings(): Promise<BrainSyncSettings> {
    const settings = (await this.data()).settings;
    return { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
  }
  async saveSettings(settings: BrainSyncSettings): Promise<void> {
    const data = await this.data();
    assertWritableSettingsIdentity(settings, data.settings);
    data.settings = { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
    await this.persist(data);
  }
  async load(): Promise<readonly AuditRecord[]> { return [...(await this.data()).audit]; }
  async save(records: readonly AuditRecord[]): Promise<void> {
    const data = await this.data();
    data.audit = [...records];
    await this.persist(data);
  }
  async loadDiagnostics(): Promise<unknown> { return (await this.data()).diagnostics; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> {
    const data = await this.data();
    data.diagnostics = {
      records: state.records.map(record => ({ ...record, ...(record.fields ? { fields: { ...record.fields } } : {}) })),
      nextSequence: state.nextSequence,
      nextAttemptId: state.nextAttemptId,
      nextRunId: state.nextRunId,
    };
    await this.persist(data);
  }
  async loadSyncAttention(): Promise<readonly SyncAttentionRecord[]> { return (await this.data()).syncAttention.map(record => ({ ...record })); }
  async saveSyncAttention(records: readonly SyncAttentionRecord[]): Promise<void> {
    const data = await this.data();
    data.syncAttention = records.map(record => ({ ...record }));
    await this.persist(data);
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
      const value = (raw ?? {}) as PersistedPluginData;
      const merged = { ...DEFAULT_SETTINGS, ...(value.settings ?? {}) };
      merged.userExclusionPatterns = Array.isArray(merged.userExclusionPatterns) ? merged.userExclusionPatterns.filter(value => typeof value === "string") : [];
      merged.syncPlanErrorsDirectory = typeof merged.syncPlanErrorsDirectory === "string" ? merged.syncPlanErrorsDirectory : "";
      merged.managedSyncPlanErrorsExclusion = typeof merged.managedSyncPlanErrorsExclusion === "string" ? merged.managedSyncPlanErrorsExclusion : "";
      merged.syncPlanErrorsRelocation = normalizeSyncPlanErrorsRelocationJournal(merged.syncPlanErrorsRelocation);
      merged.scopeReconcileRequired = Boolean(merged.scopeReconcileRequired);
      if (!["off", "error", "warn", "info", "debug", "trace"].includes(merged.diagnosticLogLevel)) merged.diagnosticLogLevel = DEFAULT_SETTINGS.diagnosticLogLevel;
      merged.diagnosticConsoleMirror = Boolean(merged.diagnosticConsoleMirror);
      if (!Number.isSafeInteger(merged.diagnosticRetention)) merged.diagnosticRetention = DEFAULT_DIAGNOSTIC_RETENTION;
      return { settings: merged, audit: Array.isArray(value.audit) ? [...value.audit] : [], diagnostics: value.diagnostics, syncAttention: Array.isArray(value.syncAttention) ? value.syncAttention.map(record => ({ ...record })) : [] };
    });
    return this.loaded;
  }

  private async persist(data: MutablePluginData): Promise<void> {
    assertWritableSettingsIdentity(data.settings, data.settings);
    const payload = structuredClone({
      settings: { ...data.settings, userExclusionPatterns: [...data.settings.userExclusionPatterns] },
      audit: data.audit.map(record => ({ ...record })),
      diagnostics: data.diagnostics,
      syncAttention: data.syncAttention.map(record => ({ ...record })),
    });
    const write = this.saveChain.catch(() => undefined).then(() => this.host.saveData(payload));
    this.saveChain = write.catch(() => undefined);
    await write;
  }
}
