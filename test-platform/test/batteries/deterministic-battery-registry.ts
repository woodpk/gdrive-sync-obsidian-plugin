export interface DeterministicBatteryDefinition {
  readonly name: string;
  readonly description: string;
  readonly testFiles: readonly string[];
}

const PLATFORM_CORE = [
  "architecture-guard.test.js",
  "architecture-metrics.test.js",
  "battery-registry.test.js",
  "battery-support.test.js",
  "deterministic-battery-registry.test.js",
  "in-memory-google-drive.test.js",
  "in-memory-local-vault.test.js",
  "per-device-runtime.test.js",
  "platform-root.test.js",
  "repository-check-integration.test.js",
  "scenario-canaries.test.js",
  "scenario-checkpoint.test.js",
  "scenario-contract.test.js",
  "scenario-evidence.test.js",
  "scenario-runner.test.js",
  "virtual-world.test.js",
] as const;

const S06_SYNC_SEMANTICS = [
  "s06a-initialization-one-sided.test.js",
  "s06b-merge-conflict-delete-modify.test.js",
  "s06c-deletion-stale-clock-unreadable.test.js",
  "s06d-move-rename-identity-collision.test.js",
  "s06e-exclusions-unknown-empty-folders.test.js",
] as const;

const S07_FAULT_RECOVERY_SAFETY = [
  "s07a-crash-commit-ambiguity.test.js",
  "s07b-automatic-incremental-prerequisite.test.js",
  "s07b-persisted-recovery-gate-prerequisite.test.js",
  "s07b-recovery-control-prerequisite.test.js",
  "s07b-state-cursor-listing-root-recovery.test.js",
  "s07c-clone-restore-cancellation-prerequisite.test.js",
  "s07c-device-authority-cancellation.test.js",
  "s07d-transfer-integrity-retry-backoff.test.js",
  "s07e-quota-disk-destructive-config-lifecycle.test.js",
  "s07e-resource-fault-prerequisite.test.js",
  "s07f-deterministic-scale-resource-measurement.test.js",
] as const;

const S08_LIVE_PLATFORM_INFRASTRUCTURE = [
  "s08a-production-run-receipt-seam.test.js",
  "s08b-validation-build-entrypoint.test.js",
  "s08c-device-command-agent.test.js",
  "s08c-prerequisite-production-control-seam.test.js",
  "s08d-drive-mailbox-relay.test.js",
  "s08e-external-live-executor.test.js",
  "s08e-prerequisite-runner-executor-seam.test.js",
] as const;

const S09_LATE_COMPLETION_RECOVERY = [
  "s09a-late-completion-recovery.test.js",
] as const;

const ALL_PLATFORM_TESTS = [
  ...new Set([
    ...PLATFORM_CORE,
    ...S06_SYNC_SEMANTICS,
    ...S07_FAULT_RECOVERY_SAFETY,
    ...S08_LIVE_PLATFORM_INFRASTRUCTURE,
    ...S09_LATE_COMPLETION_RECOVERY,
  ]),
].sort();

const DETERMINISTIC_BATTERIES: Readonly<Record<string, DeterministicBatteryDefinition>> =
  Object.freeze({
    "platform-core": {
      name: "platform-core",
      description: "BVP architecture, virtual-world, scenario, evidence, repository-check, and battery-framework tests.",
      testFiles: PLATFORM_CORE,
    },
    "s06-sync-semantics": {
      name: "s06-sync-semantics",
      description: "Deterministic initialization, merge/conflict, deletion, rename/path, exclusion, binary, and empty-folder semantics.",
      testFiles: S06_SYNC_SEMANTICS,
    },
    "s07-fault-recovery-safety": {
      name: "s07-fault-recovery-safety",
      description: "Deterministic crash/recovery, authority, cancellation, transfer integrity, resource, destructive-safety, and scale coverage.",
      testFiles: S07_FAULT_RECOVERY_SAFETY,
    },
    "s08-live-platform-infrastructure": {
      name: "s08-live-platform-infrastructure",
      description: "Production receipt seam, validation build, command agent, mailbox/relay, and external live-executor infrastructure tests.",
      testFiles: S08_LIVE_PLATFORM_INFRASTRUCTURE,
    },
    "s09-late-completion-recovery": {
      name: "s09-late-completion-recovery",
      description: "S09A guarded late-completion recovery tests.",
      testFiles: S09_LATE_COMPLETION_RECOVERY,
    },
    "all-platform-tests": {
      name: "all-platform-tests",
      description: "Complete automated BVP test-platform suite grouped under one deterministic battery.",
      testFiles: ALL_PLATFORM_TESTS,
    },
  });

export function listDeterministicBatteryNames(): readonly string[] {
  return Object.keys(DETERMINISTIC_BATTERIES).sort();
}

export function getDeterministicBattery(name: string): DeterministicBatteryDefinition | undefined {
  return DETERMINISTIC_BATTERIES[name];
}
