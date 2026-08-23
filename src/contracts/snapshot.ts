import type { ContentEvidence, EntityKind, ObservationToken, RemoteObjectId, SyncSide, VaultPath } from "./common";
import type { BaseEntry, TombstoneEntry } from "./state";
export type FileStability = "stable" | "unstable" | "unknown";
export type Observation<S extends SyncSide = SyncSide> =
  | { readonly status: "present"; readonly side: S; readonly path: VaultPath; readonly entityKind: EntityKind; readonly logicalIdentity?: string; readonly remoteObjectId?: RemoteObjectId; readonly content?: ContentEvidence; readonly stability: FileStability; readonly observationToken?: ObservationToken }
  | { readonly status: "absent"; readonly side: S; readonly path: VaultPath; readonly observationToken?: ObservationToken }
  | { readonly status: "unreadable" | "inaccessible" | "unknown"; readonly side: S; readonly path: VaultPath; readonly reason: string };
export type LocalObservation = Observation<"local">;
export type RemoteObservation = Observation<"remote">;
export type EnumerationCompleteness = { readonly status: "complete" } | { readonly status: "partial" | "failed" | "unknown"; readonly reason: string };
export type IdentityAssessment = { readonly status: "unambiguous" } | { readonly status: "ambiguous"; readonly reason: string; readonly candidateRemoteIds?: readonly RemoteObjectId[] } | { readonly status: "blocked"; readonly reason: string };
export type BaseEvidence = { readonly status: "trusted"; readonly entry?: BaseEntry; readonly tombstone?: TombstoneEntry } | { readonly status: "uninitialized" } | { readonly status: "untrusted"; readonly reason: string };
/** Only explicit `absent` is confirmed non-existence; errors/unknowns remain distinct. */
export interface PathSnapshot { readonly path: VaultPath; readonly local: LocalObservation; readonly remote: RemoteObservation; readonly base: BaseEvidence; readonly remoteEnumeration: EnumerationCompleteness; readonly identity: IdentityAssessment; }
