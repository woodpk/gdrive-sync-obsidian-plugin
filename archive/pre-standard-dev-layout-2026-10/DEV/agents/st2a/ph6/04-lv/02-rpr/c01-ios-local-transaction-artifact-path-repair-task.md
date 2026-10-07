# PHASE 6 C01 — iOS Local Transaction Artifact-Path Repair

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-c01-ios-local-transaction-artifact-path-repair-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Authoritative implementation base:

`REPAIR_BASE_SHA = a255d201549f18671113766ff14dde4caa2b8d6c`

Required branch:

`phase6-c01-ios-local-transaction-artifact-path-repair`

Create the branch from exactly `REPAIR_BASE_SHA`. Do not substitute a branch tip, later tasking commit, prerelease tag, or another Phase 6 branch.

This is a **bounded Phase 6 defect repair** discovered by real iPhone C01 physical validation of prerelease `0.1.16`.

Do not perform live synchronization, Google Drive mutation, iPhone remediation, release publication, Stage 3 validation, or unrelated refactoring.

---

## 1. Governing Build Context

This task belongs to:

- Stage 2A — Controlled Session-Based Construction;
- Build Phase 6 — Cross-Platform Hardening and Stage 3 Readiness;
- real-platform C01 validation / bounded defect correction.

The governing decomposition defines Phase 6 as the stage in which the integrated product is exercised on real Windows/iOS runtimes, platform defects are corrected, and the affected and broader verification gates are rerun before Stage 3 handoff.

Preserve all target-system safety invariants, especially fail-closed ambiguity, crash-safe local mutation, durable intent/effect ordering, content verification before authoritative success, and recovery from physical reality rather than assumption.

---

## 2. Confirmed C01 Failure — Do Not Rediagnose From Scratch

C01 on iPhone with plugin `0.1.16` established the following:

- OAuth: PASS.
- Pairing to the intended managed remote: PASS.
- Pre-preview local authority: verified `uninitialized`.
- First preview: 16 operations, no destructive operations.
- First execution operation: `download-create` for `Logs.md`.
- Operation ID: `op:c255aaa37a27dac99c2507789b5bc101744607a5323061079f95ff83a49256a2`.
- Remote object ID: `1Y_b8e14hn7BBYd4NyQg5nvZ60nenEGU1`.
- Physical result: `outcome-unknown`.
- `safeCommittedCount=0`.
- The durable intent remained outstanding and the local transaction remained at `staging`.
- One authorized restart plus one authorized Preview exercised built-in durable recovery.
- Recovery conservatively returned `recovery-required`; no new plan was produced and no mutation was replayed.

The device remains hard-stopped and is **not** part of this implementation task.

### 2.1 Confirmed static root cause

At the authoritative base, `src/product/synchronization-adapters.ts` derives physical sibling stage/backup artifact names in `physicalArtifactPath(...)` using:

```ts
const token = String(sha256Text(String(seed))).slice(0, 24);
```

`src/util/sha256.ts` defines `sha256Text(...)` as a canonical `ContentHash` whose string representation is:

```text
sha256:<64 lowercase hexadecimal characters>
```

Therefore the current token includes the literal `sha256:` prefix, and generated physical artifact filenames contain `:`.

The repository's cross-platform path policy rejects `:` as an invalid filename character. The local transaction implementation validates target, stage, and backup paths before staging I/O. Thus the generated transaction artifact path is invalid before the intended local staging write can safely proceed.

This is a deterministic production defect in filesystem-artifact naming. Do not spend the task rediscovering alternate speculative root causes unless exact base inspection contradicts one of the facts above. If it does, STOP and report the contradiction.

---

## 3. Required End State

Repair local transaction physical artifact naming so that stage and backup sibling paths are:

1. deterministic for the same logical transaction inputs;
2. distinct from the target and from each other;
3. in the same physical parent directory as the target;
4. compatible with the repository's cross-platform path rules for Windows and iOS;
5. composed only from filename-safe token characters for the generated token;
6. stable across `stageAndVerify`, `commitVerifiedStage`, and `recover` for the same logical transaction;
7. still recognizable by the existing operational-exclusion conventions for `.brain-sync-stage-*` and `.brain-sync-backup-*` artifacts;
8. derived without weakening SHA-256 content evidence, transaction identity, durable intent/effect semantics, or recovery safety.

The filename token must **not** contain the canonical hash scheme prefix. A fixed-length lowercase hexadecimal token derived deterministically from the existing seed is acceptable and preferred unless repository inspection establishes an equally safe existing convention that should be reused.

Do not change the meaning or format of canonical `ContentHash` values globally merely to make filenames safe. Canonical hashes must remain `sha256:<hex>` wherever they are evidence/contract values.

---

## 4. Implementation Scope

Primary confirmed implementation area:

- `src/product/synchronization-adapters.ts`
  - `physicalArtifactPath(...)`
  - `ScopedLocalTransactionalMutationPort` only as needed to preserve deterministic physical mapping.

Directly relevant supporting areas to inspect and test:

- `src/util/sha256.ts`
- `src/local/local-vault-access-boundary.ts`
- the repository path-validation implementation used by local transaction validation;
- existing local-transaction, synchronization-adapter, path-scope, and durable-recovery tests.

Modify additional production files only if required to implement the bounded repair correctly. If broader architecture changes appear necessary, STOP and report rather than expanding scope.

---

## 5. Required Behavioral Verification

Add focused regression coverage that proves at minimum:

### 5.1 Filesystem-safe artifact naming

For representative root-level and nested targets:

- generated stage and backup paths contain no forbidden `:` introduced by hash-token formatting;
- the generated token is deterministic and filename-safe;
- stage/backup paths remain siblings of the physical target;
- stage, backup, and target are pairwise distinct;
- repeated mapping of the same logical transaction produces identical physical paths.

Include at least one test that would fail against the exact `0.1.16` behavior.

### 5.2 Local `download-create` transaction path

Exercise the real local transactional boundary far enough to prove a normal create transaction no longer fails path validation solely because of the generated stage/backup names.

Use repository fakes/adapters as appropriate; do not weaken the production validator to make the test pass.

Where practical, prove the staging path can reach verified staging with expected SHA-256/size evidence under the existing transaction contract.

### 5.3 Recovery determinism

Prove that a logical transaction prepared/staged under the corrected naming rule resolves to the same physical artifacts during recovery. Recovery must continue to decide from observed physical reality and must not invent success.

Do not add an unsafe migration that marks the outstanding `0.1.16` C01 transaction successful. Existing unresolved/ambiguous prior state must remain fail-closed unless exact physical evidence satisfies the existing recovery contract.

### 5.4 No regression to transaction safety

Existing tests must continue to prove:

- path validation occurs before unsafe mutation;
- target content is not displaced before verified staging;
- commit requires verified intended content;
- uncertain physical outcomes remain recoverable/fail-closed;
- authoritative state is not advanced ahead of verified physical effects.

---

## 6. Locked Non-Regression Requirements

The following are explicitly outside the repair and must remain unchanged in behavior:

- Google Drive mutation semantics;
- OAuth/PKCE security semantics;
- mobile two-tap production authentication flow;
- **all existing OAuth diagnostic buttons and diagnostic functions** — DO NOT REMOVE, HIDE, CONSOLIDATE, OR DISABLE THEM;
- managed-root pairing semantics;
- reconciliation/planner decisions;
- durable intent/effect lifecycle semantics;
- local recovery policy;
- conflict resolution policy;
- deletion/circuit-breaker policy;
- diagnostic privacy/redaction rules;
- release/install behavior.

Do not clean up unrelated code while touching this area.

---

## 7. Verification Gate

Before stopping, run the repository's authoritative verification appropriate to the exact base, including at least:

1. dependency/install state as required by the repository;
2. TypeScript typecheck;
3. focused tests for synchronization adapters/local transactions/path validation/durable local recovery;
4. the new C01 artifact-path regressions;
5. complete automated test suite;
6. production build;
7. repository checks / diff-whitespace checks used by Phase 6 CI.

If any existing test must be changed, explain why its prior expectation was invalid rather than merely updating it to match the new implementation.

No live iPhone or Drive test is authorized in this task.

---

## 8. Evidence Requirements

Update `dev/evidence/_ca-output.md` with a bounded completion record containing:

- exact input/base SHA;
- branch name;
- exact implementation commit SHA;
- exact final branch HEAD;
- files changed;
- concise root-cause confirmation;
- exact corrected artifact-token/path semantics;
- focused test commands/results;
- complete test-suite result;
- typecheck/build/repository-check results;
- confirmation that OAuth diagnostic controls/functions remain present and unchanged in behavior;
- `git diff --stat` and a statement that scope remained bounded;
- any residual risk requiring real-platform validation.

Do not claim the iPhone defect is physically closed from automated tests alone. The implementation may be declared **ready for C01 real-platform revalidation**, not physically validated.

---

## 9. Stop Conditions

STOP without implementation if:

- `REPAIR_BASE_SHA` does not match the checked-out base;
- the confirmed artifact-token expression or canonical hash format materially differs at the exact base;
- the repair requires changing frozen synchronization contracts;
- the repair would require weakening cross-platform path validation;
- the repair would require resetting/reinterpreting durable authority to manufacture success;
- unrelated repository drift prevents bounded verification.

Otherwise implement, verify, update evidence, and stop for supervisor review.

Do not merge the branch.
Do not publish a release.
Do not resume C01.
