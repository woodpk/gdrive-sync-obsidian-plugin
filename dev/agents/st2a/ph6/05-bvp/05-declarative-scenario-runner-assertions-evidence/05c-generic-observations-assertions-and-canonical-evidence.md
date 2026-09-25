# BVP-S05C — Generic Observations, Assertions, and Canonical Evidence

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence  
**Predecessor:** accepted S05B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add generic objective observations/assertions and canonical machine/human scenario evidence so the runner can make reproducible verdicts from observed production/external state rather than ad-hoc logs.

## 2. Required End State

The platform can generically observe/assert, where applicable:

- production plan/result/terminal classification;
- content/bytes/hash;
- local/remote identity and existence;
- authoritative device/state records;
- conflicts/preservation results;
- remote revisions/change state;
- safety/blocking classifications;
- diagnostics as corroborative context.

Every scenario execution produces:

- one machine-readable canonical result;
- concise human-readable evidence derived from the same result;
- scenario identity;
- execution mode;
- requirement/invariant traceability;
- relevant fixture/input identity;
- observations used;
- assertions and their outcomes;
- terminal verdict;
- failure/blocking reason when not PASS;
- build/device identity fields when applicable to the execution mode.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S05B predecessor SHA;
- task branch;
- actual S05 runner/result interfaces;
- actual S04/production observation surfaces;
- exact observation/assertion/evidence paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- size-gate confirmation.

No binding may make diagnostics the success protocol or invent a second product authority.

## 4. Observation Semantics

### 4.1 Objective source

Observations come from authoritative production results/state or modeled external reality.

Test expectations cannot overwrite observations.

### 4.2 Production terminal observation

Where deterministic production execution already exposes a terminal result/receipt/equivalent, use that authority.

The later P5 live production-run receipt may extend physical observability; this child must not add a P5 production seam prematurely.

### 4.3 Diagnostics are corroborative

Logs may be recorded as supporting context, but a test MUST NOT infer success solely because a diagnostic string appeared.

### 4.4 Missing evidence fails closed

If a required assertion cannot obtain its required observation, the result is FAIL/BLOCKED according to the condition—not optimistic PASS.

## 5. Assertion Semantics

Assertions must be generic by observable capability, not scenario ID.

At minimum support the classes needed for S05 canaries and later S06/S07 work:

- equality/inequality of relevant content/hash/identity;
- existence/absence where authoritative coverage exists;
- expected classification/status;
- expected conflict/preservation outcome;
- expected state/remote identity/revision facts;
- collection/set membership/count where required.

Exact initial assertion names are discretionary. Do not build an unconstrained expression language.

A deliberately incorrect expected value must deterministically fail.

## 6. Evidence Semantics

### 6.1 Canonical result

Machine-readable evidence is the canonical scenario result. Human-readable evidence must not contradict or independently reinterpret it.

### 6.2 Determinism

For semantically identical deterministic executions, evidence ordering/field semantics must be stable. Incidental nondeterministic timestamps/paths should not prevent useful comparison where avoidable.

### 6.3 Privacy

Evidence MUST NOT include:

- OAuth secrets;
- auth codes;
- access/refresh tokens;
- unrelated note contents;
- unrelated user data.

Fixtures may be identified by bounded test-safe identifiers/content hashes rather than dumping arbitrary user content.

### 6.4 Traceability

Evidence retains the scenario's product requirement/invariant IDs so later aggregation can map requirement → scenario → result.

## 7. Material Edge / Failure Cases

Tests must cover:

- correct expectation → PASS;
- deliberately wrong content/hash/identity/status → FAIL;
- missing required observation → FAIL/BLOCKED;
- diagnostics claiming success without authoritative success cannot produce PASS;
- deterministic result serialization/order for repeated deterministic input;
- privacy-sensitive fields are omitted/redacted by construction;
- multiple assertions preserve individual outcomes and overall verdict;
- one failing required assertion prevents overall PASS.

## 8. Engineering Discretion

The agent may choose:

- observation/assertion type organization;
- evidence serialization format;
- human rendering format;
- deterministic field ordering;
- private result aggregation helpers.

Do not add a second evidence schema family or general query/expression engine.

## 9. Dependencies

Consumes S05A scenario metadata and S05B runner/result state plus S04/production observation surfaces.

05D will persist only bounded checkpoint state; canonical evidence must remain separate from synchronization authority.

## 10. Acceptance Criteria

Acceptance requires objective generic observations, fail-closed assertions, wrong-expectation failure proof, canonical machine/human evidence, privacy constraints, requirement traceability, no diagnostic-as-authority behavior, architecture-budget compliance, and authoritative PHX-CI PASS.

## 11. Non-Goals

Do not implement:

- P5 live production run-receipt seam;
- distributed evidence service;
- checkpoint persistence;
- full S06/S07 scenario catalog;
- live-device transport;
- product state mutation from evidence.

## 12. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, observation/assertion families, evidence format, required negative tests, architecture metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 05D.
