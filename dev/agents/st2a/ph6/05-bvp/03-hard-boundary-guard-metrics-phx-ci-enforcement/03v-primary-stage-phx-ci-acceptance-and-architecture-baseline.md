# BVP-S03V — Primary-Stage PHX-CI Acceptance and Architecture Baseline

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement

This is a prewritten verification contract. It has no implementation-repair authority.

## 1. Objective

Independently verify the fully integrated S03 result and establish the architecture/complexity baseline that all later BVP construction must preserve.

## 2. Required Integrated End State

S03 may close only if the integrated repository establishes all of the following together:

- physically separate `test-platform/**` root and production shipping isolation from S03A;
- durable architecture guard with valid positive/negative semantics from S03B;
- deterministic required metrics and hard budget gates from S03C;
- mandatory PHX-CI repository-check integration from S03D;
- machine-readable boundary manifest remains authoritative;
- canonical PHX-CI evidence exposes architecture/metrics results;
- production bundle remains free of BVP implementation;
- no simulator, runner, scenario catalog, live-device agent, or production validation mode has started early;
- recurring supervisor architecture review finds the integrated architecture consistent with the BVP target specification.

## 3. Dispatch Binding — Hard Data Only

The S03V verification contract is bound to the accepted integrated repository state as follows:

- current `phase6-integration` accepted S03D evidence head: `54f7a7df8e4f81c5ef973eb05251e30d3e0d4641`;
- exact S03 stage verification base (pre-S03 accepted predecessor): `376ab75477c863cceb63ff82475f352a8f4ec4cc`;
- target branch for integrated verification: `phase6-integration`;
- exact PHX-CI framework/runtime SHA: `2db2f3369ddb8e3ad6037861e116eaf83c8e2b1a`;
- accepted architecture-guard focused command: `npm run test:bvp-architecture-guard`;
- accepted architecture-metrics focused command: `npm run test:bvp-architecture-metrics`;
- accepted integrated BVP focused command: `npm run test:bvp-root`;
- accepted repository-check focused command: `npm run test:bvp-repository-check`;
- canonical repository-check entrypoint: `node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/src/repository-check.js`;
- S03A evidence SHA: `28462b854f4cefbae6f385e67835f8e5f0539918`;
- S03B evidence / promoted predecessor SHA: `78f5f8f7f118e280ee25710f567288a68ba69278`;
- S03C evidence / promoted predecessor SHA: `f76e65db6640df20d80e470f7773489d2f3d8cc4`;
- S03D evidence / promoted integration SHA: `54f7a7df8e4f81c5ef973eb05251e30d3e0d4641`.

Reference metrics from the accepted S03D authoritative repository-check evidence are:

- production source logical LOC: 16,421;
- production seam: 0 LOC / 0 files;
- framework core: 210 logical TypeScript LOC / 2 runtime modules;
- live-device agent/relay: 0 LOC;
- scenario definitions: 0 LOC / 0 scenarios;
- production modules imported by BVP: 0;
- BVP PowerShell: 4 scripts / 1,477 logical LOC;
- scenario-specific PowerShell: 0;
- scenario-specific production files: 0.

These values are reference evidence, not hard-coded acceptance substitutes. S03V must independently reproduce the integrated metrics under the accepted evaluator and record the fresh baseline.

No binding may alter S03 acceptance semantics.

## 4. Verification Procedure

The verifier must independently inspect, not merely trust child summaries.

At minimum:

1. reconcile integrated changed paths with accepted S03 child scopes;
2. inspect the boundary manifest, guard, metrics evaluator, tests, and PHX-CI consumer wiring;
3. run authoritative deployed-runtime PHX-CI against integrated `phase6-integration` with publication mode `push`;
4. inspect fresh canonical evidence;
5. confirm required negative guard cases genuinely fail and false-positive boundary tests pass;
6. confirm required metric families and hard budget failures are tested;
7. confirm repository check makes guard/metrics mandatory and failure-propagating;
8. confirm ordinary production build excludes `test-platform/**` and retains required production artifact integrity;
9. record the accepted architecture metrics baseline;
10. perform the BVP-GOV-008 repository-level architecture review.

## 5. Stage-Specific Acceptance Criteria

S03 passes only when:

- PHX-CI change-set verification PASS;
- PHX-CI repository verification PASS;
- overall PASS / compatibility COMPLETE / task exit 0;
- architecture guard PASS on integrated repository;
- architecture guard negative tests prove every BVP-GOV-002 prohibited family;
- syntax/textual-lookalike tests establish guard semantic validity for actual dependencies;
- all BVP-GOV-003 metrics are present;
- all BVP-GOV-004 budgets pass and negative budget tests fail as expected;
- repository-check wiring makes architecture failure acceptance-blocking;
- canonical evidence is published;
- no frozen governance surface changed outside accepted S03 ownership;
- production bundle separation proof passes;
- architecture review identifies no alternate runner/engine/evidence/persistence/transport architecture;
- baseline metrics are recorded for later delta review.

## 6. Failure / Correction Semantics

This gate does not repair implementation.

If a defect exists:

- identify the violated S03 contract and causal owner (03A/03B/03C/03D or supervisor authority);
- issue one complete bounded corrective work order for that ownership surface;
- do not add unrelated new requirements or serialize symptom-specific micro-fixes;
- re-run the affected integrated acceptance after correction.

## 7. Non-Goals

Do not:

- implement S04;
- redesign compliant S03 code because another mechanism is preferred;
- change hard budgets;
- create new platform abstractions;
- perform Stage 3.

## 8. Completion / Stop

Only after all criteria pass may the supervisor mark BVP-S03 accepted and bind S04A hard execution facts.

Stop after S03 acceptance. Do not begin S04 in this task.


## 9. Accepted Completion Record

BVP-S03 is accepted and S03V is complete / non-executable.

### Authoritative acceptance

- accepted S03V implementation/repair SHA: `35a0ab82c4a0f63db197100618b926b43da2e5f5`;
- authoritative S03V PHX-CI evidence / promoted integration SHA: `aec79fb0c5a9e0c0e48a81614a59b071e343e8f4`;
- stage verification base: `376ab75477c863cceb63ff82475f352a8f4ec4cc`;
- PHX-CI runtime: `2db2f3369ddb8e3ad6037861e116eaf83c8e2b1a`;
- change-set verification: PASS;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE / task exit 0;
- focused integrated BVP tests: 73 PASS / 0 FAIL;
- full repository tests: PASS;
- build: PASS;
- repository check: PASS;
- canonical evidence: published.

### Accepted S03 architecture baseline

- production source logical LOC: **16,421**;
- production seam: **0 LOC / 0 files**;
- BVP framework core: **210 logical TypeScript LOC / 2 runtime modules**;
- framework-core files: `test-platform/src/platform-root.ts`, `test-platform/src/repository-check.ts`;
- live-device agent / relay: **0 LOC**;
- scenario definitions: **0 LOC / 0 scenarios**;
- production modules imported by BVP: **0**;
- BVP PowerShell: **4 scripts / 1,477 logical LOC**;
- scenario-specific PowerShell: **0**;
- scenario-specific production files: **0**.

All BVP-GOV-004 hard budgets PASS.

### BVP-GOV-008 repository-level architecture review

**PASS.** The integrated S03 repository contains the intended boundary manifest, architecture guard, metrics/budget evaluator, canonical PHX-CI repository-check wiring, tests, and evidence only. The review found no alternate runner, alternate synchronization engine, second evidence architecture, general test persistence subsystem, platform router/plugin system, live-device agent, scenario execution system, production validation mode, or second transport/coordination architecture introduced by S03.

Production shipping isolation remains intact: the ordinary production build continues to bundle from `src/main.ts`, and the accepted artifact remains `main.js` at 872,862 bytes with SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

S03 is closed. This record authorizes no further S03 implementation work.
