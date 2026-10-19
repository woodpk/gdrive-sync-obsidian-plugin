# S09 G1 — production local-adapter lifetime finding

GDC: db4e85ae-69e0-41bb-8cd9-0ac0dd78cdc8
Corrected Builder production source: c34ce1355919a1d08a71c422dd42c0ec1baf51ad
Working integrated tree (not PHX-CI-qualified): da6dc74ee6ab3c215ef9ae15ff16989122ca502d
Prior observed independent PHX-CI failure: bf21fd33-9253-459c-a0a9-ec7a7e2ff90a, failure F02-02 latest adapter not disposed.

## Confirmed static causal path

1. ProductRuntime.initializeOwned creates `rawLocal = await this.createLocalAdapter()` and explicitly calls `rawLocal.dispose?.()` only on early retirement checks.
2. Successful initialization wraps rawLocal in `ScopedLocalVault`, then `CanonicalEvidenceLocalVault`; stores only `this.local = canonicalLocal`.
3. `ProductRuntime.disposeProduct()` invokes `(this.local as ...).dispose?.()` but `CanonicalEvidenceLocalVault` exposes no `dispose` method. `ScopedLocalVault` also exposes no `dispose` method.
4. Therefore, on normal successful initialization followed by teardown, the actual raw adapter disposal callback is never invoked. The independent F02-02 test exercises exactly this and observed `later teardown must release newest adapter`.

Production owner must implement a resource-safe disposal path without bypassing awaited controller quiescence or changing the Tester-owned assertion. Also preserve safe behavior for retired initializers and prevent double-dispose. Tester must requalify corrected production through PHX-CI. Nothing in this analysis establishes overall PASS.

Other Tester-owned import/fixture repairs remain open and are tracked in dev/test-results/gdc-db4e85ae-qualification-continuation.md on this testing branch.
