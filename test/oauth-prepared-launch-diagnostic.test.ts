import assert from "node:assert/strict";
import test from "node:test";
import { PreparedOAuthLaunchDiagnostic } from "../src/product/oauth-prepared-launch-diagnostic";

test("prepared OAuth diagnostic captures the real URL without launching and later launches it once from a fresh call", async () => {
  const originalOpen = globalThis.open;
  const launches: Array<{ url: string; target?: string }> = [];
  globalThis.open = ((url?: string | URL, target?: string) => {
    launches.push({ url: typeof url === "string" ? url : url?.toString() ?? "", target });
    return null;
  }) as typeof globalThis.open;

  try {
    const diagnostic = new PreparedOAuthLaunchDiagnostic();
    await diagnostic.prepare(async () => {
      globalThis.open("https://accounts.google.com/o/oauth2/v2/auth?state=opaque", "_external");
    });

    assert.equal(diagnostic.hasPreparedAuthorization(), true);
    assert.deepEqual(launches, []);

    diagnostic.launchPrepared();
    assert.deepEqual(launches, [{ url: "https://accounts.google.com/o/oauth2/v2/auth?state=opaque", target: "_external" }]);
    assert.equal(diagnostic.hasPreparedAuthorization(), false);
    assert.throws(() => diagnostic.launchPrepared(), /Prepare Google authorization/);
  } finally {
    globalThis.open = originalOpen;
  }
});

test("prepared OAuth diagnostic refuses launch before preparation", () => {
  assert.throws(() => new PreparedOAuthLaunchDiagnostic().launchPrepared(), /Prepare Google authorization/);
});

test("prepared OAuth diagnostic restores the browser function when preparation fails", async () => {
  const originalOpen = globalThis.open;
  const sentinel = (() => null) as typeof globalThis.open;
  globalThis.open = sentinel;

  try {
    const diagnostic = new PreparedOAuthLaunchDiagnostic();
    await assert.rejects(() => diagnostic.prepare(async () => { throw new Error("preparation failed"); }), /preparation failed/);
    assert.equal(globalThis.open, sentinel);
    assert.equal(diagnostic.hasPreparedAuthorization(), false);
  } finally {
    globalThis.open = originalOpen;
  }
});
