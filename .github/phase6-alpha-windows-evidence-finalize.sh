#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF' >> dev/evidence/_ca-output.md

---

## Phase 6 Alpha Integration — Approved Windows Bounded-Read + Portable-Config Collision Repair

This append-only record establishes integration of the independently approved Windows first-sync repair without rewriting earlier Phase 6 history.

### Integration identity and topology

- integration agent: `agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01`;
- approved repair branch: `phase6-alpha-windows-bounded-read-fix`;
- approved repair head: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- dynamically tested production/test tree within that history: `8b7f320b0a9af86a933b200245694ee9c47ee854`;
- pre-integration `phase6-integration` head: `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`;
- pre-integration merge base: exactly `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`;
- topology before integration: approved repair was 14 commits ahead and 0 behind the integration head;
- integration method: **fast-forward only** through a non-forced ref update; no merge commit, rebase, cherry-pick, squash, conflict resolution, force-push, or history rewrite;
- post-fast-forward integration tree before evidence-only commits: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- independent review result for the repair before integration: `APPROVE`.

### Approved repair retained

The integrated repair preserves the Windows desktop bounded Node filesystem reader, the synthetic portable-configuration namespace, the selective portable configuration allowlist, and fail-closed reserved-namespace collision handling. Genuine `lstat` `ENOENT`/`ENOTDIR` can prove a missing path after prior existing ancestors pass containment. Once `lstat` proves a component exists, `realpath` is mandatory and every `realpath` failure, including `ENOENT`/`ENOTDIR`, propagates fail-closed. Symlink/junction/reparse escape, lexical escape, permission/access uncertainty, canonical outside-vault resolution, and actual or uncertain reserved-namespace occupancy remain blocked. Mobile-required runtime isolation and the generic HTTP reader remain unchanged.

### Supervisor/user-supplied physical Windows acceptance

The following is **supervisor/user-supplied physical supported-runtime evidence**; the cloud integration agent did not perform these physical actions.

- local repair-branch checkout: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- local `npm ci`: PASS;
- local `npm run build`: PASS;
- all five local build-verifier checks: PASS;
- locally reproduced `main.js`: `291213` bytes;
- local SHA-256: `EC8F4A572EB14ADDDAADB0D0656CED5A3761E373FC6A0A1C78F383D6CF667391`;
- installed `main.js`: `291213` bytes with the same SHA-256;
- Obsidian plugin load: PASS; status `idle-ready`;
- real `Sync now` preview: `275` planned operations;
- preview disposition: `safe-auto-eligible`;
- `274 upload-create`;
- `1 noop`;
- `0 blocked-unsafe`;
- `0` conflicts;
- `0` deletion operations;
- `0` trash operations;
- no destructive operation category;
- sole no-op: `__brain_sync_portable_config__/hotkeys.json`;
- no-op reason: `Neither side currently contains the never-established path.`;
- preview was closed without Execute;
- no first synchronization occurred;
- automatic synchronization remains disabled pending successful reviewed first synchronization.

**PHYSICAL WINDOWS REPAIR ACCEPTANCE: PASS**

This PASS is limited to repaired artifact reproduction, installation/load, and preview-only supported-runtime acceptance. First synchronization execution is not recorded as PASS.

### Fresh combined integration verification

After the fast-forward, existing Phase 6 PR `#15` against unchanged `master` generated a fresh combined clean gate.

- workflow: `Phase 1 CI`;
- run ID: `33031435312`;
- job ID: `98384624285`;
- job conclusion: SUCCESS;
- integration head contained in tested merge: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- unchanged master base: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- exact generated PR merge SHA: `44ebd6add7fe80f2233bffa2861e7f7d9be73043`;
- checkout log: `Merge bcdcf935de0fb49b518d90d7f886b932175f0015 into 54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 265 tests / 265 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: PASS;
- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js`: `291213` bytes;
- SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`.

The artifact identity exactly reproduced the approved repair artifact. The combined log also retained the Windows bounded-read, portable-collision/fail-closed canonical-resolution, generic HTTP-200 rejection, mobile isolation, and planner destructive-safety/recovery coverage.

### Remaining boundary

- first synchronization has not been executed;
- physical iPhone/iOS validation remains outstanding;
- the two accepted stock-iOS fail-closed limitations remain unresolved and are not represented as PASS;
- no OAuth secret/token, authorization code, PKCE material, SecretStorage value, or vault-note body was accessed by this integration agent;
- PR `#15` remains required to stay open/unmerged;
- `master` remains unchanged;
- Stage 3 has not begun.
EOF

cat <<'EOF' >> dev/evidence/phase6-integration-manifest.md

---

## Approved Windows First-Sync Repair Integration — Bounded Read + Portable Configuration

### Approved repair

- integration agent: `agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01`;
- repair branch: `phase6-alpha-windows-bounded-read-fix`;
- approved repair head: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- independently reviewed result: `APPROVE`;
- dynamically tested production/test tree: `8b7f320b0a9af86a933b200245694ee9c47ee854`;
- pre-integration `phase6-integration`: `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`;
- integration method: **fast-forward only**;
- fast-forwarded integration tree before evidence-only commits: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- no merge commit, rebase, cherry-pick, squash, conflict resolution, or force-push.

The approved repair integrates the Windows desktop bounded local-file reader, the portable-config false-collision correction, and the final fail-closed canonical-resolution correction. Missing-path acceptance is restricted to `lstat` `ENOENT`/`ENOTDIR`; after successful `lstat`, `realpath` must succeed and remain inside the canonical vault root. Reserved-namespace occupancy/uncertainty remains blocked and mobile isolation remains unchanged.

### Prior approved clean repair verification

- workflow: `Phase 6 Alpha Portable Collision CI`;
- run: `33023650014`;
- job: `98359805718`;
- exact checkout: `8b7f320b0a9af86a933b200245694ee9c47ee854`;
- tests: `265/265 PASS`;
- typecheck/build: PASS;
- all five build-verifier checks: PASS;
- `main.js`: `291213` bytes;
- SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`;
- later repair-branch commits through `bcdcf935...` were workflow cleanup/evidence only; no production/test file changed after the tested tree.

### Physical Windows acceptance

Recorded from **supervisor/user-supplied physical supported-runtime evidence**:

- local branch head: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- local `npm ci` and build: PASS;
- local/installed artifact: `291213` bytes, SHA-256 `EC8F4A572EB14ADDDAADB0D0656CED5A3761E373FC6A0A1C78F383D6CF667391`;
- plugin load status: `idle-ready`;
- preview: `275` planned operations, disposition `safe-auto-eligible`;
- `274 upload-create`, `1 noop`, `0 blocked-unsafe`;
- no conflicts, deletes, trash, or destructive operation category;
- no-op path: `__brain_sync_portable_config__/hotkeys.json`;
- no-op reason: `Neither side currently contains the never-established path.`;
- preview closed without Execute; no synchronization occurred.

**PHYSICAL WINDOWS REPAIR ACCEPTANCE: PASS**

### Fresh combined integration gate

- PR: `#15` — `phase6-integration` -> `master`;
- workflow: `Phase 1 CI`;
- run: `33031435312`;
- job: `98384624285`;
- tested generated PR merge SHA: `44ebd6add7fe80f2233bffa2861e7f7d9be73043`;
- merge contained integration head `bcdcf935de0fb49b518d90d7f886b932175f0015` over unchanged master `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: PASS;
- typecheck: PASS;
- tests: `265/265 PASS`, 0 fail/cancelled/skipped/todo;
- build: PASS;
- all five build-verifier checks: PASS;
- integrated `main.js`: `291213` bytes;
- SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`.

### Remaining Phase 6 boundary

- first-sync Execute has not occurred and first synchronization remains outstanding;
- physical iPhone/iOS validation remains outstanding;
- accepted stock-iOS fail-closed limitations remain unresolved;
- PR `#15` remains open/unmerged;
- `master` remains unchanged;
- Stage 3 has not begun.

Any subsequent commits after `bcdcf935de0fb49b518d90d7f886b932175f0015` in this integration session are evidence/documentation-only and must not change production/test/build behavior.
EOF

rm .github/phase6-alpha-windows-evidence-finalize.sh
rm .github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml

git config user.name 'phase6-alpha-integration-evidence'
git config user.email '48619728+woodpk@users.noreply.github.com'
git add dev/evidence/_ca-output.md dev/evidence/phase6-integration-manifest.md .github/phase6-alpha-windows-evidence-finalize.sh .github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml
git commit -m 'docs: record approved Windows first-sync repair integration'
git push origin HEAD:phase6-integration
