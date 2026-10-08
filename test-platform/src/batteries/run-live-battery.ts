import { DeterministicScenarioRunner } from "../scenario/scenario-runner";
import { createLiveScenarioExecutor } from "../live-device/live-scenario-executor";
import { getLiveBattery, listLiveBatteryNames } from "./battery-registry";

function requiredArg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`missing required argument ${name}`);
  return value;
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
    entries.some(([label, deviceId]) => label.trim().length === 0 || typeof deviceId !== "string" || deviceId.trim().length === 0)
  ) {
    throw new Error("--device-map-json must map non-empty labels to non-empty device IDs");
  }
  return Object.fromEntries(entries) as Readonly<Record<string, string>>;
}

async function main(): Promise<void> {
  const batteryName = requiredArg("--battery");
  const battery = getLiveBattery(batteryName);
  if (!battery) {
    throw new Error(
      `unknown battery '${batteryName}'. available batteries: ${listLiveBatteryNames().join(", ")}`,
    );
  }

  const scenario = battery.createScenario();
  const executor = await createLiveScenarioExecutor({
    scenario,
    runId: requiredArg("--run-id"),
    deviceIds: deviceMapArg(),
    relayRoot: requiredArg("--relay-root"),
    checkpointFile: requiredArg("--checkpoint-file"),
    expectedValidationSourceCommit: requiredArg("--validation-source-commit"),
    resultTimeoutMs: positiveIntegerArg("--result-timeout-ms", 60_000),
    pollIntervalMs: positiveIntegerArg("--poll-interval-ms", 250),
  });

  const result = await new DeterministicScenarioRunner({}, executor).run(scenario);
  console.log(JSON.stringify({
    battery: {
      name: battery.name,
      description: battery.description,
    },
    result,
  }, null, 2));

  process.exitCode = result.status === "completed" ? 0 : 1;
}

main().catch(error => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
