import { Notice, Platform, Plugin } from "obsidian";
import { formatOAuthDiagnosticSuffix } from "./drive/auth";
import { registerGoogleOAuthReturn, reserveAuthorizationInSystemBrowser, type AuthorizationBrowserLauncher } from "./drive/oauth-return";
import { PlanPreviewModal } from "./product/plan-modal";
import { AuditHistoryModal, SyncAttentionModal } from "./product/history-modal";
import { DEFAULT_SETTINGS, PluginDataRepository, type BrainSyncSettings } from "./product/plugin-data";
import { Phase5ProductRuntime } from "./product/runtime";
import { BrainSyncSettingsTab } from "./product/settings-tab";

export default class BrainGoogleDriveSyncPlugin extends Plugin {
  private currentSettings: BrainSyncSettings = { ...DEFAULT_SETTINGS };
  private dataRepository?: PluginDataRepository;
  private runtime?: Phase5ProductRuntime;
  private statusEl?: HTMLElement;
  private unsubscribeStatus?: () => void;
  private lastOAuthDiagnosticText = "No Google OAuth completion result is available for this plugin lifetime.";

  async onload(): Promise<void> {
    this.dataRepository = new PluginDataRepository({ loadData: () => this.loadData(), saveData: data => this.saveData(data) });
    this.currentSettings = await this.dataRepository.loadSettings();
    this.statusEl = this.addStatusBarItem();
    this.statusEl.setText("BRAIN sync: setup required");

    this.runtime = new Phase5ProductRuntime({
      app: this.app,
      plugin: this,
      settings: () => this.currentSettings,
      data: this.dataRepository,
      saveSettings: settings => this.replaceSettings(settings),
      notify: message => new Notice(message),
    });
    registerGoogleOAuthReturn(
      this,
      async input => this.runtime
        ? this.runtime.completeGoogleAuthorization(input)
        : { ok: false as const, reason: "missing-transaction" as const },
      result => {
        this.lastOAuthDiagnosticText = result.ok
          ? "Google authentication completed."
          : `Google authentication failed: ${result.reason}${formatOAuthDiagnosticSuffix(result)}`;
        new Notice(this.lastOAuthDiagnosticText, result.ok ? 5_000 : 30_000);
      },
    );

    this.addSettingTab(new BrainSyncSettingsTab({
      app: this.app,
      plugin: this,
      settings: () => this.currentSettings,
      updateSettings: patch => this.updateSettings(patch),
      authenticate: () => this.authenticate(),
      createManagedRemote: () => this.createManagedRemote(),
      pairManagedRemote: () => this.pairManagedRemote(),
      clearAuthenticationAndPairing: () => this.deauthorize(),
    }));

    this.addCommand({ id: "sync-now", name: "Sync now", callback: () => void this.openManualPreview() });
    this.addCommand({ id: "verify-reconcile-vault", name: "Verify/Reconcile Vault", callback: () => void this.openVerifyPreview() });
    this.addCommand({ id: "pause-sync", name: "Pause synchronization", callback: () => void this.control({ kind: "pause" }) });
    this.addCommand({ id: "resume-sync", name: "Resume synchronization", callback: () => void this.control({ kind: "resume" }) });
    this.addCommand({ id: "cancel-active-sync", name: "Cancel active synchronization", callback: () => void this.control({ kind: "cancel-active-sync" }) });
    this.addCommand({ id: "authenticate-google", name: "Authenticate with Google", callback: () => void this.authenticate() });
    this.addCommand({ id: "copy-last-oauth-diagnostic", name: "Copy last Google authentication diagnostic", callback: () => void this.copyLastOAuthDiagnostic() });
    this.addCommand({ id: "open-sync-attention", name: "Open conflicts and recovery", callback: () => this.openAttention() });
    this.addCommand({ id: "open-sync-history", name: "Open synchronization history", callback: () => this.openHistory() });
    this.addCommand({ id: "copy-sync-diagnostics", name: "Copy synchronization diagnostics", callback: () => void this.copyDiagnostics() });

    try { await this.runtime.initialize(); this.bindStatus(); this.refreshStatus(); }
    catch (error) { const message = error instanceof Error ? error.message : String(error); this.statusEl.setText("BRAIN sync: blocked"); new Notice(`BRAIN sync initialization blocked: ${message}`); }
  }

  async onunload(): Promise<void> {
    this.unsubscribeStatus?.(); this.unsubscribeStatus = undefined;
    await this.runtime?.disposeProduct();
  }

  private async replaceSettings(settings: BrainSyncSettings): Promise<void> {
    this.currentSettings = { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
    await this.dataRepository?.saveSettings(this.currentSettings);
  }

  private async updateSettings(patch: Partial<BrainSyncSettings>): Promise<void> {
    const previous = { ...this.currentSettings, userExclusionPatterns: [...this.currentSettings.userExclusionPatterns] };
    const next = { ...this.currentSettings, ...patch };
    if (!next.firstSyncCompleted || next.recoveryInProgress) {
      next.startupResumeEnabled = false;
      next.localChangeEnabled = false;
      next.periodicEnabled = false;
    }
    await this.replaceSettings(next);
    await this.runtime?.applySettingsChange(previous, this.currentSettings);
  }

  private async authenticate(): Promise<void> {
    let mobileBrowser: AuthorizationBrowserLauncher | undefined;
    try {
      if (!this.runtime) throw new Error("The synchronization runtime is unavailable.");
      if (!this.currentSettings.oauthClientId || !this.currentSettings.oauthRedirectUri) throw new Error("Configure OAuth client ID and redirect URI first.");
      mobileBrowser = Platform.isMobileApp ? reserveAuthorizationInSystemBrowser() : undefined;
      await this.runtime?.initialize();
      this.bindStatus();
      await this.runtime?.authenticate(mobileBrowser);
    } catch (error) {
      mobileBrowser?.cancel?.();
      this.noticeError("Authentication could not start", error);
    }
  }
  private async createManagedRemote(): Promise<void> {
    try { if (!this.runtime) return; const identity = await this.runtime.createManagedRemote(); this.bindStatus(); new Notice(`Created managed BRAIN Sync remote ${String(identity.rootId)}.`); }
    catch (error) { this.noticeError("Managed remote creation failed", error); }
  }
  private async pairManagedRemote(): Promise<void> {
    try { if (!this.runtime) return; const identity = await this.runtime.pairManagedRemote(); this.bindStatus(); new Notice(`Validated BRAIN Sync pairing for ${String(identity.vaultIdentity)}.`); }
    catch (error) { this.noticeError("Managed remote pairing failed", error); }
  }
  private async deauthorize(): Promise<void> {
    try { await this.runtime?.deauthorize(); this.bindStatus(); this.refreshStatus(); new Notice("This device was deauthorized and unpaired locally. No local or shared vault content was deleted."); }
    catch (error) { this.noticeError("Device deauthorization failed", error); }
  }

  private async openManualPreview(): Promise<void> {
    const controller = this.runtime?.productController();
    if (!controller) { new Notice("Complete Google authentication and explicit BRAIN remote pairing first."); return; }
    const plan = await controller.previewManual();
    if (plan) new PlanPreviewModal(this.app, plan, controller).open();
  }
  private async openVerifyPreview(): Promise<void> {
    const controller = this.runtime?.productController();
    if (!controller) { new Notice("Complete Google authentication and explicit BRAIN remote pairing first."); return; }
    const plan = await controller.previewVerifyReconcile();
    if (plan) new PlanPreviewModal(this.app, plan, controller).open();
  }
  private async control(action: { readonly kind: "pause" | "resume" | "cancel-active-sync" }): Promise<void> {
    const controller = this.runtime?.productController();
    if (!controller) { new Notice("BRAIN synchronization is not currently configured."); return; }
    await controller.request(action);
  }
  private openAttention(): void {
    const controller = this.runtime?.productController();
    if (!controller) { new Notice("BRAIN synchronization is not currently configured."); return; }
    new SyncAttentionModal(this.app, controller, {
      recoveryBackupId: this.currentSettings.recoveryBackupId,
      copyDiagnostics: () => this.copyDiagnostics(),
    }).open();
  }
  private openHistory(): void {
    const controller = this.runtime?.productController();
    if (!controller) { new Notice("BRAIN synchronization is not currently configured."); return; }
    new AuditHistoryModal(this.app, () => controller.readAuditHistory()).open();
  }
  private async copyDiagnostics(): Promise<void> {
    try {
      const text = await this.runtime?.exportDiagnosticStateText();
      if (!text) throw new Error("synchronization runtime is unavailable");
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error("clipboard API is unavailable on this device");
      await globalThis.navigator.clipboard.writeText(text);
      new Notice("BRAIN synchronization diagnostic state copied. It contains metadata only, not OAuth secrets or vault content.");
    } catch (error) { this.noticeError("Diagnostics could not be copied", error); }
  }
  private async copyLastOAuthDiagnostic(): Promise<void> {
    try {
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error("clipboard API is unavailable on this device");
      await globalThis.navigator.clipboard.writeText(this.lastOAuthDiagnosticText);
      new Notice("Last Google authentication diagnostic copied. It contains sanitized metadata only.");
    } catch (error) { this.noticeError("Google authentication diagnostic could not be copied", error); }
  }

  private bindStatus(): void {
    this.unsubscribeStatus?.();
    const controller = this.runtime?.productController();
    if (!controller) { this.unsubscribeStatus = undefined; this.refreshStatus(); return; }
    this.unsubscribeStatus = controller.onSurface(surface => { this.statusEl?.setText(`BRAIN sync: ${surface.status.kind}`); });
    this.refreshStatus();
  }
  private refreshStatus(): void {
    const status = this.runtime?.productController()?.currentSurface().status.kind;
    this.statusEl?.setText(`BRAIN sync: ${status ?? (this.currentSettings.remoteRootId ? "integration blocked" : "setup required")}`);
  }
  private noticeError(prefix: string, error: unknown): void { new Notice(`${prefix}: ${error instanceof Error ? error.message : String(error)}`); }
}
