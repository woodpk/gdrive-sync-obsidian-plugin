import type { App, TAbstractFile, TFolder } from "obsidian";
import type { VaultPath } from "../contracts/common";
import {
  LocalPlatformCapabilityError,
  type ExternalReferenceGuard,
  type LocalReferenceAccess,
} from "./obsidian-local-vault";
import { normalizeVaultPath, validateCrossPlatformPath } from "./path-policy";

/**
 * Mobile containment is established through Obsidian-owned logical vault
 * identity, not through unavailable Node filesystem canonicalization.
 *
 * Existing adapter entries must be represented by the same Vault's
 * TAbstractFile tree and have an intact parent chain to Vault.getRoot(). A
 * missing observation/mutation target is permitted only after the adapter and
 * vault tree agree that it is absent and its closest existing ancestor passes
 * that same rooted-tree proof. Any disagreement remains fail-closed.
 */
export class MobileVaultReferenceGuard implements ExternalReferenceGuard {
  constructor(private readonly app: App) {}

  async assertSafe(path: VaultPath, access: LocalReferenceAccess): Promise<void> {
    const normalized = this.assertVaultRelative(path);
    const target = await this.lookupConsistent(normalized, path);
    if (target) {
      this.assertRooted(target, normalized, path);
      return;
    }

    if (access === "enumerate" || access === "mutation-source") {
      throw this.blocked(path, "required source is not represented inside the Obsidian vault tree");
    }

    let ancestorPath = this.parentPath(normalized);
    while (ancestorPath) {
      const ancestor = await this.lookupConsistent(ancestorPath, path);
      if (ancestor) {
        this.assertRooted(ancestor, ancestorPath, path);
        return;
      }
      ancestorPath = this.parentPath(ancestorPath);
    }

    const root = this.app.vault.getRoot();
    this.assertRoot(root, path);
  }

  private assertVaultRelative(path: VaultPath): string {
    const validation = validateCrossPlatformPath(path);
    if (validation.status === "blocked" && validation.reason === "external-reference") {
      throw this.blocked(path, validation.detail ?? "path is not vault-relative");
    }
    const normalized = normalizeVaultPath(String(path));
    if (!normalized) throw this.blocked(path, "empty path cannot identify a vault entry");
    return normalized;
  }

  private async lookupConsistent(candidate: string, requestedPath: VaultPath): Promise<TAbstractFile | undefined> {
    let exists: boolean;
    try {
      exists = await this.app.vault.adapter.exists(candidate, true);
    } catch {
      throw this.blocked(requestedPath, "the mobile adapter could not establish path existence");
    }
    const abstractFile = this.app.vault.getAbstractFileByPath(candidate) ?? undefined;
    if (exists !== Boolean(abstractFile)) {
      throw this.blocked(requestedPath, "the mobile adapter and Obsidian vault tree disagree");
    }
    return abstractFile;
  }

  private assertRooted(file: TAbstractFile, expectedPath: string, requestedPath: VaultPath): void {
    if (normalizeVaultPath(file.path) !== expectedPath) {
      throw this.blocked(requestedPath, "the vault tree returned a different logical path");
    }
    const root = this.app.vault.getRoot();
    const visited = new Set<TAbstractFile>();
    let current: TAbstractFile = file;
    while (current !== root) {
      if (visited.has(current)) throw this.blocked(requestedPath, "the vault tree parent chain contains a cycle");
      visited.add(current);
      if (current.vault !== this.app.vault || !current.parent) {
        throw this.blocked(requestedPath, "the vault entry is not rooted in the current vault");
      }
      const expectedChildPath = current.parent === root
        ? current.name
        : `${normalizeVaultPath(current.parent.path)}/${current.name}`;
      if (normalizeVaultPath(current.path) !== expectedChildPath) {
        throw this.blocked(requestedPath, "the vault tree parent/path relationship is inconsistent");
      }
      current = current.parent;
    }
    this.assertRoot(root, requestedPath);
  }

  private assertRoot(root: TFolder, requestedPath: VaultPath): void {
    if (root.vault !== this.app.vault || root.parent !== null || !root.isRoot()) {
      throw this.blocked(requestedPath, "Obsidian did not expose a trustworthy current-vault root");
    }
  }

  private parentPath(path: string): string {
    const slash = path.lastIndexOf("/");
    return slash < 0 ? "" : path.slice(0, slash);
  }

  private blocked(path: VaultPath, reason: string): LocalPlatformCapabilityError {
    return new LocalPlatformCapabilityError(
      "external-reference-detection",
      `Mobile vault external reference containment blocked for ${String(path)}: ${reason}.`,
    );
  }
}
