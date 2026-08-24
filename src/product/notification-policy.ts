import type { ProductSurfaceState } from "../contracts";

export interface MeaningfulNotification { readonly key: string; readonly message: string; }

/** Product notification projection: only user-actionable/major conditions produce notices. */
export function meaningfulNotification(surface: ProductSurfaceState): MeaningfulNotification | undefined {
  const status = surface.status;
  switch (status.kind) {
    case "conflict-present":
      return { key: `conflict:${status.conflictCount}`, message: `BRAIN sync has ${status.conflictCount} conflict(s) requiring attention.` };
    case "destructive-plan-blocked":
      return { key: `destructive:${String(status.planId)}`, message: "BRAIN sync blocked a destructive plan for review." };
    case "authentication-required":
      return { key: `auth:${status.reason}`, message: "BRAIN sync requires Google authentication." };
    case "recovery-required":
      return { key: `recovery:${status.reason}`, message: `BRAIN sync requires recovery: ${status.reason}` };
    case "error":
      return { key: `error:${status.code}:${status.message}`, message: `BRAIN sync error: ${status.message}` };
    default:
      return undefined;
  }
}

export class MeaningfulNotificationFilter {
  private lastKey?: string;
  next(surface: ProductSurfaceState): string | undefined {
    const notice = meaningfulNotification(surface);
    if (!notice) { this.lastKey = undefined; return undefined; }
    if (notice.key === this.lastKey) return undefined;
    this.lastKey = notice.key;
    return notice.message;
  }
}
