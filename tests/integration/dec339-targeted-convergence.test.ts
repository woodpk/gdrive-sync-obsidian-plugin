import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type InventoryIdentityFence,
  type RecoverablePhysicalMutationDescriptorV1_1 } from "../../src/contracts";
import type { InventoryTargetedReadObservation } from "../../src/drive/verified-metadata-inventory-reader";
import {
  InventoryTargetedConvergenceReader, observeRemoteConvergenceWithFallback,
} from "../../src/product/inventory-targeted-convergence-read";
import { verifyPostDispatchConvergenceRead } from "../../src/product/authoritative-production-executor-base";
import type { RecoverableProductionMutationDependenciesV1_3 } from "../../src/product/authoritative-production-executor";

const id = <T extends string>(s: string) => contractId<T>(s);
const root = id<"RemoteObjectId">("root");
const content = id<"RemoteObjectId">("content");
const config = id<"RemoteObjectId">("config");
const parent = id<"RemoteObjectId">("parent");
const target = id<"RemoteObjectId">("reserved");
const path = id<"VaultPath">("folder/note.md");
const opId = id<"OperationId">("op:create");
const intentId = id<"MutationIntentId">("intent:create");
const semantic = id<"SemanticStateGeneration">("semantic:1");
const persistence = id<"StateRevision">("persistence:1");
const generation = "inventory:1" as import("../../src/contracts").InventoryGeneration;
const hash = id<"ContentHash">("sha256:fedcba");
const fence: InventoryIdentityFence = {
  vaultIdentity: id<"VaultIdentity">("vault"),
  deviceIdentity: id<"DeviceIdentity">("device"),
  pairedAccountKey: "opaque-account",
  managedRootId: root,
  protocolVersion: id<"ProtocolVersion">("1"),
  contentDomainRootId: content,
  configDomainRootId: config,
  scopePolicyFingerprint: "policy:1",
  inventorySchemaVersion: 2,
};
const fileCreate = {
  kind: "remote-file" as const, targetSide: "remote" as const,
  mutationKind: "create" as const, targetPath: path,
  intendedContent: { algorithm: "sha256" as const, hash, sizeBytes: 6 },
  remoteMutation: {
    kind: "reserved-file-create" as const, intentId,
    reservedRemoteObjectId: target, path,
    intendedContent: { algorithm: "sha256" as const, hash, sizeBytes: 6 },
  },
} satisfies RecoverablePhysicalMutationDescriptorV1_1;
const folderPath = id<"VaultPath">("folder/New");
const folderTarget = id<"RemoteObjectId">("folder-reserved");
const folderCreate = {
  kind: "remote-folder-create" as const, targetSide: "remote" as const,
  mutationKind: "create" as const, intentId, targetPath: folderPath,
  parentRemoteObjectId: parent,
  pathAuthority: {
    generation: semantic, targetPath: folderPath,
    parentPath: id<"VaultPath">("folder"),
    pathComparisonKey: "folder/new", expectedTarget: "absent" as const,
  },
  remoteMutation: {
    kind: "reserved-folder-create" as const, intentId,
    reservedRemoteObjectId: folderTarget, path: folderPath,
    parentRemoteObjectId: parent,
  },
} satisfies RecoverablePhysicalMutationDescriptorV1_1;

function fixture(options: {
  readonly descriptor?: RecoverablePhysicalMutationDescriptorV1_1;
  readonly enabled?: boolean;
  readonly intentStage?: "effect-verified" | "outcome-unknown" | "dispatch-authorized";
  readonly badRoot?: boolean;
  readonly stateDrift?: boolean;
  readonly badSiblings?: boolean;
  readonly badPath?: boolean;
  readonly noContent?: boolean;
  readonly wrongKind?: boolean;
  readonly missingProvenance?: boolean;
  readonly sourceFailure?: boolean;
  readonly wrongFence?: boolean;
  readonly targetedFailure?: boolean;
  readonly additionalIntent?: boolean;
  readonly unavailable?: boolean;
} = {}) {
  const descriptor = options.descriptor ?? fileCreate;
  const isFolder = descriptor.kind === "remote-folder-create";
  const expectedId = isFolder ? folderTarget : target;
  const expectedPath = isFolder ? folderPath : path;
  let reads = 0, targeted = 0, fallbackCalls = 0, authorityLoads = 0;
  const createEffect = {
    effectId: "effect:1", descriptor, stage: options.intentStage ?? "effect-verified",
    verificationEvidenceRef: "physical:verified",
  };
  const authority = {
    persistenceRevision: persistence, semanticGeneration: semantic,
    operationIntents: [
      { operationId: opId, intentId, semanticAuthority: { generation: semantic },
        effects: [createEffect] },
      ...(options.additionalIntent ? [{ operationId: id<"OperationId">("op:other"),
        intentId: id<"MutationIntentId">("intent:other"),
        semanticAuthority: { generation: semantic },
        effects: [{ ...createEffect, effectId: "other" }] }] : []),
    ],
  };
  const observation: InventoryTargetedReadObservation = {
    object: {
      generation, remoteObjectId: expectedId, parentRemoteObjectId: parent,
      domain: "content", name: isFolder ? "New" : "note.md",
      kind: isFolder ? "folder" : "file",
      pathValidity: "unknown", access: "visible", trashed: false,
      managedRootId: root, provenanceDomain: "content",
      ...(isFolder || options.noContent ? {} : { content: { hash, sizeBytes: 6 } }),
    },
    siblingIds: options.badSiblings ? [expectedId, id<"RemoteObjectId">("other")] : [expectedId],
    parentChain: [parent, content], appVisibleOnly: true,
    // Intentionally corrupt the provider proof at runtime for negative testing.
    rootWideMarkedProvenanceRechecked: (options.missingProvenance ? false : true) as true,
    executorProofAuthorized: false,
    observedLogicalPath: options.badPath ? id<"VaultPath">("other/note.md") : expectedPath,
  };
  const deps = {
    metadata: { getFile: async () => {
      reads++;
      return options.sourceFailure ? { status: "unknown" as const, reason: "404" } : {
        status: "ok" as const, value: {
          id: String(expectedId), name: isFolder ? "New" : "note.md",
          parents: [String(parent)], trashed: false,
        },
      };
    } },
    reader: { targeted: async () => {
      targeted++;
      return options.targetedFailure
        ? { status: "partial" as const, reason: "missing-page" }
        : { status: "ok" as const, value: observation };
    } },
    authorityStore: { loadAuthority: async () => {
      authorityLoads++;
      if (options.unavailable) return { status: "recovery-required" as const, reason: "corrupt" };
      return { status: "trusted" as const, state: {
        ...authority, persistenceRevision: options.stateDrift && authorityLoads >= 2 ?
          id<"PersistenceRevision">("persistence:2") : persistence,
      } };
    } },
    currentFence: async () => options.wrongFence ? { ...fence, pairedAccountKey: "wrong" } : fence,
  };
  const observer = new InventoryTargetedConvergenceReader(deps as never);
  const context = {
    operationId: opId, effectId: "effect:1", descriptor,
    expectedFence: fence, generation, enabled: options.enabled ?? true,
  };
  const fallback = async () => { fallbackCalls++; return { ok: false as const, reason: "canonical-remote-reconciliation" }; };
  return {
    observer, context, fallback,
    get reads() { return reads; }, get targeted() { return targeted; },
    get fallbackCalls() { return fallbackCalls; },
  };
}

test("D339-06 file-create proof checks exact current identity/content and preserves durable lifecycle", async () => {
  const f = fixture();
  const verified = await f.observer.observe(f.context);
  assert.equal(verified.status, "verified-convergence-read");
  assert.equal(f.reads, 1);
  assert.equal(f.targeted, 1);
  const delegated = await observeRemoteConvergenceWithFallback(f.observer, f.context, f.fallback);
  assert.deepEqual(delegated, { ok: true });
  assert.equal(f.fallbackCalls, 0);
});

test("D339-06 folder-create proof checks reserved folder identity and parent", async () => {
  const f = fixture({ descriptor: folderCreate });
  assert.equal((await f.observer.observe(f.context)).status, "verified-convergence-read");
});

test("D339-06 optimization is disabled by default and never calls provider", async () => {
  const f = fixture({ enabled: false });
  assert.equal((await f.observer.observe(f.context)).status, "fallback-required");
  assert.equal(f.reads, 0);
  assert.equal(f.targeted, 0);
  assert.deepEqual(await observeRemoteConvergenceWithFallback(f.observer, f.context, f.fallback),
    { ok: false, reason: "canonical-remote-reconciliation" });
  assert.equal(f.fallbackCalls, 1);
});

test("D339-06 missing, stale, or ambiguous proof invokes original full reconciliation", async () => {
  for (const option of [
    { badSiblings: true }, { badPath: true }, { noContent: true },
    { missingProvenance: true }, { stateDrift: true },
    { wrongFence: true }, { sourceFailure: true }, { targetedFailure: true },
    { intentStage: "outcome-unknown" as const }, { intentStage: "dispatch-authorized" as const },
    { additionalIntent: true }, { unavailable: true },
  ]) {
    const f = fixture(option);
    const result = await observeRemoteConvergenceWithFallback(f.observer, f.context, f.fallback);
    assert.deepEqual(result, { ok: false, reason: "canonical-remote-reconciliation" }, JSON.stringify(option));
    assert.equal(f.fallbackCalls, 1);
  }
});

test("D339-06 never accepts update/move/trash/deletion/recovery as positive targeted convergence", async () => {
  const f = fixture();
  for (const descriptor of [
    { ...fileCreate, mutationKind: "update", remoteMutation: {
      kind: "existing-file-content-update", intentId, remoteObjectId: target,
      expectedRevision: id<"RemoteRevisionId">("revision:1"),
      path, updateProtocol: "immutable-candidate-preservation", candidateRemoteObjectId: target,
      intendedContent: fileCreate.intendedContent,
      identityAuthority: { status: "unique", generation: semantic, path, remoteObjectId: target },
    } },
    { kind: "trash", targetSide: "remote", path, remoteObjectId: target },
    { kind: "move", targetSide: "remote", fromPath: path, toPath: folderPath, remoteObjectId: target },
  ]) {
    const result = await f.observer.observe({ ...f.context, descriptor } as never);
    assert.equal(result.status, "fallback-required");
  }
  assert.equal(f.reads, 0);
  assert.equal(f.targeted, 0);
});

test("D339-06 no optional read adapter always uses the existing authoritative reconciliation", async () => {
  const f = fixture();
  assert.deepEqual(await observeRemoteConvergenceWithFallback(undefined, f.context, f.fallback),
    { ok: false, reason: "canonical-remote-reconciliation" });
});

test("D339-06B executor's post-dispatch seam consumes real fresh read only after opted-in verified create", async () => {
  const f = fixture();
  let fullReads = 0;
  const targetedConvergence = {
    enabled: true, reader: f.observer, expectedFence: f.context.expectedFence,
    generation: f.context.generation,
  };
  const configuredV13: RecoverableProductionMutationDependenciesV1_3 = { targetedConvergence };
  assert.equal(configuredV13.targetedConvergence, targetedConvergence);
  const outcome = await verifyPostDispatchConvergenceRead(
    opId, "effect:1", fileCreate, { targetedConvergence },
    async () => { fullReads++; return { ok: false, reason: "full-read-not-converged" }; },
  );
  assert.deepEqual(outcome, { ok: true });
  assert.equal(fullReads, 0);
  assert.equal(f.reads, 1);
  assert.equal(f.targeted, 1);
});

test("D339-06B missing or default-disabled option uses existing complete reconciliation", async () => {
  let fullReads = 0, optionalReads = 0;
  const fallback = async () => {
    fullReads++;
    return { ok: false as const, reason: "full-reconciliation" };
  };
  const disabledReader = { observe: async () => {
    optionalReads++;
    throw new Error("disabled-reader-was-called");
  } };
  assert.deepEqual(await verifyPostDispatchConvergenceRead(opId, "effect:1", fileCreate, {}, fallback),
    { ok: false, reason: "full-reconciliation" });
  assert.deepEqual(await verifyPostDispatchConvergenceRead(opId, "effect:1", fileCreate, {
    targetedConvergence: {
      reader: disabledReader, expectedFence: fence, generation,
    },
  }, fallback), { ok: false, reason: "full-reconciliation" });
  assert.deepEqual(await verifyPostDispatchConvergenceRead(opId, "effect:1", fileCreate, {
    targetedConvergence: {
      enabled: false, reader: disabledReader, expectedFence: fence, generation,
    },
  }, fallback), { ok: false, reason: "full-reconciliation" });
  assert.equal(optionalReads, 0);
  assert.equal(fullReads, 3);
});

test("D339-06B mismatched targeted identity, effect, operation or path never verifies the effect", async () => {
  const cases = [
    { remoteObjectId: id<"RemoteObjectId">("not-reserved") },
    { effectId: "effect:unrelated" },
    { operationId: id<"OperationId">("op:unrelated") },
    { targetPath: id<"VaultPath">("other/file.md") },
  ];
  for (const alteration of cases) {
    let fullReads = 0;
    const observer = { observe: async () => ({
      status: "verified-convergence-read" as const,
      operationId: opId, effectId: "effect:1",
      targetPath: path, remoteObjectId: target,
      ...alteration,
    }) };
    const observed = await verifyPostDispatchConvergenceRead(opId, "effect:1", fileCreate, {
      targetedConvergence: { enabled: true, reader: observer, expectedFence: fence, generation },
    }, async () => { fullReads++; return { ok: false, reason: "full-read" }; });
    assert.deepEqual(observed, { ok: false, reason: "full-read" }, JSON.stringify(alteration));
    assert.equal(fullReads, 1);
  }
});

test("D339-06B provider exceptions, missing proof and ambiguous occupancy invoke full read", async () => {
  let fullReads = 0;
  const fallback = async () => { fullReads++; return { ok: false as const, reason: "canonical-listing" }; };
  const throws = { observe: async () => { throw new Error("provider-offline"); } };
  assert.deepEqual(await verifyPostDispatchConvergenceRead(opId, "effect:1", fileCreate, {
    targetedConvergence: { enabled: true, reader: throws, expectedFence: fence, generation },
  }, fallback), { ok: false, reason: "canonical-listing" });
  for (const option of [
    { badSiblings: true }, { noContent: true }, { missingProvenance: true },
    { stateDrift: true }, { intentStage: "outcome-unknown" as const },
  ]) {
    const f = fixture(option);
    assert.deepEqual(await verifyPostDispatchConvergenceRead(opId, "effect:1", fileCreate, {
      targetedConvergence: {
        enabled: true, reader: f.observer,
        expectedFence: f.context.expectedFence, generation: f.context.generation,
      },
    }, fallback), { ok: false, reason: "canonical-listing" });
  }
  assert.equal(fullReads, 6);
});

test("D339-06B move/trash/update are never sent to targeted proof even when option enabled", async () => {
  const unsupported = [
    { ...fileCreate, mutationKind: "update" },
    { kind: "move", targetSide: "remote", fromPath: path, toPath: folderPath, remoteObjectId: target },
    { kind: "trash", targetSide: "remote", path, remoteObjectId: target },
  ];
  let fullReads = 0, targetedReads = 0;
  const reader = { observe: async () => {
    targetedReads++;
    throw new Error("non-create-proof-should-not-run");
  } };
  for (const descriptor of unsupported) {
    assert.deepEqual(await verifyPostDispatchConvergenceRead(
      opId, "effect:1", descriptor as never,
      { targetedConvergence: { enabled: true, reader, expectedFence: fence, generation } },
      async () => { fullReads++; return { ok: false, reason: "existing-convergence" }; },
    ), { ok: false, reason: "existing-convergence" });
  }
  assert.equal(fullReads, unsupported.length);
  assert.equal(targetedReads, 0);
});

test("D339-06B eligible folder-create positive read and conflicting folder proof are fenced", async () => {
  const accepted = fixture({ descriptor: folderCreate });
  const deps = { targetedConvergence: {
    enabled: true, reader: accepted.observer,
    expectedFence: accepted.context.expectedFence, generation: accepted.context.generation,
  } };
  let fallbackCount = 0;
  const fallback = async () => { fallbackCount++; return { ok: false as const, reason: "canonical-folder-read" }; };
  assert.deepEqual(await verifyPostDispatchConvergenceRead(opId, "effect:1", folderCreate, deps, fallback),
    { ok: true });
  assert.equal(fallbackCount, 0);
  const mismatched = fixture({ descriptor: folderCreate, badPath: true });
  assert.deepEqual(await verifyPostDispatchConvergenceRead(opId, "effect:1", folderCreate, {
    targetedConvergence: { ...deps.targetedConvergence, reader: mismatched.observer },
  }, fallback), { ok: false, reason: "canonical-folder-read" });
  assert.equal(fallbackCount, 1);
});
