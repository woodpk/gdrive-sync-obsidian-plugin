# DEC-339 / D339-07B2 — Provider/Changes Adversarial and Targeted-Effect Safety Matrix

## 0. Identity, classification, and exact accepted predecessor

- **Agent:** `agt-brain-dec339-07b2-provider-effect-matrix-01`.
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin` only.
- **Work unit:** WS-07 / D339-07B2 (second and final bounded verification child of D339-07B).
- **Classification:** IMPLEMENTATION — TEST-ONLY, executable after supervisor binds this task's immutable planning commit. Not a deployment or optimization cutover.
- **Exact required source/base:** `720e38df2ca0bc0337214200904a200fafeabca7`, the accepted PHX-CI evidence commit after D339-07B1's corrected six-store abort proof.
- **Accepted tested source:** `0741b798dad69acc448951c06c9ff4d5dcacbe8e`.
- **PHX-CI acceptance:** run `cef57c5f-20e7-4d03-baec-650c591bee3f` 11/11 stages PASS, 51 focused, 395 BVP, 938 full product tests, 0 failures/skips; `main.js` SHA-256 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`.
- **Required precreated branch:** `dec339/d339-07b2-provider-effect-matrix-01`, established from this exact evidence SHA. Do not substitute a moving branch tip, alter the predecessor, or rerun already-accepted D339-07B1 solely for administrative preference.
- **Tasking binding:** this document is in the planning branch; supervisor must supply its exact commit SHA when dispatching.

## 1. Read before writing

Read `AGENTS.md`, DEC-339 decision and target-spec §7.9, D339-07 workstream decomposition and verification plan, and the complete corrected `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md` §§5–8, 11 and review A03–A07/A09. Read entire current `test/dec339-remote-reader.test.ts` and `test/dec339-deterministic-safety-equivalence.test.ts` to avoid duplicating accepted cases; inspect production `src/drive/verified-metadata-inventory-reader.ts`, `src/drive/inventory-metadata-source.ts`, `src/drive/google-drive-port.ts`, `src/product/inventory-backed-snapshot-assembler.ts`, `src/product/authoritative-production-executor-base.ts`, and the existing canonical `ProductSnapshotAssembler`/controller recovery contract as read-only authority. Consult accepted D339-07A/07B1 PHX-CI evidence and BVP frozen boundary.

**Before creating EACH test/fixture file**, retrieve the complete ORIGINAL connected Google Drive `agent-led-software-engineering-operating-protocol` (not a summary) and read it; apply its exact tasking, PHX-CI exclusivity (§21.1), human execution/script audit (§19), reporting (§35.1), and owner-rerun constraint (§37.1). The original construction manual remains binding.

## 2. Exact writable allowlist

**CREATE only:**
1. `test/dec339-provider-changes-adversarial.test.ts`
2. `test/dec339-targeted-effect-safety-comparison.test.ts`

Each must be an independent TypeScript product test module included by the already-configured `test/**/*.ts` TypeScript/PHX-CI path, with existing test APIs and direct production calls. Max **250 lines** per file and 12–16 well-chosen new tests **total**; do not make one enormous repeated fixture, write bespoke runners or add test-only production ports. If safe decomposition requires helper sharing, keep helpers locally minimal and disclose any necessary additional file as a new task instead of modifying outside the allowlist.

**READ-ONLY:** every existing test (including D339-07A/07B1), production `src/**`, locked `test-platform/**` core/scenarios, `dev/authority/**`, PHX-CI runtime/config, `dev/scripts/**`, releases/shipping assets, actual Google Drive/Obsidian vaults and user state. Only PHX-CI may publish its routine `dev/_ca-output.*` and `dev/test-results/**` evidence. No GitHub Actions, custom validation scripts, physical canary, rollback, feature enablement or S09A rerun.

## 3. Positive/negative proof matrix — provider and Changes (A05/A06)

Create 7–9 focused source-connected tests. Retain already established happy-path assertions and add **counterexamples currently missing**, prioritizing:

1. **Paginated baseline and Changes:** at least 3 provider pages; exact continuation token sequence through a single terminal `newStartPageToken`; empty intermediate pages; no premature publication/coverage authority. Assert actual requested page tokens and terminal cursor, not just an `ok` status. Do not treat the terminal token as a cross-request lock.
2. **Partial/misleading completion (A05):** `incompleteSearch: true` on first/middle/terminal page, missing required completeness field in raw transport response, cyclic/replayed `nextPageToken`, false provider success after partial enumeration, failed middle-page request. Require partial/recovery failure, no 'complete' claim, no synthetic absence.
3. **Account-wide Changes classification (A06):** known tracked ID update, known-ID removed/inaccessible without positive trash proof, separately proven outside-managed-domain event, unclassifiable remote ID/parent ancestry. Prove only positively outside events can be excluded; unclassifiable must fail closed. Include duplicate/reordered events and stable-ID metadata ambiguity.
4. **Managed-root scope and identity:** root-/domain-escaped marked objects, inconsistent marked census after Changes, moved folder whose descendant mapping would be stale, changed account/scope or invalid token. Assert candidate rejected or read classified unknown/recovery-required, never permissive empty rows.
5. **Provider HTTP read contract:** `files.list` field mask requests and checks `incompleteSearch`, drains page tokens, `changes.list` distinguishes intermediate/terminal; all requests GET and no mutation. Avoid assuming locked `drive.file` permits all user-created Drive objects.

For any test the production interface cannot express without changing `src/**`, **record UNPROVEN** with exact missing seam; do not add fake statuses, ignore failures, change product source, or invent a pass. If a real product bug is exposed, record a separate bounded production-correction task, leaving D339-07B2 blocked until authorized correction and PHX-CI.

## 4. Positive/negative proof matrix — planner / executor / recovery (A03/A04/A07/A09)

Create 5–7 focused source-connected tests comparing **the actual existing full-reconciliation/authoritative execution read behavior** to the optional inventory-backed/targeted path on the **same controlled fixture**:

- A complete unambiguous matched fixture must yield identical relevant plan inputs, remote IDs, BASE and conflict/tombstone semantics, and no extra mutation authorizations.
- In incomplete, unknown-ID, duplicate same-name/normalized-collision, inaccessible ancestor, wrong managed root, and escaped **unrelated** marked-resource scenarios, inventory must be no more permissive than the canonical path; exact classifications can be **more conservative**. Some canonical calls return a conflict before yielding snapshots: do not force synthetic snapshot equality.
- A03 effect convergence requires a fresh, exhaustive **physical same-name sibling check** and independent appropriately fresh managed-root-wide provenance check (even for unrelated escaped objects). Cached inventory or a targeted same-parent query alone is NOT convergence or authorization.
- A09 outstanding durable intents force the existing recovery lifecycle and reassembly-before-planning where authority changed. A stale device, pending uncertain physical effect, or changed generation must not be dismissed by a cache hit.
- Show actual fallback/delegation by calling existing public production seams, not just a mock callback that returns `fallback`. Separate observed provider GETs from hypothetical mutation. Tests must NEVER perform a real Drive write.
- Control for different plan outcome types and require fail-closed exact branch path where possible; lack of a wired optimization is an explicit limitation, not a made-up equivalence proof.

Respect the accepted D339-07A assertions; add new falsification cases rather than rechecking unchanged mocks. **A03 proof must include the non-local managed-root provenance counterexample**, even if this demonstrates a required fallback rather than optimization speed.

## 5. Proactive construction audit and verification

Before requesting owner PHX-CI, independently review **all new test inputs, expectations, imports, mocked request page semantics, source-connected call paths, async/await, and negative-test fault placement** against production implementations. Record a coverage table in the handoff: test → real method/branch exercised → concrete assertion → unproven scope. Check tests cannot pass when fault injection is triggered too early or when a mock unconditionally returns the expected classification (learn from D339-07B1 abort test fidelity). Inspect complete diff and exact writable allowlist and verify new files are within size bounds.

Commit/push only the bounded tests to `dec339/d339-07b2-provider-effect-matrix-01`. **PHX-CI is the only executable validator**: owner launcher on a disposable isolated checkout, exact source SHA, base `720e38df2ca0bc0337214200904a200fafeabca7`, pinned runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, focused compilation and both compiled `dec339-*07B2*.test.js` using actual created filenames, plus related D339-07A/07B1 and full BVP where feasible, then mandatory full product/typecheck/build/repository/artifact stages. Audit every printed PowerShell line and enforce §37.1 (no administrative-only reruns). Publish all evidence; explicitly preserve any previously valid PASS stages if failures follow.

**Acceptance:** Every authored test executes and passes in PHX-CI; all required canonical stages pass; explicit source SHA/run ID/evidence commit; any A03–A07/A09 not yet proved is enumerated, with independent review gate still pending. No D339-07C benchmark/optimization claims, rollout, S09A physical validation or Stage 3 until separately authorized.

## 6. Handoff

Report: exact source tree and test cases (method branch, positive/negative classification), proof limitations, PHX-CI stages and evidence, whether task truthfully establishes remaining D339-07B obligations, and exact tasking location for D339-07C matched-fixture performance next. Stop if a production repair, contract change or scope expansion is needed and request separate authorized corrective task instead.
