/**
 * Public BVP diagnostic vocabulary. Never attach raw Error messages, stack traces,
 * device IDs, vault paths, HTTP bodies or untrusted transport payloads here.
 * Classification and boundary fields are bounded machine tokens, not free text.
 */
export type BvpDiagnosticComponent =
  | "scenario-runner" | "live-controller" | "battery-runner"
  | "device-agent" | "drive-mailbox" | "windows-relay";

export interface BvpDiagnostic {
  readonly schemaVersion: 1;
  readonly classification: string;
  readonly component: BvpDiagnosticComponent;
  readonly phase: string;
  readonly lastConfirmedBoundary: string;
  readonly firstUnconfirmedBoundary: string;
  readonly effect: "unknown" | "none-confirmed" | "confirmed";
  readonly recommendedAction: string;
  readonly stepId?: string;
}
export type BvpDiagnosticInput = Omit<BvpDiagnostic, "schemaVersion">;

const TOKEN = /^[a-z][a-z0-9-]{0,95}$/;
const STEP = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const SAFE_COMPONENTS = new Set<BvpDiagnosticComponent>([
  "scenario-runner", "live-controller", "battery-runner",
  "device-agent", "drive-mailbox", "windows-relay",
]);
const SAFE_EFFECTS = new Set<BvpDiagnostic["effect"]>(["unknown", "none-confirmed", "confirmed"]);
const TRUSTED_VIRTUAL_CRASH_REASONS = new Set([
  "virtual-crash:before-remote-dispatch", "virtual-crash:after-remote-effect",
  "virtual-crash:before-canonical-state-write", "virtual-crash:after-canonical-state-write",
]);
function token(value: unknown, fallback: string): string {
  return typeof value === "string" && TOKEN.test(value) ? value : fallback;
}

/** Construct only allowlisted machine-readable diagnostic fields. */
export function bvpDiagnostic(input: BvpDiagnosticInput): BvpDiagnostic {
  return {
    schemaVersion: 1,
    classification: token(input.classification, "unexpected-internal-error"),
    component: SAFE_COMPONENTS.has(input.component) ? input.component : "scenario-runner",
    phase: token(input.phase, "unknown-phase"),
    lastConfirmedBoundary: token(input.lastConfirmedBoundary, "unknown"),
    firstUnconfirmedBoundary: token(input.firstUnconfirmedBoundary, "unknown"),
    effect: SAFE_EFFECTS.has(input.effect) ? input.effect : "unknown",
    recommendedAction: token(input.recommendedAction, "inspect-run-evidence"),
    ...(typeof input.stepId === "string" && STEP.test(input.stepId)
      ? { stepId: input.stepId } : {}),
  };
}

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
