import assert from "node:assert/strict";
import test from "node:test";
import type { LocalLifecycleEvent, LocalVaultChange, Unsubscribe } from "../src/contracts";
import { ProductSyncScheduler, type AutomaticSyncSettings } from "../src/product/scheduler";

interface Harness {
  scheduler: ProductSyncScheduler;
  emitChange(change: LocalVaultChange): void;
  emitLifecycle(event: LocalLifecycleEvent): void;
  calls: string[];
  requests: string[];
}

function harness(
  settings: () => AutomaticSyncSettings,
  runAutomatic?: (trigger: string) => Promise<void>,
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
      return () => undefined;
    },
  } as never;
  const calls: string[] = [];
  const requests: string[] = [];
  const controller = {
    runAutomatic: async (trigger: string) => {
      calls.push(trigger);
      await runAutomatic?.(trigger);
    },
    request: async (action: { kind: string }) => {
      requests.push(action.kind);
      return { status: "accepted" as const };
    },
    noteChangeDuringRun: () => undefined,
  } as never;
  return {
    scheduler: new ProductSyncScheduler(local, controller, settings),
    emitChange: change => changeListener(change),
    emitLifecycle: event => lifecycleListener(event),
    calls,
    requests,
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
}

test("Phase5 scenario 31 local-change debounce coalesces repeated events into one automatic pass", async () => {
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

test("Phase5 scenario 32 preserves startup opportunity when vault-ready fired before scheduler registration", async () => {
  const h = harness(() => settings());
  h.scheduler.start();
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.scheduler.stop();
});

test("vault-ready after scheduler registration does not duplicate the initial startup opportunity", async () => {
  const h = harness(() => settings());
  h.scheduler.start();
  await flushMicrotasks();
  h.emitLifecycle({ kind: "vault-ready" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.scheduler.stop();
});

test("startup automatic disabled produces no startup or resume synchronization opportunity", async () => {
  const h = harness(() => settings({ startupResumeEnabled: false }));
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
  const h = harness(() => settings({ startupResumeEnabled: firstSyncCompleted && userStartupEnabled }));
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
  const h = harness(() => settings({ startupResumeEnabled: userStartupEnabled && !recoveryActive }));
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

test("duplicate ready and resume signals are coalesced and lifecycle runs stay serialized", async () => {
  const releases: Array<() => void> = [];
  let active = 0;
  let maximumActive = 0;
  const h = harness(
    () => settings(),
    async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      try {
        await new Promise<void>(resolve => releases.push(resolve));
      } finally {
        active -= 1;
      }
    },
  );

  h.scheduler.start();
  assert.deepEqual(h.calls, ["startup-resume"]);
  h.emitLifecycle({ kind: "vault-ready" });
  h.emitLifecycle({ kind: "resume" });
  h.emitLifecycle({ kind: "resume" });
  h.emitLifecycle({ kind: "resume" });
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume"]);
  assert.equal(maximumActive, 1);

  const releaseFirst = releases.shift();
  assert.ok(releaseFirst);
  releaseFirst();
  await flushMicrotasks();
  assert.deepEqual(h.calls, ["startup-resume", "startup-resume"]);
  assert.equal(maximumActive, 1);

  const releaseSecond = releases.shift();
  assert.ok(releaseSecond);
  releaseSecond();
  await flushMicrotasks();
  assert.equal(maximumActive, 1);
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
