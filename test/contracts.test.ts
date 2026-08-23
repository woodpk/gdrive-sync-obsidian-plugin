import { describe, expect, it } from "vitest";
import { PLAN_OPERATION_KINDS, REQUIRED_DRIVE_SCOPE, contractId, type ConflictAssessment, type ExecutionResult, type ManagedRemoteIdentity, type PathSnapshot, type PlannedOperation, type StateLoadResult, type SynchronizationPlan, type SynchronizationStatus, type UserAction } from "../src/contracts";
import { FakeSynchronizationPlanner, InMemorySynchronizationStateStore, RecordingProductControl, RecordingSuccessCommitter, createGoogleDriveFake, createLocalVaultFake } from "../src/testing/fakes";

const path = contractId<"VaultPath">("10-Notes/example.md");
const planId = contractId<"PlanId">("plan-1");
const operationId = contractId<"OperationId">("op-1");
const remoteId = contractId<"RemoteObjectId">("drive-file-1");
const vaultId = contractId<"VaultIdentity">("brain-vault-1");
const protocol = contractId<"ProtocolVersion">("1");
const checkpointId = contractId<"CheckpointId">("checkpoint-1");
const conflictId = contractId<"ConflictId">("conflict-1");
const operation: PlannedOperation = { operationId, kind: "noop", path, destructive: false, preconditions: [{ kind: "identity-unambiguous", path }], reasons: [{ code: "test", summary: "fixture" }] };
const plan: SynchronizationPlan = { planId, trigger: "manual", operations: [operation], executionDisposition: "safe-auto-eligible", recoveryCheckpointRequired: false };

describe("snapshot/observation", () => {
  it("keeps deletion-safe uncertainty distinct from confirmed absence", () => {
    const snapshot: PathSnapshot = { path, local: { status: "unreadable", side: "local", path, reason: "denied" }, remote: { status: "unknown", side: "remote", path, reason: "not listed" }, base: { status: "trusted" }, remoteEnumeration: { status: "partial", reason: "interrupted" }, identity: { status: "unambiguous" } };
    expect(snapshot.local.status).toBe("unreadable"); expect(snapshot.remoteEnumeration.status).toBe("partial");
  });
});
describe("plan", () => {
  it("freezes the complete operation vocabulary", () => expect(PLAN_OPERATION_KINDS).toEqual(["noop","upload-create","upload-update","download-create","download-update","identity-preserving-move","clean-text-merge","unresolved-conflict","trash-local","trash-remote","blocked-unsafe","recovery-required"]));
  it("lets Phase 2 plan without live adapters", async () => expect(await new FakeSynchronizationPlanner(plan).plan({ snapshots: [], state: { status: "uninitialized" } as StateLoadResult })).toEqual(plan));
});
describe("local port", () => {
  it("is consumable through a mobile-safe fake", async () => { const local = createLocalVaultFake(); expect((await local.classifyConfiguration(path)).classification).toBe("unknown"); expect((await local.enumerate()).completeness.status).toBe("complete"); });
});
describe("Drive port", () => {
  it("freezes drive.file and separates auth from remote identity", async () => {
    expect(REQUIRED_DRIVE_SCOPE).toBe("https://www.googleapis.com/auth/drive.file");
    const identity: ManagedRemoteIdentity = { rootId: remoteId, vaultIdentity: vaultId, protocolVersion: protocol };
    const drive = createGoogleDriveFake({ authenticationState: async () => ({ status: "authenticated" }), validateManagedRoot: async () => ({ ok: true, value: { status: "valid", identity } }) });
    expect((await drive.authenticationState()).status).toBe("authenticated"); expect((await drive.validateManagedRoot(identity)).ok).toBe(true);
  });
  it("represents partial reconciliation listing explicitly", async () => { const drive = createGoogleDriveFake({ listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "partial", reason: "interrupted" } } }) }); const r = await drive.listForReconciliation(remoteId); expect(r.ok && r.value.completeness.status).toBe("partial"); });
});
describe("durable state", () => {
  it("distinguishes new installation from missing expected state", async () => { const store = new InMemorySynchronizationStateStore(); expect((await store.load({ expectation: "new-installation" })).status).toBe("uninitialized"); store.loadResult = { status: "recovery-required", reason: "expected-state-missing" }; expect((await store.load({ expectation: "existing-pairing" })).status).toBe("recovery-required"); });
});
describe("conflict", () => {
  it("has no timestamp-winner outcome", () => { const kinds: ConflictAssessment["kind"][] = ["none","clean-merge","unresolved-text","opaque-binary","delete-vs-modify"]; expect(kinds).not.toContain("newest-wins"); });
});
describe("execution/commit", () => {
  it("distinguishes required result states", () => { const states: ExecutionResult["status"][] = ["durable-verified-success","retryable-failure","blocking-failure","stale-precondition","cancelled","uncertain","recovery-required"]; expect(new Set(states).size).toBe(7); });
  it("commits only a durable verified receipt", async () => { const c = new RecordingSuccessCommitter(); await c.commitVerifiedSuccess(operation, { operationId, durable: true, integrityVerified: true }); expect(c.commits[0].receipt.integrityVerified).toBe(true); });
});
describe("status/audit/actions", () => {
  it("represents all required statuses", () => { const s: SynchronizationStatus["kind"][] = ["idle-ready","planning","syncing","offline-deferred","authentication-required","paused","conflict-present","destructive-plan-blocked","recovery-required","error"]; expect(s).toHaveLength(10); });
  it("routes actions through control port with no force-sync", async () => { const c = new RecordingProductControl(); const a: UserAction[] = [{kind:"execute-plan",planId},{kind:"resolve-conflict",conflictId,resolution:{kind:"keep-both"}},{kind:"approve-destructive-plan",planId,recoveryCheckpointId:checkpointId},{kind:"pause"},{kind:"resume"},{kind:"verify-reconcile-vault"},{kind:"cancel-active-sync"}]; for (const x of a) await c.request(x); expect(c.actions.map(x => x.kind)).not.toContain("force-sync"); expect(c.audit).toEqual([]); });
});
