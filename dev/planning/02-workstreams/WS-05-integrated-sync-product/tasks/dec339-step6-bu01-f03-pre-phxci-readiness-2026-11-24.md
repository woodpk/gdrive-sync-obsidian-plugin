# DEC-339 Step 6 / BU-01 / F03 — pre-PHX-CI source and coverage readiness

**Status:** Source and test authoring complete for first mandatory PHX-CI qualification; **NO typecheck, test, build, performance measurement, architecture gate or PHX-CI result has been executed or verified on this candidate.** No final Builder qualification, Reviewer handoff, activation, migration or deployment authorization. This is a provisional source-readiness audit, not PASS.

**Repository:** woodpk/gdrive-sync-obsidian-plugin
**Branch:** build/dec339-step6-metadata-bvp-20261124
**F03 implementation and test checkpoint:** `4613cb2c4e81e796f714a147b95bbe19b6f2b7d2` (prospective final candidate includes this documentation-only commit). Prior authorized design: `dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`; DEC-339/DEC-364/DEC-365. BU-01, handoff-count 0; no Reviewer handoff.
**Existing PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992` from phx-ci.json. **Existing software-only launcher:** `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1 -SoftwareOnlyBranch build/dec339-step6-metadata-bvp-20261124 -ExpectedSourceSha <exact final SHA>`. No physical BVP/Drive/device dispatch.

## Source review: exact change-set and ownership

From approved design commit `4b07acc2d499371a02e8429479a1e9984c13887e`, **21 production and test TS paths** changed (15 production + 6 test/BVP). No path deleted; no new PowerShell script or production schema upgrade. The existing four BVP/PHX-CI PowerShell scripts under dev/scripts remain exactly four, verified from candidate tree, but the *repository-check script-count gate has not been re-executed*. F02 prior SUT PASS 228/228 focused, 1376/1376 full at source `550fe83abcf7077353d665ef9d4942c0b045d6cc`; original overall BLOCKED script count, not transferable to new F03 source.

| Owner | Actual edited modules | Impact closure / invariant |
|---|---|---|
| WS-02 contracts/identity | src/contracts/verified-metadata-inventory.ts; src/state/verified-metadata-inventory-validation.ts | Canonical policy-tagged grant+scope fingerprint and optional coverage proof basis; old-policy receipts cannot be used as continuity receipts, no schema version bump |
| WS-03 OAuth/provider | src/drive/auth.ts; google-drive-port.ts; inventory-metadata-source.ts; verified-metadata-inventory-reader.ts; runtime.ts | Grant epoch rotates on reauthorization, survives token refresh; personal My Drive owned-object proof; complete scoped Changes including corpus removals; old baseline/global proof retained; changed IDs and affected occupancy with last horizon check |
| WS-02 persistence | src/state/indexeddb-inventory-storage.ts; verified-inventory-integration.ts | Trusted cursor/namespace binds remote observation; distinct local semantic/persistence revisions do not invalidate unchanged provider graph; no-advance reuse, learned-batch/cursor atomic CAS, lease and stage integrity; legacy path unchanged |
| WS-05 composition | src/product/inventory-backed-snapshot-assembler.ts; inventory-planning-cutover.ts; runtime.ts; product-controller-base.ts; snapshot-assembler.ts; verified-inventory-planning-projection.ts | Normal supported plans replay Changes without root-wide census, ordinary manual preview enabled after initial sync, physical full/periodic/recovery path retained; same planner, LOCAL and BASE, independent final fence and existing executor |
| WS-07 BVP | test-platform/test/batteries/deterministic-battery-registry.ts; test-platform/test/dec339-continuity-safety.test.ts; test-platform/test/deterministic-battery-registry.test.ts | Named `dec339-metadata-continuity` BVP battery with a single all-platform-tests registration; existing deterministic runner, no new seam or framework/pin change |
| Native tests | tests/unit/dec339-remote-reader.test.ts; tests/unit/dec339-continuity-authorization.test.ts; tests/integration/dec339-step4-observation-comparison.test.ts | Actual source reader, OAuth, shipping Google/IndexedDB/state/planner composition, negative/retry/persistence/corpus/metrics, independent legacy/full same-world comparisons |

No changes to src/product/production-executor.ts, independent operation preconditions, durable-intent recovery, delete/collision policy, authorizations or physical/live surfaces. Explicit baseline still includes complete marked-object proof and scan-window Changes; D339-06 executor optimization remains outside scope. Versioned policy requires fresh baseline at first use or changed grant/namespace; no implicit schema migration. A complete Changes feed cannot guarantee observing an out-of-contract silent provider omission; explicit/periodic full reconciliation remains.

### Step 4A static impact check and known verification limits

- **Static inspected:** relevant changed interfaces and all listed owner call boundaries, native integration fixture and existing BVP registry/discovery tests; exact source provenance and script path. Production code retains one publisher and one ProductSnapshotAssembler, not a second planner or mutation seam. Four existing PowerShell scripts and no additions. No GitHub Actions.
- **Dynamic NOT VERIFIED:** TypeScript program compilation, exact file discovery, full regression assertions, BVP architecture/LOC/budget gates, code coverage counts, mobile bundling, cursor publication behavior under actual IndexedDB, request/byte/latency/resource measurements, PHX-CI tooling and artifact publication. These are first-run PHX-CI obligations, not claimed PASS.
- **Performance risk to measure:** Combined account/domain proof calls and incremental reader's independent fence checks may remain costly despite removing global marked scans; the approved goal is to beat legacy incremental in meaningful workload/network payload metrics, not merely claim no global scan. Full periodic reconciliation still enumerates and may be comparatively expensive at the existing configured cadence. If measured results fail goals, repair the verified source and requalify affected checks.
- **Scope limit:** No real Google Drive or physical iOS access testing; BVP world exercises deterministic guards only, native integration runs actual shipping composition against synthetic provider/IndexedDB. Do not infer live provider reliability from simulation.

## Ten-family test adequacy map (authored; PASS still unverified)

| # | Family | Authored / existing executable coverage |
|---|---|---|
| 1 | Nominal | native DEC365 unchanged, stable-ID leaf delta, independent legacy/full plan parity, nested 24/128 scaling, unchanged horizon |
| 2 | Negative/boundary | malformed/repeated/empty intermediate Changes pages, unsupported drive change, ownedByMe/shared-drive, unmarked extra occupant, wrong grants, duplicate/collision and incomplete lists |
| 3 | State transitions | legacy disabled gate, opt-in/first-run baseline, changed grant rebaseline, scope change, explicit full/recovery, unsupported state/corpus |
| 4 | Repeat/retry/cancel/recovery | no-change no generation churn, repeated plan and restart, denied feed then safe retry, baseline recovery and existing cancellation/retry suite; planning has no direct mutation authority |
| 5 | Concurrency/interleavings | post-feed horizon race, changed account/domain/settings and final boundary race, existing cross-context CAS and stage publication faults |
| 6 | Persistence/restart | malformed/missing rows, trusted canonical persistence-only revision change, durable learned Changes and cursor/lease restart, transaction abort and prior generation preservation |
| 7 | Identity/security | OAuth client/grant epoch, no plaintext token in binding, paired account and root, domain metadata, personal My Drive and rejection of shared drive/app visibility uncertainty |
| 8 | Contract/integration | real shipping product snapshot assembly, canonical BASE, legacy incremental/full comparisons, no extra planner, BVP registry and complete suite static registration |
| 9 | Architecture/invariants | existing BVP architecture guard, frozen four-script budget, no shipping BVP imports or new production seam, single coordinated publisher, unchanged executor safeguards |
| 10 | E2E/fail closed | native no unsafe absence from incomplete local/remote, metadata mismatch/race, unmarked occupant, silent omission detected on explicit physical rebaseline; BVP existing stable-ID rename, incomplete changes, root identity, late ambiguous effect and destructive-safety worlds |

**Discovery requirement:** PHX-CI must show new `tests/unit/dec339-continuity-authorization.test.ts`, updated reader/integration tests, and BVP `dec339-continuity-safety.test.ts` actually compiled and executed, with no skips or suppressed failures. Assertions must stay strict; repair source or valid test defects with recorded rationale, never weaken an oracle solely to obtain PASS.

## PHX-CI verification and next action

Execute **only** the existing pinned PHX-CI software-only launcher for the exact committed source in an isolated clean `C:\temp\<32hex>\gdrive-sync-obsidian-plugin` checkout, with `-SoftwareOnlyBranch` and `-ExpectedSourceSha`; ordinary development artifact purpose; PHYSICAL dispatch disabled. Existing launcher invokes full PHX-CI with `npm run test:bvp-root` focused, native full tests, typecheck, build, artifact and repository checks; complete terminal log and canonical original `dev/test-results/<runId>/` evidence with push publication. Inspect actual candidate/run/artifact SHA, ten-family discovery/counts, zero routine global census, comparative numeric payload and request results, script-count and all architecture/quality gates. Treat a nonzero result as BLOCKED; distinguish substantive SUT vs administrative gate; preserve original evidence. No Reviewer handoff until complete substantive PASS and all original evidence published. Only after source qualification do separate authorized direct operational BVP exercises, if required, under DEC-350 and without converting them into a second software-validation harness. BU-02 begins only after BU-01 accepted closeout.
