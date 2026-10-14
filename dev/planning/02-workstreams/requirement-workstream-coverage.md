# Requirement-to-Workstream Coverage

## Purpose

This is the canonical whole-system coverage artifact required by the workstream standard. It preserves the accepted product requirement-to-phase matrix by mapping Phase 1–6 directly to WS-01–WS-06 and preserves the accepted BVP requirement-to-phase matrix inside WS-07.

## Product Requirement-to-Workstream Coverage

The table assigns every normative target-system requirement family to the phase or phases responsible for implementing it. WS-06 provides final construction verification for all families.

| Target requirement IDs | Primary implementation phase(s) | Integration / final construction verification |
| --- | --- | --- |
| `SYS-001`–`SYS-008` | WS-01 foundation; WS-04 platform boundary | WS-05; WS-06 |
| `AUTH-001`–`AUTH-012` | WS-03 | WS-05; WS-06 |
| `REM-001`–`REM-010` | WS-03 | WS-05; WS-06 |
| `SYNC-001`–`SYNC-002` | WS-05 | WS-06 |
| `SYNC-003`–`SYNC-007` | WS-04 boundary + WS-05 orchestration | WS-06 |
| `SYNC-008`–`SYNC-010` | WS-02 state/execution semantics + WS-05 orchestration | WS-06 |
| `SYNC-011`–`SYNC-012` | WS-04 platform behavior + WS-05 orchestration | WS-06 |
| `SYNC-013` | WS-05 | WS-06 |
| `PLAN-001`–`PLAN-009` | WS-02 | WS-05; WS-06 |
| `CHANGE-001`–`CHANGE-003` | WS-02 | WS-05; WS-06 |
| `CHANGE-004`–`CHANGE-007` | WS-03 | WS-05; WS-06 |
| `FIRST-001`–`FIRST-005` | WS-02 semantics | WS-05; WS-06 |
| `FIRST-006`–`FIRST-007` | WS-05 workflow | WS-06 |
| `STATE-001`–`STATE-017` | WS-02 | WS-05; WS-06 |
| `XFER-001`–`XFER-008` | WS-02 state/commit semantics; WS-03 remote transfer; WS-04 local transfer | WS-05; WS-06 |
| `CONFLICT-001`–`CONFLICT-011` | WS-02 semantics | WS-05 UX/execution; WS-06 |
| `MOVE-001`, `MOVE-003`, `MOVE-005` | WS-02 semantics | WS-05; WS-06 |
| `MOVE-002` | WS-03 | WS-05; WS-06 |
| `MOVE-004` | WS-04 | WS-05; WS-06 |
| `FILE-001`–`FILE-015` | WS-04 | WS-05; WS-06 |
| `DELETE-001`–`DELETE-010` | WS-02 semantics/safety | WS-05 execution/approval; WS-06 |
| `CONFIG-001`–`CONFIG-009` | WS-04 | WS-05; WS-06 |
| `UI-001`–`UI-008` | WS-05 | WS-06 |
| `FAIL-001`–`FAIL-007` | WS-03 remote failures; WS-04 local/platform failures | WS-05 product response; WS-06 |
| `PRIV-001`–`PRIV-004` | WS-01 architecture; Phases 3 and 4 boundary implementation | WS-05; WS-06 |
| `ASSET-001`–`ASSET-008` | WS-04 boundary | WS-05; WS-06 |
| `LIFE-001`–`LIFE-002` | WS-04 local lifecycle | WS-05 product workflow; WS-06 |

## 13. Invariant-to-Phase Coverage Matrix

| Target invariant IDs | Primary enforcement phase(s) | Integrated verification |
| --- | --- | --- |
| `INV-001`–`INV-009` | WS-02 | WS-05; WS-06 |
| `INV-010` | Phases 2 and 3 | WS-05; WS-06 |
| `INV-011` | Phases 3 and 4 | WS-05; WS-06 |
| `INV-012` | WS-04 | WS-05; WS-06 |
| `INV-013` | WS-04 | WS-05; WS-06 |
| `INV-014` | WS-01 architecture; Phases 3 and 4 | WS-05; WS-06 |
| `INV-015`–`INV-016` | WS-02 | WS-05; WS-06 |
| `INV-017`–`INV-018` | WS-04 | WS-05; WS-06 |
| `INV-019` | WS-02 | WS-05; WS-06 |
| `INV-020` | WS-04 | WS-05; WS-06 |

## 14. Completion-Evidence Coverage

| Target-specification evidence category | Construction phase responsible for producing evidence |
| --- | --- |
| §13.1 Build and platform evidence | Phases 1, 4, 5, and 6 |
| §13.2 Reconciliation semantic tests | WS-02; integrated confirmation in Phases 5 and 6 |
| §13.3 State and crash-safety tests | WS-02; integrated fault injection in WS-06 |
| §13.4 Transfer and large-vault evidence | Phases 3 and 4; integrated scale validation in WS-06 |
| §13.5 Destructive-safety evidence | WS-02; integrated approval/execution validation in Phases 5 and 6 |
| §13.6 Authentication and security evidence | WS-03; integrated device/security validation in Phases 5 and 6 |
| §13.7 Configuration, lifecycle, and asset-boundary evidence | WS-04; integrated validation in Phases 5 and 6 |
| §13.8 Stage 3 traceability readiness | WS-06 prepares complete evidence; Stage 3 independently validates it |


## Product Invariant-to-Workstream Coverage

| Target invariant IDs | Primary enforcement phase(s) | Integrated verification |
| --- | --- | --- |
| `INV-001`–`INV-009` | WS-02 | WS-05; WS-06 |
| `INV-010` | Phases 2 and 3 | WS-05; WS-06 |
| `INV-011` | Phases 3 and 4 | WS-05; WS-06 |
| `INV-012` | WS-04 | WS-05; WS-06 |
| `INV-013` | WS-04 | WS-05; WS-06 |
| `INV-014` | WS-01 architecture; Phases 3 and 4 | WS-05; WS-06 |
| `INV-015`–`INV-016` | WS-02 | WS-05; WS-06 |
| `INV-017`–`INV-018` | WS-04 | WS-05; WS-06 |
| `INV-019` | WS-02 | WS-05; WS-06 |
| `INV-020` | WS-04 | WS-05; WS-06 |


## BVP Requirement Coverage Within WS-07

| BVP requirement family | Primary phase | Final verification |
| --- | --- | --- |
| `BVP-ARCH-*` | WS-07/P0–WS-07/P1 | WS-07/P5 |
| `BVP-SIM-*` | WS-07/P2 | WS-07/P4–WS-07/P5 |
| `BVP-SCN-*` | WS-07/P3 | WS-07/P4–WS-07/P5 |
| `BVP-RUN-*` | WS-07/P3 | WS-07/P4–WS-07/P5 |
| `BVP-EVID-*` | WS-07/P3; production run receipt in WS-07/P5 | WS-07/P5 |
| `BVP-FAULT-*` | WS-07/P2–WS-07/P4 | WS-07/P5 |
| `BVP-LIVE-*` | WS-07/P5 | WS-07/P5 |
| `BVP-VER-*` | WS-07/P1 | every phase; WS-07/P5 final |
| `BVP-MIG-*` | WS-07/P0 | WS-07/P1 search/guard; WS-07/P5 final |
| `BVP-GOV-*` | WS-07/P1 | every session; WS-07/P5 final |
| `BVP-INV-001`–`012` | WS-07/P0–WS-07/P3 according to ownership | every phase; WS-07/P5 final |

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


## Coverage conclusion

The accepted source decomposition concluded that every product requirement family, all twenty product invariants, and every completion-evidence category were assigned without silent loss. The accepted BVP coverage likewise assigns every BVP requirement family. This migration changes organization and naming only; it does not weaken, drop, or reassign target behavior.
