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

## H-U3 RESUME — D-C13 BLOCKER RESOLUTION

### Resume authority / exact delta consumed

- Prior H-U3 blocker source/test SHA: `3c0de0d9c552e7b866591cbd0115e61cadb7dc86`.
- Prior H-U3 blocker/evidence head: `0bbfb4708312bd587472ff11b88b0f3e9eb22b34`.
- Original D software authority represented in H before this resume: `c5e6c696850953e6f7ab2a512bf6a5e34b9fd1b3`.
- Approved D-C13 source/test authority consumed: `6ccd12e642f3168eeda017360289f95377935cff`.
- D-C13 evidence-only head `89bfdf243c2c18689ba432e40fa4ba60673e530b` was **not** consumed as software authority.
- The live H copies of every D-owned production/test file modified by D-C13 were byte-identical to the original D authority before transplant, so no integration conflict resolution was required.

Exact D-C13 software paths transplanted:

1. `src/product/remote-update-convergence.ts`
2. `src/product/authoritative-production-executor-base.ts`
3. `src/product/durable-intent-recovery.ts`
4. `test/workstreams/orchestration/v1.2-d-c13-predecessor-preserving-update.test.ts`
5. `test/phase6-d-orchestration-v1.2.test.ts`
6. `test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts`
7. `test/workstreams/orchestration/v1.2-production-authority-path.test.ts`
8. `test/workstreams/orchestration/v1.2-production-identity-authority.test.ts`
9. `test/workstreams/orchestration/v1.2-production-lifecycle-composition.test.ts`

The exact D-C13 transplant commit is:

`0e49a29b9edb83c1512c46635d07afc1f8f413a7` — `integrate(H-U3): consume approved D-C13 convergence correction`

Compare from prior H-U3 evidence head `0bbfb470...` to this commit contains exactly the nine authorized D-C13 paths and no evidence, contract, or unrelated worker path.

One H-owned top-level verification shim was then added because D-C13 modified `v1.2-production-authority-path.test.ts` but the approved D aggregate does not import that suite:

- `test/phase6-h-u3-dc13-affected-regression.test.ts`

It contains only:

`import "./workstreams/orchestration/v1.2-production-authority-path.test";`

No H/G integration discovery structure was recreated or changed.

### H-U3 integrated acceptance after D-C13

Raw final TAP proves all H acceptance markers execute exactly once in the consolidated H discovery path, runtime #546 through #554, with **9/9 PASS**:

- H-I1 #546 PASS.
- H-I2 #547 PASS.
- H-I3 #548 PASS.
- H-I4 #549 PASS.
- H-I8 #550 PASS.
- **H-I5 #551 PASS.** E still reaches B's cache-bypassing integrity read and lifecycle suspension remains authoritative.
- **H-I6 primary #552 PASS.** A Changes page traversal, D durable learning, C persistence-before-cursor ordering, restart consumption, and unrelated-conflict isolation remain correct.
- **H-I6 durable-learning-failure #553 PASS.** Failure to durably learn the terminal batch still prevents canonical cursor advancement.
- **H-I7 #554 PASS.** The original unweakened integrated clean-merge acceptance now succeeds against the real F -> D -> B/A -> C path.

H-I7 now proves the exact intended composition: F retains genuine clean merged content; D emits independent LOCAL/REMOTE durable effects; B performs the LOCAL transactional mutation; A performs the REMOTE immutable-candidate-preservation update; D-C13 recognizes only the exact persisted predecessor + persisted candidate topology; both effects reach durable verification/convergence; and C canonical BASE/state advances only after the required effects converge. No H production workaround, REMOTE filtering, predecessor hiding, or false convergence evidence was introduced.

D-C13 restart safety is independently covered by D-C13-T2: exact persisted predecessor+candidate physical reality is recognized on restart without redispatch.

### D-C13 / materially affected D regression verification

The updated top-level D aggregate `test/phase6-d-orchestration-v1.2.test.ts` executed as one contiguous raw TAP block #436 through #521:

**86 tests / 86 pass / 0 fail**.

That aggregate includes authoritative commit/effect lifecycle, production lifecycle composition, production identity authority, durable-intent recovery, effect-verified convergence, and the complete D-C13 focused suite.

D-C13 focused results are exactly **7/7 PASS**:

- D-C13-T1 #515 PASS — exact predecessor + candidate ordinary convergence.
- D-C13-T2 #516 PASS — restart recognition without redispatch.
- D-C13-T3 #517 PASS — REMOTE create remains strict exact-one convergence.
- D-C13-T4 #518 PASS — wrong predecessor rejected.
- D-C13-T5 #519 PASS — third same-path object rejected.
- D-C13-T6 #520 PASS — wrong candidate identity/content rejected.
- D-C13-T7 #521 PASS — predecessor revision mismatch rejected.

The separately discovered, D-C13-modified production-authority-path suite executed raw TAP #632 through #636:

**5 tests / 5 pass / 0 fail**.

Therefore every D-C13-touched production regression surface required by this resume executed cleanly in the integrated H candidate. The previously observed isolated D aggregate count of 86/86 survives integration exactly.

### H/G top-level runtime discovery

`test/phase6-h-sync-integration.test.ts` remains unchanged from the prior H-U3 design and still imports H-U2 acceptance, H-U3 acceptance, and G's nested adversarial test exactly once. H-I1 through H-I8 markers occur once, proving H acceptance is not improperly duplicated.

Raw TAP again proves G executes from `.test-build/test/adversarial-model/adversarial-model.test.js` under ordinary repository execution. Using the same count convention recorded in the historical H-U3 blocker section, G's model/replay surface is **54 runtime subtests**, now #555 through #608. Explicit passing markers include deterministic seeds `1`, `7`, `42`, `1337`, `12648430`, plus explicit recorded-trace replay.

The same imported G test file additionally registers two trace-support checks immediately afterward:

- #609 `simple trace minimizer retains only events needed for the same invariant failure` — PASS;
- #610 `trace serialization is sanitized and contains no platform/user/auth secrets` — PASS.

Thus the complete imported G file contributes **56 runtime test registrations** in the final candidate; 54 are the model/replay count used by the prior H-U3 evidence convention and two are trace-support checks. G execution is therefore proven, not inferred from compilation. Existing unrelated G/repository failures are not classified here; H-U4 remains their owner.

### Final CI / static gates

Final H-U3 resume source/test SHA:

`84cae684607be10b57ec5569bab14a819bad822f`

Source/test commits in this resume:

- `0e49a29b9edb83c1512c46635d07afc1f8f413a7` — exact approved D-C13 software transplant.
- `84cae684607be10b57ec5569bab14a819bad822f` — one-line H-owned discovery shim for the otherwise-undiscovered D production-authority-path regression.

Final Phase 6 verification:

- workflow run: `33583775096` — **success**;
- job: `100103479758` — **success**;
- artifact: `9829320282`;
- artifact digest: `sha256:1b5efbd3ffccb65713240386aa08852b07813cf697327c08072f5eac67155710`;
- `npm ci`: **success**;
- `npm run typecheck`: **success**;
- `npm run build`: **success**;
- `git diff --check`: **success**.

The workflow's test/check steps still pipe through `tee`; raw artifact TAP, not the green workflow badge, is the authority for counts stated above.

Incidental raw whole-repository aggregate at this final H-U3 source/test SHA is:

`656 tests / 584 pass / 47 fail / 25 cancelled / 0 skipped / 0 todo`.

Those unrelated repository-wide failures/cancellations are deliberately not classified or repaired in this resume. H-U4 owns the full repository classification campaign.

### Frozen-contract / boundary audit

Final source/test root `84cae684607be10b57ec5569bab14a819bad822f` resolves `src` to:

`442cf1b6a07386d6ae806b9b6123e0a621476243`

and `src/contracts/**` resolves exactly to frozen tree:

`4deb82e382f7957c731ef78db52b4164571d57a3`

This is byte-identical to frozen foundation `96b4541b15012ac4ce0d81243b73ef779efd343e`.

Compare from the prior H-U3 blocker/evidence head `0bbfb4708312bd587472ff11b88b0f3e9eb22b34` to final source/test SHA `84cae684607be10b57ec5569bab14a819bad822f` contains exactly the nine approved D-C13 software paths plus the one-line H-owned affected-regression discovery shim. No canonical evidence, contracts, or unrelated worker semantics were changed.

### H-U3 resume completion state

- D-C13 correctly consumed from approved source/test authority `6ccd12e642f3168eeda017360289f95377935cff`.
- D evidence-only head `89bfdf243c2c18689ba432e40fa4ba60673e530b`: not consumed.
- Integration conflicts: none.
- H-I5: PASS.
- H-I6: PASS, both cases.
- H-I7: PASS after approved D-C13 correction; H test was not weakened.
- D-C13 focused suite: 7/7 PASS.
- D aggregate: 86/86 PASS.
- D production-authority-path affected suite: 5/5 PASS.
- G runtime discovery: proven; 54 model/replay runtime tests under prior convention, 56 total registrations from the imported G file including two trace-support tests.
- Typecheck/build/diff: PASS.
- Frozen contracts: unchanged.
- Canonical `dev/evidence/_ca-output.md`: untouched.
- PR #45 remains verification-only draft and unmerged.
- H-U4 has not been started.
- Unresolved H-U3 blocker: none.

## H-U4 — FULL INTEGRATED VERIFICATION & FAILURE CLASSIFICATION

### Entry / authority consumed

- H-U3 source/test completion authority consumed: `84cae684607be10b57ec5569bab14a819bad822f`.
- H-U3 evidence-only completion / H-U4 entry head: `f1b3cc37f3be3cb18fbd4ea6a554a02d56a0d66c`.
- Writable branch remained `phase6-sync-integration-h`; no worker branch, `phase6-integration`, `main`, or `master` was modified or merged.
- H-U4 made no production/test modification. This unit is diagnostic/classification only.
- The H top-level entrypoint remained present and imports H-U2, H-U3, and G's nested adversarial model.
- `src/contracts/**` at entry resolves to frozen tree `4deb82e382f7957c731ef78db52b4164571d57a3`.

### Verification execution

A fresh Phase 6 verification run was automatically triggered by the H-U3 evidence-only commit after H-U3 had closed, so H-U4 used that clean checked-out state rather than creating a no-op source commit.

- Checked-out SHA: `f1b3cc37f3be3cb18fbd4ea6a554a02d56a0d66c`.
- Source/test parent represented by that evidence-only commit: `84cae684607be10b57ec5569bab14a819bad822f`.
- Workflow run: `33584177125`.
- Job: `100104712131`.
- Artifact: `9829465257`.
- Artifact digest: `sha256:2b3fd9207d2476a50a9003bf8271e96a3b2c365e37170d86b421f3b51db00047`.

Exact workflow commands/surfaces:

1. `npm ci` — PASS.
2. `npm run typecheck` — PASS.
3. `mkdir -p .ci-evidence && npm test | tee .ci-evidence/full-tests.tap` — workflow shell step reports success because the pipeline lacks `pipefail`; raw TAP proves `npm test` itself is FAIL.
4. focused callback/diagnostic/OAuth/export command — raw TAP `38 / 38 PASS`.
5. `npm run build` — PASS.
6. `npm run check | tee .ci-evidence/check.log` — workflow shell step reports success because the pipeline lacks `pipefail`; raw `check.log` proves `npm run check` itself is FAIL during its internal `npm test` and therefore never reaches its internal build.
7. `git diff --check` — PASS.

No extra explicit G command was required because ordinary repository execution makes G runtime execution unmistakable: G is the contiguous raw TAP block #555–#610, and stack locations point into `.test-build/test/adversarial-model/**`.

### Raw repository truth

Authoritative `.ci-evidence/full-tests.tap`:

- tests: **656**
- pass: **584**
- fail: **47**
- cancelled: **25**
- skipped: **0**
- todo: **0**

Authoritative `.ci-evidence/check.log` repeats the same `656 / 584 / 47 / 25 / 0 / 0` test result and terminates after the internal test command. Therefore `npm run check` is genuinely failing even though the outer CI step is green.

### H / G runtime discovery

H integration tests execute exactly once:

- #546 H-I1 PASS
- #547 H-I2 PASS
- #548 H-I3 PASS
- #549 H-I4 PASS
- #550 H-I8 PASS
- #551 H-I5 PASS
- #552 H-I6 primary PASS
- #553 H-I6 durable-learning-failure PASS
- #554 H-I7 PASS

Thus H integration acceptance is **9 / 9 PASS** and no H-INTEGRATION-DEFECT is exposed by the assembled H acceptance surface.

G executes at runtime as #555–#610 inclusive: **56 G-file registrations**. The historical H count convention's 54 model/replay tests plus the two trace-support checks are all present. Seeds `1`, `7`, `42`, `1337`, `12648430`, explicit replay, minimizer, and serialization all execute.

### Classification evidence keys

#### `OLF-STATIC` — stale literal acceptance-map fixture

`test/phase5-acceptance-map.test.ts` hard-codes the scenario-31 test name `Phase5 scenario 31 local-change debounce coalesces repeated events into one automatic pass`. The live executable scheduler test is `Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass` and itself passes. Updating the evidence-map literal would preserve the intended executable-evidence assertion rather than weaken product semantics.

#### `OLF-PHYSICAL` — obsolete pre-hardening physical-controller dependency graph

The affected fixtures instantiate `IntegratedProductController` with legacy `ProductSynchronizationExecutor` and/or raw local/Drive mutation callbacks but omit the current frozen writable/recoverable production seams:
- writable `SynchronizationAuthorityStoreV1_1`;
- `ReliableRemoteMutationPort`;
- `LocalTransactionalMutationPort`;
- `RemoteFolderCreateRecoveryReadPort` where applicable.

Current `src/product/product-controller.ts` explicitly documents omission of these seams as fail-closed for physical mutation, and its default `TrustedStateSynchronizationAuthorityStore` is intentionally read-only. `saveAuthority()`/BASE commit through that bridge returns recovery-required rather than fabricating durable authority.

This is visible directly in raw failures: execution is rejected/recovery-required, mutations do not dispatch, or an async fixture waits for a legacy raw mutation callback that can no longer fire. Updating fixture construction to supply the hardened writable/recovery seams preserves the tests' asserted synchronization behavior; weakening production to call raw legacy mutations would violate the frozen safety design. H's real integrated runtime supplies these seams and H-I1–H-I8 are 9/9 PASS.

#### `OLF-FAKE-AUTH` — obsolete controller-isolation fake executor / legacy state-journal assumption

These fixtures inject a fake `executor.execute()` and/or instrument `stateStore.saveTrusted()` as if that were still the authoritative physical-effect/journal path, while omitting a writable `SynchronizationAuthorityStoreV1_1`. Hardened D/H orchestration persists durable intent/effect authority first and fails closed before invoking those legacy fake mutation hooks when writable authority is absent. The resulting signatures are zero fake-executor calls, expected injected throws not reached, missing mutation-complete diagnostics, or async waits cancelled.

Modernization must provide a writable in-memory frozen authority seam and test the intended controller behavior through the current authoritative execution lifecycle. It must not bypass or disable durable authority.

#### `G-W1` — G adversarial transition/quiescence model defect

Eleven G failures all terminate in G-owned `AdversarialSyncModel.assertQuiescentOrExplicit()` with `quiescence-failed:<device>:<path>`. They cover restart-stage survival, intended-version retention, repeated move/deletion history, path isolation, watcher/integrity recovery, and bounded quiescence. G's two source files are byte-identical in H to approved G authority `6709074df443c3e29bdf88e6d40a8f11c79d154e`, so this is not H composition drift. The defect is in G's executable transition/settle/quiescence model and must be repaired by G without altering A–F/H production semantics.

#### `G-W2` — G same-path concurrent-create ambiguity defect

G #583 fails inside G-owned `assertInvariants()` with `duplicate-ambiguous-winner:A:same.md`. The model reaches a state its own invariant forbids instead of preserving explicit ambiguity/conflict for concurrent same-path creates. This is G-owned model behavior, byte-identical to approved G authority, and is not an H wiring surface.

#### `G-W3` — G generic folder-recovery journal-routing defect

G #602 expects the correct journal to reach `effect-verified`, but actual stage is `undefined` when generic recovery must route multiple folder journals by exact journal identity. This is confined to G's executable adversarial model/test authority and must be corrected there; H must not add a production backdoor or redesign frozen folder-recovery contracts.

### Complete failure/cancellation ledger

| TAP | Result | Source | Test | Classification | Evidence key |
| ---: | --- | --- | --- | --- | --- |
| #182 | FAIL | `phase5-acceptance-map.test.js` | Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50 | OBSOLETE-LEGACY-FIXTURE | `OLF-STATIC` |
| #185 | FAIL | `phase5-controller.test.js` | Phase 5 successful reviewed first synchronization establishes the persistent first-sync gate only after cursor commit | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #187 | FAIL | `phase5-controller.test.js` | Phase 5 keep-local resolution revalidates and propagates local authority through journaled upload-update | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #188 | FAIL | `phase5-controller.test.js` | Phase 5 keep-remote resolution revalidates and propagates remote authority through journaled download-update | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #189 | FAIL | `phase5-controller.test.js` | Phase 5 keep-both creates a local-only conflict copy without assigning the source Drive ID, then next reconciliation plans upload-create | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #191 | FAIL | `phase5-group-a-recovery-state.test.js` | GROUP A A1 recovery preserves reconstructed trusted state while authority-incomplete conflict mutation remains blocked | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #199 | FAIL | `phase5-group-b-scope-transfer.test.js` | B4 authentication revoked after lazy transfer begins surfaces authentication-required and stops without cursor/local commit | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #200 | FAIL | `phase5-group-b-scope-transfer.test.js` | B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #201 | FAIL | `phase5-group-b-scope-transfer.test.js` | B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #202 | CANCELLED | `phase5-group-d-acceptance.test.js` | Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #203 | CANCELLED | `phase5-group-d-acceptance.test.js` | Phase5 scenario 47 notification policy emits only material user-actionable conditions | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #204 | CANCELLED | `phase5-group-d-acceptance.test.js` | Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #205 | FAIL | `phase5-group-d-active-run-integration.test.js` | G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #207 | CANCELLED | `phase5-group-d-active-run-integration.test.js` | G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #208 | FAIL | `phase5-group-d-conflict-destruction-integration.test.js` | G2 scenario 10 clean three-way text merge executes through controller and commits merged authority | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #211 | FAIL | `phase5-group-d-conflict-destruction-integration.test.js` | G2 scenario 14 stable Drive identity produces and executes identity-preserving remote move | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #212 | FAIL | `phase5-group-d-conflict-destruction-integration.test.js` | G2 scenarios 15 and 18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #215 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #216 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #217 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenario 3 identical first sync establishes BASE without content mutation | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #218 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #219 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #220 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #221 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #222 | FAIL | `phase5-group-d-first-sync-integration.test.js` | G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #227 | CANCELLED | `phase5-group-d-recovery-coordination-integration.test.js` | G2 scenario 27 cancellation stops future operations and leaves cursor unadvanced | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #228 | CANCELLED | `phase5-group-d-recovery-coordination-integration.test.js` | G2 scenario 28 pause blocks product-controller synchronization until resume | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #229 | CANCELLED | `phase5-group-d-recovery-coordination-integration.test.js` | G2 scenario 29 same-runtime product synchronization runs serialize rather than overlap | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #230 | CANCELLED | `phase5-group-d-recovery-coordination-integration.test.js` | G2 scenario 30 two real controller runs use separate production Web Locks leases over one shared lock boundary | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #233 | FAIL | `phase5-group-d-surface-lifecycle-integration.test.js` | G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #235 | FAIL | `phase5-group-d-surface-lifecycle-integration.test.js` | G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #269 | FAIL | `phase5-second-rejection.test.js` | C1 automatic run executes the independently safe subset of a mixed attention plan | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #302 | FAIL | `phase6-alpha-full-sync-remediation.test.js` | operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #303 | FAIL | `phase6-alpha-full-sync-remediation.test.js` | a later stable no-op reconciliation resolves transient stale attention without a content mutation | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #304 | FAIL | `phase6-alpha-full-sync-remediation.test.js` | post-journal stale intent is safely retired before unrelated work continues | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #326 | FAIL | `phase6-alpha-ios-sync-diagnostics.test.js` | iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #327 | FAIL | `phase6-alpha-ios-sync-diagnostics.test.js` | sync diagnostics preserve plan/execution semantics and never export vault path or content | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #333 | FAIL | `phase6-alpha-ios-sync-diagnostics.test.js` | pending throw is Error-level at its exact execution substage and closes the run | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #335 | FAIL | `phase6-alpha-ios-sync-diagnostics.test.js` | uncertain-journal throw is Error-level at its exact execution substage and closes the run | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #339 | FAIL | `phase6-alpha-mixed-plan-isolation.test.js` | mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #340 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | automatic plan-to-execute lifecycle serializes and coalesces overlapping periodic and local-change triggers | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #341 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | conflict and all-blocked plans isolate affected paths without mutating them | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #342 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | global recovery and destructive approval gates cannot execute a safe subset automatically | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #343 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | stale-device destructive work is isolated while independent safe work commits without cursor advancement | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #344 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | ordinary authorized deletion still executes automatically | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #345 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | partial first-sync safe union commits progress but cannot complete baseline or cursor authority | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #346 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | transient unstable path clears from current attention after a later stable retry | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #347 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | dependency isolation skips a child of a blocked parent while unrelated work proceeds | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #348 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | attention ledger retains every current issue while bounding resolved history, deduplicating, and exporting CSV safely | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #349 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | a fresh reason authoritatively supersedes the prior current reason for that path and successful reconciliation resolves it | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #350 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | ledger persistence failure is surfaced but does not roll back authorized safe work | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #351 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | one shared plugin repository recovers after failed writes and attention failure cannot abort safe execution | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #352 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | serialized plugin repository writes keep per-call immutable payload snapshots | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #353 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | automatic lifecycle diagnostics have run IDs, aggregate partial evidence, and contain no paths or secrets | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #354 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | controller surface emits no premature completion and exactly one terminal mixed-run notice | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #355 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | notification identity suppresses the same attention but reports changed paths and reasons with identical counts | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #356 | CANCELLED | `phase6-alpha-mixed-plan-isolation.test.js` | startup-resume, local-change, and periodic automatic triggers each own a diagnostic run ID | OBSOLETE-LEGACY-FIXTURE | `OLF-FAKE-AUTH` |
| #391 | FAIL | `phase6-alpha-plan-errors-stability.test.js` | ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #392 | FAIL | `phase6-alpha-plan-errors-stability.test.js` | exhausted edit instability is isolated into the CSV while an independent safe upload commits | OBSOLETE-LEGACY-FIXTURE | `OLF-PHYSICAL` |
| #557 | FAIL | `adversarial-model/adversarial-model.test.js` | 03 upload survives crash/restart at every durable effect stage | WORKER-DEFECT | `G-W1` |
| #558 | FAIL | `adversarial-model/adversarial-model.test.js` | 04 download survives crash/restart at every durable effect stage | WORKER-DEFECT | `G-W1` |
| #559 | FAIL | `adversarial-model/adversarial-model.test.js` | 05 move survives crash/restart at every durable effect stage | WORKER-DEFECT | `G-W1` |
| #560 | FAIL | `adversarial-model/adversarial-model.test.js` | 06 trash survives crash/restart at every durable effect stage | WORKER-DEFECT | `G-W1` |
| #564 | FAIL | `adversarial-model/adversarial-model.test.js` | 10 durable intended L1 is not substituted by later L2 | WORKER-DEFECT | `G-W1` |
| #569 | FAIL | `adversarial-model/adversarial-model.test.js` | 15 repeated moves preserve stable remote identity | WORKER-DEFECT | `G-W1` |
| #570 | FAIL | `adversarial-model/adversarial-model.test.js` | 16 create-delete sequence preserves acknowledged deletion history | WORKER-DEFECT | `G-W1` |
| #572 | FAIL | `adversarial-model/adversarial-model.test.js` | 18 unresolved path A does not block safe path B progress | WORKER-DEFECT | `G-W1` |
| #573 | FAIL | `adversarial-model/adversarial-model.test.js` | 19 missed watcher is discovered by integrity reconciliation | WORKER-DEFECT | `G-W1` |
| #574 | FAIL | `adversarial-model/adversarial-model.test.js` | 20 Windows watcher-event loss is recoverable through authoritative integrity read | WORKER-DEFECT | `G-W1` |
| #582 | FAIL | `adversarial-model/adversarial-model.test.js` | 28 bounded quiescence after mutation pressure stops | WORKER-DEFECT | `G-W1` |
| #583 | FAIL | `adversarial-model/adversarial-model.test.js` | 29 concurrent same-path creates never silently select one remote winner | WORKER-DEFECT | `G-W2` |
| #602 | FAIL | `adversarial-model/adversarial-model.test.js` | G-C2 generic recover routes multiple folder journals by exact journal identity | WORKER-DEFECT | `G-W3` |

### Ledger totals / no-silent-waiver audit

The table accounts for every raw non-pass result:

- `OBSOLETE-LEGACY-FIXTURE`: **59 total** = 34 FAIL + 25 CANCELLED.
  - `OLF-STATIC`: 1 FAIL.
  - `OLF-PHYSICAL`: 24 FAIL + 8 CANCELLED.
  - `OLF-FAKE-AUTH`: 9 FAIL + 17 CANCELLED.
- `WORKER-DEFECT` (owner G): **13 FAIL**.
  - `G-W1`: 11 FAIL.
  - `G-W2`: 1 FAIL.
  - `G-W3`: 1 FAIL.
- `H-INTEGRATION-DEFECT`: **0**.
- `UNRELATED-PREEXISTING`: **0**.

Total accounted: **47 FAIL + 25 CANCELLED = 72 non-pass results**.

The cancellation clusters are not silently waived. They are listed individually above. In the affected files, the first async test waits for a legacy execution/mutation callback that hardened fail-closed authority prevents; Node then reports that test and/or later same-file registrations as `cancelledByParent` with `Promise resolution is still pending but the event loop has already resolved`.

### Focused localization / worker integrity

- D's integrated aggregate remains 86/86 PASS from H-U3, including D-C13 7/7.
- H integration remains 9/9 PASS in this H-U4 raw run.
- G source provenance was checked directly:
  - `test/adversarial-model/adversarial-model.test.ts` current blob equals approved G authority blob.
  - `test/adversarial-model/support/model.ts` current blob equals approved G authority blob.
- No non-G failure occurs in an H integration test or current D authority suite. The non-G failures are confined to obsolete controller/test constructions described above.
- A/B/C/D/E/F focused behavior needed for localization is already exercised in the ordinary full run and H/D top-level shims; no redundant second source state was created.

### Frozen boundary / repository safety

At H-U4 entry/evaluated head `f1b3cc37f3be3cb18fbd4ea6a554a02d56a0d66c`:

- root `src` tree: `442cf1b6a07386d6ae806b9b6123e0a621476243`;
- `src/contracts/**` tree: `4deb82e382f7957c731ef78db52b4164571d57a3`;
- frozen foundation contract tree: `4deb82e382f7957c731ef78db52b4164571d57a3`.

Therefore frozen contracts remain byte-identical. H-U4 made no source/test repair, no contract change, and no merge.

Canonical `dev/evidence/_ca-output.md` remains protected and was not modified.

### Recommendation for H-U5 / supervisor routing

There is **no H production integration repair to perform**.

Before or in parallel with H-U5, supervisor should route the three G-owned defect packages back to G, not H:
1. `G-W1`: transition/settle/quiescence model repair covering G #557–560, #564, #569–570, #572–574, #582.
2. `G-W2`: concurrent same-path create ambiguity preservation, G #583.
3. `G-W3`: exact multi-folder-journal generic recovery routing, G #602.

These should remain separate causal packages unless G inspection proves a single shared cause.

Recommended **H-U5** is a bounded obsolete-fixture modernization wave for the foundational `OLF-PHYSICAL` constructor family only:
- `test/phase5-controller.test.ts`
- `test/phase5-group-a-recovery-state.test.ts`
- `test/phase5-group-b-scope-transfer.test.ts`

Scope: replace only their obsolete controller/executor construction with the already-approved writable C/H authority and A/B recoverable mutation test seams, preserve all existing behavioral assertions, and rerun only these fixtures plus H-I1–H-I8. This package covers 8 current failures, shares one root cause, and is sized for one model turn. Do **not** combine G repair, `OLF-FAKE-AUTH`, the larger Phase5 D fixture wave, or the static acceptance-map literal in that same H-U5 turn.

Subsequent fixture modernization should be separately batched by the evidence keys above after H-U5.

### H-U4 disposition

- Complete verification surface executed on clean H-U3 completion state.
- Raw test/check truth inspected directly rather than trusting tee-masked workflow status.
- Every failure and cancellation classified.
- H integration defect count: zero.
- Worker defect owner identified: G only.
- No repairs performed.
- H-U5 not started.
