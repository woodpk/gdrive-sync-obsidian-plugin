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
import { IntegratedProductController } from "./product-controller";
import { ProductSynchronizationExecutor } from "./production-executor";
import { ProductSnapshotAssembler } from "./snapshot-assembler";
import { ProductSyncScheduler } from "./scheduler";
import { WebLocksRunLeasePort } from "./web-lock-run-lease";
import { automaticNetworkDecision } from "./network-policy";
import type { BrainSyncSettings, PluginDataRepository } from "./plugin-data";
import { IndexedDbTextVersionPersistence, ProductTextVersionStore } from "./text-version-store";

const PROTOCOL_VERSION = contractId<"ProtocolVersion">("1") as ProtocolVersion;

function driveSignalMessage(signal: DriveSignal): string {
  if ("detail" in signal && signal.detail) return signal.detail;
  return signal.kind;
}

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
  private unsubscribeSurface?: () => void;

  constructor(private readonly host: ProductRuntimeHost) {}

  productController(): IntegratedProductController | undefined { return this.controller; }
  googleBoundary(): ReturnType<typeof createObsidianGoogleDriveBoundary> | undefined { return this.boundary; }

  async initialize(): Promise<void> {
    await this.disposeProduct();
    const settings = this.host.settings();
    if (!settings.deviceIdentity) {
      const generated = generateDeviceIdentity();
      await this.host.saveSettings({ ...settings, deviceIdentity: String(generated) });
    }
    const current = this.host.settings();
    if (!current.oauthClientId || !current.oauthRedirectUri) return;

    this.boundary = createObsidianGoogleDriveBoundary({ oauth: { clientId: current.oauthClientId, redirectUri: current.oauthRedirectUri }, secretStorage: this.host.app.secretStorage, requestUrl });
    registerGoogleOAuthReturn(this.host.plugin, this.boundary.oauth, result => {
      this.host.notify(result.ok ? "Google authentication completed." : `Google authentication failed: ${result.reason}`);
    });

    if (!current.vaultIdentity || !current.remoteRootId) return;
    this.local = await this.createLocalAdapter();
    const vaultIdentity = contractId<"VaultIdentity">(current.vaultIdentity) as VaultIdentity;
    const deviceIdentity = contractId<"DeviceIdentity">(current.deviceIdentity) as DeviceIdentity;
    const remoteRootId = contractId<"RemoteObjectId">(current.remoteRootId) as RemoteObjectId;
    const stateContext: StateLoadContext = { expectation: current.firstSyncCompleted ? "existing-pairing" : "new-installation", expectedVaultIdentity: vaultIdentity, expectedDeviceIdentity: deviceIdentity };
    this.state = new PersistentSynchronizationStateStore(new IndexedDbStateByteStorage(`brain-google-drive-sync:${current.vaultIdentity}:${current.deviceIdentity}`));
    const remoteIdentity = async (): Promise<ManagedRemoteIdentity> => ({ rootId: remoteRootId, vaultIdentity, protocolVersion: PROTOCOL_VERSION });
    const snapshots = new ProductSnapshotAssembler(this.local, this.boundary.drive, this.state, stateContext, remoteIdentity);
    const textVersions = new ProductTextVersionStore(
      new IndexedDbTextVersionPersistence(`brain-google-drive-sync-text:${current.vaultIdentity}:${current.deviceIdentity}`),
      this.local,
      this.boundary.drive,
    );
    const conflicts = new ThreeWayConflictResolver(textVersions, textVersions, deviceIdentity);

    let controller: IntegratedProductController;
    const executor = new ProductSynchronizationExecutor(this.local, this.boundary.drive, this.state, stateContext, () => controller.currentRunEvidence(), textVersions);
    const audit = new BoundedAuditHistory(this.host.data, current.auditRetention);
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
      audit,
      holderId: `phase5:${String(deviceIdentity)}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      automaticExecutionAllowed: plan => {
        if (!this.host.settings().firstSyncCompleted) return { allowed: false, reason: "Automatic synchronization remains disabled until first synchronization establishes trustworthy state." };
        return automaticNetworkDecision(plan, this.host.settings(), Platform.isMobile);
      },
      onTrustedBaselineEstablished: async () => {
        const settingsNow = this.host.settings();
        if (!settingsNow.firstSyncCompleted) await this.host.saveSettings({ ...settingsNow, firstSyncCompleted: true });
      },
    });
    this.controller = controller;
    this.unsubscribeSurface = controller.onSurface(surface => {
      if (surface.status.kind === "conflict-present") this.host.notify(`BRAIN sync has ${surface.status.conflictCount} conflict(s) requiring attention.`);
      else if (surface.status.kind === "destructive-plan-blocked") this.host.notify("BRAIN sync blocked a destructive plan for review.");
      else if (surface.status.kind === "authentication-required") this.host.notify("BRAIN sync requires Google authentication.");
      else if (surface.status.kind === "recovery-required") this.host.notify(`BRAIN sync requires recovery: ${surface.status.reason}`);
      else if (surface.status.kind === "error") this.host.notify(`BRAIN sync error: ${surface.status.message}`);
    });

    this.scheduler = new ProductSyncScheduler(this.local, controller, () => {
      const s = this.host.settings();
      return {
        startupResumeEnabled: s.firstSyncCompleted && s.startupResumeEnabled,
        localChangeEnabled: s.firstSyncCompleted && s.localChangeEnabled,
        periodicEnabled: s.firstSyncCompleted && s.periodicEnabled,
        periodicIntervalMs: Math.max(60_000, s.periodicIntervalMinutes * 60_000),
        localDebounceMs: Math.max(250, s.localDebounceMs),
      };
    });
    this.scheduler.start();
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
    if (!vaultIdentity) { vaultIdentity = `vault:${globalThis.crypto.randomUUID()}`; settings = { ...settings, vaultIdentity }; await this.host.saveSettings(settings); }
    const result = await boundary.drive.createManagedRoot(contractId<"VaultIdentity">(vaultIdentity) as VaultIdentity, PROTOCOL_VERSION);
    if (!result.ok) throw new Error(driveSignalMessage(result.signal));
    await this.host.saveSettings({ ...this.host.settings(), remoteRootId: String(result.value.rootId), vaultIdentity: String(result.value.vaultIdentity), firstSyncCompleted: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
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
    await this.host.saveSettings({ ...settings, firstSyncCompleted: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.initialize();
    return result.value.identity;
  }

  async deauthorize(): Promise<void> {
    this.boundary?.oauth.clearTokens();
    const s = this.host.settings();
    await this.host.saveSettings({ ...s, remoteRootId: "", firstSyncCompleted: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.disposeProduct();
  }

  async disposeProduct(): Promise<void> {
    this.scheduler?.stop(); this.scheduler = undefined;
    this.unsubscribeSurface?.(); this.unsubscribeSurface = undefined;
    await this.controller?.request({ kind: "cancel-active-sync" }); this.controller = undefined;
    const disposable = this.local as (LocalVaultPort & { dispose?: () => void }) | undefined;
    disposable?.dispose?.(); this.local = undefined; this.boundary = undefined; this.state = undefined;
  }

  private async createLocalAdapter(): Promise<LocalVaultPort> {
    if (Platform.isDesktopApp) { const module = await import("../local/desktop-local-vault"); return module.createDesktopLocalVaultAdapter(this.host.app); }
    return new ObsidianLocalVaultAdapter(this.host.app);
  }
}

export function notifyWithNotice(message: string): void { new Notice(message); }
