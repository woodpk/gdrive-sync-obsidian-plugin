# Phase 6 Workstream G-C2 Repair Evidence — agt-CA-P6-SYNC-ADVERSARIAL-01

## Identity / branch control

- Agent: `agt-CA-P6-SYNC-ADVERSARIAL-01`
- Branch: `phase6-sync-adversarial-model`
- Rejected G-C2 candidate head: `36a823329b108d7e176c2b6e253ab32b3d92e980`
- Approved frozen foundation base: `96b4541b15012ac4ce0d81243b73ef779efd343e`
- Frozen synchronization contract: `phase6-sync-foundation-v1.2`
- Workstream D was not consumed, merged, rebased, cherry-picked, or modified.
- Production ownership remains NONE.
- Canonical `dev/evidence/_ca-output.md` was not modified.

G-C2 implementation commits before this evidence-only commit:

- `a42ec4510b7ec2a0bba6e301a13661656fe43fd6` — route REMOTE folder-create recovery through the frozen verifier-backed journal-specific path and remove folder-create handling from generic recovery predicates.
- `6709074df443c3e29bdf88e6d40a8f11c79d154e` — add generic-recovery / settle regression coverage, including multi-folder-journal routing.

The final correction SHA is reported in the completion response because this file cannot truthfully contain the SHA of the commit that writes its own final contents.

## G-C2 defect closure

### Rejected behavior

At rejected head `36a823329b108d7e176c2b6e253ab32b3d92e980`, persisted `remote-folder-create` effects could be processed through generic `recover(...)` using weaker generic predicates:

- `physicalMatches(...)` could treat ID/kind/path as physical success without actual-parent verification;
- `effectAuthoritativelyNotApplied(...)` could treat reserved-ID absence as not applied without proving the intended path clear;
- `settle(...)` could reach that generic path from `dispatch-authorized` / `outcome-unknown`.

This was an alternate recovery authority beside frozen v1.2 `verifyRemoteFolderCreate(...)`.

### Corrected routing

There is now one semantic recovery authority for REMOTE folder creates:

`durable folder journal -> exact journal routing -> modeled REMOTE observation -> verifyRemoteFolderCreate() -> governed outcome`

Specifically:

1. `recover(device)` detects `effect.kind === "remote-folder-create"` before either generic recovery predicate and calls `recoverFolderCreateJournal(device, journal)` with the exact journal being processed.
2. `transport(device, success=true)` also routes a REMOTE folder-create effect through the same journal-specific verifier-backed helper rather than generic `physicalMatches(...)`.
3. `effectAuthoritativelyNotApplied(...)` no longer contains any `remote-folder-create` case.
4. `physicalMatches(...)` no longer contains any `remote-folder-create` case.
5. `recoverFolderCreate(...)` iterates all eligible folder-create journals and passes each exact journal to `recoverFolderCreateJournal(...)`; it no longer chooses an unrelated first folder journal.
6. `recoverFolderCreateJournal(...)` derives `RemoteFolderCreateObservation` from modeled REMOTE state and calls frozen `verifyRemoteFolderCreate(...)`.
7. Only verifier `verified-effect` calls `markVerified(...)` for a folder create.
8. Only verifier `verified-not-applied` retires that exact folder journal for replan.
9. Verifier `conflict-preserved` sets path conflict and leaves the durable journal present.
10. Verifier `outcome-unknown` sets recovery and leaves the durable journal present.
11. Folder recovery performs observation only; it does not redispatch during restart recovery.

## Static bypass-removal audit

Current `test/adversarial-model/support/model.ts` was inspected at branch head after G-C2.

### `recover(...)`

- `remote-folder-create` is intercepted first and routed to `recoverFolderCreateJournal(device, journal)`.
- The subsequent calls to `physicalMatches(...)` and `effectAuthoritativelyNotApplied(...)` therefore apply only to non-folder effects.

### `physicalMatches(...)`

Recognized effect kinds after G-C2:

- `remote-create`
- `remote-update-candidate`
- `remote-trash`
- `local-write`
- `local-trash`
- `local-move`

There is no `remote-folder-create` branch.

### `effectAuthoritativelyNotApplied(...)`

Recognized remote-create family after G-C2:

- `remote-create`
- `remote-update-candidate`

plus ordinary trash/local-effect cases.

There is no `remote-folder-create` branch.

### `recoverFolderCreate(...)` / journal-specific helper

- `recoverFolderCreate(...)` iterates all durable folder-create journals.
- Each eligible journal is passed to `recoverFolderCreateJournal(...)`.
- The helper uses that journal's own persisted descriptor and its own `remote-folder-create` effect.
- The physical observation is produced by `observeFolderRecovery(...)` and passed directly to frozen `verifyRemoteFolderCreate(...)`.

### `settle(...)`

- Restart-recovery stages still enter through the ordinary `recover` event.
- Since `recover(...)` now routes folder journals to the verifier-backed helper, `settle(...)` has no generic folder-recovery bypass.
- A per-settle attempted-journal set prevents an unchanged conflict/recovery result from being repeatedly re-read indefinitely during the same settle call.

### `remote-folder-create` call-site conclusion

Current supported classification paths are:

- physical dispatch: `applyPhysicalEffect(...)` creates the modeled physical Drive object;
- successful transport observation: routes to `recoverFolderCreateJournal(...)`;
- restart/generic recovery: routes to `recoverFolderCreateJournal(...)`;
- explicit folder recovery event: iterates eligible folder journals and routes each to `recoverFolderCreateJournal(...)`.

No supported path can classify REMOTE folder-create success or authoritative absence through generic ID/path matching or reserved-ID absence alone.

## Regression coverage added

Directly affected tests in `test/adversarial-model/adversarial-model.test.ts` now include:

1. `G-C2 wrong parent through generic recover cannot become effect-verified`
   - correct reserved ID/path, wrong actual parent;
   - ordinary `recover` produces verifier conflict;
   - effect remains `dispatch-authorized`, not verified.

2. `G-C2 occupied target with reserved ID absent remains conflict through generic recover`
   - reserved ID absent;
   - independent target occupant present;
   - ordinary `recover` preserves conflict and does not silently retire the journal.

3. `G-C2 authoritatively clear target may retire only from verifier verified-not-applied`
   - reserved ID absent;
   - target clear with complete observation;
   - ordinary `recover` records verifier `verified-not-applied` and retires the exact journal for replan.

4. `G-C2 response-loss recovery verifies exact physical folder without increasing dispatch count`
   - starts from `outcome-unknown` after physical dispatch and lost response;
   - ordinary `recover` obtains verifier `verified-effect`;
   - dispatch count does not increase.

5. `G-C2 incomplete physical observation remains recovery through ordinary settle`
   - reserved folder lacks complete observed parent structure;
   - ordinary `settle` reaches verifier-backed recovery;
   - outcome remains `outcome-unknown` / recovery;
   - no physical success or authoritative absence is fabricated.

6. `G-C2 generic recover routes multiple folder journals by exact journal identity`
   - two simultaneous persisted folder journals;
   - first has wrong parent and remains conflict;
   - second has exact observed parent/path and becomes `effect-verified`;
   - two recovery reads prove journal-specific routing rather than repeated selection of an unrelated first journal.

Existing directed scenarios 1-32, F1-F10, deterministic randomized seed set, replay, minimization, and trace sanitization remain present in the G entrypoint.

## Verification

### Focused nested G runtime

Required command:

`node --test .test-build/test/adversarial-model/adversarial-model.test.js`

Result:

`NOT AVAILABLE IN THIS SESSION`

Reason: the available local execution container cannot clone/fetch the repository because outbound DNS/network is disabled. The existing permitted GitHub Actions workflow compiles nested `test/**/*.ts`, but its `npm test` runtime discovery executes only top-level `.test-build/test/*.test.js`. G did not alter package/workflow configuration merely to make nested tests discoverable.

Therefore compilation is not represented as focused runtime execution.

### Repository CI actually performed

Temporary draft PR #44 was reopened only to trigger the existing repository CI for G-C2 and is not an integration proposal.

Corrected code head checked by CI: `6709074df443c3e29bdf88e6d40a8f11c79d154e`.

GitHub Actions:

- run: `33446193012`
- job: `99665726439`

Results:

- install dependencies: PASS
- `npm run typecheck`: PASS
- ordinary repository `npm test`: PASS
- production build: PASS
- complete job: PASS

Important qualification: ordinary `npm test` compiled the nested G suite but did not runtime-execute the nested G entrypoint.

### `npm run check`

Literal command result:

`NOT AVAILABLE IN THIS SESSION`

Its three constituent repository commands (`typecheck`, ordinary `npm test`, `build`) each passed in the same CI job. This is component-equivalent evidence only, not a claim that the literal wrapper command ran.

### `git diff --check`

Literal command result:

`NOT AVAILABLE IN THIS SESSION`

GitHub compare and exact changed-file inspection were used as the available diff surface.

## G-C2 diff inspection

Compare from rejected candidate head `36a823329b108d7e176c2b6e253ab32b3d92e980` to corrected code head `6709074df443c3e29bdf88e6d40a8f11c79d154e`:

- status: ahead
- ahead by: 2
- behind by: 0
- merge base: exact rejected candidate head
- changed files before evidence update:
  - modified `test/adversarial-model/support/model.ts`
  - modified `test/adversarial-model/adversarial-model.test.ts`

This evidence file is the only additional authorized G-only change in the final evidence commit.

## Frozen-boundary confirmation

G-C2 changed no production file.

Unchanged:

- `src/**`
- `src/contracts/**`
- existing tests outside `test/adversarial-model/**`
- `src/testing/fakes.ts`
- planning/foundation artifacts
- `dev/evidence/_ca-output.md`
- workflow configuration
- release configuration
- Azure configuration
- OAuth configuration
- Drive scopes
- Workstream D
- A-F worker branches
- integration/protected branches

No merge, Stage 3 work, physical Windows/iPhone synchronization, release, or tag was performed.

## Remaining limitation

The only material verification limitation is focused nested-G runtime execution on an authorized execution surface. It remains explicitly recorded as `NOT AVAILABLE IN THIS SESSION`.
