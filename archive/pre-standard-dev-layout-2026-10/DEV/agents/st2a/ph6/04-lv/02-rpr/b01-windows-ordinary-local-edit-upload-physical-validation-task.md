# PHASE 6 B01 — WINDOWS ORDINARY LOCAL-EDIT UPLOAD PHYSICAL VALIDATION

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-b01-local-edit-upload-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Accepted A03 evidence head:

`9a83ec9396bff483bd34be468a188c5e77111ba9`

Installed Windows prerelease authority:

`0.1.11`

Installed `main.js` required SHA-256:

`64d6a9282aaccceab911a4230502d4b7efda2280d58cf9b445fd062e8b5c3d2b`

Your assignment is to execute **B01 only**: one bounded real-Windows ordinary local-edit synchronization scenario from the trusted post-A03 checkpoint, proving that a normal local note modification is reviewed, uploaded through the product’s ordinary synchronization path, committed authoritatively, and converges on Google Drive without unrelated/destructive side effects.

This is a **live physical-validation task**.

Do not reset synchronization state.
Do not manufacture a fresh first-sync state.
Do not reauthenticate unless separately authorized after a demonstrated auth failure.
Do not reinstall the plugin.
Do not modify product source/tests.
Do not perform B02 or later B–O work.
Do not begin iPhone/iOS testing.
Do not begin Stage 3.

---

## 1. ENTRY GATE — A03 MUST REMAIN THE STARTING AUTHORITY

B01 starts from the accepted A03 `0.1.11` post-resolution state.

The accepted A03 result established:

- product status `idle-ready`;
- active attention count `0`;
- `recoveryInProgress=false`;
- state/persistence revision `state:86`;
- semantic generation `semantic:13`;
- BASE entries / remote mappings `13 / 13`;
- completed authority operations `26`, pending `0`;
- tombstones `0`;
- portable `app.json` conflict resolved;
- authoritative current portable `app.json` object `1dY96IomB5CC76N0UtyLclKvIzgZSMXKu`;
- local/remote selected content converged;
- managed device/vault/remote pairing intact.

Before any B01 mutation, verify the current live state is materially consistent with that accepted checkpoint.

Small expected bookkeeping/audit differences from reopening Obsidian are acceptable only if they do not alter synchronization authority or vault content.

If the device instead presents:

- `recovery-required`;
- active conflict/attention unrelated to the B01 fixture;
- authentication loss;
- managed-root/pairing mismatch;
- unexplained pending authority operations;
- unexplained destructive plan;
- state reset/fresh-install behavior;

stop before modifying a note and report:

`B01 BLOCKED — POST-A03 AUTHORITY CHECKPOINT NOT SAFE`

---

## 2. WATCHER PREREQUISITE — HARD GATE

Do not begin B01 until the separately tasked Windows watcher compatibility repair has been supervisor-approved and the repaired watcher has passed synthetic Windows PowerShell verification.

B01 requires working telemetry for:

- filesystem create/change/delete/rename events beneath the validation root;
- plugin `data.json` size/hash transitions without contents;
- Obsidian process/resource samples.

Before changing the B01 note:

1. start the approved repaired watcher;
2. verify it is still running after at least one harmless synthetic/controlled observation if the approved procedure requires it;
3. verify evidence files are being written;
4. verify no watcher exception is present.

If watcher telemetry is unavailable or fails again, stop before the B01 note mutation:

`B01 BLOCKED — REQUIRED SIDE-EFFECT TELEMETRY UNAVAILABLE`

Do not silently fall back to degraded monitoring for B01.

---

## 3. B01 FIXTURE SELECTION

Use one existing disposable Phase 6 validation note that is already inside the managed synchronization scope and already has trusted BASE/mapping authority.

Preferred fixture:

`test-file-01.md`

Use another existing test fixture only if direct current-state inspection proves `test-file-01.md` is unsuitable. If substituting, explain why and record the exact selected path before mutation.

Do not use:

- real clinical/user notes;
- portable `.obsidian` configuration;
- plugin data/state files;
- external BRAIN asset repository content;
- an excluded path;
- a path without trusted BASE/mapping authority.

Before editing the fixture, record:

- local path;
- local size/SHA-256;
- current remote object ID;
- remote size/SHA-256 or equivalent exact content identity;
- BASE content identity;
- remote mapping identity;
- relevant state/persistence/semantic revisions;
- pending-operation/tombstone counts.

Require local, BASE, and remote to be converged before inducing the B01 local edit.

If they are not converged, stop rather than using B01 to repair an unrelated pre-existing condition.

---

## 4. CONTROLLED LOCAL MUTATION

Make exactly one small, deterministic, reversible edit to the selected disposable test note.

Preferred form:

append one unique plain-text validation line such as:

`P6-B01 local-edit validation <UTC timestamp or unique nonce>`

Requirements:

- modify only the selected disposable fixture;
- do not rename/move/delete it;
- do not modify any second vault content file;
- do not edit the remote directly;
- do not use Drive web UI to force convergence;
- preserve the exact pre-edit bytes/hash in evidence so the fixture can be restored in a later separately authorized cleanup if needed.

After the local edit, record the new local size/SHA-256 and confirm the watcher captured the expected local change.

If the watcher shows unrelated vault-content mutation, stop before sync execution and investigate/report.

---

## 5. SYNC PATH — ONE MANUAL REVIEWED RUN

Use the product’s ordinary manual synchronization path.

Perform exactly one fresh user-reviewed sync/Verify-Reconcile action according to the currently exposed product control that yields a complete plan preview before mutation.

Do not execute until the complete operation list is captured and reviewed.

### Expected plan

For the selected fixture, expect exactly one ordinary local-to-remote content mutation operation, normally an upload/update against the already-authoritative remote object.

All other already-converged managed paths should be no-op or otherwise non-mutating.

The plan must contain:

- no unresolved conflict;
- no recovery-required operation;
- no upload/create for an unrelated path;
- no download mutation for an unrelated path;
- no delete/trash;
- no move/rename;
- no duplicate remote create for the selected fixture;
- no scope escape;
- no portable-config mutation caused by B01;
- no suspicious/destructive approval requirement.

If any unexpected mutation is present, do not execute. Capture the full plan and stop:

`B01 FAIL — HARD STOP — UNEXPECTED PLAN`

### Execute once

If and only if the plan is safe, execute that reviewed plan exactly once.

Do not retry a failed mutation in this task.

---

## 6. REQUIRED SUCCESS CONDITIONS

B01 passes only if all of the following are physically proven:

1. exactly the intended local fixture modification is selected for ordinary local-to-remote synchronization;
2. the reviewed operation completes successfully on the first execution attempt;
3. no `recovery-required` condition occurs;
4. no conflict is generated;
5. the current remote content becomes byte-for-byte identical to the edited local fixture;
6. the remote mapping remains authoritative for the correct current object identity;
7. where the production update contract preserves predecessor identity/version evidence, that behavior remains coherent and non-destructive;
8. BASE advances to the edited content only after the remote effect is durably completed/verified;
9. no pending authority operation remains for the fixture;
10. no unrelated BASE/mapping/path is unexpectedly changed;
11. no delete/trash/move/rename/scope-escape operation occurs;
12. no uncontrolled duplicate current remote object exists for the fixture;
13. local edited content remains intact;
14. plugin authentication and managed-root pairing remain intact;
15. product returns to a coherent ordinary status, expected `idle-ready` absent another legitimate condition;
16. active attention/conflict surface remains clear;
17. watcher telemetry corroborates the intended local edit and absence of unrelated vault-content side effects during the bounded run.

Do not require `firstSyncCompleted` to have a guessed value. Record actual observed lifecycle flags.

---

## 7. POST-RUN INDEPENDENT INTEGRITY CHECK

After the product reports successful completion, independently capture and compare:

### Local

- selected path;
- size;
- SHA-256;
- exact expected edit present;
- no unexpected rewrite.

### Remote

- current remote object ID;
- size;
- content SHA-256 or independently fetched byte comparison;
- current revision/identity where available;
- count of current/live objects for that logical path;
- predecessor/revision evidence where applicable.

### Authority/state

- state revision;
- persistence revision;
- semantic generation;
- BASE count;
- mapping count;
- selected path BASE hash/size;
- selected path current mapping ID;
- completed/pending operation counts;
- tombstone count;
- recovery flag;
- first-sync/scope-reconcile flags as actually exposed.

### Product/UI

- final status;
- active attention count;
- conflict count;
- relevant audit entries including plan/operation completion.

### Side effects

Use watcher logs to identify all vault-content events in the bounded time window. Classify expected Obsidian workspace/config churn separately from synchronized vault-note mutation. Any unexplained ordinary vault-content mutation is a failure requiring hard stop.

Do not expose secrets or raw plugin state.

---

## 8. FAILURE RULE

Any of the following requires immediate B01 hard stop:

- watcher unavailable before mutation;
- unsafe/unexpected plan;
- conflict on the ordinary local-edit fixture;
- `recovery-required`;
- operation failure/uncertain completion;
- local data loss;
- remote data loss;
- duplicate authoritative-current object;
- delete/trash/move/rename outside expectation;
- unrelated vault-content mutation;
- scope escape;
- auth loss;
- managed-root/pairing mismatch;
- BASE/mapping fails to advance coherently after reported success;
- pending authority remains for the completed operation;
- product hangs or cannot establish authoritative outcome.

On failure:

- do not retry;
- do not manually edit Drive;
- do not reset state;
- do not reauthenticate;
- do not switch to another fixture and continue;
- do not begin B02.

Capture evidence and stop.

---

## 9. EVIDENCE

Use the existing Phase 6 live evidence root:

`D:\obsidian-brain-dev\dev\evidence\2026-09-07T0010-P6LIVE\`

Create a new clearly named B01 directory, for example:

`B01-0.1.11-local-edit-upload-<timestamp>`

Capture at minimum:

- installed-build identity;
- pre-action checkpoint summary;
- fixture pre-edit local/BASE/remote identities;
- watcher startup/health proof;
- edited local identity;
- complete plan preview summary/screenshot;
- execution result;
- relevant audit evidence;
- post-run local/remote/BASE/mapping identities;
- watcher filesystem log;
- plugin-state watcher log;
- resource samples;
- concise PASS/FAIL report;
- evidence manifest with sizes/SHA-256 where practical.

Do not commit raw secret-bearing diagnostics or raw `data.json`.

Do not push evidence to GitHub unless separately authorized by the supervisor. Local evidence capture is authorized; repository publication is not automatically authorized by this task.

---

## 10. PASS DECLARATION

Declare PASS only when every required success condition is supported:

`B01 PASS — 0.1.11 physically propagates one ordinary trusted local note edit to Google Drive through the reviewed synchronization path, advances BASE/mapping authority after verified remote completion, and produces no conflict, recovery, destructive, duplicate-current, scope-escape, or unrelated vault-content side effect.`

End exactly:

`B01 0.1.11 PHYSICAL VALIDATION PASS — ORDINARY LOCAL-EDIT UPLOAD VERIFIED — B02–O NOT STARTED`

---

## 11. FAIL DECLARATION

On any failure or unprovable required condition, declare:

`B01 FAIL — HARD STOP`

End exactly:

`B01 0.1.11 PHYSICAL VALIDATION FAIL — HARD STOP — B02–O NOT STARTED`

---

## 12. COMPLETION RESPONSE

Return:

- agent identity;
- installed version and `main.js` hash;
- watcher repair/health gate result;
- pre-action product/state authority summary;
- selected fixture and reason;
- pre-edit local/BASE/remote identities;
- exact controlled edit description;
- post-edit local identity;
- reviewed plan ID and complete operation counts;
- safety-review result;
- execution operation ID/result;
- recovery-required yes/no;
- conflict yes/no;
- post-run remote identity/hash/revision;
- local↔remote byte/hash equality result;
- BASE advancement result;
- mapping result;
- completed/pending operations;
- tombstones;
- duplicate-current count/result;
- predecessor/revision preservation result where applicable;
- final status/attention/conflicts;
- watcher side-effect summary;
- evidence directory/files;
- confirmation no retry/reset/reauth/manual Drive mutation/B02–O/iPhone/Stage 3 occurred;
- final PASS or FAIL.

---

## 13. STOP

Stop immediately after the B01 decision and evidence capture.

Do not begin B02.
Do not perform remote-change, offline, interruption, deletion, conflict, destructive, iPhone, scale, or Stage 3 testing in this task.
