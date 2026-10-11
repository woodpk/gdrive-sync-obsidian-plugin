# DEC-339 / D339-07A — BVP suite baseline alignment (bounded corrective unit)

## 0. Identity and reason

- **Repository:** `woodpk/gdrive-sync-obsidian-plugin`.
- **Classification:** **CORRECTIVE IMPLEMENTATION**, separate from D339-07A's existing two-file, new-test-only allowlist. No retrospective expansion of that assignment.
- **Source base:** `240b9d591ffa19933ff08196860feefde485a2ad`, published PHX-CI evidence for D339-07A run `c5d3a5d2-cc18-49da-ae5d-11b46d5b662b`.
- **Exact corrective branch:** `dec339/d339-07a-bvp-suite-alignment-01` (precreated at the base). First bounded correction `252363630bfa53c2eff91c7156fb522ce865668d` is already committed on this branch.
- **PHX-CI outcome motivating this work:** `BLOCKED`, exit 201; 390/395 BVP tests PASS in focused `npm run test:bvp-root`, 5 BVP failures. Independent `test`, typecheck, prerequisites PASS; build/repository-check/check/artifacts not executed.
- **Originating D339-07A task:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/D339-07A-inventory-safety-equivalence.md` pinned at `4273eca8ae9b773ed77e386c6e219b2de646e062`. Its original writable allowlist remains unchanged.
- **Purpose:** repair demonstrated stale BVP *test/registry expectations* so required existing deterministic tests run without weakening the frozen BVP architecture, semantic safety checks, or the exact-hash shipping safeguard.

## 1. Evidence-grounded failures and strictly limited correction

| PHX-CI failure | Observed issue | Owning corrective file |
| --- | --- | --- |
| `architecture metrics pass the actual BRAIN repository baseline` | `bvpPowerShellScriptCount` observed 3, test expected 2; three actual BVP/PHX-CI execution scripts under `dev/scripts/` within the locked maximum of 4. | `test-platform/test/architecture-metrics.test.ts` |
| `live battery registry exposes the complete physical battery set` / `every compiled live scenario module is represented by one registered battery` | Existing registered/compiled `s09a-request-attribution` missing from hardcoded test expectation. | `test-platform/test/battery-registry.test.ts` |
| `all-platform-tests includes every compiled BVP test module exactly once` | Registry missing new `dec339-legacy-safety-parity.test.js` and existing compiled `s09a-attribution-live-guard.test.js`. | `test-platform/test/batteries/deterministic-battery-registry.ts` |
| `S08B validation artifact is separate, production-faithful, traceable, and disposable` | Test accepts only original `main.js` SHA-256 `e6bd40f9f780c3940de61669309b2c54732a1968d20739ecfefc1f0a710ec19e`, but source has the software-owner-approved DEC-339 build SHA-256 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`. | `test-platform/test/s08b-validation-build-entrypoint.test.ts` |

**Bounded result:** preserve positive identity checks, compiled module uniqueness, all required batteries, and full artifact integrity verification; update the immutable accepted digest set to exactly the two owner-approved hashes, **not** a permissive or auto-learned hash check. Do not modify implementation, feature flag, or runtime.

## 2. Exact writable allowlist

**MODIFY only** these four existing tracked files:
1. `test-platform/test/architecture-metrics.test.ts`
2. `test-platform/test/battery-registry.test.ts`
3. `test-platform/test/batteries/deterministic-battery-registry.ts`
4. `test-platform/test/s08b-validation-build-entrypoint.test.ts`

PHX-CI owns its routine `dev/_ca-output.*` and `dev/test-results/**` evidence. No product `src/**`, frozen `test-platform/src/**`, `test-platform/scenarios/**`, `dev/scripts/**`, `dev/authority/**`, PHX-CI runtime/manifest/Taskfiles, production artifact source, or independent validation script may change. Exclude all unrelated improvements. A new blocking product/architecture finding is a separate corrective task.

## 3. Protocol gates

Immediately before editing **each** test/verification-code file, freshly retrieve and read the complete **original** connected Google Drive `agent-led-software-engineering-operating-protocol` per repository `AGENTS.md`. Ground all expected battery names and registered files in the actual authoritative sources; preserve the original registered battery definitions and assertions, correcting stale test expectations only. The three BVP script paths must be inspected; do not raise the locked cap or change architecture checks. Owner-approved shipping SHA has prior PHX-CI evidence at `9881c13b542586ff6797f15a7903c22bebb83d4d`.

All executable validation remains within **PHX-CI exclusively**. Do not execute tests/builds/verification scripts directly. This corrective source differs substantively from the failed run, so one new PHX-CI run is allowed under protocol §37.1, covering `npm run test:bvp-root` and the D339-07A production test, with full PHX-CI required stages, an exact SHA/pinned runtime, and publication of all evidence. No unneeded future reruns.

## 4. Closure

Close this corrective unit only when the exact source SHA passes every relevant focused/full PHX-CI stage including shipping artifact checks, and evidence is published. Preserve the prior 390/395 and independent product PASS history. Then return to D339-07A acceptance evaluation; D339-07B/C/08 remain pending and feature stays off. No Obsidian install, live Google Drive/vault effects, Stage 3 or rollout authorization.
