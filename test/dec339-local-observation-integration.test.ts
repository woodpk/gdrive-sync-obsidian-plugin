import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type EnumerationCompleteness, type LocalObservation,
  type LocalVaultPort, type ObservationToken, type VaultPath,
} from "../src/contracts";
import { IndexedDbInventoryObservationStore } from "../src/state/indexeddb-inventory-storage";
import { VerifiedInventoryBaselineCoordinator } from "../src/state/verified-inventory-integration";
import { VerifiedLocalInventoryCoordinator } from "../src/state/verified-local-inventory";
import { FakeDatabase, candidate, fence, g, id, seeded, simulatedBaseline, withRangeOnly } from "./support/dec339-inventory-idb-fixtures";

const path = (name: string): VaultPath => contractId<"VaultPath">(name) as VaultPath;
const token = (value: string): ObservationToken => contractId<"ObservationToken">(value) as ObservationToken;

test("D339-08A local observations persist across restart and remain advisory after create/edit/move/delete", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), factory = fake.openFactory();
  const store = await seeded(factory);
  const base = candidate(g("local-inventory-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(base), store)
    .publishBaseline(fence, base.manifest.generation)).status, "published");

  const note = path("notes/one.md");
  const moved = path("notes/two.md");
  const folder = path("notes");
  let current: LocalObservation[] = [
    { status: "present", side: "local", path: folder, entityKind: "folder", stability: "stable" },
    { status: "present", side: "local", path: note, entityKind: "file", stability: "stable",
      observationToken: token("local-token:1"), remoteObjectId: id("remote:one") },
  ];
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: current, completeness: { status: "complete" } }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, store, () => true);
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  const restarted = new IndexedDbInventoryObservationStore("device:idb:test", factory);
  const first = await restarted.readLocalHint(fence, note);
  assert.equal(first.status, "advisory");
  if (first.status === "advisory") {
    assert.equal(first.value.presence, "present");
    assert.equal(first.value.remoteObjectId, id("remote:one"));
    assert.equal(first.value.observationToken, token("local-token:1"));
  }
  current = current.map(row => row.path === note
    ? { ...row, observationToken: token("local-token:2"), remoteObjectId: id("remote:rebound") }
    : row);
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  const edited = await restarted.readLocalHint(fence, note);
  assert.equal(edited.status, "advisory");
  if (edited.status === "advisory") {
    assert.equal(edited.value.remoteObjectId, id("remote:rebound"));
    assert.equal(edited.value.observationToken, token("local-token:2"));
  }
  current = current.map(row => row.path === note
    ? { ...row, path: moved } : row);
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  assert.equal((await restarted.readLocalHint(fence, note)).status, "unknown");
  assert.equal((await restarted.readLocalHint(fence, moved)).status, "advisory");
  current = current.filter(row => row.path !== moved);
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  // Deleted paths have NO persisted absence. BASE must decide deletion independently.
  assert.equal((await restarted.readLocalHint(fence, moved)).status, "unknown");
});

test("D339-08A unreadability, unstable observations and partial scans cannot mint local authority", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), factory = fake.openFactory();
  const store = await seeded(factory);
  const base = candidate(g("local-uncertain-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(base), store)
    .publishBaseline(fence, base.manifest.generation)).status, "published");
  const blocked = path("blocked.md"), writing = path("writing.md");
  let completeness: EnumerationCompleteness = { status: "complete" };
  const items: LocalObservation[] = [
    { status: "unreadable", side: "local", path: blocked, reason: "access-denied" },
    { status: "present", side: "local", path: writing, entityKind: "file", stability: "unstable" },
  ];
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: items, completeness }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, store, () => true);
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  const unreadable = await store.readLocalHint(fence, blocked);
  assert.equal(unreadable.status, "advisory");
  if (unreadable.status === "advisory") assert.equal(unreadable.value.presence, "unreadable");
  const unstable = await store.readLocalHint(fence, writing);
  assert.equal(unstable.status, "advisory");
  if (unstable.status === "advisory") assert.equal(unstable.value.presence, "unknown");
  completeness = { status: "partial", reason: "local-scan-interrupted" };
  assert.equal((await coordinator.refresh(fence)).status, "partial");
  assert.equal((await store.readLocalHint(fence, blocked)).status, "stale");
});

test("D339-08A local path policy and invalidations fail closed without affecting remote inventory", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), factory = fake.openFactory();
  const store = await seeded(factory);
  const base = candidate(g("local-exclusion-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(base), store)
    .publishBaseline(fence, base.manifest.generation)).status, "published");
  const retained = path("notes/safe.md"), excluded = path(".git/config");
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ completeness: { status: "complete" }, entries: [
      { status: "present" as const, side: "local" as const, path: retained,
        entityKind: "file" as const, stability: "stable" as const },
      { status: "present" as const, side: "local" as const, path: excluded,
        entityKind: "file" as const, stability: "stable" as const },
    ] }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };
  const coord = new VerifiedLocalInventoryCoordinator(local, store, p => p !== excluded);
  assert.equal((await coord.refresh(fence)).status, "recorded");
  assert.equal((await store.readLocalHint(fence, retained)).status, "advisory");
  assert.equal((await store.readLocalHint(fence, excluded)).status, "unknown");
  await store.invalidateLocalSnapshot("changed-scope-policy");
  assert.equal((await store.readLocalHint(fence, retained)).status, "stale");
  const remote = await store.openRead();
  assert.equal(remote.status, "verified-observation");
  if (remote.status === "verified-observation") await remote.value.release();
});
