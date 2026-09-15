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

test("non-idempotent POST is dispatched once when server applies create but response is lost", async()=>{
  let calls=0; const createdIds:string[]=[];
  const transport=new GoogleHttpTransport(session(), async()=>{
    calls++; createdIds.push(`server-object-${calls}`);
    throw new TypeError("response lost after server-side create");
  },{maxAttempts:5,baseDelayMs:1,maxDelayMs:1,maxConcurrency:1},async()=>undefined,()=>0,()=>0);
  const result=await transport.request("https://www.googleapis.com/drive/v3/files",{method:"POST",body:"{}"});
  assert.equal(result.ok,false); if(!result.ok) assert.equal(result.signal.kind,"transient-failure");
  assert.equal(calls,1); assert.deepEqual(createdIds,["server-object-1"]);
});

test("POST 429 and 5xx are not blindly replayed", async()=>{
  for (const response of [
    new Response(JSON.stringify({error:{errors:[{reason:"rateLimitExceeded"}]}}),{status:429,headers:{"content-type":"application/json"}}),
    new Response(JSON.stringify({error:{message:"unavailable"}}),{status:503,headers:{"content-type":"application/json"}}),
  ]) {
    let calls=0;
    const transport=new GoogleHttpTransport(session(),async()=>{calls++;return response.clone();},{maxAttempts:5,baseDelayMs:1,maxDelayMs:1,maxConcurrency:1},async()=>undefined,()=>0,()=>0);
    const result=await transport.request("https://www.googleapis.com/drive/v3/files",{method:"POST",body:"{}"});
    assert.equal(result.ok,false); assert.equal(calls,1);
  }
});

test("retry-safe GET still retries transient failures", async()=>{
  let calls=0;
  const transport=new GoogleHttpTransport(session(),async()=>{calls++; if(calls===1) throw new TypeError("network"); return new Response("{}",{status:200});},{maxAttempts:3,baseDelayMs:1,maxDelayMs:1,maxConcurrency:1},async()=>undefined,()=>0,()=>0);
  const result=await transport.request("https://www.googleapis.com/drive/v3/files/file-id",{method:"GET"});
  assert.equal(result.ok,true); assert.equal(calls,2);
});

test("Drive 401 invalidates only access token, refreshes, and retries a safe GET", async()=>{
  const backing=new MemorySecrets(); backing.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID,JSON.stringify({accessToken:"rejected",refreshToken:"refresh-authority",expiresAtMs:Date.now()+3600000,tokenType:"Bearer",scope:REQUIRED_DRIVE_SCOPE}));
  let refreshCalls=0;
  const oauth=new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(backing),async()=>{refreshCalls++;return new Response(JSON.stringify({access_token:"fresh",expires_in:3600,token_type:"Bearer",scope:REQUIRED_DRIVE_SCOPE}),{status:200,headers:{"content-type":"application/json"}});});
  let driveCalls=0;
  const transport=new GoogleHttpTransport(oauth,async(_url,init)=>{driveCalls++; const authorization=new Headers(init?.headers).get("authorization"); return driveCalls===1?new Response("",{status:401}):new Response(JSON.stringify({authorization}),{status:200});},{maxAttempts:3,baseDelayMs:1,maxDelayMs:1,maxConcurrency:1},async()=>undefined,()=>0,()=>0);
  const result=await transport.request("https://www.googleapis.com/drive/v3/files/file-id",{method:"GET"});
  assert.equal(result.ok,true); assert.equal(driveCalls,2); assert.equal(refreshCalls,1);
  const persisted=JSON.parse(backing.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID)!) as {refreshToken?:string;accessToken?:string};
  assert.equal(persisted.refreshToken,"refresh-authority"); assert.equal(persisted.accessToken,"fresh");
});
