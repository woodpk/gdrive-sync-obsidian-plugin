# BVP-S07A Prerequisite — Verified-Not-Applied Restart Recovery Repair

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07A  
**Predecessor:** accepted ambiguity-prerequisite closure `3921e81d08be829070b83347539bc3809cf8fa57`  
**Triggering S07A evidence:** `50506113f51f0aa7450d5f3550aa861b6498545c`

## 0.2 Re-grounded Ready-for-Verification Record

The corrected prerequisite implementation is complete and ready for authoritative PHX-CI.

- repair branch: `bvp-s07a-prereq-file-create-recovery-r1`;
- implementation HEAD: `10e054423a790fe07dae2129e90961df8f24eb43`;
- PHX-CI base: `5ca1dbe0f2ed4918ae8ecca3b23196b02a3b6862`;
- failed predecessor hypothesis evidence retained at `94a4cda7215ef3a4eab9fa6367d6b12ce0786a49`;
- implementation scope: exactly six authorized non-test files plus the existing durable-intent recovery test; the frozen predecessor contract is restored byte-for-byte and is not part of the net implementation delta;
- REMOTE file-create recovery now mirrors the established folder-create design:
  - exact reserved-ID observation;
  - independent logical-target occupancy observation;
  - `authoritative-absent` only when both are proven;
  - incompatible/ambiguous evidence remains fail-closed;
  - no recovery read dispatches or mutates Drive;
- downstream `verified-not-applied` retirement succeeds only when durable authority proves the logical operation was actually removed;
- framework-core delta comes only from the deterministic virtual-world observer and is expected to move from 3,950 to approximately 3,973 logical LOC; PHX-CI metrics are authoritative;
- production seam / PowerShell / PHX-CI / governance delta: 0.

If PHX-CI accepts this prerequisite, BVP-GOV-008 architecture review is mandatory before S07A resumes.

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

## 3. Re-grounded Writable Allowlist

PHX-CI evidence `94a4cda7215ef3a4eab9fa6367d6b12ce0786a49` proved the original two-file hypothesis incomplete: persisted REMOTE file creates have no exact-ID/path recovery read seam, so complete reconciliation absence remains correctly classified `outcome-unknown` and never reaches the downstream `verified-not-applied` branch.

The prerequisite is therefore re-grounded to the smallest complete contract family, mirroring the existing REMOTE folder-create recovery architecture.

Authorized non-test paths:

- `src/contracts/synchronization-folder-create-foundation.ts` — add the read-only REMOTE file-create recovery observation contract/verifier on the existing additive successor surface; `src/contracts/synchronization-foundation.ts` remains byte-identical to its frozen predecessor;
- `src/drive/google-drive-port.ts` — implement the seam using existing exact-ID and logical-path topology reads;
- `src/product/durable-intent-recovery-base.ts` — consume verified file-create recovery outcomes and safely retire proven no-effect work;
- `src/product/durable-intent-recovery.ts` — use the same seam in wrapper/matching recovery paths;
- `src/product/product-controller.ts` — wire the read-only dependency;
- `test-platform/src/virtual-world/virtual-world.ts` — implement/wire the deterministic in-memory equivalent.

Authorized test path:

- `test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts`.

No planner, execution coordinator, lifecycle state-machine redesign, production seam, PowerShell, PHX-CI, governance, or architecture-metrics source changes are authorized.

The new read seam MUST be observation-only. `authoritative-absent` requires both exact reserved-ID absence and an unoccupied intended logical target; incomplete/ambiguous evidence remains fail-closed.

## 4. Required Verification

Add focused regression coverage proving the exact-ID/path recovery seam and downstream retirement behavior:

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
- framework core remains <=4,000; expected post-repair value is approximately 3,973 pending authoritative PHX-CI metrics;
- production seam remains 113 LOC / 1 file;
- scenario-specific production remains 0;
- production artifact behavior changes only as implied by this product recovery repair and PHX-CI artifact/hash evidence is recorded;
- architecture guard/metrics PASS;
- authoritative PHX-CI PASS / compatibility COMPLETE.

PHX-CI change class: `ordinary`.

Stop after prerequisite acceptance. Do not repair or resume S07A scenarios on this prerequisite branch.
