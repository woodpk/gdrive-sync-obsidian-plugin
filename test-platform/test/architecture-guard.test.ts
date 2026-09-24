import { match, notStrictEqual, strictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const repositoryRoot = resolve(__dirname, "../../..");
const guardPath = join(
  repositoryRoot,
  "dev",
  "scripts",
  "Test-TestingArchitectureGuard.ps1",
);
const powerShell = process.env.PWSH ?? "pwsh";

function writeText(root: string, relativePath: string, content: string): void {
  const fullPath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function createBaselineFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "brain-bvp-architecture-guard-"));

  writeText(
    root,
    "src/main.ts",
    'export const productionValue = "production";\n',
  );
  writeText(
    root,
    "test-platform/src/platform-root.ts",
    'export const platformValue = "test-only";\n',
  );
  writeText(
    root,
    "test-platform/test/platform-root.test.ts",
    'import { platformValue } from "../src/platform-root";\nvoid platformValue;\n',
  );
  writeText(
    root,
    "scripts/build.mjs",
    'export const entryPoints = ["src/main.ts"];\n',
  );
  writeText(
    root,
    "package.json",
    JSON.stringify(
      {
        name: "architecture-guard-fixture",
        private: true,
        main: "main.js",
        scripts: {
          build: "node scripts/build.mjs",
          "test:bvp-root": "tsc -p test-platform/tsconfig.json",
        },
      },
      null,
      2,
    ) + "\n",
  );
  writeText(
    root,
    "dev/governance/testing-platform-boundary.yaml",
    [
      "schema_version: 2",
      "supervisor_owned_frozen_surfaces:",
      "  - dev/governance/testing-platform-boundary.yaml",
      "  - dev/scripts/Test-TestingArchitectureGuard.ps1",
      "  - dev/scripts/Get-TestingArchitectureMetrics.ps1",
      "  - phx-ci.json",
      "  - Taskfile.phx-ci.yml",
      "  - bounded PHX-CI include block in Taskfile.yml",
      "",
    ].join("\n"),
  );
  writeText(
    root,
    "dev/planning-and-building/testing-platform-target-system-specification.md",
    "Historical BVP material may be retained under dev/archive/ as non-authoritative evidence only.\n",
  );
  writeText(root, "main.js", 'console.log("production bundle");\n');

  return root;
}

interface GuardResult {
  readonly status: number | null;
  readonly output: string;
  readonly error?: Error;
}

function runGuard(root: string, extraArgs: readonly string[] = []): GuardResult {
  const result = spawnSync(
    powerShell,
    ["-NoProfile", "-File", guardPath, "-RepoRoot", root, ...extraArgs],
    { encoding: "utf8" },
  );

  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
    error: result.error,
  };
}

function withFixture(run: (root: string) => void): void {
  const root = createBaselineFixture();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function assertPass(result: GuardResult): void {
  if (result.error) {
    throw result.error;
  }
  strictEqual(result.status, 0, result.output);
  match(result.output, /ARCH_GUARD_RESULT=PASS violations=0/);
}

function assertFailsWithRule(result: GuardResult, rule: string): void {
  if (result.error) {
    throw result.error;
  }
  notStrictEqual(result.status, 0, result.output);
  match(result.output, new RegExp(`rule=${rule}\\b`));
  match(result.output, /ARCH_GUARD_RESULT=FAIL violations=\d+/);
}

test("architecture guard passes the actual BRAIN repository baseline", () => {
  assertPass(runGuard(repositoryRoot));
});

test("architecture guard passes a compliant baseline fixture", () => {
  withFixture((root) => {
    assertPass(runGuard(root));
  });
});

test("architecture guard rejects production imports from test-platform", () => {
  withFixture((root) => {
    writeText(
      root,
      "src/bad-import.ts",
      'import { platformValue } from "../test-platform/src/platform-root";\nvoid platformValue;\n',
    );
    assertFailsWithRule(runGuard(root), "PRODUCTION_IMPORTS_TEST_PLATFORM");
  });
});

test("architecture guard rejects production build references to test-platform", () => {
  withFixture((root) => {
    writeText(
      root,
      "scripts/build.mjs",
      'export const entryPoints = ["test-platform/src/platform-root.ts"];\n',
    );
    assertFailsWithRule(
      runGuard(root),
      "PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM",
    );
  });
});

test("architecture guard rejects a shipping bundle containing the test-platform sentinel", () => {
  withFixture((root) => {
    writeText(
      root,
      "main.js",
      'console.log("BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL");\n',
    );
    assertFailsWithRule(
      runGuard(root),
      "PRODUCTION_BUNDLE_CONTAINS_TEST_PLATFORM",
    );
  });
});

test("architecture guard rejects scenario identifiers or controls in production", () => {
  withFixture((root) => {
    writeText(
      root,
      "src/bad-scenario.ts",
      'export const scenarioId = "BVP-C03";\n',
    );
    assertFailsWithRule(runGuard(root), "PRODUCTION_SCENARIO_CONTROL");
  });
});

test("architecture guard rejects unapproved test-platform imports from production src", () => {
  withFixture((root) => {
    writeText(
      root,
      "test-platform/test/bad-import.test.ts",
      'import { productionValue } from "../../src/main";\nvoid productionValue;\n',
    );
    assertFailsWithRule(
      runGuard(root),
      "TEST_PLATFORM_IMPORTS_UNAPPROVED_PRODUCTION",
    );
  });
});

test("architecture guard rejects PowerShell beneath test-platform", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/C03.ps1", 'Write-Output "bad"\n');
    assertFailsWithRule(runGuard(root), "TEST_PLATFORM_POWERSHELL_PROHIBITED");
  });
});

test("architecture guard rejects active task links that restore archive authority", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/agents/st2a/ph6/05-bvp/current-task.md",
      "Execute [the current task](dev/archive/legacy-validation-harness/task.md) as the governing task authority.\n",
    );
    assertFailsWithRule(runGuard(root), "ARCHIVE_USED_AS_CURRENT_AUTHORITY");
  });
});

test("architecture guard rejects supplied normal changed paths that touch frozen governance", () => {
  withFixture((root) => {
    assertFailsWithRule(
      runGuard(root, [
        "-ChangedPath",
        "dev/governance/testing-platform-boundary.yaml",
      ]),
      "FROZEN_SURFACE_CHANGED",
    );
  });
});

test("architecture guard allows historical non-authoritative archive prose", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/agents/st2a/ph6/05-bvp/history-note.md",
      "Historical reference only: dev/archive/legacy-validation-harness/task.md is non-authoritative and must not be used as current task authority.\n",
    );
    assertPass(runGuard(root));
  });
});
