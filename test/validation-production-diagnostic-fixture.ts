import type { SynchronizationPlan } from "../src/contracts";
import type { DiagnosticEvent } from "../src/diagnostics/diagnostic-logger";
import type {
  ProductionDiagnosticCorrelation,
  ProductionDiagnosticRequestKind,
  ProductionTerminalDiagnosticResult,
} from "../src/diagnostics/production-diagnostic-correlation";

/** Test-only source of exact H6C production diagnostic identity and terminal events. */
export class ValidationProductionDiagnosticFixture {
  private nextRunId = 1;
  private nextSequence = 1;
  private currentValue?: ProductionDiagnosticCorrelation;
  private readonly events: DiagnosticEvent[] = [];

  begin(requestKind: ProductionDiagnosticRequestKind, planId: SynchronizationPlan["planId"]): number {
    const diagnosticRunId = this.nextRunId++;
    this.currentValue = Object.freeze({ diagnosticRunId, requestKind, planId });
    return diagnosticRunId;
  }

  complete(
    diagnosticRunId: number,
    result: Extract<ProductionTerminalDiagnosticResult, "complete" | "partial"> = "complete",
  ): void {
    this.events.push(this.terminal(
      diagnosticRunId,
      "sync-run-complete",
      result,
    ));
  }

  fail(diagnosticRunId: number): void {
    this.events.push(this.terminal(diagnosticRunId, "sync-run-failed", "failed"));
  }

  cancel(diagnosticRunId: number): void {
    this.events.push(this.terminal(diagnosticRunId, "sync-run-cancelled", "cancelled"));
  }

  duplicateComplete(diagnosticRunId: number): void {
    this.complete(diagnosticRunId);
  }

  current(): ProductionDiagnosticCorrelation | undefined {
    return this.currentValue;
  }

  snapshot(): readonly DiagnosticEvent[] {
    return this.events.map(event => ({
      ...event,
      ...(event.fields ? { fields: { ...event.fields } } : {}),
    }));
  }

  private terminal(
    diagnosticRunId: number,
    event: "sync-run-complete" | "sync-run-failed" | "sync-run-cancelled",
    result: ProductionTerminalDiagnosticResult,
  ): DiagnosticEvent {
    return {
      timestamp: "2026-09-22T00:00:00.000Z",
      sequence: this.nextSequence++,
      level: "info",
      component: "sync.controller",
      event,
      runId: diagnosticRunId,
      platform: "desktop",
      fields: { stage: "terminal", result },
    };
  }
}
