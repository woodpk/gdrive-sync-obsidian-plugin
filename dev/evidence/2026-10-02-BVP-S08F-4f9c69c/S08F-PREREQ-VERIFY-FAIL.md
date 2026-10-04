# S08F Multi-Root Folder Recovery Prerequisite Verification

- Overall: **FAIL**
- Verification base: 39cf1ff62fb927aba9d2ee49f99724d9ce1f2856
- Input candidate: 8c84644031fe6324bac2137eaa75f46e9590ce7b
- Verified candidate: 8c84644031fe6324bac2137eaa75f46e9590ce7b
- Production main.js: 886436 bytes / 2082c5d216e71306b78c7235f4ed75186a452738a78f81dffc9dda99d67a1dc9

| Stage | Status | Classification | Summary |
|---|---|---|---|
| toolchain | PASS | TOOLCHAIN READY | Node v22.23.2; npm 10.9.8; deterministic native child PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\WINDOWS\System32;C:\WINDOWS;C:\WINDOWS\System32\WindowsPowerShell\v1.0 |
| repository-identity | PASS | EXACT SOURCE IDENTITY | Remote task branch is exactly 8c84644031fe6324bac2137eaa75f46e9590ce7b. |
| change-scope | PASS | BOUNDED PREREQUISITE | Candidate is descended from the blocked physical-evidence anchor; changed paths are authorized; frozen synchronization contracts are unchanged; diff-check passes. |
| defect-causality | PASS | OWNING DEFECT REPAIRED | Base used account-global root uniqueness after reserved-ID absence; candidate anchors recovery to exact parent observation/root ancestry and regression asserts no global root search or mutation. |
| disposable-worktree | PASS | EXACT-SHA DISPOSABLE WORKTREE | Created C:\Users\woodpk\AppData\Local\Temp\brain-s08f-prereq-7323080917c44a03905415a275938130\w. |
| dependencies | PASS | DEPENDENCY INSTALL | Stage completed successfully. |
| typecheck | PASS | TYPECHECK | Stage completed successfully. |
| product-test-compile | PASS | PRODUCT TEST COMPILE | Stage completed successfully. |
| focused-folder-recovery | PASS | FOCUSED RECOVERY REGRESSION | Stage completed successfully. |
| complete-product-suite | PASS | COMPLETE PRODUCT TEST SUITE | All 109 compiled test files passed across 3 batch(es). |
| bvp-compile | PASS | BVP COMPILE | Stage completed successfully. |
| complete-bvp-suite | FAIL | COMPLETE BVP TEST SUITE | 1 of 1 test batch(es) failed; all batches were still attempted. |
| architecture-guard | FAIL | ARCHITECTURE GUARD | Stage failed with exit code 1. |
| architecture-metrics | FAIL | ARCHITECTURE METRICS | Stage failed with exit code 1. |
| repository-check | FAIL | REPOSITORY CHECK | Stage failed with exit code 1. |
| production-build | PASS | PRODUCTION BUILD | Stage completed successfully. |
| production-artifact-identity | FAIL | PRODUCTION ARTIFACT INVALID | The property 'Count' cannot be found on this object. Verify that the property exists. |
| production-artifact-materialization | SKIPPED | PREREQUISITE NOT SATISFIED | Implementation/test/build gates did not all pass; no shipping artifact commit was created. |
| validation-artifact-build | SKIPPED | PREREQUISITE NOT SATISFIED | Stage was not executed because a required dependency stage was unavailable. |
| validation-artifact-identity | SKIPPED | PREREQUISITE NOT SATISFIED | Validation artifact build did not pass. |
| post-artifact-repository-check | SKIPPED | PREREQUISITE NOT SATISFIED | Stage was not executed because a required dependency stage was unavailable. |
| repository-mutation-audit | PASS | EVIDENCE-ONLY RESIDUAL MUTATION | After derived artifact materialization, no residual tracked/untracked change exists outside the authorized S08F evidence root. |
