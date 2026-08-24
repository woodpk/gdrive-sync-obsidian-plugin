import type { AuditRecord } from "../contracts";

export interface AuditPersistence {
  load(): Promise<readonly AuditRecord[]>;
  save(records: readonly AuditRecord[]): Promise<void>;
}

export class MemoryAuditPersistence implements AuditPersistence {
  private records: readonly AuditRecord[] = [];
  async load(): Promise<readonly AuditRecord[]> { return this.records; }
  async save(records: readonly AuditRecord[]): Promise<void> { this.records = [...records]; }
}

/** Bounded metadata-only audit store. AuditRecord has no content or secret payload field. */
export class BoundedAuditHistory {
  private records: AuditRecord[] = [];
  private loaded = false;

  constructor(private readonly persistence: AuditPersistence, private readonly limit = 500) {
    if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("audit history limit must be positive");
  }

  async append(record: AuditRecord): Promise<void> {
    await this.ensureLoaded();
    this.records.push(record);
    if (this.records.length > this.limit) this.records.splice(0, this.records.length - this.limit);
    await this.persistence.save(this.records);
  }

  async read(): Promise<readonly AuditRecord[]> {
    await this.ensureLoaded();
    return [...this.records];
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.records = [...await this.persistence.load()].slice(-this.limit);
    this.loaded = true;
  }
}
