# BVP-S07A Prerequisite — Generic Crash-Boundary Controls

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07A  
**Predecessor:** accepted BVP-S06 stage closure `058b4ac9b0bc745f687ed1691ef79f846a790361`

## 1. Objective

Expose four one-shot, deterministic crash points through the existing virtual-world/scenario infrastructure so S07A can test real production crash ordering and restart recovery without changing production semantics.

## 2. Required Capability

Extend the existing `external-state` family with one generic transition:

`inject-crash-boundary`

Required fields:

- `device`;
- `boundary`, exactly one of:
  - `before-remote-dispatch`;
  - `after-remote-effect`;
  - `before-canonical-state-write`;
  - `after-canonical-state-write`.

Semantics:

- the injection is one-shot;
- the next matching production boundary throws a deterministic virtual crash;
- no product recovery result is manufactured;
- retained state/LOCAL/REMOTE reality remains exactly as persisted/applied at the crash point;
- the existing `checkpoint:restart-device` reconstructs fresh runtime objects over that retained reality.

Implementation must wrap existing test-platform composition only:

- REMOTE mutation wrapper for before/after REMOTE effect;
- test-platform state-store proxy/wrapper around canonical `saveTrusted` for before/after canonical commit write;
- durable-authority `saveAuthority` behavior is not intercepted by canonical-state crash points.

## 3. Writable Allowlist

Exactly:

- `test-platform/src/scenario/scenario-contract.ts`;
- `test-platform/src/scenario/scenario-runner.ts`;
- `test-platform/src/virtual-world/virtual-world.ts`;
- `test-platform/test/scenario-contract.test.ts`;
- `test-platform/test/scenario-runner.test.ts`;
- `test-platform/test/virtual-world.test.ts`.

No production, production-seam, PowerShell, PHX-CI, persistence implementation, governance, or architecture-metrics source changes are authorized.

## 4. Acceptance

Prove:

- each boundary validates narrowly and rejects unsupported values/extra fields;
- each boundary is one-shot;
- before-REMOTE-dispatch crash leaves physical REMOTE effect absent while durable intent/state written before the port call remains retained;
- after-REMOTE-effect crash leaves physical REMOTE effect present while canonical state remains uncommitted;
- before-canonical-state-write crash leaves verified physical effect but no canonical commit;
- after-canonical-state-write crash leaves canonical state durably written even though the caller receives a crash;
- restart uses fresh runtime objects over retained reality;
- existing ambiguity injection and restart behavior are unchanged;
- framework core remains ≤4,000 logical TypeScript LOC;
- architecture guard/metrics and authoritative PHX-CI pass.

Stop after prerequisite acceptance. Do not begin S07A scenarios until this prerequisite is accepted and frozen.
