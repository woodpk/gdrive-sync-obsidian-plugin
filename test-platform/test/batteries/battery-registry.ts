import { s09aIosInitialSyncScenario } from "../../scenarios/live/s09a-ios-initial-sync";
import { s09aWindowsInitialSyncScenario } from "../../scenarios/live/s09a-windows-initial-sync";
import { s09aRequestAttributionScenario } from "../../scenarios/live/s09a-request-attribution";
import { s09aDualDeviceReadinessScenario } from "../../scenarios/live/s09a-dual-device-readiness";
import { s09bBidirectionalSyncScenario } from "../../scenarios/live/s09b-bidirectional-sync";
import { s09bCleanTextMergeScenario } from "../../scenarios/live/s09b-clean-text-merge";
import { s09cInterruptionResumeScenario } from "../../scenarios/live/s09c-interruption-resume";
import { s09cOfflineReconnectScenario } from "../../scenarios/live/s09c-offline-reconnect";
import { s09dLargeTransferScenario } from "../../scenarios/live/s09d-large-transfer";
import { s09dUnicodePathRoundtripScenario } from "../../scenarios/live/s09d-unicode-path-roundtrip";
import { s09eAuthRevocationRestoreScenario } from "../../scenarios/live/s09e-auth-revocation-restore";
import { s09ePluginDisableReenableScenario } from "../../scenarios/live/s09e-plugin-disable-reenable";
import { s09eUninstallReinstallScenario } from "../../scenarios/live/s09e-uninstall-reinstall";
import { windowsLiveSmokeScenario } from "../../scenarios/live/windows-live-smoke";
import type { HumanCheckpointInstruction } from "../../src/live-device/live-scenario-executor";
import type { ScenarioDefinition } from "../../src/scenario/scenario-contract";

export interface LiveBatteryDefinition {
  readonly name: string;
  readonly description: string;
  readonly requiredDeviceLabels: readonly string[];
  readonly checkpoints?: Readonly<Record<string, HumanCheckpointInstruction>>;
  createScenario(): ScenarioDefinition;
}

const dual = ["windows", "ios"] as const;

const LIVE_BATTERIES: Readonly<Record<string, LiveBatteryDefinition>> = Object.freeze({
  "windows-live-smoke": {
    name: "windows-live-smoke",
    description: "Observe the live Windows product state and verify one bounded local fixture round-trip.",
    requiredDeviceLabels: ["windows"],
    createScenario: () => windowsLiveSmokeScenario,
  },
  "s09a-dual-device-readiness": {
    name: "s09a-dual-device-readiness",
    description: "Require both installed validation participants to answer through the live path in idle-ready production state.",
    requiredDeviceLabels: dual,
    createScenario: () => s09aDualDeviceReadinessScenario,
  },
  "s09a-ios-initial-sync": {
    name: "s09a-ios-initial-sync",
    description: "Exercise an authenticated paired iOS participant through the real initial synchronization path.",
    requiredDeviceLabels: ["ios"],
    createScenario: () => s09aIosInitialSyncScenario,
  },
  "s09a-windows-initial-sync": {
    name: "s09a-windows-initial-sync",
    description: "Exercise an authenticated paired Windows participant through the real initial synchronization path.",
    requiredDeviceLabels: ["windows"],
    createScenario: () => s09aWindowsInitialSyncScenario,
  },
  "s09a-request-attribution": {
    name: "s09a-request-attribution",
    description: "Perform one controlled non-initial Windows synchronization with a bounded isolated canary and S09A HTTP attribution.",
    requiredDeviceLabels: ["windows"],
    createScenario: () => s09aRequestAttributionScenario,
  },
  "s09b-bidirectional-sync": {
    name: "s09b-bidirectional-sync",
    description: "Prove Windows-to-iOS create propagation and reciprocal iOS-to-Windows update propagation.",
    requiredDeviceLabels: dual,
    createScenario: () => s09bBidirectionalSyncScenario,
  },
  "s09b-clean-text-merge": {
    name: "s09b-clean-text-merge",
    description: "Prove one representative concurrent cross-device clean text merge and final convergence.",
    requiredDeviceLabels: dual,
    createScenario: () => s09bCleanTextMergeScenario,
  },
  "s09c-offline-reconnect": {
    name: "s09c-offline-reconnect",
    description: "Physically exercise offline/reconnect with an external human checkpoint and post-reconnect convergence.",
    requiredDeviceLabels: dual,
    checkpoints: {
      "windows-physical-offline-cycle": {
        device: "windows",
        action: "Disable Windows network connectivity, invoke BRAIN Sync now in Obsidian while physically offline, confirm the product does not present a successful completed synchronization, then restore network connectivity.",
        stopCondition: "Windows has completed a real offline sync attempt, no false-success was observed, and normal Internet/Drive connectivity is restored.",
        requiredEvidence: ["human-confirmation", "external-observation"],
        nextSafeAction: "Resume this same BVP run so production Verify/Reconcile can establish post-reconnect convergence.",
      },
    },
    createScenario: () => s09cOfflineReconnectScenario,
  },
  "s09c-interruption-resume": {
    name: "s09c-interruption-resume",
    description: "Physically terminate/restart Windows Obsidian at an external checkpoint and prove safe continuation.",
    requiredDeviceLabels: dual,
    checkpoints: {
      "windows-physical-runtime-restart": {
        device: "windows",
        action: "Fully quit the Windows Obsidian process, confirm it has terminated, then reopen the same disposable validation vault and wait for the validation plugin/runtime to load. Do not manually synchronize.",
        stopCondition: "The same validation vault is open again and the BVP validation runtime is loaded after a real process termination/restart.",
        requiredEvidence: ["human-confirmation", "external-observation"],
        nextSafeAction: "Resume this same BVP run; it will reobserve the pending local change before reconciling.",
      },
    },
    createScenario: () => s09cInterruptionResumeScenario,
  },
  "s09d-unicode-path-roundtrip": {
    name: "s09d-unicode-path-roundtrip",
    description: "Prove representative Unicode/space-containing paths and exact content identity in both physical directions.",
    requiredDeviceLabels: dual,
    createScenario: () => s09dUnicodePathRoundtripScenario,
  },
  "s09d-large-transfer": {
    name: "s09d-large-transfer",
    description: "Transfer deterministic 8 MiB binary fixtures in both physical directions and verify exact size/hash integrity.",
    requiredDeviceLabels: dual,
    createScenario: () => s09dLargeTransferScenario,
  },
  "s09e-auth-revocation-restore": {
    name: "s09e-auth-revocation-restore",
    description: "Require real provider revocation/non-success and normal same-device restoration before proving data safety.",
    requiredDeviceLabels: dual,
    checkpoints: {
      "windows-auth-revocation-restore": {
        device: "windows",
        action: "Revoke the Windows participant's real Google authorization through the provider/account UI. Return to Obsidian and invoke BRAIN Sync now; confirm it does not claim successful remote synchronization. Reauthenticate using the normal same-device flow, confirm the same managed root is paired, then fully restart Obsidian so the validation runtime is freshly bound.",
        stopCondition: "Revocation produced a real non-success observation, same-device authorization is restored to the intended managed root, and Windows Obsidian has been restarted with the validation runtime loaded.",
        requiredEvidence: ["human-confirmation", "external-observation"],
        nextSafeAction: "Resume this same BVP run to reobserve production state and reconcile both devices.",
      },
    },
    createScenario: () => s09eAuthRevocationRestoreScenario,
  },
  "s09e-plugin-disable-reenable": {
    name: "s09e-plugin-disable-reenable",
    description: "Require a real plugin disable/re-enable transition and prove managed data remains intact.",
    requiredDeviceLabels: dual,
    checkpoints: {
      "windows-plugin-disable-reenable": {
        device: "windows",
        action: "Disable the BRAIN Google Drive Sync plugin in Windows Obsidian, verify the disposable managed fixture remains in the vault, then re-enable the plugin and wait for the validation runtime to load.",
        stopCondition: "The plugin has been physically disabled and re-enabled, the fixture remained present, and the validation runtime is active again.",
        requiredEvidence: ["human-confirmation", "external-observation"],
        nextSafeAction: "Resume this same BVP run to reobserve the file/status and reconcile both devices.",
      },
    },
    createScenario: () => s09ePluginDisableReenableScenario,
  },
  "s09e-uninstall-reinstall": {
    name: "s09e-uninstall-reinstall",
    description: "Require real plugin uninstall/reinstall and prove managed data remains intact after exact-build restoration.",
    requiredDeviceLabels: dual,
    checkpoints: {
      "windows-plugin-uninstall-reinstall": {
        device: "windows",
        action: "Uninstall the BRAIN Google Drive Sync plugin from Windows Obsidian without deleting the disposable vault, verify the managed fixture remains, reinstall the exact validation artifact bound to this run's source identity, restore normal same-device authentication/pairing if required, then fully restart Obsidian.",
        stopCondition: "The plugin has been physically uninstalled and reinstalled, the managed fixture remained present, and the exact validation runtime is loaded against the intended managed root.",
        requiredEvidence: ["human-confirmation", "external-observation"],
        nextSafeAction: "Resume this same BVP run to reobserve the file/status and reconcile both devices.",
      },
    },
    createScenario: () => s09eUninstallReinstallScenario,
  },
});

export function listLiveBatteryNames(): readonly string[] {
  return Object.keys(LIVE_BATTERIES).sort();
}

export function getLiveBattery(name: string): LiveBatteryDefinition | undefined {
  return LIVE_BATTERIES[name];
}
