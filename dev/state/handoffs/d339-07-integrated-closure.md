# DEC-339 / D339-07 — integrated software-verification closure and carry-forward

**Disposition 2026-10-11:** D339-07A, D339-07B1, D339-07B2, and D339-07C each have independent accepted PHX-CI evidence. **D339-07 test implementation / software-verification work is CLOSED with explicit unproven rollout obligations**, NOT a production feature enablement, independently reviewed architecture, verified network speedup or device-resource acceptance. No source changes or further PHX-CI run required for bookkeeping.

## Authoritative chronological source/evidence chain

| Unit | Accepted tested source SHA | Published evidence commit | PHX-CI run ID | Results / scope |
| --- | --- | --- | --- | --- |
| D339-07A | `59ceba8b71bd5f59436793d192c07d9e4581d086` | `e14b25273321cd1d603ac7bc02996d97d8fc4ce9` | `bdc80034-567e-4411-bb5d-9494ca6868a1` | 11/11 stages PASS; deterministic legacy-safe parity, BVP baseline |
| D339-07B1 | `0741b798dad69acc448951c06c9ff4d5dcacbe8e` | `720e38df2ca0bc0337214200904a200fafeabca7` | `cef57c5f-20e7-4d03-baec-650c591bee3f` | 11/11 PASS; 51 focused/395 BVP/938 full; six new IDB fault cases, exact six-store commit-boundary abort proved through deterministic fake |
| D339-07B2 | `84a8d90b59f54330ba93092dcc3550b6015d8ef5` | `edb628410c7f1a541c2966f282dc3eec1421bc0b` | `91784b87-1d85-4434-9d4a-69f99176d7ed` | 11/11 PASS; 47 focused/395 BVP/953 full; 15 new provider, Changes, targeted and fallback cases |
| D339-07C | `c77f1b71c5c5e7c27c7a288312e3ab4ed6b9b279` | `97c136ec656f98601c6b51a1d35d391128f246e4` | `2f20a8c8-3644-47cf-ad7a-b6081b806bec` | 11/11 PASS; 34 focused/395 BVP/961 full; 3 matched workload cases + 5 fallbacks, real OFF/ON production assembler/plan parity |

Latest D339-07C shipping `main.js` remains **904453 bytes, SHA-256 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`**. D339-07C evidence commit includes only normal evidence files; control checkout preserved; no publication issues.

## Verified invariants, within the tests' actual boundaries

1. Legacy and optional inventory-mode planning observations are semantically equivalent on complete, coherent deterministic fixtures and defer to canonical full reconciliation when uncertain. 07C now compares *actual production planner plans* for three scales and five safety fallbacks. No real Drive mutation performed.
2. D339-07B1 tests atomic cursor/manifest/sync-state publication abort; false-positive staging-only fault was discovered proactively, corrected to the actual six-store transaction, separately PHX-CI verified and documented rather than hidden.
3. Provider/Changes path guards reject incomplete lists, invalid terminal/continuation states, unclassifiable account-wide events and uncertain descendant/provenance. Targeted post-effect proof retains fresh sibling and root-wide marked census requirements and fallback.
4. On three controlled successful workloads (1, 24 nested, 128 files), OFF makes **one logical** `listForReconciliation` call and ON **zero**; ON performs inventory lease, pointer, coverage and parent reads. On five fallback workloads OFF and ON both make one logical full listing. All compared inputs and plans match and zero mutations occur.
5. All standard typecheck/focused/full product/BVP/build/repository guard/architecture/check/artifact stages are green for the exact final 07C source.

## Material UNPROVEN findings transferred to D339-08

**No actual network performance acceptance:** the tests do not measure live `files.list`/`files.get` HTTP endpoint/purpose counts, attempt/retry statistics, summed HTTP latency, request-level provenance, full-run attribution, real device network/permission visibility or per-operation speedup. The S09A observation of 223 production events, 35 unscoped planning requests and 7.877 s combined physical reconcilation is **context only**, NOT a comparable optimizer-OFF baseline; do not rerun that completed physical canary for bookkeeping.

**No device resource acceptance:** Node pre/post heap/RSS are not true peaks; JSON-serialized row sizes are not IndexedDB persisted bytes; combined inventory + planning peak and Windows/iOS resource budgets and failure behavior are unmeasured.

**No complete real-platform recovery proof:** synthetic IndexedDB transaction, mock provider, root visibility, race and recovery tests do not exhaust real IndexedDB upgrade/blocked-version/GC behaviors, `drive.file` visibility asymmetry or full controller pending-intent lifecycle on actual devices.

**No independent review or rollout authorization:** D339-08 must own independent adversarial implementation review across architecture/authority/atomicity/Changes/targeted post-dispatch safety, disposition of all outstanding counterexamples, physical and device-resource acceptance planning, then an explicit release decision. If production defects are identified, create separately bounded corrective tasks and PHX-CI verify before promotion. PHX-CI is exclusive software verifier; no GitHub Actions or bespoke validation framework; no live Drive mutation, plugin install, feature activation, branch promotion or Stage 3 is authorized by D339-07 closure.

## Next handoff and responsibility

- **Assistant/supervisor:** pin exact accepted source/evidence as D339-08 predecessor, prepare a read-only independent architecture review assignment and remaining physical measurement/rollout decision plan with explicit human checkpoints; do not self-certify independent review.
- **Independent reviewer:** conduct adversarial source/evidence examination and report findings without implementing fixes on the review branch.
- **Human operator:** no immediate action. Subsequent local PHX-CI and explicit physical Windows/iOS validation steps require separately authorized, exact audited tasking; do not reinterpret existing results as device validation.
