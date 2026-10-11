import assert from "node:assert/strict";
import test from "node:test";
import type { InventoryOverlayRecord } from "../src/contracts";
import { IndexedDbInventoryObservationStore } from "../src/state/indexeddb-inventory-storage";
import { VerifiedInventoryBaselineCoordinator } from "../src/state/verified-inventory-integration";
import {
  FakeDatabase, c, candidate, fence, g, id, integratedFile, rows, seeded,
  simulatedBaseline, withRangeOnly,
} from "./support/dec339-inventory-idb-fixtures";

test("D339-08A collection preserves active ancestry and a reader pinned by another store instance", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), factory = fake.openFactory();
  const store = await seeded(factory);
  const first = candidate(g("gc-pinned-first"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(first), store)
    .publishBaseline(fence, first.manifest.generation)).status, "published");
  const another = new IndexedDbInventoryObservationStore("device:idb:test", factory);
  const old = await another.openRead();
  assert.equal(old.status, "verified-observation");

  const second = candidate(g("gc-current-second"), c("changes:2"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(second), store)
    .publishBaseline(fence, second.manifest.generation)).status, "published");
  assert.equal((await store.collectGarbage(false)).status, "stale");
  const protectedResult = await store.collectGarbage(true);
  assert.equal(protectedResult.status, "collected");
  assert.equal(fake.tables.get("inventory-generations")?.records.has(JSON.stringify(first.manifest.generation)), true);
  if (old.status === "verified-observation") {
    assert.equal((await old.value.getById(fence.contentDomainRootId)).status, "verified-observation");
    await old.value.release();
  }
  const cleaned = await store.collectGarbage(true);
  assert.equal(cleaned.status, "collected");
  assert.equal(fake.tables.get("inventory-generations")?.records.has(JSON.stringify(first.manifest.generation)), false);
  assert.equal(fake.tables.get("inventory-generations")?.records.has(JSON.stringify(second.manifest.generation)), true);
  const active = await store.openRead();
  assert.equal(active.status, "verified-observation");
  if (active.status === "verified-observation") await active.value.release();
});

test("D339-08A abandoned stage cleanup is bounded and resumes after interrupted batches", async () => {
  withRangeOnly();
  const fake = new FakeDatabase(), factory = fake.openFactory();
  const store = await seeded(factory);
  const base = candidate(g("gc-live-base"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(base), store)
    .publishBaseline(fence, base.manifest.generation)).status, "published");

  const abandoned = candidate(g("gc-abandoned"));
  const extra: InventoryOverlayRecord[] = Array.from({ length: 128 }, (_, index) => {
    const generated = integratedFile(abandoned.manifest.generation, `abandoned-${index}.md`);
    return { ...generated, entity: { ...generated.entity,
      remoteObjectId: id(`abandoned:${index}`) } };
  });
  // Stage deliberately fails its count seal after writing a partial shadow;
  // the canonical cursor and active pointer remain on the previous baseline.
  const failed = await store.stage({
    candidate: { ...abandoned.manifest, recordCount: 131 },
    overlays: rows([...abandoned.rows, ...extra]),
    coverage: rows(abandoned.coverage),
  });
  assert.equal(failed.status, "invalid");
  assert.equal(fake.tables.get("inventory-generations")?.records.has(JSON.stringify(abandoned.manifest.generation)), true);
  const firstSweep = await store.collectGarbage(true, 1);
  assert.equal(firstSweep.status, "collected");
  if (firstSweep.status === "collected") assert.equal(firstSweep.removedRows, 128);
  assert.equal(fake.tables.get("inventory-generations")?.records.has(JSON.stringify(abandoned.manifest.generation)), true);
  const secondSweep = await store.collectGarbage(true, 1);
  assert.equal(secondSweep.status, "collected");
  if (secondSweep.status === "collected") assert.equal(secondSweep.removedGenerations, 1);
  assert.equal(fake.tables.get("inventory-generations")?.records.has(JSON.stringify(abandoned.manifest.generation)), false);
  const active = await store.openRead();
  assert.equal(active.status, "verified-observation");
  if (active.status === "verified-observation") {
    assert.equal(active.value.generation, base.manifest.generation);
    await active.value.release();
  }
});
