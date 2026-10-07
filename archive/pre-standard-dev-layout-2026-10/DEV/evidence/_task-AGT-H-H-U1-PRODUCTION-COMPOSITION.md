# H-U1 — PRODUCTION COMPOSITION

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

Checkpoint evidence head at assignment: `ef4af05ff349c631960a08d7b71f43a90109766c`

Source/integration semantic head immediately beneath that evidence commit: `034c2165f8edca198c9ceda09e7cce716c9b0660`

## Mission

Complete only the minimum H-owned **production composition wiring** needed to make the already-integrated A–G implementations operate together through the real product runtime.

This unit is not a redesign task. Do not reimplement worker-owned behavior.

## Entry gate

Before editing:

1. verify the branch is `phase6-sync-integration-h`;
2. verify the branch contains checkpoint commit `ef4af05ff349c631960a08d7b71f43a90109766c` in its ancestry;
3. read the H checkpoint evidence file in full;
4. inspect the actual current production composition path before changing it;
5. confirm `src/contracts/**` is unchanged from `96b4541b15012ac4ce0d81243b73ef779efd343e`.

If these conditions are not true, stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

## Authoritative integration finding

The production composition root is `src/product/runtime.ts`. At the checkpoint it still constructs legacy/default runtime dependencies and does not supply all of D's explicit writable/frozen production seams.

`src/product/product-controller.ts` already exposes the relevant dependency injection seams and intentionally fails closed when they are absent. Therefore, center this unit on **runtime composition plus the existing H compatibility adapter**. Modify `product-controller.ts` only if compilation or exact semantic necessity proves it is required.

## Required work

Wire the already-approved components together in production:

1. **C -> D authority/state**
   - use the C-backed durable synchronization authority through H's `IntegratedSynchronizationStateStore` or the smallest correct equivalent already present on the H branch;
   - preserve the distinction between C `persistenceRevision` and `semanticGeneration`;
   - do not bypass C CAS or semantic validation.

2. **A -> D reliable REMOTE seams**
   - provide A's `ReliableRemoteMutationPort`;
   - provide A's `RemoteFolderCreateRecoveryReadPort`;
   - provide A's reliable Changes implementation to `ProductSnapshotAssembler` so incremental Changes is actually enabled in production.

3. **B -> D local transactional mutation**
   - instantiate/use H's `IntegratedLocalTransactionalMutationPort` against B's crash-safe transaction implementation;
   - provide it to D's production controller/executor recovery dependencies;
   - preserve logical-to-physical path mapping, including portable configuration paths.

4. **D -> C durability**
   - ensure durable operation intents, physical-effect stages, learned remote batches, synchronization-authority writes, and canonical commits all resolve to the real C-backed durable authority document rather than the read-only/default fallback.

5. **E lifecycle integrity**
   - verify, rather than redesign, that the runtime-supplied local port exposes B's cache-bypassing integrity read to E's scheduler. If the existing structural composition already provides this, do not add redundant wiring.

6. **F merge path**
   - preserve the existing F `ThreeWayConflictResolver` / text-version composition. Do not change F behavior merely to make this unit broader.

## Frozen boundaries

Do not modify:

- `src/contracts/**`;
- worker-owned A–G implementation semantics unless a concrete integration incompatibility makes the composition impossible;
- canonical `dev/evidence/_ca-output.md`;
- `phase6-integration`, `main`, or `master`.

Do not merge any PR or branch.

## Scope preference

Expected primary surfaces:

- `src/product/runtime.ts`
- `src/product/phase6-sync-integration.ts`

Secondary surface only if mechanically necessary:

- `src/product/product-controller.ts`

Do not begin H-I1 through H-I8 in this unit.

## Verification required for this unit

Run the smallest deterministic checks sufficient to prove the composition compiles and the production dependency graph is coherent:

- `npm ci` if dependencies are not already installed in the clean worktree;
- `npm run typecheck`;
- `npm run build`;
- focused existing tests that directly exercise the touched runtime/controller/state/Drive/local seams, if available;
- `git diff --check`;
- explicit frozen-contract diff against `96b4541b15012ac4ce0d81243b73ef779efd343e`.

Do not spend this unit running and classifying the entire repository test suite. That is H-U4.

## Evidence

Append a new `H-U1` section to:

`dev/evidence/_ca-output-AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01.md`

Record:

- entry SHA;
- production files changed;
- exact composition decisions;
- exact verification commands/results;
- frozen-contract result;
- source/test completion SHA;
- any unresolved blocker.

Do not modify canonical `_ca-output.md`.

## Completion criteria

H-U1 is complete only when production constructs the real A/C/B writable/recoverable seams instead of relying on D's fail-closed defaults, incremental Changes is wired to A's reliable Changes implementation, typecheck/build succeed, and frozen contracts remain unchanged.

When complete, commit and push the work and end with exactly:

`H-U1 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U2`

If turn capacity is exhausted before completion, commit/push only safe resumable work, update H evidence with the exact continuation state, and end with:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-U1 NOT COMPLETE`

If blocked by an actual cross-workstream incompatibility that cannot be solved with H-owned compatibility wiring, end with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`
