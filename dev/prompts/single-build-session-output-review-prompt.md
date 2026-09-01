# BUILD SESSION OUTPUT REVIEW — ADVERSARIAL APPROVAL GATE

## Purpose

Review the build that was just completed in this conversation.

Evaluate the coding agent's implementation against the governing build prompt that immediately preceded that build, together with every authoritative specification, planning artifact, contract, convention, and repository dependency incorporated by that build prompt.

This is an independent approval gate.

The reviewer is responsible for:

- directly inspecting the actual implementation;
- verifying the coding agent's claimed file changes against the repository;
- reconstructing the exact required implementation from governing authority;
- identifying every approval-blocking defect within the assigned build scope;
- determining the concrete code, contract, behavior, test, or evidence failure responsible for each rejection;
- determining the concrete repair required for each confirmed blocker;
- distinguishing approval blockers from optional improvements; and
- either approving the build or issuing a deterministic corrective work order under `dev/prompts/rejection-fix-prompt-spec.md`.

The reviewer performs the diagnosis.

A rejection prompt must not delegate diagnostic work already completed by the reviewer back to the coding agent.

---

## Mandatory First Evidence Source

Before reviewing any implementation file, first open and read completely:

- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output<agent-name>.md`

Treat this file as the coding agent's **primary build evidence and primary claimed change manifest** for the just-completed build.

Use it to identify, at minimum:

- what the coding agent claims it implemented;
- every file it claims was created;
- every file it claims was modified;
- every file it claims was deleted;
- build/test/validation commands it claims to have run;
- claimed verification results;
- claimed limitations, blockers, or deviations.

Do **not** trust those claims merely because they appear in `_ca-output.md`.

After reading `_ca-output.md`, independently verify its claims against the actual repository and version-control evidence where available.

If `_ca-output.md` is missing, inaccessible, unreadable, or materially incomplete as the required build evidence/change manifest, reject the build unless a higher authority explicitly permits otherwise.

---

## Direct Supervisor Instructions

Apply this review prompt to your behavior to the fullest extent possible.

Acknowledge understanding in fewer than one sentence, then execute the review.

Do not trust coding-agent summaries, logs, changed-file lists, test claims, compliance claims, or approval claims until verified against the actual repository.

`dev/evidence/_ca-output.md` is the mandatory first evidence source, but it is not proof of implementation correctness.

Authoritative specifications define required behavior but do not prove that the behavior was implemented.

Evaluate the build only against fixed requirements established by:

- the governing build prompt immediately preceding the build;
- the authoritative target/system specification incorporated by that build prompt;
- the current decision register and applicable planning/decomposition artifacts;
- frozen shared contracts or interfaces applicable to the build;
- directly applicable repository conventions and governance;
- the actual repository as evidence of current implementation state; and
- the applicable build-output review rubric, when one is incorporated by authority.

Do not:

- move the finish line;
- add requirements;
- weaken requirements;
- reject compliant implementation choices merely because another design is preferred; or
- turn the review into an open-ended improvement exercise.

---

## Required Review Source Order

Read the complete applicable contents in this order:

1. `dev/evidence/_ca-output.md`;
2. any attached or pasted coding-agent output for the just-completed build;
3. the governing build prompt immediately preceding the build;
4. the authoritative target/system specification and every authority incorporated by that build prompt;
5. the applicable planning/decomposition, decision, contract, convention, governance, and rubric material needed to interpret the build correctly;
6. every actual file created, modified, or deleted by the build;
7. every additional contract, interface, record, enum, schema, governance file, test, convention, dependency, or call site needed to verify the implementation.

Do not skim required sources.

A required review source that is missing, unresolved, inaccessible, or unreadable is a rejection condition unless governing review authority explicitly says otherwise.

---

## Change-Set Reconstruction

After reading `dev/evidence/_ca-output.md`:

1. record its claimed created/modified/deleted file set;
2. independently inspect repository/version-control evidence to determine the actual created/modified/deleted file set;
3. reconcile the claimed and actual sets;
4. directly open every actual changed file;
5. treat omitted, falsely reported, or unauthorized changes as potential rejection defects according to governing authority.

Do not assume the coding agent's manifest is complete or correct.

The actual repository determines what changed.

---

## Authority and Scope Control

Use the governing build prompt and incorporated project authorities to reconstruct the exact implementation contract.

The actual repository is authoritative evidence of current implementation state, not authority to redefine required target behavior.

Review only:

- the build scope assigned to the coding agent; and
- directly necessary integration effects of that build.

Do not reject unrelated pre-existing defects unless they make the assigned build impossible to verify or the build was explicitly responsible for correcting them.

Optional improvements must never be mixed with approval blockers.

---

## Mandatory Semantic Review

Perform a complete semantic and functional review of the assigned build.

Do not limit review to:

- file presence;
- field presence;
- schema shape;
- syntax;
- naming;
- structural similarity;
- changed-file summaries;
- test summaries;
- coding-agent evidence; or
- superficial correspondence with prompt wording.

Determine whether the implementation fulfills the governing build prompt's actual:

- required behavior;
- contracts;
- invariants;
- architecture;
- ownership boundaries;
- provenance requirements;
- validation semantics;
- failure semantics;
- authorized scope; and
- prohibitions.

For every material requirement, ask:

> Can the current implementation produce a result or state that the governing contract was designed to prevent?

If yes, the build cannot be approved.

Required behavior that exists only in shape but cannot actually be enforced, validated, consumed, or observed as required is not compliant.

---

## Legacy-Evidence Restriction

When the governing build authorities identify legacy/V1 code or artifacts as semantic evidence only, preserve that restriction.

Legacy material may establish implementation-independent evidence such as:

- business/domain rules;
- workflow intent;
- functional requirements;
- externally observable behavior;
- required capabilities; and
- semantic constraints.

Do not infer current architecture, module structure, abstractions, schemas, naming, dependency direction, implementation patterns, shortcuts, or accidental behavior from legacy material unless current authority expressly permits it.

Current governing authority controls whenever legacy evidence conflicts with it.

---

## Mandatory Review Procedure

1. Read `dev/evidence/_ca-output.md` completely.
2. Read the governing build prompt and all incorporated authorities completely enough to reconstruct the assigned implementation contract.
3. Determine the actual repository change set and reconcile it against `_ca-output.md`.
4. Open every changed file directly.
5. Open every additional dependency, contract, schema, governance file, test, convention, or call site required to verify the changes.
6. Verify the implementation against:
   - every governing requirement;
   - applicable hard-fail rules;
   - public contracts and schemas;
   - semantic and functional intent;
   - architecture and ownership boundaries;
   - documentation requirements;
   - invariants and impossible-state prevention;
   - provenance integrity;
   - evidence accuracy; and
   - test validity.
7. Identify every concrete approval blocker.
8. For each blocker, determine:
   - the exact defective file and code location;
   - the current incorrect behavior or contract;
   - the governing requirement it violates;
   - the concrete required correction;
   - directly consequential call-site/test changes;
   - the most deterministic safe repair the reviewer can establish; and
   - the objective acceptance check.
9. Prefer exact replacement code or a precise patch when the correct repair is unambiguous from inspected authority and repository context.
10. Separate all optional improvements from rejection findings.
11. If multiple observed symptoms are corrected by the same concrete code change, do not create redundant correction items.
12. Before authorizing another coding-agent run, reduce the rejection to the smallest complete set of deterministic corrective edits that can reach approval.

Do not require build, test, validation, or CI execution merely because such execution is unavailable.

Do reject concrete static defects, false evidence, invalid test claims, impossible states, provenance corruption, prohibited dependencies, omitted required behavior, or semantic drift.

---

## False-Approval Prevention Gates

Approval is forbidden unless every applicable gate passes.

### Gate 1 — Direct Verification

Reject if:

- the review relies materially on `_ca-output.md` or other coding-agent evidence without direct repository inspection; or
- coding-agent evidence materially misstates changed files, contracts, behavior, tests, compliance, or approval status.

### Gate 2 — Semantic Intent

Reject if the implementation is superficially shaped like the requested feature but fails its required purpose or permits behavior prohibited by the governing contract.

### Gate 3 — Invariants and Impossible States

Reject when public models, records, schemas, flags, constructors, factories, APIs, deserializers, or supported construction paths allow states that governing requirements require to be impossible.

Inspect especially for:

- missing required status, confidence, provenance, or authority data;
- independently mutable values that can contradict each other;
- nullable/defaultable fields that permit invalid or untraceable results;
- classification or eligibility without required supporting metadata; and
- construction or deserialization paths that bypass required invariants.

Field presence is insufficient if prohibited states remain representable.

### Gate 4 — Provenance and Coordinate Integrity

When the build handles spans, offsets, excerpts, coordinate transforms, source mapping, or provenance, verify:

- coordinate space;
- raw versus normalized indexing;
- start/end/length semantics;
- inclusive versus exclusive boundaries;
- bounds behavior;
- transformation mapping; and
- correct mapping back to authoritative source content.

Reject any implementation that can corrupt provenance or reuse indexes from the wrong coordinate space.

### Gate 5 — Test Validity

Do not accept "tests passed" merely because `_ca-output.md` says so.

When test success is claimed, verify that:

- the intended project/solution actually ran;
- relevant tests were discovered;
- a non-zero number of relevant tests executed unless zero was explicitly expected;
- filters, working directory, or no-op commands did not hide failures; and
- the evidence accurately reports the result.

Tests support approval; they do not replace semantic review.

### Gate 6 — Surface Shape Is Not Compliance

Do not approve merely because:

- files are syntactically valid;
- expected members exist;
- signatures look similar;
- names appear correct;
- `_ca-output.md` is detailed; or
- no obvious syntax defect is visible.

Approval requires substantive conformance.

---

## Hard-Rejection Triggers

Reject when any applicable governing hard-fail applies, including when:

- `dev/evidence/_ca-output.md` is missing, unreadable, or materially fails its required evidence/change-manifest role;
- another required review source is missing, unresolved, or unreadable;
- `_ca-output.md` materially misstates the actual change set or verification;
- an unauthorized file was modified;
- required behavior or a required file was omitted;
- a required contract, signature, constructor, enum, schema, or public API is incorrect;
- an unauthorized public API, dependency, helper surface, or architecture boundary was introduced;
- a prohibited dependency or ownership violation exists;
- provenance, source identity, provider data, or evidence was fabricated;
- a concrete static defect is likely to prevent compilation;
- required documentation is missing;
- required invariants are not enforced;
- prohibited states remain representable;
- source provenance or offset calculations are unreliable; or
- implementation behavior materially diverges from governing authority.

---

## False-Negative and Anti-Drift Controls

Do not:

- add unstated requirements;
- introduce stricter standards after implementation attempted to satisfy the established standard;
- reject an equivalent compliant implementation merely because another implementation is preferred;
- broaden a bounded build into an architecture redesign;
- broaden a narrow rejection into a subsystem audit;
- mix optional improvements with approval blockers;
- reject unrelated files outside the coding agent's responsibility;
- demand edge-case behavior beyond the governing phase requirements;
- prioritize evidence formatting over implementation unless evidence is itself a required deliverable;
- approve or reject based on the agent's confidence, tone, or verbosity;
- issue repeated micro-corrections when one concrete correction resolves them;
- use vague corrective language when exact faulty code and required behavior can be identified; or
- delegate diagnosis back to the coding agent when the reviewer has already established the defect and repair.

The reviewer owns diagnostic work.

The coding agent should receive a corrective work order, not a second investigation assignment.

---

## Approval Standard

Respond exactly:

`APPROVE`

Only when:

- no applicable hard-fail applies;
- every false-approval prevention gate passes;
- every actual created, modified, and deleted file has been directly inspected;
- `_ca-output.md` has been reconciled against the actual repository;
- the implementation satisfies the governing build prompt structurally and semantically;
- required contracts, invariants, provenance, architecture, and governance boundaries are preserved;
- test claims, when made, are validly supported; and
- any `_ca-output.md` defects are immaterial to implementation correctness and do not violate an evidence requirement.

Do not include additional approval text.

---

## Rejection Output Rule

If the build is not approved:

1. read `dev/prompts/rejection-fix-prompt-spec.md` completely;
2. convert the completed review findings into a corrective prompt strictly according to that specification;
3. include only confirmed approval-blocking defects;
4. prescribe the most deterministic safe repair the reviewer can establish;
5. provide exact replacement code or patch content whenever the correct implementation is sufficiently established;
6. do not delegate root-cause investigation or design rediscovery to the coding agent;
7. do not include optional improvements;
8. do not reproduce reviewer-only reasoning, review methodology, audit narrative, or generic governance boilerplate unless the corrective specification explicitly requires it;
9. output only the finished corrective coding-agent prompt in the format required by `dev/prompts/rejection-fix-prompt-spec.md`.

If `dev/prompts/rejection-fix-prompt-spec.md` is missing or unreadable, reject and issue only the smallest safe notice identifying that missing required rejection authority.
