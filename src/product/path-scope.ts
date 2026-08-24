import { contractId, type ConfigurationClassification, type LocalLifecycleEvent, type LocalMutationReceipt, type LocalReadResult, type LocalVaultChange, type LocalVaultListing, type LocalVaultPort, type ObservationToken, type PathValidationResult, type Unsubscribe, type VaultPath } from "../contracts";
import type { LocalObservation } from "../contracts/snapshot";
import { SelectiveConfigurationPolicy } from "../local/config-policy";
import { LocalExclusionPolicy } from "../local/exclusions";

export const CONFIG_REMOTE_NAMESPACE = "__brain_sync_portable_config__";
const vp = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const norm = (value: string) => value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");

export interface ScopeSettings { readonly userExclusionPatterns: readonly string[]; }

/** One dynamic scope definition shared by LOCAL and REMOTE planning views. */
export class ProductPathScope {
  private readonly configurationPolicy = new SelectiveConfigurationPolicy();
  private readonly portable = new Set(this.configurationPolicy.describePortablePolicy().filter(entry => entry.classification.classification === "portable").map(entry => norm(entry.relativePath)));

  constructor(private readonly configurationDirectory: VaultPath, private readonly settings: () => ScopeSettings) {}

  isManagedLogical(path: VaultPath | string): boolean {
    const logical = norm(String(path));
    if (logical === CONFIG_REMOTE_NAMESPACE) return false;
    if (logical.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`)) return this.portable.has(logical.slice(CONFIG_REMOTE_NAMESPACE.length + 1));
    return !new LocalExclusionPolicy(this.settings().userExclusionPatterns).evaluate(logical, this.configurationDirectory).excluded;
  }

  logicalToPhysical(path: VaultPath): VaultPath | undefined {
    const logical = norm(String(path));
    if (!this.isManagedLogical(logical)) return undefined;
    if (logical.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`)) return vp(`${norm(String(this.configurationDirectory))}/${logical.slice(CONFIG_REMOTE_NAMESPACE.length + 1)}`);
    return vp(logical);
  }

  physicalToLogical(path: VaultPath | string): VaultPath | undefined {
    const physical = norm(String(path));
    const config = norm(String(this.configurationDirectory));
    if (physical.startsWith(`${config}/`)) {
      const relative = physical.slice(config.length + 1);
      const classification = this.configurationPolicy.classify(vp(physical), this.configurationDirectory);
      return classification.classification === "portable" ? vp(`${CONFIG_REMOTE_NAMESPACE}/${relative}`) : undefined;
    }
    return this.isManagedLogical(physical) ? vp(physical) : undefined;
  }

  portableLogicalPaths(): readonly VaultPath[] { return [...this.portable].map(relative => vp(`${CONFIG_REMOTE_NAMESPACE}/${relative}`)); }
  activeConfigurationDirectory(): VaultPath { return this.configurationDirectory; }
}

function mapObservation(observation: LocalObservation, path: VaultPath): LocalObservation {
  if (observation.status === "present") return { ...observation, path };
  if (observation.status === "absent") return { ...observation, path };
  return { ...observation, path };
}

/** Maps the private REMOTE portable-config namespace to the runtime config directory. */
export class ScopedLocalVault implements LocalVaultPort {
  constructor(private readonly inner: LocalVaultPort, readonly scope: ProductPathScope) {}

  activeConfigurationDirectory(): Promise<VaultPath> { return Promise.resolve(this.scope.activeConfigurationDirectory()); }
  async enumerate(): Promise<LocalVaultListing> {
    const ordinary = await this.inner.enumerate();
    const entries: LocalObservation[] = ordinary.entries.filter(entry => this.scope.isManagedLogical(entry.path));
    const configFailures: string[] = [];
    for (const logical of this.scope.portableLogicalPaths()) {
      const physical = this.scope.logicalToPhysical(logical)!;
      const observed = mapObservation(await this.inner.observe(physical), logical);
      entries.push(observed);
      if (observed.status === "unreadable" || observed.status === "inaccessible" || observed.status === "unknown") configFailures.push(`${String(logical)}: ${observed.reason}`);
    }
    if (!configFailures.length) return { entries, completeness: ordinary.completeness };
    const prior = ordinary.completeness.status === "complete" ? [] : [ordinary.completeness.reason];
    return { entries, completeness: { status: "partial", reason: [...prior, ...configFailures].join("; ") } };
  }

  async observe(path: VaultPath): Promise<LocalObservation> {
    const physical = this.scope.logicalToPhysical(path);
    if (!physical) return { status: "unknown", side: "local", path, reason: "path is outside the effective synchronization scope" };
    return mapObservation(await this.inner.observe(physical), path);
  }
  async readFile(path: VaultPath, expectedToken?: ObservationToken): Promise<LocalReadResult> {
    const physical = this.requiredPhysical(path); return this.inner.readFile(physical, expectedToken);
  }
  async createFile(path: VaultPath, content: Parameters<LocalVaultPort["createFile"]>[1]): Promise<LocalMutationReceipt> {
    const receipt = await this.inner.createFile(this.requiredPhysical(path), content); return { ...receipt, path };
  }
  async replaceFile(path: VaultPath, content: Parameters<LocalVaultPort["replaceFile"]>[1], expectedToken?: ObservationToken): Promise<LocalMutationReceipt> {
    const receipt = await this.inner.replaceFile(this.requiredPhysical(path), content, expectedToken); return { ...receipt, path };
  }
  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> {
    const receipt = await this.inner.createFolder(this.requiredPhysical(path)); return { ...receipt, path };
  }
  async move(fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt> {
    const receipt = await this.inner.move(this.requiredPhysical(fromPath), this.requiredPhysical(toPath)); return { ...receipt, path: toPath };
  }
  async trash(path: VaultPath): Promise<void> { await this.inner.trash(this.requiredPhysical(path)); }
  async validatePath(path: VaultPath): Promise<PathValidationResult> {
    const physical = this.scope.logicalToPhysical(path);
    if (!physical) return { status: "blocked", reason: "unsupported-object", detail: "path is outside the effective synchronization scope" };
    return this.inner.validatePath(physical);
  }
  async classifyConfiguration(path: VaultPath): Promise<ConfigurationClassification> { return this.inner.classifyConfiguration(this.requiredPhysical(path)); }
  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe {
    return this.inner.onChange(change => {
      if (change.kind === "renamed") {
        const fromPath = this.scope.physicalToLogical(change.fromPath), toPath = this.scope.physicalToLogical(change.toPath);
        if (fromPath && toPath) listener({ kind: "renamed", fromPath, toPath });
        else if (fromPath) listener({ kind: "deleted", path: fromPath });
        else if (toPath) listener({ kind: "created", path: toPath });
        return;
      }
      const path = this.scope.physicalToLogical(change.path); if (path) listener({ ...change, path });
    });
  }
  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe { return this.inner.onLifecycle(listener); }

  private requiredPhysical(path: VaultPath): VaultPath {
    const physical = this.scope.logicalToPhysical(path);
    if (!physical) throw new Error(`Blocked local path (unsupported-object): ${String(path)} — outside effective synchronization scope`);
    return physical;
  }
}
