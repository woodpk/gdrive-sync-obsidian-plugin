import type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";
import type { ManagedRemoteIdentity } from "../contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore, type OAuthClientConfiguration, type SecretStorageLike } from "./auth";
import { GoogleDriveAdapter } from "./google-drive-port";
import { GoogleDriveInventoryMetadataSource } from "./inventory-metadata-source";
import { VerifiedMetadataInventoryReader } from "./verified-metadata-inventory-reader";
import { createObsidianRequestUrlFetcher, type ObsidianRequestUrlLike } from "./obsidian-http";
import { GoogleHttpTransport, type RetryPolicy } from "./transport";

export interface ObsidianGoogleDriveBoundaryOptions {
  readonly oauth: OAuthClientConfiguration;
  readonly secretStorage: SecretStorageLike;
  readonly requestUrl: ObsidianRequestUrlLike;
  readonly retryPolicy?: RetryPolicy;
  readonly diagnostics?: DiagnosticLogger;
  /** Explicit identity for this paired vault, not an account-wide root search. */
  readonly managedRemoteIdentity?: () => ManagedRemoteIdentity | undefined;
}

/**
 * Production Phase 3 composition for Obsidian desktop and mobile.
 * Secrets are isolated in Obsidian SecretStorage and all Google HTTP traffic
 * uses Obsidian requestUrl, avoiding Node/Electron dependencies and browser
 * CORS assumptions. Transfer memory remains bounded by the adapter's range and
 * resumable-upload chunk sizes.
 */
export function createObsidianGoogleDriveBoundary(options: ObsidianGoogleDriveBoundaryOptions): {
  readonly oauth: GoogleOAuthSession;
  readonly drive: GoogleDriveAdapter;
  /** Dormant DEC-339 read-only metadata observer; not wired to planning or state publication. */
  readonly metadataReader: VerifiedMetadataInventoryReader;
} {
  const secrets = new ObsidianSecretStore(options.secretStorage);
  const fetcher = createObsidianRequestUrlFetcher(options.requestUrl);
  const oauth = new GoogleOAuthSession(options.oauth, secrets, fetcher);
  const transport = new GoogleHttpTransport(oauth, fetcher, options.retryPolicy, undefined, undefined, undefined, options.diagnostics);
  const drive = new GoogleDriveAdapter(oauth, transport, secrets, options.diagnostics, options.managedRemoteIdentity);
  const metadataSource = new GoogleDriveInventoryMetadataSource(
    drive,
    transport,
    () => drive.pairedInventoryAccountKey(),
  );
  return { oauth, drive, metadataReader: new VerifiedMetadataInventoryReader(metadataSource) };
}
