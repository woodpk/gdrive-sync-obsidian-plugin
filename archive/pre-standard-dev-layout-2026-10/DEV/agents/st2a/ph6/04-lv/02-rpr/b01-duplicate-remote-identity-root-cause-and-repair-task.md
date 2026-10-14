# PHASE 6 B01 — DUPLICATE REMOTE IDENTITY ROOT-CAUSE AND BOUNDED REPAIR

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`codex-desktop-p6-b01-duplicate-remote-identity-root-cause-repair-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Exact supervisor input SHA:

`715ae47bd805eca6ab0ddd164ad3967598015a3d`

Create a new repair branch from exactly that SHA:

`phase6-b01-duplicate-remote-identity-root-cause-repair`

Do not substitute another branch tip.

Your assignment is to determine the complete causal chain behind the B01 `blocked-unsafe` duplicate logical-path condition for:

`__brain_sync_portable_config__/app.json`

and, if and only if the root cause is conclusively established, implement the minimum correct product repair and the minimum safe live-state remediation necessary to restore one unambiguous authoritative current remote identity for that logical path.

This is a bounded root-cause-and-repair task. It is not a remote-vault reset, not a clean bootstrap, and not permission to redesign synchronization architecture.

Do not begin B02 or later B–O validation.
Do not begin iPhone/iOS validation.
Do not begin Stage 3.
Do not wipe the remote vault.
Do not reset plugin state.
Do not reauthenticate.
Do not reinstall the plugin.
Do not manually edit ordinary user/clinical vault content.

---

## 1. CONFIRMED LIVE FAILURE — DO NOT REDIAGNOSE THE WRONG PROBLEM

B01 reached plan generation successfully on installed prerelease `0.1.11`.

The reviewed plan contained:

- the intended ordinary `upload-update` for `test-file-01.md`; and
- an unexpected `blocked-unsafe` for portable `app.json` because multiple distinct remote objects occupy the same logical path.

No plan execution occurred.
No B01 fixture mutation was synchronized.
No retry/reset/reauthentication/reinstall/manual Drive mutation occurred.

The pre-action B01 authority state was otherwise coherent:

- state revision `state:86`;
- semantic generation `semantic:13`;
- BASE/mappings `13 / 13`;
- completed authority operations `26`;
- v1.1 intents `5` complete / `0` pending;
- tombstones `0`;
- recovery `false`;
- attention `0`;
- device/vault/managed-root pairing intact.

The preferred B01 fixture `test-file-01.md` was converged local/BASE/remote before the plan.

Treat the duplicate portable-config identity condition as the blocker.

---

## 2. A03 HISTORY THAT MUST BE RECONCILED CAUSALLY

A03 `0.1.11` first-sync conflict resolution previously succeeded for the same logical path.

Before A03 resolution, the remote predecessor was:

- logical path: `__brain_sync_portable_config__/app.json`
- Drive object ID: `17BEbRR4zvjNN7ul3bjOfr37rTiY3gBN3`
- size: `351` bytes
- SHA-256: `ce2304324355039203028525c098a12887521a851c24bbaa6aee3a14700f8891`
- revision: `0B0aJZGoaaV1YK3ZrOEllemE0VVVOcnJGUFVHVGxJRlhaMDJnPQ`

A03 `Keep local` then produced/selected the current authoritative object:

- Drive object ID: `1dY96IomB5CC76N0UtyLclKvIzgZSMXKu`
- size: `376` bytes
- SHA-256: `633ad96b092359349fe8a91c5343b3631b197e16da775e4e5c04c28be5babeea`
- revision: `0B0aJZGoaaV1YR2o1WEpaeVdwR3hNc3FEN0xWamhKK2Joc3JzPQ`

A03 evidence recorded that BASE and remote mapping pointed to the current object while the predecessor remained present and unchanged.

B01 now proves that this state is not acceptable to the subsequent ordinary planner because both objects are being treated as occupants of the same logical path.

You must determine whether:

1. A03 resolution created a new current object but failed to retire/relocate/trash/supersede the predecessor in a way the normal remote snapshot understands;
2. remote enumeration/path normalization is incorrectly treating a legitimate historical/predecessor object as current occupancy;
3. authoritative mapping/BASE evidence is incorrectly ignored when resolving duplicate remote identities;
4. a Drive update path incorrectly creates replacement objects instead of preserving/updating identity;
5. stale or orphaned objects from an earlier failure/retry remain in the managed root;
6. portable-config handling creates a path-specific identity defect;
7. or another causally demonstrated mechanism produced the ambiguity.

Do not assume any of these. Prove the actual mechanism from live evidence plus code.

---

## 3. PHASE A — COMPLETE READ-ONLY LIVE FORENSICS FIRST

Before changing code or remote state, capture a read-only forensic record sufficient to reconstruct the duplicate condition.

For every live or otherwise planner-visible remote object that resolves to:

`__brain_sync_portable_config__/app.json`

capture at minimum:

- Drive object ID;
- exact parent ID(s);
- exact remote name/path components;
- trashed state;
- MIME/type metadata relevant to classification;
- created/modified timestamps as advisory metadata only;
- size;
- SHA-256 from independently fetched bytes where possible;
- current Drive revision/version identity where available;
- app/property metadata used by this plugin, if any;
- whether the object is returned by the product's ordinary managed-root listing;
- whether it is returned by incremental Changes API state, if relevant;
- whether current durable mapping points to it;
- whether current BASE evidence corresponds to it;
- whether any durable intent/audit/conflict-resolution record names it;
- whether it was predecessor/current candidate during A03.

Also capture:

- the exact B01 plan operation/reason metadata for the `blocked-unsafe` entry;
- the exact remote-snapshot representation that led to ambiguity;
- all relevant mapping/BASE/tombstone records for the logical path;
- relevant A03 conflict-resolution audit and operation records;
- whether any other logical path currently has the same multi-object condition.

Do not dump credentials, OAuth tokens, or raw secret-bearing plugin state into evidence.

Do not mutate Drive during Phase A.

---

## 4. PHASE B — TRACE THE FULL PRODUCT CAUSAL PATH

Trace the complete code path from live Drive enumeration through snapshot assembly, duplicate/path ambiguity detection, conflict resolution, execution, remote write semantics, BASE/mapping commit, and subsequent planning.

Inspect every directly relevant implementation and regression surface necessary to answer these questions:

### 4.1 Creation of the A03 current object

Determine exactly which production code path handled A03 `Keep local` for the no-BASE first-sync conflict and whether it:

- updated the predecessor object in place;
- created a new object;
- created a replacement and retained the old object;
- intentionally preserved both;
- or followed another path.

Identify the exact operation contract and Drive adapter call that produced object `1dY96...`.

### 4.2 Meaning of predecessor preservation

Determine whether the product specification/contracts actually require an old remote object to remain as a second live same-path object after successful resolution.

Distinguish carefully between:

- revision/history preservation on one Drive object;
- recoverable trash/supersession;
- conflict-copy preservation under a distinct path/name;
- durable audit/history metadata;
- and two live objects occupying one synchronization logical path.

Do not treat these as equivalent.

### 4.3 Subsequent planner behavior

Determine why the ordinary B01 planner correctly or incorrectly classified the remote state as `blocked-unsafe` despite BASE/mapping pointing to `1dY96...`.

Establish whether ambiguity detection is behaving correctly against an invalid remote state, or whether ambiguity detection itself has a defect.

### 4.4 Identity-update semantics generally

Audit the relevant remote create/update/replacement semantics for ordinary notes and portable config sufficiently to determine whether this can recur beyond `app.json`.

The repair must not merely special-case this filename if the same mechanism can affect any existing mapped remote object.

---

## 5. ROOT-CAUSE GATE

Before implementing a repair, write a concise causal statement that names:

- the production operation that created or retained each conflicting remote identity;
- why both remained planner-visible under the same logical path;
- why durable mapping/BASE did or did not prevent the ambiguity;
- whether current `blocked-unsafe` behavior is correct;
- whether the defect is in A03 conflict-resolution execution, remote write semantics, remote snapshot assembly, identity selection, or another exact layer;
- whether the condition can recur for non-portable-config files.

If you cannot establish this causally from code plus live evidence, STOP with:

`B01 DUPLICATE-IDENTITY ROOT CAUSE NOT PROVEN — SUPERVISOR DECISION REQUIRED`

Do not guess and do not mutate live remote state.

---

## 6. REPAIR AUTHORITY

If root cause is proven, implement the minimum production repair necessary to ensure that after a successful authoritative update/conflict resolution:

- exactly one planner-visible authoritative current object occupies the logical synchronization path;
- historical/recovery evidence is preserved by a mechanism that does not masquerade as a second current path occupant;
- BASE/mapping authority advances only after verified durable remote effect;
- crash/retry semantics remain fail-closed;
- duplicate genuine current objects remain `blocked-unsafe` rather than being silently guessed away;
- existing wrong-account/root/path protections remain intact;
- no timestamp-winner logic is introduced;
- no path-specific `app.json` exception is used unless the governing product contract genuinely requires portable-config-specific semantics.

You may modify only the smallest production/test surface actually required by the proven root cause.

Do not redesign synchronization architecture.
Do not weaken duplicate-identity safety checks merely to make B01 pass.
Do not teach the planner to ignore unexplained duplicates just because one happens to match current mapping.

---

## 7. MANDATORY REGRESSION PROOF

Add focused automated regressions that reproduce the exact causal sequence, not merely the final error string.

At minimum, prove:

1. Starting from the relevant no-BASE/first-sync conflict state, `Keep local` completes through the repaired production path.
2. The resulting remote state has one planner-visible authoritative current logical-path occupant.
3. A subsequent ordinary Verify/Reconcile does not produce `blocked-unsafe` for that path.
4. BASE/mapping point to the correct current identity/content.
5. Historical/predecessor evidence required by the product is still retained safely without same-path live ambiguity.
6. A genuinely unexplained pair of live same-path remote objects still produces `blocked-unsafe`.
7. Restart/recovery between remote effect and authority commit remains safe.
8. If the mechanism is general, include at least one ordinary non-portable file regression proving it is not fixed only for `app.json`.

Run focused tests and the full repository verification required by the current Phase 6 standard.

Do not accept a repair with only a mocked assertion that bypasses the real production composition path responsible for A03/B01.

---

## 8. LIVE-STATE REMEDIATION — ONLY AFTER CODE ROOT CAUSE IS PROVEN

The current live remote state must not be erased wholesale.

After the causal defect is proven and the repair candidate passes automated verification, determine the smallest safe remediation for the existing duplicate `app.json` objects.

Preferred remediation principles:

- preserve the forensic record first;
- preserve the currently authoritative `376`-byte content and mapping identity unless the proven repair requires an identity-preserving alternative;
- do not permanently delete evidence;
- use recoverable trash/relocation/supersession only if that action is conclusively correct under the product contract;
- do not wipe the managed root;
- do not touch unrelated remote objects;
- do not reset BASE/mappings to force convergence;
- do not manufacture a new first-sync state.

If the correct remediation is unambiguous and recoverable, you are authorized to perform that one targeted remediation for the stale/non-authoritative duplicate only after recording its exact Drive ID/content/hash/revision and after confirming the authoritative current object/content remains protected.

If remediation would require permanent deletion, broad remote reorganization, authority reset, or any uncertain choice between objects, STOP for supervisor decision before mutation.

After targeted remediation, perform read-only verification that:

- exactly one planner-visible current object occupies `__brain_sync_portable_config__/app.json`;
- authoritative BASE/mapping still point coherently to current content/identity;
- no unrelated remote object changed;
- no auth/pairing/state reset occurred.

Do NOT rerun B01 in this task.

---

## 9. RELEASE / INSTALL BOUNDARY

If production source changes, do not patch the installed `0.1.11` plugin directly and do not silently run B01 against local build output.

Stop after producing the independently reviewable repair branch/evidence.

A new prerelease/install step will be separately supervisor-authorized after review.

If no production source change is required and the problem is proven to be solely stale live remote state, state that explicitly and provide the evidence supporting that conclusion.

---

## 10. VERIFICATION / EVIDENCE

Record a bounded evidence package under the existing Phase 6 live evidence root covering:

- pre-remediation remote identity inventory;
- exact causal code trace with file/function references;
- root-cause statement;
- repair diff manifest;
- focused regression results;
- full repository verification results;
- live remediation details if performed;
- post-remediation remote identity inventory;
- proof unrelated objects/state were not mutated;
- any remaining blocker.

Do not commit raw secret-bearing diagnostics.

Update `dev/evidence/_ca-output.md` with the concise task result/evidence pointers required by repository convention.

---

## 11. HARD STOP CONDITIONS

Stop immediately and do not improvise if:

- root cause cannot be proven;
- multiple objects remain ambiguous as to which is authoritative;
- the proposed fix would weaken duplicate-identity fail-closed behavior;
- the fix requires broad architectural redesign;
- remediation would require permanent deletion or remote-vault reset;
- unrelated remote duplicates or corruption indicate a wider live-state incident not bounded to this mechanism;
- any secret/credential exposure is discovered;
- tests reveal a broader contract defect that cannot be safely fixed in this bounded task.

---

## 12. COMPLETION RESPONSE

Return:

- exact input SHA;
- repair branch;
- final HEAD;
- changed-file manifest;
- complete remote object inventory for the affected logical path;
- exact causal root cause;
- whether A03 predecessor preservation was valid or itself the defect;
- whether the bug is path-specific or general;
- exact production repair made, if any;
- focused regression results;
- full verification results;
- live remediation performed, if any, including exact object ID affected and recoverability;
- post-remediation authoritative current object count;
- BASE/mapping coherence result;
- unrelated-remote-mutation result;
- whether a new prerelease is required;
- confirmation B01 was not rerun;
- confirmation B02–O/iPhone/Stage 3 were not started;
- remaining blocker, if any.

If root cause is proven, repair is complete, tests pass, and any authorized targeted live remediation succeeds, end exactly:

`PHASE 6 B01 DUPLICATE REMOTE IDENTITY ROOT CAUSE PROVEN AND REPAIRED — READY FOR SUPERVISOR REVIEW — B01 NOT RERUN`

If root cause is proven but production repair requires supervisor review/release before live remediation can safely complete, end exactly:

`PHASE 6 B01 DUPLICATE REMOTE IDENTITY ROOT CAUSE PROVEN — REPAIR CANDIDATE READY FOR SUPERVISOR REVIEW — B01 NOT RERUN`

Otherwise end exactly:

`PHASE 6 B01 DUPLICATE REMOTE IDENTITY INVESTIGATION BLOCKED — SUPERVISOR DECISION REQUIRED — B01 NOT RERUN`
