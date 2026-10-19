# GDC db4e85ae — PHX-CI F-04 causal assessment

Source candidate: `725fdd155d63c0496f9bc54b99b2de20f8951995` (unchanged).
PHX-CI run: `bf21fd33-9253-459c-a0a9-ec7a7e2ff90a`.
Canonical published evidence commit: `4018dfcc7caa6193b717c17a027eb52700f3ba49`.
Operator evidence commit: `835bd9699ac153c17c8403d3e47161a7867e8607`.
Verdict: BLOCKED; focused BVP PASS, full npm test FAIL (15 failures), build/repository-check/artifacts not executed.

## Demonstrated production-owned discrepancy

`ProductRuntime.deauthorize()` invokes `this.scheduler?.stop()` synchronously, then enters `serializeLifecycle` and invokes `disposeProduct(false)`, which invokes `this.scheduler?.stop()` again before clearing `this.scheduler`. Thus a present scheduler receives **two stop calls** during one deauthorization. The existing Phase5 G2 scenario 50 test asserts exactly one, and PHX-CI observed `2 !== 1`. This is a production implementation flow in `src/product/runtime.ts`, not a defective test setup. Builder must resolve redundant stop semantics while preserving immediate entry-point retirement and durable quiescence ordering. Do not weaken the oracle solely to obtain PASS.

## Other failures requiring separately bounded causal treatment

- `tests/adversarial/s09-g1-runtime-authority-interleavings.test.ts`: newer local adapter not disposed according to its test; source/fixture causal ownership not yet established.
- `tests/architecture/phase6-prelive-platform-runtime-wp2-r1.test.ts`: legacy `Object.create(ProductRuntime.prototype)` mock omits newly initialized `oauthSessions`; `disposeProduct` reads it, causing `TypeError: this.oauthSessions is not iterable`. This is a Tester-owned fixture-construction deficiency; update mock setup, retaining existing quiescence assertions.
- `tests/integration/phase6-h-u2-affected-regression.test.ts` and `phase6-h-u3-dc13-affected-regression.test.ts`: relative side-effect imports reference absent `./workstreams/...` modules in candidate; Tester-owned import/coverage repair required without dropping underlying assertions.
- `tests/contracts/drive/phase6-configured-root-recovery.test.ts`: two `folder` expectations received `unobservable`; determine whether mock observability or production contract changed before altering oracle.
- Other test files failed as top-level modules. Original PHX-CI output must be used to discriminate missing imports, mocks, and substantive production failures.

Do not request another owner PHX-CI run until the demonstrated production defect is corrected and Tester-owned fixtures/imports are repaired. Production changes are Builder-owned. Tester-owned repairs and qualification remain Tester-owned after correction. No production code modified in this finding.
