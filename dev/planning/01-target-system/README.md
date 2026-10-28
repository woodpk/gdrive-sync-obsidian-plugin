# Target System

Purpose: define the finished-system contract and requirement traceability.

Allowed artifact classes: `target-system-specification.md`, `requirement-traceability.md`, and bounded subordinate subsystem specifications when necessary to preserve an already accepted contract.

Prohibited artifact classes: build-session prompts, current project state, test-run output, review reports, or implementation journals.

Authority status: the target-system specification is the controlling finished-system contract subject to higher accepted authority. This README is navigation only.

Naming: preserve the canonical filenames for the primary target specification and requirement traceability.


## DEC-357 validation-only subsystem supplement

The BVP target specification includes an Owner-approved new [Windows-only controller OAuth contract](bvp-subsystem-specification.md) (BVP-WCO-001–011), with the full [WS-07 task](../02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md). The shipping product target-system specification and its existing AUTH-001–012 requirements are **unchanged**; separate Node/Windows BVP authentication is outside production code. Current software/real OAuth acceptance remains pending.

