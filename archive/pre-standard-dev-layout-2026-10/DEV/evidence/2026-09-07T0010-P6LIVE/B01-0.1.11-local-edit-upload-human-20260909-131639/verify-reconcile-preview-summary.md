# B01 Verify/Reconcile Preview Summary

- Preview observed: `2026-09-09T13:33:48.985Z` (`advisoryAtMs=1788960828985`)
- Plan ID: `plan:aaaac2cd8943bafcd7913f36eb7039cde07b97bb7858ebae41d5f32333ca3b87`
- Trigger: `verify-reconcile`
- Total operations: 14
- Disposition: `requires-user-approval`
- `upload-update`: 1
- `noop`: 12
- `blocked-unsafe`: 1

## Intended fixture operation

- `upload-update` — `test-file-01.md` — only local content differs from the trusted BASE.

## Unexpected blocking operation

- `blocked-unsafe` — `__brain_sync_portable_config__/app.json` — multiple distinct remote objects occupy the same logical path.
- Error-ledger reason code: `identity-ambiguous`.
- The plan therefore violates B01's required safe shape: no blocked operation and no unrelated portable-configuration issue.

## No-op paths

- `Logs.md`
- `Recipe-Meal.md`
- `Terms Dictionary (TRANSFER TO BRAIN ONCE UP AND RUNNING).md`
- `Untitled.md`
- `__brain_sync_portable_config__/appearance.json`
- `__brain_sync_portable_config__/core-plugins.json`
- `__brain_sync_portable_config__/hotkeys.json`
- `oral_health_idea.md`
- `test-file-02.md`
- `test-file-03.md`
- `test-file-04.md`
- `test-file-05.md`

Safety review: FAIL. The plan was not approved or executed.
