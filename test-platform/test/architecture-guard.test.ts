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

function boundaryManifest(): string {
  return [
    "schema_version: 2",
    "status: authoritative_frozen_after_bvp_s01_persistence",
    "name: BRAIN Verification Platform architecture boundary",
    "",
    "roots:",
    "  production:",
    "    - src/",
    "  test_platform: test-platform/",
    "  active_dev: dev/",
    "  archive: dev/archive/",
    "",
    "import_rules:",
    "  production_must_not_import:",
    "    - test-platform/",
    "  test_platform_may_import_production_only_through_allowlist: true",
    "  scenario_specific_production_code_allowed: false",
    "",
    "shipping_rules:",
    "  production_bundle_must_exclude:",
    "    - test-platform/",
    "  production_validation_ui_allowed: false",
    "  validation_device_agent_must_be_separate_artifact_or_entrypoint: true",
    "",
    "production_seam:",
    "  allowlist_required: true",
    "  max_logical_loc: 350",
    "  max_files: 4",
    "",
    "complexity_budgets:",
    "  scenario_specific_powershell_scripts_max: 0",
    "",
    "supervisor_owned_frozen_surfaces:",
    "  - dev/governance/testing-platform-boundary.yaml",
    "  - dev/scripts/Test-TestingArchitectureGuard.ps1",
    "  - dev/scripts/Get-TestingArchitectureMetrics.ps1",
    "  - phx-ci.json",
    "  - Taskfile.phx-ci.yml",
    "  - bounded PHX-CI include block in Taskfile.yml",
    "",
    "archive_policy:",
    "  archive_is_non_authoritative: true",
    "  exclude_from_normal_grounding: true",
    "  active_docs_must_not_depend_on_archived_prompts: true",
    "",
  ].join("\n");
}

function createBaselineFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "brain-bvp-architecture-guard-"));

  writeText(root, "src/main.ts", 'export const productionValue = "production";\n');
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
    [
      'import { build } from "esbuild";',
      'await build({ entryPoints: ["src/main.ts"], outfile: "main.js" });',
      "",
    ].join("\n"),
  );
  writeText(
    root,
    "scripts/verify-build.mjs",
    'export const artifact = "main.js";\n',
  );
  writeText(
    root,
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: { target: "ES2022" },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ) + "\n",
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
          build: "node scripts/build.mjs && node scripts/verify-build.mjs",
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
    boundaryManifest(),
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

test("architecture guard source has one coherent terminal implementation", () => {
  const source = readFileSync(guardPath, "utf8").replace(/\r\n/g, "\n");
  const exitMatches = source.match(/^\s*exit 0\s*$/gm) ?? [];
  const passMatches =
    source.match(/ARCH_GUARD_RESULT=PASS violations=0/g) ?? [];
  const functionNames = [
    ...source.matchAll(/^function\s+([A-Za-z0-9_-]+)\s*\{/gm),
  ].map((match) => match[1]);

  strictEqual(exitMatches.length, 1, "guard must contain exactly one exit 0");
  strictEqual(
    passMatches.length,
    1,
    "guard must contain exactly one terminal PASS result",
  );
  strictEqual(
    new Set(functionNames).size,
    functionNames.length,
    "guard must not contain duplicated function definitions",
  );
  match(
    source.trimEnd(),
    /Write-Output 'ARCH_GUARD_RESULT=PASS violations=0'\nexit 0$/,
  );

  const requiredSourceFragments = [
    "if ($root -notmatch '^[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$' -or $root -match '(^|/)\\.\\.($|/)') {",
    "Production root '$productionRoot' overlaps test-platform root '$testPlatformRoot'.",
    "Archive root '$archiveRoot' must be contained by active_dev root '$activeDevRoot'.",
    "if (-not ($productionForbiddenRoots -contains $testPlatformRoot)) {",
    "if (-not ($shippingForbiddenRoots -contains $testPlatformRoot)) {",
    "$entryWithoutExtension = $entry -replace '(?i)\\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$', ''",
    "if ($entryWithoutExtension -ne $entry -and $Target -eq $entryWithoutExtension) {",
    "if ($entry -match '(?i)/index\\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$') {",
    "$indexParent = $entry -replace '(?i)/index\\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$', ''",
  ];

  for (const fragment of requiredSourceFragments) {
    strictEqual(
      source.includes(fragment),
      true,
      "guard source is missing required integrity fragment: " + fragment,
    );
  }

  let insideSingleQuotedHereString = false;
  for (const [index, rawLine] of source.split("\n").entries()) {
    const line = rawLine.trimEnd();

    if (insideSingleQuotedHereString) {
      if (line.trim() === "'@") {
        insideSingleQuotedHereString = false;
      }
      continue;
    }

    if (line.trim().endsWith("@'")) {
      insideSingleQuotedHereString = true;
      continue;
    }

    let singleQuoted = false;
    let doubleQuoted = false;
    for (let cursor = 0; cursor < line.length; cursor += 1) {
      const character = line[cursor];
      const next = line[cursor + 1];

      if (!singleQuoted && !doubleQuoted && character === "#") {
        break;
      }
      if (doubleQuoted && character === "\`" && next !== undefined) {
        cursor += 1;
        continue;
      }
      if (!doubleQuoted && character === "'") {
        if (singleQuoted && next === "'") {
          cursor += 1;
          continue;
        }
        singleQuoted = !singleQuoted;
        continue;
      }
      if (!singleQuoted && character === '"') {
        doubleQuoted = !doubleQuoted;
      }
    }

    strictEqual(
      singleQuoted,
      false,
      "unterminated single-quoted PowerShell literal at line " + (index + 1),
    );
  }
  strictEqual(
    insideSingleQuotedHereString,
    false,
    "unterminated embedded TypeScript here-string",
  );
});

test("architecture guard parses with the real PowerShell parser", () => {
  const parserCommand = [
    "$tokens = $null",
    "$errors = $null",
    "[System.Management.Automation.Language.Parser]::ParseFile(" +
      "$env:BVP_ARCHITECTURE_GUARD_PATH, [ref]$tokens, [ref]$errors) | Out-Null",
    "if ($errors.Count -gt 0) {",
    "  foreach ($error in $errors) {",
    "    [Console]::Error.WriteLine($error.ToString())",
    "  }",
    "  exit 1",
    "}",
  ].join("\n");

  const result = spawnSync(
    powerShell,
    ["-NoProfile", "-Command", parserCommand],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        BVP_ARCHITECTURE_GUARD_PATH: guardPath,
      },
    },
  );

  if (result.error) {
    throw result.error;
  }
  strictEqual(
    result.status,
    0,
    (result.stdout ?? "") + (result.stderr ?? ""),
  );
});

test("architecture guard passes the actual BRAIN repository baseline", () => {
  assertPass(runGuard(repositoryRoot));
});

test("architecture guard passes a compliant baseline fixture", () => {
  withFixture((root) => {
    assertPass(runGuard(root));
  });
});

test("architecture guard fails closed when the boundary manifest is missing", () => {
  withFixture((root) => {
    rmSync(join(root, "dev", "governance", "testing-platform-boundary.yaml"));
    assertFailsWithRule(runGuard(root), "BOUNDARY_MANIFEST_MISSING");
  });
});

test("architecture guard fails closed when required manifest authority is incomplete", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/governance/testing-platform-boundary.yaml",
      [
        "schema_version: 2",
        "status: authoritative",
        "roots:",
        "  production:",
        "    - src/",
        "  test_platform: test-platform/",
        "",
      ].join("\n"),
    );
    assertFailsWithRule(runGuard(root), "BOUNDARY_MANIFEST_INVALID");
  });
});

test("architecture guard consumes manifest-rebound architecture roots", () => {
  withFixture((root) => {
    const manifest = boundaryManifest()
      .replace("  test_platform: test-platform/", "  test_platform: verification-platform/")
      .replaceAll("    - test-platform/", "    - verification-platform/");
    writeText(
      root,
      "dev/governance/testing-platform-boundary.yaml",
      manifest,
    );
    writeText(
      root,
      "verification-platform/src/platform-root.ts",
      'export const platformValue = "test-only";\n',
    );
    writeText(
      root,
      "src/manifest-root-violation.ts",
      'import { platformValue } from "../verification-platform/src/platform-root";\nvoid platformValue;\n',
    );
    assertFailsWithRule(runGuard(root), "PRODUCTION_IMPORTS_TEST_PLATFORM");
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

test("architecture guard consumes the manifest-approved production seam", () => {
  withFixture((root) => {
    const manifest = boundaryManifest().replace(
      "  allowlist_required: true\n  max_logical_loc: 350",
      "  allowlist_required: true\n  approved_imports:\n    - src/main.ts\n  max_logical_loc: 350",
    );
    writeText(
      root,
      "dev/governance/testing-platform-boundary.yaml",
      manifest,
    );
    writeText(
      root,
      "test-platform/test/approved-seam.test.ts",
      'import { productionValue } from "../../src/main";\nvoid productionValue;\n',
    );
    assertPass(runGuard(root));
  });
});

test("architecture guard rejects actual production build inclusion of test-platform", () => {
  withFixture((root) => {
    writeText(
      root,
      "scripts/build.mjs",
      [
        'import { build } from "esbuild";',
        'await build({ entryPoints: ["test-platform/src/platform-root.ts"], outfile: "main.js" });',
        "",
      ].join("\n"),
    );
    assertFailsWithRule(
      runGuard(root),
      "PRODUCTION_BUILD_REFERENCES_TEST_PLATFORM",
    );
  });
});

test("architecture guard ignores inert test-platform text in build source", () => {
  withFixture((root) => {
    writeText(
      root,
      "scripts/build.mjs",
      [
        'import { build } from "esbuild";',
        '// entryPoints: ["test-platform/src/platform-root.ts"]',
        'const note = "test-platform/src/platform-root.ts is not a build input";',
        'const unrelated = { entryPoints: ["test-platform/src/platform-root.ts"] };',
        'await build({ entryPoints: ["src/main.ts"], outfile: "main.js" });',
        "void note;",
        "void unrelated;",
        "",
      ].join("\n"),
    );
    assertPass(runGuard(root));
  });
});

test("architecture guard rejects shipping sentinel in main.js", () => {
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

test("architecture guard rejects actual production scenario control", () => {
  withFixture((root) => {
    writeText(
      root,
      "src/scenario-control.ts",
      'export const scenarioId = "BVP-C03";\n',
    );
    assertFailsWithRule(runGuard(root), "PRODUCTION_SCENARIO_CONTROL");
  });
});

test("architecture guard ignores scenario-looking comments strings and unrelated terminology", () => {
  withFixture((root) => {
    writeText(
      root,
      "src/scenario-prose.ts",
      [
        '// const scenarioId = "BVP-C03";',
        'const note = "scenarioId BVP-C03 validationMode runScenario";',
        'const businessScenarioDescription = "ordinary product scenario";',
        "void note;",
        "void businessScenarioDescription;",
        "",
      ].join("\n"),
    );
    assertPass(runGuard(root));
  });
});

test("architecture guard recognizes the complete supported dependency matrix", () => {
  const tick = String.fromCharCode(96);
  const cases: ReadonlyArray<{
    readonly name: string;
    readonly source: string;
    readonly relativePath?: string;
  }> = [
    {
      name: "static-import",
      source:
        'import { productionValue } from "../../src/main";\nvoid productionValue;\n',
    },
    {
      name: "type-only-import",
      source:
        'import type { ProductionType } from "../../src/main";\ntype Local = ProductionType;\nvoid (0 as unknown as Local);\n',
    },
    {
      name: "re-export",
      source: 'export { productionValue } from "../../src/main";\n',
    },
    {
      name: "type-re-export",
      source: 'export type { ProductionType } from "../../src/main";\n',
    },
    {
      name: "require",
      source:
        'const production = require("../../src/main");\nvoid production;\n',
    },
    {
      name: "dynamic-import",
      source: 'void import("../../src/main");\n',
    },
    {
      name: "template-interpolation-import",
      source:
        "const value = " +
        tick +
        "prefix $" +
        '{await import("../../src/main")} suffix' +
        tick +
        ";\nvoid value;\n",
    },
    {
      name: "nested-template-interpolation",
      source:
        "const value = " +
        tick +
        "outer $" +
        "{" +
        tick +
        "inner $" +
        '{await import("../../src/main")}' +
        tick +
        "}" +
        tick +
        ";\nvoid value;\n",
    },
    {
      name: "normalized-relative-traversal",
      source: 'void import("../../../src/../src/main");\n',
      relativePath: "test-platform/test/nested/dependency.test.ts",
    },
    {
      name: "dependency-after-division",
      source:
        'const value = total / require("../../src/main");\nvoid value;\n',
    },
    {
      name: "dependency-after-control-block",
      source:
        'if (condition) { void condition; }\nvoid import("../../src/main");\n',
    },
    {
      name: "dependency-after-class-declaration",
      source:
        'class Example {}\nvoid import("../../src/main");\nvoid Example;\n',
    },
    {
      name: "dependency-after-function-declaration",
      source:
        'function example() {}\nrequire("../../src/main");\nvoid example;\n',
    },
  ];

  for (const entry of cases) {
    withFixture((root) => {
      writeText(
        root,
        entry.relativePath ??
          "test-platform/test/dependency-" + entry.name + ".test.ts",
        entry.source,
      );
      const result = runGuard(root);
      try {
        assertFailsWithRule(
          result,
          "TEST_PLATFORM_IMPORTS_UNAPPROVED_PRODUCTION",
        );
      } catch (error) {
        throw new Error(
          entry.name + ": " + String(error) + "\n" + result.output,
        );
      }
    });
  }
});

test("architecture guard ignores dependency-shaped non-dependencies", () => {
  const tick = String.fromCharCode(96);
  const cases: ReadonlyArray<readonly [string, string]> = [
    [
      "quoted-strings",
      [
        'const values = [',
        '  \'import { x } from "../../src/main";\',',
        '  \'require("../../src/main")\',',
        '  \'import("../../src/main")\',',
        "];",
        "void values;",
        "",
      ].join("\n"),
    ],
    [
      "comments",
      [
        '// import { x } from "../../src/main";',
        '/* require("../../src/main"); import("../../src/main"); */',
        "export const harmless = true;",
        "",
      ].join("\n"),
    ],
    [
      "plain-template-text",
      "const value = " +
        tick +
        'require("../../src/main") import("../../src/main")' +
        tick +
        ";\nvoid value;\n",
    ],
    [
      "regex-assignment",
      'const value = /require("..\\/..\\/src\\/main")|import("..\\/..\\/src\\/main")/g;\nvoid value;\n',
    ],
    [
      "regex-after-if",
      'if (condition) /require("..\\/..\\/src\\/main")/.test(text);\n',
    ],
    [
      "regex-after-block",
      'if (condition) { void condition; }\n/require("..\\/..\\/src\\/main")/.test(text);\n',
    ],
    [
      "regex-after-class",
      'class Example {}\n/require("..\\/..\\/src\\/main")/.test(text);\nvoid Example;\n',
    ],
    [
      "regex-after-function",
      'function example() {}\n/import("..\\/..\\/src\\/main")/.test(text);\nvoid example;\n',
    ],
    [
      "ordinary-division",
      'const ratio = total / count / scale;\nvoid ratio;\n',
    ],
    [
      "object-literal",
      'const value = { text: \'require("../../src/main")\' };\nconst ratio = value.count / total;\nvoid ratio;\n',
    ],
    [
      "property-access-lookalikes",
      'loader.require("../../src/main");\nloader.import("../../src/main");\n',
    ],
    [
      "shadowed-require",
      'function local(require: (name: string) => unknown) { return require("../../src/main"); }\nvoid local;\n',
    ],
  ];

  for (const [name, source] of cases) {
    withFixture((root) => {
      writeText(
        root,
        "test-platform/test/non-dependency-" + name + ".test.ts",
        source,
      );
      const result = runGuard(root);
      try {
        assertPass(result);
      } catch (error) {
        throw new Error(name + ": " + String(error) + "\n" + result.output);
      }
    });
  }
});

test("architecture guard rejects PowerShell beneath test-platform", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/C03.ps1", 'Write-Output "bad"\n');
    assertFailsWithRule(runGuard(root), "TEST_PLATFORM_POWERSHELL_PROHIBITED");
  });
});

test("architecture guard rejects active archive-as-authority linkage", () => {
  withFixture((root) => {
    writeText(
      root,
      "dev/agents/st2a/ph6/05-bvp/current-task.md",
      "Execute dev/archive/legacy-validation-harness/task.md as the governing task authority.\n",
    );
    assertFailsWithRule(runGuard(root), "ARCHIVE_USED_AS_CURRENT_AUTHORITY");
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

test("architecture guard rejects ordinary changes to frozen governance", () => {
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

test("architecture guard accepts explicitly authorized governance change class for frozen surface", () => {
  withFixture((root) => {
    assertPass(
      runGuard(root, [
        "-ChangeClass",
        "authorized-governance",
        "-ChangedPath",
        "dev/governance/testing-platform-boundary.yaml",
      ]),
    );
  });
});

test("authorized governance change class exempts only frozen-surface enforcement", () => {
  withFixture((root) => {
    writeText(root, "test-platform/scenarios/C03.ps1", 'Write-Output "bad"\n');
    assertFailsWithRule(
      runGuard(root, [
        "-ChangeClass",
        "authorized-governance",
        "-ChangedPath",
        "dev/governance/testing-platform-boundary.yaml",
      ]),
      "TEST_PLATFORM_POWERSHELL_PROHIBITED",
    );
  });
});
