# BVP-S05C — Generic Observations, Assertions, and Canonical Evidence

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`
**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence
**Predecessor:** accepted S05B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Authoritative Acceptance Record

S05C is complete and accepted.

- accepted S05B predecessor / PHX-CI base: `5a3dc0d5dacdbf6d57e8861359cf7a1aa5726a67`;
- bound S05C HEAD: `5f1b22546ad3b6f1b71bf529d52577a087a0acdf`;
- accepted implementation SHA: `c4e8a25c4ed685446be7facac9c8ee6f3d7cf8dc`;
- authoritative PHX-CI evidence SHA: `99a4218f820edf4355de4cec019f2f537eddfcd1`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused S05C evidence tests: PASS, 9/9;
- integrated BVP tests: PASS, 156/156;
- full repository tests: PASS, 822/822;
- architecture guard and metrics: PASS;
- framework-core delta: +319 logical TypeScript LOC, 3,594 / 4,000 current;
- production source/seam delta: 0;
- live-device/scenario-instance/scenario-specific production/PowerShell delta: 0;
- production artifact unchanged at 872862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted S05C surface provides objective local/remote/device/production observations, bounded equality/status/existence/field/membership/count assertions, canonical machine-readable evidence, human rendering derived from the same machine verdict, deterministic serialization, requirement/invariant traceability, and privacy-safe evidence canonicalization. Missing observations/fields fail closed, one failing assertion prevents overall PASS, diagnostic-looking custom data cannot substitute for authoritative observation fields, and raw note content/token-like fields are excluded from canonical evidence.

No production seam, synchronization policy, checkpoint persistence, live-device transport, plugin/router, scenario catalog, or scenario-specific production behavior was added.

This file is now a historical completion record and authorizes no further S05C implementation work.

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

The S05C contract is bound to the accepted S05B/S05A/S04 repository state as follows:

- exact accepted S05B predecessor / PHX-CI base: `5a3dc0d5dacdbf6d57e8861359cf7a1aa5726a67`;
- exact task branch: `bvp-s05c-observations-assertions-evidence`;
- accepted runner: `DeterministicScenarioRunner`;
- accepted runner result surfaces: `ScenarioExecutionResult`, `ScenarioStepExecution`, and `ScenarioCapabilityResult`;
- accepted hook surfaces: `ScenarioRunnerHooks` and `ScenarioRunnerHookContext`;
- accepted capture access: `ScenarioRunnerHookContext.readCapture(ref)`;
- accepted device access: `ScenarioRunnerHookContext.device(name)` returning `VirtualProductionDevice`;
- accepted local authoritative observation surfaces: per-device `InMemoryLocalVault.observe(path)` and `readFile(path, expectedToken?)`;
- accepted remote authoritative observation surfaces: shared `InMemoryGoogleDriveCore.observe(rootId, path)`, `download(remoteObjectId)`, `inspectObjectsAtPath(rootId, path)`, change-feed/listing state, and managed-root identity;
- accepted durable-state observation surfaces: `VirtualDeviceBacking.load()` and `loadAuthority()`;
- accepted production plan/result authority: runner captures originating from real `ProductController` preview/execute/reconcile requests;
- diagnostics remain corroborative only and may not produce PASS without authoritative observation;
- canonical observation/assertion/evidence implementation path: `test-platform/src/scenario/scenario-evidence.ts`;
- focused test path: `test-platform/test/scenario-evidence.test.ts`;
- bounded existing-vocabulary extension path: `test-platform/src/scenario/scenario-contract.ts`; only assertion capabilities required by this S05C contract may be added; no new step family is authorized;
- bounded runner integration path: `test-platform/src/scenario/scenario-runner.ts`; changes are limited to wiring generic observation/assertion/evidence behavior and canonical result production; runner sequencing architecture may not be redesigned;
- exact S05C implementation-writable allowlist: `test-platform/src/scenario/scenario-contract.ts`, `test-platform/src/scenario/scenario-runner.ts`, `test-platform/src/scenario/scenario-evidence.ts`, and `test-platform/test/scenario-evidence.test.ts` only;
- no production, production-seam, governance, PowerShell, checkpoint-persistence, live-device, plugin/router, or scenario-catalog changes are authorized;
- canonical evidence is test evidence only and must never become synchronization authority;
- machine-readable canonical evidence is authoritative for the human rendering; the human rendering may not independently determine verdict;
- evidence must exclude OAuth secrets, auth codes, access/refresh tokens, unrelated note contents, and unrelated user data by construction;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI change classification: `ordinary`;
- focused S05C command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/scenario-evidence.test.js`;
- authoritative full BVP focused command remains `npm run test:bvp-root`;
- current accepted framework core is 3,275 / 4,000 logical TypeScript LOC, leaving 725 LOC of hard-budget headroom before S05C;
- S05C must preserve sufficient framework-core headroom for S05D; implementation should favor one compact canonical evidence family rather than separate parallel subsystems;
- BVP-GOV-010 size gate: PASS — one bounded existing scenario-platform family is extended with one canonical evidence/observation/assertion implementation, bounded runner/contract integration, and one focused test file; four implementation paths total and no dependency addition.

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

## Invariants

- Assertions consume observations; they cannot rewrite observations or product state.
- Production/external authoritative observations outrank diagnostics and test expectations.
- Missing required evidence cannot produce PASS.
- Machine-readable canonical evidence is the source from which human evidence is rendered, not a competing verdict system.
- Evidence never becomes synchronization authority.
- Evidence excludes secrets and unrelated user data by construction.

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
