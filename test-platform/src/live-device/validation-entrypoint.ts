export const BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL =
  "BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL";
export const BVP_VALIDATION_BUILD_GLOBAL = "__BRAIN_BVP_VALIDATION_BUILD__";

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
  return identity;
}
