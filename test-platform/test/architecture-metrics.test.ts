import { match, notStrictEqual, strictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const repositoryRoot = resolve(__dirname, "../../..");
const metricsPath = join(
  repositoryRoot,
  "dev",
  "scripts",
  "Get-TestingArchitectureMetrics.ps1",
);
const powerShell = process.env.PWSH ?? "pwsh";

function writeText(root: string, relativePath: string, content: string): void {
  const fullPath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function lines(count: number, prefix = "export const value"): string {
  return Array.from({ length: count }, (_, index) => `${prefix}${index} = ${index};`).join("\n") + "\n";
}

function boundaryManifest(approvedImports: readonly string[] = []): string {
  return [
    "schema_version: 2",
    "status: authoritative_frozen_after_bvp_s01_persistence",
    "roots:",
    "  production:",
    "    - src/",
    "  test_platform: test-platform/",
    "  active_dev: dev/",
    "  archive: dev/archive/",
    "production_seam:",
    "  allowlist_required: true",
    ...(approvedImports.length === 0
      ? []
      : ["  approved_imports:", ...approvedImports.map((path) => `    - ${path}`)]),
    "  max_logical_loc: 350",
    "  max_files: 4",
    "complexity_budgets:",
    "  test_platform_framework_core_logical_ts_loc_max: 4000",
    "  live_device_agent_logical_ts_loc_max: 750",
    "  ordinary_scenario_logical_loc_target: 120",
    "  ordinary_scenario_logical_loc_hard_max: 200",
    "  scenario_specific_powershell_scripts_max: 0",
    "  bvp_powershell_scripts_max: 4",
    "  bvp_powershell_combined_logical_loc_max: 1500",
    "  scenario_specific_production_files_max: 0",
    "",
  ].join("\n");
}

function createFixture(approvedImports: readonly string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), "brain-bvp-metrics-"));
  writeText(root, "dev/governance/testing-platform-boundary.yaml", boundaryManifest(approvedImports));
  writeText(root, "src/main.ts", "export const productionValue = 1;\n");
  writeText(root, "test-platform/src/platform-root.ts", "export const platformValue = 1;\n");
  writeText(root, "test-platform/test/placeholder.test.ts", "export const testOnly = true;\n");
  return root;
}

interface MetricsRun {
  readonly status: number | null;
  readonly output: string;
  readonly value: any;
  readonly error?: Error;
}

function runMetrics(root: string, extraArgs: readonly string[] = []): MetricsRun {
  const result = spawnSync(
    powerShell,
    ["-NoProfile", "-File", metricsPath, "-RepoRoot", root, ...extraArgs],
    { encoding: "utf8" },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  let value: any = null;
  if (result.stdout) {
    try {
      value = JSON.parse(result.stdout);
    } catch {
      // Assertion helpers report the full output when JSON is invalid.
    }
  }
  return { status: result.status, output, value, error: result.error };
}

function withFixture(run: (root: string) => void, approvedImports: readonly string[] = []): void {
  const root = createFixture(approvedImports);
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function assertPass(result: MetricsRun): any {
  if (result.error) throw result.error;
  strictEqual(result.status, 0, result.output);
  strictEqual(result.value?.overall, "PASS", result.output);
  return result.value;
}

function assertBudgetFailure(result: MetricsRun, id: string): any {
  if (result.error) throw result.error;
  notStrictEqual(result.status, 0, result.output);
  strictEqual(result.value?.overall, "FAIL", result.output);
  const budget = result.value?.budgets?.find((entry: any) => entry.id === id);
  strictEqual(budget?.state, "FAIL", result.output);
  return result.value;
}

function runGit(root: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  strictEqual(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return (result.stdout ?? "").trim();
}

test("architecture metrics pass the actual BRAIN repository baseline", () => {
  const value = assertPass(runMetrics(repositoryRoot));
  strictEqual(value.current.productionSeamLogicalLoc, 0);
  strictEqual(value.current.productionSeamFileCount, 0);
  strictEqual(value.current.liveDeviceAgentRelayLogicalTsLoc, 0);
  strictEqual(value.current.scenarioCount, 0);
  strictEqual(value.current.platformCoreRuntimeModuleCount, 1);
  strictEqual(value.current.bvpPowerShellScriptCount, 4);
});

test("architecture metrics pass a compliant synthetic baseline and list real production imports", () => {
  withFixture((root) => {
    writeText(
      root,
      "test-platform/src/platform-root.ts",
      'import { productionValue } from "../../src/main";\nvoid productionValue;\n',
    );
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.productionSourceLogicalLoc, 1);
    strictEqual(value.current.frameworkCoreLogicalTsLoc, 2);
    strictEqual(value.current.platformCoreRuntimeModuleCount, 1);
    strictEqual(value.current.productionModulesImportedCount, 1);
    strictEqual(value.current.productionModulesImported[0], "src/main.ts");
  });
});

test("logical LOC excludes blank and comment-only lines while retaining inline-code comments", () => {
  withFixture((root) => {
    writeText(
      root,
      "test-platform/src/platform-root.ts",
      [
        "export const first = 1;",
        "",
        "// comment only",
        "/* block comment",
        "still a block comment */",
        "export const second = 2; // inline comment",
        "",
      ].join("\n"),
    );
    writeText(
      root,
      "dev/scripts/Invoke-BvpFixture.ps1",
      [
        "Write-Output 1",
        "# comment only",
        "<# block comment",
        "still a block comment #>",
        "Write-Output 2 # inline comment",
        "",
      ].join("\n"),
    );
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.frameworkCoreLogicalTsLoc, 2);
    strictEqual(value.current.bvpPowerShellLogicalLoc, 2);
  });
});

test("scenario target overage is observable but not a hard failure until 200 lines", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/C01.ts", lines(121));
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.scenarios[0].logicalLoc, 121);
    strictEqual(value.current.scenarios[0].targetExceeded, true);
    strictEqual(value.current.scenarios[0].hardMaxExceeded, false);
  });
});

test("production seam logical LOC over 350 fails", () => {
  withFixture((root) => {
    writeText(root, "src/bvp-seam.ts", lines(351));
    assertBudgetFailure(runMetrics(root), "PRODUCTION_SEAM_LOC");
  }, ["src/bvp-seam.ts"]);
});

test("production seam file count over four fails", () => {
  const imports = Array.from({ length: 5 }, (_, index) => `src/bvp-seam-${index}.ts`);
  withFixture((root) => {
    imports.forEach((path, index) => writeText(root, path, `export const seam${index} = ${index};\n`));
    assertBudgetFailure(runMetrics(root), "PRODUCTION_SEAM_FILES");
  }, imports);
});

test("framework core logical LOC over 4000 fails", () => {
  withFixture((root) => {
    writeText(root, "test-platform/src/platform-root.ts", lines(4001));
    assertBudgetFailure(runMetrics(root), "FRAMEWORK_CORE_LOC");
  });
});

test("live-device agent and relay logical LOC over 750 fails", () => {
  withFixture((root) => {
    writeText(root, "test-platform/src/device-agent/agent.ts", lines(751));
    assertBudgetFailure(runMetrics(root), "LIVE_DEVICE_AGENT_RELAY_LOC");
  });
});

test("individual declarative scenario over 200 logical lines fails", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/C01.ts", lines(201));
    assertBudgetFailure(runMetrics(root), "SCENARIO_LOC:C01");
  });
});

test("scenario-specific PowerShell is prohibited", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/C01.ps1", 'Write-Output "bad"\n');
    assertBudgetFailure(runMetrics(root), "SCENARIO_SPECIFIC_POWERSHELL");
  });
});

test("BVP PowerShell script count over four fails", () => {
  withFixture((root) => {
    for (let index = 0; index < 5; index += 1) {
      writeText(root, `dev/scripts/Invoke-BvpFixture${index}.ps1`, `Write-Output ${index}\n`);
    }
    assertBudgetFailure(runMetrics(root), "BVP_POWERSHELL_SCRIPT_COUNT");
  });
});

test("BVP PowerShell logical LOC over 1500 fails", () => {
  withFixture((root) => {
    writeText(root, "dev/scripts/Invoke-BvpFixture.ps1", lines(1501, "Write-Output "));
    assertBudgetFailure(runMetrics(root), "BVP_POWERSHELL_LOC");
  });
});

test("scenario-specific production source fails the zero-file budget", () => {
  withFixture((root) => {
    writeText(root, "src/C01Scenario.ts", "export interface C01Scenario { id: string }\n");
    assertBudgetFailure(runMetrics(root), "SCENARIO_SPECIFIC_PRODUCTION_FILES");
  });
});

test("unclassifiable active BVP TypeScript source fails closed", () => {
  withFixture((root) => {
    writeText(root, "test-platform/unclassified.ts", "export const bad = true;\n");
    const result = runMetrics(root);
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    strictEqual(result.value?.overall, "FAIL", result.output);
    match(result.value?.current?.classificationErrors?.join("\n") ?? "", /Unclassifiable active BVP TypeScript source/);
  });
});

test("base SHA measurement reports deterministic before/current/delta without mutating worktree state", () => {
  withFixture((root) => {
    runGit(root, ["init"]);
    runGit(root, ["config", "user.email", "bvp@example.invalid"]);
    runGit(root, ["config", "user.name", "BVP Fixture"]);
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "baseline"]);
    const base = runGit(root, ["rev-parse", "HEAD"]);
    writeText(root, "src/main.ts", "export const productionValue = 1;\nexport const added = 2;\n");
    const statusBefore = runGit(root, ["status", "--porcelain=v1"]);
    const value = assertPass(runMetrics(root, ["-BaseSha", base]));
    strictEqual(value.delta.productionSourceLogicalLoc.base, 1);
    strictEqual(value.delta.productionSourceLogicalLoc.current, 2);
    strictEqual(value.delta.productionSourceLogicalLoc.delta, 1);
    strictEqual(runGit(root, ["status", "--porcelain=v1"]), statusBefore);
  });
});

test("unreadable base SHA fails closed instead of becoming a zero baseline", () => {
  withFixture((root) => {
    const result = runMetrics(root, ["-BaseSha", "definitely-not-a-commit"]);
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    strictEqual(result.value?.overall, "FAIL", result.output);
    match(result.value?.error ?? "", /BASE_SHA_UNREADABLE/);
  });
});

test("missing required governance fails closed", () => {
  withFixture((root) => {
    rmSync(join(root, "dev", "governance", "testing-platform-boundary.yaml"));
    const result = runMetrics(root);
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    strictEqual(result.value?.overall, "FAIL", result.output);
    match(result.value?.error ?? "", /BOUNDARY_MANIFEST_MISSING/);
  });
});

test("malformed required governance fails closed", () => {
  withFixture((root) => {
    writeText(root, "dev/governance/testing-platform-boundary.yaml", "schema_version: 2\nroots:\n  production:\n    - src/\n");
    const result = runMetrics(root);
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    strictEqual(result.value?.overall, "FAIL", result.output);
    match(result.value?.error ?? "", /BOUNDARY_MANIFEST_INVALID/);
  });
});

test("metric source stays within the frozen PowerShell budget headroom", () => {
  const source = readFileSync(metricsPath, "utf8").replace(/\r\n/g, "\n");
  const logical = source
    .split("\n")
    .filter((line) => line.trim().length > 0 && !line.trimStart().startsWith("#")).length;
  strictEqual(logical <= 389, true, `metrics script uses ${logical} simple logical lines; S03C headroom is 389`);
});

test("semantic production dependency measurement covers accepted forms, multiline syntax, and TS-family/index resolution", () => {
  withFixture((root) => {
    const production = [
      "static.ts",
      "type-only.tsx",
      "reexport.mts",
      "retype.cts",
      "required.ts",
      "dynamic/index.ts",
      "nested/index.mts",
      "js-mapped.ts",
    ];
    for (const relativePath of production) {
      writeText(root, "src/" + relativePath, "export type T = string; export const x = 1;\n");
    }
    writeText(root, "src/fake.ts", "export const x = 1;\n");
    writeText(root, "src/shadowed.ts", "export const x = 1;\n");
    writeText(
      root,
      "test-platform/src/platform-root.ts",
      [
        "import {",
        "  x as staticValue,",
        '} from "../../src/static";',
        "import type {",
        "  T as ProductionType,",
        '} from "../../src/type-only";',
        "export {",
        "  x as reexported,",
        '} from "../../src/reexport";',
        "export type {",
        "  T as Retyped,",
        '} from "../../src/retype";',
        'const required = require("../../src/required");',
        "async function loadDynamic() { return import(",
        '  "../../src/dynamic"',
        "); }",
        'async function nested() { return "prefix " + String(await import("../../src/nested")) + " suffix"; }',
        'void import("../../src/js-mapped.js");',
        'const ordinaryString = "import(\\\"../../src/fake\\\")";',
        'const regex = /require\\(\"..\\/..\\/src\\/fake\"\\)/;',
        'const templateText = "require(\\\"../../src/fake\\\")";',
        'function local(require: (name: string) => unknown) { return require("../../src/shadowed"); }',
        "void staticValue; void required; void loadDynamic; void nested; void ordinaryString; void regex; void templateText; void local;",
        "type Local = ProductionType; void (0 as unknown as Local);",
        "",
      ].join("\n"),
    );
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.productionModulesImportedCount, 8);
    strictEqual(
      value.current.productionModulesImported.join("\n"),
      [
        "src/dynamic/index.ts",
        "src/js-mapped.ts",
        "src/nested/index.mts",
        "src/required.ts",
        "src/reexport.mts",
        "src/retype.cts",
        "src/static.ts",
        "src/type-only.tsx",
      ].join("\n"),
    );
  });
});

test("equivalent multiline dependency formatting preserves the measured dependency footprint", () => {
  withFixture((root) => {
    writeText(root, "src/dependency.ts", "export const x = 1;\n");
    writeText(root, "test-platform/src/platform-root.ts", 'import { x } from "../../src/dependency";\nvoid x;\n');
    const compact = assertPass(runMetrics(root));
    writeText(
      root,
      "test-platform/src/platform-root.ts",
      ["import {", "  x", "} from", '  "../../src/dependency";', "void x;", ""].join("\n"),
    );
    const multiline = assertPass(runMetrics(root));
    strictEqual(multiline.current.productionModulesImportedCount, compact.current.productionModulesImportedCount);
    strictEqual(multiline.current.productionModulesImported.join("\n"), compact.current.productionModulesImported.join("\n"));
  });
});

test("declarative fixture data is excluded while executable TypeScript beneath fixtures counts as framework core", () => {
  withFixture((root) => {
    writeText(root, "test-platform/fixtures/data.json", "{\n  \"note\": \"declarative fixture data\"\n}\n");
    writeText(root, "test-platform/fixtures/helper.ts", lines(3999));
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.frameworkCoreLogicalTsLoc, 4000);
    writeText(root, "test-platform/fixtures/helper.ts", lines(4000));
    assertBudgetFailure(runMetrics(root), "FRAMEWORK_CORE_LOC");
  });
});

test("neutral-named BVP PowerShell cannot evade the script-count budget", () => {
  withFixture((root) => {
    for (let index = 0; index < 5; index += 1) {
      writeText(root, "dev/scripts/Governance" + index + ".ps1", 'Write-Output "test-platform governance"\n');
    }
    assertBudgetFailure(runMetrics(root), "BVP_POWERSHELL_SCRIPT_COUNT");
  });
});

test("unclassifiable dev PowerShell fails closed while the established non-BVP S07 verifier remains excluded", () => {
  withFixture((root) => {
    writeText(root, "dev/scripts/Invoke-PhxCiS07ConsumerVerification.ps1", "Write-Output 'legacy consumer verification'\n");
    const allowed = assertPass(runMetrics(root));
    strictEqual(allowed.current.bvpPowerShellScriptCount, 0);
    writeText(root, "dev/scripts/Unclassified.ps1", "Write-Output 'unknown purpose'\n");
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.current?.classificationErrors?.join("\n") ?? "", /Unclassifiable active dev\/scripts PowerShell/);
  });
});

test("scenario-specific PowerShell with a neutral filename cannot evade the zero-script budget", () => {
  withFixture((root) => {
    writeText(root, "dev/scripts/GovernanceCheck.ps1", "$scenarioId = 'C01'\nWrite-Output \"test-platform $scenarioId\"\n");
    assertBudgetFailure(runMetrics(root), "SCENARIO_SPECIFIC_POWERSHELL");
  });
});

test("unsupported governance schema fails closed", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/governance/testing-platform-boundary.yaml",
      boundaryManifest().replace("schema_version: 2", "schema_version: 3"),
    );
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.error ?? "", /unsupported schema_version/);
  });
});

test("non-authoritative governance status fails closed", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/governance/testing-platform-boundary.yaml",
      boundaryManifest().replace(
        "status: authoritative_frozen_after_bvp_s01_persistence",
        "status: draft",
      ),
    );
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.error ?? "", /is not authoritative/);
  });
});

test("production seam classification recognizes TS-family extension and index forms", () => {
  withFixture(
    (root) => {
      writeText(root, "src/seam.tsx", "export const seam = 1;\n");
      writeText(root, "src/other/index.mts", "export const seam = 2;\n");
      const value = assertPass(runMetrics(root));
      strictEqual(value.current.productionSeamFileCount, 2);
    },
    ["src/seam.tsx", "src/other/index.mts"],
  );
});

test("base/current dependency deltas use identical semantic classification", () => {
  withFixture((root) => {
    runGit(root, ["init"]);
    runGit(root, ["config", "user.email", "bvp@example.invalid"]);
    runGit(root, ["config", "user.name", "BVP Fixture"]);
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "baseline"]);
    const base = runGit(root, ["rev-parse", "HEAD"]);
    writeText(root, "src/main.ts", "export const productionValue = 1;\nexport const added = 2;\n");
    writeText(root, "test-platform/src/platform-root.ts", 'import {\n  added\n} from "../../src/main";\nvoid added;\n');
    const statusBefore = runGit(root, ["status", "--porcelain=v1"]);
    const value = assertPass(runMetrics(root, ["-BaseSha", base]));
    strictEqual(value.delta.productionModulesImportedCount.base, 0);
    strictEqual(value.delta.productionModulesImportedCount.current, 1);
    strictEqual(value.delta.productionModulesImportedCount.delta, 1);
    strictEqual(runGit(root, ["status", "--porcelain=v1"]), statusBefore);
  });
});

test("repeated architecture metrics output is deterministic", () => {
  withFixture((root) => {
    writeText(root, "dev/scripts/Zeta.ps1", "Write-Output 'test-platform zeta'\n");
    writeText(root, "dev/scripts/Alpha.ps1", "Write-Output 'test-platform alpha'\n");
    const first = runMetrics(root);
    const second = runMetrics(root);
    assertPass(first);
    assertPass(second);
    strictEqual(second.output, first.output);
  });
});

test("dependency analysis sees nested executable template imports but ignores inert comments strings regex and template text", () => {
  withFixture((root) => {
    writeText(root, "src/nested.ts", "export const x = 1;\n");
    writeText(root, "src/fake.ts", "export const x = 1;\n");
    const tick = String.fromCharCode(96);
    const interpolation = "$" + "{await import(\\"../../src/nested\\")}";
    writeText(
      root,
      "test-platform/src/platform-root.ts",
      [
        "async function nested() { return " + tick + "prefix " + interpolation + " suffix" + tick + "; }",
        "const inert = " + tick + 'import("../../src/fake") require("../../src/fake")' + tick + ";",
        'const ordinary = "import(\\\"../../src/fake\\\")";',
        'const regex = /require\\(\"..\\/..\\/src\\/fake\"\\)/;',
        '// import { x } from "../../src/fake";',
        '/* require("../../src/fake"); */',
        'function local(require: (name: string) => unknown) { return require("../../src/fake"); }',
        "void nested; void inert; void ordinary; void regex; void local;",
        "",
      ].join("\n"),
    );
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.productionModulesImportedCount, 1);
    strictEqual(value.current.productionModulesImported[0], "src/nested.ts");
  });
});

