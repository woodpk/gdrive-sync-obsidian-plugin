# Verification Plan — Obsidian Local, Platform, and Configuration Boundary

## Objective completion evidence

- Automated tests cover all-file enumeration, empty directories, hidden files, exclusion symmetry, unknown extensions, symlink/junction refusal, unreadable paths, and file stability.
- Cross-platform path tests cover separator normalization, Unicode-equivalent names, case collisions, reserved/invalid names, and path-length preflight without silent overwrite/normalization.
- Atomic-replacement and local-disk-exhaustion tests prove valid existing content is preserved on failure.
- Local trash and rename/move tests preserve required recoverability and Obsidian semantics.
- Configuration tests prove unknown configuration is excluded by default and protected operational/auth/device state cannot synchronize.
- Mobile compatibility tests demonstrate that required local behavior does not depend on Node/Electron/Windows-only APIs.
- Lifecycle tests prove startup initialization does not generate unsafe synchronization and iOS interruption can be handed safely to later orchestration.
- Tests prove plugin disable/uninstall/device unlink does not delete shared or local content.
- Tests demonstrate no code path enumerates or mutates the separate Google Drive BRAIN asset repository as part of local-vault synchronization.

## Verification authority

Authoritative executable acceptance is through PHX-CI under DEC-334. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.
