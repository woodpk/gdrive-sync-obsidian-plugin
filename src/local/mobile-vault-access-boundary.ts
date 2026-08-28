import type { VaultPath } from "../contracts/common";
import type { LocalVaultAccess, LocalVaultAccessBoundary } from "./local-vault-access-boundary";
import { validateCrossPlatformPath } from "./path-policy";

/**
 * Mobile containment is the active Obsidian DataAdapter namespace. This guard
 * admits only portable vault-relative names; all I/O remains on DataAdapter.
 */
export class MobileVaultAccessBoundary implements LocalVaultAccessBoundary {
  readonly kind = "mobile-adapter" as const;

  async assertSafe(path: VaultPath, _access: LocalVaultAccess): Promise<void> {
    const validation = validateCrossPlatformPath(path);
    if (validation.status === "blocked") {
      throw new Error(`Mobile vault access boundary blocked ${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}`);
    }
  }
}
