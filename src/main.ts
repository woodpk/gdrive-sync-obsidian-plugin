import { Notice, Platform, Plugin } from "obsidian";
import { formatOAuthDiagnosticSuffix, type OAuthCallbackInput, type OAuthCompletion } from "./drive/auth";
import { openAuthorizationInExternalBrowser, registerGoogleOAuthReturn } from "./drive/oauth-return";
import { runDelayedExternalBrowserProbe, runDirectExternalBrowserProbe } from "./diagnostics/browser-probes";
import { DiagnosticLogger, normalizeDiagnosticError, type DiagnosticSummary } from "./diagnostics/diagnostic-logger";
import { copyDiagnosticLogText, shareDiagnosticLogText } from "./diagnostics/share-export";
import { PlanPreviewModal } from "./product/plan-modal";
import { AuditHistoryModal, SyncAttentionModal } from "./product/history-modal";
import { DEFAULT_SETTINGS, PluginDataRepository, type BrainSyncSettings } from "./product/plugin-data";
import { Phase5ProductRuntime } from "./product/runtime";
import { BrainSyncSettingsTab } from "./product/settings-tab";

export default class BrainGoogleDriveSyncPlugin extends Plugin {
  private currentSettings: BrainSyncSettings = { ...DEFAULT_SETTINGS };
  private dataRepository?: PluginDataRepository;
  private diagnostics?: DiagnosticLogger;
  private runtime?: Phase5ProductRuntime;
  private statusEl?: HTMLElement;
  private unsubscribeStatus?: () => void;
  private lastOAuthDiagnosticText = "No Google OAuth completion result is available for this plugin lifetime.";

  async onload(): Promise<void> {
    this.dataRepository = new PluginDataRepository({ loadData: () => this.loadData(), saveData: data => this.saveData(data) });
    this.currentSettings = await this.dataRepository.loadSettings();
    this.diagnostics = new DiagnosticLogger({
      persistence: this.dataRepository,
      level: this.currentSettings.diagnosticLogLevel,
      retentionLimit: this.currentSettings.diagnosticRetention,
      consoleMirror: this.currentSettings.diagnosticConsoleMirror,
      platform: Platform.isMobileApp ? "mobile" : Platform.isDesktopApp ? "desktop" : "unknown",
    });
    await this.diagnostics.initialize();
    this.statusEl = this.addStatusBarItem();
    this.statusEl.setText("BRAIN sync: setup required");

    this.runtime = new Phase5ProductRuntime({
      app: this.app,
      plugin: this,
      diagnostics: this.diagnostics,
      settings: () => this.currentSettings,
      data: this.dataRepository,
      saveSettings: settings => this.replaceSettings(settings),
      notify: message => new Notice(message),
    });
    registerGoogleOAuthReturn(
      this,
      input => this.completeGoogleAuthorizationWithDiagnostics(input),
      result => {
        this.lastOAuthDiagnosticText = result.ok
          ? "Google authentication completed."
          : `Google authentication failed: ${result.reason}${formatOAuthDiagnosticSuffix(result)}`;
        new Notice(this.lastOAuthDiagnosticText, result.ok ? 5_000 : 30_000);
      },
    );
    this.diagnostics.debug("oauth.callback", "callback-registration-active", { callbackRegistrationActive: true });

    this.addSettingTab(new BrainSyncSettingsTab({
      app: this.app,
      plugin: this,
      settings: () => this.currentSettings,
      updateSettings: patch => this.updateSettings(patch),
      authenticationButtonPressed: () => this.authenticationButtonPressed(),
      authenticate: attemptId => this.authenticate(attemptId),
      createManagedRemote: () => this.createManagedRemote(),
      pairManagedRemote: () => this.pairManagedRemote(),
      clearAuthenticationAndPairing: () => this.deauthorize(),
      diagnosticsSummary: () => this.diagnosticsSummary(),
      copyDiagnosticLog: () => this.copyDiagnosticLog(),
      shareDiagnosticLog: () => this.shareDiagnosticLog(),
      clearDiagnosticLog: () => this.clearDiagnosticLog(),
      testExternalBrowser: () => this.testExternalBrowser(),
      testDelayedExternalBrowser: () => this.testDelayedExternalBrowser(),
    }));

    this.addCommand({ id: "sync-now", name: "Sync now", callback: () => void this.openManualPreview() });
    this.addCommand({ id: "verify-reconcile-vault", name: "Verify/Reconcile Vault", callback: () => void this.openVerifyPreview() });
    this.addCommand({ id: "pause-sync", name: "Pause synchronization", callback: () => void this.control({ kind: "pause" }) });
    this.addCommand({ id: "resume-sync", name: "Resume synchronization", callback: () => void this.control({ kind: "resume" }) });
    this.addCommand({ id: "cancel-active-sync", name: "Cancel active synchronization", callback: () => void this.control({ kind: "cancel-active-sync" }) });
    this.addCommand({ id: "authenticate-google", name: "Authenticate with Google", callback: () => { const attemptId = this.beginAuthenticationAttempt("command"); void this.authenticate(attemptId); } });
    this.addCommand({ id: "copy-last-oauth-diagnostic", name: "Copy last Google authentication diagnostic", callback: () => void this.copyLastOAuthDiagnostic() });
    this.addCommand({ id: "open-sync-attention", name: "Open conflicts and recovery", callback: () => this.openAttention() });
    this.addCommand({ id: "open-sync-history", name: "Open synchronization history", callback: () => this.openHistory() });
    this.addCommand({ id: "copy-sync-diagnostics", name: "Copy synchronization diagnostics", callback: () => void this.copyDiagnostics() });
    this.addCommand({ id: "copy-device-diagnostic-log", name: "Copy device diagnostic log", callback: () => void this.copyDiagnosticLog() });

    try {
      await this.runtime.initialize();
      this.bindStatus();
      this.refreshStatus();
    } catch (error) {
      this.diagnostics.failure("runtime", "initialization-failed", error, {
        operation: "initialize",
        stage: "plugin-onload",
        classification: "runtime-initialization-failure",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: false,
      });
      const safe = normalizeDiagnosticError(error).safeMessage ?? "Initialization failed.";
      this.statusEl.setText("BRAIN sync: blocked");
      new Notice(`BRAIN sync initialization blocked: ${safe}`);
    }
  }

  async onunload(): Promise<void> {
    this.unsubscribeStatus?.(); this.unsubscribeStatus = undefined;
    await this.runtime?.disposeProduct();
    await this.diagnostics?.flush();
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
    this.diagnostics?.configure({
      level: this.currentSettings.diagnosticLogLevel,
      retentionLimit: this.currentSettings.diagnosticRetention,
      consoleMirror: this.currentSettings.diagnosticConsoleMirror,
    });
    await this.runtime?.applySettingsChange(previous, this.currentSettings);
  }

  private authenticationButtonPressed(): number {
    const attemptId = this.beginAuthenticationAttempt("settings-button");
    this.diagnostics?.trace("oauth.settings", "authenticate-click-handler-enter", { source: "settings-button" }, attemptId);
    return attemptId;
  }

  private beginAuthenticationAttempt(source: string): number {
    if (!this.diagnostics) return 1;
    return this.diagnostics.beginAttempt(source);
  }

  private async authenticate(attemptId: number): Promise<void> {
    const diagnostics = this.diagnostics;
    diagnostics?.activateAttempt(attemptId);
    diagnostics?.trace("oauth.plugin", "plugin-authenticate-enter", { stage: "plugin-authenticate" }, attemptId);
    diagnostics?.debug("oauth.plugin", "authentication-preconditions", {
      operation: "authenticate",
      clientIdConfigured: Boolean(this.currentSettings.oauthClientId),
      redirectUriConfigured: Boolean(this.currentSettings.oauthRedirectUri),
      clientSecretConfigured: Boolean(this.app.secretStorage.getSecret("brain-google-client-secret")),
      runtimeInitialized: Boolean(this.runtime),
      callbackRegistrationActive: true,
      browserApiPresent: typeof globalThis.open === "function",
      launcher: Platform.isMobileApp ? "external-browser" : "system-browser",
      target: Platform.isMobileApp ? "_external" : "_blank",
    }, attemptId);
    try {
      if (!this.runtime) throw new Error("The synchronization runtime is unavailable.");
      if (!this.currentSettings.oauthClientId || !this.currentSettings.oauthRedirectUri) throw new Error("Configure OAuth client ID and redirect URI first.");
      diagnostics?.trace("oauth.plugin", "runtime-initialize-start", { stage: "runtime-initialize" }, attemptId);
      await this.runtime.initialize();
      diagnostics?.trace("oauth.plugin", "runtime-initialize-complete", { stage: "runtime-initialize", runtimeInitialized: true }, attemptId);
      this.bindStatus();
      diagnostics?.trace("oauth.plugin", "runtime-authenticate-call-start", { stage: "runtime-authenticate" }, attemptId);
      await this.runtime.authenticate(Platform.isMobileApp ? { openExternal: openAuthorizationInExternalBrowser } : undefined);
      diagnostics?.trace("oauth.plugin", "runtime-authenticate-call-return", { stage: "runtime-authenticate", result: "authorization-launch-call-returned" }, attemptId);
      diagnostics?.info("oauth.plugin", "authentication-method-returned", { result: "authorization-launch-call-returned" }, attemptId);
      diagnostics?.trace("oauth.plugin", "plugin-authenticate-exit", { stage: "plugin-authenticate", result: "awaiting-callback" }, attemptId);
    } catch (error) {
      diagnostics?.failure("oauth.plugin", "authentication-attempt-failed", error, {
        operation: "authenticate",
        stage: "initiation",
        classification: "authentication-initiation-failure",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: Boolean(this.runtime),
      }, attemptId);
      const safe = normalizeDiagnosticError(error).safeMessage ?? "Authentication initiation failed.";
      new Notice(`Authentication could not start: ${safe}`);
      diagnostics?.endAttempt(attemptId);
    }
  }

  private async completeGoogleAuthorizationWithDiagnostics(input: OAuthCallbackInput): Promise<OAuthCompletion> {
    const diagnostics = this.diagnostics;
    const attemptId = diagnostics?.currentAttemptId();
    diagnostics?.info("oauth.callback", "callback-received", undefined, attemptId);
    diagnostics?.debug("oauth.callback", "callback-context", {
      operation: "complete-authorization",
      codePresent: Boolean(input.code),
      statePresent: Boolean(input.state),
      errorPresent: Boolean(input.error),
      callbackRegistrationActive: true,
      runtimeInitialized: Boolean(this.runtime),
    }, attemptId);
    diagnostics?.trace("oauth.callback", "callback-processing-start", { stage: "callback-processing" }, attemptId);
    const result = this.runtime
      ? await this.runtime.completeGoogleAuthorization(input)
      : { ok: false as const, reason: "missing-transaction" as const };
    if (result.ok) {
      diagnostics?.trace("oauth.callback", "callback-processing-complete", { stage: "callback-processing", result: "completed" }, attemptId);
      diagnostics?.info("oauth.callback", "authentication-attempt-completed", { result: "authenticated" }, attemptId);
    } else {
      diagnostics?.error("oauth.callback", "authentication-attempt-failed", {
        operation: "complete-authorization",
        stage: "callback-processing",
        classification: `oauth-${result.reason}`,
        reason: result.reason,
        safeMessage: result.detail ?? result.reason,
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: Boolean(this.runtime),
      }, attemptId);
    }
    if (attemptId !== undefined) diagnostics?.endAttempt(attemptId);
    return result;
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
  private diagnosticsSummary(): DiagnosticSummary { return this.diagnostics?.summary() ?? { count: 0 }; }
  private copyDiagnosticLog(): Promise<void> {
    if (!this.diagnostics) {
      new Notice("Diagnostic logger is unavailable.");
      return Promise.resolve();
    }
    try {
      const pending = copyDiagnosticLogText(this.diagnostics.renderText());
      return pending
        .then(async () => {
          await this.diagnostics?.flush();
          new Notice("Device diagnostic log copied. The export contains sanitized metadata only.");
        })
        .catch(error => { this.noticeError("Diagnostic log could not be copied", error); });
    } catch (error) {
      this.noticeError("Diagnostic log could not be copied", error);
      return Promise.resolve();
    }
  }
  private shareDiagnosticLog(): Promise<void> {
    if (!this.diagnostics) {
      new Notice("Diagnostic logger is unavailable.");
      return Promise.resolve();
    }
    try {
      const pending = shareDiagnosticLogText(this.diagnostics.renderText());
      return pending
        .then(() => { new Notice("Device diagnostic log handed to the system share sheet as a sanitized .txt file."); })
        .catch(error => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          this.noticeError("Diagnostic log could not be shared", error);
        });
    } catch (error) {
      this.noticeError("Diagnostic log could not be shared", error);
      return Promise.resolve();
    }
  }
  private async clearDiagnosticLog(): Promise<void> {
    if (!this.diagnostics) { new Notice("Diagnostic logger is unavailable."); return; }
    this.diagnostics.clear();
    await this.diagnostics.flush();
    new Notice("Device diagnostic log cleared. Synchronization history, credentials, pairing, and sync state were not changed.");
  }
  private testExternalBrowser(): void {
    if (!this.diagnostics) { new Notice("Diagnostic logger is unavailable."); return; }
    try {
      runDirectExternalBrowserProbe(this.diagnostics);
      new Notice("External-browser test call returned. This does not prove the browser became visible; inspect the physical result and copied log.");
    } catch (error) { this.noticeError("External-browser test failed", error); }
  }
  private async testDelayedExternalBrowser(): Promise<void> {
    if (!this.diagnostics) { new Notice("Diagnostic logger is unavailable."); return; }
    try {
      await runDelayedExternalBrowserProbe(this.diagnostics);
      new Notice("Delayed external-browser test call returned. This does not prove the browser became visible; inspect the physical result and copied log.");
    } catch (error) { this.noticeError("Delayed external-browser test failed", error); }
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
  private noticeError(prefix: string, error: unknown): void {
    const safe = normalizeDiagnosticError(error).safeMessage ?? "An error occurred.";
    new Notice(`${prefix}: ${safe}`);
  }
}
