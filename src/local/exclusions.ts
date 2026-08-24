import type { VaultPath } from "../contracts/common";

export type ExclusionRuleSource = "default" | "user" | "configuration-boundary";

export interface ExclusionRule {
  readonly id: string;
  readonly pattern: string;
  readonly source: ExclusionRuleSource;
  readonly description: string;
}

export interface ExclusionDecision {
  readonly excluded: boolean;
  readonly rule?: ExclusionRule;
}

const DEFAULT_RULES: readonly ExclusionRule[] = [
  { id: "git", pattern: ".git/**", source: "default", description: "Git repository metadata" },
  { id: "mac-ds-store", pattern: "**/.DS_Store", source: "default", description: "macOS Finder metadata" },
  { id: "windows-thumbs", pattern: "**/Thumbs.db", source: "default", description: "Windows Explorer thumbnail cache" },
  { id: "windows-desktop-ini", pattern: "**/desktop.ini", source: "default", description: "Windows Explorer folder metadata" },
  { id: "temporary-suffix", pattern: "**/*.tmp", source: "default", description: "Temporary files" },
  { id: "temporary-tilde", pattern: "**/*~", source: "default", description: "Editor backup/temporary files" },
  { id: "lock-files", pattern: "**/*.lock", source: "default", description: "Runtime lock files" },
  { id: "phase4-staging", pattern: "**/.*.brain-sync-stage-*", source: "default", description: "Plugin local write staging artifacts" },
  { id: "phase4-backup", pattern: "**/.*.brain-sync-backup-*", source: "default", description: "Plugin local replacement backup artifacts" },
  { id: "obsidian-trash", pattern: ".trash/**", source: "default", description: "Local recoverable trash" }
] as const;

function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

/**
 * Minimal glob support for explicit vault exclusion rules.
 * `**` spans path separators and `*` stays within one path component.
 */
function compileGlob(pattern: string): RegExp {
  const normalized = normalize(pattern);
  let out = "^";
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (ch === "*" && normalized[i + 1] === "*") {
      if (normalized[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (ch === "*") {
      out += "[^/]*";
    } else {
      out += escapeRegex(ch);
    }
  }
  return new RegExp(`${out}$`, "i");
}

function directoryRootMatch(candidate: string, pattern: string): boolean {
  if (!pattern.endsWith("/**")) return false;
  const root = normalize(pattern.slice(0, -3));
  return candidate.toLocaleLowerCase("en-US") === root.toLocaleLowerCase("en-US");
}

export class LocalExclusionPolicy {
  readonly rules: readonly ExclusionRule[];
  private readonly compiled: readonly { readonly rule: ExclusionRule; readonly matcher: RegExp }[];

  constructor(userPatterns: readonly string[] = []) {
    const userRules = userPatterns.map((pattern, index): ExclusionRule => ({
      id: `user-${index + 1}`,
      pattern,
      source: "user",
      description: "User-configured exclusion"
    }));
    this.rules = [...DEFAULT_RULES, ...userRules];
    this.compiled = this.rules.map(rule => ({ rule, matcher: compileGlob(rule.pattern) }));
  }

  evaluate(path: VaultPath | string, activeConfigurationDirectory?: VaultPath | string): ExclusionDecision {
    const candidate = normalize(String(path));
    const configDir = activeConfigurationDirectory ? normalize(String(activeConfigurationDirectory)) : undefined;
    if (configDir && (candidate === configDir || candidate.startsWith(`${configDir}/`))) {
      return {
        excluded: true,
        rule: {
          id: "active-configuration-directory",
          pattern: `${configDir}/**`,
          source: "configuration-boundary",
          description: "Active Obsidian configuration directory is handled by selective configuration policy"
        }
      };
    }
    const match = this.compiled.find(item => directoryRootMatch(candidate, item.rule.pattern) || item.matcher.test(candidate));
    return match ? { excluded: true, rule: match.rule } : { excluded: false };
  }
}

export const defaultLocalExclusionRules = (): readonly ExclusionRule[] => DEFAULT_RULES;
