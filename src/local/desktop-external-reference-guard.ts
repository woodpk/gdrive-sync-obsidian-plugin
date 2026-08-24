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
    const canonicalBase = await (this.canonicalBase ??= this.ops.realpath(this.basePath));
    const lexicalTarget = resolve(this.basePath, String(path));
    if (!isWithin(resolve(this.basePath), lexicalTarget)) {
      throw new ExternalFilesystemReferenceError(path, `External reference blocked outside vault: ${String(path)}`);
    }

    const relativeParts = String(path).split("/").filter(Boolean);
    let current = resolve(this.basePath);
    for (let index = 0; index < relativeParts.length; index += 1) {
      current = resolve(current, relativeParts[index]);
      try {
        const status = await this.ops.lstat(current);
        if (status.isSymbolicLink()) {
          throw new ExternalFilesystemReferenceError(path, `External reference blocked at symbolic-link/junction component: ${relativeParts.slice(0, index + 1).join("/")}`);
        }
        const canonicalCurrent = await this.ops.realpath(current);
        if (!isWithin(canonicalBase, canonicalCurrent)) {
          throw new ExternalFilesystemReferenceError(path, `External reference resolved outside vault at: ${relativeParts.slice(0, index + 1).join("/")}`);
        }
      } catch (error) {
        if (error instanceof ExternalFilesystemReferenceError) throw error;
        const code = (error as { code?: string } | undefined)?.code;
        const isMissing = code === "ENOENT" || code === "ENOTDIR";
        if (isMissing && (access === "mutation-target" || index > 0)) {
          // A not-yet-created target is safe only after every existing ancestor
          // has already passed lstat + realpath containment checks.
          return;
        }
        throw error;
      }
    }
  }
}
