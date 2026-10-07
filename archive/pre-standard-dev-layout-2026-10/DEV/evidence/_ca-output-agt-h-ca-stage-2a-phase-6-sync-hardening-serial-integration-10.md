# H-U5-P8 — Remaining Non-Fake Authority Compatibility Closure

Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10`

Work unit: `H-U5-P8`

Status: **COMPLETE — SOURCE/TEST CANDIDATE PROVED AND INTEGRATED**

## 1. Executor model

Verification used the repository's hardened production synchronization composition: caller-supplied writable synchronization authority through `IntegratedSynchronizationStateStore`, `AuthorityCompleteExecutionCoordinator`/`IntegratedProductController` execution, hardened `LocalTransactionalMutationPort` for local effects, and `ReliableRemoteMutationPort` for remote effects. Legacy raw local/Drive mutation callbacks in the repaired test fixtures are fail guards and are not accepted as executable authority.

The authoritative proof was executed in GitHub Actions on the exact candidate with Node 22. No production `src/**` change was made by H-U5-P8.

## 2. Objective and frozen entry state

Objective: repair the five remaining H-owned legacy compatibility failures without weakening non-fake authority, physical-effect, provenance, or fail-closed semantics.

Frozen H-U5-P8 entry head:

`328614dfdf136a9364dbf7e2a01766ad538f7e73`

Pre-state classification:

**LEGACY TEST/HARNESS INCOMPATIBILITY ONLY — NO PRODUCTION DEFECT.**

The five residual failures were stale fixture/expectation compatibility failures against the already-hardened production authority path. No production fault semantics were identified.

## 3. Candidate and final evidence-bearing head

Final proved source/test candidate:

`b91d69f6a0460ee77fd0499b82302e8b8957eaa3`

The integration branch `phase6-sync-integration-h` was rechecked at the frozen entry head immediately before a non-forced fast-forward to that candidate.

Final evidence-bearing branch head: this evidence-only commit. Its authoritative commit SHA is reported in the completion package after GitHub creates the commit, avoiding a self-referential evidence mutation.

## 4. Exact source/test changed-file manifest

Entry `328614dfdf136a9364dbf7e2a01766ad538f7e73` → candidate `b91d69f6a0460ee77fd0499b82302e8b8957eaa3` changes exactly:

1. `test/phase5-group-d-surface-lifecycle-integration.test.ts`
2. `test/phase6-alpha-plan-errors-stability.test.ts`
3. `test/workstreams/drive/phase6-remote-protocol.test.ts`

No `src/**`, contract, canonical-evidence, planning, or other test file changed in the P8 source/test delta.

Candidate → final evidence-bearing head is required and verified after this commit to change exactly:

- `dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10.md`

## 5. Frozen authority hashes

- `src/contracts` tree: `0db68ced179825f929008b502335210260ca2ce3`
- canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- contract-freeze blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- frozen contract-freeze prefix hash: `fe527c76137b2cd578ef7050ee3444498b21a5e0`

All were checked at Gate A and again at Gate H on the exact candidate.

## 6. File-by-file repair summary

### `test/phase5-group-d-surface-lifecycle-integration.test.ts`

- Replaced stale fake/direct authority assumptions with seeded writable authority using `PersistentSynchronizationStateStore` plus `IntegratedSynchronizationStateStore`.
- Supplies `authorityStore` to the controller.
- Supplies hardened `LocalTransactionalMutationPort` for local effect verification/commit.
- Supplies hardened `ReliableRemoteMutationPort` for reserved remote create.
- Legacy raw local and Drive mutation methods are explicit fail guards.
- Scenarios 44/45 express the bad path at the observable stale/precondition boundary while the independent good path commits through the hardened local port.
- Scenario 48 records creation only at the reserved-create hardened boundary; raw Drive `create` remains unused.
- Final authorized test-isolation correction imports `enterSynchronizationLifecycle` and calls `enterSynchronizationLifecycle("active")` at the start of the direct-controller `makeController(...)` fixture. This prevents Scenario 47 runtime disposal's intentional process-global `stopping` lifecycle from leaking into Scenario 48.

### `test/phase6-alpha-plan-errors-stability.test.ts`

- Seeds writable synchronization authority through the integrated state store.
- Uses a hardened reliable remote mutation fixture.
- The `uploaded` list is populated only by verified reserved remote create.
- Raw Drive `create` is a fail guard and remains unused.
- Both edit-stability tests therefore execute through the hardened authority/effect path.

### `test/workstreams/drive/phase6-remote-protocol.test.ts`

- Replaced the stale revision-change expectation with the public V1.3 failure-provenance contract.
- Exact asserted failure provenance is:
  - outcome: `recovery-required`
  - owner: `google-drive`
  - code/reason: `remote-changed-during-coherent-download`
- The fixture also asserts the second post-stream metadata observation, proving the coherent-download revision check is exercised.

## 7. Focused P8 proof

Command surface:

`node --test .test-build/test/phase5-group-d-surface-lifecycle-integration.test.js .test-build/test/phase6-alpha-plan-errors-stability.test.js .test-build/test/workstreams/drive/phase6-remote-protocol.test.js`

Result:

- tests: `49`
- pass: `49`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`

The five named H-U5-P8 targets all pass:

1. `G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records`
2. `G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded`
3. `ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row`
4. `exhausted edit instability is isolated into the CSV while an independent safe upload commits`
5. `workstream A coherent download: remote revision change during transfer cannot be consumed as coherent success`

## 8. Static and build verification

- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npx tsc -p tsconfig.test.json`: PASS
- `npm run build`: PASS

Built `main.js` identity:

- size: `697437` bytes
- SHA-256: `3ee8d4adc859e19d4b003e19c4c1afc294985d542aeaf41d54662d254beb229b`

## 9. V1.3 foundation gate

`phase6-foundation-failure-provenance.test.js`:

- tests: `17`
- pass: `17`
- fail: `0`
- cancelled: `0`

C15 and C16 are present and passing.

## 10. H V1.3 critical-regression gate

Result:

- tests: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped: `0`
- todo: `0`

All `H-I1` through `H-I8` pass.

The exact 13 residual failures are the previously classified G-owned surface:

- `03 upload survives crash/restart at every durable effect stage`
- `04 download survives crash/restart at every durable effect stage`
- `05 move survives crash/restart at every durable effect stage`
- `06 trash survives crash/restart at every durable effect stage`
- `10 durable intended L1 is not substituted by later L2`
- `15 repeated moves preserve stable remote identity`
- `16 create-delete sequence preserves acknowledged deletion history`
- `18 unresolved path A does not block safe path B progress`
- `19 missed watcher is discovered by integrity reconciliation`
- `20 Windows watcher-event loss is recoverable through authoritative integrity read`
- `28 bounded quiescence after mutation pressure stops`
- `29 concurrent same-path creates never silently select one remote winner`
- `G-C2 generic recover routes multiple folder journals by exact journal identity`

No H-owned critical-regression failure remains in this gate.

## 11. Fresh whole-repository gate

Fresh `npm test` result matched the exact planned post-P8 prediction:

- tests: `687`
- pass: `648`
- fail: `22`
- cancelled: `17`
- skipped: `0`
- todo: `0`

Failure split:

- `13` previously classified G-owned failures listed above.
- `9` other previously classified non-G residual failures:
  - `C1 automatic run executes the independently safe subset of a mixed attention plan`
  - `operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs`
  - `a later stable no-op reconciliation resolves transient stale attention without a content mutation`
  - `post-journal stale intent is safely retired before unrelated work continues`
  - `iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle`
  - `sync diagnostics preserve plan/execution semantics and never export vault path or content`
  - `pending throw is Error-level at its exact execution substage and closes the run`
  - `uncertain-journal throw is Error-level at its exact execution substage and closes the run`
  - `mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability`

P8 H-only delta from the planned pre-P8 surface is therefore `+5 pass / -5 fail`, with total and cancellation counts unchanged. All five P8 H-owned failures are removed.

Next planned whole-suite totals after H-U5-P8 are the verified P8 projection:

`687 / 648 / 22 / 17`

No H-U5-P9 work was started in this unit.

## 12. Authoritative proof workflow

GitHub Actions:

- workflow: `H-U5-P8 Remaining Compatibility Proof`
- run ID: `33982099074`
- proof job ID: `101349025190`
- final workflow/job conclusion: `success`

Proof artifact:

- artifact ID: `5686230396`
- name: `h-u5-p8-remaining-compatibility-proof`
- archive size: `40109` bytes
- digest: `sha256:9aeac4b40107735214ed47064646736a9a1dee3dee391b7d6dc28132f249a530`
- expired: `false`

No final-proof nondeterministic failure occurred. Earlier intermediate diagnostics exposed deterministic test-fixture incompatibilities only; the final remaining Scenario 48 defect was deterministic lifecycle-state leakage from the preceding disposal scenario and was corrected solely in the owned test fixture.

## 13. Branch and PR state

Before source/test promotion, `phase6-sync-integration-h` was rechecked at exactly `328614dfdf136a9364dbf7e2a01766ad538f7e73` with no drift.

The branch was then advanced non-forced to the proved source/test candidate:

`b91d69f6a0460ee77fd0499b82302e8b8957eaa3`

PR #45 at Gate H remained:

- state: `open`
- draft: `true`
- merged: `false`
- head ref: `phase6-sync-integration-h`

PR #45 was not otherwise altered by H-U5-P8.

## 14. Stop condition

H-U5-P8 is complete after this evidence-only closure commit is verified to have the proved candidate as its sole parent and to change only this agent-specific evidence file.

Do not infer approval for H-U5-P9, H-U5-P10, G repair, H-U6/H-FINAL, or PR #45 merge from this evidence record.
