# BVP-S06V Prerequisite — Assigned-Coverage Reconciliation Repair

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S06V  
**Predecessor:** post-S06E architecture-reviewed integration `47129c8bdfc396862341b3b5135df560eef3d535`

## 0.1 Ready-for-Verification Record

Implementation is complete and ready for authoritative PHX-CI.

- implementation HEAD: `a76769675984e830239875827e6cd2d2af1006fd`;
- PHX-CI base: `791806113f336a42b8589fc4502fcad9c79be289`;
- changed implementation paths: exactly the five writable allowlist paths;
- repaired mappings: `MOVE-004`, `FILE-004`, `CONFIG-006`, `CONFIG-007`;
- platform-core / production / PowerShell delta: 0;
- new scenarios: 13 logical LOC each.

## 1. Objective

Repair the four coverage-traceability gaps independently discovered during S06V pre-PHX reconciliation:

- `MOVE-004`;
- `FILE-004`;
- `CONFIG-006`;
- `CONFIG-007`.

This is scenario/test coverage repair only. It does not authorize product or platform-core changes.

## 2. Required Repair

- Extend the existing accepted REMOTE rename scenario traceability to `MOVE-004`; the scenario already executes the production identity-preserving REMOTE→LOCAL move path through the canonical local mutation port.
- Add one ordinary hidden/dotfile scenario proving a non-excluded hidden ordinary vault file synchronizes under `FILE-004`.
- Add one own-plugin settings scenario proving protected/device-local `brain-google-drive-sync` configuration remains local under `CONFIG-006`.
- Add one third-party plugin settings scenario proving unknown/unclassified plugin configuration remains local by default under `CONFIG-007` / `CONFIG-003`.
- Extend existing focused S06D/S06E tests only as necessary to execute and objectively assert these repaired mappings.

## 3. Writable Allowlist

Exactly:

- `test-platform/scenarios/06d/remote-rename.ts`;
- `test-platform/scenarios/06e/hidden-dotfile-included.ts`;
- `test-platform/scenarios/06e/own-plugin-settings-protected.ts`;
- `test-platform/scenarios/06e/third-party-settings-excluded.ts`;
- `test-platform/test/s06e-exclusions-unknown-empty-folders.test.ts`.

No production, `test-platform/src/**`, PowerShell, PHX-CI, governance, persistence, evidence-system, or architecture-metrics implementation changes are authorized.

## 4. Acceptance

- all four previously unmapped assigned requirements have executable scenario traceability;
- each added scenario remains ≤200 logical LOC and targets ≤120;
- wrong expectations still fail deterministically through the existing focused suite;
- framework-core delta is 0;
- scenario-specific production and PowerShell remain 0;
- architecture guard/metrics PASS;
- authoritative PHX-CI PASS / compatibility COMPLETE.

Stop after prerequisite acceptance. Do not execute 06V until this repair is accepted and frozen.
