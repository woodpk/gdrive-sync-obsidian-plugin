# BVP-S04E — Virtual-World Composition over Real Production Logic

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Implementation state:** `READY FOR LOCAL PHX-CI VERIFICATION`  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Compose the S04 deterministic boundaries into a small multi-device test world that runs the **real production planner/executor/state authority** end-to-end enough to prove the virtual world is a valid semantic test environment.

## 2. Required End State

A programmatic world builder/composition surface can construct at least:

- two independent logical devices;
- independent local vault realities;
- independent device-local durable state/identity/cursors;
- one shared simulated managed Drive;
- deterministic time/order controls;
- boundary fault/completeness/ambiguity controls;
- fresh production synchronization runtime objects wired to those boundaries.

The following production-path canaries execute through real production logic:

- local create → remote upload/create;
- remote create → local download/create;
- two-device synchronization through shared remote;
- stable remote-ID-preserving move;
- partial/incomplete remote observation without unsafe deletion inference;
- ambiguous remote mutation followed by production reconciliation/observation behavior;
- runtime restart/reconstruction over retained state/reality.

## 3. Dispatch Binding — Hard Data Only

The S04E contract is bound to the reviewed post-S04D repository state as follows:

- exact accepted/reviewed predecessor and PHX-CI base authority: `238064e44843e256f35f074ef4a860509790b8a2`;
- exact task branch: `bvp-s04e-virtual-world-production-composition`;
- exact production composition path:
  - `ProductSnapshotAssembler`;
  - `ProductionSynchronizationPlanner` over `DeterministicSynchronizationPlanner`;
  - `ProductSynchronizationExecutor`;
  - `ProductController`;
  - `SynchronizationStateAuthorityAdapter` as the writable production state/authority surface;
- frozen production physical mutation seams consumed by the authoritative executor/recovery path:
  - `ReliableRemoteMutationPort`;
  - `RemoteUpdateFinalizationPort`;
  - `RemoteFolderCreateRecoveryReadPort`;
  - `LocalTransactionalMutationPort`;
- production support components used without behavioral modification:
  - `ThreeWayConflictResolver`;
  - `InMemoryRunLeasePort`;
  - `BoundedAuditHistory` + `MemoryAuditPersistence`;
  - `CanonicalEvidenceLocalVault` + `ObsidianLocalMutationTransactions` for the production canonical-read and crash-safe local-transaction path;
- accepted S04 deterministic realities/factories consumed directly:
  - `InMemoryLocalVault` from S04A;
  - `InMemoryGoogleDriveCore` from S04B/C;
  - `VirtualDeviceBacking` / `VirtualDeviceRuntime`, per-device `DeterministicClock`, and shared `DeterministicOrderGate` from S04D;
- S04E may add physical-boundary adapters over those accepted realities. Those adapters may reserve/materialize provider IDs, stage/swap local bytes, and report physical observations/outcomes through the frozen production contracts; they may not plan synchronization, choose authority, infer convergence/deletion, merge content, or commit canonical product state;
- the accepted Drive reality is authorized one bounded external-reality extension: deterministic provider ID reservation plus exact-ID materialization so the frozen reliable-remote mutation seam can model Drive pre-dispatch ID reservation against the same shared remote reality;
- immutable-candidate updates must preserve the production protocol: pre-reserved candidate identity, exact candidate materialization, predecessor preservation/retirement semantics, and `finalizeExistingUpdate` support for durable recovery;
- local transaction adaptation must preserve the frozen persisted stage/backup paths and transaction stages rather than bypassing the durable transaction record;
- exact S04E implementation paths:
  - `test-platform/src/virtual-world/in-memory-google-drive.ts`;
  - `test-platform/src/virtual-world/virtual-world.ts`;
  - `test-platform/test/virtual-world.test.ts`;
- exact implementation-writable allowlist:
  - `test-platform/src/virtual-world/in-memory-google-drive.ts`;
  - `test-platform/src/virtual-world/virtual-world.ts`;
  - `test-platform/test/virtual-world.test.ts`;
- supervisor-owned seam expansion is authorized only in existing `src/product/local-vault-boundary-seam.ts` to re-export the frozen production composition/mutation/support surfaces above; no production behavior change is authorized;
- production seam remains one file and must remain below 350 logical LOC;
- manual canaries invoke `ProductController.previewManual()` and `requestPreviewAction({ kind: "execute-plan", planId })`; the world builder does not auto-select, rewrite, or approve product plans;
- required canaries are exactly the S04E contract set: local create/upload, remote create/download, two-device shared remote, stable-ID remote move, partial-listing safety, ambiguous remote mutation followed by production observation/recovery, and fresh-runtime reconstruction;
- S04E does not introduce S05 scenario data, runner lifecycle, assertion engine, evidence schema, or checkpoint persistence;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI change classification: `authorized-governance` because the explicitly authorized production-seam expansion changes supervisor-owned frozen surface `src/product/local-vault-boundary-seam.ts`;
- focused S04E command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/virtual-world.test.js`;
- authoritative full BVP focused command remains `npm run test:bvp-root`;
- BVP-GOV-010 size gate: **PASS** — measured implementation delta is approximately **968 logical net-new non-test LOC**, with two substantive BVP runtime files touched/created plus the existing one-file production seam expansion; this remains below the 1000-LOC split threshold.

The post-S04C/S04D BVP-GOV-008 architecture review passed at `238064e44843e256f35f074ef4a860509790b8a2`. S04E may compose only the reviewed capabilities above.

If implementation proves a further production surface is required, stop `BLOCKED` with the exact missing seam rather than creating a parallel test synchronization stack.

## 4. Required Behavior and Semantics

### 4.1 Real production authority

Every synchronization claim must result from production planner/executor/state code consuming simulated external boundaries.

The world builder may wire dependencies. It MUST NOT:

- compute sync plans itself;
- decide local-vs-remote authority;
- merge/conflict content;
- infer deletion;
- commit product state on behalf of production code.

### 4.2 Two-device reality

Each device uses its own local/state authority while sharing only the modeled remote and explicitly shared deterministic controls.

### 4.3 Fresh-runtime composition

The world builder must be able to create fresh runtime objects repeatedly over retained world state to support restart tests.

### 4.4 Test control vs product control

World controls may:

- mutate external reality as a fixture;
- set deterministic time/order;
- inject boundary faults/completeness/ambiguity.

They may not directly force product decisions or terminal success.

### 4.5 Observable canaries

Canaries must assert externally meaningful outcomes—content/identity/state/remote effects—not merely that a method returned.

## 5. Invariants

- No duplicate synchronization algorithm.
- No scenario runner or DSL.
- No production test-mode control path.
- No scenario-specific simulator behavior.
- Production-to-test-platform dependency remains prohibited.
- Fault ambiguity/completeness semantics remain intact through composition.

## 6. Material Edge / Failure Cases

Canaries/tests must establish:

- two devices do not share local/state objects accidentally;
- shared remote mutations are visible to both through production observations;
- production move behavior uses stable remote identity;
- incomplete listing cannot masquerade as full absence;
- ambiguous outcome remains ambiguous until later observation/reconciliation;
- reconstructed runtime has new runtime identity but retained simulated durable/external state;
- incorrect world wiring that bypasses production planner/executor is detectable by tests/review.

## 7. Engineering Discretion

The agent may choose:

- world-builder API shape;
- private factory/helper decomposition;
- how device handles expose fixture controls versus production runtime handles;
- canary test organization.

Keep the API small and programmatic. Do not design the later declarative scenario language in this child.

## 8. Dependencies

Consumes all accepted S04A–S04D capabilities and current production composition boundaries.

This child is the integration proof that allows S05 to build a runner over a valid production-path virtual world.

## 9. Acceptance Criteria

Acceptance requires all required canaries through real production logic, direct evidence that no policy is duplicated in the world, correct multi-device isolation/shared-remote composition, restart semantics, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- declarative scenario types;
- runner/verdict engine;
- canonical evidence;
- checkpoint/resume representation;
- broad reconciliation coverage;
- live-device validation.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, production entrypoints used, required canary results, architecture metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin S05.
