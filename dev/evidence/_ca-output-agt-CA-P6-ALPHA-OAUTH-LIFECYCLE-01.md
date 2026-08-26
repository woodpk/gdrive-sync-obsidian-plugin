# Phase 6 Alpha Repair Evidence — OAuth Protocol-Handler Lifecycle

## Identity

- agent ID: `agt-CA-P6-ALPHA-OAUTH-LIFECYCLE-01`
- repair branch: `phase6-alpha-oauth-lifecycle-fix`
- exact repair base: `717c35b5fcd7a97bec110ac18f02cec3f821590c`
- exact production/test implementation head: `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951`
- subsequent branch commits are evidence-only unless otherwise stated.

No supervisory approval is claimed.

## Completed Corrections

### C1 — Plugin-lifetime protocol-handler ownership

`src/main.ts` registers `brain-gdrive-oauth` once from `BrainGoogleDriveSyncPlugin.onload()` through Obsidian's supported plugin lifecycle API. The stable handler delegates dynamically through the current runtime rather than closing permanently over an OAuth session created during an earlier initialization.

### C2 — Runtime initialization no longer registers the protocol action

`src/product/runtime.ts` no longer imports or calls `registerGoogleOAuthReturn(...)` from `Phase5ProductRuntime.initialize()`. Repeated initialization may reconstruct runtime-owned resources, including the Google boundary and OAuth session, without attempting plugin-global protocol registration.

### C3 — Dynamic current-session OAuth completion delegation

`src/product/runtime.ts` exposes the minimal `completeGoogleAuthorization(input)` seam, which resolves `this.boundary?.oauth` at callback execution time. `src/drive/oauth-return.ts` accepts a completion delegate instead of a concrete `GoogleOAuthSession`, preventing stale-session capture by the stable protocol handler.

### C4 — Authenticate-after-initialization safety

The existing Authenticate path may still rerun `runtime.initialize()` before beginning authorization. Because registration is plugin-owned and completion resolves the current runtime/session dynamically, Authenticate-triggered reinitialization does not cause duplicate protocol registration and later callbacks do not target replaced OAuth sessions.

## Complete Repair Change Manifest

### Created

- `test/phase6-alpha-oauth-lifecycle.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-OAUTH-LIFECYCLE-01.md`

### Modified

- `src/main.ts`
- `src/product/runtime.ts`
- `src/drive/oauth-return.ts`
- `dev/evidence/_ca-output.md`

### Deleted

- none

## Regression Coverage — T1–T7

`test/phase6-alpha-oauth-lifecycle.test.ts` contains six executable tests covering the required lifecycle matrix:

- T1: repeated `Phase5ProductRuntime.initialize()` calls produce zero protocol-handler registrations;
- T2: a capturing registrar proves one `brain-gdrive-oauth` registration for one plugin lifetime, while a new plugin lifetime may register normally;
- T3: Authenticate-after-initialization retains runtime initialization/authentication without any registration call in that path or runtime initialization;
- T4: stable callback delegation after session replacement invokes the current completion target and the runtime completion seam dereferences the current `boundary.oauth` at callback time;
- T5: prior/stale session invocation count is explicitly asserted as zero after replacement;
- T6: lifecycle safety relies on normal Obsidian/plugin ownership and contains no unsupported manual unregister or protocol-registry manipulation;
- T7: repair sources/tests add no secret-bearing console diagnostics, preserve safe completion notices, and do not weaken existing OAuth security coverage.

Pre-existing OAuth security tests remain intact, including exact `https://www.googleapis.com/auth/drive.file` scope, PKCE S256/high-entropy state, state mismatch rejection, SecretStorage handling, and Phase 6 C exact-scope enforcement.

## Verification Actually Obtained

GitHub Actions verification was obtained for the production/test tree corresponding to implementation head `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951`:

- workflow: `Phase 1 CI`
- run ID: `32925172932`
- job ID: `98046517476`
- `npm ci`: **PASS** — 14 packages installed, 0 vulnerabilities
- `npm run typecheck`: **PASS**
- `npm test`: **PASS** — 239 tests / 239 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo
- `npm run build`: **PASS**

The actual job log was inspected. The focused lifecycle tests executed as tests 214–219 and all passed.

CI checkout qualification: the pull-request workflow checked GitHub's generated merge ref containing implementation head `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951`; an Actions checkout of that head SHA directly was not performed.

The existing `npm run build` PASS is only the repository's automated compilation/build result. It does **not** constitute real Obsidian runtime packaging acceptance and does **not** close Alpha Bug #1.

## Unavailable Validation

- exact-head-SHA GitHub Actions clean checkout, distinct from the successful PR merge-ref checkout containing that head — `NOT AVAILABLE IN THIS SESSION`
- local-shell `npm ci` / typecheck / test / build execution — `NOT AVAILABLE IN THIS SESSION`
- separate focused-test-only command — `NOT AVAILABLE IN THIS SESSION`
- real Windows Obsidian OAuth retry validation — `NOT AVAILABLE IN THIS SESSION`
- real Windows Obsidian protocol-handler reload/unload validation — `NOT AVAILABLE IN THIS SESSION`
- live Google OAuth token exchange / Alpha Bug #2 diagnosis — `NOT AVAILABLE IN THIS SESSION`
- real-runtime packaging validation / Alpha Bug #1 repair — `NOT AVAILABLE IN THIS SESSION`

## Outside This Repair

- Alpha Bug #2 (`token-exchange-failed`) remains outside this repair. No token-exchange behavior or Google configuration was changed or diagnosed here.
- Alpha Bug #1 (production packaging/runtime loadability) remains outside this repair. No packaging repair was performed here.
- PR `#15` remains outside this repair and must remain unmerged.
- PR `#16` is a draft review PR and must remain unmerged.
- `master` and `phase6-integration` are not modified by this evidence correction.
