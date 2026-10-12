# PHX-CI canonical evidence recovery — pre-DEC-339 platform integration

**Run ID:** `3dc05b3e-08a8-4f3d-af25-7f653c2821e8`  
**Source:** `2ad791a07b210384c4572b37192407b49313a93e`  
**Run framework:** `0.2.0-dev.2`, exact SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`  
**Original evidence commit:** `6b8ff6fd99b60aeff72e53afdda4d330cbfd67e0`  
**Outcome:** **COMPLETE; all 11 stages PASS, change-set PASS, repository PASS, exit 0**.

The standard evidence publication created flat timestamp-prefixed `.json`, `.md`, and `.log` files at `dev/test-results/20261012T211425Z-operator-integration-pre-dec339-platform-baseline-20261012-2ad791a07b21.{json,md,log}`. This folder reuses the original **identical Git blobs** with canonical file names. Historical originals were not deleted or altered. This administrative action **did not rerun tests** and does not create a new SUT-verification claim.

| Canonical file | Source evidence blob SHA |
| --- | --- |
| `result.json` | `8347294a231963f9950d61ac99a314fb4b273f8e` |
| `result.md` | `7b6a3730ec82de2e4acec8f9d2c37e7d0b21a6f4` |
| `terminal.log` | `c2e5913ac9a6031c1f53e7af4803984b5fd73215` |

Observed PHX-CI stages: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts: **11/11 PASS**. Focused BVP **388/388 PASS**; full product **850/850 PASS**. Shipping artifact `main.js`: **902987 bytes**, SHA-256 `e6bd40f9f780c3940de61669309b2c54732a1968d20739ecfefc1f0a710ec19e`.

The previous FAILED run `ceedd28f-408b-47c6-bea1-ac57a4599f63` remains preserved separately, with repair documented in `dev/state/handoffs/current-engineering-handoff.md`. This green run supersedes its focused-test outcome only for the verified corrected source above.

**Independent review:** Not yet performed. PHX-CI PASS is not approval of the 1,612 preceding commits, merge into `master`, production inventory activation, BVP physical S09 acceptance, live Drive operations, plugin release, or Stage 3.
