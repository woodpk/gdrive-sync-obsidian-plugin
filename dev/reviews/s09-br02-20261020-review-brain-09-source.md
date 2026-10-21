# S09-BR02 — Independent source-only assessment (frozen Pass 1)

- Reviewer: `review-brain-09`; date: 2026-10-20.
- Repository: `woodpk/gdrive-sync-obsidian-plugin`.
- Feature: `WS-07/S09-BR02 — BVP Fixed-PHX-CI Consumer Bridge`.
- Planning authority: `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`.
- Exact frozen source SHA: `576f3cfcca9a24c8851456a5487448542cfd0c91`.
- Handoff intake state: `64eeaa38792b2cf7ecf70ff820c164e990a8a92b`; handoff-count 1; REVIEWER recipient.
- **Pass-1 disposition: CORRECTION REQUIRED — confirmed source-level gaps against mandatory identity, privacy and path-confinement contracts.** This is not an assertion about test results or PHX-CI status.

## Independent source and authority examined

Read the owner-directed S09 fixed-runtime consumer-bridge plan (§§1–11), current WS-07 architecture, DEC-345 and existing product/BVP boundaries. Inspected the exact candidate's `test-platform/test/batteries/phxci-physical-bridge.ts` (entire implementation); existing `run-live-battery.ts`, `late-completion-recovery.ts`, `scenario-checkpoint.ts`, `live-scenario-executor.ts`, `scenario-evidence.ts`, validation-artifact builder/device-agent and the architecture lock. No authored tests, earlier review findings, source history, PHX-CI results or Builder narratives were used.

## Material findings

**BR02-SRC-01 — HIGH — Missing installed-artifact identity attestation and manifest binding.** `test-platform/test/batteries/phxci-physical-bridge.ts:33–57, 126–161, 163–210, 390–490`. The `BridgeExpectation` has a caller-supplied `artifactSha256` but no `manifestSha256`, no installed `build-identity.json` attestation, and no relay-scope identity. `validateAttempt` checks only that the claimed artifact hash has 64 hex characters; `parseResult` binds the result's machine live identity to `sourceCommit`, not observed installed main.js/manifest digests. A syntactically valid arbitrary artifact hash paired with the correct sourceCommit and BVP result can satisfy these conditions. Requirement §4 expressly states that a source-commit string alone does not prove what is installed and requires approved installed artifact + manifest SHA-256 from bounded identity evidence. **Required:** cryptographically bind and independently verify the actual installed validation artifact and manifest (and relay scope) without modifying frozen PHX-CI, device protocol or other forbidden files; if not possible within permitted BR01 one-file boundary, return a bounded scope/authority decision rather than claiming compliance.

**BR02-SRC-02 — HIGH — Scenario digest asserted, not grounded to the actual selected battery.** Same file `:126–161, 163–210, 212–255, 427–513`. The digest is checked for shape and against a checkpoint only for exit 3. On successful exit 0 no checkpoint exists; the bridge never calls the existing `scenarioDefinitionDigest(getLiveBattery(attempt.battery).createScenario())` to establish the digest of the executable scenario chosen by `--battery`. A mismatching, caller-chosen valid digest can be published as the claimed accepted scenario digest for an otherwise completed run. **Required:** bind `scenarioId`, digest, and required device labels to the immutable actual selected scenario on every mode, including completed and error paths.

**BR02-SRC-03 — HIGH — Source-side payload privacy screening does not enforce the required nested field/value allowlist.** Same file `:29–31, 106–161, 224–255, 490–512`. `inspectSensitive` rejects certain key substrings and known token patterns, but the only structural allowlist is four *top-level* result keys. Any additional nested keys/strings under `result`, `evidence`, `machine`, etc. are accepted if they evade the regex, potentially including personal names, filesystem/vault paths, arbitrary observations and note excerpts. The design requires explicit preapproved **field and byte allowlisting**, disposable nonsecret fixtures, and privacy screening *before* PHX-CI stdout/Git publication; generic regex denylisting cannot prove that property. **Required:** recursively validate the existing BVP result schema against a frozen nonsecret transport subset, reject unapproved fields and uncontrolled free text without replacing the original BVP checkpoint/result semantics required for resume. A scope conflict requires explicit Owner decision, not silent relaxation.

**BR02-SRC-04 — HIGH — Relay root is not constrained to an approved fixture/scratch namespace.** Same file `:416–425, 427–455, 478–505`. `enforceScratch` confines checkpoint/result paths to `C:\\temp\\` but checks `paths.relayRoot` only via `isAbsolute`. Consequently a caller supplying an arbitrary absolute relay root (including a personal-vault path) passes this specific guard, and the module forwards it to the live runner. The design (§§5–7) requires strictly bounded approved relay/device paths and no unmanaged personal vault access. **Required:** strict normalized, canonical, controlled relay-root containment and safe resource ownership; verify that the scope is approved for the exact attempt.

## Source strengths and other boundaries

- `loadPublishedBridgeAttempt` checks PHX run/stage outcome, immutable Git-path format, ancestor relationship and evidence-only path progression.
- Versioned envelope, base64url canonicalization, hashes and size limits exist; `exitCode===3` is not falsely converted to success.
- The bridge invokes an existing BVP runner and attempts to preserve checkpoint/late-receipt mode exclusivity; source itself does not alter `woodpk/phx-ci`.
- Existing live executor has per-device authority and checkpoint identity checks, but they are **not substitutes** for bridge-level installed-artifact/manifest and scope verification.
- Further determination of actual focused-stage round-trip viability, PHX-CI publication on BLOCKED, test completeness and accurate immutable source pin belongs to Pass 2.

## Freeze / independence

This source assessment is frozen before inspecting any candidate tests, earlier reviews, Builder summaries, source diffs/history, or PHX-CI evidence. Later Pass 2 may confirm, refine or close findings only with direct evidence, preserving this original source-only assessment unchanged. No software execution or production/test/script modification was performed.
