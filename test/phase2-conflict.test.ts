import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type ContentHash, type VaultPath, type VersionReference } from "../src/contracts";
import { ThreeWayConflictResolver, mergeThreeWayText } from "../src/core/conflict-resolver";

const p = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const h = (value: string) => contractId<"ContentHash">(value) as ContentHash;
function v(path: VaultPath, revision: string): VersionReference {
  return { path, entityKind: "file", content: { hash: h(revision), revision, sizeBytes: 1 } };
}
const mergedEvidence = { evidenceFor: async (_path: VaultPath, text: string) => ({ hash: h(`merged:${text.length}`), sizeBytes: new TextEncoder().encode(text).byteLength }) };

test("three-way merge accepts independent line edits", () => {
  const result = mergeThreeWayText("a\nb\nc\n", "A\nb\nc\n", "a\nb\nC\n");
  assert.deepEqual(result, { clean: true, text: "A\nb\nC\n" });
});

test("three-way merge rejects overlapping incompatible edits", () => {
  assert.deepEqual(mergeThreeWayText("a\nb\n", "a\nLOCAL\n", "a\nREMOTE\n"), { clean: false });
});

test("conflict resolver returns clean merge only with BASE LOCAL REMOTE text", async () => {
  const path = p("10-Notes/a.md");
  const base = v(path, "base"); const local = v(path, "local"); const remote = v(path, "remote");
  const texts = new Map([["base", "a\nb\nc\n"], ["local", "A\nb\nc\n"], ["remote", "a\nb\nC\n"]]);
  const resolver = new ThreeWayConflictResolver({ readText: async version => texts.get(version.content?.revision ?? "") }, mergedEvidence);
  const result = await resolver.assess(path, base, local, remote);
  assert.equal(result.kind, "clean-merge");
  if (result.kind === "clean-merge") assert.equal(result.provenance.base.version, base);
});

test("true text conflict preserves complete version references", async () => {
  const path = p("10-Notes/a.md");
  const base = v(path, "base"); const local = v(path, "local"); const remote = v(path, "remote");
  const texts = new Map([["base", "x\n"], ["local", "L\n"], ["remote", "R\n"]]);
  const resolver = new ThreeWayConflictResolver({ readText: async version => texts.get(version.content?.revision ?? "") }, mergedEvidence);
  const result = await resolver.assess(path, base, local, remote);
  assert.equal(result.kind, "unresolved-text");
  if (result.kind === "unresolved-text") {
    assert.equal(result.preserved.local.version, local);
    assert.equal(result.preserved.remote.version, remote);
    assert.equal(result.preserved.base?.version, base);
  }
});

test("opaque binary concurrency never uses timestamp winner", async () => {
  const path = p("80-Attachments/a.bin");
  const base = v(path, "base");
  const local = { ...v(path, "local"), content: { hash: h("local"), advisoryModifiedTimeMs: 999999, sizeBytes: 1 } };
  const remote = { ...v(path, "remote"), content: { hash: h("remote"), advisoryModifiedTimeMs: 1, sizeBytes: 1 } };
  const resolver = new ThreeWayConflictResolver({ readText: async () => undefined });
  const result = await resolver.assess(path, base, local, remote);
  assert.equal(result.kind, "opaque-binary");
});

test("delete-vs-modify preserves modified side provenance", async () => {
  const path = p("10-Notes/a.md"); const base = v(path, "base"); const remote = v(path, "remote-modified");
  const resolver = new ThreeWayConflictResolver({ readText: async () => undefined });
  const result = await resolver.assess(path, base, undefined, remote);
  assert.equal(result.kind, "delete-vs-modify");
  if (result.kind === "delete-vs-modify") {
    assert.equal(result.modifiedSide, "remote");
    assert.equal(result.modifiedVersion.version, remote);
  }
});
