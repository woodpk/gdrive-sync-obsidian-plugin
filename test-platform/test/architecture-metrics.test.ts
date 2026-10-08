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
import { runArchitectureMetrics } from "../src/architecture-governance";

const repositoryRoot = resolve(__dirname, "../../../..");
function writeText(root: string, relativePath: string, content: string): void {
  const fullPath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function lines(count: number, prefix = "export const value"): string {
  return Array.from({ length: count }, (_, index) => `${prefix}${index} = ${index};`).join("\n") + "\n";
}
function scenarioLines(count: number): string {
  if (count < 3) throw new Error("scenario fixture requires at least three logical lines");
  return ['import { defineScenario } from "../src/scenario/scenario-contract";','export const scenario = defineScenario({',...Array.from({length:count-3},(_,i)=>`p${i}: ${i},`),'});'].join("\n")+"\n";
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
    "  archive: archive/",
    "import_rules:",
    "  production_must_not_import:",
    "    - test-platform/",
    "  test_platform_may_import_production_only_through_allowlist: true",
    "  scenario_specific_production_code_allowed: false",
    "shipping_rules:",
    "  production_bundle_must_exclude:",
    "    - test-platform/",
    "  production_validation_ui_allowed: false",
    "  validation_device_agent_must_be_separate_artifact_or_entrypoint: true",
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
    "supervisor_owned_frozen_surfaces:",
    "  - dev/authority/governance/locks/testing-platform-boundary.yaml",
    "  - test-platform/src/architecture-governance.ts",
    "  - test-platform/src/repository-check.ts",
    "  - phx-ci.json",
    "  - Taskfile.phx-ci.yml",
    "  - bounded PHX-CI include block in Taskfile.yml",
    "archive_policy:",
    "  archive_is_non_authoritative: true",
    "  exclude_from_normal_grounding: true",
    "  active_docs_must_not_depend_on_archived_prompts: true",
    "",
  ].join("\n");
}

function createFixture(approvedImports: readonly string[] = []): string {
  const root = mkdtempSync(join(tmpdir(), "brain-bvp-metrics-"));
  writeText(root, "dev/authority/governance/locks/testing-platform-boundary.yaml", boundaryManifest(approvedImports));
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
  let baseSha: string | undefined;
  for (let index = 0; index < extraArgs.length; index += 2) {
    if (extraArgs[index] === "-BaseSha") baseSha = extraArgs[index + 1];
  }
  const result = runArchitectureMetrics({ repoRoot: root, baseSha });
  return {
    status: result.exitCode,
    output: result.output,
    value: result.value,
  };
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
  const failedBudgets =
    result.value?.budgets
      ?.filter((entry: any) => entry.state === "FAIL")
      .map((entry: any) => entry.id)
      .sort() ?? [];
  strictEqual(failedBudgets.join("\n"), id, result.output);
  strictEqual(result.value?.current?.classificationErrors?.length ?? 0, 0, result.output);
  return result.value;
}

function runGit(root: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  strictEqual(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return (result.stdout ?? "").trim();
}

test("architecture metrics pass the actual BRAIN repository baseline", () => {
  const value = assertPass(runMetrics(repositoryRoot));
  strictEqual(value.current.productionSeamFileCount, 3);
  strictEqual(value.current.productionSeamLogicalLoc > 0, true);
  strictEqual(value.current.productionSeamLogicalLoc <= 350, true);
  strictEqual(value.current.liveDeviceAgentRelayLogicalTsLoc <= 750, true);
  const scenarios = value.current.scenarios ?? [];
  strictEqual(value.current.scenarioCount, scenarios.length);
  strictEqual(
    value.current.scenarioDefinitionLogicalLocTotal,
    scenarios.reduce((sum: number, scenario: any) => sum + Number(scenario.logicalLoc ?? 0), 0),
  );
  strictEqual(scenarios.every((scenario: any) => Number(scenario.logicalLoc) <= 200), true);
  for (const path of [
    "test-platform/scenarios/multi-device-conflict.ts",
    "test-platform/scenarios/ordinary-one-sided-sync.ts",
  ]) {
    const scenario = scenarios.find((candidate: any) => candidate.path === path);
    strictEqual(Boolean(scenario), true);
    strictEqual(Number(scenario.logicalLoc) <= 120, true);
  }
  strictEqual(
    value.current.platformCoreRuntimeModuleCount,
    value.current.frameworkCoreFiles.length,
  );
  strictEqual(
    value.current.frameworkCoreFiles.includes("test-platform/src/platform-root.ts"),
    true,
  );
  strictEqual(
    value.current.frameworkCoreFiles.includes("test-platform/src/repository-check.ts"),
    true,
  );
  strictEqual(
    value.current.frameworkCoreFiles.includes(
      "test-platform/src/virtual-world/in-memory-local-vault.ts",
    ),
    true,
  );
  strictEqual(value.current.bvpPowerShellScriptCount, 0);
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
        'Write-Output "test-platform governance"',
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
    writeText(root, "test-platform/scenarios/C01.ts", scenarioLines(121));
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.scenarios[0].logicalLoc, 121);
    strictEqual(value.current.scenarioDefinitionLogicalLocTotal, 121);
    strictEqual(value.current.scenarios[0].targetExceeded, true);
    strictEqual(value.current.scenarios[0].hardMaxExceeded, false);
    writeText(root, "test-platform/scenarios/C02.ts", scenarioLines(3));
    const combined = assertPass(runMetrics(root));
    strictEqual(combined.current.scenarioDefinitionLogicalLocTotal, 124);
  });
});

test("executable helper under scenario root consumes framework core budget instead of hiding as a scenario", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/helper.ts", lines(4000));
    assertBudgetFailure(runMetrics(root), "FRAMEWORK_CORE_LOC");
  });
});

test("nested executable syntax under defineScenario is charged to framework core", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/iife.ts", 'import { defineScenario } from "../src/scenario/scenario-contract";\nexport const scenario = defineScenario({ id: "iife", description: (() => "private")() });\n');
    writeText(root, "test-platform/scenarios/call.ts", 'import { defineScenario } from "../src/scenario/scenario-contract";\nexport const scenario = defineScenario({ id: "call", description: String("private") });\n');
    writeText(root, "test-platform/scenarios/spread.ts", 'import { defineScenario } from "../src/scenario/scenario-contract";\nexport const scenario = defineScenario({ ...{ id: "spread" } });\n');
    const value = assertPass(runMetrics(root));
    for (const name of ["iife.ts","call.ts","spread.ts"]) strictEqual(value.current.frameworkCoreFiles.includes("test-platform/scenarios/"+name), true);
    strictEqual(value.current.scenarios.some((value:any)=>["iife","call","spread"].includes(value.scenario)), false);
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
    writeText(root, "test-platform/scenarios/C01.ts", scenarioLines(201));
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
      writeText(root, `dev/scripts/Invoke-BvpFixture${index}.ps1`, `Write-Output "test-platform governance ${index}"\n`);
    }
    assertBudgetFailure(runMetrics(root), "BVP_POWERSHELL_SCRIPT_COUNT");
  });
});

test("BVP PowerShell logical LOC over 1500 fails", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/scripts/Invoke-BvpFixture.ps1",
      Array.from({ length: 1501 }, (_, index) => `Write-Output "test-platform governance ${index}"`).join("\n") + "\n",
    );
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
    rmSync(join(root, "dev", "authority", "governance", "locks", "testing-platform-boundary.yaml"));
    const result = runMetrics(root);
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    strictEqual(result.value?.overall, "FAIL", result.output);
    match(result.value?.error ?? "", /BOUNDARY_MANIFEST_MISSING/);
  });
});

test("malformed required governance fails closed", () => {
  withFixture((root) => {
    writeText(root, "dev/authority/governance/locks/testing-platform-boundary.yaml", "schema_version: 2\nroots:\n  production:\n    - src/\n");
    const result = runMetrics(root);
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    strictEqual(result.value?.overall, "FAIL", result.output);
    match(result.value?.error ?? "", /BOUNDARY_MANIFEST_INVALID/);
  });
});

test("architecture metrics are implemented in the PHX-CI-consumed TypeScript governance surface", () => {
  const source = readFileSync(
    join(repositoryRoot, "test-platform", "src", "architecture-governance.ts"),
    "utf8",
  );
  match(source, /export function runArchitectureMetrics/);
  strictEqual(/(?:pwsh|powershell).*Get-TestingArchitectureMetrics/i.test(source), false);
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
        "src/reexport.mts",
        "src/required.ts",
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

test("unclassifiable active dev PowerShell fails closed", () => {
  withFixture((root) => {
    writeText(root, "dev/scripts/Unclassified.ps1", "Write-Output 'unknown purpose'\n");
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.current?.classificationErrors?.join("\n") ?? "", /Unclassifiable active dev\/scripts PowerShell/);
  });
});

test("historical base snapshots ignore non-BVP engineering PowerShell without filename exceptions", () => {
  withFixture((root) => {
    writeText(root, "dev/scripts/LegacyEngineeringHelper.ps1", "Write-Output 'legacy engineering helper'\n");
    runGit(root, ["init"]);
    runGit(root, ["config", "user.email", "bvp@example.invalid"]);
    runGit(root, ["config", "user.name", "BVP Fixture"]);
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "historical baseline"]);
    const base = runGit(root, ["rev-parse", "HEAD"]);
    rmSync(join(root, "dev", "scripts", "LegacyEngineeringHelper.ps1"));

    const value = assertPass(runMetrics(root, ["-BaseSha", base]));
    strictEqual(value.base.classificationErrors.length, 0);
    strictEqual(value.base.bvpPowerShellScriptCount, 0);
    strictEqual(value.current.bvpPowerShellScriptCount, 0);
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
      "dev/authority/governance/locks/testing-platform-boundary.yaml",
      boundaryManifest().replace("schema_version: 2", "schema_version: 3"),
    );
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.error ?? "", /Unsupported schema_version/);
  });
});

test("non-authoritative governance status fails closed", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/authority/governance/locks/testing-platform-boundary.yaml",
      boundaryManifest().replace(
        "status: authoritative_frozen_after_bvp_s01_persistence",
        "status: draft",
      ),
    );
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.error ?? "", /does not establish authoritative boundary policy/);
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

test("base snapshot uses its own approved seam policy when current governance adds a seam", () => {
  withFixture((root) => {
    writeText(root, "src/seam.ts", "export const seam = 1;\n");
    writeText(
      root,
      "dev/authority/governance/locks/testing-platform-boundary.yaml",
      boundaryManifest(["src/seam.ts"]),
    );
    runGit(root, ["init"]);
    runGit(root, ["config", "user.email", "bvp@example.invalid"]);
    runGit(root, ["config", "user.name", "BVP Fixture"]);
    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "baseline"]);
    const base = runGit(root, ["rev-parse", "HEAD"]);

    writeText(root, "src/new-seam.ts", "export const newSeam = 2;\n");
    writeText(
      root,
      "dev/authority/governance/locks/testing-platform-boundary.yaml",
      boundaryManifest(["src/seam.ts", "src/new-seam.ts"]),
    );

    const value = assertPass(runMetrics(root, ["-BaseSha", base]));
    strictEqual(value.base.productionSeamFileCount, 1);
    strictEqual(value.current.productionSeamFileCount, 2);
    strictEqual(value.delta.productionSeamFileCount.delta, 1);
    strictEqual(value.base.classificationErrors.length, 0);
    strictEqual(value.current.classificationErrors.length, 0);
  });
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
    const interpolation = '${await import("../../src/nested")}';
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

test("TypeScript comment delimiters inside ordinary strings cannot suppress executable logical LOC", () => {
  withFixture((root) => {
    writeText(
      root,
      "test-platform/src/platform-root.ts",
      [
        'export const open = "/*";',
        "export const afterOpen = 1;",
        'export const close = "*/";',
        "export const afterClose = 2;",
        "/* true block comment",
        "still a true block comment */",
        "",
        "// comment only",
        "export const afterComment = 3; // inline comment",
        "",
      ].join("\n"),
    );
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.frameworkCoreLogicalTsLoc, 5);
  });
});

test("PowerShell comment delimiters inside ordinary strings cannot suppress executable logical LOC", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/scripts/NeutralGovernance.ps1",
      [
        'Write-Output "test-platform <#"',
        "Write-Output 2",
        'Write-Output "#>"',
        "<# true block comment",
        "still a true block comment #>",
        "",
        "# comment only",
        "Write-Output 3 # inline comment",
        "",
      ].join("\n"),
    );
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.bvpPowerShellScriptCount, 1);
    strictEqual(value.current.bvpPowerShellLogicalLoc, 4);
  });
});

test("duplicate S03C hard-budget authority fails closed", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/authority/governance/locks/testing-platform-boundary.yaml",
      boundaryManifest().replace(
        "  bvp_powershell_scripts_max: 4",
        "  bvp_powershell_scripts_max: 4\n  bvp_powershell_scripts_max: 400",
      ),
    );
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.error ?? "", /BOUNDARY_MANIFEST_INVALID: Manifest key 'complexity_budgets\.bvp_powershell_scripts_max' must appear exactly once as a scalar/);
  });
});

test("duplicate S03C root authority fails closed", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/authority/governance/locks/testing-platform-boundary.yaml",
      boundaryManifest().replace(
        "  test_platform: test-platform/",
        "  test_platform: test-platform/\n  test_platform: permissive-platform/",
      ),
    );
    const result = runMetrics(root);
    notStrictEqual(result.status, 0, result.output);
    match(result.value?.error ?? "", /BOUNDARY_MANIFEST_INVALID: Manifest key 'roots\.test_platform' must appear exactly once as a scalar/);
  });
});

test("scenario-specific BVP PowerShell cannot evade the zero budget without scenarioId or scenarioName variables", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/scripts/NeutralControl.ps1",
      [
        "$target = 'C01'",
        "Write-Output \"test-platform $target control\"",
        "",
      ].join("\n"),
    );
    assertBudgetFailure(runMetrics(root), "SCENARIO_SPECIFIC_POWERSHELL");
  });
});

test("generic neutral BVP governance PowerShell is not falsely scenario-specific", () => {
  withFixture((root) => {
    writeText(root, "dev/scripts/NeutralGovernance.ps1", "Write-Output 'test-platform repository governance'\n");
    const value = assertPass(runMetrics(root));
    strictEqual(value.current.bvpPowerShellScriptCount, 1);
    strictEqual(value.current.scenarioSpecificPowerShellCount, 0);
  });
});