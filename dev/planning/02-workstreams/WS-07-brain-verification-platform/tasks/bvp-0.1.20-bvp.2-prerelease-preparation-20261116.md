# WS-07 / BVP validation-only BRAT prerelease 0.1.20-bvp.2

**Status:** PREPARATION SOURCE COMMITTED; NEW PACKAGE UNBUILT/UNVERIFIED; NOT PUBLISHED.  
**Owner authorization:** 2026-11-16 — prepare a fresh BVP-only GitHub prerelease for iPhone readiness. Owner expressly allowed GitHub Actions to facilitate release creation, but repository-locked PHX-CI qualification, Reviewer independence, and immutable artifact promotion remain requirements. No GitHub Actions verification workflow, runtime pin change, shipping production modification, physical test, Obsidian vault synchronization, Google Drive operation, or release publication has been performed.  
**Preparation branch:** `release/bvp-0.1.20-bvp.2-preparation-20261116`.  
**Immutable predecessor implementation:** `b1ef092cf5ce73c7811b5726ee803add2538df2c`, tree `b353df77de37e9c4a1c12a71ef2aac4b9fb4d109`, DEC-359 SOFTWARE-ONLY accepted. The post-review administrative head on its original feature branch is `45aeecbdda7b7285c44ccf8278ce8ea33f9e2016`.  
**Source-change qualification:** NEW release-packaging source/tests have NOT undergone PHX-CI or independent final review. Do not reuse the DEC-359 PASS as if it qualified this new source.

## Confirmed existing release

The already published GitHub BRAT prerelease `0.1.20-bvp.1` was created 2026-10-23 from source `2bf51ca15aec9c752e3ac7769fcf3ac237df99df`, with `main.js` SHA-256 `90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7` and `manifest.json` SHA-256 `1788bcaa4a9dd05d22ec03b0ba56bd3a72d4fa4541e2e5ec74c1a43253ce54a5`. Preserve this release and tag unchanged. Owner's iPhone BRAT reports `0.1.20-bvp.1` installed and enabled in an isolated BRAIN vault. This is an operator report, not a cryptographic installed-file measurement.

A source-tree comparison establishes unchanged shipping `src/**` and changed BVP validation-only modules since the old release, including `test-platform/src/live-device/validation-entrypoint.ts`, `device-command-agent.ts`, `drive-mailbox.ts`, `diagnostic-contract.ts`, and `test-platform/src/bvp-runtime-error-journal.ts`. The new validation package is required to exercise these newer capabilities.

## Scope and non-goals

**Goal:** prepare `0.1.20-bvp.2` as distinct **nonshipping** Obsidian iOS BRAT validation assets while retaining the existing Web application OAuth client, device-local credential handling, production `src/**`, `drive.file` scope, vault pairing, managed remote, installed iPhone app, and disabled automatic sync settings.

**Packaging helper:** `scripts/prepare-bvp-prerelease.mjs`, invoked at an exact SHA with `--source-sha <40hex> --version 0.1.20-bvp.2`, compiles the BVP artifact builder, generates the validation-only bundle with `BVP_VALIDATION_PRERELEASE_VERSION=0.1.20-bvp.2`, verifies actual artifact and manifest hashes against generated build identity, then writes exactly four local staging outputs under `.test-build/bvp-prerelease/0.1.20-bvp.2/`:

- `main.js` — nonshipping BVP validation bundle for Obsidian/BRAT.
- `manifest.json` — validation-only prerelease version; `isDesktopOnly=false`.
- `build-identity.json` — exact source and generated artifact provenance.
- `release-sha256.txt` — SHA-256 file hashes.

The helper **does not publish anything**, write a tag, call GitHub APIs, install on a device, run a BVP scenario, launch Google OAuth, or claim a test PASS. It refuses incorrect source SHA, unsupported version, live Google activation, dirty checkout and preexisting staging destination. Source-level adversarial packaging tests are in `test-platform/test/bvp-prerelease-packaging.test.ts`.

## Qualification and promotion gates

1. **Source-readiness:** source-only diff, TypeScript build contracts, generated validation entrypoint, no shipping source modifications, preserved Web OAuth, frozen architecture and PowerShell budgets, no executable side effects to Google/vault/iPhone.
2. **PHX-CI:** the exact new preparation branch HEAD must be qualified via the existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` with `-SoftwareOnlyBranch`, unchanged pinned runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, and environment `BVP_DEC359_LIVE_RUN=NO`. Capture original run ID, result, stage exit codes, complete logs, evidence commit and exact verified candidate source.
3. **Independent Reviewer:** review the complete new source and executed tests through blind-first/source-first assessment and original PHX-CI evidence. Reviewer must separately approve the packaging change and provenance, not merely rely on prior DEC-359 review.
4. **Approved artifact:** in a fresh clean isolated checkout of the reviewer-approved exact package source, `npm ci`, run the source-bound packaging helper, and record full output and hashes. Compare any rebuilt artifact against the candidate/PHX-CI-supported immutable output hashes. A SHA mismatch or new source commits require reconsideration, not a rubber stamp.
5. **Owner-controlled publication:** after all gates, separately approve release of the exact four assets with the nonshipping `0.1.20-bvp.2` tag. GitHub Actions MAY assist with file upload if repository governance is expressly reconciled and the action is correctly qualified, but MAY NOT replace PHX-CI or be used as shortcut verification. The currently available GitHub connector provides file/branch/PR writes but no release-asset upload or action-dispatch capability. Do not label candidate PUBLISHED until GitHub release readback proves assets and digests.
6. **Later iPhone operation:** BRAT update and physical BVP run remain distinct actions requiring installed-hash verification and explicit Owner physical authorization. No automatic sync or vault mutation is approved by preparing this release.

## Current truthful disposition

**New packaging source and tests committed to preparation branch; NOT RUN and NOT VERIFIED.** No branch merge, new GitHub tag or prerelease, or local/physical installation. Existing `0.1.20-bvp.1` remains the latest published BVP release until the gated publication succeeds.
