# Phase 6 Alpha Repair Evidence — Obsidian Plugin Packaging / Build Output

## Identity and branch control

- agent ID: `agt-CA-P6-ALPHA-PACKAGING-01`;
- branch: `phase6-alpha-packaging-fix`;
- exact verified base SHA: `11b7bddbe71d2dbfb6eb0d6d6b703442f0967d8c`;
- exact production/test implementation head: `9e3ee932548954a60324b06ebccc82303a1d46b2`;
- integration branch was not modified by this repair;
- `master` was not modified;
- PR `#15` was not merged;
- Stage 3 was not begun;
- Alpha Bug #2 was not diagnosed or modified.

## Mandatory authoritative re-ingestion

Before implementation, the current repository versions of all eight required governing files were read: construction manual, target-system specification, decision register, Stage-1 build decomposition, Phase-1 shared contracts, Phase-6 supervisor handoff, project-state, and cumulative evidence ledger.

Construction-manual re-ingestion verification:

- exact title: `Agent-Led Software Product Construction Manual`;
- first sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`;
- last sentence: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`;
- heading counts: H1 = 1, H2 = 11, H3 = 67, H4 = 43, H5+ = 0; total headings = 122;
- H2 sequence: Purpose; Operating Principles; Navigation and Entry; Stage 0 — Product Discovery and Requirements Elicitation; Stage 1 — Target-System Specification and Minimum Sound Build Decomposition; Stage 2A — Controlled Session-Based Construction; Stage 2B — Autonomous Product Construction; Stage 3 — Independent Product and System Validation; Cross-Stage Handoff Rules; Re-Entry and Recovery; Recommended Default Workflow;
- embedded agent prompts: Stage 0 Agent Prompt; Stage 1 Agent Prompt; Stage 2A Build-Prompt Expansion Template; Autonomous Build Prompt; Stage 3 Validation Prompt.

## Confirmed defect and remediation

The supervisor-established defect was accepted without rediagnosis: the prior `tsc` + `scripts/finalize-build.mjs` production build emitted and copied a CommonJS project module tree rather than one self-contained Obsidian entry bundle.

The repair:

- adds `esbuild` `0.28.2` as a checked-in development dependency;
- changes `npm run build` to `node scripts/build.mjs && node scripts/verify-build.mjs`;
- bundles `src/main.ts` to one CommonJS `main.js`, browser platform, ES2022 target;
- keeps `obsidian`, `electron`, and `node:*` external so Obsidian remains runtime-provided and desktop-only platform modules are not forced into the mobile-required graph;
- deterministically removes legacy generated runtime-tree paths before building;
- retires `scripts/finalize-build.mjs` and `tsconfig.build.json`;
- adds generated-artifact verification that requires a non-empty `main.js`, executes `node --check`, rejects unresolved relative/local runtime dependencies, rejects legacy generated runtime-tree pollution, and evaluates the built bundle with `Platform.isDesktopApp === false` while failing any request for Node/Electron/desktop-only or relative local modules;
- does not modify production synchronization/OAuth/state code or existing tests.

The existing source-level mobile isolation remains unchanged: desktop filesystem/path imports remain confined to `src/local/desktop-external-reference-guard.ts`, desktop construction remains in `src/local/desktop-local-vault.ts`, and `src/product/runtime.ts` retains its `Platform.isDesktopApp` guarded dynamic import.

## Exact implementation manifest

### Created

- `scripts/build.mjs`
- `scripts/verify-build.mjs`
- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-PACKAGING-01.md` (evidence only, after implementation verification)

### Modified

- `package.json`
- `package-lock.json`
- `dev/evidence/_ca-output.md` (evidence only, after implementation verification)

### Deleted

- `scripts/finalize-build.mjs`
- `tsconfig.build.json`

No production source file and no test source file changed.

## Focused packaging coverage T1–T7

- T1 bundled entrypoint: PASS — esbuild emits one `main.js` entry bundle.
- T2 no local runtime requires: PASS — verifier rejects relative `require()`/dynamic-import dependencies and found none.
- T3 syntax-valid artifact: PASS — verifier executed the equivalent of `node --check main.js` successfully.
- T4 mobile entry loading: PASS — generated bundle evaluated with a mobile Obsidian stub without requesting Node/Electron/Windows-only modules.
- T5 desktop isolation remains intentional: PASS — existing `test/mobile-safety.test.ts` tests 32–36 passed, including guarded dynamic desktop import and Node import confinement.
- T6 clean package shape: PASS — verifier found no `.build`, `contracts`, `core`, `drive`, `local`, `product`, `state`, `testing`, or `util` generated runtime tree after build.
- T7 reproducibility: PASS in clean GitHub Actions checkout — checked-in lockfile allowed `npm ci` followed by production build with no manual package installation.

## Authoritative automated verification

Local repository shell execution was `NOT AVAILABLE IN THIS SESSION` because the execution container could not resolve GitHub. No local-command PASS is claimed.

Authoritative GitHub Actions verification of implementation head `9e3ee932548954a60324b06ebccc82303a1d46b2`:

- workflow: `Phase 1 CI`;
- run ID: `32931277140`;
- job ID: `98063871872`;
- exact generated PR merge SHA checked out: `0bb7c443b75e7fca68dbdaeb11a045235b93e820`;
- checkout log records merge of implementation head `9e3ee932548954a60324b06ebccc82303a1d46b2` into unchanged `master` base `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 239 tests / 239 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- approved OAuth lifecycle regression tests 214–219 remain PASS;
- `npm run build`: PASS;
- build output: `main.js` 279,758 bytes;
- SHA-256: `fce84d639c71375f06a03c9b600b8c1869b599e697627d28c85056d3d8eb1cf0`;
- verifier: `BUILD_VERIFY_ENTRYPOINT=PASS`, `BUILD_VERIFY_SYNTAX=PASS`, `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`, `BUILD_VERIFY_MOBILE_EVALUATION=PASS`, `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- actual job steps and complete job log were inspected.

The generated `main.js` remains an ignored build artifact and was not committed.

## PR and physical-validation boundary

Draft PR: `#17` — final base `phase6-integration`; open/draft/unmerged after obtaining CI while temporarily targeting `master` solely as required to trigger the existing workflow.

Unavailable physical validation, not represented as PASS:

- real Windows Obsidian installation/load of this committed repair — `NOT AVAILABLE IN THIS SESSION`;
- real iPhone/iOS Obsidian installation/load — `NOT AVAILABLE IN THIS SESSION`;
- stock-iOS bounded arbitrary-file byte-range proof for every required case — remains unresolved;
- stock-iOS symlink/alias/external-reference containment equivalence — remains unresolved.

The earlier supervisor/user esbuild experiment remains historical evidence only and is not substituted for this repair's physical acceptance.

No supervisory approval is claimed.
