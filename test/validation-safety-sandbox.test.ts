import assert from "node:assert/strict";
import test from "node:test";
import {
  ValidationSafetySandbox,
  type ValidationSandboxSurfaceRoot,
} from "../src/validation/safety-sandbox";
import {
  validationRunIdentity,
  validationSandboxOwnership,
  type ValidationSandboxSurface,
} from "../src/validation/run-sandbox-checkpoint-contracts";

const roots: readonly ValidationSandboxSurfaceRoot[] = [
  { surface: "vault-fixture", root: ".validation/run-vh04/vault" },
  { surface: "validation-vault-state-copy", root: ".validation/run-vh04/state" },
  { surface: "validation-remote", root: ".validation/run-vh04/remote" },
  { surface: "validation-metadata", root: ".validation/run-vh04/meta" },
];

function sandbox() {
  return new ValidationSafetySandbox({
    run: validationRunIdentity("run-vh04", "C03"),
    roots,
  });
}

test("VH04 issues run-scoped ownership only inside configured disposable validation surfaces", () => {
  const active = sandbox();
  const examples: readonly [ValidationSandboxSurface, string][] = [
    ["vault-fixture", ".validation/run-vh04/vault/notes/fixture.md"],
    ["validation-vault-state-copy", ".validation/run-vh04/state/state-copy.json"],
    ["validation-remote", ".validation/run-vh04/remote/object-1"],
    ["validation-metadata", ".validation/run-vh04/meta/coordination.json"],
  ];

  for (const [surface, locator] of examples) {
    const issued = active.issueOwnership({ surface, locator });
    assert.equal(issued.status, "issued");
    if (issued.status !== "issued") continue;
    assert.equal(issued.ownership.owner.runId, "run-vh04");
    assert.equal(issued.ownership.owner.scenarioId, "C03");
    assert.equal(issued.ownership.surface, surface);
    assert.equal(issued.provenance.locator, locator);
    assert.equal(issued.provenance.state, "allocated");
    assert.equal(active.authorize({ run: issued.ownership.owner, mutation: "setup", ownership: issued.ownership }).status, "authorized");
  }
});

test("VH04 refuses unrelated vault content, external BRAIN assets, credentials, and primary state", () => {
  const active = sandbox();
  const unsafe: readonly [ValidationSandboxSurface, string][] = [
    ["vault-fixture", "00-Inbox/real-user-note.md"],
    ["validation-remote", "BRAIN-Assets/canonical/user-document.pdf"],
    ["validation-metadata", ".obsidian/plugins/gdrive-sync/oauth-refresh-token"],
    ["validation-vault-state-copy", ".obsidian/plugins/gdrive-sync/primary-sync-state.json"],
  ];

  for (const [surface, locator] of unsafe) {
    assert.deepEqual(active.issueOwnership({ surface, locator }), {
      status: "rejected",
      reason: "surface-out-of-scope",
    });
  }

  assert.deepEqual(active.issueOwnership({
    surface: "credentials" as ValidationSandboxSurface,
    locator: ".validation/run-vh04/meta/credential.txt",
  }), { status: "rejected", reason: "surface-out-of-scope" });
});

test("VH04 rejects root ownership, traversal, and overlapping sandbox namespaces", () => {
  const active = sandbox();
  assert.deepEqual(active.issueOwnership({
    surface: "vault-fixture",
    locator: ".validation/run-vh04/vault",
  }), { status: "rejected", reason: "surface-out-of-scope" });
  assert.deepEqual(active.issueOwnership({
    surface: "vault-fixture",
    locator: ".validation/run-vh04/vault/../state/primary.json",
  }), { status: "rejected", reason: "surface-out-of-scope" });

  assert.throws(() => new ValidationSafetySandbox({
    run: validationRunIdentity("run-overlap", "C03"),
    roots: [
      { surface: "vault-fixture", root: ".validation/run-overlap" },
      { surface: "validation-metadata", root: ".validation/run-overlap/meta" },
    ],
  }), /must not overlap/);
});

test("VH04 cleanup requires issued provenance and a recorded created state", () => {
  const active = sandbox();
  const run = validationRunIdentity("run-vh04", "C03");
  const issued = active.issueOwnership({
    surface: "vault-fixture",
    locator: ".validation/run-vh04/vault/cleanup/fixture.md",
  });
  assert.equal(issued.status, "issued");
  if (issued.status !== "issued") return;

  assert.deepEqual(active.authorize({ run, mutation: "cleanup", ownership: issued.ownership }), {
    status: "rejected",
    reason: "ownership-unproven",
  });

  const forged = validationSandboxOwnership({
    resourceId: "forged-but-well-shaped",
    surface: "vault-fixture",
    owner: run,
  });
  assert.deepEqual(active.authorize({ run, mutation: "cleanup", ownership: forged }), {
    status: "rejected",
    reason: "ownership-unproven",
  });

  assert.equal(active.recordCreated(issued.ownership).status, "authorized");
  assert.equal(active.authorize({ run, mutation: "mutate", ownership: issued.ownership }).status, "authorized");
  assert.equal(active.authorize({ run, mutation: "cleanup", ownership: issued.ownership }).status, "authorized");
  assert.equal(active.recordRemoved(issued.ownership).status, "authorized");
  assert.deepEqual(active.authorize({ run, mutation: "cleanup", ownership: issued.ownership }), {
    status: "rejected",
    reason: "ownership-unproven",
  });
});

test("VH04 rejects run mismatch and scenario mismatch for otherwise valid ownership", () => {
  const active = sandbox();
  const issued = active.issueOwnership({
    surface: "validation-metadata",
    locator: ".validation/run-vh04/meta/run-binding.json",
  });
  assert.equal(issued.status, "issued");
  if (issued.status !== "issued") return;

  assert.deepEqual(active.authorize({
    run: validationRunIdentity("different-run", "C03"),
    mutation: "setup",
    ownership: issued.ownership,
  }), { status: "rejected", reason: "run-mismatch" });

  assert.deepEqual(active.authorize({
    run: validationRunIdentity("run-vh04", "C04"),
    mutation: "setup",
    ownership: issued.ownership,
  }), { status: "rejected", reason: "scenario-mismatch" });
});

test("VH04 fails closed when restored provenance makes ownership ambiguous", () => {
  const run = validationRunIdentity("run-vh04", "C03");
  const ownership = validationSandboxOwnership({
    resourceId: "ambiguous-resource",
    surface: "vault-fixture",
    owner: run,
  });
  const active = new ValidationSafetySandbox({
    run,
    roots,
    provenance: [
      { ownership, locator: ".validation/run-vh04/vault/a.md", state: "created" },
      { ownership, locator: ".validation/run-vh04/vault/b.md", state: "created" },
    ],
  });

  assert.deepEqual(active.authorize({ run, mutation: "cleanup", ownership }), {
    status: "rejected",
    reason: "ownership-ambiguous",
  });
});

test("VH04 retains removed-resource provenance across snapshots without restoring cleanup authority", () => {
  const active = sandbox();
  const issued = active.issueOwnership({
    surface: "validation-remote",
    locator: ".validation/run-vh04/remote/disposable-object",
  });
  assert.equal(issued.status, "issued");
  if (issued.status !== "issued") return;

  assert.equal(active.recordCreated(issued.ownership).status, "authorized");
  assert.equal(active.recordRemoved(issued.ownership).status, "authorized");

  const snapshot = active.snapshot();
  assert.equal(snapshot.provenance.length, 1);
  assert.equal(snapshot.provenance[0].state, "removed");
  assert.equal(snapshot.provenance[0].locator, ".validation/run-vh04/remote/disposable-object");

  const restored = new ValidationSafetySandbox(snapshot);
  assert.deepEqual(restored.authorize({
    run: snapshot.run,
    mutation: "cleanup",
    ownership: snapshot.provenance[0].ownership,
  }), { status: "rejected", reason: "ownership-unproven" });
  assert.deepEqual(restored.issueOwnership({
    surface: "validation-remote",
    locator: ".validation/run-vh04/remote/disposable-object",
  }), { status: "rejected", reason: "ownership-ambiguous" });
});
