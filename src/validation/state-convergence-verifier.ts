import type {
  ChangeCursor,
  ContentHash,
  EntityKind,
  GoogleDrivePort,
  LocalIntegrityReconciliationPort,
  LocalVaultPort,
  ManagedRemoteIdentity,
  RemoteListing,
  RemoteObjectId,
  SynchronizationAuthorityStoreV1_1,
  VaultPath,
} from "../contracts";
import type { DiagnosticComponent, DiagnosticEvent, DiagnosticFieldValue, DiagnosticLogger } from "../diagnostics/diagnostic-logger";
import { diagnosticPathKey } from "../diagnostics/diagnostic-logger";
import { inspectExactProductionTerminal } from "../diagnostics/production-diagnostic-correlation";
import type { DurableSynchronizationAuthorityState } from "../state/persistent-state-store";
import { Sha256 } from "../util/sha256";
import {
  validationAssertionGroupResult,
  validationEvidenceRef,
  validationVerificationResult,
  type ValidationAssertionObservation,
  type ValidationConvergenceAssertion,
  type ValidationEvidenceRef,
  type ValidationStateAssertion,
  type ValidationVerificationResult,
} from "./driver-plan-fault-verifier-contracts";
import type { ValidationDeviceId, ValidationRunIdentity } from "./run-sandbox-checkpoint-contracts";

/** Read-only projection of the production local-vault seams used by H3A. */
export type ValidationLocalReadSource = Pick<LocalVaultPort, "enumerate" | "observe"> & LocalIntegrityReconciliationPort;
/** Read-only projection of the production Drive seam used by H3A. */
export type ValidationRemoteReadSource = Pick<GoogleDrivePort, "validateManagedRoot" | "listForReconciliation" | "download">;
/** Read-only projection of the production synchronization-authority store. */
export type ValidationAuthorityReadSource = Pick<SynchronizationAuthorityStoreV1_1<DurableSynchronizationAuthorityState>, "loadAuthority">;
/** Read-only projection of the production diagnostic logger. */
export type ValidationDiagnosticReadSource = Pick<DiagnosticLogger, "snapshot">;

export interface ValidationDeviceObservationSource {
  readonly deviceId: ValidationDeviceId;
  readonly local: ValidationLocalReadSource;
  readonly authority: ValidationAuthorityReadSource;
  readonly diagnostics: ValidationDiagnosticReadSource;
}

export interface ValidationRemoteObservationSource {
  readonly identity: ManagedRemoteIdentity;
  readonly drive: ValidationRemoteReadSource;
}

export interface ValidationVerifierSources {
  readonly devices: readonly ValidationDeviceObservationSource[];
  readonly remote?: ValidationRemoteObservationSource;
}

export interface ValidationExactContentExpectation {
  readonly hash: ContentHash;
  readonly sizeBytes?: number;
}

export interface ValidationDiagnosticExpectation {
  readonly deviceId: ValidationDeviceId;
  readonly component: DiagnosticComponent;
  readonly event: string;
  readonly diagnosticRunId?: number;
  readonly expectedFields?: Readonly<Record<string, DiagnosticFieldValue>>;
}

export interface ValidationLocalProtectedPathExpectation {
  readonly deviceId: ValidationDeviceId;
  readonly path: VaultPath;
  readonly state: "absent" | "file" | "folder";
  readonly content?: ValidationExactContentExpectation;
}

export interface ValidationRemoteProtectedPathExpectation {
  readonly path: VaultPath;
  readonly state: "live" | "trashed" | "absent";
  readonly remoteObjectId?: RemoteObjectId;
  readonly content?: ValidationExactContentExpectation;
  readonly revision?: string;
}

export type ValidationStatePostcondition =
  | { readonly kind: "local-content"; readonly assertion: ValidationStateAssertion; readonly deviceId: ValidationDeviceId; readonly path: VaultPath; readonly content: ValidationExactContentExpectation }
  | { readonly kind: "remote-content"; readonly assertion: ValidationStateAssertion; readonly path: VaultPath; readonly content: ValidationExactContentExpectation; readonly remoteObjectId?: RemoteObjectId; readonly revision?: string }
  | { readonly kind: "remote-identity"; readonly assertion: ValidationStateAssertion; readonly expectedIdentity: ManagedRemoteIdentity; readonly path?: VaultPath; readonly remoteObjectId?: RemoteObjectId }
  | { readonly kind: "live-trash-absence-state"; readonly assertion: ValidationStateAssertion; readonly path: VaultPath; readonly expectedState: "live" | "trashed" | "absent"; readonly remoteObjectId?: RemoteObjectId }
  | { readonly kind: "base-authority"; readonly assertion: ValidationStateAssertion; readonly deviceId: ValidationDeviceId; readonly path: VaultPath; readonly expectedFingerprint?: string; readonly expectedRemoteObjectId?: RemoteObjectId; readonly expectedContent?: ValidationExactContentExpectation }
  | { readonly kind: "mapping-or-tombstone"; readonly assertion: ValidationStateAssertion; readonly deviceId: ValidationDeviceId; readonly path: VaultPath; readonly expected: "mapping" | "tombstone" | "neither"; readonly remoteObjectId?: RemoteObjectId; readonly entityKind?: EntityKind; readonly deletedOn?: "local" | "remote" | "both" }
  | { readonly kind: "authority-generation-or-revision"; readonly assertion: ValidationStateAssertion; readonly deviceId: ValidationDeviceId; readonly persistenceRevision?: string; readonly semanticGeneration?: string; readonly stateRevision?: string }
  | { readonly kind: "durable-intent-or-effect"; readonly assertion: ValidationStateAssertion; readonly deviceId: ValidationDeviceId; readonly operationId?: string; readonly effectId?: string; readonly expected: "present" | "absent" | "none-outstanding"; readonly stage?: "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified" | "state-committed"; readonly verificationEvidenceRef?: string }
  | { readonly kind: "change-cursor-or-completeness"; readonly assertion: ValidationStateAssertion; readonly deviceId: ValidationDeviceId; readonly expectedCursor?: ChangeCursor; readonly requireRemoteComplete?: boolean; readonly requireNoLearnedRemoteBatches?: boolean }
  | { readonly kind: "conflict-provenance"; readonly assertion: ValidationStateAssertion; readonly diagnostic: ValidationDiagnosticExpectation }
  | { readonly kind: "unrelated-mutation-absence"; readonly assertion: ValidationStateAssertion; readonly local: readonly ValidationLocalProtectedPathExpectation[]; readonly remote: readonly ValidationRemoteProtectedPathExpectation[] }
  | { readonly kind: "terminal-product-result"; readonly assertion: ValidationStateAssertion; readonly diagnostic: ValidationDiagnosticExpectation };

export type ValidationConvergencePostcondition =
  | { readonly kind: "cross-device-content"; readonly assertion: ValidationConvergenceAssertion; readonly deviceIds: readonly ValidationDeviceId[]; readonly path: VaultPath; readonly content: ValidationExactContentExpectation }
  | { readonly kind: "cross-device-path"; readonly assertion: ValidationConvergenceAssertion; readonly deviceIds: readonly ValidationDeviceId[]; readonly path: VaultPath; readonly expected: "absent" | "file" | "folder" }
  | { readonly kind: "cross-device-authority"; readonly assertion: ValidationConvergenceAssertion; readonly deviceIds: readonly ValidationDeviceId[]; readonly path: VaultPath; readonly expectedFingerprint?: string; readonly expectedRemoteObjectId?: RemoteObjectId; readonly expectedTombstone?: boolean }
  | { readonly kind: "cross-device-conflict-resolution"; readonly assertion: ValidationConvergenceAssertion; readonly deviceIds: readonly ValidationDeviceId[]; readonly path: VaultPath; readonly content: ValidationExactContentExpectation; readonly remoteObjectId?: RemoteObjectId }
  | { readonly kind: "final-reconciliation-stable"; readonly assertion: ValidationConvergenceAssertion; readonly deviceIds: readonly ValidationDeviceId[]; readonly terminalDiagnostic: ValidationDiagnosticExpectation; readonly requireRemoteComplete: boolean; readonly requireNoOutstandingIntents: boolean; readonly requireNoLearnedRemoteBatches?: boolean; readonly requireAllRecordedPathsConverged?: boolean };

export interface ValidationStateConvergenceRequest {
  readonly run: ValidationRunIdentity;
  readonly state: readonly [ValidationStatePostcondition, ...ValidationStatePostcondition[]];
  readonly convergence: readonly [ValidationConvergencePostcondition, ...ValidationConvergencePostcondition[]];
}

export interface ValidationObjectiveEvidence {
  readonly ref: ValidationEvidenceRef;
  readonly source: "local" | "remote" | "authority" | "diagnostic" | "convergence";
  readonly summary: string;
}

export interface ValidationStateConvergenceReport {
  readonly result: ValidationVerificationResult;
  readonly evidence: readonly ValidationObjectiveEvidence[];
}

type EvaluationStatus = "satisfied" | "failed" | "not-observable";
interface Evaluation { readonly status: EvaluationStatus; readonly reason?: string; readonly refs: readonly ValidationEvidenceRef[]; }

function equalContent(actualHash: string | undefined, actualSize: number | undefined, expected: ValidationExactContentExpectation): boolean {
  return actualHash === String(expected.hash) && (expected.sizeBytes === undefined || actualSize === expected.sizeBytes);
}

async function hashBinary(content: { openChunks(): AsyncIterable<Uint8Array> }): Promise<{ hash: string; sizeBytes: number }> {
  const hash = new Sha256();
  let sizeBytes = 0;
  for await (const chunk of content.openChunks()) { hash.update(chunk); sizeBytes += chunk.byteLength; }
  return { hash: `sha256:${hash.digestHex()}`, sizeBytes };
}

function fieldsMatch(event: DiagnosticEvent, expected?: Readonly<Record<string, DiagnosticFieldValue>>): boolean {
  if (!expected) return true;
  const fields = event.fields as Readonly<Record<string, DiagnosticFieldValue>> | undefined;
  return Object.entries(expected).every(([key, value]) => fields?.[key] === value);
}

function strongest(evaluations: readonly Evaluation[]): Evaluation {
  const failed = evaluations.find(item => item.status === "failed");
  if (failed) return { status: "failed", reason: failed.reason, refs: evaluations.flatMap(item => item.refs) };
  const blocked = evaluations.find(item => item.status === "not-observable");
  if (blocked) return { status: "not-observable", reason: blocked.reason, refs: evaluations.flatMap(item => item.refs) };
  return { status: "satisfied", refs: evaluations.flatMap(item => item.refs) };
}

/** Objective H3A verifier. Its source types deliberately exclude every production mutation method. */
export class StateConvergenceVerifier {
  private evidenceSequence = 0;
  private readonly devices = new Map<string, ValidationDeviceObservationSource>();
  private readonly evidence: ValidationObjectiveEvidence[] = [];

  constructor(private readonly sources: ValidationVerifierSources) {
    for (const device of sources.devices) {
      const key = String(device.deviceId);
      if (this.devices.has(key)) throw new Error(`Duplicate validation device source: ${key}`);
      this.devices.set(key, device);
    }
  }

  async verify(request: ValidationStateConvergenceRequest): Promise<ValidationStateConvergenceReport> {
    this.evidenceSequence = 0;
    this.evidence.length = 0;
    const stateObservations: ValidationAssertionObservation[] = [];
    for (const postcondition of request.state) {
      this.assertKind(postcondition.assertion.kind, postcondition.kind);
      stateObservations.push(this.observation(postcondition.assertion, await this.evaluateState(postcondition)));
    }
    const convergenceObservations: ValidationAssertionObservation[] = [];
    for (const postcondition of request.convergence) {
      this.assertKind(postcondition.assertion.kind, postcondition.kind);
      convergenceObservations.push(this.observation(postcondition.assertion, await this.evaluateConvergence(postcondition)));
    }
    const state = validationAssertionGroupResult(stateObservations as [ValidationAssertionObservation, ...ValidationAssertionObservation[]]);
    const convergence = validationAssertionGroupResult(convergenceObservations as [ValidationAssertionObservation, ...ValidationAssertionObservation[]]);
    return { result: validationVerificationResult(request.run, state, convergence), evidence: [...this.evidence] };
  }

  private assertKind(actual: string, expected: string): void {
    if (actual !== expected) throw new Error(`Validation assertion kind ${actual} does not match verifier postcondition ${expected}.`);
  }

  private observation(assertion: ValidationStateAssertion | ValidationConvergenceAssertion, evaluation: Evaluation): ValidationAssertionObservation {
    if (evaluation.status === "satisfied") {
      if (evaluation.refs.length === 0) throw new Error("Satisfied verification must retain objective evidence.");
      return { status: "satisfied", assertion, evidenceRefs: evaluation.refs as [ValidationEvidenceRef, ...ValidationEvidenceRef[]] };
    }
    return { status: evaluation.status, assertion, reason: evaluation.reason ?? "Required objective proof was unavailable.", evidenceRefs: evaluation.refs };
  }

  private proof(source: ValidationObjectiveEvidence["source"], summary: string): ValidationEvidenceRef {
    this.evidenceSequence += 1;
    const ref = validationEvidenceRef(`vh08:${source}:${this.evidenceSequence}`);
    this.evidence.push({ ref, source, summary });
    return ref;
  }

  private device(deviceId: ValidationDeviceId): ValidationDeviceObservationSource | undefined { return this.devices.get(String(deviceId)); }
  private missingDevice(deviceId: ValidationDeviceId): Evaluation { return { status: "not-observable", reason: `Required validation device source is unavailable: ${String(deviceId)}.`, refs: [] }; }

  private async loadAuthority(deviceId: ValidationDeviceId): Promise<{ readonly evaluation: Evaluation; readonly state?: DurableSynchronizationAuthorityState }> {
    const device = this.device(deviceId);
    if (!device) return { evaluation: this.missingDevice(deviceId) };
    try {
      const loaded = await device.authority.loadAuthority();
      if (loaded.status !== "trusted") return { evaluation: { status: "not-observable", reason: `Synchronization authority is ${loaded.status}; trusted-state proof is unavailable.`, refs: [] } };
      const ref = this.proof("authority", `Trusted synchronization authority observed on ${String(deviceId)} at persistence revision ${String(loaded.state.persistenceRevision)}.`);
      return { state: loaded.state, evaluation: { status: "satisfied", refs: [ref] } };
    } catch {
      return { evaluation: { status: "not-observable", reason: "Synchronization authority could not be read.", refs: [] } };
    }
  }

  private async localPath(deviceId: ValidationDeviceId, path: VaultPath, expected: "absent" | "file" | "folder", content?: ValidationExactContentExpectation): Promise<Evaluation> {
    const device = this.device(deviceId);
    if (!device) return this.missingDevice(deviceId);
    try {
      const observed = await device.local.observe(path);
      if (expected === "absent") {
        if (observed.status === "absent") return { status: "satisfied", refs: [this.proof("local", `Authoritative local absence observed at ${diagnosticPathKey(String(path))}.`)] };
        if (observed.status === "present") return { status: "failed", reason: "Local path is present but absence was required.", refs: [this.proof("local", `Contradictory local presence observed at ${diagnosticPathKey(String(path))}.`)] };
        return { status: "not-observable", reason: `Local absence is not authoritative because observation status is ${observed.status}.`, refs: [] };
      }
      if (observed.status === "absent") return { status: "failed", reason: `Required local ${expected} is absent.`, refs: [this.proof("local", `Authoritative local absence contradicted required ${expected} at ${diagnosticPathKey(String(path))}.`)] };
      if (observed.status !== "present") return { status: "not-observable", reason: `Required local path cannot be authoritatively observed: ${observed.status}.`, refs: [] };
      if (observed.entityKind !== expected) return { status: "failed", reason: `Local entity kind is ${observed.entityKind}, expected ${expected}.`, refs: [this.proof("local", `Local entity-kind mismatch observed at ${diagnosticPathKey(String(path))}.`)] };
      if (expected === "folder") return { status: "satisfied", refs: [this.proof("local", `Local folder presence observed at ${diagnosticPathKey(String(path))}.`)] };
      if (!content) return { status: "satisfied", refs: [this.proof("local", `Local file presence observed at ${diagnosticPathKey(String(path))}.`)] };
      const read = await device.local.readFileBypassingEvidenceCache(path);
      const exact = await hashBinary(read.content);
      if (!equalContent(exact.hash, exact.sizeBytes, content)) return { status: "failed", reason: "Local bytes do not match the required SHA-256/size.", refs: [this.proof("local", `Local canonical byte mismatch at ${diagnosticPathKey(String(path))}; actual digest ${exact.hash}.`)] };
      return { status: "satisfied", refs: [this.proof("local", `Local bytes matched ${exact.hash} (${exact.sizeBytes} bytes) at ${diagnosticPathKey(String(path))}.`)] };
    } catch {
      return { status: "not-observable", reason: "Authoritative local read could not establish the required postcondition.", refs: [] };
    }
  }

  private async validateRemoteIdentity(expectedIdentity?: ManagedRemoteIdentity): Promise<Evaluation> {
    const remote = this.sources.remote;
    if (!remote) return { status: "not-observable", reason: "Managed remote read source is unavailable.", refs: [] };
    const expected = expectedIdentity ?? remote.identity;
    try {
      const result = await remote.drive.validateManagedRoot(expected);
      if (!result.ok) return { status: "not-observable", reason: `Managed remote identity validation failed operationally: ${result.signal.kind}.`, refs: [] };
      if (result.value.status === "ambiguous") return { status: "not-observable", reason: `Managed remote identity is ambiguous: ${result.value.reason}.`, refs: [] };
      if (result.value.status !== "valid") return { status: "failed", reason: `Managed remote identity validation returned ${result.value.status}.`, refs: [this.proof("remote", `Managed remote identity contradiction: ${result.value.status}.`)] };
      const actual = result.value.identity;
      if (actual.rootId !== expected.rootId || actual.vaultIdentity !== expected.vaultIdentity || actual.protocolVersion !== expected.protocolVersion) return { status: "failed", reason: "Validated managed remote identity differs from the required root/vault/protocol identity.", refs: [this.proof("remote", "Managed remote identity fields contradicted the required identity.")] };
      return { status: "satisfied", refs: [this.proof("remote", `Managed remote identity validated for root ${String(actual.rootId)}.`)] };
    } catch {
      return { status: "not-observable", reason: "Managed remote identity could not be validated.", refs: [] };
    }
  }

  private async remoteListing(): Promise<{ readonly evaluation: Evaluation; readonly listing?: RemoteListing }> {
    const remote = this.sources.remote;
    if (!remote) return { evaluation: { status: "not-observable", reason: "Managed remote read source is unavailable.", refs: [] } };
    try {
      const result = await remote.drive.listForReconciliation(remote.identity.rootId);
      if (!result.ok) return { evaluation: { status: "not-observable", reason: `Remote reconciliation listing failed operationally: ${result.signal.kind}.`, refs: [] } };
      if (result.value.completeness.status !== "complete") return { evaluation: { status: "not-observable", reason: `Remote enumeration is ${result.value.completeness.status}; complete-set proof is unavailable.`, refs: [] } };
      const ref = this.proof("remote", `Complete managed-remote enumeration observed with ${result.value.entries.length} entries.`);
      return { evaluation: { status: "satisfied", refs: [ref] }, listing: result.value };
    } catch {
      return { evaluation: { status: "not-observable", reason: "Remote reconciliation listing could not be read.", refs: [] } };
    }
  }

  private async remotePath(expectation: ValidationRemoteProtectedPathExpectation): Promise<Evaluation> {
    const identity = await this.validateRemoteIdentity();
    if (identity.status !== "satisfied") return identity;
    const listed = await this.remoteListing();
    if (!listed.listing) return strongest([identity, listed.evaluation]);
    const entries = listed.listing.entries.filter(entry => expectation.remoteObjectId ? entry.remoteObjectId === expectation.remoteObjectId : entry.path === expectation.path);
    if (expectation.state === "absent") {
      if (entries.length !== 0) return { status: "failed", reason: "Remote object/path exists but authoritative absence was required.", refs: [...identity.refs, ...listed.evaluation.refs, this.proof("remote", `Remote presence contradicted required absence at ${diagnosticPathKey(String(expectation.path))}.`)] };
      return { status: "satisfied", refs: [...identity.refs, ...listed.evaluation.refs, this.proof("remote", `Complete remote enumeration proved absence at ${diagnosticPathKey(String(expectation.path))}.`)] };
    }
    if (entries.length === 0) return { status: "failed", reason: `Required remote ${expectation.state} object is absent from a complete enumeration.`, refs: [...identity.refs, ...listed.evaluation.refs] };
    if (!expectation.remoteObjectId && entries.length !== 1) return { status: "failed", reason: "Remote logical path has ambiguous multiple occupants.", refs: [...identity.refs, ...listed.evaluation.refs, this.proof("remote", `Multiple remote occupants observed at ${diagnosticPathKey(String(expectation.path))}.`)] };
    const entry = entries[0];
    if ((expectation.state === "trashed") !== entry.trashed) return { status: "failed", reason: `Remote object trash state is ${entry.trashed ? "trashed" : "live"}, expected ${expectation.state}.`, refs: [...identity.refs, ...listed.evaluation.refs, this.proof("remote", `Remote trash-state mismatch observed at ${diagnosticPathKey(String(expectation.path))}.`)] };
    if (entry.path !== expectation.path) return { status: "failed", reason: "Stable remote identity is present at a different logical path.", refs: [...identity.refs, ...listed.evaluation.refs] };
    if (expectation.revision !== undefined && entry.content?.revision !== expectation.revision) return { status: "failed", reason: "Remote revision does not match the required revision.", refs: [...identity.refs, ...listed.evaluation.refs] };
    if (!expectation.content) return { status: "satisfied", refs: [...identity.refs, ...listed.evaluation.refs, this.proof("remote", `Remote ${expectation.state} state verified at ${diagnosticPathKey(String(expectation.path))}.`)] };
    if (entry.entityKind !== "file") return { status: "failed", reason: "Remote content expectation targets a non-file object.", refs: [...identity.refs, ...listed.evaluation.refs] };
    try {
      const download = await this.sources.remote!.drive.download(entry.remoteObjectId);
      if (!download.ok) {
        if (download.signal.kind === "not-found") return { status: "failed", reason: "Remote object disappeared after complete enumeration.", refs: [...identity.refs, ...listed.evaluation.refs] };
        return { status: "not-observable", reason: `Remote content download failed operationally: ${download.signal.kind}.`, refs: [...identity.refs, ...listed.evaluation.refs] };
      }
      if (download.value.remoteObjectId !== entry.remoteObjectId) return { status: "failed", reason: "Remote download identity does not match enumerated stable identity.", refs: [...identity.refs, ...listed.evaluation.refs] };
      const exact = await hashBinary(download.value.content);
      if (!equalContent(exact.hash, exact.sizeBytes, expectation.content)) return { status: "failed", reason: "Remote bytes do not match the required SHA-256/size.", refs: [...identity.refs, ...listed.evaluation.refs, this.proof("remote", `Remote canonical byte mismatch at ${diagnosticPathKey(String(expectation.path))}; actual digest ${exact.hash}.`)] };
      return { status: "satisfied", refs: [...identity.refs, ...listed.evaluation.refs, this.proof("remote", `Remote bytes matched ${exact.hash} (${exact.sizeBytes} bytes) for stable object ${String(entry.remoteObjectId)}.`)] };
    } catch {
      return { status: "not-observable", reason: "Remote bytes could not be read for objective verification.", refs: [...identity.refs, ...listed.evaluation.refs] };
    }
  }

  private diagnostic(expectation: ValidationDiagnosticExpectation): Evaluation {
    const device = this.device(expectation.deviceId);
    if (!device) return this.missingDevice(expectation.deviceId);
    const candidates = device.diagnostics.snapshot().filter(event => event.component === expectation.component && event.event === expectation.event && (expectation.diagnosticRunId === undefined || event.runId === expectation.diagnosticRunId));
    const exact = candidates.find(event => fieldsMatch(event, expectation.expectedFields));
    if (exact) return { status: "satisfied", refs: [this.proof("diagnostic", `Diagnostic proof ${expectation.component}/${expectation.event} observed at sequence ${exact.sequence}.`)] };
    if (candidates.length > 0) return { status: "failed", reason: "Required diagnostic event was observed with contradictory fields.", refs: [this.proof("diagnostic", `Diagnostic event ${expectation.component}/${expectation.event} contradicted required fields.`)] };
    return { status: "not-observable", reason: `Required diagnostic proof ${expectation.component}/${expectation.event} is not retained.`, refs: [] };
  }

  private terminalDiagnostic(expectation: ValidationDiagnosticExpectation): Evaluation {
    const device = this.device(expectation.deviceId);
    if (!device) return this.missingDevice(expectation.deviceId);
    if (expectation.diagnosticRunId === undefined) {
      return {
        status: "not-observable",
        reason: "Terminal production proof requires the exact production diagnostic run ID.",
        refs: [],
      };
    }
    if (expectation.component !== "sync.controller" || expectation.event !== "sync-run-complete") {
      return {
        status: "failed",
        reason: "Successful terminal production proof must require sync.controller/sync-run-complete.",
        refs: [],
      };
    }

    const terminal = inspectExactProductionTerminal(device.diagnostics.snapshot(), expectation.diagnosticRunId);
    if (terminal.status === "missing") {
      return { status: "not-observable", reason: terminal.reason, refs: [] };
    }
    if (terminal.status === "ambiguous" || terminal.status === "contradictory") {
      return {
        status: "failed",
        reason: terminal.reason,
        refs: [this.proof("diagnostic", `Terminal evidence for diagnostic run ${expectation.diagnosticRunId} was ${terminal.status}.`)],
      };
    }
    if (terminal.event.event !== expectation.event || !fieldsMatch(terminal.event, expectation.expectedFields)) {
      return {
        status: "failed",
        reason: "Exact production diagnostic run reached a terminal result that contradicts the required successful completion.",
        refs: [this.proof("diagnostic", `Exact terminal event for diagnostic run ${expectation.diagnosticRunId} contradicted required completion fields.`)],
      };
    }
    return {
      status: "satisfied",
      refs: [this.proof("diagnostic", `Exact production terminal sync-run-complete observed for diagnostic run ${expectation.diagnosticRunId} at sequence ${terminal.event.sequence}.`)],
    };
  }

  private async evaluateState(postcondition: ValidationStatePostcondition): Promise<Evaluation> {
    switch (postcondition.kind) {
      case "local-content": return this.localPath(postcondition.deviceId, postcondition.path, "file", postcondition.content);
      case "remote-content": return this.remotePath({ path: postcondition.path, state: "live", remoteObjectId: postcondition.remoteObjectId, content: postcondition.content, revision: postcondition.revision });
      case "remote-identity": {
        if ((postcondition.path === undefined) !== (postcondition.remoteObjectId === undefined)) throw new Error("Remote-identity path and object ID must be supplied together.");
        const identity = await this.validateRemoteIdentity(postcondition.expectedIdentity);
        if (identity.status !== "satisfied" || !postcondition.path || !postcondition.remoteObjectId) return identity;
        return strongest([identity, await this.remotePath({ path: postcondition.path, state: "live", remoteObjectId: postcondition.remoteObjectId })]);
      }
      case "live-trash-absence-state": return this.remotePath({ path: postcondition.path, state: postcondition.expectedState, remoteObjectId: postcondition.remoteObjectId });
      case "base-authority": {
        const loaded = await this.loadAuthority(postcondition.deviceId);
        if (!loaded.state) return loaded.evaluation;
        const base = loaded.state.base.find(entry => entry.path === postcondition.path);
        const authority = loaded.state.baseAuthority.find(entry => entry.path === postcondition.path);
        if (!base || !authority) return { status: "failed", reason: "Required BASE/base-authority entry is missing from trusted state.", refs: loaded.evaluation.refs };
        if (postcondition.expectedFingerprint !== undefined && String(authority.fingerprint) !== postcondition.expectedFingerprint) return { status: "failed", reason: "BASE fingerprint does not match the required authority.", refs: loaded.evaluation.refs };
        if (postcondition.expectedRemoteObjectId !== undefined && base.remoteObjectId !== postcondition.expectedRemoteObjectId) return { status: "failed", reason: "BASE remote identity does not match the required stable object.", refs: loaded.evaluation.refs };
        if (postcondition.expectedContent && !equalContent(base.content?.hash, base.content?.sizeBytes, postcondition.expectedContent)) return { status: "failed", reason: "BASE content evidence does not match required canonical content.", refs: loaded.evaluation.refs };
        return { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("authority", `BASE authority matched at ${diagnosticPathKey(String(postcondition.path))}.`)] };
      }
      case "mapping-or-tombstone": {
        const loaded = await this.loadAuthority(postcondition.deviceId);
        if (!loaded.state) return loaded.evaluation;
        const mapping = loaded.state.remoteMappings.find(entry => entry.path === postcondition.path);
        const tombstone = loaded.state.tombstones.find(entry => entry.path === postcondition.path);
        if (postcondition.expected === "mapping") {
          if (!mapping || tombstone) return { status: "failed", reason: "Trusted state does not contain the required live mapping without tombstone overlap.", refs: loaded.evaluation.refs };
          if (postcondition.remoteObjectId && mapping.remoteObjectId !== postcondition.remoteObjectId) return { status: "failed", reason: "Remote mapping identity mismatch.", refs: loaded.evaluation.refs };
          if (postcondition.entityKind && mapping.entityKind !== postcondition.entityKind) return { status: "failed", reason: "Remote mapping entity-kind mismatch.", refs: loaded.evaluation.refs };
        } else if (postcondition.expected === "tombstone") {
          if (!tombstone || mapping) return { status: "failed", reason: "Trusted state does not contain the required tombstone without a live mapping.", refs: loaded.evaluation.refs };
          if (postcondition.remoteObjectId && tombstone.remoteObjectId !== postcondition.remoteObjectId) return { status: "failed", reason: "Tombstone remote identity mismatch.", refs: loaded.evaluation.refs };
          if (postcondition.entityKind && tombstone.entityKind !== postcondition.entityKind) return { status: "failed", reason: "Tombstone entity-kind mismatch.", refs: loaded.evaluation.refs };
          if (postcondition.deletedOn && tombstone.deletedOn !== postcondition.deletedOn) return { status: "failed", reason: "Tombstone deletion-side mismatch.", refs: loaded.evaluation.refs };
        } else if (mapping || tombstone) return { status: "failed", reason: "Trusted state contains a mapping/tombstone where neither was expected.", refs: loaded.evaluation.refs };
        return { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("authority", `Mapping/tombstone state matched at ${diagnosticPathKey(String(postcondition.path))}.`)] };
      }
      case "authority-generation-or-revision": {
        const loaded = await this.loadAuthority(postcondition.deviceId);
        if (!loaded.state) return loaded.evaluation;
        const mismatch = (postcondition.persistenceRevision !== undefined && String(loaded.state.persistenceRevision) !== postcondition.persistenceRevision)
          || (postcondition.semanticGeneration !== undefined && String(loaded.state.semanticGeneration) !== postcondition.semanticGeneration)
          || (postcondition.stateRevision !== undefined && String(loaded.state.stateRevision) !== postcondition.stateRevision);
        if (mismatch) return { status: "failed", reason: "Trusted authority revision/generation differs from the required value.", refs: loaded.evaluation.refs };
        return { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("authority", "Authority persistence/semantic revision requirements matched.")] };
      }
      case "durable-intent-or-effect": {
        const loaded = await this.loadAuthority(postcondition.deviceId);
        if (!loaded.state) return loaded.evaluation;
        if (postcondition.expected === "none-outstanding") {
          const outstanding = loaded.state.operationIntents.flatMap(intent => intent.effects.filter(effect => effect.stage !== "state-committed"));
          if (outstanding.length) return { status: "failed", reason: `${outstanding.length} durable mutation effect(s) remain outstanding.`, refs: loaded.evaluation.refs };
          return { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("authority", "No outstanding durable mutation effects remain.")] };
        }
        if (postcondition.operationId === undefined) throw new Error("Durable intent/effect presence/absence assertion requires operationId.");
        const intent = loaded.state.operationIntents.find(item => String(item.operationId) === postcondition.operationId);
        const effect = intent && postcondition.effectId !== undefined ? intent.effects.find(item => item.effectId === postcondition.effectId) : undefined;
        const targetPresent = postcondition.effectId !== undefined ? Boolean(effect) : Boolean(intent);
        if (postcondition.expected === "absent") {
          if (targetPresent) return { status: "failed", reason: "Durable intent/effect remains present but absence was required.", refs: loaded.evaluation.refs };
          return { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("authority", "Trusted authority proved required durable intent/effect absence.")] };
        }
        if (!targetPresent) return { status: "failed", reason: "Required durable intent/effect is absent from trusted authority.", refs: loaded.evaluation.refs };
        if (effect && postcondition.stage && effect.stage !== postcondition.stage) return { status: "failed", reason: `Durable effect stage is ${effect.stage}, expected ${postcondition.stage}.`, refs: loaded.evaluation.refs };
        if (effect && postcondition.verificationEvidenceRef && effect.verificationEvidenceRef !== postcondition.verificationEvidenceRef) return { status: "failed", reason: "Durable effect verification reference mismatch.", refs: loaded.evaluation.refs };
        return { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("authority", "Required durable intent/effect and stage were observed.")] };
      }
      case "change-cursor-or-completeness": {
        const loaded = await this.loadAuthority(postcondition.deviceId);
        if (!loaded.state) return loaded.evaluation;
        const evaluations: Evaluation[] = [loaded.evaluation];
        if (postcondition.expectedCursor !== undefined && loaded.state.changeCursor !== postcondition.expectedCursor) evaluations.push({ status: "failed", reason: "Durable change cursor differs from required cursor.", refs: [] });
        if (postcondition.requireNoLearnedRemoteBatches && loaded.state.learnedRemoteBatches.length !== 0) evaluations.push({ status: "failed", reason: "Unreduced learned remote batches remain durable.", refs: [] });
        if (postcondition.requireRemoteComplete) evaluations.push((await this.remoteListing()).evaluation);
        const result = strongest(evaluations);
        return result.status === "satisfied" ? { ...result, refs: [...result.refs, this.proof("authority", "Cursor/completeness requirements were objectively observed.")] } : result;
      }
      case "conflict-provenance": return this.diagnostic(postcondition.diagnostic);
      case "unrelated-mutation-absence": {
        const evaluations: Evaluation[] = [];
        for (const local of postcondition.local) evaluations.push(await this.localPath(local.deviceId, local.path, local.state, local.content));
        for (const remote of postcondition.remote) evaluations.push(await this.remotePath(remote));
        if (!evaluations.length) return { status: "not-observable", reason: "No protected unrelated paths were supplied for mutation-absence proof.", refs: [] };
        const result = strongest(evaluations);
        return result.status === "satisfied" ? { ...result, refs: [...result.refs, this.proof("convergence", "All declared unrelated protected paths remained unchanged.")] } : result;
      }
      case "terminal-product-result": return this.terminalDiagnostic(postcondition.diagnostic);
    }
  }

  private async evaluateConvergence(postcondition: ValidationConvergencePostcondition): Promise<Evaluation> {
    switch (postcondition.kind) {
      case "cross-device-content": {
        if (!postcondition.deviceIds.length) return { status: "not-observable", reason: "No participant devices were supplied.", refs: [] };
        return strongest(await Promise.all(postcondition.deviceIds.map(deviceId => this.localPath(deviceId, postcondition.path, "file", postcondition.content))));
      }
      case "cross-device-path": {
        if (!postcondition.deviceIds.length) return { status: "not-observable", reason: "No participant devices were supplied.", refs: [] };
        return strongest(await Promise.all(postcondition.deviceIds.map(deviceId => this.localPath(deviceId, postcondition.path, postcondition.expected))));
      }
      case "cross-device-authority": {
        if (!postcondition.deviceIds.length) return { status: "not-observable", reason: "No participant devices were supplied.", refs: [] };
        const evaluations: Evaluation[] = [];
        for (const deviceId of postcondition.deviceIds) {
          const loaded = await this.loadAuthority(deviceId);
          if (!loaded.state) { evaluations.push(loaded.evaluation); continue; }
          const base = loaded.state.base.find(entry => entry.path === postcondition.path);
          const fingerprint = loaded.state.baseAuthority.find(entry => entry.path === postcondition.path);
          const mapping = loaded.state.remoteMappings.find(entry => entry.path === postcondition.path);
          const tombstone = loaded.state.tombstones.find(entry => entry.path === postcondition.path);
          let mismatch = false;
          if (postcondition.expectedTombstone === true) mismatch = !tombstone || Boolean(base) || Boolean(mapping);
          else if (postcondition.expectedTombstone === false) mismatch = Boolean(tombstone);
          if (postcondition.expectedFingerprint !== undefined) mismatch ||= String(fingerprint?.fingerprint ?? "") !== postcondition.expectedFingerprint;
          if (postcondition.expectedRemoteObjectId !== undefined) mismatch ||= mapping?.remoteObjectId !== postcondition.expectedRemoteObjectId || base?.remoteObjectId !== postcondition.expectedRemoteObjectId;
          evaluations.push(mismatch
            ? { status: "failed", reason: `Authority facts differ on device ${String(deviceId)}.`, refs: loaded.evaluation.refs }
            : { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("convergence", `Authority facts matched on device ${String(deviceId)}.`)] });
        }
        return strongest(evaluations);
      }
      case "cross-device-conflict-resolution": {
        if (!postcondition.deviceIds.length) return { status: "not-observable", reason: "No participant devices were supplied.", refs: [] };
        const evaluations: Evaluation[] = [];
        for (const deviceId of postcondition.deviceIds) {
          evaluations.push(await this.localPath(deviceId, postcondition.path, "file", postcondition.content));
          const loaded = await this.loadAuthority(deviceId);
          if (!loaded.state) { evaluations.push(loaded.evaluation); continue; }
          const convergence = loaded.state.pathConvergence.find(item => item.path === postcondition.path)?.state;
          evaluations.push(convergence?.status === "converged"
            ? { status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("convergence", `Conflict-resolution path is authoritatively converged on ${String(deviceId)}.`)] }
            : convergence
              ? { status: "failed", reason: `Conflict-resolution path remains ${convergence.status}.`, refs: loaded.evaluation.refs }
              : { status: "not-observable", reason: "Path convergence authority is not recorded.", refs: loaded.evaluation.refs });
        }
        evaluations.push(await this.remotePath({ path: postcondition.path, state: "live", remoteObjectId: postcondition.remoteObjectId, content: postcondition.content }));
        return strongest(evaluations);
      }
      case "final-reconciliation-stable": {
        if (!postcondition.deviceIds.length) return { status: "not-observable", reason: "No participant devices were supplied.", refs: [] };
        const evaluations: Evaluation[] = [this.terminalDiagnostic(postcondition.terminalDiagnostic)];
        for (const deviceId of postcondition.deviceIds) {
          const loaded = await this.loadAuthority(deviceId);
          if (!loaded.state) { evaluations.push(loaded.evaluation); continue; }
          if (postcondition.requireNoOutstandingIntents && loaded.state.operationIntents.some(intent => intent.effects.some(effect => effect.stage !== "state-committed"))) evaluations.push({ status: "failed", reason: `Outstanding durable effects remain on ${String(deviceId)}.`, refs: loaded.evaluation.refs });
          else if (postcondition.requireNoLearnedRemoteBatches && loaded.state.learnedRemoteBatches.length !== 0) evaluations.push({ status: "failed", reason: `Learned remote backlog remains on ${String(deviceId)}.`, refs: loaded.evaluation.refs });
          else if (postcondition.requireAllRecordedPathsConverged && loaded.state.pathConvergence.some(item => item.state.status !== "converged")) evaluations.push({ status: "failed", reason: `Non-converged path authority remains on ${String(deviceId)}.`, refs: loaded.evaluation.refs });
          else evaluations.push({ status: "satisfied", refs: [...loaded.evaluation.refs, this.proof("convergence", `Stable authority conditions observed on ${String(deviceId)}.`)] });
        }
        if (postcondition.requireRemoteComplete) evaluations.push((await this.remoteListing()).evaluation);
        const result = strongest(evaluations);
        return result.status === "satisfied" ? { ...result, refs: [...result.refs, this.proof("convergence", "Final reconciliation stability was fully observable.")] } : result;
      }
    }
  }
}
