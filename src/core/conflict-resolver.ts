import type {
  ConflictAssessment,
  ConflictId,
  ConflictProvenance,
  ConflictResolver,
  ContentEvidence,
  ContentHash,
  DeviceIdentity,
  VaultPath,
  VersionReference,
} from "../contracts";
import { contractId } from "../contracts";

/** Supplies textual content for versions without adding content payloads to frozen contracts. */
export interface TextVersionProvider {
  readText(version: VersionReference): Promise<string | undefined>;
}

export interface MergeOutputEvidenceProvider {
  evidenceFor(path: VaultPath, mergedText: string): Promise<ContentEvidence | undefined>;
}

const textExtensions = new Set([".md", ".txt"]);

export function isSafelyRecognizedTextPath(path: VaultPath): boolean {
  const value = String(path).toLowerCase();
  const dot = value.lastIndexOf(".");
  return dot >= 0 && textExtensions.has(value.slice(dot));
}

function provenance(source: "base" | "local" | "remote", version: VersionReference, deviceId?: DeviceIdentity): ConflictProvenance {
  return { source, version, deviceId, remoteObjectId: version.remoteObjectId };
}

function stableConflictId(path: VaultPath, kind: string): ConflictId {
  return contractId<"ConflictId">(`conflict:${kind}:${String(path)}`) as ConflictId;
}

interface EditHunk {
  readonly start: number;
  readonly end: number;
  readonly replacement: readonly string[];
}

/**
 * Derives replacement hunks from base -> side using an LCS table. This is deliberately
 * deterministic and conservative: overlapping, semantically different edits conflict.
 */
function diffHunks(base: readonly string[], side: readonly string[]): readonly EditHunk[] {
  const n = base.length;
  const m = side.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = base[i] === side[j] ? 1 + lcs[i + 1][j + 1] : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const hunks: EditHunk[] = [];
  let i = 0;
  let j = 0;
  let start: number | undefined;
  let removedEnd = 0;
  let added: string[] = [];
  const flush = (): void => {
    if (start === undefined) return;
    hunks.push({ start, end: removedEnd, replacement: added });
    start = undefined;
    removedEnd = 0;
    added = [];
  };

  while (i < n || j < m) {
    if (i < n && j < m && base[i] === side[j]) {
      flush();
      i += 1;
      j += 1;
      continue;
    }
    if (start === undefined) start = i;
    if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      added.push(side[j]);
      j += 1;
    } else if (i < n) {
      i += 1;
      removedEnd = i;
    }
  }
  flush();
  return hunks;
}

function sameReplacement(a: EditHunk, b: EditHunk): boolean {
  return a.start === b.start && a.end === b.end && a.replacement.length === b.replacement.length && a.replacement.every((line, i) => line === b.replacement[i]);
}

function overlaps(a: EditHunk, b: EditHunk): boolean {
  // Insertions at the same boundary overlap. An insertion at the exact end of a replacement does not.
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  return a.start < b.end && b.start < a.end || (a.start === a.end && a.start > b.start && a.start < b.end) || (b.start === b.end && b.start > a.start && b.start < a.end);
}

export function mergeThreeWayText(baseText: string, localText: string, remoteText: string): { clean: true; text: string } | { clean: false } {
  if (localText === remoteText) return { clean: true, text: localText };
  if (localText === baseText) return { clean: true, text: remoteText };
  if (remoteText === baseText) return { clean: true, text: localText };

  const trailingNewline = baseText.endsWith("\n") || localText.endsWith("\n") || remoteText.endsWith("\n");
  const split = (value: string): string[] => {
    const lines = value.split("\n");
    if (value.endsWith("\n")) lines.pop();
    return lines;
  };
  const base = split(baseText);
  const localHunks = diffHunks(base, split(localText));
  const remoteHunks = diffHunks(base, split(remoteText));
  const combined: EditHunk[] = [...localHunks];

  for (const remote of remoteHunks) {
    const collision = combined.find(local => overlaps(local, remote));
    if (collision) {
      if (!sameReplacement(collision, remote)) return { clean: false };
      continue;
    }
    combined.push(remote);
  }

  combined.sort((a, b) => b.start - a.start || b.end - a.end);
  const result = [...base];
  for (const hunk of combined) result.splice(hunk.start, hunk.end - hunk.start, ...hunk.replacement);
  const text = result.join("\n") + (trailingNewline ? "\n" : "");
  return { clean: true, text };
}

export class ThreeWayConflictResolver implements ConflictResolver {
  constructor(
    private readonly textProvider: TextVersionProvider,
    private readonly mergedEvidence?: MergeOutputEvidenceProvider,
    private readonly localDeviceId?: DeviceIdentity,
  ) {}

  async assess(path: VaultPath, base: VersionReference | undefined, local: VersionReference | undefined, remote: VersionReference | undefined): Promise<ConflictAssessment> {
    if (!local || !remote) {
      if (base && (local || remote)) {
        const modifiedSide = local ? "local" : "remote";
        const modified = local ?? remote!;
        return {
          kind: "delete-vs-modify",
          conflictId: stableConflictId(path, "delete-modify"),
          path,
          modifiedSide,
          modifiedVersion: provenance(modifiedSide, modified, modifiedSide === "local" ? this.localDeviceId : undefined),
          base: provenance("base", base),
        };
      }
      return { kind: "none" };
    }

    const preserved = {
      local: provenance("local", local, this.localDeviceId),
      remote: provenance("remote", remote),
      ...(base ? { base: provenance("base", base) } : {}),
    };

    if (!base || !isSafelyRecognizedTextPath(path)) {
      return {
        kind: "opaque-binary",
        conflictId: stableConflictId(path, base ? "binary" : "no-base"),
        path,
        preserved,
      };
    }

    const [baseText, localText, remoteText] = await Promise.all([
      this.textProvider.readText(base),
      this.textProvider.readText(local),
      this.textProvider.readText(remote),
    ]);
    if (baseText === undefined || localText === undefined || remoteText === undefined) {
      return { kind: "unresolved-text", conflictId: stableConflictId(path, "text-unavailable"), path, preserved };
    }

    const merged = mergeThreeWayText(baseText, localText, remoteText);
    if (!merged.clean) return { kind: "unresolved-text", conflictId: stableConflictId(path, "text"), path, preserved };

    const evidence = await this.mergedEvidence?.evidenceFor(path, merged.text);
    const mergedVersion: VersionReference = {
      path,
      entityKind: local.entityKind,
      ...(evidence ? { content: evidence } : {}),
      remoteObjectId: remote.remoteObjectId,
    };
    return {
      kind: "clean-merge",
      path,
      mergedVersion,
      provenance: { base: provenance("base", base), local: preserved.local, remote: preserved.remote },
    };
  }
}

/** Deterministic non-cryptographic evidence helper suitable for tests/cache identity, not security. */
export function fnv1aContentHash(text: string): ContentHash {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return contractId<"ContentHash">(`fnv1a32:${hash.toString(16).padStart(8, "0")}`) as ContentHash;
}
