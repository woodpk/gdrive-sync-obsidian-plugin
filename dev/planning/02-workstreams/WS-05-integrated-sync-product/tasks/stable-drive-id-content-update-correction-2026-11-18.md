# DEC-362 — Stable Drive-ID Content-Update Correction

**Date:** 2026-11-18  
**Status:** Owner-authorized **Builder corrective implementation committed; PHX-CI qualification pending**. Source and tests have changed only under DEC-362. No PHX-CI PASS, independent Reviewer acceptance, live Drive/vault action, installation, release or physical test is claimed or authorized by this status.  
**Owner:** WS-05 integrated product, with WS-03 owning the Google Drive mutation primitive.  
**Dependency role:** **HARD PREREQUISITE** to DEC-339/PR #157 inventory planner cutover or activation.

## 1. Defect

The current ordinary existing-file remote update path can perform:

```text
established Drive object A
  -> create replacement candidate B
  -> verify B
  -> retire/trash A
  -> adopt B as the new remote identity
```

That behavior is nonconforming for routine content revisions of an already-established logical file because product authority defines stable Google Drive file IDs as persistent remote identity and ordinary local edits as updates to the existing remote object where appropriate. The defect is especially visible when another device legitimately retains A as the established identity while a concurrent update/clean-merge plan observes B.

This is an **identity-architecture defect**, not a clean-merge-only patch target. Do not special-case clean merge to accept an arbitrary changed ID.

## 2. Governing authority

- Target Specification `REM-006`: stable Google Drive file/folder IDs are persistent remote identity where available.
- Target Specification §4.3: ordinary local edit uploads/updates the **existing remote object** where appropriate.
- `CHANGE-002`: stable identity plus revision/content evidence participates in change truth.
- `STATE-004`, `STATE-009`, `STATE-010`, `STATE-013`: retain remote identity, verify before durable success, classify uncertain operations and reconstruct conservatively.
- `XFER-001` and `XFER-004`: verify transfer result before commit; update semantics must be retry-safe/idempotent.
- `CONFLICT-001`, `CONFLICT-002`, `CONFLICT-011`: three-way clean merge becomes normal authoritative content and propagates normally.
- `MOVE-001`/`MOVE-002`: reinforce stable identity and avoidance of delete/recreate identity churn.
- DEC-339: persistent per-device metadata inventory is keyed around stable Google Drive identities.
- **DEC-362:** explicitly corrects the replacement-object update mechanic and blocks DEC-339 planner cutover until accepted.

The 2026-10-10 DEC-339 detailed architecture historically described `File content update / immutable candidate`; DEC-362 supersedes that implementation mechanic while preserving the rest of DEC-339's authority/trust model.

## 3. Required behavior

For an established managed file with `remoteObjectId = A`:

1. planner/executor retain A as the expected remote identity;
2. immediately before mutation, verify A is still the expected managed object and required prior revision/content/preconditions remain true;
3. dispatch an **in-place content update against A**;
4. independently observe the physical result;
5. require `remoteObjectId_after === A`;
6. verify intended resulting content/hash/revision evidence;
7. only then commit authoritative BASE/state with A retained and the new revision/content evidence;
8. on uncertainty, retain durable intent and recover against exact ID A; do not adopt a same-name/path object with another ID by inference.

For clean three-way merge, the merged content uses the same update contract. Clean merge is not permission to replace object identity.

For a genuine create, a new/pre-generated Drive ID remains valid and may be used to preserve retry identity.

## 4. Explicit non-goals

- No new logical BRAIN object-ID layer.
- No second planner, executor, recovery engine or synchronization protocol.
- No path/name-based identity adoption.
- No OAuth scope broadening.
- No weakening of managed-root provenance, sibling ambiguity, revision/content, convergence or recovery proofs.
- No redesign of DEC-339 storage/inventory schema except removing assumptions that an ordinary content revision intentionally rotates Drive ID.
- No GitHub Actions.
- No live Drive mutation or physical device work during documentation/planning.

## 5. Ownership and implementation boundary

### WS-03 — Google Drive boundary

Own the provider mutation and proof contract:

- update existing content using the established Drive ID;
- retain resumable/bounded transfer behavior;
- enforce exact identity/revision/content preconditions appropriate to the provider API;
- verify the same ID and resulting content/revision after update;
- classify ambiguous response, lost access, stale revision and concurrent writer without inventing success;
- preserve create/reserved-ID semantics for genuine creates only.

### WS-05 — authoritative execution/recovery integration

Own integration through the existing lifecycle:

- reviewed immutable plan;
- exact execution precondition revalidation;
- durable intent before physical mutation;
- same-ID provider update;
- independent convergence verification;
- authoritative effect/BASE/remoteMappings commit;
- restart/ambiguous-effect recovery against exact established identity;
- clean-merge propagation using the same identity-preserving update contract;
- cross-device convergence without manufactured identity succession.

WS-02 state contracts remain authoritative and should be changed only where an existing replacement-ID-specific representation is actually incompatible with DEC-362.

## 6. Current likely change surface — rebind before dispatch

The Builder must freshly inspect the exact then-current source before editing. Current analysis indicates the correction is concentrated around:

- `src/drive/google-drive-port.ts`;
- `src/contracts/synchronization-foundation.ts` and any mutation-proof contract that encodes candidate/predecessor replacement;
- `src/product/authoritative-production-executor-base.ts`;
- `src/product/durable-intent-recovery-base.ts` / `durable-intent-recovery.ts`;
- persistence validation that encodes `candidateRemoteObjectId` / `immutable-candidate-preservation`;
- affected focused/integration/BVP tests.

Do **not** treat this list as an executable writable-path allowlist. Bind exact SHA, actual dependency graph and writable paths immediately before implementation dispatch.

## 7. Mandatory verification families

The Builder must cover all ten families where materially applicable and record a concrete N/A only where genuinely inapplicable:

1. **Nominal:** same-ID existing-file update; same-ID clean merge; genuine create still creates.
2. **Negative/boundary:** missing/stale/wrong remote ID, revision mismatch, inaccessible object, same-name sibling, wrong root/provenance.
3. **State transitions:** planned → intent-persisted → dispatched → verified → committed; illegal commit without same-ID verification rejected.
4. **Retry/recovery/idempotency:** interruption before dispatch, ambiguous response, post-provider/pre-state crash, repeated recovery, no duplicate replacement object.
5. **Concurrency/order/races:** remote writer/revision change between planning/precondition/dispatch/postcheck; two-device sequence and concurrent clean merge.
6. **Persistence/restart/data integrity:** durable intent survives restart; canonical mapping remains established ID; no successor-ID adoption after restart.
7. **Identity/auth/security/trust:** account/root/domain/managed provenance and exact-ID authority remain binding; no path/name substitution.
8. **Contracts/integration/backward compatibility:** planner, BASE, Changes, conflict, move, trash/delete, create and DEC-339 fallback semantics remain compatible.
9. **Architecture/ownership/invariants:** one planner/executor/recovery lifecycle; no logical-ID side architecture; target requirements and DEC-362 enforced.
10. **End-to-end/fail-closed/destructive safety:** Windows↔simulated-mobile sequential update, concurrent clean merge, ambiguous effect and recovery all preserve identity or block honestly.

## 8. Acceptance gates

Before this correction can unblock DEC-339 planner cutover:

1. governing planning/authority documentation is committed;
2. implementation is test-first/requirements-derived under the current repository process;
3. exact changed source is qualified through the pinned Windows PHX-CI under DEC-338; **no GitHub Actions**;
4. complete source-bound evidence is preserved under the repository's current PHX-CI evidence rules;
5. independent blind-first Reviewer assesses source before evidence and then final qualification evidence;
6. material findings are corrected and requalified;
7. final accepted source proves ordinary existing-file update and clean merge retain the same Drive ID;
8. only then may the DEC-339/PR #157 integration sequence proceed toward inventory planner cutover.

Direct BVP operational scenarios, when used, follow DEC-350 and are not routed through PHX-CI merely as an operator front door. Windows-first simulation remains the default under DEC-347 unless later Owner authority permits physical testing.

## 9. Required cross-device regression outcomes

At minimum, acceptance must demonstrate:

- device A changes established file A → remote content/revision changes but Drive ID remains A;
- device B receives that change and retains mapping A;
- device B then changes the file → remote ID remains A and device A converges;
- concurrent non-overlapping text edits clean-merge to expected content and both devices retain A;
- stale/unknown replacement object at the same path does not become trusted merely because its name/path matches;
- ambiguous/uncertain provider outcome does not commit success until exact-ID reality is established.

## 10. Relationship to DEC-339 / PR #157

This corrective work comes **before** DEC-339 planner cutover/activation. Storage-only shadow and observation-only work may be reasoned about independently, but no inventory-backed production planner activation should be treated as eligible while the shipping mutation engine intentionally rotates identity for ordinary content revisions.

D339-06 remains a later optimization of eligible verification reads. It does not substitute for this correction and must not be used to paper over replacement-ID mutation semantics.
