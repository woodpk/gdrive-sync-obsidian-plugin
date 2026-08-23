import { copyFileSync, existsSync, rmSync } from "node:fs";

const candidates = [".build/main.js", ".build/src/main.js"];
const source = candidates.find(existsSync);
if (!source) throw new Error("TypeScript build did not emit main.js");
copyFileSync(source, "main.js");
rmSync(".build", { recursive: true, force: true });
