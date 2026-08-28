import type { VaultPath } from "../contracts/common";

export type LocalVaultAccess = "enumerate" | "observe" | "mutation-source" | "mutation-target";

/**
 * Private platform seam for proving that a local operation is safe to submit
 * through the current runtime's approved vault-access boundary.
 */
export interface LocalVaultAccessBoundary {
  readonly kind?: "desktop-physical" | "mobile-adapter" | "unavailable";
  assertSafe(path: VaultPath, access: LocalVaultAccess): Promise<void>;
}
