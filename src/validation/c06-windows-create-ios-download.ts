import {
  PLAN_OPERATION_KINDS,
  type PlanOperationKind,
} from "../contracts";
import {
  type ValidationConvergenceAssertion,
  type ValidationPlanAssertionResult,
  type ValidationStateAssertion,
  validationAssertionId,
  validationPlanExpectation,
} from "./driver-plan-fault-verifier-contracts";
import {
  ValidationFixtureManager,
  type ValidationFixtureDescriptor,
  validationTextFixture,
} from "./fixture-manager";
import { assertValidationPlan } from "./plan-assertion-engine";
import type { ValidationProductionPathDriver } from "./production-path-driver";
import {
  StateConvergenceVerifier,
  type ValidationStateConvergenceReport,
  type ValidationStateConvergenceRequest,
} from "./state-convergence-verifier";
import {
  type ValidationDeviceId,
  type ValidationRunIdentity,
  type ValidationScenarioId,
  validationStepId,
} from "./run-sandbox-checkpoint-contracts";

export const C06_SCENARIO_ID: ValidationScenarioId = "C06";
export const C06_FIXTURE_ID = "c06-windows-create" as const;
export const C06_FIXTURE_RELATIVE_PATH = "test-win-c06.md" as const;

export type C06FixtureManager = Pick<ValidationFixtureManager, "create" | "hash">;
export type C06ProductionDriver = Pick<ValidationProductionPathDriver, "dispatch">;
export type C06StateVerifier = Pick<StateConvergenceVerifier, "verify">;

export interface C06WindowsCreateMobileDownloadOptions {
  readonly run: ValidationRunIdentity;
  readonly windowsDeviceId: ValidationDeviceId;
  readonly mobileDeviceId: ValidationDeviceId;
  readonly windowsFixture: C06FixtureManager;
  readonly windowsProduction: C06ProductionDriver;
  readonly mobileProduction: C06ProductionDriver;
  readonly verifier: C06StateVerifier;
}

export type C06ScenarioStage =
  | "identity"
  | "fixture"
  | "windows-plan"
  | "windows-execution"
  | "remote-single-object"
  | "mobile-plan"
  | "mobile-execution"
  | "convergence";

export type C06ScenarioResult =
  | {
      readonly status: "PASS";
      readonly run: ValidationRunIdentity;
      readonly fixture: ValidationFixtureDescriptor;
      readonly remoteVerification: ValidationStateConvergenceReport;
      readonly convergenceVerification: ValidationStateConvergenceReport;
    }
  | {
      readonly status: "FAIL" | "BLOCKED";
      readonly run: ValidationRunIdentity;
      readonly stage: C06ScenarioStage;
      readonly summary: string;
    };

function stateAssertion(
  id: string,
  kind: ValidationStateAssertion["kind"],
  subject: string,
  expectation: string,
): ValidationStateAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject,
    expectation,
  });
}

function convergenceAssertion(
  id: string,
  kind: ValidationConvergenceAssertion["kind"],
  subject: string,
  expectation: string,
): ValidationConvergenceAssertion {
  return Object.freeze({
    assertionId: validationAssertionId(id),
    kind,
    subject,
    expectation,
  });
}

function forbiddenKinds(expected: PlanOperationKind): readonly PlanOperationKind[] {
  return Object.freeze(
    PLAN_OPERATION_KINDS.filter(kind => kind !== expected && kind !== "noop"),
  );
}

function planExpectation(
  run: ValidationRunIdentity,
  path: ValidationFixtureDescriptor["path"],
  expectedKind: "upload-create" | "download-create",
) {
  return validationPlanExpectation({
    run,
    expectedTrigger: "manual",
    expectedOperations: Object.freeze([
      Object.freeze({
        kind: expectedKind,
        path,
        destructive: false,
      }),
    ]),
    allowedBackgroundKinds: Object.freeze(["noop"]),
    forbiddenKinds: forbiddenKinds(expectedKind),
    conflictExpectation: "forbidden",
    destructiveExpectation: "forbidden",
  });
}

function planMismatchSummary(result: Extract<ValidationPlanAssertionResult, { readonly status: "mismatch" }>): string {
  return result.failures.map(failure => failure.summary).join(" | ");
}

async function previewAssertAndExecute(input: {
  readonly stage: "windows" | "mobile";
  readonly run: ValidationRunIdentity;
  readonly path: ValidationFixtureDescriptor["path"];
  readonly expectedKind: "upload-create" | "download-create";
  readonly driver: C06ProductionDriver;
}): Promise<
  | { readonly status: "completed" }
  | { readonly status: "FAIL" | "BLOCKED"; readonly stage: C06ScenarioStage; readonly summary: string }
> {
  const planStage: C06ScenarioStage = input.stage === "windows" ? "windows-plan" : "mobile-plan";
  const executionStage: C06ScenarioStage = input.stage === "windows" ? "windows-execution" : "mobile-execution";
  const previewStepId = validationStepId(`c06-${input.stage}-preview`);
  const executeStepId = validationStepId(`c06-${input.stage}-execute`);

  const preview = await input.driver.dispatch({
    kind: "preview-manual",
    run: input.run,
    stepId: previewStepId,
  });
  if (preview.status !== "plan-observed") {
    return {
      status: "BLOCKED",
      stage: planStage,
      summary: `C06 ${input.stage} production preview did not yield an observable plan.`,
    };
  }

  const assertion = assertValidationPlan({
    assertionId: `c06-${input.stage}-plan`,
    expectation: planExpectation(input.run, input.path, input.expectedKind),
    plan: preview.plan,
  });
  if (assertion.status === "mismatch") {
    return {
      status: "FAIL",
      stage: planStage,
      summary: `C06 ${input.stage} plan hard-stop: ${planMismatchSummary(assertion)}`,
    };
  }

  const execution = await input.driver.dispatch({
    kind: "execute-asserted-plan",
    run: input.run,
    stepId: executeStepId,
    authorization: assertion.authorization,
  });
  if (execution.status !== "request-accepted") {
    return {
      status: "BLOCKED",
      stage: executionStage,
      summary: `C06 ${input.stage} production execution request was not accepted.`,
    };
  }

  return { status: "completed" };
}

function verificationStop(
  run: ValidationRunIdentity,
  stage: "remote-single-object" | "convergence",
  report: ValidationStateConvergenceReport,
): C06ScenarioResult | undefined {
  if (report.result.verdict === "pass") return undefined;
  return {
    status: report.result.verdict === "fail" ? "FAIL" : "BLOCKED",
    run,
    stage,
    summary: report.result.verdict === "fail"
      ? `C06 ${stage} verification failed.`
      : `C06 ${stage} verification could not establish all required proof.`,
  };
}

function preMobileVerificationRequest(
  run: ValidationRunIdentity,
  windowsDeviceId: ValidationDeviceId,
  fixture: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  if (!fixture.hash) throw new Error("C06 text fixture must expose its deterministic content hash.");
  const content = Object.freeze({ hash: fixture.hash, sizeBytes: fixture.sizeBytes });
  return {
    run,
    state: [
      {
        kind: "remote-content",
        assertion: stateAssertion(
          "c06.remote.single-object",
          "remote-content",
          String(fixture.path),
          "Exactly one live remote object exists at the C06 fixture path with the deterministic bytes/hash.",
        ),
        path: fixture.path,
        content,
      },
      {
        kind: "local-content",
        assertion: stateAssertion(
          "c06.windows.source-content",
          "local-content",
          String(fixture.path),
          "Windows still contains the deterministic C06 fixture bytes/hash before mobile handoff.",
        ),
        deviceId: windowsDeviceId,
        path: fixture.path,
        content,
      },
    ],
    convergence: [
      {
        kind: "cross-device-path",
        assertion: convergenceAssertion(
          "c06.windows.source-path",
          "cross-device-path",
          String(fixture.path),
          "The Windows source path remains a file before the mobile download.",
        ),
        deviceIds: [windowsDeviceId],
        path: fixture.path,
        expected: "file",
      },
    ],
  };
}

function finalVerificationRequest(
  run: ValidationRunIdentity,
  windowsDeviceId: ValidationDeviceId,
  mobileDeviceId: ValidationDeviceId,
  fixture: ValidationFixtureDescriptor,
): ValidationStateConvergenceRequest {
  if (!fixture.hash) throw new Error("C06 text fixture must expose its deterministic content hash.");
  const content = Object.freeze({ hash: fixture.hash, sizeBytes: fixture.sizeBytes });
  const localContent = (deviceId: ValidationDeviceId, suffix: string) => ({
    kind: "local-content" as const,
    assertion: stateAssertion(
      `c06.${suffix}.content`,
      "local-content",
      String(fixture.path),
      "Participant contains the exact deterministic C06 fixture bytes/hash.",
    ),
    deviceId,
    path: fixture.path,
    content,
  });
  const baseAuthority = (deviceId: ValidationDeviceId, suffix: string) => ({
    kind: "base-authority" as const,
    assertion: stateAssertion(
      `c06.${suffix}.base`,
      "base-authority",
      String(fixture.path),
      "Participant trusted BASE contains the converged C06 content evidence.",
    ),
    deviceId,
    path: fixture.path,
    expectedContent: content,
  });
  const mapping = (deviceId: ValidationDeviceId, suffix: string) => ({
    kind: "mapping-or-tombstone" as const,
    assertion: stateAssertion(
      `c06.${suffix}.mapping`,
      "mapping-or-tombstone",
      String(fixture.path),
      "Participant has one live file mapping and no tombstone for C06.",
    ),
    deviceId,
    path: fixture.path,
    expected: "mapping" as const,
    entityKind: "file" as const,
  });
  const noOutstandingEffects = (deviceId: ValidationDeviceId, suffix: string) => ({
    kind: "durable-intent-or-effect" as const,
    assertion: stateAssertion(
      `c06.${suffix}.no-outstanding-effects`,
      "durable-intent-or-effect",
      String(fixture.path),
      "No durable mutation effect remains outstanding after C06 convergence.",
    ),
    deviceId,
    expected: "none-outstanding" as const,
  });

  return {
    run,
    state: [
      localContent(windowsDeviceId, "windows"),
      localContent(mobileDeviceId, "mobile"),
      {
        kind: "remote-content",
        assertion: stateAssertion(
          "c06.remote.final-single-object",
          "remote-content",
          String(fixture.path),
          "Exactly one live remote object remains at the C06 path with matching bytes/hash.",
        ),
        path: fixture.path,
        content,
      },
      baseAuthority(windowsDeviceId, "windows"),
      baseAuthority(mobileDeviceId, "mobile"),
      mapping(windowsDeviceId, "windows"),
      mapping(mobileDeviceId, "mobile"),
      noOutstandingEffects(windowsDeviceId, "windows"),
      noOutstandingEffects(mobileDeviceId, "mobile"),
    ],
    convergence: [
      {
        kind: "cross-device-content",
        assertion: convergenceAssertion(
          "c06.cross-device.content",
          "cross-device-content",
          String(fixture.path),
          "Windows and mobile contain identical deterministic C06 bytes/hash.",
        ),
        deviceIds: [windowsDeviceId, mobileDeviceId],
        path: fixture.path,
        content,
      },
      {
        kind: "cross-device-path",
        assertion: convergenceAssertion(
          "c06.cross-device.path",
          "cross-device-path",
          String(fixture.path),
          "C06 exists as one file path on both participants.",
        ),
        deviceIds: [windowsDeviceId, mobileDeviceId],
        path: fixture.path,
        expected: "file",
      },
      {
        kind: "cross-device-authority",
        assertion: convergenceAssertion(
          "c06.cross-device.authority",
          "cross-device-authority",
          String(fixture.path),
          "Both participants converge without a C06 tombstone; BASE/mapping assertions establish live authority.",
        ),
        deviceIds: [windowsDeviceId, mobileDeviceId],
        path: fixture.path,
        expectedTombstone: false,
      },
    ],
  };
}

/**
 * Executable H7 adapter for the authoritative C06 live-validation package.
 *
 * This class owns scenario orchestration only. Fixture mutation, production
 * planning/execution, and postcondition verification remain delegated to the
 * already-approved harness module owners.
 */
export class C06WindowsCreateMobileDownloadScenario {
  public constructor(private readonly options: C06WindowsCreateMobileDownloadOptions) {}

  public async run(): Promise<C06ScenarioResult> {
    const { run } = this.options;
    if (run.scenarioId !== C06_SCENARIO_ID) {
      return {
        status: "BLOCKED",
        run,
        stage: "identity",
        summary: `C06 adapter refuses scenario identity ${String(run.scenarioId)}.`,
      };
    }

    let fixture: ValidationFixtureDescriptor;
    try {
      fixture = await this.options.windowsFixture.create(
        validationTextFixture(C06_FIXTURE_ID, C06_FIXTURE_RELATIVE_PATH),
      );
      const actualHash = await this.options.windowsFixture.hash(C06_FIXTURE_ID);
      if (!fixture.hash || actualHash !== fixture.hash) {
        return {
          status: "FAIL",
          run,
          stage: "fixture",
          summary: "C06 deterministic Windows fixture hash did not match its descriptor.",
        };
      }
    } catch (error) {
      return {
        status: "BLOCKED",
        run,
        stage: "fixture",
        summary: error instanceof Error && error.message.trim().length > 0
          ? `C06 fixture setup blocked: ${error.message}`
          : "C06 fixture setup blocked without a concrete error reason.",
      };
    }

    const windows = await previewAssertAndExecute({
      stage: "windows",
      run,
      path: fixture.path,
      expectedKind: "upload-create",
      driver: this.options.windowsProduction,
    });
    if (windows.status !== "completed") return { ...windows, run };

    const remoteVerification = await this.options.verifier.verify(
      preMobileVerificationRequest(run, this.options.windowsDeviceId, fixture),
    );
    const remoteStop = verificationStop(run, "remote-single-object", remoteVerification);
    if (remoteStop) return remoteStop;

    const mobile = await previewAssertAndExecute({
      stage: "mobile",
      run,
      path: fixture.path,
      expectedKind: "download-create",
      driver: this.options.mobileProduction,
    });
    if (mobile.status !== "completed") return { ...mobile, run };

    const convergenceVerification = await this.options.verifier.verify(
      finalVerificationRequest(
        run,
        this.options.windowsDeviceId,
        this.options.mobileDeviceId,
        fixture,
      ),
    );
    const convergenceStop = verificationStop(run, "convergence", convergenceVerification);
    if (convergenceStop) return convergenceStop;

    return {
      status: "PASS",
      run,
      fixture,
      remoteVerification,
      convergenceVerification,
    };
  }
}
