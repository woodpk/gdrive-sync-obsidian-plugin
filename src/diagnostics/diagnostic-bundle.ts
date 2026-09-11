import type { AuditRecord } from "../contracts";
import type { BrainSyncSettings } from "../product/plugin-data";
import type { SyncAttentionRecord } from "../product/sync-attention-ledger";
import { sha256Text } from "../util/sha256";
import {
  diagnosticPathKey,
  sanitizeDiagnosticText,
  type DiagnosticEvent,
  type DiagnosticLogger,
  type DiagnosticPlatform,
} from "./diagnostic-logger";

export const DIAGNOSTIC_BUNDLE_SCHEMA_VERSION = 1 as const;
export const DIAGNOSTIC_BUNDLE_STATE_LIMIT = 500;
export const DIAGNOSTIC_BUNDLE_INTENT_LIMIT = 200;
export const DIAGNOSTIC_BUNDLE_RECORD_LIMIT = 500;

export interface DiagnosticBundleBuildIdentity {
  readonly pluginId: string;
  readonly pluginVersion: string;
  readonly platform: DiagnosticPlatform;
  readonly runtime: "obsidian";
}

export interface DiagnosticBundleRuntimeReadiness {
  readonly productControllerReady: boolean;
  readonly stateAuthorityReady: boolean;
  readonly auditHistoryReady: boolean;
  readonly attentionLedgerReady: boolean;
}

export interface DiagnosticBundleInput {
  readonly identity: DiagnosticBundleBuildIdentity;
  readonly generatedAt: Date;
  readonly settings: BrainSyncSettings;
  readonly readiness: DiagnosticBundleRuntimeReadiness;
  readonly authorityLoad: unknown;
  readonly audit: readonly AuditRecord[];
  readonly attention: readonly SyncAttentionRecord[];
  readonly diagnostics: DiagnosticLogger;
}

interface Projection<T> {
  readonly totalCount: number;
  readonly includedCount: number;
  readonly truncated: boolean;
  readonly records: readonly T[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
function array(value: unknown): readonly unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string | undefined {
  return sanitizeDiagnosticText(typeof value === "string" ? value : undefined);
}
function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function bool(value: unknown): boolean | undefined { return typeof value === "boolean" ? value : undefined; }
function identityKey(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return `id-sha256:${String(sha256Text(value)).replace(/^sha256:/, "")}`;
}
function cursorKey(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return `cursor-sha256:${String(sha256Text(value)).replace(/^sha256:/, "")}`;
}
function pathKey(value: unknown): string | undefined {
  return typeof value === "string" ? diagnosticPathKey(value) : undefined;
}
function compact<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
function bounded<T>(items: readonly T[], limit: number): Projection<T> {
  const records = items.slice(0, limit);
  return { totalCount: items.length, includedCount: records.length, truncated: items.length > records.length, records };
}
function contentProjection(value: unknown): Record<string, unknown> | undefined {
  const source = record(value);
  if (!source) return undefined;
  const projected = compact({
    hash: text(source.hash),
    sizeBytes: finiteNumber(source.sizeBytes),
    revision: text(source.revision),
  });
  return Object.keys(projected).length ? projected : undefined;
}
function canonicalContentProjection(value: unknown): Record<string, unknown> | undefined {
  const source = record(value);
  if (!source) return undefined;
  const projected = compact({
    algorithm: source.algorithm === "sha256" ? "sha256" : undefined,
    hash: text(source.hash),
    sizeBytes: finiteNumber(source.sizeBytes),
  });
  return Object.keys(projected).length ? projected : undefined;
}
function baseAuthorityProjection(value: unknown): Record<string, unknown> | undefined {
  const source = record(value);
  if (!source) return undefined;
  const projected = compact({
    generation: text(source.generation),
    pathKey: pathKey(source.path),
    fingerprint: text(source.fingerprint),
  });
  return Object.keys(projected).length ? projected : undefined;
}
function identityAuthorityProjection(value: unknown): Record<string, unknown> | undefined {
  const source = record(value);
  if (!source) return undefined;
  const projected = compact({
    status: source.status === "unique" ? "unique" : undefined,
    generation: text(source.generation),
    pathKey: pathKey(source.path),
    remoteObjectId: text(source.remoteObjectId),
  });
  return Object.keys(projected).length ? projected : undefined;
}

/** Explicit descriptor allowlist. Raw paths/path-comparison keys and arbitrary descriptor members never cross this boundary. */
function mutationDescriptorProjection(value: unknown): Record<string, unknown> {
  const source = record(value) ?? {};
  const kind = text(source.kind) ?? "unknown";
  if (kind === "local-file") return compact({
    kind,
    targetSide: source.targetSide === "local" ? "local" : undefined,
    mutationKind: source.mutationKind === "create" || source.mutationKind === "replace" ? source.mutationKind : undefined,
    pathKey: pathKey(source.targetPath),
    localTransactionId: text(source.localTransactionId),
    intendedContent: canonicalContentProjection(source.intendedContent),
  });
  if (kind === "remote-file") {
    const remote = record(source.remoteMutation) ?? {};
    const remoteKind = text(remote.kind);
    return compact({
      kind,
      targetSide: source.targetSide === "remote" ? "remote" : undefined,
      mutationKind: source.mutationKind === "create" || source.mutationKind === "update" ? source.mutationKind : undefined,
      pathKey: pathKey(source.targetPath),
      intendedContent: canonicalContentProjection(source.intendedContent),
      remoteMutation: compact({
        kind: remoteKind,
        remoteObjectId: text(remote.remoteObjectId),
        reservedRemoteObjectId: text(remote.reservedRemoteObjectId),
        candidateRemoteObjectId: text(remote.candidateRemoteObjectId),
        expectedRevision: text(remote.expectedRevision),
        intendedContent: canonicalContentProjection(remote.intendedContent),
        identityAuthority: identityAuthorityProjection(remote.identityAuthority),
      }),
    });
  }
  if (kind === "move") return compact({
    kind,
    targetSide: source.targetSide === "local" || source.targetSide === "remote" ? source.targetSide : undefined,
    fromPathKey: pathKey(source.fromPath),
    toPathKey: pathKey(source.toPath),
    remoteObjectId: text(source.remoteObjectId),
    identityAuthority: identityAuthorityProjection(source.identityAuthority),
  });
  if (kind === "trash") return compact({
    kind,
    targetSide: source.targetSide === "local" || source.targetSide === "remote" ? source.targetSide : undefined,
    pathKey: pathKey(source.path),
    remoteObjectId: text(source.remoteObjectId),
    baseAuthority: baseAuthorityProjection(source.baseAuthority),
    identityAuthority: identityAuthorityProjection(source.identityAuthority),
  });
  if (kind === "local-folder-create") {
    const authority = record(source.pathAuthority) ?? {};
    return compact({
      kind,
      targetSide: source.targetSide === "local" ? "local" : undefined,
      mutationKind: source.mutationKind === "create" ? "create" : undefined,
      pathKey: pathKey(source.targetPath),
      pathAuthority: compact({
        generation: text(authority.generation),
        targetPathKey: pathKey(authority.targetPath),
        parentPathKey: pathKey(authority.parentPath),
        expectedTarget: authority.expectedTarget === "absent" ? "absent" : undefined,
      }),
    });
  }
  if (kind === "remote-folder-create") {
    const authority = record(source.pathAuthority) ?? {};
    const remote = record(source.remoteMutation) ?? {};
    return compact({
      kind,
      targetSide: source.targetSide === "remote" ? "remote" : undefined,
      mutationKind: source.mutationKind === "create" ? "create" : undefined,
      pathKey: pathKey(source.targetPath),
      parentRemoteObjectId: text(source.parentRemoteObjectId),
      pathAuthority: compact({
        generation: text(authority.generation),
        targetPathKey: pathKey(authority.targetPath),
        parentPathKey: pathKey(authority.parentPath),
        expectedTarget: authority.expectedTarget === "absent" ? "absent" : undefined,
      }),
      remoteMutation: compact({
        kind: text(remote.kind),
        reservedRemoteObjectId: text(remote.reservedRemoteObjectId),
        pathKey: pathKey(remote.path),
      }),
    });
  }
  return { kind };
}

function projectConfiguration(settings: BrainSyncSettings): Record<string, unknown> {
  return {
    oauthClientIdConfigured: Boolean(settings.oauthClientId),
    oauthRedirectUriConfigured: Boolean(settings.oauthRedirectUri),
    remoteRootConfigured: Boolean(settings.remoteRootId),
    vaultIdentityConfigured: Boolean(settings.vaultIdentity),
    deviceIdentityConfigured: Boolean(settings.deviceIdentity),
    firstSyncCompleted: settings.firstSyncCompleted,
    recoveryInProgress: settings.recoveryInProgress,
    scopeReconcileRequired: settings.scopeReconcileRequired,
    startupResumeEnabled: settings.startupResumeEnabled,
    localChangeEnabled: settings.localChangeEnabled,
    periodicEnabled: settings.periodicEnabled,
    periodicIntervalMinutes: settings.periodicIntervalMinutes,
    localDebounceMs: settings.localDebounceMs,
    wifiOnlyAutomatic: settings.wifiOnlyAutomatic,
    wifiOnlyLargeTransfers: settings.wifiOnlyLargeTransfers,
    largeTransferThresholdBytes: settings.largeTransferThresholdBytes,
    auditRetention: settings.auditRetention,
    diagnosticLogLevel: settings.diagnosticLogLevel,
    diagnosticConsoleMirror: settings.diagnosticConsoleMirror,
    diagnosticRetention: settings.diagnosticRetention,
  };
}

function projectAuthority(authorityLoad: unknown): Record<string, unknown> {
  const loaded = record(authorityLoad) ?? {};
  const status = loaded.status === "trusted" || loaded.status === "uninitialized" || loaded.status === "recovery-required"
    ? loaded.status
    : "unavailable";
  if (status !== "trusted") {
    const issues = array(loaded.issues).map(item => {
      const issue = record(item) ?? {};
      return compact({ code: text(issue.code), invariantCategory: text(issue.invariantCategory) });
    }).filter(item => Object.keys(item).length > 0);
    return compact({ status, ...(issues.length ? { issues: bounded(issues, 20) } : {}) });
  }
  const state = record(loaded.state) ?? {};
  const bases = array(state.base).map(item => {
    const entry = record(item) ?? {};
    return compact({
      pathKey: pathKey(entry.path),
      entityKind: entry.entityKind === "file" || entry.entityKind === "folder" ? entry.entityKind : undefined,
      localExisted: bool(entry.localExisted),
      remoteExisted: bool(entry.remoteExisted),
      remoteObjectId: text(entry.remoteObjectId),
      content: contentProjection(entry.content),
    });
  }).sort((a, b) => String(a.pathKey ?? "").localeCompare(String(b.pathKey ?? "")));
  const mappings = array(state.remoteMappings).map(item => {
    const entry = record(item) ?? {};
    return compact({ pathKey: pathKey(entry.path), remoteObjectId: text(entry.remoteObjectId), entityKind: text(entry.entityKind) });
  }).sort((a, b) => String(a.pathKey ?? "").localeCompare(String(b.pathKey ?? "")));
  const tombstones = array(state.tombstones).map(item => {
    const entry = record(item) ?? {};
    return compact({
      pathKey: pathKey(entry.path),
      entityKind: text(entry.entityKind),
      deletedOn: text(entry.deletedOn),
      remoteObjectId: text(entry.remoteObjectId),
      sourceDeviceKey: identityKey(entry.sourceDeviceId),
      advisoryRecordedAtMs: finiteNumber(entry.advisoryRecordedAtMs),
    });
  }).sort((a, b) => String(a.pathKey ?? "").localeCompare(String(b.pathKey ?? "")));
  const baseAuthority = array(state.baseAuthority).map(item => {
    const entry = record(item) ?? {};
    return compact({ pathKey: pathKey(entry.path), fingerprint: text(entry.fingerprint) });
  }).sort((a, b) => String(a.pathKey ?? "").localeCompare(String(b.pathKey ?? "")));
  const convergence = array(state.pathConvergence).map(item => {
    const entry = record(item) ?? {};
    const value = record(entry.state) ?? {};
    return compact({
      pathKey: pathKey(entry.path),
      status: text(value.status),
      generation: text(value.generation),
      baseFingerprint: text(value.baseFingerprint),
      reasonCode: text(value.reasonCode),
    });
  }).sort((a, b) => String(a.pathKey ?? "").localeCompare(String(b.pathKey ?? "")));
  const batches = array(state.learnedRemoteBatches).map(item => {
    const batch = record(item) ?? {};
    const checkpoint = record(batch.checkpoint) ?? {};
    return compact({
      batchId: text(checkpoint.batchId),
      status: text(checkpoint.status),
      changeCount: array(batch.changes).length,
      startingCursorKey: cursorKey(checkpoint.startingToken),
      terminalCursorKey: cursorKey(checkpoint.terminalStartToken),
      persistenceRevision: text(checkpoint.persistenceRevision),
    });
  }).sort((a, b) => String(a.batchId ?? "").localeCompare(String(b.batchId ?? "")));
  const reductions = array(state.learnedRemoteReductions).map(item => {
    const reduction = record(item) ?? {};
    return compact({
      batchId: text(reduction.batchId),
      complete: bool(reduction.complete),
      durableFactCount: array(reduction.durableFactRefs).length,
    });
  }).sort((a, b) => String(a.batchId ?? "").localeCompare(String(b.batchId ?? "")));
  const intents = array(state.operationIntents).map(item => {
    const intent = record(item) ?? {};
    const semantic = record(intent.semanticAuthority) ?? {};
    const effects = array(intent.effects).map(effectValue => {
      const effect = record(effectValue) ?? {};
      return compact({
        effectId: text(effect.effectId),
        stage: text(effect.stage),
        verificationEvidenceRef: text(effect.verificationEvidenceRef),
        descriptor: mutationDescriptorProjection(effect.descriptor),
      });
    }).sort((a, b) => String(a.effectId ?? "").localeCompare(String(b.effectId ?? "")));
    return compact({
      operationId: text(intent.operationId),
      intentId: text(intent.intentId),
      logicalKind: text(intent.logicalKind),
      semanticGeneration: text(semantic.generation),
      effects,
    });
  }).filter(intent => array(intent.effects).some(effectValue => record(effectValue)?.stage !== "state-committed"))
    .sort((a, b) => `${String(a.operationId ?? "")}:${String(a.intentId ?? "")}`.localeCompare(`${String(b.operationId ?? "")}:${String(b.intentId ?? "")}`));
  const transactions = array(state.localTransactions).map(item => {
    const transaction = record(item) ?? {};
    return compact({
      transactionId: text(transaction.transactionId),
      operationId: text(transaction.operationId),
      pathKey: pathKey(transaction.path),
      stage: text(transaction.stage),
      mutationKind: text(transaction.mutationKind),
      expectedEntityKind: text(transaction.expectedEntityKind),
      expectedNewEvidence: canonicalContentProjection(transaction.expectedNewEvidence),
    });
  }).sort((a, b) => String(a.transactionId ?? "").localeCompare(String(b.transactionId ?? "")));
  const transactionStageCounts = Array.from(new Set(transactions.map(item => String(item.stage ?? "unknown")))).sort().map(stage => ({
    stage,
    count: transactions.filter(item => String(item.stage ?? "unknown") === stage).length,
  }));
  const journal = array(state.operations).map(item => {
    const operation = record(item) ?? {};
    return compact({
      operationId: text(operation.operationId),
      pathKey: pathKey(operation.path),
      status: text(operation.status),
      verificationEvidenceRef: text(operation.verificationEvidenceRef),
      checkpointId: text(operation.checkpointId),
    });
  }).sort((a, b) => String(a.operationId ?? "").localeCompare(String(b.operationId ?? "")));
  const knownDevices = array(state.knownDevices).map(item => record(item) ?? {});
  return {
    status: "trusted",
    schemaVersion: finiteNumber(state.schemaVersion),
    authoritySchemaVersion: finiteNumber(state.authoritySchemaVersion),
    stateRevision: text(state.stateRevision),
    persistenceRevision: text(state.persistenceRevision),
    semanticGeneration: text(state.semanticGeneration),
    vaultIdentityKey: identityKey(state.vaultIdentity),
    deviceIdentityKey: identityKey(state.deviceIdentity),
    changeCursor: state.changeCursor === undefined ? { present: false } : { present: true, cursorKey: cursorKey(state.changeCursor) },
    base: bounded(bases, DIAGNOSTIC_BUNDLE_STATE_LIMIT),
    remoteMappings: bounded(mappings, DIAGNOSTIC_BUNDLE_STATE_LIMIT),
    tombstones: bounded(tombstones, DIAGNOSTIC_BUNDLE_STATE_LIMIT),
    baseAuthority: bounded(baseAuthority, DIAGNOSTIC_BUNDLE_STATE_LIMIT),
    pathConvergence: bounded(convergence, DIAGNOSTIC_BUNDLE_STATE_LIMIT),
    learnedRemoteBatches: bounded(batches, DIAGNOSTIC_BUNDLE_INTENT_LIMIT),
    learnedRemoteReductions: bounded(reductions, DIAGNOSTIC_BUNDLE_INTENT_LIMIT),
    outstandingOperationIntents: bounded(intents, DIAGNOSTIC_BUNDLE_INTENT_LIMIT),
    localTransactions: {
      totalCount: transactions.length,
      stageCounts: transactionStageCounts,
      ...bounded(transactions, DIAGNOSTIC_BUNDLE_INTENT_LIMIT),
    },
    operationJournal: bounded(journal, DIAGNOSTIC_BUNDLE_INTENT_LIMIT),
    knownDevices: {
      totalCount: knownDevices.length,
      staleCount: knownDevices.filter(device => device.stale === true).length,
    },
  };
}

function projectAudit(audit: readonly AuditRecord[]): Projection<Record<string, unknown>> {
  const projected = audit.map(item => compact({
    id: text(item.id),
    event: text(item.event),
    advisoryAtMs: finiteNumber(item.advisoryAtMs),
    pathKey: item.path ? diagnosticPathKey(String(item.path)) : undefined,
    operationId: text(item.operationId),
    planId: text(item.planId),
    reasonCode: text(item.reasonCode),
    side: item.side,
    count: finiteNumber(item.count),
  })).sort((a, b) => (Number(a.advisoryAtMs ?? 0) - Number(b.advisoryAtMs ?? 0)) || String(a.id ?? "").localeCompare(String(b.id ?? "")));
  return bounded(projected.slice(-DIAGNOSTIC_BUNDLE_RECORD_LIMIT), DIAGNOSTIC_BUNDLE_RECORD_LIMIT);
}

function projectAttention(attention: readonly SyncAttentionRecord[]): Projection<Record<string, unknown>> {
  const projected = attention.map(item => compact({
    firstSeenAtMs: finiteNumber(item.firstSeenAtMs),
    lastSeenAtMs: finiteNumber(item.lastSeenAtMs),
    runId: finiteNumber(item.runId),
    trigger: text(item.trigger),
    pathKey: diagnosticPathKey(String(item.path)),
    category: text(item.category),
    reasonCode: text(item.reasonCode),
    occurrenceCount: finiteNumber(item.occurrenceCount),
    current: item.current,
    resolvedAtMs: finiteNumber(item.resolvedAtMs),
  })).sort((a, b) => (Number(a.lastSeenAtMs ?? 0) - Number(b.lastSeenAtMs ?? 0))
    || String(a.pathKey ?? "").localeCompare(String(b.pathKey ?? ""))
    || String(a.reasonCode ?? "").localeCompare(String(b.reasonCode ?? "")));
  const recent = projected.slice(-DIAGNOSTIC_BUNDLE_RECORD_LIMIT);
  return { totalCount: projected.length, includedCount: recent.length, truncated: projected.length > recent.length, records: recent };
}

function uniqueStrings(events: readonly DiagnosticEvent[], key: "planId" | "operationId" | "intentId" | "effectId" | "requestId"): string[] {
  return Array.from(new Set(events.map(event => event.fields?.[key]).filter((value): value is string => typeof value === "string"))).sort();
}
function lastClassification(events: readonly DiagnosticEvent[]): Record<string, unknown> | undefined {
  const event = [...events].reverse().find(item => typeof item.fields?.classification === "string");
  return event ? { sequence: event.sequence, classification: event.fields!.classification } : undefined;
}
function lastError(events: readonly DiagnosticEvent[]): Record<string, unknown> | undefined {
  const event = [...events].reverse().find(item => item.level === "error");
  return event ? compact({
    sequence: event.sequence,
    component: event.component,
    event: event.event,
    classification: event.fields?.classification,
    result: event.fields?.result,
  }) : undefined;
}
function causalIndex(events: readonly DiagnosticEvent[], authority: Record<string, unknown>, audit: Projection<Record<string, unknown>>, attention: Projection<Record<string, unknown>>): Record<string, unknown> {
  const runIds = Array.from(new Set(events.map(event => event.runId).filter((value): value is number => typeof value === "number"))).sort((a, b) => a - b);
  const runs = runIds.map(runId => {
    const retained = events.filter(event => event.runId === runId);
    return compact({
      runId,
      firstSequence: retained[0]?.sequence,
      lastSequence: retained.at(-1)?.sequence,
      planIds: uniqueStrings(retained, "planId"),
      operationIds: uniqueStrings(retained, "operationId"),
      intentIds: uniqueStrings(retained, "intentId"),
      effectIds: uniqueStrings(retained, "effectId"),
      requestIds: uniqueStrings(retained, "requestId"),
      lastClassification: lastClassification(retained),
      lastError: lastError(retained),
    });
  });
  const operationIds = uniqueStrings(events, "operationId");
  const operations = operationIds.map(operationId => {
    const retained = events.filter(event => event.fields?.operationId === operationId);
    return compact({
      operationId,
      firstSequence: retained[0]?.sequence,
      lastSequence: retained.at(-1)?.sequence,
      intentIds: uniqueStrings(retained, "intentId"),
      effectIds: uniqueStrings(retained, "effectId"),
      requestIds: uniqueStrings(retained, "requestId"),
      lastClassification: lastClassification(retained),
      lastError: lastError(retained),
    });
  });
  const outstanding = record(authority.outstandingOperationIntents);
  const outstandingRecords = array(outstanding?.records).map(item => record(item) ?? {});
  return {
    runs,
    operations,
    outstandingIntentIds: outstandingRecords.map(item => text(item.intentId)).filter((value): value is string => Boolean(value)).sort(),
    lastKnownAuthority: compact({
      stateRevision: text(authority.stateRevision),
      persistenceRevision: text(authority.persistenceRevision),
      semanticGeneration: text(authority.semanticGeneration),
    }),
    counts: {
      traceEvents: events.length,
      traceErrors: events.filter(event => event.level === "error").length,
      auditRecords: audit.totalCount,
      attentionRecords: attention.totalCount,
      currentAttentionRecords: attention.records.filter(item => item.current === true).length,
    },
  };
}

export async function renderDiagnosticBundle(input: DiagnosticBundleInput): Promise<string> {
  await input.diagnostics.flush();
  const trace = [...input.diagnostics.snapshot()].sort((a, b) => a.sequence - b.sequence);
  const authority = projectAuthority(input.authorityLoad);
  const audit = projectAudit(input.audit);
  const attention = projectAttention(input.attention);
  const bundle = {
    bundleSchemaVersion: DIAGNOSTIC_BUNDLE_SCHEMA_VERSION,
    generatedAt: input.generatedAt.toISOString(),
    buildRuntime: {
      pluginId: sanitizeDiagnosticText(input.identity.pluginId) ?? "unknown-plugin",
      pluginVersion: sanitizeDiagnosticText(input.identity.pluginVersion) ?? "unknown-version",
      platform: input.identity.platform,
      runtime: input.identity.runtime,
    },
    configuration: projectConfiguration(input.settings),
    runtimeReadiness: { ...input.readiness },
    authorityState: authority,
    structuredTrace: trace,
    auditHistory: audit,
    synchronizationAttention: attention,
    causalIndex: causalIndex(trace, authority, audit, attention),
  };
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
