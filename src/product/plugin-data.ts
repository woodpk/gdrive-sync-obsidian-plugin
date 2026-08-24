import type { AuditRecord } from "../contracts";
import type { AuditPersistence } from "./audit-history";

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
};

interface PersistedPluginData {
  readonly settings?: Partial<BrainSyncSettings>;
  readonly audit?: readonly AuditRecord[];
}

export interface PluginDataHost {
  loadData(): Promise<unknown>;
  saveData(data: unknown): Promise<void>;
}

/** One serialized device-local persistence owner prevents settings/audit writers from clobbering each other. */
export class PluginDataRepository implements AuditPersistence {
  private loaded?: Promise<{ settings: BrainSyncSettings; audit: AuditRecord[] }>;
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

  private data(): Promise<{ settings: BrainSyncSettings; audit: AuditRecord[] }> {
    this.loaded ??= this.host.loadData().then(raw => {
      const value = raw && typeof raw === "object" ? raw as PersistedPluginData : {};
      const merged = { ...DEFAULT_SETTINGS, ...(value.settings ?? {}) };
      merged.userExclusionPatterns = Array.isArray(merged.userExclusionPatterns) ? merged.userExclusionPatterns.filter(value => typeof value === "string") : [];
      merged.scopeReconcileRequired = Boolean(merged.scopeReconcileRequired);
      return { settings: merged, audit: Array.isArray(value.audit) ? [...value.audit] : [] };
    });
    return this.loaded;
  }

  private async persist(data: { settings: BrainSyncSettings; audit: AuditRecord[] }): Promise<void> {
    this.saveChain = this.saveChain.then(() => this.host.saveData({ settings: data.settings, audit: data.audit }));
    await this.saveChain;
  }
}
