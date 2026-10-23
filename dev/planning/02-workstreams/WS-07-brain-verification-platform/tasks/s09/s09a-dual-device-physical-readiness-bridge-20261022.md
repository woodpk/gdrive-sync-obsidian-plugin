# S09A — Two-device PHX-CI physical readiness bridge (2026-10-22)

## Status

**IMPLEMENTED IN BRAIN TEST-PLATFORM SOFTWARE; PHX-CI QUALIFICATION PENDING. NO PHYSICAL DISPATCH.**

Owner-directed continuation of S09A's real Windows/iPhone testing. Do not issue a Reviewer handoff without an explicit subsequent Owner instruction.

The shipping BRAIN 0.1.19 artifact is unchanged. The separate BVP validation artifact is pinned to source `2bf51ca15aec9c752e3ac7769fcf3ac237df99df`, main.js SHA-256 `90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7`, manifest SHA-256 `d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965`. The Owner's staging run passed, but no iOS validation-only artifact is confirmed installed.

## Current implemented bounded scope

- First published new contract tests under `test-platform/test/s09a-physical-dual-bridge.test.ts` before the bridge correction.
- Registered the new module under the existing S09 deterministic PHX-CI test family; no second harness.
- `test-platform/test/batteries/phxci-physical-bridge.ts` accepts the **exact** pre-registered `s09a-dual-device-readiness` battery in the existing disposable Windows BVP plugin relay, with exact private-to-public per-device identity matching.
- The new strict two-device evidence projection requires the two source-derived logical device identities, checks each registered observation/capture before redacting private captures, pseudonymizes the two identities including installation-observation keys, preserves a missing-iOS BLOCKED result, and refuses a false COMPLETED result without both installed-device measurements.
- Added a separate CLI entrypoint `--run-approved-s09a-dual-readiness` with S09A-specific physical approval and installed-iOS confirmation gates, but **the repository PowerShell operator intentionally exposes no physical dual-device switch yet**. It is software-qualified via the operator's existing nonphysical PHX-CI path.
- Existing Windows-only physical smoke semantics, per-device lease, C:\\temp scratch, PHX-CI source guard, release hashes, and BVP architecture isolation are retained.
- NO scenarios beyond the existing two observe/assert pairs are authorized; no production synchronization action, first sync, fixture write, network/offline manipulation, or Google authorization mutation is authorized.

## Nonphysical qualification

Use a fresh isolated clone of `fix/s09-bvp-live-controller-20261022` at the frozen candidate commit, a pinned `69c4aa077d4a1a46d1e85e59f39d36285be99e83` PHX-CI runtime, and the existing repository-controlled `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1 -ExpectedSourceSha <frozen-SHA>` **with no physical switches**.

The operator's default focused stage is `npm run test:bvp-root`; the repository stage runs `npm test`. Both run under PHX-CI and publish original canonical evidence. Capture actual stage verdict, run ID, and evidence commit. Do not assert software PASS before PHX-CI returns it.

## Outstanding physical gates

1. Owner-authorized installation of **validation-only**, not shipping, `main.js`, `manifest.json`, `build-identity.json` into the already isolated iPhone/iPad Obsidian test vault, after backup/identity checks. Shipping build already installed is insufficient.
2. Proof of independent on-device OAuth and explicit pairing to the intended disposable managed test remote on iOS; no auth token export.
3. Separate PHX-CI operator integration/qualification for the S09A-only physically approved dual-device dispatch. Current PowerShell operator remains deliberately software-only for S09A.
4. Exact private device ID supplied to the controller only in its authorized local process, redacted public SHA-256 pseudonyms in evidence. Device ID must not be misrepresented as a token.
5. Existing and owned BVP command-mailbox root confirmation; it may create control-plane metadata records, even though the readiness scenario does not synchronize product files.
6. Real installed source SHA/manifest/artifact checks and acknowledgement of the explicit BVP-only metadata-effect budget; bound run ID, PHX publication, live device receipts, no duplicate dispatch after uncertainty.
7. If actual iOS status differs from expected idle-ready, preserve the observed FAIL/BLOCKED rather than changing the assertion or treating the missing mobile status-bar UI as success.

## Relevant negative limits

No new test framework, test runner, GitHub Actions, extra physical coordination service, PHX-CI runtime or configuration change, personal vault operation, or Stage 3 authorization. Preserve the owner-deferred Reviewer handoff.
