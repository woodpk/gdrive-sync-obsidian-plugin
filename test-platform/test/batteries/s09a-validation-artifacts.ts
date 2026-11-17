/** Immutable, allowlisted canonical BVP 0.1.20-bvp.3 artifacts for S09A's
 * disposable Windows and iOS/iPadOS validation participants.
 * These are SHA-256 digests of actual release bytes, not mutable version claims.
 * Defined in the S09A test-battery layer; production and generic live-device
 * agents do not own release-specific artifact allowlists.
 */
export const S09A_VALIDATION_ARTIFACTS = Object.freeze({
  sourceCommit: "dedd783c1ce6efa1abd2bd5f34ed4e499321558e",
  artifactSha256: "772ca4e37222b14f3907ee0ce373589907b52760771006c1e3f58e34a9eaa2e1",
  windowsManifestSha256: "332b2f0f7bd8674a7775a9eefd1fd7629439926e1a89b1c08f0955b4226ac96b",
  iosManifestSha256: "332b2f0f7bd8674a7775a9eefd1fd7629439926e1a89b1c08f0955b4226ac96b",
  iosReleaseTag: "0.1.20-bvp.3",
});
