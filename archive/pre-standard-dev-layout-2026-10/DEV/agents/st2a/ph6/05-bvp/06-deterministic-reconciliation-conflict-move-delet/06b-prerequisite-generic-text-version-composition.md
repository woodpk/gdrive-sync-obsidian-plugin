# BVP-S06B Prerequisite — Generic Text-Version Composition Parity

## Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Predecessor:** accepted S06A closure `109a4ac26309ccd5c22de6eb70420af410c2a8d8`
**Branch:** `bvp-s06b-prereq-text-version-composition`

## Acceptance Record

This prerequisite is complete and accepted.

- accepted S06A predecessor / PHX-CI base: `109a4ac26309ccd5c22de6eb70420af410c2a8d8`;
- accepted prerequisite implementation SHA: `194f00c012c09811e595a5aacbe1f112a7709df1`;
- authoritative PHX-CI evidence SHA: `595483b2b459f89c05948d0b8e0a9b78bfaa0f1a`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused virtual-world production canaries: PASS, 9/9;
- integrated BVP tests: PASS, 177/177;
- full repository verification: PASS;
- PHX-CI overall: PASS / compatibility COMPLETE;
- architecture guard: PASS;
- framework core: 3,827 / 4,000 logical TypeScript LOC;
- production seam: 113 logical LOC / 1 file;
- scenario catalog: unchanged at 9 scenarios / 208 logical LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- production artifact: unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted production-parity composition now supplies one device-local `ProductTextVersionStore` to both the production conflict resolver and production executor, with persistence retained across virtual runtime reconstruction. The final regression verifies clean three-way merge convergence through the immutable-candidate REMOTE update protocol, including retirement of the predecessor object and promotion of the merged candidate.

This file is now a historical completion record and authorizes no further prerequisite implementation work.

## Objective

Repair the generic deterministic virtual-world composition defect exposed by S06B: compose the existing production `ProductTextVersionStore` exactly as the shipping runtime does so the real production `ThreeWayConflictResolver` can materialize BASE/LOCAL/REMOTE recognized text and merged-output evidence.

This is a generic production-parity prerequisite. It does not own S06B scenarios or merge policy.

## Writable Allowlist

- `src/product/local-vault-boundary-seam.ts`
- `test-platform/src/virtual-world/virtual-world.ts`
- `test-platform/test/virtual-world.test.ts`

No other implementation path may change.

## Required End State

- the approved non-shipping seam exports existing `ProductTextVersionStore` and `MemoryTextVersionPersistence`;
- each virtual device retains device-local in-memory text-version persistence across runtime reconstruction;
- virtual-world runtime construction passes one `ProductTextVersionStore` to both `ThreeWayConflictResolver` and `ProductSynchronizationExecutor`, mirroring production runtime composition;
- no BVP merge algorithm, scenario-specific branch, alternate evidence family, or production behavior is added;
- a focused production-path regression proves a synchronized common text base plus non-overlapping local/remote edits yields `clean-text-merge` and converges to merged content;
- existing BVP/repository verification and architecture budgets remain PASS.

## Stop

After authoritative verification and acceptance, promote this prerequisite and rebind S06B. Do not add S06B scenario files in this prerequisite.
