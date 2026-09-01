# Phase 6 Parallel Implementation Agent Spin-Up and Tasking Prompts

## Prompt A — Remote / Google Drive Protocol

### 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-REMOTE-01`

You are the **Remote / Google Drive Protocol implementation agent** for the Phase 6 synchronization hardening parallel wave.

Execute only the assignment in this prompt. If your actual session/agent identity does not match `agt-CA-P6-SYNC-REMOTE-01`, stop and report the identity mismatch rather than selecting a different assignment.

### 2. Governing Stage 2A Authority and Re-Entry

This is a **Stage 2A controlled parallel construction session** under the current repository copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`.

The independent supervisor has completed the foundation review and explicitly approved the following exact repository state as the common parallel-workstream base:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch containing that state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`

This later supervisor approval supersedes only stale candidate-status wording in repository planning artifacts that says parallel implementation is not yet authorized. It does **not** supersede or weaken any architecture, contract, ownership, safety, or non-goal established by those artifacts.

Apply especially:

- Human Product Authority;
- Agent Engineering Authority;
- Minimum Necessary Specification;
- Evidence-Based Completion;
- Repository Grounding;
- No Unnecessary Restart;
- Entry-State Rule;
- Stage 2A Controlled Build Loop;
- Stage 2A Build Prompt Design Standard;
- Phase Completion Gate;
- Stage 2A Between Build Sessions;
- Re-Entering During Construction.

Do not restart Stage 0 or Stage 1. Do not redesign the approved synchronization architecture. Resume from the actual approved repository state.

Before modifying code, read completely and reconcile against the actual repository:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. every frozen `src/contracts/**` file directly relevant to this workstream
16. every production file and existing test assigned to this workstream.

Record manual re-ingestion evidence in your dedicated workstream evidence file. Derive it from the current branch copy rather than copying historical values. Record at minimum the manual title, first substantive sentence, last sentence, heading counts by level, complete H2 sequence, and embedded Stage 0/1/2A/2B/3 prompt headings.

Repository facts discovered during this re-entry govern implementation mechanics. Higher-authority target behavior and the frozen foundation govern required semantics.

### 3. Repository and Branch Control

Work only on your assigned isolated branch.

Before modification:

- fetch current repository refs;
- confirm the approved base commit exists;
- confirm the working tree is clean;
- create or check out your assigned branch directly from the exact approved workstream-base SHA;
- verify the branch starting `HEAD` is exactly the approved SHA before the first workstream commit.

Do not substitute the latest `phase6-sync-architecture-foundation`, `phase6-integration`, `master`, another worker branch, or another SHA for the approved base.

Do not rebase onto or cherry-pick from another parallel worker during this wave.

If your assigned branch already exists and contains work not derived solely from the approved base, do not overwrite, reset, force-push, or adopt it silently. Stop and report the discrepancy.

You may push only your assigned branch. You may not merge it.

Your assigned branch is:

`phase6-sync-remote`

Your dedicated evidence file is:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-REMOTE-01.md`

Do not modify the cumulative `dev/evidence/_ca-output.md` during this parallel wave. It is predecessor/integration context only. Your dedicated evidence file is the sole workstream evidence artifact you may create or update.

### 4. Objective

Implement the complete remote/Google Drive synchronization protocol behind the approved frozen contracts: lossless Changes ingestion, explicit path/object ambiguity, retry-safe identity allocation, preservation-safe content mutation, recovery-safe move/trash, coherent downloads, and side-effect-free observation/migration behavior.

### 5. Verified Current State Relevant to This Workstream

- The current `GoogleDriveAdapter` implements the legacy `GoogleDrivePort` and still contains raw synchronization mutations that predate the frozen reliable mutation seam.
- The current `readChanges()` fetches one Drive Changes page and collapses `nextPageToken` and `newStartPageToken` into one legacy next cursor, so it does not yet implement the frozen intermediate-versus-terminal page semantics.
- Current remote observation/list/change code contains provenance-establishment logic that can mutate remote metadata while learning state; the approved architecture requires ordinary observation to remain side-effect free and provenance migration to be explicit.
- The current upload/update path relies on legacy raw create/update behavior. The approved foundation forbids treating in-place check-then-update as conflict-free authority when an intervening remote version could have existed.
- The frozen contracts already define `ReliableRemoteChangePort`, `ReliableRemoteMutationPort`, `RemoteMutationIdentity`, exact intended canonical content, explicit mutation outcomes, application proof, path-convergence authority, coherent remote reads, and fault/cancellation seams.

The approved foundation deliberately established contracts and seams without completing this workstream. Do not mistake a contract type or foundation test for completed production behavior.

### 6. Frozen Cross-Workstream Rules

The following are fixed for every parallel worker:

- `src/contracts/**` is frozen and MUST NOT be modified.
- Do not create branch-local copies, semantic shadows, substitute interfaces, or incompatible sidecar contracts.
- The mutation lifecycle is fixed as: `PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Persistence revision and semantic synchronization authority remain distinct.
- Unknown, unreadable, inaccessible, incomplete, ambiguous, or outcome-unknown states may not be promoted into authoritative absence, deletion, ordinary success, or ordinary convergence.
- File BASE/common authority requires the frozen canonical proof semantics.
- Physical remote application proof and logical path-convergence authority are distinct.
- Every dispatched mutation must remain restart-safe if the process dies at any awaited boundary.
- Cancellation is cooperative control, not a substitute for crash durability.
- Windows and iOS are distinct supported environments; no desktop-only assumption may enter shared/mobile code.
- Device timestamps are advisory and never synchronization winner authority.
- No new synchronization path may route around the frozen safe mutation/execution seams merely because a legacy compatibility interface still exists.

Workstream-local fakes or adapters may be created only in your permitted new-test namespace unless a production adapter belongs to your exclusive production ownership.

`src/testing/fakes.ts`, integration-owned tests, foundation planning artifacts, and other workers' files are prohibited unless this prompt explicitly says otherwise.

### 7. Exclusive Ownership and Scope

#### Production files you may modify

- `src/drive/google-drive-port.ts`
- `src/drive/transport.ts`
- `src/drive/runtime.ts`
- `src/drive/obsidian-http.ts`
- `src/drive/index.ts`

#### Existing tests you may modify

- `test/phase3-changes.test.ts`
- `test/phase3-drive.test.ts`
- `test/phase3-transport.test.ts`
- `test/phase5-group-b-drive-domain.test.ts`

#### New tests/support you may create

- `test/workstreams/drive/**`

#### Prohibited scope

You MUST NOT modify:

- any production file outside the production ownership list above;
- any existing test outside the existing-test ownership list above;
- any `src/contracts/**` file;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another workstream's dedicated evidence;
- release, workflow, version, Azure, OAuth-return, or protected-branch material unless explicitly listed in your ownership above.

If a necessary change appears to belong elsewhere, record an integration dependency or contract-change request rather than crossing ownership.

### 8. Frozen Inputs and Required End State

#### Frozen inputs

- `RemoteChangeProtocolPage`, `ReliableRemoteChangePort`, `DurableRemoteChangeBatch`, and checkpoint semantics.
- `RemoteMutationIdentity`, `CanonicalFileContentProof`, `RemoteMutationOutcome`, `RemoteMutationApplicationProof`, `RemotePathConvergenceAuthority`, and `ReliableRemoteMutationPort`.
- `CoherentRemoteReadPort` and frozen transfer/fault/cancellation semantics.
- Existing Google/OAuth contracts and the `drive.file` scope boundary.
- Remote identity is stable and distinct from logical path; duplicate logical paths must remain explicit.

#### Required end state

- All Drive Changes pages are consumed until a terminal `newStartPageToken` is reached; intermediate `nextPageToken` is never misclassified as the next durable start token.
- Remote observations/listing/change reads are side-effect free. Legacy/provenance migration is surfaced and executed only through an explicit idempotent migration path within this workstream's ownership.
- Creates use durable reserved Drive identity so a lost response/retry reconciles the same object rather than creating a duplicate.
- File-content create/update binds exact intended SHA-256 plus byte size before dispatch and verifies that exact version after ambiguous outcomes.
- Existing-object content update follows the approved immutable-candidate-preservation protocol and never uses raw in-place update as synchronization authority.
- Remote move and trash are implemented behind `ReliableRemoteMutationPort` with explicit `verified-effect`, `verified-not-applied`, `conflict-preserved`, or `outcome-unknown` classification.
- Raw `GoogleDrivePort.create/update/move/trash` remain transport compatibility primitives only and are not exposed as authoritative results to the new synchronization path.
- Coherent downloads either prove one expected object/revision/content evidence through the complete transfer or fail closed as changed/unknown.
- Duplicate same-path Drive objects are preserved as multiple candidates; no path-to-single-object collapse is permitted at this boundary.
- Transient/rate/auth/offline handling remains bounded and preserves ambiguous mutation outcomes rather than blindly retrying non-idempotent work.

### 9. Required Behavior and Semantics

- Use current official Google Drive documentation when transport/API semantics are material. Do not infer an atomic Drive content CAS unless current Drive-specific documentation explicitly supports it.
- Treat generated IDs, Changes pagination, resumable-upload recovery, revision information, and immutable candidate objects as protocol primitives only to the extent supported by official semantics.
- Preserve `drive.file` least-privilege behavior and existing pairing/auth boundaries.
- Do not make correctness depend on Drive revision history or trash retention.
- Observation may report that explicit migration is needed, but ordinary observation itself must not perform a write.

#### Implementation discretion

- Private helper decomposition inside the owned `src/drive/**` files.
- Exact internal transport/retry helper structure, provided idempotency and ambiguity semantics remain frozen.
- How explicit provenance migration is factored within owned files.
- How pagination iteration is structured internally.
- How candidate-preservation bookkeeping is implemented behind the frozen public contracts.

Do not convert implementation discretion into permission to change a frozen semantic outcome.

#### Dependencies and Parallel-Safety Boundary

This workstream has no production dependency on another parallel branch. State/orchestration behavior needed for focused tests must be represented only by fakes/adapters under `test/workstreams/drive/**`. Workstream C will later persist the remote identities/batches/effects; Workstream D will later consume the reliable remote ports. Do not implement their responsibilities here.

Your branch must remain independently typecheck/build-capable against the approved foundation. Do not wait for another worker's production branch in order to make your own code compile. Use only frozen interfaces and workstream-local test fakes where dependencies are not yet integrated.

### 10. Contract Change Rule

If you discover that an acceptance criterion is genuinely impossible to implement using the frozen contract surface, do not edit or shadow the contract.

Record a `CONTRACT CHANGE REQUEST` in your dedicated evidence and stop before making the prohibited change.

The request must contain:

- affected frozen contract/type;
- exact observed limitation;
- assigned requirement or acceptance criterion blocked;
- repository evidence proving no conforming implementation is available;
- minimum contract capability required;
- proposed semantic change, without unnecessary private implementation detail;
- other workstreams affected;
- integration consequences.

Ordinary implementation difficulty, preference for a cleaner API, or desire to refactor is not a contract gap.

### 11. Verification and Completion Gate

Before claiming completion:

- run the workstream-owned existing tests;
- run every new workstream test;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run any current repository package/mobile verifier required by the Phase 6 evidence and applicable to your changes;
- inspect the complete diff from the approved base SHA;
- verify no prohibited production or test file was modified;
- verify no frozen contract was modified;
- verify no test was weakened merely to make the implementation pass;
- verify the branch is buildable and testable without another worker branch being merged.

A phase is not complete because the agent states it is complete. The required end state, acceptance criteria, builds, tests, architecture boundaries, and evidence must all be satisfied.

If an unrelated pre-existing test failure appears, prove it is pre-existing against the approved base before qualifying it. Do not simply label failures unrelated.

#### Workstream-Specific Acceptance Evidence

- Drive Changes test with more than one page, including 1001+ synthetic changes, proves only terminal token becomes the next start token.
- Lost-response create test proves one reserved object identity is reused and the exact intended file content is verified before adoption.
- R0 -> independent RI -> writer candidate test proves the writer can be safely materialized without destroying RI and does not manufacture ordinary path-convergence authority.
- No-independent-candidate case proves the remote layer can supply the physical facts needed for later conflict-free convergence.
- Remote move lost-response and remote trash lost-response tests both preserve explicit unknown outcome until verification.
- Exact duplicate logical path candidates remain separate.
- Range/chunk mutation during download cannot produce a coherent-version proof.
- Observation of legacy provenance never performs an implicit PATCH.
- Authentication, rate limit, transient failure, and network-loss cases preserve existing Drive signal taxonomy and bounded retry semantics.
- All owned legacy Drive tests continue to pass or are updated only where the approved contracts intentionally supersede their old assumptions.

### 12. Evidence Requirements

In `dev/evidence/_ca-output-agt-CA-P6-SYNC-REMOTE-01.md`, record:

- agent identity;
- approved base SHA;
- branch name and starting SHA;
- manual ingestion proof;
- authoritative artifacts read;
- relevant current-state findings;
- exact created/modified/deleted files;
- important implementation decisions made within Engineering Discretion;
- every test/build/check command and exact result;
- focused scenario evidence for every workstream-specific acceptance item;
- any pre-existing failures and proof they predate this branch;
- any integration dependency request;
- any contract-change request;
- final branch SHA;
- clean/dirty working-tree status;
- known limitations within scope.

Do not rewrite predecessor evidence and do not claim physical-device validation you did not perform.

### 13. Final Report

Return a concise final report containing:

- agent identity;
- branch;
- approved base SHA;
- final SHA;
- changed-file list;
- required end-state summary;
- focused verification results;
- full verification results;
- unresolved integration dependencies, if any;
- contract-change request status;
- confirmation that frozen/prohibited files were not modified.

End the report with:

`WORKSTREAM A COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

### 14. Hard Stop

After your assigned workstream is implemented, verified, evidenced, and pushed:

- STOP;
- do not merge your branch;
- do not modify `phase6-sync-architecture-foundation`;
- do not modify `phase6-integration`;
- do not modify `master` or `main`;
- do not modify Azure or OAuth production configuration;
- do not tag or release;
- do not perform physical Windows/iPhone synchronization;
- do not begin Stage 3;
- do not take ownership of another workstream;
- do not repair integration defects in files outside your ownership.

The supervisor will independently review each branch and later perform serialized integration/adversarial validation.

## Prompt B — Local Platform Safety — Windows and iOS

### 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-LOCAL-01`

You are the **Local Platform Safety — Windows and iOS implementation agent** for the Phase 6 synchronization hardening parallel wave.

Execute only the assignment in this prompt. If your actual session/agent identity does not match `agt-CA-P6-SYNC-LOCAL-01`, stop and report the identity mismatch rather than selecting a different assignment.

### 2. Governing Stage 2A Authority and Re-Entry

This is a **Stage 2A controlled parallel construction session** under the current repository copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`.

The independent supervisor has completed the foundation review and explicitly approved the following exact repository state as the common parallel-workstream base:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch containing that state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`

This later supervisor approval supersedes only stale candidate-status wording in repository planning artifacts that says parallel implementation is not yet authorized. It does **not** supersede or weaken any architecture, contract, ownership, safety, or non-goal established by those artifacts.

Apply especially:

- Human Product Authority;
- Agent Engineering Authority;
- Minimum Necessary Specification;
- Evidence-Based Completion;
- Repository Grounding;
- No Unnecessary Restart;
- Entry-State Rule;
- Stage 2A Controlled Build Loop;
- Stage 2A Build Prompt Design Standard;
- Phase Completion Gate;
- Stage 2A Between Build Sessions;
- Re-Entering During Construction.

Do not restart Stage 0 or Stage 1. Do not redesign the approved synchronization architecture. Resume from the actual approved repository state.

Before modifying code, read completely and reconcile against the actual repository:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. every frozen `src/contracts/**` file directly relevant to this workstream
16. every production file and existing test assigned to this workstream.

Record manual re-ingestion evidence in your dedicated workstream evidence file. Derive it from the current branch copy rather than copying historical values. Record at minimum the manual title, first substantive sentence, last sentence, heading counts by level, complete H2 sequence, and embedded Stage 0/1/2A/2B/3 prompt headings.

Repository facts discovered during this re-entry govern implementation mechanics. Higher-authority target behavior and the frozen foundation govern required semantics.

### 3. Repository and Branch Control

Work only on your assigned isolated branch.

Before modification:

- fetch current repository refs;
- confirm the approved base commit exists;
- confirm the working tree is clean;
- create or check out your assigned branch directly from the exact approved workstream-base SHA;
- verify the branch starting `HEAD` is exactly the approved SHA before the first workstream commit.

Do not substitute the latest `phase6-sync-architecture-foundation`, `phase6-integration`, `master`, another worker branch, or another SHA for the approved base.

Do not rebase onto or cherry-pick from another parallel worker during this wave.

If your assigned branch already exists and contains work not derived solely from the approved base, do not overwrite, reset, force-push, or adopt it silently. Stop and report the discrepancy.

You may push only your assigned branch. You may not merge it.

Your assigned branch is:

`phase6-sync-local`

Your dedicated evidence file is:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-LOCAL-01.md`

Do not modify the cumulative `dev/evidence/_ca-output.md` during this parallel wave. It is predecessor/integration context only. Your dedicated evidence file is the sole workstream evidence artifact you may create or update.

### 4. Objective

Implement truthful and crash-safe LOCAL behavior for both Windows desktop Obsidian and iOS Obsidian: coherent observation, durable create/replace semantics, exact mutation provenance, cache-bypassing integrity reconciliation, and event handling that never promotes watcher hints into deletion authority.

### 5. Verified Current State Relevant to This Workstream

- `CanonicalEvidenceLocalVault` currently caches canonical SHA-256 by opaque observation token; if bytes change while size/mtime/token remain unchanged and the watcher misses the event, the fast path can reuse stale canonical evidence.
- The approved foundation therefore freezes `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()` as an authoritative byte-read seam that must bypass metadata/token cache reuse.
- Current local mutation APIs predate the final durable transaction authority model. The approved foundation requires explicit create-versus-replace pre-state, canonical old/new evidence, durable stage/backup/swap recovery, and exact self-mutation provenance.
- Windows and iOS must remain supported through their existing platform boundaries. No Node/Electron/PowerShell-only assumption may leak into the mobile path.
- Filesystem/vault events are hints. They may trigger reconciliation but cannot by themselves prove absence or authorize deletion.

The approved foundation deliberately established contracts and seams without completing this workstream. Do not mistake a contract type or foundation test for completed production behavior.

### 6. Frozen Cross-Workstream Rules

The following are fixed for every parallel worker:

- `src/contracts/**` is frozen and MUST NOT be modified.
- Do not create branch-local copies, semantic shadows, substitute interfaces, or incompatible sidecar contracts.
- The mutation lifecycle is fixed as: `PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Persistence revision and semantic synchronization authority remain distinct.
- Unknown, unreadable, inaccessible, incomplete, ambiguous, or outcome-unknown states may not be promoted into authoritative absence, deletion, ordinary success, or ordinary convergence.
- File BASE/common authority requires the frozen canonical proof semantics.
- Physical remote application proof and logical path-convergence authority are distinct.
- Every dispatched mutation must remain restart-safe if the process dies at any awaited boundary.
- Cancellation is cooperative control, not a substitute for crash durability.
- Windows and iOS are distinct supported environments; no desktop-only assumption may enter shared/mobile code.
- Device timestamps are advisory and never synchronization winner authority.
- No new synchronization path may route around the frozen safe mutation/execution seams merely because a legacy compatibility interface still exists.

Workstream-local fakes or adapters may be created only in your permitted new-test namespace unless a production adapter belongs to your exclusive production ownership.

`src/testing/fakes.ts`, integration-owned tests, foundation planning artifacts, and other workers' files are prohibited unless this prompt explicitly says otherwise.

### 7. Exclusive Ownership and Scope

#### Production files you may modify

- `src/local/config-policy.ts`
- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`
- `src/local/exclusions.ts`
- `src/local/local-vault-access-boundary.ts`
- `src/local/mobile-vault-access-boundary.ts`
- `src/local/obsidian-local-vault.ts`
- `src/local/path-policy.ts`
- `src/product/canonical-local-vault.ts`

#### Existing tests you may modify

- `test/desktop-bounded-local-read.test.ts`
- `test/desktop-external-reference-guard.test.ts`
- `test/local-failure-semantics.test.ts`
- `test/local-policy.test.ts`
- `test/mobile-safety.test.ts`
- `test/obsidian-local-vault.test.ts`
- `test/phase6-a-local-hardening.test.ts`
- `test/phase6-alpha-ios-adapter-boundary.test.ts`
- `test/phase6-alpha-ios-content-reader.test.ts`
- `test/phase6-alpha-portable-collision.test.ts`

#### New tests/support you may create

- `test/workstreams/local/**`

#### Prohibited scope

You MUST NOT modify:

- any production file outside the production ownership list above;
- any existing test outside the existing-test ownership list above;
- any `src/contracts/**` file;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another workstream's dedicated evidence;
- release, workflow, version, Azure, OAuth-return, or protected-branch material unless explicitly listed in your ownership above.

If a necessary change appears to belong elsewhere, record an integration dependency or contract-change request rather than crossing ownership.

### 8. Frozen Inputs and Required End State

#### Frozen inputs

- `LocalMutationTransaction`, expected target pre-state, canonical new/old content evidence, local mutation provenance, and frozen local swap fault points.
- `LocalIntegrityReconciliationPort`.
- `LocalVaultPort`, local access-boundary/path-policy/configuration contracts.
- Lifecycle/cancellation contracts insofar as LOCAL must stop/return safely when called under lifecycle control.
- Cross-platform path normalization/collision/exclusion rules already established by the target system.

#### Required end state

- File create requires authoritative expected absence; file replace requires exact expected presence with observation token and canonical old content.
- New bytes are staged and canonical-evidence verified before a valid target is displaced.
- Every hard-death boundary in local replacement leaves an old valid target, a verified new target, or explicit durable/recoverable contradiction; no hidden backup may be misread as authoritative deletion.
- `readFileBypassingEvidenceCache()` re-reads actual file bytes and computes authoritative evidence without accepting the ordinary metadata/token cache hit.
- Verify/Reconcile and policy-selected integrity opportunities can discover a same-size, same-mtime H0->H1 change even when no watcher event arrived and the cached observation token is unchanged.
- Plugin-generated local mutation events are correlated by exact transaction/result provenance, not timing windows; a concurrent user edit remains observable.
- Windows event loss/overflow and delayed/missing iOS events recover through authoritative enumeration/reconciliation rather than event-derived absence.
- Path compatibility, Unicode/case-collision, exclusions, portable configuration, bounded read, and external-reference safeguards remain intact.
- iOS uses Obsidian/mobile-safe APIs and does not assume background execution.

### 9. Required Behavior and Semantics

- Never infer deletion from a watcher event or from an incomplete/unknown enumeration.
- Never acknowledge a staged local write before canonical verification.
- Never let cleanup of stage/backup artifacts become correctness-critical; restart recovery must tolerate process death before cleanup.
- Exact self-mutation suppression may suppress only the matching known plugin result.
- Cache-bypass integrity reads are authoritative integrity operations, not the ordinary fast path for every observation.

#### Implementation discretion

- Private local transaction helper structure and temporary-file naming, provided the frozen recovery semantics are maintained.
- Exact cache structure and invalidation mechanics.
- How desktop and mobile access-boundary implementations share code while preserving platform constraints.
- How transaction provenance is represented internally behind frozen public types.

Do not convert implementation discretion into permission to change a frozen semantic outcome.

#### Dependencies and Parallel-Safety Boundary

This workstream has no production dependency on another worker branch. Use workstream-local fakes under `test/workstreams/local/**` when state/orchestration behavior is needed. Workstream C will later persist transaction/effect authority and Workstream E will later schedule integrity opportunities; do not modify their files.

Your branch must remain independently typecheck/build-capable against the approved foundation. Do not wait for another worker's production branch in order to make your own code compile. Use only frozen interfaces and workstream-local test fakes where dependencies are not yet integrated.

### 10. Contract Change Rule

If you discover that an acceptance criterion is genuinely impossible to implement using the frozen contract surface, do not edit or shadow the contract.

Record a `CONTRACT CHANGE REQUEST` in your dedicated evidence and stop before making the prohibited change.

The request must contain:

- affected frozen contract/type;
- exact observed limitation;
- assigned requirement or acceptance criterion blocked;
- repository evidence proving no conforming implementation is available;
- minimum contract capability required;
- proposed semantic change, without unnecessary private implementation detail;
- other workstreams affected;
- integration consequences.

Ordinary implementation difficulty, preference for a cleaner API, or desire to refactor is not a contract gap.

### 11. Verification and Completion Gate

Before claiming completion:

- run the workstream-owned existing tests;
- run every new workstream test;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run any current repository package/mobile verifier required by the Phase 6 evidence and applicable to your changes;
- inspect the complete diff from the approved base SHA;
- verify no prohibited production or test file was modified;
- verify no frozen contract was modified;
- verify no test was weakened merely to make the implementation pass;
- verify the branch is buildable and testable without another worker branch being merged.

A phase is not complete because the agent states it is complete. The required end state, acceptance criteria, builds, tests, architecture boundaries, and evidence must all be satisfied.

If an unrelated pre-existing test failure appears, prove it is pre-existing against the approved base before qualifying it. Do not simply label failures unrelated.

#### Workstream-Specific Acceptance Evidence

- Create recovery matrix covers death before stage, after stage write, after stage verification, after backup establishment where applicable, after swap, and before cleanup.
- Replace recovery matrix proves missing expected backup is a contradiction rather than silently treated as a create.
- Corrupt/truncated staged download is rejected before target displacement.
- Same-size/same-mtime, missed-watcher, unchanged-token test proves ordinary cache may be stale temporarily but authoritative cache-bypass reconciliation discovers H1.
- Self-generated event plus overlapping user edit proves only the exact plugin effect can be coalesced.
- Windows bounded-read and external-reference tests remain valid.
- iOS adapter/content-reader/mobile-safety suites remain valid.
- Enumeration/read failures remain path-local where appropriate and never contaminate unrelated paths with another path's absence reason.

### 12. Evidence Requirements

In `dev/evidence/_ca-output-agt-CA-P6-SYNC-LOCAL-01.md`, record:

- agent identity;
- approved base SHA;
- branch name and starting SHA;
- manual ingestion proof;
- authoritative artifacts read;
- relevant current-state findings;
- exact created/modified/deleted files;
- important implementation decisions made within Engineering Discretion;
- every test/build/check command and exact result;
- focused scenario evidence for every workstream-specific acceptance item;
- any pre-existing failures and proof they predate this branch;
- any integration dependency request;
- any contract-change request;
- final branch SHA;
- clean/dirty working-tree status;
- known limitations within scope.

Do not rewrite predecessor evidence and do not claim physical-device validation you did not perform.

### 13. Final Report

Return a concise final report containing:

- agent identity;
- branch;
- approved base SHA;
- final SHA;
- changed-file list;
- required end-state summary;
- focused verification results;
- full verification results;
- unresolved integration dependencies, if any;
- contract-change request status;
- confirmation that frozen/prohibited files were not modified.

End the report with:

`WORKSTREAM B COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

### 14. Hard Stop

After your assigned workstream is implemented, verified, evidenced, and pushed:

- STOP;
- do not merge your branch;
- do not modify `phase6-sync-architecture-foundation`;
- do not modify `phase6-integration`;
- do not modify `master` or `main`;
- do not modify Azure or OAuth production configuration;
- do not tag or release;
- do not perform physical Windows/iPhone synchronization;
- do not begin Stage 3;
- do not take ownership of another workstream;
- do not repair integration defects in files outside your ownership.

The supervisor will independently review each branch and later perform serialized integration/adversarial validation.

## Prompt C — State / BASE / Recovery

### 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-STATE-01`

You are the **State / BASE / Recovery implementation agent** for the Phase 6 synchronization hardening parallel wave.

Execute only the assignment in this prompt. If your actual session/agent identity does not match `agt-CA-P6-SYNC-STATE-01`, stop and report the identity mismatch rather than selecting a different assignment.

### 2. Governing Stage 2A Authority and Re-Entry

This is a **Stage 2A controlled parallel construction session** under the current repository copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`.

The independent supervisor has completed the foundation review and explicitly approved the following exact repository state as the common parallel-workstream base:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch containing that state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`

This later supervisor approval supersedes only stale candidate-status wording in repository planning artifacts that says parallel implementation is not yet authorized. It does **not** supersede or weaken any architecture, contract, ownership, safety, or non-goal established by those artifacts.

Apply especially:

- Human Product Authority;
- Agent Engineering Authority;
- Minimum Necessary Specification;
- Evidence-Based Completion;
- Repository Grounding;
- No Unnecessary Restart;
- Entry-State Rule;
- Stage 2A Controlled Build Loop;
- Stage 2A Build Prompt Design Standard;
- Phase Completion Gate;
- Stage 2A Between Build Sessions;
- Re-Entering During Construction.

Do not restart Stage 0 or Stage 1. Do not redesign the approved synchronization architecture. Resume from the actual approved repository state.

Before modifying code, read completely and reconcile against the actual repository:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. every frozen `src/contracts/**` file directly relevant to this workstream
16. every production file and existing test assigned to this workstream.

Record manual re-ingestion evidence in your dedicated workstream evidence file. Derive it from the current branch copy rather than copying historical values. Record at minimum the manual title, first substantive sentence, last sentence, heading counts by level, complete H2 sequence, and embedded Stage 0/1/2A/2B/3 prompt headings.

Repository facts discovered during this re-entry govern implementation mechanics. Higher-authority target behavior and the frozen foundation govern required semantics.

### 3. Repository and Branch Control

Work only on your assigned isolated branch.

Before modification:

- fetch current repository refs;
- confirm the approved base commit exists;
- confirm the working tree is clean;
- create or check out your assigned branch directly from the exact approved workstream-base SHA;
- verify the branch starting `HEAD` is exactly the approved SHA before the first workstream commit.

Do not substitute the latest `phase6-sync-architecture-foundation`, `phase6-integration`, `master`, another worker branch, or another SHA for the approved base.

Do not rebase onto or cherry-pick from another parallel worker during this wave.

If your assigned branch already exists and contains work not derived solely from the approved base, do not overwrite, reset, force-push, or adopt it silently. Stop and report the discrepancy.

You may push only your assigned branch. You may not merge it.

Your assigned branch is:

`phase6-sync-state`

Your dedicated evidence file is:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-STATE-01.md`

Do not modify the cumulative `dev/evidence/_ca-output.md` during this parallel wave. It is predecessor/integration context only. Your dedicated evidence file is the sole workstream evidence artifact you may create or update.

### 4. Objective

Implement the durable synchronization authority layer: semantic generation, exact BASE/common transitions, lossless learned-remote backlog, per-effect mutation journaling and restart recovery, semantic state validation/migration, and real stale-device authority transitions.

### 5. Verified Current State Relevant to This Workstream

- The current persistent state store predates the approved foundation and primarily persists legacy `TrustedSynchronizationState` with shallow structural validation and a persistence revision.
- The approved foundation separates persistence CAS/revision from semantic synchronization generation and introduces exact BASE/common proof, durable learned batches, per-effect mutation intents, explicit dispatch stages, restart directives, semantic validation, and stale-device authority.
- Current correctness must not be inferred from the presence of foundation contract types alone; this workstream is responsible for making those semantics durable.
- State is the sole durable authority implementation for the parallel architecture. Other workers may produce observations/results, but they may not create alternate persistence authority.

The approved foundation deliberately established contracts and seams without completing this workstream. Do not mistake a contract type or foundation test for completed production behavior.

### 6. Frozen Cross-Workstream Rules

The following are fixed for every parallel worker:

- `src/contracts/**` is frozen and MUST NOT be modified.
- Do not create branch-local copies, semantic shadows, substitute interfaces, or incompatible sidecar contracts.
- The mutation lifecycle is fixed as: `PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Persistence revision and semantic synchronization authority remain distinct.
- Unknown, unreadable, inaccessible, incomplete, ambiguous, or outcome-unknown states may not be promoted into authoritative absence, deletion, ordinary success, or ordinary convergence.
- File BASE/common authority requires the frozen canonical proof semantics.
- Physical remote application proof and logical path-convergence authority are distinct.
- Every dispatched mutation must remain restart-safe if the process dies at any awaited boundary.
- Cancellation is cooperative control, not a substitute for crash durability.
- Windows and iOS are distinct supported environments; no desktop-only assumption may enter shared/mobile code.
- Device timestamps are advisory and never synchronization winner authority.
- No new synchronization path may route around the frozen safe mutation/execution seams merely because a legacy compatibility interface still exists.

Workstream-local fakes or adapters may be created only in your permitted new-test namespace unless a production adapter belongs to your exclusive production ownership.

`src/testing/fakes.ts`, integration-owned tests, foundation planning artifacts, and other workers' files are prohibited unless this prompt explicitly says otherwise.

### 7. Exclusive Ownership and Scope

#### Production files you may modify

- `src/state/indexeddb-state-storage.ts`
- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `src/core/commit-coordinator.ts`

#### Existing tests you may modify

- `test/phase2-state.test.ts`
- `test/phase2-state-hardening.test.ts`
- `test/phase2-safety-policy.test.ts`
- `test/phase5-group-a-recovery-state.test.ts`
- `test/phase6-b-crash-state.test.ts`

#### New tests/support you may create

- `test/workstreams/state/**`

#### Prohibited scope

You MUST NOT modify:

- any production file outside the production ownership list above;
- any existing test outside the existing-test ownership list above;
- any `src/contracts/**` file;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another workstream's dedicated evidence;
- release, workflow, version, Azure, OAuth-return, or protected-branch material unless explicitly listed in your ownership above.

If a necessary change appears to belong elsewhere, record an integration dependency or contract-change request rather than crossing ownership.

### 8. Frozen Inputs and Required End State

#### Frozen inputs

- `PersistenceRevision` versus `SemanticStateGeneration`.
- `ExactBaseAuthority`, `CommonStateProof`, and `AuthoritativeBaseTransition`.
- `DurableRemoteChangeBatch`, remote-ingestion checkpoint/backlog, and path-convergence state.
- `RecoverablePhysicalMutationDescriptor`, `RecoverableMutationEffect`, `RecoverableOperationIntent`, and `RestartRecoveryDirective`.
- `LocalMutationTransaction` and exact intended canonical content.
- `SemanticStateValidator` including fail-closed extensibility.
- Existing state-store contracts, vault/device identity, tombstone/mapping/device semantics.

#### Required end state

- Persistence-only journal/CAS writes do not advance semantic synchronization authority.
- Semantic generation advances only when authoritative synchronization facts change.
- File BASE healing is committed only from the frozen current canonical common-state proof; structural/absence proofs remain distinct.
- Multiple learned Drive batches remain durably representable while earlier paths are unresolved; a later batch cannot erase the only fact needed to reconcile an earlier removal/move/create-delete/duplicate path.
- Each physical mutation effect persists exact descriptor, intended file content where applicable, exact deletion/identity authority, durable stage, and verification reference.
- `dispatch-authorized` or any later stage is always recovered as 'mutation may have happened'; restart must reconcile physical reality rather than classify it unattempted.
- Clean text merge can persist one physical effect verified/committed while another remains unfinished; logical operation completion requires all required effects and authoritative commit.
- Restart consumes/reconciles pending and uncertain effects before granting new automatic mutation authority.
- Semantic contradictions fail closed, including contradictions not covered by a pre-enumerated specific issue code.
- State migrations are backup/checkpointed and preserve/rebuild the approved authority semantics without silently trusting legacy incomplete data.
- Known-device/stale-device state has real production transitions sufficient to gate destructive authority for long-offline returning devices.

### 9. Required Behavior and Semantics

- Unknown/malformed/inconsistent state enters recovery; it cannot be repaired by assuming current LOCAL or REMOTE is authoritative.
- Remote feed watermark/checkpoint advancement is distinct from per-path convergence.
- Retiring a learned batch is permitted only after every fact needed from that batch has been durably reduced into other authoritative state.
- Operation journal garbage collection may remove only entries whose authoritative effects/state are durably and semantically complete.
- Do not use advisory timestamps to synthesize BASE or stale-device truth.

#### Implementation discretion

- Private storage schema layout and helper decomposition, subject to migration/recovery requirements.
- Exact normalized representation used to reduce learned batches into path/mapping/tombstone state.
- Journal garbage-collection mechanics after safe completion.
- Specific semantic validator helper organization.
- Whether stronger envelope-integrity mechanisms are introduced, provided compatibility/migration and target state-integrity requirements are satisfied.

Do not convert implementation discretion into permission to change a frozen semantic outcome.

#### Dependencies and Parallel-Safety Boundary

This workstream has no production dependency on another parallel branch. Model A/B/D outputs with fixtures or fakes only inside `test/workstreams/state/**`. Do not modify `src/testing/fakes.ts`. D will later orchestrate these state APIs; A will later produce remote protocol results; B will later produce local transaction results.

Your branch must remain independently typecheck/build-capable against the approved foundation. Do not wait for another worker's production branch in order to make your own code compile. Use only frozen interfaces and workstream-local test fakes where dependencies are not yet integrated.

### 10. Contract Change Rule

If you discover that an acceptance criterion is genuinely impossible to implement using the frozen contract surface, do not edit or shadow the contract.

Record a `CONTRACT CHANGE REQUEST` in your dedicated evidence and stop before making the prohibited change.

The request must contain:

- affected frozen contract/type;
- exact observed limitation;
- assigned requirement or acceptance criterion blocked;
- repository evidence proving no conforming implementation is available;
- minimum contract capability required;
- proposed semantic change, without unnecessary private implementation detail;
- other workstreams affected;
- integration consequences.

Ordinary implementation difficulty, preference for a cleaner API, or desire to refactor is not a contract gap.

### 11. Verification and Completion Gate

Before claiming completion:

- run the workstream-owned existing tests;
- run every new workstream test;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run any current repository package/mobile verifier required by the Phase 6 evidence and applicable to your changes;
- inspect the complete diff from the approved base SHA;
- verify no prohibited production or test file was modified;
- verify no frozen contract was modified;
- verify no test was weakened merely to make the implementation pass;
- verify the branch is buildable and testable without another worker branch being merged.

A phase is not complete because the agent states it is complete. The required end state, acceptance criteria, builds, tests, architecture boundaries, and evidence must all be satisfied.

If an unrelated pre-existing test failure appears, prove it is pre-existing against the approved base before qualifying it. Do not simply label failures unrelated.

#### Workstream-Specific Acceptance Evidence

- Property/migration tests prove persistence revision changes alone do not invalidate unchanged semantic authority.
- LOCAL=REMOTE canonical file equality can heal stale BASE only with exact frozen common proof.
- Multi-batch table covers unresolved A plus later batches, removals, repeated moves, create-then-delete, and duplicate path ambiguity without loss.
- Crash/restart matrix covers upload, download, local/remote move, local/remote trash, and multi-effect clean merge at every durable stage.
- Lost response after dispatch never becomes 'definitely not applied'.
- Verified effect before state commit resumes commit without duplicating the mutation.
- Known semantic contradictions and `other-semantic-inconsistency` both fail closed.
- Stale-device registration/aging/clearing transitions are exercised as production state behavior rather than manually injected planner fixtures.
- State migration/recovery preserves backup/CAS safety.

### 12. Evidence Requirements

In `dev/evidence/_ca-output-agt-CA-P6-SYNC-STATE-01.md`, record:

- agent identity;
- approved base SHA;
- branch name and starting SHA;
- manual ingestion proof;
- authoritative artifacts read;
- relevant current-state findings;
- exact created/modified/deleted files;
- important implementation decisions made within Engineering Discretion;
- every test/build/check command and exact result;
- focused scenario evidence for every workstream-specific acceptance item;
- any pre-existing failures and proof they predate this branch;
- any integration dependency request;
- any contract-change request;
- final branch SHA;
- clean/dirty working-tree status;
- known limitations within scope.

Do not rewrite predecessor evidence and do not claim physical-device validation you did not perform.

### 13. Final Report

Return a concise final report containing:

- agent identity;
- branch;
- approved base SHA;
- final SHA;
- changed-file list;
- required end-state summary;
- focused verification results;
- full verification results;
- unresolved integration dependencies, if any;
- contract-change request status;
- confirmation that frozen/prohibited files were not modified.

End the report with:

`WORKSTREAM C COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

### 14. Hard Stop

After your assigned workstream is implemented, verified, evidenced, and pushed:

- STOP;
- do not merge your branch;
- do not modify `phase6-sync-architecture-foundation`;
- do not modify `phase6-integration`;
- do not modify `master` or `main`;
- do not modify Azure or OAuth production configuration;
- do not tag or release;
- do not perform physical Windows/iPhone synchronization;
- do not begin Stage 3;
- do not take ownership of another workstream;
- do not repair integration defects in files outside your ownership.

The supervisor will independently review each branch and later perform serialized integration/adversarial validation.

## Prompt D — Reconciliation / Orchestration

### 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-ORCHESTRATION-01`

You are the **Reconciliation / Orchestration implementation agent** for the Phase 6 synchronization hardening parallel wave.

Execute only the assignment in this prompt. If your actual session/agent identity does not match `agt-CA-P6-SYNC-ORCHESTRATION-01`, stop and report the identity mismatch rather than selecting a different assignment.

### 2. Governing Stage 2A Authority and Re-Entry

This is a **Stage 2A controlled parallel construction session** under the current repository copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`.

The independent supervisor has completed the foundation review and explicitly approved the following exact repository state as the common parallel-workstream base:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch containing that state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`

This later supervisor approval supersedes only stale candidate-status wording in repository planning artifacts that says parallel implementation is not yet authorized. It does **not** supersede or weaken any architecture, contract, ownership, safety, or non-goal established by those artifacts.

Apply especially:

- Human Product Authority;
- Agent Engineering Authority;
- Minimum Necessary Specification;
- Evidence-Based Completion;
- Repository Grounding;
- No Unnecessary Restart;
- Entry-State Rule;
- Stage 2A Controlled Build Loop;
- Stage 2A Build Prompt Design Standard;
- Phase Completion Gate;
- Stage 2A Between Build Sessions;
- Re-Entering During Construction.

Do not restart Stage 0 or Stage 1. Do not redesign the approved synchronization architecture. Resume from the actual approved repository state.

Before modifying code, read completely and reconcile against the actual repository:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. every frozen `src/contracts/**` file directly relevant to this workstream
16. every production file and existing test assigned to this workstream.

Record manual re-ingestion evidence in your dedicated workstream evidence file. Derive it from the current branch copy rather than copying historical values. Record at minimum the manual title, first substantive sentence, last sentence, heading counts by level, complete H2 sequence, and embedded Stage 0/1/2A/2B/3 prompt headings.

Repository facts discovered during this re-entry govern implementation mechanics. Higher-authority target behavior and the frozen foundation govern required semantics.

### 3. Repository and Branch Control

Work only on your assigned isolated branch.

Before modification:

- fetch current repository refs;
- confirm the approved base commit exists;
- confirm the working tree is clean;
- create or check out your assigned branch directly from the exact approved workstream-base SHA;
- verify the branch starting `HEAD` is exactly the approved SHA before the first workstream commit.

Do not substitute the latest `phase6-sync-architecture-foundation`, `phase6-integration`, `master`, another worker branch, or another SHA for the approved base.

Do not rebase onto or cherry-pick from another parallel worker during this wave.

If your assigned branch already exists and contains work not derived solely from the approved base, do not overwrite, reset, force-push, or adopt it silently. Stop and report the discrepancy.

You may push only your assigned branch. You may not merge it.

Your assigned branch is:

`phase6-sync-orchestration`

Your dedicated evidence file is:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-01.md`

Do not modify the cumulative `dev/evidence/_ca-output.md` during this parallel wave. It is predecessor/integration context only. Your dedicated evidence file is the sole workstream evidence artifact you may create or update.

### 4. Objective

Implement the authoritative reconciliation and execution orchestration that consumes the frozen LOCAL/REMOTE/STATE/MERGE seams, converts compatibility planning into exact executable authority, journals physical effects before dispatch, preserves independent path progress, and commits BASE/state only after verified safe outcomes.

### 5. Verified Current State Relevant to This Workstream

- The current `ProductSynchronizationExecutor` still implements the legacy executor path and treats compatibility `base-trusted` as a generic trusted-state load while `identity-unambiguous` is effectively a no-op.
- Current upload/update/move/trash execution still routes through legacy raw `GoogleDrivePort` methods rather than the frozen reliable mutation seam.
- The approved foundation adds `ExecutablePlannedOperation`, exact BASE/identity authority, authority-complete execution/commit seams, per-effect recoverable intent, reliable local/remote mutation ports, separate remote application versus convergence authority, and explicit BASE-healing proof.
- PR #33 already repaired operation-local stale-precondition handling, safe sibling progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, and sanitized diagnostics. Those behaviors must not regress.
- Current controller/cursor behavior and legacy planner semantics must be migrated only within this workstream's owned files and frozen contracts.

The approved foundation deliberately established contracts and seams without completing this workstream. Do not mistake a contract type or foundation test for completed production behavior.

### 6. Frozen Cross-Workstream Rules

The following are fixed for every parallel worker:

- `src/contracts/**` is frozen and MUST NOT be modified.
- Do not create branch-local copies, semantic shadows, substitute interfaces, or incompatible sidecar contracts.
- The mutation lifecycle is fixed as: `PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Persistence revision and semantic synchronization authority remain distinct.
- Unknown, unreadable, inaccessible, incomplete, ambiguous, or outcome-unknown states may not be promoted into authoritative absence, deletion, ordinary success, or ordinary convergence.
- File BASE/common authority requires the frozen canonical proof semantics.
- Physical remote application proof and logical path-convergence authority are distinct.
- Every dispatched mutation must remain restart-safe if the process dies at any awaited boundary.
- Cancellation is cooperative control, not a substitute for crash durability.
- Windows and iOS are distinct supported environments; no desktop-only assumption may enter shared/mobile code.
- Device timestamps are advisory and never synchronization winner authority.
- No new synchronization path may route around the frozen safe mutation/execution seams merely because a legacy compatibility interface still exists.

Workstream-local fakes or adapters may be created only in your permitted new-test namespace unless a production adapter belongs to your exclusive production ownership.

`src/testing/fakes.ts`, integration-owned tests, foundation planning artifacts, and other workers' files are prohibited unless this prompt explicitly says otherwise.

### 7. Exclusive Ownership and Scope

#### Production files you may modify

- `src/core/destructive-safety.ts`
- `src/core/execution-coordinator.ts`
- `src/core/planner.ts`
- `src/core/production-planner.ts`
- `src/core/semantic-identifiers.ts`
- `src/product/operation-isolation.ts`
- `src/product/path-scope.ts`
- `src/product/product-controller.ts`
- `src/product/production-executor.ts`
- `src/product/snapshot-assembler.ts`

#### Existing tests you may modify

- `test/phase2-planner.test.ts`
- `test/phase2-planner-edge.test.ts`
- `test/phase5-auth-controller.test.ts`
- `test/phase5-controller.test.ts`
- `test/phase5-group-d-acceptance.test.ts`
- `test/phase5-group-d-active-run-integration.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`
- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-recovery-auth.test.ts`
- `test/phase5-second-rejection.test.ts`
- `test/phase6-alpha-full-sync-remediation.test.ts`
- `test/phase6-alpha-mixed-plan-isolation.test.ts`
- `test/phase6-b-destructive-safety.test.ts`

#### New tests/support you may create

- `test/workstreams/orchestration/**`

#### Prohibited scope

You MUST NOT modify:

- any production file outside the production ownership list above;
- any existing test outside the existing-test ownership list above;
- any `src/contracts/**` file;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another workstream's dedicated evidence;
- release, workflow, version, Azure, OAuth-return, or protected-branch material unless explicitly listed in your ownership above.

If a necessary change appears to belong elsewhere, record an integration dependency or contract-change request rather than crossing ownership.

### 8. Frozen Inputs and Required End State

#### Frozen inputs

- `ExecutablePlannedOperation`, `ExecutableOperationPrecondition`, exact BASE and identity authority.
- `AuthoritativeSynchronizationExecutor` and `AuthorityCompleteSuccessCommitter`.
- Recoverable operation/effect intent and state/recovery seams.
- `ReliableRemoteMutationPort`, coherent remote reads, local transaction/integrity seams.
- `RemoteMutationApplicationProof` versus `RemotePathConvergenceAuthority`.
- Common/BASE proof and remote-ingestion/backlog contracts.
- Conflict/merge outcomes from Workstream F's frozen public seam.
- Existing planner, snapshot, destructive-safety, status, and PR #33 path-isolation behavior.

#### Required end state

- History-dependent work cannot enter authoritative execution with compatibility-only `base-trusted`; exact `base-authority` is resolved and carried before execution.
- Identity-dependent work cannot enter authoritative execution with compatibility-only `identity-unambiguous`; exact `identity-authority` proof is resolved and carried.
- Only authority-complete executable operations enter the new authoritative executor/committer path.
- Every physical mutation effect is durably journaled before dispatch authority and uses the frozen safe LOCAL/REMOTE mutation seam.
- Upload/create/update/download/move/trash/clean-merge execution observes the fixed mutation lifecycle and remains restart-safe.
- Remote physical application success does not imply logical convergence. A writer candidate preserved alongside independent RI remains conflict-preserved.
- Ordinary convergence requires explicit conflict-free path authority in addition to verified materialization.
- Verified LOCAL/REMOTE canonical equality heals BASE through the frozen common proof even when BASE is stale.
- Remote feed ingestion/checkpoint progress is allowed to advance independently of unresolved path convergence only when C's durable learned facts remain preserved.
- One unstable/conflicted path cannot indefinitely starve unrelated safe operations.
- Global authentication, recovery, protocol, and destructive-safety gates remain global; path-local uncertainty remains path-local.
- Safe effects already durably committed are not duplicated on retry or replan.
- Snapshot assembly preserves duplicate remote candidates, Unicode/case ambiguity, and scoped local uncertainty without arbitrary collapse.

### 9. Required Behavior and Semantics

- Do not recreate exact authority from timestamps or from a second uncorrelated observation after planning.
- Do not bypass journal durability because a mutation looks idempotent.
- Do not advance BASE or cursor from a mere transport response.
- Do not collapse all stale preconditions into global stale-state.
- Do not let obsolete attention entries remain forever solely because an unrelated earlier path cannot commit.
- Destructive propagation remains gated by trustworthy baseline/recovery/stale-device/circuit-breaker authority.

#### Implementation discretion

- Private planner/executor/controller helper decomposition inside owned files.
- Exact order of independent safe operations when deterministic semantics and dependencies are preserved.
- Local data structures for path work queues/deferred sets.
- Refactors needed within owned files to consume frozen ports cleanly.
- How compatibility planner DTOs are upgraded to executable authority, provided the executable seam cannot admit nominal authority.

Do not convert implementation discretion into permission to change a frozen semantic outcome.

#### Dependencies and Parallel-Safety Boundary

This branch must compile against frozen contracts without A/B/C/F production branches. Use fakes/adapters only under `test/workstreams/orchestration/**`. Do not add production substitutes for another workstream. The serial integration phase will wire the real implementations. `test/phase2-execution.test.ts` is integration-owned and immutable during the parallel wave.

Your branch must remain independently typecheck/build-capable against the approved foundation. Do not wait for another worker's production branch in order to make your own code compile. Use only frozen interfaces and workstream-local test fakes where dependencies are not yet integrated.

### 10. Contract Change Rule

If you discover that an acceptance criterion is genuinely impossible to implement using the frozen contract surface, do not edit or shadow the contract.

Record a `CONTRACT CHANGE REQUEST` in your dedicated evidence and stop before making the prohibited change.

The request must contain:

- affected frozen contract/type;
- exact observed limitation;
- assigned requirement or acceptance criterion blocked;
- repository evidence proving no conforming implementation is available;
- minimum contract capability required;
- proposed semantic change, without unnecessary private implementation detail;
- other workstreams affected;
- integration consequences.

Ordinary implementation difficulty, preference for a cleaner API, or desire to refactor is not a contract gap.

### 11. Verification and Completion Gate

Before claiming completion:

- run the workstream-owned existing tests;
- run every new workstream test;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run any current repository package/mobile verifier required by the Phase 6 evidence and applicable to your changes;
- inspect the complete diff from the approved base SHA;
- verify no prohibited production or test file was modified;
- verify no frozen contract was modified;
- verify no test was weakened merely to make the implementation pass;
- verify the branch is buildable and testable without another worker branch being merged.

A phase is not complete because the agent states it is complete. The required end state, acceptance criteria, builds, tests, architecture boundaries, and evidence must all be satisfied.

If an unrelated pre-existing test failure appears, prove it is pre-existing against the approved base before qualifying it. Do not simply label failures unrelated.

#### Workstream-Specific Acceptance Evidence

- Exact-authority tests prove compatibility `base-trusted` and `identity-unambiguous` cannot cross the authoritative execution boundary.
- Per-mutation lifecycle tests cover upload-create/update, download-create/update, local/remote move, local/remote trash, and clean merge.
- R0 + independent RI + writer candidate proves safe materialization remains conflict-preserved rather than ordinary convergence.
- No-independent-candidate case proves ordinary convergence requires both application and convergence authority.
- LOCAL=REMOTE!=BASE canonical equality heals BASE without unnecessary content rewrite.
- Batch 1 unresolved while later remote batches advance does not pin the feed or discard unresolved authority.
- Path A continuously changes while stable path B still commits and the run reaches bounded quiescence rather than immediate infinite retry.
- PR #33 focused regressions remain passing.
- Destructive/recovery/auth global-gate tests remain correct.
- Duplicate same-path remote objects, case collisions, Unicode-equivalent names, and unknown local observations remain conservative.

### 12. Evidence Requirements

In `dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-01.md`, record:

- agent identity;
- approved base SHA;
- branch name and starting SHA;
- manual ingestion proof;
- authoritative artifacts read;
- relevant current-state findings;
- exact created/modified/deleted files;
- important implementation decisions made within Engineering Discretion;
- every test/build/check command and exact result;
- focused scenario evidence for every workstream-specific acceptance item;
- any pre-existing failures and proof they predate this branch;
- any integration dependency request;
- any contract-change request;
- final branch SHA;
- clean/dirty working-tree status;
- known limitations within scope.

Do not rewrite predecessor evidence and do not claim physical-device validation you did not perform.

### 13. Final Report

Return a concise final report containing:

- agent identity;
- branch;
- approved base SHA;
- final SHA;
- changed-file list;
- required end-state summary;
- focused verification results;
- full verification results;
- unresolved integration dependencies, if any;
- contract-change request status;
- confirmation that frozen/prohibited files were not modified.

End the report with:

`WORKSTREAM D COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

### 14. Hard Stop

After your assigned workstream is implemented, verified, evidenced, and pushed:

- STOP;
- do not merge your branch;
- do not modify `phase6-sync-architecture-foundation`;
- do not modify `phase6-integration`;
- do not modify `master` or `main`;
- do not modify Azure or OAuth production configuration;
- do not tag or release;
- do not perform physical Windows/iPhone synchronization;
- do not begin Stage 3;
- do not take ownership of another workstream;
- do not repair integration defects in files outside your ownership.

The supervisor will independently review each branch and later perform serialized integration/adversarial validation.

## Prompt E — Runtime / Lifecycle

### 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-LIFECYCLE-01`

You are the **Runtime / Lifecycle implementation agent** for the Phase 6 synchronization hardening parallel wave.

Execute only the assignment in this prompt. If your actual session/agent identity does not match `agt-CA-P6-SYNC-LIFECYCLE-01`, stop and report the identity mismatch rather than selecting a different assignment.

### 2. Governing Stage 2A Authority and Re-Entry

This is a **Stage 2A controlled parallel construction session** under the current repository copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`.

The independent supervisor has completed the foundation review and explicitly approved the following exact repository state as the common parallel-workstream base:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch containing that state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`

This later supervisor approval supersedes only stale candidate-status wording in repository planning artifacts that says parallel implementation is not yet authorized. It does **not** supersede or weaken any architecture, contract, ownership, safety, or non-goal established by those artifacts.

Apply especially:

- Human Product Authority;
- Agent Engineering Authority;
- Minimum Necessary Specification;
- Evidence-Based Completion;
- Repository Grounding;
- No Unnecessary Restart;
- Entry-State Rule;
- Stage 2A Controlled Build Loop;
- Stage 2A Build Prompt Design Standard;
- Phase Completion Gate;
- Stage 2A Between Build Sessions;
- Re-Entering During Construction.

Do not restart Stage 0 or Stage 1. Do not redesign the approved synchronization architecture. Resume from the actual approved repository state.

Before modifying code, read completely and reconcile against the actual repository:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. every frozen `src/contracts/**` file directly relevant to this workstream
16. every production file and existing test assigned to this workstream.

Record manual re-ingestion evidence in your dedicated workstream evidence file. Derive it from the current branch copy rather than copying historical values. Record at minimum the manual title, first substantive sentence, last sentence, heading counts by level, complete H2 sequence, and embedded Stage 0/1/2A/2B/3 prompt headings.

Repository facts discovered during this re-entry govern implementation mechanics. Higher-authority target behavior and the frozen foundation govern required semantics.

### 3. Repository and Branch Control

Work only on your assigned isolated branch.

Before modification:

- fetch current repository refs;
- confirm the approved base commit exists;
- confirm the working tree is clean;
- create or check out your assigned branch directly from the exact approved workstream-base SHA;
- verify the branch starting `HEAD` is exactly the approved SHA before the first workstream commit.

Do not substitute the latest `phase6-sync-architecture-foundation`, `phase6-integration`, `master`, another worker branch, or another SHA for the approved base.

Do not rebase onto or cherry-pick from another parallel worker during this wave.

If your assigned branch already exists and contains work not derived solely from the approved base, do not overwrite, reset, force-push, or adopt it silently. Stop and report the discrepancy.

You may push only your assigned branch. You may not merge it.

Your assigned branch is:

`phase6-sync-lifecycle`

Your dedicated evidence file is:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-LIFECYCLE-01.md`

Do not modify the cumulative `dev/evidence/_ca-output.md` during this parallel wave. It is predecessor/integration context only. Your dedicated evidence file is the sole workstream evidence artifact you may create or update.

### 4. Objective

Implement the runtime/lifecycle control plane for Windows and iOS: startup/resume/suspend/unload coordination, cooperative cancellation, trigger coalescing, serialized run authority, and guaranteed future integrity-reconciliation opportunities without pretending that iOS background execution is available.

### 5. Verified Current State Relevant to This Workstream

- The current scheduler reacts to vault-ready/resume, local change, periodic timers, suspend, and unload, but it primarily forwards requests to the controller and does not yet embody the approved lifecycle/cancellation/integrity-opportunity model.
- Current local change events call `noteChangeDuringRun()` and debounce an automatic run; the approved architecture requires coalescing without lost reconciliation and exact separation of self-generated events from genuine concurrent user changes.
- iOS cannot be assumed to keep plugin JavaScript running after suspension/termination. Correctness must come from durable mutation/recovery semantics owned elsewhere, not from a promise that cancellation callbacks will run.
- The frozen foundation separates cooperative cancellation from crash safety and requires no new operation to start after suspension/unload begins.

The approved foundation deliberately established contracts and seams without completing this workstream. Do not mistake a contract type or foundation test for completed production behavior.

### 6. Frozen Cross-Workstream Rules

The following are fixed for every parallel worker:

- `src/contracts/**` is frozen and MUST NOT be modified.
- Do not create branch-local copies, semantic shadows, substitute interfaces, or incompatible sidecar contracts.
- The mutation lifecycle is fixed as: `PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Persistence revision and semantic synchronization authority remain distinct.
- Unknown, unreadable, inaccessible, incomplete, ambiguous, or outcome-unknown states may not be promoted into authoritative absence, deletion, ordinary success, or ordinary convergence.
- File BASE/common authority requires the frozen canonical proof semantics.
- Physical remote application proof and logical path-convergence authority are distinct.
- Every dispatched mutation must remain restart-safe if the process dies at any awaited boundary.
- Cancellation is cooperative control, not a substitute for crash durability.
- Windows and iOS are distinct supported environments; no desktop-only assumption may enter shared/mobile code.
- Device timestamps are advisory and never synchronization winner authority.
- No new synchronization path may route around the frozen safe mutation/execution seams merely because a legacy compatibility interface still exists.

Workstream-local fakes or adapters may be created only in your permitted new-test namespace unless a production adapter belongs to your exclusive production ownership.

`src/testing/fakes.ts`, integration-owned tests, foundation planning artifacts, and other workers' files are prohibited unless this prompt explicitly says otherwise.

### 7. Exclusive Ownership and Scope

#### Production files you may modify

- `src/core/run-coordinator.ts`
- `src/product/runtime.ts`
- `src/product/scheduler.ts`
- `src/product/web-lock-run-lease.ts`
- `src/main.ts`

#### Existing tests you may modify

- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase5-scheduler-acceptance.test.ts`
- `test/phase6-alpha-diagnostic-logging.test.ts`
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`

#### New tests/support you may create

- `test/workstreams/lifecycle/**`

#### Prohibited scope

You MUST NOT modify:

- any production file outside the production ownership list above;
- any existing test outside the existing-test ownership list above;
- any `src/contracts/**` file;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another workstream's dedicated evidence;
- release, workflow, version, Azure, OAuth-return, or protected-branch material unless explicitly listed in your ownership above.

If a necessary change appears to belong elsewhere, record an integration dependency or contract-change request rather than crossing ownership.

### 8. Frozen Inputs and Required End State

#### Frozen inputs

- Frozen lifecycle state and cancellation contracts.
- Public LOCAL provenance/integrity signals from Workstream B's seam.
- Recovery/run-gate state from Workstream C's seam.
- Public reconciliation/run entry points from Workstream D's seam.
- Status/diagnostic contracts and privacy rules.
- `LocalIntegrityReconciliationPort` as the authoritative integrity opportunity consumed/scheduled by lifecycle policy.

#### Required end state

- No new synchronization operation begins after suspension or unload has entered the stopping state.
- Cancellation is propagated/coordinated where possible but never treated as proof that in-flight mutation did not occur.
- Startup, resume, local-change, periodic, and deferred-reconciliation triggers coalesce into serialized runs without losing the fact that another reconciliation is required.
- Overlapping triggers do not create concurrent synchronization mutation runs on one device.
- Policy guarantees eventual opportunities for cache-bypassing integrity reconciliation while the app is active, so missed watcher events cannot remain permanent authority.
- iOS behavior is accurately limited to startup/resume/active-app opportunities; no background-sync guarantee is introduced.
- Windows lifecycle remains correct under rapid event bursts and watcher loss.
- Pause/resume/cancel semantics remain consistent with durable recovery gates.
- Diagnostics remain privacy-safe and associated with the correct run/trigger without leaking paths/content unless current diagnostic contracts explicitly permit sanitized classification.

### 9. Required Behavior and Semantics

- Do not rely on process cleanup or a final cancellation callback for correctness.
- Do not schedule tighter than the product's configured/allowed cadence merely to mask state defects.
- Do not create immediate zero-delay retry storms after a deferred/path-local failure.
- Integrity reconciliation is a policy opportunity, not a watcher-derived claim that state is complete.
- Automatic behavior must not block ordinary offline/local Obsidian use.

#### Implementation discretion

- Private scheduler state-machine/helper organization in owned files.
- Exact trigger-coalescing data structure.
- Exact timer/debounce implementation consistent with settings and testability.
- How lifecycle state is surfaced internally to `main.ts` and runtime wiring.
- How diagnostic run labels are constructed within privacy rules.

Do not convert implementation discretion into permission to change a frozen semantic outcome.

#### Dependencies and Parallel-Safety Boundary

Branch-local tests may use fakes only under `test/workstreams/lifecycle/**` for B/C/D public behavior. Do not modify those workers' production files. The branch should implement its lifecycle logic against frozen seams so serial integration can replace test fakes with real components without contract changes.

Your branch must remain independently typecheck/build-capable against the approved foundation. Do not wait for another worker's production branch in order to make your own code compile. Use only frozen interfaces and workstream-local test fakes where dependencies are not yet integrated.

### 10. Contract Change Rule

If you discover that an acceptance criterion is genuinely impossible to implement using the frozen contract surface, do not edit or shadow the contract.

Record a `CONTRACT CHANGE REQUEST` in your dedicated evidence and stop before making the prohibited change.

The request must contain:

- affected frozen contract/type;
- exact observed limitation;
- assigned requirement or acceptance criterion blocked;
- repository evidence proving no conforming implementation is available;
- minimum contract capability required;
- proposed semantic change, without unnecessary private implementation detail;
- other workstreams affected;
- integration consequences.

Ordinary implementation difficulty, preference for a cleaner API, or desire to refactor is not a contract gap.

### 11. Verification and Completion Gate

Before claiming completion:

- run the workstream-owned existing tests;
- run every new workstream test;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run any current repository package/mobile verifier required by the Phase 6 evidence and applicable to your changes;
- inspect the complete diff from the approved base SHA;
- verify no prohibited production or test file was modified;
- verify no frozen contract was modified;
- verify no test was weakened merely to make the implementation pass;
- verify the branch is buildable and testable without another worker branch being merged.

A phase is not complete because the agent states it is complete. The required end state, acceptance criteria, builds, tests, architecture boundaries, and evidence must all be satisfied.

If an unrelated pre-existing test failure appears, prove it is pre-existing against the approved base before qualifying it. Do not simply label failures unrelated.

#### Workstream-Specific Acceptance Evidence

- Rapid startup/resume/local/periodic trigger races prove serialized/coalesced behavior and no lost future reconciliation.
- Suspend/unload during a run proves no new operation starts afterward.
- Cancellation-not-delivered/process-death model is treated equivalently to crash recovery authority rather than successful cancel.
- Repeated local-change bursts do not create unbounded immediate reruns.
- Policy test proves an integrity-reconciliation opportunity eventually occurs even with no watcher event.
- iOS tests explicitly avoid any background-execution promise.
- Existing lifecycle/scheduler/diagnostic tests remain passing and privacy-safe.
- Run lease behavior prevents two same-device mutation runs from acquiring authority concurrently.

### 12. Evidence Requirements

In `dev/evidence/_ca-output-agt-CA-P6-SYNC-LIFECYCLE-01.md`, record:

- agent identity;
- approved base SHA;
- branch name and starting SHA;
- manual ingestion proof;
- authoritative artifacts read;
- relevant current-state findings;
- exact created/modified/deleted files;
- important implementation decisions made within Engineering Discretion;
- every test/build/check command and exact result;
- focused scenario evidence for every workstream-specific acceptance item;
- any pre-existing failures and proof they predate this branch;
- any integration dependency request;
- any contract-change request;
- final branch SHA;
- clean/dirty working-tree status;
- known limitations within scope.

Do not rewrite predecessor evidence and do not claim physical-device validation you did not perform.

### 13. Final Report

Return a concise final report containing:

- agent identity;
- branch;
- approved base SHA;
- final SHA;
- changed-file list;
- required end-state summary;
- focused verification results;
- full verification results;
- unresolved integration dependencies, if any;
- contract-change request status;
- confirmation that frozen/prohibited files were not modified.

End the report with:

`WORKSTREAM E COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

### 14. Hard Stop

After your assigned workstream is implemented, verified, evidenced, and pushed:

- STOP;
- do not merge your branch;
- do not modify `phase6-sync-architecture-foundation`;
- do not modify `phase6-integration`;
- do not modify `master` or `main`;
- do not modify Azure or OAuth production configuration;
- do not tag or release;
- do not perform physical Windows/iPhone synchronization;
- do not begin Stage 3;
- do not take ownership of another workstream;
- do not repair integration defects in files outside your ownership.

The supervisor will independently review each branch and later perform serialized integration/adversarial validation.

## Prompt F — Merge / Resource Safety

### 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-MERGE-01`

You are the **Merge / Resource Safety implementation agent** for the Phase 6 synchronization hardening parallel wave.

Execute only the assignment in this prompt. If your actual session/agent identity does not match `agt-CA-P6-SYNC-MERGE-01`, stop and report the identity mismatch rather than selecting a different assignment.

### 2. Governing Stage 2A Authority and Re-Entry

This is a **Stage 2A controlled parallel construction session** under the current repository copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`.

The independent supervisor has completed the foundation review and explicitly approved the following exact repository state as the common parallel-workstream base:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch containing that state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`

This later supervisor approval supersedes only stale candidate-status wording in repository planning artifacts that says parallel implementation is not yet authorized. It does **not** supersede or weaken any architecture, contract, ownership, safety, or non-goal established by those artifacts.

Apply especially:

- Human Product Authority;
- Agent Engineering Authority;
- Minimum Necessary Specification;
- Evidence-Based Completion;
- Repository Grounding;
- No Unnecessary Restart;
- Entry-State Rule;
- Stage 2A Controlled Build Loop;
- Stage 2A Build Prompt Design Standard;
- Phase Completion Gate;
- Stage 2A Between Build Sessions;
- Re-Entering During Construction.

Do not restart Stage 0 or Stage 1. Do not redesign the approved synchronization architecture. Resume from the actual approved repository state.

Before modifying code, read completely and reconcile against the actual repository:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. every frozen `src/contracts/**` file directly relevant to this workstream
16. every production file and existing test assigned to this workstream.

Record manual re-ingestion evidence in your dedicated workstream evidence file. Derive it from the current branch copy rather than copying historical values. Record at minimum the manual title, first substantive sentence, last sentence, heading counts by level, complete H2 sequence, and embedded Stage 0/1/2A/2B/3 prompt headings.

Repository facts discovered during this re-entry govern implementation mechanics. Higher-authority target behavior and the frozen foundation govern required semantics.

### 3. Repository and Branch Control

Work only on your assigned isolated branch.

Before modification:

- fetch current repository refs;
- confirm the approved base commit exists;
- confirm the working tree is clean;
- create or check out your assigned branch directly from the exact approved workstream-base SHA;
- verify the branch starting `HEAD` is exactly the approved SHA before the first workstream commit.

Do not substitute the latest `phase6-sync-architecture-foundation`, `phase6-integration`, `master`, another worker branch, or another SHA for the approved base.

Do not rebase onto or cherry-pick from another parallel worker during this wave.

If your assigned branch already exists and contains work not derived solely from the approved base, do not overwrite, reset, force-push, or adopt it silently. Stop and report the discrepancy.

You may push only your assigned branch. You may not merge it.

Your assigned branch is:

`phase6-sync-merge`

Your dedicated evidence file is:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-MERGE-01.md`

Do not modify the cumulative `dev/evidence/_ca-output.md` during this parallel wave. It is predecessor/integration context only. Your dedicated evidence file is the sole workstream evidence artifact you may create or update.

### 4. Objective

Replace the current unbounded three-way text merge/materialization behavior with a resource-bounded, cancellation-aware, iOS-safe implementation that preserves complete versions and falls back to explicit conflict whenever safe automatic merge cannot be guaranteed.

### 5. Verified Current State Relevant to This Workstream

- The current `mergeThreeWayText()` builds a full LCS matrix of `(baseLines + 1) * (sideLines + 1)` values for each side, producing quadratic memory/time behavior unsuitable for arbitrarily large Markdown on iOS.
- `ProductTextVersionStore` currently materializes complete text strings while decoding/capturing versions; the approved foundation requires explicit bounded admission/fallback rather than allowing unknown/oversized inputs into unbounded merge work.
- The existing conflict semantics are otherwise valuable: true BASE+LOCAL+REMOTE merge for recognized text, preserve both/all versions on ambiguity, and no automatic binary merge.
- The frozen merge resource policy and conflict/version contracts define required outcomes; this workstream must implement within those boundaries without changing orchestration.

The approved foundation deliberately established contracts and seams without completing this workstream. Do not mistake a contract type or foundation test for completed production behavior.

### 6. Frozen Cross-Workstream Rules

The following are fixed for every parallel worker:

- `src/contracts/**` is frozen and MUST NOT be modified.
- Do not create branch-local copies, semantic shadows, substitute interfaces, or incompatible sidecar contracts.
- The mutation lifecycle is fixed as: `PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Persistence revision and semantic synchronization authority remain distinct.
- Unknown, unreadable, inaccessible, incomplete, ambiguous, or outcome-unknown states may not be promoted into authoritative absence, deletion, ordinary success, or ordinary convergence.
- File BASE/common authority requires the frozen canonical proof semantics.
- Physical remote application proof and logical path-convergence authority are distinct.
- Every dispatched mutation must remain restart-safe if the process dies at any awaited boundary.
- Cancellation is cooperative control, not a substitute for crash durability.
- Windows and iOS are distinct supported environments; no desktop-only assumption may enter shared/mobile code.
- Device timestamps are advisory and never synchronization winner authority.
- No new synchronization path may route around the frozen safe mutation/execution seams merely because a legacy compatibility interface still exists.

Workstream-local fakes or adapters may be created only in your permitted new-test namespace unless a production adapter belongs to your exclusive production ownership.

`src/testing/fakes.ts`, integration-owned tests, foundation planning artifacts, and other workers' files are prohibited unless this prompt explicitly says otherwise.

### 7. Exclusive Ownership and Scope

#### Production files you may modify

- `src/core/conflict-resolver.ts`
- `src/product/text-version-store.ts`

#### Existing tests you may modify

- `test/phase2-conflict.test.ts`

#### New tests/support you may create

- `test/workstreams/merge/**`

#### Prohibited scope

You MUST NOT modify:

- any production file outside the production ownership list above;
- any existing test outside the existing-test ownership list above;
- any `src/contracts/**` file;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another workstream's dedicated evidence;
- release, workflow, version, Azure, OAuth-return, or protected-branch material unless explicitly listed in your ownership above.

If a necessary change appears to belong elsewhere, record an integration dependency or contract-change request rather than crossing ownership.

### 8. Frozen Inputs and Required End State

#### Frozen inputs

- Frozen merge resource policy, cancellation, conflict, provenance, version-reference, and content-evidence contracts.
- Recognized text policy for supported text types.
- Existing three-way semantics: unchanged-side shortcut, identical-current shortcut, clean non-overlap merge, explicit unresolved conflict.
- Complete-version preservation requirements for binary/unknown/oversized/cancelled cases.

#### Required end state

- Unknown-size or policy-oversized inputs are rejected from automatic merge before an unbounded memory algorithm begins.
- Automatic merge has explicit resource admission based on the frozen policy and remains bounded enough for iOS-supported execution.
- Cancellation before completion never produces or acknowledges a partial merged version.
- If auto-merge cannot safely run because of resource limits, missing version materialization, invalid text, or cancellation, the outcome preserves complete BASE/LOCAL/REMOTE provenance as applicable and surfaces conflict/unresolved state rather than losing a version.
- Clean merge semantics remain correct for ordinary supported files.
- Text-version persistence/materialization does not accidentally convert a large-resource refusal into a data-loss path.
- Canonical evidence for a produced merge corresponds exactly to the final merged bytes/text.

### 9. Required Behavior and Semantics

- Do not sacrifice correctness by truncating text, dropping lines, or merging only prefixes.
- Do not silently fall back to newest-wins.
- Do not reinterpret binary/unknown data as mergeable text.
- Resource limits are safety policy, not an invitation to discard a version.
- Cancellation does not imply any external mutation or state commit occurred.

#### Implementation discretion

- Choice of bounded merge algorithm or algorithm family.
- Private representation of diffs/hunks.
- Threshold-enforcement helper structure.
- Streaming/chunking details in text-version persistence where semantically equivalent.
- Optimization of common fast paths such as equal LOCAL/REMOTE or one side equal BASE.

Do not convert implementation discretion into permission to change a frozen semantic outcome.

#### Dependencies and Parallel-Safety Boundary

This workstream is production-independent of other parallel workers. Use only its owned conflict test and `test/workstreams/merge/**`. Return frozen merge/conflict outcomes that Workstream D can later consume; do not modify orchestration or contracts.

Your branch must remain independently typecheck/build-capable against the approved foundation. Do not wait for another worker's production branch in order to make your own code compile. Use only frozen interfaces and workstream-local test fakes where dependencies are not yet integrated.

### 10. Contract Change Rule

If you discover that an acceptance criterion is genuinely impossible to implement using the frozen contract surface, do not edit or shadow the contract.

Record a `CONTRACT CHANGE REQUEST` in your dedicated evidence and stop before making the prohibited change.

The request must contain:

- affected frozen contract/type;
- exact observed limitation;
- assigned requirement or acceptance criterion blocked;
- repository evidence proving no conforming implementation is available;
- minimum contract capability required;
- proposed semantic change, without unnecessary private implementation detail;
- other workstreams affected;
- integration consequences.

Ordinary implementation difficulty, preference for a cleaner API, or desire to refactor is not a contract gap.

### 11. Verification and Completion Gate

Before claiming completion:

- run the workstream-owned existing tests;
- run every new workstream test;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run any current repository package/mobile verifier required by the Phase 6 evidence and applicable to your changes;
- inspect the complete diff from the approved base SHA;
- verify no prohibited production or test file was modified;
- verify no frozen contract was modified;
- verify no test was weakened merely to make the implementation pass;
- verify the branch is buildable and testable without another worker branch being merged.

A phase is not complete because the agent states it is complete. The required end state, acceptance criteria, builds, tests, architecture boundaries, and evidence must all be satisfied.

If an unrelated pre-existing test failure appears, prove it is pre-existing against the approved base before qualifying it. Do not simply label failures unrelated.

#### Workstream-Specific Acceptance Evidence

- Boundary tests at just-below/at/above configured resource thresholds.
- Very large and unknown-size text never enters the old unbounded quadratic path.
- Large Unicode and multibyte text maintains correct byte/content evidence.
- Cancellation at admission, version materialization, and merge computation produces unresolved/preserved outcome, never partial success.
- Ordinary clean non-overlapping three-way merges remain correct.
- Overlapping edits remain unresolved and preserve provenance.
- BASE missing and binary/unsupported cases continue to preserve both current versions.
- Text-version storage does not retain corrupt text under a canonical hash key.

### 12. Evidence Requirements

In `dev/evidence/_ca-output-agt-CA-P6-SYNC-MERGE-01.md`, record:

- agent identity;
- approved base SHA;
- branch name and starting SHA;
- manual ingestion proof;
- authoritative artifacts read;
- relevant current-state findings;
- exact created/modified/deleted files;
- important implementation decisions made within Engineering Discretion;
- every test/build/check command and exact result;
- focused scenario evidence for every workstream-specific acceptance item;
- any pre-existing failures and proof they predate this branch;
- any integration dependency request;
- any contract-change request;
- final branch SHA;
- clean/dirty working-tree status;
- known limitations within scope.

Do not rewrite predecessor evidence and do not claim physical-device validation you did not perform.

### 13. Final Report

Return a concise final report containing:

- agent identity;
- branch;
- approved base SHA;
- final SHA;
- changed-file list;
- required end-state summary;
- focused verification results;
- full verification results;
- unresolved integration dependencies, if any;
- contract-change request status;
- confirmation that frozen/prohibited files were not modified.

End the report with:

`WORKSTREAM F COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

### 14. Hard Stop

After your assigned workstream is implemented, verified, evidenced, and pushed:

- STOP;
- do not merge your branch;
- do not modify `phase6-sync-architecture-foundation`;
- do not modify `phase6-integration`;
- do not modify `master` or `main`;
- do not modify Azure or OAuth production configuration;
- do not tag or release;
- do not perform physical Windows/iPhone synchronization;
- do not begin Stage 3;
- do not take ownership of another workstream;
- do not repair integration defects in files outside your ownership.

The supervisor will independently review each branch and later perform serialized integration/adversarial validation.

## Prompt G — Adversarial Model / Verification

### 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-ADVERSARIAL-01`

You are the **Adversarial Model / Verification implementation agent** for the Phase 6 synchronization hardening parallel wave.

Execute only the assignment in this prompt. If your actual session/agent identity does not match `agt-CA-P6-SYNC-ADVERSARIAL-01`, stop and report the identity mismatch rather than selecting a different assignment.

### 2. Governing Stage 2A Authority and Re-Entry

This is a **Stage 2A controlled parallel construction session** under the current repository copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`.

The independent supervisor has completed the foundation review and explicitly approved the following exact repository state as the common parallel-workstream base:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch containing that state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`

This later supervisor approval supersedes only stale candidate-status wording in repository planning artifacts that says parallel implementation is not yet authorized. It does **not** supersede or weaken any architecture, contract, ownership, safety, or non-goal established by those artifacts.

Apply especially:

- Human Product Authority;
- Agent Engineering Authority;
- Minimum Necessary Specification;
- Evidence-Based Completion;
- Repository Grounding;
- No Unnecessary Restart;
- Entry-State Rule;
- Stage 2A Controlled Build Loop;
- Stage 2A Build Prompt Design Standard;
- Phase Completion Gate;
- Stage 2A Between Build Sessions;
- Re-Entering During Construction.

Do not restart Stage 0 or Stage 1. Do not redesign the approved synchronization architecture. Resume from the actual approved repository state.

Before modifying code, read completely and reconcile against the actual repository:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. every frozen `src/contracts/**` file directly relevant to this workstream
16. every production file and existing test assigned to this workstream.

Record manual re-ingestion evidence in your dedicated workstream evidence file. Derive it from the current branch copy rather than copying historical values. Record at minimum the manual title, first substantive sentence, last sentence, heading counts by level, complete H2 sequence, and embedded Stage 0/1/2A/2B/3 prompt headings.

Repository facts discovered during this re-entry govern implementation mechanics. Higher-authority target behavior and the frozen foundation govern required semantics.

### 3. Repository and Branch Control

Work only on your assigned isolated branch.

Before modification:

- fetch current repository refs;
- confirm the approved base commit exists;
- confirm the working tree is clean;
- create or check out your assigned branch directly from the exact approved workstream-base SHA;
- verify the branch starting `HEAD` is exactly the approved SHA before the first workstream commit.

Do not substitute the latest `phase6-sync-architecture-foundation`, `phase6-integration`, `master`, another worker branch, or another SHA for the approved base.

Do not rebase onto or cherry-pick from another parallel worker during this wave.

If your assigned branch already exists and contains work not derived solely from the approved base, do not overwrite, reset, force-push, or adopt it silently. Stop and report the discrepancy.

You may push only your assigned branch. You may not merge it.

Your assigned branch is:

`phase6-sync-adversarial-model`

Your dedicated evidence file is:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-ADVERSARIAL-01.md`

Do not modify the cumulative `dev/evidence/_ca-output.md` during this parallel wave. It is predecessor/integration context only. Your dedicated evidence file is the sole workstream evidence artifact you may create or update.

### 4. Objective

Build a deterministic, seeded, reproducible two-device synchronization model and adversarial test harness against the frozen foundation contracts. This workstream makes **no production changes**. Its purpose is to predict failures before physical Windows/iPhone testing and to provide replayable/minimized traces for later serialized integration.

### 5. Verified Current State Relevant to This Workstream

- The approved foundation currently contains predictive contract tests, but not the comprehensive deterministic two-device/interleaving simulator required before ordinary physical-device validation.
- The foundation exposes deterministic synchronization fault points and the authority/mutation/recovery contracts needed to model crashes, retries, ambiguity, lifecycle events, and resource limits.
- During the parallel wave, A-F production implementations do not yet coexist on this branch. Therefore the initial G deliverable must be contract-driven and use synthetic model components entirely inside its permitted namespace.
- Final integrated acceptance of the model will occur after the supervisor serially integrates A-F. This branch must nevertheless provide a complete reusable harness and the required contract-level scenario families now.

The approved foundation deliberately established contracts and seams without completing this workstream. Do not mistake a contract type or foundation test for completed production behavior.

### 6. Frozen Cross-Workstream Rules

The following are fixed for every parallel worker:

- `src/contracts/**` is frozen and MUST NOT be modified.
- Do not create branch-local copies, semantic shadows, substitute interfaces, or incompatible sidecar contracts.
- The mutation lifecycle is fixed as: `PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Persistence revision and semantic synchronization authority remain distinct.
- Unknown, unreadable, inaccessible, incomplete, ambiguous, or outcome-unknown states may not be promoted into authoritative absence, deletion, ordinary success, or ordinary convergence.
- File BASE/common authority requires the frozen canonical proof semantics.
- Physical remote application proof and logical path-convergence authority are distinct.
- Every dispatched mutation must remain restart-safe if the process dies at any awaited boundary.
- Cancellation is cooperative control, not a substitute for crash durability.
- Windows and iOS are distinct supported environments; no desktop-only assumption may enter shared/mobile code.
- Device timestamps are advisory and never synchronization winner authority.
- No new synchronization path may route around the frozen safe mutation/execution seams merely because a legacy compatibility interface still exists.

Workstream-local fakes or adapters may be created only in your permitted new-test namespace unless a production adapter belongs to your exclusive production ownership.

`src/testing/fakes.ts`, integration-owned tests, foundation planning artifacts, and other workers' files are prohibited unless this prompt explicitly says otherwise.

### 7. Exclusive Ownership and Scope

#### Production files you may modify

- **None. This workstream is test/model only.**

#### Existing tests you may modify

- **None. Existing tests outside the permitted namespace are read-only.**

#### New tests/support you may create

- `test/adversarial-model/**`

#### Prohibited scope

You MUST NOT modify:

- any production file outside the production ownership list above;
- any existing test outside the existing-test ownership list above;
- any `src/contracts/**` file;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another workstream's dedicated evidence;
- release, workflow, version, Azure, OAuth-return, or protected-branch material unless explicitly listed in your ownership above.

If a necessary change appears to belong elsewhere, record an integration dependency or contract-change request rather than crossing ownership.

### 8. Frozen Inputs and Required End State

#### Frozen inputs

- All frozen synchronization-foundation contracts and fault points.
- Approved adversarial validation matrix.
- Public planner/execution/state/local/remote/merge/lifecycle contracts as model boundaries.
- Global preservation, conservative-unknown, idempotency, BASE, ingestion, recovery, and eventual-convergence invariants.

#### Required end state

- A deterministic seeded model represents at least two devices, LOCAL state for each, REMOTE Drive state, BASE/common authority, learned remote batches/checkpoint, operation/effect journal, network outcomes, lifecycle state, and synthetic event delivery/loss.
- Every test failure records enough sanitized structured trace data to replay the same seed and ordered event sequence.
- Where practical, failing randomized traces are minimized to a smaller deterministic reproduction.
- The harness can inject every frozen dispatch/local-swap fault point and distinguish clean process continuation from abrupt termination.
- The model encodes invariants so a green run means more than 'no exception': acknowledged-version preservation, conservative unknown/absence, path isolation, no duplicate ambiguous retry, correct BASE authority, and eventual convergence or explicit conflict/recovery after external mutation stops.
- The model contains the required directed scenarios from the approved adversarial validation matrix.
- The entire implementation lives under `test/adversarial-model/**`; production diff remains zero.

### 9. Required Behavior and Semantics

- Do not weaken the model to reproduce current legacy implementation behavior when that behavior conflicts with the frozen architecture.
- Do not use real vault paths, user content, OAuth material, or production identifiers in traces.
- Randomization must be deterministic from an explicit seed.
- Eventual-convergence assertions must allow explicit preserved conflict/recovery states where the specification requires human or later reconciliation rather than forcing false convergence.
- Physical-device testing is not part of G.

#### Implementation discretion

- Model internal state representation.
- Choice of deterministic PRNG.
- Trace/minimization algorithm.
- Number of randomized seeds used in the branch completion gate, provided runtime remains practical and directed cases are always present.
- Test helper organization entirely within the permitted namespace.

Do not convert implementation discretion into permission to change a frozen semantic outcome.

#### Dependencies and Parallel-Safety Boundary

This workstream may not consume A-F worker branches during the parallel wave. Build against frozen contracts and synthetic implementations under `test/adversarial-model/**`. Design the harness so the later serial integration pass can reuse its scenario generator/invariants against integrated production adapters without redesigning the model.

Your branch must remain independently typecheck/build-capable against the approved foundation. Do not wait for another worker's production branch in order to make your own code compile. Use only frozen interfaces and workstream-local test fakes where dependencies are not yet integrated.

### 10. Contract Change Rule

If you discover that an acceptance criterion is genuinely impossible to implement using the frozen contract surface, do not edit or shadow the contract.

Record a `CONTRACT CHANGE REQUEST` in your dedicated evidence and stop before making the prohibited change.

The request must contain:

- affected frozen contract/type;
- exact observed limitation;
- assigned requirement or acceptance criterion blocked;
- repository evidence proving no conforming implementation is available;
- minimum contract capability required;
- proposed semantic change, without unnecessary private implementation detail;
- other workstreams affected;
- integration consequences.

Ordinary implementation difficulty, preference for a cleaner API, or desire to refactor is not a contract gap.

### 11. Verification and Completion Gate

Before claiming completion:

- run the workstream-owned existing tests;
- run every new workstream test;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run any current repository package/mobile verifier required by the Phase 6 evidence and applicable to your changes;
- inspect the complete diff from the approved base SHA;
- verify no prohibited production or test file was modified;
- verify no frozen contract was modified;
- verify no test was weakened merely to make the implementation pass;
- verify the branch is buildable and testable without another worker branch being merged.

A phase is not complete because the agent states it is complete. The required end state, acceptance criteria, builds, tests, architecture boundaries, and evidence must all be satisfied.

If an unrelated pre-existing test failure appears, prove it is pre-existing against the approved base before qualifying it. Do not simply label failures unrelated.

#### Workstream-Specific Acceptance Evidence

- Exact plan BASE/identity authority rejection.
- Crash at every durable mutation stage/effect for upload, download, move, trash, and clean merge.
- R0 predecessor + independent RI + writer candidate yields safe materialization but conflict-preserved logical path.
- No-independent-candidate case permits conflict-free convergence only with explicit authority.
- Lost create/update response with LOCAL advancing L1->L2 verifies the interrupted candidate against durable intended L1.
- Remote move/trash outcome-unknown recovery.
- Clean merge crash after only one physical effect.
- Multi-page and multi-batch Drive ingestion including removals, repeated moves, create-delete, duplicate paths, and long-lived unresolved path while later feed progress continues.
- Same-size/same-mtime H0->H1 local change with missed watcher and unchanged cached token is discovered by an authoritative cache-bypassing integrity step.
- Windows event loss, iOS suspend/resume/termination, cancellation delivered/not delivered, auth loss, rate/offline behavior.
- Path A changes continuously while unrelated B can still commit and the model reaches bounded quiescence after A stops changing.
- Concurrent same-logical-path create from two devices never silently selects one object.
- Stale-device destructive gating and mass-deletion/circuit-breaker authority.
- Resource-bounded merge refusal preserves complete versions.
- Each failure includes seed and replayable ordered trace; production source remains unchanged.

### 12. Evidence Requirements

In `dev/evidence/_ca-output-agt-CA-P6-SYNC-ADVERSARIAL-01.md`, record:

- agent identity;
- approved base SHA;
- branch name and starting SHA;
- manual ingestion proof;
- authoritative artifacts read;
- relevant current-state findings;
- exact created/modified/deleted files;
- important implementation decisions made within Engineering Discretion;
- every test/build/check command and exact result;
- focused scenario evidence for every workstream-specific acceptance item;
- any pre-existing failures and proof they predate this branch;
- any integration dependency request;
- any contract-change request;
- final branch SHA;
- clean/dirty working-tree status;
- known limitations within scope.

Do not rewrite predecessor evidence and do not claim physical-device validation you did not perform.

### 13. Final Report

Return a concise final report containing:

- agent identity;
- branch;
- approved base SHA;
- final SHA;
- changed-file list;
- required end-state summary;
- focused verification results;
- full verification results;
- unresolved integration dependencies, if any;
- contract-change request status;
- confirmation that frozen/prohibited files were not modified.

End the report with:

`WORKSTREAM G CONTRACT MODEL COMPLETE — READY FOR SUPERVISOR REVIEW — FINAL INTEGRATED ACCEPTANCE DEFERRED`

### 14. Hard Stop

After your assigned workstream is implemented, verified, evidenced, and pushed:

- STOP;
- do not merge your branch;
- do not modify `phase6-sync-architecture-foundation`;
- do not modify `phase6-integration`;
- do not modify `master` or `main`;
- do not modify Azure or OAuth production configuration;
- do not tag or release;
- do not perform physical Windows/iPhone synchronization;
- do not begin Stage 3;
- do not take ownership of another workstream;
- do not repair integration defects in files outside your ownership.

The supervisor will independently review each branch and later perform serialized integration/adversarial validation.

