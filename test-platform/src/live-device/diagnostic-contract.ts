/**
 * The one browser-safe BVP diagnostic contract used by validation-device
 * adapters and the external scenario runner. This module is intentionally
 * inside live-device/ so S08B's installed validation artifact cannot import
 * scenario execution, evidence, test harnesses or external orchestration.
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
