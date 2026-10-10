import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type ChangeCursor, type DeviceIdentity, type PersistenceRevision,
  type ProtocolVersion, type RemoteObjectId, type SemanticStateGeneration,
  type VaultIdentity, type VaultPath, type InventoryCoverage, type InventoryDomain,
  type InventoryGeneration, type InventoryGenerationManifest, type InventoryIdentityFence,
  type InventoryOverlayRecord, type InventoryPublishRequest, type InventoryRemoteEntity,
} from "../src/contracts";
import {
  assessInventoryPublishPreconditions, classifyInventoryChangeMembership,
  classifyInventoryOccupancy, inventoryFenceMatches, validateInventoryCandidate,
  validateInventoryTargetedProof, type InventoryValidationInput,
} from "../src/state/verified-metadata-inventory-validation";

const id = (v: string) => contractId<"RemoteObjectId">(v) as RemoteObjectId;
const gen = (v: string) => v as InventoryGeneration;
const token = (v: string) => contractId<"ChangeCursor">(v) as ChangeCursor;
const rev = (v: string) => contractId<"StateRevision">(v) as PersistenceRevision;
const semantic = (v: string) => contractId<"SemanticStateGeneration">(v) as SemanticStateGeneration;
const contentRoot = id("drive:content");
const configRoot = id("drive:config");
const managedRoot = id("drive:managed");
const g0 = gen("inventory:g0");
const c0 = token("cursor:0");
const c1 = token("cursor:1");
const r1 = rev("state:1");
const s1 = semantic("semantic:1");
const fence: InventoryIdentityFence = {
  vaultIdentity: contractId<"VaultIdentity">("vault:x") as VaultIdentity,
  deviceIdentity: contractId<"DeviceIdentity">("device:x") as DeviceIdentity,
  pairedAccountKey: "opaque-account-pairing",
  managedRootId: managedRoot,
  protocolVersion: contractId<"ProtocolVersion">("1") as ProtocolVersion,
  contentDomainRootId: contentRoot, configDomainRootId: configRoot,
  scopePolicyFingerprint: "scope:stable", inventorySchemaVersion: 1,
};

function entity(
  name: string, remoteObjectId: RemoteObjectId, parentRemoteObjectId: RemoteObjectId | null,
  domain: InventoryDomain, generation: InventoryGeneration = g0, path?: string,
  kind: "file" | "folder" = "file",
): InventoryRemoteEntity {
  return { generation, name, remoteObjectId, parentRemoteObjectId, domain, kind,
    ...(path === undefined ? {} : { logicalPath: contractId<"VaultPath">(path) as VaultPath }),
    pathValidity: "verified", access: "visible", trashed: false, managedRootId: managedRoot,
    provenanceDomain: domain };
}
const row = (e: InventoryRemoteEntity): InventoryOverlayRecord =>
  ({ kind: "upsert", generation: e.generation, entity: e });
function coverage(domain: InventoryDomain, generation = g0, cursor = c1): InventoryCoverage {
  return { generation, domain, scopeId: domain === "content" ? contentRoot : configRoot,
    scopeKind: "domain", state: "complete", visibility: "app-visible", allPagesRead: true,
    incompleteSearch: false, provenanceVerified: true, terminalCursor: cursor };
}
function manifest(
  generation = g0, parentGeneration: InventoryGeneration | null = null, overlayDepth = 0,
  inputCursor = c0, terminalCursor = c1, recordCount = 4,
): InventoryGenerationManifest {
  return { generation, parentGeneration, overlayDepth, inputCursor, terminalCursor,
    baseStartToken: c0, fence, authorityPersistenceRevision: r1,
    authoritySemanticGeneration: s1, recordCount, coverageDigest: "digest:complete",
    validationReceipt: "validation:complete", status: "complete" };
}
function baseline(): InventoryValidationInput {
  return {
    activeGeneration: g0,
    manifests: [manifest()],
    overlays: [
      row(entity("content-root", contentRoot, null, "content", g0, undefined, "folder")),
      row(entity("config-root", configRoot, null, "portable-config", g0, undefined, "folder")),
      row(entity("same.md", id("drive:a"), contentRoot, "content", g0, "same.md")),
      row(entity("same.md", id("drive:b"), contentRoot, "content", g0, "same.md")),
    ],
    coverage: [coverage("content"), coverage("portable-config")],
    expectedFence: fence, canonicalCursor: c1,
    authorityPersistenceRevision: r1, authoritySemanticGeneration: s1,
  };
}

test("full scoped baseline preserves legal duplicate names as explicit ambiguity", () => {
  const actual = validateInventoryCandidate(baseline());
  assert.equal(actual.status, "verified-observation");
  if (actual.status === "verified-observation") assert.equal(actual.ambiguousOccupancy.length, 1);
  const first = coverage("content");
  assert.deepEqual(classifyInventoryOccupancy(first, [], c1),
    { status: "verified-observation", generation: g0, value: "absent" });
  assert.equal(classifyInventoryOccupancy(first, [id("drive:a"), id("drive:b")], c1).status, "ambiguous");
});

test("valid three-generation lineage applies ID masks without resurrecting predecessor", () => {
  const g1 = gen("inventory:g1"), g2 = gen("inventory:g2");
  const c2 = token("cursor:2"), c3 = token("cursor:3");
  const original = baseline();
  const candidate: InventoryValidationInput = {
    ...original, activeGeneration: g2, canonicalCursor: c3,
    manifests: [...original.manifests, manifest(g1, g0, 1, c1, c2, 1), manifest(g2, g1, 2, c2, c3, 1)],
    overlays: [...original.overlays,
      { kind: "mask", generation: g1, remoteObjectId: id("drive:a") },
      row(entity("different.md", id("drive:c"), contentRoot, "content", g2, "different.md"))],
    coverage: [...original.coverage, coverage("content", g2, c3), coverage("portable-config", g2, c3)],
  };
  const result = validateInventoryCandidate(candidate);
  assert.equal(result.status, "verified-observation");
  if (result.status === "verified-observation") assert.deepEqual(result.ambiguousOccupancy, []);
  const missingParent = { ...candidate, manifests: candidate.manifests.filter(m => m.generation !== g1) };
  assert.equal(validateInventoryCandidate(missingParent).status, "invalid");
  const brokenCursor = { ...candidate, manifests: candidate.manifests.map(m => m.generation === g2 ?
    { ...m, inputCursor: c0 } : m) };
  assert.equal(validateInventoryCandidate(brokenCursor).status, "invalid");
});

test("cycles and unbounded overlay depth cannot be promoted", () => {
  const base = baseline();
  const g1 = gen("inventory:g1"), g2 = gen("inventory:g2");
  const cycle = { ...base, activeGeneration: g2,
    manifests: [manifest(g1, g2, 1, c1, c1, 0), manifest(g2, g1, 2, c1, c1, 0)] };
  assert.equal(validateInventoryCandidate(cycle).status, "invalid");
  assert.equal(validateInventoryCandidate({
    ...base, manifests: [{ ...base.manifests[0], overlayDepth: 33 }],
  }).status, "invalid");
});

test("duplicate stable ID in same generation and orphaned/cross-domain parent fail integrity", () => {
  const base = baseline();
  const duplicate = { ...base, manifests: [{ ...base.manifests[0], recordCount: 5 }],
    overlays: [...base.overlays, base.overlays[2]] };
  assert.match((validateInventoryCandidate(duplicate) as { reason: string }).reason, /duplicate-stable-id/);
  const orphan = { ...base, overlays: base.overlays.map(v =>
    v.kind === "upsert" && v.entity.remoteObjectId === id("drive:a") ?
      row({ ...v.entity, parentRemoteObjectId: id("absent-parent") }) : v) };
  assert.equal(validateInventoryCandidate(orphan).status, "invalid");
  const crossDomain = { ...base, overlays: base.overlays.map(v =>
    v.kind === "upsert" && v.entity.remoteObjectId === id("drive:a") ?
      row({ ...v.entity, parentRemoteObjectId: configRoot }) : v) };
  assert.equal(validateInventoryCandidate(crossDomain).status, "invalid");
});

test("stale descendant path and parent ancestry cycle fail closed", () => {
  const base = baseline();
  const folderId = id("drive:folder");
  const folder = entity("nested", folderId, contentRoot, "content", g0, "nested", "folder");
  const child = entity("x.md", id("drive:child"), folderId, "content", g0, "wrong.md");
  const candidate = { ...base, manifests: [{ ...base.manifests[0], recordCount: 6 }],
    overlays: [...base.overlays, row(folder), row(child)] };
  assert.equal(validateInventoryCandidate(candidate).status, "invalid");
  const ancestryCycle = { ...candidate, overlays: candidate.overlays.map(v =>
    v.kind === "upsert" && v.entity.remoteObjectId === folderId ?
      row({ ...v.entity, parentRemoteObjectId: id("drive:child") }) : v) };
  assert.equal(validateInventoryCandidate(ancestryCycle).status, "invalid");
});

test("partial searches, access loss, staleness and mismatched authority never prove absence", () => {
  const base = baseline();
  const badCoverage = { ...base, coverage: [
    { ...base.coverage[0], incompleteSearch: true }, base.coverage[1]] };
  assert.equal(validateInventoryCandidate(badCoverage).status, "unknown");
  assert.equal(classifyInventoryOccupancy(badCoverage.coverage[0], [], c1).status, "unknown");
  assert.equal(classifyInventoryOccupancy(coverage("content"), [], c0).status, "unknown");
  const unreadable = { ...base, overlays: base.overlays.map(v =>
    v.kind === "upsert" && v.entity.remoteObjectId === id("drive:a") ?
      row({ ...v.entity, access: "inaccessible" as const }) : v) };
  assert.equal(validateInventoryCandidate(unreadable).status, "unknown");
  assert.equal(validateInventoryCandidate({ ...base, canonicalCursor: c0 }).status, "stale");
  assert.equal(validateInventoryCandidate({ ...base, expectedFence: { ...fence,
    scopePolicyFingerprint: "scope:changed" } }).status, "incompatible");
});

test("invalid provenance and domain root cannot become complete", () => {
  const base = baseline();
  const invalid = { ...base, overlays: base.overlays.map(v =>
    v.kind === "upsert" && v.entity.remoteObjectId === id("drive:a") ?
      row({ ...v.entity, managedRootId: id("wrong-root") }) : v) };
  assert.equal(validateInventoryCandidate(invalid).status, "invalid");
  assert.equal(inventoryFenceMatches(fence, { ...fence, deviceIdentity:
    contractId<"DeviceIdentity">("different") as DeviceIdentity }), false);
});

test("unknown account-wide Changes event is not silently considered unrelated", () => {
  const tracked = new Set<RemoteObjectId>([id("tracked")]);
  const outside = new Set<RemoteObjectId>([id("outside")]);
  assert.equal(classifyInventoryChangeMembership(id("tracked"), tracked, outside), "tracked-managed-id");
  assert.equal(classifyInventoryChangeMembership(id("outside"), tracked, outside), "proven-outside-managed-domain");
  assert.equal(classifyInventoryChangeMembership(id("lost-access"), tracked, outside), "unclassifiable-or-lost-access");
});

test("publish guard checks canonical cursor and both authority revisions without asserting commit", () => {
  const current = { activeGeneration: g0, canonicalCursor: c1,
    authorityPersistenceRevision: r1, authoritySemanticGeneration: s1, fence };
  const request: InventoryPublishRequest = {
    candidateGeneration: gen("inventory:g1"), validationReceipt: "checked",
    expectedActiveGeneration: g0, expectedCanonicalCursor: c1, nextCanonicalCursor: token("cursor:2"),
    expectedAuthorityPersistenceRevision: r1, expectedAuthoritySemanticGeneration: s1, fence,
  };
  const eligible = assessInventoryPublishPreconditions(request, current);
  assert.equal(eligible.status, "verified-observation");
  if (eligible.status === "verified-observation") assert.equal(eligible.value, "eligible-for-atomic-commit");
  assert.equal(assessInventoryPublishPreconditions({ ...request, expectedCanonicalCursor: c0 }, current).status, "stale");
  assert.equal(assessInventoryPublishPreconditions(request, { ...current, authorityPersistenceRevision: rev("state:2") }).status, "stale");
  assert.equal(assessInventoryPublishPreconditions(request, { ...current, fence: { ...fence,
    pairedAccountKey: "wrong-account" } }).status, "incompatible");
});

test("targeted convergence rejects stale, nonlocal provenance gap, ambiguous siblings and cached-only facts", () => {
  const proof = {
    remoteObjectId: id("object:one"), parentRemoteObjectId: contentRoot,
    name: "one.md", domain: "content" as const, siblingIds: [id("object:one")],
    siblingCoverage: "complete" as const, nonLocalManagedProvenance: "verified-current" as const,
    authoritySemanticGeneration: s1, purpose: "effect-convergence" as const,
  };
  assert.equal(validateInventoryTargetedProof(proof, s1).status, "structurally-eligible");
  assert.equal(validateInventoryTargetedProof(proof, semantic("semantic:old")).status, "unknown");
  assert.equal(validateInventoryTargetedProof({ ...proof, nonLocalManagedProvenance: "cached" }, s1).status, "unknown");
  assert.equal(validateInventoryTargetedProof({ ...proof,
    siblingIds: [id("object:one"), id("object:two")] }, s1).status, "ambiguous");
  assert.equal(validateInventoryTargetedProof({ remoteObjectId: id("object:one") }, s1).status, "unknown");
});

test("hostile/nonplain records and invalid counters fail closed", () => {
  assert.equal(validateInventoryCandidate(Object.assign(Object.create({ inherited: true }), baseline())).status, "invalid");
  const base = baseline();
  assert.equal(validateInventoryCandidate({ ...base, manifests: [{
    ...base.manifests[0], recordCount: Number.POSITIVE_INFINITY }] }).status, "invalid");
  assert.equal(validateInventoryCandidate({ ...base, manifests: [{
    ...base.manifests[0], validationReceipt: "" }] }).status, "invalid");
  assert.equal(validateInventoryCandidate({ ...base, expectedFence: {
    ...fence, inventorySchemaVersion: -1 } }).status, "invalid");
  assert.equal(validateInventoryCandidate({ ...base, expectedFence: {
    ...fence, inventorySchemaVersion: 999 } }).status, "invalid");
  assert.equal(validateInventoryCandidate({ ...base, overlays: [] }).status, "invalid");
});
