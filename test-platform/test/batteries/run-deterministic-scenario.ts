import { mkdir, open } from "node:fs/promises";
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
  let request: Request;
  try {
    request = parseRequest(argv);
  } catch {
    const diagnostic = bvpDiagnostic({
      classification: "scenario-cli-arguments-invalid", component: "battery-runner",
      phase: "scenario-selection", lastConfirmedBoundary: "cli-argv-received",
      firstUnconfirmedBoundary: "scenario-dispatch", effect: "none-confirmed",
      recommendedAction: "inspect-scenario-cli-arguments",
    });
    console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
    process.exitCode = 1;
    return;
  }
  if (request.kind === "list") {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1, scenarios: listDeterministicScenarios(),
    }) + "\n");
    return;
  }

  // Reserve the complete result destination BEFORE scenario lookup or execution.
  // Exclusive wx provides cross-process collision protection without prechecking
  // and racing. A stranded empty/incomplete reservation can never claim PASS.
  let output!: Awaited<ReturnType<typeof open>>;
  try {
    await mkdir(dirname(request.resultFile), { recursive: true });
    output = await open(request.resultFile, "wx");
  } catch {
    const diagnostic = bvpDiagnostic({
      classification: "scenario-result-persistence-failed", component: "battery-runner",
      phase: "result-reservation", lastConfirmedBoundary: "cli-argv-validated",
      firstUnconfirmedBoundary: "result-file-exclusive-open", effect: "none-confirmed",
      recommendedAction: "inspect-output-path",
      identity: { runId: "unavailable", scenarioId: request.scenarioId,
        stepIndex: null, executionMode: "deterministic", correlationToken: "unavailable" },
    });
    console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
    process.exitCode = 1;
    return;
  }

  const diagnosticFor = (classification: string, phase: string,
    lastConfirmedBoundary: string, firstUnconfirmedBoundary: string,
    effect: "none-confirmed" | "unknown", recommendedAction: string) => bvpDiagnostic({
    classification, component: "battery-runner", phase,
    lastConfirmedBoundary, firstUnconfirmedBoundary, effect, recommendedAction,
    identity: { runId: "unavailable", scenarioId: request.scenarioId,
      stepIndex: null, executionMode: "deterministic", correlationToken: "unavailable" },
  });

  // A request-level rejection is NOT a canonical scenario result: the runner
  // was never called, so do not synthesize a machine verdict or evidence.
  const rejected = (diagnostic: ReturnType<typeof bvpDiagnostic>) => ({
    schemaVersion: 1, requestedScenarioId: request.scenarioId,
    executionMode: "deterministic" as const,
    requestStatus: "rejected" as const, result: null, diagnostic,
  });

  try {
    const selected = getDeterministicScenario(request.scenarioId);
    if (!selected || !selected.executionModes.includes("deterministic") ||
        selected.executionModes.includes("live")) {
      const diagnostic = diagnosticFor("scenario-cli-selection-unavailable",
        "scenario-selection", "cli-argv-validated", "scenario-dispatch",
        "none-confirmed", "inspect-scenario-catalog");
      await output.writeFile(JSON.stringify(rejected(diagnostic), null, 2) + "\n", "utf8");
      console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
      process.exitCode = 1;
      return;
    }

    let result!: ScenarioExecutionResult;
    try {
      result = await DeterministicScenarioRunner.canonical().run(selected);
      if (result.scenarioId !== request.scenarioId ||
          !result.evidence || result.evidence.machine.scenarioId !== request.scenarioId ||
          result.evidence.machine.executionMode !== "deterministic" ||
          result.evidence.machine.verdict.status !== result.status) {
        throw new Error("scenario-result-identity-invalid");
      }
    } catch {
      const diagnostic = diagnosticFor("scenario-cli-execution-failed",
        "scenario-execution", "scenario-selected", "scenario-result-validated",
        "unknown", "inspect-sanitized-test-evidence");
      await output.writeFile(JSON.stringify(rejected(diagnostic), null, 2) + "\n", "utf8");
      console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
      process.exitCode = 1;
      return;
    }

    const machine = result.evidence!.machine;
    // Never expose raw captures; the runner's machine evidence is already
    // privacy-filtered by the canonical evidence subsystem.
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
    await output.writeFile(JSON.stringify(envelope, null, 2) + "\n", "utf8");
    console.log(JSON.stringify({
      scenarioId: result.scenarioId, status: result.status,
      ...(machine.verdict.classification === undefined ? {} : { classification: machine.verdict.classification }),
    }));
    process.exitCode = exitCodeForScenarioStatus(result.status);
  } catch {
    const diagnostic = diagnosticFor("scenario-result-persistence-failed",
      "result-persistence", "result-file-reserved", "result-file-write",
      "unknown", "inspect-output-path");
    console.error("BVP_DIAGNOSTIC " + JSON.stringify(diagnostic));
    process.exitCode = 1;
  } finally {
    try { await output.close(); } catch { process.exitCode = 1; }
  }
}

if (require.main === module) {
  void main(process.argv.slice(2));
}
