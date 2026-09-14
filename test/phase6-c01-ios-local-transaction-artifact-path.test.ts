import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import type {
  BinaryContentSource,
  LocalMutationTransactionId,
  ObservationToken,
  OperationId,
  VaultPath,
} from "../src/contracts/common";
import type {
  ConfigurationClassification,
  LocalLifecycleEvent,
  LocalMutationReceipt,
  LocalReadResult,
  LocalVaultChange,
  LocalVaultListing,
  LocalVaultPort,
  PathValidationResult,
  Unsubscribe,
} from "../src/contracts/local-vault";
import type { LocalObservation } from "../src/contracts/snapshot";
import type {
  CanonicalFileContentProof,
  LocalMutationTransaction,
} from "../src/contracts/synchronization-foundation";
import { LocalExclusionPolicy } from "../src/local/exclusions";
import { validateCrossPlatformPath } from "../src/local/path-policy";
import { ProductPathScope } from "../src/product/path-scope";
import { ScopedLocalTransactionalMutationPort } from "../src/product/synchronization-adapters";
import { sha256Bytes } from "../src/util/sha256";

const vp = (value: string) => value as VaultPath;
const tok = (value: string) => value as ObservationToken;
const bytes = (...values: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(values);
const source = (value: Uint8Array): BinaryContentSource => ({
  sizeBytes: value.byteLength,
  async *openChunks() { yield new Uint8Array(value); },
});
const proof = (value: Uint8Array): CanonicalFileContentProof => ({
  algorithm: "sha256",
  hash: sha256Bytes(value),
  sizeBytes: value.byteLength,
});

async function collect(content: BinaryContentSource): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of content.openChunks()) {
    chunks.push(new Uint8Array(chunk));
    size += chunk.byteLength;
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

class PathValidatingMemoryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  readonly validatedPaths: string[] = [];
  private readonly versions = new Map<string, number>();

  readonly adapter = {
    exists: async (path: string) => this.files.has(path),
    writeBinary: async (path: string, content: ArrayBuffer) => {
      this.files.set(path, new Uint8Array(content));
      this.bump(path);
    },
    appendBinary: async (path: string, content: ArrayBuffer) => {
      const prior = this.files.get(path);
      if (!prior) throw new Error("missing append target");
      const next = new Uint8Array(content);
      const combined = new Uint8Array(prior.byteLength + next.byteLength);
      combined.set(prior);
      combined.set(next, prior.byteLength);
      this.files.set(path, combined);
      this.bump(path);
    },
    rename: async (from: string, to: string) => {
      const content = this.files.get(from);
      if (!content) throw new Error(`missing rename source ${from}`);
      this.files.set(to, content);
      this.files.delete(from);
      this.bump(from);
      this.bump(to);
    },
    remove: async (path: string) => {
      this.files.delete(path);
      this.bump(path);
    },
    trashLocal: async (path: string) => {
      this.files.delete(path);
      this.bump(path);
    },
  } as unknown as DataAdapter;

  activeConfigurationDirectory = async () => vp(".obsidian");

  async enumerate(): Promise<LocalVaultListing> {
    const entries: LocalObservation[] = [];
    for (const path of this.files.keys()) entries.push(await this.observe(vp(path)));
    return { entries, completeness: { status: "complete" } };
  }

  async observe(path: VaultPath): Promise<LocalObservation> {
    const content = this.files.get(String(path));
    return content
      ? {
          status: "present",
          side: "local",
          path,
          entityKind: "file",
          stability: "stable",
          content: { sizeBytes: content.byteLength, advisoryModifiedTimeMs: 1000 },
          observationToken: this.current(path),
        }
      : { status: "absent", side: "local", path };
  }

  async readFile(path: VaultPath, expected?: ObservationToken): Promise<LocalReadResult> {
    const content = this.files.get(String(path));
    if (!content) throw new Error("missing");
    const observationToken = this.current(path);
    if (expected && expected !== observationToken) throw new Error(`Local observation became stale: ${String(path)}`);
    return {
      content: source(content),
      evidence: { sizeBytes: content.byteLength, advisoryModifiedTimeMs: 1000 },
      stability: "stable",
      observationToken,
    };
  }

  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> {
    this.files.set(String(path), await collect(content));
    this.bump(String(path));
    return { path, observationToken: this.current(path) };
  }

  async replaceFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> {
    this.files.set(String(path), await collect(content));
    this.bump(String(path));
    return { path, observationToken: this.current(path) };
  }

  createFolder = async (path: VaultPath): Promise<LocalMutationReceipt> => ({ path });

  async move(fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt> {
    await (this.adapter as any).rename(String(fromPath), String(toPath));
    return { path: toPath, observationToken: this.current(toPath) };
  }

  async trash(path: VaultPath): Promise<void> {
    await (this.adapter as any).trashLocal(String(path));
  }

  async validatePath(path: VaultPath): Promise<PathValidationResult> {
    this.validatedPaths.push(String(path));
    return validateCrossPlatformPath(path);
  }

  classifyConfiguration = async (): Promise<ConfigurationClassification> => ({ classification: "unknown", reason: "test" });
  onChange(_listener: (change: LocalVaultChange) => void): Unsubscribe { return () => undefined; }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }

  private bump(path: string): void {
    this.versions.set(path, (this.versions.get(path) ?? 0) + 1);
  }

  private current(path: VaultPath): ObservationToken {
    return tok(`${String(path)}|g${this.versions.get(String(path)) ?? 0}`);
  }
}

function createTransaction(path: string, next: Uint8Array): LocalMutationTransaction {
  return {
    transactionId: `tx-${path}` as LocalMutationTransactionId,
    operationId: `op-${path}` as OperationId,
    path: vp(path),
    stagePath: vp(`logical-stage:${path}`),
    backupPath: vp(`logical-backup:${path}`),
    stage: "staging",
    mutationKind: "create",
    expectedEntityKind: "file",
    expectedTarget: { status: "expected-absent" },
    expectedNewEvidence: proof(next),
  } as LocalMutationTransaction;
}

function createPort(raw: PathValidatingMemoryLocal): ScopedLocalTransactionalMutationPort {
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  return new ScopedLocalTransactionalMutationPort(raw.adapter, raw, scope);
}

function parent(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(0, slash) : "";
}

function assertSafeArtifactPaths(paths: readonly string[], target: string): void {
  assert.equal(paths.length, 3);
  const [physicalTarget, stagePath, backupPath] = paths;
  assert.equal(physicalTarget, target);
  assert.equal(new Set(paths).size, 3, "target, stage, and backup must be pairwise distinct");
  assert.equal(parent(stagePath), parent(target));
  assert.equal(parent(backupPath), parent(target));
  assert.doesNotMatch(stagePath, /:/, "stage path must not contain a hash-scheme colon");
  assert.doesNotMatch(backupPath, /:/, "backup path must not contain a hash-scheme colon");
  assert.match(stagePath, /\.brain-sync-stage-[0-9a-f]{24}$/);
  assert.match(backupPath, /\.brain-sync-backup-[0-9a-f]{24}$/);
  assert.equal(validateCrossPlatformPath(vp(stagePath)).status, "compatible");
  assert.equal(validateCrossPlatformPath(vp(backupPath)).status, "compatible");

  const exclusions = new LocalExclusionPolicy();
  assert.equal(exclusions.evaluate(vp(stagePath)).excluded, true);
  assert.equal(exclusions.evaluate(vp(backupPath)).excluded, true);
}

test("C01 regression: scoped artifact paths are safe deterministic siblings for root and nested targets", async () => {
  for (const target of ["Logs.md", "notes/nested/Logs.md"] as const) {
    const content = bytes(7, 8, 9, 10);
    const transaction = createTransaction(target, content);

    const firstRaw = new PathValidatingMemoryLocal();
    const first = await createPort(firstRaw).stageAndVerify(transaction, source(content));
    assert.equal(first.status, "staged-verified", "0.1.16 failed here because generated artifact names contained ':'");
    const firstMapping = firstRaw.validatedPaths.slice(0, 3);
    assertSafeArtifactPaths(firstMapping, target);

    const secondRaw = new PathValidatingMemoryLocal();
    const second = await createPort(secondRaw).stageAndVerify(transaction, source(content));
    assert.equal(second.status, "staged-verified");
    assert.deepEqual(secondRaw.validatedPaths.slice(0, 3), firstMapping, "same logical transaction must map to identical physical artifacts");
  }
});

test("C01 regression: commit and recovery reuse the exact corrected physical artifact mapping", async () => {
  const commitContent = bytes(1, 2, 3, 4);
  const commitTransaction = createTransaction("Logs.md", commitContent);
  const commitRaw = new PathValidatingMemoryLocal();
  const commitPort = createPort(commitRaw);
  const stagedForCommit = await commitPort.stageAndVerify(commitTransaction, source(commitContent));
  assert.equal(stagedForCommit.status, "staged-verified");
  const stagedCommitPaths = commitRaw.validatedPaths.slice(0, 3);
  const committed = await commitPort.commitVerifiedStage(stagedForCommit.transaction);
  assert.equal(committed.status, "committed");
  assert.deepEqual(commitRaw.validatedPaths.slice(3, 6), stagedCommitPaths, "commit must resolve the same physical stage and backup paths");
  assert.deepEqual([...commitRaw.files.get("Logs.md")!], [...commitContent]);

  const recoveryContent = bytes(9, 8, 7, 6);
  const recoveryTransaction = createTransaction("notes/Recovery.md", recoveryContent);
  const recoveryRaw = new PathValidatingMemoryLocal();
  const recoveryPort = createPort(recoveryRaw);
  const stagedForRecovery = await recoveryPort.stageAndVerify(recoveryTransaction, source(recoveryContent));
  assert.equal(stagedForRecovery.status, "staged-verified");
  const stagedRecoveryPaths = recoveryRaw.validatedPaths.slice(0, 3);
  const recovered = await recoveryPort.recover(stagedForRecovery.transaction);
  assert.equal(recovered.status, "recovered");
  assert.deepEqual(recoveryRaw.validatedPaths.slice(3, 6), stagedRecoveryPaths, "recovery must resolve the same physical stage and backup paths");
  assert.deepEqual([...recoveryRaw.files.get("notes/Recovery.md")!], [...recoveryContent]);
  assert.equal(recoveryRaw.files.has(stagedRecoveryPaths[1]), false, "recovered stage must no longer remain as an artifact");
});
