# BVP-S07B Prerequisite — Declarative Automatic / Incremental Production Invocation

## 0. Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Parent:** BVP-S07B  
**Predecessor:** architecture-reviewed accepted recovery-control integration `436b0d902c463adc78819344b715ae0fd3ac1605`  
**Branch:** `bvp-s07b-prereq-automatic-incremental-sync`

## 0.1 Ready-for-Verification Record

The micro-prerequisite implementation is complete and ready for authoritative PHX-CI.

- semantic implementation HEAD: `fdd9258f676454d06c4f5f4cf456176a442ae302`;
- PHX-CI base: `436b0d902c463adc78819344b715ae0fd3ac1605`;
- branch: `bvp-s07b-prereq-automatic-incremental-sync`;
- framework-core delta: +2 logical TypeScript LOC;
- projected framework core: 3,996 / 4,000;
- runtime module count unchanged at 10;
- production/seam/PowerShell/PHX-CI implementation delta: 0;
- existing `synchronize` semantics are unchanged;
- new `automatic-sync` invokes only the existing production `runAutomatic("local-change")` path and surfaces hard terminal controller states.

Authoritative PHX-CI remains the acceptance authority.

## 0.2 Acceptance / Closure Record

The S07B automatic/incremental invocation prerequisite is **COMPLETE / ACCEPTED**.

- accepted implementation HEAD: `626f6a48f4580f28c8fa527596bf982a55d4522a`;
- authoritative PHX-CI evidence: `cd28debaff771c3a344d4918a27fac06e93bd417`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- complete persisted evidence set reviewed before acceptance:
  - JSON: `dev/test-results/20261001T031754Z-operator-bvp-s07b-prereq-automatic-incremental-sync-626f6a48f458.json`;
  - Markdown: matching `.md` report;
  - execution log: matching `.log` report, 6,387 lines;
- focused verification: 2/2 PASS;
- complete repository suite: 830/830 PASS;
- all PHX-CI stages: PASS / exit 0;
- architecture guard: PASS, 0 violations;
- framework core: 3,996 / 4,000 logical TypeScript LOC (+2), 10 runtime modules;
- production source: unchanged at 16,668 LOC;
- approved production seam: unchanged at 113 LOC / 1 file;
- scenario catalog: unchanged at 45 scenarios / 952 LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 LOC;
- scenario-specific production / PowerShell: 0 / 0;
- production artifact unchanged: `main.js` 880,512 bytes, SHA-256 `cee1da879b4c5c73894cb7dee84e55ea434f9dd66a54f59174d9893657f7a860`;
- no genuine `not ok`, hidden nonzero stage, hidden BLOCKED/FAIL verdict, or artifact discrepancy exists in the complete log;
- only non-pass diagnostic is the existing npm audit notice for 2 moderate vulnerabilities.

The accepted prerequisite adds one generic declarative `production:automatic-sync` operation that delegates to existing production `runAutomatic("local-change")` semantics. It does not redefine `synchronize`, add a runtime module, or alter production behavior.

## 1. Objective

Expose the existing production automatic/incremental synchronization path through the frozen declarative production-step family so S07B can prove that an invalid persisted Drive cursor is detected by the incremental path and leads to conservative recovery/reconciliation behavior.

Do not redefine the existing `synchronize` step. Its accepted S05 meaning remains reviewed manual/full synchronization.

## 2. Required End State

Add one generic production operation:

`automatic-sync`

Behavior:

- invokes `ProductController.runAutomatic("local-change")`;
- waits for automatic-run quiescence;
- reads the existing controller surface after completion;
- returns a blocked scenario outcome when the production surface is a hard terminal state:
  - `recovery-required`;
  - `authentication-required`;
  - `offline-deferred`;
  - `error`;
- otherwise returns completed;
- performs no test-side state repair and makes no synchronization decisions.

## 3. Writable Allowlist

Implementation/test:

- `test-platform/src/scenario/scenario-contract.ts`
- `test-platform/src/scenario/scenario-runner.ts`
- `test-platform/test/s07b-automatic-incremental-prerequisite.test.ts`

Documentation:

- `dev/agents/st2a/ph6/05-bvp/07-deterministic-crash-recovery-fault-safety-scale-/07b-prerequisite-automatic-incremental-sync.md`
- `dev/agents/st2a/ph6/05-bvp/07-deterministic-crash-recovery-fault-safety-scale-/07b-state-cursor-listing-root-recovery-scenarios.md`
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`

No other path is writable.

## 4. Architecture Constraints

- framework core baseline: 3,994 / 4,000 logical TypeScript LOC;
- net framework-core delta MUST be <=6 LOC;
- no new runtime module;
- production/seam/PowerShell/PHX-CI/governance implementation delta: 0;
- no new runner, state machine, persistence family, fault framework, or observation family.

If this cannot fit, stop BLOCKED.

## 5. Focused Proof

The focused test must prove:

- ordinary `automatic-sync` executes through the existing production automatic path;
- after a trusted cursor is invalidated by the already-accepted generic control, `automatic-sync` returns blocked / `recovery-required`;
- the invalid cursor is not silently advanced or treated as authoritative absence;
- a subsequent explicit reviewed full reconcile can safely re-establish a current cursor without destructive inference;
- the existing `synchronize` semantics remain unchanged.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07b-automatic-incremental-prerequisite.test.js`

PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`  
PHX-CI base: `436b0d902c463adc78819344b715ae0fd3ac1605`  
Change class: `ordinary`.

## 6. Stop

Stop after authoritative PHX-CI acceptance and architecture review. Do not implement S07B proper scenarios on this branch.
