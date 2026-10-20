# Request to Independent PHX-CI Test Writer — S09 G1 Settings Lifecycle

**Work classification:** Independent code inspection, verification design, testing artifacts and PHX-CI qualification — **NOT implementation-agent-authored tests**.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`.

**Target:** Latest production-code commit `1dacb1e5213dac74135f98bce43e4fe3b449e8bc` on branch `fix/s09-g104-g105-pairing-namespace-atomic-persistence-20261015`. Later commits through the current administrative HEAD are documentation only; independently confirm that ancestry and bind exact candidate source SHA/tree at intake. Do not assume a previously reported PASS verifies subsequent source changes.

**Read first:** committed governance and verification requirements; WS-07 / S09 G1 decomposition; independent REJECT of implementation `436afeee8897fc34764bbdddcdad0eea0be3365d` (F-01 delayed pairing/deauthorization, F-02 stale exclusions during relocation); `dev/reviews/s09-g107-runtime-settings-race-20261016/invariant-driven-correction-round.md`; and relevant current production source, history, existing tests and original PHX-CI evidence `76651dbe3d91c1ffb2fb083b68ff742dff7e02e4`.

**Task:** Independently inspect the **entire affected settings and authority lifecycle**, not just the two named failures. In particular examine UI settings intent and queueing, durable settings transactions, managed exclusion policy, CSV relocation/recovery, pairing and deauthorization, asynchronous Drive/OAuth operations, runtime initialization/disposal, synchronization recovery, and delayed reconciliation callbacks. Treat the implementing agent's self-review as untrusted input.

**Deliverables, in order:**

1. **Source inspection / recommendations.** Identify correctness, security, authorization-lifetime, data integrity, stale-state and governance defects; report exact path/line, severity, concrete counterexample and recommended bounded fix. If material production defects exist, stop acceptance and return findings to coder; do not silently repair production.
2. **Writer-owned verification suite.** Independently design and create the relevant unit, integration, deterministic concurrency/interleaving, fault/restart, and adversarial test batteries with required fixtures, documentation, and canonical test artifacts. Verify both materially conflicting execution orders and state continuity across interrupted operations. Determine the test depth and seam selection yourself, using actual UI/runtime behavior when necessary. Preserve existing coverage and avoid duplicate or superficial tests.
3. **Canonical qualification.** After code recommendations have been resolved and the complete suite is ready, verify the exact revised source through the approved locally executed PHX-CI workflow (pinned runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, accepted baseline `b1e2ebaee3077e34a4eefaf601ee8124078b7400`) and publish complete evidence to GitHub according to governance. Never equate test PASS with architectural acceptance.

**Safety and workflow:** Do not modify source files without a separate implementation assignment. No GitHub Actions, no live Drive/vault, no product activation, no owner merge/release, no physical S09 or Stage 3. Keep all artifacts canonical and auditable. In any blocked/failed run, provide exact source, stage, cause, evidence and next correction; do not claim PASS.

**Return:** Source-review verdict, findings/fix requests, test coverage summary and artifacts, PHX-CI exact-source/evidence identities and disposition. Only when the complete scope is qualified should the owner consider a **single independent feature-relevant review gate**, without premature serial reviewer requests.
