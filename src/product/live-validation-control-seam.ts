/**
 * Bounded production control facade for external verification composition.
 *
 * This surface delegates only already-authorized production controller actions.
 * It owns no synchronization policy, scenario state, transport, persistence,
 * fixture mutation, or verdict authority.
 */
import type {
  PlanId,
  ProductSurfaceState,
  SynchronizationPlan,
  UserAction,
  UserActionResult,
} from "../contracts";
import {
  readLatestProductionRunReceipt,
  type ProductionRunReceipt,
  type ProductionRunReceiptSource,
} from "./run-receipt-seam";

export interface ProductionVerificationControllerSource extends ProductionRunReceiptSource {
  previewManual(): Promise<SynchronizationPlan | undefined>;
  previewVerifyReconcile(): Promise<SynchronizationPlan | undefined>;
  request(action: UserAction): Promise<UserActionResult>;
  currentSurface(): ProductSurfaceState;
}

export interface ProductionVerificationControl {
  previewManual(): Promise<SynchronizationPlan | undefined>;
  previewVerifyReconcile(): Promise<SynchronizationPlan | undefined>;
  executePlan(planId: PlanId): Promise<UserActionResult>;
  pause(): Promise<UserActionResult>;
  resume(): Promise<UserActionResult>;
  cancelActiveSync(): Promise<UserActionResult>;
  currentSurface(): ProductSurfaceState;
  latestProductionRunReceipt(): ProductionRunReceipt | undefined;
}

export function createProductionVerificationControl(
  source: ProductionVerificationControllerSource | undefined,
): ProductionVerificationControl | undefined {
  if (!source) return undefined;
  return {
    previewManual: () => source.previewManual(),
    previewVerifyReconcile: () => source.previewVerifyReconcile(),
    executePlan: planId => source.request({ kind: "execute-plan", planId }),
    pause: () => source.request({ kind: "pause" }),
    resume: () => source.request({ kind: "resume" }),
    cancelActiveSync: () => source.request({ kind: "cancel-active-sync" }),
    currentSurface: () => source.currentSurface(),
    latestProductionRunReceipt: () => {
      const receipt = readLatestProductionRunReceipt(source);
      return receipt ? { ...receipt } : undefined;
    },
  };
}
