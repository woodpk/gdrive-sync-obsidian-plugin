# H-U3 — FEED, LIFECYCLE, MERGE & TEST DISCOVERY

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

## Entry gate

Begin only after H-U2 has been completed, committed, pushed, and recorded in the H-specific evidence file.

Before editing:

1. verify `phase6-sync-integration-h` is checked out;
2. read the H checkpoint plus H-U1 and H-U2 evidence sections;
3. verify the current source/test SHA matches the H-U2 completion authority;
4. verify working tree cleanliness;
5. verify `src/contracts/**` remains unchanged from the frozen v1.2 foundation.

If H-U2 is incomplete or unresolved, stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

## Mission

Complete the second bounded H integration acceptance surface:

- lifecycle integrity composition;
- reliable Changes ingestion/durable learning/cursor ordering;
- clean merge cross-workstream composition;
- top-level runtime discovery for both H integration tests and G's adversarial model.

Do not run the full repository verification/classification campaign until H-U4.

## Required acceptance cases

### H-I5 — E lifecycle integrity opportunity uses B cache-bypassing read

Prove the production scheduler's integrity opportunity can reach B's cache-bypassing local integrity read through the runtime-supplied local port.

Expected existing structure:

- `CanonicalEvidenceLocalVault` implements `readFileBypassingEvidenceCache`;
- E's scheduler detects the integrity interface from its local port when an explicit integrity port is not separately provided;
- runtime supplies the canonical local port to the scheduler.

Therefore test the real integrated behavior first. Do not add redundant production wiring unless the test demonstrates an actual missing path.

Required behavior:

- cached evidence cannot substitute for the authoritative integrity read;
- mismatch/uncertainty schedules reconciliation opportunity rather than creating deletion authority;
- lifecycle suspension/unload remains authoritative over starting new work.

### H-I6 — A Changes -> D durable batch learning -> C persistence / cursor ordering

Prove the production incremental path uses A's `ReliableRemoteChangePort` through `ProductSnapshotAssembler`, and that D/C ordering is correct.

Required assertions:

1. intermediate Change pages are traversed losslessly until the terminal start token;
2. the complete terminal batch becomes a durable learned batch in C-backed authority before the canonical cursor mirror advances;
3. failure to durably learn the batch prevents cursor advancement;
4. an already-durable learned batch can be consumed safely after restart without losing remote facts;
5. no legacy cursor-collapsing path is treated as the authoritative incremental implementation.

### H-I7 — F clean merge -> D independent effect verification -> C canonical commit

Prove a genuine clean three-way text merge flows through the integrated production path:

- F's approved conflict/resource-safety implementation produces/retains clean merged content;
- D represents clean merge as the required independent LOCAL and REMOTE durable effects;
- LOCAL effect uses B transactional mutation;
- REMOTE effect uses A reliable update mutation;
- both effects require durable verification;
- canonical C BASE/state commit occurs only after both required effects are verified and converged;
- one-sided/partial success cannot be represented as complete clean-merge convergence.

Do not rewrite F merge algorithms.

## G adversarial runtime discovery

The repository `npm test` command executes only top-level emitted `test/*.test.js` files. G's test lives under nested `test/adversarial-model/**`, so TypeScript compilation alone does not prove execution.

Add an H-owned top-level entrypoint, preferably:

`test/phase6-h-sync-integration.test.ts`

or the smallest equivalent.

It must ensure ordinary repository test execution actually runs:

- the H integration acceptance suite(s);
- G's adversarial model test.

Avoid duplicate execution if individual H files are already top-level discovered. Structure imports deliberately and prove the resulting runtime count/markers.

## Production changes

Primary work is testing/discovery.

A small H-owned production fix is permitted only when an H-I5/H-I6/H-I7 test proves a localized integration-wiring defect. Do not repair worker-owned semantics or frozen contracts in this unit.

## Frozen boundaries

Do not modify:

- `src/contracts/**`;
- canonical `_ca-output.md`;
- protected/shared branches;
- A–G semantics without a concrete supervisor-routable defect.

Do not merge.

## Verification

Required:

- `npm run typecheck`;
- execute focused H-I5/H-I6/H-I7 tests;
- execute the top-level H entrypoint;
- explicitly demonstrate that G's adversarial model test runs at runtime, not merely compiles;
- run materially affected E/A/C/D/F/B focused suites if a production correction was necessary;
- `git diff --check`;
- frozen-contract audit.

Record exact focused test counts and an explicit G runtime-execution proof.

Do not yet classify all repository-wide failures/cancellations; H-U4 owns that pass.

## Evidence

Append an `H-U3` section to the H-specific evidence file containing:

- exact H-U2 authority SHA consumed;
- H-I5/H-I6/H-I7 results individually;
- top-level entrypoint design;
- proof G actually executed;
- focused command outputs/counts;
- production changes, if any;
- frozen-contract audit;
- source/test SHA.

Do not modify canonical `_ca-output.md`.

## Completion

End exactly:

`H-U3 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U4`

If capacity is exhausted:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-U3 NOT COMPLETE`

If blocked:

`BLOCKED — SUPERVISOR DECISION REQUIRED`
