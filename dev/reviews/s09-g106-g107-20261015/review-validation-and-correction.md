# S09 G1-06 / G1-07 — audit validation and corrective implementation (2026-10-15)

## Immutable reviewed baseline

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Independent **REJECT** candidate: `9beb958afd20acb0c6d5fdf9e44010ff8a88b490`; PHX-CI evidence run `a0a8d8f7-f464-4063-825c-5517ea20b328` original publication `6533cf3098eb9931d7595319f41121bac73bc537` **PASS at that older SHA only**.
- Owner-requested corrective branch: `fix/s09-g104-g105-pairing-namespace-atomic-persistence-20261015`, following documentation handoff `acad0898cb95cdebae04a6d1f4c8ba46b9092151`.
- Existing failed run `dcac84f4-8b9e-43d5-ae02-4233f52f36eb` stays **BLOCKED**, unchanged.
- Explicit DEC-344 risk acceptance for DEC-340-01 is **not** extended to either newly reviewed finding.

## Reassessment of user-provided independent findings

### G1-06 — incomplete legacy remote pairing can inherit stale BASE — CONFIRMED, MAJOR BLOCKING

At prior SHA, `settings-tab.ts` persisted direct `remoteRootId` edits when `firstSyncCompleted=false`; `plugin-data.ts` skipped the write-time pairing guard when both old and new first-sync flag were false; legacy state database keys did not contain the remote root. `runtime.ts` reopened IndexedDB under old vault/device key after restart; `persistent-state-store.ts` did not bind its state to a remote-root ID. With a valid empty second remote, `planner.ts` could select `trash-local` using wrong R1 BASE. This is **a supported static counterexample**, not a reproduced physical deletion. Moreover a legacy empty-root installation may still retain a historical state database, so blank-to-nonblank pairing must also rotate storage namespace.

**Correction:** existing nonempty root is treated as an established pairing regardless of firstSyncCompleted. All root/vault/device/namespace rebinding requires durable deauthorization with cleared root, a fresh epoch and automatic sync off. Neither Create nor Pair is allowed while a root remains. The settings tab stages a proposed remote-root ID locally; `pairManagedRemote` validates it with Drive before durable binding, then commits a fresh namespace with that root in one settings write. First pairing from a blank legacy root also requires a new epoch; R1 legacy keys remain available only for original unchanged pairing. Runtime create/pair methods recheck identity after asynchronous calls. No direct UI root mutation persists without validation.

**Regression coverage:** `test/plugin-data-integrity-regression.test.ts` blocks incomplete R1 identity mutations, tests correct deauth-to-new-epoch transitions and blank-legacy state rotation. `test/s09-g106-legacy-pairing-planner-integration.test.ts` uses the actual keyed persistent-state store and deterministic planner with a seeded trusted R1 BASE to show unsafe `trash-local` if keys were reused, then verifies isolated R2 state returns `uninitialized` and safe-union `upload-create` when R2 is empty. The test is simulated storage/planner integration, **not** live Google validation or physical reproduction.

### G1-07 — concurrent UI settings updates lose fields — CONFIRMED, MODERATE

At prior SHA, `main.ts` captured a complete `next` settings object before awaiting the serialized host writer. Two UI `onChange` handlers could both base their replacements on the same stale settings, causing lost updates even if every `saveData` was serialized.

**Correction:** UI update handlers now queue the full read/patch/persist/runtime-side-effect operation rather than merely physical writes. `PluginDataRepository.patchSettings` merges a captured patch **inside** its serialized persistence callback against the latest committed data.json document. It returns only the newly committed settings after successful persistence; failure does not publish speculative settings. Existing deauthorization and uncertain-write handling remain separate and fail closed.

**Regression coverage:** three concurrent competing settings patches and an independent restart verify all modified fields persist. The prior settings/audit/diagnostics concurrency regression remains intact. The new test exercises repository patch isolation; the UI queue is reviewed statically. There is no claim of proving hardware/Obsidian save atomicity.

## Verification and stop gates

- **Corrective code/test source is STAGED, NOT PHX-CI VERIFIED.** The prior `9beb958...` PASS does not qualify changed files or tests.
- Required next step: pin exact final corrected source SHA; run genuine pinned PHX-CI runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, baseline `b1e2ebaee3077e34a4eefaf601ee8124078b7400`, focused `npm run test:bvp-root`, `BRAIN_ARTIFACT_PURPOSE=development`, `BVP_CHANGE_CLASS=authorized-governance`, publication `push`.
- If PASS, obtain a **new, separate, independent, STRICTLY READ-ONLY** adversarial review of this corrected exact source including G1-06/G1-07 and inherited G1-01–G1-05. Do not self-review as independent.
- No merge or owner merge authorization yet; no production artifact approval, release, installation, activation, live Drive/vault, S09 physical acceptance, historic `data.json` root-cause claim or Stage 3.

**Exact tasking:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md` S09 G1; the published prior independent review assignment `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-g104-g105-post-phxci-independent-reassessment.md`.
