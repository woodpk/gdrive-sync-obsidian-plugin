import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { VaultPath } from "../src/contracts/common";
import {
  DesktopExternalReferenceGuard,
  ExternalFilesystemReferenceError,
  type DesktopFilesystemOps
} from "../src/local/desktop-external-reference-guard";

const vp = (value: string): VaultPath => value as VaultPath;

test("desktop guard permits ordinary files, directories, and not-yet-created targets inside the vault", async () => {
  const root = await mkdtemp(join(tmpdir(), "brain-sync-guard-"));
  try {
    await mkdir(join(root, "notes"));
    await writeFile(join(root, "notes", "safe.md"), "safe");
    const guard = new DesktopExternalReferenceGuard(root);
    await guard.assertSafe(vp("notes"), "observe");
    await guard.assertSafe(vp("notes/safe.md"), "observe");
    await guard.assertSafe(vp("notes/new.md"), "mutation-target");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("desktop guard blocks a symlink before traversal can reach an outside target", async () => {
  const parent = await mkdtemp(join(tmpdir(), "brain-sync-link-"));
  const root = join(parent, "vault");
  const outside = join(parent, "outside");
  try {
    await mkdir(root);
    await mkdir(outside);
    await writeFile(join(outside, "secret.md"), "outside");
    await symlink(outside, join(root, "linked"), "dir");
    const guard = new DesktopExternalReferenceGuard(root);
    await assert.rejects(
      () => guard.assertSafe(vp("linked/secret.md"), "observe"),
      (error: unknown) => error instanceof ExternalFilesystemReferenceError && error.message.includes("symbolic-link/junction")
    );
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test("desktop guard treats a Windows-style junction/reparse link indication as blocked", async () => {
  const base = "C:\\vault";
  const ops: DesktopFilesystemOps = {
    async realpath(path: string): Promise<string> { return path; },
    async lstat(path: string) {
      return { isSymbolicLink: () => path.toLowerCase().includes("junction") };
    }
  };
  const guard = new DesktopExternalReferenceGuard(base, ops);
  await assert.rejects(
    () => guard.assertSafe(vp("junction/child.md"), "observe"),
    ExternalFilesystemReferenceError
  );
});

test("desktop guard blocks a non-link reparse/canonical resolution that escapes the vault", async () => {
  const base = "/vault";
  const ops: DesktopFilesystemOps = {
    async lstat() { return { isSymbolicLink: () => false }; },
    async realpath(path: string): Promise<string> {
      if (path === base) return base;
      if (path.endsWith("mounted")) return "/outside";
      return path;
    }
  };
  const guard = new DesktopExternalReferenceGuard(base, ops);
  await assert.rejects(
    () => guard.assertSafe(vp("mounted"), "observe"),
    (error: unknown) => error instanceof ExternalFilesystemReferenceError && error.message.includes("resolved outside vault")
  );
});
