import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import type {
  BinaryContentSource,
  ContentHash,
  LocalMutationTransactionId,
  ObservationToken,
  OperationId,
  VaultPath,
} from "../../../src/contracts/common";
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
} from "../../../src/contracts/local-vault";
import type { LocalObservation } from "../../../src/contracts/snapshot";
import type { CanonicalFileContentProof, LocalMutationTransaction } from "../../../src/contracts/synchronization-foundation";
import { ObsidianLocalMutationTransactions } from "../../../src/local/local-vault-access-boundary";
import { CanonicalEvidenceLocalVault } from "../../../src/product/canonical-local-vault";
import { sha256Bytes } from "../../../src/util/sha256";

const vp = (value: string): VaultPath => value as VaultPath;
const token = (value: string): ObservationToken => value as ObservationToken;
const op = (value: string): OperationId => value as OperationId;
const txid = (value: string): LocalMutationTransactionId => value as LocalMutationTransactionId;
const bytes = (...values: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(values);

function source(value: Uint8Array): BinaryContentSource {
  return {
    sizeBytes: value.byteLength,
    async *openChunks() { yield new Uint8Array(value); },
  };
}

function proof(value: Uint8Array): CanonicalFileContentProof {
  return { algorithm: "sha256", hash: sha256Bytes(value) as ContentHash, sizeBytes: value.byteLength };
}

class MemoryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  private readonly versions = new Map<string, number>();
  private readonly listeners = new Set<(change: LocalVaultChange) => void>();
  onRename?: (from: string, to: string) => void;

  constructor(initial: Record<string, Uint8Array> = {}) {
    for (const [path, value] of Object.entries(initial)) this.files.set(path, new Uint8Array(value));
  }

  readonly adapter = {
    exists: async (path: string) => this.files.has(path),
    writeBinary: async (path: string, data: ArrayBuffer) => {
      this.files.set(path, new Uint8Array(data)); this.bump(path);
    },
    appendBinary: async (path: string, data: ArrayBuffer) => {
      const old = this.files.get(path);
      if (!old) throw new Error(`missing append target ${path}`);
      const incoming = new Uint8Array(data);
      const combined = new Uint8Array(old.byteLength + incoming.byteLength);
      combined.set(old); combined.set(incoming, old.byteLength);
      this.files.set(path, combined); this.bump(path);
    },
    rename: async (from: string, to: string) => {
      const value = this.files.get(from);
      if (!value) throw new Error(`missing rename source ${from}`);
      this.files.set(to, value); this.files.delete(from);
      this.bump(from); this.bump(to);
      this.emit({ kind: "renamed", fromPath: vp(from), toPath: vp(to) });
      this.onRename?.(from, to);
    },
    remove: async (path: string) => { this.files.delete(path); this.bump(path); },
    trashLocal: async (path: string) => { this.files.delete(path); this.bump(path); },
  } as unknown as DataAdapter;

  activeConfigurationDirectory(): Promise<VaultPath> { return Promise.resolve(vp(".cfg")); }
  async enumerate(): Promise<LocalVaultListing> {
    const entries: LocalObservation[] = [];
    for (const path of this.files.keys()) entries.push(await this.observe(vp(path)));
    return { entries, completeness: { status: "complete" } };
  }
  async observe(path: VaultPath): Promise<LocalObservation> {
    const value = this.files.get(String(path));
    if (!value) return { status: "absent", side: "local", path };
    return {
      status: "present", side: "local", path, entityKind: "file", stability: "stable",
      content: { sizeBytes: value.byteLength, advisoryModifiedTimeMs: 1000 },
      observationToken: this.currentToken(path),
    };
  }
  async readFile(path: VaultPath, expectedToken?: ObservationToken): Promise<LocalReadResult> {
    const value = this.files.get(String(path));
    if (!value) throw new Error(`missing ${String(path)}`);
    const actual = this.currentToken(path);
    if (expectedToken && expectedToken !== actual) throw new Error(`Local observation became stale: ${String(path)}`);
    return { content: source(value), evidence: { sizeBytes: value.byteLength, advisoryModifiedTimeMs: 1000 }, stability: "stable", observationToken: actual };
  }
  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> {
    if (this.files.has(String(path))) throw new Error("exists");
    this.files.set(String(path), await collect(content)); this.bump(String(path));
    return { path, observationToken: this.currentToken(path) };
  }
  async replaceFile(path: VaultPath, content: BinaryContentSource, expectedToken?: ObservationToken): Promise<LocalMutationReceipt> {
    if (expectedToken && expectedToken !== this.currentToken(path)) throw new Error("stale");
    this.files.set(String(path), await collect(content)); this.bump(String(path));
    return { path, observationToken: this.currentToken(path) };
  }
  createFolder(path: VaultPath): Promise<LocalMutationReceipt> { return Promise.resolve({ path }); }
  async move(fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt> {
    await (this.adapter as any).rename(String(fromPath), String(toPath)); return { path: toPath, observationToken: this.currentToken(toPath) };
  }
  async trash(path: VaultPath): Promise<void> { await (this.adapter as any).trashLocal(String(path)); }
  validatePath(path: VaultPath): Promise<PathValidationResult> { return Promise.resolve({ status: "compatible", normalizedComparisonPath: String(path).toLowerCase() }); }
  classifyConfiguration(): Promise<ConfigurationClassification> { return Promise.resolve({ classification: "unknown", reason: "test" }); }
  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }

  /** Simulates a watcher-missed, same-size/same-mtime external byte change. */
  mutateWithoutObservationChange(path: string, value: Uint8Array): void { this.files.set(path, new Uint8Array(value)); }
  emitUserModify(path: string): void { this.bump(path); this.emit({ kind: "modified", path: vp(path) }); }
  private emit(change: LocalVaultChange): void { for (const listener of this.listeners) listener(change); }
  private bump(path: string): void { this.versions.set(path, (this.versions.get(path) ?? 0) + 1); }
  private currentToken(path: VaultPath): ObservationToken { return token(`${String(path)}|same-size|same-mtime|g${this.versions.get(String(path)) ?? 0}`); }
}

async function collect(content: BinaryContentSource): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of content.openChunks()) { chunks.push(new Uint8Array(chunk)); size += chunk.byteLength; }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

function createTransaction(path: string, value: Uint8Array, observationToken?: ObservationToken, old?: Uint8Array): LocalMutationTransaction {
  const base = {
    transactionId: txid(`tx-${path}`), operationId: op(`op-${path}`), path: vp(path),
    stagePath: vp(`.${path}.brain-sync-stage-tx`), backupPath: vp(`.${path}.brain-sync-backup-tx`),
    stage: "staging" as const, expectedEntityKind: "file" as const, expectedNewEvidence: proof(value),
  };
  return old
    ? { ...base, mutationKind: "replace", expectedTarget: { status: "expected-present", observationToken: observationToken!, entityKind: "file", canonicalContent: proof(old) } }
    : { ...base, mutationKind: "create", expectedTarget: { status: "expected-absent" } };
}

test("authoritative cache-bypass discovers same-size same-mtime H0->H1 after missed watcher event", async () => {
  const h0 = bytes(1, 2, 3, 4), h1 = bytes(4, 3, 2, 1);
  const raw = new MemoryLocal({ "note.bin": h0 });
  const canonical = new CanonicalEvidenceLocalVault(raw, { staleRetryAttempts: 1 });
  const first = await canonical.observe(vp("note.bin"));
  assert.equal(first.status, "present");
  if (first.status !== "present") return;
  const originalHash = first.content?.hash;
  raw.mutateWithoutObservationChange("note.bin", h1);
  const ordinary = await canonical.observe(vp("note.bin"));
  assert.equal(ordinary.status, "present");
  if (ordinary.status !== "present") return;
  assert.equal(ordinary.content?.hash, originalHash, "ordinary token cache is permitted to remain temporarily stale");
  const authoritative = await canonical.readFileBypassingEvidenceCache(vp("note.bin"));
  assert.notEqual(authoritative.evidence.hash, originalHash);
  assert.equal(authoritative.evidence.hash, proof(h1).hash);
  const healed = await canonical.observe(vp("note.bin"));
  assert.equal(healed.status, "present");
  if (healed.status === "present") assert.equal(healed.content?.hash, proof(h1).hash);
});

test("corrupt or truncated staged bytes are rejected before create target displacement", async () => {
  const intended = bytes(1, 2, 3, 4), corrupt = bytes(1, 2, 3);
  const raw = new MemoryLocal();
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const transaction = createTransaction("new.bin", intended);
  const result = await backend.stageAndVerify(transaction, source(corrupt));
  assert.equal(result.status, "blocked");
  assert.equal(raw.files.has("new.bin"), false);
});

test("create transaction requires authoritative absence and commits only verified staged bytes", async () => {
  const intended = bytes(7, 8, 9);
  const raw = new MemoryLocal();
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const transaction = createTransaction("new.bin", intended);
  const staged = await backend.stageAndVerify(transaction, source(intended));
  assert.equal(staged.status, "staged-verified");
  const committed = await backend.commitVerifiedStage(staged.transaction);
  assert.equal(committed.status, "committed");
  assert.deepEqual([...raw.files.get("new.bin")!], [...intended]);
  assert.equal(raw.files.has(String(transaction.stagePath)), false);
});

test("replace verifies exact old token and canonical content before displacement", async () => {
  const old = bytes(1, 1, 1), intended = bytes(2, 2, 2);
  const raw = new MemoryLocal({ "note.bin": old });
  const observed = await raw.observe(vp("note.bin"));
  assert.equal(observed.status, "present");
  if (observed.status !== "present") return;
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const transaction = createTransaction("note.bin", intended, observed.observationToken!, old);
  const staged = await backend.stageAndVerify(transaction, source(intended));
  assert.equal(staged.status, "staged-verified");
  raw.mutateWithoutObservationChange("note.bin", bytes(9, 9, 9));
  const commit = await backend.commitVerifiedStage(staged.transaction);
  assert.equal(commit.status, "stale");
  assert.deepEqual([...raw.files.get("note.bin")!], [9, 9, 9]);
});

test("replace recovery treats missing target plus missing expected backup as contradiction, never create", async () => {
  const old = bytes(1), intended = bytes(2);
  const raw = new MemoryLocal({ ".note.bin.brain-sync-stage-tx": intended });
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const transaction = {
    ...createTransaction("note.bin", intended, token("old-token"), old), stage: "backup-established" as const,
  } as LocalMutationTransaction;
  const result = await backend.recover(transaction);
  assert.equal(result.status, "outcome-unknown");
  if (result.status === "outcome-unknown") assert.match(result.reason, /contradiction/i);
  assert.equal(raw.files.has("note.bin"), false);
});

test("replace recovery completes verified stage when old target is durably preserved in backup", async () => {
  const old = bytes(1, 2), intended = bytes(3, 4);
  const raw = new MemoryLocal({
    ".note.bin.brain-sync-stage-tx": intended,
    ".note.bin.brain-sync-backup-tx": old,
  });
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const transaction = {
    ...createTransaction("note.bin", intended, token("pre-displacement"), old), stage: "backup-established" as const,
  } as LocalMutationTransaction;
  const result = await backend.recover(transaction);
  assert.equal(result.status, "recovered");
  assert.deepEqual([...raw.files.get("note.bin")!], [...intended]);
});

test("exact plugin structural events may coalesce but overlapping user edit remains observable", async () => {
  const old = bytes(1, 2, 3), intended = bytes(4, 5, 6);
  const raw = new MemoryLocal({ "note.bin": old });
  const initial = await raw.observe(vp("note.bin"));
  assert.equal(initial.status, "present");
  if (initial.status !== "present") return;
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const canonical = new CanonicalEvidenceLocalVault(raw, { staleRetryAttempts: 1 }, backend);
  const observedChanges: LocalVaultChange[] = [];
  canonical.onChange(change => observedChanges.push(change));
  const transaction = createTransaction("note.bin", intended, initial.observationToken!, old);
  const staged = await canonical.stageAndVerify(transaction, source(intended));
  assert.equal(staged.status, "staged-verified");
  const committed = await canonical.commitVerifiedStage(staged.transaction);
  assert.equal(committed.status, "committed");
  assert.deepEqual(observedChanges, [], "exact transaction structural hints are coalesced");

  const nextInitial = await raw.observe(vp("note.bin"));
  assert.equal(nextInitial.status, "present");
  if (nextInitial.status !== "present") return;
  const secondValue = bytes(7, 8, 9);
  const second = createTransaction("note.bin", secondValue, nextInitial.observationToken!, intended);
  const secondStaged = await canonical.stageAndVerify(second, source(secondValue));
  assert.equal(secondStaged.status, "staged-verified");
  raw.onRename = (from, to) => {
    if (from === String(second.stagePath) && to === "note.bin") raw.emitUserModify("note.bin");
  };
  const secondCommitted = await canonical.commitVerifiedStage(secondStaged.transaction);
  assert.equal(secondCommitted.status, "committed");
  assert.ok(observedChanges.some(change => change.kind === "modified" && change.path === vp("note.bin")), "overlapping user event must remain visible");
});
