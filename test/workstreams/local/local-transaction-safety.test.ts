import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import type { BinaryContentSource, LocalMutationTransactionId, ObservationToken, OperationId, VaultPath } from "../../../src/contracts/common";
import type { ConfigurationClassification, LocalLifecycleEvent, LocalMutationReceipt, LocalReadResult, LocalVaultChange, LocalVaultListing, LocalVaultPort, PathValidationResult, Unsubscribe } from "../../../src/contracts/local-vault";
import type { LocalObservation } from "../../../src/contracts/snapshot";
import type { CanonicalFileContentProof, LocalMutationTransaction } from "../../../src/contracts/synchronization-foundation";
import { ObsidianLocalMutationTransactions } from "../../../src/local/local-vault-access-boundary";
import { CanonicalEvidenceLocalVault } from "../../../src/product/canonical-local-vault";
import { sha256Bytes } from "../../../src/util/sha256";

const vp = (v: string) => v as VaultPath;
const tok = (v: string) => v as ObservationToken;
const bytes = (...v: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(v);
const source = (v: Uint8Array): BinaryContentSource => ({ sizeBytes: v.byteLength, async *openChunks() { yield new Uint8Array(v); } });
const proof = (v: Uint8Array): CanonicalFileContentProof => ({ algorithm: "sha256", hash: sha256Bytes(v), sizeBytes: v.byteLength });

async function collect(content: BinaryContentSource): Promise<Uint8Array> {
  const parts: Uint8Array[] = []; let size = 0;
  for await (const part of content.openChunks()) { parts.push(new Uint8Array(part)); size += part.byteLength; }
  const out = new Uint8Array(size); let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.byteLength; }
  return out;
}

class MemoryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  private readonly versions = new Map<string, number>();
  private readonly listeners = new Set<(change: LocalVaultChange) => void>();
  onRename?: (from: string, to: string) => void;
  constructor(initial: Record<string, Uint8Array> = {}) { for (const [p, v] of Object.entries(initial)) this.files.set(p, new Uint8Array(v)); }
  readonly adapter = {
    exists: async (p: string) => this.files.has(p),
    writeBinary: async (p: string, b: ArrayBuffer) => { this.files.set(p, new Uint8Array(b)); this.bump(p); },
    appendBinary: async (p: string, b: ArrayBuffer) => { const a = this.files.get(p); if (!a) throw new Error("missing append target"); const x = new Uint8Array(b), n = new Uint8Array(a.length + x.length); n.set(a); n.set(x, a.length); this.files.set(p, n); this.bump(p); },
    rename: async (from: string, to: string) => { const v = this.files.get(from); if (!v) throw new Error(`missing rename source ${from}`); this.files.set(to, v); this.files.delete(from); this.bump(from); this.bump(to); this.emit({ kind: "renamed", fromPath: vp(from), toPath: vp(to) }); this.onRename?.(from, to); },
    remove: async (p: string) => { this.files.delete(p); this.bump(p); },
    trashLocal: async (p: string) => { this.files.delete(p); this.bump(p); },
  } as unknown as DataAdapter;
  activeConfigurationDirectory = async () => vp(".cfg");
  async enumerate(): Promise<LocalVaultListing> { const entries: LocalObservation[] = []; for (const p of this.files.keys()) entries.push(await this.observe(vp(p))); return { entries, completeness: { status: "complete" } }; }
  async observe(path: VaultPath): Promise<LocalObservation> { const v = this.files.get(String(path)); return v ? { status: "present", side: "local", path, entityKind: "file", stability: "stable", content: { sizeBytes: v.length, advisoryModifiedTimeMs: 1000 }, observationToken: this.current(path) } : { status: "absent", side: "local", path }; }
  async readFile(path: VaultPath, expected?: ObservationToken): Promise<LocalReadResult> { const v = this.files.get(String(path)); if (!v) throw new Error("missing"); const t = this.current(path); if (expected && expected !== t) throw new Error(`Local observation became stale: ${String(path)}`); return { content: source(v), evidence: { sizeBytes: v.length, advisoryModifiedTimeMs: 1000 }, stability: "stable", observationToken: t }; }
  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { this.files.set(String(path), await collect(content)); this.bump(String(path)); return { path, observationToken: this.current(path) }; }
  async replaceFile(path: VaultPath, content: BinaryContentSource, expected?: ObservationToken): Promise<LocalMutationReceipt> { if (expected && expected !== this.current(path)) throw new Error("stale"); this.files.set(String(path), await collect(content)); this.bump(String(path)); return { path, observationToken: this.current(path) }; }
  createFolder = async (path: VaultPath): Promise<LocalMutationReceipt> => ({ path });
  async move(from: VaultPath, to: VaultPath): Promise<LocalMutationReceipt> { await (this.adapter as any).rename(String(from), String(to)); return { path: to, observationToken: this.current(to) }; }
  async trash(path: VaultPath): Promise<void> { await (this.adapter as any).trashLocal(String(path)); }
  validatePath = async (path: VaultPath): Promise<PathValidationResult> => ({ status: "compatible", normalizedComparisonPath: String(path).toLowerCase() });
  classifyConfiguration = async (): Promise<ConfigurationClassification> => ({ classification: "unknown", reason: "test" });
  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }
  mutateWithoutObservationChange(path: string, v: Uint8Array): void { this.files.set(path, new Uint8Array(v)); }
  emitUserModify(path: string): void { this.bump(path); this.emit({ kind: "modified", path: vp(path) }); }
  private emit(change: LocalVaultChange): void { for (const listener of this.listeners) listener(change); }
  private bump(path: string): void { this.versions.set(path, (this.versions.get(path) ?? 0) + 1); }
  private current(path: VaultPath): ObservationToken { return tok(`${String(path)}|same-size|same-mtime|g${this.versions.get(String(path)) ?? 0}`); }
}

function transaction(path: string, next: Uint8Array, expected?: ObservationToken, old?: Uint8Array): LocalMutationTransaction {
  const base = { transactionId: `tx-${path}` as LocalMutationTransactionId, operationId: `op-${path}` as OperationId, path: vp(path), stagePath: vp(`.${path}.brain-sync-stage-tx`), backupPath: vp(`.${path}.brain-sync-backup-tx`), stage: "staging" as const, expectedEntityKind: "file" as const, expectedNewEvidence: proof(next) };
  return old ? { ...base, mutationKind: "replace", expectedTarget: { status: "expected-present", observationToken: expected!, entityKind: "file", canonicalContent: proof(old) } } : { ...base, mutationKind: "create", expectedTarget: { status: "expected-absent" } };
}

test("authoritative cache-bypass discovers same-size same-mtime H0->H1 after missed watcher event", async () => {
  const h0 = bytes(1,2,3,4), h1 = bytes(4,3,2,1), raw = new MemoryLocal({ "note.bin": h0 });
  const canonical = new CanonicalEvidenceLocalVault(raw, { staleRetryAttempts: 1 });
  const first = await canonical.observe(vp("note.bin")); assert.equal(first.status, "present"); if (first.status !== "present") return;
  const h0hash = first.content?.hash; raw.mutateWithoutObservationChange("note.bin", h1);
  const ordinary = await canonical.observe(vp("note.bin")); assert.equal(ordinary.status, "present"); if (ordinary.status !== "present") return; assert.equal(ordinary.content?.hash, h0hash);
  const authoritative = await canonical.readFileBypassingEvidenceCache(vp("note.bin")); assert.equal(authoritative.evidence.hash, proof(h1).hash); assert.notEqual(authoritative.evidence.hash, h0hash);
});

test("corrupt staged bytes are rejected before target displacement", async () => {
  const raw = new MemoryLocal(), backend = new ObsidianLocalMutationTransactions(raw.adapter, raw), tx = transaction("new.bin", bytes(1,2,3,4));
  const result = await backend.stageAndVerify(tx, source(bytes(1,2,3))); assert.equal(result.status, "blocked"); assert.equal(raw.files.has("new.bin"), false);
});

test("create requires authoritative absence and commits verified bytes", async () => {
  const next = bytes(7,8,9), raw = new MemoryLocal(), backend = new ObsidianLocalMutationTransactions(raw.adapter, raw), tx = transaction("new.bin", next);
  const staged = await backend.stageAndVerify(tx, source(next)); assert.equal(staged.status, "staged-verified");
  const committed = await backend.commitVerifiedStage(staged.transaction); assert.equal(committed.status, "committed"); assert.deepEqual([...raw.files.get("new.bin")!], [...next]);
});

test("replace rechecks canonical old bytes even when observation token is unchanged", async () => {
  const old = bytes(1,1,1), next = bytes(2,2,2), raw = new MemoryLocal({ "note.bin": old });
  const observed = await raw.observe(vp("note.bin")); assert.equal(observed.status, "present"); if (observed.status !== "present") return;
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw), tx = transaction("note.bin", next, observed.observationToken!, old);
  const staged = await backend.stageAndVerify(tx, source(next)); assert.equal(staged.status, "staged-verified"); raw.mutateWithoutObservationChange("note.bin", bytes(9,9,9));
  const result = await backend.commitVerifiedStage(staged.transaction); assert.equal(result.status, "stale"); assert.deepEqual([...raw.files.get("note.bin")!], [9,9,9]);
});

test("replace recovery treats absent target plus absent required backup as contradiction", async () => {
  const old = bytes(1), next = bytes(2), raw = new MemoryLocal({ ".note.bin.brain-sync-stage-tx": next }), backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const tx = { ...transaction("note.bin", next, tok("old"), old), stage: "backup-established" as const } as LocalMutationTransaction;
  const result = await backend.recover(tx); assert.equal(result.status, "outcome-unknown"); if (result.status === "outcome-unknown") assert.match(result.reason, /contradiction/i); assert.equal(raw.files.has("note.bin"), false);
});

test("replace recovery completes verified stage when old target survives in backup", async () => {
  const old = bytes(1,2), next = bytes(3,4), raw = new MemoryLocal({ ".note.bin.brain-sync-stage-tx": next, ".note.bin.brain-sync-backup-tx": old }), backend = new ObsidianLocalMutationTransactions(raw.adapter, raw);
  const tx = { ...transaction("note.bin", next, tok("old"), old), stage: "backup-established" as const } as LocalMutationTransaction;
  const result = await backend.recover(tx); assert.equal(result.status, "recovered"); assert.deepEqual([...raw.files.get("note.bin")!], [...next]);
});

test("exact plugin structural hints coalesce while overlapping user edit remains observable", async () => {
  const old = bytes(1,2,3), next = bytes(4,5,6), raw = new MemoryLocal({ "note.bin": old });
  const initial = await raw.observe(vp("note.bin")); assert.equal(initial.status, "present"); if (initial.status !== "present") return;
  const backend = new ObsidianLocalMutationTransactions(raw.adapter, raw), canonical = new CanonicalEvidenceLocalVault(raw, { staleRetryAttempts: 1 }, backend), changes: LocalVaultChange[] = [];
  canonical.onChange(change => changes.push(change));
  const first = transaction("note.bin", next, initial.observationToken!, old), staged = await canonical.stageAndVerify(first, source(next)); assert.equal(staged.status, "staged-verified");
  const committed = await canonical.commitVerifiedStage(staged.transaction); assert.equal(committed.status, "committed"); assert.equal(changes.length, 0, "exact transaction hints coalesce");
  const observed = await raw.observe(vp("note.bin")); assert.equal(observed.status, "present"); if (observed.status !== "present") return;
  const next2 = bytes(7,8,9), second = transaction("note.bin", next2, observed.observationToken!, next), staged2 = await canonical.stageAndVerify(second, source(next2)); assert.equal(staged2.status, "staged-verified");
  raw.onRename = (from, to) => { if (from === String(second.stagePath) && to === "note.bin") raw.emitUserModify("note.bin"); };
  const committed2 = await canonical.commitVerifiedStage(staged2.transaction); assert.equal(committed2.status, "committed");
  assert.ok((changes as LocalVaultChange[]).some((change: LocalVaultChange) => change.kind === "modified"), "overlapping user event must remain visible");
});
