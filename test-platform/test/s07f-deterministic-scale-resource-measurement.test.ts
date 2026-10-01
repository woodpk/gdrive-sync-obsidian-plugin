import { createHash } from "node:crypto";
import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

import { virtualDrivePath } from "../src/virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";
import { VirtualSynchronizationWorld } from "../src/virtual-world/virtual-world";

const LARGE_FILE_BYTES = 16 * 1024 * 1024;
const SOURCE_CHUNK_BYTES = 64 * 1024;
const VAULT_FILE_COUNT = 256;
const VAULT_FILE_BYTES = 4 * 1024;
const UPDATE_FILE_COUNT = 64;

interface MemorySample {
  readonly rss: number;
  readonly heapUsed: number;
  readonly external: number;
  readonly arrayBuffers: number;
}

function sampleMemory(): MemorySample {
  const value = process.memoryUsage();
  return {
    rss: value.rss,
    heapUsed: value.heapUsed,
    external: value.external,
    arrayBuffers: value.arrayBuffers,
  };
}

function maxSample(samples: readonly MemorySample[]): MemorySample {
  return {
    rss: Math.max(...samples.map(sample => sample.rss)),
    heapUsed: Math.max(...samples.map(sample => sample.heapUsed)),
    external: Math.max(...samples.map(sample => sample.external)),
    arrayBuffers: Math.max(...samples.map(sample => sample.arrayBuffers)),
  };
}

function filledSource(sizeBytes: number, value: number, chunkBytes = SOURCE_CHUNK_BYTES) {
  return {
    sizeBytes,
    async *openChunks(): AsyncIterable<Uint8Array> {
      let remaining = sizeBytes;
      while (remaining > 0) {
        const length = Math.min(chunkBytes, remaining);
        const bytes = new Uint8Array(length);
        bytes.fill(value & 0xff);
        yield bytes;
        remaining -= length;
      }
    },
  };
}

function expectedHash(sizeBytes: number, value: number): string {
  const hash = createHash("sha256");
  let remaining = sizeBytes;
  while (remaining > 0) {
    const length = Math.min(SOURCE_CHUNK_BYTES, remaining);
    const bytes = new Uint8Array(length);
    bytes.fill(value & 0xff);
    hash.update(bytes);
    remaining -= length;
  }
  return `sha256:${hash.digest("hex")}`;
}

function elapsedMs(started: bigint): number {
  return Number(process.hrtime.bigint() - started) / 1_000_000;
}

function emitMeasurement(name: string, details: Readonly<Record<string, unknown>>): void {
  console.log(`S07F_MEASUREMENT ${JSON.stringify({
    name,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    ...details,
  })}`);
}

test("16 MiB deterministic file remains content-identical through production synchronization with bounded host measurements", async () => {
  const world = await VirtualSynchronizationWorld.create();
  const samples: MemorySample[] = [sampleMemory()];
  const started = process.hrtime.bigint();
  const path = "s07f-large-16m.bin";
  const expected = expectedHash(LARGE_FILE_BYTES, 0x5a);

  await world.deviceBacking("device-a").local.replaceFile(
    virtualVaultPath(path),
    filledSource(LARGE_FILE_BYTES, 0x5a),
  );
  samples.push(sampleMemory());

  const device = await world.reconstructDevice("device-a");
  const plan = await device.controller.previewManual();
  ok(plan);
  equal(plan.operations.filter(operation => operation.kind === "upload-create").length, 1);

  const executed = await device.controller.request({ kind: "execute-plan", planId: plan.planId });
  equal(executed.status, "accepted");
  samples.push(sampleMemory());

  const remote = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
  equal(remote.ok, true);
  if (remote.ok) {
    equal(remote.value.status, "present");
    if (remote.value.status === "present") {
      equal(remote.value.content?.sizeBytes, LARGE_FILE_BYTES);
      equal(String(remote.value.content?.hash), expected);
    }
  }

  const state = await world.deviceBacking("device-a").load();
  equal(state.status, "trusted");
  if (state.status === "trusted") {
    equal(state.state.base.length, 1);
    equal(state.state.remoteMappings.length, 1);
  }

  const measurement = {
    fileBytes: LARGE_FILE_BYTES,
    sourceChunkBytes: SOURCE_CHUNK_BYTES,
    elapsedMs: elapsedMs(started),
    sampledMemory: {
      before: samples[0],
      afterFixture: samples[1],
      afterSync: samples[2],
      sampledMax: maxSample(samples),
    },
  };
  ok(Number.isFinite(measurement.elapsedMs) && measurement.elapsedMs >= 0);
  emitMeasurement("large-file-virtual-sync", measurement);
  await device.dispose();
});

test("256-file vault plus 64-file update batch preserves identity/state and emits bounded host measurements", async () => {
  const world = await VirtualSynchronizationWorld.create();
  const samples: MemorySample[] = [sampleMemory()];
  const fixtureStarted = process.hrtime.bigint();

  for (let index = 0; index < VAULT_FILE_COUNT; index += 1) {
    await world.deviceBacking("device-a").local.replaceFile(
      virtualVaultPath(`scale-file-${String(index).padStart(3, "0")}.bin`),
      filledSource(VAULT_FILE_BYTES, index),
    );
  }
  const fixtureElapsedMs = elapsedMs(fixtureStarted);
  samples.push(sampleMemory());

  const device = await world.reconstructDevice("device-a");
  const initialStarted = process.hrtime.bigint();
  const initialPlan = await device.controller.previewManual();
  ok(initialPlan);
  equal(initialPlan.operations.filter(operation => operation.kind === "upload-create").length, VAULT_FILE_COUNT);

  const initialResult = await device.controller.request({ kind: "execute-plan", planId: initialPlan.planId });
  equal(initialResult.status, "accepted");
  const initialElapsedMs = elapsedMs(initialStarted);
  samples.push(sampleMemory());

  const initialIds = new Map<string, string>();
  for (let index = 0; index < VAULT_FILE_COUNT; index += 1) {
    const path = `scale-file-${String(index).padStart(3, "0")}.bin`;
    const observed = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
    equal(observed.ok, true);
    if (!observed.ok || observed.value.status !== "present") throw new Error(`missing remote scale file: ${path}`);
    equal(observed.value.content?.sizeBytes, VAULT_FILE_BYTES);
    equal(String(observed.value.content?.hash), expectedHash(VAULT_FILE_BYTES, index));
    initialIds.set(path, String(observed.value.remoteObjectId));
  }
  equal(new Set(initialIds.values()).size, VAULT_FILE_COUNT);

  const trustedAfterCreate = await world.deviceBacking("device-a").load();
  equal(trustedAfterCreate.status, "trusted");
  if (trustedAfterCreate.status === "trusted") {
    equal(trustedAfterCreate.state.base.length, VAULT_FILE_COUNT);
    equal(trustedAfterCreate.state.remoteMappings.length, VAULT_FILE_COUNT);
  }

  for (let index = 0; index < UPDATE_FILE_COUNT; index += 1) {
    await world.deviceBacking("device-a").local.replaceFile(
      virtualVaultPath(`scale-file-${String(index).padStart(3, "0")}.bin`),
      filledSource(VAULT_FILE_BYTES, 0x80 + index),
    );
  }
  samples.push(sampleMemory());

  const updateStarted = process.hrtime.bigint();
  const updatePlan = await device.controller.previewManual();
  ok(updatePlan);
  equal(updatePlan.operations.filter(operation => operation.kind === "upload-update").length, UPDATE_FILE_COUNT);

  const updateResult = await device.controller.request({ kind: "execute-plan", planId: updatePlan.planId });
  equal(updateResult.status, "accepted");
  const updateElapsedMs = elapsedMs(updateStarted);
  samples.push(sampleMemory());

  for (let index = 0; index < UPDATE_FILE_COUNT; index += 1) {
    const path = `scale-file-${String(index).padStart(3, "0")}.bin`;
    const observed = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
    equal(observed.ok, true);
    if (!observed.ok || observed.value.status !== "present") throw new Error(`missing updated scale file: ${path}`);
    equal(String(observed.value.remoteObjectId), initialIds.get(path));
    equal(String(observed.value.content?.hash), expectedHash(VAULT_FILE_BYTES, 0x80 + index));
  }

  const trustedAfterUpdate = await world.deviceBacking("device-a").load();
  equal(trustedAfterUpdate.status, "trusted");
  if (trustedAfterUpdate.status === "trusted") {
    equal(trustedAfterUpdate.state.base.length, VAULT_FILE_COUNT);
    equal(trustedAfterUpdate.state.remoteMappings.length, VAULT_FILE_COUNT);
  }

  const measurement = {
    fileCount: VAULT_FILE_COUNT,
    bytesPerFile: VAULT_FILE_BYTES,
    initialUploadOperationCount: VAULT_FILE_COUNT,
    updateOperationCount: UPDATE_FILE_COUNT,
    fixtureElapsedMs,
    initialSyncElapsedMs: initialElapsedMs,
    updateSyncElapsedMs: updateElapsedMs,
    sampledMemory: {
      before: samples[0],
      afterFixture: samples[1],
      afterInitialSync: samples[2],
      afterUpdateFixture: samples[3],
      afterUpdateSync: samples[4],
      sampledMax: maxSample(samples),
    },
  };
  ok([fixtureElapsedMs, initialElapsedMs, updateElapsedMs].every(value => Number.isFinite(value) && value >= 0));
  emitMeasurement("large-vault-virtual-sync", measurement);
  await device.dispose();
});
