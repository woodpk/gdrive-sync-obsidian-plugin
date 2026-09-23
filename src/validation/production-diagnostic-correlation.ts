import type { SynchronizationPlan } from "../contracts";
import type { DiagnosticEvent } from "../diagnostics/diagnostic-logger";
import {
  inspectExactProductionTerminal,
  type ProductionDiagnosticCorrelation,
  type ProductionDiagnosticRequestKind,
  type ProductionTerminalDiagnosticResult,
} from "../diagnostics/production-diagnostic-correlation";
import type { ValidationRunIdentity } from "./run-sandbox-checkpoint-contracts";

export interface ValidationProductionDiagnosticBinding {
  readonly run: ValidationRunIdentity;
  readonly authorityCycleId: string;
  readonly diagnosticRunId: number;
  readonly requestKind: ProductionDiagnosticRequestKind;
  readonly planId?: SynchronizationPlan["planId"];
}

export type ValidationTerminalCorrelationResult =
  | {
      readonly status: "established";
      readonly binding: ValidationProductionDiagnosticBinding;
      readonly event: DiagnosticEvent;
      readonly result: ProductionTerminalDiagnosticResult;
    }
  | {
      readonly status: "missing" | "ambiguous" | "contradictory";
      readonly binding: ValidationProductionDiagnosticBinding;
      readonly reason: string;
    };

export function sameValidationRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

export function validationAuthorityCycleKey(run: ValidationRunIdentity, authorityCycleId: string): string {
  return `${String(run.scenarioId)}\u0000${String(run.runId)}\u0000${authorityCycleId}`;
}

export function validValidationAuthorityCycleId(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.trim() === value
    && !value.includes("\u0000");
}

export function bindValidationProductionDiagnostic(input: {
  readonly run: ValidationRunIdentity;
  readonly authorityCycleId: string;
  readonly correlation: ProductionDiagnosticCorrelation | undefined;
  readonly expectedRequestKind: ProductionDiagnosticRequestKind;
  readonly expectedPlanId?: SynchronizationPlan["planId"];
}): ValidationProductionDiagnosticBinding | undefined {
  if (!validValidationAuthorityCycleId(input.authorityCycleId)) return undefined;
  const correlation = input.correlation;
  if (!correlation || correlation.requestKind !== input.expectedRequestKind) return undefined;
  if (!Number.isSafeInteger(correlation.diagnosticRunId) || correlation.diagnosticRunId < 1) return undefined;
  if (input.expectedPlanId !== undefined && correlation.planId !== input.expectedPlanId) return undefined;
  if (input.expectedPlanId === undefined && correlation.planId === undefined) return undefined;
  return Object.freeze({
    run: input.run,
    authorityCycleId: input.authorityCycleId,
    diagnosticRunId: correlation.diagnosticRunId,
    requestKind: correlation.requestKind,
    ...(correlation.planId ? { planId: correlation.planId } : {}),
  });
}

export function exactValidationProductionTerminal(
  events: readonly DiagnosticEvent[],
  binding: ValidationProductionDiagnosticBinding,
): ValidationTerminalCorrelationResult {
  const terminal = inspectExactProductionTerminal(events, binding.diagnosticRunId);
  if (terminal.status !== "established") {
    return { ...terminal, binding };
  }
  return {
    status: "established",
    binding,
    event: terminal.event,
    result: terminal.result,
  };
}
