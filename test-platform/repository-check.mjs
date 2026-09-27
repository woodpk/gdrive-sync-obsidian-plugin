import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const shaPattern = /^[0-9a-f]{40}$/i;
const repositoryRoot = resolve(process.cwd());
const guardScript = join(
  repositoryRoot,
  "dev",
  "scripts",
  "Test-TestingArchitectureGuard.ps1",
);
const metricsScript = join(
  repositoryRoot,
  "dev",
  "scripts",
  "Get-TestingArchitectureMetrics.ps1",
);
const powerShell = process.env.PWSH?.trim() || "pwsh";
const changeClass = process.env.BVP_CHANGE_CLASS?.trim() || "ordinary";

function fail(message, exitCode = 2) {
  console.error("BVP_REPOSITORY_CHECK_ERROR " + message);
  process.exit(exitCode);
}

function readAuthoritativeContext() {
  const contextPath = process.env.PHX_VERIFICATION_CONTEXT_PATH?.trim() || "";
  if (contextPath.length === 0) {
    return null;
  }
  if (!isAbsolute(contextPath)) {
    fail("context path is not absolute: " + contextPath);
  }
  if (!existsSync(contextPath)) {
    fail("context file is missing: " + contextPath);
  }

  let context;
  try {
    context = JSON.parse(readFileSync(contextPath, "utf8"));
  } catch (error) {
    fail(
      "context JSON is unreadable: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  if (context?.schemaVersion !== 1) {
    fail(
      "unsupported PHX-CI verification-context schema version: " +
        String(context?.schemaVersion),
    );
  }
  if (typeof context.targetHead !== "string" || !shaPattern.test(context.targetHead)) {
    fail("context targetHead is not a full Git SHA");
  }
  if (typeof context.baseSha !== "string" || !shaPattern.test(context.baseSha)) {
    fail("context baseSha is not a full Git SHA");
  }
  if (!Array.isArray(context.changedPaths)) {
    fail("context changedPaths is not an array");
  }

  const changedPaths = [];
  for (const path of context.changedPaths) {
    if (typeof path !== "string" || path.trim().length === 0) {
      fail("context changedPaths contains a non-string or empty path");
    }
    changedPaths.push(path);
  }

  return {
    schemaVersion: 1,
    targetHead: context.targetHead,
    baseSha: context.baseSha,
    changedPaths,
  };
}

function runPowerShellStage(name, scriptPath, command, extraEnvironment) {
  if (!existsSync(scriptPath)) {
    console.error(
      "BVP_REPOSITORY_CHECK_ERROR stage=" +
        name +
        " detail=required script is missing path=" +
        scriptPath,
    );
    return 2;
  }

  const result = spawnSync(
    powerShell,
    ["-NoProfile", "-NonInteractive", "-Command", command],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      windowsHide: true,
      env: {
        ...process.env,
        ...extraEnvironment,
      },
    },
  );

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    console.error(
      "BVP_REPOSITORY_CHECK_ERROR stage=" +
        name +
        " detail=" +
        result.error.message,
    );
    return 127;
  }
  if (result.status === null) {
    console.error(
      "BVP_REPOSITORY_CHECK_ERROR stage=" +
        name +
        " detail=PowerShell returned no exit status",
    );
    return 127;
  }
  return result.status;
}

if (!["ordinary", "authorized-governance"].includes(changeClass)) {
  fail(
    "BVP_CHANGE_CLASS must be ordinary or authorized-governance; received " +
      JSON.stringify(changeClass),
  );
}

const context = readAuthoritativeContext();
if (context) {
  console.log(
    "BVP_REPOSITORY_CHECK_CONTEXT schema=1 target=" +
      context.targetHead +
      " base=" +
      context.baseSha +
      " changedPaths=" +
      context.changedPaths.length,
  );
} else {
  console.log("BVP_REPOSITORY_CHECK_CONTEXT unavailable mode=local");
}

const commonEnvironment = {
  BVP_REPO_ROOT: repositoryRoot,
  BVP_CHANGE_CLASS: changeClass,
};

console.log("=== BVP ARCHITECTURE GUARD ===");
const guardExit = runPowerShellStage(
  "architecture-guard",
  guardScript,
  [
    "$ErrorActionPreference = 'Stop'",
    "$params = @{ RepoRoot = $env:BVP_REPO_ROOT; ChangeClass = $env:BVP_CHANGE_CLASS }",
    "$contextPath = $env:PHX_VERIFICATION_CONTEXT_PATH",
    "if (-not [string]::IsNullOrWhiteSpace($contextPath)) { $context = Get-Content -LiteralPath $contextPath -Raw -Encoding utf8 | ConvertFrom-Json; $params.ChangedPath = @($context.changedPaths) }",
    "& $env:BVP_GUARD_SCRIPT @params",
    "exit $LASTEXITCODE",
  ].join("; "),
  {
    ...commonEnvironment,
    BVP_GUARD_SCRIPT: guardScript,
  },
);

console.log("=== BVP ARCHITECTURE METRICS ===");
const metricsExit = runPowerShellStage(
  "architecture-metrics",
  metricsScript,
  [
    "$ErrorActionPreference = 'Stop'",
    "$params = @{ RepoRoot = $env:BVP_REPO_ROOT }",
    "$contextPath = $env:PHX_VERIFICATION_CONTEXT_PATH",
    "if (-not [string]::IsNullOrWhiteSpace($contextPath)) { $context = Get-Content -LiteralPath $contextPath -Raw -Encoding utf8 | ConvertFrom-Json; $params.BaseSha = [string]$context.baseSha }",
    "& $env:BVP_METRICS_SCRIPT @params",
    "exit $LASTEXITCODE",
  ].join("; "),
  {
    ...commonEnvironment,
    BVP_METRICS_SCRIPT: metricsScript,
  },
);

const passed = guardExit === 0 && metricsExit === 0;
console.log(
  "BVP_REPOSITORY_CHECK_RESULT=" +
    (passed ? "PASS" : "FAIL") +
    " guardExit=" +
    guardExit +
    " metricsExit=" +
    metricsExit +
    " context=" +
    (context ? "authoritative" : "local") +
    " changeClass=" +
    changeClass,
);

process.exit(passed ? 0 : 1);
