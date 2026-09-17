STATUS: COMPLETE

# VH14-C — Durable Runner State / Restart / VH13 Resume Adoption

## Identity and scope

- Agent: `agt-ca-p6-vh14c-durable-resume-01`
- Branch: `phase6-vh14-c-durable-resume`
- Exact authorized Package A base: `e52b653a49490ebd1d7a8c456dad896de44dc4a7`
- Verified merge base: `e52b653a49490ebd1d7a8c456dad896de44dc4a7`
- Final implementation/test checkpoint: `340cf4c85ea04c74784b3f254ae35acbbee9e195`
- Final implementation/test tree: `86a0f35bdc43bebe0abf1050b7ad152c65cf8448`
- Final evidence/branch head: the evidence-only commit containing this receipt; its exact SHA/tree is returned to the supervisor because a Git commit cannot contain its own identity.

Package C changed only:

- `src/validation/scenario-runner-durable-state.ts`
- `test/validation-scenario-runner-durable-state.test.ts`
- `dev/evidence/_ca-output-agt-ca-p6-vh14c-durable-resume-01.md`

No Package A/B/D/E/I file, barrel, supervisor manifest, frozen H0 file,
`src/contracts/**`, or approved VH04–VH13 module was changed.

## Implemented durable behavior

`ValidationRunnerDurableStateController` implements Package A's
`ValidationRunnerDurableStatePort` over caller-supplied durable stores. It:

- reconstructs the complete run, scenario, ordered-suite position, current
  step, lifecycle, completed identities, proof state, and revision;
- validates persisted bytes rather than trusting TypeScript shapes at runtime;
- distinguishes malformed state from identity mismatch and throws
  `ValidationRunnerPersistedStateError` instead of treating either as empty;
- supports expected run/execution identity checks during restart reconstruction;
- validates monotonic revision increments before delegating to the backing CAS;
- preserves the run ID and single/suite execution identity across writes;
- rejects stale writes through revision CAS;
- implements VH13's exact `HumanCheckpointResumeCommitPort` seam;
- durably records exact run/checkpoint/resume-step tuples in a separate,
  append-only revision-CAS adoption journal;
- treats an identical already-durable tuple as an idempotent no-op after restart;
- accepts a racing writer only when the exact requested tuple is proven durable;
- requires the durable runner to be at the matching `resumable` lifecycle before
  first adoption, and fails closed on run/checkpoint/resume-step mismatch.

The adoption journal is separate from A's frozen persistent-state shape. This
retains the exact checkpoint identity needed for idempotence without changing
Package A contracts or implementing lifecycle transitions owned by Package B.
The physical backing stores remain composition dependencies; Package C does not
use UI state, conversation memory, or process-local memory as run authority.

## VH13 ordering and interruption safety

Focused tests bind the real approved `HumanCheckpointResumeController` to the
Package C durable port. Observed order is:

1. exact runner adoption journal CAS succeeds;
2. VH13 attempts checkpoint cleanup;
3. when that cleanup is interrupted, the VH13 checkpoint remains resumable;
4. a reconstructed Package C controller recognizes the exact prior adoption;
5. retry performs no second adoption write and VH13 safely completes cleanup.

An adoption write failure or tuple mismatch returns through VH13 as
`resume-adoption-failed`, and the verified checkpoint remains durably present.
No caller-supplied boolean or token substitutes for the persistence operation.

## Durable checkpoints

| Purpose | Commit | Tree | Push result |
| --- | --- | --- | --- |
| Compile-clean store/reconstruction skeleton | `44862d124ef4af70d7fdf75c808bcc46b0a81f35` | `8ff76a23cb42314486765fffbee2faa7f091644b` | pushed |
| Exact durable/idempotent VH13 adoption journal | `3aab36c630fba307bc4fa97fe922876abb182585` | `d60efd4295bc8d8cd1e54736f34ebed01105371c` | pushed |
| Focused restart/resume tests / final implementation | `340cf4c85ea04c74784b3f254ae35acbbee9e195` | `86a0f35bdc43bebe0abf1050b7ad152c65cf8448` | pushed |

## Verification

Dependencies were restored from the committed lockfile with `npm ci`: PASS,
16 packages installed/audited, 0 vulnerabilities.

Required Package C gates at implementation checkpoint
`340cf4c85ea04c74784b3f254ae35acbbee9e195`:

- `npx tsc -p tsconfig.test.json` — PASS.
- `node --test .test-build/test/validation-scenario-runner-durable-state.test.js`
  — PASS: 7 passed, 0 failed, 0 skipped/cancelled/todo.
- `npm run typecheck` — PASS.
- `git diff --check` — PASS.
- pushed remote branch resolved to exact implementation checkpoint before this
  evidence-only closure — PASS.

Focused cases prove:

1. exact restart reconstruction of run/scenario/suite/current-step state;
2. malformed and mismatched persistence fails closed;
3. monotonic revision and stale-write CAS behavior;
4. exact-tuple durable adoption and restart idempotence;
5. real VH13 adoption-before-cleanup ordering and interrupted-cleanup retry;
6. adoption failure/mismatch retains the VH13 checkpoint;
7. malformed adoption journals fail closed.

## Boundaries and blockers

- Core state-machine transitions: not implemented (Package B ownership).
- Module operations or synchronization behavior: not implemented.
- `src/validation/index.ts`: unchanged (Package I ownership).
- VH11/VH08 physical-reality boundary: unchanged.
- VH13 durable adoption-before-cleanup ordering: preserved and directly tested.
- Live validation, release, promotion, control-branch merge, and VH15 work: not performed.
- Remaining Package C blockers: none.
