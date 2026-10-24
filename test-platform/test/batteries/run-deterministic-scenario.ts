import { mkdir, writeFile } from "node:fs/promises";
import { isAbsolute, dirname } from "node:path";
import { bvpDiagnostic } from "../../src/scenario/scenario-diagnostics";
import { DeterministicScenarioRunner, type ScenarioExecutionResult, type ScenarioExecutionStatus } from "../../src/scenario/scenario-runner";
import { getDeterministicScenario, listDeterministicScenarios } from "./deterministic-scenario-registry";

type Request = { readonly kind: "list" } |
  { readonly kind: "execute"; readonly scenarioId: string; readonly resultFile: string };

/** Strict, explicit CLI front door; unexpected flags never fall through to scenario execution. */
function parseRequest(argv: readonly string[]): Request {
  if (argv.length === 1 && argv[0] === "--list-scenarios") return { kind: "list" };
  if (argv.length !== 4) throw new Error("scenario-cli-arguments-invalid");
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index], value = argv[index + 1];
    if ((name !== "--scenario" && name !== "--result-file") ||
        !value || value.startsWith("--") || values.has(name)) {
      throw new Error("scenario-cli-arguments-invalid");
    }
    values.set(name, value);
  }
  const scenarioId = values.get("--scenario"), resultFile = values.get("--result-file");
  if (!scenarioId || !/^[a-z][a-z0-9-]{0,127}$/.test(scenarioId) ||
      !resultFile || !isAbsolute(resultFile) || !resultFile.endsWith(".json") ||
      resultFile.length > 1024 || /[\x00-\x1f]/.test(resultFile) ||
      resultFile.split(/[\\/]/).some(component => component === ".." || component === ".") ||
      resultFile.startsWith("\\\\") || resultFile.startsWith("//")) {
    throw new Error("scenario-cli-arguments-invalid");
  }
  return { kind: "execute", scenarioId, resultFile };
}

export function exitCodeForScenarioStatus(status: ScenarioExecutionStatus): number {
  return status === "completed" ? 0 : 1;
}

async function main(argv: readonly string[]): Promise<void> {
  let request: Request | undefined;
  try {
    request = parseRequest(argv);
    if (request.kind === "list") {
      process.stdout.write(JSON.stringify({
        schemaVersion: 1, scenarios: listDeterministicScenarios(),
      }) + "\n");
      return;
    }
    const selected = getDeterministicScenario(request.scenarioId);
    if (!selected || !selected.executionModes.includes("deterministic") ||
        selected.executionModes.includes("live")) {
      throw new Error("scenario-cli-selection-unavailable");
    }
  } catch (error) {
    const selection = error instanceof Error && error.message === "scenario-cli-selection-unavailable";
    const diagnostic = bvpDiagnostic({
      classification: selection ? "scenario-cli-selection-unavailable" : "scenario-cli-arguments-invalid",
      component: "battery-runner",
      phase: "scenario-selection", lastConfirmedBoundary: "cli-argv-received",
      firstUnconfirmedBoundary: "scenario-dispatch", effect: "none-confirmed",
      recommendedAction: selection ? "inspect-scenario-catalog" : "inspect-scenario-cli-arguments",
    });
    console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
    process.exitCode = 1;
    return;
  }
  // After preflight the request is always the verified execute variant.
  if (!request || request.kind !== "execute") return;
  let result!: ScenarioExecutionResult;
  try {
    const definition = getDeterministicScenario(request.scenarioId);
    if (!definition) throw new Error("scenario-catalog-changed");
    result = await DeterministicScenarioRunner.canonical().run(definition);
    if (result.scenarioId !== request.scenarioId ||
        !result.evidence || result.evidence.machine.scenarioId !== request.scenarioId ||
        result.evidence.machine.executionMode !== "deterministic" ||
        result.evidence.machine.verdict.status !== result.status) {
      throw new Error("scenario-result-identity-invalid");
    }
  } catch {
    const diagnostic = bvpDiagnostic({
      classification: "scenario-cli-execution-failed", component: "battery-runner",
      phase: "scenario-execution", lastConfirmedBoundary: "scenario-selected",
      firstUnconfirmedBoundary: "scenario-result-validated", effect: "unknown",
      recommendedAction: "inspect-sanitized-test-evidence",
      identity: { runId: "unavailable", scenarioId: request.scenarioId, stepIndex: null, executionMode: "deterministic", correlationToken: "unavailable" },
    });
    console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
    process.exitCode = 1;
    return;
  }

  // The runner's raw captures contain fixture/runtime data; publish only its existing
  // privacy-filtered canonical machine evidence. Never serialize the raw result.
  const machine = result.evidence!.machine; // Checked for presence and identity before this point.
  const envelope = {
    schemaVersion: 1,
    requestedScenarioId: request.scenarioId,
    executionMode: "deterministic" as const,
    result: {
      scenarioId: result.scenarioId,
      status: result.status,
      ...(machine.verdict.classification === undefined ? {} : { classification: machine.verdict.classification }),
      ...(machine.verdict.diagnostic === undefined ? {} : { diagnostic: machine.verdict.diagnostic }),
      evidence: machine,
    },
  };
  try {
    await mkdir(dirname(request.resultFile), { recursive: true });
    // Never destroy a previous verdict: a repeated invocation needs a fresh output path.
    await writeFile(request.resultFile, JSON.stringify(envelope, null, 2) + "\n",
      { encoding: "utf8", flag: "wx" });
  } catch {
    const diagnostic = bvpDiagnostic({
      classification: "scenario-result-persistence-failed", component: "battery-runner",
      phase: "result-persistence", lastConfirmedBoundary: "scenario-execution-finished",
      firstUnconfirmedBoundary: "result-file-write", effect: "none-confirmed",
      recommendedAction: "inspect-output-path",
      identity: { runId: "unavailable", scenarioId: request.scenarioId, stepIndex: null, executionMode: "deterministic", correlationToken: "unavailable" },
    });
    console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({
    scenarioId: result.scenarioId, status: result.status,
    ...(machine.verdict.classification === undefined ? {} : { classification: machine.verdict.classification }),
  }));
  process.exitCode = exitCodeForScenarioStatus(result.status);
}

if (require.main === module) {
  void main(process.argv.slice(2));
}
