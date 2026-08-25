import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(__dirname, "..", "..");

function callbackHtml(): string {
  return readFileSync(join(root, "oauth-callback", "index.html"), "utf8");
}
function callbackConfig(): { routes?: Array<{route?:string;rewrite?:string}>; globalHeaders?: Record<string,string> } {
  return JSON.parse(readFileSync(join(root, "oauth-callback", "staticwebapp.config.json"), "utf8"));
}

test("Phase 6 C: hosted callback remains authorization-only and content/token nonpersistent", () => {
  const html = callbackHtml();
  assert.match(html, /obsidian:\/\/brain-gdrive-oauth/);
  assert.match(html, /query\.get\("state"\)/);
  assert.match(html, /query\.get\("code"\)/);
  assert.match(html, /query\.get\("error"\)/);
  assert.match(html, /history\.replaceState/);
  for (const forbidden of [
    "access_token", "refresh_token", "client_secret", "localStorage", "sessionStorage",
    "indexedDB", "fetch(", "XMLHttpRequest", "www.googleapis.com/drive", "oauth2.googleapis.com/token",
    "vault", "note.md", "binary",
  ]) assert.equal(html.includes(forbidden), false, `callback contains forbidden capability/content marker: ${forbidden}`);
});

test("Phase 6 C: callback deployment policy is no-store, no-referrer, and tightly sandboxed", () => {
  const config = callbackConfig();
  assert.deepEqual(config.routes, [{ route:"/oauth/callback", rewrite:"/index.html" }]);
  assert.equal(config.globalHeaders?.["Cache-Control"], "no-store");
  assert.equal(config.globalHeaders?.["Referrer-Policy"], "no-referrer");
  assert.equal(config.globalHeaders?.["X-Content-Type-Options"], "nosniff");
  const csp = config.globalHeaders?.["Content-Security-Policy"] ?? "";
  for (const directive of ["default-src 'none'", "navigate-to obsidian:", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"]) {
    assert.ok(csp.includes(directive), `missing CSP directive: ${directive}`);
  }
  assert.equal(csp.includes("connect-src"), false);
});
