import {
  deepStrictEqual,
  notStrictEqual,
  strictEqual,
  rejects,
} from "node:assert/strict";
import { test } from "node:test";

import {
  InMemoryLocalVault,
  InMemoryLocalVaultStaleObservationError,
  virtualVaultPath,
} from "../src/virtual-world/in-memory-local-vault";

function source(...chunks: readonly number[][]) {
  const byteChunks = chunks.map((chunk) => Uint8Array.from(chunk));
  return {
    sizeBytes: byteChunks.reduce((total, chunk) => total + chunk.byteLength, 0),
    async *openChunks(): AsyncIterable<Uint8Array> {
      for (const chunk of byteChunks) yield Uint8Array.from(chunk);
    },
  };
}

async function readAll(result: Awaited<ReturnType<InMemoryLocalVault["readFile"]>>): Promise<number[]> {
  const bytes: number[] = [];
  for await (const chunk of result.content.openChunks()) bytes.push(...chunk);
  return bytes;
}

test("stateful create, read, replace, and repeated observation preserve exact bytes and advance tokens", async () => {
  const vault = new InMemoryLocalVault();
  const changes: string[] = [];
  vault.onChange((change) => changes.push(change.kind));

  const path = virtualVaultPath("notes/a.bin");
  const created = await vault.createFile(path, source([1, 2], [3, 4]));
  strictEqual(created.evidence?.sizeBytes, 4);

  const firstObservation = await vault.observe(path);
  strictEqual(firstObservation.status, "present");
  if (firstObservation.status !== "present") throw new Error("expected present");
  strictEqual(firstObservation.entityKind, "file");
  strictEqual(firstObservation.stability, "stable");
  strictEqual(firstObservation.content?.sizeBytes, 4);
  strictEqual(firstObservation.observationToken, created.observationToken);

  const firstRead = await vault.readFile(path, firstObservation.observationToken);
  deepStrictEqual(await readAll(firstRead), [1, 2, 3, 4]);

  const replaced = await vault.replaceFile(
    path,
    source([9], [8, 7]),
    firstObservation.observationToken,
  );
  notStrictEqual(replaced.observationToken, firstObservation.observationToken);
  deepStrictEqual(await readAll(await vault.readFile(path, replaced.observationToken)), [9, 8, 7]);

  const repeated = await vault.observe(path);
  strictEqual(repeated.status, "present");
  if (repeated.status !== "present") throw new Error("expected present");
  strictEqual(repeated.observationToken, replaced.observationToken);
  deepStrictEqual(changes, ["created", "modified"]);
});

test("confirmed absence stays distinct from missing-file reads and stale replace preconditions", async () => {
  const vault = new InMemoryLocalVault();
  const missing = virtualVaultPath("missing.md");

  const absent = await vault.observe(missing);
  strictEqual(absent.status, "absent");
  await rejects(() => vault.readFile(missing), /does not exist/i);
  const tokenSource = await vault.createFile(
    virtualVaultPath("token-source.md"),
    source([9]),
  );
  await rejects(
    () => vault.replaceFile(missing, source([1]), tokenSource.observationToken),
    InMemoryLocalVaultStaleObservationError,
  );

  const path = virtualVaultPath("present.md");
  const created = await vault.createFile(path, source([1]));
  await vault.replaceFile(path, source([2]), created.observationToken);
  await rejects(
    () => vault.replaceFile(path, source([3]), created.observationToken),
    InMemoryLocalVaultStaleObservationError,
  );
});

test("replace without an expected token materializes an absent production target", async () => {
  const vault = new InMemoryLocalVault();
  const changes: string[] = [];
  vault.onChange((change) => changes.push(change.kind));

  const receipt = await vault.replaceFile(
    virtualVaultPath("materialized.bin"),
    source([4, 5, 6]),
  );

  strictEqual(String(receipt.path), "materialized.bin");
  deepStrictEqual(
    await readAll(
      await vault.readFile(
        virtualVaultPath("materialized.bin"),
        receipt.observationToken,
      ),
    ),
    [4, 5, 6],
  );
  deepStrictEqual(changes, ["created"]);
});

test("createFolder is idempotent for any already-existing production target", async () => {
  const vault = new InMemoryLocalVault();
  const changes: string[] = [];
  vault.onChange((change) => changes.push(change.kind));

  const first = await vault.createFolder(virtualVaultPath("existing-folder"));
  const second = await vault.createFolder(virtualVaultPath("existing-folder"));

  strictEqual(second.observationToken, first.observationToken);

  vault.seedFile("existing-file", "x");
  const existingFile = await vault.observe(virtualVaultPath("existing-file"));
  strictEqual(existingFile.status, "present");
  const fileReceipt = await vault.createFolder(
    virtualVaultPath("existing-file"),
  );

  strictEqual(
    fileReceipt.observationToken,
    existingFile.status === "present"
      ? existingFile.observationToken
      : undefined,
  );
  strictEqual(
    (await vault.observe(virtualVaultPath("existing-file"))).status,
    "present",
  );
  deepStrictEqual(changes, ["created"]);
});

test("folder move preserves one rename observation while moving retained subtree state", async () => {
  const vault = new InMemoryLocalVault();
  vault.seedFolder("docs");
  vault.seedFile("docs/a.md", "alpha");
  vault.seedFolder("docs/sub");
  vault.seedFile("docs/sub/b.md", "beta");

  const changes: Array<{ kind: string; from?: string; to?: string }> = [];
  vault.onChange((change) => {
    changes.push(
      change.kind === "renamed"
        ? { kind: change.kind, from: String(change.fromPath), to: String(change.toPath) }
        : { kind: change.kind },
    );
  });

  const before = await vault.observe(virtualVaultPath("docs"));
  strictEqual(before.status, "present");
  if (before.status !== "present") throw new Error("expected folder");

  const receipt = await vault.move(
    virtualVaultPath("docs"),
    virtualVaultPath("archive/docs"),
  );
  strictEqual(String(receipt.path), "archive/docs");

  strictEqual((await vault.observe(virtualVaultPath("docs"))).status, "absent");
  strictEqual((await vault.observe(virtualVaultPath("docs/a.md"))).status, "absent");
  strictEqual((await vault.observe(virtualVaultPath("archive/docs"))).status, "present");
  deepStrictEqual(
    await readAll(await vault.readFile(virtualVaultPath("archive/docs/sub/b.md"))),
    [...new TextEncoder().encode("beta")],
  );

  const after = await vault.observe(virtualVaultPath("archive/docs"));
  strictEqual(after.status, "present");
  if (after.status !== "present") throw new Error("expected moved folder");
  notStrictEqual(after.observationToken, before.observationToken);
  deepStrictEqual(changes, [
    { kind: "renamed", from: "docs", to: "archive/docs" },
  ]);
});

test("trashing a folder removes its retained subtree and does not affect unrelated state", async () => {
  const vault = new InMemoryLocalVault();
  vault.seedFolder("remove");
  vault.seedFile("remove/a.md", "a");
  vault.seedFolder("remove/nested");
  vault.seedFile("remove/nested/b.md", "b");
  vault.seedFile("keep.md", "keep");

  await vault.trash(virtualVaultPath("remove"));

  strictEqual((await vault.observe(virtualVaultPath("remove"))).status, "absent");
  strictEqual((await vault.observe(virtualVaultPath("remove/a.md"))).status, "absent");
  strictEqual((await vault.observe(virtualVaultPath("remove/nested/b.md"))).status, "absent");
  strictEqual((await vault.observe(virtualVaultPath("keep.md"))).status, "present");
});

test("enumeration reports multiple retained paths and scopes unreadable/inaccessible uncertainty truthfully", async () => {
  const vault = new InMemoryLocalVault();
  vault.seedFile("safe.md", "safe");
  vault.seedFile("broken.md", "broken", { access: "unreadable" });
  vault.seedFolder("blocked", { access: "inaccessible" });
  vault.seedFile("blocked/hidden.md", "hidden");
  vault.seedFolder("empty");

  const listing = await vault.enumerate();
  strictEqual(listing.completeness.status, "partial");

  deepStrictEqual(
    listing.entries.map((entry) => [String(entry.path), entry.status]),
    [
      ["blocked", "inaccessible"],
      ["broken.md", "unreadable"],
      ["empty", "present"],
      ["safe.md", "present"],
    ],
  );
  deepStrictEqual(
    listing.uncertainties?.map((item) => [
      item.scope,
      "path" in item ? String(item.path) : "",
    ]),
    [
      ["subtree", "blocked"],
      ["path", "broken.md"],
    ],
  );
});

test("active-write stability is observable and prevents a stable read until external reality settles", async () => {
  const vault = new InMemoryLocalVault();
  vault.seedFile("active.bin", Uint8Array.from([1, 2, 3]));
  vault.setStability("active.bin", "unstable");

  const unstable = await vault.observe(virtualVaultPath("active.bin"));
  strictEqual(unstable.status, "present");
  if (unstable.status !== "present") throw new Error("expected present");
  strictEqual(unstable.stability, "unstable");
  await rejects(
    () => vault.readFile(virtualVaultPath("active.bin")),
    /not stable/i,
  );

  vault.setStability("active.bin", "stable");
  const stable = await vault.readFile(virtualVaultPath("active.bin"));
  deepStrictEqual(await readAll(stable), [1, 2, 3]);
});

test("path validation uses production case, Unicode, reserved-name, and external-reference rules", async () => {
  const vault = new InMemoryLocalVault();
  vault.seedFile("Notes/Alpha.md", "a");
  vault.seedFile("Caf\u00e9.md", "coffee");

  const caseCollision = await vault.validatePath(
    virtualVaultPath("notes/alpha.md"),
  );
  strictEqual(caseCollision.status, "blocked");
  if (caseCollision.status === "blocked") strictEqual(caseCollision.reason, "case-collision");

  const unicodeCollision = await vault.validatePath(
    virtualVaultPath("Cafe\u0301.md"),
  );
  strictEqual(unicodeCollision.status, "blocked");
  if (unicodeCollision.status === "blocked") strictEqual(unicodeCollision.reason, "unicode-collision");

  const reserved = await vault.validatePath(virtualVaultPath("CON.md"));
  strictEqual(reserved.status, "blocked");
  if (reserved.status === "blocked") strictEqual(reserved.reason, "reserved-name");

  const external = await vault.validatePath(virtualVaultPath("../escape.md"));
  strictEqual(external.status, "blocked");
  if (external.status === "blocked") strictEqual(external.reason, "external-reference");
});

test("create and move reject incompatible or colliding destinations rather than choosing policy outcomes", async () => {
  const vault = new InMemoryLocalVault();
  vault.seedFile("Notes/Alpha.md", "a");
  vault.seedFile("other.md", "b");

  await rejects(
    () => vault.createFile(virtualVaultPath("notes/alpha.md"), source([1])),
    /case-collision/i,
  );
  await rejects(
    () => vault.move(
      virtualVaultPath("other.md"),
      virtualVaultPath("NOTES/ALPHA.md"),
    ),
    /case-collision/i,
  );
  await rejects(
    () => vault.createFile(virtualVaultPath("../outside.md"), source([1])),
    /external-reference/i,
  );
});

test("enumeration reuses production exclusion/configuration boundaries without hiding direct external observations", async () => {
  const vault = new InMemoryLocalVault({
    activeConfigurationDirectory: ".obsidian",
    userExclusionPatterns: ["private/**"],
  });
  vault.seedFile(".git/config", "git");
  vault.seedFile(".obsidian/app.json", "{}");
  vault.seedFile("private/secret.md", "secret");
  vault.seedFile("keep.md", "keep");

  const listing = await vault.enumerate();
  deepStrictEqual(
    listing.entries.map((entry) => String(entry.path)),
    ["keep.md"],
  );

  strictEqual(
    (await vault.observe(virtualVaultPath(".obsidian/app.json"))).status,
    "present",
  );

  const portable = await vault.classifyConfiguration(
    virtualVaultPath(".obsidian/app.json"),
  );
  strictEqual(portable.classification, "portable");

  const deviceLocal = await vault.classifyConfiguration(
    virtualVaultPath(".obsidian/workspace.json"),
  );
  strictEqual(deviceLocal.classification, "device-local");

  const protectedState = await vault.classifyConfiguration(
    virtualVaultPath(".obsidian/token.json"),
  );
  strictEqual(protectedState.classification, "protected");

  const unknownPlugin = await vault.classifyConfiguration(
    virtualVaultPath(".obsidian/plugins/example/data.json"),
  );
  strictEqual(unknownPlugin.classification, "unknown");
});

test("access faults remain observations and can be restored without fabricating synchronization decisions", async () => {
  const vault = new InMemoryLocalVault();
  vault.seedFile("locked.md", "locked");
  vault.setAccess("locked.md", "inaccessible");

  const inaccessible = await vault.observe(virtualVaultPath("locked.md"));
  strictEqual(inaccessible.status, "inaccessible");
  await rejects(
    () => vault.readFile(virtualVaultPath("locked.md")),
    /inaccessible/i,
  );

  vault.setAccess("locked.md", "readable");
  const restored = await vault.observe(virtualVaultPath("locked.md"));
  strictEqual(restored.status, "present");
  deepStrictEqual(
    await readAll(await vault.readFile(virtualVaultPath("locked.md"))),
    [...new TextEncoder().encode("locked")],
  );
});

test("lifecycle observation is deterministic, unsubscribable, and non-destructive", async () => {
  const vault = new InMemoryLocalVault({ ready: true });
  vault.seedFile("safe.md", "safe");
  const events: string[] = [];

  const unsubscribe = vault.onLifecycle((event) => events.push(event.kind));
  vault.signalLifecycle("suspend");
  vault.signalLifecycle("resume");
  unsubscribe();
  vault.signalLifecycle("unload");

  deepStrictEqual(events, ["vault-ready", "suspend", "resume"]);
  strictEqual((await vault.observe(virtualVaultPath("safe.md"))).status, "present");
});

test("empty folders remain first-class local reality in complete enumeration", async () => {
  const vault = new InMemoryLocalVault();
  await vault.createFolder(virtualVaultPath("empty-folder"));

  const listing = await vault.enumerate();
  strictEqual(listing.completeness.status, "complete");
  const folder = listing.entries.find(
    (entry) => String(entry.path) === "empty-folder",
  );
  strictEqual(folder?.status, "present");
  if (folder?.status === "present") strictEqual(folder.entityKind, "folder");
});
