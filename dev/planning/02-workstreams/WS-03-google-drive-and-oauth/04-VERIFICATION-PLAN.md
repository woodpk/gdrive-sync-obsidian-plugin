# Verification Plan — Google Drive and OAuth Boundary

## Objective completion evidence

- Automated tests/fakes verify Drive ID preservation, managed-root identity validation, remote rename/move, trash semantics, remote schema/version handling, missing-root recovery signaling, and ambiguous remote identity handling.
- Changes API tests verify cursor advancement only after durable incorporation and safe fallback to full reconciliation when the cursor is missing/invalid.
- Partial/failing remote enumeration tests prove absence cannot authorize deletion.
- Retry, rate-limit, quota, ambiguous-upload, large-file, and content-integrity tests pass.
- Authorization uses only `drive.file` and no repository credential is committed.
- Same-device authentication is demonstrated on Windows and iPhone/iOS at least to the extent possible before full product integration; any final lifecycle integration remaining is explicitly carried to Phase 5.
- Hosted callback behavior, if used, is demonstrably content-blind and token-nonpersistent.

## Verification authority

Authoritative software-change acceptance is through the pinned PHX-CI under **DEC-338**. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.

## DEC-362 stable-ID update evidence (2026-11-18)

Before DEC-339 planner cutover, exact-source PHX-CI evidence must prove:

- ordinary existing-file content update preserves `remoteObjectId_before == remoteObjectId_after`;
- clean-text-merge remote propagation preserves the same established Drive ID;
- stale ID/revision/content preconditions reject before mutation;
- retry after transport interruption or ambiguous response resolves the exact established ID without duplicate replacement creation;
- crash/restart before dispatch, after provider mutation, and before state commit remains recoverable and never adopts a different same-name/path object;
- stale identity or revision **already observable before dispatch** blocks or replans safely; per Owner-locked DEC-363, a different-device same-file write in the unobservable interval after the final pre-dispatch revision check and before the provider write remains a narrowly accepted residual risk, not a required atomic-CAS/locking/test gate;
- post-effect verification proves intended resulting content/revision on the same ID before authoritative success;
- genuine creates still use create/reserved-ID retry semantics without conflating create and update identity.

No real Google Drive mutation is authorized merely by this plan; live/provider execution remains separately Owner-gated.


## DEC-339 integration-specific evidence (2026-11-17)

Through existing PHX-CI, prove the metadata reader uses the existing authenticated `drive.file` transport with safe paginated Changes, stable IDs/parents, duplicate siblings, out-of-domain objects, permission loss, incomplete searches and invalid cursors. No real Google API use is authorized by planning. Follow the [single WS-05 integration plan](../WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md).

## DEC-362 accepted closeout and scoped exception (2026-11-19)

DEC-362's existing-file in-place update boundary was PHX-CI-qualified at source `640845815dc85672c2411b1b7d3ae48f17a86bc2` (run `56e68fb7-2b1f-4b47-9969-9e871bd30f7a`) and independently **accepted with minor findings** in `dev/reviews/dec362-20261119-review-brain-10-final.md`. **DEC-363** records the Owner's specific acceptance of the final revision-check-to-write race for this single-user product, with no additional engineering or testing solely for that interleaving. This does not weaken stale revisions detected in advance, exact-ID/root/provenance/path validation, independent post-effect content/revision verification, durable recovery, or ambiguity blocking. Live provider tests and any DEC-339 integration remain separately gated.

## DEC-364 / DEC-339 BU01-F03 — bounded continuity (2026-11-24)
PHX-CI tests complete pagination, empty pages, opaque cursor, malformed/repeated tokens, corpus/identity, escaped marked and unmarked occupancy, access loss, folder ancestry, final horizon race and omitted-feed counterexamples. Simulation cannot establish Google delivery guarantees.
Canonical prospective design: `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`. Documentation only; no authorization to build.
