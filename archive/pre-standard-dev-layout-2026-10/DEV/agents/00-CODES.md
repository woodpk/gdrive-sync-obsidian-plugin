# Build Address Codes

This file defines the canonical shorthand and directory-address system for `dev/agents/**`.

## 1. Governing rule

Build addresses encode hierarchy and ordering first. Mnemonics may describe a node, but they never carry ordering by themselves.

Canonical address form:

`st<stage>-ph<phase>-<ordinal>-<mnemonic>-<subordinal>-<mnemonic>-<item>`

Examples:

- `st2a-ph6-04-lv-01-test-C03`
- `st2a-ph6-04-lv-03-lat-02`
- `st2a-ph6-03-obs-01-log-06c`

The filesystem uses the same hierarchy as directories, for example:

`dev/agents/st2a/ph6/04-lv/03-lat/02-local-observation-concurrency.md`

## 2. Stage codes

| Code | Meaning |
| --- | --- |
| `st0` | Product discovery and requirements elicitation |
| `st1` | Target-system specification and minimum sound build decomposition |
| `st2a` | Controlled session-based construction |
| `st2b` | Autonomous product construction |
| `st3` | Independent product/system validation |

Only stages with persisted `dev/agents/**` artifacts require directories.

## 3. Stage 2A phase codes

| Code | Meaning |
| --- | --- |
| `ph1` | Repository foundation and frozen shared contracts |
| `ph2` | Core synchronization semantics and durable state |
| `ph3` | Google Drive and OAuth boundary |
| `ph4` | Obsidian local/platform/configuration boundary |
| `ph5` | Integrated synchronization product and user workflows |
| `ph6` | Cross-platform hardening and Stage 3 readiness |

`ph5` remains a valid build address even though no surviving Phase 5 agent directory currently exists in this repository.

## 4. Phase 6 ordered tracks

`00` is reserved for cross-cutting governance/supervision rather than execution sequence.

| Code | Meaning |
| --- | --- |
| `00-sup` | Phase-wide supervision/governance |
| `01-fnd` | Foundation and parallel workstreams |
| `02-pre` | Pre-live hardening |
| `03-obs` | Observability |
| `04-lv` | Live validation and repairs |

### 4.1 Observability

| Code | Meaning |
| --- | --- |
| `03-obs-01-log` | Logging instrumentation program |

### 4.2 Live validation

| Code | Meaning |
| --- | --- |
| `04-lv-01-test` | Live-validation protocol and scenario set |
| `04-lv-02-rpr` | Live-validation defect/repair tasking and release/install repair records |
| `04-lv-03-lat` | Latency-optimization program |

Existing ordered scenario identifiers such as `A03`, `B02`, `C03`, `D04`, `E07`, and `F03` remain valid beneath `01-test`. Existing ordered work-package identifiers such as `LOG-06C` and `LAT-02` remain valid beneath their parent program.

## 5. Ordering rules

1. Every structural mnemonic must be preceded at its level by an ordinal, such as `03-obs`, `04-lv`, or `01-log`.
2. `st` and `ph` are self-ordering because their numeric/alphanumeric ordinal is embedded in the code (`st2a`, `ph6`).
3. `00` means cross-cutting governance/supervision and is not an execution step.
4. Alphabetic sibling identifiers are allowed only after their parent hierarchy is fixed. Example: `st2a-ph6-01-fnd-A`.
5. Existing scenario/work-package IDs retain their own internal ordering. Example: `st2a-ph6-04-lv-01-test-C03`.
6. New sibling directories must receive the next meaningful ordinal; do not insert an unnumbered mnemonic directory.
7. Human-readable titles remain inside Markdown documents. Directory names carry address/ordering information, not prose descriptions.
8. The coded hierarchy is the only permitted directory hierarchy under `dev/agents/**`. Do not create or retain parallel long-form directory aliases.

## 6. Canonical hierarchy

```text
dev/agents/
├── 00-CODES.md
├── st1/
│   └── build-decomposition.md
└── st2a/
    ├── 00-sup/
    ├── ph1/
    ├── ph2/
    ├── ph3/
    ├── ph4/
    └── ph6/
        ├── 00-sup/
        ├── 01-fnd/
        ├── 02-pre/
        ├── 03-obs/
        │   └── 01-log/
        └── 04-lv/
            ├── 01-test/
            ├── 02-rpr/
            └── 03-lat/
```

## 7. Naming authority

The hierarchy above is authoritative for repository paths, build-address communication, new tasking, status reporting, and future supervision artifacts.

Long-form stage/phase directory names are obsolete and must not coexist as mirrors or aliases. Historical text inside already-completed artifacts may still mention an older path as historical provenance, but the repository object itself must live only at its canonical coded path.

## 8. Owner-Locked Validation / Verification Governance

This section is authoritative for every descendant task, handoff, repair prompt, continuation prompt, and other instruction artifact under `dev/agents/**`. It **replaces and supersedes** any conflicting validation/verification instructions contained in those descendant files, regardless of when or on which branch the descendant instruction was written.

### 8.1 Mandatory fresh-protocol gate

Before authoring, generating, modifying, extending, or printing **any code or script whose purpose is wholly or partly validation or verification**, including any verifier, validator, validation/verification harness, test-orchestration harness, runner, launcher, evidence verifier/publisher, repository-check script, acceptance-gate script, or similar tooling, the engineering agent MUST:

1. **Freshly retrieve and read the current original Google Drive document named `agent-led-software-engineering-operating-protocol` immediately before that script/code-authoring action.**
2. Treat cached copies, repository copies, uploaded snapshots, memory, prior-chat readings, and earlier readings in the same session as insufficient for this gate.
3. If more than one validation/verification-related script or code artifact will be authored or materially modified, re-fetch and re-read the current Drive original before **each** such authoring/modification action.
4. Apply the freshly-read protocol exactly, including its current PHX-CI authority, owner-execution, rerun, evidence-recovery, mutation-safety, and script-audit rules.
5. If the current Drive original cannot be fetched and read, declare **VALIDATION/VERIFICATION SCRIPT AUTHORING: BLOCKED**. Do not use an older copy and do not invent a substitute validation process.

### 8.2 Legacy custom-validation instructions are superseded

Any descendant `dev/agents/**` instruction that directs an agent to create, build, implement, extend, modify, or rely upon bespoke/custom validation or verification code is not independent authority. Such an instruction may be followed only to the extent the freshly-read current operating protocol permits that exact action.

Where a descendant instruction conflicts with the current operating protocol, **the descendant instruction is VOID and this section replaces it**.

PHX-CI must remain the primary, central, non-substitutable repository-validation pipeline whenever the current operating protocol assigns that authority to PHX-CI. Task-specific or physical-validation tooling may be created or changed only when the freshly-read protocol permits it for a responsibility PHX-CI does not own, and it must remain supplementary.

### 8.3 No prompt-level bypass

No task prompt, historical handoff, continuation instruction, repair task, acceptance task, or supervisor note under `dev/agents/**` may waive or bypass Sections 8.1–8.2. Only an explicit later human software-owner instruction may change this owner-locked rule.

