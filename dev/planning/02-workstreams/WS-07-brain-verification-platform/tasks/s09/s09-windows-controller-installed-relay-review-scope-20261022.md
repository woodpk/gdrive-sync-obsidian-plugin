# WS-07 / S09 — Windows BVP controller-to-installed-plugin relay compatibility

## Purpose and bounded acceptance requirements

Enable the existing PHX-CI-coordinated BVP controller to communicate with the existing **Windows validation-only** BRAIN plugin installed in the disposable S08F BVP vault. This is a nonshipping testing-infrastructure correction, not a change to the released BRAIN product, its synchronization behavior, pairing, or installed artifact.

## Required behavior and invariants

1. **One command path.** The controller and installed validation-only plugin must address the same genuine on-disk relay under the approved BVP vault. A second uncoordinated relay, permissive directory fallback, junction, symlink, daemon, copied mailbox or parallel validation authority is prohibited.
2. **Explicit scope binding.** Any exception to the default disposable controller relay location must be selected explicitly for the single approved Windows live-smoke battery and its known plugin directory. Reject other vaults, plugin IDs, networks, UNC paths, parent traversal and scope ambiguity.
3. **Isolated controller evidence.** Checkpoints, expected installed-artifact evidence, PHX-CI records and other scratch outputs remain in a distinct C:\temp\<GUID> run directory; reject cross-run data, symlinks and path escapes.
4. **Existing installation only.** Preserve and verify the installed validation plugin's exact build identity and manifest, the current enabled-plugin and pairing state, and the fact that automatic synchronization is disabled. Never reset `data.json`, rotate device identity, alter OAuth, install or replace plugin binaries, or silently repair an unexpected state.
5. **Single controller and device.** Existing controller authority, run leases, command ordering, receipt correlation, privacy restrictions, immutable original evidence, and retry/checkpoint safety must remain fail-closed. Do not bypass PHX-CI or invent independent verification.
6. **Remote side effects limited.** Existing BVP mailbox command/result metadata operations may be exercised only after an explicitly bounded physical execution decision and verified fixture root/ownership. Do not create a new mailbox root implicitly, alter the production managed Drive root, mutate personal-vault data, delete historical BVP evidence or start product synchronization.
7. **Privacy and identity.** The real installed device's command-routing identity and any privacy-safe published pseudonym must be correctly bound without disclosing raw pairing IDs, vault/root IDs, tokens or contents in PHX-CI evidence; reject an unproven identity mapping rather than forcing an apparent PASS.
8. **No automatic progression.** Software verification and independent review of this correction alone do not authorize a physical battery, S09A–S09V, iOS, Stage 3, personal-vault activation or any release transition.

## Review boundaries

The independent Reviewer assesses the immutable source against these neutral requirements and the repository's active architecture/decision authorities. During blind Pass 1 do **not** consult the Builder's narrative, tests, prior review findings, Git history or PHX-CI records; publish a frozen source assessment first. Only afterward inspect ten-family test adequacy and original qualified PHX-CI evidence, and publish a separate final verdict. The Reviewer's acceptance decision is **software-only** and does not assert physical readiness.