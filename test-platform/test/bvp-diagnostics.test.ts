import { deepStrictEqual, doesNotMatch, rejects, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineScenario } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import {
  bvpDiagnostic,
  safeUnexpectedFailure,
} from "../src/scenario/scenario-diagnostics";
import { createLiveScenarioExecutor, liveCommandId } from "../src/live-device/live-scenario-executor";
import { createDriveCommandMailbox, MailboxUnavailableError } from "../src/live-device/drive-mailbox";
import { bridgeFailureDiagnostic } from "./batteries/phxci-physical-bridge";

const fixture = (executionMode: "live" | "deterministic") => defineScenario({
  id: "diagnostic-fixture",
  description: "BVP structured error communication contract",
  executionModes: [executionMode],
  traceability: { targets: [{ kind: "requirement", id: "BVP-EVID-005" }] },
  steps: [{
    id: "observe",
    kind: "observe" as const,
    subject: "device-state" as const,
    device: "windows",
    captureAs: "state",
  }],
});

test("diagnostics describe only observed boundaries and never imply device delivery", () => {
  const value = bvpDiagnostic({
    classification: "device-result-unavailable",
    component: "live-controller",
    phase: "response-wait",
    lastConfirmedBoundary: "relay-outbox-write",
    firstUnconfirmedBoundary: "device-result-receipt",
    effect: "unknown",
    recommendedAction: "inspect-pending-command",
    stepId: "observe",
  });
  // DEC-348: the common record itself, not a surrounding scenario, must carry
  // privacy-safe context and the observations supporting dispatch uncertainty.
  strictEqual(value.schemaVersion,1);
  strictEqual(value.classification,"device-result-unavailable");
  strictEqual(value.phase,"response-wait");
  deepStrictEqual(value.identity,{
    runId:"unavailable",scenarioId:"unavailable",stepIndex:null,
    executionMode:"unknown",correlationToken:"unavailable",
  });
  deepStrictEqual(value.hops,[
    {boundary:"relay-outbox-write",status:"confirmed"},
    {boundary:"device-result-receipt",status:"unknown"},
  ]);
  strictEqual(value.causeClass,"device-result-unavailable");
  strictEqual(value.retriability,"requires-reconciliation");
  strictEqual(value.stepId,"observe");
  strictEqual(JSON.stringify(value).includes("delivered"), false);
});

test("arbitrary exceptions never leak tokens, personal paths or vault contents", () => {
  const message = "Bearer secret123 /Users/owner/PrivateVault/private-note.md";
  const failure = safeUnexpectedFailure(new Error(message), {
    component: "scenario-runner",
    phase: "step-execution",
    lastConfirmedBoundary: "scenario-step-selected",
    firstUnconfirmedBoundary: "step-execution",
    stepId: "observe",
  });
  strictEqual(failure.status, "failed");
  strictEqual(failure.classification, "step-exception");
  strictEqual(failure.diagnostic.classification, "step-exception");
  strictEqual(failure.diagnostic.effect, "unknown");
  doesNotMatch(JSON.stringify(failure), /secret123|PrivateVault|private-note|Bearer/i);
});

test("malformed external diagnostic codes are not reflected into public output", () => {
  const diagnostic = bvpDiagnostic({
    classification: "Bearer hidden-secret",
    component: "live-controller",
    phase: "response-wait",
    lastConfirmedBoundary: "relay-outbox-write",
    firstUnconfirmedBoundary: "device-result-receipt",
    effect: "unknown",
    recommendedAction: "inspect-pending-command",
    stepId: "private/path/token",
  });
  strictEqual(diagnostic.classification, "unexpected-internal-error");
  strictEqual(diagnostic.stepId, undefined);
  doesNotMatch(JSON.stringify(diagnostic), /hidden-secret|private\/path/);
});

test("scenario step exceptions persist safe structured context in result and canonical evidence", async () => {
  const definition = fixture("live");
  const runner = new DeterministicScenarioRunner({}, {
    executionMode: "live",
    deviceIdentities: ["simulated-windows"],
    async execute() { throw new Error("vault secret /home/owner/private.md Bearer sensitive"); },
  });
  const result = await runner.run(definition);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "step-exception");
  strictEqual(result.steps[0]?.diagnostic?.lastConfirmedBoundary, "scenario-step-selected");
  strictEqual(result.diagnostic?.firstUnconfirmedBoundary, "step-execution");
  strictEqual(result.evidence?.machine.verdict.diagnostic?.classification, "step-exception");
  doesNotMatch(JSON.stringify(result), /Bearer sensitive|private\.md|vault secret/);
});

test("missing live response identifies an unknown receipt rather than claiming failed delivery", async () => {
  const root = await mkdtemp(join(tmpdir(), "bvp-diag-"));
  try {
    const scenario = fixture("live");
    const relay = join(root, "relay");
    const runner = await createLiveScenarioExecutor({
      scenario, runId: "diagnostics-run", deviceIds: { windows: "simulated-only-private-id" },
      relayRoot: relay, checkpointFile: join(root, "checkpoint.json"),
      expectedValidationSourceCommit: "a".repeat(40),
      resultTimeoutMs: 15, pollIntervalMs: 2,
    });
    const result = await new DeterministicScenarioRunner({}, runner).run(scenario);
    strictEqual(result.status, "blocked");
    strictEqual(result.classification, "device-result-unavailable");
    strictEqual(result.diagnostic?.phase, "response-wait");
    strictEqual(result.diagnostic?.lastConfirmedBoundary, "relay-outbox-write");
    strictEqual(result.diagnostic?.firstUnconfirmedBoundary, "device-result-receipt");
    strictEqual(result.diagnostic?.effect, "unknown");
    strictEqual(result.diagnostic?.identity.runId.startsWith("run-sha256:"),true);
    strictEqual(result.diagnostic?.identity.scenarioId,"diagnostic-fixture");
    strictEqual(result.diagnostic?.identity.stepIndex,0);
    strictEqual(result.diagnostic?.identity.executionMode,"windows-live");
    strictEqual(result.diagnostic?.identity.correlationToken.startsWith("corr-sha256:"),true);
    strictEqual(result.diagnostic?.hops.some(h=>h.boundary==="device-result-receipt"&&h.status==="unknown"),true);
    deepStrictEqual(result.diagnostic?.hops.map(h=>[h.boundary,h.status]),[
      ["relay-outbox-write","confirmed"],["drive-command-publication","unknown"],
      ["device-command-consumed","unknown"],["device-result-receipt","unknown"],
    ]);
    doesNotMatch(JSON.stringify(result), /simulated-only-private-id/);
    const files = await readdir(join(relay, "outbox"));
    strictEqual(files.length, 1);
    const record = JSON.parse(await readFile(join(relay, "outbox", files[0]!), "utf8"));
    strictEqual(record.deviceId, "simulated-only-private-id");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Drive mailbox distinguishes safe authorization, rate, provider and transport failures", async () => {
  const samples: readonly [number, string][] = [
    [401, "mailbox-drive-unauthorized"],
    [403, "mailbox-drive-forbidden"],
    [429, "mailbox-drive-rate-limited"],
    [503, "mailbox-drive-provider-unavailable"],
    [400, "mailbox-drive-request-rejected"],
  ];
  for (const [httpStatus, code] of samples) {
    const mailbox = createDriveCommandMailbox(async () => new Response(null, { status: httpStatus }));
    await rejects(() => mailbox.commands("test-run", "simulated-device"),
      (error: unknown) => error instanceof MailboxUnavailableError && error.message === code);
  }
  const network = createDriveCommandMailbox(async () => {
    throw new Error("Bearer leaked-token C:\\private\\vault");
  });
  await rejects(() => network.commands("test-run", "simulated-device"),
    (error: unknown) => error instanceof MailboxUnavailableError &&
      error.message === "mailbox-drive-transport-unavailable");
});

test("live runner top-level exceptions produce a safe failure record, no raw path or stack", async () => {
  const root = await mkdtemp(join(tmpdir(), "bvp-cli-"));
  try {
    const resultPath = join(root, "result.json");
    const privatePath = join(root, "Bearer-private-credential-should-not-leak.json");
    const cli = join(__dirname, "batteries", "run-live-battery.js");
    const child = spawnSync(process.execPath, [cli,
      "--battery", "windows-live-smoke", "--result-file", resultPath,
      "--device-map-json", JSON.stringify({ windows: "synthetic-windows-id" }),
      "--run-id", "diagnostics-cli",
      "--relay-root", join(root, "relay"), "--checkpoint-file", join(root, "checkpoint.json"),
      "--validation-source-commit", "a".repeat(40),
      "--validation-build-identity-file", privatePath,
    ], { encoding: "utf8" });
    strictEqual(child.status, 1);
    const record = JSON.parse(await readFile(resultPath, "utf8"));
    strictEqual(record.result.status, "failed");
    strictEqual(record.result.classification, "battery-runner-exception");
    strictEqual(record.result.diagnostic.component, "battery-runner");
    doesNotMatch(child.stdout + child.stderr + JSON.stringify(record),
      /Bearer-private-credential|synthetic-windows-id|node:internal|at main/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("deterministic runner top-level invalid battery cannot echo untrusted arguments", async () => {
  const root = await mkdtemp(join(tmpdir(), "bvp-det-cli-"));
  try {
    const resultPath = join(root, "result.json");
    const cli = join(__dirname, "batteries", "run-deterministic-battery.js");
    const child = spawnSync(process.execPath, [cli,
      "--battery", "Bearer-private-credential", "--result-file", resultPath,
      "--tap-file", join(root, "tap.txt"),
    ], { encoding: "utf8" });
    strictEqual(child.status, 1);
    const record = JSON.parse(await readFile(resultPath, "utf8"));
    strictEqual(record.result.classification, "deterministic-battery-runner-exception");
    strictEqual(record.result.diagnostic.component, "battery-runner");
    doesNotMatch(child.stdout + child.stderr + JSON.stringify(record), /Bearer-private-credential|node:internal|at main/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("existing PHX-CI engineering operator accepts software-only feature ref without physical device dispatch", () => {
  const code = readFileSync(resolve(process.cwd(), "dev", "scripts",
    "Invoke-PHXCI-S09-WindowsRelayCorrection.ps1"), "utf8");
  strictEqual(code.includes("[string]$SoftwareOnlyBranch"), true);
  strictEqual(code.includes("[switch]$SoftwareOnlyGovernance"), true);
  strictEqual(code.includes("if ($SoftwareOnlyGovernance -and -not $SoftwareOnlyBranch)"), true);
  strictEqual(code.includes("'authorized-governance'"), true);
  strictEqual(code.includes("'ordinary'"), true);
  strictEqual(code.includes("$branch = $SoftwareOnlyBranch"), true);
  strictEqual(code.includes("if ($SoftwareOnlyBranch -and ("), true);
  strictEqual(code.includes("$RunWindowsPhysicalSmoke"), true);
  strictEqual(code.includes("$RunS09ADualPhysicalReadiness"), true);
  strictEqual(code.includes("'npm run test:bvp-root'"), true);
});

test("relay write failures report a prepublication boundary without emitting a command", async () => {
  const root=await mkdtemp(join(tmpdir(),"bvp-outbox-fault-"));
  try{
    const scenario=fixture("live"),relay=join(root,"relay"),runId="queue-fault-run";
    const executor=await createLiveScenarioExecutor({
      scenario,runId,deviceIds:{windows:"synthetic-device-secret"},
      relayRoot:relay,checkpointFile:join(root,"checkpoint.json"),
      expectedValidationSourceCommit:"a".repeat(40),resultTimeoutMs:10,pollIntervalMs:2,
    });
    const tempName="."+liveCommandId(runId,scenario.id,0,0)+".json.tmp";
    await mkdir(join(relay,tempName));
    const result=await new DeterministicScenarioRunner({},executor).run(scenario);
    strictEqual(result.status,"failed");
    strictEqual(result.classification,"relay-outbox-write-failed");
    strictEqual(result.diagnostic?.phase,"command-queue");
    strictEqual(result.diagnostic?.lastConfirmedBoundary,"controller-command-prepared");
    strictEqual(result.diagnostic?.firstUnconfirmedBoundary,"relay-outbox-write");
    strictEqual(result.diagnostic?.effect,"unknown");
    deepStrictEqual(result.diagnostic?.hops.map(h=>[h.boundary,h.status]),[
      ["controller-command-prepared","confirmed"],["relay-outbox-write","unknown"],
      ["drive-command-publication","not-observed"],
    ]);
    strictEqual((await readdir(join(relay,"outbox"))).length,0);
    doesNotMatch(JSON.stringify(result),/synthetic-device-secret|\.json\.tmp|node:internal/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("malformed inbox receipts have a distinct failure classification without inventing execution", async () => {
  const root=await mkdtemp(join(tmpdir(),"bvp-inbox-fault-"));
  try{
    const scenario=fixture("live"),relay=join(root,"relay"),runId="malformed-receipt-run";
    const executor=await createLiveScenarioExecutor({
      scenario,runId,deviceIds:{windows:"private-physical-id"},
      relayRoot:relay,checkpointFile:join(root,"checkpoint.json"),
      expectedValidationSourceCommit:"a".repeat(40),resultTimeoutMs:10,pollIntervalMs:2,
    });
    await mkdir(join(relay,"inbox"),{recursive:true});
    const name=liveCommandId(runId,scenario.id,0,0)+".json.result.json";
    await writeFile(join(relay,"inbox",name),"{broken: Bearer secret");
    const result=await new DeterministicScenarioRunner({},executor).run(scenario);
    strictEqual(result.classification,"result-malformed");
    strictEqual(result.diagnostic?.phase,"receipt-validation");
    strictEqual(result.diagnostic?.lastConfirmedBoundary,"relay-inbox-record-observed");
    strictEqual(result.diagnostic?.firstUnconfirmedBoundary,"receipt-decoding");
    strictEqual(result.diagnostic?.effect,"unknown");
    doesNotMatch(JSON.stringify(result),/Bearer secret|private-physical-id/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("bridge classifies known gate failures but hides arbitrary private exception text",()=>{
  const known=bridgeFailureDiagnostic(new Error("bvp-phxci-bridge-physical-result-uncertain"));
  strictEqual(known.code,"bvp-phxci-bridge-physical-result-uncertain");
  strictEqual(known.diagnostic.classification,"bridge-physical-result-uncertain");
  strictEqual(known.diagnostic.component,"battery-runner");
  strictEqual(known.diagnostic.effect,"unknown");
  strictEqual(known.diagnostic.firstUnconfirmedBoundary,"bridge-outcome");
  const secret=bridgeFailureDiagnostic(new Error("Bearer oauth-secret C:\\private\\vault"));
  strictEqual(secret.code,"bvp-phxci-bridge-unexpected-internal-error");
  strictEqual(secret.diagnostic.classification,"bridge-unexpected-internal-error");
  doesNotMatch(JSON.stringify(secret),/oauth-secret|private|vault|unclassified-error/);
  const invalid=bridgeFailureDiagnostic(new Error("bvp-phxci-bridge-unsafe/path"));
  strictEqual(invalid.code,"bvp-phxci-bridge-unexpected-internal-error");
});

test("invalid preflight scenarios fail safely without echoing private fields",async()=>{
  const malformed={...fixture("deterministic"),id:"C:\\Users\\owner\\secret-vault.md",
    "Bearer private-token":"secret-note"} as any;
  const result=await new DeterministicScenarioRunner().run(malformed);
  strictEqual(result.status,"unsupported");
  strictEqual(result.classification,"invalid-scenario");
  strictEqual(result.scenarioId,"invalid-scenario");
  strictEqual(result.diagnostic?.phase,"scenario-preflight");
  strictEqual(result.diagnostic?.lastConfirmedBoundary,"scenario-input-received");
  strictEqual(result.diagnostic?.firstUnconfirmedBoundary,"scenario-validation");
  strictEqual(result.diagnostic?.effect,"none-confirmed");
  doesNotMatch(JSON.stringify(result),/secret-vault|private-token|secret-note|owner/);
});

test("result file persistence failure has a separate safe phase instead of pretending output was saved",async()=>{
  const root=await mkdtemp(join(tmpdir(),"bvp-persistence-fault-"));
  try{
    const destination=join(root,"occupied-output-directory");
    await mkdir(destination);
    const live=spawnSync(process.execPath,[
      join(__dirname,"batteries","run-live-battery.js"),
      "--battery","nonexistent-battery","--result-file",destination,
    ],{encoding:"utf8"});
    strictEqual(live.status,1);
    strictEqual(live.stderr.includes('"classification":"result-persistence-failed"'),true);
    strictEqual(live.stderr.includes('"phase":"result-persistence"'),true);
    doesNotMatch(live.stderr,/at main|node:internal|occupied-output-directory/);
    const deterministic=spawnSync(process.execPath,[
      join(__dirname,"batteries","run-deterministic-battery.js"),
      "--battery","nonexistent-battery","--result-file",destination,
    ],{encoding:"utf8"});
    strictEqual(deterministic.status,1);
    strictEqual(deterministic.stderr.includes('"classification":"result-persistence-failed"'),true);
    strictEqual(deterministic.stderr.includes('"phase":"result-persistence"'),true);
    doesNotMatch(deterministic.stderr,/at main|node:internal|occupied-output-directory/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("ordinary simulated assertion failures carry phase and uncertainty in canonical evidence",async()=>{
  const scenario=defineScenario({
    id:"simulated-assertion-failure",description:"Expected failure diagnostic coverage",
    traceability:{targets:[{kind:"requirement",id:"BVP-EVID-005"}]},
    executionModes:["deterministic"],
    steps:[
      {id:"read",kind:"observe",subject:"local-entry",device:"device-a",path:"not-present.md",captureAs:"local"},
      {id:"assert",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
    ],
  });
  const result=await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status,"failed");
  strictEqual(result.classification,"assertion-mismatch");
  strictEqual(result.diagnostic?.phase,"simulated-step-result");
  strictEqual(result.diagnostic?.lastConfirmedBoundary,"scenario-step-result-received");
  strictEqual(result.diagnostic?.firstUnconfirmedBoundary,"expected-outcome-confirmation");
  strictEqual(result.evidence?.machine.verdict.diagnostic?.classification,"assertion-mismatch");
  strictEqual(result.steps[1]?.diagnostic?.classification,"assertion-mismatch");
});

test("battery operator output paths never print raw live envelopes or child error text",()=>{
  const read=(file:string)=>readFileSync(resolve(process.cwd(),"test-platform","test","batteries",file),"utf8");
  const live=read("run-live-battery.ts"),deterministic=read("run-deterministic-battery.ts");
  strictEqual(live.includes("console.log(JSON.stringify(envelope"),false);
  strictEqual(deterministic.includes("console.log(JSON.stringify(envelope"),false);
  strictEqual(deterministic.includes("error: outcome.error"),false);
  strictEqual(live.includes("console.log(JSON.stringify({"),true);
  strictEqual(deterministic.includes("console.log(JSON.stringify({"),true);
});

test("explicit correlation is hashed/allowlisted and never leaks raw identity",()=>{
  const d=bvpDiagnostic({
    classification:"device-result-unavailable",component:"windows-relay",
    phase:"result-fetch",lastConfirmedBoundary:"drive-command-publication",
    firstUnconfirmedBoundary:"device-result-receipt",effect:"unknown",
    recommendedAction:"inspect-pending-command",
    identity:{runId:"run-sha256:"+"a".repeat(24),scenarioId:"diagnostic-fixture",
      stepIndex:3,executionMode:"windows-live",
      correlationToken:"corr-sha256:"+"b".repeat(24)},
    hops:[{boundary:"relay-command-read",status:"confirmed"},
      {boundary:"drive-command-publication",status:"confirmed"},
      {boundary:"device-command-consumed",status:"unknown"},
      {boundary:"device-result-receipt",status:"unknown"}],
    causeClass:"timeout",retriability:"requires-reconciliation",
  });
  strictEqual(d.identity?.runId,"run-sha256:"+"a".repeat(24));
  strictEqual(d.identity?.stepIndex,3);
  strictEqual(d.hops?.[2]?.status,"unknown");
  strictEqual(d.causeClass,"timeout");
  const malicious=bvpDiagnostic({
    classification:"outbox-failed",component:"windows-relay",phase:"relay",
    lastConfirmedBoundary:"relay-command-read",firstUnconfirmedBoundary:"drive-publish",
    effect:"unknown",recommendedAction:"reconcile-relay-state",
    identity:{runId:"Bearer SECRET /Users/owner",scenarioId:"../../vault.md",
      stepIndex:-999,executionMode:"ios-secret" as any,correlationToken:"secret-token"},
    hops:[{boundary:"secret/file",status:"confirmed"} as any],
    causeClass:"Bearer SECRET",retriability:"safe-to-repeat",
  });
  doesNotMatch(JSON.stringify(malicious),/SECRET|vault\.md|secret-token|secret\/file|owner/i);
  strictEqual(malicious.identity?.runId,"unavailable");
  strictEqual(malicious.retriability,"requires-reconciliation");
});

test("unsupported execution mode and cleanup exceptions return safe evidence without losing observed results",async()=>{
  const scenario=fixture("deterministic");
  const executor={
    executionMode:"live" as const,deviceIdentities:["private-id"],
    async execute(){return {status:"failed" as const,classification:"source-correlation-failed"};},
    async dispose(){throw new Error("Bearer private-token /owner/secret.md");},
  };
  const unsupported=await new DeterministicScenarioRunner({},executor).run(scenario);
  strictEqual(unsupported.status,"failed");
  strictEqual(unsupported.classification,"cleanup-failed");
  strictEqual(unsupported.diagnostic?.phase,"scenario-cleanup");
  strictEqual(unsupported.cleanupDiagnostic?.firstUnconfirmedBoundary,"executor-disposal");
  strictEqual(unsupported.evidence?.machine.verdict.classification,"cleanup-failed");
  doesNotMatch(JSON.stringify(unsupported),/private-token|secret\.md|private-id/);
  const accepted=fixture("live");
  const after=await new DeterministicScenarioRunner({},executor).run(accepted);
  strictEqual(after.status,"failed");
  strictEqual(after.steps[0]?.classification,"source-correlation-failed");
  strictEqual(after.classification,"source-correlation-failed");
  strictEqual(after.cleanupDiagnostic?.classification,"cleanup-failed");
  strictEqual(after.evidence?.machine.verdict.cleanupDiagnostic?.classification,"cleanup-failed");
  strictEqual(after.cleanupDiagnostic?.effect,"unknown");
  doesNotMatch(JSON.stringify(after),/private-token|secret\.md|private-id/);
});

test("deterministic child TAP with private error text stays private while preserving failure evidence",async()=>{
  const root=await mkdtemp(join(tmpdir(),"bvp-tap-privacy-"));
  try{
    const resultPath=join(root,"result.json"),tapPath=join(root,"result.tap");
    const cli=join(__dirname,"batteries","run-deterministic-battery.js");
    const child=spawnSync(process.execPath,[cli,"--battery","bvp-private-tap-canary",
      "--result-file",resultPath,"--tap-file",tapPath],{
      encoding:"utf8",env:{...process.env,BVP_PRIVACY_TAP_INJECT:"1"},
    });
    strictEqual(child.status,1);
    const result=JSON.parse(await readFile(resultPath,"utf8"));
    strictEqual(result.result.status,"failed");
    strictEqual(result.result.exitCode,1);
    const tap=await readFile(tapPath,"utf8");
    strictEqual(tap.includes("not ok"),true);
    strictEqual(tap.includes("test-case-1"),true);
    strictEqual(tap.includes("# fail 1"),true);
    strictEqual(tap.includes("not ok 1"),true);
    for(const shared of [child.stdout,child.stderr,tap,JSON.stringify(result)]){
      doesNotMatch(shared,/synthetic-secret-(stderr|stack)|PrivateVault\.txt|Bearer|node:internal|at TestContext/);
    }
  }finally{await rm(root,{recursive:true,force:true});}
});

test("unsupported execution mode reports preflight non-dispatch even when cleanup succeeds",async()=>{
  const unsupported=await new DeterministicScenarioRunner({},{
    executionMode:"live",deviceIdentities:["private-device"],
    async execute(){throw new Error("must never execute");},
    async dispose(){},
  }).run(fixture("deterministic"));
  strictEqual(unsupported.status,"unsupported");
  strictEqual(unsupported.classification,"execution-mode-not-applicable");
  strictEqual(unsupported.diagnostic?.phase,"execution-mode-preflight");
  strictEqual(unsupported.diagnostic?.effect,"none-confirmed");
  strictEqual(unsupported.diagnostic?.firstUnconfirmedBoundary,"scenario-mode-dispatch");
  doesNotMatch(JSON.stringify(unsupported),/private-device/);
});

test("virtual device disposal failure preserves a completed observation and returns safe failed evidence",async()=>{
  const result=await new DeterministicScenarioRunner({
    async observe(_step,context){
      const device=await context.device("device-a");
      (device as any).dispose=async()=>{throw new Error("Bearer synthetic-cleanup-secret /vault/secret.md");};
      return {status:"completed",value:{status:"present"}};
    },
  }).run(fixture("deterministic"));
  strictEqual(result.steps[0]?.status,"completed");
  strictEqual(result.status,"failed");
  strictEqual(result.classification,"cleanup-failed");
  strictEqual(result.cleanupDiagnostic?.firstUnconfirmedBoundary,"device-disposal");
  strictEqual(result.cleanupDiagnostic?.effect,"unknown");
  strictEqual(result.evidence?.machine.verdict.cleanupDiagnostic?.classification,"cleanup-failed");
  doesNotMatch(JSON.stringify(result),/synthetic-cleanup-secret|secret\.md/);
});
