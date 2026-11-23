import type {
  DeviceIdentity, DriveResult, InventoryIdentityFence, ManagedRemoteIdentity,
  RemoteObjectId, VaultIdentity,
} from "../contracts";

export const VERIFIED_INVENTORY_SCHEMA_VERSION = 1;

export interface InventoryPlanningFenceDrive {
  pairedInventoryAccountKey(): Promise<string | undefined>;
  observeManagedDomainRootIds(identity: ManagedRemoteIdentity): Promise<DriveResult<{
    readonly contentRootId: RemoteObjectId;
    readonly configRootId: RemoteObjectId;
  }>>;
}

/** Default-off selector: the disabled branch must not construct or touch inventory dependencies. */
export function selectPlanningAssembler<T>(
  enabled: boolean,
  legacy: () => T,
  inventory: () => T,
): T {
  return enabled ? inventory() : legacy();
}

/** Fresh identity fence for every inventory-backed planning attempt. */
export async function buildInventoryPlanningFence(input: {
  readonly drive: InventoryPlanningFenceDrive;
  readonly remoteIdentity: ManagedRemoteIdentity;
  readonly deviceIdentity: DeviceIdentity;
  readonly vaultIdentity: VaultIdentity;
  readonly scopePolicyFingerprint: string;
}): Promise<InventoryIdentityFence> {
  if (input.remoteIdentity.vaultIdentity !== input.vaultIdentity)
    throw new Error("inventory-fence-vault-identity-mismatch");
  const accountKey = await input.drive.pairedInventoryAccountKey();
  if (!accountKey) throw new Error("paired-inventory-account-unavailable");
  const roots = await input.drive.observeManagedDomainRootIds(input.remoteIdentity);
  if (!roots.ok)
    throw new Error("detail" in roots.signal && roots.signal.detail
      ? roots.signal.detail
      : roots.signal.kind);
  return {
    vaultIdentity: input.vaultIdentity,
    deviceIdentity: input.deviceIdentity,
    pairedAccountKey: accountKey,
    managedRootId: input.remoteIdentity.rootId,
    protocolVersion: input.remoteIdentity.protocolVersion,
    contentDomainRootId: roots.value.contentRootId,
    configDomainRootId: roots.value.configRootId,
    scopePolicyFingerprint: input.scopePolicyFingerprint,
    inventorySchemaVersion: VERIFIED_INVENTORY_SCHEMA_VERSION,
  };
}
