import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { GOOGLE_OAUTH_CLIENT_SECRET_ID } from "../drive/auth";
import {
  DIAGNOSTIC_LOG_LEVELS,
  MAX_DIAGNOSTIC_RETENTION,
  MIN_DIAGNOSTIC_RETENTION,
  type DiagnosticLogLevel,
  type DiagnosticSummary,
} from "../diagnostics/diagnostic-logger";
import { canShareDiagnosticLogFile } from "../diagnostics/share-export";
import { defaultLocalExclusionRules } from "../local/exclusions";
import { SelectiveConfigurationPolicy } from "../local/config-policy";
import type { BrainSyncSettings } from "./plugin-data";
import { resolveSyncPlanErrorsPath, withManagedSyncPlanErrorsExclusion } from "./sync-plan-errors-path";

export interface Phase5SettingsHost {
  readonly app: App;
  readonly plugin: Plugin;
  settings(): BrainSyncSettings;
  updateSettings(patch: Partial<BrainSyncSettings>): Promise<void>;
  authenticationButtonPressed(): number;
  authenticate(attemptId: number): Promise<void>;
  createManagedRemote(): Promise<void>;
  pairManagedRemote(): Promise<void>;
  clearAuthenticationAndPairing(): Promise<void>;
  diagnosticsSummary(): DiagnosticSummary;
  copyDiagnosticLog(): Promise<void>;
  shareDiagnosticLog(): Promise<void>;
  clearDiagnosticLog(): Promise<void>;
  testExternalBrowser(): void;
  testDelayedExternalBrowser(): Promise<void>;
}

export class BrainSyncSettingsTab extends PluginSettingTab {
  constructor(private readonly host: Phase5SettingsHost) { super(host.app, host.plugin); }

  display(): void {
    const settings = this.host.settings();
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "BRAIN Google Drive Sync" });
    containerEl.createEl("p", { text: `Device identity: ${settings.deviceIdentity || "not established"}` });
    containerEl.createEl("p", { text: `Vault identity: ${settings.vaultIdentity || "not established"}` });
    containerEl.createEl("p", { text: `Managed remote: ${settings.remoteRootId || "not paired"}` });
    containerEl.createEl("p", { text: `First synchronization: ${settings.firstSyncCompleted ? "completed" : "preview/execute still required; automatic sync remains disabled"}` });
    if (settings.recoveryInProgress) containerEl.createEl("p", { text: `Recovery reconstruction is active. Automatic/destructive authority remains gated. Backup: ${settings.recoveryBackupId || "created when reconstruction executes"}` });

    new Setting(containerEl).setName("Google OAuth client ID").setDesc("Client ID from your own Google Cloud project.").addText(text => text.setValue(settings.oauthClientId).onChange(async value => this.host.updateSettings({ oauthClientId: value.trim() })));
    let pendingClientSecret = "";
    const clientSecretConfigured = Boolean(this.host.app.secretStorage.getSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID));
    new Setting(containerEl)
      .setName("Google OAuth client secret")
      .setDesc(clientSecretConfigured
        ? "Saved in this device's Obsidian SecretStorage. Enter a value only to replace it."
        : "Required by the configured Web application client. Saved only in this device's Obsidian SecretStorage.")
      .addText(text => {
        text.inputEl.type = "password";
        text.setPlaceholder(clientSecretConfigured ? "Saved locally" : "Enter client secret");
        text.onChange(value => { pendingClientSecret = value; });
      })
      .addButton(button => button.setButtonText("Save").onClick(() => {
        const secret = pendingClientSecret.trim();
        if (!secret) { new Notice("Enter a Google OAuth client secret before saving."); return; }
        this.host.app.secretStorage.setSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID, secret);
        pendingClientSecret = "";
        new Notice("Google OAuth client secret saved in this device's Obsidian SecretStorage.");
        this.display();
      }))
      .addExtraButton(button => button
        .setIcon("trash-2")
        .setTooltip("Clear saved Google OAuth client secret")
        .onClick(() => {
          this.host.app.secretStorage.setSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID, "");
          pendingClientSecret = "";
          new Notice("Saved Google OAuth client secret cleared from this device.");
          this.display();
        }));
    new Setting(containerEl).setName("OAuth redirect URI").setDesc("HTTPS callback URL or supported return URI configured in the same Google OAuth client.").addText(text => text.setValue(settings.oauthRedirectUri).onChange(async value => this.host.updateSettings({ oauthRedirectUri: value.trim() })));
    new Setting(containerEl)
      .setName("Authenticate / reauthenticate")
      .setDesc("Authorization opens outside the plugin and returns to this device.")
      .addButton(button => button.setButtonText("Authenticate").onClick(() => {
        const attemptId = this.host.authenticationButtonPressed();
        return this.host.authenticate(attemptId);
      }));
    new Setting(containerEl).setName("BRAIN vault identity").setDesc("Stable non-secret identity. Additional devices must deliberately confirm the same identity when pairing.").addText(text => text.setValue(settings.vaultIdentity).onChange(async value => this.host.updateSettings({ vaultIdentity: value.trim() })));
    new Setting(containerEl).setName("Managed remote root ID").setDesc("Stable Google Drive folder ID for explicit pairing. A folder name alone is never sufficient.").addText(text => text.setValue(settings.remoteRootId).onChange(async value => this.host.updateSettings({ remoteRootId: value.trim() })));
    new Setting(containerEl).setName("Create managed BRAIN Sync remote").addButton(button => button.setButtonText("Create").onClick(() => this.host.createManagedRemote()));
    new Setting(containerEl).setName("Validate and pair existing remote").addButton(button => button.setButtonText("Pair").onClick(() => this.host.pairManagedRemote()));
    new Setting(containerEl).setName("Deauthorize this device").setDesc("Clears authentication and local pairing only. It never deletes local or shared vault content.").addButton(button => button.setButtonText("Deauthorize").setWarning().onClick(() => this.host.clearAuthenticationAndPairing()));

    containerEl.createEl("h3", { text: "Automatic synchronization" });
    this.toggle(containerEl, "Startup / resume", "Run after vault readiness or app resume.", settings.startupResumeEnabled, value => ({ startupResumeEnabled: value }));
    this.toggle(containerEl, "Local changes", "Debounce local changes into a later synchronization pass.", settings.localChangeEnabled, value => ({ localChangeEnabled: value }));
    this.toggle(containerEl, "Periodic remote reconciliation", "Poll remote changes at a conservative cadence.", settings.periodicEnabled, value => ({ periodicEnabled: value }));
    new Setting(containerEl).setName("Periodic cadence (minutes)").addText(text => text.setValue(String(settings.periodicIntervalMinutes)).onChange(async value => {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 1) await this.host.updateSettings({ periodicIntervalMinutes: parsed });
    }));
    this.toggle(containerEl, "Wi-Fi only automatic sync on mobile", "If the mobile host cannot prove Wi-Fi, automatic work is deferred.", settings.wifiOnlyAutomatic, value => ({ wifiOnlyAutomatic: value }));
    this.toggle(containerEl, "Wi-Fi only large transfers on mobile", "Large automatic transfers defer unless Wi-Fi is provable.", settings.wifiOnlyLargeTransfers, value => ({ wifiOnlyLargeTransfers: value }));

    containerEl.createEl("h3", { text: "Vault exclusions" });
    const resolvedErrorsPath = resolveSyncPlanErrorsPath(settings.syncPlanErrorsDirectory);
    let pendingErrorsDirectory = settings.syncPlanErrorsDirectory;
    new Setting(containerEl)
      .setName("Sync plan errors directory")
      .setDesc("Optional safe vault-relative containing directory. Leave blank for the vault root; the filename is always sync-plan-errors.csv.")
      .addText(text => text
        .setPlaceholder("Vault root")
        .setValue(settings.syncPlanErrorsDirectory)
        .onChange(value => { pendingErrorsDirectory = value; }))
      .addButton(button => button.setButtonText("Apply").onClick(async () => {
          try {
            const updated = withManagedSyncPlanErrorsExclusion(this.host.settings(), pendingErrorsDirectory);
            await this.host.updateSettings({
              syncPlanErrorsDirectory: updated.syncPlanErrorsDirectory,
              managedSyncPlanErrorsExclusion: updated.managedSyncPlanErrorsExclusion,
              userExclusionPatterns: updated.userExclusionPatterns,
            });
            this.display();
          } catch (error) {
            new Notice(error instanceof Error ? error.message : String(error));
          }
        }));
    containerEl.createEl("p", { text: `Resolved sync plan errors file: ${resolvedErrorsPath.path}` });
    new Setting(containerEl)
      .setName("Additional exclusion patterns")
      .setDesc("One path/glob-like pattern per line. The exact sync-plan-errors.csv entry is managed automatically and cannot be removed.")
      .addTextArea(area => area.setValue(settings.userExclusionPatterns.join("\n")).onChange(async value => {
        const patterns = value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
        const updated = withManagedSyncPlanErrorsExclusion({ ...this.host.settings(), userExclusionPatterns: patterns });
        await this.host.updateSettings({
          userExclusionPatterns: updated.userExclusionPatterns,
          managedSyncPlanErrorsExclusion: updated.managedSyncPlanErrorsExclusion,
        });
      }));
    const exclusions = containerEl.createEl("ul");
    for (const rule of defaultLocalExclusionRules()) exclusions.createEl("li", { text: `${rule.pattern} — ${rule.description}` });

    containerEl.createEl("h3", { text: "Audit/history" });
    new Setting(containerEl).setName("Audit retention records").setDesc("Bounded device-local metadata history; 1–10,000 records. No note content or OAuth secrets are stored in audit records.").addText(text => text.setValue(String(settings.auditRetention)).onChange(async value => {
      const parsed = Number(value);
      if (Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 10000) await this.host.updateSettings({ auditRetention: parsed });
    }));

    containerEl.createEl("h3", { text: "Diagnostics / Logging" });
    new Setting(containerEl)
      .setName("Log detail level")
      .setDesc("Higher detail adds execution context and ordering, never secret disclosure.")
      .addDropdown(dropdown => {
        for (const level of DIAGNOSTIC_LOG_LEVELS) dropdown.addOption(level, level.charAt(0).toUpperCase() + level.slice(1));
        dropdown.setValue(settings.diagnosticLogLevel).onChange(async value => {
          await this.host.updateSettings({ diagnosticLogLevel: value as DiagnosticLogLevel });
        });
      });
    this.toggle(containerEl, "Console mirroring", "Mirror only the same already-sanitized retained records to the console.", settings.diagnosticConsoleMirror, value => ({ diagnosticConsoleMirror: value }));
    new Setting(containerEl)
      .setName("Maximum retained records")
      .setDesc(`Device-local bounded ring buffer; ${MIN_DIAGNOSTIC_RETENTION}–${MAX_DIAGNOSTIC_RETENTION} records.`)
      .addText(text => text.setValue(String(settings.diagnosticRetention)).onChange(async value => {
        const parsed = Number(value);
        if (Number.isSafeInteger(parsed) && parsed >= MIN_DIAGNOSTIC_RETENTION && parsed <= MAX_DIAGNOSTIC_RETENTION) {
          await this.host.updateSettings({ diagnosticRetention: parsed });
        }
      }));
    const summary = this.host.diagnosticsSummary();
    containerEl.createEl("p", { text: `Current retained records: ${summary.count}` });
    containerEl.createEl("p", { text: `Oldest retained record: ${summary.oldest ? `#${summary.oldest.sequence} (${summary.oldest.timestamp})` : "none"}` });
    containerEl.createEl("p", { text: `Newest retained record: ${summary.newest ? `#${summary.newest.sequence} (${summary.newest.timestamp})` : "none"}` });
    new Setting(containerEl).setName("Copy log to clipboard").setDesc("Copies the complete current bounded log as deterministic plaintext records.").addButton(button => button.setButtonText("Copy log").onClick(() => this.host.copyDiagnosticLog()));
    const shareSupported = canShareDiagnosticLogFile();
    new Setting(containerEl)
      .setName("Share / export log as .txt")
      .setDesc(shareSupported
        ? "Opens the system share sheet with a real text file. On iPhone, choose Save to Files to place the log in the Files app."
        : "File sharing is not exposed by this runtime. Clipboard export remains available above.")
      .addButton(button => button.setButtonText("Share .txt").setDisabled(!shareSupported).onClick(() => this.host.shareDiagnosticLog()));
    new Setting(containerEl).setName("Clear log").setDesc("Clears diagnostic records on this device only; audit, OAuth credentials, pairing, and sync state are unchanged.").addButton(button => button.setButtonText("Clear").setWarning().onClick(async () => {
      await this.host.clearDiagnosticLog();
      this.display();
    }));

    containerEl.createEl("h3", { text: "OAuth diagnostic probes" });
    new Setting(containerEl)
      .setName("Test external browser")
      .setDesc("Direct user-gesture probe. Opens a fixed harmless HTTPS page with the Obsidian _external target; no OAuth/runtime initialization occurs.")
      .addButton(button => button.setButtonText("Test external browser").onClick(() => this.host.testExternalBrowser()));
    new Setting(containerEl)
      .setName("Test delayed external browser")
      .setDesc("Same fixed page and _external target after one controlled Promise microtask boundary; no OAuth transaction occurs.")
      .addButton(button => button.setButtonText("Test delayed external browser").onClick(() => this.host.testDelayedExternalBrowser()));

    containerEl.createEl("h3", { text: "Portable configuration allowlist" });
    containerEl.createEl("p", { text: "Only the explicitly portable entries below are mapped through a private managed-remote namespace to the runtime active configuration directory; the configuration directory is never synchronized wholesale." });
    const portable = containerEl.createEl("ul");
    for (const entry of new SelectiveConfigurationPolicy().describePortablePolicy()) portable.createEl("li", { text: `${entry.relativePath} — ${entry.classification.classification}` });
    containerEl.createEl("p", { text: "Unknown configuration, third-party plugin settings, workspace/session state, secrets, device identity, synchronization operational state, and diagnostics remain device-local by default." });
  }

  private toggle(container: HTMLElement, name: string, description: string, value: boolean, patch: (value: boolean) => Partial<BrainSyncSettings>): void {
    new Setting(container).setName(name).setDesc(description).addToggle(toggle => toggle.setValue(value).onChange(async next => this.host.updateSettings(patch(next))));
  }
}
