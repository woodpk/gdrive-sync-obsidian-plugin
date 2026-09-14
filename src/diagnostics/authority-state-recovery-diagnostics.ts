import type {
  DiagnosticComponent,
  SafeDiagnosticFields,
} from "./diagnostic-logger";
import type { DiagnosticLogger } from "./diagnostic-logger";

export type StateRecoveryDiagnosticLevel = "error" | "warn" | "info" | "debug" | "trace";

/**
 * LOG-05 non-authoritative diagnostic emission seam. The frozen LOG-01 logger
 * remains the sole sanitizer/serializer. Diagnostic failures are intentionally
 * swallowed so observability can never alter state/CAS/recovery behavior.
 */
export function emitStateRecoveryDiagnostic(
  logger: DiagnosticLogger | undefined,
  level: StateRecoveryDiagnosticLevel,
  component: DiagnosticComponent,
  event: string,
  fields?: SafeDiagnosticFields,
): void {
  if (!logger) return;
  try {
    const runId = logger.currentSyncRunId();
    if (runId !== undefined) {
      if (level === "error") logger.syncError(component, event, runId, fields);
      else if (level === "warn") logger.syncWarn(component, event, runId, fields);
      else if (level === "info") logger.syncInfo(component, event, runId, fields);
      else if (level === "debug") logger.syncDebug(component, event, runId, fields);
      else logger.syncTrace(component, event, runId, fields);
      return;
    }
    if (level === "error") logger.error(component, event, fields);
    else if (level === "warn") logger.warn(component, event, fields);
    else if (level === "info") logger.info(component, event, fields);
    else if (level === "debug") logger.debug(component, event, fields);
    else logger.trace(component, event, fields);
  } catch {
    // Diagnostics are strictly non-authoritative.
  }
}
