import type { ContentEvidence, ObservationToken, VaultPath } from "./common";
import type { EnumerationCompleteness, LocalObservation } from "./snapshot";
export interface LocalVaultListing { readonly entries: readonly LocalObservation[]; readonly completeness: EnumerationCompleteness; }
export interface LocalReadResult { readonly bytes: Uint8Array; readonly evidence: ContentEvidence; readonly stability: "stable"; readonly observationToken?: ObservationToken; }
export interface LocalMutationReceipt { readonly path: VaultPath; readonly evidence?: ContentEvidence; readonly observationToken?: ObservationToken; }
export type PathValidationResult = { readonly status: "compatible"; readonly normalizedComparisonPath: string } | { readonly status: "blocked"; readonly reason: "invalid-name" | "reserved-name" | "path-too-long" | "case-collision" | "unicode-collision" | "external-reference" | "unsupported-object"; readonly detail?: string };
export type ConfigurationClassification = { readonly classification: "portable"; readonly policyId: string } | { readonly classification: "device-local"; readonly reason: string } | { readonly classification: "protected"; readonly reason: "authentication-secret" | "sync-operational-state" | "device-identity" } | { readonly classification: "unknown"; readonly reason: string };
export type LocalVaultChange = { readonly kind: "created" | "modified" | "deleted"; readonly path: VaultPath } | { readonly kind: "renamed"; readonly fromPath: VaultPath; readonly toPath: VaultPath };
export type LocalLifecycleEvent = { readonly kind: "vault-ready" | "resume" | "suspend" | "unload" };
export type Unsubscribe = () => void;
/** Mobile-safe local port: no desktop filesystem dependency is exposed. */
export interface LocalVaultPort {
  activeConfigurationDirectory(): Promise<VaultPath>;
  enumerate(): Promise<LocalVaultListing>;
  observe(path: VaultPath): Promise<LocalObservation>;
  readFile(path: VaultPath, expectedToken?: ObservationToken): Promise<LocalReadResult>;
  createFile(path: VaultPath, bytes: Uint8Array): Promise<LocalMutationReceipt>;
  replaceFile(path: VaultPath, bytes: Uint8Array, expectedToken?: ObservationToken): Promise<LocalMutationReceipt>;
  createFolder(path: VaultPath): Promise<LocalMutationReceipt>;
  move(fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt>;
  trash(path: VaultPath): Promise<void>;
  validatePath(path: VaultPath): Promise<PathValidationResult>;
  classifyConfiguration(path: VaultPath): Promise<ConfigurationClassification>;
  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe;
  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe;
}
