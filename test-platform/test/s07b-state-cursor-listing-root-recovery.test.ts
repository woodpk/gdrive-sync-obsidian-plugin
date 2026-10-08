import { deepStrictEqual, notStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";

import { GoogleDriveAdapter } from "../../src/drive/google-drive-port";
import type { ManagedRemoteIdentity } from "../../src/contracts/google-drive";
import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { corruptStateScenario } from "../scenarios/07b/corrupt-state";
import { truncatedStateScenario } from "../scenarios/07b/truncated-state";
import { incompatibleStateVersionScenario } from "../scenarios/07b/incompatible-state-version";
import { lostChangeCursorScenario } from "../scenarios/07b/lost-change-cursor";
import { partialRemoteListingScenario } from "../scenarios/07b/partial-remote-listing";
import { partialChangePageScenario } from "../scenarios/07b/partial-change-page";
import { missingManagedRootScenario } from "../scenarios/07b/missing-managed-root";
import { rootIdentityMismatchScenario } from "../scenarios/07b/root-identity-mismatch";
import { incompatibleRootProtocolScenario } from "../scenarios/07b/incompatible-root-protocol";

const scenarios = [
  corruptStateScenario,
  truncatedStateScenario,
  incompatibleStateVersionScenario,
  lostChangeCursorScenario,
  partialRemoteListingScenario,
  partialChangePageScenario,
  missingManagedRootScenario,
  rootIdentityMismatchScenario,
  incompatibleRootProtocolScenario,
];

for (const scenario of scenarios) {
  test(`${scenario.id} executes fail-closed recovery semantics through production logic`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed", JSON.stringify({
      scenarioId: result.scenarioId,
      status: result.status,
      classification: result.classification,
      reason: result.reason,
      steps: result.steps,
      captures: result.captures,
    }, null, 2));
    strictEqual(result.steps.every(step => step.matchedExpectation), true);
  });
}

test("lost cursor is conservatively re-baselined rather than silently retained or advanced", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(lostChangeCursorScenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const before = result.captures.before as { changeCursor?: string };
  const after = result.captures.after as { changeCursor?: string };
  strictEqual(typeof before.changeCursor, "string");
  strictEqual(typeof after.changeCursor, "string");
  notStrictEqual(after.changeCursor, before.changeCursor);
});

test("partial remote listing cannot become a destructive local-delete plan", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(partialRemoteListingScenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const view = result.captures["plan-view"] as { operationKinds?: readonly string[] };
  strictEqual(Array.isArray(view.operationKinds), true);
  strictEqual(view.operationKinds?.includes("blocked-unsafe"), true);
  strictEqual(view.operationKinds?.includes("trash-local"), false);
});

test("state-integrity recovery scenarios all return to trusted state with both copies preserved", async () => {
  for (const scenario of [corruptStateScenario, truncatedStateScenario, incompatibleStateVersionScenario]) {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
    deepStrictEqual((result.captures["recovered-state"] as { status?: string }).status, "trusted");
    strictEqual((result.captures.local as { exists?: boolean }).exists, true);
    strictEqual((result.captures.remote as { exists?: boolean }).exists, true);
  }
});

test("wrong optimistic deletion expectation fails deterministically", async () => {
  const steps = partialRemoteListingScenario.steps.map(step =>
    step.id === "assert-blocked"
      ? { ...step, expected: "trash-local" }
      : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = {
    ...partialRemoteListingScenario,
    id: "s07b-wrong-optimistic-deletion-expectation",
    steps,
  } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});

test("durable folder recovery checks the configured vault root even when two managed roots coexist", async () => {
  const configured = {
    rootId: "new-validation-root",
    vaultIdentity: "vault:validation",
    protocolVersion: "1",
  } as unknown as ManagedRemoteIdentity;
  const accountRootIds = ["older-unrelated-root", configured.rootId];
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never, undefined, () => configured);
  const seams = adapter as unknown as Record<string, unknown>;
  let observedParentRoot = "";
  seams["guardPairedAccount"] = async () => ({ ok: true, value: undefined });
  seams["validateManagedRoot"] = async (identity: ManagedRemoteIdentity) => {
    strictEqual(identity.rootId, configured.rootId);
    strictEqual(identity.vaultIdentity, configured.vaultIdentity);
    return { ok: true, value: { status: "valid", identity } };
  };
  seams["getFile"] = async () => ({ ok: false, signal: { kind: "not-found" } });
  seams["resolveUniqueParent"] = async (rootId: string) => {
    observedParentRoot = rootId;
    return { ok: true, value: "validation-content-parent" };
  };
  seams["children"] = async () => ({ ok: true, value: [] });
  seams["uniqueManagedRoot"] = () => {
    throw new Error(`unsafe account-wide root discovery: ${accountRootIds.join(",")}`);
  };
  const descriptor = {
    kind: "remote-folder-create",
    targetPath: "BVP-VALIDATION/sample",
    parentRemoteObjectId: "validation-content-parent",
    remoteMutation: { reservedRemoteObjectId: "uncreated-reserved-folder" },
  } as unknown as Parameters<GoogleDriveAdapter["observeFolderCreateRecovery"]>[0];
  const result = await adapter.observeFolderCreateRecovery(descriptor);
  strictEqual(result.status, "authoritative-absent");
  strictEqual(observedParentRoot, configured.rootId);
});

test("durable folder recovery fails closed without a configured vault root", async () => {
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never);
  const seams = adapter as unknown as Record<string, unknown>;
  seams["guardPairedAccount"] = async () => ({ ok: true, value: undefined });
  seams["getFile"] = async () => { throw new Error("must not observe Drive without configured identity"); };
  const descriptor = {
    kind: "remote-folder-create",
    targetPath: "BVP-VALIDATION/sample",
    remoteMutation: { reservedRemoteObjectId: "uncreated-reserved-folder" },
  } as unknown as Parameters<GoogleDriveAdapter["observeFolderCreateRecovery"]>[0];
  const result = await adapter.observeFolderCreateRecovery(descriptor);
  strictEqual(result.status, "unobservable");
  if (result.status === "unobservable") {
    strictEqual(result.reason, "configured-managed-root-unobservable:recovery-required");
  }
});

test("reserved folder creation dispatches only inside the configured managed root", async () => {
  const configured = {
    rootId: "new-validation-root",
    vaultIdentity: "vault:validation",
    protocolVersion: "1",
  } as unknown as ManagedRemoteIdentity;
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never, undefined, () => configured);
  const seams = adapter as unknown as Record<string, unknown>;
  let observedParentRoot = "";
  let dispatchCount = 0;
  let fileReadCount = 0;
  seams["validateManagedRoot"] = async (identity: ManagedRemoteIdentity) => {
    strictEqual(identity.rootId, configured.rootId);
    return { ok: true, value: { status: "valid", identity } };
  };
  seams["getFile"] = async () => (++fileReadCount === 1
    ? { ok: false, signal: { kind: "not-found" } }
    : { ok: true, value: { id: "reserved-folder" } });
  seams["resolveUniqueParent"] = async (rootId: string) => {
    observedParentRoot = rootId;
    return { ok: true, value: "validation-content-parent" };
  };
  seams["metadataCreate"] = async () => {
    dispatchCount++;
    return { ok: true, value: { id: "reserved-folder" } };
  };
  seams["verifyReservedCreate"] = async (_identity: unknown, _file: unknown, rootId: string) => {
    strictEqual(rootId, configured.rootId);
    return { status: "verified-effect", applicationProof: { kind: "reserved-create", remoteObjectId: "reserved-folder", path: "sample" } };
  };
  seams["uniqueManagedRoot"] = () => { throw new Error("account-wide root selection is forbidden"); };
  const outcome = await adapter.createReserved({
    kind: "reserved-folder-create",
    intentId: "intent:1",
    reservedRemoteObjectId: "reserved-folder",
    path: "sample",
  } as never);
  strictEqual(outcome.status, "verified-effect");
  strictEqual(observedParentRoot, configured.rootId);
  strictEqual(dispatchCount, 1);
});
