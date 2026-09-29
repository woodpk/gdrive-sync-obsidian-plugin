# BVP Child-Session Task Index

**Authority:** Stage-2A execution index
**Primary work packages:** BVP-S01 through BVP-S09
**Shared execution contract:** `00-execution-contract.md`

## 1. Prompt Model

Every task file in this tree is prewritten as a stable semantic contract.

- **COMPLETE / NON-EXECUTABLE** files are historical execution/acceptance records and authorize no new work.
- **EXECUTABLE** means the stable contract has been repository-grounded and all required runtime-binding facts have been filled.
- **PREPLANNED / NOT-YET-EXECUTABLE** means the stable behavior/semantics/invariants/dependencies/acceptance/non-goals are already fixed, but execution-time repository coordinates required by `00-execution-contract.md` remain unbound.

A PREPLANNED task is not a placeholder for later design. Dispatch binding supplies hard repository facts only and may not redefine the task's substantive contract.

## 2. Session Index

| Child | Primary stage | Status | Task |
|---|---|---|---|
| 01A | S01 — Authority / Archive Transition | COMPLETE | `01-authority-archive-transition/01a-persist-bvp-authority-and-decision-supersession.md` |
| 01B | S01 — Authority / Archive Transition | COMPLETE | `01-authority-archive-transition/01b-archive-legacy-dev-harness-material.md` |
| 01V | S01 — Authority / Archive Transition | COMPLETE | `01-authority-archive-transition/01v-authority-archive-acceptance.md` |
| 02A | S02 — Legacy Executable Retirement | COMPLETE | `02-legacy-executable-retirement/02a-retire-harness-only-test-support-surface.md` |
| 02B | S02 — Legacy Executable Retirement | COMPLETE | `02-legacy-executable-retirement/02b-retire-harness-source-and-production-coupling.md` |
| 02V | S02 — Legacy Executable Retirement | COMPLETE | `02-legacy-executable-retirement/02v-primary-stage-phx-ci-acceptance.md` |
| 03A | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | COMPLETE | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03a-create-test-platform-root-and-shipping-isolation.md` |
| 03B | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | COMPLETE | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03b-implement-architecture-guard.md` |
| 03C | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | COMPLETE | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03c-implement-architecture-metrics-and-budget-gates.md` |
| 03D | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | COMPLETE | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03d-wire-guard-and-metrics-into-phx-ci-repository-check.md` |
| 03V | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | COMPLETE | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03v-primary-stage-phx-ci-acceptance-and-architecture-baseline.md` |
| 04A | S04 — Deterministic Multi-Device Virtual World | COMPLETE | `04-deterministic-multi-device-virtual-world/04a-stateful-in-memory-local-vault.md` |
| 04B | S04 — Deterministic Multi-Device Virtual World | COMPLETE | `04-deterministic-multi-device-virtual-world/04b-stateful-in-memory-drive-core.md` |
| 04C | S04 — Deterministic Multi-Device Virtual World | COMPLETE | `04-deterministic-multi-device-virtual-world/04c-drive-change-feed-completeness-ambiguity-and-faults.md` |
| 04D | S04 — Deterministic Multi-Device Virtual World | COMPLETE | `04-deterministic-multi-device-virtual-world/04d-per-device-durable-state-deterministic-time-order-restart.md` |
| 04E | S04 — Deterministic Multi-Device Virtual World | COMPLETE | `04-deterministic-multi-device-virtual-world/04e-virtual-world-composition-over-real-production-logic.md` |
| 04V | S04 — Deterministic Multi-Device Virtual World | COMPLETE | `04-deterministic-multi-device-virtual-world/04v-primary-stage-phx-ci-acceptance.md` |
| 05A | S05 — Declarative Scenario Runner / Assertions / Evidence | COMPLETE | `05-declarative-scenario-runner-assertions-evidence/05a-typed-scenario-contract-and-small-step-vocabulary.md` |
| 05B | S05 — Declarative Scenario Runner / Assertions / Evidence | COMPLETE | `05-declarative-scenario-runner-assertions-evidence/05b-external-deterministic-runner-core.md` |
| 05C | S05 — Declarative Scenario Runner / Assertions / Evidence | COMPLETE | `05-declarative-scenario-runner-assertions-evidence/05c-generic-observations-assertions-and-canonical-evidence.md` |
| 05D | S05 — Declarative Scenario Runner / Assertions / Evidence | COMPLETE | `05-declarative-scenario-runner-assertions-evidence/05d-bounded-checkpoint-resume-representation.md` |
| 05E | S05 — Declarative Scenario Runner / Assertions / Evidence | COMPLETE | `05-declarative-scenario-runner-assertions-evidence/05e-declarative-canaries-and-scenario-cost-proof.md` |
| 05V | S05 — Declarative Scenario Runner / Assertions / Evidence | COMPLETE | `05-declarative-scenario-runner-assertions-evidence/05v-primary-stage-phx-ci-acceptance.md` |
| 06A | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | COMPLETE | `06-deterministic-reconciliation-conflict-move-delet/06a-initialization-and-one-sided-synchronization-scenarios.md` |
| 06B | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | COMPLETE | `06-deterministic-reconciliation-conflict-move-delet/06b-merge-conflict-and-delete-vs-modify-scenarios.md` |
| 06C | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | EXECUTABLE | `06-deterministic-reconciliation-conflict-move-delet/06c-deletion-stale-device-clock-skew-and-unreadable-path-scenarios.md` |
| 06D | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | PREPLANNED | `06-deterministic-reconciliation-conflict-move-delet/06d-move-rename-identity-and-path-collision-scenarios.md` |
| 06E | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | PREPLANNED | `06-deterministic-reconciliation-conflict-move-delet/06e-exclusions-unknown-files-and-empty-folder-scenarios.md` |
| 06V | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | PREPLANNED | `06-deterministic-reconciliation-conflict-move-delet/06v-primary-stage-phx-ci-acceptance-and-coverage-reconciliation.md` |
| 07A | S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage | PREPLANNED | `07-deterministic-crash-recovery-fault-safety-scale-/07a-crash-commit-order-and-ambiguous-result-scenarios.md` |
| 07B | S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage | PREPLANNED | `07-deterministic-crash-recovery-fault-safety-scale-/07b-state-cursor-listing-root-recovery-scenarios.md` |
| 07C | S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage | PREPLANNED | `07-deterministic-crash-recovery-fault-safety-scale-/07c-device-authority-and-cancellation-scenarios.md` |
| 07D | S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage | PREPLANNED | `07-deterministic-crash-recovery-fault-safety-scale-/07d-transfer-integrity-and-retry-backoff-scenarios.md` |
| 07E | S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage | PREPLANNED | `07-deterministic-crash-recovery-fault-safety-scale-/07e-quota-disk-destructive-safety-config-and-lifecycle-deterministic-scenarios.md` |
| 07F | S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage | PREPLANNED | `07-deterministic-crash-recovery-fault-safety-scale-/07f-deterministic-scale-and-resource-measurement.md` |
| 07V | S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage | PREPLANNED | `07-deterministic-crash-recovery-fault-safety-scale-/07v-primary-stage-phx-ci-acceptance-and-mandatory-architecture-review.md` |
| 08A | S08 — Thin Live-Device Agent / Production Receipt / Command Transport | PREPLANNED | `08-thin-live-device-agent-production-receipt-comman/08a-narrow-production-run-receipt-seam.md` |
| 08B | S08 — Thin Live-Device Agent / Production Receipt / Command Transport | PREPLANNED | `08-thin-live-device-agent-production-receipt-comman/08b-validation-only-obsidian-build-entrypoint.md` |
| 08C | S08 — Thin Live-Device Agent / Production Receipt / Command Transport | PREPLANNED | `08-thin-live-device-agent-production-receipt-comman/08c-bounded-device-command-agent-and-sequence-safety.md` |
| 08D | S08 — Thin Live-Device Agent / Production Receipt / Command Transport | PREPLANNED | `08-thin-live-device-agent-production-receipt-comman/08d-minimal-command-mailbox-and-windows-relay.md` |
| 08E | S08 — Thin Live-Device Agent / Production Receipt / Command Transport | PREPLANNED | `08-thin-live-device-agent-production-receipt-comman/08e-external-live-executor-and-human-checkpoints.md` |
| 08F | S08 — Thin Live-Device Agent / Production Receipt / Command Transport | PREPLANNED | `08-thin-live-device-agent-production-receipt-comman/08f-desktop-live-canary-and-production-bundle-isolation-proof.md` |
| 08V | S08 — Thin Live-Device Agent / Production Receipt / Command Transport | PREPLANNED | `08-thin-live-device-agent-production-receipt-comman/08v-primary-stage-phx-ci-acceptance-and-architecture-review.md` |
| 09A | S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness | PREPLANNED | `09-strategic-physical-coverage-evidence-closure-sta/09a-windows-ios-install-authentication-and-pairing-baseline.md` |
| 09B | S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness | PREPLANNED | `09-strategic-physical-coverage-evidence-closure-sta/09b-physical-bidirectional-synchronization-and-representative-conflict.md` |
| 09C | S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness | PREPLANNED | `09-strategic-physical-coverage-evidence-closure-sta/09c-physical-offline-reconnect-and-interruption-resume.md` |
| 09D | S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness | PREPLANNED | `09-strategic-physical-coverage-evidence-closure-sta/09d-physical-path-platform-and-resource-large-transfer-coverage.md` |
| 09E | S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness | PREPLANNED | `09-strategic-physical-coverage-evidence-closure-sta/09e-physical-auth-revocation-and-lifecycle-safety.md` |
| 09F | S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness | PREPLANNED | `09-strategic-physical-coverage-evidence-closure-sta/09f-requirement-evidence-traceability-closure.md` |
| 09V | S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness | PREPLANNED | `09-strategic-physical-coverage-evidence-closure-sta/09v-final-phx-ci-architecture-closure-and-stage-3-handoff.md` |


## 3. Current Execution State

S03A, S03B, S03C, S03D, and S03V are complete and accepted. BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement is closed.

Authoritative fixed-runtime S03V evidence `07f8ee895d0575fc2c49d325a5a7822d419b372c` is promoted to `phase6-integration`, using PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`. The earlier S03V evidence produced under runtime `2db2f3369ddb8e3ad6037861e116eaf83c8e2b1a` is superseded for acceptance purposes because that runtime was later found defective. The accepted S03 architecture baseline is unchanged and is recorded in the S03V completion record.

S04A is **COMPLETE / ACCEPTED**. Accepted implementation `18e23b35123deb56e2ba93b1aae94b47b5fb426c` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence `cfe38db334d3d35d5787837f7c07331e72cc3366` is promoted to `phase6-integration`. The accepted local-vault adapter implements the production `LocalVaultPort` through one narrow non-shipping seam, with architecture guard/metrics PASS and unchanged production artifact. The earlier green evidence `6cae030f1be5fa8c2485e5009c84c2a8eaafd57a` is superseded for acceptance after supervisory review found and repaired two local-port fidelity defects.

S04B is **COMPLETE / ACCEPTED**. Accepted implementation `9b3976165259bf4efbded67a2f19ff83da1cc992` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence `b4144d3045300f999a00f7daf9c7c13ee85ed3ea` is promoted to `phase6-integration`. The accepted Drive core models managed-root identity, create/download/update, stable remote identity/revisions, move/rename, trash/existence, complete listing, parent topology, and production failure classifications without implementing synchronization policy. The earlier green evidence `a259d4680eb04939a28d357bd5addd9436109fd7` is superseded for acceptance after supervisory review found and repaired folder-create evidence-semantics drift.

### Recurring Architecture Review — after S04A / S04B

BVP-GOV-008 repository-level architecture review completed against accepted S04B closure `715d3693aa8f0b47376a1cef03fd4b3af6e0b132`: **PASS**.

- dependency graph preserves one-way `test-platform/** -> approved production seam`; production imports no BVP/test-platform runtime;
- the only production seam remains `src/product/local-vault-boundary-seam.ts`, at 46 logical LOC / 1 file versus limits of 350 LOC / 4 files;
- framework core is 1305 logical TypeScript LOC / 4 runtime modules versus the 4000-LOC budget;
- no scenario runner, general test persistence subsystem, cross-device coordination protocol, second evidence family, module/plugin router, or alternate synchronization engine exists;
- live-device/scenario-specific production surfaces remain 0;
- BVP PowerShell remains 4 scripts / 1477 logical LOC, within the frozen 4-script / 1500-LOC limits;
- production build entrypoint remains `src/main.ts`; `test-platform/**` is excluded from the production bundle;
- accepted S04B production artifact remains unchanged at 872862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`;
- architecture guard and metrics from authoritative S04B evidence `b4144d3045300f999a00f7daf9c7c13ee85ed3ea` both PASS.

This review authorizes continued S04 dispatch under the existing frozen architecture and budgets; it authorizes no budget increase or new architecture family.

S04C is **COMPLETE / ACCEPTED**. Accepted implementation `88b8c67f68c8f3ca1df9fc1cb426566168018c73` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence `5e1f103e5c52b4462aec9b1e8bcfaf4db41c7f5c` is promoted to `phase6-integration`. Accepted behavior covers deterministic change cursors/feed order, explicit listing/change-page completeness, invalid/lost/stale cursor recovery classification, duplicate-path ambiguity, known and ambiguous provider-boundary failures, and production-faithful trash-versus-provider-removal change shapes.

S04D is **COMPLETE / ACCEPTED**. Accepted implementation `6271bcf600f824bac501d6a5bb4e0cee6940e12a` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence `f1371daacabe51196580f9e8e974e242471b4909` is promoted to `phase6-integration`. The accepted per-device foundation reuses production persistence/authority/device/time-policy code and proves genuine runtime reconstruction over retained durable/local/remote reality. Failed evidence `bdcf308886c4c6ddbba6fb2355baaea607bcc331` is retained only as the diagnostic record for the repaired TypeScript queue-variance defect.

### Recurring Architecture Review — after S04C / S04D

BVP-GOV-008 repository-level architecture review completed against accepted S04D closure `7fc2498f84f4ae307f6ad4957cc504f184ffec68`: **PASS**.

- dependency direction remains one-way from `test-platform/**` into the single approved production seam; shipping production imports no BVP/test-platform runtime;
- the only production seam remains `src/product/local-vault-boundary-seam.ts`, at 80 logical LOC / 1 file versus limits of 350 LOC / 4 files;
- framework core is 1911 logical TypeScript LOC / 5 runtime modules versus the 4000-LOC budget;
- accepted S04D adds only the per-device runtime foundation; it does not add a scenario runner, synchronization planner/executor, general workflow scheduler, alternate product state machine, cross-device coordination protocol, second evidence family, or plugin/router subsystem;
- live-device/scenario-specific production surfaces remain 0;
- BVP PowerShell remains 4 scripts / 1477 logical LOC, within the frozen 4-script / 1500-LOC limits;
- production build entrypoint remains `src/main.ts`; `test-platform/**` remains outside the production bundle;
- authoritative S04D evidence `f1371daacabe51196580f9e8e974e242471b4909` records architecture guard PASS with 0 violations and metrics PASS;
- accepted production artifact remains unchanged at 872862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

This review authorizes continued S04 dispatch under the existing frozen architecture and budgets; it authorizes no budget increase or new architecture family.

S04E is **COMPLETE / ACCEPTED**. Accepted implementation `af0f615cb219dfac17e0f65d1154696f3e1dde72` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence `6682e853370049420174958f28e33b3dab6a5335` is promoted to `phase6-integration`. Focused BVP verification passed 130/130, full repository verification passed 822/822, architecture guard/metrics passed, and the production artifact remained unchanged. The accepted composition mirrors the production local scoping/transaction stack and exercises real production planner/executor/state authority. Failed evidence `e4350b7d0a8729a712ad638a232e0182b5d7ab6f` and `b90fa7b26e2eddecfe2ff720403887b11d36b91e` are retained only as diagnostic history.

BVP-S04 — Deterministic Multi-Device Virtual World is **CLOSED / ACCEPTED**. S04V input `053568a288cd26cab1c287cca9fc965831ea8443` passed authoritative PHX-CI with runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; accepted stage evidence is `cc9078551322c7608c74c1a647f869da2ea9620d`. Integrated BVP verification passed 130/130, the full repository suite passed 822/822, architecture guard and metrics passed, and the production artifact remained unchanged. The earlier blocked S04V evidence `f9017111fce8c01d00e612b80dcbdb601f471885` is diagnostic only and resulted from the superseded stage-base binding.

S05A is **COMPLETE / ACCEPTED**. Accepted implementation `63475e8b421ec50c7c28a8e488a65febe8f67718` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence is `567e506d69285597aceb7eb8330d7a83e5f1c2df`. Focused contract verification passed 7/7, integrated BVP verification passed 137/137, full repository verification passed 822/822, architecture guard/metrics passed, and framework core increased by 148 logical LOC to 3,052/4,000. Production source/seam, live-device, scenario-instance, scenario-specific production, and PowerShell surfaces were unchanged; the production artifact remained byte-identical.

S05B is **COMPLETE / ACCEPTED**. Accepted implementation `8960e15cb7d9d569e28aed8b0ec05402a57f2a5a` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence is `f7ee2f3764df2dff5d34868f19a07462e70b2b68`. Focused runner verification passed 10/10, integrated BVP verification passed 147/147, full repository verification passed 822/822, architecture guard/metrics passed, and framework core increased by 223 logical LOC to 3,275/4,000. Production source/seam, live-device, scenario-instance, scenario-specific production, and PowerShell surfaces were unchanged; the production artifact remained byte-identical.

S05C is **COMPLETE / ACCEPTED**. Accepted implementation `c4e8a25c4ed685446be7facac9c8ee6f3d7cf8dc` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence is `99a4218f820edf4355de4cec019f2f537eddfcd1`. Focused S05C evidence verification passed 9/9, integrated BVP verification passed 156/156, full repository verification passed 822/822, architecture guard/metrics passed, and framework core increased by 319 logical LOC to 3,594/4,000. Production source/seam, live-device, scenario-instance, scenario-specific production, and PowerShell surfaces were unchanged; the production artifact remained byte-identical.
BVP-S05 — Declarative Scenario Runner / Assertions / Evidence is **CLOSED / ACCEPTED**.

S06A is **COMPLETE / ACCEPTED**. Accepted implementation `926bc1c7afefeab72cc03ec9b689e32a082b898f` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence is `d0439e929a28238bf96f9f35cbda0e5297b48c02`. Focused S06A verification passed 9/9, integrated BVP verification passed 176/176, full repository verification passed, framework core remained 3,813/4,000, scenario-specific production and PowerShell remained 0, and the scenario catalog reached 9 scenarios / 208 logical LOC.

S06B generic text-version composition prerequisite is **COMPLETE / ACCEPTED**. Accepted implementation `194f00c012c09811e595a5aacbe1f112a7709df1` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence is `595483b2b459f89c05948d0b8e0a9b78bfaa0f1a`; closure is `4ee5aaeebb89b4531831450ad016e93c0b4f334d`. Focused production canaries passed 9/9, integrated BVP verification passed 177/177, full repository verification passed, framework core is 3,827/4,000, production seam is 113 LOC/1 file, and the scenario catalog remains 9 scenarios / 208 logical LOC. The prior S06B blocker at `c222d86222e4b60d13d478d261355bb9ffce80b9` is resolved. S06B is now bound and executable on branch `bvp-s06b-merge-conflict-delete-modify`. S05V verification HEAD `70e2db458efb84933d52c5e5bbb624420d6a2eea` passed authoritative PHX-CI with runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; accepted stage evidence is `349caae562f236526bf485ac324347a5ea2209f0`. Focused S05 platform verification passed 37/37, integrated BVP verification passed 167/167, full repository verification passed, architecture guard/metrics passed, framework core is 3,813/4,000 logical TypeScript LOC, scenario-specific production and PowerShell remain 0, and the production artifact remains unchanged. The common S05 scenario/runner/assertion/evidence core is frozen for ordinary scenario expansion.

S06B is **COMPLETE / ACCEPTED**. Accepted implementation `e0cb7ed020c97287cec53508092d91993c853ac3` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence is `c1754311f999229b0fd53f89d3394f456ae6aedd`. Focused S06B verification passed 8/8, integrated BVP verification passed 185/185, full repository verification passed, architecture guard/metrics passed, framework core remained 3,827/4,000, production seam remained 113 LOC/1 file, and the scenario catalog reached 14 scenarios / 351 logical LOC. S06B added exactly five declarative scenarios with no production, framework-core, scenario-specific production, or PowerShell delta.

S06C generic local-access/time-control prerequisite is **COMPLETE / ACCEPTED**. Accepted implementation `72a4e79ea69f0f0dad062cc7128115e6e3c22ce1` was verified with PHX-CI runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; authoritative evidence is `5ce98f0a1a132b3ef57491f1a2f9d987ed3b639a`. Focused verification passed 19/19, integrated BVP verification passed 187/187, framework core reached 3,841/4,000 (+14), and all production/seam/scenario/PowerShell metrics remained unchanged.

S06C is now **BOUND / EXECUTABLE** on branch `bvp-s06c-deletion-stale-clock-unreadable`. Its accepted predecessor / PHX-CI base is prerequisite closure `77962c0ef118f41e661d0323fdaa10269a96336f`; the generic local-access/time controls are frozen infrastructure. S06C is restricted to seven declarative scenario files plus one focused test file, with zero authorized production, platform-core, PowerShell, governance, or PHX-CI changes.

### Recurring Architecture Review — after S06A / S06B

BVP-GOV-008 repository-level architecture review completed against accepted S06B closure `e6b3b85f8a4c1982b5c6e883c536098b5da7afc3`: **PASS**.

- dependency direction remains one-way from `test-platform/**` into the single approved production seam; production imports no BVP/test-platform runtime;
- the only approved production seam remains `src/product/local-vault-boundary-seam.ts`, at 113 logical LOC / 1 file versus limits of 350 LOC / 4 files;
- framework core remains 3,827 logical TypeScript LOC / 10 runtime modules versus the 4,000-LOC budget;
- S06A/S06B added declarative scenario coverage only after the accepted generic text-version composition prerequisite; no second runner, persistence subsystem, coordination protocol, evidence family, module/plugin router, alternate synchronization engine, or production testing bypass exists;
- live-device/scenario-specific production surfaces remain 0;
- BVP PowerShell remains 4 scripts / 1,477 logical LOC, within the frozen 4-script / 1,500-LOC limits;
- scenario catalog is 14 scenarios / 351 logical LOC; all ordinary scenarios remain below the 200-line hard maximum;
- production build entrypoint remains unchanged and `test-platform/**` remains excluded from the shipping bundle;
- authoritative S06B evidence `c1754311f999229b0fd53f89d3394f456ae6aedd` records architecture guard PASS with 0 violations and metrics PASS;
- accepted production artifact remains unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The review authorizes continued S06 work under the existing frozen architecture and budgets. It authorizes no budget increase or new architecture family. Repository grounding for S06C identified a bounded missing generic DSL exposure: existing local access-state and deterministic device-clock controls are not currently expressible through the frozen declarative `external-state` step family. S06C remains scenario-only and must not absorb that core change.

Current execution mode is direct implementation by ChatGPT rather than a separate supervisor-to-coding-agent handoff loop. The prewritten child-session files remain authoritative technical implementation contracts for scope, semantics, invariants, dependencies, acceptance criteria, and non-goals. Prompt-building and intermediate coding-agent review are not separate execution steps in this mode; formal independent code review is deferred to the later review/validation stage. Where older contracts use `supervisor` and `worker` terminology, those names continue to define responsibility boundaries but do not require separate agents.

## 4. Sequencing Rule

Default execution is serial through `phase6-integration`:

implemented child → implementation verification → authoritative PHX-CI evidence → integrate/persist accepted state → bind hard execution facts for next child.

Scenario-only children in S06/S07 may be parallelized only where the supervisor proves non-overlapping writable surfaces and frozen shared contracts before dispatch.

No PREPLANNED task may execute until its required hard execution facts are bound, but its semantic contract is already authoritative and must not be redesigned at dispatch.
