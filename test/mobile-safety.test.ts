import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = join(__dirname, "..", "..");
const sourceRoot = join(root, "src");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? files(full) : full.endsWith(".ts") ? [full] : [];
  });
}

const prohibited = ["fs", "path", "os", "child_process", "worker_threads", "net", "tls", "electron", "powershell"];
const desktopOnly = new Set([
  "src/local/desktop-external-reference-guard.ts",
  "src/local/desktop-local-vault.ts"
]);

function hasProhibitedImport(text: string, spec: string): boolean {
  const patterns = [
    `from \"${spec}\"`, `from '${spec}'`, `from \"node:${spec}\"`, `from 'node:${spec}'`,
    `require(\"${spec}\")`, `require('${spec}')`, `require(\"node:${spec}\")`, `require('node:${spec}')`
  ];
  return patterns.some(pattern => text.includes(pattern));
}

test("manifest declares mobile compatibility", () => {
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.isDesktopOnly, false);
});

test("mobile-required runtime source has no Node/Electron/Windows-only imports", () => {
  const violations: string[] = [];
  for (const file of files(sourceRoot)) {
    const repoPath = relative(root, file).replaceAll("\\", "/");
    if (desktopOnly.has(repoPath)) continue;
    const text = readFileSync(file, "utf8");
    for (const spec of prohibited) if (hasProhibitedImport(text, spec)) violations.push(`${repoPath} -> ${spec}`);
    if (text.includes("./desktop-") || text.includes("../local/desktop-")) violations.push(`${repoPath} -> desktop-only module`);
  }
  assert.deepEqual(violations, []);
});

test("Node filesystem imports are confined to the declared desktop-only safety module", () => {
  const nodeImportFiles = files(sourceRoot)
    .filter(file => prohibited.some(spec => hasProhibitedImport(readFileSync(file, "utf8"), spec)))
    .map(file => relative(root, file).replaceAll("\\", "/"))
    .sort();
  assert.deepEqual(nodeImportFiles, ["src/local/desktop-external-reference-guard.ts"]);
});

test("desktop local construction is not imported by the mobile-neutral adapter", () => {
  const mobileAdapter = readFileSync(join(sourceRoot, "local", "obsidian-local-vault.ts"), "utf8");
  assert.equal(mobileAdapter.includes("desktop-local-vault"), false);
  assert.equal(mobileAdapter.includes("desktop-external-reference-guard"), false);
});

test("frozen payload contracts expose no authentication secret fields", () => {
  const text = files(join(sourceRoot, "contracts")).map(file => readFileSync(file, "utf8")).join("\n");
  for (const forbidden of ["accessToken:", "refreshToken:", "clientSecret:", "oauthSecret:"]) {
    assert.equal(text.includes(forbidden), false);
  }
});
