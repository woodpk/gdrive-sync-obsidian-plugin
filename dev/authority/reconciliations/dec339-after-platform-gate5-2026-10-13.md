# DEC-339 — Gate 5 Post-Platform Scoped Integration

**Date:** 2026-10-13  
**Status:** STAGING — NOT VERIFIED / NOT PROMOTION APPROVED  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Candidate branch:** `integration/dec339-after-platform-gate5-20261013`

## Frozen inputs and decision

- Owner-authorized baseline platform `master`: `429c4b947a2ec6b50f4c25c1f363665125286f6e`; PR #150 merged, F1/F2/R1 independently accepted. The last exact-source PHX-CI PASS for that platform is R1 `5078ad72a48df1c327b96fe781b1c7fbf0765509`, run `0dfc5f13-8da0-4f08-addc-caab4c913216`.
- Accepted DEC-339 feature original predecessor: `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b`; accepted implementation `dadd62e93ba1c97cfc89ddf9fe604e3d5dc9c902`, original D339-11 review APPROVE; earlier PHX-CI run `c14791cb-96b9-45b8-ab19-3f444900add6` 11/11 PASS, BVP 395, product 985. This evidence does not certify the combined source.
- The prior DEC-339 staging branch `integration/dec339-postreview-master-reconcile-20261012` diverges from current `master` and predates the platform F1/F2/R1 corrections; it must not be directly merged, force-updated, or treated as a qualified post-platform candidate.
- Original feature diff is 223 commits / 140 changed paths: 15 production, 24 test/platform, 101 `dev/**`, including 81 historical test-result paths. Only the 15+24 and relevant authoritative project knowledge/evidence are ported, with current master as content baseline.

## Conflict reconciliation and frozen control

- Eleven new inventory production modules and four modified owning product/state files come from verified `dadd62e93ba1c97cfc89ddf9fe604e3d5dc9c902` exact Git blobs where their `32b9ec...` predecessor is byte-identical to the promoted master version.
- Shared BVP comparison shows six path overlaps, resolved by preserving the promoted F1/F2/R1 behavior and selectively incorporating DEC-339 safety-parity registry and explicit-hash coverage. Keep F1 sentinels, F2 fail-closed package/artifact inspection, R1 late-failure receipt and regressions unchanged.
- Currently accepted historical shipping artifact digests: platform pre-R1 `e6bd40f9f780c3940de61669309b2c54732a1968d20739ecfefc1f0a710ec19e`, approved R1 `4106faaf25a4d7ba3611e32630571209fcc955f2a360702725f911257e6ade52`, previously owner-approved DEC-339 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`.
- The combined source may generate a new `main.js` digest. A new hash is **not accepted by ancestry or by observation**. The current governing protocol §5.1 preserves frozen pins until separate approval; PHX-CI must report actual artifact identity. Do not weaken the shipping policy or quietly add an unapproved digest.

## Next acceptance gates

1. Stage the integration **only on the isolated branch** from contemporary master, preserving the exact original DEC-339 source and evidence in Git ancestry and original Git blobs. Confirm no active shipping inventory cutover and no reset of F1/F2/R1.
2. Run the pinned PHX-CI on the **exact scoped combined source**; use focused `npm run test:bvp-root` and full repository verification, `BVP_CHANGE_CLASS=authorized-governance` only for the approved frozen-surface reconciliation, evidence publication `push`. If frozen exact-hash gate rejects the legitimately changed bundle, retain substantive evidence and exact artifact SHA and seek explicit owner authorization for a bounded hash-pinning correction; do not treat the unapproved candidate as accepted.
3. Requalify any correction affecting acceptance or tests through PHX-CI; preserve canonical evidence by exact blob reuse without unnecessary rerun. Request independent **combined integration** review of feature effect on accepted platform, artifact identity, dormant activation, security/safety and prior evidence continuity.
4. Only after exact-source PHX-CI PASS and independent integration acceptance, request a separate explicit **owner-controlled PR/master promotion** gate. No automatic merge.
5. G1 physical S09 / unresolved `data.json` integrity is independent and blocks live inventory cutover, installation/release, activation and Stage 3.

**No product activation, release, or real Drive/vault operations are part of gate 5.**

## 2026-10-14 — governing SHA-policy adoption, bounded development gate

- The owner directed adoption of the updated Agent-Led Software Engineering Operating Protocol, particularly §5.1 and its separation of development build identity from immutable approved promotion identity. **DEC-340** records this scoped change to the former history-hash assertion.
- Original integrated source `49415dd335c7a15da9644b6880482f5e44689191` produced **PHX-CI BLOCKED**, run `dd55aa0d-bc3e-483c-8c76-95be5b8d03b7`; change-set focused tests **399/400**, with only S08B #286 failing because newly built `main.js` did not match three historical hashes. Typecheck and **985/985 product tests** passed. Build/repository/artifact stages were not executed; do not claim otherwise. PHX-CI evidence commit: `9a011de9b028f99f2b6bce48a5f304aed87a1c4e`.
- **Observed, not approved:** new `main.js` SHA-256 `57c33f8920fe6b46635e9ad01598f1ea06cd2477789ec4ec046e2be66997818c` during the original focused test.
- The new development verification contract requires an explicit `BRAIN_ARTIFACT_PURPOSE=development` plus the PHX-CI-provided verification context and `BVP_CHANGE_CLASS=authorized-governance`. In this case the consumer repository check still validates package identity, required/readable build artifact, code governance and separation and reports the actual observed SHA. Without that combined gate, or when `BRAIN_ARTIFACT_PURPOSE=promotion`, the original strict accepted-hash policy remains unchanged.
- The S08B product isolation test no longer falsely requires the *new development build* to match an earlier release SHA, but continues to check actual production output and exclusion of BVP sentinels; PHX-CI artifact verification and independent integration review remain required.
- Tests include negative development cases for missing `main.js` and invalid package identity, rejection of unauthenticated development mode, and promotion exact-hash enforcement.
- **Status: new corrected source NOT YET PHX-CI VERIFIED.** A PHX-CI run of this changed development gate is required for the new software/tests (not to regenerate old evidence). The previous blocked source must not be rerun. No production activation or release is authorized.


## 2026-10-14 — gate 2 closed by exact-source PHX-CI

- Corrected integrated source `5861b8b2861f9c38ea659be7c7cfcf78527da4d7`, verified tree `f062ce0606c042e3a9284f1a66582b0070bb453f`, pinned PHX-CI runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`. Run `ad77ffcc-cf2b-4f99-8d08-97170bb0be2f`, **11/11 PASS**, **402/402 focused**, **985/985 product**; check/build/repository/artifact PASS, framework core **4,000/4,000** PASS.
- Actual generated `main.js` 904507 bytes, SHA-256 `57c33f8920fe6b46635e9ad01598f1ea06cd2477789ec4ec046e2be66997818c`. `BRAIN_ARTIFACT_PURPOSE=development` and `BVP_CHANGE_CLASS=authorized-governance`; PHX-CI observed and recorded the hash. This artifact has **not** been independently release-approved or pinned for promotion. Default/promotion check retains the previously approved hash allowlist.
- PHX-CI original evidence commit `8491318b4e8d6901d810fa753be6dec16b8c8afb` is directly descended from the tested source; original published JSON `356b21ccafc8703006953159560457d7148996b4`, Markdown `839bd7ba627900ef301160bfbfb9dc048f2f498f`, terminal `4be838bb41be02348a6f61a0f5d51ee1c3e6c07b`. Identical blobs are available under `dev/test-results/ad77ffcc-cf2b-4f99-8d08-97170bb0be2f/`; preservation did not rerun SUT tests.
- **Gate 2 complete. Gate 3 pending:** independent **combined integration**, including DEC-340 development/release controls, at `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-post-platform-integration-independent-reassessment.md`. Owner-controlled Gate 4 is **not authorized**, and G1 physical acceptance/activation/release remain BLOCKED.
