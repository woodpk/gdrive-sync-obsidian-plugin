import { deepStrictEqual, strictEqual } from "node:assert";
import { readdirSync } from "node:fs";
import { test } from "node:test";

import {
  getDeterministicBattery,
  listDeterministicBatteryNames,
} from "./batteries/deterministic-battery-registry";

test("deterministic batteries partition the automated BVP platform suite without duplicate test files", () => {
  deepStrictEqual(listDeterministicBatteryNames(), [
    "all-platform-tests",
    "platform-core",
    "s06-sync-semantics",
    "s07-fault-recovery-safety",
    "s08-live-platform-infrastructure",
    "s09-request-attribution",
  ]);

  const grouped = [
    getDeterministicBattery("platform-core")!,
    getDeterministicBattery("s06-sync-semantics")!,
    getDeterministicBattery("s07-fault-recovery-safety")!,
    getDeterministicBattery("s08-live-platform-infrastructure")!,
    getDeterministicBattery("s09-request-attribution")!,
  ];
  const files = grouped.flatMap(battery => battery.testFiles);
  strictEqual(new Set(files).size, files.length);

  const all = getDeterministicBattery("all-platform-tests")!;
  deepStrictEqual([...all.testFiles].sort(), [...files].sort());
  strictEqual(getDeterministicBattery("missing"), undefined);
});

test("all-platform-tests includes every compiled BVP test module exactly once", () => {
  const compiledTests = readdirSync(__dirname)
    .filter(name => name.endsWith(".test.js"))
    .sort();
  const all = [...getDeterministicBattery("all-platform-tests")!.testFiles].sort();

  deepStrictEqual(all, compiledTests);
  strictEqual(new Set(all).size, all.length);
});
