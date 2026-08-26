import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import vm from "node:vm";

const artifact = "main.js";
const legacyGeneratedPaths = [
  ".build",
  "contracts",
  "core",
  "drive",
  "local",
  "product",
  "state",
  "testing",
  "util",
];
const forbiddenMobileRequests = [
  "electron",
  "node:fs",
  "node:fs/promises",
  "node:path",
  "fs",
  "fs/promises",
  "path",
  "child_process",
  "os",
  "worker_threads",
  "net",
  "tls",
];

function fail(message) {
  throw new Error(`Build artifact verification failed: ${message}`);
}

if (!existsSync(artifact)) fail("main.js does not exist");
const size = statSync(artifact).size;
if (size <= 0) fail("main.js is empty");
const source = readFileSync(artifact, "utf8");
const sha256 = createHash("sha256").update(source).digest("hex");

const syntax = spawnSync(process.execPath, ["--check", artifact], { encoding: "utf8" });
if (syntax.status !== 0) fail(`node --check failed: ${syntax.stderr || syntax.stdout}`);

const relativeDependencyPattern = /(?:require\s*\(|import\s*\()\s*["']\.{1,2}\//g;
const unresolvedLocalDependencies = [...source.matchAll(relativeDependencyPattern)].map(match => match[0]);
if (unresolvedLocalDependencies.length > 0) {
  fail(`main.js still contains relative runtime dependencies: ${unresolvedLocalDependencies.join(", ")}`);
}

const polluted = legacyGeneratedPaths.filter(path => existsSync(path));
if (polluted.length > 0) fail(`legacy generated runtime paths remain: ${polluted.join(", ")}`);

function Placeholder() {}
const obsidianStub = new Proxy(
  {
    Platform: { isDesktopApp: false, isMobile: true },
    Plugin: class {},
    PluginSettingTab: class {},
    Modal: class {},
    Notice: class {},
    requestUrl: async () => ({ status: 200, json: {}, text: "", headers: {} }),
  },
  { get: (target, property) => (property in target ? target[property] : Placeholder) },
);
const requested = [];
const context = {
  module: { exports: {} },
  exports: {},
  require(specifier) {
    requested.push(specifier);
    if (specifier === "obsidian") return obsidianStub;
    if (forbiddenMobileRequests.includes(specifier) || specifier.startsWith("node:")) {
      fail(`mobile-path bundle evaluation requested desktop-only external ${specifier}`);
    }
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      fail(`mobile-path bundle evaluation requested local runtime module ${specifier}`);
    }
    fail(`unexpected external dependency requested during mobile-path evaluation: ${specifier}`);
  },
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  TextEncoder,
  TextDecoder,
  URL,
  URLSearchParams,
  AbortController,
  crypto: globalThis.crypto,
};
context.exports = context.module.exports;
context.globalThis = context;
new vm.Script(source, { filename: artifact }).runInNewContext(context);

const eagerDesktopRequests = requested.filter(specifier => forbiddenMobileRequests.includes(specifier) || specifier.startsWith("node:"));
if (eagerDesktopRequests.length > 0) fail(`desktop-only dependencies were eagerly requested: ${eagerDesktopRequests.join(", ")}`);

console.log("BUILD_VERIFY_ENTRYPOINT=PASS");
console.log("BUILD_VERIFY_SYNTAX=PASS");
console.log("BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS");
console.log("BUILD_VERIFY_MOBILE_EVALUATION=PASS");
console.log("BUILD_VERIFY_PACKAGE_SHAPE=PASS");
console.log(`BUILD_ARTIFACT_SIZE=${size}`);
console.log(`BUILD_ARTIFACT_SHA256=${sha256}`);
