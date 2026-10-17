import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import test from "node:test";

const root = resolve(process.cwd());
const suffix = /\.test\.ts$/;
const generatedSuffix = /\.test\.js$/;
const declaredRoots = ["test", "tests"] as const;

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(full));
    else if (entry.isFile() && suffix.test(entry.name)) files.push(full);
  }
  return files;
}

function compiledFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...compiledFiles(full));
    else if (entry.isFile() && generatedSuffix.test(entry.name)) files.push(full);
  }
  return files;
}

function normalized(paths: readonly string[]): string[] {
  return paths.map(path => path.split(sep).join("/")).sort();
}

function assertCompleteDiscovery(expected: readonly string[], selected: readonly string[]): void {
  assert.deepEqual(normalized(selected), normalized(expected),
    "PHX-CI product suite must discover every current source test module once; no nested omission or duplicate");
}

test("Node product test runner recursively selects both legacy and canonical test roots", () => {
  const config = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const compiler = JSON.parse(readFileSync(join(root, "tsconfig.test.json"), "utf8")) as {
    include: string[];
  };
  assert.equal(config.scripts.test,
    'tsc -p tsconfig.test.json && node --test ".test-build/test/**/*.test.js" ".test-build/tests/**/*.test.js"');
  assert.ok(compiler.include.includes("test/**/*.ts"), "existing test modules must be compiled");
  assert.ok(compiler.include.includes("tests/**/*.ts"), "new category-based test modules must be compiled");
  const expected = declaredRoots.flatMap(source =>
    sourceFiles(join(root, source)).map(file =>
      join(root, ".test-build", relative(root, file).replace(/\.test\.ts$/, ".test.js"))));
  const selected = declaredRoots.flatMap(source =>
    compiledFiles(join(root, ".test-build", source)));
  assert.ok(expected.length > 0, "a zero-module test suite must not pass");
  assert.ok(sourceFiles(join(root, "test", "workstreams")).length > 0,
    "the nested active workstream suites must remain discoverable");
  assertCompleteDiscovery(expected, selected);
});

test("discovery guard detects a missing nested module and an accidental duplicate", () => {
  const expected = ["test/top.test.js", "test/workstreams/state/recovery.test.js"];
  assert.throws(() => assertCompleteDiscovery(expected, [expected[0]]),
    /must discover every current source test module once/);
  assert.throws(() => assertCompleteDiscovery(expected, [...expected, expected[1]]),
    /must discover every current source test module once/);
  assertCompleteDiscovery(expected, [...expected]);
});
