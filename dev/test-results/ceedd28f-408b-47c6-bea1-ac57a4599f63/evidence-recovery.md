# PHX-CI canonical evidence — failed pre-DEC-339 baseline verification

**Run:** `ceedd28f-408b-47c6-bea1-ac57a4599f63`  
**Verified source:** `e554e49098ac86a446f9665a782aa8c8087237f9`  
**PHX-CI runtime:** `0.2.0-dev.2`, commit `69c4aa077d4a1a46d1e85e59f39d36285be99e83`  
**Original evidence publication commit:** `bce853340cdccc1695e857b51ca08d86890341b0`  
**Result:** **BLOCKED**, exit 201. Focused BVP **384 PASS, 4 FAIL, total 388**; full product suite **850 PASS/850**, stage exit 0. Build, repository-check, check and artifacts were unexecuted and have **no PASS claim**.

PHX-CI had published the original JSON, Markdown and complete terminal transcript as timestamp-prefixed flat paths in `dev/test-results/`. This directory reuses the **same immutable Git blobs**, rather than modifying or re-executing them. Originals remain intact. The layout repair does not change the substantive failed result.

| Canonical path | Original Git blob SHA |
|---|---|
| `result.json` | `7900f282a0c5615a3baa6853edc5bec01a606fe2` |
| `result.md` | `07f75f92560a385a2b6e634cde15bd0302f38cfb` |
| `terminal.log` | `5cc3b23ac874b1b8af7211beacb57867516c017a` |

Four failed checks: one stale metrics script-count expectation, two stale live-battery names/lists, and one missing deterministic battery registration for an already compiled S09A attribution-guard test. Their exact reproduction is in the attached PHX-CI terminal output. Tests/registration were corrected in `2bf6e97f75c6dddd714cdeaadfb9c756a39bbae3`; **fresh PHX-CI verification of the corrected source is required**, unlike a mere administrative rerun.

**Original flat prefix:** `dev/test-results/20261012T210604Z-operator-integration-pre-dec339-platform-baseline-20261012-e554e49098ac.`. No live Drive/vault validation occurred in this PHX-CI run.
