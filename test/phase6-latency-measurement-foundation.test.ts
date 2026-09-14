import assert from "node:assert/strict";
import test from "node:test";
import type { App, DataAdapter } from "obsidian";

import {
  contractId,
  type BinaryContentSource,
  type PlannedOperation,
  type SynchronizationAuthorityMetadataV1_1,
  type TrustedSynchronizationState,
  type VaultPath,
} from "../src/contracts";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { AuthorityCompleteExecutionCoordinator } from "../src/core/execution-coordinator";
import { ObsidianLocalVaultAdapter } from "../src/local/obsidian-local-vault";
import { createAuthoritativeProductExecutor } from "../src/product/authoritative-production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;

function deferred(): { readonly promise: Promise<void>; resolve(): void } {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

interface LocalMeasurementHarness {
  readonly local: ObsidianLocalVaultAdapter;
  readonly events: string[];
  readonly counts: {
    exists: number;
    stat: number;
    list: number;
    stabilityWindows: number;
  };
}

function localMeasurementHarness(): LocalMeasurementHarness {
  const events: string[] = [];
  const counts = { exists: 0, stat: 0, list: 0, stabilityWindows: 0 };
  const statCalls = new Map<string, number>();
  const files = new Map<string, { readonly size: number; readonly mtime: number }>([
    ["a.md", { size: 3, mtime: 10 }],
    ["b.md", { size: 5, mtime: 20 }],
  ]);

  const adapter = {
    getName: () => "lat01-measurement-fake",
    exists: async (raw: string) => {
      counts.exists += 1;
      events.push(`exists:${raw}`);
      return files.has(raw);
    },
    stat: async (raw: string) => {
      counts.stat += 1;
      const call = (statCalls.get(raw) ?? 0) + 1;
      statCalls.set(raw, call);
      events.push(`stat:${raw}:${call}`);
      const file = files.get(raw);
      if (!file) return null;
      if (call % 2 === 2) {
        counts.stabilityWindows += 1;
        events.push(`stability-window-complete:${raw}:${call / 2}`);
      }
      return { type: "file" as const, ctime: 1, mtime: file.mtime, size: file.size };
    },
    list: async (raw: string) => {
      counts.list += 1;
      events.push(`list:${raw || "/"}`);
      return raw === ""
        ? { folders: [], files: [...files.keys()] }
        : { folders: [], files: [] };
    },
    getResourcePath: (raw: string) => `memory://${raw}`,
  } as unknown as DataAdapter;

  const eventRef = {} as never;
  const app = {
    vault: {
      adapter,
      configDir: ".cfg",
      on: () => eventRef,
      offref: () => undefined,
      getAbstractFileByPath: () => null,
    },
    workspace: { onLayoutReady: () => undefined },
  } as unknown as App;

  return {
    local: new ObsidianLocalVaultAdapter(app, {
      externalReferenceGuard: { assertSafe: async () => undefined },
      stabilityDelayMs: 0,
    }),
    events,
    counts,
  };
}

test("LAT-01 local enumeration measures exact observation work and proves independent file observations are serial", async () => {
  const h = localMeasurementHarness();
  const listing = await h.local.enumerate();

  assert.equal(listing.completeness.status, "complete");
  assert.deepEqual(h.counts, { exists: 2, stat: 4, list: 1, stabilityWindows: 2 });
  assert.deepEqual(
    h.events.filter(value => value.startsWith("stability-window-complete:")),
    ["stability-window-complete:a.md:1", "stability-window-complete:b.md:1"],
  );
  const aComplete = h.events.indexOf("stability-window-complete:a.md:1");
  const bStarted = h.events.indexOf("exists:b.md");
  assert.notEqual(aComplete, -1);
  assert.notEqual(bStarted, -1);
  assert.ok(aComplete < bStarted, "b.md must not begin observation until a.md has completed its stability check");
});

test("LAT-01 local read boundary exposes repeated observation of one unchanged file", async () => {
  const h = localMeasurementHarness();
  const first = await h.local.observe(path("a.md"));
  assert.equal(first.status, "present");
  if (first.status !== "present") return;

  await h.local.readFile(path("a.md"), first.observationToken);

  assert.deepEqual(h.counts, { exists: 2, stat: 4, list: 0, stabilityWindows: 2 });
  assert.deepEqual(
    h.events.filter(value => value.startsWith("stability-window-complete:a.md")),
    ["stability-window-complete:a.md:1", "stability-window-complete:a.md:2"],
  );
});

const vaultIdentity = id<"VaultIdentity">("vault:lat01");
const deviceIdentity = id<"DeviceIdentity">("device:lat01");
const remoteRoot = id<"RemoteObjectId">("remote:lat01-root");
const managedRemote = {
  rootId: remoteRoot,
  vaultIdentity,
  protocolVersion: id<"ProtocolVersion">("1"),
} as never;
const stateContext = {
  expectation: "existing-pairing" as const,
  expectedVaultIdentity: vaultIdentity,
  expectedDeviceIdentity: deviceIdentity,
};

function emptyTrustedState(changeCursor?: string): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: id<"StateRevision">("state:lat01"),
    vaultIdentity,
    deviceIdentity,
    base: [],
    remoteMappings: [],
    tombstones: [],
    operations: [],
    knownDevices: [],
    ...(changeCursor ? { changeCursor: id<"ChangeCursor">(changeCursor) } : {}),
  };
}

test("LAT-01 full planning measures managed-root, BASE, cursor, reconciliation calls and LOCAL/REMOTE overlap", async () => {
  const localStarted = deferred();
  const remoteStarted = deferred();
  const releaseListings = deferred();
  const calls = {
    remoteIdentity: 0,
    validateManagedRoot: 0,
    stateLoad: 0,
    getStartCursor: 0,
    localEnumerate: 0,
    listForReconciliation: 0,
  };

  const local = {
    enumerate: async () => {
      calls.localEnumerate += 1;
      localStarted.resolve();
      await releaseListings.promise;
      return { entries: [], completeness: { status: "complete" as const } };
    },
  } as never;
  const drive = {
    validateManagedRoot: async () => {
      calls.validateManagedRoot += 1;
      return { ok: true as const, value: { status: "valid" as const, identity: managedRemote } };
    },
    getStartCursor: async () => {
      calls.getStartCursor += 1;
      return { ok: true as const, value: id<"ChangeCursor">("cursor:full") };
    },
    listForReconciliation: async () => {
      calls.listForReconciliation += 1;
      remoteStarted.resolve();
      await releaseListings.promise;
      return { ok: true as const, value: { entries: [], completeness: { status: "complete" as const } };
    },
  } as never;
  const state = {
    load: async () => {
      calls.stateLoad += 1;
      return { status: "uninitialized" as const };
    },
  } as never;
  const assembler = new ProductSnapshotAssembler(
    local,
    drive,
    state,
    { expectation: "new-installation" },
    async () => {
      calls.remoteIdentity += 1;
      return managedRemote;
    },
  );

  const assembledPromise = assembler.assembleFull();
  await Promise.all([localStarted.promise, remoteStarted.promise]);
  assert.deepEqual(calls, {
    remoteIdentity: 1,
    validateManagedRoot: 1,
    stateLoad: 1,
    getStartCursor: 1,
    localEnumerate: 1,
    listForReconciliation: 1,
  });

  releaseListings.resolve();
  const assembled = await assembledPromise;
  assert.equal(assembled.mode, "full");
});

test("LAT-01 incremental planning measures one terminal Changes traversal without falling back to reconciliation listing", async () => {
  const calls = {
    remoteIdentity: 0,
    validateManagedRoot: 0,
    stateLoad: 0,
    localEnumerate: 0,
    changePages: 0,
    getStartCursor: 0,
    listForReconciliation: 0,
  };
  const startingCursor = id<"ChangeCursor">("cursor:incremental-start");
  const terminalCursor = id<"ChangeCursor">("cursor:incremental-terminal");

  const local = {
    enumerate: async () => {
      calls.localEnumerate += 1;
      return { entries: [], completeness: { status: "complete" as const } };
    },
  } as never;
  const drive = {
    validateManagedRoot: async () => {
      calls.validateManagedRoot += 1;
      return { ok: true as const, value: { status: "valid" as const, identity: managedRemote } };
    },
    getStartCursor: async () => {
      calls.getStartCursor += 1;
      return { ok: true as const, value: terminalCursor };
    },
    listForReconciliation: async () => {
      calls.listForReconciliation += 1;
      return { ok: true as const, value: { entries: [], completeness: { status: "complete" as const } };
    },
  } as never;
  const state = {
    load: async () => {
      calls.stateLoad += 1;
      return { status: "trusted" as const, state: emptyTrustedState(String(startingCursor)) };
    },
  } as never;
  const reliableChanges = {
    readChangePage: async (_remote: unknown, requestedToken: unknown) => {
      calls.changePages += 1;
      assert.equal(requestedToken, startingCursor);
      return {
        ok: true as const,
        value: {
          kind: "terminal" as const,
          requestedToken: startingCursor,
          changes: [],
          newStartPageToken: terminalCursor,
        },
      };
    },
  } as never;

  const assembler = new ProductSnapshotAssembler(
    local,
    drive,
    state,
    stateContext,
    async () => {
      calls.remoteIdentity += 1;
      return managedRemote;
    },
    undefined,
    undefined,
    undefined,
    reliableChanges,
  );
  const assembled = await assembler.assemble(true);

  assert.equal(assembled.mode, "incremental");
  assert.equal(assembled.nextCursor, terminalCursor);
  assert.deepEqual(calls, {
    remoteIdentity: 1,
    validateManagedRoot: 1,
    stateLoad: 1,
    localEnumerate: 1,
    changePages: 1,
    getStartCursor: 0,
    listForReconciliation: 0,
  });
});

const operationId = id<"OperationId">("op:lat01-physical");
const physicalPath = path("latency.bin");
const contentEvidence = { hash: id<"ContentHash">("sha256:lat01-content"), sizeBytes: 3 } as const;

function contentSource(): BinaryContentSource {
  return {
    sizeBytes: 3,
    async *openChunks() {
      yield new Uint8Array([1, 2, 3]);
    },
  };
}

function physicalOperation(): PlannedOperation {
  return {
    operationId,
    kind: "upload-create",
    path: physicalPath,
    targetSide: "remote",
    contentVersion: {
      path: physicalPath,
      entityKind: "file",
      content: contentEvidence,
      observationToken: id<"ObservationToken">("observation:lat01"),
    },
    destructive: false,
    preconditions: [],
    reasons: [{ code: "lat01-measurement", summary: "deterministic production-boundary characterization" }],
  };
}

class CountingAuthorityStore {
  value: SynchronizationAuthorityMetadataV1_1;
  loads = 0;
  saves = 0;
  private revision = 1;

  constructor() {
    this.value = {
      persistenceRevision: id<"StateRevision">("persist:lat01:1"),
      semanticGeneration: id<"SemanticStateGeneration">("generation:lat01"),
      learnedRemoteBatches: [],
      pathConvergence: [],
      operationIntents: [],
      localTransactions: [],
    };
  }

  async loadAuthority() {
    this.loads += 1;
    return { status: "trusted" as const, state: this.value };
  }

  async saveAuthority(candidate: SynchronizationAuthorityMetadataV1_1) {
    this.saves += 1;
    this.revision += 1;
    const persistenceRevision = id<"StateRevision">(`persist:lat01:${this.revision}`);
    this.value = { ...candidate, persistenceRevision };
    return { status: "saved" as const, persistenceRevision, semanticGeneration: this.value.semanticGeneration };
  }

  async commitBaseTransition() {
    return {
      status: "saved" as const,
      persistenceRevision: this.value.persistenceRevision,
      semanticGeneration: this.value.semanticGeneration,
    };
  }
}

test("LAT-01 production authoritative path measures repeated validation/load passes before the first physical mutation", async () => {
  const authority = new CountingAuthorityStore();
  const counts = {
    identityLoads: 0,
    legacyValidationPasses: 0,
    dispatches: 0,
    authorityLoadsAtDispatch: 0,
    authoritySavesAtDispatch: 0,
    identityLoadsAtDispatch: 0,
    legacyValidationPassesAtDispatch: 0,
  };
  let canonical = emptyTrustedState();
  let remoteEntries: unknown[] = [];

  const identityStateStore = {
    load: async () => {
      counts.identityLoads += 1;
      return { status: "trusted" as const, state: canonical };
    },
    saveTrusted: async (candidate: TrustedSynchronizationState, expected?: string) => {
      if (expected !== undefined && expected !== String(canonical.stateRevision)) {
        return { status: "stale-revision" as const, actualRevision: canonical.stateRevision };
      }
      canonical = candidate;
      return { status: "saved" as const, stateRevision: candidate.stateRevision };
    },
  } as never;

  const legacy = {
    local: {
      readFile: async () => ({
        content: contentSource(),
        evidence: contentEvidence,
        observationToken: id<"ObservationToken">("observation:lat01"),
      }),
      observe: async () => ({
        status: "present" as const,
        side: "local" as const,
        path: physicalPath,
        entityKind: "file" as const,
        content: contentEvidence,
        stability: "stable" as const,
        observationToken: id<"ObservationToken">("observation:lat01"),
      }),
    },
    drive: {
      listForReconciliation: async () => ({
        ok: true as const,
        value: { entries: remoteEntries, completeness: { status: "complete" as const } },
      }),
    },
    runEvidence: () => ({ managedRemote, remoteEnumerationComplete: true }),
    validatePreconditions: async () => {
      counts.legacyValidationPasses += 1;
      return { status: "valid" as const };
    },
    versionStillCurrent: async () => true,
  } as never;

  const remoteMutation = {
    reserveFileCreateIdentity: async (_root: unknown, intentId: unknown, targetPath: unknown, intendedContent: unknown) => ({
      ok: true as const,
      value: {
        kind: "reserved-file-create" as const,
        intentId,
        reservedRemoteObjectId: id<"RemoteObjectId">("remote:lat01-created"),
        path: targetPath,
        intendedContent,
      },
    }),
    reserveFolderCreateIdentity: async () => { throw new Error("not used"); },
    createReserved: async (identity: any) => {
      counts.dispatches += 1;
      counts.authorityLoadsAtDispatch = authority.loads;
      counts.authoritySavesAtDispatch = authority.saves;
      counts.identityLoadsAtDispatch = counts.identityLoads;
      counts.legacyValidationPassesAtDispatch = counts.legacyValidationPasses;
      remoteEntries = [{
        path: identity.path,
        entityKind: "file",
        remoteObjectId: identity.reservedRemoteObjectId,
        content: identity.intendedContent,
        trashed: false,
      }];
      return {
        status: "verified-effect" as const,
        applicationProof: {
          kind: "reserved-create" as const,
          remoteObjectId: identity.reservedRemoteObjectId,
          path: identity.path,
          verifiedContent: identity.intendedContent,
        },
      };
    },
    updateExisting: async () => { throw new Error("not used"); },
    moveExisting: async () => { throw new Error("not used"); },
    trashExisting: async () => { throw new Error("not used"); },
  } as never;

  const executor = createAuthoritativeProductExecutor(
    legacy,
    authority as never,
    identityStateStore,
    stateContext,
    managedRemote,
    { reliableRemoteMutationPort: remoteMutation } as never,
  );
  const coordinator = new AuthorityCompleteExecutionCoordinator(
    authority as never,
    executor,
    new StateCommitCoordinator(identityStateStore, stateContext),
    identityStateStore,
    stateContext,
  );

  const result = await coordinator.executeOperation(physicalOperation());
  assert.equal(result.status, "committed");
  assert.equal(counts.dispatches, 1);
  assert.deepEqual(
    {
      authorityLoadsAtDispatch: counts.authorityLoadsAtDispatch,
      authoritySavesAtDispatch: counts.authoritySavesAtDispatch,
      identityLoadsAtDispatch: counts.identityLoadsAtDispatch,
      legacyValidationPassesAtDispatch: counts.legacyValidationPassesAtDispatch,
    },
    {
      authorityLoadsAtDispatch: 8,
      authoritySavesAtDispatch: 2,
      identityLoadsAtDispatch: 3,
      legacyValidationPassesAtDispatch: 2,
    },
  );
  assert.equal(authority.loads, 13);
  assert.equal(authority.saves, 4);
  assert.equal(counts.identityLoads, 5);
  assert.equal(counts.legacyValidationPasses, 2);
});

test("LAT-01 stale final authorization prevents physical mutation", async () => {
  let mutationCalls = 0;
  const authority = new CountingAuthorityStore();
  const canonical = emptyTrustedState();
  const identityStateStore = {
    load: async () => ({ status: "trusted" as const, state: canonical }),
  } as never;
  const coordinator = new AuthorityCompleteExecutionCoordinator(
    authority as never,
    {
      validatePreconditions: async () => ({ status: "stale" as const, failed: [] }),
      execute: async () => {
        mutationCalls += 1;
        throw new Error("physical mutation must remain unreachable after stale validation");
      },
    },
    { commitVerifiedSuccess: async () => { throw new Error("commit must remain unreachable"); } } as never,
    identityStateStore,
    stateContext,
  );

  const result = await coordinator.executeOperation(physicalOperation());
  assert.equal(result.status, "stale-precondition");
  assert.equal(mutationCalls, 0);
});
