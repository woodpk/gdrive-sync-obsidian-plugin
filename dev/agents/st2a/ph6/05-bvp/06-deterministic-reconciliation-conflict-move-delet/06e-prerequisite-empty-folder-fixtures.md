# BVP-S06E Prerequisite — Generic Empty-Folder Fixtures

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S06E  
**Predecessor:** accepted S06D reviewed integration state `c7c2f048eee9b295488af63553b19d373fdee451`

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
