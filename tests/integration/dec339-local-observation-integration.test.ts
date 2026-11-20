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


test("WS-02 BU-04 resume immediately hides advisory hints while IndexedDB invalidation is pending", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const baseline = candidate(g("bu04-async-resume"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), store)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const note = path("notes/inflight.md");
  let resume: ((event: import("../../src/contracts").LocalLifecycleEvent) => void) | undefined;
  let release: (() => void) | undefined;
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: [{
      status: "present" as const, side: "local" as const, path: note,
      entityKind: "file" as const, stability: "stable" as const,
    }], completeness: { status: "complete" as const } }),
    onChange: () => () => undefined,
    onLifecycle: listener => { resume = listener; return () => { resume = undefined; }; },
  };
  let hold = false;
  const proxy = {
    publicationSnapshot: (...args: Parameters<typeof store.publicationSnapshot>) => store.publicationSnapshot(...args),
    replaceLocalSnapshot: (...args: Parameters<typeof store.replaceLocalSnapshot>) => store.replaceLocalSnapshot(...args),
    readLocalHint: (...args: Parameters<typeof store.readLocalHint>) => store.readLocalHint(...args),
    invalidateLocalSnapshot: async (reason: string) => {
      if (hold) await new Promise<void>(resolve => { release = resolve; });
      await store.invalidateLocalSnapshot(reason);
    },
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, proxy, () => true);
  const unsubscribe = coordinator.subscribe();
  try {
    assert.equal((await coordinator.refresh(fence)).status, "recorded");
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "advisory");
    hold = true;
    resume?.({ kind: "resume" });
    assert.equal((await store.readLocalHint(fence, note)).status, "advisory",
      "backing database is intentionally still stale while its invalidation is blocked");
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "stale",
      "consumer-visible advisory hint must be refused immediately on the event");
    assert.equal((await coordinator.refresh(fence)).status, "stale",
      "refresh is barred until the invalidation transaction completes");
    assert.ok(release);
    hold = false;
    release();
    for (let i = 0; i < 12; i++) {
      if ((await store.readLocalHint(fence, note)).status === "stale") break;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "stale");
    assert.equal((await coordinator.refresh(fence)).status, "recorded");
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "advisory");
    const remote = await store.openRead();
    assert.equal(remote.status, "verified-observation");
    if (remote.status === "verified-observation") await remote.value.release();
  } finally { unsubscribe(); release?.(); }
});

test("WS-02 BU-04 event racing an in-flight hint read cannot expose the old observation", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const baseline = candidate(g("bu04-hint-read-race"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), store)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const note = path("notes/raced.md");
  let changed: ((event: import("../../src/contracts").LocalVaultChange) => void) | undefined;
  let releaseRead: (() => void) | undefined;
  let enteredRead: (() => void) | undefined;
  const readEntered = new Promise<void>(resolve => { enteredRead = resolve; });
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: [{
      status: "present" as const, side: "local" as const, path: note,
      entityKind: "file" as const, stability: "stable" as const,
    }], completeness: { status: "complete" as const } }),
    onChange: listener => { changed = listener; return () => { changed = undefined; }; },
    onLifecycle: () => () => undefined,
  };
  const proxy = {
    publicationSnapshot: (...args: Parameters<typeof store.publicationSnapshot>) => store.publicationSnapshot(...args),
    replaceLocalSnapshot: (...args: Parameters<typeof store.replaceLocalSnapshot>) => store.replaceLocalSnapshot(...args),
    invalidateLocalSnapshot: (reason: string) => store.invalidateLocalSnapshot(reason),
    readLocalHint: async (...args: Parameters<typeof store.readLocalHint>) => {
      const previous = await store.readLocalHint(...args);
      enteredRead?.();
      await new Promise<void>(resolve => { releaseRead = resolve; });
      return previous;
    },
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, proxy, () => true);
  const unsubscribe = coordinator.subscribe();
  try {
    assert.equal((await coordinator.refresh(fence)).status, "recorded");
    const pending = coordinator.readAdvisoryHint(fence, note);
    await readEntered;
    changed?.({ kind: "modified", path: note });
    releaseRead?.();
    assert.equal((await pending).status, "stale");
  } finally { unsubscribe(); releaseRead?.(); }
});


test("WS-02 BU-04 F-01 rejected lifecycle invalidation remains latched until fresh verified replacement", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const baseline = candidate(g("bu04-f01-rejected-lifecycle"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), store)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const note = path("notes/rejected-lifecycle.md");
  let currentToken = token("lifecycle-before");
  let partial = false;
  let failOnce = true;
  let changed: ((event: import("../../src/contracts").LocalVaultChange) => void) | undefined;
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({
      entries: [{ status: "present" as const, side: "local" as const, path: note,
        entityKind: "file" as const, stability: "stable" as const, observationToken: currentToken }],
      completeness: partial ? { status: "partial" as const, reason: "interrupted-recovery" }
        : { status: "complete" as const },
    }),
    onChange: listener => { changed = listener; return () => { changed = undefined; }; },
    onLifecycle: () => () => undefined,
  };
  const proxy = {
    publicationSnapshot: (...a: Parameters<typeof store.publicationSnapshot>) => store.publicationSnapshot(...a),
    replaceLocalSnapshot: (...a: Parameters<typeof store.replaceLocalSnapshot>) => store.replaceLocalSnapshot(...a),
    readLocalHint: (...a: Parameters<typeof store.readLocalHint>) => store.readLocalHint(...a),
    invalidateLocalSnapshot: async (reason: string) => {
      if (failOnce) { failOnce = false; throw new Error("injected-indexeddb-abort"); }
      await store.invalidateLocalSnapshot(reason);
    },
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, proxy, () => true);
  const unsubscribe = coordinator.subscribe();
  try {
    assert.equal((await coordinator.refresh(fence)).status, "recorded");
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "advisory");
    currentToken = token("lifecycle-after");
    changed?.({ kind: "modified", path: note });
    await new Promise<void>(resolve => setImmediate(resolve));
    const durableOld = await store.readLocalHint(fence, note);
    assert.equal(durableOld.status, "advisory", "failed IDB invalidation leaves old durable marker complete");
    if (durableOld.status === "advisory")
      assert.equal(durableOld.value.observationToken, token("lifecycle-before"));
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "recovery-required",
      "rejected invalidation must stay latched after the promise settles");
    partial = true;
    assert.equal((await coordinator.refresh(fence)).status, "partial",
      "incomplete enumeration must not authorize fault recovery");
    assert.notEqual((await coordinator.readAdvisoryHint(fence, note)).status, "advisory");
    partial = false;
    assert.equal((await coordinator.refresh(fence)).status, "recorded");
    const recovered = await coordinator.readAdvisoryHint(fence, note);
    assert.equal(recovered.status, "advisory");
    if (recovered.status === "advisory")
      assert.equal(recovered.value.observationToken, token("lifecycle-after"),
        "recovery must publish the new observation, not the prior cached token");
    const remote = await store.openRead();
    assert.equal(remote.status, "verified-observation");
    if (remote.status === "verified-observation") await remote.value.release();
  } finally { unsubscribe(); }
});

test("WS-02 BU-04 F-01 overlapping invalidations cannot hide an earlier failed transaction", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const baseline = candidate(g("bu04-f01-overlapping"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), store)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const note = path("notes/overlap.md");
  let lifecycle: ((event: import("../../src/contracts").LocalLifecycleEvent) => void) | undefined;
  let rejectFirst: ((error: Error) => void) | undefined;
  let releaseSecond: (() => void) | undefined;
  let calls = 0;
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: [{ status: "present" as const, side: "local" as const,
      path: note, entityKind: "file" as const, stability: "stable" as const }],
      completeness: { status: "complete" as const } }),
    onChange: () => () => undefined,
    onLifecycle: listener => { lifecycle = listener; return () => { lifecycle = undefined; }; },
  };
  const proxy = {
    publicationSnapshot: (...a: Parameters<typeof store.publicationSnapshot>) => store.publicationSnapshot(...a),
    replaceLocalSnapshot: (...a: Parameters<typeof store.replaceLocalSnapshot>) => store.replaceLocalSnapshot(...a),
    readLocalHint: (...a: Parameters<typeof store.readLocalHint>) => store.readLocalHint(...a),
    invalidateLocalSnapshot: async (reason: string) => {
      calls++;
      if (calls === 1) await new Promise<void>((_resolve, reject) => { rejectFirst = reject; });
      if (calls === 2) await new Promise<void>(resolve => { releaseSecond = resolve; });
      await store.invalidateLocalSnapshot(reason);
    },
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, proxy, () => true);
  const unsubscribe = coordinator.subscribe();
  try {
    assert.equal((await coordinator.refresh(fence)).status, "recorded");
    const rejected = coordinator.invalidateForScopeChange().then(
      () => "unexpected-success" as const, () => "rejected" as const);
    lifecycle?.({ kind: "vault-ready" });
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "stale");
    assert.ok(releaseSecond);
    releaseSecond();
    for (let attempt = 0; attempt < 12; attempt++) {
      if ((await store.readLocalHint(fence, note)).status === "stale") break;
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    assert.equal((await store.readLocalHint(fence, note)).status, "stale");
    assert.ok(rejectFirst);
    rejectFirst(new Error("first-transaction-rejected-after-second-committed"));
    assert.equal(await rejected, "rejected");
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "recovery-required",
      "later successful invalidation must not clear the earlier failure latch");
    await coordinator.invalidateForScopeChange();
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "recovery-required",
      "successful retry alone is insufficient without full enumeration/replacement");
    assert.equal((await coordinator.refresh(fence)).status, "recorded");
    assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "advisory");
  } finally { unsubscribe(); rejectFirst?.(new Error("cleanup")); releaseSecond?.(); }
});

test("WS-02 BU-04 F-01 synchronous scope invalidation failure and cold coordinator fail closed", async () => {
  withRangeOnly();
  const db = new FakeDatabase(), factory = db.openFactory();
  const store = await seeded(factory);
  const baseline = candidate(g("bu04-f01-sync-failure"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(baseline), store)
    .publishBaseline(fence, baseline.manifest.generation)).status, "published");
  const note = path("notes/synchronous-failure.md");
  let failReplacement = false;
  const local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle"> = {
    enumerate: async () => ({ entries: [{ status: "present" as const, side: "local" as const,
      path: note, entityKind: "file" as const, stability: "stable" as const }],
      completeness: { status: "complete" as const } }),
    onChange: () => () => undefined,
    onLifecycle: () => () => undefined,
  };
  let throwInvalidation = true;
  const proxy = {
    publicationSnapshot: (...a: Parameters<typeof store.publicationSnapshot>) => store.publicationSnapshot(...a),
    replaceLocalSnapshot: async (...a: Parameters<typeof store.replaceLocalSnapshot>) =>
      failReplacement ? { status: "recovery-required" as const, reason: "injected-local-snapshot-write-failure" }
        : store.replaceLocalSnapshot(...a),
    readLocalHint: (...a: Parameters<typeof store.readLocalHint>) => store.readLocalHint(...a),
    invalidateLocalSnapshot: (reason: string) => {
      if (throwInvalidation) { throwInvalidation = false; throw new Error("synchronous-open-failure"); }
      return store.invalidateLocalSnapshot(reason);
    },
  };
  const coordinator = new VerifiedLocalInventoryCoordinator(local, proxy, () => true);
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "advisory");
  await assert.rejects(coordinator.invalidateForScopeChange(), /synchronous-open-failure/);
  assert.equal((await store.readLocalHint(fence, note)).status, "advisory");
  assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "recovery-required");
  failReplacement = true;
  assert.equal((await coordinator.refresh(fence)).status, "recovery-required");
  assert.notEqual((await coordinator.readAdvisoryHint(fence, note)).status, "advisory",
    "failed replacement cannot clear an invalidation fault");
  failReplacement = false;
  const coldCoordinator = new VerifiedLocalInventoryCoordinator(local, proxy, () => true);
  assert.equal((await coldCoordinator.readAdvisoryHint(fence, note)).status, "stale",
    "new coordinator cannot trust a previous instance's persisted complete marker");
  assert.equal((await coordinator.refresh(fence)).status, "recorded");
  assert.equal((await coordinator.readAdvisoryHint(fence, note)).status, "advisory");
});
