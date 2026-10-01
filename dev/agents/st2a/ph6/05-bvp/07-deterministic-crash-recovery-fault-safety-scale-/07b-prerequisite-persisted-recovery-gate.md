# BVP-S07B Prerequisite — Persisted Recovery-Gate Reconstruction

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07B  
**Predecessor / PHX-CI base:** `3269ad831878be7e399871eb7d229a613c9d8db0`  
**Branch:** `bvp-s07b-prereq-persisted-recovery-gate`

## 0.1 Ready-for-Verification Record

The bounded prerequisite implementation is complete and ready for authoritative PHX-CI.

- semantic implementation HEAD: `69b039d3d018303bd4624962935211fffdc56679`;
- PHX-CI base: `3269ad831878be7e399871eb7d229a613c9d8db0`;
- framework-core delta: +3 logical TypeScript LOC;
- projected framework core: 3,999 / 4,000;
- runtime module count unchanged;
- production/seam/PowerShell/PHX-CI implementation delta: 0;
- changed implementation surface: only `test-platform/src/virtual-world/virtual-world.ts`;
- focused proof: `test-platform/test/s07b-persisted-recovery-gate-prerequisite.test.ts`.

Authoritative PHX-CI remains the acceptance authority.

## 1. Objective

Make reconstructed virtual production devices model the already-existing production recovery gate from persisted synchronization state.

This is test-platform composition only. It must not change product recovery semantics.

## 2. Proven Gap

Authoritative S07B PHX-CI evidence `0690eee537eed5819c3b5e6ced39b31739dd085a`, reviewed across JSON, Markdown, and the complete 5,539-line execution log, proves:

- corrupt/truncated/incompatible state faults are correctly classified as `recovery-required`;
- production recovery planning itself is already covered by the passing C1-R1 product regression;
- `VirtualSynchronizationWorld.reconstructDevice(...)` omits `recoveryActive` and `onRecoveryGateChanged`;
- therefore a reconstructed virtual device cannot enter the same recovery-gated planning path as production from persisted untrusted state.

## 3. Required End State

During `reconstructDevice(name)`:

1. load current persisted state through the same reconstructed state store/context;
2. initialize a local recovery-gate boolean to whether the persisted load is `recovery-required`;
3. pass `recoveryActive: () => recoveryActive` into `ProductController`;
4. pass `onRecoveryGateChanged` that updates the same boolean.

No recovery decision may be implemented in the virtual world. The production controller remains the sole authority for entering/leaving recovery after startup initialization.

## 4. Writable Allowlist

Implementation/test:

- `test-platform/src/virtual-world/virtual-world.ts`
- `test-platform/test/s07b-persisted-recovery-gate-prerequisite.test.ts`

Documentation:

- this file;
- `dev/agents/st2a/ph6/05-bvp/07-deterministic-crash-recovery-fault-safety-scale-/07b-state-cursor-listing-root-recovery-scenarios.md`;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No other path is writable.

## 5. Architecture Constraints

- framework-core baseline: 3,996 / 4,000 logical TypeScript LOC / 10 modules;
- net framework-core delta MUST be <=4 LOC;
- no new runtime module;
- no product, production seam, PowerShell, PHX-CI, persistence, planner, or recovery-engine change;
- no new fault or observation family.

If the required composition cannot fit these constraints, stop BLOCKED.

## 6. Focused Proof

Focused verification must prove:

- trusted reconstructed state starts with recovery gate inactive;
- after persisted state is deliberately corrupted and the device is reconstructed, production preview reaches a reviewable recovery plan rather than `missing-production-plan`;
- executing that reviewed reconstruction returns persisted state to trusted;
- valid local and remote content remain preserved;
- after the controller clears the recovery gate, a subsequent ordinary reviewed preview remains available.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07b-persisted-recovery-gate-prerequisite.test.js`

PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`  
Change class: `ordinary`.

## 7. Stop

Stop after authoritative PHX-CI acceptance and architecture review. Do not resume S07B proper on this branch.
