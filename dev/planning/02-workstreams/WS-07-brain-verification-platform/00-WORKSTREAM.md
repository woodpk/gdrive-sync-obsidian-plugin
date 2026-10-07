# BRAIN Verification Platform

**Workstream:** WS-07  
**Subsystem:** automated testing / Phase-6 construction verification support

## 1. Document Status, Authority, and Purpose

**Status:** Authoritative replacement Stage-1 target-system specification  
**Project:** `woodpk/gdrive-sync-obsidian-plugin`  
**Subsystem:** Automated testing / Phase-6 construction verification support  
**Workflow:** Agent-Led Software Product Construction Manual — Workflow A  
**Date:** 2026-09-23  

This document defines the required finished **BRAIN Verification Platform (BVP)** that replaces the oversized Phase-6 internal validation harness. It defines the outcome, architecture boundaries, anti-drift controls, verification semantics, and completion evidence for the replacement testing system.

It is subordinate to the authoritative BRAIN product target-system specification. It does not redefine synchronization product behavior. Where this document discusses tests, simulation, validation builds, faults, or device automation, those facilities exist only to prove the product requirements already established by the BRAIN target-system specification.

The governing authority order for this subsystem is:

1. later explicit user decisions;
2. the BRAIN product `target-system-specification.md`;
3. the active project decision register after the legacy-harness decisions are superseded;
4. this BVP target-system specification;
5. the BVP build decomposition and requirement-coverage artifact;
6. current repository state as evidence of implementation state;
7. build-session prompts generated from the current repository immediately before execution.

Legacy material moved beneath `archive/**` is historical evidence only. It is not implementation authority and MUST NOT be used as a design template unless a later supervisor explicitly identifies a specific archived item as historical evidence needed for a bounded question.

### 1.1 Why Replacement Is Required

Repository inspection at planning time established that the legacy validation subsystem contains approximately 12,700 lines of TypeScript under `src/validation/**` plus approximately 12,300 lines of validation-specific automated tests. The shipping plugin currently imports the validation runtime from `src/main.ts` and exposes legacy validation-harness controls through the production settings surface.

The replacement exists to preserve required verification capability while eliminating a second application-like orchestration system inside the plugin. The BVP therefore prioritizes:

- direct testing of production synchronization code;
- deterministic execution outside the shipping plugin wherever physical platform behavior is not required;
- a narrow, physically separated live-device validation mechanism only where real Obsidian/Windows/iOS behavior must be observed;
- declarative test scenarios rather than scenario-specific orchestration programs;
- objective evidence and fail-closed safety;
- mechanically enforced architecture and complexity boundaries.

### 1.2 Normative Language

`MUST`, `MUST NOT`, `REQUIRED`, and `PROHIBITED` are normative. `SHOULD` identifies a strong preference that may change only if the resulting design remains within all hard architecture, safety, and complexity gates. `MAY` identifies ordinary engineering discretion.


## 2. Product Definition

The BVP is a repository-controlled automated verification platform for the BRAIN Google Drive Sync Obsidian plugin. It has two execution modes that share one declarative scenario/assertion model:

1. **Deterministic virtual-world execution** — runs the real production synchronization planner/executor/state logic against stateful in-memory implementations of local-vault, Google Drive, state, time/fault, and related external boundaries.
2. **Thin live-device execution** — runs only the minimum commands and observations that genuinely require installed Obsidian runtimes, with Windows/iOS participants executing bounded commands rather than hosting a general scenario engine.

The external test controller owns scenario sequencing, assertions, evidence aggregation, and test verdicts. The live-device participants do not own the scenario state machine.

The BVP is **not part of the user product**. Ordinary production builds and the distributed `main.js` MUST NOT contain the BVP scenario runner, simulated world, scenario catalog, test evidence engine, cross-device orchestration, or validation-only controls.


## Dependency position

WS-07 is a verification-platform subsystem over the integrated product and Phase-6 construction line. It must remain physically and architecturally outside ordinary shipping production behavior except for explicitly allowlisted narrow production seams.
