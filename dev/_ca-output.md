STATUS: COMPLETE

# Current work-unit evidence — S09 Windows-first execution authorization

## Decision

The S09 execution order is now explicitly device-scoped where the physical proof is independent. Windows-only physical evidence may be collected before iOS availability and before the GitHub/BRAT mobile release exists. Acceptance ordering remains unchanged.

## Immediate Windows install binding

- source commit: `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`
- validation artifact SHA-256: `602b40354f0c5a4ac9906ab4db22d76d71bea688581b3382d4609d0e29a51c76`
- source artifact directory: `C:\temp-2dd7a670f212446995f7038b0eeb9132\.test-build\bvp-live-device\plugin`
- target vault: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b`
- target plugin directory: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync`
- plugin ID: `brain-google-drive-sync`
- preserve existing device-local plugin state: YES

## Boundary

This change authorizes Windows evidence collection only. It does not claim S09A acceptance, does not substitute Windows evidence for iOS evidence, and does not authorize cross-device PASS claims without both devices.

## Immediate next action

Install the exact bound validation artifact into the bound disposable Windows vault, verify installed artifact identity, and stop before physical test execution unless separately instructed.
