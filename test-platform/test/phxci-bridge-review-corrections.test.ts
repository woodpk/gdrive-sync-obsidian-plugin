/**
 * S09-BR02 Reviewer-return RED regressions, authored BEFORE BR01 corrections.
 * Reviewer findings: BR02-F01 through F05, source report immutable at
 * b5250ef86145e389d3cdbc214c38054718d36713.
 *
 * PHX-CI ONLY: these expectations initially fail on the reviewed source.
 * Do not change or weaken them merely to force a PASS. F05 additionally
 * requires TWO GENUINE PHX-CI invocations driving the actual BVP runner and
 * a nonphysical simulated-device relay; synthetic envelope tests alone
 * cannot satisfy that external acceptance requirement.
 */
import { deepStrictEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import { getLiveBattery } from "./batteries/battery-registry";
import { scenarioDefinitionDigest } from "../src/scenario/scenario-checkpoint";
import {
  buildLiveRunnerArguments, encodeBridgeAttempt,
  type BridgeAttempt, type LiveRunnerPaths,
} from "./batteries/phxci-physical-bridge";

const selected = "s09c-offline-reconnect";
const battery = getLiveBattery(selected);
if (!battery) throw new Error("review correction fixture requires actual registered S09C battery");
const actualScenario = battery.createScenario();
const actualDigest = scenarioDefinitionDigest(actualScenario);
const devices = { windows: "device:synthetic-windows", ios: "device:synthetic-ios" };
const sourceCommit = "a".repeat(40);
const logicalId = "bvp-review-regression";
const phxRun = "69416a2d-4a67-4388-b123-540a2f3e3d17";
const artifact = "f".repeat(64);
const fixtureResult = (status: "completed" | "blocked"): string => JSON.stringify({
  battery: { name: selected },
  result: {
    scenarioId: actualScenario.id,
    status, steps: [],
    evidence: {
      machine: {
        schemaVersion: 1,
        scenarioId: actualScenario.id,
        executionMode: "live",
        deviceIdentities: Object.values(devices).sort(),
        liveIdentity: { runId: logicalId, sourceCommit },
        verdict: { status },
      },
    },
  },
});
function completed(): BridgeAttempt {
  return {
    schemaVersion: 1, mode: "initial", attemptIndex: 1,
    bvpRunId: logicalId, phxRunId: phxRun,
    battery: selected, scenarioId: actualScenario.id,
    scenarioDigest: actualDigest, sourceCommit,
    artifactSha256: artifact, deviceIds: devices,
    exitCode: 0, resultJson: fixtureResult("completed"),
  };
}
const safePaths: LiveRunnerPaths = {
  relayRoot: "C:\\temp\\abcdefabcdefabcdefabcdefabcdefab\\relay",
  checkpointFile: "C:\\temp\\abcdefabcdefabcdefabcdefabcdefab\\checkpoint.json",
  resultFile: "C:\\temp\\abcdefabcdefabcdefabcdefabcdefab\\result.json",
};

test("BR02-F01: fake caller-selected artifact SHA without any observed installed main.js/manifest proof cannot be published", () => {
  const candidate = completed();
  // Syntactic 64-hex validation cannot attest real installed bytes. This
  // assertion deliberately forces the implementation to demand a distinct
  // authenticated attestation of BOTH main.js and manifest.json.
  throws(
    () => encodeBridgeAttempt(candidate),
    /installed|attest|manifest|artifact.*(proof|identity|unverified)|authorization|unbound/i,
  );
});

test("BR02-F02: a completed attempt cannot claim another valid SHA256 scenario digest for its registered battery", () => {
  const candidate = completed();
  const forged = { ...candidate, scenarioDigest: "sha256:" + "1".repeat(64) };
  throws(
    () => encodeBridgeAttempt(forged),
    /scenario|digest|registered|identity|mismatch/i,
  );
});

test("BR02-F02: the registered battery's scenario ID and required device labels must be bound for success", () => {
  const candidate = completed();
  throws(
    () => encodeBridgeAttempt({
      ...candidate,
      deviceIds: { windows: devices.windows },
      resultJson: JSON.stringify({
        ...JSON.parse(candidate.resultJson),
        result: {
          ...JSON.parse(candidate.resultJson).result,
          evidence: {
            machine: {
              ...JSON.parse(candidate.resultJson).result.evidence.machine,
              deviceIdentities: [devices.windows],
            },
          },
        },
      }),
    }),
    /battery|device|labels|required|scenario|identity/i,
  );
});

test("BR02-F03: unknown observer names nested under otherwise allowed machine evidence must be rejected", () => {
  const candidate = completed();
  const raw = JSON.parse(candidate.resultJson);
  raw.result.evidence.machine.observerName = "Jane Doe";
  throws(
    () => encodeBridgeAttempt({ ...candidate, resultJson: JSON.stringify(raw) }),
    /privacy|unexpected|field|allowlist|sensitive|unapproved/i,
  );
});

test("BR02-F03: unknown user content nested under captures and steps cannot be transported as PHX stdout", () => {
  const candidate = completed();
  const raw = JSON.parse(candidate.resultJson);
  raw.result.captures = { noteBody: "# private client narrative" };
  throws(
    () => encodeBridgeAttempt({ ...candidate, resultJson: JSON.stringify(raw) }),
    /privacy|unexpected|allowlist|sensitive|private|result/i,
  );
});

test("BR02-F04: arbitrary absolute relay root outside approved isolated C temp scope is forbidden", () => {
  const candidate = completed();
  const escapes = [
    "\\\\server\\personal-vault\\relay",
    "C:\\Users\\Public\\Documents\\personal-vault",
    "C:\\temp\\..\\Users\\private\\vault",
    "D:\\Obsidian\\private",
  ];
  for (const path of escapes) {
    throws(
      () => buildLiveRunnerArguments(candidate, { ...safePaths, relayRoot: path }),
      /relay|scope|path|scratch|boundary|root|outside/i,
      path,
    );
  }
});

test("BR02-F04: result/checkpoint must be isolated with relay in the same approved attempt root", () => {
  const candidate = completed();
  const outOfRoot: LiveRunnerPaths = {
    relayRoot: "C:\\temp\\unrelated-run\\relay",
    checkpointFile: safePaths.checkpointFile,
    resultFile: safePaths.resultFile,
  };
  throws(() => buildLiveRunnerArguments(candidate, outOfRoot), /relay|root|scope|attempt|path|isolat/i);
});

test("BR02-F05: existing BVP runner remains the only live scenario engine; synthetic PHX probe is not runner proof", () => {
  const candidate = completed();
  const args = buildLiveRunnerArguments(candidate, safePaths);
  const arg = (name: string) => args[args.indexOf(name) + 1];
  deepStrictEqual([arg("--battery"), arg("--run-id"), arg("--validation-source-commit")],
    [selected, logicalId, sourceCommit]);
  // Further actual PHX two-run integration is an additional executable
  // acceptance task and cannot be substituted by this static contract test.
});
