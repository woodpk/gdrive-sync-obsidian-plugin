/**
 * Shared compile-time diagnostic schema for external runners and installed
 * validation-device adapters. Type-only imports have no executable runtime
 * or installed-bundle dependency.
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
  readonly identity: { readonly runId:string; readonly scenarioId:string;
    readonly stepIndex:number|null; readonly executionMode:"deterministic"|"windows-live"|"simulated-mobile"|"unknown";
    readonly correlationToken:string };
  readonly causeClass:string;
  readonly retriability:"safe-to-repeat"|"requires-reconciliation"|"not-applicable";
  readonly hops:readonly {readonly boundary:string;readonly status:"confirmed"|"not-observed"|"unknown"}[];
}
export type BvpDiagnosticInput = Omit<BvpDiagnostic, "schemaVersion"|"identity"|"causeClass"|"retriability"|"hops"> &
  Partial<Pick<BvpDiagnostic,"identity"|"causeClass"|"retriability"|"hops">>;
