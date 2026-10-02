# BVP-S08B — Validation-Only Obsidian Build / Entrypoint

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08A

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.


## 0.1 Final Dispatch Binding

BVP-S08B is **BOUND / EXECUTABLE** from accepted S08A closure.

Repository coordinates:

- exact accepted S08A predecessor / PHX-CI base: `b2a009e140a03c2aa94499024f38828fe3e2e78a`;
- task branch: `bvp-s08b-validation-only-obsidian-entrypoint`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI framework version: `0.2.0-dev.2`;
- accepted production artifact baseline: `main.js` 884,300 bytes, SHA-256 `0d4f755dfd85da9a66180ed38cededd37168ea9f46ae1aa4ee3c15cdb8341411`;
- current live-device agent/relay metric baseline: 0 logical TypeScript LOC / 0 files;
- hard live-device agent/relay budget remains 750 logical TypeScript LOC;
- framework core remains frozen at 4,000 / 4,000 logical TypeScript LOC / 10 modules and S08B has no authority to increase it;
- approved production seam remains 140 logical LOC / 2 files and S08B has no authority to add or broaden a production seam.

Current build grounding:

- ordinary production build remains `node scripts/build.mjs && node scripts/verify-build.mjs`;
- `scripts/build.mjs` bundles only `src/main.ts` to root `main.js` with the existing browser/CJS/ES2022 Obsidian externalization;
- root `manifest.json` is the authoritative ordinary plugin manifest and must remain unchanged;
- `.test-build/` is already ignored/disposable and is the validation-artifact output root;
- `test-platform/tsconfig.json` already compiles `test-platform/src/**/*.ts` and `test-platform/test/**/*.ts` into `.test-build/bvp`;
- the architecture guard already hard-fails if ordinary root `main.js` contains `BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL`;
- production `src/**` may not import `test-platform/**`, and S08B must not reclassify `src/main.ts` as a production seam.

Bound validation composition:

- NEW `test-platform/src/live-device/validation-entrypoint.ts` owns only validation-artifact identity/non-shipping marking; it imports no production source and no scenario/test infrastructure;
- NEW `test-platform/src/live-device/build-validation-artifact.ts` is the validation-only build owner. It must use the existing esbuild dependency to generate a temporary/virtual composition entry that wraps the real `src/main.ts` production entrypoint together with the validation-only entry module, without modifying production build configuration;
- validation output is disposable under `.test-build/bvp-live-device/plugin/`, containing validation `main.js`, an unchanged copy of root `manifest.json`, and machine-readable build identity;
- the validation bundle must record exact Git source HEAD, artifact size/hash, production entrypoint identity, and included test-platform inputs;
- esbuild metafile input inspection must reject any included `test-platform/**` source outside `test-platform/src/live-device/**`, preventing scenario catalog, tests, fixtures, or virtual-world implementation from leaking into the validation artifact;
- normal production `main.js` must retain the accepted S08A hash because S08B changes no production source/build path.

Exact writable-path allowlist:

- `test-platform/src/live-device/validation-entrypoint.ts`;
- `test-platform/src/live-device/build-validation-artifact.ts`;
- `test-platform/test/s08b-validation-build-entrypoint.test.ts`;
- this S08B task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No other path is writable. In particular, S08B may not change `src/**`, `scripts/**`, `package.json`, `package-lock.json`, `manifest.json`, `phx-ci.json`, Taskfiles, PowerShell, the architecture boundary/guard/metrics, OAuth/authentication code, S08A receipt semantics, command-agent/transport code, or scenario catalog.

Required focused proof:

- build and verify ordinary production `main.js` through the existing production build scripts;
- build the validation artifact independently through the compiled validation-only builder;
- prove production `main.js` lacks the non-shipping sentinel and retains the accepted S08A SHA-256;
- prove validation `main.js` contains/executes the validation build identity while loading the real production entrypoint path;
- prove validation artifact manifest bytes equal the authoritative root manifest;
- prove build identity reports exact source HEAD and exact validation artifact SHA-256;
- prove validation bundle test-platform inputs are restricted to `test-platform/src/live-device/**`;
- delete disposable validation output and prove the already-built production artifact remains independently valid and unchanged;
- rebuild validation output and prove deterministic validation artifact identity for the same source HEAD.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js`

BVP-GOV-010 size gate: PASS. The child adds one validation-build/entrypoint contract family, two substantive validation-only implementation files, and one focused test. It introduces no production, framework-core, PowerShell, PHX-CI, governance, command-agent, transport, or scenario implementation.


## 0.2 Ready-for-Verification Record

BVP-S08B is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic implementation HEAD: `7dc7be83c15b1ffebe873ea27688d8c6e779867d`;
- exact accepted S08A predecessor / PHX-CI base: `b2a009e140a03c2aa94499024f38828fe3e2e78a`;
- implementation branch: `bvp-s08b-validation-only-obsidian-entrypoint`;
- implementation delta is exactly:
  - `test-platform/src/live-device/validation-entrypoint.ts` — validation-only non-shipping/build identity installation;
  - `test-platform/src/live-device/build-validation-artifact.ts` — validation-only esbuild composition over the real `src/main.ts` entrypoint, exact source/artifact identity, manifest copy, and test-platform input containment;
  - `test-platform/test/s08b-validation-build-entrypoint.test.ts` — focused production/validation separation, load, identity, disposal, and deterministic-rebuild proof;
- production source/build/config delta: 0;
- production seam remains 140 logical LOC / 2 files;
- framework core remains 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- projected live-device/relay contribution: 176 logical TypeScript LOC / 2 files versus the frozen 750-LOC maximum;
- BVP PowerShell remains 4 scripts / 1,492 LOC;
- no architecture boundary/guard/metrics, PHX-CI, package, manifest, OAuth, command-agent, transport, scenario, or production file was changed.

Validation build behavior:

- the validation artifact is emitted only beneath ignored `.test-build/bvp-live-device/plugin/`;
- its generated virtual wrapper bundles the real production `src/main.ts` and the validation-only entry module without modifying ordinary production build configuration;
- ordinary production `main.js` is independently rebuilt/verified and must retain accepted S08A SHA-256 `0d4f755dfd85da9a66180ed38cededd37168ea9f46ae1aa4ee3c15cdb8341411`;
- validation `main.js` carries `BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL` plus exact source HEAD at runtime;
- validation `build-identity.json` records source commit, artifact size/SHA-256, manifest SHA-256, production/validation entrypoints, and included test-platform inputs;
- esbuild metafile inspection fails closed if any bundled test-platform source lies outside `test-platform/src/live-device/**`;
- root `manifest.json` is copied byte-for-byte into the validation artifact;
- focused proof removes the disposable validation output, re-verifies the untouched production artifact, rebuilds validation output, and requires deterministic validation artifact identity for the same source HEAD.

Focused command remains:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js`

S08B is not accepted until authoritative PHX-CI passes and the persisted JSON, Markdown, and complete execution log are reviewed.

## 1. Objective

Create a physically separate validation-only Obsidian artifact/entrypoint under `test-platform/**` that can compose later live validation code with the real production plugin path without changing the ordinary shipping bundle.

## 2. Required End State

The repository can build:

1. the ordinary production plugin artifact exactly through its normal production entrypoint; and
2. a distinct validation-only artifact/entrypoint that may include test-platform live-validation composition.

The validation artifact can load in the supported Obsidian runtime needed by later S08/S09 work, while ordinary `main.js` contains none of the validation-only agent, transport, scenario catalog, test faults, or validation UI.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08A predecessor SHA;
- task branch;
- current production Obsidian entrypoint/build mechanism;
- actual test-platform root/build configuration;
- exact validation entrypoint/build/test paths;
- exact writable-path allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- accepted production artifact hash/baseline where deterministic;
- size-gate confirmation.

Binding may not make validation-only code part of the normal production entrypoint.

## 4. Required Semantics

### 4.1 Separate composition root

Validation-only composition originates under `test-platform/**` and may depend on approved production surfaces.

Production `src/**` must not import the validation entrypoint or test-platform implementation.

### 4.2 Production-path fidelity

The validation artifact must execute actual production synchronization code for synchronization claims. It may wrap/compose production entrypoints but cannot substitute a duplicate implementation.

### 4.3 Ordinary shipping exclusion

Normal build output must exclude:

- validation device agent;
- command mailbox/relay;
- scenario runner/catalog;
- validation-only controls/UI;
- fault controls;
- test fixtures.

The S08A general production run-receipt seam may remain in production because it is explicitly production-owned and budgeted.

### 4.4 Build identity

Validation evidence must be able to identify the exact production/source commit and validation artifact build used so later physical results are traceable.

### 4.5 No hidden mode switch

Do not restore a production “validation mode” setting that turns the shipping plugin into the validation harness.

The separate artifact/entrypoint is the isolation mechanism.

## 5. Invariants

- Validation-only code lives outside production source.
- Normal production build remains independently buildable.
- No scenario state machine enters production.
- No additional OAuth scope/token path is introduced.
- Validation build is test infrastructure, not a second product implementation.

## 6. Material Edge / Failure Cases

Tests/proofs must establish:

- normal production build succeeds independently;
- validation build succeeds independently;
- normal production `main.js` lacks validation-only sentinel/import/code signatures;
- validation artifact includes/loads its intended validation composition;
- production artifact remains functional without validation build output present;
- deleting disposable validation build output does not affect production build;
- no production config/entrypoint accidentally points to validation root.

## 7. Engineering Discretion

The agent may choose the smallest build mechanism compatible with the current repository—separate bundler entrypoint, configuration, or equivalent—provided the dependency direction and shipping exclusion contracts hold.

Do not add a generalized multi-product build framework.

## 8. Dependencies

Consumes accepted S08A production receipt and S03 shipping-boundary governance.

S08C/D will populate the validation-only composition with bounded agent/transport capabilities.

## 9. Acceptance Criteria

Acceptance requires distinct production/validation artifacts, production-path fidelity in validation composition, objective shipping-exclusion proof, exact build traceability, no production validation-mode restoration, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement the command agent, command transport, live executor, physical scenarios, or validation UI beyond the minimum entrypoint/load proof.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, production/validation build commands, artifact identities/hashes where stable, exclusion proof, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08C.
