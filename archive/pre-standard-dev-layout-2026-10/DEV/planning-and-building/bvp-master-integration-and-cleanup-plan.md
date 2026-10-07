# BVP Final Review, Master Integration, and Construction Cleanup Plan

## 0. Status and Authority

**Status:** PLAN ONLY — NOT EXECUTED  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Prepared:** 2026-10-05  
**Target branch terminology:** throughout this document, **`master` means the one and only branch named `master`**.  
**Scope:** completed BRAIN Verification Platform (BVP) construction through accepted BVP-S08, independent final review/correction, integration into `master`, and post-construction branch/workspace cleanup before BVP-S09 physical validation.

This document does **not** authorize or perform any merge, branch deletion, force update, S09 execution, or Stage-3 work. Every execution-time SHA must be re-grounded immediately before the corresponding action because repository refs can move after this plan is written.

## 1. Executive Decision

The completed BVP must be integrated into `master` as **one reviewed integrated lineage**, not by separately merging the dozens of historical child-branch tips.

The current accepted BVP closure is represented by:

- accepted S08V verified source: `c9f035cc24fd16ff1aad8216367a81149dd58896`;
- accepted S08V evidence: `e9c635a9ffcf1a50aa461d16efb517b06626a6c6`;
- accepted S08V run: `cf16c8cc-179d-4fb9-8ca4-96aaad0bb742`;
- S08 administrative closure / current pre-plan `phase6-integration` head: `1605f5f7926d529bfad1b626b781ed16b42b55b9`;
- `bvp-s08v-primary-stage-acceptance` currently points to that same `1605f5f...` commit.

At the audit snapshot:

- `master` = `caf4a03418b89b57893e3bd5d4c6f89c28604242`;
- `phase6-integration` = `1605f5f7926d529bfad1b626b781ed16b42b55b9`;
- common ancestor = `7b4297adceb2fd6268a5801a207b7dce1f7b7728`;
- `phase6-integration` has **1,095 commits unique to its side**;
- `master` has **26 commits unique to its side**.

Therefore, the future operation is a **true reconciliation merge**. It must preserve the 26 `master` commits and may never be implemented by replacing, force-resetting, or blindly repointing `master` to the BVP line.

## 2. Why Individual BVP Branch Tips Must Not Be Merged

The branch audit found **81 current remote branches**, including **62 surviving `bvp-*` branches**.

Of those 62 BVP branches:

- `bvp-s08v-primary-stage-acceptance` is identical to the accepted pre-plan `phase6-integration` closure;
- `bvp-s08f-desktop-live-canary` is an ancestor of the completed integration line;
- the other **60 BVP branch tips are divergent** from the completed integration line.

That divergence does **not** mean 60 pieces of accepted code are missing. During construction, accepted implementation/evidence commits were promoted into `phase6-integration`, while child branches frequently accumulated later branch-local evidence, closure, rebinding, failed-attempt, or administrative commits. Several branches were also explicitly superseded by R1/R2 repair lines.

Consequently:

1. replaying branch tips would duplicate already-promoted work;
2. it would reintroduce superseded or failed states;
3. it could resurrect the retired legacy validation harness;
4. it could restore obsolete task-specific verifier tooling prohibited by the current PHX-CI architecture;
5. it would destroy the accepted ordering and correction history already represented by `phase6-integration`.

**Merge rule:** individual BVP branches are historical construction inputs. The future integration source is the final reviewed descendant of the completed `phase6-integration` lineage.

## 3. S01 Historical Branch Condition

No surviving remote branch is named `bvp-s01*`.

This is not a missing-build condition. S01 is recorded COMPLETE / ACCEPTED and its authority/archive transition is already present in the integrated lineage. Relevant integrated history includes, among other commits:

- `eb982c78ff94274974dfdbe916904e08ba338684` — `chore(bvp): establish replacement verification authority`, which established the legacy-harness archive and BVP authority;
- `ab62628f7e5940334fbaa753ee7490c1943f6f64` — decomposed the BVP primary stages and PHX-CI gates;
- `02b5abe6fe6b2acef2edb5beca85dffefc730d88` — aligned the S01 prompt records with the semantic-contract model.

The absence of surviving S01 branches therefore creates **no branch that must be merged separately**.

## 4. Special Divergent Branch Findings

### 4.1 `bvp-prompt-contract-rewrite` — DO NOT MERGE

Tip: `ade77583a9f6b8ca4b5fcabea6ee758a06ed5c76`

Its 56 branch-unique commits consist primarily of:

- owner governance files `AGENTS.md` and `dev/agents/00-CODES.md`; and
- temporary audit inventories under `dev/agents/audit/**` plus `dev/agents/_validation-governance-audit-inventory.jsonl`.

The current `phase6-integration` blobs for `AGENTS.md` and `dev/agents/00-CODES.md` are **byte-identical** to this branch. The temporary `dev/agents/audit/**` scratch material is absent from the completed integration tree and should remain absent.

**Disposition:** exclude branch tip. No required BVP code is stranded here.

### 4.2 `bvp-governance-metrics-base-policy-repair` — DO NOT MERGE TIP

Tip: `96980097eb0b4b7fcb8b301a0570349c2b88d4a4`

The accepted metrics-policy repair is already incorporated in the completed BVP:

- `dev/scripts/Get-TestingArchitectureMetrics.ps1` is byte-identical between this branch and `phase6-integration`;
- the architecture-metrics test in `phase6-integration` is a later state that correctly expects the completed S08 production-seam and live-device metrics (3 production-seam files and 727 live-device/relay/executor LOC rather than the branch's older 1-file / 0-LOC baseline).

**Disposition:** exclude branch tip; retain the later integrated metrics expectations.

### 4.3 `bvp-s02-remove-legacy-harness` — DO NOT MERGE

Tip: `83ff8a3370dc3bbdce2cf6077bc3b5ecc9065ecb`

Its branch-unique state includes the retired `src/validation/**` architecture, legacy validation tests, and obsolete task-specific retirement verifier `dev/scripts/Invoke-BvpS02LegacyHarnessRetirementVerification.ps1`.

The accepted S02 end state in `phase6-integration` intentionally removes these surfaces.

**Disposition:** never merge this branch tip. Doing so would reverse BVP-S02.

### 4.4 Explicit superseded S07 lines — DO NOT MERGE

The following branches are historical failed/superseded lines and must not be merged:

- `bvp-s07a-crash-commit-ambiguity`;
- `bvp-s07a-crash-commit-ambiguity-r1`;
- `bvp-s07b-state-cursor-listing-root-recovery`;
- `bvp-s07c-prereq-clone-restore-cancellation-controls`.

Their accepted replacements are represented by later R2/prerequisite/integration history. The current accepted integrated line contains the corrected semantics.

### 4.5 `bvp-s08f-desktop-live-canary` — ALREADY CONTAINED

Tip: `08a033956b3605ef2dc13f756f099b5ff37f5888`

This branch is an ancestor of the current completed integration line. Its corrected S08F tree was explicitly reconciled into S08V. It must not be merged separately.

### 4.6 `bvp-s08v-primary-stage-acceptance` — SAME COMPLETED LINE

Tip at audit: `1605f5f7926d529bfad1b626b781ed16b42b55b9`

At audit time this branch and `phase6-integration` were identical. It is not a second source to merge; it is another ref to the same completed BVP closure.

## 5. Complete Current BVP Branch Disposition

Every current `bvp-*` branch was compared against the completed `phase6-integration` line.

| Branch | Audit tip | Merge-plan disposition |
|---|---|---|
| `bvp-governance-metrics-base-policy-repair` | `96980097eb0b4b7fcb8b301a0570349c2b88d4a4` | Do not merge tip; accepted metrics repair already incorporated; later integrated expectations supersede branch baseline. |
| `bvp-prompt-contract-rewrite` | `ade77583a9f6b8ca4b5fcabea6ee758a06ed5c76` | Do not merge; required governance blobs already identical in integration; audit JSONL scratch is intentionally excluded. |
| `bvp-s02-remove-legacy-harness` | `83ff8a3370dc3bbdce2cf6077bc3b5ecc9065ecb` | Do not merge; contains retired harness/task-specific verifier state. |
| `bvp-s02a-retire-harness-tests` | `7fbaa15830d5df4975222024ab6b81868f037c5b` | Do not merge tip; accepted S02 retirement is represented by integrated S02V state. |
| `bvp-s02b-retire-harness-source` | `615f161329413605d29aaf8da9b758bc2cb80da4` | Do not merge tip; accepted S02 retirement is represented by integrated S02V state. |
| `bvp-s03a-test-platform-root-isolation` | `a9492c14637efec4e706d1d1ca149651fb4149b6` | Do not merge individually; accepted payload already promoted into integration. |
| `bvp-s03b-architecture-guard` | `c10558c8bad96ec4ee689feb6cc80df82de939a1` | Do not merge individually; accepted payload already promoted into integration. |
| `bvp-s03c-architecture-metrics-budget-gates` | `1c79a0e80cb2b935baf9754b694d3b6093de8872` | Do not merge individually; accepted payload already promoted into integration. |
| `bvp-s03d-phx-ci-repository-check` | `4b4d0acfa17b47b51957479f676f17136ced7bf1` | Do not merge individually; accepted payload already promoted into integration. |
| `bvp-s03v-baseline-repair` | `1d78986f3b677a62c4e5c4192d473be7be6dc603` | Do not merge tip; fixed-runtime accepted S03V state is already in integration. |
| `bvp-s04-local-vault-seam-prerequisite` | `d3d3aba9a474abc0c11beebf98764e4ae8092f6f` | Do not merge individually; accepted prerequisite is already integrated. |
| `bvp-s04a-stateful-in-memory-local-vault` | `7ca8f50b8a5411e8c3783bb8f1543b4d16024e27` | Do not merge tip; accepted corrected S04A state is already integrated. |
| `bvp-s04b-stateful-in-memory-drive-core` | `7180c21a668954be95230ec7081c025615903b27` | Do not merge tip; accepted corrected S04B state is already integrated. |
| `bvp-s04c-drive-feed-completeness-faults` | `3bc9805a053827eb8545748dc23f5e34e4a964c6` | Do not merge individually; accepted payload already promoted. |
| `bvp-s04d-per-device-state-time-restart` | `22df5e3035dc1d0eefbc2e55e8225472d06fe344` | Do not merge individually; accepted payload already promoted. |
| `bvp-s04e-virtual-world-production-composition` | `5e6b5bc0a5f6de3f159b64d57bccff7682548fdd` | Do not merge individually; accepted payload already promoted. |
| `bvp-s05a-typed-scenario-contract` | `f92d19a39ad684b82b9b13b5d172570e126c98e9` | Do not merge individually; accepted payload already promoted. |
| `bvp-s05b-external-deterministic-runner` | `4b013235f65c576dc52a254c3baf313b3f63f64a` | Do not merge individually; accepted payload already promoted. |
| `bvp-s05c-observations-assertions-evidence` | `98e69474d567ffab6c44abd3985ec9ba23a608d6` | Do not merge individually; accepted payload already promoted. |
| `bvp-s05d-bounded-checkpoint-resume` | `00b998ddaa9f8c1e3e07d9fb2d6dd40fd37c2e51` | Do not merge individually; accepted payload already promoted. |
| `bvp-s05e-declarative-canaries-cost-proof` | `e228001f2eaf0998cc87f7388533ce643477474c` | Do not merge individually; accepted payload already promoted. |
| `bvp-s05v-primary-stage-acceptance` | `94ced8dc48208b8e961329497bcb5603ed135c11` | Do not merge individually; S05 accepted stage state is already integrated. |
| `bvp-s06a-initialization-one-sided` | `495f183969760d02832ad7a3619ae692f6a46d4a` | Do not merge individually; accepted scenarios already promoted. |
| `bvp-s06b-merge-conflict-delete-modify` | `ea035749ab96bd23898a58c840354814b6a4df7d` | Do not merge individually; accepted scenarios already promoted. |
| `bvp-s06b-prereq-text-version-composition` | `ef031ed362ab361eb3a2e9148f82be8ccd9120bf` | Do not merge individually; accepted prerequisite already promoted. |
| `bvp-s06c-deletion-stale-clock-unreadable` | `98b7d0dc82abe5adb9015ed7d49533bebc8e4e95` | Do not merge individually; accepted corrected scenario state already promoted. |
| `bvp-s06c-prereq-local-access-time-controls` | `3bd762fe177c328dcf9cb51bd758c661a42a00e1` | Do not merge individually; accepted prerequisite already promoted. |
| `bvp-s06d-move-rename-identity-collision` | `c07a690f626323b40c61bf6ed930ffbe846a991f` | Do not merge individually; accepted scenario state already promoted. |
| `bvp-s06d-prereq-remote-move-fixture` | `a6a220891234cf60468cfefa2c692f4090782a00` | Do not merge individually; accepted prerequisite already promoted. |
| `bvp-s06e-exclusions-unknown-empty-folders` | `7384f88b1e5a0449dee78ccfa4c86e068c036b3f` | Do not merge individually; accepted scenarios already promoted. |
| `bvp-s06e-prereq-empty-folder-fixtures` | `a514c6b58ca6f16e53e7eec7c0db6f84c8b2bd1d` | Do not merge individually; accepted prerequisite already promoted. |
| `bvp-s06v-prereq-assigned-coverage-repair` | `515cb425e1192fd84a2e5d4edd75d9136606ba1c` | Do not merge individually; accepted coverage repair already promoted. |
| `bvp-s06v-primary-stage-acceptance` | `a278466a03daee96fec322646061395cf33a4254` | Do not merge individually; S06 accepted stage state already integrated. |
| `bvp-s07a-crash-commit-ambiguity` | `c65906554b3f8d8ef2f73f1572cad2fe95805d84` | **Superseded. Do not merge.** |
| `bvp-s07a-crash-commit-ambiguity-r1` | `e17d79ce731a5fde3a84a1ff9fe656a8b36f5be8` | **Superseded. Do not merge.** |
| `bvp-s07a-crash-commit-ambiguity-r2` | `6fb687d0382b2e3544a058455085409068b51647` | Do not merge tip separately; accepted R2 payload/evidence already promoted. |
| `bvp-s07a-prereq-crash-boundary-controls` | `69b1addc732b29112eaf2099ea164925ec1328dc` | Do not merge individually; accepted prerequisite/corrections already integrated. |
| `bvp-s07a-prereq-file-create-recovery-r1` | `60016a5d052fe13a4b1429612595f89c57da38b6` | Do not merge tip; accepted corrected recovery state already integrated. |
| `bvp-s07a-prereq-post-mutation-observation-failure` | `cfa2270f7d5ec57b671453c43bfa1d7491268ad9` | Do not merge individually; accepted prerequisite already integrated. |
| `bvp-s07a-prereq-verified-not-applied-recovery` | `d56a6327d5e53d818001fc6badc74b983b9c5d2e` | Do not merge tip separately; accepted corrected recovery lineage already integrated. |
| `bvp-s07b-prereq-automatic-incremental-sync` | `fa9e2482a255715bce2434682b81798a9acee627` | Do not merge individually; accepted prerequisite already integrated. |
| `bvp-s07b-prereq-persisted-recovery-gate` | `2929cff3a6a69cc1f67a14996bd464a53d9f415c` | Do not merge individually; accepted prerequisite already integrated. |
| `bvp-s07b-prereq-state-cursor-root-controls` | `87e2d003e156cc8cd3a0de9aeb3dc80ccf3c84d6` | Do not merge individually; accepted prerequisite already integrated. |
| `bvp-s07b-state-cursor-listing-root-recovery` | `87673857c9ddc63104499375da6f1860898edf84` | **Superseded by R2. Do not merge.** |
| `bvp-s07b-state-cursor-listing-root-recovery-r2` | `04b17585cb1a38562917c136d376476136822a06` | Do not merge tip separately; accepted R2 state already integrated. |
| `bvp-s07c-device-authority-cancellation` | `dfcc2c67a755548a231d74f0c235307365cc70d9` | Do not merge individually; accepted scenarios already integrated. |
| `bvp-s07c-prereq-clone-restore-cancellation-controls` | `46ff3a4128da47cb5ba736e05261340e1e1231aa` | **Superseded by R2. Do not merge.** |
| `bvp-s07c-prereq-clone-restore-cancellation-controls-r2` | `370d610c8249167bcb37436a51305d2132550f36` | Do not merge tip separately; accepted R2 prerequisite already integrated. |
| `bvp-s07d-transfer-integrity-retry-backoff` | `b8c06827689f69c73ccffabf8dd83a91066f019d` | Do not merge individually; accepted scenarios already integrated. |
| `bvp-s07e-prereq-resource-fault-controls` | `4c8036bdba08f66578105a3a3ae36d1ee3e27f74` | Do not merge individually; accepted prerequisite already integrated. |
| `bvp-s07e-quota-disk-destructive-config-lifecycle` | `e4c43f4775924b48e14c759971d42be4ab1c67a4` | Do not merge individually; accepted scenarios already integrated. |
| `bvp-s07f-deterministic-scale-resource-measurement` | `06843bc9f58e691591feffc00882b5c6c664ffd0` | Do not merge individually; accepted tests/measurement state already integrated. |
| `bvp-s07v-primary-stage-acceptance` | `9f30b3c0adb3d4d7c3fa015f4991830df5f636fa` | Do not merge individually; S07 accepted stage closure already integrated. |
| `bvp-s08a-production-run-receipt-seam` | `babae972d6f074bebf7ba1feaa16dde24f3bea13` | Do not merge individually; accepted seam already integrated. |
| `bvp-s08b-validation-only-obsidian-entrypoint` | `3a97a8cf7e428d1ae22e3eb584b21b4c472cd24d` | Do not merge individually; accepted validation-entrypoint state already integrated. |
| `bvp-s08c-device-command-agent` | `f40f02d9572c55bd9476e5238f42d2a6a42dae78` | Do not merge individually; accepted agent state already integrated. |
| `bvp-s08c-prereq-production-control-seam` | `aa08e9080e52cde56cdf36e8730827a35c3998fe` | Do not merge individually; accepted production-control seam already integrated. |
| `bvp-s08d-minimal-command-mailbox` | `0fcfc98431d2a8e5b2d73b430bb09051d2e861c3` | Do not merge individually; accepted mailbox/relay state already integrated. |
| `bvp-s08e-external-live-executor-checkpoints` | `b4849ea529f03dfa1b9778a60e4d44dd2bfc455e` | Do not merge tip separately; accepted repaired S08E state already integrated. |
| `bvp-s08e-prereq-runner-executor-seam` | `d3cae9822e530dcff7d6fdc4f96e921c87974ce9` | Do not merge individually; accepted single-runner seam already integrated. |
| `bvp-s08f-desktop-live-canary` | `08a033956b3605ef2dc13f756f099b5ff37f5888` | Already an ancestor of completed integration; do not merge separately. |
| `bvp-s08v-primary-stage-acceptance` | `1605f5f7926d529bfad1b626b781ed16b42b55b9` | Same completed closure as audit-time `phase6-integration`; reference only, not a second merge source. |

## 6. Adjacent Non-BVP Branches Reviewed

The remaining current branches were also reviewed so that legacy or unrelated work is not accidentally folded into the BVP merge.

| Branch | Audit tip | Disposition |
|---|---|---|
| `master` | `caf4a03418b89b57893e3bd5d4c6f89c28604242` | **Target. Never treat as a source branch to overwrite.** |
| `phase6-integration` | `1605f5f7926d529bfad1b626b781ed16b42b55b9` | **Completed BVP integration lineage / source baseline for final review.** |
| `phase6-01-test-phx-ci-prompt-migration` | `7bb31b975335a4e25f0bd1647ef93bd9a5e6cfbb` | Legacy-harness era; archived/superseded. Do not merge. |
| `phase6-d-series-tasking-refresh` | `78d835239b735a43ac62ee6a76e3d613711237b0` | Legacy-harness era tasking. Do not merge. |
| `phase6-h6b-conflict-resolution-driver-extension` | `7b10842bb568867f5f16538ef1a49cfb6879e05f` | Legacy-harness predecessor. Do not merge. |
| `phase6-h6c-production-diagnostic-correlation` | `952b2d244c34937d7f59e0d877b4ad1d9d6d0194` | Legacy-harness predecessor; H6C coupling was intentionally retired by BVP-S02. Do not merge. |
| `phase6-vh23-c-series-integration` | `25c49138345113ee8fc81f1ea11b0e5e8b729549` | Legacy validation-harness branch. Do not merge. |
| `phase6-vh23-phx-ci-runtime-pilot` | `072b43287f71ba1798519a9c692c6cb316438f88` | Legacy validation-harness/runtime pilot. Do not merge. |
| `phase6-vh24-d01-scenario` | `0b9d098628f2e6741f12923d8338be8cd34c2973` | Legacy validation scenario. Do not merge. |
| `phase6-vh25-d02-scenario` | `9e962a3ae9304fa9fb56f0b26f6deed96336c827` | Legacy validation scenario. Do not merge. |
| `phase6-vh25-d02-scenario-pre-h6b-restart` | `2a22dc5426802d5b3f6b9e2f4c34f4c967e9520e` | Historical pre-restart line. Do not merge. |
| `phase6-vh26-d03-scenario` | `afce5024a4f61db69b80536e7580b6f945995212` | Legacy validation scenario. Do not merge. |
| `phase6-vh27-d04-scenario` | `57906622e20eed5a7b9d50cc6f7d11efea6827f4` | Legacy validation scenario. Do not merge. |
| `phase6-vh27-d04-scenario-pre-h6b-restart` | `9fd72d38f8b4d829964f064c17694880bc2ba874` | Historical pre-restart line. Do not merge. |
| `phase6-vh28-d05-scenario` | `af0443811e38c456bdbce6602ae4ec246da07e9b` | Legacy validation scenario. Do not merge. |
| `phase6-vh28-d05-scenario-pre-h6b-restart` | `ef7b79bd926f72043122fdbcd0a79d470a6f84a0` | Historical pre-restart line. Do not merge. |
| `phase6-vh29-d06-scenario` | `9a1aed9bfb788d512df30574c2bc6e446f24039e` | Legacy validation scenario. Do not merge. |
| `phx-ci-repin-operator` | `68ec1759f08fdd5535881cadab0dfe3135bc7554` | Separate repin-tooling experiment; unique repin scripts are not part of accepted BVP. Exclude from BVP merge. |
| `security/moment-2.31.0-override` | `008a6480ae38fcc933482d08989aa4e1543a9eed` | Not a BVP source; its current branch-unique delta is only governance files already present elsewhere. Exclude from BVP merge; handle any future security work separately. |

## 7. Master-Only Work That Must Be Preserved

At the audit snapshot, the 26 `master`-only commits run from:

- `80e44bcdf11a91b40a6ad3d56002abb13155755c` — `docs(governance): lock current-protocol validation gate`

through:

- `caf4a03418b89b57893e3bd5d4c6f89c28604242` — `docs(agents): replace validation tooling tasking 57`.

These commits are overwhelmingly owner-governance/tasking updates. They must not be discarded.

Important observations:

1. `AGENTS.md` is byte-identical between audit-time `master` and `phase6-integration`.
2. `dev/agents/00-CODES.md` is byte-identical between audit-time `master` and `phase6-integration`.
3. Several still-active historical task files under `dev/agents/st2a/ph6/02-pre/**` and `03-obs/**` contain newer owner-locked validation replacement banners on `master` that are absent from the BVP integration side. Those `master` versions should be preserved.
4. Many old `dev/agents/st2a/ph6/04-lv/01-test/**` files were modified on `master` with the same replacement banner **but were intentionally removed from the active tree and archived by the BVP authority transition**.

### 7.1 Conflict rule for active non-archived task files

For still-active task files such as:

- `dev/agents/st2a/ph6/02-pre/phase6-h-final-authoritative-clean-verification-closure-task.md`;
- `dev/agents/st2a/ph6/02-pre/phase6-sync-adversarial-validation.md`;
- `dev/agents/st2a/ph6/03-obs/01-log/06c-log06-exact-sha-verification.md`;
- `dev/agents/st2a/ph6/03-obs/01-log/07-end-to-end-observability-verification.md`;

preserve the newer owner-locked `master` governance banner unless a later authoritative protocol update has superseded it.

### 7.2 Conflict rule for retired legacy-harness task files

For files under the retired active path `dev/agents/st2a/ph6/04-lv/01-test/**` that BVP-S01 moved to `dev/archive/legacy-validation-harness/**` or BVP-S02 rendered obsolete:

- **do not resurrect the active file merely because `master` modified it after the common ancestor**;
- preserve the BVP deletion/archive boundary;
- do not rewrite historical archive copies merely to inject the later `master` banner unless the owner separately requests such an archive-normalization change.

The governance intent is already preserved globally by the byte-identical current `AGENTS.md` and `dev/agents/00-CODES.md`.

## 8. Required Final Review Before Any Master Integration

Before constructing a merge candidate, perform the requested independent Codex review against one exact frozen completed-BVP commit.

### 8.1 Review candidate

Start from the then-current descendant of accepted S08 closure `1605f5f7926d529bfad1b626b781ed16b42b55b9`.

If only this plan or other documentation has been added since `1605f5f...`, verify that executable source/build/governance behavior is unchanged before freezing the Codex review SHA.

### 8.2 Required Codex review scope

Codex should independently review at least:

- `test-platform/**`;
- BVP-related `test/**`;
- approved production seams under `src/product/**` plus relevant `src/main.ts` wiring;
- `dev/governance/testing-platform-boundary.yaml`;
- architecture guard/metrics and PHX-CI repository-check integration;
- production/validation bundle isolation;
- deterministic virtual-world fidelity;
- single-runner ownership and executor boundaries;
- device command sequencing/idempotency/uncertain-outcome handling;
- mailbox/relay privacy and transport non-authority;
- checkpoint/restart/resume semantics;
- production-receipt terminal authority;
- evidence model and failure discrimination;
- dead code, duplicated architecture, accidental alternate runners, test-only production leakage, obsolete construction artifacts, and maintainability risks.

Codex findings should be classified at minimum:

- Critical;
- Major;
- Moderate;
- Minor;
- Informational.

The review itself is not a substitute for PHX-CI and should not become a second executable validation authority.

### 8.3 Correction rule

- Critical/Major findings must be resolved before merge.
- Moderate findings require explicit supervisor disposition: repair or consciously accept with rationale.
- Minor/Informational findings may be deferred if they do not threaten correctness, safety, architecture, evidence validity, or maintainability.
- Corrections must occur on a bounded review/correction branch descending from the frozen BVP review candidate.
- Any executable correctness verification after correction remains PHX-CI-owned.
- Material corrections should receive focused Codex re-review.

## 9. Final BVP Candidate Gate

The merge source must be one exact final candidate `R` satisfying all of the following:

1. descendant of the completed BVP integration lineage;
2. contains all accepted S01-S08 work;
3. contains no known superseded branch-tip payload;
4. no unresolved Critical/Major Codex findings;
5. PHX-CI Overall Verification PASS / Compatibility COMPLETE / exit 0;
6. architecture guard PASS;
7. architecture metrics within hard budgets;
8. production bundle exclusion PASS;
9. full repository verification PASS;
10. exact artifacts/hashes recorded;
11. canonical evidence published;
12. supervisor review accepts `R` as the sole BVP merge source.

The S08V accepted baseline immediately before final review was:

- focused integrated S08 scope: 137/137 PASS;
- full repository suite: 835/835 PASS;
- production seam: 187/350 logical LOC and 3/4 files;
- framework core: 3,996/4,000 logical TypeScript LOC / 10 modules;
- live-device/relay/executor: 727/750 logical TypeScript LOC;
- BVP PowerShell: 4/4 scripts and 1,492/1,500 LOC;
- scenario-specific production/PowerShell: 0/0;
- shipping `main.js`: 885,307 bytes;
- SHA-256: `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`.

If legitimate corrections change counts or hashes, the final candidate must record and justify the new accepted values rather than mechanically requiring the old numbers.

## 10. Recommended Merge Construction

Do **not** merge directly into `master` first.

### 10.1 Freeze execution-time identities

Immediately before merge construction:

- resolve exact current `master` SHA as `M`;
- resolve exact final reviewed BVP candidate SHA as `R`;
- record both;
- verify no unexpected branch movement;
- create a disposable integration/reconciliation branch from **exactly `M`**.

### 10.2 Create a normal two-parent reconciliation merge

Merge `R` into the branch based on `M`.

The resulting candidate `C` must have:

- first lineage rooted in current `master`;
- second lineage containing final reviewed BVP history;
- a tree that preserves current `master` work plus the accepted BVP.

Never use:

- `git reset --hard` to replace `master`;
- force-push of `master`;
- an ours-only merge that discards BVP content;
- a theirs-only tree replacement that discards `master` content;
- sequential merging of all child BVP branch tips.

## 11. Merge Conflict Resolution Policy

Every conflict must be resolved semantically; no global “ours” or “theirs” strategy is acceptable.

### 11.1 BVP implementation and architecture surfaces

For `test-platform/**`, approved BVP production seams, BVP tests, BVP governance manifest, BVP architecture guard/metrics, and BVP PHX-CI integration:

- the final reviewed BVP candidate `R` is the source of accepted BVP semantics;
- if `master` independently changed the same implementation surface after the common ancestor, inspect that specific overlap and combine only compatible intent;
- do not silently drop either a newer production fix or an accepted BVP safety contract.

### 11.2 Owner governance

Preserve the strongest/current owner-locked validation governance.

At the audit snapshot, `AGENTS.md` and `dev/agents/00-CODES.md` are already byte-identical on both sides.

### 11.3 Active historical tasking outside the archived harness

Preserve `master`'s newer owner-locked replacement banner on still-active task files unless a later authority supersedes it.

### 11.4 Retired legacy validation harness

Preserve BVP archive/deletion decisions. Never recreate active:

- `src/validation/**`;
- legacy validation-harness tests;
- H6C-only validation coupling that S02 removed;
- retired task-specific verifier scripts;
- active legacy `04-lv/01-test/**` tasking that S01 archived.

### 11.5 Prompt-rewrite audit scratch

Do not introduce `dev/agents/audit/**` or `dev/agents/_validation-governance-audit-inventory.jsonl` from the prompt-contract-rewrite branch unless a new explicit decision says those temporary audit artifacts belong in the permanent repository.

### 11.6 Evidence

Preserve immutable accepted evidence/history. For canonical mutable evidence paths such as `dev/_ca-output.md` / `dev/_ca-output.json`, the final PHX-CI run against the reconciliation candidate becomes authoritative; do not hand-merge stale canonical evidence into an apparently plausible result.

## 12. Pre-PHX-CI Reconciliation Audit

Before asking PHX-CI to validate candidate `C`, perform a non-executable repository inspection proving:

- `C` descends from exact `M` and exact `R`;
- no `master`-only production/configuration change was silently lost;
- no superseded `bvp-*` tip was separately replayed;
- no active `src/validation/**` was resurrected;
- no obsolete task-specific verifier was resurrected;
- no prompt-audit scratch was introduced;
- BVP boundary/governance files match the final reviewed candidate except for deliberate merge resolutions;
- active owner governance remains present;
- old archived harness remains inert;
- `git diff`/tree review identifies every manual conflict resolution explicitly.

## 13. PHX-CI Acceptance of the Actual Merged Tree

Authoritative executable verification must run through the PHX-CI runtime selected by the candidate's exact `phx-ci.json`.

The verification target must be the exact reconciliation commit `C` that is intended to become `master`, not merely the pre-merge BVP source `R`.

Required result:

- exact source/head identity confirmed;
- change-set verification PASS;
- repository verification PASS;
- overall verification PASS;
- compatibility COMPLETE;
- exit code 0;
- typecheck PASS;
- focused BVP scope PASS;
- complete repository tests PASS;
- build PASS;
- repository check PASS;
- architecture guard PASS;
- architecture metrics PASS;
- artifacts PASS;
- canonical evidence published;
- control checkout preserved.

If merge conflict resolution changes executable files, Codex should inspect the resolved diff before or immediately after this PHX-CI gate.

## 14. Promotion of the Verified Candidate to Master

Only after candidate `C` is accepted:

1. re-read current `master` and require it still equals frozen `M`;
2. if `master` moved, **stop** and reconstruct/reconcile a new candidate from the new `master` head;
3. if `master` still equals `M`, fast-forward `master` to exact verified commit `C` using an expected-SHA lease;
4. confirm `master == C`;
5. confirm the `master` tree is byte-for-byte the PHX-CI-verified candidate tree.

Because `C` is constructed from `M`, this promotion should be a fast-forward. No force update is permitted.

A second owner execution should not be requested merely to prove that a ref now names the already-verified exact commit, unless the then-current operating protocol specifically requires branch-name-specific re-execution.

## 15. Post-Merge Repository State

After promotion, `master` should contain, in one repository tree:

- actual plugin production code;
- ordinary tests;
- complete BVP under `test-platform/**`;
- approved narrow production BVP seams;
- BVP architecture/governance enforcement;
- PHX-CI integration;
- BVP task/acceptance records;
- immutable verification evidence;
- inert legacy-harness archive;
- this merge/cleanup plan.

S09 should then be rebound to the exact accepted `master` SHA before any physical validation begins.

## 16. Cleanup Plan After Verified Master Promotion

Cleanup occurs **after**, never before, successful master promotion.

### 16.1 Preserve a durable milestone reference

Create a durable tag or equivalent immutable milestone reference for the final reviewed/merged BVP state. The exact name may follow repository convention, but it should unambiguously mean “completed reviewed BVP through S08, merged to master.”

### 16.2 Update durable project state

Update at minimum:

- `dev/planning-and-building/project-state.yaml`;
- `dev/planning-and-building/supervisor-continuity-log.md`;
- BVP session index/closure records where appropriate.

The durable state should say:

- BVP S01-S08 construction complete;
- independent final review complete;
- final corrected BVP merged into `master`;
- exact `master` SHA and evidence;
- S09 physical validation is next;
- Stage 3 remains pending.

### 16.3 BVP child-branch cleanup

After proving the final accepted history/tree is safely represented by `master` and the milestone reference, the surviving `bvp-*` construction branches are candidates for deletion.

Do not delete in one blind bulk operation. Use an audited inventory and batch cleanup with these safeguards:

- protect `master`;
- protect any branch actively used for unresolved final review/correction;
- protect any branch still referenced by an open PR;
- prove no branch contains unique accepted code absent from `master`;
- record deleted branch name and final tip SHA;
- verify each batch after deletion.

### 16.4 `phase6-integration`

Do **not** immediately delete `phase6-integration` merely because `master` now contains the BVP.

Recommended handling:

1. freeze it as read-only immediately after successful master integration;
2. rebind S09 to the accepted `master` SHA;
3. retain `phase6-integration` temporarily until S09 entry is stable and no remaining Phase-6 workflow depends on that branch name;
4. then make a separate explicit decision to delete or permanently retire it.

### 16.5 Legacy Phase-6 branches

The old `phase6-vh*`, H6B/H6C, and related branches are not BVP merge sources. They may be cleanup candidates, but their deletion should occur only after a separate reachability/history-preservation audit because several contain unique historical commits even though their active architecture is superseded.

### 16.6 Local cleanup

After remote state is settled:

- remove disposable review/reconciliation worktrees;
- remove temporary `C:\temp-<guid>\` roots created by engineering work when no longer needed;
- prune deleted remote refs;
- confirm the control checkout is clean;
- do not delete PHX-CI immutable evidence or archived historical material merely for tidiness.

## 17. Abort Conditions

Stop the merge process immediately if any of the following occurs:

- current `master` moves after `M` is frozen;
- Codex finds unresolved Critical/Major defects;
- final BVP corrections have not passed PHX-CI;
- a supposedly historical branch is discovered to contain unique accepted implementation absent from `R`;
- merge resolution would require reintroducing the retired legacy harness or bypassing current governance;
- the reconciliation candidate loses a `master`-only production/configuration change;
- architecture guard or budget fails;
- production bundle unexpectedly contains BVP validation-only code;
- PHX-CI does not return complete PASS;
- evidence publication identifies a different source SHA than `C`.

## 18. Execution Sequence Summary

When this plan is later authorized for execution, the order is:

1. Freeze exact completed BVP review candidate.
2. Independent Codex review of the entire BVP.
3. Repair material findings on a bounded correction branch if required.
4. PHX-CI-accept the final reviewed BVP candidate `R`.
5. Freeze current `master` SHA `M`.
6. Create reconciliation branch from exact `M`.
7. Merge exact `R` once.
8. Resolve conflicts using §11; do not replay child branches.
9. Perform static reconciliation audit.
10. Codex review of material merge-resolution diffs if any.
11. Run authoritative PHX-CI against exact reconciliation commit `C`.
12. If PASS and `master` still equals `M`, fast-forward `master` to exact `C` under lease.
13. Confirm `master == C`.
14. Record milestone/tag and durable state.
15. Rebind S09 to exact `master`.
16. Audit and delete obsolete BVP construction branches in controlled batches.
17. Retain `phase6-integration` temporarily until S09 no longer depends on it.
18. Clean disposable local worktrees/temp roots.
19. Begin S09A only after the above closure is complete.

## 19. Final Recommendation

**Do not merge the 62 BVP branch tips into `master`.**

Use the completed `phase6-integration` lineage as the sole consolidation source, subject it to the requested independent Codex final review and any necessary corrections, construct one reconciliation merge on top of the then-current `master`, verify that exact merged tree with PHX-CI, and only then fast-forward `master` to the verified commit.

This preserves the accepted BVP correction history, preserves all current `master` work, avoids resurrection of superseded harness code, and leaves the repository in the simplest long-term state: the actual plugin and its permanent automated testing platform together on `master`, with historical construction branches removable after proof of safe consolidation.
