import { equal, match, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const root = resolve(process.cwd());
const script = resolve(root, "scripts/prepare-bvp-prerelease.mjs");
const version = "0.1.20-bvp.2";
const nonexistentSha = "0000000000000000000000000000000000000000";

function rejected(args: readonly string[], live = false): string {
  const run = spawnSync(process.execPath, [script, ...args], {
    cwd: root, encoding: "utf8",
    env: { ...process.env, BVP_DEC359_LIVE_RUN: live ? "YES" : "NO" },
    timeout: 10000,
  });
  equal(run.error, undefined, "packager rejection must exit, not hang");
  equal(run.status, 1, "invalid request must exit nonzero");
  equal(run.stdout, "", "rejection must not declare a staged asset");
  return run.stderr;
}

test("BVP prerelease preparation rejects missing or unexpected argument sets", () => {
  ok(existsSync(script));
  match(rejected([]), /BVP_PRERELEASE_PREPARATION_BLOCKED: usage:/);
  match(rejected(["--publish", "YES"]), /BVP_PRERELEASE_PREPARATION_BLOCKED: usage:/);
});

test("BVP prerelease preparation requires a full immutable source commit", () => {
  match(rejected(["--source-sha", "master", "--version", version]), /invalid-source-sha/);
  match(rejected(["--source-sha", "ABCDEF", "--version", version]), /invalid-source-sha/);
});

test("BVP prerelease preparation rejects unapproved versions", () => {
  match(rejected(["--source-sha", nonexistentSha, "--version", "0.1.20-bvp.1"]), /unapproved-prerelease-version/);
  match(rejected(["--source-sha", nonexistentSha, "--version", "0.1.20"]), /unapproved-prerelease-version/);
});

test("BVP prerelease preparation rejects leftover real-Google activation", () => {
  match(rejected(["--source-sha", nonexistentSha, "--version", version], true), /live-google-test-environment-must-be-disabled/);
});

test("BVP prerelease preparation rejects a source SHA mismatch before build", () => {
  match(rejected(["--source-sha", nonexistentSha, "--version", version]), /source-identity-mismatch/);
});

test("BVP prerelease packaging cannot replace the existing prerelease or publish directly", () => {
  const source = readFileSync(script, "utf8");
  match(source, /BVP_PRERELEASE_PUBLICATION=NOT_AUTHORIZED_BY_THIS_SCRIPT/);
  match(source, /BVP_VALIDATION_PRERELEASE_VERSION: version/);
  match(source, /identity\.artifactSha256 !== digest\(mainBytes\)/);
  match(source, /identity\.manifestSha256 !== digest\(manifestBytes\)/);
  match(source, /prerelease-output-already-exists/);
  ok(!/\bgh\s+release\b|\bgh\s+api\b|api\.github\.com\/repos\/.*releases/i.test(source));
});
