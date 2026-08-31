# Workstream A v1.2 Continuation / Correction Evidence

## Identity and branch control

- Agent: `agt-CA-P6-SYNC-REMOTE-01`
- Workstream: Remote / Google Drive Protocol
- Branch: `phase6-sync-remote-v1.2-continuation`
- Approved frozen v1.2 foundation base: `96b4541b15012ac4ce0d81243b73ef779efd343e`
- Rejected head repaired by this correction pass: `26b66f5acf7c7eb439dc5683783b4a0016ce6a21`
- Production correction commit: `7892589a45038e270b4a1ca0a7d96cf78cd348c7`
- Historical branch `phase6-sync-remote` was not merged, cherry-picked, rebased, or otherwise consumed.
- No merge authority was exercised.

## Frozen authorities preserved

The continuation/rejection package was applied without changing the frozen synchronization contracts.

Preserved boundaries include:

- `phase6-sync-foundation-v1`
- `phase6-sync-folder-create-recovery-v1`
- `RemoteFolderCreateRecoveryReadPort`
- `RemoteFolderCreateObservation`
- `ReliableRemoteChangePort`
- all `src/contracts/**` files and semantics

The continuation work used the approved repository copies of the construction manual, target-system specification, synchronization foundation contract, folder-create recovery contract, Google Drive contract, and common contract. No worker-local replacement contract or shadow contract was introduced.

## Correction A-C1 — duplicate intermediate parent cannot become authoritative absence

Corrected `observeFolderCreateRecovery(...)` in `src/drive/google-drive-port.ts`.

After exact reserved-ID absence is established, recovery now:

1. resolves the intended parent path through the existing unique-parent resolver;
2. returns `unobservable` when parent resolution is ambiguous or incomplete;
3. permits `authoritative-absent` when the intended parent itself is authoritatively absent;
4. when one parent is established, enumerates only the intended child name under that exact parent;
5. classifies zero child matches as authoritative target absence;
6. classifies one child match as `occupied`;
7. classifies multiple child matches as `unobservable`.

The recovery observation remains read-only. Descriptor parent/path facts remain expectations and are not substituted for observed Drive structure.

## Correction A-C2 — preserve successful reconciliation pages when a later page fails

Corrected reconciliation traversal in `listDomainReadOnly(...)` in `src/drive/google-drive-port.ts`.

Reconciliation now:

1. requests and processes each Drive child-list page incrementally;
2. validates and appends every object from a successful page before following `nextPageToken`;
3. leaves those truthful observations in the caller-owned `entries` accumulator if a later page fails;
4. allows `listForReconciliation()` to return the accumulated entries with `completeness.status = "partial"` for transient/rate-limited interruption;
5. does not treat unvisited pages as absent.

The stricter all-or-nothing `children()` lookup helper was not weakened.

## Repair-pass file manifest from rejected head to production correction commit

GitHub compare `26b66f5acf7c7eb439dc5683783b4a0016ce6a21...7892589a45038e270b4a1ca0a7d96cf78cd348c7` reports exactly one changed file:

- Modified: `src/drive/google-drive-port.ts`

No repair-pass test edit was required because the existing regression expectations already described the required semantics.

After this evidence closure commit, this A-specific evidence file is additionally created:

- Created: `dev/evidence/_ca-output-agt-CA-P6-SYNC-REMOTE-01.md`

No file was deleted.

## Verification performed

### Existing GitHub Actions verification surface

The repository's existing PR-triggered `Phase 1 CI` workflow was used without modifying workflow files.

- Source branch SHA under verification: `7892589a45038e270b4a1ca0a7d96cf78cd348c7`
- GitHub Actions run: `33436126598`
- GitHub Actions job: `99632877749`
- Job conclusion: `success`
- Runtime: Node `22.23.2`

Important checkout distinction: this PR workflow verified GitHub's generated merge ref, not a literal detached checkout of the source SHA. The checkout log states:

`HEAD is now at dac4ce6 Merge 7892589a45038e270b4a1ca0a7d96cf78cd348c7 into b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`

Therefore:

- source correction SHA: `7892589a45038e270b4a1ca0a7d96cf78cd348c7`
- verified PR merge ref: `dac4ce67173cd183577880ad297bc48adfbc5432`

### `npm run typecheck`

Performed by GitHub Actions job `99632877749`.

Result: **PASS**.

### `npm test`

Performed by GitHub Actions job `99632877749`.

Result: **PASS**.

- Tests: `441`
- Passed: `441`
- Failed: `0`
- Cancelled: `0`
- Skipped: `0`
- Todo: `0`

Explicit rejected-regression proof:

- `workstream A v1.2 recovery: duplicate parent path is unobservable` — **PASS** (`ok 130`)
- `partial reconciliation listing never masquerades as complete` — **PASS** (`ok 143`)

### `npm run build`

Performed by GitHub Actions job `99632877749`.

Result: **PASS**.

Build verification reported:

- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `BUILD_ARTIFACT_SIZE=446281`
- `BUILD_ARTIFACT_SHA256=9550ae1024ba6a2ac559abc64d108e155425c5b7404175eeb750bad1e9edd3fc`

### `npm run check`

`NOT AVAILABLE IN THIS SESSION`

The existing workflow does not invoke the wrapper command itself, and modifying workflow files is prohibited. The repository `package.json` defines `check` as:

`npm run typecheck && npm test && npm run build`

Each constituent command was separately executed and passed in the same successful CI job above. This is recorded as constituent verification, not as a claim that the wrapper command itself ran.

### `git diff --check`

`NOT AVAILABLE IN THIS SESSION`

No local executable checkout was available, and the existing permitted workflow does not run this command. No workflow modification was made to add it.

### Diff / ownership inspection

The GitHub compare from the rejected head to the production correction commit was inspected. It reports one commit ahead, zero behind, and only `src/drive/google-drive-port.ts` modified. The final evidence-only commit adds only this A-specific evidence file.

## Boundary confirmations

- `src/contracts/**`: unchanged.
- No Workstream D or G production file changed.
- `test/phase3-drive.test.ts`: unchanged by the A-C1/A-C2 repair pass.
- `test/workstreams/drive/phase6-remote-protocol.test.ts`: unchanged by the A-C1/A-C2 repair pass; its existing regression tests passed.
- `dev/evidence/_ca-output.md`: unchanged.
- `.github/workflows/**`: unchanged.
- `package.json` / build configuration: unchanged.
- `phase6-sync-foundation-v1.2` foundation: unchanged.
- `phase6-integration`, `master`, and `main`: not modified.
- D/G worker branches: not consumed or modified.
- No merge, release, tag, Stage 3 work, or physical Windows/iPhone synchronization was performed.

## Remaining limitations

Only the explicitly reported verification-surface limitations remain:

- literal execution of `npm run check`: `NOT AVAILABLE IN THIS SESSION`; all three constituent commands passed in CI;
- literal execution of `git diff --check`: `NOT AVAILABLE IN THIS SESSION`;
- GitHub Actions used a PR merge ref containing the exact source correction SHA rather than a literal detached source-head checkout.

A-C1 and A-C2 are corrected and the corrected candidate is returned for independent supervisor re-review. This evidence file is Workstream A-specific and does not replace canonical integration closure in `dev/evidence/_ca-output.md`.
