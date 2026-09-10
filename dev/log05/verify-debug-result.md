# LOG-05 verification debug
```text
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-first-sync-integration.test.ts(429,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-recovery-coordination-integration.test.ts(43,4416): error TS2345: Argument of type 'SynchronizationStateAuthorityAdapter' is not assignable to parameter of type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-surface-lifecycle-integration.test.ts(61,1439): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-second-rejection.test.ts(30,4080): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-a03-first-sync-conflict-resolution-authority.test.ts(285,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-full-sync-remediation.test.ts(194,74): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-ios-sync-diagnostics.test.ts(149,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-ios-sync-diagnostics.test.ts(299,74): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-mixed-plan-isolation.test.ts(144,100): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-plan-errors-stability.test.ts(226,111): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-reconstruction-recovery-r1.test.ts(110,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-uninitialized-first-sync.test.ts(186,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-uninitialized-first-sync.test.ts(247,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-uninitialized-first-sync.test.ts(315,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts(156,101): error TS2551: Property 'reconstructed' does not exist on type 'Partial<Record<DiagnosticFieldKey, DiagnosticFieldValue>>'. Did you mean 'reconstruction'?
test/workstreams/state/state-authority-v1-1.test.ts(287,31): error TS2339: Property 'remoteBatchId' does not exist on type 'Partial<Record<DiagnosticFieldKey, DiagnosticFieldValue>>'.
typecheck_rc=2
src/product/durable-intent-recovery-base.ts(401,52): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(402,53): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(404,67): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(405,53): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(409,96): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(416,55): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(420,103): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(422,147): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(441,74): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(442,52): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(457,70): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(464,87): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(465,52): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery-base.ts(477,52): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(264,53): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(269,69): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(277,103): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(288,149): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(330,76): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(359,52): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(361,67): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(409,77): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(429,52): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(431,73): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(433,67): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/durable-intent-recovery.ts(435,93): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/product/runtime.ts(182,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
src/product/runtime.ts(188,7): error TS2345: Argument of type 'PersistentSynchronizationStateStore | undefined' is not assignable to parameter of type 'SynchronizationStateStore'.
  Type 'undefined' is not assignable to type 'SynchronizationStateStore'.
src/product/runtime.ts(207,90): error TS2345: Argument of type 'PersistentSynchronizationStateStore | undefined' is not assignable to parameter of type 'SynchronizationStateStore'.
  Type 'undefined' is not assignable to type 'SynchronizationStateStore'.
src/product/runtime.ts(212,7): error TS2322: Type 'PersistentSynchronizationStateStore | undefined' is not assignable to type 'PersistentSynchronizationStateStore'.
  Type 'undefined' is not assignable to type 'PersistentSynchronizationStateStore'.
src/product/synchronization-adapters.ts(357,14): error TS2415: Class 'SynchronizationStateAuthorityAdapter' incorrectly extends base class 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
src/state/persistent-state-store.ts(635,59): error TS2345: Argument of type '"state.remote-learning"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(644,96): error TS2345: Argument of type '"state.remote-learning"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(651,60): error TS2345: Argument of type '"state.remote-learning"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(655,97): error TS2345: Argument of type '"state.remote-learning"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(659,60): error TS2345: Argument of type '"state.remote-learning"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(665,96): error TS2345: Argument of type '"state.remote-learning"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(670,59): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(672,96): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(695,97): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(703,60): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
src/state/persistent-state-store.ts(717,96): error TS2345: Argument of type '"state.recovery"' is not assignable to parameter of type 'DiagnosticComponent'.
test/phase5-controller.test.ts(175,81): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-controller.test.ts(195,77): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-a-recovery-state.test.ts(244,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-b-scope-transfer.test.ts(185,68): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-acceptance.test.ts(253,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-active-run-integration.test.ts(131,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-conflict-destruction-integration.test.ts(130,100): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-first-sync-integration.test.ts(429,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-recovery-coordination-integration.test.ts(43,4416): error TS2345: Argument of type 'SynchronizationStateAuthorityAdapter' is not assignable to parameter of type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-group-d-surface-lifecycle-integration.test.ts(61,1439): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase5-second-rejection.test.ts(30,4080): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-a03-first-sync-conflict-resolution-authority.test.ts(285,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-full-sync-remediation.test.ts(194,74): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-ios-sync-diagnostics.test.ts(149,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-ios-sync-diagnostics.test.ts(299,74): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-mixed-plan-isolation.test.ts(144,100): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/phase6-alpha-plan-errors-stability.test.ts(226,111): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-reconstruction-recovery-r1.test.ts(110,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-uninitialized-first-sync.test.ts(186,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-uninitialized-first-sync.test.ts(247,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/product-controller-uninitialized-first-sync.test.ts(315,5): error TS2322: Type 'SynchronizationStateAuthorityAdapter' is not assignable to type 'PersistentSynchronizationStateStore'.
  Types have separate declarations of a private property 'diagnostics'.
test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts(156,101): error TS2551: Property 'reconstructed' does not exist on type 'Partial<Record<DiagnosticFieldKey, DiagnosticFieldValue>>'. Did you mean 'reconstruction'?
test/workstreams/state/state-authority-v1-1.test.ts(287,31): error TS2339: Property 'remoteBatchId' does not exist on type 'Partial<Record<DiagnosticFieldKey, DiagnosticFieldValue>>'.
test_compile_rc=2
TAP version 13
# Subtest: D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
ok 1 - D-C11 lost-response create bypasses stale expected-absence and D-C12 keeps persisted V1
  ---
  duration_ms: 7.172255
  type: 'test'
  ...
# Subtest: D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
ok 2 - D-C11 outcome-unknown folder uses frozen recovery reader with no blind redispatch
  ---
  duration_ms: 3.181682
  type: 'test'
  ...
# Subtest: D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
ok 3 - D-C11 effect-verified completes state without dispatch; state-committed repeats neither physical nor semantic commit
  ---
  duration_ms: 2.687415
  type: 'test'
  ...
# Subtest: D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
ok 4 - D-C11 intent-persisted retires without mutation; stale generation and malformed local authority fail closed
  ---
  duration_ms: 0.861278
  type: 'test'
  ...
# Subtest: D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
ok 5 - D-C12 contradictory current REMOTE identity cannot replace persisted reserved identity
  ---
  duration_ms: 0.311758
  type: 'test'
  ...
# Subtest: D-C12 persisted update candidate identity becomes canonical
ok 6 - D-C12 persisted update candidate identity becomes canonical
  ---
  duration_ms: 2.891013
  type: 'test'
  ...
# Subtest: D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
ok 7 - D-C12 clean merge requires every verified durable effect and aggregate evidence is deterministic
  ---
  duration_ms: 9.320239
  type: 'test'
  ...
# Subtest: D-C11 controller recovers outstanding durable work before a fresh planner returns noop
ok 8 - D-C11 controller recovers outstanding durable work before a fresh planner returns noop
  ---
  duration_ms: 4.198729
  type: 'test'
  ...
# Subtest: LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
not ok 9 - LOG-05 current-generation outstanding recovery exposes selection, physical observation, receipt reconstruction, and final result without changing recovery output
  ---
  duration_ms: 11.11575
  type: 'test'
  location: '/home/runner/work/gdrive-sync-obsidian-plugin/gdrive-sync-obsidian-plugin/repo/.test-build/test/workstreams/orchestration/v1.2-durable-intent-recovery.test.js:216:25'
  failureType: 'testCodeFailure'
  error: |-
    The expression evaluated to a falsy value:
    
      ok(events.some(event => event.event === "recovery-receipt-reconstruction" && event.fields?.reconstructed === true))
    
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-
    TestContext.<anonymous> (/home/runner/work/gdrive-sync-obsidian-plugin/gdrive-sync-obsidian-plugin/repo/.test-build/test/workstreams/orchestration/v1.2-durable-intent-recovery.test.js:227:22)
    async Test.run (node:internal/test_runner/test:1054:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
  ...
# Subtest: LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
ok 10 - LOG-05 stale-generation intent emits the exact existing mismatch and makes authority generation comparison reconstructable
  ---
  duration_ms: 0.939956
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
ok 11 - v1.1 production store round-trips LOCAL folder-create authority across restart unchanged
  ---
  duration_ms: 5.80577
  type: 'test'
  ...
# Subtest: v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
ok 12 - v1.1 production store round-trips REMOTE folder-create parent and pre-reserved identity across restart
  ---
  duration_ms: 4.199711
  type: 'test'
  ...
# Subtest: v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
ok 13 - v1.1 dispatch-authorized remote folder is may-have-happened, never treated as not applied
  ---
  duration_ms: 0.794022
  type: 'test'
  ...
# Subtest: v1.1 verified folder effect restarts by finishing authoritative state commit
ok 14 - v1.1 verified folder effect restarts by finishing authoritative state commit
  ---
  duration_ms: 1.506345
  type: 'test'
  ...
# Subtest: v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
ok 15 - v1.1 folder-containing logical operation remains incomplete until every effect is state-committed
  ---
  duration_ms: 0.28011
  type: 'test'
  ...
# Subtest: v1.1 journal-only folder updates advance persistence revision without semantic generation
ok 16 - v1.1 journal-only folder updates advance persistence revision without semantic generation
  ---
  duration_ms: 0.633616
  type: 'test'
  ...
# Subtest: explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
ok 17 - explicit v1-to-v1.1 migration is backup/CAS safe and preserves existing file/move/trash journal effects
  ---
  duration_ms: 1.828282
  type: 'test'
  ...
# Subtest: malformed or inconsistent persisted v1.1 folder journal fails closed
ok 18 - malformed or inconsistent persisted v1.1 folder journal fails closed
  ---
  duration_ms: 0.992151
  type: 'test'
  ...
# Subtest: v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
ok 19 - v1.1 validator rejects folder descriptor/operation intent mismatch before persistence
  ---
  duration_ms: 0.725054
  type: 'test'
  ...
# Subtest: LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
ok 20 - LOG-05 trusted authority load and CAS expose bounded revisions/generation while persistence-only journals do not report a semantic transition
  ---
  duration_ms: 6.254873
  type: 'test'
  ...
# Subtest: LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
ok 21 - LOG-05 distinguishes stale persistence from stale semantic authority and reports a true semantic transition as ordered before/after events
  ---
  duration_ms: 2.412024
  type: 'test'
  ...
# Subtest: LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
not ok 22 - LOG-05 learned remote batch logging is bounded and never renders raw path/change payload/content
  ---
  duration_ms: 2.463069
  type: 'test'
  location: '/home/runner/work/gdrive-sync-obsidian-plugin/gdrive-sync-obsidian-plugin/repo/.test-build/test/workstreams/state/state-authority-v1-1.test.js:266:25'
  failureType: 'testCodeFailure'
  error: |-
    Expected values to be strictly equal:
    + actual - expected
    
    + undefined
    - 'batch:log05'
    
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: 'batch:log05'
  operator: 'strictEqual'
  stack: |-
    TestContext.<anonymous> (/home/runner/work/gdrive-sync-obsidian-plugin/gdrive-sync-obsidian-plugin/repo/.test-build/test/workstreams/state/state-authority-v1-1.test.js:287:22)
    async Test.run (node:internal/test_runner/test:1054:7)
    async Test.processPendingSubtests (node:internal/test_runner/test:744:7)
  ...
1..22
# tests 22
# suites 0
# pass 20
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 130.319816
focused_rc=1
```
