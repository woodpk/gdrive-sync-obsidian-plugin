import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type BinaryContentSource, type ObservationToken, type VaultPath } from "../src/contracts/common";
import type { LocalVaultPort } from "../src/contracts/local-vault";
import {
  DEFAULT_VALIDATION_FIXTURE_LIMITS,
  ValidationFixtureAuthorizationError,
  ValidationFixtureManager,
  ValidationFixtureStateError,
  validationDeletionFixture,
  validationEmptyFolderFixture,
  validationExclusionFixture,
  validationLargeFileFixture,
  validationOpaqueBinaryFixture,
  validationPathCollisionFixtures,
  validationTextFixture,
  validationVersionedFixture,
} from "../src/validation/fixture-manager";
import {
  validationRunIdentity,
  validationSandboxOwnership,
  type ValidationSandboxAuthorizationRequest,
} from "../src/validation/run-sandbox-checkpoint-contracts";

type Entry = { kind: "file"; bytes: Uint8Array } | { kind: "folder" };

class MemoryLocalVault {
  readonly entries = new Map<string, Entry>();
  mutationCount = 0;
  maxChunkObserved = 0;

  readonly port = {
    validatePath: async (path: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(path).toLowerCase() }),
    observe: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry) return { status: "absent" as const, path };
      return {
        status: "present" as const,
        path,
        entityKind: entry.kind,
        observationToken: contractId<"ObservationToken">(`token:${String(path)}:${entry.kind}`) as ObservationToken,
      };
    },
    readFile: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry || entry.kind !== "file") throw new Error(`not a file: ${String(path)}`);
      const bytes = entry.bytes.slice();
      return {
        content: {
          sizeBytes: bytes.byteLength,
          async *openChunks(): AsyncIterable<Uint8Array> { yield bytes; },
        },
        evidence: { sizeBytes: bytes.byteLength },
        stability: "stable" as const,
      };
    },
    createFile: async (path: VaultPath, source: BinaryContentSource) => {
      this.mutationCount += 1;
      if (this.entries.has(String(path))) throw new Error("exists");
      this.entries.set(String(path), { kind: "file", bytes: await this.collect(source) });
      return { path };
    },
    replaceFile: async (path: VaultPath, source: BinaryContentSource) => {
      this.mutationCount += 1;
      const current = this.entries.get(String(path));
      if (!current || current.kind !== "file") throw new Error("missing");
      this.entries.set(String(path), { kind: "file", bytes: await this.collect(source) });
      return { path };
    },
    createFolder: async (path: VaultPath) => {
      this.mutationCount += 1;
      if (this.entries.has(String(path))) throw new Error("exists");
      this.entries.set(String(path), { kind: "folder" });
      return { path };
    },
    move: async (fromPath: VaultPath, toPath: VaultPath) => {
      this.mutationCount += 1;
      const entry = this.entries.get(String(fromPath));
      if (!entry || this.entries.has(String(toPath))) throw new Error("invalid move");
      this.entries.delete(String(fromPath));
      this.entries.set(String(toPath), entry);
      return { path: toPath };
    },
    trash: async (path: VaultPath) => {
      this.mutationCount += 1;
      this.entries.delete(String(path));
    },
  } as unknown as LocalVaultPort;

  private async collect(source: BinaryContentSource): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of source.openChunks()) {
      this.maxChunkObserved = Math.max(this.maxChunkObserved, chunk.byteLength);
      const copy = chunk.slice();
      chunks.push(copy);
      size += copy.byteLength;
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  }
}

function harness(options?: { ownership?: "valid" | "absent" | "ambiguous"; chunkSizeBytes?: number; maxLargeFileBytes?: number }) {
  const run = validationRunIdentity("run-vh05", "F02");
  const owned = validationSandboxOwnership({ resourceId: "fixture-root-vh05", surface: "vault-fixture", owner: run });
  const other = validationSandboxOwnership({ resourceId: "fixture-root-vh05-other", surface: "vault-fixture", owner: run });
  const vault = new MemoryLocalVault();
  const requests: ValidationSandboxAuthorizationRequest[] = [];
  const ownership = options?.ownership === "absent"
    ? undefined
    : options?.ownership === "ambiguous"
      ? [owned, other]
      : owned;
  const manager = new ValidationFixtureManager({
    run,
    fixtureRoot: "__brain_validation__/run-vh05",
    ownership,
    local: vault.port,
    authorize: request => {
      requests.push(request);
      return { status: "authorized", ownership: request.ownership };
    },
    limits: {
      ...(options?.chunkSizeBytes ? { chunkSizeBytes: options.chunkSizeBytes } : {}),
      ...(options?.maxLargeFileBytes ? { maxLargeFileBytes: options.maxLargeFileBytes } : {}),
    },
  });
  return { manager, vault, requests };
}

test("VH05 text fixtures have deterministic bytes and hashes while versions remain distinguishable", async () => {
  const { manager } = harness();
  const base = validationTextFixture("text-1", "notes/text-1.md", 1, "base");
  const created = await manager.create(base);
  assert.match(String(created.hash), /^sha256:[0-9a-f]{64}$/);
  assert.equal(await manager.hash("text-1"), created.hash);

  const changed = await manager.edit("text-1", 2, "non-overlap-a");
  assert.notEqual(changed.hash, created.hash);
  const restoredVersion = await manager.restoreVersion("text-1", 1, "base");
  assert.equal(restoredVersion.hash, created.hash);

  const sameRecipe = validationVersionedFixture(base, 1, "base");
  assert.deepEqual(sameRecipe, base);
});

test("VH05 binary, empty-folder, exclusion, deletion, and path-collision helpers are explicit and payload-free", async () => {
  const { manager } = harness();
  const binary = await manager.create(validationOpaqueBinaryFixture("bin-1", "binary/blob.bin", 4097));
  assert.equal(binary.sizeBytes, 4097);
  assert.match(String(binary.hash), /^sha256:[0-9a-f]{64}$/);

  const folder = await manager.create(validationEmptyFolderFixture("folder-1", "folders/empty"));
  assert.equal(folder.sizeBytes, 0);
  assert.equal(folder.hash, undefined);

  assert.equal(validationExclusionFixture("excluded-1", "excluded/value.md").purpose, "exclusion");
  assert.equal(validationDeletionFixture("delete-1", "delete/value.md").purpose, "deletion");
  const collision = validationPathCollisionFixtures("collision", "Case/value.md", "case/value.md");
  assert.deepEqual(collision.map(item => item.purpose), ["path-collision", "path-collision"]);
  assert.deepEqual(collision.map(item => item.relativePath), ["Case/value.md", "case/value.md"]);
});

test("VH05 large fixtures are deterministic and generated in bounded chunks", async () => {
  const chunkSizeBytes = 1024;
  const sizeBytes = chunkSizeBytes * 3 + 17;
  const { manager, vault } = harness({ chunkSizeBytes, maxLargeFileBytes: sizeBytes });
  const spec = validationLargeFileFixture("large-1", "large/payload.bin", sizeBytes);
  const created = await manager.create(spec);
  assert.equal(created.sizeBytes, sizeBytes);
  assert.ok(vault.maxChunkObserved <= chunkSizeBytes);

  await manager.delete("large-1");
  const restored = await manager.restore("large-1");
  assert.equal(restored.hash, created.hash);
  assert.ok(vault.maxChunkObserved <= chunkSizeBytes);

  const bounded = harness({ maxLargeFileBytes: 1024 });
  await assert.rejects(
    bounded.manager.create(validationLargeFileFixture("too-large", "large/too-large.bin", 1025)),
    ValidationFixtureStateError,
  );
});

test("VH05 move, delete, deterministic restore, and cleanup preserve tracked disposable scope", async () => {
  const { manager, vault, requests } = harness();
  const created = await manager.create(validationDeletionFixture("delete-1", "lifecycle/original.md"));
  const moved = await manager.move("delete-1", "lifecycle/moved.md");
  assert.equal(moved.hash, created.hash);
  assert.equal(vault.entries.has("__brain_validation__/run-vh05/lifecycle/original.md"), false);
  assert.equal(vault.entries.has("__brain_validation__/run-vh05/lifecycle/moved.md"), true);

  await manager.delete("delete-1");
  assert.equal(manager.get("delete-1"), undefined);
  const restored = await manager.restore("delete-1");
  assert.equal(restored.hash, created.hash);

  await manager.cleanup();
  assert.equal(vault.entries.size, 0);
  assert.deepEqual(requests.map(request => request.mutation), ["setup", "mutate", "mutate", "mutate", "cleanup"]);
});

test("VH05 refuses every mutation before local I/O when sandbox ownership is absent or ambiguous", async () => {
  for (const ownership of ["absent", "ambiguous"] as const) {
    const { manager, vault, requests } = harness({ ownership });
    const expectedReason = ownership === "absent" ? "ownership-unproven" : "ownership-ambiguous";
    await assert.rejects(
      manager.create(validationTextFixture(`text-${ownership}`, `ownership/${ownership}.md`)),
      (error: unknown) => error instanceof ValidationFixtureAuthorizationError && error.reason === expectedReason,
    );
    assert.equal(vault.mutationCount, 0);
    assert.equal(requests.length, 0);
  }
});

test("VH05 honors explicit sandbox rejection without mutating the local vault", async () => {
  const run = validationRunIdentity("run-rejected", "C03");
  const ownership = validationSandboxOwnership({ resourceId: "fixture-root-rejected", surface: "vault-fixture", owner: run });
  const vault = new MemoryLocalVault();
  const manager = new ValidationFixtureManager({
    run,
    fixtureRoot: "__brain_validation__/run-rejected",
    ownership,
    local: vault.port,
    authorize: () => ({ status: "rejected", reason: "ownership-unproven" }),
  });
  await assert.rejects(
    manager.create(validationTextFixture("text-rejected", "rejected/value.md")),
    (error: unknown) => error instanceof ValidationFixtureAuthorizationError && error.reason === "ownership-unproven",
  );
  assert.equal(vault.mutationCount, 0);
});

assert.equal(DEFAULT_VALIDATION_FIXTURE_LIMITS.chunkSizeBytes > 0, true);
