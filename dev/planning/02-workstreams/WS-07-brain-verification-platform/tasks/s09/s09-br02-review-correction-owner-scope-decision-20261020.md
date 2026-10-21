# S09-BR02 reviewer correction — narrow Owner scope decision needed

**Status:** SCOPE A OWNER AUTHORIZED (2026-10-20); constrained implementation and requalification underway. No physical/install/release authorization.
**Repository / Build Units:** `woodpk/gdrive-sync-obsidian-plugin`, corrective S09-BR01 (one implementation file) and S09-BR02 (tests only).
**Reviewer:** CORRECTION REQUIRED at report `dev/reviews/s09-br02-20261020-review-brain-09-final.md`, immutable commit `b5250ef86145e389d3cdbc214c38054718d36713`.
**Handoff count:** 2; BUILDER recipient; preserve count until a genuine authorized transfer.
**First correction work:** RED regression tests committed `779e75582ded28a1b766e9410d279a7da2757cd5` and registered `921d2752d06a6e4361fdb4a18406bca184f633b5`. These have NOT been executed through PHX-CI and are not a qualification PASS.

## Verified source-level obstruction

- `test-platform/src/live-device/build-validation-artifact.ts` writes a **local build** `build-identity.json` with `artifactSha256` and `manifestSha256` derived from local build output. That proves local build bytes, NOT bytes currently installed/running on a remote Windows/iOS participant.
- The **device-to-controller** contract in `test-platform/src/live-device/device-command-agent.ts` declares `ValidationBuildIdentity` with only `schemaVersion` and `sourceCommit`. `DeviceCommandResult.validationBuild` contains only those fields.
- `test-platform/src/live-device/validation-entrypoint.ts` creates that runtime identity from the embedded `sourceCommit`; it neither reads installed `main.js`/`manifest.json` bytes nor attests their hashes.
- `test-platform/src/live-device/drive-mailbox.ts` decodes the authenticated mailbox response into the same source-only `validationBuild` contract.
- `test-platform/src/live-device/live-scenario-executor.ts` correlates device result against source commit, not measured installed artifact/manifest digests.
- Thus the existing BRAIN bridge can compare its supplied `artifactSha256` to *another supplied hash* or a local-built artifact, but **cannot cryptographically establish the actual installed bytes on the participant**. Adding unverified claims to a JSON request would not remedy the high-severity identity finding BR02-F01.
- The approved S09 bridge plan §8 prohibits creating a second implementation file or modifying the live agent/protocol/runner/config within this Build Unit. The live-device-agent LOC budget is already 749/750 at the last PHX-CI architecture measurement. An appropriate device-measurement/installation-proof pathway is **outside the one-file adapter boundary** and likely requires budget/authority review. We must not silently widen scope or weaken the guard.

## Other reviewer findings — planned correction disposition

| Reviewer finding | Bounded correction target | Constraint |
| --- | --- | --- |
| BR02-F01 installed artifact/manifest authenticity | Bind measured installed main.js and manifest.json to a **trusted device/installation observation**, approved hash + source + run + device identity; reject absent/forged/stale evidence | **OWNER DECISION REQUIRED** for any additional device-side/protocol changes; no self-attestation-as-truth |
| BR02-F02 real battery scenario digest | Validate `getLiveBattery(battery).createScenario()`, recompute digest and exact device-label map for all modes | BR01 adapter-only repair feasible; synthetic transport probe must remain explicitly separate, not masquerade as real scenario |
| BR02-F03 nested privacy leakage | Frozen recursive shape/value allowlist for bounded nonsecret evidence; reject arbitrary nested captures, steps and person/file content | Verify whether lossless existing BVP result can be transported without exposing non-disposable personal content; otherwise BLOCKED and request Owner decision |
| BR02-F04 relay-root escape | Canonical, symlink-safe, attempt-specific `C:\temp\<GUID>\` confinement, provenance and collision prevention for relay/checkpoint/results, fail closed | BR01 adapter-only possible subject to approved run-root contract |
| BR02-F05 actual runner simulation | Under genuine PHX-CI, invoke actual adapter main → existing BVP live runner → controlled **simulated** device relay, checkpoint original BLOCKED publication then fresh-run verified completion without replay | Test fixture(s) permissible under BR02, but synthetic framers alone are not this proof; no live device/Drive/vault access permitted |

## Specific Owner decision requested

**Option A — Authorize a bounded expansion of corrective S09-BR01 solely for verifiable installed-device evidence and approved nonphysical integration plumbing.** Specify writable device/validation-entrypoint/mailbox/identity contracts, how installed bytes will be independently measured and linked to authenticated participant identity, any permitted architecture-budget adjustment, privacy-safe evidence shape, and minimum test-only relay fixture files. Keep all PHX-CI files, pin, authority, unrelated product behavior and release/physical gates unchanged. A remote self-reported hash with no actual measurement/provenance is NOT an acceptable substitute.

**Option B — Retain the one-file scope and formally narrow acceptance to PHX-CI *nonphysical stdout transport only*.** Keep BR02-F01 and BR02-F05 and any privacy-safe live transport gaps explicitly **BLOCKED**, prohibit any installed-device authenticity/readiness claim, and defer physical-bridge implementation to a newly Owner-approved bounded plan. This cannot be labeled acceptance of the currently required full S09 bridge.

Until the Owner makes that decision, **no change to device protocol, PHX-CI/pin, frozen architecture guards, approved artifact SHA list, physical S09, live Drive/vault, release, merge or Stage 3 is authorized**. Prior genuine PHX-CI PASS and two-publication synthetic transport evidence remain preserved and are not retroactively invalidated; they are insufficient to close the review findings.

## Next authorized operation

Obtain the explicit Owner choice and, for Option A, exact writable surfaces and trust model. Then implement a bounded S09-BR01 correction after existing tests-first commit, qualify through pinned PHX-CI, finish BR02 simulated-runner acceptance and send a **new** neutral Builder→Reviewer handoff only with substantive PASS and original immutable evidence.


## Owner disposition — Scope A authorized (2026-10-20)

**Decision:** Owner explicitly replied `SCOPE A AUTHORIZED`. This resolves the choice between options, **not** permission to modify PHX-CI, shipping software, any user vault, or frozen authority budgets.

**Exact corrective BR01 writable implementation paths (initial maximum six; only as needed):**
1. `test-platform/test/batteries/phxci-physical-bridge.ts` — bridge, trusted artifact/manifest input and isolation.
2. `test-platform/src/live-device/validation-entrypoint.ts` — measure actual installed plugin `main.js` and `manifest.json` bytes via the installation's Obsidian adapter before reporting any device result; never accept a provided SHA as proof of those bytes.
3. `test-platform/src/live-device/device-command-agent.ts` — extend validation build observation with both digests; no production action changes.
4. `test-platform/src/live-device/drive-mailbox.ts` — preserve the measurement in the authenticated, source-bound device-result protocol; no new transport.
5. `test-platform/src/live-device/live-scenario-executor.ts` — independently correlate device-reported observed digests against controller expected local-build identity, per command; fail closed before accepting observations.
6. `test-platform/test/batteries/run-live-battery.ts` — forward frozen expected build identity into the existing executor (no new runner).

**Test-only S09-BR02 writable scope:** `test-platform/test/**`, including tightly scoped compiled simulated-device relay fixtures and existing deterministic battery registration. Documentation/status only under the existing WS07 planning and `dev/state/current-state.yaml`.

**Trust model:** Local `build-validation-artifact.ts` already hashes produced artifact/manifest and writes its `build-identity.json`. Controller computes/checks the actual local bytes and frozen source SHA; installed device computes independent SHA-256 directly from its own installed on-disk plugin `main.js`/`manifest.json` using Obsidian adapter, associates measured identity with each command result in authenticated Drive mailbox or local test-only relay, and controller requires both observed bytes' hashes equal approved expected identity before accepting. A plain caller-provided or synthetic hash is never promoted to actual installed proof. Hash measurement attests installed *on-disk bytes* and authenticated response identity, not inherently in-memory runtime image or adversarially compromised device.

**Confinement:** `C:\temp\<GUID>\` per attempt, verified no symlink traversal, same owned root for relay/result/checkpoint. A nonphysical test entrypoint must have its own strict simulation identity distinct from Owner physical approval, and must never access live mailboxes/devices.

**Hard constraints:** Do not modify frozen lock `dev/authority/governance/locks/testing-platform-boundary.yaml`, architecture guard, PHX framework, pin or product source. If the 750-LOC device budget cannot accommodate the minimal type addition without a prohibited increase, stop for explicit budget decision rather than relaxing the guard. Architecture's six-non-test-file splitting threshold is met at most; break corrections into bounded work increments.

**Evidence:** Existing 8 Reviewer RED tests committed first. Actual RED verification must run only through PHX-CI; after correction require exact new immutable source PHX PASS plus genuine actual BVP runner nonphysical checkpoint → published BLOCKED → resumed eligible PASS. Preserve previous synthetic transport as a subordinate proof.
