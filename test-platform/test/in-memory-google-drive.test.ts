import { createHash } from "node:crypto";
import {
  deepStrictEqual,
  notStrictEqual,
  strictEqual,
} from "node:assert/strict";
import { test } from "node:test";

import {
  InMemoryGoogleDriveCore,
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
