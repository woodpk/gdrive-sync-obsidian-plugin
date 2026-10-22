# PHX-CI Section 27.1 — substantive evidence recovery
## Immutable source and original run

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Source branch: `fix/s09-bvp-live-controller-20261022`
- Exact verified **source**: `fface1c3233312eb2356c9cebca7c2957e55918f`
- Source tree: `3fe7369e10d5962f0288ce13630c1fd0912df1c9`
- PHX-CI framework: `0.2.0-dev.2`, runtime SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`
- Original run ID: `e231a5b5-7a14-42e2-b8ae-766f062fac0c`
- Original overall classification: **BLOCKED**, process exit 201 (**unchanged**)
- Original immutable evidence publication commit: `d78c4698895bbc762cabebd74edf8c448af4c242`
- Original published records: `dev/test-results/20261022T211252Z-operator-fix-s09-bvp-live-controller-20261022-fface1c32333.{json,md,log}`; also `dev/_ca-output.{json,md}` at that evidence commit.
- Execution window: `2026-10-22T21:12:54.9321074Z` to `2026-10-22T21:15:06.5555883Z`

## Substantive observations established by original PHX-CI (no new execution)

| Stage | Original observation |
| --- | --- |
| Preflight, Node preflight, project files, npm installation, typecheck | PASS |
| PHX-CI focused `npm run test:bvp-root` | **PASS: 464/464**, zero failures/skips; includes Windows PowerShell AST-parser regression |
| PHX-CI full repository `npm test` | **PASS: 1,292/1,292**, zero failures/skips |
| PHX-CI `npm run build` and build verification | **PASS**: entrypoint, syntax, bundled dependency, mobile evaluation, package shape |
| Built `main.js` | 922,631 bytes; SHA-256 `6bb0012cb21a244a2f53a44b7bdcf3203b6284070bb3b725d7b32d919c2b881d` |
| Canonical dev structure / BVP architecture guard / BVP metrics | PASS |
| PHX-CI artifacts stage | PASS, exact built artifact hash recorded |
| Shipping-artifact identity gate | **FAIL**: `shippingArtifactExit=1` |
| PHX-CI aggregate repository-check | **FAIL**, exit 1, classified `REPOSITORY-GATE FAILURE` |
| PHX-CI overall / downstream `check` | Original overall BLOCKED; downstream `check` MISSING — not represented as PASS |
| Physical Windows smoke | **NOT EXECUTED**; no new physical effects or six-step outcome demonstrated by this run |

**Substantive software checks that actually executed: PASS.** This recovery note does not change the historical PHX-CI overall BLOCKED classification, invent completion of unexecuted gates, approve a shipping hash, or qualify real-device behavior.

## Demonstrated administrative root cause and owner-impact prevention

The assistant's owner-facing one-time launcher called the PHX-CI front door directly with no `BRAIN_ARTIFACT_PURPOSE` setting. It **did not** call the repository-controlled `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` operator, which explicitly sets `$env:BRAIN_ARTIFACT_PURPOSE = 'development'` (and `BVP_CHANGE_CLASS = 'ordinary'`) for software qualification. The repository-check source defaults to `promotion` when the development-purpose variable is absent; its allowed production SHA-256 set intentionally excludes the development artifact built in this run. The canonical repository-check output directly confirms `SHIPPING_ARTIFACT_MODE=approved-artifact-enforcement` and `SHIPPING_ARTIFACT_IDENTITY_VIOLATION path=main.js`.

This is a **launcher configuration/verification-tooling error introduced by the assistant**, not evidence of a failed product test, invalid source, or authorization for a new release hash. A materially identical failure mode had already been recorded in `dev/state/current-state.yaml` (`second_phx_blocker` and `governing_development_mode`), making this a preventable recurrence.

**Required prevention:** owner launchers must invoke the audited repository-controlled PHX-CI operator or otherwise explicitly and correctly establish the PHX-CI-backed development context; do not bypass its environment contract. Inspect artifact-purpose propagation and relevant repository gate mode before asking the owner for a first run. Prohibit repeating the completed 464 focused tests, 1,292 full tests, and build solely to create a preferred administrative PASS. If a tooling-only gate requires repair/verification, limit it to the smallest permitted PHX-CI-controlled surface as mandated by Protocol §§21.1, 27.1 and 37.1.

## Remaining scope boundaries

- Shipping artifact identity approval: **NOT GRANTED**; historical production SHA allowlist is unchanged.
- This recovery document: retrospective factual annotation only, not new authoritative PHX-CI verdict.
- Second previous physical timeout: device receipt/lease reconciliation still requires verified local physical-controller evidence.
- Full six-step Windows smoke, independent final review, installation, release, master promotion, iOS, and Stage 3: **not authorized or established by this run**.
- No physical rerun is justified by this software-only administrative failure. Do not delete or rewrite any original evidence/relay records or change product code as a shortcut.

## Recurrence accounting

- Run: `e231a5b5-7a14-42e2-b8ae-766f062fac0c`
- Causal layer: **assistant-generated owner launcher omitted the development verification context**.
- Substantive SUT verification: **completed software stages PASS**, physical SUT NOT EXECUTED.
- Final PHX-CI classification: **BLOCKED**, unchanged.
- Preventive owner: Builder; use repository operator and explicit PHX-CI development-mode contract; recover existing evidence rather than costly redundant tests.
