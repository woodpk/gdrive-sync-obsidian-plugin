# BVP-S08V — Primary-Stage PHX-CI Acceptance and Architecture Review

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport

This is a complete prewritten verification contract. It has no implementation-repair authority.

## 1. Objective

Independently verify the integrated live-validation architecture, budgets, production seam, transport, Windows canary, and shipping-bundle separation before strategic Windows/iOS physical coverage begins.

## 2. Required Integrated End State

S08 may close only if:

- the production terminal run-receipt seam is minimal, authoritative, enumerated, and within budget;
- separate validation-only Obsidian build/entrypoint exists;
- bounded device command agent implements run/device/sequence safety;
- no device-local scenario engine exists;
- selected command transport/optional Windows relay requires no hosted backend/new OAuth scope/token export;
- external live executor owns scenario sequence/verdict;
- human checkpoints are explicit and resumable;
- desktop live canary proves real production-path execution;
- ordinary production artifact excludes validation-only agent/transport/scenario/fault code;
- all architecture budgets pass.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact integrated `phase6-integration` SHA containing accepted S08 children;
- stage verification base;
- current PHX-CI pin/runtime;
- accepted S08 child implementation/evidence SHAs;
- exact production seam enumeration;
- exact production/validation artifact identities;
- Windows live-canary evidence/run identity;
- S07 architecture baseline and current metrics.

## 4. Verification Procedure

Independently:

1. inspect all S08 production/test-platform/build/transport changes;
2. verify production seam semantics and ≤350 LOC / ≤4 production files;
3. verify live-agent/relay subset ≤750 logical TypeScript LOC;
4. verify validation build is distinct from ordinary production build;
5. verify production artifact exclusion;
6. inspect command protocol for run/device/sequence duplicate/staleness safety;
7. verify transport has no new OAuth scope/backend/token export;
8. verify external runner—not devices—owns scenario state/verdict;
9. inspect human checkpoint semantics for explicit action/resume evidence;
10. review desktop canary physical evidence bound to exact build/device/run;
11. run authoritative integrated PHX-CI and inspect canonical evidence;
12. perform the required architecture review before S09.

## 5. Stage-Specific Acceptance Criteria

S08 passes only when:

- PHX-CI overall PASS / compatibility COMPLETE / canonical evidence published;
- production seam budget passes;
- live-agent/relay budget passes;
- core total budget passes;
- shipping-exclusion guard passes;
- desktop live canary demonstrates actual production path;
- stale/duplicate/mismatch safety is demonstrated;
- no scenario engine/distributed workflow system appears on device;
- no additional OAuth scope/token export/hosted backend appears;
- architecture review authorizes S09 physical coverage.

## 6. Failure / Correction Semantics

A failed physical canary is not repaired by weakening assertions or substituting deterministic evidence.

Architecture drift blocks S09 even if the canary is green.

Corrective work is routed to the causal S08 child; this verification task performs no implementation repair.

## 7. Non-Goals

Do not begin S09 physical coverage or Stage 3.

## 8. Completion / Stop

Only after all criteria pass may the supervisor mark BVP-S08 accepted and bind S09A physical execution facts.

Stop after S08 acceptance.
