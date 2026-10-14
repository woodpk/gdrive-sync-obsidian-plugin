STATUS: BLOCKED

# VH22 — C09 Correction 02 — Reconstruct C08-Equivalent Trusted Lineage Before Delete

Agent: `agt-ca-p6-vh22-c09-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Branch: `phase6-vh22-c09-scenario-correction-02`

## Base / ancestry gate

- Required approved VH15-R2 base: `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`.
- `origin/phase6-vh15-validation-mode-runtime-canary` resolved exactly to that SHA.
- VH15-R2 evidence began exactly `STATUS: COMPLETE`.
- Correction-02 was created directly from the approved SHA.
- Rejected original C09 HEAD `49f31d6e3c6661b8a1a05922ed5f8b4514b835fc` is not an ancestor of correction-02.
- Rejected correction-01 HEAD `cbd8946ef6defc20ab3286e4f540877c16c606fc` is not an ancestor of correction-02.
- Connector comparison reports both rejected lines as diverged from correction-02.

## Implementation identity

Implementation SHA before this evidence closure:

`66ef2e7f153e726d0d43f27c75f7f7260c4e0302`

Implementation / verification-tooling delta from the exact approved base:

- `src/validation/scenarios/c09-windows-delete-ios-trash.ts`
- `test/validation-c09-windows-delete-ios-trash.test.ts`
- `dev/scripts/verify-vh22-c09-correction-02.ps1`
- `dev/scripts/bootstrap-vh22-c09-correction-02.ps1`

No H6B runtime/handoff implementation, production driver, plan assertion engine, frozen H0 contract, `src/contracts/**`, acceptance text, production synchronization implementation, or peer scenario was modified.

## Rejection corrections implemented

### Authoritative C09 target identity

C09 uses the accepted C08 lineage identities:

- fixture ID: `c08-windows-move`
- guard ID: `c08-unrelated-guard`
- namespace: `__brain_validation__/c08`
- C08 source: `test-win-c06.md`
- authoritative C09 deletion target: `test-win-c08-renamed.md`
- unrelated guard: `c08-unrelated-guard.md`

No newly invented C09 deletion path is used.

### Complete C08-equivalent starting lineage is constructed inside C09

C09 does not assume a prior physical C08 PASS. It deterministically rebuilds the C08 lineage inside the scenario:

1. Create the harness-owned C08 target at `test-win-c06.md` plus the unrelated guard.
2. Windows fixed-H6B production preview → assertion → assertion-derived authorization → execution establishes both objects remotely.
3. Handoff to mobile.
4. Mobile fixed-H6B production preview → assertion → authorization → execution downloads both objects.
5. Objective seed verification requires exact Windows/mobile content, exact remote content, BASE authority, mappings, distinct stable target/guard Drive IDs, no tombstones, and no outstanding durable effects.
6. Handoff to Windows.
7. Fixture manager moves the target to `test-win-c08-renamed.md` while requiring unchanged bytes/hash.
8. Windows fixed-H6B move preview → assertion → authorization → execution requires the identity-preserving move.
9. Objective remote-move verification requires the original exact Drive object live at the renamed path, remote old-path absence, Windows BASE/mapping movement, and unrelated-guard preservation.
10. Handoff to mobile.
11. Mobile fixed-H6B move preview → assertion → authorization → execution requires the corresponding local identity-preserving move.
12. Objective trusted-lineage verification requires both devices to hold the renamed bytes, both BASE/mappings to bind the renamed path to the same original Drive ID, both old paths cleared, remote renamed object exact, guard exact and unchanged, and no outstanding effects.

Only a PASS with objective evidence at step 12 sets the internal `trustedLineageVerified` gate.

### Destructive flow after trusted-lineage proof

Only after the objective C08-equivalent lineage gate:

1. Handoff to Windows.
2. Fixture manager deletes the exact renamed target locally.
3. Fixed H6B previews the Windows production plan.
4. Fixed H6B assertion requires `trash-remote` at `test-win-c08-renamed.md`, destructive=true, and the exact Drive ID learned from the objectively verified lineage.
5. Fixed H6B retains the assertion-derived authorization and executes the exact retained production plan.
6. Objective verification requires that exact remote object to be recoverably trashed, Windows exact-object tombstone authority, mobile still-live exact bytes/mapping before reconciliation, and no unrelated guard mutation.
7. Handoff to mobile.
8. Objective mobile pre-delete verification requires the exact original object already trashed and mobile BASE/mapping still tied to that ID.
9. Fixed H6B preview → assertion → authorization → execution requires mobile `trash-local`.
10. Final objective verification requires exact-object tombstones on both devices, live-path absence on both devices, exact original remote object still trashed, no outstanding effects, and unrelated-guard content/authority unchanged.

C09 provides no `production-path-driver` override and no `plan-assertion-engine` override. No caller-created execution authorization exists.

## Focused coverage authored

Focused tests use the actual `ValidationModeRuntime` composition and cover:

1. Full successful reconstruction of the C08 source lineage, Windows/Drive move, mobile move, trusted-lineage freeze, exact-object remote trash, mobile recoverable delete, tombstone convergence, and unrelated guard preservation.
2. Anti-fake-lineage regression: even after fixture creation, four production setup/move executions, and stable mapping IDs are available, deletion remains impossible when the objective final C08-equivalent trusted-lineage verifier returns BLOCKED. The test requires zero delete calls and zero delete previews in that state.
3. Wrong exact Drive object in the Windows destructive plan fails in the fixed H6B assertion before destructive production execution.
4. An unexpected additional destructive guard mutation fails in the fixed H6B assertion before destructive production execution.

## Verification tooling

Repository-controlled local verifier:

`dev/scripts/verify-vh22-c09-correction-02.ps1`

It is designed to:

- fetch/prune;
- enforce exact branch/base ancestry;
- prove rejected C09 heads are not ancestors;
- enforce the bounded correction delta and frozen-runtime/contract boundaries;
- run `npm ci`;
- run `npm run typecheck`;
- compile tests with `npx tsc -p tsconfig.test.json`;
- run the focused C09 compiled test directly;
- run the complete automated test suite;
- run the production build;
- run `npm run check`;
- run base-delta and working-tree `git diff --check`;
- hash `main.js`;
- capture the complete terminal transcript;
- write evidence to `dev/_ca-output.md` and this task-specific evidence file.

Bootstrap:

`dev/scripts/bootstrap-vh22-c09-correction-02.ps1`

It fetches, checks out/updates correction-02, invokes the repository verifier, requires `STATUS: COMPLETE`, commits both evidence files if changed, and pushes the branch.

## Verification status / blocker

GitHub Actions were not used.

The current execution runtime does not provide a usable PowerShell runtime for executing the repository-controlled `.ps1` verifier, so build/test/check execution has not been substituted with another CI mechanism.

Therefore this evidence remains `STATUS: BLOCKED` until the committed bootstrap/verifier is run on the Windows development machine. The verifier will overwrite both evidence files with `STATUS: COMPLETE` only after all required local gates pass.

No physical Drive/mobile validation, merge, promotion, release, VH23 work, or peer-scenario modification was performed.
