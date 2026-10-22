/**
 * S09 Windows relay-route requirements — test first.
 *
 * The only physical controller is the existing PHX-CI focused-stage bridge.
 * This source is exercised through npm run test:bvp-root INSIDE PHX-CI;
 * it is not a standalone battery, launcher, or authority.
 */
import { strictEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import { getLiveBattery } from "./batteries/battery-registry";
import { scenarioDefinitionDigest } from "../src/scenario/scenario-checkpoint";
import {
  buildLiveRunnerArguments,
  type BridgeAttempt, type LiveRunnerPaths,
} from "./batteries/phxci-physical-bridge";

const battery = getLiveBattery("windows-live-smoke");
if (!battery) throw new Error("required Windows smoke battery missing");
const scenario = battery.createScenario();
const device = "device:sha256:" + "e".repeat(64);
const sourceCommit = "a".repeat(40);
const windowsVault = "D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b";
const pluginRelay = windowsVault + "\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay";
const scratch = "C:\\temp\\0123456789abcdef0123456789abcdef";
function attempt(): BridgeAttempt {
  return {
    schemaVersion: 1,
    battery: "windows-live-smoke",
    scenarioId: scenario.id,
    scenarioDigest: scenarioDefinitionDigest(scenario),
    bvpRunId: "bvp-s09-windows-smoke",
    phxRunId: "12345678-1234-4234-8234-1234567890ab",
    sourceCommit, artifactSha256: "f".repeat(64),
    deviceIds: { windows: device },
    attemptIndex: 1, mode: "initial", exitCode: 1,
    resultJson: JSON.stringify({
      battery: { name: "windows-live-smoke" },
      result: {
        scenarioId: scenario.id, status: "failed", classification: "not-dispatched",
        steps: [],
      },
    }),
  };
}
function paths(): LiveRunnerPaths & { physicalPluginRelayRoot: string } {
  return {
    relayRoot: pluginRelay,
    physicalPluginRelayRoot: pluginRelay,
    checkpointFile: scratch + "\\checkpoint.json",
    resultFile: scratch + "\\result.json",
    buildIdentityFile: scratch + "\\installed\\build-identity.json",
  };
}
test("PHX BVP Windows controller shares the installed plugin's actual D: relay, without a second relay directory", () => {
  const args = buildLiveRunnerArguments(attempt(), paths());
  strictEqual(args[args.indexOf("--relay-root") + 1], pluginRelay);
  strictEqual(args[args.indexOf("--result-file") + 1], scratch + "\\result.json");
});
test("unapproved D: relay cannot bypass disposable C: scratch requirements", () => {
  const p = paths();
  throws(() => buildLiveRunnerArguments(attempt(), { ...p, physicalPluginRelayRoot: "" }),
    /relay|scratch|scope|root|approval|physical/i);
  throws(() => buildLiveRunnerArguments(attempt(), { ...p, physicalPluginRelayRoot: undefined } as LiveRunnerPaths),
    /relay|scratch|scope|root|approval|physical/i);
});
test("a different relay directory or personal vault cannot be selected by owner text alone", () => {
  const p = paths();
  const wrong = [
    "D:\\Users\\private\\notes\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay",
    "D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\\.obsidian\\plugins\\other-plugin\\.bvp-relay",
    "D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\\.obsidian\\plugins\\brain-google-drive-sync\\..\\.bvp-relay",
    "\\\\server\\some\\vault\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay",
  ];
  for (const relayRoot of wrong) {
    throws(() => buildLiveRunnerArguments(attempt(), { ...p, relayRoot, physicalPluginRelayRoot: relayRoot }),
      /relay|scratch|scope|root|path|physical/i, relayRoot);
  }
});
test("scratch result and installed-identity files cannot escape the same unique C: run root", () => {
  const p = paths();
  throws(() => buildLiveRunnerArguments(attempt(), { ...p, resultFile: "C:\\temp\\aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\result.json" }),
    /relay|scratch|scope|root|path/i);
  throws(() => buildLiveRunnerArguments(attempt(), { ...p, buildIdentityFile: windowsVault + "\\build-identity.json" }),
    /relay|scratch|scope|root|path/i);
});
test("unrelated battery cannot use Windows-only installed-plugin relay exception", () => {
  const p = paths();
  const other = getLiveBattery("s09a-windows-initial-sync");
  if (!other) throw Error("S09A battery missing");
  throws(() => buildLiveRunnerArguments({
    ...attempt(), battery: other.name, scenarioId: other.createScenario().id,
    scenarioDigest: scenarioDefinitionDigest(other.createScenario()),
  }, p), /relay|physical|scope|battery|smoke|approved/i);
});
