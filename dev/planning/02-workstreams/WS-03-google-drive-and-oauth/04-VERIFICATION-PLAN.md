# Verification Plan — Google Drive and OAuth Boundary

## Objective completion evidence

- Automated tests/fakes verify Drive ID preservation, managed-root identity validation, remote rename/move, trash semantics, remote schema/version handling, missing-root recovery signaling, and ambiguous remote identity handling.
- Changes API tests verify cursor advancement only after durable incorporation and safe fallback to full reconciliation when the cursor is missing/invalid.
- Partial/failing remote enumeration tests prove absence cannot authorize deletion.
- Retry, rate-limit, quota, ambiguous-upload, large-file, and content-integrity tests pass.
- Authorization uses only `drive.file` and no repository credential is committed.
- Same-device authentication is demonstrated on Windows and iPhone/iOS at least to the extent possible before full product integration; any final lifecycle integration remaining is explicitly carried to Phase 5.
- Hosted callback behavior, if used, is demonstrably content-blind and token-nonpersistent.

## Verification authority

Authoritative executable acceptance is through PHX-CI under DEC-334. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.
