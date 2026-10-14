# S09A — Supplemental late-completion and local lease-release evidence

**Evidence class:** operator-observed supplemental evidence; not a replacement BVP result.
**Original BVP outcome:** **BLOCKED**, classification `device-result-unavailable` (60-second device-result timeout; exit 1).
**Production outcome observed later:** **COMPLETE**, with all required effects committed and verified.
**S09A battery completion status:** **NOT ESTABLISHED**; the runner did not execute the post-sync observation/assertion steps.

## Identity / provenance

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Branch: `bvp-s09a-folder-parent-recovery-01`
- Run ID: `bvp-s09a-windows-initial-sync-20261009T113754861Z-eadfbfe3`
- Validation artifact source: `d0836e4b682f851351c69f015f2694bdd72d4441`
- Original battery evidence commit: `89117c3d198351d531b5e391869b30cac8d3e769`
- Device identity: `device:8b7820faab2603b334a1c13d8c3bdba0`
- Evidence source for this supplement: operator's reported outputs from the read-only local relay/diagnostic inspection, post-timeout verification, and guarded controller disposal, all on 2026-10-09. The full local command output / raw receipt bytes were **not** independently ingested into this repository by this supplement.

## Late completion observations

The operator inspected the isolated validation vault after the BVP controller had timed out:

- Retained controller lease: generation `10`, `runId` matching the run above.
- Relay `outbox`: **0 files**; `sent`: **0 files**.
- Relay `inbox`: **3 files**, including a matching `production-execute` result with sequence `5`.
- The matching result was `status=completed`, `classification=production-complete`, `receipt.terminal=complete`, and `actionResult.status=accepted`; relay inbox file's reported modification time: `2026-10-09T11:42:20.1036714Z`.
- Retained plugin diagnostic event: `sync.controller | sync-run-complete | classification=normal` at about `2026-10-09T11:42:15Z`.
- Persisted settings after execution: `firstSyncCompleted=True`, `recoveryInProgress=False`, with startup/local-change/periodic automatic sync all **False**.

The operator then ran a read-only, identity-guarded check and reported:

```text
S09A POST-TIMEOUT READ-ONLY CHECKS: PASS
Receipt: terminal=complete; requiredEffectsCommittedAndVerified=True; committed=23; skipped=0
Canary: 53 bytes; SHA256=fd07d9a82b6662d6ce7f2c192fec419481fb082065a86c2b73bd629aef59a82f
Settings: firstSyncCompleted=True; recoveryInProgress=False
NOTE: Original BVP battery verdict remains BLOCKED; post-sync idle-ready assertion has not been rerun.
```

The canary was verified at `BVP-VALIDATION/<run-id>/initial-sync-windows.md` in the isolated Windows vault. This post-timeout check did **not** execute another synchronization.

## Guarded controller lease disposal

A subsequent guarded local command checked the exact repository HEAD, branch, run/device/managed-root identity, original blocked result, validated completion receipt, canary hash, automatic-sync settings, no human checkpoint, empty `outbox` and `sent` directories, and the generation-10 matching controller lease. It then invoked the repository's `createLiveScenarioExecutor(...).dispose()` and checked that the lease's `runId` became `null`, preserving the generation.

Operator-reported result:

```text
S09A LOCAL CONTROLLER LEASE: RELEASED
Late product completion: 23 verified operations; 0 skipped; canary intact.
Original BVP battery result remains BLOCKED; no synchronization repeated.
```

This is **local controller-lease disposal only**. No remote mailbox cleanup, personal-vault synchronization, state reset, new battery, or repeat production operation was performed by these supplemental checks.

## Verification boundary / outstanding work

1. Preserve `result.json`, `result.md`, and `attempts/attempt-001/*` **unchanged**. The original BVP verdict remains `blocked` / `device-result-unavailable`.
2. The late receipt and canary support **successful S09A production synchronization**, not completion of the original BVP scenario.
3. The original scenario did **not** execute its post-sync `observe-windows-canary-after-sync`, `assert-windows-canary-preserved`, `observe-windows-after`, or `assert-windows-after` steps. Independent post-timeout checking established canary integrity and settings state; it did not supply the scenario runner's remaining `idle-ready` assertion.
4. Investigate/adapt the BVP device-result timing contract without conflating a timeout with a failed physical effect. Any later BVP PASS must come from a separately supported verification pathway, with explicit provenance.
5. Keep live synchronization suspended pending the next authorized validation action.

**Status:** production synchronization **confirmed COMPLETE (supplemental physical evidence)**; original S09A BVP battery **BLOCKED (unchanged)**; local controller lease **released**.
