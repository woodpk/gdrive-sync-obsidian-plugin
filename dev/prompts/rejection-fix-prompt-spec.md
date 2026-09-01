# REJECTION / FIX PROMPT SPECIFICATION — OWNERSHIP-BASED REPAIR ORCHESTRATION

## Purpose

This specification defines how a reviewer/supervisor converts a rejected build into the repair package and coding-agent work orders used to restore the build to its governing contracts.

The corrective output is **not a review report** and is **not a second diagnostic assignment**.

It is a **deterministic repair orchestration package** that:

- carries forward the reviewer's completed diagnosis;
- groups defects by shared invariants and code ownership;
- isolates shared writable surfaces;
- freezes interfaces between independent repair groups;
- executes independent groups in parallel when safe;
- serializes work that shares ownership or lifecycle authority;
- integrates completed repairs in dependency order; and
- performs acceptance/evidence closure only after implementation groups have integrated.

The governing division of labor is:

> **Reviewer diagnoses. Supervisor decomposes and freezes repair boundaries. Coding agents implement bounded repair groups. Integration/closure verifies the combined contract.**

The objective is to reduce serial reject/fix cycles without creating merge conflicts, duplicated diagnosis, competing fixes, or architecture drift.

---

## Authority Relationship

The repair package is a delta over authorities the coding agents already have, including:

- the original governing build prompt;
- authoritative project specifications;
- frozen contracts and architecture boundaries;
- the coding-agent implementation bootstrap; and
- the current repository.

Do not reproduce those authorities unless a concise identifier or excerpt is necessary to make a correction unambiguous.

A repair package may restore confirmed defects. It may not redefine the original build contract, add product requirements, or turn a rejection into open-ended redesign.

---

## Core Repair Doctrine

The repair process MUST follow these principles.

1. **Diagnosis is completed before dispatch.** Do not send coding agents back to rediscover approval blockers already established by review.
2. **Group by invariant and ownership, not by arbitrary error count.** Defects that share the same governing invariant, state lifecycle, orchestration owner, or tightly coupled code surface belong in one repair group.
3. **Parallelize only independent writable surfaces.** Separate groups may run concurrently only when their write ownership and semantic contracts are sufficiently isolated.
4. **Freeze boundaries before parallel work.** Shared interfaces, public contracts, data shapes, orchestration semantics, and cross-group assumptions must be fixed before dependent groups execute.
5. **One owner per shared orchestration surface.** Two parallel agents MUST NOT independently modify the same controller lifecycle, orchestration authority, state transition owner, or other shared decision-making code.
6. **Use waves when dependencies exist.** A group that consumes a contract another repair group must change waits until that contract is established and integrated.
7. **Integrate before acceptance closure.** Acceptance/evidence work validates the combined repaired build. It does not redesign implementation or independently invent fixes.
8. **Repair only what blocks approval.** Optional improvements and unrelated cleanup remain excluded.
9. **Capacity-size every coding-agent assignment.** Scope each dispatched work order or repair unit to work the target agent/model can reasonably implement, verify, evidence, and report within one model turn. A semantically coherent repair may be divided into serial, resumable units when one combined assignment would exceed that capacity.

Generate the smallest repair package that completely restores conformance, while also capacity-sizing each coding-agent assignment so the package is realistically executable rather than merely logically well grouped.

---

## Repair Orchestration Algorithm

Before drafting coding-agent work orders, perform the following sequence.

### Step 1 — Normalize the Rejection Surface

List every independent approval-blocking defect established by review.

For each defect, identify:

- exact file and code location;
- violated contract, requirement, invariant, or acceptance condition;
- required post-repair behavior;
- directly affected call sites/tests;
- likely writable code surface; and
- any other defect that shares the same semantic cause or owner.

Do not include optional improvements.

### Step 2 — Consolidate Shared-Cause Defects

When multiple observed failures are corrected by one coherent code change or one governing invariant, consolidate them.

Do not create separate groups merely because the reviewer observed multiple symptoms.

Do not combine genuinely independent defects merely to reduce group count.

### Step 3 — Group by Shared Invariants and Code Ownership

Partition the remaining defects into the minimum coherent repair groups.

A repair group should normally own one tightly related semantic/code surface, such as:

- one planner/execution authority;
- one recovery/state lifecycle;
- one content-integrity/materialization subsystem;
- one synchronization-scope/configuration policy surface;
- one external integration/error-semantics boundary; or
- another similarly cohesive ownership area established by the actual repository.

The current defect taxonomy is evidence for decomposition, not a permanent hard-coded architecture. Derive groups from the actual rejected build.

### Step 4 — Build the Repair Dependency and Ownership Map

For every group, determine:

- files/types/modules it may modify;
- contracts/invariants it owns for the repair;
- shared files or orchestration surfaces it touches;
- contracts it consumes from other groups;
- contracts it changes for other groups;
- whether it can execute independently;
- whether it must precede or follow another group.

If two proposed groups would independently modify the same shared orchestration/controller/state-lifecycle surface, they are not parallel-safe as currently defined.

Resolve that conflict by one of:

1. merging them into one repair group;
2. assigning the shared surface to a single owner and freezing the interface consumed by the other group; or
3. serializing the dependent group after the owning group integrates.

Do not rely on later merge-conflict resolution to reconcile competing semantic ownership.

### Step 5 — Freeze Cross-Group Boundaries

Before dispatching parallel work, explicitly freeze every boundary required by more than one group.

Freeze only what is necessary, such as:

- public/interface signatures;
- record/schema shapes;
- state-machine transitions;
- ownership of shared files;
- event/result semantics;
- IDs and enum meanings;
- planner/executor handoff semantics;
- persistence or cursor commit contracts;
- other cross-group assumptions.

A coding agent may implement behind a frozen boundary but may not redefine it locally.

If a required boundary cannot be established from governing authority and repository inspection, do not parallelize the dependent work until it is resolved.

### Step 6 — Classify Execution

Assign each group one execution classification:

- **PARALLEL-SAFE** — may run concurrently with the identified peer groups;
- **SERIAL-PREREQUISITE** — must integrate before one or more dependent groups begin;
- **SERIAL-SHARED-OWNER** — owns a shared orchestration/lifecycle surface and must not run concurrently with another group that would modify it;
- **INTEGRATION/CLOSURE** — runs only after implementation groups are integrated.

Parallelism is an optimization, not a requirement. Do not create parallel groups when the coordination overhead exceeds the repair benefit.

### Step 7 — Capacity-Size and Generate Bounded Work Orders

After semantic grouping and ownership are established, perform **capacity-sizing** before dispatch. The repair group is the semantic/ownership unit; the coding-agent work order is the executable unit. They do not have to be the same size.

Estimate the work reasonably required for the target agent/model to complete the assignment, including:

- repository inspection needed to implement the known repair;
- implementation across the owned surface;
- directly necessary consequential edits;
- targeted and repository-level verification;
- likely correction/debug iteration after verification;
- evidence and completion reporting.

A work order is oversized when it reasonably appears to require multiple substantial implementation-debug-verification cycles beyond what the target agent/model can complete within one model turn. Do not dispatch an oversized work order merely because all included defects share one owner or invariant.

When a coherent repair group is oversized, divide it into the minimum number of **serial, resumable repair units** that preserve the same owner, frozen boundaries, governing invariant, and dependency chain. Capacity-sizing MUST NOT be used to fragment one causal correction into arbitrary micro-tasks or to create new semantic owners.

Each dispatched work order or repair unit must contain only the information its coding agent needs to implement that executable unit correctly:

- owned scope;
- frozen boundaries it must preserve;
- exact corrections assigned to the unit;
- directly necessary consequential edits;
- available verification;
- evidence/completion requirements appropriate to the unit;
- dependencies on earlier repair units, if any;
- explicit stopping condition.

For a multi-unit repair, state explicitly that:

- completion of the current unit is not completion of the overall repair;
- later units MUST consume the actual supervisor-approved repository state produced by the prior unit;
- the agent MUST NOT begin a later unit before its stated gate; and
- canonical acceptance/evidence closure occurs only at the unit designated for final closure.

If the agent reaches practical turn capacity before its assigned unit is complete, it must not represent the unit or repair as complete. It must preserve a resumable checkpoint and report:

`CONTINUATION REQUIRED — WORKSTREAM NOT COMPLETE`

The checkpoint must identify the current branch/SHA or equivalent state, completed work, remaining assigned work, current verification/failures, and the exact next executable action. This capacity-exhaustion continuation is distinct from a contract/ownership blocker and does not authorize redesign or scope expansion.

Do not give a coding agent authority over another group's owned surface.

### Step 8 — Execute in Dependency-Safe Waves

Dispatch all PARALLEL-SAFE groups in the same wave.

Wait for prerequisite/shared-owner groups to integrate before dispatching dependent groups.

A later wave must consume the actual integrated repository state, not assumptions from the original rejection.

### Step 9 — Integrate Repairs

After a wave completes:

- inspect the actual changed files;
- reconcile work against frozen boundaries;
- resolve only mechanical integration conflicts within established authority;
- do not silently choose between competing semantic implementations;
- return a semantic conflict to the responsible owner or supervisor if integration reveals the boundary was not actually frozen.

### Step 10 — Acceptance and Evidence Closure

Only after all implementation groups have integrated, perform acceptance/evidence closure.

The closure owner must:

- verify the integrated build against the rejected build's governing contracts;
- verify that repair groups did not violate one another's frozen boundaries;
- inspect directly affected acceptance tests/evidence;
- perform the strongest verification actually available in the current ChatGPT environment;
- identify any remaining approval blocker;
- update the canonical `dev/evidence/_ca-output.md`.

The closure function tests the contract. It MUST NOT redesign implementation merely because a different solution is preferred.

If closure finds a concrete remaining defect, route it back to the owning repair group or create a new narrowly bounded repair group. Do not convert closure into an unbounded implementation pass.

---

## Parallelism Safety Rules

Parallel repair is permitted only when all of the following are true:

- each parallel group has distinct writable ownership, or shared access is read-only;
- any shared contract is frozen before work begins;
- no two groups independently own the same state transition or orchestration decision;
- one group's implementation does not require guessing the result of another group's unfinished work;
- integration order is defined where needed; and
- the supervisor can identify which group owns any defect discovered at the boundary.

Parallel repair is prohibited when two agents would independently modify:

- the same controller lifecycle;
- the same planner/executor policy decision;
- the same authoritative state-transition owner;
- the same persistence commit protocol;
- the same public contract without a pre-frozen replacement; or
- another shared semantic authority where competing edits could overwrite or reinterpret one another.

When in doubt, prefer one coherent owner over unsafe parallelism.

---

## Capacity-Sizing and Resumable Repair Units

Capacity-sizing is a dispatch-safety rule, not a new defect taxonomy and not a substitute for ownership-based decomposition.

Apply these rules:

- **Preserve semantic grouping first.** Diagnose and group defects by causal invariant and ownership before considering turn capacity.
- **Size the executable unit second.** If the coherent group exceeds one-turn capacity for the target agent/model, split execution into serial units without changing the repair's semantic owner.
- **Match the target agent/model.** Capacity-sizing must reflect the capabilities of the actual agent/model receiving the prompt; do not assume all models can reliably execute the same amount of repository inspection, implementation, debugging, verification, and evidence work in one turn.
- **Prefer resumable boundaries.** Split at boundaries where a unit can produce a coherent repository state with objective verification and a deterministic next step.
- **Do not precompute stale later mechanics.** A later unit must be finalized against the actual state produced and approved by the earlier unit when implementation details can change. Its governing objective and frozen boundaries may be specified in advance, but stale file/SHA/mechanical assumptions must be refreshed before dispatch.
- **Keep final closure singular.** Intermediate units may update dedicated/unit evidence as authorized, but canonical acceptance evidence must remain reserved for the final closure owner/unit unless higher authority requires otherwise.
- **Distinguish completion, continuation, and blocker.** A unit ends in exactly one relevant state: completed and ready for its gate; continuation required because turn capacity ended before completion; or blocked by an actual ownership/contract/authority condition requiring supervisor action. Known unfinished in-scope work is never a valid completed stop.

Capacity-sizing should reduce premature agent termination without weakening acceptance criteria, omitting verification, moving work to the supervisor, or accepting partial implementation as completion.

---

## No Diagnostic Redelegation

Do not instruct coding agents to:

- investigate why a confirmed defect exists;
- determine the root cause already established by review;
- repeat a broad subsystem review to discover what is wrong;
- decide which invariant applies when authority already establishes it;
- choose among materially different product/architecture repairs when the reviewer can determine the required result;
- rediscover known affected call sites merely to recreate reviewer work; or
- redesign the solution.

The coding agent may inspect surrounding code as necessary to implement the prescribed repair and discover mechanical fallout.

That inspection does not reopen the diagnosis or the repair boundary.

---

## Correction Specificity Hierarchy

For each correction, use the highest level of determinism the reviewer can safely establish.

### Level 1 — Exact Replacement or Patch

Use exact replacement code or a precise patch when:

- the defect is localized;
- sufficient surrounding code has been inspected;
- the required implementation is unambiguous; and
- prescribing the code does not invent an unauthorized decision.

This is preferred because it minimizes interpretation variance.

### Level 2 — Exact Structural Repair

Use this when the required resulting structure and semantics are known but several mechanically equivalent implementations are valid.

Specify:

- exact affected file/member/contract;
- exact invalid state or behavior;
- exact required resulting state;
- invariant/enforcement boundary;
- directly affected callers/tests; and
- objective acceptance condition.

Leave only ordinary mechanics to the coding agent.

### Level 3 — Concrete Behavioral Repair

Use this only when the reviewer can prove the current implementation is wrong and define the required behavior but cannot responsibly prescribe internal structure.

Still identify the defective code, required behavior, relevant constraints, verification, and stopping condition.

Never use vague instructions such as "investigate", "fix properly", or "make robust".

---

## Mandatory Versus Consequential Edits

Each group work order may distinguish:

### Mandatory Edits

The exact code/contract changes the reviewer has determined must occur.

### Consequential Edits

Only edits directly required because of the mandatory repair, such as:

- compile-fallout call-site updates;
- interface implementation updates;
- serialization/mapping updates;
- directly affected tests;
- imports/types mechanically required by the change.

Consequential edits do not authorize unrelated refactoring, redesign, or speculative cleanup.

If consequential edits would cross into another group's owned surface, the coding agent MUST NOT make them independently. Surface the dependency to the supervisor/owner instead.

---

## Verification Capability Rule

Coding agents operate in customer-facing ChatGPT sessions.

Do not assume access to:

- a local developer shell;
- Node/npm/npx;
- package-manager commands;
- PowerShell;
- IDE task runners;
- arbitrary process execution;
- local build/typecheck/lint/test commands.

Require the strongest verification actually available in the specific session.

Prefer, as applicable:

1. direct inspection of modified code;
2. repository search of affected call sites/contracts/imports/interfaces/schemas/tests;
3. static semantic verification against the stated contract;
4. structural repository checks proving rejected patterns are removed and required patterns are present;
5. targeted execution only when an appropriate execution capability is actually exposed;
6. inspection of accessible existing CI/build/test results.

Do not order a command merely because it would be customary on a developer workstation.

If a materially relevant dynamic check cannot be performed, record:

`NOT AVAILABLE IN THIS SESSION`

Do not label unavailable tooling as a failed repair, and do not obscure the limitation with a bare `NOT EXECUTED`.

---

## Evidence Ownership and `dev/evidence/_ca-output.md`

`dev/evidence/_ca-output.md` remains the canonical build/correction evidence consumed by the next review.

### Single-Group or Serial Repair

When only one implementation group owns the correction pass, that coding agent MUST update `dev/evidence/_ca-output.md` before completion with:

- corrections implemented;
- complete created/modified/deleted file manifest;
- verification actually performed and results;
- materially relevant unavailable dynamic checks labeled `NOT AVAILABLE IN THIS SESSION`;
- remaining blockers or limitations.

`dev/evidence/_ca-output.md` itself must appear in the manifest.

### Parallel Repair

Parallel implementation agents MUST NOT all edit `dev/evidence/_ca-output.md`.

For a multi-group repair run:

- reserve `dev/evidence/_ca-output.md` to the designated integration/closure owner;
- implementation groups report their own change manifests and verification in their completion responses;
- no parallel group modifies `_ca-output.md` unless explicitly designated as its sole owner;
- after integration, the closure owner reconstructs the actual integrated change set and updates `dev/evidence/_ca-output.md` once with the complete repair-run evidence.

The final canonical evidence must identify:

- repair groups completed;
- integrated files created/modified/deleted;
- verification actually performed and results;
- materially relevant unavailable checks;
- integration/closure findings;
- remaining blockers or limitations.

This rule prevents a shared evidence file from becoming a parallel-write collision while preserving `_ca-output.md` as the authoritative review entry point.

---

## Repair Work-Order Content Rule

Every instruction in a coding-agent work order must help the agent do at least one of the following:

1. identify the exact code/contract it owns;
2. implement an exact correction;
3. preserve a frozen boundary or defect-specific constraint;
4. handle directly necessary fallout within its ownership;
5. verify the correction using available capabilities;
6. report completion/evidence needed for integration.

If content does none of these things, exclude it.

Do not include reviewer narrative, files that passed, optional improvements, generic coding advice, repeated specifications, or general explanations of the review process.

---

## Required Repair Package Structure

A multi-group repair package must use these top-level sections in this order:

1. `REJECTION`
2. `REPAIR TOPOLOGY`
3. `FROZEN BOUNDARIES`
4. `GROUP WORK ORDERS`
5. `INTEGRATION AND ACCEPTANCE CLOSURE`
6. `FINAL STOP`

For a single coherent repair group, the package may omit empty topology complexity, but it must preserve the same ownership, correction, verification, evidence, and stopping principles.

If capacity-sizing requires multiple serial units within one coherent repair group, keep the group identity and ownership stable while issuing independently executable unit work orders. Do not force all units into one oversized agent prompt solely because they share one owner.

---

## Group Work-Order Requirements

Each implementation group must have a stable ID such as `G1`, `G2`, etc.

If capacity-sizing divides one implementation group into multiple serial repair units, use stable unit identifiers such as `G1-U1`, `G1-U2`, etc. The group remains the semantic/ownership unit; unit IDs identify bounded execution slices only.

Each group work order or capacity-sized repair unit must state:

- **OWNERSHIP** — files/types/modules/semantic authority the group may modify;
- **EXECUTION CLASS** — PARALLEL-SAFE, SERIAL-PREREQUISITE, or SERIAL-SHARED-OWNER;
- **DEPENDENCIES** — groups/contracts that must exist first, if any;
- **FROZEN BOUNDARIES** — interfaces/semantics the group consumes but may not redefine;
- **CORRECTIONS** — concrete defects and required repairs;
- **VERIFICATION** — strongest available group-specific checks;
- **COMPLETION RESPONSE** — change manifest, checks/results, unavailable checks, blockers;
- **STOP** — stop after the assigned group or unit is complete.

For a multi-unit repair, each unit must additionally state:

- **UNIT POSITION** — e.g. Unit 1 of 2;
- **START GATE** — the exact predecessor approval/state required before this unit begins;
- **OVERALL REPAIR STATUS** — explicit statement that unit completion does not equal overall repair completion until the final unit/closure passes;
- **CONTINUATION RESPONSE** — the required resumable checkpoint format if turn capacity ends before the unit is complete.

For each correction include:

- exact file;
- exact location;
- defect;
- violated authority/contract;
- required change;
- exact replacement/patch when safely determinable;
- directly necessary related changes;
- defect-specific constraints;
- objective acceptance condition.

Do not mechanically include empty optional fields.

---

## Integration and Acceptance Closure Requirements

The integration/closure owner must have explicit ownership of the integration pass.

It must:

- consume the actual repository after repair groups complete;
- verify frozen boundaries were preserved;
- inspect all changed files across the repair run;
- reconcile the integrated change manifest;
- perform only mechanical integration edits unless separately authorized to repair a discovered semantic defect;
- perform the strongest available acceptance verification;
- inspect directly relevant acceptance tests/evidence;
- update `dev/evidence/_ca-output.md`;
- report any remaining blocker to the responsible group/owner.

The closure owner MUST NOT:

- redesign repaired subsystems;
- replace a compliant implementation with a preferred one;
- reopen optional improvements;
- silently fix a semantic ownership conflict across groups; or
- declare approval on behalf of the independent reviewer.

---

## Exact-Code Guidance

Provide actual replacement code whenever doing so is safer and more deterministic than prose.

Exact code is especially appropriate for localized defects involving:

- conditionals;
- constructors/factories;
- signatures;
- mappings;
- schema/configuration definitions;
- invariant enforcement;
- serialization/deserialization;
- state transitions;
- cursor/checkpoint commit ordering;
- identity mapping;
- path/normalization logic;
- merge/conflict classification;
- deletion safeguards;
- authorization checks;
- unambiguous test setup/assertions.

Do not provide pseudocode when exact code is already known.

Do not force an exact patch when it would invent architecture, override legitimate engineering discretion, or cross an unfrozen group boundary.

---

## What Must Be Excluded

Unless directly necessary to implement, constrain, integrate, or verify a confirmed repair, exclude:

- review-process narrative;
- descriptions of passing code;
- optional improvements;
- speculative future work;
- generic architecture advice;
- repeated copies of governing prompts/specifications;
- generic cautionary language;
- self-scoring or self-approval instructions;
- unrelated cleanup/refactoring;
- later-phase functionality;
- duplicated symptoms already covered by one correction;
- acceptance-suite redesign of implementation.

---

## Output Formatting

The finished repair package must be a well-formed Markdown document inside one outer four-backtick Markdown fence.

Inside the package:

- use exactly one level-1 `#` heading at the top;
- use a consistent Markdown heading hierarchy;
- use three-backtick fences only for nested replacement code;
- do not place commentary outside the repair package.

---

## Canonical Corrective Repair Package Shape

Use the following shape. Omit optional fields or unused groups, but preserve the hierarchy and ownership semantics.

````markdown
# REJECTION / FIX REPAIR PACKAGE

## REJECTION

Build rejected for <correction/group IDs>.

## REPAIR TOPOLOGY

### G1 — <repair group name>

- **Execution class:** <PARALLEL-SAFE | SERIAL-PREREQUISITE | SERIAL-SHARED-OWNER>
- **Owns:** <files/types/semantic surface>
- **Depends on:** <group/contract or none>
- **May run with:** <parallel-safe groups or none>

### G2 — <repair group name>

- **Execution class:** <...>
- **Owns:** <...>
- **Depends on:** <...>
- **May run with:** <...>

## FROZEN BOUNDARIES

- <shared interface/contract/semantic boundary that no group may redefine>
- <shared ownership rule>
- <dependency boundary>

## GROUP WORK ORDERS

### G1 — <repair group name>

#### Scope

Modify only <owned surface> and directly necessary fallout within that ownership.

Do not modify another group's owned surface or redefine the frozen boundaries.

#### Corrections

**C1 — <short defect name>**

- **File:** <exact path>
- **Location:** <exact member/type/region>
- **Defect:** <what the current code does incorrectly>
- **Violated contract:** <requirement/invariant/build contract>
- **Required change:** <exact post-repair behavior/structure>
- **Replacement:** <exact patch/code when safely determinable>
- **Related changes:** <directly necessary fallout within this group>
- **Constraints:** <defect-specific constraints only>
- **Acceptance:** <objective completion condition>

#### Verification

Perform the strongest correction-specific checks available in the current ChatGPT session:

- <available targeted verification>
- <available targeted verification>

For materially relevant dynamic checks that are unavailable, record `NOT AVAILABLE IN THIS SESSION`.

#### Completion Response

Return:

- correction IDs completed;
- complete files created/modified/deleted manifest for G1;
- verification actually performed and observed results;
- unavailable materially relevant checks;
- any boundary dependency, blocker, or limitation.

Do not modify `dev/evidence/_ca-output.md` during a parallel repair run unless G1 is explicitly designated as its sole owner.

#### Stop

Stop when G1 and directly necessary in-group fallout are complete and verified.

### G2 — <repair group name>

<same bounded work-order structure>

## INTEGRATION AND ACCEPTANCE CLOSURE

### Integration Ownership

Run only after all prerequisite implementation groups are integrated.

Do not redesign implementation. Resolve only mechanical integration issues within frozen contracts; return semantic defects to the responsible owner.

### Closure Verification

Verify the integrated correction against the rejected build's governing contracts and frozen boundaries using the strongest verification available in the current ChatGPT session.

### Canonical Evidence

Update `dev/evidence/_ca-output.md` with:

- all repair groups completed;
- complete integrated created/modified/deleted file manifest;
- verification actually performed and results;
- materially relevant unavailable checks labeled `NOT AVAILABLE IN THIS SESSION`;
- integration/closure findings;
- any remaining blocker or limitation.

Include `dev/evidence/_ca-output.md` itself in the final manifest.

## FINAL STOP

Stop after implementation groups are integrated, closure verification is complete, and canonical evidence is updated.

Do not continue into unrelated work or optional improvements.
````

---

## Final Sufficiency Gate

Before emitting a repair package, verify all of the following:

1. Every approval blocker is assigned to exactly one repair owner.
2. Defects sharing one invariant/ownership surface are grouped coherently.
3. Independent groups are separated only when parallelism is actually safe and useful.
4. No two parallel groups independently modify the same orchestration/controller/state-lifecycle authority.
5. Shared interfaces/contracts required by multiple groups are frozen before dispatch.
6. Group dependencies and execution waves are explicit.
7. Every correction identifies exact defective code/contract and the required repair.
8. Exact replacement code is supplied whenever safely determinable.
9. Consequential edits cannot silently cross another group's ownership boundary.
10. Verification requirements are executable within actual ChatGPT-session capabilities.
11. Unavailable dynamic checks are labeled `NOT AVAILABLE IN THIS SESSION`.
12. Acceptance/evidence closure occurs only after implementation groups integrate.
13. Closure validates contracts and does not redesign implementation.
14. `dev/evidence/_ca-output.md` has exactly one owner during parallel repair and is updated with final integrated evidence.
15. Optional improvements and reviewer-only narrative are absent.
16. Each coding agent can implement its assignment without repeating the reviewer's diagnosis.
17. The package contains nothing that does not help implement, constrain, integrate, verify, or evidence the repair.
18. Capacity-sizing has been performed for every coding-agent assignment against the capabilities of the target agent/model.
19. No dispatched work order reasonably requires more than one model turn of implementation, expected correction/debug iteration, verification, evidence, and completion reporting; oversized coherent groups are divided into dependency-safe serial repair units.
20. Every multi-unit repair makes unit completion versus overall repair completion explicit, defines predecessor/start gates, and provides a resumable continuation state that cannot be mistaken for successful completion.
21. Capacity-sizing has not weakened acceptance criteria, split semantic ownership, created arbitrary micro-tasks, or moved unfinished implementation into acceptance/closure.

If any ownership or frozen-boundary condition cannot be established safely, reduce parallelism until the repair becomes deterministic. If any coding-agent assignment fails the capacity-sizing gate, reduce the executable unit size while preserving causal ownership and frozen contracts before dispatch.
