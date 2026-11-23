# DEC-339 / WS-03 Remote Metadata Transport Seam — Final independent review

**VERDICT: PASS WITH MINOR FINDINGS — bounded WS-03 feature independently accepted at its frozen source.**

**Reviewer:** `review-brain-10`  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Branch:** `build/dec339-ws03-remote-metadata-transport-20261123`  
**Frozen accepted source SHA:** `f5f30de03d8968688c3dae487d15fab2aa75b720`  
**Frozen Git tree:** `c7314885dd6af6f827ea0f0c382ab86c3e4dd393`  
**Incoming state commit:** `bd7574d06b61d4314eb01f120f3d2f5bcfc0e354`, handoff count 1, sender BUILDER, recipient REVIEWER.  
**Blind-first source assessment:** `dev/reviews/dec339-ws03-remote-metadata-transport-20261123-review-brain-10-blind-source.md`, published at `f26790a72747c43df09ff8f7b56ffd29911be584`. Published before examining authored tests, original PHX-CI evidence and source-history comparison.

## Independent source assessment

**PASS within the bounded read-only transport-composition scope.** `src/drive/runtime.ts` constructs one existing Obsidian SecretStorage wrapper, `GoogleOAuthSession`, `GoogleHttpTransport` through the production `requestUrl` fetcher and `GoogleDriveAdapter`. The *same object instances* feed the new dormant `GoogleDriveInventoryMetadataSource` and returned `VerifiedMetadataInventoryReader` alongside the legacy Drive adapter and OAuth boundary. No second OAuth flow or client, new Drive scope, inventory planner selector, canonical state publication or mutation path was introduced.

`src/drive/google-drive-port.ts` adds `pairedInventoryAccountKey()`, deriving a deterministic SHA-256 digest from the previously stored paired-account identity using a domain prefix; the raw paired identity/token is not returned. The metadata source's `verifyFence()` requires that digest and an independently validated managed-root binding; the existing Drive adapter's `validateManagedRoot()` rechecks current authenticated account identity, exact vault/managed root and protocol identity, and requires explicit pairing. Missing binding refuses before provider HTTP. `src/drive/inventory-metadata-source.ts` performs Drive metadata GETs only; the existing OAuth token refresh may itself POST to Google's token endpoint but is not a Drive metadata mutation. Existing two-domain baseline, paginated Changes, ID/parent/path occupancy, root-wide provenance, incompleteSearch/unknown/partial and fail-closed invalid-cursor logic remains in the unmodified verified reader.

`src/product/runtime.ts` still constructs the original `ProductSnapshotAssembler`, not the inventory-backed planner; this is a dormant future integration seam, not activated inventory.

## Authored tests / test-oracle integrity

Independently examined `tests/unit/phase3-drive.test.ts` and the existing `tests/unit/dec339-remote-reader.test.ts`, `tests/adversarial/dec339-provider-changes-adversarial.test.ts`, and `tests/contracts/dec339-inventory-contracts.test.ts` scope. The new WS-03 tests:
- instantiate the **production** Obsidian boundary with existing OAuth tokens and pairing secret and a controlled `requestUrl`, then exercise `metadataReader.verifyRootWideManagedProvenance`; assert real boundary transport calls to Drive `about` and `files`, all GET, and successful verified observation;
- assert repeated opaque account binding is stable, is distinct from a raw email-like pairing identity, and has the expected SHA-256 form, while an unpaired adapter returns undefined;
- assert the reader reports incompatible when pairing is missing, with **zero HTTP requests**.
- The focused command includes the above boundary tests, existing verified reader/provider adversarial cases, and inventory contracts. Full tests were also run.

The initial R1 original PHX-CI `4f7089b8-f3fc-4e3d-8534-79f08e474868` was BLOCKED by an incomplete success fixture missing a required root parents array. The R2 original run `fe5780d5-9df0-4371-aa7d-c550cc03a161` was BLOCKED by a test OAuth token inside the 60-second refresh window. The qualified source corrects fixture parent completeness and token lifetime; source comparison from pre-compatibility `2c46aa4a4be76f85ebba51d35e5ac4aef7a413d7` to qualified source shows only `package.json` focused-selector changes, two line modifications to the WS-03 test file and administrative/evidence files, **no weakened security assertions or production changes**.

## Mandatory ten-family adequacy

| Family | Independent verdict |
| --- | --- |
| 1. Nominal success | PASS — actual composition to verified reader over existing authenticated requestUrl |
| 2. Negative/boundary | PASS — missing pairing fails before HTTP; unchanged provider/reader malformed/incomplete cases included |
| 3. Legal/forbidden state transitions | PASS for read-only transport boundary, GET requests and fail-closed identity; mutable state transitions N/A to dormant read-only seam |
| 4. Retry/repetition/recovery | PASS for stable account-binding repetition and retained reader pagination/recovery error paths; new cancellation mechanism N/A |
| 5. Concurrency/staleness | PASS through unchanged verified Changes/reader tests; no shared mutable writer added |
| 6. Persistence/restart/integrity | N/A for new persistence because no inventory publication/migration/writer added; verified reader provider-observation integrity retained |
| 7. Identity/security/trust | PASS — explicit pairing digest, same paired account guard, exact managed root/fence and no-pairing denial |
| 8. Contracts/compatibility | PASS — unchanged OAuth and Drive adapter return, additive dormant metadataReader, same shared session and transport |
| 9. Architecture/invariants | PASS — no scope expansion, second client, production inventory activation, remote write or new dependency |
| 10. End-to-end/fail-closed | PASS for simulated boundary→authenticated requestUrl→Drive metadata verifier, with negative no-pairing refusal; physical Drive/vault/device operations not applicable or authorized |

## Original exact-source PHX-CI

**Run:** `ba4606cb-cab1-462e-a572-1b87302414f0`  
**Evidence-only commit:** `e77f1f2eaaca742075cec6c67ffa78a0bc422c2d`  
**Canonical evidence:** `dev/test-results/ba4606cb-cab1-462e-a572-1b87302414f0/result.md`, `result.json`, `terminal.log`  
**Pinned runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`.

Directly inspected original Markdown, JSON and full terminal log after the blind report was frozen. Exact source/tree match expected and verified repository HEAD/tree `f5f30de03d8968688c3dae487d15fab2aa75b720` / `c7314885dd6af6f827ea0f0c382ab86c3e4dd393`. **13/13 required stages PASS**, focused **78/78 PASS**, product **1342/1342 PASS**, original exit 0, typecheck/build/artifacts/check/repository PASS. Built `main.js`: **966306 bytes**, SHA-256 `6a07283dd39a6c5634fe89f5131e402a7d7a398e71ee404812eaab0717b95427`. The evidence commit is a direct child of qualified source and changes only `dev/_ca-output.md` and the three original run evidence files — no production source or tests. No Reviewer software verification was executed and no GitHub Actions/real Drive/device activity was performed.

## Minor findings / next integration

**M-01 — Opaque is not anonymous.** The paired account binding is a domain-separated but unkeyed SHA-256 of an account identifier that could be email-like; it does not expose raw email and meets the expressly bounded opaque-binding requirement, but could be reverse-guessed by an entity with the digest and a candidate account list. Treat it as pseudonymous; consider keyed device-local binding if later telemetry/export or a stricter privacy requirement is authorized.

**M-02 — Reader proof remains isolated/dormant.** The exercised real composition test checks `verifyRootWideManagedProvenance()`, not a complete baseline and Changes walk through the constructed production boundary. The existing reader/provider suites independently test those algorithms. Future integrated inventory activation should include combined-boundary baseline/Changes and storage publication tests on the exact assembled source; this BU does not establish them.

**M-03 — Blind review information-isolation disclosure.** Required neutral planning/state records contain Builder-maintained test/qualification claims incidentally exposed during handoff inspection. They were not used as proof before the independent source assessment was frozen.

## Governance and handoff limitation

The user's assignment expressly allows the Reviewer to write **only its independent reports**. Therefore this review **does not** edit `dev/state/current-state.yaml`, increment the feature-local handoff counter, or assert a new published state commit. Acceptance of this bounded source is recorded in this immutable final review report, but the formal outgoing Reviewer→Builder handoff is **PENDING authorized metadata publication**. An authorized state writer must verify remote count 1/recipient REVIEWER, atomically increment to count 2 with recipient BUILDER and reference this report, publish and verify the new state commit, then deliver a fully populated count-2 handoff **without repeating this independent review or original PHX-CI run**. No synthetic SHA/claim of published transfer may be made.

**FINAL SOURCE VERDICT: PASS WITH MINOR FINDINGS — WS-03 TRANSPORT SEAM ACCEPTED.** Full WS-03/WS-02 and DEC-339 integration/cutover remain separately gated. No master merge/PR #157 merge, inventory activation, live migration, actual Drive/vault/device operations, physical testing, installation, promotion or release authorized.
