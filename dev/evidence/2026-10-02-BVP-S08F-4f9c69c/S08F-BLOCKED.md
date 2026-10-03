# S08F BLOCKED

- classification: `pre-mutation-preflight-blocked`
- source commit: `e1067f5159a316f328c492837b8c6ff59e08d226`
- branch head at execution start: `a7eeb11532f9a78094f4ca3e7a896192cc973add`
- disposable vault: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b`
- device: `windows-brain-patrick`
- attempt-1 run: `s08f-desktop-canary-4f9c69c`
- retry run: `s08f-desktop-canary-4f9c69c-r2`
- scenario: `s08f-desktop-live-canary-r2`
- fixture: `BVP-VALIDATION/s08f-desktop-canary-4f9c69c/canary.md`
- fixture SHA-256: `db03eedf8f43902405abdc0f893649a3d9b3e166e3e21d35a3e06e3c6a6e259d`
- primary reason: Pre-mutation diagnostics found 1 blocking defect(s): production-restore-artifacts=Ordinary production restoration artifacts are missing.

## Stage results

- **preflight-input-identity** — PASS / input-identity: Required helper identities are present.
- **preflight-canary-identity** — PASS / harness-integrity: Canary content identity is exact.
- **preflight-validation-install** — PASS / validation-install: Disposable validation plugin files are present.
- **preflight-validation-artifact** — PASS / validation-artifact-identity: Installed validation artifact is exact at 909821 bytes.
- **preflight-production-restore-artifacts** — FAIL / production-restoration-precondition: Ordinary production restoration artifacts are missing.
- **preflight-attempt1-sequence-state** — PASS / attempt1-state: Attempt-1 sequence state is the exact completed rejected sequence-3 state.
- **preflight-attempt1-fixture** — PASS / attempt1-fixture: Attempt-1 fixture is present with exact size/hash.
- **preflight-relay-cleanliness** — PASS / relay-state: Protected local relay is drained.
- **preflight-retry-sequence-freshness** — PASS / retry-state: Retry sequence state is fresh.
- **preflight-probe-fixture-freshness** — PASS / retry-fixture-state: Duplicate-replay probe fixture is absent.
- **preflight-evidence-state** — PASS / evidence-state: No prior PASS evidence exists; prior BLOCKED evidence may be superseded by a successful retry.
- **preflight-obsidian-runtime-inspection** — PASS / environment-inspection: Observed 0 Obsidian processes, 0 top-level windows, and 0 owned listeners.
- **preflight-obsidian-executable** — PASS / environment-precondition: Obsidian executable located at C:\Users\woodpk\AppData\Local\Programs\Obsidian\Obsidian.exe.
- **preflight-renderer** — FAIL / devtools-environment-not-ready: Expected exactly one reachable disposable-vault renderer; observed 0. Runtime={"ok":true,"processes":[],"windows":[],"listeners":[]} DevTools attempts=[{"port":63311,"status":"unreachable","error":"fetch failed"}]
- **preflight-summary** — FAIL / preflight-defects-observed: Pre-mutation diagnostics observed 2 defect(s), including 1 unresolved mutation blocker(s).
