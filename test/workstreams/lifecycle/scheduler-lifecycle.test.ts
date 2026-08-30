import assert from "node:assert/strict";
import test from "node:test";
import type { LocalLifecycleEvent, LocalVaultChange, Unsubscribe } from "../../../src/contracts";
import { ProductSyncScheduler, type AutomaticSyncSettings } from "../../../src/product/scheduler";

async function flush(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

function settings(overrides: Partial<AutomaticSyncSettings> = {}): AutomaticSyncSettings {
  return {
    startupResumeEnabled: false,
    localChangeEnabled: true,
    periodicEnabled: true,
    periodicIntervalMs: 60_000,
    localDebounceMs: 0,
    ...overrides,
  };
}

test("suspend preserves a pending local-change fact and resume produces one later pass", async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const timers = new Map<number, () => void>();
  let nextTimer = 1;
  globalThis.setTimeout = (((callback: (...args: unknown[]) => void, _delay?: number, ...args: unknown[]) => {
    const id = nextTimer++;
    timers.set(id, () => callback(...args));
    return id;
  }) as unknown) as typeof globalThis.setTimeout;
  globalThis.clearTimeout = (((id: ReturnType<typeof globalThis.setTimeout>) => { timers.delete(Number(id)); }) as unknown) as typeof globalThis.clearTimeout;

  try {
    let changeListener: (change: LocalVaultChange) => void = () => undefined;
    let lifecycleListener: (event: LocalLifecycleEvent) => void = () => undefined;
    const local = {
      onChange(listener: typeof changeListener): Unsubscribe { changeListener = listener; return () => undefined; },
      onLifecycle(listener: typeof lifecycleListener): Unsubscribe { lifecycleListener = listener; return () => undefined; },
    } as never;
    const calls: string[] = [];
    const requests: string[] = [];
    const controller = {
      runAutomatic: async (trigger: string) => { calls.push(trigger); },
      request: async (action: { kind: string }) => { requests.push(action.kind); return { status: "accepted" as const }; },
      noteChangeDuringRun: () => undefined,
    } as never;
    const scheduler = new ProductSyncScheduler(local, controller, () => settings({ periodicEnabled: false }));
    scheduler.start();
    changeListener({ kind: "modified", path: "note.md" as never });
    assert.equal(timers.size, 1);

    lifecycleListener({ kind: "suspend" });
    await flush();
    assert.equal(timers.size, 0, "suspend cancels the active-app debounce timer");
    assert.deepEqual(calls, []);
    assert.deepEqual(requests, ["cancel-active-sync"]);

    lifecycleListener({ kind: "resume" });
    await flush();
    assert.deepEqual(calls, ["local-change"], "the reconciliation fact is replayed once after resume");
    scheduler.stop();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test("periodic active-app opportunity bypasses cached evidence and detects watcher loss", async () => {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const intervals = new Map<number, () => void>();
  let nextInterval = 1;
  globalThis.setInterval = (((callback: (...args: unknown[]) => void) => {
    const id = nextInterval++;
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
        entries: [{
          status: "present",
          side: "local",
          path: "missed.md",
          entityKind: "file",
          stability: "stable",
          content: { hash: "cached-h0" },
        }],
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
    const scheduler = new ProductSyncScheduler(local, controller, () => settings());
    scheduler.start();
    assert.equal(intervals.size, 1);
    [...intervals.values()][0]?.();
    await flush();
    assert.equal(bypassReads, 1);
    assert.deepEqual(calls, ["local-change"], "cache mismatch becomes a reconciliation opportunity without a watcher event");

    lifecycleListener({ kind: "suspend" });
    await flush();
    const readsAtSuspend = bypassReads;
    for (const callback of intervals.values()) callback();
    await flush();
    assert.equal(bypassReads, readsAtSuspend, "no periodic background work is promised while suspended");
    scheduler.stop();
  } finally {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test("an unload gate prevents queued automatic dispatch even when cancellation completion is delayed", async () => {
  let lifecycleListener: (event: LocalLifecycleEvent) => void = () => undefined;
  let releaseCancel: (() => void) | undefined;
  const local = {
    onChange: (_listener: (change: LocalVaultChange) => void): Unsubscribe => () => undefined,
    onLifecycle(listener: typeof lifecycleListener): Unsubscribe { lifecycleListener = listener; return () => undefined; },
  } as never;
  const calls: string[] = [];
  const controller = {
    runAutomatic: async (trigger: string) => { calls.push(trigger); },
    request: async () => new Promise<{ status: "accepted" }>(resolve => { releaseCancel = () => resolve({ status: "accepted" }); }),
    noteChangeDuringRun: () => undefined,
  } as never;
  const scheduler = new ProductSyncScheduler(local, controller, () => settings({ startupResumeEnabled: true, periodicEnabled: false }));
  scheduler.start();
  lifecycleListener({ kind: "vault-ready" });
  lifecycleListener({ kind: "unload" });
  await flush();
  assert.deepEqual(calls, [], "queued startup work cannot dispatch after unload starts");
  releaseCancel?.();
  await flush();
  scheduler.stop();
});
