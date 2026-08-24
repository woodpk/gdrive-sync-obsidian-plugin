import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
const root=join(__dirname,"..","..");
test("hosted OAuth callback is content-blind and token-nonpersistent",()=>{
  const html=readFileSync(join(root,"oauth-callback","index.html"),"utf8");
  assert.match(html,/obsidian:\/\/brain-gdrive-oauth/);
  for(const forbidden of ["access_token","refresh_token","localStorage","sessionStorage","fetch(","XMLHttpRequest","vault"]) assert.equal(html.includes(forbidden),false);
  assert.match(html,/history\.replaceState/);
});
