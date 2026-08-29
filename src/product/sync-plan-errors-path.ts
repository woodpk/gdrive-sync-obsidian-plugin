import { normalizedComparisonPath, normalizeVaultPath, validateCrossPlatformPath } from "../local/path-policy";
import type { BrainSyncSettings } from "./plugin-data";

export const SYNC_PLAN_ERRORS_CSV_FILENAME = "sync-plan-errors.csv";
export const SYNC_PLAN_ERRORS_STAGE_SUFFIX = ".brain-sync-stage";
export const SYNC_PLAN_ERRORS_BACKUP_SUFFIX = ".brain-sync-backup";
const RESERVED_PORTABLE_CONFIGURATION_NAMESPACE = "__brain_sync_portable_config__";

export interface SyncPlanErrorsRelocationJournal {
  readonly sourcePath: string;
  readonly destinationPath: string;
}

export interface ResolvedSyncPlanErrorsPath {
  readonly directory: string;
  readonly path: string;
}

export function syncPlanErrorsOperationalPaths(path: string): readonly string[] {
  return [path, `${path}${SYNC_PLAN_ERRORS_STAGE_SUFFIX}`, `${path}${SYNC_PLAN_ERRORS_BACKUP_SUFFIX}`];
}

export function syncPlanErrorsPathsEquivalent(first: string, second: string): boolean {
  return normalizedComparisonPath(first) === normalizedComparisonPath(second);
}

function assertOperationalPathsCompatible(path: string): void {
  for (const candidate of syncPlanErrorsOperationalPaths(path)) {
    const validation = validateCrossPlatformPath(candidate);
    if (validation.status === "blocked") {
      throw new Error(`Sync plan errors operational path must be cross-platform safe (${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}).`);
    }
  }
}

export function resolveSyncPlanErrorsPath(directory: string): ResolvedSyncPlanErrorsPath {
  const trimmed = directory.trim();
  if (!trimmed) {
    assertOperationalPathsCompatible(SYNC_PLAN_ERRORS_CSV_FILENAME);
    return { directory: "", path: SYNC_PLAN_ERRORS_CSV_FILENAME };
  }
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
  const path = `${normalized}/${SYNC_PLAN_ERRORS_CSV_FILENAME}`;
  assertOperationalPathsCompatible(path);
  return { directory: normalized, path };
}

export function directoryForSyncPlanErrorsPath(path: string): string {
  const suffix = `/${SYNC_PLAN_ERRORS_CSV_FILENAME}`;
  const directory = path === SYNC_PLAN_ERRORS_CSV_FILENAME
    ? ""
    : path.endsWith(suffix) ? path.slice(0, -suffix.length) : undefined;
  if (directory === undefined || resolveSyncPlanErrorsPath(directory).path !== path) {
    throw new Error("Sync plan errors relocation path is invalid.");
  }
  return directory;
}

export function normalizeSyncPlanErrorsRelocationJournal(value: unknown): SyncPlanErrorsRelocationJournal | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object") throw new Error("Sync plan errors relocation journal is invalid.");
  const candidate = value as { readonly sourcePath?: unknown; readonly destinationPath?: unknown };
  if (typeof candidate.sourcePath !== "string" || typeof candidate.destinationPath !== "string") {
    throw new Error("Sync plan errors relocation journal is invalid.");
  }
  directoryForSyncPlanErrorsPath(candidate.sourcePath);
  directoryForSyncPlanErrorsPath(candidate.destinationPath);
  if (syncPlanErrorsPathsEquivalent(candidate.sourcePath, candidate.destinationPath)) {
    throw new Error("Sync plan errors relocation journal has cross-platform-equivalent locations.");
  }
  return { sourcePath: candidate.sourcePath, destinationPath: candidate.destinationPath };
}

export function withManagedSyncPlanErrorsExclusion(
  settings: BrainSyncSettings,
  directory = settings.syncPlanErrorsDirectory,
): BrainSyncSettings {
  const resolved = resolveSyncPlanErrorsPath(directory);
  const priorManaged = settings.managedSyncPlanErrorsExclusion;
  const relocation = normalizeSyncPlanErrorsRelocationJournal(settings.syncPlanErrorsRelocation);
  const protectedPaths = [resolved.path, ...(relocation ? [relocation.sourcePath, relocation.destinationPath] : [])]
    .filter((path, index, values) => values.indexOf(path) === index);
  const user = settings.userExclusionPatterns.filter(pattern => pattern !== priorManaged && !protectedPaths.includes(pattern));
  return {
    ...settings,
    syncPlanErrorsDirectory: resolved.directory,
    managedSyncPlanErrorsExclusion: resolved.path,
    syncPlanErrorsRelocation: relocation,
    userExclusionPatterns: [...user, ...protectedPaths],
  };
}

export function userExclusionsWithoutManaged(settings: BrainSyncSettings): readonly string[] {
  return settings.userExclusionPatterns.filter(pattern => pattern !== settings.managedSyncPlanErrorsExclusion);
}
