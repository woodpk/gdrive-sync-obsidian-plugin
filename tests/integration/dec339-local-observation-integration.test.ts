import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type EnumerationCompleteness, type LocalObservation,
  type LocalVaultPort, type ObservationToken, type VaultPath,
} from "../../src/contracts";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import { VerifiedInventoryBaselineCoordinator } from "../../src/state/verified-inventory-integration";
import { VerifiedLocalInventoryCoordinator } from "../../src/state/verified-local-inventory";
import { FakeDatabase, candidate, fence, g, id, seeded, simulatedBaseline, withRangeOnly } from "../fixtures/dec339-inventory-idb-fixtures";

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

test("D339-08A file changes during fresh enumeration invalidate the local snapshot", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), factory = fake.openFactory();
  const store = await seeded(factory);
  const baseline = candidate(g("local-during-scan-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), store)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const note = path("during-scan.md");
  let fileChanged: ((event: import("../../src/contracts").LocalVaultChange) => void) | undefined;
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => {
      fileChanged?.({ kind: "modified", path: note });
      return { completeness: { status: "complete" }, entries: [
        { status: "present" as const, side: "local" as const, path: note,
          entityKind: "file" as const, stability: "stable" as const },
      ] };
    },
    onChange: listener => { fileChanged = listener; return () => { fileChanged = undefined; }; },
    onLifecycle: () => () => undefined,
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, store, () => true);
  const unsubscribe = coordinator.subscribe();
  assert.equal((await coordinator.refresh(fence)).status, "stale");
  assert.notEqual((await store.readLocalHint(fence, note)).status, "advisory");
  unsubscribe();
});


test("WS-02 BU-03 scope change invalidates published hints without revoking remote inventory authority", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const base = candidate(g("bu03-scope-change"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(base), store)
    .publishBaseline(fence, base.manifest.generation)).status, "published");
  const included = path("notes/retained.md"), newlyExcluded = path("notes/excluded.md");
  let includedPaths = new Set([String(included), String(newlyExcluded)]);
  const current: LocalObservation[] = [included, newlyExcluded].map(value => ({
    status: "present", side: "local", path: value, entityKind: "file", stability: "stable",
  }));
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: current, completeness: { status: "complete" } }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, store, value => includedPaths.has(String(value)));
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  assert.equal((await store.readLocalHint(fence, newlyExcluded)).status, "advisory");
  includedPaths = new Set([String(included)]);
  await coordinator.invalidateForScopeChange();
  assert.equal((await store.readLocalHint(fence, newlyExcluded)).status, "stale",
    "a scope change must invalidate hints from the old inclusion policy");
  const remote = await store.openRead();
  assert.equal(remote.status, "verified-observation", "scope invalidation must not change remote canonical cursor");
  if (remote.status === "verified-observation") await remote.value.release();
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  assert.equal((await store.readLocalHint(fence, included)).status, "advisory");
  assert.equal((await store.readLocalHint(fence, newlyExcluded)).status, "unknown");
});

test("WS-02 BU-03 scope mutation during local enumeration refuses the stale publication", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const base = candidate(g("bu03-racing-scope"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(base), store)
    .publishBaseline(fence, base.manifest.generation)).status, "published");
  const retained = path("notes/scoped.md");
  let coordinator: VerifiedLocalInventoryCoordinator;
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => {
      await coordinator.invalidateForScopeChange();
      return { entries: [{
        status: "present" as const, side: "local" as const,
        path: retained, entityKind: "file" as const, stability: "stable" as const,
      }], completeness: { status: "complete" as const } };
    },
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };
  coordinator = new VerifiedLocalInventoryCoordinator(local, store, () => true);
  assert.equal((await coordinator.refresh(fence)).status, "stale");
  assert.notEqual((await store.readLocalHint(fence, retained)).status, "advisory");
});

test("WS-02 BU-03 resume and vault-ready invalidate local hints while preserving remote snapshot", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const baseline = candidate(g("bu03-resume"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), store)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const file = path("notes/resume.md");
  let lifecycle: ((event: import("../../src/contracts").LocalLifecycleEvent) => void) | undefined;
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: [{
      status: "present" as const, side: "local" as const, path: file,
      entityKind: "file" as const, stability: "stable" as const,
    }], completeness: { status: "complete" as const } }),
    onChange: () => () => undefined,
    onLifecycle: listener => { lifecycle = listener; return () => { lifecycle = undefined; }; },
  };
  const coord = new VerifiedLocalInventoryCoordinator(local, store, () => true);
  const unsubscribe = coord.subscribe();
  try {
    assert.equal((await coord.refresh(fence)).status, "recorded");
    assert.equal((await store.readLocalHint(fence, file)).status, "advisory");
    lifecycle?.({ kind: "resume" });
    for (let i = 0; i < 6; i++) {
      if ((await store.readLocalHint(fence, file)).status === "stale") break;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    assert.equal((await store.readLocalHint(fence, file)).status, "stale");
    const remote = await store.openRead();
    assert.equal(remote.status, "verified-observation");
    if (remote.status === "verified-observation") await remote.value.release();
    assert.equal((await coord.refresh(fence)).status, "recorded");
    lifecycle?.({ kind: "vault-ready" });
    for (let i = 0; i < 6; i++) {
      if ((await store.readLocalHint(fence, file)).status === "stale") break;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    assert.equal((await store.readLocalHint(fence, file)).status, "stale");
  } finally { unsubscribe(); }
});
