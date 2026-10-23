import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { bvpDiagnostic, safeUnexpectedFailure } from "../../src/scenario/scenario-diagnostics";

import { DeterministicScenarioRunner } from "../../src/scenario/scenario-runner";
import { createLiveScenarioExecutor } from "../../src/live-device/live-scenario-executor";
import { S09A_VALIDATION_ARTIFACTS } from "./s09a-validation-artifacts";
import { loadLateCompletionRecovery, withLateCompletionRecovery } from "./late-completion-recovery";
import type { ScenarioResumeEvidence } from "../../src/scenario/scenario-checkpoint";
import { getLiveBattery, listLiveBatteryNames } from "./battery-registry";

const RESUME_EVIDENCE = new Set<ScenarioResumeEvidence>([
  "human-confirmation",
  "external-observation",
  "production-result",
  "canonical-evidence",
]);

function requiredArg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`missing required argument ${name}`);
  return value;
}

function optionalArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

function positiveIntegerArg(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function deviceMapArg(): Readonly<Record<string, string>> {
  const raw = requiredArg("--device-map-json");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("--device-map-json must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--device-map-json must be a JSON object");
  }
  const entries = Object.entries(parsed);
  if (
    entries.length === 0 ||
    entries.some(([label, deviceId]) =>
      label.trim().length === 0 ||
      typeof deviceId !== "string" ||
      deviceId.trim().length === 0)
  ) {
    throw new Error("--device-map-json must map non-empty labels to non-empty device IDs");
  }
  return Object.fromEntries(entries) as Readonly<Record<string, string>>;
}

function resumeEvidenceArg(): readonly ScenarioResumeEvidence[] {
  const raw = optionalArg("--resume-evidence-json");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("--resume-evidence-json must be valid JSON");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.some(item => typeof item !== "string" || !RESUME_EVIDENCE.has(item as ScenarioResumeEvidence))
  ) {
    throw new Error("--resume-evidence-json must be an array of supported evidence tokens");
  }
  return [...new Set(parsed as ScenarioResumeEvidence[])].sort();
}

async function persistResult(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function main(): Promise<void> {
  const resultFile = requiredArg("--result-file");
  const batteryName = requiredArg("--battery");
  const battery = getLiveBattery(batteryName);
  if (!battery) {
    throw new Error(
      `unknown battery '${batteryName}'. available batteries: ${listLiveBatteryNames().join(", ")}`,
    );
  }

  const suppliedDevices = deviceMapArg();
  const missing = battery.requiredDeviceLabels.filter(label => !suppliedDevices[label]);
  if (missing.length > 0) {
    throw new Error(
      `battery '${batteryName}' requires device mapping(s): ${missing.join(", ")}`,
    );
  }
  const deviceIds = Object.fromEntries(
    battery.requiredDeviceLabels.map(label => [label, suppliedDevices[label]!]),
  );

  const scenario = battery.createScenario();
  const runId = requiredArg("--run-id");
  const relayRoot = requiredArg("--relay-root");
  const sourceCommit = requiredArg("--validation-source-commit");
  const identityPath = optionalArg("--validation-build-identity-file");
  const expectedBuild = identityPath ? JSON.parse(await readFile(identityPath, "utf8")) as Record<string,unknown> : undefined;
  if (expectedBuild && (expectedBuild.sourceCommit!==sourceCommit ||
      typeof expectedBuild.artifactSha256!=="string" || !/^[a-f0-9]{64}$/i.test(expectedBuild.artifactSha256) ||
      typeof expectedBuild.manifestSha256!=="string" || !/^[a-f0-9]{64}$/i.test(expectedBuild.manifestSha256))) {
    throw new Error("runner-installed-build-identity-invalid");
  }
  // The Windows participant retains its exact qualified 0.1.19 manifest.
  // The iOS BRAT install uses the same main.js/source but an exact 0.1.20-bvp.1
  // manifest. Never accept an arbitrary cross-device manifest or version string.
  const s09aDualInstalled = batteryName === "s09a-dual-device-readiness";
  if (s09aDualInstalled && !expectedBuild) {
    throw new Error("s09a-installed-build-identity-file-required");
  }
  if(s09aDualInstalled && (
      expectedBuild!.sourceCommit !== S09A_VALIDATION_ARTIFACTS.sourceCommit ||
      expectedBuild!.artifactSha256 !== S09A_VALIDATION_ARTIFACTS.artifactSha256 ||
      expectedBuild!.manifestSha256 !== S09A_VALIDATION_ARTIFACTS.windowsManifestSha256)) {
    throw new Error("s09a-installed-windows-build-not-on-release-allowlist");
  }
  const recoveryFile = optionalArg("--recover-timed-out-result-file");
  if (recoveryFile && resumeEvidenceArg().length !== 0) {
    throw new Error("late-completion recovery and human checkpoint resume are mutually exclusive");
  }
  const recovery = recoveryFile ? await loadLateCompletionRecovery({
    scenario, runId, deviceIds, sourceCommit, relayRoot, previousResultFile: recoveryFile,
  }) : undefined;
  const executor = await createLiveScenarioExecutor({
    scenario,
    runId,
    deviceIds,
    relayRoot,
    checkpointFile: requiredArg("--checkpoint-file"),
    checkpoints: battery.checkpoints,
    resumeEvidence: resumeEvidenceArg(),
    expectedValidationSourceCommit: sourceCommit,
    ...(expectedBuild ? {
      expectedValidationArtifactSha256: expectedBuild.artifactSha256 as string,
      expectedValidationManifestSha256: expectedBuild.manifestSha256 as string,
      ...(s09aDualInstalled ? {expectedValidationManifestSha256ByDevice: {
        windows: S09A_VALIDATION_ARTIFACTS.windowsManifestSha256,
        ios: S09A_VALIDATION_ARTIFACTS.iosManifestSha256,
      }} : {}),
    } : {}),
    resultTimeoutMs: positiveIntegerArg("--result-timeout-ms", 60_000),
    productionResultTimeoutMs: positiveIntegerArg("--production-result-timeout-ms", 600_000),
    pollIntervalMs: positiveIntegerArg("--poll-interval-ms", 250),
  });

  const result = await new DeterministicScenarioRunner({}, recovery ? withLateCompletionRecovery(executor, recovery) : executor).run(scenario);
  const checkpoint = executor.pendingCheckpoint();
  const envelope = {
    battery: {
      name: battery.name,
      description: battery.description,
      requiredDeviceLabels: battery.requiredDeviceLabels,
    },
    ...(checkpoint ? { checkpoint } : {}),
    ...(recovery ? { recovery: { kind: "verified-late-production-completion",
      originalVerdict: "blocked", originalClassification: "device-result-unavailable",
      originalResultFile: recoveryFile, completedStepIndex: recovery.completedStepIndex } } : {}),
    result,
    ...(expectedBuild ? { installationObservation: {
      sourceCommit, artifactSha256: expectedBuild.artifactSha256,
      manifestSha256: expectedBuild.manifestSha256,
      devices: executor.observedInstalledBuilds?.() ?? {},
    } } : {}),
  };

  await persistResult(resultFile, envelope);
  // Local result file retains the structured envelope; stdout must never expose
  // raw validation device identities, operator paths or payload details.
  console.log(JSON.stringify({
    battery:battery.name,scenarioId:result.scenarioId,
    status:result.status,classification:result.classification??"completed",
  }));
  process.exitCode = result.status === "completed" ? 0 : checkpoint ? 3 : 1;
}

main().catch(async error => {
  const failure = safeUnexpectedFailure(error, {
    component: "battery-runner", phase: "battery-preflight",
    lastConfirmedBoundary: "battery-entrypoint",
    firstUnconfirmedBoundary: "battery-execution",
  }, "battery-runner-exception");
  const resultFile = optionalArg("--result-file");
  if (resultFile) {
    try {
      await persistResult(resultFile, {
        battery: { name: "unresolved" },
        result: failure,
      });
    } catch {
      const diagnostic=bvpDiagnostic({
        classification:"result-persistence-failed",component:"battery-runner",
        phase:"result-persistence",lastConfirmedBoundary:"battery-failure-classified",
        firstUnconfirmedBoundary:"result-file-write",effect:"unknown",
        recommendedAction:"inspect-output-path",
      });
      console.error("BVP_DIAGNOSTIC "+JSON.stringify(diagnostic));
    }
  }
  console.error("BVP_DIAGNOSTIC " + JSON.stringify(failure.diagnostic));
  process.exitCode = 1;
});
