import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import test from "node:test";
import { ProductController } from "../src/product/product-controller";
import { ProductControllerBase } from "../src/product/product-controller-base";

function deferred(): { promise: Promise<void>; release: () => void } {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

async function loadRuntimeClass() {
  const shimDir = ".test-build/node_modules/obsidian";
  await mkdir(shimDir, { recursive: true });
  await writeFile(
    `${shimDir}/index.js`,
    `class Notice { constructor(message) { this.message = message; } }\nmodule.exports = { Notice, Platform: { isDesktopApp: false, isMobile: true }, requestUrl: async () => { throw new Error("requestUrl should not execute in this harness"); } };\n`,
    "utf8",
  );
  const module = await import("../src/product/runtime");
  return module.ProductRuntime;
}

test("R3-R1 runtime disposal waits for a blocked direct preview and rejects later previews without touching dependencies", async () => {
  const blocked = deferred();
  let assemblyTouches = 0;
  const basePrototype = ProductControllerBase.prototype as unknown as {
    previewVerifyReconcile: () => Promise<undefined>;
    request: (action: { kind: string }) => Promise<{ status: "accepted" }>;
  };
  const originalPreview = basePrototype.previewVerifyReconcile;
  const originalRequest = basePrototype.request;
  basePrototype.previewVerifyReconcile = async () => {
    assemblyTouches += 1;
    await blocked.promise;
    return undefined;
  };
  basePrototype.request = async () => ({ status: "accepted" });

  try {
    const controller = Object.create(ProductController.prototype) as ProductController & {
      inFlight: Set<Promise<unknown>>;
      disposing: boolean;
      runtimeDiagnostics?: undefined;
    };
    controller.inFlight = new Set<Promise<unknown>>();
    controller.disposing = false;
    controller.runtimeDiagnostics = undefined;

    const firstPreview = controller.previewVerifyReconcile();
    await Promise.resolve();
    assert.equal(assemblyTouches, 1, "direct preview must enter assembly before disposal starts");

    const ProductRuntime = await loadRuntimeClass();
    const runtime = Object.create(ProductRuntime.prototype) as InstanceType<typeof ProductRuntime> & Record<string, unknown>;
    let schedulerStops = 0;
    let localDisposals = 0;
    let attentionDisposals = 0;
    Object.assign(runtime, {
      scheduler: { stop: () => { schedulerStops += 1; } },
      controller,
      unsubscribe: () => undefined,
      attentionPersistence: { dispose: () => { attentionDisposals += 1; } },
      local: { dispose: () => { localDisposals += 1; } },
      boundary: {},
      state: {},
      audit: {},
      attention: {},
    });

    const disposal = runtime.disposeProduct();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(schedulerStops, 1);
    assert.equal(localDisposals, 0, "runtime dependencies must remain live while the direct preview is blocked");
    assert.equal(attentionDisposals, 0, "state-adjacent persistence must remain live while the direct preview is blocked");

    const refused = await controller.previewVerifyReconcile();
    assert.equal(refused, undefined);
    assert.equal(assemblyTouches, 1, "a preview requested after disposal begins must not touch assembly dependencies");

    blocked.release();
    await firstPreview;
    await disposal;
    assert.equal(localDisposals, 1);
    assert.equal(attentionDisposals, 1);
  } finally {
    basePrototype.previewVerifyReconcile = originalPreview;
    basePrototype.request = originalRequest;
  }
});