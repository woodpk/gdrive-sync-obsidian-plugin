import type {
  BinaryContentSource,
  ContentEvidence,
  GoogleDrivePort,
  LocalVaultPort,
  SynchronizationCancellationSignal,
  VaultPath,
  VersionReference,
} from "../contracts";
import {
  DEFAULT_TEXT_MERGE_RESOURCE_POLICY,
  isSafelyRecognizedTextPath,
  type MergeOutputEvidenceProvider,
  type TextReadOptions,
  type TextVersionProvider,
} from "../core/conflict-resolver";
import { isCanonicalSha256, sha256Text } from "../util/sha256";

export interface TextVersionPersistence {
  get(key: string): Promise<string | undefined>;
  put(key: string, text: string): Promise<void>;
}

export class MemoryTextVersionPersistence implements TextVersionPersistence {
  private readonly values = new Map<string, string>();
  async get(key: string): Promise<string | undefined> { return this.values.get(key); }
  async put(key: string, text: string): Promise<void> { this.values.set(key, text); }
}

export class IndexedDbTextVersionPersistence implements TextVersionPersistence {
  private databasePromise?: Promise<IDBDatabase>;
  constructor(private readonly databaseName: string) {}

  async get(key: string): Promise<string | undefined> {
    const database = await this.database();
    return new Promise((resolve, reject) => {
      const request = database.transaction("versions", "readonly").objectStore("versions").get(key);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : undefined);
      request.onerror = () => reject(request.error ?? new Error("text-version IndexedDB read failed"));
    });
  }

  async put(key: string, text: string): Promise<void> {
    const database = await this.database();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("versions", "readwrite");
      transaction.objectStore("versions").put(text, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("text-version IndexedDB write failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("text-version IndexedDB write aborted"));
    });
  }

  private database(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve, reject) => {
      const factory = globalThis.indexedDB;
      if (!factory) { reject(new Error("IndexedDB is unavailable for device-local text version storage")); return; }
      const request = factory.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("versions")) request.result.createObjectStore("versions");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("text-version IndexedDB open failed"));
    });
    return this.databasePromise;
  }
}

function evidenceMatches(actual: ContentEvidence | undefined, expected: ContentEvidence | undefined): boolean {
  if (!expected) return true;
  if (expected.hash) return actual?.hash === expected.hash;
  if (expected.revision) return actual?.revision === expected.revision;
  return false;
}

function versionKey(version: VersionReference): string | undefined {
  if (
    version.entityKind !== "file" ||
    !isSafelyRecognizedTextPath(version.path) ||
    !isCanonicalSha256(version.content?.hash)
  ) return undefined;
  return `hash:${String(version.content.hash)}`;
}

function retainedMatches(version: VersionReference, text: string): boolean {
  const expected = version.content?.hash;
  return isCanonicalSha256(expected) && sha256Text(text) === expected;
}

function cancelled(signal?: SynchronizationCancellationSignal): boolean { return signal?.cancelled === true; }

async function decodeBoundedUtf8(source: BinaryContentSource, maximumBytes: number, expectedBytes: number, cancellation?: SynchronizationCancellationSignal): Promise<string | undefined> {
  if (expectedBytes > maximumBytes || (source.sizeBytes !== undefined && source.sizeBytes !== expectedBytes) || cancelled(cancellation)) return undefined;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts: string[] = [];
  let bytesRead = 0;
  try {
    for await (const chunk of source.openChunks()) {
      if (cancelled(cancellation)) return undefined;
      bytesRead += chunk.byteLength;
      if (bytesRead > maximumBytes || bytesRead > expectedBytes) return undefined;
      parts.push(decoder.decode(chunk, { stream: true }));
    }
    if (bytesRead !== expectedBytes || cancelled(cancellation)) return undefined;
    parts.push(decoder.decode());
    return parts.join("");
  } catch {
    return undefined;
  }
}

function textSource(text: string): BinaryContentSource {
  return {
    sizeBytes: new TextEncoder().encode(text).byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> {
      const encoder = new TextEncoder();
      const charsPerChunk = 64 * 1024;
      for (let offset = 0; offset < text.length; offset += charsPerChunk) yield encoder.encode(text.slice(offset, offset + charsPerChunk));
      if (text.length === 0) yield new Uint8Array();
    },
  };
}

/** Device-local exact text materialization keyed by canonical content evidence. */
export class ProductTextVersionStore implements TextVersionProvider, MergeOutputEvidenceProvider {
  constructor(
    private readonly persistence: TextVersionPersistence,
    private readonly local: LocalVaultPort,
    private readonly drive: GoogleDrivePort,
    private readonly maximumRetainedTextBytes = DEFAULT_TEXT_MERGE_RESOURCE_POLICY.maximumInputBytesPerVersion,
  ) {}

  async readText(version: VersionReference, options: TextReadOptions = {}): Promise<string | undefined> {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    const maximumBytes = Math.min(options.maximumBytes ?? this.maximumRetainedTextBytes, this.maximumRetainedTextBytes);
    if (!key || declaredSize === undefined || declaredSize > maximumBytes || cancelled(options.cancellation)) return undefined;

    const retained = await this.persistence.get(key);
    if (retained !== undefined) {
      if (cancelled(options.cancellation)) return undefined;
      const retainedSize = new TextEncoder().encode(retained).byteLength;
      return retainedSize === declaredSize && retainedSize <= maximumBytes && retainedMatches(version, retained) ? retained : undefined;
    }

    if (version.observationToken) {
      const read = await this.local.readFile(version.path, version.observationToken);
      if (!evidenceMatches(read.evidence, version.content)) return undefined;
      const text = await decodeBoundedUtf8(read.content, maximumBytes, declaredSize, options.cancellation);
      if (text === undefined || !retainedMatches(version, text)) return undefined;
      await this.persistence.put(key, text);
      return text;
    }

    if (version.remoteObjectId) {
      const downloaded = await this.drive.download(version.remoteObjectId);
      if (!downloaded.ok || !evidenceMatches(downloaded.value.evidence, version.content)) return undefined;
      const text = await decodeBoundedUtf8(downloaded.value.content, maximumBytes, declaredSize, options.cancellation);
      if (text === undefined || !retainedMatches(version, text)) return undefined;
      await this.persistence.put(key, text);
      return text;
    }

    return undefined;
  }

  async evidenceFor(path: VaultPath, mergedText: string): Promise<ContentEvidence | undefined> {
    const sizeBytes = new TextEncoder().encode(mergedText).byteLength;
    if (sizeBytes > this.maximumRetainedTextBytes) return undefined;
    const evidence: ContentEvidence = { hash: sha256Text(mergedText), sizeBytes };
    return await this.persistText({ path, entityKind: "file", content: evidence }, mergedText) ? evidence : undefined;
  }

  async retainedText(version: VersionReference): Promise<string | undefined> {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    if (!key || declaredSize === undefined || declaredSize > this.maximumRetainedTextBytes) return undefined;
    const text = await this.persistence.get(key);
    if (text === undefined) return undefined;
    const actualSize = new TextEncoder().encode(text).byteLength;
    return actualSize === declaredSize && actualSize <= this.maximumRetainedTextBytes && retainedMatches(version, text) ? text : undefined;
  }

  async retainVersion(version: VersionReference): Promise<boolean> {
    if (version.entityKind !== "file" || !isSafelyRecognizedTextPath(version.path)) return true;
    return (await this.readText(version)) !== undefined;
  }

  async persistText(version: VersionReference, text: string): Promise<boolean> {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    const actualSize = new TextEncoder().encode(text).byteLength;
    if (!key || declaredSize === undefined || actualSize !== declaredSize || actualSize > this.maximumRetainedTextBytes || !retainedMatches(version, text)) return false;
    await this.persistence.put(key, text);
    return true;
  }

  async aliasText(from: VersionReference, to: VersionReference): Promise<boolean> {
    const text = await this.retainedText(from) ?? await this.readText(from);
    if (text === undefined) return false;
    return this.persistText(to, text);
  }

  capture(version: VersionReference, source: BinaryContentSource): BinaryContentSource {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    if (!key || declaredSize === undefined || source.sizeBytes === undefined || declaredSize !== source.sizeBytes || source.sizeBytes > this.maximumRetainedTextBytes) return source;
    const persistence = this.persistence;
    const maximumBytes = this.maximumRetainedTextBytes;
    return {
      sizeBytes: source.sizeBytes,
      async *openChunks(): AsyncIterable<Uint8Array> {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        const parts: string[] = [];
        let bytesRead = 0;
        for await (const chunk of source.openChunks()) {
          bytesRead += chunk.byteLength;
          if (bytesRead > maximumBytes || bytesRead > declaredSize) throw new Error("captured recognized text exceeded admitted byte size");
          parts.push(decoder.decode(chunk, { stream: true }));
          yield chunk;
        }
        if (bytesRead !== declaredSize) throw new Error("captured recognized text byte size did not match canonical evidence");
        parts.push(decoder.decode());
        const text = parts.join("");
        if (!retainedMatches(version, text)) throw new Error("captured recognized text does not match its canonical evidence");
        await persistence.put(key, text);
      },
    };
  }

  async sourceForRetained(version: VersionReference): Promise<BinaryContentSource | undefined> {
    const text = await this.retainedText(version);
    return text === undefined ? undefined : textSource(text);
  }
}
