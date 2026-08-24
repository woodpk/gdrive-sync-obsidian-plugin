import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type ChangeCursor, type ProtocolVersion, type RemoteObjectId, type VaultIdentity } from "../src/contracts/common";
import type { DriveResult } from "../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";
class MemorySecrets { readonly values=new Map<string,string>(); getSecret(id:string){return this.values.get(id)??null;} setSecret(id:string,v:string){this.values.set(id,v);} deleteSecret(id:string){this.values.delete(id);} }
class StubTransport extends GoogleHttpTransport { constructor(private readonly handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>){ const m=new MemorySecrets(); super(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(m))); } override request(url:string,init:PortableRequestInit={}):Promise<DriveResult<Response>>{ return this.handler(url,init); } }
const ok=(body:unknown,status=200)=>Promise.resolve({ok:true,value:new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})} as DriveResult<Response>);
const id=(s:string)=>contractId<"RemoteObjectId">(s) as RemoteObjectId; const vault=(s:string)=>contractId<"VaultIdentity">(s) as VaultIdentity; const version=(s:string)=>contractId<"ProtocolVersion">(s) as ProtocolVersion; const cursor=(s:string)=>contractId<"ChangeCursor">(s) as ChangeCursor;
const root=()=>({id:"root",name:"BRAIN Sync",mimeType:"application/vnd.google-apps.folder",trashed:false,appProperties:{brainSyncRole:"brain-sync-root",brainVaultIdentity:"vault-1",brainProtocolVersion:"1"}});
const content=()=>({id:"content",name:"vault",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-content"}});
function adapter(handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>,paired=true){ const backing=new MemorySecrets(); if(paired) backing.setSecret("brain-gdrive-paired-account","acct"); const store=new ObsidianSecretStore(backing); return new GoogleDriveAdapter(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},store),new StubTransport(handler),store); }

test("managed root creation stamps stable vault identity and protocol metadata",async()=>{
  const bodies:string[]=[]; let creates=0;
  const a=adapter(async(url,init)=>{ if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(init?.method==="POST"&&url.includes("/files?")){ bodies.push(String(init.body)); creates++; return ok(creates===1?root():content()); } throw new Error(url); },false);
  const result=await a.createManagedRoot(vault("vault-1"),version("1")); assert.equal(result.ok,true); if(result.ok){assert.equal(String(result.value.rootId),"root");assert.equal(String(result.value.vaultIdentity),"vault-1");}
  assert.match(bodies[0],/brain-sync-root/); assert.match(bodies[0],/brainVaultIdentity/); assert.match(bodies[0],/brainProtocolVersion/); assert.match(bodies[1],/brain-sync-content/);
});

test("start cursor and incremental change page retain Drive identity",async()=>{
  const a=adapter(async url=>{ if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/root?")) return ok(root()); if(url.includes("appProperties")) return ok({files:[content()]}); if(url.includes("/changes/startPageToken")) return ok({startPageToken:"start-1"}); if(url.includes("/changes?")) return ok({changes:[{fileId:"file-1",file:{id:"file-1",name:"note.md",mimeType:"text/plain",parents:["content"],trashed:false,size:"4",version:"2"}}],newStartPageToken:"next-2"}); throw new Error(url); });
  const start=await a.getStartCursor(id("root")); assert.equal(start.ok,true); if(start.ok) assert.equal(String(start.value),"start-1");
  const page=await a.readChanges(id("root"),cursor("start-1")); assert.equal(page.ok,true); if(page.ok){ assert.equal(String(page.value.nextCursor),"next-2"); assert.equal(page.value.changes.length,1); const change=page.value.changes[0]; assert.equal(change.kind,"upsert"); if(change.kind==="upsert") assert.equal(String(change.entry.remoteObjectId),"file-1"); }
});

test("Google account change blocks remote mutation until explicit re-pair",async()=>{
  let trashed=false;
  const a=adapter(async(url,init)=>{ if(url.includes("/about")) return ok({user:{permissionId:"other-account"}}); if(init?.method==="PATCH") trashed=true; throw new Error(url); });
  const result=await a.trash(id("file-1")); assert.equal(result.ok,false); if(!result.ok) assert.equal(result.signal.kind,"authentication-required"); assert.equal(trashed,false);
});
