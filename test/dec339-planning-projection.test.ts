import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type VaultPath } from "../src/contracts";
import { VerifiedInventoryPlanningProjection } from "../src/product/verified-inventory-planning-projection";
import { VerifiedInventoryBaselineCoordinator } from "../src/state/verified-inventory-integration";
import { FakeDatabase, candidate, c, cursor1, fence, g, id, integratedFile, seeded, simulatedBaseline, withRangeOnly } from "./support/dec339-inventory-idb-fixtures";

const path = (s: string) => contractId<"VaultPath">(s) as VaultPath;

test("D339-09A complete, cursor-fenced inventory produces a planning-only remote view", async () => {
  withRangeOnly();
  const factory = new FakeDatabase().openFactory();
  const storage = await seeded(factory);
  const next = candidate(g("projection-complete"));
  next.rows.push(integratedFile(next.manifest.generation, "notes.md"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(next), storage)
    .publishBaseline(fence, next.manifest.generation)).status, "published");
  const projection = await new VerifiedInventoryPlanningProjection(storage).read(fence, cursor1);
  assert.equal(projection.status, "verified-observation");
  if (projection.status === "verified-observation") {
    assert.equal(projection.purpose, "planning-only");
    assert.equal(projection.observedThroughCursor, cursor1);
    assert.equal(projection.listing.completeness.status, "complete");
    assert.equal(projection.listing.entries.length, 1);
    assert.equal(projection.listing.entries[0]!.path, path("notes.md"));
    assert.equal(projection.listing.entries[0]!.remoteObjectId, id("remote:delta-file"));
  }
});

test("D339-09A mismatched canonical cursor and scope identity do not yield a listing", async () => {
  withRangeOnly();
  const storage = await seeded(new FakeDatabase().openFactory());
  const next = candidate(g("projection-stale"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(next), storage)
    .publishBaseline(fence, next.manifest.generation)).status, "published");
  const source = new VerifiedInventoryPlanningProjection(storage);
  assert.equal((await source.read(fence, c("changes:later"))).status, "stale");
  assert.notEqual((await source.read({ ...fence, scopePolicyFingerprint: "different-policy" }, cursor1))
    .status, "verified-observation");
});

test("D339-09A truncated complete sibling scope is rejected, never treated as absence", async () => {
  withRangeOnly();
  const storage = await seeded(new FakeDatabase().openFactory());
  const next = candidate(g("projection-truncated"));
  for (let i = 0; i < 257; i++) {
    const filename = "file-" + i + ".md";
    const base = integratedFile(next.manifest.generation, filename);
    next.rows.push({ ...base, entity: {
      ...base.entity, remoteObjectId: id("remote:" + i), logicalPath: path(filename),
    } });
  }
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(next), storage)
    .publishBaseline(fence, next.manifest.generation)).status, "published");
  const read = await new VerifiedInventoryPlanningProjection(storage).read(fence, cursor1);
  assert.equal(read.status, "partial");
});

test("D339-09B same-path independent stable IDs force conservative fallback", async () => {
  withRangeOnly();
  const storage = await seeded(new FakeDatabase().openFactory());
  const next = candidate(g("projection-collision"));
  const shared = integratedFile(next.manifest.generation, "colliding.md");
  next.rows.push(shared, { ...shared, entity: { ...shared.entity,
    remoteObjectId: id("remote:collision-2") } });
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(next), storage)
    .publishBaseline(fence, next.manifest.generation)).status, "published");
  const projected = await new VerifiedInventoryPlanningProjection(storage).read(fence, cursor1);
  assert.equal(projected.status, "ambiguous");
});

test("D339-09A changed authority during projection fails closed", async () => {
  withRangeOnly();
  const storage = await seeded(new FakeDatabase().openFactory());
  const next = candidate(g("projection-race"));
  assert.equal((await new VerifiedInventoryBaselineCoordinator(simulatedBaseline(next), storage)
    .publishBaseline(fence, next.manifest.generation)).status, "published");
  let snapshots = 0;
  const source = new VerifiedInventoryPlanningProjection({
    openRead: () => storage.openRead(),
    publicationSnapshot: async f => {
      snapshots++;
      return snapshots === 2 ? { status: "stale", reason: "simulated-authority-race" } :
        storage.publicationSnapshot(f);
    },
  });
  assert.equal((await source.read(fence, cursor1)).status, "stale");
  assert.equal(snapshots, 2);
});
