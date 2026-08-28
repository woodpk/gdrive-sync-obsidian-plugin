import type { App, DataAdapter, Stat, TAbstractFile } from "obsidian";
import { contractId, type BinaryContentSource, type ObservationToken, type VaultPath } from "../contracts/common";
import type {
  ConfigurationClassification,
  LocalLifecycleEvent,
  LocalMutationReceipt,
  LocalReadResult,
  LocalVaultChange,
  LocalVaultListing,
  LocalVaultPort,
  PathValidationResult,
  Unsubscribe
} from "../contracts/local-vault";
import type { LocalObservation } from "../contracts/snapshot";
import { SelectiveConfigurationPolicy } from "./config-policy";
import { LocalExclusionPolicy } from "./exclusions";
import type { LocalVaultAccess, LocalVaultAccessBoundary } from "./local-vault-access-boundary";
import { normalizeVaultPath, normalizedComparisonPath, validateCrossPlatformPath } from "./path-policy";

interface VaultWithConfigDir {
  readonly configDir: string;
}

/** Backward-compatible private aliases retained for existing focused tests. */
export type LocalReferenceAccess = LocalVaultAccess;
export type ExternalReferenceGuard = LocalVaultAccessBoundary;

/** Private platform seam for selecting a bounded, incremental content reader. */
export interface LocalContentSourceContext {
  readonly path: VaultPath;
  readonly sizeBytes: number | undefined;
  readonly maxChunkBytes: number;
  assertUnchanged(): Promise<void>;
}

export interface LocalContentSourceFactory {
  create(context: LocalContentSourceContext): BinaryContentSource;
}

export interface LocalAdapterOptions {
  readonly exclusionPolicy?: LocalExclusionPolicy;
  readonly configurationPolicy?: SelectiveConfigurationPolicy;
  readonly stabilityDelayMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly readChunkSizeBytes?: number;
  readonly accessBoundary?: LocalVaultAccessBoundary;
  /** @deprecated Use accessBoundary. */
  readonly externalReferenceGuard?: ExternalReferenceGuard;
  readonly contentSourceFactory?: LocalContentSourceFactory;
  readonly adapterMutationFallback?: boolean;
}

export class LocalPlatformCapabilityError extends Error {
  constructor(readonly capability: string, message: string) {
    super(message);
    this.name = "LocalPlatformCapabilityError";
  }
}

class UnavailableVaultAccessBoundary implements LocalVaultAccessBoundary {
  readonly kind = "unavailable" as const;

  async assertSafe(path: VaultPath, _access: LocalReferenceAccess): Promise<void> {
    throw new LocalPlatformCapabilityError(
      "external-reference-detection",
      `This runtime cannot prove that ${String(path)} does not traverse an external filesystem reference. Synchronization access is blocked.`
    );
  }
}

export class LocalStaleObservationError extends Error {
  constructor(readonly path: VaultPath) {
    super(`Local observation became stale: ${String(path)}`);
    this.name = "LocalStaleObservationError";
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => globalThis.setTimeout(resolve, milliseconds));
}

function asPath(path: string): VaultPath {
  return normalizeVaultPath(path) as VaultPath;
}

function statToken(path: string, stat: Stat, generation: number): ObservationToken {
  // mtime participates only in an opaque stale-precondition token. It is never
  // used to choose a synchronization winner or infer authority.
  return contractId<"ObservationToken">(`${normalizeVaultPath(path)}|${stat.type}|${stat.size}|${stat.mtime}|g${generation}`);
}

function sameStat(left: Stat | null, right: Stat | null): boolean {
  if (!left || !right) return false;
  return left.type === right.type && left.size === right.size && left.mtime === right.mtime;
}

function classifyFailure(path: VaultPath, error: unknown): LocalObservation {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLocaleLowerCase("en-US");
  if (lower.includes("permission") || lower.includes("denied") || lower.includes("access") || lower.includes("external reference")) {
    return { status: "inaccessible", side: "local", path, reason: message };
  }
  if (lower.includes("read") || lower.includes("io") || lower.includes("i/o")) {
    return { status: "unreadable", side: "local", path, reason: message };
  }
  return { status: "unknown", side: "local", path, reason: message };
}

function chunkArrayBuffer(chunk: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(chunk.byteLength);
  copy.set(chunk);
  return copy.buffer;
}

function parentPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? "" : path.slice(0, slash);
}

function baseName(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash < 0 ? path : path.slice(slash + 1);
}

function temporarySibling(path: string, purpose: "stage" | "backup"): string {
  const parent = parentPath(path);
  const leaf = baseName(path);
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${parent ? `${parent}/` : ""}.${leaf}.brain-sync-${purpose}-${id}`;
}

function validateEnumeratedChild(parent: string, child: unknown): { readonly path?: VaultPath; readonly reason?: string } {
  if (typeof child !== "string") return { reason: "Adapter returned a non-string child path" };
  const normalized = normalizeVaultPath(child);
  const validation = validateCrossPlatformPath(child);
  if (validation.status === "blocked") return { reason: `Adapter child path is blocked by ${validation.reason}` };
  if (normalized !== child) return { reason: "Adapter returned a non-normalized child path" };
  const prefix = parent ? `${parent}/` : "";
  if (!normalized.startsWith(prefix)) return { reason: "Adapter child is outside the requested parent" };
  const remainder = normalized.slice(prefix.length);
  if (!remainder || remainder.includes("/")) return { reason: "Adapter child is not an immediate descendant of the requested parent" };
  return { path: normalized as VaultPath };
}

interface ParsedContentRange {
  readonly start: number;
  readonly end: number;
  readonly total: number;
}

function parseContentRange(value: string | null): ParsedContentRange | undefined {
  if (!value) return undefined;
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(value.trim());
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !Number.isSafeInteger(total)) return undefined;
  return { start, end, total };
}

class ResourceFetchContentSource implements BinaryContentSource {
  readonly sizeBytes?: number;

  constructor(
    private readonly owner: ObsidianLocalVaultAdapter,
    private readonly path: VaultPath,
    private readonly expectedToken: ObservationToken,
    sizeBytes: number | undefined,
    private readonly fetchImpl: typeof fetch,
    private readonly maxChunkBytes: number
  ) {
    this.sizeBytes = sizeBytes;
  }

  async *openChunks(): AsyncIterable<Uint8Array> {
    if (this.sizeBytes === undefined || !Number.isSafeInteger(this.sizeBytes) || this.sizeBytes < 0) {
      throw new LocalPlatformCapabilityError(
        "bounded-local-read",
        `Cannot perform a bounded local read without a trustworthy byte size: ${String(this.path)}`
      );
    }
    if (this.sizeBytes === 0) {
      await this.owner.assertToken(this.path, this.expectedToken);
      return;
    }

    const resourceUrl = this.owner.adapter.getResourcePath(String(this.path));
    for (let start = 0; start < this.sizeBytes; start += this.maxChunkBytes) {
      await this.owner.assertToken(this.path, this.expectedToken);
      const requestedEnd = Math.min(start + this.maxChunkBytes - 1, this.sizeBytes - 1);
      const expectedLength = requestedEnd - start + 1;
      const response = await this.fetchImpl(resourceUrl, {
        headers: { Range: `bytes=${start}-${requestedEnd}` }
      });

      if (response.status !== 206) {
        try { await response.body?.cancel(); } catch { /* best-effort cancellation */ }
        throw new LocalPlatformCapabilityError(
          "bounded-local-read",
          `Local resource runtime ignored a byte-range request for ${String(this.path)}: expected HTTP 206, received HTTP ${response.status}. Whole-file fallback is prohibited.`
        );
      }

      const contentRange = parseContentRange(response.headers.get("Content-Range"));
      if (!contentRange || contentRange.start !== start || contentRange.end !== requestedEnd || contentRange.total !== this.sizeBytes) {
        try { await response.body?.cancel(); } catch { /* best-effort cancellation */ }
        throw new LocalPlatformCapabilityError(
          "bounded-local-read",
          `Local resource returned an invalid Content-Range for ${String(this.path)}; expected bytes ${start}-${requestedEnd}/${this.sizeBytes}.`
        );
      }

      const declaredLength = response.headers.get("Content-Length");
      if (declaredLength !== null) {
        const parsedLength = Number(declaredLength);
        if (!Number.isSafeInteger(parsedLength) || parsedLength !== expectedLength || parsedLength > this.maxChunkBytes) {
          try { await response.body?.cancel(); } catch { /* best-effort cancellation */ }
          throw new LocalPlatformCapabilityError(
            "bounded-local-read",
            `Local resource returned an unsafe Content-Length for ${String(this.path)}: ${declaredLength}.`
          );
        }
      }

      if (!response.body) {
        throw new LocalPlatformCapabilityError(
          "bounded-local-read",
          "This runtime does not expose a response body for a validated byte-range request. Whole-file readBinary fallback is intentionally prohibited."
        );
      }

      const reader = response.body.getReader();
      let received = 0;
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) break;
          if (result.value.byteLength === 0) continue;
          received += result.value.byteLength;
          if (received > expectedLength || result.value.byteLength > this.maxChunkBytes) {
            throw new LocalPlatformCapabilityError(
              "bounded-local-read",
              `Local resource exceeded the requested bounded range for ${String(this.path)}.`
            );
          }
          yield result.value;
        }
      } finally {
        reader.releaseLock();
      }
      if (received !== expectedLength) {
        throw new LocalPlatformCapabilityError(
          "bounded-local-read",
          `Local resource returned ${received} bytes for a ${expectedLength}-byte range of ${String(this.path)}.`
        );
      }
    }
    await this.owner.assertToken(this.path, this.expectedToken);
  }
}

/**
 * Production Phase 4 implementation of the frozen LocalVaultPort.
 *
 * Mobile-required behavior uses Obsidian's platform-neutral DataAdapter and
 * FileManager surfaces. Desktop-only safety may be injected through the private
 * ExternalReferenceGuard seam without changing any frozen shared contract.
 */
export class ObsidianLocalVaultAdapter implements LocalVaultPort {
  readonly adapter: DataAdapter;
  private readonly exclusionPolicy: LocalExclusionPolicy;
  private readonly configurationPolicy: SelectiveConfigurationPolicy;
  private readonly stabilityDelayMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly readChunkSizeBytes: number;
  private readonly accessBoundary: LocalVaultAccessBoundary;
  private readonly contentSourceFactory?: LocalContentSourceFactory;
  private readonly adapterMutationFallback: boolean;
  private readonly changeListeners = new Set<(change: LocalVaultChange) => void>();
  private readonly lifecycleListeners = new Set<(event: LocalLifecycleEvent) => void>();
  private readonly eventUnsubscribers: Array<() => void> = [];
  private readonly generations = new Map<string, number>();
  private vaultReady = false;
  private disposed = false;

  constructor(readonly app: App, options: LocalAdapterOptions = {}) {
    this.adapter = app.vault.adapter;
    this.exclusionPolicy = options.exclusionPolicy ?? new LocalExclusionPolicy();
    this.configurationPolicy = options.configurationPolicy ?? new SelectiveConfigurationPolicy();
    this.stabilityDelayMs = options.stabilityDelayMs ?? 150;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.readChunkSizeBytes = options.readChunkSizeBytes ?? 256 * 1024;
    if (!Number.isSafeInteger(this.readChunkSizeBytes) || this.readChunkSizeBytes <= 0) {
      throw new Error("readChunkSizeBytes must be a positive safe integer");
    }
    this.accessBoundary = options.accessBoundary ?? options.externalReferenceGuard ?? new UnavailableVaultAccessBoundary();
    this.contentSourceFactory = options.contentSourceFactory;
    this.adapterMutationFallback = options.adapterMutationFallback ?? false;
    this.installVaultEvents();
    this.installLifecycleEvents();
  }

  async activeConfigurationDirectory(): Promise<VaultPath> {
    const value = (this.app.vault as unknown as VaultWithConfigDir).configDir;
    if (!value || typeof value !== "string") {
      throw new LocalPlatformCapabilityError("active-configuration-directory", "Obsidian runtime did not expose vault.configDir");
    }
    const validation = validateCrossPlatformPath(value);
    if (validation.status === "blocked") {
      throw new LocalPlatformCapabilityError("active-configuration-directory", `Obsidian exposed an unsafe configuration directory (${validation.reason})`);
    }
    return asPath(value);
  }

  async enumerate(): Promise<LocalVaultListing> {
    const entries: LocalObservation[] = [];
    const configDir = await this.activeConfigurationDirectory();
    const visited = new Set<string>();
    const failures: string[] = [];

    const visit = async (folder: string): Promise<void> => {
      const normalizedFolder = normalizeVaultPath(folder);
      if (visited.has(normalizedFolder)) {
        failures.push(`Repeated directory encountered while enumerating: ${normalizedFolder || "/"}`);
        return;
      }
      visited.add(normalizedFolder);
      if (normalizedFolder) {
        try {
          await this.accessBoundary.assertSafe(normalizedFolder as VaultPath, "enumerate");
        } catch (error) {
          failures.push(`${normalizedFolder}: directory access boundary rejected enumeration (${error instanceof Error ? error.message : String(error)})`);
          return;
        }
      }
      let listing: Awaited<ReturnType<DataAdapter["list"]>>;
      try {
        listing = await this.adapter.list(normalizedFolder);
      } catch (error) {
        failures.push(`${normalizedFolder || "/"}: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      if (!Array.isArray(listing?.folders) || !Array.isArray(listing?.files)) {
        failures.push(`${normalizedFolder || "/"}: adapter returned a malformed directory listing`);
        return;
      }

      const seenChildren = new Set<string>();
      const inspectChild = async (rawChild: unknown, expectedKind: "folder" | "file"): Promise<void> => {
        const validated = validateEnumeratedChild(normalizedFolder, rawChild);
        if (!validated.path) {
          failures.push(`${normalizedFolder || "/"}: enumeration child rejected (${validated.reason ?? "invalid child"})`);
          return;
        }
        const comparison = normalizedComparisonPath(String(validated.path));
        if (seenChildren.has(comparison)) {
          failures.push(`${normalizedFolder || "/"}: duplicate or colliding enumeration child rejected`);
          return;
        }
        seenChildren.add(comparison);
        const path = validated.path;
        if (this.exclusionPolicy.evaluate(path, configDir).excluded) return;
        try {
          await this.accessBoundary.assertSafe(path, "enumerate");
        } catch (error) {
          const failure = classifyFailure(path, error);
          entries.push(failure);
          failures.push(expectedKind === "folder"
            ? `${String(path)}: subtree not safely enumerable (${failure.status})`
            : `${String(path)}: listed file was rejected by the access boundary (${failure.status})`);
          return;
        }
        const observation = await this.observe(path);
        entries.push(observation);
        if (observation.status !== "present" || observation.entityKind !== expectedKind) {
          failures.push(`${String(path)}: listed ${expectedKind} was not truthfully observed as ${expectedKind} (${observation.status})`);
          return;
        }
        if (expectedKind === "folder") await visit(String(path));
      };

      for (const folderPath of listing.folders) await inspectChild(folderPath, "folder");
      for (const filePath of listing.files) await inspectChild(filePath, "file");
    };

    await visit("");
    return {
      entries,
      completeness: failures.length === 0 ? { status: "complete" } : { status: "partial", reason: failures.join("; ") }
    };
  }

  async observe(path: VaultPath): Promise<LocalObservation> {
    const normalized = asPath(String(path));
    try {
      const safe = await this.safePath(path, "observe");
      const safeRaw = String(safe);
      const exists = await this.adapter.exists(safeRaw, true);
      if (!exists) return { status: "absent", side: "local", path: safe };
      const first = await this.adapter.stat(safeRaw);
      if (!first) return { status: "unknown", side: "local", path: safe, reason: "Path exists but adapter.stat returned no metadata" };
      if (first.type === "folder") {
        return {
          status: "present",
          side: "local",
          path: safe,
          entityKind: "folder",
          stability: "stable",
          observationToken: statToken(safeRaw, first, this.generationFor(safe))
        };
      }
      if (first.type !== "file") {
        return { status: "unknown", side: "local", path: safe, reason: "Adapter exposed an unsupported local filesystem object" };
      }
      await sleep(this.stabilityDelayMs);
      const second = await this.adapter.stat(safeRaw);
      const stable = sameStat(first, second);
      const finalStat = second ?? first;
      if (finalStat.type !== "file") {
        return { status: "unknown", side: "local", path: safe, reason: "Local object kind changed during observation" };
      }
      return {
        status: "present",
        side: "local",
        path: safe,
        entityKind: "file",
        content: { sizeBytes: finalStat.size, advisoryModifiedTimeMs: finalStat.mtime },
        stability: stable ? "stable" : "unstable",
        observationToken: statToken(safeRaw, finalStat, this.generationFor(safe))
      };
    } catch (error) {
      return classifyFailure(normalized, error);
    }
  }

  async readFile(path: VaultPath, expectedToken?: ObservationToken): Promise<LocalReadResult> {
    const observation = await this.observe(path);
    if (observation.status !== "present" || observation.entityKind !== "file") {
      throw new Error(`Local file is not readable/present: ${String(path)} (${observation.status})`);
    }
    if (observation.stability !== "stable" || !observation.observationToken) {
      throw new Error(`Local file is not stable: ${String(path)}`);
    }
    if (expectedToken && expectedToken !== observation.observationToken) throw new LocalStaleObservationError(path);
    const observedPath = observation.path;
    const token = observation.observationToken;
    const sizeBytes = observation.content?.sizeBytes;
    const content = this.contentSourceFactory?.create({
      path: observedPath,
      sizeBytes,
      maxChunkBytes: this.readChunkSizeBytes,
      assertUnchanged: () => this.assertToken(observedPath, token)
    }) ?? new ResourceFetchContentSource(this, observedPath, token, sizeBytes, this.fetchImpl, this.readChunkSizeBytes);
    return {
      content,
      evidence: observation.content ?? {},
      stability: "stable",
      observationToken: token
    };
  }

  async createFile(path: VaultPath, content: BinaryContentSource): Promise<LocalMutationReceipt> {
    const target = await this.assertCompatible(path);
    if (await this.adapter.exists(String(target), true)) throw new Error(`Cannot create existing local path: ${String(target)}`);
    const stage = await this.safePath(temporarySibling(String(target), "stage") as VaultPath, "mutation-target");
    try {
      await this.writeIncremental(stage, content);
      await this.adapter.rename(String(stage), String(target));
      await this.waitForPath(target);
      return this.receipt(target);
    } catch (error) {
      await this.removeIfExists(stage);
      throw error;
    }
  }

  async replaceFile(path: VaultPath, content: BinaryContentSource, expectedToken?: ObservationToken): Promise<LocalMutationReceipt> {
    const target = await this.assertCompatible(path);
    if (expectedToken) await this.assertToken(target, expectedToken);
    const stage = await this.safePath(temporarySibling(String(target), "stage") as VaultPath, "mutation-target");
    const backup = await this.safePath(temporarySibling(String(target), "backup") as VaultPath, "mutation-target");
    let backupCreated = false;
    try {
      await this.writeIncremental(stage, content);
      if (expectedToken) await this.assertToken(target, expectedToken);
      const exists = await this.adapter.exists(String(target), true);
      if (exists) {
        await this.adapter.rename(String(target), String(backup));
        backupCreated = true;
      }
      try {
        await this.adapter.rename(String(stage), String(target));
      } catch (error) {
        if (backupCreated) await this.adapter.rename(String(backup), String(target)).catch(() => undefined);
        throw error;
      }
      await this.waitForPath(target);
      if (backupCreated) await this.adapter.trashLocal(String(backup)).catch(() => undefined);
      return this.receipt(target);
    } catch (error) {
      await this.removeIfExists(stage);
      throw error;
    }
  }

  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> {
    const target = await this.assertCompatible(path);
    if (!(await this.adapter.exists(String(target), true))) {
      if (this.adapterMutationFallback) await this.adapter.mkdir(String(target));
      else await this.app.vault.createFolder(String(target));
    }
    return this.receipt(target);
  }

  async move(fromPath: VaultPath, toPath: VaultPath): Promise<LocalMutationReceipt> {
    const source = await this.safePath(fromPath, "mutation-source");
    const target = await this.assertCompatible(toPath);
    const file = this.app.vault.getAbstractFileByPath(String(source));
    if (file) await this.app.fileManager.renameFile(file, String(target));
    else if (this.adapterMutationFallback && await this.adapter.exists(String(source), true)) {
      await this.adapter.rename(String(source), String(target));
    } else throw new Error(`Cannot move missing local path: ${String(source)}`);
    return this.receipt(target);
  }

  async trash(path: VaultPath): Promise<void> {
    const source = await this.safePath(path, "mutation-source");
    const file = this.app.vault.getAbstractFileByPath(String(source));
    if (file) await this.app.fileManager.trashFile(file);
    else if (this.adapterMutationFallback && await this.adapter.exists(String(source), true)) {
      await this.adapter.trashLocal(String(source));
    } else throw new Error(`Cannot trash missing local path: ${String(source)}`);
  }

  async validatePath(path: VaultPath): Promise<PathValidationResult> {
    const preliminary = validateCrossPlatformPath(path);
    if (preliminary.status === "blocked") return preliminary;
    const listing = await this.enumerate();
    const existing = listing.entries
      .filter(entry => entry.status === "present")
      .map(entry => String(entry.path));
    return validateCrossPlatformPath(path, existing);
  }

  async classifyConfiguration(path: VaultPath): Promise<ConfigurationClassification> {
    return this.configurationPolicy.classify(path, await this.activeConfigurationDirectory());
  }

  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe {
    this.lifecycleListeners.add(listener);
    if (this.vaultReady && !this.disposed) listener({ kind: "vault-ready" });
    return () => this.lifecycleListeners.delete(listener);
  }

  /** Phase 5/plugin lifecycle calls this; it is intentionally non-destructive. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.emitLifecycle({ kind: "unload" });
    for (const unsubscribe of this.eventUnsubscribers.splice(0)) unsubscribe();
    this.changeListeners.clear();
    this.lifecycleListeners.clear();
  }

  async assertToken(path: VaultPath, expectedToken: ObservationToken): Promise<void> {
    const observation = await this.observe(path);
    if (observation.status !== "present" || observation.stability !== "stable" || observation.observationToken !== expectedToken) {
      throw new LocalStaleObservationError(path);
    }
  }

  private async writeIncremental(path: VaultPath, content: BinaryContentSource): Promise<void> {
    const target = await this.safePath(path, "mutation-target");
    await this.adapter.writeBinary(String(target), new ArrayBuffer(0));
    try {
      for await (const chunk of content.openChunks()) {
        if (chunk.byteLength === 0) continue;
        await this.adapter.appendBinary(String(target), chunkArrayBuffer(chunk));
      }
    } catch (error) {
      await this.removeIfExists(target);
      throw error;
    }
  }

  private async assertCompatible(path: VaultPath): Promise<VaultPath> {
    const target = await this.safePath(path, "mutation-target");
    const result = await this.validatePath(target);
    if (result.status === "blocked") throw new Error(`Blocked local path (${result.reason}): ${String(target)}${result.detail ? ` — ${result.detail}` : ""}`);
    return target;
  }

  private async receipt(path: VaultPath): Promise<LocalMutationReceipt> {
    const observation = await this.observe(path);
    return observation.status === "present"
      ? { path, evidence: observation.content, observationToken: observation.observationToken }
      : { path };
  }

  private async removeIfExists(path: VaultPath): Promise<void> {
    try {
      const target = await this.safePath(path, "mutation-target");
      if (await this.adapter.exists(String(target), true)) await this.adapter.remove(String(target));
    } catch {
      // Cleanup failure is deliberately non-destructive to any destination file.
    }
  }

  private async waitForPath(path: VaultPath): Promise<void> {
    const target = await this.safePath(path, "observe");
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (this.app.vault.getAbstractFileByPath(String(target)) || await this.adapter.exists(String(target), true)) return;
      await sleep(25);
    }
    throw new Error(`Local mutation completed but path was not observable: ${String(target)}`);
  }

  private async safePath(path: VaultPath, access: LocalVaultAccess): Promise<VaultPath> {
    const validation = validateCrossPlatformPath(path);
    if (validation.status === "blocked") {
      throw new Error(`Vault access boundary blocked ${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}`);
    }
    const normalized = asPath(String(path));
    await this.accessBoundary.assertSafe(normalized, access);
    return normalized;
  }

  private generationFor(path: VaultPath): number {
    return this.generations.get(String(path)) ?? 0;
  }

  private bump(path: string): void {
    const normalized = normalizeVaultPath(path);
    this.generations.set(normalized, (this.generations.get(normalized) ?? 0) + 1);
  }

  private installVaultEvents(): void {
    const register = (ref: unknown): void => {
      this.eventUnsubscribers.push(() => this.app.vault.offref(ref as never));
    };
    register(this.app.vault.on("create", (file: TAbstractFile) => {
      this.bump(file.path);
      this.emitChange({ kind: "created", path: asPath(file.path) });
    }));
    register(this.app.vault.on("modify", (file: TAbstractFile) => {
      this.bump(file.path);
      this.emitChange({ kind: "modified", path: asPath(file.path) });
    }));
    register(this.app.vault.on("delete", (file: TAbstractFile) => {
      this.bump(file.path);
      this.emitChange({ kind: "deleted", path: asPath(file.path) });
    }));
    register(this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
      this.bump(oldPath);
      this.bump(file.path);
      this.emitChange({ kind: "renamed", fromPath: asPath(oldPath), toPath: asPath(file.path) });
    }));
  }

  private installLifecycleEvents(): void {
    this.app.workspace.onLayoutReady(() => {
      this.vaultReady = true;
      this.emitLifecycle({ kind: "vault-ready" });
    });
    if (typeof document === "undefined") return;
    const visibility = (): void => this.emitLifecycle({ kind: document.visibilityState === "hidden" ? "suspend" : "resume" });
    const suspend = (): void => this.emitLifecycle({ kind: "suspend" });
    const resume = (): void => this.emitLifecycle({ kind: "resume" });
    document.addEventListener("visibilitychange", visibility);
    globalThis.addEventListener?.("pagehide", suspend);
    globalThis.addEventListener?.("pageshow", resume);
    this.eventUnsubscribers.push(() => document.removeEventListener("visibilitychange", visibility));
    this.eventUnsubscribers.push(() => globalThis.removeEventListener?.("pagehide", suspend));
    this.eventUnsubscribers.push(() => globalThis.removeEventListener?.("pageshow", resume));
  }

  private emitChange(change: LocalVaultChange): void {
    // Startup-generated activity is intentionally suppressed. Phase 5 will
    // reconcile the complete vault after `vault-ready`, then debounce/coalesce
    // subsequent truthful local events.
    if (!this.vaultReady || this.disposed) return;
    for (const listener of this.changeListeners) listener(change);
  }

  private emitLifecycle(event: LocalLifecycleEvent): void {
    if (this.disposed && event.kind !== "unload") return;
    for (const listener of this.lifecycleListeners) listener(event);
  }
}
