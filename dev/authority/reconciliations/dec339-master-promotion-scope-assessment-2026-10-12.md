# DEC-339 — exact master-promotion scope and prerequisite assessment

**Grounded:** 2026-10-12. **Classification:** technical authority reconciliation and promotion proposal, **not** a new product decision or deployment approval.

## Immutable references

| Point | Commit |
| --- | --- |
| Existing `master` (unchanged) | `caf4a03418b89b57893e3bd5d4c6f89c28604242` |
| Master/candidate merge base | `7b4297adceb2fd6268a5801a207b7dce1f7b7728` |
| Pre-DEC-339 platform / last S09A evidence | `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b` |
| Accepted DEC-339 implementation | `dadd62e93ba1c97cfc89ddf9fe604e3d5dc9c902` |
| DEC-339 source-verification evidence | `6c4e4511ccf6ae8c48d80656e3a1f02ee4669b72` |
| PHX-CI-verified integration source | `f1d4ce30ad89ddc5ab076ba24ba634b493241bc8` |
| Integration PHX-CI evidence | `7864af7d9e0f522215fee2a4c746c82ffb96f142`, run `6dd104c5-5640-42bb-989f-0f7ca74653d8` |

## Complete history-boundary decomposition

GitHub ancestry comparison at exact commits:

1. `master ... pre-DEC-339`: **1,612 commits ahead, 26 behind**. Tree comparison: **1,171 newly present**, **450 absent**, **33 differing shared files** = **1,654 net changed paths** against `master`. This is **not** DEC-339 feature work and is not covered by the D339-11 independent approval.
2. `pre-DEC-339 ... accepted DEC-339 source`: **223 commits ahead, zero behind**, **140 net changed paths** (114 added, 26 modified, zero removed): **15 `src/**`**, **24 `test/**` + `test-platform/**`**, **101 `dev/**`**. The `dev/**` scope includes **81 retained historical `dev/test-results/**` evidence files** and one already-existing S09A attribution research report; not every history entry is a unique DEC-339 production change.
3. `accepted source ... original DEC-339 evidence`: **one evidence-only commit**, preserves verified source SHA and run identity.
4. The isolated integration adds master ancestry as a **second parent**, with the accepted feature tree intact, documentation reconciliation and PHX-CI evidence. It is **not** evidence that all 1,612 prerequisite platform commits were independently reviewed or authorized for promotion.

GitHub's direct 1,836-commit comparison only returns its first 300 changed files; the counts above are grounded in the **untruncated recursive Git trees** plus separate ancestry comparisons. The 26 master-exclusive commits are owner-locked governance/task supersession under `AGENTS.md` and legacy `dev/agents/**`; their reachability is preserved by the isolated integration. Deprecated active task hierarchy must not be restored.

## Exact DEC-339 feature boundary

`src/**`: **11 additive files and four modified files**, all within inventory contracts, remote read/metadata, snapshot/proof planning, executor optional proof forwarding, IndexedDB persistence and validation. The 24 test/platform files cover deterministic inventory, fail-closed equivalence, benchmark, resource, BVP-registry and shipping-artifact guard coverage. The remaining 101 files are governance/planning/review/state/evidence records; do not duplicate or rewrite original evidence.

These key files are **byte-identical** between the pre-DEC-339 source and the final verified feature source:

- `src/product/runtime.ts` — still constructs the original `ProductSnapshotAssembler`, not the inventory assembler;
- `src/drive/google-drive-port.ts` and `src/contracts/google-drive.ts` — no frozen Drive adapter-contract change;
- `phx-ci.json` and `Taskfile.phx-ci.yml` — no PHX-CI runtime pin/config change;
- `AGENTS.md` — no weakening of the owner-locked governance gate.

The shipping-artifact allowlist was changed only for the two explicitly approved immutable digests. Feature cutover remains separately gated.

## Why direct DEC-339-to-master cherry-picking is not a verified strategy

Current `master` does not contain the pre-DEC-339 architecture. Compared with `master`, the needed prerequisite platform adds **147 `test-platform/**` files**, removes **21 old `src/validation/**` runtime files**, changes **16 other production files**, and changes PHX-CI configuration, dependencies, product tests and the development hierarchy. All such work predates DEC-339 and is not certified by the feature re-review.

Importing only DEC-339's changed files directly into that older platform risks bypassing required integration contracts, BVP architecture/verification, safety and artifact checks. Importing the complete integrated tree would instead promote **1,612 unrelated prerequisite commits** without a separate acceptance boundary. Neither operation is authorized simply by the green feature PHX-CI run.

## Proposed safe promotion sequence — requires owner scope decision

**Option A — preferred: two independent promotion contracts.**

1. **Platform baseline promotion**: treat pre-DEC-339 `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b` as a separate modernization candidate against current `master`, conduct exact file/authority review of the 1,612-commit history and verify an isolated, merge-compatible candidate under PHX-CI. Preserve the 26 master governance commits semantically, and require independent review for the modernization scope. **Do not** represent this as part of DEC-339 or quietly bundle it into a DEC-339 PR.
2. **DEC-339 feature promotion**: only after baseline acceptance, promote a scoped feature delta from `32b9ec2f2c3ed53d7cf345185b044ee002b9f26b` to `dadd62e93ba1c97cfc89ddf9fe604e3d5dc9c902`, carrying only the 15 production and 24 test/platform file changes, applicable DEC-339 decision/planning/review records, and immutable PHX-CI evidence (including final run `c14791cb-96b9-45b8-ab19-3f444900add6`). Respect the exact two-digest shipping artifact allowlist and frozen governance. Verify exact promoted source under PHX-CI and review integration effects independently.
3. Keep optional inventory inactive; preserve original reconciliation; require separate rollout, Windows/iOS/resource, migration and owner production authorization. Do not erase S09A or `data.json` unresolved gates.

**Option B — legacy-master targeted port**: keep the existing master platform as the target and **redesign/reimplement** the approved inventory feature against its older contracts, replacing the current verification platform dependency with an independently supported PHX-CI integration. This is a **new, materially different engineering scope** requiring its own architecture acceptance, contract/equivalence proof, PHX-CI tests, and independent review. The current DEC-339 tested SHA could no longer certify the ported implementation.

**Recommendation:** Option A. It preserves the exact accepted DEC-339 source and avoids disguising unrelated platform history as a feature change. Option A still requires an explicit owner decision to promote/accept the separately scoped prerequisite platform work; it does not grant an automatic 1,612-commit merge.

## Status and stop line

**Master untouched.** Source `f1d4ce30ad89ddc5ab076ba24ba634b493241bc8` passed PHX-CI 11/11 stages; post-verification state and evidence-layout corrections are documentary/administrative only, not a new SUT result. The integration branch remains staged. No master PR/merge, destructive remote Drive/vault operation, inventory activation, plugin install, release, or Stage 3 is authorized.

**Owner decision requested:** explicitly select **A** (separately assess and promote the prerequisite platform, then the DEC-339 feature) or **B** (commission a contract-aligned port onto the existing legacy master). No promotion work begins before this decision.
