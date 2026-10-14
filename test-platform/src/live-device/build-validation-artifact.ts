import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { build } from "esbuild";

const productionEntrypoint = "src/main.ts";
const validationEntrypoint = "test-platform/src/live-device/validation-entrypoint.ts";
const virtualEntrypoint = "bvp-validation-virtual-entrypoint.ts";
const outputRelativeDirectory = ".test-build/bvp-live-device/plugin";

export interface ValidationArtifactBuildIdentity {
  readonly schemaVersion: 1;
  readonly sourceCommit: string;
  readonly productionEntrypoint: typeof productionEntrypoint;
  readonly validationEntrypoint: typeof validationEntrypoint;
  readonly artifact: "main.js";
  readonly artifactSize: number;
  readonly artifactSha256: string;
  readonly manifestSha256: string;
  readonly testPlatformInputs: readonly string[];
}

export interface ValidationArtifactBuildResult extends ValidationArtifactBuildIdentity {
  readonly outputDirectory: string;
  readonly artifactPath: string;
  readonly manifestPath: string;
  readonly identityPath: string;
}

function sha256(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function requireFile(root: string, relativePath: string): string {
  const fullPath = join(root, ...relativePath.split("/"));
  if (!existsSync(fullPath)) throw new Error(`required validation-build input is missing: ${relativePath}`);
  return fullPath;
}

function gitHead(root: string): string {
  const result = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`unable to resolve validation-build source HEAD: ${result.stderr || result.stdout}`);
  }
  const value = (result.stdout ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(value)) throw new Error(`validation-build source HEAD is not a full SHA: ${value}`);
  return value;
}

function repositoryRelativeInput(root: string, input: string): string {
  if (input === virtualEntrypoint || input.startsWith("<")) return input;
  const absolute = isAbsolute(input) ? input : resolve(root, input);
  const value = relative(root, absolute).split(sep).join("/");
  if (value === ".." || value.startsWith("../")) {
    throw new Error(`validation build escaped the repository input boundary: ${input}`);
  }
  return value;
}

export async function buildValidationArtifact(repositoryRoot = resolve(process.cwd())): Promise<ValidationArtifactBuildResult> {
  const root = resolve(repositoryRoot);
  requireFile(root, productionEntrypoint);
  requireFile(root, validationEntrypoint);
  const sourceManifest = requireFile(root, "manifest.json");
  const sourceCommit = gitHead(root);
  const outputDirectory = join(root, ...outputRelativeDirectory.split("/"));
  const artifactPath = join(outputDirectory, "main.js");
  const manifestPath = join(outputDirectory, "manifest.json");
  const identityPath = join(outputDirectory, "build-identity.json");

  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });

  const virtualSource = [
    `import ProductionPlugin from "./${productionEntrypoint}";`,
    'import { Platform, requestUrl } from "obsidian";',
    'import { GOOGLE_OAUTH_CLIENT_SECRET_ID, GoogleOAuthSession, ObsidianSecretStore } from "./src/drive/auth";',
    'import { createObsidianRequestUrlFetcher } from "./src/drive/obsidian-http";',
    'import { GoogleHttpTransport } from "./src/drive/transport";',
    `import { installBvpMailboxRuntime, installBvpValidationBuildIdentity } from "./${validationEntrypoint}";`,
    `const bvpValidationBuildIdentity = installBvpValidationBuildIdentity(${JSON.stringify(sourceCommit)});`,
    'class BvpValidationPlugin extends ProductionPlugin {',
    '  private bvpRuntimeTimer?: number;',
    '  async onload() { await super.onload(); const raw = await this.loadData() as any; const settings = raw?.settings ?? {}; if (!settings.oauthClientId || !settings.oauthRedirectUri || !settings.deviceIdentity) return; const fetcher = createObsidianRequestUrlFetcher(requestUrl); const oauth = new GoogleOAuthSession({ clientId: settings.oauthClientId, redirectUri: settings.oauthRedirectUri, clientSecretStorageKey: GOOGLE_OAUTH_CLIENT_SECRET_ID }, new ObsidianSecretStore(this.app.secretStorage), fetcher); const transport = new GoogleHttpTransport(oauth, fetcher); const requester = async (url: string, init?: RequestInit) => { const response = await transport.request(url, init); if (!response.ok) throw new Error("bvp-mailbox-drive-" + response.signal.kind); return response.value; }; const root = this.app.vault.configDir + "/plugins/" + this.manifest.id + "/.bvp-relay"; const runtime = await installBvpMailboxRuntime(requester, { adapter: this.app.vault.adapter, root, deviceId: settings.deviceIdentity, validationBuild: bvpValidationBuildIdentity, production: () => this.productionVerificationControl(), relay: Platform.isDesktopApp }); this.bvpRuntimeTimer = window.setInterval(() => { void runtime.pollDeviceOnce().catch(() => undefined); if (runtime.relay) void runtime.relay.pumpOnce().catch(() => undefined); }, 1000); }',
    '  async onunload() { if (this.bvpRuntimeTimer !== undefined) window.clearInterval(this.bvpRuntimeTimer); await super.onunload(); }',
    '}',
    "export default BvpValidationPlugin;",
    "",
  ].join("\n");

  const result = await build({
    stdin: {
      contents: virtualSource,
      resolveDir: root,
      sourcefile: virtualEntrypoint,
      loader: "ts",
    },
    bundle: true,
    platform: "browser",
    format: "cjs",
    target: "es2022",
    outfile: artifactPath,
    external: ["obsidian", "electron", "node:*"],
    sourcemap: false,
    minify: false,
    treeShaking: true,
    metafile: true,
    logLevel: "silent",
  });
  if (!result.metafile) throw new Error("validation build did not return an esbuild metafile");

  const inputs = Object.keys(result.metafile.inputs)
    .map(input => repositoryRelativeInput(root, input))
    .filter(input => input !== virtualEntrypoint && !input.startsWith("<"))
    .sort();
  if (!inputs.includes(productionEntrypoint)) {
    throw new Error("validation artifact does not include the real production src/main.ts entrypoint");
  }
  if (!inputs.includes(validationEntrypoint)) {
    throw new Error("validation artifact does not include its validation-only entry module");
  }

  const testPlatformInputs = inputs.filter(input => input.startsWith("test-platform/"));
  const unexpectedTestPlatformInputs = testPlatformInputs.filter(
    input => !input.startsWith("test-platform/src/live-device/"),
  );
  if (unexpectedTestPlatformInputs.length > 0) {
    throw new Error(
      `validation artifact includes prohibited non-live-device test-platform inputs: ${unexpectedTestPlatformInputs.join(", ")}`,
    );
  }

  copyFileSync(sourceManifest, manifestPath);
  const artifactBytes = readFileSync(artifactPath);
  const manifestBytes = readFileSync(manifestPath);
  const identity: ValidationArtifactBuildIdentity = {
    schemaVersion: 1,
    sourceCommit,
    productionEntrypoint,
    validationEntrypoint,
    artifact: "main.js",
    artifactSize: statSync(artifactPath).size,
    artifactSha256: sha256(artifactBytes),
    manifestSha256: sha256(manifestBytes),
    testPlatformInputs,
  };
  writeFileSync(identityPath, JSON.stringify(identity, null, 2) + "\n", "utf8");

  console.log("BVP_VALIDATION_BUILD=PASS");
  console.log(`BVP_VALIDATION_SOURCE_COMMIT=${identity.sourceCommit}`);
  console.log(`BVP_VALIDATION_ARTIFACT_SIZE=${identity.artifactSize}`);
  console.log(`BVP_VALIDATION_ARTIFACT_SHA256=${identity.artifactSha256}`);

  return {
    ...identity,
    outputDirectory,
    artifactPath,
    manifestPath,
    identityPath,
  };
}

if (require.main === module) {
  buildValidationArtifact().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
