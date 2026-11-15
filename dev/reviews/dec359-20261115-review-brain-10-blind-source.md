# DEC-359 — Frozen independent Pass 1 source assessment

- **Reviewer:** review-brain-10
- **Repository:** woodpk/gdrive-sync-obsidian-plugin
- **Feature:** WS-07 / DEC-359, existing BVP mailbox cross-client `drive.file` metadata-only read compatibility
- **Assigned immutable candidate SHA:** `b1ef092cf5ce73c7811b5726ee803add2538df2c`
- **Incoming handoff:** count 1; state publication `f46d1f240514bdca956110cfb53d4ef58754132c`, feature branch `feature/bvp-drivefile-cross-client-readonly-20261115`
- **Review phase:** FIRST PASS, frozen before any authored test file or original PHX-CI evidence-file inspection; no software execution.

## Normative contract
DEC-359 confines the separate compatibility observation to an independently sourced original Obsidian mailbox ID, separately authenticated same-account Windows Desktop OAuth under `drive.file`, and at most two fixed Google Drive metadata-only GET requests (direct `files.get` and established private-appProperties `files.list`). It forbids file contents, Drive mutations/new mailbox, implicit network dispatch, extra scopes/controllers/devices, and live compatibility claims based solely on mock evidence. DEC-360 authorizes only a localized exception for historical `dev/reviews/` text in the active archive-authority scanner; `dev/planning/`, `dev/authority/` and `dev/state/` must retain the archive-dependency guard. The frozen architecture-policy manifest continues to require PHX-CI, separated test-platform/shipping boundaries, fixed framework/PowerShell budgets and strict frozen-surface ownership.

## Direct source inspection and independent observations

1. **DEC-360 archive scanner:** `test-platform/src/architecture-governance.ts` lines 699–707 enumerate active `dev/` Markdown, and line 705 skips only paths under `dev/reviews/` before testing active archive-reference and instruction terminology. This respects the distinction between historical independent review text and active governing inputs. The source still checks other `dev/` paths. No source-level defect is established in this specific correction.
2. **Existing controller authentication:** `test-platform/src/windows-controller-auth.ts` uses the `drive.file` scope and device-local DPAPI token handling. Its general authenticated request factory accepts permitted Drive v3 URLs and does **not itself** confine operations to the two DEC-359 metadata GETs. Therefore the special probe must independently enforce exact targets/method, and rejection must occur before the shared factory is invoked; this is mandatory for Pass 2 examination of the test-only probe.
3. **Existing mailbox discovery:** `test-platform/src/live-device/drive-mailbox.ts` line 120 uses `appProperties has { key='brainBvpMailbox' and value='1' }`, `trashed = false`, `spaces=drive`, and a `pageSize=10` listing. Its ordinary controller root resolver can create a root if none is found, and the ordinary listing does not request a pagination token or independently prove folder MIME or exact external mailbox identity. The DEC-359 probe cannot rely on this resolver as its read-only/original-identity proof; it must issue and validate its own bounded metadata GETs.
4. **Feature verification scope:** The authorized compatibility probe is test-only. Its operative logic is in authored test code, excluded from blind Pass 1 by the governing review protocol. Consequently this source pass cannot establish probe safety, exact metadata matching, independently supplied mailbox identity, redacted result handling, synthetic case adequacy, or PHX-CI qualification; all remain mandatory Pass 2 checks.

## Frozen Pass 1 conclusion
**Provisional source assessment: no proven defect in the DEC-360 guard exception; DEC-359 read-only compatibility cannot be substantiated from accessible non-test source alone.** No live-Google compatibility conclusion, PHX-CI validation conclusion, or final acceptance verdict is reached here. Pass 2 must inspect test-only probe, exact source/test identity and original PHX-CI evidence before disposition.

## Information-isolation disclosure
The feature planning document and `dev/state/current-state.yaml` are mixed-role artifacts: while reading these for neutral requirements and handoff identity, the tooling also exposed embedded Builder status/previous PHX-CI summary metadata **before this assessment was frozen**. No authored tests, earlier independent review reports, full PHX-CI output files, or source-history diffs were examined. This is a limitation on claiming perfect blind information isolation; the source analysis above is independent and is not premised on the incidental status/result claims. This disclosure must carry into the final acceptance decision.

**Frozen for Pass 2:** Subsequent findings must be recorded in a separate final report without silently rewriting this assessment.
