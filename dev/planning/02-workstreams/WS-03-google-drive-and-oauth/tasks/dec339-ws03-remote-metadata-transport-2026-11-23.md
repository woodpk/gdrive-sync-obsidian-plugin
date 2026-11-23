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


## Builder ten-family test adequacy

1. **Nominal/success** — `tests/unit/phase3-drive.test.ts` constructs the production Obsidian boundary and proves the verified metadata reader operates through the existing authenticated Drive transport.
2. **Negative/boundary/malformed/unsupported** — the WS-03 missing-pairing case fails closed before transport; existing DEC-339 reader/provider tests cover incomplete search, missing/ambiguous pagination terminals, access uncertainty, duplicate occupancy and malformed/unsupported observation states.
3. **Permitted/forbidden state transitions** — **NOT MATERIALLY APPLICABLE to mutable product state in this Build Unit** because this step adds no planner, executor, persistence publication or activation transition. The applicable transport transition boundary is enforced as read-only GET behavior.
4. **Repetition/idempotency/retry/cancellation/recovery** — deterministic account binding is repeatable; existing provider/Changes adversarial coverage exercises multi-page continuation, cursor continuity, cycles and recovery-required outcomes. No new cancellation authority is introduced by this composition-only seam.
5. **Concurrency/races/interleaving/order/stale state** — existing DEC-339 reader tests cover stale cursor/authority and ordered Changes replay. **No new shared mutable state or write race is introduced** by this read-only composition seam.
6. **Persistence/restart/data integrity** — **NOT MATERIALLY APPLICABLE** because this Build Unit neither writes nor migrates the inventory database or canonical cursor; those remain later authorized integration responsibilities.
7. **Identity/authorization/security/trust** — tests prove the paired-account binding is deterministic and opaque, differs from raw stored identity, and missing explicit pairing fails closed before any metadata request.
8. **Contracts/integration/backward compatibility** — production boundary tests prove the existing Drive adapter remains exposed while the metadata reader is added from the same OAuth/session/transport composition; existing Drive and DEC-339 provider/reader suites remain in the focused qualification selector.
9. **Architecture/ownership/invariants** — source and tests enforce reuse of the existing OAuth session, HTTP transport and Drive adapter, with no second OAuth client, scope expansion or planner/executor activation.
10. **End-to-end/fail-closed/destructive safeguards** — the production boundary seam is exercised end-to-end from Obsidian `requestUrl` through Drive metadata observation; requests are GET-only and missing pairing blocks before transport. No remote mutation or destructive action is authorized.

### PHX-CI focused selector

The current PHX-CI Node public interface requires a real focused test command. This feature therefore uses repository script `npm run test:focused`, mapped to `test:focused:ws03`, compiling the normal TypeScript test graph and executing:

- `tests/unit/phase3-drive.test.ts`
- `tests/unit/dec339-remote-reader.test.ts`
- `tests/adversarial/dec339-provider-changes-adversarial.test.ts`
- `tests/contracts/dec339-inventory-contracts.test.ts`

Full repository tests, build, artifacts and repository checks remain PHX-CI-owned mandatory gates and are not replaced by this focused selector.
