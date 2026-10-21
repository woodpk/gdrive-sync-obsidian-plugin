# S09-BR02 — Independent source-only assessment, R3

- Reviewer: `review-brain-09`; date: 2026-10-21.
- Repository: `woodpk/gdrive-sync-obsidian-plugin`.
- Feature: `WS-07/S09-BR02 — BVP Fixed-PHX-CI Consumer Bridge`.
- Frozen candidate source: `51d75e63eac1f3a37ef998cf599f039dce7feb2f`.
- Intake state: `5c842dc1adafc20132e79b3f5d07471c94643518`; handoff-count 5, recipient REVIEWER; branch state identical to requested commit; source is an ancestor.
- Scope: source-only review of this immutable candidate **before accessing candidate tests, original PHX-CI results or source history**. Authoritative sources: WS-07 fixed-runtime bridge plan §§4–9, architecture, DEC-345 and Scope A owner authorization. Relevant implementation: `test-platform/test/batteries/phxci-physical-bridge.ts`; live runner, executor, installed-build measurement/mailbox, scenario contracts and registry.

**Pass 1 disposition: SOURCE CORRECTIONS SUBSTANTIVELY PRESENT; CONDITIONAL, NOT YET ACCEPTED.** Review evidence and tests are necessary to determine whether the required safety/continuation contracts are met.

## Direct source findings

1. **Attempt-level exclusion now exists.** The one-file bridge's `claimBridgeAttemptAuthority` (roughly L689–775) uses stable per-controller logical-run and per-device SHA-derived lock paths beneath `C:\temp`, synchronously creates `active` directories, records PHX run and index and irreversible predecessor-consumption marker, rejects a second active attempt, and retains uncertain/failed locks rather than automatically stealing. The call precedes child runner dispatch (L888–910). The test pass must challenge competing claims, ambiguous crashes, consumed-predecessor reuse and continuation.
2. **Device/observation privacy screening is substantially strengthened.** `deviceIdClaims` rejects physical identities other than `device:sha256:<64 hex>`; `parseResult` checks frame, checkpoint and result identity correspondence, registered-step identity, source-provenance for allowed fixture paths, bounded nested fields, enumerated observation values and known secrets. Test-only device identity constants are allowed solely in a PHX-context fixture carve-out. The second pass must verify actual raw private values and unapproved strings cannot leak through any published result/checkpoint/auxiliary evidence field.
3. **Original PHX-CI authority remains preserved in code.** Existing pinned-run identity, authenticated repository/stage record matching, complete PHX status consistency, no new independent evidence writer, actual registered scenario digest, installed artifact/manifest byte hashes, fixed BVP runner and exit-3-as-BLOCKED semantics remain evident.
4. **Source limitation L699–701 — controller-scoped leases, not distributed leases.** The implementation explicitly says its durable lock is *local to one controller machine*; distinct simultaneous host controllers do not coordinate. This is not a demonstrated flaw in a single-controller software fixture, but the Owner's general single-writer and device-authority §7 may require a distributed owner-approved control if the intended physical deployment permits multiple independent controllers. Do not certify cross-controller exclusivity from this code alone.
5. **Contract limit — strict privacy may intentionally fail closed for real BVP evidence.** `allowedShape` rejects nonempty raw captures and restricts observation states to enumerated values, and original BVP checkpoint/result must remain unmodified. That is safer than publishing personal data, but every eventual physical scenario must prove that its actual canonical result fits the bounded transport; the current source alone cannot establish that all S09A–V batteries are transportable. Rejection of a non-allowlisted result must remain BLOCKED, not silently altered evidence.
6. **Operator physical authorization is still an external gate.** The bridge accepts a request approval flag plus environment handshake. This is not itself proof of authenticated human approval. No physical execution, installation or release is permitted in this review.

## Isolation caveat

This Reviewer session previously assessed earlier versions of S09-BR02, so the current pass cannot truthfully claim *fresh-session, no-prior-exposure* blindness. However the exact new candidate was inspected in source-only order, with candidate tests, historical diffs, Builder commentary and PHX-CI evidence deliberately excluded until this artifact was published. This report freezes the source-only judgment without retroactive editing.

**Next:** Pass 2 must independently inspect authored regression tests and immutable original pinned PHX-CI evidence, check the exact candidate's ten-family adequacy and scope changes, and decide whether the two prior blockers are closed for the claimed software-only scope.
