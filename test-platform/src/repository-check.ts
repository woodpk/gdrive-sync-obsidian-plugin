import { existsSync, readFileSync } from "node:fs";
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

const passed = guard.exitCode === 0 && metrics.exitCode === 0;
console.log(
  "BVP_REPOSITORY_CHECK_RESULT=" +
    (passed ? "PASS" : "FAIL") +
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
