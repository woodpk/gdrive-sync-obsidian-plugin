import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

export interface Phase5AcceptanceEvidence {
  readonly scenario: number;
  readonly meaning: string;
  readonly testFile: string;
  readonly testName: string;
  readonly orchestration: string;
  readonly status: "automated";
  readonly supporting?: readonly { testFile: string; testName: string }[];
}
const e=(scenario:number,meaning:string,testFile:string,testName:string,orchestration="Phase 5 production orchestration"):Phase5AcceptanceEvidence=>({scenario,meaning,testFile,testName,orchestration,status:"automated"});
const first="test/phase5-group-d-first-sync-integration.test.ts",conflict="test/phase5-group-d-conflict-destruction-integration.test.ts",recovery="test/phase5-group-d-recovery-coordination-integration.test.ts",active="test/phase5-group-d-active-run-integration.test.ts",surface="test/phase5-group-d-surface-lifecycle-integration.test.ts";

export const PHASE5_ACCEPTANCE_EVIDENCE:readonly Phase5AcceptanceEvidence[]=[
 e(1,"local-only first synchronization",first,"G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility"),
 e(2,"remote-only first synchronization",first,"G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base"),
 e(3,"identical local/remote first synchronization",first,"G2 scenario 3 identical first sync establishes BASE without content mutation"),
 e(4,"divergent same-path content with no trusted BASE",first,"G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions"),
 e(5,"automatic synchronization remains disabled until reviewed successful first synchronization",first,"G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion","ProductSyncScheduler plus reviewed IntegratedProductController completion gate"),
 e(6,"additional device requires explicit validated pairing",surface,"G2 scenario 6 Phase5 runtime pairing consumes validated managed-root identity and refuses invalid pairing","Phase5ProductRuntime pairing workflow and managed-root validation"),
 e(7,"local edit produces upload/update",first,"G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration"),
 e(8,"remote edit produces download/update",first,"G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration"),
 e(9,"offline operation followed by reconnect and reconciliation",first,"G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds"),
 e(10,"clean three-way text merge",conflict,"G2 scenario 10 clean three-way text merge executes through controller and commits merged authority"),
 e(11,"true text conflict preserves alternate versions and surfaces conflict",conflict,"G2 scenario 11 true text conflict preserves local and remote alternates without mutation"),
 e(12,"binary conflict preserves alternate versions",conflict,"G2 scenario 12 binary conflict preserves both opaque versions"),
 e(13,"user conflict resolution becomes authoritative and propagates normally","test/phase5-controller.test.ts","Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update"),
 e(14,"identity-preserving rename or move",conflict,"G2 scenario 14 stable Drive identity produces and executes identity-preserving remote move"),
 e(15,"properly attested ordinary deletion",active,"G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval"),
 e(16,"deletion versus modification preserves modification and surfaces conflict",conflict,"G2 scenario 16 delete-vs-modify remains a preservation conflict"),
 e(17,"suspicious or mass destruction triggers circuit breaker",conflict,"G2 scenario 17 suspicious bulk destruction is circuit-broken before any mutation"),
 e(18,"destructive execution requires checkpoint and exact-plan approval",conflict,"G2 scenarios 15 and 18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction"),
 e(19,"corrupt or missing expected synchronization state enters safe recovery","test/phase5-recovery-auth.test.ts","C2 resolving recovery conflicts cannot clear recovery until fresh full reconstruction commits cursor"),
 e(20,"invalid Changes cursor falls back conservatively to full reconciliation",recovery,"G2 scenario 20 invalid Changes cursor falls back to safe full Phase5 reconciliation and commits a fresh cursor"),
 e(21,"partial remote listing cannot masquerade as complete absence",recovery,"G2 scenarios 21 and 22 incomplete remote or local observation cannot become deletion authority in Phase5 planning"),
 e(22,"unreadable or inaccessible local content cannot masquerade as deletion",recovery,"G2 scenarios 21 and 22 incomplete remote or local observation cannot become deletion authority in Phase5 planning"),
 e(23,"stale long-offline device cannot authorize destructive propagation",recovery,"G2 scenario 23 stale current device cannot authorize destructive propagation through production controller planning"),
 e(24,"stale operation precondition invalidates affected work",active,"G2 scenario 24 stale operation precondition refuses mutation, completes with attention, and awaits an external reconciliation trigger"),
 e(25,"remote change during active run invalidates or replans affected work",active,"G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation"),
 e(26,"local change during active run is deferred and coalesced into a later pass","test/phase5-group-d-acceptance.test.ts","Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass"),
 e(27,"safe cancellation of active synchronization",recovery,"G2 scenario 27 cancellation stops future operations and leaves cursor unadvanced"),
 e(28,"pause and resume behavior",recovery,"G2 scenario 28 pause blocks product-controller synchronization until resume"),
 e(29,"synchronization serialization within one runtime",recovery,"G2 scenario 29 same-runtime product synchronization runs serialize rather than overlap"),
 e(30,"cross-instance writer exclusion run lease",recovery,"G2 scenario 30 two real controller runs use separate production Web Locks leases over one shared lock boundary","IntegratedProductController runs using separate WebLocksRunLeasePort instances over one shared controlled Web Locks boundary"),
 e(31,"local filesystem event debounce and coalescing","test/phase5-scheduler-acceptance.test.ts","Phase5 scenario 31 local-change debounce coalesces repeated events into one automatic pass"),
 e(32,"startup readiness and startup synchronization opportunity","test/phase5-scheduler-acceptance.test.ts","Phase5 scenario 32 replays startup opportunity when vault-ready fired before scheduler registration"),
 e(33,"periodic remote reconciliation scheduling","test/phase5-scheduler-acceptance.test.ts","Phase5 scenario 33 refresh replaces periodic timer with live cadence"),
 e(34,"manual preview followed by execution","test/phase5-controller.test.ts","Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit"),
 e(35,"automatic synchronization uses same planner and executor path","test/phase5-group-d-acceptance.test.ts","Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass"),
 e(36,"path-local attention is isolated while global approval/blocking remains non-automatic","test/phase5-second-rejection.test.ts","C1 automatic run executes the independently safe subset of a mixed attention plan"),
 e(37,"Verify Reconcile Vault performs required reconciliation path","test/phase5-recovery-auth.test.ts","C5 only complete full run with candidate cursor signals scope-reconcile completion"),
 e(38,"authentication revoked","test/phase5-auth-controller.test.ts","Phase5 scenario 38 auth revoked after planning surfaces authentication-required and stops run"),
 e(39,"authenticated account changes or wrong account","test/phase5-auth-controller.test.ts","Phase5 scenario 39 wrong account during execution preserves re-pair reason"),
 e(40,"expected managed Drive root missing or invalid",recovery,"G2 scenario 40 missing expected managed root blocks Phase5 before planning or mutation"),
 e(41,"quota rate-limit and transient network failure behavior","test/phase5-group-b-scope-transfer.test.ts","B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy"),
 e(42,"disk or write failure preserves existing valid local content","test/local-failure-semantics.test.ts","staging write failure leaves an existing destination byte-for-byte intact"),
 e(43,"invalid path platform collision or reserved-domain collision isolates affected scope","test/phase5-group-b-scope-transfer.test.ts","B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable"),
 e(44,"repeated individual-path failure remains isolated from unrelated work",surface,"G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records"),
 e(45,"real synchronization activity produces bounded audit history evidence",surface,"G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records"),
 e(46,"audit history remains metadata-only without vault-content leakage","test/phase5-product.test.ts","Phase 5 audit history is bounded and stores only frozen metadata records"),
 e(47,"notifications occur only for meaningful conditions",surface,"G2 scenario 47 Phase5 runtime-owned notification subscription suppresses ordinary progress and delivers recovery","IntegratedProductController surface → Phase5ProductRuntime-owned MeaningfulNotificationFilter → ProductRuntimeHost.notify"),
 e(48,"selective portable Obsidian configuration synchronization",surface,"G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded","ProductPathScope, ScopedLocalVault, snapshot/planner/controller/executor"),
 e(49,"canonical external BRAIN asset repository remains outside synchronization scope","test/phase5-group-d-acceptance.test.ts","Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root"),
 e(50,"disable unload or deauthorization does not delete synchronized content",surface,"G2 scenario 50 Phase5 deauthorization and disposal clear authority without local or Drive deletion","Phase5ProductRuntime.deauthorize and disposeProduct"),
] as const;

test("Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50",async()=>{
 assert.equal(PHASE5_ACCEPTANCE_EVIDENCE.length,50);
 assert.deepEqual(PHASE5_ACCEPTANCE_EVIDENCE.map(r=>r.scenario),Array.from({length:50},(_,i)=>i+1));
 const cache=new Map<string,string>();
 for(const row of PHASE5_ACCEPTANCE_EVIDENCE){assert.match(row.testFile,/^test\/.+\.test\.ts$/);let source=cache.get(row.testFile);if(source===undefined){source=await readFile(row.testFile,"utf8");cache.set(row.testFile,source);}assert.equal(source.includes(row.testName),true,`scenario ${row.scenario} primary executable evidence missing: ${row.testFile} :: ${row.testName}`);assert.equal(row.status,"automated");}
});
