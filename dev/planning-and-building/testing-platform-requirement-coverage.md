# BRAIN Verification Platform — Requirement and Evidence Coverage

## 1. Purpose

This artifact proves that the replacement testing architecture covers both its own target specification and the BRAIN product target specification's completion-evidence obligations without preserving the oversized legacy harness architecture.

The primary authority is the BRAIN product target-system specification. Historical C03–F03 scenario IDs are retained below only as migration traceability labels; they do not define the replacement architecture or require one custom program per historical scenario.

## 2. BVP Requirement-to-Phase Coverage

| BVP requirement family | Primary phase | Final verification |
| --- | --- | --- |
| `BVP-ARCH-*` | P0–P1 | P5 |
| `BVP-SIM-*` | P2 | P4–P5 |
| `BVP-SCN-*` | P3 | P4–P5 |
| `BVP-RUN-*` | P3 | P4–P5 |
| `BVP-EVID-*` | P3; production run receipt in P5 | P5 |
| `BVP-FAULT-*` | P2–P4 | P5 |
| `BVP-LIVE-*` | P5 | P5 |
| `BVP-VER-*` | P1 | every phase; P5 final |
| `BVP-MIG-*` | P0 | P1 search/guard; P5 final |
| `BVP-GOV-*` | P1 | every session; P5 final |
| `BVP-INV-001`–`012` | P0–P3 according to ownership | every phase; P5 final |

## 3. BRAIN Product Completion-Evidence Mapping

| Product target-spec evidence | Primary BVP proof | Physical/live proof still required |
| --- | --- | --- |
| §13.1 Build/platform | local PowerShell build/typecheck/tests; production-bundle guard; platform tests | Windows Obsidian functional evidence; iPhone/iOS auth, pairing, upload/download, conflict, interruption/resume, UI-critical flows |
| §13.2 Reconciliation semantics | deterministic virtual-world scenarios using production planner/executor | selected real cross-device canaries only; not every semantic permutation needs physical repetition |
| §13.3 State/crash safety | deterministic faults, runtime reconstruction, persistent simulated reality/state | actual app termination/resume where physical lifecycle behavior itself is material |
| §13.4 Transfer/large vault | deterministic content integrity, file-change, retry/backoff, concurrency, modeled quota/disk; synthetic scale | representative real mobile constrained-resource/large-transfer evidence |
| §13.5 Destructive safety | deterministic plan/safety/state scenarios | representative live preview/execution evidence where useful; deterministic proof remains primary for broad permutations |
| §13.6 Auth/security | production automated security tests + artifact/source/evidence scans | same-device Google auth on Windows/iOS; real revocation/restoration where required |
| §13.7 Config/lifecycle/asset boundary | deterministic/local product tests + repository boundary scans | actual disable/uninstall/reinstall/unlink behaviors that require installed runtime |
| §13.8 Stage-3 traceability | BVP evidence aggregator maps product requirement → implementation → validation evidence | Stage 3 independently verifies the mapping |

## 4. Historical C03–F03 Migration Mapping

These IDs are **historical traceability labels only**. The new platform may combine scenarios where one declarative scenario proves multiple old contracts or split a contract where target-spec traceability requires it.

| Historical ID | Subject | Replacement primary mode | Required live component |
| --- | --- | --- | --- |
| C03 | iOS update → Windows download/update | deterministic semantic + live canary | yes, representative cross-device update/download |
| C04 | iOS move → Windows move | deterministic semantic | representative move may be live; not architecture-critical |
| C05 | iOS delete → Windows trash | deterministic semantic | representative cross-device delete/trash may be live |
| C06 | Windows create → iOS download | deterministic semantic + live canary | yes, representative Windows→iOS create/download |
| C07 | Windows update → iOS download | deterministic semantic + live canary | yes, representative update/download direction |
| C08 | Windows move → iOS move | deterministic semantic | representative move may be live |
| C09 | Windows delete → iOS trash | deterministic semantic | representative delete/trash may be live |
| D01 | clean text merge | deterministic primary | one representative live conflict/merge flow sufficient for platform evidence |
| D02 | true text conflict | deterministic primary | representative physical conflict required by product platform evidence |
| D03 | binary conflict | deterministic primary | optional physical repetition unless needed for platform-specific behavior |
| D04 | delete-vs-modify | deterministic primary | no separate live run required unless platform issue discovered |
| D05 | offline/reconnect | deterministic semantic + physical transition | actual offline/reconnect evidence for platform behavior |
| D06 | stale device | deterministic state/authority primary | physical long-duration staleness only if needed to prove a platform-specific mechanism; never forged as physical evidence |
| E01 | interruption/restart | deterministic crash/reconstruction + physical lifecycle | actual Obsidian termination/restart evidence |
| E02 | ambiguous network outcome | deterministic primary | live provider ambiguity only if safe/reproducible and materially required |
| E03 | state/cursor recovery | deterministic primary | no routine physical repetition required |
| E04 | remote coverage failures | deterministic primary | no routine physical repetition required |
| E05 | destructive circuit breaker | deterministic primary | representative live blocked preview may supplement |
| E06 | auth/network/quota | deterministic classification + real auth/provider cases | real auth revocation/restoration and representative live network/provider behavior |
| E07 | safe cancellation | deterministic primary | representative live cancellation if UI/runtime behavior is material |
| F01 | filesystem scope/paths | deterministic policy + platform adapter tests | real Windows/iOS path/platform cases where adapter behavior differs |
| F02 | large transfer/resource | deterministic scale + resource instrumentation | representative constrained/mobile physical evidence |
| F03 | disable/unlink lifecycle | deterministic state invariants + physical lifecycle | actual disable/uninstall/reinstall/device-unlink evidence |

## 5. Anti-Drift Coverage Matrix

| Drift risk | Mechanical prevention | Review prevention |
| --- | --- | --- |
| testing framework re-enters production | import/bundle guard | supervisor architecture review |
| scenario becomes a custom program | per-scenario LOC + allowed-change-surface guard | scenario-cost tripwire |
| another runner/router/state machine appears | forbidden-abstraction rules + core metrics | explicit architecture approval required |
| framework grows silently | core/live-agent LOC metrics + hard budgets | review after max two sessions |
| per-scenario verification scripts proliferate | `.ps1` path/name guard | build prompt prohibits them |
| archived legacy plan regains authority | archive-reference guard | active project-state precedence |
| agent weakens guard to pass its work | governance files excluded from normal writable scope | supervisor-owned change only |
| tests pass but architecture drifts | canonical verifier runs architecture first | functional pass cannot override architecture failure |
| GitHub Actions becomes default verification | guard/search + required local verifier | every prompt requires local PowerShell evidence |

## 6. Coverage Completion Gate

Before P5 can hand off to Stage 3:

1. every material BRAIN target requirement must have implementation evidence and at least one appropriate validation path;
2. every target-spec §13 evidence category must be classified as deterministic, live, or mixed with actual evidence attached;
3. no legacy C03–F03 semantic obligation may disappear merely because the old scenario program was archived;
4. no historical scenario ID itself is treated as more authoritative than the current product requirement it was intended to test;
5. architecture guard and all hard budgets pass on the final integrated repository;
6. `dev/_ca-output.md` records the final local verification and architecture metrics.