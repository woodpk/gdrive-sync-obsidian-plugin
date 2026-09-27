import { match, notStrictEqual, strictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const repositoryRoot = resolve(__dirname, "../../..");
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
  "src",
  "repository-check.js",
);

function writeText(root: string, relativePath: string, content: string): void {
  const fullPath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function createFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "brain bvp repository check "));

  writeText(
    root,
    "dev/scripts/Test-TestingArchitectureGuard.ps1",
    [
      "[CmdletBinding()]",
      "param(",
      "    [string]$RepoRoot,",
      "    [string[]]$ChangedPath = @(),",
      "    [string]$ChangeClass = 'ordinary'",
      ")",
      "Write-Output ('STUB_GUARD_REPO=' + $RepoRoot)",
      "Write-Output ('STUB_GUARD_CHANGE_CLASS=' + $ChangeClass)",
      "Write-Output ('STUB_GUARD_CHANGED_COUNT=' + @($ChangedPath).Count)",
      "foreach ($item in @($ChangedPath)) { Write-Output ('STUB_GUARD_CHANGED=' + $item) }",
      "if ($env:BVP_TEST_GUARD_FAIL -eq '1') { exit 17 }",
      "exit 0",
      "",
    ].join("\n"),
  );

  writeText(
    root,
    "dev/scripts/Get-TestingArchitectureMetrics.ps1",
    [
      "[CmdletBinding()]",
      "param(",
      "    [string]$RepoRoot,",
      "    [string]$BaseSha",
      ")",
      "Write-Output ('STUB_METRICS_REPO=' + $RepoRoot)",
      "Write-Output ('STUB_METRICS_BASE=' + $(if ([string]::IsNullOrWhiteSpace($BaseSha)) { '<none>' } else { $BaseSha }))",
      "if ($env:BVP_TEST_METRICS_FAIL -eq '1') { exit 19 }",
      "exit 0",
      "",
    ].join("\n"),
  );

  return root;
}

function writeContext(
  root: string,
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
    targetHead: "1".repeat(40),
    baseSha: "2".repeat(40),
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
  delete environment.BVP_TEST_GUARD_FAIL;
  delete environment.BVP_TEST_METRICS_FAIL;
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

function withFixture(run: (root: string) => void): void {
  const root = createFixture();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
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
    "node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/src/repository-check.js";

  strictEqual(projectConfig.commands?.repositoryCheck, expectedCommand);
  match(
    taskIntegration,
    /PHX_REPOSITORY_CHECK_COMMAND: 'node node_modules\/typescript\/bin\/tsc -p test-platform\/tsconfig\.json && node \.test-build\/bvp\/src\/repository-check\.js'/,
  );
  strictEqual(
    packageModel.scripts?.check,
    "npm run typecheck && npm test && npm run build",
    "ordinary production check command must remain unchanged",
  );
  strictEqual(
    packageModel.scripts?.["test:bvp-repository-check"],
    "tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test/repository-check-integration.test.js",
  );
});

test("repository-check source consumes PHX context without independent Git resolution", () => {
  const source = readFileSync(repositoryCheckSourcePath, "utf8");
  match(source, /PHX_VERIFICATION_CONTEXT_PATH/);
  match(source, /Test-TestingArchitectureGuard\.ps1/);
  match(source, /Get-TestingArchitectureMetrics\.ps1/);
  strictEqual(
    /spawnSync\(\s*["']git["']|\bgit\s+-C\b|merge-base|diff --name-only|rev-parse/.test(
      source,
    ),
    false,
    "repository check must not resolve competing Git coordinates",
  );
});

test("authoritative context forwards exact base and changed paths to both accepted checks", () => {
  withFixture((root) => {
    const contextPath = writeContext(root);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "ordinary",
    });

    if (result.error) throw result.error;
    strictEqual(result.status, 0, result.output);
    match(result.output, /BVP_REPOSITORY_CHECK_CONTEXT schema=1 target=1{40} base=2{40} changedPaths=2/);
    match(result.output, /STUB_GUARD_CHANGE_CLASS=ordinary/);
    match(result.output, /STUB_GUARD_CHANGED_COUNT=2/);
    match(result.output, /STUB_GUARD_CHANGED=src\/main\.ts/);
    match(result.output, /STUB_GUARD_CHANGED=folder with spaces\/file\.md/);
    match(result.output, /STUB_METRICS_BASE=2{40}/);
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=PASS/);
  });
});

test("authorized governance classification is explicit and forwarded unchanged", () => {
  withFixture((root) => {
    const contextPath = writeContext(root, {
      changedPaths: ["dev/governance/testing-platform-boundary.yaml"],
    });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_CHANGE_CLASS: "authorized-governance",
    });

    if (result.error) throw result.error;
    strictEqual(result.status, 0, result.output);
    match(result.output, /STUB_GUARD_CHANGE_CLASS=authorized-governance/);
    match(
      result.output,
      /STUB_GUARD_CHANGED=dev\/governance\/testing-platform-boundary\.yaml/,
    );
  });
});

test("guard failure blocks repository check while metrics still executes", () => {
  withFixture((root) => {
    const contextPath = writeContext(root);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_TEST_GUARD_FAIL: "1",
    });

    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /STUB_GUARD_/);
    match(result.output, /STUB_METRICS_BASE=2{40}/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL guardExit=17 metricsExit=0/,
    );
  });
});

test("hard-budget metrics failure blocks repository check while guard still executes", () => {
  withFixture((root) => {
    const contextPath = writeContext(root);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_TEST_METRICS_FAIL: "1",
    });

    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /STUB_GUARD_/);
    match(result.output, /STUB_METRICS_/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL guardExit=0 metricsExit=19/,
    );
  });
});

test("unrelated functional PASS cannot override an architecture failure", () => {
  withFixture((root) => {
    const contextPath = writeContext(root);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
      BVP_TEST_GUARD_FAIL: "1",
      BVP_FUNCTIONAL_TEST_RESULT: "PASS",
    });

    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /BVP_REPOSITORY_CHECK_RESULT=FAIL/);
  });
});

test("malformed authoritative context fails closed", () => {
  withFixture((root) => {
    const contextPath = writeContext(root, { schemaVersion: 2 });
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });

    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_ERROR unsupported PHX-CI verification-context schema version: 2/,
    );
    strictEqual(/STUB_GUARD_/.test(result.output), false, result.output);
  });
});

test("routine local mode runs both checks without fabricated base or changed paths", () => {
  withFixture((root) => {
    const result = runRepositoryCheck(root);

    if (result.error) throw result.error;
    strictEqual(result.status, 0, result.output);
    match(result.output, /BVP_REPOSITORY_CHECK_CONTEXT unavailable mode=local/);
    match(result.output, /STUB_GUARD_CHANGED_COUNT=0/);
    match(result.output, /STUB_METRICS_BASE=<none>/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=PASS guardExit=0 metricsExit=0 context=local changeClass=ordinary/,
    );
  });
});

test("missing required guard script fails instead of skipping while metrics still runs", () => {
  withFixture((root) => {
    unlinkSync(
      join(root, "dev", "scripts", "Test-TestingArchitectureGuard.ps1"),
    );
    const contextPath = writeContext(root);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });

    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_ERROR stage=architecture-guard detail=required script is missing/,
    );
    match(result.output, /STUB_METRICS_BASE=2{40}/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL guardExit=2 metricsExit=0/,
    );
  });
});

test("missing required metrics script fails instead of skipping while guard still runs", () => {
  withFixture((root) => {
    unlinkSync(
      join(root, "dev", "scripts", "Get-TestingArchitectureMetrics.ps1"),
    );
    const contextPath = writeContext(root);
    const result = runRepositoryCheck(root, {
      PHX_VERIFICATION_CONTEXT_PATH: contextPath,
    });

    if (result.error) throw result.error;
    notStrictEqual(result.status, 0, result.output);
    match(result.output, /STUB_GUARD_/);
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_ERROR stage=architecture-metrics detail=required script is missing/,
    );
    match(
      result.output,
      /BVP_REPOSITORY_CHECK_RESULT=FAIL guardExit=0 metricsExit=2/,
    );
  });
});
