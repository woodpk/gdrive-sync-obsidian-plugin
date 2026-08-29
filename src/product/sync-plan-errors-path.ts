import { normalizeVaultPath, validateCrossPlatformPath } from "../local/path-policy";
import type { BrainSyncSettings } from "./plugin-data";

export const SYNC_PLAN_ERRORS_CSV_FILENAME = "sync-plan-errors.csv";
const RESERVED_PORTABLE_CONFIGURATION_NAMESPACE = "__brain_sync_portable_config__";

export interface ResolvedSyncPlanErrorsPath {
  readonly directory: string;
  readonly path: string;
}

export function resolveSyncPlanErrorsPath(directory: string): ResolvedSyncPlanErrorsPath {
  const trimmed = directory.trim();
  if (!trimmed) return { directory: "", path: SYNC_PLAN_ERRORS_CSV_FILENAME };
  const normalized = normalizeVaultPath(trimmed);
  const validation = validateCrossPlatformPath(normalized);
  if (validation.status === "blocked") {
    throw new Error(`Sync plan errors directory must be a safe vault-relative directory (${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}).`);
  }
  if (normalized === RESERVED_PORTABLE_CONFIGURATION_NAMESPACE || normalized.startsWith(`${RESERVED_PORTABLE_CONFIGURATION_NAMESPACE}/`)) {
    throw new Error("Sync plan errors directory cannot use BRAIN Sync's reserved portable-configuration namespace.");
  }
  if (normalized.toLocaleLowerCase("en-US").endsWith(".csv")) {
    throw new Error("Configure a containing directory, not a CSV filename; the filename is fixed by BRAIN Sync.");
  }
  return { directory: normalized, path: `${normalized}/${SYNC_PLAN_ERRORS_CSV_FILENAME}` };
}

export function withManagedSyncPlanErrorsExclusion(
  settings: BrainSyncSettings,
  directory = settings.syncPlanErrorsDirectory,
): BrainSyncSettings {
  const resolved = resolveSyncPlanErrorsPath(directory);
  const priorManaged = settings.managedSyncPlanErrorsExclusion;
  const user = settings.userExclusionPatterns.filter(pattern => pattern !== priorManaged && pattern !== resolved.path);
  return {
    ...settings,
    syncPlanErrorsDirectory: resolved.directory,
    managedSyncPlanErrorsExclusion: resolved.path,
    userExclusionPatterns: [...user, resolved.path],
  };
}

export function userExclusionsWithoutManaged(settings: BrainSyncSettings): readonly string[] {
  return settings.userExclusionPatterns.filter(pattern => pattern !== settings.managedSyncPlanErrorsExclusion);
}
