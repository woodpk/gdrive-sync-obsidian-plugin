# C01 — iOS Install / Same-Device Auth / Pairing

Follow the shared protocol. Do not reset an already-correct iOS installation.

## Executed authority

C01 was revalidated on iPhone with prerelease `0.1.17` under the active authority epoch in `00-live-validation-protocol.md`.

Authenticate on the iPhone itself and deliberately pair to the same stable BRAIN Sync remote. First pairing preview must use safe-union semantics and contain no deletion caused by missing prior BASE.

PASS criteria: plugin loads on iOS, same-device OAuth succeeds, remote identity/protocol is validated, first reviewed synchronization preserves both sides and establishes trustworthy device state, and the terminal state is trusted/ready.

## Real-platform result — PASS

**Disposition: C01 PASS.**

Observed real-platform evidence established all required C01 outcomes:

- same-device OAuth completed successfully on mobile;
- managed remote validation/pairing succeeded;
- the first reviewed plan contained 16 operations, zero destructive actions, and preserved safe-union first-sync behavior;
- the repaired local transaction artifact-path implementation no longer failed on the first iOS `download-create`;
- the first execution safely committed 13 operations and skipped three attention-required opaque-binary conflicts rather than forcing them;
- subsequent bounded durable recovery converged and reported zero outstanding recovery work;
- final reviewed manual convergence plan contained 16 `noop` operations, zero conflicts, zero blocked operations, zero destructive actions, and `stateStatus=trusted`;
- final terminal event reported `result=complete`, `safeCommittedCount=16`, `skippedCount=0`, and `stateStatus=trusted`.

The product has no separate post-execution completion-status screen. An accepted **Execute** action closes the plan modal; C01 terminal completion was established from the diagnostic terminal event and converged device state.

### Retained observation — `C01-OBS-01`

An automatic `local-change` synchronization run entered outstanding durable recovery while the C01 state was converging and then emitted a planning failure after selecting an outstanding intent. A later bounded recovery run selected the outstanding intents, completed with `result=recovered` and zero remaining recovery work, and the final manual run completed cleanly in trusted state.

This observation does **not** invalidate C01 because the product failed closed, later reconciled from durable state, and final convergence was established. It remains retained for later targeted follow-up; do not erase or rewrite it as a successful automatic run.

C01 is closed. Proceed to C02 only under the active `0.1.17` authority epoch.
