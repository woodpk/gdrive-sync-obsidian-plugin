import assert from "node:assert/strict";
import test from "node:test";
import type { DataAdapter } from "obsidian";
import {
  OperationalFailureErrorV1_3,
  type BinaryContentSource,
  type LocalMutationTransactionId,
  type ObservationToken,
  type OperationId,
  type OperationalFailureProvenanceV1_3,
  type VaultPath,
} from "../../../src/contracts/common";
import type { LocalTransactionalMutationPortV1_3, LocalTransactionResultV1_3 } from "../../../src/contracts/execution";
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

const vp = (value: string) => value as VaultPath;
const bytes = (...values: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(values);
const proof = (value: Uint8Array): CanonicalFileContentProof => ({
  algorithm: "sha256",
  hash: sha256Bytes(value),
  sizeBytes: value.byteLength,
});

function createTransaction(path = "new.bin"): LocalMutationTransaction {
  const intended = bytes(1, 2, 3, 4);
  return {
    transactionId: `tx-${path}` as LocalMutationTransactionId,
    operationId: `op-${path}` as OperationId,
    path: vp(path),
    stagePath: vp(`.${path}.brain-sync-stage-v13`),
    backupPath: vp(`.${path}.brain-sync-backup-v13`),
    stage: "staging",
    expectedEntityKind: "file",
    expectedNewEvidence: proof(intended),
    mutationKind: "create",
    expectedTarget: { status: "expected-absent" },
  };
}

function failingSource(error: unknown): BinaryContentSource {
  return {
    sizeBytes: 4,
    async *openChunks() {
      yield bytes(1, 2);
      throw error;
    },
  };
}

class StagingLocal implements LocalVaultPort {
  readonly files = new Map<string, Uint8Array>();
  readonly adapter = {
    exists: async (path: string) => this.files.has(path),
    writeBinary: async (path: string, value: ArrayBuffer) => { this.files.set(path, new Uint8Array(value)); },
    appendBinary: async (path: string, value: ArrayBuffer) => {
      const current = this.files.get(path);
      if (!current) throw new Error("missing append target");
      const addition = new Uint8Array(value);
      const combined = new Uint8Array(current.byteLength + addition.byteLength);
      combined.set(current);
      combined.set(addition, current.byteLength);
      this.files.set(path, combined);
    },
    remove: async (path: string) => { this.files.delete(path); },
    trashLocal: async (path: string) => { this.files.delete(path); },
    rename: async (from: string, to: string) => {
      const value = this.files.get(from);
      if (!value) throw new Error("missing rename source");
      this.files.set(to, value);
      this.files.delete(from);
    },
  } as unknown as DataAdapter;

  activeConfigurationDirectory = async () => vp(".obsidian");
  enumerate = async (): Promise<LocalVaultListing> => ({ entries: [], completeness: { status: "complete" } });
  observe = async (path: VaultPath): Promise<LocalObservation> => this.files.has(String(path))
    ? {
        status: "present",
        side: "local",
        path,
        entityKind: "file",
        stability: "stable",
        content: { sizeBytes: this.files.get(String(path))!.byteLength },
        observationToken: `${String(path)}-token` as ObservationToken,
      }
    : { status: "absent", side: "local", path };
  readFile = async (_path: VaultPath, _expectedToken?: ObservationToken): Promise<LocalReadResult> => { throw new Error("not used by failing-stage cases"); };
  createFile = async (path: VaultPath, _content: BinaryContentSource): Promise<LocalMutationReceipt> => ({ path });
  replaceFile = async (path: VaultPath, _content: BinaryContentSource, _expectedToken?: ObservationToken): Promise<LocalMutationReceipt> => ({ path });
  createFolder = async (path: VaultPath): Promise<LocalMutationReceipt> => ({ path });
  move = async (_fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt> => ({ path: toPath });
  trash = async (path: VaultPath): Promise<void> => { this.files.delete(String(path)); };
  validatePath = async (path: VaultPath): Promise<PathValidationResult> => ({ status: "compatible", normalizedComparisonPath: String(path) });
  classifyConfiguration = async (_path: VaultPath): Promise<ConfigurationClassification> => ({ classification: "unknown", reason: "test" });
  onChange(_listener: (change: LocalVaultChange) => void): Unsubscribe { return () => undefined; }
  onLifecycle(_listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return () => undefined; }
}

async function stageFailure(provenance: OperationalFailureProvenanceV1_3): Promise<LocalTransactionResultV1_3> {
  const local = new StagingLocal();
  const port: LocalTransactionalMutationPortV1_3 = new ObsidianLocalMutationTransactions(local.adapter, local);
  return port.stageAndVerify(createTransaction(), failingSource(new OperationalFailureErrorV1_3(provenance, "public carrier")));
}

function assertUnknownWithKind(result: LocalTransactionResultV1_3, kind: OperationalFailureProvenanceV1_3["kind"]): void {
  assert.equal(result.status, "outcome-unknown");
  if (result.status !== "outcome-unknown") return;
  assert.equal(result.transaction.stage, "staging", "provenance must not change the physical transaction classification/state");
  assert.equal(result.operationalFailure?.kind, kind);
}

test("B V1.3: authentication carrier remains physical outcome-unknown with authentication provenance", async () => {
  const result = await stageFailure({ kind: "authentication-required", source: "google-drive", detail: "reauth" });
  assertUnknownWithKind(result, "authentication-required");
});

test("B V1.3: transient carrier remains physical outcome-unknown with transient provenance", async () => {
  const result = await stageFailure({ kind: "transient-failure", source: "google-drive", detail: "transport interrupted" });
  assertUnknownWithKind(result, "transient-failure");
});

test("B V1.3: rate-limit carrier remains physical outcome-unknown and preserves exact retry timing", async () => {
  const result = await stageFailure({ kind: "rate-limited", source: "google-drive", retryAfterMs: 5000, detail: "quota pacing" });
  assertUnknownWithKind(result, "rate-limited");
  if (result.status !== "outcome-unknown") return;
  assert.deepEqual(result.operationalFailure, { kind: "rate-limited", source: "google-drive", retryAfterMs: 5000, detail: "quota pacing" });
});

test("B V1.3: generic local errors and suggestive strings never fabricate operational provenance", async () => {
  for (const message of ["ordinary local failure", "ECONNRESET", "429", "authentication-required"]) {
    const local = new StagingLocal();
    const port: LocalTransactionalMutationPortV1_3 = new ObsidianLocalMutationTransactions(local.adapter, local);
    const result = await port.stageAndVerify(createTransaction(`${message.replace(/[^a-z0-9]/giu, "-")}.bin`), failingSource(new Error(message)));
    assert.equal(result.status, "outcome-unknown", message);
    if (result.status !== "outcome-unknown") continue;
    assert.equal(result.operationalFailure, undefined, message);
    assert.equal(result.transaction.stage, "staging", message);
  }
});

test("B V1.3: canonical transaction wrapper preserves structured provenance returned by backend", async () => {
  const transaction = createTransaction("wrapped.bin");
  const operationalFailure: OperationalFailureProvenanceV1_3 = {
    kind: "rate-limited",
    source: "google-drive",
    retryAfterMs: 5000,
    detail: "wrapper preservation",
  };
  const backend: LocalTransactionalMutationPortV1_3 = {
    stageAndVerify: async tx => ({ status: "outcome-unknown", reason: "backend unknown", transaction: tx, operationalFailure }),
    commitVerifiedStage: async tx => ({ status: "outcome-unknown", reason: "backend unknown", transaction: tx, operationalFailure }),
    recover: async tx => ({ status: "outcome-unknown", reason: "backend unknown", transaction: tx, operationalFailure }),
  };
  const local = new StagingLocal();
  const canonical = new CanonicalEvidenceLocalVault(local, { staleRetryAttempts: 1 }, backend);
  const result = await canonical.stageAndVerify(transaction, failingSource(new Error("unused")));
  assert.equal(result.status, "outcome-unknown");
  if (result.status !== "outcome-unknown") return;
  const unknownResult = result as Extract<LocalTransactionResultV1_3, { readonly status: "outcome-unknown" }>;
  assert.deepEqual(unknownResult.operationalFailure, operationalFailure);
});
