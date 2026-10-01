/**
 * Narrow read-only production observation for one terminal synchronization run.
 *
 * Production remains the authority for every value in this receipt. Consumers
 * can observe the latest receipt but cannot trigger synchronization or mutate
 * synchronization state through this seam.
 */
import type { PlanId } from "../contracts/common";
import type { SynchronizationPlan } from "../contracts/plan";

export type ProductionRunTerminalClassification =
  | "complete"
  | "partial"
  | "failed"
  | "cancelled"
  | "blocked"
  | "deferred"
  | "recovery-required"
  | "uncertain";

export interface ProductionRunReceipt {
  readonly runId: string;
  readonly trigger: SynchronizationPlan["trigger"];
  readonly planId: PlanId;
  readonly terminal: ProductionRunTerminalClassification;
  readonly requiredEffectsCommittedAndVerified: boolean;
  readonly committedOperationCount: number;
  readonly skippedOperationCount: number;
  readonly reason?: string;
}

export interface ProductionRunReceiptSource {
  latestProductionRunReceipt(): ProductionRunReceipt | undefined;
}

export function readLatestProductionRunReceipt(source: ProductionRunReceiptSource): ProductionRunReceipt | undefined {
  return source.latestProductionRunReceipt();
}
