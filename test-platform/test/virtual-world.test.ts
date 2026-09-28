import {
  deepStrictEqual,
  notStrictEqual,
  strictEqual,
} from "node:assert/strict";
import { test } from "node:test";

import {
  VirtualSynchronizationWorld,
  type VirtualProductionDevice,
} from "../src/virtual-world/virtual-world";
import {
  virtualDrivePath,
} from "../src/virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";

function source(bytes: Uint8Array) {
  const retained = Uint8Array.from(bytes);
  return {
    sizeBytes: retained.byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> {
      yield Uint8Array.from(retained);
    },
  };
}

async function createLocal(
  world: VirtualSynchronizationWorld,
  deviceName: string,
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  await world.deviceBacking(deviceName).local.createFile(
    virtualVaultPath(path),
    source(bytes),
  );
}

async function createRemote(
  world: VirtualSynchronizationWorld,
  path: string,
  bytes: Uint8Array,
) {
  const result = await world.drive.create(world.managedRemote.rootId, {
    path: virtualDrivePath(path),
    entityKind: "file",
    content: source(bytes),
  });
  if (!result.ok) throw new Error(result.signal.kind);
  return result.value.remoteObjectId;
}

async function readLocal(
  world: VirtualSynchronizationWorld,
  deviceName: string,
  path: string,
): Promise<Uint8Array | undefined> {
  const local = world.deviceBacking(deviceName).local;
  const vaultPath = virtualVaultPath(path);
  const observed = await local.observe(vaultPath);
  if (observed.status !== "present" || observed.entityKind !== "file") {
    return undefined;
  }
  const read = await local.readFile(vaultPath);
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of read.content.openChunks()) {
    const copy = Uint8Array.from(chunk);
    chunks.push(copy);
    length += copy.byteLength;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function preview(device: VirtualProductionDevice) {
  const plan = await device.controller.previewManual();
  if (!plan) throw new Error("production controller returned no manual plan");
  return plan;
}

async function executeReviewed(
  device: VirtualProductionDevice,
  plan: Awaited<ReturnType<typeof preview>>,
) {
  return device.controller.requestPreviewAction({
    kind: "execute-plan",
    planId: plan.planId,
  });
}

async function remoteBytes(
  world: VirtualSynchronizationWorld,
  remoteObjectId: Parameters<VirtualSynchronizationWorld["drive"]["download"]>[0],
): Promise<number[]> {
  const downloaded = await world.drive.download(remoteObjectId);
  if (!downloaded.ok) throw new Error(downloaded.signal.kind);
  const bytes: number[] = [];
  for await (const chunk of downloaded.value.content.openChunks()) {
    bytes.push(...chunk);
  }
  return bytes;
}

test("production canary: local create plans and executes a recovery-safe REMOTE upload/create", async () => {
  const world = await VirtualSynchronizationWorld.create();
  await createLocal(world, "device-a", "local-create.bin", new Uint8Array([1, 2, 3, 4]));
  const device = await world.reconstructDevice("device-a");

  const plan = await preview(device);
  const operation = plan.operations.find(
    value => String(value.path) === "local-create.bin",
  );
  strictEqual(operation?.kind, "upload-create");
  strictEqual(operation?.targetSide, "remote");

  const result = await executeReviewed(device, plan);
  strictEqual(result.status, "accepted");

  const observed = await world.drive.observe(
    world.managedRemote.rootId,
    virtualDrivePath("local-create.bin"),
  );
  strictEqual(observed.ok, true);
  if (!observed.ok || observed.value.status !== "present") return;
  strictEqual(observed.value.entityKind, "file");
  deepStrictEqual(
    await remoteBytes(world, observed.value.remoteObjectId!),
    [1, 2, 3, 4],
  );

  const state = await world.deviceBacking("device-a").load();
  strictEqual(state.status, "trusted");
  if (state.status === "trusted") {
    strictEqual(
      state.state.remoteMappings.some(
        entry =>
          String(entry.path) === "local-create.bin" &&
          entry.remoteObjectId === observed.value.remoteObjectId,
      ),
      true,
    );
    strictEqual(
      state.state.base.some(
        entry =>
          String(entry.path) === "local-create.bin" &&
          entry.localExisted &&
          entry.remoteExisted,
      ),
      true,
    );
  }

  await device.dispose();
});

test("production canary: remote create plans and executes a crash-safe LOCAL download/create", async () => {
  const world = await VirtualSynchronizationWorld.create();
  const remoteId = await createRemote(world,
    "remote-create.bin",
    new Uint8Array([9, 8, 7]),
  );
  const device = await world.reconstructDevice("device-a");

  const plan = await preview(device);
  const operation = plan.operations.find(
    value => String(value.path) === "remote-create.bin",
  );
  strictEqual(operation?.kind, "download-create");
  strictEqual(operation?.targetSide, "local");

  const result = await executeReviewed(device, plan);
  strictEqual(result.status, "accepted");
  deepStrictEqual(
    [...(await readLocal(world, "device-a", "remote-create.bin"))!],
    [9, 8, 7],
  );

  const state = await world.deviceBacking("device-a").load();
  strictEqual(state.status, "trusted");
  if (state.status === "trusted") {
    strictEqual(
      state.state.remoteMappings.some(
        entry =>
          String(entry.path) === "remote-create.bin" &&
          entry.remoteObjectId === remoteId,
      ),
      true,
    );
  }

  await device.dispose();
});

test("production canary: two independent devices synchronize through one shared REMOTE reality", async () => {
  const world = await VirtualSynchronizationWorld.create();
  await createLocal(world, "device-a", "shared.bin", new Uint8Array([4, 5, 6]));

  const a = await world.reconstructDevice("device-a");
  const aPlan = await preview(a);
  strictEqual(
    aPlan.operations.find(value => String(value.path) === "shared.bin")?.kind,
    "upload-create",
  );
  strictEqual((await executeReviewed(a, aPlan)).status, "accepted");

  const b = await world.reconstructDevice("device-b");
  const bPlan = await preview(b);
  strictEqual(
    bPlan.operations.find(value => String(value.path) === "shared.bin")?.kind,
    "download-create",
  );
  strictEqual((await executeReviewed(b, bPlan)).status, "accepted");

  deepStrictEqual(
    [...(await readLocal(world, "device-b", "shared.bin"))!],
    [4, 5, 6],
  );
  notStrictEqual(
    world.deviceBacking("device-a").storage,
    world.deviceBacking("device-b").storage,
  );
  notStrictEqual(
    world.deviceBacking("device-a").local,
    world.deviceBacking("device-b").local,
  );

  await a.dispose();
  await b.dispose();
});

test("production canary: a proven LOCAL rename produces an identity-preserving REMOTE move", async () => {
  const world = await VirtualSynchronizationWorld.create();
  await createLocal(world, "device-a", "move-old.bin", new Uint8Array([7, 7, 1]));
  const device = await world.reconstructDevice("device-a");

  const initial = await preview(device);
  strictEqual(
    initial.operations.find(value => String(value.path) === "move-old.bin")?.kind,
    "upload-create",
  );
  strictEqual((await executeReviewed(device, initial)).status, "accepted");

  const before = await world.drive.observe(
    world.managedRemote.rootId,
    virtualDrivePath("move-old.bin"),
  );
  if (!before.ok || before.value.status !== "present") {
    throw new Error("remote baseline missing before move");
  }
  const stableRemoteId = before.value.remoteObjectId!;

  await world.deviceBacking("device-a").local.move(
    virtualVaultPath("move-old.bin"),
    virtualVaultPath("move-new.bin"),
  );

  const movePlan = await preview(device);
  const move = movePlan.operations.find(
    value =>
      value.kind === "identity-preserving-move" &&
      String(value.fromPath) === "move-old.bin" &&
      String(value.toPath) === "move-new.bin",
  );
  strictEqual(move?.targetSide, "remote");
  strictEqual(move?.remoteObjectId, stableRemoteId);

  strictEqual((await executeReviewed(device, movePlan)).status, "accepted");

  const oldPath = await world.drive.observe(
    world.managedRemote.rootId,
    virtualDrivePath("move-old.bin"),
  );
  const newPath = await world.drive.observe(
    world.managedRemote.rootId,
    virtualDrivePath("move-new.bin"),
  );
  strictEqual(oldPath.ok, true);
  if (oldPath.ok) strictEqual(oldPath.value.status, "absent");
  strictEqual(newPath.ok, true);
  if (newPath.ok && newPath.value.status === "present") {
    strictEqual(newPath.value.remoteObjectId, stableRemoteId);
  }

  await device.dispose();
});

test("production canary: partial REMOTE listing cannot masquerade as authoritative deletion", async () => {
  const world = await VirtualSynchronizationWorld.create();
  await createLocal(world, "device-a", "partial.bin", new Uint8Array([2, 4, 6]));
  const device = await world.reconstructDevice("device-a");

  const baseline = await preview(device);
  strictEqual((await executeReviewed(device, baseline)).status, "accepted");

  const remote = await world.drive.observe(
    world.managedRemote.rootId,
    virtualDrivePath("partial.bin"),
  );
  if (!remote.ok || remote.value.status !== "present") {
    throw new Error("remote baseline missing");
  }

  world.drive.scriptNextListing({
    completeness: { status: "partial", reason: "simulated-listing-gap" },
    omitRemoteObjectIds: [remote.value.remoteObjectId!],
  });

  const uncertain = await preview(device);
  const operation = uncertain.operations.find(
    value => String(value.path) === "partial.bin",
  );
  strictEqual(operation?.kind, "blocked-unsafe");
  strictEqual(
    uncertain.operations.some(
      value =>
        String(value.path) === "partial.bin" &&
        (value.kind === "trash-local" || value.kind === "upload-create"),
    ),
    false,
  );

  const stillLocal = await readLocal(world, "device-a", "partial.bin");
  deepStrictEqual([...(stillLocal ?? new Uint8Array())], [2, 4, 6]);

  await device.dispose();
});

test("production canary: ambiguous applied REMOTE create remains unresolved until a later production recovery observation", async () => {
  const world = await VirtualSynchronizationWorld.create();
  await createLocal(
    world,
    "device-a",
    "ambiguous.bin",
    new Uint8Array([3, 1, 4, 1]),
  );
  const device = await world.reconstructDevice("device-a");

  const plan = await preview(device);
  strictEqual(
    plan.operations.find(value => String(value.path) === "ambiguous.bin")?.kind,
    "upload-create",
  );

  world.drive.queueBoundaryFault({
    boundary: "create",
    signal: { kind: "transient-failure", detail: "simulated-response-loss" },
    mutationEffect: "applied-before-failure",
  });
  device.remoteMutations.queuePostMutationObservationFailure(
    "simulated-post-dispatch-observation-loss",
  );

  const firstResult = await executeReviewed(device, plan);
  strictEqual(firstResult.status, "rejected");

  const physicallyPresent = await world.drive.observe(
    world.managedRemote.rootId,
    virtualDrivePath("ambiguous.bin"),
  );
  strictEqual(physicallyPresent.ok, true);
  if (physicallyPresent.ok) {
    strictEqual(physicallyPresent.value.status, "present");
  }

  const beforeRecovery = await world.deviceBacking("device-a").loadAuthority();
  strictEqual(beforeRecovery.status, "trusted");
  if (beforeRecovery.status === "trusted") {
    strictEqual(
      beforeRecovery.state.operationIntents.some(intent =>
        intent.effects.some(effect => effect.stage === "outcome-unknown"),
      ),
      true,
    );
  }

  const recoveredPlan = await preview(device);
  const afterRecovery = await world.deviceBacking("device-a").loadAuthority();
  strictEqual(afterRecovery.status, "trusted");
  if (afterRecovery.status === "trusted") {
    strictEqual(
      afterRecovery.state.operationIntents.some(intent =>
        intent.effects.some(effect => effect.stage === "outcome-unknown"),
      ),
      false,
    );
  }
  strictEqual(
    recoveredPlan.operations.some(
      value =>
        String(value.path) === "ambiguous.bin" &&
        value.kind === "upload-create",
    ),
    false,
  );

  await device.dispose();
});

test("production canary: reconstructed runtime is fresh while durable LOCAL REMOTE and authority reality remain retained", async () => {
  const world = await VirtualSynchronizationWorld.create();
  await createLocal(world, "device-a", "restart.bin", new Uint8Array([8, 6, 7, 5]));
  const first = await world.reconstructDevice("device-a");

  const baseline = await preview(first);
  strictEqual((await executeReviewed(first, baseline)).status, "accepted");

  const firstGeneration = first.runtime.generation;
  const stateBefore = await world.deviceBacking("device-a").loadAuthority();
  strictEqual(stateBefore.status, "trusted");

  await first.dispose();

  const second = await world.reconstructDevice("device-a");
  strictEqual(second.runtime.generation, firstGeneration + 1);
  notStrictEqual(second.controller, first.controller);
  notStrictEqual(second.runtime, first.runtime);

  deepStrictEqual(
    [...(await readLocal(world, "device-a", "restart.bin"))!],
    [8, 6, 7, 5],
  );
  const remote = await world.drive.observe(
    world.managedRemote.rootId,
    virtualDrivePath("restart.bin"),
  );
  strictEqual(remote.ok, true);
  if (remote.ok) strictEqual(remote.value.status, "present");

  const stateAfter = await world.deviceBacking("device-a").loadAuthority();
  strictEqual(stateAfter.status, "trusted");
  if (stateBefore.status === "trusted" && stateAfter.status === "trusted") {
    strictEqual(
      stateAfter.state.semanticGeneration,
      stateBefore.state.semanticGeneration,
    );
    strictEqual(
      stateAfter.state.persistenceRevision,
      stateBefore.state.persistenceRevision,
    );
  }

  const postRestartPlan = await preview(second);
  strictEqual(
    postRestartPlan.operations.some(
      value =>
        String(value.path) === "restart.bin" &&
        ["upload-create", "download-create"].includes(value.kind),
    ),
    false,
  );

  await second.dispose();
});
