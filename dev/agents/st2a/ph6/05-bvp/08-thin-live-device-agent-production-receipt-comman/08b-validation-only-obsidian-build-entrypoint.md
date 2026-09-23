# 08B — Validation-only Obsidian build/entrypoint

## 0. Status


**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor child:** 08A

> **DO NOT EXECUTE THIS FILE AS-IS.** The supervisor must perform the dispatch binding in §2 against the actual accepted repository and change the maturity to EXECUTABLE.

## 1. Objective

Create a separate validation artifact/entrypoint under test-platform without changing ordinary shipping bundle.

Required end state:

> Validation build loads separately; production main.js excludes agent/transport/scenarios.

## 2. Dispatch Binding

Before execution the supervisor MUST replace this section with:

- exact accepted predecessor SHA;
- exact task branch name;
- exact current relevant files/types/interfaces/tests;
- exact writable-path allowlist;
- exact frozen retain/delete classifications;
- PHX-CI base authority and any existing focused-test command;
- confirmation that the child still satisfies DEC-325's size gate.

The worker may not perform this binding.

## 3. Fixed Boundaries

- Read and obey `../00-execution-contract.md` via the repository-relative shared contract `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md`.
- No GitHub Actions.
- No architecture/budget weakening.
- No use of `dev/archive/**` as design authority.
- No worker expansion of writable scope.
- No speculative future-stage implementation.
- If an unlisted edit appears necessary: BLOCKED, report, stop.

## 4. Implementation Contract

Implement only the capability described in §1 and the exact repository-grounded scope supplied in §2.

Ordinary private implementation mechanics are discretionary **only inside the dispatch-bound writable paths and frozen contracts**. This discretion never includes adding another runner/router/state machine/persistence/evidence/transport architecture or changing production synchronization semantics.

## 5. Verification and Acceptance

Before handoff, run relevant repository-native focused tests available in the execution environment and push the task branch.

Then stop at:

`READY FOR LOCAL PHX-CI VERIFICATION`

The task is not accepted until the installed PHX-CI deployed-runtime operator path verifies the remote task branch with publication mode `push`, canonical evidence is present, and the supervisor independently reviews it.

From accepted BVP-S03 onward, PHX-CI repository checks must include BVP architecture guard and metrics.

Do not create a child-specific PowerShell verifier.

## 6. Handoff

Report:

- exact input SHA;
- task branch and implementation SHA;
- exact changed paths;
- tests run by the worker;
- any blocker/deviation;
- explicit statement that no out-of-allowlist path was edited.

Do not merge/promote. Stop for PHX-CI and supervisor review.
