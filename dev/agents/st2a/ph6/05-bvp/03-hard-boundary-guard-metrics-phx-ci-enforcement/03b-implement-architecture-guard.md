# BVP-S03B — Implement Architecture Guard

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This prompt is the complete semantic contract for S03B. Corrections to an implementation must restore this contract; they must not extend the finish line with reviewer-invented requirements outside it.

## 1. Objective

Implement one durable, generic repository architecture guard that mechanically enforces the BVP production/test boundary and frozen-governance rules before substantial replacement-platform code is built.

The guard exists to answer a narrow question deterministically:

> Does the repository violate an architecture boundary that the BVP specification makes non-negotiable?

It is not a task verifier, linter framework, JavaScript parser project, build orchestrator, or replacement CI system.

## 2. Required End State

When S03B is complete:

- `dev/scripts/Test-TestingArchitectureGuard.ps1` exists as the single generic BVP architecture-boundary guard;
- the current compliant repository passes it;
- prohibited dependency, shipping, scenario-control, archive-authority, test-platform PowerShell, and changed-frozen-surface conditions fail deterministically;
- guard output identifies rule + offending path with enough detail for correction;
- deterministic tests exercise both required violations and important false-positive boundaries;
- an actual-repository baseline test invokes the real guard against the current BRAIN repository;
- `package.json` exposes one focused test command for S03B;
- no metrics/budget implementation or PHX-CI repository-check wiring is introduced yet.

## 3. Execution-Time Binding

The semantic contract above and below is prewritten and fixed. The supervisor binds only hard repository coordinates.

### Bound for the current execution line

- accepted predecessor / implementation input SHA: `fdc5f8a0f72f57492eea10590cecfa7e80aa1ee6`;
- task branch: `bvp-s03b-architecture-guard`;
- writable paths:
  - `dev/scripts/Test-TestingArchitectureGuard.ps1`;
  - `test-platform/test/architecture-guard.test.ts`;
  - `package.json`.

### Must be resolved from the actual target branch at verification time

- exact current target HEAD;
- exact `phx-ci.json` framework pin and deployed runtime;
- exact PHX-CI base authority;
- any branch-state evidence commits created after implementation.

Current S03B task-branch verification binding known at this rewrite:

- PHX-CI framework SHA: `3340380e11bac2a7d01a1207b12cc4da676001d7`;
- base authority: `origin/phase6-integration`.

The target branch's actual `phx-ci.json` remains runtime authority; if it changes through an explicitly accepted repin, verification follows the newly bound exact pin rather than stale prose.

No runtime rebind may change the behavior, invariants, edge cases, acceptance criteria, or non-goals in this prompt.

## 4. Governing Contracts

This child implements the S03 portion of:

- BVP-ARCH-001 through BVP-ARCH-008 as applicable to static repository boundaries;
- BVP-GOV-001, BVP-GOV-002, BVP-GOV-007, and the changed-surface aspect of BVP-GOV-009;
- BVP-MIG-004 archive inertness;
- BVP-INV-001, BVP-INV-002, BVP-INV-008, BVP-INV-010, BVP-INV-011, and BVP-INV-012.

The current machine-readable authority is `dev/governance/testing-platform-boundary.yaml`. The guard must honor its relevant root, approved-seam, forbidden-direction, frozen-surface, archive, and scenario-surface policy rather than silently defining a contradictory second policy.

## Dependencies

S03B depends on the accepted S03A physical `test-platform/**` root/shipping-isolation contract and the active machine-readable boundary manifest. It also depends on the existing production/build source class being the repository content the guard is designed to classify; if that source class changes materially before execution, hard repository coordinates may be rebound but the guard semantics in this contract remain fixed.

## 5. Required Guard Inputs and Result Semantics

The guard must support:

- repository-root input, with a safe default to the repository containing the script;
- optional changed-path input for change-class/frozen-surface enforcement;
- an explicit work-package/change class when necessary to distinguish ordinary work from a supervisor-authorized governance change;
- deterministic PASS when no applicable violation exists;
- deterministic nonzero exit when one or more applicable violations exist;
- concise machine/human-readable violation output containing at least rule identity and offending path.

The guard must be read-only. It MUST NOT fetch, checkout, reset, clean, stash, commit, push, create/remove worktrees, rewrite files, publish evidence, or otherwise mutate repository state.

If required boundary-manifest information is missing or malformed such that a required rule cannot be enforced safely, the guard fails closed rather than silently skipping that rule.

## 6. Required Behavior and Semantics

### 6.1 Production → test-platform dependency prohibition

Fail when an actual executable/type dependency originating in production `src/**` resolves into `test-platform/**`.

This includes applicable JavaScript/TypeScript dependency forms such as:

- static imports;
- type-only imports;
- re-exports / type re-exports using `from`;
- CommonJS `require(...)`;
- dynamic `import(...)`.

The rule is semantic, not raw-text matching. Text that merely resembles module syntax inside comments, ordinary string contents, regular-expression literals, or non-executable template-literal text is not a dependency. Executable expressions inside template interpolation remain executable code and therefore are evaluated normally for real dependencies.

Equivalent path spellings and relative traversal that resolve to the prohibited root must not bypass the rule.

### 6.2 Production shipping/build exclusion

Fail when ordinary production build entrypoints/configuration actually include or depend on `test-platform/**`, or when the built production `main.js` exists and contains the S03A non-shipping sentinel.

The guard should evaluate the verified production build/config surfaces appropriate to the repository; documentation or unrelated text mentioning `test-platform` is not itself a shipping violation.

### 6.3 No BVP scenario authority in production

Fail when production `src/**` introduces BVP/validation scenario identifiers, scenario-runner controls, scenario-specific execution controls, or other scenario orchestration authority prohibited by BVP-ARCH-004.

This rule targets actual BVP validation/scenario authority. Incidental ordinary words or unrelated product concepts must not become false violations merely because they contain generic terms such as "scenario".

### 6.4 Test-platform → production seam allowlist

Fail when an actual dependency from `test-platform/**` resolves into production `src/**` through a surface not approved by the architecture boundary manifest.

At the S03B contract state, the approved concrete production-import set is empty unless the current authoritative boundary manifest explicitly says otherwise.

Dependency recognition follows the same executable-syntax semantics as §6.1.

### 6.5 No PowerShell under test-platform

Fail when any `.ps1` implementation appears beneath `test-platform/**`.

BVP repository-level governance PowerShell belongs under the approved `dev/scripts/**` surface, not in scenario/platform implementation directories.

### 6.6 Archive inertness

Fail when an active BVP planning/tasking artifact treats `dev/archive/**` as current executable tasking, implementation authority, or design authority.

Do **not** fail merely because active documentation records historical migration, supersession, provenance, or the rule that the archive is non-authoritative.

The distinction is authority/use semantics, not mere string presence.

### 6.7 Frozen-governance changed-path enforcement

When changed paths are supplied for an ordinary/non-governance work package, fail if any supplied path falls within `supervisor_owned_frozen_surfaces` from the boundary manifest.

A governance exemption must be explicit; absence of an explicit authorized governance class must not silently authorize frozen-surface changes.

This rule evaluates the supplied change set. The guard does not invent/fetch its own Git comparison.

## 7. Material Edge Cases / False-Positive Boundaries

The implementation and tests must establish that architecture violations are based on actual semantics rather than textual coincidence.

At minimum cover:

### Must be ignored / PASS when otherwise compliant

- import/require-looking text inside single/double-quoted strings;
- import/require-looking text inside line/block comments;
- import/require-looking text in regular-expression literals;
- import/require-looking text in plain template-literal text;
- division expressions that contain no actual dependency;
- historical prose that mentions archived paths without treating them as current authority;
- harmless repository text containing generic scenario terminology.

### Must still be detected / FAIL

- static import resolving into a prohibited root;
- type-only import resolving into a prohibited root;
- re-export / type re-export resolving into a prohibited root;
- `require(...)` resolving into a prohibited root;
- dynamic `import(...)` resolving into a prohibited root;
- actual `require` / `import` inside executable `${...}` template interpolation;
- prohibited dependency after control-flow/declaration/block syntax where JavaScript permits a new expression statement;
- prohibited dependency near ordinary division expressions;
- path-normalized traversal into a prohibited root.

The goal is not to prescribe a custom lexer. The goal is to prove the chosen implementation distinguishes executable dependency syntax from non-executable text reliably for the repository's TypeScript/JavaScript source class.

## Invariants

- Production source never depends on `test-platform/**`.
- The ordinary production bundle never contains validation-platform implementation.
- Actual executable/type dependencies are distinguished from textual lookalikes.
- Archive history cannot become current implementation authority.
- Frozen supervisor-owned surfaces cannot change through ordinary work.
- Guard execution is read-only and fail-closed when required policy cannot be evaluated safely.
- The guard remains a repository architecture check, not a task verifier or second CI system.

## 8. Deterministic Test Contract

`test-platform/test/architecture-guard.test.ts` must invoke the real PowerShell guard.

Tests use disposable OS-temporary fixtures and must not add repository fixture trees.

Required cases include:

1. compliant synthetic baseline → PASS;
2. actual current BRAIN repository baseline → PASS;
3. production dependency on `test-platform/**` → FAIL;
4. production build input/reference that would include `test-platform/**` → FAIL;
5. production BVP scenario ID/control insertion → FAIL;
6. unapproved test-platform dependency on production `src/**` → FAIL;
7. PowerShell beneath `test-platform/**` → FAIL;
8. active archive-as-current-authority linkage → FAIL;
9. normal changed-path input touching frozen supervisor surface → FAIL;
10. historical archive prose → PASS;
11. representative executable-syntax vs textual-lookalike cases from §7.

Tests must assert meaningful guard result/diagnostic semantics, not merely that some process exited.

## 9. Engineering Discretion

The coding agent may choose the implementation strategy that most reliably satisfies this contract, including use of existing TypeScript/JavaScript parsing facilities, a bounded lexical approach, or another equivalent mechanism.

The prompt does **not** prescribe:

- a hand-written lexer;
- regex-based parsing;
- exact private functions;
- internal data structures;
- test helper organization;
- diagnostic wording beyond stable rule/path identification.

The chosen mechanism must be maintainable within BVP complexity budgets and must not introduce a new platform-level parsing/lint framework.

## 10. Fixed Boundaries

The worker may modify only the three bound paths in §3.

Frozen for this child include:

- all `src/**`;
- all existing `test/**`;
- all other `test-platform/**`;
- `dev/governance/testing-platform-boundary.yaml`;
- all other `dev/scripts/**`;
- planning/tasking/archive/evidence files;
- `scripts/**`;
- `tsconfig*.json`;
- `package-lock.json`;
- Taskfiles;
- `phx-ci.json`;
- `.gitignore`.

If correct implementation requires another path, return `BLOCKED`.

## 11. Verification / Acceptance Criteria

Worker-local handoff requires:

- required deterministic architecture-guard tests pass when PowerShell execution is available;
- the actual-repository baseline test remains enabled;
- package script `test:bvp-architecture-guard` compiles the existing test-platform project and executes only the emitted architecture-guard test;
- existing package scripts are not semantically changed;
- no out-of-allowlist path changed;
- unavailable materially relevant execution is reported as `NOT AVAILABLE IN THIS SESSION`.

Authoritative acceptance requires one PHX-CI run on the remote task branch with:

- focused command: `npm run test:bvp-architecture-guard`;
- full repository verification;
- canonical evidence publication;
- supervisor semantic review against this complete contract.

A functional PASS cannot waive a static contract violation discovered by review.

## 12. Non-Goals

Do not implement:

- architecture metrics or hard budget evaluation (03C);
- PHX-CI repository-check wiring (03D);
- simulator/world;
- scenario runner/DSL/evidence engine;
- production synchronization changes;
- production test seams;
- task-specific verifier scripts;
- GitHub Actions.

## 13. Handoff / Stop

Push the bounded implementation branch and report:

- exact input SHA;
- implementation SHA;
- actual changed paths;
- required positive/negative test results;
- actual-repository baseline result;
- focused command;
- unavailable checks;
- confirmation of no out-of-allowlist edits.

Stop at:

`READY FOR LOCAL PHX-CI VERIFICATION`

Do not merge/promote. Do not begin 03C.