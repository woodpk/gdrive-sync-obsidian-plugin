import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contractId, type AuditRecord, type VaultPath } from "../src/contracts";
import {
  DIAGNOSTIC_BUNDLE_RECORD_LIMIT,
  DIAGNOSTIC_BUNDLE_SCHEMA_VERSION,
  DIAGNOSTIC_BUNDLE_STATE_LIMIT,
  renderDiagnosticBundle,
} from "../src/diagnostics/diagnostic-bundle";
import { DiagnosticLogger, diagnosticPathKey, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { copyDiagnosticLogText, type DiagnosticClipboardNavigator } from "../src/diagnostics/share-export";
import { DEFAULT_SETTINGS } from "../src/product/plugin-data";
import type { SyncAttentionRecord } from "../src/product/sync-attention-ledger";

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

async function logger(): Promise<DiagnosticLogger> {
  let tick = 0;
  const value = new DiagnosticLogger({
    persistence: new MemoryDiagnostics(),
    level: "trace",
    retentionLimit: 100,
    consoleMirror: false,
    platform: "desktop",
    now: () => new Date(1_700_000_000_000 + tick++),
    monotonicNow: () => tick,
  });
  await value.initialize();
  return value;
}

const path = (value: string): VaultPath => contractId<"VaultPath">(value) as VaultPath;

function authority(rawPath = "Private/SENTINEL-secret-note.md") {
  return {
    status: "trusted",
    state: {
      schemaVersion: 1,
      authoritySchemaVersion: 2,
      stateRevision: "state-7",
      persistenceRevision: "persist-7",
      semanticGeneration: "generation-4",
      vaultIdentity: "SENTINEL-vault-identity",
      deviceIdentity: "SENTINEL-device-identity",
      changeCursor: "SENTINEL-raw-change-cursor",
      base: [{ path: rawPath, entityKind: "file", localExisted: true, remoteExisted: true, remoteObjectId: "remote-1", content: { hash: "sha256:abc", sizeBytes: 42, revision: "rev-2" } }],
      remoteMappings: [{ path: rawPath, remoteObjectId: "remote-1", entityKind: "file" }],
      tombstones: [{ path: "Deleted/SENTINEL-deleted.md", entityKind: "file", deletedOn: "both", remoteObjectId: "remote-deleted", sourceDeviceId: "SENTINEL-source-device" }],
      baseAuthority: [{ path: rawPath, fingerprint: "base-fingerprint-1" }],
      pathConvergence: [{ path: rawPath, state: { status: "converged", generation: "generation-4", baseFingerprint: "base-fingerprint-1" } }],
      learnedRemoteBatches: [{ checkpoint: { batchId: "batch-1", status: "learned", startingToken: "SENTINEL-start-token", terminalStartToken: "SENTINEL-terminal-token", persistenceRevision: "persist-6" }, changes: [{ rawUrl: "https://drive.invalid/files?access_token=SENTINEL_ACCESS" }] }],
      learnedRemoteReductions: [{ batchId: "batch-1", complete: true, durableFactRefs: ["fact-1", "SENTINEL-private-fact"] }],
      operationIntents: [{
        logicalKind: "single-effect",
        operationId: "operation-1",
        intentId: "intent-1",
        semanticAuthority: { generation: "generation-4" },
        effects: [{
          effectId: "effect-1",
          stage: "outcome-unknown",
          descriptor: {
            kind: "remote-file",
            targetSide: "remote",
            mutationKind: "update",
            targetPath: rawPath,
            intendedContent: { algorithm: "sha256", hash: "sha256:content", sizeBytes: 42 },
            remoteMutation: {
              kind: "existing-file-content-update",
              remoteObjectId: "remote-1",
              expectedRevision: "rev-1",
              candidateRemoteObjectId: "remote-candidate",
              path: rawPath,
              intendedContent: { algorithm: "sha256", hash: "sha256:content", sizeBytes: 42 },
              identityAuthority: { status: "unique", generation: "generation-4", path: rawPath, remoteObjectId: "remote-1" },
              requestBody: "SENTINEL_REQUEST_BODY",
            },
            fileContent: "SENTINEL_FILE_CONTENT",
          },
        }],
      }],
      localTransactions: [{ transactionId: "local-tx-1", operationId: "operation-1", path: rawPath, stage: "backup-durable", mutationKind: "replace", expectedEntityKind: "file", stagePath: "SENTINEL-stage-path", backupPath: "SENTINEL-backup-path", expectedNewEvidence: { algorithm: "sha256", hash: "sha256:content", sizeBytes: 42 } }],
      operations: [{ operationId: "operation-1", path: rawPath, status: "uncertain", verificationEvidenceRef: "verify-1" }],
      knownDevices: [{ deviceId: "SENTINEL-known-device", stale: true }],
      oauthToken: "SENTINEL_OAUTH_TOKEN",
      clientSecret: "SENTINEL_CLIENT_SECRET",
    },
  };
}

function auditRecords(rawPath: string): AuditRecord[] {
  return [{
    id: "audit-1",
    event: "operation-failed",
    advisoryAtMs: 100,
    path: path(rawPath),
    operationId: contractId<"OperationId">("operation-1"),
    planId: contractId<"PlanId">("plan-1"),
    reasonCode: "remote-failure",
    side: "remote",
    count: 1,
  }];
}

function attentionRecords(rawPath: string): SyncAttentionRecord[] {
  return [{
    key: `SENTINEL-key:${rawPath}`,
    firstSeenAtMs: 100,
    lastSeenAtMs: 200,
    runId: 7,
    trigger: "manual",
    path: path(rawPath),
    category: "upload-update",
    reasonCode: "remote-failure",
    humanReason: "SENTINEL_HUMAN_REASON secret note content",
    occurrenceCount: 2,
    current: true,
  }];
}

async function makeBundle(options: { authorityLoad?: unknown; audit?: AuditRecord[]; attention?: SyncAttentionRecord[]; generatedAt?: Date } = {}) {
  const diagnostics = await logger();
  const runId = diagnostics.beginSyncRun("manual");
  diagnostics.syncInfo("sync.execute", "operation-start", runId, { planId: "plan-1", operationId: "operation-1", intentId: "intent-1", effectId: "effect-1", pathKey: diagnosticPathKey("Private/SENTINEL-secret-note.md") });
  diagnostics.syncDebug("drive.semantic", "drive-update", runId, { operationId: "operation-1", intentId: "intent-1", effectId: "effect-1", requestId: "request-1", remoteObjectId: "remote-1" });
  diagnostics.syncError("drive.http", "request-failed", runId, { operationId: "operation-1", requestId: "request-1", classification: "transient-failure", safeMessage: "Authorization: Bearer SENTINEL_BEARER https://drive.invalid/files?code=SENTINEL_CODE requestBody=SENTINEL_BODY" });
  diagnostics.endSyncRun(runId);
  const settings = {
    ...DEFAULT_SETTINGS,
    oauthClientId: "SENTINEL_CLIENT_ID",
    oauthRedirectUri: "https://callback.invalid/?code=SENTINEL_REDIRECT_CODE",
    remoteRootId: "SENTINEL_REMOTE_ROOT",
    vaultIdentity: "SENTINEL-vault-identity",
    deviceIdentity: "SENTINEL-device-identity",
    firstSyncCompleted: true,
  };
  const rawPath = "Private/SENTINEL-secret-note.md";
  const text = await renderDiagnosticBundle({
    identity: { pluginId: "brain-google-drive-sync", pluginVersion: "0.1.11", platform: "desktop", runtime: "obsidian" },
    generatedAt: options.generatedAt ?? new Date("2026-09-10T12:00:00.000Z"),
    settings,
    readiness: { productControllerReady: true, stateAuthorityReady: true, auditHistoryReady: true, attentionLedgerReady: true },
    authorityLoad: options.authorityLoad ?? authority(rawPath),
    audit: options.audit ?? auditRecords(rawPath),
    attention: options.attention ?? attentionRecords(rawPath),
    diagnostics,
  });
  return { text, diagnostics };
}

test("LOG-06 bundle contains versioned build/runtime, authority, trace, audit, attention, and causal index sections", async () => {
  const { text } = await makeBundle();
  const bundle = JSON.parse(text);
  assert.equal(bundle.bundleSchemaVersion, DIAGNOSTIC_BUNDLE_SCHEMA_VERSION);
  assert.equal(bundle.generatedAt, "2026-09-10T12:00:00.000Z");
  assert.equal(bundle.buildRuntime.pluginId, "brain-google-drive-sync");
  assert.equal(bundle.buildRuntime.pluginVersion, "0.1.11");
  assert.equal(bundle.authorityState.status, "trusted");
  assert.ok(bundle.structuredTrace.length >= 3);
  assert.equal(bundle.auditHistory.records.length, 1);
  assert.equal(bundle.synchronizationAttention.records.length, 1);
  assert.deepEqual(bundle.causalIndex.runs[0].operationIds, ["operation-1"]);
  assert.deepEqual(bundle.causalIndex.runs[0].intentIds, ["intent-1"]);
  assert.deepEqual(bundle.causalIndex.runs[0].effectIds, ["effect-1"]);
  assert.deepEqual(bundle.causalIndex.runs[0].requestIds, ["request-1"]);
  assert.equal(bundle.causalIndex.operations[0].lastError.classification, "transient-failure");
  assert.deepEqual(bundle.causalIndex.outstandingIntentIds, ["intent-1"]);
  assert.equal(bundle.authorityState.outstandingOperationIntents.records[0].effects[0].stage, "outcome-unknown");
  assert.equal(bundle.authorityState.outstandingOperationIntents.records[0].effects[0].descriptor.remoteMutation.candidateRemoteObjectId, "remote-candidate");
  assert.equal(bundle.authorityState.outstandingOperationIntents.records[0].effects[0].descriptor.remoteMutation.expectedRevision, "rev-1");
  assert.equal(bundle.authorityState.localTransactions.stageCounts[0].stage, "backup-durable");
  assert.deepEqual(bundle.structuredTrace.map((event: { sequence: number }) => event.sequence), [...bundle.structuredTrace.map((event: { sequence: number }) => event.sequence)].sort((a: number, b: number) => a - b));
});

test("LOG-06 bundle privacy boundary replaces raw paths with pathKey and excludes secrets, free text, cursor values, and arbitrary state payloads", async () => {
  const { text } = await makeBundle();
  const requiredPathKey = diagnosticPathKey("Private/SENTINEL-secret-note.md");
  assert.match(text, new RegExp(requiredPathKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const forbidden of [
    "Private/SENTINEL-secret-note.md",
    "Deleted/SENTINEL-deleted.md",
    "SENTINEL_CLIENT_ID",
    "SENTINEL_REDIRECT_CODE",
    "SENTINEL_CLIENT_SECRET",
    "SENTINEL_OAUTH_TOKEN",
    "SENTINEL-raw-change-cursor",
    "SENTINEL-start-token",
    "SENTINEL-terminal-token",
    "SENTINEL_REQUEST_BODY",
    "SENTINEL_FILE_CONTENT",
    "SENTINEL-stage-path",
    "SENTINEL-backup-path",
    "SENTINEL_HUMAN_REASON",
    "SENTINEL_BEARER",
    "SENTINEL_CODE",
    "SENTINEL_BODY",
    "SENTINEL-private-fact",
  ]) assert.equal(text.includes(forbidden), false, `${forbidden} must not appear in the diagnostic bundle`);
  const bundle = JSON.parse(text);
  assert.equal(bundle.configuration.oauthClientIdConfigured, true);
  assert.equal(bundle.configuration.oauthRedirectUriConfigured, true);
  assert.equal(bundle.authorityState.base.records[0].pathKey, requiredPathKey);
  assert.match(bundle.authorityState.vaultIdentityKey, /^id-sha256:/);
  assert.match(bundle.authorityState.changeCursor.cursorKey, /^cursor-sha256:/);
  assert.equal("humanReason" in bundle.synchronizationAttention.records[0], false);
  assert.equal("key" in bundle.synchronizationAttention.records[0], false);
});

test("LOG-06 bundle is deterministic for equivalent fixed-time inputs and export does not clear retained diagnostics", async () => {
  const generatedAt = new Date("2026-09-10T12:00:00.000Z");
  const first = await makeBundle({ generatedAt });
  const before = first.diagnostics.snapshot().map(event => event.sequence);
  const secondText = await renderDiagnosticBundle({
    identity: { pluginId: "brain-google-drive-sync", pluginVersion: "0.1.11", platform: "desktop", runtime: "obsidian" },
    generatedAt,
    settings: { ...DEFAULT_SETTINGS, oauthClientId: "SENTINEL_CLIENT_ID", oauthRedirectUri: "https://callback.invalid/?code=SENTINEL_REDIRECT_CODE", remoteRootId: "SENTINEL_REMOTE_ROOT", vaultIdentity: "SENTINEL-vault-identity", deviceIdentity: "SENTINEL-device-identity", firstSyncCompleted: true },
    readiness: { productControllerReady: true, stateAuthorityReady: true, auditHistoryReady: true, attentionLedgerReady: true },
    authorityLoad: authority(),
    audit: auditRecords("Private/SENTINEL-secret-note.md"),
    attention: attentionRecords("Private/SENTINEL-secret-note.md"),
    diagnostics: first.diagnostics,
  });
  assert.equal(secondText, first.text);
  assert.deepEqual(first.diagnostics.snapshot().map(event => event.sequence), before);
});

test("LOG-06 state, audit, and attention projections are explicitly bounded with truncation evidence", async () => {
  const base = Array.from({ length: DIAGNOSTIC_BUNDLE_STATE_LIMIT + 5 }, (_, index) => ({
    path: `Folder/File-${index}.md`,
    entityKind: "file" as const,
    localExisted: true,
    remoteExisted: true,
    remoteObjectId: `remote-${index}`,
    content: { hash: `sha256:${index}`, sizeBytes: index, revision: `rev-${index}` },
  }));
  const authorityLoad = authority();
  authorityLoad.state.base = base;
  const audit: AuditRecord[] = Array.from({ length: DIAGNOSTIC_BUNDLE_RECORD_LIMIT + 5 }, (_, index) => ({
    id: `audit-${index}`,
    event: "operation-failed",
    advisoryAtMs: index,
    path: path(`A/${index}.md`),
  }));
  const attention: SyncAttentionRecord[] = Array.from({ length: DIAGNOSTIC_BUNDLE_RECORD_LIMIT + 5 }, (_, index) => ({
    key: `attention-${index}`,
    firstSeenAtMs: index,
    lastSeenAtMs: index,
    trigger: "manual",
    path: path(`B/${index}.md`),
    category: "blocked-unsafe",
    reasonCode: "test",
    humanReason: "omitted",
    occurrenceCount: 1,
    current: true,
  }));
  const { text } = await makeBundle({ authorityLoad, audit, attention });
  const bundle = JSON.parse(text);
  assert.equal(bundle.authorityState.base.totalCount, DIAGNOSTIC_BUNDLE_STATE_LIMIT + 5);
  assert.equal(bundle.authorityState.base.includedCount, DIAGNOSTIC_BUNDLE_STATE_LIMIT);
  assert.equal(bundle.authorityState.base.truncated, true);
  assert.equal(bundle.auditHistory.totalCount, DIAGNOSTIC_BUNDLE_RECORD_LIMIT + 5);
  assert.equal(bundle.auditHistory.includedCount, DIAGNOSTIC_BUNDLE_RECORD_LIMIT);
  assert.equal(bundle.auditHistory.truncated, true);
  assert.equal(bundle.synchronizationAttention.totalCount, DIAGNOSTIC_BUNDLE_RECORD_LIMIT + 5);
  assert.equal(bundle.synchronizationAttention.includedCount, DIAGNOSTIC_BUNDLE_RECORD_LIMIT);
  assert.equal(bundle.synchronizationAttention.truncated, true);
});

test("LOG-06 clipboard helper copies the complete bundle or rejects without mutating the bundle/logger", async () => {
  const { text, diagnostics } = await makeBundle();
  let captured = "";
  const navigatorLike: DiagnosticClipboardNavigator = { clipboard: { writeText: async value => { captured = value; } } };
  const before = diagnostics.snapshot().length;
  await copyDiagnosticLogText(text, navigatorLike);
  assert.equal(captured, text);
  assert.equal(diagnostics.snapshot().length, before);
  await assert.rejects(() => copyDiagnosticLogText(text, {}), /clipboard API is unavailable/i);
  assert.equal(diagnostics.snapshot().length, before);
});

test("LOG-06 operator wiring is one local clipboard command and runtime bundle collection does not invoke Drive or synchronization", () => {
  const main = readFileSync("src/main.ts", "utf8");
  const runtime = readFileSync("src/product/runtime.ts", "utf8");
  assert.match(main, /id: "copy-diagnostic-bundle", name: "Copy diagnostic bundle"/);
  assert.match(main, /exportDiagnosticBundleText\(\{[\s\S]*?pluginId: this\.manifest\.id[\s\S]*?pluginVersion: this\.manifest\.version/);
  assert.match(main, /copyDiagnosticLogText\(text\)/);
  assert.match(main, /diagnostic-bundle-copy-failed/);
  const method = runtime.match(/async exportDiagnosticBundleText\([\s\S]*?\n  }\n\n  async readSyncAttention/)?.[0] ?? "";
  assert.match(method, /this\.state \? await this\.state\.loadAuthority\(\)/);
  assert.match(method, /this\.audit \? await this\.audit\.read\(\) : await this\.host\.data\.load\(\)/);
  assert.match(method, /this\.attention \? await this\.attention\.all\(\) : \[\]/);
  assert.doesNotMatch(method, /\.drive\b|googleBoundary\(|previewManual\(|previewVerifyReconcile\(|\.request\(/);
  assert.doesNotMatch(method, /clear\(/);
});
