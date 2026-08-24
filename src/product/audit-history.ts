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
  private limit: number;

  constructor(private readonly persistence: AuditPersistence, limit = 500) {
    this.assertLimit(limit); this.limit = limit;
  }

  async append(record: AuditRecord): Promise<void> {
    await this.ensureLoaded();
    this.records.push(record);
    await this.trimAndPersist();
  }

  async read(): Promise<readonly AuditRecord[]> {
    await this.ensureLoaded();
    return [...this.records];
  }

  async setLimit(limit: number): Promise<void> {
    this.assertLimit(limit);
    await this.ensureLoaded();
    this.limit = limit;
    await this.trimAndPersist();
  }

  currentLimit(): number { return this.limit; }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.records = [...await this.persistence.load()].slice(-this.limit);
    this.loaded = true;
  }
  private async trimAndPersist(): Promise<void> {
    if (this.records.length > this.limit) this.records.splice(0, this.records.length - this.limit);
    await this.persistence.save(this.records);
  }
  private assertLimit(limit: number): void {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10000) throw new Error("audit history limit must be an integer from 1 through 10000");
  }
}
