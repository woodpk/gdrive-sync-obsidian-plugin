# C02 — iOS Create → Windows Download/Create

Follow the shared protocol. Requires C01 PASS. Use prerelease `0.1.17` on both devices.

## Purpose

Prove the normal cross-device create path after C01: a file created on iPhone becomes exactly one stable remote object and is then downloaded/created on Windows without conflict, duplicate, unrelated mutation, or recovery.

## Preconditions

1. Preserve the trusted iPhone state established by C01. **Do not reset, deauthorize, re-pair, or clear synchronization state.**
2. Verify both iPhone and Windows are running prerelease `0.1.17`. If Windows is still on an earlier build, install/verify `0.1.17` before beginning C02 and do not run synchronization during the update.
3. On **both devices**, set diagnostics to `Trace` with retention `5000`.
4. On **both devices**, turn OFF these three automatic synchronization settings before creating the fixture:
   - **Startup / resume**
   - **Local changes**
   - **Periodic remote reconciliation**
5. Confirm `test-ios-c02.md` does not already exist locally on either device. If it unexpectedly exists, stop; do not delete or repurpose it as part of this scenario.
6. On each device run the command **Copy diagnostic bundle** and preserve the pre-scenario bundle.

If any automatic synchronization run begins after these preconditions and before the specified manual action, treat the scenario as contaminated: capture diagnostics and stop.

## Fixture

On the **iPhone only**, create `test-ios-c02.md` with exactly this visible text:

```text
C02 iOS create fixture
fixture-id: c02-ios-create-017-7f4c2a91d6e3
origin: iPhone
revision: 1
```

Do not create the file on Windows.

## Step 1 — iPhone remote create

On the iPhone, open the Obsidian Command Palette and choose **Sync now** (`sync-now`).

**Do not choose `Verify/Reconcile Vault` on the iPhone for this step.**

Inspect the synchronization preview before executing. The preview may contain `noop` operations for already-converged paths, but it must contain exactly **one non-noop mutation** for this scenario:

- `upload-create` — `test-ios-c02.md`

There must be:

- no other non-noop mutation;
- no conflict;
- no blocked operation;
- no destructive operation;
- no recovery-required condition;
- no duplicate/alternate remote object behavior.

If the preview differs, **do not execute**. Capture **Copy diagnostic bundle** and stop.

If the preview matches, press **Execute** in the `BRAIN synchronization preview` modal.

There is no separate completion-status screen. After the accepted execution finishes, the preview modal closes. Do not run another synchronization action on the iPhone. Immediately run **Copy diagnostic bundle** and preserve the post-iPhone bundle.

## Step 2 — Windows download/create

On Windows, open the Obsidian Command Palette and choose **Verify/Reconcile Vault** (`verify-reconcile-vault`).

**Do not choose `Sync now` on Windows for this step.**

Inspect the preview. It may contain `noop` operations for already-converged paths, but it must contain exactly **one non-noop mutation** for this scenario:

- `download-create` — `test-ios-c02.md`

There must be:

- no other non-noop mutation;
- no conflict;
- no blocked operation;
- no destructive operation;
- no recovery-required condition;
- no duplicate/alternate local or remote identity.

If the preview differs, **do not execute**. Capture **Copy diagnostic bundle** and stop.

If the preview matches, press **Execute**. When the modal closes after execution, do not invoke another synchronization action. Immediately run **Copy diagnostic bundle** and preserve the post-Windows bundle.

## PASS criteria

C02 passes only if all of the following are established:

- iPhone performed exactly one scenario mutation: `upload-create` for `test-ios-c02.md`;
- Windows performed exactly one scenario mutation: `download-create` for the same path;
- exactly one stable remote object represents the fixture;
- iPhone and Windows contain identical fixture bytes/content hash;
- both device states remain trusted and converge on the same remote identity/mapping;
- neither terminal run reports conflict, blocked work, recovery-required state, duplicate creation, unrelated mutation, or failure;
- diagnostic evidence contains the expected terminal completion for each executed plan.

After preserving the evidence, **stop before C03**. Leave automatic synchronization disabled until the supervisor reviews C02.
