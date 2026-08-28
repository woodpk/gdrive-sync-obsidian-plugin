import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { Script } from "node:vm";

const root=join(__dirname,"..","..");

const html=readFileSync(join(root,"oauth-callback","index.html"),"utf8");
const inlineScript=html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

assert.notEqual(inlineScript,"","callback inline script must exist");

interface CallbackExecution {
  status: { textContent: string };
  fallback: { hidden: boolean; href: string; textContent: string };
  historyCalls: Array<[unknown,string,string]>;
  navigationCalls: string[];
  events: string[];
}

function executeCallback(search:string,throwOnNavigation=false):CallbackExecution {
  const events:string[]=[];
  const status={textContent:"Processing authorization return…"};
  let fallbackHref="";
  const fallback={
    hidden:true,
    textContent:"Open Obsidian to finish authentication",
    get href():string { return fallbackHref; },
    set href(value:string) { fallbackHref=value; events.push("fallback-prepared"); },
  };
  const historyCalls:Array<[unknown,string,string]>=[];
  const navigationCalls:string[]=[];
  const location={
    search,
    pathname:"/oauth/callback",
    replace(target:string):void {
      navigationCalls.push(target);
      events.push("automatic-navigation");
      if(throwOnNavigation) throw new Error("synthetic navigation rejection");
    },
  };
  const history={
    replaceState(state:unknown,title:string,path:string):void {
      historyCalls.push([state,title,path]);
      events.push("history-sanitized");
    },
  };
  const document={
    getElementById(id:string):typeof status|typeof fallback|null {
      if(id==="status") return status;
      if(id==="open-obsidian") return fallback;
      return null;
    },
  };
  new Script(inlineScript).runInNewContext({URL,URLSearchParams,window:{location},history,document});
  return {status,fallback,historyCalls,navigationCalls,events};
}

test("hosted OAuth callback remains content-blind, token-nonpersistent, and history-sanitizing",()=>{
  assert.match(html,/obsidian:\/\/brain-gdrive-oauth/);
  for(const forbidden of ["access_token","refresh_token","localStorage","sessionStorage","fetch(","XMLHttpRequest","vault"]) assert.equal(html.includes(forbidden),false);
  assert.match(html,/history\.replaceState/);
  assert.match(html,/window\.location\.replace\(targetUrl\)/);
  assert.match(html,/Processing authorization return…/);
});

test("incomplete callback sanitizes history without preparing or launching a handoff",()=>{
  for(const search of ["?code=fake-code","?state=fake-state"]){
    const result=executeCallback(search);
    assert.deepEqual(result.historyCalls,[[null,"","/oauth/callback"]]);
    assert.deepEqual(result.navigationCalls,[]);
    assert.equal(result.fallback.hidden,true);
    assert.equal(result.fallback.href,"");
    assert.equal(result.status.textContent,"Authorization return is incomplete. Return to Obsidian and try again.");
  }
});

test("valid authorization-code callback prepares one exact manual target before automatic navigation",()=>{
  const result=executeCallback("?state=fake-state&code=fake-code");
  const target="obsidian://brain-gdrive-oauth?state=fake-state&code=fake-code";
  assert.deepEqual(result.historyCalls,[[null,"","/oauth/callback"]]);
  assert.equal(result.fallback.hidden,false);
  assert.equal(result.fallback.textContent,"Open Obsidian to finish authentication");
  assert.equal(result.fallback.href,target);
  assert.deepEqual(result.navigationCalls,[target]);
  assert.deepEqual(result.events,["history-sanitized","fallback-prepared","automatic-navigation"]);
  assert.equal(result.status.textContent,"Automatic return attempted. If Obsidian did not open, tap the button below.");
});

test("valid OAuth-error callback prepares the same manual and automatic handoff path",()=>{
  const result=executeCallback("?state=fake-state&error=access_denied");
  const target="obsidian://brain-gdrive-oauth?state=fake-state&error=access_denied";
  assert.equal(result.fallback.hidden,false);
  assert.equal(result.fallback.href,target);
  assert.deepEqual(result.navigationCalls,[target]);
});

test("automatic navigation failure remains secret-safe and leaves the direct fallback active",()=>{
  const result=executeCallback("?state=fake-state&code=fake-code",true);
  assert.equal(result.fallback.hidden,false);
  assert.equal(result.fallback.href,"obsidian://brain-gdrive-oauth?state=fake-state&code=fake-code");
  assert.equal(result.status.textContent,"Automatic return could not be completed. Tap the button below.");
  for(const visible of [result.status.textContent,result.fallback.textContent]){
    for(const forbidden of ["fake-state","fake-code","access_token","refresh_token","client_secret","code_verifier","code_challenge"]) assert.equal(visible.includes(forbidden),false);
  }
});
