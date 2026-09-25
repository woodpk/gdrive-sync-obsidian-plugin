# BVP-S08D — Minimal Command Mailbox and Windows Relay

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Implement the simplest no-backend transport that can move bounded S08C commands/results between the external controller and live validation participants, using only already-permitted user-owned authority and an optional thin Windows relay where host credential access requires it.

Transport is test-control metadata only.

## 2. Required End State

The transport can:

- publish/address one bounded command to a run + device + sequence;
- let the intended validation participant receive it;
- publish one bounded typed result for that command;
- reject/ignore stale, duplicate, or misaddressed records in coordination with S08C sequence safety;
- retain enough run-scoped records for interruption/resume and evidence correlation;
- operate without developer-hosted backend;
- operate without adding Google OAuth scope;
- avoid exporting device Google tokens/credentials to the external host.

A Windows relay, if required by actual credential boundaries, moves bounded records only and remains stateless regarding scenario meaning.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08C predecessor SHA;
- task branch;
- selected already-permitted transport authority/mechanism based on current product/user credentials;
- exact existing Drive/app-data APIs available to the validation artifact/Windows host;
- whether a Windows relay is necessary;
- exact mailbox/relay/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current live-agent/relay LOC budget.

Binding chooses among already-authorized simple mechanisms; it may not introduce a hosted service or new OAuth scope.

## 4. Required Semantics

### 4.1 Run-scoped metadata

Transport records contain only bounded test-control fields and bounded results. They are not vault content and not synchronization state.

### 4.2 Addressing

Each command/result includes sufficient run/device/sequence identity to prevent another device/run from treating it as current work.

### 4.3 Duplicate/stale delivery

Transport may be at-least-once. Safety comes from S08C run/sequence validation.

The transport must not assume exactly-once delivery if the underlying mechanism cannot guarantee it.

### 4.4 No synchronization authority

Mailbox presence, ordering, or contents cannot override production planner/state authority.

### 4.5 Credential boundary

No device access/refresh token is exported to the external runner merely to access the mailbox.

If the host lacks safe direct credential access, the Windows relay may use already-owned local authority to copy addressed command/result records.

### 4.6 Relay minimality

The relay does not:

- interpret whole scenarios;
- choose next steps;
- aggregate verdicts;
- mutate production synchronization state;
- implement a second queue/workflow platform.

## 5. Privacy / Safety

Mailbox records must exclude:

- OAuth secrets;
- authorization codes;
- access/refresh tokens;
- unrelated user note content.

Fixture/result payloads remain bounded to test-safe metadata/content needed by the command contract.

## 6. Material Edge / Failure Cases

Tests must cover:

- correct command/result round trip;
- wrong-device record ignored/rejected;
- wrong-run record ignored/rejected;
- stale/duplicate record does not repeat effect;
- result correlates to exact command;
- transport reordering does not bypass sequence safety;
- unavailable transport produces BLOCKED/unavailable, not optimistic success;
- relay restart does not require scenario-state reconstruction;
- mailbox metadata cannot be mistaken for managed vault synchronization content.

## 7. Engineering Discretion

The agent may choose the simplest record naming/serialization/polling mechanism consistent with the selected existing authority and bounded live-validation needs.

Do not add a generalized message broker, backend, durable workflow service, or broad transport abstraction family.

## 8. Dependencies

Consumes S08C command/result protocol. S08E consumes this transport through a narrow executor-facing interface.

## 9. Acceptance Criteria

Acceptance requires command/result delivery with run/device/sequence safety, no hosted backend, no new OAuth scope/token export, stateless scenario-meaning relay, privacy constraints, live-agent/relay budget compliance, shipping exclusion, architecture guard/metrics PASS, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- scenario sequencing/verdict;
- production synchronization transport;
- arbitrary file sync over the mailbox;
- human checkpoint policy;
- S09 physical scenario catalog.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, selected transport authority, relay necessity, round-trip/stale/duplicate results, live-agent/relay LOC, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08E.
