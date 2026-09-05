import "./workstreams/drive/phase6-remote-protocol.test";
import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type BinaryContentSource, type RemoteObjectId, type VaultIdentity, type VaultPath } from "../src/contracts/common";
import type { DriveResult } from "../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";
class MemorySecrets { readonly values=new Map<string,string>(); getSecret(id:string){return this.values.get(id)??null;} setSecret(id:string,v:string){this.values.set(id,v);} deleteSecret(id:string){this.values.delete(id);} }
class StubTransport extends GoogleHttpTransport { constructor(private readonly handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>){ const m=new MemorySecrets(); super(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(m))); } override request(url:string,init:PortableRequestInit={}):Promise<DriveResult<Response>>{ return this.handler(url,init); } }
const ok=(body:unknown,status=200,headers:Record<string,string>={})=>Promise.resolve({ok:true,value:new Response(body===undefined?undefined:JSON.stringify(body),{status,headers:{"content-type":"application/json",...headers}})} as DriveResult<Response>);
const root=(vault="vault-1",version="1")=>({id:"root",name:"BRAIN Sync",mimeType:"application/vnd.google-apps.folder",trashed:false,appProperties:{brainSyncRole:"brain-sync-root",brainVaultIdentity:vault,brainProtocolVersion:version}});
const content=()=>({id:"content",name:"vault",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-content"}});
const config=()=>({id:"config",name:"__brain_sync_portable_config__",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-portable-config"}});
const provenance=(domain:"content"|"portable-config")=>({brainManagedRootId:"root",brainSyncDomain:domain});
const norm=(url:string)=>decodeURIComponent(url).replace(/\+/g," ");
const isContentRootQuery=(url:string)=>{const u=norm(url);return u.includes("'root' in parents")&&u.includes("brainSyncRole")&&u.includes("brain-sync-content");};
const isConfigRootQuery=(url:string)=>{const u=norm(url);return u.includes("'root' in parents")&&u.includes("__brain_sync_portable_config__");};
const isOrdinaryCollisionQuery=(url:string)=>{const u=norm(url);return u.includes("'content' in parents")&&u.includes("__brain_sync_portable_config__");};
function domainFixtures(url:string){ if(url.includes("/files/root?")) return ok(root()); if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]}); if(isOrdinaryCollisionQuery(url)) return ok({files:[]}); return undefined; }
function adapter(handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>){ const backing=new MemorySecrets(); backing.setSecret("brain-gdrive-paired-account","acct"); const store=new ObsidianSecretStore(backing); return new GoogleDriveAdapter(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},store),new StubTransport(handler),store); }
const path=(s:string)=>contractId<"VaultPath">(s) as VaultPath; const id=(s:string)=>contractId<"RemoteObjectId">(s) as RemoteObjectId; const vault=(s:string)=>contractId<"VaultIdentity">(s) as VaultIdentity;

test("managed-root validation detects identity and protocol mismatch", async()=>{
  let mode="identity";
  const a=adapter(async url=>{ if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/root?")) return ok(root(mode==="identity"?"other":"vault-1",mode==="protocol"?"2":"1")); if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]}); if(isOrdinaryCollisionQuery(url)) return ok({files:[]}); throw new Error(url); });
  let result=await a.pairManagedRoot(id("root"),vault("vault-1")); assert.equal(result.ok,true); if(result.ok) assert.equal(result.value.status,"identity-mismatch");
  mode="protocol"; result=await a.pairManagedRoot(id("root"),vault("vault-1")); assert.equal(result.ok,true); if(result.ok) assert.equal(result.value.status,"incompatible-protocol");
});

test("partial reconciliation listing never masquerades as complete", async()=>{
  let childPage=0;
  const a=adapter(async url=>{ if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); const fixture=domainFixtures(url); if(fixture) return fixture; const u=norm(url); if(u.includes("q='content' in parents")||u.includes("q='content'+in+parents")||u.includes("'content' in parents")){ childPage++; if(childPage===1) return ok({files:[{id:"f1",name:"a.md",mimeType:"text/plain",parents:["content"],trashed:false,size:"1",version:"1",appProperties:provenance("content")}],nextPageToken:"next"}); return {ok:false,signal:{kind:"transient-failure",detail:"network"}}; } if(u.includes("'config' in parents")) return ok({files:[]}); throw new Error(url); });
  const result=await a.listForReconciliation(id("root")); assert.equal(result.ok,true); if(result.ok){ assert.equal(result.value.entries.length,1); assert.equal(result.value.completeness.status,"partial"); }
});

test("move preserves Drive id and normal deletion uses trash PATCH", async()=>{
  const seen:Array<{url:string;method?:string;body?:string}>=[];
  const a=adapter(async (url,init)=>{ seen.push({url,method:init?.method,body:typeof init?.body==="string"?init.body:undefined}); if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/file1?")){ if(init?.method==="PATCH") return ok({id:"file1",name:"new.md",mimeType:"text/plain",parents:["newp"],size:"3",version:"2",appProperties:provenance("content")}); return ok({id:"file1",name:"old.md",mimeType:"text/plain",parents:["content"],size:"3",version:"1",appProperties:provenance("content")}); } if(url.includes("/files/content?")) return ok(content()); if(url.includes("/files/root?")) return ok(root()); if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]}); if(isOrdinaryCollisionQuery(url)) return ok({files:[]}); const u=norm(url); if(u.includes("name='new'")) return ok({files:[{id:"newp",name:"new",mimeType:"application/vnd.google-apps.folder",parents:["content"],trashed:false,appProperties:provenance("content")}]}); if(url.includes("/files/file2?")) return ok({id:"file2",trashed:true}); throw new Error(url); });
  const moved=await a.move(id("file1"),path("old.md"),path("new/new.md")); assert.equal(moved.ok,true); if(moved.ok) assert.equal(String(moved.value.remoteObjectId),"file1");
  const trashed=await a.trash(id("file2")); assert.equal(trashed.ok,true); assert.ok(seen.some(x=>x.url.includes("/files/file2?")&&x.method==="PATCH"&&x.body?.includes('"trashed":true'))); assert.equal(seen.some(x=>x.method==="DELETE"),false);
});

test("download is lazy and range-chunked", async()=>{
  const ranges:string[]=[]; let mediaCalls=0;
  const a=adapter(async (url,init)=>{ if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/file1?")&&!url.includes("alt=media")) return ok({id:"file1",name:"large.bin",mimeType:"application/octet-stream",parents:["content"],size:"600000",sha256Checksum:"abc",version:"7",appProperties:provenance("content")}); if(url.includes("alt=media")){ mediaCalls++; const r=new Headers(init?.headers).get("range")!; ranges.push(r); const [start,end]=r.replace("bytes=","").split("-").map(Number); return Promise.resolve({ok:true,value:new Response(new Uint8Array(end-start+1),{status:206})} as DriveResult<Response>); } throw new Error(url); });
  const result=await a.download(id("file1")); assert.equal(result.ok,true); assert.equal(mediaCalls,0); if(result.ok){ let chunks=0; for await(const bytes of result.value.content.openChunks()){ chunks++; assert.ok(bytes.length<=256*1024); if(chunks===2) break; } assert.equal(chunks,2); } assert.equal(mediaCalls,2); assert.equal(ranges[0],"bytes=0-262143");
});

test("resumable create consumes content incrementally and verifies size", async()=>{
  const uploadRanges:string[]=[];
  const a=adapter(async (url,init)=>{ if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); const fixture=domainFixtures(url); if(fixture) return fixture; if(url.startsWith("https://www.googleapis.com/upload/")) return ok({},200,{location:"https://upload.example/session"}); if(url==="https://upload.example/session"){ const range=new Headers(init?.headers).get("content-range")!; uploadRanges.push(range); if(uploadRanges.length===1) return Promise.resolve({ok:true,value:new Response(undefined,{status:308,headers:{range:"bytes=0-262143"}})} as DriveResult<Response>); return ok({id:"new-id",name:"large.bin",mimeType:"application/octet-stream",parents:["content"],size:"500000",version:"1",appProperties:provenance("content")}); } throw new Error(url); });
  const source:BinaryContentSource={sizeBytes:500000,async *openChunks(){yield new Uint8Array(200000);yield new Uint8Array(200000);yield new Uint8Array(100000);}};
  const result=await a.create(id("root"),{path:path("large.bin"),entityKind:"file",content:source,expectedEvidence:{sizeBytes:500000}}); assert.equal(result.ok,true); assert.deepEqual(uploadRanges,["bytes 0-262143/*","bytes 262144-499999/500000"]);
});
