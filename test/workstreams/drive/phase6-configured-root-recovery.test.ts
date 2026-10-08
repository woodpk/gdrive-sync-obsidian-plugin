import { strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { GoogleDriveAdapter } from "../../../src/drive/google-drive-port";
import type { ManagedRemoteIdentity } from "../../../src/contracts/google-drive";
import { verifyRemoteFolderCreate } from "../../../src/contracts";

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
    parentRemoteObjectId: "validation-content-parent",
  } as never);
  strictEqual(outcome.status, "verified-effect");
  strictEqual(observedParentRoot, configured.rootId);
  strictEqual(dispatchCount, 1);
});

test("new reserved folder identity carries an observed content-domain parent, not the managed root", async () => {
  const configured = { rootId: "validation-root", vaultIdentity: "vault:validation", protocolVersion: "1" } as unknown as ManagedRemoteIdentity;
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never, undefined, () => configured);
  const seams = adapter as unknown as Record<string, unknown>;
  seams["validateManagedRoot"] = async () => ({ ok: true, value: { status: "valid", identity: configured } });
  seams["resolveUniqueParent"] = async (rootId: string, target: string) => {
    strictEqual(rootId, configured.rootId);
    strictEqual(target, "top-level");
    return { ok: true, value: "content-domain-parent" };
  };
  seams["generateId"] = async () => ({ ok: true, value: "reserved-new-folder" });
  const reserved = await adapter.reserveFolderCreateIdentity(configured, "intent:new" as never, "top-level" as never);
  strictEqual(reserved.ok, true);
  if (reserved.ok) {
    strictEqual(reserved.value.parentRemoteObjectId, "content-domain-parent");
    strictEqual(reserved.value.reservedRemoteObjectId, "reserved-new-folder");
  }
});

test("new reserved folder fails closed when its physical parent cannot be proven", async () => {
  const configured = { rootId: "validation-root", vaultIdentity: "vault:validation", protocolVersion: "1" } as unknown as ManagedRemoteIdentity;
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never, undefined, () => configured);
  const seams = adapter as unknown as Record<string, unknown>;
  seams["validateManagedRoot"] = async () => ({ ok: true, value: { status: "valid", identity: configured } });
  seams["resolveUniqueParent"] = async () => ({ ok: true, value: undefined });
  seams["generateId"] = async () => { throw new Error("no ID may be reserved when parent is missing"); };
  const result = await adapter.reserveFolderCreateIdentity(configured, "intent:new" as never, "top-level" as never);
  strictEqual(result.ok, false);
  if (!result.ok) strictEqual(result.signal.kind, "recovery-required");
});

test("read-only legacy top-level recovery verifies the configured domain parent, never an arbitrary parent", async () => {
  const configured = { rootId: "validation-root", vaultIdentity: "vault:validation", protocolVersion: "1" } as unknown as ManagedRemoteIdentity;
  const adapter = new GoogleDriveAdapter({} as never, {} as never, {} as never, undefined, () => configured);
  const seams = adapter as unknown as Record<string, unknown>;
  seams["guardPairedAccount"] = async () => ({ ok: true, value: undefined });
  seams["getFile"] = async () => ({ ok: true, value: { id: "reserved-legacy", name: "top-level", mimeType: "application/vnd.google-apps.folder", parents: ["content-domain-parent"], trashed: false } });
  seams["rootForFile"] = async () => ({ ok: true, value: configured.rootId });
  seams["domainRoots"] = async () => ({ ok: true, value: { content: { id: "content-domain-parent" }, config: { id: "config-domain-parent" } } });
  seams["logicalPathForFile"] = async () => ({ ok: true, value: "top-level" });
  const descriptor = {
    kind: "remote-folder-create", targetSide: "remote", mutationKind: "create", intentId: "intent:legacy",
    targetPath: "top-level", parentRemoteObjectId: configured.rootId,
    pathAuthority: { generation: "semantic:0", targetPath: "top-level", parentPath: "", pathComparisonKey: "top-level", expectedTarget: "absent" },
    remoteMutation: { kind: "reserved-folder-create", intentId: "intent:legacy", path: "top-level", reservedRemoteObjectId: "reserved-legacy" },
  } as unknown as Parameters<GoogleDriveAdapter["observeFolderCreateRecovery"]>[0];
  const observed = await adapter.observeFolderCreateRecovery(descriptor);
  strictEqual(observed.status, "folder");
  if (observed.status !== "folder") return;
  strictEqual(observed.parentRemoteObjectId, "content-domain-parent");
  strictEqual(observed.verifiedLegacyManagedRootParentId, configured.rootId);
  strictEqual(verifyRemoteFolderCreate(descriptor, observed).status, "verified-effect");
});
