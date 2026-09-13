# C01 — iOS Install / Same-Device Auth / Pairing

Follow the shared protocol. Do not reset an already-correct iOS installation.

Install/verify prerelease `0.1.13` on iPhone using the established private-plugin method. Authenticate on the iPhone itself and deliberately pair to the same stable BRAIN Sync remote.

First pairing preview must use safe-union semantics and contain no deletion caused by missing prior BASE.

PASS: plugin loads on iOS, same-device OAuth succeeds, remote identity/protocol is validated, first reviewed sync preserves both sides and establishes trustworthy device state, terminal status is ready.

Stop before C02.
