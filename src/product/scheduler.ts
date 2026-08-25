import type { LocalVaultPort } from "../contracts";
import type { IntegratedProductController } from "./product-controller";

export interface AutomaticSyncSettings {
  readonly startupResumeEnabled: boolean;
  readonly localChangeEnabled: boolean;
  readonly periodicEnabled: boolean;
  readonly periodicIntervalMs: number;
  readonly localDebounceMs: number;
}

/** Obsidian lifecycle/change scheduling only; synchronization semantics remain in the product controller. */
export class ProductSyncScheduler {
  private changeTimer?: ReturnType<typeof globalThis.setTimeout>;
  private periodicTimer?: ReturnType<typeof globalThis.setInterval>;
  private readonly unsubscribers: Array<() => void> = [];
  private started = false;
  private startupOpportunityIssued = false;
  private lifecycleRun?: Promise<void>;
  private lifecycleRunPending = false;

  constructor(
    private readonly local: LocalVaultPort,
    private readonly controller: IntegratedProductController,
    private readonly settings: () => AutomaticSyncSettings,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.startupOpportunityIssued = false;
    this.lifecycleRunPending = false;
    this.unsubscribers.push(this.local.onLifecycle(event => {
      if (event.kind === "vault-ready") this.issueInitialStartupOpportunity();
      if (event.kind === "resume") this.requestLifecycleAutomaticRun();
      if (event.kind === "suspend" || event.kind === "unload") void this.controller.request({ kind: "cancel-active-sync" });
    }));
    this.unsubscribers.push(this.local.onChange(() => {
      if (!this.settings().localChangeEnabled) return;
      this.controller.noteChangeDuringRun();
      if (this.changeTimer !== undefined) globalThis.clearTimeout(this.changeTimer);
      this.changeTimer = globalThis.setTimeout(() => { this.changeTimer = undefined; void this.controller.runAutomatic("local-change"); }, this.settings().localDebounceMs);
    }));
    this.installPeriodic();
  }

  refresh(): void { this.clearPeriodic(); this.installPeriodic(); }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.startupOpportunityIssued = false;
    this.lifecycleRunPending = false;
    if (this.changeTimer !== undefined) globalThis.clearTimeout(this.changeTimer);
    this.changeTimer = undefined;
    this.clearPeriodic();
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
  }

  private issueInitialStartupOpportunity(): void {
    if (this.startupOpportunityIssued || !this.settings().startupResumeEnabled) return;
    this.startupOpportunityIssued = true;
    this.requestLifecycleAutomaticRun();
  }

  private requestLifecycleAutomaticRun(): void {
    if (!this.started || !this.settings().startupResumeEnabled) return;
    if (this.lifecycleRun) {
      this.lifecycleRunPending = true;
      return;
    }
    this.lifecycleRun = this.controller.runAutomatic("startup-resume").finally(() => {
      this.lifecycleRun = undefined;
      if (!this.started || !this.lifecycleRunPending) {
        this.lifecycleRunPending = false;
        return;
      }
      this.lifecycleRunPending = false;
      this.requestLifecycleAutomaticRun();
    });
  }

  private installPeriodic(): void {
    const settings = this.settings();
    if (!this.started || !settings.periodicEnabled) return;
    const interval = Math.max(60_000, settings.periodicIntervalMs);
    this.periodicTimer = globalThis.setInterval(() => void this.controller.runAutomatic("periodic"), interval);
  }

  private clearPeriodic(): void {
    if (this.periodicTimer !== undefined) globalThis.clearInterval(this.periodicTimer);
    this.periodicTimer = undefined;
  }
}
