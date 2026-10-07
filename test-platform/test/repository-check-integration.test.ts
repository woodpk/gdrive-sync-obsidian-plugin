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

const repositoryRoot = resolve(__dirname, "../../../..");
const repositoryCheckSourcePath = join(
  repositoryRoot,
  "test-platform",
  "src",
  "repository-check.ts",
);
const repositoryCheckExecutablePath = join(
  repositoryRoot,
  ".test-build",
  "bvp",
  "test-platform",
  "src",
  "repository-check.js",
);

function writeText(root: string, relativePath: string, content: string): void {
  const fullPath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function boundaryManifest(): string {
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

function runGit(root: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  strictEqual(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return (result.stdout ?? "").trim();
}

function createFixture(): { readonly root: string; readonly baseSha: string } {
  const root = mkdtempSync(join(tmpdir(), "brain bvp repository check "));
  for (const directory of [
    "dev/authority",
    "dev/planning",
    "dev/research",
    "dev/state",
    "dev/reviews",
    "dev/scripts",
    "dev/Test-Results",
    "dev/scratch",
  ]) {
    mkdirSync(join(root, ...directory.split("/")), { recursive: true });
  }
  writeText(root, "dev/README.md", "# Development\n");
  writeText(root, "dev/_ca-output.md", "STATUS: TEST FIXTURE\n");
  writeText(
    root,
    "dev/authority/governance/locks/testing-platform-boundary.yaml",
    boundaryManifest(),
  );
  writeText(
    root,
    "dev/planning/01-target-system/bvp-subsystem-specification.md",
    "Historical archive material is non-authoritative.\n",
  );
  writeText(root, "src/main.ts", "export const productionValue = 1;\n");
  writeText(
    root,
    "test-platform/src/platform-root.ts",
    "export const platformValue = 1;\n",
  );
  writeText(
    root,
    "test-platform/test/placeholder.test.ts",
    "export const placeholder = true;\n",
  );
  writeText(
    root,
    "package.json",
    JSON.stringify(
      {
        name: "repository-check-fixture",
        private: true,
        main: "main.js",
        scripts: { build: "node scripts/build.mjs" },
      },
      null,
      2,
    ) + "\n",
  );
  writeText(
    root,
    "scripts/build.mjs",
    'import { build } from "esbuild";\nawait build({ entryPoints: ["src/main.ts"], outfile: "main.js" });\n',
  );
  writeText(
    root,
    "tsconfig.json",
    JSON.stringify(
      { compilerOptions: { target: "ES2022" }, include: ["src/**/*.ts"] },
      null,
      2,
    ) + "\n",
  );
  writeText(root, "main.js", 'console.log("production");\n');

  runGit(root, ["init"]);
  runGit(root, ["config", "user.email", "bvp@example.invalid"]);
  runGit(root, ["config", "user.name", "BVP Fixture"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "baseline"]);
  return { root, baseSha: runGit(root, ["rev-parse", "HEAD"]) };
}

function writeContext(
  root: string,
  baseSha: string,
  overrides: Partial<{
    schemaVersion: number;
    targetHead: string;
    baseSha: string;
    changedPaths: unknown;
  }> = {},
): string {
  const path = join(root, "verification context.json");
  const model = {
    schemaVersion: 1,
    targetHead: baseSha,
    baseSha,
    changedPaths: ["src/main.ts", "folder with spaces/file.md"],
    ...overrides,
  };
  writeFileSync(path, JSON.stringify(model), "utf8");
  return path;
}

interface RunResult {
  readonly status: number | null;
  readonly output: string;
  readonly error?: Error;
}

function runRepositoryCheck(
  root: string,
  extraEnvironment: Readonly<Record<string, string>> = {},
): RunResult {
  const environment: NodeJS.ProcessEnv = { ...process.env };
  delete environment.PHX_VERIFICATION_CONTEXT_PATH;
  delete environment.BVP_CHANGE_CLASS;
  delete environment.BVP_FUNCTIONAL_TEST_RESULT;
  Object.assign(environment, extraEnvironment);

  const result = spawnSync(process.execPath, [repositoryCheckExecutablePath], {
    cwd: root,
    env: environment,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    error: result.error,
  };
}

function withFixture(
  run: (root: string, baseSha: string) => void,
): void {
  const fixture = createFixture();
  try {
    run(fixture.root, fixture.baseSha);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

test("PHX consumer configuration selects the frozen BVP repository-check command", () => {
  const projectConfig = JSON.parse(
    readFileSync(join(repositoryRoot, "phx-ci.json"), "utf8"),
  );
  const taskIntegration = readFileSync(
    join(repositoryRoot, "Taskfile.phx-ci.yml"),
    "utf8",
  );
  const packageModel = JSON.parse(
    readFileSync(join(repositoryRoot, "package.json"), "utf8"),
  );
  const expectedCommand =
    "node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/test-platform/src/repository-check.js";

  strictEqual(projectConfig.commands?.repositoryCheck, expectedCommand);
  match(
    taskIntegration,
    /PHX_REPOSITORY_CHECK_COMMAND: 'node node_modules\/typescript\/bin\/tsc -p test-platform\/tsconfig\.json && node \.test-build\/bvp\/test-platform\/src\/repository-check\.js'/,
  );
  strictEqual(
    packageModel.scripts?.check,
    "npm run typecheck && npm test && npm run build",
  );
});

test("repository-check consumes PHX context and TypeScript governance without PowerShell validation", () => {
  const source = readFileSync(repositoryCheckSourcePath, "utf8");
  match(source, /PHX_VERIFICATION_CONTEXT_PATH/);
  match(source, /runArchitectureGuard/);
  match(source, /runArchitectureMetrics/);
  match(source, /DEV_ROOT_STRUCTURE_RESULT/);
  match(source, /SHIPPING_ARTIFACT_IDENTITY_RESULT/);
  strictEqual(/\.ps1|pwsh|powershell|spawnSync/.test(source), false);
  strictEqual(
    /\bgit\s+-C\b|merge-base|diff --name-only|rev-parse/.test(source),
    false,
  );
});

test("authoritative context supplies exact base and changed-path count", () => {
  withFixture((root, baseSha) => {
    const contextPath = writeContext(root, baseSha);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "ordinary",
    });
    if (result.error) throw result.error;
    strictEqual(result.status, 0, result.output);
    match(
      result.output,
      new RegExp(
        "BVP_REPOSITORY_CHECK_CONTEXT schema=1 target=" +
          baseSha +
          " base=" +
          baseSha +
          " changedPaths=2",
      ),
    );
    match(result.output, /DEV_ROOT_STRUCTURE_RESULT=PASS violations=0/);
    match(result.output, /ARCH_GUARD_RESULT=PASS violations=0/);
    match(result.output, /"baseSha":/);
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=PASS/);
  });
});

test("authorized governance classification permits an explicitly frozen-surface change", () => {
  withFixture((root, baseSha) => {
    const contextPath = writeContext(root, baseSha, {
      changedPaths: [
        "dev/authority/governance/locks/testing-platform-boundary.yaml",
      ],
    });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "authorized-governance",
    });
    if (result.error) throw result.error;
    strictEqual(result.status, 0, result.output);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0.*changeClass=authorized-governance/,
    );
  });
});

test("architecture guard failure blocks repository check", () => {
  withFixture((root, baseSha) => {
    writeText(
      root,
      "src/bad-import.ts",
      'import { platformValue } from "../test-platform/src/platform-root";\nvoid platformValue;\n',
    );
    const contextPath = writeContext(root, baseSha, {
      changedPaths: ["src/bad-import.ts"],
    });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /rule=PRODUCTION_IMPORTS_TEST_PLATFORM/);
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=0 guardExit=1/);
  });
});

test("hard-budget metrics failure blocks repository check while guard still passes", () => {
  withFixture((root, baseSha) => {
    writeText(
      root,
      "test-platform/scenarios/oversized.ts",
      [
        'import { defineScenario } from "../src/scenario/scenario-contract";',
        "export const scenario = defineScenario({",
        ...Array.from({ length: 198 }, (_, index) => `p${index}: ${index},`),
        "});",
        "",
      ].join("\n"),
    );
    const contextPath = writeContext(root, baseSha, {
      changedPaths: ["test-platform/scenarios/oversized.ts"],
    });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /ARCH_GUARD_RESULT=PASS violations=0/);
    match(result.output, /"id": "SCENARIO_LOC:oversized"/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=1/,
    );
  });
});

test("noncanonical active dev top-level entries block repository check", () => {
  withFixture((root, baseSha) => {
    writeText(root, "dev/archive/legacy.md", "legacy\n");
    const contextPath = writeContext(root, baseSha, {
      changedPaths: ["dev/archive/legacy.md"],
    });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "authorized-governance",
    });
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(
      result.output,
      /DEV_ROOT_STRUCTURE_VIOLATION path=dev\/archive .*Noncanonical active dev\/ top-level entry/,
    );
    match(result.output, /DEV_ROOT_STRUCTURE_RESULT=FAIL violations=1/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=1 shippingArtifactExit=0 guardExit=0 metricsExit=0/,
    );
  });
});

test("built shipping artifact identity mismatch blocks repository check", () => {
  withFixture((root, baseSha) => {
    const packageModel = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    packageModel.name = "brain-google-drive-sync";
    writeText(root, "package.json", JSON.stringify(packageModel, null, 2) + "\n");
    writeText(root, "main.js", 'console.log("changed artifact");\n');
    const contextPath = writeContext(root, baseSha, {
      changedPaths: ["main.js"],
    });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "authorized-governance",
    });
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(
      result.output,
      /SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=main\.js .*Built shipping artifact SHA-256 changed/,
    );
    match(
      result.output,
      /SHIPPING_ARTIFACT_IDENTITY_RESULT=FAIL violations=1/,
    );
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=0 metricsExit=0/,
    );
  });
});

test("unrelated functional PASS cannot override an architecture failure", () => {
  withFixture((root, baseSha) => {
    writeText(
      root,
      "src/bad-import.ts",
      'import { platformValue } from "../test-platform/src/platform-root";\nvoid platformValue;\n',
    );
    const contextPath = writeContext(root, baseSha, {
      changedPaths: ["src/bad-import.ts"],
    });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_FUNCTIONAL_TEST_RESULT: "PASS",
    });
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=FAIL/);
  });
});

test("malformed authoritative context fails closed before governance execution", () => {
  withFixture((root, baseSha) => {
    const contextPath = writeContext(root, baseSha, { schemaVersion: 2 });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_ERROR unsupported PHX-CI verification-context schema version: 2/,
    );
    strictEqual(/ARCH_GUARD_RESULT=/.test(result.output), false);
  });
});

test("routine local mode runs both repository-controlled checks without fabricated coordinates", () => {
  withFixture((root) => {
    const result = runRepositoryCheck(root);
    if (result.error) throw result.error;
    strictEqual(result.status, 0, result.output);
    match(result.output, /BVP_REPOSITORY_CHECK_CONTEXT unavailable mode=local/);
    match(result.output, /ARCH_GUARD_RESULT=PASS violations=0/);
    match(result.output, /"baseSha": null/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0 context=local changeClass=ordinary/,
    );
  });
});
