STATUS: BLOCKED

# VH29 — D06 Stale Device Return Safety

Agent: `agt-ca-p6-vh29-d06-scenario-01`  
Required branch: `phase6-vh29-d06-scenario`  
Scenario: `D06`

## Restart / frozen authority

- Replacement `D_SERIES_COMMON_BASE_SHA`: `c6daa20ad287f395a99cf88943465a9ecc3159dd`
- Required `origin/phase6-integration` check before restart: PASS — identical to `c6daa20ad287f395a99cf88943465a9ecc3159dd`.
- Superseded branch/base HEAD inspected before restart: `4b57ce65eb771a2a6ed2cc3375178db41d899084`.
- Old required task branch contained zero commits beyond the superseded base.
- Preservation branch required: NO.
- Required task branch was re-established directly on `c6daa20ad287f395a99cf88943465a9ecc3159dd`; no rebase, merge, or cherry-pick was used.

## Implementation

Implementation HEAD:

`019ab7203c64aa0d90971e79b99b9c02ae1162fc`

Exact changed implementation / test / task-local verification files:

1. `src/validation/scenarios/d06-stale-device.ts`
2. `test/validation-d06-stale-device.test.ts`
3. `dev/scripts/verify-vh29-d06-stale-device.ps1`

No shared H0 contracts, `src/contracts/**`, fixed H6B `production-path-driver`, fixed H6B `plan-assertion-engine`, production synchronization semantics, peer D-series scenarios, `phase6-integration`, release surfaces, or Stage 3 surfaces were modified.

### Implemented D06 behavior

- Seeds six harness-owned disposable fixtures so the one attested deletion is below the default 20% destructive affected-path circuit breaker.
- Establishes equivalent trusted seed authority on Windows and mobile through the fixed H6B production preview/assert/execute path.
- Uses the existing VH13 human checkpoint action `establish-stale-device-condition`; acknowledgement alone cannot satisfy the checkpoint.
- Proves the exact returning mobile peer is stale from read-only trusted production authority. Another stale peer cannot substitute for the required device.
- If the configured stale condition is not safely inducible, prerequisite evaluation returns exactly:
  `BLOCKED — STALE CONDITION NOT SAFELY INDUCIBLE`
- While mobile is absent/stale, Windows establishes a newer ordinary update plus one exact-object attested remote deletion.
- On stale return, the fixed H6B plan assertion requires the safe `download-update` and a `blocked-unsafe` deletion path; resurrection or destructive alternatives fail before execution.
- The fixed production execution path is allowed to commit the independent safe update while skipping the blocked path.
- A second verify/reconcile preview proves the stale deleted-target path remains `blocked-unsafe`; it is asserted but not executed.
- H3 verification requests prove the deleted remote object remains trashed, the Windows tombstone remains authoritative, the stale local copy remains recoverable, the safe update converges, and unrelated guards remain unchanged.
- No harness API writes device age, stale flags, authority generations, tombstones, trusted state, or production authority.

### Focused adversarial coverage added

The D06 focused test file covers:

- exact required BLOCKED terminal summary before mutation when staleness is not safely inducible;
- human acknowledgement without objective stale authority remaining paused and unable to release absent-device mutation;
- normal VH13 stale checkpoint/resume with safe non-destructive reconciliation and persistent destructive hard stop;
- stale resurrection proposal (`upload-create`) rejected by the fixed H6B assertion before returning-device execution;
- stale destructive proposal (`trash-local`) rejected by the fixed H6B assertion before returning-device execution;
- production stale-authority observation proving the exact target peer rather than accepting an unrelated stale device;
- D06 package inability to override fixed H6B `production-path-driver` or `plan-assertion-engine`.

## Proactive adjacent-defect review

The implementation was reviewed for adjacent high-likelihood defect families, not only the original missing-H6B family:

- incorrect self-staleness assumption: corrected so peer production authority can attest the exact absent device;
- unrelated stale-peer substitution: explicitly rejected/tested;
- acknowledgement-as-authority: explicitly rejected/tested through VH13 postcondition verification;
- unsafe resurrection operation: hard-stop test added;
- unsafe destructive local cleanup: hard-stop test added;
- destructive circuit-breaker false positive: six managed fixture paths keep one deletion below the default 20% threshold;
- exact remote identity drift: changed-path expectations retain the seeded Drive object IDs;
- fixed H6B override/bypass: no override is present;
- direct stale/trusted-state mutation: no write seam is present;
- task-scope drift: branch diff is limited to the three D06-owned files above;
- textual diff hygiene: no trailing whitespace, merge-conflict markers, NUL bytes, or missing terminal newlines were found in the three changed files.

## Verification

GitHub Actions were not used.

Repository-controlled verifier added:

`dev/scripts/verify-vh29-d06-stale-device.ps1`

It is a thin task-specific gate over the installed immutable PHX-CI production front door. It:

- requires PowerShell 7 for the committed verifier itself;
- fetches/prunes remote state;
- requires `origin/phase6-integration == c6daa20ad287f395a99cf88943465a9ecc3159dd` before verification;
- verifies branch/base ancestry and containment of the supplied implementation HEAD;
- runs committed-diff checking;
- resolves the exact PHX-CI framework SHA from `phx-ci.json`;
- requires the installed immutable runtime and matching runtime manifest;
- invokes the installed PHX-CI production front door with the D06 focused command;
- requires independent Change-set / Repository / Overall PASS plus PHX-CI front-door PASS;
- re-fetches after verification and again requires the D-series common base to remain frozen.

Focused test command configured in the verifier:

`node ./node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/validation-d06-stale-device.test.js .test-build/test/phase2-planner.test.js`

### Authoritative result

Authoritative installed-runtime PHX-CI verification could not be executed from this agent session.

This execution environment has GitHub repository access but does not have access to the user's Windows repository checkout, `LOCALAPPDATA` PHX-CI runtime store, or the installed immutable runtime front door required by the task. GitHub Actions are prohibited, and the task explicitly forbids substituting a mutable/source-mode PHX-CI checkout.

Therefore:

- Change-set verification: NOT ESTABLISHED
- Repository verification: NOT ESTABLISHED
- Overall verification: BLOCKED
- Required `PASS / PASS / PASS`: NOT CLAIMED
- `STATUS: COMPLETE`: FORBIDDEN

The required authoritative local invocation, from an environment containing the repository and installed immutable PHX-CI runtime, is:

`pwsh -NoProfile -File dev/scripts/verify-vh29-d06-stale-device.ps1 -RepoRoot <repository-root> -ImplementationHead 019ab7203c64aa0d90971e79b99b9c02ae1162fc -BaseSha c6daa20ad287f395a99cf88943465a9ecc3159dd -PublicationMode push`

## Frozen integration confirmation at evidence preparation

Immediately before this evidence file was prepared:

- `origin/phase6-integration`: `c6daa20ad287f395a99cf88943465a9ecc3159dd`
- required frozen common base: `c6daa20ad287f395a99cf88943465a9ecc3159dd`
- result: PASS — no D-series common-base drift observed.

## Blocker

Completion is blocked solely because the task-mandated installed PHX-CI runtime verification cannot be executed from the current agent environment. No merge, promotion, release, physical D06 validation, VH30 work, Stage 3 work, or peer D-series integration was performed.
