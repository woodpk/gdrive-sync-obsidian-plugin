import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

export type Phase5EvidenceStatus = "automated" | "platform-blocked" | "live-unavailable";
export interface Phase5AcceptanceEvidence {
  readonly scenario: number;
  readonly meaning: string;
  readonly testFile: string;
  readonly testName: string;
  readonly orchestration: string;
  readonly status: Phase5EvidenceStatus;
  readonly supporting?: readonly { testFile: string; testName: string }[];
}

const automated = (
  scenario: number,
  meaning: string,
  testFile: string,
  testName: string,
  orchestration: string,
  supporting?: readonly { testFile: string; testName: string }[],
): Phase5AcceptanceEvidence => ({ scenario, meaning, testFile, testName, orchestration, status: "automated", supporting });

export const PHASE5_ACCEPTANCE_EVIDENCE: readonly Phase5AcceptanceEvidence[] = [
  automated(1, "local-only first synchronization", "test/phase2-planner.test.ts", "fresh local only uploads", "production safe-union planner plus Phase 5 reviewed first-sync and verified upload-create commit", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit" }, { testFile: "test/phase5-product.test.ts", testName: "Phase 5 upload-create carries verified allocated Drive identity into authoritative trusted state" }]),
  automated(2, "remote-only first synchronization", "test/phase2-planner.test.ts", "fresh remote only downloads", "production safe-union planner plus Phase 5 journaled download and authoritative commit", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update" }]),
  automated(3, "identical local/remote first synchronization", "test/phase5-product.test.ts", "Phase 5 first-sync identical no-op carries stable remote version and establishes trusted BASE", "production planner, executor no-op, and crash-safe authoritative state commit"),
  automated(4, "divergent same-path content with no trusted BASE", "test/phase2-planner.test.ts", "divergent no-base collision conflicts", "production planner conflict classification plus Phase 5 unresolved reviewed-plan gate", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 unresolved reviewed synchronization remains partial and cannot open the completion gate" }]),
  automated(5, "automatic synchronization remains disabled until reviewed successful first synchronization", "test/phase5-scheduler-acceptance.test.ts", "first sync incomplete keeps scheduler startup automatic ineligible", "ProductSyncScheduler eligibility plus IntegratedProductController first-sync completion gate", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit" }]),
  automated(6, "additional device requires explicit validated pairing", "test/phase3-drive.test.ts", "managed-root validation detects identity and protocol mismatch", "GoogleDriveAdapter explicit managed-root identity validation consumed by Phase 5 assembly"),
  automated(7, "local edit produces upload/update", "test/phase2-planner.test.ts", "trusted matrix distinguishes local, remote, and concurrent change", "production planner local-change classification plus Phase 5 journaled upload-update", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update" }]),
  automated(8, "remote edit produces download/update", "test/phase2-planner.test.ts", "trusted matrix distinguishes local, remote, and concurrent change", "production planner remote-change classification plus Phase 5 journaled download-update", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update" }]),
  automated(9, "offline operation followed by reconnect and reconciliation", "test/phase5-group-b-scope-transfer.test.ts", "B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit", "IntegratedProductController and ProductSynchronizationExecutor defer transient failure; scheduler/controller later reconciliation path is separately executable", [{ testFile: "test/phase5-group-d-acceptance.test.ts", testName: "Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass" }]),
  automated(10, "clean three-way text merge", "test/phase5-product.test.ts", "Phase 5 clean-text-merge materializes exact canonical SHA-256 merge output and verifies both sides", "ThreeWayConflictResolver plus production executor with two-sided verification"),
  automated(11, "true text conflict preserves alternate versions and surfaces conflict", "test/phase2-conflict.test.ts", "true text conflict preserves complete version references", "production conflict resolver preservation plus Phase 5 conflict surface", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 unresolved reviewed synchronization remains partial and cannot open the completion gate" }]),
  automated(12, "binary conflict preserves alternate versions", "test/phase2-conflict.test.ts", "opaque binary concurrency never uses timestamp winner", "production opaque conflict preservation plus Phase 5 keep-both workflow", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 keep-both creates a local-only conflict copy without assigning the source Drive ID, then next reconciliation plans upload-create" }]),
  automated(13, "user conflict resolution becomes authoritative and propagates normally", "test/phase5-controller.test.ts", "Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update", "IntegratedProductController, ProductSynchronizationExecutor, crash-safe coordinator, and state commit", [{ testFile: "test/phase5-controller.test.ts", testName: "Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update" }]),
  automated(14, "identity-preserving rename or move", "test/phase2-planner.test.ts", "stable remote object ID proves an identity-preserving remote move", "production planner stable identity plus GoogleDriveAdapter ID-preserving move", [{ testFile: "test/phase3-drive.test.ts", testName: "move preserves Drive id and normal deletion uses trash PATCH" }]),
  automated(15, "properly attested ordinary deletion", "test/phase2-planner.test.ts", "attested deletions require trustworthy prior two-sided state", "production deletion authority plus recoverable Drive trash", [{ testFile: "test/phase3-drive.test.ts", testName: "move preserves Drive id and normal deletion uses trash PATCH" }]),
  automated(16, "deletion versus modification preserves modification and surfaces conflict", "test/phase2-planner.test.ts", "delete-vs-modify preserves modification as conflict", "production planner and conflict resolver delete-modify semantics", [{ testFile: "test/phase2-conflict.test.ts", testName: "delete-vs-modify preserves modified side provenance" }]),
  automated(17, "suspicious or mass destruction triggers circuit breaker", "test/phase2-safety-policy.test.ts", "destructive breaker independently detects count, percentage, abnormal divergence, and state integrity signals", "DestructiveSafetyPolicy used by production planning"),
  automated(18, "destructive execution requires checkpoint and exact-plan approval", "test/phase2-safety-policy.test.ts", "review approval is scoped to exact plan and requires a checkpoint", "DestructiveSafetyPolicy approval contract used by controller execution gating"),
  automated(19, "corrupt or missing expected synchronization state enters safe recovery", "test/phase2-state.test.ts", "malformed and truncated state enter recovery", "PersistentSynchronizationStateStore integrity gate plus Phase 5 recovery reconstruction controller", [{ testFile: "test/phase5-recovery-auth.test.ts", testName: "C2 resolving recovery conflicts cannot clear recovery until fresh full reconstruction commits cursor" }]),
  automated(20, "invalid Changes cursor falls back conservatively to full reconciliation", "test/phase3-transport.test.ts", "invalid change cursor is a conservative recovery signal", "Google Drive transport cursor signal consumed by ProductSnapshotAssembler conservative full path"),
  automated(21, "partial remote listing cannot masquerade as complete absence", "test/phase3-drive.test.ts", "partial reconciliation listing never masquerades as complete", "GoogleDriveAdapter completeness evidence plus production planner deletion block", [{ testFile: "test/phase2-planner.test.ts", testName: "uncertain local access and incomplete remote absence cannot authorize deletion" }]),
  automated(22, "unreadable or inaccessible local content cannot masquerade as deletion", "test/phase2-planner-edge.test.ts", "inaccessible and unknown local observations are blocked rather than deletion evidence", "local observation semantics plus production planner"),
  automated(23, "stale long-offline device cannot authorize destructive propagation", "test/phase2-planner.test.ts", "current stale device cannot authorize destructive propagation", "production planner stale-device destructive gate"),
  automated(24, "stale operation precondition invalidates affected work", "test/phase2-execution.test.ts", "stale precondition invalidates affected work before mutation", "CrashSafeExecutionCoordinator precondition gate"),
  automated(25, "remote change during active run invalidates or replans affected work", "test/phase2-state.test.ts", "run coordination serializes writers, cancels future operations, and requests later reconcile", "CoreRunCoordinator change-during-run deferral consumed by IntegratedProductController"),
  automated(26, "local change during active run is deferred and coalesced into a later pass", "test/phase5-group-d-acceptance.test.ts", "Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass", "ProductSyncScheduler, IntegratedProductController, ProductSnapshotAssembler, deterministic planner, ProductSynchronizationExecutor, crash-safe state commit"),
  automated(27, "safe cancellation of active synchronization", "test/phase2-state.test.ts", "run coordination serializes writers, cancels future operations, and requests later reconcile", "CoreRunCoordinator cancellation contract invoked by IntegratedProductController"),
  automated(28, "pause and resume behavior", "test/phase2-state.test.ts", "run coordination serializes writers, cancels future operations, and requests later reconcile", "CoreRunCoordinator pause semantics behind controller pause-resume actions"),
  automated(29, "synchronization serialization within one runtime", "test/phase2-state.test.ts", "run coordination serializes writers, cancels future operations, and requests later reconcile", "CoreRunCoordinator same-runtime writer serialization"),
  automated(30, "cross-instance writer exclusion run lease", "test/phase5-product.test.ts", "Phase 5 Web Locks lease excludes a concurrent live writer and releases cleanly", "production Web Locks RunLeasePort"),
  automated(31, "local filesystem event debounce and coalescing", "test/phase5-scheduler-acceptance.test.ts", "Phase5 scenario 31 local-change debounce coalesces repeated events into one automatic pass", "ProductSyncScheduler production debounce"),
  automated(32, "startup readiness and startup synchronization opportunity", "test/phase5-scheduler-acceptance.test.ts", "Phase5 scenario 32 replays startup opportunity when vault-ready fired before scheduler registration", "local vault readiness replay plus ProductSyncScheduler lifecycle integration"),
  automated(33, "periodic remote reconciliation scheduling", "test/phase5-scheduler-acceptance.test.ts", "Phase5 scenario 33 refresh replaces periodic timer with live cadence", "ProductSyncScheduler production periodic cadence"),
  automated(34, "manual preview followed by execution", "test/phase5-controller.test.ts", "Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit", "IntegratedProductController manual preview, explicit execute-plan, cursor and state commit"),
  automated(35, "automatic synchronization uses same planner and executor path", "test/phase5-group-d-acceptance.test.ts", "Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass", "IntegratedProductController.runAutomatic through production snapshot, planner, executor, coordinator and state store"),
  automated(36, "blocked or approval-required work is not automatically executed", "test/phase5-second-rejection.test.ts", "C1 automatic run cannot execute mixed approval-required plan", "production planner disposition plus IntegratedProductController automatic execution gate"),
  automated(37, "Verify Reconcile Vault performs required reconciliation path", "test/phase5-recovery-auth.test.ts", "C5 only complete full run with candidate cursor signals scope-reconcile completion", "IntegratedProductController verify-reconcile full assembly and cursor commit", [{ testFile: "test/phase5-product.test.ts", testName: "Phase 5 full reconciliation acquires candidate Changes cursor before remote listing" }]),
  automated(38, "authentication revoked", "test/phase5-auth-controller.test.ts", "Phase5 scenario 38 auth revoked after planning surfaces authentication-required and stops run", "IntegratedProductController plus ProductSynchronizationExecutor authentication failure mapping"),
  automated(39, "authenticated account changes or wrong account", "test/phase5-auth-controller.test.ts", "Phase5 scenario 39 wrong account during execution preserves re-pair reason", "IntegratedProductController plus ProductSynchronizationExecutor account-change failure mapping", [{ testFile: "test/phase3-changes.test.ts", testName: "Google account change blocks remote mutation until explicit re-pair" }]),
  automated(40, "expected managed Drive root missing or invalid", "test/phase3-drive.test.ts", "managed-root validation detects identity and protocol mismatch", "GoogleDriveAdapter managed-root validation consumed before Phase 5 planning"),
  automated(41, "quota rate-limit and transient network failure behavior", "test/phase5-group-b-scope-transfer.test.ts", "B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy", "ProductSynchronizationExecutor lazy Drive stream plus IntegratedProductController offline-deferred mapping", [{ testFile: "test/phase5-group-b-scope-transfer.test.ts", testName: "B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit" }, { testFile: "test/phase3-transport.test.ts", testName: "quota exhaustion is structured and not retried destructively" }]),
  automated(42, "disk or write failure preserves existing valid local content", "test/local-failure-semantics.test.ts", "staging write failure leaves an existing destination byte-for-byte intact", "production local atomic staging and replacement adapter"),
  automated(43, "invalid path platform collision or reserved-domain collision isolates affected scope", "test/phase5-group-b-scope-transfer.test.ts", "B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable", "ProductSnapshotAssembler path scope plus production planner mixed safe-blocked disposition", [{ testFile: "test/local-policy.test.ts", testName: "path validation blocks case-only collisions" }]),
  automated(44, "repeated individual-path failure remains isolated from unrelated work", "test/phase5-group-b-scope-transfer.test.ts", "B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable", "production path-local failure classification and mixed-plan isolation"),
  automated(45, "real synchronization activity produces bounded audit history evidence", "test/phase5-product.test.ts", "Phase 5 audit history is bounded and stores only frozen metadata records", "BoundedAuditHistory production persistence and controller projection"),
  automated(46, "audit history remains metadata-only without vault-content leakage", "test/phase5-product.test.ts", "Phase 5 audit history is bounded and stores only frozen metadata records", "BoundedAuditHistory frozen metadata records and diagnostic projection"),
  automated(47, "notifications occur only for meaningful conditions", "test/phase5-group-d-acceptance.test.ts", "Phase5 scenario 47 notification policy emits only material user-actionable conditions", "production meaningfulNotification policy over ProductSurfaceState"),
  automated(48, "selective portable Obsidian configuration synchronization", "test/local-policy.test.ts", "selective configuration policy is explicit and unknown-excluded by default", "production configuration classifier plus reserved portable-config Drive domain", [{ testFile: "test/phase5-second-rejection.test.ts", testName: "C4 reserved ordinary vault content cannot alias real configuration" }]),
  automated(49, "canonical external BRAIN asset repository remains outside synchronization scope", "test/phase5-group-d-acceptance.test.ts", "Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root", "ProductSnapshotAssembler plus deterministic planner constrained to validated paired managed root"),
  automated(50, "disable unload or deauthorization does not delete synchronized content", "test/phase5-scheduler-acceptance.test.ts", "Phase5 scenario 50 unload requests cancellation and scheduler teardown is non-mutating", "ProductSyncScheduler lifecycle teardown plus controller cancellation and non-destructive local adapter disposal", [{ testFile: "test/obsidian-local-vault.test.ts", testName: "dispose emits unload without deleting local content" }]),
] as const;

test("Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50", async () => {
  assert.equal(PHASE5_ACCEPTANCE_EVIDENCE.length, 50);
  assert.deepEqual(PHASE5_ACCEPTANCE_EVIDENCE.map(row => row.scenario), Array.from({ length: 50 }, (_, index) => index + 1));
  const cache = new Map<string, string>();
  const verifyReference = async (scenario: number, testFile: string, testName: string) => {
    assert.match(testFile, /^test\/.+\.test\.ts$/, `scenario ${scenario} executable test file`);
    let source = cache.get(testFile);
    if (source === undefined) {
      source = await readFile(testFile, "utf8");
      cache.set(testFile, source);
    }
    assert.ok(source.includes(testName), `scenario ${scenario} exact executable test name missing from ${testFile}: ${testName}`);
  };
  for (const row of PHASE5_ACCEPTANCE_EVIDENCE) {
    assert.ok(row.meaning.length > 8, `scenario ${row.scenario} meaning`);
    assert.ok(row.orchestration.length > 12, `scenario ${row.scenario} orchestration`);
    assert.equal(row.status, "automated", `scenario ${row.scenario} must have automated executable evidence`);
    await verifyReference(row.scenario, row.testFile, row.testName);
    for (const support of row.supporting ?? []) await verifyReference(row.scenario, support.testFile, support.testName);
  }
});
