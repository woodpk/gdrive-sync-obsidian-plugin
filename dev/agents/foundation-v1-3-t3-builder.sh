#!/usr/bin/env bash
set -euo pipefail
P=96b4541b15012ac4ce0d81243b73ef779efd343e
R=dbec3f7a49ebea1e41c4dd71b2171649901ee346

# Start from the previously rejected candidate material only as a reconstruction source.
# Its predecessor prefixes are verified below; every T3 edit is confined to appended V1.3/test bytes.
git checkout "$R" -- \
  src/contracts/common.ts \
  src/contracts/google-drive.ts \
  src/contracts/execution.ts \
  test/phase6-foundation-failure-provenance.test.ts \
  dev/planning-and-building/phase6-sync-contract-freeze.md \
  dev/planning-and-building/phase6-sync-architecture-foundation.md

python3 - <<'PY'
from pathlib import Path

p = Path('src/contracts/execution.ts')
s = p.read_text()
s = s.replace(
    'type OperationalFailureProvenanceV1_3 = import("./common").OperationalFailureProvenanceV1_3;\nexport type RetryableOperationalFailureV1_3',
    'type OperationalFailureProvenanceV1_3 = import("./common").OperationalFailureProvenanceV1_3;\nexport type AuthenticationOperationalFailureV1_3 = Extract<OperationalFailureProvenanceV1_3, { readonly kind: "authentication-required" }>;\nexport type RetryableOperationalFailureV1_3'
)
s = s.replace(
    '| { readonly status: "retryable-failure"; readonly reason: string; readonly operationalFailure: RetryableOperationalFailureV1_3; readonly retrySafety: RetrySafePhysicalAuthorityV1_3 }',
    '| { readonly status: "authentication-required"; readonly reason: string; readonly operationalFailure: AuthenticationOperationalFailureV1_3; readonly effectSafety: RetrySafePhysicalAuthorityV1_3 }\n  | { readonly status: "retryable-failure"; readonly reason: string; readonly operationalFailure: RetryableOperationalFailureV1_3; readonly retrySafety: RetrySafePhysicalAuthorityV1_3 }'
)
s = s.replace(
    'readonly physicalReconciliationRequired: boolean;\n  readonly retryMode: "none" | "ordinary-retry" | "reauthenticate-then-reconcile" | "reconcile-before-redispatch";',
    'readonly physicalReconciliationRequired: boolean;\n  readonly physicalRedispatchSafe: boolean;\n  readonly retryMode: "none" | "ordinary-retry" | "reauthenticate-then-retry" | "reauthenticate-then-reconcile" | "reconcile-before-redispatch";'
)
# Rewrite disposition function as one corrected unit, leaving all predecessor bytes above it untouched.
start = s.index('/** Complete V1.3 disposition derived from both physical execution state and operational cause. */')
new_fn = '''/** Complete V1.3 disposition derived from physical execution state plus operational gates. */
export function executionDispositionV1_3(result: ExecutionResultV1_3): ExecutionDispositionV1_3 {
  switch (result.status) {
    case "durable-verified-success":
      return { primary: "success", physicalReconciliationRequired: false, physicalRedispatchSafe: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "stale-precondition":
      return { primary: "stale-precondition", physicalReconciliationRequired: false, physicalRedispatchSafe: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "cancelled":
      return { primary: "cancelled", physicalReconciliationRequired: false, physicalRedispatchSafe: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "blocking-failure":
      return { primary: "blocking-failure", physicalReconciliationRequired: false, physicalRedispatchSafe: true, retryMode: "none", mutationRedispatchAuthorized: false };
    case "authentication-required":
      return { primary: "authentication-required", physicalReconciliationRequired: false, physicalRedispatchSafe: true, retryMode: "reauthenticate-then-retry", mutationRedispatchAuthorized: false };
    case "retryable-failure": {
      const retryAfterMs = result.operationalFailure.kind === "rate-limited" ? result.operationalFailure.retryAfterMs : undefined;
      return {
        primary: "deferred",
        physicalReconciliationRequired: false,
        physicalRedispatchSafe: true,
        retryMode: "ordinary-retry",
        ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
        mutationRedispatchAuthorized: false,
      };
    }
    case "recovery-required":
      return { primary: "recovery-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
    case "uncertain": {
      const provenance = result.operationalFailure;
      if (!provenance) {
        return { primary: "recovery-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
      }
      switch (provenance.kind) {
        case "authentication-required":
          return { primary: "authentication-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reauthenticate-then-reconcile", mutationRedispatchAuthorized: false };
        case "transient-failure":
          return { primary: "deferred", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
        case "rate-limited":
          return {
            primary: "deferred",
            physicalReconciliationRequired: true,
            physicalRedispatchSafe: false,
            retryMode: "reconcile-before-redispatch",
            ...(provenance.retryAfterMs === undefined ? {} : { retryAfterMs: provenance.retryAfterMs }),
            mutationRedispatchAuthorized: false,
          };
        case "permission-denied":
        case "quota-exhausted":
          return { primary: "blocking-failure", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
        case "recovery-required":
        case "unclassified":
          return { primary: "recovery-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
      }
    }
  }
}
'''
s = s[:start] + new_fn
p.write_text(s)

p = Path('test/phase6-foundation-failure-provenance.test.ts')
s = p.read_text()
needle = '''// Compile-time negative proof: retryable failure cannot omit physical retry-safety authority.\n// @ts-expect-error transient cause alone never proves redispatch safety.\nconst retryWithoutPhysicalSafety: ExecutionResultV1_3 = { status: "retryable-failure", reason: "network", operationalFailure: { kind: "transient-failure", source: "google-drive" } };\nvoid retryWithoutPhysicalSafety;\n'''
insert = needle + '''\n// Compile-time negative proof: physically safe authentication cannot omit no-unresolved-effect authority.\n// @ts-expect-error authentication cause alone never proves physical safety.\nconst safeAuthenticationWithoutPhysicalSafety: ExecutionResultV1_3 = { status: "authentication-required", reason: "no token", operationalFailure: { kind: "authentication-required", source: "google-drive" } };\nvoid safeAuthenticationWithoutPhysicalSafety;\n'''
s = s.replace(needle, insert)
# Add physicalRedispatchSafe to every existing expected disposition object.
s = s.replace('physicalReconciliationRequired: true,\n    retryMode:', 'physicalReconciliationRequired: true,\n    physicalRedispatchSafe: false,\n    retryMode:')
s = s.replace('physicalReconciliationRequired: false,\n    retryMode:', 'physicalReconciliationRequired: false,\n    physicalRedispatchSafe: true,\n    retryMode:')
s = s.replace('mutationRedispatchAuthorized: true,', 'mutationRedispatchAuthorized: false,')
# Add safe-auth execution/disposition chain immediately after C8.
marker = 'test("foundation v1.3 C9: uncertain authentication surfaces auth while requiring physical reconciliation", () => {'
safe_auth = '''test("foundation v1.3 T3: verified-not-applied authentication preserves safe execution without fabricated reconciliation", () => {\n  const result: ExecutionResultV1_3 = {\n    status: "authentication-required",\n    reason: "no usable token before dispatch",\n    operationalFailure: { kind: "authentication-required", source: "google-drive" },\n    effectSafety: { status: "verified-no-unresolved-effect", basis: "pre-dispatch-rejection" },\n  };\n  assert.deepEqual(executionDispositionV1_3(result), {\n    primary: "authentication-required",\n    physicalReconciliationRequired: false,\n    physicalRedispatchSafe: true,\n    retryMode: "reauthenticate-then-retry",\n    mutationRedispatchAuthorized: false,\n  });\n});\n\n'''
s = s.replace(marker, safe_auth + marker)
# Strengthen safe rate limit current-authorization assertions.
s = s.replace(
    'assert.equal(executionDispositionV1_3(result).retryAfterMs, 5000);',
    'assert.deepEqual(executionDispositionV1_3(result), { primary: "deferred", physicalReconciliationRequired: false, physicalRedispatchSafe: true, retryMode: "ordinary-retry", retryAfterMs: 5000, mutationRedispatchAuthorized: false });'
)
p.write_text(s)

p = Path('dev/planning-and-building/phase6-sync-contract-freeze.md')
s = p.read_text()
# T3-C3: remove only rejected appended hard-break whitespace, never predecessor bytes.
s = s.replace('Candidate identity: `phase6-sync-foundation-v1.3-failure-provenance`  \nPredecessor approved foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`  \n',
              'Candidate identity: `phase6-sync-foundation-v1.3-failure-provenance`\n\nPredecessor approved foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`\n\n')
s = s.replace(
    '`ExecutionResultV1_3.status === "retryable-failure"` requires `RetrySafePhysicalAuthorityV1_3`, proving either pre-dispatch rejection or verified-not-applied physical reality. Only that variant may yield ordinary mutation redispatch authority. `uncertain` and `recovery-required` never authorize redispatch; authentication/transient/rate-limit provenance on an uncertain result changes presentation/scheduling only, and physical re-observation/reconciliation remains mandatory.',
    '`ExecutionResultV1_3.status === "retryable-failure"` requires `RetrySafePhysicalAuthorityV1_3`, proving either pre-dispatch rejection or verified-not-applied physical reality. That proof establishes physical redispatch safety only; it does not authorize dispatch now while an operational deferral remains active. `uncertain` and `recovery-required` never authorize redispatch; authentication/transient/rate-limit provenance on an uncertain result changes presentation/scheduling only, and physical re-observation/reconciliation remains mandatory.'
)
s = s.replace(
    '- retryable-failure -> deferred ordinary retry only because `RetrySafePhysicalAuthorityV1_3` proves no unresolved effect;\n- recovery-required -> recovery remains mandatory regardless of operational metadata.',
    '- physically safe authentication -> authentication-required, no physical reconciliation, reauthenticate then retry, physical redispatch safe, current redispatch authorization false;\n- retryable-failure -> deferred ordinary retry opportunity, physical redispatch safe but current redispatch authorization false until scheduling/rate-limit gates establish a future opportunity;\n- recovery-required -> recovery remains mandatory regardless of operational metadata.\n\n`ExecutionDispositionV1_3.physicalRedispatchSafe` reports only absence of unresolved physical effect. `mutationRedispatchAuthorized` means authorized to dispatch now after physical and operational gates; a static failure disposition never pre-authorizes a future dispatch.'
)
p.write_text(s)

p = Path('dev/planning-and-building/phase6-sync-architecture-foundation.md')
s = p.read_text()
s = s.replace(
    '- whether mutation redispatch is currently authorized.\n\nThis prevents downstream A/B/D/H/G interpretations from diverging about the same result.',
    '- whether physical redispatch is safe without reconciliation;\n- whether mutation redispatch is currently authorized after operational gates.\n\nA physically safe authentication rejection uses `reauthenticate-then-retry` without fabricated physical reconciliation. An uncertain authentication result retains `reauthenticate-then-reconcile`. Safe transient/rate-limit failures remain deferred: they are physically redispatch-safe but not currently dispatch-authorized. This prevents downstream A/B/D/H/G interpretations from diverging about the same result.'
)
p.write_text(s)
PY

# Fail if approved predecessor prefixes changed.
python3 - <<'PY'
from pathlib import Path
import hashlib
checks = [
 ('src/contracts/common.ts',2559,'4048ceca9bd2a5022ededf7406a736360330572c'),
 ('src/contracts/google-drive.ts',5457,'dc331d4acd1e7d9c308c0df73232497bf5d85d55'),
 ('src/contracts/execution.ts',3107,'7fd20c94d5852f14bc223b6e5e0280d60fbb5776'),
 ('dev/planning-and-building/phase6-sync-contract-freeze.md',16296,'fe527c76137b2cd578ef7050ee3444498b21a5e0'),
 ('dev/planning-and-building/phase6-sync-architecture-foundation.md',14429,'f67d8ff67ff1915610e5a21ddc3d113c94a2f94b'),
]
for f,n,want in checks:
 b=Path(f).read_bytes()[:n]
 got=hashlib.sha1(f'blob {len(b)}\0'.encode()+b).hexdigest()
 if got != want: raise SystemExit(f'prefix mismatch {f}: {got}')
PY

npm ci
npm run typecheck
npx tsc -p tsconfig.test.json
npm test
npm run build
npm run check
git diff --check "$P"

git config user.name "foundation-v1.3-t3-builder"
git config user.email "foundation-v1.3-t3-builder@users.noreply.github.com"
git add src/contracts/common.ts src/contracts/google-drive.ts src/contracts/execution.ts test/phase6-foundation-failure-provenance.test.ts dev/planning-and-building/phase6-sync-contract-freeze.md dev/planning-and-building/phase6-sync-architecture-foundation.md
git commit -m "foundation v1.3 T3: correct auth and redispatch authority contracts"
git push origin HEAD:phase6-sync-foundation-v1.3-failure-provenance
