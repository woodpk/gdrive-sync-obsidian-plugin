import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  operationalFailureProvenanceFromErrorV1_3,
  type RemoteObjectId,
  type RemoteRevisionId,
  type VaultPath,
} from "../../../src/contracts/common";
import {
  operationalFailureFromDriveSignalV1_3,
  type DriveResult,
  type DriveSignal,
} from "../../../src/contracts/google-drive";
import type { RemoteMutationIdentity } from "../../../src/contracts/synchronization-foundation";
import { GoogleOAuthSession, ObsidianSecretStore } from "../../../src/drive/auth";
import {
  GoogleDriveAdapter,
  remoteMutationOutcomeWithDriveSignalV1_3,
} from "../../../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../../../src/drive/transport";

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string) { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string) { this.values.set(id, value); }
  deleteSecret(id: string) { this.values.delete(id); }
}

class StubTransport extends GoogleHttpTransport {
  constructor(private readonly stubHandler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>) {
    const memory = new MemorySecrets();
    super(new GoogleOAuthSession({ clientId: "c", redirectUri: "https://cb" }, new ObsidianSecretStore(memory)));
  }
  override request(url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> {
    return this.stubHandler(url, init);
  }
}

const ro = (value: string) => contractId<"RemoteObjectId">(value) as RemoteObjectId;
const rev = (value: string) => contractId<"RemoteRevisionId">(value) as RemoteRevisionId;
const vp = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const ok = (body: unknown) => Promise.resolve({
  ok: true,
  value: new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }),
} as DriveResult<Response>);
const fail = (signal: DriveSignal) => Promise.resolve({ ok: false, signal } as DriveResult<Response>);
const norm = (url: string) => decodeURIComponent(url).replace(/\+/g, " ");

function adapter(handler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>) {
  const memory = new MemorySecrets();
  memory.setSecret("brain-gdrive-paired-account", "acct");
  const secrets = new ObsidianSecretStore(memory);
  return new GoogleDriveAdapter(
    new GoogleOAuthSession({ clientId: "c", redirectUri: "https://cb" }, secrets),
    new StubTransport(handler),
    secrets,
  );
}

function coherentFailureAdapter(signal: DriveSignal) {
  return adapter(async url => {
    const normalized = norm(url);
    if (normalized.includes("/about?")) return ok({ user: { permissionId: "acct" } });
    if (normalized.includes("/files/r1?") && !normalized.includes("alt=media")) {
      return ok({ id: "r1", name: "x.bin", mimeType: "application/octet-stream", parents: ["content"], size: "1", version: "7" });
    }
    if (normalized.includes("alt=media")) return fail(signal);
    throw new Error(`unhandled ${normalized}`);
  });
}

async function lazyProvenance(signal: DriveSignal) {
  const result = await coherentFailureAdapter(signal).downloadVersion(ro("r1"), rev("7"), { revision: "7", sizeBytes: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value.status, "coherent");
  if (!result.ok || result.value.status !== "coherent") return undefined;
  try {
    for await (const chunk of result.value.content.openChunks()) void chunk;
  } catch (error) {
    return operationalFailureProvenanceFromErrorV1_3(error);
  }
  return undefined;
}

test("workstream A v1.3: lazy authentication failure is public without A-private error knowledge", async () => {
  assert.deepEqual(await lazyProvenance({ kind: "authentication-required", detail: "token revoked" }), {
    kind: "authentication-required",
    source: "google-drive",
    detail: "token revoked",
  });
});

test("workstream A v1.3: lazy transient failure preserves category", async () => {
  assert.deepEqual(await lazyProvenance({ kind: "transient-failure", detail: "connection reset" }), {
    kind: "transient-failure",
    source: "google-drive",
    detail: "connection reset",
  });
});

test("workstream A v1.3: lazy rate limit preserves exact retry timing", async () => {
  assert.deepEqual(await lazyProvenance({ kind: "rate-limited", retryAfterMs: 5000 }), {
    kind: "rate-limited",
    source: "google-drive",
    retryAfterMs: 5000,
  });
});

test("workstream A v1.3: post-stream remote change exposes public recovery provenance", async () => {
  let metadataReads = 0;
  const a = adapter(async url => {
    const normalized = norm(url);
    if (normalized.includes("/about?")) return ok({ user: { permissionId: "acct" } });
    if (normalized.includes("/files/r1?") && !normalized.includes("alt=media")) {
      metadataReads += 1;
      return ok({
        id: "r1",
        name: "x.bin",
        mimeType: "application/octet-stream",
        parents: ["content"],
        size: "1",
        version: metadataReads === 1 ? "7" : "8",
      });
    }
    if (normalized.includes("alt=media")) {
      return {
        ok: true,
        value: new Response(new Uint8Array([97]), { status: 206 }),
      } as DriveResult<Response>;
    }
    throw new Error(`unhandled ${normalized}`);
  });

  const result = await a.downloadVersion(ro("r1"), rev("7"), { revision: "7", sizeBytes: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value.status, "coherent");
  assert.equal(metadataReads, 1);
  if (!result.ok || result.value.status !== "coherent") return;

  let thrown: unknown;
  try {
    for await (const chunk of result.value.content.openChunks()) void chunk;
  } catch (error) {
    thrown = error;
  }

  assert.deepEqual(operationalFailureProvenanceFromErrorV1_3(thrown), {
    kind: "recovery-required",
    source: "google-drive",
    detail: "remote-changed-during-coherent-download",
  });
  assert.equal(metadataReads, 2);
});

test("workstream A v1.3: arbitrary errors fabricate no Drive provenance", () => {
  assert.equal(operationalFailureProvenanceFromErrorV1_3(new Error("rate-limited-looking text")), undefined);
});

test("workstream A v1.3: not-found and conflict stay contextual", () => {
  assert.equal(operationalFailureFromDriveSignalV1_3({ kind: "not-found", remoteObjectId: ro("missing") }), undefined);
  assert.equal(operationalFailureFromDriveSignalV1_3({ kind: "conflict", detail: "context owns meaning" }), undefined);
  const contextual = remoteMutationOutcomeWithDriveSignalV1_3({ status: "outcome-unknown", reason: "contextual" }, { kind: "conflict", detail: "context owns meaning" });
  assert.equal(contextual.status, "outcome-unknown");
  if (contextual.status === "outcome-unknown") assert.equal(contextual.operationalFailure, undefined);
});

test("workstream A v1.3: outcome-unknown plus rate limit remains physically outcome-unknown", () => {
  const result = remoteMutationOutcomeWithDriveSignalV1_3(
    { status: "outcome-unknown", reason: "dispatch may have occurred" },
    { kind: "rate-limited", retryAfterMs: 5000 },
  );
  assert.equal(result.status, "outcome-unknown");
  if (result.status === "outcome-unknown") {
    assert.deepEqual(result.operationalFailure, { kind: "rate-limited", source: "google-drive", retryAfterMs: 5000 });
  }
});

test("workstream A v1.3: verified-not-applied plus authentication preserves both facts", () => {
  const result = remoteMutationOutcomeWithDriveSignalV1_3(
    { status: "verified-not-applied", reason: "physical observation proves no effect" },
    { kind: "authentication-required", detail: "reauth required" },
  );
  assert.equal(result.status, "verified-not-applied");
  if (result.status === "verified-not-applied") {
    assert.deepEqual(result.operationalFailure, { kind: "authentication-required", source: "google-drive", detail: "reauth required" });
  }
});

test("workstream A v1.3: reliable mutation keeps rate-limited pre-observation physically unknown", async () => {
  const mutation: Extract<RemoteMutationIdentity, { kind: "reserved-folder-create" }> = {
    kind: "reserved-folder-create",
    intentId: contractId<"MutationIntentId">("v13-create"),
    reservedRemoteObjectId: ro("reserved"),
    path: vp("folder"),
  };
  const a = adapter(async url => {
    const normalized = norm(url);
    if (normalized.includes("/files/reserved?")) return fail({ kind: "rate-limited", retryAfterMs: 5000 });
    throw new Error(`unhandled ${normalized}`);
  });
  const result = await a.createReserved(mutation);
  assert.equal(result.status, "outcome-unknown");
  if (result.status === "outcome-unknown") {
    assert.deepEqual(result.operationalFailure, { kind: "rate-limited", source: "google-drive", retryAfterMs: 5000 });
  }
});
