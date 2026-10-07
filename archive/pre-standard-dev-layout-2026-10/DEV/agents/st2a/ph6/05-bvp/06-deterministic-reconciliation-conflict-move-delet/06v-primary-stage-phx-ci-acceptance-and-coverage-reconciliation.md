# BVP-S06V — Primary-Stage PHX-CI Acceptance and Coverage Reconciliation

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`
**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage

This is a complete prewritten verification contract. It has no implementation-repair authority.

## 0.1 Coverage Reconciliation Resolution

The previously recorded pre-PHX coverage blocker is resolved by accepted prerequisite evidence `db1629c57f0b88513a16ad67cc5bf2f45abcd24a`. Independent reconciliation now finds every explicitly assigned S06 requirement/invariant mapped to executable scenario evidence. 06V is executable.

## 0.2 Authoritative Stage Acceptance Record

BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage is **CLOSED / ACCEPTED**.

- accepted integrated S06V input / verification HEAD: `072623e06fef30896d6d0d99b53d7486d2ddc94b`;
- authoritative S06V PHX-CI evidence SHA: `e155c9a1b7465617fa3d858f00673f8fd117e48e`;
- exact stage verification base / accepted S05 closure: `0a57e8cbf96b7512b0157886cc78bad260561448`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI change classification: `authorized-governance`;
- focused integrated S06 verification: PASS, 55/55;
- repository verification: PASS;
- build: PASS;
- repository check: PASS;
- overall verification: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- production source: 16,534 logical LOC (+1 from S05 baseline);
- production seam: 113 logical LOC / 1 file (+1 LOC / 0 files);
- framework core: 3,864 logical TypeScript LOC / 10 runtime modules (+51 LOC / 0 modules);
- scenario catalog: 39 scenarios / 818 logical LOC (+37 / +772);
- live-device agent/relay: 0;
- scenario-specific production files: 0;
- scenario-specific PowerShell: 0;
- BVP PowerShell: 4 scripts / 1,477 logical LOC;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`;
- assigned S06 requirement/invariant reconciliation: PASS with no unmapped assigned IDs after the accepted coverage repair.

Accepted S06 child/prerequisite lineage:

- S06A implementation/evidence: `926bc1c7afefeab72cc03ec9b689e32a082b898f` / `d0439e929a28238bf96f9f35cbda0e5297b48c02`;
- S06B text-version prerequisite: `194f00c012c09811e595a5aacbe1f112a7709df1` / `595483b2b459f89c05948d0b8e0a9b78bfaa0f1a`;
- S06B implementation/evidence: `e0cb7ed020c97287cec53508092d91993c853ac3` / `c1754311f999229b0fd53f89d3394f456ae6aedd`;
- S06C local-access/time prerequisite: `72a4e79ea69f0f0dad062cc7128115e6e3c22ce1` / `5ce98f0a1a132b3ef57491f1a2f9d987ed3b639a`;
- S06C implementation/evidence: `d45ba2b857a4dea6b0befafbce7a9bfe193ed3f2` / `401b3bd36ab6f32456663b09fff5909d4a1483a4`;
- S06D remote-move prerequisite: `ee96323b74a60d9cceeb71b7012e95af1da0f270` / `24a49a6c3400c18bf9d4e24da645df83298b4aea`;
- S06D implementation/evidence: `49e74a40f53971002f8bdbdb873a20d2fc09a957` / `8459471e714df74a3ad64b3dc57a2909f2eaa1fd`;
- S06E empty-folder prerequisite: `2e91eca2e884f1622e0e0dd8355b780ee4a037ae` / `5434525ba618faeb895751dfbca79e9010762fc3`;
- S06E implementation/evidence: `18b6f82a45dd86cc798ccfac14eb9b6cba772eb5` / `a3cd74a56a38427e424d5c7d8c75a72c28d1da22`;
- S06V assigned-coverage repair verification/evidence: `610c1372190aa3f0195bdf68322c63aac6ee1264` / `db1629c57f0b88513a16ad67cc5bf2f45abcd24a`.

Stage-level reconciliation confirms executable deterministic coverage for initialization, one-sided changes, text/binary conflicts, delete-vs-modify, attested deletion safety, unreadable paths, clock skew, stale-device behavior, stable-ID moves, ambiguous moves, path/case/Unicode collisions, exclusions, hidden files, unknown binary content, protected/unknown configuration boundaries, and empty folders.

This file is now a historical completion record and authorizes no further S06 implementation or repair work.

## 1. Objective

Independently verify the integrated S06 scenario catalog and reconcile it against all product reconciliation/conflict/move/deletion requirements assigned to S06.

## 2. Required Integrated End State

S06 may close only if executable deterministic coverage exists for:

- fresh local-only / remote-only / equal / divergent-no-base initialization;
- ordinary one-sided local/remote changes;
- clean text merge;
- true text conflict;
- binary conflict;
- delete-vs-modify both directions;
- ordinary local/remote deletion and both-deleted;
- no-base absence safety;
- unreadable path safety;
- clock-skew non-authority;
- stale-device safety;
- stable-ID moves/renames and ambiguous move handling;
- path/case/Unicode collisions;
- exclusions;
- unknown/unmanaged local/remote content;
- empty-folder behavior.

All scenarios must map to current product requirements and use the frozen common core.

## 3. Dispatch Binding — Hard Data Only

The S06V verification contract is bound as follows:

- exact integrated accepted S06 input before stage-gate binding: `0fd57b31ddba0d214bd79db5d21f794a68a4199d`;
- target verification branch: `bvp-s06v-primary-stage-acceptance`;
- exact stage verification base / accepted S05 closure: `0a57e8cbf96b7512b0157886cc78bad260561448`;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI change classification: `authorized-governance`, because the integrated S06 delta includes the separately accepted generic text-version production-seam prerequisite whose authoritative evidence records `changeClass=authorized-governance`;
- accepted S06A implementation / evidence: `926bc1c7afefeab72cc03ec9b689e32a082b898f` / `d0439e929a28238bf96f9f35cbda0e5297b48c02`;
- accepted S06B text-version prerequisite implementation / evidence: `194f00c012c09811e595a5aacbe1f112a7709df1` / `595483b2b459f89c05948d0b8e0a9b78bfaa0f1a`;
- accepted S06B implementation / evidence: `e0cb7ed020c97287cec53508092d91993c853ac3` / `c1754311f999229b0fd53f89d3394f456ae6aedd`;
- accepted S06C local-access/time prerequisite implementation / evidence: `72a4e79ea69f0f0dad062cc7128115e6e3c22ce1` / `5ce98f0a1a132b3ef57491f1a2f9d987ed3b639a`;
- accepted S06C implementation / evidence: `d45ba2b857a4dea6b0befafbce7a9bfe193ed3f2` / `401b3bd36ab6f32456663b09fff5909d4a1483a4`;
- accepted S06D remote-move prerequisite implementation / evidence: `ee96323b74a60d9cceeb71b7012e95af1da0f270` / `24a49a6c3400c18bf9d4e24da645df83298b4aea`;
- accepted S06D implementation / evidence: `49e74a40f53971002f8bdbdb873a20d2fc09a957` / `8459471e714df74a3ad64b3dc57a2909f2eaa1fd`;
- accepted S06E empty-folder prerequisite implementation / evidence: `2e91eca2e884f1622e0e0dd8355b780ee4a037ae` / `5434525ba618faeb895751dfbca79e9010762fc3`;
- accepted S06E implementation / evidence: `18b6f82a45dd86cc798ccfac14eb9b6cba772eb5` / `a3cd74a56a38427e424d5c7d8c75a72c28d1da22`;
- accepted S06V assigned-coverage repair verification HEAD / evidence: `610c1372190aa3f0195bdf68322c63aac6ee1264` / `db1629c57f0b88513a16ad67cc5bf2f45abcd24a`;
- focused S06 catalog command: `node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s06a-initialization-one-sided.test.js .test-build/bvp/test-platform/test/s06b-merge-conflict-delete-modify.test.js .test-build/bvp/test-platform/test/s06c-deletion-stale-clock-unreadable.test.js .test-build/bvp/test-platform/test/s06d-move-rename-identity-collision.test.js .test-build/bvp/test-platform/test/s06e-exclusions-unknown-empty-folders.test.js`;
- full integrated BVP command remains `npm run test:bvp-root`; full repository verification remains `npm test` through PHX-CI;
- assigned S06 requirements/invariants reconciled to executable scenarios: `FIRST-001`–`FIRST-005`; `PLAN-001`–`PLAN-003`, `PLAN-008`; `CHANGE-001`–`CHANGE-002`; `STATE-001`, `STATE-005`–`STATE-008`; `SYNC-013`; `CONFLICT-001`–`CONFLICT-006`; `DELETE-001`–`DELETE-003`; `REM-006`; `MOVE-001`–`MOVE-005`; `FILE-001`–`FILE-006`, `FILE-008`–`FILE-010`, `FILE-015`; `CONFIG-001`, `CONFIG-003`–`CONFIG-007`; and governing invariants `INV-001`, `INV-003`, `INV-005`–`INV-010`, `INV-016`, `INV-017`;
- coverage reconciliation result before PHX-CI: PASS; the previously unmapped `MOVE-004`, `FILE-004`, `CONFIG-006`, and `CONFIG-007` are now mapped by accepted executable scenarios;
- accepted S05 baseline: production source 16,533 logical LOC; production seam 112 LOC / 1 file; framework core 3,813 logical TypeScript LOC / 10 runtime modules; live-device 0; scenario catalog 2 scenarios / 46 LOC; scenario-specific production 0; scenario-specific PowerShell 0; BVP PowerShell 4 scripts / 1,477 LOC; production artifact 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`;
- current accepted S06 metrics: production source 16,534 logical LOC; production seam 113 LOC / 1 file; framework core 3,864 logical TypeScript LOC / 10 runtime modules; live-device 0; scenario catalog 39 scenarios / 818 LOC; scenario-specific production 0; scenario-specific PowerShell 0; BVP PowerShell 4 scripts / 1,477 LOC; production artifact unchanged;
- expected S06 stage delta from S05 baseline: production source +1 LOC, production seam +1 LOC / 0 files, framework core +51 LOC / 0 runtime modules, scenarios +37 / +772 LOC, live-device 0, scenario-specific production 0, scenario-specific PowerShell 0, BVP PowerShell 0 delta;
- 06V has no implementation-repair authority and no writable product/test-platform implementation allowlist; only this verification contract and canonical PHX-CI evidence/acceptance bookkeeping may change.

If any acceptance criterion fails, stop and assign the defect to its causal S06 child; do not repair it on the 06V branch.

## 4. Verification Procedure

Independently:

1. inspect all S06 scenario/fixture/test changes;
2. reconcile every assigned target requirement to executable scenario evidence;
3. verify no scenario-specific core/production/PowerShell changes were introduced;
4. verify each ordinary scenario ≤200 logical lines;
5. verify S05 common core metrics remain effectively stable except separately authorized generic corrections, if any;
6. run authoritative integrated PHX-CI;
7. inspect canonical evidence and architecture metrics.

## 5. Stage-Specific Acceptance Criteria

S06 passes only when:

- no material assigned reconciliation requirement is unmapped;
- all mapped scenarios pass;
- representative wrong expectations fail;
- scenario-specific production files/classes/interfaces = 0;
- scenario-specific PowerShell = 0;
- no new runner/persistence/evidence/transport architecture exists;
- per-scenario hard LOC limit passes;
- architecture guard/metrics PASS;
- PHX-CI overall PASS / compatibility COMPLETE / canonical evidence published.

Historical C03–D06 labels may be used only as traceability; acceptance is against current product requirements, not historical scenario symmetry.

## 6. Failure / Correction Semantics

If a scenario exposes a product defect, report it as a product defect rather than changing expected results to make the test green.

If a genuinely missing generic platform primitive is discovered, identify it as an architecture/supervisor blocker rather than allowing a scenario child to grow the core silently.

## 7. Non-Goals

Do not begin S07 or physical/live validation.

## 8. Completion / Stop

Only after all criteria pass may the supervisor mark BVP-S06 accepted and bind S07A hard execution facts.

Stop after S06 acceptance.
