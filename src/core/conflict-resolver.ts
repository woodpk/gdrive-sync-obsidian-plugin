import type {
  ConflictAssessment,
  ConflictId,
  ConflictProvenance,
  ConflictResolver,
  ContentEvidence,
  ContentHash,
  DeviceIdentity,
  SynchronizationCancellationSignal,
  TextMergeResourcePolicy,
  VaultPath,
  VersionReference,
} from "../contracts";
import { assessTextMergeEligibility, contractId } from "../contracts";

/** Supplies textual content for versions without adding content payloads to frozen contracts. */
export interface TextReadOptions {
  readonly maximumBytes?: number;
  readonly cancellation?: SynchronizationCancellationSignal;
}
export interface TextVersionProvider { readText(version: VersionReference, options?: TextReadOptions): Promise<string | undefined>; }
export interface MergeOutputEvidenceProvider { evidenceFor(path: VaultPath, mergedText: string): Promise<ContentEvidence | undefined>; }

export const DEFAULT_TEXT_MERGE_RESOURCE_POLICY: TextMergeResourcePolicy = {
  maximumInputBytesPerVersion: 512 * 1024,
  maximumCombinedInputBytes: 1536 * 1024,
};
const DEFAULT_MAXIMUM_COMPARISON_CELLS = 4_000_000;
const textExtensions = new Set([".md", ".txt"]);

export function isSafelyRecognizedTextPath(path: VaultPath): boolean {
  const value = String(path).toLowerCase();
  const dot = value.lastIndexOf(".");
  return dot >= 0 && textExtensions.has(value.slice(dot));
}

function provenance(source: "base" | "local" | "remote", version: VersionReference, deviceId?: DeviceIdentity): ConflictProvenance {
  return { source, version, deviceId, remoteObjectId: version.remoteObjectId, advisoryObservedAtMs: version.content?.advisoryModifiedTimeMs };
}

function stableConflictId(path: VaultPath, kind: string): ConflictId {
  return contractId<"ConflictId">(`conflict:${kind}:${String(path)}`) as ConflictId;
}

function exactContentMatch(a: VersionReference, b: VersionReference): boolean {
  const ah = a.content?.hash;
  const bh = b.content?.hash;
  const as = a.content?.sizeBytes;
  const bs = b.content?.sizeBytes;
  return ah !== undefined && bh !== undefined && as !== undefined && bs !== undefined && ah === bh && as === bs;
}

interface EditHunk {
  readonly start: number;
  readonly end: number;
  readonly replacement: readonly string[];
}
interface MatchPair { readonly baseIndex: number; readonly sideIndex: number; }
interface ComparisonBudget { remaining: number; exhausted: boolean; }

function cancelled(signal?: SynchronizationCancellationSignal): boolean { return signal?.cancelled === true; }

function lcsLengths(
  left: readonly string[], leftStart: number, leftEnd: number,
  right: readonly string[], rightStart: number, rightEnd: number,
  reverse: boolean,
  budget: ComparisonBudget,
  signal?: SynchronizationCancellationSignal,
): Uint32Array | undefined {
  const rightLength = rightEnd - rightStart;
  let previous = new Uint32Array(rightLength + 1);
  let current = new Uint32Array(rightLength + 1);
  const leftLength = leftEnd - leftStart;
  for (let li = 0; li < leftLength; li += 1) {
    if (cancelled(signal) || budget.exhausted) return undefined;
    current.fill(0);
    const leftIndex = reverse ? leftEnd - 1 - li : leftStart + li;
    for (let rj = 1; rj <= rightLength; rj += 1) {
      budget.remaining -= 1;
      if (budget.remaining < 0) { budget.exhausted = true; return undefined; }
      const rightIndex = reverse ? rightEnd - rj : rightStart + rj - 1;
      current[rj] = left[leftIndex] === right[rightIndex]
        ? previous[rj - 1] + 1
        : Math.max(previous[rj], current[rj - 1]);
    }
    const swap = previous; previous = current; current = swap;
  }
  return previous;
}

function hirschbergMatches(
  base: readonly string[], baseStart: number, baseEnd: number,
  side: readonly string[], sideStart: number, sideEnd: number,
  budget: ComparisonBudget,
  signal?: SynchronizationCancellationSignal,
): MatchPair[] | undefined {
  if (cancelled(signal) || budget.exhausted || baseStart >= baseEnd || sideStart >= sideEnd) return cancelled(signal) || budget.exhausted ? undefined : [];
  if (baseEnd - baseStart === 1) {
    for (let j = sideStart; j < sideEnd; j += 1) {
      budget.remaining -= 1;
      if (budget.remaining < 0) { budget.exhausted = true; return undefined; }
      if (cancelled(signal)) return undefined;
      if (base[baseStart] === side[j]) return [{ baseIndex: baseStart, sideIndex: j }];
    }
    return [];
  }

  const middle = baseStart + Math.floor((baseEnd - baseStart) / 2);
  const forward = lcsLengths(base, baseStart, middle, side, sideStart, sideEnd, false, budget, signal);
  if (!forward) return undefined;
  const backward = lcsLengths(base, middle, baseEnd, side, sideStart, sideEnd, true, budget, signal);
  if (!backward) return undefined;

  const sideLength = sideEnd - sideStart;
  let splitOffset = 0;
  let best = -1;
  for (let offset = 0; offset <= sideLength; offset += 1) {
    const score = forward[offset] + backward[sideLength - offset];
    if (score > best) { best = score; splitOffset = offset; }
  }
  const sideMiddle = sideStart + splitOffset;
  const left = hirschbergMatches(base, baseStart, middle, side, sideStart, sideMiddle, budget, signal);
  if (!left) return undefined;
  const right = hirschbergMatches(base, middle, baseEnd, side, sideMiddle, sideEnd, budget, signal);
  return right ? [...left, ...right] : undefined;
}

function diffHunks(
  base: readonly string[],
  side: readonly string[],
  budget: ComparisonBudget,
  signal?: SynchronizationCancellationSignal,
): readonly EditHunk[] | undefined {
  const matches = hirschbergMatches(base, 0, base.length, side, 0, side.length, budget, signal);
  if (!matches) return undefined;
  const hunks: EditHunk[] = [];
  let baseCursor = 0;
  let sideCursor = 0;
  for (const match of matches) {
    if (match.baseIndex > baseCursor || match.sideIndex > sideCursor) {
      hunks.push({ start: baseCursor, end: match.baseIndex, replacement: side.slice(sideCursor, match.sideIndex) });
    }
    baseCursor = match.baseIndex + 1;
    sideCursor = match.sideIndex + 1;
  }
  if (baseCursor < base.length || sideCursor < side.length) {
    hunks.push({ start: baseCursor, end: base.length, replacement: side.slice(sideCursor) });
  }
  return hunks;
}

function sameReplacement(a: EditHunk, b: EditHunk): boolean {
  return a.start === b.start && a.end === b.end && a.replacement.length === b.replacement.length && a.replacement.every((line, i) => line === b.replacement[i]);
}
function overlaps(a: EditHunk, b: EditHunk): boolean {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  return a.start < b.end && b.start < a.end ||
    (a.start === a.end && a.start > b.start && a.start < b.end) ||
    (b.start === b.end && b.start > a.start && b.start < a.end);
}

export interface MergeComputationOptions {
  readonly cancellation?: SynchronizationCancellationSignal;
  readonly maximumComparisonCells?: number;
}

export function mergeThreeWayText(
  baseText: string,
  localText: string,
  remoteText: string,
  options: MergeComputationOptions = {},
): { clean: true; text: string } | { clean: false } {
  if (cancelled(options.cancellation)) return { clean: false };
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
  const budget: ComparisonBudget = { remaining: options.maximumComparisonCells ?? DEFAULT_MAXIMUM_COMPARISON_CELLS, exhausted: false };
  const localHunks = diffHunks(base, split(localText), budget, options.cancellation);
  if (!localHunks) return { clean: false };
  const remoteHunks = diffHunks(base, split(remoteText), budget, options.cancellation);
  if (!remoteHunks || cancelled(options.cancellation)) return { clean: false };

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
  return { clean: true, text: result.join("\n") + (trailingNewline ? "\n" : "") };
}

export interface ThreeWayConflictResolverOptions {
  readonly resourcePolicy?: TextMergeResourcePolicy;
  readonly cancellation?: SynchronizationCancellationSignal;
  readonly maximumComparisonCells?: number;
}

export class ThreeWayConflictResolver implements ConflictResolver {
  private readonly resourcePolicy: TextMergeResourcePolicy;
  constructor(
    private readonly textProvider: TextVersionProvider,
    private readonly mergedEvidence?: MergeOutputEvidenceProvider,
    private readonly localDeviceId?: DeviceIdentity,
    private readonly options: ThreeWayConflictResolverOptions = {},
  ) {
    this.resourcePolicy = options.resourcePolicy ?? DEFAULT_TEXT_MERGE_RESOURCE_POLICY;
  }

  async assess(path: VaultPath, base: VersionReference | undefined, local: VersionReference | undefined, remote: VersionReference | undefined): Promise<ConflictAssessment> {
    if (!local || !remote) {
      if (base && (local || remote)) {
        const modifiedSide = local ? "local" : "remote";
        const modified = local ?? remote!;
        return { kind: "delete-vs-modify", conflictId: stableConflictId(path, "delete-modify"), path, modifiedSide, modifiedVersion: provenance(modifiedSide, modified, modifiedSide === "local" ? this.localDeviceId : undefined), base: provenance("base", base) };
      }
      return { kind: "none" };
    }

    const preserved = { local: provenance("local", local, this.localDeviceId), remote: provenance("remote", remote), ...(base ? { base: provenance("base", base) } : {}) };
    if (!base || !isSafelyRecognizedTextPath(path)) return { kind: "opaque-binary", conflictId: stableConflictId(path, base ? "binary" : "no-base"), path, preserved };

    const cleanFromVersion = (version: VersionReference): ConflictAssessment => ({
      kind: "clean-merge",
      path,
      mergedVersion: { ...version, path },
      provenance: { base: provenance("base", base), local: preserved.local, remote: preserved.remote },
    });
    if (exactContentMatch(local, remote)) return cleanFromVersion(local);
    if (exactContentMatch(base, local)) return cleanFromVersion(remote);
    if (exactContentMatch(base, remote)) return cleanFromVersion(local);

    if (cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path, "text-cancelled"), path, preserved };
    const eligibility = assessTextMergeEligibility(
      [base.content?.sizeBytes, local.content?.sizeBytes, remote.content?.sizeBytes],
      this.resourcePolicy,
    );
    if (eligibility.eligible === false) return { kind: "unresolved-text", conflictId: stableConflictId(path, `text-${eligibility.reason}`), path, preserved };

    const readOptions: TextReadOptions = { maximumBytes: this.resourcePolicy.maximumInputBytesPerVersion, cancellation: this.options.cancellation };
    const baseText = await this.textProvider.readText(base, readOptions);
    if (baseText === undefined || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path, "text-unavailable"), path, preserved };
    const localText = await this.textProvider.readText(local, readOptions);
    if (localText === undefined || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path, "text-unavailable"), path, preserved };
    const remoteText = await this.textProvider.readText(remote, readOptions);
    if (remoteText === undefined || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path, "text-unavailable"), path, preserved };

    const merged = mergeThreeWayText(baseText, localText, remoteText, { cancellation: this.options.cancellation, maximumComparisonCells: this.options.maximumComparisonCells });
    if (!merged.clean || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path, "text"), path, preserved };
    const evidence = await this.mergedEvidence?.evidenceFor(path, merged.text);
    if (!evidence?.hash || evidence.sizeBytes === undefined) return { kind: "unresolved-text", conflictId: stableConflictId(path, "text-evidence-unavailable"), path, preserved };
    const mergedVersion: VersionReference = { path, entityKind: local.entityKind, content: evidence, remoteObjectId: remote.remoteObjectId };
    return { kind: "clean-merge", path, mergedVersion, provenance: { base: provenance("base", base), local: preserved.local, remote: preserved.remote } };
  }
}

/** Deterministic non-cryptographic helper retained only for inherited tests/cache fixtures. */
export function fnv1aContentHash(text: string): ContentHash {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return contractId<"ContentHash">(`fnv1a32:${hash.toString(16).padStart(8, "0")}`) as ContentHash;
}
