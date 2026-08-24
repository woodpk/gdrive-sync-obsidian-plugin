import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type BaseEntry, type ContentHash, type PathSnapshot, type StateRevision, type TrustedSynchronizationState, type VaultIdentity, type VaultPath, type DeviceIdentity } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";

const p = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const h = (value: string) => contractId<"ContentHash">(value) as ContentHash;
const vault = contractId<"VaultIdentity">("vault") as VaultIdentity;
const device = contractId<"DeviceIdentity">("device") as DeviceIdentity;
const revision = contractId<"StateRevision">("state-1") as StateRevision;
const planner = new DeterministicSynchronizationPlanner(new ThreeWayConflictResolver({ readText: async version => version.content?.revision }));

function trusted(base: readonly BaseEntry[]): { status: "trusted"; state: TrustedSynchronizationState } {
  return { status: "trusted", state: { schemaVersion: 1, stateRevision: revision, vaultIdentity: vault, deviceIdentity: device, base, remoteMappings: [], tombstones: [], operations: [], knownDevices: [{ deviceId: device, stale: false }] } };
}
function absent(path: VaultPath, base: PathSnapshot["base"], completeness: PathSnapshot["remoteEnumeration"] = { status: "complete" }): PathSnapshot {
  return { path, local: { status: "absent", side: "local", path }, remote: { status: "absent", side: "remote", path }, base, remoteEnumeration: completeness, identity: { status: "unambiguous" } };
}

test("both attested deleted and no-base both absent remain non-destructive no-ops", async () => {
  const old = p("old.md");
  const entry: BaseEntry = { path: old, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: h("base") } };
  const deleted = await planner.plan({ snapshots: [absent(old, { status: "trusted", entry })], state: trusted([entry]) });
  assert.equal(deleted.operations[0].kind, "noop");
  assert.equal(deleted.operations[0].destructive, false);
  const neverSeen = await planner.plan({ snapshots: [absent(p("never.md"), { status: "uninitialized" })], state: { status: "uninitialized" } });
  assert.equal(neverSeen.operations[0].kind, "noop");
});

test("inaccessible and unknown local observations are blocked rather than deletion evidence", async () => {
  for (const status of ["inaccessible", "unknown"] as const) {
    const path = p(`${status}.md`);
    const entry: BaseEntry = { path, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: h("base") } };
    const snapshot: PathSnapshot = {
      path,
      local: { status, side: "local", path, reason: status },
      remote: { status: "present", side: "remote", path, entityKind: "file", content: { hash: h("base") }, stability: "stable" },
      base: { status: "trusted", entry }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" },
    };
    assert.equal((await planner.plan({ snapshots: [snapshot], state: trusted([entry]) })).operations[0].kind, "blocked-unsafe");
  }
});

test("failed and unknown remote enumeration cannot authorize remote-absence deletion", async () => {
  for (const status of ["failed", "unknown"] as const) {
    const path = p(`${status}.md`);
    const entry: BaseEntry = { path, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: h("base") } };
    const snapshot: PathSnapshot = {
      path,
      local: { status: "present", side: "local", path, entityKind: "file", content: { hash: h("base") }, stability: "stable" },
      remote: { status: "absent", side: "remote", path },
      base: { status: "trusted", entry }, remoteEnumeration: { status, reason: status }, identity: { status: "unambiguous" },
    };
    assert.equal((await planner.plan({ snapshots: [snapshot], state: trusted([entry]) })).operations[0].kind, "blocked-unsafe");
  }
});

test("empty folders use entity-kind semantics without requiring file content hashes", async () => {
  const path = p("empty-folder");
  const snapshot: PathSnapshot = {
    path,
    local: { status: "present", side: "local", path, entityKind: "folder", stability: "stable" },
    remote: { status: "present", side: "remote", path, entityKind: "folder", stability: "stable" },
    base: { status: "uninitialized" }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" },
  };
  const plan = await planner.plan({ snapshots: [snapshot], state: { status: "uninitialized" } });
  assert.equal(plan.operations[0].kind, "noop");
});
