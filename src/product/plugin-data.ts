import type { AuditRecord } from "../contracts";
import type { DiagnosticLogLevel, DiagnosticPersistence, DiagnosticStoreState } from "../diagnostics/diagnostic-logger";
import { DEFAULT_DIAGNOSTIC_RETENTION } from "../diagnostics/diagnostic-logger";
import type { AuditPersistence } from "./audit-history";
import type { SyncAttentionPersistence, SyncAttentionRecord } from "./sync-attention-ledger";

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

export interface PluginDataHost {
  loadData(): Promise<unknown>;
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
    this.loaded ??= this.host.loadData().then(raw => {
      const value = raw && typeof raw === "object" ? raw as PersistedPluginData : {};
      const merged = { ...DEFAULT_SETTINGS, ...(value.settings ?? {}) };
      merged.userExclusionPatterns = Array.isArray(merged.userExclusionPatterns) ? merged.userExclusionPatterns.filter(value => typeof value === "string") : [];
      merged.scopeReconcileRequired = Boolean(merged.scopeReconcileRequired);
      if (!["off", "error", "warn", "info", "debug", "trace"].includes(merged.diagnosticLogLevel)) merged.diagnosticLogLevel = DEFAULT_SETTINGS.diagnosticLogLevel;
      merged.diagnosticConsoleMirror = Boolean(merged.diagnosticConsoleMirror);
      if (!Number.isSafeInteger(merged.diagnosticRetention)) merged.diagnosticRetention = DEFAULT_DIAGNOSTIC_RETENTION;
      return { settings: merged, audit: Array.isArray(value.audit) ? [...value.audit] : [], diagnostics: value.diagnostics, syncAttention: Array.isArray(value.syncAttention) ? value.syncAttention.map(record => ({ ...record })) : [] };
    });
    return this.loaded;
  }

  private async persist(data: MutablePluginData): Promise<void> {
    this.saveChain = this.saveChain.then(() => this.host.saveData({ settings: data.settings, audit: data.audit, diagnostics: data.diagnostics, syncAttention: data.syncAttention }));
    await this.saveChain;
  }
}
