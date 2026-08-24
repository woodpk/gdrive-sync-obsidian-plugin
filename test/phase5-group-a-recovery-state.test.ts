import assert from "node:assert/strict";
import test from "node:test";
import type {
  ConflictAssessment,
  ContentEvidence,
  ManagedRemoteIdentity,
  PathSnapshot,
  PlannedOperation,
  VaultPath,
  VersionReference,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import type { AssembledPlanningInput } from "../src/product/snapshot-assembler";
import {
  createInitialTrustedState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
} from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const vault = id<"VaultIdentity">("vault:group-a-recovery");
const device = id<"DeviceIdentity">("device:group-a-recovery");
const managed: ManagedRemoteIdentity = {
  rootId: id<"RemoteObjectId">("root:group-a"),
  vaultIdentity: vault,
  protocolVersion: id<"ProtocolVersion">("1"),
};
const context = {
  expectation: "existing-pairing" as const,
  expectedVaultIdentity: vault,
  expectedDeviceIdentity: device,
};
const evidence = (value: string): ContentEvidence => ({ hash: sha256Text(value), sizeBytes: value.length });
const resolver = new ThreeWayConflictResolver({ readText: async () => undefined });

function conflictSnapshot(name: string): PathSnapshot {
  const path = vp(name);
  return {
    path,
    local: {
      status: "present",
      side: "local",
      path,
      entityKind: "file",
      content: evidence(`local-${name}`),
      stability: "stable",
      observationToken: id<"ObservationToken">(`local-token-${name}`),
    },
    remote: {
      status: "present",
      side: "remote",
      path,
      entityKind: "file",
      content: { ...evidence(`remote-${name}`), revision: `remote-revision-${name}` },
      remoteObjectId: id<"RemoteObjectId">(`remote-id-${name}`),
      stability: "stable",
    },
    base: { status: "uninitialized" },
    remoteEnumeration: { status: "complete" },
    identity: { status: "unambiguous" },
  };
}

function localOnlySnapshot(name: string): PathSnapshot {
  const path = vp(name);
  return {
    path,
    local: {
      status: "present",
      side: "local",
      path,
      entityKind: "file",
      content: evidence(`local-${name}`),
      stability: "stable",
      observationToken: id<"ObservationToken">(`local-token-${name}`),
    },
    remote: { status: "missing", side: "remote", path },
    base: { status: "uninitialized" },
    remoteEnumeration: { status: "complete" },
    identity: { status: "unambiguous" },
  };
}

function recoveryAssembly(snapshots: readonly PathSnapshot[]): AssembledPlanningInput {
  return {
    input: { snapshots, state: { status: "uninitialized" } },
    managedRemote: managed,
    remoteEnumeration: { status: "complete" },
    mode: "full",
    reconstruction: true,
    nextCursor: id<"ChangeCursor">("cursor:group-a-recovery"),
  };
}

function fakeExecutor() {
  return {
    validatePreconditions: async () => ({ status: "valid" as const }),
    execute: async (operation: PlannedOperation) => ({
      status: "durable-verified-success" as const,
      receipt: {
        operationId: operation.operationId,
        durable: true,
        integrityVerified: true,
        evidence: operation.contentVersion?.content,
        resultingRemoteObjectId:
          operation.remoteObjectId ??
          (operation.kind === "upload-create" ? id<"RemoteObjectId">(`created:${String(operation.path)}`) : undefined),
        verificationEvidenceRef: `group-a:${String(operation.operationId)}`,
      },
    }),
    versionStillCurrent: async () => true,
    currentLocalVersion: async (path: VaultPath): Promise<VersionReference> => ({
      path,
      entityKind: "file",
      content: evidence(`current-${String(path)}`),
      observationToken: id<"ObservationToken">(`current-token-${String(path)}`),
    }),
    localPathState: async () => "absent" as const,
    failureScope: () => "global" as const,
  };
}

async function seededStore() {
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await store.saveTrusted(createInitialTrustedState({
    stateRevision: id<"StateRevision">("state:0"),
    vaultIdentity: vault,
    deviceIdentity: device,
  }));
  return store;
}

function assertPreservedState(
  state: Awaited<ReturnType<PersistentSynchronizationStateStore["load"]>>,
  expectedBasePaths: readonly string[],
  expectedMappingPaths: readonly string[],
  minimumCompletedOperations: number,
): void {
  assert.equal(state.status, "trusted");
  if (state.status !== "trusted") return;
  for (const path of expectedBasePaths) {
    assert.equal(state.state.base.some(entry => String(entry.path) === path), true, `missing BASE entry ${path}`);
  }
  for (const path of expectedMappingPaths) {
    assert.equal(state.state.remoteMappings.some(entry => String(entry.path) === path), true, `missing remote mapping ${path}`);
  }
  assert.ok(
    state.state.operations.filter(entry => entry.status === "completed").length >= minimumCompletedOperations,
    `expected at least ${minimumCompletedOperations} completed journal entries`,
  );
}

test("GROUP A A1 recovery resolutions preserve already reconstructed trusted BASE, mappings, and journal until fresh reconstruction clears recovery", async () => {
  const store = await seededStore();
  let recovery = true;
  const gateEvents: boolean[] = [];
  let snapshots: readonly PathSnapshot[] = [
    localOnlySnapshot("safe-union.md"),
    conflictSnapshot("conflict-one.bin"),
    conflictSnapshot("conflict-two.bin"),
  ];

  const controller = new IntegratedProductController({
    vaultIdentity: vault,
    deviceIdentity: device,
    stateContext: context,
    stateStore: store,
    snapshotAssembler: { assembleRecovery: async () => recoveryAssembly(snapshots) } as never,
    executor: fakeExecutor() as never,
    conflictResolver: resolver,
    plannerForTrigger: trigger => new DeterministicSynchronizationPlanner(resolver, undefined, { trigger }),
    leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never,
    audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 100),
    holderId: "group-a-recovery-state",
    recoveryActive: () => recovery,
    onRecoveryGateChanged: async active => { gateEvents.push(active); recovery = active; },
  });

  const reconstruction = await controller.previewVerifyReconcile();
  assert.ok(reconstruction);
  assert.equal(controller.currentSurface().conflicts.length, 2);
  assert.equal((await controller.request({ kind: "execute-plan", planId: reconstruction!.planId })).status, "accepted");
  assert.equal(recovery, true);
  assert.equal(gateEvents.includes(false), false);
  assertPreservedState(await store.load(context), ["safe-union.md"], ["safe-union.md"], 1);

  const conflicts = [...controller.currentSurface().conflicts] as Exclude<ConflictAssessment, { kind: "none" }>[];
  const first = conflicts[0];
  const second = conflicts[1];
  assert.ok(first && "conflictId" in first);
  assert.ok(second && "conflictId" in second);

  if (first && "conflictId" in first) {
    assert.equal((await controller.request({
      kind: "resolve-conflict",
      conflictId: first.conflictId,
      resolution: { kind: "keep-local" },
    })).status, "accepted");
  }
  assert.equal(recovery, true);
  assert.equal(gateEvents.includes(false), false);
  assertPreservedState(
    await store.load(context),
    ["safe-union.md", "conflict-one.bin"],
    ["safe-union.md", "conflict-one.bin"],
    2,
  );

  if (second && "conflictId" in second) {
    assert.equal((await controller.request({
      kind: "resolve-conflict",
      conflictId: second.conflictId,
      resolution: { kind: "keep-local" },
    })).status, "accepted");
  }
  assert.equal(recovery, true);
  assert.equal(gateEvents.includes(false), false);
  assertPreservedState(
    await store.load(context),
    ["safe-union.md", "conflict-one.bin", "conflict-two.bin"],
    ["safe-union.md", "conflict-one.bin", "conflict-two.bin"],
    3,
  );

  snapshots = [];
  const finalReconstruction = await controller.previewVerifyReconcile();
  assert.ok(finalReconstruction);
  assert.equal((await controller.request({ kind: "execute-plan", planId: finalReconstruction!.planId })).status, "accepted");
  assert.equal(recovery, false);
  assert.deepEqual(gateEvents, [false]);

  const finalState = await store.load(context);
  assertPreservedState(
    finalState,
    ["safe-union.md", "conflict-one.bin", "conflict-two.bin"],
    ["safe-union.md", "conflict-one.bin", "conflict-two.bin"],
    3,
  );
  assert.equal(finalState.status, "trusted");
  if (finalState.status === "trusted") assert.equal(String(finalState.state.changeCursor), "cursor:group-a-recovery");
  assert.equal((await controller.readAuditHistory()).some(record => record.event === "recovery-completed"), true);
});
