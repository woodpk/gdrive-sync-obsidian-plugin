import {
  contractId,
  LocalExclusionPolicy,
  normalizeVaultPath,
  SelectiveConfigurationPolicy,
  validateCrossPlatformPath,
  type BinaryContentSource,
  type ConfigurationClassification,
  type ContentEvidence,
  type LocalLifecycleEvent,
  type LocalMutationReceipt,
  type LocalObservation,
  type LocalReadResult,
  type LocalVaultChange,
  type LocalVaultListing,
  type LocalVaultPort,
  type ObservationToken,
  type PathValidationResult,
  type Unsubscribe,
  type VaultPath,
} from "../../../src/product/local-vault-boundary-seam";

type EntryKind = "file" | "folder";
type EntryAccess = "readable" | "unreadable" | "inaccessible" | "disk-full";
type EntryStability = "stable" | "unstable";

interface InMemoryEntry {
  readonly id: number;
  readonly kind: EntryKind;
  bytes?: Uint8Array;
  revision: number;
  access: EntryAccess;
  stability: EntryStability;
}

export interface InMemoryLocalVaultOptions {
  readonly activeConfigurationDirectory?: string;
  readonly userExclusionPatterns?: readonly string[];
  readonly ready?: boolean;
}

export interface SeedEntryOptions {
  readonly access?: EntryAccess;
  readonly stability?: EntryStability;
}

export class InMemoryLocalVaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InMemoryLocalVaultError";
  }
}

export class InMemoryLocalVaultStaleObservationError extends InMemoryLocalVaultError {
  constructor(readonly path: VaultPath) {
    super(`Stale in-memory local observation: ${String(path)}`);
    this.name = "InMemoryLocalVaultStaleObservationError";
  }
}

export const virtualVaultPath = (value: string): VaultPath =>
  contractId<"VaultPath">(value) as VaultPath;

function copyBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}

function encodeContent(content: string | Uint8Array): Uint8Array {
  return typeof content === "string"
    ? new TextEncoder().encode(content)
    : copyBytes(content);
}

async function collectContent(source: BinaryContentSource): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of source.openChunks()) {
    const copy = copyBytes(chunk);
    chunks.push(copy);
    total += copy.byteLength;
  }
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function contentSource(bytes: Uint8Array): BinaryContentSource {
  const retained = copyBytes(bytes);
  return {
    sizeBytes: retained.byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> {
      yield copyBytes(retained);
    },
  };
}

function isDescendant(path: string, parent: string): boolean {
  return path.startsWith(`${parent}/`);
}

export class InMemoryLocalVault implements LocalVaultPort {
  private readonly entries = new Map<string, InMemoryEntry>();
  private readonly changeListeners = new Set<(change: LocalVaultChange) => void>();
  private readonly lifecycleListeners = new Set<(event: LocalLifecycleEvent) => void>();
  private readonly configurationPolicy = new SelectiveConfigurationPolicy();
  private readonly exclusionPolicy: LocalExclusionPolicy;
  private readonly configurationDirectory: VaultPath;
  private nextEntityId = 1;
  private ready: boolean; private writeFailure?: "disk-full";

  constructor(options: InMemoryLocalVaultOptions = {}) {
    const configDirectory = options.activeConfigurationDirectory ?? ".obsidian";
    const validation = validateCrossPlatformPath(configDirectory);
    if (validation.status === "blocked") {
      throw new InMemoryLocalVaultError(
        `Invalid active configuration directory: ${validation.reason}`,
      );
    }
    this.configurationDirectory = virtualVaultPath(normalizeVaultPath(configDirectory));
    this.exclusionPolicy = new LocalExclusionPolicy(options.userExclusionPatterns ?? []);
    this.ready = options.ready ?? true;
  }

  async activeConfigurationDirectory(): Promise<VaultPath> {
    return this.configurationDirectory;
  }

  seedFile(
    path: string | VaultPath,
    content: string | Uint8Array,
    options: SeedEntryOptions = {},
  ): void {
    this.seed(path, "file", encodeContent(content), options);
  }

  seedFolder(path: string | VaultPath, options: SeedEntryOptions = {}): void {
    this.seed(path, "folder", undefined, options);
  }

  setAccess(path: string | VaultPath, access: EntryAccess): void {
    if (access === "disk-full") { this.writeFailure = access; return; }
    const entry = this.requiredEntry(path); entry.access = access; entry.revision += 1;
  }

  setStability(path: string | VaultPath, stability: EntryStability): void {
    const entry = this.requiredEntry(path);
    if (entry.kind !== "file") {
      throw new InMemoryLocalVaultError(
        `Only files have active-write stability: ${String(path)}`,
      );
    }
    entry.stability = stability;
    entry.revision += 1;
  }

  signalLifecycle(event: LocalLifecycleEvent["kind"]): void {
    if (event === "vault-ready" || event === "resume") this.ready = true;
    if (event === "suspend" || event === "unload") this.ready = false;
    this.emitLifecycle({ kind: event });
  }

  async enumerate(): Promise<LocalVaultListing> {
    const orderedPaths = [...this.entries.keys()].sort((left, right) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    const blockedFolders = orderedPaths.filter((path) => {
      const entry = this.entries.get(path)!;
      return (
        entry.kind === "folder" &&
        entry.access !== "readable" &&
        !this.isExcluded(path)
      );
    });

    const entries: LocalObservation[] = [];
    const uncertainties: NonNullable<LocalVaultListing["uncertainties"]>[number][] = [];

    for (const path of orderedPaths) {
      if (this.isExcluded(path)) continue;
      if (
        blockedFolders.some(
          (blocked) => blocked !== path && isDescendant(path, blocked),
        )
      ) {
        continue;
      }

      const entry = this.entries.get(path)!;
      const observation = this.observationFor(path, entry);
      entries.push(observation);

      if (observation.status === "unreadable" || observation.status === "inaccessible") {
        const vaultPath = virtualVaultPath(path);
        uncertainties.push(
          entry.kind === "folder"
            ? {
                scope: "subtree",
                path: vaultPath,
                reason: `${path}: subtree is ${observation.status}`,
              }
            : {
                scope: "path",
                path: vaultPath,
                reason: `${path}: path is ${observation.status}`,
              },
        );
      }
    }

    return {
      entries,
      completeness:
        uncertainties.length === 0
          ? { status: "complete" }
          : {
              status: "partial",
              reason: uncertainties.map((item) => item.reason).join("; "),
            },
      ...(uncertainties.length === 0 ? {} : { uncertainties }),
    };
  }

  async observe(path: VaultPath): Promise<LocalObservation> {
    const normalized = normalizeVaultPath(String(path));
    const entry = this.entries.get(normalized);
    return entry
      ? this.observationFor(normalized, entry)
      : {
          status: "absent",
          side: "local",
          path: virtualVaultPath(normalized),
        };
  }

  async readFile(
    path: VaultPath,
    expectedToken?: ObservationToken,
  ): Promise<LocalReadResult> {
    const normalized = normalizeVaultPath(String(path));
    const entry = this.requiredEntry(normalized);
    if (entry.kind !== "file") {
      throw new InMemoryLocalVaultError(`Cannot read folder as file: ${normalized}`);
    }
    this.assertReadable(normalized, entry);
    if (entry.stability !== "stable") {
      throw new InMemoryLocalVaultError(
        `Local file is not stable for reading: ${normalized}`,
      );
    }
    this.assertExpectedToken(normalized, entry, expectedToken);
    const token = this.tokenFor(entry);
    const evidence = this.evidenceFor(entry);
    return {
      content: contentSource(entry.bytes ?? new Uint8Array()),
      evidence,
      stability: "stable",
      observationToken: token,
    };
  }

  async createFile(
    path: VaultPath,
    content: BinaryContentSource,
  ): Promise<LocalMutationReceipt> {
    const normalized = this.assertCreateTarget(path);
    this.assertWritable(); const bytes = await collectContent(content);
    const entry = this.newEntry("file", bytes);
    this.entries.set(normalized, entry);
    const vaultPath = virtualVaultPath(normalized);
    this.emitChange({ kind: "created", path: vaultPath });
    return this.receiptFor(normalized, entry);
  }

  async replaceFile(
    path: VaultPath,
    content: BinaryContentSource,
    expectedToken?: ObservationToken,
  ): Promise<LocalMutationReceipt> {
    const normalized = normalizeVaultPath(String(path));
    const existing = this.entries.get(normalized);

    if (!existing) {
      if (expectedToken !== undefined) {
        throw new InMemoryLocalVaultStaleObservationError(
          virtualVaultPath(normalized),
        );
      }
      const validation = validateCrossPlatformPath(
        path,
        [...this.entries.keys()],
      );
      if (validation.status === "blocked") {
        throw new InMemoryLocalVaultError(
          `Local path is incompatible (${validation.reason}): ${String(path)}`,
        );
      }
      this.assertWritable(); const bytes = await collectContent(content);
      const created = this.newEntry("file", bytes);
      this.entries.set(normalized, created);
      const vaultPath = virtualVaultPath(normalized);
      this.emitChange({ kind: "created", path: vaultPath });
      return this.receiptFor(normalized, created);
    }

    if (existing.kind !== "file") {
      throw new InMemoryLocalVaultError(
        `Cannot replace folder as file: ${normalized}`,
      );
    }
    this.assertReadable(normalized, existing);
    this.assertExpectedToken(normalized, existing, expectedToken);
    this.assertWritable(); const bytes = await collectContent(content);
    existing.bytes = bytes;
    existing.revision += 1;
    existing.stability = "stable";
    const vaultPath = virtualVaultPath(normalized);
    this.emitChange({ kind: "modified", path: vaultPath });
    return this.receiptFor(normalized, existing);
  }

  async createFolder(path: VaultPath): Promise<LocalMutationReceipt> {
    const normalized = normalizeVaultPath(String(path));
    const existing = this.entries.get(normalized);
    if (existing) {
      return this.receiptFor(normalized, existing);
    }

    const target = this.assertCreateTarget(path);
    const entry = this.newEntry("folder");
    this.entries.set(target, entry);
    const vaultPath = virtualVaultPath(target);
    this.emitChange({ kind: "created", path: vaultPath });
    return this.receiptFor(target, entry);
  }

  async move(
    fromPath: VaultPath,
    toPath: VaultPath,
  ): Promise<LocalMutationReceipt> {
    const from = normalizeVaultPath(String(fromPath));
    const to = normalizeVaultPath(String(toPath));
    const root = this.requiredEntry(from);
    this.assertReadable(from, root);

    if (from === to) return this.receiptFor(from, root);
    if (isDescendant(to, from)) {
      throw new InMemoryLocalVaultError(
        `Cannot move a path into its own subtree: ${from} -> ${to}`,
      );
    }

    const movingPaths = [...this.entries.keys()]
      .filter((path) => path === from || isDescendant(path, from))
      .sort((left, right) => left.length - right.length);
    const movingSet = new Set(movingPaths);
    const unaffectedPaths = [...this.entries.keys()].filter(
      (path) => !movingSet.has(path),
    );

    const occupiedTargets = [...unaffectedPaths];
    const remapped = movingPaths.map((oldPath) => {
      const suffix = oldPath === from ? "" : oldPath.slice(from.length);
      const newPath = `${to}${suffix}`;
      const validation = validateCrossPlatformPath(newPath, occupiedTargets);
      if (validation.status === "blocked") {
        throw new InMemoryLocalVaultError(
          `Move destination is incompatible (${validation.reason}): ${newPath}`,
        );
      }
      if (occupiedTargets.includes(newPath)) {
        throw new InMemoryLocalVaultError(
          `Move destination collides with existing path: ${newPath}`,
        );
      }
      occupiedTargets.push(newPath);
      return { oldPath, newPath, entry: this.entries.get(oldPath)! };
    });

    for (const item of remapped) this.entries.delete(item.oldPath);
    for (const item of remapped) {
      item.entry.revision += 1;
      this.entries.set(item.newPath, item.entry);
    }

    const destination = virtualVaultPath(to);
    this.emitChange({
      kind: "renamed",
      fromPath: virtualVaultPath(from),
      toPath: destination,
    });
    return this.receiptFor(to, root);
  }

  async trash(path: VaultPath): Promise<void> {
    const normalized = normalizeVaultPath(String(path));
    const entry = this.requiredEntry(normalized);
    this.assertReadable(normalized, entry);
    const affected = [...this.entries.keys()].filter(
      (candidate) =>
        candidate === normalized || isDescendant(candidate, normalized),
    );
    for (const candidate of affected) this.entries.delete(candidate);
    this.emitChange({
      kind: "deleted",
      path: virtualVaultPath(normalized),
    });
  }

  async validatePath(path: VaultPath): Promise<PathValidationResult> {
    return validateCrossPlatformPath(path, [...this.entries.keys()]);
  }

  async classifyConfiguration(
    path: VaultPath,
  ): Promise<ConfigurationClassification> {
    return this.configurationPolicy.classify(path, this.configurationDirectory);
  }

  onChange(listener: (change: LocalVaultChange) => void): Unsubscribe {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe {
    this.lifecycleListeners.add(listener);
    if (this.ready) listener({ kind: "vault-ready" });
    return () => this.lifecycleListeners.delete(listener);
  }

  private seed(
    path: string | VaultPath,
    kind: EntryKind,
    bytes: Uint8Array | undefined,
    options: SeedEntryOptions,
  ): void {
    const raw = String(path);
    const validation = validateCrossPlatformPath(raw, [...this.entries.keys()]);
    if (validation.status === "blocked") {
      throw new InMemoryLocalVaultError(
        `Cannot seed incompatible path (${validation.reason}): ${raw}`,
      );
    }
    const normalized = normalizeVaultPath(raw);
    if (this.entries.has(normalized)) {
      throw new InMemoryLocalVaultError(`Seed path already exists: ${normalized}`);
    }
    this.entries.set(normalized, {
      ...this.newEntry(kind, bytes),
      access: options.access ?? "readable",
      stability: options.stability ?? "stable",
    });
  }

  private newEntry(kind: EntryKind, bytes?: Uint8Array): InMemoryEntry {
    return {
      id: this.nextEntityId++,
      kind,
      ...(kind === "file" ? { bytes: copyBytes(bytes ?? new Uint8Array()) } : {}),
      revision: 1,
      access: "readable",
      stability: "stable",
    };
  }

  private requiredEntry(path: string | VaultPath): InMemoryEntry {
    const normalized = normalizeVaultPath(String(path));
    const entry = this.entries.get(normalized);
    if (!entry) {
      throw new InMemoryLocalVaultError(`Local path does not exist: ${normalized}`);
    }
    return entry;
  }

  private assertCreateTarget(path: VaultPath): string {
    const raw = String(path);
    const validation = validateCrossPlatformPath(raw, [...this.entries.keys()]);
    if (validation.status === "blocked") {
      throw new InMemoryLocalVaultError(
        `Local path is incompatible (${validation.reason}): ${raw}`,
      );
    }
    const normalized = normalizeVaultPath(raw);
    if (this.entries.has(normalized)) {
      throw new InMemoryLocalVaultError(
        `Local path already exists: ${normalized}`,
      );
    }
    return normalized;
  }

  private assertWritable(): void { if (this.writeFailure === "disk-full") throw new InMemoryLocalVaultError("Local disk capacity exhausted"); }

  private assertReadable(path: string, entry: InMemoryEntry): void {
    if (entry.access !== "readable") {
      throw new InMemoryLocalVaultError(
        `Local path is ${entry.access}: ${path}`,
      );
    }
  }

  private assertExpectedToken(
    path: string,
    entry: InMemoryEntry,
    expectedToken?: ObservationToken,
  ): void {
    if (expectedToken !== undefined && expectedToken !== this.tokenFor(entry)) {
      throw new InMemoryLocalVaultStaleObservationError(virtualVaultPath(path));
    }
  }

  private tokenFor(entry: InMemoryEntry): ObservationToken {
    return contractId<"ObservationToken">(
      `in-memory-local:${entry.id}:r${entry.revision}`,
    ) as ObservationToken;
  }

  private evidenceFor(entry: InMemoryEntry): ContentEvidence {
    return entry.kind === "file"
      ? { sizeBytes: entry.bytes?.byteLength ?? 0 }
      : {};
  }

  private receiptFor(path: string, entry: InMemoryEntry): LocalMutationReceipt {
    return {
      path: virtualVaultPath(path),
      evidence: this.evidenceFor(entry),
      observationToken: this.tokenFor(entry),
    };
  }

  private observationFor(path: string, entry: InMemoryEntry): LocalObservation {
    const vaultPath = virtualVaultPath(path);
    if (entry.access === "unreadable" || entry.access === "inaccessible") {
      return {
        status: entry.access,
        side: "local",
        path: vaultPath,
        reason: `Simulated local path is ${entry.access}`,
      };
    }
    return {
      status: "present",
      side: "local",
      path: vaultPath,
      entityKind: entry.kind,
      ...(entry.kind === "file" ? { content: this.evidenceFor(entry) } : {}),
      stability: entry.kind === "file" ? entry.stability : "stable",
      observationToken: this.tokenFor(entry),
    };
  }

  private isExcluded(path: string): boolean {
    return this.exclusionPolicy.evaluate(path, this.configurationDirectory).excluded;
  }

  private emitChange(change: LocalVaultChange): void {
    for (const listener of this.changeListeners) listener(change);
  }

  private emitLifecycle(event: LocalLifecycleEvent): void {
    for (const listener of this.lifecycleListeners) listener(event);
  }
}
