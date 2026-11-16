/**
 * Nonshipping BVP prerelease asset preparation, not a verification or publication authority.
 * Software qualification remains exclusively PHX-CI; Owner/Reviewer gates apply to release.
 * Run only in a clean, isolated clone with installed npm dependencies.
 */
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = "0.1.20-bvp.2";
const args = process.argv.slice(2);

function deny(reason) {
  throw new Error("BVP_PRERELEASE_PREPARATION_BLOCKED: " + reason);
}
function command(executable, argv, env = process.env) {
  const result = spawnSync(executable, argv, { cwd: root, env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0 || result.signal) deny("required-build-command-failed");
  return (result.stdout ?? "").trim();
}
function digest(contents) {
  return createHash("sha256").update(contents).digest("hex");
}
function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { deny("invalid-packaging-metadata"); }
}

let stage;
try {
  if (args.length !== 4 || args[0] !== "--source-sha" || args[2] !== "--version") {
    deny("usage: --source-sha <full-commit-sha> --version 0.1.20-bvp.2");
  }
  const expected = args[1];
  if (!/^[a-f0-9]{40}$/.test(expected)) deny("invalid-source-sha");
  if (args[3] !== version) deny("unapproved-prerelease-version");
  if (process.env.BVP_DEC359_LIVE_RUN === "YES") deny("live-google-test-environment-must-be-disabled");

  const head = command("git", ["rev-parse", "HEAD"]);
  if (head !== expected) deny("source-identity-mismatch");
  if (command("git", ["status", "--porcelain=v1", "--untracked-files=all"])) deny("dirty-repository");
  const compiler = join(root, "node_modules", "typescript", "bin", "tsc");
  if (!existsSync(compiler)) deny("npm-ci-dependencies-not-installed");

  const destination = join(root, ".test-build", "bvp-prerelease", version);
  if (existsSync(destination)) deny("prerelease-output-already-exists");

  // Compilation and bundling prepare assets; neither operation represents PHX-CI PASS.
  command(process.execPath, [compiler, "-p", "test-platform/tsconfig.json"]);
  const builder = join(root, ".test-build", "bvp", "test-platform", "src", "build-validation-artifact.js");
  if (!existsSync(builder)) deny("validation-build-entrypoint-missing");
  command(process.execPath, [builder], {
    ...process.env, BVP_VALIDATION_PRERELEASE_VERSION: version, BVP_DEC359_LIVE_RUN: "NO",
  });

  const generated = join(root, ".test-build", "bvp-live-device", "plugin");
  const identity = readJson(join(generated, "build-identity.json"));
  const manifest = readJson(join(generated, "manifest.json"));
  if (identity.schemaVersion !== 1 || identity.sourceCommit !== expected ||
      manifest.id !== "brain-google-drive-sync" || manifest.version !== version ||
      manifest.isDesktopOnly !== false || identity.artifact !== "main.js") {
    deny("generated-identity-or-manifest-mismatch");
  }
  const mainBytes = readFileSync(join(generated, "main.js"));
  const manifestBytes = readFileSync(join(generated, "manifest.json"));
  if (identity.artifactSize !== mainBytes.byteLength ||
      identity.artifactSha256 !== digest(mainBytes) ||
      identity.manifestSha256 !== digest(manifestBytes)) {
    deny("generated-artifact-digest-mismatch");
  }

  const parent = dirname(destination);
  mkdirSync(parent, { recursive: true });
  stage = join(parent, "." + version + ".stage-" + randomUUID());
  mkdirSync(stage, { recursive: false });
  const artifacts = ["main.js", "manifest.json", "build-identity.json"];
  for (const name of artifacts) copyFileSync(join(generated, name), join(stage, name));
  const { writeFileSync } = await import("node:fs");
  const lines = artifacts.map(name => digest(readFileSync(join(stage, name))) + "  " + name);
  writeFileSync(join(stage, "release-sha256.txt"), lines.join("\n") + "\n", { encoding: "utf8", flag: "wx" });
  if (existsSync(destination)) deny("prerelease-output-already-exists");
  renameSync(stage, destination);
  stage = undefined;

  console.log("BVP_PRERELEASE_PREPARED=YES");
  console.log("BVP_PRERELEASE_VERSION=" + version);
  console.log("BVP_PRERELEASE_SOURCE_SHA=" + expected);
  console.log("BVP_PRERELEASE_MAIN_SHA256=" + identity.artifactSha256);
  console.log("BVP_PRERELEASE_MANIFEST_SHA256=" + identity.manifestSha256);
  console.log("BVP_PRERELEASE_PUBLICATION=NOT_AUTHORIZED_BY_THIS_SCRIPT");
} catch (error) {
  if (stage) rmSync(stage, { recursive: true, force: true });
  console.error(error instanceof Error ? error.message : "BVP_PRERELEASE_PREPARATION_BLOCKED: unknown");
  process.exitCode = 1;
}
