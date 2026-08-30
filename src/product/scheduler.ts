import type { LocalIntegrityReconciliationPort, LocalVaultPort } from "../contracts";
import {
  consumeDeferredReconciliationAcrossLifecycle,
  enterSynchronizationLifecycle,
  noteDeferredReconciliationAcrossLifecycle,
  synchronizationLifecycleState,
} from "../core/run-coordinator";
import type { IntegratedProductController } from "./product-controller";

export interface AutomaticSyncSettings {
  readonly startupResumeEnabled: boolean;
  readonly localChangeEnabled: boolean;
  readonly periodicEnabled: boolean;
  readonly periodicIntervalMs: number;
  readonly localDebounceMs: number;
}

type AutomaticTrigger = "startup-resume" | "local-change" | "periodic";
const TRIGGER_PRIORITY: Readonly<Record<AutomaticTrigger, number>> = { periodic: 1, "startup-resume": 2, "local-change": 3 };

function higherPriority(current: AutomaticTrigger | undefined, candidate: AutomaticTrigger): AutomaticTrigger {
  return !current || TRIGGER_PRIORITY[candidate] > TRIGGER_PRIORITY[current] ? candidate : current;
}

/**
 * Obsidian lifecycle/change scheduling. The scheduler owns trigger coalescing and
 * lifecycle opportunities; synchronization semantics remain in the controller.
 * Timers intentionally exist only while the app lifecycle is active, so iOS is
 * never represented as having background execution guarantees.
 */
export class ProductSyncScheduler {
  private changeTimer?: ReturnType<typeof globalThis.setTimeout>;
  private delayedDrainTimer?: ReturnType<typeof globalThis.setTimeout>;
  private periodicTimer?: ReturnType<typeof globalThis.setInterval>;
  private readonly unsubscribers: Array<() => void> = [];
  private started = false;
  private startupOpportunityIssued = false;
  private pendingTrigger?: AutomaticTrigger;
  private deferredInactiveTrigger?: AutomaticTrigger;
  private drain?: Promise<void>;
  private integrityRunning = false;
  private integrityPending = false;

  constructor(
    private readonly local: LocalVaultPort,
    private readonly controller: IntegratedProductController,
    private readonly settings: () => AutomaticSyncSettings,
    private readonly integrity?: LocalIntegrityReconciliationPort,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.startupOpportunityIssued = false;
    enterSynchronizationLifecycle("active");
    this.unsubscribers.push(this.local.onLifecycle(event => {
      if (event.kind === "vault-ready") this.issueInitialStartupOpportunity();
      if (event.kind === "resume") this.handleResume();
      if (event.kind === "suspend") this.beginStopping("suspend");
      if (event.kind === "unload") this.beginStopping("unload");
    }));
    this.unsubscribers.push(this.local.onChange(() => this.handleLocalChange()));
    this.installPeriodic();
  }

  refresh(): void {
    this.clearPeriodic();
    if (this.started && synchronizationLifecycleState() === "active") this.installPeriodic();
  }

  /** Enter the unload gate synchronously before any awaited cleanup begins. */
  beginUnload(): void { this.beginStopping("unload"); }

  stop(): void {
    if (!this.started) return;
    this.beginStopping("unload");
    this.started = false;
    this.startupOpportunityIssued = false;
    this.pendingTrigger = undefined;
    this.deferredInactiveTrigger = undefined;
    this.clearChangeTimer();
    this.clearDelayedDrain();
    this.clearPeriodic();
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
  }

  private handleLocalChange(): void {
    if (!this.settings().localChangeEnabled) return;
    if (!this.started || synchronizationLifecycleState() !== "active") {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "local-change");
      noteDeferredReconciliationAcrossLifecycle();
      return;
    }
    this.clearChangeTimer();
    this.changeTimer = globalThis.setTimeout(() => {
      this.changeTimer = undefined;
      this.queueAutomatic("local-change");
    }, Math.max(0, this.settings().localDebounceMs));
  }

  private issueInitialStartupOpportunity(): void {
    if (this.startupOpportunityIssued || !this.settings().startupResumeEnabled) return;
    this.startupOpportunityIssued = true;
    this.queueAutomatic("startup-resume");
  }

  private handleResume(): void {
    if (!this.started) return;
    enterSynchronizationLifecycle("active");
    this.installPeriodic();

    const deferred = consumeDeferredReconciliationAcrossLifecycle();
    if (deferred) {
      if (this.settings().localChangeEnabled) this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "local-change");
      else if (this.settings().periodicEnabled) this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "periodic");
    }

    const replay = this.deferredInactiveTrigger;
    this.deferredInactiveTrigger = undefined;
    if (replay) this.queueAutomatic(replay);
    if (this.settings().startupResumeEnabled) this.queueAutomatic("startup-resume");
  }

  private beginStopping(kind: "suspend" | "unload"): void {
    if (!this.started && kind === "suspend") return;
    const target = kind === "unload" ? "unloading" : "suspending";
    enterSynchronizationLifecycle(target);

    if (this.changeTimer !== undefined && this.settings().localChangeEnabled) {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "local-change");
      noteDeferredReconciliationAcrossLifecycle();
    }
    if (this.pendingTrigger) {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, this.pendingTrigger);
      this.pendingTrigger = undefined;
      noteDeferredReconciliationAcrossLifecycle();
    }
    this.clearChangeTimer();
    this.clearDelayedDrain();
    this.clearPeriodic();

    // Correctness does not depend on this promise resolving. The synchronous
    // lifecycle gate above prevents new operation authority even if iOS kills JS.
    void this.controller.request({ kind: "cancel-active-sync" }).finally(() => {
      if (kind === "suspend" && synchronizationLifecycleState() === "suspending") enterSynchronizationLifecycle("suspended");
    });
  }

  private queueAutomatic(trigger: AutomaticTrigger): void {
    if (!this.started) return;
    if (synchronizationLifecycleState() !== "active") {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, trigger);
      noteDeferredReconciliationAcrossLifecycle();
      return;
    }
    this.pendingTrigger = higherPriority(this.pendingTrigger, trigger);
    this.ensureDrain();
  }

  private ensureDrain(): void {
    if (this.drain || this.delayedDrainTimer !== undefined || !this.pendingTrigger) return;
    const activeDrain = Promise.resolve().then(() => this.drainAutomaticTriggers());
    this.drain = activeDrain;
    void activeDrain.finally(() => {
      if (this.drain === activeDrain) this.drain = undefined;
      if (!this.pendingTrigger || !this.started || synchronizationLifecycleState() !== "active") return;
      // Bound immediate follow-ups. Further trigger pressure waits at least the
      // configured local debounce interval instead of creating a zero-delay loop.
      this.scheduleDelayedDrain();
    }).catch(() => undefined);
  }

  private async drainAutomaticTriggers(): Promise<void> {
    let runs = 0;
    while (runs < 2 && this.pendingTrigger && this.started && synchronizationLifecycleState() === "active") {
      const trigger = this.pendingTrigger;
      this.pendingTrigger = undefined;
      runs += 1;
      try {
        await this.controller.runAutomatic(trigger);
      } catch {
        // The controller owns surfaced error/diagnostic state. A failed automatic
        // pass must not create an unbounded scheduler retry loop.
      }
    }
  }

  private scheduleDelayedDrain(): void {
    if (this.delayedDrainTimer !== undefined || !this.started || synchronizationLifecycleState() !== "active") return;
    const delay = Math.max(250, this.settings().localDebounceMs);
    this.delayedDrainTimer = globalThis.setTimeout(() => {
      this.delayedDrainTimer = undefined;
      this.ensureDrain();
    }, delay);
  }

  private installPeriodic(): void {
    const settings = this.settings();
    if (!this.started || synchronizationLifecycleState() !== "active" || !settings.periodicEnabled || this.periodicTimer !== undefined) return;
    const interval = Math.max(60_000, settings.periodicIntervalMs);
    this.periodicTimer = globalThis.setInterval(() => this.requestPeriodicOpportunity(), interval);
  }

  private requestPeriodicOpportunity(): void {
    if (!this.started || synchronizationLifecycleState() !== "active") return;
    if (this.integrityRunning) {
      this.integrityPending = true;
      return;
    }
    this.integrityRunning = true;
    void this.performIntegrityOpportunity().finally(() => {
      this.integrityRunning = false;
      if (this.integrityPending) {
        this.integrityPending = false;
        this.requestPeriodicOpportunity();
      }
    });
  }

  private async performIntegrityOpportunity(): Promise<void> {
    let mismatchObserved = false;
    if (this.integrity && this.started && synchronizationLifecycleState() === "active") {
      try {
        const listing = await this.local.enumerate();
        for (const entry of listing.entries) {
          if (!this.started || synchronizationLifecycleState() !== "active") return;
          if (entry.status !== "present" || entry.entityKind !== "file") continue;
          try {
            const actual = await this.integrity.readFileBypassingEvidenceCache(entry.path);
            const cachedHash = entry.content?.hash;
            const actualHash = actual.evidence.hash;
            if (!cachedHash || !actualHash || cachedHash !== actualHash) mismatchObserved = true;
          } catch {
            // A cache-bypass read failure is uncertainty, never absence. The
            // following reconciliation opportunity is still allowed to surface it.
            mismatchObserved = true;
          }
        }
      } catch {
        mismatchObserved = true;
      }
    }
    if (!this.started || synchronizationLifecycleState() !== "active") return;
    this.queueAutomatic(mismatchObserved && this.settings().localChangeEnabled ? "local-change" : "periodic");
  }

  private clearChangeTimer(): void {
    if (this.changeTimer !== undefined) globalThis.clearTimeout(this.changeTimer);
    this.changeTimer = undefined;
  }

  private clearDelayedDrain(): void {
    if (this.delayedDrainTimer !== undefined) globalThis.clearTimeout(this.delayedDrainTimer);
    this.delayedDrainTimer = undefined;
  }

  private clearPeriodic(): void {
    if (this.periodicTimer !== undefined) globalThis.clearInterval(this.periodicTimer);
    this.periodicTimer = undefined;
  }
}
