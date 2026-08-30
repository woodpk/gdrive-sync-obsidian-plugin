# Phase 6 Synchronization Adversarial Validation Matrix

Status: foundation test design; comprehensive simulator not yet implemented.  
Contract fault points: `SYNCHRONIZATION_FAULT_POINTS` in `src/contracts/synchronization-foundation.ts`.

## Matrix

| Invariant | Scenario | Platform | Injection boundary | Expected safe outcome | Owner | Integration validation |
|---|---|---|---|---|---|---|
| BASE authority | LOCAL==REMOTE!=BASE after transfer/commit crash | Both | after effect verification / before state commit | No content rewrite required; exact equality heals BASE | C/D/G | Later divergent edit merges from healed BASE |
| CAS separation | Journal-only write races an unchanged semantic plan | Both | after intent persist | Persistence CAS retries; unchanged semantic authority remains usable | C/D/G | No false stale loop, no lost journal |
| Journal recovery | Death before mutation | Both | after intent persist | Reconcile as not-applied or unknown; no duplicate mutation | C/G | Restart consumes journal before new run |
| Journal recovery | Death during mutation | Both | after mutation dispatch | Outcome remains unknown until physical verification | A/B/C/G | Never blindly retry/commit |
| Journal recovery | Death after response before verification | Both | after remote response | Re-observe/verify exact identity/evidence | A/C/G | Applied/not-applied/unknown explicit |
| Journal recovery | Death after verification before BASE commit | Both | before authoritative state commit | Finish state commit from verified reference | C/G | No repeated transfer |
| Changes integrity | 1001+ Drive changes | Both | intermediate page boundary | Every page learned; only terminal token becomes watermark | A/C/G | No skipped item, replay idempotent |
| Changes integrity | Repeated updates for one object across pages | Both | response ordering | Feed order normalized without losing final evidence | A/G | Deterministic final learned object |
| Ingestion/convergence | One conflicted path plus later remote changes | Both | path attention after learned batch | Watermark advances after durable learning; unresolved path retained | C/D/G | Later changes not pinned/lost |
| Cursor durability | Crash after learned records but before terminal checkpoint | Both | checkpoint persist | Old token replays safely; no duplicate acknowledged effect | A/C/G | Idempotent batch recovery |
| Create idempotency | Create succeeds, response lost, retry | Both | after mutation dispatch | Same reserved Drive ID is reused; one object exists | A/C/G | `409` reconciles identity, not second object |
| Remote ambiguity | Two devices create same logical path | Both | simultaneous create | Path reports both candidates; neither is arbitrary winner | A/D/G | User-visible conflict/preservation |
| Update concurrency | Windows and iOS update same object | Both | after prevalidation before upload | Intervening edit is preserved/conflicted, never silently overwritten as common | A/D/G | Two-device content preservation |
| Remote transfer | File changes between range requests | Both | per-range transport | Mixed bytes fail coherent-version/integrity proof before local swap | A/B/G | Old local target remains valid |
| Observation purity | Legacy object lacks provenance | Both | list/observe | Observation reports migration-needed; performs no PATCH | A/G | Explicit migration is idempotent/recoverable |
| Local replacement | Death after stage write | Windows/iOS | after stage write | Old target remains; unverified stage discarded/reverified | B/C/G | Restart restores invariant |
| Local replacement | Death after stage verification | Windows/iOS | after stage verification | Verified stage and old target remain recoverable | B/C/G | Safe resume to swap |
| Local replacement | Death after backup establish | Windows/iOS | after backup establish | Restore old or complete verified swap from durable transaction | B/C/G | Canonical target not silently missing |
| Local replacement | Death after swap | Windows/iOS | after local swap | Verified new target retained; backup cleanup resumes | B/C/G | No duplicate/download loss |
| Local verification | Corrupt/truncated download | Both | before stage verification | Stage rejected before target displacement | A/B/G | Old local content unchanged |
| Windows events | ReadDirectoryChangesW overflow/missed event | Windows | event source | Re-enumeration discovers truth; no event-inferred deletion | B/E/G | External edit eventually reconciles |
| Windows events | Temporary-file replace with same size/mtime | Windows | local observation | Canonical content/token changes or uncertainty blocks mutation | B/G | Edit not silently missed |
| Windows access | File locked/unreadable | Windows | local read | Path-local uncertainty; unrelated work continues | B/D/G | Later retry converges |
| Windows paths | Case/Unicode collision | Windows | path resolution | Explicit attention; no arbitrary mutation | B/D/G | Other paths proceed |
| iOS events | Event delayed or absent | iOS | adapter event | Startup/resume/periodic reconciliation discovers truth | B/E/G | No permanent missed edit |
| iOS lifecycle | Suspend during upload/download | iOS | cancellation/transfer | Cooperative stop if observed; otherwise journal recovery on resume | A/B/C/E/G | No correctness reliance on background time |
| iOS lifecycle | Process termination at each fault point | iOS | all fault points | Restart consumes durable state and remains fail-closed | C/E/G | No silent loss/duplicate |
| Self mutation | Plugin write emits modify event | Both | local event | Exact receipt/provenance coalesces redundant trigger | B/E/G | No feedback loop |
| Self mutation | User edits concurrently with plugin write | Both | after swap/event | Token/evidence mismatch prevents suppression | B/E/G | User edit becomes reconciliation input |
| Cancellation | User cancels between operations | Both | operation boundary | No new operation starts; committed operations remain durable | D/E/G | Cursor remains conservative |
| Cancellation | Cancel never delivered before death | iOS | mutation boundary | Same outcome as crash recovery | C/E/G | No special unsafe state |
| Merge resources | Huge/unknown-size three-way text | iOS/Windows | merge admission | Automatic merge refused; both versions preserved | F/G | No memory exhaustion/data loss |
| Merge correctness | Unicode and disjoint edits within budget | Both | merge algorithm | Deterministic clean merge with canonical evidence | F/G | Same output/evidence on platforms |
| Stale device | Device offline beyond policy then returns | Both | stale authority transition | Reconcile first; stale device cannot authorize destructive propagation | C/D/E/G | Non-destructive independent work may proceed |
| State validation | BASE/mapping mismatch | Both | load/migration | Global recovery; no planner mutation authority | C/G | Backup and explicit issue code |
| State validation | BASE and tombstone overlap | Both | load/migration | Global recovery | C/G | No inferred deletion/content winner |
| Destructive safety | Suspicious mixed destructive plan | Both | planner gate | Checkpoint-backed approval remains global | D/G | Safe subset cannot bypass approval |
| Path isolation | One unstable file plus independent uploads | Both | local validation | Unstable path attention; independent safe paths commit | B/D/G | No starvation/cursor lie |
| Dependency isolation | Blocked parent plus child and unrelated file | Both | operation graph | Parent/child skipped; unrelated file commits | D/G | No invalid child mutation |
| Authentication | Token revoked after planning | Both | remote precondition | Global auth stop; no mutation/cursor advance | A/D/G | Existing auth status preserved |
| Rate limit/offline | 429/5xx/network loss | Both | transport | Bounded retry/defer; ambiguous mutations reconciled | A/E/G | No duplicate or false success |

## Foundation tests now implemented

`test/phase6-sync-architecture-foundation.test.ts` proves the shared representations themselves:

- intermediate versus terminal Drive tokens;
- duplicate-path candidate preservation;
- exact semantic BASE authority;
- restart recovery directives;
- local transaction recovery actions;
- merge resource fail-closed admission.

These tests do not claim the later production implementations already satisfy the matrix.

## Model requirements for Workstream G

The deterministic model records seed, ordered inputs, fault point, device, operation/intent IDs, and sanitized outcome. A failure must produce a replayable minimized trace. The model must not place vault content, paths, OAuth material, or Drive IDs in ordinary diagnostic output; test fixtures may use synthetic identifiers. Production changes are prohibited for G.

