import { createBoundedDeviceCommandAgent } from "./device-command-agent";
import { createDriveCommandMailbox, createWindowsMailboxRelay, pollDeviceMailboxOnce, type AuthenticatedDriveRequest } from "./drive-mailbox";
export const BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL =
  "BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL";
export const BVP_VALIDATION_BUILD_GLOBAL = "__BRAIN_BVP_VALIDATION_BUILD__";
export const BVP_DEVICE_AGENT_FACTORY_GLOBAL = "__BRAIN_BVP_DEVICE_AGENT_FACTORY__";
export const BVP_MAILBOX_RUNTIME_GLOBAL = "__BRAIN_BVP_MAILBOX_RUNTIME__";

export interface BvpValidationBuildIdentity {
  readonly schemaVersion: 1;
  readonly sourceCommit: string;
  readonly sentinel: typeof BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL;
}

export function installBvpValidationBuildIdentity(sourceCommit: string): BvpValidationBuildIdentity {
  if (!/^[0-9a-f]{40}$/i.test(sourceCommit)) {
    throw new Error("validation artifact source commit must be a full Git SHA");
  }
  const identity: BvpValidationBuildIdentity = Object.freeze({
    schemaVersion: 1,
    sourceCommit: sourceCommit.toLowerCase(),
    sentinel: BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL,
  });
  Object.defineProperty(globalThis, BVP_VALIDATION_BUILD_GLOBAL, {
    value: identity,
    configurable: true,
    enumerable: false,
    writable: false,
  });
  Object.defineProperty(globalThis, BVP_DEVICE_AGENT_FACTORY_GLOBAL, {
    value: createBoundedDeviceCommandAgent,
    configurable: true,
    enumerable: false,
    writable: false,
  });
  return identity;
}

export function installBvpMailboxRuntime(request: AuthenticatedDriveRequest, relay?: { adapter: Parameters<typeof createWindowsMailboxRelay>[1]; root: string }) {
  const mailbox = createDriveCommandMailbox(request);
  const value = Object.freeze({ mailbox, pollDeviceOnce: (agent: Parameters<typeof pollDeviceMailboxOnce>[1], runId: string, deviceId: string) => pollDeviceMailboxOnce(mailbox, agent, runId, deviceId), relay: relay ? createWindowsMailboxRelay(mailbox, relay.adapter, relay.root) : undefined });
  Object.defineProperty(globalThis, BVP_MAILBOX_RUNTIME_GLOBAL, { value, configurable: true, enumerable: false, writable: false });
  return value;
}
