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
    "dev/test-results",
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
        name: "brain-google-drive-sync",
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
  delete environment.BRAIN_ARTIFACT_PURPOSE;
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

function expectFixtureArtifactMismatch(result: RunResult): void {
  if (result.error) throw result.error;
  strictEqual(result.status, 1, result.output);
  match(result.output, /SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=main\.js .*Built shipping artifact SHA-256 changed/);
  match(result.output, /SHIPPING_ARTIFACT_IDENTITY_RESULT=FAIL violations=1/);
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

test("F1 retired entrypoints cannot execute or publish standalone BVP validation", () => {
  for (const name of [
    "Invoke-BVP-Battery.ps1",
    "Invoke-BVP-Deterministic-Battery.ps1",
  ]) {
    const source = readFileSync(join(repositoryRoot, "dev", "scripts", name), "utf8");
    const executableStatements = source
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith("#"));
    strictEqual(executableStatements.length, 1, name + " must remain fail-closed");
    match(executableStatements[0], /^throw 'BVP_F1_PHX_CI_REQUIRED:/, name);
    strictEqual(/\b(?:Invoke-RecordedExternal|Start-Process|git\s+(?:add|commit|push)|npm\s+test|node\s+)\b/i.test(source), false, name);
  }
});

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
  match(source, /reportViolations\("DEV_ROOT_STRUCTURE"/);
  match(source, /reportViolations\("SHIPPING_ARTIFACT_IDENTITY"/);
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
    expectFixtureArtifactMismatch(result);
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
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=FAIL/);
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
    expectFixtureArtifactMismatch(result);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=0 metricsExit=0.*changeClass=authorized-governance/,
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
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=1/);
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
      /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=0 metricsExit=1/,
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
      /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=1 shippingArtifactExit=1 guardExit=0 metricsExit=0/,
    );
  });
});

test("PHX-CI structured evidence is an optional canonical dev-root file", () => {
  withFixture((root, baseSha) => {
    writeText(root, "dev/_ca-output.json", '{"status":"PASS"}\n');
    const contextPath = writeContext(root, baseSha);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });
    if (result.error) throw result.error;
    expectFixtureArtifactMismatch(result);
    match(result.output, /DEV_ROOT_STRUCTURE_RESULT=PASS violations=0/);
  });
});

test("unrelated dev-root JSON files remain prohibited", () => {
  withFixture((root, baseSha) => {
    writeText(root, "dev/unapproved.json", "{}\n");
    const contextPath = writeContext(root, baseSha);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });
    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /DEV_ROOT_STRUCTURE_VIOLATION path=dev\/unapproved\.json /);
  });
});


test("F2 fails closed when package.json is missing, malformed, or has an unexpected identity", () => {
  const cases: ReadonlyArray<{
    readonly label: string;
    readonly mutate: (root: string) => void;
    readonly violation: RegExp;
    readonly guardExit: 0 | 1;
  }> = [
    {
      label: "missing",
      guardExit: 1,
      mutate: (root) => rmSync(join(root, "package.json")),
      violation: /SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=package\.json detail=Required BRAIN package manifest is missing\./,
    },
    {
      label: "malformed",
      guardExit: 1,
      mutate: (root) => writeText(root, "package.json", "{ broken json"),
      violation: /SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=package\.json detail=Required BRAIN package manifest is unreadable or invalid JSON\./,
    },
    {
      label: "unexpected-name",
      guardExit: 0,
      mutate: (root) => writeText(root, "package.json", '{"name":"repository-check-fixture"}\n'),
      violation: /SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=package\.json detail=Unexpected package identity; expected brain-google-drive-sync\./,
    },
    {
      label: "non-object-json",
      guardExit: 0,
      mutate: (root) => writeText(root, "package.json", "null\n"),
      violation: /SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=package\.json detail=Unexpected package identity; expected brain-google-drive-sync\./,
    },
  ];
  for (const scenario of cases) {
    withFixture((root) => {
      scenario.mutate(root);
      const result = runRepositoryCheck(root);
      if (result.error) throw result.error;
      strictEqual(result.status, 1, scenario.label + ": " + result.output);
      match(result.output, scenario.violation, scenario.label);
      match(result.output, /SHIPPING_ARTIFACT_IDENTITY_RESULT=FAIL violations=1/, scenario.label);
      match(
        result.output,
        new RegExp("BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=" + scenario.guardExit + " metricsExit=0"),
        scenario.label,
      );
    });
  }
});

test("F2 fails closed when a correctly named package has no shipping artifact", () => {
  withFixture((root) => {
    rmSync(join(root, "main.js"));
    const result = runRepositoryCheck(root);
    if (result.error) throw result.error;
    strictEqual(result.status, 1, result.output);
    match(result.output, /SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=main\.js detail=Required shipping artifact is missing after build\./);
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=0 metricsExit=0/);
  });
});

test("built shipping artifact identity mismatch blocks repository check", () => {
  withFixture((root, baseSha) => {
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
    expectFixtureArtifactMismatch(result);
    match(result.output, /BVP_REPOSITORY_CHECK_CONTEXT unavailable mode=local/);
    match(result.output, /ARCH_GUARD_RESULT=PASS violations=0/);
    match(result.output, /"baseSha": null/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=0 metricsExit=0 context=local changeClass=ordinary/,
    );
  });
});

test("DEC-339 shipping acceptance retains exactly the three pre-existing owner-approved hashes", () => {
  const source = readFileSync(repositoryCheckSourcePath, "utf8");
  match(source, /const approvedProductionMainSha256 = new Set/);
  const start = source.indexOf("const approvedProductionMainSha256 = new Set([");
  const end = source.indexOf("]);", start);
  strictEqual(start >= 0 && end > start, true);
  const hashes = [...source.slice(start, end).matchAll(/"([0-9a-f]{64})"/g)].map(match => match[1]);
  strictEqual(hashes.length, 3);
  strictEqual(new Set(hashes).size, 3);
  strictEqual(hashes[0], "e6bd40f9f780c3940de61669309b2c54732a1968d20739ecfefc1f0a710ec19e");
  strictEqual(hashes[1], "4106faaf25a4d7ba3611e32630571209fcc955f2a360702725f911257e6ade52");
  strictEqual(hashes[2], "acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881");
  match(source, /approvedProductionMainSha256\.has\(actualSha256\)/);
});

test("PHX-CI-scoped authorized-governance development artifact observation retains safety checks without historical hash acceptance", () => {
  withFixture((root, baseSha) => {
    const contextPath = writeContext(root, baseSha, { changedPaths: ["main.js"] });
    const environment = {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "authorized-governance",
      BRAIN_ARTIFACT_PURPOSE: "development",
    };
    const result = runRepositoryCheck(root, environment);
    if (result.error) throw result.error;
    strictEqual(result.status, 0, result.output);
    match(result.output, /SHIPPING_ARTIFACT_MODE=development-observation/);
    match(result.output, /SHIPPING_ARTIFACT_SHA256=[0-9a-f]{64}/);
    match(result.output, /SHIPPING_ARTIFACT_IDENTITY_RESULT=PASS violations=0/);

    rmSync(join(root, "main.js"));
    const missing = runRepositoryCheck(root, environment);
    if (missing.error) throw missing.error;
    strictEqual(missing.status, 1, missing.output);
    match(missing.output, /Required shipping artifact is missing/);

    writeText(root, "main.js", 'console.log("development artifact");\n');
    writeText(root, "package.json", '{"name":"wrong-package"}\n');
    const invalidPackage = runRepositoryCheck(root, environment);
    if (invalidPackage.error) throw invalidPackage.error;
    strictEqual(invalidPackage.status, 1, invalidPackage.output);
    match(invalidPackage.output, /Unexpected package identity/);
  });
});

test("promotion exact-hash gate remains fail-closed; context-free development mode is rejected", () => {
  withFixture((root, baseSha) => {
    const local = runRepositoryCheck(root, {
      BRAIN_ARTIFACT_PURPOSE: "development",
      BVP_CHANGE_CLASS: "authorized-governance",
    });
    if (local.error) throw local.error;
    strictEqual(local.status, 2, local.output);
    match(local.output, /Development artifact observation requires PHX-CI verification context/);

    const contextPath = writeContext(root, baseSha, { changedPaths: ["main.js"] });
    const ordinaryDevelopment = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "ordinary",
      BRAIN_ARTIFACT_PURPOSE: "development",
    });
    if (ordinaryDevelopment.error) throw ordinaryDevelopment.error;
    strictEqual(ordinaryDevelopment.status, 0, ordinaryDevelopment.output);
    match(ordinaryDevelopment.output, /SHIPPING_ARTIFACT_MODE=development-observation/);
    match(ordinaryDevelopment.output, /BVP_REPOSITORY_CHECK_RESULT=PASS .*changeClass=ordinary/);

    const frozenPathContext = writeContext(root, baseSha, {
      changedPaths: ["test-platform/src/repository-check.ts"],
    });
    const frozenOrdinary = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: frozenPathContext,
      BVP_CHANGE_CLASS: "ordinary",
      BRAIN_ARTIFACT_PURPOSE: "development",
    });
    if (frozenOrdinary.error) throw frozenOrdinary.error;
    strictEqual(frozenOrdinary.status, 1, frozenOrdinary.output);
    match(frozenOrdinary.output, /FROZEN_SURFACE_CHANGED/);

    writeContext(root, baseSha, { changedPaths: ["main.js"] });
    const promotion = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "ordinary",
      BRAIN_ARTIFACT_PURPOSE: "promotion",
    });
    if (promotion.error) throw promotion.error;
    strictEqual(promotion.status, 1, promotion.output);
    match(promotion.output, /SHIPPING_ARTIFACT_MODE=approved-artifact-enforcement/);
    match(promotion.output, /SHIPPING_ARTIFACT_IDENTITY_RESULT=FAIL violations=1/);
    match(promotion.output, /BVP_REPOSITORY_CHECK_RESULT=FAIL devRootExit=0 shippingArtifactExit=1 guardExit=0 metricsExit=0/);
  });
});

test("DEC-343 ordinary development still rejects missing artifact and wrong package", () => {
  withFixture((root, baseSha) => {
    const contextPath = writeContext(root, baseSha, { changedPaths: ["src/main.ts"] });
    const environment = {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "ordinary",
      BRAIN_ARTIFACT_PURPOSE: "development",
    };
    rmSync(join(root, "main.js"));
    const missing = runRepositoryCheck(root, environment);
    if (missing.error) throw missing.error;
    strictEqual(missing.status, 1, missing.output);
    match(missing.output, /Required shipping artifact is missing/);

    writeText(root, "main.js", 'console.log("ordinary development artifact");\n');
    writeText(root, "package.json", '{"name":"wrong-package"}\n');
    const invalidPackage = runRepositoryCheck(root, environment);
    if (invalidPackage.error) throw invalidPackage.error;
    strictEqual(invalidPackage.status, 1, invalidPackage.output);
    match(invalidPackage.output, /Unexpected package identity/);
  });
});
