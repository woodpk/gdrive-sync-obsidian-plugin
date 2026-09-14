import assert from "node:assert/strict";
import test from "node:test";
import type { LocalLifecycleEvent, LocalVaultChange, Unsubscribe } from "../src/contracts";
import {
  CoreRunCoordinator,
  consumeDeferredReconciliationAcrossLifecycle,
  enterSynchronizationLifecycle,
  type RunLease,
  type RunLeasePort,
} from "../src/core/run-coordinator";
import { ProductSyncScheduler, type AutomaticSyncSettings } from "../src/product/scheduler";

interface Harness {
  scheduler: ProductSyncScheduler;
  emitChange(change: LocalVaultChange): void;
  emitLifecycle(event: LocalLifecycleEvent): void;
  calls: string[];
  requests: string[];
  noteChangeCalls: number[];
}

function harness(
  settings: () => AutomaticSyncSettings,
  runAutomatic?: (trigger: string) => Promise<void>,
  readyBeforeRegistration = false,
): Harness {
  let changeListener: (change: LocalVaultChange) => void = () => undefined;
  let lifecycleListener: (event: LocalLifecycleEvent) => void = () => undefined;
  const local = {
    onChange(listener: (change: LocalVaultChange) => void): Unsubscribe {
      changeListener = listener;
      return () => undefined;
    },
    onLifecycle(listener: (event: LocalLifecycleEvent) => void): Unsubscribe {
      lifecycleListener = listener;
      if (readyBeforeRegistration) listener({ kind: "vault-ready" });
      return () => undefined;
    },
  } as never;
  const calls: string[] = [];
  const requests: string[] = [];
  const noteChangeCalls: number[] = [];
  const controller = {
    runAutomatic: async (trigger: string) => {
      calls.push(trigger);
      await runAutomatic?.(trigger);
    },
    request: async (action: { kind: string }) => {
      requests.push(action.kind);
      return { status: "accepted" as const };
    },
    noteChangeDuringRun: () => { noteChangeCalls.push(1); },
  } as never;
  return {
    scheduler: new ProductSyncScheduler(local, controller, settings),
    emitChange: change => changeListener(change),
    emitLifecycle: event => lifecycleListener(event),
    calls,
    requests,
    noteChangeCalls,
  };
}

function settings(overrides: Partial<AutomaticSyncSettings> = {}): AutomaticSyncSettings {
  return {
    startupResumeEnabled: true,
    localChangeEnabled: false,
    periodicEnabled: false,
    periodicIntervalMs: 60_000,
    localDebounceMs: 1_000,
    ...overrides,
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test("disabled local-change automatic synchronization ignores local events without deferring or scheduling a pass", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const callbacks = new Map<number, () => void>();
  let next = 1;
  globalThis.setTimeout = (((callback: (...args: unknown[]) => void, _delay?: number, ...args: unknown[]) => {
    const timerId = next++;
    callbacks.set(timerId, () => callback(...args));
    return timerId;
  }) as unknown) as typeof globalThis.setTimeout;
  try {
    const h = harness(() => settings({ startupResumeEnabled: false, localChangeEnabled: false }));
    h.scheduler.start();
    h.emitChange({ kind: "modified", path: "disabled.md" as never });
    await flushMicrotasks();
    assert.equal(h.noteChangeCalls.length, 0);
    assert.equal(callbacks.size, 0);
    assert.deepEqual(h.calls, []);
    h.scheduler.stop();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const callbacks = new Map<number, () => void>();
  let next = 1;
  globalThis.setTimeout = (((callback: (...args: unknown[]) => void, _delay?: number, ...args: unknown[]) => {
    const id = next++;
    callbacks.set(id, () => callback(...args));
    return id;
  }) as unknown) as typeof globalThis.setTimeout;
  globalThis.clearTimeout = (((id: ReturnType<typeof globalThis.setTimeout>) => {
    callbacks.delete(Number(id));
  }) as unknown) as typeof globalThis.clearTimeout;
  try {
    const h = harness(() => settings({ startupResumeEnabled: false, localChangeEnabled: true }));
    h.scheduler.start();
    h.emitChange({ kind: "modified", path: "a.md" as never });
    h.emitChange({ kind: "modified", path: "a.md" as never });
    assert.equal(h.noteChangeCalls.length, 0, "watcher follow-up is scheduler-owned rather than recursive controller deferral");
    assert.equal(callbacks.size, 1);
    const callback = [...callbacks.values()][0];
    assert.ok(callback);
    callback();
    await flushMicrotasks();
    assert.deepEqual(h.calls, ["local-change"]);
    h.scheduler.stop();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("Phase5 scenario 33 refresh replaces periodic timer with live cadence", () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const created: Array<{ id: number; delay: number }> = [];
  const cleared: number[] = [];
  let next = 1;
  globalThis.setInterval = (((_callback: (...args: unknown[]) => void, delay?: number) => {
    const id = next++;
    created.push({ id, delay: Number(delay) });
    return id;
  }) as unknown) as typeof globalThis.setInterval;
  globalThis.clearInterval = (((id: ReturnType<typeof globalThis.setInterval>) => {
    cleared.push(Number(id));
  }) as unknown) as typeof globalThis.clearInterval;
  try {
    let interval = 60_000;
    const h = harness(() => settings({ startupResumeEnabled: false, periodicEnabled: true, periodicIntervalMs: interval }));
    h.scheduler.start();
    assert.equal(created.at(-1)?.delay, 60_000);
    interval = 180_000;
    h.scheduler.refresh();
    assert.equal(cleared.includes(created[0].id), true);
    assert.equal(created.at(-1)?.delay, 180_000);
    h.scheduler.stop();
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("Phase5 scenario 32 replays startup opportunity when vault-ready fired before scheduler registration", async () => {
  const h = harness(() => settings(), undefined, true);
  h.scheduler.start();
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.scheduler.stop();
});

test("vault becoming ready after scheduler registration produces exactly one startup opportunity", async () => {
  const h = harness(() => settings());
  h.scheduler.start();
  await flushMicrotasks();
  assert.deepEqual(h.calls, []);
  h.emitLifecycle({ kind: "vault-ready" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.emitLifecycle({ kind: "vault-ready" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.scheduler.stop();
});

test("startup automatic disabled produces no startup or resume synchronization opportunity", async () => {
  const h = harness(() => settings({ startupResumeEnabled: false }), undefined, true);
  h.scheduler.start();
  h.emitLifecycle({ kind: "vault-ready" });
  h.emitLifecycle({ kind: "resume" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, []);
  h.scheduler.stop();
});

test("first sync incomplete keeps scheduler startup automatic ineligible", async () => {
  let firstSyncCompleted = false;
  const userStartupEnabled = true;
  const h = harness(() => settings({ startupResumeEnabled: firstSyncCompleted && userStartupEnabled }), undefined, true);
  h.scheduler.start();
  h.emitLifecycle({ kind: "vault-ready" });
  h.emitLifecycle({ kind: "resume" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, []);
  firstSyncCompleted = true;
  h.emitLifecycle({ kind: "resume" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.scheduler.stop();
});

test("active recovery keeps scheduler startup automatic ineligible", async () => {
  let recoveryActive = true;
  const userStartupEnabled = true;
  const h = harness(() => settings({ startupResumeEnabled: userStartupEnabled && !recoveryActive }), undefined, true);
  h.scheduler.start();
  h.emitLifecycle({ kind: "vault-ready" });
  h.emitLifecycle({ kind: "resume" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, []);
  recoveryActive = false;
  h.emitLifecycle({ kind: "resume" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.scheduler.stop();
});

test("rapid ready/resume burst coalesces and preserves one future reconciliation while a run is active", async () => {
  const releases: Array<() => void> = [];
  const h = harness(
    () => settings(),
    async () => new Promise<void>(resolve => releases.push(resolve)),
    true,
  );

  h.scheduler.start();
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.emitLifecycle({ kind: "vault-ready" });
  h.emitLifecycle({ kind: "resume" });
  h.emitLifecycle({ kind: "resume" });
  h.emitLifecycle({ kind: "resume" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"], "burst is coalesced while the active opportunity is outstanding");

  releases.shift()?.();
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume", "startup-resume"], "one later reconciliation survives the burst");
  releases.shift()?.();
  await flushMicrotasks();
  h.scheduler.stop();
});

test("Phase5 scenario 50 unload requests cancellation and scheduler teardown is non-mutating", async () => {
  const h = harness(() => settings({ startupResumeEnabled: false }));
  h.scheduler.start();
  h.emitLifecycle({ kind: "unload" });
  await flushMicrotasks();
  assert.deepEqual(h.requests, ["cancel-active-sync"]);
  assert.deepEqual(h.calls, []);
  h.scheduler.stop();
});

test("suspension during awaited lease acquisition releases the late lease without run authority", async () => {
  enterSynchronizationLifecycle("active");
  let resolveAcquire: ((lease: RunLease) => void) | undefined;
  let releases = 0;
  const port: RunLeasePort = { tryAcquire: async () => new Promise<RunLease>(resolve => { resolveAcquire = resolve; }) };
  const runs = new CoreRunCoordinator("vault:lifecycle" as never, "device:lifecycle" as never, port, "holder");
  const pending = runs.beginRun();
  await Promise.resolve();
  enterSynchronizationLifecycle("suspending");
  resolveAcquire?.({ release: async () => { releases += 1; } });
  assert.equal((await pending).status, "stopping");
  assert.equal(releases, 1);
  assert.equal(runs.canStartNextOperation(), false);
  enterSynchronizationLifecycle("active");
});

test("concurrent begin requests serialize before lease acquisition and preserve one follow-up fact", async () => {
  enterSynchronizationLifecycle("active");
  let resolveAcquire: ((lease: RunLease) => void) | undefined;
  let acquisitions = 0;
  const port: RunLeasePort = { tryAcquire: async () => { acquisitions += 1; return new Promise<RunLease>(resolve => { resolveAcquire = resolve; }); } };
  const runs = new CoreRunCoordinator("vault:lifecycle" as never, "device:lifecycle" as never, port, "holder");
  const first = runs.beginRun();
  await Promise.resolve();
  assert.equal((await runs.beginRun()).status, "already-running");
  assert.equal(acquisitions, 1);
  resolveAcquire?.({ release: async () => undefined });
  assert.equal((await first).status, "started");
  assert.deepEqual(await runs.finishRun(), { reconcileAgain: true });
});

test("stopping state blocks subsequent operations and retains deferred reconciliation for resume", async () => {
  enterSynchronizationLifecycle("active");
  const runs = new CoreRunCoordinator(
    "vault:lifecycle" as never,
    "device:lifecycle" as never,
    { tryAcquire: async () => ({ release: async () => undefined }) },
    "holder",
  );
  assert.equal((await runs.beginRun()).status, "started");
  runs.noteLocalOrRemoteChangeDuringRun();
  enterSynchronizationLifecycle("suspending");
  assert.equal(runs.canStartNextOperation(), false);
  assert.equal(runs.isCancellationRequested(), true);
  assert.deepEqual(await runs.finishRun(), { reconcileAgain: false });
  assert.equal(consumeDeferredReconciliationAcrossLifecycle(), true);
  enterSynchronizationLifecycle("active");
});

test("cooperative cancellation signal is observable exactly once", async () => {
  enterSynchronizationLifecycle("active");
  const runs = new CoreRunCoordinator(
    "vault:lifecycle" as never,
    "device:lifecycle" as never,
    { tryAcquire: async () => ({ release: async () => undefined }) },
    "holder",
  );
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

test("periodic active-app policy consumes cache-bypassing integrity evidence even without a watcher event", async () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const intervals = new Map<number, () => void>();
  let next = 1;
  globalThis.setInterval = (((callback: (...args: unknown[]) => void) => {
    const id = next++;
    intervals.set(id, () => callback());
    return id;
  }) as unknown) as typeof globalThis.setInterval;
  globalThis.clearInterval = (((id: ReturnType<typeof globalThis.setInterval>) => { intervals.delete(Number(id)); }) as unknown) as typeof globalThis.clearInterval;
  try {
    let lifecycleListener: (event: LocalLifecycleEvent) => void = () => undefined;
    let bypassReads = 0;
    const local = {
      onChange: (_listener: (change: LocalVaultChange) => void): Unsubscribe => () => undefined,
      onLifecycle(listener: typeof lifecycleListener): Unsubscribe { lifecycleListener = listener; return () => undefined; },
      enumerate: async () => ({
        entries: [{ status: "present", side: "local", path: "missed.md", entityKind: "file", stability: "stable", content: { hash: "cached-h0" } }],
        completeness: { status: "complete" },
      }),
      readFileBypassingEvidenceCache: async () => {
        bypassReads += 1;
        return { content: new Uint8Array([1]), evidence: { hash: "actual-h1" }, stability: "stable" };
      },
    } as never;
    const calls: string[] = [];
    const controller = {
      runAutomatic: async (trigger: string) => { calls.push(trigger); },
      request: async () => ({ status: "accepted" as const }),
      noteChangeDuringRun: () => undefined,
    } as never;
    const scheduler = new ProductSyncScheduler(local, controller, () => settings({ localChangeEnabled: true, periodicEnabled: true }));
    scheduler.start();
    assert.equal(intervals.size, 1);
    [...intervals.values()][0]?.();
    await flushMicrotasks();
    assert.equal(bypassReads, 1);
    assert.deepEqual(calls, ["local-change"]);

    lifecycleListener({ kind: "suspend" });
    await flushMicrotasks();
    const readsAtSuspend = bypassReads;
    for (const callback of intervals.values()) callback();
    await flushMicrotasks();
    assert.equal(bypassReads, readsAtSuspend, "periodic work is active-app only and makes no iOS background promise");
    scheduler.stop();
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});
