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
  /** Correlation data is opaque or schema-bounded; raw physical identities are prohibited. */
  readonly identity: { readonly runId:string; readonly scenarioId:string;
    readonly stepIndex:number|null; readonly executionMode:"deterministic"|"windows-live"|"simulated-mobile"|"unknown";
    readonly correlationToken:string };
  readonly causeClass:string;
  readonly retriability:"safe-to-repeat"|"requires-reconciliation"|"not-applicable";
  readonly hops:readonly {readonly boundary:string;readonly status:"confirmed"|"not-observed"|"unknown"}[];
}
export type BvpDiagnosticInput = Omit<BvpDiagnostic, "schemaVersion"|"identity"|"causeClass"|"retriability"|"hops"> &
  Partial<Pick<BvpDiagnostic,"identity"|"causeClass"|"retriability"|"hops">>;

const TOKEN = /^[a-z][a-z0-9-]{0,95}$/;
const STEP = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;
const SAFE_COMPONENTS = new Set<BvpDiagnosticComponent>([
  "scenario-runner", "live-controller", "battery-runner",
  "device-agent", "drive-mailbox", "windows-relay",
]);
const SAFE_EFFECTS = new Set<BvpDiagnostic["effect"]>(["unknown", "none-confirmed", "confirmed"]);
const OPAQUE = /^(?:run|corr)-sha256:[a-f0-9]{24}$/;
const HOP_STATUS=new Set(["confirmed","not-observed","unknown"]);
const MODES=new Set(["deterministic","windows-live","simulated-mobile","unknown"]);
/** Browser-safe privacy-derived correlation; never emit the unhashed source. */
export async function opaqueDiagnosticId(value:string,kind:"run"|"corr"):Promise<string>{
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return kind+"-sha256:"+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,"0")).join("").slice(0,24);
}
function token(value: unknown, fallback: string): string {
  return typeof value === "string" && TOKEN.test(value) ? value : fallback;
}

/** Public safe code used identically by the diagnostics and remote result parser. */
export const diagnosticCode=(value:unknown):string=>token(value,"unexpected-internal-error");

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
    identity:{
      runId:OPAQUE.test(input.identity?.runId??"")?input.identity!.runId:"unavailable",
      scenarioId:token(input.identity?.scenarioId,"unavailable"),
      stepIndex:Number.isSafeInteger(input.identity?.stepIndex)&&Number(input.identity?.stepIndex)>=0&&Number(input.identity?.stepIndex)<=10000?input.identity!.stepIndex:null,
      executionMode:MODES.has(input.identity?.executionMode??"")?input.identity!.executionMode:"unknown",
      correlationToken:OPAQUE.test(input.identity?.correlationToken??"")?input.identity!.correlationToken:"unavailable",
    },
    causeClass:token(input.causeClass,input.classification==="device-result-unavailable"?"device-result-unavailable":token(input.classification,"unexpected-internal-error")),
    retriability:input.effect==="unknown"?"requires-reconciliation":input.retriability==="safe-to-repeat"&&input.effect==="none-confirmed"?"safe-to-repeat":"not-applicable",
    hops:(input.hops?.length&&input.hops.length<=12?input.hops:[
      {boundary:input.lastConfirmedBoundary,status:input.lastConfirmedBoundary==="unknown"?"unknown":"confirmed"},
      {boundary:input.firstUnconfirmedBoundary,status:"unknown"},
    ]).map(h=>({boundary:token(h.boundary,"unknown"),status:HOP_STATUS.has(h.status)?h.status:"unknown"})),
  };
}
