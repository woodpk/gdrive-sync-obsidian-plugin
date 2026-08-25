import assert from "node:assert/strict";
import test from "node:test";
import type { VaultPath } from "../src/contracts/common";
import { SelectiveConfigurationPolicy } from "../src/local/config-policy";
import { LocalExclusionPolicy, defaultLocalExclusionRules } from "../src/local/exclusions";
import { validateCrossPlatformPath } from "../src/local/path-policy";

const vp = (value: string): VaultPath => value as VaultPath;

test("Phase 6 A: adapter-owned stage and backup artifacts are excluded from vault synchronization", () => {
  const policy = new LocalExclusionPolicy();
  const cases = [
    ".note.md.brain-sync-stage-1234",
    ".note.md.brain-sync-backup-1234",
    "nested/.blob.bin.brain-sync-stage-550e8400-e29b-41d4-a716-446655440000",
    "nested/.blob.bin.brain-sync-backup-550e8400-e29b-41d4-a716-446655440000",
    "nested\\.opaque.brain-sync-stage-deadbeef"
  ];

  for (const path of cases) {
    const decision = policy.evaluate(vp(path));
    assert.equal(decision.excluded, true, path);
    assert.ok(decision.rule?.id === "brain-sync-stage" || decision.rule?.id === "brain-sync-backup", path);
  }

  const ids = defaultLocalExclusionRules().map(rule => rule.id);
  assert.ok(ids.includes("brain-sync-stage"));
  assert.ok(ids.includes("brain-sync-backup"));
});

test("Phase 6 A: staging-artifact exclusions do not broaden to ordinary similarly named user files", () => {
  const policy = new LocalExclusionPolicy();
  for (const path of [
    "brain-sync-stage-notes.md",
    "notes/brain-sync-backup-plan.md",
    "notes/.brain-sync-stage.md",
    "notes/file.brain-sync-stage",
    "notes/file.brain-sync-backup"
  ]) {
    assert.equal(policy.evaluate(vp(path)).excluded, false, path);
  }
});

test("Phase 6 A: portable configuration remains explicit under a runtime-selected configuration directory", () => {
  const policy = new SelectiveConfigurationPolicy();
  const config = vp(".obsidian-mobile-custom");

  assert.equal(policy.classify(vp(".obsidian-mobile-custom/app.json"), config).classification, "portable");
  assert.equal(policy.classify(vp(".obsidian-mobile-custom/workspace-mobile.json"), config).classification, "device-local");
  assert.equal(policy.classify(vp(".obsidian-mobile-custom/plugins/random-plugin/data.json"), config).classification, "unknown");
  assert.equal(policy.classify(vp(".obsidian-mobile-custom/plugins/brain-google-drive-sync/data.json"), config).classification, "protected");
  assert.equal(policy.classify(vp(".obsidian-mobile-custom/oauth/token.json"), config).classification, "protected");
  assert.equal(policy.classify(vp(".obsidian/app.json"), config).classification, "unknown");
});

test("Phase 6 A: cross-platform preflight blocks collision and compatibility hazards without blocking opaque extensions", () => {
  const unicode = validateCrossPlatformPath(vp("notes/café.md"), ["notes/cafe\u0301.md"]);
  assert.equal(unicode.status, "blocked");
  if (unicode.status === "blocked") assert.equal(unicode.reason, "unicode-collision");

  const caseOnly = validateCrossPlatformPath(vp("Notes/Alpha.md"), ["notes/alpha.md"]);
  assert.equal(caseOnly.status, "blocked");
  if (caseOnly.status === "blocked") assert.equal(caseOnly.reason, "case-collision");

  for (const unsafe of ["CON", "notes/AUX.bin", "notes/trailing-dot.", "notes/bad?.md"] as const) {
    assert.equal(validateCrossPlatformPath(vp(unsafe)).status, "blocked", unsafe);
  }

  const opaque = validateCrossPlatformPath(vp("00-Inbox/archive.unknown-binary-format"));
  assert.equal(opaque.status, "compatible");
});
