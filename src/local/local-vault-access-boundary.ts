import type { DataAdapter } from "obsidian";
import {
  operationalFailureProvenanceFromErrorV1_3,
  type ContentEvidence,
  type ObservationToken,
  type VaultPath,
} from "../contracts/common";
import type { LocalReadResult, LocalVaultPort } from "../contracts/local-vault";
import type { LocalTransactionalMutationPortV1_3, LocalTransactionResultV1_3 } from "../contracts/execution";
import type {
  CanonicalFileContentProof,
  LocalMutationTransaction,
  LocalTransactionalMutationPort,
  LocalTransactionResult,
  SynchronizationCancellationSignal,
} from "../contracts/synchronization-foundation";
import { sha256BinarySource } from "../util/sha256";

export type LocalVaultAccess = "enumerate" | "observe" | "mutation-source" | "mutation-target";

/**
 * Private platform seam for proving that a local operation is safe to submit
 * through the current runtime's approved vault-access boundary.
 */
export interface LocalVaultAccessBoundary {
  readonly kind?: "desktop-physical" | "mobile-adapter" | "unavailable";
  assertSafe(path: VaultPath, access: LocalVaultAccess): Promise<void>;
}

interface CanonicalLocalRead {
  readonly read: LocalReadResult;
  readonly proof: CanonicalFileContentProof;
}

function proofMatches(left: CanonicalFileContentProof, right: CanonicalFileContentProof): boolean {
  return left.algorithm === right.algorithm && left.hash === right.hash && left.sizeBytes === right.sizeBytes;
}

function cancelled(signal?: SynchronizationCancellationSignal): boolean {
  return signal?.cancelled === true;
}

function withStage(transaction: LocalMutationTransaction, stage: LocalMutationTransaction["stage"]): LocalMutationTransaction {
  return { ...transaction, stage } as LocalMutationTransaction;
}

/**
 * Cross-platform physical transaction implementation for the frozen local
 * mutation contract. It intentionally uses only Obsidian's DataAdapter plus the
 * mobile-safe LocalVaultPort observation/read boundary. The persisted
 * transaction supplies stable stage/backup paths so restart recovery never
 * depends on volatile process memory.
 */
export class ObsidianLocalMutationTransactions implements LocalTransactionalMutationPort, LocalTransactionalMutationPortV1_3 {
  constructor(
    private readonly adapter: DataAdapter,
    private readonly local: LocalVaultPort,
  ) {}

  async stageAndVerify(
    transaction: LocalMutationTransaction,
    content: Parameters<LocalTransactionalMutationPortV1_3["stageAndVerify"]>[1],
    signal?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResultV1_3> {
    if (cancelled(signal)) return this.blocked(transaction, "Cancellation accepted before local staging");
    const pathProblem = await this.validateTransactionPaths(transaction);
    if (pathProblem) return this.blocked(transaction, pathProblem);
    const precondition = await this.verifyExpectedTarget(transaction);
    if (precondition) return precondition;
    try {
      if (await this.adapter.exists(String(transaction.stagePath), true)) {
        return this.unknown(transaction, `Local transaction stage already exists: ${String(transaction.stagePath)}`);
      }
      if (await this.adapter.exists(String(transaction.backupPath), true)) {
        return this.unknown(transaction, `Local transaction backup unexpectedly exists before staging: ${String(transaction.backupPath)}`);
      }
      await this.writeIncremental(transaction.stagePath, content);
      const staged = withStage(transaction, "staged-unverified");
      if (cancelled(signal)) return this.blocked(staged, "Cancellation accepted after stage write; target remains untouched");
      const stageProof = await this.readCanonical(transaction.stagePath);
      if (!proofMatches(stageProof.proof, transaction.expectedNewEvidence)) {
        await this.removeBestEffort(transaction.stagePath);
        return this.blocked(staged, "Staged local bytes failed canonical SHA-256/size verification; target was not displaced");
      }
      return { status: "staged-verified", transaction: withStage(transaction, "staged-verified"), resultingObservationToken: stageProof.read.observationToken };
    } catch (error) {
      const operationalFailure = operationalFailureProvenanceFromErrorV1_3(error);
      return {
        status: "outcome-unknown",
        reason: `Local staging outcome could not be established: ${this.message(error)}`,
        transaction,
        ...(operationalFailure ? { operationalFailure } : {}),
      };
    }
  }

  async commitVerifiedStage(
    transaction: LocalMutationTransaction,
    signal?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResultV1_3> {
    if (cancelled(signal)) return this.blocked(transaction, "Cancellation accepted before local commit");
    const pathProblem = await this.validateTransactionPaths(transaction);
    if (pathProblem) return this.blocked(transaction, pathProblem);
    try {
      const staged = await this.readCanonical(transaction.stagePath);
      if (!proofMatches(staged.proof, transaction.expectedNewEvidence)) {
        return this.blocked(transaction, "Verified stage is no longer the intended canonical content");
      }
      const precondition = await this.verifyExpectedTarget(transaction);
      if (precondition) return precondition;
      if (transaction.mutationKind === "create") return this.commitCreate(transaction);
      return this.commitReplace(transaction);
    } catch (error) {
      return this.unknown(transaction, `Local commit outcome could not be established: ${this.message(error)}`);
    }
  }

  async recover(
    transaction: LocalMutationTransaction,
    signal?: SynchronizationCancellationSignal,
  ): Promise<LocalTransactionResultV1_3> {
    if (cancelled(signal)) return this.blocked(transaction, "Cancellation accepted before local recovery");
    const pathProblem = await this.validateTransactionPaths(transaction);
    if (pathProblem) return this.blocked(transaction, pathProblem);
    try {
      return transaction.mutationKind === "create"
        ? await this.recoverCreate(transaction)
        : await this.recoverReplace(transaction);
    } catch (error) {
      return this.unknown(transaction, `Local recovery outcome could not be established: ${this.message(error)}`);
    }
  }

  private async commitCreate(transaction: Extract<LocalMutationTransaction, { readonly mutationKind: "create" }>): Promise<LocalTransactionResult> {
    const target = await this.local.observe(transaction.path);
    if (target.status !== "absent") {
      return target.status === "present"
        ? this.stale(transaction, "Create target is no longer authoritatively absent")
        : this.unknown(transaction, `Create target state is ${target.status}; absence is not established`);
    }
    await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
    const final = await this.readCanonical(transaction.path);
    if (!proofMatches(final.proof, transaction.expectedNewEvidence)) {
      return this.unknown(withStage(transaction, "swap-committed"), "Created target does not match intended canonical content after swap");
    }
    await this.removeBestEffort(transaction.backupPath);
    return {
      status: "committed",
      transaction: withStage(transaction, "completed"),
      resultingObservationToken: final.read.observationToken,
    };
  }

  private async commitReplace(transaction: Extract<LocalMutationTransaction, { readonly mutationKind: "replace" }>): Promise<LocalTransactionResult> {
    if (await this.adapter.exists(String(transaction.backupPath), true)) {
      return this.unknown(transaction, "Replace backup already exists before target displacement; refusing to guess its provenance");
    }
    await this.adapter.rename(String(transaction.path), String(transaction.backupPath));
    const backedUp = withStage(transaction, "backup-established");
    let backup: CanonicalLocalRead;
    try {
      backup = await this.readCanonical(transaction.backupPath);
    } catch (error) {
      return this.unknown(backedUp, `Expected replacement backup is missing or unreadable after displacement: ${this.message(error)}`);
    }
    if (!proofMatches(backup.proof, transaction.expectedTarget.canonicalContent)) {
      return this.unknown(backedUp, "Replacement backup canonical content contradicts the authorized old target");
    }
    await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
    const swapped = withStage(transaction, "swap-committed");
    const final = await this.readCanonical(transaction.path);
    if (!proofMatches(final.proof, transaction.expectedNewEvidence)) {
      return this.unknown(swapped, "Replacement target does not match intended canonical content after swap");
    }
    const cleanupSucceeded = await this.trashBestEffort(transaction.backupPath);
    return {
      status: "committed",
      transaction: withStage(transaction, cleanupSucceeded ? "completed" : "cleanup-pending"),
      resultingObservationToken: final.read.observationToken,
    };
  }

  private async recoverCreate(transaction: Extract<LocalMutationTransaction, { readonly mutationKind: "create" }>): Promise<LocalTransactionResult> {
    if (await this.adapter.exists(String(transaction.backupPath), true)) {
      return this.unknown(transaction, "Create transaction has an unexpected backup artifact; refusing to reinterpret replacement state as create");
    }
    const target = await this.tryCanonical(transaction.path);
    if (target?.status === "present") {
      if (proofMatches(target.value.proof, transaction.expectedNewEvidence)) {
        await this.removeBestEffort(transaction.stagePath);
        return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: target.value.read.observationToken };
      }
      return this.stale(transaction, "Create recovery found independently populated target content");
    }
    if (target?.status !== "absent") return this.unknown(transaction, "Create recovery cannot authoritatively establish target absence");
    const stage = await this.tryCanonical(transaction.stagePath);
    if (stage?.status === "present" && proofMatches(stage.value.proof, transaction.expectedNewEvidence)) {
      await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
      const final = await this.readCanonical(transaction.path);
      if (!proofMatches(final.proof, transaction.expectedNewEvidence)) return this.unknown(withStage(transaction, "swap-committed"), "Recovered create swap failed canonical verification");
      return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: final.read.observationToken };
    }
    if (stage?.status === "present") await this.removeBestEffort(transaction.stagePath);
    return this.blocked(transaction, "Create recovery found no verified staged result; authoritative target absence is preserved");
  }

  private async recoverReplace(transaction: Extract<LocalMutationTransaction, { readonly mutationKind: "replace" }>): Promise<LocalTransactionResult> {
    const [target, stage, backup] = await Promise.all([
      this.tryCanonical(transaction.path),
      this.tryCanonical(transaction.stagePath),
      this.tryCanonical(transaction.backupPath),
    ]);
    if (!target || !stage || !backup) return this.unknown(transaction, "Replace recovery encountered unreadable/unknown physical state");

    if (target.status === "present" && proofMatches(target.value.proof, transaction.expectedNewEvidence)) {
      if (backup.status === "present" && !proofMatches(backup.value.proof, transaction.expectedTarget.canonicalContent)) {
        return this.unknown(transaction, "Applied replacement is accompanied by a contradictory backup");
      }
      await this.removeBestEffort(transaction.stagePath);
      if (backup.status === "present") await this.trashBestEffort(transaction.backupPath);
      return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: target.value.read.observationToken };
    }

    if (target.status === "absent") {
      if (backup.status === "absent") {
        return this.unknown(transaction, "Replace recovery contradiction: target and required displaced-target backup are both absent");
      }
      if (!proofMatches(backup.value.proof, transaction.expectedTarget.canonicalContent)) {
        return this.unknown(transaction, "Replace recovery backup does not match the authorized old target");
      }
      if (stage.status === "present" && proofMatches(stage.value.proof, transaction.expectedNewEvidence)) {
        await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
        const final = await this.readCanonical(transaction.path);
        if (!proofMatches(final.proof, transaction.expectedNewEvidence)) return this.unknown(withStage(transaction, "swap-committed"), "Recovered replacement swap failed canonical verification");
        await this.trashBestEffort(transaction.backupPath);
        return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: final.read.observationToken };
      }
      await this.adapter.rename(String(transaction.backupPath), String(transaction.path));
      const restored = await this.readCanonical(transaction.path);
      if (!proofMatches(restored.proof, transaction.expectedTarget.canonicalContent)) {
        return this.unknown(transaction, "Replacement recovery could not restore the authorized old target");
      }
      return this.blocked(withStage(transaction, "staged-unverified"), "Replacement stage is unavailable or corrupt; authorized old target was restored");
    }

    if (target.status === "present" && proofMatches(target.value.proof, transaction.expectedTarget.canonicalContent)) {
      if (backup.status === "present") {
        return this.unknown(transaction, "Replace recovery found both authoritative old target and a backup; physical history is contradictory");
      }
      if (stage.status === "present" && proofMatches(stage.value.proof, transaction.expectedNewEvidence)) {
        return this.commitVerifiedStage(withStage(transaction, "staged-verified"));
      }
      return this.blocked(transaction, "Replacement was not applied and no verified stage remains; old target is preserved");
    }

    return this.stale(transaction, "Replace recovery found target content that matches neither authorized old nor intended new content");
  }

  private async verifyExpectedTarget(transaction: LocalMutationTransaction): Promise<LocalTransactionResult | undefined> {
    const observation = await this.local.observe(transaction.path);
    if (transaction.mutationKind === "create") {
      if (observation.status === "absent") return undefined;
      if (observation.status === "present") return this.stale(transaction, "Create requires authoritative expected absence but target is present");
      return this.unknown(transaction, `Create requires authoritative expected absence but target state is ${observation.status}`);
    }
    if (observation.status !== "present" || observation.entityKind !== "file" || observation.stability !== "stable" || !observation.observationToken) {
      return observation.status === "absent"
        ? this.stale(transaction, "Replace requires exact expected presence but target is absent")
        : this.unknown(transaction, `Replace requires exact stable presence but target state is ${observation.status}`);
    }
    if (observation.observationToken !== transaction.expectedTarget.observationToken) {
      return this.stale(transaction, "Replace observation token no longer matches exact expected presence");
    }
    const canonical = await this.readCanonical(transaction.path, transaction.expectedTarget.observationToken);
    if (!proofMatches(canonical.proof, transaction.expectedTarget.canonicalContent)) {
      return this.stale(transaction, "Replace canonical old content no longer matches exact expected presence");
    }
    return undefined;
  }

  private async validateTransactionPaths(transaction: LocalMutationTransaction): Promise<string | undefined> {
    const values = [transaction.path, transaction.stagePath, transaction.backupPath].map(String);
    if (new Set(values).size !== values.length) return "Local transaction target, stage, and backup paths must be distinct";
    for (const path of [transaction.path, transaction.stagePath, transaction.backupPath]) {
      const validation = await this.local.validatePath(path);
      if (validation.status === "blocked") return `Local transaction path is blocked (${validation.reason}): ${String(path)}`;
    }
    const targetParent = values[0].includes("/") ? values[0].slice(0, values[0].lastIndexOf("/")) : "";
    for (const artifact of values.slice(1)) {
      const artifactParent = artifact.includes("/") ? artifact.slice(0, artifact.lastIndexOf("/")) : "";
      if (artifactParent !== targetParent) return "Local transaction stage and backup must be siblings of the target";
    }
    return undefined;
  }

  private async readCanonical(path: VaultPath, expectedToken?: ObservationToken): Promise<CanonicalLocalRead> {
    const read = await this.local.readFile(path, expectedToken);
    const hash = await sha256BinarySource(read.content);
    const sizeBytes = this.authoritativeSize(read.evidence, read.content.sizeBytes);
    return { read, proof: { algorithm: "sha256", hash, sizeBytes } };
  }

  private async tryCanonical(path: VaultPath): Promise<{ readonly status: "present"; readonly value: CanonicalLocalRead } | { readonly status: "absent" } | undefined> {
    const observation = await this.local.observe(path);
    if (observation.status === "absent") return { status: "absent" };
    if (observation.status !== "present" || observation.entityKind !== "file" || observation.stability !== "stable") return undefined;
    try { return { status: "present", value: await this.readCanonical(path, observation.observationToken) }; }
    catch { return undefined; }
  }

  private authoritativeSize(evidence: ContentEvidence, sourceSize: number | undefined): number {
    const value = evidence.sizeBytes ?? sourceSize;
    if (value === undefined || !Number.isSafeInteger(value) || value < 0) throw new Error("Canonical local byte size is unavailable");
    return value;
  }

  private async writeIncremental(path: VaultPath, content: Parameters<LocalTransactionalMutationPortV1_3["stageAndVerify"]>[1]): Promise<void> {
    await this.adapter.writeBinary(String(path), new ArrayBuffer(0));
    try {
      for await (const chunk of content.openChunks()) {
        if (!chunk.byteLength) continue;
        const copy = new Uint8Array(chunk.byteLength);
        copy.set(chunk);
        await this.adapter.appendBinary(String(path), copy.buffer);
      }
    } catch (error) {
      await this.removeBestEffort(path);
      throw error;
    }
  }

  private async removeBestEffort(path: VaultPath): Promise<boolean> {
    try {
      if (await this.adapter.exists(String(path), true)) await this.adapter.remove(String(path));
      return true;
    } catch { return false; }
  }

  private async trashBestEffort(path: VaultPath): Promise<boolean> {
    try {
      if (await this.adapter.exists(String(path), true)) await this.adapter.trashLocal(String(path));
      return true;
    } catch { return false; }
  }

  private stale(transaction: LocalMutationTransaction, reason: string): LocalTransactionResult {
    return { status: "stale", reason, transaction };
  }
  private blocked(transaction: LocalMutationTransaction, reason: string): LocalTransactionResult {
    return { status: "blocked", reason, transaction };
  }
  private unknown(transaction: LocalMutationTransaction, reason: string): LocalTransactionResult {
    return { status: "outcome-unknown", reason, transaction };
  }
  private message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
}
