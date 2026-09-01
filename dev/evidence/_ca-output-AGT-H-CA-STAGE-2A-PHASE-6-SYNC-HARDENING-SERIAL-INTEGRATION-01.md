# AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01 — INTEGRATION EVIDENCE

## Checkpoint — 2026-09-01 12:04 America/New_York

### Status

**TURN PAUSED BY SUPERVISOR — INTEGRATION NOT COMPLETE**

This checkpoint records the exact integration state at the supervisor-requested pause. No claim of completion is made.

### Identity / branch

- Agent: `AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Writable integration branch: `phase6-sync-integration-h`
- Protected/shared branches intentionally not modified: `phase6-integration`, `master`, `main`
- Exact approved frozen starting foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`
- Current source/integration head **before this evidence-only checkpoint commit**: `034c2165f8edca198c9ceda09e7cce716c9b0660`

### Immutable worker software authorities used

- A — REMOTE / Google Drive protocol: `7892589a45038e270b4a1ca0a7d96cf78cd348c7`
- B — LOCAL platform safety: `1d59af4bf4ed6f5b3a16a763c8e8c192c7c77d2d`
- C — STATE / BASE / recovery: `9854c85990869c00b536ac6a33e20b33b7799752`
- D — RECONCILIATION / orchestration: `c5e6c696850953e6f7ab2a512bf6a5e34b9fd1b3`
- E — RUNTIME / lifecycle: `60a7a194109ff6f6e1a0a6a7dfc5715511164722`
- F — MERGE / resource safety: `b6dadc0bd168c3a37bc085a2fd1a39ceacc10a1d`
- G — adversarial executable model/test: `6709074df443c3e29bdf88e6d40a8f11c79d154e`

Later evidence-only A/D/G heads were not used as software authority.

## Work completed

### 1. Exact integration branch established from the frozen v1.2 foundation

`phase6-sync-integration-h` was created from exactly:

`96b4541b15012ac4ce0d81243b73ef779efd343e`

The branch was not created from `phase6-integration`.

### 2. Worker C integrated first by owned historical-base delta

Integration commit:

`22df7cd5d407ccf8629294e9d59f6f0a9c8365bf` — `integrate(C): transplant durable state authority onto v1.2`

C-owned integrated surfaces include:

- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `test/phase2-state-hardening.test.ts`
- `test/workstreams/state/state-authority.test.ts`
- `test/workstreams/state/state-authority-v1-1.test.ts`

Historical C foundation/contracts were not imported wholesale.

### 3. Worker B integrated by owned historical-base delta

Integration commit:

`a5ac59caf768477701c9014365e3315af4567fbd` — `integrate(B): transplant local transaction safety onto v1.2`

B-owned integrated surfaces include:

- `src/local/local-vault-access-boundary.ts`
- `src/product/canonical-local-vault.ts`
- `test/phase6-a-local-hardening.test.ts`
- `test/workstreams/local/local-recovery-matrix.test.ts`
- `test/workstreams/local/local-transaction-safety.test.ts`

Historical B foundation/contracts were not imported wholesale.

### 4. Worker A integrated from its reviewed v1.2 descendant checkpoint

Integration commit:

`b647e5af03ce1949f76e30fe6616a4ec3e653258` — `integrate(A): reliable Drive protocol`

The commit preserves provenance to approved A software authority `7892589a45038e270b4a1ca0a7d96cf78cd348c7` and did not consume a later evidence-only A head.

A production/test changes now present include the approved reliable Drive implementation in `src/drive/google-drive-port.ts` and associated approved Drive tests.

### 5. Worker F integrated by owned historical-base delta

Integration commit:

`b8c8824391ebc49adaf0fe636e15de56731954c7` — `integrate(F): transplant merge resource safety onto v1.2`

F-owned integrated surfaces include:

- `src/core/conflict-resolver.ts`
- `src/product/text-version-store.ts`
- `test/phase2-conflict.test.ts`
- `test/workstreams/merge/resource-safety.test.ts`

Historical F foundation/contracts were not imported wholesale.

### 6. Worker E integrated by owned historical-base delta

Integration commit:

`b37ec0ae6489407a455b69fcb6100e4f73bab802` — `integrate(E): transplant lifecycle controls onto v1.2`

E-owned integrated surfaces include:

- `src/core/run-coordinator.ts`
- `src/product/scheduler.ts`
- `src/product/web-lock-run-lease.ts`
- `test/phase5-scheduler-acceptance.test.ts`

Historical E foundation/contracts were not imported wholesale.

### 7. Worker D integrated from its reviewed v1.2 software checkpoint

Integration commit:

`78048e29c44bb292738c1793db98ed476be6e017` — `integrate(D): authoritative orchestration`

The reviewed production source/test checkpoint used was exactly:

`c5e6c696850953e6f7ab2a512bf6a5e34b9fd1b3`

The known defective later D evidence head `a4a733bf1e36d768688bb0b3af14108ef3044a60` was not used as software authority.

D production/orchestration surfaces now present include the authoritative executor, durable intent recovery, operation isolation/lifecycle, controller orchestration, remote-feed authority, and D-owned v1.2 tests.

### 8. Worker G adversarial executable model integrated

Integration commit:

`7b6d1917ea016bcbc392ac5e7405908fca298f45` — `integrate(G): adversarial synchronization model`

The reviewed executable model/test checkpoint used was exactly:

`6709074df443c3e29bdf88e6d40a8f11c79d154e`

Integrated G surfaces:

- `test/adversarial-model/adversarial-model.test.ts`
- `test/adversarial-model/support/model.ts`

G introduced no production source.

### 9. H-owned cross-workstream compatibility bridge created

H integration commit:

`f5c7bb83953597f37e551616c5aec750b8142cf3` — `integrate(H): add unified authority and local transaction adapters`

H added:

- `src/product/phase6-sync-integration.ts`

The H bridge addresses two concrete cross-workstream composition mismatches discovered after assembly:

1. D's isolated orchestration modeled canonical state and writable synchronization authority through separable historical seams, while C's approved production implementation persists canonical state plus synchronization-authority metadata in one CAS-protected durable document with independent `persistenceRevision` and `semanticGeneration` semantics.
2. B's physical local transaction engine operates on physical vault paths while D's durable mutation descriptors operate on logical synchronization paths, including the portable configuration namespace.

The H bridge therefore provides production compatibility adapters for:

- C-backed semantic state/CAS compatibility while preserving persistence-revision versus semantic-generation distinction;
- B-backed crash-safe transactional local mutation with logical-to-physical target/stage/backup mapping;
- preservation/rebasing of valid convergence metadata through exact semantic-generation transitions.

### 10. H bridge corrected after deeper C/D semantic inspection

Current source/integration head:

`034c2165f8edca198c9ceda09e7cce716c9b0660` — `integrate(H): bridge split D state semantics onto C authority store`

This revision replaced an earlier incomplete H canonical-commit approach with an adapter that works through C's actual writable authority model rather than attempting to bypass or duplicate C's authority semantics.

## Frozen-contract audit at this checkpoint

A direct compare of the frozen foundation `96b4541b15012ac4ce0d81243b73ef779efd343e` to source head `034c2165f8edca198c9ceda09e7cce716c9b0660` shows **no changed files under `src/contracts/**`**.

Therefore at this checkpoint:

`src/contracts/**` remains frozen and unchanged from v1.2.

No contract change request is currently identified.

## Conflicts / semantic integration findings so far

- No frozen-contract conflict was accepted or blended.
- No historical B/C/E/F foundation tree was merged wholesale.
- No later evidence-only A/D/G head was used as executable authority.
- No worker PR was merged.
- The main cross-workstream semantic mismatch found so far is the C/D state-authority composition mismatch described above; it is being handled as H-owned composition/compatibility wiring without modifying frozen contracts or redesigning either worker.
- The second identified integration mismatch is B physical-path transaction execution versus D logical-path durable descriptors; the H adapter exists, but production composition has not yet been wired to consume it.

## Work still outstanding

Integration is **not complete**. The following work remains.

### A. Complete production composition wiring

The actual production construction path was located in:

- `src/product/runtime.ts`
- `src/product/product-controller.ts`

Current production runtime still constructs the legacy runtime objects and D's controller currently defaults to its read-only/fail-closed authority bridge unless explicit writable production seams are supplied.

The remaining H-owned composition work must wire the already-approved production implementations together, specifically:

1. C -> D: use the real writable C-backed `SynchronizationAuthorityStoreV1_1` / integrated state adapter rather than D's read-only fallback.
2. A -> D: supply A's approved `ReliableRemoteMutationPort`, `RemoteFolderCreateRecoveryReadPort`, and reliable Changes/reconciliation implementation.
3. B -> D: supply the H/B `LocalTransactionalMutationPort` adapter so D local file mutations execute through B's crash-safe transaction engine.
4. B -> E: wire B's cache-bypassing local integrity read into E's lifecycle integrity opportunity.
5. D -> C: ensure durable operation intents, physical-effect stages, learned remote batches, synchronization-authority writes, and canonical state commits all persist through C's actual durable store.
6. F -> D: confirm D's clean three-way merge execution consumes the approved F conflict/resource-safety implementation without bypass.
7. E -> D: preserve lifecycle/cancellation authority outside physical-effect truth and restart recovery.

The latest inspection indicates this can likely be localized primarily in `src/product/product-controller.ts` plus the existing H integration adapter rather than requiring a broad rewrite of `runtime.ts`, but this has **not yet been committed or verified**.

### B. Add H integration acceptance tests

No H-owned integration acceptance test file has yet been added.

Still required:

- H-I1 remote create composition
- H-I2 remote update/trash identity authority
- H-I3 lost-response restart/recovery with C persistence and no redispatch
- H-I4 local transactional mutation through B
- H-I5 E lifecycle integrity opportunity using B cache-bypassing read
- H-I6 A Changes -> D durable batch learning -> C persistence / cursor ordering
- H-I7 F clean merge -> D independent effect verification -> C canonical commit
- H-I8 fail-closed missing required A/B/C production seam

### C. Add top-level H test entrypoint / guarantee G runtime discovery

The ordinary repository test script currently executes only:

`node --test .test-build/test/*.test.js`

G lives under nested `test/adversarial-model/**`, so compilation alone is not runtime execution.

Still required:

- create an H-owned top-level test entrypoint such as `test/phase6-h-sync-integration.test.ts` that imports the adversarial suite and H integration acceptance suite, or otherwise explicitly execute the emitted G test path;
- confirm G actually runs at runtime.

### D. Run integrated verification

No complete integrated verification pass has yet been run after H wiring because production composition is not yet finished.

Still required after composition/tests are complete:

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`
- `git diff --check`
- explicit G runtime execution at its actual emitted path if needed
- focused A/B/C/D/E/F suites
- H-owned integration tests

No raw integrated TAP counts have yet been recorded.

### E. Diagnose all remaining repository failures

D's earlier isolated checkpoint had 500 tests / 442 pass / 33 fail / 25 cancelled. Those historical failures have **not** yet been reclassified against the assembled A-G candidate.

After production composition is complete, every remaining failure/cancellation must be classified as:

- H integration wiring defect;
- obsolete legacy fixture requiring frozen dependency construction;
- actual worker defect requiring supervisor routing;
- unrelated pre-existing failure.

No remaining failure may be silently waived.

### F. CI/raw artifact verification if used

No H integration CI run has yet been created or inspected.

If CI is used, still required:

- record run ID, job ID, artifact ID/digest;
- inspect raw TAP/check artifacts;
- record exact test/pass/fail/cancelled/skipped/todo counts.

### G. Final evidence and canonical append

The present file is a pause checkpoint only.

Still required after source/test verification succeeds:

- update this H-specific evidence with exact final manifests, conflicts/resolutions, commands, counts, CI evidence if any, final source/test SHA, and blockers;
- only then append one integration-closure section to `dev/evidence/_ca-output.md`;
- verify canonical evidence prefix is byte-identical before append;
- verify final evidence-only delta contains only authorized evidence additions.

Canonical `dev/evidence/_ca-output.md` has **not** been modified by H at this checkpoint.

## Exact next executable action after supervisor resumes H

1. Resume from source/integration commit `034c2165f8edca198c9ceda09e7cce716c9b0660` (ignoring this evidence-only checkpoint commit for source semantics).
2. Complete the minimum production wiring in `src/product/product-controller.ts` and, only if mechanically required, the existing H integration adapter.
3. Confirm `src/contracts/**` remains byte-identical to `96b4541b15012ac4ce0d81243b73ef779efd343e`.
4. Add H-I1 through H-I8 integration acceptance coverage and the top-level G runtime-discovery entrypoint.
5. Run the full required verification surface and classify every remaining failure/cancellation.

## Current disposition

`TURN PAUSED BY SUPERVISOR — INTEGRATION NOT COMPLETE`

## H-U1 — PRODUCTION COMPOSITION

### Entry / boundary verification

- H-U1 entry branch head: `3ecbc6993dedf58284b443cfcc1925f71d3c1b70`.
- Required checkpoint `ef4af05ff349c631960a08d7b71f43a90109766c` was confirmed in branch ancestry before editing.
- Semantic checkpoint immediately beneath that evidence commit: `034c2165f8edca198c9ceda09e7cce716c9b0660`.
- Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`.
- Entry `src/contracts/**` tree SHA: `4deb82e382f7957c731ef78db52b4164571d57a3`, identical to the foundation.
- The H checkpoint evidence file was read in full and the actual production composition root (`src/product/runtime.ts`) plus D controller seams were inspected before editing.

### Production files changed

- `src/product/runtime.ts`
- `src/product/phase6-sync-integration.ts`

`src/product/product-controller.ts` required no modification. `src/contracts/**` was not modified.

### Exact production composition decisions

1. **C -> D writable state/authority:** runtime now constructs C's real `PersistentSynchronizationStateStore`, wraps it with H's `IntegratedSynchronizationStateStore`, and supplies that same C-backed H store as D's `stateStore` and `authorityStore`, to the production executor, and to snapshot assembly. H preserves C's separate `persistenceRevision` and `semanticGeneration`; state writes continue through C CAS/validation rather than a parallel or read-only store.
2. **A -> D reliable REMOTE seams:** runtime supplies the approved production `GoogleDriveAdapter` (`this.boundary.drive`) as D's `ReliableRemoteMutationPort`, `RemoteFolderCreateRecoveryReadPort`, and `ProductSnapshotAssembler` reliable Changes port. Incremental Changes therefore uses A's production reliable Changes implementation rather than the legacy/default absence path.
3. **B -> D crash-safe LOCAL mutation:** runtime constructs `IntegratedLocalTransactionalMutationPort(this.host.app.vault.adapter, rawLocal, scope)`, which delegates to B's `ObsidianLocalMutationTransactions` and preserves H's logical-to-physical mapping, including portable configuration paths. That transaction backend is attached to `CanonicalEvidenceLocalVault`, and the canonical local object is supplied to D's local transactional seam.
4. **D -> C durability:** because D's state and authority seams, executor, recovery dependencies, learned-remote-batch path, and canonical commit path share the same `IntegratedSynchronizationStateStore`, durable operation intents, physical-effect stages, learned batches, authority writes, and canonical state transitions resolve to C's real durable authority document instead of D's read-only/default authority fallback.
5. **E lifecycle integrity:** the runtime scheduler continues to receive `CanonicalEvidenceLocalVault`, whose B-approved `readFileBypassingEvidenceCache()` surface remains structurally visible. E's scheduler already detects and invokes this cache-bypassing seam; no redundant integration API was added.
6. **F merge path:** the existing `ProductTextVersionStore` + `ThreeWayConflictResolver` composition was preserved unchanged. H-U1 did not alter F semantics.

### H-U1 commits

- `35ebe01f12ea5712b1a27a3f1150cf8c8347e46a` — `integrate(H-U1): compose production synchronization seams`
- `58ba4799987208e728c645d30f8cdd5e558d0120` — `fix(H-U1): make revision-domain conversion explicit`

The second commit corrected an H-owned TypeScript branded-revision compatibility error found by verification. It changes only the explicit compile-time conversion of a legacy `StateRevision`-domain value into C's `PersistenceRevision` domain by routing the cast through `unknown`; it does not change C worker semantics or frozen contracts.

### Verification

The local execution sandbox could not clone/install from GitHub because outbound DNS resolution was unavailable (`Could not resolve host: github.com`). To obtain a dependency-capable deterministic execution environment without merging anything, H opened verification-only **draft PR #45**, titled `DO NOT MERGE — H-U1 production composition verification only`, from `phase6-sync-integration-h` to `phase6-integration`. The PR remains verification-only and must not be merged.

First verification run:

- Workflow run: `33549895800`
- Job: `99996479353`
- `npm ci`: succeeded.
- `npm run typecheck`: failed with H-owned `TS2352` branded-conversion diagnostics at `src/product/phase6-sync-integration.ts` lines 283 and 350.
- Subsequent workflow steps were skipped by the workflow after that failure.
- The H-owned defect was corrected in `58ba4799987208e728c645d30f8cdd5e558d0120`.

Successful verification run against source/test completion SHA `58ba4799987208e728c645d30f8cdd5e558d0120`:

- Workflow run: `33550259731`
- Job: `99997666103`
- `npm ci`: **success**.
- `npm run typecheck`: **success**.
- `npm run build`: **success**.
- `git diff --check`: **success**.
- The repository workflow also completed its existing `npm test` and `npm run check` steps successfully. Those broader executions are incidental evidence only; H-U1 did not begin the H-U4 full-suite failure-classification task.
- No separate narrower focused-test command was available in the existing workflow without changing CI. No H-I1 through H-I8 tests were started in this unit.

### Frozen-contract result

At source/test completion SHA `58ba4799987208e728c645d30f8cdd5e558d0120`, the `src/contracts/**` tree SHA is still exactly:

`4deb82e382f7957c731ef78db52b4164571d57a3`

This is byte-identical at the tree level to frozen foundation `96b4541b15012ac4ce0d81243b73ef779efd343e`. No `src/contracts/**` file was changed by H-U1.

### Completion state

- Source/test completion SHA: `58ba4799987208e728c645d30f8cdd5e558d0120`.
- Production now constructs the real C-backed writable authority/state path, A reliable REMOTE seams including incremental Changes, and B crash-safe LOCAL transactional seam instead of relying on D's fail-closed defaults.
- E cache-bypass integrity composition is preserved and F merge composition is unchanged.
- Unresolved H-U1 blocker: **none**.
- Canonical `dev/evidence/_ca-output.md` remains untouched.
- H-U2 has **not** been started.

## H-U2 — MUTATION & RESTART INTEGRATION TESTS

### Entry / authority consumed

- H-U1 semantic source/test authority consumed: `58ba4799987208e728c645d30f8cdd5e558d0120`.
- H-U1 evidence-only completion / H-U2 entry head: `8d8ede4c1b6835e699c843e9274d60862c5f1396`.
- Writable branch remained `phase6-sync-integration-h`; protected/shared branches were not modified and no merge was performed.
- The checkpoint and completed H-U1 evidence were read before editing, the actual H-U1 production wiring was re-inspected, and the frozen contract tree was confirmed unchanged.

### H-U2 test surfaces

Added:

- `test/workstreams/integration/h-u2-mutation-restart-integration.test.ts` — bounded five-case A/B/C/D production-composition acceptance suite.
- `test/phase6-h-u2-integration.test.ts` — one-line top-level H-U2 execution shim required because the repository test command discovers only `test/*.test.ts` outputs; this is not the final G/H discovery entrypoint reserved for H-U3.
- `test/phase6-h-u2-affected-regression.test.ts` — narrow execution shim for C v1.1 authority, D durable-intent recovery, and D authoritative commit-lifecycle worker suites materially adjacent to the H bridge repair.

The H suite uses real integrated production implementations wherever the unit requires them: A `GoogleDriveAdapter` over a deterministic transport boundary, C `PersistentSynchronizationStateStore` wrapped by H `IntegratedSynchronizationStateStore`, D's authoritative executor/coordinator/recovery path, and B's crash-safe local transaction engine through H's logical-to-physical adapter. Test doubles are limited to external environment boundaries and do not replace the production integration layer being proved.

### Production file modified and reason

Modified only:

- `src/product/phase6-sync-integration.ts`

Initial runtime execution at pre-fix H-U2 test head `e862491b34180bd9c42dc67d81f9903390165ba1` passed H-I1, H-I2, H-I4, and H-I8 but exposed one H-owned H-I3 bridge defect on the second restart. The first restart had already recovered the persisted operation, verified the physical effect, and committed canonical state. C correctly advanced global `semanticGeneration` for that canonical change, but H's split-domain compatibility bridge left the now-`state-committed` durable intent tagged with the preceding generation. D correctly rejected that stale tag before reaching its completed-intent no-op path.

Repair commit:

`011317dfe80ad0a06af57f392de469d0b1d79de7` — `fix(H-U2): keep completed intents restart-idempotent`

The repair is deliberately narrow: H rebases a durable intent's semantic-authority tag only when every effect is already `state-committed`. Pending, `dispatch-authorized`, `outcome-unknown`, and `effect-verified` intents are never rebased, so stale authority cannot be renewed for work that could still authorize or recover a physical mutation. No C or D worker semantic implementation and no frozen contract was changed.

### Acceptance results

- **H-I1 — PASS.** Production-planned REMOTE create persisted C-backed durable intent/effect state, used A's reserved-ID reliable create path, independently observed the resulting Drive object after a simulated lost response, reached `state-committed` only after verified convergence/canonical commit, and preserved the reserved Drive identity in BASE/mapping. Raw legacy Drive mutation remained unused.
- **H-I2 — PASS.** REMOTE trash used the exact current trusted C remote mapping through A's reliable mutation seam. A deliberately forged planner identity marker could not replace C authority. Removing the durable mapping produced fail-closed `recovery-required` behavior with zero physical trash dispatch.
- **H-I3 — PASS after H-owned bridge repair.** A C-persisted `dispatch-authorized` reserved create survived store reconstruction, restarted through D observation/recovery without reservation or redispatch, committed the recovered identity canonically, and reached `state-committed`. A repeated restart after completion performed no physical mutation and no repeated semantic/persistence commit.
- **H-I4 — PASS.** D's durable LOCAL descriptor retained the logical portable-configuration path while H mapped target/stage/backup into the active physical configuration directory and B's crash-safe transaction engine performed staging and atomic promotion. The synthetic remote namespace never became a literal filesystem target. C persisted transaction progress and canonical BASE advanced only after verified local bytes.
- **H-I8 — PASS.** Missing writable C authority, missing A reliable REMOTE mutation seam, and missing B LOCAL transactional seam each failed closed. None silently fell back to raw legacy physical mutation.

### Focused execution and exact counts

Final source/test head:

`4d582e72e4a5bee47a24690f3a4a68299dd4baf7`

Phase 6 verification CI at that head:

- Workflow run: `33565771075`
- Job: `100048468415`
- Artifact: `9823046263`
- Artifact digest: `sha256:0fb622ced629d0c81f20673bffd09ad708b6ba25ac6c5629b764952095426934`
- `npm ci`: **success**.
- `npm run typecheck`: **success**.
- Repository test execution invoked the dedicated top-level H-U2 shim and executed all five H acceptance cases at runtime: **5 tests / 5 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo**.
- Affected C/D regression shim executed C v1.1 authority **9/9**, D durable-intent recovery **8/8**, and D authoritative commit lifecycle **4/4**: **21 tests / 21 pass / 0 fail** total for the explicitly affected regression set.
- `npm run build`: **success**.
- `git diff --check`: **success**.
- The workflow also ran the broader repository tests/check as part of its fixed CI definition. Raw full-test aggregate was `584 tests / 525 pass / 34 fail / 25 cancelled / 0 skipped / 0 todo`; those non-H-U2 failures/cancellations were not classified or repaired in this unit because whole-repository classification is explicitly reserved for H-U4.
- A/B worker production source was not modified by the H-I3 bridge repair, so no additional A/B worker regression suite was mechanically affected by that repair. H-I1/H-I2 exercise A's real reliable mutation seam and H-I4 exercises B's real transaction engine in the integrated path.

### Frozen-contract result

Foundation `96b4541b15012ac4ce0d81243b73ef779efd343e` resolves `src/contracts/**` to tree:

`4deb82e382f7957c731ef78db52b4164571d57a3`

H-U2 source/test completion head `4d582e72e4a5bee47a24690f3a4a68299dd4baf7` resolves `src/contracts/**` to the exact same tree:

`4deb82e382f7957c731ef78db52b4164571d57a3`

Therefore `src/contracts/**` is byte-identical to the frozen v1.2 foundation. No contract change request exists.

### H-U2 completion state

- Source/test SHA: `4d582e72e4a5bee47a24690f3a4a68299dd4baf7`.
- H-I1: PASS.
- H-I2: PASS.
- H-I3: PASS after bounded H-owned bridge repair.
- H-I4: PASS.
- H-I8: PASS.
- Routed blocker: **none**.
- Canonical `dev/evidence/_ca-output.md` remains untouched.
- H-U3 has **not** been started.

## H-U3 — FEED, LIFECYCLE, MERGE & TEST DISCOVERY

### Entry / authority consumed

- H-U2 source/test authority consumed: `4d582e72e4a5bee47a24690f3a4a68299dd4baf7`.
- H-U2 evidence-only completion / H-U3 entry head: `dcd18ce685fa2422de2080aa22895accfcd1a0ec`.
- Writable branch remained `phase6-sync-integration-h`; protected/shared branches were not modified and no merge was performed.
- H checkpoint, H-U1, and H-U2 evidence were read before editing; actual production seams for E lifecycle integrity, A reliable Changes, D durable feed/merge orchestration, C persistence, F merge retention, and B local transactions were inspected.

### H-U3 source/test changes

Added:

- `test/workstreams/integration/h-u3-feed-lifecycle-merge-integration.test.ts` — bounded H-I5/H-I6/H-I7 integrated production acceptance.
- `test/phase6-h-sync-integration.test.ts` — consolidated top-level discovery entrypoint importing H-U2, H-U3, and G's nested adversarial model exactly once.

Removed:

- `test/phase6-h-u2-integration.test.ts` — temporary H-U2-only discovery shim, retired to avoid duplicate H-U2 execution after consolidated discovery was introduced.

No production source was modified in H-U3. The source tree remained exactly the H-U2 source tree.

### H-I5 — PASS

`H-I5 E periodic integrity uses B cache-bypassing bytes, schedules reconciliation on drift, and suspension prevents a new run` passed at runtime.

The test deliberately changes underlying local bytes while preserving the same observation token. Ordinary canonical enumeration continues to return cached old evidence, proving the fixture actually contains stale cached evidence. E's real `ProductSyncScheduler` periodic integrity opportunity then reaches `CanonicalEvidenceLocalVault.readFileBypassingEvidenceCache()`, observes the changed authoritative bytes, and schedules reconciliation opportunity rather than manufacturing deletion authority. A second blocked integrity read followed by lifecycle `suspend` proves suspension/cancellation remains authoritative over starting new synchronization work after the integrity opportunity.

### H-I6 — PASS

Two integrated H-I6 tests passed.

1. `H-I6 A Changes traverse all pages; C durable learning precedes cursor mirror and restart consumes durable facts`
   - A's real `GoogleDriveAdapter` traversed intermediate page tokens losslessly: `cursor:0` -> `page:1` -> terminal `cursor:1`.
   - The legacy cursor-collapsing `readChanges` surface was instrumented to throw and was never called.
   - D durably learned the complete terminal batch into the real C-backed authority store before attempting canonical cursor mirror advancement.
   - An injected canonical cursor-mirror save failure left the canonical cursor at `cursor:0` while the complete learned batch remained durable.
   - Reconstructing C from the same durable bytes caused restart to resume from learned terminal `cursor:1`, not the stale canonical mirror.
   - The already-durable first batch was reconstructed into planning facts, a later `b.md` fact was learned through terminal `cursor:2`, and an unrelated pre-existing conflict remained unresolved without blocking later feed learning.
2. `H-I6 failure to durably learn the terminal A batch prevents canonical cursor advancement`
   - An injected writable-authority save failure prevented the learned batch from becoming durable.
   - The canonical cursor remained `cursor:0` and the controller entered recovery-required state.

### H-I7 — BLOCKED BY WORKER-OWNED D/A COMPATIBILITY DEFECT

`H-I7 F clean merge requires independent B LOCAL and A REMOTE durable verification before C canonical commit` failed at the integrated cross-workstream convergence boundary.

The test uses real integrated production implementations:

- F `ProductTextVersionStore` and `ThreeWayConflictResolver` produce and retain the exact clean merge;
- D `DeterministicSynchronizationPlanner` emits `clean-text-merge`;
- D authoritative execution creates independent LOCAL and REMOTE durable effects;
- B's real local transaction engine performs the LOCAL effect;
- A's real reliable update protocol performs the REMOTE effect;
- C's real durable authority persists the operation/effect state.

The clean merge input is deliberately unambiguous:

- BASE: `a\nb\nc\n`
- LOCAL: `A\nb\nc\n`
- REMOTE: `a\nb\nC\n`
- F retained clean merge: `A\nb\nC\n`

Raw integrated failure state:

- operation result: `blocked`;
- durable LOCAL effect: `effect-verified`;
- durable REMOTE effect: `effect-verified`;
- active same-path REMOTE objects: `remote:merge-predecessor`, `remote:merge-candidate`;
- canonical C BASE hash remained the pre-merge hash `sha256:880553fca8fcea94e325ee2cfb48e5a985cc797f39a14cc6d3cedecfeb2ae4d2`.

This demonstrates the safety property that partial/blocked convergence is not falsely committed: both physical effects were independently verified, but C canonical state did not advance.

The incompatibility is precise:

- A's approved reliable update semantics are `immutable-candidate-preservation`: the predecessor is intentionally preserved while a verified immutable candidate is materialized.
- D's current post-mutation `remote-file` convergence predicate in `src/product/authoritative-production-executor-base.ts` requires exactly one active object at the target path and requires that object to be the expected new object.
- Therefore D rejects the exact predecessor-plus-candidate physical state that A intentionally and correctly produces.

This is not safely repairable as H-owned composition wiring. Changing A would alter approved worker semantics; filtering or hiding the predecessor in an H adapter would manufacture false convergence evidence. The required correction belongs to D's worker-owned independent REMOTE convergence semantics and must preserve genuine ambiguity detection while recognizing A's approved predecessor-preserving successful-update shape. H-U3 therefore stopped without modifying D or A semantics.

### G adversarial runtime discovery — PROVEN

The consolidated top-level entrypoint `test/phase6-h-sync-integration.test.ts` imports:

- H-U2 acceptance;
- H-U3 acceptance;
- `test/adversarial-model/adversarial-model.test.ts`.

Raw TAP proves the nested G suite executes at runtime under ordinary repository `npm test`, not merely TypeScript compilation. G occupies runtime test numbers **548 through 601 inclusive: 54 G subtests**. Explicit runtime markers include:

- seeded randomized transition sequence `1` — PASS;
- seed `7` — PASS;
- seed `42` — PASS;
- seed `1337` — PASS;
- seed `12648430` — PASS;
- explicit replay of recorded event trace — PASS.

Raw stack locations reference `.test-build/test/adversarial-model/adversarial-model.test.js`, eliminating compile-only ambiguity. Any G failures elsewhere in the 54-subtest runtime surface are intentionally not classified in H-U3; repository-wide failure classification remains H-U4 scope.

The consolidated H entrypoint also proves H acceptance is not duplicated: H-I1 through H-I8 markers appear once in one contiguous runtime sequence before G.

### Verification / exact source-test authority

H-U3 source/test SHA:

`3c0de0d9c552e7b866591cbd0115e61cadb7dc86`

Phase 6 verification CI at that SHA:

- workflow run: `33569991238`;
- job: `100061634877`;
- artifact: `9824569629`;
- artifact digest: `sha256:93ee09a7122d17eb4780513cc1731e43f7cf9563fac47c14b1b2f996fbb88bab`;
- `npm ci`: **success**;
- `npm run typecheck`: **success**;
- `npm run build`: **success**;
- `git diff --check`: **success**.

Raw TAP H markers at this SHA:

- H-I1 #539 PASS;
- H-I2 #540 PASS;
- H-I3 #541 PASS;
- H-I4 #542 PASS;
- H-I8 #543 PASS;
- H-I5 #544 PASS;
- H-I6 primary #545 PASS;
- H-I6 durable-learning failure #546 PASS;
- H-I7 #547 FAIL for the exact D/A compatibility blocker documented above.

The workflow's test/check steps use `tee` without pipefail and therefore are not relied on as pass/fail truth. Raw artifact TAP was inspected directly.

Incidental raw whole-repository aggregate at this SHA was `644 tests / 571 pass / 48 fail / 25 cancelled / 0 skipped / 0 todo`. These repository-wide failures/cancellations were not classified or repaired in H-U3; H-U4 remains the owner of that classification campaign.

### Frozen-contract / production-source audit

H-U3 source/test root `3c0de0d9c552e7b866591cbd0115e61cadb7dc86` resolves `src` to:

`7fff46a3271ad295267b292fa47c334a466fb85a`

That is the same source tree already present at H-U2 completion. The current `src/contracts/**` tree remains exactly:

`4deb82e382f7957c731ef78db52b4164571d57a3`

This is byte-identical to frozen foundation `96b4541b15012ac4ce0d81243b73ef779efd343e`. No production file and no contract file was modified by H-U3.

### H-U3 disposition

- H-I5: PASS.
- H-I6: PASS, both required ordering/restart and durable-learning-failure cases.
- H-I7: BLOCKED by a concrete D worker-owned REMOTE convergence incompatibility with A's approved predecessor-preserving update semantics.
- G runtime discovery: PROVEN, 54 runtime G subtests discovered through ordinary repository execution.
- Production correction in H-U3: none.
- Canonical `dev/evidence/_ca-output.md`: untouched.
- Draft verification PR #45 remains verification-only and must not be merged.
- H-U4 has not been started.

`BLOCKED — SUPERVISOR DECISION REQUIRED`
