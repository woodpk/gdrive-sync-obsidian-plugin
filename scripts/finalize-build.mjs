import { copyFileSync, cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = ".build";
const main = join(sourceRoot, "main.js");
if (!existsSync(main)) throw new Error("TypeScript build did not emit .build/main.js");
copyFileSync(main, "main.js");

for (const name of readdirSync(sourceRoot)) {
  if (name === "main.js") continue;
  const source = join(sourceRoot, name);
  if (!statSync(source).isDirectory()) continue;
  cpSync(source, name, { recursive: true, force: true });
}

rmSync(sourceRoot, { recursive: true, force: true });
