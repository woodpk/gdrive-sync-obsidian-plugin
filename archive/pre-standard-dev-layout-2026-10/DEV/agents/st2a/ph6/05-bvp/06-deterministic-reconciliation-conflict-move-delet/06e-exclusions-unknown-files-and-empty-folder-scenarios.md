# BVP-S06E — Exclusions, Unknown Files, and Empty-Folder Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`
**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage
**Predecessor:** accepted S06E empty-folder prerequisite closure `11726f416a77582d85a1808de6642884b7b3aacd`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Blocked Dispatch Record

S06E is blocked before scenario implementation because the frozen declarative scenario vocabulary cannot seed an empty LOCAL or REMOTE folder.

The accepted virtual world already supports empty-folder reality:

- `InMemoryLocalVault.seedFolder(...)` / `createFolder(...)`;
- the in-memory Drive `create(...)` path supports `entityKind: "folder"`;
- production synchronization already contains folder-create authority/execution/recovery semantics.

The scenario fixture family currently exposes only file put/move/remove operations. Replacing an empty folder with a marker file would violate `FILE-003` by changing the semantic object under test.

This is a generic fixture-exposure gap, not a product synchronization defect. S06E remains scenario-only and may not modify `test-platform/src/**`.

A separate prerequisite must expose only empty-folder seeding through the existing fixture family, prove exact local/remote folder creation and fail-closed validation, pass architecture budgets, and then be frozen before S06E is rebound.

## 0.2 Resolved Prerequisite Record

The empty-folder fixture blocker is resolved by the accepted generic prerequisite:

- prerequisite implementation: `2e91eca2e884f1622e0e0dd8355b780ee4a037ae`;
- authoritative prerequisite evidence: `5434525ba618faeb895751dfbca79e9010762fc3`;
- accepted prerequisite closure / S06E PHX-CI base: `11726f416a77582d85a1808de6642884b7b3aacd`.

The frozen fixture family now exposes existing LOCAL and REMOTE empty-folder setup. S06E is unblocked. The prerequisite is frozen infrastructure and is not writable by S06E.

## 0.3 Acceptance Record

S06E is complete and accepted.

- accepted predecessor / PHX-CI base: `11726f416a77582d85a1808de6642884b7b3aacd`;
- accepted implementation SHA: `18b6f82a45dd86cc798ccfac14eb9b6cba772eb5`;
- authoritative PHX-CI evidence SHA: `a3cd74a56a38427e424d5c7d8c75a72c28d1da22`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused S06E verification: PASS, 13/13;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- framework core: unchanged at 3,864 / 4,000 logical TypeScript LOC;
- production seam: unchanged at 113 logical LOC / 1 file;
- scenario catalog: 36 scenarios / 779 logical LOC (+8 / +104);
- S06E scenarios: 13 logical LOC each, all within target/hard limits;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production: 0;
- scenario-specific PowerShell: 0;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted S06E coverage proves symmetric default exclusions, device-local/protected configuration exclusion from ordinary vault synchronization, opaque unknown-format binary synchronization in both directions, and empty-folder preservation in both directions without marker-file substitution.

This file is now a historical completion record and authorizes no further S06E implementation work.

## 1. Objective

Complete the non-fault reconciliation-coverage stage with declarative deterministic scenarios for configured scope/exclusions, unmanaged/unknown files, and empty-folder semantics.

## 2. Required End State

Executable scenarios cover current product requirements for:

- excluded local paths/files;
- excluded remote/managed-scope observations where applicable;
- device-specific/nonportable workspace/cache/token exclusions where current product scope defines them;
- unknown/unmanaged remote files that must not become managed synchronization authority accidentally;
- unknown local files outside managed scope;
- empty folders where the product's representation/platform rules define behavior;
- changes in scope/exclusion configuration where deterministic policy can be proven without physical runtime evidence.

## 3. Dispatch Binding — Hard Data Only

The S06E execution binding is:

- accepted predecessor / PHX-CI base: `11726f416a77582d85a1808de6642884b7b3aacd`;
- prerequisite implementation/evidence: `2e91eca2e884f1622e0e0dd8355b780ee4a037ae` / `5434525ba618faeb895751dfbca79e9010762fc3`;
- task branch: `bvp-s06e-exclusions-unknown-empty-folders`;
- target requirements: `FILE-001`–`FILE-006`, `CONFIG-001`, `CONFIG-003`–`CONFIG-007`, and `STATE-008`;
- completion evidence: target specification §13.2 exclusions applied symmetrically, unknown-extension/binary synchronization, and empty-folder behavior; configuration safety evidence remains bounded to ordinary-sync exclusion behavior rather than selective configuration-sync implementation;
- new scenario files:
  - `test-platform/scenarios/06e/excluded-local-default.ts`;
  - `test-platform/scenarios/06e/excluded-remote-default.ts`;
  - `test-platform/scenarios/06e/device-local-config.ts`;
  - `test-platform/scenarios/06e/protected-config.ts`;
  - `test-platform/scenarios/06e/unknown-binary-local.ts`;
  - `test-platform/scenarios/06e/unknown-binary-remote.ts`;
  - `test-platform/scenarios/06e/empty-local-folder.ts`;
  - `test-platform/scenarios/06e/empty-remote-folder.ts`;
- focused test file: `test-platform/test/s06e-exclusions-unknown-empty-folders.test.ts`;
- writable allowlist: exactly the eight scenario files above plus that focused test file;
- focused PHX-CI command: `node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s06e-exclusions-unknown-empty-folders.test.js`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- change class: `ordinary`;
- accepted architecture baseline: framework core 3,864/4,000 logical TypeScript LOC; production seam 113 LOC/1 file; scenario catalog 28 scenarios/675 logical LOC; BVP PowerShell 4 scripts/1,477 logical LOC; scenario-specific production 0; scenario-specific PowerShell 0;
- required S06E core/production/PowerShell delta: 0;
- each new ordinary scenario targets ≤120 logical lines and must remain ≤200;
- unknown-format files inside the managed BRAIN Sync root are ordinary vault content under `FILE-002` and MUST synchronize as opaque binary; this task does not reinterpret them as unmanaged;
- the separate external BRAIN asset repository is outside this task and remains governed by `ASSET-006`;
- no `test-platform/src/**`, `src/**`, `dev/scripts/**`, PHX-CI integration, governance, or architecture-metrics implementation changes are authorized.

No core change is authorized.

## 4. Required Semantics

### 4.1 Exclusions are policy inputs

Excluded content must remain outside managed synchronization according to the product target specification.

Tests must distinguish “excluded by configuration/policy” from “missing/unreadable/deleted.”

### 4.2 Unknown/unmanaged remote content

Remote content not owned/recognized by the managed synchronization authority must not be deleted, adopted, or mutated merely because it appears in the shared Drive area unless target rules explicitly define adoption.

### 4.3 Unknown local content

Local content outside managed scope/exclusions remains untouched by synchronization.

### 4.4 Empty folders

Where the product does not represent empty folders remotely, scenarios must prove no false file/deletion semantics are inferred. Where explicit folder behavior exists, assert the current target policy exactly.

### 4.5 Configuration/scope change

If product requirements define transitions when exclusions/scope change, scenarios may prove those semantics provided they use existing generic configuration fixture controls and do not require a new core concept.

## 5. Invariants

- Excluded/unknown content is not treated as deletion evidence.
- Unmanaged data is not destroyed.
- Scenario-only default remains intact.
- No new scope engine or production bypass exists.
- No scenario-specific PowerShell.

## 6. Material Edge / Failure Cases

Tests/scenarios must include representative:

- excluded local file remains unsynchronized;
- excluded existing managed candidate does not trigger unsafe deletion/adoption;
- unknown remote object remains untouched;
- unknown local file remains untouched;
- empty-folder behavior matches target policy;
- wrong expectation about excluded/unknown mutation fails.

## 7. Engineering Discretion

The agent may choose representative exclusion patterns and fixtures based on the current product target/config contract.

## 8. Dependencies

Consumes accepted S06A–D and frozen S04/S05 platform.

## 9. Acceptance Criteria

All required remaining non-fault reconciliation scenarios are mapped and passing; excluded/unknown data safety is proven; no platform-core/production change occurs; scenarios remain within budget; architecture metrics show coverage growth primarily in scenario/test surfaces; authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover S07 crash/fault/resource/recovery families or physical platform path/resource evidence.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario results, per-scenario LOC, architecture/core delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06V or S07.
