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
  private localChangeEpoch = 0;
  private invalidationPending = false;
  private invalidationFailed = false;
  // A new coordinator cannot attest that previously persisted hints are fresh.
  // Only its own completed, authority-fenced enumeration may expose them.
  private advisoryReady = false;
  private invalidationJobs = new Set<Promise<void>>();
  constructor(
    private readonly local: Pick<LocalVaultPort, "enumerate" | "onChange" | "onLifecycle">,
    private readonly inventory: Pick<IndexedDbInventoryObservationStore,
      "publicationSnapshot" | "replaceLocalSnapshot" | "invalidateLocalSnapshot" | "readLocalHint">,
    private readonly included: (path: VaultPath) => boolean,
  ) {}

  async refresh(fence: InventoryIdentityFence): Promise<LocalInventoryRefreshResult> {
    // Keep failed invalidations latched until an entirely new full scan has
    // safely replaced the durable local snapshot; retries alone do not heal.
    this.advisoryReady = false;
    if (this.invalidationPending || this.invalidationJobs.size)
      return { status: "stale", reason: "local-hint-invalidation-pending" };
    const before = await this.inventory.publicationSnapshot(fence);
    if (before.status !== "trusted-fence") return { status: before.status, reason: before.reason };
    if (this.invalidationPending || this.invalidationJobs.size)
      return { status: "stale", reason: "local-hint-invalidation-raced-initial-authority-read" };
    const generation = before.value.activeGeneration;
    const observedEpoch = this.localChangeEpoch;
    if (!generation) return { status: "unknown", reason: "no-established-remote-inventory-generation" };
    try {
      const enumeration = await this.local.enumerate();
      if (enumeration.completeness.status !== "complete" || enumeration.uncertainties?.length) {
        await this.trackInvalidation("incomplete-local-enumeration");
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
          this.localChangeEpoch !== observedEpoch ||
          this.invalidationPending || this.invalidationJobs.size ||
          after.value.activeGeneration !== generation ||
          after.value.canonicalCursor !== before.value.canonicalCursor ||
          after.value.persistenceRevision !== before.value.persistenceRevision ||
          after.value.semanticGeneration !== before.value.semanticGeneration) {
        await this.trackInvalidation("authority-changed-during-local-scan");
        return { status: "stale", reason: "inventory-or-authority-changed-during-local-scan" };
      }
      const saved = await this.inventory.replaceLocalSnapshot(fence, generation, observed, true);
      if (saved.status !== "verified-observation") return { status: saved.status, reason: saved.reason };
      if (this.localChangeEpoch !== observedEpoch || this.invalidationPending || this.invalidationJobs.size) {
        await this.trackInvalidation("local-change-during-snapshot-publication");
        return { status: "stale", reason: "local-observations-changed-during-snapshot-publication" };
      }
      // The complete current-scope enumeration and replacement are durable,
      // and no event or invalidation raced publication: re-enable only now.
      this.invalidationFailed = false;
      this.advisoryReady = true;
      return { status: "recorded", generation, count: saved.value };
    } catch {
      await this.trackInvalidation("local-enumeration-or-persistence-failed").catch(() => undefined);
      return { status: "recovery-required", reason: "local-inventory-refresh-failed" };
    }
  }

  /**
   * The owner must call this when the effective path-scope/exclusion policy
   * changes. A cache published for an old scope must not be reused as a hint
   * for newly included or excluded paths. Canonical BASE remains untouched.
   */
  private trackInvalidation(reason: string): Promise<void> {
    this.localChangeEpoch++;
    this.advisoryReady = false;
    this.invalidationPending = true;
    let job: Promise<void>;
    try {
      job = this.inventory.invalidateLocalSnapshot(reason);
    } catch (cause) {
      this.invalidationFailed = true;
      this.invalidationPending = this.invalidationJobs.size > 0;
      return Promise.reject(cause);
    }
    const tracked = job.catch((cause: unknown) => {
      // Do not assume that a rejected IndexedDB transaction revoked the
      // durable LOCAL_POINTER. Other successful jobs cannot clear this fault.
      this.invalidationFailed = true;
      throw cause;
    }).finally(() => {
      this.invalidationJobs.delete(tracked);
      this.invalidationPending = this.invalidationJobs.size > 0;
    });
    this.invalidationJobs.add(tracked);
    return tracked;
  }

  async invalidateForScopeChange(): Promise<void> {
    await this.trackInvalidation("effective-local-scope-changed");
  }

  /**
   * Consumer boundary for advisory hints: an event invalidates visibility
   * synchronously before the IndexedDB transaction finishes. This result
   * never grants mutation, absence or BASE authority.
   */
  async readAdvisoryHint(fence: InventoryIdentityFence, path: VaultPath):
    ReturnType<IndexedDbInventoryObservationStore["readLocalHint"]> {
    if (this.invalidationFailed)
      return { status: "recovery-required", reason: "local-hint-invalidation-not-durable" };
    if (!this.advisoryReady || this.invalidationPending || this.invalidationJobs.size)
      return { status: "stale", reason: "local-hint-revalidation-required" };
    const epoch = this.localChangeEpoch;
    const hint = await this.inventory.readLocalHint(fence, path);
    if (this.invalidationFailed)
      return { status: "recovery-required", reason: "local-hint-invalidation-raced-read" };
    if (!this.advisoryReady || this.localChangeEpoch !== epoch ||
        this.invalidationPending || this.invalidationJobs.size)
      return { status: "stale", reason: "local-hint-invalidation-raced-read" };
    return hint;
  }

  /** Invalidate hints promptly on file events and on resume, without affecting canonical state. */
  subscribe(): () => void {
    const invalidate = () => {
      void this.trackInvalidation("local-observation-may-be-stale").catch(() => undefined);
    };
    const offChange = this.local.onChange(() => invalidate());
    const offLifecycle = this.local.onLifecycle(event => {
      if (event.kind === "resume" || event.kind === "vault-ready") invalidate();
    });
    return () => { offChange(); offLifecycle(); };
  }
}
