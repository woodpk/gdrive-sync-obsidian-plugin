# REJECTION / FIX PROMPT SPECIFICATION — DETERMINISTIC CORRECTIVE WORK ORDER

## Purpose

This file defines how a reviewer must convert a rejected build into the corrective prompt sent to the coding agent.

The corrective prompt is **not a review report**.

It is a **deterministic corrective work order** containing the smallest complete set of concrete edits necessary to repair the confirmed approval blockers.

The governing division of labor is:

> **Reviewer diagnoses. Reviewer specifies the repair. Coding agent implements and verifies.**

The reviewer must not ask the coding agent to rediscover defects, repeat root-cause analysis already completed during review, reinterpret established contracts, or independently redesign the correction.

---

## Authority Relationship

The corrective prompt is a **delta** over the authorities the coding agent already has, including:

- the original governing build prompt;
- authoritative project specifications;
- frozen contracts and architecture boundaries;
- the coding-agent implementation bootstrap; and
- the current repository.

Do not reproduce those authorities unless a small excerpt or identifier is necessary to define a correction unambiguously.

The corrective prompt may narrow work to repair confirmed defects. It may not redefine the original build contract.

---

## Core Output Doctrine

Generate the **shortest prompt that remains sufficient to produce a correct repair**.

There is no arbitrary word limit.

Every instruction included in the corrective prompt must be necessary to tell the coding agent at least one of the following:

1. **what code is wrong and where;**
2. **what exact change must be made;**
3. **what defect-specific constraint must be preserved while making that change;**
4. **what objective check establishes that the correction is complete.**

If content does none of those things, exclude it.

Reviewer-only reasoning, audit narrative, epistemic safeguards, general coding philosophy, and explanations of how the reviewer conducted the review do not belong in the corrective prompt.

---

## No Diagnostic Redelegation

Do not instruct the coding agent to:

- investigate why a confirmed defect exists;
- determine the root cause of a defect already diagnosed;
- review the subsystem again to discover what is wrong;
- decide what invariant should apply when the authority already establishes it;
- choose among materially different repairs when the reviewer can determine the required one;
- identify affected call sites when the reviewer has already determined them and they are needed for the repair; or
- repeat the review.

Use diagnostic language only when the reviewer genuinely cannot determine a necessary fact from available authority and repository evidence.

A rejected build should normally return to the coding agent as an **editing task**, not another analysis task.

---

## Correction Specificity Hierarchy

For each rejection item, use the highest level of determinism the reviewer can safely establish.

### Level 1 — Exact Replacement or Patch

Use this whenever:

- the defect is localized;
- the reviewer has inspected sufficient surrounding code;
- the required implementation is unambiguous; and
- prescribing the code does not force an unjustified decision outside the build contract.

Provide exact replacement code, a direct diff, or an exact before/after patch.

This is the preferred form because it minimizes interpretation variance.

### Level 2 — Exact Structural Repair

Use this when the required resulting structure and semantics are known but several mechanically equivalent implementations are valid.

Specify:

- exact affected file/member/contract;
- exact invalid current state;
- exact required resulting state;
- all necessary invariant/enforcement boundaries;
- directly affected callers/tests; and
- objective acceptance conditions.

Leave only ordinary implementation mechanics to the coding agent.

### Level 3 — Concrete Behavioral Repair

Use this only when the reviewer can prove the current implementation is wrong and define the required behavior but cannot responsibly prescribe exact internal structure.

Still identify:

- exact defective code location;
- exact observed failure;
- exact required behavior;
- directly relevant constraints;
- required tests/verification; and
- stopping condition.

Never fall back to vague instructions such as "fix this properly," "investigate," or "make it robust."

---

## Correction Item Consolidation

Each correction item should correspond to a concrete faulty implementation or contract.

When several symptoms are all resolved by one concrete code change, do not create redundant correction items.

When separate code defects require separate edits, list them separately.

Do not hide multiple independent defects under one vague umbrella item merely to make the prompt shorter.

The goal is **minimal complete repair scope**, not artificial brevity.

---

## Mandatory Versus Consequential Edits

The corrective prompt may distinguish:

### Mandatory Edits

The exact code or contract changes the reviewer has determined must occur.

### Consequential Edits

Only changes mechanically or semantically required because of the mandatory edits, such as:

- compile-fallout call-site updates;
- constructor/factory call changes;
- interface implementation changes;
- directly affected tests;
- directly affected serialization/mapping code.

Consequential edits do not authorize unrelated refactoring, cleanup, redesign, or speculative improvement.

If the reviewer can enumerate consequential locations reliably, enumerate them.

If not, narrowly authorize only directly necessary consequential changes.

---

## Required Output Structure

A rejection prompt must use the following flattened top-level sections in this order:

1. `REJECTION`
2. `SCOPE`
3. `CORRECTIONS`
4. `VERIFICATION`
5. `CHANGE_MANIFEST`
6. `COMPLETION_RESPONSE`
7. `STOP`

Include `EVIDENCE_RECEIPT` only when another authoritative workflow, project convention, or explicit user instruction requires it.

Do not add process-oriented sections that are not needed to execute the repair.

---

## Section Requirements

### REJECTION

State plainly that the build is rejected.

Optionally list the correction IDs when more than one exists.

Keep this section to one or two sentences.

Example:

```text
REJECTION

Build rejected for C1 and C2 below.
```

### SCOPE

Define only the boundaries necessary to prevent correction drift.

Normally this should state:

- correct the listed rejection items;
- make only directly necessary consequential edits;
- do not perform unrelated refactoring or functionality changes.

Do not restate the whole original build scope.

Example:

```text
SCOPE

Correct C1-C2 and only the directly necessary call-site/test fallout.
Do not make unrelated behavioral, architectural, or cleanup changes.
```

### CORRECTIONS

This is the substantive part of the work order.

Every independent correction must have a stable identifier such as `C1`, `C2`, and so on.

For each correction, include only the fields that materially help the coding agent execute it.

#### Required per-correction fields

- **FILE** — exact repository path.
- **LOCATION** — exact member/type/function/schema region; include line numbers only when stable/useful.
- **DEFECT** — concise factual description of what the current implementation does incorrectly.
- **REQUIRED CHANGE** — concrete required post-repair state.
- **ACCEPTANCE** — objective condition proving this correction is complete.

#### Conditional per-correction fields

Include only when applicable:

- **REPLACEMENT** — exact replacement code or diff. Prefer this whenever safely determinable.
- **RELATED CHANGES** — directly required call sites, interfaces, serializers, tests, or dependent code.
- **CONSTRAINTS** — defect-specific prohibitions necessary to prevent a plausible but incorrect repair.
- **AUTHORITY** — requirement ID/path when needed to anchor the correction. Prefer concise identifiers over copied specification prose.
- **KNOWN TRAP** — only when a specific likely repair would repeat or create the identified defect.

Do not mechanically include empty fields.

#### Exact replacement code

When replacement code is prescribed:

- include enough surrounding context to place it correctly;
- preserve repository language/style unless the governing contract requires otherwise;
- do not provide pseudocode when exact code is known;
- do not require the coding agent to redesign code the reviewer has already specified;
- authorize only directly necessary consequential edits outside the shown replacement.

Example shape:

```text
C1 — <short defect name>

FILE
src/.../Example.cs

LOCATION
Example.Create(...)

DEFECT
<precise defect>

REQUIRED CHANGE
<precise resulting contract>

REPLACEMENT

```csharp
<exact replacement code>
```

RELATED CHANGES
<only directly necessary fallout>

ACCEPTANCE
<objective pass condition>
```

### VERIFICATION

Require only verification relevant to the listed corrections.

Specify:

- exact tests/commands when known and appropriate;
- exact behavioral cases that must be demonstrated;
- compile/build checks when the correction can affect compilation;
- targeted regression checks where directly necessary.

Do not turn verification into a repeat of the whole review unless the correction legitimately affects the whole build.

Do not ask the coding agent to declare approval.

Example:

```text
VERIFICATION

Run:
- dotnet test <relevant-project>
- dotnet build <relevant-solution>

Confirm:
- the prohibited state in C1 is no longer constructible;
- the regression case in C2 now passes.
```

If commands cannot reasonably be executed in the coding-agent environment, require the strongest available static/targeted verification and require the limitation to be reported.

### CHANGE_MANIFEST

Require a complete manifest of files actually created, modified, or deleted during the correction pass.

Keep the instruction minimal.

Example:

```text
CHANGE_MANIFEST

Report every file created, modified, or deleted by this correction pass.
```

### COMPLETION_RESPONSE

Require only the handoff information needed for re-review:

- corrections implemented;
- verification actually performed and results;
- change manifest;
- any remaining blocker or verification limitation.

Do not require essays, rubric self-scoring, self-approval, or claims that the build is accepted.

Example:

```text
COMPLETION_RESPONSE

Return:
- correction IDs completed;
- verification commands/checks actually run and their results;
- complete change manifest;
- any remaining blocker or verification limitation.
```

### STOP

Give a clear stopping condition.

Example:

```text
STOP

Stop after C1-C2 and their directly necessary consequential edits are implemented and verified.
Do not continue into unrelated work.
```

---

## Exact-Code Guidance

Provide actual replacement code whenever doing so is safer and more deterministic than describing the same edit in prose.

Exact code is especially appropriate for:

- incorrect conditionals;
- invalid constructors/factories;
- wrong enum or schema definitions;
- incorrect mappings;
- missing invariant enforcement;
- wrong signatures;
- erroneous offset/span calculations;
- incorrect serialization rules;
- malformed configuration;
- small, localized algorithms; and
- tests whose required assertion/setup is unambiguous.

Do **not** force an exact patch when:

- repository context is insufficient;
- several implementations are legitimately equivalent and none is contractually required;
- the patch would require speculative decisions;
- the change spans broad architecture not fully inspected; or
- exact code would unnecessarily freeze an implementation detail explicitly left to engineering discretion.

In those cases, use Level 2 or Level 3 specificity.

---

## What Must Be Excluded

Do not include any of the following unless a particular rejection genuinely requires it to execute the repair:

- a narrative of the review process;
- descriptions of files that passed;
- optional improvements;
- speculative future work;
- general architecture advice unrelated to the defect;
- repeated copies of the original build prompt;
- repeated copies of governing specifications;
- generic reminders to be careful;
- generic reminders that tests are not final approval;
- statements that the reviewer will inspect files again;
- reviewer confidence statements;
- explanations of why adversarial review matters;
- instructions to self-score against the review rubric;
- instructions to self-approve or declare acceptance;
- unrelated cleanup;
- broad refactors;
- stylistic preferences that are not approval requirements;
- repeated symptoms already resolved by a listed concrete correction.

The corrective prompt is not the place to preserve reviewer reasoning for posterity.

---

## Defect-Specific Constraint Rule

Do not fill the prompt with generic prohibitions.

Include a constraint only when a plausible repair could otherwise violate a real requirement.

Good:

```text
CONSTRAINTS

Do not add a second independent eligibility flag. Eligibility must remain derived from Classification.
```

Bad:

```text
CONSTRAINTS

Follow good engineering practices.
Do not break anything.
Preserve architecture.
Be careful with tests.
```

Standing coding-agent governance belongs in the implementation bootstrap, not every rejection prompt.

---

## Authority Citation Rule

When the violated requirement is obvious from a stable requirement identifier, cite the identifier instead of paraphrasing paragraphs of authority.

Prefer:

```text
AUTHORITY
SYS-142; `full-system-spec.v2.md` §8.3
```

over reproducing the full requirement text.

Explain the authority relationship only when the correction would otherwise be ambiguous.

---

## Verification Evidence Rule

The coding agent must report only verification it actually performed.

Do not require the corrective prompt to contain generalized reviewer epistemology.

If test execution is claimed, the completion response must identify the command/check and observed result sufficiently for the reviewer to validate it.

Final approval remains a separate reviewer action and is not part of the coding agent's repair task.

---

## Output Formatting

The reviewer must output the finished corrective coding-agent prompt inside one outer four-backtick Markdown fence.

Inside that outer fence:

- ordinary content is Markdown;
- nested source-code replacements use three-backtick fences;
- do not use another four-backtick nested fence.

Do not place commentary outside the corrective prompt.

---

## Canonical Corrective Prompt Shape

Use the following fixed section order and correction-item shape. Omit only conditional correction fields that are not applicable.

````text
REJECTION

Build rejected for <correction IDs>.

SCOPE

Correct <IDs> and only directly necessary consequential edits.
Do not make unrelated behavioral, architectural, cleanup, or speculative changes.

CORRECTIONS

C1 — <short defect name>

FILE
<exact path>

LOCATION
<exact member/type/region>

DEFECT
<what the current code does incorrectly>

AUTHORITY
<requirement ID/path, only when useful>

REQUIRED CHANGE
<exact post-repair contract>

REPLACEMENT

```<language>
<exact replacement code when safely determinable>
```

RELATED CHANGES
<only directly necessary call sites/tests/dependencies, if any>

CONSTRAINTS
<only defect-specific constraints, if any>

ACCEPTANCE
<objective completion condition>

C2 — <next independent defect, if any>

FILE
...

LOCATION
...

DEFECT
...

REQUIRED CHANGE
...

ACCEPTANCE
...

VERIFICATION

Run/check:
- <targeted verification>
- <targeted verification>

Confirm:
- <correction-specific behavior>
- <correction-specific behavior>

CHANGE_MANIFEST

Report every file created, modified, or deleted by this correction pass.

COMPLETION_RESPONSE

Return:
- correction IDs completed;
- verification actually performed and results;
- complete change manifest;
- any remaining blocker or verification limitation.

STOP

Stop after the listed corrections and directly necessary consequential edits are implemented and verified.
Do not continue into unrelated work.
````

---

## Final Sufficiency Test

Before emitting a corrective prompt, the reviewer must ask:

1. Does every correction identify specific faulty code or contract?
2. Does every correction tell the coding agent exactly what must change?
3. Where exact replacement code can safely be established, was it supplied?
4. Are directly necessary consequential edits identified or narrowly authorized?
5. Does every correction have an objective acceptance condition?
6. Is verification limited to what materially proves these repairs?
7. Has all optional improvement and reviewer-only narrative been removed?
8. Could the coding agent implement the repair without repeating the reviewer's diagnostic work?
9. Is anything still present that does not help implement, constrain, or verify the repair?

If item 8 is `no`, the prompt is under-specified.

If item 9 is `yes`, remove that content unless it is required by another explicit authority.
