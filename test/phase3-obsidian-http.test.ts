import assert from "node:assert/strict";
import test from "node:test";
import { createObsidianRequestUrlFetcher } from "../src/drive/obsidian-http";

test("Obsidian requestUrl bridge posts OAuth form data without browser CORS dependency", async () => {
  let seen: { url?: string; method?: string; body?: string | ArrayBuffer; throw?: boolean } = {};
  const payload = new TextEncoder().encode(JSON.stringify({ access_token: "test" }));
  const fetcher = createObsidianRequestUrlFetcher(async request => {
    seen = request;
    return { status: 200, headers: { "content-type": "application/json" }, arrayBuffer: payload.buffer };
  });
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: "code", code_verifier: "verifier" }),
  });
  assert.equal(response.status, 200);
  assert.equal(seen.url, "https://oauth2.googleapis.com/token");
  assert.equal(seen.method, "POST");
  assert.equal(seen.body, "code=code&code_verifier=verifier");
  assert.equal(seen.throw, false);
});

test("Obsidian requestUrl bridge returns Google 4xx bodies instead of collapsing them into exceptions", async () => {
  const payload = new TextEncoder().encode(JSON.stringify({ error: "invalid_client", error_description: "safe description" }));
  const fetcher = createObsidianRequestUrlFetcher(async request => {
    assert.equal(request.throw, false);
    return { status: 400, headers: { "content-type": "application/json" }, arrayBuffer: payload.buffer };
  });
  const response = await fetcher("https://oauth2.googleapis.com/token", { method: "POST" });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "invalid_client", error_description: "safe description" });
});
