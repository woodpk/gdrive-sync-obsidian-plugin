# Current Engineering Handoff

## Current state

The completed automated testing platform remains anchored to exact green source SHA `5b57c1ded6d314810ac2cca2a363342e67d9bee3`.

The repository is in the separate canonical `dev/**` standardization migration. Product behavior and BVP architecture are not being reopened.

## Completed standardization phases

1. Phase 1 — complete inventory/disposition of all original `dev/**` files.
2. Phase 2 — canonical directory skeleton and READMEs.
3. Phase 3 — canonical authority hierarchy.
4. Phase 4 — canonical target-system/workstream/verification planning hierarchy.
5. Phase 5 — canonical current state and concise handoff.
6. Phase 6 — retired legacy agent/prompt hierarchies and retained only future S09 task contracts under WS-07.
7. Phase 7 — canonicalized all 105 historical verification-result triples under exact `dev/Test-Results/<runId>/` directories and retired the old flat evidence surfaces.
8. Phase 9 — audited active path references, preserved the remaining pre-standard development trees under the external archive, and removed `dev/archive/`, `dev/evidence/`, `dev/governance/`, and `dev/planning-and-building/` from active `dev/`.

Phase 8 has **not** been executed and remains pending.

## Canonical active dev root

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

## Immediate next action

Execute Phase 8 strictly as plugin-repository housekeeping for `dev/scripts/`: classify the remaining scripts, archive obsolete historical helpers, and retain only scripts that belong in the canonical engineering-scripts directory.

No other repository is in scope for that work. Do not begin S09 or Stage 3 as part of this migration.
