import type { DiagnosticLogger } from "./diagnostic-logger";

/** Starts the correlation scope at the actual Sync now command boundary. */
export function beginManualSyncDiagnostics(diagnostics: DiagnosticLogger | undefined, source = "sync-now-command"): number | undefined {
  const runId = diagnostics?.beginSyncRun(source);
  if (diagnostics && runId !== undefined) diagnostics.syncInfo("sync.controller", "sync-now-click-handler-enter", runId, { stage: "command-click", operation: "sync-now" });
  return runId;
}
