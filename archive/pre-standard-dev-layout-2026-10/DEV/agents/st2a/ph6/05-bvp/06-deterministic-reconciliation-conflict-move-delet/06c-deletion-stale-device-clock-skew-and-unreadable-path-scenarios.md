# BVP-S06C — Deletion, Stale-Device, Clock-Skew, and Unreadable-Path Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`
**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage
**Predecessor:** accepted S06C generic-control prerequisite closure `77962c0ef118f41e661d0323fdaa10269a96336f`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Blocked Dispatch Record

S06C is blocked before scenario implementation because two required deterministic conditions cannot yet be expressed through the frozen declarative scenario vocabulary:

- local unreadable/inaccessible path state, although the accepted `InMemoryLocalVault.setAccess(...)` capability already models it;
- deterministic device-clock advancement for clock-skew/stale chronology, although each accepted `VirtualDeviceBacking` already owns a `DeterministicClock` with `set(...)` and `advanceBy(...)`.

The missing capability is an exposure gap in the existing `external-state` step family, not a product or synchronization-policy defect. S06C remains scenario-only and may not modify `test-platform/src/**`.

A separate generic prerequisite must expose only these existing deterministic controls through the common scenario contract/runner, prove fail-closed validation and dispatch, pass architecture budgets, and then be frozen before S06C is rebound.

## 0.2 Resolved Prerequisite Record

The S06C dispatch blocker recorded above is resolved by the accepted generic-control prerequisite:

- prerequisite implementation: `72a4e79ea69f0f0dad062cc7128115e6e3c22ce1`;
- authoritative prerequisite evidence: `5ce98f0a1a132b3ef57491f1a2f9d987ed3b639a`;
- accepted prerequisite closure / S06C PHX-CI base: `77962c0ef118f41e661d0323fdaa10269a96336f`.

The frozen declarative `external-state` family now exposes the already-existing local access-state and deterministic device-time controls required by this scenario-only child. S06C is therefore unblocked. The prerequisite is frozen infrastructure and is not writable by S06C.

## 0.3 Acceptance Record

S06C is complete and accepted.

- accepted predecessor / PHX-CI base: `77962c0ef118f41e661d0323fdaa10269a96336f`;
- accepted implementation SHA: `d45ba2b857a4dea6b0befafbce7a9bfe193ed3f2`;
- authoritative PHX-CI evidence SHA: `401b3bd36ab6f32456663b09fff5909d4a1483a4`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused S06C verification: PASS, 9/9;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- framework core: unchanged at 3,841 / 4,000 logical TypeScript LOC;
- production seam: unchanged at 113 logical LOC / 1 file;
- scenario catalog: 21 scenarios / 551 logical LOC (+7 / +200);
- S06C scenarios: 24–36 logical LOC each, all within target/hard limits;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production: 0;
- scenario-specific PowerShell: 0;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The first PHX-CI attempt correctly blocked because single-object destructive scenarios tripped the production mass-deletion safety threshold. The bounded repair preserved product safety semantics by modeling ordinary low-risk deletion against six managed paths rather than bypassing the checkpoint gate.

This file is now a historical completion record and authorizes no further S06C implementation work.

## 1. Objective

Add declarative deterministic coverage for deletion authority, stale-device safety, clock-skew non-authority, and unreadable/local-observation uncertainty.

## 2. Required End State

Executable scenarios cover:

- ordinary local deletion from an established synchronized base;
- ordinary remote deletion from an established synchronized base;
- both sides deleted;
- absence with no trustworthy base where deletion must not be inferred unsafely;
- unreadable/inaccessible local path;
- wall-clock skew that must not override stronger identity/state authority;
- stale device returning after newer shared state exists, proving no resurrection or destructive overwrite contrary to target policy.

## 3. Dispatch Binding — Hard Data Only

The S06C execution binding is:

- accepted predecessor / PHX-CI base: `77962c0ef118f41e661d0323fdaa10269a96336f`;
- prerequisite implementation/evidence: `72a4e79ea69f0f0dad062cc7128115e6e3c22ce1` / `5ce98f0a1a132b3ef57491f1a2f9d987ed3b639a`;
- task branch: `bvp-s06c-deletion-stale-clock-unreadable`;
- target requirements: `DELETE-001`–`DELETE-003`, `FILE-015`, `CHANGE-001`, `CHANGE-002`, `STATE-005`–`STATE-007`, `FIRST-005`, `PLAN-002`, `PLAN-003`, and `PLAN-008`;
- governing invariants: `INV-001`, `INV-003`, `INV-009`, and `INV-016`;
- target contracts/evidence: snapshot contract §6.1, deletion workflow §4.8, tombstone authority §7.5, reconciliation semantic evidence §13.2, and destructive-safety evidence §13.5;
- new scenario files:
  - `test-platform/scenarios/06c/local-deletion.ts`;
  - `test-platform/scenarios/06c/remote-deletion.ts`;
  - `test-platform/scenarios/06c/both-deleted.ts`;
  - `test-platform/scenarios/06c/no-base-absence.ts`;
  - `test-platform/scenarios/06c/unreadable-local-path.ts`;
  - `test-platform/scenarios/06c/clock-skew.ts`;
  - `test-platform/scenarios/06c/stale-device-return.ts`;
- focused test file: `test-platform/test/s06c-deletion-stale-clock-unreadable.test.ts`;
- writable allowlist: exactly the seven scenario files above plus that focused test file;
- focused PHX-CI command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s06c-deletion-stale-clock-unreadable.test.js`;
- full BVP command remains owned by PHX-CI through the repository's existing Node/TypeScript adapter configuration;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- change class: `ordinary`;
- accepted architecture baseline: framework core 3,841/4,000 logical TypeScript LOC; production seam 113 LOC/1 file; scenario catalog 14 scenarios/351 logical LOC; BVP PowerShell 4 scripts/1,477 logical LOC; scenario-specific production 0; scenario-specific PowerShell 0;
- required S06C core/production/PowerShell delta: 0;
- each new ordinary scenario targets ≤120 logical lines and must remain ≤200;
- no `test-platform/src/**`, `src/**`, `dev/scripts/**`, PHX-CI integration, governance, or architecture-metrics implementation changes are authorized.

No core change is authorized.

## 4. Required Semantics

### 4.1 Established-base deletions

Where authoritative state proves one side deleted a previously synchronized object, scenarios must prove production applies the target-required corresponding deletion/trash behavior without harming unrelated data.

### 4.2 Both deleted

Both-deleted state converges without recreation.

### 4.3 No-base absence safety

Absence on one side without sufficient trusted base/coverage cannot be treated as authoritative deletion merely for convenience.

### 4.4 Unreadable local path

Unreadable/inaccessible is not equivalent to absent.

The scenario must prove the product blocks/defers or otherwise follows the target-safe behavior rather than propagating destructive deletion from uncertainty.

### 4.5 Clock skew

Large local/remote clock differences must not become primary authority where product rules say timestamps are advisory only.

### 4.6 Stale device

A device returning with stale local/state information must not resurrect content that authoritative shared/newer state says was deleted, nor destroy newer valid content because its timestamps/state are stale.

Exact outcomes follow the product target specification and production authority model.

## 5. Invariants

- Absence, unreadable, and incomplete observation remain distinct.
- Timestamps do not replace authoritative identity/state/base semantics.
- Stale-device scenarios preserve newer authoritative user data.
- Scenario-only change surface remains default.
- No production synchronization changes are made to make tests pass.

## 6. Material Edge / Failure Cases

Scenarios must prove:

- local deletion propagation;
- remote deletion propagation;
- both-deleted no recreation;
- no-base absence does not cause unsafe deletion;
- unreadable path does not masquerade as deletion;
- extreme clock skew does not flip authority improperly;
- stale returning device cannot resurrect/degrade authoritative newer state;
- wrong expected destructive/non-destructive outcome fails.

If a required observation cannot be expressed by the frozen core, return `BLOCKED`.

## 7. Engineering Discretion

The agent may choose clock values, stale-state fixture chronology, and file contents while preserving the authoritative distinctions above.

## 8. Dependencies

Consumes accepted S06A/B and frozen S04/S05 platform.

## 9. Acceptance Criteria

All required scenarios execute deterministically through real production logic, target safety/authority semantics are asserted, wrong expectations fail, no core/production changes occur, scenario budgets and architecture metrics pass, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover:

- move/path collisions (06D);
- exclusions/unknown/empty folders (06E);
- corrupt state/cursor/root recovery (S07B);
- actual physical offline duration or clock APIs.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario results, per-scenario LOC, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06D.
