from pathlib import Path

p = Path("test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts")
t = p.read_text(encoding="utf-8")
import_line = 'import { ProductSynchronizationExecutor } from "../../../src/product/production-executor";\n'
addition_import = 'import { createInitialAuthorityState, MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../../../src/state/persistent-state-store";\n'
if addition_import not in t:
    if t.count(import_line) != 1:
        raise RuntimeError("recovery test import anchor drifted")
    t = t.replace(import_line, import_line + addition_import, 1)

marker = 'test("LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence", async () => {'
if marker not in t:
    t += r'''

test("LOG-05 receipt reconstruction failure is explicitly observable after verified physical evidence", async () => {
  const canonical = new CanonicalStore(priorState());
  const source = mergeIntent(false).intent;
  const remote = source.effects.find(effect => effect.descriptor.kind === "remote-file");
  assert.ok(remote);
  if (!remote) return;
  const unreconstructable = {
    ...source,
    effects: [
      { ...remote, effectId: "effect:merge:remote:a", verificationEvidenceRef: "proof:remote:a" },
      { ...remote, effectId: "effect:merge:remote:b", verificationEvidenceRef: "proof:remote:b" },
    ],
  } as RecoverableOperationIntentV1_1;
  const authority = new AuthorityStore([unreconstructable]);
  const f = fixture(canonical, () => [entry(target, candidate)]);
  const logger = await log05RecoveryLogger();
  const result = await recoverOutstandingDurableIntents(f.executor, authority, canonical as never, context, managedRemote, {}, logger);
  assert.equal(result.status, "recovery-required");
  if (result.status !== "recovery-required") return;
  assert.equal(result.reason, "persisted descriptors cannot reconstruct one verified recovery receipt");
  assert.equal(f.raw(), 0);
  const reconstruction = logger.snapshot().find(event => event.event === "recovery-receipt-reconstruction");
  assert.equal(reconstruction?.fields?.reconstruction, "failed");
  assert.equal(reconstruction?.fields?.reason, "persisted descriptors cannot reconstruct one verified recovery receipt");
});

test("LOG-05 trace reconstructs remote learning advancing semantic authority before stale durable intent evaluation", async () => {
  const logger = await log05RecoveryLogger();
  const learningStore = new PersistentSynchronizationStateStore(new MemoryStateByteStorage(), 1, undefined, logger);
  const initial = createInitialAuthorityState({
    persistenceRevision: rev("authority:learning:1") as PersistenceRevision,
    semanticGeneration: gen,
    vaultIdentity: vault as never,
    deviceIdentity: device as never,
  });
  assert.equal((await learningStore.saveTrusted(initial)).status, "saved");
  logger.clear();
  const batch = {
    checkpoint: {
      batchId: id<"RemoteIngestionBatchId">("batch:before-recovery"),
      startingToken: id<"ChangeCursor">("cursor:before"),
      terminalStartToken: id<"ChangeCursor">("cursor:after"),
      persistenceRevision: initial.persistenceRevision,
      status: "learned" as const,
    },
    changes: [{ kind: "removed" as const, remoteObjectId: predecessor, lastKnownPath: target }],
  };
  const learned = await learningStore.appendLearnedRemoteBatch(batch, initial.persistenceRevision, initial.semanticGeneration);
  assert.equal(learned.status, "saved");
  if (learned.status !== "saved") return;
  assert.notEqual(learned.semanticGeneration, initial.semanticGeneration);

  const staleIntent = createIntent("dispatch-authorized", v1, reserved, initial.semanticGeneration);
  const recoveryAuthority = new AuthorityStore([staleIntent], learned.semanticGeneration);
  const canonical = new CanonicalStore();
  const f = fixture(canonical, () => [entry()]);
  const recovery = await recoverOutstandingDurableIntents(f.executor, recoveryAuthority, canonical as never, context, managedRemote, {}, logger);
  assert.equal(recovery.status, "recovery-required");
  if (recovery.status !== "recovery-required") return;
  assert.equal(recovery.reason, "persisted durable intent belongs to stale semantic generation");
  assert.equal(f.raw(), 0);

  const events = logger.snapshot();
  const learnedIndex = events.findIndex(event => event.event === "remote-batch-learn-result");
  const recoveryIndex = events.findIndex(event => event.event === "remote-update-preverification-validation-failed");
  assert.ok(learnedIndex >= 0 && recoveryIndex > learnedIndex);
  assert.equal(events[learnedIndex]?.fields?.semanticGeneration, String(learned.semanticGeneration));
  assert.equal(events[recoveryIndex]?.fields?.semanticGeneration, String(initial.semanticGeneration));
  assert.equal(events[recoveryIndex]?.fields?.reason, "persisted durable intent belongs to stale semantic generation");
});
'''

p.write_text(t, encoding="utf-8")
print("LOG-05 focused test closure applied")
