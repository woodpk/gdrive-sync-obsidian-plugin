# Verification Plan — Integrated Synchronization Product and User Workflows

## Objective completion evidence

- End-to-end automated integration scenarios cover first sync, additional-device pairing, ordinary local edit, ordinary remote change, offline edit/reconnect, text merge, true text conflict, binary conflict, rename/move, deletion, delete-vs-modify, suspicious bulk destruction, recovery mode, cancellation, and stale-precondition re-planning.
- Manual and automatic synchronization demonstrably use the same planning semantics; no alternate unsafe mutation path exists.
- Status, preview, conflict, recovery, audit/history, notification, pause/resume, and Verify/Reconcile flows operate against real product state rather than UI-only mock behavior.
- Transfer verification precedes authoritative success-state commit in integrated tests.
- Auth revocation, wrong account, missing remote root, corrupt state, lost cursor, partial remote listing, local unreadability, disk/quota exhaustion, network/rate failure, invalid path, and repeated per-path failure produce the specified product response.
- First-sync and corrupt-state integration tests prove destructive propagation remains disabled until trustworthy state exists.
- The integrated product builds successfully and remains loadable on both desktop and mobile Obsidian targets.

## Verification authority

Authoritative software-change acceptance is through the pinned PHX-CI under **DEC-338**. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.

## DEC-362 integrated regression evidence (2026-11-18)

Before DEC-339 planner cutover, integration evidence must prove all of the following with production planner/executor/state semantics:

- Windows-originated ordinary update retains the established remote ID and the receiving device converges to the new content;
- opposite-direction ordinary update likewise preserves the same ID;
- representative concurrent non-overlapping text edits clean-merge and converge while preserving the established remote ID;
- stale plans/revisions detectable before dispatch, replacement by an unrecognized ID, same-name sibling ambiguity and uncertain observed provider effects fail closed or replan; the Owner-accepted DEC-363 risk of a same-file write by another device **after** the final revision check and **before** the provider update is a narrow exception, not an atomic-write guarantee;
- interruption/ambiguous network outcome plus restart recovers against the exact established ID without creating/adopting a replacement;
- post-effect state/BASE/remoteMappings retain the same logical remote identity while revision/content evidence advances;
- Changes/inventory observation sees a content/revision transition on the same ID, not a manufactured remove/create identity transition;
- no regression to true creates, rename/move identity preservation, trash/delete recovery, first-sync union, conflicts, or D339 fallback behavior.

Use the mandatory Builder test families where materially applicable: nominal; negative/boundary; legal/forbidden state transitions; retry/recovery/idempotency; concurrency/order/races; persistence/restart/data integrity; identity/auth/security/trust; contracts/integration/backward compatibility; architecture/ownership/invariants; end-to-end/fail-closed/destructive safety. Changed software must pass exact-source PHX-CI and independent review before the DEC-339 integration sequence proceeds.


## DEC-339 integration-specific evidence (2026-11-17)

Verify **two distinct preactivation stages**: (1) storage-only shadow/local-hint capture with no behavioral authority and (2) observation-only baseline plus Changes comparison without inventory-based dispatch. Compare legacy versus inventory-backed LOCAL/REMOTE/BASE snapshots, planner operations and destructive safety on identical inputs: **exact equivalence** for complete/unambiguous cases and **never more permissive** for ambiguous/partial cases. Verify fresh local enumeration remains authoritative despite persisted hints; cover cursor drift, provenance, incomplete scopes, restart/recovery, rollback-aware fallback and full reconciliation. Measure actual request counts/latency against the **existing incremental** path and relevant resource budgets. Qualify software through PHX-CI (DEC-338); conduct BVP operational scenarios **directly** (DEC-350) using Windows-first simulation (DEC-347). Physical iOS remains unverified without Owner authorization. D339-06 executor targeted reads remain a separate future proof gate. See [the integration plan](tasks/dec339-inventory-production-integration-2026-11-17.md).

## DEC-362 accepted closeout and scoped exception (2026-11-19)

The existing-file/clean-merge stable-ID correction at source `640845815dc85672c2411b1b7d3ae48f17a86bc2` and tree `133efbae0fc19162c168caf567ec663de04115fa` passed original Windows software-only PHX-CI (`56e68fb7-2b1f-4b47-9969-9e871bd30f7a`) and independent review (`dev/reviews/dec362-20261119-review-brain-10-final.md`, PASS WITH MINOR FINDINGS). Owner-locked **DEC-363** accepts the exceedingly rare final pre-dispatch check-to-write concurrent same-file overlap and waives new atomic concurrency-control work/tests **for that narrow case only**. All other preconditions, path/provenance/identity, post-update verification, durability, and fail-closed behavior remain required. DEC-339 planner integration/activation and any real Google Drive/device testing are separate permissions, not consequences of this feature acceptance.

## DEC-364 / DEC-339 BU01-F03 — bounded continuity (2026-11-24; historical pre-research design)
All ten families in F03 §9 via PHX-CI: real shipping adapter, parity vs independent complete physical reference, never more permissive on uncertainty, no hidden fallback, same-ID/fresh authority, retained executor safety. Measure post-correction requests, payload bytes, timing and resources against existing legacy incremental, setup/refresh/steady/exception separately. Preserve F02 evidence.
Canonical prospective design: `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`. Documentation only; no authorization to build.

### DEC-365 — operative research-supported design
Require zero routine census, semantic parity on supported complete evidence, never more permissive on detectable uncertainty. Test silent omission via affected-effect safeguards and periodic/full reconciliation. Measure after correction, retain ten families and PHX-CI. See canonical F03 design §2.1. Earlier pending-proof and documentation-only restrictions are superseded for implementation; activation, live use and release remain unauthorized.
