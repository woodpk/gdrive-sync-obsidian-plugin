import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BinaryContentSource,
  type LocalObservation,
  type ManagedRemoteIdentity,
  type RemoteEntry,
  type RemoteListing,
  type VaultPath,
} from "../src/contracts";
import type { DiagnosticEvent } from "../src/diagnostics/diagnostic-logger";
import type { DurableSynchronizationAuthorityState } from "../src/state/persistent-state-store";
import { sha256Bytes } from "../src/util/sha256";
import {
  StateConvergenceVerifier,
  type ValidationAuthorityReadSource,
  type ValidationDeviceObservationSource,
  type ValidationLocalReadSource,
  type ValidationRemoteReadSource,
  type ValidationStateConvergenceRequest,
} from "../src/validation/state-convergence-verifier";
import { validationAssertionId } from "../src/validation/driver-plan-fault-verifier-contracts";
import { validationDeviceId, validationRunIdentity } from "../src/validation/run-sandbox-checkpoint-contracts";

const encoder = new TextEncoder();
const run = validationRunIdentity("run-vh08-d02", "D02");
const desktopId = validationDeviceId("desktop-vh08");
const mobileId = validationDeviceId("mobile-vh08");
const notePath = contractId<"VaultPath">("fixture/note.md");
const sentinelPath = contractId<"VaultPath">("fixture/sentinel.bin");
const deletedPath = contractId<"VaultPath">("fixture/deleted.md");
const missingPath = contractId<"VaultPath">("fixture/missing.md");
const noteBytes = encoder.encode("resolved content\n");
const sentinelBytes = Uint8Array.from([0, 1, 2, 3, 254, 255]);
const noteHash = sha256Bytes(noteBytes);
const sentinelHash = sha256Bytes(sentinelBytes);
const noteRemoteId = contractId<"RemoteObjectId">("remote-note-1");
const sentinelRemoteId = contractId<"RemoteObjectId">("remote-sentinel-1");
const deletedRemoteId = contractId<"RemoteObjectId">("remote-deleted-1");
const cursor = contractId<"ChangeCursor">("cursor-vh08");
const generation = contractId<"SemanticStateGeneration">("gen-9");
const revision = contractId<"StateRevision">("rev-9");
const fingerprint = contractId<"BaseFingerprint">("base-note-9");
const operationId = contractId<"OperationId">("op-vh08");

function binary(bytes: Uint8Array): BinaryContentSource {
  return {
    sizeBytes: bytes.byteLength,
    async *openChunks() { yield bytes.slice(); },
  };
}

function presentFile(path: VaultPath, bytes: Uint8Array, token: string): LocalObservation {
  return {
    status: "present",
    side: "local",
    path,
    entityKind: "file",
    content: { hash: sha256Bytes(bytes), sizeBytes: bytes.byteLength },
    stability: "stable",
    observationToken: contractId<"ObservationToken">(token),
  };
}

function localSource(entries: ReadonlyMap<string, Uint8Array>): ValidationLocalReadSource {
  const observe = async (path: VaultPath): Promise<LocalObservation> => {
    const bytes = entries.get(String(path));
    return bytes
      ? presentFile(path, bytes, `token:${String(path)}`)
      : { status: "absent", side: "local", path };
  };
  return {
    enumerate: async () => ({ entries: await Promise.all([...entries.keys()].map(path => observe(contractId<"VaultPath">(path)))), completeness: { status: "complete" } }),
    observe,
    readFileBypassingEvidenceCache: async path => {
      const bytes = entries.get(String(path));
      if (!bytes) throw new Error("absent");
      return {
        content: binary(bytes),
        evidence: { hash: sha256Bytes(bytes), sizeBytes: bytes.byteLength },
        stability: "stable",
        observationToken: contractId<"ObservationToken">(`token:${String(path)}`),
      };
    },
  };
}

function authorityState(device: string): DurableSynchronizationAuthorityState {
  return {
    schemaVersion: 1,
    authoritySchemaVersion: 2,
    stateRevision: revision,
    persistenceRevision: revision,
    semanticGeneration: generation,
    vaultIdentity: contractId<"VaultIdentity">("vault-vh08"),
    deviceIdentity: contractId<"DeviceIdentity">(device),
    base: [{
      path: notePath,
      entityKind: "file",
      localExisted: true,
      remoteExisted: true,
      content: { hash: noteHash, sizeBytes: noteBytes.byteLength, revision: "drive-rev-7" },
      remoteObjectId: noteRemoteId,
    }],
    baseAuthority: [{ path: notePath, fingerprint }],
    remoteMappings: [{ path: notePath, remoteObjectId: noteRemoteId, entityKind: "file" }],
    tombstones: [{ path: deletedPath, entityKind: "file", deletedOn: "both", remoteObjectId: deletedRemoteId }],
    changeCursor: cursor,
    operations: [],
    knownDevices: [{ deviceId: contractId<"DeviceIdentity">(device), stale: false }],
    learnedRemoteBatches: [],
    learnedRemoteReductions: [],
    pathConvergence: [{ path: notePath, state: { status: "converged", generation, baseFingerprint: fingerprint } }],
    operationIntents: [{
      logicalKind: "single-effect",
      operationId,
      intentId: contractId<"MutationIntentId">("intent-vh08"),
      semanticAuthority: { generation },
      effects: [{
        effectId: "effect-vh08",
        descriptor: {
          kind: "local-file",
          targetSide: "local",
          mutationKind: "create",
          targetPath: notePath,
          localTransactionId: contractId<"LocalMutationTransactionId">("tx-vh08"),
          intendedContent: { algorithm: "sha256", hash: noteHash, sizeBytes: noteBytes.byteLength },
        },
        stage: "state-committed",
        verificationEvidenceRef: "verify:v1",
      }],
    }],
    localTransactions: [],
  };
}

function authoritySource(state: DurableSynchronizationAuthorityState): ValidationAuthorityReadSource {
  return { loadAuthority: async () => ({ status: "trusted", state }) };
}

function diagnostics(): readonly DiagnosticEvent[] {
  return [
    {
      timestamp: "2026-09-15T18:00:00.000Z",
      sequence: 1,
      level: "info",
      component: "sync.execute",
      event: "conflict-resolution-complete",
      runId: 7,
      platform: "desktop",
      fields: { result: "resolved", pathKey: "path-sha256:test" },
    },
    {
      timestamp: "2026-09-15T18:00:01.000Z",
      sequence: 2,
      level: "info",
      component: "sync.controller",
      event: "sync-run-complete",
      runId: 7,
      platform: "desktop",
      fields: { stage: "terminal", result: "complete" },
    },
  ];
}

function device(deviceId: typeof desktopId | typeof mobileId, state: DurableSynchronizationAuthorityState): ValidationDeviceObservationSource {
  return {
    deviceId,
    local: localSource(new Map([[String(notePath), noteBytes], [String(sentinelPath), sentinelBytes]])),
    authority: authoritySource(state),
    diagnostics: { snapshot: diagnostics },
  };
}

const identity: ManagedRemoteIdentity = {
  rootId: contractId<"RemoteObjectId">("root-vh08"),
  vaultIdentity: contractId<"VaultIdentity">("vault-vh08"),
  protocolVersion: contractId<"ProtocolVersion">("1"),
};

function remoteEntries(): readonly RemoteEntry[] {
  return [
    { path: notePath, entityKind: "file", remoteObjectId: noteRemoteId, content: { hash: noteHash, sizeBytes: noteBytes.byteLength, revision: "drive-rev-7" }, trashed: false },
    { path: sentinelPath, entityKind: "file", remoteObjectId: sentinelRemoteId, content: { hash: sentinelHash, sizeBytes: sentinelBytes.byteLength, revision: "drive-rev-s" }, trashed: false },
    { path: deletedPath, entityKind: "file", remoteObjectId: deletedRemoteId, trashed: true },
  ];
}

function remoteSource(completeness: RemoteListing["completeness"] = { status: "complete" }): ValidationRemoteReadSource {
  const downloads = new Map([
    [String(noteRemoteId), noteBytes],
    [String(sentinelRemoteId), sentinelBytes],
  ]);
  return {
    validateManagedRoot: async expected => ({ ok: true, value: { status: "valid", identity: expected } }),
    listForReconciliation: async () => ({ ok: true, value: { entries: remoteEntries(), completeness } }),
    download: async remoteObjectId => {
      const bytes = downloads.get(String(remoteObjectId));
      return bytes
        ? { ok: true, value: { content: binary(bytes), remoteObjectId, evidence: { hash: sha256Bytes(bytes), sizeBytes: bytes.byteLength } } }
        : { ok: false, signal: { kind: "not-found", remoteObjectId } };
    },
  };
}

function stateAssertion(kind: Parameters<typeof validationAssertionId>[0] extends never ? never : string, actualKind: ValidationStateConvergenceRequest["state"][number]["kind"]) {
  return { assertionId: validationAssertionId(kind), kind: actualKind, subject: kind, expectation: `Verify ${actualKind}` };
}
function convergenceAssertion(id: string, kind: ValidationStateConvergenceRequest["convergence"][number]["kind"]) {
  return { assertionId: validationAssertionId(id), kind, subject: id, expectation: `Verify ${kind}` };
}

function completeRequest(): ValidationStateConvergenceRequest {
  return {
    run,
    state: [
      { kind: "local-content", assertion: stateAssertion("s-local", "local-content"), deviceId: desktopId, path: notePath, content: { hash: noteHash, sizeBytes: noteBytes.byteLength } },
      { kind: "remote-content", assertion: stateAssertion("s-remote", "remote-content"), path: notePath, content: { hash: noteHash, sizeBytes: noteBytes.byteLength }, remoteObjectId: noteRemoteId, revision: "drive-rev-7" },
      { kind: "remote-identity", assertion: stateAssertion("s-identity", "remote-identity"), expectedIdentity: identity, path: notePath, remoteObjectId: noteRemoteId },
      { kind: "live-trash-absence-state", assertion: stateAssertion("s-live", "live-trash-absence-state"), path: notePath, expectedState: "live", remoteObjectId: noteRemoteId },
      { kind: "live-trash-absence-state", assertion: stateAssertion("s-trash", "live-trash-absence-state"), path: deletedPath, expectedState: "trashed", remoteObjectId: deletedRemoteId },
      { kind: "live-trash-absence-state", assertion: stateAssertion("s-absence", "live-trash-absence-state"), path: missingPath, expectedState: "absent" },
      { kind: "base-authority", assertion: stateAssertion("s-base", "base-authority"), deviceId: desktopId, path: notePath, expectedFingerprint: String(fingerprint), expectedRemoteObjectId: noteRemoteId, expectedContent: { hash: noteHash, sizeBytes: noteBytes.byteLength } },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("s-map", "mapping-or-tombstone"), deviceId: desktopId, path: notePath, expected: "mapping", remoteObjectId: noteRemoteId, entityKind: "file" },
      { kind: "mapping-or-tombstone", assertion: stateAssertion("s-tomb", "mapping-or-tombstone"), deviceId: desktopId, path: deletedPath, expected: "tombstone", remoteObjectId: deletedRemoteId, entityKind: "file", deletedOn: "both" },
      { kind: "authority-generation-or-revision", assertion: stateAssertion("s-rev", "authority-generation-or-revision"), deviceId: desktopId, persistenceRevision: String(revision), semanticGeneration: String(generation), stateRevision: String(revision) },
      { kind: "durable-intent-or-effect", assertion: stateAssertion("s-effect", "durable-intent-or-effect"), deviceId: desktopId, operationId: String(operationId), effectId: "effect-vh08", expected: "present", stage: "state-committed", verificationEvidenceRef: "verify:v1" },
      { kind: "change-cursor-or-completeness", assertion: stateAssertion("s-cursor", "change-cursor-or-completeness"), deviceId: desktopId, expectedCursor: cursor, requireRemoteComplete: true, requireNoLearnedRemoteBatches: true },
      { kind: "conflict-provenance", assertion: stateAssertion("s-conflict", "conflict-provenance"), diagnostic: { deviceId: desktopId, component: "sync.execute", event: "conflict-resolution-complete", diagnosticRunId: 7, expectedFields: { result: "resolved" } } },
      { kind: "unrelated-mutation-absence", assertion: stateAssertion("s-unrelated", "unrelated-mutation-absence"), local: [{ deviceId: desktopId, path: sentinelPath, state: "file", content: { hash: sentinelHash, sizeBytes: sentinelBytes.byteLength } }, { deviceId: mobileId, path: sentinelPath, state: "file", content: { hash: sentinelHash, sizeBytes: sentinelBytes.byteLength } }], remote: [{ path: sentinelPath, state: "live", remoteObjectId: sentinelRemoteId, content: { hash: sentinelHash, sizeBytes: sentinelBytes.byteLength }, revision: "drive-rev-s" }] },
      { kind: "terminal-product-result", assertion: stateAssertion("s-terminal", "terminal-product-result"), diagnostic: { deviceId: desktopId, component: "sync.controller", event: "sync-run-complete", diagnosticRunId: 7, expectedFields: { result: "complete", stage: "terminal" } } },
    ],
    convergence: [
      { kind: "cross-device-content", assertion: convergenceAssertion("c-content", "cross-device-content"), deviceIds: [desktopId, mobileId], path: notePath, content: { hash: noteHash, sizeBytes: noteBytes.byteLength } },
      { kind: "cross-device-path", assertion: convergenceAssertion("c-path", "cross-device-path"), deviceIds: [desktopId, mobileId], path: notePath, expected: "file" },
      { kind: "cross-device-authority", assertion: convergenceAssertion("c-authority", "cross-device-authority"), deviceIds: [desktopId, mobileId], path: notePath, expectedFingerprint: String(fingerprint), expectedRemoteObjectId: noteRemoteId, expectedTombstone: false },
      { kind: "cross-device-conflict-resolution", assertion: convergenceAssertion("c-conflict", "cross-device-conflict-resolution"), deviceIds: [desktopId, mobileId], path: notePath, content: { hash: noteHash, sizeBytes: noteBytes.byteLength }, remoteObjectId: noteRemoteId },
      { kind: "final-reconciliation-stable", assertion: convergenceAssertion("c-final", "final-reconciliation-stable"), deviceIds: [desktopId, mobileId], terminalDiagnostic: { deviceId: desktopId, component: "sync.controller", event: "sync-run-complete", diagnosticRunId: 7, expectedFields: { result: "complete", stage: "terminal" } }, requireRemoteComplete: true, requireNoOutstandingIntents: true, requireNoLearnedRemoteBatches: true, requireAllRecordedPathsConverged: true },
    ],
  };
}

test("VH08 PASS requires complete authoritative local/remote/state/diagnostic and convergence proof", async () => {
  const verifier = new StateConvergenceVerifier({
    devices: [device(desktopId, authorityState("device-desktop")), device(mobileId, authorityState("device-mobile"))],
    remote: { identity, drive: remoteSource() },
  });
  const report = await verifier.verify(completeRequest());
  assert.equal(report.result.verdict, "pass");
  assert.ok(report.evidence.length > 20);
  for (const observation of [...report.result.state.observations, ...report.result.convergence.observations]) {
    assert.equal(observation.status, "satisfied");
    assert.ok(observation.evidenceRefs.length > 0);
  }
});

test("missing completeness/terminal proof is BLOCKED, never PASS", async () => {
  const desktop = device(desktopId, authorityState("device-desktop"));
  const verifier = new StateConvergenceVerifier({
    devices: [{ ...desktop, diagnostics: { snapshot: () => [] } }],
    remote: { identity, drive: remoteSource({ status: "partial", reason: "injected partial enumeration" }) },
  });
  const request: ValidationStateConvergenceRequest = {
    run,
    state: [{ kind: "live-trash-absence-state", assertion: stateAssertion("blocked-absence", "live-trash-absence-state"), path: missingPath, expectedState: "absent" }],
    convergence: [{ kind: "final-reconciliation-stable", assertion: convergenceAssertion("blocked-final", "final-reconciliation-stable"), deviceIds: [desktopId], terminalDiagnostic: { deviceId: desktopId, component: "sync.controller", event: "sync-run-complete", diagnosticRunId: 7, expectedFields: { result: "complete", stage: "terminal" } }, requireRemoteComplete: true, requireNoOutstandingIntents: true }],
  };
  const report = await verifier.verify(request);
  assert.equal(report.result.verdict, "blocked");
  assert.equal(report.result.state.verdict, "blocked");
  assert.equal(report.result.convergence.verdict, "blocked");
});

test("concrete byte mismatch is FAIL and dominates an unrelated BLOCKED convergence proof", async () => {
  const badDesktop: ValidationDeviceObservationSource = {
    ...device(desktopId, authorityState("device-desktop")),
    local: localSource(new Map([[String(notePath), encoder.encode("wrong bytes")]])),
  };
  const verifier = new StateConvergenceVerifier({ devices: [badDesktop], remote: { identity, drive: remoteSource() } });
  const request: ValidationStateConvergenceRequest = {
    run,
    state: [{ kind: "local-content", assertion: stateAssertion("fail-bytes", "local-content"), deviceId: desktopId, path: notePath, content: { hash: noteHash, sizeBytes: noteBytes.byteLength } }],
    convergence: [{ kind: "cross-device-path", assertion: convergenceAssertion("blocked-mobile", "cross-device-path"), deviceIds: [desktopId, mobileId], path: notePath, expected: "file" }],
  };
  const report = await verifier.verify(request);
  assert.equal(report.result.verdict, "fail");
  assert.equal(report.result.state.verdict, "fail");
  assert.equal(report.result.convergence.verdict, "blocked");
});

test("read-source types do not expose production mutation authority", () => {
  if (false) {
    const local = {} as ValidationLocalReadSource;
    const remote = {} as ValidationRemoteReadSource;
    const authority = {} as ValidationAuthorityReadSource;
    // @ts-expect-error validation local source deliberately excludes mutation methods.
    void local.trash(notePath);
    // @ts-expect-error validation remote source deliberately excludes mutation methods.
    void remote.trash(noteRemoteId);
    // @ts-expect-error validation authority source deliberately excludes persistence mutation methods.
    void authority.saveAuthority;
  }
  assert.ok(true);
});
