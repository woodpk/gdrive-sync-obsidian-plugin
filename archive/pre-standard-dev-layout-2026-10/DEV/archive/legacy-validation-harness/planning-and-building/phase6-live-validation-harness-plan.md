# Phase 6 Live Validation Harness Plan

## 1. Status, Authority, and Purpose

**Status:** Approved planning baseline; implementation not yet dispatched  
**Project:** `woodpk/gdrive-sync-obsidian-plugin`  
**Stage:** Stage 2A / Phase 6 — Cross-Platform Hardening and Stage 3 Readiness  
**Date:** 2026-09-15  
**Primary scope:** Automate the existing live-validation scenarios from C03 through F03 on real Windows and mobile Obsidian runtimes.

This document persists the approved plan for an internal BRAIN live-validation harness. It does not redefine product behavior, synchronization semantics, or the existing C03–F03 acceptance contracts. The harness exists to execute those contracts faster, more deterministically, and with stronger evidence collection.

Governing authority remains, in order:

1. user product authority and later explicit user decisions;
2. `target-system-specification.md`;
3. `decision-register.yaml`;
4. `build-decomposition.md`;
5. approved Phase 6 synchronization architecture/frozen contracts;
6. the current C03–F03 live-validation scenario files and shared protocol;
7. the actual repository state and accepted evidence.

Detailed coding-agent tasking prompts are intentionally not included here. They must be generated later against the actual repository state that exists when implementation begins.

---

## 2. Approved Validation Strategy

The remaining C03–F03 live-validation program will be automated primarily by a test harness implemented inside the BRAIN Obsidian plugin/runtime rather than by Appium or another external mobile UI-automation platform.

The harness MUST:

- run on the actual supported Obsidian runtimes, including Windows desktop and the currently active iPhone or iPad mobile device;
- drive the existing production planning, execution, local-vault, state, and Google Drive boundaries rather than implement a second synchronization engine;
- create and manipulate only explicitly designated disposable validation fixtures and disposable validation state/remotes where a scenario requires them;
- derive PASS/FAIL/BLOCKED from objective assertions and recorded evidence, not from optimistic UI assumptions;
- preserve the existing live-validation rule that an unexpected plan, destructive action, conflict, duplicate, blocked condition, or recovery condition causes a fail-closed stop unless that condition is the scenario's expected result;
- automatically capture the evidence required to reconstruct the scenario and its synchronization runs;
- support deterministic pause/resume around the small number of genuine OS-bound actions that code running inside Obsidian cannot credibly perform on itself;
- remain unavailable to ordinary synchronization execution unless explicit validation mode is enabled.

External UI automation such as Appium is not required for this plan. It may be reconsidered only by a later explicit decision if a material validation requirement cannot be satisfied with the internal harness plus bounded human checkpoints.

---

## 3. Non-Negotiable Safety Boundaries

### 3.1 No Alternate Sync Engine

The harness MUST NOT implement, duplicate, or shadow synchronization policy. Scenario execution must call the same production planner, authoritative execution path, state authority, local-vault boundary, and Google Drive synchronization seams used by the real product.

Harness code may provide test-only orchestration, assertions, fixtures, deterministic fault adapters, coordination, and evidence collection. It may not invent a second path that would allow a scenario to pass while production synchronization would fail.

### 3.2 Test-Only Authority

Harness-only controls MUST be gated behind explicit validation mode and disabled by default. No ordinary startup, manual sync, automatic sync, recovery action, or user workflow may accidentally enter harness execution.

Harness fault controls, direct fixture setup, validation coordination records, and test-state manipulation are not product synchronization authority and MUST NOT become callable production bypasses.

### 3.3 Disposable-Scope Enforcement

Every harness mutation MUST be provably constrained to one of:

- a generated disposable vault fixture owned by the active validation run;
- a dedicated disposable validation vault/state copy;
- a dedicated disposable validation remote where the scenario explicitly requires remote-root/state manipulation;
- harness coordination/evidence metadata that is logically excluded from ordinary vault-content synchronization.

If scope cannot be proven, the harness MUST refuse the mutation.

The harness MUST never intentionally mutate unrelated BRAIN content, the canonical external BRAIN asset repository, authentication secrets, or authoritative production state merely to manufacture a scenario.

### 3.4 Fail-Closed Scenario Execution

Before executing a synchronization plan, the harness MUST assert that the observed plan matches the scenario's allowed action set and expected safety classification. An unexpected operation causes the scenario to stop and preserve evidence before mutation.

### 3.5 No Unsupported Background Assumptions

The harness MUST NOT assume true iOS/iPadOS background execution. Mobile work executes while Obsidian is active. Durable scenario checkpoints must permit safe resumption after suspension, termination, device switching, charging, or ordinary interruption.

---

## 4. Modular Harness Architecture

The implementation is intentionally decomposed by single responsibility. Concrete source paths and type names remain repository-grounded implementation decisions.

### 4.1 Validation Scenario Runner

**Responsibility:** Own the scenario state machine and scenario lifecycle.

It must:

- enumerate supported scenario IDs C03–F03;
- start one scenario or an ordered suite;
- persist scenario/run identity and current step;
- enforce prerequisites and stop conditions;
- invoke other harness modules rather than perform their responsibilities itself;
- support PASS, FAIL, BLOCKED, PAUSED-HUMAN-ACTION, and RESUMABLE terminal/intermediate states;
- resume deterministically after Obsidian restart or a permitted device interruption.

It must not implement filesystem, Drive, planner, verification, fault, or evidence semantics directly.

### 4.2 Validation Safety Sandbox

**Responsibility:** Prove and enforce the mutation boundary for the active validation run.

It must:

- issue run-scoped fixture identities/namespaces;
- distinguish ordinary BRAIN content from disposable harness-owned content;
- authorize or reject setup/cleanup mutations;
- prevent harness operations outside explicitly approved disposable surfaces;
- block cleanup if identity/ownership is ambiguous;
- retain enough provenance to prove what the harness created and what it may remove.

### 4.3 Fixture Manager

**Responsibility:** Create, edit, move, delete, hash, restore, and clean up deterministic validation fixtures.

It must support text, binary/opaque, empty-folder, large-file, exclusion/path-collision, deletion, and multi-version fixtures required by C03–F03. Fixture generation must be deterministic enough that expected bytes/hashes can be asserted without embedding private vault content in logs.

### 4.4 Production-Path Driver

**Responsibility:** Invoke the real product synchronization path from harness orchestration.

It must:

- request production planning/preview through the existing product boundary;
- obtain the actual plan and product status;
- submit an asserted/reviewed plan through the existing authoritative execution path;
- request Verify/Reconcile or ordinary sync using the same production semantics applicable to the scenario;
- observe production run lifecycle without manufacturing success state.

It must not directly mutate synchronization authority to make a scenario pass.

### 4.5 Plan Assertion Engine

**Responsibility:** Compare an observed production plan with the scenario contract before execution.

It must assert, as applicable:

- exact expected operation kind(s);
- allowed no-op background set;
- expected/forbidden conflict state;
- expected/forbidden destructive operations;
- expected path/object identity and move semantics;
- expected safety/review disposition;
- absence of unrelated mutations.

Unexpected plan content is a hard stop with evidence capture.

### 4.6 Cross-Device Coordinator

**Responsibility:** Coordinate the Windows participant and one active mobile participant without an external automation service.

The coordinator must:

- assign run ID, scenario ID, device roles, and step ownership;
- coordinate handoffs between Windows and mobile participants;
- tolerate normal network delay and app suspension;
- never require an additional OAuth scope or developer-hosted backend;
- keep coordination metadata logically outside ordinary synchronized vault content;
- avoid interpreting coordination records as synchronization evidence for the content under test;
- detect mismatched/stale run IDs and fail closed rather than allowing two scenarios to interfere.

The exact coordination transport is an implementation decision to be selected after repository inspection. A Drive-backed validation-control record is permitted only if it remains within existing authorization, is explicitly excluded from ordinary vault-content planning, and cannot contaminate the scenario's synchronization authority.

### 4.7 Deterministic Fault-Injection Layer

**Responsibility:** Create repeatable failure conditions at existing testable boundaries without changing production safety semantics.

Permitted test-only adapters may inject or expose named fault points for:

- response loss after a real remote mutation may have occurred;
- partial remote enumeration/completeness failure;
- network/offline transport failure;
- authentication-required/invalid-auth responses;
- rate-limit and quota-style failures;
- cancellation timing;
- approved disposable state/cursor corruption/loss;
- other already-specified C03–F03 failure conditions where the fault can be introduced at a boundary without falsifying physical authority.

Fault injection MUST preserve the distinction between simulated cause and real physical effect. In particular, an injected operational error may never fabricate "verified not applied" or "verified success" when physical reality is uncertain.

Fault controls must be impossible to activate during ordinary product use.

### 4.8 State and Convergence Verifier

**Responsibility:** Determine whether the post-condition actually satisfies the scenario.

It must verify, as applicable:

- local bytes/hash/path on each participant;
- remote bytes/hash and stable Drive identity;
- expected live/trash/absence state;
- BASE/common authority;
- mappings and tombstones;
- semantic/persistence generations or revisions;
- outstanding durable intent/effect state;
- change cursor/completeness state;
- conflict copies/provenance;
- absence of unrelated mutation;
- terminal product/run result;
- final cross-device convergence.

The verifier must distinguish "not observable" from PASS. Missing required proof yields FAIL or BLOCKED according to the scenario contract.

### 4.9 Evidence Recorder

**Responsibility:** Produce one coherent machine-readable and human-readable evidence package for each scenario/run.

It must capture, where available:

- build/version/platform/device/run/scenario identity;
- pre/post diagnostic snapshots;
- fixture identity, size, and hashes;
- expected and actual plans/action counts;
- operation, intent, effect, request, and remote object IDs;
- relevant state/semantic revisions;
- elapsed planning/execution observations;
- injected fault/checkpoint history;
- human checkpoint acknowledgements;
- final PASS/FAIL/BLOCKED classification with failed assertions;
- evidence integrity hashes.

Evidence must obey existing diagnostic privacy rules and must not contain credentials or full private note/binary content.

### 4.10 Human Checkpoint / Resume Controller

**Responsibility:** Formalize the approved small set of external actions that cannot be credibly performed by code running inside Obsidian.

It must:

- pause at a named checkpoint only when the scenario requires a real external action;
- display one precise requested action;
- persist enough non-secret run state for safe resumption;
- verify the expected external condition where technically observable before continuing;
- time out or remain safely paused rather than guessing completion;
- survive app restart and, where the scenario requires uninstall/reinstall, recover from an external non-secret coordination/checkpoint record.

---

## 5. Mobile Device Policy

For Phase 6 live validation, **iPhone and iPad are interchangeable mobile participants** unless a scenario explicitly depends on a capability unique to one device class.

Rules:

- the active mobile participant is selected at scenario start and recorded in evidence;
- either iPhone or iPad may satisfy the mobile role for ordinary C03–F03 behavior;
- battery/charging-driven switching between devices is allowed between safely checkpointed scenario steps;
- one mobile participant owns a run step at a time unless a future scenario explicitly requires multiple simultaneous mobile devices;
- switching devices must not cause two installations to share one device identity or stale run authority;
- the harness must record which physical installation/device identity performed each step.

This policy changes validation operation only; it does not broaden or redefine the product's target-platform contract.

---

## 6. Human Checkpoint Policy

The goal is not "zero taps at any cost." The goal is to automate everything the plugin can test credibly and leave only genuine OS/provider-bound actions to the human operator.

### 6.1 D05 — Real Offline / Reconnect

The harness may automate fixture setup, assertions, Windows-side activity, detection, synchronization, and post-condition verification. For the real-network subcase it pauses for the operator to disable/restore mobile connectivity if the platform does not expose a trustworthy programmatic mechanism.

### 6.2 D06 — Actually Stale Device

The harness may orchestrate and verify the stale-device scenario, but it must not forge production authority merely to make a device look stale. If the configured stale condition cannot be safely reached/induced under the scenario's existing rules, the result remains `BLOCKED — STALE CONDITION NOT SAFELY INDUCIBLE`.

### 6.3 E01 — Process Interruption / Restart

The harness prepares a large-enough disposable operation, advances to a deterministic in-flight checkpoint, records durable run state, and pauses for the operator to terminate Obsidian. On restart it automatically resumes evidence collection and recovery verification. The harness must not substitute an internal exception for proof of genuine process termination when the scenario requires actual restart behavior.

### 6.4 E06 — Real Authentication Restoration

Transport/auth failure semantics may be exercised deterministically through the fault layer. When the live scenario requires genuine token revocation/re-authentication or system-browser authorization, the harness pauses for that external action and resumes once production authentication state confirms recovery.

### 6.5 F03 — Disable / Uninstall / Reinstall / Unlink

The harness captures pre-state/evidence and pauses before each lifecycle action. The operator performs the actual disable/uninstall/reinstall or unlink step. The run resumes from non-secret durable checkpoint/coordination data after the plugin is available again. The harness then verifies that local/shared content and remote identity remained safe.

No external UI-automation platform is required solely to eliminate these bounded checkpoints.

---

## 7. C03–F03 Scenario Automation Matrix

Every existing package remains authoritative for its behavioral PASS/FAIL contract. The classifications below describe only how the harness executes it.

| Scenario | Harness mode | Primary automated responsibility |
| --- | --- | --- |
| C03 | Full | Mobile edit → production sync → Windows `download-update`; byte/hash, identity, state and unrelated-change assertions. |
| C04 | Full | Mobile rename/move → identity-preserving remote/Windows move; stable Drive ID and old-path absence. |
| C05 | Full | Mobile delete → attested remote trash → recoverable Windows deletion; tombstone/authority verification. |
| C06 | Full | Windows create → remote → mobile `download-create`; single remote object and byte/hash convergence. |
| C07 | Full | Windows edit → mobile `download-update`; verified replacement and no unrelated mutation. |
| C08 | Full | Windows move → remote identity-preserving move → mobile move; no delete/create substitution. |
| C09 | Full | Windows delete → exact remote trash → recoverable mobile deletion; tombstone convergence. |
| D01 | Full | Establish common BASE, apply non-overlapping concurrent text edits, drive both sides, verify clean three-way merge and exact-once combined content. |
| D02 | Full | Produce overlapping concurrent text edits, assert preserved conflict, exercise one supported resolution, verify both originals remain recoverable until resolution and final convergence. |
| D03 | Full | Deterministic binary variants from common BASE, verify both complete byte versions survive and conflict provenance is surfaced. |
| D04 | Full | Execute delete-vs-modify in both directions with clean BASE restoration between subcases; verify modification survives. |
| D05 | Hybrid | Automate scenario around a real offline/reconnect checkpoint; verify both independent changes survive and converge. |
| D06 | Automated-or-BLOCKED | Orchestrate an actually stale device without forging authority; verify no resurrection/destructive stale authority, or retain the scenario's defined BLOCKED result. |
| E01 | Hybrid | Deterministic in-flight checkpoint + human process termination/restart + automatic recovery/convergence verification. |
| E02 | Full | Drop/withhold client result after a real remote mutation may have occurred; verify uncertainty, re-observation, no duplicate/overwrite, and commit only after verification. |
| E03 | Full | On disposable validation state only: corrupt/truncate authority, then separately lose cursor through approved harness seam; verify fail-closed recovery/full reconciliation and no deletion inference. |
| E04 | Full | Inject incomplete enumeration; separately make a disposable paired remote root unavailable/trashed; verify no absence deletion and critical recovery/no silent replacement. |
| E05 | Full | Populate disposable scale above destructive threshold, generate bulk deletion, preview/assert block only; never approve the destructive plan. |
| E06 | Hybrid | Deterministic offline/auth/rate/quota failure semantics plus bounded real-auth checkpoint where required; verify safe defer/retry and recovery. |
| E07 | Full | Start reviewed active work, issue real supported cancellation at deterministic active point, verify no new work begins and later reconciliation converges. |
| F01 | Full | Opaque binary, empty folder, exclusion symmetry, and source-platform-permitted case/Unicode/invalid-path subcases; verify blocking rather than overwrite. |
| F02 | Full | Deterministic large file both directions, exact hashes, no partial final file, bounded concurrency/resource evidence, elapsed observations. |
| F03 | Hybrid | Automated pre/post verification around disable/uninstall/reinstall/unlink human checkpoints; verify local/shared data and remote identity safety. |

"Full" means no planned human step beyond starting/authorizing the harness run and keeping the participating applications available as required. It does not mean the harness may bypass production safety gates.

---

## 8. Cross-Device Execution Model

### 8.1 Roles

Each cross-device run has:

- `controller` — normally Windows for orchestration/evidence aggregation unless a scenario dictates otherwise;
- `mobile-participant` — the active iPhone or iPad installation;
- optional scenario-specific temporary/disposable validation remote or state copy.

Role assignment is run-scoped and must not alter the product's synchronization authority model.

### 8.2 Run Identity

Every run must have a cryptographically strong or equivalently collision-resistant run identifier. All coordination, fixture, fault, checkpoint, and evidence records bind to that run ID and scenario ID.

A participant receiving a stale/mismatched run message must ignore it and report the mismatch; it must not infer that the other device has completed work.

### 8.3 Durable Coordination

Coordination must be resumable. At minimum the run state records:

- scenario ID;
- current step;
- owning participant;
- expected next event;
- fixture IDs/paths and safe-sandbox ownership;
- checkpoint state;
- evidence references;
- terminal classification.

No credentials, OAuth tokens, private note contents, or unrestricted mutation authority may be stored in coordination records.

---

## 9. Deterministic Fault Model

Fault injection exists to exercise production recovery semantics, not to fake successful outcomes.

### 9.1 Required Properties

Every injected fault must be:

- explicitly named and scenario-bound;
- deterministic/reproducible where feasible;
- observable in harness evidence;
- injected at a boundary whose semantics are understood;
- disabled outside validation mode;
- incapable of manufacturing stronger physical certainty than the real boundary provides.

### 9.2 Physical-Reality Rule

If a real Google Drive mutation was dispatched before an injected response loss, the harness must allow the production system to classify the effect as uncertain and then observe Drive reality. The injector must never rewrite that condition into a definite failure or definite success merely for test convenience.

### 9.3 State Manipulation Rule

Direct state/cursor manipulation is permitted only where the existing scenario explicitly calls for it and only against a disposable validation vault/state copy or approved disposable validation remote. The harness must create a backup/checkpoint first and retain evidence of the exact manipulation.

---

## 10. Evidence and Verdict Contract

Each scenario produces one canonical result record containing:

- scenario/run/device/build identity;
- prerequisite state;
- fixture manifest;
- pre-run evidence hash;
- expected plan contract;
- observed plan;
- execution/fault/checkpoint timeline;
- post-run verification assertions;
- post-run evidence hash;
- PASS/FAIL/BLOCKED verdict;
- exact failed assertion(s) or blocking reason when not PASS.

A scenario cannot PASS solely because the UI appeared normal or because an API returned success. Required postconditions must be independently observed through the state/convergence verifier.

The harness should additionally support a suite-level summary that aggregates C03–F03 without erasing per-scenario evidence.

---

## 11. Build Decomposition for the Harness

This is a Phase 6 implementation decomposition, not a replacement for the authoritative Stage 1 product build decomposition.

### H0 — Repository Grounding and Harness Contract Foundation

Sequential prerequisite.

Establish the minimal harness contracts/interfaces needed by all modules after inspecting the current repository. Freeze:

- scenario/result/checkpoint vocabulary;
- validation run identity;
- sandbox authorization model;
- production-path driver boundary;
- plan assertion input/output;
- fault specification/result semantics;
- verifier assertion/result semantics;
- evidence schema;
- cross-device coordination message/state semantics.

Do not change frozen production synchronization contracts merely to simplify the harness.

### H1 — Safety Sandbox and Fixture Subsystem

Depends on H0. Own validation-scope authorization plus deterministic fixtures. Must prove it cannot mutate outside harness-owned disposable surfaces.

### H2 — Production Driver and Plan Assertions

Depends on H0. Own production planning/execution invocation and pre-execution plan-contract assertions. Must not duplicate planner policy.

### H3 — State Verifier and Evidence Recorder

Depends on H0. Own objective postcondition verification and scenario evidence production.

### H4 — Fault-Injection Adapters

Depends on H0. Own deterministic test-only failures and fault evidence. Must preserve physical uncertainty and remain unreachable in ordinary use.

### H5 — Cross-Device Coordination and Checkpoint/Resume

Depends on H0. Own Windows/mobile handoff, durable scenario coordination, mobile-device switching boundaries, and external human checkpoint resumption.

H1–H5 may be implemented in parallel only after H0 freezes their shared contracts and their writable surfaces are proven independent.

### H6 — Harness Core Integration

Depends on H1–H5. Integrate the scenario runner with all modules. Prove one small canary scenario end-to-end on desktop fakes/local test doubles and verify validation mode cannot leak into ordinary product behavior.

### H7 — C-Series Scenario Package

Depends on H6. Implement C03–C09 scenario definitions/adapters against the frozen harness contracts.

### H8 — D-Series Scenario Package

Depends on H6. Implement D01–D06, including real-offline checkpoint semantics and the no-forged-stale-authority rule.

### H9 — E-Series Scenario Package

Depends on H6. Implement E01–E07, including restart checkpoints, ambiguous-result injection, disposable state/cursor manipulation, coverage failure, circuit-breaker preview, operational failures, and cancellation.

### H10 — F-Series Scenario Package

Depends on H6. Implement F01–F03, including cross-platform path cases, large-transfer evidence, and lifecycle checkpoint/resume.

H7–H10 may proceed in parallel if their scenario files and helper ownership do not overlap. Shared scenario helpers belong in the H0/H6 harness layer rather than being independently redefined by scenario agents.

### H11 — Integrated Verification and Real-Device Canary

Depends on H7–H10. Verify the complete harness on the actual integrated build. Required gates include:

- typecheck/build/repository checks;
- existing production automated suites unchanged/green;
- harness-unit and harness-integration tests;
- validation-mode isolation tests;
- disposable-scope negative tests;
- fault-injection isolation tests;
- evidence-schema checks;
- one Windows/mobile real-device canary before running the entire C03–F03 suite.

No C03–F03 scenario may be declared passed merely because its harness implementation exists.

---

## 12. Acceptance Criteria for the Harness Build

The harness build is ready to replace the remaining repetitive manual validation only when all of the following are true:

1. All C03–F03 scenario IDs exist and map one-to-one to the existing live-validation package contracts.
2. The harness reuses production planning/execution/state/Drive/local-vault paths and contains no alternate synchronization algorithm.
3. Ordinary product execution cannot enable harness faults or sandbox bypasses.
4. The safety sandbox blocks non-disposable mutations, with negative tests proving the boundary.
5. Unexpected plans stop before execution and preserve evidence.
6. Cross-device coordination survives ordinary delay, suspension, and restart without duplicate scenario execution.
7. iPhone/iPad mobile-role switching is safe only at explicit durable checkpoints and is recorded in evidence.
8. Fault injection preserves real physical uncertainty and cannot fabricate authoritative success/not-applied results.
9. E01/F03 checkpoint resumption works across plugin/app lifecycle transitions as required.
10. Evidence records contain the fields needed by the shared live-validation protocol without leaking credentials/private payloads.
11. Existing production test suites, typecheck, build, and repository checks remain green.
12. A real-device canary proves the harness actually invokes the installed production path on Windows and mobile before the remaining suite is entrusted to it.

---

## 13. Operational Use After Build

Preferred operator workflow:

1. Install the harness-capable validation build on Windows and the active iPhone or iPad.
2. Explicitly enable validation mode on participating devices.
3. Select a single scenario or `C03–F03` ordered suite.
4. Let the harness perform fixture setup, synchronization, assertions, evidence capture, and cleanup.
5. Respond only to named external human checkpoints.
6. Review the generated PASS/FAIL/BLOCKED report and retain canonical evidence.
7. Stop immediately on an unexpected mutation, authority defect, safety-boundary failure, or evidence contradiction.

The harness should make manual screenshots/log export exceptional rather than routine.

---

## 14. Immediate Planning State

- The user has approved this internal-harness strategy.
- Appium is not part of the planned solution.
- The modular boundaries and human-checkpoint approach above are approved as the planning baseline.
- No coding-agent implementation prompt has yet been authorized or dispatched under this plan.
- The next construction step, after this planning update is reviewed, is repository-grounded H0 task decomposition/tasking against the actual current Phase 6 integration state.
