import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type ChangeCursor, type RemoteObjectId, type VaultIdentity } from "../src/contracts/common";
import type { DriveResult } from "../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";

class MemorySecrets {
  readonly values = new Map<string,string>();
  getSecret(id:string){ return this.values.get(id) ?? null; }
  setSecret(id:string,value:string){ this.values.set(id,value); }
  deleteSecret(id:string){ this.values.delete(id); }
}
class StubTransport extends GoogleHttpTransport {
  constructor(private readonly handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>) {
    const memory = new MemorySecrets();
    super(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(memory)));
  }
  override request(url:string,init:PortableRequestInit={}):Promise<DriveResult<Response>> { return this.handler(url,init); }
}
const ok=(body:unknown,status=200)=>Promise.resolve({ok:true,value:new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})} as DriveResult<Response>);
const id=(value:string)=>contractId<"RemoteObjectId">(value) as RemoteObjectId;
const changeCursor=(value:string)=>contractId<"ChangeCursor">(value) as ChangeCursor;
const vault=(value:string)=>contractId<"VaultIdentity">(value) as VaultIdentity;
const provenance=(domain:"content"|"portable-config")=>({brainManagedRootId:"root",brainSyncDomain:domain});
const root=()=>({id:"root",name:"BRAIN Sync",mimeType:"application/vnd.google-apps.folder",trashed:false,appProperties:{brainSyncRole:"brain-sync-root",brainVaultIdentity:"vault-1",brainProtocolVersion:"1"}});
const content=()=>({id:"content",name:"vault",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-content"}});
const config=()=>({id:"config",name:"__brain_sync_portable_config__",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-portable-config"}});
const outside=()=>({id:"outside",name:"Elsewhere",mimeType:"application/vnd.google-apps.folder",parents:[],trashed:false});
const object=(domain:"content"|"portable-config",parent:string,name="app.json")=>({id:"obj",name,mimeType:"application/json",parents:[parent],trashed:false,size:"4",version:"2",appProperties:provenance(domain)});
function isContentRootQuery(url:string){ return url.includes("brain-sync-content"); }
function isConfigRootQuery(url:string){ return url.includes("__brain_sync_portable_config__") && (url.includes("%27root%27") || url.includes("'root'")); }
function isManagedProvenanceQuery(url:string){ return url.includes("brainManagedRootId"); }
function isChildrenOf(url:string,parent:string){ return url.includes(`%27${parent}%27`) || url.includes(`'${parent}'`); }
function adapter(handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>){
  const backing=new MemorySecrets(); backing.setSecret("brain-gdrive-paired-account","acct"); const store=new ObsidianSecretStore(backing);
  return new GoogleDriveAdapter(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},store),new StubTransport(handler),store);
}
function common(url:string){
  if(url.includes("/about")) return ok({user:{permissionId:"acct"}});
  if(url.includes("/files/root?")) return ok(root());
  if(url.includes("/files/content?")) return ok(content());
  if(url.includes("/files/config?")) return ok(config());
  if(isContentRootQuery(url)) return ok({files:[content()]});
  if(isConfigRootQuery(url)) return ok({files:[config()]});
  return undefined;
}

test("B1 external ordinary-vault -> portable-config move is recovery-required, not a domain reclassification",async()=>{
  const a=adapter(async url=>{
    const fixture=common(url); if(fixture) return fixture;
    if(url.includes("/changes?")) return ok({changes:[{fileId:"obj",file:object("content","config")}],newStartPageToken:"next"});
    throw new Error(url);
  });
  const result=await a.readChanges(id("root"),changeCursor("old"));
  assert.equal(result.ok,false);
  if(!result.ok){ assert.equal(result.signal.kind,"recovery-required"); assert.match("detail" in result.signal ? result.signal.detail : "",/cross-domain-reclassification/); }
});

test("B1 external portable-config -> ordinary-vault move is recovery-required, not a domain reclassification",async()=>{
  const a=adapter(async url=>{
    const fixture=common(url); if(fixture) return fixture;
    if(url.includes("/changes?")) return ok({changes:[{fileId:"obj",file:object("portable-config","content","note.md")}],newStartPageToken:"next"});
    throw new Error(url);
  });
  const result=await a.readChanges(id("root"),changeCursor("old"));
  assert.equal(result.ok,false);
  if(!result.ok){ assert.equal(result.signal.kind,"recovery-required"); assert.match("detail" in result.signal ? result.signal.detail : "",/cross-domain-reclassification/); }
});

test("B2 incremental reconciliation rejects a known stable object moved outside the managed remote after restart",async()=>{
  const a=adapter(async url=>{
    const fixture=common(url); if(fixture) return fixture;
    if(url.includes("/changes?")) return ok({changes:[{fileId:"obj",file:object("content","outside","note.md")}],newStartPageToken:"next"});
    if(url.includes("/files/outside?")) return ok(outside());
    throw new Error(url);
  });
  const result=await a.readChanges(id("root"),changeCursor("old"));
  assert.equal(result.ok,false);
  if(!result.ok){ assert.equal(result.signal.kind,"recovery-required"); assert.match("detail" in result.signal ? result.signal.detail : "",/left-remote-domain/); }
});

test("B2 full reconciliation rejects a provenance-marked managed object moved outside the managed remote",async()=>{
  const moved=object("content","outside","note.md");
  const a=adapter(async url=>{
    const fixture=common(url); if(fixture) return fixture;
    if(isChildrenOf(url,"content")) return ok({files:[]});
    if(isChildrenOf(url,"config")) return ok({files:[]});
    if(isManagedProvenanceQuery(url)) return ok({files:[moved]});
    if(url.includes("/files/outside?")) return ok(outside());
    throw new Error(url);
  });
  const result=await a.listForReconciliation(id("root"));
  assert.equal(result.ok,false);
  if(!result.ok){ assert.equal(result.signal.kind,"recovery-required"); assert.match("detail" in result.signal ? result.signal.detail : "",/left-remote-domain/); }
});

test("B2 same-session cache cannot convert structural move-out into removal",async()=>{
  let moved=false;
  const current=()=>object("content",moved?"outside":"content","note.md");
  const a=adapter(async url=>{
    const fixture=common(url); if(fixture) return fixture;
    if(isChildrenOf(url,"content")) return ok({files:moved?[]:[current()]});
    if(isChildrenOf(url,"config")) return ok({files:[]});
    if(isManagedProvenanceQuery(url)) return ok({files:[current()]});
    if(url.includes("/changes?")) return ok({changes:[{fileId:"obj",file:current()}],newStartPageToken:"next"});
    if(url.includes("/files/outside?")) return ok(outside());
    throw new Error(url);
  });
  const baseline=await a.listForReconciliation(id("root")); assert.equal(baseline.ok,true);
  moved=true;
  const changed=await a.readChanges(id("root"),changeCursor("old"));
  assert.equal(changed.ok,false);
  if(!changed.ok){ assert.equal(changed.signal.kind,"recovery-required"); assert.match("detail" in changed.signal ? changed.signal.detail : "",/left-remote-domain/); }
});

test("B1/B2 provenance is scoped to the paired managed root identity",async()=>{
  const a=adapter(async url=>{
    const fixture=common(url); if(fixture) return fixture;
    if(url.includes("/changes?")) return ok({changes:[{fileId:"obj",file:{...object("content","content","note.md"),appProperties:{brainManagedRootId:"other-root",brainSyncDomain:"content"}}}],newStartPageToken:"next"});
    throw new Error(url);
  });
  const result=await a.readChanges(id("root"),changeCursor("old"));
  assert.equal(result.ok,false);
  if(!result.ok){ assert.equal(result.signal.kind,"recovery-required"); assert.match("detail" in result.signal ? result.signal.detail : "",/root-provenance-mismatch/); }
  assert.equal(String(vault("vault-1")),"vault-1");
});
