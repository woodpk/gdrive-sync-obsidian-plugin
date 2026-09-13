# C02 — iOS Create → Windows Download/Create

Follow the shared protocol. Requires C01 PASS.

On iPhone create `test-ios-c02.md` with deterministic unique text; sync it once. Then sync/Verify-Reconcile Windows.

Expected: iOS performs one safe remote create; Windows performs one `download-create`.

PASS: one stable remote object exists; both devices have identical bytes/hash; both device states converge with no conflict or duplicate.

Stop before C03.
