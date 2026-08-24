import assert from "node:assert/strict";
import test from "node:test";
import type { BinaryContentSource, ContentEvidence, DriveResult, ManagedRemoteIdentity, PathSnapshot, RemoteObjectId, SynchronizationPlan, VaultIdentity, VaultPath, VersionReference } from "../src/contracts";
import { contractId } from "../src/contracts";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { IntegratedProductController } from "../src/product/product-controller";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../src/product/text-version-store";
import { CONFIG_REMOTE_NAMESPACE, ProductPathScope, ScopedLocalVault } from "../src/product/path-scope";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:second-rejection");
const device = id<"DeviceIdentity">("device:second-rejection");
const root = id<"RemoteObjectId">("root") as RemoteObjectId;
const managed: ManagedRemoteIdentity = { rootId: root, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };
const context = { expectation: "existing-pairing" as const, expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const source = (text: string): BinaryContentSource => ({ sizeBytes: new TextEncoder().encode(text).byteLength, async *openChunks() { yield new TextEncoder().encode(text); } });
const canonical = (text: string): ContentEvidence => ({ hash: sha256Text(text), sizeBytes: new TextEncoder().encode(text).byteLength });
const noConflict = new ThreeWayConflictResolver({ readText: async () => undefined });

function localOnly(path: VaultPath): PathSnapshot {
  return { path, local: { status: "present", side: "local", path, entityKind: "file", content: canonical("safe"), stability: "stable", observationToken: id<"ObservationToken">(`tok:${String(path)}`) }, remote: { status: "absent", side: "remote", path }, base: { status: "uninitialized" }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" } };
}
function unreadable(path: VaultPath): PathSnapshot {
  return { path, local: { status: "unreadable", side: "local", path, reason: "cannot-read" }, remote: { status: "absent", side: "remote", path }, base: { status: "uninitialized" }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" } };
}

test("C1 all blocked-unsafe operations restore globally blocked disposition", async () => {
  const planner = new DeterministicSynchronizationPlanner(noConflict);
  const result = await planner.plan({ snapshots: [unreadable(vp("bad.md"))], state: { status: "uninitialized" } });
  assert.deepEqual(result.operations.map(op => op.kind), ["blocked-unsafe"]);
  assert.equal(result.executionDisposition, "blocked");
});

test("C1 recovery-required planning remains globally blocked", async () => {
  const planner = new DeterministicSynchronizationPlanner(noConflict);
  const result = await planner.plan({ snapshots: [], state: { status: "recovery-required", reason: "corrupt", detail: "corrupt state" } });
  assert.equal(result.executionDisposition, "blocked");
  assert.equal(result.operations.every(op => op.kind === "recovery-required"), true);
});

test("C1 mixed safe plus blocked-unsafe planning remains reviewable partial work", async () => {
  const planner = new DeterministicSynchronizationPlanner(noConflict);
  const result = await planner.plan({ snapshots: [localOnly(vp("safe.md")), unreadable(vp("bad.md"))], state: { status: "uninitialized" } });
  assert.equal(result.executionDisposition, "requires-user-approval");
  assert.equal(result.operations.some(op => op.kind === "upload-create" && String(op.path) === "safe.md"), true);
  assert.equal(result.operations.some(op => op.kind === "blocked-unsafe" && String(op.path) === "bad.md"), true);
});

test("C1 automatic execution refuses a mixed approval-required plan before any mutation", async () => {
  const store = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  let executeCalls = 0;
  const assembly = { input: { snapshots: [localOnly(vp("safe.md")), unreadable(vp("bad.md"))], state: { status: "uninitialized" as const } }, managedRemote: managed, remoteEnumeration: { status: "complete" as const }, mode: "incremental" as const };
  const executor = { execute: async () => { executeCalls += 1; throw new Error("must not execute"); } } as never;
  const controller = new IntegratedProductController({ vaultIdentity: vault, deviceIdentity: device, stateContext: { expectation: "new-installation" }, stateStore: store, snapshotAssembler: { assemble: async () => assembly, assembleFull: async () => assembly } as never, executor, conflictResolver: noConflict, plannerForTrigger: trigger => new DeterministicSynchronizationPlanner(noConflict, undefined, { trigger }), leasePort: { tryAcquire: async () => ({ release: async () => undefined }) } as never, audit: new BoundedAuditHistory(new MemoryAuditPersistence(), 20), holderId: "mixed-auto" });
  await controller.runAutomatic("periodic");
  assert.equal(executeCalls, 0);
});

test("C3 canonical matching retained text is accepted and canonical mismatch is rejected", async () => {
  const persistence = new MemoryTextVersionPersistence();
  const path = vp("note.md");
  const good: VersionReference = { path, entityKind: "file", content: canonical("good") };
  await persistence.put(`hash:${String(good.content!.hash)}`, "good");
  const store = new ProductTextVersionStore(persistence, {} as never, {} as never);
  assert.equal(await store.retainedText(good), "good");
  await persistence.put(`hash:${String(good.content!.hash)}`, "corrupt");
  assert.equal(await store.retainedText(good), undefined);
});

test("C3 revision-only retained text is rejected as non-authoritative materialization", async () => {
  const persistence = new MemoryTextVersionPersistence();
  await persistence.put("revision:7", "text");
  const version: VersionReference = { path: vp("note.md"), entityKind: "file", content: { revision: "7" } };
  const store = new ProductTextVersionStore(persistence, {} as never, {} as never);
  assert.equal(await store.retainedText(version), undefined);
  assert.equal(await store.persistText(version, "text"), false);
});

test("C3 revision plus corrupt retained text cannot fabricate a clean merge", async () => {
  const persistence = new MemoryTextVersionPersistence();
  const versions = new ProductTextVersionStore(persistence, {} as never, {} as never);
  const path = vp("note.md");
  const base: VersionReference = { path, entityKind: "file", content: { revision: "1" } };
  const local: VersionReference = { path, entityKind: "file", content: { revision: "2" } };
  const remote: VersionReference = { path, entityKind: "file", content: { revision: "3" }, remoteObjectId: id<"RemoteObjectId">("remote-note") };
  const assessment = await new ThreeWayConflictResolver(versions, versions).assess(path, base, local, remote);
  assert.equal(assessment.kind, "unresolved-text");
});

test("C4 ordinary vault content at reserved prefix never redirects into active config", async () => {
  const reserved = vp(CONFIG_REMOTE_NAMESPACE);
  const appJson = vp(`${CONFIG_REMOTE_NAMESPACE}/app.json`);
  const inner = {
    enumerate: async () => ({ entries: [{ status: "present" as const, side: "local" as const, path: reserved, entityKind: "folder" as const, stability: "stable" as const }], completeness: { status: "complete" as const } }),
    observe: async (path: VaultPath) => String(path) === CONFIG_REMOTE_NAMESPACE ? ({ status: "present" as const, side: "local" as const, path: reserved, entityKind: "folder" as const, stability: "stable" as const }) : ({ status: "absent" as const, side: "local" as const, path }),
    readFile: async () => { throw new Error("physical config read must not occur"); },
    validatePath: async () => ({ status: "valid" as const }),
  } as never;
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  const scoped = new ScopedLocalVault(inner, scope);
  const observed = await scoped.observe(appJson);
  assert.equal(observed.status, "unknown");
  await assert.rejects(() => scoped.readFile(appJson), /collides with reserved/);
});

class MemorySecrets { readonly values = new Map<string,string>(); getSecret(id:string){return this.values.get(id)??null;} setSecret(id:string,value:string){this.values.set(id,value);} deleteSecret(id:string){this.values.delete(id);} }
class StubTransport extends GoogleHttpTransport { constructor(private readonly handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>){ const backing=new MemorySecrets(); super(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(backing))); } override request(url:string,init:PortableRequestInit={}):Promise<DriveResult<Response>>{ return this.handler(url,init); } }
const ok = (body: unknown) => Promise.resolve({ ok: true, value: new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }) } as DriveResult<Response>);
const remoteRoot = { id:"root",name:"BRAIN Sync",mimeType:"application/vnd.google-apps.folder",trashed:false,appProperties:{brainSyncRole:"brain-sync-root",brainVaultIdentity:String(vault),brainProtocolVersion:"1"} };
const contentRoot = { id:"content",name:"vault",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-content"} };
const configRoot = (marked = true) => ({ id:"config",name:CONFIG_REMOTE_NAMESPACE,mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:marked?{brainSyncRole:"brain-sync-portable-config"}:{} });
function driveAdapter(marked = true, changes?: unknown) {
  const secrets = new MemorySecrets(); secrets.setSecret("brain-gdrive-paired-account","acct"); const store = new ObsidianSecretStore(secrets);
  const transport = new StubTransport(async url => {
    if (url.includes("/about")) return ok({ user: { permissionId: "acct" } });
    if (url.includes("/files/root?")) return ok(remoteRoot);
    if (url.includes("appProperties+has") || url.includes("appProperties%20has")) return ok({ files: [contentRoot] });
    if (url.includes(CONFIG_REMOTE_NAMESPACE) && url.includes("%27root%27")) return ok({ files: [configRoot(marked)] });
    if (url.includes(CONFIG_REMOTE_NAMESPACE) && url.includes("%27content%27")) return ok({ files: [] });
    if (url.includes("/changes?")) return ok(changes ?? { changes: [], newStartPageToken: "next" });
    throw new Error(`Unhandled ${url}`);
  });
  return new GoogleDriveAdapter(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},store), transport, store);
}

test("C4 preexisting unmarked remote portable-config namespace is ambiguous and refused", async () => {
  const result = await driveAdapter(false).pairManagedRoot(root, vault as VaultIdentity);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.status, "ambiguous");
});

test("C4 marked portable-config namespace is accepted for additional-device pairing validation", async () => {
  const result = await driveAdapter(true).pairManagedRoot(root, vault as VaultIdentity);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.status, "valid");
});

test("C5 scope-reconcile flag forces full assembly instead of incremental Changes", async () => {
  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await state.saveTrusted({ ...createInitialTrustedState({ stateRevision: id<"StateRevision">("state:0"), vaultIdentity: vault, deviceIdentity: device }), changeCursor: id<"ChangeCursor">("cursor:old") });
  let fullCalls = 0, changeCalls = 0;
  const local = { enumerate: async () => ({ entries: [], completeness: { status: "complete" as const } }) } as never;
  const drive = { validateManagedRoot: async () => ({ ok:true as const,value:{status:"valid" as const,identity:managed} }), getStartCursor: async () => ({ ok:true as const,value:id<"ChangeCursor">("cursor:full") }), listForReconciliation: async () => { fullCalls += 1; return { ok:true as const,value:{entries:[],completeness:{status:"complete" as const}} }; }, readChanges: async () => { changeCalls += 1; return { ok:true as const,value:{changes:[],nextCursor:id<"ChangeCursor">("cursor:inc"),completeness:{status:"complete" as const}} }; } } as never;
  const assembler = new ProductSnapshotAssembler(local, drive, state, context, async () => managed, () => true, () => true);
  const result = await assembler.assemble(true);
  assert.equal(result.mode, "full"); assert.equal(fullCalls, 1); assert.equal(changeCalls, 0);
});

test("C6 removed Drive change survives adapter restart with empty pathCache", async () => {
  const adapter = driveAdapter(true, { changes: [{ fileId: "gone", removed: true }], newStartPageToken: "next" });
  const page = await adapter.readChanges(root, id<"ChangeCursor">("cursor:old"));
  assert.equal(page.ok, true);
  if (page.ok) {
    assert.equal(page.value.changes.length, 1);
    const removed = page.value.changes[0];
    assert.equal(removed.kind, "removed");
    if (removed.kind === "removed") { assert.equal(String(removed.remoteObjectId), "gone"); assert.equal(removed.lastKnownPath, undefined); }
  }
});

test("C6 incremental assembler removes a stable ID from reconstructed remote baseline without lastKnownPath", async () => {
  const path = vp("gone.md"), remoteId = id<"RemoteObjectId">("gone");
  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  await state.saveTrusted({ ...createInitialTrustedState({ stateRevision:id<"StateRevision">("state:0"),vaultIdentity:vault,deviceIdentity:device }), changeCursor:id<"ChangeCursor">("cursor:old"), base:[{path,entityKind:"file",localExisted:true,remoteExisted:true,content:canonical("base"),remoteObjectId:remoteId}], remoteMappings:[{path,entityKind:"file",remoteObjectId:remoteId}] });
  const local = { enumerate: async () => ({ entries:[{status:"present" as const,side:"local" as const,path,entityKind:"file" as const,content:canonical("base"),stability:"stable" as const,observationToken:id<"ObservationToken">("tok")}], completeness:{status:"complete" as const} }) } as never;
  const drive = { validateManagedRoot:async()=>({ok:true as const,value:{status:"valid" as const,identity:managed}}), readChanges:async()=>({ok:true as const,value:{changes:[{kind:"removed" as const,remoteObjectId:remoteId}],nextCursor:id<"ChangeCursor">("cursor:new"),completeness:{status:"complete" as const}}}) } as never;
  const assembled = await new ProductSnapshotAssembler(local,drive,state,context,async()=>managed).assemble(true);
  assert.equal(assembled.mode,"incremental");
  const snapshot = assembled.input.snapshots.find(item=>item.path===path); assert.ok(snapshot); assert.equal(snapshot?.remote.status,"absent");
  const planned = await new DeterministicSynchronizationPlanner(noConflict).plan(assembled.input);
  assert.equal(planned.operations[0].kind,"trash-local");
});

test("C7 executor preserves authentication-required detail from precondition revalidation", async () => {
  const path=vp("note.md"), remoteId=id<"RemoteObjectId">("note");
  const local={observe:async()=>({status:"present" as const,side:"local" as const,path,entityKind:"file" as const,content:canonical("local"),stability:"stable" as const,observationToken:id<"ObservationToken">("tok")})} as never;
  const drive={observe:async()=>({ok:false as const,signal:{kind:"authentication-required" as const,detail:"google-account-changed-repair-required"}})} as never;
  const executor=new ProductSynchronizationExecutor(local,drive,{} as never,context,()=>({managedRemote:managed,remoteEnumerationComplete:true}));
  const result=await executor.validatePreconditions({operationId:id<"OperationId">("op"),kind:"upload-update",path,remoteObjectId:remoteId,contentVersion:{path,entityKind:"file",content:canonical("local")},destructive:false,preconditions:[{kind:"remote-object",remoteObjectId:remoteId}],reasons:[]});
  assert.equal(result.status,"blocked"); if(result.status==="blocked") assert.equal(result.reason,"authentication-required:google-account-changed-repair-required");
});
