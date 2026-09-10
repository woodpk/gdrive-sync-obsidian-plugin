#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="$(cd "$ROOT/.." && pwd)"
REPO="$WORKSPACE/repo"
HARNESS="$WORKSPACE/harness"
BRANCH="phase6-logging-log04-sync-execution-durable-effect-tracing"
INPUT="3d81e61252f82957f8a0eaf1cd9e9f372ec49f86"
BASE="48d9e612b69b43be9941f97630c580c2b8aed929"
EVIDENCE_PATH="dev/evidence/_ca-output-agt-ca-p6-log04-sync-execution-durable-effect-tracing-01.md"

cd "$REPO"
test "$(git rev-parse HEAD)" = "$INPUT"
test "$(git merge-base "$BASE" HEAD)" = "$BASE"
REMOTE_HEAD="$(git ls-remote origin "refs/heads/$BRANCH" | awk '{print $1}')"
test "$REMOTE_HEAD" = "$INPUT"

python - <<'PY'
from pathlib import Path

diagnostics = Path('src/product/authority-execution-diagnostics.ts')
text = diagnostics.read_text()
marker = 'function failureBoundary('
helper = '''function safeCorrelationId(operation: PlannedOperation, value: string): string {
  const rawPath = String(operation.path);
  return rawPath && value.includes(rawPath)
    ? diagnosticPathKey(value).replace(/^path-/, "id-")
    : value;
}

function safeCorrelationFields(operation: PlannedOperation, fields: SafeDiagnosticFields): SafeDiagnosticFields {
  return {
    ...fields,
    ...(typeof fields.planId === "string" ? { planId: safeCorrelationId(operation, fields.planId) } : {}),
    ...(typeof fields.operationId === "string" ? { operationId: safeCorrelationId(operation, fields.operationId) } : {}),
    ...(typeof fields.intentId === "string" ? { intentId: safeCorrelationId(operation, fields.intentId) } : {}),
    ...(typeof fields.effectId === "string" ? { effectId: safeCorrelationId(operation, fields.effectId) } : {}),
  };
}

function failureBoundary('''
assert text.count(marker) == 1, 'diagnostic helper insertion point drifted'
text = text.replace(marker, helper, 1)

old = '''    ...(planId ? { planId } : {}),
    operationId: String(operation.operationId),'''
new = '''    ...(planId ? { planId: safeCorrelationId(operation, planId) } : {}),
    operationId: safeCorrelationId(operation, String(operation.operationId)),'''
assert text.count(old) == 1, 'operationFields correlation lines drifted'
text = text.replace(old, new, 1)

old = '''    const completeFields: SafeDiagnosticFields = {
      ...operationFields(operation, operationIndex, planId),
      ...fields,
    };'''
new = '''    const completeFields: SafeDiagnosticFields = safeCorrelationFields(operation, {
      ...operationFields(operation, operationIndex, planId),
      ...fields,
    });'''
assert text.count(old) == 1, 'emitter field construction drifted'
text = text.replace(old, new, 1)

old = '''    const fields: SafeDiagnosticFields = {
      ...operationFields(operation, operationIndex, planId),
      stage: failure?.stage ?? stage,
      ...failedFields(failed),
      ...(result ? { result } : {}),
      ...(stage.startsWith("state-commit") && result ? { commitStatus: result } : {}),
      ...(classification ? { classification } : {}),
    };'''
new = '''    const fields: SafeDiagnosticFields = safeCorrelationFields(operation, {
      ...operationFields(operation, operationIndex, planId),
      stage: failure?.stage ?? stage,
      ...failedFields(failed),
      ...(result ? { result } : {}),
      ...(stage.startsWith("state-commit") && result ? { commitStatus: result } : {}),
      ...(classification ? { classification } : {}),
    });'''
assert text.count(old) == 1, 'observer field construction drifted'
text = text.replace(old, new, 1)
diagnostics.write_text(text)

controller = Path('src/product/product-controller-base.ts')
text = controller.read_text()
marker = 'function conflictCopyBase('
helper = '''function diagnosticPlanId(plan: SynchronizationPlan): string {
  const raw = String(plan.planId);
  if (!plan.operations.some(operation => raw.includes(String(operation.path)))) return raw;
  return `id-sha256:${String(sha256Text(raw)).replace(/^sha256:/, "")}`;
}
function conflictCopyBase('''
assert text.count(marker) == 1, 'controller helper insertion point drifted'
text = text.replace(marker, helper, 1)
old = 'this.syncInfo(runId, "execution-start", { stage: "execution", planId: String(planned.plan.planId), operationCount: planned.plan.operations.length, planDisposition: planned.plan.executionDisposition });'
new = 'this.syncInfo(runId, "execution-start", { stage: "execution", planId: diagnosticPlanId(planned.plan), operationCount: planned.plan.operations.length, planDisposition: planned.plan.executionDisposition });'
assert text.count(old) == 1, 'execution-start planId seam drifted'
text = text.replace(old, new, 1)
controller.write_text(text)
PY

git diff --check
git diff --name-only | sort
ACTUAL_CORRECTION="$(git diff --name-only | sort)"
EXPECTED_CORRECTION="$(printf '%s\n' src/product/authority-execution-diagnostics.ts src/product/product-controller-base.ts | sort)"
test "$ACTUAL_CORRECTION" = "$EXPECTED_CORRECTION"

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add src/product/authority-execution-diagnostics.ts src/product/product-controller-base.ts
git commit -m 'LOG-04 protect path-bearing correlation identifiers'
IMPLEMENTATION_SHA="$(git rev-parse HEAD)"
git push origin "HEAD:$BRANCH"
echo "IMPLEMENTATION_SHA=$IMPLEMENTATION_SHA"

rm -rf .ci-evidence
mkdir -p .ci-evidence

npm ci
npm run typecheck
npx tsc -p tsconfig.test.json

node --test .test-build/test/workstreams/orchestration/log04-execution-diagnostics.test.js > .ci-evidence/log04-focused.tap 2>&1
cat .ci-evidence/log04-focused.tap
FOCUSED_TESTS="$(grep -E '^# tests [0-9]+$' .ci-evidence/log04-focused.tap | tail -1 | awk '{print $3}')"
FOCUSED_PASS="$(grep -E '^# pass [0-9]+$' .ci-evidence/log04-focused.tap | tail -1 | awk '{print $3}')"
FOCUSED_FAIL="$(grep -E '^# fail [0-9]+$' .ci-evidence/log04-focused.tap | tail -1 | awk '{print $3}')"
test "$FOCUSED_TESTS" = "10"
test "$FOCUSED_PASS" = "10"
test "$FOCUSED_FAIL" = "0"

set +e
npm test > .ci-evidence/full-tests.log 2>&1
FULL_EXIT=$?
set -e
cat .ci-evidence/full-tests.log
FULL_TESTS="$(grep -E '^# tests [0-9]+$' .ci-evidence/full-tests.log | tail -1 | awk '{print $3}' || true)"
FULL_PASS="$(grep -E '^# pass [0-9]+$' .ci-evidence/full-tests.log | tail -1 | awk '{print $3}' || true)"
FULL_FAIL="$(grep -E '^# fail [0-9]+$' .ci-evidence/full-tests.log | tail -1 | awk '{print $3}' || true)"
printf 'IMPLEMENTATION_SHA=%s\nFOCUSED_TESTS=%s\nFOCUSED_PASS=%s\nFOCUSED_FAIL=%s\nFULL_EXIT=%s\nFULL_TESTS=%s\nFULL_PASS=%s\nFULL_FAIL=%s\n' \
  "$IMPLEMENTATION_SHA" "$FOCUSED_TESTS" "$FOCUSED_PASS" "$FOCUSED_FAIL" "$FULL_EXIT" "${FULL_TESTS:-N/A}" "${FULL_PASS:-N/A}" "${FULL_FAIL:-N/A}" \
  > .ci-evidence/verification.status

cp .ci-evidence/log04-focused.tap "$HARNESS/.ci-harness/log04-final-focused.tap"
cp .ci-evidence/full-tests.log "$HARNESS/.ci-harness/log04-final-full-tests.log"
cp .ci-evidence/verification.status "$HARNESS/.ci-harness/log04-final-verification.status"

persist_harness() {
  cd "$HARNESS"
  git config user.name 'github-actions[bot]'
  git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
  git add .ci-harness/log04-final-focused.tap .ci-harness/log04-final-full-tests.log .ci-harness/log04-final-verification.status .ci-harness/log04-final-changed-files.txt 2>/dev/null || true
  if ! git diff --cached --quiet; then
    git commit -m 'CI: preserve final LOG-04 verification output'
    git push origin HEAD:ci-log04-continuation-harness
  fi
  cd "$REPO"
}

if [ "$FULL_EXIT" -ne 0 ]; then
  persist_harness
  exit "$FULL_EXIT"
fi

npm run build
BUILD_RESULT=PASS

git diff --check "$BASE..$IMPLEMENTATION_SHA"
git diff --name-status "$BASE..$IMPLEMENTATION_SHA" | tee .ci-evidence/changed-files.txt
cp .ci-evidence/changed-files.txt "$HARNESS/.ci-harness/log04-final-changed-files.txt"
ACTUAL="$(git diff --name-only "$BASE..$IMPLEMENTATION_SHA" | sort)"
EXPECTED="$(printf '%s\n' src/product/authoritative-production-executor-base.ts src/product/authority-execution-diagnostics.ts src/product/product-controller-base.ts test/workstreams/orchestration/log04-execution-diagnostics.test.ts | sort)"
test "$ACTUAL" = "$EXPECTED"
git diff --quiet "$BASE..$IMPLEMENTATION_SHA" -- src/diagnostics/diagnostic-logger.ts
git diff --quiet "$BASE..$IMPLEMENTATION_SHA" -- src/product/operation-isolation.ts
git diff --quiet "$BASE..$IMPLEMENTATION_SHA" -- package.json package-lock.json
DIFF_CHECK_RESULT=PASS

cat >> .ci-evidence/verification.status <<EOF
BUILD=$BUILD_RESULT
DIFF_CHECK=$DIFF_CHECK_RESULT
EOF
cp .ci-evidence/verification.status "$HARNESS/.ci-harness/log04-final-verification.status"
persist_harness

REMOTE_HEAD="$(git ls-remote origin "refs/heads/$BRANCH" | awk '{print $1}')"
test "$REMOTE_HEAD" = "$IMPLEMENTATION_SHA"
mkdir -p "$(dirname "$EVIDENCE_PATH")"
cat > "$EVIDENCE_PATH" <<EOF
# LOG-04 Sync Execution and Durable-Effect Tracing — Evidence

- Agent: agt-ca-p6-log04-sync-execution-durable-effect-tracing-01
- Frozen LOG-01 base: $BASE
- Branch: $BRANCH
- Final implementation SHA: $IMPLEMENTATION_SHA

## Fresh failure attribution

Fresh verification of rejected candidate $INPUT completed dependency installation, typecheck, test-tree compilation, and the focused LOG-04 suite before the complete repository suite reported 740 tests: 737 passed and 3 failed. The three failures were existing path-privacy assertions in phase6-alpha-full-sync-remediation and phase6-alpha-mixed-plan-isolation; the preserved diagnostic output showed LOG-04 correlation fields (planId, operationId, intentId, and effectId) retaining raw vault-path substrings. The failure was therefore directly attributable to LOG-04 correlation instrumentation, not to an environmental or peer-owned defect.

## Bounded correction

The correction preserves the frozen LOG-01 field contract and hashes only correlation identifiers that contain the active operation path, using the existing diagnostic path-key hashing primitive. Controller execution-start plan IDs are likewise converted to a deterministic opaque id-sha256 value only when the plan ID contains one of its operation paths. Safe opaque identifiers remain unchanged; synchronization, retry, authority, persistence, recovery, Drive, and execution-result semantics are unchanged.

## Final verification

- npm ci: PASS
- npm run typecheck: PASS
- test-tree compile (npx tsc -p tsconfig.test.json): PASS
- focused LOG-04 suite: $FOCUSED_PASS/$FOCUSED_TESTS PASS
- complete npm test: $FULL_PASS/$FULL_TESTS PASS (exit $FULL_EXIT)
- npm run build: PASS
- git diff --check $BASE..$IMPLEMENTATION_SHA: PASS
- frozen-base changed files:
  - src/product/authority-execution-diagnostics.ts
  - src/product/authoritative-production-executor-base.ts
  - src/product/product-controller-base.ts
  - test/workstreams/orchestration/log04-execution-diagnostics.test.ts
- src/diagnostics/diagnostic-logger.ts: unchanged from frozen base
- src/product/operation-isolation.ts: unchanged from frozen base
- package.json / package-lock.json: unchanged from frozen base
- live synchronization / Google Drive mutation: NOT PERFORMED

## Stop

LOG-04 is stopped after the separate evidence commit for supervisory review. No integration, merge, release, live synchronization, or Google Drive mutation was performed.
EOF

git add "$EVIDENCE_PATH"
git commit -m 'LOG-04 record verification evidence'
EVIDENCE_SHA="$(git rev-parse HEAD)"
git push origin "HEAD:$BRANCH"
echo "EVIDENCE_SHA=$EVIDENCE_SHA"

cd "$HARNESS"
printf 'IMPLEMENTATION_SHA=%s\nEVIDENCE_SHA=%s\nFOCUSED_TESTS=%s\nFOCUSED_PASS=%s\nFOCUSED_FAIL=%s\nFULL_TESTS=%s\nFULL_PASS=%s\nFULL_FAIL=%s\nFULL_EXIT=%s\nBUILD=PASS\nDIFF_CHECK=PASS\n' \
  "$IMPLEMENTATION_SHA" "$EVIDENCE_SHA" "$FOCUSED_TESTS" "$FOCUSED_PASS" "$FOCUSED_FAIL" "$FULL_TESTS" "$FULL_PASS" "$FULL_FAIL" "$FULL_EXIT" \
  > .ci-harness/log04-final-verification.status
git add .ci-harness/log04-final-verification.status
git commit -m 'CI: record LOG-04 evidence SHA'
git push origin HEAD:ci-log04-continuation-harness
