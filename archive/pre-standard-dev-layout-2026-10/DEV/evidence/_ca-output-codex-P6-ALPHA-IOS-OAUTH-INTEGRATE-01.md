# Phase 6 Alpha iOS OAuth Repair Integration Evidence

## Identity and scope

- Integration agent: `codex-P6-ALPHA-IOS-OAUTH-INTEGRATE-01`.
- Date: `2026-08-27`.
- Integration branch: `phase6-integration`.
- Approved repair branch: `phase6-alpha-ios-oauth-launch-fix`.
- `master` was not modified or merged.
- PR `#15` remains intentionally open/unmerged; this local integration pass did not modify it.
- No Stage 3, performance-optimization, Google Cloud, Azure configuration, iPhone pairing, or synchronization work occurred.

## Integration topology

- Pre-integration `phase6-integration` SHA: `73453011c54abdca9ff2548803c025fae9886e74`.
- Independently approved repair head: `d499bb504e7b1092b4dc6d4fba5bf2523151d248`.
- Corrected implementation commit in that history: `11212541b663d2953fd0c1f405a60be4fd57243e`.
- Integration method: `git merge --ff-only origin/phase6-alpha-ios-oauth-launch-fix`.
- Post-fast-forward source/evidence SHA: `d499bb504e7b1092b4dc6d4fba5bf2523151d248`.
- The approved repair head was verified as an ancestor of the resulting local integration branch.
- The local branch was clean and three commits ahead of `origin/phase6-integration` before this evidence pass. Push and GitHub-state verification remain separate later gates.

## Approved repair changes integrated relative to the base

**Created**

- `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01.md`;
- `test/phase6-alpha-ios-oauth-launch.test.ts`.

**Modified**

- `dev/evidence/_ca-output.md`;
- `src/drive/oauth-return.ts`;
- `src/main.ts`;
- `src/product/runtime.ts`;
- `test/phase6-alpha-oauth-lifecycle.test.ts`.

**Deleted**

- none.

## Local integration verification

- `npm run typecheck`: PASS.
- Focused OAuth launch/live/lifecycle/mobile-safety gate: 25/25 PASS.
- `npm test`: qualified PASS, 268/270 tests passed.
- The only two failures were the known pre-existing Windows drive-qualified assertions:
  1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`;
  2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`.
- `npm run build`: PASS.
- `npm run check`: typecheck PASS, followed by the same 268/270 test result and the same two qualified failures; its aggregate command therefore stopped before its build stage.
- `git diff --check`: PASS.
- Working tree before evidence editing: clean.

## Build artifact verification

- `BUILD_VERIFY_ENTRYPOINT=PASS`.
- `BUILD_VERIFY_SYNTAX=PASS`.
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`.
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`.
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`.
- Generated `main.js` size: `291948` bytes.
- Generated `main.js` SHA-256: `f290076abdd02e59e11f24c3cfdff5f47ad22917aac06c5a69ad7a7ff07a9106`.
- The artifact exactly reproduces the independently approved corrected build; no artifact drift was observed.

## Integration evidence-pass file manifest

**Created**

- `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-INTEGRATE-01.md`.

**Modified**

- `dev/evidence/_ca-output.md`;
- `dev/evidence/phase6-integration-manifest.md`.

**Deleted**

- none.

## Remaining physical validation and safety boundary

Physical iPhone validation of the repaired OAuth browser handoff remains pending. No iPhone pairing or sync has occurred. The remaining test is to install or update to a new BRAT Alpha prerelease and confirm that Authenticate opens Google OAuth in the external/default browser and returns through the existing Obsidian callback. The existing `0.1.0` release was not changed. No release metadata, tag, or GitHub release was created in this evidence step.
