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
