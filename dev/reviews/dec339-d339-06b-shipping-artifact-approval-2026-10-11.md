# DEC-339 D339-06B — bounded shipping-artifact verification approval

**Decision date:** 2026-10-11  
**Authority:** Explicit software-owner authorization in the DEC-339 supervisor conversation after the owner was informed that a compiled-artifact digest had changed and the frozen repository gate would block a legitimate source revision.  
**Classification:** Supervisor-owned governance correction / exact-build hash approval. Not product activation, release, runtime migration, or independent implementation acceptance.  
**Implementation base:** `af1d58c40a772ed85e941c20433b3ac3c5771e0a` (published PHX-CI blocked evidence).  
**Scope:** `test-platform/src/repository-check.ts` shipping-artifact hash allowlist, its existing tests, this approval record. The related production implementation remains unchanged.

## Evidence underlying authorization

- **D339-06B tested source:** `3a545794321b3a1ad91266dd3adf74e010dfbc9b` from D339-06A accepted predecessor `c67f5518958b2f3d330368fb465933ce47cd9b46`.
- **PHX-CI run:** `7417f3d1-c4c5-4a25-9010-2eef6cee0deb`, evidence published as `af1d58c40a772ed85e941c20433b3ac3c5771e0a`.
- **Verified substantive stages:** preflight, Node preflight/project files, install, typecheck, focused tests, full tests, build, architecture guard and metrics, artifact hashing. All those stages PASS.
- **Missing / failing gates:** repository-check FAIL on exact old-only shipping hash; `check` MISSING because upstream required gate failed; overall BLOCKED (201). The original source did **not** receive PHX-CI COMPLETE/PASS.
- **Existing artifact digest:** SHA-256 `e6bd40f9f780c3940de61669309b2c54732a1968d20739ecfefc1f0a710ec19e`.
- **D339-06B build digest:** SHA-256 `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881`; reported by PHX-CI as 904453 bytes.

## Narrow policy correction

Retain strict *exact-byte equality* enforcement: `main.js` must have one of the **two enumerated, immutable SHA-256 digests**. The previous production baseline stays approved. Add only the D339-06B tested candidate. Unknown, missing or tampered artifacts remain a fatal repository-check failure, including with governance change classification; no environment variable, blanket source-directory exemption, time-based waiver, mutable generated hash or dynamically learned digest authorizes a new build.

The new digest is **approved for repository verification**; it is not independent proof of safety equivalence, rollout or deployment authorization. Any future new compiled digest must be independently identified, tested and explicitly approved rather than automatically admitted. The original `FROZEN_SURFACE_CHANGED` architecture guard remains enforced for ordinary changes: this exact governance correction must run with `BVP_CHANGE_CLASS=authorized-governance` under PHX-CI. Nothing alters or bypasses PHX-CI itself, its pinned runtime, source SHA pinning, complete test stages, or artifact generation.

## Verification and remaining stop gates

Run PHX-CI with the source HEAD of this governance branch, the exact parent evidence SHA, normal production and BVP checks, and the authorized governance classification. Verify specifically that the repository-check accepts the known D339-06B candidate **and** that regression tests continue to reject unapproved artifacts even with governance authorization. If any substantive check fails, retain BLOCKED and preserve evidence.

D339-07 deterministic safety-equivalence scenarios, D339-08 integrated evaluation and independent implementation review, any Windows/iOS resource and physical checks, and separate feature cutover/rollout authorization **remain outstanding**. Until those gates pass, the new inventory and targeted-read feature stays disabled with the original full reconciliation route available. Do not perform live Drive or vault mutation, install a new plugin artifact, ship/release the bundle, reset state, or start Stage 3 on this authorization.
