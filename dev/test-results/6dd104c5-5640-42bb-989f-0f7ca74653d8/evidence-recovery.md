# PHX-CI canonical evidence layout recovery — integration DEC-339

**Run ID:** `6dd104c5-5640-42bb-989f-0f7ca74653d8`  
**Verified source:** `f1d4ce30ad89ddc5ab076ba24ba634b493241bc8`  
**Original evidence commit:** `7864af7d9e0f522215fee2a4c746c82ffb96f142`  
**Framework:** `0.2.0-dev.2` at SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`  
**Result:** PHX-CI `COMPLETE`; change-set `PASS`, repository `PASS`, overall `PASS`, exit 0.

This is **administrative evidence-path reconciliation only**, not new source verification. PHX-CI originally published `result.json`, `result.md`, and the full terminal `.log` at timestamp-prefixed paths directly under `dev/test-results/`. The canonical run-ID directory now **reuses their exact original Git blob SHAs** without modifying their bytes; the timestamp-named originals are retained unchanged. No SUT rerun was needed or performed to repair the evidence layout.

| Canonical path | Original immutable blob SHA |
| --- | --- |
| `result.json` | `25e4d0bbb427a93bb1f22fc721591065a1457aa7` |
| `result.md` | `200e16e4d8cfe1c531cf72bf0c5122c6d14c89d8` |
| `terminal.log` | `73a4227b6fa05e5df3b83563f227a9fafcfd8106` |

**Original source paths:** `dev/test-results/20261012T075900Z-operator-integration-dec339-postreview-master-reconcile-20261012-f1d4ce30ad89.{json,md,log}`.

**Recorded PHX-CI stages:** preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts: all PASS. Node 22.23.2; npm 10.9.8; PowerShell 7.6.6. Shipping artifact `main.js` measured 904453 bytes, SHA-256 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`.

**Administrative deviation:** the PHX-CI publisher's timestamp-based flat layout differed from current operating-protocol canonical per-run directory naming. It did not call substantive test results into question. The original PHX-CI `PASS` remains qualified to the exact verified source and **does not authorize master promotion, production activation or Stage 3**. Avoid redundant SUT execution to address this bookkeeping difference; repair any publisher behavior separately in PHX-CI under its own validation authority.
