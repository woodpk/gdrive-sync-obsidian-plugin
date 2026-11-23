# WS-03 / DEC-339 — Frozen independent blind production-source assessment

**Reviewer:** `review-brain-10`  
**Phase:** Source-only blind pass, frozen before authored tests, verification evidence, source comparisons/history and prior review material  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** WS-03 — DEC-339 Remote Metadata Transport Seam  
**Planning:** `dev/planning/02-workstreams/WS-03-google-drive-and-oauth/tasks/dec339-ws03-remote-metadata-transport-2026-11-23.md`  
**Frozen source SHA:** `f5f30de03d8968688c3dae487d15fab2aa75b720`  
**Frozen source tree:** `c7314885dd6af6f827ea0f0c382ab86c3e4dd393`, independently verified against the Git commit.  
**Published incoming state:** `bd7574d06b61d4314eb01f120f3d2f5bcfc0e354`, feature-local count **1**, sender BUILDER and recipient REVIEWER; current remote branch `build/dec339-ws03-remote-metadata-transport-20261123` points to this state.

## Normative feature boundary

The WS-03 plan requires reusing the already shipped Obsidian SecretStorage, `GoogleOAuthSession`, `GoogleHttpTransport`, `GoogleDriveAdapter` and `requestUrl` bridge to expose the existing dormant `GoogleDriveInventoryMetadataSource` / `VerifiedMetadataInventoryReader` without a second OAuth client, scope expansion, new write, inventory-backed planner activation, persistence publication, provider mutation, physical execution or live migration. A deterministic opaque non-PII binding must derive from the existing paired-account secret, not expose that raw identity, token or email. Missing or invalid account pairing must fail closed. Baseline, Changes, root/provenance and paginated uncertainty semantics remain governed by existing reader/source contracts.

## Independent source observations

1. `src/drive/runtime.ts` lines 27–44 constructs exactly one shared `ObsidianSecretStore`, `GoogleOAuthSession`, `GoogleHttpTransport` (backed by `createObsidianRequestUrlFetcher`) and `GoogleDriveAdapter`. The same `transport` object is passed to a new `GoogleDriveInventoryMetadataSource`, with the same `drive` for managed-root verification; a `VerifiedMetadataInventoryReader` is returned as `metadataReader` alongside the unchanged `oauth` and `drive`. This is a **read-only dormant composition seam**; no second OAuth flow or planning selector is introduced.
2. `src/drive/google-drive-port.ts` lines 170–177 adds `pairedInventoryAccountKey(): Promise<string | undefined>`. It retrieves the existing `brain-gdrive-paired-account` secret and returns a domain-separated `sha256:` digest, not the raw value; missing storage yields `undefined`. The digest is deterministic across uses of the same stored secret and is not an access token or cleartext account email.
3. `src/drive/inventory-metadata-source.ts` receives only the shared drive's `validateManagedRoot`, shared transport's `request`, and that hashed binding callback. `verifyFence()` first requires its opaque binding to equal `fence.pairedAccountKey`; it then calls `drive.validateManagedRoot`, whose `guardPairedAccount` re-observes the current authenticated Google account, requires an existing pairing secret, and refuses a mismatch. It independently checks managed root IDs, exact root identity, child domain roles and parents. Reader `baseline()`, Changes and targeted observation methods check this fence before provider reads.
4. The metadata source's calls use Drive v3 metadata GETs (`files/{id}`, list children, marked objects, Changes and startPageToken); the HTTP transport reuses the existing authenticated OAuth session and `requestUrl` bridge. OAuth refresh POST to Google's token endpoint, if needed, is part of preexisting authentication, not a new Drive metadata mutation. `src/contracts/google-drive.ts` retains the single `drive.file` scope.
5. The existing reader/source retains strict structural provider JSON parsing, fail-closed incompleteSearch, pagination token-cycle and max-page bounds, ordered Changes continuity, two-domain baseline, exact-ID/parent/path provenance verification and uncertainty classification. There is no source-level conversion of incomplete or unavailable Drive data to confirmed global absence. `src/product/runtime.ts` continues selecting the original `ProductSnapshotAssembler`, not the inventory-backed planner.

## Blind concerns and qualifications

- **Q-01 — Non-blocking privacy hardening consideration.** The account binding is a deterministic, unsalted SHA-256 digest of the stored pairing identity with a fixed domain prefix. It is opaque and avoids disclosing the **literal** identity, as the bounded planning requirement requests, but if the underlying pairing identity is a guessable email address, an observer with the digest could test candidate addresses offline. It should therefore be treated as a pseudonymous account identifier, not guaranteed anonymous data. Evaluate whether future persistence/telemetry/exposure requires a keyed local digest or other stronger privacy property; no such storage/export/telemetry change is introduced by this BU.
- **Q-02 — Boundary-specific proof required in Pass 2.** Although production source shares the exact transport and auth objects, authored tests must prove requests traverse Obsidian `requestUrl`, use GET at Drive metadata endpoints, and fail closed before any provider request when the explicit pairing is absent. The exposed `metadataReader` is dormant and unconnected to the actual planner; this cannot be advertised as live inventory integration.
- **Q-03 — Source scope.** Provider's `verifyFence` is performed per high-level reader operation, not independently in each private `get()` request; prior verified reader architecture must continue handling mid-scan drift. Any later activation must requalify the *integrated* candidate and validate its authority recheck, not treat this transport seam as authorization to use inventory for mutations.

## Provisional blind verdict

**SOURCE-LEVEL PASS WITH MINOR QUALIFICATIONS**, subject to independent authored-test, ten-family, original PHX-CI, history and exact-source inspection in Pass 2. No acceptance-blocking source defect established within this bounded transport-composition contract. This report is immutable and is not final independent feature acceptance.

## Blind separation disclosure

The mandatory neutral plan and feature-local `current-state.yaml` contain embedded Builder-authored implementation, test-family and PHX-CI status statements, incidentally visible when establishing neutral scope and handoff identity. They were not relied upon as qualification or correctness evidence. No authored tests, original PHX-CI results/terminal logs, Builder-only explanation, prior reviews, or source diff/history were opened before this assessment was frozen and published. Subsequent findings belong in the separate final report.
