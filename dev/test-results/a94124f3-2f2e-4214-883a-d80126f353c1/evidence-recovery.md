# Canonical PHX-CI evidence recovery — a94124f3-2f2e-4214-883a-d80126f353c1

**Administrative-only object copy; no executable verification or new SUT qualification.**

- Verified source SHA: `b430a92999ea4658e0a045d2e8c6eb8895425b72`
- Verified tree SHA: `1dd72b42e06714504b4999a28604722d3e75ed6b`
- Accepted master base: `b1e2ebaee3077e34a4eefaf601ee8124078b7400`
- PHX-CI run ID: `a94124f3-2f2e-4214-883a-d80126f353c1`, pinned framework `0.2.0-dev.2`, runtime SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`
- Original PHX-CI publication commit: `f8de3b72b47edee82f895d5088a386f20c99bf92`, directly descending from the verified software SHA.
- All 11 stages **PASS**; focused BVP 403/403 PASS, product 995/995 PASS, exit 0; typecheck, repository check, architecture check, build, artifacts PASS.
- `main.js` ordinary development artifact: 906210 bytes, SHA-256 `3dcffa8f66a695b97103d3f8c8d52a9a06e74211938e4cd1140e88e46e2ec65c`; **NOT APPROVED for release**.

Exact original Git blobs preserved under canonical run-ID evidence layout:

| Canonical file | Original timestamped file | Git blob SHA |
|---|---|---|
| `dev/test-results/a94124f3-2f2e-4214-883a-d80126f353c1/result.json` | `dev/test-results/20261015T132303Z-operator-fix-s09-g102-persisted-identity-whitespace-20261015-b430a92999ea.json` | `d8e16c93ff41b1daed05e5ffa57d7a1f030e9e38` |
| `dev/test-results/a94124f3-2f2e-4214-883a-d80126f353c1/result.md` | `dev/test-results/20261015T132303Z-operator-fix-s09-g102-persisted-identity-whitespace-20261015-b430a92999ea.md` | `0d5cd8410661c2f6755e6e72dcde173f6731e152` |
| `dev/test-results/a94124f3-2f2e-4214-883a-d80126f353c1/terminal.log` | `dev/test-results/20261015T132303Z-operator-fix-s09-g102-persisted-identity-whitespace-20261015-b430a92999ea.log` | `f1df14221f4bbbbb2fed759016c2b4300beabfd3` |

Original timestamped evidence remains in place and unmodified. This administrative recovery is not a PHX-CI rerun; under Operating Protocol §37.1 no re-execution is warranted merely to correct evidence layout.

**Review status:** The b430 candidate's G1-02 correction passed genuine PHX-CI, but a subsequent owner-supplied *adversarial self-review* returned **REJECT** for NEW G1-03 (settings can persist blank completed-sync identities). The G1-03 corrective branch at/after `6514ed01e7488969c1df75488545ea4668c43ae2` is a **different, UNVERIFIED SUT**. This evidence does not qualify it. DEC-340-01 remains accepted/unfixed under locked DEC-344.

No master integration, release, installation, activation, physical S09 or Stage 3 authorized.
