import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { defaultLocalExclusionRules } from "../local/exclusions";
import { SelectiveConfigurationPolicy } from "../local/config-policy";
import type { BrainSyncSettings } from "./plugin-data";

export interface Phase5SettingsHost {
  readonly app: App;
  readonly plugin: Plugin;
  settings(): BrainSyncSettings;
  updateSettings(patch: Partial<BrainSyncSettings>): Promise<void>;
  authenticate(): Promise<void>;
  createManagedRemote(): Promise<void>;
  pairManagedRemote(): Promise<void>;
  clearAuthenticationAndPairing(): Promise<void>;
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

    new Setting(containerEl).setName("Google OAuth client ID").setDesc("Client ID from your own Google Cloud project.").addText(text => text
      .setValue(settings.oauthClientId)
      .onChange(async value => this.host.updateSettings({ oauthClientId: value.trim() })));
    new Setting(containerEl).setName("OAuth redirect URI").setDesc("HTTPS callback URL or supported return URI configured in the same Google OAuth client.").addText(text => text
      .setValue(settings.oauthRedirectUri)
      .onChange(async value => this.host.updateSettings({ oauthRedirectUri: value.trim() })));
    new Setting(containerEl).setName("Authenticate / reauthenticate").setDesc("Authorization opens outside the plugin and returns to this device.").addButton(button => button.setButtonText("Authenticate").onClick(() => this.host.authenticate()));

    new Setting(containerEl).setName("BRAIN vault identity").setDesc("Stable non-secret identity. Additional devices must deliberately confirm the same identity when pairing.").addText(text => text
      .setValue(settings.vaultIdentity)
      .onChange(async value => this.host.updateSettings({ vaultIdentity: value.trim() })));
    new Setting(containerEl).setName("Managed remote root ID").setDesc("Stable Google Drive folder ID for explicit pairing. A folder name alone is never sufficient.").addText(text => text
      .setValue(settings.remoteRootId)
      .onChange(async value => this.host.updateSettings({ remoteRootId: value.trim() })));
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

    containerEl.createEl("h3", { text: "Effective vault exclusions" });
    const exclusions = containerEl.createEl("ul");
    for (const rule of defaultLocalExclusionRules()) exclusions.createEl("li", { text: `${rule.pattern} — ${rule.description}` });
    containerEl.createEl("h3", { text: "Portable configuration allowlist" });
    const portable = containerEl.createEl("ul");
    for (const entry of new SelectiveConfigurationPolicy().describePortablePolicy()) portable.createEl("li", { text: `${entry.relativePath} — ${entry.classification.classification}` });
    containerEl.createEl("p", { text: "Unknown configuration, third-party plugin settings, workspace/session state, secrets, and synchronization operational state remain device-local by default." });
  }

  private toggle(
    container: HTMLElement,
    name: string,
    description: string,
    value: boolean,
    patch: (value: boolean) => Partial<BrainSyncSettings>,
  ): void {
    new Setting(container).setName(name).setDesc(description).addToggle(toggle => toggle.setValue(value).onChange(async next => this.host.updateSettings(patch(next))));
  }
}
