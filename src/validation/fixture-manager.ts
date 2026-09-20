import {
  contractId,
  type BinaryContentSource,
  type ContentHash,
  type VaultPath,
} from "../contracts/common";
import type { LocalVaultPort } from "../contracts/local-vault";
import { Sha256, sha256BinarySource } from "../util/sha256";
import {
  validationFixtureIdentity,
  type ValidationFixtureIdentity,
  type ValidationRunIdentity,
  type ValidationSandboxAuthorization,
  type ValidationSandboxAuthorizationRequest,
  type ValidationSandboxMutation,
  type ValidationSandboxOwnership,
  type ValidationSandboxRejectionReason,
} from "./run-sandbox-checkpoint-contracts";

export const VALIDATION_FIXTURE_KINDS = ["text", "opaque-binary", "empty-folder", "large-file"] as const;
export type ValidationFixtureKind = (typeof VALIDATION_FIXTURE_KINDS)[number];

export const VALIDATION_FIXTURE_PURPOSES = ["ordinary", "exclusion", "path-collision", "deletion", "conflict"] as const;
export type ValidationFixturePurpose = (typeof VALIDATION_FIXTURE_PURPOSES)[number];

export const VALIDATION_TEXT_VARIANTS = ["base", "non-overlap-a", "non-overlap-b", "overlap-a", "overlap-b"] as const;
export type ValidationTextVariant = (typeof VALIDATION_TEXT_VARIANTS)[number];

export interface ValidationFixtureSpec {
  readonly fixtureId: string;
  readonly relativePath: string;
  readonly kind: ValidationFixtureKind;
  readonly purpose: ValidationFixturePurpose;
  readonly version: number;
  readonly sizeBytes?: number;
  readonly textVariant?: ValidationTextVariant;
}

export interface ValidationFixtureDescriptor {
  readonly identity: ValidationFixtureIdentity;
  readonly relativePath: string;
  readonly path: VaultPath;
  readonly kind: ValidationFixtureKind;
  readonly purpose: ValidationFixturePurpose;
  readonly version: number;
  readonly sizeBytes: number;
  readonly hash?: ContentHash;
}

export interface ValidationFixtureLimits {
  readonly chunkSizeBytes: number;
  readonly maxOpaqueBinaryBytes: number;
  readonly maxLargeFileBytes: number;
}

export const DEFAULT_VALIDATION_FIXTURE_LIMITS: Readonly<ValidationFixtureLimits> = Object.freeze({
  chunkSizeBytes: 256 * 1024,
  maxOpaqueBinaryBytes: 32 * 1024 * 1024,
  maxLargeFileBytes: 256 * 1024 * 1024,
});

export type ValidationSandboxAuthorizer = (
  request: ValidationSandboxAuthorizationRequest,
) => ValidationSandboxAuthorization | Promise<ValidationSandboxAuthorization>;

export interface ValidationFixtureManagerOptions {
  readonly run: ValidationRunIdentity;
  /** Existing disposable vault namespace already owned by the active sandbox run. */
  readonly fixtureRoot: string;
  readonly ownership?: ValidationSandboxOwnership | readonly ValidationSandboxOwnership[];
  readonly authorize: ValidationSandboxAuthorizer;
  readonly local: LocalVaultPort;
  readonly limits?: Partial<ValidationFixtureLimits>;
}

export class ValidationFixtureAuthorizationError extends Error {
  readonly name = "ValidationFixtureAuthorizationError";
  constructor(readonly reason: ValidationSandboxRejectionReason) {
    super(`Validation fixture mutation rejected: ${reason}`);
  }
}

export class ValidationFixturePathError extends Error {
  readonly name = "ValidationFixturePathError";
}

export class ValidationFixtureStateError extends Error {
  readonly name = "ValidationFixtureStateError";
}

export class ValidationFixtureIntegrityError extends Error {
  readonly name = "ValidationFixtureIntegrityError";
}

function positiveVersion(version: number): number {
  if (!Number.isSafeInteger(version) || version <= 0) throw new Error("Validation fixture version must be a positive safe integer.");
  return version;
}

function boundedSize(sizeBytes: number, label: string): number {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new Error(`${label} must be a non-negative safe integer.`);
  return sizeBytes;
}

function fixtureSpec(input: ValidationFixtureSpec): ValidationFixtureSpec {
  if (!input.fixtureId || input.fixtureId.trim() !== input.fixtureId) throw new Error("Validation fixture ID must be a non-empty, trim-stable string.");
  const relativePath = validateRelativePath(input.relativePath, "Validation fixture path");
  positiveVersion(input.version);
  if (input.kind === "text") {
    if (input.sizeBytes !== undefined) throw new Error("Text fixtures derive their byte size from the deterministic recipe.");
    if (!input.textVariant) throw new Error("Text fixtures require a deterministic text variant.");
  } else if (input.kind === "empty-folder") {
    if (input.sizeBytes !== undefined || input.textVariant !== undefined) throw new Error("Empty-folder fixtures cannot carry file content options.");
  } else {
    if (input.sizeBytes === undefined) throw new Error(`${input.kind} fixtures require sizeBytes.`);
    boundedSize(input.sizeBytes, "Validation fixture size");
    if (input.textVariant !== undefined) throw new Error(`${input.kind} fixtures cannot carry a text variant.`);
  }
  return Object.freeze({ ...input, relativePath });
}

export function validationTextFixture(
  fixtureId: string,
  relativePath: string,
  version = 1,
  textVariant: ValidationTextVariant = "base",
  purpose: ValidationFixturePurpose = "ordinary",
): ValidationFixtureSpec {
  return fixtureSpec({ fixtureId, relativePath, kind: "text", purpose, version, textVariant });
}

export function validationOpaqueBinaryFixture(
  fixtureId: string,
  relativePath: string,
  sizeBytes: number,
  version = 1,
  purpose: ValidationFixturePurpose = "ordinary",
): ValidationFixtureSpec {
  return fixtureSpec({ fixtureId, relativePath, kind: "opaque-binary", purpose, version, sizeBytes });
}

export function validationEmptyFolderFixture(
  fixtureId: string,
  relativePath: string,
  version = 1,
  purpose: ValidationFixturePurpose = "ordinary",
): ValidationFixtureSpec {
  return fixtureSpec({ fixtureId, relativePath, kind: "empty-folder", purpose, version });
}

export function validationLargeFileFixture(
  fixtureId: string,
  relativePath: string,
  sizeBytes: number,
  version = 1,
  purpose: ValidationFixturePurpose = "ordinary",
): ValidationFixtureSpec {
  return fixtureSpec({ fixtureId, relativePath, kind: "large-file", purpose, version, sizeBytes });
}

export function validationExclusionFixture(fixtureId: string, relativePath: string, version = 1): ValidationFixtureSpec {
  return validationTextFixture(fixtureId, relativePath, version, "base", "exclusion");
}

export function validationDeletionFixture(fixtureId: string, relativePath: string, version = 1): ValidationFixtureSpec {
  return validationTextFixture(fixtureId, relativePath, version, "base", "deletion");
}

export function validationPathCollisionFixtures(
  fixtureIdPrefix: string,
  firstPath: string,
  secondPath: string,
  version = 1,
): readonly [ValidationFixtureSpec, ValidationFixtureSpec] {
  return Object.freeze([
    validationTextFixture(`${fixtureIdPrefix}-a`, firstPath, version, "base", "path-collision"),
    validationTextFixture(`${fixtureIdPrefix}-b`, secondPath, version, "base", "path-collision"),
  ]);
}

export function validationVersionedFixture(
  spec: ValidationFixtureSpec,
  version: number,
  textVariant: ValidationTextVariant | undefined = spec.textVariant,
): ValidationFixtureSpec {
  return fixtureSpec({ ...spec, version, ...(spec.kind === "text" ? { textVariant: textVariant ?? "base" } : {}) });
}

function validateRelativePath(path: string, label: string): string {
  if (!path || path.startsWith("/") || path.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(path) || /^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    throw new ValidationFixturePathError(`${label} must be vault-relative.`);
  }
  if (path.includes("\\")) throw new ValidationFixturePathError(`${label} must use forward slashes.`);
  const components = path.split("/");
  if (components.some(component => component === "" || component === "." || component === "..")) {
    throw new ValidationFixturePathError(`${label} cannot contain empty, current-directory, or parent-directory components.`);
  }
  return path;
}

function toVaultPath(path: string): VaultPath {
  return contractId<"VaultPath">(path) as VaultPath;
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

function deterministicTextBytes(spec: ValidationFixtureSpec): Uint8Array {
  const variant = spec.textVariant ?? "base";
  let left = "base";
  let right = "base";
  let overlap = "base";
  if (variant === "non-overlap-a") left = "edit-a";
  if (variant === "non-overlap-b") right = "edit-b";
  if (variant === "overlap-a") overlap = "edit-a";
  if (variant === "overlap-b") overlap = "edit-b";
  return new TextEncoder().encode([
    "BRAIN validation fixture",
    `fixture=${spec.fixtureId}`,
    `version=${spec.version}`,
    `left=${left}`,
    `right=${right}`,
    `overlap=${overlap}`,
    "",
  ].join("\n"));
}

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash || 0x9e3779b9;
}

function xorshift32(value: number): number {
  let next = value >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}

function deterministicBinarySource(spec: ValidationFixtureSpec, chunkSizeBytes: number): BinaryContentSource {
  const sizeBytes = spec.sizeBytes ?? 0;
  const seed = fnv1a32(`${spec.fixtureId}|${spec.kind}|${spec.version}`);
  return {
    sizeBytes,
    async *openChunks(): AsyncIterable<Uint8Array> {
      let remaining = sizeBytes;
      let state = seed;
      while (remaining > 0) {
        const length = Math.min(chunkSizeBytes, remaining);
        const chunk = new Uint8Array(length);
        for (let index = 0; index < length; index += 1) {
          state = xorshift32(state);
          chunk[index] = state & 0xff;
        }
        remaining -= length;
        yield chunk;
      }
    },
  };
}

function textSource(spec: ValidationFixtureSpec): BinaryContentSource {
  const bytes = deterministicTextBytes(spec);
  return {
    sizeBytes: bytes.byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> { yield bytes; },
  };
}

interface ManagedFixture {
  readonly spec: ValidationFixtureSpec;
  readonly descriptor: ValidationFixtureDescriptor;
}

export class ValidationFixtureManager {
  private readonly run: ValidationRunIdentity;
  private readonly root: string;
  private readonly ownership: readonly ValidationSandboxOwnership[];
  private readonly authorizeRequest: ValidationSandboxAuthorizer;
  private readonly local: LocalVaultPort;
  private readonly limits: ValidationFixtureLimits;
  private readonly active = new Map<string, ManagedFixture>();
  private readonly deleted = new Map<string, ManagedFixture>();

  constructor(options: ValidationFixtureManagerOptions) {
    this.run = options.run;
    this.root = validateRelativePath(options.fixtureRoot, "Validation fixture root");
    this.ownership = options.ownership === undefined
      ? []
      : Array.isArray(options.ownership)
        ? [...options.ownership]
        : [options.ownership];
    this.authorizeRequest = options.authorize;
    this.local = options.local;
    this.limits = this.normalizeLimits(options.limits);
  }

  list(): readonly ValidationFixtureDescriptor[] {
    return Object.freeze([...this.active.values()].map(value => value.descriptor));
  }

  get(fixtureId: string): ValidationFixtureDescriptor | undefined {
    return this.active.get(fixtureId)?.descriptor;
  }

  async create(specInput: ValidationFixtureSpec): Promise<ValidationFixtureDescriptor> {
    const spec = fixtureSpec(specInput);
    if (this.active.has(spec.fixtureId) || this.deleted.has(spec.fixtureId)) {
      throw new ValidationFixtureStateError(`Fixture ID is already known to this manager: ${spec.fixtureId}`);
    }
    await this.authorizeMutation("setup");
    const path = await this.prepareTarget(spec.relativePath);
    const observation = await this.local.observe(path);
    if (observation.status !== "absent") throw new ValidationFixtureStateError(`Fixture target is not authoritatively absent: ${String(path)}`);

    const descriptor = await this.expectedDescriptor(spec, path);
    if (spec.kind === "empty-folder") {
      await this.local.createFolder(path);
      this.active.set(spec.fixtureId, { spec, descriptor });
      return descriptor;
    }

    const source = this.contentSource(spec);
    await this.local.createFile(path, source);
    this.active.set(spec.fixtureId, { spec, descriptor });
    await this.verifyFile(descriptor);
    return descriptor;
  }

  async edit(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    const current = this.requireActive(fixtureId);
    if (current.spec.kind === "empty-folder") throw new ValidationFixtureStateError("Empty-folder fixtures cannot be edited as files.");
    await this.authorizeMutation("mutate");
    const spec = validationVersionedFixture(current.spec, version, textVariant);
    const path = await this.prepareExistingFile(current.descriptor.path);
    const observation = await this.local.observe(path);
    if (observation.status !== "present" || observation.entityKind !== "file") {
      throw new ValidationFixtureStateError(`Fixture edit target is not an observed file: ${String(path)}`);
    }
    const descriptor = await this.expectedDescriptor(spec, path);
    await this.local.replaceFile(path, this.contentSource(spec), observation.observationToken);
    this.active.set(fixtureId, { spec, descriptor });
    await this.verifyFile(descriptor);
    return descriptor;
  }

  async move(fixtureId: string, newRelativePath: string): Promise<ValidationFixtureDescriptor> {
    const current = this.requireActive(fixtureId);
    await this.authorizeMutation("mutate");
    const target = await this.prepareTarget(newRelativePath);
    const targetObservation = await this.local.observe(target);
    if (targetObservation.status !== "absent") throw new ValidationFixtureStateError(`Fixture move target is not authoritatively absent: ${String(target)}`);
    const sourceObservation = await this.local.observe(current.descriptor.path);
    if (sourceObservation.status !== "present") throw new ValidationFixtureStateError(`Fixture move source is not authoritatively present: ${String(current.descriptor.path)}`);
    await this.local.move(current.descriptor.path, target);
    const spec = fixtureSpec({ ...current.spec, relativePath: validateRelativePath(newRelativePath, "Validation fixture path") });
    const descriptor = Object.freeze({ ...current.descriptor, relativePath: spec.relativePath, path: target });
    this.active.set(fixtureId, { spec, descriptor });
    if (descriptor.kind !== "empty-folder") await this.verifyFile(descriptor);
    return descriptor;
  }

  async delete(fixtureId: string): Promise<ValidationFixtureDescriptor> {
    const current = this.requireActive(fixtureId);
    await this.authorizeMutation("mutate");
    const observation = await this.local.observe(current.descriptor.path);
    if (observation.status !== "present") throw new ValidationFixtureStateError(`Fixture delete target is not authoritatively present: ${String(current.descriptor.path)}`);
    await this.local.trash(current.descriptor.path);
    const after = await this.local.observe(current.descriptor.path);
    if (after.status !== "absent") throw new ValidationFixtureStateError(`Fixture deletion did not establish authoritative absence: ${String(current.descriptor.path)}`);
    this.active.delete(fixtureId);
    this.deleted.set(fixtureId, current);
    return current.descriptor;
  }

  async restore(fixtureId: string): Promise<ValidationFixtureDescriptor> {
    const previous = this.deleted.get(fixtureId);
    if (!previous) throw new ValidationFixtureStateError(`Fixture is not available for deterministic restore: ${fixtureId}`);
    await this.authorizeMutation("mutate");
    const path = await this.prepareTarget(previous.spec.relativePath);
    const observation = await this.local.observe(path);
    if (observation.status !== "absent") throw new ValidationFixtureStateError(`Fixture restore target is not authoritatively absent: ${String(path)}`);
    const descriptor = await this.expectedDescriptor(previous.spec, path);
    if (previous.spec.kind === "empty-folder") {
      await this.local.createFolder(path);
    } else {
      await this.local.createFile(path, this.contentSource(previous.spec));
    }
    this.active.set(fixtureId, { spec: previous.spec, descriptor });
    this.deleted.delete(fixtureId);
    if (descriptor.kind !== "empty-folder") await this.verifyFile(descriptor);
    return descriptor;
  }

  async restoreVersion(
    fixtureId: string,
    version: number,
    textVariant?: ValidationTextVariant,
  ): Promise<ValidationFixtureDescriptor> {
    const active = this.active.get(fixtureId);
    if (active) return this.edit(fixtureId, version, textVariant);
    const deleted = this.deleted.get(fixtureId);
    if (!deleted) throw new ValidationFixtureStateError(`Fixture is unknown: ${fixtureId}`);
    this.deleted.set(fixtureId, {
      spec: validationVersionedFixture(deleted.spec, version, textVariant),
      descriptor: deleted.descriptor,
    });
    return this.restore(fixtureId);
  }

  async hash(fixtureId: string): Promise<ContentHash> {
    const current = this.requireActive(fixtureId);
    if (current.descriptor.kind === "empty-folder") throw new ValidationFixtureStateError("Empty-folder fixtures do not have a content hash.");
    const read = await this.local.readFile(current.descriptor.path);
    return sha256BinarySource(read.content);
  }

  async cleanup(): Promise<void> {
    await this.authorizeMutation("cleanup");
    const fixtures = [...this.active.values()].sort((left, right) => right.descriptor.path.length - left.descriptor.path.length);
    for (const fixture of fixtures) {
      const observation = await this.local.observe(fixture.descriptor.path);
      if (observation.status === "present") {
        await this.local.trash(fixture.descriptor.path);
        const after = await this.local.observe(fixture.descriptor.path);
        if (after.status !== "absent") throw new ValidationFixtureStateError(`Fixture cleanup could not prove absence: ${String(fixture.descriptor.path)}`);
      } else if (observation.status !== "absent") {
        throw new ValidationFixtureStateError(`Fixture cleanup refused uncertain path state: ${String(fixture.descriptor.path)}`);
      }
      this.active.delete(String(fixture.descriptor.identity.fixtureId));
    }
    this.deleted.clear();
  }

  private requireActive(fixtureId: string): ManagedFixture {
    const fixture = this.active.get(fixtureId);
    if (!fixture) throw new ValidationFixtureStateError(`Fixture is not active: ${fixtureId}`);
    return fixture;
  }

  private normalizeLimits(input: Partial<ValidationFixtureLimits> | undefined): ValidationFixtureLimits {
    const limits = { ...DEFAULT_VALIDATION_FIXTURE_LIMITS, ...input };
    for (const [label, value] of Object.entries(limits)) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Validation fixture ${label} must be a positive safe integer.`);
    }
    return Object.freeze(limits);
  }

  private async authorizeMutation(mutation: ValidationSandboxMutation): Promise<void> {
    if (this.ownership.length === 0) throw new ValidationFixtureAuthorizationError("ownership-unproven");
    if (this.ownership.length !== 1) throw new ValidationFixtureAuthorizationError("ownership-ambiguous");
    const ownership = this.ownership[0];
    if (ownership.surface !== "vault-fixture") throw new ValidationFixtureAuthorizationError("surface-out-of-scope");
    if (ownership.owner.runId !== this.run.runId) throw new ValidationFixtureAuthorizationError("run-mismatch");
    if (ownership.owner.scenarioId !== this.run.scenarioId) throw new ValidationFixtureAuthorizationError("scenario-mismatch");

    const authorization = await this.authorizeRequest({ run: this.run, mutation, ownership });
    if (authorization.status === "rejected") throw new ValidationFixtureAuthorizationError(authorization.reason);
    if (authorization.ownership.surface !== "vault-fixture") throw new ValidationFixtureAuthorizationError("surface-out-of-scope");
    if (!sameRun(authorization.ownership.owner, this.run)) {
      throw new ValidationFixtureAuthorizationError(
        authorization.ownership.owner.runId === this.run.runId ? "scenario-mismatch" : "run-mismatch",
      );
    }
    if (authorization.ownership.resourceId !== ownership.resourceId) throw new ValidationFixtureAuthorizationError("ownership-ambiguous");
  }

  private async prepareTarget(relativePath: string): Promise<VaultPath> {
    const path = this.resolvePath(relativePath);
    const validation = await this.local.validatePath(path);
    if (validation.status === "blocked") {
      throw new ValidationFixturePathError(`Fixture path is blocked (${validation.reason}): ${String(path)}`);
    }
    return path;
  }

  private async prepareExistingFile(path: VaultPath): Promise<VaultPath> {
    const validation = await this.local.validatePath(path);
    if (validation.status === "blocked") {
      throw new ValidationFixturePathError(`Fixture path is blocked (${validation.reason}): ${String(path)}`);
    }
    return path;
  }

  private resolvePath(relativePath: string): VaultPath {
    const safeRelativePath = validateRelativePath(relativePath, "Validation fixture path");
    return toVaultPath(`${this.root}/${safeRelativePath}`);
  }

  private contentSource(spec: ValidationFixtureSpec): BinaryContentSource {
    if (spec.kind === "text") return textSource(spec);
    if (spec.kind === "empty-folder") throw new ValidationFixtureStateError("Empty folders do not have a binary content source.");
    const sizeBytes = spec.sizeBytes ?? 0;
    const maximum = spec.kind === "large-file" ? this.limits.maxLargeFileBytes : this.limits.maxOpaqueBinaryBytes;
    if (sizeBytes > maximum) throw new ValidationFixtureStateError(`${spec.kind} fixture exceeds configured bound of ${maximum} bytes.`);
    return deterministicBinarySource(spec, this.limits.chunkSizeBytes);
  }

  private async expectedDescriptor(spec: ValidationFixtureSpec, path: VaultPath): Promise<ValidationFixtureDescriptor> {
    if (spec.kind === "empty-folder") {
      return Object.freeze({
        identity: validationFixtureIdentity(this.run, spec.fixtureId),
        relativePath: spec.relativePath,
        path,
        kind: spec.kind,
        purpose: spec.purpose,
        version: spec.version,
        sizeBytes: 0,
      });
    }
    const source = this.contentSource(spec);
    const hash = await sha256BinarySource(source);
    return Object.freeze({
      identity: validationFixtureIdentity(this.run, spec.fixtureId),
      relativePath: spec.relativePath,
      path,
      kind: spec.kind,
      purpose: spec.purpose,
      version: spec.version,
      sizeBytes: source.sizeBytes ?? 0,
      hash,
    });
  }

  private async verifyFile(descriptor: ValidationFixtureDescriptor): Promise<void> {
    const read = await this.local.readFile(descriptor.path);
    const hash = new Sha256();
    let actualSize = 0;
    for await (const chunk of read.content.openChunks()) {
      hash.update(chunk);
      actualSize += chunk.byteLength;
    }
    const actualHash = contractId<"ContentHash">(`sha256:${hash.digestHex()}`) as ContentHash;
    if (descriptor.hash !== actualHash || actualSize !== descriptor.sizeBytes) {
      throw new ValidationFixtureIntegrityError(`Fixture bytes failed deterministic hash/size verification: ${String(descriptor.identity.fixtureId)}`);
    }
  }
}
