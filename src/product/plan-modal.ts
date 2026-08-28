import { App, Modal, Setting } from "obsidian";
import type { CheckpointId, SynchronizationPlan } from "../contracts";
import type { IntegratedProductController } from "./product-controller";

export class PlanPreviewModal extends Modal {
  private executionPending = false;
  private executionAccepted = false;
  constructor(
    app: App,
    private readonly plan: SynchronizationPlan,
    private readonly controller: IntegratedProductController,
    private readonly diagnosticRunId?: number,
  ) { super(app); }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "BRAIN synchronization preview" });
    contentEl.createEl("p", { text: `${this.plan.operations.length} planned operation(s). Disposition: ${this.plan.executionDisposition}.` });
    const counts = new Map<string, number>();
    for (const operation of this.plan.operations) counts.set(operation.kind, (counts.get(operation.kind) ?? 0) + 1);
    const summary = contentEl.createEl("ul");
    for (const [kind, count] of [...counts.entries()].sort()) summary.createEl("li", { text: `${kind}: ${count}` });
    const details = contentEl.createEl("details");
    details.createEl("summary", { text: "Affected paths and reasons" });
    const list = details.createEl("ul");
    for (const operation of this.plan.operations) {
      list.createEl("li", { text: `${operation.kind} — ${String(operation.path)} — ${operation.reasons.map(reason => reason.summary).join("; ")}` });
    }
    if (this.plan.executionDisposition === "blocked") {
      contentEl.createEl("p", { text: "This plan is blocked and cannot execute." });
      return;
    }
    const checkpoint = this.controller.pendingDestructiveCheckpoint();
    new Setting(contentEl).addButton(button => button
      .setButtonText(this.plan.recoveryCheckpointRequired ? "Approve checkpoint and execute" : "Execute")
      .setCta()
      .onClick(async () => {
        this.controller.recordExecuteClick(this.plan.planId, this.diagnosticRunId);
        this.executionPending = true;
        const result = this.plan.recoveryCheckpointRequired && checkpoint
          ? await this.controller.requestPreviewAction({ kind: "approve-destructive-plan", planId: this.plan.planId, recoveryCheckpointId: checkpoint as CheckpointId }, this.diagnosticRunId)
          : await this.controller.requestPreviewAction({ kind: "execute-plan", planId: this.plan.planId }, this.diagnosticRunId);
        this.executionPending = false;
        if (result.status === "accepted") { this.executionAccepted = true; this.close(); }
        else contentEl.createEl("p", { text: result.reason });
      }));
  }
  onClose(): void {
    if (!this.executionPending && !this.executionAccepted) this.controller.recordPreviewDismissed(this.plan.planId, this.diagnosticRunId);
    this.contentEl.empty();
  }
}
