import { strictEqual } from "node:assert";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

const repositoryRoot = resolve(__dirname, "../../../..");
const migrationSourceSha = "5b57c1ded6d314810ac2cca2a363342e67d9bee3";

function git(args: readonly string[], encoding: BufferEncoding | null = "utf8"): Buffer | string {
  const result = spawnSync("git", ["-C", repositoryRoot, ...args], {
    encoding: encoding ?? undefined,
    maxBuffer: 16 * 1024 * 1024,
  });
  strictEqual(
    result.status,
    0,
    `git ${args.join(" ")} failed: ${String(result.stderr ?? "")}`,
  );
  return result.stdout ?? (encoding === null ? Buffer.alloc(0) : "");
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

test("repository standardization does not alter shipping/product build inputs", () => {
  const output = String(
    git([
      "diff",
      "--name-only",
      migrationSourceSha + "..HEAD",
      "--",
      "src",
      "scripts",
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      "tsconfig.test.json",
      "manifest.json",
      "versions.json",
    ]),
  ).trim();

  strictEqual(
    output,
    "",
    "repository standardization changed shipping/product build inputs:\n" + output,
  );
});

test("shipping main.js remains byte-identical to the migration source", () => {
  const baseline = git(["show", migrationSourceSha + ":main.js"], null) as Buffer;
  const current = readFileSync(resolve(repositoryRoot, "main.js"));

  strictEqual(
    sha256(current),
    sha256(baseline),
    "main.js changed across repository-development standardization",
  );
});
