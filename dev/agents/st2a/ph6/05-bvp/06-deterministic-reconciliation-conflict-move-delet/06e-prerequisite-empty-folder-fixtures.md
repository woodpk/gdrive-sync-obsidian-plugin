# BVP-S06E Prerequisite — Generic Empty-Folder Fixtures

## 0. Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Parent:** BVP-S06E  
**Predecessor:** accepted S06D reviewed integration state `c7c2f048eee9b295488af63553b19d373fdee451`

## 0.1 Acceptance Record

This prerequisite is complete and accepted.

- accepted prerequisite input / PHX-CI base: `b41f9e1186003c11cae034a66fb16701d4a4fd19`;
- accepted implementation SHA: `2e91eca2e884f1622e0e0dd8355b780ee4a037ae`;
- authoritative PHX-CI evidence SHA: `5434525ba618faeb895751dfbca79e9010762fc3`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused prerequisite verification: PASS, 24/24;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- framework core: 3,864 / 4,000 logical TypeScript LOC (+13);
- production seam: unchanged at 113 logical LOC / 1 file;
- scenario catalog: unchanged at 28 scenarios / 675 logical LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production: 0;
- scenario-specific PowerShell: 0;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted prerequisite adds only `put-local-folder` and `put-remote-folder` to the existing fixture family and delegates to existing in-memory folder capabilities. No new folder algorithm, runner family, persistence system, production behavior, or architecture family was introduced.

This file is now a historical completion record and authorizes no further prerequisite implementation work.

## 1. Objective

Expose existing empty-folder capabilities through the existing declarative scenario `fixture` family so S06E can prove `FILE-003` without marker files or test-only production behavior.

## 2. Required Capability

Add exactly two fixture variants:

- `put-local-folder`
  - required: `device`, `path`
  - runner seeds one empty folder in the selected device's existing in-memory LOCAL vault.
- `put-remote-folder`
  - required: `path`
  - runner creates one empty folder inside the existing managed REMOTE root using the existing in-memory Drive create operation with `entityKind: "folder"`.

No new folder algorithm, step family, remote root, persistence surface, or production behavior is permitted.

## 3. Writable Allowlist

Exactly:

- `test-platform/src/scenario/scenario-contract.ts`
- `test-platform/src/scenario/scenario-runner.ts`
- `test-platform/test/scenario-contract.test.ts`
- `test-platform/test/scenario-runner.test.ts`

No production, seam, PowerShell, PHX-CI, evidence, checkpoint, persistence, governance, or scenario-definition changes are authorized.

## 4. Acceptance

Prove:

- valid LOCAL and REMOTE folder fixtures validate;
- missing/extra fields fail closed;
- LOCAL fixture creates a present `folder` and no child marker content;
- REMOTE fixture creates a present `folder` in the existing managed root and no child marker content;
- unrelated objects remain unchanged;
- existing scenario behavior is unaffected;
- architecture guard/metrics and authoritative PHX-CI pass.

Stop after prerequisite acceptance. Do not begin S06E scenarios until this prerequisite is accepted and frozen.
