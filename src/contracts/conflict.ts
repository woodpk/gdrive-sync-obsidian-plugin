import type { ConflictId, DeviceIdentity, RemoteObjectId, VaultPath, VersionReference } from "./common";
export interface ConflictProvenance { readonly source: "base" | "local" | "remote"; readonly version: VersionReference; readonly deviceId?: DeviceIdentity; readonly remoteObjectId?: RemoteObjectId; readonly advisoryObservedAtMs?: number; }
export interface ConcurrentAlternates { readonly local: ConflictProvenance; readonly remote: ConflictProvenance; readonly base?: ConflictProvenance; }
export interface ThreeWayProvenance extends ConcurrentAlternates { readonly base: ConflictProvenance; }
export type ConflictAssessment =
  | { readonly kind: "none" }
  | { readonly kind: "clean-merge"; readonly path: VaultPath; readonly mergedVersion: VersionReference; readonly provenance: ThreeWayProvenance }
  | { readonly kind: "unresolved-text"; readonly conflictId: ConflictId; readonly path: VaultPath; readonly preserved: ConcurrentAlternates }
  | { readonly kind: "opaque-binary"; readonly conflictId: ConflictId; readonly path: VaultPath; readonly preserved: ConcurrentAlternates }
  | { readonly kind: "delete-vs-modify"; readonly conflictId: ConflictId; readonly path: VaultPath; readonly modifiedSide: "local" | "remote"; readonly modifiedVersion: ConflictProvenance; readonly base?: ConflictProvenance };
export type ConflictResolution = { readonly kind: "keep-local" | "keep-remote" | "keep-both" | "accept-clean-merge" } | { readonly kind: "manual"; readonly resolvedVersion: VersionReference };
export interface ConflictResolver { assess(path: VaultPath, base: VersionReference | undefined, local: VersionReference | undefined, remote: VersionReference | undefined): Promise<ConflictAssessment>; }
