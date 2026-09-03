import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import type { BinaryContentSource, LocalMutationTransactionId, ObservationToken, OperationId, VaultPath } from "../../../src/contracts/common";
import type { ConfigurationClassification, LocalLifecycleEvent, LocalMutationReceipt, LocalReadResult, LocalVaultChange, LocalVaultListing, LocalVaultPort, PathValidationResult, Unsubscribe } from "../../../src/contracts/local-vault";
import type { LocalObservation } from "../../../src/contracts/snapshot";
import type { LocalMutationTransaction } from "../../../src/contracts/synchronization-foundation";
import { ObsidianLocalMutationTransactions } from "../../../src/local/local-vault-access-boundary";
import { sha256Bytes } from "../../../src/util/sha256";

const vp = (v: string) => v as VaultPath;
const tok = (v: string) => v as ObservationToken;
const source = (v: Uint8Array): BinaryContentSource => ({ sizeBytes: v.byteLength, async *openChunks() { yield new Uint8Array(v); } });
type MatrixCase = { readonly name: string; readonly stage: LocalMutationTransaction["stage"]; readonly files: Record<string, Uint8Array>; readonly expected: string };

class RecoveryLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  private generation = 0;
  constructor(entries: Record<string, Uint8Array> = {}) { for (const [p, v] of Object.entries(entries)) this.files.set(p, new Uint8Array(v)); }
  readonly adapter = {
    exists: async (p: string) => this.files.has(p),
    writeBinary: async (p: string, b: ArrayBuffer) => { this.files.set(p, new Uint8Array(b)); this.generation++; },
    appendBinary: async (p: string, b: ArrayBuffer) => { const a = this.files.get(p) ?? new Uint8Array(); const c = new Uint8Array(b), n = new Uint8Array(a.length + c.length); n.set(a); n.set(c, a.length); this.files.set(p, n); this.generation++; },
    rename: async (from: string, to: string) => { const v = this.files.get(from); if (!v) throw new Error(`missing ${from}`); this.files.set(to, v); this.files.delete(from); this.generation++; },
    remove: async (p: string) => { this.files.delete(p); this.generation++; },
    trashLocal: async (p: string) => { this.files.delete(p); this.generation++; },
  } as unknown as DataAdapter;
  activeConfigurationDirectory = async () => vp(".cfg");
  async enumerate(): Promise<LocalVaultListing> { return { entries: await Promise.all([...this.files.keys()].map(p => this.observe(vp(p)))), completeness: { status: "complete" } }; }
  async observe(path: VaultPath): Promise<LocalObservation> { const v = this.files.get(String(path)); return v ? { status: "present", side: "local", path, entityKind: "file", stability: "stable", content: { sizeBytes: v.length }, observationToken: tok(`${String(path)}:${this.generation}`) } : { status: "absent", side: "local", path }; }
  async readFile(path: VaultPath): Promise<LocalReadResult> { const v = this.files.get(String(path)); if (!v) throw new Error("missing"); return { content: source(v), evidence: { sizeBytes: v.length }, stability: "stable", observationToken: tok(`${String(path)}:${this.generation}`) }; }
  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { this.files.set(String(path), await collect(content)); this.generation++; return { path }; }
  async replaceFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> { this.files.set(String(path), await collect(content)); this.generation++; return { path }; }
  createFolder = async (path: VaultPath): Promise<LocalMutationReceipt> => ({ path });
  async move(from: VaultPath, to: VaultPath): Promise<LocalMutationReceipt> { await (this.adapter as any).rename(String(from), String(to)); return { path: to }; }
  async trash(path: VaultPath): Promise<void> { await (this.adapter as any).trashLocal(String(path)); }
  validatePath = async (path: VaultPath): Promise<PathValidationResult> => ({ status: "compatible", normalizedComparisonPath: String(path).toLowerCase() });
  classifyConfiguration = async (): Promise<ConfigurationClassification> => ({ classification: "unknown", reason: "test" });
  onChange(_listener: (change: LocalVaultChange) => void): Unsubscribe { return () => undefined; }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }
}

async function collect(s: BinaryContentSource): Promise<Uint8Array> { const chunks: Uint8Array[] = []; let total = 0; for await (const c of s.openChunks()) { chunks.push(c); total += c.length; } const out = new Uint8Array(total); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out; }
const canonical = (v: Uint8Array) => ({ algorithm: "sha256" as const, hash: sha256Bytes(v), sizeBytes: v.length });
function createTx(stage: LocalMutationTransaction["stage"], next: Uint8Array): LocalMutationTransaction { return { mutationKind: "create", transactionId: "tx-create" as LocalMutationTransactionId, operationId: "op-create" as OperationId, path: vp("file.bin"), expectedTarget: { status: "expected-absent" }, expectedEntityKind: "file", expectedNewEvidence: canonical(next), stagePath: vp(".file.bin.brain-sync-stage-tx"), backupPath: vp(".file.bin.brain-sync-backup-tx"), stage }; }
function replaceTx(stage: LocalMutationTransaction["stage"], old: Uint8Array, next: Uint8Array, oldToken = tok("file.bin:0")): LocalMutationTransaction { return { mutationKind: "replace", transactionId: "tx-replace" as LocalMutationTransactionId, operationId: "op-replace" as OperationId, path: vp("file.bin"), expectedTarget: { status: "expected-present", observationToken: oldToken, entityKind: "file", canonicalContent: canonical(old) }, expectedEntityKind: "file", expectedNewEvidence: canonical(next), stagePath: vp(".file.bin.brain-sync-stage-tx"), backupPath: vp(".file.bin.brain-sync-backup-tx"), stage }; }

test("create crash-recovery matrix preserves absence or verified new content at every boundary", async () => {
  const next = new Uint8Array([4,5,6]);
  const cases: readonly MatrixCase[] = [
    { name: "before-stage", stage: "staging", files: {}, expected: "blocked" },
    { name: "after-stage-write", stage: "staged-unverified", files: { ".file.bin.brain-sync-stage-tx": new Uint8Array([4,5]) }, expected: "blocked" },
    { name: "after-stage-verification", stage: "staged-verified", files: { ".file.bin.brain-sync-stage-tx": next }, expected: "recovered" },
    { name: "after-swap", stage: "swap-committed", files: { "file.bin": next }, expected: "recovered" },
    { name: "before-cleanup", stage: "cleanup-pending", files: { "file.bin": next }, expected: "recovered" },
  ];
  for (const c of cases) {
    const local = new RecoveryLocal(c.files), port = new ObsidianLocalMutationTransactions(local.adapter, local);
    const result = await port.recover(createTx(c.stage, next));
    assert.equal(result.status, c.expected, c.name);
    const target = local.files.get("file.bin");
    if (c.expected === "recovered") assert.deepEqual([...target!], [...next], c.name);
    else assert.equal(target, undefined, c.name);
  }
});

test("replace crash-recovery matrix never converts lost old target into create authority", async () => {
  const old = new Uint8Array([1,2,3]), next = new Uint8Array([7,8,9]);
  const cases: readonly MatrixCase[] = [
    { name: "after-backup-establishment", stage: "backup-established", files: { ".file.bin.brain-sync-stage-tx": next, ".file.bin.brain-sync-backup-tx": old }, expected: "recovered" },
    { name: "after-swap-before-cleanup", stage: "swap-committed", files: { "file.bin": next, ".file.bin.brain-sync-backup-tx": old }, expected: "recovered" },
    { name: "missing-expected-backup", stage: "backup-established", files: { ".file.bin.brain-sync-stage-tx": next }, expected: "outcome-unknown" },
  ];
  for (const c of cases) {
    const local = new RecoveryLocal(c.files), port = new ObsidianLocalMutationTransactions(local.adapter, local);
    const result = await port.recover(replaceTx(c.stage, old, next));
    assert.equal(result.status, c.expected, c.name);
    if (c.expected === "recovered") assert.deepEqual([...local.files.get("file.bin")!], [...next], c.name);
    if (c.name === "missing-expected-backup") assert.equal(local.files.get("file.bin"), undefined, c.name);
  }
});
