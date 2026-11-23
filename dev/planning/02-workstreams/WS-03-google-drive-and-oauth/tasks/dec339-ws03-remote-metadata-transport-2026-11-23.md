# DEC-339 / WS-03 — Remote Metadata Transport Seam

**Authorized:** Owner, 2026-11-23.  
**Builder session:** `build-brain-68`.  
**Starting state commit:** `8bbc67db3bb34137ac4be8188b5b50de34855180`.  
**Branch:** `build/dec339-ws03-remote-metadata-transport-20261123`.  
**Status:** BUILDER ACTIVE — software-only.

## Objective

Execute canonical DEC-339 integration step 2: connect the already-implemented dormant metadata source/reader to the **existing authenticated Google Drive transport**. Do not create a second OAuth client, broaden OAuth scope, activate inventory-backed planning, migrate a live database, or perform live Drive/vault/device operations.

## Existing components to reuse

- `src/drive/inventory-metadata-source.ts` — read-only Drive v3 metadata source.
- `src/drive/verified-metadata-inventory-reader.ts` — verified baseline/Changes/targeted observation reader.
- `src/drive/google-drive-port.ts` — existing paired-account/root validation and production Drive adapter.
- `src/drive/runtime.ts` — existing Obsidian OAuth + `requestUrl` + `GoogleHttpTransport` composition.
- Existing DEC-339 provider/Changes tests and WS-03 Drive tests.

## Bounded implementation

1. Add one read-only, non-PII account-binding accessor at the existing Drive boundary. It must derive an opaque deterministic key from the existing paired account secret and must never expose a token, email, display name or raw paired account key.
2. Construct `GoogleDriveInventoryMetadataSource` and `VerifiedMetadataInventoryReader` from the **same** `GoogleOAuthSession`, `GoogleHttpTransport` and `GoogleDriveAdapter` already used by production Drive operations.
3. Expose the dormant verified metadata reader from `createObsidianGoogleDriveBoundary` for later authorized integration stages.
4. Preserve the reader's existing two-domain full baseline, paginated Changes continuity, ID/parent/path occupancy, root-wide provenance, `incompleteSearch`, unknown/inaccessible and invalid-cursor fail-closed behavior.
5. Keep this step read-only. No planner/executor wiring, state publication, inventory activation, live database migration, OAuth-scope expansion, or remote mutation is authorized.

## Verification expectations

Through existing PHX-CI, prove at minimum:

- boundary construction returns the existing Drive adapter plus the verified metadata reader;
- inventory metadata requests share the same authenticated `requestUrl` transport and remain GET-only;
- the paired account binding exposed to inventory is deterministic and opaque, and not equal to the raw stored account identity;
- missing pairing identity fails closed;
- existing metadata reader/provider adversarial pagination, Changes, incomplete-search, duplicate/provenance and uncertainty tests remain intact;
- no new dependency, PowerShell verifier, OAuth client, or production runtime activation is introduced.

## Acceptance boundary

Exact-source PHX-CI PASS followed by blind-first independent Reviewer acceptance. This unit does not authorize master/PR #157 merge, inventory activation, live database migration, live Google Drive/vault/device operations, physical testing, installation, promotion or release.
