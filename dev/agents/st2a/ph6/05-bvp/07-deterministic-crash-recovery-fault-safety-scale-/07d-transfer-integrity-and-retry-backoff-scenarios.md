# BVP-S07D — Transfer Integrity and Retry / Backoff Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** architecture-reviewed accepted S07C closure `4ab412c149a9986347a1e75a2e00909e2e7624d4`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Final Dispatch Binding

S07D is **BOUND / EXECUTABLE** from the architecture-reviewed accepted S07C closure.

- exact PHX-CI base: `4ab412c149a9986347a1e75a2e00909e2e7624d4`;
- branch: `bvp-s07d-transfer-integrity-retry-backoff`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework core: 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- production source: 16,670 logical LOC;
- production seam: 113 LOC / 1 file;
- scenario catalog: 59 scenarios / 1,223 logical LOC;
- BVP PowerShell: 4 scripts / 1,477 logical LOC.

Requirement mappings:

- `XFER-001` — verify transfer content before authoritative commit;
- `XFER-002` and `FILE-013` — unstable/changing local source invalidates the planned transfer;
- `XFER-003` — safe local replacement for downloads;
- `XFER-004` — retry-safe upload/update semantics;
- `XFER-008` — bounded retry/backoff/rate-limit handling;
- `FAIL-002` — bounded transient network retry;
- `FAIL-003` — rate-limit/quota terminal classification.

Accepted existing controls used without framework growth:

- local/remote fixture mutation between preview and reviewed execution for stale-source/revision detection;
- one-shot `inject-remote-mutation-fault` for retryable remote mutation classification;
- deterministic production `reconcile`;
- existing `GoogleHttpTransport` dependency injection for deterministic sleeper/random/clock verification in the focused test.

Writable implementation allowlist:

- `test-platform/scenarios/07d/*.ts`;
- `test-platform/test/s07d-transfer-integrity-retry-backoff.test.ts`;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No platform-core or production implementation change is authorized. Framework-core headroom is zero.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07d-transfer-integrity-retry-backoff.test.js`

## 1. Objective

Add declarative deterministic coverage for transfer integrity, files changing during transfer, provider/network retry classification, backoff, and rate-limit behavior.

## 2. Required End State

Executable scenarios cover:

- upload/download content integrity;
- local file changing while upload/read-transfer evidence is being established;
- remote content/revision changing during download where product contracts require detection;
- transient retryable provider/network failure;
- non-retryable/permanent failure;
- rate-limit/throttle classification;
- deterministic backoff/retry scheduling without wall-clock sleeps;
- retry bound/exhaustion semantics required by the product target.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07C predecessor SHA;
- task branch;
- current transfer/retry/backoff requirement IDs and production classifications;
- accepted S04 deterministic time/fault controls;
- exact scenario/fixture/test writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

No new retry/fault framework is authorized.

## 4. Required Semantics

### 4.1 Integrity

A successful transfer claim must be backed by the product's required content/hash/revision verification.

Tests must detect wrong/truncated/corrupted content rather than relying only on request success.

### 4.2 File changes during transfer

If a local/remote source changes between observation and committed transfer result, production must follow its target stability/precondition/retry/conflict semantics rather than silently accepting stale bytes.

### 4.3 Retry classification

Retryable and non-retryable failures must be distinguished according to production classification.

The simulator supplies external failure class; production chooses retry behavior.

### 4.4 Backoff

Backoff timing/count is tested through deterministic time controls. No real sleeps are necessary.

### 4.5 Rate limits

Rate-limit behavior must preserve provider classifications/retry hints where product contracts use them and must not become a generic success after arbitrary retries.

## 5. Invariants

- Integrity is objectively verified.
- Retry policy remains production code.
- Fault injector does not call retry itself.
- Backoff uses deterministic time.
- Bounded retry cannot become infinite test execution.
- Scenario-only default remains intact.

## 6. Material Edge / Failure Cases

Required proof includes:

- correct transfer integrity passes;
- corrupted/truncated expected content fails;
- source mutation during transfer is detected/handled safely;
- retryable failure retries according to policy;
- non-retryable failure does not retry improperly;
- rate-limit classification follows target semantics;
- backoff progression is deterministic;
- retry exhaustion yields required terminal classification;
- wrong retry expectation fails.

## 7. Engineering Discretion

The agent may choose representative payload sizes/content and failure sequences using accepted generic fault/time controls.

## 8. Dependencies

Consumes S04 Drive/local/time/fault capabilities and current production transfer/retry contracts.

## 9. Acceptance Criteria

Required transfer/retry scenarios pass through real production logic; integrity corruption is detectable; retry/backoff classifications are deterministic; no new framework/core/production change occurs; budgets and authoritative PHX-CI pass.

## 10. Non-Goals

Do not cover physical mobile resource constraints/actual provider timing, which belong to S09D; do not cover quota/local-disk/destructive/config/lifecycle (07E) or scale measurement (07F).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, integrity/retry/backoff results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07E.
