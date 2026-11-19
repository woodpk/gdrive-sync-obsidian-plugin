# DEC-362 — Independent adversarial final review

**Final verdict: PASS WITH MINOR FINDINGS — SOFTWARE CORRECTION ACCEPTED UNDER EXPLICIT OWNER RISK DECISION**

- Reviewer: `review-brain-10`
- Feature: WS-03 / WS-05 DEC-362, stable Google Drive IDs for existing-file updates and clean merges
- Exact independently reviewed and PHX-CI-qualified source: `640845815dc85672c2411b1b7d3ae48f17a86bc2`
- Exact Git tree: `133efbae0fc19162c168caf567ec663de04115fa`
- Frozen preliminary blind assessment: `dev/reviews/dec362-20261119-review-brain-10-blind-source.md` (commit `9f3f75266f94db0775ebd5b27b15cef070ed4dad`)
- Original PHX-CI run: `56e68fb7-2b1f-4b47-9969-9e871bd30f7a`
- Original evidence publication: `8f7dfdefa96eae3bec7a1acc4fc22763757756a5`
- Original evidence files: `dev/test-results/56e68fb7-2b1f-4b47-9969-9e871bd30f7a/result.md`, `result.json`, `terminal.log`; `dev/_ca-output.md`
- Qualified runtime: `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`
- Review date: 2026-11-19

## Owner direction resolving first-pass finding B1

The first-pass report identified a real, very narrow time-of-check/time-of-use race in the provider resumable PATCH/PUT: a different device might commit new content after the final pre-upload remote-revision observation but before this writer's server-side update. A final post-upload identity/hash/revision observation cannot prove that another intervening revision was not overwritten. The issue was initially provisionally classified as MAJOR/acceptance-blocking because the then-locked DEC-362 language demanded concurrent-writer protection.

**On 2026-11-19, during this independent review, the Owner expressly established a different acceptance/risk boundary:** BRAIN is single-user; the Owner judges concurrent updates to the same file by different devices extraordinarily unlikely and explicitly rejects spending engineering time on additional protection against that remote-write overlap. This is an **Owner-reserved risk acceptance and modification of the acceptance criterion**, not a claim that an atomic provider precondition exists or that the theoretical overlap cannot happen.

**Re-adjudication:** B1 is retained as **M-01: OWNER-ACCEPTED RESIDUAL RISK, NO ENGINEERING CORRECTION REQUIRED**. Atomic compare-and-swap, speculative locking, additional concurrency transport gates, and tests solely for this rare interleaving are **not prerequisites** to accepting this feature. This waiver is **limited strictly** to an intervening *different-device update after the final pre-dispatch revision check*. Existing checks for previously stale revisions, remote ID, managed root, provenance, parent/path ambiguity, intended content, successful verification, and durable recovery must remain intact. The Owner decision must be recorded and reconciled by the Builder in the relevant decision/planning records before any subsequent planner-activation governance claims; the independent Reviewer has not altered locked Owner decisions.

## Independent source assessment

**PASS:** `src/contracts/synchronization-foundation.ts` gives established-file updates a stable `remoteObjectId`, `expectedRevision`, proof of unique identity and intended content. `src/product/authoritative-production-executor-base.ts` builds in-place-update descriptors for both ordinary upload-update and clean three-way merge. `src/drive/google-drive-port.ts` uses resumable PATCH targeted to the existing ID, without a candidate replacement object or predecessor retirement; checks remote revision before dispatch; independently re-observes the same ID, content hash/size, advanced revision, managed-root provenance and unique remote path after dispatch. `src/product/remote-update-convergence.ts` rejects changed IDs, duplicates, wrong content and non-advanced revision. Durable-intent recovery resolves complete remote observation against the original persisted ID rather than adopting another same-name object. Genuine creates retain reserved-ID semantics. The existing single planner/executor/recovery lifecycle and shipping scope are retained.

**Scope limitation:** This acceptance does not assert the provider has atomic compare-and-swap, cannot lose an intervening revision within the expressly accepted race window, or has been exercised against live Google Drive or physical devices.

## Independently inspected original qualification

Original PHX-CI `result.md`, `result.json`, `terminal.log` and evidence publication were inspected after the blind report was frozen. Exact expected/verified HEAD and tree match `640845815dc85672c2411b1b7d3ae48f17a86bc2` / `133efbae0fc19162c168caf567ec663de04115fa`. All **13/13** stages passed, focused BVP **634/634**, product tests **1308/1308**, including typecheck, repository, build and artifact checks. Original run was Windows local PHX-CI, no GitHub Actions. No live Drive mutation or physical iOS/device execution occurred. Historical blocked attempts are not misrepresented as qualified.

## Ten-family test-adequacy disposition

1. **Nominal:** same established ID retained on update and clean merge; genuine reserved-ID creates retained — covered by source plus transport, orchestration, integration cases.
2. **Negative/boundary:** stale observed revision, wrong ID, unrelated same-name sibling, ambiguity, wrong content and unchanged/missing revision — covered.
3. **State transitions:** durable intent, dispatch authorization, effect verification, authoritative commit — covered by existing lifecycle and revised tests.
4. **Retry/recovery/idempotency:** same-ID recovery without redispatch or predecessor retirement, unknown outcome and create reserved-ID retries — covered.
5. **Concurrency/order/races:** ordinary stale revisions rechecked; *ultra-narrow inter-device post-final-check write overlap deliberately accepted as residual risk by Owner*, not required for this feature's acceptance.
6. **Persistence/restart/integrity:** recovery preserves same ID; incomplete evidence blocks; state/BASE mapping remains stable — covered.
7. **Identity/security/trust:** provider ID, managed-root and path/provenance boundaries remain binding, with no new OAuth scope — covered.
8. **Contracts/integration/compatibility:** prior create, rename/move, delete/trash and change-feed semantics remain in their existing pathways; no replacement-ID update protocol remains in ordinary path — covered.
9. **Architecture:** single canonical planner/executor/recovery chain, no invented logical-ID layer; original PHX-CI repository checks PASS — covered.
10. **End-to-end/fail-closed/destructive:** synthetic two-device sequential updates, same-ID recovery, duplicate-path rejection, no replacement/trash — covered; physical/live execution not authorized or represented as proven.

**Test-oracle caveat:** Virtual/provider fakes prove application dispatch and proof conditions, not all possible real Google upload interleavings. That precise race is accepted by explicit Owner decision rather than artificially claimed tested or impossible.

## Findings and disposition

- **M-01 — Owner-accepted, non-blocking:** remote update check-to-write window has no server-enforced atomic revision precondition; theoretical inter-device revision overwrite remains possible. *No code or test correction requested.* Preserve current stale-revision validation.
- **M-02 — Administrative, non-blocking:** locked DEC-362 and WS-03/WS-05 wording still imply stricter concurrent-writer guarantees than the Owner's subsequent explicit 2026-11-19 risk decision. **Builder must record/reconcile the Owner decision in authoritative governance documents** as ordinary approved administrative closeout, not invent an independent Reviewer change to locked records. No code requalification solely for documentation is necessary when the frozen implementation and evidence remain unchanged.
- **M-03 — Verification boundary, non-blocking:** PHX-CI qualified the code/software-only scenario; no live provider or physical-device proof is claimed. These activities remain separately Owner-gated.

**Final decision:** **PASS WITH MINOR FINDINGS — DEC-362 SOFTWARE CORRECTION ACCEPTED under Owner-defined single-user risk tolerance**. This satisfies the independent software acceptance review for the exact frozen SHA. **Does not itself approve/merge PR #157, activate DEC-339 inventory planner, install, deploy, release or authorize live/physical work**; all separate integration/governance gates remain applicable. No production code, authored tests, scripts, evidence or validation runs were modified/executed by Reviewer.

## Blind-first provenance disclosure

Neutral planning and state records carry embedded Builder run summaries; these may have been incidentally visible while establishing the neutral contract and handoff. The independent blind source assessment was published at commit `9f3f75266f94db0775ebd5b27b15cef070ed4dad` **before** any authored test source, PHX-CI result, detailed evidence or source comparison was inspected. Its historical provisional B1 conclusion was preserved unchanged. This final report separately records the subsequent Owner override and re-adjudication without retroactive rewriting.
