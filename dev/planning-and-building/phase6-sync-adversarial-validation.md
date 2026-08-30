# Phase 6 Synchronization Adversarial Validation Matrix

Status: **foundation test design — comprehensive simulator not yet implemented**  
Fault-point authority: `SYNCHRONIZATION_FAULT_POINTS` in `src/contracts/synchronization-foundation.ts`.

## Matrix

| Invariant | Scenario | Injection boundary | Expected safe outcome | Owner |
|---|---|---|---|---|
| File BASE authority | LOCAL==REMOTE!=BASE but file proof omits canonical hash | BASE-healing admission | Healing rejected; generic/path/size/timestamp evidence cannot authorize file BASE | C/D/G |
| File BASE authority | LOCAL and REMOTE canonical SHA-256 match under current identity | BASE-healing commit | Explicit file-common proof may heal BASE without content rewrite | B/C/D/G |
| Persistence/semantic separation | Journal-only write races unchanged semantic plan | state CAS | Persistence CAS retries; unchanged semantic authority remains valid | C/D/G |
| Dispatch ordering | Crash after intent persisted, before dispatch authority | `after-intent-persist-before-dispatch-authority` | Durable state proves external dispatch was not authorized; exact intent may retire | C/D/G |
| Dispatch ordering | Crash after dispatch authority, before external call | `after-dispatch-authority-before-mutation-call` | Restart assumes mutation may have occurred and reconciles reality; never labels definitely-not-dispatched | A/B/C/D/G |
| Dispatch ambiguity | External call may have occurred, no response | `after-mutation-call-before-response` | Outcome unknown until physical/identity verification; no blind retry/commit | A/B/C/D/G |
| Response/verification | Response received, effect unverified | `after-remote-response-before-effect-verification` | Re-observe/verify exact identity/evidence before authoritative success | A/C/D/G |
| Commit recovery | Effect verified, state not committed | `before-authoritative-state-commit` | Finish state commit from durable verification reference; no repeated mutation | C/D/G |
| Remote update preservation | R0 observed/revalidated; iOS writes RI; Windows writer acts; writer bytes later observed | between revalidation and writer action | Final writer bytes **alone** cannot be conflict-free `verified-applied`; RI/predecessor must remain preserved or result is conflict/unknown | A/D/G |
| Remote update preservation | Immutable candidate materialized while predecessor/concurrent candidates remain | update/path convergence | Conflict-free acknowledgment requires preservation application proof | A/C/D/G |
| Create idempotency | Create succeeds, response lost, retry | after call before response | Same reserved Drive ID reused; one logical create | A/C/G |
| Remote ambiguity | Two objects claim same logical path | snapshot assembly | Both candidates retained; no arbitrary winner | A/D/G |
| Changes protocol | 1001+ changes across pages | intermediate/terminal page boundaries | Every page learned; only terminal token becomes next start token | A/C/G |
| Multi-batch durability | Batch 1 path A unresolved; batches 2 and 3 learned; crash | after later batch persistence | Restart retains all durable facts needed for A plus later paths; no latest-only replacement | A/C/D/G |
| Multi-batch removal | Removed A learned; later batches advance while A unresolved | batch append/retirement | Removal/object/path fact survives until safely reduced into authoritative mapping/tombstone/path state | C/D/G |
| Multi-batch move | Repeated object A appears under successive paths | multiple learned batches | Object chronology remains reconstructable; no path-only collapse | A/C/D/G |
| Multi-batch create-delete | Object created then removed before convergence | successive batches | Both facts remain durably representable; restart cannot reinterpret as never-seen absence | A/C/D/G |
| Multi-batch duplicate path | Ambiguous same-path candidates persist while later batches arrive | batch append | Ambiguity remains explicit without pinning/loss of later feed progress | A/C/D/G |
| Cursor durability | Crash after learned records before checkpoint | checkpoint persistence | Old token replay is idempotent; no acknowledged effect duplicated | A/C/G |
| Remote transfer | File changes between ranges/chunks | transfer | Mixed bytes cannot receive coherent-version proof | A/B/G |
| Observation purity | Legacy object lacks provenance | list/observe | Read reports migration-needed but performs no PATCH | A/G |
| Local create recovery | Target authoritatively absent; crash before/after stage/swap | all local stages | Backup absence is expected where appropriate; verified new or explicit stage survives | B/C/G |
| Local replace recovery | Target present with exact old token/hash; backup missing after displacement | backup/swap boundary | Contradiction/recovery-required; missing old backup is not mistaken for create | B/C/G |
| Local replacement | Death after stage write | `after-stage-write` | Old target remains; unverified stage discarded/reverified | B/C/G |
| Local replacement | Death after stage verification | `after-stage-verification` | Verified stage and old target remain recoverable | B/C/G |
| Local replacement | Death after backup establish | `after-backup-establish` | Restore old or complete verified swap using transaction authority | B/C/G |
| Local replacement | Death after swap | `after-local-swap` | Verified new target retained; backup cleanup resumes | B/C/G |
| Local verification | Corrupt/truncated download | before stage verification | Stage rejected before target displacement | A/B/G |
| Event loss | Windows watcher overflow / iOS event delayed or missing | event source | Re-enumeration/startup/resume/periodic reconcile discovers reality; no event-derived deletion | B/E/G |
| Self mutation | Plugin write event overlaps user edit | after local swap/event | Exact provenance may coalesce only matching result; user edit remains visible | B/E/G |
| Cancellation | Cancel never delivered before process death | mutation boundary | Same safe result as crash recovery; cancellation is not authority | C/E/G |
| Merge resources | Huge/unknown three-way text | merge admission | Automatic merge refused; complete versions preserved | F/G |
| Stale device | Long-offline device returns | stale authority transition | Reconcile before destructive authority | C/D/E/G |
| Semantic validation | Known BASE/mapping contradiction | load/migration | Recovery-required with stable named issue code | C/G |
| Semantic validation extensibility | New impossible state lacks a dedicated named code | load/migration | `other-semantic-inconsistency` carries privacy-safe category and still fails closed | C/G |
| Destructive safety | Suspicious mixed destructive plan | planner gate | Global checkpoint-backed approval remains mandatory | D/G |
| Path isolation | One unstable path plus independent safe operations | validation/execution | Bad path stays attention; safe paths may commit | B/D/G |
| Authentication | Token revoked after planning | remote boundary | Global auth stop; no mutation/cursor advance | A/D/G |
| Rate/offline | 429/5xx/network loss | transport | Bounded retry/defer; ambiguous mutation reconciled, never false success | A/E/G |

## Foundation predictive tests

`test/phase6-sync-architecture-foundation.test.ts` now proves the shared representations themselves, not later production implementations:

- intermediate versus terminal Drive tokens;
- duplicate remote-path candidate preservation;
- exact semantic BASE authority;
- file BASE healing cannot be constructed without current canonical SHA-256 equality;
- final writer bytes alone cannot classify a possible overwritten intervening remote version as conflict-free;
- dispatch intent versus durable dispatch-authority restart semantics;
- create versus replace local transaction pre-state and backup expectation;
- local swap recovery actions;
- multi-batch learned remote backlog retention across removals/repeated object changes;
- semantic-validation fail-closed extensibility;
- merge resource fail-closed admission.

These tests are predictive contract tests. They do not claim A–G production implementations already exist.

## Workstream G model requirements

The eventual deterministic model records synthetic seed, ordered inputs, fault point, device role, operation/intent IDs, and sanitized outcome. A failure produces a replayable minimized trace.

Required model families include:

- both devices editing/creating/deleting/moving one object/path;
- immutable candidate update preservation and the exact R0→RI intervening-write scenario;
- generated-ID create ambiguity;
- every dispatch/local swap fault point;
- page and batch replay, removals, moves, create-delete, repeated objects, duplicate paths, long-lived unresolved path while later batches advance;
- missed events and iOS suspension/termination;
- cancellation delivery/non-delivery;
- stale device/destructive approval;
- semantic corruption including unknown future contradiction categories;
- resource-bounded merge fallback.

The model must never use production paths/content/OAuth material in ordinary diagnostic output. Synthetic fixtures may use synthetic paths and IDs. Workstream G owns no production source.
