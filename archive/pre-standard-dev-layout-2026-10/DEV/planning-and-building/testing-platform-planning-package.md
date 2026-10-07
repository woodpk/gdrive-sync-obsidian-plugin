# BRAIN Verification Platform — Planning Package

**Prepared:** 2026-09-23  
**Repository snapshot inspected:** supplied archive for initial planning; BVP-S01 live persistence rebound to `phase6-integration` at `efb9a0bb88084d706dc535f2826e4df956cfd57d`. Later executable session bases must still be rebound at dispatch.
**Current archive refs observed:** checked-out H6C diagnostic branch `c1c7036b...`; `origin/phase6-integration` at `cb17f968...` in the supplied archive. Exact execution bases must be rebound at dispatch.

## Package Contents

1. `01-bvp-target-system-specification.md` — authoritative intended replacement architecture and anti-drift requirements.
2. `02-bvp-authority-transition-and-legacy-archive.md` — mandatory first environment-preparation stage after planning acceptance.
3. `03-testing-platform-boundary.yaml` — proposed machine-readable architecture/complexity boundary to be persisted and mechanically enforced.
4. `04-bvp-build-decomposition.md` — minimum sound ordered construction phases and session sequence.
5. `05-bvp-requirement-coverage.md` — BVP requirement mapping, BRAIN target-spec completion-evidence mapping, and historical C03–F03 migration mapping.
6. `06-bvp-build-session-specifications.md` — nine bounded Stage-2A session specifications to be expanded against actual repository state immediately before execution.
7. `07-initial-legacy-harness-archive-inventory.md` — snapshot-specific starting inventory for BVP-S01; mandatory re-scan still required.
8. `08-proposed-decision-register-amendment.yaml` — deterministic DEC-301–310 supersession/adoption decisions for BVP-S01 (IDs must be rebound only if the live register has advanced).

## Manual Alignment

The package follows the repository's `dev/planning-and-building/agent-led-software-product-construction-manual.md` by:

- defining a target system before implementation;
- separating required outcomes/fixed boundaries from ordinary implementation mechanics;
- using the smallest dependency-driven phase sequence rather than feature-noun decomposition;
- providing requirement/dependency coverage;
- preserving repository grounding;
- requiring objective completion evidence;
- deferring final detailed Stage-2A prompt binding to the actual repository state produced by the immediately preceding session.

## Critical Transition Order

```text
Accept/persist this planning package
        ↓
BVP-S01: archive/supersede all active legacy-harness dev/** authority
        ↓
BVP-S02: remove legacy executable harness from production/tests
        ↓
BVP-S03: install architecture guard + metrics + local verification
        ↓
ONLY THEN build the replacement platform
```

This order is deliberate: the repository must not contain active old-harness authority while new implementation agents are grounding themselves, and the anti-drift guard must exist before substantive replacement-framework growth begins.
## Live Persistence Rebind

The initial planning package was developed from the user-supplied repository archive. Before persistence, BVP-S01 re-grounded against the live `phase6-integration` branch and bound this transition to starting HEAD `efb9a0bb88084d706dc535f2826e4df956cfd57d`.

That live branch contains later H6C harness material not present in the archive snapshot; BVP-S01 therefore includes those live-only `dev/**` artifacts in the legacy archive transition.
