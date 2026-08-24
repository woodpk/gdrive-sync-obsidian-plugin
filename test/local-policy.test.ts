import assert from "node:assert/strict";
import test from "node:test";
import type { VaultPath } from "../src/contracts/common";
import { SelectiveConfigurationPolicy } from "../src/local/config-policy";
import { LocalExclusionPolicy } from "../src/local/exclusions";
import { normalizeVaultPath, validateCrossPlatformPath } from "../src/local/path-policy";

const vp = (value: string): VaultPath => value as VaultPath;

test("explicit exclusion policy keeps unknown content and excludes visible operational noise", () => {
  const policy = new LocalExclusionPolicy(["private-local/**"]);
  assert.equal(policy.evaluate(vp("00-Inbox/archive.weirdext")).excluded, false);
  assert.equal(policy.evaluate(vp(".git/objects/abc")).excluded, true);
  assert.equal(policy.evaluate(vp("notes/.DS_Store")).excluded, true);
  assert.equal(policy.evaluate(vp("notes/file.tmp")).excluded, true);
  assert.equal(policy.evaluate(vp("private-local/a.md")).excluded, true);
  assert.ok(policy.rules.some(rule => rule.source === "default"));
  assert.ok(policy.rules.some(rule => rule.source === "user"));
});

test("active configuration directory is a distinct exclusion boundary and is runtime-named", () => {
  const policy = new LocalExclusionPolicy();
  assert.equal(policy.evaluate(vp(".custom-config/app.json"), vp(".custom-config")).excluded, true);
  assert.equal(policy.evaluate(vp(".obsidian/app.json"), vp(".custom-config")).excluded, false);
});

test("path normalization preserves original spelling while comparisons normalize separators", () => {
  assert.equal(normalizeVaultPath("folder\\sub\\note.md"), "folder/sub/note.md");
  const result = validateCrossPlatformPath(vp("folder\\sub\\note.md"));
  assert.equal(result.status, "compatible");
  if (result.status === "compatible") assert.equal(result.normalizedComparisonPath, "folder/sub/note.md");
});

test("path validation blocks Windows reserved and invalid names", () => {
  assert.deepEqual(validateCrossPlatformPath(vp("notes/CON.txt")).status, "blocked");
  const invalid = validateCrossPlatformPath(vp("notes/bad?.md"));
  assert.equal(invalid.status, "blocked");
  if (invalid.status === "blocked") assert.equal(invalid.reason, "invalid-name");
});

test("path validation blocks external references and traversal", () => {
  for (const value of ["../outside.md", "/absolute.md", "C:/outside.md", "https://example.test/file.md"]) {
    const result = validateCrossPlatformPath(vp(value));
    assert.equal(result.status, "blocked", value);
    if (result.status === "blocked") assert.equal(result.reason, "external-reference", value);
  }
});

test("path validation blocks case-only collisions", () => {
  const result = validateCrossPlatformPath(vp("Notes/Alpha.md"), ["notes/alpha.md"]);
  assert.equal(result.status, "blocked");
  if (result.status === "blocked") assert.equal(result.reason, "case-collision");
});

test("path validation blocks Unicode-equivalent collisions", () => {
  const composed = "notes/café.md";
  const decomposed = "notes/cafe\u0301.md";
  const result = validateCrossPlatformPath(vp(composed), [decomposed]);
  assert.equal(result.status, "blocked");
  if (result.status === "blocked") assert.equal(result.reason, "unicode-collision");
});

test("path validation preflights conservative Windows-compatible path length", () => {
  const result = validateCrossPlatformPath(vp(`notes/${"a".repeat(235)}.md`));
  assert.equal(result.status, "blocked");
  if (result.status === "blocked") assert.equal(result.reason, "path-too-long");
});

test("selective configuration policy is explicit and unknown-excluded by default", () => {
  const policy = new SelectiveConfigurationPolicy();
  const configDir = vp(".custom-config");
  assert.equal(policy.classify(vp(".custom-config/app.json"), configDir).classification, "portable");
  assert.equal(policy.classify(vp(".custom-config/unknown.json"), configDir).classification, "unknown");
  assert.equal(policy.classify(vp(".custom-config/workspace.json"), configDir).classification, "device-local");
  assert.equal(policy.classify(vp(".custom-config/plugins/some-plugin/data.json"), configDir).classification, "unknown");
  assert.ok(policy.describePortablePolicy().length > 0);
});

test("configuration policy protects secrets device identity and synchronization state", () => {
  const policy = new SelectiveConfigurationPolicy();
  const configDir = vp(".config-x");
  const auth = policy.classify(vp(".config-x/auth/token.json"), configDir);
  assert.deepEqual(auth, { classification: "protected", reason: "authentication-secret" });
  const device = policy.classify(vp(".config-x/device-id.json"), configDir);
  assert.deepEqual(device, { classification: "protected", reason: "device-identity" });
  const state = policy.classify(vp(".config-x/sync-state/base.json"), configDir);
  assert.deepEqual(state, { classification: "protected", reason: "sync-operational-state" });
  const ownPlugin = policy.classify(vp(".config-x/plugins/brain-google-drive-sync/data.json"), configDir);
  assert.deepEqual(ownPlugin, { classification: "protected", reason: "sync-operational-state" });
});
