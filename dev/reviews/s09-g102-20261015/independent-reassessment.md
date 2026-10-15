# Independent adversarial reassessment — G1-02 finding (2026-10-15)

**Record origin:** Separate independent reviewer report supplied by the owner in ChatGPT. Recorded by the engineering supervisor; this file is NOT a new independent review or an owner promotion authorization.

**Review verdict:** **REJECT** — G1-01 + DEC-343 software-only integration eligibility under DEC-344, source `a9fb045a5ad4fae8c17b260692feadc468c9643d`.

## G1-02 — MAJOR / BLOCKING

Evidence: `src/product/plugin-data.ts:85–101` (immutable source a9fb045), `src/product/runtime.ts:90–104`, `src/product/sync-plan-errors-path.ts:84–100`.

For an existing persisted settings object with `firstSyncCompleted: true`, the G1-01 guard used string truthiness rather than trimmed nonemptiness for `vaultIdentity` and `remoteRootId`. Whitespace-only strings passed, allowing runtime startup operational-exclusion reconciliation to write `data.json` despite inconsistent completed-sync identity. This violates fail-closed-before-persistence and target-system `STATE-011`.

The reviewer independently established the control-flow issue by static inspection; the counterexample was not independently executed.

**Minimum correction:** Require trimmed nonempty `vaultIdentity` and `remoteRootId` for completed sync, with persistence-blocking regressions including plugin/runtime startup. Preserve valid unpaired states and optional-field migration.

## Other findings and limits

- Original G1-01 incomplete-data conditions inspected as correctly addressed, but the new G1-02 remains an approval blocker.
- DEC-343 inspected scope: PASS; development artifact observation does not authorize production digest/release.
- DEC-340-01: **CONFIRMED / UNFIXED / OWNER RISK ACCEPTED / NON-BLOCKING** by locked DEC-344. It is not the reason for this rejection.
- Genuine historical PHX-CI run `e7c51b4d-e649-4658-8e1b-c117a2901ec3` (11/11 PASS; 403/403 focused BVP, 992/992 product) qualifies source `a9fb045a5ad4fae8c17b260692feadc468c9643d` exclusively. Original evidence commit `c4969b2826b0fbb4aa82f2155715856dec94fb67`. Canonical evidence blobs match original publication.
- Development `main.js`: 906196 bytes, SHA-256 `4d48cff003d8b274b39304e2e3bc4c501921087fcf5ddbf5099b9979e8a5acc1`; unapproved for production.
- Original physical `data.json` loss/corruption root cause remains unproven. No physical S09 acceptance.

## Supervisor corrective response (not yet verified)

The engineering supervisor inspected the immutable source and committed a bounded G1-02 code-and-test fix at `895e8210b8d3d6b508d71c3965d2da61a5f29850`. Its correctness is **NOT PHX-CI VERIFIED** and **NOT INDEPENDENTLY APPROVED**.

Next: qualify the latest exact candidate via the pinned PHX-CI runtime; after PASS, obtain independent read-only reassessment and separately request owner software-only promotion authorization if eligible.

No merge, release, artifact approval, installation, activation, live Drive/vault mutation, physical S09, or Stage 3 is authorized.
