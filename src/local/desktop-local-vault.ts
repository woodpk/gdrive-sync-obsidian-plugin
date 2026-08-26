import { open } from "node:fs/promises";
import type { App, DataAdapter } from "obsidian";
import type { BinaryContentSource, VaultPath } from "../contracts/common";
import { DesktopExternalReferenceGuard } from "./desktop-external-reference-guard";
import {
  LocalPlatformCapabilityError,
  LocalStaleObservationError,
  ObsidianLocalVaultAdapter,
  type LocalAdapterOptions,
  type LocalContentSourceContext,
  type LocalContentSourceFactory
} from "./obsidian-local-vault";

interface DesktopDataAdapter extends DataAdapter {
  getBasePath(): string;
}

function isDesktopDataAdapter(adapter: DataAdapter): adapter is DesktopDataAdapter {
  return typeof (adapter as Partial<DesktopDataAdapter>).getBasePath === "function";
}

interface DesktopFileStatusLike {
  readonly size: number;
  readonly mtimeMs: number;
  readonly ctimeMs: number;
  readonly dev: number;
  readonly ino: number;
  isFile(): boolean;
}

interface DesktopFileHandleLike {
  stat(): Promise<DesktopFileStatusLike>;
  read(buffer: Uint8Array, offset: number, length: number, position: number): Promise<{ readonly bytesRead: number }>;
  close(): Promise<void>;
}

export interface DesktopBoundedReadOps {
  open(path: string): Promise<DesktopFileHandleLike>;
}

const defaultReadOps: DesktopBoundedReadOps = {
  async open(path: string): Promise<DesktopFileHandleLike> {
    return open(path, "r");
  }
};

function sameOpenFile(left: DesktopFileStatusLike, right: DesktopFileStatusLike): boolean {
  return left.isFile() === right.isFile()
    && left.size === right.size
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs
    && left.dev === right.dev
    && left.ino === right.ino;
}

class DesktopBoundedContentSource implements BinaryContentSource {
  readonly sizeBytes?: number;

  constructor(
    private readonly context: LocalContentSourceContext,
    private readonly guard: DesktopExternalReferenceGuard,
    private readonly ops: DesktopBoundedReadOps
  ) {
    this.sizeBytes = context.sizeBytes;
  }

  async *openChunks(): AsyncIterable<Uint8Array> {
    const { path, maxChunkBytes } = this.context;
    if (this.sizeBytes === undefined || !Number.isSafeInteger(this.sizeBytes) || this.sizeBytes < 0) {
      throw new LocalPlatformCapabilityError(
        "bounded-local-read",
        `Cannot perform a bounded desktop read without a trustworthy byte size: ${String(path)}`
      );
    }

    await this.context.assertUnchanged();
    const physicalPath = await this.guard.resolveSafePath(path, "observe");
    const handle = await this.ops.open(physicalPath);
    let primaryFailure: unknown;
    try {
      // Re-check after opening so a path swapped to a link between validation
      // and open is rejected before any bytes are consumed.
      await this.guard.resolveSafePath(path, "observe");
      const initial = await handle.stat();
      if (!initial.isFile()) {
        throw new LocalPlatformCapabilityError(
          "bounded-local-read",
          `Desktop bounded reader opened a non-file path: ${String(path)}`
        );
      }
      if (initial.size !== this.sizeBytes) throw new LocalStaleObservationError(path);

      let position = 0;
      while (position < this.sizeBytes) {
        await this.context.assertUnchanged();
        const requestedLength = Math.min(maxChunkBytes, this.sizeBytes - position);
        const chunk = new Uint8Array(requestedLength);
        let filled = 0;
        while (filled < requestedLength) {
          const result = await handle.read(chunk, filled, requestedLength - filled, position + filled);
          if (!Number.isSafeInteger(result.bytesRead) || result.bytesRead <= 0 || result.bytesRead > requestedLength - filled) {
            throw new LocalPlatformCapabilityError(
              "bounded-local-read",
              `Desktop file ended prematurely or returned an invalid read length at byte ${position + filled}: ${String(path)}`
            );
          }
          filled += result.bytesRead;
        }
        position += filled;
        yield chunk;
      }

      const final = await handle.stat();
      if (!sameOpenFile(initial, final) || final.size !== this.sizeBytes) throw new LocalStaleObservationError(path);
      await this.context.assertUnchanged();
      await this.guard.resolveSafePath(path, "observe");
    } catch (error) {
      primaryFailure = error;
      throw error;
    } finally {
      try {
        await handle.close();
      } catch (closeError) {
        if (primaryFailure === undefined) throw closeError;
      }
    }
  }
}

export class DesktopBoundedContentSourceFactory implements LocalContentSourceFactory {
  constructor(
    private readonly guard: DesktopExternalReferenceGuard,
    private readonly ops: DesktopBoundedReadOps = defaultReadOps
  ) {}

  create(context: LocalContentSourceContext): BinaryContentSource {
    return new DesktopBoundedContentSource(context, this.guard, this.ops);
  }
}

export function createDesktopLocalVaultAdapter(
  app: App,
  options: Omit<LocalAdapterOptions, "externalReferenceGuard" | "contentSourceFactory"> = {}
): ObsidianLocalVaultAdapter {
  const adapter = app.vault.adapter;
  if (!isDesktopDataAdapter(adapter)) {
    throw new LocalPlatformCapabilityError(
      "desktop-filesystem-boundary",
      "Desktop local-vault construction requires Obsidian FileSystemAdapter.getBasePath()."
    );
  }
  const guard = new DesktopExternalReferenceGuard(adapter.getBasePath());
  return new ObsidianLocalVaultAdapter(app, {
    ...options,
    externalReferenceGuard: guard,
    contentSourceFactory: new DesktopBoundedContentSourceFactory(guard)
  });
}
