# BVP Child-Session Task Index

**Authority:** Stage-2A execution index  
**Primary work packages:** BVP-S01 through BVP-S09  
**Shared execution contract:** `00-execution-contract.md`

The nine BVP S01-S09 items are primary work packages. They are deliberately decomposed below into bounded child sessions plus a primary-stage verification gate.

| Child | Primary stage | Status | Task |
|---|---|---|---|
| 01A | S01 — Authority / Archive Transition | COMPLETE | `01-authority-archive-transition/01a-persist-bvp-authority-and-decision-supersession.md` |
| 01B | S01 — Authority / Archive Transition | COMPLETE | `01-authority-archive-transition/01b-archive-legacy-dev-harness-material.md` |
| 01V | S01 — Authority / Archive Transition | COMPLETE | `01-authority-archive-transition/01v-authority-archive-acceptance.md` |
| 02A | S02 — Legacy Executable Retirement | COMPLETE | `02-legacy-executable-retirement/02a-retire-harness-only-test-support-surface.md` |
| 02B | S02 — Legacy Executable Retirement | COMPLETE | `02-legacy-executable-retirement/02b-retire-harness-source-and-production-coupling.md` |
| 02V | S02 — Legacy Executable Retirement | COMPLETE | `02-legacy-executable-retirement/02v-primary-stage-phx-ci-acceptance.md` |
| 03A | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | COMPLETE | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03a-create-test-platform-root-and-shipping-isolation.md` |
| 03B | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | EXECUTABLE NEXT | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03b-implement-architecture-guard.md` |
| 03C | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | PREPLANNED | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03c-implement-architecture-metrics-and-budget-gates.md` |
| 03D | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | PREPLANNED | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03d-wire-guard-and-metrics-into-phx-ci-repository-check.md` |
| 03V | S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement | PREPLANNED | `03-hard-boundary-guard-metrics-phx-ci-enforcement/03v-primary-stage-phx-ci-acceptance-and-architecture-baseline.md` |
| 04A | S04 — Deterministic Multi-Device Virtual World | PREPLANNED | `04-deterministic-multi-device-virtual-world/04a-stateful-in-memory-local-vault.md` |
| 04B | S04 — Deterministic Multi-Device Virtual World | PREPLANNED | `04-deterministic-multi-device-virtual-world/04b-stateful-in-memory-drive-core.md` |
| 04C | S04 — Deterministic Multi-Device Virtual World | PREPLANNED | `04-deterministic-multi-device-virtual-world/04c-drive-change-feed-completeness-ambiguity-and-faults.md` |
| 04D | S04 — Deterministic Multi-Device Virtual World | PREPLANNED | `04-deterministic-multi-device-virtual-world/04d-per-device-durable-state-deterministic-time-order-restart.md` |
| 04E | S04 — Deterministic Multi-Device Virtual World | PREPLANNED | `04-deterministic-multi-device-virtual-world/04e-virtual-world-composition-over-real-production-logic.md` |
| 04V | S04 — Deterministic Multi-Device Virtual World | PREPLANNED | `04-deterministic-multi-device-virtual-world/04v-primary-stage-phx-ci-acceptance.md` |
| 05A | S05 — Declarative Scenario Runner / Assertions / Evidence | PREPLANNED | `05-declarative-scenario-runner-assertions-evidence/05a-typed-scenario-contract-and-small-step-vocabulary.md` |
| 05B | S05 — Declarative Scenario Runner / Assertions / Evidence | PREPLANNED | `05-declarative-scenario-runner-assertions-evidence/05b-external-deterministic-runner-core.md` |
| 05C | S05 — Declarative Scenario Runner / Assertions / Evidence | PREPLANNED | `05-declarative-scenario-runner-assertions-evidence/05c-generic-observations-assertions-and-canonical-evidence.md` |
| 05D | S05 — Declarative Scenario Runner / Assertions / Evidence | PREPLANNED | `05-declarative-scenario-runner-assertions-evidence/05d-bounded-checkpoint-resume-representation.md` |
| 05E | S05 — Declarative Scenario Runner / Assertions / Evidence | PREPLANNED | `05-declarative-scenario-runner-assertions-evidence/05e-declarative-canaries-and-scenario-cost-proof.md` |
| 05V | S05 — Declarative Scenario Runner / Assertions / Evidence | PREPLANNED | `05-declarative-scenario-runner-assertions-evidence/05v-primary-stage-phx-ci-acceptance.md` |
| 06A | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | PREPLANNED | `06-deterministic-reconciliation-conflict-move-delet/06a-initialization-and-one-sided-synchronization-scenarios.md` |
| 06B | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | PREPLANNED | `06-deterministic-reconciliation-conflict-move-delet/06b-merge-conflict-and-delete-vs-modify-scenarios.md` |
| 06C | S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage | PREPLANNED | `06-deterministic-reconciliation-conflict-move-delet/06c-deletion-stale-device-clock-skew-and-unreadable-path-scenarios.md` |
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

No PREPLANNED task may be executed until supervisor repository-grounding converts it to EXECUTABLE under the shared execution contract.