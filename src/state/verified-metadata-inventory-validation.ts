/** DEC-339 D339-01: pure bounded shape/graph checks. Never mutation authorization. */
import type { ChangeCursor, PersistenceRevision, RemoteObjectId, SemanticStateGeneration } from "../contracts/common";
import type {
  InventoryCoverage, InventoryDomain, InventoryGeneration, InventoryGenerationManifest,
  InventoryIdentityFence, InventoryMembershipClassification, InventoryOverlayRecord,
  InventoryPublishRequest, InventoryReadResult, InventoryRemoteEntity,
  InventoryTargetedProof, InventoryTargetedProofAssessment,
} from "../contracts/verified-metadata-inventory";

export interface InventoryValidationInput {
  readonly activeGeneration: InventoryGeneration;
  readonly manifests: readonly InventoryGenerationManifest[];
  readonly overlays: readonly InventoryOverlayRecord[];
  readonly coverage: readonly InventoryCoverage[];
  readonly expectedFence: InventoryIdentityFence;
  readonly canonicalCursor: ChangeCursor;
  readonly authorityPersistenceRevision: PersistenceRevision;
  readonly authoritySemanticGeneration: SemanticStateGeneration;
}

export type InventoryValidationResult =
  | { readonly status: "verified-observation"; readonly generation: InventoryGeneration; readonly ambiguousOccupancy: readonly string[] }
  | { readonly status: "invalid" | "unknown" | "partial" | "incompatible" | "stale"; readonly reason: string };

const fail = (reason: string): InventoryValidationResult => ({ status: "invalid", reason });
const validId = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.trim() === x && !/[\u0000-\u001f]/.test(x);
const record = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === "object" && !Array.isArray(x) &&
  (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const integer = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
const domain = (x: unknown): x is InventoryDomain => x === "content" || x === "portable-config";

export function inventoryFenceMatches(a: InventoryIdentityFence, b: InventoryIdentityFence): boolean {
  return a.vaultIdentity === b.vaultIdentity && a.deviceIdentity === b.deviceIdentity &&
    a.pairedAccountKey === b.pairedAccountKey && a.managedRootId === b.managedRootId &&
    a.protocolVersion === b.protocolVersion && a.contentDomainRootId === b.contentDomainRootId &&
    a.configDomainRootId === b.configDomainRootId && a.scopePolicyFingerprint === b.scopePolicyFingerprint &&
    a.inventorySchemaVersion === b.inventorySchemaVersion;
}

function validFence(x: unknown): x is InventoryIdentityFence {
  if (!record(x)) return false;
  return ["vaultIdentity", "deviceIdentity", "pairedAccountKey", "managedRootId",
    "protocolVersion", "contentDomainRootId", "configDomainRootId", "scopePolicyFingerprint"]
    .every(key => validId(x[key])) && integer(x.inventorySchemaVersion) && x.inventorySchemaVersion === 1;
}

function validManifest(x: unknown): x is InventoryGenerationManifest {
  if (!record(x)) return false;
  return validId(x.generation) && (x.parentGeneration === null || validId(x.parentGeneration)) &&
    integer(x.overlayDepth) && validId(x.inputCursor) && validId(x.terminalCursor) &&
    validId(x.baseStartToken) && validFence(x.fence) && validId(x.authorityPersistenceRevision) &&
    validId(x.authoritySemanticGeneration) && integer(x.recordCount) && validId(x.coverageDigest) &&
    validId(x.validationReceipt) && ["staging", "complete", "invalid"].includes(String(x.status));
}

function validEntity(x: unknown): x is InventoryRemoteEntity {
  if (!record(x)) return false;
  return validId(x.generation) && validId(x.remoteObjectId) &&
    (x.parentRemoteObjectId === null || validId(x.parentRemoteObjectId)) &&
    domain(x.domain) && typeof x.name === "string" && x.name.length > 0 &&
    !x.name.includes("/") && !/[\u0000-\u001f]/.test(x.name) && x.name !== "." && x.name !== ".." &&
    (x.kind === "file" || x.kind === "folder") &&
    (x.logicalPath === undefined || validId(x.logicalPath)) &&
    (x.parentRemoteObjectId === null || x.pathValidity !== "verified" ||
      (validId(x.logicalPath) && (x.logicalPath === x.name || x.logicalPath.endsWith(`/${x.name}`)))) &&
    ["verified", "unknown", "invalid"].includes(String(x.pathValidity)) &&
    ["visible", "inaccessible", "unknown"].includes(String(x.access)) &&
    typeof x.trashed === "boolean" && validId(x.managedRootId) && domain(x.provenanceDomain) &&
    (x.revision === undefined || validId(x.revision)) &&
    (x.content === undefined || record(x.content));
}

function validOverlay(x: unknown): x is InventoryOverlayRecord {
  if (!record(x) || !validId(x.generation)) return false;
  return x.kind === "mask" ? validId(x.remoteObjectId) :
    x.kind === "upsert" && validEntity(x.entity) && x.entity.generation === x.generation;
}

function validCoverage(x: unknown): x is InventoryCoverage {
  if (!record(x)) return false;
  return validId(x.generation) && domain(x.domain) && validId(x.scopeId) &&
    (x.scopeKind === "domain" || x.scopeKind === "parent") &&
    ["complete", "partial", "unknown", "invalid"].includes(String(x.state)) &&
    (x.visibility === "app-visible" || x.visibility === "unknown") &&
    typeof x.allPagesRead === "boolean" && typeof x.incompleteSearch === "boolean" &&
    typeof x.provenanceVerified === "boolean" && validId(x.terminalCursor);
}

/** Validates only caller-supplied bounded fixtures/batches, never enumerates an entire live vault. */
export function validateInventoryCandidate(value: unknown, maxRows = 10000): InventoryValidationResult {
  if (!record(value) || !integer(maxRows) || maxRows === 0 ||
      !Array.isArray(value.manifests) || !Array.isArray(value.overlays) || !Array.isArray(value.coverage))
    return fail("invalid-inventory-input");
  const { manifests, overlays, coverage } = value;
  if (manifests.length === 0 || manifests.length + overlays.length + coverage.length > maxRows)
    return fail("missing-or-unbounded-candidate");
  if (!validId(value.activeGeneration) || !validFence(value.expectedFence) ||
      !validId(value.canonicalCursor) || !validId(value.authorityPersistenceRevision) ||
      !validId(value.authoritySemanticGeneration)) return fail("invalid-authority-fence");
  if (!manifests.every(validManifest) || !overlays.every(validOverlay) || !coverage.every(validCoverage))
    return fail("malformed-inventory-record");

  const fence = value.expectedFence;
  const byGen = new Map<string, InventoryGenerationManifest>();
  for (const m of manifests) {
    if (byGen.has(m.generation)) return fail("duplicate-generation-manifest");
    byGen.set(m.generation, m);
  }
  const lineage: InventoryGenerationManifest[] = [];
  const visited = new Set<string>();
  let current = byGen.get(value.activeGeneration);
  while (current) {
    if (visited.has(current.generation)) return fail("cyclic-generation-lineage");
    visited.add(current.generation);
    if (current.status !== "complete" || !inventoryFenceMatches(current.fence, fence))
      return { status: "incompatible", reason: "incomplete-or-mismatched-generation" };
    lineage.unshift(current);
    if (current.parentGeneration === null) {
      if (current.overlayDepth !== 0) return fail("baseline-must-have-zero-depth");
      break;
    }
    const parent = byGen.get(current.parentGeneration);
    if (!parent) return fail("missing-ancestor-generation");
    if (parent.overlayDepth + 1 !== current.overlayDepth ||
        current.inputCursor !== parent.terminalCursor) return fail("discontinuous-overlay-lineage");
    current = parent;
  }
  if (!lineage.length || lineage[0].parentGeneration !== null) return fail("missing-baseline");
  const active = lineage[lineage.length - 1];
  if (active.overlayDepth > 32) return fail("unbounded-overlay-depth");
  if (active.terminalCursor !== value.canonicalCursor ||
      active.authorityPersistenceRevision !== value.authorityPersistenceRevision ||
      active.authoritySemanticGeneration !== value.authoritySemanticGeneration)
    return { status: "stale", reason: "inventory-cursor-or-authority-fence-mismatch" };

  const live = new Map<string, InventoryRemoteEntity>();
  for (const manifest of lineage) {
    const rows = overlays.filter(row => row.generation === manifest.generation);
    if (rows.length !== manifest.recordCount) return fail("staged-row-count-mismatch");
    const touched = new Set<string>();
    for (const row of rows) {
      const id = row.kind === "mask" ? row.remoteObjectId : row.entity.remoteObjectId;
      if (touched.has(id)) return fail("duplicate-stable-id-within-generation");
      touched.add(id);
      if (row.kind === "mask") {
        if (!live.has(id)) return fail("mask-without-predecessor");
        live.delete(id);
      } else {
        const previous = live.get(id);
        if (previous && previous.domain !== row.entity.domain) return fail("cross-domain-id-reclassification");
        live.set(id, row.entity);
      }
    }
  }
  const collisions = new Map<string, number>();
  const ids = new Map<string, InventoryRemoteEntity>(live);
  const root = (d: InventoryDomain) =>
    d === "content" ? String(fence.contentDomainRootId) : String(fence.configDomainRootId);
  let uncertainty = false;
  for (const entity of live.values()) {
    if (entity.managedRootId !== fence.managedRootId || entity.provenanceDomain !== entity.domain)
      return fail("wrong-managed-root-or-domain-provenance");
    if (entity.trashed || entity.access !== "visible" || entity.pathValidity !== "verified")
      uncertainty = true;
    const isRoot = entity.remoteObjectId === root(entity.domain);
    if (isRoot) {
      if (entity.parentRemoteObjectId !== null || entity.kind !== "folder") return fail("invalid-domain-root");
    } else {
      if (!entity.parentRemoteObjectId) return fail("orphan-remote-entity");
      const parent = ids.get(entity.parentRemoteObjectId);
      if (!parent || parent.kind !== "folder" || parent.domain !== entity.domain)
        return fail("missing-or-cross-domain-parent");
      if (entity.logicalPath && parent.logicalPath &&
          String(entity.logicalPath) !== `${String(parent.logicalPath)}/${entity.name}`)
        return fail("stale-derived-descendant-path");
    }
    const ancestors = new Set<string>([entity.remoteObjectId]);
    let cursor: InventoryRemoteEntity | undefined = entity;
    while (cursor && cursor.parentRemoteObjectId !== null) {
      if (ancestors.has(cursor.parentRemoteObjectId)) return fail("remote-ancestry-cycle");
      ancestors.add(cursor.parentRemoteObjectId);
      cursor = ids.get(cursor.parentRemoteObjectId);
    }
    if (!cursor || cursor.remoteObjectId !== root(entity.domain)) return fail("unrooted-ancestry");
    if (!isRoot && entity.parentRemoteObjectId) {
      const key = JSON.stringify([entity.domain, entity.parentRemoteObjectId,
        entity.name.normalize("NFC").toLocaleLowerCase("en-US")]);
      collisions.set(key, (collisions.get(key) ?? 0) + 1);
    }
  }
  for (const d of ["content", "portable-config"] as const) {
    if (!ids.has(root(d))) return fail("missing-domain-root");
    const matching = coverage.filter(c => c.generation === active.generation &&
      c.domain === d && c.scopeKind === "domain" && c.scopeId === root(d));
    if (matching.length !== 1) return fail("missing-or-duplicate-domain-coverage");
    const c = matching[0];
    if (c.state !== "complete" || !c.allPagesRead || c.incompleteSearch ||
        c.visibility !== "app-visible" || !c.provenanceVerified ||
        c.terminalCursor !== active.terminalCursor) uncertainty = true;
  }
  if (uncertainty) return { status: "unknown", reason: "uncertain-record-or-incomplete-coverage" };
  return { status: "verified-observation", generation: active.generation,
    ambiguousOccupancy: [...collisions].filter(([, n]) => n > 1).map(([key]) => key) };
}

/** Absence is scoped to the provider-visible horizon and never authorizes mutation. */
export function classifyInventoryOccupancy(
  coverage: InventoryCoverage | undefined, occupants: readonly RemoteObjectId[],
  expectedCursor: ChangeCursor,
): InventoryReadResult<"present" | "absent"> {
  if (!coverage || coverage.state !== "complete" || !coverage.allPagesRead ||
      coverage.incompleteSearch || !coverage.provenanceVerified ||
      coverage.visibility !== "app-visible" || coverage.terminalCursor !== expectedCursor)
    return { status: "unknown", reason: "incomplete-or-stale-parent-coverage" };
  if (new Set(occupants).size !== occupants.length || occupants.length > 1)
    return { status: "ambiguous", reason: "nonunique-parent-name-occupancy" };
  return { status: "verified-observation", generation: coverage.generation,
    value: occupants.length === 0 ? "absent" : "present" };
}

export function classifyInventoryChangeMembership(
  id: RemoteObjectId, tracked: ReadonlySet<RemoteObjectId>, provenOutside: ReadonlySet<RemoteObjectId>,
): InventoryMembershipClassification {
  return tracked.has(id) ? "tracked-managed-id" :
    provenOutside.has(id) ? "proven-outside-managed-domain" : "unclassifiable-or-lost-access";
}

/** Only a precondition judgment; never an imitation of atomic storage publication. */
export function assessInventoryPublishPreconditions(
  request: InventoryPublishRequest, current: {
    readonly activeGeneration: InventoryGeneration | null;
    readonly canonicalCursor: ChangeCursor | null;
    readonly authorityPersistenceRevision: PersistenceRevision;
    readonly authoritySemanticGeneration: SemanticStateGeneration;
    readonly fence: InventoryIdentityFence;
  },
): InventoryReadResult<"eligible-for-atomic-commit"> {
  if (!inventoryFenceMatches(request.fence, current.fence))
    return { status: "incompatible", reason: "scope-or-device-changed" };
  if (request.expectedActiveGeneration !== current.activeGeneration ||
      request.expectedCanonicalCursor !== current.canonicalCursor ||
      request.expectedAuthorityPersistenceRevision !== current.authorityPersistenceRevision ||
      request.expectedAuthoritySemanticGeneration !== current.authoritySemanticGeneration)
    return { status: "stale", reason: "cursor-or-authority-cas-mismatch" };
  if (!validId(request.candidateGeneration) || !validId(request.nextCanonicalCursor) ||
      !validId(request.validationReceipt))
    return { status: "invalid", reason: "malformed-publish-candidate" };
  return { status: "verified-observation", generation: request.candidateGeneration,
    value: "eligible-for-atomic-commit" };
}

/** No inventory row or stale read can substitute for a fresh, purpose-specific physical check. */
export function validateInventoryTargetedProof(
  candidate: unknown, expectedSemanticGeneration: SemanticStateGeneration,
): InventoryTargetedProofAssessment {
  if (!record(candidate)) return { status: "unknown", reason: "missing-targeted-proof" };
  const p = candidate as Partial<InventoryTargetedProof>;
  if (!validId(p.remoteObjectId) || !validId(p.parentRemoteObjectId) ||
      !validId(p.name) || !domain(p.domain) || !validId(expectedSemanticGeneration) ||
      p.authoritySemanticGeneration !== expectedSemanticGeneration ||
      p.siblingCoverage !== "complete" || p.nonLocalManagedProvenance !== "verified-current" ||
      !["precondition", "effect-convergence", "durable-recovery"].includes(String(p.purpose)) ||
      !Array.isArray(p.siblingIds) || !p.siblingIds.every(validId))
    return { status: "unknown", reason: "stale-or-unproved-physical-read" };
  if (p.siblingIds.length !== 1 || p.siblingIds[0] !== p.remoteObjectId)
    return { status: "ambiguous", reason: "physical-sibling-occupancy-unproved" };
  return { status: "structurally-eligible", purpose: p.purpose as InventoryTargetedProof["purpose"] };
}
