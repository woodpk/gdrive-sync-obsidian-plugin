import assert from "node:assert/strict";
import test from "node:test";
import type { PlannedOperation } from "../src/contracts";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";
import { DiagnosticLogger } from "../src/diagnostics/diagnostic-logger";
import {
  RequestAttributionMonitor, registerRequestAttributionMonitor,
  type RequestAttributionScope,
} from "../src/diagnostics/request-attribution";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleHttpTransport } from "../src/drive/transport";

function logger(level: "info" | "off" = "info"): DiagnosticLogger {
  return new DiagnosticLogger({
    persistence: { loadDiagnostics: async () => undefined, saveDiagnostics: async () => undefined },
    level, retentionLimit: 100, consoleMirror: false, platform: "desktop",
    now: () => new Date("2026-10-09T14:00:00.000Z"),
    monotonicNow: () => 0,
  });
}
function operation(id: string): PlannedOperation {
  return { operationId: id, kind: "upload-create", path: "PRIVATE-NOTE-NAME",
    targetSide: "remote", destructive: false, preconditions: [], reasons: [] } as unknown as PlannedOperation;
}
function session(): GoogleOAuthSession {
  const secrets = new Map<string, string>();
  secrets.set(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({
    accessToken: "SECRET-ACCESS-TOKEN", refreshToken: "SECRET-REFRESH-TOKEN",
    expiresAtMs: Date.now() + 3_600_000, tokenType: "Bearer", scope: REQUIRED_DRIVE_SCOPE,
  }));
  const store = new ObsidianSecretStore({
    getSecret: id => secrets.get(id) ?? null,
    setSecret: (id, value) => { secrets.set(id, value); },
    deleteSecret: id => { secrets.delete(id); },
  });
  return new GoogleOAuthSession(
    { clientId: "test-client", redirectUri: "https://callback.example/" }, store,
  );
}
const policy = { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1, maxConcurrency: 4 };

function context(scope: RequestAttributionScope, purpose: RequestAttributionScope["purpose"]): RequestAttributionScope {
  return Object.freeze({ ...scope, purpose });
}
function snapshots(diagnostics: DiagnosticLogger) {
  return diagnostics.snapshot().filter(entry => entry.component === "sync.attribution");
}

test("S09A exact HTTP counts, retries, and semantic caller categories reconcile against fake transport", async () => {
  const diagnostics = logger();
  const monitor = new RequestAttributionMonitor(diagnostics, () => 100);
  registerRequestAttributionMonitor(diagnostics, monitor);
  const runId = diagnostics.beginSyncRun();
  const op = operation("op:1");
  monitor.start(runId, op, 1);
  const scope = monitor.scopeFor(runId, op)!;
  let calls = 0;
  const observed: string[] = [];
  const transport = new GoogleHttpTransport(session(), async url => {
    observed.push(String(url));
    calls++;
    return new Response("{}", { status: 200 });
  }, policy, async () => undefined, () => 0, () => 0, diagnostics, () => calls * 10);

  const paths = [
    ["files?q=private", "full-reconciliation-tree"],
    ["files?q=provenance", "reconciliation-provenance"],
    ["files?q=parent", "parent-path-resolution"],
    ["files/SECRET_OBJECT?fields=id", "reserved-id-observation"],
    ["files/SECRET_OBJECT?fields=parents", "create-result-verification"],
    ["about?fields=user", "managed-root-account"],
  ] as const;
  for (const [path, purpose] of paths) {
    const result = await transport.request(`https://www.googleapis.com/drive/v3/${path}`, {}, true, context(scope, purpose));
    assert.equal(result.ok, true);
  }
  const generated = await transport.request("https://www.googleapis.com/drive/v3/files/generateIds?count=1", {}, true, context(scope, "precondition-validation"));
  const created = await transport.request("https://www.googleapis.com/drive/v3/files?fields=id", { method: "POST" }, false, context(scope, "precondition-validation"));
  assert.equal(generated.ok, true);
  assert.equal(created.ok, true);
  monitor.reconciliation(scope, 47, false);
  monitor.finish(runId, op, "verified");
  monitor.close(runId);
  assert.equal(calls, 8);
  const records = snapshots(diagnostics);
  assert.equal(records.length, 2);
  const opFields = records[0]!.fields!;
  assert.equal(opFields.requestCount, 8);
  assert.equal(opFields.listRequestCount, 3);
  assert.equal(opFields.getRequestCount, 2);
  assert.equal(opFields.aboutRequestCount, 1);
  assert.equal(opFields.otherReadRequestCount, 1);
  assert.equal(opFields.writeRequestCount, 1);
  assert.equal(opFields.fullTreeRequestCount, 1);
  assert.equal(opFields.provenanceRequestCount, 1);
  assert.equal(opFields.parentPathRequestCount, 1);
  assert.equal(opFields.reservedIdRequestCount, 1);
  assert.equal(opFields.createVerifyRequestCount, 1);
  assert.equal(opFields.rootAccountRequestCount, 1);
  assert.equal(opFields.reconciliationCount, 1);
  assert.equal(opFields.reconciliationWallMs, 47);
  assert.equal(records[1]!.fields!.requestCount, calls);
  assert.equal(records[1]!.fields!.reconciliationCount, 1);
  assert.equal(records[1]!.fields!.reconciliationWallMs, 47);
  assert.equal(records[1]!.fields!.unattributedRequestCount, 0);
  assert.equal(records[1]!.fields!.attributionComplete, true);
  assert.doesNotMatch(diagnostics.renderText(), /PRIVATE-NOTE-NAME|SECRET_OBJECT|q=private|q=provenance|q=parent|SECRET-ACCESS-TOKEN/);
});

test("S09A concurrent scoped requests never contaminate another operation or hide unattributed calls", async () => {
  const diagnostics = logger();
  const monitor = new RequestAttributionMonitor(diagnostics);
  registerRequestAttributionMonitor(diagnostics, monitor);
  const run = diagnostics.beginSyncRun();
  const first = operation("op:first"), second = operation("op:second");
  monitor.start(run, first, 1); monitor.start(run, second, 2);
  const a = monitor.scopeFor(run, first)!, b = monitor.scopeFor(run, second)!;
  let realCalls = 0;
  const transport = new GoogleHttpTransport(session(), async () => {
    realCalls++;
    await Promise.resolve();
    return new Response("{}", { status: 200 });
  }, policy, async () => undefined, () => 0, () => 0, diagnostics, () => realCalls * 10);
  await Promise.all([
    transport.request("https://www.googleapis.com/drive/v3/files?q=a", {}, true, context(a, "full-reconciliation-tree")),
    transport.request("https://www.googleapis.com/drive/v3/files?q=b", {}, true, context(b, "reconciliation-provenance")),
    transport.request("https://www.googleapis.com/drive/v3/files?q=independent"),
  ]);
  monitor.finish(run, second); monitor.finish(run, first); monitor.close(run);
  const events = snapshots(diagnostics);
  assert.equal(events.length, 3);
  const firstEvent = events.find(e => e.fields?.operationIndex === 1)!;
  const secondEvent = events.find(e => e.fields?.operationIndex === 2)!;
  const summary = events.find(e => e.event === "run-request-attribution")!;
  assert.equal(firstEvent.fields?.requestCount, 1);
  assert.equal(secondEvent.fields?.requestCount, 1);
  assert.equal(summary.fields?.requestCount, realCalls);
  assert.equal(summary.fields?.unattributedRequestCount, 1);
  assert.equal(summary.fields?.attributionComplete, false);
});

test("S09A expected 404 and retry accounting never change provider results", async () => {
  const diagnostics = logger();
  const monitor = new RequestAttributionMonitor(diagnostics);
  registerRequestAttributionMonitor(diagnostics, monitor);
  const run = diagnostics.beginSyncRun(), op = operation("op:404");
  monitor.start(run, op, 1);
  let attempts = 0;
  const transport = new GoogleHttpTransport(session(), async () => {
    attempts++;
    return attempts === 1
      ? new Response(JSON.stringify({ error: { errors: [{ reason: "backendError" }] } }), { status: 503 })
      : new Response(JSON.stringify({ error: { errors: [{ reason: "notFound" }] } }), { status: 404 });
  }, policy, async () => undefined, () => 0, () => 0, diagnostics, () => attempts * 10);
  const result = await transport.request("https://www.googleapis.com/drive/v3/files/SECRET", {}, true, context(monitor.scopeFor(run, op)!, "reserved-id-observation"));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.signal.kind, "not-found");
  monitor.finish(run, op); monitor.close(run);
  const counted = snapshots(diagnostics)[0]!.fields!;
  assert.equal(attempts, 2);
  assert.equal(counted.requestCount, 1);
  assert.equal(counted.notFoundRequestCount, 1);
  assert.equal(counted.failedRequestCount, 1);
  assert.equal(counted.retryCount, 1);
});

test("S09A disabled diagnostics remain observational and produce no persistent summaries", async () => {
  const diagnostics = logger("off");
  const monitor = new RequestAttributionMonitor(diagnostics);
  registerRequestAttributionMonitor(diagnostics, monitor);
  const run = diagnostics.beginSyncRun(), op = operation("op:off");
  monitor.start(run, op, 1);
  const transport = new GoogleHttpTransport(session(), async () => new Response("{}", { status: 200 }), policy, async () => undefined, () => 0, () => 0, diagnostics);
  const response = await transport.request("https://www.googleapis.com/drive/v3/files", {}, true, monitor.scopeFor(run, op));
  assert.equal(response.ok, true);
  monitor.finish(run, op); monitor.close(run);
  assert.deepEqual(diagnostics.snapshot(), []);
});

test("S09A scoped Drive adapter classifies real reconciliation traversal independently of provenance and root checks", async () => {
  const { GoogleDriveAdapter } = await import("../src/drive/google-drive-port");
  const diagnostics = logger();
  const monitor = new RequestAttributionMonitor(diagnostics);
  registerRequestAttributionMonitor(diagnostics, monitor);
  const run = diagnostics.beginSyncRun(), op = operation("op:reconcile");
  monitor.start(run, op, 1);
  const calls: string[] = [];
  const root = { id: "root", name: "BRAIN Sync", mimeType: "application/vnd.google-apps.folder",
    trashed: false, appProperties: { brainSyncRole: "brain-sync-root",
      brainVaultIdentity: "vault-1", brainProtocolVersion: "1" } };
  const contentRoot = { id: "content", name: "vault", mimeType: "application/vnd.google-apps.folder",
    parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-content" } };
  const configurationRoot = { id: "config", name: "__brain_sync_portable_config__", mimeType: "application/vnd.google-apps.folder",
    parents: ["root"], trashed: false, appProperties: { brainSyncRole: "brain-sync-portable-config" } };
  const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    const expanded = decodeURIComponent(url).replace(/\+/g, " ");
    let body: unknown;
    if (url.includes("/about?")) body = { user: { permissionId: "acct" } };
    else if (url.includes("/files/root?")) body = root;
    else if (expanded.includes("brain-sync-content") && expanded.includes("'root' in parents")) body = { files: [contentRoot] };
    else if (expanded.includes("__brain_sync_portable_config__") && expanded.includes("'root' in parents")) body = { files: [configurationRoot] };
    else if (expanded.includes("brainManagedRootId")) body = { files: [] };
    else if (expanded.includes("'content' in parents") || expanded.includes("'config' in parents")) body = { files: [] };
    else throw new Error("unexpected fake endpoint category");
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  };
  const secrets = new Map<string, string>([["brain-gdrive-paired-account", "acct"]]);
  const secretStore = new ObsidianSecretStore({
    getSecret: id => secrets.get(id) ?? null,
    setSecret: (id, value) => { secrets.set(id, value); },
    deleteSecret: id => { secrets.delete(id); },
  });
  const http = new GoogleHttpTransport(session(), fetcher, policy, async () => undefined, () => 0, () => 0, diagnostics);
  const drive = new GoogleDriveAdapter(session(), http, secretStore, diagnostics);
  const scopedDrive = drive.withRequestAttribution(monitor.scopeFor(run, op)!);
  const result = await scopedDrive.listForReconciliation("root" as never);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.completeness.status, "complete");
  const repeated = await scopedDrive.listForReconciliation("root" as never);
  assert.equal(repeated.ok, true);
  if (repeated.ok) assert.equal(repeated.value.completeness.status, "complete");
  monitor.finish(run, op); monitor.close(run);
  const value = snapshots(diagnostics)[0]!.fields!;
  assert.equal(value.requestCount, calls.length);
  assert.equal(value.listRequestCount, 10);
  assert.equal(value.getRequestCount, 2);
  assert.equal(value.aboutRequestCount, 2);
  assert.equal(value.fullTreeRequestCount, 4);
  assert.equal(value.provenanceRequestCount, 2);
  assert.equal(value.rootAccountRequestCount, 8);
  assert.equal(value.reconciliationCount, 2);
  assert.equal(value.reconciliationFailureCount, 0);
  assert.equal(value.attributionComplete, true);
});

test("S09A telemetry failure cannot replace a successful transport result or escape operation closure", async () => {
  const diagnostics = logger();
  const monitor = new RequestAttributionMonitor(diagnostics);
  registerRequestAttributionMonitor(diagnostics, monitor);
  const run = diagnostics.beginSyncRun(), op = operation("op:diagnostic-failure");
  monitor.start(run, op, 1);
  const scope = monitor.scopeFor(run, op)!;
  const transport = new GoogleHttpTransport(session(),
    async () => new Response("{}", { status: 200 }),
    policy, async () => undefined, () => 0, () => 0, diagnostics);
  diagnostics.syncInfo = () => { throw new Error("simulated diagnostic persistence failure"); };
  const response = await transport.request("https://www.googleapis.com/drive/v3/files?q=untouched", {}, true, scope);
  assert.equal(response.ok, true);
  assert.doesNotThrow(() => monitor.finish(run, op));
  assert.doesNotThrow(() => monitor.close(run));
});

test("S09A network failure preserves transport signal and records one terminal failure", async () => {
  const diagnostics = logger();
  const monitor = new RequestAttributionMonitor(diagnostics);
  registerRequestAttributionMonitor(diagnostics, monitor);
  const run = diagnostics.beginSyncRun(), op = operation("op:network-failure");
  monitor.start(run, op, 1);
  let attempts = 0;
  const transport = new GoogleHttpTransport(session(), async () => {
    attempts++;
    throw new Error("network unavailable");
  }, policy, async () => undefined, () => 0, () => 0, diagnostics);
  const result = await transport.request("https://www.googleapis.com/drive/v3/files?q=unavailable", {}, true, context(monitor.scopeFor(run, op)!, "precondition-validation"));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.signal.kind, "transient-failure");
  monitor.finish(run, op); monitor.close(run);
  const totals = snapshots(diagnostics)[0]!.fields!;
  assert.equal(attempts, policy.maxAttempts);
  assert.equal(totals.requestCount, 1);
  assert.equal(totals.failedRequestCount, 1);
  assert.equal(totals.retryCount, policy.maxAttempts - 1);
  assert.equal(totals.attributionComplete, true);
});
