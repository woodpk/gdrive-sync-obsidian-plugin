# VH14-I — Final Integration, Composition Root, Executable Canary, and Verification

Agent: `agt-ca-p6-vh14i-integration-verify-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Task type: `INTEGRATION / VERIFICATION`  
Required implementation branch: `phase6-vh14-i-integration-verify`  
Package evidence: `dev/evidence/_ca-output-agt-ca-p6-vh14i-integration-verify-01.md`

Receipt of this task is explicit Human Supervisor authorization to execute **VH14 Package I only**.

This standalone task is derived from and subordinate to:

- `dev/agents/st2a/ph6/04-lv/01-test/00-vh14-h6a-module-integration-runner.md`;
- the current supervisor reconciliation in `dev/evidence/vh14-orchestration-state.json`;
- all governing Phase 6 live-validation authorities and frozen H0 contracts.

The standalone task file and reconciliation manifest are persisted on supervisor branch `phase6-vh14-supervisor-recovery`. **Do not merge that supervisor branch wholesale into Package I.** Package I must branch from the exact accepted Package A head below.

---

## 1. Assignment

Integrate the independently completed VH14 Packages B, C, D, and E onto the exact accepted Package A substrate, implement only the final H6A composition/export/integration surfaces owned by Package I, bind Package E's reusable canary to the real integrated runner, execute final VH14 repository verification, record exact durable evidence, push all Package I checkpoints, and stop.

Package I is the final **integration owner**, not a redesign owner.

Do not begin VH15. Do not perform live validation. Do not package, release, promote, install, or mutate Google Drive.

---

## 2. Authoritative Reconciliation Gate

The cloud supervisor independently reconciled A–E and persisted `VERIFIED_READY_FOR_I` on supervisor recovery commit:

`bbf8fef95c3574cac303fb3c6daa967e964b0e9c`

Before modifying anything, execute `git fetch origin --prune` and independently confirm these exact remote package heads still resolve:

| Package | Branch | Accepted head |
| --- | --- | --- |
| A | `phase6-vh14-a-integration-substrate` | `e52b653a49490ebd1d7a8c456dad896de44dc4a7` |
| B | `phase6-vh14-b-runner-core` | `222ba6a39b13e7adf7f1be71bade9fa45373b902` |
| C | `phase6-vh14-c-durable-resume` | `65f533874861fd4454294bd632e71067d3b96ce7` |
| D | `phase6-vh14-d-module-orchestration` | `ba9d68cd5ca43bce8faf2162e1e390171d7fd837` |
| E | `phase6-vh14-e-canary-regressions` | `f4db2d7e1c9ff1e668338054ce36de245997372b` |

Confirm each package evidence file begins exactly `STATUS: COMPLETE`:

- A: `dev/evidence/_ca-output-agt-ca-p6-vh14a-integration-substrate-01.md`
- B: `dev/evidence/_ca-output-agt-ca-p6-vh14b-runner-core-01.md`
- C: `dev/evidence/_ca-output-agt-ca-p6-vh14c-durable-resume-01.md`
- D: `dev/evidence/_ca-output-agt-ca-p6-vh14d-module-orchestration-01.md`
- E: `dev/evidence/_ca-output-agt-ca-p6-vh14e-canary-regressions-01.md`

Confirm A is the exact merge base/ancestor of B, C, D, and E.

Hard-stop if any listed branch has drifted, any evidence status is not complete, provenance cannot be reconstructed, or a package contains changes outside its reconciled ownership.

---

## 3. Exact Base and Branch Gate

Package I base is exactly:

`PACKAGE_A_BASE_SHA = e52b653a49490ebd1d7a8c456dad896de44dc4a7`

Required Package I branch:

`phase6-vh14-i-integration-verify`

If the branch does not exist, create it from exactly `PACKAGE_A_BASE_SHA` in a dedicated worktree.

If it already exists because this task is resuming after interruption, do not recreate, reset, rebase, or force-push it. Reconstruct its last pushed clean checkpoint, inspect for interrupted Git operations, and resume only from durable repository state.

Before the first integration, require:

- `HEAD == PACKAGE_A_BASE_SHA` for a new branch;
- clean worktree;
- no `MERGE_HEAD`, rebase, cherry-pick, or revert state;
- no Package I source/test/evidence delta yet.

---

## 4. Frozen Contracts and Safety Boundaries

Package I MUST preserve without semantic modification:

- `src/contracts/**`;
- `src/validation/run-sandbox-checkpoint-contracts.ts`;
- `src/validation/driver-plan-fault-verifier-contracts.ts`;
- `src/validation/coordination-evidence-contracts.ts`;
- Package A's `src/validation/scenario-runner-contracts.ts`;
- approved VH04–VH13 module semantics;
- accepted Package B/C/D/E implementation semantics.

The following boundaries are mandatory:

1. **VH11/VH08 physical-reality boundary:** uncertainty may remain uncertain; only independent VH08 observation can establish physical postcondition truth.
2. **VH13 resume ordering:** exact durable runner-step adoption must complete before checkpoint cleanup. No boolean/token substitute is allowed.
3. **Proof authority:** ordinary operation completion does not manufacture verifier or evidence success.
4. **No second synchronization engine:** Package I composes approved validation modules; it does not implement production synchronization semantics.
5. **No silent agent-local repair:** if B, C, D, or E has a substantive semantic defect, stop Package I and report the exact owning package and blocker. Package I may make only integration/composition changes it owns.

---

## 5. Required Integration Order and Crash-Safe Checkpoints

Integrate the exact accepted package heads in this order:

1. B — `222ba6a39b13e7adf7f1be71bade9fa45373b902`
2. C — `65f533874861fd4454294bd632e71067d3b96ce7`
3. D — `ba9d68cd5ca43bce8faf2162e1e390171d7fd837`
4. E — `f4db2d7e1c9ff1e668338054ce36de245997372b`

For **each** integration separately:

1. merge only that exact accepted head;
2. resolve only mechanical/integration conflicts within Package I authority;
3. confirm no unmerged paths;
4. run `git diff --check`;
5. create/retain the merge commit as a durable checkpoint;
6. record the merge commit SHA and tree;
7. push `phase6-vh14-i-integration-verify` before starting the next integration.

Never squash, rebase, rewrite, or force-push the accepted package histories.

If interruption occurs mid-merge, recovery must abort the incomplete operation back to the last pushed Package I checkpoint unless an exact completed merge commit already proves completion.

---

## 6. Package I Ownership

Package I may create/modify only the final integration/composition surfaces and directly necessary integration fallout:

- `src/validation/scenario-runner.ts` — final H6A composition root;
- `src/validation/index.ts` — final approved validation exports;
- `test/validation-scenario-runner-integration.test.ts` — real integrated binding and Package E canary registration;
- `dev/evidence/_ca-output-agt-ca-p6-vh14i-integration-verify-01.md`;
- integration-only conflict resolutions, if any, required to combine accepted package heads without changing their semantics.

Package I MUST NOT edit B/C/D/E-owned implementation merely to make integration easier:

- `src/validation/scenario-runner-core.ts`;
- `src/validation/scenario-runner-durable-state.ts`;
- `src/validation/scenario-runner-module-adapter.ts`;
- Package E canary/support implementation;
- corresponding B/C/D/E focused tests/evidence;
- frozen H0/contracts.

If final integration proves one of those files needs a semantic correction, stop and return the defect to its owning package.

---

## 7. Current Accepted Package APIs to Compose

Package A freezes the public orchestration seams in `scenario-runner-contracts.ts`, including `ValidationScenarioRunner`, `ValidationScenarioRunnerDependencies`, `ValidationRunnerDurableStatePort`, `ValidationRunnerModuleFacade`, and `ValidationScenarioRunnerFactory`.

Package B provides:

- `ValidationScenarioRunnerCore`;
- `createValidationScenarioRunnerCore(...)`;
- immutable scenario-definition catalog support for deterministic fresh-process continuation.

Package C provides:

- `ValidationRunnerDurableStateController`;
- validating durable runner-state reconstruction/CAS;
- durable append-only exact VH13 resume-adoption journal;
- `commitResume(...)` semantics that durably move runner authority to the exact `running` resume cursor before returning for VH13 cleanup.

Package D provides:

- `ValidationRunnerModuleAdapter`;
- `createValidationRunnerModuleAdapter(...)`;
- fail-closed approved-module delegation and proof-authority enforcement.

Package E provides:

- `registerValidationScenarioRunnerCanarySuite(...)`;
- exactly 11 generic orchestration canary cases;
- optional binding hooks for the real Package C durable port and fresh-controller restart composition.

Use those accepted APIs. Do not invent parallel competing abstractions for the same roles.

---

## 8. Final Composition Root Requirements

Create `src/validation/scenario-runner.ts` as a narrow composition module. It must make the accepted B/C/D implementations usable together without moving their semantic ownership into Package I.

The final composition must provide a deterministic supported construction path in which:

- B is the lifecycle/state-machine implementation;
- C is the durable state/resume-adoption implementation;
- D is the approved-module facade implementation;
- VH13's existing resume controller remains the human-checkpoint cleanup authority;
- immutable scenario definitions can be supplied/rebound for restart continuation;
- callers supply physical durable stores and approved module delegates through explicit dependencies rather than hidden globals/process memory.

Ordinary naming/private helper mechanics are implementation discretion, but the composition surface must be small, typed, testable, and exportable through `src/validation/index.ts`.

Do not embed test fakes in production source.

---

## 9. Integration Test and Executable Canary

Create `test/validation-scenario-runner-integration.test.ts`.

It must bind Package E's reusable suite to the actual integrated runner implementation and register **all 11** E cases through:

`registerValidationScenarioRunnerCanarySuite(...)`

A zero-test/no-op registration is a blocker.

The binding must use the real Package B core. Where the canary contract exposes the durable-port hook, bind the real Package C `ValidationRunnerDurableStateController` over isolated in-memory backing stores implemented in test code. Supply the restart binding needed to prove fresh-controller deterministic continuation with the canonical immutable definition.

In addition to the 11 generic cases, include focused integration coverage sufficient to prove the production composition root actually wires D between B and approved module delegates rather than bypassing D. Use test doubles only behind D's documented approved-delegate/prerequisite seams; do not duplicate synchronization behavior.

Integration evidence must demonstrate:

- B uses C for durable runner state/resume adoption in the integrated binding;
- D is the module facade in the final composition path;
- E's full canary runs against the real runner implementation;
- VH13 durable-adoption-before-cleanup ordering remains observable;
- verifier/evidence proof authority remains distinct from operation acknowledgement;
- frozen H0 is unchanged.

---

## 10. Export Surface

Update `src/validation/index.ts` only as needed to export the accepted VH14 runner contracts/components/final composition without removing any approved VH04–VH13 exports.

At minimum, the final barrel must expose the intended public VH14 runner surface and must retain all existing approved validation exports.

Do not use the barrel update to alter module semantics.

---

## 11. Verification Gates

After integration/composition/test implementation, run from the Package I worktree:

1. restore locked dependencies with `npm ci` if dependencies are not already valid;
2. focused VH14 integration/canary tests, confirming a non-zero count and all 11 E canary cases execute;
3. `npm run typecheck`;
4. test TypeScript compilation (`tsc -p tsconfig.test.json` through the repository-local toolchain);
5. complete automated test suite: `npm test`;
6. `npm run build`;
7. `npm run check`;
8. `git diff --check` against the Package A base and final Package I state;
9. inspect the final changed-file manifest and frozen-surface diff.

`package.json` currently defines `npm run check` as typecheck + full test + build. Do not treat `check` alone as proof that the focused integrated canary registered the intended 11 cases; record the focused canary result separately.

Required frozen-surface diff must show no Package I semantic changes to:

- `src/contracts/**`;
- the three frozen H0 validation-contract files;
- Package A's `scenario-runner-contracts.ts`;
- accepted B/C/D/E implementation files except any explicitly documented mechanical merge resolution authorized by this task.

If local authoritative execution is unavailable, use the previously approved temporary draft-PR CI verification pattern against the exact Package I implementation tree. When GitHub tests a synthetic merge commit, record synthetic SHA/tree and require exact tree equality with the Package I implementation tree before accepting CI evidence; close the temporary PR unmerged afterward.

Any required failure leaves Package I incomplete.

---

## 12. Durable Checkpoints and Credit-Exhaustion Recovery

Assume the agent may terminate without warning.

At minimum push coherent checkpoints after:

1. B integration;
2. C integration;
3. D integration;
4. E integration;
5. compile-clean final composition/barrel;
6. executable integration/canary tests;
7. final verification/evidence closure.

Every checkpoint must be a coherent clean Git state. Do not leave knowingly broken TypeScript, conflict markers, unrelated changes, or false COMPLETE evidence in a pushed checkpoint.

If model/credit capacity ends before Package I is complete, push the latest coherent checkpoint and return exactly enough recovery information to resume:

`CONTINUATION REQUIRED — PACKAGE I NOT COMPLETE`

with:

- Package I branch;
- last pushed SHA/tree;
- accepted package integrations already completed;
- files changed since the last accepted package merge;
- verification completed/results;
- remaining Package I work;
- exact next executable action.

Do not represent a continuation checkpoint as completion.

---

## 13. Evidence Requirements

Create:

`dev/evidence/_ca-output-agt-ca-p6-vh14i-integration-verify-01.md`

The first line must be exactly:

`STATUS: COMPLETE`

Only write/commit final COMPLETE evidence after all Package I gates pass.

Record at minimum:

- exact Package A base;
- exact accepted B/C/D/E heads;
- B/C/D/E integration merge SHAs and trees;
- all integration conflicts and their resolutions, including `none` when applicable;
- final Package I implementation SHA and tree **before** evidence-only closure;
- complete Package I/integrated changed-file manifest relative to A;
- composition-root behavior and exports;
- focused integration result;
- explicit count/result for all 11 E canary cases;
- typecheck result;
- test TypeScript compilation result;
- complete `npm test` result;
- build result;
- `npm run check` result;
- `git diff --check` result;
- frozen-surface verification;
- CI workflow/run/job and exact-tree proof if CI was required;
- deviations;
- remaining blockers (`none` only if true).

Push the final evidence-only commit and record the resulting Package I branch head/tree in the completion response.

---

## 14. Hard Stops

Stop with `STATUS: BLOCKED` and do not paper over the condition if:

- any accepted A–E head has drifted;
- any required evidence is not `STATUS: COMPLETE`;
- A is not the verified common authorized base;
- integration reveals unauthorized package overlap;
- a substantive B/C/D/E defect requires editing that package's owned semantic implementation;
- frozen H0, Package A contracts, or `src/contracts/**` would need semantic change;
- VH11 uncertainty would need to be promoted to physical certainty without VH08 observation;
- VH13 cleanup would occur before exact durable runner adoption;
- the 11-case canary cannot be bound/executed against the actual runner;
- required test/typecheck/build/check verification fails;
- exact-tree identity cannot be established when synthetic-merge CI is used;
- provenance cannot be reconstructed safely after interruption.

Do not redesign around a hard stop.

---

## 15. Completion Response and Final Stop

When Package I is genuinely complete, return only a compact build receipt containing:

- Package I final branch head and tree;
- final implementation SHA/tree before evidence-only closure;
- exact B/C/D/E integration merge SHAs;
- conflict summary;
- exact changed-file manifest;
- focused integration/canary result, including 11/11 canary status;
- full-suite result;
- typecheck/build/check/diff results;
- CI run/job and exact-tree result if applicable;
- evidence path;
- remaining blockers.

Then stop.

Do not merge Package I into the supervisor/control branch. Do not create canonical VH14 final evidence. Do not begin VH15. Those are subsequent top-level supervisor responsibilities.