import type {
  AuthoritativeBaseTransition,
  BaseFingerprint,
  DeviceIdentity,
  DurableRemoteChangeBatch,
  LocalMutationTransaction,
  PersistenceRevision,
  RecoverableMutationEffect,
  RecoverableMutationEffectV1_1,
  RecoverableOperationIntent,
  RecoverableOperationIntentV1_1,
  RemoteIngestionBatchId,
  RestartRecoveryDirective,
  SemanticStateGeneration,
  SemanticStateValidationIssue,
  SemanticStateValidator,
  StateBackupReceipt,
  StateLoadContext,
  StateLoadResult,
  StateMigrationAssessment,
  StateRevision,
  StateSaveResult,
  SynchronizationAuthorityLoadResultV1_1,
  SynchronizationAuthorityMetadata,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthoritySaveResult,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore,
  TrustedSynchronizationState,
  VaultIdentity,
  VaultPath,
} from "../contracts";
import {
  appendDurableRemoteChangeBatch,
  contractId,
  exactBaseAuthorityMatches,
  folderCreateDescriptorIsSelfConsistent,
  recoverableOperationV1_1IsComplete,
  recoverableOperationV1_1RestartRecoveryDirectives,
} from "../contracts";

export interface StateByteStorage {
  read(): Promise<Uint8Array | undefined>;
  write(bytes: Uint8Array): Promise<void>;
  backup(bytes: Uint8Array): Promise<string>;
  compareAndSwap?(expected: Uint8Array | undefined, replacement: Uint8Array): Promise<boolean>;
}

export interface DurableBaseAuthorityEntry {
  readonly path: VaultPath;
  readonly fingerprint: BaseFingerprint;
}

export interface DurableRemoteBatchReduction {
  readonly batchId: RemoteIngestionBatchId;
  readonly complete: boolean;
  readonly durableFactRefs: readonly string[];
}

/** Historical Workstream C v1 authority schema retained only for explicit migration. */
export interface DurableSynchronizationAuthorityStateV1 extends TrustedSynchronizationState, SynchronizationAuthorityMetadata {
  readonly authoritySchemaVersion: 1;
  readonly baseAuthority: readonly DurableBaseAuthorityEntry[];
  readonly learnedRemoteReductions: readonly DurableRemoteBatchReduction[];
}

/** Authoritative phase6-sync-foundation-v1.1 persistence schema. */
export interface DurableSynchronizationAuthorityState extends TrustedSynchronizationState, SynchronizationAuthorityMetadataV1_1 {
  readonly authoritySchemaVersion: 2;
  readonly baseAuthority: readonly DurableBaseAuthorityEntry[];
  readonly learnedRemoteReductions: readonly DurableRemoteBatchReduction[];
}

type PersistedState = TrustedSynchronizationState | DurableSynchronizationAuthorityStateV1 | DurableSynchronizationAuthorityState;
interface PersistedEnvelope { readonly envelopeVersion: 1; readonly checksum: string; readonly state: PersistedState; }

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const stages: readonly RecoverableMutationEffectV1_1["stage"][] = ["intent-persisted", "dispatch-authorized", "outcome-unknown", "effect-verified", "state-committed"];

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}
function isString(value: unknown): value is string { return typeof value === "string" && value.length > 0; }
function isPathString(value: unknown): value is string { return typeof value === "string"; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function unique(values: readonly string[]): boolean { return new Set(values).size === values.length; }
function bytesEqual(a: Uint8Array | undefined, b: Uint8Array | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
function nextBrandedRevision<T extends "StateRevision" | "SemanticStateGeneration">(current: string, brand: T): StateRevision | SemanticStateGeneration {
  const match = /^(.*?)(\d+)$/.exec(current);
  const next = match ? `${match[1]}${Number(match[2]) + 1}` : `${current}:1`;
  return contractId<T>(next) as StateRevision | SemanticStateGeneration;
}
function nextPersistenceRevision(current: PersistenceRevision): PersistenceRevision { return nextBrandedRevision(String(current), "StateRevision") as PersistenceRevision; }
function nextSemanticGeneration(current: SemanticStateGeneration): SemanticStateGeneration { return nextBrandedRevision(String(current), "SemanticStateGeneration") as SemanticStateGeneration; }

function validateLegacyStateShape(state: unknown): state is TrustedSynchronizationState {
  if (!isRecord(state)) return false;
  if (!Number.isInteger(state.schemaVersion) || !isString(state.stateRevision) || !isString(state.vaultIdentity) || !isString(state.deviceIdentity)) return false;
  if (!Array.isArray(state.base) || !Array.isArray(state.remoteMappings) || !Array.isArray(state.tombstones) || !Array.isArray(state.operations) || !Array.isArray(state.knownDevices)) return false;
  const basePaths = state.base.map(entry => isRecord(entry) ? String(entry.path ?? "") : "");
  const mappingIds = state.remoteMappings.map(entry => isRecord(entry) ? String(entry.remoteObjectId ?? "") : "");
  const operationIds = state.operations.map(entry => isRecord(entry) ? String(entry.operationId ?? "") : "");
  const deviceIds = state.knownDevices.map(entry => isRecord(entry) ? String(entry.deviceId ?? "") : "");
  if (basePaths.some(path => path.length === 0) || mappingIds.some(id => id.length === 0) || operationIds.some(id => id.length === 0) || deviceIds.some(id => id.length === 0)) return false;
  return unique(basePaths) && unique(mappingIds) && unique(operationIds) && unique(deviceIds);
}

function hasAuthorityMarker(state: unknown): state is Record<string, unknown> & { authoritySchemaVersion: unknown } {
  return isRecord(state) && Object.prototype.hasOwnProperty.call(state, "authoritySchemaVersion");
}

function isStage(value: unknown): value is RecoverableMutationEffectV1_1["stage"] { return typeof value === "string" && stages.includes(value as RecoverableMutationEffectV1_1["stage"]); }

function isFolderDescriptorShape(descriptor: unknown): boolean {
  if (!isRecord(descriptor)) return false;
  if (descriptor.kind !== "local-folder-create" && descriptor.kind !== "remote-folder-create") return false;
  if (!isString(descriptor.intentId) || !isPathString(descriptor.targetPath) || descriptor.mutationKind !== "create") return false;
  if (!isRecord(descriptor.pathAuthority)) return false;
  const authority = descriptor.pathAuthority;
  if (!isString(authority.generation) || !isPathString(authority.targetPath) || !isPathString(authority.parentPath) || !isString(authority.pathComparisonKey) || authority.expectedTarget !== "absent") return false;
  if (descriptor.kind === "local-folder-create") return descriptor.targetSide === "local";
  if (descriptor.targetSide !== "remote" || !isString(descriptor.parentRemoteObjectId) || !isRecord(descriptor.remoteMutation)) return false;
  const mutation = descriptor.remoteMutation;
  return mutation.kind === "reserved-folder-create" && isString(mutation.intentId) && isString(mutation.reservedRemoteObjectId) && isPathString(mutation.path);
}

function isV1DescriptorShape(descriptor: unknown): boolean {
  if (!isRecord(descriptor) || !isString(descriptor.kind)) return false;
  return ["local-file", "remote-file", "move", "trash"].includes(descriptor.kind);
}

function isEffectV1_1Shape(effect: unknown): effect is RecoverableMutationEffectV1_1 {
  if (!isRecord(effect) || !isString(effect.effectId) || !isStage(effect.stage)) return false;
  if (!isRecord(effect.descriptor)) return false;
  return isFolderDescriptorShape(effect.descriptor) || isV1DescriptorShape(effect.descriptor);
}

function isIntentV1_1Shape(intent: unknown): intent is RecoverableOperationIntentV1_1 {
  if (!isRecord(intent) || !isString(intent.operationId) || !isString(intent.intentId) || !isRecord(intent.semanticAuthority) || !isString(intent.semanticAuthority.generation) || !Array.isArray(intent.effects)) return false;
  if (intent.logicalKind === "single-effect" && intent.effects.length !== 1) return false;
  if (intent.logicalKind === "clean-text-merge" && intent.effects.length < 2) return false;
  if (intent.logicalKind !== "single-effect" && intent.logicalKind !== "clean-text-merge") return false;
  return intent.effects.every(isEffectV1_1Shape);
}

function isAuthorityCommonShape(state: unknown): state is TrustedSynchronizationState & SynchronizationAuthorityMetadataV1_1 & { baseAuthority: readonly DurableBaseAuthorityEntry[]; learnedRemoteReductions: readonly DurableRemoteBatchReduction[] } {
  if (!validateLegacyStateShape(state) || !isRecord(state)) return false;
  return isString(state.persistenceRevision)
    && state.persistenceRevision === state.stateRevision
    && isString(state.semanticGeneration)
    && Array.isArray(state.learnedRemoteBatches)
    && Array.isArray(state.pathConvergence)
    && Array.isArray(state.operationIntents)
    && Array.isArray(state.localTransactions)
    && Array.isArray(state.baseAuthority)
    && Array.isArray(state.learnedRemoteReductions);
}

export function isDurableSynchronizationAuthorityStateV1(state: unknown): state is DurableSynchronizationAuthorityStateV1 {
  if (!isAuthorityCommonShape(state) || !isRecord(state) || state.authoritySchemaVersion !== 1) return false;
  return state.operationIntents.every(intent => {
    if (!isRecord(intent) || !Array.isArray(intent.effects)) return false;
    return intent.effects.every(effect => isRecord(effect) && isRecord(effect.descriptor) && !["local-folder-create", "remote-folder-create"].includes(String(effect.descriptor.kind)));
  });
}

export function isDurableSynchronizationAuthorityState(state: unknown): state is DurableSynchronizationAuthorityState {
  return isAuthorityCommonShape(state) && isRecord(state) && state.authoritySchemaVersion === 2 && state.operationIntents.every(isIntentV1_1Shape);
}

function parseEnvelope(bytes: Uint8Array): { status: "ok"; envelope: PersistedEnvelope } | { status: "malformed" | "truncated" | "integrity-check-failed" | "internally-inconsistent"; detail: string } {
  const raw = decoder.decode(bytes); let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch (error) {
    const trimmed = raw.trim();
    return { status: trimmed.startsWith("{") && !trimmed.endsWith("}") ? "truncated" : "malformed", detail: error instanceof Error ? error.message : "invalid JSON" };
  }
  if (!isRecord(parsed)) return { status: "malformed", detail: "state envelope must be an object" };
  const envelope = parsed as Partial<PersistedEnvelope>;
  if (envelope.envelopeVersion !== 1 || !isString(envelope.checksum) || !validateLegacyStateShape(envelope.state)) return { status: "internally-inconsistent", detail: "state envelope or required state fields are inconsistent" };
  const payload = JSON.stringify(envelope.state);
  if (checksum(payload) !== envelope.checksum) return { status: "integrity-check-failed", detail: "persisted state checksum does not match payload" };
  return { status: "ok", envelope: envelope as PersistedEnvelope };
}
function serialize(state: PersistedState): Uint8Array {
  const payload = JSON.stringify(state);
  return encoder.encode(JSON.stringify({ envelopeVersion: 1, checksum: checksum(payload), state } satisfies PersistedEnvelope));
}
function semanticProjection(state: DurableSynchronizationAuthorityState): string {
  return JSON.stringify({ vaultIdentity: state.vaultIdentity, deviceIdentity: state.deviceIdentity, base: state.base, baseAuthority: state.baseAuthority, remoteMappings: state.remoteMappings, tombstones: state.tombstones, changeCursor: state.changeCursor, learnedRemoteBatches: state.learnedRemoteBatches, learnedRemoteReductions: state.learnedRemoteReductions, pathConvergence: state.pathConvergence, knownDevices: state.knownDevices });
}
function sameSemanticAuthority(a: DurableSynchronizationAuthorityState, b: DurableSynchronizationAuthorityState): boolean { return semanticProjection(a) === semanticProjection(b); }
function issue(code: SemanticStateValidationIssue["code"], detail: string, path?: VaultPath, invariantCategory?: string): SemanticStateValidationIssue { return { code, detail, ...(path ? { path } : {}), ...(invariantCategory ? { invariantCategory } : {}) }; }

function folderJournalIssues(intent: RecoverableOperationIntentV1_1, effect: RecoverableMutationEffectV1_1): SemanticStateValidationIssue[] {
  const descriptor = effect.descriptor;
  if (descriptor.kind !== "local-folder-create" && descriptor.kind !== "remote-folder-create") return [];
  const issues: SemanticStateValidationIssue[] = [];
  if (!folderCreateDescriptorIsSelfConsistent(descriptor)) issues.push(issue("other-semantic-inconsistency", "folder-create descriptor is internally inconsistent", descriptor.targetPath, "folder-journal-descriptor"));
  if (descriptor.intentId !== intent.intentId) issues.push(issue("journal-reference-incomplete", "folder descriptor intent identity disagrees with operation intent", descriptor.targetPath, "folder-journal-intent"));
  if (descriptor.targetPath !== descriptor.pathAuthority.targetPath || descriptor.pathAuthority.generation !== intent.semanticAuthority.generation) issues.push(issue("other-semantic-inconsistency", "folder target/path authority disagrees with durable operation authority", descriptor.targetPath, "folder-path-authority"));
  if (descriptor.kind === "remote-folder-create") {
    if (descriptor.remoteMutation.intentId !== descriptor.intentId || descriptor.remoteMutation.path !== descriptor.targetPath) issues.push(issue("other-semantic-inconsistency", "reserved remote folder mutation identity disagrees with descriptor path/intent", descriptor.targetPath, "folder-remote-identity"));
    if (!isString(descriptor.parentRemoteObjectId) || !isString(descriptor.remoteMutation.reservedRemoteObjectId)) issues.push(issue("other-semantic-inconsistency", "remote folder-create durable identity is incomplete", descriptor.targetPath, "folder-remote-identity"));
  }
  return issues;
}

/** Fail-closed semantic validator for the authoritative v1.1 durable state. */
export class DurableSemanticStateValidator implements SemanticStateValidator<DurableSynchronizationAuthorityState> {
  constructor(private readonly extensionChecks: readonly ((state: DurableSynchronizationAuthorityState) => string | undefined)[] = []) {}
  validate(state: DurableSynchronizationAuthorityState): readonly SemanticStateValidationIssue[] {
    const issues: SemanticStateValidationIssue[] = [];
    const active = state.knownDevices.filter(device => device.deviceId === state.deviceIdentity);
    if (active.length !== 1) issues.push(issue("active-device-missing", "active installation must appear exactly once in known-device authority", undefined, "device-authority"));
    const basePaths = state.base.map(entry => String(entry.path));
    if (!unique(basePaths)) issues.push(issue("duplicate-base-path", "BASE contains duplicate logical paths", undefined, "base-uniqueness"));
    const mappingObjectIds = state.remoteMappings.map(mapping => String(mapping.remoteObjectId));
    const mappingPaths = state.remoteMappings.map(mapping => String(mapping.path));
    if (!unique(mappingObjectIds) || !unique(mappingPaths)) issues.push(issue("duplicate-remote-object-mapping", "remote mappings are not one-to-one", undefined, "remote-identity"));
    for (const mapping of state.remoteMappings) {
      const base = state.base.find(entry => entry.path === mapping.path);
      if (!base || !base.remoteExisted || (base.remoteObjectId && base.remoteObjectId !== mapping.remoteObjectId) || base.entityKind !== mapping.entityKind) issues.push(issue("mapping-base-disagreement", "remote mapping disagrees with durable BASE authority", mapping.path, "mapping-base-consistency"));
    }
    for (const tombstone of state.tombstones) if (state.base.some(base => base.path === tombstone.path)) issues.push(issue("base-tombstone-overlap", "a path cannot be both BASE-present and tombstoned", tombstone.path, "deletion-authority"));
    const baseAuthorityPaths = state.baseAuthority.map(entry => String(entry.path));
    if (!unique(baseAuthorityPaths)) issues.push(issue("other-semantic-inconsistency", "BASE fingerprint authority contains duplicate paths", undefined, "base-fingerprint-uniqueness"));
    for (const authority of state.baseAuthority) if (!state.base.some(base => base.path === authority.path)) issues.push(issue("other-semantic-inconsistency", "BASE fingerprint has no corresponding BASE entry", authority.path, "base-fingerprint-orphan"));

    const operationIds = state.operationIntents.map(intent => String(intent.operationId));
    if (!unique(operationIds)) issues.push(issue("journal-reference-incomplete", "recoverable operation journal contains duplicate operation IDs", undefined, "journal-identity"));
    for (const intent of state.operationIntents) {
      const effectIds = intent.effects.map(effect => effect.effectId);
      if (!unique(effectIds)) issues.push(issue("journal-reference-incomplete", "recoverable operation contains duplicate effect IDs", undefined, "journal-effects"));
      for (const effect of intent.effects) {
        if ((effect.stage === "effect-verified" || effect.stage === "state-committed") && !isString(effect.verificationEvidenceRef)) issues.push(issue("journal-reference-incomplete", "verified/committed effect lacks durable verification reference", undefined, "journal-verification"));
        issues.push(...folderJournalIssues(intent, effect));
      }
    }
    const batchIds = state.learnedRemoteBatches.map(batch => String(batch.checkpoint.batchId));
    if (!unique(batchIds)) issues.push(issue("ingestion-checkpoint-inconsistent", "learned remote backlog contains duplicate batch IDs", undefined, "remote-ingestion"));
    const reductionIds = state.learnedRemoteReductions.map(reduction => String(reduction.batchId));
    if (!unique(reductionIds)) issues.push(issue("ingestion-checkpoint-inconsistent", "remote-batch reductions contain duplicate batch IDs", undefined, "remote-ingestion"));
    for (const reduction of state.learnedRemoteReductions) {
      if (!state.learnedRemoteBatches.some(batch => batch.checkpoint.batchId === reduction.batchId) && !reduction.complete) issues.push(issue("ingestion-checkpoint-inconsistent", "incomplete reduction references a batch no longer retained", undefined, "remote-ingestion"));
      if (reduction.complete && reduction.durableFactRefs.some(ref => !isString(ref))) issues.push(issue("ingestion-checkpoint-inconsistent", "completed reduction contains an invalid durable fact reference", undefined, "remote-ingestion"));
    }
    if (state.persistenceRevision !== state.stateRevision) issues.push(issue("other-semantic-inconsistency", "persistenceRevision must equal the legacy stateRevision CAS sequence", undefined, "revision-domain"));
    for (const check of this.extensionChecks) { const detail = check(state); if (detail) issues.push(issue("other-semantic-inconsistency", detail, undefined, "extension-invariant")); }
    return issues;
  }
}

export class MemoryStateByteStorage implements StateByteStorage {
  bytes?: Uint8Array; readonly backups = new Map<string, Uint8Array>();
  async read() { return this.bytes ? this.bytes.slice() : undefined; }
  async write(bytes: Uint8Array) { this.bytes = bytes.slice(); }
  async compareAndSwap(expected: Uint8Array | undefined, replacement: Uint8Array) { if (!bytesEqual(this.bytes, expected)) return false; this.bytes = replacement.slice(); return true; }
  async backup(bytes: Uint8Array) { const id = `backup-${this.backups.size + 1}`; this.backups.set(id, bytes.slice()); return id; }
}

export type StateMigration = (state: TrustedSynchronizationState, targetSchemaVersion: number) => TrustedSynchronizationState;
export type AuthorityStateMigration = (state: TrustedSynchronizationState, targetSchemaVersion: number) => DurableSynchronizationAuthorityState;
export type RecoveryReplacementResult = { readonly status: "replaced"; readonly backup: StateBackupReceipt; readonly stateRevision: StateRevision } | { readonly status: "concurrent-change" | "not-recovery" | "recovery-required"; readonly reason: string; readonly backup?: StateBackupReceipt };
export type AuthorityV1MigrationResult = { readonly status: "migrated"; readonly backup: StateBackupReceipt; readonly persistenceRevision: PersistenceRevision; readonly semanticGeneration: SemanticStateGeneration } | { readonly status: "not-required" | "recovery-required"; readonly reason: string };

export class PersistentSynchronizationStateStore implements SynchronizationStateStore, SynchronizationAuthorityStoreV1_1<DurableSynchronizationAuthorityState> {
  private readonly semanticValidator: DurableSemanticStateValidator;
  constructor(private readonly storage: StateByteStorage, readonly currentSchemaVersion = 1, semanticValidator: DurableSemanticStateValidator = new DurableSemanticStateValidator()) { this.semanticValidator = semanticValidator; }

  async load(context: StateLoadContext): Promise<StateLoadResult> {
    const bytes = await this.storage.read();
    if (!bytes) return context.expectation === "new-installation" ? { status: "uninitialized" } : { status: "recovery-required", reason: "expected-state-missing" };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: parsed.status, detail: parsed.detail };
    const state = parsed.envelope.state;
    if (state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "incompatible-version", detail: `state schema ${state.schemaVersion}, runtime schema ${this.currentSchemaVersion}` };
    if (context.expectedVaultIdentity && state.vaultIdentity !== context.expectedVaultIdentity) return { status: "recovery-required", reason: "internally-inconsistent", detail: "vault identity does not match expected pairing" };
    if (context.expectedDeviceIdentity && state.deviceIdentity !== context.expectedDeviceIdentity) return { status: "recovery-required", reason: "clone-or-restore-suspected", detail: "persisted device identity does not match this installation" };
    if (hasAuthorityMarker(state)) {
      if (state.authoritySchemaVersion === 2) {
        if (!isDurableSynchronizationAuthorityState(state)) return { status: "recovery-required", reason: "internally-inconsistent", detail: "malformed v1.1 authority state" };
        const issues = this.semanticValidator.validate(state);
        if (issues.length) return { status: "recovery-required", reason: "internally-inconsistent", detail: issues.map(item => `${item.code}:${item.invariantCategory ?? "state"}`).join(",") };
      } else if (state.authoritySchemaVersion === 1 && !isDurableSynchronizationAuthorityStateV1(state)) return { status: "recovery-required", reason: "internally-inconsistent", detail: "malformed v1 authority state" };
      else if (state.authoritySchemaVersion !== 1) return { status: "recovery-required", reason: "incompatible-version", detail: "unsupported authority schema" };
    }
    return { status: "trusted", state };
  }

  async saveTrusted(state: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult> {
    if (!validateLegacyStateShape(state) || state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "refusing to persist internally inconsistent trusted state" };
    if (hasAuthorityMarker(state)) {
      if (state.authoritySchemaVersion === 2 && (!isDurableSynchronizationAuthorityState(state) || this.semanticValidator.validate(state).length > 0)) return { status: "recovery-required", reason: "refusing to persist semantically inconsistent v1.1 authority state" };
      if (state.authoritySchemaVersion === 1 && !isDurableSynchronizationAuthorityStateV1(state)) return { status: "recovery-required", reason: "refusing to persist malformed v1 authority state" };
      if (state.authoritySchemaVersion !== 1 && state.authoritySchemaVersion !== 2) return { status: "recovery-required", reason: "refusing unsupported authority schema" };
    }
    const currentBytes = await this.storage.read();
    if (currentBytes) {
      const current = parseEnvelope(currentBytes);
      if (current.status !== "ok") return { status: "recovery-required", reason: `existing state is ${current.status}` };
      if (expectedRevision && current.envelope.state.stateRevision !== expectedRevision) return { status: "stale-revision", actualRevision: current.envelope.state.stateRevision };
    } else if (expectedRevision) return { status: "stale-revision" };
    const replacement = serialize(state as PersistedState);
    if (this.storage.compareAndSwap) {
      if (!await this.storage.compareAndSwap(currentBytes, replacement)) {
        const actual = await this.storage.read(); if (!actual) return { status: "stale-revision" };
        const parsed = parseEnvelope(actual); if (parsed.status !== "ok") return { status: "recovery-required", reason: `concurrently written state is ${parsed.status}` };
        return { status: "stale-revision", actualRevision: parsed.envelope.state.stateRevision };
      }
    } else await this.storage.write(replacement);
    return { status: "saved", stateRevision: state.stateRevision };
  }

  async loadAuthority(): Promise<SynchronizationAuthorityLoadResultV1_1<DurableSynchronizationAuthorityState>> {
    const bytes = await this.storage.read(); if (!bytes) return { status: "uninitialized" };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", `persisted state is ${parsed.status}`, undefined, "envelope-integrity")] };
    const state = parsed.envelope.state;
    if (state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "authority product-state schema is incompatible with this runtime", undefined, "schema-version")] };
    if (isDurableSynchronizationAuthorityStateV1(state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "v1 authority requires explicit backup/CAS migration to v1.1", undefined, "authority-v1-migration")] };
    if (!isDurableSynchronizationAuthorityState(state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", hasAuthorityMarker(state) ? "malformed v1.1 authority cannot be interpreted safely" : "legacy state lacks v1.1 semantic-authority metadata and must be migrated/reconstructed", undefined, hasAuthorityMarker(state) ? "authority-v1.1-malformed" : "legacy-migration")] };
    const issues = this.semanticValidator.validate(state);
    return issues.length ? { status: "recovery-required", issues } : { status: "trusted", state };
  }

  async saveAuthority(state: DurableSynchronizationAuthorityState, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration?: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "atomic compare-and-swap storage is required for authority writes", undefined, "persistence-cas")] };
    const currentBytes = await this.storage.read(); if (!currentBytes) return { status: "stale-persistence" };
    const parsed = parseEnvelope(currentBytes);
    if (parsed.status !== "ok" || !isDurableSynchronizationAuthorityState(parsed.envelope.state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "current state is not trusted v1.1 semantic authority", undefined, "authority-load")] };
    const current = parsed.envelope.state;
    const currentIssues = this.semanticValidator.validate(current); if (currentIssues.length) return { status: "recovery-required", issues: currentIssues };
    if (current.persistenceRevision !== expectedPersistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: current.persistenceRevision };
    if (expectedSemanticGeneration && current.semanticGeneration !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: current.semanticGeneration };
    if (state.authoritySchemaVersion !== 2 || state.vaultIdentity !== current.vaultIdentity || state.deviceIdentity !== current.deviceIdentity) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "authority save cannot change schema/vault/device identity", undefined, "identity-authority")] };
    const semanticChanged = !sameSemanticAuthority(current, state);
    const persistenceRevision = nextPersistenceRevision(current.persistenceRevision);
    const semanticGeneration = semanticChanged ? nextSemanticGeneration(current.semanticGeneration) : current.semanticGeneration;
    const replacement: DurableSynchronizationAuthorityState = { ...state, stateRevision: persistenceRevision, persistenceRevision, semanticGeneration };
    const replacementIssues = this.semanticValidator.validate(replacement); if (replacementIssues.length) return { status: "recovery-required", issues: replacementIssues };
    if (!await this.storage.compareAndSwap(currentBytes, serialize(replacement))) {
      const actual = await this.readCurrentAuthorityBestEffort();
      return actual ? { status: "stale-persistence", actualPersistenceRevision: actual.persistenceRevision } : { status: "stale-persistence" };
    }
    return { status: "saved", persistenceRevision, semanticGeneration };
  }

  async commitBaseTransition(transition: AuthoritativeBaseTransition, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status === "uninitialized") return { status: "stale-persistence" };
    if (loaded.status === "recovery-required") return { status: "recovery-required", issues: loaded.issues };
    const state = loaded.state;
    if (state.persistenceRevision !== expectedPersistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: state.persistenceRevision };
    if (state.semanticGeneration !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
    let next: DurableSynchronizationAuthorityState;
    if (transition.kind === "verified-deletion") {
      const currentAuthority = state.baseAuthority.find(entry => entry.path === transition.authority.path);
      if (!currentAuthority || !exactBaseAuthorityMatches(transition.authority, { generation: state.semanticGeneration, path: currentAuthority.path, fingerprint: currentAuthority.fingerprint })) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
      const prior = state.base.find(entry => entry.path === transition.authority.path);
      if (!prior) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "verified deletion references missing BASE entry", transition.authority.path, "deletion-authority")] };
      next = { ...state, base: state.base.filter(entry => entry.path !== transition.authority.path), baseAuthority: state.baseAuthority.filter(entry => entry.path !== transition.authority.path), remoteMappings: state.remoteMappings.filter(mapping => mapping.path !== transition.authority.path), tombstones: [...state.tombstones.filter(entry => entry.path !== transition.authority.path), { path: transition.authority.path, entityKind: prior.entityKind, deletedOn: "both", remoteObjectId: prior.remoteObjectId, sourceDeviceId: state.deviceIdentity }] };
    } else {
      const proof = transition.proof;
      if (proof.generation !== state.semanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
      if (proof.kind === "file-common") {
        if (proof.canonicalContent.algorithm !== "sha256" || !isString(proof.canonicalContent.hash) || !Number.isSafeInteger(proof.canonicalContent.sizeBytes) || proof.canonicalContent.sizeBytes < 0) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "file BASE healing lacks exact canonical SHA-256 authority", proof.path, "common-file-proof")] };
        next = { ...state, base: [...state.base.filter(entry => entry.path !== proof.path), { path: proof.path, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: proof.canonicalContent.hash, sizeBytes: proof.canonicalContent.sizeBytes, revision: String(proof.remoteRevision) }, remoteObjectId: proof.remoteObjectId }], baseAuthority: [...state.baseAuthority.filter(entry => entry.path !== proof.path), { path: proof.path, fingerprint: transition.nextFingerprint }], remoteMappings: [...state.remoteMappings.filter(mapping => mapping.path !== proof.path && mapping.remoteObjectId !== proof.remoteObjectId), { path: proof.path, remoteObjectId: proof.remoteObjectId, entityKind: "file" }], tombstones: state.tombstones.filter(entry => entry.path !== proof.path), pathConvergence: [...state.pathConvergence.filter(entry => entry.path !== proof.path), { path: proof.path, state: { status: "converged", generation: nextSemanticGeneration(state.semanticGeneration), baseFingerprint: transition.nextFingerprint } }] };
      } else if (proof.kind === "folder-common") {
        next = { ...state, base: [...state.base.filter(entry => entry.path !== proof.path), { path: proof.path, entityKind: "folder", localExisted: true, remoteExisted: true, remoteObjectId: proof.remoteObjectId }], baseAuthority: [...state.baseAuthority.filter(entry => entry.path !== proof.path), { path: proof.path, fingerprint: transition.nextFingerprint }], remoteMappings: [...state.remoteMappings.filter(mapping => mapping.path !== proof.path && mapping.remoteObjectId !== proof.remoteObjectId), { path: proof.path, remoteObjectId: proof.remoteObjectId, entityKind: "folder" }], tombstones: state.tombstones.filter(entry => entry.path !== proof.path), pathConvergence: [...state.pathConvergence.filter(entry => entry.path !== proof.path), { path: proof.path, state: { status: "converged", generation: nextSemanticGeneration(state.semanticGeneration), baseFingerprint: transition.nextFingerprint } }] };
      } else {
        const prior = state.base.find(entry => entry.path === proof.path);
        next = { ...state, base: state.base.filter(entry => entry.path !== proof.path), baseAuthority: state.baseAuthority.filter(entry => entry.path !== proof.path), remoteMappings: state.remoteMappings.filter(mapping => mapping.path !== proof.path), tombstones: prior ? [...state.tombstones.filter(entry => entry.path !== proof.path), { path: proof.path, entityKind: proof.entityKind, deletedOn: "both", remoteObjectId: prior.remoteObjectId, sourceDeviceId: state.deviceIdentity }] : state.tombstones, pathConvergence: state.pathConvergence.filter(entry => entry.path !== proof.path) };
      }
    }
    return this.saveAuthority(next, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async appendLearnedRemoteBatch(batch: DurableRemoteChangeBatch, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    return this.saveAuthority({ ...loaded.state, learnedRemoteBatches: appendDurableRemoteChangeBatch(loaded.state.learnedRemoteBatches, batch), changeCursor: batch.checkpoint.terminalStartToken }, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async recordRemoteBatchReduction(batchId: RemoteIngestionBatchId, durableFactRefs: readonly string[], complete: boolean, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (!loaded.state.learnedRemoteBatches.some(batch => batch.checkpoint.batchId === batchId)) return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "cannot reduce a remote batch that is not durably learned", undefined, "remote-ingestion")] };
    return this.saveAuthority({ ...loaded.state, learnedRemoteReductions: [...loaded.state.learnedRemoteReductions.filter(entry => entry.batchId !== batchId), { batchId, durableFactRefs: [...durableFactRefs], complete }] }, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async retireLearnedRemoteBatch(batchId: RemoteIngestionBatchId, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const batch = loaded.state.learnedRemoteBatches.find(item => item.checkpoint.batchId === batchId); if (!batch) return this.saveAuthority(loaded.state, expectedPersistenceRevision, expectedSemanticGeneration);
    const reduction = loaded.state.learnedRemoteReductions.find(item => item.batchId === batchId);
    if (!reduction?.complete || (batch.changes.length > 0 && reduction.durableFactRefs.length === 0)) return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "remote batch cannot retire until every needed fact is durably reduced", undefined, "remote-ingestion-retirement")] };
    return this.saveAuthority({ ...loaded.state, learnedRemoteBatches: loaded.state.learnedRemoteBatches.filter(item => item.checkpoint.batchId !== batchId), learnedRemoteReductions: loaded.state.learnedRemoteReductions.filter(item => item.batchId !== batchId) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async persistOperationIntent(intent: RecoverableOperationIntentV1_1, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (intent.semanticAuthority.generation !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    if (loaded.state.operationIntents.some(existing => existing.operationId === intent.operationId)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation intent already exists", undefined, "journal-identity")] };
    const candidate = { ...loaded.state, operationIntents: [...loaded.state.operationIntents, intent] };
    const candidateIssues = this.semanticValidator.validate(candidate); if (candidateIssues.length) return { status: "recovery-required", issues: candidateIssues };
    return this.saveAuthority(candidate, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  private replaceEffect(intent: RecoverableOperationIntentV1_1, effectId: string, replacement: RecoverableMutationEffectV1_1): RecoverableOperationIntentV1_1 {
    if (intent.logicalKind === "single-effect") return { ...intent, effects: [replacement] };
    const mapped = intent.effects.map(effect => effect.effectId === effectId ? replacement : effect);
    const first = mapped[0]; const second = mapped[1];
    if (!first || !second) throw new Error("clean-text-merge lost required durable effects");
    return { ...intent, effects: [first, second, ...mapped.slice(2)] };
  }

  async advanceOperationEffect(operationId: RecoverableOperationIntentV1_1["operationId"], effectId: string, stage: RecoverableMutationEffectV1_1["stage"], verificationEvidenceRef: string | undefined, expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const intent = loaded.state.operationIntents.find(item => item.operationId === operationId); if (!intent) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect cannot advance without durable intent", undefined, "journal-reference")] };
    const currentEffect = intent.effects.find(effect => effect.effectId === effectId); if (!currentEffect) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect ID is not durable", undefined, "journal-reference")] };
    const from = stages.indexOf(currentEffect.stage); const to = stages.indexOf(stage);
    const legalDirectVerification = currentEffect.stage === "dispatch-authorized" && stage === "effect-verified";
    const legalUnknownRecovery = currentEffect.stage === "outcome-unknown" && stage === "effect-verified";
    if (to < from || (to > from + 1 && !legalDirectVerification && !legalUnknownRecovery)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", `illegal effect-stage transition ${currentEffect.stage}->${stage}`, undefined, "journal-stage-order")] };
    const proof = verificationEvidenceRef ?? currentEffect.verificationEvidenceRef;
    if ((stage === "effect-verified" || stage === "state-committed") && !isString(proof)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "verified/committed effect transition requires durable verification evidence", undefined, "journal-verification")] };
    const replacement: RecoverableMutationEffectV1_1 = { ...currentEffect, stage, ...(proof ? { verificationEvidenceRef: proof } : {}) };
    const updatedIntent = this.replaceEffect(intent, effectId, replacement);
    return this.saveAuthority({ ...loaded.state, operationIntents: loaded.state.operationIntents.map(item => item.operationId === operationId ? updatedIntent : item) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async garbageCollectCompletedOperation(operationId: RecoverableOperationIntentV1_1["operationId"], expectedPersistenceRevision: PersistenceRevision, expectedSemanticGeneration: SemanticStateGeneration): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const intent = loaded.state.operationIntents.find(item => item.operationId === operationId);
    if (!intent || !recoverableOperationV1_1IsComplete(intent)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation journal can be collected only after every effect is state-committed", undefined, "journal-gc")] };
    return this.saveAuthority({ ...loaded.state, operationIntents: loaded.state.operationIntents.filter(item => item.operationId !== operationId) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async restartRecoveryDirectives(): Promise<readonly { operationId: RecoverableOperationIntentV1_1["operationId"]; effectId: string; directive: RestartRecoveryDirective }[]> {
    const loaded = await this.loadAuthority(); if (loaded.status !== "trusted") return [];
    return loaded.state.operationIntents.flatMap(intent => recoverableOperationV1_1RestartRecoveryDirectives(intent).map(entry => ({ operationId: intent.operationId, ...entry })));
  }

  async createRecoveryBackup(): Promise<StateBackupReceipt> {
    const bytes = await this.storage.read(); const backupId = await this.storage.backup(bytes ?? new Uint8Array()); let sourceRevision: StateRevision | undefined;
    if (bytes) { const parsed = parseEnvelope(bytes); if (parsed.status === "ok") sourceRevision = parsed.envelope.state.stateRevision; }
    return { backupId, ...(sourceRevision ? { sourceRevision } : {}) };
  }

  async replaceRecoveryState(state: TrustedSynchronizationState, context: StateLoadContext): Promise<RecoveryReplacementResult> {
    if (!validateLegacyStateShape(state) || state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "recovery candidate is not valid trusted state" };
    if (hasAuthorityMarker(state) && state.authoritySchemaVersion === 2 && (!isDurableSynchronizationAuthorityState(state) || this.semanticValidator.validate(state).length > 0)) return { status: "recovery-required", reason: "recovery candidate has v1.1 semantic contradictions" };
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "atomic compare-and-swap storage is required for recovery replacement" };
    const source = await this.storage.read(); const loaded = await this.load(context); if (loaded.status !== "recovery-required") return { status: "not-recovery", reason: "current persisted state is not in a recovery condition" };
    const backupId = await this.storage.backup(source ?? new Uint8Array()); let sourceRevision: StateRevision | undefined;
    if (source) { const parsed = parseEnvelope(source); if (parsed.status === "ok") sourceRevision = parsed.envelope.state.stateRevision; }
    const backup: StateBackupReceipt = { backupId, ...(sourceRevision ? { sourceRevision } : {}) };
    if (!await this.storage.compareAndSwap(source, serialize(state as PersistedState))) return { status: "concurrent-change", reason: "state changed after recovery backup; replacement refused", backup };
    return { status: "replaced", backup, stateRevision: state.stateRevision };
  }

  async assessMigration(targetSchemaVersion: number): Promise<StateMigrationAssessment> {
    const bytes = await this.storage.read(); if (!bytes) return { status: "compatible", toVersion: targetSchemaVersion };
    const parsed = parseEnvelope(bytes); if (parsed.status !== "ok") return { status: "incompatible", toVersion: targetSchemaVersion };
    const fromVersion = parsed.envelope.state.schemaVersion;
    if (fromVersion === targetSchemaVersion) return { status: "compatible", fromVersion, toVersion: targetSchemaVersion };
    if (fromVersion < targetSchemaVersion) return { status: "migration-required", fromVersion, toVersion: targetSchemaVersion };
    return { status: "incompatible", fromVersion, toVersion: targetSchemaVersion };
  }

  async migrate(targetSchemaVersion: number, migration: StateMigration): Promise<{ status: "migrated"; backup: StateBackupReceipt } | { status: "incompatible" | "recovery-required"; reason: string }> {
    const assessment = await this.assessMigration(targetSchemaVersion);
    if (assessment.status === "incompatible") return { status: "incompatible", reason: "state cannot be safely migrated to the requested schema" };
    if (assessment.status === "compatible") return { status: "incompatible", reason: "migration is not required" };
    const loadedBytes = await this.storage.read(); if (!loadedBytes) return { status: "recovery-required", reason: "state disappeared before migration" };
    const parsed = parseEnvelope(loadedBytes); if (parsed.status !== "ok") return { status: "recovery-required", reason: `state became ${parsed.status}` };
    const backup = await this.createRecoveryBackup(); const migrated = migration(parsed.envelope.state, targetSchemaVersion);
    if (!validateLegacyStateShape(migrated) || migrated.schemaVersion !== targetSchemaVersion) return { status: "recovery-required", reason: "migration produced invalid target state" };
    const replacement = serialize(migrated as PersistedState);
    if (this.storage.compareAndSwap) { if (!await this.storage.compareAndSwap(loadedBytes, replacement)) return { status: "recovery-required", reason: "state changed concurrently during migration; migration was not committed" }; }
    else await this.storage.write(replacement);
    return { status: "migrated", backup };
  }

  async migrateToAuthority(targetSchemaVersion: number, rebuild: AuthorityStateMigration): Promise<{ status: "migrated"; backup: StateBackupReceipt } | { status: "recovery-required"; reason: string }> {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "authority migration requires atomic compare-and-swap storage" };
    const source = await this.storage.read(); if (!source) return { status: "recovery-required", reason: "state disappeared before authority migration" };
    const parsed = parseEnvelope(source); if (parsed.status !== "ok") return { status: "recovery-required", reason: `state is ${parsed.status}` };
    const backupId = await this.storage.backup(source); const backup: StateBackupReceipt = { backupId, sourceRevision: parsed.envelope.state.stateRevision };
    const candidate = rebuild(parsed.envelope.state, targetSchemaVersion);
    if (!isDurableSynchronizationAuthorityState(candidate) || candidate.schemaVersion !== targetSchemaVersion) return { status: "recovery-required", reason: "authority migration did not reconstruct the required v1.1 durable authority schema" };
    const issues = this.semanticValidator.validate(candidate); if (issues.length) return { status: "recovery-required", reason: `authority migration remains semantically inconsistent: ${issues.map(item => item.code).join(",")}` };
    if (!await this.storage.compareAndSwap(source, serialize(candidate))) return { status: "recovery-required", reason: "state changed concurrently after migration backup; migration was not committed" };
    return { status: "migrated", backup };
  }

  /** Explicit backup-first, CAS-bound upgrade of the historical Workstream C v1 authority document. */
  async migrateAuthorityV1ToV1_1(): Promise<AuthorityV1MigrationResult> {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "v1 authority migration requires atomic compare-and-swap storage" };
    const sourceBytes = await this.storage.read(); if (!sourceBytes) return { status: "recovery-required", reason: "authority state is missing" };
    const parsed = parseEnvelope(sourceBytes); if (parsed.status !== "ok") return { status: "recovery-required", reason: `authority state is ${parsed.status}` };
    if (isDurableSynchronizationAuthorityState(parsed.envelope.state)) return { status: "not-required", reason: "authority is already v1.1" };
    if (!isDurableSynchronizationAuthorityStateV1(parsed.envelope.state)) return { status: "recovery-required", reason: "persisted state is not a valid v1 authority document" };
    const source = parsed.envelope.state;
    const backupId = await this.storage.backup(sourceBytes); const backup: StateBackupReceipt = { backupId, sourceRevision: source.stateRevision };
    const persistenceRevision = nextPersistenceRevision(source.persistenceRevision);
    const candidate: DurableSynchronizationAuthorityState = {
      ...source,
      authoritySchemaVersion: 2,
      stateRevision: persistenceRevision,
      persistenceRevision,
      semanticGeneration: source.semanticGeneration,
      operationIntents: source.operationIntents,
    };
    const issues = this.semanticValidator.validate(candidate); if (issues.length) return { status: "recovery-required", reason: `v1 authority cannot migrate safely: ${issues.map(item => item.code).join(",")}` };
    if (!await this.storage.compareAndSwap(sourceBytes, serialize(candidate))) return { status: "recovery-required", reason: "authority changed concurrently after migration backup; migration was not committed" };
    return { status: "migrated", backup, persistenceRevision, semanticGeneration: candidate.semanticGeneration };
  }

  async exportDiagnosticState(): Promise<Uint8Array> {
    const bytes = await this.storage.read(); if (!bytes) return encoder.encode(JSON.stringify({ status: "uninitialized" }));
    const parsed = parseEnvelope(bytes); if (parsed.status !== "ok") return encoder.encode(JSON.stringify({ status: "recovery-required", reason: parsed.status }));
    const state = parsed.envelope.state;
    const authority = isDurableSynchronizationAuthorityState(state) ? { authoritySchemaVersion: state.authoritySchemaVersion, persistenceRevision: state.persistenceRevision, semanticGeneration: state.semanticGeneration, learnedRemoteBatchCount: state.learnedRemoteBatches.length, pendingAuthorityOperationCount: state.operationIntents.filter(intent => !recoverableOperationV1_1IsComplete(intent)).length, localTransactionCount: state.localTransactions.length } : isDurableSynchronizationAuthorityStateV1(state) ? { authoritySchemaVersion: 1, authorityV1MigrationRequired: true, pendingAuthorityOperationCount: state.operationIntents.length } : { authorityMigrationRequired: true };
    return encoder.encode(JSON.stringify({ schemaVersion: state.schemaVersion, stateRevision: state.stateRevision, vaultIdentity: state.vaultIdentity, deviceIdentity: state.deviceIdentity, base: state.base.map(entry => ({ path: entry.path, entityKind: entry.entityKind, localExisted: entry.localExisted, remoteExisted: entry.remoteExisted, contentEvidence: entry.content, remoteObjectId: entry.remoteObjectId })), remoteMappings: state.remoteMappings, tombstones: state.tombstones, changeCursor: state.changeCursor, operations: state.operations, knownDevices: state.knownDevices, ...authority }));
  }

  private async readCurrentAuthorityBestEffort(): Promise<DurableSynchronizationAuthorityState | undefined> {
    const bytes = await this.storage.read(); if (!bytes) return undefined;
    const parsed = parseEnvelope(bytes); return parsed.status === "ok" && isDurableSynchronizationAuthorityState(parsed.envelope.state) ? parsed.envelope.state : undefined;
  }
}

export function createInitialTrustedState(values: { stateRevision: StateRevision; vaultIdentity: VaultIdentity; deviceIdentity: DeviceIdentity; schemaVersion?: number }): TrustedSynchronizationState {
  return { schemaVersion: values.schemaVersion ?? 1, stateRevision: values.stateRevision, vaultIdentity: values.vaultIdentity, deviceIdentity: values.deviceIdentity, base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [{ deviceId: values.deviceIdentity, stale: false }] };
}

export function createInitialAuthorityState(values: { persistenceRevision: PersistenceRevision; semanticGeneration: SemanticStateGeneration; vaultIdentity: VaultIdentity; deviceIdentity: DeviceIdentity; schemaVersion?: number }): DurableSynchronizationAuthorityState {
  return { ...createInitialTrustedState({ stateRevision: values.persistenceRevision, vaultIdentity: values.vaultIdentity, deviceIdentity: values.deviceIdentity, schemaVersion: values.schemaVersion }), authoritySchemaVersion: 2, persistenceRevision: values.persistenceRevision, semanticGeneration: values.semanticGeneration, learnedRemoteBatches: [], learnedRemoteReductions: [], pathConvergence: [], operationIntents: [], localTransactions: [] as readonly LocalMutationTransaction[], baseAuthority: [] };
}

/** Test/migration fixture helper representing the exact historical v1 durable authority shape. */
export function createInitialAuthorityStateV1(values: { persistenceRevision: PersistenceRevision; semanticGeneration: SemanticStateGeneration; vaultIdentity: VaultIdentity; deviceIdentity: DeviceIdentity; schemaVersion?: number }): DurableSynchronizationAuthorityStateV1 {
  return { ...createInitialTrustedState({ stateRevision: values.persistenceRevision, vaultIdentity: values.vaultIdentity, deviceIdentity: values.deviceIdentity, schemaVersion: values.schemaVersion }), authoritySchemaVersion: 1, persistenceRevision: values.persistenceRevision, semanticGeneration: values.semanticGeneration, learnedRemoteBatches: [], learnedRemoteReductions: [], pathConvergence: [], operationIntents: [] as readonly RecoverableOperationIntent[], localTransactions: [] as readonly LocalMutationTransaction[], baseAuthority: [] };
}
