# PHASE 6 A03 — 0.1.10 WINDOWS PHYSICAL-VALIDATION RESUMPTION

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-a03-resume-0.1.10-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Installed Windows plugin:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync\`

Your assignment is to resume **only Phase 6 A03** from the preserved Windows live-validation checkpoint using installed prerelease `0.1.10`, physically verify the repaired first-sync conflict-resolution path, capture complete evidence, and stop.

This is a **live physical-validation task**. It is not a coding task, release task, install task, reset task, or general continuation through later Phase 6 tests.

Do not modify product source.
Do not modify tests.
Do not reset synchronization state.
Do not clear authentication or pairing.
Do not restart A01/A02.
Do not begin B–O.
Do not begin Stage 3.

---

## 1. AUTHORITATIVE INSTALLED BUILD

Required installed version:

`0.1.10`

Published release:

- release ID: `384947601`;
- tag: `0.1.10`;
- tag target / release-preparation SHA: `d5a84fdeb1a21d048c9b5db8196e87b59a03f06f`;
- title: `0.1.10 — Phase 6 A03 Conflict-Resolution Repair Physical Validation Build`;
- prerelease: `true`;
- draft: `false`.

Published assets:

- `main.js`
  - asset ID: `551003106`
  - size: `733916` bytes
  - SHA-256: `f5ed8bf4eaaed81502fca50845fb5ed66234655389b0896d19d4d7edda2eefa4`
- `manifest.json`
  - asset ID: `551003108`
  - size: `276` bytes
  - SHA-256: `f26b3aa7da26fcbaf0f2cc067c2fb89be50e4f97f5de8a01cbc08214986a42fd`

Before any live sync action, verify installed `manifest.json` reports `0.1.10` and installed `main.js` matches the release SHA-256 above.

If either check fails, stop:

`BLOCKED — INSTALLED BUILD IDENTITY DOES NOT MATCH 0.1.10 RELEASE`

Do not reinstall or repair the installation in this task.

---

## 2. PRESERVED A03 CHECKPOINT

The prior `0.1.9` A03 run stopped after a safe first-sync plan completed all non-conflict work but failed to resolve one remaining conflict.

Known preserved conflict:

`__brain_sync_portable_config__/app.json`

Known prior A03 plan shape:

- total operations: `14`;
- `9 noop`;
- `4 upload-create`;
- `1 unresolved-conflict`;
- no delete/trash/move operations.

The 13 non-conflict operations already completed successfully before the hard stop.

Prior remote object for the portable config conflict:

- path: `__brain_sync_portable_config__/app.json`;
- remote object ID: `17BEbRR4zvjNN7ul3bjOfr37rTiY3gBN3`;
- prior size: `351` bytes.

Prior `Keep local` failed twice under `0.1.9` with `recovery-required`. No duplicate portable `app.json` was created and the remote object remained unchanged.

The Windows `0.1.10` installation task reports:

`WINDOWS DESKTOP PLUGIN UPDATED TO 0.1.10 — LOCAL STATE/AUTHORITY AND A03 CHECKPOINT PRESERVED — READY FOR SEPARATELY AUTHORIZED A03 PHYSICAL-VALIDATION RESUMPTION`

Do not perform another reset. Do not manufacture a clean-first-sync state. The purpose of this task is to test the repaired product against the preserved real checkpoint.

---

## 3. HARD SAFETY RULES

Stop immediately on any of the following:

- unexpected delete/trash operation;
- unexpected move/rename operation;
- unexpected upload/download outside the single known A03 conflict-resolution effect;
- scope escape outside the managed BRAIN validation scope;
- duplicate remote create for `app.json`;
- authentication loss;
- pairing/root identity mismatch;
- unexpected state reset or fresh-device behavior;
- UI/runtime hang that prevents authoritative completion determination;
- any `recovery-required` result from the single authorized conflict-resolution attempt;
- any evidence that the local or remote preserved version was lost;
- any materially different plan shape that cannot be safely explained from the preserved checkpoint.

Do not retry a failed conflict resolution in this task.

If the authorized resolution attempt fails once, capture evidence and stop.

---

## 4. PRE-ACTION EVIDENCE SNAPSHOT

Before clicking any sync/reconcile control, capture non-secret evidence of:

1. installed plugin version and installed `main.js` SHA-256;
2. current product status surface;
3. current conflict list;
4. current `data.json` size and SHA-256 only — do not expose its contents;
5. current safe synchronization-state summary where available:
   - state status;
   - first-sync completion flag;
   - scope-reconcile-required flag;
   - recovery-in-progress flag;
   - BASE entry count;
   - remote mapping count;
   - pending authority operation count;
   - tombstone count;
6. current remote listing for the portable config path/folder sufficient to prove:
   - exactly one live `app.json` exists before mutation;
   - its object ID;
   - size;
   - revision/hash where safely available;
7. current local `.obsidian/app.json` size and SHA-256 only.

Do not expose OAuth tokens, client secrets, or raw credential-bearing material.

Use the existing Phase 6 evidence root if available:

`D:\obsidian-brain-dev\dev\evidence\2026-09-07T0010-P6LIVE\`

Create new clearly named `0.1.10` A03-resumption evidence files there. Do not overwrite the existing `0.1.9` hard-stop evidence.

---

## 5. FRESH REVIEWED A03 PLAN

Perform exactly one fresh user-reviewed:

`Verify/Reconcile Vault`

This is authorized because the preserved checkpoint must be re-observed by the installed `0.1.10` runtime before physical conflict resolution.

### Preview gate

Do not execute the plan until its complete operation list has been captured and reviewed.

Expected preserved-checkpoint shape is ordinarily:

- already converged/non-conflict work represented as noops;
- one unresolved conflict at `__brain_sync_portable_config__/app.json`;
- zero delete/trash/move operations;
- zero unexplained create/update operations.

The exact noop count may differ if the product legitimately compresses or reconstructs the already-completed work, so **do not require an exact count solely by history**. Instead require all of the following:

- the only unresolved conflict is the known portable `app.json` conflict;
- no destructive operation is present;
- no unrelated path mutation is present;
- no duplicate-create operation targets `app.json`;
- no scope escape is present.

If the preview contains any unexpected mutation, stop before execution and report the full operation summary.

If the preview contains no unresolved `app.json` conflict, stop and report the observed state; do not invent or recreate the conflict.

### Execute reviewed plan

If and only if the preview is safe, execute that reviewed Verify/Reconcile plan once.

Capture:

- plan ID;
- complete operation counts by kind;
- execution result;
- resulting status surface;
- conflict list after execution;
- safe authority/state summary after execution.

The plan may legitimately leave the known conflict unresolved and require explicit user conflict resolution.

Do not treat that alone as failure.

---

## 6. SINGLE AUTHORIZED CONFLICT RESOLUTION

After the reviewed plan completes safely, require the same unresolved conflict to remain available for explicit resolution:

`__brain_sync_portable_config__/app.json`

Authorize exactly one resolution action:

`Keep local`

Reason for this selection:

- it is the same normal user workflow attempted during the `0.1.9` hard stop;
- it directly exercises the C1-R1 repair;
- the production update path is expected to preserve the prior remote version/identity as recoverable predecessor evidence rather than destroy it.

Before clicking `Keep local`, record the conflict ID/path and current local/remote evidence shown by the product or safe diagnostics.

Then perform `Keep local` exactly once.

Do not perform a second attempt if it fails.

---

## 7. REQUIRED SUCCESS CONDITIONS

A03 repair validation passes only if all of the following are physically established after the single `Keep local` action:

1. the resolution is accepted/completes authoritatively;
2. the controller does **not** enter `recovery-required` because of the resolution;
3. the conflict disappears from the active conflict surface only after authoritative completion;
4. the current remote `app.json` content matches the local selected version;
5. there is exactly one current/live `app.json` at the managed portable-config path;
6. no duplicate current/live `app.json` was created;
7. the prior remote version remains recoverable/preserved according to the production immutable predecessor mechanism or equivalent verified evidence;
8. local `.obsidian/app.json` remains the selected local content and is not unexpectedly rewritten;
9. trusted BASE/state now contains authority for the resolved portable `app.json` path;
10. trusted remote mapping now contains the current authoritative remote identity for that path;
11. there are no unresolved/pending authority operations left for the completed resolution;
12. no destructive/move/scope-escape side effect occurred;
13. plugin authentication and managed-root pairing remain intact;
14. the product reaches a coherent post-resolution status rather than a hang or unrecoverable error.

Where the product exposes them, also record:

- `firstSyncCompleted`;
- `scopeReconcileRequired`;
- recovery status;
- semantic/state/persistence revisions.

Do not force those flags to a guessed value. Record what the product actually establishes.

---

## 8. POST-RESOLUTION INTEGRITY CHECK

After successful resolution, independently capture:

- remote portable-config listing;
- current remote `app.json` object identity;
- current remote content size/hash/revision where available;
- evidence of predecessor preservation;
- local `.obsidian/app.json` size/SHA-256;
- `data.json` size/SHA-256;
- status surface;
- conflict surface;
- safe authority/state summary;
- recent audit entries relevant to the reviewed plan and conflict resolution.

Explicitly compare pre/post observations and state whether:

- current remote content changed exactly as intended;
- local content remained intact;
- predecessor preservation exists;
- no duplicate current remote file exists;
- no unrelated remote/local path changed;
- no unexpected destructive operation occurred.

Do not expose secrets.

---

## 9. PASS / FAIL DECISION

### PASS

Declare:

`A03 PASS — 0.1.10 physically resolves the preserved first-sync app.json conflict through Keep local without recovery-required or duplicate/destructive side effects.`

only if every Section 7 requirement is supported by captured evidence.

### FAIL / HARD STOP

If the fresh plan is unsafe, or the one authorized `Keep local` resolution fails, or any Section 7 requirement cannot be proven, declare:

`A03 FAIL — HARD STOP`

and stop immediately.

Do not:

- retry Keep local;
- try Keep remote;
- try Keep both;
- use manual resolution as a workaround;
- reset/reinitialize state;
- rewrite remote content manually;
- alter Drive outside the product workflow;
- patch code;
- begin B–O.

Capture the exact failure status, audit reason, operation identity, state/authority summary, and local/remote integrity evidence.

---

## 10. REPOSITORY BOUNDARY

Do not modify repository source, tests, release branches, tags, or product code.

Do not merge anything.

Do not create a new release.

Do not move `phase6-integration`.

This task may write physical-validation evidence to the existing external/local evidence directory only. Do not commit/push that evidence unless separately authorized by the supervisor.

---

## 11. COMPLETION RESPONSE

Return a concise but complete report containing:

- agent identity;
- installed version and `main.js` SHA-256 verification;
- pre-action status/state summary;
- pre-action local `app.json` SHA-256;
- pre-action remote `app.json` identity/size/hash/revision where available;
- Verify/Reconcile preview operation counts and safety result;
- reviewed-plan execution result;
- conflict ID/path used for resolution;
- single `Keep local` result;
- whether `recovery-required` occurred;
- remote post-resolution identity/size/hash/revision;
- proof current remote content matches selected local content;
- proof predecessor remote version remains preserved/recoverable;
- proof exactly one current/live remote `app.json` exists;
- local post-resolution SHA-256 and continuity result;
- BASE/mapping authority result for the resolved path;
- pending authority-operation/tombstone summary;
- final status/conflict surface;
- firstSyncCompleted/scopeReconcileRequired/recovery flags where available;
- evidence file paths created locally;
- confirmation no retry, reset, reauth, manual Drive mutation, unrelated mutation, B–O work, or Stage 3 work occurred;
- final `A03 PASS` or `A03 FAIL — HARD STOP` decision.

If PASS, end exactly:

`A03 0.1.10 PHYSICAL VALIDATION PASS — FIRST-SYNC CONFLICT RESOLUTION REPAIR VERIFIED — B–O NOT STARTED`

If FAIL, end exactly:

`A03 0.1.10 PHYSICAL VALIDATION FAIL — HARD STOP — B–O NOT STARTED`

---

## 12. STOP

Stop immediately after the A03 pass/fail determination and evidence capture.

Do not begin B–O even if A03 passes.
Do not begin iPhone testing.
Do not modify source or tests.
Do not reset state.
Do not begin Stage 3.
