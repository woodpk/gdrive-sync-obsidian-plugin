# BVP-S07B — State, Cursor, Listing, and Remote-Root Recovery Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** architecture-reviewed S07B prerequisite closure `3bdb68172a5d5791ad10fd42decd5a06d6468a82`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Grounding Blocker / Prerequisite

Repository grounding against accepted S07A closure `62b91e21d8d9be43f98a0e4cdd49081b750e13dc` found that S07B cannot yet express all required deterministic recovery faults through the frozen declarative DSL.

The underlying state corruption/truncation/incompatible-schema controls and cursor invalidation already exist. Partial listing/change completeness is already exposed. Managed-root validation already distinguishes missing/mismatch/incompatible states, but the virtual Drive core lacks a deterministic external root mutation control.

Bounded prerequisite:

`07b-prerequisite-state-cursor-root-controls.md`

Prerequisite branch:

`bvp-s07b-prereq-state-cursor-root-controls`

S07B proper remains frozen until that prerequisite is accepted and architecture-reviewed.

## 0.2 Cursor-Path Invocation Blocker / Final Prerequisite

After acceptance of the state/cursor/root fault-control prerequisite, repository grounding found one remaining capability gap: the frozen declarative `synchronize` step is intentionally implemented through reviewed `previewManual()` + execution and therefore performs a full/manual plan. It cannot prove that an invalid persisted Drive cursor is detected by the production incremental path.

Production already exposes `ProductController.runAutomatic(...)` and `currentSurface()`. A final micro-prerequisite is authorized to expose that existing path as one generic declarative production operation without changing the meaning of `synchronize`:

`07b-prerequisite-automatic-incremental-sync.md`

Branch:

`bvp-s07b-prereq-automatic-incremental-sync`

The prerequisite is limited to <=6 net framework-core LOC, preserving the 4,000-LOC frozen ceiling. S07B proper remains blocked until this prerequisite is accepted and architecture-reviewed.

## 0.3 Final Dispatch Binding

S07B proper is now **BOUND / EXECUTABLE** after acceptance and architecture review of both required generic prerequisites.

- exact predecessor / PHX-CI base: `3bdb68172a5d5791ad10fd42decd5a06d6468a82`;
- task branch: `bvp-s07b-state-cursor-listing-root-recovery`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework core baseline: 3,996 / 4,000 logical TypeScript LOC / 10 runtime modules;
- production source baseline: 16,668 LOC;
- approved production seam baseline: 113 LOC / 1 file;
- scenario baseline: 45 scenarios / 952 logical LOC;
- BVP PowerShell baseline: 4 scripts / 1,477 logical LOC;
- production artifact baseline: `main.js` 880,512 bytes, SHA-256 `cee1da879b4c5c73894cb7dee84e55ea434f9dd66a54f59174d9893657f7a860`.

Accepted generic controls now available:

- `fault-device-state` for corrupt checksum, truncation, and incompatible schema;
- `invalidate-change-cursor`;
- `set-remote-listing-completeness`;
- `set-remote-change-completeness`;
- `fault-managed-root` for missing, identity mismatch, and incompatible protocol;
- `production:automatic-sync` for the real existing incremental production path;
- existing `synchronize` remains reviewed full/manual synchronization;
- existing `reconcile` remains explicit full Verify/Reconcile.

Current production classifications / safety behavior grounded from accepted code:

- corrupt/truncated/incompatible authoritative state loads as `recovery-required`;
- recovery reconstruction requires complete LOCAL + REMOTE observation and projects current reality as an uninitialized safe union, never an empty trusted BASE;
- invalid/lost cursor through reliable Changes returns `recovery-required`;
- incomplete change page through reliable Changes returns `recovery-required`;
- REMOTE absence under partial full enumeration becomes planner `blocked-unsafe` / `remote-enumeration-incomplete`, never deletion authority;
- managed-root `missing-root`, `identity-mismatch`, and `incompatible-protocol` map to production recovery-required status and yield no reviewable production plan.

Requirement mappings:

- state faults: `STATE-011`, `STATE-012`, `STATE-013`, `STATE-015`, `INV-001`;
- cursor loss: `CHANGE-005`, `CHANGE-006`;
- incomplete coverage: `CHANGE-007`, `INV-002`;
- managed-root authority: `REM-002`, `REM-007`, `REM-008`.

Writable implementation allowlist for S07B proper:

- `test-platform/scenarios/07b/*.ts`;
- `test-platform/test/s07b-state-cursor-listing-root-recovery.test.ts`;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

S07B proper has zero authority to modify platform core, production, production seam, PowerShell, PHX-CI, persistence, governance, or architecture code.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07b-state-cursor-listing-root-recovery.test.js`

## 1. Objective

Add declarative deterministic coverage for fail-closed recovery from corrupt/incompatible durable state, lost/invalid change cursors, incomplete remote coverage, and loss/replacement of the managed remote root.

## 2. Required End State

Executable scenarios cover:

- corrupt durable synchronization state;
- truncated durable state;
- incompatible/unsupported state version;
- lost/invalid remote change cursor;
- incomplete/partial listing/change coverage;
- managed remote root missing/unavailable;
- managed remote root identity changed/replaced where the product contract distinguishes it;
- safe recovery/reconciliation signaling without destructive inference.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07A predecessor SHA;
- task branch;
- current state/cursor/root recovery requirements and production classifications;
- accepted S04 state/change-feed/root simulation controls;
- exact scenario/fixture/test writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

No new recovery subsystem is authorized.

## 4. Required Semantics

### 4.1 Corrupt/truncated/incompatible state

Unreadable or incompatible authoritative state cannot be treated as valid empty state.

The scenario must prove the product's target-required fail-closed/recovery behavior without discarding user data or fabricating a clean baseline.

### 4.2 Cursor loss

A lost/invalid cursor must cause the production-defined reconcile/full-observation path or blocking behavior. The test must not manually advance/repair product state as a shortcut.

### 4.3 Incomplete remote coverage

Partial listing/change coverage is not authoritative absence and must not drive unsafe deletion.

### 4.4 Remote-root loss

Missing/unavailable root must be distinguished from an empty valid managed root.

If root identity changes/replacement is material, the product must follow target authority/pairing/recovery rules rather than silently treating a different root as continuous authority.

## 5. Invariants

- Corruption does not become an empty valid state.
- Incomplete listing does not prove deletion.
- Root loss does not masquerade as an empty remote.
- Recovery decisions remain production code.
- Primary simulated user content is not mutated merely to create state faults.
- No new recovery engine or scenario-specific core.

## 6. Material Edge / Failure Cases

Required proof includes:

- malformed state fails closed;
- truncated state fails closed;
- unsupported version is classified safely;
- lost cursor triggers target-required recovery path;
- partial listing cannot cause destructive inference;
- missing root is distinguished from valid empty root;
- replacement/root-ID mismatch is handled per target authority;
- recovery preserves valid user content;
- wrong optimistic expectation fails.

## 7. Engineering Discretion

The agent may choose representative corruption bytes/structures and root/cursor fixture values within current production formats.

## 8. Dependencies

Consumes accepted S04 state/change/root controls and S07A restart infrastructure.

## 9. Acceptance Criteria

All required recovery scenarios map to current requirements and pass against production recovery logic; fail-closed distinctions are asserted; no platform-core/production changes occur; scenario/architecture budgets pass; authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover device clone/restore authority or cancellation (07C), transfer/retry (07D), resource/safety/config (07E), scale (07F), or physical provider outages.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, recovery classifications/results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07C.
