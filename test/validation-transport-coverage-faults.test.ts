import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type RemoteObjectId, type VaultPath } from "../src/contracts/common";
import { REQUIRED_DRIVE_SCOPE, type DriveSignal, type RemoteListing } from "../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore, type SecretStorageLike } from "../src/drive/auth";
import { GoogleHttpTransport, type RetryPolicy } from "../src/drive/transport";
import { validationFaultSpecification } from "../src/validation/driver-plan-fault-verifier-contracts";
import { validationRunIdentity, validationStepId } from "../src/validation/run-sandbox-checkpoint-contracts";
import {
  ValidationRemoteEnumerationFaultAdapter,
  ValidationTransportCoverageFaultSchedule,
  validationTransportFaultFetch,
} from "../src/validation/transport-coverage-faults";

const transportRun = validationRunIdentity("run-vh10-e06", "E06");
const transportStep = validationStepId("transport-faults");
const enumerationRun = validationRunIdentity("run-vh10-e04", "E04");
const enumerationStep = validationStepId("remote-enumeration");

const singleAttemptPolicy: RetryPolicy = {
  maxAttempts: 1,
  baseDelayMs: 0,
  maxDelayMs: 0,
  maxConcurrency: 1,
};

class MemorySecrets implements SecretStorageLike {
  private readonly values = new Map<string, string>();
  getSecret(id: string): string | null { return this.values.get(id) ?? null; }
  setSecret(id: string, secret: string): void { this.values.set(id, secret); }
  deleteSecret(id: string): void { this.values.delete(id); }
}

function oauthWithValidToken(): GoogleOAuthSession {
  const secrets = new ObsidianSecretStore(new MemorySecrets());
  secrets.set(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "validation-access-token",
    expiresAtMs: 3_600_000,
    tokenType: "Bearer",
    scope: REQUIRED_DRIVE_SCOPE,
  }));
  return new GoogleOAuthSession(
    { clientId: "validation-client", redirectUri: "https://validation.invalid/callback" },
    secrets,
    async () => new Response("unexpected-oauth-fetch", { status: 500 }),
    () => 0,
  );
}

function transportSchedule(kind: "transport-offline" | "authentication-required" | "rate-limited" | "quota-exhausted", occurrences = [1]): ValidationTransportCoverageFaultSchedule {
  return new ValidationTransportCoverageFaultSchedule(
    transportRun,
    transportStep,
    occurrences.map(occurrence => validationFaultSpecification({ run: transportRun, stepId: transportStep, kind, occurrence })),
  );
}

async function classifiedSignal(kind: "transport-offline" | "authentication-required" | "rate-limited" | "quota-exhausted"): Promise<DriveSignal> {
  let delegateCalls = 0;
  const schedule = transportSchedule(kind);
  const fetcher = validationTransportFaultFetch(async () => {
    delegateCalls++;
    return new Response("delegate", { status: 200 });
  }, schedule);
  const transport = new GoogleHttpTransport(oauthWithValidToken(), fetcher, singleAttemptPolicy, async () => undefined, () => 0, () => 0);
  const result = await transport.request("https://www.googleapis.com/drive/v3/files");
  assert.equal(delegateCalls, 0);
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected injected transport failure.");
  assert.equal(schedule.history().length, 1);
  assert.equal(schedule.history()[0].status, "triggered-pre-dispatch");
  return result.signal;
}

test("VH10 activation is exact-run/exact-step bound and rejects peer fault ownership", () => {
  const wrongRun = validationRunIdentity("run-vh10-other", "E06");
  assert.throws(() => new ValidationTransportCoverageFaultSchedule(
    transportRun,
    transportStep,
    [validationFaultSpecification({ run: wrongRun, stepId: transportStep, kind: "transport-offline" })],
  ), /active validation run and scenario/);

  assert.throws(() => new ValidationTransportCoverageFaultSchedule(
    transportRun,
    transportStep,
    [validationFaultSpecification({ run: transportRun, stepId: validationStepId("other-step"), kind: "rate-limited" })],
  ), /active validation step/);

  assert.throws(() => new ValidationTransportCoverageFaultSchedule(
    transportRun,
    transportStep,
    [validationFaultSpecification({ run: transportRun, stepId: transportStep, kind: "post-dispatch-response-loss" })],
  ), /does not own validation fault kind/);
});

test("offline injection is deterministic across configured repeated occurrences and then delegates unchanged", async () => {
  const schedule = transportSchedule("transport-offline", [1, 2]);
  let delegateCalls = 0;
  const response = new Response("ok", { status: 200 });
  const delegate = async () => { delegateCalls++; return response; };
  const fetcher = validationTransportFaultFetch(delegate, schedule);

  await assert.rejects(() => fetcher("https://www.googleapis.com/drive/v3/files"), /validation-injected-offline/);
  await assert.rejects(() => fetcher("https://www.googleapis.com/drive/v3/files"), /validation-injected-offline/);
  assert.equal(await fetcher("https://www.googleapis.com/drive/v3/files"), response);
  assert.equal(delegateCalls, 1);
  assert.deepEqual(schedule.history().map(result => result.status), ["triggered-pre-dispatch", "triggered-pre-dispatch"]);
});

test("validation transport wrapper is behavior-neutral when no fault occurrence is armed", async () => {
  const schedule = new ValidationTransportCoverageFaultSchedule(transportRun, transportStep, []);
  const input = new URL("https://www.googleapis.com/drive/v3/files?q=safe");
  const init: RequestInit = { method: "POST", body: "payload" };
  const response = new Response("unchanged", { status: 200 });
  let seenInput: RequestInfo | URL | undefined;
  let seenInit: RequestInit | undefined;
  const fetcher = validationTransportFaultFetch(async (actualInput, actualInit) => {
    seenInput = actualInput;
    seenInit = actualInit;
    return response;
  }, schedule);

  assert.equal(await fetcher(input, init), response);
  assert.equal(seenInput, input);
  assert.equal(seenInit, init);
  assert.deepEqual(schedule.history(), []);
});

test("injected HTTP/network causes retain GoogleHttpTransport production classifications", async () => {
  assert.deepEqual(await classifiedSignal("transport-offline"), { kind: "transient-failure", detail: "network-failure" });
  assert.deepEqual(await classifiedSignal("authentication-required"), { kind: "authentication-required", detail: "google-rejected-token" });
  assert.deepEqual(await classifiedSignal("rate-limited"), { kind: "rate-limited", retryAfterMs: 1_000 });
  assert.deepEqual(await classifiedSignal("quota-exhausted"), { kind: "quota-exhausted", detail: "storageQuotaExceeded" });
});

test("one-shot rate limit uses the production bounded retry path before succeeding", async () => {
  const schedule = transportSchedule("rate-limited");
  let delegateCalls = 0;
  const sleeps: number[] = [];
  const fetcher = validationTransportFaultFetch(async () => {
    delegateCalls++;
    return new Response("ok", { status: 200 });
  }, schedule);
  const transport = new GoogleHttpTransport(
    oauthWithValidToken(),
    fetcher,
    { ...singleAttemptPolicy, maxAttempts: 2 },
    async ms => { sleeps.push(ms); },
    () => 0,
    () => 0,
  );

  const result = await transport.request("https://www.googleapis.com/drive/v3/files");
  assert.equal(result.ok, true);
  assert.equal(delegateCalls, 1);
  assert.deepEqual(sleeps, [1_000]);
  assert.equal(schedule.history().length, 1);
});

function remoteObjectId(value: string): RemoteObjectId {
  return contractId<"RemoteObjectId">(value) as RemoteObjectId;
}

function vaultPath(value: string): VaultPath {
  return contractId<"VaultPath">(value) as VaultPath;
}

const completeListing: RemoteListing = {
  entries: [
    { path: vaultPath("alpha.md"), entityKind: "file", remoteObjectId: remoteObjectId("remote-alpha"), trashed: false },
    { path: vaultPath("beta.md"), entityKind: "file", remoteObjectId: remoteObjectId("remote-beta"), trashed: false },
  ],
  completeness: { status: "complete" },
};

test("partial-enumeration injection truncates observations, marks partial, and is repeat-deterministic", async () => {
  const schedule = new ValidationTransportCoverageFaultSchedule(
    enumerationRun,
    enumerationStep,
    [1, 2].map(occurrence => validationFaultSpecification({
      run: enumerationRun,
      stepId: enumerationStep,
      kind: "partial-remote-enumeration",
      occurrence,
    })),
  );
  let delegateCalls = 0;
  const adapter = new ValidationRemoteEnumerationFaultAdapter({
    async listForReconciliation() {
      delegateCalls++;
      return { ok: true, value: completeListing };
    },
  }, schedule);

  const first = await adapter.listForReconciliation(remoteObjectId("root"));
  const second = await adapter.listForReconciliation(remoteObjectId("root"));
  const third = await adapter.listForReconciliation(remoteObjectId("root"));

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, true);
  if (!first.ok || !second.ok || !third.ok) throw new Error("Expected successful listing observations.");
  assert.equal(first.value.entries.length, 1);
  assert.deepEqual(first.value.completeness, { status: "partial", reason: "validation-fault:partial-remote-enumeration" });
  assert.equal(second.value.entries.length, 1);
  assert.equal(second.value.completeness.status, "partial");
  assert.equal(third.value.entries.length, 2);
  assert.deepEqual(third.value.completeness, { status: "complete" });
  assert.equal(delegateCalls, 3);
  assert.deepEqual(schedule.history().map(result => result.status), ["triggered-non-mutation", "triggered-non-mutation"]);
});

test("enumeration adapter never masks a real production failure or an already-partial result", async () => {
  const failureSchedule = new ValidationTransportCoverageFaultSchedule(
    enumerationRun,
    enumerationStep,
    [validationFaultSpecification({ run: enumerationRun, stepId: enumerationStep, kind: "partial-remote-enumeration" })],
  );
  const failure = { ok: false, signal: { kind: "transient-failure", detail: "real-network-failure" } } as const;
  const failureAdapter = new ValidationRemoteEnumerationFaultAdapter({ async listForReconciliation() { return failure; } }, failureSchedule);
  assert.equal(await failureAdapter.listForReconciliation(remoteObjectId("root")), failure);
  assert.deepEqual(failureSchedule.history(), []);

  const partial: RemoteListing = { entries: completeListing.entries, completeness: { status: "partial", reason: "real-partial-listing" } };
  const partialSchedule = new ValidationTransportCoverageFaultSchedule(
    enumerationRun,
    enumerationStep,
    [validationFaultSpecification({ run: enumerationRun, stepId: enumerationStep, kind: "partial-remote-enumeration" })],
  );
  const partialAdapter = new ValidationRemoteEnumerationFaultAdapter({ async listForReconciliation() { return { ok: true, value: partial }; } }, partialSchedule);
  const observed = await partialAdapter.listForReconciliation(remoteObjectId("root"));
  assert.equal(observed.ok, true);
  if (!observed.ok) throw new Error("Expected partial listing passthrough.");
  assert.equal(observed.value, partial);
  assert.deepEqual(partialSchedule.history(), []);
});
