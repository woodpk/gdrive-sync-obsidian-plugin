/** Shared browser-safe contract; the live-device validation artifact may import only
 * this reusable type/pure helper, not scenario logic or its runtime. */
import { bvpDiagnostic, type BvpDiagnostic, type BvpDiagnosticInput } from "../live-device/diagnostic-contract";
export { bvpDiagnostic } from "../live-device/diagnostic-contract";
export type { BvpDiagnostic, BvpDiagnosticInput, BvpDiagnosticComponent } from "../live-device/diagnostic-contract";

/** Trusted internal failure wrapper: shared boundaries carry no raw exceptions. */
export class BvpDiagnosticError extends Error {
  constructor(readonly diagnostic:BvpDiagnostic,readonly status:"failed"|"blocked"="failed"){
    super(diagnostic.classification);this.name="BvpDiagnosticError";
  }
}


const TRUSTED_VIRTUAL_CRASH_REASONS = new Set([
  "virtual-crash:before-remote-dispatch", "virtual-crash:after-remote-effect",
  "virtual-crash:before-canonical-state-write", "virtual-crash:after-canonical-state-write",
]);

/** Unexpected exceptions have no safe public message unless explicitly classified. */
export function safeUnexpectedFailure(
  _error: unknown,
  context: Pick<BvpDiagnosticInput, "component" | "phase" | "lastConfirmedBoundary" |
    "firstUnconfirmedBoundary" | "stepId">,
  classification = "step-exception",
): { readonly status: "failed"; readonly classification: string; readonly reason?: string; readonly diagnostic: BvpDiagnostic } {
  const diagnostic = bvpDiagnostic({
    ...context, classification, effect: "unknown",
    recommendedAction: "inspect-run-evidence",
  });
  const knownReason = _error instanceof Error && TRUSTED_VIRTUAL_CRASH_REASONS.has(_error.message)
    ? _error.message : undefined;
  return { status: "failed", classification: diagnostic.classification,
    ...(knownReason ? { reason: knownReason } : {}), diagnostic };
}
