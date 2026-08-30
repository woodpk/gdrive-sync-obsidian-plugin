import assert from "node:assert/strict";
import test from "node:test";
import { CoreRunCoordinator, consumeDeferredReconciliationAcrossLifecycle, enterSynchronizationLifecycle, type RunLease, type RunLeasePort } from "../../../src/core/run-coordinator";

function coordinator(port: RunLeasePort): CoreRunCoordinator {
  return new CoreRunCoordinator("vault:test" as never, "device:test" as never, port, "holder");
}

test("suspension during lease acquisition refuses the late lease", async () => {
  enterSynchronizationLifecycle("active");
  let resolveAcquire: ((lease: RunLease) => void) | undefined;
  let releases = 0;
  const runs = coordinator({ tryAcquire: async () => new Promise<RunLease>(resolve => { resolveAcquire = resolve; }) });
  const pending = runs.beginRun();
  await Promise.resolve();
  enterSynchronizationLifecycle("suspending");
  resolveAcquire?.({ release: async () => { releases += 1; } });
  assert.equal((await pending).status, "paused");
  assert.equal(releases, 1);
  assert.equal(runs.canStartNextOperation(), false);
  enterSynchronizationLifecycle("active");
});

test("concurrent begin calls produce one lease acquisition and one deferred reconciliation", async () => {
  enterSynchronizationLifecycle("active");
  let resolveAcquire: ((lease: RunLease) => void) | undefined;
  let acquisitions = 0;
  const port: RunLeasePort = { tryAcquire: async () => { acquisitions += 1; return new Promise<RunLease>(resolve => { resolveAcquire = resolve; }); } };
  const runs = coordinator(port);
  const first = runs.beginRun();
  await Promise.resolve();
  assert.equal((await runs.beginRun()).status, "already-running");
  assert.equal(acquisitions, 1);
  resolveAcquire?.({ release: async () => undefined });
  assert.equal((await first).status, "started");
  assert.equal((await runs.finishRun()).reconcileAgain, true);
});

test("stopping blocks subsequent operations and preserves a later reconciliation opportunity", async () => {
  enterSynchronizationLifecycle("active");
  const runs = coordinator({ tryAcquire: async () => ({ release: async () => undefined }) });
  assert.equal((await runs.beginRun()).status, "started");
  runs.noteLocalOrRemoteChangeDuringRun();
  enterSynchronizationLifecycle("suspending");
  assert.equal(runs.canStartNextOperation(), false);
  assert.equal(runs.isCancellationRequested(), true);
  assert.deepEqual(await runs.finishRun(), { reconcileAgain: false });
  assert.equal(consumeDeferredReconciliationAcrossLifecycle(), true);
  enterSynchronizationLifecycle("active");
});

test("cooperative cancellation signal is delivered exactly once", async () => {
  enterSynchronizationLifecycle("active");
  const runs = coordinator({ tryAcquire: async () => ({ release: async () => undefined }) });
  assert.equal((await runs.beginRun()).status, "started");
  const signal = runs.cancellationSignal();
  let delivered = 0;
  signal.onCancellation(() => { delivered += 1; });
  runs.requestCancellation();
  runs.requestCancellation();
  assert.equal(signal.cancelled, true);
  assert.equal(delivered, 1);
  assert.equal(runs.canStartNextOperation(), false);
  await runs.finishRun();
});
