# Phase 6 Workstream G-C1 Repair Evidence — agt-CA-P6-SYNC-ADVERSARIAL-01

## Identity / branch control

- Agent: `agt-CA-P6-SYNC-ADVERSARIAL-01`
- Work branch: `phase6-sync-adversarial-model`
- Rejected head: `83098e39f44f0b2259dfaaf25ef927be5be9a687`
- Approved frozen v1.2 foundation base: `96b4541b15012ac4ce0d81243b73ef779efd343e`
- Frozen synchronization contract: `phase6-sync-foundation-v1.2`
- Repair consumed no A/D worker implementation and changed no production source.
- G-C1 implementation commits before this evidence commit:
  - `0fda20876e876e5ca47791bbe3a7fb060db76246` — executable transition model support.
  - `9f3be821081c2fd399dd9b8cf26728fe510d6c80` — directed/random/replay scenarios rewritten to drive the transition model.
  - `4ddbd3851d7a37511f00d8ae67831fc82eb6b42f` — branded generation fixture correction after CI typecheck feedback.
- Final correction SHA is reported in the completion response because this evidence file cannot contain the SHA of the commit that creates its final content.

## G-only changed-file manifest for G-C1

Relative to rejected head `83098e39f44f0b2259dfaaf25ef927be5be9a687`:

- modified: `test/adversarial-model/adversarial-model.test.ts`
- added: `test/adversarial-model/support/model.ts`
- modified: `dev/evidence/_ca-output-agt-CA-P6-SYNC-ADVERSARIAL-01.md`

No files outside G ownership were changed by the repair.

## Transition-model implementation

The repaired model is an explicit deterministic synchronization transition engine rather than assertion-by-construction.

### Durable device state

For both Device A and Device B the model carries:

- LOCAL filesystem content;
- per-path BASE records and acknowledged-version history;
- deletion/tombstone history;
- semantic generation;
- persistence revision;
- durable learned remote pages/batches;
- durable cursor/checkpoint position;
- durable logical operation journals;
- per-effect physical mutation stage;
- verification-evidence references;
- path convergence/conflict/recovery state;
- stale-state flag;
- remote-coverage completeness;
- local-readability/observation completeness;
- starvation/progress counters.

### Shared remote state

REMOTE is keyed by stable remote identity independently of logical path. Each modeled object carries:

- stable ID;
- current logical path;
- file/folder kind;
- content identity when applicable;
- remote revision;
- parent identity when applicable;
- trash state.

### Volatile device state

Crash-discardable state includes:

- current reconciliation plan;
- in-flight transport response state;
- watcher/change-event state;
- cached evidence;
- volatile dirty-path set;
- cancellation requested/delivered state;
- lifecycle state;
- network/auth/offline/rate-limit state.

`crash` discards volatile process state while leaving physical LOCAL/REMOTE reality and durable authority/journals/history/checkpoints intact. `restart` reconstructs fresh volatile state only from the durable/physical model.

## Event vocabulary

The same transition API is used by directed scenarios, randomized runs, and replay:

- `local-write`
- `local-delete`
- `local-move`
- `local-readability`
- `external-remote-create`
- `external-remote-update`
- `external-remote-move`
- `external-remote-trash`
- `start-reconcile`
- `advance`
- `dispatch`
- `transport-success`
- `transport-lost`
- `ingest-page`
- `crash`
- `restart`
- `recover`
- `suspend`
- `resume`
- `cancel-request`
- `network`
- `mark-stale`
- `remote-coverage`
- `integrity-reconcile`
- `begin-folder-create`
- `recover-folder-create`

The model derives plans and journals from current modeled evidence. Directed tests no longer assign the expected authoritative BASE/REMOTE/convergence result as a substitute for the transition under test.

## Frozen-contract consumption

The repair continues to import the approved v1.2 folder-create recovery contract from `src/contracts/synchronization-folder-create-foundation.ts`.

Folder recovery derives a `RemoteFolderCreateObservation` from modeled Drive reality and passes that observation to frozen `verifyRemoteFolderCreate()`.

Descriptor intent is not treated as observed parent/path evidence. Authoritative absence is emitted only when modeled remote coverage is complete, the reserved identity is absent, and no competing target occupant exists. Occupied/duplicate/incomplete/unobservable cases remain conservative.

No worker-local replacement production contract was introduced.

## Invariants enforced by the transition model

The model checks invariants after applied transitions, including:

- no fabricated physical success: `effect-verified` / `state-committed` effects require modeled verification evidence;
- no fabricated absence in remote-folder recovery;
- acknowledged-version history is retained durably;
- remote identity is represented independently from path and survives moves;
- ambiguous same-path candidates cannot be accepted as an observed converged winner;
- physical application is distinct from logical BASE/path convergence;
- exact BASE authority is required for history-dependent mutation work;
- exact identity authority is required for mapped identity-dependent mutation work;
- stale/incomplete remote authority cannot authorize destructive propagation;
- unresolved path work is path-local and does not inherently block unrelated safe paths;
- starvation counters bound repeated safe-path deferral;
- convergence checks require LOCAL/BASE/REMOTE agreement or an explicit conflict/recovery state.

## Directed scenario coverage — 1 through 32

Every required directed scenario is now expressed as an event sequence over the executable model. The TypeScript test tree containing all scenarios compiled successfully in CI after the repair.

1. missing exact BASE authority -> transition blocks history-dependent work into recovery.
2. missing exact identity authority -> transition blocks mapped remote mutation.
3. upload crash/restart -> exercised at `intent-persisted`, `dispatch-authorized`, `outcome-unknown`, and `effect-verified`.
4. download crash/restart -> same durable-stage coverage.
5. move crash/restart -> same durable-stage coverage while stable remote identity is retained.
6. trash crash/restart -> same durable-stage coverage.
7. clean merge -> one physical effect cannot commit BASE; logical convergence waits for all required effects.
8. predecessor + intended immutable candidate + independent candidate -> finalization preserves conflict and does not advance BASE.
9. independent same-path candidate -> reconciliation produces explicit conflict rather than implicit equivalence.
10. durable intended L1 followed by later LOCAL L2 -> persisted mutation remains bound to L1 and is not substituted by L2.
11. outcome-unknown after a physically applied remote mutation -> restart recovery observes physical reality without incrementing dispatch count.
12. clean merge crash after one effect -> BASE remains pre-merge until remaining durable work completes.
13. multi-page changes -> intermediate page is durable without prematurely advancing cursor; terminal page advances checkpoint.
14. multiple learned removal batches -> learned facts and cursor survive crash/restart.
15. repeated remote moves -> stable remote object identity is preserved while logical path changes.
16. create/delete -> BASE deletion is accompanied by retained tombstone/acknowledged history.
17. duplicate logical paths -> reconciliation yields explicit conflict with no BASE winner.
18. unresolved path A plus safe path B -> B can complete while A remains conflict-local.
19. lost watcher plus stale cache analogue -> integrity reconciliation discovers actual LOCAL divergence and schedules work.
20. Windows-style event loss -> integrity reconciliation recovers deletion authority rather than trusting event delivery.
21. iOS-style suspend/resume -> durable journal survives suspension and completes after resume.
22. abrupt process death -> volatile plan disappears while durable authority survives restart.
23. delivered cancellation -> dispatch is suppressed while durable intent remains.
24. cancellation not delivered before death -> durable intent survives and can resume after restart.
25. auth loss -> remote destructive dispatch is suppressed.
26. offline/rate-limited states -> LOCAL edits remain intact and remote dispatch is suppressed.
27. repeated path-A churn with pending path-B change -> B remains independently progressable.
28. pressure stops -> bounded settle loop must reach convergence or explicit conflict/recovery before transition bound.
29. concurrent same-path creates from two devices -> reconciliation does not silently choose one as authoritative.
30. stale device -> destructive propagation is blocked into recovery.
31. suspicious multi-path deletion case -> modeled authority is deliberately incomplete so destructive actions remain blocked; no remote delete is dispatched.
32. non-clean/unsupported merge -> explicit conflict preserves complete LOCAL and REMOTE versions.

Focused runtime result for the above scenarios is separately qualified under Verification; compilation success must not be read as runtime execution.

## V1.2 F1-F10 folder-recovery coverage

These cases now enter through the model's persisted folder-create journal plus restart/recovery transition and derive the observation from modeled REMOTE reality:

- F1 exact reserved folder + actual expected path/parent -> expected frozen-verifier result `verified-effect`.
- F2 exact reserved folder at expected path but wrong actual parent -> `conflict-preserved`.
- F3 exact reserved ID at wrong observed path -> `conflict-preserved`.
- F4 reserved ID absent but target occupied -> `conflict-preserved`, never fabricated absence.
- F5 reserved ID absent + target authoritatively clear -> `verified-not-applied`.
- F6 duplicate target candidates -> modeled observation `unobservable`; frozen verifier -> `outcome-unknown`.
- F7 reserved folder with incomplete parent evidence -> `unobservable` / `outcome-unknown`.
- F8 restart from `dispatch-authorized` -> one recovery read, zero pre-recovery dispatches, no blind redispatch.
- F9 restart from `outcome-unknown` after physical application/response loss -> physical read verifies effect without a second dispatch.
- F10 descriptor expected parent cannot manufacture observed parent evidence -> incomplete physical observation remains `outcome-unknown`.

Again, these assertions compiled successfully; focused runtime execution is not claimed when unavailable.

## Deterministic randomized event generation

Fixed seed set:

- `1`
- `7`
- `42`
- `1337`
- `0xC0FFEE`

Each seed produces an ordered 120-event sequence over the same transition vocabulary. Generated events include LOCAL edits/deletes, external REMOTE creates, planning/advance/dispatch, success vs response loss, crashes/restarts/recovery, network/auth/rate-limit/offline changes, integrity reconciliation, learned-page ingestion, and cancellation delivery races.

`runTrace()` applies each event through the same model and invokes model invariants after each transition. It records sanitized initial state, ordered events, final modeled state, seed, and first invariant failure if one occurs.

## Exact replay evidence

The explicit replay test records a concrete ordered trace containing:

1. LOCAL edit;
2. reconciliation start;
3. plan -> durable journal transition;
4. durable journal -> dispatch-authorized transition;
5. physical dispatch;
6. lost transport response -> outcome-unknown;
7. crash;
8. restart;
9. recovery observation;
10. authoritative advancement.

`replayTrace()` re-applies the recorded `trace.events`; it does not regenerate PRNG values. The test requires replayed ordered events, final serialized state, and failure result to deep-equal the recorded trace result.

## Minimization evidence

A deterministic negative control intentionally models the forbidden behavior "collapse observed duplicate remote candidates into converged." The invariant emits failure code `duplicate-ambiguous-winner`.

`minimizeFailingTrace()` performs deletion-based trace reduction. It repeatedly removes one event and keeps the reduction only if re-execution through the same transition model reproduces the same invariant failure code.

The minimization test requires the minimized trace to be shorter than the noisy original and to reproduce `duplicate-ambiguous-winner`.

Focused runtime result remains `NOT AVAILABLE IN THIS SESSION`; therefore no numeric minimized trace length is claimed as executed evidence.

## Verification

### Local repository execution surface

A direct container clone failed because outbound DNS/network access is disabled:

`fatal: unable to access 'https://github.com/woodpk/gdrive-sync-obsidian-plugin.git/': Could not resolve host: github.com`

Therefore the local environment could not obtain the repository/dependencies needed to execute the compiled nested test artifact.

### Focused G execution

Required command:

`node --test .test-build/test/adversarial-model/adversarial-model.test.js`

Result:

`NOT AVAILABLE IN THIS SESSION`

Reason: the repository's existing `npm test` compiles `test/**/*.ts` but runtime-discovers only `.test-build/test/*.test.js`. The G entrypoint is nested at `.test-build/test/adversarial-model/adversarial-model.test.js`, and the existing permitted workflow has no nested G execution step. G did not modify workflow/package configuration or tests outside its ownership merely to obtain a runtime surface.

Consequently:

- deterministic directed G runtime: `NOT AVAILABLE IN THIS SESSION`
- v1.2 F1-F10 runtime: `NOT AVAILABLE IN THIS SESSION`
- seeded randomized runtime: `NOT AVAILABLE IN THIS SESSION`
- explicit event-trace replay runtime: `NOT AVAILABLE IN THIS SESSION`
- minimization runtime: `NOT AVAILABLE IN THIS SESSION`

### Repository CI verification

Temporary draft PR `#44` was opened only to invoke the existing repository CI and was closed after verification. It was never merged and is not an integration proposal.

First correction CI run:

- run `33436319449`, job `99633522469`
- failed during `npm run typecheck` because the test fixture cast numeric `1` directly to string-branded `SemanticStateGeneration`.
- defect was corrected on the G branch.

Final correction CI run for head `4ddbd3851d7a37511f00d8ae67831fc82eb6b42f`:

- run `33436516082`, job `99634166842`
- install dependencies: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS
- `npm run build`: PASS
- complete job: PASS

Important discovery qualification: repository `npm test` compiled the nested G source through `tsconfig.test.json` but did **not** runtime-execute the nested G entrypoint. No claim to the contrary is made.

### `npm run check`

Literal `npm run check` result: `NOT AVAILABLE IN THIS SESSION`.

The repository CI did execute and pass the three commands that compose `check` (`typecheck`, `npm test`, `build`) in the same final job. This is component-equivalent evidence only, not a literal invocation claim.

### `git diff --check`

Literal result: `NOT AVAILABLE IN THIS SESSION`.

No local repository checkout was available. GitHub compare/diff metadata was used for exact changed-file inspection instead.

## Exact rejected-head diff inspection

GitHub compare:

- base: rejected head `83098e39f44f0b2259dfaaf25ef927be5be9a687`
- head inspected before this evidence update: `4ddbd3851d7a37511f00d8ae67831fc82eb6b42f`
- status: ahead
- ahead by: 3
- behind by: 0
- merge base: exact rejected head
- changed files at that point:
  - `test/adversarial-model/adversarial-model.test.ts`
  - `test/adversarial-model/support/model.ts`

This evidence-file update adds only the already-authorized G-specific evidence file to that repair diff.

## Production / frozen-boundary confirmation

Production diff: zero.

Unchanged:

- `src/**`
- `src/contracts/**`
- `src/testing/fakes.ts`
- all existing tests outside `test/adversarial-model/**`
- `dev/evidence/_ca-output.md`
- planning/foundation files
- workflows
- release files
- Azure/OAuth/Drive-scope material
- A-F worker branches

No merge, Stage 3 work, release/tag, or physical Windows/iPhone synchronization was performed.

## Blockers / limitations

The material verification limitation is focused nested-G runtime execution. The model and all test source compile against the frozen v1.2 repository, but this session has no permitted execution surface that can run the required nested entrypoint without modifying prohibited repository surfaces.

This limitation is intentionally preserved for independent supervisor re-review rather than hidden behind repository-wide `npm test`.

## Contract-change requests

None.
