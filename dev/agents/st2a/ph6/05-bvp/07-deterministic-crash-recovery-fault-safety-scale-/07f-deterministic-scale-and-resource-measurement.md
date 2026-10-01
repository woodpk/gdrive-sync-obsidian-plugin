# BVP-S07F — Deterministic Scale and Resource Measurement

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** architecture-reviewed accepted S07E closure `556a58d96b9387fae799c4e10d8cd9476f7348ed`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Final Dispatch Binding

S07F is **BOUND / EXECUTABLE** from the architecture-reviewed accepted S07E closure.

- exact PHX-CI base: `556a58d96b9387fae799c4e10d8cd9476f7348ed`;
- branch: `bvp-s07f-deterministic-scale-resource-measurement`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework core baseline: 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- production source baseline: 16,670 logical LOC;
- production seam baseline: 113 LOC / 1 file;
- scenario catalog baseline: 70 scenarios / 1,524 logical LOC;
- BVP PowerShell baseline: 4 scripts / 1,477 logical LOC;
- production artifact baseline: `main.js` 880,742 bytes, SHA-256 `9745d590e8348ce896f11b90321706546afded1b837fe12702e59b9b51452df4`.

Current product authority defines no hard wall-clock, RSS, heap, file-count, or maximum-file-size pass/fail SLA for deterministic host execution. Measurements therefore remain construction evidence only and MUST NOT become invented performance requirements.

Current implementation facts relevant to bounded transfer behavior:

- production Drive upload/download chunk size: 256 KiB;
- default HTTP transport concurrency cap: 3;
- target requirements `XFER-005`, `XFER-006`, and `XFER-007` require checkpointed/bounded large-run handling, bounded memory/concurrency, and no arbitrary small product-level file-size ceiling;
- actual iOS constrained-resource proof remains S09D.

Representative deterministic scale cases selected for this child:

- 16 MiB file transfer/content-integrity case, exercising 64 production 256-KiB upload chunks in the root Drive-port focused test;
- 256-file managed-vault case using 4-KiB deterministic files;
- a second 64-file update batch over that same 256-file trusted vault to prove bounded multi-operation synchronization while preserving correct identity/state semantics: untouched objects retain their Drive IDs, while updated objects converge on the frozen immutable-candidate update protocol's new canonical IDs and trusted mappings follow those IDs;
- host measurements: elapsed milliseconds plus sampled RSS/heap-used before, during, and after each scale case, with Node/platform/architecture context.

Writable implementation allowlist:

- `test-platform/test/s07f-deterministic-scale-resource-measurement.test.ts`;
- `test/s07f-large-transfer-resource.test.ts`;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No framework-core, scenario-definition, production, production-seam, PowerShell, PHX-CI, persistence, benchmark framework, or architecture implementation change is authorized.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/bvp/test-platform/test/s07f-deterministic-scale-resource-measurement.test.js && node --test .test-build/test/s07f-large-transfer-resource.test.js`

## 0.2 Ready-for-Verification Record

S07F is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic test implementation HEAD: `7c21441a4c5ebbf3cfe5372d23919baff3c101fe`;
- exact PHX-CI base: `556a58d96b9387fae799c4e10d8cd9476f7348ed`;
- implementation delta: two test files only;
- framework-core / scenario-definition / production / production-seam / PowerShell / PHX-CI implementation delta: 0;
- framework core remains 4,000 / 4,000;
- scenario catalog remains 70 scenarios / 1,524 logical LOC;
- production artifact is expected to remain unchanged.

Scale proof:

- 16 MiB virtual-world synchronization validates final content hash, size, trusted BASE, and remote mapping state while recording elapsed host time and sampled RSS/heap/external/array-buffer memory;
- 256 deterministic 4-KiB managed files synchronize through 256 production upload-create operations;
- a subsequent 64-file update batch executes through 64 production upload-update operations; the 64 updated paths converge on unique immutable-candidate remote IDs, the 192 untouched paths retain their prior IDs, and trusted BASE/mapping state tracks all 256 observed post-update identities;
- production Drive resumable upload consumes a generated 16 MiB source incrementally and emits exactly 64 request bodies at the current 256-KiB implementation chunk boundary;
- production Drive download consumes the complete 16 MiB object through exactly 64 range requests at the current 256-KiB implementation chunk boundary;
- upload/download tests independently hash all transferred bytes;
- every scale test emits `S07F_MEASUREMENT` evidence with Node version, host platform/architecture, input size/count, elapsed milliseconds, and available host memory samples;
- no elapsed-time, memory, or throughput SLA is asserted because current product authority defines none.

Unavailable by design:

- actual iOS/WebView constrained-resource behavior and physical large-transfer evidence remain S09D.

## 1. Objective

Add bounded host-side deterministic large-file/large-vault execution and resource measurements sufficient to prove required algorithmic/behavioral scale characteristics without turning the BVP into a benchmark framework.

## 2. Required End State

Deterministic coverage executes representative scale cases required by the current product target, including as applicable:

- large individual file transfer/content handling;
- larger managed file counts/vault listings;
- bounded multi-operation synchronization;
- memory/time/resource measurements available in the host environment;
- evidence that safety/identity/integrity semantics remain correct under scale.

Measurements are recorded as evidence; they do not become unsupported universal performance guarantees.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07E predecessor SHA;
- task branch;
- current scale/resource requirements and any explicit thresholds already defined by product authority;
- exact scale scenario/test/evidence paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline;
- machine/environment facts needed to interpret host-side measurements.

Binding may not invent new performance SLAs.

## 4. Required Semantics

### 4.1 Correctness first

Scale cases must still assert content integrity, identity, state, and safety outcomes. A fast run with wrong synchronization semantics is failure.

### 4.2 Bounded measurement

Record only measurements that can be gathered deterministically/reproducibly enough for construction evidence, such as elapsed host time, peak/approximate memory where available, operation counts, and relevant file/vault sizes.

### 4.3 Threshold authority

If the product target defines a hard threshold, enforce it.

If no hard threshold exists, record the measurement without inventing a pass/fail SLA. Functional completion and absence of pathological/unbounded behavior may still be required where specified.

### 4.4 No benchmark framework

Do not create generalized benchmarking infrastructure, historical performance databases, dashboards, or statistical harnesses merely for this child.

### 4.5 Physical-resource boundary

Host deterministic scale cannot prove actual iOS constrained-resource behavior. Representative physical mobile evidence remains S09D.

## 5. Invariants

- Scenario/core architecture stays frozen.
- Measurements do not redefine product requirements.
- Correctness assertions remain mandatory.
- No wall-clock sleeps are used as semantic control.
- No production source changes for test instrumentation unless separately authorized by existing product diagnostics contracts.

## 6. Material Edge / Failure Cases

Required proof includes representative:

- large file content remains intact;
- larger file-count/vault scenario completes with correct state;
- bounded measurements are emitted;
- explicit existing product thresholds, if any, are enforced;
- missing measurement capability is reported honestly rather than fabricated;
- scale run does not require a new runner/benchmark subsystem.

## 7. Engineering Discretion

The agent may choose representative sizes/counts that satisfy current target requirements and remain practical for PHX-CI, plus simple host measurement APIs available in the existing toolchain.

## 8. Dependencies

Consumes frozen S04/S05 platform and deterministic coverage patterns from S06/S07A–E.

## 9. Acceptance Criteria

Required scale cases execute correctly, measurements are captured with environment context, no invented SLA is introduced, architecture remains unchanged, metrics/budgets pass, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not:

- build a performance benchmark product;
- claim mobile physical-resource proof;
- add new platform abstractions;
- optimize production code merely because a measurement is aesthetically undesirable unless an actual requirement fails.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, scale cases/sizes, correctness results, measurements/environment, explicit threshold results if applicable, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07V or S08.
