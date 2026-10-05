# BVP-S08F — Platform Construction Closure and Production-Bundle Isolation

## 0. Status

**Prompt maturity:** BOUND / EXECUTABLE — PLATFORM CONSTRUCTION ONLY  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08E  
**Task branch:** `bvp-s08f-desktop-live-canary`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

## 0.1 User Scope Correction — Authoritative

The software under construction in BVP-S08 is the **BRAIN Verification Platform (BVP)** itself.

BVP-S08 does **not** authorize using the BVP to perform real physical product validation against Obsidian, Google Drive, a live vault, or the BRAIN synchronization product.

The earlier S08F desktop-live-canary / physical-recovery direction is superseded for S08. Historical physical evidence remains historical only and MUST NOT be used as S08 acceptance authority.

Physical Windows/iOS/Obsidian/provider execution belongs to BVP-S09.

## 0.2 Authoritative Construction Boundary

Accepted S08E implementation:

- implementation SHA: `e1067f5159a316f328c492837b8c6ff59e08d226`;
- accepted S08E closure/base: `4f9c69c38c12c09d2f06f3f966dc8519ed45a99f`;
- accepted S08A-E capabilities:
  - production run-receipt seam;
  - validation-only Obsidian build entrypoint;
  - bounded device-command agent and sequence safety;
  - command mailbox and Windows relay;
  - single external scenario runner with live executor seam;
  - human-checkpoint representation;
  - validation-artifact construction;
  - architecture guard / metrics / shipping-isolation enforcement.

Current PHX-CI framework pin remains whatever the exact target branch's `phx-ci.json` specifies at execution time.

## 1. Objective

Close BVP-S08 by proving that the **testing-platform software** constructed in S08A-E is internally coherent, bounded, architecture-compliant, and ready to be used later by S09.

This task validates the BVP implementation itself.

It does **not** validate synchronization-product behavior against a real Obsidian runtime.

## 2. Required End State

BVP-S08 is complete when PHX-CI establishes all of the following from repository-controlled automated checks:

1. the validation-only build can be constructed deterministically;
2. the bounded device-command agent accepts valid run/device/sequence identities and rejects duplicate, stale, wrong-run, and wrong-device inputs as specified by its own contract;
3. mailbox / relay behavior is bounded and does not become scenario or synchronization authority;
4. the external live executor maps supported generic scenario steps into the bounded command protocol without owning scenario order or final verdict;
5. human-checkpoint persistence/resume semantics remain bounded and deterministic;
6. production-run receipt correlation and terminal-authority semantics remain correctly represented at the BVP seam;
7. validation-only code remains excluded from the ordinary production bundle;
8. the architecture guard and metrics remain within frozen budgets;
9. the full repository test/build/repository-check/artifact gates pass under PHX-CI;
10. no physical product execution is required to establish S08 completion.

## 3. Explicit Non-Goals / Prohibitions

BVP-S08F MUST NOT:

- launch, close, restart, automate, or attach to `Obsidian.exe`;
- use Chrome DevTools Protocol or any Obsidian renderer-control mechanism;
- install a validation artifact into a real Obsidian vault;
- create, mutate, inspect, or clean up a real or disposable vault for acceptance;
- authenticate to Google Drive;
- create, pair, inspect, or mutate a real managed remote;
- perform real synchronization, preview, execute, reconcile, upload, download, move, delete, or conflict behavior;
- claim Windows/iOS/Obsidian/provider product behavior from S08;
- reuse historical S08F physical-canary state as S08 acceptance evidence;
- modify production synchronization behavior merely to make a physical test pass;
- begin S09 physical coverage.

## 4. Automated Platform Verification Scope

PHX-CI may execute or coordinate existing repository-controlled automated checks covering:

- S08A run-receipt seam contract tests;
- S08B validation-build construction and production-bundle exclusion tests;
- S08C command-agent identity, sequencing, duplicate, and stale-command tests;
- S08D mailbox / relay safety and boundedness tests;
- S08E external-executor, checkpoint, correlation, fail-closed unsupported-capability, and validation-bundle tests;
- deterministic runner / evidence regressions required to prove the S08E executor seam did not alter accepted deterministic behavior;
- architecture guard;
- architecture metrics;
- TypeScript compilation;
- full repository test suite;
- ordinary production build;
- PHX-CI artifact verification;
- PHX-CI repository checks.

If those existing tests expose a genuine defect in BVP implementation, repair only the smallest authorized BVP surface required and re-verify through PHX-CI.

## 5. Writable Surface

Default writable paths for S08F closure work:

- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`;
- `dev/planning-and-building/project-state.yaml`;
- `dev/planning-and-building/decision-register.yaml`;
- `dev/planning-and-building/supervisor-continuity-log.md`;
- BVP-owned automated tests under `test-platform/test/**` only when necessary to close an identified platform-coverage gap.

No production `src/**` file is writable by default.

No physical-validation PowerShell, Obsidian/CDP automation, vault-management helper, task-specific validator, or standalone verifier is authorized.

Any required production change or new BVP runtime implementation requires explicit supervisor re-grounding based on a demonstrated BVP construction defect, not a physical-product failure.

## 6. PHX-CI Authority

All executable validation is PHX-CI-owned under the current Agent-Led Software Engineering Operating Protocol.

Do not use GitHub Actions.

Do not create standalone validators or manual validation command sequences.

Do not ask the owner to operate Obsidian or Google Drive for S08 acceptance.

## 7. Historical S08F Physical Evidence

The existing directory:

`dev/evidence/2026-10-02-BVP-S08F-4f9c69c/**`

contains historical evidence from the superseded premature physical-execution attempt.

For S08:

- it is non-authoritative;
- it does not need to be resumed;
- its run IDs and physical state MUST NOT be replayed;
- its product defects / environment blockers are not S08 acceptance blockers;
- it may be consulted only as history;
- any future decision to reuse relevant observations belongs to S09 re-grounding.

## 8. Acceptance Criteria

S08F passes when:

- authoritative PHX-CI passes against the corrected S08 candidate;
- all required automated BVP platform checks execute and pass;
- architecture guard reports no violations;
- architecture metrics remain within frozen limits;
- ordinary production artifact remains free of BVP runtime/scenario/relay/agent code;
- no real Obsidian/Drive/vault/product execution was needed for the verdict;
- repository evidence makes the S08/S09 boundary explicit.

## 9. Handoff

On S08F PASS:

1. perform S08V integrated S08 acceptance and architecture review;
2. close BVP-S08 as testing-platform construction;
3. only then bind BVP-S09 for physical Windows/iOS/Obsidian/provider validation using the completed platform.

Do not begin S09 inside this task.

Stop at:

`READY FOR S08V INTEGRATED ACCEPTANCE`
