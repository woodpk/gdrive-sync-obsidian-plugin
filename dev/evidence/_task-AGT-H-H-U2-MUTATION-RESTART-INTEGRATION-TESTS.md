# H-U2 — MUTATION & RESTART INTEGRATION TESTS

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

## Entry gate

This unit may begin only after H-U1 is complete and the H-U1 source/test SHA has been recorded in the H-specific evidence file.

Before editing:

1. verify the current branch is `phase6-sync-integration-h`;
2. read the H checkpoint evidence and the completed H-U1 evidence section;
3. verify the working tree is clean;
4. verify `src/contracts/**` is still byte-identical to the frozen v1.2 foundation;
5. inspect the actual production wiring produced by H-U1 rather than assuming the anticipated implementation.

If H-U1 is not actually complete, stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

## Mission

Add the first bounded H-owned integration acceptance suite proving that the newly composed production runtime correctly joins A, B, C, and D for physical mutation and restart recovery.

Do **not** broaden this unit into feed/lifecycle/merge/G discovery or whole-repository failure classification.

## Required acceptance cases

Implement and execute the following H integration tests against the real integrated production surfaces wherever feasible. Use narrow deterministic test doubles only for external environment boundaries, not to bypass the production integration layer being proved.

### H-I1 — REMOTE create composition

Prove a production-planned REMOTE create:

- obtains durable intent/state authority from C;
- uses A's reserved-ID reliable mutation path;
- records effect lifecycle durably;
- independently verifies physical effect;
- commits canonical BASE/mapping only after verified effect/convergence;
- preserves the resulting Drive identity.

### H-I2 — REMOTE update / trash identity authority

Prove update and/or trash operations requiring prior identity authority:

- use the exact trusted remote mapping/identity required by D;
- route physical REMOTE mutation through A's reliable mutation seam;
- cannot manufacture identity from planned path or legacy markers;
- fail closed when the required authoritative mapping is absent/stale.

Cover enough of update/trash to prove both the positive production path and the fail-closed identity rule without duplicating every D worker test.

### H-I3 — lost-response restart / recovery with C persistence

Prove an operation persisted through C that reaches `dispatch-authorized` or `outcome-unknown` can restart and recover through D without blind redispatch.

Required assertions:

- restart reads the existing C-persisted durable descriptor;
- recovery uses observation/recovery seams, not a new physical dispatch;
- a verified recovered effect can progress to canonical commit;
- a repeated restart after `state-committed` performs neither repeated physical mutation nor repeated semantic commit.

### H-I4 — LOCAL transactional mutation through B

Prove a D durable LOCAL file mutation executes through H's logical-to-physical adapter and B's crash-safe local transaction engine.

Required assertions:

- logical synchronization path remains the durable D descriptor identity;
- physical target/stage/backup paths are correctly resolved;
- transaction progress persists through C;
- verified local result is required before canonical state advancement;
- portable configuration logical paths resolve into the active configuration directory rather than becoming literal remote-namespace filesystem targets.

### H-I8 — missing required production seam fails closed

Prove omission of at least one required writable physical production dependency cannot silently fall back to unsafe legacy mutation.

At minimum exercise missing:

- writable C authority or equivalent required durable authority;
- A reliable REMOTE mutation seam for REMOTE mutation;
- B local transactional seam for LOCAL file mutation.

The result must be blocked/recovery-required/fail-closed, never successful raw legacy mutation.

## Test placement

Prefer one H-owned integration acceptance file or a small tightly related H test set under `test/workstreams/integration/**` or equivalent. Do not create a sprawling new test hierarchy.

Do not yet add the final top-level G/H discovery entrypoint unless it is mechanically required merely to execute this focused suite. H-U3 owns final discovery composition.

## Production changes

Tests are the primary work of this unit.

If a test exposes a **small H-owned composition defect**, you may fix it in the same unit only when:

- root cause is unambiguously H integration wiring;
- no frozen contract change is required;
- no worker-owned semantic redesign is required;
- the repair is small enough to remain within this unit.

If the failure points to an A–G worker defect or needs nontrivial redesign, do not repair it here. Preserve evidence and stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

## Frozen boundaries

Do not modify:

- `src/contracts/**`;
- canonical `dev/evidence/_ca-output.md`;
- protected/shared branches;
- unrelated legacy tests merely to obtain green counts.

Do not merge.

## Verification

Required:

- compile/typecheck tests;
- execute the focused H-U2 integration suite directly;
- run any existing D/C/A/B focused suites materially affected by an H-owned repair;
- `git diff --check`;
- frozen-contract comparison against `96b4541b15012ac4ce0d81243b73ef779efd343e`.

Record exact test totals for the H-U2 suite.

Do not perform the full repository classification pass in this unit.

## Evidence

Append an `H-U2` section to the existing H-specific evidence file. Record:

- exact H-U1 authority SHA consumed;
- test files added/modified;
- production files modified, if any, and why;
- H-I1/H-I2/H-I3/H-I4/H-I8 result individually;
- focused commands and exact counts;
- frozen-contract result;
- source/test SHA;
- any routed blocker.

Do not modify canonical `_ca-output.md`.

## Completion

End exactly:

`H-U2 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U3`

If capacity is exhausted:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-U2 NOT COMPLETE`

If blocked:

`BLOCKED — SUPERVISOR DECISION REQUIRED`
