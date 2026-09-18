import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type ObservationToken,
  type LocalVaultPort,
  type PlannedOperation,
  type ProductSurfaceState,
  type SynchronizationPlan,
  type UserAction,
  type VaultPath,
} from "../src/contracts";
import type { ExecutorRunEvidence } from "../src/product/production-executor";
import {
  ValidationFixtureManager,
} from "../src/validation/fixture-manager";
import {
  ValidationProductionPathDriver,
  type ValidationProductionControllerPort,
} from "../src/validation/production-path-driver";
import {
  C04_NEW_RELATIVE_PATH,
  C04_OLD_RELATIVE_PATH,
  C04_SCENARIO_DEFINITION,
  C04_SCENARIO_REGISTRATION,
  C04ScenarioExecutor,
  c04FixturePath,
  type C04VerifierPort,
} from "../src/validation/scenarios/c04-ios-move-windows-move";
import {
  validationDeviceIdentity,
  validationRunIdentity,
  validationSandboxOwnership,
} from "../src/validation/run-sandbox-checkpoint-contracts";
import type {
  ValidationStateConvergenceReport,
  ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";

const id = <T extends string>(value: string) => contractId<T>(value);
const FIXTURE_ROOT = "__brain_validation__/run-c04";
const OLD_PATH = c04FixturePath(FIXTURE_ROOT, C04_OLD_RELATIVE_PATH);
const NEW_PATH = c04FixturePath(FIXTURE_ROOT, C04_NEW_RELATIVE_PATH);
const STABLE_REMOTE_ID = id<"RemoteObjectId">("drive:c04:stable");

function operation(input: {
  readonly id: string;
  readonly kind: PlannedOperation["kind"];
  readonly path: VaultPath;
  readonly targetSide?: "local" | "remote";
  readonly remoteObjectId?: ReturnType<typeof remoteId>;
  readonly fromPath?: VaultPath;
  readonly toPath?: VaultPath;
  readonly destructive?: boolean;
}): PlannedOperation {
  return {
    operationId: id<"OperationId">(input.id),
    kind: input.kind,
    path: input.path,
    ...(input.targetSide === undefined ? {} : { targetSide: input.targetSide }),
    ...(input.remoteObjectId === undefined ? {} : { remoteObjectId: input.remoteObjectId }),
    ...(input.fromPath === undefined ? {} : { fromPath: input.fromPath }),
    ...(input.toPath === undefined ? {} : { toPath: input.toPath }),
    destructive: input.destructive ?? false,
    preconditions: [],
    reasons: [{ code: "vh17-test", summary: "VH17 C04 deterministic scenario fixture." }],
  };
}

function remoteId(value: string) {
  return id<"RemoteObjectId">(value);
}

function plan(planId: string, operations: readonly PlannedOperation[]): SynchronizationPlan {
  return {
    planId: id<"PlanId">(planId),
    trigger: "manual",
    operations,
    executionDisposition: "safe-auto-eligible",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
}

class MemoryLocalVault {
  readonly entries = new Map<string, { kind: "file"; bytes: Uint8Array } | { kind: "folder" }>();

  readonly port = {
    validatePath: async (path: VaultPath) => ({ status: "compatible" as const, normalizedComparisonPath: String(path).toLowerCase() }),
    observe: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry) return { status: "absent" as const, path };
      return {
        status: "present" as const,
        path,
        entityKind: entry.kind,
        stability: "stable" as const,
        observationToken: id<"ObservationToken">("token:" + String(path)) as ObservationToken,
      };
    },
    readFile: async (path: VaultPath) => {
      const entry = this.entries.get(String(path));
      if (!entry || entry.kind !== "file") throw new Error("not a file");
      const bytes = entry.bytes.slice();
      return {
        content: { sizeBytes: bytes.byteLength, async *openChunks(): AsyncIterable<Uint8Array> { yield bytes; } },
        evidence: { sizeBytes: bytes.byteLength },
        stability: "stable" as const,
      };
    },
    createFile: async (path: VaultPath, source: BinaryContentSource) => {
      if (this.entries.has(String(path))) throw new Error("exists");
      this.entries.set(String(path), { kind: "file", bytes: await this.collect(source) });
      return { path };
    },
    replaceFile: async (path: VaultPath, source: BinaryContentSource) => {
      const existing = this.entries.get(String(path));
      if (!existing || existing.kind !== "file") throw new Error("missing");
      this.entries.set(String(path), { kind: "file", bytes: await this.collect(source) });
