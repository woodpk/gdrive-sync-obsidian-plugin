import { Notice, Platform, requestUrl, type App, type Plugin } from "obsidian";
import type { DeviceIdentity, DriveSignal, LocalVaultPort, ManagedRemoteIdentity, ProtocolVersion, RemoteObjectId, StateLoadContext, VaultIdentity } from "../contracts";
import { contractId } from "../contracts";
import { DeterministicSynchronizationPlanner } from "../core/planner";
import { ProductionSynchronizationPlanner } from "../core/production-planner";
import { ThreeWayConflictResolver } from "../core/conflict-resolver";
import { createObsidianGoogleDriveBoundary } from "../drive/runtime";
import { beginGoogleAuthorization, registerGoogleOAuthReturn } from "../drive/oauth-return";
import { ObsidianLocalVaultAdapter } from "../local/obsidian-local-vault";
import { IndexedDbStateByteStorage } from "../state/indexeddb-state-storage";
import { PersistentSynchronizationStateStore } from "../state/persistent-state-store";
import { generateDeviceIdentity } from "../state/state-policy";
import { BoundedAuditHistory } from "./audit-history";
import { CanonicalEvidenceLocalVault } from "./canonical-local-vault";
import { MeaningfulNotificationFilter } from "./notification-policy";
import { ProductPathScope, ScopedLocalVault } from "./path-scope";
import { IntegratedProductController } from "./product-controller";
import { ProductSynchronizationExecutor } from "./production-executor";
import { ProductSnapshotAssembler } from "./snapshot-assembler";
import { ProductSyncScheduler } from "./scheduler";
import { WebLocksRunLeasePort } from "./web-lock-run-lease";
import { automaticNetworkDecision } from "./network-policy";
import type { BrainSyncSettings, PluginDataRepository } from "./plugin-data";
import { IndexedDbTextVersionPersistence, ProductTextVersionStore } from "./text-version-store";

const PROTOCOL_VERSION = contractId<"ProtocolVersion">("1") as ProtocolVersion;
function driveSignalMessage(signal: DriveSignal): string { return "detail" in signal && signal.detail ? signal.detail : signal.kind; }

export interface ProductRuntimeHost {
  readonly app: App;
  readonly plugin: Plugin;
  settings(): BrainSyncSettings;
  data: PluginDataRepository;
  saveSettings(settings: BrainSyncSettings): Promise<void>;
  notify(message: string): void;
}

export class Phase5ProductRuntime {
  private local?: LocalVaultPort;
  private boundary?: ReturnType<typeof createObsidianGoogleDriveBoundary>;
  private state?: PersistentSynchronizationStateStore;
  private controller?: IntegratedProductController;
  private scheduler?: ProductSyncScheduler;
  private audit?: BoundedAuditHistory;
  private unsubscribeSurface?: () => void;
  private readonly notifications = new MeaningfulNotificationFilter();

  constructor(private readonly host: ProductRuntimeHost) {}
  productController(): IntegratedProductController | undefined { return this.controller; }
  googleBoundary(): ReturnType<typeof createObsidianGoogleDriveBoundary> | undefined { return this.boundary; }

  async initialize(): Promise<void> {
    await this.disposeProduct();
    let settings = this.host.settings();
    if (!settings.deviceIdentity) {
      const generated = generateDeviceIdentity();
      settings = { ...settings, deviceIdentity: String(generated) };
      await this.host.saveSettings(settings);
    }
    const current = this.host.settings();
    if (!current.oauthClientId || !current.oauthRedirectUri) return;

    this.boundary = createObsidianGoogleDriveBoundary({ oauth: { clientId: current.oauthClientId, redirectUri: current.oauthRedirectUri }, secretStorage: this.host.app.secretStorage, requestUrl });
    registerGoogleOAuthReturn(this.host.plugin, this.boundary.oauth, result => {
      this.host.notify(result.ok ? "Google authentication completed." : `Google authentication failed: ${result.reason}`);
    });
    if (!current.vaultIdentity || !current.remoteRootId) return;

    const rawLocal = await this.createLocalAdapter();
    const configurationDirectory = await rawLocal.activeConfigurationDirectory();
    const scope = new ProductPathScope(configurationDirectory, () => ({ userExclusionPatterns: this.host.settings().userExclusionPatterns }));
    const scopedLocal = new ScopedLocalVault(rawLocal, scope);
    this.local = new CanonicalEvidenceLocalVault(scopedLocal);

    const vaultIdentity = contractId<"VaultIdentity">(current.vaultIdentity) as VaultIdentity;
    const deviceIdentity = contractId<"DeviceIdentity">(current.deviceIdentity) as DeviceIdentity;
    const remoteRootId = contractId<"RemoteObjectId">(current.remoteRootId) as RemoteObjectId;
    const stateContext: StateLoadContext = {
      expectation: current.firstSyncCompleted || current.recoveryInProgress ? "existing-pairing" : "new-installation",
      expectedVaultIdentity: vaultIdentity,
      expectedDeviceIdentity: deviceIdentity,
    };
    this.state = new PersistentSynchronizationStateStore(new IndexedDbStateByteStorage(`brain-google-drive-sync:${current.vaultIdentity}:${current.deviceIdentity}`));
    const remoteIdentity = async (): Promise<ManagedRemoteIdentity> => ({ rootId: remoteRootId, vaultIdentity, protocolVersion: PROTOCOL_VERSION });
    const snapshots = new ProductSnapshotAssembler(this.local, this.boundary.drive, this.state, stateContext, remoteIdentity, path => scope.isManagedLogical(path));
    const textVersions = new ProductTextVersionStore(
      new IndexedDbTextVersionPersistence(`brain-google-drive-sync-text:${current.vaultIdentity}:${current.deviceIdentity}`),
      this.local,
      this.boundary.drive,
    );
    const conflicts = new ThreeWayConflictResolver(textVersions, textVersions, deviceIdentity);
    this.audit = new BoundedAuditHistory(this.host.data, current.auditRetention);

    let controller: IntegratedProductController;
    const executor = new ProductSynchronizationExecutor(this.local, this.boundary.drive, this.state, stateContext, () => controller.currentRunEvidence(), textVersions);
    controller = new IntegratedProductController({
      vaultIdentity,
      deviceIdentity,
      stateContext,
      stateStore: this.state,
      snapshotAssembler: snapshots,
      executor,
      conflictResolver: conflicts,
      plannerForTrigger: trigger => new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts, undefined, { trigger })),
      leasePort: new WebLocksRunLeasePort(),
      audit: this.audit,
      holderId: `phase5:${String(deviceIdentity)}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      automaticExecutionAllowed: plan => {
        const live = this.host.settings();
        if (!live.firstSyncCompleted || live.recoveryInProgress) return { allowed: false, reason: "Automatic synchronization remains disabled until trustworthy synchronization state is established." };
        return automaticNetworkDecision(plan, live, Platform.isMobile);
      },
      recoveryActive: () => this.host.settings().recoveryInProgress,
      onRecoveryGateChanged: async (active, backupId) => {
        const live = this.host.settings();
        const changed: BrainSyncSettings = {
          ...live,
          recoveryInProgress: active,
          recoveryBackupId: backupId ?? (active ? live.recoveryBackupId : ""),
          ...(active ? { startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false } : {}),
        };
        await this.host.saveSettings(changed);
        this.scheduler?.refresh();
      },
      onTrustedBaselineEstablished: async () => {
        const live = this.host.settings();
        if (!live.firstSyncCompleted) {
          await this.host.saveSettings({ ...live, firstSyncCompleted: true });
          this.scheduler?.refresh();
        }
      },
    });
    this.controller = controller;
    this.unsubscribeSurface = controller.onSurface(surface => {
      const message = this.notifications.next(surface);
      if (message) this.host.notify(message);
    });

    this.scheduler = new ProductSyncScheduler(this.local, controller, () => {
      const live = this.host.settings();
      const automaticReady = live.firstSyncCompleted && !live.recoveryInProgress;
      return {
        startupResumeEnabled: automaticReady && live.startupResumeEnabled,
        localChangeEnabled: automaticReady && live.localChangeEnabled,
        periodicEnabled: automaticReady && live.periodicEnabled,
        periodicIntervalMs: Math.max(60_000, live.periodicIntervalMinutes * 60_000),
        localDebounceMs: Math.max(250, live.localDebounceMs),
      };
    });
    this.scheduler.start();
  }

  async applySettingsChange(previous: BrainSyncSettings, next: BrainSyncSettings): Promise<void> {
    if (previous.auditRetention !== next.auditRetention) await this.audit?.setLimit(next.auditRetention);
    if (previous.periodicEnabled !== next.periodicEnabled || previous.periodicIntervalMinutes !== next.periodicIntervalMinutes || previous.firstSyncCompleted !== next.firstSyncCompleted || previous.recoveryInProgress !== next.recoveryInProgress) this.scheduler?.refresh();
    if (previous.userExclusionPatterns.join("\n") !== next.userExclusionPatterns.join("\n")) this.controller?.noteChangeDuringRun();
  }

  async exportDiagnosticStateText(): Promise<string> {
    if (!this.state) return JSON.stringify({ status: "unavailable", reason: "synchronization state is not initialized" });
    return new TextDecoder().decode(await this.state.exportDiagnosticState());
  }

  async authenticate(): Promise<void> {
    const boundary = this.boundary;
    if (!boundary) throw new Error("Configure OAuth client ID and redirect URI first.");
    await beginGoogleAuthorization(boundary.oauth, { openExternal: url => { const opened = globalThis.open(url, "_blank", "noopener,noreferrer"); if (!opened) throw new Error("The system browser could not be opened."); } });
  }

  async createManagedRemote(): Promise<ManagedRemoteIdentity> {
    const boundary = this.boundary;
    if (!boundary) throw new Error("Configure and authenticate Google OAuth first.");
    let settings = this.host.settings();
    let vaultIdentity = settings.vaultIdentity;
    if (!vaultIdentity) {
      vaultIdentity = `vault:${globalThis.crypto.randomUUID()}`;
      settings = { ...settings, vaultIdentity };
      await this.host.saveSettings(settings);
    }
    const result = await boundary.drive.createManagedRoot(contractId<"VaultIdentity">(vaultIdentity) as VaultIdentity, PROTOCOL_VERSION);
    if (!result.ok) throw new Error(driveSignalMessage(result.signal));
    await this.host.saveSettings({
      ...this.host.settings(), remoteRootId: String(result.value.rootId), vaultIdentity: String(result.value.vaultIdentity),
      firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "",
      startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false,
    });
    await this.initialize();
    return result.value;
  }

  async pairManagedRemote(): Promise<ManagedRemoteIdentity> {
    const boundary = this.boundary;
    const settings = this.host.settings();
    if (!boundary) throw new Error("Configure and authenticate Google OAuth first.");
    if (!settings.vaultIdentity || !settings.remoteRootId) throw new Error("Enter the expected BRAIN vault identity and stable Drive remote root ID.");
    const expected = contractId<"VaultIdentity">(settings.vaultIdentity) as VaultIdentity;
    const root = contractId<"RemoteObjectId">(settings.remoteRootId) as RemoteObjectId;
    const result = await boundary.drive.pairManagedRoot(root, expected);
    if (!result.ok) throw new Error(driveSignalMessage(result.signal));
    if (result.value.status !== "valid") throw new Error(`Pairing refused: ${result.value.status}`);
    await this.host.saveSettings({ ...settings, firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "", startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.initialize();
    return result.value.identity;
  }

  async deauthorize(): Promise<void> {
    this.boundary?.oauth.clearTokens();
    const settings = this.host.settings();
    await this.host.saveSettings({ ...settings, remoteRootId: "", firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "", startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.disposeProduct();
  }

  async disposeProduct(): Promise<void> {
    this.scheduler?.stop(); this.scheduler = undefined;
    this.unsubscribeSurface?.(); this.unsubscribeSurface = undefined;
    await this.controller?.request({ kind: "cancel-active-sync" }); this.controller = undefined;
    const disposable = this.local as (LocalVaultPort & { dispose?: () => void }) | undefined;
    disposable?.dispose?.(); this.local = undefined; this.boundary = undefined; this.state = undefined; this.audit = undefined;
  }

  private async createLocalAdapter(): Promise<LocalVaultPort> {
    if (Platform.isDesktopApp) {
      const module = await import("../local/desktop-local-vault");
      return module.createDesktopLocalVaultAdapter(this.host.app);
    }
    return new ObsidianLocalVaultAdapter(this.host.app);
  }
}

export function notifyWithNotice(message: string): void { new Notice(message); }
