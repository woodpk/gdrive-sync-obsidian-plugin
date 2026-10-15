# Independent S09 G1 + DEC-343 reassessment — findings and verified corrections

**Review outcome:** REJECT — two MAJOR findings. **Repository:** `woodpk/gdrive-sync-obsidian-plugin`.
**Reviewed source:** `41dcc92954608214329974bd847b1741b6d37ba5`; **reviewed PHX-CI evidence:** `1389abe6-e53d-4f4b-b6f2-ea17a9c1fcbc`, original commit `4e0b225b44e0227390decc176b762ed8ff435556`; **software verification:** all 11/11 stages PASS, 403/403 BVP, 990/990 product. Original run remains valid for reviewed source only.

## G1-01 — Partial existing data.json resets device identity (MAJOR)

**Verified:** `src/product/plugin-data.ts` merged DEFAULT_SETTINGS for a non-null object regardless of missing `settings` or required identities. `src/product/runtime.ts` generated/saved device ID when empty, risking irreversible divergence from prior device identity.

**Correction staged, NOT PHX-CI verified:** `8c59d430bdda05a9516321803fbed6d11521c01d`, branch `fix/s09g1-review-g101-dec34001-20261014`. Reject malformed/missing persisted settings, missing or blank `deviceIdentity`, missing `vaultIdentity`/`remoteRootId` strings, absent/invalid first-sync authority, and inconsistent completed-sync identity. New-installation null+proven-absent behavior unchanged; optional settings can still safely migrate. Added negative and migration regression cases; brought test fakes into alignment.

**Unresolved:** historical physical `data.json` loss, adapter parity, and disappearance races. No claim of physical acceptance.

## DEC-340-01 — Unauthenticated verification context (MAJOR)

**Verified, NOT FIXED:** `test-platform/src/repository-check.ts` accepts a caller-chosen absolute JSON file and environment-controlled `BRAIN_ARTIFACT_PURPOSE` / `BVP_CHANGE_CLASS`; the JSON contains untrusted `targetHead`, `baseSha`, `changedPaths`. `woodpk/phx-ci` runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83` writes an unsigned context and forwards its path. A standalone caller can impersonate this context; genuine PHX-CI execution does NOT use forged data.

**Required durable fix:** resolve PHX-CI-controlled context authenticity with a trust anchor unforgeable by an arbitrary local caller, bind verified run identity + actual Git source/base/changed-path coordinates + change class + development/promotion purpose, and make consumer fail closed on missing or inconsistent proof. Regression coverage must demonstrate rejection of forged/mutated context and preservation of ordinary-development observation and strict promotion pins. A process environment flag, self-signed JSON, added schema fields without authentication, or checks of caller-supplied data alone are NOT adequate.

The actual trusted attestation protocol is not provided by current pinned PHX-CI runtime. A safe correction therefore crosses the PHX-CI framework/runtime trust boundary; **do not claim closure or request owner validation until that contract is designed and implemented**.

## Status and gates

- **Current corrective code:** G1-01 patched, PHX-CI UNVERIFIED; DEC-340-01 unresolved.
- **Master:** unchanged, previous accepted base `b1e2ebaee3077e34a4eefaf601ee8124078b7400`.
- **Independent review:** REJECT; no owner merge authorization for this candidate.
- **Release/activation:** BLOCKED; no installation, device-level physical S09, Drive/vault work, or Stage 3.
- **Next:** trusted PHX-CI/consumer attestation design and implementation, then a single coordinated PHX-CI qualification of the complete corrective code, then independent reassessment.

**Exact tasking:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md`, S09, and `dev/research/s09-g1-data-json-integrity-investigation-2026-10-14.md`, *Independent reviewer REJECT*.

## Subsequent owner disposition — DEC-344 (2026-10-14)

The owner explicitly **ACCEPTS** the residual DEC-340-01 context-spoofing risk and removes **this specific finding** as a blocker to BRAIN continued engineering, genuine PHX-CI validation, independent reassessment, and consideration of separately owner-authorized software-only integration. The finding remains independently CONFIRMED, technically UNFIXED, and reportable. Previous independent-review REJECT is not rewritten as APPROVE; owner decision is separately binding. Do not make an authenticated-context fix a prerequisite for this corrective candidate solely because of DEC-340-01. Do not approve release, installation, activation, live Drive/vault activity, physical S09, or Stage 3. G1-01 corrective code remains unverified by PHX-CI and must be verified before independent reassessment.
