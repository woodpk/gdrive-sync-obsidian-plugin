# BVP-S07V — Primary-Stage PHX-CI Acceptance and Mandatory Architecture Review

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage

This is a complete prewritten verification contract. It has no implementation-repair authority.

## 0.1 Final Dispatch Binding

BVP-S07V is **BOUND / EXECUTABLE** as the stage-closing verification and mandatory pre-S08 architecture review.

Repository coordinates:

- verification branch: `bvp-s07v-primary-stage-acceptance`;
- exact integrated `phase6-integration` input: `b06013b8298cc8c9f88ea9ba2e4bdbea03660007`;
- exact S07 stage verification base / reviewed pre-S07 integration: `e15a61cfe23b29dbc67b04ededd009c6d6ee0c5d`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI framework version: `0.2.0-dev.2`;
- PowerShell baseline: 7.6.6;
- Node/npm baseline from latest accepted evidence: Node 22.23.2 / npm 10.9.8.

Accepted S07 child implementation / authoritative evidence lineage:

- S07A: `e243922afdabd49f42f94395243191231ff89ada` / `d836055376110f02a415fa5b8cf0e8c58e9ed6bd`;
- S07B: `25212a5101f02926348edaa6e5d7e32618c6bade` / `680f3671769ba145f953a95b34804089942fd2ad`;
- S07C: `1e5e7896df8e8288dad18831687cb21654197488` / `5fd3ff789a564935b4eed38732af0cd7aa0aecf6`;
- S07D: `b8f08eb08422006a636260dcb10163e2fa5d8437` / `19421e7816d881707c1d02a4d86fa6e9b8aee08b`;
- S07E: `abda511c8f2d701fbb4b285634a4baf43fad87f4` / `5420a270e024d4a2c639c6d4023ce21e0bb21a5d`;
- S07F: `70207ca23c71153f7831b14fad1dd3a155729b42` / `3ed9973aba739626239ad5bc010bdd2a256dec71`.

The integrated input also contains accepted dependency-security maintenance `f996086a7b8b1c3fc1e898bc3034ae4d5d719bdf` with authoritative evidence `b06013b8298cc8c9f88ea9ba2e4bdbea03660007`. That maintenance only overrides transitive Moment to 2.31.0, proves `npm audit` reports zero vulnerabilities, and has no product, framework-core, scenario, PowerShell, or production-artifact delta.

Architecture baselines:

- accepted S05 baseline: production source 16,533 LOC; production seam 112 LOC / 1 file; framework core 3,813 LOC / 10 modules; scenario catalog 2 / 46 LOC; BVP PowerShell 4 / 1,477 LOC; scenario-specific production / PowerShell 0 / 0;
- accepted S06 closure: production source 16,534 LOC; production seam 113 LOC / 1 file; framework core 3,864 LOC / 10 modules; scenario catalog 39 / 818 LOC; BVP PowerShell 4 / 1,477 LOC; scenario-specific production / PowerShell 0 / 0;
- current integrated S07 metrics: production source 16,670 LOC; production seam 113 LOC / 1 file; framework core 4,000 / 4,000 LOC / 10 modules; scenario catalog 70 / 1,524 LOC; BVP PowerShell 4 / 1,477 LOC; scenario-specific production / PowerShell 0 / 0; `main.js` 880,742 bytes, SHA-256 `9745d590e8348ce896f11b90321706546afded1b837fe12702e59b9b51452df4`.

Deterministic S07 requirement/evidence assignment to reconcile:

- S07A: `STATE-009`, `STATE-010`, `XFER-004`, `INV-004`; crash before dispatch/effect, after effect before canonical commit, around canonical state commit, ambiguous applied/not-applied remote outcomes, and fresh-runtime restart/recovery;
- S07B: corrupt/truncated/incompatible authoritative state, lost/invalid Drive cursor, partial change-page/listing completeness, missing managed root, root identity/protocol mismatch, and fail-closed recovery rather than empty-state authority;
- S07C: `STATE-003`, `STATE-007`, `STATE-016`, `PLAN-009`; cloned/restored device-state authority plus cancellation before effect, after effect, and repeated cancellation;
- S07D: `XFER-001`, `XFER-002`, `XFER-003`, `XFER-004`, `XFER-008`, `FILE-013`, `FAIL-002`, `FAIL-003`; transfer integrity, changing-during-transfer, safe replacement, retry-safe mutation, bounded retry/backoff/rate-limit behavior;
- S07E: `FAIL-004`, `FAIL-005`, `DELETE-005` through `DELETE-010`, applicable deterministic `CONFIG-001` through `CONFIG-009`, `LIFE-001`, `LIFE-002`, and `INV-020`; quota/disk failures, destructive circuit breaker/review checkpoint, protected configuration, and deterministic reconstruction/lifecycle preservation;
- S07F: `XFER-005`, `XFER-006`, `XFER-007`; bounded large-run handling, bounded host resource evidence, no arbitrary small file-size ceiling, large-file and large-vault correctness/measurement.

Target-system §13.2 reconciliation semantics remain owned/closed by S06V and are not reassigned to S07. S07V must nevertheless prove the complete repository suite still preserves that accepted coverage while validating the §13.3, §13.4, §13.5, and applicable deterministic §13.7 additions above.

Physical-only evidence remains out of scope: actual iOS/WebView constrained-resource behavior stays S09D; physical disable/uninstall/device unlink behavior stays S09E; S07V must not claim those checks.

Focused S07 stage command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/bvp/test-platform/test/s07a-crash-commit-ambiguity.test.js .test-build/bvp/test-platform/test/s07b-state-cursor-listing-root-recovery.test.js .test-build/bvp/test-platform/test/s07c-device-authority-cancellation.test.js .test-build/bvp/test-platform/test/s07d-transfer-integrity-retry-backoff.test.js .test-build/bvp/test-platform/test/s07e-quota-disk-destructive-config-lifecycle.test.js .test-build/bvp/test-platform/test/s07f-deterministic-scale-resource-measurement.test.js && node --test --test-name-pattern="S07D|transport honors Retry-After|quota exhaustion" .test-build/test/phase3-transport.test.js && node --test .test-build/test/s07f-large-transfer-resource.test.js`

S07V has no implementation-repair authority. Its writable handoff surface before PHX-CI is limited to this task record and the session index; canonical PHX-CI evidence files are generated by the existing verification path. Any discovered product or architecture defect must be routed to its causal owner rather than repaired inside S07V.


## 0.2 Authoritative Stage Acceptance / Architecture Review

BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage is **CLOSED / ACCEPTED**.

Authoritative stage evidence:

- verification input HEAD: `9a75f9a1b037519c22535395e40b5bbd3bcbf1ab`;
- authoritative PHX-CI evidence commit: `0b02a57b6667cfe4375ae1a8520871f69c2cd37e`;
- run ID: `1ef92ed1-d807-45c5-8781-7e46e8ae02de`;
- exact stage verification base: `e15a61cfe23b29dbc67b04ededd009c6d6ee0c5d`;
- complete persisted JSON, Markdown, and 7,161-line execution log reviewed before acceptance;
- change-set verification: PASS;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE;
- every required PHX-CI stage: PASS / exit 0;
- complete repository suite: 835/835 PASS, 0 failed, 0 skipped, 0 cancelled, 0 todo;
- `npm ci`: 0 vulnerabilities;
- production build verification: PASS;
- artifact: `main.js` 880,742 bytes, SHA-256 `9745d590e8348ce896f11b90321706546afded1b837fe12702e59b9b51452df4`.

Focused S07 stage evidence:

- integrated declarative S07A–S07F catalog: 56/56 PASS;
- S07D transport/retry focused tests: 5/5 PASS;
- S07F production large-transfer focused tests: 2/2 PASS;
- crash/ambiguity, state/cursor/root fail-closed recovery, clone/restore authority, cancellation, integrity/change-during-transfer, retry/backoff, quota/disk, destructive-safety/checkpoint, protected configuration, lifecycle reconstruction, and scale/resource evidence all execute through the accepted production/platform boundaries;
- representative intentionally wrong expectations fail deterministically in the focused catalog, proving the tests discriminate rather than merely green-path execute;
- restart/recovery scenarios reconstruct fresh runtime objects over retained simulated durable/external reality;
- destructive thresholds remain the production defaults; no test path lowers or disables them;
- scale evidence records host measurements only and introduces no unsupported performance SLA.

### Mandatory pre-S08 BVP-GOV-008 architecture review

Result: **PASS — S08 MAY PROCEED TO BINDING**.

Repository/architecture findings:

- architecture guard: PASS, 0 violations;
- production source: 16,670 logical LOC;
- approved production seam: 113 LOC / 1 file;
- framework core: 4,000 / 4,000 logical TypeScript LOC / 10 runtime modules;
- live-device agent/relay surface: 0 LOC / 0 files;
- scenario catalog: 70 scenarios / 1,524 logical LOC;
- BVP PowerShell: 4 scripts / 1,477 logical LOC;
- scenario-specific production source: 0 files;
- scenario-specific PowerShell: 0 files;
- production-module imports from the test platform remain at the single approved boundary count;
- from the accepted S05 baseline to S07 closure, framework core grows from 3,813 to 4,000 LOC while remaining at 10 modules; the growth is bounded and attributable to accepted generic deterministic controls, while scenario coverage grows from 2/46 LOC to 70/1,524 LOC;
- relative to the reviewed S07 stage base, framework core grows only 30 LOC with no new module; scenario definitions grow by 31 scenarios / 706 LOC;
- no new runner, router, state machine, persistence subsystem, evidence family, transport architecture, alternate synchronization engine, or live-device coordination architecture exists;
- the only S07 production-source delta is the previously accepted bounded cancellation-signal propagation repair across existing executor/controller paths; it adds no new production subsystem or seam;
- accepted generic test-platform changes extend the existing scenario/world fault-control vocabulary for automatic sync, persisted-state/cursor/root faults, cancellation boundaries, quota classification, and disk-full behavior without creating a parallel product policy engine;
- no S08 live-device agent, production receipt seam, command transport, Windows relay, or physical-validation architecture has begun.

Coverage reconciliation result: **PASS**. The explicitly assigned deterministic S07 requirement families are mapped to executable accepted evidence. Accepted S06 reconciliation coverage remains green in the full repository suite and is not reassigned to S07. Physical-only iOS/resource and installed-runtime lifecycle evidence remains correctly deferred to S09D/S09E.

S07V has no implementation-repair authority and performed none. This acceptance authorizes the supervisor to bind S08A hard execution facts in the next work step; it does not itself begin S08 implementation.

## 1. Objective

Independently verify completion of the deterministic Phase-6 evidence families assigned to S07 and perform the mandatory architecture review before any live-device architecture is allowed to begin.

## 2. Required Integrated End State

S07 may close only if deterministic executable evidence covers, where applicable to current product requirements:

- crash/interruption around physical effect and state commit;
- ambiguous remote outcomes;
- corrupt/truncated/incompatible state;
- lost/invalid cursor;
- partial/incomplete remote coverage;
- managed-root loss/replacement;
- clone/restore/stale device authority;
- safe cancellation;
- transfer integrity and changing-during-transfer;
- retry/backoff/rate-limit classification;
- quota/local-disk failures;
- destructive circuit breaker/recovery checkpoint;
- deterministic configuration/lifecycle invariants;
- bounded large-file/large-vault scale/resource measurements.

The common platform core must remain frozen/bounded; coverage growth should be dominated by scenario/fixture/test content.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact integrated `phase6-integration` SHA containing accepted S07 children;
- stage verification base;
- current PHX-CI pin/runtime;
- accepted S07 child implementation/evidence SHAs;
- complete current product requirement list assigned to deterministic S07 coverage;
- focused catalog/scale commands;
- S05/S06 architecture baseline and current metrics.

## 4. Verification Procedure

Independently:

1. reconcile every assigned deterministic requirement/evidence category to executable scenarios/evidence;
2. inspect S07 changes for scenario-only/default surface compliance;
3. verify fault injection remains boundary-based and does not encode product policy;
4. verify ambiguity, incomplete coverage, and corruption remain fail-closed;
5. verify restart tests use fresh runtime reconstruction;
6. verify safety thresholds were not weakened;
7. verify scale evidence does not invent performance requirements;
8. run authoritative integrated PHX-CI;
9. inspect canonical evidence and architecture metrics;
10. perform the mandatory pre-S08 BVP-GOV-008 architecture review.

## 5. Stage-Specific Acceptance Criteria

S07 passes only when:

- no material deterministic target requirement assigned through §13.2–§13.5 and applicable deterministic portions of §13.4/§13.7 remains unassigned;
- required scenario evidence passes;
- representative wrong expectations/failure cases prove tests are discriminating;
- no new runner/router/state-machine/persistence/evidence/transport architecture exists;
- scenario-specific production source = 0;
- scenario-specific PowerShell = 0;
- framework/core budgets pass;
- S05 common-core growth is justified and within authorized boundaries;
- PHX-CI overall PASS / compatibility COMPLETE / canonical evidence published;
- architecture review explicitly finds S08 may proceed, or blocks with the smallest required architecture decision.

## 6. Failure / Correction Semantics

Product defects discovered by deterministic evidence are product defects; do not change expected results to green them.

Architecture drift discovered here blocks S08 even when functional tests pass.

Corrective work must be routed to the causal owner; this verification task performs no implementation repair.

## 7. Non-Goals

Do not begin live-device agent, production receipt seam, command transport, or S09 physical coverage.

## 8. Completion / Stop

Only after all criteria pass and the architecture review authorizes continuation may the supervisor mark BVP-S07 accepted and bind S08A hard execution facts.

Stop after S07 acceptance.
