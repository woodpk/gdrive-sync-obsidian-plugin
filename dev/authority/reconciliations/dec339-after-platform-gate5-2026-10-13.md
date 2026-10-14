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
