import { rmSync } from "node:fs";
import { build } from "esbuild";

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

for (const path of legacyGeneratedPaths) {
  rmSync(path, { recursive: true, force: true });
}

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  outfile: "main.js",
  external: ["obsidian", "electron", "node:*"],
  sourcemap: false,
  minify: false,
  treeShaking: true,
  logLevel: "info",
});
