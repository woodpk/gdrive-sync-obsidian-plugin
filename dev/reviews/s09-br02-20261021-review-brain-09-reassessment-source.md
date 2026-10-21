# S09-BR02 — Independent reassessment: frozen source-only Pass 1

**Reviewer** `review-brain-09` | **Review date** 2026-10-21

**Intake and identities:** `woodpk/gdrive-sync-obsidian-plugin`; `WS-07/S09-BR02`; `planning/ws07-s09-bvp-physical-phxci-consumer-20261020`; exact source `95415859f1a9890c796f9256431da81e5e34375c`; intake state `cfbda0c603a43828b30da5d268ee729bfbe06775`; `handoff-count: 3`; recipient `REVIEWER`. GitHub compare proved source ancestor of the intake state and branch exactly at the supplied state.

**Pass-1 disposition: SOURCE ACCEPTANCE NOT ESTABLISHED; MATERIAL PRIVACY / AUTHORITY QUESTIONS REMAIN.** This is an independent source-code and contract assessment, not a PHX-CI verdict.

## Scope and evidence separation

Read neutral workstream architecture, owner's `s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`, DEC-345, the exact bridge implementation `test-platform/test/batteries/phxci-physical-bridge.ts`, and relevant pre-existing source contracts in `run-live-battery.ts`, `battery-registry.ts`, `scenario-checkpoint.ts`, `live-scenario-executor.ts`, `validation-entrypoint.ts`, `device-command-agent.ts`, `drive-mailbox.ts` and `build-validation-artifact.ts`. No tests for this candidate, Builder commentary, source diff/history, prior review documents or PHX-CI evidence were opened during this pass.

**Disclosure:** This is a continuation in an existing Reviewer conversation which already contains review of a preceding S09-BR02 candidate. Therefore a claim of *fresh-session, zero-previous-exposure* blindness would be inaccurate. For the exact new source the Pass-1 inspection remained source-and-authority-only, and its observations are frozen in this report before evidence inspection.

## Source-grounded strengths

1. `main()` verifies actual registered battery/scenario ID, definition digest and exact required device-label set before dispatch. The source still permits synthetic test-only identities behind a PHX-context guard, which must never authorize physical dispatch.
2. The bridge now demands an installed-build identity file, reads adjacent `main.js`/`manifest.json` and SHA-256 hashes actual local bytes. In the existing device-agent pipeline, the mailbox measures installed plugin-file bytes and the live executor compares returned hashes with expected values. This is stronger than a source-commit string alone; physical authenticity still depends on trusted installation and device communication.
3. Scratch/root checks constrain the relay to a `C:\\temp\\<32-hex-guid>\\relay` path and tie result/checkpoint/install identities to the same run-root. Symlink checks and no shell-based runner invocation are positive containment measures.
4. `loadPublishedBridgeAttempt` checks immutable commit/path ancestry and source-equivalent changes, original PHX stage exit/status and independent repository verification; return code 3 remains BLOCKED. The bridge does not publish alternate verification evidence.
5. A strict top-level and many nested-key privacy shape allowlist exists; arbitrary extra JSON objects and several secret key/value forms are rejected, with hard byte/depth bounds.

## Potentially blocking issues for Pass 2 to adjudicate

**P1-01 — HIGH / privacy of values inside allowlisted fields.** `phxci-physical-bridge.ts`, `SAFE_KEYS.observationValue`, `allowedShape`, `inspectSensitive`, `parseResult`: the allowed observation schema includes `remoteObjectId`, `vaultIdentity`, `deviceIdentity`, `revision`, `changeCursor`, `path`, `reason` and other potentially identifying or user-controlled strings. These fields pass without proof that their *values* originate from disposable fixture data; regex scanning rejects recognizable tokens but cannot establish the owner-required no-personal-vault/account-identifier rule. Similarly `deviceIds` are directly framed rather than expressly hashed as required by the §5 transport identity contract. Determine whether production source-derived, synthetic-only observations or independent redaction guarantees eliminate this exposure. Otherwise reject publishing such values in the immutable Git PHX stage.

**P1-02 — MODERATE/HIGH / integrity and authorization of user-supplied evidence.** `main()` validates a request JSON and dual operator variables; `buildLiveRunnerArguments` performs structural path containment; the installed result derives from on-device measurement. But the owner-authorized physical execution condition is represented by caller-controlled `ownerPhysicalApproval.approved/scope` and environment `BVP_OWNER_PHYSICAL_APPROVAL=YES`, with no observable unforgeable owner authorization in this module. Review whether the governing operator boundary authenticates this independently before classifying the feature ready for physical use. The current assignment authorizes NO physical use.

**P1-03 — MODERATE / physical scratch path containment needs non-directory reparse-point scrutiny.** `enforceScratch()` rejects symbolic-link ancestors using `lstatSync().isSymbolicLink()`; Windows junction semantics and existing root-final-file symlinks/hard links must be checked independently for actual containment. `buildLiveRunnerArguments` is a separate structural guard; final paths are not realpath-checked. The absence of a safe realpath check should not be treated as proven exploitable without examining the exact Windows adapter/root semantics.

**P1-04 — GOVERNANCE / one-file implementation boundary must be demonstrated.** Owner plan §§2, 8, 10 explicitly restrict implementation changes to a single new bridge module and BR02 additional tests, with existing runner/executor/device/runtime files frozen. The present source has bridge-aware functionality in `run-live-battery.ts`, `live-scenario-executor.ts`, `validation-entrypoint.ts`, device agent/mailbox and a simulated battery. Without reading history in Pass 1 their modification provenance cannot be asserted. In Pass 2 independently verify the exact changed-path list and whether a documented Owner-approved scope exception exists. Unapproved modifications must not be legalized merely by passing tests.

## Freeze

The above is an unmodified, source-only assessment. The following pass may inspect tests, full original PHX-CI publications, history and authority for final adjudication. No software validation was run or software/fixture/evidence was changed by Reviewer.
