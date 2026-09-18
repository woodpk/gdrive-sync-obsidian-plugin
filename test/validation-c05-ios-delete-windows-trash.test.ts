import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentHash,
  type OperationId,
  type PlanId,
  type RemoteObjectId,
  type SynchronizationPlan,
  type VaultPath,
} from "../src/contracts";
import {
  validationDeviceId,
  validationFixtureIdentity,
  validationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationProductionDriverRequest,
  ValidationProductionDriverResult,
} from "../src/validation/driver-plan-fault-verifier-contracts";
import type { ValidationFixtureDescriptor } from "../src/validation/fixture-manager";
import type { ValidationStateConvergenceRequest } from "../src/validation/state-convergence-verifier";
import {
  C05_C04_RENAMED_RELATIVE_PATH,
  C05_FIXTURE_ID,
  C05_SCENARIO_DEFINITION,
  C05_SCENARIO_REGISTRATION,
  executeC05Scenario,
  type C05ProductionDriverPort,
  type C05VerifierPort,
} from "../src/validation/scenarios/c05-ios-delete-windows-trash";

const run = validationRunIdentity("vh18-c05-test-run", "C05");
const mobileDeviceId = validationDeviceId("mobile-c05");
const windowsDeviceId = validationDeviceId("windows-c05");
const path = contractId<"VaultPath">(`__validation/${C05_C04_RENAMED_RELATIVE_PATH}`) as VaultPath;
const unrelatedPath = contractId<"VaultPath">("__validation/c05-unrelated.md") as VaultPath;
const remoteObjectId = contractId<"RemoteObjectId">("remote:c05-target") as RemoteObjectId;
const unrelatedRemoteObjectId = contractId<"RemoteObjectId">("remote:c05-unrelated") as RemoteObjectId;
const contentHash = contractId<"ContentHash">(`sha256:${"a".repeat(64)}`) as ContentHash;

function fixture(): ValidationFixtureDescriptor {
  return {
    identity: validationFixtureIdentity(run, C05_FIXTURE_ID),
    relativePath: C05_C04_RENAMED_RELATIVE_PATH,
    path,
    kind: "text",
    purpose: "deletion",
    version: 1,
    sizeBytes: 128,
    hash: contentHash,
  };
}

function operation(
  kind: "trash-remote" | "trash-local",
  targetPath: VaultPath,
  targetRemoteObjectId: RemoteObjectId | undefined,
  reason: string,
  index = 0,
) {
  return {
    operationId: contractId<"OperationId">(`operation:c05:${kind}:${index}`) as OperationId,
    kind,
    path: targetPath,
    targetSide: kind === "trash-remote" ? "remote" as const : "local" as const,
    ...(targetRemoteObjectId ? { remoteObjectId: targetRemoteObjectId } : {}),
    destructive: true,
    preconditions: [],
    reasons: [{ code: reason, summary: reason }],
  };
}

function plan(id: string, operations: SynchronizationPlan["operations"]): SynchronizationPlan {
  return {
    planId: contractId<"PlanId">(id) as PlanId,
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

class ScriptedProductionDriver implements C05ProductionDriverPort {
  readonly requests: ValidationProductionDriverRequest[] = [];
  constructor(private readonly planValue: SynchronizationPlan) {}

  async dispatch(request: ValidationProductionDriverRequest): Promise<ValidationProductionDriverResult> {
    this.requests.push(request);
    if (request.kind === "preview-manual") return { status: "plan-observed", run: request.run, plan: this.planValue };
    if (request.kind === "execute-asserted-plan") {
      return {
        status: "request-accepted",
        run: request.run,
        requestKind: "execute-asserted-plan",
        productionOutcomeEstablished: false,
      };
    }
    return {
      status: "request-rejected",
      run: request.run,
      reason: "Unexpected C05 test driver request.",
      productionOutcomeEstablished: false,
    };
  }
}

class CapturingVerifier implements C05VerifierPort {
  readonly requests: ValidationStateConvergenceRequest[] = [];
  constructor(private readonly verdicts: readonly ("pass" | "fail" | "blocked")[] = ["pass", "pass"]) {}

  async verify(request: ValidationStateConvergenceRequest): Promise<{ readonly result: { readonly verdict: "pass" | "fail" | "blocked" } }> {
    this.requests.push(request);
    return { result: { verdict: this.verdicts[this.requests.length - 1] ?? "blocked" } };
  }
}

function input(options: { mobile?: ScriptedProductionDriver; windows?: ScriptedProductionDriver; verifier?: CapturingVerifier } = {}) {
  const descriptor = fixture();
  const mobile = options.mobile ?? new ScriptedProductionDriver(plan(
    "plan:c05-mobile",
    [operation("trash-remote", path, remoteObjectId, "attested-local-deletion")],
  ));
  const windows = options.windows ?? new ScriptedProductionDriver(plan(
    "plan:c05-windows",
    [operation("trash-local", path, undefined, "attested-remote-deletion")],
  ));
  const verifier = options.verifier ?? new CapturingVerifier();
  let deleteCalls = 0;
  return {
    value: {
      run,
      mobileDeviceId,
      windowsDeviceId,
      trustedFixture: { descriptor, remoteObjectId },
      unrelated: {
        local: [{
          deviceId: windowsDeviceId,
          path: unrelatedPath,
          state: "file" as const,
          content: { hash: contentHash, sizeBytes: 128 },
        }],
        remote: [{
          path: unrelatedPath,
          state: "live" as const,
          remoteObjectId: unrelatedRemoteObjectId,
          content: { hash: contentHash, sizeBytes: 128 },
        }],
      },
      mobileFixtureManager: {
        async delete(fixtureId: string) {
          deleteCalls += 1;
          assert.equal(fixtureId, C05_FIXTURE_ID);
          return descriptor;
        },
      },
      mobileProduction: mobile,
      windowsProduction: windows,
      verifier,
    },
    mobile,
    windows,
    verifier,
    deleteCalls: () => deleteCalls,
  };
}

test("VH18 registers exactly one C05 definition with the required scenario sequence", () => {
  assert.equal(C05_SCENARIO_REGISTRATION.scenarioId, "C05");
  assert.equal(C05_SCENARIO_REGISTRATION.definition, C05_SCENARIO_DEFINITION);
  assert.equal(C05_SCENARIO_DEFINITION.scenarioId, "C05");
  assert.deepEqual(C05_SCENARIO_DEFINITION.prerequisiteIds, ["C04-pass", "c05-harness-owned-trusted-fixture"]);
  assert.deepEqual(
    C05_SCENARIO_DEFINITION.steps.map(step => [step.module, step.operation]),
    [
      ["fixture-manager", "c05-delete-mobile-fixture"],
      ["plan-assertion-engine", "c05-sync-mobile-delete"],
      ["cross-device-coordinator", "c05-handoff-to-windows"],
      ["plan-assertion-engine", "c05-sync-windows-delete"],
      ["state-convergence-verifier", "c05-verify-delete-convergence"],
      ["scenario-evidence-recorder", "c05-record-evidence"],
    ],
  );
});

test("VH18 C05 executes only the two attested production deletion plans and verifies final tombstone convergence", async () => {
  const h = input();
  const result = await executeC05Scenario(h.value);
  assert.equal(result.status, "completed");
  assert.equal(h.deleteCalls(), 1);
  assert.deepEqual(h.mobile.requests.map(request => request.kind), ["preview-manual", "execute-asserted-plan"]);
  assert.deepEqual(h.windows.requests.map(request => request.kind), ["preview-manual", "execute-asserted-plan"]);
  assert.equal(h.verifier.requests.length, 2);

  const interim = h.verifier.requests[0]!;
  assert.ok(interim.state.some(item => item.kind === "live-trash-absence-state" && item.expectedState === "trashed"));
  assert.ok(interim.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === mobileDeviceId
    && item.expected === "tombstone"
    && item.remoteObjectId === remoteObjectId
  ));
  assert.ok(interim.state.some(item =>
    item.kind === "terminal-product-result"
    && item.diagnostic.expectedFields?.operationKind === "trash-remote"
  ));

  const final = h.verifier.requests[1]!;
  assert.ok(final.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === mobileDeviceId
    && item.expected === "tombstone"
  ));
  assert.ok(final.state.some(item =>
    item.kind === "mapping-or-tombstone"
    && item.deviceId === windowsDeviceId
    && item.expected === "tombstone"
  ));
  assert.ok(final.state.some(item =>
    item.kind === "terminal-product-result"
    && item.diagnostic.expectedFields?.operationKind === "trash-local"
  ));
  assert.ok(final.state.some(item => item.kind === "unrelated-mutation-absence"));
  assert.ok(final.convergence.some(item =>
    item.kind === "cross-device-path"
    && item.expected === "absent"
    && item.deviceIds.includes(mobileDeviceId)
    && item.deviceIds.includes(windowsDeviceId)
  ));
  assert.ok(final.convergence.some(item =>
    item.kind === "cross-device-authority"
    && item.expectedTombstone === true
  ));
});

test("VH18 C05 hard-stops before production execution when a plan contains an unrelated destructive mutation", async () => {
  const unrelatedDeletePath = contractId<"VaultPath">("__validation/UNRELATED-DELETE.md") as VaultPath;
  const unrelatedDeleteId = contractId<"RemoteObjectId">("remote:c05-unrelated-delete") as RemoteObjectId;
  const mobile = new ScriptedProductionDriver(plan(
    "plan:c05-unsafe-mobile",
    [
      operation("trash-remote", path, remoteObjectId, "attested-local-deletion"),
      operation("trash-remote", unrelatedDeletePath, unrelatedDeleteId, "attested-local-deletion", 1),
    ],
  ));
  const h = input({ mobile });
  const result = await executeC05Scenario(h.value);

  assert.equal(result.status, "blocked");
  if (result.status === "blocked" || result.status === "failed") {
    assert.equal(result.phase, "mobile-plan");
    assert.ok(result.planFailures?.some(failure =>
      failure.kind === "unexpected-operation"
      || failure.kind === "destructive-expectation-mismatch"
    ));
  }
  assert.deepEqual(mobile.requests.map(request => request.kind), ["preview-manual"]);
  assert.equal(h.windows.requests.length, 0);
  assert.equal(h.verifier.requests.length, 0);
});

test("VH18 C05 refuses to start Windows deletion when remote-trash/tombstone proof is not observable", async () => {
  const verifier = new CapturingVerifier(["blocked"]);
  const h = input({ verifier });
  const result = await executeC05Scenario(h.value);

  assert.equal(result.status, "blocked");
  if (result.status === "blocked" || result.status === "failed") assert.equal(result.phase, "mobile-remote-trash-verification");
  assert.deepEqual(h.mobile.requests.map(request => request.kind), ["preview-manual", "execute-asserted-plan"]);
  assert.equal(h.windows.requests.length, 0);
  assert.equal(verifier.requests.length, 1);
});
