import { lstat, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { VaultPath } from "../contracts/common";
import type { ExternalReferenceGuard, LocalReferenceAccess } from "./obsidian-local-vault";

interface FileStatusLike {
  isSymbolicLink(): boolean;
}

export interface DesktopFilesystemOps {
  lstat(path: string): Promise<FileStatusLike>;
  realpath(path: string): Promise<string>;
}

const defaultOps: DesktopFilesystemOps = { lstat, realpath };

export class ExternalFilesystemReferenceError extends Error {
  constructor(readonly vaultPath: VaultPath, message: string) {
    super(message);
    this.name = "ExternalFilesystemReferenceError";
  }
}

function isWithin(basePath: string, candidatePath: string): boolean {
  const rel = relative(basePath, candidatePath);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

/**
 * Desktop-only guard. This module deliberately owns all Node filesystem/path
 * imports used by Phase 4 and MUST NOT be imported by a mobile-required module.
 */
export class DesktopExternalReferenceGuard implements ExternalReferenceGuard {
  private canonicalBase?: Promise<string>;

  constructor(
    private readonly basePath: string,
    private readonly ops: DesktopFilesystemOps = defaultOps
  ) {}

  async assertSafe(path: VaultPath, access: LocalReferenceAccess): Promise<void> {
    await this.resolveSafePath(path, access);
  }

  /**
   * Returns the same lexically-contained path whose components were checked by
   * this guard, so desktop readers do not introduce a second unchecked resolver.
   */
  async resolveSafePath(path: VaultPath, _access: LocalReferenceAccess): Promise<string> {
    const canonicalBase = await (this.canonicalBase ??= this.ops.realpath(this.basePath));
    const lexicalTarget = resolve(this.basePath, String(path));
    if (!isWithin(resolve(this.basePath), lexicalTarget)) {
      throw new ExternalFilesystemReferenceError(path, `External reference blocked outside vault: ${String(path)}`);
    }

    const relativeParts = String(path).split("/").filter(Boolean);
    let current = resolve(this.basePath);

    for (let index = 0; index < relativeParts.length; index += 1) {
      current = resolve(current, relativeParts[index]);

      let status: FileStatusLike;
      try {
        status = await this.ops.lstat(current);
      } catch (error) {
        const code = (error as { code?: string } | undefined)?.code;
        if (code === "ENOENT" || code === "ENOTDIR") {
          // A genuinely missing component is a safe absence candidate only after
          // every existing ancestor has already passed lstat + realpath containment.
          return lexicalTarget;
        }
        throw error;
      }

      if (status.isSymbolicLink()) {
        throw new ExternalFilesystemReferenceError(
          path,
          `External reference blocked at symbolic-link/junction component: ${relativeParts.slice(0, index + 1).join("/")}`
        );
      }

      // This component exists. Canonical resolution is therefore mandatory.
      // Any realpath failure is containment uncertainty and must remain fail-closed.
      const canonicalCurrent = await this.ops.realpath(current);
      if (!isWithin(canonicalBase, canonicalCurrent)) {
        throw new ExternalFilesystemReferenceError(
          path,
          `External reference resolved outside vault at: ${relativeParts.slice(0, index + 1).join("/")}`
        );
      }
    }

    return lexicalTarget;
  }
}
