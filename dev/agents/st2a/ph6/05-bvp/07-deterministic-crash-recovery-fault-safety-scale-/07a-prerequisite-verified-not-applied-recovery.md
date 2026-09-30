# BVP-S07A Prerequisite — Verified-Not-Applied Restart Recovery Repair

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07A  
**Predecessor:** accepted ambiguity-prerequisite closure `3921e81d08be829070b83347539bc3809cf8fa57`  
**Triggering S07A evidence:** `50506113f51f0aa7450d5f3550aa861b6498545c`

## 0.1 Ready-for-Verification Record

Implementation is complete and ready for authoritative PHX-CI.

- implementation HEAD: `1f7d80fcdb34e3b7800d4d733a5f1fb59f7c39cb`;
- PHX-CI base: `df7aacce0e3568455a80c7c08f32795004d3583f`;
- production implementation delta: +8 logical/nonblank LOC in `src/product/durable-intent-recovery-base.ts`;
- focused regression delta: +52 logical/nonblank LOC in the existing durable-intent recovery test;
- framework-core delta: 0;
- production-seam delta: 0;
- PowerShell / PHX-CI / governance delta: 0;
- regression coverage includes:
  - `dispatch-authorized` verified-not-applied retirement;
  - `outcome-unknown` verified-not-applied retirement;
  - no false canonical success commit;
  - no physical redispatch;
  - ordinary controller planning resumes after retired no-effect work;
  - partially progressed multi-effect work remains fail-closed.

If accepted, this prerequisite becomes implementation child #2 since the post-crash-prerequisite architecture review, so BVP-GOV-008 requires a repository-level architecture review before S07A proper resumes.

## 1. Objective

Repair the existing durable restart-recovery path so a physical result proven `verified-not-applied` is treated as successful retired recovery **only when** the durable lifecycle has in fact retired the entire logical operation. Ordinary planning must then be allowed to resume from current LOCAL/REMOTE/canonical reality.

This is a bounded production bug repair. It does not redesign durable intent semantics, retry policy, ambiguity handling, or synchronization planning.

## 2. Demonstrated Defect

`DurableEffectLifecycleCoordinator.recordPhysicalResult(...)` already has the correct no-effect retirement semantics:

- if physical reality is `verified-not-applied`;
- and no sibling effect has crossed dispatch;
- it removes the operation intent/local transaction authority and returns `verified-not-applied`.

But `recoverOne(...)` currently rejects that successful result because it accepts only `effect-verified` and `already-progressed`.

Required correction:

- when `recordPhysicalResult(...)` returns `verified-not-applied`, verify from the returned/reloaded authority that the logical operation intent is absent;
- if absent, return successful recovery with `changed:true` and `retired:true`;
- if the operation intent still exists, remain fail-closed as recovery-required; do not infer that a partially progressed multi-effect operation can be retired.

## 3. Writable Allowlist

Exactly:

- `src/product/durable-intent-recovery-base.ts`;
- `test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts`.

No planner, execution coordinator, lifecycle state-machine, production seam, test-platform core, PowerShell, PHX-CI, governance, or architecture-metrics source changes are authorized.

## 4. Required Verification

Add focused regression coverage proving:

1. a `dispatch-authorized` single-effect REMOTE create whose persisted physical observation proves authoritative absence:
   - returns `recovered`;
   - counts the operation as retired;
   - removes the durable operation intent;
   - performs no physical redispatch;
   - performs no false canonical success commit;

2. an `outcome-unknown` single-effect REMOTE create with the same proven absence has the same safe retirement behavior;

3. controller pre-planning recovery drains the verified-not-applied retired work and then invokes ordinary planning in the same bounded preview flow rather than surfacing recovery-required/no-plan;

4. state-committed/effect-verified existing recovery behavior remains unchanged;

5. partially progressed multi-effect work is not silently retired by the new branch.

## 5. Acceptance

- focused durable-intent recovery tests PASS;
- complete repository suite/build/repository checks PASS;
- production source delta is limited to the bounded recovery correction;
- framework core remains 3,950 / 4,000 with zero delta;
- production seam remains 113 LOC / 1 file;
- scenario-specific production remains 0;
- production artifact behavior changes only as implied by this product recovery repair and PHX-CI artifact/hash evidence is recorded;
- architecture guard/metrics PASS;
- authoritative PHX-CI PASS / compatibility COMPLETE.

PHX-CI change class: `ordinary`.

Stop after prerequisite acceptance. Do not repair or resume S07A scenarios on this prerequisite branch.
