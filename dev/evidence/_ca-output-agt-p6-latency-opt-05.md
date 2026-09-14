# Phase 6 LAT-05 — Remote Planning Fast Path Evidence

## Identity and drift gate

- Agent: `agt-ca-p6-lat05-remote-planning-fast-path-01`
- Work package: `LAT-05`
- Branch: `phase6-latency-opt-05-remote-planning-fast-path`
- `COMMON_BASE_SHA`: `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`
- `R1_INPUT_SHA`: `67a98b7a5d902af2c06756b96beb3ce52e2e03cc`
- Corrected implementation/test validation SHA before this evidence-only commit: `e516b9c826a121827602d5fc407df3c527da2aaa`
- Drift gate: branch was verified at exactly `R1_INPUT_SHA`; merge base with `COMMON_BASE_SHA` was exactly `COMMON_BASE_SHA`; the rejected diff contained only the expected modified `src/drive/google-drive-port.ts`, added `src/drive/google-drive-port-core.ts`, and added focused LAT-05 test.
- Final evidence-bearing commit SHA is intentionally reported by the supervisor-facing completion response because a commit cannot contain its own SHA.

## Final file manifest

Common-base-to-final intended change surface:

- Modified: `src/drive/google-drive-port.ts`
- Added: `test/phase6-lat05-remote-planning-fast-path.test.ts`
- Added: `dev/evidence/_ca-output-agt-p6-latency-opt-05.md`

Repair-input-to-final additionally deletes the rejected extraction:

- Deleted: `src/drive/google-drive-port-core.ts`

The corrected implementation restores the original single-file Drive-port ownership/layout and does not recreate the split under another filename. At the validated code/test SHA, the common-base-to-head production delta was localized to approximately 31 changed lines in `src/drive/google-drive-port.ts`.

## Structural optimization evidence

### Managed-domain root discovery

Before LAT-05, after managed-root validation the content-root and portable-config-root lookups were awaited serially, so at most one child-domain lookup was in flight.

After LAT-05, exact managed-root metadata is still read and validated first. Only after that authority barrier succeeds, `contentRoot(rootId)` and `portableConfigRoot(rootId)` are started together with `Promise.all`.

- Structural child-root request count: unchanged (two independent lookups).
- Maximum independent child-root lookups in flight: `1 -> 2`.
- Failure precedence remains deterministic: content result is checked before config result, matching the pre-optimization semantic order.

The focused barrier test holds the managed-root read unresolved and proves neither child lookup starts early; after releasing managed-root authority it proves both child lookups can overlap.

### Reconciliation-domain traversal

Before LAT-05, content traversal completed before portable-config traversal began.

After LAT-05, each validated domain root is traversed independently into its own entries array and path map. The two traversals execute concurrently. Shared exposed state is not mutated in promise-completion order.

- Structural traversal count: unchanged (one complete traversal per managed domain, including all pagination).
- Maximum independent domain traversals in flight: `1 -> 2`.
- Deterministic merge rule: content-domain entries/path mappings first, portable-config entries/path mappings second, regardless of completion order.

The focused test deliberately releases the config traversal before the content traversal and still observes deterministic content-then-config output. A two-page content fixture proves pagination remains exhausted before completion.

### Same-assembly metadata reuse

`validateManagedObjectProvenance` now creates a fresh `Map<string, DriveFile>` for one invocation and passes it only to `findDomainAncestor`. An exact parent metadata observation is cached only after a successful exact-ID read and may be reused by sibling ancestry checks in that same provenance assembly.

Focused fixture structural count:

- Two siblings sharing one parent, first reconciliation assembly: exact parent metadata reads `2 -> 1`.
- Second independent `listForReconciliation()` call: parent metadata is reacquired; cumulative exact parent reads become `2`, proving no reuse survives the assembly/run boundary.

There is no module-level cache, TTL, persisted cache, or cross-run Drive-authority reuse.

## Fail-closed safety evidence

Focused deterministic tests prove or retain the following:

- managed-root authority is established before dependent domain discovery;
- missing/duplicate content root remains rejected;
- missing, duplicate, unmarked, trashed, or otherwise ambiguous portable-config root remains rejected;
- domain provenance checks remain active independently;
- duplicate remote identity after concurrent collection returns `recovery-required`;
- duplicate normalized logical path returns `conflict`;
- pagination is exhausted deterministically;
- a transient/rate-limited interruption in the ordinary domain returns only an ordinary-domain partial result, preserving the prior serial exposure boundary;
- a transient/rate-limited interruption in the config domain returns the deterministic content-first partial result plus any already-collected config entries;
- no planning-path request in the concurrency fixture uses a mutation HTTP method; all observed requests are `GET`;
- transport retry/backoff, mutation algorithms, durable-state/CAS schemas, local observation, lifecycle/background behavior, OAuth/PKCE, and diagnostic authorization/browser controls were not changed.

A post-collection merged-listing validation was added because concurrent domain traversal must not allow an identity/path collision to escape merely because the two domains collected into separate temporary structures.

## Changes fast path and fallback

LAT-05 does not reclassify or otherwise modify `GoogleDriveAdapter.readChangePage()` cursor failures. The rejected wrapper behavior that remapped a Drive `recovery-required` cursor signal to `conflict` was removed.

Focused snapshot-assembler tests prove the existing authority seam:

- trusted state with a valid cursor uses the reliable Changes route and does not call full `listForReconciliation()` or acquire a new start cursor;
- an existing conflict signal from the reliable Changes port takes the existing conservative full-reconciliation fallback and obtains a fresh start cursor at the existing commit point;
- missing cursor state uses full reconciliation and obtains a start cursor;
- native adapter `recovery-required` invalid-cursor classification remains unchanged rather than being weakened or remapped by LAT-05.

No cursor is synthesized and no cursor advancement point was changed.

## Validation

Validated code/test SHA: `e516b9c826a121827602d5fc407df3c527da2aaa`

GitHub Actions:

- Run: `34854919998`
- Job: `104011870770`
- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS
  - Repository `npm test` executes `tsc -p tsconfig.test.json` followed by the complete compiled Node test suite (`dist-test/test/*.test.js` and `dist-test/test/workstreams/**/*.test.js`).
  - This includes the focused LAT-05 test and the existing Phase 3/Phase 5/Changes/remote-feed/HTTP-transport/Drive-semantic diagnostic regressions in the complete suite.
- `npm run build`: PASS

Repository `npm run check` is defined as `npm run typecheck && npm test && npm run build`; the same three constituent commands passed sequentially in the same clean GitHub Actions job. The wrapper command itself was not separately invoked in that job, so this evidence does not falsely claim a literal second wrapper invocation.

`git diff --check COMMON_BASE_SHA..HEAD`: the connected GitHub execution surface does not expose an arbitrary repository shell, and the local container cannot resolve `github.com`, so the literal command could not be invoked there. The GitHub compare patch was inspected for the localized final change surface; no conflict markers or intentionally whitespace-only production edits were introduced. This environment limitation is called out rather than represented as an executed command.

## Rejected / intentionally omitted optimizations

- No Drive authority metadata is cached across synchronization runs.
- No mutation-time exact-ID/topology verification was deduplicated or relaxed.
- No transport retry/backoff change was made.
- No cursor signal was reclassified to force incremental fallback behavior.
- No broad Drive-port extraction/refactor was retained.
- Any request reduction that would require trusting remote metadata beyond the single reconciliation provenance assembly was intentionally omitted.
