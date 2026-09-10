import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ContentHash,
  type GoogleDrivePort,
  type LocalVaultPort,
  type SynchronizationCancellationSignal,
  type TextMergeResourcePolicy,
  type VaultPath,
  type VersionReference,
} from "../../../src/contracts";
import { ThreeWayConflictResolver, mergeThreeWayText } from "../../../src/core/conflict-resolver";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../../../src/product/text-version-store";
import { sha256Text } from "../../../src/util/sha256";

const p = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const h = (value: string) => contractId<"ContentHash">(value) as ContentHash;
const encoder = new TextEncoder();
function version(path: VaultPath, text: string, label: string): VersionReference {
  return { path, entityKind: "file", content: { hash: sha256Text(text), sizeBytes: encoder.encode(text).byteLength, revision: label } };
}
function declaredVersion(path: VaultPath, sizeBytes: number | undefined, label: string): VersionReference {
  return { path, entityKind: "file", content: { hash: h(`sha256:${label.padEnd(64, "0").slice(0, 64)}`), ...(sizeBytes === undefined ? {} : { sizeBytes }), revision: label } };
}
const policy: TextMergeResourcePolicy = { maximumInputBytesPerVersion: 10, maximumCombinedInputBytes: 30 };
const evidence = { evidenceFor: async (_path: VaultPath, text: string) => ({ hash: sha256Text(text), sizeBytes: encoder.encode(text).byteLength }) };

test("resource admission accepts below/at threshold and refuses above before materialization", async () => {
  const path = p("10-Notes/limit.md");
  let reads = 0;
  const provider = { readText: async () => { reads += 1; return "x"; } };
  const resolver = new ThreeWayConflictResolver(provider, evidence, undefined, { resourcePolicy: policy });
  assert.equal((await resolver.assess(path, declaredVersion(path, 9, "b0"), declaredVersion(path, 9, "l0"), declaredVersion(path, 9, "r0"))).kind, "clean-merge");
  assert.equal(reads, 3);
  reads = 0;
  assert.equal((await resolver.assess(path, declaredVersion(path, 10, "b"), declaredVersion(path, 10, "l"), declaredVersion(path, 10, "r"))).kind, "clean-merge");
  assert.equal(reads, 3);
  reads = 0;
  assert.equal((await resolver.assess(path, declaredVersion(path, 11, "b2"), declaredVersion(path, 10, "l2"), declaredVersion(path, 10, "r2"))).kind, "unresolved-text");
  assert.equal(reads, 0);
});

test("unknown-size and combined-over-limit versions never enter materialization", async () => {
  const path = p("10-Notes/unknown.md");
  let reads = 0;
  const provider = { readText: async () => { reads += 1; return "x"; } };
  const resolver = new ThreeWayConflictResolver(provider, evidence, undefined, { resourcePolicy: policy });
  assert.equal((await resolver.assess(path, declaredVersion(path, undefined, "b"), declaredVersion(path, 1, "l"), declaredVersion(path, 1, "r"))).kind, "unresolved-text");
  assert.equal(reads, 0);
  const combined = new ThreeWayConflictResolver(provider, evidence, undefined, { resourcePolicy: { maximumInputBytesPerVersion: 20, maximumCombinedInputBytes: 29 } });
  assert.equal((await combined.assess(path, declaredVersion(path, 10, "b3"), declaredVersion(path, 10, "l3"), declaredVersion(path, 10, "r3"))).kind, "unresolved-text");
  assert.equal(reads, 0);
});

class MutableCancellation implements SynchronizationCancellationSignal {
  cancelled = false;
  onCancellation(_listener: () => void): () => void { return () => undefined; }
}

test("cancellation at admission and materialization never produces partial success", async () => {
  const path = p("10-Notes/cancel.md");
  const admission = new MutableCancellation(); admission.cancelled = true;
  let reads = 0;
  const admissionResolver = new ThreeWayConflictResolver({ readText: async () => { reads += 1; return "x"; } }, evidence, undefined, { resourcePolicy: policy, cancellation: admission });
  assert.equal((await admissionResolver.assess(path, declaredVersion(path, 1, "b"), declaredVersion(path, 1, "l"), declaredVersion(path, 1, "r"))).kind, "unresolved-text");
  assert.equal(reads, 0);

  const signal = new MutableCancellation();
  const texts = ["a\nb\nc\n", "A\nb\nc\n", "a\nb\nC\n"];
  let index = 0;
  const provider = { readText: async () => { const value = texts[index++]; if (index === 2) signal.cancelled = true; return value; } };
  const resolver = new ThreeWayConflictResolver(provider, evidence, undefined, { resourcePolicy: { maximumInputBytesPerVersion: 100, maximumCombinedInputBytes: 300 }, cancellation: signal });
  assert.equal((await resolver.assess(path, version(path, texts[0], "base"), version(path, texts[1], "local"), version(path, texts[2], "remote"))).kind, "unresolved-text");
});

class CountingCancellation implements SynchronizationCancellationSignal {
  private checks = 0;
  get cancelled(): boolean { this.checks += 1; return this.checks > 20; }
  onCancellation(_listener: () => void): () => void { return () => undefined; }
}

test("cancellation and comparison exhaustion during merge computation return no partial merge", () => {
  const base = Array.from({ length: 60 }, (_, i) => `line-${i}`).join("\n");
  const local = Array.from({ length: 60 }, (_, i) => i % 2 === 0 ? `local-${i}` : `line-${i}`).join("\n");
  const remote = Array.from({ length: 60 }, (_, i) => i % 2 === 1 ? `remote-${i}` : `line-${i}`).join("\n");
  assert.deepEqual(mergeThreeWayText(base, local, remote, { cancellation: new CountingCancellation(), maximumComparisonCells: 100000 }), { clean: false });
  assert.deepEqual(mergeThreeWayText(base, local, remote, { maximumComparisonCells: 10 }), { clean: false });
});

test("ordinary clean non-overlapping merge remains correct", () => {
  assert.deepEqual(mergeThreeWayText("a\nb\nc\n", "A\nb\nc\n", "a\nb\nC\n"), { clean: true, text: "A\nb\nC\n" });
});

test("overlap remains unresolved and preserves complete provenance", async () => {
  const path = p("10-Notes/overlap.md");
  const baseText = "a\nb\n"; const localText = "a\nLOCAL\n"; const remoteText = "a\nREMOTE\n";
  const base = version(path, baseText, "base"); const local = version(path, localText, "local"); const remote = version(path, remoteText, "remote");
  const texts = new Map([["base", baseText], ["local", localText], ["remote", remoteText]]);
  const resolver = new ThreeWayConflictResolver({ readText: async v => texts.get(v.content?.revision ?? "") }, evidence, undefined, { resourcePolicy: { maximumInputBytesPerVersion: 100, maximumCombinedInputBytes: 300 } });
  const result = await resolver.assess(path, base, local, remote);
  assert.equal(result.kind, "unresolved-text");
  if (result.kind === "unresolved-text") {
    assert.equal(result.preserved.base?.version, base);
    assert.equal(result.preserved.local.version, local);
    assert.equal(result.preserved.remote.version, remote);
  }
});

test("BASE-missing and opaque cases preserve both current versions", async () => {
  const textPath = p("10-Notes/no-base.md");
  const local = declaredVersion(textPath, 1, "local"); const remote = declaredVersion(textPath, 1, "remote");
  const textResult = await new ThreeWayConflictResolver({ readText: async () => "x" }).assess(textPath, undefined, local, remote);
  assert.equal(textResult.kind, "opaque-binary");
  if (textResult.kind === "opaque-binary") { assert.equal(textResult.preserved.local.version, local); assert.equal(textResult.preserved.remote.version, remote); }

  const binaryPath = p("80-Attachments/a.bin");
  const base = declaredVersion(binaryPath, 1, "base");
  const binaryResult = await new ThreeWayConflictResolver({ readText: async () => undefined }).assess(binaryPath, base, { ...local, path: binaryPath }, { ...remote, path: binaryPath });
  assert.equal(binaryResult.kind, "opaque-binary");
});

test("multibyte persistence uses exact UTF-8 byte evidence and rejects corrupt canonical-key content", async () => {
  const persistence = new MemoryTextVersionPersistence();
  const store = new ProductTextVersionStore(persistence, {} as LocalVaultPort, {} as GoogleDrivePort, 1024);
  const path = p("10-Notes/unicode.md");
  const text = "😀漢字 café\n".repeat(20);
  const good = version(path, text, "good");
  assert.equal(await store.persistText(good, text), true);
  assert.equal(await store.retainedText(good), text);
  assert.equal(await store.persistText(good, `${text}corrupt`), false);
  assert.equal(await store.retainedText(good), text);
});

test("oversized and unknown-size capture paths do not buffer or retain text", async () => {
  const persistence = new MemoryTextVersionPersistence();
  const store = new ProductTextVersionStore(persistence, {} as LocalVaultPort, {} as GoogleDrivePort, 4);
  const path = p("10-Notes/large.md");
  const text = "12345";
  const oversized = version(path, text, "large");
  const source = { sizeBytes: 5, async *openChunks() { yield encoder.encode(text); } };
  assert.equal(store.capture(oversized, source), source);
  assert.equal(await store.retainedText(oversized), undefined);
  const unknown = { ...oversized, content: { ...oversized.content, sizeBytes: undefined } } as VersionReference;
  const unknownSource = { async *openChunks() { yield encoder.encode(text); } };
  assert.equal(store.capture(unknown, unknownSource), unknownSource);
  assert.equal(await store.retainedText(unknown), undefined);
});
