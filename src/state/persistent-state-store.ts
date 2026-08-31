import type {
  AuthoritativeBaseTransition,
  BaseFingerprint,
  DeviceIdentity,
  DurableRemoteChangeBatch,
  LocalMutationTransaction,
  PersistenceRevision,
  RecoverableMutationEffect,
  RecoverableOperationIntent,
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
  SynchronizationAuthorityLoadResult,
  SynchronizationAuthorityMetadata,
  SynchronizationAuthoritySaveResult,
  SynchronizationAuthorityStore,
  SynchronizationStateStore,
  TrustedSynchronizationState,
  VaultIdentity,
  VaultPath,
} from "../contracts";
import {
  appendDurableRemoteChangeBatch,
  contractId,
  exactBaseAuthorityMatches,
  recoverableOperationIsComplete,
  restartRecoveryDirective,
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

/**
 * Concrete local persistence schema for the frozen synchronization-authority contracts.
 * Legacy fields are retained because the pre-foundation product still consumes them.
 * persistenceRevision/stateRevision sequence byte-document writes; semanticGeneration is
 * independently advanced only when synchronization authority itself changes.
 */
export interface DurableSynchronizationAuthorityState extends TrustedSynchronizationState, SynchronizationAuthorityMetadata {
  readonly authoritySchemaVersion: 1;
  readonly baseAuthority: readonly DurableBaseAuthorityEntry[];
  readonly learnedRemoteReductions: readonly DurableRemoteBatchReduction[];
}

interface PersistedEnvelope {
  readonly envelopeVersion: 1;
  readonly checksum: string;
  readonly state: TrustedSynchronizationState | DurableSynchronizationAuthorityState;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

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

function nextPersistenceRevision(current: PersistenceRevision): PersistenceRevision {
  return nextBrandedRevision(String(current), "StateRevision") as PersistenceRevision;
}

function nextSemanticGeneration(current: SemanticStateGeneration): SemanticStateGeneration {
  return nextBrandedRevision(String(current), "SemanticStateGeneration") as SemanticStateGeneration;
}

function validateLegacyStateShape(state: unknown): state is TrustedSynchronizationState {
  if (!state || typeof state !== "object") return false;
  const s = state as Record<string, unknown>;
  if (!Number.isInteger(s.schemaVersion) || !isString(s.stateRevision) || !isString(s.vaultIdentity) || !isString(s.deviceIdentity)) return false;
  if (!Array.isArray(s.base) || !Array.isArray(s.remoteMappings) || !Array.isArray(s.tombstones) || !Array.isArray(s.operations) || !Array.isArray(s.knownDevices)) return false;
  const basePaths = s.base.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).path ?? "") : "");
  const mappingIds = s.remoteMappings.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).remoteObjectId ?? "") : "");
  const operationIds = s.operations.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).operationId ?? "") : "");
  const deviceIds = s.knownDevices.map(entry => typeof entry === "object" && entry !== null ? String((entry as Record<string, unknown>).deviceId ?? "") : "");
  if (basePaths.some(path => path.length === 0) || mappingIds.some(id => id.length === 0) || operationIds.some(id => id.length === 0) || deviceIds.some(id => id.length === 0)) return false;
  return unique(basePaths) && unique(mappingIds) && unique(operationIds) && unique(deviceIds);
}

export function isDurableSynchronizationAuthorityState(state: unknown): state is DurableSynchronizationAuthorityState {
  if (!validateLegacyStateShape(state)) return false;
  const s = state as unknown as Record<string, unknown>;
  return s.authoritySchemaVersion === 1
    && isString(s.persistenceRevision)
    && s.persistenceRevision === s.stateRevision
    && isString(s.semanticGeneration)
    && Array.isArray(s.learnedRemoteBatches)
    && Array.isArray(s.pathConvergence)
    && Array.isArray(s.operationIntents)
    && Array.isArray(s.localTransactions)
    && Array.isArray(s.baseAuthority)
    && Array.isArray(s.learnedRemoteReductions);
}

function parseEnvelope(bytes: Uint8Array):
  | { status: "ok"; envelope: PersistedEnvelope }
  | { status: "malformed" | "truncated" | "integrity-check-failed" | "internally-inconsistent"; detail: string } {
  const raw = decoder.decode(bytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const trimmed = raw.trim();
    return {
      status: trimmed.startsWith("{") && !trimmed.endsWith("}") ? "truncated" : "malformed",
      detail: error instanceof Error ? error.message : "invalid JSON",
    };
  }
  if (!parsed || typeof parsed !== "object") return { status: "malformed", detail: "state envelope must be an object" };
  const envelope = parsed as Partial<PersistedEnvelope>;
  if (envelope.envelopeVersion !== 1 || !isString(envelope.checksum) || !validateLegacyStateShape(envelope.state)) {
    return { status: "internally-inconsistent", detail: "state envelope or required state fields are inconsistent" };
  }
  const payload = JSON.stringify(envelope.state);
  if (checksum(payload) !== envelope.checksum) return { status: "integrity-check-failed", detail: "persisted state checksum does not match payload" };
  return { status: "ok", envelope: envelope as PersistedEnvelope };
}

function serialize(state: TrustedSynchronizationState | DurableSynchronizationAuthorityState): Uint8Array {
  const payload = JSON.stringify(state);
  return encoder.encode(JSON.stringify({ envelopeVersion: 1, checksum: checksum(payload), state } satisfies PersistedEnvelope));
}

function semanticProjection(state: DurableSynchronizationAuthorityState): string {
  return JSON.stringify({
    vaultIdentity: state.vaultIdentity,
    deviceIdentity: state.deviceIdentity,
    base: state.base,
    baseAuthority: state.baseAuthority,
    remoteMappings: state.remoteMappings,
    tombstones: state.tombstones,
    changeCursor: state.changeCursor,
    learnedRemoteBatches: state.learnedRemoteBatches,
    learnedRemoteReductions: state.learnedRemoteReductions,
    pathConvergence: state.pathConvergence,
    knownDevices: state.knownDevices,
  });
}

function sameSemanticAuthority(a: DurableSynchronizationAuthorityState, b: DurableSynchronizationAuthorityState): boolean {
  return semanticProjection(a) === semanticProjection(b);
}

function issue(code: SemanticStateValidationIssue["code"], detail: string, path?: VaultPath, invariantCategory?: string): SemanticStateValidationIssue {
  return { code, detail, ...(path ? { path } : {}), ...(invariantCategory ? { invariantCategory } : {}) };
}

/** Fail-closed validator for both known contradictions and future/extension contradictions. */
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
      if (!base || !base.remoteExisted || (base.remoteObjectId && base.remoteObjectId !== mapping.remoteObjectId) || base.entityKind !== mapping.entityKind) {
        issues.push(issue("mapping-base-disagreement", "remote mapping disagrees with durable BASE authority", mapping.path, "mapping-base-consistency"));
      }
    }

    for (const tombstone of state.tombstones) {
      if (state.base.some(base => base.path === tombstone.path)) issues.push(issue("base-tombstone-overlap", "a path cannot be both BASE-present and tombstoned", tombstone.path, "deletion-authority"));
    }

    const baseAuthorityPaths = state.baseAuthority.map(entry => String(entry.path));
    if (!unique(baseAuthorityPaths)) issues.push(issue("other-semantic-inconsistency", "BASE fingerprint authority contains duplicate paths", undefined, "base-fingerprint-uniqueness"));
    for (const authority of state.baseAuthority) {
      if (!state.base.some(base => base.path === authority.path)) issues.push(issue("other-semantic-inconsistency", "BASE fingerprint has no corresponding BASE entry", authority.path, "base-fingerprint-orphan"));
    }

    const operationIds = state.operationIntents.map(intent => String(intent.operationId));
    if (!unique(operationIds)) issues.push(issue("journal-reference-incomplete", "recoverable operation journal contains duplicate operation IDs", undefined, "journal-identity"));
    for (const intent of state.operationIntents) {
      if (intent.logicalKind === "clean-text-merge" && intent.effects.length < 2) issues.push(issue("journal-reference-incomplete", "clean merge must preserve at least two durable physical effects", undefined, "journal-effects"));
      const effectIds = intent.effects.map(effect => effect.effectId);
      if (!unique(effectIds)) issues.push(issue("journal-reference-incomplete", "recoverable operation contains duplicate effect IDs", undefined, "journal-effects"));
      for (const effect of intent.effects) {
        if ((effect.stage === "effect-verified" || effect.stage === "state-committed") && !effect.verificationEvidenceRef) {
          issues.push(issue("journal-reference-incomplete", "verified/committed effect lacks durable verification reference", undefined, "journal-verification"));
        }
      }
    }

    const batchIds = state.learnedRemoteBatches.map(batch => String(batch.checkpoint.batchId));
    if (!unique(batchIds)) issues.push(issue("ingestion-checkpoint-inconsistent", "learned remote backlog contains duplicate batch IDs", undefined, "remote-ingestion"));
    const reductionIds = state.learnedRemoteReductions.map(reduction => String(reduction.batchId));
    if (!unique(reductionIds)) issues.push(issue("ingestion-checkpoint-inconsistent", "remote-batch reductions contain duplicate batch IDs", undefined, "remote-ingestion"));
    for (const reduction of state.learnedRemoteReductions) {
      if (!state.learnedRemoteBatches.some(batch => batch.checkpoint.batchId === reduction.batchId) && !reduction.complete) {
        issues.push(issue("ingestion-checkpoint-inconsistent", "incomplete reduction references a batch no longer retained", undefined, "remote-ingestion"));
      }
      if (reduction.complete && reduction.durableFactRefs.some(ref => !isString(ref))) {
        issues.push(issue("ingestion-checkpoint-inconsistent", "completed reduction contains an invalid durable fact reference", undefined, "remote-ingestion"));
      }
    }

    if (state.persistenceRevision !== state.stateRevision) issues.push(issue("other-semantic-inconsistency", "persistenceRevision must equal the legacy stateRevision CAS sequence", undefined, "revision-domain"));
    if (!isString(state.semanticGeneration)) issues.push(issue("other-semantic-inconsistency", "semantic generation is missing", undefined, "revision-domain"));

    for (const check of this.extensionChecks) {
      const detail = check(state);
      if (detail) issues.push(issue("other-semantic-inconsistency", detail, undefined, "extension-invariant"));
    }
    return issues;
  }
}

export class MemoryStateByteStorage implements StateByteStorage {
  bytes?: Uint8Array;
  readonly backups = new Map<string, Uint8Array>();
  async read() { return this.bytes ? this.bytes.slice() : undefined; }
  async write(bytes: Uint8Array) { this.bytes = bytes.slice(); }
  async compareAndSwap(expected: Uint8Array | undefined, replacement: Uint8Array) {
    if (!bytesEqual(this.bytes, expected)) return false;
    this.bytes = replacement.slice();
    return true;
  }
  async backup(bytes: Uint8Array) {
    const id = `backup-${this.backups.size + 1}`;
    this.backups.set(id, bytes.slice());
    return id;
  }
}

export type StateMigration = (state: TrustedSynchronizationState, targetSchemaVersion: number) => TrustedSynchronizationState;
export type AuthorityStateMigration = (state: TrustedSynchronizationState, targetSchemaVersion: number) => DurableSynchronizationAuthorityState;
export type RecoveryReplacementResult =
  | { readonly status: "replaced"; readonly backup: StateBackupReceipt; readonly stateRevision: StateRevision }
  | { readonly status: "concurrent-change" | "not-recovery" | "recovery-required"; readonly reason: string; readonly backup?: StateBackupReceipt };

export class PersistentSynchronizationStateStore implements SynchronizationStateStore, SynchronizationAuthorityStore<DurableSynchronizationAuthorityState> {
  private readonly semanticValidator: DurableSemanticStateValidator;

  constructor(
    private readonly storage: StateByteStorage,
    readonly currentSchemaVersion = 1,
    semanticValidator: DurableSemanticStateValidator = new DurableSemanticStateValidator(),
  ) {
    this.semanticValidator = semanticValidator;
  }

  async load(context: StateLoadContext): Promise<StateLoadResult> {
    const bytes = await this.storage.read();
    if (!bytes) return context.expectation === "new-installation" ? { status: "uninitialized" } : { status: "recovery-required", reason: "expected-state-missing" };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: parsed.status, detail: parsed.detail };
    const state = parsed.envelope.state;
    if (state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "incompatible-version", detail: `state schema ${state.schemaVersion}, runtime schema ${this.currentSchemaVersion}` };
    if (context.expectedVaultIdentity && state.vaultIdentity !== context.expectedVaultIdentity) return { status: "recovery-required", reason: "internally-inconsistent", detail: "vault identity does not match expected pairing" };
    if (context.expectedDeviceIdentity && state.deviceIdentity !== context.expectedDeviceIdentity) return { status: "recovery-required", reason: "clone-or-restore-suspected", detail: "persisted device identity does not match this installation" };
    if (isDurableSynchronizationAuthorityState(state)) {
      const issues = this.semanticValidator.validate(state);
      if (issues.length > 0) return { status: "recovery-required", reason: "internally-inconsistent", detail: issues.map(item => `${item.code}:${item.invariantCategory ?? "state"}`).join(",") };
    }
    return { status: "trusted", state };
  }

  async saveTrusted(state: TrustedSynchronizationState, expectedRevision?: StateRevision): Promise<StateSaveResult> {
    if (!validateLegacyStateShape(state)) return { status: "recovery-required", reason: "refusing to persist internally inconsistent trusted state" };
    if (state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "refusing to persist incompatible state schema" };
    if (isDurableSynchronizationAuthorityState(state) && this.semanticValidator.validate(state).length > 0) return { status: "recovery-required", reason: "refusing to persist semantically inconsistent authority state" };
    const currentBytes = await this.storage.read();
    if (currentBytes) {
      const current = parseEnvelope(currentBytes);
      if (current.status !== "ok") return { status: "recovery-required", reason: `existing state is ${current.status}` };
      if (expectedRevision && current.envelope.state.stateRevision !== expectedRevision) return { status: "stale-revision", actualRevision: current.envelope.state.stateRevision };
    } else if (expectedRevision) return { status: "stale-revision" };
    const replacement = serialize(state);
    if (this.storage.compareAndSwap) {
      const saved = await this.storage.compareAndSwap(currentBytes, replacement);
      if (!saved) {
        const actual = await this.storage.read();
        if (!actual) return { status: "stale-revision" };
        const parsed = parseEnvelope(actual);
        if (parsed.status !== "ok") return { status: "recovery-required", reason: `concurrently written state is ${parsed.status}` };
        return { status: "stale-revision", actualRevision: parsed.envelope.state.stateRevision };
      }
    } else await this.storage.write(replacement);
    return { status: "saved", stateRevision: state.stateRevision };
  }

  async loadAuthority(): Promise<SynchronizationAuthorityLoadResult<DurableSynchronizationAuthorityState>> {
    const bytes = await this.storage.read();
    if (!bytes) return { status: "uninitialized" };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", `persisted state is ${parsed.status}`, undefined, "envelope-integrity")] };
    if (parsed.envelope.state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "authority schema is incompatible with this runtime", undefined, "schema-version")] };
    if (!isDurableSynchronizationAuthorityState(parsed.envelope.state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "legacy state lacks frozen semantic-authority metadata and must be migrated/reconstructed", undefined, "legacy-migration")] };
    const issues = this.semanticValidator.validate(parsed.envelope.state);
    return issues.length > 0 ? { status: "recovery-required", issues } : { status: "trusted", state: parsed.envelope.state };
  }

  async saveAuthority(
    state: DurableSynchronizationAuthorityState,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration?: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "atomic compare-and-swap storage is required for authority writes", undefined, "persistence-cas")] };
    const currentBytes = await this.storage.read();
    if (!currentBytes) return { status: "stale-persistence" };
    const parsed = parseEnvelope(currentBytes);
    if (parsed.status !== "ok" || !isDurableSynchronizationAuthorityState(parsed.envelope.state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "current state is not trusted semantic authority", undefined, "authority-load")] };
    const current = parsed.envelope.state;
    const currentIssues = this.semanticValidator.validate(current);
    if (currentIssues.length > 0) return { status: "recovery-required", issues: currentIssues };
    if (current.persistenceRevision !== expectedPersistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: current.persistenceRevision };
    if (expectedSemanticGeneration && current.semanticGeneration !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: current.semanticGeneration };
    if (state.vaultIdentity !== current.vaultIdentity || state.deviceIdentity !== current.deviceIdentity) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "authority save cannot silently change vault/device identity", undefined, "identity-authority")] };

    const semanticChanged = !sameSemanticAuthority(current, state);
    const persistenceRevision = nextPersistenceRevision(current.persistenceRevision);
    const semanticGeneration = semanticChanged ? nextSemanticGeneration(current.semanticGeneration) : current.semanticGeneration;
    const replacement: DurableSynchronizationAuthorityState = {
      ...state,
      stateRevision: persistenceRevision,
      persistenceRevision,
      semanticGeneration,
    };
    const replacementIssues = this.semanticValidator.validate(replacement);
    if (replacementIssues.length > 0) return { status: "recovery-required", issues: replacementIssues };
    if (!await this.storage.compareAndSwap(currentBytes, serialize(replacement))) {
      const actual = await this.readCurrentAuthorityBestEffort();
      return actual ? { status: "stale-persistence", actualPersistenceRevision: actual.persistenceRevision } : { status: "stale-persistence" };
    }
    return { status: "saved", persistenceRevision, semanticGeneration };
  }

  async commitBaseTransition(
    transition: AuthoritativeBaseTransition,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status === "uninitialized") return { status: "stale-persistence" };
    if (loaded.status === "recovery-required") return { status: "recovery-required", issues: loaded.issues };
    const state = loaded.state;
    if (state.persistenceRevision !== expectedPersistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: state.persistenceRevision };
    if (state.semanticGeneration !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };

    let next: DurableSynchronizationAuthorityState;
    if (transition.kind === "verified-deletion") {
      const currentAuthority = state.baseAuthority.find(entry => entry.path === transition.authority.path);
      if (!currentAuthority || !exactBaseAuthorityMatches(transition.authority, { generation: state.semanticGeneration, path: currentAuthority.path, fingerprint: currentAuthority.fingerprint })) {
        return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
      }
      const prior = state.base.find(entry => entry.path === transition.authority.path);
      if (!prior) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "verified deletion references missing BASE entry", transition.authority.path, "deletion-authority")] };
      next = {
        ...state,
        base: state.base.filter(entry => entry.path !== transition.authority.path),
        baseAuthority: state.baseAuthority.filter(entry => entry.path !== transition.authority.path),
        remoteMappings: state.remoteMappings.filter(mapping => mapping.path !== transition.authority.path),
        tombstones: [
          ...state.tombstones.filter(entry => entry.path !== transition.authority.path),
          { path: transition.authority.path, entityKind: prior.entityKind, deletedOn: "both", remoteObjectId: prior.remoteObjectId, sourceDeviceId: state.deviceIdentity },
        ],
      };
    } else {
      const proof = transition.proof;
      if (proof.generation !== state.semanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
      if (proof.kind === "file-common") {
        if (proof.canonicalContent.algorithm !== "sha256" || !isString(proof.canonicalContent.hash) || !Number.isSafeInteger(proof.canonicalContent.sizeBytes) || proof.canonicalContent.sizeBytes < 0) {
          return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "file BASE healing lacks exact canonical SHA-256 authority", proof.path, "common-file-proof")] };
        }
        next = {
          ...state,
          base: [...state.base.filter(entry => entry.path !== proof.path), { path: proof.path, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: proof.canonicalContent.hash, sizeBytes: proof.canonicalContent.sizeBytes, revision: String(proof.remoteRevision) }, remoteObjectId: proof.remoteObjectId }],
          baseAuthority: [...state.baseAuthority.filter(entry => entry.path !== proof.path), { path: proof.path, fingerprint: transition.nextFingerprint }],
          remoteMappings: [...state.remoteMappings.filter(mapping => mapping.path !== proof.path && mapping.remoteObjectId !== proof.remoteObjectId), { path: proof.path, remoteObjectId: proof.remoteObjectId, entityKind: "file" }],
          tombstones: state.tombstones.filter(entry => entry.path !== proof.path),
          pathConvergence: [...state.pathConvergence.filter(entry => entry.path !== proof.path), { path: proof.path, state: { status: "converged", generation: nextSemanticGeneration(state.semanticGeneration), baseFingerprint: transition.nextFingerprint } }],
        };
      } else if (proof.kind === "folder-common") {
        next = {
          ...state,
          base: [...state.base.filter(entry => entry.path !== proof.path), { path: proof.path, entityKind: "folder", localExisted: true, remoteExisted: true, remoteObjectId: proof.remoteObjectId }],
          baseAuthority: [...state.baseAuthority.filter(entry => entry.path !== proof.path), { path: proof.path, fingerprint: transition.nextFingerprint }],
          remoteMappings: [...state.remoteMappings.filter(mapping => mapping.path !== proof.path && mapping.remoteObjectId !== proof.remoteObjectId), { path: proof.path, remoteObjectId: proof.remoteObjectId, entityKind: "folder" }],
          tombstones: state.tombstones.filter(entry => entry.path !== proof.path),
          pathConvergence: [...state.pathConvergence.filter(entry => entry.path !== proof.path), { path: proof.path, state: { status: "converged", generation: nextSemanticGeneration(state.semanticGeneration), baseFingerprint: transition.nextFingerprint } }],
        };
      } else {
        const prior = state.base.find(entry => entry.path === proof.path);
        next = {
          ...state,
          base: state.base.filter(entry => entry.path !== proof.path),
          baseAuthority: state.baseAuthority.filter(entry => entry.path !== proof.path),
          remoteMappings: state.remoteMappings.filter(mapping => mapping.path !== proof.path),
          tombstones: prior
            ? [...state.tombstones.filter(entry => entry.path !== proof.path), { path: proof.path, entityKind: proof.entityKind, deletedOn: "both", remoteObjectId: prior.remoteObjectId, sourceDeviceId: state.deviceIdentity }]
            : state.tombstones,
          pathConvergence: state.pathConvergence.filter(entry => entry.path !== proof.path),
        };
      }
    }
    return this.saveAuthority(next, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async appendLearnedRemoteBatch(
    batch: DurableRemoteChangeBatch,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const next = {
      ...loaded.state,
      learnedRemoteBatches: appendDurableRemoteChangeBatch(loaded.state.learnedRemoteBatches, batch),
      changeCursor: batch.checkpoint.terminalStartToken,
    };
    return this.saveAuthority(next, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async recordRemoteBatchReduction(
    batchId: RemoteIngestionBatchId,
    durableFactRefs: readonly string[],
    complete: boolean,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (!loaded.state.learnedRemoteBatches.some(batch => batch.checkpoint.batchId === batchId)) return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "cannot reduce a remote batch that is not durably learned", undefined, "remote-ingestion")] };
    const next = {
      ...loaded.state,
      learnedRemoteReductions: [...loaded.state.learnedRemoteReductions.filter(entry => entry.batchId !== batchId), { batchId, durableFactRefs: [...durableFactRefs], complete }],
    };
    return this.saveAuthority(next, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async retireLearnedRemoteBatch(
    batchId: RemoteIngestionBatchId,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const batch = loaded.state.learnedRemoteBatches.find(item => item.checkpoint.batchId === batchId);
    if (!batch) return this.saveAuthority(loaded.state, expectedPersistenceRevision, expectedSemanticGeneration);
    const reduction = loaded.state.learnedRemoteReductions.find(item => item.batchId === batchId);
    if (!reduction?.complete || (batch.changes.length > 0 && reduction.durableFactRefs.length === 0)) {
      return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "remote batch cannot retire until every needed fact is durably reduced", undefined, "remote-ingestion-retirement")] };
    }
    const next = {
      ...loaded.state,
      learnedRemoteBatches: loaded.state.learnedRemoteBatches.filter(item => item.checkpoint.batchId !== batchId),
      learnedRemoteReductions: loaded.state.learnedRemoteReductions.filter(item => item.batchId !== batchId),
    };
    return this.saveAuthority(next, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async persistOperationIntent(
    intent: RecoverableOperationIntent,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (intent.semanticAuthority.generation !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    if (loaded.state.operationIntents.some(existing => existing.operationId === intent.operationId)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation intent already exists", undefined, "journal-identity")] };
    return this.saveAuthority({ ...loaded.state, operationIntents: [...loaded.state.operationIntents, intent] }, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async advanceOperationEffect(
    operationId: RecoverableOperationIntent["operationId"],
    effectId: string,
    stage: RecoverableMutationEffect["stage"],
    verificationEvidenceRef: string | undefined,
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const intent = loaded.state.operationIntents.find(item => item.operationId === operationId);
    if (!intent) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect cannot advance without durable intent", undefined, "journal-reference")] };
    const currentEffect = intent.effects.find(effect => effect.effectId === effectId);
    if (!currentEffect) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect ID is not durable", undefined, "journal-reference")] };
    const stages: readonly RecoverableMutationEffect["stage"][] = ["intent-persisted", "dispatch-authorized", "outcome-unknown", "effect-verified", "state-committed"];
    const from = stages.indexOf(currentEffect.stage);
    const to = stages.indexOf(stage);
    const legalUnknownRecovery = currentEffect.stage === "outcome-unknown" && stage === "effect-verified";
    if (to < from || (to > from + 1 && !legalUnknownRecovery)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", `illegal effect-stage transition ${currentEffect.stage}->${stage}`, undefined, "journal-stage-order")] };
    if ((stage === "effect-verified" || stage === "state-committed") && !verificationEvidenceRef && !currentEffect.verificationEvidenceRef) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "verified/committed effect transition requires durable verification evidence", undefined, "journal-verification")] };

    const updatedEffects = intent.effects.map(effect => effect.effectId === effectId ? { ...effect, stage, verificationEvidenceRef: verificationEvidenceRef ?? effect.verificationEvidenceRef } : effect) as RecoverableOperationIntent["effects"];
    const updatedIntent = { ...intent, effects: updatedEffects } as RecoverableOperationIntent;
    const next = { ...loaded.state, operationIntents: loaded.state.operationIntents.map(item => item.operationId === operationId ? updatedIntent : item) };
    return this.saveAuthority(next, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async garbageCollectCompletedOperation(
    operationId: RecoverableOperationIntent["operationId"],
    expectedPersistenceRevision: PersistenceRevision,
    expectedSemanticGeneration: SemanticStateGeneration,
  ): Promise<SynchronizationAuthoritySaveResult> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const intent = loaded.state.operationIntents.find(item => item.operationId === operationId);
    if (!intent || !recoverableOperationIsComplete(intent)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation journal can be collected only after every effect is state-committed", undefined, "journal-gc")] };
    return this.saveAuthority({ ...loaded.state, operationIntents: loaded.state.operationIntents.filter(item => item.operationId !== operationId) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }

  async restartRecoveryDirectives(): Promise<readonly { operationId: RecoverableOperationIntent["operationId"]; effectId: string; directive: RestartRecoveryDirective }[]> {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return [];
    return loaded.state.operationIntents.flatMap(intent => intent.effects.map(effect => ({ operationId: intent.operationId, effectId: effect.effectId, directive: restartRecoveryDirective(effect) })));
  }

  async createRecoveryBackup(): Promise<StateBackupReceipt> {
    const bytes = await this.storage.read();
    const backupId = await this.storage.backup(bytes ?? new Uint8Array());
    let sourceRevision: StateRevision | undefined;
    if (bytes) {
      const parsed = parseEnvelope(bytes);
      if (parsed.status === "ok") sourceRevision = parsed.envelope.state.stateRevision;
    }
    return { backupId, sourceRevision };
  }

  async replaceRecoveryState(state: TrustedSynchronizationState, context: StateLoadContext): Promise<RecoveryReplacementResult> {
    if (!validateLegacyStateShape(state) || state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "recovery candidate is not valid trusted state" };
    if (isDurableSynchronizationAuthorityState(state) && this.semanticValidator.validate(state).length > 0) return { status: "recovery-required", reason: "recovery candidate has semantic contradictions" };
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "atomic compare-and-swap storage is required for recovery replacement" };
    const source = await this.storage.read();
    const loaded = await this.load(context);
    if (loaded.status !== "recovery-required") return { status: "not-recovery", reason: "current persisted state is not in a recovery condition" };
    const backupId = await this.storage.backup(source ?? new Uint8Array());
    let sourceRevision: StateRevision | undefined;
    if (source) {
      const parsed = parseEnvelope(source);
      if (parsed.status === "ok") sourceRevision = parsed.envelope.state.stateRevision;
    }
    const backup: StateBackupReceipt = { backupId, ...(sourceRevision ? { sourceRevision } : {}) };
    if (!await this.storage.compareAndSwap(source, serialize(state))) return { status: "concurrent-change", reason: "state changed after recovery backup; replacement refused", backup };
    return { status: "replaced", backup, stateRevision: state.stateRevision };
  }

  async assessMigration(targetSchemaVersion: number): Promise<StateMigrationAssessment> {
    const bytes = await this.storage.read();
    if (!bytes) return { status: "compatible", toVersion: targetSchemaVersion };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "incompatible", toVersion: targetSchemaVersion };
    const fromVersion = parsed.envelope.state.schemaVersion;
    if (fromVersion === targetSchemaVersion) return { status: "compatible", fromVersion, toVersion: targetSchemaVersion };
    if (fromVersion < targetSchemaVersion) return { status: "migration-required", fromVersion, toVersion: targetSchemaVersion };
    return { status: "incompatible", fromVersion, toVersion: targetSchemaVersion };
  }

  async migrate(targetSchemaVersion: number, migration: StateMigration): Promise<{ status: "migrated"; backup: StateBackupReceipt } | { status: "incompatible" | "recovery-required"; reason: string }> {
    const assessment = await this.assessMigration(targetSchemaVersion);
    if (assessment.status === "incompatible") return { status: "incompatible", reason: "state cannot be safely migrated to the requested schema" };
    if (assessment.status === "compatible") return { status: "incompatible", reason: "migration is not required" };
    const loadedBytes = await this.storage.read();
    if (!loadedBytes) return { status: "recovery-required", reason: "state disappeared before migration" };
    const parsed = parseEnvelope(loadedBytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: `state became ${parsed.status}` };
    const backup = await this.createRecoveryBackup();
    const migrated = migration(parsed.envelope.state, targetSchemaVersion);
    if (!validateLegacyStateShape(migrated) || migrated.schemaVersion !== targetSchemaVersion) return { status: "recovery-required", reason: "migration produced invalid target state" };
    const replacement = serialize(migrated);
    if (this.storage.compareAndSwap) {
      if (!await this.storage.compareAndSwap(loadedBytes, replacement)) return { status: "recovery-required", reason: "state changed concurrently during migration; migration was not committed" };
    } else await this.storage.write(replacement);
    return { status: "migrated", backup };
  }

  /**
   * Migrates/reconstructs legacy state into the frozen semantic-authority schema.
   * The caller must provide exact reconstructed authority; legacy BASE is never silently
   * promoted merely because it was structurally readable. Backup precedes a CAS-bound write.
   */
  async migrateToAuthority(targetSchemaVersion: number, rebuild: AuthorityStateMigration): Promise<{ status: "migrated"; backup: StateBackupReceipt } | { status: "recovery-required"; reason: string }> {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "authority migration requires atomic compare-and-swap storage" };
    const source = await this.storage.read();
    if (!source) return { status: "recovery-required", reason: "state disappeared before authority migration" };
    const parsed = parseEnvelope(source);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: `state is ${parsed.status}` };
    const backupId = await this.storage.backup(source);
    const backup: StateBackupReceipt = { backupId, sourceRevision: parsed.envelope.state.stateRevision };
    const candidate = rebuild(parsed.envelope.state, targetSchemaVersion);
    if (!isDurableSynchronizationAuthorityState(candidate) || candidate.schemaVersion !== targetSchemaVersion) return { status: "recovery-required", reason: "authority migration did not reconstruct the required durable authority schema" };
    const issues = this.semanticValidator.validate(candidate);
    if (issues.length > 0) return { status: "recovery-required", reason: `authority migration remains semantically inconsistent: ${issues.map(item => item.code).join(",")}` };
    if (!await this.storage.compareAndSwap(source, serialize(candidate))) return { status: "recovery-required", reason: "state changed concurrently after migration backup; migration was not committed" };
    return { status: "migrated", backup };
  }

  async exportDiagnosticState(): Promise<Uint8Array> {
    const bytes = await this.storage.read();
    if (!bytes) return encoder.encode(JSON.stringify({ status: "uninitialized" }));
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return encoder.encode(JSON.stringify({ status: "recovery-required", reason: parsed.status }));
    const state = parsed.envelope.state;
    const authority = isDurableSynchronizationAuthorityState(state) ? {
      persistenceRevision: state.persistenceRevision,
      semanticGeneration: state.semanticGeneration,
      learnedRemoteBatchCount: state.learnedRemoteBatches.length,
      pendingAuthorityOperationCount: state.operationIntents.filter(intent => !recoverableOperationIsComplete(intent)).length,
      localTransactionCount: state.localTransactions.length,
    } : { authorityMigrationRequired: true };
    const diagnostic = {
      schemaVersion: state.schemaVersion,
      stateRevision: state.stateRevision,
      vaultIdentity: state.vaultIdentity,
      deviceIdentity: state.deviceIdentity,
      base: state.base.map(entry => ({ path: entry.path, entityKind: entry.entityKind, localExisted: entry.localExisted, remoteExisted: entry.remoteExisted, contentEvidence: entry.content, remoteObjectId: entry.remoteObjectId })),
      remoteMappings: state.remoteMappings,
      tombstones: state.tombstones,
      changeCursor: state.changeCursor,
      operations: state.operations,
      knownDevices: state.knownDevices,
      ...authority,
    };
    return encoder.encode(JSON.stringify(diagnostic));
  }

  private async readCurrentAuthorityBestEffort(): Promise<DurableSynchronizationAuthorityState | undefined> {
    const bytes = await this.storage.read();
    if (!bytes) return undefined;
    const parsed = parseEnvelope(bytes);
    return parsed.status === "ok" && isDurableSynchronizationAuthorityState(parsed.envelope.state) ? parsed.envelope.state : undefined;
  }
}

export function createInitialTrustedState(values: { stateRevision: StateRevision; vaultIdentity: VaultIdentity; deviceIdentity: DeviceIdentity; schemaVersion?: number }): TrustedSynchronizationState {
  return {
    schemaVersion: values.schemaVersion ?? 1,
    stateRevision: values.stateRevision,
    vaultIdentity: values.vaultIdentity,
    deviceIdentity: values.deviceIdentity,
    base: [],
    remoteMappings: [],
    tombstones: [],
    operations: [],
    knownDevices: [{ deviceId: values.deviceIdentity, stale: false }],
  };
}

export function createInitialAuthorityState(values: {
  persistenceRevision: PersistenceRevision;
  semanticGeneration: SemanticStateGeneration;
  vaultIdentity: VaultIdentity;
  deviceIdentity: DeviceIdentity;
  schemaVersion?: number;
}): DurableSynchronizationAuthorityState {
  return {
    ...createInitialTrustedState({ stateRevision: values.persistenceRevision, vaultIdentity: values.vaultIdentity, deviceIdentity: values.deviceIdentity, schemaVersion: values.schemaVersion }),
    authoritySchemaVersion: 1,
    persistenceRevision: values.persistenceRevision,
    semanticGeneration: values.semanticGeneration,
    learnedRemoteBatches: [],
    learnedRemoteReductions: [],
    pathConvergence: [],
    operationIntents: [],
    localTransactions: [] as readonly LocalMutationTransaction[],
    baseAuthority: [],
  };
}
