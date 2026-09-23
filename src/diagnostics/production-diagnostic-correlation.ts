import type { SynchronizationPlan } from "../contracts";
import type { DiagnosticEvent } from "./diagnostic-logger";

export const PRODUCTION_DIAGNOSTIC_REQUEST_KINDS = [
  "manual",
  "verify-reconcile",
  "conflict-resolution",
] as const;

export type ProductionDiagnosticRequestKind =
  (typeof PRODUCTION_DIAGNOSTIC_REQUEST_KINDS)[number];

export interface ProductionDiagnosticCorrelation {
  readonly diagnosticRunId: number;
  readonly requestKind: ProductionDiagnosticRequestKind;
  readonly planId?: SynchronizationPlan["planId"];
}

/**
 * Additive, non-authoritative correlation state for validation/diagnostics.
 *
 * This tracker never controls synchronization. Missing or invalid diagnostic
 * identity simply leaves correlation unavailable.
 */
export class ProductionDiagnosticCorrelationTracker {
  private currentValue?: ProductionDiagnosticCorrelation;

  begin(diagnosticRunId: number | undefined, requestKind: ProductionDiagnosticRequestKind): void {
    if (diagnosticRunId === undefined || !Number.isSafeInteger(diagnosticRunId) || diagnosticRunId < 1) {
      this.currentValue = undefined;
      return;
    }
    this.currentValue = Object.freeze({ diagnosticRunId, requestKind });
  }

  bindPlan(
    diagnosticRunId: number | undefined,
    planId: SynchronizationPlan["planId"],
  ): void {
    const current = this.currentValue;
    if (
      diagnosticRunId === undefined
      || !current
      || current.diagnosticRunId !== diagnosticRunId
    ) {
      return;
    }
    this.currentValue = Object.freeze({ ...current, planId });
  }

  current(): ProductionDiagnosticCorrelation | undefined {
    return this.currentValue;
  }
}

export type ProductionTerminalDiagnosticResult =
  | "complete"
  | "partial"
  | "failed"
  | "cancelled";

export type ExactProductionTerminalObservation =
  | {
      readonly status: "established";
      readonly event: DiagnosticEvent;
      readonly result: ProductionTerminalDiagnosticResult;
    }
  | {
      readonly status: "missing" | "ambiguous" | "contradictory";
      readonly reason: string;
    };

function terminalResult(event: DiagnosticEvent): ProductionTerminalDiagnosticResult | undefined {
  const result = event.fields?.result;
  if (
    event.event === "sync-run-complete"
    && (result === "complete" || result === "partial")
  ) {
    return result;
  }
  if (event.event === "sync-run-failed" && result === "failed") return "failed";
  if (event.event === "sync-run-cancelled" && result === "cancelled") return "cancelled";
  return undefined;
}

/**
 * Resolves a production terminal result only from the exact diagnostic run.
 * No timestamp, sequence-nearness, newest-event, or cross-run inference is used.
 */
export function inspectExactProductionTerminal(
  events: readonly DiagnosticEvent[],
  diagnosticRunId: number,
): ExactProductionTerminalObservation {
  if (!Number.isSafeInteger(diagnosticRunId) || diagnosticRunId < 1) {
    return { status: "missing", reason: "Production diagnostic run identity is invalid or absent." };
  }

  const terminals = events.filter(event =>
    event.runId === diagnosticRunId
    && event.component === "sync.controller"
    && event.fields?.stage === "terminal",
  );

  if (terminals.length === 0) {
    return {
      status: "missing",
      reason: `Exact production diagnostic run ${diagnosticRunId} has no terminal sync.controller event.`,
    };
  }

  if (terminals.length !== 1) {
    return {
      status: "ambiguous",
      reason: `Exact production diagnostic run ${diagnosticRunId} has ${terminals.length} terminal sync.controller events.`,
    };
  }

  const event = terminals[0]!;
  const result = terminalResult(event);
  if (!result) {
    return {
      status: "contradictory",
      reason: `Exact production diagnostic run ${diagnosticRunId} has contradictory terminal event/result evidence.`,
    };
  }

  return { status: "established", event, result };
}
