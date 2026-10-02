import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { deepEqual, equal, match, notEqual, ok } from "node:assert/strict";
import { test } from "node:test";
import { Script } from "node:vm";

import {
  buildValidationArtifact,
  type ValidationArtifactBuildResult,
} from "../src/live-device/build-validation-artifact";
import {
  BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL,
  BVP_VALIDATION_BUILD_GLOBAL,
} from "../src/live-device/validation-entrypoint";

const repositoryRoot = resolve(process.cwd());
const acceptedProductionSha256 =
  "0d4f755dfd85da9a66180ed38cededd37168ea9f46ae1aa4ee3c15cdb8341411";

function sha256(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function runNodeScript(relativePath: string): string {
  const result = spawnSync(process.execPath, [relativePath], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  equal(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function readIdentity(result: ValidationArtifactBuildResult): any {
  return JSON.parse(readFileSync(result.identityPath, "utf8"));
}

function evaluateValidationArtifact(result: ValidationArtifactBuildResult): any {
  const source = readFileSync(result.artifactPath, "utf8");
  const requested: string[] = [];
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
    { get: (target, property) => (property in target ? target[property as keyof typeof target] : Placeholder) },
  );
  const moduleBox: { exports: any } = { exports: {} };
  const context: any = {
    module: moduleBox,
    exports: moduleBox.exports,
    require(specifier: string) {
      requested.push(specifier);
      if (specifier === "obsidian") return obsidianStub;
      throw new Error(`unexpected eager validation-artifact external: ${specifier}`);
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
  context.globalThis = context;
  new Script(source, { filename: result.artifactPath }).runInNewContext(context);
  deepEqual(requested, ["obsidian"]);
  return { context, exports: moduleBox.exports };
}

test("S08B validation artifact is separate, production-faithful, traceable, and disposable", async () => {
  runNodeScript("scripts/build.mjs");
  runNodeScript("scripts/verify-build.mjs");

  const productionPath = resolve(repositoryRoot, "main.js");
  const productionBytes = readFileSync(productionPath);
  const productionText = productionBytes.toString("utf8");
  const productionHash = sha256(productionBytes);
  equal(productionHash, acceptedProductionSha256);
  equal(productionText.includes(BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL), false);

  const first = await buildValidationArtifact(repositoryRoot);
  ok(existsSync(first.artifactPath));
  ok(existsSync(first.manifestPath));
  ok(existsSync(first.identityPath));
  match(first.sourceCommit, /^[0-9a-f]{40}$/);
  notEqual(first.artifactSha256, productionHash);
  equal(readFileSync(first.artifactPath, "utf8").includes(BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL), true);
  equal(readFileSync(first.manifestPath, "utf8"), readFileSync(resolve(repositoryRoot, "manifest.json"), "utf8"));
  deepEqual(first.testPlatformInputs, ["test-platform/src/live-device/validation-entrypoint.ts"]);

  const identity = readIdentity(first);
  equal(identity.sourceCommit, first.sourceCommit);
  equal(identity.artifactSha256, first.artifactSha256);
  equal(identity.artifactSize, first.artifactSize);
  equal(identity.productionEntrypoint, "src/main.ts");
  equal(identity.validationEntrypoint, "test-platform/src/live-device/validation-entrypoint.ts");
  deepEqual(identity.testPlatformInputs, first.testPlatformInputs);

  const evaluated = evaluateValidationArtifact(first);
  const runtimeIdentity = evaluated.context[BVP_VALIDATION_BUILD_GLOBAL];
  ok(runtimeIdentity);
  equal(runtimeIdentity.schemaVersion, 1);
  equal(runtimeIdentity.sourceCommit, first.sourceCommit);
  equal(runtimeIdentity.sentinel, BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL);
  ok(evaluated.exports);

  rmSync(first.outputDirectory, { recursive: true, force: true });
  equal(existsSync(first.outputDirectory), false);
  runNodeScript("scripts/verify-build.mjs");
  equal(sha256(readFileSync(productionPath)), productionHash);

  const second = await buildValidationArtifact(repositoryRoot);
  equal(second.sourceCommit, first.sourceCommit);
  equal(second.artifactSha256, first.artifactSha256);
  equal(second.manifestSha256, first.manifestSha256);
  deepEqual(second.testPlatformInputs, first.testPlatformInputs);
});
