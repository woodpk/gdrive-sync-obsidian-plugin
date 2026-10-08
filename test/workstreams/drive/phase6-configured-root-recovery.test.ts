import { strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { GoogleDriveAdapter } from "../../../src/drive/google-drive-port";
import type { ManagedRemoteIdentity } from "../../../src/contracts/google-drive";

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

test("top-level folder parent resolves to verified vault domain rather than managed root", async () => {
  const configured = { rootId: "validation-root", vaultIdentity: "vault:validation", protocolVersion: "1" } as unknown as ManagedRemoteIdentity;
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never, undefined, () => configured);
  const seams = adapter as unknown as Record<string, unknown>;
  seams["validateManagedRoot"] = async () => ({ ok: true, value: { status: "valid", identity: configured } });
  seams["domainRoots"] = async () => ({ ok: true, value: { content: { id: "real-vault-folder" }, config: { id: "real-config-folder" } } });
  const ordinary = await adapter.resolveRootDomainParentIdentity(configured, "BVP-VALIDATION" as never);
  strictEqual(ordinary.status, "resolved");
  if (ordinary.status === "resolved") strictEqual(ordinary.parentRemoteObjectId, "real-vault-folder");
  const portable = await adapter.resolveRootDomainParentIdentity(configured, "__brain_sync_portable_config__/settings" as never);
  strictEqual(portable.status, "resolved");
  if (portable.status === "resolved") strictEqual(portable.parentRemoteObjectId, "real-config-folder");
  const wrong = await adapter.resolveRootDomainParentIdentity({ ...configured, rootId: "unrelated-root" as never }, "BVP-VALIDATION" as never);
  strictEqual(wrong.status, "unavailable");
});

test("legacy top-level folder recovery proof requires exact observed domain-root parent", async () => {
  const configured = { rootId: "validation-root", vaultIdentity: "vault:validation", protocolVersion: "1" } as unknown as ManagedRemoteIdentity;
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never, undefined, () => configured);
  const seams = adapter as unknown as Record<string, unknown>;
  seams["guardPairedAccount"] = async () => ({ ok: true, value: undefined });
  seams["validateManagedRoot"] = async () => ({ ok: true, value: { status: "valid", identity: configured } });
  seams["getFile"] = async (id: string) => ({ ok: true, value: id === "reserved-folder"
    ? { id, name: "BVP-VALIDATION", mimeType: "application/vnd.google-apps.folder", parents: ["real-vault-folder"] }
    : { id, name: "validation-root", appProperties: { brainSyncRole: "brain-sync-root" } } });
  seams["rootForFile"] = async () => ({ ok: true, value: configured.rootId });
  seams["domainRoots"] = async () => ({ ok: true, value: { content: { id: "real-vault-folder" }, config: { id: "real-config-folder" } } });
  seams["logicalPathForFile"] = async () => ({ ok: true, value: "BVP-VALIDATION" });
  const descriptor = {
    kind: "remote-folder-create", targetPath: "BVP-VALIDATION",
    parentRemoteObjectId: configured.rootId, pathAuthority: { parentPath: "" },
    remoteMutation: { reservedRemoteObjectId: "reserved-folder" },
  } as unknown as Parameters<GoogleDriveAdapter["observeFolderCreateRecovery"]>[0];
  const observed = await adapter.observeFolderCreateRecovery(descriptor);
  strictEqual(observed.status, "folder");
  if (observed.status === "folder") {
    strictEqual(observed.parentRemoteObjectId, "real-vault-folder");
    strictEqual(observed.legacyRootParentProof?.managedRootId, configured.rootId);
    strictEqual(observed.legacyRootParentProof?.domainParentRemoteObjectId, "real-vault-folder");
  }
});
