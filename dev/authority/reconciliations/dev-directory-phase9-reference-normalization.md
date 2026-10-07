# Dev Directory Phase 9 — Active Path Normalization Reconciliation

## Scope

Phase 9 normalized active repository references and retired the remaining noncanonical top-level development trees from active `dev/`.

Historical archive material and immutable historical test-result records were intentionally excluded from reference rewriting so provenance remains intact.

## Active-reference audit

The audit inspected the canonical development hierarchy, repository root configuration/build surfaces, and verification-platform source/tests for live references to retired development paths.

Result:

- canonical authority/planning/state/research/reviews surfaces: no stale live path bindings;
- root build/workflow/configuration surfaces: no stale live path bindings;
- verification-platform source/tests: no stale live path bindings, excluding an intentional negative fixture that proves `dev/archive/` is invalid;
- historical/superseded decisions that name old paths remain unchanged because rewriting them would destroy decision history;
- two legacy helper scripts under `dev/scripts/` still contain retired evidence-path assumptions and are explicitly owned by the still-pending Phase 8 script-cleanup work rather than Phase 9.

## Legacy top-level tree retirement

The following pre-standard active directories were retired from `dev/`:

- `dev/archive/`
- `dev/evidence/`
- `dev/governance/`
- `dev/planning-and-building/`

Before deletion, the exact frozen-source contents from `5b57c1ded6d314810ac2cca2a363342e67d9bee3` were preserved under:

`archive/pre-standard-dev-layout-2026-10/DEV/`

Preservation result:

- files preserved: **366**
- missing archive copies: **0**
- blob-SHA mismatches: **0**

## Canonical active root after Phase 9

```text
dev/
  README.md
  _ca-output.md
  authority/
  planning/
  research/
  state/
  reviews/
  scripts/
  Test-Results/
  scratch/
```

This reconciliation records repository organization only. It does not create new product or architecture authority.
