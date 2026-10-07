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

function topScalar(lines: readonly string[], key: string): string {
  const re = new RegExp("^" + escapeRegex(key) + ":\\s*(.+?)\\s*$");
  const matches = lines.map((line) => line.match(re)).filter((value): value is RegExpMatchArray => value !== null);
  if (matches.length !== 1) throw new Error(`Manifest key '${key}' must appear exactly once as a scalar.`);
  return unquote(matches[0][1]);
}

function nestedScalar(lines: readonly string[], section: string, key: string): string {
  const bounds = sectionBounds(lines, section);
  const re = new RegExp("^  " + escapeRegex(key) + ":\\s*(.+?)\\s*$");
  const values: string[] = [];
  for (let i = bounds.start + 1; i < bounds.end; i += 1) {
    const match = lines[i].match(re);
    if (match) values.push(unquote(match[1]));
  }
  if (values.length !== 1) throw new Error(`Manifest key '${section}.${key}' must appear exactly once as a scalar.`);
  return values[0];
}

function nestedList(lines: readonly string[], section: string, key: string, required = true): string[] {
  const bounds = sectionBounds(lines, section);
  const re = new RegExp("^  " + escapeRegex(key) + ":\\s*(\\[\\s*\\])?\\s*$");
  const indices: number[] = [];
  let inlineEmpty = false;
  for (let i = bounds.start + 1; i < bounds.end; i += 1) {
    const match = lines[i].match(re);
    if (match) { indices.push(i); inlineEmpty ||= Boolean(match[1]); }
  }
  if (indices.length === 0 && !required) return [];
  if (indices.length !== 1) throw new Error(`Manifest list '${section}.${key}' must appear exactly once.`);
  if (inlineEmpty) return [];
  const values: string[] = [];
  for (let i = indices[0] + 1; i < bounds.end; i += 1) {
    const line = lines[i];
    if (/^  \S/.test(line)) break;
    const match = line.match(/^    -\s+(.+?)\s*$/);
    if (match) values.push(unquote(match[1]));
  }
  if (required && values.length === 0) throw new Error(`Manifest list '${section}.${key}' must not be empty.`);
  return values;
}

function topList(lines: readonly string[], key: string): string[] {
  const re = new RegExp("^" + escapeRegex(key) + ":\\s*$");
  const indices = lines.map((line, index) => re.test(line) ? index : -1).filter((index) => index >= 0);
  if (indices.length !== 1) throw new Error(`Manifest list '${key}' must appear exactly once.`);
  const values: string[] = [];
  for (let i = indices[0] + 1; i < lines.length; i += 1) {
    if (/^\S/.test(lines[i])) break;
    const match = lines[i].match(/^  -\s+(.+?)\s*$/);
    if (match) values.push(unquote(match[1]));
  }
  if (values.length === 0) throw new Error(`Manifest list '${key}' must not be empty.`);
  return values;
}

function boolValue(value: string, path: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Manifest key '${path}' must be true or false.`);
}

function intValue(value: string, path: string): number {
  if (!/^-?\d+$/.test(value)) throw new Error(`BOUNDARY_MANIFEST_INVALID: ${path} must be an integer.`);
  return Number(value);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function frozenSurfacePath(surface: string): string {
  const trimmed = surface.trim();
  if (/^[A-Za-z0-9._/-]+$/.test(trimmed)) return normalizeRepoPath(trimmed);
  const match = trimmed.match(/([A-Za-z0-9._/-]+\.[A-Za-z0-9._-]+)\s*$/);
  if (match) return normalizeRepoPath(match[1]);
  throw new Error(`Frozen surface entry '${surface}' does not contain a deterministic repository path.`);
}

function parseBoundaryPolicy(text: string): BoundaryPolicy {
  const lines = linesOf(text);
  if (lines.length === 0 || text.length === 0) throw new Error("Manifest is empty.");
  if (lines.some((line) => line.includes("\t"))) throw new Error("Tabs are not permitted in the authoritative manifest.");
  const schema = intValue(topScalar(lines, "schema_version"), "schema_version");
  if (schema !== 2) throw new Error(`Unsupported schema_version '${schema}'.`);
  const status = topScalar(lines, "status");
  if (!/^authoritative(?:_|$)/i.test(status)) throw new Error(`Manifest status '${status}' does not establish authoritative boundary policy.`);
  const productionRoots = nestedList(lines, "roots", "production").map(normalizePolicyRoot);
  const testPlatformRoot = normalizePolicyRoot(nestedScalar(lines, "roots", "test_platform"));
  const activeDevRoot = normalizePolicyRoot(nestedScalar(lines, "roots", "active_dev"));
  const archiveRoot = normalizePolicyRoot(nestedScalar(lines, "roots", "archive"));
  const productionForbiddenRoots = nestedList(lines, "import_rules", "production_must_not_import").map(normalizePolicyRoot);
  const shippingForbiddenRoots = nestedList(lines, "shipping_rules", "production_bundle_must_exclude").map(normalizePolicyRoot);
  const allowlistRequired = boolValue(nestedScalar(lines, "import_rules", "test_platform_may_import_production_only_through_allowlist"), "import_rules.test_platform_may_import_production_only_through_allowlist");
  const scenarioSpecificProductionAllowed = boolValue(nestedScalar(lines, "import_rules", "scenario_specific_production_code_allowed"), "import_rules.scenario_specific_production_code_allowed");
  const productionValidationUiAllowed = boolValue(nestedScalar(lines, "shipping_rules", "production_validation_ui_allowed"), "shipping_rules.production_validation_ui_allowed");
  const validationDeviceSeparated = boolValue(nestedScalar(lines, "shipping_rules", "validation_device_agent_must_be_separate_artifact_or_entrypoint"), "shipping_rules.validation_device_agent_must_be_separate_artifact_or_entrypoint");
  const seamAllowlistRequired = boolValue(nestedScalar(lines, "production_seam", "allowlist_required"), "production_seam.allowlist_required");
  const approvedProductionImports = nestedList(lines, "production_seam", "approved_imports", false).map(normalizeRepoPath);
  const frozenSurfaces = topList(lines, "supervisor_owned_frozen_surfaces").map(frozenSurfacePath);
  const archiveIsNonAuthoritative = boolValue(nestedScalar(lines, "archive_policy", "archive_is_non_authoritative"), "archive_policy.archive_is_non_authoritative");
  const archiveExcluded = boolValue(nestedScalar(lines, "archive_policy", "exclude_from_normal_grounding"), "archive_policy.exclude_from_normal_grounding");
  const activeDocsMustNotDepend = boolValue(nestedScalar(lines, "archive_policy", "active_docs_must_not_depend_on_archived_prompts"), "archive_policy.active_docs_must_not_depend_on_archived_prompts");
  const scenarioPowerShellMax = intValue(nestedScalar(lines, "complexity_budgets", "scenario_specific_powershell_scripts_max"), "complexity_budgets.scenario_specific_powershell_scripts_max");
  if (scenarioPowerShellMax !== 0) throw new Error("complexity_budgets.scenario_specific_powershell_scripts_max must be 0 for S03B.");
  for (const root of [...productionRoots, testPlatformRoot, activeDevRoot, archiveRoot, ...productionForbiddenRoots, ...shippingForbiddenRoots]) {
    if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(root) || /(^|\/)\.\.($|\/)/.test(root)) throw new Error(`Manifest root '${root}' is not a safe repository-relative root.`);
  }
  for (const root of productionRoots) {
    if (under(root, testPlatformRoot) || under(testPlatformRoot, root)) throw new Error(`Production root '${root}' overlaps test-platform root '${testPlatformRoot}'.`);
  }
  if (under(archiveRoot, activeDevRoot) || under(activeDevRoot, archiveRoot)) throw new Error(`Archive root '${archiveRoot}' must be outside and non-overlapping with active_dev root '${activeDevRoot}'.`);
  if (!productionForbiddenRoots.includes(testPlatformRoot)) throw new Error("import_rules.production_must_not_import does not prohibit the authoritative test-platform root.");
  if (!shippingForbiddenRoots.includes(testPlatformRoot)) throw new Error("shipping_rules.production_bundle_must_exclude does not exclude the authoritative test-platform root.");
  if (!allowlistRequired || !seamAllowlistRequired) throw new Error("Production seam allowlist authority is not enabled.");
  if (scenarioSpecificProductionAllowed || productionValidationUiAllowed || !validationDeviceSeparated) throw new Error("Manifest permits production scenario/validation authority or does not require validation-device separation.");
  if (!archiveIsNonAuthoritative || !archiveExcluded || !activeDocsMustNotDepend) throw new Error("Archive policy does not establish required inertness.");
  return {
    manifestPath,
    productionRoots: [...new Set(productionRoots)].sort(),
    testPlatformRoot,
    activeDevRoot,
    archiveRoot,
    productionForbiddenRoots: [...new Set(productionForbiddenRoots)].sort(),
    shippingForbiddenRoots: [...new Set(shippingForbiddenRoots)].sort(),
    approvedProductionImports: [...new Set(approvedProductionImports)].sort(),
    frozenSurfaces: [...new Set(frozenSurfaces)].sort(),
    scenarioSpecificProductionAllowed,
    productionValidationUiAllowed,
    seamLocMax: intValue(nestedScalar(lines, "production_seam", "max_logical_loc"), "production_seam.max_logical_loc"),
    seamFilesMax: intValue(nestedScalar(lines, "production_seam", "max_files"), "production_seam.max_files"),
    coreLocMax: intValue(nestedScalar(lines, "complexity_budgets", "test_platform_framework_core_logical_ts_loc_max"), "complexity_budgets.test_platform_framework_core_logical_ts_loc_max"),
    liveLocMax: intValue(nestedScalar(lines, "complexity_budgets", "live_device_agent_logical_ts_loc_max"), "complexity_budgets.live_device_agent_logical_ts_loc_max"),
    scenarioTarget: intValue(nestedScalar(lines, "complexity_budgets", "ordinary_scenario_logical_loc_target"), "complexity_budgets.ordinary_scenario_logical_loc_target"),
    scenarioMax: intValue(nestedScalar(lines, "complexity_budgets", "ordinary_scenario_logical_loc_hard_max"), "complexity_budgets.ordinary_scenario_logical_loc_hard_max"),
    scenarioPowerShellMax,
    bvpPowerShellCountMax: intValue(nestedScalar(lines, "complexity_budgets", "bvp_powershell_scripts_max"), "complexity_budgets.bvp_powershell_scripts_max"),
    bvpPowerShellLocMax: intValue(nestedScalar(lines, "complexity_budgets", "bvp_powershell_combined_logical_loc_max"), "complexity_budgets.bvp_powershell_combined_logical_loc_max"),
    scenarioProductionMax: intValue(nestedScalar(lines, "complexity_budgets", "scenario_specific_production_files_max"), "complexity_budgets.scenario_specific_production_files_max"),
  };
}

function currentReader(repoRoot: string, policy: BoundaryPolicy): SnapshotReader {
  const found = new Set<string>();
  for (const root of [...policy.productionRoots, policy.testPlatformRoot, "dev/scripts"]) {
    const full = join(repoRoot, ...normalizePolicyRoot(root).split("/"));
    for (const file of listFiles(full)) found.add(repoRelative(repoRoot, file));
  }
  return {
    paths: [...found].sort(),
    read(path: string): string | null {
      const full = join(repoRoot, ...normalizeRepoPath(path).split("/"));
      return existsSync(full) ? readFileSync(full, "utf8") : null;
    },
  };
}

function git(repoRoot: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} exited ${result.status}: ${(result.stderr || result.stdout || "").trim()}`);
  return result.stdout ?? "";
}

function gitReader(repoRoot: string, sha: string): SnapshotReader {
  try { git(repoRoot, ["cat-file", "-e", `${sha}^{commit}`]); }
  catch (error) { throw new Error(`BASE_SHA_UNREADABLE: ${error instanceof Error ? error.message : String(error)}`); }
  let paths: string[];
  try { paths = git(repoRoot, ["ls-tree", "-r", "--name-only", sha]).split(/\r?\n/).filter(Boolean).map(normalizeRepoPath).sort(); }
  catch (error) { throw new Error(`BASE_SHA_UNREADABLE: ${error instanceof Error ? error.message : String(error)}`); }
  return {
    paths,
    read(path: string): string | null {
      const result = spawnSync("git", ["-C", repoRoot, "show", `${sha}:${normalizeRepoPath(path)}`], { encoding: "utf8" });
      if (result.error || result.status !== 0) return null;
      return result.stdout ?? "";
    },
  };
}

function loadPolicy(reader: SnapshotReader): BoundaryPolicy {
  const text = reader.read(manifestPath);
  if (text === null) throw new Error("BOUNDARY_MANIFEST_MISSING");
  try { return parseBoundaryPolicy(text); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("BOUNDARY_MANIFEST_")) throw error;
    throw new Error("BOUNDARY_MANIFEST_INVALID: " + message);
  }
}

function resolveRepositoryReference(repoRoot: string, origin: string, reference: string, knownRoots: readonly string[], treatBareAsRepoRelative = false): string | null {
  let normalized = reference.trim().replace(/^['"]|['"]$/g, "").replaceAll("\\", "/");
  if (!normalized) return null;
  normalized = normalized.replace(/[*?\[].*$/, "");
  if (!normalized) return null;
  for (const root of knownRoots.map(normalizePolicyRoot)) {
    if (normalized === root || normalized.startsWith(root + "/")) return normalizeRepoPath(normalized);
  }
  if (!normalized.startsWith(".") && !treatBareAsRepoRelative) return null;
  const base = treatBareAsRepoRelative && !normalized.startsWith(".") ? repoRoot : dirname(join(repoRoot, ...normalizeRepoPath(origin).split("/")));
  const target = resolve(base, normalized);
  const rel = normalizeRepoPath(relative(repoRoot, target));
  if (rel === ".." || rel.startsWith("../")) return null;
  return rel;
}

function approvedProductionImport(target: string, allowlist: readonly string[]): boolean {
  for (const raw of allowlist) {
    const entry = normalizeRepoPath(raw);
    if (entry.endsWith("/**")) {
      const prefix = entry.slice(0, -3).replace(/\/+$/, "");
      if (target === prefix || target.startsWith(prefix + "/")) return true;
      continue;
    }
    if (target === entry) return true;
    const stem = entry.replace(/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i, "");
    if (stem !== entry && target === stem) return true;
    if (/\/index\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i.test(entry) && target === entry.replace(/\/index\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i, "")) return true;
  }
  return false;
}

function propertyNameText(name: ts.PropertyName | undefined): string | null {
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function stringValue(node: ts.Node | undefined): string | null {
  return node && ts.isStringLiteralLike(node) ? node.text : null;
}

function scenarioDataOnly(node: ts.Node): boolean {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword || node.kind === ts.SyntaxKind.NullKeyword) return true;
  if (ts.isPrefixUnaryExpression(node)) return (node.operator === ts.SyntaxKind.PlusToken || node.operator === ts.SyntaxKind.MinusToken) && ts.isNumericLiteral(node.operand);
  if (ts.isParenthesizedExpression(node)) return scenarioDataOnly(node.expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((element) => !ts.isSpreadElement(element) && scenarioDataOnly(element));
  if (ts.isObjectLiteralExpression(node)) return node.properties.every((property) => ts.isPropertyAssignment(property) && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name)) && scenarioDataOnly(property.initializer));
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || (ts.isSatisfiesExpression(node))) return scenarioDataOnly(node.expression);
  return false;
}

function declarativeScenario(sourceFile: ts.SourceFile): boolean {
  let found = false;
  let imported = false;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      const moduleName = stringValue(statement.moduleSpecifier);
      const bindings = statement.importClause?.namedBindings;
      if (!moduleName?.endsWith("/src/scenario/scenario-contract") || !bindings || !ts.isNamedImports(bindings) || !bindings.elements.some((element) => element.name.text === "defineScenario")) return false;
      imported = true;
      continue;
    }
    if (ts.isVariableStatement(statement) && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0 && statement.declarationList.declarations.length === 1) {
      const initializer = statement.declarationList.declarations[0].initializer;
      if (found || !initializer || !ts.isCallExpression(initializer) || !ts.isIdentifier(initializer.expression) || initializer.expression.text !== "defineScenario" || initializer.arguments.length !== 1 || !ts.isObjectLiteralExpression(initializer.arguments[0]) || !scenarioDataOnly(initializer.arguments[0])) return false;
      found = true;
      continue;
    }
    return false;
  }
  return imported && found;
}

function createAnalysis(files: readonly { readonly path: string; readonly text: string; readonly mode?: "source" | "build" | "tsconfig" }[]): SourceAnalysis[] {
  const sourceFiles = files.filter((file) => file.mode !== "tsconfig");
  const map = new Map(sourceFiles.map((file) => [normalizeRepoPath(file.path), file.text]));
  const options: ts.CompilerOptions = { allowJs: true, checkJs: false, noResolve: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS };
  const host = ts.createCompilerHost(options);
  host.fileExists = (file) => map.has(normalizeRepoPath(file));
  host.readFile = (file) => map.get(normalizeRepoPath(file));
  host.writeFile = () => undefined;
  host.getSourceFile = (file, version) => {
    const key = normalizeRepoPath(file);
    const text = map.get(key);
    return text === undefined ? undefined : ts.createSourceFile(key, text, version, true);
  };
  host.getCurrentDirectory = () => "";
  const program = ts.createProgram({ rootNames: [...map.keys()], options, host });
  const checker = program.getTypeChecker();

  const declarationNames = (name: ts.BindingName | undefined, output: string[]): void => {
    if (!name) return;
    if (ts.isIdentifier(name)) { output.push(name.text); return; }
    for (const element of name.elements) if (ts.isBindingElement(element)) declarationNames(element.name, output);
  };
  const locallyShadowedRequire = (identifier: ts.Identifier, sourceFile: ts.SourceFile): boolean => {
    const symbol = checker.getSymbolAtLocation(identifier);
    return Boolean(symbol?.declarations?.some((declaration) => normalizeRepoPath(declaration.getSourceFile().fileName) === normalizeRepoPath(sourceFile.fileName)));
  };
  const collectDependencies = (sourceFile: ts.SourceFile): Dependency[] => {
    const dependencies: Dependency[] = [];
    const add = (kind: string, node: ts.Node | undefined): void => { const specifier = stringValue(node); if (specifier !== null) dependencies.push({ kind, specifier }); };
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) add(node.importClause?.isTypeOnly ? "import-type" : "import", node.moduleSpecifier);
      else if (ts.isExportDeclaration(node) && node.moduleSpecifier) add(node.isTypeOnly ? "export-type" : "export", node.moduleSpecifier);
      else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add("import-equals", node.moduleReference.expression);
      else if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add("dynamic-import", node.arguments[0]);
        else if (ts.isIdentifier(node.expression) && node.expression.text === "require" && !locallyShadowedRequire(node.expression, sourceFile)) add("require", node.arguments[0]);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return dependencies;
  };
  const scenarioName = /^(?:BVP(?:_|$)[A-Za-z0-9_]*|scenario(?:Id|Runner|Step|Fixture|Verdict|Control|Execution|Command|Action)[A-Za-z0-9_]*|validation(?:Scenario|Runner|Control|Mode|Command)[A-Za-z0-9_]*|(?:run|execute|start|resume|advance|select|set|dispatch)[A-Za-z0-9_]*Scenario[A-Za-z0-9_]*)$/i;
  const collectScenarioSignals = (sourceFile: ts.SourceFile): { kind: string; name: string }[] => {
    const signals: { kind: string; name: string }[] = [];
    const add = (kind: string, name: string | null | undefined): void => { if (name && scenarioName.test(name)) signals.push({ kind, name }); };
    const addBinding = (kind: string, name: ts.BindingName): void => { const names: string[] = []; declarationNames(name, names); for (const value of names) add(kind, value); };
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node)) addBinding("variable", node.name);
      else if (ts.isParameter(node)) addBinding("parameter", node.name);
      else if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) add("declaration", node.name?.text);
      else if (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isPropertySignature(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) add("member", propertyNameText(node.name));
      else if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) add("property", propertyNameText(node.name));
      else if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression)) add("call", node.expression.text);
        else if (ts.isPropertyAccessExpression(node.expression)) add("call", node.expression.name.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    const seen = new Set<string>();
    return signals.filter((signal) => { const key = signal.kind + ":" + signal.name; if (seen.has(key)) return false; seen.add(key); return true; });
  };
  const collectBuildReferences = (sourceFile: ts.SourceFile): string[] => {
    const topLevelValues = new Map<string, ts.Expression>();
    for (const statement of sourceFile.statements) if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name) && declaration.initializer) topLevelValues.set(declaration.name.text, declaration.initializer);
    const staticStrings = (node: ts.Expression | undefined, seen = new Set<string>()): string[] => {
      if (!node) return [];
      if (ts.isStringLiteralLike(node)) return [node.text];
      if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap((element) => ts.isExpression(element) ? staticStrings(element, seen) : []);
      if (ts.isParenthesizedExpression(node)) return staticStrings(node.expression, seen);
      if (ts.isIdentifier(node) && topLevelValues.has(node.text) && !seen.has(node.text)) { const next = new Set(seen); next.add(node.text); return staticStrings(topLevelValues.get(node.text), next); }
      return [];
    };
    const buildKeys = new Set(["entry", "entries", "entryPoint", "entryPoints", "input", "inputs", "inject", "tsconfig"]);
    const buildCallNames = new Set(["build", "buildSync", "context", "defineConfig"]);
    const references: string[] = [];
    const addValues = (node: ts.Expression | undefined): void => { for (const value of staticStrings(node)) references.push(value); };
    const inspectConfig = (node: ts.Expression | undefined, seen = new Set<string>()): void => {
      if (!node) return;
      if (ts.isParenthesizedExpression(node)) { inspectConfig(node.expression, seen); return; }
      if (ts.isIdentifier(node) && topLevelValues.has(node.text) && !seen.has(node.text)) { const next = new Set(seen); next.add(node.text); inspectConfig(topLevelValues.get(node.text), next); return; }
      if (ts.isArrayLiteralExpression(node)) { for (const element of node.elements) if (ts.isExpression(element)) inspectConfig(element, seen); return; }
      if (!ts.isObjectLiteralExpression(node)) return;
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) { const key = propertyNameText(property.name); if (key && buildKeys.has(key)) addValues(property.initializer); else inspectConfig(property.initializer, seen); }
        else if (ts.isShorthandPropertyAssignment(property) && buildKeys.has(property.name.text)) addValues(topLevelValues.get(property.name.text));
      }
    };
    const callName = (expression: ts.LeftHandSideExpression): string | null => ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) ? expression.name.text : null;
    const isModuleExports = (left: ts.Expression): boolean => ts.isPropertyAccessExpression(left) && ((ts.isIdentifier(left.expression) && left.expression.text === "module" && left.name.text === "exports") || (ts.isIdentifier(left.expression) && left.expression.text === "exports"));
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) { const name = callName(node.expression); if (name && buildCallNames.has(name)) for (const argument of node.arguments) inspectConfig(argument); }
      else if (ts.isExportAssignment(node)) inspectConfig(node.expression);
      else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && isModuleExports(node.left)) inspectConfig(node.right);
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
    return [...new Set(references)];
  };
  return files.map((file) => {
    if (file.mode === "tsconfig") {
      const parsed = ts.parseConfigFileTextToJson(file.path, file.text);
      if (parsed.error) return { path: file.path, dependencies: [], scenarioSignals: [], buildReferences: [], declarativeScenario: false, errors: [ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n")] };
      const config = parsed.config ?? {};
      const refs: string[] = [];
      const add = (value: unknown): void => { if (typeof value === "string") refs.push(value); else if (Array.isArray(value)) for (const item of value) add(item); };
      add(config.files); add(config.include); add(config.extends); if (Array.isArray(config.references)) for (const value of config.references) if (value && typeof value.path === "string") refs.push(value.path); if (config.compilerOptions) { add(config.compilerOptions.rootDir); add(config.compilerOptions.rootDirs); }
      return { path: file.path, dependencies: [], scenarioSignals: [], buildReferences: [...new Set(refs)], declarativeScenario: false, errors: [] };
    }
    const sourceFile = program.getSourceFile(normalizeRepoPath(file.path));
    if (!sourceFile) return { path: file.path, dependencies: [], scenarioSignals: [], buildReferences: [], declarativeScenario: false, errors: ["TypeScript parser did not load source file."] };
    const errors = program.getSyntacticDiagnostics(sourceFile).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    return {
      path: file.path,
      dependencies: collectDependencies(sourceFile),
      scenarioSignals: file.mode === "source" ? collectScenarioSignals(sourceFile) : [],
      buildReferences: file.mode === "build" ? collectBuildReferences(sourceFile) : [],
      declarativeScenario: file.mode === "source" && declarativeScenario(sourceFile),
      errors,
    };
  });
}

function buildScriptFileReferences(script: string): string[] {
  const references: string[] = [];
  const patterns = [
    /(?:^|&&|\|\||;)\s*(?:node|tsx|ts-node)\s+(?:--[A-Za-z0-9_-]+(?:=\S+)?\s+)*("[^"]+"|'[^']+'|[A-Za-z0-9_./\\-]+\.(?:mjs|cjs|js|ts))/gi,
    /(?:^|&&|\|\||;)\s*tsc\b[^;&|]*?(?:-p|--project)\s+("[^"]+"|'[^']+'|[A-Za-z0-9_./\\-]+)/gi,
    /(?:^|&&|\|\||;)\s*(?:esbuild|rollup|webpack|vite)\s+("[^"]+"|'[^']+'|[A-Za-z0-9_./\\-]+)/gi,
  ];
  for (const pattern of patterns) for (const match of script.matchAll(pattern)) references.push(match[1].replace(/^['"]|['"]$/g, ""));
  return references;
}

function objectStrings(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(objectStrings);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap(objectStrings);
  return [];
}

export function runArchitectureGuard(options: { readonly repoRoot: string; readonly changedPaths?: readonly string[]; readonly changeClass?: ChangeClass }): GuardResult {
  const repoRoot = resolve(options.repoRoot);
  const changeClass = options.changeClass ?? "ordinary";
  const changedPaths = options.changedPaths ?? [];
  const violations: ArchitectureViolation[] = [];
  const add = (rule: string, path: string, detail: string): void => { violations.push({ rule, path: normalizeRepoPath(path), detail }); };
  if (!existsSync(repoRoot)) return { exitCode: 2, output: `ARCH_GUARD_ERROR rule=INPUT path=${repoRoot} detail=Repository root does not exist.\n`, violations: [] };
  if (changeClass !== "ordinary" && changeClass !== "authorized-governance") return { exitCode: 2, output: "ARCH_GUARD_ERROR rule=INPUT path=<change-class> detail=ChangeClass must be ordinary or authorized-governance.\n", violations: [] };
  let policy: BoundaryPolicy | null = null;
  const manifestFullPath = join(repoRoot, ...manifestPath.split("/"));
  if (!existsSync(manifestFullPath)) add("BOUNDARY_MANIFEST_MISSING", manifestPath, "Required authoritative boundary manifest is missing.");
  else {
    try { policy = parseBoundaryPolicy(readFileSync(manifestFullPath, "utf8")); }
    catch (error) { add("BOUNDARY_MANIFEST_INVALID", manifestPath, error instanceof Error ? error.message : String(error)); }
  }
  if (policy) {
    const knownRoots = [...policy.productionRoots, policy.testPlatformRoot];
    const analysisRequests: { path: string; text: string; mode: "source" | "build" | "tsconfig" }[] = [];
    for (const root of policy.productionRoots) for (const file of listSourceFiles(repoRoot, root)) analysisRequests.push({ path: repoRelative(repoRoot, file), text: readFileSync(file, "utf8"), mode: "source" });
    for (const file of listSourceFiles(repoRoot, policy.testPlatformRoot)) analysisRequests.push({ path: repoRelative(repoRoot, file), text: readFileSync(file, "utf8"), mode: "source" });

    let packageModel: Record<string, unknown> | null = null;
    const packagePath = join(repoRoot, "package.json");
    if (!existsSync(packagePath)) add("PRODUCTION_BUILD_CONFIGURATION_INVALID", "package.json", "Production package.json is required to establish build entrypoints.");
    else {
      try { packageModel = JSON.parse(readFileSync(packagePath, "utf8")); }
      catch (error) { add("PRODUCTION_BUILD_CONFIGURATION_INVALID", "package.json", "Unable to parse package.json: " + (error instanceof Error ? error.message : String(error))); }
    }
    const buildPaths = new Set<string>();
    const addBuild = (path: string, mode: "build" | "tsconfig"): void => {
      const normalized = normalizeRepoPath(path);
      const key = mode + "|" + normalized;
      if (buildPaths.has(key)) return;
      buildPaths.add(key);
      const full = join(repoRoot, ...normalized.split("/"));
      if (!existsSync(full)) { add("PRODUCTION_BUILD_CONFIGURATION_INVALID", normalized, "Production build configuration references a missing file."); return; }
      analysisRequests.push({ path: normalized, text: readFileSync(full, "utf8"), mode });
    };
    if (packageModel) {
      for (const field of ["main", "module", "browser", "exports"]) for (const value of objectStrings(packageModel[field])) {
        const target = resolveRepositoryReference(repoRoot, "package.json", value, knownRoots, true);
        if (target && withinAny(target, policy.shippingForbiddenRoots)) add("PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM", "package.json", `Production package field '${field}' references forbidden shipping root through '${value}'.`);
      }
      const scripts = packageModel.scripts;
      if (scripts && typeof scripts === "object" && !Array.isArray(scripts)) for (const [name, raw] of Object.entries(scripts as Record<string, unknown>)) {
        if (!/^(?:build|verify:build|bundle|package|dist|release)(?::|$)/.test(name) || typeof raw !== "string") continue;
        for (const reference of buildScriptFileReferences(raw)) {
          const target = resolveRepositoryReference(repoRoot, "package.json", reference, knownRoots, true);
          if (!target) continue;
          if (withinAny(target, policy.shippingForbiddenRoots)) { add("PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM", "package.json", `Production build script '${name}' directly references forbidden shipping root through '${reference}'.`); continue; }
          if (/tsconfig[^/]*\.json$/i.test(target)) addBuild(target, "tsconfig");
          else if (/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i.test(target)) addBuild(target, "build");
        }
      }
    }
    if (existsSync(join(repoRoot, "tsconfig.json"))) addBuild("tsconfig.json", "tsconfig");
    for (const file of readdirSync(repoRoot, { withFileTypes: true })) if (file.isFile() && /^(?:esbuild|rollup|webpack|vite)\.config\./.test(file.name)) addBuild(file.name, "build");

    for (const result of createAnalysis(analysisRequests)) {
      const path = normalizeRepoPath(result.path);
      for (const error of result.errors) if (error.trim()) add("SOURCE_ANALYSIS_FAILED", path, error);
      const sourceMode = analysisRequests.find((request) => request.path === result.path)?.mode;
      if (sourceMode === "source") {
        const isProduction = withinAny(path, policy.productionRoots);
        const isTestPlatform = under(path, policy.testPlatformRoot);
        const scenarioPrefix = normalizeRepoPath(policy.testPlatformRoot) + "/scenarios/";
        if (isTestPlatform && path.startsWith(scenarioPrefix) && !result.declarativeScenario) add("SCENARIO_MODULE_NOT_DECLARATIVE", path, "Executable TypeScript beneath test-platform/scenarios must be exactly one exported defineScenario(...) declarative module.");
        for (const dependency of result.dependencies) {
          const target = resolveRepositoryReference(repoRoot, path, dependency.specifier, knownRoots);
          if (!target) continue;
          if (isProduction && withinAny(target, policy.productionForbiddenRoots)) add("PRODUCTION_IMPORTS_TEST_PLATFORM", path, `Actual ${dependency.kind} dependency '${dependency.specifier}' resolves into forbidden root '${target}'.`);
          if (isTestPlatform && withinAny(target, policy.productionRoots) && !approvedProductionImport(target, policy.approvedProductionImports)) add("TEST_PLATFORM_IMPORTS_UNAPPROVED_PRODUCTION", path, `Actual ${dependency.kind} dependency '${dependency.specifier}' resolves into production '${target}' without an approved seam entry.`);
        }
        if (isProduction && !policy.scenarioSpecificProductionAllowed) for (const signal of result.scenarioSignals) add("PRODUCTION_SCENARIO_CONTROL", path, `Executable production ${signal.kind} '${signal.name}' introduces prohibited BVP/validation scenario authority.`);
      } else if (sourceMode === "build" || sourceMode === "tsconfig") {
        for (const dependency of result.dependencies) {
          const target = resolveRepositoryReference(repoRoot, path, dependency.specifier, knownRoots);
          if (target && withinAny(target, policy.shippingForbiddenRoots)) add("PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM", path, `Actual build dependency '${dependency.specifier}' resolves into forbidden shipping root '${target}'.`);
        }
        for (const reference of result.buildReferences) {
          const target = resolveRepositoryReference(repoRoot, path, reference, knownRoots, true);
          if (target && withinAny(target, policy.shippingForbiddenRoots)) add("PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM", path, `${sourceMode === "tsconfig" ? "Production TypeScript build input/reference" : "Actual build input/reference"} '${reference}' resolves into forbidden shipping root '${target}'.`);
        }
      }
    }
    const main = join(repoRoot, "main.js");
    if (existsSync(main) && readFileSync(main, "utf8").includes("BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL")) add("PRODUCTION_BUNDLE_CONTAINS_TEST_PLATFORM", "main.js", "Shipping bundle contains the BVP non-shipping sentinel.");
    const testRoot = join(repoRoot, ...policy.testPlatformRoot.split("/"));
    for (const file of listFiles(testRoot).filter((path) => path.toLowerCase().endsWith(".ps1"))) add("TEST_PLATFORM_POWERSHELL_PROHIBITED", repoRelative(repoRoot, file), "PowerShell scripts are prohibited beneath the authoritative test-platform root.");
    const activeDev = join(repoRoot, ...policy.activeDevRoot.split("/"));
    const authorityTerms = /\b(?:execute|executing|use|using|read|follow|prompt|task|authority|authoritative|governing|required input|source of truth|depend|depends|dependency)\b/i;
    const historicalTerms = /\b(?:historical|non-authoritative|non authoritative|archived|must not|do not|excluded|exclude|ignore|superseded|provenance|no\s+(?:use|reliance|dependency|authority))\b/i;
    const archiveReference = new RegExp(`(?:^|[\\s('\"\\]])(?:\\./)?${escapeRegex(normalizeRepoPath(policy.archiveRoot))}/[^\\s)'\"\\]]*`, "i");
    for (const file of listFiles(activeDev).filter((path) => path.toLowerCase().endsWith(".md"))) {
      const path = repoRelative(repoRoot, file);
      for (const [index, line] of linesOf(readFileSync(file, "utf8")).entries()) if (archiveReference.test(line) && authorityTerms.test(line) && !historicalTerms.test(line)) add("ARCHIVE_USED_AS_CURRENT_AUTHORITY", path, `Line ${index + 1} treats authoritative archive root as current task/design/implementation authority.`);
    }
    if (changedPaths.length > 0 && changeClass === "ordinary") for (const raw of changedPaths) for (const piece of raw.split(/[,;\r\n]+/)) {
      if (!piece.trim()) continue;
      const changed = normalizeRepoPath(piece);
      const frozen = policy.frozenSurfaces.find((surface) => changed === surface || changed.startsWith(surface + "/"));
      if (frozen) add("FROZEN_SURFACE_CHANGED", changed, `Ordinary work changed supervisor-owned frozen surface '${frozen}'.`);
    }
  }
  let output = "";
  for (const violation of violations) output += `ARCH_GUARD_VIOLATION rule=${violation.rule} path=${violation.path} detail=${violation.detail}\n`;
  output += violations.length > 0 ? `ARCH_GUARD_RESULT=FAIL violations=${violations.length}\n` : "ARCH_GUARD_RESULT=PASS violations=0\n";
  return { exitCode: violations.length > 0 ? 1 : 0, output, violations };
}

function logicalLines(text: string | null, kind: "ps" | "ts"): string[] {
  if (text === null) return [];
  const result: string[] = [];
  let inBlock = false;
  let quote = "";
  let here = "";
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (kind === "ps" && here) { if (trimmed) result.push(raw); if (trimmed === here + "@") here = ""; continue; }
    let visible = "";
    let i = 0;
    while (i < raw.length) {
      if (inBlock) { const end = kind === "ps" ? "#>" : "*/"; const close = raw.indexOf(end, i); if (close < 0) { i = raw.length; continue; } inBlock = false; i = close + 2; continue; }
      const ch = raw[i];
      if (quote) {
        visible += ch;
        const escape = kind === "ps" ? "`" : "\\";
        if (ch === escape && i + 1 < raw.length) { visible += raw[i + 1]; i += 2; continue; }
        if (ch === quote) { if (kind === "ps" && quote === "'" && i + 1 < raw.length && raw[i + 1] === "'") { visible += raw[i + 1]; i += 2; continue; } quote = ""; }
        i += 1; continue;
      }
      if (kind === "ps" && ch === "@" && i + 1 < raw.length && (raw[i + 1] === "'" || raw[i + 1] === '\"')) { here = raw[i + 1]; visible += raw.slice(i); i = raw.length; continue; }
      const blockStart = kind === "ps" ? "<#" : "/*";
      const lineStart = kind === "ps" ? "#" : "//";
      if (raw.slice(i, i + 2) === blockStart) { inBlock = true; i += 2; continue; }
      if (raw.slice(i, i + lineStart.length) === lineStart) break;
      if ((kind === "ps" && (ch === "'" || ch === '\"')) || (kind === "ts" && (ch === "'" || ch === '\"' || ch === "`"))) quote = ch;
      visible += ch; i += 1;
    }
    if (kind === "ps" || quote !== "`") quote = "";
    if (visible.trim()) result.push(visible);
  }
  return result;
}

function countLoc(text: string | null, path: string): number {
  return logicalLines(text, path.toLowerCase().endsWith(".ps1") || /\.ya?ml$/i.test(path) ? "ps" : "ts").length;
}

function resolveRelative(origin: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const parts: string[] = [];
  const base = normalizeRepoPath(origin).replace(/\/[^/]+$/, "");
  for (const segment of (base + "/" + specifier).split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") { if (parts.length === 0) return null; parts.pop(); continue; }
    parts.push(segment);
  }
  return parts.join("/");
}

function resolveProductionModule(origin: string, specifier: string, production: ReadonlySet<string>): string | null {
  const target = resolveRelative(origin, specifier);
  if (!target) return null;
  const candidates = [target];
  const extension = extname(target).toLowerCase();
  if (!extension) candidates.push(target + ".ts", target + ".tsx", target + ".mts", target + ".cts", target + "/index.ts", target + "/index.tsx", target + "/index.mts", target + "/index.cts");
  else if (extension === ".js") candidates.push(target.slice(0, -3) + ".ts", target.slice(0, -3) + ".tsx");
  else if (extension === ".mjs") candidates.push(target.slice(0, -4) + ".mts");
  else if (extension === ".cjs") candidates.push(target.slice(0, -4) + ".cts");
  return candidates.find((candidate) => production.has(candidate)) ?? null;
}

function measureSnapshot(reader: SnapshotReader, policy: BoundaryPolicy): MetricsSnapshot {
  const paths = [...new Set(reader.paths.map(normalizeRepoPath))].sort();
  const productionFiles = paths.filter((path) => withinAny(path, policy.productionRoots) && tsExtensions.test(path));
  const testFiles = paths.filter((path) => under(path, policy.testPlatformRoot) && tsExtensions.test(path));
  const classificationErrors: string[] = [];
  for (const path of paths.filter((path) => under(path, policy.testPlatformRoot) && /\.(?:js|jsx|mjs|cjs|py|sh)$/i.test(path))) classificationErrors.push("Unclassifiable active BVP executable source: " + path);
  const productionSourceLogicalLoc = productionFiles.reduce((sum, path) => sum + countLoc(reader.read(path), path), 0);
  const seam = new Set<string>();
  for (const entry of policy.approvedProductionImports) {
    const entryStem = entry.replace(/\.(?:ts|tsx|mts|cts)$/i, "");
    const matches = productionFiles.filter((path) => { const stem = path.replace(/\.(?:ts|tsx|mts|cts)$/i, ""); return path === entry || stem === entryStem || stem === entryStem + "/index"; });
    if (matches.length === 0) classificationErrors.push("Approved production seam entry is not a readable production TypeScript file: " + entry);
    for (const path of matches) seam.add(path);
  }
  const productionSeamFiles = [...seam].sort();
  const productionSeamLogicalLoc = productionSeamFiles.reduce((sum, path) => sum + countLoc(reader.read(path), path), 0);
  const analysisInput = testFiles.map((path) => ({ path, text: reader.read(path) ?? "", mode: "source" as const }));
  const analysis = createAnalysis(analysisInput);
  const analysisByPath = new Map(analysis.map((result) => [result.path, result]));
  const scenarioRoot = normalizeRepoPath(policy.testPlatformRoot) + "/scenarios";
  const fixtureRoot = normalizeRepoPath(policy.testPlatformRoot) + "/fixtures";
  const testRoot = normalizeRepoPath(policy.testPlatformRoot) + "/test";
  const sourceRoot = normalizeRepoPath(policy.testPlatformRoot) + "/src";
  const frameworkCoreFiles: string[] = [];
  const liveFiles: string[] = [];
  for (const path of testFiles) {
    if (under(path, testRoot)) continue;
    if (under(path, scenarioRoot)) { if (analysisByPath.get(path)?.declarativeScenario) continue; frameworkCoreFiles.push(path); continue; }
    if (/(?:^|\/)(?:live-device|device-command-agent|command-agent|device-agent|windows-relay|relay|mailbox)(?:[-_/.]|$)/i.test(path)) { liveFiles.push(path); continue; }
    if (under(path, sourceRoot) || under(path, fixtureRoot)) { frameworkCoreFiles.push(path); continue; }
    classificationErrors.push("Unclassifiable active BVP TypeScript source: " + path);
  }
  frameworkCoreFiles.sort(); liveFiles.sort();
  const frameworkCoreLogicalTsLoc = frameworkCoreFiles.reduce((sum, path) => sum + countLoc(reader.read(path), path), 0);
  const liveDeviceAgentRelayLogicalTsLoc = liveFiles.reduce((sum, path) => sum + countLoc(reader.read(path), path), 0);
  const scenarioFiles = paths.filter((path) => under(path, scenarioRoot) && (/\.(?:json|ya?ml)$/i.test(path) || (tsExtensions.test(path) && Boolean(analysisByPath.get(path)?.declarativeScenario))));
  const scenarios: ScenarioMetric[] = scenarioFiles.map((path) => {
    const loc = countLoc(reader.read(path), path);
    const name = normalizeRepoPath(path).slice(scenarioRoot.length + 1).replace(/\.[^.]+$/, "");
    return { scenario: name, path, logicalLoc: loc, targetExceeded: loc > policy.scenarioTarget, hardMaxExceeded: loc > policy.scenarioMax };
  }).sort((a, b) => a.path.localeCompare(b.path));
  const productionSet = new Set(productionFiles);
  const imports = new Set<string>();
  for (const result of analysis) {
    for (const error of result.errors) if (error) classificationErrors.push(`TypeScript analysis failed for ${result.path}: ${error}`);
    for (const dependency of result.dependencies) { const target = resolveProductionModule(result.path, dependency.specifier, productionSet); if (target) imports.add(target); }
  }
  const knownNonBvp = new Set(["dev/scripts/Invoke-PhxCiS07ConsumerVerification.ps1"]);
  const knownBvp = new Set(["dev/scripts/Get-TestingArchitectureMetrics.ps1", "dev/scripts/Test-TestingArchitectureGuard.ps1", "dev/scripts/Test-BvpProductionTestCarryForward.ps1", "dev/scripts/Invoke-PHXCI-BvpFinalSelectiveVerification.ps1"]);
  const bvpPowerShellFiles: string[] = [];
  const scenarioSpecificPowerShellFiles: string[] = [];
  for (const path of paths.filter((value) => /^dev\/scripts\/.*\.ps1$/i.test(value))) {
    if (knownNonBvp.has(path)) continue;
    const code = logicalLines(reader.read(path), "ps").join("\n");
    const isKnown = knownBvp.has(path);
    const isBvp = isKnown || /\b(?:BVP|test-platform|testing-platform)\b/i.test(code);
    if (!isBvp) { classificationErrors.push("Unclassifiable active dev/scripts PowerShell: " + path); continue; }
    bvpPowerShellFiles.push(path);
    if (!isKnown && /(?:test-platform\/scenarios\/|\bscenario[A-Za-z0-9_-]*\b|\b[A-Za-z0-9_-]*Scenario[A-Za-z0-9_-]*\b|["'][A-Z]{1,4}\d{2,3}(?:-[A-Z0-9]+)*["'])/i.test(code)) scenarioSpecificPowerShellFiles.push(path);
  }
  for (const path of paths.filter((value) => under(value, policy.testPlatformRoot) && value.toLowerCase().endsWith(".ps1"))) if (!scenarioSpecificPowerShellFiles.includes(path)) scenarioSpecificPowerShellFiles.push(path);
  bvpPowerShellFiles.sort(); scenarioSpecificPowerShellFiles.sort();
  const bvpPowerShellLogicalLoc = bvpPowerShellFiles.reduce((sum, path) => sum + countLoc(reader.read(path), path), 0);
  const scenarioSpecificProductionFiles: string[] = [];
  for (const path of productionFiles) {
    const code = logicalLines(reader.read(path), "ts").join("\n");
    if (/scenario/i.test(path) || /^\s*(?:export\s+)?(?:class|interface|type)\s+[A-Za-z0-9_]*Scenario[A-Za-z0-9_]*\b/im.test(code)) scenarioSpecificProductionFiles.push(path);
  }
  return {
    productionSourceLogicalLoc,
    productionSeamLogicalLoc,
    productionSeamFileCount: productionSeamFiles.length,
    productionSeamFiles,
    frameworkCoreLogicalTsLoc,
    platformCoreRuntimeModuleCount: frameworkCoreFiles.length,
    frameworkCoreFiles,
    liveDeviceAgentRelayLogicalTsLoc,
    liveDeviceAgentRelayFiles: liveFiles,
    scenarioDefinitionLogicalLocTotal: scenarios.reduce((sum, scenario) => sum + scenario.logicalLoc, 0),
    scenarioCount: scenarios.length,
    scenarios,
    productionModulesImportedCount: imports.size,
    productionModulesImported: [...imports].sort(),
    bvpPowerShellScriptCount: bvpPowerShellFiles.length,
    bvpPowerShellLogicalLoc,
    bvpPowerShellFiles,
    scenarioSpecificPowerShellCount: scenarioSpecificPowerShellFiles.length,
    scenarioSpecificPowerShellFiles,
    scenarioSpecificProductionFileCount: scenarioSpecificProductionFiles.length,
    scenarioSpecificProductionFiles: scenarioSpecificProductionFiles.sort(),
    classificationErrors: classificationErrors.sort(),
  };
}

function budget(id: string, measured: number, limit: number, offenders: readonly string[] = []): BudgetResult {
  return { id, measured, limit, state: measured <= limit ? "PASS" : "FAIL", offenders: [...offenders] };
}

export function runArchitectureMetrics(options: { readonly repoRoot: string; readonly baseSha?: string }): MetricsRunResult {
  const repoRoot = resolve(options.repoRoot);
  const baseSha = options.baseSha?.trim() || null;
  try {
    const bootstrapPolicy = loadPolicy({ paths: [], read: (path) => { const full = join(repoRoot, ...normalizeRepoPath(path).split("/")); return existsSync(full) ? readFileSync(full, "utf8") : null; } });
    const currentReaderValue = currentReader(repoRoot, bootstrapPolicy);
    const policy = loadPolicy(currentReaderValue);
    const current = measureSnapshot(currentReaderValue, policy);
    const budgets: BudgetResult[] = [
      budget("PRODUCTION_SEAM_LOC", current.productionSeamLogicalLoc, policy.seamLocMax, current.productionSeamFiles),
      budget("PRODUCTION_SEAM_FILES", current.productionSeamFileCount, policy.seamFilesMax, current.productionSeamFiles),
      budget("FRAMEWORK_CORE_LOC", current.frameworkCoreLogicalTsLoc, policy.coreLocMax, current.frameworkCoreFiles),
      budget("LIVE_DEVICE_AGENT_RELAY_LOC", current.liveDeviceAgentRelayLogicalTsLoc, policy.liveLocMax, current.liveDeviceAgentRelayFiles),
      ...current.scenarios.map((scenario) => budget("SCENARIO_LOC:" + scenario.scenario, scenario.logicalLoc, policy.scenarioMax, [scenario.path])),
      budget("SCENARIO_SPECIFIC_POWERSHELL", current.scenarioSpecificPowerShellCount, policy.scenarioPowerShellMax, current.scenarioSpecificPowerShellFiles),
      budget("BVP_POWERSHELL_SCRIPT_COUNT", current.bvpPowerShellScriptCount, policy.bvpPowerShellCountMax, current.bvpPowerShellFiles),
      budget("BVP_POWERSHELL_LOC", current.bvpPowerShellLogicalLoc, policy.bvpPowerShellLocMax, current.bvpPowerShellFiles),
      budget("SCENARIO_SPECIFIC_PRODUCTION_FILES", current.scenarioSpecificProductionFileCount, policy.scenarioProductionMax, current.scenarioSpecificProductionFiles),
    ];
    let base: MetricsSnapshot | null = null;
    let delta: MetricsResultValue["delta"] = null;
    if (baseSha) {
      const baseReader = gitReader(repoRoot, baseSha);
      const basePolicy = loadPolicy(baseReader);
      base = measureSnapshot(baseReader, basePolicy);
      delta = {};
      for (const name of ["productionSourceLogicalLoc", "productionSeamLogicalLoc", "productionSeamFileCount", "frameworkCoreLogicalTsLoc", "platformCoreRuntimeModuleCount", "liveDeviceAgentRelayLogicalTsLoc", "scenarioDefinitionLogicalLocTotal", "scenarioCount", "productionModulesImportedCount", "bvpPowerShellScriptCount", "bvpPowerShellLogicalLoc", "scenarioSpecificPowerShellCount", "scenarioSpecificProductionFileCount"] as const) {
        delta[name] = { base: base[name] as number, current: current[name] as number, delta: (current[name] as number) - (base[name] as number) };
      }
    }
    const failed = budgets.some((entry) => entry.state === "FAIL") || current.classificationErrors.length > 0 || Boolean(base && base.classificationErrors.length > 0);
    const value: MetricsResultValue = { schemaVersion: 1, baseSha, current, base, delta, budgets, overall: failed ? "FAIL" : "PASS" };
    return { exitCode: failed ? 1 : 0, output: JSON.stringify(value, null, 2) + "\n", value };
  } catch (error) {
    const value: MetricsResultValue = { schemaVersion: 1, baseSha, current: null, base: null, delta: null, budgets: [], overall: "FAIL", error: error instanceof Error ? error.message : String(error) };
    return { exitCode: 1, output: JSON.stringify(value, null, 2) + "\n", value };
  }
}
