# BVP-S06B Prerequisite — Generic Text-Version Composition Parity

## Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Predecessor:** accepted S06A closure `109a4ac26309ccd5c22de6eb70420af410c2a8d8`  
**Branch:** `bvp-s06b-prereq-text-version-composition`

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
