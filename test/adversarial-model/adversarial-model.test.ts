import assert from "node:assert/strict";
import test from "node:test";
import type { RemoteFolderCreatePhysicalMutationDescriptor } from "../../src/contracts/synchronization-folder-create-foundation";
import type { MutationIntentId, RemoteObjectId, SemanticStateGeneration, VaultPath } from "../../src/contracts/common";
import {
  AdversarialSyncModel,
  minimizeFailingTrace,
  replayTrace,
  runTrace,
  seededEvents,
  type BaseRecord,
  type InitialModelState,
  type ModelEvent,
} from "./support/model";

const base = (path: string, hash: string, remoteId: string, exactBaseAuthority = true, exactIdentityAuthority = true): BaseRecord => ({
  path,
  hash,
  remoteId,
  exactBaseAuthority,
  exactIdentityAuthority,
});

const common = (hash = "H0", path = "note.md", id = "r0"): InitialModelState => ({
  A: { local: [[path, hash]], base: [base(path, hash, id)] },
  B: { local: [[path, hash]], base: [base(path, hash, id)] },
  remote: [{ id, path, content: hash, kind: "file", revision: 1, trashed: false }],
});

const event = (model: AdversarialSyncModel, value: ModelEvent): void => model.apply(value);
const settle = (model: AdversarialSyncModel, device: "A" | "B", paths: string[] = ["note.md"]): void => {
  model.settle(device);
  model.assertQuiescentOrExplicit(device, paths);
};

function buildJournal(model: AdversarialSyncModel, device: "A" | "B", path = "note.md"): void {
  event(model, { type: "start-reconcile", device, paths: [path] });
  event(model, { type: "advance", device });
}

function driveFirstEffectToStage(model: AdversarialSyncModel, device: "A" | "B", stage: "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified"): void {
  if (stage === "intent-persisted") return;
  event(model, { type: "advance", device });
  if (stage === "dispatch-authorized") return;
  event(model, { type: "dispatch", device });
  event(model, { type: stage === "outcome-unknown" ? "transport-lost" : "transport-success", device });
}

function folderDescriptor(path = "folder", reservedId = "folder-reserved", parentId = "parent"): RemoteFolderCreatePhysicalMutationDescriptor {
  const targetPath = path as VaultPath;
  const intentId = `intent-${path}-${reservedId}` as MutationIntentId;
  return {
    kind: "remote-folder-create",
    targetSide: "remote",
    mutationKind: "create",
    intentId,
    targetPath,
    parentRemoteObjectId: parentId as RemoteObjectId,
    pathAuthority: {
      generation: "generation-1" as SemanticStateGeneration,
      targetPath,
      parentPath: "" as VaultPath,
      pathComparisonKey: path,
      expectedTarget: "absent",
    },
    remoteMutation: {
      kind: "reserved-folder-create",
      intentId,
      reservedRemoteObjectId: reservedId as RemoteObjectId,
      path: targetPath,
    },
  };
}

function prepareFolderRecovery(
  model: AdversarialSyncModel,
  stage: "dispatch-authorized" | "outcome-unknown",
  descriptor = folderDescriptor(),
  device: "A" | "B" = "A",
): void {
  event(model, { type: "begin-folder-create", device, descriptor });
  event(model, { type: "advance", device });
  if (stage === "outcome-unknown") {
    event(model, { type: "dispatch", device });
    event(model, { type: "transport-lost", device });
  }
  event(model, { type: "crash", device });
  event(model, { type: "restart", device });
}

test("01 exact BASE authority is required by transitions", () => {
  const initial = common();
  initial.A!.base = [base("note.md", "H0", "r0", false, true)];
  const model = new AdversarialSyncModel(initial);
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  event(model, { type: "start-reconcile", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.pathState.get("note.md"), "recovery");
  assert.equal(model.devices.A.durable.journals.length, 0);
});

test("02 exact identity authority is required before mapped remote mutation", () => {
  const initial = common();
  initial.A!.base = [base("note.md", "H0", "r0", true, false)];
  const model = new AdversarialSyncModel(initial);
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  event(model, { type: "start-reconcile", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.pathState.get("note.md"), "recovery");
  assert.equal(model.devices.A.durable.journals.length, 0);
});

for (const [number, name, arrange, path] of [
  [3, "upload", (m: AdversarialSyncModel) => event(m, { type: "local-write", device: "A", path: "note.md", content: "H1" }), "note.md"],
  [4, "download", (m: AdversarialSyncModel) => event(m, { type: "external-remote-update", id: "r0", content: "H1" }), "note.md"],
  [5, "move", (m: AdversarialSyncModel) => event(m, { type: "external-remote-move", id: "r0", path: "moved.md" }), "moved.md"],
  [6, "trash", (m: AdversarialSyncModel) => event(m, { type: "local-delete", device: "A", path: "note.md" }), "note.md"],
] as const) {
  test(`${String(number).padStart(2, "0")} ${name} survives crash/restart at every durable effect stage`, () => {
    for (const stage of ["intent-persisted", "dispatch-authorized", "outcome-unknown", "effect-verified"] as const) {
      const model = new AdversarialSyncModel(common());
      arrange(model);
      buildJournal(model, "A");
      driveFirstEffectToStage(model, "A", stage);
      event(model, { type: "crash", device: "A" });
      assert.equal(model.devices.A.volatile.plan.length, 0);
      event(model, { type: "restart", device: "A" });
      event(model, { type: "recover", device: "A" });
      settle(model, "A", [path]);
      assert.notEqual(model.devices.A.durable.pathState.get(path), "unknown", `stage=${stage}`);
    }
  });
}

test("07 clean merge requires both physical effects before BASE convergence", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H0|L:left" });
  event(model, { type: "external-remote-update", id: "r0", content: "H0|R:right" });
  buildJournal(model, "A");
  event(model, { type: "advance", device: "A" });
  event(model, { type: "dispatch", device: "A" });
  event(model, { type: "transport-success", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "H0");
  settle(model, "A");
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "H0|M:left+right");
});

test("08 intended candidate plus independent candidate preserves conflict", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  buildJournal(model, "A");
  event(model, { type: "advance", device: "A" });
  event(model, { type: "dispatch", device: "A" });
  event(model, { type: "external-remote-create", id: "rw", path: "note.md", content: "HW" });
  event(model, { type: "transport-success", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.pathState.get("note.md"), "conflict");
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "H0");
});

test("09 independent candidate cannot be collapsed without explicit authority", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "external-remote-create", id: "other", path: "note.md", content: "H0" });
  event(model, { type: "start-reconcile", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.pathState.get("note.md"), "conflict");
});

test("10 durable intended L1 is not substituted by later L2", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "L1" });
  buildJournal(model, "A");
  event(model, { type: "local-write", device: "A", path: "note.md", content: "L2" });
  settle(model, "A");
  assert.ok([...model.remote.values()].some(value => value.content === "L1"));
  assert.equal(model.devices.A.local.get("note.md"), "L2");
});

test("11 outcome-unknown reconciles physical reality without blind redispatch", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  buildJournal(model, "A");
  event(model, { type: "advance", device: "A" });
  event(model, { type: "dispatch", device: "A" });
  const dispatches = model.devices.A.durable.journals[0].effects[0].dispatchCount;
  event(model, { type: "transport-lost", device: "A" });
  event(model, { type: "crash", device: "A" });
  event(model, { type: "restart", device: "A" });
  event(model, { type: "recover", device: "A" });
  assert.equal(model.devices.A.durable.journals[0].effects[0].dispatchCount, dispatches);
  assert.equal(model.devices.A.durable.journals[0].effects[0].stage, "effect-verified");
});

test("12 clean merge crash after one effect cannot commit logical convergence", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H0|L:left" });
  event(model, { type: "external-remote-update", id: "r0", content: "H0|R:right" });
  buildJournal(model, "A");
  event(model, { type: "advance", device: "A" });
  event(model, { type: "dispatch", device: "A" });
  event(model, { type: "transport-success", device: "A" });
  event(model, { type: "advance", device: "A" });
  event(model, { type: "crash", device: "A" });
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "H0");
  event(model, { type: "restart", device: "A" });
  settle(model, "A");
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "H0|M:left+right");
});

test("13 multi-page changes advance cursor only on durable terminal page", () => {
  const model = new AdversarialSyncModel();
  event(model, { type: "ingest-page", device: "A", batchId: "p1", requestedCursor: 10, entries: ["c1"] });
  assert.equal(model.devices.A.durable.cursor, 0);
  event(model, { type: "ingest-page", device: "A", batchId: "p2", requestedCursor: 10, entries: ["c2"], terminalCursor: 11 });
  assert.equal(model.devices.A.durable.cursor, 11);
  assert.deepEqual(model.devices.A.durable.learnedBatches.map(value => value.id), ["p1", "p2"]);
});

test("14 multiple learned removal batches remain durable across restart", () => {
  const model = new AdversarialSyncModel();
  event(model, { type: "ingest-page", device: "A", batchId: "rm1", requestedCursor: 1, entries: ["remove:r1"] });
  event(model, { type: "ingest-page", device: "A", batchId: "rm2", requestedCursor: 1, entries: ["remove:r2"], terminalCursor: 2 });
  event(model, { type: "crash", device: "A" });
  event(model, { type: "restart", device: "A" });
  assert.equal(model.devices.A.durable.learnedBatches.length, 2);
  assert.equal(model.devices.A.durable.cursor, 2);
});

test("15 repeated moves preserve stable remote identity", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "external-remote-move", id: "r0", path: "one.md" });
  settle(model, "A", ["one.md"]);
  event(model, { type: "external-remote-move", id: "r0", path: "two.md" });
  settle(model, "A", ["two.md"]);
  assert.equal(model.devices.A.durable.base.get("two.md")?.remoteId, "r0");
  assert.equal(model.remote.get("r0")?.path, "two.md");
});

test("16 create-delete sequence preserves acknowledged deletion history", () => {
  const model = new AdversarialSyncModel();
  event(model, { type: "local-write", device: "A", path: "new.md", content: "N1" });
  settle(model, "A", ["new.md"]);
  event(model, { type: "local-delete", device: "A", path: "new.md" });
  settle(model, "A", ["new.md"]);
  assert.equal(model.devices.A.durable.base.has("new.md"), false);
  assert.ok(model.devices.A.durable.tombstones.has("new.md"));
});

test("17 duplicate logical paths become conflict through resolution transition", () => {
  const model = new AdversarialSyncModel();
  event(model, { type: "external-remote-create", id: "r1", path: "dup.md", content: "1" });
  event(model, { type: "external-remote-create", id: "r2", path: "dup.md", content: "2" });
  event(model, { type: "start-reconcile", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.pathState.get("dup.md"), "conflict");
  assert.equal(model.devices.A.durable.base.has("dup.md"), false);
});

test("18 unresolved path A does not block safe path B progress", () => {
  const model = new AdversarialSyncModel({
    A: { local: [["a.md", "A0"], ["b.md", "B0"]], base: [base("a.md", "A0", "ra"), base("b.md", "B0", "rb")] },
    remote: [
      { id: "ra", path: "a.md", content: "A0", kind: "file", revision: 1, trashed: false },
      { id: "rb", path: "b.md", content: "B0", kind: "file", revision: 1, trashed: false },
    ],
  });
  event(model, { type: "external-remote-create", id: "ra2", path: "a.md", content: "AX" });
  event(model, { type: "local-write", device: "A", path: "b.md", content: "B1" });
  settle(model, "A", ["a.md", "b.md"]);
  assert.equal(model.devices.A.durable.pathState.get("a.md"), "conflict");
  assert.equal(model.devices.A.durable.base.get("b.md")?.hash, "B1");
});

test("19 missed watcher is discovered by integrity reconciliation", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "X1", watcher: "lost" });
  assert.equal(model.devices.A.volatile.dirtyPaths.has("note.md"), false);
  event(model, { type: "integrity-reconcile", device: "A", path: "note.md" });
  assert.equal(model.devices.A.volatile.dirtyPaths.has("note.md"), true);
  settle(model, "A");
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "X1");
});

test("20 Windows watcher-event loss is recoverable through authoritative integrity read", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-delete", device: "A", path: "note.md", watcher: "lost" });
  event(model, { type: "integrity-reconcile", device: "A", path: "note.md" });
  settle(model, "A");
  assert.equal(model.devices.A.durable.base.has("note.md"), false);
});

test("21 suspend/resume preserves durable work and resumes safely", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  buildJournal(model, "A");
  event(model, { type: "suspend", device: "A" });
  const durableCount = model.devices.A.durable.journals.length;
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.journals.length, durableCount);
  event(model, { type: "resume", device: "A" });
  settle(model, "A");
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "H1");
});

test("22 abrupt process death reconstructs only durable state", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  event(model, { type: "start-reconcile", device: "A" });
  assert.ok(model.devices.A.volatile.plan.length > 0);
  const durableBase = model.devices.A.durable.base.get("note.md")?.hash;
  event(model, { type: "crash", device: "A" });
  assert.equal(model.devices.A.volatile.plan.length, 0);
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, durableBase);
  event(model, { type: "restart", device: "A" });
  assert.equal(model.devices.A.volatile.dirtyPaths.size, 0);
});

test("23 delivered cancellation stops dispatch while durable intent remains", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  buildJournal(model, "A");
  event(model, { type: "advance", device: "A" });
  event(model, { type: "cancel-request", device: "A", delivered: true });
  event(model, { type: "dispatch", device: "A" });
  assert.equal(model.devices.A.durable.journals[0].effects[0].dispatchCount, 0);
});

test("24 cancellation not delivered before death cannot erase persisted intent", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  buildJournal(model, "A");
  event(model, { type: "cancel-request", device: "A", delivered: false });
  event(model, { type: "crash", device: "A" });
  assert.equal(model.devices.A.durable.journals.length, 1);
  event(model, { type: "restart", device: "A" });
  settle(model, "A");
  assert.equal(model.devices.A.durable.base.get("note.md")?.hash, "H1");
});

test("25 auth loss cannot dispatch destructive work", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-delete", device: "A", path: "note.md" });
  buildJournal(model, "A");
  event(model, { type: "advance", device: "A" });
  event(model, { type: "network", device: "A", state: "auth-lost" });
  event(model, { type: "dispatch", device: "A" });
  assert.equal(model.remote.get("r0")?.trashed, false);
});

test("26 offline and rate-limited states preserve local-first edits", () => {
  for (const state of ["offline", "rate-limited"] as const) {
    const model = new AdversarialSyncModel(common());
    event(model, { type: "network", device: "A", state });
    event(model, { type: "local-write", device: "A", path: "note.md", content: `LOCAL-${state}` });
    buildJournal(model, "A");
    event(model, { type: "advance", device: "A" });
    event(model, { type: "dispatch", device: "A" });
    assert.equal(model.devices.A.local.get("note.md"), `LOCAL-${state}`);
    assert.equal(model.remote.get("r0")?.content, "H0");
  }
});

test("27 churn on path A does not starve path B", () => {
  const model = new AdversarialSyncModel({
    A: { local: [["a.md", "A0"], ["b.md", "B0"]], base: [base("a.md", "A0", "ra"), base("b.md", "B0", "rb")] },
    remote: [
      { id: "ra", path: "a.md", content: "A0", kind: "file", revision: 1, trashed: false },
      { id: "rb", path: "b.md", content: "B0", kind: "file", revision: 1, trashed: false },
    ],
  });
  event(model, { type: "local-write", device: "A", path: "b.md", content: "B1" });
  for (let i = 0; i < 4; i++) {
    event(model, { type: "local-write", device: "A", path: "a.md", content: `A${i + 1}` });
    model.settle("A", 20);
  }
  assert.equal(model.devices.A.durable.base.get("b.md")?.hash, "B1");
});

test("28 bounded quiescence after mutation pressure stops", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "H1" });
  const transitions = model.settle("A", 30);
  assert.ok(transitions < 30);
  model.assertQuiescentOrExplicit("A", ["note.md"]);
});

test("29 concurrent same-path creates never silently select one remote winner", () => {
  const model = new AdversarialSyncModel();
  event(model, { type: "local-write", device: "A", path: "same.md", content: "A" });
  event(model, { type: "local-write", device: "B", path: "same.md", content: "B" });
  buildJournal(model, "A", "same.md");
  buildJournal(model, "B", "same.md");
  for (const device of ["A", "B"] as const) {
    event(model, { type: "advance", device });
    event(model, { type: "dispatch", device });
    event(model, { type: "transport-success", device });
    event(model, { type: "advance", device });
  }
  for (const device of ["A", "B"] as const) {
    event(model, { type: "start-reconcile", device, paths: ["same.md"] });
    event(model, { type: "advance", device });
    assert.equal(model.devices[device].durable.pathState.get("same.md"), "conflict");
  }
});

test("30 stale state cannot authorize destructive propagation", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "mark-stale", device: "A", stale: true });
  event(model, { type: "local-delete", device: "A", path: "note.md" });
  event(model, { type: "start-reconcile", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.pathState.get("note.md"), "recovery");
  assert.equal(model.remote.get("r0")?.trashed, false);
});

test("31 incomplete remote coverage blocks a mass-deletion plan", () => {
  const initial: InitialModelState = { A: { local: [], base: [] }, remote: [] };
  for (let i = 0; i < 12; i++) {
    initial.A!.base!.push(base(`p${i}.md`, `H${i}`, `r${i}`));
    initial.A!.local!.push([`p${i}.md`, `H${i}`]);
    initial.remote!.push({ id: `r${i}`, path: `p${i}.md`, content: `H${i}`, kind: "file", revision: 1, trashed: false });
  }
  const model = new AdversarialSyncModel(initial);
  event(model, { type: "remote-coverage", device: "A", complete: false });
  for (let i = 0; i < 12; i++) event(model, { type: "local-delete", device: "A", path: `p${i}.md` });
  event(model, { type: "start-reconcile", device: "A" });
  for (let i = 0; i < 12; i++) event(model, { type: "advance", device: "A" });
  assert.equal([...model.remote.values()].filter(value => value.trashed).length, 0);
  assert.ok([...model.devices.A.durable.pathState.values()].every(value => value === "recovery"));
});

test("32 bounded merge refusal preserves both complete versions", () => {
  const model = new AdversarialSyncModel(common());
  event(model, { type: "local-write", device: "A", path: "note.md", content: "LOCAL-COMPLETE" });
  event(model, { type: "external-remote-update", id: "r0", content: "REMOTE-COMPLETE" });
  event(model, { type: "start-reconcile", device: "A" });
  event(model, { type: "advance", device: "A" });
  assert.equal(model.devices.A.durable.pathState.get("note.md"), "conflict");
  assert.equal(model.devices.A.local.get("note.md"), "LOCAL-COMPLETE");
  assert.equal(model.remote.get("r0")?.content, "REMOTE-COMPLETE");
});

// Frozen v1.2 remote folder-create verifier scenarios.
test("F1 exact observed reserved folder yields verified-effect", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "folder-reserved", path: "folder", kind: "folder", revision: 1, parentId: "parent", trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "verified-effect");
});

test("F2 wrong actual parent is conflict-preserved", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "folder-reserved", path: "folder", kind: "folder", revision: 1, parentId: "wrong-parent", trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "conflict-preserved");
});

test("F3 wrong observed reserved-object path is conflict-preserved", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "folder-reserved", path: "wrong", kind: "folder", revision: 1, parentId: "parent", trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "conflict-preserved");
});

test("F4 occupied intended target is conflict, never fabricated absence", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "other", path: "folder", kind: "file", content: "X", revision: 1, trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "conflict-preserved");
  assert.notEqual(model.folderRecovery?.status, "verified-not-applied");
});

test("F5 authoritative exclusion of reserved identity and target occupants yields verified-not-applied", () => {
  const model = new AdversarialSyncModel();
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "verified-not-applied");
});

test("F6 duplicate target candidates remain outcome-unknown", () => {
  const model = new AdversarialSyncModel({ remote: [
    { id: "x1", path: "folder", kind: "folder", revision: 1, parentId: "parent", trashed: false },
    { id: "x2", path: "folder", kind: "folder", revision: 1, parentId: "parent", trashed: false },
  ] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "outcome-unknown");
});

test("F7 incomplete parent observation remains outcome-unknown", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "folder-reserved", path: "folder", kind: "folder", revision: 1, trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "outcome-unknown");
});

test("F8 restart from dispatch-authorized observes before any redispatch", () => {
  const model = new AdversarialSyncModel();
  prepareFolderRecovery(model, "dispatch-authorized");
  const dispatches = model.devices.A.durable.journals[0].effects[0].dispatchCount;
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(dispatches, 0);
  assert.equal(model.recoveryReads, 1);
});

test("F9 restart from outcome-unknown observes physical reality without a second dispatch", () => {
  const model = new AdversarialSyncModel();
  prepareFolderRecovery(model, "outcome-unknown");
  const before = [...model.remote.values()].length;
  const dispatches = model.devices.A.durable.journals[0].effects[0].dispatchCount;
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "verified-effect");
  assert.equal(model.devices.A.durable.journals[0].effects[0].dispatchCount, dispatches);
  assert.equal([...model.remote.values()].length, before);
});

test("F10 descriptor parent intent cannot fabricate observed parent authority", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "folder-reserved", path: "folder", kind: "folder", revision: 1, trashed: false }] });
  prepareFolderRecovery(model, "outcome-unknown");
  event(model, { type: "recover-folder-create", device: "A" });
  assert.equal(model.folderRecovery?.status, "outcome-unknown");
});

// G-C2: ordinary recovery/settling must route the exact folder journal through frozen v1.2 verification.
test("G-C2 wrong parent through generic recover cannot become effect-verified", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "folder-reserved", path: "folder", kind: "folder", revision: 1, parentId: "wrong-parent", trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover", device: "A" });
  assert.equal(model.folderRecovery?.status, "conflict-preserved");
  assert.equal(model.devices.A.durable.pathState.get("folder"), "conflict");
  assert.equal(model.devices.A.durable.journals[0].effects[0].stage, "dispatch-authorized");
});

test("G-C2 occupied target with reserved ID absent remains conflict through generic recover", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "other", path: "folder", kind: "file", content: "occupied", revision: 1, trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover", device: "A" });
  assert.equal(model.folderRecovery?.status, "conflict-preserved");
  assert.equal(model.devices.A.durable.pathState.get("folder"), "conflict");
  assert.equal(model.devices.A.durable.journals.length, 1);
});

test("G-C2 authoritatively clear target may retire only from verifier verified-not-applied", () => {
  const model = new AdversarialSyncModel();
  prepareFolderRecovery(model, "dispatch-authorized");
  event(model, { type: "recover", device: "A" });
  assert.equal(model.folderRecovery?.status, "verified-not-applied");
  assert.equal(model.devices.A.durable.journals.length, 0);
  assert.equal(model.devices.A.volatile.dirtyPaths.has("folder"), true);
});

test("G-C2 response-loss recovery verifies exact physical folder without increasing dispatch count", () => {
  const model = new AdversarialSyncModel();
  prepareFolderRecovery(model, "outcome-unknown");
  const beforeDispatches = model.devices.A.durable.journals[0].effects[0].dispatchCount;
  event(model, { type: "recover", device: "A" });
  assert.equal(model.folderRecovery?.status, "verified-effect");
  assert.equal(model.devices.A.durable.journals[0].effects[0].stage, "effect-verified");
  assert.equal(model.devices.A.durable.journals[0].effects[0].dispatchCount, beforeDispatches);
});

test("G-C2 incomplete physical observation remains recovery through ordinary settle", () => {
  const model = new AdversarialSyncModel({ remote: [{ id: "folder-reserved", path: "folder", kind: "folder", revision: 1, trashed: false }] });
  prepareFolderRecovery(model, "dispatch-authorized");
  model.settle("A", 5);
  assert.equal(model.folderRecovery?.status, "outcome-unknown");
  assert.equal(model.devices.A.durable.pathState.get("folder"), "recovery");
  assert.equal(model.devices.A.durable.journals[0].effects[0].stage, "dispatch-authorized");
});

test("G-C2 generic recover routes multiple folder journals by exact journal identity", () => {
  const model = new AdversarialSyncModel({ remote: [
    { id: "f1", path: "one", kind: "folder", revision: 1, parentId: "wrong", trashed: false },
    { id: "f2", path: "two", kind: "folder", revision: 1, parentId: "parent-two", trashed: false },
  ] });
  const one = folderDescriptor("one", "f1", "parent-one");
  const two = folderDescriptor("two", "f2", "parent-two");
  event(model, { type: "begin-folder-create", device: "A", descriptor: one });
  event(model, { type: "advance", device: "A" });
  event(model, { type: "begin-folder-create", device: "A", descriptor: two });
  event(model, { type: "advance", device: "A" });
  event(model, { type: "recover", device: "A" });
  const byPath = new Map(model.devices.A.durable.journals.map(journal => [journal.path, journal]));
  assert.equal(model.devices.A.durable.pathState.get("one"), "conflict");
  assert.equal(byPath.get("one")?.effects[0].stage, "dispatch-authorized");
  assert.equal(byPath.get("two")?.effects[0].stage, "effect-verified");
  assert.equal(model.recoveryReads, 2);
});

const seeds = [1, 7, 42, 1337, 0xC0FFEE];
for (const seed of seeds) {
  test(`seeded randomized transition sequence ${seed} is deterministic and invariant-checked`, () => {
    const events = seededEvents(seed, 120);
    const first = runTrace({}, events, seed);
    const second = runTrace({}, events, seed);
    assert.equal(first.failure?.code, second.failure?.code);
    assert.deepEqual(first.final, second.final);
    assert.deepEqual(first.events, second.events);
  });
}

test("explicit replay reapplies recorded event trace and reproduces exact modeled result", () => {
  const initial = common();
  const events: ModelEvent[] = [
    { type: "local-write", device: "A", path: "note.md", content: "H1" },
    { type: "start-reconcile", device: "A" },
    { type: "advance", device: "A" },
    { type: "advance", device: "A" },
    { type: "dispatch", device: "A" },
    { type: "transport-lost", device: "A" },
    { type: "crash", device: "A" },
    { type: "restart", device: "A" },
    { type: "recover", device: "A" },
    { type: "advance", device: "A" },
  ];
  const recorded = runTrace(initial, events, 1337);
  const replayed = replayTrace(recorded, initial);
  assert.deepEqual(replayed.events, recorded.events);
  assert.deepEqual(replayed.final, recorded.final);
  assert.deepEqual(replayed.failure, recorded.failure);
});

test("simple trace minimizer retains only events needed for the same invariant failure", () => {
  const initial: InitialModelState = { remote: [
    { id: "r1", path: "dup.md", content: "1", kind: "file", revision: 1, trashed: false },
    { id: "r2", path: "dup.md", content: "2", kind: "file", revision: 1, trashed: false },
  ] };
  const noisy: ModelEvent[] = [
    { type: "local-write", device: "B", path: "noise.md", content: "noise" },
    { type: "integrity-reconcile", device: "B", path: "noise.md" },
    { type: "start-reconcile", device: "A", paths: ["dup.md"] },
    { type: "local-write", device: "B", path: "noise2.md", content: "noise2" },
  ];
  const failure = runTrace(initial, noisy, undefined, { negativeControlCollapseAmbiguity: true });
  assert.equal(failure.failure?.code, "duplicate-ambiguous-winner");
  const minimized = minimizeFailingTrace(initial, noisy, "duplicate-ambiguous-winner", { negativeControlCollapseAmbiguity: true });
  assert.ok(minimized.length < noisy.length);
  assert.equal(runTrace(initial, minimized, undefined, { negativeControlCollapseAmbiguity: true }).failure?.code, "duplicate-ambiguous-winner");
});

test("trace serialization is sanitized and contains no platform/user/auth secrets", () => {
  const trace = runTrace({}, seededEvents(42, 25), 42);
  const text = JSON.stringify(trace);
  assert.equal(/oauth|bearer|refresh[_-]?token|C:\\|\/Users\//i.test(text), false);
});
