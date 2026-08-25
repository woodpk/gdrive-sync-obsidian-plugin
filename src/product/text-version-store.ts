import type {
  BinaryContentSource,
  ContentEvidence,
  GoogleDrivePort,
  LocalVaultPort,
  VaultPath,
  VersionReference,
} from "../contracts";
import { isSafelyRecognizedTextPath, type MergeOutputEvidenceProvider, type TextVersionProvider } from "../core/conflict-resolver";
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

async function decodeUtf8(source: BinaryContentSource): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  for await (const chunk of source.openChunks()) text += decoder.decode(chunk, { stream: true });
  text += decoder.decode();
  return text;
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
  ) {}

  async readText(version: VersionReference): Promise<string | undefined> {
    const key = versionKey(version);
    if (!key) return undefined;
    const retained = await this.persistence.get(key);
    if (retained !== undefined) return retainedMatches(version, retained) ? retained : undefined;

    if (version.observationToken) {
      const read = await this.local.readFile(version.path, version.observationToken);
      if (!evidenceMatches(read.evidence, version.content)) return undefined;
      const text = await decodeUtf8(read.content);
      if (!retainedMatches(version, text)) return undefined;
      await this.persistence.put(key, text);
      return text;
    }

    if (version.remoteObjectId) {
      const downloaded = await this.drive.download(version.remoteObjectId);
      if (!downloaded.ok || !evidenceMatches(downloaded.value.evidence, version.content)) return undefined;
      const text = await decodeUtf8(downloaded.value.content);
      if (!retainedMatches(version, text)) return undefined;
      await this.persistence.put(key, text);
      return text;
    }

    return undefined;
  }

  async evidenceFor(path: VaultPath, mergedText: string): Promise<ContentEvidence> {
    const evidence: ContentEvidence = {
      hash: sha256Text(mergedText),
      sizeBytes: new TextEncoder().encode(mergedText).byteLength,
    };
    await this.persistText({ path, entityKind: "file", content: evidence }, mergedText);
    return evidence;
  }

  async retainedText(version: VersionReference): Promise<string | undefined> {
    const key = versionKey(version);
    if (!key) return undefined;
    const text = await this.persistence.get(key);
    return text !== undefined && retainedMatches(version, text) ? text : undefined;
  }

  async retainVersion(version: VersionReference): Promise<boolean> {
    if (version.entityKind !== "file" || !isSafelyRecognizedTextPath(version.path)) return true;
    return (await this.readText(version)) !== undefined;
  }

  async persistText(version: VersionReference, text: string): Promise<boolean> {
    const key = versionKey(version);
    if (!key || !retainedMatches(version, text)) return false;
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
    if (!key) return source;
    const persistence = this.persistence;
    return {
      sizeBytes: source.sizeBytes,
      async *openChunks(): AsyncIterable<Uint8Array> {
        const decoder = new TextDecoder();
        let text = "";
        for await (const chunk of source.openChunks()) {
          text += decoder.decode(chunk, { stream: true });
          yield chunk;
        }
        text += decoder.decode();
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
