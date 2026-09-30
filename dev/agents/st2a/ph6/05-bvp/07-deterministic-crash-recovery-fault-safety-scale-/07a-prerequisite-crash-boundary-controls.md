# BVP-S07A Prerequisite — Generic Crash-Boundary Controls

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07A  
**Predecessor:** accepted BVP-S06 stage closure `058b4ac9b0bc745f687ed1691ef79f846a790361`

## 0.1 Ready-for-Verification Record

Implementation is complete and ready for authoritative PHX-CI.

- implementation HEAD: `212a5fadc488d973558fdffcb7509abfc9673f47`;
- PHX-CI base: `56d4abdfbaf56206f58d4d86c5214d833d002480`;
- changed implementation paths: exactly the six writable allowlist paths;
- production / production-seam / PowerShell / PHX-CI delta: 0;
- expected framework-core delta: +65 logical TypeScript LOC, approximately 3,929 / 4,000;
- exposed boundaries: `before-remote-dispatch`, `after-remote-effect`, `before-canonical-state-write`, `after-canonical-state-write`;
- each boundary is one-shot and retained across runtime reconstruction only as persisted/physical reality, not as an armed crash.

## 0.2 Failed Verification / Bounded Repair Record

Initial authoritative PHX-CI evidence `c97ca4e93a3b2404a56492b91aa7af115f1ecaa9` blocked promotion because 3 of 39 focused prerequisite tests failed.

Demonstrated defects and bounded repair:

- the before-REMOTE-dispatch test incorrectly required the retained effect stage to remain `intent-persisted`; production correctly advances durable authority to `dispatch-authorized` before entering the REMOTE mutation port, so the assertion now verifies retained `dispatch-authorized` authority plus no physical/canonical effect;
- canonical-state crash injection originally wrapped every `saveTrusted` call and therefore fired on unrelated cursor/state-learning persistence before physical mutation;
- the state wrapper now identifies only a true canonical completion candidate: a completed operation whose matching durable intent still contains an `effect-verified` effect. Only that exact write can trigger `before-canonical-state-write` or `after-canonical-state-write`.

Repair commits:

- canonical completion discrimination: `5d1e1cd11b889a0abe4cb25041b6b6f59899abae`;
- corrected before-dispatch retained-authority assertion: `63e780a18433e28aaeb24665070109ff17369808`.

No production, production-seam, PowerShell, PHX-CI implementation, persistence implementation, or architecture-family change was introduced. Repaired framework-core delta is approximately +80 logical/nonblank lines from the prerequisite base, yielding approximately 3,944 / 4,000 pending authoritative PHX-CI measurement.

The prerequisite is repaired and ready for authoritative re-verification.

## 0.3 Second Verification / Compile Repair Record

Second authoritative PHX-CI evidence `d8343f1d3413efa271e2ed10f42acbfa0f2808a7` blocked before executing focused tests because TypeScript strict compilation found one implicit-`any` callback parameter in the new canonical completion discriminator:

`test-platform/src/virtual-world/virtual-world.ts(179,27): TS7006`.

Bounded repair:

- explicit callback type added to the `effect-verified` discriminator only;
- repair commit: `32968cd310548a3f3352df28244f377b708ddbaa`;
- no semantic, production, PowerShell, PHX-CI, persistence, or architecture change.

The prerequisite remains unaccepted pending authoritative PHX-CI PASS.

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
