import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { isAbsolute, resolve } from "node:path";
import {
  runArchitectureGuard,
  runArchitectureMetrics,
  type ChangeClass,
} from "./architecture-governance";

interface VerificationContext {
  readonly schemaVersion: 1;
  readonly targetHead: string;
  readonly baseSha: string;
  readonly changedPaths: readonly string[];
}

const shaPattern = /^[0-9a-f]{40}$/i;
const repositoryRoot = resolve(process.cwd());
const rawChangeClass = process.env.BVP_CHANGE_CLASS?.trim() || "ordinary";
const canonicalDevDirectories = new Set([
  "authority",
  "planning",
  "research",
  "state",
  "reviews",
  "scripts",
  "Test-Results",
  "scratch",
]);
const canonicalDevFiles = new Set(["README.md", "_ca-output.md"]);
const brainPackageName = "brain-google-drive-sync";
const migrationBaselineMainSha256 =
  "8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074";

interface DevRootViolation {
  readonly path: string;
  readonly detail: string;
}

function inspectCanonicalDevRoot(): readonly DevRootViolation[] {
  const devRoot = resolve(repositoryRoot, "dev");
  if (!existsSync(devRoot)) {
    return [{ path: "dev", detail: "Canonical development root is missing." }];
  }

  const entries = readdirSync(devRoot, { withFileTypes: true });
  const violations: DevRootViolation[] = [];

  for (const required of canonicalDevDirectories) {
    const entry = entries.find((candidate) => candidate.name === required);
    if (!entry || !entry.isDirectory()) {
      violations.push({
        path: "dev/" + required,
        detail: "Required canonical development directory is missing.",
      });
    }
  }

  for (const required of canonicalDevFiles) {
    const entry = entries.find((candidate) => candidate.name === required);
    if (!entry || !entry.isFile()) {
      violations.push({
        path: "dev/" + required,
        detail: "Required canonical development file is missing.",
      });
    }
  }

  for (const entry of entries) {
    const allowed =
      (entry.isDirectory() && canonicalDevDirectories.has(entry.name)) ||
      (entry.isFile() && canonicalDevFiles.has(entry.name));
    if (!allowed) {
      violations.push({
        path: "dev/" + entry.name,
        detail:
          "Noncanonical active dev/ top-level entry; compatibility aliases and retired development trees are prohibited.",
      });
    }
  }

  return violations;
}

function inspectShippingArtifactIdentity(): readonly DevRootViolation[] {
  const packagePath = resolve(repositoryRoot, "package.json");
  if (!existsSync(packagePath)) return [];

  let packageModel: { name?: unknown };
  try {
    packageModel = JSON.parse(readFileSync(packagePath, "utf8"));
  } catch {
    return [];
  }
  if (packageModel.name !== brainPackageName) return [];

  const artifactPath = resolve(repositoryRoot, "main.js");
  if (!existsSync(artifactPath)) {
    return [{
      path: "main.js",
      detail: "Required shipping artifact is missing after build.",
    }];
  }

  const actualSha256 = createHash("sha256")
    .update(readFileSync(artifactPath))
    .digest("hex");
  if (actualSha256 !== migrationBaselineMainSha256) {
    return [{
      path: "main.js",
      detail:
        "Built shipping artifact SHA-256 changed across repository standardization. Expected " +
        migrationBaselineMainSha256 +
        "; actual " +
        actualSha256 +
        ".",
    }];
  }

  return [];
}

function fail(message: string, exitCode = 2): never {
  console.error("BVP_REPOSITORY_CHECK_ERROR " + message);
  process.exit(exitCode);
}

function readAuthoritativeContext(): VerificationContext | null {
  const contextPath = process.env.PHX_VERIFICATION_CONTEXT_PATH?.trim() || "";
  if (contextPath.length === 0) return null;
  if (!isAbsolute(contextPath)) fail("context path is not absolute: " + contextPath);
  if (!existsSync(contextPath)) fail("context file is missing: " + contextPath);

  let context: any;
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
  if (
    typeof context.targetHead !== "string" ||
    !shaPattern.test(context.targetHead)
  ) {
    fail("context targetHead is not a full Git SHA");
  }
  if (
    typeof context.baseSha !== "string" ||
    !shaPattern.test(context.baseSha)
  ) {
    fail("context baseSha is not a full Git SHA");
  }
  if (!Array.isArray(context.changedPaths)) {
    fail("context changedPaths is not an array");
  }

  const changedPaths: string[] = [];
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

if (
  rawChangeClass !== "ordinary" &&
  rawChangeClass !== "authorized-governance"
) {
  fail(
    "BVP_CHANGE_CLASS must be ordinary or authorized-governance; received " +
      JSON.stringify(rawChangeClass),
  );
}
const changeClass = rawChangeClass as ChangeClass;
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

console.log("=== CANONICAL DEV ROOT STRUCTURE ===");
const devRootViolations = inspectCanonicalDevRoot();
for (const violation of devRootViolations) {
  console.log(
    "DEV_ROOT_STRUCTURE_VIOLATION path=" +
      violation.path +
      " detail=" +
      violation.detail,
  );
}
console.log(
  "DEV_ROOT_STRUCTURE_RESULT=" +
    (devRootViolations.length === 0 ? "PASS" : "FAIL") +
    " violations=" +
    devRootViolations.length,
);

console.log("=== SHIPPING ARTIFACT IDENTITY ===");
const shippingArtifactViolations = inspectShippingArtifactIdentity();
for (const violation of shippingArtifactViolations) {
  console.log(
    "SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=" +
      violation.path +
      " detail=" +
      violation.detail,
  );
}
console.log(
  "SHIPPING_ARTIFACT_IDENTITY_RESULT=" +
    (shippingArtifactViolations.length === 0 ? "PASS" : "FAIL") +
    " violations=" +
    shippingArtifactViolations.length,
);

console.log("=== BVP ARCHITECTURE GUARD ===");
const guard = runArchitectureGuard({
  repoRoot: repositoryRoot,
  changedPaths: context?.changedPaths ?? [],
  changeClass,
});
process.stdout.write(guard.output);

console.log("=== BVP ARCHITECTURE METRICS ===");
const metrics = runArchitectureMetrics({
  repoRoot: repositoryRoot,
  baseSha: context?.baseSha,
});
process.stdout.write(metrics.output);

const devRootExit = devRootViolations.length === 0 ? 0 : 1;
const shippingArtifactExit = shippingArtifactViolations.length === 0 ? 0 : 1;
const passed =
  devRootExit === 0 &&
  shippingArtifactExit === 0 &&
  guard.exitCode === 0 &&
  metrics.exitCode === 0;
console.log(
  "BVP_REPOSITORY_CHECK_RESULT=" +
    (passed ? "PASS" : "FAIL") +
    " devRootExit=" +
    devRootExit +
    " shippingArtifactExit=" +
    shippingArtifactExit +
    " guardExit=" +
    guard.exitCode +
    " metricsExit=" +
    metrics.exitCode +
    " context=" +
    (context ? "authoritative" : "local") +
    " changeClass=" +
    changeClass,
);

process.exit(passed ? 0 : 1);
