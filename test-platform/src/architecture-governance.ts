import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import ts = require("typescript");

export type ChangeClass = "ordinary" | "authorized-governance";

export interface ArchitectureViolation {
  readonly rule: string;
  readonly path: string;
  readonly detail: string;
}

export interface GuardResult {
  readonly exitCode: number;
  readonly output: string;
  readonly violations: readonly ArchitectureViolation[];
}

interface BoundaryPolicy {
  readonly manifestPath: string;
  readonly productionRoots: readonly string[];
  readonly testPlatformRoot: string;
  readonly activeDevRoot: string;
  readonly archiveRoot: string;
  readonly productionForbiddenRoots: readonly string[];
  readonly shippingForbiddenRoots: readonly string[];
  readonly approvedProductionImports: readonly string[];
  readonly frozenSurfaces: readonly string[];
  readonly scenarioSpecificProductionAllowed: boolean;
  readonly productionValidationUiAllowed: boolean;
  readonly seamLocMax: number;
  readonly seamFilesMax: number;
  readonly coreLocMax: number;
  readonly liveLocMax: number;
  readonly scenarioTarget: number;
  readonly scenarioMax: number;
  readonly scenarioPowerShellMax: number;
  readonly bvpPowerShellCountMax: number;
  readonly bvpPowerShellLocMax: number;
  readonly scenarioProductionMax: number;
}

interface SnapshotReader {
  readonly paths: readonly string[];
  read(path: string): string | null;
}

interface Dependency {
  readonly kind: string;
  readonly specifier: string;
}

interface SourceAnalysis {
  readonly path: string;
  readonly dependencies: readonly Dependency[];
  readonly scenarioSignals: readonly { readonly kind: string; readonly name: string }[];
  readonly buildReferences: readonly string[];
  readonly declarativeScenario: boolean;
  readonly errors: readonly string[];
}

export interface ScenarioMetric {
  readonly scenario: string;
  readonly path: string;
  readonly logicalLoc: number;
  readonly targetExceeded: boolean;
  readonly hardMaxExceeded: boolean;
}

export interface MetricsSnapshot {
  readonly productionSourceLogicalLoc: number;
  readonly productionSeamLogicalLoc: number;
  readonly productionSeamFileCount: number;
  readonly productionSeamFiles: readonly string[];
  readonly frameworkCoreLogicalTsLoc: number;
  readonly platformCoreRuntimeModuleCount: number;
  readonly frameworkCoreFiles: readonly string[];
  readonly liveDeviceAgentRelayLogicalTsLoc: number;
  readonly liveDeviceAgentRelayFiles: readonly string[];
  readonly scenarioDefinitionLogicalLocTotal: number;
  readonly scenarioCount: number;
  readonly scenarios: readonly ScenarioMetric[];
  readonly productionModulesImportedCount: number;
  readonly productionModulesImported: readonly string[];
  readonly bvpPowerShellScriptCount: number;
  readonly bvpPowerShellLogicalLoc: number;
  readonly bvpPowerShellFiles: readonly string[];
  readonly scenarioSpecificPowerShellCount: number;
  readonly scenarioSpecificPowerShellFiles: readonly string[];
  readonly scenarioSpecificProductionFileCount: number;
  readonly scenarioSpecificProductionFiles: readonly string[];
  readonly classificationErrors: readonly string[];
}

export interface BudgetResult {
  readonly id: string;
  readonly measured: number;
  readonly limit: number;
  readonly state: "PASS" | "FAIL";
  readonly offenders: readonly string[];
}

export interface MetricsResultValue {
  readonly schemaVersion: 1;
  readonly baseSha: string | null;
  readonly current: MetricsSnapshot | null;
  readonly base: MetricsSnapshot | null;
  readonly delta: Record<string, { readonly base: number; readonly current: number; readonly delta: number }> | null;
  readonly budgets: readonly BudgetResult[];
  readonly overall: "PASS" | "FAIL";
  readonly error?: string;
}

export interface MetricsRunResult {
  readonly exitCode: number;
  readonly output: string;
  readonly value: MetricsResultValue;
}

const manifestPath = "dev/authority/governance/locks/testing-platform-boundary.yaml";
const sourceExtensions = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const tsExtensions = /\.(?:ts|tsx|mts|cts)$/i;

function normalizeRepoPath(path: string): string {
  let normalized = path.trim().replaceAll("\\", "/");
  while (normalized.startsWith("./")) normalized = normalized.slice(2);
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizePolicyRoot(path: string): string {
  return normalizeRepoPath(path).replace(/\/+$/, "");
}

function under(path: string, root: string): boolean {
  const p = normalizeRepoPath(path);
  const r = normalizePolicyRoot(root);
  return p === r || p.startsWith(r + "/");
}

function withinAny(path: string, roots: readonly string[]): boolean {
  return roots.some((root) => under(path, root));
}

function repoRelative(repoRoot: string, fullPath: string): string {
  return normalizeRepoPath(relative(repoRoot, resolve(fullPath)));
}

function listFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

function listSourceFiles(repoRoot: string, relativeRoot: string): string[] {
  const fullRoot = join(repoRoot, ...normalizePolicyRoot(relativeRoot).split("/"));
  return listFiles(fullRoot).filter((path) => sourceExtensions.has(extname(path).toLowerCase()));
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function linesOf(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function sectionBounds(lines: readonly string[], section: string): { start: number; end: number } {
  const re = new RegExp("^" + escapeRegex(section) + ":\\s*$");
  const indices = lines.map((line, index) => re.test(line) ? index : -1).filter((index) => index >= 0);
  if (indices.length !== 1) throw new Error(`Manifest section '${section}' must appear exactly once.`);
  const start = indices[0];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().length === 0 || line.trimStart().startsWith("#")) continue;
    if (/^\S/.test(line)) { end = i; break; }
  }
  return { start, end };
}
