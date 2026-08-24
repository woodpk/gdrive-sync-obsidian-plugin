import type { SynchronizationPlan } from "../contracts";
import type { BrainSyncSettings } from "./plugin-data";

interface ConnectionLike { readonly type?: string; readonly effectiveType?: string; }

function connection(): ConnectionLike | undefined {
  const nav = globalThis.navigator as Navigator & { readonly connection?: ConnectionLike };
  return nav?.connection;
}

export interface AutomaticExecutionDecision { readonly allowed: boolean; readonly reason?: string; }

/** Wi-Fi restrictions fail closed when the stock host cannot prove the network type. */
export function automaticNetworkDecision(plan: SynchronizationPlan, settings: BrainSyncSettings, mobile: boolean): AutomaticExecutionDecision {
  if (!mobile) return { allowed: true };
  const network = connection();
  const provenWifi = network?.type === "wifi";
  if (settings.wifiOnlyAutomatic && !provenWifi) return { allowed: false, reason: "Wi-Fi-only automatic sync is enabled and this host cannot prove a Wi-Fi connection." };
  const hasLargeTransfer = plan.operations.some(operation => (operation.contentVersion?.content?.sizeBytes ?? 0) >= settings.largeTransferThresholdBytes);
  if (settings.wifiOnlyLargeTransfers && hasLargeTransfer && !provenWifi) return { allowed: false, reason: "A large automatic transfer is Wi-Fi-only and this host cannot prove a Wi-Fi connection." };
  return { allowed: true };
}
