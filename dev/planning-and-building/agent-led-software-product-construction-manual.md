# Agent-Led Software Product Construction Manual

## Purpose

This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.

The process is designed for work in which one or more AI agents perform most of the analytical, architectural, planning, coding, testing, and review activity while the human user remains the product authority.

The manual is intentionally structured so that it does not require every project to begin at the first stage. A project may enter at any point for which sufficient prior work already exists.

## Operating Principles

### Human Product Authority

The user remains authoritative for product intent, business priorities, desired outcomes, and any decision the user explicitly reserves.

Agents may infer, recommend, structure, analyze, and implement, but must not silently replace an unresolved product decision with an arbitrary engineering choice when that choice could materially change the product.

### Agent Engineering Authority

Once product intent, required behavior, boundaries, and fixed decisions are sufficiently established, agents should retain reasonable discretion over ordinary implementation mechanics.

The process should be precise about what must be true and intentionally less prescriptive about how ordinary coding work is performed unless a specific implementation choice is itself part of the product or architecture.

### Minimum Necessary Specification

Specifications and build prompts should contain enough information to remove material ambiguity without expanding into line-by-line implementation recipes.

A detail belongs in the specification when materially different interpretations could produce materially different software.

A detail generally does not belong when competent engineers could choose among multiple implementations without changing required behavior, architecture, compatibility, security, or operational outcomes.

### Evidence-Based Completion

No stage is complete merely because an agent states that it is complete.

Completion must be supported by objective evidence appropriate to the stage, such as requirement coverage, repository inspection, successful builds, automated tests, behavioral tests, interface verification, architecture checks, or independent review.

### Repository Grounding

When an existing codebase is involved, planning and implementation instructions must be grounded in the actual repository.

Agents should inspect the implementation, relevant tests, interfaces, architecture, configuration, and governing documentation before naming concrete implementation locations or asserting how the current system works.

### No Unnecessary Restart

The manual is state-based rather than ceremony-based.

An agent must not restart discovery, repeat prior questions, regenerate settled decisions, or recreate artifacts merely because the project did not originally follow this manual.

Existing conversations, specifications, code, plans, and prior decisions should be treated as candidate evidence and mapped into the process before additional work is requested.

## Navigation and Entry

### Valid Entry Points

A project may enter this manual at any of the following states:

1. An undeveloped or partially developed product idea.
2. An informal conversation that already establishes some product requirements.
3. An existing requirements document or product specification.
4. An already defined target-system specification.
5. An existing build decomposition.
6. A single miniature build-session description that must be expanded.
7. A partially completed implementation.
8. A supposedly completed implementation requiring independent validation.

### Entry-State Assessment

Before selecting a stage, the agent should determine what reliable project state already exists.

The agent should identify:

- established product goals;
- known users and workflows;
- required capabilities;
- established behavior and business rules;
- known constraints and invariants;
- architectural decisions already made;
- explicit non-goals;
- existing code and repository state;
- existing build decomposition;
- completed build work;
- available verification evidence;
- unresolved product decisions;
- unresolved engineering questions.

The agent should then enter at the earliest stage or substage whose required inputs are not yet sufficiently established.

### Entry-State Rule

Do not require the user to repeat information already available in the current conversation, supplied documents, repository, or other authoritative project materials.

When existing information is incomplete, ask only for information that is materially necessary to continue accurately.

When a missing matter can be resolved through repository inspection or analysis, resolve it without asking the user.

When the matter is a genuine product decision whose alternatives would materially change the intended system, surface it to the user.

### Stage Selection Guide

| Existing State | Recommended Entry |
| --- | --- |
| Only an idea or problem statement exists | Stage 0 |
| Informal discussion contains partial requirements | Stage 0, using prior discussion as already-completed discovery |
| Requirements are substantially understood but no precise target system exists | Stage 1 |
| Target system exists but has not been decomposed | Stage 1 decomposition work |
| Target system and build phases already exist | Stage 2A or Stage 2B |
| One miniature build step needs a coding-agent prompt | Stage 2A build-session expansion |
| Agent should build the complete product without exposing decomposition | Stage 2B |
| Implementation is complete or claimed complete | Stage 3 |

## Stage 0 — Product Discovery and Requirements Elicitation

### Purpose

Stage 0 converts an initial idea, incomplete concept, informal discussion, or partially specified product into a sufficiently complete body of product intent that can support precise system specification.

The stage is not intended to force the user through a rigid questionnaire.

Its purpose is to discover what must be known while preserving conversational flexibility and avoiding unnecessary technical burden on the user.

### Inputs

Stage 0 may begin from any combination of:

- an idea;
- a problem statement;
- an informal conversation;
- a rough feature list;
- screenshots or examples;
- an existing manual process;
- an existing product that should be replaced or extended;
- a partial specification;
- repository material;
- prior project decisions.

### Required Outputs

By the end of Stage 0, enough information should exist to determine the intended product with confidence.

The output should establish, where relevant:

- the problem being solved;
- intended users or actors;
- major user goals;
- important workflows;
- required capabilities;
- observable success outcomes;
- business rules;
- important data and state;
- external systems and integrations;
- expected operating environment;
- important permissions or trust boundaries;
- compatibility requirements;
- constraints;
- priorities and tradeoffs;
- unacceptable outcomes;
- explicit exclusions;
- unresolved decisions requiring product authority.

Stage 0 does not need to produce a formal specification if the information is already available in the conversation and can flow directly into Stage 1.

### Discovery Method

#### Use Adaptive Interviewing

The agent should ask questions based on what is actually unknown.

Do not walk through a fixed questionnaire when earlier answers make later questions unnecessary.

Prefer questions that expose decisions with high downstream impact.

#### Ask About Outcomes Before Technology

Begin with what the user wants the product to accomplish.

Do not prematurely force decisions about frameworks, databases, patterns, hosting, or implementation technologies unless those matters are already product constraints.

#### Translate User Language Into Engineering Implications

The user may describe workflows, frustrations, desired behavior, examples, or outcomes without using software-engineering terminology.

The agent should convert those descriptions into candidate requirements, constraints, invariants, data responsibilities, and acceptance conditions.

#### Distinguish Product Decisions From Engineering Decisions

Ask the user about matters that determine what product they will receive.

Do not ask the user to decide ordinary implementation mechanics unless they have expressed a preference or the decision has meaningful product consequences.

#### Resolve Through Inspection When Possible

If an existing repository, product, document, or interface can answer a question, inspect it instead of asking the user.

#### Surface Material Ambiguity

A question is necessary when two plausible interpretations would produce materially different products and no authoritative source resolves the difference.

### Discovery Topics

The following topics are prompts for analysis, not a mandatory interrogation sequence.

#### Product Purpose

Determine:

- what problem exists;
- why the product should exist;
- what outcome would make it successful;
- what current process or product it replaces, augments, or automates.

#### Users and Actors

Determine:

- who interacts with the system;
- what each actor is trying to accomplish;
- whether roles differ in permissions, workflows, or information access.

#### Core Workflows

Determine:

- what begins each important workflow;
- what information enters;
- what decisions occur;
- what state changes;
- what outputs are produced;
- what failure conditions matter.

#### Required Capabilities

Identify capabilities the completed product must provide.

Describe capabilities in terms of meaningful user or system outcomes rather than merely naming technical components.

#### Data and State

Determine:

- what information must exist;
- authoritative ownership of important data;
- persistence expectations;
- lifecycle and state transitions;
- identity and uniqueness rules where they matter;
- retention or deletion requirements where they matter.

#### Integrations and Environment

Determine:

- external services;
- APIs;
- databases;
- filesystems;
- authentication providers;
- execution environment;
- supported operating systems or platforms;
- deployment constraints.

#### Constraints and Invariants

Identify:

- architectural constraints already established;
- compatibility obligations;
- deterministic behavior requirements;
- performance constraints;
- safety or security requirements;
- regulatory or policy constraints;
- behavior that must never occur.

#### Priorities and Tradeoffs

Determine whether the user prioritizes:

- correctness;
- speed;
- simplicity;
- extensibility;
- maintainability;
- compatibility;
- cost;
- operational independence;
- automation;
- visibility and control.

Only elicit tradeoffs that materially affect the design.

### Stage 0 Completion Test

Stage 0 is complete when the agent can construct the target-system specification without having to invent product intent.

Minor engineering choices may remain open.

Material product ambiguity may not.

### Stage 0 Agent Prompt

Use the following prompt when a dedicated discovery process is needed.

```text
You are the product-discovery and requirements-elicitation agent.

Your job is to develop enough reliable product understanding to support an accurate target-system specification.

First inspect and use all product information already available in the conversation, supplied documents, repository, examples, and prior decisions. Do not ask the user to repeat information that is already known.

Conduct an adaptive interview only for materially important information that remains unresolved.

Focus on discovering:
- the problem and desired outcome;
- intended users and actors;
- important workflows;
- required capabilities;
- business rules and observable behavior;
- important data, state, and ownership;
- integrations and operating environment;
- constraints and invariants;
- compatibility or migration obligations;
- unacceptable outcomes and explicit non-goals;
- priorities and material tradeoffs;
- unresolved product decisions.

Do not force the user to make ordinary engineering decisions unless those decisions materially affect the product or the user has explicitly reserved them.

When an answer can be obtained from repository inspection or existing authoritative material, obtain it there instead of asking the user.

Translate informal user descriptions into precise candidate requirements, but do not silently convert uncertainty into a fixed product decision.

Continue until the product intent is sufficiently complete that a separate agent could define the finished target system without inventing material requirements.

At completion:
1. summarize the established product intent;
2. identify any remaining unresolved product decisions;
3. state whether the project is ready for Stage 1;
4. if ready, proceed directly into Stage 1 when instructed or when the operating context permits.
```

### Transition to Stage 1

Stage 0 should flow directly into Stage 1.

Do not unnecessarily re-summarize or re-interview.

Stage 1 should consume the product understanding already established and convert it into a precise target-system definition and implementation decomposition.

## Stage 1 — Target-System Specification and Minimum Sound Build Decomposition

### Purpose

Stage 1 defines the intended finished system at a level that removes material implementation ambiguity without prescribing ordinary coding mechanics.

It then decomposes that target into the smallest sequence of build phases that can be implemented accurately, safely, and verifiably.

### Inputs

Stage 1 requires sufficient product intent from one or more of:

- Stage 0;
- prior conversation;
- an existing requirements document;
- a product specification;
- an existing system that defines required behavior;
- governing project documentation.

For an existing codebase, repository inspection should supplement these inputs.

### Target-System Specification Standard

The target-system specification should establish the following where relevant.

#### Required Capabilities

State what the finished system must be able to do.

#### Observable Behavior

Define externally meaningful behavior that distinguishes correct from incorrect operation.

#### Responsibilities and Boundaries

Define major responsibilities and where they belong.

Identify ownership boundaries when crossing them could cause architectural drift or semantic ambiguity.

#### Component Interactions

Define important interactions between components, services, processes, or actors.

Do not prescribe internal call sequences unless sequencing itself is a requirement.

#### Data, State, and Authority

Define:

- authoritative sources;
- important representations;
- ownership;
- state transitions;
- identity rules;
- persistence semantics;
- consistency expectations.

#### Interfaces and Contracts

Define interfaces or contract semantics whose stability or behavior matters.

Do not invent concrete interface types prematurely when only behavioral boundaries are required.

#### Invariants

State conditions that must remain true regardless of implementation.

#### Failure and Validation Behavior

Define material failure behavior, invalid-input handling, unsupported cases, recovery semantics, or error boundaries.

#### Fixed Decisions

Identify decisions the implementation agent may not reinterpret.

#### Engineering Discretion

Identify areas intentionally left open to implementation judgment.

#### Non-Goals

State functionality and adjacent work that the target system explicitly does not include.

#### Completion Evidence

Define objective evidence that would demonstrate that the final system satisfies the specification.

### Minimum Sound Decomposition

After defining the target system, divide construction into the fewest phases that can logically work.

A new phase should exist only when separation is justified by one or more of:

- dependency order;
- architectural sequencing;
- the need to establish a stable boundary before dependent work;
- independent testability;
- risk isolation;
- migration sequencing;
- the need to validate a prerequisite before continuing;
- a meaningful integration boundary.

Do not create phases merely because a feature list has multiple nouns.

Do not combine phases when doing so would materially increase ambiguity, coupling, implementation risk, or verification difficulty.

### Build-Phase Standard

Each build phase should contain only enough information to preserve its meaning before detailed build-session expansion.

Each phase should identify:

- objective;
- required end state;
- principal contracts or invariants introduced or preserved;
- dependencies;
- acceptance criteria;
- non-goals.

The phase description should remain compact.

Detailed repository-grounded build instructions belong in Stage 2A.

### Coverage and Dependency Check

Before finalizing decomposition, verify that:

1. every target-system requirement is assigned;
2. no requirement is silently lost;
3. dependencies are implemented before dependent behavior;
4. cross-phase contracts are explicit enough to prevent drift;
5. no phase exists only for organizational convenience;
6. phases cannot safely be merged further without reducing accuracy, integrity, or verifiability;
7. completing all phases necessarily produces the target system.

### Stage 1 Agent Prompt

```text
You are the product-specification and build-decomposition supervisor.

Given the established product requirements and all authoritative project material, first define the complete target system at the level needed to remove material implementation ambiguity without prescribing ordinary coding mechanics.

When an existing codebase is involved, inspect the repository and directly relevant governing specifications before asserting current architecture, existing abstractions, integration points, or implementation constraints.

Define:
- what the finished system must be capable of doing;
- the externally observable behavior that defines correctness;
- the major responsibilities and boundaries of the system;
- required interactions between components;
- authoritative data, state, interfaces, and ownership boundaries;
- invariants and architectural rules that cannot be violated;
- required failure, validation, and edge-case behavior;
- decisions that are fixed versus engineering choices that remain open;
- explicit exclusions;
- objective evidence that would prove the final product is complete and correct.

Be highly specific about required outcomes, semantics, boundaries, and constraints, but leave ordinary implementation choices to the coding agent unless a particular choice is necessary to preserve the intended system.

After the target system is fully defined, derive the smallest logically sound sequence of build phases capable of producing it.

Create a new phase only when separation is genuinely required by dependency order, architectural sequencing, testability, risk isolation, or the need to establish a prerequisite capability before dependent work can be implemented accurately.

For each phase define only:
- the capability established by the phase;
- the relevant starting assumptions or prerequisites;
- the exact end state that must exist;
- requirements and invariants that become enforceable;
- what remains intentionally outside the phase;
- objective completion criteria.

Then perform a coverage check proving that:
1. every requirement of the target system is implemented by the phase sequence;
2. dependencies are introduced before anything that relies on them;
3. no phase exists solely for organizational convenience;
4. no two phases can safely be combined without materially reducing implementation accuracy, architectural integrity, or verifiability;
5. completing all phases necessarily produces the defined target system.

Optimize for minimum decomposition, maximum specification fidelity, and maximum coding-agent autonomy over nonessential implementation mechanics.
```

### Stage 1 Outputs

Stage 1 should produce:

1. a target-system specification;
2. a compact ordered build decomposition;
3. traceable coverage between target requirements and build phases;
4. any unresolved product decisions that prevent accurate implementation.

### Transition to Stage 2

After Stage 1, choose one of two execution modes.

Use Stage 2A when the user wants visible build phases, controlled sequencing, or individual coding-agent handoffs.

Use Stage 2B when the user wants the agent system to perform decomposition, planning, implementation, and intermediate verification internally while primarily exposing final results and material decision points.

## Stage 2A — Controlled Session-Based Construction

### Purpose

Stage 2A converts each compact build phase into a complete repository-grounded build prompt and executes the product one controlled session at a time.

This mode provides maximum visibility and deliberate handoff control.

### When to Use Stage 2A

Use Stage 2A when:

- the user wants to inspect or approve individual build sessions;
- different coding agents will implement different sessions;
- architectural boundaries must be frozen between parallel workstreams;
- the repository is high risk or difficult to modify;
- incremental validation is especially important;
- the user wants explicit control over sequencing;
- the build will span multiple conversations or agents.

### Controlled Build Loop

For each build phase:

1. confirm the phase being implemented;
2. inspect the current repository state;
3. account for changes made by earlier phases;
4. inspect directly relevant specifications and tests;
5. expand the compact phase description into a full coding-agent build prompt;
6. execute the build;
7. run phase-specific verification;
8. correct defects within the phase scope;
9. establish objective completion evidence;
10. update project state before moving to the next phase.

Do not generate all detailed build-session prompts at the beginning when later prompts depend on repository changes produced by earlier sessions.

The detailed prompt for a later session should be generated against the repository state that actually exists when that session begins.

### Build Prompt Design Standard

A coding-agent build prompt should define the implementation contract rather than an implementation transcript.

It should be precise about:

- objective;
- relevant current state;
- required end state;
- implementation scope;
- required behavior and semantics;
- fixed decisions and invariants;
- implementation discretion;
- dependencies;
- verification and acceptance criteria;
- non-goals.

It should avoid unnecessary prescriptions about:

- private helper structure;
- variable names;
- exact algorithms where alternatives are equivalent;
- boilerplate;
- mechanical edits;
- obvious test syntax;
- file changes that have not been verified.

### Repository Grounding

Before writing the build prompt, the supervisor must inspect the current codebase.

The supervisor should determine:

- relevant projects and layers;
- actual types and interfaces;
- current data flows;
- implementation ownership;
- relevant tests;
- existing extension points;
- architectural constraints;
- current implementation gaps;
- changes introduced by prior sessions.

When actual file or type locations are known, use them.

Do not use speculative phrasing such as "likely file" when repository inspection can establish the answer.

### Fixed Decisions Versus Implementation Discretion

Every build prompt should make the distinction clear.

Fixed decisions include matters such as:

- required behavior;
- architectural ownership;
- public contracts;
- compatibility;
- deterministic semantics;
- authoritative representations;
- required state transitions;
- failure behavior.

Implementation discretion includes matters such as:

- private class decomposition;
- helper methods;
- equivalent internal algorithms;
- local collection choices;
- internal naming not governed elsewhere;
- refactoring necessary to implement the requirement cleanly.

### Stage 2A Build-Prompt Expansion Template

```text
BUILD SESSION: <SESSION NUMBER>

You are the build-planning supervisor. Convert the supplied miniature build-step description into the complete build prompt that will be given to the coding agent.

Before writing the prompt, inspect the current codebase and all directly relevant governing specifications. Determine the actual implementation state, existing abstractions, dependencies, and concrete code locations affected by this session. Account for work completed in earlier build sessions. Do not guess where work belongs.

Expand the miniature description only enough to remove material implementation ambiguity. Do not turn the prompt into a line-by-line implementation recipe or redesign decisions already established by the target-system specification or parent build plan.

The resulting build prompt must define:

- Objective — the capability this session must establish and why it exists.
- Current State — only repository facts necessary to understand the required change.
- Required End State — precisely what must be true after implementation.
- Implementation Scope — verified components, contracts, and concrete code locations involved.
- Required Behavior and Semantics — inputs, outputs, interactions, state transitions, failure behavior, and edge cases where relevant.
- Fixed Decisions / Invariants — architectural, behavioral, compatibility, ownership, or sequencing rules the coding agent may not reinterpret.
- Implementation Discretion — ordinary engineering choices intentionally left to the coding agent.
- Dependencies — capabilities from prior sessions or existing code that this work relies upon.
- Verification / Acceptance Criteria — objective evidence proving the implementation is correct and complete.
- Non-Goals — adjacent or future work that must not be implemented in this session.

Rules:

1. Preserve the exact intent and scope of the miniature build step and parent target-system specification.
2. Include information only when it materially improves implementation accuracy.
3. Be precise about outcomes, semantics, boundaries, and constraints; avoid prescribing ordinary coding mechanics.
4. Name exact files, types, and interfaces when repository inspection establishes them.
5. Do not invent missing architecture, requirements, or behavior.
6. Resolve engineering uncertainty through repository inspection wherever possible.
7. Surface a matter to the user only when it is a genuine unresolved product decision or an ambiguity that authoritative project material cannot resolve.
8. Do not repeat global project rules already enforced elsewhere unless they directly affect this session.
9. Do not allow the coding agent to make product, architectural, or behavioral decisions that the build plan should already have made.
10. Do allow the coding agent reasonable autonomy over internal implementation choices that cannot materially change the required result.
11. Ensure every instruction is actionable and every acceptance criterion is objectively verifiable.
12. Produce the smallest prompt that completely specifies this build session without sacrificing fidelity or implementation accuracy.

Output only the finished coding-agent build prompt.
```

### Coding-Agent Execution Expectations

The coding agent should:

- inspect before modifying;
- preserve established architecture;
- implement only the current session scope;
- use existing abstractions where appropriate;
- avoid speculative future work;
- add or update tests needed to prove acceptance criteria;
- run relevant build and test commands;
- correct defects introduced by the session;
- report material deviations or blockers;
- provide objective completion evidence.

### Phase Completion Gate

A phase should not be treated as complete until:

- its required end state exists;
- acceptance criteria are satisfied;
- relevant tests pass;
- the build succeeds where applicable;
- architecture and contracts remain intact;
- no known phase-scope defects remain;
- evidence is recorded for Stage 3.

### Transition Between Sessions

Before generating the next build prompt:

1. treat the actual repository as authoritative current state;
2. verify that the prior phase completed;
3. incorporate legitimate implementation decisions made during prior work;
4. preserve target-system invariants;
5. do not silently expand the scope of later phases.

### Completion of Stage 2A

Stage 2A is complete when every phase in the Stage 1 decomposition has passed its completion gate and the resulting implementation is ready for independent validation.

Proceed to Stage 3.

## Stage 2B — Autonomous Product Construction

### Purpose

Stage 2B provides an alternate execution mode in which the user does not manage visible build phases or individual coding-agent prompts.

The agent system consumes the authoritative target-system specification and internally performs the decomposition, sequencing, repository analysis, implementation planning, coding, testing, correction, and integration required to produce the finished system.

The planning work still occurs.

It is simply not exposed as a required user-facing workflow.

### When to Use Stage 2B

Use Stage 2B when:

- the user wants the finished product rather than intermediate build-management artifacts;
- the implementation scope is suitable for autonomous execution;
- the target-system specification is sufficiently complete;
- the agent has access to the repository and required tooling;
- no material product decisions remain unresolved;
- the user has not requested explicit control over each phase.

### Authoritative Input

The Stage 1 target-system specification is authoritative.

The autonomous build agent may derive implementation plans, internal task decomposition, coding-agent assignments, temporary checklists, or execution order as needed, but those internal artifacts must not redefine the product.

### Internal Planning Requirement

The autonomous mode must not interpret "do not show me the decomposition" as "do not decompose the work."

The agent must internally determine:

- implementation dependencies;
- sequencing;
- architectural boundaries;
- stable interfaces;
- test strategy;
- integration order;
- migration requirements where applicable;
- verification gates;
- correction loops.

### User Visibility

The user should not be required to review intermediate implementation decomposition.

Surface information when:

- a genuine unresolved product decision is discovered;
- authoritative requirements conflict;
- a required external dependency is unavailable;
- implementation cannot continue without user-controlled credentials, permissions, or environment access;
- proceeding would require materially changing the target system;
- the user requests intermediate visibility.

Do not interrupt the user for ordinary engineering choices.

### Autonomous Construction Loop

Internally:

1. inspect the repository and governing specifications;
2. reconcile repository state with the target-system specification;
3. derive the minimum sound implementation sequence;
4. establish any required shared interfaces before dependent or parallel work begins;
5. implement the first dependency-safe increment;
6. test and verify it;
7. correct defects;
8. continue through remaining increments;
9. integrate completed work;
10. run system-level verification;
11. reconcile the implementation against the complete target-system specification;
12. prepare the system for Stage 3 independent validation.

### Autonomous Build Prompt

```text
You are the autonomous software-construction supervisor.

Use the supplied target-system specification as the authoritative definition of the product to be built.

Inspect the current repository and all directly relevant governing specifications before implementation.

Internally derive whatever implementation decomposition, dependency ordering, build-session specifications, task assignments, interface boundaries, test plans, correction loops, and integration sequence are necessary to construct the complete target system accurately.

Do not require the user to manage or approve the intermediate decomposition unless the user explicitly requests that visibility.

The internal decomposition must preserve:
- dependency correctness;
- architectural boundaries;
- stable contracts between dependent or parallel workstreams;
- testability;
- implementation traceability to target-system requirements;
- objective completion gates.

Be precise about required outcomes, semantics, boundaries, invariants, and compatibility. Retain normal engineering discretion over implementation mechanics that cannot materially change the specified product.

Do not:
- redesign the target system;
- invent unresolved product requirements;
- silently choose among materially different product behaviors;
- implement speculative functionality outside the target specification;
- treat internal planning artifacts as authority over the target-system specification.

When a genuine unresolved product decision is encountered, surface it to the user. Do not interrupt for ordinary engineering decisions that can be resolved correctly through repository inspection and engineering judgment.

For each internal implementation increment:
1. inspect relevant current code;
2. define the required end state;
3. implement only the dependency-safe scope;
4. add or update verification;
5. build and test;
6. correct defects before depending on that increment;
7. preserve established invariants and contracts.

Continue through the complete implementation without requiring user-visible phase management.

Before declaring construction complete:
1. verify that every target-system requirement is represented in the implementation;
2. verify that all required interactions and invariants hold;
3. run all relevant automated tests and builds;
4. perform integration and system-level checks;
5. identify and correct implementation defects discovered by those checks;
6. produce objective evidence that the implementation is ready for independent validation.

The final user-facing construction result should emphasize:
- what was built;
- any material implementation decisions not already fixed by the specification;
- verification performed;
- known limitations or unresolved issues;
- readiness for Stage 3.

Do not expose internal planning detail unless requested.
```

### Completion of Stage 2B

Stage 2B is complete when:

- the complete target-system specification has been implemented;
- internal build and test gates have passed;
- known implementation defects have been corrected or explicitly documented;
- the system is ready to be evaluated independently of the construction process.

Proceed to Stage 3.

## Stage 3 — Independent Product and System Validation

### Purpose

Stage 3 determines whether the constructed system actually satisfies the authoritative target-system specification.

It is deliberately separate from normal build-session verification.

The purpose is to detect omissions, incorrect interpretations, architectural drift, integration failures, untested assumptions, and false completion claims that may survive implementation-time testing.

### Independence Requirement

Whenever practical, Stage 3 should be performed by an agent or review context that did not author the implementation.

The validator should treat:

1. the target-system specification;
2. authoritative project constraints;
3. the actual repository and executable behavior;

as primary evidence.

Build-session summaries are secondary evidence and must not substitute for inspection.

### Validation Inputs

Stage 3 should receive:

- the Stage 1 target-system specification;
- the Stage 1 decomposition, if Stage 2A was used;
- the final repository state;
- relevant governing documentation;
- test suites;
- build and execution instructions;
- implementation evidence from Stage 2;
- known limitations or unresolved issues.

### Validation Dimensions

#### Requirement Coverage

Verify that every required capability and behavior in the target-system specification exists.

Look specifically for requirements that were:

- omitted;
- only partially implemented;
- implemented in the wrong layer;
- represented by tests but not actual behavior;
- implemented but unreachable;
- replaced with a materially different behavior.

#### Behavioral Correctness

Exercise important user and system workflows.

Verify:

- valid paths;
- invalid paths;
- edge cases;
- failure semantics;
- state transitions;
- deterministic behavior where required;
- recovery behavior where required.

#### Architectural Conformance

Verify that the implementation preserves required:

- layer boundaries;
- dependency direction;
- ownership;
- interface responsibilities;
- I/O boundaries;
- persistence boundaries;
- mapping and hydration rules;
- logging versus persistence distinctions;
- other project-specific architecture rules.

#### Contract and Interface Conformance

Verify:

- required interfaces exist;
- inputs and outputs carry the correct semantics;
- compatibility requirements are preserved;
- dependent components use the intended contracts;
- public behavior has not drifted.

#### Data and State Integrity

Verify:

- authoritative ownership;
- state transitions;
- identity behavior;
- persistence semantics;
- serialization boundaries;
- consistency expectations;
- migration behavior where relevant.

#### Error and Validation Behavior

Verify explicit failure requirements rather than checking only successful execution.

#### Build and Test Integrity

Run relevant:

- compilation;
- static checks;
- unit tests;
- application tests;
- integration tests;
- architecture tests;
- repository-specific validation commands.

Do not equate a green test suite with complete product correctness.

#### Non-Goal Compliance

Check that excluded functionality, speculative features, or out-of-scope architectural changes were not introduced.

#### End-to-End Product Fit

Determine whether the complete implementation, considered as one system, produces the product described in Stage 1.

### Traceability Matrix

Stage 3 should map target-system requirements to evidence.

A useful structure is:

| Requirement | Implementation Evidence | Test or Validation Evidence | Status |
| --- | --- | --- | --- |
| Requirement identifier or concise description | File, type, behavior, or interface | Test, command, scenario, or inspection | Pass / Fail / Partial |

The matrix should be complete enough to detect unvalidated requirements but need not become unnecessarily verbose.

### Defect Classification

Validation findings should distinguish:

#### Critical

The system cannot be considered the specified product.

Examples include missing core capability, broken architecture boundary that invalidates the design, data corruption risk, or unusable primary workflow.

#### Major

A significant required behavior is incorrect or incomplete but the product remains substantially recognizable.

#### Minor

A limited defect that does not materially alter the product's primary behavior or architecture.

#### Specification Gap

The implementation exposes a product decision that the authoritative specification never resolved.

This is not automatically an implementation defect.

The gap should be returned to product authority for resolution.

### Correction Loop

If Stage 3 finds implementation defects:

1. identify the violated requirement;
2. determine the actual root cause;
3. create the smallest correction scope that restores conformance;
4. implement the correction;
5. rerun affected tests;
6. rerun any broader validation that could be impacted;
7. update the traceability evidence.

Do not rewrite the target-system specification merely to make an incorrect implementation appear compliant.

### Stage 3 Validation Prompt

```text
You are the independent product and system validator.

Your task is to determine whether the current implementation actually satisfies the authoritative target-system specification.

Do not trust implementation summaries or prior completion claims without verification.

Use as primary evidence:
1. the target-system specification;
2. authoritative project constraints and architecture rules;
3. the actual repository;
4. executable behavior and tests.

Inspect the implementation independently.

Validate:
- complete requirement coverage;
- observable behavioral correctness;
- important workflows and edge cases;
- required failure and validation behavior;
- architectural conformance;
- dependency and ownership boundaries;
- interface and contract semantics;
- data and state integrity;
- compatibility requirements;
- build integrity;
- automated tests;
- integration behavior;
- compliance with explicit non-goals.

Create a traceable mapping from every material target-system requirement to implementation evidence and validation evidence.

Do not treat passing tests as proof that requirements omitted from the tests were implemented.

Classify findings as:
- Critical;
- Major;
- Minor;
- Specification Gap.

For every failed or partial requirement:
- identify the requirement;
- identify the observed implementation;
- explain the mismatch;
- identify the evidence;
- state the minimum correction necessary.

If corrections are authorized, implement only the necessary correction scope, rerun affected validation, and then rerun any broader checks that could have been impacted.

The system passes Stage 3 only when:
1. all material target-system requirements are implemented;
2. required architecture and contracts are preserved;
3. required builds and tests pass;
4. system-level behavior matches the specification;
5. no unresolved Critical or Major implementation defects remain;
6. any remaining limitations are explicitly permitted by the target-system specification.

Produce a concise final validation report containing:
- overall result;
- requirement coverage status;
- validation performed;
- defects found and disposition;
- unresolved specification gaps;
- evidence supporting the final result.
```

### Stage 3 Completion States

Stage 3 may end in one of four states.

#### Pass

The implementation conforms to the target-system specification and is ready for the next lifecycle stage.

#### Pass With Minor Findings

The product is conformant enough to proceed, with explicitly documented minor defects or limitations.

#### Correction Required

Implementation defects prevent validation from passing.

Return to the relevant Stage 2 execution mode for correction, then repeat affected Stage 3 validation.

#### Product Decision Required

A specification gap prevents a valid determination.

Return only the unresolved product decision to the user, update the target-system specification once resolved, then correct and revalidate the implementation as necessary.

## Cross-Stage Handoff Rules

### Stage 0 to Stage 1

Pass established product intent, not a transcript dump.

Preserve unresolved product decisions explicitly.

### Stage 1 to Stage 2

The target-system specification is authoritative.

The decomposition is an implementation plan and may not silently redefine the target.

### Stage 2A Between Build Sessions

Use the actual repository state after the previous session.

Do not prepare later detailed prompts from stale assumptions when the current code can be inspected.

### Stage 2 to Stage 3

Pass the final repository and authoritative specification.

Implementation summaries may assist orientation but must not control validation conclusions.

### Stage 3 Back to Stage 2

Corrections should be scoped to actual validation findings.

Do not reopen unrelated completed work without evidence that it is affected.

## Re-Entry and Recovery

### Re-Entering With an Existing Conversation

When the user invokes this manual after substantial informal discussion:

1. inspect the conversation;
2. extract established product intent and decisions;
3. map them to the required Stage 0 and Stage 1 information;
4. identify only material gaps;
5. continue from the earliest incomplete requirement.

Do not restart at Stage 0 merely because no formal discovery artifact exists.

### Re-Entering With an Existing Specification

If a target-system specification already exists:

1. evaluate whether it contains sufficient capabilities, behavior, boundaries, invariants, failure semantics, fixed decisions, and completion evidence;
2. repair only meaningful omissions;
3. proceed to decomposition or Stage 2.

### Re-Entering With an Existing Build Plan

If build phases already exist:

1. verify that the target system they implement is known;
2. verify dependency soundness and coverage;
3. preserve valid phase definitions;
4. proceed to Stage 2A or Stage 2B.

### Re-Entering During Construction

Inspect:

- completed work;
- current repository state;
- remaining requirements;
- failed or incomplete tests;
- current phase boundaries.

Resume from the actual state rather than replaying earlier sessions.

### Re-Entering With a Completed Product

Proceed directly to Stage 3 when the target-system specification is sufficiently known.

If no authoritative target specification exists, reconstruct it from reliable product requirements before attempting validation.

## Recommended Default Workflow

### Workflow A

For projects requiring visibility and control:

1. Stage 0 — Product Discovery and Requirements Elicitation.
2. Stage 1 — Target-System Specification and Minimum Sound Build Decomposition.
3. Stage 2A — Controlled Session-Based Construction.
4. Stage 3 — Independent Product and System Validation.

### Workflow B

For projects where the user wants minimal intermediate management:

1. Stage 0 — Product Discovery and Requirements Elicitation.
2. Stage 1 — Target-System Specification.
3. Stage 2B — Autonomous Product Construction.
4. Stage 3 — Independent Product and System Validation.

The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.
