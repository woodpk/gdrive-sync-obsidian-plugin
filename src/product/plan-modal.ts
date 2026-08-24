import { App, Modal, Setting } from "obsidian";
import type { CheckpointId, SynchronizationPlan } from "../contracts";
import type { IntegratedProductController } from "./product-controller";

export class PlanPreviewModal extends Modal {
  constructor(
    app: App,
    private readonly plan: SynchronizationPlan,
    private readonly controller: IntegratedProductController,
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
        const result = this.plan.recoveryCheckpointRequired && checkpoint
          ? await this.controller.request({ kind: "approve-destructive-plan", planId: this.plan.planId, recoveryCheckpointId: checkpoint as CheckpointId })
          : await this.controller.request({ kind: "execute-plan", planId: this.plan.planId });
        if (result.status === "accepted") this.close();
        else contentEl.createEl("p", { text: result.reason });
      }));
  }
  onClose(): void { this.contentEl.empty(); }
}
