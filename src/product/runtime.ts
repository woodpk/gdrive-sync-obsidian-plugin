import { Notice, Platform, requestUrl, type App, type Plugin } from "obsidian";
import type { DeviceIdentity, DriveSignal, LocalVaultPort, ManagedRemoteIdentity, ProtocolVersion, RemoteObjectId, StateLoadContext, VaultIdentity } from "../contracts";
import { contractId } from "../contracts";
import { DeterministicSynchronizationPlanner } from "../core/planner";
import { ProductionSynchronizationPlanner } from "../core/production-planner";
import { ThreeWayConflictResolver } from "../core/conflict-resolver";
import type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";
import { instrumentAuthorizationBrowserLauncher } from "../diagnostics/oauth-diagnostics";
import { GOOGLE_OAUTH_CLIENT_SECRET_ID, type OAuthCallbackInput, type OAuthCompletion } from "../drive/auth";
import { createObsidianGoogleDriveBoundary } from "../drive/runtime";
import { beginGoogleAuthorization, openAuthorizationInSystemBrowser, type AuthorizationBrowserLauncher } from "../drive/oauth-return";
import { ObsidianLocalVaultAdapter } from "../local/obsidian-local-vault";
import { MobileVaultAccessBoundary } from "../local/mobile-vault-access-boundary";
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
import { SyncAttentionLedger, type SyncAttentionRecord } from "./sync-attention-ledger";

const PROTOCOL_VERSION = contractId<"ProtocolVersion">("1") as ProtocolVersion;
const NOOP_DIAGNOSTICS = {
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  error: () => undefined,
  failure: () => undefined,
} as unknown as DiagnosticLogger;
function driveSignalMessage(signal: DriveSignal): string { return "detail" in signal && signal.detail ? signal.detail : signal.kind; }
function exclusionsEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export interface ProductRuntimeHost {
  readonly app: App;
  readonly plugin: Plugin;
  readonly diagnostics?: DiagnosticLogger;
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
  private attention?: SyncAttentionLedger;
  private unsubscribeSurface?: () => void;
  private readonly notifications = new MeaningfulNotificationFilter();

  constructor(private readonly host: ProductRuntimeHost) {}
  productController(): IntegratedProductController | undefined { return this.controller; }
  googleBoundary(): ReturnType<typeof createObsidianGoogleDriveBoundary> | undefined { return this.boundary; }

  async initialize(): Promise<void> {
    const diagnostics = this.host.diagnostics ?? NOOP_DIAGNOSTICS;
    diagnostics.trace("runtime", "initialize-enter", { stage: "runtime-initialize" });
    let settings = this.host.settings();
    diagnostics.debug("runtime", "initialize-context", {
      operation: "initialize",
      clientIdConfigured: Boolean(settings.oauthClientId),
      redirectUriConfigured: Boolean(settings.oauthRedirectUri),
      clientSecretConfigured: Boolean(this.host.app.secretStorage.getSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID)),
      deviceIdentityPresent: Boolean(settings.deviceIdentity),
      vaultIdentityPresent: Boolean(settings.vaultIdentity),
      remoteRootPresent: Boolean(settings.remoteRootId),
    });
    await this.disposeProduct();
    diagnostics.trace("runtime", "initialize-dispose-complete", { stage: "dispose-previous-runtime" });
    if (!settings.deviceIdentity) {
      diagnostics.trace("runtime", "device-identity-generation-start", { stage: "device-identity" });
      const generated = generateDeviceIdentity();
      settings = { ...settings, deviceIdentity: String(generated) };
      await this.host.saveSettings(settings);
      diagnostics.trace("runtime", "device-identity-generation-complete", { stage: "device-identity", deviceIdentityPresent: true });
    } else {
      diagnostics.trace("runtime", "device-identity-ready", { stage: "device-identity", deviceIdentityPresent: true });
    }
    const current = this.host.settings();
    if (!current.oauthClientId || !current.oauthRedirectUri) {
      diagnostics.debug("runtime", "initialize-deferred", { reason: "oauth-configuration-incomplete", runtimeInitialized: false });
      diagnostics.trace("runtime", "initialize-exit", { result: "oauth-configuration-incomplete" });
      return;
    }

    diagnostics.trace("runtime", "oauth-boundary-create-enter", { stage: "oauth-boundary" });
    this.boundary = createObsidianGoogleDriveBoundary({
      oauth: {
        clientId: current.oauthClientId,
        redirectUri: current.oauthRedirectUri,
        clientSecretStorageKey: GOOGLE_OAUTH_CLIENT_SECRET_ID,
      },
      secretStorage: this.host.app.secretStorage,
      requestUrl,
    });
    this.boundary.oauth.setDiagnosticLogger(this.host.diagnostics);
    diagnostics.trace("runtime", "oauth-boundary-create-exit", { stage: "oauth-boundary", runtimeInitialized: true });
    if (!current.vaultIdentity || !current.remoteRootId) {
      diagnostics.info("runtime", "runtime-initialized", { result: "oauth-ready" });
      diagnostics.trace("runtime", "initialize-exit", { result: "oauth-ready" });
      return;
    }

    diagnostics.trace("runtime", "local-adapter-create-enter", { stage: "local-adapter" });
    const rawLocal = await this.createLocalAdapter();
    diagnostics.trace("runtime", "local-adapter-create-exit", { stage: "local-adapter", result: Platform.isDesktopApp ? "desktop-adapter" : "mobile-adapter" });
    const configurationDirectory = await rawLocal.activeConfigurationDirectory();
    diagnostics.trace("runtime", "configuration-directory-ready", { stage: "path-scope" });
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
    diagnostics.trace("runtime", "state-store-ready", { stage: "state-store", storeReady: true });
    const remoteIdentity = async (): Promise<ManagedRemoteIdentity> => ({ rootId: remoteRootId, vaultIdentity, protocolVersion: PROTOCOL_VERSION });
    const snapshots = new ProductSnapshotAssembler(
      this.local,
      this.boundary.drive,
      this.state,
      stateContext,
      remoteIdentity,
      path => scope.isManagedLogical(path),
      () => this.host.settings().scopeReconcileRequired,
      this.host.diagnostics,
    );
    const textVersions = new ProductTextVersionStore(
      new IndexedDbTextVersionPersistence(`brain-google-drive-sync-text:${current.vaultIdentity}:${current.deviceIdentity}`),
      this.local,
      this.boundary.drive,
    );
    const conflicts = new ThreeWayConflictResolver(textVersions, textVersions, deviceIdentity);
    this.audit = new BoundedAuditHistory(this.host.data, current.auditRetention);
    this.attention = new SyncAttentionLedger(this.host.data);
    diagnostics.trace("runtime", "audit-store-ready", { stage: "audit-store", storeReady: true });

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
      onFullReconciliationCompleted: async () => {
        const live = this.host.settings();
        if (live.scopeReconcileRequired) await this.host.saveSettings({ ...live, scopeReconcileRequired: false });
      },
      onTrustedBaselineEstablished: async () => {
        const live = this.host.settings();
        if (!live.firstSyncCompleted) {
          await this.host.saveSettings({ ...live, firstSyncCompleted: true });
          this.scheduler?.refresh();
        }
      },
      diagnostics: this.host.diagnostics,
      attentionLedger: this.attention,
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
    diagnostics.trace("runtime", "scheduler-started", { stage: "scheduler" });
    diagnostics.info("runtime", "runtime-initialized", { result: "product-ready" });
    diagnostics.trace("runtime", "initialize-exit", { result: "product-ready" });
  }

  async applySettingsChange(previous: BrainSyncSettings, next: BrainSyncSettings): Promise<void> {
    if (previous.auditRetention !== next.auditRetention) await this.audit?.setLimit(next.auditRetention);
    if (previous.periodicEnabled !== next.periodicEnabled || previous.periodicIntervalMinutes !== next.periodicIntervalMinutes || previous.firstSyncCompleted !== next.firstSyncCompleted || previous.recoveryInProgress !== next.recoveryInProgress) this.scheduler?.refresh();
    if (!exclusionsEqual(previous.userExclusionPatterns, next.userExclusionPatterns)) {
      if (!next.scopeReconcileRequired) await this.host.saveSettings({ ...this.host.settings(), scopeReconcileRequired: true });
      this.controller?.noteChangeDuringRun();
    }
  }

  async exportDiagnosticStateText(): Promise<string> {
    if (!this.state) return JSON.stringify({ status: "unavailable", reason: "synchronization state is not initialized" });
    return new TextDecoder().decode(await this.state.exportDiagnosticState());
  }

  async readSyncAttention(): Promise<readonly SyncAttentionRecord[]> { return this.attention?.current() ?? []; }
  async exportSyncAttentionCsv(): Promise<string> {
    if (!this.attention) throw new Error("synchronization attention ledger is unavailable");
    return this.attention.renderCsv();
  }

  async completeGoogleAuthorization(input: OAuthCallbackInput): Promise<OAuthCompletion> {
    const diagnostics = this.host.diagnostics ?? NOOP_DIAGNOSTICS;
    diagnostics.trace("oauth.callback", "runtime-callback-enter", { stage: "callback-processing" });
    const oauth = this.boundary?.oauth;
    if (!oauth) {
      diagnostics.error("oauth.callback", "runtime-callback-unavailable", {
        operation: "complete-authorization",
        stage: "callback-processing",
        classification: "missing-oauth-runtime",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: false,
      });
      return { ok: false, reason: "missing-transaction" };
    }
    const result = await oauth.completeAuthorization(input);
    diagnostics.trace("oauth.callback", "runtime-callback-exit", { stage: "callback-processing", result: result.ok ? "completed" : result.reason });
    return result;
  }

  async authenticate(browser: AuthorizationBrowserLauncher = { openExternal: openAuthorizationInSystemBrowser }): Promise<void> {
    const diagnostics = this.host.diagnostics ?? NOOP_DIAGNOSTICS;
    diagnostics.trace("oauth.runtime", "runtime-authenticate-enter", { stage: "runtime-authenticate" });
    const boundary = this.boundary;
    if (!boundary) {
      const error = new Error("Configure OAuth client ID and redirect URI first.");
      diagnostics.failure("oauth.runtime", "runtime-authenticate-failed", error, {
        operation: "authenticate",
        stage: "precondition",
        classification: "oauth-runtime-unavailable",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: false,
      });
      throw error;
    }
    const mobile = Platform.isMobileApp;
    diagnostics.debug("oauth.runtime", "authentication-context", {
      operation: "authenticate",
      runtimeInitialized: true,
      clientIdConfigured: Boolean(boundary.oauth.config.clientId),
      redirectUriConfigured: Boolean(boundary.oauth.config.redirectUri),
      clientSecretConfigured: Boolean(this.host.app.secretStorage.getSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID)),
      callbackRegistrationActive: true,
      browserApiPresent: typeof globalThis.open === "function",
      launcher: mobile ? "external-browser" : "system-browser",
      target: mobile ? "_external" : "_blank",
      transactionPrepared: false,
      scopeExact: true,
    });
    const instrumentedBrowser = instrumentAuthorizationBrowserLauncher(diagnostics, browser, {
      target: mobile ? "_external" : "_blank",
      launcher: mobile ? "external-browser" : "system-browser",
      browserApiPresent: typeof globalThis.open === "function",
    });
    await beginGoogleAuthorization(boundary.oauth, instrumentedBrowser);
    diagnostics.trace("oauth.runtime", "runtime-authenticate-exit", { stage: "runtime-authenticate", result: "authorization-launch-call-returned" });
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
      firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "", scopeReconcileRequired: false,
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
    await this.host.saveSettings({ ...settings, firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "", scopeReconcileRequired: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.initialize();
    return result.value.identity;
  }

  async deauthorize(): Promise<void> {
    this.boundary?.oauth.clearTokens();
    const settings = this.host.settings();
    await this.host.saveSettings({ ...settings, remoteRootId: "", firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "", scopeReconcileRequired: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.disposeProduct();
  }

  async disposeProduct(): Promise<void> {
    this.scheduler?.stop(); this.scheduler = undefined;
    this.unsubscribeSurface?.(); this.unsubscribeSurface = undefined;
    await this.controller?.request({ kind: "cancel-active-sync" }); this.controller = undefined;
    const disposable = this.local as (LocalVaultPort & { dispose?: () => void }) | undefined;
    disposable?.dispose?.(); this.local = undefined; this.boundary = undefined; this.state = undefined; this.audit = undefined; this.attention = undefined;
  }

  private async createLocalAdapter(): Promise<LocalVaultPort> {
    if (Platform.isDesktopApp) {
      const module = await import("../local/desktop-local-vault");
      return module.createDesktopLocalVaultAdapter(this.host.app);
    }
    this.host.diagnostics?.info("runtime", "mobile-vault-boundary-selected", { result: "mobile-adapter" });
    return new ObsidianLocalVaultAdapter(this.host.app, {
      accessBoundary: new MobileVaultAccessBoundary(),
      adapterMutationFallback: true,
    });
  }
}

export function notifyWithNotice(message: string): void { new Notice(message); }
