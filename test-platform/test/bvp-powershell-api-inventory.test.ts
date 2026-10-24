import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, relative, join } from "node:path";
import { test } from "node:test";
import ts = require("typescript");

// DEC-346 P1: inventory-only contract, authored before any PowerShell library.
// This test checks source exhaustiveness; it NEVER executes batteries,
// instantiates devices, dispatches a scenario or claims operator API parity.
const root = process.cwd();
const inventoryPath = "dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-powershell-api-inventory-20261024.json";
type Inventory = {
  schemaVersion: number;
  inventoryStage: string;
  scenarios: readonly { source: string; powershellCommand: string }[];
  batteries: readonly { name: string; kind: string; powershellCommand: string }[];
  deviceCommands: readonly { name: string; powershellCommand: string }[];
  scenarioSteps: readonly { kind: string; name: string; powershellCommand: string }[];
  cliEntrypoints: readonly { source: string; arguments: readonly string[]; powershellCommand: string }[];
  existingPowerShellScripts: readonly string[];
  budgets: { scriptLimit: number; scriptCount: number; psm1IncludedInExistingGuard: boolean };
  gates: { implementationAllowed: boolean; qualification: string };
};
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const inventory = (): Inventory => JSON.parse(read(inventoryPath)) as Inventory;
const ordered = (values: readonly string[]) => [...values].sort();
function sourceFiles(dir: string): string[] {
  const absolute = resolve(root, dir);
  return readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    const path = join(absolute, entry.name);
    return entry.isDirectory() ? sourceFiles(relative(root, path))
      : entry.isFile() && entry.name.endsWith(".ts") ? [relative(root, path).replace(/\\/g, "/")] : [];
  });
}
function registryNames(path: string): string[] {
  return [...read(path).matchAll(/"([a-z][a-z0-9-]+)"\s*:\s*\{\s*\n\s*name:/g)].map(match => match[1]!);
}
function actualCliFlags(path: string): string[] {
  return [...read(path).matchAll(/(?:requiredArg|optionalArg|positiveIntegerArg)\(\s*["'](--[a-z][\w-]+)["']/g)]
    .map(match => match[1]!);
}
test("P1 inventory includes every current declarative scenario with no duplicate or phantom source", () => {
  const value = inventory();
  strictEqual(value.schemaVersion, 1);
  deepStrictEqual(ordered(value.scenarios.map(s => s.source)),
    ordered(sourceFiles("test-platform/scenarios")));
  strictEqual(new Set(value.scenarios.map(s => s.source)).size, value.scenarios.length);
  strictEqual(value.scenarios.every(s => s.powershellCommand === "Invoke-BvpScenario"), true);
});
test("P1 inventory includes every registered deterministic and live battery", () => {
  const value = inventory();
  for (const [kind, path] of [
    ["deterministic", "test-platform/test/batteries/deterministic-battery-registry.ts"],
    ["live", "test-platform/test/batteries/battery-registry.ts"],
  ] as const) {
    const found = value.batteries.filter(b => b.kind === kind).map(b => b.name);
    deepStrictEqual(ordered(found), ordered(registryNames(path)));
  }
  strictEqual(new Set(value.batteries.map(b => b.kind + ":" + b.name)).size, value.batteries.length);
});
test("P1 inventory reflects every real CLI argument and typed device command", () => {
  const value = inventory();
  for (const cli of value.cliEntrypoints.filter(c => c.source.includes("run-"))) {
    deepStrictEqual(ordered(cli.arguments), ordered(actualCliFlags(cli.source)));
  }
  const commandSource = read("test-platform/src/live-device/device-command-agent.ts");
  const kinds = [...commandSource.matchAll(/\|\s*\{\s*readonly kind:\s*"([a-z-]+)"/g)]
    .map(match => match[1]!);
  deepStrictEqual(ordered(value.deviceCommands.map(c => c.name)), ordered(kinds));
  const scenarioSource = read("test-platform/src/scenario/scenario-contract.ts");
  const variants = [...scenarioSource.matchAll(/"(fixture|production|external-state|checkpoint|observe|assert):([a-z-]+)"\s*:\s*\{/g)]
    .map(match => match[1]! + ":" + match[2]!);
  deepStrictEqual(ordered(value.scenarioSteps.map(s => s.kind + ":" + s.name)), ordered(variants));
});
test("P1 inventory does not misstate pre-implementation parity or escape the script budget", () => {
  const value = inventory();
  const scripts = readdirSync(resolve(root, "dev/scripts"))
    .filter(name => name.endsWith(".ps1")).map(name => "dev/scripts/" + name);
  deepStrictEqual(ordered(value.existingPowerShellScripts), ordered(scripts));
  strictEqual(value.budgets.scriptLimit, 4);
  strictEqual(value.budgets.scriptCount, scripts.length);
  strictEqual(value.budgets.psm1IncludedInExistingGuard, false);
  strictEqual(value.gates.implementationAllowed, false);
  strictEqual(value.gates.qualification, "NOT_RUN");
  strictEqual(value.inventoryStage.includes("NOT_YET_FULL_PARITY"), true);
});

type ExportSurface = { scannedPaths: readonly string[]; entries: readonly {
  source: string; name: string; kind: string; publicOperatorExposure: string;
}[] };
const exportedSurface = (part: 1 | 2): ExportSurface => JSON.parse(read(
  "dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/" +
    "bvp-powershell-ts-exports-part" + part + "-20261024.json",
)) as ExportSurface;
function actualExports(path: string): string[] {
  const ast = ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names: string[] = [];
  for (const statement of ast.statements) {
    if (ts.isExportDeclaration(statement) && statement.exportClause &&
        ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements)
        names.push("reexport:" + element.name.text);
      continue;
    }
    if (!ts.canHaveModifiers(statement) ||
        !ts.getModifiers(statement)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
      continue;
    if (ts.isFunctionDeclaration(statement) && statement.name)
      names.push("function:" + statement.name.text);
    if (ts.isClassDeclaration(statement) && statement.name)
      names.push("class:" + statement.name.text);
    if (ts.isTypeAliasDeclaration(statement))
      names.push("type:" + statement.name.text);
    if (ts.isInterfaceDeclaration(statement))
      names.push("interface:" + statement.name.text);
    if (ts.isEnumDeclaration(statement))
      names.push("enum:" + statement.name.text);
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) names.push("const:" + declaration.name.text);
  }
  return ordered(names);
}
test("P1 exported TypeScript contracts are complete, including type-only reexports", () => {
  const halves = [exportedSurface(1), exportedSurface(2)];
  const source = ordered([
    ...sourceFiles("test-platform/src"),
    ...sourceFiles("test-platform/test/batteries"),
  ]);
  const scanned = halves.flatMap(h => h.scannedPaths);
  deepStrictEqual(ordered(scanned), source, "new or removed TS contract file is unaccounted");
  strictEqual(new Set(scanned).size, scanned.length);
  for (const half of halves) for (const path of half.scannedPaths) {
    const captured = half.entries.filter(item => item.source === path)
      .map(item => item.kind + ":" + item.name);
    deepStrictEqual(ordered(captured), actualExports(path), "unmapped export: " + path);
  }
});
test("P1 export inventory distinguishes internal helpers from approved operator actions", () => {
  const halves = [exportedSurface(1), exportedSurface(2)];
  const all = halves.flatMap(half => half.entries);
  strictEqual(all.every(x => x.publicOperatorExposure === "NOT_ASSUMED"), true);
  strictEqual(all.some(x => x.source.endsWith("/phxci-physical-bridge.ts")), true);
  strictEqual(inventory().gates.implementationAllowed, false);
});
