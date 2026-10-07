# Dev Directory Phase 9 — Active Path Normalization Reconciliation

## Scope

Phase 9 normalized active repository references and retired the remaining noncanonical top-level development trees from active `dev/` after Phase 8 completed.

Historical archive material and immutable historical PHX-CI records were intentionally excluded from reference rewriting so provenance remains intact.

## Lineage correction

An earlier branch named `dev-directory-standardization-phase9` had executed Phase 9 out of sequence before Phase 8 and diverged from the completed Phase-8 lineage.

That stale branch was not force-reset and is not the authoritative Phase-9 result.

The authoritative Phase-9 continuation is:

`dev-directory-standardization-phase9-r2`

based directly on completed Phase-8 head:

`2d18de7b9828fc1a6bc205a614330d10b6ea8497`

The valid organizational intent from the out-of-sequence attempt was independently revalidated against the completed Phase-8 repository before reuse.

## Active-reference audit

The audit inspected the canonical development hierarchy, repository root configuration/build surfaces, GitHub workflow files, PHX-CI configuration and Taskfiles, AGENTS documentation, BVP governance/repository-check source, and architecture guard/metrics tests for live references to retired development paths and retired validation scripts.

Result:

- canonical authority/planning/state/research/reviews surfaces: no stale live path bindings;
- root build/workflow/configuration surfaces: no stale live path bindings;
- PHX-CI configuration and Taskfiles: no stale live path bindings;
- AGENTS documentation: no stale live path bindings;
- verification-platform source/tests: no stale live path bindings;
- the architecture-guard negative fixture intentionally uses `dev/archive/` only to prove that an archive nested beneath active `dev/` is rejected;
- historical/superseded decisions and migration inventory records that name old paths remain unchanged where rewriting them would destroy provenance;
- Phase-8 retired PowerShell validator/helper filenames are no longer used as active execution exceptions or live bindings.

## Legacy top-level tree retirement

The following pre-standard active directories were retired from `dev/`:

- `dev/archive/`
- `dev/evidence/`
- `dev/governance/`
- `dev/planning-and-building/`

Before removal, every one of the **366** Phase-8 source blobs under those trees was verified to have at least one exact blob-preserving copy under the external repository archive rooted at:

`archive/pre-standard-dev-layout-2026-10/DEV/`

Preservation result:

- source files retired: **366**
- exact archived blob matches: **366**
- missing archived source blobs: **0**
- blob-SHA preservation failures: **0**

Where a legacy alias collided with an older file already present at the nominal archive path, Phase 9 retained exact source-blob preservation elsewhere under the external archive rather than treating the older archived copy as proof of preservation.

## Canonical active dev root after Phase 9

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

No compatibility aliases were created for retired development paths.

This reconciliation records repository organization and migration provenance only. It does not create new product or architecture authority.

## Verification boundary

Phase 9 performed repository-structure, blob-preservation, and active-reference verification only.

No new authoritative PHX-CI acceptance run is claimed for Phase 9. Comprehensive executable verification of the completed repository-wide migration remains reserved for Phase 10.
