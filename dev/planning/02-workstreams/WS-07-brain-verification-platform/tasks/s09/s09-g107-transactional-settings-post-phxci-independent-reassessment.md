> **SUPERSEDED / DO NOT EXECUTE.** The independent reviewer REJECTED the immutable source named below for F-01 and F-02. A new invariant-driven corrective source is in progress and has not passed writer-owned verification. The next assignment is **PHX-CI test-writer inspection and batteries**, not another independent review: `s09-g1-settings-lifecycle-phxci-test-writer-request.md`. This archived assignment remains as historical evidence only.

# Independent Adversarial Reassessment — S09 G1-07 Transactional Settings Repair

## Strict read-only mandate

Independently determine whether the **specific G1-07 runtime/UI lost-update correction**, together with inherited G1-01–G1-06 safety invariants, is safe to present for a separate **software-only integration eligibility decision**. This is a **correction-level gate within unfinished S09**, **NOT a feature-completion assessment, product release, activation, or physical S09 acceptance**.

Repository: `woodpk/gdrive-sync-obsidian-plugin`.

**READ ONLY**: Do not modify files/state, run tests or PHX-CI, push, create commits/PRs, merge, install or activate product, operate live Google Drive/vault, perform physical S09, approve artifact hashes, or begin Stage 3. Independently inspect exact source, tests, governing requirements, history, and original verification evidence directly; no reliance on engineering summaries or PASS as correctness proof. Return one reviewer verdict and stop.

## Frozen identities (review code only at exact verified SHA)

| Item | Exact identity |
|---|---|
| **Verified implementation SHA** | `436afeee8897fc34764bbdddcdad0eea0be3365d` |
| **Verified source Git tree** | `5fb9940d814561e328262acb15eb7981899a3223` |
| Accepted master baseline | `b1e2ebaee3077e34a4eefaf601ee8124078b7400` |
| Pinned PHX-CI runtime | `69c4aa077d4a1a46d1e85e59f39d36285be99e83` (`0.2.0-dev.2`) |
| **Original PHX-CI PASS run** | `bc2d2bf1-fc02-4b75-828c-4b3287725b25` |
| **Original PHX-CI evidence commit** | `76651dbe3d91c1ffb2fb083b68ff742dff7e02e4` (direct child; five evidence-only files) |
| Branch (navigation only) | `fix/s09-g104-g105-pairing-namespace-atomic-persistence-20261015` |
| Rejected prior source | `aecd0b15497789869df8cb57094bcdec3a2bfe6d` |
| Prior REJECT source PHX-CI | `95725e97-1e5d-4883-a86f-a4370b49e932` / evidence `5448e214dfc18d7d7f08cb78f5c9270b8d34a621` |
| Corrective predecessor BLOCKED run | `85d6c61a-9c0d-4923-b8a9-99878036497b` on `64bfdd8f8097c0342f02e6eace4f934f40f09a59`; evidence `855e2e420b4bd587c3a8ea102114927d427b8f6b` |
| Development-only main.js | 916125 bytes; PHX-CI-recorded SHA-256 `39524d7352b1a42945d2cbe5ec0f591aa55e00c64c2eff000bc442b37c31636a` (**NOT approved for release**) |

**Read ORIGINAL evidence** at `76651dbe3d91c1ffb2fb083b68ff742dff7e02e4`:
- `dev/_ca-output.json`, `dev/_ca-output.md`.
- `dev/test-results/20261016T195816Z-operator-fix-s09-g104-g105-pairing-namespace-atomic-persistence-20261015-436afeee8897.{json,md,log}`.

Original published PHX-CI **COMPLETE / overall PASS / 11 of 11 stages exit 0**: focused BVP **403/403**, full product **1010/1010**, typecheck, build, repository-check, check, artifacts PASS. Confirm stage claims and source ancestry directly, not from this assignment.

## Required authority

Read Agent-Led Software Engineering Operating Protocol (especially §§5, 21, 27, 29, 35, 37.1), Agent-Led Software Product Construction Manual, `dev/authority/decision-register.yaml` DEC-340–DEC-344, testing-platform-boundary lock, target system `STATE-011`, `FIRST-005`, deletion safety, `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md` S09 G1 and applicable verification plan. Inspect historical `dev/reviews/s09-g106-g107-20261015/review-validation-and-correction.md`, `dev/reviews/s09-g107-runtime-settings-race-20261016/review-validation-and-remediation.md`, earlier REJECT assignment and actual source/test history.

## Adversarial test by source reasoning (NO reviewer execution)

1. **G1-07 original failure and repair:** Reproduce logically the original race: a callback captures settings with `periodicEnabled=true`, UI commits `false`, callback replays a stale full-settings document. Inspect `src/product/plugin-data.ts` `mutateSettings` queue/persistence semantics, `src/main.ts` UI serialization and host mutation; `src/product/runtime.ts` every settings writer and its latest-snapshot behavior. Identify *any* remaining full-snapshot writer, stale read outside transactional closure, unsupported write path or lost-update race.
2. **Recovery and destructive-state invariants:** Check that recovery and first-sync gates disable unsafe automatic modes at mutation time; authorization and pairing epoch cannot change during delayed operations; old callbacks cannot change a new pairing; deauthorization identity and fresh namespace remain fail-closed. Challenge failed-before-write, failed-after-write, uncertain readback, restart and in-memory-vs-durable state consistency.
3. **Relocation and scope reconciliation:** Verify three-stage journal/copy/finalize ordering; exclusion protection across crashes; no rollback of concurrent UI flags or unrelated exclusions; no premature journal clearing. Challenge UI vs runtime overlapping relocation, user-exclusion edit concurrency, and errors swallowed by notification paths.
4. **Regression quality:** Inspect `test/phase5-group-d-surface-lifecycle-integration.test.ts`, `test/plugin-data-integrity-regression.test.ts`, `test/phase6-alpha-plan-errors-stability.test.ts` and existing related coverage. Distinguish actual UI invocation versus an approximation by a direct host mutation; confirm delayed writes in BOTH orders, restart and old-pairing callback rejection, file-write fault semantics. Explicitly identify any untested material race or incorrect fixture expectation.
5. **Inherited controls:** Recheck G1-01–G1-06 including legacy partial-pairing state keys and prevention of trusted R1 BASE use on unrelated R2, destructive `trash-local` preconditions, malformed/missing `data.json` handling, state/pairing authority, DEC-343 artifact observations, and frozen BVP architecture.
6. **Evidence forensics:** Confirm verified Git source/tree, base and runtime, evidence as one child five files only; 11 PASS stages, BVP 403/403, product 1010/1010, development artifact bytes/hash *as recorded* (do not claim an independent binary rehash without one), prior BLOCKED source not confused with new PASS. Documentation commits after verified source are NOT product-verified implementation and do not automatically require PHX-CI rerun (§37.1).

**Locked DEC-344:** DEC-340-01 remains CONFIRMED / UNFIXED / owner-risk-accepted NON-BLOCKING *only* for software-only eligibility consideration. No waiver for newly discovered defects.

## Deliverable and stop

One **APPROVE / REJECT / INDETERMINATE** verdict on **this exact correction-level software-only integration eligibility**, not S09 completion, with source-grounded explanation and explicit G1-07, G1-06/inherited controls, PHX-CI evidence, residual physical risk, and DEC-340-01/DEC-344 treatment. Each material issue must include severity, immutable path/line references, causal mechanism, bounded correction and verification expectation.

No merge/release/activation/physical S09/Stage 3 authorization follows from approval. **Exact tasking location:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md` — S09 G1, with this assignment file.
