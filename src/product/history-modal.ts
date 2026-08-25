import { App, Modal } from "obsidian";
import type { AuditRecord, ConflictAssessment, ConflictId } from "../contracts";
import { contractId } from "../contracts";
import type { IntegratedProductController } from "./product-controller";

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

function idFor(assessment: ConflictAssessment): ConflictId | undefined {
  if (assessment.kind === "none") return undefined;
  if (assessment.kind === "clean-merge") return contractId<"ConflictId">(`conflict:clean:${String(assessment.path)}`) as ConflictId;
  return assessment.conflictId;
}

export interface AttentionModalOptions {
  readonly recoveryBackupId?: string;
  readonly copyDiagnostics?: () => Promise<void>;
}

export class SyncAttentionModal extends Modal {
  constructor(app: App, private readonly controller: IntegratedProductController, private readonly options: AttentionModalOptions = {}) { super(app); }
  onOpen(): void { this.render(); }

  private render(): void {
    this.contentEl.empty();
    const surface = this.controller.currentSurface();
    this.contentEl.createEl("h2", { text: "BRAIN synchronization attention" });
    this.contentEl.createEl("p", { text: `Current status: ${surface.status.kind}` });

    if (surface.conflicts.length) {
      for (const conflict of surface.conflicts) {
        if (conflict.kind === "none" || conflict.kind === "clean-merge") continue;
        const id = idFor(conflict);
        if (!id) continue;
        const card = this.contentEl.createDiv();
        card.createEl("h3", { text: `${conflict.kind} — ${String(conflict.path)}` });
        card.createEl("p", { text: "The preserved versions remain unchanged until you choose a resolution. Every choice is revalidated against the exact planned versions immediately before mutation." });
        for (const [label, kind] of [["Keep local", "keep-local"], ["Keep remote", "keep-remote"], ["Keep both", "keep-both"]] as const) {
          const button = card.createEl("button", { text: label });
          button.addEventListener("click", () => void this.resolve(id, kind));
        }
        card.createEl("p", { text: "Manual resolution: edit the original local file in Obsidian until it contains the exact content you want to make authoritative, then use the action below. The controller—not this UI—captures and revalidates the current stable local version." });
        const manual = card.createEl("button", { text: "Use current local file as manual resolution" });
        manual.addEventListener("click", () => void this.resolveManual(id));
      }
    }

    if (surface.planPreview) {
      const items = this.contentEl.createEl("ul");
      for (const operation of surface.planPreview.operations.filter(operation => ["unresolved-conflict", "blocked-unsafe", "recovery-required"].includes(operation.kind))) {
        items.createEl("li", { text: `${operation.kind} — ${String(operation.path)} — ${operation.reasons.map(reason => reason.summary).join("; ")}` });
      }
    }
    if (surface.status.kind === "recovery-required") {
      this.contentEl.createEl("p", { text: "Destructive propagation and automatic synchronization remain disabled. Verify/Reconcile Vault produces a reviewable non-destructive safe-union reconstruction from current LOCAL + managed REMOTE reality; corrupt/missing prior state is never treated as an empty authoritative BASE." });
      if (this.options.recoveryBackupId) this.contentEl.createEl("p", { text: `Device-local recovery backup: ${this.options.recoveryBackupId}` });
      if (this.options.copyDiagnostics) {
        const diagnostics = this.contentEl.createEl("button", { text: "Copy recovery diagnostics" });
        diagnostics.addEventListener("click", () => void this.options.copyDiagnostics?.());
      }
    } else if (surface.status.kind === "destructive-plan-blocked") {
      this.contentEl.createEl("p", { text: "Review the exact manual plan and recovery checkpoint before approval. If reality changes, the semantic plan identity changes and the old approval cannot execute it." });
    }
  }

  private async resolve(id: ConflictId, kind: "keep-local" | "keep-remote" | "keep-both"): Promise<void> {
    const result = await this.controller.request({ kind: "resolve-conflict", conflictId: id, resolution: { kind } });
    if (result.status === "rejected") this.contentEl.createEl("p", { text: `Resolution was not applied: ${result.reason}` });
    else this.render();
  }

  private async resolveManual(id: ConflictId): Promise<void> {
    const result = await this.controller.resolveWithCurrentLocal(id);
    if (result.status === "rejected") this.contentEl.createEl("p", { text: `Manual resolution was not applied: ${result.reason}` });
    else this.render();
  }

  onClose(): void { this.contentEl.empty(); }
}
