# Dev Directory Standardization — Phase 1 Inventory

**Status:** COMPLETE — inventory/classification only; no existing repository file has been moved, rewritten, or deleted in this phase.

**Frozen source branch:** `automated-testing-platform-branch`  
**Frozen source SHA:** `5b57c1ded6d314810ac2cca2a363342e67d9bee3`  
**Migration branch:** `dev-directory-standardization-phase1`

## Inventory result

- Tracked files under `dev/**`: **844**
- Legacy PHX-CI run triples resolved to canonical run IDs: **105**
- Unresolved disposition rows: **0**
- `ACTIVE-MOVE`: **1**
- `ACTIVE-TRANSFORM`: **330**
- `ARCHIVE`: **510**
- `DEDUPLICATE`: **3**
- `REVIEW`: **0**

The complete per-file disposition is recorded in `dev/scratch/dev-directory-migration-disposition.csv`. Each row records the original path, blob SHA, byte size, disposition, intended destination, and rationale.

## Safety invariants

1. The manifest describes the immutable source tree at `5b57c1ded6d314810ac2cca2a363342e67d9bee3`; later branch commits do not change the inventory baseline.
2. No historical file is scheduled for silent deletion. Material removed from active `dev/**` is either archived under `archive/pre-standard-dev-layout-2026-10/DEV/**` or deduplicated only where an identified canonical copy/reference exists.
3. The 105 legacy flat PHX-CI result sets have been bound to their actual UUID `runId` values from the JSON evidence, enabling exact future paths under `dev/Test-Results/<runId>/`.
4. `dev/_ca-output.json` is classified as a deduplicate because its blob is exactly identical to the accepted S08V result JSON for run `cf16c8cc-179d-4fb9-8ca4-96aaad0bb742`.
5. This phase does not authorize the Phase-2 directory migration itself.
