STATUS: BLOCKED

# VH04 — H1A Validation Safety Sandbox Evidence

Agent: `agt-ca-p6-vh04-safety-sandbox-01`
Branch: `phase6-vh04-safety-sandbox`

## Executable base gate

- Resolved predecessor branch: `origin/phase6-vh03-coordination-evidence-freeze`
- Resolved `BASE_SHA`: `74c6af589b2e0054f389ae6878339d1272edc47c`
- Predecessor evidence: `dev/evidence/_ca-output-agt-ca-p6-vh03-coordination-evidence-freeze-01.md`
- Predecessor evidence first line observed: `STATUS: COMPLETE`
- VH04 branch was created from exactly `BASE_SHA`.

## Implementation

Implementation SHA: `992577dfdda73152942f84d69488ab57d34ab74d`

Implemented a validation-only H1A safety sandbox that:

- issues ownership bound to one validation run/scenario and one frozen H0 sandbox surface;
- requires configured, non-overlapping disposable roots and strict descendant locators;
- retains allocation/creation/removal provenance across snapshots;
- requires exact issued provenance before setup/mutation/cleanup authorization;
- rejects run/scenario mismatch, unproven ownership, ambiguous restored ownership, out-of-scope surfaces, root ownership, and traversal;
- prevents removed provenance from silently regaining cleanup authority;
- performs no filesystem, Google Drive, production-state, planner, executor, or synchronization mutation itself;
- remains under `src/validation/**` and is not wired into the production runtime.

## Changed files

Implementation commit created/modified exactly:

- `src/validation/safety-sandbox.ts` — created
- `src/validation/index.ts` — modified to export the H1A sandbox
- `test/validation-safety-sandbox.test.ts` — created

No `src/contracts/**` file or production policy/runtime file was modified.

## Verification

### Repository change-set verification

- GitHub base/head comparison: PASS.
  - Base: `74c6af589b2e0054f389ae6878339d1272edc47c`
  - Head: `992577dfdda73152942f84d69488ab57d34ab74d`
  - Ahead by exactly one implementation commit.
  - Diff contains exactly the three files listed above.

### Static TypeScript verification of the new sandbox surface

- Command: `tsc -p tsconfig.json` in an isolated local harness containing the exact new `safety-sandbox.ts` plus contract-faithful stubs for its frozen H0/path-policy dependencies.
- Result: PASS (exit 0).
- Limitation: this is supplementary static verification only; it is not a substitute for repository `npm run check`.

### `git diff --check`

- Command: `git diff --check` against a locally reconstructed exact three-file VH04 patch (base barrel plus the exact committed VH04 file contents, with new files added intent-to-add).
- Result: PASS (exit 0).
- Diff stat observed: 3 files changed, 459 insertions.

### Focused VH04 tests

- Required repository command: focused execution of `test/validation-safety-sandbox.test.ts` through the repository test toolchain.
- Result: NOT AVAILABLE IN THIS SESSION.
- Reason: this environment has no repository checkout and direct clone failed with `Could not resolve host: github.com`; the GitHub connector exposes repository reads/writes but not arbitrary repository command execution. A direct `node --test` attempt on the isolated TypeScript file was not a valid substitute because the repository uses `tsx` for TypeScript tests and the isolated environment does not have that runner installed.

### `npm run check`

- Required command: `npm run check`.
- Result: NOT AVAILABLE IN THIS SESSION.
- Reason: no full repository checkout/dependency installation is available in the execution container, and network cloning is unavailable as described above.

## Required negative-test coverage added

`test/validation-safety-sandbox.test.ts` adds explicit cases for:

- unrelated ordinary vault content;
- canonical external BRAIN asset paths;
- credential paths and unsupported credential surface;
- primary/non-disposable synchronization state;
- whole-root authority and traversal attempts;
- cleanup before a resource is proven created;
- forged but structurally valid H0 ownership with no provenance;
- run mismatch;
- scenario mismatch;
- ambiguous restored provenance;
- retained removed-resource provenance with no renewed cleanup authority;
- positive authorization for properly owned disposable surfaces.

## Deviations

- No implementation-scope deviation identified.
- Verification deviation: mandatory repository-level focused tests and `npm run check` could not be executed in this session because the available execution environment cannot obtain/run the full repository toolchain.

## Blockers

VH04 cannot be reported `STATUS: COMPLETE` until the exact implementation SHA `992577dfdda73152942f84d69488ab57d34ab74d` receives the required repository-level focused test execution and `npm run check` with passing results. No merge, promotion, release, or live validation was performed.
