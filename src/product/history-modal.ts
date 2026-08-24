import { App, Modal } from "obsidian";
import type { AuditRecord, ProductSurfaceState } from "../contracts";

export class AuditHistoryModal extends Modal {
  constructor(app: App, private readonly load: () => Promise<readonly AuditRecord[]>) { super(app); }
  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "BRAIN synchronization history" });
    const records = await this.load();
    if (!records.length) { this.contentEl.createEl("p", { text: "No synchronization activity has been recorded on this device." }); return; }
    const list = this.contentEl.createEl("ul");
    for (const record of [...records].reverse()) {
      const when = record.advisoryAtMs ? new Date(record.advisoryAtMs).toLocaleString() : "time unavailable";
      list.createEl("li", { text: `${when} — ${record.event}${record.path ? ` — ${String(record.path)}` : ""}${record.reasonCode ? ` — ${record.reasonCode}` : ""}` });
    }
  }
  onClose(): void { this.contentEl.empty(); }
}

export class SyncAttentionModal extends Modal {
  constructor(app: App, private readonly surface: ProductSurfaceState) { super(app); }
  onOpen(): void {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "BRAIN synchronization attention" });
    this.contentEl.createEl("p", { text: `Current status: ${this.surface.status.kind}` });
    if (this.surface.planPreview) {
      const items = this.contentEl.createEl("ul");
      for (const operation of this.surface.planPreview.operations.filter(operation => ["unresolved-conflict", "blocked-unsafe", "recovery-required"].includes(operation.kind))) {
        items.createEl("li", { text: `${operation.kind} — ${String(operation.path)} — ${operation.reasons.map(reason => reason.summary).join("; ")}` });
      }
    }
    if (this.surface.status.kind === "recovery-required") {
      this.contentEl.createEl("p", { text: "Destructive propagation remains disabled. Use Verify/Reconcile Vault to obtain a fresh reviewable reconstruction plan. Never reset state or recreate a missing remote as a shortcut." });
    } else if (this.surface.status.kind === "conflict-present") {
      this.contentEl.createEl("p", { text: "Conflict evidence is preserved. Authoritative keep-local/keep-remote/keep-both/manual-resolution execution is blocked by the current frozen conflict contract and is not bypassed here." });
    } else if (this.surface.status.kind === "destructive-plan-blocked") {
      this.contentEl.createEl("p", { text: "Review the exact manual plan and recovery checkpoint before approval. If reality changes, the plan must be regenerated." });
    }
  }
  onClose(): void { this.contentEl.empty(); }
}
