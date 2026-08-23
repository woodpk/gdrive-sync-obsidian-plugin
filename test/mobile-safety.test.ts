import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
const root = join(__dirname, "..", "..");
const sourceRoot = join(root, "src");
function files(dir: string): string[] { return readdirSync(dir).flatMap(name => { const full = join(dir,name); return statSync(full).isDirectory() ? files(full) : full.endsWith(".ts") ? [full] : []; }); }
const prohibited = ["fs","path","os","child_process","worker_threads","net","tls","electron","powershell"];
test("manifest declares mobile compatibility", () => { const manifest = JSON.parse(readFileSync(join(root,"manifest.json"),"utf8")); assert.equal(manifest.isDesktopOnly,false); });
test("runtime source has no Node/Electron/Windows-only imports", () => { const violations: string[] = []; for (const file of files(sourceRoot)) { const text = readFileSync(file,"utf8"); for (const spec of prohibited) { const patterns = [`from \"${spec}\"`,`from '${spec}'`,`from \"node:${spec}\"`,`from 'node:${spec}'`,`require(\"${spec}\")`,`require('${spec}')`]; if (patterns.some(p => text.includes(p))) violations.push(`${relative(root,file)} -> ${spec}`); } } assert.deepEqual(violations,[]); });
test("frozen payload contracts expose no authentication secret fields", () => { const text = files(join(sourceRoot,"contracts")).map(f => readFileSync(f,"utf8")).join("\n"); for (const forbidden of ["accessToken:","refreshToken:","clientSecret:","oauthSecret:"]) assert.equal(text.includes(forbidden),false); });
