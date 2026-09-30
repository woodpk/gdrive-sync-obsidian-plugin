# BVP-S06D — Move / Rename Identity and Path-Collision Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`
**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage
**Predecessor:** accepted S06D remote-move prerequisite closure `2a722bed8e052a483dc6ae6fa6dad830c7082d73`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Blocked Dispatch Record

S06D is blocked before scenario implementation because the frozen declarative scenario vocabulary cannot express an external REMOTE rename/move while preserving the same stable remote object identity.

The accepted in-memory Drive already implements identity-preserving `move(remoteObjectId, fromPath, toPath)`, but the scenario fixture vocabulary exposes only LOCAL move plus REMOTE put/remove. Reconstructing a remote rename as remove+create would allocate a different remote object ID and would therefore fail to prove `REM-006`, `STATE-004`, `MOVE-001`, `MOVE-002`, and `INV-010`.

This is a generic scenario-fixture exposure gap, not a product or synchronization-policy defect. S06D remains scenario-only and may not modify `test-platform/src/**`.

A separate prerequisite must expose only the existing identity-preserving in-memory Drive move through the common fixture family, prove exact dispatch/identity preservation and fail-closed validation, pass PHX-CI architecture budgets, and then be frozen before S06D is rebound.

## 0.2 Resolved Prerequisite Record

The remote-move fixture blocker is resolved by the accepted generic prerequisite:

- prerequisite implementation: `ee96323b74a60d9cceeb71b7012e95af1da0f270`;
- authoritative prerequisite evidence: `24a49a6c3400c18bf9d4e24da645df83298b4aea`;
- accepted prerequisite closure / S06D PHX-CI base: `2a722bed8e052a483dc6ae6fa6dad830c7082d73`.

The frozen fixture family now exposes the already-existing in-memory Drive identity-preserving move operation. S06D is therefore unblocked. The prerequisite is frozen infrastructure and is not writable by S06D.

## 0.3 Acceptance Record

S06D is complete and accepted.

- accepted predecessor / PHX-CI base: `2a722bed8e052a483dc6ae6fa6dad830c7082d73`;
- accepted implementation SHA: `49e74a40f53971002f8bdbdb873a20d2fc09a957`;
- authoritative PHX-CI evidence SHA: `8459471e714df74a3ad64b3dc57a2909f2eaa1fd`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused S06D verification: PASS, 12/12;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- framework core: unchanged at 3,851 / 4,000 logical TypeScript LOC;
- production seam: unchanged at 113 logical LOC / 1 file;
- scenario catalog: 28 scenarios / 675 logical LOC (+7 / +124);
- S06D scenarios: 16–19 logical LOC each, all within target/hard limits;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production: 0;
- scenario-specific PowerShell: 0;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted S06D coverage proves LOCAL and REMOTE identity-preserving moves, stable remote-object identity retention, ambiguous move no-guess behavior, destination collision preservation, case/Unicode collision refusal, and reserved-name refusal. Diagnostic refinement was limited to the focused S06D test surface and changed no product or platform-core behavior.

This file is now a historical completion record and authorizes no further S06D implementation work.

## 1. Objective

Add declarative deterministic coverage for stable-identity move/rename behavior, ambiguous move safety, and case/Unicode/path collision handling.

## 2. Required End State

Executable scenarios cover:

- local move/rename of an established managed object;
- remote move/rename preserving stable remote identity;
- two-sided/competing move conditions where target semantics define resolution or safe blocking;
- ambiguous move identity where path/timestamp evidence is insufficient;
- destination collision;
- case-only and Unicode-normalization-sensitive path conditions where product/platform policy requires deterministic handling;
- incompatible/invalid path behavior where deterministic policy is product-defined.

## 3. Dispatch Binding — Hard Data Only

The S06D execution binding is:

- accepted predecessor / PHX-CI base: `2a722bed8e052a483dc6ae6fa6dad830c7082d73`;
- prerequisite implementation/evidence: `ee96323b74a60d9cceeb71b7012e95af1da0f270` / `24a49a6c3400c18bf9d4e24da645df83298b4aea`;
- task branch: `bvp-s06d-move-rename-identity-collision`;
- target requirements: `REM-006`, `MOVE-001`–`MOVE-005`, `FILE-008`–`FILE-010`;
- governing invariants: `INV-010` and `INV-017`;
- completion evidence: target specification §13.2 identity-preserving local/remote rename, ambiguous rename no-guess, and path/Unicode/case collision blocking;
- new scenario files:
  - `test-platform/scenarios/06d/local-rename.ts`;
  - `test-platform/scenarios/06d/remote-rename.ts`;
  - `test-platform/scenarios/06d/ambiguous-local-move.ts`;
  - `test-platform/scenarios/06d/destination-collision.ts`;
  - `test-platform/scenarios/06d/case-collision.ts`;
  - `test-platform/scenarios/06d/unicode-collision.ts`;
  - `test-platform/scenarios/06d/invalid-target-path.ts`;
- focused test file: `test-platform/test/s06d-move-rename-identity-collision.test.ts`;
- writable allowlist: exactly the seven scenario files above plus that focused test file;
- focused PHX-CI command: `node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s06d-move-rename-identity-collision.test.js`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- change class: `ordinary`;
- accepted architecture baseline: framework core 3,851/4,000 logical TypeScript LOC; production seam 113 LOC/1 file; scenario catalog 21 scenarios/551 logical LOC; BVP PowerShell 4 scripts/1,477 logical LOC; scenario-specific production 0; scenario-specific PowerShell 0;
- required S06D core/production/PowerShell delta: 0;
- each new ordinary scenario targets ≤120 logical lines and must remain ≤200;
- no `test-platform/src/**`, `src/**`, `dev/scripts/**`, PHX-CI integration, governance, or architecture-metrics implementation changes are authorized.

No core change is authorized.

## 4. Required Semantics

### 4.1 Stable identity

A move/rename must be proven using the strongest production identity available—especially stable remote object ID/state mapping—rather than treating every path change as unrelated delete/create.

### 4.2 No path/timestamp guessing

When identity is ambiguous, the product must not invent a move solely from similar names, timestamps, or convenient path heuristics if the target specification requires blocking/preservation.

### 4.3 Collisions

When a destination path is already occupied or incompatible, the scenario must prove the target-required safe behavior: preserve data, block, conflict, or choose a deterministic compatible result as specified.

### 4.4 Case / Unicode

Scenarios must exercise the product's target semantics for platform-relevant case/Unicode path equivalence/collision without assuming all filesystems normalize identically.

This deterministic proof covers policy/adapter semantics, not final physical platform validation.

## 5. Invariants

- Stable remote identity is not replaced by timestamps.
- Ambiguity cannot be silently resolved into destructive movement.
- No duplicate move algorithm exists in scenario/world code.
- Scenario-only default remains intact.
- No scenario-specific production path-handling code.

## 6. Material Edge / Failure Cases

Required proof includes:

- local rename maps to same managed identity as required;
- remote move retains remote ID and maps correctly;
- collision does not overwrite unrelated content unsafely;
- ambiguous move blocks/preserves as required;
- case-only path condition behaves per target policy;
- Unicode-equivalent/colliding path condition behaves per target policy;
- wrong expected identity/path result fails.

## 7. Engineering Discretion

The agent may choose representative path strings/Unicode forms and scenario grouping, provided they exercise the actual current product requirements and remain portable in the deterministic test environment.

## 8. Dependencies

Consumes accepted S04 Drive stable-ID semantics and S06A–C coverage on the frozen S05 runner.

## 9. Acceptance Criteria

Required move/collision scenarios pass through real production logic, identity semantics are objectively asserted, ambiguity remains safe, requirement mapping is complete, no core/production changes occur, scenario/architecture budgets pass, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not claim deterministic simulation proves actual Windows/iOS filesystem behavior; physical representative cases belong to S09D.

Do not cover exclusions/unknown/empty folders (06E) or crash/fault recovery (S07).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario results, per-scenario LOC, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06E.
