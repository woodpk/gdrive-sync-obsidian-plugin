# BVP-S08C — Bounded Device Command Agent and Sequence Safety

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08C production-control prerequisite + post-prerequisite architecture confirmation

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.


## 0.1 Final Dispatch Binding

Repository coordinates:

- exact accepted predecessor / PHX-CI base: `975c211d74fdad04c58e2fc6d4d35b3ab66c9460`;
- task branch: `bvp-s08c-device-command-agent`;
- accepted production-control prerequisite implementation: `24a5f94518679254d4855a4a2f0d42e15e939c64`;
- accepted prerequisite evidence: `d4cfef6a48e257ca2d7b43c74400134175406c2f`;
- accepted production control seam: `src/product/live-validation-control-seam.ts`;
- accepted validation composition: `test-platform/src/live-device/validation-entrypoint.ts` + `build-validation-artifact.ts`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework version: `0.2.0-dev.2`;
- shipping production artifact baseline: `main.js` 885,307 bytes / SHA-256 `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`;
- current live-device/relay baseline: 176 / 750 logical TypeScript LOC / 2 files;
- framework core remains frozen at 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- production seam remains 187 / 350 logical LOC / 3 of 4 files and S08C has no authority to expand it.

Bound command vocabulary:

1. `fixture-put` — bounded disposable fixture write, either inline text or deterministic generated pattern;
2. `fixture-remove` — remove one bounded disposable fixture path;
3. `observe-file` — objective bounded file existence/size/SHA-256 observation;
4. `production-preview` — `manual` or `verify-reconcile`, returning bounded plan summary only;
5. `production-execute` — execute one already-produced plan ID and return the authoritative new S08A terminal receipt;
6. `production-control` — `pause`, `resume`, or `cancel-active-sync`;
7. `observe-product` — copied production status plus latest copied production receipt.

Each command includes exact `runId`, `deviceId`, positive integer `sequence`, and non-empty `commandId`.

Sequence policy:

- first admitted command must be sequence 1;
- after a completed sequence N, only N+1 may execute;
- exact duplicate delivery of N with the same canonical command body returns the stored bounded result without re-executing;
- N with a different command body is a sequence conflict;
- sequence < N is stale;
- sequence > N+1 is a gap;
- before any side effect, sequence state is durably claimed through the injected sequence-state store;
- if a claimed command has no completed result after restart, it is classified outcome-uncertain and MUST NOT re-execute;
- only the most recent run/device sequence claim/result is required; no scenario graph, future-step state, or final verdict may be stored.

Fixture boundary:

- all fixture paths must be relative descendants of one constructor-bound `BVP-VALIDATION/<run-scope>` root;
- absolute paths, backslashes, empty/dot/dot-dot segments, and escape attempts fail closed before the fixture port is called;
- inline text is bounded;
- deterministic-pattern generation is bounded by an injected maximum and exists only to permit later large-transfer fixtures without transmitting large payloads through the mailbox;
- fixture results are objective existence/size/SHA-256 observations, not scenario verdicts.

Production-result authority:

- an accepted `production-execute` acknowledgement is NOT synchronization success;
- the agent snapshots the pre-execution receipt, awaits the existing production `executePlan` call, then requires a newly produced receipt correlated to the requested plan ID;
- missing, stale, or mismatched receipt is command failure;
- receipt terminal `uncertain`, `failed`, `blocked`, `partial`, etc. is propagated verbatim and never upgraded to success.

Exact writable-path allowlist:

- NEW `test-platform/src/live-device/device-command-agent.ts`;
- `test-platform/src/live-device/validation-entrypoint.ts`;
- NEW `test-platform/test/s08c-device-command-agent.test.ts`;
- `test-platform/test/s08b-validation-build-entrypoint.test.ts` only to update the accepted shipping-artifact baseline and expected validation bundle inputs;
- `test-platform/test/architecture-metrics.test.ts` only to update the actual live-device LOC baseline after S08C;
- this S08C task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No production, governance, PowerShell, PHX-CI, package, manifest, OAuth, scenario, mailbox/relay, or external-runner path is writable.

Validation-artifact composition:

- `validation-entrypoint.ts` must install a non-enumerable validation-only command-agent factory alongside the existing build identity;
- this inclusion must cause the accepted S08B validation artifact to contain the S08C agent while ordinary production `main.js` remains free of `test-platform/**` implementation;
- S08B focused regression expectations must be updated to the accepted prerequisite shipping artifact hash and the new live-device validation input set.

Focused proof must cover:

- correct next command executes once;
- wrong run and wrong device reject without fixture/production calls;
- stale and gap sequences reject;
- exact duplicate returns stored result without repeated mutation;
- duplicate sequence with altered command body rejects;
- claimed-but-unfinished prior sequence remains outcome-uncertain after agent reconstruction and is not retried;
- malformed/unsupported input fails closed;
- fixture path escape fails before fixture mutation;
- bounded text/pattern validation;
- production preview summary remains bounded;
- production execute requires a newly correlated terminal receipt and propagates non-success terminal classifications unchanged;
- pause/resume/cancel delegation;
- product observation is copied/read-only;
- validation artifact includes the S08C agent/factory and ordinary production artifact retains the accepted predecessor shipping hash;
- architecture metrics remain within the 750-LOC live-device/relay limit.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08c-device-command-agent.test.js .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

BVP-GOV-010 size gate: PASS. This child adds one bounded validation-only runtime module, extends one existing validation-only entry module, and adds one focused contract test. It creates no second runner, router/plugin framework, distributed workflow engine, persistence/evidence family, production seam, PowerShell, or transport implementation.


## 0.2 Ready-for-Verification Record

BVP-S08C is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic implementation HEAD: `47b02e4fa72a9fd5a32f1a6e60513e102f51997b`;
- exact accepted predecessor / PHX-CI base: `975c211d74fdad04c58e2fc6d4d35b3ab66c9460`;
- branch: `bvp-s08c-device-command-agent`;
- implementation adds one validation-only runtime module `test-platform/src/live-device/device-command-agent.ts`;
- `validation-entrypoint.ts` exposes the agent factory only in the validation artifact;
- S08B regression proof is updated to the accepted prerequisite production hash and the enlarged validation-only input set;
- architecture-metrics actual-repository baseline is 482 live-device/relay logical TypeScript LOC;
- live-device/relay budget remaining after S08C: 268 LOC;
- production seam remains 187 / 350 LOC and 3 / 4 files;
- framework core remains 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- BVP PowerShell remains 4 scripts / 1,492 LOC;
- scenario-specific production and PowerShell remain 0 / 0;
- production, governance, PowerShell, PHX-CI, package, manifest, OAuth, scenario, mailbox/relay, and external-runner implementation are unchanged.

The implemented command set is exactly:

- `fixture-put`;
- `fixture-remove`;
- `observe-file`;
- `production-preview`;
- `production-execute`;
- `production-control`;
- `observe-product`.

Safety proof encoded in the focused tests includes:

- run/device mismatch rejection before mutation;
- first/next sequence enforcement;
- gap and stale sequence rejection;
- exact duplicate replay without repeated effect;
- altered duplicate sequence conflict;
- write-ahead sequence claim before side effects;
- restart behavior that leaves an unfinished claimed command outcome-uncertain and non-replayable;
- malformed and unsupported command rejection;
- fixture-root escape prevention and bounded text/pattern generation;
- objective fixture verification;
- bounded manual and Verify/Reconcile plan summaries;
- production execution requiring a newly correlated production receipt;
- propagation of `uncertain` without upgrading it;
- pause/resume/cancel delegation;
- copied product observation;
- validation artifact factory inclusion and ordinary production bundle isolation.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08c-device-command-agent.test.js .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

S08C remains unaccepted until authoritative PHX-CI passes and the complete persisted JSON, Markdown, and execution log are reviewed.


## 0.3 Acceptance Record

BVP-S08C is **COMPLETE / ACCEPTED**.

Authoritative acceptance lineage:

- accepted implementation HEAD: `441e7cdd3bfe215b2d47d27c9a1eb4efe90711f8`;
- authoritative PHX-CI evidence commit: `ac039c73b72afa3f9bf8a9f1e5bb1cb1d35179d6`;
- authoritative PHX-CI run ID: `340a0f70-b945-42f1-a4a4-1e735f06f1cb`;
- exact verification base: `975c211d74fdad04c58e2fc6d4d35b3ab66c9460`;
- complete persisted JSON, Markdown, and 7,271-line execution log reviewed before acceptance;
- focused S08B/S08C/architecture-metrics proof: 44/44 PASS;
- complete repository suite: 835/835 PASS;
- `npm ci`: 0 vulnerabilities;
- every required PHX-CI stage: PASS / exit 0;
- architecture guard: PASS / 0 violations;
- ordinary shipping artifact: `main.js` 885,307 bytes / SHA-256 `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`;
- validation artifact: 897,431 bytes / SHA-256 `f7a0bf1cfcc958e0b55de83fede7fadcbc254da12f3f092b8490fc8bee29786b`, reproduced deterministically twice.

Accepted S08C semantics:

- exactly one bounded command executes at a time;
- run/device mismatch rejects before fixture or production mutation;
- sequence 1 is the first admissible sequence and only the next sequence may execute;
- stale and gap sequences reject;
- exact duplicate delivery returns the stored bounded result without repeating the effect;
- altered duplicate sequence is a conflict and does not execute;
- the sequence claim is persisted before side effects;
- an interrupted claimed command remains `prior-outcome-uncertain` after agent reconstruction and is not retried;
- malformed/unsupported commands fail closed;
- fixture mutation is constrained to the constructor-bound `BVP-VALIDATION/<run-scope>` root and rejects path escape;
- inline and deterministic-pattern fixture generation are bounded;
- production preview returns bounded plan metadata only;
- production execute requires a newly correlated S08A terminal receipt and never treats transport/action acknowledgement as synchronization success;
- production terminal classifications, including `uncertain`, are propagated rather than upgraded;
- pause/resume/cancel delegate only to the accepted production-control seam;
- product/receipt observations are bounded copies;
- validation artifact exposes the S08C factory while ordinary shipping `main.js` remains free of validation-only implementation.

Accepted architecture state:

- production source: 16,813 logical LOC;
- production seam: 187 / 350 logical LOC, 3 / 4 files;
- framework core: 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- live-device agent/relay: 482 / 750 logical TypeScript LOC, leaving 268 LOC for S08D;
- scenario catalog: 70 scenarios / 1,524 logical LOC;
- BVP PowerShell: 4 scripts / 1,492 logical LOC;
- scenario-specific production source: 0 files;
- scenario-specific PowerShell: 0 files.

This closes S08C. S08D remains separately bound and verified work; S08C acceptance does not authorize transport to alter production synchronization authority.

## 1. Objective

Implement the validation-only device agent that executes one bounded addressed command at a time inside Obsidian and returns one typed bounded result/observation, while rejecting stale, duplicate, misaddressed, or invalid commands.

The device agent is not a scenario runner.

## 2. Required End State

The validation-only agent supports the minimum generic command families required by later live execution, such as:

- bounded fixture mutation within the authorized validation fixture scope;
- production preview;
- production execute/sync;
- production reconcile/verify;
- objective observation of bounded local/product state;
- lifecycle/checkpoint acknowledgement where the device can observe it;
- named generic validation fault activation only where already authorized and validation-only.

Every command/result binds to:

- run identity;
- target device identity;
- monotonically controlled command/sequence identity;
- command kind and bounded arguments;
- terminal result/classification;
- production run receipt/correlation when a production synchronization command is invoked.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08B predecessor SHA;
- task branch;
- accepted validation-only entrypoint/composition;
- actual production operations/receipt surfaces callable inside Obsidian;
- exact bounded command vocabulary needed by S09 obligations;
- exact agent/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- live-agent LOC baseline/budget;
- size-gate confirmation.

Binding may enumerate concrete command names but may not turn the agent into a scenario engine.

## 4. Required Semantics

### 4.1 Addressed single-command execution

The agent evaluates one command independently against run/device/sequence validity, executes it if valid, and returns a bounded result.

It does not decide the next scenario step.

### 4.2 Run/device identity

Commands for another run/device are rejected/ignored with an explicit mismatch result and produce no product/fixture mutation.

### 4.3 Sequence safety

The agent must prevent stale or duplicate commands from causing repeated unsafe effects.

At minimum:

- lower/previous completed sequence IDs do not re-execute;
- exact duplicate command delivery is idempotently rejected or returns the prior bounded result without repeating the effect;
- an invalid sequence transition does not silently execute.

The exact monotonic policy may follow the simplest design compatible with later transport semantics.

### 4.4 Production commands

Commands claiming synchronization behavior invoke the installed production path and return the S08A production terminal receipt/equivalent plus bounded observations.

The agent cannot manufacture a PASS classification.

### 4.5 Fixture mutation boundary

Validation fixture mutation is strictly bounded to disposable test-controlled fixture content and cannot mutate arbitrary unrelated user vault data.

### 4.6 No scenario state machine

The agent cannot store whole scenario definitions, branch based on scenario ID, choose future commands, aggregate final scenario verdict, or persist distributed suite state.

## 5. Hard Budget

The live-device agent/relay subset across S08 remains maximum **750 logical TypeScript LOC**.

This child must report its contribution to that subset.

## 6. Invariants

- External runner owns global sequence/verdict.
- Agent owns only command validity/execution/result.
- Production owns synchronization behavior.
- Command metadata is not synchronization authority.
- No token export/new OAuth scope.
- Validation-only agent excluded from shipping production artifact.

## 7. Material Edge / Failure Cases

Tests must cover:

- correctly addressed next command executes once;
- wrong run rejected;
- wrong device rejected;
- stale sequence rejected;
- duplicate sequence does not repeat effect;
- malformed/unsupported command fails closed;
- production operation failure/ambiguity propagates accurately;
- fixture command cannot escape authorized fixture scope;
- agent restart retains only the minimal sequence safety required by the frozen command protocol, without becoming scenario persistence.

## 8. Engineering Discretion

The agent may choose:

- command/result discriminated unions;
- local sequence-state representation;
- exact duplicate-result handling;
- private handlers;
- validation-only storage necessary for bounded sequence safety.

Do not add a generic RPC framework or distributed workflow engine.

## 9. Dependencies

Consumes S08A production receipt and S08B validation-only entrypoint.

S08D supplies transport; S08E supplies external scenario authority.

## 10. Acceptance Criteria

Acceptance requires bounded command vocabulary, run/device/sequence safety, single-command execution, production-path fidelity, fixture containment, no scenario engine, live-agent budget compliance, shipping exclusion, architecture guard/metrics PASS, and authoritative PHX-CI PASS.

## 11. Non-Goals

Do not implement:

- Drive-backed mailbox/Windows relay;
- external live scenario executor;
- human checkpoint orchestration;
- full physical scenario catalog;
- production scenario UI.

## 12. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, command vocabulary, run/device/sequence tests, fixture-boundary proof, live-agent LOC contribution, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08D.
