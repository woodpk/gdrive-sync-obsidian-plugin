import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  platform: "browser",
  format: "cjs",
  target: "es2022",
  external: [
    "obsidian",
    "node:fs/promises",
    "node:path"
  ],
  sourcemap: false,
  logLevel: "info"
});
