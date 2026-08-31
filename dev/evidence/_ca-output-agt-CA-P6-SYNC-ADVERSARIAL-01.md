# Phase 6 Workstream G Evidence — agt-CA-P6-SYNC-ADVERSARIAL-01

## Identity and branch control

- Agent: `agt-CA-P6-SYNC-ADVERSARIAL-01`
- Approved v1.2 base SHA: `96b4541b15012ac4ce0d81243b73ef779efd343e`
- Foundation branch authority: `phase6-sync-foundation-v1.2-remote-folder-recovery-observation`
- Frozen synchronization contract: `phase6-sync-foundation-v1.2`
- Work branch: `phase6-sync-adversarial-model`
- Branch was created directly from exact approved SHA `96b4541b15012ac4ce0d81243b73ef779efd343e`.
- No A-F worker branch was merged, rebased, cherry-picked, or consumed.
- Implementation commit before this evidence-only commit: `ebc71a1ba2a53026e9f2ff7f8a15a5566f5f1845`.
- Final branch SHA is reported in the completion response because a file cannot truthfully contain the SHA of the commit that creates that same file.

## Fresh manual-ingestion proof

Fresh repository manual source inspected at approved base:
`dev/planning-and-building/agent-led-software-product-construction-manual.md`, blob `02adedab577f397d98fb9666166270358a581761`.

Verification markers:
- Title: `Agent-Led Software Product Construction Manual`
- First substantive sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`
- H2 sequence: Purpose; Operating Principles; Navigation and Entry; Stage 0 — Product Discovery and Requirements Elicitation; Stage 1 — Target-System Specification and Minimum Sound Build Decomposition; Stage 2A — Controlled Session-Based Construction; Stage 2B — Autonomous Product Construction; Stage 3 — Independent Product and System Validation; Cross-Stage Handoff Rules; Re-Entry and Recovery; Recommended Default Workflow.
- Embedded dedicated agent prompts verified: Stage 0, Stage 1, Stage 2A build-prompt expansion, Stage 2B autonomous construction, Stage 3 validation.
- Final sentence verified: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`

## Created / modified / deleted files

Created:
- `test/adversarial-model/adversarial-model.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-SYNC-ADVERSARIAL-01.md`

Modified: none.
Deleted: none.

Production files changed: none.
Frozen contracts changed: none.
Existing tests outside `test/adversarial-model/**` changed: none.
`src/testing/fakes.ts` changed: no.
Planning/foundation artifacts changed: no.
Workflow/release/Azure/OAuth/protected-branch material changed: no.

## Model and deterministic seed mechanism

The G entrypoint contains a deterministic two-device synthetic model with:
- Device A local files, BASE, semantic generation, persistence revision, stale-device state, lifecycle, watcher-loss set, evidence cache;
- Device B equivalent local state;
- REMOTE objects with stable object ID independent from logical path, content identity/revision, parent identity, and trash state;
- durable logical operation journals and per-effect stages;
- Drive change/checkpoint position and durable learned batches;
- path convergence/conflict/unknown state;
- online/offline/rate-limit/auth-loss network conditions;
- active/suspended/dead application lifecycle;
- delivered/non-delivered cancellation modeling;
- synthetic local/change-event delivery loss;
- cache-bypassing integrity reads.

Random behavior uses one explicit numeric seed and a deterministic Mulberry32-style PRNG. Selected fixed seed set: `1`, `7`, `42`, `1337`, `0xC0FFEE`.

Every randomized step records sanitized synthetic event data only. The representative replay seed is `1337`; the entrypoint asserts two independent 40-step runs produce byte-for-byte identical serialized traces.

## Enforced invariants

The model asserts at minimum:
- exact BASE authority is required for history-dependent work;
- exact identity/path authority is required for identity-dependent work;
- acknowledged/durable intended version survives later LOCAL advancement;
- incomplete/unknown state never fabricates absence;
- remote object identity is independent from logical path;
- duplicate same-path candidates never become an implicit converged winner;
- physical materialization is distinct from path convergence;
- path-local conflict does not prevent unrelated learned-feed progress;
- destructive authority is blocked for stale/auth-lost/mass-destructive conditions;
- watcher/event loss cannot permanently hide content when authoritative integrity bypass is used;
- clean merge completion requires every required effect to reach `state-committed`;
- resource-bounded merge refusal preserves complete local/remote versions.

## Directed scenario implementation/result ledger

The following scenarios are implemented as deterministic assertions in `test/adversarial-model/adversarial-model.test.ts` and the complete test source compiled successfully in repository CI typecheck. Runtime execution of the nested G entrypoint is separately qualified below because the repository workflow does not execute nested G tests.

1. history-dependent work without exact BASE — rejection assertion present / compiled.
2. identity-dependent work without exact identity — rejection assertion present / compiled.
3. upload crash/restart at every durable stage — restart-classification matrix present / compiled.
4. download crash/restart at every durable stage — matrix present / compiled.
5. move crash/restart at every durable stage — matrix present / compiled.
6. trash crash/restart at every durable stage — matrix present / compiled.
7. clean merge independently journaled effects — incomplete-until-all-committed assertion present / compiled.
8. R0 + RI + writer candidate — conflict preserved despite materialization / compiled.
9. no-independent-candidate — convergence occurs only after explicit path authority / compiled.
10. lost create/update response with L1 -> L2 — durable L1 intent retained and not substituted by L2 / compiled.
11. remote move/trash outcome-unknown — physical reconciliation directive required / compiled.
12. clean merge crash after one effect — logical operation remains incomplete / compiled.
13. multi-page Drive Changes — page facts retained through terminal cursor / compiled.
14. multi-batch ingestion with removals — earlier removal fact retained / compiled.
15. repeated moves — stable remote object ID preserved / compiled.
16. create-delete sequence — object identity/tombstone-like history retained while active-path absence is observed / compiled.
17. duplicate logical paths — explicit conflict / compiled.
18. long-lived unresolved path with later feed progress — cursor/backlog continues / compiled.
19. same-size/same-mtime H0 -> H1 with missed watcher/stale cache — cache-bypassing read discovers H1 / compiled.
20. Windows event loss — event loss does not become authority loss / compiled.
21. iOS suspend/resume — durable revision retained / compiled.
22. abrupt iOS/process termination — journal survives modeled process death / compiled.
23. cancellation delivered — no new operation starts / compiled.
24. cancellation not delivered before death — restart uses durable journal classification / compiled.
25. auth loss — destructive authority denied / compiled.
26. rate-limit/offline/transient remote failure — local-first content remains intact / compiled.
27. path A changes continuously while B commits — B authority remains independently progressable / compiled.
28. bounded quiescence once A stops — final A becomes equal to BASE in bounded modeled step / compiled.
29. concurrent same-path creates — duplicate objects remain conflict and never silently select one / compiled.
30. stale-device destructive gating — destructive authority denied / compiled.
31. mass-deletion circuit breaker — suspicious destructive count/ratio denied while small ordinary deletion remains allowed / compiled.
32. resource-bounded merge refusal — oversized merge refused while both complete versions remain / compiled.

## V1.2 REMOTE folder-create recovery scenarios

The G test entrypoint consumes the frozen v1.2 `verifyRemoteFolderCreate()` / `recoverRemoteFolderCreate()` seam directly.

- F1 exact reserved effect + exact observed parent/path -> expected `verified-effect` assertion present / compiled.
- F2 exact reserved ID + wrong actual parent -> expected `conflict-preserved` / compiled.
- F3 exact reserved ID + wrong observed structural path -> conservative conflict / compiled.
- F4 reserved ID absent but intended target occupied -> `conflict-preserved`, never `verified-not-applied` / compiled.
- F5 exact reserved ID authoritatively absent + target clear -> `verified-not-applied` permitted / compiled.
- F6 duplicate/ambiguous target -> `outcome-unknown` conservative result / compiled.
- F7 incomplete parent/path observation -> `outcome-unknown`, never absence / compiled.
- F8 restart from `dispatch-authorized` -> `reconcile-physical-reality`; recovery read occurs; synthetic dispatch count remains zero / compiled.
- F9 restart from `outcome-unknown` -> same read-before-redispatch rule / compiled.
- F10 persisted descriptor intent cannot synthesize observed parent proof -> unobservable read remains `outcome-unknown` / compiled.

## Randomized/replay evidence

Selected deterministic randomized seeds in source: `1`, `7`, `42`, `1337`, `0xC0FFEE`.

Representative replay trace contract:
- seed: `1337`;
- initial modeled state: synthetic empty two-device/remote state;
- ordered events: 40 seeded operations over synthetic paths `a.md`, `b.md`, `c.md`;
- fault dimensions include network mode, cancellation, lifecycle death/suspend, duplicate remote creates, local edits, and learned-feed progression;
- invariant checked after every randomized step: duplicate ambiguous remote candidates may not coexist with modeled `converged` path state;
- replay assertion: two independent runs with seed `1337` serialize to identical traces.

Minimized failure trace: none available because the focused nested runtime entrypoint could not be executed on the available repository Actions surface. The code contains deterministic trace data sufficient for later minimization once the entrypoint is run by an execution surface that accepts the explicit command.

## Verification

### Focused G adversarial test command

Required explicit command:
`node --test .test-build/test/adversarial-model/adversarial-model.test.js`

Result: `NOT AVAILABLE IN THIS SESSION`.

Reason: repository `npm test` compiles all `test/**/*.ts` but executes only `.test-build/test/*.test.js`; the existing GitHub workflows do not contain an explicit nested G execution step, workflow files are prohibited to G, no workflow-dispatch mutation surface is available, and the repository cannot be cloned into the local execution container because outbound DNS/network access is disabled. G therefore does not falsely claim that `npm test` executed its nested tests.

Important positive evidence: CI `Typecheck` succeeded with the G source included, proving the G entrypoint typechecks against the frozen v1.2 contracts.

### Repository-wide verification

A temporary draft PR was opened solely to invoke the existing master-target CI, then closed immediately when GitHub showed master was not the correct exact-base integration target. It was never merged. The resulting CI run nevertheless checked out the G head and recorded:

- GitHub Actions run: `33420349506`, job `99580914409`.
- `npm ci` — PASS.
- `npm run typecheck` — PASS.
- `npm test` — PASS. This is repository-wide top-level test execution only; it does **not** execute nested G runtime tests.
- `npm run build` — PASS.

The CI workflow does not separately run `npm run check`; however `check` is compositionally `typecheck && npm test && npm run build`, and those exact three component commands each passed in the same CI job. This is recorded as component-equivalent evidence, not as a literal `npm run check` invocation.

`git diff --check`: `NOT AVAILABLE IN THIS SESSION` as a literal repository command. The complete GitHub compare against the approved base was independently inspected.

Applicable package/mobile verification beyond production build: no G-specific mobile runtime mutation exists; physical iPhone/Windows testing is prohibited and was not claimed.

## Complete diff inspection

GitHub compare from approved base `96b4541b15012ac4ce0d81243b73ef779efd343e` to implementation commit `ebc71a1ba2a53026e9f2ff7f8a15a5566f5f1845` reported:
- status: ahead;
- ahead by: 1;
- behind by: 0;
- merge base: exact approved SHA;
- changed files: exactly one, `test/adversarial-model/adversarial-model.test.ts`.

After this evidence commit the expected complete branch diff is the G test file plus this dedicated evidence file only. Final compare is performed in the completion pass.

## Integration dependency requests

- Later serialized integration may adapt this scenario generator/invariant set to real A-F production adapters after those workstreams are integrated.
- No current A-F branch is required or consumed by G.
- Focused runtime execution of the compiled nested G entrypoint remains a later verification dependency unless a supervisor provides an execution surface that can run the exact command without modifying prohibited workflows.

## Contract-change requests

None.

The v1.2 folder-recovery read-port/verifier semantics are sufficient for this model.

## Physical-device validation

Not performed and not claimed. Physical Windows/iPhone validation is explicitly deferred/prohibited for this workstream.
