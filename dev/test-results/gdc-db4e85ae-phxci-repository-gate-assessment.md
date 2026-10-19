# S09 G1 — PHX-CI substantive PASS / repository gate escalation

GDC: db4e85ae-69e0-41bb-8cd9-0ac0dd78cdc8
Exact verified candidate: 1bcf4cef2886fa5d595041b887c2bb6e10a4bd05
PHX-CI Run: 28fb2dad-8771-49f2-9842-2cf39cb966fc
Canonical evidence commit: edaef154bbf034fb1224c991e4ffdda7f97f4b97
Operator evidence commit: 4dabc2ae8c39bcbe7463fa760f1a31f446ed1937
Runtime: 69c4aa077d4a1a46d1e85e59f39d36285be99e83
Accepted baseline: b1e2ebaee3077e34a4eefaf601ee8124078b7400

## Results

Change-set PASS, repository verification PASS; typecheck PASS, focused tests PASS, full `npm test` PASS, build PASS, artifacts PASS. Repository-check FAIL, so overall BLOCKED (exit 201). Preserve the complete successful SUT verification evidence. No duplicate test/build run to cure administrative metadata.

## Two objectively observed acceptance blockers

1. Frozen BVP architectural guard: `ARCH_GUARD_VIOLATION rule=FROZEN_SURFACE_CHANGED path=test-platform/src/repository-check.ts`. Baseline blob `b84d9fe301edce49d44c65448725243792f25c7d`; candidate blob `62cf545c87c549de8a6a262dc4b6e91355298f05`. Exact change in source: development-artifact observation condition relaxed from `(!context || changeClass !== "authorized-governance")` to `!context`. This is an inherited supervisor-owned source/guard alteration and **not** a Tester-owned test assertion or import defect. It requires Builder to restore baseline frozen source or acquire/record the exact authorized governance exception; no silent acceptance/guard weakening.
2. `SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=main.js`: built SHA-256 `6bb0012cb21a244a2f53a44b7bdcf3203b6284070bb3b725d7b32d919c2b881d` differs from frozen approved list `e6bd40f9...,` `4106faaf...`, `acf331b0...`. The candidate includes deliberate Builder production changes. Shipping identity acceptance is not automatically unlocked by tests passing. Builder must establish the correct owner-governed artifact authorization/accepted baseline path, not silently change an allowlist or classify ordinary changes as governance work.

No modification of production, frozen framework, or acceptance guards by Tester. Builder/domain authority for repository/platform integration and correction. After authorized correction, Tester must decide minimum justified PHX-CI scope: preserve already proven substantive SUT pass unless the correction affects it. Do not rerun only to obtain nicer administrative output. Complete final acceptance by Reviewer after qualifying repository gates/evidence.

Classification: substantive SUT PASS; repository governance gate FAIL; overall BLOCKED. No Owner promotion/activation authority assumed.
