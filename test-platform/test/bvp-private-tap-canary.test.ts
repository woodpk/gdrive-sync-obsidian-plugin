import { test } from "node:test";
import { strictEqual } from "node:assert/strict";

/** Synthetic secret exclusively used by ER-03's fault injection. Never a real credential. */
test("deterministic subprocess TAP privacy canary", () => {
  if (process.env.BVP_PRIVACY_TAP_INJECT === "1") {
    process.stderr.write("Bearer synthetic-secret-stderr /Users/example/PrivateVault.txt\n");
    throw new Error("Bearer synthetic-secret-stack /Users/example/PrivateVault.txt");
  }
  strictEqual(1, 1);
});
