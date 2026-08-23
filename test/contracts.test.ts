import assert from "node:assert/strict";
import test from "node:test";
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

test("snapshot keeps unsafe uncertainty distinct from confirmed absence", () => {
  const snapshot: PathSnapshot = { path, local: { status: "unreadable", side: "local", path, reason: "denied" }, remote: { status: "unknown", side: "remote", path, reason: "not listed" }, base: { status: "trusted" }, remoteEnumeration: { status: "partial", reason: "interrupted" }, identity: { status: "unambiguous" } };
  assert.equal(snapshot.local.status, "unreadable"); assert.equal(snapshot.remoteEnumeration.status, "partial");
});
test("plan freezes required operation vocabulary", () => assert.deepEqual(PLAN_OPERATION_KINDS, ["noop","upload-create","upload-update","download-create","download-update","identity-preserving-move","clean-text-merge","unresolved-conflict","trash-local","trash-remote","blocked-unsafe","recovery-required"]));
test("Phase 2 can plan without live adapters", async () => assert.deepEqual(await new FakeSynchronizationPlanner(plan).plan({ snapshots: [], state: { status: "uninitialized" } as StateLoadResult }), plan));
test("local port is consumable through mobile-safe fake", async () => { const local = createLocalVaultFake(); assert.equal((await local.classifyConfiguration(path)).classification, "unknown"); assert.equal((await local.enumerate()).completeness.status, "complete"); });
test("Drive contract freezes drive.file and separates auth from identity", async () => {
  assert.equal(REQUIRED_DRIVE_SCOPE, "https://www.googleapis.com/auth/drive.file");
  const identity: ManagedRemoteIdentity = { rootId: remoteId, vaultIdentity: vaultId, protocolVersion: protocol };
  const drive = createGoogleDriveFake({ authenticationState: async () => ({ status: "authenticated" }), validateManagedRoot: async () => ({ ok: true, value: { status: "valid", identity } }) });
  assert.equal((await drive.authenticationState()).status, "authenticated"); assert.equal((await drive.validateManagedRoot(identity)).ok, true);
});
test("Drive listing can be explicitly partial", async () => { const drive = createGoogleDriveFake({ listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "partial", reason: "interrupted" } } }) }); const r = await drive.listForReconciliation(remoteId); assert.equal(r.ok && r.value.completeness.status, "partial"); });
test("state distinguishes new install from expected-state recovery", async () => { const store = new InMemorySynchronizationStateStore(); assert.equal((await store.load({ expectation: "new-installation" })).status, "uninitialized"); store.loadResult = { status: "recovery-required", reason: "expected-state-missing" }; assert.equal((await store.load({ expectation: "existing-pairing" })).status, "recovery-required"); });
test("conflict contract has no newest-wins result", () => { const kinds: ConflictAssessment["kind"][] = ["none","clean-merge","unresolved-text","opaque-binary","delete-vs-modify"]; assert.equal(kinds.includes("newest-wins" as never), false); });
test("execution distinguishes every required outcome", () => { const states: ExecutionResult["status"][] = ["durable-verified-success","retryable-failure","blocking-failure","stale-precondition","cancelled","uncertain","recovery-required"]; assert.equal(new Set(states).size, 7); });
test("authoritative commit requires verified durable receipt", async () => { const c = new RecordingSuccessCommitter(); await c.commitVerifiedSuccess(operation, { operationId, durable: true, integrityVerified: true }); assert.equal(c.commits[0].receipt.integrityVerified, true); });
test("status/action surface contains required states and no force-sync", async () => { const states: SynchronizationStatus["kind"][] = ["idle-ready","planning","syncing","offline-deferred","authentication-required","paused","conflict-present","destructive-plan-blocked","recovery-required","error"]; assert.equal(states.length,10); const c = new RecordingProductControl(); const actions: UserAction[] = [{kind:"execute-plan",planId},{kind:"resolve-conflict",conflictId,resolution:{kind:"keep-both"}},{kind:"approve-destructive-plan",planId,recoveryCheckpointId:checkpointId},{kind:"pause"},{kind:"resume"},{kind:"verify-reconcile-vault"},{kind:"cancel-active-sync"}]; for (const action of actions) await c.request(action); assert.equal(c.actions.some(a => (a.kind as string) === "force-sync"), false); assert.deepEqual(c.audit,[]); });
