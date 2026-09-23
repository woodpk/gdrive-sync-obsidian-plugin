# Phase 6 H6C Local Verification Evidence

- Agent: agt-ca-p6-h6c-production-diagnostic-correlation-01
- Exact base: c6daa20ad287f395a99cf88943465a9ecc3159dd
- H6C validation implementation HEAD: dc0d44aa2dd2fc0f7f7abafb0b15eca3029b559b
- Required branch: phase6-h6c-production-diagnostic-correlation
- Verifier repository root: D:\obsidian-brain-dev
- GitHub Actions: **NOT USED**
- PHX-CI: **NOT RUN**
- Physical Google Drive validation: **NOT RUN**

- Verification HEAD: d2f020b994fa12c6f241e9f391db7ce87c66af75
- Current branch: phase6-h6c-production-diagnostic-correlation
PASS: branch = phase6-h6c-production-diagnostic-correlation
PASS: verification HEAD matches origin required branch = d2f020b994fa12c6f241e9f391db7ce87c66af75
PASS: merge base = c6daa20ad287f395a99cf88943465a9ecc3159dd

## H6C validation implementation pin
PASS: H6C validation implementation commit is an ancestor of verification HEAD: dc0d44aa2dd2fc0f7f7abafb0b15eca3029b559b
PASS: no src/** files changed after the H6C validation implementation HEAD.
PASS: reviewed product-controller-base.ts blob = 876d30eec5eb36ca16fee375581c85f3c7a5fa16
PASS: current committed product-controller-base.ts blob = 876d30eec5eb36ca16fee375581c85f3c7a5fa16
PASS: current working product-controller-base.ts blob = 876d30eec5eb36ca16fee375581c85f3c7a5fa16
PASS: no unstaged src/** working-tree drift.
PASS: no staged src/** working-tree drift.
PASS: src/** has no staged, unstaged, or untracked files before verification.

## Archive gate
PASS: base Git blob = fee7c40e715d277cea2b5e26059a86753bb316a0
PASS: committed archive Git blob = fee7c40e715d277cea2b5e26059a86753bb316a0
PASS: archive/base canonical blob equality = fee7c40e715d277cea2b5e26059a86753bb316a0
PASS: canonical base Git-object SHA-256 = 55433da9a69d750be7aeb5cb5e6ffa77fa6ea28ba06c10fcbc81e8feab190750
PASS: canonical archive Git-object SHA-256 = 55433da9a69d750be7aeb5cb5e6ffa77fa6ea28ba06c10fcbc81e8feab190750

## Scope and frozen-source checks
CHANGED: dev/_ca-output.md
CHANGED: dev/agents/st2a/ph6/h6c/archive/manifest.md
CHANGED: dev/agents/st2a/ph6/h6c/archive/product-controller-base.ts.pre-h6c-c6daa20.snapshot
CHANGED: dev/scripts/verify-h6c-production-diagnostic-correlation.ps1
CHANGED: src/diagnostics/production-diagnostic-correlation.ts
CHANGED: src/product/product-controller-base.ts
CHANGED: src/validation/driver-plan-fault-verifier-contracts.ts
CHANGED: src/validation/production-diagnostic-correlation.ts
CHANGED: src/validation/production-path-driver.ts
CHANGED: src/validation/state-convergence-verifier.ts
CHANGED: src/validation/validation-mode-runtime.ts
CHANGED: test/phase6-h6c-production-diagnostic-correlation.test.ts
CHANGED: test/validation-c03-ios-update-windows-download.test.ts
CHANGED: test/validation-c04-ios-move-windows-move-correction.test.ts
CHANGED: test/validation-c05-ios-delete-windows-trash.test.ts
CHANGED: test/validation-c06-h6b-registration.test.ts
CHANGED: test/validation-c07-windows-update-ios-download.test.ts
CHANGED: test/validation-c08-windows-move-ios-move.test.ts
CHANGED: test/validation-c09-windows-delete-ios-trash.test.ts
CHANGED: test/validation-driver-plan-fault-verifier-contracts.test.ts
CHANGED: test/validation-mode-runtime-canary.test.ts
CHANGED: test/validation-mode-runtime-plan-handoff.test.ts
CHANGED: test/validation-production-diagnostic-fixture.ts
CHANGED: test/validation-production-path-driver.test.ts
CHANGED: test/validation-state-convergence-verifier.test.ts
PASS: no changes under src/core, src/drive, src/local, or src/state.
PASS: product-source modification is limited to src/product/product-controller-base.ts.
PASS: production source contains no archive reference.

## Archive-based production diff
diff --git a/src/product/product-controller-base.ts b/src/product/product-controller-base.ts
index fee7c40..876d30e 100644
--- a/src/product/product-controller-base.ts
+++ b/src/product/product-controller-base.ts
@@ -34,7 +34,8 @@ import { StateCommitCoordinator } from "../core/commit-coordinator";
 import { AuthorityCompleteExecutionCoordinator, type ExecutionLifecycleStage } from "../core/execution-coordinator";
 import { CoreRunCoordinator, type RunLeasePort } from "../core/run-coordinator";
 import { semanticPlanId, withSemanticOperationId } from "../core/semantic-identifiers";
-import type { DiagnosticLogger, SafeDiagnosticFields } from "../diagnostics/diagnostic-logger";
+import type { DiagnosticEvent, DiagnosticLogger, SafeDiagnosticFields } from "../diagnostics/diagnostic-logger";
+import { ProductionDiagnosticCorrelationTracker, type ProductionDiagnosticCorrelation } from "../diagnostics/production-diagnostic-correlation";
 import { createInitialTrustedState, PersistentSynchronizationStateStore } from "../state/persistent-state-store";
 import { sha256Text } from "../util/sha256";
 import { BoundedAuditHistory } from "./audit-history";
@@ -286,6 +287,7 @@ export class ProductControllerBase implements ProductControlPort {
   private runEvidence?: ExecutorRunEvidence;
   private pendingAutomaticTrigger?: AutomaticTrigger;
   private automaticDrain?: Promise<void>;
+  private readonly diagnosticCorrelation = new ProductionDiagnosticCorrelationTracker();
 
   constructor(private readonly options: ProductControllerOptions) {
     this.runs = new CoreRunCoordinator(options.vaultIdentity, options.deviceIdentity, options.leasePort, options.holderId);
@@ -295,12 +297,19 @@ export class ProductControllerBase implements ProductControlPort {
   onSurface(listener: (surface: ProductSurfaceState) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
   readAuditHistory(): Promise<readonly AuditRecord[]> { return this.options.audit.read(); }
   currentRunEvidence(): ExecutorRunEvidence { if (!this.runEvidence) throw new Error("no active synchronization run evidence"); return this.runEvidence; }
+  currentDiagnosticCorrelation(): ProductionDiagnosticCorrelation | undefined { return this.diagnosticCorrelation.current(); }
+  diagnosticSnapshot(): readonly DiagnosticEvent[] { return this.options.diagnostics?.snapshot() ?? []; }
   pendingDestructiveCheckpoint(): CheckpointId | undefined { return this.planned?.checkpointId; }
   async previewManual(runId = this.options.diagnostics?.beginSyncRun("controller")): Promise<SynchronizationPlan | undefined> {
+    this.diagnosticCorrelation.begin(runId, "manual");
     this.syncInfo(runId, "manual-sync-request-enter", { operation: "preview-manual", trigger: "manual" });
     return this.createPlan("manual", true, true, runId);
   }
-  async previewVerifyReconcile(): Promise<SynchronizationPlan | undefined> { return this.createPlan("verify-reconcile", true, true); }
+  async previewVerifyReconcile(runId = this.options.diagnostics?.beginSyncRun("verify-reconcile")): Promise<SynchronizationPlan | undefined> {
+    this.diagnosticCorrelation.begin(runId, "verify-reconcile");
+    this.syncInfo(runId, "verify-reconcile-request-enter", { operation: "preview-verify-reconcile", trigger: "verify-reconcile" });
+    return this.createPlan("verify-reconcile", true, true, runId);
+  }
   noteChangeDuringRun(): void { this.runs.noteLocalOrRemoteChangeDuringRun(); }
   recordPreviewPresented(planId: SynchronizationPlan["planId"], diagnosticRunId?: number): void {
     const planned = this.planned;
@@ -471,6 +480,7 @@ export class ProductControllerBase implements ProductControlPort {
       let attentionPersistenceFailed = false;
       if (!await this.recordAttentionEntries(attentionOperations(plan).map(operation => this.attentionFor(operation, plan, diagnosticRunId)))) attentionPersistenceFailed = true;
       this.planned = { plan, assembly, checkpointId, reviewed, diagnosticRunId, attentionPersistenceFailed };
+      this.diagnosticCorrelation.bindPlan(diagnosticRunId, plan.planId);
       await this.audit("plan-created", { planId: plan.planId, count: plan.operations.length });
       this.surface = { ...this.surface, planPreview: plan, conflicts: [...this.conflictRegistry.values()].filter(value => value.kind !== "clean-merge") };
 
@@ -721,6 +731,21 @@ export class ProductControllerBase implements ProductControlPort {
     const reviewedFirstSyncResolution = this.reviewedFirstSyncConflictOrigins.get(String(id)) === true;
     const operations = await this.resolutionOperations(id, assessment, resolution, reviewedFirstSyncResolution);
     if (!operations.length) return { status: "rejected", reason: "requested conflict resolution is not applicable to the current preserved versions" };
+    const previewDiagnosticRunId = current.diagnosticRunId;
+    if (
+      previewDiagnosticRunId !== undefined
+      && this.options.diagnostics?.currentSyncRunId() === previewDiagnosticRunId
+    ) {
+      this.syncInfo(previewDiagnosticRunId, "sync-run-cancelled", {
+        stage: "terminal",
+        result: "cancelled",
+        reason: "superseded-by-conflict-resolution",
+      });
+      this.endDiagnosticRun(previewDiagnosticRunId);
+    }
+    const diagnosticRunId = this.options.diagnostics?.beginSyncRun("conflict-resolution");
+    this.diagnosticCorrelation.begin(diagnosticRunId, "conflict-resolution");
+    this.syncInfo(diagnosticRunId, "conflict-resolution-request-enter", { operation: "resolve-conflict", stage: "conflict-resolution" });
     const executionDisposition = "requires-user-approval" as const;
     const recoveryCheckpointRequired = false;
     const resolutionPlan: SynchronizationPlan = {
@@ -728,7 +753,8 @@ export class ProductControllerBase implements ProductControlPort {
       trigger: "manual", operations, executionDisposition, recoveryCheckpointRequired, globalExecutionGate: "none",
     };
     const resolutionAssembly: AssembledPlanningInput = { ...current.assembly, nextCursor: undefined, reconstruction: false };
-    this.planned = { plan: resolutionPlan, assembly: resolutionAssembly, reviewed: false, attentionPersistenceFailed: false };
+    this.planned = { plan: resolutionPlan, assembly: resolutionAssembly, reviewed: false, diagnosticRunId, attentionPersistenceFailed: false };
+    this.diagnosticCorrelation.bindPlan(diagnosticRunId, resolutionPlan.planId);
     if (await this.executePlanned(true) !== "complete") return { status: "rejected", reason: "conflict resolution did not complete authoritatively" };
     this.conflictRegistry.delete(String(id));
     this.reviewedFirstSyncConflictOrigins.delete(String(id));
EXIT CODE: 0

## Production hunk classification
HUNK 1: diagnostic metadata exposure - imports DiagnosticEvent plus the diagnostic correlation tracker/types only.
HUNK 2: diagnostic metadata exposure - adds the non-authoritative in-memory diagnostic correlation tracker field.
HUNK 3: diagnostic run creation + propagation + metadata exposure + diagnostic event emission - exposes read-only correlation/snapshot seams; manual and Verify/Reconcile previews begin diagnostic runs and pass them into existing planning.
HUNK 4: diagnostic run propagation - binds the existing semantic plan ID to the already-created diagnostic run after planning, without changing the plan.
HUNK 5: diagnostic lifecycle termination + diagnostic run creation + propagation + diagnostic event emission - terminates a superseded preview diagnostic scope before conflict resolution, creates the conflict-resolution diagnostic run, and passes only its run ID into the existing resolution-plan execution.
PASS: current src/** is mechanically pinned to H6C validation implementation HEAD dc0d44aa2dd2fc0f7f7abafb0b15eca3029b559b; the production-controller blob is separately pinned to the reviewed H6C production controller.
PASS: reviewed production hunks are confined to the H6C authorized diagnostic-only categories.
PASS: reviewed production hunks do not change planner inputs/outputs, operation selection/order, execution eligibility, mutation calls/results, synchronization authority state, conflict resolution choice semantics, or recovery decisions.

## Correlation-path audit
Manual: previewManual begins the production diagnostic run; createPlan retains the same run ID with the semantic plan; validation binds ValidationRunIdentity + authorityCycleId + diagnosticRunId + planId; asserted execution reuses that exact run ID; terminal proof reads only that run.
Verify/Reconcile: previewVerifyReconcile now has the same diagnostic lifecycle as manual preview and is bound/verified by the same exact run-cycle-plan mechanism.
Conflict resolution: validation retains the exact observed conflict under the originating authority cycle; production closes the superseded preview diagnostic scope, begins a fresh conflict-resolution run, executes the unchanged semantic resolution plan, and validation accepts terminal proof only from that fresh exact run.
Terminal result: inspectExactProductionTerminal requires the exact diagnostic run ID, component sync.controller, stage terminal, one unambiguous terminal event, and a recognized result; state convergence requires sync-run-complete plus exact expected complete/partial result where H6C terminal proof is requested.
Fail-closed: missing, wrong-run, cross-run/cycle, ambiguous, missing-terminal, contradictory, failed, and cancelled cases are covered by focused regressions; request acceptance alone is non-authoritative.

## Dependency install
COMMAND: npm ci

added 16 packages, and audited 17 packages in 4s

found 0 vulnerabilities
EXIT CODE: 0

## Focused test-build preparation
PASS: removed stale .test-build before test TypeScript compilation.

## Test TypeScript compilation
COMMAND: npx tsc -p tsconfig.test.json
EXIT CODE: 0

## Focused H6C/diagnostic/controller/runtime/convergence/mixed-plan/conflict regressions
COMMAND: node --test .test-build/test/phase6-h6c-production-diagnostic-correlation.test.js .test-build/test/validation-production-path-driver.test.js .test-build/test/validation-mode-runtime-plan-handoff.test.js .test-build/test/validation-mode-runtime-canary.test.js .test-build/test/validation-state-convergence-verifier.test.js .test-build/test/phase6-alpha-diagnostic-logging.test.js .test-build/test/phase6-alpha-ios-sync-diagnostics.test.js .test-build/test/product-controller-reconstruction-recovery-r1.test.js .test-build/test/product-controller-uninitialized-first-sync.test.js .test-build/test/validation-c03-ios-update-windows-download.test.js .test-build/test/validation-c04-ios-move-windows-move-correction.test.js .test-build/test/validation-c05-ios-delete-windows-trash.test.js .test-build/test/validation-c06-h6b-registration.test.js .test-build/test/validation-c07-windows-update-ios-download.test.js .test-build/test/validation-c08-windows-move-ios-move.test.js .test-build/test/validation-c09-windows-delete-ios-trash.test.js .test-build/test/phase6-alpha-mixed-plan-isolation.test.js .test-build/test/phase6-a03-first-sync-conflict-resolution-authority.test.js
TAP version 13
# Subtest: C1 reviewed first-sync Keep local crosses only the unresolved-path authority boundary and commits authority after verified mutation
ok 1 - C1 reviewed first-sync Keep local crosses only the unresolved-path authority boundary and commits authority after verified mutation
  ---
  duration_ms: 45.5896
  type: 'test'
  ...
# Subtest: C1 portable app.json Keep local leaves one planner-visible candidate and a clean subsequent plan
ok 2 - C1 portable app.json Keep local leaves one planner-visible candidate and a clean subsequent plan
  ---
  duration_ms: 7.1217
  type: 'test'
  ...
# Subtest: C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation
ok 3 - C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation
  ---
  duration_ms: 2.7269
  type: 'test'
  ...
# Subtest: C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation
    # Subtest: revision
    ok 1 - revision
      ---
      duration_ms: 3.4546
      type: 'test'
      ...
    # Subtest: identity
    ok 2 - identity
      ---
      duration_ms: 2.0637
      type: 'test'
      ...
    1..2
ok 4 - C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation
  ---
  duration_ms: 6.1068
  type: 'test'
  ...
# Subtest: C1 ambiguous duplicate REMOTE identity fails closed before reviewed first-sync mutation
ok 5 - C1 ambiguous duplicate REMOTE identity fails closed before reviewed first-sync mutation
  ---
  duration_ms: 2.8027
  type: 'test'
  ...
# Subtest: C1 symmetric no-BASE Keep remote and Keep both resolutions use the bounded reviewed-conflict authority model
    # Subtest: keep-remote
    ok 1 - keep-remote
      ---
      duration_ms: 10.3656
      type: 'test'
      ...
    # Subtest: keep-both
    ok 2 - keep-both
      ---
      duration_ms: 11.7025
      type: 'test'
      ...
    1..2
ok 6 - C1 symmetric no-BASE Keep remote and Keep both resolutions use the bounded reviewed-conflict authority model
  ---
  duration_ms: 23.2441
  type: 'test'
  ...
# Subtest: C1 manual exact-current-local first-sync resolution succeeds without preexisting path BASE
ok 7 - C1 manual exact-current-local first-sync resolution succeeds without preexisting path BASE
  ---
  duration_ms: 4.2888
  type: 'test'
  ...
# Subtest: C1 ordinary non-conflict upload-update without trusted BASE remains rejected
ok 8 - C1 ordinary non-conflict upload-update without trusted BASE remains rejected
  ---
  duration_ms: 1.2904
  type: 'test'
  ...
# Subtest: C1 post-BASE conflict resolution retains the ordinary exact BASE plus mapping authority path
ok 9 - C1 post-BASE conflict resolution retains the ordinary exact BASE plus mapping authority path
  ---
  duration_ms: 0.7924
  type: 'test'
  ...
# Subtest: C1 durable effect-verified retry recovers the reviewed first-sync update without replaying REMOTE mutation
ok 10 - C1 durable effect-verified retry recovers the reviewed first-sync update without replaying REMOTE mutation
  ---
  duration_ms: 6.7693
  type: 'test'
  ...
# Subtest: C1 genuine first-sync multi-conflict provenance survives synthetic resolution subplans
ok 11 - C1 genuine first-sync multi-conflict provenance survives synthetic resolution subplans
  ---
  duration_ms: 9.3713
  type: 'test'
  ...
# Subtest: C1 fresh trusted-state Verify/Reconcile retains first-sync provenance until durable first-sync completion
ok 12 - C1 fresh trusted-state Verify/Reconcile retains first-sync provenance until durable first-sync completion
  ---
  duration_ms: 12.6261
  type: 'test'
  ...
# Subtest: C1 completed first-sync lifecycle dynamically removes no-BASE bootstrap provenance on a fresh plan
ok 13 - C1 completed first-sync lifecycle dynamically removes no-BASE bootstrap provenance on a fresh plan
  ---
  duration_ms: 2.7907
  type: 'test'
  ...
# Subtest: C1 recovery and reconstruction remain ineligible for reviewed first-sync bootstrap provenance
    # Subtest: recovery-active lifecycle
    ok 1 - recovery-active lifecycle
      ---
      duration_ms: 0.9141
      type: 'test'
      ...
    # Subtest: reconstruction assembly
    ok 2 - reconstruction assembly
      ---
      duration_ms: 0.5713
      type: 'test'
      ...
    1..2
ok 14 - C1 recovery and reconstruction remain ineligible for reviewed first-sync bootstrap provenance
  ---
  duration_ms: 1.8442
  type: 'test'
  ...
# Subtest: C1 missing registered conflict-origin provenance fails closed
ok 15 - C1 missing registered conflict-origin provenance fails closed
  ---
  duration_ms: 1.9762
  type: 'test'
  ...
# Subtest: diagnostic logger level off retains the required severity/detail prefix
ok 16 - diagnostic logger level off retains the required severity/detail prefix
  ---
  duration_ms: 2.5759
  type: 'test'
  ...
# Subtest: diagnostic logger level error retains the required severity/detail prefix
ok 17 - diagnostic logger level error retains the required severity/detail prefix
  ---
  duration_ms: 4.547
  type: 'test'
  ...
# Subtest: diagnostic logger level warn retains the required severity/detail prefix
ok 18 - diagnostic logger level warn retains the required severity/detail prefix
  ---
  duration_ms: 0.4573
  type: 'test'
  ...
# Subtest: diagnostic logger level info retains the required severity/detail prefix
ok 19 - diagnostic logger level info retains the required severity/detail prefix
  ---
  duration_ms: 0.2897
  type: 'test'
  ...
# Subtest: diagnostic logger level debug retains the required severity/detail prefix
ok 20 - diagnostic logger level debug retains the required severity/detail prefix
  ---
  duration_ms: 0.4199
  type: 'test'
  ...
# Subtest: diagnostic logger level trace retains the required severity/detail prefix
ok 21 - diagnostic logger level trace retains the required severity/detail prefix
  ---
  duration_ms: 0.3396
  type: 'test'
  ...
# Subtest: diagnostic logger sequence is monotonic and bounded retention drops oldest while keeping newest
ok 22 - diagnostic logger sequence is monotonic and bounded retention drops oldest while keeping newest
  ---
  duration_ms: 2.4862
  type: 'test'
  ...
# Subtest: diagnostic clear removes records without resetting sequence or attempt identity
ok 23 - diagnostic clear removes records without resetting sequence or attempt identity
  ---
  duration_ms: 0.8257
  type: 'test'
  ...
# Subtest: diagnostic export is deterministic JSON-lines in authoritative sequence order
ok 24 - diagnostic export is deterministic JSON-lines in authoritative sequence order
  ---
  duration_ms: 0.9313
  type: 'test'
  ...
# Subtest: console mirroring follows current level and mirrors only the same sanitized rendered record
ok 25 - console mirroring follows current level and mirrors only the same sanitized rendered record
  ---
  duration_ms: 1.6609
  type: 'test'
  ...
# Subtest: diagnostic field allowlist and sanitization prevent representative OAuth secrets from reaching export
ok 26 - diagnostic field allowlist and sanitization prevent representative OAuth secrets from reaching export
  ---
  duration_ms: 0.881
  type: 'test'
  ...
# Subtest: Info < Debug < Trace by internal decision visibility and execution granularity, not duplicate labels
ok 27 - Info < Debug < Trace by internal decision visibility and execution granularity, not duplicate labels
  ---
  duration_ms: 23.1269
  type: 'test'
  ...
# Subtest: rich Error records preserve safe diagnosis fields at Error-only detail
ok 28 - rich Error records preserve safe diagnosis fields at Error-only detail
  ---
  duration_ms: 0.6775
  type: 'test'
  ...
# Subtest: structured observability vocabulary records every required bounded causal field
ok 29 - structured observability vocabulary records every required bounded causal field
  ---
  duration_ms: 1.9577
  type: 'test'
  ...
# Subtest: new component taxonomy separates transport, semantic Drive, effect, state/CAS, recovery, and bundle surfaces
ok 30 - new component taxonomy separates transport, semantic Drive, effect, state/CAS, recovery, and bundle surfaces
  ---
  duration_ms: 0.6063
  type: 'test'
  ...
# Subtest: diagnostic path key is normalized, deterministic, portable, and opaque
ok 31 - diagnostic path key is normalized, deterministic, portable, and opaque
  ---
  duration_ms: 0.6393
  type: 'test'
  ...
# Subtest: occupant remote object representation is deterministic, unique, sorted, and bounded
ok 32 - occupant remote object representation is deterministic, unique, sorted, and bounded
  ---
  duration_ms: 0.2463
  type: 'test'
  ...
# Subtest: current synchronization run correlation is discoverable and ending one exact run cannot clear another
ok 33 - current synchronization run correlation is discoverable and ending one exact run cannot clear another
  ---
  duration_ms: 0.3525
  type: 'test'
  ...
# Subtest: prior valid persisted events remain loadable without current-run leakage
ok 34 - prior valid persisted events remain loadable without current-run leakage
  ---
  duration_ms: 1.5223
  type: 'test'
  ...
# Subtest: structured privacy boundary drops raw path/body/content fields and redacts authorization and query material
ok 35 - structured privacy boundary drops raw path/body/content fields and redacts authorization and query material
  ---
  duration_ms: 0.5219
  type: 'test'
  ...
# Subtest: diagnostic persistence failure remains non-authoritative and does not throw through flush
ok 36 - diagnostic persistence failure remains non-authoritative and does not throw through flush
  ---
  duration_ms: 0.5998
  type: 'test'
  ...
# Subtest: iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle
ok 37 - iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle
  ---
  duration_ms: 48.259
  type: 'test'
  ...
# Subtest: sync diagnostics preserve plan/execution semantics and never export vault path or content
ok 38 - sync diagnostics preserve plan/execution semantics and never export vault path or content
  ---
  duration_ms: 24.4362
  type: 'test'
  ...
# Subtest: manual sync planning failure is terminal, correlated, and metadata-only
ok 39 - manual sync planning failure is terminal, correlated, and metadata-only
  ---
  duration_ms: 1.2847
  type: 'test'
  ...
# Subtest: preview-presentation exception is sanitized at the preview stage and closes the same run
ok 40 - preview-presentation exception is sanitized at the preview stage and closes the same run
  ---
  duration_ms: 2.7968
  type: 'test'
  ...
# Subtest: stale Execute rejection is Error-level under the original run and later dismissal cancels it
ok 41 - stale Execute rejection is Error-level under the original run and later dismissal cancels it
  ---
  duration_ms: 5.5559
  type: 'test'
  ...
# Subtest: identical semantic plans retain independent explicit diagnostic run ownership
ok 42 - identical semantic plans retain independent explicit diagnostic run ownership
  ---
  duration_ms: 10.4213
  type: 'test'
  ...
# Subtest: precondition throw is Error-level at its exact execution substage and closes the run
ok 43 - precondition throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 13.5667
  type: 'test'
  ...
# Subtest: pending throw is Error-level at its exact execution substage and closes the run
ok 44 - pending throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 10.0079
  type: 'test'
  ...
# Subtest: mutation throw is Error-level at its exact execution substage and closes the run
ok 45 - mutation throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 11.2803
  type: 'test'
  ...
# Subtest: uncertain-journal throw is Error-level at its exact execution substage and closes the run
ok 46 - uncertain-journal throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 13.1297
  type: 'test'
  ...
# Subtest: commit throw is Error-level at its exact execution substage and closes the run
ok 47 - commit throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 7.5118
  type: 'test'
  ...
# Subtest: returned content-mutation failure emits Error evidence rather than Trace-only evidence
ok 48 - returned content-mutation failure emits Error evidence rather than Trace-only evidence
  ---
  duration_ms: 7.2125
  type: 'test'
  ...
# Subtest: run-lease acquisition throw emits a stage-specific terminal Error and closes the run
ok 49 - run-lease acquisition throw emits a stage-specific terminal Error and closes the run
  ---
  duration_ms: 4.2618
  type: 'test'
  ...
# Subtest: mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability
ok 50 - mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability
  ---
  duration_ms: 43.0725
  type: 'test'
  ...
# Subtest: automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers
ok 51 - automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers
  ---
  duration_ms: 44.77
  type: 'test'
  ...
# Subtest: conflict and all-blocked plans isolate affected paths without mutating them
ok 52 - conflict and all-blocked plans isolate affected paths without mutating them
  ---
  duration_ms: 7.378
  type: 'test'
  ...
# Subtest: global recovery and destructive approval gates cannot execute a safe subset automatically
ok 53 - global recovery and destructive approval gates cannot execute a safe subset automatically
  ---
  duration_ms: 4.8639
  type: 'test'
  ...
# Subtest: stale-device destructive work is isolated while independent safe work commits without cursor advancement
ok 54 - stale-device destructive work is isolated while independent safe work commits without cursor advancement
  ---
  duration_ms: 5.3513
  type: 'test'
  ...
# Subtest: ordinary authorized deletion still executes automatically
ok 55 - ordinary authorized deletion still executes automatically
  ---
  duration_ms: 7.4724
  type: 'test'
  ...
# Subtest: partial first-sync safe union commits progress but cannot complete baseline or cursor authority
ok 56 - partial first-sync safe union commits progress but cannot complete baseline or cursor authority
  ---
  duration_ms: 4.795
  type: 'test'
  ...
# Subtest: transient unstable path clears from current attention after a later stable retry
ok 57 - transient unstable path clears from current attention after a later stable retry
  ---
  duration_ms: 12.2042
  type: 'test'
  ...
# Subtest: dependency isolation skips a child of a blocked parent while unrelated work proceeds
ok 58 - dependency isolation skips a child of a blocked parent while unrelated work proceeds
  ---
  duration_ms: 3.1291
  type: 'test'
  ...
# Subtest: attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely
ok 59 - attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely
  ---
  duration_ms: 2.3948
  type: 'test'
  ...
# Subtest: a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it
ok 60 - a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it
  ---
  duration_ms: 8.1615
  type: 'test'
  ...
# Subtest: ledger persistence failure is surfaced but does not roll back authorized safe work
ok 61 - ledger persistence failure is surfaced but does not roll back authorized safe work
  ---
  duration_ms: 5.5103
  type: 'test'
  ...
# Subtest: one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution
ok 62 - one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution
  ---
  duration_ms: 7.1503
  type: 'test'
  ...
# Subtest: serialized plugin repository writes keep per-call immutable payload snapshots
ok 63 - serialized plugin repository writes keep per-call immutable payload snapshots
  ---
  duration_ms: 1.0906
  type: 'test'
  ...
# Subtest: automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets
ok 64 - automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets
  ---
  duration_ms: 10.4712
  type: 'test'
  ...
# Subtest: controller surface emits no premature completion and exactly one terminal mixed-run notice
ok 65 - controller surface emits no premature completion and exactly one terminal mixed-run notice
  ---
  duration_ms: 3.772
  type: 'test'
  ...
# Subtest: notification identity suppresses the same attention but reports changed paths and reasons with identical counts
ok 66 - notification identity suppresses the same attention but reports changed paths and reasons with identical counts
  ---
  duration_ms: 5.3944
  type: 'test'
  ...
# Subtest: startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID
ok 67 - startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID
  ---
  duration_ms: 3.5999
  type: 'test'
  ...
# Subtest: H6C manual and Verify/Reconcile execution bind exact production diagnostic runs and terminal results
ok 68 - H6C manual and Verify/Reconcile execution bind exact production diagnostic runs and terminal results
  ---
  duration_ms: 2.3675
  type: 'test'
  ...
# Subtest: H6C sequential cycles with the same semantic plan ID retain distinct diagnostic runs without contamination
ok 69 - H6C sequential cycles with the same semantic plan ID retain distinct diagnostic runs without contamination
  ---
  duration_ms: 1.0373
  type: 'test'
  ...
# Subtest: H6C a different authority cycle or validation run cannot consume another cycle's observed production run
ok 70 - H6C a different authority cycle or validation run cannot consume another cycle's observed production run
  ---
  duration_ms: 0.3557
  type: 'test'
  ...
# Subtest: H6C conflict resolution binds the observed conflict cycle to a fresh exact production diagnostic run
ok 71 - H6C conflict resolution binds the observed conflict cycle to a fresh exact production diagnostic run
  ---
  duration_ms: 0.6048
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for missing terminal correlation
ok 72 - H6C accepted execution remains unproven for missing terminal correlation
  ---
  duration_ms: 0.534
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for wrong-run terminal correlation
ok 73 - H6C accepted execution remains unproven for wrong-run terminal correlation
  ---
  duration_ms: 0.1808
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for duplicate terminal correlation
ok 74 - H6C accepted execution remains unproven for duplicate terminal correlation
  ---
  duration_ms: 0.3339
  type: 'test'
  ...
# Subtest: H6C exact failed terminal remains distinguishable from successful completion
ok 75 - H6C exact failed terminal remains distinguishable from successful completion
  ---
  duration_ms: 0.8927
  type: 'test'
  ...
# Subtest: H6C exact cancelled terminal remains distinguishable from successful completion
ok 76 - H6C exact cancelled terminal remains distinguishable from successful completion
  ---
  duration_ms: 0.5203
  type: 'test'
  ...
# Subtest: H6C conflict correlation is rejected when the same observed conflict is ambiguous across authority cycles
ok 77 - H6C conflict correlation is rejected when the same observed conflict is ambiguous across authority cycles
  ---
  duration_ms: 0.5884
  type: 'test'
  ...
# Subtest: C1-R1 reconstruction bypasses durable recovery only while persisted canonical state is recovery-required
ok 78 - C1-R1 reconstruction bypasses durable recovery only while persisted canonical state is recovery-required
  ---
  duration_ms: 24.5328
  type: 'test'
  ...
# Subtest: C1 absent new-installation state previews first-sync safe union without persistence, then initializes authority before mutation
ok 79 - C1 absent new-installation state previews first-sync safe union without persistence, then initializes authority before mutation
  ---
  duration_ms: 27.3006
  type: 'test'
  ...
# Subtest: C1-R1 recovery-required reconstruction reaches reviewed planning without preview-time authority recovery or state replacement
ok 80 - C1-R1 recovery-required reconstruction reaches reviewed planning without preview-time authority recovery or state replacement
  ---
  duration_ms: 1.8116
  type: 'test'
  ...
# Subtest: C1 existing trusted authority planning still invokes durable-intent recovery
ok 81 - C1 existing trusted authority planning still invokes durable-intent recovery
  ---
  duration_ms: 2.666
  type: 'test'
  ...
# Subtest: VH16 correction C03 is declarative over fixed H6B preview/assert/execute operations
ok 82 - VH16 correction C03 is declarative over fixed H6B preview/assert/execute operations
  ---
  duration_ms: 3.3101
  type: 'test'
  ...
# Subtest: VH16 correction C03 success runs both exact plans through the real repaired ValidationModeRuntime handoff
ok 83 - VH16 correction C03 success runs both exact plans through the real repaired ValidationModeRuntime handoff
  ---
  duration_ms: 23.9811
  type: 'test'
  ...
# Subtest: VH16 correction C03 unexpected Windows plan fails in the fixed assertion step before Windows execution
ok 84 - VH16 correction C03 unexpected Windows plan fails in the fixed assertion step before Windows execution
  ---
  duration_ms: 3.8558
  type: 'test'
  ...
# Subtest: VH16 correction C03 execution cannot proceed when its fixed assertion-derived authorization is absent
ok 85 - VH16 correction C03 execution cannot proceed when its fixed assertion-derived authorization is absent
  ---
  duration_ms: 2.3679
  type: 'test'
  ...
# Subtest: VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles
ok 86 - VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles
  ---
  duration_ms: 21.8813
  type: 'test'
  ...
# Subtest: VH17 correction C04 unexpected move plan fails in fixed assertion before execution
ok 87 - VH17 correction C04 unexpected move plan fails in fixed assertion before execution
  ---
  duration_ms: 9.0795
  type: 'test'
  ...
# Subtest: VH17 correction C04 rejects delete/create substitution and never executes substituted plan
ok 88 - VH17 correction C04 rejects delete/create substitution and never executes substituted plan
  ---
  duration_ms: 6.4471
  type: 'test'
  ...
# Subtest: VH18 correction registers C05 one-to-one and expresses both fixed authority cycles without caller authorization
ok 89 - VH18 correction registers C05 one-to-one and expresses both fixed authority cycles without caller authorization
  ---
  duration_ms: 2.905
  type: 'test'
  ...
# Subtest: VH18 correction C05 runs destructive preview/assert/authorization/execution only through ValidationModeRuntime and retains exact-object/tombstone assertions
ok 90 - VH18 correction C05 runs destructive preview/assert/authorization/execution only through ValidationModeRuntime and retains exact-object/tombstone assertions
  ---
  duration_ms: 13.0104
  type: 'test'
  ...
# Subtest: VH18 correction unsafe additional destructive plan fails in the fixed assertion step before physical execution
ok 91 - VH18 correction unsafe additional destructive plan fails in the fixed assertion step before physical execution
  ---
  duration_ms: 3.1445
  type: 'test'
  ...
# Subtest: VH18 correction plan expectations bind the exact remote object and reject a same-path destructive plan for the wrong Drive identity
ok 92 - VH18 correction plan expectations bind the exact remote object and reject a same-path destructive plan for the wrong Drive identity
  ---
  duration_ms: 3.2266
  type: 'test'
  ...
# Subtest: VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles
ok 93 - VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles
  ---
  duration_ms: 14.7008
  type: 'test'
  ...
# Subtest: VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution
ok 94 - VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution
  ---
  duration_ms: 3.3962
  type: 'test'
  ...
# Subtest: VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution
ok 95 - VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution
  ---
  duration_ms: 1.8036
  type: 'test'
  ...
# Subtest: VH20 C07 uses real H6B fixed plan handoff for trusted baseline, Windows update, mobile download-update, and exact convergence
ok 96 - VH20 C07 uses real H6B fixed plan handoff for trusted baseline, Windows update, mobile download-update, and exact convergence
  ---
  duration_ms: 19.1375
  type: 'test'
  ...
# Subtest: VH20 C07 unexpected production plan hard-stops in the fixed H6B assertion before any production execution
ok 97 - VH20 C07 unexpected production plan hard-stops in the fixed H6B assertion before any production execution
  ---
  duration_ms: 2.3576
  type: 'test'
  ...
# Subtest: VH20 C07 stale same-cycle re-preview invalidates assertion-derived authorization and hard-stops before execution
ok 98 - VH20 C07 stale same-cycle re-preview invalidates assertion-derived authorization and hard-stops before execution
  ---
  duration_ms: 1.9224
  type: 'test'
  ...
# Subtest: VH20 C07 package keeps the authoritative logical fixture name and C07-only module ownership
ok 99 - VH20 C07 package keeps the authoritative logical fixture name and C07-only module ownership
  ---
  duration_ms: 0.4798
  type: 'test'
  ...
# Subtest: VH21 C08 registers one-to-one and uses four explicit repaired-H6B authority cycles without caller authorization
ok 100 - VH21 C08 registers one-to-one and uses four explicit repaired-H6B authority cycles without caller authorization
  ---
  duration_ms: 1.8697
  type: 'test'
  ...
# Subtest: VH21 C08 deterministically preserves Drive identity, old-path absence, bytes, and unrelated guard through the real H6B route
ok 101 - VH21 C08 deterministically preserves Drive identity, old-path absence, bytes, and unrelated guard through the real H6B route
  ---
  duration_ms: 23.2135
  type: 'test'
  ...
# Subtest: VH21 C08 rejects delete/create substitution before production execution
ok 102 - VH21 C08 rejects delete/create substitution before production execution
  ---
  duration_ms: 5.2245
  type: 'test'
  ...
# Subtest: VH21 C08 hard-stops an unexpected move-plan mutation before production execution
ok 103 - VH21 C08 hard-stops an unexpected move-plan mutation before production execution
  ---
  duration_ms: 4.7205
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 reconstructs full C08 lineage before exact-object Windows and mobile deletion
ok 104 - VH22 C09 correction 02 reconstructs full C08 lineage before exact-object Windows and mobile deletion
  ---
  duration_ms: 23.5699
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 cannot fake starting lineage: completed setup plans and mapping IDs still cannot unlock delete when objective C08-equivalent verification blocks
ok 105 - VH22 C09 correction 02 cannot fake starting lineage: completed setup plans and mapping IDs still cannot unlock delete when objective C08-equivalent verification blocks
  ---
  duration_ms: 6.4095
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 fixed assertion rejects wrong exact Drive object before Windows production trash execution
ok 106 - VH22 C09 correction 02 fixed assertion rejects wrong exact Drive object before Windows production trash execution
  ---
  duration_ms: 6.1799
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 fixed assertion hard-stops unexpected destructive mutation before Windows production execution
ok 107 - VH22 C09 correction 02 fixed assertion hard-stops unexpected destructive mutation before Windows production execution
  ---
  duration_ms: 4.3162
  type: 'test'
  ...
# Subtest: VH15 classifies validation device platforms deterministically
ok 108 - VH15 classifies validation device platforms deterministically
  ---
  duration_ms: 1.2978
  type: 'test'
  ...
# Subtest: VH15 validation mode is disabled by default and cannot touch production or durable harness state
ok 109 - VH15 validation mode is disabled by default and cannot touch production or durable harness state
  ---
  duration_ms: 1.6135
  type: 'test'
  ...
# Subtest: VH15 local canary reaches the real production-path driver only after explicit activation
ok 110 - VH15 local canary reaches the real production-path driver only after explicit activation
  ---
  duration_ms: 7.5455
  type: 'test'
  ...
# Subtest: VH15 unbound sandbox/fault authority fails closed and disabling drops all harness controls
ok 111 - VH15 unbound sandbox/fault authority fails closed and disabling drops all harness controls
  ---
  duration_ms: 1.4463
  type: 'test'
  ...
# Subtest: VH15 validation wrapper does not replace or intercept the ordinary production controller
ok 112 - VH15 validation wrapper does not replace or intercept the ordinary production controller
  ---
  duration_ms: 0.5209
  type: 'test'
  ...
# Subtest: VH15-R2 T1/T2 exact preview handoff reaches assertion and fixed execution with the observed plan ID
ok 113 - VH15-R2 T1/T2 exact preview handoff reaches assertion and fixed execution with the observed plan ID
  ---
  duration_ms: 11.0615
  type: 'test'
  ...
# Subtest: VH15-R2 T3 plan mismatch hard-stops before production execution
ok 114 - VH15-R2 T3 plan mismatch hard-stops before production execution
  ---
  duration_ms: 1.2887
  type: 'test'
  ...
# Subtest: VH15-R2 T4 execution without successful assertion fails closed
ok 115 - VH15-R2 T4 execution without successful assertion fails closed
  ---
  duration_ms: 0.538
  type: 'test'
  ...
# Subtest: VH15-R2 T5 a newer preview invalidates prior authorization for the same cycle
ok 116 - VH15-R2 T5 a newer preview invalidates prior authorization for the same cycle
  ---
  duration_ms: 1.1515
  type: 'test'
  ...
# Subtest: VH15-R2 T6 retained authority for run A cannot be consumed by run B
ok 117 - VH15-R2 T6 retained authority for run A cannot be consumed by run B
  ---
  duration_ms: 2.3864
  type: 'test'
  ...
# Subtest: VH15-R2 T7 two independent cycles in one run execute only their own asserted plans
ok 118 - VH15-R2 T7 two independent cycles in one run execute only their own asserted plans
  ---
  duration_ms: 1.7263
  type: 'test'
  ...
# Subtest: VH15-R2 T8 composition recreation drops handoff authority and resumed execution fails closed
ok 119 - VH15-R2 T8 composition recreation drops handoff authority and resumed execution fails closed
  ---
  duration_ms: 4.6317
  type: 'test'
  ...
# Subtest: H6B runtime delegates resolve-observed-conflict through the fixed production path using observed identity
ok 120 - H6B runtime delegates resolve-observed-conflict through the fixed production path using observed identity
  ---
  duration_ms: 3.067
  type: 'test'
  ...
# Subtest: H6B runtime preserves production resolve-conflict rejection as BLOCKED
ok 121 - H6B runtime preserves production resolve-conflict rejection as BLOCKED
  ---
  duration_ms: 2.6711
  type: 'test'
  ...
# Subtest: H6B runtime rejects caller conflictId and malformed path, conflict kind, or resolution before production resolution
ok 122 - H6B runtime rejects caller conflictId and malformed path, conflict kind, or resolution before production resolution
  ---
  duration_ms: 3.7673
  type: 'test'
  ...
# Subtest: VH15-R2 T9 production-path-driver remains non-overridable
ok 123 - VH15-R2 T9 production-path-driver remains non-overridable
  ---
  duration_ms: 0.7906
  type: 'test'
  ...
# Subtest: VH15-R2 T10 default-off isolation and platform classification remain intact
ok 124 - VH15-R2 T10 default-off isolation and platform classification remain intact
  ---
  duration_ms: 0.3444
  type: 'test'
  ...
# Subtest: H6C runtime blocks an accepted execute request until the exact production terminal event exists
ok 125 - H6C runtime blocks an accepted execute request until the exact production terminal event exists
  ---
  duration_ms: 0.8435
  type: 'test'
  ...
# Subtest: H6C runtime distinguishes exact failed and cancelled terminals from successful completion
ok 126 - H6C runtime distinguishes exact failed and cancelled terminals from successful completion
  ---
  duration_ms: 3.287
  type: 'test'
  ...
# Subtest: VH06 driver delegates planning, Verify/Reconcile, automatic sync, cancellation, status, and lifecycle observation to production seams
ok 127 - VH06 driver delegates planning, Verify/Reconcile, automatic sync, cancellation, status, and lifecycle observation to production seams
  ---
  duration_ms: 3.069
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict delegates only the exact production conflict observed for the same run
ok 128 - H6B resolve-observed-conflict delegates only the exact production conflict observed for the same run
  ---
  duration_ms: 1.4213
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict fails closed for wrong run, path, kind, ambiguity, and stale current surface
ok 129 - H6B resolve-observed-conflict fails closed for wrong run, path, kind, ambiguity, and stale current surface
  ---
  duration_ms: 0.8383
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict preserves production rejection and never converts request acceptance into convergence proof
ok 130 - H6B resolve-observed-conflict preserves production rejection and never converts request acceptance into convergence proof
  ---
  duration_ms: 0.3893
  type: 'test'
  ...
# Subtest: VH06 asserted execution is run-bound, must reference a plan observed by the driver, and never manufactures production success
ok 131 - VH06 asserted execution is run-bound, must reference a plan observed by the driver, and never manufactures production success
  ---
  duration_ms: 0.6445
  type: 'test'
  ...
# Subtest: VH06 preserves production rejection and failure instead of converting either into success
ok 132 - VH06 preserves production rejection and failure instead of converting either into success
  ---
  duration_ms: 0.6018
  type: 'test'
  ...
# Subtest: VH06 delegates a reviewed manual plan through the real ProductController authoritative execute-plan path
ok 133 - VH06 delegates a reviewed manual plan through the real ProductController authoritative execute-plan path
  ---
  duration_ms: 12.6019
  type: 'test'
  ...
# Subtest: VH08 PASS requires complete authoritative local/remote/state/diagnostic and convergence proof
ok 134 - VH08 PASS requires complete authoritative local/remote/state/diagnostic and convergence proof
  ---
  duration_ms: 11.2954
  type: 'test'
  ...
# Subtest: missing completeness/terminal proof is BLOCKED, never PASS
ok 135 - missing completeness/terminal proof is BLOCKED, never PASS
  ---
  duration_ms: 0.5829
  type: 'test'
  ...
# Subtest: concrete byte mismatch is FAIL and dominates an unrelated BLOCKED convergence proof
ok 136 - concrete byte mismatch is FAIL and dominates an unrelated BLOCKED convergence proof
  ---
  duration_ms: 0.7438
  type: 'test'
  ...
# Subtest: read-source types do not expose production mutation authority
ok 137 - read-source types do not expose production mutation authority
  ---
  duration_ms: 0.1348
  type: 'test'
  ...
# Subtest: H6C terminal production proof requires an exact diagnostic run ID and never falls back to latest event
ok 138 - H6C terminal production proof requires an exact diagnostic run ID and never falls back to latest event
  ---
  duration_ms: 1.4352
  type: 'test'
  ...
# Subtest: H6C failed or cancelled exact terminal evidence cannot satisfy required completion
ok 139 - H6C failed or cancelled exact terminal evidence cannot satisfy required completion
  ---
  duration_ms: 1.3658
  type: 'test'
  ...
# Subtest: H6C contradictory or duplicate terminal evidence for the exact run fails closed
ok 140 - H6C contradictory or duplicate terminal evidence for the exact run fails closed
  ---
  duration_ms: 0.8209
  type: 'test'
  ...
1..140
# tests 146
# suites 0
# pass 146
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 843.0082
EXIT CODE: 0

## Typecheck
COMMAND: npm run typecheck

> brain-google-drive-sync@0.1.18 typecheck
> tsc --noEmit

EXIT CODE: 0

## Complete automated test suite
COMMAND: npm test

> brain-google-drive-sync@0.1.18 test
> tsc -p tsconfig.test.json && node --test .test-build/test/*.test.js

TAP version 13
# Subtest: snapshot keeps unsafe uncertainty distinct from confirmed absence
ok 1 - snapshot keeps unsafe uncertainty distinct from confirmed absence
  ---
  duration_ms: 1.2869
  type: 'test'
  ...
# Subtest: plan freezes required operation vocabulary
ok 2 - plan freezes required operation vocabulary
  ---
  duration_ms: 0.8956
  type: 'test'
  ...
# Subtest: Phase 2 can plan without live adapters
ok 3 - Phase 2 can plan without live adapters
  ---
  duration_ms: 0.2162
  type: 'test'
  ...
# Subtest: local port is consumable through mobile-safe fake
ok 4 - local port is consumable through mobile-safe fake
  ---
  duration_ms: 0.2968
  type: 'test'
  ...
# Subtest: local and Drive transfer contracts accept lazy multi-chunk binary content
ok 5 - local and Drive transfer contracts accept lazy multi-chunk binary content
  ---
  duration_ms: 0.7246
  type: 'test'
  ...
# Subtest: Drive contract freezes drive.file and separates auth from identity
ok 6 - Drive contract freezes drive.file and separates auth from identity
  ---
  duration_ms: 0.261
  type: 'test'
  ...
# Subtest: Drive listing can be explicitly partial
ok 7 - Drive listing can be explicitly partial
  ---
  duration_ms: 0.261
  type: 'test'
  ...
# Subtest: state distinguishes new install from expected-state recovery
ok 8 - state distinguishes new install from expected-state recovery
  ---
  duration_ms: 0.209
  type: 'test'
  ...
# Subtest: conflict contract has no newest-wins result
ok 9 - conflict contract has no newest-wins result
  ---
  duration_ms: 0.4219
  type: 'test'
  ...
# Subtest: execution distinguishes every required outcome
ok 10 - execution distinguishes every required outcome
  ---
  duration_ms: 0.507
  type: 'test'
  ...
# Subtest: authoritative commit requires verified durable receipt
ok 11 - authoritative commit requires verified durable receipt
  ---
  duration_ms: 0.2871
  type: 'test'
  ...
# Subtest: status/action surface contains required states and no force-sync
ok 12 - status/action surface contains required states and no force-sync
  ---
  duration_ms: 0.3486
  type: 'test'
  ...
# Subtest: desktop bounded reader reconstructs exact bytes with fixed-position bounded reads and closes the handle
ok 13 - desktop bounded reader reconstructs exact bytes with fixed-position bounded reads and closes the handle
  ---
  duration_ms: 3.8229
  type: 'test'
  ...
# Subtest: desktop bounded reader closes its file handle when a consumer stops early
ok 14 - desktop bounded reader closes its file handle when a consumer stops early
  ---
  duration_ms: 0.5689
  type: 'test'
  ...
# Subtest: desktop bounded reader accepts a zero-byte file without issuing a data read
ok 15 - desktop bounded reader accepts a zero-byte file without issuing a data read
  ---
  duration_ms: 0.398
  type: 'test'
  ...
# Subtest: desktop bounded reader rejects premature EOF and still closes the file handle
ok 16 - desktop bounded reader rejects premature EOF and still closes the file handle
  ---
  duration_ms: 1.0575
  type: 'test'
  ...
# Subtest: desktop bounded reader fails closed on a filesystem read error and closes the handle
ok 17 - desktop bounded reader fails closed on a filesystem read error and closes the handle
  ---
  duration_ms: 0.6114
  type: 'test'
  ...
# Subtest: desktop bounded reader rejects an observation-token change between chunks
ok 18 - desktop bounded reader rejects an observation-token change between chunks
  ---
  duration_ms: 0.7269
  type: 'test'
  ...
# Subtest: desktop bounded reader rejects file-handle metadata mutation after reading
ok 19 - desktop bounded reader rejects file-handle metadata mutation after reading
  ---
  duration_ms: 0.585
  type: 'test'
  ...
# Subtest: bounded desktop read failure remains unknown canonical evidence rather than trusted content
ok 20 - bounded desktop read failure remains unknown canonical evidence rather than trusted content
  ---
  duration_ms: 1.3053
  type: 'test'
  ...
# Subtest: desktop composition hashes canonical SHA-256 through filesystem chunks without resource URL or fetch
ok 21 - desktop composition hashes canonical SHA-256 through filesystem chunks without resource URL or fetch
  ---
  duration_ms: 60.7939
  type: 'test'
  ...
# Subtest: desktop guard permits ordinary files, directories, and not-yet-created targets inside the vault
ok 22 - desktop guard permits ordinary files, directories, and not-yet-created targets inside the vault
  ---
  duration_ms: 16.3479
  type: 'test'
  ...
# Subtest: desktop guard blocks a symlink before traversal can reach an outside target
ok 23 - desktop guard blocks a symlink before traversal can reach an outside target
  ---
  duration_ms: 9.7893
  type: 'test'
  ...
# Subtest: desktop guard treats a Windows-style junction/reparse link indication as blocked
ok 24 - desktop guard treats a Windows-style junction/reparse link indication as blocked
  ---
  duration_ms: 0.8184
  type: 'test'
  ...
# Subtest: desktop guard blocks a non-link reparse/canonical resolution that escapes the vault
ok 25 - desktop guard blocks a non-link reparse/canonical resolution that escapes the vault
  ---
  duration_ms: 0.791
  type: 'test'
  ...
# Subtest: C3-R1 local folder rename propagated to REMOTE completes descendant convergence without duplicate child move
ok 26 - C3-R1 local folder rename propagated to REMOTE completes descendant convergence without duplicate child move
  ---
  duration_ms: 17.192
  type: 'test'
  ...
# Subtest: C3-R1 remote folder rename propagated to LOCAL completes descendant convergence without duplicate child move
ok 27 - C3-R1 remote folder rename propagated to LOCAL completes descendant convergence without duplicate child move
  ---
  duration_ms: 5.3169
  type: 'test'
  ...
# Subtest: confirmed absence remains distinct from read/access failures
ok 28 - confirmed absence remains distinct from read/access failures
  ---
  duration_ms: 5.7695
  type: 'test'
  ...
# Subtest: enumeration reports partial truthfully when a directory listing fails
ok 29 - enumeration reports partial truthfully when a directory listing fails
  ---
  duration_ms: 1.0723
  type: 'test'
  ...
# Subtest: mid-write metadata change is observed as unstable and cannot be read as a stable transfer
ok 30 - mid-write metadata change is observed as unstable and cannot be read as a stable transfer
  ---
  duration_ms: 14.0308
  type: 'test'
  ...
# Subtest: staging write failure leaves an existing destination byte-for-byte intact
ok 31 - staging write failure leaves an existing destination byte-for-byte intact
  ---
  duration_ms: 6.2036
  type: 'test'
  ...
# Subtest: visibility lifecycle emits suspend/resume without starting synchronization or deleting content
ok 32 - visibility lifecycle emits suspend/resume without starting synchronization or deleting content
  ---
  duration_ms: 0.8933
  type: 'test'
  ...
# Subtest: explicit exclusion policy keeps unknown content and excludes visible operational noise
ok 33 - explicit exclusion policy keeps unknown content and excludes visible operational noise
  ---
  duration_ms: 3.024
  type: 'test'
  ...
# Subtest: active configuration directory is a distinct exclusion boundary and is runtime-named
ok 34 - active configuration directory is a distinct exclusion boundary and is runtime-named
  ---
  duration_ms: 1.267
  type: 'test'
  ...
# Subtest: path normalization preserves original spelling while comparisons normalize separators
ok 35 - path normalization preserves original spelling while comparisons normalize separators
  ---
  duration_ms: 1.0072
  type: 'test'
  ...
# Subtest: path validation blocks Windows reserved and invalid names
ok 36 - path validation blocks Windows reserved and invalid names
  ---
  duration_ms: 0.6841
  type: 'test'
  ...
# Subtest: path validation blocks external references and traversal
ok 37 - path validation blocks external references and traversal
  ---
  duration_ms: 0.3249
  type: 'test'
  ...
# Subtest: path validation blocks case-only collisions
ok 38 - path validation blocks case-only collisions
  ---
  duration_ms: 0.167
  type: 'test'
  ...
# Subtest: path validation blocks Unicode-equivalent collisions
ok 39 - path validation blocks Unicode-equivalent collisions
  ---
  duration_ms: 0.3381
  type: 'test'
  ...
# Subtest: path validation preflights conservative Windows-compatible path length
ok 40 - path validation preflights conservative Windows-compatible path length
  ---
  duration_ms: 0.1788
  type: 'test'
  ...
# Subtest: selective configuration policy is explicit and unknown-excluded by default
ok 41 - selective configuration policy is explicit and unknown-excluded by default
  ---
  duration_ms: 2.8059
  type: 'test'
  ...
# Subtest: configuration policy protects secrets device identity and synchronization state
ok 42 - configuration policy protects secrets device identity and synchronization state
  ---
  duration_ms: 1.4754
  type: 'test'
  ...
# Subtest: manifest declares mobile compatibility
ok 43 - manifest declares mobile compatibility
  ---
  duration_ms: 2.173
  type: 'test'
  ...
# Subtest: mobile-required runtime source has no Node/Electron/Windows-only imports
ok 44 - mobile-required runtime source has no Node/Electron/Windows-only imports
  ---
  duration_ms: 156.8371
  type: 'test'
  ...
# Subtest: desktop local adapter is loaded only by a Platform-guarded dynamic import
ok 45 - desktop local adapter is loaded only by a Platform-guarded dynamic import
  ---
  duration_ms: 0.8337
  type: 'test'
  ...
# Subtest: Node filesystem imports are confined to the declared desktop-only modules
ok 46 - Node filesystem imports are confined to the declared desktop-only modules
  ---
  duration_ms: 529.1191
  type: 'test'
  ...
# Subtest: desktop local construction is not imported by the mobile-neutral adapter
ok 47 - desktop local construction is not imported by the mobile-neutral adapter
  ---
  duration_ms: 1.575
  type: 'test'
  ...
# Subtest: frozen payload contracts expose no authentication secret fields
ok 48 - frozen payload contracts expose no authentication secret fields
  ---
  duration_ms: 9.4218
  type: 'test'
  ...
# Subtest: prepared OAuth diagnostic captures the real URL without launching and later launches it once from a fresh call
ok 49 - prepared OAuth diagnostic captures the real URL without launching and later launches it once from a fresh call
  ---
  duration_ms: 2.3714
  type: 'test'
  ...
# Subtest: prepared OAuth diagnostic refuses launch before preparation
ok 50 - prepared OAuth diagnostic refuses launch before preparation
  ---
  duration_ms: 0.2308
  type: 'test'
  ...
# Subtest: prepared OAuth diagnostic restores the browser function when preparation fails
ok 51 - prepared OAuth diagnostic restores the browser function when preparation fails
  ---
  duration_ms: 0.566
  type: 'test'
  ...
# Subtest: enumeration overlaps independent file observations under one cap of four
ok 52 - enumeration overlaps independent file observations under one cap of four
  ---
  duration_ms: 12.6526
  type: 'test'
  ...
# Subtest: every file still receives the second metadata observation and mid-window change remains unstable
ok 53 - every file still receives the second metadata observation and mid-window change remains unstable
  ---
  duration_ms: 2.359
  type: 'test'
  ...
# Subtest: result ordering follows logical traversal order even when observations finish in reverse
ok 54 - result ordering follows logical traversal order even when observations finish in reverse
  ---
  duration_ms: 38.2478
  type: 'test'
  ...
# Subtest: uncertainty ordering remains deterministic when different failures finish in reverse
ok 55 - uncertainty ordering remains deterministic when different failures finish in reverse
  ---
  duration_ms: 1.9848
  type: 'test'
  ...
# Subtest: nested directory traversal shares the same global cap instead of multiplying concurrency
ok 56 - nested directory traversal shares the same global cap instead of multiplying concurrency
  ---
  duration_ms: 27.3594
  type: 'test'
  ...
# Subtest: enumeration still blocks unsafe children, excludes protected subtrees, and invokes no mutation API
ok 57 - enumeration still blocks unsafe children, excludes protected subtrees, and invokes no mutation API
  ---
  duration_ms: 1.6639
  type: 'test'
  ...
# Subtest: same-path same-token read-only reuse replaces each repeated stability window with one live stat
ok 58 - same-path same-token read-only reuse replaces each repeated stability window with one live stat
  ---
  duration_ms: 11.3186
  type: 'test'
  ...
# Subtest: generation invalidation while fast-path stat is pending rejects the stale token
ok 59 - generation invalidation while fast-path stat is pending rejects the stale token
  ---
  duration_ms: 19.7364
  type: 'test'
  ...
# Subtest: observation epoch replacement while fast-path stat is pending cannot return the prior cached proof
ok 60 - observation epoch replacement while fast-path stat is pending cannot return the prior cached proof
  ---
  duration_ms: 29.709
  type: 'test'
  ...
# Subtest: mid-stat generation invalidation rejects before any resource bytes are fetched
ok 61 - mid-stat generation invalidation rejects before any resource bytes are fetched
  ---
  duration_ms: 15.465
  type: 'test'
  ...
# Subtest: create modify and delete events invalidate same-path reusable evidence by generation
ok 62 - create modify and delete events invalidate same-path reusable evidence by generation
  ---
  duration_ms: 46.9813
  type: 'test'
  ...
# Subtest: rename invalidates reusable evidence for both old and new paths
ok 63 - rename invalidates reusable evidence for both old and new paths
  ---
  duration_ms: 27.985
  type: 'test'
  ...
# Subtest: changed stat cannot reuse old evidence and falls back to stale rejection
ok 64 - changed stat cannot reuse old evidence and falls back to stale rejection
  ---
  duration_ms: 30.6669
  type: 'test'
  ...
# Subtest: change after read admission but before byte consumption is detected before fetch
ok 65 - change after read admission but before byte consumption is detected before fetch
  ---
  duration_ms: 30.1613
  type: 'test'
  ...
# Subtest: change during byte streaming remains stale-detected with read-only evidence reuse
ok 66 - change during byte streaming remains stale-detected with read-only evidence reuse
  ---
  duration_ms: 49.6267
  type: 'test'
  ...
# Subtest: replace still performs full live target checks before physical displacement
ok 67 - replace still performs full live target checks before physical displacement
  ---
  duration_ms: 59.4441
  type: 'test'
  ...
# Subtest: reinitialization cannot inherit reusable evidence from a disposed adapter
ok 68 - reinitialization cannot inherit reusable evidence from a disposed adapter
  ---
  duration_ms: 30.3597
  type: 'test'
  ...
# Subtest: enumeration covers text binary hidden and empty folders while separating config/noise
ok 69 - enumeration covers text binary hidden and empty folders while separating config/noise
  ---
  duration_ms: 15.7749
  type: 'test'
  ...
# Subtest: active configuration directory is discovered from runtime rather than assumed .obsidian
ok 70 - active configuration directory is discovered from runtime rather than assumed .obsidian
  ---
  duration_ms: 0.6196
  type: 'test'
  ...
# Subtest: readFile is lazy and reconstructs exact bytes through bounded sequential ranges without readBinary
ok 71 - readFile is lazy and reconstructs exact bytes through bounded sequential ranges without readBinary
  ---
  duration_ms: 42.4282
  type: 'test'
  ...
# Subtest: incremental resource read accepts a streamed HTTP 200 response when the runtime ignores Range
ok 72 - incremental resource read accepts a streamed HTTP 200 response when the runtime ignores Range
  ---
  duration_ms: 3.6951
  type: 'test'
  ...
# Subtest: bounded read rejects malformed partial-content evidence
ok 73 - bounded read rejects malformed partial-content evidence
  ---
  duration_ms: 3.774
  type: 'test'
  ...
# Subtest: expected observation token rejects stale local versions before consumption
ok 74 - expected observation token rejects stale local versions before consumption
  ---
  duration_ms: 7.5809
  type: 'test'
  ...
# Subtest: bounded read detects a source that becomes stale between ranges
ok 75 - bounded read detects a source that becomes stale between ranges
  ---
  duration_ms: 14.718
  type: 'test'
  ...
# Subtest: create consumes multi-chunk content incrementally and preserves opaque bytes
ok 76 - create consumes multi-chunk content incrementally and preserves opaque bytes
  ---
  duration_ms: 3.9634
  type: 'test'
  ...
# Subtest: replace stages content and restores prior valid content if final commit rename fails
ok 77 - replace stages content and restores prior valid content if final commit rename fails
  ---
  duration_ms: 11.1779
  type: 'test'
  ...
# Subtest: createFolder preserves empty directory structure
ok 78 - createFolder preserves empty directory structure
  ---
  duration_ms: 1.7916
  type: 'test'
  ...
# Subtest: move and trash use Obsidian FileManager semantics
ok 79 - move and trash use Obsidian FileManager semantics
  ---
  duration_ms: 12.6287
  type: 'test'
  ...
# Subtest: generic adapter without an external-reference guard fails closed before ordinary path observation
ok 80 - generic adapter without an external-reference guard fails closed before ordinary path observation
  ---
  duration_ms: 1.2299
  type: 'test'
  ...
# Subtest: generic adapter without an external-reference guard blocks create replace move and trash
ok 81 - generic adapter without an external-reference guard blocks create replace move and trash
  ---
  duration_ms: 1.0299
  type: 'test'
  ...
# Subtest: blocked folder subtree makes enumeration partial rather than falsely complete
ok 82 - blocked folder subtree makes enumeration partial rather than falsely complete
  ---
  duration_ms: 4.4577
  type: 'test'
  ...
# Subtest: a listed file that disappears before observation creates exact-path uncertainty only
ok 83 - a listed file that disappears before observation creates exact-path uncertainty only
  ---
  duration_ms: 1.9755
  type: 'test'
  ...
# Subtest: startup changes are suppressed until vault-ready and later create/rename events are truthful
ok 84 - startup changes are suppressed until vault-ready and later create/rename events are truthful
  ---
  duration_ms: 0.7847
  type: 'test'
  ...
# Subtest: dispose emits unload without deleting local content
ok 85 - dispose emits unload without deleting local content
  ---
  duration_ms: 0.3282
  type: 'test'
  ...
# Subtest: resource admission accepts below/at threshold and refuses above before materialization
ok 86 - resource admission accepts below/at threshold and refuses above before materialization
  ---
  duration_ms: 3.2155
  type: 'test'
  ...
# Subtest: unknown-size and combined-over-limit versions never enter materialization
ok 87 - unknown-size and combined-over-limit versions never enter materialization
  ---
  duration_ms: 0.3846
  type: 'test'
  ...
# Subtest: cancellation at admission and materialization never produces partial success
ok 88 - cancellation at admission and materialization never produces partial success
  ---
  duration_ms: 0.8117
  type: 'test'
  ...
# Subtest: cancellation and comparison exhaustion during merge computation return no partial merge
ok 89 - cancellation and comparison exhaustion during merge computation return no partial merge
  ---
  duration_ms: 1.8192
  type: 'test'
  ...
# Subtest: ordinary clean non-overlapping merge remains correct
ok 90 - ordinary clean non-overlapping merge remains correct
  ---
  duration_ms: 0.6823
  type: 'test'
  ...
# Subtest: overlap remains unresolved and preserves complete provenance
ok 91 - overlap remains unresolved and preserves complete provenance
  ---
  duration_ms: 1.0314
  type: 'test'
  ...
# Subtest: BASE-missing and opaque cases preserve both current versions
ok 92 - BASE-missing and opaque cases preserve both current versions
  ---
  duration_ms: 0.6458
  type: 'test'
  ...
# Subtest: multibyte persistence uses exact UTF-8 byte evidence and rejects corrupt canonical-key content
ok 93 - multibyte persistence uses exact UTF-8 byte evidence and rejects corrupt canonical-key content
  ---
  duration_ms: 2.0776
  type: 'test'
  ...
# Subtest: oversized and unknown-size capture paths do not buffer or retain text
ok 94 - oversized and unknown-size capture paths do not buffer or retain text
  ---
  duration_ms: 0.6884
  type: 'test'
  ...
# Subtest: three-way merge accepts independent line edits
ok 95 - three-way merge accepts independent line edits
  ---
  duration_ms: 0.6974
  type: 'test'
  ...
# Subtest: three-way merge rejects overlapping incompatible edits
ok 96 - three-way merge rejects overlapping incompatible edits
  ---
  duration_ms: 0.261
  type: 'test'
  ...
# Subtest: conflict resolver returns clean merge only with BASE LOCAL REMOTE text
ok 97 - conflict resolver returns clean merge only with BASE LOCAL REMOTE text
  ---
  duration_ms: 0.5527
  type: 'test'
  ...
# Subtest: true text conflict preserves complete version references
ok 98 - true text conflict preserves complete version references
  ---
  duration_ms: 0.2964
  type: 'test'
  ...
# Subtest: opaque binary concurrency never uses timestamp winner
ok 99 - opaque binary concurrency never uses timestamp winner
  ---
  duration_ms: 0.2211
  type: 'test'
  ...
# Subtest: delete-vs-modify preserves modified side provenance
ok 100 - delete-vs-modify preserves modified side provenance
  ---
  duration_ms: 0.191
  type: 'test'
  ...
# Subtest: stale precondition invalidates affected work before mutation
ok 101 - stale precondition invalidates affected work before mutation
  ---
  duration_ms: 3.9312
  type: 'test'
  ...
# Subtest: durable verified execution is journaled pending before authoritative success commit
ok 102 - durable verified execution is journaled pending before authoritative success commit
  ---
  duration_ms: 2.5259
  type: 'test'
  ...
# Subtest: uncertain mutation outcome is persisted as uncertain and never authoritative success
ok 103 - uncertain mutation outcome is persisted as uncertain and never authoritative success
  ---
  duration_ms: 2.1764
  type: 'test'
  ...
# Subtest: post-journal stale intent is retired only through an exact durable state transition
ok 104 - post-journal stale intent is retired only through an exact durable state transition
  ---
  duration_ms: 1.8046
  type: 'test'
  ...
# Subtest: failed stale-intent retirement remains globally recoverable and preserves the pending journal
ok 105 - failed stale-intent retirement remains globally recoverable and preserves the pending journal
  ---
  duration_ms: 1.3249
  type: 'test'
  ...
# Subtest: both attested deleted and no-base both absent remain non-destructive no-ops
ok 106 - both attested deleted and no-base both absent remain non-destructive no-ops
  ---
  duration_ms: 6.0002
  type: 'test'
  ...
# Subtest: inaccessible and unknown local observations are blocked rather than deletion evidence
ok 107 - inaccessible and unknown local observations are blocked rather than deletion evidence
  ---
  duration_ms: 2.6444
  type: 'test'
  ...
# Subtest: failed and unknown remote enumeration cannot authorize remote-absence deletion
ok 108 - failed and unknown remote enumeration cannot authorize remote-absence deletion
  ---
  duration_ms: 1.9183
  type: 'test'
  ...
# Subtest: empty folders use entity-kind semantics without requiring file content hashes
ok 109 - empty folders use entity-kind semantics without requiring file content hashes
  ---
  duration_ms: 0.839
  type: 'test'
  ...
# Subtest: fresh local only uploads
ok 110 - fresh local only uploads
  ---
  duration_ms: 5.738
  type: 'test'
  ...
# Subtest: fresh remote only downloads
ok 111 - fresh remote only downloads
  ---
  duration_ms: 0.7539
  type: 'test'
  ...
# Subtest: equal no-base collision is noop
ok 112 - equal no-base collision is noop
  ---
  duration_ms: 0.7253
  type: 'test'
  ...
# Subtest: divergent no-base collision conflicts
ok 113 - divergent no-base collision conflicts
  ---
  duration_ms: 1.3433
  type: 'test'
  ...
# Subtest: trusted matrix distinguishes local, remote, and concurrent change
ok 114 - trusted matrix distinguishes local, remote, and concurrent change
  ---
  duration_ms: 4.4796
  type: 'test'
  ...
# Subtest: clock skew alone never changes classification
ok 115 - clock skew alone never changes classification
  ---
  duration_ms: 1.8833
  type: 'test'
  ...
# Subtest: attested deletions require trustworthy prior two-sided state
ok 116 - attested deletions require trustworthy prior two-sided state
  ---
  duration_ms: 2.4603
  type: 'test'
  ...
# Subtest: delete-vs-modify preserves modification as conflict
ok 117 - delete-vs-modify preserves modification as conflict
  ---
  duration_ms: 1.7439
  type: 'test'
  ...
# Subtest: uncertain local access and incomplete remote absence cannot authorize deletion
ok 118 - uncertain local access and incomplete remote absence cannot authorize deletion
  ---
  duration_ms: 1.4194
  type: 'test'
  ...
# Subtest: missing or corrupt operational state enters recovery planning
ok 119 - missing or corrupt operational state enters recovery planning
  ---
  duration_ms: 1.1491
  type: 'test'
  ...
# Subtest: identity ambiguity is blocked and never guessed
ok 120 - identity ambiguity is blocked and never guessed
  ---
  duration_ms: 0.5888
  type: 'test'
  ...
# Subtest: stable remote object ID proves an identity-preserving remote move
ok 121 - stable remote object ID proves an identity-preserving remote move
  ---
  duration_ms: 0.7889
  type: 'test'
  ...
# Subtest: ambiguous stable remote identity is blocked rather than reassigned
ok 122 - ambiguous stable remote identity is blocked rather than reassigned
  ---
  duration_ms: 0.3004
  type: 'test'
  ...
# Subtest: unique trusted content hash proves local move while duplicate candidates are blocked
ok 123 - unique trusted content hash proves local move while duplicate candidates are blocked
  ---
  duration_ms: 0.555
  type: 'test'
  ...
# Subtest: tombstone plus stale known device blocks resurrection
ok 124 - tombstone plus stale known device blocks resurrection
  ---
  duration_ms: 0.5536
  type: 'test'
  ...
# Subtest: current stale device cannot authorize destructive propagation
ok 125 - current stale device cannot authorize destructive propagation
  ---
  duration_ms: 0.6457
  type: 'test'
  ...
# Subtest: ordinary deletion stays auto-eligible while suspicious deletion requires checkpoint
ok 126 - ordinary deletion stays auto-eligible while suspicious deletion requires checkpoint
  ---
  duration_ms: 1.1923
  type: 'test'
  ...
# Subtest: C3 file-to-folder and folder-to-file transitions relative to BASE are never classified as unchanged or overwrite/delete updates
ok 127 - C3 file-to-folder and folder-to-file transitions relative to BASE are never classified as unchanged or overwrite/delete updates
  ---
  duration_ms: 1.5296
  type: 'test'
  ...
# Subtest: C3 non-empty local folder rename physically moves only the ancestor and records descendant convergence
ok 128 - C3 non-empty local folder rename physically moves only the ancestor and records descendant convergence
  ---
  duration_ms: 1.3134
  type: 'test'
  ...
# Subtest: tombstone retention is bounded but never expires while any known device is stale
ok 129 - tombstone retention is bounded but never expires while any known device is stale
  ---
  duration_ms: 1.7607
  type: 'test'
  ...
# Subtest: device identities are random-source derived and reject all-zero entropy
ok 130 - device identities are random-source derived and reject all-zero entropy
  ---
  duration_ms: 0.8919
  type: 'test'
  ...
# Subtest: destructive breaker independently detects count, percentage, abnormal divergence, and state integrity signals
ok 131 - destructive breaker independently detects count, percentage, abnormal divergence, and state integrity signals
  ---
  duration_ms: 2.7142
  type: 'test'
  ...
# Subtest: review approval is scoped to exact plan and requires a checkpoint
ok 132 - review approval is scoped to exact plan and requires a checkpoint
  ---
  duration_ms: 0.8482
  type: 'test'
  ...
# Subtest: a returning stale current device cannot authorize destructive propagation
ok 133 - a returning stale current device cannot authorize destructive propagation
  ---
  duration_ms: 2.5692
  type: 'test'
  ...
# Subtest: atomic compare-and-swap detects a writer that changes state after the caller reads it
ok 134 - atomic compare-and-swap detects a writer that changes state after the caller reads it
  ---
  duration_ms: 4.961
  type: 'test'
  ...
# Subtest: verified both-deleted transition removes prior base and records a durable both-side tombstone
ok 135 - verified both-deleted transition removes prior base and records a durable both-side tombstone
  ---
  duration_ms: 2.251
  type: 'test'
  ...
# Subtest: journal-only persistence advances CAS revision without advancing semantic authority
ok 136 - journal-only persistence advances CAS revision without advancing semantic authority
  ---
  duration_ms: 6.0043
  type: 'test'
  ...
# Subtest: file BASE healing accepts only current canonical equality and creates exact BASE authority
ok 137 - file BASE healing accepts only current canonical equality and creates exact BASE authority
  ---
  duration_ms: 3.3276
  type: 'test'
  ...
# Subtest: learned Drive batches remain lossless until explicit durable reduction permits retirement
ok 138 - learned Drive batches remain lossless until explicit durable reduction permits retirement
  ---
  duration_ms: 6.9523
  type: 'test'
  ...
# Subtest: crash/restart matrix covers upload, download, moves, and trash at every durable stage
ok 139 - crash/restart matrix covers upload, download, moves, and trash at every durable stage
  ---
  duration_ms: 26.8419
  type: 'test'
  ...
# Subtest: clean merge keeps independently staged effects and cannot complete after only one side commits
ok 140 - clean merge keeps independently staged effects and cannot complete after only one side commits
  ---
  duration_ms: 3.4302
  type: 'test'
  ...
# Subtest: known semantic contradictions and extensible contradictions both fail closed
ok 141 - known semantic contradictions and extensible contradictions both fail closed
  ---
  duration_ms: 0.4161
  type: 'test'
  ...
# Subtest: legacy state is not promoted silently; authority migration backs up before reconstruction
ok 142 - legacy state is not promoted silently; authority migration backs up before reconstruction
  ---
  duration_ms: 1.2505
  type: 'test'
  ...
# Subtest: stale-device registration, aging, clearing, and durable semantic transition gate destructive authority
ok 143 - stale-device registration, aging, clearing, and durable semantic transition gate destructive authority
  ---
  duration_ms: 1.9443
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
ok 144 - v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
  ---
  duration_ms: 1.6542
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
ok 145 - v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
  ---
  duration_ms: 1.0682
  type: 'test'
  ...
# Subtest: v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
ok 146 - v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
  ---
  duration_ms: 1.4716
  type: 'test'
  ...
# Subtest: v1.1 verified folder effect restarts by finishing authoritative state commit
ok 147 - v1.1 verified folder effect restarts by finishing authoritative state commit
  ---
  duration_ms: 1.2265
  type: 'test'
  ...
# Subtest: v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
ok 148 - v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
  ---
  duration_ms: 0.4074
  type: 'test'
  ...
# Subtest: v1.1 journal-only folder updates advance persistence revision without semantic generation
ok 149 - v1.1 journal-only folder updates advance persistence revision without semantic generation
  ---
  duration_ms: 0.9856
  type: 'test'
  ...
# Subtest: explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
ok 150 - explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
  ---
  duration_ms: 2.0708
  type: 'test'
  ...
# Subtest: malformed or inconsistent persisted v1.1 folder journal fails closed
ok 151 - malformed or inconsistent persisted v1.1 folder journal fails closed
  ---
  duration_ms: 1.208
  type: 'test'
  ...
# Subtest: v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
ok 152 - v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
  ---
  duration_ms: 0.6249
  type: 'test'
  ...
# Subtest: LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
ok 153 - LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
  ---
  duration_ms: 13.3272
  type: 'test'
  ...
# Subtest: LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
ok 154 - LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
  ---
  duration_ms: 3.214
  type: 'test'
  ...
# Subtest: LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
ok 155 - LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
  ---
  duration_ms: 3.7255
  type: 'test'
  ...
# Subtest: true new install differs from missing expected state
ok 156 - true new install differs from missing expected state
  ---
  duration_ms: 3.3127
  type: 'test'
  ...
# Subtest: malformed and truncated state enter recovery
ok 157 - malformed and truncated state enter recovery
  ---
  duration_ms: 0.7815
  type: 'test'
  ...
# Subtest: internally inconsistent state is recovery-required even with a valid envelope checksum
ok 158 - internally inconsistent state is recovery-required even with a valid envelope checksum
  ---
  duration_ms: 1.2323
  type: 'test'
  ...
# Subtest: integrity failure and incompatible schema enter recovery
ok 159 - integrity failure and incompatible schema enter recovery
  ---
  duration_ms: 1.9696
  type: 'test'
  ...
# Subtest: clone or restore suspicion is detected from expected device identity
ok 160 - clone or restore suspicion is detected from expected device identity
  ---
  duration_ms: 1.884
  type: 'test'
  ...
# Subtest: stale revision prevents concurrent state overwrite
ok 161 - stale revision prevents concurrent state overwrite
  ---
  duration_ms: 0.6381
  type: 'test'
  ...
# Subtest: change cursor and stale-device metadata round-trip as durable synchronization state
ok 162 - change cursor and stale-device metadata round-trip as durable synchronization state
  ---
  duration_ms: 0.7515
  type: 'test'
  ...
# Subtest: device removal changes only known-device coordination state
ok 163 - device removal changes only known-device coordination state
  ---
  duration_ms: 1.6098
  type: 'test'
  ...
# Subtest: migration assessment is backward-aware and migration creates backup first
ok 164 - migration assessment is backward-aware and migration creates backup first
  ---
  duration_ms: 2.3524
  type: 'test'
  ...
# Subtest: diagnostic export is an explicit metadata projection
ok 165 - diagnostic export is an explicit metadata projection
  ---
  duration_ms: 2.1212
  type: 'test'
  ...
# Subtest: operation journal records checkpointed pending and uncertain work without claiming success
ok 166 - operation journal records checkpointed pending and uncertain work without claiming success
  ---
  duration_ms: 3.5103
  type: 'test'
  ...
# Subtest: verified success is committed only after a matching durable verified receipt and preserves checkpoint provenance
ok 167 - verified success is committed only after a matching durable verified receipt and preserves checkpoint provenance
  ---
  duration_ms: 2.9017
  type: 'test'
  ...
# Subtest: run coordination serializes writers, cancels future operations, and requests later reconcile
ok 168 - run coordination serializes writers, cancels future operations, and requests later reconcile
  ---
  duration_ms: 1.0518
  type: 'test'
  ...
# Subtest: hosted OAuth callback remains content-blind, token-nonpersistent, and history-sanitizing
ok 169 - hosted OAuth callback remains content-blind, token-nonpersistent, and history-sanitizing
  ---
  duration_ms: 1.9025
  type: 'test'
  ...
# Subtest: incomplete callback sanitizes history without preparing or launching a handoff
ok 170 - incomplete callback sanitizes history without preparing or launching a handoff
  ---
  duration_ms: 4.2692
  type: 'test'
  ...
# Subtest: valid authorization-code callback prepares one exact manual target before automatic navigation
ok 171 - valid authorization-code callback prepares one exact manual target before automatic navigation
  ---
  duration_ms: 2.3397
  type: 'test'
  ...
# Subtest: valid OAuth-error callback prepares the same manual and automatic handoff path
ok 172 - valid OAuth-error callback prepares the same manual and automatic handoff path
  ---
  duration_ms: 2.7603
  type: 'test'
  ...
# Subtest: automatic navigation failure remains secret-safe and leaves the direct fallback active
ok 173 - automatic navigation failure remains secret-safe and leaves the direct fallback active
  ---
  duration_ms: 1.8446
  type: 'test'
  ...
# Subtest: managed root creation stamps stable vault identity protocol and portable-config role metadata
ok 174 - managed root creation stamps stable vault identity protocol and portable-config role metadata
  ---
  duration_ms: 46.9544
  type: 'test'
  ...
# Subtest: start cursor and incremental change page retain Drive identity
ok 175 - start cursor and incremental change page retain Drive identity
  ---
  duration_ms: 11.2668
  type: 'test'
  ...
# Subtest: Google account change blocks remote mutation until explicit re-pair
ok 176 - Google account change blocks remote mutation until explicit re-pair
  ---
  duration_ms: 0.7565
  type: 'test'
  ...
# Subtest: workstream A v1.3: lazy authentication failure is public without A-private error knowledge
ok 177 - workstream A v1.3: lazy authentication failure is public without A-private error knowledge
  ---
  duration_ms: 42.9259
  type: 'test'
  ...
# Subtest: workstream A v1.3: lazy transient failure preserves category
ok 178 - workstream A v1.3: lazy transient failure preserves category
  ---
  duration_ms: 1.3295
  type: 'test'
  ...
# Subtest: workstream A v1.3: lazy rate limit preserves exact retry timing
ok 179 - workstream A v1.3: lazy rate limit preserves exact retry timing
  ---
  duration_ms: 1.1928
  type: 'test'
  ...
# Subtest: workstream A v1.3: post-stream remote change exposes public recovery provenance
ok 180 - workstream A v1.3: post-stream remote change exposes public recovery provenance
  ---
  duration_ms: 4.8328
  type: 'test'
  ...
# Subtest: workstream A v1.3: arbitrary errors fabricate no Drive provenance
ok 181 - workstream A v1.3: arbitrary errors fabricate no Drive provenance
  ---
  duration_ms: 0.2993
  type: 'test'
  ...
# Subtest: workstream A v1.3: not-found and conflict stay contextual
ok 182 - workstream A v1.3: not-found and conflict stay contextual
  ---
  duration_ms: 0.5493
  type: 'test'
  ...
# Subtest: workstream A v1.3: outcome-unknown plus rate limit remains physically outcome-unknown
ok 183 - workstream A v1.3: outcome-unknown plus rate limit remains physically outcome-unknown
  ---
  duration_ms: 0.3758
  type: 'test'
  ...
# Subtest: workstream A v1.3: verified-not-applied plus authentication preserves both facts
ok 184 - workstream A v1.3: verified-not-applied plus authentication preserves both facts
  ---
  duration_ms: 0.2596
  type: 'test'
  ...
# Subtest: workstream A v1.3: reliable mutation keeps rate-limited pre-observation physically unknown
ok 185 - workstream A v1.3: reliable mutation keeps rate-limited pre-observation physically unknown
  ---
  duration_ms: 1.8521
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: correct reserved folder returns actual path and parent
ok 186 - workstream A v1.2 recovery: correct reserved folder returns actual path and parent
  ---
  duration_ms: 8.341
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: wrong actual parent is not overwritten from descriptor
ok 187 - workstream A v1.2 recovery: wrong actual parent is not overwritten from descriptor
  ---
  duration_ms: 4.8794
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: wrong structural path is reported as actually observed
ok 188 - workstream A v1.2 recovery: wrong structural path is reported as actually observed
  ---
  duration_ms: 6.2645
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: absent reserved id plus independent path occupant returns occupied
ok 189 - workstream A v1.2 recovery: absent reserved id plus independent path occupant returns occupied
  ---
  duration_ms: 3.2297
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: absence requires reserved-id absence and authoritatively clear target
ok 190 - workstream A v1.2 recovery: absence requires reserved-id absence and authoritatively clear target
  ---
  duration_ms: 4.7794
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: duplicate structural target is unobservable
ok 191 - workstream A v1.2 recovery: duplicate structural target is unobservable
  ---
  duration_ms: 1.903
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: duplicate parent path is unobservable
ok 192 - workstream A v1.2 recovery: duplicate parent path is unobservable
  ---
  duration_ms: 1.968
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: incomplete network/auth observation stays unobservable
ok 193 - workstream A v1.2 recovery: incomplete network/auth observation stays unobservable
  ---
  duration_ms: 0.7742
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: cancellation stays unobservable and performs no mutation
ok 194 - workstream A v1.2 recovery: cancellation stays unobservable and performs no mutation
  ---
  duration_ms: 0.6425
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: descriptor facts alone cannot manufacture observation
ok 195 - workstream A v1.2 recovery: descriptor facts alone cannot manufacture observation
  ---
  duration_ms: 0.7745
  type: 'test'
  ...
# Subtest: workstream A changes: reliable page distinguishes intermediate and terminal tokens without PATCH side effects
ok 196 - workstream A changes: reliable page distinguishes intermediate and terminal tokens without PATCH side effects
  ---
  duration_ms: 9.0899
  type: 'test'
  ...
# Subtest: workstream A changes: malformed Drive token combination fails conservatively
ok 197 - workstream A changes: malformed Drive token combination fails conservatively
  ---
  duration_ms: 2.653
  type: 'test'
  ...
# Subtest: workstream A observation: reconciliation of legacy unstamped objects never PATCHes provenance
ok 198 - workstream A observation: reconciliation of legacy unstamped objects never PATCHes provenance
  ---
  duration_ms: 4.556
  type: 'test'
  ...
# Subtest: workstream A create: lost upload response reconciles same pre-reserved ID
ok 199 - workstream A create: lost upload response reconciles same pre-reserved ID
  ---
  duration_ms: 8.6062
  type: 'test'
  ...
# Subtest: workstream A update: ambiguous candidate creation converges by recoverably retiring the exact predecessor
ok 200 - workstream A update: ambiguous candidate creation converges by recoverably retiring the exact predecessor
  ---
  duration_ms: 25
  type: 'test'
  ...
# Subtest: workstream A move: ambiguous PATCH response is classified from re-observed path
ok 201 - workstream A move: ambiguous PATCH response is classified from re-observed path
  ---
  duration_ms: 5.4037
  type: 'test'
  ...
# Subtest: workstream A trash: ambiguous PATCH response is classified from re-observed trashed state
ok 202 - workstream A trash: ambiguous PATCH response is classified from re-observed trashed state
  ---
  duration_ms: 3.2277
  type: 'test'
  ...
# Subtest: workstream A coherent download: remote revision change during transfer cannot be consumed as coherent success
ok 203 - workstream A coherent download: remote revision change during transfer cannot be consumed as coherent success
  ---
  duration_ms: 1.3896
  type: 'test'
  ...
# Subtest: managed-root validation detects identity and protocol mismatch
ok 204 - managed-root validation detects identity and protocol mismatch
  ---
  duration_ms: 1.9927
  type: 'test'
  ...
# Subtest: partial reconciliation listing never masquerades as complete
ok 205 - partial reconciliation listing never masquerades as complete
  ---
  duration_ms: 1.7077
  type: 'test'
  ...
# Subtest: move preserves Drive id and normal deletion uses trash PATCH
ok 206 - move preserves Drive id and normal deletion uses trash PATCH
  ---
  duration_ms: 5.3435
  type: 'test'
  ...
# Subtest: download is lazy and range-chunked
ok 207 - download is lazy and range-chunked
  ---
  duration_ms: 2.8586
  type: 'test'
  ...
# Subtest: resumable create consumes content incrementally and verifies size
ok 208 - resumable create consumes content incrementally and verifies size
  ---
  duration_ms: 3.6197
  type: 'test'
  ...
# Subtest: OAuth request uses exact drive.file scope, high-entropy state, and PKCE S256
ok 209 - OAuth request uses exact drive.file scope, high-entropy state, and PKCE S256
  ---
  duration_ms: 14.484
  type: 'test'
  ...
# Subtest: OAuth callback rejects mismatched state before token exchange
ok 210 - OAuth callback rejects mismatched state before token exchange
  ---
  duration_ms: 3.271
  type: 'test'
  ...
# Subtest: OAuth token exchange keeps client secret and tokens in SecretStorage
ok 211 - OAuth token exchange keeps client secret and tokens in SecretStorage
  ---
  duration_ms: 39.3098
  type: 'test'
  ...
# Subtest: expired transaction is rejected without exchanging a code
ok 212 - expired transaction is rejected without exchanging a code
  ---
  duration_ms: 1.5797
  type: 'test'
  ...
# Subtest: transient refresh transport failure preserves refresh authority and is classified deferred
ok 213 - transient refresh transport failure preserves refresh authority and is classified deferred
  ---
  duration_ms: 0.94
  type: 'test'
  ...
# Subtest: malformed, 429, and 5xx refresh responses preserve refresh authority
ok 214 - malformed, 429, and 5xx refresh responses preserve refresh authority
  ---
  duration_ms: 3.6962
  type: 'test'
  ...
# Subtest: invalid_grant definitively clears refresh authority
ok 215 - invalid_grant definitively clears refresh authority
  ---
  duration_ms: 1.7612
  type: 'test'
  ...
# Subtest: known rejected access token is invalidated without erasing a valid refresh token
ok 216 - known rejected access token is invalidated without erasing a valid refresh token
  ---
  duration_ms: 0.5205
  type: 'test'
  ...
# Subtest: Obsidian requestUrl bridge posts OAuth form data without browser CORS dependency
ok 217 - Obsidian requestUrl bridge posts OAuth form data without browser CORS dependency
  ---
  duration_ms: 46.1631
  type: 'test'
  ...
# Subtest: Obsidian requestUrl bridge returns Google 4xx bodies instead of collapsing them into exceptions
ok 218 - Obsidian requestUrl bridge returns Google 4xx bodies instead of collapsing them into exceptions
  ---
  duration_ms: 5.0755
  type: 'test'
  ...
# Subtest: transport honors Retry-After with bounded retry
ok 219 - transport honors Retry-After with bounded retry
  ---
  duration_ms: 50.5291
  type: 'test'
  ...
# Subtest: quota exhaustion is structured and not retried destructively
ok 220 - quota exhaustion is structured and not retried destructively
  ---
  duration_ms: 1.629
  type: 'test'
  ...
# Subtest: invalid change cursor is a conservative recovery signal
ok 221 - invalid change cursor is a conservative recovery signal
  ---
  duration_ms: 2.1571
  type: 'test'
  ...
# Subtest: non-idempotent POST is dispatched once when server applies create but response is lost
ok 222 - non-idempotent POST is dispatched once when server applies create but response is lost
  ---
  duration_ms: 0.9999
  type: 'test'
  ...
# Subtest: POST 429 and 5xx are not blindly replayed
ok 223 - POST 429 and 5xx are not blindly replayed
  ---
  duration_ms: 2.618
  type: 'test'
  ...
# Subtest: retry-safe GET still retries transient failures
ok 224 - retry-safe GET still retries transient failures
  ---
  duration_ms: 0.7953
  type: 'test'
  ...
# Subtest: Drive 401 invalidates only access token, refreshes, and retries a safe GET
ok 225 - Drive 401 invalidates only access token, refreshes, and retries a safe GET
  ---
  duration_ms: 2.0209
  type: 'test'
  ...
# Subtest: Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50
ok 226 - Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50
  ---
  duration_ms: 22.916
  type: 'test'
  ...
# Subtest: Phase5 scenario 38 auth revoked after planning surfaces authentication-required and stops run
ok 227 - Phase5 scenario 38 auth revoked after planning surfaces authentication-required and stops run
  ---
  duration_ms: 25.2199
  type: 'test'
  ...
# Subtest: Phase5 scenario 39 wrong account during execution preserves re-pair reason
ok 228 - Phase5 scenario 39 wrong account during execution preserves re-pair reason
  ---
  duration_ms: 6.3566
  type: 'test'
  ...
# Subtest: Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit
ok 229 - Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit
  ---
  duration_ms: 14.2925
  type: 'test'
  ...
# Subtest: Phase 5 unresolved reviewed synchronization remains partial and cannot open the completion gate
ok 230 - Phase 5 unresolved reviewed synchronization remains partial and cannot open the completion gate
  ---
  duration_ms: 9.2579
  type: 'test'
  ...
# Subtest: Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update
ok 231 - Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update
  ---
  duration_ms: 26.7152
  type: 'test'
  ...
# Subtest: Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update
ok 232 - Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update
  ---
  duration_ms: 16.3997
  type: 'test'
  ...
# Subtest: Phase 5 keep-both creates a local-only conflict copy without assigning the source Drive ID, then next reconciliation plans upload-create
ok 233 - Phase 5 keep-both creates a local-only conflict copy without assigning the source Drive ID, then next reconciliation plans upload-create
  ---
  duration_ms: 21.9202
  type: 'test'
  ...
# Subtest: Phase 5 stale conflict resolution is rejected before mutation and requires fresh planning
ok 234 - Phase 5 stale conflict resolution is rejected before mutation and requires fresh planning
  ---
  duration_ms: 3.4439
  type: 'test'
  ...
# Subtest: GROUP A A1 recovery preserves reconstructed trusted state while authority-incomplete conflict mutation remains blocked
ok 235 - GROUP A A1 recovery preserves reconstructed trusted state while authority-incomplete conflict mutation remains blocked
  ---
  duration_ms: 60.5183
  type: 'test'
  ...
# Subtest: B1 external ordinary-vault -> portable-config move is recovery-required, not a domain reclassification
ok 236 - B1 external ordinary-vault -> portable-config move is recovery-required, not a domain reclassification
  ---
  duration_ms: 52.7325
  type: 'test'
  ...
# Subtest: B1 external portable-config -> ordinary-vault move is recovery-required, not a domain reclassification
ok 237 - B1 external portable-config -> ordinary-vault move is recovery-required, not a domain reclassification
  ---
  duration_ms: 5.2535
  type: 'test'
  ...
# Subtest: B2 incremental reconciliation rejects a known stable object moved outside the managed remote after restart
ok 238 - B2 incremental reconciliation rejects a known stable object moved outside the managed remote after restart
  ---
  duration_ms: 2.5341
  type: 'test'
  ...
# Subtest: B2 full reconciliation rejects a provenance-marked managed object moved outside the managed remote
ok 239 - B2 full reconciliation rejects a provenance-marked managed object moved outside the managed remote
  ---
  duration_ms: 3.901
  type: 'test'
  ...
# Subtest: B2 same-session cache cannot convert structural move-out into removal
ok 240 - B2 same-session cache cannot convert structural move-out into removal
  ---
  duration_ms: 7.0725
  type: 'test'
  ...
# Subtest: B1/B2 provenance is scoped to the paired managed root identity
ok 241 - B1/B2 provenance is scoped to the paired managed root identity
  ---
  duration_ms: 2.4912
  type: 'test'
  ...
# Subtest: B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable
ok 242 - B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable
  ---
  duration_ms: 13.9568
  type: 'test'
  ...
# Subtest: B4 authentication revoked after lazy transfer begins surfaces authentication-required and stops without cursor/local commit
ok 243 - B4 authentication revoked after lazy transfer begins surfaces authentication-required and stops without cursor/local commit
  ---
  duration_ms: 76.7844
  type: 'test'
  ...
# Subtest: B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit
ok 244 - B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit
  ---
  duration_ms: 10.4172
  type: 'test'
  ...
# Subtest: B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy
ok 245 - B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy
  ---
  duration_ms: 11.972
  type: 'test'
  ...
# Subtest: Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass
ok 246 - Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass
  ---
  duration_ms: 1048.5743
  type: 'test'
  ...
# Subtest: Phase5 scenario 47 notification policy emits only material user-actionable conditions
ok 247 - Phase5 scenario 47 notification policy emits only material user-actionable conditions
  ---
  duration_ms: 1.4339
  type: 'test'
  ...
# Subtest: Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root
ok 248 - Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root
  ---
  duration_ms: 1.6704
  type: 'test'
  ...
# Subtest: G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval
ok 249 - G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval
  ---
  duration_ms: 115.6436
  type: 'test'
  ...
# Subtest: G2 scenario 24 stale operation precondition refuses mutation, completes with attention, and awaits an external reconciliation trigger
ok 250 - G2 scenario 24 stale operation precondition refuses mutation, completes with attention, and awaits an external reconciliation trigger
  ---
  duration_ms: 19.0748
  type: 'test'
  ...
# Subtest: G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation
ok 251 - G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation
  ---
  duration_ms: 101.761
  type: 'test'
  ...
# Subtest: G2 scenario 10 clean three-way text merge executes through controller and commits merged authority
ok 252 - G2 scenario 10 clean three-way text merge executes through controller and commits merged authority
  ---
  duration_ms: 82.6192
  type: 'test'
  ...
# Subtest: G2 scenario 11 true text conflict preserves local and remote alternates without mutation
ok 253 - G2 scenario 11 true text conflict preserves local and remote alternates without mutation
  ---
  duration_ms: 6.0181
  type: 'test'
  ...
# Subtest: G2 scenario 12 binary conflict preserves both opaque versions
ok 254 - G2 scenario 12 binary conflict preserves both opaque versions
  ---
  duration_ms: 5.9791
  type: 'test'
  ...
# Subtest: G2 scenario 14 stable Drive identity produces and executes identity-preserving remote move
ok 255 - G2 scenario 14 stable Drive identity produces and executes identity-preserving remote move
  ---
  duration_ms: 18.545
  type: 'test'
  ...
# Subtest: G2 scenarios 15 and 18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction
ok 256 - G2 scenarios 15 and 18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction
  ---
  duration_ms: 90.5992
  type: 'test'
  ...
# Subtest: G2 scenario 16 delete-vs-modify remains a preservation conflict
ok 257 - G2 scenario 16 delete-vs-modify remains a preservation conflict
  ---
  duration_ms: 2.6304
  type: 'test'
  ...
# Subtest: G2 scenario 17 suspicious bulk destruction is circuit-broken before any mutation
ok 258 - G2 scenario 17 suspicious bulk destruction is circuit-broken before any mutation
  ---
  duration_ms: 5.3799
  type: 'test'
  ...
# Subtest: G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility
ok 259 - G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility
  ---
  duration_ms: 61.5814
  type: 'test'
  ...
# Subtest: G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base
ok 260 - G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base
  ---
  duration_ms: 20.383
  type: 'test'
  ...
# Subtest: G2 scenario 3 identical first sync establishes BASE without content mutation
ok 261 - G2 scenario 3 identical first sync establishes BASE without content mutation
  ---
  duration_ms: 8.9304
  type: 'test'
  ...
# Subtest: G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions
ok 262 - G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions
  ---
  duration_ms: 8.2196
  type: 'test'
  ...
# Subtest: G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion
ok 263 - G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion
  ---
  duration_ms: 51.7966
  type: 'test'
  ...
# Subtest: G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration
ok 264 - G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration
  ---
  duration_ms: 16.583
  type: 'test'
  ...
# Subtest: G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration
ok 265 - G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration
  ---
  duration_ms: 8.6164
  type: 'test'
  ...
# Subtest: G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds
ok 266 - G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds
  ---
  duration_ms: 19.5708
  type: 'test'
  ...
# Subtest: G2 scenario 20 without ReliableRemoteChangePort falls back to safe full reconciliation and commits a fresh cursor
ok 267 - G2 scenario 20 without ReliableRemoteChangePort falls back to safe full reconciliation and commits a fresh cursor
  ---
  duration_ms: 49.2147
  type: 'test'
  ...
# Subtest: G2 scenarios 21 and 22 incomplete remote or local observation cannot become deletion authority in Phase5 planning
ok 268 - G2 scenarios 21 and 22 incomplete remote or local observation cannot become deletion authority in Phase5 planning
  ---
  duration_ms: 5.9087
  type: 'test'
  ...
# Subtest: G2 scenario 23 stale current device cannot authorize destructive propagation through production controller planning
ok 269 - G2 scenario 23 stale current device cannot authorize destructive propagation through production controller planning
  ---
  duration_ms: 3.0076
  type: 'test'
  ...
# Subtest: G2 scenario 40 missing expected managed root blocks Phase5 before planning or mutation
ok 270 - G2 scenario 40 missing expected managed root blocks Phase5 before planning or mutation
  ---
  duration_ms: 1.2543
  type: 'test'
  ...
# Subtest: G2 scenario 27 cancellation stops future operations and leaves cursor unadvanced
ok 271 - G2 scenario 27 cancellation stops future operations and leaves cursor unadvanced
  ---
  duration_ms: 33.4393
  type: 'test'
  ...
# Subtest: G2 scenario 28 pause blocks product-controller synchronization until resume
ok 272 - G2 scenario 28 pause blocks product-controller synchronization until resume
  ---
  duration_ms: 10.6325
  type: 'test'
  ...
# Subtest: G2 scenario 29 same-runtime product synchronization runs serialize rather than overlap
ok 273 - G2 scenario 29 same-runtime product synchronization runs serialize rather than overlap
  ---
  duration_ms: 21.1571
  type: 'test'
  ...
# Subtest: G2 scenario 30 two real controller runs use separate production Web Locks leases over one shared lock boundary
ok 274 - G2 scenario 30 two real controller runs use separate production Web Locks leases over one shared lock boundary
  ---
  duration_ms: 22.6093
  type: 'test'
  ...
# Subtest: G2 scenario 6 Phase5 runtime pairing consumes validated managed-root identity and refuses invalid pairing
ok 275 - G2 scenario 6 Phase5 runtime pairing consumes validated managed-root identity and refuses invalid pairing
  ---
  duration_ms: 194.1062
  type: 'test'
  ...
# Subtest: G2 scenario 50 Phase5 deauthorization and disposal clear authority without local or Drive deletion
ok 276 - G2 scenario 50 Phase5 deauthorization and disposal clear authority without local or Drive deletion
  ---
  duration_ms: 5.8431
  type: 'test'
  ...
# Subtest: G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records
ok 277 - G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records
  ---
  duration_ms: 106.3797
  type: 'test'
  ...
# Subtest: G2 scenario 47 Phase5 runtime-owned notification subscription suppresses ordinary progress and delivers recovery
ok 278 - G2 scenario 47 Phase5 runtime-owned notification subscription suppresses ordinary progress and delivers recovery
  ---
  duration_ms: 13.1298
  type: 'test'
  ...
# Subtest: G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded
ok 279 - G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded
  ---
  duration_ms: 32.7795
  type: 'test'
  ...
# Subtest: Phase 5 audit history is bounded and stores only frozen metadata records
ok 280 - Phase 5 audit history is bounded and stores only frozen metadata records
  ---
  duration_ms: 4.1535
  type: 'test'
  ...
# Subtest: Phase 5 mobile Wi-Fi-only automatic policy fails closed when Wi-Fi cannot be proven
ok 281 - Phase 5 mobile Wi-Fi-only automatic policy fails closed when Wi-Fi cannot be proven
  ---
  duration_ms: 1.1745
  type: 'test'
  ...
# Subtest: Phase 5 desktop automatic policy does not invent a mobile network restriction
ok 282 - Phase 5 desktop automatic policy does not invent a mobile network restriction
  ---
  duration_ms: 0.4381
  type: 'test'
  ...
# Subtest: Phase 5 plugin data repository serializes settings exclusions recovery gate and audit without clobbering projections
ok 283 - Phase 5 plugin data repository serializes settings exclusions recovery gate and audit without clobbering projections
  ---
  duration_ms: 2.0973
  type: 'test'
  ...
# Subtest: Phase 5 Web Locks lease excludes a concurrent live writer and releases cleanly
ok 284 - Phase 5 Web Locks lease excludes a concurrent live writer and releases cleanly
  ---
  duration_ms: 1.1146
  type: 'test'
  ...
# Subtest: Phase 5 upload-create carries verified allocated Drive identity into authoritative trusted state
ok 285 - Phase 5 upload-create carries verified allocated Drive identity into authoritative trusted state
  ---
  duration_ms: 12.1364
  type: 'test'
  ...
# Subtest: Phase 5 clean-text-merge materializes exact canonical SHA-256 merge output and verifies both sides
ok 286 - Phase 5 clean-text-merge materializes exact canonical SHA-256 merge output and verifies both sides
  ---
  duration_ms: 4.4648
  type: 'test'
  ...
# Subtest: Phase 5 retained text with mismatched canonical hash is rejected as corrupt BASE material
ok 287 - Phase 5 retained text with mismatched canonical hash is rejected as corrupt BASE material
  ---
  duration_ms: 0.7218
  type: 'test'
  ...
# Subtest: Phase 5 first-sync identical no-op carries stable remote version and establishes trusted BASE
ok 288 - Phase 5 first-sync identical no-op carries stable remote version and establishes trusted BASE
  ---
  duration_ms: 6.7242
  type: 'test'
  ...
# Subtest: Phase 5 full reconciliation acquires candidate Changes cursor before remote listing
ok 289 - Phase 5 full reconciliation acquires candidate Changes cursor before remote listing
  ---
  duration_ms: 3.2898
  type: 'test'
  ...
# Subtest: Phase 5 unresolved conflict and recovery operations never enter ordinary mutation paths
ok 290 - Phase 5 unresolved conflict and recovery operations never enter ordinary mutation paths
  ---
  duration_ms: 0.7752
  type: 'test'
  ...
# Subtest: C2 recovery conflict mutation remains blocked until fresh reconstruction establishes durable authority
ok 291 - C2 recovery conflict mutation remains blocked until fresh reconstruction establishes durable authority
  ---
  duration_ms: 47.911
  type: 'test'
  ...
# Subtest: C2 cursorless recovery-derived conflict subplan has no recovery-completion authority
ok 292 - C2 cursorless recovery-derived conflict subplan has no recovery-completion authority
  ---
  duration_ms: 6.1143
  type: 'test'
  ...
# Subtest: C5 partial full run cannot signal scope-reconcile completion
ok 293 - C5 partial full run cannot signal scope-reconcile completion
  ---
  duration_ms: 4.9988
  type: 'test'
  ...
# Subtest: C5 only complete full run with candidate cursor signals scope-reconcile completion
ok 294 - C5 only complete full run with candidate cursor signals scope-reconcile completion
  ---
  duration_ms: 4.1294
  type: 'test'
  ...
# Subtest: disabled local-change automatic synchronization ignores local events without deferring or scheduling a pass
ok 295 - disabled local-change automatic synchronization ignores local events without deferring or scheduling a pass
  ---
  duration_ms: 6.6203
  type: 'test'
  ...
# Subtest: Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass
ok 296 - Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass
  ---
  duration_ms: 1.3054
  type: 'test'
  ...
# Subtest: Phase5 scenario 33 refresh replaces periodic timer with live cadence
ok 297 - Phase5 scenario 33 refresh replaces periodic timer with live cadence
  ---
  duration_ms: 0.579
  type: 'test'
  ...
# Subtest: Phase5 scenario 32 replays startup opportunity when vault-ready fired before scheduler registration
ok 298 - Phase5 scenario 32 replays startup opportunity when vault-ready fired before scheduler registration
  ---
  duration_ms: 0.7702
  type: 'test'
  ...
# Subtest: vault becoming ready after scheduler registration produces exactly one startup opportunity
ok 299 - vault becoming ready after scheduler registration produces exactly one startup opportunity
  ---
  duration_ms: 0.6694
  type: 'test'
  ...
# Subtest: startup automatic disabled produces no startup or resume synchronization opportunity
ok 300 - startup automatic disabled produces no startup or resume synchronization opportunity
  ---
  duration_ms: 0.7105
  type: 'test'
  ...
# Subtest: first sync incomplete keeps scheduler startup automatic ineligible
ok 301 - first sync incomplete keeps scheduler startup automatic ineligible
  ---
  duration_ms: 0.9407
  type: 'test'
  ...
# Subtest: active recovery keeps scheduler startup automatic ineligible
ok 302 - active recovery keeps scheduler startup automatic ineligible
  ---
  duration_ms: 0.6885
  type: 'test'
  ...
# Subtest: rapid ready/resume burst coalesces and preserves one future reconciliation while a run is active
ok 303 - rapid ready/resume burst coalesces and preserves one future reconciliation while a run is active
  ---
  duration_ms: 1.8314
  type: 'test'
  ...
# Subtest: Phase5 scenario 50 unload requests cancellation and scheduler teardown is non-mutating
ok 304 - Phase5 scenario 50 unload requests cancellation and scheduler teardown is non-mutating
  ---
  duration_ms: 1.1816
  type: 'test'
  ...
# Subtest: suspension during awaited lease acquisition releases the late lease without run authority
ok 305 - suspension during awaited lease acquisition releases the late lease without run authority
  ---
  duration_ms: 0.9653
  type: 'test'
  ...
# Subtest: concurrent begin requests serialize before lease acquisition and preserve one follow-up fact
ok 306 - concurrent begin requests serialize before lease acquisition and preserve one follow-up fact
  ---
  duration_ms: 2.2782
  type: 'test'
  ...
# Subtest: stopping state blocks subsequent operations and retains deferred reconciliation for resume
ok 307 - stopping state blocks subsequent operations and retains deferred reconciliation for resume
  ---
  duration_ms: 0.5481
  type: 'test'
  ...
# Subtest: cooperative cancellation signal is observable exactly once
ok 308 - cooperative cancellation signal is observable exactly once
  ---
  duration_ms: 0.5247
  type: 'test'
  ...
# Subtest: periodic active-app policy consumes cache-bypassing integrity evidence even without a watcher event
ok 309 - periodic active-app policy consumes cache-bypassing integrity evidence even without a watcher event
  ---
  duration_ms: 1.5429
  type: 'test'
  ...
# Subtest: C1 all path-local blocked-unsafe work remains attention-only rather than a global block
ok 310 - C1 all path-local blocked-unsafe work remains attention-only rather than a global block
  ---
  duration_ms: 6.0329
  type: 'test'
  ...
# Subtest: C1 recovery-required plan is blocked
ok 311 - C1 recovery-required plan is blocked
  ---
  duration_ms: 1.2809
  type: 'test'
  ...
# Subtest: C1 mixed safe plus blocked path is reviewable
ok 312 - C1 mixed safe plus blocked path is reviewable
  ---
  duration_ms: 2.9551
  type: 'test'
  ...
# Subtest: C1 automatic run executes the independently safe subset of a mixed attention plan
ok 313 - C1 automatic run executes the independently safe subset of a mixed attention plan
  ---
  duration_ms: 57.8698
  type: 'test'
  ...
# Subtest: C3 retained text requires canonical SHA-256 and rejects corruption
ok 314 - C3 retained text requires canonical SHA-256 and rejects corruption
  ---
  duration_ms: 1.7544
  type: 'test'
  ...
# Subtest: C3 revision-only text is rejected and yields unresolved conflict
ok 315 - C3 revision-only text is rejected and yields unresolved conflict
  ---
  duration_ms: 3.286
  type: 'test'
  ...
# Subtest: C4 reserved ordinary vault content cannot alias real configuration
ok 316 - C4 reserved ordinary vault content cannot alias real configuration
  ---
  duration_ms: 6.2052
  type: 'test'
  ...
# Subtest: C5 scope reconcile requirement forces full assembly
ok 317 - C5 scope reconcile requirement forces full assembly
  ---
  duration_ms: 4.1193
  type: 'test'
  ...
# Subtest: C6 assembler consumes ID-only removed event after restart
ok 318 - C6 assembler consumes ID-only removed event after restart
  ---
  duration_ms: 4.7244
  type: 'test'
  ...
# Subtest: C7 executor preserves authentication-required classification
ok 319 - C7 executor preserves authentication-required classification
  ---
  duration_ms: 1.3401
  type: 'test'
  ...
# Subtest: create crash-recovery matrix preserves absence or verified new content at every boundary
ok 320 - create crash-recovery matrix preserves absence or verified new content at every boundary
  ---
  duration_ms: 10.935
  type: 'test'
  ...
# Subtest: replace crash-recovery matrix never converts lost old target into create authority
ok 321 - replace crash-recovery matrix never converts lost old target into create authority
  ---
  duration_ms: 3.4234
  type: 'test'
  ...
# Subtest: authoritative cache-bypass discovers same-size same-mtime H0->H1 after missed watcher event
ok 322 - authoritative cache-bypass discovers same-size same-mtime H0->H1 after missed watcher event
  ---
  duration_ms: 2.2579
  type: 'test'
  ...
# Subtest: corrupt staged bytes are rejected before target displacement
ok 323 - corrupt staged bytes are rejected before target displacement
  ---
  duration_ms: 1.9728
  type: 'test'
  ...
# Subtest: create requires authoritative absence and commits verified bytes
ok 324 - create requires authoritative absence and commits verified bytes
  ---
  duration_ms: 1.8091
  type: 'test'
  ...
# Subtest: replace rechecks canonical old bytes even when observation token is unchanged
ok 325 - replace rechecks canonical old bytes even when observation token is unchanged
  ---
  duration_ms: 2.7621
  type: 'test'
  ...
# Subtest: replace recovery treats absent target plus absent required backup as contradiction
ok 326 - replace recovery treats absent target plus absent required backup as contradiction
  ---
  duration_ms: 1.5291
  type: 'test'
  ...
# Subtest: replace recovery completes verified stage when old target survives in backup
ok 327 - replace recovery completes verified stage when old target survives in backup
  ---
  duration_ms: 1.326
  type: 'test'
  ...
# Subtest: exact plugin structural hints coalesce while overlapping user edit remains observable
ok 328 - exact plugin structural hints coalesce while overlapping user edit remains observable
  ---
  duration_ms: 6.4024
  type: 'test'
  ...
# Subtest: B V1.3: authentication carrier remains physical outcome-unknown with authentication provenance
ok 329 - B V1.3: authentication carrier remains physical outcome-unknown with authentication provenance
  ---
  duration_ms: 2.6734
  type: 'test'
  ...
# Subtest: B V1.3: transient carrier remains physical outcome-unknown with transient provenance
ok 330 - B V1.3: transient carrier remains physical outcome-unknown with transient provenance
  ---
  duration_ms: 1.6756
  type: 'test'
  ...
# Subtest: B V1.3: rate-limit carrier remains physical outcome-unknown and preserves exact retry timing
ok 331 - B V1.3: rate-limit carrier remains physical outcome-unknown and preserves exact retry timing
  ---
  duration_ms: 1.3538
  type: 'test'
  ...
# Subtest: B V1.3: generic local errors and suggestive strings never fabricate operational provenance
ok 332 - B V1.3: generic local errors and suggestive strings never fabricate operational provenance
  ---
  duration_ms: 3.1146
  type: 'test'
  ...
# Subtest: B V1.3: canonical transaction wrapper preserves structured provenance returned by backend
ok 333 - B V1.3: canonical transaction wrapper preserves structured provenance returned by backend
  ---
  duration_ms: 0.6899
  type: 'test'
  ...
# Subtest: Phase 6 A: adapter-owned stage and backup artifacts are excluded from vault synchronization
ok 334 - Phase 6 A: adapter-owned stage and backup artifacts are excluded from vault synchronization
  ---
  duration_ms: 3.3284
  type: 'test'
  ...
# Subtest: Phase 6 A: staging-artifact exclusions do not broaden to ordinary similarly named user files
ok 335 - Phase 6 A: staging-artifact exclusions do not broaden to ordinary similarly named user files
  ---
  duration_ms: 1.0001
  type: 'test'
  ...
# Subtest: Phase 6 A: portable configuration remains explicit under a runtime-selected configuration directory
ok 336 - Phase 6 A: portable configuration remains explicit under a runtime-selected configuration directory
  ---
  duration_ms: 3.9199
  type: 'test'
  ...
# Subtest: Phase 6 A: cross-platform preflight blocks collision and compatibility hazards without blocking opaque extensions
ok 337 - Phase 6 A: cross-platform preflight blocks collision and compatibility hazards without blocking opaque extensions
  ---
  duration_ms: 2.2056
  type: 'test'
  ...
# Subtest: C1 reviewed first-sync Keep local crosses only the unresolved-path authority boundary and commits authority after verified mutation
ok 338 - C1 reviewed first-sync Keep local crosses only the unresolved-path authority boundary and commits authority after verified mutation
  ---
  duration_ms: 108.1498
  type: 'test'
  ...
# Subtest: C1 portable app.json Keep local leaves one planner-visible candidate and a clean subsequent plan
ok 339 - C1 portable app.json Keep local leaves one planner-visible candidate and a clean subsequent plan
  ---
  duration_ms: 14.3928
  type: 'test'
  ...
# Subtest: C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation
ok 340 - C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation
  ---
  duration_ms: 4.0961
  type: 'test'
  ...
# Subtest: C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation
    # Subtest: revision
    ok 1 - revision
      ---
      duration_ms: 9.154
      type: 'test'
      ...
    # Subtest: identity
    ok 2 - identity
      ---
      duration_ms: 5.4494
      type: 'test'
      ...
    1..2
ok 341 - C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation
  ---
  duration_ms: 16.6987
  type: 'test'
  ...
# Subtest: C1 ambiguous duplicate REMOTE identity fails closed before reviewed first-sync mutation
ok 342 - C1 ambiguous duplicate REMOTE identity fails closed before reviewed first-sync mutation
  ---
  duration_ms: 7.4432
  type: 'test'
  ...
# Subtest: C1 symmetric no-BASE Keep remote and Keep both resolutions use the bounded reviewed-conflict authority model
    # Subtest: keep-remote
    ok 1 - keep-remote
      ---
      duration_ms: 15.0657
      type: 'test'
      ...
    # Subtest: keep-both
    ok 2 - keep-both
      ---
      duration_ms: 22.1624
      type: 'test'
      ...
    1..2
ok 343 - C1 symmetric no-BASE Keep remote and Keep both resolutions use the bounded reviewed-conflict authority model
  ---
  duration_ms: 38.8751
  type: 'test'
  ...
# Subtest: C1 manual exact-current-local first-sync resolution succeeds without preexisting path BASE
ok 344 - C1 manual exact-current-local first-sync resolution succeeds without preexisting path BASE
  ---
  duration_ms: 17.3197
  type: 'test'
  ...
# Subtest: C1 ordinary non-conflict upload-update without trusted BASE remains rejected
ok 345 - C1 ordinary non-conflict upload-update without trusted BASE remains rejected
  ---
  duration_ms: 0.9879
  type: 'test'
  ...
# Subtest: C1 post-BASE conflict resolution retains the ordinary exact BASE plus mapping authority path
ok 346 - C1 post-BASE conflict resolution retains the ordinary exact BASE plus mapping authority path
  ---
  duration_ms: 1.0066
  type: 'test'
  ...
# Subtest: C1 durable effect-verified retry recovers the reviewed first-sync update without replaying REMOTE mutation
ok 347 - C1 durable effect-verified retry recovers the reviewed first-sync update without replaying REMOTE mutation
  ---
  duration_ms: 13.6188
  type: 'test'
  ...
# Subtest: C1 genuine first-sync multi-conflict provenance survives synthetic resolution subplans
ok 348 - C1 genuine first-sync multi-conflict provenance survives synthetic resolution subplans
  ---
  duration_ms: 20.0277
  type: 'test'
  ...
# Subtest: C1 fresh trusted-state Verify/Reconcile retains first-sync provenance until durable first-sync completion
ok 349 - C1 fresh trusted-state Verify/Reconcile retains first-sync provenance until durable first-sync completion
  ---
  duration_ms: 22.5626
  type: 'test'
  ...
# Subtest: C1 completed first-sync lifecycle dynamically removes no-BASE bootstrap provenance on a fresh plan
ok 350 - C1 completed first-sync lifecycle dynamically removes no-BASE bootstrap provenance on a fresh plan
  ---
  duration_ms: 2.8446
  type: 'test'
  ...
# Subtest: C1 recovery and reconstruction remain ineligible for reviewed first-sync bootstrap provenance
    # Subtest: recovery-active lifecycle
    ok 1 - recovery-active lifecycle
      ---
      duration_ms: 1.5477
      type: 'test'
      ...
    # Subtest: reconstruction assembly
    ok 2 - reconstruction assembly
      ---
      duration_ms: 0.9487
      type: 'test'
      ...
    1..2
ok 351 - C1 recovery and reconstruction remain ineligible for reviewed first-sync bootstrap provenance
  ---
  duration_ms: 3.0631
  type: 'test'
  ...
# Subtest: C1 missing registered conflict-origin provenance fails closed
ok 352 - C1 missing registered conflict-origin provenance fails closed
  ---
  duration_ms: 2.1666
  type: 'test'
  ...
# Subtest: diagnostic logger level off retains the required severity/detail prefix
ok 353 - diagnostic logger level off retains the required severity/detail prefix
  ---
  duration_ms: 5.7821
  type: 'test'
  ...
# Subtest: diagnostic logger level error retains the required severity/detail prefix
ok 354 - diagnostic logger level error retains the required severity/detail prefix
  ---
  duration_ms: 6.6654
  type: 'test'
  ...
# Subtest: diagnostic logger level warn retains the required severity/detail prefix
ok 355 - diagnostic logger level warn retains the required severity/detail prefix
  ---
  duration_ms: 1.0909
  type: 'test'
  ...
# Subtest: diagnostic logger level info retains the required severity/detail prefix
ok 356 - diagnostic logger level info retains the required severity/detail prefix
  ---
  duration_ms: 0.7258
  type: 'test'
  ...
# Subtest: diagnostic logger level debug retains the required severity/detail prefix
ok 357 - diagnostic logger level debug retains the required severity/detail prefix
  ---
  duration_ms: 1.3538
  type: 'test'
  ...
# Subtest: diagnostic logger level trace retains the required severity/detail prefix
ok 358 - diagnostic logger level trace retains the required severity/detail prefix
  ---
  duration_ms: 0.7207
  type: 'test'
  ...
# Subtest: diagnostic logger sequence is monotonic and bounded retention drops oldest while keeping newest
ok 359 - diagnostic logger sequence is monotonic and bounded retention drops oldest while keeping newest
  ---
  duration_ms: 6.9878
  type: 'test'
  ...
# Subtest: diagnostic clear removes records without resetting sequence or attempt identity
ok 360 - diagnostic clear removes records without resetting sequence or attempt identity
  ---
  duration_ms: 1.5938
  type: 'test'
  ...
# Subtest: diagnostic export is deterministic JSON-lines in authoritative sequence order
ok 361 - diagnostic export is deterministic JSON-lines in authoritative sequence order
  ---
  duration_ms: 1.8054
  type: 'test'
  ...
# Subtest: console mirroring follows current level and mirrors only the same sanitized rendered record
ok 362 - console mirroring follows current level and mirrors only the same sanitized rendered record
  ---
  duration_ms: 1.9623
  type: 'test'
  ...
# Subtest: diagnostic field allowlist and sanitization prevent representative OAuth secrets from reaching export
ok 363 - diagnostic field allowlist and sanitization prevent representative OAuth secrets from reaching export
  ---
  duration_ms: 1.1237
  type: 'test'
  ...
# Subtest: Info < Debug < Trace by internal decision visibility and execution granularity, not duplicate labels
ok 364 - Info < Debug < Trace by internal decision visibility and execution granularity, not duplicate labels
  ---
  duration_ms: 58.3604
  type: 'test'
  ...
# Subtest: rich Error records preserve safe diagnosis fields at Error-only detail
ok 365 - rich Error records preserve safe diagnosis fields at Error-only detail
  ---
  duration_ms: 1.2859
  type: 'test'
  ...
# Subtest: structured observability vocabulary records every required bounded causal field
ok 366 - structured observability vocabulary records every required bounded causal field
  ---
  duration_ms: 3.3622
  type: 'test'
  ...
# Subtest: new component taxonomy separates transport, semantic Drive, effect, state/CAS, recovery, and bundle surfaces
ok 367 - new component taxonomy separates transport, semantic Drive, effect, state/CAS, recovery, and bundle surfaces
  ---
  duration_ms: 1.2386
  type: 'test'
  ...
# Subtest: diagnostic path key is normalized, deterministic, portable, and opaque
ok 368 - diagnostic path key is normalized, deterministic, portable, and opaque
  ---
  duration_ms: 1.1033
  type: 'test'
  ...
# Subtest: occupant remote object representation is deterministic, unique, sorted, and bounded
ok 369 - occupant remote object representation is deterministic, unique, sorted, and bounded
  ---
  duration_ms: 0.8691
  type: 'test'
  ...
# Subtest: current synchronization run correlation is discoverable and ending one exact run cannot clear another
ok 370 - current synchronization run correlation is discoverable and ending one exact run cannot clear another
  ---
  duration_ms: 0.8432
  type: 'test'
  ...
# Subtest: prior valid persisted events remain loadable without current-run leakage
ok 371 - prior valid persisted events remain loadable without current-run leakage
  ---
  duration_ms: 3.983
  type: 'test'
  ...
# Subtest: structured privacy boundary drops raw path/body/content fields and redacts authorization and query material
ok 372 - structured privacy boundary drops raw path/body/content fields and redacts authorization and query material
  ---
  duration_ms: 6.6907
  type: 'test'
  ...
# Subtest: diagnostic persistence failure remains non-authoritative and does not throw through flush
ok 373 - diagnostic persistence failure remains non-authoritative and does not throw through flush
  ---
  duration_ms: 1.4607
  type: 'test'
  ...
# Subtest: operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs
ok 374 - operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs
  ---
  duration_ms: 113.2543
  type: 'test'
  ...
# Subtest: a later stable no-op reconciliation resolves transient stale attention without a content mutation
ok 375 - a later stable no-op reconciliation resolves transient stale attention without a content mutation
  ---
  duration_ms: 21.1468
  type: 'test'
  ...
# Subtest: post-journal stale intent is safely retired before unrelated work continues
ok 376 - post-journal stale intent is safely retired before unrelated work continues
  ---
  duration_ms: 28.0649
  type: 'test'
  ...
# Subtest: one validation pass reuses one coherent local and remote observation per path
ok 377 - one validation pass reuses one coherent local and remote observation per path
  ---
  duration_ms: 1.4207
  type: 'test'
  ...
# Subtest: path and subtree enumeration uncertainty do not contaminate unrelated absent paths
ok 378 - path and subtree enumeration uncertainty do not contaminate unrelated absent paths
  ---
  duration_ms: 4.18
  type: 'test'
  ...
# Subtest: mobile adapter boundary completely enumerates visible, nested, empty, and non-excluded hidden content
ok 379 - mobile adapter boundary completely enumerates visible, nested, empty, and non-excluded hidden content
  ---
  duration_ms: 21.759
  type: 'test'
  ...
# Subtest: mobile boundary blocks traversal, absolute, drive-qualified, and URI paths before adapter I/O
ok 380 - mobile boundary blocks traversal, absolute, drive-qualified, and URI paths before adapter I/O
  ---
  duration_ms: 11.5981
  type: 'test'
  ...
# Subtest: malformed, colliding, and cyclic adapter children are rejected without access while safe siblings remain inspectable
ok 381 - malformed, colliding, and cyclic adapter children are rejected without access while safe siblings remain inspectable
  ---
  duration_ms: 4.3538
  type: 'test'
  ...
# Subtest: mobile adapter mutations validate temporary paths and handle hidden files absent from the Vault tree
ok 382 - mobile adapter mutations validate temporary paths and handle hidden files absent from the Vault tree
  ---
  duration_ms: 86.0387
  type: 'test'
  ...
# Subtest: mobile preserves FileManager semantics for visible moves while retaining adapter fallback for hidden content
ok 383 - mobile preserves FileManager semantics for visible moves while retaining adapter fallback for hidden content
  ---
  duration_ms: 3.0973
  type: 'test'
  ...
# Subtest: desktop retains physical external-reference rejection independently of the mobile adapter boundary
ok 384 - desktop retains physical external-reference rejection independently of the mobile adapter boundary
  ---
  duration_ms: 1.485
  type: 'test'
  ...
# Subtest: production mobile composition explicitly selects the adapter boundary without Node or Electron
ok 385 - production mobile composition explicitly selects the adapter boundary without Node or Electron
  ---
  duration_ms: 1.7891
  type: 'test'
  ...
# Subtest: healthy mobile first sync produces complete LOCAL evidence and a non-destructive previewable safe-union plan
ok 386 - healthy mobile first sync produces complete LOCAL evidence and a non-destructive previewable safe-union plan
  ---
  duration_ms: 17.1952
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream yields a non-empty file incrementally in bounded chunks
ok 387 - iOS HTTP 200 resource stream yields a non-empty file incrementally in bounded chunks
  ---
  duration_ms: 71.7644
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream rejects premature EOF and excess bytes
ok 388 - iOS HTTP 200 resource stream rejects premature EOF and excess bytes
  ---
  duration_ms: 9.1826
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream validates Content-Length when present
ok 389 - iOS HTTP 200 resource stream validates Content-Length when present
  ---
  duration_ms: 6.6462
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream fails stale when the file changes during reading
ok 390 - iOS HTTP 200 resource stream fails stale when the file changes during reading
  ---
  duration_ms: 25.5645
  type: 'test'
  ...
# Subtest: zero-byte mobile files preserve no-fetch canonical read behavior
ok 391 - zero-byte mobile files preserve no-fetch canonical read behavior
  ---
  duration_ms: 1.8108
  type: 'test'
  ...
# Subtest: production mobile canonical chain keeps ordinary and portable non-empty content complete under HTTP 200
ok 392 - production mobile canonical chain keeps ordinary and portable non-empty content complete under HTTP 200
  ---
  duration_ms: 102.0565
  type: 'test'
  ...
# Subtest: iOS OAuth launch: final authorization URL is handed directly to Obsidian's external-browser target
ok 393 - iOS OAuth launch: final authorization URL is handed directly to Obsidian's external-browser target
  ---
  duration_ms: 3.4555
  type: 'test'
  ...
# Subtest: iOS OAuth launch: unavailable external-browser capability fails clearly
ok 394 - iOS OAuth launch: unavailable external-browser capability fails clearly
  ---
  duration_ms: 1.3
  type: 'test'
  ...
# Subtest: iOS OAuth launch: exactly one prepared transaction launches its final URL exactly once
ok 395 - iOS OAuth launch: exactly one prepared transaction launches its final URL exactly once
  ---
  duration_ms: 1.2838
  type: 'test'
  ...
# Subtest: iOS OAuth launch: preparation and synchronous or asynchronous launcher failures propagate
ok 396 - iOS OAuth launch: preparation and synchronous or asynchronous launcher failures propagate
  ---
  duration_ms: 1.1246
  type: 'test'
  ...
# Subtest: iOS OAuth launch: mobile selects _external while desktop retains its validated direct launcher
ok 397 - iOS OAuth launch: mobile selects _external while desktop retains its validated direct launcher
  ---
  duration_ms: 25.8954
  type: 'test'
  ...
# Subtest: iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle
ok 398 - iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle
  ---
  duration_ms: 107.0157
  type: 'test'
  ...
# Subtest: sync diagnostics preserve plan/execution semantics and never export vault path or content
ok 399 - sync diagnostics preserve plan/execution semantics and never export vault path or content
  ---
  duration_ms: 43.92
  type: 'test'
  ...
# Subtest: manual sync planning failure is terminal, correlated, and metadata-only
ok 400 - manual sync planning failure is terminal, correlated, and metadata-only
  ---
  duration_ms: 2.5749
  type: 'test'
  ...
# Subtest: preview-presentation exception is sanitized at the preview stage and closes the same run
ok 401 - preview-presentation exception is sanitized at the preview stage and closes the same run
  ---
  duration_ms: 6.8373
  type: 'test'
  ...
# Subtest: stale Execute rejection is Error-level under the original run and later dismissal cancels it
ok 402 - stale Execute rejection is Error-level under the original run and later dismissal cancels it
  ---
  duration_ms: 10.8726
  type: 'test'
  ...
# Subtest: identical semantic plans retain independent explicit diagnostic run ownership
ok 403 - identical semantic plans retain independent explicit diagnostic run ownership
  ---
  duration_ms: 13.1886
  type: 'test'
  ...
# Subtest: precondition throw is Error-level at its exact execution substage and closes the run
ok 404 - precondition throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 20.4672
  type: 'test'
  ...
# Subtest: pending throw is Error-level at its exact execution substage and closes the run
ok 405 - pending throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 17.4516
  type: 'test'
  ...
# Subtest: mutation throw is Error-level at its exact execution substage and closes the run
ok 406 - mutation throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 15.6889
  type: 'test'
  ...
# Subtest: uncertain-journal throw is Error-level at its exact execution substage and closes the run
ok 407 - uncertain-journal throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 25.9099
  type: 'test'
  ...
# Subtest: commit throw is Error-level at its exact execution substage and closes the run
ok 408 - commit throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 18.0757
  type: 'test'
  ...
# Subtest: returned content-mutation failure emits Error evidence rather than Trace-only evidence
ok 409 - returned content-mutation failure emits Error evidence rather than Trace-only evidence
  ---
  duration_ms: 12.7919
  type: 'test'
  ...
# Subtest: run-lease acquisition throw emits a stage-specific terminal Error and closes the run
ok 410 - run-lease acquisition throw emits a stage-specific terminal Error and closes the run
  ---
  duration_ms: 6.3938
  type: 'test'
  ...
# Subtest: mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability
ok 411 - mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability
  ---
  duration_ms: 70.5961
  type: 'test'
  ...
# Subtest: automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers
ok 412 - automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers
  ---
  duration_ms: 68.133
  type: 'test'
  ...
# Subtest: conflict and all-blocked plans isolate affected paths without mutating them
ok 413 - conflict and all-blocked plans isolate affected paths without mutating them
  ---
  duration_ms: 13.7643
  type: 'test'
  ...
# Subtest: global recovery and destructive approval gates cannot execute a safe subset automatically
ok 414 - global recovery and destructive approval gates cannot execute a safe subset automatically
  ---
  duration_ms: 9.2909
  type: 'test'
  ...
# Subtest: stale-device destructive work is isolated while independent safe work commits without cursor advancement
ok 415 - stale-device destructive work is isolated while independent safe work commits without cursor advancement
  ---
  duration_ms: 10.3815
  type: 'test'
  ...
# Subtest: ordinary authorized deletion still executes automatically
ok 416 - ordinary authorized deletion still executes automatically
  ---
  duration_ms: 15.3227
  type: 'test'
  ...
# Subtest: partial first-sync safe union commits progress but cannot complete baseline or cursor authority
ok 417 - partial first-sync safe union commits progress but cannot complete baseline or cursor authority
  ---
  duration_ms: 7.787
  type: 'test'
  ...
# Subtest: transient unstable path clears from current attention after a later stable retry
ok 418 - transient unstable path clears from current attention after a later stable retry
  ---
  duration_ms: 21.147
  type: 'test'
  ...
# Subtest: dependency isolation skips a child of a blocked parent while unrelated work proceeds
ok 419 - dependency isolation skips a child of a blocked parent while unrelated work proceeds
  ---
  duration_ms: 8.5256
  type: 'test'
  ...
# Subtest: attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely
ok 420 - attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely
  ---
  duration_ms: 3.655
  type: 'test'
  ...
# Subtest: a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it
ok 421 - a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it
  ---
  duration_ms: 13.5822
  type: 'test'
  ...
# Subtest: ledger persistence failure is surfaced but does not roll back authorized safe work
ok 422 - ledger persistence failure is surfaced but does not roll back authorized safe work
  ---
  duration_ms: 7.7204
  type: 'test'
  ...
# Subtest: one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution
ok 423 - one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution
  ---
  duration_ms: 12.5587
  type: 'test'
  ...
# Subtest: serialized plugin repository writes keep per-call immutable payload snapshots
ok 424 - serialized plugin repository writes keep per-call immutable payload snapshots
  ---
  duration_ms: 1.4918
  type: 'test'
  ...
# Subtest: automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets
ok 425 - automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets
  ---
  duration_ms: 13.4096
  type: 'test'
  ...
# Subtest: controller surface emits no premature completion and exactly one terminal mixed-run notice
ok 426 - controller surface emits no premature completion and exactly one terminal mixed-run notice
  ---
  duration_ms: 7.2793
  type: 'test'
  ...
# Subtest: notification identity suppresses the same attention but reports changed paths and reasons with identical counts
ok 427 - notification identity suppresses the same attention but reports changed paths and reasons with identical counts
  ---
  duration_ms: 14.5689
  type: 'test'
  ...
# Subtest: startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID
ok 428 - startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID
  ---
  duration_ms: 5.6005
  type: 'test'
  ...
# Subtest: direct external-browser probe is synchronous, fixed-destination, _external, and OAuth-independent
ok 429 - direct external-browser probe is synchronous, fixed-destination, _external, and OAuth-independent
  ---
  duration_ms: 12.0487
  type: 'test'
  ...
# Subtest: delayed external-browser probe crosses a controlled microtask before the same fixed _external launch
ok 430 - delayed external-browser probe crosses a controlled microtask before the same fixed _external launch
  ---
  duration_ms: 1.9061
  type: 'test'
  ...
# Subtest: OAuth settings button establishes attempt ID before authenticate and the real path exposes required diagnostic boundaries
ok 431 - OAuth settings button establishes attempt ID before authenticate and the real path exposes required diagnostic boundaries
  ---
  duration_ms: 15.0243
  type: 'test'
  ...
# Subtest: callback diagnostics record only presence/classification semantics and never callback values
ok 432 - callback diagnostics record only presence/classification semantics and never callback values
  ---
  duration_ms: 2.4393
  type: 'test'
  ...
# Subtest: T1 repeated runtime initialization never registers the plugin-global OAuth protocol action
ok 433 - T1 repeated runtime initialization never registers the plugin-global OAuth protocol action
  ---
  duration_ms: 142.5658
  type: 'test'
  ...
# Subtest: T2/T4/T5 one stable registration delegates a callback only to the current completion target
ok 434 - T2/T4/T5 one stable registration delegates a callback only to the current completion target
  ---
  duration_ms: 2.2879
  type: 'test'
  ...
# Subtest: T4/T5 runtime completion seam dereferences the current OAuth session at callback execution time
ok 435 - T4/T5 runtime completion seam dereferences the current OAuth session at callback execution time
  ---
  duration_ms: 5.4605
  type: 'test'
  ...
# Subtest: T3 Authenticate-after-initialization path cannot register the OAuth action again
ok 436 - T3 Authenticate-after-initialization path cannot register the OAuth action again
  ---
  duration_ms: 4.2215
  type: 'test'
  ...
# Subtest: T2/T6 registration is once per plugin lifetime and relies on lifecycle cleanup rather than manual registry mutation
ok 437 - T2/T6 registration is once per plugin lifetime and relies on lifecycle cleanup rather than manual registry mutation
  ---
  duration_ms: 6.3914
  type: 'test'
  ...
# Subtest: T7 lifecycle repair adds no secret-bearing diagnostics and preserves safe completion notices
ok 438 - T7 lifecycle repair adds no secret-bearing diagnostics and preserves safe completion notices
  ---
  duration_ms: 6.7853
  type: 'test'
  ...
# Subtest: Alpha OAuth live: a falsy browser return still counts as an initiated launch
ok 439 - Alpha OAuth live: a falsy browser return still counts as an initiated launch
  ---
  duration_ms: 4.0151
  type: 'test'
  ...
# Subtest: Alpha OAuth live: an actual browser launch exception is surfaced
ok 440 - Alpha OAuth live: an actual browser launch exception is surfaced
  ---
  duration_ms: 0.734
  type: 'test'
  ...
# Subtest: Alpha OAuth live: token endpoint failure exposes only structured sanitized diagnostics
ok 441 - Alpha OAuth live: token endpoint failure exposes only structured sanitized diagnostics
  ---
  duration_ms: 73.6227
  type: 'test'
  ...
# Subtest: Alpha OAuth live: malformed token response keeps safe status without raw response data
ok 442 - Alpha OAuth live: malformed token response keeps safe status without raw response data
  ---
  duration_ms: 2.9946
  type: 'test'
  ...
# Subtest: Alpha OAuth live: transport failure produces a generic secret-free classification
ok 443 - Alpha OAuth live: transport failure produces a generic secret-free classification
  ---
  duration_ms: 2.8572
  type: 'test'
  ...
# Subtest: Alpha OAuth live: successful exact drive.file exchange remains unchanged
ok 444 - Alpha OAuth live: successful exact drive.file exchange remains unchanged
  ---
  duration_ms: 3.191
  type: 'test'
  ...
# Subtest: Alpha OAuth live: failure diagnostic remains visible and copyable without console logging
ok 445 - Alpha OAuth live: failure diagnostic remains visible and copyable without console logging
  ---
  duration_ms: 5.8
  type: 'test'
  ...
# Subtest: Alpha OAuth live: Web client secret is wired through Obsidian SecretStorage and never plugin data
ok 446 - Alpha OAuth live: Web client secret is wired through Obsidian SecretStorage and never plugin data
  ---
  duration_ms: 6.4886
  type: 'test'
  ...
# Subtest: case-only and Unicode-equivalent relocations are rejected before journal or filesystem mutation on a normalizing adapter
ok 447 - case-only and Unicode-equivalent relocations are rejected before journal or filesystem mutation on a normalizing adapter
  ---
  duration_ms: 18.0338
  type: 'test'
  ...
# Subtest: persisted case-only and Unicode-equivalent relocation journals are defensively rejected
ok 448 - persisted case-only and Unicode-equivalent relocation journals are defensively rejected
  ---
  duration_ms: 1.6349
  type: 'test'
  ...
# Subtest: complete canonical, stage, and backup paths must all satisfy cross-platform path policy
ok 449 - complete canonical, stage, and backup paths must all satisfy cross-platform path policy
  ---
  duration_ms: 1.3265
  type: 'test'
  ...
# Subtest: invalid complete relocation paths are rejected before durable journal or filesystem mutation
ok 450 - invalid complete relocation paths are rejected before durable journal or filesystem mutation
  ---
  duration_ms: 0.8143
  type: 'test'
  ...
# Subtest: relocation merges pre-existing valid destination history without fake occurrence increments
ok 451 - relocation merges pre-existing valid destination history without fake occurrence increments
  ---
  duration_ms: 5.4302
  type: 'test'
  ...
# Subtest: relocation merge bounds resolved history while preserving every current record
ok 452 - relocation merge bounds resolved history while preserving every current record
  ---
  duration_ms: 66.7599
  type: 'test'
  ...
# Subtest: restarting relocation after a durable merged destination is idempotent
ok 453 - restarting relocation after a durable merged destination is idempotent
  ---
  duration_ms: 3.094
  type: 'test'
  ...
# Subtest: invalid destination CSV is never overwritten and source remains authoritative
ok 454 - invalid destination CSV is never overwritten and source remains authoritative
  ---
  duration_ms: 1.1567
  type: 'test'
  ...
# Subtest: later resolution defeats an older stale current copy for the same record key
ok 455 - later resolution defeats an older stale current copy for the same record key
  ---
  duration_ms: 2.4883
  type: 'test'
  ...
# Subtest: later resolution wins regardless of whether the stale current copy is source or destination
ok 456 - later resolution wins regardless of whether the stale current copy is source or destination
  ---
  duration_ms: 4.399
  type: 'test'
  ...
# Subtest: a genuinely later recurrence reopens a previously resolved record
ok 457 - a genuinely later recurrence reopens a previously resolved record
  ---
  duration_ms: 2.0437
  type: 'test'
  ...
# Subtest: restart relocation does not resurrect a source record resolved after a stale destination current copy
ok 458 - restart relocation does not resurrect a source record resolved after a stale destination current copy
  ---
  duration_ms: 3.538
  type: 'test'
  ...
# Subtest: corrected resolved relocation state is idempotent across repeated recovery merges
ok 459 - corrected resolved relocation state is idempotent across repeated recovery merges
  ---
  duration_ms: 2.7444
  type: 'test'
  ...
# Subtest: transient canonical stale observation retries to stable evidence without persistent attention
ok 460 - transient canonical stale observation retries to stable evidence without persistent attention
  ---
  duration_ms: 4.0923
  type: 'test'
  ...
# Subtest: persistent canonical instability is path-local local-file-not-stable and does not change listing completeness
ok 461 - persistent canonical instability is path-local local-file-not-stable and does not change listing completeness
  ---
  duration_ms: 3.5711
  type: 'test'
  ...
# Subtest: one path content-evidence failure does not contaminate unrelated portable paths, while real listing incompleteness still does
ok 462 - one path content-evidence failure does not contaminate unrelated portable paths, while real listing incompleteness still does
  ---
  duration_ms: 3.4196
  type: 'test'
  ...
# Subtest: ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row
ok 463 - ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row
  ---
  duration_ms: 55.5435
  type: 'test'
  ...
# Subtest: exhausted edit instability is isolated into the CSV while an independent safe upload commits
ok 464 - exhausted edit instability is isolated into the CSV while an independent safe upload commits
  ---
  duration_ms: 41.0948
  type: 'test'
  ...
# Subtest: sync-plan-errors.csv is automatically created, durable, recreated, relocatable, and fail-safe excluded
ok 465 - sync-plan-errors.csv is automatically created, durable, recreated, relocatable, and fail-safe excluded
  ---
  duration_ms: 23.4772
  type: 'test'
  ...
# Subtest: configured sync plan errors directory rejects unsafe values and legacy records migrate into the persistent CSV
ok 466 - configured sync plan errors directory rejects unsafe values and legacy records migrate into the persistent CSV
  ---
  duration_ms: 1.7352
  type: 'test'
  ...
# Subtest: one failed persistent CSV replacement reaches its caller but does not poison later ledger writes
ok 467 - one failed persistent CSV replacement reaches its caller but does not poison later ledger writes
  ---
  duration_ms: 2.0935
  type: 'test'
  ...
# Subtest: restart recovery restores committed backup before discarding an uncommitted stage
ok 468 - restart recovery restores committed backup before discarding an uncommitted stage
  ---
  duration_ms: 1.472
  type: 'test'
  ...
# Subtest: restart recovery keeps a valid canonical CSV and removes stale replacement residue
ok 469 - restart recovery keeps a valid canonical CSV and removes stale replacement residue
  ---
  duration_ms: 1.5239
  type: 'test'
  ...
# Subtest: restart recovery promotes a valid stage when no canonical or committed backup exists
ok 470 - restart recovery promotes a valid stage when no canonical or committed backup exists
  ---
  duration_ms: 1.3696
  type: 'test'
  ...
# Subtest: unrecoverable replacement residue fails initialization without fabricating blank history
ok 471 - unrecoverable replacement residue fails initialization without fabricating blank history
  ---
  duration_ms: 1.2477
  type: 'test'
  ...
# Subtest: pending relocation restart converges without record or exclusion loss after journal persistence before destination creation
ok 472 - pending relocation restart converges without record or exclusion loss after journal persistence before destination creation
  ---
  duration_ms: 52.2579
  type: 'test'
  ...
# Subtest: pending relocation restart converges without record or exclusion loss after destination creation before active-location commit
ok 473 - pending relocation restart converges without record or exclusion loss after destination creation before active-location commit
  ---
  duration_ms: 21.1402
  type: 'test'
  ...
# Subtest: pending relocation restart converges without record or exclusion loss after active-location commit before source cleanup
ok 474 - pending relocation restart converges without record or exclusion loss after active-location commit before source cleanup
  ---
  duration_ms: 1.2662
  type: 'test'
  ...
# Subtest: live relocation durably journals both exclusions before copying and clears them only after finalization
ok 475 - live relocation durably journals both exclusions before copying and clears them only after finalization
  ---
  duration_ms: 2.4156
  type: 'test'
  ...
# Subtest: persisted relocation journal is defensively rejected when either exact CSV path is unsafe
ok 476 - persisted relocation journal is defensively rejected when either exact CSV path is unsafe
  ---
  duration_ms: 0.6646
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure
ok 477 - Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure
  ---
  duration_ms: 2.7837
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates
ok 478 - Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates
  ---
  duration_ms: 0.8361
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: permission uncertainty is not converted into absence
ok 479 - Phase 6 Alpha portable collision: permission uncertainty is not converted into absence
  ---
  duration_ms: 1.4908
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: canonical-resolution failure on an existing component remains fail-closed
ok 480 - Phase 6 Alpha portable collision: canonical-resolution failure on an existing component remains fail-closed
  ---
  duration_ms: 1.0174
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: lexical and external-reference containment remain fail-closed
ok 481 - Phase 6 Alpha portable collision: lexical and external-reference containment remain fail-closed
  ---
  duration_ms: 1.1275
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: production desktop composition observes a safely missing reserved root as absent
ok 482 - Phase 6 Alpha portable collision: production desktop composition observes a safely missing reserved root as absent
  ---
  duration_ms: 18.1461
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: unknown, inaccessible, unreadable, and real occupancy all remain fail-closed collisions
ok 483 - Phase 6 Alpha portable collision: unknown, inaccessible, unreadable, and real occupancy all remain fail-closed collisions
  ---
  duration_ms: 1.5986
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: absent physical reserved root permits portable first-sync safe-union uploads
ok 484 - Phase 6 Alpha portable collision: absent physical reserved root permits portable first-sync safe-union uploads
  ---
  duration_ms: 16.1685
  type: 'test'
  ...
# Subtest: diagnostic clipboard export invokes writeText synchronously with the exact rendered text
ok 485 - diagnostic clipboard export invokes writeText synchronously with the exact rendered text
  ---
  duration_ms: 1.8151
  type: 'test'
  ...
# Subtest: diagnostic clipboard export reports unavailable without performing any vault write
ok 486 - diagnostic clipboard export reports unavailable without performing any vault write
  ---
  duration_ms: 1.4754
  type: 'test'
  ...
# Subtest: diagnostic .txt share invokes navigator.share synchronously with only one real text file
ok 487 - diagnostic .txt share invokes navigator.share synchronously with only one real text file
  ---
  duration_ms: 2.6809
  type: 'test'
  ...
# Subtest: diagnostic .txt share capability honors canShare and does not call share when file sharing is rejected
ok 488 - diagnostic .txt share capability honors canShare and does not call share when file sharing is rejected
  ---
  duration_ms: 0.9226
  type: 'test'
  ...
# Subtest: diagnostic .txt share reports unavailable when navigator.share is absent
ok 489 - diagnostic .txt share reports unavailable when navigator.share is absent
  ---
  duration_ms: 0.5158
  type: 'test'
  ...
# Subtest: crash before content mutation leaves only durable pending evidence and never advances BASE
ok 490 - crash before content mutation leaves only durable pending evidence and never advances BASE
  ---
  duration_ms: 8.2172
  type: 'test'
  ...
# Subtest: ambiguous transfer outcome is durably classified uncertain without advancing BASE
ok 491 - ambiguous transfer outcome is durably classified uncertain without advancing BASE
  ---
  duration_ms: 3.8638
  type: 'test'
  ...
# Subtest: authoritative success commit rejects non-durable or non-verified receipts
ok 492 - authoritative success commit rejects non-durable or non-verified receipts
  ---
  duration_ms: 1.8494
  type: 'test'
  ...
# Subtest: crash/failure while persisting verified success cannot create false-success state
ok 493 - crash/failure while persisting verified success cannot create false-success state
  ---
  duration_ms: 4.6593
  type: 'test'
  ...
# Subtest: migration preserves a recoverable exact pre-migration checkpoint
ok 494 - migration preserves a recoverable exact pre-migration checkpoint
  ---
  duration_ms: 3.2976
  type: 'test'
  ...
# Subtest: corrupt, truncated, incompatible, and missing expected state all fail into recovery
ok 495 - corrupt, truncated, incompatible, and missing expected state all fail into recovery
  ---
  duration_ms: 2.5006
  type: 'test'
  ...
# Subtest: D v1.2 authority boundary replaces nominal BASE and identity markers with exact frozen authority
ok 496 - D v1.2 authority boundary replaces nominal BASE and identity markers with exact frozen authority
  ---
  duration_ms: 3.6542
  type: 'test'
  ...
# Subtest: D v1.2 restart from dispatch-authorized observes physical reality before retry eligibility
ok 497 - D v1.2 restart from dispatch-authorized observes physical reality before retry eligibility
  ---
  duration_ms: 1.0209
  type: 'test'
  ...
# Subtest: D v1.2 restart from outcome-unknown also observes physical reality before retry eligibility
ok 498 - D v1.2 restart from outcome-unknown also observes physical reality before retry eligibility
  ---
  duration_ms: 0.2941
  type: 'test'
  ...
# Subtest: D v1.2 correctly observed reserved folder is physical proof but not commit authority without convergence
ok 499 - D v1.2 correctly observed reserved folder is physical proof but not commit authority without convergence
  ---
  duration_ms: 0.3738
  type: 'test'
  ...
# Subtest: D v1.2 correctly observed reserved folder becomes commit-eligible only with converged path authority
ok 500 - D v1.2 correctly observed reserved folder becomes commit-eligible only with converged path authority
  ---
  duration_ms: 0.2846
  type: 'test'
  ...
# Subtest: D v1.2 wrong actual parent remains conflict-preserved
ok 501 - D v1.2 wrong actual parent remains conflict-preserved
  ---
  duration_ms: 0.2709
  type: 'test'
  ...
# Subtest: D v1.2 wrong actual structural path remains conflict-preserved
ok 502 - D v1.2 wrong actual structural path remains conflict-preserved
  ---
  duration_ms: 0.4637
  type: 'test'
  ...
# Subtest: D v1.2 occupied logical target cannot become verified-not-applied retry authority
ok 503 - D v1.2 occupied logical target cannot become verified-not-applied retry authority
  ---
  duration_ms: 0.4563
  type: 'test'
  ...
# Subtest: D v1.2 authoritative reserved-ID absence and clear target can become safe retry eligibility
ok 504 - D v1.2 authoritative reserved-ID absence and clear target can become safe retry eligibility
  ---
  duration_ms: 1.1753
  type: 'test'
  ...
# Subtest: D v1.2 incomplete recovery observation remains recovery-pending
ok 505 - D v1.2 incomplete recovery observation remains recovery-pending
  ---
  duration_ms: 0.8697
  type: 'test'
  ...
# Subtest: D v1.2 unrelated sibling effects are independently classified while one recovery is conflicted
ok 506 - D v1.2 unrelated sibling effects are independently classified while one recovery is conflicted
  ---
  duration_ms: 0.8321
  type: 'test'
  ...
# Subtest: D v1.2 restart never re-observes or duplicates a state-committed folder create
ok 507 - D v1.2 restart never re-observes or duplicates a state-committed folder create
  ---
  duration_ms: 0.2184
  type: 'test'
  ...
# Subtest: D authoritative coordinator replaces nominal BASE authority and restores exact canonical state CAS
ok 508 - D authoritative coordinator replaces nominal BASE authority and restores exact canonical state CAS
  ---
  duration_ms: 1.9348
  type: 'test'
  ...
# Subtest: D exact canonical CAS stale result is surfaced rather than silently committing
ok 509 - D exact canonical CAS stale result is surfaced rather than silently committing
  ---
  duration_ms: 0.4798
  type: 'test'
  ...
# Subtest: D operation self-assertion cannot manufacture identity authority without a durable mapping
ok 510 - D operation self-assertion cannot manufacture identity authority without a durable mapping
  ---
  duration_ms: 0.254
  type: 'test'
  ...
# Subtest: D contradictory durable identity mapping rejects operation path or remote ID assertion
ok 511 - D contradictory durable identity mapping rejects operation path or remote ID assertion
  ---
  duration_ms: 0.2856
  type: 'test'
  ...
# Subtest: D duplicate durable mapping is non-unique and blocks identity authority
ok 512 - D duplicate durable mapping is non-unique and blocks identity authority
  ---
  duration_ms: 0.1789
  type: 'test'
  ...
# Subtest: D matching current-generation durable mapping resolves exact identity authority
ok 513 - D matching current-generation durable mapping resolves exact identity authority
  ---
  duration_ms: 0.2095
  type: 'test'
  ...
# Subtest: D authoritative coordinator isolates stale exact precondition before physical execution
ok 514 - D authoritative coordinator isolates stale exact precondition before physical execution
  ---
  duration_ms: 0.285
  type: 'test'
  ...
# Subtest: D authoritative coordinator refuses mutation when exact BASE convergence authority is unavailable
ok 515 - D authoritative coordinator refuses mutation when exact BASE convergence authority is unavailable
  ---
  duration_ms: 0.2702
  type: 'test'
  ...
# Subtest: D authoritative coordinator refuses operation when trusted mapping disagrees with operation
ok 516 - D authoritative coordinator refuses operation when trusted mapping disagrees with operation
  ---
  duration_ms: 0.2496
  type: 'test'
  ...
# Subtest: D remote-feed learning progresses independently while an unrelated path remains conflicted
ok 517 - D remote-feed learning progresses independently while an unrelated path remains conflicted
  ---
  duration_ms: 0.2892
  type: 'test'
  ...
# Subtest: D exact common-state proof produces BASE healing transition without a content rewrite operation
ok 518 - D exact common-state proof produces BASE healing transition without a content rewrite operation
  ---
  duration_ms: 0.1783
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-file physical mutation
ok 519 - D durable mutation lifecycle persists intent and dispatch authority before local-file physical mutation
  ---
  duration_ms: 1.9449
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-file physical mutation
ok 520 - D durable mutation lifecycle persists intent and dispatch authority before remote-file physical mutation
  ---
  duration_ms: 0.4005
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-move physical mutation
ok 521 - D durable mutation lifecycle persists intent and dispatch authority before local-move physical mutation
  ---
  duration_ms: 0.3136
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-move physical mutation
ok 522 - D durable mutation lifecycle persists intent and dispatch authority before remote-move physical mutation
  ---
  duration_ms: 0.3071
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-trash physical mutation
ok 523 - D durable mutation lifecycle persists intent and dispatch authority before local-trash physical mutation
  ---
  duration_ms: 0.3164
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-trash physical mutation
ok 524 - D durable mutation lifecycle persists intent and dispatch authority before remote-trash physical mutation
  ---
  duration_ms: 0.2159
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-folder physical mutation
ok 525 - D durable mutation lifecycle persists intent and dispatch authority before local-folder physical mutation
  ---
  duration_ms: 0.2862
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-folder physical mutation
ok 526 - D durable mutation lifecycle persists intent and dispatch authority before remote-folder physical mutation
  ---
  duration_ms: 0.3392
  type: 'test'
  ...
# Subtest: D post-dispatch uncertainty is durable and restart never blindly redispatches
ok 527 - D post-dispatch uncertainty is durable and restart never blindly redispatches
  ---
  duration_ms: 0.8076
  type: 'test'
  ...
# Subtest: D conflict-preserved dispatch reaches bounded quiescence rather than immediate retry
ok 528 - D conflict-preserved dispatch reaches bounded quiescence rather than immediate retry
  ---
  duration_ms: 0.3745
  type: 'test'
  ...
# Subtest: D authoritative state commit requires exact durable physical verification reference
ok 529 - D authoritative state commit requires exact durable physical verification reference
  ---
  duration_ms: 0.4438
  type: 'test'
  ...
# Subtest: D clean merge tracks each physical effect independently across crash/restart
ok 530 - D clean merge tracks each physical effect independently across crash/restart
  ---
  duration_ms: 0.4877
  type: 'test'
  ...
# Subtest: C2 verified non-application retires a no-effect durable intent and permits renewed planning authority
ok 531 - C2 verified non-application retires a no-effect durable intent and permits renewed planning authority
  ---
  duration_ms: 0.3769
  type: 'test'
  ...
# Subtest: C2 verified non-application cannot retire a partially progressed multi-effect operation
ok 532 - C2 verified non-application cannot retire a partially progressed multi-effect operation
  ---
  duration_ms: 0.3281
  type: 'test'
  ...
# Subtest: D reliable Changes traversal retains prior-page removals and exposes only terminal newStartPageToken
ok 533 - D reliable Changes traversal retains prior-page removals and exposes only terminal newStartPageToken
  ---
  duration_ms: 3.0864
  type: 'test'
  ...
# Subtest: D failure before terminal Changes page cannot advance durable cursor authority
ok 534 - D failure before terminal Changes page cannot advance durable cursor authority
  ---
  duration_ms: 1.04
  type: 'test'
  ...
# Subtest: D absence of ReliableRemoteChangePort falls back to full reconciliation instead of legacy readChanges
ok 535 - D absence of ReliableRemoteChangePort falls back to full reconciliation instead of legacy readChanges
  ---
  duration_ms: 0.5635
  type: 'test'
  ...
# Subtest: D actual controller plus product executor has no nominal-only ordinary mutation fallback
ok 536 - D actual controller plus product executor has no nominal-only ordinary mutation fallback
  ---
  duration_ms: 13.5655
  type: 'test'
  ...
# Subtest: D production update stops at effect-verified until authoritative canonical commit occurs
ok 537 - D production update stops at effect-verified until authoritative canonical commit occurs
  ---
  duration_ms: 6.8259
  type: 'test'
  ...
# Subtest: D authoritative production adapter vetoes mutation when independent remote observation disagrees
ok 538 - D authoritative production adapter vetoes mutation when independent remote observation disagrees
  ---
  duration_ms: 0.4038
  type: 'test'
  ...
# Subtest: D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
ok 539 - D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
  ---
  duration_ms: 1.9115
  type: 'test'
  ...
# Subtest: D missing writable/frozen production mutation dependencies fail closed before physical dispatch
ok 540 - D missing writable/frozen production mutation dependencies fail closed before physical dispatch
  ---
  duration_ms: 0.4917
  type: 'test'
  ...
# Subtest: default breaker permits a small ordinary trusted deletion below every threshold
ok 541 - default breaker permits a small ordinary trusted deletion below every threshold
  ---
  duration_ms: 0.5381
  type: 'test'
  ...
# Subtest: default absolute-count boundary blocks exactly at the configured threshold
ok 542 - default absolute-count boundary blocks exactly at the configured threshold
  ---
  duration_ms: 0.2346
  type: 'test'
  ...
# Subtest: default affected-percentage boundary blocks at the configured fraction even below absolute count
ok 543 - default affected-percentage boundary blocks at the configured fraction even below absolute count
  ---
  duration_ms: 0.1723
  type: 'test'
  ...
# Subtest: reconstructed or untrusted state makes even one destructive operation review-only
ok 544 - reconstructed or untrusted state makes even one destructive operation review-only
  ---
  duration_ms: 0.1597
  type: 'test'
  ...
# Subtest: approval remains scoped to the exact reviewed plan and a concrete recovery checkpoint
ok 545 - approval remains scoped to the exact reviewed plan and a concrete recovery checkpoint
  ---
  duration_ms: 0.4794
  type: 'test'
  ...
# Subtest: production planner prevents a stale current device from authorizing any destructive plan
ok 546 - production planner prevents a stale current device from authorizing any destructive plan
  ---
  duration_ms: 2.5412
  type: 'test'
  ...
# Subtest: tombstones expire at the configured bound only when every known device is current
ok 547 - tombstones expire at the configured bound only when every known device is current
  ---
  duration_ms: 0.4992
  type: 'test'
  ...
# Subtest: Phase 6 C: authorization rejects a token grant broader than exact drive.file
ok 548 - Phase 6 C: authorization rejects a token grant broader than exact drive.file
  ---
  duration_ms: 59.5543
  type: 'test'
  ...
# Subtest: Phase 6 C: previously persisted broader-scope token fails closed before remote use
ok 549 - Phase 6 C: previously persisted broader-scope token fails closed before remote use
  ---
  duration_ms: 0.6712
  type: 'test'
  ...
# Subtest: Phase 6 C: refresh cannot silently broaden an exact drive.file grant
ok 550 - Phase 6 C: refresh cannot silently broaden an exact drive.file grant
  ---
  duration_ms: 0.7745
  type: 'test'
  ...
# Subtest: Phase 6 C: refresh remains valid when Google omits scope and existing grant is exact
ok 551 - Phase 6 C: refresh remains valid when Google omits scope and existing grant is exact
  ---
  duration_ms: 1.0191
  type: 'test'
  ...
# Subtest: Phase 6 C: exact reauthorization never carries forward a broader-scope refresh token
ok 552 - Phase 6 C: exact reauthorization never carries forward a broader-scope refresh token
  ---
  duration_ms: 3.5305
  type: 'test'
  ...
# Subtest: Phase 6 C: hosted callback remains authorization-only and content/token nonpersistent
ok 553 - Phase 6 C: hosted callback remains authorization-only and content/token nonpersistent
  ---
  duration_ms: 2.5149
  type: 'test'
  ...
# Subtest: Phase 6 C: callback deployment policy is no-store, no-referrer, and tightly sandboxed
ok 554 - Phase 6 C: callback deployment policy is no-store, no-referrer, and tightly sandboxed
  ---
  duration_ms: 1.9532
  type: 'test'
  ...
# Subtest: C01 regression: scoped artifact paths are safe deterministic siblings for root and nested targets
ok 555 - C01 regression: scoped artifact paths are safe deterministic siblings for root and nested targets
  ---
  duration_ms: 12.0484
  type: 'test'
  ...
# Subtest: C01 regression: commit and recovery reuse the exact corrected physical artifact mapping
ok 556 - C01 regression: commit and recovery reuse the exact corrected physical artifact mapping
  ---
  duration_ms: 4.0601
  type: 'test'
  ...
# Subtest: D terminal two-page batch is durably learned before cursor advancement while sibling path conflict remains unresolved
ok 557 - D terminal two-page batch is durably learned before cursor advancement while sibling path conflict remains unresolved
  ---
  duration_ms: 14.4709
  type: 'test'
  ...
# Subtest: D later unrelated REMOTE changes continue from durable learned terminal while prior conflicted facts remain in backlog
ok 558 - D later unrelated REMOTE changes continue from durable learned terminal while prior conflicted facts remain in backlog
  ---
  duration_ms: 3.1207
  type: 'test'
  ...
# Subtest: D-C9 actual partial conflict run still learns terminal batch and next run progresses to later REMOTE facts
ok 559 - D-C9 actual partial conflict run still learns terminal batch and next run progresses to later REMOTE facts
  ---
  duration_ms: 3.6696
  type: 'test'
  ...
# Subtest: D repeated already-learned terminal batch is idempotent
ok 560 - D repeated already-learned terminal batch is idempotent
  ---
  duration_ms: 1.811
  type: 'test'
  ...
# Subtest: D absent writable authority store cannot advance terminal REMOTE feed checkpoint
ok 561 - D absent writable authority store cannot advance terminal REMOTE feed checkpoint
  ---
  duration_ms: 3.1357
  type: 'test'
  ...
# Subtest: D failure before terminal creates no learned batch and advances no checkpoint
ok 562 - D failure before terminal creates no learned batch and advances no checkpoint
  ---
  duration_ms: 1.223
  type: 'test'
  ...
# Subtest: D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
ok 563 - D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
  ---
  duration_ms: 3.371
  type: 'test'
  ...
# Subtest: D-C7 stale canonical CAS leaves durable effect at effect-verified
ok 564 - D-C7 stale canonical CAS leaves durable effect at effect-verified
  ---
  duration_ms: 0.4395
  type: 'test'
  ...
# Subtest: D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
ok 565 - D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
  ---
  duration_ms: 0.7855
  type: 'test'
  ...
# Subtest: D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
ok 566 - D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
  ---
  duration_ms: 1.0737
  type: 'test'
  ...
# Subtest: D-C8 production REMOTE folder reserved identity is carried into the verified receipt
ok 567 - D-C8 production REMOTE folder reserved identity is carried into the verified receipt
  ---
  duration_ms: 5.7025
  type: 'test'
  ...
# Subtest: D production REMOTE file create uses reserved ReliableRemoteMutationPort and stops at effect-verified
ok 568 - D production REMOTE file create uses reserved ReliableRemoteMutationPort and stops at effect-verified
  ---
  duration_ms: 2.83
  type: 'test'
  ...
# Subtest: D production REMOTE move and trash use frozen mutation methods, never raw Drive methods
ok 569 - D production REMOTE move and trash use frozen mutation methods, never raw Drive methods
  ---
  duration_ms: 2.4279
  type: 'test'
  ...
# Subtest: D production LOCAL file create and replace use LocalTransactionalMutationPort
ok 570 - D production LOCAL file create and replace use LocalTransactionalMutationPort
  ---
  duration_ms: 3.0341
  type: 'test'
  ...
# Subtest: D production LOCAL folder create, move, and trash persist descriptors before physical mutation
ok 571 - D production LOCAL folder create, move, and trash persist descriptors before physical mutation
  ---
  duration_ms: 3.0651
  type: 'test'
  ...
# Subtest: D production clean merge persists and verifies independent LOCAL and REMOTE effects
ok 572 - D production clean merge persists and verifies independent LOCAL and REMOTE effects
  ---
  duration_ms: 1.8814
  type: 'test'
  ...
# Subtest: D production restart from intent-persisted never dispatches; dispatch-authorized and outcome-unknown reconcile without blind redispatch
ok 573 - D production restart from intent-persisted never dispatches; dispatch-authorized and outcome-unknown reconcile without blind redispatch
  ---
  duration_ms: 4.0578
  type: 'test'
  ...
# Subtest: D physical verification without unique logical-path convergence remains blocked and cannot become state-committed
ok 574 - D physical verification without unique logical-path convergence remains blocked and cannot become state-committed
  ---
  duration_ms: 0.6407
  type: 'test'
  ...
# Subtest: D-C10 planner-generated upload-update gains exactly one trusted identity authority proof
ok 575 - D-C10 planner-generated upload-update gains exactly one trusted identity authority proof
  ---
  duration_ms: 2.609
  type: 'test'
  ...
# Subtest: D-C10 upload-update blocks missing, duplicate, and contradictory identity mappings
ok 576 - D-C10 upload-update blocks missing, duplicate, and contradictory identity mappings
  ---
  duration_ms: 0.5099
  type: 'test'
  ...
# Subtest: D-C10 planner-generated trash-remote gains exactly one trusted identity authority proof
ok 577 - D-C10 planner-generated trash-remote gains exactly one trusted identity authority proof
  ---
  duration_ms: 0.3208
  type: 'test'
  ...
# Subtest: D-C10 trash-remote blocks missing, duplicate, and contradictory identity mappings
ok 578 - D-C10 trash-remote blocks missing, duplicate, and contradictory identity mappings
  ---
  duration_ms: 0.2672
  type: 'test'
  ...
# Subtest: D-C10 nominal identity-unambiguous marker cannot manufacture executable authority
ok 579 - D-C10 nominal identity-unambiguous marker cannot manufacture executable authority
  ---
  duration_ms: 0.8385
  type: 'test'
  ...
# Subtest: D-C10 planner-generated upload-update reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
ok 580 - D-C10 planner-generated upload-update reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
  ---
  duration_ms: 1.7013
  type: 'test'
  ...
# Subtest: D-C10 planner-generated trash-remote reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
ok 581 - D-C10 planner-generated trash-remote reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
  ---
  duration_ms: 1.0217
  type: 'test'
  ...
# Subtest: D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
ok 582 - D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
  ---
  duration_ms: 2.5763
  type: 'test'
  ...
# Subtest: D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
ok 583 - D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
  ---
  duration_ms: 3.2648
  type: 'test'
  ...
# Subtest: D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
ok 584 - D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
  ---
  duration_ms: 1.7378
  type: 'test'
  ...
# Subtest: D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
ok 585 - D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
  ---
  duration_ms: 0.654
  type: 'test'
  ...
# Subtest: D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
ok 586 - D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
  ---
  duration_ms: 0.6416
  type: 'test'
  ...
# Subtest: D-C12 persisted update candidate identity becomes canonical
ok 587 - D-C12 persisted update candidate identity becomes canonical
  ---
  duration_ms: 1.3427
  type: 'test'
  ...
# Subtest: D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
ok 588 - D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
  ---
  duration_ms: 15.9876
  type: 'test'
  ...
# Subtest: D-C11 controller recovers outstanding durable work before a fresh planner returns noop
ok 589 - D-C11 controller recovers outstanding durable work before a fresh planner returns noop
  ---
  duration_ms: 2.1388
  type: 'test'
  ...
# Subtest: LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
ok 590 - LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
  ---
  duration_ms: 6.135
  type: 'test'
  ...
# Subtest: LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
ok 591 - LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
  ---
  duration_ms: 0.7955
  type: 'test'
  ...
# Subtest: LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
ok 592 - LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
  ---
  duration_ms: 1.6352
  type: 'test'
  ...
# Subtest: LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
ok 593 - LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
  ---
  duration_ms: 4.7057
  type: 'test'
  ...
# Subtest: D-C11 effect-verified restart re-observes convergence and preserves evidence when physical reality diverged
ok 594 - D-C11 effect-verified restart re-observes convergence and preserves evidence when physical reality diverged
  ---
  duration_ms: 0.8224
  type: 'test'
  ...
# Subtest: D-C13-T1 ordinary convergence requires the candidate to be the sole live path occupant
ok 595 - D-C13-T1 ordinary convergence requires the candidate to be the sole live path occupant
  ---
  duration_ms: 1.5271
  type: 'test'
  ...
# Subtest: D-C13-T2 restart retires the exact predecessor/candidate intermediate without redispatching content
ok 596 - D-C13-T2 restart retires the exact predecessor/candidate intermediate without redispatching content
  ---
  duration_ms: 1.5856
  type: 'test'
  ...
# Subtest: D-C13-T3 REMOTE create retains strict exact-one same-path convergence
ok 597 - D-C13-T3 REMOTE create retains strict exact-one same-path convergence
  ---
  duration_ms: 0.5813
  type: 'test'
  ...
# Subtest: D-C13-T4 wrong predecessor identity is rejected
ok 598 - D-C13-T4 wrong predecessor identity is rejected
  ---
  duration_ms: 0.685
  type: 'test'
  ...
# Subtest: D-C13-T5 unexpected third same-path object is rejected
ok 599 - D-C13-T5 unexpected third same-path object is rejected
  ---
  duration_ms: 0.5329
  type: 'test'
  ...
# Subtest: D-C13-T6 wrong candidate identity and candidate content mismatch are both rejected
ok 600 - D-C13-T6 wrong candidate identity and candidate content mismatch are both rejected
  ---
  duration_ms: 2.0647
  type: 'test'
  ...
# Subtest: D-C13-T7 predecessor revision mismatch is rejected
ok 601 - D-C13-T7 predecessor revision mismatch is rejected
  ---
  duration_ms: 0.5965
  type: 'test'
  ...
# Subtest: v1.1 authority store: LOCAL folder intent fits authoritative metadata without a sidecar
ok 602 - v1.1 authority store: LOCAL folder intent fits authoritative metadata without a sidecar
  ---
  duration_ms: 1.4209
  type: 'test'
  ...
# Subtest: v1.1 authority store: REMOTE folder intent fits authoritative metadata with reserved identity
ok 603 - v1.1 authority store: REMOTE folder intent fits authoritative metadata with reserved identity
  ---
  duration_ms: 0.4713
  type: 'test'
  ...
# Subtest: v1.1 authority store: LOCAL folder save then restart/load preserves stage and structural authority
ok 604 - v1.1 authority store: LOCAL folder save then restart/load preserves stage and structural authority
  ---
  duration_ms: 1.63
  type: 'test'
  ...
# Subtest: v1.1 authority store: REMOTE reserved identity survives save then restart/load unchanged
ok 605 - v1.1 authority store: REMOTE reserved identity survives save then restart/load unchanged
  ---
  duration_ms: 0.5059
  type: 'test'
  ...
# Subtest: v1.1 authority store: shared completion semantics require every folder-capable effect state-committed
ok 606 - v1.1 authority store: shared completion semantics require every folder-capable effect state-committed
  ---
  duration_ms: 0.2983
  type: 'test'
  ...
# Subtest: v1.1 authority store: C and D exchange folder intent solely through frozen metadata/store contract
ok 607 - v1.1 authority store: C and D exchange folder intent solely through frozen metadata/store contract
  ---
  duration_ms: 0.5074
  type: 'test'
  ...
# Subtest: folder create: local intent persisted before dispatch is safely unattempted
ok 608 - folder create: local intent persisted before dispatch is safely unattempted
  ---
  duration_ms: 2.5296
  type: 'test'
  ...
# Subtest: folder create: local dispatch authority means physical reality must be reconciled
ok 609 - folder create: local dispatch authority means physical reality must be reconciled
  ---
  duration_ms: 0.2097
  type: 'test'
  ...
# Subtest: folder create: local folder requires structural path authority before verified effect
ok 610 - folder create: local folder requires structural path authority before verified effect
  ---
  duration_ms: 0.3638
  type: 'test'
  ...
# Subtest: folder create: local authoritative absence is verified-not-applied
ok 611 - folder create: local authoritative absence is verified-not-applied
  ---
  duration_ms: 0.1854
  type: 'test'
  ...
# Subtest: folder create: remote lost response reconciles the same reserved Drive identity
ok 612 - folder create: remote lost response reconciles the same reserved Drive identity
  ---
  duration_ms: 0.3109
  type: 'test'
  ...
# Subtest: folder create: remote reserved identity can prove definitely not applied and be retried with same authority
ok 613 - folder create: remote reserved identity can prove definitely not applied and be retried with same authority
  ---
  duration_ms: 0.1588
  type: 'test'
  ...
# Subtest: folder create: same logical remote path with wrong object identity is conflict, not convergence
ok 614 - folder create: same logical remote path with wrong object identity is conflict, not convergence
  ---
  duration_ms: 0.1429
  type: 'test'
  ...
# Subtest: folder create: empty folder lifecycle uses structural proof and still requires path convergence before authoritative commit
ok 615 - folder create: empty folder lifecycle uses structural proof and still requires path convergence before authoritative commit
  ---
  duration_ms: 0.2075
  type: 'test'
  ...
# Subtest: v1.2 T1: correct reserved folder under correct observed parent is verified-effect
ok 616 - v1.2 T1: correct reserved folder under correct observed parent is verified-effect
  ---
  duration_ms: 2.2378
  type: 'test'
  ...
# Subtest: v1.2 T2: correct reserved folder under wrong observed parent is conservative conflict
ok 617 - v1.2 T2: correct reserved folder under wrong observed parent is conservative conflict
  ---
  duration_ms: 0.4006
  type: 'test'
  ...
# Subtest: v1.2 T3: correct reserved ID at wrong structural path is not success
ok 618 - v1.2 T3: correct reserved ID at wrong structural path is not success
  ---
  duration_ms: 0.511
  type: 'test'
  ...
# Subtest: v1.2 T4: reserved ID missing while intended path is occupied is conflict, not verified-not-applied
ok 619 - v1.2 T4: reserved ID missing while intended path is occupied is conflict, not verified-not-applied
  ---
  duration_ms: 0.5447
  type: 'test'
  ...
# Subtest: v1.2 T5: authoritative reserved-ID absence plus clear target may establish verified-not-applied
ok 620 - v1.2 T5: authoritative reserved-ID absence plus clear target may establish verified-not-applied
  ---
  duration_ms: 0.5051
  type: 'test'
  ...
# Subtest: v1.2 T6: duplicate or ambiguous logical path never selects an arbitrary candidate
ok 621 - v1.2 T6: duplicate or ambiguous logical path never selects an arbitrary candidate
  ---
  duration_ms: 0.2623
  type: 'test'
  ...
# Subtest: v1.2 T7: incomplete parent/path observation remains outcome-unknown
ok 622 - v1.2 T7: incomplete parent/path observation remains outcome-unknown
  ---
  duration_ms: 0.5318
  type: 'test'
  ...
# Subtest: v1.2 T8: restart from dispatch-authorized performs read-only reconciliation before any redispatch
ok 623 - v1.2 T8: restart from dispatch-authorized performs read-only reconciliation before any redispatch
  ---
  duration_ms: 1.5673
  type: 'test'
  ...
# Subtest: v1.2 T9: restart from outcome-unknown performs the same read-only reconciliation before redispatch
ok 624 - v1.2 T9: restart from outcome-unknown performs the same read-only reconciliation before redispatch
  ---
  duration_ms: 0.7403
  type: 'test'
  ...
# Subtest: v1.2 T10: intended parent in descriptor is expectation, not observed proof
ok 625 - v1.2 T10: intended parent in descriptor is expectation, not observed proof
  ---
  duration_ms: 0.64
  type: 'test'
  ...
# Subtest: foundation v1.3 C1: Drive authentication maps to public provenance and survives lazy carrier/extractor
ok 626 - foundation v1.3 C1: Drive authentication maps to public provenance and survives lazy carrier/extractor
  ---
  duration_ms: 2.6472
  type: 'test'
  ...
# Subtest: foundation v1.3 C2: transient Drive failure maps to public provenance
ok 627 - foundation v1.3 C2: transient Drive failure maps to public provenance
  ---
  duration_ms: 0.2035
  type: 'test'
  ...
# Subtest: foundation v1.3 C3: rate-limit mapping preserves exactly retryAfterMs 5000
ok 628 - foundation v1.3 C3: rate-limit mapping preserves exactly retryAfterMs 5000
  ---
  duration_ms: 0.1638
  type: 'test'
  ...
# Subtest: foundation v1.3 C4: not-found has no context-free operational recovery provenance
ok 629 - foundation v1.3 C4: not-found has no context-free operational recovery provenance
  ---
  duration_ms: 0.1702
  type: 'test'
  ...
# Subtest: foundation v1.3 C5: conflict has no context-free operational recovery provenance
ok 630 - foundation v1.3 C5: conflict has no context-free operational recovery provenance
  ---
  duration_ms: 0.3154
  type: 'test'
  ...
# Subtest: foundation v1.3 C6: generic local I/O uncertainty fabricates no remote provenance
ok 631 - foundation v1.3 C6: generic local I/O uncertainty fabricates no remote provenance
  ---
  duration_ms: 0.2042
  type: 'test'
  ...
# Subtest: foundation v1.3 C7: physically unknown remote mutation plus transient provenance remains physically unknown
ok 632 - foundation v1.3 C7: physically unknown remote mutation plus transient provenance remains physically unknown
  ---
  duration_ms: 0.2314
  type: 'test'
  ...
# Subtest: foundation v1.3 C8: verified-not-applied and outcome-unknown remain distinct under same operational cause
ok 633 - foundation v1.3 C8: verified-not-applied and outcome-unknown remain distinct under same operational cause
  ---
  duration_ms: 0.1846
  type: 'test'
  ...
# Subtest: foundation v1.3 T3: verified-not-applied authentication preserves safe execution without fabricated reconciliation
ok 634 - foundation v1.3 T3: verified-not-applied authentication preserves safe execution without fabricated reconciliation
  ---
  duration_ms: 0.736
  type: 'test'
  ...
# Subtest: foundation v1.3 C9: uncertain authentication surfaces auth while requiring physical reconciliation
ok 635 - foundation v1.3 C9: uncertain authentication surfaces auth while requiring physical reconciliation
  ---
  duration_ms: 0.697
  type: 'test'
  ...
# Subtest: foundation v1.3 C10: uncertain rate limit preserves timing and forbids redispatch until reconciliation
ok 636 - foundation v1.3 C10: uncertain rate limit preserves timing and forbids redispatch until reconciliation
  ---
  duration_ms: 0.2692
  type: 'test'
  ...
# Subtest: foundation v1.3 C11: uncertain result without provenance becomes conservative recovery
ok 637 - foundation v1.3 C11: uncertain result without provenance becomes conservative recovery
  ---
  duration_ms: 0.1689
  type: 'test'
  ...
# Subtest: foundation v1.3 C12: ordinary retry requires explicit no-unresolved-effect physical authority
ok 638 - foundation v1.3 C12: ordinary retry requires explicit no-unresolved-effect physical authority
  ---
  duration_ms: 0.1887
  type: 'test'
  ...
# Subtest: foundation v1.3 C13: rate-limit timing has one execution authority
ok 639 - foundation v1.3 C13: rate-limit timing has one execution authority
  ---
  duration_ms: 0.2158
  type: 'test'
  ...
# Subtest: foundation v1.3 C14: recovery-required physical state cannot be erased by operational metadata
ok 640 - foundation v1.3 C14: recovery-required physical state cannot be erased by operational metadata
  ---
  duration_ms: 0.1043
  type: 'test'
  ...
# Subtest: foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes
ok 641 - foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes
  ---
  duration_ms: 945.7234
  type: 'test'
  ...
# Subtest: foundation v1.3 C16: documentation succession material is appended after approved predecessor prefixes
ok 642 - foundation v1.3 C16: documentation succession material is appended after approved predecessor prefixes
  ---
  duration_ms: 4.1363
  type: 'test'
  ...
# Subtest: H-I1 REMOTE create composes C durable authority, A reserved identity, D verification, and canonical commit
ok 643 - H-I1 REMOTE create composes C durable authority, A reserved identity, D verification, and canonical commit
  ---
  duration_ms: 77.4561
  type: 'test'
  ...
# Subtest: H-I2 REMOTE trash uses current C identity authority through A and fails closed when the mapping is absent
ok 644 - H-I2 REMOTE trash uses current C identity authority through A and fails closed when the mapping is absent
  ---
  duration_ms: 8.9801
  type: 'test'
  ...
# Subtest: H-I3 C-persisted dispatch-authorized create restarts through D observation without redispatch and becomes inert after state commit
ok 645 - H-I3 C-persisted dispatch-authorized create restarts through D observation without redispatch and becomes inert after state commit
  ---
  duration_ms: 12.7344
  type: 'test'
  ...
# Subtest: H-I4 D LOCAL mutation uses H logical mapping and B crash-safe transaction for portable configuration
ok 646 - H-I4 D LOCAL mutation uses H logical mapping and B crash-safe transaction for portable configuration
  ---
  duration_ms: 14.6523
  type: 'test'
  ...
# Subtest: H-I8 missing writable C, A reliable REMOTE, or B LOCAL transaction seam fails closed without legacy mutation
ok 647 - H-I8 missing writable C, A reliable REMOTE, or B LOCAL transaction seam fails closed without legacy mutation
  ---
  duration_ms: 4.6135
  type: 'test'
  ...
# Subtest: H-I5 E periodic integrity uses B cache-bypassing bytes, schedules reconciliation on drift, and suspension prevents a new run
ok 648 - H-I5 E periodic integrity uses B cache-bypassing bytes, schedules reconciliation on drift, and suspension prevents a new run
  ---
  duration_ms: 15.3449
  type: 'test'
  ...
# Subtest: H-I6 A Changes traverse all pages; C durable learning precedes cursor mirror and restart consumes durable facts
ok 649 - H-I6 A Changes traverse all pages; C durable learning precedes cursor mirror and restart consumes durable facts
  ---
  duration_ms: 25.9985
  type: 'test'
  ...
# Subtest: H-I6 failure to durably learn the terminal A batch prevents canonical cursor advancement
ok 650 - H-I6 failure to durably learn the terminal A batch prevents canonical cursor advancement
  ---
  duration_ms: 10.7175
  type: 'test'
  ...
# Subtest: H-I7 F clean merge requires independent B LOCAL and A REMOTE durable verification before C canonical commit
ok 651 - H-I7 F clean merge requires independent B LOCAL and A REMOTE durable verification before C canonical commit
  ---
  duration_ms: 35.9135
  type: 'test'
  ...
# Subtest: 01 exact BASE authority is required by transitions
ok 652 - 01 exact BASE authority is required by transitions
  ---
  duration_ms: 3.2448
  type: 'test'
  ...
# Subtest: 02 exact identity authority is required before mapped remote mutation
ok 653 - 02 exact identity authority is required before mapped remote mutation
  ---
  duration_ms: 0.4958
  type: 'test'
  ...
# Subtest: 03 upload survives crash/restart at every durable effect stage
ok 654 - 03 upload survives crash/restart at every durable effect stage
  ---
  duration_ms: 20.588
  type: 'test'
  ...
# Subtest: 04 download survives crash/restart at every durable effect stage
ok 655 - 04 download survives crash/restart at every durable effect stage
  ---
  duration_ms: 3.3002
  type: 'test'
  ...
# Subtest: 05 move survives crash/restart at every durable effect stage
ok 656 - 05 move survives crash/restart at every durable effect stage
  ---
  duration_ms: 2.1967
  type: 'test'
  ...
# Subtest: 06 trash survives crash/restart at every durable effect stage
ok 657 - 06 trash survives crash/restart at every durable effect stage
  ---
  duration_ms: 1.1845
  type: 'test'
  ...
# Subtest: 07 clean merge requires both physical effects before BASE convergence
ok 658 - 07 clean merge requires both physical effects before BASE convergence
  ---
  duration_ms: 0.8394
  type: 'test'
  ...
# Subtest: 08 intended candidate plus independent candidate preserves conflict
ok 659 - 08 intended candidate plus independent candidate preserves conflict
  ---
  duration_ms: 0.6497
  type: 'test'
  ...
# Subtest: 09 independent candidate cannot be collapsed without explicit authority
ok 660 - 09 independent candidate cannot be collapsed without explicit authority
  ---
  duration_ms: 0.3218
  type: 'test'
  ...
# Subtest: 10 durable intended L1 is not substituted by later L2
ok 661 - 10 durable intended L1 is not substituted by later L2
  ---
  duration_ms: 0.8278
  type: 'test'
  ...
# Subtest: 11 outcome-unknown reconciles physical reality without blind redispatch
ok 662 - 11 outcome-unknown reconciles physical reality without blind redispatch
  ---
  duration_ms: 0.4407
  type: 'test'
  ...
# Subtest: 12 clean merge crash after one effect cannot commit logical convergence
ok 663 - 12 clean merge crash after one effect cannot commit logical convergence
  ---
  duration_ms: 0.7297
  type: 'test'
  ...
# Subtest: 13 multi-page changes advance cursor only on durable terminal page
ok 664 - 13 multi-page changes advance cursor only on durable terminal page
  ---
  duration_ms: 0.4969
  type: 'test'
  ...
# Subtest: 14 multiple learned removal batches remain durable across restart
ok 665 - 14 multiple learned removal batches remain durable across restart
  ---
  duration_ms: 0.2761
  type: 'test'
  ...
# Subtest: 15 repeated moves preserve stable remote identity
ok 666 - 15 repeated moves preserve stable remote identity
  ---
  duration_ms: 0.9323
  type: 'test'
  ...
# Subtest: 16 create-delete sequence preserves acknowledged deletion history
ok 667 - 16 create-delete sequence preserves acknowledged deletion history
  ---
  duration_ms: 1.092
  type: 'test'
  ...
# Subtest: 17 duplicate logical paths become conflict through resolution transition
ok 668 - 17 duplicate logical paths become conflict through resolution transition
  ---
  duration_ms: 0.3833
  type: 'test'
  ...
# Subtest: 18 unresolved path A does not block safe path B progress
ok 669 - 18 unresolved path A does not block safe path B progress
  ---
  duration_ms: 1.0794
  type: 'test'
  ...
# Subtest: 19 missed watcher is discovered by integrity reconciliation
ok 670 - 19 missed watcher is discovered by integrity reconciliation
  ---
  duration_ms: 0.787
  type: 'test'
  ...
# Subtest: 20 Windows watcher-event loss is recoverable through authoritative integrity read
ok 671 - 20 Windows watcher-event loss is recoverable through authoritative integrity read
  ---
  duration_ms: 0.5122
  type: 'test'
  ...
# Subtest: 21 suspend/resume preserves durable work and resumes safely
ok 672 - 21 suspend/resume preserves durable work and resumes safely
  ---
  duration_ms: 0.4515
  type: 'test'
  ...
# Subtest: 22 abrupt process death reconstructs only durable state
ok 673 - 22 abrupt process death reconstructs only durable state
  ---
  duration_ms: 0.2299
  type: 'test'
  ...
# Subtest: 23 delivered cancellation stops dispatch while durable intent remains
ok 674 - 23 delivered cancellation stops dispatch while durable intent remains
  ---
  duration_ms: 0.2727
  type: 'test'
  ...
# Subtest: 24 cancellation not delivered before death cannot erase persisted intent
ok 675 - 24 cancellation not delivered before death cannot erase persisted intent
  ---
  duration_ms: 0.5867
  type: 'test'
  ...
# Subtest: 25 auth loss cannot dispatch destructive work
ok 676 - 25 auth loss cannot dispatch destructive work
  ---
  duration_ms: 0.3332
  type: 'test'
  ...
# Subtest: 26 offline and rate-limited states preserve local-first edits
ok 677 - 26 offline and rate-limited states preserve local-first edits
  ---
  duration_ms: 0.4767
  type: 'test'
  ...
# Subtest: 27 churn on path A does not starve path B
ok 678 - 27 churn on path A does not starve path B
  ---
  duration_ms: 1.724
  type: 'test'
  ...
# Subtest: 28 bounded quiescence after mutation pressure stops
ok 679 - 28 bounded quiescence after mutation pressure stops
  ---
  duration_ms: 0.5538
  type: 'test'
  ...
# Subtest: 29 concurrent same-path creates never silently select one remote winner
ok 680 - 29 concurrent same-path creates never silently select one remote winner
  ---
  duration_ms: 1.2298
  type: 'test'
  ...
# Subtest: 30 stale state cannot authorize destructive propagation
ok 681 - 30 stale state cannot authorize destructive propagation
  ---
  duration_ms: 0.366
  type: 'test'
  ...
# Subtest: 31 incomplete remote coverage blocks a mass-deletion plan
ok 682 - 31 incomplete remote coverage blocks a mass-deletion plan
  ---
  duration_ms: 1.4071
  type: 'test'
  ...
# Subtest: 32 bounded merge refusal preserves both complete versions
ok 683 - 32 bounded merge refusal preserves both complete versions
  ---
  duration_ms: 0.2368
  type: 'test'
  ...
# Subtest: F1 exact observed reserved folder yields verified-effect
ok 684 - F1 exact observed reserved folder yields verified-effect
  ---
  duration_ms: 0.9016
  type: 'test'
  ...
# Subtest: F2 wrong actual parent is conflict-preserved
ok 685 - F2 wrong actual parent is conflict-preserved
  ---
  duration_ms: 0.2561
  type: 'test'
  ...
# Subtest: F3 wrong observed reserved-object path is conflict-preserved
ok 686 - F3 wrong observed reserved-object path is conflict-preserved
  ---
  duration_ms: 0.2587
  type: 'test'
  ...
# Subtest: F4 occupied intended target is conflict, never fabricated absence
ok 687 - F4 occupied intended target is conflict, never fabricated absence
  ---
  duration_ms: 0.2147
  type: 'test'
  ...
# Subtest: F5 authoritative exclusion of reserved identity and target occupants yields verified-not-applied
ok 688 - F5 authoritative exclusion of reserved identity and target occupants yields verified-not-applied
  ---
  duration_ms: 0.2715
  type: 'test'
  ...
# Subtest: F6 duplicate target candidates remain outcome-unknown
ok 689 - F6 duplicate target candidates remain outcome-unknown
  ---
  duration_ms: 0.4448
  type: 'test'
  ...
# Subtest: F7 incomplete parent observation remains outcome-unknown
ok 690 - F7 incomplete parent observation remains outcome-unknown
  ---
  duration_ms: 0.3365
  type: 'test'
  ...
# Subtest: F8 restart from dispatch-authorized observes before any redispatch
ok 691 - F8 restart from dispatch-authorized observes before any redispatch
  ---
  duration_ms: 0.282
  type: 'test'
  ...
# Subtest: F9 restart from outcome-unknown observes physical reality without a second dispatch
ok 692 - F9 restart from outcome-unknown observes physical reality without a second dispatch
  ---
  duration_ms: 0.415
  type: 'test'
  ...
# Subtest: F10 descriptor parent intent cannot fabricate observed parent authority
ok 693 - F10 descriptor parent intent cannot fabricate observed parent authority
  ---
  duration_ms: 0.3564
  type: 'test'
  ...
# Subtest: G-C2 wrong parent through generic recover cannot become effect-verified
ok 694 - G-C2 wrong parent through generic recover cannot become effect-verified
  ---
  duration_ms: 0.253
  type: 'test'
  ...
# Subtest: G-C2 occupied target with reserved ID absent remains conflict through generic recover
ok 695 - G-C2 occupied target with reserved ID absent remains conflict through generic recover
  ---
  duration_ms: 0.2008
  type: 'test'
  ...
# Subtest: G-C2 authoritatively clear target may retire only from verifier verified-not-applied
ok 696 - G-C2 authoritatively clear target may retire only from verifier verified-not-applied
  ---
  duration_ms: 0.2004
  type: 'test'
  ...
# Subtest: G-C2 response-loss recovery verifies exact physical folder without increasing dispatch count
ok 697 - G-C2 response-loss recovery verifies exact physical folder without increasing dispatch count
  ---
  duration_ms: 0.2767
  type: 'test'
  ...
# Subtest: G-C2 incomplete physical observation remains recovery through ordinary settle
ok 698 - G-C2 incomplete physical observation remains recovery through ordinary settle
  ---
  duration_ms: 0.9496
  type: 'test'
  ...
# Subtest: G-C2 generic recover routes multiple folder journals by exact journal identity
ok 699 - G-C2 generic recover routes multiple folder journals by exact journal identity
  ---
  duration_ms: 0.4992
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 1 is deterministic and invariant-checked
ok 700 - seeded randomized transition sequence 1 is deterministic and invariant-checked
  ---
  duration_ms: 5.7002
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 7 is deterministic and invariant-checked
ok 701 - seeded randomized transition sequence 7 is deterministic and invariant-checked
  ---
  duration_ms: 4.1248
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 42 is deterministic and invariant-checked
ok 702 - seeded randomized transition sequence 42 is deterministic and invariant-checked
  ---
  duration_ms: 4.462
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 1337 is deterministic and invariant-checked
ok 703 - seeded randomized transition sequence 1337 is deterministic and invariant-checked
  ---
  duration_ms: 4.9354
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 12648430 is deterministic and invariant-checked
ok 704 - seeded randomized transition sequence 12648430 is deterministic and invariant-checked
  ---
  duration_ms: 4.0014
  type: 'test'
  ...
# Subtest: explicit replay reapplies recorded event trace and reproduces exact modeled result
ok 705 - explicit replay reapplies recorded event trace and reproduces exact modeled result
  ---
  duration_ms: 1.1995
  type: 'test'
  ...
# Subtest: simple trace minimizer retains only events needed for the same invariant failure
ok 706 - simple trace minimizer retains only events needed for the same invariant failure
  ---
  duration_ms: 1.438
  type: 'test'
  ...
# Subtest: trace serialization is sanitized and contains no platform/user/auth secrets
ok 707 - trace serialization is sanitized and contains no platform/user/auth secrets
  ---
  duration_ms: 1.0155
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
ok 708 - v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
  ---
  duration_ms: 5.8002
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
ok 709 - v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
  ---
  duration_ms: 1.7948
  type: 'test'
  ...
# Subtest: v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
ok 710 - v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
  ---
  duration_ms: 1.3843
  type: 'test'
  ...
# Subtest: v1.1 verified folder effect restarts by finishing authoritative state commit
ok 711 - v1.1 verified folder effect restarts by finishing authoritative state commit
  ---
  duration_ms: 2.3399
  type: 'test'
  ...
# Subtest: v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
ok 712 - v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
  ---
  duration_ms: 0.4266
  type: 'test'
  ...
# Subtest: v1.1 journal-only folder updates advance persistence revision without semantic generation
ok 713 - v1.1 journal-only folder updates advance persistence revision without semantic generation
  ---
  duration_ms: 0.9871
  type: 'test'
  ...
# Subtest: explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
ok 714 - explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
  ---
  duration_ms: 2.8488
  type: 'test'
  ...
# Subtest: malformed or inconsistent persisted v1.1 folder journal fails closed
ok 715 - malformed or inconsistent persisted v1.1 folder journal fails closed
  ---
  duration_ms: 1.2099
  type: 'test'
  ...
# Subtest: v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
ok 716 - v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
  ---
  duration_ms: 0.829
  type: 'test'
  ...
# Subtest: LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
ok 717 - LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
  ---
  duration_ms: 6.2905
  type: 'test'
  ...
# Subtest: LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
ok 718 - LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
  ---
  duration_ms: 3.6567
  type: 'test'
  ...
# Subtest: LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
ok 719 - LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
  ---
  duration_ms: 2.1557
  type: 'test'
  ...
# Subtest: D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
ok 720 - D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
  ---
  duration_ms: 8.4131
  type: 'test'
  ...
# Subtest: D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
ok 721 - D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
  ---
  duration_ms: 4.0086
  type: 'test'
  ...
# Subtest: D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
ok 722 - D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
  ---
  duration_ms: 2.1639
  type: 'test'
  ...
# Subtest: D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
ok 723 - D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
  ---
  duration_ms: 1.0196
  type: 'test'
  ...
# Subtest: D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
ok 724 - D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
  ---
  duration_ms: 0.3401
  type: 'test'
  ...
# Subtest: D-C12 persisted update candidate identity becomes canonical
ok 725 - D-C12 persisted update candidate identity becomes canonical
  ---
  duration_ms: 3.1133
  type: 'test'
  ...
# Subtest: D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
ok 726 - D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
  ---
  duration_ms: 17.6621
  type: 'test'
  ...
# Subtest: D-C11 controller recovers outstanding durable work before a fresh planner returns noop
ok 727 - D-C11 controller recovers outstanding durable work before a fresh planner returns noop
  ---
  duration_ms: 6.8913
  type: 'test'
  ...
# Subtest: LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
ok 728 - LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
  ---
  duration_ms: 2.8908
  type: 'test'
  ...
# Subtest: LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
ok 729 - LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
  ---
  duration_ms: 1.0194
  type: 'test'
  ...
# Subtest: LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
ok 730 - LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
  ---
  duration_ms: 2.2503
  type: 'test'
  ...
# Subtest: LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
ok 731 - LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
  ---
  duration_ms: 1.2818
  type: 'test'
  ...
# Subtest: D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
ok 732 - D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
  ---
  duration_ms: 1.9641
  type: 'test'
  ...
# Subtest: D-C7 stale canonical CAS leaves durable effect at effect-verified
ok 733 - D-C7 stale canonical CAS leaves durable effect at effect-verified
  ---
  duration_ms: 0.6878
  type: 'test'
  ...
# Subtest: D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
ok 734 - D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
  ---
  duration_ms: 0.7316
  type: 'test'
  ...
# Subtest: D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
ok 735 - D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
  ---
  duration_ms: 1.6959
  type: 'test'
  ...
# Subtest: D actual controller plus product executor has no nominal-only ordinary mutation fallback
ok 736 - D actual controller plus product executor has no nominal-only ordinary mutation fallback
  ---
  duration_ms: 13.0707
  type: 'test'
  ...
# Subtest: D production update stops at effect-verified until authoritative canonical commit occurs
ok 737 - D production update stops at effect-verified until authoritative canonical commit occurs
  ---
  duration_ms: 6.6596
  type: 'test'
  ...
# Subtest: D authoritative production adapter vetoes mutation when independent remote observation disagrees
ok 738 - D authoritative production adapter vetoes mutation when independent remote observation disagrees
  ---
  duration_ms: 0.4352
  type: 'test'
  ...
# Subtest: D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
ok 739 - D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
  ---
  duration_ms: 1.5914
  type: 'test'
  ...
# Subtest: D missing writable/frozen production mutation dependencies fail closed before physical dispatch
ok 740 - D missing writable/frozen production mutation dependencies fail closed before physical dispatch
  ---
  duration_ms: 0.7434
  type: 'test'
  ...
# Subtest: H6C manual and Verify/Reconcile execution bind exact production diagnostic runs and terminal results
ok 741 - H6C manual and Verify/Reconcile execution bind exact production diagnostic runs and terminal results
  ---
  duration_ms: 3.8061
  type: 'test'
  ...
# Subtest: H6C sequential cycles with the same semantic plan ID retain distinct diagnostic runs without contamination
ok 742 - H6C sequential cycles with the same semantic plan ID retain distinct diagnostic runs without contamination
  ---
  duration_ms: 1.649
  type: 'test'
  ...
# Subtest: H6C a different authority cycle or validation run cannot consume another cycle's observed production run
ok 743 - H6C a different authority cycle or validation run cannot consume another cycle's observed production run
  ---
  duration_ms: 0.6735
  type: 'test'
  ...
# Subtest: H6C conflict resolution binds the observed conflict cycle to a fresh exact production diagnostic run
ok 744 - H6C conflict resolution binds the observed conflict cycle to a fresh exact production diagnostic run
  ---
  duration_ms: 1.3164
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for missing terminal correlation
ok 745 - H6C accepted execution remains unproven for missing terminal correlation
  ---
  duration_ms: 0.661
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for wrong-run terminal correlation
ok 746 - H6C accepted execution remains unproven for wrong-run terminal correlation
  ---
  duration_ms: 0.4004
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for duplicate terminal correlation
ok 747 - H6C accepted execution remains unproven for duplicate terminal correlation
  ---
  duration_ms: 0.686
  type: 'test'
  ...
# Subtest: H6C exact failed terminal remains distinguishable from successful completion
ok 748 - H6C exact failed terminal remains distinguishable from successful completion
  ---
  duration_ms: 1.9263
  type: 'test'
  ...
# Subtest: H6C exact cancelled terminal remains distinguishable from successful completion
ok 749 - H6C exact cancelled terminal remains distinguishable from successful completion
  ---
  duration_ms: 1.0449
  type: 'test'
  ...
# Subtest: H6C conflict correlation is rejected when the same observed conflict is ambiguous across authority cycles
ok 750 - H6C conflict correlation is rejected when the same observed conflict is ambiguous across authority cycles
  ---
  duration_ms: 1.1691
  type: 'test'
  ...
# Subtest: LAT-05 validates managed root before overlapping independent root discovery and domain listings
ok 751 - LAT-05 validates managed root before overlapping independent root discovery and domain listings
  ---
  duration_ms: 44.0592
  type: 'test'
  ...
# Subtest: LAT-05 domain-root validation remains fail-closed for missing, duplicate, unmarked, trashed, and ambiguous roots
ok 752 - LAT-05 domain-root validation remains fail-closed for missing, duplicate, unmarked, trashed, and ambiguous roots
  ---
  duration_ms: 8.6412
  type: 'test'
  ...
# Subtest: LAT-05 interruption in either domain stays partial and merged duplicate identity/path stays fail-closed
ok 753 - LAT-05 interruption in either domain stays partial and merged duplicate identity/path stays fail-closed
  ---
  duration_ms: 6.5912
  type: 'test'
  ...
# Subtest: LAT-05 reuses exact parent metadata only inside one provenance assembly
ok 754 - LAT-05 reuses exact parent metadata only inside one provenance assembly
  ---
  duration_ms: 7.2447
  type: 'test'
  ...
# Subtest: LAT-05 trusted cursor stays incremental; conflicting or missing cursor state falls back full
ok 755 - LAT-05 trusted cursor stays incremental; conflicting or missing cursor state falls back full
  ---
  duration_ms: 5.96
  type: 'test'
  ...
# Subtest: LAT-05 leaves native reliable Changes cursor failure classification unchanged
ok 756 - LAT-05 leaves native reliable Changes cursor failure classification unchanged
  ---
  duration_ms: 2.8284
  type: 'test'
  ...
# Subtest: LAT-01 measurement foundation captures bounded overlap of independent local observations
ok 757 - LAT-01 measurement foundation captures bounded overlap of independent local observations
  ---
  duration_ms: 10.8306
  type: 'test'
  ...
# Subtest: LAT-01 measurement foundation captures run-scoped read-only local evidence reuse
ok 758 - LAT-01 measurement foundation captures run-scoped read-only local evidence reuse
  ---
  duration_ms: 2.9623
  type: 'test'
  ...
# Subtest: LAT-01 full planning measures managed-root, BASE, cursor, reconciliation calls and LOCAL/REMOTE overlap
ok 759 - LAT-01 full planning measures managed-root, BASE, cursor, reconciliation calls and LOCAL/REMOTE overlap
  ---
  duration_ms: 2.2574
  type: 'test'
  ...
# Subtest: LAT-01 incremental planning measures one terminal Changes traversal without falling back to reconciliation listing
ok 760 - LAT-01 incremental planning measures one terminal Changes traversal without falling back to reconciliation listing
  ---
  duration_ms: 2.6648
  type: 'test'
  ...
# Subtest: LAT-01 measurement foundation records integrated authority-load deduplication before physical mutation
ok 761 - LAT-01 measurement foundation records integrated authority-load deduplication before physical mutation
  ---
  duration_ms: 10.2251
  type: 'test'
  ...
# Subtest: LAT-01 stale final authorization prevents physical mutation
ok 762 - LAT-01 stale final authorization prevents physical mutation
  ---
  duration_ms: 0.6173
  type: 'test'
  ...
# Subtest: LOG-02 success trace has one stable request identity, run correlation, status, provider ID, and bounded latency
ok 763 - LOG-02 success trace has one stable request identity, run correlation, status, provider ID, and bounded latency
  ---
  duration_ms: 49.2172
  type: 'test'
  ...
# Subtest: LOG-02 safe endpoint classes cover repository Drive transport shapes without retaining identifiers or query values
ok 764 - LOG-02 safe endpoint classes cover repository Drive transport shapes without retaining identifiers or query values
  ---
  duration_ms: 13.1576
  type: 'test'
  ...
# Subtest: LOG-02 retries 5xx and network failures with one requestId, increasing attempts, and unchanged computed delays
ok 765 - LOG-02 retries 5xx and network failures with one requestId, increasing attempts, and unchanged computed delays
  ---
  duration_ms: 5.8939
  type: 'test'
  ...
# Subtest: LOG-02 preserves Retry-After timing and records the exact chosen retry delay
ok 766 - LOG-02 preserves Retry-After timing and records the exact chosen retry delay
  ---
  duration_ms: 3.5878
  type: 'test'
  ...
# Subtest: LOG-02 observes 401 access-token invalidation and safe replay without disclosing token material
ok 767 - LOG-02 observes 401 access-token invalidation and safe replay without disclosing token material
  ---
  duration_ms: 3.0806
  type: 'test'
  ...
# Subtest: LOG-02 exposes existing terminal Drive classifications without changing returned signals
ok 768 - LOG-02 exposes existing terminal Drive classifications without changing returned signals
  ---
  duration_ms: 18.939
  type: 'test'
  ...
# Subtest: LOG-02 preserves non-replay-safe POST behavior and records that automatic replay was refused
ok 769 - LOG-02 preserves non-replay-safe POST behavior and records that automatic replay was refused
  ---
  duration_ms: 1.5181
  type: 'test'
  ...
# Subtest: LOG-02 excludes raw URL/query, authorization and arbitrary headers, bodies, and token-like provider values
ok 770 - LOG-02 excludes raw URL/query, authorization and arbitrary headers, bodies, and token-like provider values
  ---
  duration_ms: 2.4931
  type: 'test'
  ...
# Subtest: LOG-02 diagnostic sink failure is non-authoritative and cannot change transport success
ok 771 - LOG-02 diagnostic sink failure is non-authoritative and cannot change transport success
  ---
  duration_ms: 2.5526
  type: 'test'
  ...
# Subtest: LOG-03 exposes candidate direct-GET success while pre-retirement path listing omits the candidate without changing the existing branch
ok 772 - LOG-03 exposes candidate direct-GET success while pre-retirement path listing omits the candidate without changing the existing branch
  ---
  duration_ms: 78.6431
  type: 'test'
  ...
# Subtest: LOG-03 distinguishes an ambiguous predecessor retirement response from later physical verification
ok 773 - LOG-03 distinguishes an ambiguous predecessor retirement response from later physical verification
  ---
  duration_ms: 32.1661
  type: 'test'
  ...
# Subtest: LOG-03 exposes post-trash exact-ID and logical-path disagreement without changing convergence outcome
ok 774 - LOG-03 exposes post-trash exact-ID and logical-path disagreement without changing convergence outcome
  ---
  duration_ms: 32.2568
  type: 'test'
  ...
# Subtest: LOG-03 distinguishes an independent third occupant and never reaches predecessor retirement
ok 775 - LOG-03 distinguishes an independent third occupant and never reaches predecessor retirement
  ---
  duration_ms: 24.8582
  type: 'test'
  ...
# Subtest: LOG-03 successful immutable-candidate update records causal stages while preserving verified-effect result
ok 776 - LOG-03 successful immutable-candidate update records causal stages while preserving verified-effect result
  ---
  duration_ms: 30.0202
  type: 'test'
  ...
# Subtest: LOG-03 create, move, and trash emit semantic operation events without exposing raw logical names
ok 777 - LOG-03 create, move, and trash emit semantic operation events without exposing raw logical names
  ---
  duration_ms: 10.4697
  type: 'test'
  ...
# Subtest: LOG-03 reconciliation and change-page diagnostics are bounded summaries with no raw entry path, query, or cursor payload
ok 778 - LOG-03 reconciliation and change-page diagnostics are bounded summaries with no raw entry path, query, or cursor payload
  ---
  duration_ms: 9.9577
  type: 'test'
  ...
# Subtest: LOG-03 production composition routes the same host DiagnosticLogger through LOG-02, LOG-03, LOG-04, and LOG-05 seams
ok 779 - LOG-03 production composition routes the same host DiagnosticLogger through LOG-02, LOG-03, LOG-04, and LOG-05 seams
  ---
  duration_ms: 1.5005
  type: 'test'
  ...
# Subtest: LOG-06 bundle contains versioned build/runtime, authority, trace, audit, attention, and causal index sections
ok 780 - LOG-06 bundle contains versioned build/runtime, authority, trace, audit, attention, and causal index sections
  ---
  duration_ms: 16.869
  type: 'test'
  ...
# Subtest: LOG-06 bundle privacy boundary replaces raw paths with pathKey and excludes secrets, free text, cursor values, and arbitrary state payloads
ok 781 - LOG-06 bundle privacy boundary replaces raw paths with pathKey and excludes secrets, free text, cursor values, and arbitrary state payloads
  ---
  duration_ms: 3.8884
  type: 'test'
  ...
# Subtest: LOG-06 bundle is deterministic for equivalent fixed-time inputs and export does not clear retained diagnostics
ok 782 - LOG-06 bundle is deterministic for equivalent fixed-time inputs and export does not clear retained diagnostics
  ---
  duration_ms: 5.8955
  type: 'test'
  ...
# Subtest: LOG-06 state, audit, and attention projections are explicitly bounded with truncation evidence
ok 783 - LOG-06 state, audit, and attention projections are explicitly bounded with truncation evidence
  ---
  duration_ms: 64.5351
  type: 'test'
  ...
# Subtest: LOG-06 clipboard helper copies the complete bundle or rejects without mutating the bundle/logger
ok 784 - LOG-06 clipboard helper copies the complete bundle or rejects without mutating the bundle/logger
  ---
  duration_ms: 2.421
  type: 'test'
  ...
# Subtest: LOG-06 operator wiring is one local clipboard command and runtime bundle collection does not invoke Drive or synchronization
ok 785 - LOG-06 operator wiring is one local clipboard command and runtime bundle collection does not invoke Drive or synchronization
  ---
  duration_ms: 1.9039
  type: 'test'
  ...
# Subtest: LOG07-S1 production controller/executor/Drive composition proves remote-update lifecycle end to end
ok 786 - LOG07-S1 production controller/executor/Drive composition proves remote-update lifecycle end to end
  ---
  duration_ms: 1105.5931
  type: 'test'
  ...
# Subtest: LOG07-S2 candidate direct GET can diverge from path LIST without inventing retirement
ok 787 - LOG07-S2 candidate direct GET can diverge from path LIST without inventing retirement
  ---
  duration_ms: 98.1578
  type: 'test'
  ...
# Subtest: LOG07-S3/S4/S5 ambiguous retirement, delayed path visibility, and third-candidate contamination remain distinct
ok 788 - LOG07-S3/S4/S5 ambiguous retirement, delayed path visibility, and third-candidate contamination remain distinct
  ---
  duration_ms: 307.8525
  type: 'test'
  ...
# Subtest: LOG07-S6 repaired production controller exports outstanding-intent recovery lifecycle
ok 789 - LOG07-S6 repaired production controller exports outstanding-intent recovery lifecycle
  ---
  duration_ms: 8.28
  type: 'test'
  ...
# Subtest: LOG07-S7 remote-change learning advances generation before durable recovery rejects the prior-generation intent
ok 790 - LOG07-S7 remote-change learning advances generation before durable recovery rejects the prior-generation intent
  ---
  duration_ms: 6.0956
  type: 'test'
  ...
# Subtest: LOG07-S8 cancellation is distinct and causes no HTTP dispatch
ok 791 - LOG07-S8 cancellation is distinct and causes no HTTP dispatch
  ---
  duration_ms: 0.747
  type: 'test'
  ...
# Subtest: LOG07-S9 retry/rate-limit evidence keeps one request ID and distinct attempt decisions
ok 792 - LOG07-S9 retry/rate-limit evidence keeps one request ID and distinct attempt decisions
  ---
  duration_ms: 2.7424
  type: 'test'
  ...
# Subtest: LOG07-S10 diagnostic persistence failure does not change mutation outcome or request sequence
ok 793 - LOG07-S10 diagnostic persistence failure does not change mutation outcome or request sequence
  ---
  duration_ms: 28.4776
  type: 'test'
  ...
# Subtest: LOG07-S11 adversarial private path/content/header-like values do not leak and retention remains bounded
ok 794 - LOG07-S11 adversarial private path/content/header-like values do not leak and retention remains bounded
  ---
  duration_ms: 505.1973
  type: 'test'
  ...
# Subtest: R3-R1 runtime disposal waits for a blocked direct preview and rejects later previews without touching dependencies
ok 795 - R3-R1 runtime disposal waits for a blocked direct preview and rejects later previews without touching dependencies
  ---
  duration_ms: 58.6116
  type: 'test'
  ...
# Subtest: R3-R2 runtime disposal waits for direct manual conflict resolution and rejects later resolutions without touching dependencies
ok 796 - R3-R2 runtime disposal waits for direct manual conflict resolution and rejects later resolutions without touching dependencies
  ---
  duration_ms: 4.8474
  type: 'test'
  ...
# Subtest: malformed persisted physical descriptors fail closed during state load
ok 797 - malformed persisted physical descriptors fail closed during state load
  ---
  duration_ms: 7.1832
  type: 'test'
  ...
# Subtest: controller quiescence does not settle while an in-flight run promise remains blocked
ok 798 - controller quiescence does not settle while an in-flight run promise remains blocked
  ---
  duration_ms: 0.5957
  type: 'test'
  ...
# Subtest: runtime teardown stops scheduler and awaits quiescence before resource disposal
ok 799 - runtime teardown stops scheduler and awaits quiescence before resource disposal
  ---
  duration_ms: 1.1033
  type: 'test'
  ...
# Subtest: preview execution has pending guard and finally-reset while failure leaves modal open
ok 800 - preview execution has pending guard and finally-reset while failure leaves modal open
  ---
  duration_ms: 1.0682
  type: 'test'
  ...
# Subtest: foundation Changes contract preserves intermediate and terminal tokens as distinct states
ok 801 - foundation Changes contract preserves intermediate and terminal tokens as distinct states
  ---
  duration_ms: 3.4884
  type: 'test'
  ...
# Subtest: foundation remote path contract never silently collapses duplicate logical paths
ok 802 - foundation remote path contract never silently collapses duplicate logical paths
  ---
  duration_ms: 0.4309
  type: 'test'
  ...
# Subtest: foundation BASE authority is exact and independent of persistence-only writes
ok 803 - foundation BASE authority is exact and independent of persistence-only writes
  ---
  duration_ms: 0.3483
  type: 'test'
  ...
# Subtest: foundation file BASE healing requires canonical SHA-256 equality authority
ok 804 - foundation file BASE healing requires canonical SHA-256 equality authority
  ---
  duration_ms: 0.6759
  type: 'test'
  ...
# Subtest: R1 exact BASE precondition rejects nominal base-trusted for execution
ok 805 - R1 exact BASE precondition rejects nominal base-trusted for execution
  ---
  duration_ms: 0.4821
  type: 'test'
  ...
# Subtest: R1 exact identity precondition rejects nominal identity-unambiguous for execution
ok 806 - R1 exact identity precondition rejects nominal identity-unambiguous for execution
  ---
  duration_ms: 0.3568
  type: 'test'
  ...
# Subtest: foundation restart contract distinguishes pre-dispatch intent from durable dispatch authority
ok 807 - foundation restart contract distinguishes pre-dispatch intent from durable dispatch authority
  ---
  duration_ms: 0.6229
  type: 'test'
  ...
# Subtest: foundation local transaction contract distinguishes create and replace recovery authority
ok 808 - foundation local transaction contract distinguishes create and replace recovery authority
  ---
  duration_ms: 0.3935
  type: 'test'
  ...
# Subtest: foundation local transaction contract exposes restart recovery at every durable swap boundary
ok 809 - foundation local transaction contract exposes restart recovery at every durable swap boundary
  ---
  duration_ms: 0.8484
  type: 'test'
  ...
# Subtest: R2 durable remote move recovery descriptor carries side paths identity and authority
ok 810 - R2 durable remote move recovery descriptor carries side paths identity and authority
  ---
  duration_ms: 0.6678
  type: 'test'
  ...
# Subtest: R2 durable trash recovery descriptor retains destructive authority
ok 811 - R2 durable trash recovery descriptor retains destructive authority
  ---
  duration_ms: 0.4058
  type: 'test'
  ...
# Subtest: R2 clean merge keeps separately recoverable physical effects
ok 812 - R2 clean merge keeps separately recoverable physical effects
  ---
  duration_ms: 0.3564
  type: 'test'
  ...
# Subtest: R3 safe remote move and trash outcomes preserve unknown versus verified effect
ok 813 - R3 safe remote move and trash outcomes preserve unknown versus verified effect
  ---
  duration_ms: 0.158
  type: 'test'
  ...
# Subtest: R4 concurrent RI allows safe materialization but not ordinary convergence
ok 814 - R4 concurrent RI allows safe materialization but not ordinary convergence
  ---
  duration_ms: 0.2375
  type: 'test'
  ...
# Subtest: R4 true conflict-free remote application requires separate convergence authority
ok 815 - R4 true conflict-free remote application requires separate convergence authority
  ---
  duration_ms: 1.2886
  type: 'test'
  ...
# Subtest: R5 lost response recovery validates exact durable intended upload version rather than current LOCAL
ok 816 - R5 lost response recovery validates exact durable intended upload version rather than current LOCAL
  ---
  duration_ms: 0.3125
  type: 'test'
  ...
# Subtest: R6 cache-bypassing integrity reconciliation seam is distinct from ordinary cached read
ok 817 - R6 cache-bypassing integrity reconciliation seam is distinct from ordinary cached read
  ---
  duration_ms: 0.2647
  type: 'test'
  ...
# Subtest: foundation remote ingestion backlog retains unresolved earlier facts across later learned batches
ok 818 - foundation remote ingestion backlog retains unresolved earlier facts across later learned batches
  ---
  duration_ms: 0.6588
  type: 'test'
  ...
# Subtest: foundation semantic validation has a fail-closed extensibility code
ok 819 - foundation semantic validation has a fail-closed extensibility code
  ---
  duration_ms: 0.1673
  type: 'test'
  ...
# Subtest: foundation merge resource policy fails closed for unknown and oversized inputs
ok 820 - foundation merge resource policy fails closed for unknown and oversized inputs
  ---
  duration_ms: 0.4949
  type: 'test'
  ...
# Subtest: plan presentation groups system paths separately without changing relative order
ok 821 - plan presentation groups system paths separately without changing relative order
  ---
  duration_ms: 2.0864
  type: 'test'
  ...
# Subtest: system group expands only when it contains an actionable operation
ok 822 - system group expands only when it contains an actionable operation
  ---
  duration_ms: 0.2662
  type: 'test'
  ...
# Subtest: C1-R1 reconstruction bypasses durable recovery only while persisted canonical state is recovery-required
ok 823 - C1-R1 reconstruction bypasses durable recovery only while persisted canonical state is recovery-required
  ---
  duration_ms: 26.3653
  type: 'test'
  ...
# Subtest: C1 absent new-installation state previews first-sync safe union without persistence, then initializes authority before mutation
ok 824 - C1 absent new-installation state previews first-sync safe union without persistence, then initializes authority before mutation
  ---
  duration_ms: 34.3529
  type: 'test'
  ...
# Subtest: C1-R1 recovery-required reconstruction reaches reviewed planning without preview-time authority recovery or state replacement
ok 825 - C1-R1 recovery-required reconstruction reaches reviewed planning without preview-time authority recovery or state replacement
  ---
  duration_ms: 0.9431
  type: 'test'
  ...
# Subtest: C1 existing trusted authority planning still invokes durable-intent recovery
ok 826 - C1 existing trusted authority planning still invokes durable-intent recovery
  ---
  duration_ms: 2.9536
  type: 'test'
  ...
# Subtest: VH23 H7 registers C03-C09 exactly once in deterministic suite order
ok 827 - VH23 H7 registers C03-C09 exactly once in deterministic suite order
  ---
  duration_ms: 2.7254
  type: 'test'
  ...
# Subtest: VH23 H7 rejects duplicate or incomplete C-series registrations
ok 828 - VH23 H7 rejects duplicate or incomplete C-series registrations
  ---
  duration_ms: 2.5478
  type: 'test'
  ...
# Subtest: VH23 H7 routes non-fixed module delegates only to the active scenario
ok 829 - VH23 H7 routes non-fixed module delegates only to the active scenario
  ---
  duration_ms: 1.4356
  type: 'test'
  ...
# Subtest: VH23 H7 routes prerequisite evaluation by scenario without bleed
ok 830 - VH23 H7 routes prerequisite evaluation by scenario without bleed
  ---
  duration_ms: 1.3286
  type: 'test'
  ...
# Subtest: VH23 H7 cannot replace fixed production or plan-assertion bindings
ok 831 - VH23 H7 cannot replace fixed production or plan-assertion bindings
  ---
  duration_ms: 0.7937
  type: 'test'
  ...
# Subtest: VH16 correction C03 is declarative over fixed H6B preview/assert/execute operations
ok 832 - VH16 correction C03 is declarative over fixed H6B preview/assert/execute operations
  ---
  duration_ms: 3.5231
  type: 'test'
  ...
# Subtest: VH16 correction C03 success runs both exact plans through the real repaired ValidationModeRuntime handoff
ok 833 - VH16 correction C03 success runs both exact plans through the real repaired ValidationModeRuntime handoff
  ---
  duration_ms: 25.0201
  type: 'test'
  ...
# Subtest: VH16 correction C03 unexpected Windows plan fails in the fixed assertion step before Windows execution
ok 834 - VH16 correction C03 unexpected Windows plan fails in the fixed assertion step before Windows execution
  ---
  duration_ms: 4.4137
  type: 'test'
  ...
# Subtest: VH16 correction C03 execution cannot proceed when its fixed assertion-derived authorization is absent
ok 835 - VH16 correction C03 execution cannot proceed when its fixed assertion-derived authorization is absent
  ---
  duration_ms: 3.325
  type: 'test'
  ...
# Subtest: VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles
ok 836 - VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles
  ---
  duration_ms: 28.6374
  type: 'test'
  ...
# Subtest: VH17 correction C04 unexpected move plan fails in fixed assertion before execution
ok 837 - VH17 correction C04 unexpected move plan fails in fixed assertion before execution
  ---
  duration_ms: 7.7517
  type: 'test'
  ...
# Subtest: VH17 correction C04 rejects delete/create substitution and never executes substituted plan
ok 838 - VH17 correction C04 rejects delete/create substitution and never executes substituted plan
  ---
  duration_ms: 6.4532
  type: 'test'
  ...
# Subtest: VH18 correction registers C05 one-to-one and expresses both fixed authority cycles without caller authorization
ok 839 - VH18 correction registers C05 one-to-one and expresses both fixed authority cycles without caller authorization
  ---
  duration_ms: 4.8621
  type: 'test'
  ...
# Subtest: VH18 correction C05 runs destructive preview/assert/authorization/execution only through ValidationModeRuntime and retains exact-object/tombstone assertions
ok 840 - VH18 correction C05 runs destructive preview/assert/authorization/execution only through ValidationModeRuntime and retains exact-object/tombstone assertions
  ---
  duration_ms: 14.6739
  type: 'test'
  ...
# Subtest: VH18 correction unsafe additional destructive plan fails in the fixed assertion step before physical execution
ok 841 - VH18 correction unsafe additional destructive plan fails in the fixed assertion step before physical execution
  ---
  duration_ms: 3.1192
  type: 'test'
  ...
# Subtest: VH18 correction plan expectations bind the exact remote object and reject a same-path destructive plan for the wrong Drive identity
ok 842 - VH18 correction plan expectations bind the exact remote object and reject a same-path destructive plan for the wrong Drive identity
  ---
  duration_ms: 3.6878
  type: 'test'
  ...
# Subtest: VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles
ok 843 - VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles
  ---
  duration_ms: 18.1881
  type: 'test'
  ...
# Subtest: VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution
ok 844 - VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution
  ---
  duration_ms: 4.023
  type: 'test'
  ...
# Subtest: VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution
ok 845 - VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution
  ---
  duration_ms: 3.5945
  type: 'test'
  ...
# Subtest: VH20 C07 uses real H6B fixed plan handoff for trusted baseline, Windows update, mobile download-update, and exact convergence
ok 846 - VH20 C07 uses real H6B fixed plan handoff for trusted baseline, Windows update, mobile download-update, and exact convergence
  ---
  duration_ms: 21.7955
  type: 'test'
  ...
# Subtest: VH20 C07 unexpected production plan hard-stops in the fixed H6B assertion before any production execution
ok 847 - VH20 C07 unexpected production plan hard-stops in the fixed H6B assertion before any production execution
  ---
  duration_ms: 3.0037
  type: 'test'
  ...
# Subtest: VH20 C07 stale same-cycle re-preview invalidates assertion-derived authorization and hard-stops before execution
ok 848 - VH20 C07 stale same-cycle re-preview invalidates assertion-derived authorization and hard-stops before execution
  ---
  duration_ms: 2.9936
  type: 'test'
  ...
# Subtest: VH20 C07 package keeps the authoritative logical fixture name and C07-only module ownership
ok 849 - VH20 C07 package keeps the authoritative logical fixture name and C07-only module ownership
  ---
  duration_ms: 0.5506
  type: 'test'
  ...
# Subtest: VH21 C08 registers one-to-one and uses four explicit repaired-H6B authority cycles without caller authorization
ok 850 - VH21 C08 registers one-to-one and uses four explicit repaired-H6B authority cycles without caller authorization
  ---
  duration_ms: 2.3399
  type: 'test'
  ...
# Subtest: VH21 C08 deterministically preserves Drive identity, old-path absence, bytes, and unrelated guard through the real H6B route
ok 851 - VH21 C08 deterministically preserves Drive identity, old-path absence, bytes, and unrelated guard through the real H6B route
  ---
  duration_ms: 26.1526
  type: 'test'
  ...
# Subtest: VH21 C08 rejects delete/create substitution before production execution
ok 852 - VH21 C08 rejects delete/create substitution before production execution
  ---
  duration_ms: 7.9056
  type: 'test'
  ...
# Subtest: VH21 C08 hard-stops an unexpected move-plan mutation before production execution
ok 853 - VH21 C08 hard-stops an unexpected move-plan mutation before production execution
  ---
  duration_ms: 7.2882
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 reconstructs full C08 lineage before exact-object Windows and mobile deletion
ok 854 - VH22 C09 correction 02 reconstructs full C08 lineage before exact-object Windows and mobile deletion
  ---
  duration_ms: 29.6043
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 cannot fake starting lineage: completed setup plans and mapping IDs still cannot unlock delete when objective C08-equivalent verification blocks
ok 855 - VH22 C09 correction 02 cannot fake starting lineage: completed setup plans and mapping IDs still cannot unlock delete when objective C08-equivalent verification blocks
  ---
  duration_ms: 6.1953
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 fixed assertion rejects wrong exact Drive object before Windows production trash execution
ok 856 - VH22 C09 correction 02 fixed assertion rejects wrong exact Drive object before Windows production trash execution
  ---
  duration_ms: 7.272
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 fixed assertion hard-stops unexpected destructive mutation before Windows production execution
ok 857 - VH22 C09 correction 02 fixed assertion hard-stops unexpected destructive mutation before Windows production execution
  ---
  duration_ms: 5.6117
  type: 'test'
  ...
# Subtest: VH03 freezes the complete H0 harness version through the validation barrel
ok 858 - VH03 freezes the complete H0 harness version through the validation barrel
  ---
  duration_ms: 1.2202
  type: 'test'
  ...
# Subtest: coordination accepts only a current run/scenario/device/role/step-owner/event message
ok 859 - coordination accepts only a current run/scenario/device/role/step-owner/event message
  ---
  duration_ms: 0.4864
  type: 'test'
  ...
# Subtest: coordination rejects stale and mismatched run/scenario/device messages fail closed
ok 860 - coordination rejects stale and mismatched run/scenario/device messages fail closed
  ---
  duration_ms: 1.1355
  type: 'test'
  ...
# Subtest: coordination enforces device-role, participant-recipient, and step-owner authority
ok 861 - coordination enforces device-role, participant-recipient, and step-owner authority
  ---
  duration_ms: 0.3352
  type: 'test'
  ...
# Subtest: coordination rejects stale step, unexpected event, and terminal-state traffic
ok 862 - coordination rejects stale step, unexpected event, and terminal-state traffic
  ---
  duration_ms: 0.2466
  type: 'test'
  ...
# Subtest: terminal coordination message and state semantics are structurally discriminated
ok 863 - terminal coordination message and state semantics are structurally discriminated
  ---
  duration_ms: 0.3084
  type: 'test'
  ...
# Subtest: canonical evidence is run/scenario/device bound and structurally privacy-safe
ok 864 - canonical evidence is run/scenario/device bound and structurally privacy-safe
  ---
  duration_ms: 0.2171
  type: 'test'
  ...
# Subtest: PASS FAIL BLOCKED and PAUSED verdicts carry statically non-confusable semantics
ok 865 - PASS FAIL BLOCKED and PAUSED verdicts carry statically non-confusable semantics
  ---
  duration_ms: 0.984
  type: 'test'
  ...
# Subtest: VH12 coordinates a deterministic Windows-to-mobile-to-Windows handoff under explicit local transition authority
ok 866 - VH12 coordinates a deterministic Windows-to-mobile-to-Windows handoff under explicit local transition authority
  ---
  duration_ms: 3.727
  type: 'test'
  ...
# Subtest: VH12 rejects a valid current message carrying an unauthorized next step without mutating local state
ok 867 - VH12 rejects a valid current message carrying an unauthorized next step without mutating local state
  ---
  duration_ms: 0.4019
  type: 'test'
  ...
# Subtest: VH12 rejects unauthorized successor ownership transfer
ok 868 - VH12 rejects unauthorized successor ownership transfer
  ---
  duration_ms: 0.2931
  type: 'test'
  ...
# Subtest: VH12 rejects unauthorized successor expected-next-event selection
ok 869 - VH12 rejects unauthorized successor expected-next-event selection
  ---
  duration_ms: 0.3627
  type: 'test'
  ...
# Subtest: VH12 generic invariant forbids nonterminal messages from manufacturing terminal outcomes even if local policy is wrong
ok 870 - VH12 generic invariant forbids nonterminal messages from manufacturing terminal outcomes even if local policy is wrong
  ---
  duration_ms: 0.4305
  type: 'test'
  ...
# Subtest: VH12 terminal message disposition and classification must agree with the successor independently of scenario policy
ok 871 - VH12 terminal message disposition and classification must agree with the successor independently of scenario policy
  ---
  duration_ms: 0.4472
  type: 'test'
  ...
# Subtest: VH12 send path refuses a successor rejected by its own local transition authority
ok 872 - VH12 send path refuses a successor rejected by its own local transition authority
  ---
  duration_ms: 0.9098
  type: 'test'
  ...
# Subtest: VH12 rejects duplicate/stale messages after first acceptance
ok 873 - VH12 rejects duplicate/stale messages after first acceptance
  ---
  duration_ms: 0.4627
  type: 'test'
  ...
# Subtest: VH12 tolerates a delayed or suspended participant by replaying durable run-scoped records
ok 874 - VH12 tolerates a delayed or suspended participant by replaying durable run-scoped records
  ---
  duration_ms: 0.6601
  type: 'test'
  ...
# Subtest: VH12 requires distinct physical installation identities and correct role binding
ok 875 - VH12 requires distinct physical installation identities and correct role binding
  ---
  duration_ms: 0.7091
  type: 'test'
  ...
# Subtest: VH12 fails closed on mismatched run and scenario identity
ok 876 - VH12 fails closed on mismatched run and scenario identity
  ---
  duration_ms: 0.434
  type: 'test'
  ...
# Subtest: VH12 Drive transport creates validation control outside the managed vault namespace
ok 877 - VH12 Drive transport creates validation control outside the managed vault namespace
  ---
  duration_ms: 36.0516
  type: 'test'
  ...
# Subtest: VH02 driver requests are bounded to production-path orchestration actions
ok 878 - VH02 driver requests are bounded to production-path orchestration actions
  ---
  duration_ms: 2.027
  type: 'test'
  ...
# Subtest: plan expectations reject a kind that is simultaneously allowed background and forbidden
ok 879 - plan expectations reject a kind that is simultaneously allowed background and forbidden
  ---
  duration_ms: 0.8067
  type: 'test'
  ...
# Subtest: plan mismatch is structurally fail-closed and cannot carry execution authorization
ok 880 - plan mismatch is structurally fail-closed and cannot carry execution authorization
  ---
  duration_ms: 0.3507
  type: 'test'
  ...
# Subtest: fault specifications freeze approved deterministic fault classes and exact boundaries
ok 881 - fault specifications freeze approved deterministic fault classes and exact boundaries
  ---
  duration_ms: 0.2976
  type: 'test'
  ...
# Subtest: post-dispatch fault results preserve physical uncertainty rather than manufacturing certainty
ok 882 - post-dispatch fault results preserve physical uncertainty rather than manufacturing certainty
  ---
  duration_ms: 0.2057
  type: 'test'
  ...
# Subtest: state and convergence vocabularies remain separate
ok 883 - state and convergence vocabularies remain separate
  ---
  duration_ms: 0.4032
  type: 'test'
  ...
# Subtest: missing required proof becomes BLOCKED and cannot silently produce PASS
ok 884 - missing required proof becomes BLOCKED and cannot silently produce PASS
  ---
  duration_ms: 0.4112
  type: 'test'
  ...
# Subtest: verification result preserves FAIL > BLOCKED > PASS across valid group combinations
ok 885 - verification result preserves FAIL > BLOCKED > PASS across valid group combinations
  ---
  duration_ms: 0.4163
  type: 'test'
  ...
# Subtest: any failed state or convergence assertion dominates BLOCKED and yields FAIL
ok 886 - any failed state or convergence assertion dominates BLOCKED and yields FAIL
  ---
  duration_ms: 0.6401
  type: 'test'
  ...
# Subtest: VH05 text fixtures have deterministic bytes and hashes while versions remain distinguishable
ok 887 - VH05 text fixtures have deterministic bytes and hashes while versions remain distinguishable
  ---
  duration_ms: 7.5068
  type: 'test'
  ...
# Subtest: VH05 binary, empty-folder, exclusion, deletion, and path-collision helpers are explicit and payload-free
ok 888 - VH05 binary, empty-folder, exclusion, deletion, and path-collision helpers are explicit and payload-free
  ---
  duration_ms: 7.7238
  type: 'test'
  ...
# Subtest: VH05 large fixtures are deterministic and generated in bounded chunks
ok 889 - VH05 large fixtures are deterministic and generated in bounded chunks
  ---
  duration_ms: 4.394
  type: 'test'
  ...
# Subtest: VH05 move, delete, deterministic restore, and cleanup preserve tracked disposable scope
ok 890 - VH05 move, delete, deterministic restore, and cleanup preserve tracked disposable scope
  ---
  duration_ms: 1.8687
  type: 'test'
  ...
# Subtest: VH05 refuses every mutation before local I/O when sandbox ownership is absent or ambiguous
ok 891 - VH05 refuses every mutation before local I/O when sandbox ownership is absent or ambiguous
  ---
  duration_ms: 0.7262
  type: 'test'
  ...
# Subtest: VH05 honors explicit sandbox rejection without mutating the local vault
ok 892 - VH05 honors explicit sandbox rejection without mutating the local vault
  ---
  duration_ms: 0.529
  type: 'test'
  ...
# Subtest: VH13 restart-safe resume reloads one durable checkpoint and resumes only after observed postcondition and durable adoption
ok 893 - VH13 restart-safe resume reloads one durable checkpoint and resumes only after observed postcondition and durable adoption
  ---
  duration_ms: 8.0629
  type: 'test'
  ...
# Subtest: VH13 verified checkpoint remains durable until resume adoption actually succeeds
ok 894 - VH13 verified checkpoint remains durable until resume adoption actually succeeds
  ---
  duration_ms: 1.2352
  type: 'test'
  ...
# Subtest: VH13 resume-adoption failure leaves the verified checkpoint durably resumable
ok 895 - VH13 resume-adoption failure leaves the verified checkpoint durably resumable
  ---
  duration_ms: 0.8083
  type: 'test'
  ...
# Subtest: VH13 adoption followed by interrupted checkpoint cleanup is restart-safe and idempotently retryable
ok 896 - VH13 adoption followed by interrupted checkpoint cleanup is restart-safe and idempotently retryable
  ---
  duration_ms: 0.732
  type: 'test'
  ...
# Subtest: VH13 wrong run, checkpoint, or device cannot invoke resume adoption
ok 897 - VH13 wrong run, checkpoint, or device cannot invoke resume adoption
  ---
  duration_ms: 0.5684
  type: 'test'
  ...
# Subtest: VH13 permits exactly one active external action checkpoint
ok 898 - VH13 permits exactly one active external action checkpoint
  ---
  duration_ms: 0.3548
  type: 'test'
  ...
# Subtest: VH13 rejects duplicate acknowledgement without advancing durable state twice
ok 899 - VH13 rejects duplicate acknowledgement without advancing durable state twice
  ---
  duration_ms: 0.7252
  type: 'test'
  ...
# Subtest: VH13 mobile device switching is allowed only at an unacknowledged durable boundary
ok 900 - VH13 mobile device switching is allowed only at an unacknowledged durable boundary
  ---
  duration_ms: 0.8091
  type: 'test'
  ...
# Subtest: VH13 ambiguity, probe failure, and timeout remain safely paused
ok 901 - VH13 ambiguity, probe failure, and timeout remain safely paused
  ---
  duration_ms: 2.2217
  type: 'test'
  ...
# Subtest: VH13 uninstall and reinstall checkpoints require external coordination persistence
ok 902 - VH13 uninstall and reinstall checkpoints require external coordination persistence
  ---
  duration_ms: 0.9391
  type: 'test'
  ...
# Subtest: VH13 persisted records contain only fixed non-secret checkpoint/run metadata
ok 903 - VH13 persisted records contain only fixed non-secret checkpoint/run metadata
  ---
  duration_ms: 0.8791
  type: 'test'
  ...
# Subtest: VH13 corrupted durable checkpoint state is never treated as empty or resumable
ok 904 - VH13 corrupted durable checkpoint state is never treated as empty or resumable
  ---
  duration_ms: 0.2738
  type: 'test'
  ...
# Subtest: VH13 concurrent stale writes fail closed through revision CAS
ok 905 - VH13 concurrent stale writes fail closed through revision CAS
  ---
  duration_ms: 0.3366
  type: 'test'
  ...
# Subtest: VH15 classifies validation device platforms deterministically
ok 906 - VH15 classifies validation device platforms deterministically
  ---
  duration_ms: 1.9135
  type: 'test'
  ...
# Subtest: VH15 validation mode is disabled by default and cannot touch production or durable harness state
ok 907 - VH15 validation mode is disabled by default and cannot touch production or durable harness state
  ---
  duration_ms: 1.8975
  type: 'test'
  ...
# Subtest: VH15 local canary reaches the real production-path driver only after explicit activation
ok 908 - VH15 local canary reaches the real production-path driver only after explicit activation
  ---
  duration_ms: 6.9131
  type: 'test'
  ...
# Subtest: VH15 unbound sandbox/fault authority fails closed and disabling drops all harness controls
ok 909 - VH15 unbound sandbox/fault authority fails closed and disabling drops all harness controls
  ---
  duration_ms: 1.1801
  type: 'test'
  ...
# Subtest: VH15 validation wrapper does not replace or intercept the ordinary production controller
ok 910 - VH15 validation wrapper does not replace or intercept the ordinary production controller
  ---
  duration_ms: 0.7668
  type: 'test'
  ...
# Subtest: VH15-R2 T1/T2 exact preview handoff reaches assertion and fixed execution with the observed plan ID
ok 911 - VH15-R2 T1/T2 exact preview handoff reaches assertion and fixed execution with the observed plan ID
  ---
  duration_ms: 13.7687
  type: 'test'
  ...
# Subtest: VH15-R2 T3 plan mismatch hard-stops before production execution
ok 912 - VH15-R2 T3 plan mismatch hard-stops before production execution
  ---
  duration_ms: 1.8255
  type: 'test'
  ...
# Subtest: VH15-R2 T4 execution without successful assertion fails closed
ok 913 - VH15-R2 T4 execution without successful assertion fails closed
  ---
  duration_ms: 1.3858
  type: 'test'
  ...
# Subtest: VH15-R2 T5 a newer preview invalidates prior authorization for the same cycle
ok 914 - VH15-R2 T5 a newer preview invalidates prior authorization for the same cycle
  ---
  duration_ms: 2.8256
  type: 'test'
  ...
# Subtest: VH15-R2 T6 retained authority for run A cannot be consumed by run B
ok 915 - VH15-R2 T6 retained authority for run A cannot be consumed by run B
  ---
  duration_ms: 3.6231
  type: 'test'
  ...
# Subtest: VH15-R2 T7 two independent cycles in one run execute only their own asserted plans
ok 916 - VH15-R2 T7 two independent cycles in one run execute only their own asserted plans
  ---
  duration_ms: 3.0129
  type: 'test'
  ...
# Subtest: VH15-R2 T8 composition recreation drops handoff authority and resumed execution fails closed
ok 917 - VH15-R2 T8 composition recreation drops handoff authority and resumed execution fails closed
  ---
  duration_ms: 3.6327
  type: 'test'
  ...
# Subtest: H6B runtime delegates resolve-observed-conflict through the fixed production path using observed identity
ok 918 - H6B runtime delegates resolve-observed-conflict through the fixed production path using observed identity
  ---
  duration_ms: 2.243
  type: 'test'
  ...
# Subtest: H6B runtime preserves production resolve-conflict rejection as BLOCKED
ok 919 - H6B runtime preserves production resolve-conflict rejection as BLOCKED
  ---
  duration_ms: 1.6078
  type: 'test'
  ...
# Subtest: H6B runtime rejects caller conflictId and malformed path, conflict kind, or resolution before production resolution
ok 920 - H6B runtime rejects caller conflictId and malformed path, conflict kind, or resolution before production resolution
  ---
  duration_ms: 2.7592
  type: 'test'
  ...
# Subtest: VH15-R2 T9 production-path-driver remains non-overridable
ok 921 - VH15-R2 T9 production-path-driver remains non-overridable
  ---
  duration_ms: 0.8881
  type: 'test'
  ...
# Subtest: VH15-R2 T10 default-off isolation and platform classification remain intact
ok 922 - VH15-R2 T10 default-off isolation and platform classification remain intact
  ---
  duration_ms: 0.4075
  type: 'test'
  ...
# Subtest: H6C runtime blocks an accepted execute request until the exact production terminal event exists
ok 923 - H6C runtime blocks an accepted execute request until the exact production terminal event exists
  ---
  duration_ms: 0.944
  type: 'test'
  ...
# Subtest: H6C runtime distinguishes exact failed and cancelled terminals from successful completion
ok 924 - H6C runtime distinguishes exact failed and cancelled terminals from successful completion
  ---
  duration_ms: 2.847
  type: 'test'
  ...
# Subtest: VH07 exact expected production plan match authorizes only the observed plan ID
ok 925 - VH07 exact expected production plan match authorizes only the observed plan ID
  ---
  duration_ms: 2.7249
  type: 'test'
  ...
# Subtest: VH07 permits only explicitly allowed nondestructive background no-ops
ok 926 - VH07 permits only explicitly allowed nondestructive background no-ops
  ---
  duration_ms: 0.3823
  type: 'test'
  ...
# Subtest: VH07 rejects an unrelated mutation even when the expected operation is present
ok 927 - VH07 rejects an unrelated mutation even when the expected operation is present
  ---
  duration_ms: 0.4246
  type: 'test'
  ...
# Subtest: VH07 rejects a move whose path or stable remote identity differs from the scenario contract
ok 928 - VH07 rejects a move whose path or stable remote identity differs from the scenario contract
  ---
  duration_ms: 0.4684
  type: 'test'
  ...
# Subtest: VH07 hard-stops an unexpected conflict
ok 929 - VH07 hard-stops an unexpected conflict
  ---
  duration_ms: 0.2636
  type: 'test'
  ...
# Subtest: VH07 hard-stops an unexpected destructive operation
ok 930 - VH07 hard-stops an unexpected destructive operation
  ---
  duration_ms: 0.3048
  type: 'test'
  ...
# Subtest: VH07 hard-stops unexpected recovery and blocked operation states
ok 931 - VH07 hard-stops unexpected recovery and blocked operation states
  ---
  duration_ms: 0.5317
  type: 'test'
  ...
# Subtest: VH07 accepts explicitly expected recovery state and review disposition
ok 932 - VH07 accepts explicitly expected recovery state and review disposition
  ---
  duration_ms: 0.2487
  type: 'test'
  ...
# Subtest: VH07 fails closed when runtime plan content contains an unknown operation kind
ok 933 - VH07 fails closed when runtime plan content contains an unknown operation kind
  ---
  duration_ms: 0.4953
  type: 'test'
  ...
# Subtest: VH06 driver delegates planning, Verify/Reconcile, automatic sync, cancellation, status, and lifecycle observation to production seams
ok 934 - VH06 driver delegates planning, Verify/Reconcile, automatic sync, cancellation, status, and lifecycle observation to production seams
  ---
  duration_ms: 3.8076
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict delegates only the exact production conflict observed for the same run
ok 935 - H6B resolve-observed-conflict delegates only the exact production conflict observed for the same run
  ---
  duration_ms: 2.4594
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict fails closed for wrong run, path, kind, ambiguity, and stale current surface
ok 936 - H6B resolve-observed-conflict fails closed for wrong run, path, kind, ambiguity, and stale current surface
  ---
  duration_ms: 1.0547
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict preserves production rejection and never converts request acceptance into convergence proof
ok 937 - H6B resolve-observed-conflict preserves production rejection and never converts request acceptance into convergence proof
  ---
  duration_ms: 0.4982
  type: 'test'
  ...
# Subtest: VH06 asserted execution is run-bound, must reference a plan observed by the driver, and never manufactures production success
ok 938 - VH06 asserted execution is run-bound, must reference a plan observed by the driver, and never manufactures production success
  ---
  duration_ms: 0.7425
  type: 'test'
  ...
# Subtest: VH06 preserves production rejection and failure instead of converting either into success
ok 939 - VH06 preserves production rejection and failure instead of converting either into success
  ---
  duration_ms: 0.6291
  type: 'test'
  ...
# Subtest: VH06 delegates a reviewed manual plan through the real ProductController authoritative execute-plan path
ok 940 - VH06 delegates a reviewed manual plan through the real ProductController authoritative execute-plan path
  ---
  duration_ms: 16.8649
  type: 'test'
  ...
# Subtest: VH01 freezes exactly the C03-F03 harness scenario IDs in execution order
ok 941 - VH01 freezes exactly the C03-F03 harness scenario IDs in execution order
  ---
  duration_ms: 2.3859
  type: 'test'
  ...
# Subtest: validation run and device identities reject blank or unsupported representations
ok 942 - validation run and device identities reject blank or unsupported representations
  ---
  duration_ms: 1.0534
  type: 'test'
  ...
# Subtest: human-checkpoint vocabulary is bounded to the approved external action classes
ok 943 - human-checkpoint vocabulary is bounded to the approved external action classes
  ---
  duration_ms: 0.3245
  type: 'test'
  ...
# Subtest: checkpoint resume vocabulary distinguishes human action, verification, and safe resumability
ok 944 - checkpoint resume vocabulary distinguishes human action, verification, and safe resumability
  ---
  duration_ms: 0.239
  type: 'test'
  ...
# Subtest: fixture identity stays bound to exactly one validation run and scenario
ok 945 - fixture identity stays bound to exactly one validation run and scenario
  ---
  duration_ms: 0.5194
  type: 'test'
  ...
# Subtest: sandbox ownership can represent only approved disposable validation surfaces
ok 946 - sandbox ownership can represent only approved disposable validation surfaces
  ---
  duration_ms: 1.4457
  type: 'test'
  ...
# Subtest: sandbox authorization vocabulary preserves fail-closed rejection reasons
ok 947 - sandbox authorization vocabulary preserves fail-closed rejection reasons
  ---
  duration_ms: 0.2297
  type: 'test'
  ...
# Subtest: VH04 issues run-scoped ownership only inside configured disposable validation surfaces
ok 948 - VH04 issues run-scoped ownership only inside configured disposable validation surfaces
  ---
  duration_ms: 3.2071
  type: 'test'
  ...
# Subtest: VH04 refuses unrelated vault content, external BRAIN assets, credentials, and primary state
ok 949 - VH04 refuses unrelated vault content, external BRAIN assets, credentials, and primary state
  ---
  duration_ms: 2.0895
  type: 'test'
  ...
# Subtest: VH04 rejects root ownership, traversal, and overlapping sandbox namespaces
ok 950 - VH04 rejects root ownership, traversal, and overlapping sandbox namespaces
  ---
  duration_ms: 0.8709
  type: 'test'
  ...
# Subtest: VH04 cleanup requires issued provenance and a recorded created state
ok 951 - VH04 cleanup requires issued provenance and a recorded created state
  ---
  duration_ms: 1.211
  type: 'test'
  ...
# Subtest: VH04 rejects run mismatch and scenario mismatch for otherwise valid ownership
ok 952 - VH04 rejects run mismatch and scenario mismatch for otherwise valid ownership
  ---
  duration_ms: 0.4209
  type: 'test'
  ...
# Subtest: VH04 fails closed when restored provenance makes ownership ambiguous
ok 953 - VH04 fails closed when restored provenance makes ownership ambiguous
  ---
  duration_ms: 0.6712
  type: 'test'
  ...
# Subtest: VH04 retains removed-resource provenance across snapshots without restoring cleanup authority
ok 954 - VH04 retains removed-resource provenance across snapshots without restoring cleanup authority
  ---
  duration_ms: 0.8315
  type: 'test'
  ...
# Subtest: VH09 emits deterministic privacy-safe machine and human scenario evidence
ok 955 - VH09 emits deterministic privacy-safe machine and human scenario evidence
  ---
  duration_ms: 17.4938
  type: 'test'
  ...
# Subtest: canonical serialization sorts object keys without changing array order
ok 956 - canonical serialization sorts object keys without changing array order
  ---
  duration_ms: 0.2088
  type: 'test'
  ...
# Subtest: missing declared mandatory evidence cannot be emitted as PASS
ok 957 - missing declared mandatory evidence cannot be emitted as PASS
  ---
  duration_ms: 1.7307
  type: 'test'
  ...
# Subtest: failed assertions force FAIL even when PASS was requested
ok 958 - failed assertions force FAIL even when PASS was requested
  ---
  duration_ms: 1.2759
  type: 'test'
  ...
# Subtest: not-observable assertions force BLOCKED instead of false PASS
ok 959 - not-observable assertions force BLOCKED instead of false PASS
  ---
  duration_ms: 1.1167
  type: 'test'
  ...
# Subtest: sensitive-looking correlation metadata is sanitized before serialization
ok 960 - sensitive-looking correlation metadata is sanitized before serialization
  ---
  duration_ms: 1.1851
  type: 'test'
  ...
# Subtest: fixture hashes and numeric evidence are validated fail closed
ok 961 - fixture hashes and numeric evidence are validated fail closed
  ---
  duration_ms: 0.8931
  type: 'test'
  ...
# Subtest: suite aggregation is deterministic, verifies scenario integrity, and counts verdicts
ok 962 - suite aggregation is deterministic, verifies scenario integrity, and counts verdicts
  ---
  duration_ms: 18.7165
  type: 'test'
  ...
# Subtest: PAUSED requires an explicit resume step and primary device must be a participant
ok 963 - PAUSED requires an explicit resume step and primary device must be a participant
  ---
  duration_ms: 2.169
  type: 'test'
  ...
# Subtest: VH14-E publishes one reusable contract case for each required canary capability
ok 964 - VH14-E publishes one reusable contract case for each required canary capability
  ---
  duration_ms: 2.4036
  type: 'test'
  ...
# Subtest: VH14-E module fake accepts only explicitly scripted orchestration results
ok 965 - VH14-E module fake accepts only explicitly scripted orchestration results
  ---
  duration_ms: 1.069
  type: 'test'
  ...
# Subtest: VH14-E durable fake adopts the exact VH13 tuple before exposing the resume step
ok 966 - VH14-E durable fake adopts the exact VH13 tuple before exposing the resume step
  ---
  duration_ms: 0.8857
  type: 'test'
  ...
# Subtest: VH14-A runner scenario enumeration reuses the exact frozen H0 C03-F03 tuple
ok 967 - VH14-A runner scenario enumeration reuses the exact frozen H0 C03-F03 tuple
  ---
  duration_ms: 2.8298
  type: 'test'
  ...
# Subtest: VH14-A freezes only approved module identities, completion proofs, prerequisites, and stop reasons
ok 968 - VH14-A freezes only approved module identities, completion proofs, prerequisites, and stop reasons
  ---
  duration_ms: 0.6176
  type: 'test'
  ...
# Subtest: VH14-A durable state uses revision CAS and implements the exact VH13 resume-adoption port
ok 969 - VH14-A durable state uses revision CAS and implements the exact VH13 resume-adoption port
  ---
  duration_ms: 1.1533
  type: 'test'
  ...
# Subtest: VH14-A composition seams support all runner outcomes without granting module behavior
ok 970 - VH14-A composition seams support all runner outcomes without granting module behavior
  ---
  duration_ms: 0.6709
  type: 'test'
  ...
# Subtest: VH14-B enumerates the exact frozen C03-F03 tuple
ok 971 - VH14-B enumerates the exact frozen C03-F03 tuple
  ---
  duration_ms: 2.5431
  type: 'test'
  ...
# Subtest: VH14-B deterministically advances one scenario and preserves identity until proven PASS
ok 972 - VH14-B deterministically advances one scenario and preserves identity until proven PASS
  ---
  duration_ms: 2.6861
  type: 'test'
  ...
# Subtest: VH14-B reconstructs deterministic advancement from durable state plus an immutable definition catalog
ok 973 - VH14-B reconstructs deterministic advancement from durable state plus an immutable definition catalog
  ---
  duration_ms: 0.7805
  type: 'test'
  ...
# Subtest: VH14-B recovers exact single and suite pending cursors after rev1 interruption
ok 974 - VH14-B recovers exact single and suite pending cursors after rev1 interruption
  ---
  duration_ms: 8.1302
  type: 'test'
  ...
# Subtest: VH14-B fails closed on incomplete prerequisites without invoking a step
ok 975 - VH14-B fails closed on incomplete prerequisites without invoking a step
  ---
  duration_ms: 1.1542
  type: 'test'
  ...
# Subtest: VH14-B never manufactures verifier or evidence success
ok 976 - VH14-B never manufactures verifier or evidence success
  ---
  duration_ms: 0.8102
  type: 'test'
  ...
# Subtest: VH14-B advances ordered suites only after PASS and keeps per-scenario proof state
ok 977 - VH14-B advances ordered suites only after PASS and keeps per-scenario proof state
  ---
  duration_ms: 1.423
  type: 'test'
  ...
# Subtest: VH14-B terminal failure stops a suite and blocks later execution
ok 978 - VH14-B terminal failure stops a suite and blocks later execution
  ---
  duration_ms: 0.7002
  type: 'test'
  ...
# Subtest: VH14-B represents PAUSED-HUMAN-ACTION and resumes only through the VH13 port
ok 979 - VH14-B represents PAUSED-HUMAN-ACTION and resumes only through the VH13 port
  ---
  duration_ms: 2.4888
  type: 'test'
  ...
# Subtest: VH14-B resolves a VH13-returned RESUMABLE cursor through the immutable definition
ok 980 - VH14-B resolves a VH13-returned RESUMABLE cursor through the immutable definition
  ---
  duration_ms: 1.472
  type: 'test'
  ...
# Subtest: VH14-B represents RESUMABLE and rejects stale transitions without module work
ok 981 - VH14-B represents RESUMABLE and rejects stale transitions without module work
  ---
  duration_ms: 0.9307
  type: 'test'
  ...
# Subtest: VH14-B rejects RUNNING cleanup retry without exact durable C adoption proof
ok 982 - VH14-B rejects RUNNING cleanup retry without exact durable C adoption proof
  ---
  duration_ms: 0.6739
  type: 'test'
  ...
# Subtest: VH14-B fails closed when lifecycle persistence loses its CAS race
ok 983 - VH14-B fails closed when lifecycle persistence loses its CAS race
  ---
  duration_ms: 0.5312
  type: 'test'
  ...
# Subtest: VH14-B + real C + real VH13 retries cleanup after durable adoption and process restart
ok 984 - VH14-B + real C + real VH13 retries cleanup after durable adoption and process restart
  ---
  duration_ms: 8.3917
  type: 'test'
  ...
# Subtest: VH14-C reconstructs exact run/suite/step state after controller restart
ok 985 - VH14-C reconstructs exact run/suite/step state after controller restart
  ---
  duration_ms: 5.7133
  type: 'test'
  ...
# Subtest: VH14-C rejects malformed and identity-mismatched persistence instead of treating it as empty
ok 986 - VH14-C rejects malformed and identity-mismatched persistence instead of treating it as empty
  ---
  duration_ms: 1.175
  type: 'test'
  ...
# Subtest: VH14-C validates monotonic revisions and preserves CAS stale-write protection
ok 987 - VH14-C validates monotonic revisions and preserves CAS stale-write protection
  ---
  duration_ms: 1.2482
  type: 'test'
  ...
# Subtest: VH14-C accepts Package B's pending cursor and exact pending-to-running start writes
ok 988 - VH14-C accepts Package B's pending cursor and exact pending-to-running start writes
  ---
  duration_ms: 0.8762
  type: 'test'
  ...
# Subtest: VH14-C durably adopts the exact VH13 tuple once and reconstructs the adoption journal
ok 989 - VH14-C durably adopts the exact VH13 tuple once and reconstructs the adoption journal
  ---
  duration_ms: 2.3442
  type: 'test'
  ...
# Subtest: VH14-C invokes durable adoption before VH13 cleanup and safely retries interrupted cleanup
ok 990 - VH14-C invokes durable adoption before VH13 cleanup and safely retries interrupted cleanup
  ---
  duration_ms: 4.8065
  type: 'test'
  ...
# Subtest: VH14-C cleanup success followed by process loss reconstructs the already-running resume step
ok 991 - VH14-C cleanup success followed by process loss reconstructs the already-running resume step
  ---
  duration_ms: 1.608
  type: 'test'
  ...
# Subtest: VH14-C adoption failure or tuple mismatch leaves the VH13 checkpoint intact
ok 992 - VH14-C adoption failure or tuple mismatch leaves the VH13 checkpoint intact
  ---
  duration_ms: 1.5608
  type: 'test'
  ...
# Subtest: VH14-C runner-CAS interruption after tuple journaling retains checkpoint and is retryable
ok 993 - VH14-C runner-CAS interruption after tuple journaling retains checkpoint and is retryable
  ---
  duration_ms: 1.844
  type: 'test'
  ...
# Subtest: VH14-C fails closed on a malformed adoption journal
ok 994 - VH14-C fails closed on a malformed adoption journal
  ---
  duration_ms: 0.8283
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: exact C03-F03 enumeration
ok 995 - VH14 integrated B+C runner: exact C03-F03 enumeration
  ---
  duration_ms: 2.2719
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: deterministic single-scenario advancement
ok 996 - VH14 integrated B+C runner: deterministic single-scenario advancement
  ---
  duration_ms: 5.2795
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: ordered-suite advancement only after allowed terminal result
ok 997 - VH14 integrated B+C runner: ordered-suite advancement only after allowed terminal result
  ---
  duration_ms: 2.4834
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: fail-closed prerequisite handling
ok 998 - VH14 integrated B+C runner: fail-closed prerequisite handling
  ---
  duration_ms: 1.2421
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: unexpected plan/assertion stops before mutation
ok 999 - VH14 integrated B+C runner: unexpected plan/assertion stops before mutation
  ---
  duration_ms: 0.7737
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: human-action pause persists checkpoint/current step
ok 1000 - VH14 integrated B+C runner: human-action pause persists checkpoint/current step
  ---
  duration_ms: 1.072
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: RESUMABLE uses durable VH13 adoption ordering
ok 1001 - VH14 integrated B+C runner: RESUMABLE uses durable VH13 adoption ordering
  ---
  duration_ms: 2.2993
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: restart reconstruction preserves identity and step
ok 1002 - VH14 integrated B+C runner: restart reconstruction preserves identity and step
  ---
  duration_ms: 2.2516
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: PASS requires verifier and evidence success
ok 1003 - VH14 integrated B+C runner: PASS requires verifier and evidence success
  ---
  duration_ms: 1.4863
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: terminal failure blocks subsequent execution
ok 1004 - VH14 integrated B+C runner: terminal failure blocks subsequent execution
  ---
  duration_ms: 0.9852
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: module operations use orchestration interfaces
ok 1005 - VH14 integrated B+C runner: module operations use orchestration interfaces
  ---
  duration_ms: 1.8637
  type: 'test'
  ...
# Subtest: VH14 production composition wires B + C + D without manufacturing proof authority
ok 1006 - VH14 production composition wires B + C + D without manufacturing proof authority
  ---
  duration_ms: 1.3815
  type: 'test'
  ...
# Subtest: VH14-D freezes exact module ownership and routes every step only to its approved VH04-VH13 delegate
ok 1007 - VH14-D freezes exact module ownership and routes every step only to its approved VH04-VH13 delegate
  ---
  duration_ms: 2.9195
  type: 'test'
  ...
# Subtest: VH14-D preserves prerequisite order and fails closed on missing, duplicate, or thrown delegated results
ok 1008 - VH14-D preserves prerequisite order and fails closed on missing, duplicate, or thrown delegated results
  ---
  duration_ms: 1.1481
  type: 'test'
  ...
# Subtest: VH14-D proof ownership prevents planner, executor, and injected faults from manufacturing verification or evidence
ok 1009 - VH14-D proof ownership prevents planner, executor, and injected faults from manufacturing verification or evidence
  ---
  duration_ms: 0.5853
  type: 'test'
  ...
# Subtest: VH14-D preserves VH11 uncertainty as operation completion until a separate VH08 observation establishes physical reality
ok 1010 - VH14-D preserves VH11 uncertainty as operation completion until a separate VH08 observation establishes physical reality
  ---
  duration_ms: 0.5882
  type: 'test'
  ...
# Subtest: VH14-D rejects missing, malformed, and evidence-free delegated proof and converts throws to module failure
ok 1011 - VH14-D rejects missing, malformed, and evidence-free delegated proof and converts throws to module failure
  ---
  duration_ms: 0.7
  type: 'test'
  ...
# Subtest: VH14-D accepts pause/resume only from VH13 for the exact active run
ok 1012 - VH14-D accepts pause/resume only from VH13 for the exact active run
  ---
  duration_ms: 0.7986
  type: 'test'
  ...
# Subtest: post-dispatch response loss cannot precede durable intent persistence and dispatch evidence
ok 1013 - post-dispatch response loss cannot precede durable intent persistence and dispatch evidence
  ---
  duration_ms: 2.3211
  type: 'test'
  ...
# Subtest: response-loss occurrence is deterministic and VH11 cannot manufacture physical certainty
ok 1014 - response-loss occurrence is deterministic and VH11 cannot manufacture physical certainty
  ---
  duration_ms: 0.4824
  type: 'test'
  ...
# Subtest: direct state manipulation refuses non-disposable/primary state authority before touching the port
ok 1015 - direct state manipulation refuses non-disposable/primary state authority before touching the port
  ---
  duration_ms: 1.1734
  type: 'test'
  ...
# Subtest: an authorized sandbox surface that is not a disposable state copy is still refused
ok 1016 - an authorized sandbox surface that is not a disposable state copy is still refused
  ---
  duration_ms: 0.3937
  type: 'test'
  ...
# Subtest: direct state manipulation requires both backup and pre-fault checkpoint evidence
ok 1017 - direct state manipulation requires both backup and pre-fault checkpoint evidence
  ---
  duration_ms: 0.9662
  type: 'test'
  ...
# Subtest: state loss and cursor loss are bounded to the authorized disposable validation state resource
ok 1018 - state loss and cursor loss are bounded to the authorized disposable validation state resource
  ---
  duration_ms: 0.4897
  type: 'test'
  ...
# Subtest: cursor loss cannot be widened into whole-state corruption
ok 1019 - cursor loss cannot be widened into whole-state corruption
  ---
  duration_ms: 0.3167
  type: 'test'
  ...
# Subtest: post-dispatch cancellation uses production run authority and leaves the in-flight atomic operation untouched
ok 1020 - post-dispatch cancellation uses production run authority and leaves the in-flight atomic operation untouched
  ---
  duration_ms: 0.7401
  type: 'test'
  ...
# Subtest: pre-dispatch cancellation deterministically blocks the next atomic operation before dispatch
ok 1021 - pre-dispatch cancellation deterministically blocks the next atomic operation before dispatch
  ---
  duration_ms: 0.6232
  type: 'test'
  ...
# Subtest: VH08 PASS requires complete authoritative local/remote/state/diagnostic and convergence proof
ok 1022 - VH08 PASS requires complete authoritative local/remote/state/diagnostic and convergence proof
  ---
  duration_ms: 11.6015
  type: 'test'
  ...
# Subtest: missing completeness/terminal proof is BLOCKED, never PASS
ok 1023 - missing completeness/terminal proof is BLOCKED, never PASS
  ---
  duration_ms: 0.6192
  type: 'test'
  ...
# Subtest: concrete byte mismatch is FAIL and dominates an unrelated BLOCKED convergence proof
ok 1024 - concrete byte mismatch is FAIL and dominates an unrelated BLOCKED convergence proof
  ---
  duration_ms: 0.7862
  type: 'test'
  ...
# Subtest: read-source types do not expose production mutation authority
ok 1025 - read-source types do not expose production mutation authority
  ---
  duration_ms: 0.1436
  type: 'test'
  ...
# Subtest: H6C terminal production proof requires an exact diagnostic run ID and never falls back to latest event
ok 1026 - H6C terminal production proof requires an exact diagnostic run ID and never falls back to latest event
  ---
  duration_ms: 1.7214
  type: 'test'
  ...
# Subtest: H6C failed or cancelled exact terminal evidence cannot satisfy required completion
ok 1027 - H6C failed or cancelled exact terminal evidence cannot satisfy required completion
  ---
  duration_ms: 1.4801
  type: 'test'
  ...
# Subtest: H6C contradictory or duplicate terminal evidence for the exact run fails closed
ok 1028 - H6C contradictory or duplicate terminal evidence for the exact run fails closed
  ---
  duration_ms: 1.0144
  type: 'test'
  ...
# Subtest: VH10 activation is exact-run/exact-step bound and rejects peer fault ownership
ok 1029 - VH10 activation is exact-run/exact-step bound and rejects peer fault ownership
  ---
  duration_ms: 1.7717
  type: 'test'
  ...
# Subtest: offline injection is deterministic across configured repeated occurrences and then delegates unchanged
ok 1030 - offline injection is deterministic across configured repeated occurrences and then delegates unchanged
  ---
  duration_ms: 25.7353
  type: 'test'
  ...
# Subtest: validation transport wrapper is behavior-neutral when no fault occurrence is armed
ok 1031 - validation transport wrapper is behavior-neutral when no fault occurrence is armed
  ---
  duration_ms: 0.4094
  type: 'test'
  ...
# Subtest: injected HTTP/network causes retain GoogleHttpTransport production classifications
ok 1032 - injected HTTP/network causes retain GoogleHttpTransport production classifications
  ---
  duration_ms: 7.1372
  type: 'test'
  ...
# Subtest: one-shot rate limit uses the production bounded retry path before succeeding
ok 1033 - one-shot rate limit uses the production bounded retry path before succeeding
  ---
  duration_ms: 1.4113
  type: 'test'
  ...
# Subtest: partial-enumeration injection truncates observations, marks partial, and is repeat-deterministic
ok 1034 - partial-enumeration injection truncates observations, marks partial, and is repeat-deterministic
  ---
  duration_ms: 0.5871
  type: 'test'
  ...
# Subtest: enumeration adapter never masks a real production failure or an already-partial result
ok 1035 - enumeration adapter never masks a real production failure or an already-partial result
  ---
  duration_ms: 0.3567
  type: 'test'
  ...
1..1035
# tests 1041
# suites 0
# pass 1041
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 6479.7162
EXIT CODE: 0

## Build
COMMAND: npm run build

> brain-google-drive-sync@0.1.18 build
> node scripts/build.mjs && node scripts/verify-build.mjs


  main.js  962.5kb

Done in 56ms
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
BUILD_ARTIFACT_SIZE=985556
BUILD_ARTIFACT_SHA256=542a8ae22af00f2ed120314f3b10706710c4557a309140845b04579c8024ffd1
EXIT CODE: 0

## Repository check
COMMAND: npm run check

> brain-google-drive-sync@0.1.18 check
> npm run typecheck && npm test && npm run build


> brain-google-drive-sync@0.1.18 typecheck
> tsc --noEmit


> brain-google-drive-sync@0.1.18 test
> tsc -p tsconfig.test.json && node --test .test-build/test/*.test.js

TAP version 13
# Subtest: snapshot keeps unsafe uncertainty distinct from confirmed absence
ok 1 - snapshot keeps unsafe uncertainty distinct from confirmed absence
  ---
  duration_ms: 1.0608
  type: 'test'
  ...
# Subtest: plan freezes required operation vocabulary
ok 2 - plan freezes required operation vocabulary
  ---
  duration_ms: 0.9077
  type: 'test'
  ...
# Subtest: Phase 2 can plan without live adapters
ok 3 - Phase 2 can plan without live adapters
  ---
  duration_ms: 0.4034
  type: 'test'
  ...
# Subtest: local port is consumable through mobile-safe fake
ok 4 - local port is consumable through mobile-safe fake
  ---
  duration_ms: 0.6533
  type: 'test'
  ...
# Subtest: local and Drive transfer contracts accept lazy multi-chunk binary content
ok 5 - local and Drive transfer contracts accept lazy multi-chunk binary content
  ---
  duration_ms: 1.3862
  type: 'test'
  ...
# Subtest: Drive contract freezes drive.file and separates auth from identity
ok 6 - Drive contract freezes drive.file and separates auth from identity
  ---
  duration_ms: 0.5423
  type: 'test'
  ...
# Subtest: Drive listing can be explicitly partial
ok 7 - Drive listing can be explicitly partial
  ---
  duration_ms: 0.5341
  type: 'test'
  ...
# Subtest: state distinguishes new install from expected-state recovery
ok 8 - state distinguishes new install from expected-state recovery
  ---
  duration_ms: 0.3552
  type: 'test'
  ...
# Subtest: conflict contract has no newest-wins result
ok 9 - conflict contract has no newest-wins result
  ---
  duration_ms: 0.6155
  type: 'test'
  ...
# Subtest: execution distinguishes every required outcome
ok 10 - execution distinguishes every required outcome
  ---
  duration_ms: 0.4326
  type: 'test'
  ...
# Subtest: authoritative commit requires verified durable receipt
ok 11 - authoritative commit requires verified durable receipt
  ---
  duration_ms: 0.2525
  type: 'test'
  ...
# Subtest: status/action surface contains required states and no force-sync
ok 12 - status/action surface contains required states and no force-sync
  ---
  duration_ms: 0.2451
  type: 'test'
  ...
# Subtest: desktop bounded reader reconstructs exact bytes with fixed-position bounded reads and closes the handle
ok 13 - desktop bounded reader reconstructs exact bytes with fixed-position bounded reads and closes the handle
  ---
  duration_ms: 3.8818
  type: 'test'
  ...
# Subtest: desktop bounded reader closes its file handle when a consumer stops early
ok 14 - desktop bounded reader closes its file handle when a consumer stops early
  ---
  duration_ms: 0.6634
  type: 'test'
  ...
# Subtest: desktop bounded reader accepts a zero-byte file without issuing a data read
ok 15 - desktop bounded reader accepts a zero-byte file without issuing a data read
  ---
  duration_ms: 0.3703
  type: 'test'
  ...
# Subtest: desktop bounded reader rejects premature EOF and still closes the file handle
ok 16 - desktop bounded reader rejects premature EOF and still closes the file handle
  ---
  duration_ms: 0.8721
  type: 'test'
  ...
# Subtest: desktop bounded reader fails closed on a filesystem read error and closes the handle
ok 17 - desktop bounded reader fails closed on a filesystem read error and closes the handle
  ---
  duration_ms: 0.5087
  type: 'test'
  ...
# Subtest: desktop bounded reader rejects an observation-token change between chunks
ok 18 - desktop bounded reader rejects an observation-token change between chunks
  ---
  duration_ms: 0.5202
  type: 'test'
  ...
# Subtest: desktop bounded reader rejects file-handle metadata mutation after reading
ok 19 - desktop bounded reader rejects file-handle metadata mutation after reading
  ---
  duration_ms: 0.4522
  type: 'test'
  ...
# Subtest: bounded desktop read failure remains unknown canonical evidence rather than trusted content
ok 20 - bounded desktop read failure remains unknown canonical evidence rather than trusted content
  ---
  duration_ms: 1.2344
  type: 'test'
  ...
# Subtest: desktop composition hashes canonical SHA-256 through filesystem chunks without resource URL or fetch
ok 21 - desktop composition hashes canonical SHA-256 through filesystem chunks without resource URL or fetch
  ---
  duration_ms: 53.5796
  type: 'test'
  ...
# Subtest: desktop guard permits ordinary files, directories, and not-yet-created targets inside the vault
ok 22 - desktop guard permits ordinary files, directories, and not-yet-created targets inside the vault
  ---
  duration_ms: 17.4686
  type: 'test'
  ...
# Subtest: desktop guard blocks a symlink before traversal can reach an outside target
ok 23 - desktop guard blocks a symlink before traversal can reach an outside target
  ---
  duration_ms: 10.6463
  type: 'test'
  ...
# Subtest: desktop guard treats a Windows-style junction/reparse link indication as blocked
ok 24 - desktop guard treats a Windows-style junction/reparse link indication as blocked
  ---
  duration_ms: 0.9337
  type: 'test'
  ...
# Subtest: desktop guard blocks a non-link reparse/canonical resolution that escapes the vault
ok 25 - desktop guard blocks a non-link reparse/canonical resolution that escapes the vault
  ---
  duration_ms: 0.3901
  type: 'test'
  ...
# Subtest: C3-R1 local folder rename propagated to REMOTE completes descendant convergence without duplicate child move
ok 26 - C3-R1 local folder rename propagated to REMOTE completes descendant convergence without duplicate child move
  ---
  duration_ms: 18.8312
  type: 'test'
  ...
# Subtest: C3-R1 remote folder rename propagated to LOCAL completes descendant convergence without duplicate child move
ok 27 - C3-R1 remote folder rename propagated to LOCAL completes descendant convergence without duplicate child move
  ---
  duration_ms: 4.7428
  type: 'test'
  ...
# Subtest: confirmed absence remains distinct from read/access failures
ok 28 - confirmed absence remains distinct from read/access failures
  ---
  duration_ms: 4.5089
  type: 'test'
  ...
# Subtest: enumeration reports partial truthfully when a directory listing fails
ok 29 - enumeration reports partial truthfully when a directory listing fails
  ---
  duration_ms: 0.9905
  type: 'test'
  ...
# Subtest: mid-write metadata change is observed as unstable and cannot be read as a stable transfer
ok 30 - mid-write metadata change is observed as unstable and cannot be read as a stable transfer
  ---
  duration_ms: 13.7104
  type: 'test'
  ...
# Subtest: staging write failure leaves an existing destination byte-for-byte intact
ok 31 - staging write failure leaves an existing destination byte-for-byte intact
  ---
  duration_ms: 6.5829
  type: 'test'
  ...
# Subtest: visibility lifecycle emits suspend/resume without starting synchronization or deleting content
ok 32 - visibility lifecycle emits suspend/resume without starting synchronization or deleting content
  ---
  duration_ms: 0.8376
  type: 'test'
  ...
# Subtest: explicit exclusion policy keeps unknown content and excludes visible operational noise
ok 33 - explicit exclusion policy keeps unknown content and excludes visible operational noise
  ---
  duration_ms: 2.3615
  type: 'test'
  ...
# Subtest: active configuration directory is a distinct exclusion boundary and is runtime-named
ok 34 - active configuration directory is a distinct exclusion boundary and is runtime-named
  ---
  duration_ms: 1.0563
  type: 'test'
  ...
# Subtest: path normalization preserves original spelling while comparisons normalize separators
ok 35 - path normalization preserves original spelling while comparisons normalize separators
  ---
  duration_ms: 0.7799
  type: 'test'
  ...
# Subtest: path validation blocks Windows reserved and invalid names
ok 36 - path validation blocks Windows reserved and invalid names
  ---
  duration_ms: 0.5707
  type: 'test'
  ...
# Subtest: path validation blocks external references and traversal
ok 37 - path validation blocks external references and traversal
  ---
  duration_ms: 0.3266
  type: 'test'
  ...
# Subtest: path validation blocks case-only collisions
ok 38 - path validation blocks case-only collisions
  ---
  duration_ms: 0.1553
  type: 'test'
  ...
# Subtest: path validation blocks Unicode-equivalent collisions
ok 39 - path validation blocks Unicode-equivalent collisions
  ---
  duration_ms: 0.3063
  type: 'test'
  ...
# Subtest: path validation preflights conservative Windows-compatible path length
ok 40 - path validation preflights conservative Windows-compatible path length
  ---
  duration_ms: 0.1616
  type: 'test'
  ...
# Subtest: selective configuration policy is explicit and unknown-excluded by default
ok 41 - selective configuration policy is explicit and unknown-excluded by default
  ---
  duration_ms: 1.9334
  type: 'test'
  ...
# Subtest: configuration policy protects secrets device identity and synchronization state
ok 42 - configuration policy protects secrets device identity and synchronization state
  ---
  duration_ms: 1.1337
  type: 'test'
  ...
# Subtest: manifest declares mobile compatibility
ok 43 - manifest declares mobile compatibility
  ---
  duration_ms: 1.3185
  type: 'test'
  ...
# Subtest: mobile-required runtime source has no Node/Electron/Windows-only imports
ok 44 - mobile-required runtime source has no Node/Electron/Windows-only imports
  ---
  duration_ms: 147.2151
  type: 'test'
  ...
# Subtest: desktop local adapter is loaded only by a Platform-guarded dynamic import
ok 45 - desktop local adapter is loaded only by a Platform-guarded dynamic import
  ---
  duration_ms: 0.833
  type: 'test'
  ...
# Subtest: Node filesystem imports are confined to the declared desktop-only modules
ok 46 - Node filesystem imports are confined to the declared desktop-only modules
  ---
  duration_ms: 288.384
  type: 'test'
  ...
# Subtest: desktop local construction is not imported by the mobile-neutral adapter
ok 47 - desktop local construction is not imported by the mobile-neutral adapter
  ---
  duration_ms: 0.7158
  type: 'test'
  ...
# Subtest: frozen payload contracts expose no authentication secret fields
ok 48 - frozen payload contracts expose no authentication secret fields
  ---
  duration_ms: 2.6101
  type: 'test'
  ...
# Subtest: prepared OAuth diagnostic captures the real URL without launching and later launches it once from a fresh call
ok 49 - prepared OAuth diagnostic captures the real URL without launching and later launches it once from a fresh call
  ---
  duration_ms: 2.2029
  type: 'test'
  ...
# Subtest: prepared OAuth diagnostic refuses launch before preparation
ok 50 - prepared OAuth diagnostic refuses launch before preparation
  ---
  duration_ms: 0.1836
  type: 'test'
  ...
# Subtest: prepared OAuth diagnostic restores the browser function when preparation fails
ok 51 - prepared OAuth diagnostic restores the browser function when preparation fails
  ---
  duration_ms: 0.3988
  type: 'test'
  ...
# Subtest: enumeration overlaps independent file observations under one cap of four
ok 52 - enumeration overlaps independent file observations under one cap of four
  ---
  duration_ms: 13.237
  type: 'test'
  ...
# Subtest: every file still receives the second metadata observation and mid-window change remains unstable
ok 53 - every file still receives the second metadata observation and mid-window change remains unstable
  ---
  duration_ms: 3.1898
  type: 'test'
  ...
# Subtest: result ordering follows logical traversal order even when observations finish in reverse
ok 54 - result ordering follows logical traversal order even when observations finish in reverse
  ---
  duration_ms: 10.6298
  type: 'test'
  ...
# Subtest: uncertainty ordering remains deterministic when different failures finish in reverse
ok 55 - uncertainty ordering remains deterministic when different failures finish in reverse
  ---
  duration_ms: 2.0078
  type: 'test'
  ...
# Subtest: nested directory traversal shares the same global cap instead of multiplying concurrency
ok 56 - nested directory traversal shares the same global cap instead of multiplying concurrency
  ---
  duration_ms: 27.9611
  type: 'test'
  ...
# Subtest: enumeration still blocks unsafe children, excludes protected subtrees, and invokes no mutation API
ok 57 - enumeration still blocks unsafe children, excludes protected subtrees, and invokes no mutation API
  ---
  duration_ms: 1.2516
  type: 'test'
  ...
# Subtest: same-path same-token read-only reuse replaces each repeated stability window with one live stat
ok 58 - same-path same-token read-only reuse replaces each repeated stability window with one live stat
  ---
  duration_ms: 10.6118
  type: 'test'
  ...
# Subtest: generation invalidation while fast-path stat is pending rejects the stale token
ok 59 - generation invalidation while fast-path stat is pending rejects the stale token
  ---
  duration_ms: 8.499
  type: 'test'
  ...
# Subtest: observation epoch replacement while fast-path stat is pending cannot return the prior cached proof
ok 60 - observation epoch replacement while fast-path stat is pending cannot return the prior cached proof
  ---
  duration_ms: 45.4532
  type: 'test'
  ...
# Subtest: mid-stat generation invalidation rejects before any resource bytes are fetched
ok 61 - mid-stat generation invalidation rejects before any resource bytes are fetched
  ---
  duration_ms: 14.618
  type: 'test'
  ...
# Subtest: create modify and delete events invalidate same-path reusable evidence by generation
ok 62 - create modify and delete events invalidate same-path reusable evidence by generation
  ---
  duration_ms: 78.4101
  type: 'test'
  ...
# Subtest: rename invalidates reusable evidence for both old and new paths
ok 63 - rename invalidates reusable evidence for both old and new paths
  ---
  duration_ms: 31.235
  type: 'test'
  ...
# Subtest: changed stat cannot reuse old evidence and falls back to stale rejection
ok 64 - changed stat cannot reuse old evidence and falls back to stale rejection
  ---
  duration_ms: 31.2684
  type: 'test'
  ...
# Subtest: change after read admission but before byte consumption is detected before fetch
ok 65 - change after read admission but before byte consumption is detected before fetch
  ---
  duration_ms: 31.2351
  type: 'test'
  ...
# Subtest: change during byte streaming remains stale-detected with read-only evidence reuse
ok 66 - change during byte streaming remains stale-detected with read-only evidence reuse
  ---
  duration_ms: 36.0897
  type: 'test'
  ...
# Subtest: replace still performs full live target checks before physical displacement
ok 67 - replace still performs full live target checks before physical displacement
  ---
  duration_ms: 55.7804
  type: 'test'
  ...
# Subtest: reinitialization cannot inherit reusable evidence from a disposed adapter
ok 68 - reinitialization cannot inherit reusable evidence from a disposed adapter
  ---
  duration_ms: 31.048
  type: 'test'
  ...
# Subtest: enumeration covers text binary hidden and empty folders while separating config/noise
ok 69 - enumeration covers text binary hidden and empty folders while separating config/noise
  ---
  duration_ms: 13.428
  type: 'test'
  ...
# Subtest: active configuration directory is discovered from runtime rather than assumed .obsidian
ok 70 - active configuration directory is discovered from runtime rather than assumed .obsidian
  ---
  duration_ms: 0.4267
  type: 'test'
  ...
# Subtest: readFile is lazy and reconstructs exact bytes through bounded sequential ranges without readBinary
ok 71 - readFile is lazy and reconstructs exact bytes through bounded sequential ranges without readBinary
  ---
  duration_ms: 35.0785
  type: 'test'
  ...
# Subtest: incremental resource read accepts a streamed HTTP 200 response when the runtime ignores Range
ok 72 - incremental resource read accepts a streamed HTTP 200 response when the runtime ignores Range
  ---
  duration_ms: 5.5174
  type: 'test'
  ...
# Subtest: bounded read rejects malformed partial-content evidence
ok 73 - bounded read rejects malformed partial-content evidence
  ---
  duration_ms: 4.0289
  type: 'test'
  ...
# Subtest: expected observation token rejects stale local versions before consumption
ok 74 - expected observation token rejects stale local versions before consumption
  ---
  duration_ms: 15.1601
  type: 'test'
  ...
# Subtest: bounded read detects a source that becomes stale between ranges
ok 75 - bounded read detects a source that becomes stale between ranges
  ---
  duration_ms: 15.735
  type: 'test'
  ...
# Subtest: create consumes multi-chunk content incrementally and preserves opaque bytes
ok 76 - create consumes multi-chunk content incrementally and preserves opaque bytes
  ---
  duration_ms: 15.399
  type: 'test'
  ...
# Subtest: replace stages content and restores prior valid content if final commit rename fails
ok 77 - replace stages content and restores prior valid content if final commit rename fails
  ---
  duration_ms: 16.4765
  type: 'test'
  ...
# Subtest: createFolder preserves empty directory structure
ok 78 - createFolder preserves empty directory structure
  ---
  duration_ms: 1.97
  type: 'test'
  ...
# Subtest: move and trash use Obsidian FileManager semantics
ok 79 - move and trash use Obsidian FileManager semantics
  ---
  duration_ms: 28.6824
  type: 'test'
  ...
# Subtest: generic adapter without an external-reference guard fails closed before ordinary path observation
ok 80 - generic adapter without an external-reference guard fails closed before ordinary path observation
  ---
  duration_ms: 0.9682
  type: 'test'
  ...
# Subtest: generic adapter without an external-reference guard blocks create replace move and trash
ok 81 - generic adapter without an external-reference guard blocks create replace move and trash
  ---
  duration_ms: 0.8933
  type: 'test'
  ...
# Subtest: blocked folder subtree makes enumeration partial rather than falsely complete
ok 82 - blocked folder subtree makes enumeration partial rather than falsely complete
  ---
  duration_ms: 3.8438
  type: 'test'
  ...
# Subtest: a listed file that disappears before observation creates exact-path uncertainty only
ok 83 - a listed file that disappears before observation creates exact-path uncertainty only
  ---
  duration_ms: 1.3422
  type: 'test'
  ...
# Subtest: startup changes are suppressed until vault-ready and later create/rename events are truthful
ok 84 - startup changes are suppressed until vault-ready and later create/rename events are truthful
  ---
  duration_ms: 0.9449
  type: 'test'
  ...
# Subtest: dispose emits unload without deleting local content
ok 85 - dispose emits unload without deleting local content
  ---
  duration_ms: 0.4211
  type: 'test'
  ...
# Subtest: resource admission accepts below/at threshold and refuses above before materialization
ok 86 - resource admission accepts below/at threshold and refuses above before materialization
  ---
  duration_ms: 3.8692
  type: 'test'
  ...
# Subtest: unknown-size and combined-over-limit versions never enter materialization
ok 87 - unknown-size and combined-over-limit versions never enter materialization
  ---
  duration_ms: 0.4222
  type: 'test'
  ...
# Subtest: cancellation at admission and materialization never produces partial success
ok 88 - cancellation at admission and materialization never produces partial success
  ---
  duration_ms: 0.8505
  type: 'test'
  ...
# Subtest: cancellation and comparison exhaustion during merge computation return no partial merge
ok 89 - cancellation and comparison exhaustion during merge computation return no partial merge
  ---
  duration_ms: 2.2909
  type: 'test'
  ...
# Subtest: ordinary clean non-overlapping merge remains correct
ok 90 - ordinary clean non-overlapping merge remains correct
  ---
  duration_ms: 1.8274
  type: 'test'
  ...
# Subtest: overlap remains unresolved and preserves complete provenance
ok 91 - overlap remains unresolved and preserves complete provenance
  ---
  duration_ms: 1.003
  type: 'test'
  ...
# Subtest: BASE-missing and opaque cases preserve both current versions
ok 92 - BASE-missing and opaque cases preserve both current versions
  ---
  duration_ms: 0.5938
  type: 'test'
  ...
# Subtest: multibyte persistence uses exact UTF-8 byte evidence and rejects corrupt canonical-key content
ok 93 - multibyte persistence uses exact UTF-8 byte evidence and rejects corrupt canonical-key content
  ---
  duration_ms: 2.082
  type: 'test'
  ...
# Subtest: oversized and unknown-size capture paths do not buffer or retain text
ok 94 - oversized and unknown-size capture paths do not buffer or retain text
  ---
  duration_ms: 0.8973
  type: 'test'
  ...
# Subtest: three-way merge accepts independent line edits
ok 95 - three-way merge accepts independent line edits
  ---
  duration_ms: 0.6398
  type: 'test'
  ...
# Subtest: three-way merge rejects overlapping incompatible edits
ok 96 - three-way merge rejects overlapping incompatible edits
  ---
  duration_ms: 0.2856
  type: 'test'
  ...
# Subtest: conflict resolver returns clean merge only with BASE LOCAL REMOTE text
ok 97 - conflict resolver returns clean merge only with BASE LOCAL REMOTE text
  ---
  duration_ms: 0.4658
  type: 'test'
  ...
# Subtest: true text conflict preserves complete version references
ok 98 - true text conflict preserves complete version references
  ---
  duration_ms: 0.2729
  type: 'test'
  ...
# Subtest: opaque binary concurrency never uses timestamp winner
ok 99 - opaque binary concurrency never uses timestamp winner
  ---
  duration_ms: 0.2063
  type: 'test'
  ...
# Subtest: delete-vs-modify preserves modified side provenance
ok 100 - delete-vs-modify preserves modified side provenance
  ---
  duration_ms: 0.1585
  type: 'test'
  ...
# Subtest: stale precondition invalidates affected work before mutation
ok 101 - stale precondition invalidates affected work before mutation
  ---
  duration_ms: 4.0127
  type: 'test'
  ...
# Subtest: durable verified execution is journaled pending before authoritative success commit
ok 102 - durable verified execution is journaled pending before authoritative success commit
  ---
  duration_ms: 2.3461
  type: 'test'
  ...
# Subtest: uncertain mutation outcome is persisted as uncertain and never authoritative success
ok 103 - uncertain mutation outcome is persisted as uncertain and never authoritative success
  ---
  duration_ms: 1.5426
  type: 'test'
  ...
# Subtest: post-journal stale intent is retired only through an exact durable state transition
ok 104 - post-journal stale intent is retired only through an exact durable state transition
  ---
  duration_ms: 1.2828
  type: 'test'
  ...
# Subtest: failed stale-intent retirement remains globally recoverable and preserves the pending journal
ok 105 - failed stale-intent retirement remains globally recoverable and preserves the pending journal
  ---
  duration_ms: 0.7871
  type: 'test'
  ...
# Subtest: both attested deleted and no-base both absent remain non-destructive no-ops
ok 106 - both attested deleted and no-base both absent remain non-destructive no-ops
  ---
  duration_ms: 4.653
  type: 'test'
  ...
# Subtest: inaccessible and unknown local observations are blocked rather than deletion evidence
ok 107 - inaccessible and unknown local observations are blocked rather than deletion evidence
  ---
  duration_ms: 1.7514
  type: 'test'
  ...
# Subtest: failed and unknown remote enumeration cannot authorize remote-absence deletion
ok 108 - failed and unknown remote enumeration cannot authorize remote-absence deletion
  ---
  duration_ms: 1.445
  type: 'test'
  ...
# Subtest: empty folders use entity-kind semantics without requiring file content hashes
ok 109 - empty folders use entity-kind semantics without requiring file content hashes
  ---
  duration_ms: 0.6846
  type: 'test'
  ...
# Subtest: fresh local only uploads
ok 110 - fresh local only uploads
  ---
  duration_ms: 4.6362
  type: 'test'
  ...
# Subtest: fresh remote only downloads
ok 111 - fresh remote only downloads
  ---
  duration_ms: 0.6976
  type: 'test'
  ...
# Subtest: equal no-base collision is noop
ok 112 - equal no-base collision is noop
  ---
  duration_ms: 0.6792
  type: 'test'
  ...
# Subtest: divergent no-base collision conflicts
ok 113 - divergent no-base collision conflicts
  ---
  duration_ms: 0.9117
  type: 'test'
  ...
# Subtest: trusted matrix distinguishes local, remote, and concurrent change
ok 114 - trusted matrix distinguishes local, remote, and concurrent change
  ---
  duration_ms: 3.6916
  type: 'test'
  ...
# Subtest: clock skew alone never changes classification
ok 115 - clock skew alone never changes classification
  ---
  duration_ms: 1.3909
  type: 'test'
  ...
# Subtest: attested deletions require trustworthy prior two-sided state
ok 116 - attested deletions require trustworthy prior two-sided state
  ---
  duration_ms: 2.5616
  type: 'test'
  ...
# Subtest: delete-vs-modify preserves modification as conflict
ok 117 - delete-vs-modify preserves modification as conflict
  ---
  duration_ms: 0.929
  type: 'test'
  ...
# Subtest: uncertain local access and incomplete remote absence cannot authorize deletion
ok 118 - uncertain local access and incomplete remote absence cannot authorize deletion
  ---
  duration_ms: 1.3298
  type: 'test'
  ...
# Subtest: missing or corrupt operational state enters recovery planning
ok 119 - missing or corrupt operational state enters recovery planning
  ---
  duration_ms: 1.0094
  type: 'test'
  ...
# Subtest: identity ambiguity is blocked and never guessed
ok 120 - identity ambiguity is blocked and never guessed
  ---
  duration_ms: 0.4706
  type: 'test'
  ...
# Subtest: stable remote object ID proves an identity-preserving remote move
ok 121 - stable remote object ID proves an identity-preserving remote move
  ---
  duration_ms: 0.8788
  type: 'test'
  ...
# Subtest: ambiguous stable remote identity is blocked rather than reassigned
ok 122 - ambiguous stable remote identity is blocked rather than reassigned
  ---
  duration_ms: 0.4307
  type: 'test'
  ...
# Subtest: unique trusted content hash proves local move while duplicate candidates are blocked
ok 123 - unique trusted content hash proves local move while duplicate candidates are blocked
  ---
  duration_ms: 1.0233
  type: 'test'
  ...
# Subtest: tombstone plus stale known device blocks resurrection
ok 124 - tombstone plus stale known device blocks resurrection
  ---
  duration_ms: 0.6341
  type: 'test'
  ...
# Subtest: current stale device cannot authorize destructive propagation
ok 125 - current stale device cannot authorize destructive propagation
  ---
  duration_ms: 0.52
  type: 'test'
  ...
# Subtest: ordinary deletion stays auto-eligible while suspicious deletion requires checkpoint
ok 126 - ordinary deletion stays auto-eligible while suspicious deletion requires checkpoint
  ---
  duration_ms: 1.0352
  type: 'test'
  ...
# Subtest: C3 file-to-folder and folder-to-file transitions relative to BASE are never classified as unchanged or overwrite/delete updates
ok 127 - C3 file-to-folder and folder-to-file transitions relative to BASE are never classified as unchanged or overwrite/delete updates
  ---
  duration_ms: 0.5734
  type: 'test'
  ...
# Subtest: C3 non-empty local folder rename physically moves only the ancestor and records descendant convergence
ok 128 - C3 non-empty local folder rename physically moves only the ancestor and records descendant convergence
  ---
  duration_ms: 1.2888
  type: 'test'
  ...
# Subtest: tombstone retention is bounded but never expires while any known device is stale
ok 129 - tombstone retention is bounded but never expires while any known device is stale
  ---
  duration_ms: 1.0769
  type: 'test'
  ...
# Subtest: device identities are random-source derived and reject all-zero entropy
ok 130 - device identities are random-source derived and reject all-zero entropy
  ---
  duration_ms: 0.592
  type: 'test'
  ...
# Subtest: destructive breaker independently detects count, percentage, abnormal divergence, and state integrity signals
ok 131 - destructive breaker independently detects count, percentage, abnormal divergence, and state integrity signals
  ---
  duration_ms: 1.4104
  type: 'test'
  ...
# Subtest: review approval is scoped to exact plan and requires a checkpoint
ok 132 - review approval is scoped to exact plan and requires a checkpoint
  ---
  duration_ms: 0.3505
  type: 'test'
  ...
# Subtest: a returning stale current device cannot authorize destructive propagation
ok 133 - a returning stale current device cannot authorize destructive propagation
  ---
  duration_ms: 1.9892
  type: 'test'
  ...
# Subtest: atomic compare-and-swap detects a writer that changes state after the caller reads it
ok 134 - atomic compare-and-swap detects a writer that changes state after the caller reads it
  ---
  duration_ms: 3.787
  type: 'test'
  ...
# Subtest: verified both-deleted transition removes prior base and records a durable both-side tombstone
ok 135 - verified both-deleted transition removes prior base and records a durable both-side tombstone
  ---
  duration_ms: 1.7913
  type: 'test'
  ...
# Subtest: journal-only persistence advances CAS revision without advancing semantic authority
ok 136 - journal-only persistence advances CAS revision without advancing semantic authority
  ---
  duration_ms: 3.8218
  type: 'test'
  ...
# Subtest: file BASE healing accepts only current canonical equality and creates exact BASE authority
ok 137 - file BASE healing accepts only current canonical equality and creates exact BASE authority
  ---
  duration_ms: 1.9372
  type: 'test'
  ...
# Subtest: learned Drive batches remain lossless until explicit durable reduction permits retirement
ok 138 - learned Drive batches remain lossless until explicit durable reduction permits retirement
  ---
  duration_ms: 3.4636
  type: 'test'
  ...
# Subtest: crash/restart matrix covers upload, download, moves, and trash at every durable stage
ok 139 - crash/restart matrix covers upload, download, moves, and trash at every durable stage
  ---
  duration_ms: 15.3781
  type: 'test'
  ...
# Subtest: clean merge keeps independently staged effects and cannot complete after only one side commits
ok 140 - clean merge keeps independently staged effects and cannot complete after only one side commits
  ---
  duration_ms: 2.0474
  type: 'test'
  ...
# Subtest: known semantic contradictions and extensible contradictions both fail closed
ok 141 - known semantic contradictions and extensible contradictions both fail closed
  ---
  duration_ms: 0.3478
  type: 'test'
  ...
# Subtest: legacy state is not promoted silently; authority migration backs up before reconstruction
ok 142 - legacy state is not promoted silently; authority migration backs up before reconstruction
  ---
  duration_ms: 1.2445
  type: 'test'
  ...
# Subtest: stale-device registration, aging, clearing, and durable semantic transition gate destructive authority
ok 143 - stale-device registration, aging, clearing, and durable semantic transition gate destructive authority
  ---
  duration_ms: 1.4505
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
ok 144 - v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
  ---
  duration_ms: 1.2901
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
ok 145 - v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
  ---
  duration_ms: 0.8654
  type: 'test'
  ...
# Subtest: v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
ok 146 - v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
  ---
  duration_ms: 0.6717
  type: 'test'
  ...
# Subtest: v1.1 verified folder effect restarts by finishing authoritative state commit
ok 147 - v1.1 verified folder effect restarts by finishing authoritative state commit
  ---
  duration_ms: 0.8438
  type: 'test'
  ...
# Subtest: v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
ok 148 - v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
  ---
  duration_ms: 0.3817
  type: 'test'
  ...
# Subtest: v1.1 journal-only folder updates advance persistence revision without semantic generation
ok 149 - v1.1 journal-only folder updates advance persistence revision without semantic generation
  ---
  duration_ms: 0.4305
  type: 'test'
  ...
# Subtest: explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
ok 150 - explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
  ---
  duration_ms: 2.0516
  type: 'test'
  ...
# Subtest: malformed or inconsistent persisted v1.1 folder journal fails closed
ok 151 - malformed or inconsistent persisted v1.1 folder journal fails closed
  ---
  duration_ms: 0.8052
  type: 'test'
  ...
# Subtest: v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
ok 152 - v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
  ---
  duration_ms: 0.4088
  type: 'test'
  ...
# Subtest: LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
ok 153 - LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
  ---
  duration_ms: 5.9259
  type: 'test'
  ...
# Subtest: LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
ok 154 - LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
  ---
  duration_ms: 2.3506
  type: 'test'
  ...
# Subtest: LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
ok 155 - LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
  ---
  duration_ms: 1.2652
  type: 'test'
  ...
# Subtest: true new install differs from missing expected state
ok 156 - true new install differs from missing expected state
  ---
  duration_ms: 1.6575
  type: 'test'
  ...
# Subtest: malformed and truncated state enter recovery
ok 157 - malformed and truncated state enter recovery
  ---
  duration_ms: 0.5406
  type: 'test'
  ...
# Subtest: internally inconsistent state is recovery-required even with a valid envelope checksum
ok 158 - internally inconsistent state is recovery-required even with a valid envelope checksum
  ---
  duration_ms: 0.7694
  type: 'test'
  ...
# Subtest: integrity failure and incompatible schema enter recovery
ok 159 - integrity failure and incompatible schema enter recovery
  ---
  duration_ms: 1.1329
  type: 'test'
  ...
# Subtest: clone or restore suspicion is detected from expected device identity
ok 160 - clone or restore suspicion is detected from expected device identity
  ---
  duration_ms: 1.4094
  type: 'test'
  ...
# Subtest: stale revision prevents concurrent state overwrite
ok 161 - stale revision prevents concurrent state overwrite
  ---
  duration_ms: 0.4392
  type: 'test'
  ...
# Subtest: change cursor and stale-device metadata round-trip as durable synchronization state
ok 162 - change cursor and stale-device metadata round-trip as durable synchronization state
  ---
  duration_ms: 0.5765
  type: 'test'
  ...
# Subtest: device removal changes only known-device coordination state
ok 163 - device removal changes only known-device coordination state
  ---
  duration_ms: 1.1816
  type: 'test'
  ...
# Subtest: migration assessment is backward-aware and migration creates backup first
ok 164 - migration assessment is backward-aware and migration creates backup first
  ---
  duration_ms: 1.1689
  type: 'test'
  ...
# Subtest: diagnostic export is an explicit metadata projection
ok 165 - diagnostic export is an explicit metadata projection
  ---
  duration_ms: 1.2769
  type: 'test'
  ...
# Subtest: operation journal records checkpointed pending and uncertain work without claiming success
ok 166 - operation journal records checkpointed pending and uncertain work without claiming success
  ---
  duration_ms: 1.693
  type: 'test'
  ...
# Subtest: verified success is committed only after a matching durable verified receipt and preserves checkpoint provenance
ok 167 - verified success is committed only after a matching durable verified receipt and preserves checkpoint provenance
  ---
  duration_ms: 1.5974
  type: 'test'
  ...
# Subtest: run coordination serializes writers, cancels future operations, and requests later reconcile
ok 168 - run coordination serializes writers, cancels future operations, and requests later reconcile
  ---
  duration_ms: 0.7375
  type: 'test'
  ...
# Subtest: hosted OAuth callback remains content-blind, token-nonpersistent, and history-sanitizing
ok 169 - hosted OAuth callback remains content-blind, token-nonpersistent, and history-sanitizing
  ---
  duration_ms: 1.3063
  type: 'test'
  ...
# Subtest: incomplete callback sanitizes history without preparing or launching a handoff
ok 170 - incomplete callback sanitizes history without preparing or launching a handoff
  ---
  duration_ms: 3.7356
  type: 'test'
  ...
# Subtest: valid authorization-code callback prepares one exact manual target before automatic navigation
ok 171 - valid authorization-code callback prepares one exact manual target before automatic navigation
  ---
  duration_ms: 1.6161
  type: 'test'
  ...
# Subtest: valid OAuth-error callback prepares the same manual and automatic handoff path
ok 172 - valid OAuth-error callback prepares the same manual and automatic handoff path
  ---
  duration_ms: 2.257
  type: 'test'
  ...
# Subtest: automatic navigation failure remains secret-safe and leaves the direct fallback active
ok 173 - automatic navigation failure remains secret-safe and leaves the direct fallback active
  ---
  duration_ms: 1.1933
  type: 'test'
  ...
# Subtest: managed root creation stamps stable vault identity protocol and portable-config role metadata
ok 174 - managed root creation stamps stable vault identity protocol and portable-config role metadata
  ---
  duration_ms: 34.978
  type: 'test'
  ...
# Subtest: start cursor and incremental change page retain Drive identity
ok 175 - start cursor and incremental change page retain Drive identity
  ---
  duration_ms: 7.0899
  type: 'test'
  ...
# Subtest: Google account change blocks remote mutation until explicit re-pair
ok 176 - Google account change blocks remote mutation until explicit re-pair
  ---
  duration_ms: 0.6912
  type: 'test'
  ...
# Subtest: workstream A v1.3: lazy authentication failure is public without A-private error knowledge
ok 177 - workstream A v1.3: lazy authentication failure is public without A-private error knowledge
  ---
  duration_ms: 35.5506
  type: 'test'
  ...
# Subtest: workstream A v1.3: lazy transient failure preserves category
ok 178 - workstream A v1.3: lazy transient failure preserves category
  ---
  duration_ms: 1.2015
  type: 'test'
  ...
# Subtest: workstream A v1.3: lazy rate limit preserves exact retry timing
ok 179 - workstream A v1.3: lazy rate limit preserves exact retry timing
  ---
  duration_ms: 1.7588
  type: 'test'
  ...
# Subtest: workstream A v1.3: post-stream remote change exposes public recovery provenance
ok 180 - workstream A v1.3: post-stream remote change exposes public recovery provenance
  ---
  duration_ms: 5.1137
  type: 'test'
  ...
# Subtest: workstream A v1.3: arbitrary errors fabricate no Drive provenance
ok 181 - workstream A v1.3: arbitrary errors fabricate no Drive provenance
  ---
  duration_ms: 0.3736
  type: 'test'
  ...
# Subtest: workstream A v1.3: not-found and conflict stay contextual
ok 182 - workstream A v1.3: not-found and conflict stay contextual
  ---
  duration_ms: 0.3782
  type: 'test'
  ...
# Subtest: workstream A v1.3: outcome-unknown plus rate limit remains physically outcome-unknown
ok 183 - workstream A v1.3: outcome-unknown plus rate limit remains physically outcome-unknown
  ---
  duration_ms: 0.3324
  type: 'test'
  ...
# Subtest: workstream A v1.3: verified-not-applied plus authentication preserves both facts
ok 184 - workstream A v1.3: verified-not-applied plus authentication preserves both facts
  ---
  duration_ms: 0.2185
  type: 'test'
  ...
# Subtest: workstream A v1.3: reliable mutation keeps rate-limited pre-observation physically unknown
ok 185 - workstream A v1.3: reliable mutation keeps rate-limited pre-observation physically unknown
  ---
  duration_ms: 1.4573
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: correct reserved folder returns actual path and parent
ok 186 - workstream A v1.2 recovery: correct reserved folder returns actual path and parent
  ---
  duration_ms: 7.223
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: wrong actual parent is not overwritten from descriptor
ok 187 - workstream A v1.2 recovery: wrong actual parent is not overwritten from descriptor
  ---
  duration_ms: 2.9982
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: wrong structural path is reported as actually observed
ok 188 - workstream A v1.2 recovery: wrong structural path is reported as actually observed
  ---
  duration_ms: 2.5412
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: absent reserved id plus independent path occupant returns occupied
ok 189 - workstream A v1.2 recovery: absent reserved id plus independent path occupant returns occupied
  ---
  duration_ms: 2.8919
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: absence requires reserved-id absence and authoritatively clear target
ok 190 - workstream A v1.2 recovery: absence requires reserved-id absence and authoritatively clear target
  ---
  duration_ms: 2.3621
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: duplicate structural target is unobservable
ok 191 - workstream A v1.2 recovery: duplicate structural target is unobservable
  ---
  duration_ms: 2.8195
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: duplicate parent path is unobservable
ok 192 - workstream A v1.2 recovery: duplicate parent path is unobservable
  ---
  duration_ms: 1.5669
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: incomplete network/auth observation stays unobservable
ok 193 - workstream A v1.2 recovery: incomplete network/auth observation stays unobservable
  ---
  duration_ms: 0.4491
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: cancellation stays unobservable and performs no mutation
ok 194 - workstream A v1.2 recovery: cancellation stays unobservable and performs no mutation
  ---
  duration_ms: 0.4321
  type: 'test'
  ...
# Subtest: workstream A v1.2 recovery: descriptor facts alone cannot manufacture observation
ok 195 - workstream A v1.2 recovery: descriptor facts alone cannot manufacture observation
  ---
  duration_ms: 0.5255
  type: 'test'
  ...
# Subtest: workstream A changes: reliable page distinguishes intermediate and terminal tokens without PATCH side effects
ok 196 - workstream A changes: reliable page distinguishes intermediate and terminal tokens without PATCH side effects
  ---
  duration_ms: 6.5037
  type: 'test'
  ...
# Subtest: workstream A changes: malformed Drive token combination fails conservatively
ok 197 - workstream A changes: malformed Drive token combination fails conservatively
  ---
  duration_ms: 1.5783
  type: 'test'
  ...
# Subtest: workstream A observation: reconciliation of legacy unstamped objects never PATCHes provenance
ok 198 - workstream A observation: reconciliation of legacy unstamped objects never PATCHes provenance
  ---
  duration_ms: 2.9234
  type: 'test'
  ...
# Subtest: workstream A create: lost upload response reconciles same pre-reserved ID
ok 199 - workstream A create: lost upload response reconciles same pre-reserved ID
  ---
  duration_ms: 8.0646
  type: 'test'
  ...
# Subtest: workstream A update: ambiguous candidate creation converges by recoverably retiring the exact predecessor
ok 200 - workstream A update: ambiguous candidate creation converges by recoverably retiring the exact predecessor
  ---
  duration_ms: 18.0277
  type: 'test'
  ...
# Subtest: workstream A move: ambiguous PATCH response is classified from re-observed path
ok 201 - workstream A move: ambiguous PATCH response is classified from re-observed path
  ---
  duration_ms: 3.7663
  type: 'test'
  ...
# Subtest: workstream A trash: ambiguous PATCH response is classified from re-observed trashed state
ok 202 - workstream A trash: ambiguous PATCH response is classified from re-observed trashed state
  ---
  duration_ms: 1.8473
  type: 'test'
  ...
# Subtest: workstream A coherent download: remote revision change during transfer cannot be consumed as coherent success
ok 203 - workstream A coherent download: remote revision change during transfer cannot be consumed as coherent success
  ---
  duration_ms: 2.806
  type: 'test'
  ...
# Subtest: managed-root validation detects identity and protocol mismatch
ok 204 - managed-root validation detects identity and protocol mismatch
  ---
  duration_ms: 1.4756
  type: 'test'
  ...
# Subtest: partial reconciliation listing never masquerades as complete
ok 205 - partial reconciliation listing never masquerades as complete
  ---
  duration_ms: 1.3072
  type: 'test'
  ...
# Subtest: move preserves Drive id and normal deletion uses trash PATCH
ok 206 - move preserves Drive id and normal deletion uses trash PATCH
  ---
  duration_ms: 3.46
  type: 'test'
  ...
# Subtest: download is lazy and range-chunked
ok 207 - download is lazy and range-chunked
  ---
  duration_ms: 1.9956
  type: 'test'
  ...
# Subtest: resumable create consumes content incrementally and verifies size
ok 208 - resumable create consumes content incrementally and verifies size
  ---
  duration_ms: 3.4359
  type: 'test'
  ...
# Subtest: OAuth request uses exact drive.file scope, high-entropy state, and PKCE S256
ok 209 - OAuth request uses exact drive.file scope, high-entropy state, and PKCE S256
  ---
  duration_ms: 11.3811
  type: 'test'
  ...
# Subtest: OAuth callback rejects mismatched state before token exchange
ok 210 - OAuth callback rejects mismatched state before token exchange
  ---
  duration_ms: 3.046
  type: 'test'
  ...
# Subtest: OAuth token exchange keeps client secret and tokens in SecretStorage
ok 211 - OAuth token exchange keeps client secret and tokens in SecretStorage
  ---
  duration_ms: 32.3558
  type: 'test'
  ...
# Subtest: expired transaction is rejected without exchanging a code
ok 212 - expired transaction is rejected without exchanging a code
  ---
  duration_ms: 1.305
  type: 'test'
  ...
# Subtest: transient refresh transport failure preserves refresh authority and is classified deferred
ok 213 - transient refresh transport failure preserves refresh authority and is classified deferred
  ---
  duration_ms: 0.8721
  type: 'test'
  ...
# Subtest: malformed, 429, and 5xx refresh responses preserve refresh authority
ok 214 - malformed, 429, and 5xx refresh responses preserve refresh authority
  ---
  duration_ms: 2.7944
  type: 'test'
  ...
# Subtest: invalid_grant definitively clears refresh authority
ok 215 - invalid_grant definitively clears refresh authority
  ---
  duration_ms: 0.7614
  type: 'test'
  ...
# Subtest: known rejected access token is invalidated without erasing a valid refresh token
ok 216 - known rejected access token is invalidated without erasing a valid refresh token
  ---
  duration_ms: 0.2506
  type: 'test'
  ...
# Subtest: Obsidian requestUrl bridge posts OAuth form data without browser CORS dependency
ok 217 - Obsidian requestUrl bridge posts OAuth form data without browser CORS dependency
  ---
  duration_ms: 31.7853
  type: 'test'
  ...
# Subtest: Obsidian requestUrl bridge returns Google 4xx bodies instead of collapsing them into exceptions
ok 218 - Obsidian requestUrl bridge returns Google 4xx bodies instead of collapsing them into exceptions
  ---
  duration_ms: 4.4124
  type: 'test'
  ...
# Subtest: transport honors Retry-After with bounded retry
ok 219 - transport honors Retry-After with bounded retry
  ---
  duration_ms: 41.103
  type: 'test'
  ...
# Subtest: quota exhaustion is structured and not retried destructively
ok 220 - quota exhaustion is structured and not retried destructively
  ---
  duration_ms: 2.1962
  type: 'test'
  ...
# Subtest: invalid change cursor is a conservative recovery signal
ok 221 - invalid change cursor is a conservative recovery signal
  ---
  duration_ms: 1.5683
  type: 'test'
  ...
# Subtest: non-idempotent POST is dispatched once when server applies create but response is lost
ok 222 - non-idempotent POST is dispatched once when server applies create but response is lost
  ---
  duration_ms: 0.5684
  type: 'test'
  ...
# Subtest: POST 429 and 5xx are not blindly replayed
ok 223 - POST 429 and 5xx are not blindly replayed
  ---
  duration_ms: 2.3662
  type: 'test'
  ...
# Subtest: retry-safe GET still retries transient failures
ok 224 - retry-safe GET still retries transient failures
  ---
  duration_ms: 1.2048
  type: 'test'
  ...
# Subtest: Drive 401 invalidates only access token, refreshes, and retries a safe GET
ok 225 - Drive 401 invalidates only access token, refreshes, and retries a safe GET
  ---
  duration_ms: 2.3111
  type: 'test'
  ...
# Subtest: Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50
ok 226 - Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50
  ---
  duration_ms: 19.4455
  type: 'test'
  ...
# Subtest: Phase5 scenario 38 auth revoked after planning surfaces authentication-required and stops run
ok 227 - Phase5 scenario 38 auth revoked after planning surfaces authentication-required and stops run
  ---
  duration_ms: 22.1996
  type: 'test'
  ...
# Subtest: Phase5 scenario 39 wrong account during execution preserves re-pair reason
ok 228 - Phase5 scenario 39 wrong account during execution preserves re-pair reason
  ---
  duration_ms: 4.9967
  type: 'test'
  ...
# Subtest: Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit
ok 229 - Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit
  ---
  duration_ms: 12.1099
  type: 'test'
  ...
# Subtest: Phase 5 unresolved reviewed synchronization remains partial and cannot open the completion gate
ok 230 - Phase 5 unresolved reviewed synchronization remains partial and cannot open the completion gate
  ---
  duration_ms: 7.6827
  type: 'test'
  ...
# Subtest: Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update
ok 231 - Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update
  ---
  duration_ms: 24.943
  type: 'test'
  ...
# Subtest: Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update
ok 232 - Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update
  ---
  duration_ms: 13.6702
  type: 'test'
  ...
# Subtest: Phase 5 keep-both creates a local-only conflict copy without assigning the source Drive ID, then next reconciliation plans upload-create
ok 233 - Phase 5 keep-both creates a local-only conflict copy without assigning the source Drive ID, then next reconciliation plans upload-create
  ---
  duration_ms: 15.8887
  type: 'test'
  ...
# Subtest: Phase 5 stale conflict resolution is rejected before mutation and requires fresh planning
ok 234 - Phase 5 stale conflict resolution is rejected before mutation and requires fresh planning
  ---
  duration_ms: 2.1145
  type: 'test'
  ...
# Subtest: GROUP A A1 recovery preserves reconstructed trusted state while authority-incomplete conflict mutation remains blocked
ok 235 - GROUP A A1 recovery preserves reconstructed trusted state while authority-incomplete conflict mutation remains blocked
  ---
  duration_ms: 51.4945
  type: 'test'
  ...
# Subtest: B1 external ordinary-vault -> portable-config move is recovery-required, not a domain reclassification
ok 236 - B1 external ordinary-vault -> portable-config move is recovery-required, not a domain reclassification
  ---
  duration_ms: 38.1187
  type: 'test'
  ...
# Subtest: B1 external portable-config -> ordinary-vault move is recovery-required, not a domain reclassification
ok 237 - B1 external portable-config -> ordinary-vault move is recovery-required, not a domain reclassification
  ---
  duration_ms: 5.7745
  type: 'test'
  ...
# Subtest: B2 incremental reconciliation rejects a known stable object moved outside the managed remote after restart
ok 238 - B2 incremental reconciliation rejects a known stable object moved outside the managed remote after restart
  ---
  duration_ms: 2.2604
  type: 'test'
  ...
# Subtest: B2 full reconciliation rejects a provenance-marked managed object moved outside the managed remote
ok 239 - B2 full reconciliation rejects a provenance-marked managed object moved outside the managed remote
  ---
  duration_ms: 4.2185
  type: 'test'
  ...
# Subtest: B2 same-session cache cannot convert structural move-out into removal
ok 240 - B2 same-session cache cannot convert structural move-out into removal
  ---
  duration_ms: 7.0053
  type: 'test'
  ...
# Subtest: B1/B2 provenance is scoped to the paired managed root identity
ok 241 - B1/B2 provenance is scoped to the paired managed root identity
  ---
  duration_ms: 2.3753
  type: 'test'
  ...
# Subtest: B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable
ok 242 - B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable
  ---
  duration_ms: 14.2004
  type: 'test'
  ...
# Subtest: B4 authentication revoked after lazy transfer begins surfaces authentication-required and stops without cursor/local commit
ok 243 - B4 authentication revoked after lazy transfer begins surfaces authentication-required and stops without cursor/local commit
  ---
  duration_ms: 77.0764
  type: 'test'
  ...
# Subtest: B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit
ok 244 - B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit
  ---
  duration_ms: 9.6134
  type: 'test'
  ...
# Subtest: B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy
ok 245 - B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy
  ---
  duration_ms: 8.828
  type: 'test'
  ...
# Subtest: Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass
ok 246 - Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass
  ---
  duration_ms: 1047.0607
  type: 'test'
  ...
# Subtest: Phase5 scenario 47 notification policy emits only material user-actionable conditions
ok 247 - Phase5 scenario 47 notification policy emits only material user-actionable conditions
  ---
  duration_ms: 0.8985
  type: 'test'
  ...
# Subtest: Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root
ok 248 - Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root
  ---
  duration_ms: 0.9438
  type: 'test'
  ...
# Subtest: G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval
ok 249 - G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval
  ---
  duration_ms: 90.608
  type: 'test'
  ...
# Subtest: G2 scenario 24 stale operation precondition refuses mutation, completes with attention, and awaits an external reconciliation trigger
ok 250 - G2 scenario 24 stale operation precondition refuses mutation, completes with attention, and awaits an external reconciliation trigger
  ---
  duration_ms: 28.8744
  type: 'test'
  ...
# Subtest: G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation
ok 251 - G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation
  ---
  duration_ms: 78.7712
  type: 'test'
  ...
# Subtest: G2 scenario 10 clean three-way text merge executes through controller and commits merged authority
ok 252 - G2 scenario 10 clean three-way text merge executes through controller and commits merged authority
  ---
  duration_ms: 53.7464
  type: 'test'
  ...
# Subtest: G2 scenario 11 true text conflict preserves local and remote alternates without mutation
ok 253 - G2 scenario 11 true text conflict preserves local and remote alternates without mutation
  ---
  duration_ms: 5.1301
  type: 'test'
  ...
# Subtest: G2 scenario 12 binary conflict preserves both opaque versions
ok 254 - G2 scenario 12 binary conflict preserves both opaque versions
  ---
  duration_ms: 3.6018
  type: 'test'
  ...
# Subtest: G2 scenario 14 stable Drive identity produces and executes identity-preserving remote move
ok 255 - G2 scenario 14 stable Drive identity produces and executes identity-preserving remote move
  ---
  duration_ms: 7.1078
  type: 'test'
  ...
# Subtest: G2 scenarios 15 and 18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction
ok 256 - G2 scenarios 15 and 18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction
  ---
  duration_ms: 56.4118
  type: 'test'
  ...
# Subtest: G2 scenario 16 delete-vs-modify remains a preservation conflict
ok 257 - G2 scenario 16 delete-vs-modify remains a preservation conflict
  ---
  duration_ms: 2.3474
  type: 'test'
  ...
# Subtest: G2 scenario 17 suspicious bulk destruction is circuit-broken before any mutation
ok 258 - G2 scenario 17 suspicious bulk destruction is circuit-broken before any mutation
  ---
  duration_ms: 4.99
  type: 'test'
  ...
# Subtest: G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility
ok 259 - G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility
  ---
  duration_ms: 45.9215
  type: 'test'
  ...
# Subtest: G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base
ok 260 - G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base
  ---
  duration_ms: 13.2241
  type: 'test'
  ...
# Subtest: G2 scenario 3 identical first sync establishes BASE without content mutation
ok 261 - G2 scenario 3 identical first sync establishes BASE without content mutation
  ---
  duration_ms: 6.6991
  type: 'test'
  ...
# Subtest: G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions
ok 262 - G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions
  ---
  duration_ms: 3.0046
  type: 'test'
  ...
# Subtest: G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion
ok 263 - G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion
  ---
  duration_ms: 40.7675
  type: 'test'
  ...
# Subtest: G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration
ok 264 - G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration
  ---
  duration_ms: 9.7348
  type: 'test'
  ...
# Subtest: G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration
ok 265 - G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration
  ---
  duration_ms: 10.4889
  type: 'test'
  ...
# Subtest: G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds
ok 266 - G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds
  ---
  duration_ms: 16.2777
  type: 'test'
  ...
# Subtest: G2 scenario 20 without ReliableRemoteChangePort falls back to safe full reconciliation and commits a fresh cursor
ok 267 - G2 scenario 20 without ReliableRemoteChangePort falls back to safe full reconciliation and commits a fresh cursor
  ---
  duration_ms: 40.4516
  type: 'test'
  ...
# Subtest: G2 scenarios 21 and 22 incomplete remote or local observation cannot become deletion authority in Phase5 planning
ok 268 - G2 scenarios 21 and 22 incomplete remote or local observation cannot become deletion authority in Phase5 planning
  ---
  duration_ms: 3.7586
  type: 'test'
  ...
# Subtest: G2 scenario 23 stale current device cannot authorize destructive propagation through production controller planning
ok 269 - G2 scenario 23 stale current device cannot authorize destructive propagation through production controller planning
  ---
  duration_ms: 2.2596
  type: 'test'
  ...
# Subtest: G2 scenario 40 missing expected managed root blocks Phase5 before planning or mutation
ok 270 - G2 scenario 40 missing expected managed root blocks Phase5 before planning or mutation
  ---
  duration_ms: 1.2713
  type: 'test'
  ...
# Subtest: G2 scenario 27 cancellation stops future operations and leaves cursor unadvanced
ok 271 - G2 scenario 27 cancellation stops future operations and leaves cursor unadvanced
  ---
  duration_ms: 22.9469
  type: 'test'
  ...
# Subtest: G2 scenario 28 pause blocks product-controller synchronization until resume
ok 272 - G2 scenario 28 pause blocks product-controller synchronization until resume
  ---
  duration_ms: 13.8
  type: 'test'
  ...
# Subtest: G2 scenario 29 same-runtime product synchronization runs serialize rather than overlap
ok 273 - G2 scenario 29 same-runtime product synchronization runs serialize rather than overlap
  ---
  duration_ms: 20.2325
  type: 'test'
  ...
# Subtest: G2 scenario 30 two real controller runs use separate production Web Locks leases over one shared lock boundary
ok 274 - G2 scenario 30 two real controller runs use separate production Web Locks leases over one shared lock boundary
  ---
  duration_ms: 15.0275
  type: 'test'
  ...
# Subtest: G2 scenario 6 Phase5 runtime pairing consumes validated managed-root identity and refuses invalid pairing
ok 275 - G2 scenario 6 Phase5 runtime pairing consumes validated managed-root identity and refuses invalid pairing
  ---
  duration_ms: 112.4547
  type: 'test'
  ...
# Subtest: G2 scenario 50 Phase5 deauthorization and disposal clear authority without local or Drive deletion
ok 276 - G2 scenario 50 Phase5 deauthorization and disposal clear authority without local or Drive deletion
  ---
  duration_ms: 2.5797
  type: 'test'
  ...
# Subtest: G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records
ok 277 - G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records
  ---
  duration_ms: 53.9511
  type: 'test'
  ...
# Subtest: G2 scenario 47 Phase5 runtime-owned notification subscription suppresses ordinary progress and delivers recovery
ok 278 - G2 scenario 47 Phase5 runtime-owned notification subscription suppresses ordinary progress and delivers recovery
  ---
  duration_ms: 9.1212
  type: 'test'
  ...
# Subtest: G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded
ok 279 - G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded
  ---
  duration_ms: 15.5801
  type: 'test'
  ...
# Subtest: Phase 5 audit history is bounded and stores only frozen metadata records
ok 280 - Phase 5 audit history is bounded and stores only frozen metadata records
  ---
  duration_ms: 3.1075
  type: 'test'
  ...
# Subtest: Phase 5 mobile Wi-Fi-only automatic policy fails closed when Wi-Fi cannot be proven
ok 281 - Phase 5 mobile Wi-Fi-only automatic policy fails closed when Wi-Fi cannot be proven
  ---
  duration_ms: 0.9028
  type: 'test'
  ...
# Subtest: Phase 5 desktop automatic policy does not invent a mobile network restriction
ok 282 - Phase 5 desktop automatic policy does not invent a mobile network restriction
  ---
  duration_ms: 0.3861
  type: 'test'
  ...
# Subtest: Phase 5 plugin data repository serializes settings exclusions recovery gate and audit without clobbering projections
ok 283 - Phase 5 plugin data repository serializes settings exclusions recovery gate and audit without clobbering projections
  ---
  duration_ms: 1.4025
  type: 'test'
  ...
# Subtest: Phase 5 Web Locks lease excludes a concurrent live writer and releases cleanly
ok 284 - Phase 5 Web Locks lease excludes a concurrent live writer and releases cleanly
  ---
  duration_ms: 1.0146
  type: 'test'
  ...
# Subtest: Phase 5 upload-create carries verified allocated Drive identity into authoritative trusted state
ok 285 - Phase 5 upload-create carries verified allocated Drive identity into authoritative trusted state
  ---
  duration_ms: 7.8149
  type: 'test'
  ...
# Subtest: Phase 5 clean-text-merge materializes exact canonical SHA-256 merge output and verifies both sides
ok 286 - Phase 5 clean-text-merge materializes exact canonical SHA-256 merge output and verifies both sides
  ---
  duration_ms: 4.6518
  type: 'test'
  ...
# Subtest: Phase 5 retained text with mismatched canonical hash is rejected as corrupt BASE material
ok 287 - Phase 5 retained text with mismatched canonical hash is rejected as corrupt BASE material
  ---
  duration_ms: 0.6538
  type: 'test'
  ...
# Subtest: Phase 5 first-sync identical no-op carries stable remote version and establishes trusted BASE
ok 288 - Phase 5 first-sync identical no-op carries stable remote version and establishes trusted BASE
  ---
  duration_ms: 5.9127
  type: 'test'
  ...
# Subtest: Phase 5 full reconciliation acquires candidate Changes cursor before remote listing
ok 289 - Phase 5 full reconciliation acquires candidate Changes cursor before remote listing
  ---
  duration_ms: 2.9288
  type: 'test'
  ...
# Subtest: Phase 5 unresolved conflict and recovery operations never enter ordinary mutation paths
ok 290 - Phase 5 unresolved conflict and recovery operations never enter ordinary mutation paths
  ---
  duration_ms: 0.5622
  type: 'test'
  ...
# Subtest: C2 recovery conflict mutation remains blocked until fresh reconstruction establishes durable authority
ok 291 - C2 recovery conflict mutation remains blocked until fresh reconstruction establishes durable authority
  ---
  duration_ms: 26.5475
  type: 'test'
  ...
# Subtest: C2 cursorless recovery-derived conflict subplan has no recovery-completion authority
ok 292 - C2 cursorless recovery-derived conflict subplan has no recovery-completion authority
  ---
  duration_ms: 4.7307
  type: 'test'
  ...
# Subtest: C5 partial full run cannot signal scope-reconcile completion
ok 293 - C5 partial full run cannot signal scope-reconcile completion
  ---
  duration_ms: 3.1967
  type: 'test'
  ...
# Subtest: C5 only complete full run with candidate cursor signals scope-reconcile completion
ok 294 - C5 only complete full run with candidate cursor signals scope-reconcile completion
  ---
  duration_ms: 2.0385
  type: 'test'
  ...
# Subtest: disabled local-change automatic synchronization ignores local events without deferring or scheduling a pass
ok 295 - disabled local-change automatic synchronization ignores local events without deferring or scheduling a pass
  ---
  duration_ms: 3.6962
  type: 'test'
  ...
# Subtest: Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass
ok 296 - Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass
  ---
  duration_ms: 0.8442
  type: 'test'
  ...
# Subtest: Phase5 scenario 33 refresh replaces periodic timer with live cadence
ok 297 - Phase5 scenario 33 refresh replaces periodic timer with live cadence
  ---
  duration_ms: 0.4358
  type: 'test'
  ...
# Subtest: Phase5 scenario 32 replays startup opportunity when vault-ready fired before scheduler registration
ok 298 - Phase5 scenario 32 replays startup opportunity when vault-ready fired before scheduler registration
  ---
  duration_ms: 0.4473
  type: 'test'
  ...
# Subtest: vault becoming ready after scheduler registration produces exactly one startup opportunity
ok 299 - vault becoming ready after scheduler registration produces exactly one startup opportunity
  ---
  duration_ms: 0.4549
  type: 'test'
  ...
# Subtest: startup automatic disabled produces no startup or resume synchronization opportunity
ok 300 - startup automatic disabled produces no startup or resume synchronization opportunity
  ---
  duration_ms: 0.5118
  type: 'test'
  ...
# Subtest: first sync incomplete keeps scheduler startup automatic ineligible
ok 301 - first sync incomplete keeps scheduler startup automatic ineligible
  ---
  duration_ms: 0.5612
  type: 'test'
  ...
# Subtest: active recovery keeps scheduler startup automatic ineligible
ok 302 - active recovery keeps scheduler startup automatic ineligible
  ---
  duration_ms: 0.4311
  type: 'test'
  ...
# Subtest: rapid ready/resume burst coalesces and preserves one future reconciliation while a run is active
ok 303 - rapid ready/resume burst coalesces and preserves one future reconciliation while a run is active
  ---
  duration_ms: 1.1477
  type: 'test'
  ...
# Subtest: Phase5 scenario 50 unload requests cancellation and scheduler teardown is non-mutating
ok 304 - Phase5 scenario 50 unload requests cancellation and scheduler teardown is non-mutating
  ---
  duration_ms: 0.7805
  type: 'test'
  ...
# Subtest: suspension during awaited lease acquisition releases the late lease without run authority
ok 305 - suspension during awaited lease acquisition releases the late lease without run authority
  ---
  duration_ms: 0.9327
  type: 'test'
  ...
# Subtest: concurrent begin requests serialize before lease acquisition and preserve one follow-up fact
ok 306 - concurrent begin requests serialize before lease acquisition and preserve one follow-up fact
  ---
  duration_ms: 0.6271
  type: 'test'
  ...
# Subtest: stopping state blocks subsequent operations and retains deferred reconciliation for resume
ok 307 - stopping state blocks subsequent operations and retains deferred reconciliation for resume
  ---
  duration_ms: 1.6369
  type: 'test'
  ...
# Subtest: cooperative cancellation signal is observable exactly once
ok 308 - cooperative cancellation signal is observable exactly once
  ---
  duration_ms: 0.5421
  type: 'test'
  ...
# Subtest: periodic active-app policy consumes cache-bypassing integrity evidence even without a watcher event
ok 309 - periodic active-app policy consumes cache-bypassing integrity evidence even without a watcher event
  ---
  duration_ms: 1.1693
  type: 'test'
  ...
# Subtest: C1 all path-local blocked-unsafe work remains attention-only rather than a global block
ok 310 - C1 all path-local blocked-unsafe work remains attention-only rather than a global block
  ---
  duration_ms: 4.5033
  type: 'test'
  ...
# Subtest: C1 recovery-required plan is blocked
ok 311 - C1 recovery-required plan is blocked
  ---
  duration_ms: 0.999
  type: 'test'
  ...
# Subtest: C1 mixed safe plus blocked path is reviewable
ok 312 - C1 mixed safe plus blocked path is reviewable
  ---
  duration_ms: 1.8781
  type: 'test'
  ...
# Subtest: C1 automatic run executes the independently safe subset of a mixed attention plan
ok 313 - C1 automatic run executes the independently safe subset of a mixed attention plan
  ---
  duration_ms: 28.5166
  type: 'test'
  ...
# Subtest: C3 retained text requires canonical SHA-256 and rejects corruption
ok 314 - C3 retained text requires canonical SHA-256 and rejects corruption
  ---
  duration_ms: 1.1817
  type: 'test'
  ...
# Subtest: C3 revision-only text is rejected and yields unresolved conflict
ok 315 - C3 revision-only text is rejected and yields unresolved conflict
  ---
  duration_ms: 0.7575
  type: 'test'
  ...
# Subtest: C4 reserved ordinary vault content cannot alias real configuration
ok 316 - C4 reserved ordinary vault content cannot alias real configuration
  ---
  duration_ms: 1.507
  type: 'test'
  ...
# Subtest: C5 scope reconcile requirement forces full assembly
ok 317 - C5 scope reconcile requirement forces full assembly
  ---
  duration_ms: 2.2159
  type: 'test'
  ...
# Subtest: C6 assembler consumes ID-only removed event after restart
ok 318 - C6 assembler consumes ID-only removed event after restart
  ---
  duration_ms: 3.4571
  type: 'test'
  ...
# Subtest: C7 executor preserves authentication-required classification
ok 319 - C7 executor preserves authentication-required classification
  ---
  duration_ms: 0.9133
  type: 'test'
  ...
# Subtest: create crash-recovery matrix preserves absence or verified new content at every boundary
ok 320 - create crash-recovery matrix preserves absence or verified new content at every boundary
  ---
  duration_ms: 7.3356
  type: 'test'
  ...
# Subtest: replace crash-recovery matrix never converts lost old target into create authority
ok 321 - replace crash-recovery matrix never converts lost old target into create authority
  ---
  duration_ms: 2.0647
  type: 'test'
  ...
# Subtest: authoritative cache-bypass discovers same-size same-mtime H0->H1 after missed watcher event
ok 322 - authoritative cache-bypass discovers same-size same-mtime H0->H1 after missed watcher event
  ---
  duration_ms: 1.2746
  type: 'test'
  ...
# Subtest: corrupt staged bytes are rejected before target displacement
ok 323 - corrupt staged bytes are rejected before target displacement
  ---
  duration_ms: 1.0491
  type: 'test'
  ...
# Subtest: create requires authoritative absence and commits verified bytes
ok 324 - create requires authoritative absence and commits verified bytes
  ---
  duration_ms: 1.244
  type: 'test'
  ...
# Subtest: replace rechecks canonical old bytes even when observation token is unchanged
ok 325 - replace rechecks canonical old bytes even when observation token is unchanged
  ---
  duration_ms: 1.7416
  type: 'test'
  ...
# Subtest: replace recovery treats absent target plus absent required backup as contradiction
ok 326 - replace recovery treats absent target plus absent required backup as contradiction
  ---
  duration_ms: 1.0054
  type: 'test'
  ...
# Subtest: replace recovery completes verified stage when old target survives in backup
ok 327 - replace recovery completes verified stage when old target survives in backup
  ---
  duration_ms: 0.7769
  type: 'test'
  ...
# Subtest: exact plugin structural hints coalesce while overlapping user edit remains observable
ok 328 - exact plugin structural hints coalesce while overlapping user edit remains observable
  ---
  duration_ms: 2.9296
  type: 'test'
  ...
# Subtest: B V1.3: authentication carrier remains physical outcome-unknown with authentication provenance
ok 329 - B V1.3: authentication carrier remains physical outcome-unknown with authentication provenance
  ---
  duration_ms: 1.2549
  type: 'test'
  ...
# Subtest: B V1.3: transient carrier remains physical outcome-unknown with transient provenance
ok 330 - B V1.3: transient carrier remains physical outcome-unknown with transient provenance
  ---
  duration_ms: 0.4458
  type: 'test'
  ...
# Subtest: B V1.3: rate-limit carrier remains physical outcome-unknown and preserves exact retry timing
ok 331 - B V1.3: rate-limit carrier remains physical outcome-unknown and preserves exact retry timing
  ---
  duration_ms: 0.6128
  type: 'test'
  ...
# Subtest: B V1.3: generic local errors and suggestive strings never fabricate operational provenance
ok 332 - B V1.3: generic local errors and suggestive strings never fabricate operational provenance
  ---
  duration_ms: 1.4138
  type: 'test'
  ...
# Subtest: B V1.3: canonical transaction wrapper preserves structured provenance returned by backend
ok 333 - B V1.3: canonical transaction wrapper preserves structured provenance returned by backend
  ---
  duration_ms: 0.3661
  type: 'test'
  ...
# Subtest: Phase 6 A: adapter-owned stage and backup artifacts are excluded from vault synchronization
ok 334 - Phase 6 A: adapter-owned stage and backup artifacts are excluded from vault synchronization
  ---
  duration_ms: 1.4666
  type: 'test'
  ...
# Subtest: Phase 6 A: staging-artifact exclusions do not broaden to ordinary similarly named user files
ok 335 - Phase 6 A: staging-artifact exclusions do not broaden to ordinary similarly named user files
  ---
  duration_ms: 0.4426
  type: 'test'
  ...
# Subtest: Phase 6 A: portable configuration remains explicit under a runtime-selected configuration directory
ok 336 - Phase 6 A: portable configuration remains explicit under a runtime-selected configuration directory
  ---
  duration_ms: 1.9901
  type: 'test'
  ...
# Subtest: Phase 6 A: cross-platform preflight blocks collision and compatibility hazards without blocking opaque extensions
ok 337 - Phase 6 A: cross-platform preflight blocks collision and compatibility hazards without blocking opaque extensions
  ---
  duration_ms: 1.1554
  type: 'test'
  ...
# Subtest: C1 reviewed first-sync Keep local crosses only the unresolved-path authority boundary and commits authority after verified mutation
ok 338 - C1 reviewed first-sync Keep local crosses only the unresolved-path authority boundary and commits authority after verified mutation
  ---
  duration_ms: 62.3179
  type: 'test'
  ...
# Subtest: C1 portable app.json Keep local leaves one planner-visible candidate and a clean subsequent plan
ok 339 - C1 portable app.json Keep local leaves one planner-visible candidate and a clean subsequent plan
  ---
  duration_ms: 8.7743
  type: 'test'
  ...
# Subtest: C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation
ok 340 - C1 stale LOCAL evidence rejects reviewed first-sync resolution before REMOTE mutation
  ---
  duration_ms: 3.0118
  type: 'test'
  ...
# Subtest: C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation
    # Subtest: revision
    ok 1 - revision
      ---
      duration_ms: 3.8223
      type: 'test'
      ...
    # Subtest: identity
    ok 2 - identity
      ---
      duration_ms: 2.3346
      type: 'test'
      ...
    1..2
ok 341 - C1 stale REMOTE revision or identity rejects reviewed first-sync resolution before mutation
  ---
  duration_ms: 6.7498
  type: 'test'
  ...
# Subtest: C1 ambiguous duplicate REMOTE identity fails closed before reviewed first-sync mutation
ok 342 - C1 ambiguous duplicate REMOTE identity fails closed before reviewed first-sync mutation
  ---
  duration_ms: 2.5541
  type: 'test'
  ...
# Subtest: C1 symmetric no-BASE Keep remote and Keep both resolutions use the bounded reviewed-conflict authority model
    # Subtest: keep-remote
    ok 1 - keep-remote
      ---
      duration_ms: 10.5169
      type: 'test'
      ...
    # Subtest: keep-both
    ok 2 - keep-both
      ---
      duration_ms: 11.3994
      type: 'test'
      ...
    1..2
ok 343 - C1 symmetric no-BASE Keep remote and Keep both resolutions use the bounded reviewed-conflict authority model
  ---
  duration_ms: 23.2674
  type: 'test'
  ...
# Subtest: C1 manual exact-current-local first-sync resolution succeeds without preexisting path BASE
ok 344 - C1 manual exact-current-local first-sync resolution succeeds without preexisting path BASE
  ---
  duration_ms: 6.8165
  type: 'test'
  ...
# Subtest: C1 ordinary non-conflict upload-update without trusted BASE remains rejected
ok 345 - C1 ordinary non-conflict upload-update without trusted BASE remains rejected
  ---
  duration_ms: 0.7334
  type: 'test'
  ...
# Subtest: C1 post-BASE conflict resolution retains the ordinary exact BASE plus mapping authority path
ok 346 - C1 post-BASE conflict resolution retains the ordinary exact BASE plus mapping authority path
  ---
  duration_ms: 0.6181
  type: 'test'
  ...
# Subtest: C1 durable effect-verified retry recovers the reviewed first-sync update without replaying REMOTE mutation
ok 347 - C1 durable effect-verified retry recovers the reviewed first-sync update without replaying REMOTE mutation
  ---
  duration_ms: 8.1687
  type: 'test'
  ...
# Subtest: C1 genuine first-sync multi-conflict provenance survives synthetic resolution subplans
ok 348 - C1 genuine first-sync multi-conflict provenance survives synthetic resolution subplans
  ---
  duration_ms: 12.0588
  type: 'test'
  ...
# Subtest: C1 fresh trusted-state Verify/Reconcile retains first-sync provenance until durable first-sync completion
ok 349 - C1 fresh trusted-state Verify/Reconcile retains first-sync provenance until durable first-sync completion
  ---
  duration_ms: 10.0012
  type: 'test'
  ...
# Subtest: C1 completed first-sync lifecycle dynamically removes no-BASE bootstrap provenance on a fresh plan
ok 350 - C1 completed first-sync lifecycle dynamically removes no-BASE bootstrap provenance on a fresh plan
  ---
  duration_ms: 2.3342
  type: 'test'
  ...
# Subtest: C1 recovery and reconstruction remain ineligible for reviewed first-sync bootstrap provenance
    # Subtest: recovery-active lifecycle
    ok 1 - recovery-active lifecycle
      ---
      duration_ms: 0.9616
      type: 'test'
      ...
    # Subtest: reconstruction assembly
    ok 2 - reconstruction assembly
      ---
      duration_ms: 0.544
      type: 'test'
      ...
    1..2
ok 351 - C1 recovery and reconstruction remain ineligible for reviewed first-sync bootstrap provenance
  ---
  duration_ms: 1.9119
  type: 'test'
  ...
# Subtest: C1 missing registered conflict-origin provenance fails closed
ok 352 - C1 missing registered conflict-origin provenance fails closed
  ---
  duration_ms: 1.4221
  type: 'test'
  ...
# Subtest: diagnostic logger level off retains the required severity/detail prefix
ok 353 - diagnostic logger level off retains the required severity/detail prefix
  ---
  duration_ms: 3.067
  type: 'test'
  ...
# Subtest: diagnostic logger level error retains the required severity/detail prefix
ok 354 - diagnostic logger level error retains the required severity/detail prefix
  ---
  duration_ms: 3.2109
  type: 'test'
  ...
# Subtest: diagnostic logger level warn retains the required severity/detail prefix
ok 355 - diagnostic logger level warn retains the required severity/detail prefix
  ---
  duration_ms: 0.597
  type: 'test'
  ...
# Subtest: diagnostic logger level info retains the required severity/detail prefix
ok 356 - diagnostic logger level info retains the required severity/detail prefix
  ---
  duration_ms: 0.3954
  type: 'test'
  ...
# Subtest: diagnostic logger level debug retains the required severity/detail prefix
ok 357 - diagnostic logger level debug retains the required severity/detail prefix
  ---
  duration_ms: 0.5119
  type: 'test'
  ...
# Subtest: diagnostic logger level trace retains the required severity/detail prefix
ok 358 - diagnostic logger level trace retains the required severity/detail prefix
  ---
  duration_ms: 0.3523
  type: 'test'
  ...
# Subtest: diagnostic logger sequence is monotonic and bounded retention drops oldest while keeping newest
ok 359 - diagnostic logger sequence is monotonic and bounded retention drops oldest while keeping newest
  ---
  duration_ms: 3.6063
  type: 'test'
  ...
# Subtest: diagnostic clear removes records without resetting sequence or attempt identity
ok 360 - diagnostic clear removes records without resetting sequence or attempt identity
  ---
  duration_ms: 0.8382
  type: 'test'
  ...
# Subtest: diagnostic export is deterministic JSON-lines in authoritative sequence order
ok 361 - diagnostic export is deterministic JSON-lines in authoritative sequence order
  ---
  duration_ms: 1.7701
  type: 'test'
  ...
# Subtest: console mirroring follows current level and mirrors only the same sanitized rendered record
ok 362 - console mirroring follows current level and mirrors only the same sanitized rendered record
  ---
  duration_ms: 1.5714
  type: 'test'
  ...
# Subtest: diagnostic field allowlist and sanitization prevent representative OAuth secrets from reaching export
ok 363 - diagnostic field allowlist and sanitization prevent representative OAuth secrets from reaching export
  ---
  duration_ms: 0.6868
  type: 'test'
  ...
# Subtest: Info < Debug < Trace by internal decision visibility and execution granularity, not duplicate labels
ok 364 - Info < Debug < Trace by internal decision visibility and execution granularity, not duplicate labels
  ---
  duration_ms: 28.8998
  type: 'test'
  ...
# Subtest: rich Error records preserve safe diagnosis fields at Error-only detail
ok 365 - rich Error records preserve safe diagnosis fields at Error-only detail
  ---
  duration_ms: 0.8687
  type: 'test'
  ...
# Subtest: structured observability vocabulary records every required bounded causal field
ok 366 - structured observability vocabulary records every required bounded causal field
  ---
  duration_ms: 2.9014
  type: 'test'
  ...
# Subtest: new component taxonomy separates transport, semantic Drive, effect, state/CAS, recovery, and bundle surfaces
ok 367 - new component taxonomy separates transport, semantic Drive, effect, state/CAS, recovery, and bundle surfaces
  ---
  duration_ms: 1.0899
  type: 'test'
  ...
# Subtest: diagnostic path key is normalized, deterministic, portable, and opaque
ok 368 - diagnostic path key is normalized, deterministic, portable, and opaque
  ---
  duration_ms: 0.9624
  type: 'test'
  ...
# Subtest: occupant remote object representation is deterministic, unique, sorted, and bounded
ok 369 - occupant remote object representation is deterministic, unique, sorted, and bounded
  ---
  duration_ms: 0.3711
  type: 'test'
  ...
# Subtest: current synchronization run correlation is discoverable and ending one exact run cannot clear another
ok 370 - current synchronization run correlation is discoverable and ending one exact run cannot clear another
  ---
  duration_ms: 0.6928
  type: 'test'
  ...
# Subtest: prior valid persisted events remain loadable without current-run leakage
ok 371 - prior valid persisted events remain loadable without current-run leakage
  ---
  duration_ms: 2.421
  type: 'test'
  ...
# Subtest: structured privacy boundary drops raw path/body/content fields and redacts authorization and query material
ok 372 - structured privacy boundary drops raw path/body/content fields and redacts authorization and query material
  ---
  duration_ms: 1.2754
  type: 'test'
  ...
# Subtest: diagnostic persistence failure remains non-authoritative and does not throw through flush
ok 373 - diagnostic persistence failure remains non-authoritative and does not throw through flush
  ---
  duration_ms: 1.4298
  type: 'test'
  ...
# Subtest: operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs
ok 374 - operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs
  ---
  duration_ms: 64.7808
  type: 'test'
  ...
# Subtest: a later stable no-op reconciliation resolves transient stale attention without a content mutation
ok 375 - a later stable no-op reconciliation resolves transient stale attention without a content mutation
  ---
  duration_ms: 10.0932
  type: 'test'
  ...
# Subtest: post-journal stale intent is safely retired before unrelated work continues
ok 376 - post-journal stale intent is safely retired before unrelated work continues
  ---
  duration_ms: 18.0531
  type: 'test'
  ...
# Subtest: one validation pass reuses one coherent local and remote observation per path
ok 377 - one validation pass reuses one coherent local and remote observation per path
  ---
  duration_ms: 0.9339
  type: 'test'
  ...
# Subtest: path and subtree enumeration uncertainty do not contaminate unrelated absent paths
ok 378 - path and subtree enumeration uncertainty do not contaminate unrelated absent paths
  ---
  duration_ms: 2.2782
  type: 'test'
  ...
# Subtest: mobile adapter boundary completely enumerates visible, nested, empty, and non-excluded hidden content
ok 379 - mobile adapter boundary completely enumerates visible, nested, empty, and non-excluded hidden content
  ---
  duration_ms: 11.8557
  type: 'test'
  ...
# Subtest: mobile boundary blocks traversal, absolute, drive-qualified, and URI paths before adapter I/O
ok 380 - mobile boundary blocks traversal, absolute, drive-qualified, and URI paths before adapter I/O
  ---
  duration_ms: 5.2453
  type: 'test'
  ...
# Subtest: malformed, colliding, and cyclic adapter children are rejected without access while safe siblings remain inspectable
ok 381 - malformed, colliding, and cyclic adapter children are rejected without access while safe siblings remain inspectable
  ---
  duration_ms: 3.7405
  type: 'test'
  ...
# Subtest: mobile adapter mutations validate temporary paths and handle hidden files absent from the Vault tree
ok 382 - mobile adapter mutations validate temporary paths and handle hidden files absent from the Vault tree
  ---
  duration_ms: 78.9003
  type: 'test'
  ...
# Subtest: mobile preserves FileManager semantics for visible moves while retaining adapter fallback for hidden content
ok 383 - mobile preserves FileManager semantics for visible moves while retaining adapter fallback for hidden content
  ---
  duration_ms: 15.5047
  type: 'test'
  ...
# Subtest: desktop retains physical external-reference rejection independently of the mobile adapter boundary
ok 384 - desktop retains physical external-reference rejection independently of the mobile adapter boundary
  ---
  duration_ms: 1.0996
  type: 'test'
  ...
# Subtest: production mobile composition explicitly selects the adapter boundary without Node or Electron
ok 385 - production mobile composition explicitly selects the adapter boundary without Node or Electron
  ---
  duration_ms: 1.4056
  type: 'test'
  ...
# Subtest: healthy mobile first sync produces complete LOCAL evidence and a non-destructive previewable safe-union plan
ok 386 - healthy mobile first sync produces complete LOCAL evidence and a non-destructive previewable safe-union plan
  ---
  duration_ms: 10.965
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream yields a non-empty file incrementally in bounded chunks
ok 387 - iOS HTTP 200 resource stream yields a non-empty file incrementally in bounded chunks
  ---
  duration_ms: 50.1581
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream rejects premature EOF and excess bytes
ok 388 - iOS HTTP 200 resource stream rejects premature EOF and excess bytes
  ---
  duration_ms: 7.8171
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream validates Content-Length when present
ok 389 - iOS HTTP 200 resource stream validates Content-Length when present
  ---
  duration_ms: 3.0202
  type: 'test'
  ...
# Subtest: iOS HTTP 200 resource stream fails stale when the file changes during reading
ok 390 - iOS HTTP 200 resource stream fails stale when the file changes during reading
  ---
  duration_ms: 27.4251
  type: 'test'
  ...
# Subtest: zero-byte mobile files preserve no-fetch canonical read behavior
ok 391 - zero-byte mobile files preserve no-fetch canonical read behavior
  ---
  duration_ms: 15.3288
  type: 'test'
  ...
# Subtest: production mobile canonical chain keeps ordinary and portable non-empty content complete under HTTP 200
ok 392 - production mobile canonical chain keeps ordinary and portable non-empty content complete under HTTP 200
  ---
  duration_ms: 116.2937
  type: 'test'
  ...
# Subtest: iOS OAuth launch: final authorization URL is handed directly to Obsidian's external-browser target
ok 393 - iOS OAuth launch: final authorization URL is handed directly to Obsidian's external-browser target
  ---
  duration_ms: 2.5209
  type: 'test'
  ...
# Subtest: iOS OAuth launch: unavailable external-browser capability fails clearly
ok 394 - iOS OAuth launch: unavailable external-browser capability fails clearly
  ---
  duration_ms: 0.7497
  type: 'test'
  ...
# Subtest: iOS OAuth launch: exactly one prepared transaction launches its final URL exactly once
ok 395 - iOS OAuth launch: exactly one prepared transaction launches its final URL exactly once
  ---
  duration_ms: 0.3738
  type: 'test'
  ...
# Subtest: iOS OAuth launch: preparation and synchronous or asynchronous launcher failures propagate
ok 396 - iOS OAuth launch: preparation and synchronous or asynchronous launcher failures propagate
  ---
  duration_ms: 0.6006
  type: 'test'
  ...
# Subtest: iOS OAuth launch: mobile selects _external while desktop retains its validated direct launcher
ok 397 - iOS OAuth launch: mobile selects _external while desktop retains its validated direct launcher
  ---
  duration_ms: 10.1551
  type: 'test'
  ...
# Subtest: iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle
ok 398 - iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle
  ---
  duration_ms: 64.4977
  type: 'test'
  ...
# Subtest: sync diagnostics preserve plan/execution semantics and never export vault path or content
ok 399 - sync diagnostics preserve plan/execution semantics and never export vault path or content
  ---
  duration_ms: 28.5536
  type: 'test'
  ...
# Subtest: manual sync planning failure is terminal, correlated, and metadata-only
ok 400 - manual sync planning failure is terminal, correlated, and metadata-only
  ---
  duration_ms: 1.2558
  type: 'test'
  ...
# Subtest: preview-presentation exception is sanitized at the preview stage and closes the same run
ok 401 - preview-presentation exception is sanitized at the preview stage and closes the same run
  ---
  duration_ms: 3.3954
  type: 'test'
  ...
# Subtest: stale Execute rejection is Error-level under the original run and later dismissal cancels it
ok 402 - stale Execute rejection is Error-level under the original run and later dismissal cancels it
  ---
  duration_ms: 6.4322
  type: 'test'
  ...
# Subtest: identical semantic plans retain independent explicit diagnostic run ownership
ok 403 - identical semantic plans retain independent explicit diagnostic run ownership
  ---
  duration_ms: 9.6475
  type: 'test'
  ...
# Subtest: precondition throw is Error-level at its exact execution substage and closes the run
ok 404 - precondition throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 12.8678
  type: 'test'
  ...
# Subtest: pending throw is Error-level at its exact execution substage and closes the run
ok 405 - pending throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 14.1881
  type: 'test'
  ...
# Subtest: mutation throw is Error-level at its exact execution substage and closes the run
ok 406 - mutation throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 9.5439
  type: 'test'
  ...
# Subtest: uncertain-journal throw is Error-level at its exact execution substage and closes the run
ok 407 - uncertain-journal throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 15.8796
  type: 'test'
  ...
# Subtest: commit throw is Error-level at its exact execution substage and closes the run
ok 408 - commit throw is Error-level at its exact execution substage and closes the run
  ---
  duration_ms: 8.8053
  type: 'test'
  ...
# Subtest: returned content-mutation failure emits Error evidence rather than Trace-only evidence
ok 409 - returned content-mutation failure emits Error evidence rather than Trace-only evidence
  ---
  duration_ms: 8.6997
  type: 'test'
  ...
# Subtest: run-lease acquisition throw emits a stage-specific terminal Error and closes the run
ok 410 - run-lease acquisition throw emits a stage-specific terminal Error and closes the run
  ---
  duration_ms: 4.5874
  type: 'test'
  ...
# Subtest: mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability
ok 411 - mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability
  ---
  duration_ms: 44.2081
  type: 'test'
  ...
# Subtest: automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers
ok 412 - automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers
  ---
  duration_ms: 49.3535
  type: 'test'
  ...
# Subtest: conflict and all-blocked plans isolate affected paths without mutating them
ok 413 - conflict and all-blocked plans isolate affected paths without mutating them
  ---
  duration_ms: 8.9757
  type: 'test'
  ...
# Subtest: global recovery and destructive approval gates cannot execute a safe subset automatically
ok 414 - global recovery and destructive approval gates cannot execute a safe subset automatically
  ---
  duration_ms: 5.1392
  type: 'test'
  ...
# Subtest: stale-device destructive work is isolated while independent safe work commits without cursor advancement
ok 415 - stale-device destructive work is isolated while independent safe work commits without cursor advancement
  ---
  duration_ms: 10.1563
  type: 'test'
  ...
# Subtest: ordinary authorized deletion still executes automatically
ok 416 - ordinary authorized deletion still executes automatically
  ---
  duration_ms: 9.82
  type: 'test'
  ...
# Subtest: partial first-sync safe union commits progress but cannot complete baseline or cursor authority
ok 417 - partial first-sync safe union commits progress but cannot complete baseline or cursor authority
  ---
  duration_ms: 5.5502
  type: 'test'
  ...
# Subtest: transient unstable path clears from current attention after a later stable retry
ok 418 - transient unstable path clears from current attention after a later stable retry
  ---
  duration_ms: 11.5041
  type: 'test'
  ...
# Subtest: dependency isolation skips a child of a blocked parent while unrelated work proceeds
ok 419 - dependency isolation skips a child of a blocked parent while unrelated work proceeds
  ---
  duration_ms: 3.9174
  type: 'test'
  ...
# Subtest: attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely
ok 420 - attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely
  ---
  duration_ms: 4.3471
  type: 'test'
  ...
# Subtest: a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it
ok 421 - a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it
  ---
  duration_ms: 13.876
  type: 'test'
  ...
# Subtest: ledger persistence failure is surfaced but does not roll back authorized safe work
ok 422 - ledger persistence failure is surfaced but does not roll back authorized safe work
  ---
  duration_ms: 8.5349
  type: 'test'
  ...
# Subtest: one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution
ok 423 - one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution
  ---
  duration_ms: 7.8719
  type: 'test'
  ...
# Subtest: serialized plugin repository writes keep per-call immutable payload snapshots
ok 424 - serialized plugin repository writes keep per-call immutable payload snapshots
  ---
  duration_ms: 0.9589
  type: 'test'
  ...
# Subtest: automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets
ok 425 - automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets
  ---
  duration_ms: 11.7729
  type: 'test'
  ...
# Subtest: controller surface emits no premature completion and exactly one terminal mixed-run notice
ok 426 - controller surface emits no premature completion and exactly one terminal mixed-run notice
  ---
  duration_ms: 3.7813
  type: 'test'
  ...
# Subtest: notification identity suppresses the same attention but reports changed paths and reasons with identical counts
ok 427 - notification identity suppresses the same attention but reports changed paths and reasons with identical counts
  ---
  duration_ms: 5.8886
  type: 'test'
  ...
# Subtest: startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID
ok 428 - startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID
  ---
  duration_ms: 3.3143
  type: 'test'
  ...
# Subtest: direct external-browser probe is synchronous, fixed-destination, _external, and OAuth-independent
ok 429 - direct external-browser probe is synchronous, fixed-destination, _external, and OAuth-independent
  ---
  duration_ms: 6.6266
  type: 'test'
  ...
# Subtest: delayed external-browser probe crosses a controlled microtask before the same fixed _external launch
ok 430 - delayed external-browser probe crosses a controlled microtask before the same fixed _external launch
  ---
  duration_ms: 0.9243
  type: 'test'
  ...
# Subtest: OAuth settings button establishes attempt ID before authenticate and the real path exposes required diagnostic boundaries
ok 431 - OAuth settings button establishes attempt ID before authenticate and the real path exposes required diagnostic boundaries
  ---
  duration_ms: 11.767
  type: 'test'
  ...
# Subtest: callback diagnostics record only presence/classification semantics and never callback values
ok 432 - callback diagnostics record only presence/classification semantics and never callback values
  ---
  duration_ms: 1.2877
  type: 'test'
  ...
# Subtest: T1 repeated runtime initialization never registers the plugin-global OAuth protocol action
ok 433 - T1 repeated runtime initialization never registers the plugin-global OAuth protocol action
  ---
  duration_ms: 103.3461
  type: 'test'
  ...
# Subtest: T2/T4/T5 one stable registration delegates a callback only to the current completion target
ok 434 - T2/T4/T5 one stable registration delegates a callback only to the current completion target
  ---
  duration_ms: 2.4134
  type: 'test'
  ...
# Subtest: T4/T5 runtime completion seam dereferences the current OAuth session at callback execution time
ok 435 - T4/T5 runtime completion seam dereferences the current OAuth session at callback execution time
  ---
  duration_ms: 6.2612
  type: 'test'
  ...
# Subtest: T3 Authenticate-after-initialization path cannot register the OAuth action again
ok 436 - T3 Authenticate-after-initialization path cannot register the OAuth action again
  ---
  duration_ms: 4.3075
  type: 'test'
  ...
# Subtest: T2/T6 registration is once per plugin lifetime and relies on lifecycle cleanup rather than manual registry mutation
ok 437 - T2/T6 registration is once per plugin lifetime and relies on lifecycle cleanup rather than manual registry mutation
  ---
  duration_ms: 3.612
  type: 'test'
  ...
# Subtest: T7 lifecycle repair adds no secret-bearing diagnostics and preserves safe completion notices
ok 438 - T7 lifecycle repair adds no secret-bearing diagnostics and preserves safe completion notices
  ---
  duration_ms: 3.1319
  type: 'test'
  ...
# Subtest: Alpha OAuth live: a falsy browser return still counts as an initiated launch
ok 439 - Alpha OAuth live: a falsy browser return still counts as an initiated launch
  ---
  duration_ms: 2.2401
  type: 'test'
  ...
# Subtest: Alpha OAuth live: an actual browser launch exception is surfaced
ok 440 - Alpha OAuth live: an actual browser launch exception is surfaced
  ---
  duration_ms: 0.5399
  type: 'test'
  ...
# Subtest: Alpha OAuth live: token endpoint failure exposes only structured sanitized diagnostics
ok 441 - Alpha OAuth live: token endpoint failure exposes only structured sanitized diagnostics
  ---
  duration_ms: 45.5308
  type: 'test'
  ...
# Subtest: Alpha OAuth live: malformed token response keeps safe status without raw response data
ok 442 - Alpha OAuth live: malformed token response keeps safe status without raw response data
  ---
  duration_ms: 2.4062
  type: 'test'
  ...
# Subtest: Alpha OAuth live: transport failure produces a generic secret-free classification
ok 443 - Alpha OAuth live: transport failure produces a generic secret-free classification
  ---
  duration_ms: 1.8942
  type: 'test'
  ...
# Subtest: Alpha OAuth live: successful exact drive.file exchange remains unchanged
ok 444 - Alpha OAuth live: successful exact drive.file exchange remains unchanged
  ---
  duration_ms: 1.7261
  type: 'test'
  ...
# Subtest: Alpha OAuth live: failure diagnostic remains visible and copyable without console logging
ok 445 - Alpha OAuth live: failure diagnostic remains visible and copyable without console logging
  ---
  duration_ms: 2.5961
  type: 'test'
  ...
# Subtest: Alpha OAuth live: Web client secret is wired through Obsidian SecretStorage and never plugin data
ok 446 - Alpha OAuth live: Web client secret is wired through Obsidian SecretStorage and never plugin data
  ---
  duration_ms: 2.8487
  type: 'test'
  ...
# Subtest: case-only and Unicode-equivalent relocations are rejected before journal or filesystem mutation on a normalizing adapter
ok 447 - case-only and Unicode-equivalent relocations are rejected before journal or filesystem mutation on a normalizing adapter
  ---
  duration_ms: 12.8322
  type: 'test'
  ...
# Subtest: persisted case-only and Unicode-equivalent relocation journals are defensively rejected
ok 448 - persisted case-only and Unicode-equivalent relocation journals are defensively rejected
  ---
  duration_ms: 1.053
  type: 'test'
  ...
# Subtest: complete canonical, stage, and backup paths must all satisfy cross-platform path policy
ok 449 - complete canonical, stage, and backup paths must all satisfy cross-platform path policy
  ---
  duration_ms: 0.8487
  type: 'test'
  ...
# Subtest: invalid complete relocation paths are rejected before durable journal or filesystem mutation
ok 450 - invalid complete relocation paths are rejected before durable journal or filesystem mutation
  ---
  duration_ms: 0.4626
  type: 'test'
  ...
# Subtest: relocation merges pre-existing valid destination history without fake occurrence increments
ok 451 - relocation merges pre-existing valid destination history without fake occurrence increments
  ---
  duration_ms: 4.885
  type: 'test'
  ...
# Subtest: relocation merge bounds resolved history while preserving every current record
ok 452 - relocation merge bounds resolved history while preserving every current record
  ---
  duration_ms: 53.5312
  type: 'test'
  ...
# Subtest: restarting relocation after a durable merged destination is idempotent
ok 453 - restarting relocation after a durable merged destination is idempotent
  ---
  duration_ms: 1.7619
  type: 'test'
  ...
# Subtest: invalid destination CSV is never overwritten and source remains authoritative
ok 454 - invalid destination CSV is never overwritten and source remains authoritative
  ---
  duration_ms: 0.7008
  type: 'test'
  ...
# Subtest: later resolution defeats an older stale current copy for the same record key
ok 455 - later resolution defeats an older stale current copy for the same record key
  ---
  duration_ms: 1.4314
  type: 'test'
  ...
# Subtest: later resolution wins regardless of whether the stale current copy is source or destination
ok 456 - later resolution wins regardless of whether the stale current copy is source or destination
  ---
  duration_ms: 2.1991
  type: 'test'
  ...
# Subtest: a genuinely later recurrence reopens a previously resolved record
ok 457 - a genuinely later recurrence reopens a previously resolved record
  ---
  duration_ms: 1.0911
  type: 'test'
  ...
# Subtest: restart relocation does not resurrect a source record resolved after a stale destination current copy
ok 458 - restart relocation does not resurrect a source record resolved after a stale destination current copy
  ---
  duration_ms: 2.3131
  type: 'test'
  ...
# Subtest: corrected resolved relocation state is idempotent across repeated recovery merges
ok 459 - corrected resolved relocation state is idempotent across repeated recovery merges
  ---
  duration_ms: 2.9202
  type: 'test'
  ...
# Subtest: transient canonical stale observation retries to stable evidence without persistent attention
ok 460 - transient canonical stale observation retries to stable evidence without persistent attention
  ---
  duration_ms: 3.6803
  type: 'test'
  ...
# Subtest: persistent canonical instability is path-local local-file-not-stable and does not change listing completeness
ok 461 - persistent canonical instability is path-local local-file-not-stable and does not change listing completeness
  ---
  duration_ms: 3.2454
  type: 'test'
  ...
# Subtest: one path content-evidence failure does not contaminate unrelated portable paths, while real listing incompleteness still does
ok 462 - one path content-evidence failure does not contaminate unrelated portable paths, while real listing incompleteness still does
  ---
  duration_ms: 3.0055
  type: 'test'
  ...
# Subtest: ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row
ok 463 - ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row
  ---
  duration_ms: 39.9859
  type: 'test'
  ...
# Subtest: exhausted edit instability is isolated into the CSV while an independent safe upload commits
ok 464 - exhausted edit instability is isolated into the CSV while an independent safe upload commits
  ---
  duration_ms: 25.6261
  type: 'test'
  ...
# Subtest: sync-plan-errors.csv is automatically created, durable, recreated, relocatable, and fail-safe excluded
ok 465 - sync-plan-errors.csv is automatically created, durable, recreated, relocatable, and fail-safe excluded
  ---
  duration_ms: 16.1696
  type: 'test'
  ...
# Subtest: configured sync plan errors directory rejects unsafe values and legacy records migrate into the persistent CSV
ok 466 - configured sync plan errors directory rejects unsafe values and legacy records migrate into the persistent CSV
  ---
  duration_ms: 1.3345
  type: 'test'
  ...
# Subtest: one failed persistent CSV replacement reaches its caller but does not poison later ledger writes
ok 467 - one failed persistent CSV replacement reaches its caller but does not poison later ledger writes
  ---
  duration_ms: 1.9662
  type: 'test'
  ...
# Subtest: restart recovery restores committed backup before discarding an uncommitted stage
ok 468 - restart recovery restores committed backup before discarding an uncommitted stage
  ---
  duration_ms: 1.54
  type: 'test'
  ...
# Subtest: restart recovery keeps a valid canonical CSV and removes stale replacement residue
ok 469 - restart recovery keeps a valid canonical CSV and removes stale replacement residue
  ---
  duration_ms: 1.1698
  type: 'test'
  ...
# Subtest: restart recovery promotes a valid stage when no canonical or committed backup exists
ok 470 - restart recovery promotes a valid stage when no canonical or committed backup exists
  ---
  duration_ms: 0.6208
  type: 'test'
  ...
# Subtest: unrecoverable replacement residue fails initialization without fabricating blank history
ok 471 - unrecoverable replacement residue fails initialization without fabricating blank history
  ---
  duration_ms: 1.4144
  type: 'test'
  ...
# Subtest: pending relocation restart converges without record or exclusion loss after journal persistence before destination creation
ok 472 - pending relocation restart converges without record or exclusion loss after journal persistence before destination creation
  ---
  duration_ms: 34.4648
  type: 'test'
  ...
# Subtest: pending relocation restart converges without record or exclusion loss after destination creation before active-location commit
ok 473 - pending relocation restart converges without record or exclusion loss after destination creation before active-location commit
  ---
  duration_ms: 14.0308
  type: 'test'
  ...
# Subtest: pending relocation restart converges without record or exclusion loss after active-location commit before source cleanup
ok 474 - pending relocation restart converges without record or exclusion loss after active-location commit before source cleanup
  ---
  duration_ms: 1.0338
  type: 'test'
  ...
# Subtest: live relocation durably journals both exclusions before copying and clears them only after finalization
ok 475 - live relocation durably journals both exclusions before copying and clears them only after finalization
  ---
  duration_ms: 1.8235
  type: 'test'
  ...
# Subtest: persisted relocation journal is defensively rejected when either exact CSV path is unsafe
ok 476 - persisted relocation journal is defensively rejected when either exact CSV path is unsafe
  ---
  duration_ms: 0.5441
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure
ok 477 - Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure
  ---
  duration_ms: 1.7834
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates
ok 478 - Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates
  ---
  duration_ms: 0.4454
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: permission uncertainty is not converted into absence
ok 479 - Phase 6 Alpha portable collision: permission uncertainty is not converted into absence
  ---
  duration_ms: 1.1329
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: canonical-resolution failure on an existing component remains fail-closed
ok 480 - Phase 6 Alpha portable collision: canonical-resolution failure on an existing component remains fail-closed
  ---
  duration_ms: 0.7517
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: lexical and external-reference containment remain fail-closed
ok 481 - Phase 6 Alpha portable collision: lexical and external-reference containment remain fail-closed
  ---
  duration_ms: 0.6601
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: production desktop composition observes a safely missing reserved root as absent
ok 482 - Phase 6 Alpha portable collision: production desktop composition observes a safely missing reserved root as absent
  ---
  duration_ms: 17.527
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: unknown, inaccessible, unreadable, and real occupancy all remain fail-closed collisions
ok 483 - Phase 6 Alpha portable collision: unknown, inaccessible, unreadable, and real occupancy all remain fail-closed collisions
  ---
  duration_ms: 1.6808
  type: 'test'
  ...
# Subtest: Phase 6 Alpha portable collision: absent physical reserved root permits portable first-sync safe-union uploads
ok 484 - Phase 6 Alpha portable collision: absent physical reserved root permits portable first-sync safe-union uploads
  ---
  duration_ms: 9.6668
  type: 'test'
  ...
# Subtest: diagnostic clipboard export invokes writeText synchronously with the exact rendered text
ok 485 - diagnostic clipboard export invokes writeText synchronously with the exact rendered text
  ---
  duration_ms: 1.2609
  type: 'test'
  ...
# Subtest: diagnostic clipboard export reports unavailable without performing any vault write
ok 486 - diagnostic clipboard export reports unavailable without performing any vault write
  ---
  duration_ms: 0.985
  type: 'test'
  ...
# Subtest: diagnostic .txt share invokes navigator.share synchronously with only one real text file
ok 487 - diagnostic .txt share invokes navigator.share synchronously with only one real text file
  ---
  duration_ms: 1.6758
  type: 'test'
  ...
# Subtest: diagnostic .txt share capability honors canShare and does not call share when file sharing is rejected
ok 488 - diagnostic .txt share capability honors canShare and does not call share when file sharing is rejected
  ---
  duration_ms: 0.5204
  type: 'test'
  ...
# Subtest: diagnostic .txt share reports unavailable when navigator.share is absent
ok 489 - diagnostic .txt share reports unavailable when navigator.share is absent
  ---
  duration_ms: 0.2836
  type: 'test'
  ...
# Subtest: crash before content mutation leaves only durable pending evidence and never advances BASE
ok 490 - crash before content mutation leaves only durable pending evidence and never advances BASE
  ---
  duration_ms: 6.5804
  type: 'test'
  ...
# Subtest: ambiguous transfer outcome is durably classified uncertain without advancing BASE
ok 491 - ambiguous transfer outcome is durably classified uncertain without advancing BASE
  ---
  duration_ms: 2.4296
  type: 'test'
  ...
# Subtest: authoritative success commit rejects non-durable or non-verified receipts
ok 492 - authoritative success commit rejects non-durable or non-verified receipts
  ---
  duration_ms: 1.2831
  type: 'test'
  ...
# Subtest: crash/failure while persisting verified success cannot create false-success state
ok 493 - crash/failure while persisting verified success cannot create false-success state
  ---
  duration_ms: 2.3373
  type: 'test'
  ...
# Subtest: migration preserves a recoverable exact pre-migration checkpoint
ok 494 - migration preserves a recoverable exact pre-migration checkpoint
  ---
  duration_ms: 1.1012
  type: 'test'
  ...
# Subtest: corrupt, truncated, incompatible, and missing expected state all fail into recovery
ok 495 - corrupt, truncated, incompatible, and missing expected state all fail into recovery
  ---
  duration_ms: 2.1445
  type: 'test'
  ...
# Subtest: D v1.2 authority boundary replaces nominal BASE and identity markers with exact frozen authority
ok 496 - D v1.2 authority boundary replaces nominal BASE and identity markers with exact frozen authority
  ---
  duration_ms: 3.0862
  type: 'test'
  ...
# Subtest: D v1.2 restart from dispatch-authorized observes physical reality before retry eligibility
ok 497 - D v1.2 restart from dispatch-authorized observes physical reality before retry eligibility
  ---
  duration_ms: 0.7807
  type: 'test'
  ...
# Subtest: D v1.2 restart from outcome-unknown also observes physical reality before retry eligibility
ok 498 - D v1.2 restart from outcome-unknown also observes physical reality before retry eligibility
  ---
  duration_ms: 0.2785
  type: 'test'
  ...
# Subtest: D v1.2 correctly observed reserved folder is physical proof but not commit authority without convergence
ok 499 - D v1.2 correctly observed reserved folder is physical proof but not commit authority without convergence
  ---
  duration_ms: 0.5715
  type: 'test'
  ...
# Subtest: D v1.2 correctly observed reserved folder becomes commit-eligible only with converged path authority
ok 500 - D v1.2 correctly observed reserved folder becomes commit-eligible only with converged path authority
  ---
  duration_ms: 0.2523
  type: 'test'
  ...
# Subtest: D v1.2 wrong actual parent remains conflict-preserved
ok 501 - D v1.2 wrong actual parent remains conflict-preserved
  ---
  duration_ms: 0.2774
  type: 'test'
  ...
# Subtest: D v1.2 wrong actual structural path remains conflict-preserved
ok 502 - D v1.2 wrong actual structural path remains conflict-preserved
  ---
  duration_ms: 0.3684
  type: 'test'
  ...
# Subtest: D v1.2 occupied logical target cannot become verified-not-applied retry authority
ok 503 - D v1.2 occupied logical target cannot become verified-not-applied retry authority
  ---
  duration_ms: 0.3453
  type: 'test'
  ...
# Subtest: D v1.2 authoritative reserved-ID absence and clear target can become safe retry eligibility
ok 504 - D v1.2 authoritative reserved-ID absence and clear target can become safe retry eligibility
  ---
  duration_ms: 0.587
  type: 'test'
  ...
# Subtest: D v1.2 incomplete recovery observation remains recovery-pending
ok 505 - D v1.2 incomplete recovery observation remains recovery-pending
  ---
  duration_ms: 0.7852
  type: 'test'
  ...
# Subtest: D v1.2 unrelated sibling effects are independently classified while one recovery is conflicted
ok 506 - D v1.2 unrelated sibling effects are independently classified while one recovery is conflicted
  ---
  duration_ms: 0.815
  type: 'test'
  ...
# Subtest: D v1.2 restart never re-observes or duplicates a state-committed folder create
ok 507 - D v1.2 restart never re-observes or duplicates a state-committed folder create
  ---
  duration_ms: 0.2117
  type: 'test'
  ...
# Subtest: D authoritative coordinator replaces nominal BASE authority and restores exact canonical state CAS
ok 508 - D authoritative coordinator replaces nominal BASE authority and restores exact canonical state CAS
  ---
  duration_ms: 1.7179
  type: 'test'
  ...
# Subtest: D exact canonical CAS stale result is surfaced rather than silently committing
ok 509 - D exact canonical CAS stale result is surfaced rather than silently committing
  ---
  duration_ms: 0.2761
  type: 'test'
  ...
# Subtest: D operation self-assertion cannot manufacture identity authority without a durable mapping
ok 510 - D operation self-assertion cannot manufacture identity authority without a durable mapping
  ---
  duration_ms: 0.252
  type: 'test'
  ...
# Subtest: D contradictory durable identity mapping rejects operation path or remote ID assertion
ok 511 - D contradictory durable identity mapping rejects operation path or remote ID assertion
  ---
  duration_ms: 0.3629
  type: 'test'
  ...
# Subtest: D duplicate durable mapping is non-unique and blocks identity authority
ok 512 - D duplicate durable mapping is non-unique and blocks identity authority
  ---
  duration_ms: 0.3925
  type: 'test'
  ...
# Subtest: D matching current-generation durable mapping resolves exact identity authority
ok 513 - D matching current-generation durable mapping resolves exact identity authority
  ---
  duration_ms: 0.6043
  type: 'test'
  ...
# Subtest: D authoritative coordinator isolates stale exact precondition before physical execution
ok 514 - D authoritative coordinator isolates stale exact precondition before physical execution
  ---
  duration_ms: 0.3907
  type: 'test'
  ...
# Subtest: D authoritative coordinator refuses mutation when exact BASE convergence authority is unavailable
ok 515 - D authoritative coordinator refuses mutation when exact BASE convergence authority is unavailable
  ---
  duration_ms: 0.2896
  type: 'test'
  ...
# Subtest: D authoritative coordinator refuses operation when trusted mapping disagrees with operation
ok 516 - D authoritative coordinator refuses operation when trusted mapping disagrees with operation
  ---
  duration_ms: 0.2521
  type: 'test'
  ...
# Subtest: D remote-feed learning progresses independently while an unrelated path remains conflicted
ok 517 - D remote-feed learning progresses independently while an unrelated path remains conflicted
  ---
  duration_ms: 0.302
  type: 'test'
  ...
# Subtest: D exact common-state proof produces BASE healing transition without a content rewrite operation
ok 518 - D exact common-state proof produces BASE healing transition without a content rewrite operation
  ---
  duration_ms: 0.2053
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-file physical mutation
ok 519 - D durable mutation lifecycle persists intent and dispatch authority before local-file physical mutation
  ---
  duration_ms: 1.9848
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-file physical mutation
ok 520 - D durable mutation lifecycle persists intent and dispatch authority before remote-file physical mutation
  ---
  duration_ms: 0.4569
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-move physical mutation
ok 521 - D durable mutation lifecycle persists intent and dispatch authority before local-move physical mutation
  ---
  duration_ms: 0.3555
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-move physical mutation
ok 522 - D durable mutation lifecycle persists intent and dispatch authority before remote-move physical mutation
  ---
  duration_ms: 0.2831
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-trash physical mutation
ok 523 - D durable mutation lifecycle persists intent and dispatch authority before local-trash physical mutation
  ---
  duration_ms: 0.2903
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-trash physical mutation
ok 524 - D durable mutation lifecycle persists intent and dispatch authority before remote-trash physical mutation
  ---
  duration_ms: 0.1615
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before local-folder physical mutation
ok 525 - D durable mutation lifecycle persists intent and dispatch authority before local-folder physical mutation
  ---
  duration_ms: 0.2275
  type: 'test'
  ...
# Subtest: D durable mutation lifecycle persists intent and dispatch authority before remote-folder physical mutation
ok 526 - D durable mutation lifecycle persists intent and dispatch authority before remote-folder physical mutation
  ---
  duration_ms: 1.1048
  type: 'test'
  ...
# Subtest: D post-dispatch uncertainty is durable and restart never blindly redispatches
ok 527 - D post-dispatch uncertainty is durable and restart never blindly redispatches
  ---
  duration_ms: 0.7333
  type: 'test'
  ...
# Subtest: D conflict-preserved dispatch reaches bounded quiescence rather than immediate retry
ok 528 - D conflict-preserved dispatch reaches bounded quiescence rather than immediate retry
  ---
  duration_ms: 0.3838
  type: 'test'
  ...
# Subtest: D authoritative state commit requires exact durable physical verification reference
ok 529 - D authoritative state commit requires exact durable physical verification reference
  ---
  duration_ms: 0.4515
  type: 'test'
  ...
# Subtest: D clean merge tracks each physical effect independently across crash/restart
ok 530 - D clean merge tracks each physical effect independently across crash/restart
  ---
  duration_ms: 0.3796
  type: 'test'
  ...
# Subtest: C2 verified non-application retires a no-effect durable intent and permits renewed planning authority
ok 531 - C2 verified non-application retires a no-effect durable intent and permits renewed planning authority
  ---
  duration_ms: 0.3394
  type: 'test'
  ...
# Subtest: C2 verified non-application cannot retire a partially progressed multi-effect operation
ok 532 - C2 verified non-application cannot retire a partially progressed multi-effect operation
  ---
  duration_ms: 0.2831
  type: 'test'
  ...
# Subtest: D reliable Changes traversal retains prior-page removals and exposes only terminal newStartPageToken
ok 533 - D reliable Changes traversal retains prior-page removals and exposes only terminal newStartPageToken
  ---
  duration_ms: 3.3921
  type: 'test'
  ...
# Subtest: D failure before terminal Changes page cannot advance durable cursor authority
ok 534 - D failure before terminal Changes page cannot advance durable cursor authority
  ---
  duration_ms: 1.0916
  type: 'test'
  ...
# Subtest: D absence of ReliableRemoteChangePort falls back to full reconciliation instead of legacy readChanges
ok 535 - D absence of ReliableRemoteChangePort falls back to full reconciliation instead of legacy readChanges
  ---
  duration_ms: 0.724
  type: 'test'
  ...
# Subtest: D actual controller plus product executor has no nominal-only ordinary mutation fallback
ok 536 - D actual controller plus product executor has no nominal-only ordinary mutation fallback
  ---
  duration_ms: 9.6494
  type: 'test'
  ...
# Subtest: D production update stops at effect-verified until authoritative canonical commit occurs
ok 537 - D production update stops at effect-verified until authoritative canonical commit occurs
  ---
  duration_ms: 6.7225
  type: 'test'
  ...
# Subtest: D authoritative production adapter vetoes mutation when independent remote observation disagrees
ok 538 - D authoritative production adapter vetoes mutation when independent remote observation disagrees
  ---
  duration_ms: 0.4344
  type: 'test'
  ...
# Subtest: D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
ok 539 - D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
  ---
  duration_ms: 2.2439
  type: 'test'
  ...
# Subtest: D missing writable/frozen production mutation dependencies fail closed before physical dispatch
ok 540 - D missing writable/frozen production mutation dependencies fail closed before physical dispatch
  ---
  duration_ms: 0.5293
  type: 'test'
  ...
# Subtest: default breaker permits a small ordinary trusted deletion below every threshold
ok 541 - default breaker permits a small ordinary trusted deletion below every threshold
  ---
  duration_ms: 0.5376
  type: 'test'
  ...
# Subtest: default absolute-count boundary blocks exactly at the configured threshold
ok 542 - default absolute-count boundary blocks exactly at the configured threshold
  ---
  duration_ms: 0.2518
  type: 'test'
  ...
# Subtest: default affected-percentage boundary blocks at the configured fraction even below absolute count
ok 543 - default affected-percentage boundary blocks at the configured fraction even below absolute count
  ---
  duration_ms: 0.186
  type: 'test'
  ...
# Subtest: reconstructed or untrusted state makes even one destructive operation review-only
ok 544 - reconstructed or untrusted state makes even one destructive operation review-only
  ---
  duration_ms: 0.1366
  type: 'test'
  ...
# Subtest: approval remains scoped to the exact reviewed plan and a concrete recovery checkpoint
ok 545 - approval remains scoped to the exact reviewed plan and a concrete recovery checkpoint
  ---
  duration_ms: 0.3785
  type: 'test'
  ...
# Subtest: production planner prevents a stale current device from authorizing any destructive plan
ok 546 - production planner prevents a stale current device from authorizing any destructive plan
  ---
  duration_ms: 1.8662
  type: 'test'
  ...
# Subtest: tombstones expire at the configured bound only when every known device is current
ok 547 - tombstones expire at the configured bound only when every known device is current
  ---
  duration_ms: 0.2888
  type: 'test'
  ...
# Subtest: Phase 6 C: authorization rejects a token grant broader than exact drive.file
ok 548 - Phase 6 C: authorization rejects a token grant broader than exact drive.file
  ---
  duration_ms: 41.0979
  type: 'test'
  ...
# Subtest: Phase 6 C: previously persisted broader-scope token fails closed before remote use
ok 549 - Phase 6 C: previously persisted broader-scope token fails closed before remote use
  ---
  duration_ms: 0.6285
  type: 'test'
  ...
# Subtest: Phase 6 C: refresh cannot silently broaden an exact drive.file grant
ok 550 - Phase 6 C: refresh cannot silently broaden an exact drive.file grant
  ---
  duration_ms: 0.6908
  type: 'test'
  ...
# Subtest: Phase 6 C: refresh remains valid when Google omits scope and existing grant is exact
ok 551 - Phase 6 C: refresh remains valid when Google omits scope and existing grant is exact
  ---
  duration_ms: 0.8823
  type: 'test'
  ...
# Subtest: Phase 6 C: exact reauthorization never carries forward a broader-scope refresh token
ok 552 - Phase 6 C: exact reauthorization never carries forward a broader-scope refresh token
  ---
  duration_ms: 3.443
  type: 'test'
  ...
# Subtest: Phase 6 C: hosted callback remains authorization-only and content/token nonpersistent
ok 553 - Phase 6 C: hosted callback remains authorization-only and content/token nonpersistent
  ---
  duration_ms: 1.7148
  type: 'test'
  ...
# Subtest: Phase 6 C: callback deployment policy is no-store, no-referrer, and tightly sandboxed
ok 554 - Phase 6 C: callback deployment policy is no-store, no-referrer, and tightly sandboxed
  ---
  duration_ms: 1.7869
  type: 'test'
  ...
# Subtest: C01 regression: scoped artifact paths are safe deterministic siblings for root and nested targets
ok 555 - C01 regression: scoped artifact paths are safe deterministic siblings for root and nested targets
  ---
  duration_ms: 11.742
  type: 'test'
  ...
# Subtest: C01 regression: commit and recovery reuse the exact corrected physical artifact mapping
ok 556 - C01 regression: commit and recovery reuse the exact corrected physical artifact mapping
  ---
  duration_ms: 3.807
  type: 'test'
  ...
# Subtest: D terminal two-page batch is durably learned before cursor advancement while sibling path conflict remains unresolved
ok 557 - D terminal two-page batch is durably learned before cursor advancement while sibling path conflict remains unresolved
  ---
  duration_ms: 12.648
  type: 'test'
  ...
# Subtest: D later unrelated REMOTE changes continue from durable learned terminal while prior conflicted facts remain in backlog
ok 558 - D later unrelated REMOTE changes continue from durable learned terminal while prior conflicted facts remain in backlog
  ---
  duration_ms: 2.3476
  type: 'test'
  ...
# Subtest: D-C9 actual partial conflict run still learns terminal batch and next run progresses to later REMOTE facts
ok 559 - D-C9 actual partial conflict run still learns terminal batch and next run progresses to later REMOTE facts
  ---
  duration_ms: 4.2038
  type: 'test'
  ...
# Subtest: D repeated already-learned terminal batch is idempotent
ok 560 - D repeated already-learned terminal batch is idempotent
  ---
  duration_ms: 1.8973
  type: 'test'
  ...
# Subtest: D absent writable authority store cannot advance terminal REMOTE feed checkpoint
ok 561 - D absent writable authority store cannot advance terminal REMOTE feed checkpoint
  ---
  duration_ms: 2.6787
  type: 'test'
  ...
# Subtest: D failure before terminal creates no learned batch and advances no checkpoint
ok 562 - D failure before terminal creates no learned batch and advances no checkpoint
  ---
  duration_ms: 1.0825
  type: 'test'
  ...
# Subtest: D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
ok 563 - D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
  ---
  duration_ms: 3.6996
  type: 'test'
  ...
# Subtest: D-C7 stale canonical CAS leaves durable effect at effect-verified
ok 564 - D-C7 stale canonical CAS leaves durable effect at effect-verified
  ---
  duration_ms: 0.5298
  type: 'test'
  ...
# Subtest: D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
ok 565 - D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
  ---
  duration_ms: 0.8267
  type: 'test'
  ...
# Subtest: D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
ok 566 - D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
  ---
  duration_ms: 1.0292
  type: 'test'
  ...
# Subtest: D-C8 production REMOTE folder reserved identity is carried into the verified receipt
ok 567 - D-C8 production REMOTE folder reserved identity is carried into the verified receipt
  ---
  duration_ms: 4.524
  type: 'test'
  ...
# Subtest: D production REMOTE file create uses reserved ReliableRemoteMutationPort and stops at effect-verified
ok 568 - D production REMOTE file create uses reserved ReliableRemoteMutationPort and stops at effect-verified
  ---
  duration_ms: 2.3641
  type: 'test'
  ...
# Subtest: D production REMOTE move and trash use frozen mutation methods, never raw Drive methods
ok 569 - D production REMOTE move and trash use frozen mutation methods, never raw Drive methods
  ---
  duration_ms: 1.9149
  type: 'test'
  ...
# Subtest: D production LOCAL file create and replace use LocalTransactionalMutationPort
ok 570 - D production LOCAL file create and replace use LocalTransactionalMutationPort
  ---
  duration_ms: 2.4835
  type: 'test'
  ...
# Subtest: D production LOCAL folder create, move, and trash persist descriptors before physical mutation
ok 571 - D production LOCAL folder create, move, and trash persist descriptors before physical mutation
  ---
  duration_ms: 3.5231
  type: 'test'
  ...
# Subtest: D production clean merge persists and verifies independent LOCAL and REMOTE effects
ok 572 - D production clean merge persists and verifies independent LOCAL and REMOTE effects
  ---
  duration_ms: 1.6893
  type: 'test'
  ...
# Subtest: D production restart from intent-persisted never dispatches; dispatch-authorized and outcome-unknown reconcile without blind redispatch
ok 573 - D production restart from intent-persisted never dispatches; dispatch-authorized and outcome-unknown reconcile without blind redispatch
  ---
  duration_ms: 3.2914
  type: 'test'
  ...
# Subtest: D physical verification without unique logical-path convergence remains blocked and cannot become state-committed
ok 574 - D physical verification without unique logical-path convergence remains blocked and cannot become state-committed
  ---
  duration_ms: 0.6978
  type: 'test'
  ...
# Subtest: D-C10 planner-generated upload-update gains exactly one trusted identity authority proof
ok 575 - D-C10 planner-generated upload-update gains exactly one trusted identity authority proof
  ---
  duration_ms: 3.2403
  type: 'test'
  ...
# Subtest: D-C10 upload-update blocks missing, duplicate, and contradictory identity mappings
ok 576 - D-C10 upload-update blocks missing, duplicate, and contradictory identity mappings
  ---
  duration_ms: 0.9831
  type: 'test'
  ...
# Subtest: D-C10 planner-generated trash-remote gains exactly one trusted identity authority proof
ok 577 - D-C10 planner-generated trash-remote gains exactly one trusted identity authority proof
  ---
  duration_ms: 0.6667
  type: 'test'
  ...
# Subtest: D-C10 trash-remote blocks missing, duplicate, and contradictory identity mappings
ok 578 - D-C10 trash-remote blocks missing, duplicate, and contradictory identity mappings
  ---
  duration_ms: 0.3874
  type: 'test'
  ...
# Subtest: D-C10 nominal identity-unambiguous marker cannot manufacture executable authority
ok 579 - D-C10 nominal identity-unambiguous marker cannot manufacture executable authority
  ---
  duration_ms: 0.8768
  type: 'test'
  ...
# Subtest: D-C10 planner-generated upload-update reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
ok 580 - D-C10 planner-generated upload-update reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
  ---
  duration_ms: 1.7079
  type: 'test'
  ...
# Subtest: D-C10 planner-generated trash-remote reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
ok 581 - D-C10 planner-generated trash-remote reaches the real frozen REMOTE mutation seam through the authority-complete coordinator
  ---
  duration_ms: 1.4629
  type: 'test'
  ...
# Subtest: D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
ok 582 - D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
  ---
  duration_ms: 1.5043
  type: 'test'
  ...
# Subtest: D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
ok 583 - D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
  ---
  duration_ms: 3.5586
  type: 'test'
  ...
# Subtest: D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
ok 584 - D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
  ---
  duration_ms: 1.3664
  type: 'test'
  ...
# Subtest: D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
ok 585 - D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
  ---
  duration_ms: 0.5633
  type: 'test'
  ...
# Subtest: D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
ok 586 - D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
  ---
  duration_ms: 0.3297
  type: 'test'
  ...
# Subtest: D-C12 persisted update candidate identity becomes canonical
ok 587 - D-C12 persisted update candidate identity becomes canonical
  ---
  duration_ms: 1.6165
  type: 'test'
  ...
# Subtest: D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
ok 588 - D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
  ---
  duration_ms: 15.0307
  type: 'test'
  ...
# Subtest: D-C11 controller recovers outstanding durable work before a fresh planner returns noop
ok 589 - D-C11 controller recovers outstanding durable work before a fresh planner returns noop
  ---
  duration_ms: 3.058
  type: 'test'
  ...
# Subtest: LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
ok 590 - LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
  ---
  duration_ms: 6.4409
  type: 'test'
  ...
# Subtest: LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
ok 591 - LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
  ---
  duration_ms: 0.8689
  type: 'test'
  ...
# Subtest: LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
ok 592 - LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
  ---
  duration_ms: 1.6713
  type: 'test'
  ...
# Subtest: LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
ok 593 - LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
  ---
  duration_ms: 3.9342
  type: 'test'
  ...
# Subtest: D-C11 effect-verified restart re-observes convergence and preserves evidence when physical reality diverged
ok 594 - D-C11 effect-verified restart re-observes convergence and preserves evidence when physical reality diverged
  ---
  duration_ms: 0.6564
  type: 'test'
  ...
# Subtest: D-C13-T1 ordinary convergence requires the candidate to be the sole live path occupant
ok 595 - D-C13-T1 ordinary convergence requires the candidate to be the sole live path occupant
  ---
  duration_ms: 1.7094
  type: 'test'
  ...
# Subtest: D-C13-T2 restart retires the exact predecessor/candidate intermediate without redispatching content
ok 596 - D-C13-T2 restart retires the exact predecessor/candidate intermediate without redispatching content
  ---
  duration_ms: 1.4476
  type: 'test'
  ...
# Subtest: D-C13-T3 REMOTE create retains strict exact-one same-path convergence
ok 597 - D-C13-T3 REMOTE create retains strict exact-one same-path convergence
  ---
  duration_ms: 0.5885
  type: 'test'
  ...
# Subtest: D-C13-T4 wrong predecessor identity is rejected
ok 598 - D-C13-T4 wrong predecessor identity is rejected
  ---
  duration_ms: 0.6247
  type: 'test'
  ...
# Subtest: D-C13-T5 unexpected third same-path object is rejected
ok 599 - D-C13-T5 unexpected third same-path object is rejected
  ---
  duration_ms: 1.3041
  type: 'test'
  ...
# Subtest: D-C13-T6 wrong candidate identity and candidate content mismatch are both rejected
ok 600 - D-C13-T6 wrong candidate identity and candidate content mismatch are both rejected
  ---
  duration_ms: 0.6698
  type: 'test'
  ...
# Subtest: D-C13-T7 predecessor revision mismatch is rejected
ok 601 - D-C13-T7 predecessor revision mismatch is rejected
  ---
  duration_ms: 0.4827
  type: 'test'
  ...
# Subtest: v1.1 authority store: LOCAL folder intent fits authoritative metadata without a sidecar
ok 602 - v1.1 authority store: LOCAL folder intent fits authoritative metadata without a sidecar
  ---
  duration_ms: 1.2383
  type: 'test'
  ...
# Subtest: v1.1 authority store: REMOTE folder intent fits authoritative metadata with reserved identity
ok 603 - v1.1 authority store: REMOTE folder intent fits authoritative metadata with reserved identity
  ---
  duration_ms: 0.3377
  type: 'test'
  ...
# Subtest: v1.1 authority store: LOCAL folder save then restart/load preserves stage and structural authority
ok 604 - v1.1 authority store: LOCAL folder save then restart/load preserves stage and structural authority
  ---
  duration_ms: 1.4776
  type: 'test'
  ...
# Subtest: v1.1 authority store: REMOTE reserved identity survives save then restart/load unchanged
ok 605 - v1.1 authority store: REMOTE reserved identity survives save then restart/load unchanged
  ---
  duration_ms: 0.517
  type: 'test'
  ...
# Subtest: v1.1 authority store: shared completion semantics require every folder-capable effect state-committed
ok 606 - v1.1 authority store: shared completion semantics require every folder-capable effect state-committed
  ---
  duration_ms: 0.2945
  type: 'test'
  ...
# Subtest: v1.1 authority store: C and D exchange folder intent solely through frozen metadata/store contract
ok 607 - v1.1 authority store: C and D exchange folder intent solely through frozen metadata/store contract
  ---
  duration_ms: 0.5972
  type: 'test'
  ...
# Subtest: folder create: local intent persisted before dispatch is safely unattempted
ok 608 - folder create: local intent persisted before dispatch is safely unattempted
  ---
  duration_ms: 2.0346
  type: 'test'
  ...
# Subtest: folder create: local dispatch authority means physical reality must be reconciled
ok 609 - folder create: local dispatch authority means physical reality must be reconciled
  ---
  duration_ms: 0.191
  type: 'test'
  ...
# Subtest: folder create: local folder requires structural path authority before verified effect
ok 610 - folder create: local folder requires structural path authority before verified effect
  ---
  duration_ms: 0.3505
  type: 'test'
  ...
# Subtest: folder create: local authoritative absence is verified-not-applied
ok 611 - folder create: local authoritative absence is verified-not-applied
  ---
  duration_ms: 0.1628
  type: 'test'
  ...
# Subtest: folder create: remote lost response reconciles the same reserved Drive identity
ok 612 - folder create: remote lost response reconciles the same reserved Drive identity
  ---
  duration_ms: 0.3163
  type: 'test'
  ...
# Subtest: folder create: remote reserved identity can prove definitely not applied and be retried with same authority
ok 613 - folder create: remote reserved identity can prove definitely not applied and be retried with same authority
  ---
  duration_ms: 0.1897
  type: 'test'
  ...
# Subtest: folder create: same logical remote path with wrong object identity is conflict, not convergence
ok 614 - folder create: same logical remote path with wrong object identity is conflict, not convergence
  ---
  duration_ms: 0.1456
  type: 'test'
  ...
# Subtest: folder create: empty folder lifecycle uses structural proof and still requires path convergence before authoritative commit
ok 615 - folder create: empty folder lifecycle uses structural proof and still requires path convergence before authoritative commit
  ---
  duration_ms: 0.2228
  type: 'test'
  ...
# Subtest: v1.2 T1: correct reserved folder under correct observed parent is verified-effect
ok 616 - v1.2 T1: correct reserved folder under correct observed parent is verified-effect
  ---
  duration_ms: 1.8894
  type: 'test'
  ...
# Subtest: v1.2 T2: correct reserved folder under wrong observed parent is conservative conflict
ok 617 - v1.2 T2: correct reserved folder under wrong observed parent is conservative conflict
  ---
  duration_ms: 0.2306
  type: 'test'
  ...
# Subtest: v1.2 T3: correct reserved ID at wrong structural path is not success
ok 618 - v1.2 T3: correct reserved ID at wrong structural path is not success
  ---
  duration_ms: 0.2898
  type: 'test'
  ...
# Subtest: v1.2 T4: reserved ID missing while intended path is occupied is conflict, not verified-not-applied
ok 619 - v1.2 T4: reserved ID missing while intended path is occupied is conflict, not verified-not-applied
  ---
  duration_ms: 0.181
  type: 'test'
  ...
# Subtest: v1.2 T5: authoritative reserved-ID absence plus clear target may establish verified-not-applied
ok 620 - v1.2 T5: authoritative reserved-ID absence plus clear target may establish verified-not-applied
  ---
  duration_ms: 0.426
  type: 'test'
  ...
# Subtest: v1.2 T6: duplicate or ambiguous logical path never selects an arbitrary candidate
ok 621 - v1.2 T6: duplicate or ambiguous logical path never selects an arbitrary candidate
  ---
  duration_ms: 0.1672
  type: 'test'
  ...
# Subtest: v1.2 T7: incomplete parent/path observation remains outcome-unknown
ok 622 - v1.2 T7: incomplete parent/path observation remains outcome-unknown
  ---
  duration_ms: 0.2105
  type: 'test'
  ...
# Subtest: v1.2 T8: restart from dispatch-authorized performs read-only reconciliation before any redispatch
ok 623 - v1.2 T8: restart from dispatch-authorized performs read-only reconciliation before any redispatch
  ---
  duration_ms: 1.2043
  type: 'test'
  ...
# Subtest: v1.2 T9: restart from outcome-unknown performs the same read-only reconciliation before redispatch
ok 624 - v1.2 T9: restart from outcome-unknown performs the same read-only reconciliation before redispatch
  ---
  duration_ms: 0.6352
  type: 'test'
  ...
# Subtest: v1.2 T10: intended parent in descriptor is expectation, not observed proof
ok 625 - v1.2 T10: intended parent in descriptor is expectation, not observed proof
  ---
  duration_ms: 0.6075
  type: 'test'
  ...
# Subtest: foundation v1.3 C1: Drive authentication maps to public provenance and survives lazy carrier/extractor
ok 626 - foundation v1.3 C1: Drive authentication maps to public provenance and survives lazy carrier/extractor
  ---
  duration_ms: 2.6307
  type: 'test'
  ...
# Subtest: foundation v1.3 C2: transient Drive failure maps to public provenance
ok 627 - foundation v1.3 C2: transient Drive failure maps to public provenance
  ---
  duration_ms: 0.2116
  type: 'test'
  ...
# Subtest: foundation v1.3 C3: rate-limit mapping preserves exactly retryAfterMs 5000
ok 628 - foundation v1.3 C3: rate-limit mapping preserves exactly retryAfterMs 5000
  ---
  duration_ms: 0.155
  type: 'test'
  ...
# Subtest: foundation v1.3 C4: not-found has no context-free operational recovery provenance
ok 629 - foundation v1.3 C4: not-found has no context-free operational recovery provenance
  ---
  duration_ms: 0.195
  type: 'test'
  ...
# Subtest: foundation v1.3 C5: conflict has no context-free operational recovery provenance
ok 630 - foundation v1.3 C5: conflict has no context-free operational recovery provenance
  ---
  duration_ms: 0.2573
  type: 'test'
  ...
# Subtest: foundation v1.3 C6: generic local I/O uncertainty fabricates no remote provenance
ok 631 - foundation v1.3 C6: generic local I/O uncertainty fabricates no remote provenance
  ---
  duration_ms: 0.1463
  type: 'test'
  ...
# Subtest: foundation v1.3 C7: physically unknown remote mutation plus transient provenance remains physically unknown
ok 632 - foundation v1.3 C7: physically unknown remote mutation plus transient provenance remains physically unknown
  ---
  duration_ms: 0.2333
  type: 'test'
  ...
# Subtest: foundation v1.3 C8: verified-not-applied and outcome-unknown remain distinct under same operational cause
ok 633 - foundation v1.3 C8: verified-not-applied and outcome-unknown remain distinct under same operational cause
  ---
  duration_ms: 0.1813
  type: 'test'
  ...
# Subtest: foundation v1.3 T3: verified-not-applied authentication preserves safe execution without fabricated reconciliation
ok 634 - foundation v1.3 T3: verified-not-applied authentication preserves safe execution without fabricated reconciliation
  ---
  duration_ms: 0.5349
  type: 'test'
  ...
# Subtest: foundation v1.3 C9: uncertain authentication surfaces auth while requiring physical reconciliation
ok 635 - foundation v1.3 C9: uncertain authentication surfaces auth while requiring physical reconciliation
  ---
  duration_ms: 0.9406
  type: 'test'
  ...
# Subtest: foundation v1.3 C10: uncertain rate limit preserves timing and forbids redispatch until reconciliation
ok 636 - foundation v1.3 C10: uncertain rate limit preserves timing and forbids redispatch until reconciliation
  ---
  duration_ms: 0.4169
  type: 'test'
  ...
# Subtest: foundation v1.3 C11: uncertain result without provenance becomes conservative recovery
ok 637 - foundation v1.3 C11: uncertain result without provenance becomes conservative recovery
  ---
  duration_ms: 0.2543
  type: 'test'
  ...
# Subtest: foundation v1.3 C12: ordinary retry requires explicit no-unresolved-effect physical authority
ok 638 - foundation v1.3 C12: ordinary retry requires explicit no-unresolved-effect physical authority
  ---
  duration_ms: 0.1525
  type: 'test'
  ...
# Subtest: foundation v1.3 C13: rate-limit timing has one execution authority
ok 639 - foundation v1.3 C13: rate-limit timing has one execution authority
  ---
  duration_ms: 0.2035
  type: 'test'
  ...
# Subtest: foundation v1.3 C14: recovery-required physical state cannot be erased by operational metadata
ok 640 - foundation v1.3 C14: recovery-required physical state cannot be erased by operational metadata
  ---
  duration_ms: 0.1153
  type: 'test'
  ...
# Subtest: foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes
ok 641 - foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes
  ---
  duration_ms: 1032.1735
  type: 'test'
  ...
# Subtest: foundation v1.3 C16: documentation succession material is appended after approved predecessor prefixes
ok 642 - foundation v1.3 C16: documentation succession material is appended after approved predecessor prefixes
  ---
  duration_ms: 1.0529
  type: 'test'
  ...
# Subtest: H-I1 REMOTE create composes C durable authority, A reserved identity, D verification, and canonical commit
ok 643 - H-I1 REMOTE create composes C durable authority, A reserved identity, D verification, and canonical commit
  ---
  duration_ms: 86.2437
  type: 'test'
  ...
# Subtest: H-I2 REMOTE trash uses current C identity authority through A and fails closed when the mapping is absent
ok 644 - H-I2 REMOTE trash uses current C identity authority through A and fails closed when the mapping is absent
  ---
  duration_ms: 10.0518
  type: 'test'
  ...
# Subtest: H-I3 C-persisted dispatch-authorized create restarts through D observation without redispatch and becomes inert after state commit
ok 645 - H-I3 C-persisted dispatch-authorized create restarts through D observation without redispatch and becomes inert after state commit
  ---
  duration_ms: 14.3425
  type: 'test'
  ...
# Subtest: H-I4 D LOCAL mutation uses H logical mapping and B crash-safe transaction for portable configuration
ok 646 - H-I4 D LOCAL mutation uses H logical mapping and B crash-safe transaction for portable configuration
  ---
  duration_ms: 17.315
  type: 'test'
  ...
# Subtest: H-I8 missing writable C, A reliable REMOTE, or B LOCAL transaction seam fails closed without legacy mutation
ok 647 - H-I8 missing writable C, A reliable REMOTE, or B LOCAL transaction seam fails closed without legacy mutation
  ---
  duration_ms: 3.6112
  type: 'test'
  ...
# Subtest: H-I5 E periodic integrity uses B cache-bypassing bytes, schedules reconciliation on drift, and suspension prevents a new run
ok 648 - H-I5 E periodic integrity uses B cache-bypassing bytes, schedules reconciliation on drift, and suspension prevents a new run
  ---
  duration_ms: 17.1206
  type: 'test'
  ...
# Subtest: H-I6 A Changes traverse all pages; C durable learning precedes cursor mirror and restart consumes durable facts
ok 649 - H-I6 A Changes traverse all pages; C durable learning precedes cursor mirror and restart consumes durable facts
  ---
  duration_ms: 31.5711
  type: 'test'
  ...
# Subtest: H-I6 failure to durably learn the terminal A batch prevents canonical cursor advancement
ok 650 - H-I6 failure to durably learn the terminal A batch prevents canonical cursor advancement
  ---
  duration_ms: 10.7786
  type: 'test'
  ...
# Subtest: H-I7 F clean merge requires independent B LOCAL and A REMOTE durable verification before C canonical commit
ok 651 - H-I7 F clean merge requires independent B LOCAL and A REMOTE durable verification before C canonical commit
  ---
  duration_ms: 29.7437
  type: 'test'
  ...
# Subtest: 01 exact BASE authority is required by transitions
ok 652 - 01 exact BASE authority is required by transitions
  ---
  duration_ms: 2.6433
  type: 'test'
  ...
# Subtest: 02 exact identity authority is required before mapped remote mutation
ok 653 - 02 exact identity authority is required before mapped remote mutation
  ---
  duration_ms: 0.5218
  type: 'test'
  ...
# Subtest: 03 upload survives crash/restart at every durable effect stage
ok 654 - 03 upload survives crash/restart at every durable effect stage
  ---
  duration_ms: 24.438
  type: 'test'
  ...
# Subtest: 04 download survives crash/restart at every durable effect stage
ok 655 - 04 download survives crash/restart at every durable effect stage
  ---
  duration_ms: 1.7647
  type: 'test'
  ...
# Subtest: 05 move survives crash/restart at every durable effect stage
ok 656 - 05 move survives crash/restart at every durable effect stage
  ---
  duration_ms: 3.1977
  type: 'test'
  ...
# Subtest: 06 trash survives crash/restart at every durable effect stage
ok 657 - 06 trash survives crash/restart at every durable effect stage
  ---
  duration_ms: 1.1762
  type: 'test'
  ...
# Subtest: 07 clean merge requires both physical effects before BASE convergence
ok 658 - 07 clean merge requires both physical effects before BASE convergence
  ---
  duration_ms: 0.599
  type: 'test'
  ...
# Subtest: 08 intended candidate plus independent candidate preserves conflict
ok 659 - 08 intended candidate plus independent candidate preserves conflict
  ---
  duration_ms: 0.4509
  type: 'test'
  ...
# Subtest: 09 independent candidate cannot be collapsed without explicit authority
ok 660 - 09 independent candidate cannot be collapsed without explicit authority
  ---
  duration_ms: 0.2296
  type: 'test'
  ...
# Subtest: 10 durable intended L1 is not substituted by later L2
ok 661 - 10 durable intended L1 is not substituted by later L2
  ---
  duration_ms: 0.6294
  type: 'test'
  ...
# Subtest: 11 outcome-unknown reconciles physical reality without blind redispatch
ok 662 - 11 outcome-unknown reconciles physical reality without blind redispatch
  ---
  duration_ms: 0.2978
  type: 'test'
  ...
# Subtest: 12 clean merge crash after one effect cannot commit logical convergence
ok 663 - 12 clean merge crash after one effect cannot commit logical convergence
  ---
  duration_ms: 0.5197
  type: 'test'
  ...
# Subtest: 13 multi-page changes advance cursor only on durable terminal page
ok 664 - 13 multi-page changes advance cursor only on durable terminal page
  ---
  duration_ms: 0.4867
  type: 'test'
  ...
# Subtest: 14 multiple learned removal batches remain durable across restart
ok 665 - 14 multiple learned removal batches remain durable across restart
  ---
  duration_ms: 0.3809
  type: 'test'
  ...
# Subtest: 15 repeated moves preserve stable remote identity
ok 666 - 15 repeated moves preserve stable remote identity
  ---
  duration_ms: 0.9672
  type: 'test'
  ...
# Subtest: 16 create-delete sequence preserves acknowledged deletion history
ok 667 - 16 create-delete sequence preserves acknowledged deletion history
  ---
  duration_ms: 0.7293
  type: 'test'
  ...
# Subtest: 17 duplicate logical paths become conflict through resolution transition
ok 668 - 17 duplicate logical paths become conflict through resolution transition
  ---
  duration_ms: 0.4162
  type: 'test'
  ...
# Subtest: 18 unresolved path A does not block safe path B progress
ok 669 - 18 unresolved path A does not block safe path B progress
  ---
  duration_ms: 1.5671
  type: 'test'
  ...
# Subtest: 19 missed watcher is discovered by integrity reconciliation
ok 670 - 19 missed watcher is discovered by integrity reconciliation
  ---
  duration_ms: 1.2173
  type: 'test'
  ...
# Subtest: 20 Windows watcher-event loss is recoverable through authoritative integrity read
ok 671 - 20 Windows watcher-event loss is recoverable through authoritative integrity read
  ---
  duration_ms: 0.4626
  type: 'test'
  ...
# Subtest: 21 suspend/resume preserves durable work and resumes safely
ok 672 - 21 suspend/resume preserves durable work and resumes safely
  ---
  duration_ms: 0.7346
  type: 'test'
  ...
# Subtest: 22 abrupt process death reconstructs only durable state
ok 673 - 22 abrupt process death reconstructs only durable state
  ---
  duration_ms: 0.3348
  type: 'test'
  ...
# Subtest: 23 delivered cancellation stops dispatch while durable intent remains
ok 674 - 23 delivered cancellation stops dispatch while durable intent remains
  ---
  duration_ms: 0.6696
  type: 'test'
  ...
# Subtest: 24 cancellation not delivered before death cannot erase persisted intent
ok 675 - 24 cancellation not delivered before death cannot erase persisted intent
  ---
  duration_ms: 0.939
  type: 'test'
  ...
# Subtest: 25 auth loss cannot dispatch destructive work
ok 676 - 25 auth loss cannot dispatch destructive work
  ---
  duration_ms: 0.2876
  type: 'test'
  ...
# Subtest: 26 offline and rate-limited states preserve local-first edits
ok 677 - 26 offline and rate-limited states preserve local-first edits
  ---
  duration_ms: 0.3048
  type: 'test'
  ...
# Subtest: 27 churn on path A does not starve path B
ok 678 - 27 churn on path A does not starve path B
  ---
  duration_ms: 1.8837
  type: 'test'
  ...
# Subtest: 28 bounded quiescence after mutation pressure stops
ok 679 - 28 bounded quiescence after mutation pressure stops
  ---
  duration_ms: 0.4347
  type: 'test'
  ...
# Subtest: 29 concurrent same-path creates never silently select one remote winner
ok 680 - 29 concurrent same-path creates never silently select one remote winner
  ---
  duration_ms: 0.5634
  type: 'test'
  ...
# Subtest: 30 stale state cannot authorize destructive propagation
ok 681 - 30 stale state cannot authorize destructive propagation
  ---
  duration_ms: 0.2522
  type: 'test'
  ...
# Subtest: 31 incomplete remote coverage blocks a mass-deletion plan
ok 682 - 31 incomplete remote coverage blocks a mass-deletion plan
  ---
  duration_ms: 1.9047
  type: 'test'
  ...
# Subtest: 32 bounded merge refusal preserves both complete versions
ok 683 - 32 bounded merge refusal preserves both complete versions
  ---
  duration_ms: 0.3845
  type: 'test'
  ...
# Subtest: F1 exact observed reserved folder yields verified-effect
ok 684 - F1 exact observed reserved folder yields verified-effect
  ---
  duration_ms: 0.9349
  type: 'test'
  ...
# Subtest: F2 wrong actual parent is conflict-preserved
ok 685 - F2 wrong actual parent is conflict-preserved
  ---
  duration_ms: 0.2696
  type: 'test'
  ...
# Subtest: F3 wrong observed reserved-object path is conflict-preserved
ok 686 - F3 wrong observed reserved-object path is conflict-preserved
  ---
  duration_ms: 0.2005
  type: 'test'
  ...
# Subtest: F4 occupied intended target is conflict, never fabricated absence
ok 687 - F4 occupied intended target is conflict, never fabricated absence
  ---
  duration_ms: 0.2211
  type: 'test'
  ...
# Subtest: F5 authoritative exclusion of reserved identity and target occupants yields verified-not-applied
ok 688 - F5 authoritative exclusion of reserved identity and target occupants yields verified-not-applied
  ---
  duration_ms: 0.199
  type: 'test'
  ...
# Subtest: F6 duplicate target candidates remain outcome-unknown
ok 689 - F6 duplicate target candidates remain outcome-unknown
  ---
  duration_ms: 0.3079
  type: 'test'
  ...
# Subtest: F7 incomplete parent observation remains outcome-unknown
ok 690 - F7 incomplete parent observation remains outcome-unknown
  ---
  duration_ms: 0.2098
  type: 'test'
  ...
# Subtest: F8 restart from dispatch-authorized observes before any redispatch
ok 691 - F8 restart from dispatch-authorized observes before any redispatch
  ---
  duration_ms: 0.2168
  type: 'test'
  ...
# Subtest: F9 restart from outcome-unknown observes physical reality without a second dispatch
ok 692 - F9 restart from outcome-unknown observes physical reality without a second dispatch
  ---
  duration_ms: 0.4141
  type: 'test'
  ...
# Subtest: F10 descriptor parent intent cannot fabricate observed parent authority
ok 693 - F10 descriptor parent intent cannot fabricate observed parent authority
  ---
  duration_ms: 0.2535
  type: 'test'
  ...
# Subtest: G-C2 wrong parent through generic recover cannot become effect-verified
ok 694 - G-C2 wrong parent through generic recover cannot become effect-verified
  ---
  duration_ms: 0.2024
  type: 'test'
  ...
# Subtest: G-C2 occupied target with reserved ID absent remains conflict through generic recover
ok 695 - G-C2 occupied target with reserved ID absent remains conflict through generic recover
  ---
  duration_ms: 0.1732
  type: 'test'
  ...
# Subtest: G-C2 authoritatively clear target may retire only from verifier verified-not-applied
ok 696 - G-C2 authoritatively clear target may retire only from verifier verified-not-applied
  ---
  duration_ms: 0.1478
  type: 'test'
  ...
# Subtest: G-C2 response-loss recovery verifies exact physical folder without increasing dispatch count
ok 697 - G-C2 response-loss recovery verifies exact physical folder without increasing dispatch count
  ---
  duration_ms: 0.1876
  type: 'test'
  ...
# Subtest: G-C2 incomplete physical observation remains recovery through ordinary settle
ok 698 - G-C2 incomplete physical observation remains recovery through ordinary settle
  ---
  duration_ms: 0.5297
  type: 'test'
  ...
# Subtest: G-C2 generic recover routes multiple folder journals by exact journal identity
ok 699 - G-C2 generic recover routes multiple folder journals by exact journal identity
  ---
  duration_ms: 0.4522
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 1 is deterministic and invariant-checked
ok 700 - seeded randomized transition sequence 1 is deterministic and invariant-checked
  ---
  duration_ms: 5.2956
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 7 is deterministic and invariant-checked
ok 701 - seeded randomized transition sequence 7 is deterministic and invariant-checked
  ---
  duration_ms: 4.9718
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 42 is deterministic and invariant-checked
ok 702 - seeded randomized transition sequence 42 is deterministic and invariant-checked
  ---
  duration_ms: 5.1829
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 1337 is deterministic and invariant-checked
ok 703 - seeded randomized transition sequence 1337 is deterministic and invariant-checked
  ---
  duration_ms: 6.5285
  type: 'test'
  ...
# Subtest: seeded randomized transition sequence 12648430 is deterministic and invariant-checked
ok 704 - seeded randomized transition sequence 12648430 is deterministic and invariant-checked
  ---
  duration_ms: 4.7578
  type: 'test'
  ...
# Subtest: explicit replay reapplies recorded event trace and reproduces exact modeled result
ok 705 - explicit replay reapplies recorded event trace and reproduces exact modeled result
  ---
  duration_ms: 0.8192
  type: 'test'
  ...
# Subtest: simple trace minimizer retains only events needed for the same invariant failure
ok 706 - simple trace minimizer retains only events needed for the same invariant failure
  ---
  duration_ms: 0.866
  type: 'test'
  ...
# Subtest: trace serialization is sanitized and contains no platform/user/auth secrets
ok 707 - trace serialization is sanitized and contains no platform/user/auth secrets
  ---
  duration_ms: 0.7468
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
ok 708 - v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
  ---
  duration_ms: 6.7636
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
ok 709 - v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
  ---
  duration_ms: 2.0213
  type: 'test'
  ...
# Subtest: v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
ok 710 - v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
  ---
  duration_ms: 1.0429
  type: 'test'
  ...
# Subtest: v1.1 verified folder effect restarts by finishing authoritative state commit
ok 711 - v1.1 verified folder effect restarts by finishing authoritative state commit
  ---
  duration_ms: 1.8454
  type: 'test'
  ...
# Subtest: v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
ok 712 - v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
  ---
  duration_ms: 0.3016
  type: 'test'
  ...
# Subtest: v1.1 journal-only folder updates advance persistence revision without semantic generation
ok 713 - v1.1 journal-only folder updates advance persistence revision without semantic generation
  ---
  duration_ms: 0.8469
  type: 'test'
  ...
# Subtest: explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
ok 714 - explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
  ---
  duration_ms: 2.7525
  type: 'test'
  ...
# Subtest: malformed or inconsistent persisted v1.1 folder journal fails closed
ok 715 - malformed or inconsistent persisted v1.1 folder journal fails closed
  ---
  duration_ms: 1.4595
  type: 'test'
  ...
# Subtest: v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
ok 716 - v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
  ---
  duration_ms: 1.194
  type: 'test'
  ...
# Subtest: LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
ok 717 - LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
  ---
  duration_ms: 6.1594
  type: 'test'
  ...
# Subtest: LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
ok 718 - LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
  ---
  duration_ms: 6.0135
  type: 'test'
  ...
# Subtest: LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
ok 719 - LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
  ---
  duration_ms: 1.533
  type: 'test'
  ...
# Subtest: D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
ok 720 - D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
  ---
  duration_ms: 9.0329
  type: 'test'
  ...
# Subtest: D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
ok 721 - D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
  ---
  duration_ms: 5.4589
  type: 'test'
  ...
# Subtest: D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
ok 722 - D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
  ---
  duration_ms: 2.539
  type: 'test'
  ...
# Subtest: D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
ok 723 - D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
  ---
  duration_ms: 1.0723
  type: 'test'
  ...
# Subtest: D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
ok 724 - D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
  ---
  duration_ms: 0.2995
  type: 'test'
  ...
# Subtest: D-C12 persisted update candidate identity becomes canonical
ok 725 - D-C12 persisted update candidate identity becomes canonical
  ---
  duration_ms: 2.8004
  type: 'test'
  ...
# Subtest: D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
ok 726 - D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
  ---
  duration_ms: 15.9014
  type: 'test'
  ...
# Subtest: D-C11 controller recovers outstanding durable work before a fresh planner returns noop
ok 727 - D-C11 controller recovers outstanding durable work before a fresh planner returns noop
  ---
  duration_ms: 6.2004
  type: 'test'
  ...
# Subtest: LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
ok 728 - LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
  ---
  duration_ms: 2.362
  type: 'test'
  ...
# Subtest: LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
ok 729 - LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
  ---
  duration_ms: 1.3079
  type: 'test'
  ...
# Subtest: LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
ok 730 - LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence
  ---
  duration_ms: 2.994
  type: 'test'
  ...
# Subtest: LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
ok 731 - LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation
  ---
  duration_ms: 1.9093
  type: 'test'
  ...
# Subtest: D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
ok 732 - D-C6 canonical BASE/state commit occurs while durable effect remains effect-verified, then state-committed finalizes
  ---
  duration_ms: 2.1623
  type: 'test'
  ...
# Subtest: D-C7 stale canonical CAS leaves durable effect at effect-verified
ok 733 - D-C7 stale canonical CAS leaves durable effect at effect-verified
  ---
  duration_ms: 0.7297
  type: 'test'
  ...
# Subtest: D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
ok 734 - D-C8 reserved REMOTE folder identity propagates receipt to BASE and remoteMappings
  ---
  duration_ms: 0.7699
  type: 'test'
  ...
# Subtest: D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
ok 735 - D-C6 restart after canonical commit but before durable finalization does not repeat semantic commit
  ---
  duration_ms: 1.9972
  type: 'test'
  ...
# Subtest: D actual controller plus product executor has no nominal-only ordinary mutation fallback
ok 736 - D actual controller plus product executor has no nominal-only ordinary mutation fallback
  ---
  duration_ms: 17.7514
  type: 'test'
  ...
# Subtest: D production update stops at effect-verified until authoritative canonical commit occurs
ok 737 - D production update stops at effect-verified until authoritative canonical commit occurs
  ---
  duration_ms: 8.6622
  type: 'test'
  ...
# Subtest: D authoritative production adapter vetoes mutation when independent remote observation disagrees
ok 738 - D authoritative production adapter vetoes mutation when independent remote observation disagrees
  ---
  duration_ms: 0.4799
  type: 'test'
  ...
# Subtest: D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
ok 739 - D default trusted-state authority bridge cannot falsely acknowledge a durable authority mutation
  ---
  duration_ms: 1.2251
  type: 'test'
  ...
# Subtest: D missing writable/frozen production mutation dependencies fail closed before physical dispatch
ok 740 - D missing writable/frozen production mutation dependencies fail closed before physical dispatch
  ---
  duration_ms: 1.0782
  type: 'test'
  ...
# Subtest: H6C manual and Verify/Reconcile execution bind exact production diagnostic runs and terminal results
ok 741 - H6C manual and Verify/Reconcile execution bind exact production diagnostic runs and terminal results
  ---
  duration_ms: 3.8276
  type: 'test'
  ...
# Subtest: H6C sequential cycles with the same semantic plan ID retain distinct diagnostic runs without contamination
ok 742 - H6C sequential cycles with the same semantic plan ID retain distinct diagnostic runs without contamination
  ---
  duration_ms: 1.6957
  type: 'test'
  ...
# Subtest: H6C a different authority cycle or validation run cannot consume another cycle's observed production run
ok 743 - H6C a different authority cycle or validation run cannot consume another cycle's observed production run
  ---
  duration_ms: 0.6956
  type: 'test'
  ...
# Subtest: H6C conflict resolution binds the observed conflict cycle to a fresh exact production diagnostic run
ok 744 - H6C conflict resolution binds the observed conflict cycle to a fresh exact production diagnostic run
  ---
  duration_ms: 1.3748
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for missing terminal correlation
ok 745 - H6C accepted execution remains unproven for missing terminal correlation
  ---
  duration_ms: 0.713
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for wrong-run terminal correlation
ok 746 - H6C accepted execution remains unproven for wrong-run terminal correlation
  ---
  duration_ms: 0.2998
  type: 'test'
  ...
# Subtest: H6C accepted execution remains unproven for duplicate terminal correlation
ok 747 - H6C accepted execution remains unproven for duplicate terminal correlation
  ---
  duration_ms: 1.792
  type: 'test'
  ...
# Subtest: H6C exact failed terminal remains distinguishable from successful completion
ok 748 - H6C exact failed terminal remains distinguishable from successful completion
  ---
  duration_ms: 0.8706
  type: 'test'
  ...
# Subtest: H6C exact cancelled terminal remains distinguishable from successful completion
ok 749 - H6C exact cancelled terminal remains distinguishable from successful completion
  ---
  duration_ms: 1.3471
  type: 'test'
  ...
# Subtest: H6C conflict correlation is rejected when the same observed conflict is ambiguous across authority cycles
ok 750 - H6C conflict correlation is rejected when the same observed conflict is ambiguous across authority cycles
  ---
  duration_ms: 1.2628
  type: 'test'
  ...
# Subtest: LAT-05 validates managed root before overlapping independent root discovery and domain listings
ok 751 - LAT-05 validates managed root before overlapping independent root discovery and domain listings
  ---
  duration_ms: 55.7787
  type: 'test'
  ...
# Subtest: LAT-05 domain-root validation remains fail-closed for missing, duplicate, unmarked, trashed, and ambiguous roots
ok 752 - LAT-05 domain-root validation remains fail-closed for missing, duplicate, unmarked, trashed, and ambiguous roots
  ---
  duration_ms: 9.8327
  type: 'test'
  ...
# Subtest: LAT-05 interruption in either domain stays partial and merged duplicate identity/path stays fail-closed
ok 753 - LAT-05 interruption in either domain stays partial and merged duplicate identity/path stays fail-closed
  ---
  duration_ms: 8.0113
  type: 'test'
  ...
# Subtest: LAT-05 reuses exact parent metadata only inside one provenance assembly
ok 754 - LAT-05 reuses exact parent metadata only inside one provenance assembly
  ---
  duration_ms: 6.0746
  type: 'test'
  ...
# Subtest: LAT-05 trusted cursor stays incremental; conflicting or missing cursor state falls back full
ok 755 - LAT-05 trusted cursor stays incremental; conflicting or missing cursor state falls back full
  ---
  duration_ms: 4.7528
  type: 'test'
  ...
# Subtest: LAT-05 leaves native reliable Changes cursor failure classification unchanged
ok 756 - LAT-05 leaves native reliable Changes cursor failure classification unchanged
  ---
  duration_ms: 2.9727
  type: 'test'
  ...
# Subtest: LAT-01 measurement foundation captures bounded overlap of independent local observations
ok 757 - LAT-01 measurement foundation captures bounded overlap of independent local observations
  ---
  duration_ms: 12.6801
  type: 'test'
  ...
# Subtest: LAT-01 measurement foundation captures run-scoped read-only local evidence reuse
ok 758 - LAT-01 measurement foundation captures run-scoped read-only local evidence reuse
  ---
  duration_ms: 4.1201
  type: 'test'
  ...
# Subtest: LAT-01 full planning measures managed-root, BASE, cursor, reconciliation calls and LOCAL/REMOTE overlap
ok 759 - LAT-01 full planning measures managed-root, BASE, cursor, reconciliation calls and LOCAL/REMOTE overlap
  ---
  duration_ms: 2.8205
  type: 'test'
  ...
# Subtest: LAT-01 incremental planning measures one terminal Changes traversal without falling back to reconciliation listing
ok 760 - LAT-01 incremental planning measures one terminal Changes traversal without falling back to reconciliation listing
  ---
  duration_ms: 2.8062
  type: 'test'
  ...
# Subtest: LAT-01 measurement foundation records integrated authority-load deduplication before physical mutation
ok 761 - LAT-01 measurement foundation records integrated authority-load deduplication before physical mutation
  ---
  duration_ms: 8.7745
  type: 'test'
  ...
# Subtest: LAT-01 stale final authorization prevents physical mutation
ok 762 - LAT-01 stale final authorization prevents physical mutation
  ---
  duration_ms: 0.5448
  type: 'test'
  ...
# Subtest: LOG-02 success trace has one stable request identity, run correlation, status, provider ID, and bounded latency
ok 763 - LOG-02 success trace has one stable request identity, run correlation, status, provider ID, and bounded latency
  ---
  duration_ms: 50.8013
  type: 'test'
  ...
# Subtest: LOG-02 safe endpoint classes cover repository Drive transport shapes without retaining identifiers or query values
ok 764 - LOG-02 safe endpoint classes cover repository Drive transport shapes without retaining identifiers or query values
  ---
  duration_ms: 10.1465
  type: 'test'
  ...
# Subtest: LOG-02 retries 5xx and network failures with one requestId, increasing attempts, and unchanged computed delays
ok 765 - LOG-02 retries 5xx and network failures with one requestId, increasing attempts, and unchanged computed delays
  ---
  duration_ms: 5.8078
  type: 'test'
  ...
# Subtest: LOG-02 preserves Retry-After timing and records the exact chosen retry delay
ok 766 - LOG-02 preserves Retry-After timing and records the exact chosen retry delay
  ---
  duration_ms: 3.2295
  type: 'test'
  ...
# Subtest: LOG-02 observes 401 access-token invalidation and safe replay without disclosing token material
ok 767 - LOG-02 observes 401 access-token invalidation and safe replay without disclosing token material
  ---
  duration_ms: 4.1067
  type: 'test'
  ...
# Subtest: LOG-02 exposes existing terminal Drive classifications without changing returned signals
ok 768 - LOG-02 exposes existing terminal Drive classifications without changing returned signals
  ---
  duration_ms: 19.0749
  type: 'test'
  ...
# Subtest: LOG-02 preserves non-replay-safe POST behavior and records that automatic replay was refused
ok 769 - LOG-02 preserves non-replay-safe POST behavior and records that automatic replay was refused
  ---
  duration_ms: 1.035
  type: 'test'
  ...
# Subtest: LOG-02 excludes raw URL/query, authorization and arbitrary headers, bodies, and token-like provider values
ok 770 - LOG-02 excludes raw URL/query, authorization and arbitrary headers, bodies, and token-like provider values
  ---
  duration_ms: 1.6259
  type: 'test'
  ...
# Subtest: LOG-02 diagnostic sink failure is non-authoritative and cannot change transport success
ok 771 - LOG-02 diagnostic sink failure is non-authoritative and cannot change transport success
  ---
  duration_ms: 1.6666
  type: 'test'
  ...
# Subtest: LOG-03 exposes candidate direct-GET success while pre-retirement path listing omits the candidate without changing the existing branch
ok 772 - LOG-03 exposes candidate direct-GET success while pre-retirement path listing omits the candidate without changing the existing branch
  ---
  duration_ms: 84.703
  type: 'test'
  ...
# Subtest: LOG-03 distinguishes an ambiguous predecessor retirement response from later physical verification
ok 773 - LOG-03 distinguishes an ambiguous predecessor retirement response from later physical verification
  ---
  duration_ms: 34.4557
  type: 'test'
  ...
# Subtest: LOG-03 exposes post-trash exact-ID and logical-path disagreement without changing convergence outcome
ok 774 - LOG-03 exposes post-trash exact-ID and logical-path disagreement without changing convergence outcome
  ---
  duration_ms: 37.7252
  type: 'test'
  ...
# Subtest: LOG-03 distinguishes an independent third occupant and never reaches predecessor retirement
ok 775 - LOG-03 distinguishes an independent third occupant and never reaches predecessor retirement
  ---
  duration_ms: 30.4463
  type: 'test'
  ...
# Subtest: LOG-03 successful immutable-candidate update records causal stages while preserving verified-effect result
ok 776 - LOG-03 successful immutable-candidate update records causal stages while preserving verified-effect result
  ---
  duration_ms: 25.7299
  type: 'test'
  ...
# Subtest: LOG-03 create, move, and trash emit semantic operation events without exposing raw logical names
ok 777 - LOG-03 create, move, and trash emit semantic operation events without exposing raw logical names
  ---
  duration_ms: 9.4759
  type: 'test'
  ...
# Subtest: LOG-03 reconciliation and change-page diagnostics are bounded summaries with no raw entry path, query, or cursor payload
ok 778 - LOG-03 reconciliation and change-page diagnostics are bounded summaries with no raw entry path, query, or cursor payload
  ---
  duration_ms: 6.677
  type: 'test'
  ...
# Subtest: LOG-03 production composition routes the same host DiagnosticLogger through LOG-02, LOG-03, LOG-04, and LOG-05 seams
ok 779 - LOG-03 production composition routes the same host DiagnosticLogger through LOG-02, LOG-03, LOG-04, and LOG-05 seams
  ---
  duration_ms: 1.5371
  type: 'test'
  ...
# Subtest: LOG-06 bundle contains versioned build/runtime, authority, trace, audit, attention, and causal index sections
ok 780 - LOG-06 bundle contains versioned build/runtime, authority, trace, audit, attention, and causal index sections
  ---
  duration_ms: 17.1723
  type: 'test'
  ...
# Subtest: LOG-06 bundle privacy boundary replaces raw paths with pathKey and excludes secrets, free text, cursor values, and arbitrary state payloads
ok 781 - LOG-06 bundle privacy boundary replaces raw paths with pathKey and excludes secrets, free text, cursor values, and arbitrary state payloads
  ---
  duration_ms: 2.789
  type: 'test'
  ...
# Subtest: LOG-06 bundle is deterministic for equivalent fixed-time inputs and export does not clear retained diagnostics
ok 782 - LOG-06 bundle is deterministic for equivalent fixed-time inputs and export does not clear retained diagnostics
  ---
  duration_ms: 4.7433
  type: 'test'
  ...
# Subtest: LOG-06 state, audit, and attention projections are explicitly bounded with truncation evidence
ok 783 - LOG-06 state, audit, and attention projections are explicitly bounded with truncation evidence
  ---
  duration_ms: 64.1433
  type: 'test'
  ...
# Subtest: LOG-06 clipboard helper copies the complete bundle or rejects without mutating the bundle/logger
ok 784 - LOG-06 clipboard helper copies the complete bundle or rejects without mutating the bundle/logger
  ---
  duration_ms: 3.4115
  type: 'test'
  ...
# Subtest: LOG-06 operator wiring is one local clipboard command and runtime bundle collection does not invoke Drive or synchronization
ok 785 - LOG-06 operator wiring is one local clipboard command and runtime bundle collection does not invoke Drive or synchronization
  ---
  duration_ms: 1.4478
  type: 'test'
  ...
# Subtest: LOG07-S1 production controller/executor/Drive composition proves remote-update lifecycle end to end
ok 786 - LOG07-S1 production controller/executor/Drive composition proves remote-update lifecycle end to end
  ---
  duration_ms: 1135.0027
  type: 'test'
  ...
# Subtest: LOG07-S2 candidate direct GET can diverge from path LIST without inventing retirement
ok 787 - LOG07-S2 candidate direct GET can diverge from path LIST without inventing retirement
  ---
  duration_ms: 80.341
  type: 'test'
  ...
# Subtest: LOG07-S3/S4/S5 ambiguous retirement, delayed path visibility, and third-candidate contamination remain distinct
ok 788 - LOG07-S3/S4/S5 ambiguous retirement, delayed path visibility, and third-candidate contamination remain distinct
  ---
  duration_ms: 336.8459
  type: 'test'
  ...
# Subtest: LOG07-S6 repaired production controller exports outstanding-intent recovery lifecycle
ok 789 - LOG07-S6 repaired production controller exports outstanding-intent recovery lifecycle
  ---
  duration_ms: 9.6431
  type: 'test'
  ...
# Subtest: LOG07-S7 remote-change learning advances generation before durable recovery rejects the prior-generation intent
ok 790 - LOG07-S7 remote-change learning advances generation before durable recovery rejects the prior-generation intent
  ---
  duration_ms: 6.1768
  type: 'test'
  ...
# Subtest: LOG07-S8 cancellation is distinct and causes no HTTP dispatch
ok 791 - LOG07-S8 cancellation is distinct and causes no HTTP dispatch
  ---
  duration_ms: 0.8064
  type: 'test'
  ...
# Subtest: LOG07-S9 retry/rate-limit evidence keeps one request ID and distinct attempt decisions
ok 792 - LOG07-S9 retry/rate-limit evidence keeps one request ID and distinct attempt decisions
  ---
  duration_ms: 2.8376
  type: 'test'
  ...
# Subtest: LOG07-S10 diagnostic persistence failure does not change mutation outcome or request sequence
ok 793 - LOG07-S10 diagnostic persistence failure does not change mutation outcome or request sequence
  ---
  duration_ms: 29.1323
  type: 'test'
  ...
# Subtest: LOG07-S11 adversarial private path/content/header-like values do not leak and retention remains bounded
ok 794 - LOG07-S11 adversarial private path/content/header-like values do not leak and retention remains bounded
  ---
  duration_ms: 556.9654
  type: 'test'
  ...
# Subtest: R3-R1 runtime disposal waits for a blocked direct preview and rejects later previews without touching dependencies
ok 795 - R3-R1 runtime disposal waits for a blocked direct preview and rejects later previews without touching dependencies
  ---
  duration_ms: 56.888
  type: 'test'
  ...
# Subtest: R3-R2 runtime disposal waits for direct manual conflict resolution and rejects later resolutions without touching dependencies
ok 796 - R3-R2 runtime disposal waits for direct manual conflict resolution and rejects later resolutions without touching dependencies
  ---
  duration_ms: 3.4036
  type: 'test'
  ...
# Subtest: malformed persisted physical descriptors fail closed during state load
ok 797 - malformed persisted physical descriptors fail closed during state load
  ---
  duration_ms: 6.7544
  type: 'test'
  ...
# Subtest: controller quiescence does not settle while an in-flight run promise remains blocked
ok 798 - controller quiescence does not settle while an in-flight run promise remains blocked
  ---
  duration_ms: 0.4925
  type: 'test'
  ...
# Subtest: runtime teardown stops scheduler and awaits quiescence before resource disposal
ok 799 - runtime teardown stops scheduler and awaits quiescence before resource disposal
  ---
  duration_ms: 1.2301
  type: 'test'
  ...
# Subtest: preview execution has pending guard and finally-reset while failure leaves modal open
ok 800 - preview execution has pending guard and finally-reset while failure leaves modal open
  ---
  duration_ms: 1.3848
  type: 'test'
  ...
# Subtest: foundation Changes contract preserves intermediate and terminal tokens as distinct states
ok 801 - foundation Changes contract preserves intermediate and terminal tokens as distinct states
  ---
  duration_ms: 2.5106
  type: 'test'
  ...
# Subtest: foundation remote path contract never silently collapses duplicate logical paths
ok 802 - foundation remote path contract never silently collapses duplicate logical paths
  ---
  duration_ms: 0.5449
  type: 'test'
  ...
# Subtest: foundation BASE authority is exact and independent of persistence-only writes
ok 803 - foundation BASE authority is exact and independent of persistence-only writes
  ---
  duration_ms: 0.2558
  type: 'test'
  ...
# Subtest: foundation file BASE healing requires canonical SHA-256 equality authority
ok 804 - foundation file BASE healing requires canonical SHA-256 equality authority
  ---
  duration_ms: 0.4512
  type: 'test'
  ...
# Subtest: R1 exact BASE precondition rejects nominal base-trusted for execution
ok 805 - R1 exact BASE precondition rejects nominal base-trusted for execution
  ---
  duration_ms: 0.3532
  type: 'test'
  ...
# Subtest: R1 exact identity precondition rejects nominal identity-unambiguous for execution
ok 806 - R1 exact identity precondition rejects nominal identity-unambiguous for execution
  ---
  duration_ms: 0.2526
  type: 'test'
  ...
# Subtest: foundation restart contract distinguishes pre-dispatch intent from durable dispatch authority
ok 807 - foundation restart contract distinguishes pre-dispatch intent from durable dispatch authority
  ---
  duration_ms: 0.4868
  type: 'test'
  ...
# Subtest: foundation local transaction contract distinguishes create and replace recovery authority
ok 808 - foundation local transaction contract distinguishes create and replace recovery authority
  ---
  duration_ms: 0.3998
  type: 'test'
  ...
# Subtest: foundation local transaction contract exposes restart recovery at every durable swap boundary
ok 809 - foundation local transaction contract exposes restart recovery at every durable swap boundary
  ---
  duration_ms: 0.8497
  type: 'test'
  ...
# Subtest: R2 durable remote move recovery descriptor carries side paths identity and authority
ok 810 - R2 durable remote move recovery descriptor carries side paths identity and authority
  ---
  duration_ms: 0.7171
  type: 'test'
  ...
# Subtest: R2 durable trash recovery descriptor retains destructive authority
ok 811 - R2 durable trash recovery descriptor retains destructive authority
  ---
  duration_ms: 0.5526
  type: 'test'
  ...
# Subtest: R2 clean merge keeps separately recoverable physical effects
ok 812 - R2 clean merge keeps separately recoverable physical effects
  ---
  duration_ms: 0.4387
  type: 'test'
  ...
# Subtest: R3 safe remote move and trash outcomes preserve unknown versus verified effect
ok 813 - R3 safe remote move and trash outcomes preserve unknown versus verified effect
  ---
  duration_ms: 0.1861
  type: 'test'
  ...
# Subtest: R4 concurrent RI allows safe materialization but not ordinary convergence
ok 814 - R4 concurrent RI allows safe materialization but not ordinary convergence
  ---
  duration_ms: 0.4186
  type: 'test'
  ...
# Subtest: R4 true conflict-free remote application requires separate convergence authority
ok 815 - R4 true conflict-free remote application requires separate convergence authority
  ---
  duration_ms: 1.6961
  type: 'test'
  ...
# Subtest: R5 lost response recovery validates exact durable intended upload version rather than current LOCAL
ok 816 - R5 lost response recovery validates exact durable intended upload version rather than current LOCAL
  ---
  duration_ms: 0.363
  type: 'test'
  ...
# Subtest: R6 cache-bypassing integrity reconciliation seam is distinct from ordinary cached read
ok 817 - R6 cache-bypassing integrity reconciliation seam is distinct from ordinary cached read
  ---
  duration_ms: 0.2433
  type: 'test'
  ...
# Subtest: foundation remote ingestion backlog retains unresolved earlier facts across later learned batches
ok 818 - foundation remote ingestion backlog retains unresolved earlier facts across later learned batches
  ---
  duration_ms: 0.498
  type: 'test'
  ...
# Subtest: foundation semantic validation has a fail-closed extensibility code
ok 819 - foundation semantic validation has a fail-closed extensibility code
  ---
  duration_ms: 0.1024
  type: 'test'
  ...
# Subtest: foundation merge resource policy fails closed for unknown and oversized inputs
ok 820 - foundation merge resource policy fails closed for unknown and oversized inputs
  ---
  duration_ms: 0.414
  type: 'test'
  ...
# Subtest: plan presentation groups system paths separately without changing relative order
ok 821 - plan presentation groups system paths separately without changing relative order
  ---
  duration_ms: 2.6084
  type: 'test'
  ...
# Subtest: system group expands only when it contains an actionable operation
ok 822 - system group expands only when it contains an actionable operation
  ---
  duration_ms: 0.4204
  type: 'test'
  ...
# Subtest: C1-R1 reconstruction bypasses durable recovery only while persisted canonical state is recovery-required
ok 823 - C1-R1 reconstruction bypasses durable recovery only while persisted canonical state is recovery-required
  ---
  duration_ms: 31.9042
  type: 'test'
  ...
# Subtest: C1 absent new-installation state previews first-sync safe union without persistence, then initializes authority before mutation
ok 824 - C1 absent new-installation state previews first-sync safe union without persistence, then initializes authority before mutation
  ---
  duration_ms: 40.1031
  type: 'test'
  ...
# Subtest: C1-R1 recovery-required reconstruction reaches reviewed planning without preview-time authority recovery or state replacement
ok 825 - C1-R1 recovery-required reconstruction reaches reviewed planning without preview-time authority recovery or state replacement
  ---
  duration_ms: 1.92
  type: 'test'
  ...
# Subtest: C1 existing trusted authority planning still invokes durable-intent recovery
ok 826 - C1 existing trusted authority planning still invokes durable-intent recovery
  ---
  duration_ms: 3.7194
  type: 'test'
  ...
# Subtest: VH23 H7 registers C03-C09 exactly once in deterministic suite order
ok 827 - VH23 H7 registers C03-C09 exactly once in deterministic suite order
  ---
  duration_ms: 3.5341
  type: 'test'
  ...
# Subtest: VH23 H7 rejects duplicate or incomplete C-series registrations
ok 828 - VH23 H7 rejects duplicate or incomplete C-series registrations
  ---
  duration_ms: 1.173
  type: 'test'
  ...
# Subtest: VH23 H7 routes non-fixed module delegates only to the active scenario
ok 829 - VH23 H7 routes non-fixed module delegates only to the active scenario
  ---
  duration_ms: 1.3093
  type: 'test'
  ...
# Subtest: VH23 H7 routes prerequisite evaluation by scenario without bleed
ok 830 - VH23 H7 routes prerequisite evaluation by scenario without bleed
  ---
  duration_ms: 0.7289
  type: 'test'
  ...
# Subtest: VH23 H7 cannot replace fixed production or plan-assertion bindings
ok 831 - VH23 H7 cannot replace fixed production or plan-assertion bindings
  ---
  duration_ms: 0.5354
  type: 'test'
  ...
# Subtest: VH16 correction C03 is declarative over fixed H6B preview/assert/execute operations
ok 832 - VH16 correction C03 is declarative over fixed H6B preview/assert/execute operations
  ---
  duration_ms: 4.3843
  type: 'test'
  ...
# Subtest: VH16 correction C03 success runs both exact plans through the real repaired ValidationModeRuntime handoff
ok 833 - VH16 correction C03 success runs both exact plans through the real repaired ValidationModeRuntime handoff
  ---
  duration_ms: 24.2415
  type: 'test'
  ...
# Subtest: VH16 correction C03 unexpected Windows plan fails in the fixed assertion step before Windows execution
ok 834 - VH16 correction C03 unexpected Windows plan fails in the fixed assertion step before Windows execution
  ---
  duration_ms: 3.449
  type: 'test'
  ...
# Subtest: VH16 correction C03 execution cannot proceed when its fixed assertion-derived authorization is absent
ok 835 - VH16 correction C03 execution cannot proceed when its fixed assertion-derived authorization is absent
  ---
  duration_ms: 2.249
  type: 'test'
  ...
# Subtest: VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles
ok 836 - VH17 correction C04 succeeds through repaired H6B preview/assert/authorization/execution cycles
  ---
  duration_ms: 27.0766
  type: 'test'
  ...
# Subtest: VH17 correction C04 unexpected move plan fails in fixed assertion before execution
ok 837 - VH17 correction C04 unexpected move plan fails in fixed assertion before execution
  ---
  duration_ms: 7.4364
  type: 'test'
  ...
# Subtest: VH17 correction C04 rejects delete/create substitution and never executes substituted plan
ok 838 - VH17 correction C04 rejects delete/create substitution and never executes substituted plan
  ---
  duration_ms: 6.8388
  type: 'test'
  ...
# Subtest: VH18 correction registers C05 one-to-one and expresses both fixed authority cycles without caller authorization
ok 839 - VH18 correction registers C05 one-to-one and expresses both fixed authority cycles without caller authorization
  ---
  duration_ms: 3.4962
  type: 'test'
  ...
# Subtest: VH18 correction C05 runs destructive preview/assert/authorization/execution only through ValidationModeRuntime and retains exact-object/tombstone assertions
ok 840 - VH18 correction C05 runs destructive preview/assert/authorization/execution only through ValidationModeRuntime and retains exact-object/tombstone assertions
  ---
  duration_ms: 13.2749
  type: 'test'
  ...
# Subtest: VH18 correction unsafe additional destructive plan fails in the fixed assertion step before physical execution
ok 841 - VH18 correction unsafe additional destructive plan fails in the fixed assertion step before physical execution
  ---
  duration_ms: 2.0776
  type: 'test'
  ...
# Subtest: VH18 correction plan expectations bind the exact remote object and reject a same-path destructive plan for the wrong Drive identity
ok 842 - VH18 correction plan expectations bind the exact remote object and reject a same-path destructive plan for the wrong Drive identity
  ---
  duration_ms: 3.5412
  type: 'test'
  ...
# Subtest: VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles
ok 843 - VH19 C06 correction registers and executes through actual H6B runtime fixed preview/assert/execute cycles
  ---
  duration_ms: 16.0005
  type: 'test'
  ...
# Subtest: VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution
ok 844 - VH19 C06 correction hard-stops a duplicate remote proof before mobile preview or execution
  ---
  duration_ms: 3.1701
  type: 'test'
  ...
# Subtest: VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution
ok 845 - VH19 C06 correction fixed H6B assertion rejects unexpected mobile plan before mobile execution
  ---
  duration_ms: 2.4578
  type: 'test'
  ...
# Subtest: VH20 C07 uses real H6B fixed plan handoff for trusted baseline, Windows update, mobile download-update, and exact convergence
ok 846 - VH20 C07 uses real H6B fixed plan handoff for trusted baseline, Windows update, mobile download-update, and exact convergence
  ---
  duration_ms: 21.1202
  type: 'test'
  ...
# Subtest: VH20 C07 unexpected production plan hard-stops in the fixed H6B assertion before any production execution
ok 847 - VH20 C07 unexpected production plan hard-stops in the fixed H6B assertion before any production execution
  ---
  duration_ms: 2.4557
  type: 'test'
  ...
# Subtest: VH20 C07 stale same-cycle re-preview invalidates assertion-derived authorization and hard-stops before execution
ok 848 - VH20 C07 stale same-cycle re-preview invalidates assertion-derived authorization and hard-stops before execution
  ---
  duration_ms: 3.3833
  type: 'test'
  ...
# Subtest: VH20 C07 package keeps the authoritative logical fixture name and C07-only module ownership
ok 849 - VH20 C07 package keeps the authoritative logical fixture name and C07-only module ownership
  ---
  duration_ms: 0.7009
  type: 'test'
  ...
# Subtest: VH21 C08 registers one-to-one and uses four explicit repaired-H6B authority cycles without caller authorization
ok 850 - VH21 C08 registers one-to-one and uses four explicit repaired-H6B authority cycles without caller authorization
  ---
  duration_ms: 2.4372
  type: 'test'
  ...
# Subtest: VH21 C08 deterministically preserves Drive identity, old-path absence, bytes, and unrelated guard through the real H6B route
ok 851 - VH21 C08 deterministically preserves Drive identity, old-path absence, bytes, and unrelated guard through the real H6B route
  ---
  duration_ms: 25.4215
  type: 'test'
  ...
# Subtest: VH21 C08 rejects delete/create substitution before production execution
ok 852 - VH21 C08 rejects delete/create substitution before production execution
  ---
  duration_ms: 6.9142
  type: 'test'
  ...
# Subtest: VH21 C08 hard-stops an unexpected move-plan mutation before production execution
ok 853 - VH21 C08 hard-stops an unexpected move-plan mutation before production execution
  ---
  duration_ms: 5.9282
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 reconstructs full C08 lineage before exact-object Windows and mobile deletion
ok 854 - VH22 C09 correction 02 reconstructs full C08 lineage before exact-object Windows and mobile deletion
  ---
  duration_ms: 26.774
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 cannot fake starting lineage: completed setup plans and mapping IDs still cannot unlock delete when objective C08-equivalent verification blocks
ok 855 - VH22 C09 correction 02 cannot fake starting lineage: completed setup plans and mapping IDs still cannot unlock delete when objective C08-equivalent verification blocks
  ---
  duration_ms: 8.0005
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 fixed assertion rejects wrong exact Drive object before Windows production trash execution
ok 856 - VH22 C09 correction 02 fixed assertion rejects wrong exact Drive object before Windows production trash execution
  ---
  duration_ms: 8.6504
  type: 'test'
  ...
# Subtest: VH22 C09 correction 02 fixed assertion hard-stops unexpected destructive mutation before Windows production execution
ok 857 - VH22 C09 correction 02 fixed assertion hard-stops unexpected destructive mutation before Windows production execution
  ---
  duration_ms: 5.4186
  type: 'test'
  ...
# Subtest: VH03 freezes the complete H0 harness version through the validation barrel
ok 858 - VH03 freezes the complete H0 harness version through the validation barrel
  ---
  duration_ms: 1.8385
  type: 'test'
  ...
# Subtest: coordination accepts only a current run/scenario/device/role/step-owner/event message
ok 859 - coordination accepts only a current run/scenario/device/role/step-owner/event message
  ---
  duration_ms: 0.9893
  type: 'test'
  ...
# Subtest: coordination rejects stale and mismatched run/scenario/device messages fail closed
ok 860 - coordination rejects stale and mismatched run/scenario/device messages fail closed
  ---
  duration_ms: 1.2806
  type: 'test'
  ...
# Subtest: coordination enforces device-role, participant-recipient, and step-owner authority
ok 861 - coordination enforces device-role, participant-recipient, and step-owner authority
  ---
  duration_ms: 0.4202
  type: 'test'
  ...
# Subtest: coordination rejects stale step, unexpected event, and terminal-state traffic
ok 862 - coordination rejects stale step, unexpected event, and terminal-state traffic
  ---
  duration_ms: 0.3507
  type: 'test'
  ...
# Subtest: terminal coordination message and state semantics are structurally discriminated
ok 863 - terminal coordination message and state semantics are structurally discriminated
  ---
  duration_ms: 0.4508
  type: 'test'
  ...
# Subtest: canonical evidence is run/scenario/device bound and structurally privacy-safe
ok 864 - canonical evidence is run/scenario/device bound and structurally privacy-safe
  ---
  duration_ms: 0.2927
  type: 'test'
  ...
# Subtest: PASS FAIL BLOCKED and PAUSED verdicts carry statically non-confusable semantics
ok 865 - PASS FAIL BLOCKED and PAUSED verdicts carry statically non-confusable semantics
  ---
  duration_ms: 2.0602
  type: 'test'
  ...
# Subtest: VH12 coordinates a deterministic Windows-to-mobile-to-Windows handoff under explicit local transition authority
ok 866 - VH12 coordinates a deterministic Windows-to-mobile-to-Windows handoff under explicit local transition authority
  ---
  duration_ms: 3.9991
  type: 'test'
  ...
# Subtest: VH12 rejects a valid current message carrying an unauthorized next step without mutating local state
ok 867 - VH12 rejects a valid current message carrying an unauthorized next step without mutating local state
  ---
  duration_ms: 0.559
  type: 'test'
  ...
# Subtest: VH12 rejects unauthorized successor ownership transfer
ok 868 - VH12 rejects unauthorized successor ownership transfer
  ---
  duration_ms: 0.4534
  type: 'test'
  ...
# Subtest: VH12 rejects unauthorized successor expected-next-event selection
ok 869 - VH12 rejects unauthorized successor expected-next-event selection
  ---
  duration_ms: 0.5227
  type: 'test'
  ...
# Subtest: VH12 generic invariant forbids nonterminal messages from manufacturing terminal outcomes even if local policy is wrong
ok 870 - VH12 generic invariant forbids nonterminal messages from manufacturing terminal outcomes even if local policy is wrong
  ---
  duration_ms: 0.5512
  type: 'test'
  ...
# Subtest: VH12 terminal message disposition and classification must agree with the successor independently of scenario policy
ok 871 - VH12 terminal message disposition and classification must agree with the successor independently of scenario policy
  ---
  duration_ms: 0.8401
  type: 'test'
  ...
# Subtest: VH12 send path refuses a successor rejected by its own local transition authority
ok 872 - VH12 send path refuses a successor rejected by its own local transition authority
  ---
  duration_ms: 2.0408
  type: 'test'
  ...
# Subtest: VH12 rejects duplicate/stale messages after first acceptance
ok 873 - VH12 rejects duplicate/stale messages after first acceptance
  ---
  duration_ms: 0.6322
  type: 'test'
  ...
# Subtest: VH12 tolerates a delayed or suspended participant by replaying durable run-scoped records
ok 874 - VH12 tolerates a delayed or suspended participant by replaying durable run-scoped records
  ---
  duration_ms: 0.7894
  type: 'test'
  ...
# Subtest: VH12 requires distinct physical installation identities and correct role binding
ok 875 - VH12 requires distinct physical installation identities and correct role binding
  ---
  duration_ms: 0.7759
  type: 'test'
  ...
# Subtest: VH12 fails closed on mismatched run and scenario identity
ok 876 - VH12 fails closed on mismatched run and scenario identity
  ---
  duration_ms: 0.5441
  type: 'test'
  ...
# Subtest: VH12 Drive transport creates validation control outside the managed vault namespace
ok 877 - VH12 Drive transport creates validation control outside the managed vault namespace
  ---
  duration_ms: 37.8271
  type: 'test'
  ...
# Subtest: VH02 driver requests are bounded to production-path orchestration actions
ok 878 - VH02 driver requests are bounded to production-path orchestration actions
  ---
  duration_ms: 2.1512
  type: 'test'
  ...
# Subtest: plan expectations reject a kind that is simultaneously allowed background and forbidden
ok 879 - plan expectations reject a kind that is simultaneously allowed background and forbidden
  ---
  duration_ms: 0.8962
  type: 'test'
  ...
# Subtest: plan mismatch is structurally fail-closed and cannot carry execution authorization
ok 880 - plan mismatch is structurally fail-closed and cannot carry execution authorization
  ---
  duration_ms: 0.3853
  type: 'test'
  ...
# Subtest: fault specifications freeze approved deterministic fault classes and exact boundaries
ok 881 - fault specifications freeze approved deterministic fault classes and exact boundaries
  ---
  duration_ms: 0.3608
  type: 'test'
  ...
# Subtest: post-dispatch fault results preserve physical uncertainty rather than manufacturing certainty
ok 882 - post-dispatch fault results preserve physical uncertainty rather than manufacturing certainty
  ---
  duration_ms: 0.2007
  type: 'test'
  ...
# Subtest: state and convergence vocabularies remain separate
ok 883 - state and convergence vocabularies remain separate
  ---
  duration_ms: 0.2495
  type: 'test'
  ...
# Subtest: missing required proof becomes BLOCKED and cannot silently produce PASS
ok 884 - missing required proof becomes BLOCKED and cannot silently produce PASS
  ---
  duration_ms: 0.2946
  type: 'test'
  ...
# Subtest: verification result preserves FAIL > BLOCKED > PASS across valid group combinations
ok 885 - verification result preserves FAIL > BLOCKED > PASS across valid group combinations
  ---
  duration_ms: 0.3419
  type: 'test'
  ...
# Subtest: any failed state or convergence assertion dominates BLOCKED and yields FAIL
ok 886 - any failed state or convergence assertion dominates BLOCKED and yields FAIL
  ---
  duration_ms: 0.5054
  type: 'test'
  ...
# Subtest: VH05 text fixtures have deterministic bytes and hashes while versions remain distinguishable
ok 887 - VH05 text fixtures have deterministic bytes and hashes while versions remain distinguishable
  ---
  duration_ms: 8.2335
  type: 'test'
  ...
# Subtest: VH05 binary, empty-folder, exclusion, deletion, and path-collision helpers are explicit and payload-free
ok 888 - VH05 binary, empty-folder, exclusion, deletion, and path-collision helpers are explicit and payload-free
  ---
  duration_ms: 7.8383
  type: 'test'
  ...
# Subtest: VH05 large fixtures are deterministic and generated in bounded chunks
ok 889 - VH05 large fixtures are deterministic and generated in bounded chunks
  ---
  duration_ms: 5.2129
  type: 'test'
  ...
# Subtest: VH05 move, delete, deterministic restore, and cleanup preserve tracked disposable scope
ok 890 - VH05 move, delete, deterministic restore, and cleanup preserve tracked disposable scope
  ---
  duration_ms: 1.8644
  type: 'test'
  ...
# Subtest: VH05 refuses every mutation before local I/O when sandbox ownership is absent or ambiguous
ok 891 - VH05 refuses every mutation before local I/O when sandbox ownership is absent or ambiguous
  ---
  duration_ms: 0.7154
  type: 'test'
  ...
# Subtest: VH05 honors explicit sandbox rejection without mutating the local vault
ok 892 - VH05 honors explicit sandbox rejection without mutating the local vault
  ---
  duration_ms: 0.6571
  type: 'test'
  ...
# Subtest: VH13 restart-safe resume reloads one durable checkpoint and resumes only after observed postcondition and durable adoption
ok 893 - VH13 restart-safe resume reloads one durable checkpoint and resumes only after observed postcondition and durable adoption
  ---
  duration_ms: 7.6796
  type: 'test'
  ...
# Subtest: VH13 verified checkpoint remains durable until resume adoption actually succeeds
ok 894 - VH13 verified checkpoint remains durable until resume adoption actually succeeds
  ---
  duration_ms: 1.0342
  type: 'test'
  ...
# Subtest: VH13 resume-adoption failure leaves the verified checkpoint durably resumable
ok 895 - VH13 resume-adoption failure leaves the verified checkpoint durably resumable
  ---
  duration_ms: 0.8417
  type: 'test'
  ...
# Subtest: VH13 adoption followed by interrupted checkpoint cleanup is restart-safe and idempotently retryable
ok 896 - VH13 adoption followed by interrupted checkpoint cleanup is restart-safe and idempotently retryable
  ---
  duration_ms: 0.7694
  type: 'test'
  ...
# Subtest: VH13 wrong run, checkpoint, or device cannot invoke resume adoption
ok 897 - VH13 wrong run, checkpoint, or device cannot invoke resume adoption
  ---
  duration_ms: 0.5658
  type: 'test'
  ...
# Subtest: VH13 permits exactly one active external action checkpoint
ok 898 - VH13 permits exactly one active external action checkpoint
  ---
  duration_ms: 0.3385
  type: 'test'
  ...
# Subtest: VH13 rejects duplicate acknowledgement without advancing durable state twice
ok 899 - VH13 rejects duplicate acknowledgement without advancing durable state twice
  ---
  duration_ms: 0.7092
  type: 'test'
  ...
# Subtest: VH13 mobile device switching is allowed only at an unacknowledged durable boundary
ok 900 - VH13 mobile device switching is allowed only at an unacknowledged durable boundary
  ---
  duration_ms: 1.5974
  type: 'test'
  ...
# Subtest: VH13 ambiguity, probe failure, and timeout remain safely paused
ok 901 - VH13 ambiguity, probe failure, and timeout remain safely paused
  ---
  duration_ms: 1.1639
  type: 'test'
  ...
# Subtest: VH13 uninstall and reinstall checkpoints require external coordination persistence
ok 902 - VH13 uninstall and reinstall checkpoints require external coordination persistence
  ---
  duration_ms: 1.1532
  type: 'test'
  ...
# Subtest: VH13 persisted records contain only fixed non-secret checkpoint/run metadata
ok 903 - VH13 persisted records contain only fixed non-secret checkpoint/run metadata
  ---
  duration_ms: 0.9178
  type: 'test'
  ...
# Subtest: VH13 corrupted durable checkpoint state is never treated as empty or resumable
ok 904 - VH13 corrupted durable checkpoint state is never treated as empty or resumable
  ---
  duration_ms: 0.2499
  type: 'test'
  ...
# Subtest: VH13 concurrent stale writes fail closed through revision CAS
ok 905 - VH13 concurrent stale writes fail closed through revision CAS
  ---
  duration_ms: 0.4488
  type: 'test'
  ...
# Subtest: VH15 classifies validation device platforms deterministically
ok 906 - VH15 classifies validation device platforms deterministically
  ---
  duration_ms: 1.3131
  type: 'test'
  ...
# Subtest: VH15 validation mode is disabled by default and cannot touch production or durable harness state
ok 907 - VH15 validation mode is disabled by default and cannot touch production or durable harness state
  ---
  duration_ms: 1.6509
  type: 'test'
  ...
# Subtest: VH15 local canary reaches the real production-path driver only after explicit activation
ok 908 - VH15 local canary reaches the real production-path driver only after explicit activation
  ---
  duration_ms: 7.3767
  type: 'test'
  ...
# Subtest: VH15 unbound sandbox/fault authority fails closed and disabling drops all harness controls
ok 909 - VH15 unbound sandbox/fault authority fails closed and disabling drops all harness controls
  ---
  duration_ms: 1.2265
  type: 'test'
  ...
# Subtest: VH15 validation wrapper does not replace or intercept the ordinary production controller
ok 910 - VH15 validation wrapper does not replace or intercept the ordinary production controller
  ---
  duration_ms: 0.4897
  type: 'test'
  ...
# Subtest: VH15-R2 T1/T2 exact preview handoff reaches assertion and fixed execution with the observed plan ID
ok 911 - VH15-R2 T1/T2 exact preview handoff reaches assertion and fixed execution with the observed plan ID
  ---
  duration_ms: 13.5347
  type: 'test'
  ...
# Subtest: VH15-R2 T3 plan mismatch hard-stops before production execution
ok 912 - VH15-R2 T3 plan mismatch hard-stops before production execution
  ---
  duration_ms: 1.6248
  type: 'test'
  ...
# Subtest: VH15-R2 T4 execution without successful assertion fails closed
ok 913 - VH15-R2 T4 execution without successful assertion fails closed
  ---
  duration_ms: 0.6739
  type: 'test'
  ...
# Subtest: VH15-R2 T5 a newer preview invalidates prior authorization for the same cycle
ok 914 - VH15-R2 T5 a newer preview invalidates prior authorization for the same cycle
  ---
  duration_ms: 1.5144
  type: 'test'
  ...
# Subtest: VH15-R2 T6 retained authority for run A cannot be consumed by run B
ok 915 - VH15-R2 T6 retained authority for run A cannot be consumed by run B
  ---
  duration_ms: 2.7558
  type: 'test'
  ...
# Subtest: VH15-R2 T7 two independent cycles in one run execute only their own asserted plans
ok 916 - VH15-R2 T7 two independent cycles in one run execute only their own asserted plans
  ---
  duration_ms: 2.5146
  type: 'test'
  ...
# Subtest: VH15-R2 T8 composition recreation drops handoff authority and resumed execution fails closed
ok 917 - VH15-R2 T8 composition recreation drops handoff authority and resumed execution fails closed
  ---
  duration_ms: 4.2069
  type: 'test'
  ...
# Subtest: H6B runtime delegates resolve-observed-conflict through the fixed production path using observed identity
ok 918 - H6B runtime delegates resolve-observed-conflict through the fixed production path using observed identity
  ---
  duration_ms: 2.4389
  type: 'test'
  ...
# Subtest: H6B runtime preserves production resolve-conflict rejection as BLOCKED
ok 919 - H6B runtime preserves production resolve-conflict rejection as BLOCKED
  ---
  duration_ms: 1.6642
  type: 'test'
  ...
# Subtest: H6B runtime rejects caller conflictId and malformed path, conflict kind, or resolution before production resolution
ok 920 - H6B runtime rejects caller conflictId and malformed path, conflict kind, or resolution before production resolution
  ---
  duration_ms: 4.1528
  type: 'test'
  ...
# Subtest: VH15-R2 T9 production-path-driver remains non-overridable
ok 921 - VH15-R2 T9 production-path-driver remains non-overridable
  ---
  duration_ms: 1.5775
  type: 'test'
  ...
# Subtest: VH15-R2 T10 default-off isolation and platform classification remain intact
ok 922 - VH15-R2 T10 default-off isolation and platform classification remain intact
  ---
  duration_ms: 0.669
  type: 'test'
  ...
# Subtest: H6C runtime blocks an accepted execute request until the exact production terminal event exists
ok 923 - H6C runtime blocks an accepted execute request until the exact production terminal event exists
  ---
  duration_ms: 1.6946
  type: 'test'
  ...
# Subtest: H6C runtime distinguishes exact failed and cancelled terminals from successful completion
ok 924 - H6C runtime distinguishes exact failed and cancelled terminals from successful completion
  ---
  duration_ms: 4.0666
  type: 'test'
  ...
# Subtest: VH07 exact expected production plan match authorizes only the observed plan ID
ok 925 - VH07 exact expected production plan match authorizes only the observed plan ID
  ---
  duration_ms: 2.5961
  type: 'test'
  ...
# Subtest: VH07 permits only explicitly allowed nondestructive background no-ops
ok 926 - VH07 permits only explicitly allowed nondestructive background no-ops
  ---
  duration_ms: 0.4928
  type: 'test'
  ...
# Subtest: VH07 rejects an unrelated mutation even when the expected operation is present
ok 927 - VH07 rejects an unrelated mutation even when the expected operation is present
  ---
  duration_ms: 0.5017
  type: 'test'
  ...
# Subtest: VH07 rejects a move whose path or stable remote identity differs from the scenario contract
ok 928 - VH07 rejects a move whose path or stable remote identity differs from the scenario contract
  ---
  duration_ms: 0.5713
  type: 'test'
  ...
# Subtest: VH07 hard-stops an unexpected conflict
ok 929 - VH07 hard-stops an unexpected conflict
  ---
  duration_ms: 0.2354
  type: 'test'
  ...
# Subtest: VH07 hard-stops an unexpected destructive operation
ok 930 - VH07 hard-stops an unexpected destructive operation
  ---
  duration_ms: 0.3216
  type: 'test'
  ...
# Subtest: VH07 hard-stops unexpected recovery and blocked operation states
ok 931 - VH07 hard-stops unexpected recovery and blocked operation states
  ---
  duration_ms: 0.5951
  type: 'test'
  ...
# Subtest: VH07 accepts explicitly expected recovery state and review disposition
ok 932 - VH07 accepts explicitly expected recovery state and review disposition
  ---
  duration_ms: 0.3124
  type: 'test'
  ...
# Subtest: VH07 fails closed when runtime plan content contains an unknown operation kind
ok 933 - VH07 fails closed when runtime plan content contains an unknown operation kind
  ---
  duration_ms: 0.5036
  type: 'test'
  ...
# Subtest: VH06 driver delegates planning, Verify/Reconcile, automatic sync, cancellation, status, and lifecycle observation to production seams
ok 934 - VH06 driver delegates planning, Verify/Reconcile, automatic sync, cancellation, status, and lifecycle observation to production seams
  ---
  duration_ms: 4.6312
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict delegates only the exact production conflict observed for the same run
ok 935 - H6B resolve-observed-conflict delegates only the exact production conflict observed for the same run
  ---
  duration_ms: 2.3556
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict fails closed for wrong run, path, kind, ambiguity, and stale current surface
ok 936 - H6B resolve-observed-conflict fails closed for wrong run, path, kind, ambiguity, and stale current surface
  ---
  duration_ms: 1.4655
  type: 'test'
  ...
# Subtest: H6B resolve-observed-conflict preserves production rejection and never converts request acceptance into convergence proof
ok 937 - H6B resolve-observed-conflict preserves production rejection and never converts request acceptance into convergence proof
  ---
  duration_ms: 0.507
  type: 'test'
  ...
# Subtest: VH06 asserted execution is run-bound, must reference a plan observed by the driver, and never manufactures production success
ok 938 - VH06 asserted execution is run-bound, must reference a plan observed by the driver, and never manufactures production success
  ---
  duration_ms: 0.7847
  type: 'test'
  ...
# Subtest: VH06 preserves production rejection and failure instead of converting either into success
ok 939 - VH06 preserves production rejection and failure instead of converting either into success
  ---
  duration_ms: 0.6511
  type: 'test'
  ...
# Subtest: VH06 delegates a reviewed manual plan through the real ProductController authoritative execute-plan path
ok 940 - VH06 delegates a reviewed manual plan through the real ProductController authoritative execute-plan path
  ---
  duration_ms: 15.6326
  type: 'test'
  ...
# Subtest: VH01 freezes exactly the C03-F03 harness scenario IDs in execution order
ok 941 - VH01 freezes exactly the C03-F03 harness scenario IDs in execution order
  ---
  duration_ms: 2.1701
  type: 'test'
  ...
# Subtest: validation run and device identities reject blank or unsupported representations
ok 942 - validation run and device identities reject blank or unsupported representations
  ---
  duration_ms: 0.8625
  type: 'test'
  ...
# Subtest: human-checkpoint vocabulary is bounded to the approved external action classes
ok 943 - human-checkpoint vocabulary is bounded to the approved external action classes
  ---
  duration_ms: 0.3082
  type: 'test'
  ...
# Subtest: checkpoint resume vocabulary distinguishes human action, verification, and safe resumability
ok 944 - checkpoint resume vocabulary distinguishes human action, verification, and safe resumability
  ---
  duration_ms: 0.2572
  type: 'test'
  ...
# Subtest: fixture identity stays bound to exactly one validation run and scenario
ok 945 - fixture identity stays bound to exactly one validation run and scenario
  ---
  duration_ms: 0.2571
  type: 'test'
  ...
# Subtest: sandbox ownership can represent only approved disposable validation surfaces
ok 946 - sandbox ownership can represent only approved disposable validation surfaces
  ---
  duration_ms: 1.4994
  type: 'test'
  ...
# Subtest: sandbox authorization vocabulary preserves fail-closed rejection reasons
ok 947 - sandbox authorization vocabulary preserves fail-closed rejection reasons
  ---
  duration_ms: 0.4274
  type: 'test'
  ...
# Subtest: VH04 issues run-scoped ownership only inside configured disposable validation surfaces
ok 948 - VH04 issues run-scoped ownership only inside configured disposable validation surfaces
  ---
  duration_ms: 3.1295
  type: 'test'
  ...
# Subtest: VH04 refuses unrelated vault content, external BRAIN assets, credentials, and primary state
ok 949 - VH04 refuses unrelated vault content, external BRAIN assets, credentials, and primary state
  ---
  duration_ms: 2.2164
  type: 'test'
  ...
# Subtest: VH04 rejects root ownership, traversal, and overlapping sandbox namespaces
ok 950 - VH04 rejects root ownership, traversal, and overlapping sandbox namespaces
  ---
  duration_ms: 0.9284
  type: 'test'
  ...
# Subtest: VH04 cleanup requires issued provenance and a recorded created state
ok 951 - VH04 cleanup requires issued provenance and a recorded created state
  ---
  duration_ms: 0.8066
  type: 'test'
  ...
# Subtest: VH04 rejects run mismatch and scenario mismatch for otherwise valid ownership
ok 952 - VH04 rejects run mismatch and scenario mismatch for otherwise valid ownership
  ---
  duration_ms: 0.3011
  type: 'test'
  ...
# Subtest: VH04 fails closed when restored provenance makes ownership ambiguous
ok 953 - VH04 fails closed when restored provenance makes ownership ambiguous
  ---
  duration_ms: 0.5808
  type: 'test'
  ...
# Subtest: VH04 retains removed-resource provenance across snapshots without restoring cleanup authority
ok 954 - VH04 retains removed-resource provenance across snapshots without restoring cleanup authority
  ---
  duration_ms: 0.5972
  type: 'test'
  ...
# Subtest: VH09 emits deterministic privacy-safe machine and human scenario evidence
ok 955 - VH09 emits deterministic privacy-safe machine and human scenario evidence
  ---
  duration_ms: 16.7754
  type: 'test'
  ...
# Subtest: canonical serialization sorts object keys without changing array order
ok 956 - canonical serialization sorts object keys without changing array order
  ---
  duration_ms: 0.2037
  type: 'test'
  ...
# Subtest: missing declared mandatory evidence cannot be emitted as PASS
ok 957 - missing declared mandatory evidence cannot be emitted as PASS
  ---
  duration_ms: 1.9392
  type: 'test'
  ...
# Subtest: failed assertions force FAIL even when PASS was requested
ok 958 - failed assertions force FAIL even when PASS was requested
  ---
  duration_ms: 1.3984
  type: 'test'
  ...
# Subtest: not-observable assertions force BLOCKED instead of false PASS
ok 959 - not-observable assertions force BLOCKED instead of false PASS
  ---
  duration_ms: 1.0965
  type: 'test'
  ...
# Subtest: sensitive-looking correlation metadata is sanitized before serialization
ok 960 - sensitive-looking correlation metadata is sanitized before serialization
  ---
  duration_ms: 1.4184
  type: 'test'
  ...
# Subtest: fixture hashes and numeric evidence are validated fail closed
ok 961 - fixture hashes and numeric evidence are validated fail closed
  ---
  duration_ms: 1.253
  type: 'test'
  ...
# Subtest: suite aggregation is deterministic, verifies scenario integrity, and counts verdicts
ok 962 - suite aggregation is deterministic, verifies scenario integrity, and counts verdicts
  ---
  duration_ms: 17.8863
  type: 'test'
  ...
# Subtest: PAUSED requires an explicit resume step and primary device must be a participant
ok 963 - PAUSED requires an explicit resume step and primary device must be a participant
  ---
  duration_ms: 2.8541
  type: 'test'
  ...
# Subtest: VH14-E publishes one reusable contract case for each required canary capability
ok 964 - VH14-E publishes one reusable contract case for each required canary capability
  ---
  duration_ms: 2.0111
  type: 'test'
  ...
# Subtest: VH14-E module fake accepts only explicitly scripted orchestration results
ok 965 - VH14-E module fake accepts only explicitly scripted orchestration results
  ---
  duration_ms: 1.2943
  type: 'test'
  ...
# Subtest: VH14-E durable fake adopts the exact VH13 tuple before exposing the resume step
ok 966 - VH14-E durable fake adopts the exact VH13 tuple before exposing the resume step
  ---
  duration_ms: 1.1211
  type: 'test'
  ...
# Subtest: VH14-A runner scenario enumeration reuses the exact frozen H0 C03-F03 tuple
ok 967 - VH14-A runner scenario enumeration reuses the exact frozen H0 C03-F03 tuple
  ---
  duration_ms: 2.4782
  type: 'test'
  ...
# Subtest: VH14-A freezes only approved module identities, completion proofs, prerequisites, and stop reasons
ok 968 - VH14-A freezes only approved module identities, completion proofs, prerequisites, and stop reasons
  ---
  duration_ms: 0.6284
  type: 'test'
  ...
# Subtest: VH14-A durable state uses revision CAS and implements the exact VH13 resume-adoption port
ok 969 - VH14-A durable state uses revision CAS and implements the exact VH13 resume-adoption port
  ---
  duration_ms: 0.8461
  type: 'test'
  ...
# Subtest: VH14-A composition seams support all runner outcomes without granting module behavior
ok 970 - VH14-A composition seams support all runner outcomes without granting module behavior
  ---
  duration_ms: 0.6943
  type: 'test'
  ...
# Subtest: VH14-B enumerates the exact frozen C03-F03 tuple
ok 971 - VH14-B enumerates the exact frozen C03-F03 tuple
  ---
  duration_ms: 2.3467
  type: 'test'
  ...
# Subtest: VH14-B deterministically advances one scenario and preserves identity until proven PASS
ok 972 - VH14-B deterministically advances one scenario and preserves identity until proven PASS
  ---
  duration_ms: 2.6449
  type: 'test'
  ...
# Subtest: VH14-B reconstructs deterministic advancement from durable state plus an immutable definition catalog
ok 973 - VH14-B reconstructs deterministic advancement from durable state plus an immutable definition catalog
  ---
  duration_ms: 1.1548
  type: 'test'
  ...
# Subtest: VH14-B recovers exact single and suite pending cursors after rev1 interruption
ok 974 - VH14-B recovers exact single and suite pending cursors after rev1 interruption
  ---
  duration_ms: 8.0973
  type: 'test'
  ...
# Subtest: VH14-B fails closed on incomplete prerequisites without invoking a step
ok 975 - VH14-B fails closed on incomplete prerequisites without invoking a step
  ---
  duration_ms: 0.9686
  type: 'test'
  ...
# Subtest: VH14-B never manufactures verifier or evidence success
ok 976 - VH14-B never manufactures verifier or evidence success
  ---
  duration_ms: 0.8136
  type: 'test'
  ...
# Subtest: VH14-B advances ordered suites only after PASS and keeps per-scenario proof state
ok 977 - VH14-B advances ordered suites only after PASS and keeps per-scenario proof state
  ---
  duration_ms: 1.3456
  type: 'test'
  ...
# Subtest: VH14-B terminal failure stops a suite and blocks later execution
ok 978 - VH14-B terminal failure stops a suite and blocks later execution
  ---
  duration_ms: 0.6453
  type: 'test'
  ...
# Subtest: VH14-B represents PAUSED-HUMAN-ACTION and resumes only through the VH13 port
ok 979 - VH14-B represents PAUSED-HUMAN-ACTION and resumes only through the VH13 port
  ---
  duration_ms: 1.8308
  type: 'test'
  ...
# Subtest: VH14-B resolves a VH13-returned RESUMABLE cursor through the immutable definition
ok 980 - VH14-B resolves a VH13-returned RESUMABLE cursor through the immutable definition
  ---
  duration_ms: 1.0121
  type: 'test'
  ...
# Subtest: VH14-B represents RESUMABLE and rejects stale transitions without module work
ok 981 - VH14-B represents RESUMABLE and rejects stale transitions without module work
  ---
  duration_ms: 0.6227
  type: 'test'
  ...
# Subtest: VH14-B rejects RUNNING cleanup retry without exact durable C adoption proof
ok 982 - VH14-B rejects RUNNING cleanup retry without exact durable C adoption proof
  ---
  duration_ms: 1.0751
  type: 'test'
  ...
# Subtest: VH14-B fails closed when lifecycle persistence loses its CAS race
ok 983 - VH14-B fails closed when lifecycle persistence loses its CAS race
  ---
  duration_ms: 0.3227
  type: 'test'
  ...
# Subtest: VH14-B + real C + real VH13 retries cleanup after durable adoption and process restart
ok 984 - VH14-B + real C + real VH13 retries cleanup after durable adoption and process restart
  ---
  duration_ms: 7.9508
  type: 'test'
  ...
# Subtest: VH14-C reconstructs exact run/suite/step state after controller restart
ok 985 - VH14-C reconstructs exact run/suite/step state after controller restart
  ---
  duration_ms: 4.7066
  type: 'test'
  ...
# Subtest: VH14-C rejects malformed and identity-mismatched persistence instead of treating it as empty
ok 986 - VH14-C rejects malformed and identity-mismatched persistence instead of treating it as empty
  ---
  duration_ms: 1.1329
  type: 'test'
  ...
# Subtest: VH14-C validates monotonic revisions and preserves CAS stale-write protection
ok 987 - VH14-C validates monotonic revisions and preserves CAS stale-write protection
  ---
  duration_ms: 1.5066
  type: 'test'
  ...
# Subtest: VH14-C accepts Package B's pending cursor and exact pending-to-running start writes
ok 988 - VH14-C accepts Package B's pending cursor and exact pending-to-running start writes
  ---
  duration_ms: 1.016
  type: 'test'
  ...
# Subtest: VH14-C durably adopts the exact VH13 tuple once and reconstructs the adoption journal
ok 989 - VH14-C durably adopts the exact VH13 tuple once and reconstructs the adoption journal
  ---
  duration_ms: 1.8342
  type: 'test'
  ...
# Subtest: VH14-C invokes durable adoption before VH13 cleanup and safely retries interrupted cleanup
ok 990 - VH14-C invokes durable adoption before VH13 cleanup and safely retries interrupted cleanup
  ---
  duration_ms: 4.748
  type: 'test'
  ...
# Subtest: VH14-C cleanup success followed by process loss reconstructs the already-running resume step
ok 991 - VH14-C cleanup success followed by process loss reconstructs the already-running resume step
  ---
  duration_ms: 1.2681
  type: 'test'
  ...
# Subtest: VH14-C adoption failure or tuple mismatch leaves the VH13 checkpoint intact
ok 992 - VH14-C adoption failure or tuple mismatch leaves the VH13 checkpoint intact
  ---
  duration_ms: 1.332
  type: 'test'
  ...
# Subtest: VH14-C runner-CAS interruption after tuple journaling retains checkpoint and is retryable
ok 993 - VH14-C runner-CAS interruption after tuple journaling retains checkpoint and is retryable
  ---
  duration_ms: 1.6273
  type: 'test'
  ...
# Subtest: VH14-C fails closed on a malformed adoption journal
ok 994 - VH14-C fails closed on a malformed adoption journal
  ---
  duration_ms: 0.6069
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: exact C03-F03 enumeration
ok 995 - VH14 integrated B+C runner: exact C03-F03 enumeration
  ---
  duration_ms: 2.5364
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: deterministic single-scenario advancement
ok 996 - VH14 integrated B+C runner: deterministic single-scenario advancement
  ---
  duration_ms: 6.461
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: ordered-suite advancement only after allowed terminal result
ok 997 - VH14 integrated B+C runner: ordered-suite advancement only after allowed terminal result
  ---
  duration_ms: 2.0209
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: fail-closed prerequisite handling
ok 998 - VH14 integrated B+C runner: fail-closed prerequisite handling
  ---
  duration_ms: 1.1879
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: unexpected plan/assertion stops before mutation
ok 999 - VH14 integrated B+C runner: unexpected plan/assertion stops before mutation
  ---
  duration_ms: 0.9053
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: human-action pause persists checkpoint/current step
ok 1000 - VH14 integrated B+C runner: human-action pause persists checkpoint/current step
  ---
  duration_ms: 1.0559
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: RESUMABLE uses durable VH13 adoption ordering
ok 1001 - VH14 integrated B+C runner: RESUMABLE uses durable VH13 adoption ordering
  ---
  duration_ms: 3.3327
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: restart reconstruction preserves identity and step
ok 1002 - VH14 integrated B+C runner: restart reconstruction preserves identity and step
  ---
  duration_ms: 1.3024
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: PASS requires verifier and evidence success
ok 1003 - VH14 integrated B+C runner: PASS requires verifier and evidence success
  ---
  duration_ms: 1.374
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: terminal failure blocks subsequent execution
ok 1004 - VH14 integrated B+C runner: terminal failure blocks subsequent execution
  ---
  duration_ms: 0.9815
  type: 'test'
  ...
# Subtest: VH14 integrated B+C runner: module operations use orchestration interfaces
ok 1005 - VH14 integrated B+C runner: module operations use orchestration interfaces
  ---
  duration_ms: 1.8708
  type: 'test'
  ...
# Subtest: VH14 production composition wires B + C + D without manufacturing proof authority
ok 1006 - VH14 production composition wires B + C + D without manufacturing proof authority
  ---
  duration_ms: 1.5208
  type: 'test'
  ...
# Subtest: VH14-D freezes exact module ownership and routes every step only to its approved VH04-VH13 delegate
ok 1007 - VH14-D freezes exact module ownership and routes every step only to its approved VH04-VH13 delegate
  ---
  duration_ms: 3.1092
  type: 'test'
  ...
# Subtest: VH14-D preserves prerequisite order and fails closed on missing, duplicate, or thrown delegated results
ok 1008 - VH14-D preserves prerequisite order and fails closed on missing, duplicate, or thrown delegated results
  ---
  duration_ms: 1.7854
  type: 'test'
  ...
# Subtest: VH14-D proof ownership prevents planner, executor, and injected faults from manufacturing verification or evidence
ok 1009 - VH14-D proof ownership prevents planner, executor, and injected faults from manufacturing verification or evidence
  ---
  duration_ms: 0.8252
  type: 'test'
  ...
# Subtest: VH14-D preserves VH11 uncertainty as operation completion until a separate VH08 observation establishes physical reality
ok 1010 - VH14-D preserves VH11 uncertainty as operation completion until a separate VH08 observation establishes physical reality
  ---
  duration_ms: 0.8853
  type: 'test'
  ...
# Subtest: VH14-D rejects missing, malformed, and evidence-free delegated proof and converts throws to module failure
ok 1011 - VH14-D rejects missing, malformed, and evidence-free delegated proof and converts throws to module failure
  ---
  duration_ms: 0.7111
  type: 'test'
  ...
# Subtest: VH14-D accepts pause/resume only from VH13 for the exact active run
ok 1012 - VH14-D accepts pause/resume only from VH13 for the exact active run
  ---
  duration_ms: 0.5917
  type: 'test'
  ...
# Subtest: post-dispatch response loss cannot precede durable intent persistence and dispatch evidence
ok 1013 - post-dispatch response loss cannot precede durable intent persistence and dispatch evidence
  ---
  duration_ms: 2.0915
  type: 'test'
  ...
# Subtest: response-loss occurrence is deterministic and VH11 cannot manufacture physical certainty
ok 1014 - response-loss occurrence is deterministic and VH11 cannot manufacture physical certainty
  ---
  duration_ms: 0.4279
  type: 'test'
  ...
# Subtest: direct state manipulation refuses non-disposable/primary state authority before touching the port
ok 1015 - direct state manipulation refuses non-disposable/primary state authority before touching the port
  ---
  duration_ms: 1.1465
  type: 'test'
  ...
# Subtest: an authorized sandbox surface that is not a disposable state copy is still refused
ok 1016 - an authorized sandbox surface that is not a disposable state copy is still refused
  ---
  duration_ms: 0.3664
  type: 'test'
  ...
# Subtest: direct state manipulation requires both backup and pre-fault checkpoint evidence
ok 1017 - direct state manipulation requires both backup and pre-fault checkpoint evidence
  ---
  duration_ms: 0.8677
  type: 'test'
  ...
# Subtest: state loss and cursor loss are bounded to the authorized disposable validation state resource
ok 1018 - state loss and cursor loss are bounded to the authorized disposable validation state resource
  ---
  duration_ms: 0.4841
  type: 'test'
  ...
# Subtest: cursor loss cannot be widened into whole-state corruption
ok 1019 - cursor loss cannot be widened into whole-state corruption
  ---
  duration_ms: 0.3218
  type: 'test'
  ...
# Subtest: post-dispatch cancellation uses production run authority and leaves the in-flight atomic operation untouched
ok 1020 - post-dispatch cancellation uses production run authority and leaves the in-flight atomic operation untouched
  ---
  duration_ms: 0.7139
  type: 'test'
  ...
# Subtest: pre-dispatch cancellation deterministically blocks the next atomic operation before dispatch
ok 1021 - pre-dispatch cancellation deterministically blocks the next atomic operation before dispatch
  ---
  duration_ms: 0.6436
  type: 'test'
  ...
# Subtest: VH08 PASS requires complete authoritative local/remote/state/diagnostic and convergence proof
ok 1022 - VH08 PASS requires complete authoritative local/remote/state/diagnostic and convergence proof
  ---
  duration_ms: 12.0359
  type: 'test'
  ...
# Subtest: missing completeness/terminal proof is BLOCKED, never PASS
ok 1023 - missing completeness/terminal proof is BLOCKED, never PASS
  ---
  duration_ms: 0.6293
  type: 'test'
  ...
# Subtest: concrete byte mismatch is FAIL and dominates an unrelated BLOCKED convergence proof
ok 1024 - concrete byte mismatch is FAIL and dominates an unrelated BLOCKED convergence proof
  ---
  duration_ms: 0.7768
  type: 'test'
  ...
# Subtest: read-source types do not expose production mutation authority
ok 1025 - read-source types do not expose production mutation authority
  ---
  duration_ms: 0.1432
  type: 'test'
  ...
# Subtest: H6C terminal production proof requires an exact diagnostic run ID and never falls back to latest event
ok 1026 - H6C terminal production proof requires an exact diagnostic run ID and never falls back to latest event
  ---
  duration_ms: 1.5013
  type: 'test'
  ...
# Subtest: H6C failed or cancelled exact terminal evidence cannot satisfy required completion
ok 1027 - H6C failed or cancelled exact terminal evidence cannot satisfy required completion
  ---
  duration_ms: 1.3152
  type: 'test'
  ...
# Subtest: H6C contradictory or duplicate terminal evidence for the exact run fails closed
ok 1028 - H6C contradictory or duplicate terminal evidence for the exact run fails closed
  ---
  duration_ms: 0.7423
  type: 'test'
  ...
# Subtest: VH10 activation is exact-run/exact-step bound and rejects peer fault ownership
ok 1029 - VH10 activation is exact-run/exact-step bound and rejects peer fault ownership
  ---
  duration_ms: 1.6814
  type: 'test'
  ...
# Subtest: offline injection is deterministic across configured repeated occurrences and then delegates unchanged
ok 1030 - offline injection is deterministic across configured repeated occurrences and then delegates unchanged
  ---
  duration_ms: 27.9939
  type: 'test'
  ...
# Subtest: validation transport wrapper is behavior-neutral when no fault occurrence is armed
ok 1031 - validation transport wrapper is behavior-neutral when no fault occurrence is armed
  ---
  duration_ms: 0.471
  type: 'test'
  ...
# Subtest: injected HTTP/network causes retain GoogleHttpTransport production classifications
ok 1032 - injected HTTP/network causes retain GoogleHttpTransport production classifications
  ---
  duration_ms: 7.4814
  type: 'test'
  ...
# Subtest: one-shot rate limit uses the production bounded retry path before succeeding
ok 1033 - one-shot rate limit uses the production bounded retry path before succeeding
  ---
  duration_ms: 1.5367
  type: 'test'
  ...
# Subtest: partial-enumeration injection truncates observations, marks partial, and is repeat-deterministic
ok 1034 - partial-enumeration injection truncates observations, marks partial, and is repeat-deterministic
  ---
  duration_ms: 0.653
  type: 'test'
  ...
# Subtest: enumeration adapter never masks a real production failure or an already-partial result
ok 1035 - enumeration adapter never masks a real production failure or an already-partial result
  ---
  duration_ms: 0.4004
  type: 'test'
  ...
1..1035
# tests 1041
# suites 0
# pass 1041
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5145.5329

> brain-google-drive-sync@0.1.18 build
> node scripts/build.mjs && node scripts/verify-build.mjs


  main.js  962.5kb

Done in 51ms
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
BUILD_ARTIFACT_SIZE=985556
BUILD_ARTIFACT_SHA256=542a8ae22af00f2ed120314f3b10706710c4557a309140845b04579c8024ffd1
EXIT CODE: 0

## Post-verification source-integrity gate
PASS: H6C validation implementation commit remains an ancestor after verification: dc0d44aa2dd2fc0f7f7abafb0b15eca3029b559b
PASS: committed src/** still exactly matches the reviewed implementation.
PASS: no unstaged src/** changes after verification.
PASS: no staged src/** changes after verification.
PASS: src/** has no staged, unstaged, or untracked files after verification.
PASS: post-verification committed product-controller-base.ts blob = 876d30eec5eb36ca16fee375581c85f3c7a5fa16
PASS: post-verification working product-controller-base.ts blob = 876d30eec5eb36ca16fee375581c85f3c7a5fa16

## Breaking-change audit
Static scope assertions checked: persisted-state owners unchanged; settings persistence owners unchanged; Drive protocol/metadata owners unchanged; planner/executor/core/Drive/local/state source families unchanged.
Semantic ID generation remains in the pre-H6C planner/controller code; H6C does not alter semanticPlanId or withSemanticOperationId.
Conflict resolution still constructs and executes the same resolution plan; only diagnostic run lifecycle/correlation metadata were added.
D06 execution authority is unchanged; no selective execution, plan splitting, execute-safe-subset, or executePlanned semantic change was introduced.
Invariant 1 PASS: synchronization branch conditions governing product outcomes are unchanged; new conditionals govern diagnostic correlation/lifecycle only.
Invariant 2 PASS: planner inputs and outputs are unchanged.
Invariant 3 PASS: plan operation selection and ordering are unchanged.
Invariant 4 PASS: operation execution eligibility is unchanged.
Invariant 5 PASS: local/remote mutation requests are unchanged.
Invariant 6 PASS: mutation result interpretation is unchanged.
Invariant 7 PASS: BASE, mappings, tombstones, cursors, revisions, generations, durable intents/effects, recovery, and first-sync authority are unchanged.
Invariant 8 PASS: conflict-resolution user choices and synchronization semantics are unchanged.
Invariant 9 PASS: when diagnostics are unavailable, added correlation state clears/fails closed for validation and does not alter the production synchronization path/result.
Invariant 10 PASS: diagnostic failure remains non-authoritative and cannot change synchronization success, failure, or physical effects.
Breaking-change gate PASS: persisted synchronization state shape, settings persistence shape, Drive protocol/metadata, synchronization contracts, planner output, executor behavior, mutation sequence, plan IDs, operation IDs, conflict outcomes, ordinary desktop/mobile behavior, and UserAction synchronization authority are unchanged by scope plus passing regressions.
GitHub Actions were not used.

# RESULT: PASS
