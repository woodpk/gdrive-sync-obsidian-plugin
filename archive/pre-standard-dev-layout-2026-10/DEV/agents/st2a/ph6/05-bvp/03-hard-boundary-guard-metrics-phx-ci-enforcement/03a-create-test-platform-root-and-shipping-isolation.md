# BVP-S03A — Create Test-Platform Root and Prove Shipping Isolation

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement  
**Exact accepted predecessor / implementation input SHA:** `376ab75477c863cceb63ff82475f352a8f4ec4cc`  
**Required branch:** `bvp-s03a-test-platform-root-isolation`  
**Accepted implementation SHA:** `a406c5a376fa7db04741b8cf1f38757ca26866eb`  
**Accepted PHX-CI evidence commit:** `28462b854f4cefbae6f385e67835f8e5f0539918`  
**Accepted integration head after promotion:** `fdc5f8a0f72f57492eea10590cecfa7e80aa1ee6`

This file is a historical contract record. It authorizes no new work and MUST NOT be re-executed.

## 1. Objective

Establish the first physical BVP implementation boundary by creating the smallest useful top-level `test-platform/**` TypeScript build/test skeleton outside production `src/**`, while proving that the ordinary production build remains unchanged and excludes that platform code.

## 2. Required End State

The accepted result established:

- a separate `test-platform/**` root;
- isolated TypeScript compilation for that root;
- one deterministic smoke test proving the root can compile/import;
- a unique non-shipping sentinel in the platform root;
- one repository script to run the isolated smoke test;
- unchanged production entrypoint/build behavior;
- unchanged accepted production `main.js` hash and size;
- no runner, simulator, scenario model, production seam, guard, or metrics implementation yet.

## 3. Required Semantics and Invariants

- `test-platform/**` is verification infrastructure, not production source.
- Production `src/**` and the ordinary shipping bundle cannot depend on/include the platform root.
- The platform-root smoke surface proves physical/build separation only; it does not test synchronization semantics.
- No production code, existing product tests, PHX-CI integration, governance, or build scripts could be changed by this child.
- Generated test-platform output is disposable and must not pollute tracked repository state.

## 4. Fixed Historical Implementation Surface

The accepted child changed only:

- `test-platform/tsconfig.json`;
- `test-platform/src/platform-root.ts`;
- `test-platform/test/platform-root.test.ts`;
- `package.json`.

The platform sentinel was exactly `BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL`.

The final isolated build output used the already-ignored `.test-build/bvp/**` location.

## 5. Dependencies

This child depended on accepted S02 closure and the BVP physical-boundary contracts in BVP-ARCH-001 through BVP-ARCH-005.

## 6. Engineering Discretion

Within the fixed four-file surface, ordinary TypeScript/test implementation mechanics were discretionary provided the skeleton remained trivial, isolated, non-production, dependency-free, and free of later-stage platform functionality.

## 7. Material Edge / Failure Cases

The child would have failed if:

- isolated test compilation altered ordinary root TypeScript inclusion;
- production `main.js` changed or contained the sentinel/`test-platform`;
- generated platform output became an untracked/committed repository mutation that broke PHX-CI hygiene;
- implementation required a frozen build/source/governance edit;
- runner/simulator/scenario functionality was introduced early.

## 8. Acceptance Criteria

Acceptance required:

- the isolated root smoke test to pass through PHX-CI focused execution;
- typecheck/full test/build to pass;
- production `main.js` size `872862` and SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`;
- zero sentinel/`test-platform` occurrence in production bundle;
- exact four-path implementation change;
- no tracked/generated verification pollution;
- authoritative PHX-CI evidence publication.

## 9. Non-Goals

This child did not implement:

- architecture guard;
- architecture metrics/budgets;
- PHX-CI repository-check wiring;
- simulator/world;
- scenario DSL/runner/evidence;
- live-device agent or production seam.

## 10. Historical Completion

Accepted implementation: `a406c5a376fa7db04741b8cf1f38757ca26866eb`  
Accepted PHX-CI evidence: `28462b854f4cefbae6f385e67835f8e5f0539918`  
Accepted integration: `fdc5f8a0f72f57492eea10590cecfa7e80aa1ee6`

## 11. Stop

No work is authorized by this file.
