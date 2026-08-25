# Cumulative Coding-Agent Evidence — Phases 1–5

This file is the cumulative construction-evidence ledger for `woodpk/gdrive-sync-obsidian-plugin`. Earlier phase evidence is retained rather than declared superseded. Detailed phase records remain authoritative historical evidence at their preserved paths/commits; this ledger records their identity and carries the evidence chain forward into Phase 5.

Phase 6 and Stage 3 have **not** begun.

---

## Phase 1 — Repository Foundation and Frozen Shared Contracts

### Recovered historical evidence

The original Phase 1 `_ca-output.md` was recovered from Git history at commit:

`91f740bf3d6ad1a93524dc0a1ea77dfeba22eb9b`

That historical record identifies:

- build/session: `Stage 2A Build Session 01 / Phase 1 — Repository Foundation and Frozen Shared Contracts`;
- baseline: `0f88f8f11d10caf492237b323aec1b550fc2b052`;
- final pushed implementation SHA before the Phase 1 evidence-only commit: `40af4c2a73576f931868453f03857af25bd207d9`;
- final post-lockfile CI run: `32662829150`;
- `npm ci`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 14/14 Phase 1 tests;
- `npm run build`: PASS.

Phase 1 established the mobile-compatible Obsidian plugin foundation, reproducible build/test tooling, frozen shared contracts under `src/contracts/**`, test fakes, architecture/mobile-safety checks, and `dev/phase-1-shared-contracts.md`.

The complete recovered Phase 1 evidence remains available through the immutable historical Git object above; its prior failed intermediate CI attempts and corrective steps remain part of the record and are not rewritten here as passes.

---

## Phase 2 — Core Synchronization Semantics and Durable State

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P2.md`

That record identifies:

- session: `Stage 2A Build Session 02 / Phase 2 — Core Synchronization Semantics and Durable State`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final implementation head verified by Phase 2 CI: `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`.

Phase 2 established deterministic LOCAL/REMOTE/BASE planning, safe-union initialization, timestamp-independent truth, conservative deletion authority, conflict/three-way-merge semantics, identity-preserving move recognition, destructive safety policy, durable/versioned synchronization state, tombstones/stale-device protection, operation journaling, crash-safe verified commit order, run serialization, cancellation/pause/deferred reconciliation, and precondition validation.

The full Phase 2 implementation inventory and verification history are preserved in `_ca-output-CA-P2.md`.

---

## Phase 3 — Google Drive and OAuth Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P3.md`

That record identifies:

- session: `Stage 2A Build Session 03 / Phase 3 — Google Drive and OAuth Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- verified Phase 3 code head: `6e4621345809b30e8b4161f1e52f6344f7474c33`;
- final code verification run: `32713423290`;
- verification job: `97389515202`.

Phase 3 established the `drive.file` OAuth/Drive implementation, PKCE/state transaction integrity, device-local secret storage, same-device authorization return seams, stable managed-root identity/protocol metadata, explicit pairing and account binding, Changes API support, complete/partial reconciliation semantics, lazy bounded downloads, resumable uploads, identity-preserving Drive moves, recoverable Drive trash, and structured bounded retry/error signaling.

The full Phase 3 implementation, official-documentation basis, limitations, and verification record remain preserved in `_ca-output-CA-P3.md`.

---

## Phase 4 — Obsidian Local, Platform, and Configuration Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P4.md`

That record identifies:

- session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final corrected implementation head recorded in Phase 4 evidence: `4d06581fa91ba9643496a67296b5002925581ba2`;
- verification run for the recorded correction: `32731187369`;
- verification job: `97443556511`.

Phase 4 established the production local-vault boundary, path/exclusion/configuration policy, atomic local replacement semantics, Obsidian FileManager move/trash behavior, startup/lifecycle event handling, desktop external-reference containment checks, and mobile-safe fail-closed behavior.

### Preserved stock-iOS platform limitations

The Phase 4 evidence established two limitations that remain authoritative and were not weakened during Phase 5:

1. stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range reading for every required file type; unsafe whole-file `readBinary()` fallback is prohibited;
2. stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required safety guarantee; the implementation fails closed where proof capability is unavailable.

The full Phase 4 evidence remains preserved in `_ca-output-CA-P4.md`.

---

## Phase 5 — Integrated Product, Accepted Repairs, Group D Acceptance, and G2R Closure

### Integrated history and corrective baselines

- original Group D baseline: `70b4952c82987e1de8a1455166b090b2a4f57918`;
- accepted G1 trigger-semantics checkpoint: `c12350f0ad00a117a7116d529bc04ebedce09352`;
- prior G2 evidence-only master: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`;
- G2R correction-pass baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`;
- G2R final dynamically tested implementation/test SHA: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`.

Retained Group repair evidence:

- `dev/evidence/_ca-output-agt-CA-P5-GROUP-A-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-B-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-C-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`.

Phase 5-specific evidence:

`dev/evidence/_ca-output-CA-P5.md`

Current blocker/limitation record:

`dev/evidence/_ca-blocker.md`

### Historical checkpoints retained, not current

- original Group D dynamically tested checkpoint `ee431c408c64cddf3bcc8642c3015179fefb9b91`: 177/177 tests;
- accepted G1 checkpoint `c12350f0ad00a117a7116d529bc04ebedce09352`: 178/178 tests;
- prior G2 dynamically tested checkpoint `7aab9a90c885f33a371576ef602e7a5d352b1d07`: 209/209 tests, run `32811319438`, job `97691056148`.

Those are historical only. The current authoritative G2R gate is below.

### G2R corrections

**C1 — Scenario 30 production cross-instance lease evidence**

Scenario 30 now creates two distinct production `WebLocksRunLeasePort` instances over one controlled shared fake Web Locks manager. Two real `IntegratedProductController` runs prove that the first controller holds the production vault lock, the second cannot mutate while that lock is held, and the lock is released for later acquisition. `InMemoryRunLeasePort` is no longer Scenario 30 primary evidence.

**C2 — Scenario 47 runtime-owned notification delivery evidence**

Scenario 47 now initializes `Phase5ProductRuntime` with controlled external boundaries and exercises the runtime-owned controller surface subscription. Ordinary pause/resume surface transitions produce no host notification; a recovery-required transition traverses the runtime-owned `MeaningfulNotificationFilter` and reaches `ProductRuntimeHost.notify`. The primary acceptance path no longer reconstructs that listener/filter wiring in the test.

**C3 — cumulative evidence preservation**

The complete Phase 1–4 cumulative text from `c12350f0ad00a117a7116d529bc04ebedce09352:dev/evidence/_ca-output.md` is restored above without condensation or deletion. Phase 5 is updated after those preserved sections rather than replacing earlier phase evidence.

### Acceptance map

`test/phase5-acceptance-map.test.ts` retains exact scenarios 1 through 50 and source-verifies each primary executable test reference. Rows 30 and 47 now point to the corrected production-path tests described above. The acceptance-map self-check passed in the final G2R gate.

### Final G2R dynamically tested implementation/test checkpoint

Exact SHA:

`3aab3647b57baad7df0b31cc40042325fcfa0e4f`

Authoritative GitHub Actions gate:

- workflow: `Phase 1 CI`;
- run ID: `32854213913`;
- job ID: `97822114191`;
- clean checkout confirmed exact SHA `3aab3647b57baad7df0b31cc40042325fcfa0e4f`;
- `npm ci`: **PASS** — 14 packages installed, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 209 tests / 209 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**.

The actual job log was inspected. Scenario 30 passed as test 169; corrected runtime-owned Scenario 47 passed as test 173; the acceptance-map self-check passed as test 121.

No production source file changed during G2R.

### G2R exact change manifest

Correction-pass compare baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`.

### Created

- none.

### Modified

- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase5-acceptance-map.test.ts`
- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P5.md`
- `dev/evidence/_ca-blocker.md`
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`

### Deleted

- none.

### Remote Branches Deleted

No branches were created or deleted during G2R.

Historical Group D cleanup deleted:

- `agt-stg-2a-phase-1-01`;
- `ca-c1-verification`;
- `master-temp-should-fail`;
- `phase5-fix-group-a`;
- `phase5-fix-group-b`;
- `phase5-fix-group-c`;
- `stage-2a-integration-234`;
- `stage-2a-phase-2-core-sync-state`;
- `stage-2a-phase-3-drive-oauth`;
- `stage-2a-phase-4-obsidian-local`;
- `stage-2a-phase-5-integrated-product`.

Historical cleanup evidence:

- workflow: `Group D Branch Cleanup`;
- run ID: `32805742158`;
- job ID: `97675382231`;
- result: PASS.

Final remote branch enumeration is verified after the evidence-only commits and recorded in the agent handoff. Required state remains exactly `master`.

---

## Current Unavailable Live / Physical Validation

These are **not** recorded as passes:

- real Windows Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real iPhone/iOS Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real-user Google OAuth authentication — `NOT AVAILABLE IN THIS SESSION`;
- deployed Azure callback validation — `NOT AVAILABLE IN THIS SESSION`;
- live production Google Drive synchronization — `NOT AVAILABLE IN THIS SESSION`;
- physical network interruption during transfer — `NOT AVAILABLE IN THIS SESSION`;
- physical disk-full behavior — `NOT AVAILABLE IN THIS SESSION`;
- physical large-vault / large-file stress testing — `NOT AVAILABLE IN THIS SESSION`.

---

## Current Completion State

`COMPLETE WITH NON-BLOCKING FINDINGS`

G2R C1, C2, and C3 are dynamically verified at `3aab3647b57baad7df0b31cc40042325fcfa0e4f`. Phase 5 scenarios 1–50 retain primary executable evidence, including corrected Scenario 30 and Scenario 47 mappings. Remaining findings are the two explicitly preserved stock-iOS fail-closed platform limitations and the live/physical validations marked `NOT AVAILABLE IN THIS SESSION`. No supervisory approval is claimed.

---

## Phase 6 — agt-CA-P6-A-01 — Platform / Local Runtime / Scale / Configuration

### Assignment and baseline

- agent: `agt-CA-P6-A-01`;
- branch: `phase6-a-platform-scale`;
- required Phase 6 supervisory baseline: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- baseline verification: `origin/master` was verified at exactly `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1` before branch creation;
- dynamically tested Phase 5 implementation checkpoint carried forward: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`;
- Stage 3: **NOT PERFORMED**.

The execution environment could not resolve `github.com` for a direct local clone, so repository mutation/inspection used the connected GitHub repository boundary and clean dependency/build/test execution used the repository pull-request CI. This limitation is recorded rather than treating unavailable local execution as a pass.

### Evidence-domain inventory and findings

The current Phase 4/5 tests were inventoried before adding Phase 6 tests. Existing executable evidence already covered bounded range reads without whole-file fallback, malformed/ignored Range rejection, stale source detection between ranges, multi-chunk writes, write-failure preservation of the prior destination, partial enumeration, unreadable/inaccessible observations, hidden/unknown files, empty folders, FileManager move/trash semantics, runtime configuration-directory discovery, selective configuration classification, mobile import isolation, startup/lifecycle behavior, non-destructive disposal, and integrated managed-root/asset-domain scoping.

One confirmed in-scope defect was found:

- `ObsidianLocalVaultAdapter` creates temporary local replacement/staging objects named with `.brain-sync-stage-*` and `.brain-sync-backup-*` markers.
- `LocalExclusionPolicy` did not explicitly exclude those adapter-owned operational artifacts.
- If such an artifact survived interruption or best-effort cleanup, ordinary enumeration could treat it as vault content, contrary to FILE-006 / DEC-177 operational-noise exclusion and the operational-state separation intent.

Repair:

- added narrow default exclusions `**/*.brain-sync-stage-*` and `**/*.brain-sync-backup-*` in `src/local/exclusions.ts`;
- did not add a broad wildcard that would swallow ordinary similarly named user files;
- added `test/phase6-a-local-hardening.test.ts` regression evidence.

No confirmed defect requiring modification of a frozen source surface was found. Therefore there is no `CROSS-BOUNDARY SUPERVISOR REPAIR REQUIRED` finding from Agent A in this wave.

### Applicable target §13 evidence mapping

#### §13.1 Build and platform

- reproducible clean CI dependency installation/build gate: **PASS** in Phase 6 PR CI;
- `manifest.json` declares `isDesktopOnly: false`: automated evidence retained;
- mobile-required source excludes Node/Electron/Windows-only imports, with desktop-only filesystem logic isolated: automated `mobile-safety` evidence retained and passed;
- stock mobile external-reference proof absence remains fail-closed: retained Phase 4 tests passed;
- Windows/iOS path-policy behavior has automated platform-neutral evidence for separators, reserved/invalid names, path length, Unicode and case collisions;
- real Windows Obsidian execution: **NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION**;
- real iPhone/iOS Obsidian execution: **NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION**.

#### §13.4 Local transfer / large vault

- lazy bounded sequential local reads with validated byte ranges and no `readBinary()` fallback: existing production-path tests passed;
- runtime that ignores Range and malformed partial-content evidence fail closed: existing tests passed;
- file change during bounded transfer invalidates the read: existing stale-source test passed;
- local create consumes multi-chunk content incrementally: existing test passed;
- local replacement stages content and restores prior valid content on commit rename failure: existing test passed;
- local write/disk-space-style staging failure leaves prior destination byte-for-byte intact: existing test passed;
- physical disk-full behavior: **NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION**;
- representative physical large-vault / large-file stress and iOS memory behavior: **NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION**.

#### §13.7 Configuration / lifecycle / asset boundary

- active configuration directory is obtained from runtime rather than hard-coded `.obsidian`: existing automated test passed;
- ordinary vault enumeration excludes the active configuration directory: existing automated test passed;
- portable configuration remains explicit allowlist/classifier behavior; unknown third-party configuration is excluded by classification; workspace/device-local data remains local: existing and new Phase 6 tests passed;
- plugin sync operational/auth/device material is protected by configuration policy: existing and new Phase 6 tests passed;
- local adapter disposal/lifecycle handling is non-destructive: existing automated tests passed;
- integrated managed BRAIN Sync root/domain scoping evidence from Phase 5 remained green; Agent A made no product/Drive-scope changes;
- real device unlink/uninstall behavior on supported Obsidian runtimes remains part of physical/live validation rather than being promoted from unit evidence.

#### Path / filesystem safety

Automated evidence passed for separator normalization, Unicode-equivalent collisions, case collisions, reserved/invalid names, path-length preflight, hidden files, empty directories, unknown/opaque extensions, unreadable/inaccessible paths, exclusions, desktop symlink/junction containment, mobile fail-closed containment, FileManager rename/trash semantics, and partial enumeration on unsafe/unavailable subtrees.

The Phase 6 repair adds direct proof that adapter-owned stage/backup artifacts cannot become ordinary sync content after interrupted/best-effort cleanup, while similarly named ordinary user files remain in scope.

### Preserved stock-iOS limitations

Both frozen limitations remain preserved without weakening:

1. stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range reading for every required file type. Production still has **no unsafe whole-file `readBinary()` fallback** and fails closed when valid bounded partial-content behavior is unavailable;
2. stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required guarantee. Generic/mobile behavior still **fails closed** when containment cannot be proven.

Neither limitation is marked resolved.

### Tests added / changed

Created:

- `test/phase6-a-local-hardening.test.ts`

New tests:

1. adapter-owned `.brain-sync-stage-*` and `.brain-sync-backup-*` artifacts are excluded;
2. the new exclusions do not broaden to ordinary similarly named user files;
3. runtime-selected configuration directory retains portable/device-local/unknown/protected classification semantics;
4. cross-platform preflight blocks Unicode/case/reserved/invalid hazards while allowing an opaque unknown extension.

Existing tests were not modified.

### Validation run — implementation/test SHA `57d7dfb417e559921dc83df793713cf0dc9bca49`

Draft PR: `#12` — `phase6-a-platform-scale` -> `master`.

GitHub Actions:

- workflow: `Phase 1 CI`;
- run ID: `32878431422`;
- job ID: `97901903093`;
- PR head SHA: `57d7dfb417e559921dc83df793713cf0dc9bca49`;
- checked-out PR merge SHA: `e64d3a50b67cf29ed8beb438bb2783a51ee31002`;
- `npm ci`: **PASS** — 14 packages installed/audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 213 tests / 213 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- new Agent-A tests: tests 210–213, all **PASS**;
- `npm run build`: **PASS**;
- `npm run check`: **NOT SEPARATELY EXECUTED**; its three component scripts (`typecheck`, `test`, `build`) were each executed and passed in the clean CI job.

No failed build/test run occurred after the Phase 6 code/test changes; therefore there was no failed-run repair cycle to record.

### Physical / live validations

Actually performed by Agent A in this session:

- none.

Not executed and not claimed as passes:

- real Windows Obsidian synchronization — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- real iPhone/iOS Obsidian synchronization — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- physical disk-full behavior — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- physical large-vault / large-file stress behavior and representative iOS memory measurement — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`.

Recommended physical validation captures for the supervisor/Stage 3 preparation: exact Obsidian/plugin versions and device/OS, vault corpus/file-size profile, operation/preview observed, interruption/failure injection method, resulting local bytes/paths and status, memory/disk observations where applicable, and pass/fail against the target requirement. No fabricated timings, screenshots, or resource measurements are recorded here.

### Exact Agent-A change inventory through implementation/test checkpoint

Created:

- `test/phase6-a-local-hardening.test.ts`

Modified:

- `src/local/exclusions.ts`

Deleted:

- none.

Frozen production surfaces were not modified.

### Remaining findings / blockers

- the two frozen stock-iOS limitations remain fail-closed and require no weakening repair;
- real Windows/iPhone and physical stress/failure evidence remains outstanding as explicitly required physical validation;
- no Agent-A cross-boundary production defect was confirmed during this assignment.

### Branch / PR status

- branch pushed through connected GitHub writes: `phase6-a-platform-scale`;
- draft PR: `#12`, targeting `master`, intentionally unmerged;
- evidence-bearing final branch SHA is recorded in the final worker handoff after this evidence commit and follow-up CI observation, avoiding a self-referential SHA claim inside the commit that creates that SHA;
- Stage 3 was **NOT PERFORMED**.

### Agent-A completion status

`COMPLETE WITH NON-BLOCKING FINDINGS`
