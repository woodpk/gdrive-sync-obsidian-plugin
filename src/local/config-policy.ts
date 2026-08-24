import type { ConfigurationClassification } from "../contracts/local-vault";
import type { VaultPath } from "../contracts/common";
import { normalizeVaultPath } from "./path-policy";

/**
 * Deliberately small v1 portability allowlist. Entries are limited to core,
 * user-authored preferences whose representation is portable across desktop
 * and mobile. Unknown artifacts remain local until explicitly classified.
 */
const PORTABLE_CORE_FILES = new Map<string, string>([
  ["app.json", "obsidian-core-app-settings-v1"],
  ["appearance.json", "obsidian-core-appearance-v1"],
  ["hotkeys.json", "obsidian-core-hotkeys-v1"],
  ["core-plugins.json", "obsidian-core-plugin-enablements-v1"]
]);

const DEVICE_LOCAL_NAMES = new Set([
  "workspace.json",
  "workspace-mobile.json",
  "workspace",
  "cache",
  "cache.json"
]);

const PROTECTED_NAME_PATTERNS: readonly { readonly matcher: RegExp; readonly reason: ConfigurationClassification & { classification: "protected" } }[] = [
  { matcher: /(?:^|\/)(?:oauth|auth|token|tokens|credentials|secret|secrets)(?:\.|\/|$)/i, reason: { classification: "protected", reason: "authentication-secret" } },
  { matcher: /(?:^|\/)(?:device-id|device-identity)(?:\.|\/|$)/i, reason: { classification: "protected", reason: "device-identity" } },
  { matcher: /(?:^|\/)(?:sync-state|base-state|change-cursor|cursor|checkpoint|journal|tombstone|recovery|audit|sync-cache|hash-cache|operation-log)(?:\.|\/|$)/i, reason: { classification: "protected", reason: "sync-operational-state" } }
];

export interface ConfigurationPolicyEntry {
  readonly relativePath: string;
  readonly classification: ConfigurationClassification;
}

export class SelectiveConfigurationPolicy {
  classify(path: VaultPath | string, activeConfigurationDirectory: VaultPath | string): ConfigurationClassification {
    const configDir = normalizeVaultPath(String(activeConfigurationDirectory));
    const normalized = normalizeVaultPath(String(path));
    if (!(normalized === configDir || normalized.startsWith(`${configDir}/`))) {
      return { classification: "unknown", reason: "Path is outside the active configuration directory" };
    }

    const relative = normalized === configDir ? "" : normalized.slice(configDir.length + 1);
    if (!relative) return { classification: "device-local", reason: "Configuration root is a container, not a portable artifact" };

    for (const protectedPattern of PROTECTED_NAME_PATTERNS) {
      if (protectedPattern.matcher.test(relative)) return protectedPattern.reason;
    }

    const lower = relative.toLocaleLowerCase("en-US");
    const basename = lower.split("/").at(-1) ?? lower;
    if (DEVICE_LOCAL_NAMES.has(lower) || DEVICE_LOCAL_NAMES.has(basename) || /(?:^|\/)(?:cache|logs?|tmp|temp|lock)(?:\/|\.|$)/i.test(lower)) {
      return { classification: "device-local", reason: "Workspace, session, cache, log, temporary, or platform runtime state remains device-local" };
    }

    if (lower.startsWith("plugins/brain-google-drive-sync/")) {
      return { classification: "protected", reason: "sync-operational-state" };
    }

    if (lower.startsWith("plugins/")) {
      return { classification: "unknown", reason: "Third-party plugin configuration is not portable by default" };
    }

    const policyId = PORTABLE_CORE_FILES.get(lower);
    if (policyId) return { classification: "portable", policyId };

    return { classification: "unknown", reason: "Configuration artifact is not in the explicit portable allowlist" };
  }

  describePortablePolicy(): readonly ConfigurationPolicyEntry[] {
    return [...PORTABLE_CORE_FILES.entries()].map(([relativePath, policyId]) => ({
      relativePath,
      classification: { classification: "portable", policyId }
    }));
  }
}
