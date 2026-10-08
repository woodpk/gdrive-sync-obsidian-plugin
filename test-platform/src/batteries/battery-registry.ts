import type { ScenarioDefinition } from "../scenario/scenario-contract";
import { createWindowsLiveSmokeScenario } from "./windows-live-smoke";

export interface LiveBatteryDefinition {
  readonly name: string;
  readonly description: string;
  createScenario(): ScenarioDefinition;
}

const LIVE_BATTERIES: Readonly<Record<string, LiveBatteryDefinition>> = Object.freeze({
  "windows-live-smoke": {
    name: "windows-live-smoke",
    description:
      "Observe the live Windows product state and verify one bounded local fixture round-trip.",
    createScenario: createWindowsLiveSmokeScenario,
  },
});

export function listLiveBatteryNames(): readonly string[] {
  return Object.keys(LIVE_BATTERIES).sort();
}

export function getLiveBattery(name: string): LiveBatteryDefinition | undefined {
  return LIVE_BATTERIES[name];
}
