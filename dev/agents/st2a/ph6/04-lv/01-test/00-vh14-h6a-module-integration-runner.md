# VH14 — H6A Module Integration and Scenario Runner
## Codex Desktop Parallel / Interruption-Safe Orchestration Specification

Top-level supervisor: `agt-ca-p6-vh14-module-integration-runner-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required control/integration branch: `phase6-vh14-module-integration-runner`  
Canonical final evidence: `dev/evidence/_ca-output-agt-ca-p6-vh14-module-integration-runner-01.md`  
Orchestration manifest: `dev/evidence/vh14-orchestration-state.json`

This file supersedes the prior single-agent VH14 execution shape. The behavioral assignment is unchanged: integrate VH04–VH13 and implement the H6A validation scenario runner/state machine. The execution topology is changed so Codex Desktop can supervise bounded subagents, run independent work in parallel, and recover safely from arbitrary session termination or work-credit exhaustion.

---

## 1. Assignment and Required End State

Build one integrated validation runner that:

- enumerates exactly the frozen C03–F03 scenario IDs;
- starts one scenario or an ordered suite;
- persists validation run/scenario identity and current step;
- enforces prerequisites and fail-closed stop conditions;
- delegates work to the approved VH04–VH13 modules instead of reimplementing their semantics;
- supports `PASS`, `FAIL`, `BLOCKED`, `PAUSED-HUMAN-ACTION`, and `RESUMABLE`;
- resumes deterministically after permitted interruption/restart;
- uses the approved VH13 durable resume-adoption seam before checkpoint cleanup;
- produces one small fake/local canary proving lifecycle orchestration end-to-end;
- passes repository verification and produces complete canonical evidence.

VH14 MUST NOT implement a second synchronization engine, change frozen H0 semantics, modify `src/contracts/**`, promote/release the product, perform live validation, or begin VH15.

---

## 2. Authoritative Continuation State

### 2.1 Frozen base

Frozen VH03 / H0 base:

`74c6af589b2e0054f389ae6878339d1272edc47c`

### 2.2 Last accepted VH14 integration checkpoint before this orchestration refactor

`LAST_ACCEPTED_INTEGRATION_SHA = 692517b6aedd676a9903eae6fe970d861ff0dad9`

That checkpoint already contains the approved VH04–VH13 module integrations. Preserve it intact.

Known earlier VH14 merge checkpoints include:

- VH04 integration merge: `7ae491c5083e463633c6ba5adb81db9024530a1a`
- VH05 integration merge: `2e55c57352d9043b46669ad0d7897df1596152af`
- VH06 integration merge: `58f0c851c7fecb0214280ff98dd967324053c224`

VH07–VH13 were subsequently integrated, culminating in `692517b6aedd676a9903eae6fe970d861ff0dad9`, whose commit integrates the approved VH13 human-checkpoint/resume controller. The supervisor must reconstruct and record the existing VH07–VH13 integration merge commits from Git history, but MUST NOT redo those integrations.

Do not restart VH14 from VH03, do not replay VH04–VH13, and do not discard the accepted integrated substrate.

### 2.3 Approved remaining source heads

The supervisor MUST verify these exact source heads before execution:

- VH07 `phase6-vh07-plan-assertion-engine`  
  `bd73a0ce713d0993cf60b6fe6c5457f3dd5e9be8`
- VH08 `phase6-vh08-state-convergence-verifier`  
  `a119a741db2eb5f1c0f613490a94f6fb39f21e77`
- VH09 `phase6-vh09-evidence-recorder`  
  `733ed17eb3307bfdfd65a2c9032aff1c18f48b74`
- VH10 `phase6-vh10-transport-coverage-faults`  
  `f2e8be3228e84b89da0f18a448b0a1d73b810a2e`
- VH11 `phase6-vh11-state-ambiguity-cancel-faults`  
  `130fefa991e330fdaa9a3838f473183f6256d8ba`
- VH12 `phase6-vh12-cross-device-coordinator`  
  `8f6754239f41055d1862274490e2cc3812dba775`
- VH13 `phase6-vh13-human-checkpoint-resume`  
  `a27a3e94436f239cd1a84a30dfe316114678d7db`

Each branch's own evidence file MUST begin exactly `STATUS: COMPLETE`.

### 2.4 Orchestration-root rule

This tasking refactor is allowed to create a tasking-only commit above `LAST_ACCEPTED_INTEGRATION_SHA`.

At supervisor start:

1. `git fetch origin --prune`;
2. resolve `origin/phase6-vh14-module-integration-runner`;
3. verify `692517b6aedd676a9903eae6fe970d861ff0dad9` is an ancestor;
4. compare `692517b6aedd676a9903eae6fe970d861ff0dad9..origin/phase6-vh14-module-integration-runner`;
5. before orchestration bootstrap, permit only this tasking file to differ from the last accepted integration checkpoint.

If any product source, test, contract, evidence, or other repository file changed above `692517b6...` before the supervisor bootstrap described below, hard-stop and report drift.

Record the verified branch head as:

`ORCHESTRATION_ROOT_SHA = <resolved tasking-refactor head>`

---

## 3. Governing Authority and Frozen Boundaries

Before delegating work, the supervisor MUST read:

- the complete Phase 6 live-validation harness plan;
- DEC-301 through DEC-310;
- the Phase 6 build decomposition;
- the shared live-validation protocol;
- the frozen H0 contracts;
- VH04–VH13 evidence;
- the currently integrated VH04–VH06 code;
- this complete orchestration specification.

Authority and behavior remain those of the existing approved Phase 6 plan and frozen contracts.

### 3.1 Frozen surfaces

Do not change:

- `src/contracts/**`;
- frozen H0 semantics in:
  - `src/validation/run-sandbox-checkpoint-contracts.ts`
  - `src/validation/driver-plan-fault-verifier-contracts.ts`
  - `src/validation/coordination-evidence-contracts.ts`;
- approved VH04–VH13 module semantics merely to simplify orchestration.

### 3.2 Integration-only conflict authority

Only the authorized integration owner may resolve overlapping/barrel/integration conflicts. Parallel implementation agents may not edit another work package's owned file or silently redefine shared interfaces.

### 3.3 Physical-reality boundary

VH11 may preserve uncertainty but may not convert uncertainty into physical truth. Independent postcondition/physical observation remains owned by VH08. VH14 orchestration must preserve that boundary.

### 3.4 Resume-safety boundary

VH13's approved `HumanCheckpointResumeCommitPort` ordering is mandatory. Durable scenario-step adoption must complete successfully before checkpoint cleanup. A caller-supplied boolean/token may not substitute for the persistence operation.

---

## 4. Non-Negotiable Interruption / Work-Credit Exhaustion Contract

Assume the Codex Desktop supervisor or any subagent may terminate without warning after any command, including during edits, tests, merges, pushes, or evidence work.

The build MUST remain recoverable without conversational memory.

### 4.1 Repository state is authoritative

Accepted progress exists only when represented by:

1. an exact Git commit;
2. on the designated work-package branch;
3. with the work-package receipt/evidence recording that commit or with the supervisor manifest recording it after independent reconciliation.

Chat history, terminal output, an agent's memory, an uncommitted working tree, or an unrecorded claim is never authoritative progress.

### 4.2 Uncommitted work is expendable

Agents MUST checkpoint frequently enough that uncommitted work can be discarded after interruption without invalidating accepted progress.

On recovery, dirty uncommitted state MUST NOT be promoted automatically.

If an interrupted worktree is dirty:

- inspect it only to determine whether a previously completed checkpoint was merely not recorded;
- otherwise reset/clean back to the last recorded checkpoint for that work package and resume from there;
- do not infer completion from partially edited files.

### 4.3 No shared mutable worktree

Every parallel work package receives its own Git branch and worktree.

No two concurrent agents may write the same worktree.

The required VH14 control branch is supervisor-owned while parallel work is active.

### 4.4 No force-push recovery

Never force-push a work-package branch or the supervisor branch.

Checkpoint commits are append-only recovery anchors.

### 4.5 Push durable checkpoints

After every required checkpoint commit, push that work-package branch to `origin`.

A checkpoint is not considered durable for orchestration recovery until the commit is locally present and the push succeeds.

If push fails, retain the local commit, mark the package `BLOCKED` or `CHECKPOINTED_LOCAL_ONLY` in its receipt, and do not tell dependent agents that the checkpoint is durable.

### 4.6 Never leave an accepted shared merge half-complete

The supervisor and integration agents MUST perform merges one at a time.

After each successful merge/conflict resolution:

1. confirm no unmerged paths;
2. run `git diff --check`;
3. create the merge/integration checkpoint commit;
4. push it;
5. only then begin the next merge.

If interruption occurs with `MERGE_HEAD`, rebase state, cherry-pick state, or unresolved conflicts present, recovery MUST abort that in-progress operation back to the last durable checkpoint unless an exact completed commit already proves the operation finished.

### 4.7 No work-package branch deletion before VH14 final approval

Retain all VH14 subagent branches/worktrees or at least their pushed branches through final supervisory review.

Cleanup is outside this task unless separately authorized.

### 4.8 Checkpoint commits must be clean states

A required checkpoint commit MUST NOT contain:

- conflict markers;
- knowingly uncompilable TypeScript;
- temporary debugging code;
- unrelated file changes;
- partial evidence represented as complete;
- changes outside that work package's ownership.

Intermediate commits may be small, but they must be coherent recovery points.

---

## 5. Supervisor-Owned Durable Orchestration State

Immediately after the startup/recovery gate, the supervisor MUST create or reconcile:

`dev/evidence/vh14-orchestration-state.json`

Only the top-level supervisor may modify this file during parallel execution.

Parallel subagents MUST NOT edit it.

Minimum structure:

```json
{
  "schema": "vh14-codex-orchestration-v1",
  "orchestrationRootSha": "<sha>",
  "lastAcceptedIntegrationSha": "692517b6aedd676a9903eae6fe970d861ff0dad9",
  "supervisorBootstrapSha": "<sha>",
  "packages": {
    "A": {
      "status": "NOT_STARTED",
      "branch": "phase6-vh14-a-integration-substrate",
      "baseSha": "<sha>",
      "acceptedHeadSha": null,
      "evidencePath": "dev/evidence/_ca-output-agt-ca-p6-vh14a-integration-substrate-01.md"
    },
    "B": {
      "status": "BLOCKED_ON_A",
      "branch": "phase6-vh14-b-runner-core",
      "baseSha": null,
      "acceptedHeadSha": null,
      "evidencePath": "dev/evidence/_ca-output-agt-ca-p6-vh14b-runner-core-01.md"
    },
    "C": {
      "status": "BLOCKED_ON_A",
      "branch": "phase6-vh14-c-durable-resume",
      "baseSha": null,
      "acceptedHeadSha": null,
      "evidencePath": "dev/evidence/_ca-output-agt-ca-p6-vh14c-durable-resume-01.md"
    },
    "D": {
      "status": "BLOCKED_ON_A",
      "branch": "phase6-vh14-d-module-orchestration",
      "baseSha": null,
      "acceptedHeadSha": null,
      "evidencePath": "dev/evidence/_ca-output-agt-ca-p6-vh14d-module-orchestration-01.md"
    },
    "E": {
      "status": "BLOCKED_ON_A",
      "branch": "phase6-vh14-e-canary-regressions",
      "baseSha": null,
      "acceptedHeadSha": null,
      "evidencePath": "dev/evidence/_ca-output-agt-ca-p6-vh14e-canary-regressions-01.md"
    },
    "I": {
      "status": "BLOCKED_ON_BCDE",
      "branch": "phase6-vh14-i-integration-verify",
      "baseSha": null,
      "acceptedHeadSha": null,
      "evidencePath": "dev/evidence/_ca-output-agt-ca-p6-vh14i-integration-verify-01.md"
    }
  }
}
```

The supervisor may add fields for checkpoint SHAs, verification receipts, timestamps, merge SHAs, or blockers, but MUST NOT remove the minimum identity/base/head/status fields.

### 5.1 Manifest semantics

The manifest is durable orchestration state, not proof.

On every restart, reconcile it against actual Git refs, worktrees, and agent evidence before acting.

If the manifest says `COMPLETE` but the branch/evidence does not prove that state, downgrade the manifest.

If the branch/evidence proves a later valid checkpoint than the manifest, the supervisor may advance the manifest after verification.

### 5.2 Supervisor bootstrap commit

Create/reconcile the manifest on the VH14 control branch and commit it separately.

Record:

`SUPERVISOR_BOOTSTRAP_SHA = <commit containing reconciled orchestration manifest>`

Push the control branch.

Package A MUST branch from exactly `SUPERVISOR_BOOTSTRAP_SHA`.

---

## 6. Mandatory Recovery Gate on Every Supervisor Invocation

Before starting or resuming any agent:

1. fetch/prune origin;
2. verify the repository and required branch;
3. verify `LAST_ACCEPTED_INTEGRATION_SHA`;
4. locate the latest tasking/orchestration root;
5. inspect `git worktree list --porcelain`;
6. inspect each VH14 package branch;
7. inspect each package evidence file if present;
8. inspect for merge/rebase/cherry-pick/revert states;
9. reconcile `vh14-orchestration-state.json` against Git;
10. identify the latest durable checkpoint for each package;
11. resume only packages whose dependencies are satisfied;
12. never rerun a package already proven complete unless a later integration correction materially changes its owned contract/surface.

Do not ask the human supervisor to relay previous agent messages if repository state is sufficient.

---

## 7. Parallel Build Topology

Six bounded work packages are authorized.

```text
                         ┌───────────────┐
                         │ VH14-A        │
                         │ integration + │
                         │ runner seams  │
                         └───────┬───────┘
                                 │
          ┌──────────────────────┼──────────────────────┬──────────────────────┐
          │                      │                      │                      │
          v                      v                      v                      v
    ┌───────────┐          ┌───────────┐          ┌───────────┐          ┌───────────┐
    │ VH14-B    │          │ VH14-C    │          │ VH14-D    │          │ VH14-E    │
    │ core FSM  │          │ durable   │          │ module    │          │ canary    │
    │           │          │ resume    │          │ adapter   │          │ contract  │
    └─────┬─────┘          └─────┬─────┘          └─────┬─────┘          └─────┬─────┘
          │                      │                      │                      │
          └──────────────────────┴───────────┬──────────┴──────────────────────┘
                                             │
                                   ┌─────────v─────────┐
                                   │ VH14-I            │
                                   │ integrate/verify/ │
                                   │ final composition │
                                   └───────────────────┘
```

### 7.1 Allowed concurrency

After A is accepted, B, C, and D SHOULD run concurrently.

E SHOULD begin as soon as A is accepted and may run concurrently with B/C/D only for work that depends solely on A's frozen runner contracts. E must not guess B/C/D implementation details.

I may not begin until B, C, D, and E each have a pushed final work-package head and `STATUS: COMPLETE` evidence.

---

## 8. Agent Roster, Branches, Evidence, and Ownership

| Package | Agent | Branch | Primary ownership |
|---|---|---|---|
| A | `agt-ca-p6-vh14a-integration-substrate-01` | `phase6-vh14-a-integration-substrate` | integrated-substrate provenance verification, internal H6A runner contracts |
| B | `agt-ca-p6-vh14b-runner-core-01` | `phase6-vh14-b-runner-core` | pure runner state machine/lifecycle |
| C | `agt-ca-p6-vh14c-durable-resume-01` | `phase6-vh14-c-durable-resume` | durable runner state, restart reconstruction, VH13 adoption integration |
| D | `agt-ca-p6-vh14d-module-orchestration-01` | `phase6-vh14-d-module-orchestration` | adapter/delegation to VH04–VH13 modules |
| E | `agt-ca-p6-vh14e-canary-regressions-01` | `phase6-vh14-e-canary-regressions` | fake/local canary support and adversarial orchestration contract suite |
| I | `agt-ca-p6-vh14i-integration-verify-01` | `phase6-vh14-i-integration-verify` | B–E integration, composition root, barrel, executable canary binding, full verification |

Parallel agents MUST NOT edit files owned by another package.

---

## 9. Package A — Integrated-Substrate Verification + Frozen H6A Internal Contracts

### 9.1 Exact base

Branch/worktree from exactly:

`SUPERVISOR_BOOTSTRAP_SHA`

### 9.2 Verify the accepted VH04–VH13 integrated substrate

Package A does NOT re-merge VH04–VH13.

Before adding H6A contracts, verify that `LAST_ACCEPTED_INTEGRATION_SHA` is preserved in the Package A ancestry and that each approved VH07–VH13 source commit listed in §2.3 is already an ancestor of the accepted integrated substrate.

Also verify that the integrated `src/validation/index.ts` exposes the approved VH04–VH13 validation modules without changing frozen H0 semantics.

If any approved source head is absent from the accepted integration history, or if the integrated substrate contains a substantive unresolved conflict, stop `STATUS: BLOCKED`. Do not repair by replaying all predecessor work.

Record the existing integration merge SHAs for VH04–VH13 from Git history in Package A evidence.

### 9.3 Frozen internal runner contract seam

Add:

`src/validation/scenario-runner-contracts.ts`

and focused contract tests:

`test/validation-scenario-runner-contracts.test.ts`

This file is an H6A internal orchestration seam, not a change to frozen H0.

It MUST reuse frozen scenario/run/device/lifecycle vocabulary where available rather than redefining it.

Freeze only the minimum interfaces required for parallel B/C/D/E work, including as necessary:

- persistent runner state representation;
- scenario/suite definition and current-step identity;
- runner state-store interface;
- module-delegation interface/facade;
- orchestration result/stop-reason representation;
- restart/resume adoption inputs;
- factory/composition seams needed by the generic canary.

Do not implement runner behavior in this contract file.

### 9.4 Package A owned files

A may change only:

- `src/validation/scenario-runner-contracts.ts`;
- `test/validation-scenario-runner-contracts.test.ts`;
- its own evidence file.

A MUST NOT edit already-integrated VH04–VH13 implementation/test/evidence files or `src/validation/index.ts`.

If the accepted integrated substrate itself requires semantic repair, stop `STATUS: BLOCKED` and route the defect to supervisor review rather than folding an unreviewed predecessor repair into A.

### 9.5 Required A checkpoints

At minimum:

1. substrate/provenance verification receipt;
2. compile-clean H6A internal contract seam;
3. focused contract tests + final evidence.

Push after each checkpoint commit.

### 9.6 Package A acceptance

Run at minimum:

- focused contract tests;
- `npm run typecheck`;
- test TypeScript compilation if separately available;
- `git diff --check`.

Create a final A implementation checkpoint, push it, then create:

`dev/evidence/_ca-output-agt-ca-p6-vh14a-integration-substrate-01.md`

beginning exactly:

`STATUS: COMPLETE`

Record the accepted integrated substrate SHA, proof that all approved VH04–VH13 inputs are already integrated, reconstructed predecessor merge SHAs, contract files, commands/results, final A head/tree, and blockers.

---

## 10. Package B — Pure Runner Core / State Machine

### 10.1 Base

Start only after Package A is accepted.

Branch/worktree from exact accepted Package A head.

### 10.2 Ownership

Create:

- `src/validation/scenario-runner-core.ts`
- `test/validation-scenario-runner-core.test.ts`
- Package B evidence file.

Do not edit A/C/D/E/I-owned files or `src/validation/index.ts`.

### 10.3 Required behavior

Implement the deterministic runner lifecycle/state-machine core only.

It MUST:

- enumerate exactly the frozen C03–F03 scenario IDs through A's contracts;
- start one scenario;
- start an ordered suite;
- enforce valid lifecycle transitions;
- enforce prerequisite and stop-state semantics supplied through contracts;
- preserve run/scenario/current-step identity;
- represent `PASS`, `FAIL`, `BLOCKED`, `PAUSED-HUMAN-ACTION`, and `RESUMABLE`;
- stop a suite after a disallowed terminal result;
- never manufacture verifier/evidence success;
- remain free of filesystem/Drive/production-sync/module-specific semantics.

The core receives dependencies/interfaces; it does not instantiate VH04–VH13 modules.

### 10.4 Required B checkpoints

At minimum:

1. compile-clean runner skeleton + state types usage;
2. lifecycle/suite behavior;
3. focused tests + final evidence.

Push after each checkpoint.

### 10.5 Package B acceptance

Run:

- focused B tests;
- `npm run typecheck`;
- `git diff --check`.

Evidence:

`dev/evidence/_ca-output-agt-ca-p6-vh14b-runner-core-01.md`

First line:

`STATUS: COMPLETE`

---

## 11. Package C — Durable Runner State / Restart / VH13 Resume Adoption

### 11.1 Base

Start only after Package A is accepted.

Branch/worktree from exact accepted Package A head.

### 11.2 Ownership

Create:

- `src/validation/scenario-runner-durable-state.ts`
- `test/validation-scenario-runner-durable-state.test.ts`
- Package C evidence file.

Do not edit A/B/D/E/I-owned files or `src/validation/index.ts`.

### 11.3 Required behavior

Implement durable orchestration state behavior behind A's runner-state contracts.

It MUST:

- persist run ID, scenario ID, suite position, current step, and lifecycle state needed for deterministic reconstruction;
- fail closed on malformed or mismatched persisted state;
- support controller reconstruction after restart;
- preserve revision/CAS or equivalent stale-write protection consistent with existing validation contracts;
- integrate the approved VH13 resume-adoption seam;
- require durable/idempotent adoption of the exact run/checkpoint/resume-step tuple before VH13 checkpoint cleanup;
- make retry after adoption-success/cleanup-interruption safe;
- never treat conversation memory or UI state as durable run authority.

Do not implement the core state machine or module-specific operations.

### 11.4 Required C checkpoints

At minimum:

1. compile-clean store/reconstruction skeleton;
2. durable adoption/retry behavior;
3. focused restart/resume tests + final evidence.

Push after each checkpoint.

### 11.5 Package C acceptance

Run:

- focused C tests;
- `npm run typecheck`;
- `git diff --check`.

Evidence:

`dev/evidence/_ca-output-agt-ca-p6-vh14c-durable-resume-01.md`

First line:

`STATUS: COMPLETE`

---

## 12. Package D — Approved-Module Delegation / Orchestration Adapter

### 12.1 Base

Start only after Package A is accepted.

Branch/worktree from exact accepted Package A head.

### 12.2 Ownership

Create:

- `src/validation/scenario-runner-module-adapter.ts`
- `test/validation-scenario-runner-module-adapter.test.ts`
- Package D evidence file.

Do not edit A/B/C/E/I-owned files or `src/validation/index.ts`.

### 12.3 Required behavior

Implement the orchestration adapter/facade that delegates runner requests to approved VH04–VH13 modules.

It MUST preserve ownership:

- sandbox authority → VH04;
- fixture operations → VH05;
- production planning/execution/verify-reconcile → VH06;
- plan assertions → VH07;
- physical/state/convergence proof → VH08;
- evidence recording → VH09;
- transport/coverage faults → VH10;
- state ambiguity/cancellation faults → VH11;
- cross-device coordination → VH12;
- human checkpoint/resume → VH13.

It MUST:

- fail closed when a required delegated proof/result is missing;
- keep VH11 uncertainty unresolved until VH08 independent observation establishes physical reality;
- never bypass production planner/executor authority;
- never reinterpret an injected fault as proof of physical success/failure;
- expose only orchestration-level outcomes defined by A contracts.

Do not implement core lifecycle transitions or durable state storage.

### 12.4 Required D checkpoints

At minimum:

1. compile-clean adapter skeleton;
2. complete delegation/fail-closed behavior;
3. focused delegation/boundary tests + final evidence.

Push after each checkpoint.

### 12.5 Package D acceptance

Run:

- focused D tests;
- `npm run typecheck`;
- `git diff --check`.

Evidence:

`dev/evidence/_ca-output-agt-ca-p6-vh14d-module-orchestration-01.md`

First line:

`STATUS: COMPLETE`

---

## 13. Package E — Generic Fake/Local Canary + Adversarial Contract Suite

### 13.1 Base

Start after Package A is accepted.

Branch/worktree from exact accepted Package A head.

E may run concurrently with B/C/D but MUST depend only on A's frozen runner contracts.

### 13.2 Ownership

Create:

- `test/validation-scenario-runner-canary-suite.ts`
- any E-owned test-support file under `test/` required by that suite;
- Package E evidence file.

Do not edit A/B/C/D/I-owned files or `src/validation/index.ts`.

### 13.3 Required design

Create a reusable canary/contract suite that can be bound by Package I to the final integrated runner.

It must use fakes only for orchestration seams and MUST NOT duplicate synchronization behavior.

The canary suite must be capable of proving at least:

1. exact C03–F03 enumeration;
2. deterministic single-scenario advancement;
3. ordered-suite advancement only after allowed terminal result;
4. fail-closed prerequisite handling;
5. unexpected plan/assertion stops before mutation;
6. human-action pause persists the expected checkpoint/current step;
7. `RESUMABLE` resumes through durable VH13 adoption semantics;
8. reconstruction preserves run/scenario/step;
9. PASS cannot occur without required verifier/evidence success;
10. terminal failure blocks unauthorized subsequent execution;
11. module operations are invoked through the orchestration interfaces rather than implemented by the runner.

Because B/C/D may not yet exist on E's base, E MUST express this as a reusable contract test/canary factory against A's interfaces. It must not guess concrete B/C/D internals.

### 13.4 Package E checkpoints

At minimum:

1. compile-clean fake/module fixtures;
2. complete reusable canary/contract suite;
3. local contract/fake verification + final evidence.

Push after each checkpoint.

### 13.5 Package E acceptance

Run what is executable on A's contract surface:

- TypeScript/test compilation;
- any E-local contract/fake tests;
- `npm run typecheck`;
- `git diff --check`.

Do not falsely claim the final runner canary passed before Package I binds it to the integrated implementation.

Evidence:

`dev/evidence/_ca-output-agt-ca-p6-vh14e-canary-regressions-01.md`

First line:

`STATUS: COMPLETE`

Evidence MUST state explicitly that final executable canary acceptance remains an integration responsibility of Package I.

---

## 14. Package I — Final Integration, Composition Root, Executable Canary, Verification

### 14.1 Start gate

I may start only after the supervisor independently verifies:

- A/B/C/D/E branches exist;
- each is based on its authorized exact base;
- each has pushed final head;
- each evidence file begins `STATUS: COMPLETE`;
- each claimed changed-file set matches Git;
- no package changed another package's owned files;
- A's frozen H6A internal contracts were not modified by B/C/D/E.

### 14.2 Base

Branch/worktree from exact accepted Package A head.

### 14.3 Merge order

Integrate exact accepted heads in this order:

1. B
2. C
3. D
4. E

After EACH integration:

- resolve only integration conflicts;
- confirm no unmerged paths;
- `git diff --check`;
- commit;
- push Package I branch;
- record checkpoint/evidence.

Do not rewrite clean package histories.

### 14.4 Package I ownership

I owns only integration/composition surfaces, including as required:

- `src/validation/scenario-runner.ts` — final composition root;
- `src/validation/index.ts` — final approved exports;
- `test/validation-scenario-runner-integration.test.ts` — binding of E's generic canary to the real integrated runner;
- integration-only conflict resolutions;
- Package I evidence.

I MUST NOT redesign B/C/D behavior simply because another design is preferred.

If an actual agent-local defect is found, stop and route it to the owning package rather than repairing another package's implementation silently.

### 14.5 Final composition requirements

The integrated runner must demonstrate:

- B core lifecycle uses C durable state and D module delegation through A contracts;
- C's VH13 resume adoption is actually used by final runner resume;
- D preserves all module authority boundaries;
- E's canary is bound to the real integrated runner;
- no second synchronization engine exists;
- frozen H0 remains unchanged.

### 14.6 Final executable canary

Run E's canary against the real integrated runner and require all intended cases to execute and pass.

A zero-test/no-op binding is a blocker.

### 14.7 Repository verification

Run:

- focused VH14 integration/canary tests;
- `npm run typecheck`;
- test TypeScript compilation;
- complete automated test suite;
- `npm run build`;
- `npm run check`;
- `git diff --check`.

If the local execution environment cannot perform authoritative repository verification, use the previously accepted temporary draft-PR verification pattern against the exact Package I implementation tree.

If GitHub checks out a synthetic PR merge commit:

- record synthetic merge SHA;
- record synthetic merge tree;
- record Package I implementation tree;
- require exact tree equality;
- close the temporary PR unmerged afterward.

Any required failure leaves Package I/VH14 blocked.

### 14.8 Package I evidence

Create:

`dev/evidence/_ca-output-agt-ca-p6-vh14i-integration-verify-01.md`

First line:

`STATUS: COMPLETE`

Record package heads, integration commits/conflicts, implementation SHA/tree, executable canary result, full verification, exact-tree proof if applicable, deviations, and blockers.

Push final Package I evidence commit.

---

## 15. Supervisor Final Acceptance Closure

After Package I returns, the top-level supervisor MUST independently reconcile:

- manifest state;
- A–I branch heads;
- all six evidence files;
- changed-file ownership;
- exact integration history;
- frozen-contract preservation;
- final Package I implementation tree;
- verification/CI claims.

Do not accept subagent self-approval as final VH14 approval.

### 15.1 Canonical VH14 evidence

Only after the supervisor determines the complete parallel build is internally consistent and all required verification passed, update/create:

`dev/evidence/_ca-output-agt-ca-p6-vh14-module-integration-runner-01.md`

First line exactly:

`STATUS: COMPLETE`

Record at minimum:

- frozen VH03 base;
- `LAST_ACCEPTED_INTEGRATION_SHA`;
- `ORCHESTRATION_ROOT_SHA`;
- `SUPERVISOR_BOOTSTRAP_SHA`;
- approved VH04–VH13 source heads;
- all preexisting VH04–VH13 VH14 integration merge commits reconstructed from Git history;
- A/B/C/D/E/I final branch heads and trees;
- all Package I integration commits;
- all conflicts/resolutions;
- final integrated implementation SHA/tree;
- complete changed-file manifest;
- focused canary/integration results;
- full-suite result;
- typecheck/test-compile/build/check/diff results;
- CI workflow/run/job when used;
- exact-tree proof when synthetic merge verification was used;
- deviations/blockers;
- confirmation frozen H0 and `src/contracts/**` were unchanged;
- confirmation no promotion/release/live validation/VH15 work occurred.

Commit canonical VH14 evidence separately as an evidence-only commit on the required control branch after the final integrated implementation has been fast-forwarded/merged onto that branch under supervisor authority.

Do not delete subagent branches.

---

## 16. Restart / Resume Procedure After Abrupt Codex Halt

When Codex Desktop resumes after credit exhaustion, app termination, or supervisor replacement, execute this procedure before any new implementation work:

1. read this complete tasking file;
2. fetch/prune origin;
3. locate the required control branch;
4. verify `LAST_ACCEPTED_INTEGRATION_SHA` ancestry and preserve the already-integrated VH04–VH13 substrate;
5. inspect/reconcile `vh14-orchestration-state.json`;
6. enumerate all A/B/C/D/E/I remote branches;
7. read all existing package evidence files;
8. determine each package's latest pushed clean checkpoint;
9. inspect local worktrees for dirty/interrupted operations;
10. abort incomplete merges/rebases/cherry-picks to their last clean checkpoint;
11. never downgrade or redo a proven complete package merely because the prior Codex session ended;
12. restart only incomplete packages from their last durable checkpoint;
13. launch only dependency-unblocked agents;
14. continue the DAG automatically.

The human supervisor SHOULD NOT be required to copy/paste agent outputs between sessions.

If repository state is sufficient, Codex supervisor must reconstruct and continue autonomously.

---

## 17. Hard-Stop Conditions

Immediately stop and report `STATUS: BLOCKED` for the affected package if any of the following occurs:

- approved source branch head drift;
- required predecessor evidence is not `STATUS: COMPLETE`;
- frozen H0 or `src/contracts/**` requires semantic change;
- a parallel package changed another package's owned files;
- substantive integration incompatibility cannot be resolved without redesigning an approved module;
- physical uncertainty would need to be fabricated as certainty;
- resume safety would require deleting checkpoint state before durable adoption;
- required repository verification fails;
- exact-tree identity cannot be proven when synthetic-merge CI is used;
- package provenance/branch/base cannot be reconstructed reliably after interruption.

Do not invent authority to bypass a hard stop.

---

## 18. Final Stop

When canonical VH14 evidence is complete, return to the human supervisor with only the final build receipt:

- final VH14 implementation SHA;
- final implementation tree;
- canonical evidence/final branch HEAD;
- A/B/C/D/E/I final heads;
- reconstructed pre-refactor VH04–VH13 integration merge SHAs;
- B–E Package I integration SHAs;
- merge/conflict summary;
- exact final changed-file list;
- focused VH14 canary result;
- full-suite result;
- `npm run check` result;
- CI workflow/run/job if applicable;
- exact-tree identity result if applicable;
- remaining blockers.

Then stop.

Do not begin VH15.