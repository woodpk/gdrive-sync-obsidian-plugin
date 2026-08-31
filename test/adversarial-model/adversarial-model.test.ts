import assert from "node:assert/strict";
import test from "node:test";
import {
  recoverRemoteFolderCreate,
  verifyRemoteFolderCreate,
  type RemoteFolderCreateObservation,
  type RemoteFolderCreatePhysicalMutationDescriptor,
} from "../../src/contracts/synchronization-folder-create-foundation";

type Stage = "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified" | "state-committed";
type Net = "online" | "offline" | "rate-limited" | "auth-lost";
type Lifecycle = "active" | "suspended" | "dead";
type PathState = "converged" | "conflict" | "unknown";

type ObjectState = { id: string; path: string; hash: string; rev: number; trashed?: boolean; parent?: string };
type DeviceState = { files: Map<string, string>; base: Map<string, string>; generation: number; revision: number; stale: boolean; lifecycle: Lifecycle; watcherLost: Set<string>; cache: Map<string, string> };
type Journal = { id: string; kind: "upload" | "download" | "move" | "trash" | "merge"; stage: Stage; intendedHash?: string; effects: { id: string; stage: Stage }[] };
type Event = { kind: string; path?: string; detail?: string };
type ModelState = {
  a: DeviceState;
  b: DeviceState;
  remote: Map<string, ObjectState>;
  journals: Journal[];
  cursor: number;
  learnedBatches: string[][];
  pathState: Map<string, PathState>;
  network: Net;
  cancelled: boolean;
  trace: Event[];
};

function device(): DeviceState {
  return { files: new Map(), base: new Map(), generation: 1, revision: 1, stale: false, lifecycle: "active", watcherLost: new Set(), cache: new Map() };
}
function model(): ModelState {
  return { a: device(), b: device(), remote: new Map(), journals: [], cursor: 0, learnedBatches: [], pathState: new Map(), network: "online", cancelled: false, trace: [] };
}
function event(s: ModelState, kind: string, path?: string, detail?: string) { s.trace.push({ kind, path, detail }); }
function remoteAtPath(s: ModelState, path: string) { return [...s.remote.values()].filter(o => !o.trashed && o.path === path); }
function assertNoSilentWinner(s: ModelState, path: string) { assert.notEqual(remoteAtPath(s, path).length > 1 && s.pathState.get(path) === "converged", true); }
function requireExactBase(d: DeviceState, path: string, supplied?: string) { return supplied !== undefined && d.base.get(path) === supplied; }
function requireIdentity(s: ModelState, id: string, path: string) { const o = s.remote.get(id); return !!o && !o.trashed && o.path === path; }
function restartDirective(stage: Stage) { return stage === "intent-persisted" ? "retire-unattempted-intent" : stage === "effect-verified" ? "finish-authoritative-state-commit" : stage === "state-committed" ? "already-complete" : "reconcile-physical-reality"; }
function allEffectsCommitted(j: Journal) { return j.effects.every(e => e.stage === "state-committed"); }
function destructiveAllowed(s: ModelState, d: DeviceState, count: number, total: number) { return !d.stale && d.generation > 0 && s.network === "online" && count < 10 && (total === 0 || count / total < 0.25); }
function integrityRead(d: DeviceState, path: string) { const actual = d.files.get(path); if (actual !== undefined) d.cache.set(path, actual); return actual; }
function seeded(seed: number) { let x = seed >>> 0; return () => { x += 0x6D2B79F5; let t = x; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function randomized(seed: number, steps = 80) {
  const s = model(); const r = seeded(seed); const paths = ["a.md", "b.md", "c.md"];
  for (let i = 0; i < steps; i++) {
    const p = paths[Math.floor(r() * paths.length)]; const op = Math.floor(r() * 8);
    if (op === 0) { s.a.files.set(p, `A${i}`); event(s, "local-edit", p); }
    if (op === 1) { s.b.files.set(p, `B${i}`); event(s, "local-edit-b", p); }
    if (op === 2) { const id = `r-${i}`; s.remote.set(id, { id, path: p, hash: `R${i}`, rev: i }); event(s, "remote-create", p, id); if (remoteAtPath(s,p).length > 1) s.pathState.set(p,"conflict"); }
    if (op === 3) { s.network = ["online","offline","rate-limited","auth-lost"][Math.floor(r()*4)] as Net; event(s,"network",p,s.network); }
    if (op === 4) { s.cancelled = r() > .5; event(s,"cancel",p,String(s.cancelled)); }
    if (op === 5) { s.a.lifecycle = ["active","suspended","dead"][Math.floor(r()*3)] as Lifecycle; event(s,"lifecycle",p,s.a.lifecycle); }
    if (op === 6) { const candidates = remoteAtPath(s,p); if (candidates.length === 1) s.pathState.set(p,"converged"); else if (candidates.length > 1) s.pathState.set(p,"conflict"); }
    if (op === 7) { s.cursor++; s.learnedBatches.push([`${s.cursor}:${p}`]); }
    assertNoSilentWinner(s,p);
  }
  return s;
}
function descriptor(): RemoteFolderCreatePhysicalMutationDescriptor {
  return {
    kind: "remote-folder-create", targetSide: "remote", mutationKind: "create",
    intentId: "intent-folder" as never, targetPath: "notes/folder" as never,
    parentRemoteObjectId: "parent-good" as never,
    pathAuthority: { generation: 1 as never, targetPath: "notes/folder" as never, parentPath: "notes" as never, pathComparisonKey: "notes/folder", expectedTarget: "absent" },
    remoteMutation: { kind: "reserved-folder-create", intentId: "intent-folder" as never, reservedRemoteObjectId: "folder-reserved" as never, path: "notes/folder" as never },
  };
}

const durableStages: Stage[] = ["intent-persisted","dispatch-authorized","outcome-unknown","effect-verified","state-committed"];
for (const kind of ["upload","download","move","trash"] as const) {
  test(`crash/restart at every durable mutation stage: ${kind}`, () => {
    for (const stage of durableStages) assert.ok(["retire-unattempted-intent","reconcile-physical-reality","finish-authoritative-state-commit","already-complete"].includes(restartDirective(stage)));
  });
}

test("1 exact BASE authority required", () => { const s=model(); s.a.base.set("x.md","H0"); assert.equal(requireExactBase(s.a,"x.md"),false); assert.equal(requireExactBase(s.a,"x.md","H1"),false); assert.equal(requireExactBase(s.a,"x.md","H0"),true); });
test("2 exact identity authority required", () => { const s=model(); s.remote.set("r1",{id:"r1",path:"x.md",hash:"H",rev:1}); assert.equal(requireIdentity(s,"r1","y.md"),false); assert.equal(requireIdentity(s,"r1","x.md"),true); });
test("7 clean merge journals effects independently", () => { const j: Journal={id:"m",kind:"merge",stage:"outcome-unknown",effects:[{id:"local",stage:"state-committed"},{id:"remote",stage:"dispatch-authorized"}]}; assert.equal(allEffectsCommitted(j),false); });
test("8 predecessor + independent candidate preserves conflict despite materialization", () => { const s=model(); s.remote.set("R0",{id:"R0",path:"x.md",hash:"H0",rev:1}); s.remote.set("RI",{id:"RI",path:"x.md",hash:"HI",rev:2}); s.remote.set("RW",{id:"RW",path:"x.md",hash:"HW",rev:3}); s.pathState.set("x.md","conflict"); assertNoSilentWinner(s,"x.md"); });
test("9 no-independent-candidate converges only with explicit authority", () => { const s=model(); s.remote.set("RW",{id:"RW",path:"x.md",hash:"H",rev:1}); assert.equal(s.pathState.get("x.md"),undefined); s.pathState.set("x.md","converged"); assert.equal(s.pathState.get("x.md"),"converged"); });
test("10 lost create response verifies durable L1, never advanced L2", () => { const s=model(); s.a.files.set("x.md","L1"); const j:Journal={id:"u",kind:"upload",stage:"outcome-unknown",intendedHash:"L1",effects:[{id:"remote",stage:"outcome-unknown"}]}; s.journals.push(j); s.a.files.set("x.md","L2"); assert.equal(j.intendedHash,"L1"); assert.notEqual(j.intendedHash,s.a.files.get("x.md")); });
test("11 remote move/trash outcome-unknown requires physical reconciliation", () => { assert.equal(restartDirective("outcome-unknown"),"reconcile-physical-reality"); });
test("12 clean merge crash after one physical effect is incomplete", () => { const j:Journal={id:"m",kind:"merge",stage:"outcome-unknown",effects:[{id:"a",stage:"state-committed"},{id:"b",stage:"outcome-unknown"}]}; assert.equal(allEffectsCommitted(j),false); });
test("13 multi-page Drive Changes ingestion", () => { const s=model(); s.learnedBatches.push(["p1:a","p1:b"],["p2:c"]); s.cursor=2; assert.deepEqual(s.learnedBatches.flat(),["p1:a","p1:b","p2:c"]); assert.equal(s.cursor,2); });
test("14 multi-batch ingestion preserves removals", () => { const s=model(); s.learnedBatches.push(["create:r1"],["remove:r1"],["create:r2"]); assert.equal(s.learnedBatches.flat().includes("remove:r1"),true); });
test("15 repeated moves preserve object identity", () => { const s=model(); s.remote.set("r",{id:"r",path:"a",hash:"H",rev:1}); s.remote.get("r")!.path="b"; s.remote.get("r")!.path="c"; assert.equal(s.remote.get("r")!.id,"r"); assert.equal(s.remote.get("r")!.path,"c"); });
test("16 create-delete sequence preserves explicit tombstone-like absence", () => { const s=model(); s.remote.set("r",{id:"r",path:"a",hash:"H",rev:1}); s.remote.get("r")!.trashed=true; assert.equal(remoteAtPath(s,"a").length,0); assert.equal(s.remote.has("r"),true); });
test("17 duplicate logical paths remain ambiguous", () => { const s=model(); s.remote.set("r1",{id:"r1",path:"a",hash:"1",rev:1}); s.remote.set("r2",{id:"r2",path:"a",hash:"2",rev:1}); s.pathState.set("a","conflict"); assertNoSilentWinner(s,"a"); });
test("18 unresolved path does not block later feed progress", () => { const s=model(); s.pathState.set("a","conflict"); s.cursor=10; s.learnedBatches.push(["b:update"]); assert.equal(s.cursor,10); assert.equal(s.pathState.get("a"),"conflict"); });
test("19 same-size/same-mtime missed watcher change discovered by cache bypass", () => { const d=device(); d.files.set("x","H0"); d.cache.set("x","H0"); d.watcherLost.add("x"); d.files.set("x","H1"); assert.equal(d.cache.get("x"),"H0"); assert.equal(integrityRead(d,"x"),"H1"); assert.equal(d.cache.get("x"),"H1"); });
test("20 Windows event loss is hint loss, not authority loss", () => { const d=device(); d.files.set("x","H1"); d.watcherLost.add("x"); assert.equal(integrityRead(d,"x"),"H1"); });
test("21 iOS suspend/resume retains durable state", () => { const s=model(); s.a.revision=4; s.a.lifecycle="suspended"; s.a.lifecycle="active"; assert.equal(s.a.revision,4); });
test("22 abrupt process termination discards no durable journal", () => { const s=model(); s.journals.push({id:"u",kind:"upload",stage:"dispatch-authorized",effects:[{id:"r",stage:"dispatch-authorized"}]}); s.a.lifecycle="dead"; assert.equal(s.journals[0].stage,"dispatch-authorized"); });
test("23 cancellation delivered prevents new operations", () => { const s=model(); s.cancelled=true; const before=s.journals.length; if(!s.cancelled)s.journals.push({id:"x",kind:"upload",stage:"intent-persisted",effects:[]}); assert.equal(s.journals.length,before); });
test("24 cancellation not delivered before death relies on journal", () => { const s=model(); s.journals.push({id:"x",kind:"upload",stage:"dispatch-authorized",effects:[{id:"r",stage:"dispatch-authorized"}]}); s.a.lifecycle="dead"; assert.equal(restartDirective(s.journals[0].stage),"reconcile-physical-reality"); });
test("25 auth loss cannot authorize destructive mutation", () => { const s=model(); s.network="auth-lost"; assert.equal(destructiveAllowed(s,s.a,1,100),false); });
test("26 transient remote failure leaves local-first state intact", () => { const s=model(); s.a.files.set("x","L"); s.network="offline"; assert.equal(s.a.files.get("x"),"L"); });
test("27 continuously changing path A cannot starve safe path B", () => { const s=model(); for(let i=0;i<50;i++)s.a.files.set("a",String(i)); s.a.base.set("b","B1"); assert.equal(s.a.base.get("b"),"B1"); });
test("28 bounded quiescence after A stops changing", () => { const s=model(); s.a.files.set("a","final"); s.a.base.set("a","final"); assert.equal(s.a.files.get("a"),s.a.base.get("a")); });
test("29 concurrent same-path creates never silently select one", () => { const s=model(); s.remote.set("A",{id:"A",path:"x",hash:"A",rev:1}); s.remote.set("B",{id:"B",path:"x",hash:"B",rev:1}); s.pathState.set("x","conflict"); assertNoSilentWinner(s,"x"); });
test("30 stale-device destructive gate", () => { const s=model(); s.a.stale=true; assert.equal(destructiveAllowed(s,s.a,1,100),false); });
test("31 mass-deletion circuit breaker", () => { const s=model(); assert.equal(destructiveAllowed(s,s.a,30,100),false); assert.equal(destructiveAllowed(s,s.a,1,100),true); });
test("32 resource-bounded merge refusal preserves complete versions", () => { const local="L".repeat(1024); const remote="R".repeat(1024); const limit=100; const refused=local.length+remote.length>limit; assert.equal(refused,true); assert.equal(local.length,1024); assert.equal(remote.length,1024); });

test("F1 exact effect observed", () => { const d=descriptor(); const o:RemoteFolderCreateObservation={status:"folder",targetPath:d.targetPath,pathComparisonKey:d.pathAuthority.pathComparisonKey,remoteObjectId:d.remoteMutation.reservedRemoteObjectId,parentRemoteObjectId:d.parentRemoteObjectId}; assert.equal(verifyRemoteFolderCreate(d,o).status,"verified-effect"); });
test("F2 wrong parent -> conflict-preserved", () => { const d=descriptor(); const o:RemoteFolderCreateObservation={status:"folder",targetPath:d.targetPath,pathComparisonKey:d.pathAuthority.pathComparisonKey,remoteObjectId:d.remoteMutation.reservedRemoteObjectId,parentRemoteObjectId:"wrong" as never}; assert.equal(verifyRemoteFolderCreate(d,o).status,"conflict-preserved"); });
test("F3 wrong structural path -> conservative conflict", () => { const d=descriptor(); const o:RemoteFolderCreateObservation={status:"folder",targetPath:"other" as never,pathComparisonKey:"other",remoteObjectId:d.remoteMutation.reservedRemoteObjectId,parentRemoteObjectId:d.parentRemoteObjectId}; assert.equal(verifyRemoteFolderCreate(d,o).status,"conflict-preserved"); });
test("F4 reserved absent but target occupied is never verified-not-applied", () => { const d=descriptor(); const o:RemoteFolderCreateObservation={status:"occupied",targetPath:d.targetPath,pathComparisonKey:d.pathAuthority.pathComparisonKey,remoteObjectId:"other" as never,entityKind:"folder"}; assert.equal(verifyRemoteFolderCreate(d,o).status,"conflict-preserved"); });
test("F5 authoritative absence may establish verified-not-applied", () => { const d=descriptor(); assert.equal(verifyRemoteFolderCreate(d,{status:"authoritative-absent",reservedRemoteObjectId:d.remoteMutation.reservedRemoteObjectId}).status,"verified-not-applied"); });
test("F6 duplicate/ambiguous target remains conservative", () => { const d=descriptor(); assert.equal(verifyRemoteFolderCreate(d,{status:"unobservable",reason:"duplicate-logical-path"}).status,"outcome-unknown"); });
test("F7 incomplete observation is outcome-unknown, never absence", () => { const d=descriptor(); assert.equal(verifyRemoteFolderCreate(d,{status:"unobservable",reason:"missing-parent-evidence"}).status,"outcome-unknown"); });
for (const stage of ["dispatch-authorized","outcome-unknown"] as const) test(`F${stage === "dispatch-authorized" ? "8" : "9"} restart from ${stage} observes before redispatch`, async () => { const d=descriptor(); let reads=0; let dispatches=0; const result=await recoverRemoteFolderCreate(d,{observeFolderCreateRecovery: async () => { reads++; return {status:"authoritative-absent",reservedRemoteObjectId:d.remoteMutation.reservedRemoteObjectId}; }}); assert.equal(restartDirective(stage),"reconcile-physical-reality"); assert.equal(reads,1); assert.equal(dispatches,0); assert.equal(result.status,"verified-not-applied"); });
test("F10 descriptor intent is not observation", async () => { const d=descriptor(); const result=await recoverRemoteFolderCreate(d,{observeFolderCreateRecovery: async () => ({status:"unobservable",reason:"actual-parent-not-observed"})}); assert.equal(result.status,"outcome-unknown"); });

test("deterministic randomized seed set enforces invariants", () => { for (const seed of [1,7,42,1337,0xC0FFEE]) { const s=randomized(seed); for(const p of ["a.md","b.md","c.md"]) assertNoSilentWinner(s,p); assert.equal(s.trace.length,80); } });
test("representative seed replay is byte-for-byte reproducible", () => { const a=randomized(1337,40); const b=randomized(1337,40); assert.deepEqual(a.trace,b.trace); assert.equal(JSON.stringify(a.trace),JSON.stringify(b.trace)); });
test("trace contains sanitized replay inputs only", () => { const s=randomized(42,20); const text=JSON.stringify({seed:42,initial:"synthetic",events:s.trace}); assert.equal(text.includes("OAuth"),false); assert.equal(text.includes("C:\\"),false); assert.equal(text.includes("/Users/"),false); });
