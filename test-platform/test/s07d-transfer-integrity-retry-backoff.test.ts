import assert from "node:assert/strict";
import test from "node:test";

import { GoogleOAuthSession, ObsidianSecretStore } from "../../src/drive/auth";
import { GoogleHttpTransport } from "../../src/drive/transport";
import { REQUIRED_DRIVE_SCOPE } from "../../src/contracts/google-drive";
import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { uploadIntegrityScenario } from "../scenarios/07d/upload-integrity";
import { downloadIntegrityScenario } from "../scenarios/07d/download-integrity";
import { localSourceChangedAfterPreviewScenario } from "../scenarios/07d/local-source-changed-after-preview";
import { remoteSourceChangedAfterPreviewScenario } from "../scenarios/07d/remote-source-changed-after-preview";
import { transientRemoteFailureScenario } from "../scenarios/07d/transient-remote-failure";

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string) { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string) { this.values.set(id, value); }
  deleteSecret(id: string) { this.values.delete(id); }
}

function session(fetcher: typeof fetch = fetch) {
  const backing = new MemorySecrets();
  backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "access",
    refreshToken: "refresh",
    expiresAtMs: Date.now() + 3_600_000,
    tokenType: "Bearer",
    scope: REQUIRED_DRIVE_SCOPE,
  }));
  return new GoogleOAuthSession(
    { clientId: "client", redirectUri: "https://callback.invalid" },
    new ObsidianSecretStore(backing),
    fetcher,
  );
}

const scenarios = [
  uploadIntegrityScenario,
  downloadIntegrityScenario,
  localSourceChangedAfterPreviewScenario,
  remoteSourceChangedAfterPreviewScenario,
  transientRemoteFailureScenario,
];

for (const scenario of scenarios) {
  test(`${scenario.id} executes transfer safety semantics through production logic`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    assert.equal(result.status, "completed", JSON.stringify(result, null, 2));
    assert.equal(result.steps.every(step => step.matchedExpectation), true);
  });
}

test("upload and download observations prove end-to-end content identity", async () => {
  for (const scenario of [uploadIntegrityScenario, downloadIntegrityScenario]) {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    assert.equal(result.status, "completed", JSON.stringify(result, null, 2));
    const local = result.captures.local as { hash?: string; sizeBytes?: number };
    const remote = result.captures.remote as { hash?: string; sizeBytes?: number };
    assert.equal(typeof local.hash, "string");
    assert.equal(local.hash, remote.hash);
    assert.equal(local.sizeBytes, remote.sizeBytes);
  }
});

test("source changes after preview are rejected as stale and later reconcile transfers only current bytes", async () => {
  const localRace = await DeterministicScenarioRunner.canonical().run(localSourceChangedAfterPreviewScenario);
  assert.equal(localRace.status, "completed", JSON.stringify(localRace, null, 2));
  const localAfter = localRace.captures["local-after"] as { hash?: string; sizeBytes?: number };
  const remoteAfter = localRace.captures["remote-after"] as { hash?: string; sizeBytes?: number };
  assert.equal(localAfter.hash, remoteAfter.hash);
  assert.equal(localAfter.sizeBytes, 2);
  assert.equal(remoteAfter.sizeBytes, 2);

  const remoteRace = await DeterministicScenarioRunner.canonical().run(remoteSourceChangedAfterPreviewScenario);
  assert.equal(remoteRace.status, "completed", JSON.stringify(remoteRace, null, 2));
  const remoteCurrent = remoteRace.captures["remote-after"] as { hash?: string; sizeBytes?: number };
  const localCurrent = remoteRace.captures["local-after"] as { hash?: string; sizeBytes?: number };
  assert.equal(localCurrent.hash, remoteCurrent.hash);
  assert.equal(localCurrent.sizeBytes, 2);
  assert.equal(remoteCurrent.sizeBytes, 2);
});

test("retry-safe transient failures use deterministic bounded exponential backoff", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const transport = new GoogleHttpTransport(
    session(),
    async () => {
      calls += 1;
      if (calls < 3) throw new TypeError("temporary network failure");
      return new Response("{}", { status: 200 });
    },
    { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, maxConcurrency: 1 },
    async ms => { sleeps.push(ms); },
    () => 0,
    () => 0,
  );
  const result = await transport.request("https://www.googleapis.com/drive/v3/files/file-id", { method: "GET" });
  assert.equal(result.ok, true);
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [50, 100]);
});

test("retry exhaustion is bounded and remains a transient terminal classification", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const transport = new GoogleHttpTransport(
    session(),
    async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { message: "unavailable" } }), { status: 503, headers: { "content-type": "application/json" } });
    },
    { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 1000, maxConcurrency: 1 },
    async ms => { sleeps.push(ms); },
    () => 0,
    () => 0,
  );
  const result = await transport.request("https://www.googleapis.com/drive/v3/files/file-id", { method: "GET" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.signal.kind, "transient-failure");
  assert.equal(calls, 3);
  assert.deepEqual(sleeps, [50, 100]);
});

test("permanent permission failure is not retried", async () => {
  let calls = 0;
  const transport = new GoogleHttpTransport(
    session(),
    async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { message: "forbidden" } }), { status: 403, headers: { "content-type": "application/json" } });
    },
    { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 1000, maxConcurrency: 1 },
    async () => { throw new Error("permanent failure must not sleep"); },
    () => 0,
    () => 0,
  );
  const result = await transport.request("https://www.googleapis.com/drive/v3/files/file-id", { method: "GET" });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.signal.kind, "permission-denied");
  assert.equal(calls, 1);
});

test("rate limit honors provider Retry-After and quota exhaustion is not retried", async () => {
  let rateCalls = 0;
  const sleeps: number[] = [];
  const rateTransport = new GoogleHttpTransport(
    session(),
    async () => {
      rateCalls += 1;
      return rateCalls === 1
        ? new Response(JSON.stringify({ error: { errors: [{ reason: "rateLimitExceeded" }] } }), { status: 429, headers: { "retry-after": "2", "content-type": "application/json" } })
        : new Response("{}", { status: 200 });
    },
    { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100, maxConcurrency: 1 },
    async ms => { sleeps.push(ms); },
    () => 0,
    () => 0,
  );
  const rateResult = await rateTransport.request("https://www.googleapis.com/drive/v3/files/file-id", { method: "GET" });
  assert.equal(rateResult.ok, true);
  assert.equal(rateCalls, 2);
  assert.deepEqual(sleeps, [2000]);

  let quotaCalls = 0;
  const quotaTransport = new GoogleHttpTransport(session(), async () => {
    quotaCalls += 1;
    return new Response(JSON.stringify({ error: { errors: [{ reason: "storageQuotaExceeded" }] } }), { status: 403, headers: { "content-type": "application/json" } });
  });
  const quotaResult = await quotaTransport.request("https://www.googleapis.com/drive/v3/files/file-id", { method: "GET" });
  assert.equal(quotaResult.ok, false);
  if (!quotaResult.ok) assert.equal(quotaResult.signal.kind, "quota-exhausted");
  assert.equal(quotaCalls, 1);
});

test("wrong retry expectation fails deterministically", async () => {
  const steps = transientRemoteFailureScenario.steps.map(step =>
    step.id === "assert-not-fabricated" ? { ...step, expected: true } : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = { ...transientRemoteFailureScenario, id: "s07d-wrong-retry-expectation", steps } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  assert.equal(result.status, "failed");
  assert.equal(result.classification, "assertion-mismatch");
});
