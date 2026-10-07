# E06 — Authentication / Network / Quota Failure Semantics

Follow the shared protocol; use disposable changes.

Validate separately:

- offline network: local editing continues; remote work defers safely;
- revoked/invalid auth: remote mutation stops and reauthentication is surfaced; local work remains usable;
- a safely inducible rate/quota failure: bounded retry/defer; no destructive fallback.

Do not intentionally exhaust real account storage. If quota/rate failure cannot be safely induced, report that subcase BLOCKED.

PASS requires safe resume after restoring connectivity/auth.

Stop.
