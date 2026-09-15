# E05 — Destructive Circuit Breaker

Follow the shared protocol. Use a disposable validation vault/remote populated with enough fixtures to exceed the current destructive-safety threshold.

Create a legitimate-looking bulk local deletion, then preview only.

PASS: destructive execution is blocked before mutation, the affected scope/recovery checkpoint is surfaced for explicit review, and there is no force bypass. Do **not** approve/execute the bulk deletion during this test.

Stop.
