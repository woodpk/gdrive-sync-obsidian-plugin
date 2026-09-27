# BVP-S04B — Stateful In-Memory Drive Core

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04A

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Implement the stateful in-memory managed-Google-Drive boundary required for deterministic production-path synchronization tests.

The simulation models remote external reality. It MUST NOT implement reconciliation or synchronization policy.

## 2. Required End State

The Drive model must support the production-observable remote behaviors required by BVP-SIM-005:

- stable managed remote object IDs;
- create/upload;
- update/content replacement;
- download/read;
- revision/content identity as required by production contracts;
- move/rename while retaining stable remote identity;
- trash/existence state;
- listing of managed remote objects;
- parent/path metadata required by production code;
- deterministic state retention across multiple operations.

Change-feed, completeness controls, ambiguity, and fault injection beyond core mutation/read behavior belong to 04C.

## 3. Dispatch Binding — Hard Data Only

The S04B contract is bound to the accepted S04A repository state as follows:

- exact accepted S04A predecessor / integration SHA: `0df712bdac7404cae38de4ad88eb68d5da00a5e2`;
- exact task branch: `bvp-s04b-stateful-in-memory-drive-core`;
- production external-boundary contract: `GoogleDrivePort` from `src/contracts/google-drive.ts`;
- S04B implements the exact production method signatures for the core provider surface:
  - `authenticationState`;
  - `createManagedRoot`;
  - `pairManagedRoot`;
  - `validateManagedRoot`;
  - `protocolInfo`;
  - `listForReconciliation`;
  - `observe`;
  - `download`;
  - legacy/raw provider primitives `create`, `update`, `move`, and `trash`;
- S04B deliberately does **not** implement `getStartCursor` or `readChanges`; those exact remaining `GoogleDrivePort` members are owned by S04C together with change-feed/completeness/ambiguity/fault controls;
- the raw create/update/move/trash members are modeled only as external Google Drive reality. They are not synchronization authority; later virtual-world composition must continue to use the product's recovery-safe planner/executor semantics rather than treating these raw receipts as convergence authority;
- relevant production records/types: `ManagedRemoteIdentity`, `ManagedRemoteValidation`, `RemoteProtocolInfo`, `DriveResult`, `DriveSignal`, `RemoteEntry`, `RemoteListing`, `RemoteDownload`, `RemoteCreateRequest`, `RemoteUpdateRequest`, `RemoteMutationReceipt`, `RemoteObservation`, `RemoteObjectId`, `VaultIdentity`, `ProtocolVersion`, `VaultPath`, `BinaryContentSource`, and `ContentEvidence`;
- behavioral references are read-only:
  - `src/drive/google-drive-port.ts`;
  - `test/phase3-drive.test.ts`;
  - `test/phase5-group-b-drive-domain.test.ts`;
  - `test/workstreams/drive/phase6-remote-protocol.test.ts`;
  - `test/workstreams/drive/phase6-remote-protocol-v1.3.test.ts`;
- exact S04B implementation path: `test-platform/src/virtual-world/in-memory-google-drive.ts`;
- exact S04B test path: `test-platform/test/in-memory-google-drive.test.ts`;
- exact implementation-writable allowlist:
  - `test-platform/src/virtual-world/in-memory-google-drive.ts`;
  - `test-platform/test/in-memory-google-drive.test.ts`;
- supervisor-owned seam expansion is authorized only in the already-approved/frozen `src/product/local-vault-boundary-seam.ts`; despite its historical filename, it is the existing single enumerated virtual-world production seam and may re-export the frozen Drive contract/types needed by S04B without adding runtime policy;
- production seam count therefore remains 1 file and must remain below the existing 350 logical-LOC cap;
- PHX-CI base authority: `0df712bdac7404cae38de4ad88eb68d5da00a5e2`;
- target-branch PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused S04B command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/in-memory-google-drive.test.js`;
- authoritative full BVP focused command remains `npm run test:bvp-root`;
- BVP-GOV-010 size gate: **PASS** — one existing production contract family, one substantive BVP runtime implementation file, two implementation-writable files, and expected non-test implementation remains below the 1000-net-LOC split threshold.

The implementation may not add a BVP-only synchronization API or modify production Drive behavior. S04C remains responsible for the intentionally excluded feed/fault surface.

No binding may redefine remote identity or production-port semantics.

## 4. Required Behavior and Semantics

### 4.1 Production-port fidelity

The model must implement the same production Drive boundary consumed by real synchronization logic.

It cannot expose a BVP-only higher-level “sync” API that shortcuts production planner/executor decisions.

### 4.2 Stable remote identity

Once created, a managed remote object's ID remains stable across content updates and moves/renames unless the actual production/provider contract says otherwise.

A move must not be modeled as an unrelated object replacement when product semantics depend on stable identity.

### 4.3 Revision / content identity

Remote revision/content identity must evolve deterministically in response to content mutation and remain stable when no relevant mutation occurs.

The exact representation may match the production contract's revision/etag/hash model.

### 4.4 Trash/existence

Trash and existence state must be independently observable as required by production logic. A trashed object must not silently become a brand-new unrelated object if later restored/observed unless the production contract dictates that.

### 4.5 Listing

Listing returns the modeled remote reality faithfully. Ordinary core listing is complete in this child; explicit incomplete/partial listing behavior belongs to 04C.

## 5. Invariants

- Remote simulation never chooses local-vs-remote authority.
- No conflict/merge decision occurs in Drive simulation.
- Stable IDs/revisions are deterministic.
- State persists until explicitly mutated or later world reconstruction rules say otherwise.
- No live Google Drive API or credential is used.
- No new OAuth scope or token handling is introduced.

## 6. Material Edge / Failure Cases

Tests must cover at least:

- create then fetch/download;
- update changes content/revision but preserves object ID;
- move/rename preserves object ID;
- trash changes observable state;
- multiple objects with distinct IDs;
- listing reflects current modeled state;
- repeated read without mutation is stable;
- invalid/missing ID produces the production-appropriate failure classification.

## 7. Engineering Discretion

The agent may choose:

- internal object store;
- ID/revision generators;
- path/parent representation;
- helper decomposition;
- deterministic fixture builders.

Do not infer future change-feed/fault architecture prematurely.

## 8. Dependencies

Requires accepted S04A and the production Drive boundary frozen by the product architecture.

Later S04C extends this model; therefore keep core mutation/read semantics generic and separable from change-feed/fault controls.

## 9. Acceptance Criteria

Acceptance requires deterministic proof of stable remote identity, revision/content mutation semantics, move/trash/read/list behavior, production-port compatibility, no policy duplication, no live provider dependency, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- change cursors/feed;
- partial listing;
- ambiguous outcomes;
- injected network/provider faults;
- per-device state;
- world orchestration;
- scenario runner/DSL;
- live-device transport.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, bound Drive port(s), changed paths, focused tests/results, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 04C.
