import { createHash } from "node:crypto";
import {
  deepStrictEqual,
  notStrictEqual,
  strictEqual,
  throws,
} from "node:assert/strict";
import { test } from "node:test";

import {
  InMemoryGoogleDriveCore,
  virtualChangeCursor,
  virtualDrivePath,
  virtualProtocolVersion,
  virtualRemoteObjectId,
  virtualVaultIdentity,
} from "../src/virtual-world/in-memory-google-drive";

function source(...chunks: readonly number[][]) {
  const byteChunks = chunks.map((chunk) => Uint8Array.from(chunk));
  return {
    sizeBytes: byteChunks.reduce((total, chunk) => total + chunk.byteLength, 0),
    async *openChunks(): AsyncIterable<Uint8Array> {
      for (const chunk of byteChunks) yield Uint8Array.from(chunk);
    },
  };
}

async function readAll(
  result: Awaited<ReturnType<InMemoryGoogleDriveCore["download"]>>,
): Promise<number[]> {
  if (!result.ok) throw new Error(result.signal.kind);
  const bytes: number[] = [];
  for await (const chunk of result.value.content.openChunks()) {
    bytes.push(...chunk);
  }
  return bytes;
}

function expectedSha256(bytes: readonly number[]): string {
  return `sha256:${createHash("sha256")
    .update(Uint8Array.from(bytes))
    .digest("hex")}`;
}

async function managedRoot(drive: InMemoryGoogleDriveCore) {
  const created = await drive.createManagedRoot(
    virtualVaultIdentity("vault-a"),
    virtualProtocolVersion("1"),
  );
  if (!created.ok) throw new Error(created.signal.kind);
  return created.value;
}

test("managed root creation, pairing, validation, and protocol info use deterministic production records", async () => {
  const drive = new InMemoryGoogleDriveCore();

  deepStrictEqual(await drive.authenticationState(), {
    status: "authenticated",
    accountHint: "in-memory-drive",
  });

  const first = await managedRoot(drive);
  const second = await drive.createManagedRoot(
    virtualVaultIdentity("vault-b"),
    virtualProtocolVersion("1"),
  );
  strictEqual(second.ok, true);
  if (!second.ok) return;

  notStrictEqual(first.rootId, second.value.rootId);

  const paired = await drive.pairManagedRoot(
    first.rootId,
    virtualVaultIdentity("vault-a"),
  );
  strictEqual(paired.ok, true);
  if (paired.ok) {
    strictEqual(paired.value.status, "valid");
  }

  const mismatch = await drive.pairManagedRoot(
    first.rootId,
    virtualVaultIdentity("different-vault"),
  );
  strictEqual(mismatch.ok, true);
  if (mismatch.ok) {
    strictEqual(mismatch.value.status, "identity-mismatch");
  }

  const validated = await drive.validateManagedRoot(first);
  strictEqual(validated.ok, true);
  if (validated.ok) strictEqual(validated.value.status, "valid");

  const protocol = await drive.protocolInfo(first.rootId);
  strictEqual(protocol.ok, true);
  if (protocol.ok) {
    strictEqual(String(protocol.value.currentVersion), "1");
    strictEqual(protocol.value.compatible, true);
  }

  const unsupported = await drive.createManagedRoot(
    virtualVaultIdentity("vault-c"),
    virtualProtocolVersion("2"),
  );
  strictEqual(unsupported.ok, false);
  if (!unsupported.ok) {
    strictEqual(unsupported.signal.kind, "recovery-required");
  }
});

test("create then download preserves exact bytes and exposes deterministic content evidence", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("docs/a.bin"),
    entityKind: "file",
    content: source([1, 2], [3, 4]),
  });
  strictEqual(created.ok, true);
  if (!created.ok) return;

  strictEqual(String(created.value.path), "docs/a.bin");
  strictEqual(created.value.evidence?.revision, "1");
  strictEqual(created.value.evidence?.sizeBytes, 4);
  strictEqual(
    String(created.value.evidence?.hash),
    expectedSha256([1, 2, 3, 4]),
  );

  const downloaded = await drive.download(created.value.remoteObjectId);
  strictEqual(downloaded.ok, true);
  deepStrictEqual(await readAll(downloaded), [1, 2, 3, 4]);
});

test("repeated read without mutation preserves remote ID revision evidence and content", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("stable.txt"),
    entityKind: "file",
    content: source([7, 8]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  const first = await drive.download(created.value.remoteObjectId);
  const second = await drive.download(created.value.remoteObjectId);
  strictEqual(first.ok, true);
  strictEqual(second.ok, true);
  if (!first.ok || !second.ok) return;

  strictEqual(first.value.remoteObjectId, second.value.remoteObjectId);
  deepStrictEqual(first.value.evidence, second.value.evidence);
  deepStrictEqual(await readAll(first), [7, 8]);
  deepStrictEqual(await readAll(second), [7, 8]);
});

test("update changes content and revision while preserving the same remote object ID", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("note.md"),
    entityKind: "file",
    content: source([1]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  const updated = await drive.update({
    remoteObjectId: created.value.remoteObjectId,
    path: virtualDrivePath("note.md"),
    content: source([9, 8, 7]),
    expectedRemoteRevision: "1",
  });
  strictEqual(updated.ok, true);
  if (!updated.ok) return;

  strictEqual(updated.value.remoteObjectId, created.value.remoteObjectId);
  strictEqual(updated.value.evidence?.revision, "2");
  strictEqual(updated.value.evidence?.sizeBytes, 3);
  notStrictEqual(
    updated.value.evidence?.hash,
    created.value.evidence?.hash,
  );
  deepStrictEqual(
    await readAll(await drive.download(created.value.remoteObjectId)),
    [9, 8, 7],
  );

  const stale = await drive.update({
    remoteObjectId: created.value.remoteObjectId,
    path: virtualDrivePath("note.md"),
    content: source([5]),
    expectedRemoteRevision: "1",
  });
  strictEqual(stale.ok, false);
  if (!stale.ok) {
    strictEqual(stale.signal.kind, "conflict");
  }
});

test("move preserves object identity while updating path revision and parent metadata", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("old.md"),
    entityKind: "file",
    content: source([3]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  const moved = await drive.move(
    created.value.remoteObjectId,
    virtualDrivePath("old.md"),
    virtualDrivePath("archive/new.md"),
  );
  strictEqual(moved.ok, true);
  if (!moved.ok) return;

  strictEqual(moved.value.remoteObjectId, created.value.remoteObjectId);
  strictEqual(moved.value.evidence?.revision, "2");

  const oldObservation = await drive.observe(
    root.rootId,
    virtualDrivePath("old.md"),
  );
  strictEqual(oldObservation.ok, true);
  if (oldObservation.ok) strictEqual(oldObservation.value.status, "absent");

  const newObservation = await drive.observe(
    root.rootId,
    virtualDrivePath("archive/new.md"),
  );
  strictEqual(newObservation.ok, true);
  if (newObservation.ok && newObservation.value.status === "present") {
    strictEqual(
      newObservation.value.remoteObjectId,
      created.value.remoteObjectId,
    );
  }

  const snapshot = drive.inspectObject(created.value.remoteObjectId);
  strictEqual(String(snapshot?.parentPath), "archive");
  strictEqual(snapshot?.revision, "2");

  const listing = await drive.listForReconciliation(root.rootId);
  strictEqual(listing.ok, true);
  if (listing.ok) {
    const archive = listing.value.entries.find(
      (entry) => String(entry.path) === "archive",
    );
    strictEqual(archive?.entityKind, "folder");
  }
});

test("moving a folder remaps descendant logical paths without changing descendant IDs or revisions", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const folder = await drive.create(root.rootId, {
    path: virtualDrivePath("folder"),
    entityKind: "folder",
  });
  const child = await drive.create(root.rootId, {
    path: virtualDrivePath("folder/child.bin"),
    entityKind: "file",
    content: source([1, 2]),
  });
  if (!folder.ok || !child.ok) throw new Error("create failed");

  const childBefore = drive.inspectObject(child.value.remoteObjectId);
  strictEqual(childBefore?.revision, "1");

  const moved = await drive.move(
    folder.value.remoteObjectId,
    virtualDrivePath("folder"),
    virtualDrivePath("moved/folder"),
  );
  strictEqual(moved.ok, true);

  const childAfter = drive.inspectObject(child.value.remoteObjectId);
  strictEqual(childAfter?.remoteObjectId, child.value.remoteObjectId);
  strictEqual(String(childAfter?.path), "moved/folder/child.bin");
  strictEqual(childAfter?.revision, "1");

  const oldChild = await drive.observe(
    root.rootId,
    virtualDrivePath("folder/child.bin"),
  );
  strictEqual(oldChild.ok, true);
  if (oldChild.ok) strictEqual(oldChild.value.status, "absent");

  const newChild = await drive.observe(
    root.rootId,
    virtualDrivePath("moved/folder/child.bin"),
  );
  strictEqual(newChild.ok, true);
  if (newChild.ok && newChild.value.status === "present") {
    strictEqual(newChild.value.remoteObjectId, child.value.remoteObjectId);
  }
});

test("trashing a folder hides its subtree while retaining descendant object identity and revisions", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const folder = await drive.create(root.rootId, {
    path: virtualDrivePath("container"),
    entityKind: "folder",
  });
  const child = await drive.create(root.rootId, {
    path: virtualDrivePath("container/child.txt"),
    entityKind: "file",
    content: source([5]),
  });
  if (!folder.ok || !child.ok) throw new Error("create failed");

  const childBefore = drive.inspectObject(child.value.remoteObjectId);
  await drive.trash(folder.value.remoteObjectId);

  const childRetained = drive.inspectObject(child.value.remoteObjectId);
  strictEqual(childRetained?.remoteObjectId, child.value.remoteObjectId);
  strictEqual(childRetained?.revision, childBefore?.revision);
  strictEqual(childRetained?.trashed, false);

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("container/child.txt"),
  );
  strictEqual(observed.ok, true);
  if (observed.ok) strictEqual(observed.value.status, "absent");

  const listing = await drive.listForReconciliation(root.rootId);
  strictEqual(listing.ok, true);
  if (listing.ok) {
    strictEqual(
      listing.value.entries.some(
        (entry) => entry.remoteObjectId === child.value.remoteObjectId,
      ),
      false,
    );
  }
});

test("trash hides the path from ordinary observation/listing while retaining the same object identity", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("remove.bin"),
    entityKind: "file",
    content: source([4, 4]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  const before = drive.inspectObject(created.value.remoteObjectId);
  strictEqual(before?.trashed, false);

  const trashed = await drive.trash(created.value.remoteObjectId);
  strictEqual(trashed.ok, true);

  const retained = drive.inspectObject(created.value.remoteObjectId);
  strictEqual(retained?.remoteObjectId, created.value.remoteObjectId);
  strictEqual(retained?.trashed, true);
  strictEqual(retained?.revision, "2");

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("remove.bin"),
  );
  strictEqual(observed.ok, true);
  if (observed.ok) strictEqual(observed.value.status, "absent");

  const listing = await drive.listForReconciliation(root.rootId);
  strictEqual(listing.ok, true);
  if (listing.ok) {
    strictEqual(
      listing.value.entries.some(
        (entry) => entry.remoteObjectId === created.value.remoteObjectId,
      ),
      false,
    );
    strictEqual(listing.value.completeness.status, "complete");
  }
});

test("multiple created objects retain distinct IDs and complete listing reflects current modeled reality", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const one = await drive.create(root.rootId, {
    path: virtualDrivePath("one.md"),
    entityKind: "file",
    content: source([1]),
  });
  const two = await drive.create(root.rootId, {
    path: virtualDrivePath("two.md"),
    entityKind: "file",
    content: source([2]),
  });
  const folder = await drive.create(root.rootId, {
    path: virtualDrivePath("empty"),
    entityKind: "folder",
  });
  if (!one.ok || !two.ok || !folder.ok) throw new Error("create failed");

  notStrictEqual(one.value.remoteObjectId, two.value.remoteObjectId);
  notStrictEqual(one.value.remoteObjectId, folder.value.remoteObjectId);
  notStrictEqual(two.value.remoteObjectId, folder.value.remoteObjectId);

  const listing = await drive.listForReconciliation(root.rootId);
  strictEqual(listing.ok, true);
  if (!listing.ok) return;

  strictEqual(listing.value.completeness.status, "complete");
  deepStrictEqual(
    listing.value.entries.map((entry) => [
      String(entry.path),
      entry.entityKind,
      String(entry.remoteObjectId),
    ]),
    [
      ["empty", "folder", String(folder.value.remoteObjectId)],
      ["one.md", "file", String(one.value.remoteObjectId)],
      ["two.md", "file", String(two.value.remoteObjectId)],
    ],
  );
});

test("nested create deterministically materializes missing parent folders as managed remote reality", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("a/b/c.txt"),
    entityKind: "file",
    content: source([1, 2, 3]),
  });
  strictEqual(created.ok, true);

  const listing = await drive.listForReconciliation(root.rootId);
  strictEqual(listing.ok, true);
  if (!listing.ok) return;

  deepStrictEqual(
    listing.value.entries.map((entry) => [
      String(entry.path),
      entry.entityKind,
    ]),
    [
      ["a", "folder"],
      ["a/b", "folder"],
      ["a/b/c.txt", "file"],
    ],
  );
});

test("missing remote IDs use the production not-found classification", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const missing = virtualRemoteObjectId("missing-id");

  const downloaded = await drive.download(missing);
  strictEqual(downloaded.ok, false);
  if (!downloaded.ok) {
    strictEqual(downloaded.signal.kind, "not-found");
    if (downloaded.signal.kind === "not-found") {
      strictEqual(downloaded.signal.remoteObjectId, missing);
    }
  }

  const updated = await drive.update({
    remoteObjectId: missing,
    path: virtualDrivePath("missing.md"),
    content: source([1]),
  });
  strictEqual(updated.ok, false);
  if (!updated.ok) strictEqual(updated.signal.kind, "not-found");

  const moved = await drive.move(
    missing,
    virtualDrivePath("missing.md"),
    virtualDrivePath("elsewhere.md"),
  );
  strictEqual(moved.ok, false);
  if (!moved.ok) strictEqual(moved.signal.kind, "not-found");

  const trashed = await drive.trash(missing);
  strictEqual(trashed.ok, false);
  if (!trashed.ok) strictEqual(trashed.signal.kind, "not-found");

  const missingRoot = await drive.listForReconciliation(
    virtualRemoteObjectId("missing-root"),
  );
  strictEqual(missingRoot.ok, false);
  if (!missingRoot.ok) strictEqual(missingRoot.signal.kind, "not-found");

  const stillValid = await drive.validateManagedRoot(root);
  strictEqual(stillValid.ok, true);
});

test("folder create ignores file integrity evidence exactly like the production raw Drive primitive", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("folder-with-evidence"),
    entityKind: "folder",
    expectedEvidence: {
      sizeBytes: 999,
      hash: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" as never,
    },
  });

  strictEqual(created.ok, true);
  if (!created.ok) return;
  strictEqual(String(created.value.path), "folder-with-evidence");
  strictEqual(created.value.evidence, undefined);

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("folder-with-evidence"),
  );
  strictEqual(observed.ok, true);
  if (observed.ok && observed.value.status === "present") {
    strictEqual(observed.value.entityKind, "folder");
    strictEqual(observed.value.remoteObjectId, created.value.remoteObjectId);
  }
});

test("folder download and content update fail with production conflict classification", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const folder = await drive.create(root.rootId, {
    path: virtualDrivePath("folder"),
    entityKind: "folder",
  });
  if (!folder.ok) throw new Error(folder.signal.kind);

  const downloaded = await drive.download(folder.value.remoteObjectId);
  strictEqual(downloaded.ok, false);
  if (!downloaded.ok) strictEqual(downloaded.signal.kind, "conflict");

  const updated = await drive.update({
    remoteObjectId: folder.value.remoteObjectId,
    path: virtualDrivePath("folder"),
    content: source([1]),
  });
  strictEqual(updated.ok, false);
  if (!updated.ok) strictEqual(updated.signal.kind, "conflict");
});


test("change feed records deterministic mutation order and advances an opaque production cursor", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const start = await drive.getStartCursor(root.rootId);
  if (!start.ok) throw new Error(start.signal.kind);

  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("feed.txt"),
    entityKind: "file",
    content: source([1]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  const updated = await drive.update({
    remoteObjectId: created.value.remoteObjectId,
    path: virtualDrivePath("feed.txt"),
    content: source([2, 3]),
    expectedRemoteRevision: "1",
  });
  if (!updated.ok) throw new Error(updated.signal.kind);

  const moved = await drive.move(
    created.value.remoteObjectId,
    virtualDrivePath("feed.txt"),
    virtualDrivePath("renamed.txt"),
  );
  if (!moved.ok) throw new Error(moved.signal.kind);

  const trashed = await drive.trash(created.value.remoteObjectId);
  if (!trashed.ok) throw new Error(trashed.signal.kind);

  const page = await drive.readChanges(root.rootId, start.value);
  strictEqual(page.ok, true);
  if (!page.ok) return;

  strictEqual(page.value.completeness.status, "complete");
  deepStrictEqual(
    page.value.changes.map((change) =>
      change.kind === "upsert"
        ? [
            change.kind,
            String(change.entry.path),
            change.entry.content?.revision,
            String(change.entry.remoteObjectId),
            change.entry.trashed,
          ]
        : [
            change.kind,
            String(change.lastKnownPath),
            undefined,
            String(change.remoteObjectId),
            undefined,
          ],
    ),
    [
      ["upsert", "feed.txt", "1", String(created.value.remoteObjectId), false],
      ["upsert", "feed.txt", "2", String(created.value.remoteObjectId), false],
      ["upsert", "renamed.txt", "3", String(created.value.remoteObjectId), false],
      ["upsert", "renamed.txt", "4", String(created.value.remoteObjectId), true],
    ],
  );
  notStrictEqual(page.value.nextCursor, start.value);

  const empty = await drive.readChanges(root.rootId, page.value.nextCursor);
  strictEqual(empty.ok, true);
  if (empty.ok) {
    deepStrictEqual(empty.value.changes, []);
    strictEqual(empty.value.nextCursor, page.value.nextCursor);
  }
});

test("provider removal emits a removed change distinct from trash and removes retained reality", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("provider-removed.md"),
    entityKind: "file",
    content: source([4]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  const cursor = await drive.getStartCursor(root.rootId);
  if (!cursor.ok) throw new Error(cursor.signal.kind);

  drive.removeExternally(created.value.remoteObjectId);

  const page = await drive.readChanges(root.rootId, cursor.value);
  strictEqual(page.ok, true);
  if (!page.ok) return;
  deepStrictEqual(page.value.changes, [
    {
      kind: "removed",
      remoteObjectId: created.value.remoteObjectId,
      lastKnownPath: virtualDrivePath("provider-removed.md"),
    },
  ]);

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("provider-removed.md"),
  );
  strictEqual(observed.ok, true);
  if (observed.ok) strictEqual(observed.value.status, "absent");

  const downloaded = await drive.download(created.value.remoteObjectId);
  strictEqual(downloaded.ok, false);
  if (!downloaded.ok) strictEqual(downloaded.signal.kind, "not-found");
});

test("invalid lost and stale cursors surface the production recovery-required classification", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const invalid = await drive.getStartCursor(root.rootId);
  if (!invalid.ok) throw new Error(invalid.signal.kind);
  drive.invalidateCursor(invalid.value, "invalid");
  const invalidResult = await drive.readChanges(root.rootId, invalid.value);
  strictEqual(invalidResult.ok, false);
  if (!invalidResult.ok) {
    strictEqual(invalidResult.signal.kind, "recovery-required");
    if (invalidResult.signal.kind === "recovery-required") {
      strictEqual(invalidResult.signal.detail, "drive-change-cursor-invalid");
    }
  }

  await drive.create(root.rootId, {
    path: virtualDrivePath("one.txt"),
    entityKind: "file",
    content: source([1]),
  });
  const lost = await drive.getStartCursor(root.rootId);
  if (!lost.ok) throw new Error(lost.signal.kind);
  drive.invalidateCursor(lost.value, "lost");
  const lostResult = await drive.readChanges(root.rootId, lost.value);
  strictEqual(lostResult.ok, false);
  if (!lostResult.ok) strictEqual(lostResult.signal.kind, "recovery-required");

  await drive.create(root.rootId, {
    path: virtualDrivePath("two.txt"),
    entityKind: "file",
    content: source([2]),
  });
  const stale = await drive.getStartCursor(root.rootId);
  if (!stale.ok) throw new Error(stale.signal.kind);
  drive.invalidateCursor(stale.value, "stale");
  const staleResult = await drive.readChanges(root.rootId, stale.value);
  strictEqual(staleResult.ok, false);
  if (!staleResult.ok) strictEqual(staleResult.signal.kind, "recovery-required");

  const malformed = await drive.readChanges(
    root.rootId,
    virtualChangeCursor("foreign-or-malformed-cursor"),
  );
  strictEqual(malformed.ok, false);
  if (!malformed.ok) strictEqual(malformed.signal.kind, "recovery-required");
});

test("partial listing can omit retained reality without claiming authoritative absence", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const one = await drive.create(root.rootId, {
    path: virtualDrivePath("one.md"),
    entityKind: "file",
    content: source([1]),
  });
  const two = await drive.create(root.rootId, {
    path: virtualDrivePath("two.md"),
    entityKind: "file",
    content: source([2]),
  });
  if (!one.ok || !two.ok) throw new Error("create failed");

  drive.scriptNextListing({
    completeness: { status: "partial", reason: "simulated-page-gap" },
    omitRemoteObjectIds: [two.value.remoteObjectId],
  });
  const partial = await drive.listForReconciliation(root.rootId);
  strictEqual(partial.ok, true);
  if (!partial.ok) return;

  deepStrictEqual(
    partial.value.entries.map((entry) => String(entry.path)),
    ["one.md"],
  );
  deepStrictEqual(partial.value.completeness, {
    status: "partial",
    reason: "simulated-page-gap",
  });

  const retained = await drive.observe(root.rootId, virtualDrivePath("two.md"));
  strictEqual(retained.ok, true);
  if (retained.ok) strictEqual(retained.value.status, "present");

  const complete = await drive.listForReconciliation(root.rootId);
  strictEqual(complete.ok, true);
  if (complete.ok) {
    strictEqual(complete.value.completeness.status, "complete");
    deepStrictEqual(
      complete.value.entries.map((entry) => String(entry.path)),
      ["one.md", "two.md"],
    );
  }
});

test("partial change page can omit a real change while preserving explicit uncertainty", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const start = await drive.getStartCursor(root.rootId);
  if (!start.ok) throw new Error(start.signal.kind);

  const one = await drive.create(root.rootId, {
    path: virtualDrivePath("one.bin"),
    entityKind: "file",
    content: source([1]),
  });
  const two = await drive.create(root.rootId, {
    path: virtualDrivePath("two.bin"),
    entityKind: "file",
    content: source([2]),
  });
  if (!one.ok || !two.ok) throw new Error("create failed");

  drive.scriptNextChangePage({
    completeness: { status: "partial", reason: "simulated-change-gap" },
    omitRemoteObjectIds: [two.value.remoteObjectId],
  });
  const page = await drive.readChanges(root.rootId, start.value);
  strictEqual(page.ok, true);
  if (!page.ok) return;

  deepStrictEqual(page.value.completeness, {
    status: "partial",
    reason: "simulated-change-gap",
  });
  deepStrictEqual(
    page.value.changes.map((change) =>
      change.kind === "upsert" ? String(change.entry.path) : change.kind,
    ),
    ["one.bin"],
  );

  const retained = await drive.observe(root.rootId, virtualDrivePath("two.bin"));
  strictEqual(retained.ok, true);
  if (retained.ok) strictEqual(retained.value.status, "present");
});

test("omission controls fail closed rather than claim complete coverage", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("must-not-hide.md"),
    entityKind: "file",
    content: source([1]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  throws(
    () =>
      drive.scriptNextListing({
        completeness: { status: "complete" },
        omitRemoteObjectIds: [created.value.remoteObjectId],
      }),
    /cannot omit remote objects while claiming complete coverage/i,
  );

  throws(
    () =>
      drive.scriptNextChangePage({
        completeness: { status: "complete" },
        omitRemoteObjectIds: [created.value.remoteObjectId],
      }),
    /cannot omit remote objects while claiming complete coverage/i,
  );
});

test("duplicate provider reality surfaces production conflict ambiguity without choosing authority", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);

  const first = await drive.create(root.rootId, {
    path: virtualDrivePath("duplicate.md"),
    entityKind: "file",
    content: source([1]),
  });
  const second = await drive.create(root.rootId, {
    path: virtualDrivePath("duplicate.md"),
    entityKind: "file",
    content: source([2]),
  });
  if (!first.ok || !second.ok) throw new Error("create failed");
  notStrictEqual(first.value.remoteObjectId, second.value.remoteObjectId);

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("duplicate.md"),
  );
  strictEqual(observed.ok, false);
  if (!observed.ok) strictEqual(observed.signal.kind, "conflict");

  const listed = await drive.listForReconciliation(root.rootId);
  strictEqual(listed.ok, false);
  if (!listed.ok) strictEqual(listed.signal.kind, "conflict");
});

test("known mutation failure leaves remote reality and change feed unchanged", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const start = await drive.getStartCursor(root.rootId);
  if (!start.ok) throw new Error(start.signal.kind);

  drive.queueBoundaryFault({
    boundary: "create",
    signal: { kind: "permission-denied", detail: "simulated-policy-denial" },
    mutationEffect: "not-applied",
  });
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("blocked.md"),
    entityKind: "file",
    content: source([1]),
  });
  strictEqual(created.ok, false);
  if (!created.ok) strictEqual(created.signal.kind, "permission-denied");

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("blocked.md"),
  );
  strictEqual(observed.ok, true);
  if (observed.ok) strictEqual(observed.value.status, "absent");

  const page = await drive.readChanges(root.rootId, start.value);
  strictEqual(page.ok, true);
  if (page.ok) deepStrictEqual(page.value.changes, []);
});

test("ambiguous mutation failure can retain an applied effect that later observation reveals", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const start = await drive.getStartCursor(root.rootId);
  if (!start.ok) throw new Error(start.signal.kind);

  drive.queueBoundaryFault({
    boundary: "create",
    signal: { kind: "transient-failure", detail: "network-response-lost" },
    mutationEffect: "applied-before-failure",
  });
  const result = await drive.create(root.rootId, {
    path: virtualDrivePath("ambiguous-applied.md"),
    entityKind: "file",
    content: source([9]),
  });
  strictEqual(result.ok, false);
  if (!result.ok) strictEqual(result.signal.kind, "transient-failure");

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("ambiguous-applied.md"),
  );
  strictEqual(observed.ok, true);
  if (observed.ok) strictEqual(observed.value.status, "present");

  const page = await drive.readChanges(root.rootId, start.value);
  strictEqual(page.ok, true);
  if (page.ok) {
    strictEqual(page.value.changes.length, 1);
    strictEqual(page.value.changes[0].kind, "upsert");
  }
});

test("ambiguous mutation failure can also leave the effect unapplied without fabricating certainty", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const start = await drive.getStartCursor(root.rootId);
  if (!start.ok) throw new Error(start.signal.kind);

  drive.queueBoundaryFault({
    boundary: "create",
    signal: { kind: "transient-failure", detail: "network-response-lost" },
    mutationEffect: "not-applied",
  });
  const result = await drive.create(root.rootId, {
    path: virtualDrivePath("ambiguous-not-applied.md"),
    entityKind: "file",
    content: source([7]),
  });
  strictEqual(result.ok, false);
  if (!result.ok) strictEqual(result.signal.kind, "transient-failure");

  const observed = await drive.observe(
    root.rootId,
    virtualDrivePath("ambiguous-not-applied.md"),
  );
  strictEqual(observed.ok, true);
  if (observed.ok) strictEqual(observed.value.status, "absent");

  const page = await drive.readChanges(root.rootId, start.value);
  strictEqual(page.ok, true);
  if (page.ok) deepStrictEqual(page.value.changes, []);
});

test("one-shot provider faults preserve transient permanent and rate-limit classifications", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const root = await managedRoot(drive);
  const created = await drive.create(root.rootId, {
    path: virtualDrivePath("faults.bin"),
    entityKind: "file",
    content: source([1, 2]),
  });
  if (!created.ok) throw new Error(created.signal.kind);

  drive.queueBoundaryFault({
    boundary: "list",
    signal: { kind: "transient-failure", detail: "simulated-network-failure" },
  });
  const transient = await drive.listForReconciliation(root.rootId);
  strictEqual(transient.ok, false);
  if (!transient.ok) strictEqual(transient.signal.kind, "transient-failure");

  const recoveredList = await drive.listForReconciliation(root.rootId);
  strictEqual(recoveredList.ok, true);

  drive.queueBoundaryFault({
    boundary: "observe",
    signal: { kind: "permission-denied", detail: "simulated-permission" },
  });
  const denied = await drive.observe(root.rootId, virtualDrivePath("faults.bin"));
  strictEqual(denied.ok, false);
  if (!denied.ok) strictEqual(denied.signal.kind, "permission-denied");

  drive.queueBoundaryFault({
    boundary: "download",
    signal: { kind: "rate-limited", retryAfterMs: 250 },
  });
  const rateLimited = await drive.download(created.value.remoteObjectId);
  strictEqual(rateLimited.ok, false);
  if (!rateLimited.ok) {
    strictEqual(rateLimited.signal.kind, "rate-limited");
    if (rateLimited.signal.kind === "rate-limited") {
      strictEqual(rateLimited.signal.retryAfterMs, 250);
    }
  }

  deepStrictEqual(
    await readAll(await drive.download(created.value.remoteObjectId)),
    [1, 2],
  );
});
