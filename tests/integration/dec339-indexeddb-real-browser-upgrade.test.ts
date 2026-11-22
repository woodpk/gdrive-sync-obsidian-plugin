import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { build } from "esbuild";

interface BrowserResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly cooperative?: {
    readonly seed: { readonly status: string; readonly canonicalBytes: readonly number[] | null };
    readonly upgrade: { readonly status: string; readonly reason: string | null };
    readonly legacyAfter: { readonly status: string; readonly name?: string; readonly message?: string };
    readonly compatible: { readonly status: string; readonly canonicalBytes: readonly number[] | null };
    readonly version: { readonly status: string; readonly version: number };
  };
  readonly blocked?: {
    readonly seed: { readonly status: string; readonly canonicalBytes: readonly number[] | null };
    readonly blocker: { readonly status: string; readonly version: number };
    readonly blockedUpgrade: { readonly status: string; readonly reason: string | null };
    readonly close: { readonly status: string };
    readonly retry: { readonly status: string; readonly reason: string | null };
    readonly compatible: { readonly status: string; readonly canonicalBytes: readonly number[] | null };
    readonly version: { readonly status: string; readonly version: number };
  };
}

function edgeExecutable(): string | null {
  const candidates = [
    process.env.PROGRAMFILES ? join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe") : "",
    process.env["PROGRAMFILES(X86)"] ? join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe") : "",
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe") : "",
  ].filter(Boolean);
  return candidates.find(existsSync) ?? null;
}

function frameHtml(): string {
  return `<!doctype html>
<meta charset="utf-8">
<script src="/bundle.js"></script>
<script>
"use strict";
window.addEventListener("message", async event => {
  if (event.origin !== location.origin) return;
  const message = event.data || {};
  if (!message.id || !message.command) return;
  try {
    const value = await BU06Harness.run(message.command, message.args);
    parent.postMessage({ kind: "response", id: message.id, ok: true, value }, location.origin);
  } catch (error) {
    parent.postMessage({
      kind: "response",
      id: message.id,
      ok: false,
      error: error && error.stack ? String(error.stack) : String(error),
    }, location.origin);
  }
});
</script>`;
}

function rootHtml(cooperativeDb: string, blockedDb: string): string {
  return `<!doctype html>
<meta charset="utf-8">
<title>WS-02 BU-06 real IndexedDB arbitration</title>
<iframe id="a" src="/frame.html"></iframe>
<iframe id="b" src="/frame.html"></iframe>
<script>
"use strict";
const cooperativeDb = ${JSON.stringify(cooperativeDb)};
const blockedDb = ${JSON.stringify(blockedDb)};
const a = document.getElementById("a");
const b = document.getElementById("b");
const pending = new Map();
let sequence = 0;
window.addEventListener("message", event => {
  if (event.origin !== location.origin || !event.data || event.data.kind !== "response") return;
  const waiter = pending.get(event.data.id);
  if (!waiter) return;
  pending.delete(event.data.id);
  clearTimeout(waiter.timer);
  if (event.data.ok) waiter.resolve(event.data.value);
  else waiter.reject(new Error(event.data.error || "frame-command-failed"));
});
function loaded(frame) {
  return new Promise(resolve => {
    if (frame.contentDocument && frame.contentDocument.readyState === "complete") resolve();
    else frame.addEventListener("load", resolve, { once: true });
  });
}
function command(frame, name, databaseName) {
  return new Promise((resolve, reject) => {
    const id = "cmd-" + (++sequence);
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("frame-command-timeout:" + name));
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    frame.contentWindow.postMessage({ id, command: name, args: { databaseName } }, location.origin);
  });
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function postResult(value) {
  await fetch("/result", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });
}
(async () => {
  try {
    await Promise.all([loaded(a), loaded(b)]);

    const cooperativeSeed = await command(a, "seedLegacy", cooperativeDb);
    const cooperativeUpgrade = await command(b, "upgradeSnapshot", cooperativeDb);
    const cooperativeLegacyAfter = await command(a, "readLegacy", cooperativeDb);
    const cooperativeCompatible = await command(b, "readCompatible", cooperativeDb);
    const cooperativeVersion = await command(b, "databaseVersion", cooperativeDb);

    const blockedSeed = await command(a, "seedLegacy", blockedDb);
    const blocker = await command(b, "openBlocker", blockedDb);
    const blockedUpgrade = await command(b, "upgradeSnapshot", blockedDb);
    const close = await command(b, "closeBlocker", blockedDb);
    await delay(500);
    const retry = await command(b, "upgradeSnapshot", blockedDb);
    const blockedCompatible = await command(b, "readCompatible", blockedDb);
    const blockedVersion = await command(b, "databaseVersion", blockedDb);

    await postResult({
      ok: true,
      cooperative: {
        seed: cooperativeSeed,
        upgrade: cooperativeUpgrade,
        legacyAfter: cooperativeLegacyAfter,
        compatible: cooperativeCompatible,
        version: cooperativeVersion,
      },
      blocked: {
        seed: blockedSeed,
        blocker,
        blockedUpgrade,
        close,
        retry,
        compatible: blockedCompatible,
        version: blockedVersion,
      },
    });
  } catch (error) {
    await postResult({ ok: false, error: error && error.stack ? String(error.stack) : String(error) });
  }
})();
</script>`;
}

async function requestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

test("WS-02 BU-06 real Edge contexts arbitrate v1→v2 upgrade, blocking and rollback safely", {
  skip: process.platform !== "win32",
  timeout: 90000,
}, async () => {
  const edge = edgeExecutable();
  assert.ok(edge, "Microsoft Edge is required on Windows for the real multi-context IndexedDB gate");

  const temp = mkdtempSync(join(tmpdir(), "brain-ws02-bu06-"));
  const bundlePath = join(temp, "browser-harness.js");
  const profilePath = join(temp, "edge-profile");
  const harnessEntry = join(process.cwd(), "tests", "browser", "dec339-real-idb-context-harness.ts");
  await build({
    entryPoints: [harnessEntry],
    outfile: bundlePath,
    bundle: true,
    format: "iife",
    globalName: "BU06Harness",
    platform: "browser",
    target: ["chrome120"],
    sourcemap: false,
    logLevel: "silent",
  });
  const bundle = readFileSync(bundlePath);
  const cooperativeDb = `brain-bu06-cooperative-${randomUUID()}`;
  const blockedDb = `brain-bu06-blocked-${randomUUID()}`;

  let resolveResult!: (value: BrowserResult) => void;
  let rejectResult!: (error: Error) => void;
  const resultPromise = new Promise<BrowserResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    void (async () => {
      try {
        const url = new URL(request.url ?? "/", "http://127.0.0.1");
        if (request.method === "GET" && url.pathname === "/bundle.js") {
          response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
          response.end(bundle);
          return;
        }
        if (request.method === "GET" && url.pathname === "/frame.html") {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(frameHtml());
          return;
        }
        if (request.method === "POST" && url.pathname === "/result") {
          const value = JSON.parse(await requestBody(request)) as BrowserResult;
          response.writeHead(204);
          response.end();
          resolveResult(value);
          return;
        }
        if (request.method === "GET" && url.pathname === "/") {
          response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          response.end(rootHtml(cooperativeDb, blockedDb));
          return;
        }
        response.writeHead(404);
        response.end("not found");
      } catch (cause) {
        response.writeHead(500);
        response.end("server-error");
        rejectResult(cause instanceof Error ? cause : new Error(String(cause)));
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/`;

  let browser: ChildProcessWithoutNullStreams | undefined;
  let stdout = "";
  let stderr = "";
  try {
    browser = spawn(edge, [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      `--user-data-dir=${profilePath}`,
      url,
    ], { stdio: "pipe", windowsHide: true });
    browser.stdout.setEncoding("utf8");
    browser.stderr.setEncoding("utf8");
    browser.stdout.on("data", chunk => { stdout += String(chunk); });
    browser.stderr.on("data", chunk => { stderr += String(chunk); });
    browser.once("error", error => rejectResult(error));
    browser.once("exit", code => {
      rejectResult(new Error(
        `Edge exited before result with code ${String(code)}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });

    const result = await Promise.race([
      resultPromise,
      new Promise<BrowserResult>((_, reject) => setTimeout(() => reject(new Error(
        `Timed out waiting for real-browser IndexedDB result\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`)), 60000)),
    ]);
    assert.equal(result.ok, true, result.error ?? `browser gate failed\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
    assert.ok(result.cooperative);
    assert.ok(result.blocked);

    assert.equal(result.cooperative.seed.status, "saved");
    assert.equal(result.cooperative.upgrade.status, "trusted-fence");
    assert.equal(result.cooperative.version.version, 2);
    assert.equal(result.cooperative.legacyAfter.status, "error");
    assert.equal(result.cooperative.legacyAfter.name, "VersionError");
    assert.deepEqual(
      result.cooperative.compatible.canonicalBytes,
      result.cooperative.seed.canonicalBytes,
      "v2-aware rollback reader must preserve exact canonical authority bytes after real upgrade",
    );

    assert.equal(result.blocked.seed.status, "saved");
    assert.equal(result.blocked.blocker.status, "open");
    assert.equal(result.blocked.blocker.version, 1);
    assert.equal(result.blocked.blockedUpgrade.status, "recovery-required",
      "a non-cooperating stale context must block the production v2 open fail-closed");
    assert.equal(result.blocked.close.status, "closed");
    assert.equal(result.blocked.retry.status, "trusted-fence",
      "the production inventory store must be retryable after the blocker releases");
    assert.equal(result.blocked.version.version, 2);
    assert.deepEqual(
      result.blocked.compatible.canonicalBytes,
      result.blocked.seed.canonicalBytes,
      "blocked/late upgrade completion must not change canonical authority bytes",
    );
  } finally {
    if (browser && browser.exitCode === null) browser.kill();
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(temp, { recursive: true, force: true });
  }
});
