# Substantive verification evidence recovery — DEC-339 BU-01 F02

Protocol §§27.1 and 37.1; Builder record, 2026-11-24.

- Verified source: `550fe83abcf7077353d665ef9d4942c0b045d6cc`
- Verified tree: `532f22a0f3900c689f14d897ee03f112e498dcae`
- Source branch: `build/dec339-step6-metadata-bvp-20261124`
- Base: `62fb2632017c0744f16fe95467d39d35ae655b16`
- Runtime: `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework 0.2.0-dev.2
- Run: `22c57479-e60d-4b24-a3e1-234afd695a1b`; verifier correlation 5158d79b-3b37-4364-821a-53b8f4a281c5
- Original evidence commit: `34f6b9deed2acea0dd00dfdb897ce00368d8c0f1`
- Original structured output: [result.json](result.json), also preserved at the original evidence commit; canonical output dev/_ca-output.md at that commit. Owner transcript C:\temp\DEC339-BU01-924a54b6e5a64c0d968b136652c55716.log (owner-local, not independently retrieved).
- Original PHX-CI verdict **BLOCKED**, native exit 201; change-set PASS, repository tests PASS, SUT PASS, tooling PASS. Structured evidence classification REPOSITORY-GATE FAILURE. Do not rewrite the original result.

| Executed stage | Observed result |
|---|---|
| Preflight, node-preflight, node-project-files, install | PASS (0) |
| Typecheck | PASS (0) |
| Focused tests | 228/228 PASS; zero fail/skip/cancel/todo |
| Full tests | 1376/1376 PASS; zero fail/skip/cancel/todo |
| Build | PASS (0) |
| Repository check | FAIL (1), solely PowerShell script count |
| Artifacts | PASS (0) |

Development-observation artifact main.js, 1,079,114 bytes, SHA-256 `43b9d35713c8064cb3f8a9d21370dc651bda3cd0173ce6ca360a0ca958441f01`. Not a release-approved artifact. DEV_ROOT_STRUCTURE_RESULT=PASS; SHIPPING_ARTIFACT_IDENTITY_RESULT=PASS; ARCH_GUARD_RESULT=PASS; architecture metrics FAIL solely BVP_POWERSHELL_SCRIPT_COUNT measured 5, limit 4. Combined LOC 524/1500 PASS. This is an actual architecture budget violation, introduced by Builder's extra repository-controlled DEC339 launcher, not a falsely failing metrics guard. All original execution evidence remains immutable.

**Disposition:** substantive product checks executed in this run PASS. Overall software qualification and independent review remain blocked pending repository-gate closure and outstanding direct BVP integration. Remove only the extra Invoke-PHXCI-DEC339-Step6.ps1 introduced during this build; preserve its history, all other existing launchers, frozen guard and four-script limit. No production/test implementation change. A future repository-controlled invocation must reuse/consolidate an existing launcher within the approved budget (no fifth script, no reclassification or budget bypass). Post-repair gate execution not yet performed. Do not repeat already-conclusive substantive tests solely to remove this launcher. Verify the gate via PHX-CI at the smallest available scope or in the next genuinely necessary substantive BVP integration qualification. No independent validation or fabricated overall PASS.

## Measured simulated-provider observations

| Workload | Legacy incremental | Corrected inventory | Physical full |
|---|---:|---:|---:|
| Steady flat | 15 | 15 | 17 |
| Changed, inventory current | 17 | 15 | 17 |
| Automatic refresh and plan | 17 | 41 | 17 |
| Nested 24 additional files | 15 | 17 | 20 |
| Nested 128 additional files | 15 | 21 | 24 |

Initial setup 31/33/37 requests (flat/24/128), standalone flat refresh 27. Corrected flat steady 2 account, 2 cursor, 6 exact ID, 4 parent-list, 1 marked census, 0 physical tree, 0 Changes, 0 writes. Nested census pages 2/6 and one shared ancestor exact read per run. Prior 53 steady and 90 automatic refresh+plan reduced by 71.7% and 54.4% respectively. Legacy incremental still uses fewer requests in nested/refresh cases. Simulated wall timings (ms): flat steady legacy 4.669 / inventory 7.493 / full 6.311; changed 9.093 / 14.769 / 6.367; automatic refresh+plan 3.769 / 18.132 / 3.698; nested 24 11.256 / 11.409 / 8.968; nested 128 55.551 / 55.462 / 39.173. Not live latency or real device resource results. Inventory serialized logical bytes 4,395 flat steady; 7,292 separately refreshed; 7,740 automatic refresh; 20,871 nested24; 89,294 nested128. Heap/RSS samples and per-purpose counts in original focused TAP diagnostics. No provider writes in measured planning. Actual metadata path proven; no silent legacy fallback in successful optimized observations. Further measurement and direct BVP registration remain required by A6/A7; BU-01 not accepted. Census retained; no proof replacement, live operation, migration, activation, release or merge authorized.
