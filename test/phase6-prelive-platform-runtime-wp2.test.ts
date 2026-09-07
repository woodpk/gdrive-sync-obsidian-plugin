import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contractId, type PersistenceRevision, type SemanticStateGeneration, type VaultIdentity } from "../src/contracts";
import { ProductController } from "../src/product/product-controller";
import {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
} from "../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const rev = id<"StateRevision">("state:1") as PersistenceRevision;
const gen = id<"SemanticStateGeneration">("semantic:1") as SemanticStateGeneration;
const vault = id<"VaultIdentity">("vault:wp2") as VaultIdentity;
const device = id<"DeviceIdentity">("device:wp2");

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return `fnv1a32:${hash.toString(16).padStart(8, "0")}`;
}

async function malformedDescriptorLoad(descriptor: Record<string, unknown>) {
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage);
  const state = createInitialAuthorityState({ persistenceRevision: rev, semanticGeneration: gen, vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await store.saveTrusted(state)).status, "saved");
  const envelope = JSON.parse(new TextDecoder().decode(storage.bytes!)) as { checksum: string; state: Record<string, unknown> & { operationIntents: unknown[] } };
  envelope.state.operationIntents = [{
    logicalKind: "single-effect",
    operationId: "op:malformed",
    intentId: "intent:malformed",
    semanticAuthority: { generation: String(gen) },
    effects: [{ effectId: "effect:malformed", descriptor, stage: "intent-persisted" }],
  }];
  const payload = JSON.stringify(envelope.state);
  envelope.checksum = checksum(payload);
  storage.bytes = new TextEncoder().encode(JSON.stringify(envelope));
  return new PersistentSynchronizationStateStore(storage).load({ expectation:"existing-pairing", expectedVaultIdentity:vault, expectedDeviceIdentity:device });
}

test("malformed persisted physical descriptors fail closed during state load", async () => {
  const malformed = [
    { kind:"local-file", targetSide:"local", mutationKind:"replace", targetPath:"notes/a.md" },
    { kind:"remote-file", targetSide:"remote", mutationKind:"create", targetPath:"notes/a.md", intendedContent:{algorithm:"sha256",hash:"h",sizeBytes:1}, remoteMutation:{kind:"existing-file-content-update"} },
    { kind:"move", targetSide:"remote", fromPath:"notes/a.md", toPath:"notes/b.md", identityAuthority:{status:"unique",generation:String(gen),path:"notes/a.md",remoteObjectId:"remote:a"} },
    { kind:"trash", targetSide:"remote", path:"notes/a.md", remoteObjectId:"remote:a", baseAuthority:{generation:String(gen),path:"wrong.md",fingerprint:"base:a"} },
  ];
  for (const descriptor of malformed) {
    const loaded = await malformedDescriptorLoad(descriptor);
    assert.equal(loaded.status, "recovery-required");
  }
});

test("controller quiescence does not settle while an in-flight run promise remains blocked", async () => {
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const fake = { inFlight: new Set<Promise<unknown>>([blocked]) };
  let settled = false;
  const waiting = ProductController.prototype.awaitQuiescence.call(fake as never).then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  fake.inFlight.delete(blocked);
  release();
  await waiting;
  assert.equal(settled, true);
});

test("runtime teardown stops scheduler and awaits quiescence before resource disposal", () => {
  const source = readFileSync(new URL("../src/product/runtime.ts", import.meta.url), "utf8");
  const stop = source.indexOf("this.scheduler?.stop()");
  const quiesce = source.indexOf("await controller.beginRuntimeDisposal()");
  const dispose = source.indexOf("disposable?.dispose?.()", quiesce);
  assert.ok(stop >= 0 && quiesce > stop && dispose > quiesce);
});

test("preview execution has pending guard and finally-reset while failure leaves modal open", () => {
  const source = readFileSync(new URL("../src/product/plan-modal.ts", import.meta.url), "utf8");
  assert.match(source, /if \(this\.executionPending\) return;/);
  assert.match(source, /button\.setDisabled\(true\)/);
  assert.match(source, /catch \{/);
  assert.match(source, /Synchronization execution failed/);
  assert.match(source, /finally \{/);
  assert.match(source, /this\.executionPending = false/);
  assert.match(source, /if \(!this\.executionAccepted\) button\.setDisabled\(false\)/);
  assert.match(source, /if \(result\.status === "accepted"\) \{ this\.executionAccepted = true; this\.close\(\); \}/);
});
