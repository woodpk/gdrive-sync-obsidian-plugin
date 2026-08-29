import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type BaseEntry, type ContentHash, type DeviceIdentity, type PathSnapshot, type RemoteObjectId, type StateRevision, type TrustedSynchronizationState, type VaultIdentity, type VaultPath } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DestructiveSafetyPolicy } from "../src/core/destructive-safety";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";

const path = (s: string) => contractId<"VaultPath">(s) as VaultPath;
const hash = (s: string) => contractId<"ContentHash">(s) as ContentHash;
const remoteId = (s: string) => contractId<"RemoteObjectId">(s) as RemoteObjectId;
const vaultId = contractId<"VaultIdentity">("vault") as VaultIdentity;
const deviceId = contractId<"DeviceIdentity">("device") as DeviceIdentity;
const revision = contractId<"StateRevision">("state-1") as StateRevision;
const resolver = new ThreeWayConflictResolver({ readText: async version => version.content?.revision });
const planner = new DeterministicSynchronizationPlanner(resolver);

function base(p: VaultPath, h: string, id?: RemoteObjectId): BaseEntry {
  return { path: p, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: hash(h), revision: h }, remoteObjectId: id };
}
function trusted(entries: readonly BaseEntry[] = [], stale = false): { status: "trusted"; state: TrustedSynchronizationState } {
  return { status: "trusted", state: { schemaVersion: 1, stateRevision: revision, vaultIdentity: vaultId, deviceIdentity: deviceId, base: entries, remoteMappings: [], tombstones: [], operations: [], knownDevices: [{ deviceId, stale }] } };
}
function snap(p: VaultPath, local: "absent" | string, remote: "absent" | string, b?: BaseEntry, options: { complete?: boolean; localStatus?: "unreadable" | "inaccessible" | "unknown"; identity?: "ambiguous" | "blocked"; localRemoteId?: RemoteObjectId; remoteRemoteId?: RemoteObjectId; localTime?: number; remoteTime?: number; tombstone?: boolean } = {}): PathSnapshot {
  const localObservation = options.localStatus
    ? { status: options.localStatus, side: "local" as const, path: p, reason: "uncertain" }
    : local === "absent"
      ? { status: "absent" as const, side: "local" as const, path: p }
      : { status: "present" as const, side: "local" as const, path: p, entityKind: "file" as const, content: { hash: hash(local), revision: local, advisoryModifiedTimeMs: options.localTime }, stability: "stable" as const, remoteObjectId: options.localRemoteId };
  const remoteObservation = remote === "absent"
    ? { status: "absent" as const, side: "remote" as const, path: p }
    : { status: "present" as const, side: "remote" as const, path: p, entityKind: "file" as const, content: { hash: hash(remote), revision: remote, advisoryModifiedTimeMs: options.remoteTime }, stability: "stable" as const, remoteObjectId: options.remoteRemoteId };
  return {
    path: p,
    local: localObservation,
    remote: remoteObservation,
    base: b ? { status: "trusted", entry: b, ...(options.tombstone ? { tombstone: { path: p, entityKind: "file", deletedOn: "both" as const, sourceDeviceId: deviceId } } : {}) } : { status: "uninitialized" },
    remoteEnumeration: options.complete === false ? { status: "partial", reason: "partial" } : { status: "complete" },
    identity: options.identity ? { status: options.identity, reason: "ambiguous" } : { status: "unambiguous" },
  };
}

const matrix: Array<[string, PathSnapshot, ReturnType<typeof trusted> | { status: "uninitialized" }, string]> = [
  ["fresh local only uploads", snap(path("a.md"), "L", "absent"), { status: "uninitialized" }, "upload-create"],
  ["fresh remote only downloads", snap(path("b.md"), "absent", "R"), { status: "uninitialized" }, "download-create"],
  ["equal no-base collision is noop", snap(path("c.md"), "X", "X"), { status: "uninitialized" }, "noop"],
  ["divergent no-base collision conflicts", snap(path("d.md"), "L", "R"), { status: "uninitialized" }, "unresolved-conflict"],
];
for (const [name, snapshot, state, expected] of matrix) test(name, async () => assert.equal((await planner.plan({ snapshots: [snapshot], state })).operations[0].kind, expected));

test("trusted matrix distinguishes local, remote, and concurrent change", async () => {
  const p = path("m.md"); const b = base(p, "B");
  assert.equal((await planner.plan({ snapshots: [snap(p, "L", "B", b)], state: trusted([b]) })).operations[0].kind, "upload-update");
  assert.equal((await planner.plan({ snapshots: [snap(p, "B", "R", b)], state: trusted([b]) })).operations[0].kind, "download-update");
  assert.equal((await planner.plan({ snapshots: [snap(p, "L", "R", b)], state: trusted([b]) })).operations[0].kind, "unresolved-conflict");
});

test("clock skew alone never changes classification", async () => {
  const p = path("clock.bin"); const b = base(p, "B");
  const first = await planner.plan({ snapshots: [snap(p, "L", "R", b, { localTime: 999999, remoteTime: 1 })], state: trusted([b]) });
  const second = await planner.plan({ snapshots: [snap(p, "L", "R", b, { localTime: 1, remoteTime: 999999 })], state: trusted([b]) });
  assert.equal(first.operations[0].kind, second.operations[0].kind);
  assert.equal(first.operations[0].kind, "unresolved-conflict");
});

test("attested deletions require trustworthy prior two-sided state", async () => {
  const p = path("delete.md"); const b = base(p, "B");
  assert.equal((await planner.plan({ snapshots: [snap(p, "absent", "B", b)], state: trusted([b]) })).operations[0].kind, "trash-remote");
  assert.equal((await planner.plan({ snapshots: [snap(p, "B", "absent", b)], state: trusted([b]) })).operations[0].kind, "trash-local");
  assert.equal((await planner.plan({ snapshots: [snap(p, "absent", "B")], state: { status: "uninitialized" } })).operations[0].kind, "download-create");
});

test("delete-vs-modify preserves modification as conflict", async () => {
  const p = path("delete-modify.md"); const b = base(p, "B");
  assert.equal((await planner.plan({ snapshots: [snap(p, "absent", "R", b)], state: trusted([b]) })).operations[0].kind, "unresolved-conflict");
  assert.equal((await planner.plan({ snapshots: [snap(p, "L", "absent", b)], state: trusted([b]) })).operations[0].kind, "unresolved-conflict");
});

test("uncertain local access and incomplete remote absence cannot authorize deletion", async () => {
  const p = path("unsafe.md"); const b = base(p, "B");
  assert.equal((await planner.plan({ snapshots: [snap(p, "absent", "B", b, { localStatus: "unreadable" })], state: trusted([b]) })).operations[0].kind, "blocked-unsafe");
  assert.equal((await planner.plan({ snapshots: [snap(p, "B", "absent", b, { complete: false })], state: trusted([b]) })).operations[0].kind, "blocked-unsafe");
});

test("missing or corrupt operational state enters recovery planning", async () => {
  const p = path("recover.md");
  const plan = await planner.plan({ snapshots: [snap(p, "L", "R")], state: { status: "recovery-required", reason: "integrity-check-failed" } });
  assert.equal(plan.operations[0].kind, "recovery-required");
  assert.equal(plan.executionDisposition, "blocked");
});

test("identity ambiguity is blocked and never guessed", async () => {
  const p = path("ambiguous.md");
  assert.equal((await planner.plan({ snapshots: [snap(p, "L", "R", undefined, { identity: "ambiguous" })], state: { status: "uninitialized" } })).operations[0].kind, "blocked-unsafe");
});

test("stable remote object ID proves an identity-preserving remote move", async () => {
  const old = path("old.md"); const moved = path("folder/new.md"); const rid = remoteId("drive-1"); const b = base(old, "B", rid);
  const oldSnap = snap(old, "B", "absent", b, { remoteRemoteId: rid });
  const movedSnap = snap(moved, "absent", "B", undefined, { remoteRemoteId: rid });
  const plan = await planner.plan({ snapshots: [oldSnap, movedSnap], state: trusted([b]) });
  assert.equal(plan.operations[0].kind, "identity-preserving-move");
  assert.equal(plan.operations[0].fromPath, old);
  assert.equal(plan.operations[0].toPath, moved);
});

test("ambiguous stable remote identity is blocked rather than reassigned", async () => {
  const old = path("old-ambiguous.md"); const rid = remoteId("drive-ambiguous"); const b = base(old, "B", rid);
  const plan = await planner.plan({
    snapshots: [
      snap(old, "B", "absent", b),
      snap(path("candidate-a.md"), "absent", "B", undefined, { remoteRemoteId: rid }),
      snap(path("candidate-b.md"), "absent", "B", undefined, { remoteRemoteId: rid }),
    ],
    state: trusted([b]),
  });
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0].kind, "blocked-unsafe");
  assert.equal(plan.operations[0].reasons[0].code, "ambiguous-remote-move");
});

test("unique trusted content hash proves local move while duplicate candidates are blocked", async () => {
  const old = path("old-local.md"); const rid = remoteId("drive-local"); const b = base(old, "B", rid);
  const unique = await planner.plan({
    snapshots: [snap(old, "absent", "B", b, { remoteRemoteId: rid }), snap(path("renamed.md"), "B", "absent")],
    state: trusted([b]),
  });
  assert.equal(unique.operations[0].kind, "identity-preserving-move");
  assert.equal(unique.operations[0].targetSide, "remote");

  const ambiguous = await planner.plan({
    snapshots: [
      snap(old, "absent", "B", b, { remoteRemoteId: rid }),
      snap(path("copy-a.md"), "B", "absent"),
      snap(path("copy-b.md"), "B", "absent"),
    ],
    state: trusted([b]),
  });
  assert.equal(ambiguous.operations.length, 1);
  assert.equal(ambiguous.operations[0].kind, "blocked-unsafe");
  assert.equal(ambiguous.operations[0].reasons[0].code, "ambiguous-local-move");
});

test("tombstone plus stale known device blocks resurrection", async () => {
  const p = path("gone.md"); const b = base(p, "B");
  const initial = trusted([b], true);
  const state = { ...initial, state: { ...initial.state, tombstones: [{ path: p, entityKind: "file" as const, deletedOn: "both" as const, sourceDeviceId: deviceId }] } };
  const s = snap(p, "L", "R", b, { tombstone: true });
  assert.equal((await planner.plan({ snapshots: [s], state })).operations[0].kind, "blocked-unsafe");
});

test("current stale device cannot authorize destructive propagation", async () => {
  const p = path("stale-delete.md"); const b = base(p, "B");
  const result = await planner.plan({ snapshots: [snap(p, "absent", "B", b)], state: trusted([b], true) });
  assert.equal(result.operations[0].kind, "blocked-unsafe");
  assert.equal(result.operations[0].reasons[0].code, "stale-device-destructive-gate");
  assert.equal(result.executionDisposition, "requires-user-approval");
  assert.equal(result.globalExecutionGate, "none");
});

test("ordinary deletion stays auto-eligible while suspicious deletion requires checkpoint", async () => {
  const smallPath = path("small.md"); const smallBase = base(smallPath, "B");
  const conservative = new DeterministicSynchronizationPlanner(resolver, new DestructiveSafetyPolicy({ absoluteDestructiveLimit: 3, affectedFractionLimit: 0.5, abnormalMultiple: 3 }));
  const small = await conservative.plan({ snapshots: [snap(smallPath, "absent", "B", smallBase), ...Array.from({ length: 9 }, (_, i) => snap(path(`keep-${i}.md`), "K", "K"))], state: trusted([smallBase]) });
  assert.equal(small.executionDisposition, "safe-auto-eligible");
  const bases = Array.from({ length: 4 }, (_, i) => base(path(`delete-${i}.md`), "B"));
  const large = await conservative.plan({ snapshots: bases.map(b => snap(b.path, "absent", "B", b)), state: trusted(bases) });
  assert.equal(large.executionDisposition, "requires-user-approval");
  assert.equal(large.recoveryCheckpointRequired, true);
});
