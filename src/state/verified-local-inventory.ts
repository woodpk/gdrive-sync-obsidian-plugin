/**
 * DEC-339 local-side metadata capture. Only the fresh LocalVaultPort snapshot
 * establishes current filesystem state. Persisted local rows are advisory hints,
 * never deletion, stability, BASE, or physical-effect authority.
 */
import type {
  InventoryIdentityFence, InventoryLocalObservation, LocalVaultPort, VaultPath,
  InventoryGeneration,
} from "../contracts";
import type { IndexedDbInventoryObservationStore } from "./indexeddb-inventory-storage";

type Failure = { readonly status: "invalid" | "partial" | "unknown" | "ambiguous" | "stale" | "incompatible" | "recovery-required";
  readonly reason: string };
export type LocalInventoryRefreshResult =
  | { readonly status: "recorded"; readonly generation: InventoryGeneration; readonly count: number }
  | Failure;

/** The caller supplies the same effective in-scope path policy as ordinary snapshot assembly. */
export class VerifiedLocalInventoryCoordinator {
  constructor(
    private readonly local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle">,
    private readonly inventory: Pick<IndexedDbInventoryObservationStore,
      "publicationSnapshot" | "replaceLocalSnapshot" | "invalidateLocalSnapshot">,
    private readonly included: (path: VaultPath) => boolean,
  ) {}

  async refresh(fence: InventoryIdentityFence): Promise<LocalInventoryRefreshResult> {
    const before = await this.inventory.publicationSnapshot(fence);
    if (before.status !== "trusted-fence") return { status: before.status, reason: before.reason };
    const generation = before.value.activeGeneration;
    if (!generation) return { status: "unknown", reason: "no-established-remote-inventory-generation" };
    try {
      const enumeration = await this.local.enumerate();
      if (enumeration.completeness.status !== "complete" || enumeration.uncertainties?.length) {
        await this.inventory.invalidateLocalSnapshot("incomplete-local-enumeration");
        return { status: "partial", reason: "fresh-local-enumeration-incomplete" };
      }
      const observed: InventoryLocalObservation[] = [];
      for (const item of enumeration.entries) {
        if (!this.included(item.path)) continue;
        if (item.status === "present") {
          if (item.stability !== "stable") {
            observed.push({ generation, path: item.path, kind: item.entityKind, presence: "unknown" });
            continue;
          }
          observed.push({
            generation, path: item.path, kind: item.entityKind,
            presence: "present",
            ...(item.observationToken ? { observationToken: item.observationToken } : {}),
            ...(item.remoteObjectId ? { remoteObjectId: item.remoteObjectId } : {}),
          });
        } else if (item.status === "unreadable" || item.status === "inaccessible" ||
                   item.status === "unknown") {
          observed.push({ generation, path: item.path,
            presence: item.status === "unknown" ? "unknown" : "unreadable" });
        }
        // An 'absent' observation, even from a complete scan, is not persisted
        // as authority or converted to a tombstone by the inventory.
      }
      const after = await this.inventory.publicationSnapshot(fence);
      if (after.status !== "trusted-fence" ||
          after.value.activeGeneration !== generation ||
          after.value.canonicalCursor !== before.value.canonicalCursor ||
          after.value.persistenceRevision !== before.value.persistenceRevision ||
          after.value.semanticGeneration !== before.value.semanticGeneration) {
        await this.inventory.invalidateLocalSnapshot("authority-changed-during-local-scan");
        return { status: "stale", reason: "inventory-or-authority-changed-during-local-scan" };
      }
      const saved = await this.inventory.replaceLocalSnapshot(fence, generation, observed, true);
      if (saved.status !== "verified-observation") return { status: saved.status, reason: saved.reason };
      return { status: "recorded", generation, count: saved.value };
    } catch {
      await this.inventory.invalidateLocalSnapshot("local-enumeration-or-persistence-failed").catch(() => undefined);
      return { status: "recovery-required", reason: "local-inventory-refresh-failed" };
    }
  }

  /** Invalidate hints promptly on file events and on resume, without affecting canonical state. */
  subscribe(): () => void {
    const invalidate = () => {
      void this.inventory.invalidateLocalSnapshot("local-observation-may-be-stale")
        .catch(() => undefined);
    };
    const offChange = this.local.onChange(() => invalidate());
    const offLifecycle = this.local.onLifecycle(event => {
      if (event.kind === "resume" || event.kind === "vault-ready") invalidate();
    });
    return () => { offChange(); offLifecycle(); };
  }
}
