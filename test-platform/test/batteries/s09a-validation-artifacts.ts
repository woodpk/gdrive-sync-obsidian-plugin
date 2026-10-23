/** Immutable, allowlisted test-only artifacts for S09A's existing Windows
 * validation plugin and its separately published BRAT iOS prerelease.
 * These are SHA-256 digests of actual release bytes, not mutable version claims.
 * Defined in the S09A test-battery layer; production and generic live-device
 * agents do not own release-specific artifact allowlists.
 */
export const S09A_VALIDATION_ARTIFACTS = Object.freeze({
  sourceCommit: "2bf51ca15aec9c752e3ac7769fcf3ac237df99df",
  artifactSha256: "90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7",
  windowsManifestSha256: "d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965",
  iosManifestSha256: "1788bcaa4a9dd05d22ec03b0ba56bd3a72d4fa4541e2e5ec74c1a43253ce54a5",
  iosReleaseTag: "0.1.20-bvp.1",
});
