import assert from "node:assert/strict";
import test from "node:test";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleHttpTransport } from "../src/drive/transport";
import { REQUIRED_DRIVE_SCOPE } from "../src/contracts/google-drive";
class MemorySecrets { readonly values=new Map<string,string>(); getSecret(id:string){return this.values.get(id)??null;} setSecret(id:string,v:string){this.values.set(id,v);} deleteSecret(id:string){this.values.delete(id);} }
function session(fetcher: typeof fetch = fetch){ const b=new MemorySecrets(); b.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID, JSON.stringify({accessToken:"a",refreshToken:"r",expiresAtMs:Date.now()+3600000,tokenType:"Bearer",scope:REQUIRED_DRIVE_SCOPE})); return new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(b),fetcher); }

test("transport honors Retry-After with bounded retry", async()=>{
  let calls=0; const sleeps:number[]=[];
  const transport=new GoogleHttpTransport(session(), async()=>{calls++; return calls===1?new Response(JSON.stringify({error:{errors:[{reason:"rateLimitExceeded"}]}}),{status:429,headers:{"retry-after":"2","content-type":"application/json"}}):new Response("{}",{status:200});},{maxAttempts:3,baseDelayMs:10,maxDelayMs:100,maxConcurrency:2},async ms=>{sleeps.push(ms);},()=>0,()=>0);
  const result=await transport.request("https://x"); assert.equal(result.ok,true); assert.equal(calls,2); assert.deepEqual(sleeps,[2000]);
});

test("quota exhaustion is structured and not retried destructively", async()=>{
  let calls=0;
  const transport=new GoogleHttpTransport(session(), async()=>{calls++; return new Response(JSON.stringify({error:{errors:[{reason:"storageQuotaExceeded"}]}}),{status:403,headers:{"content-type":"application/json"}});});
  const result=await transport.request("https://x"); assert.equal(result.ok,false); if(!result.ok) assert.equal(result.signal.kind,"quota-exhausted"); assert.equal(calls,1);
});

test("invalid change cursor is a conservative recovery signal", async()=>{
  const transport=new GoogleHttpTransport(session(), async()=>new Response(JSON.stringify({error:{message:"gone"}}),{status:410,headers:{"content-type":"application/json"}}));
  const result=await transport.request("https://www.googleapis.com/drive/v3/changes?pageToken=old"); assert.equal(result.ok,false); if(!result.ok){ assert.equal(result.signal.kind,"recovery-required"); }
});
