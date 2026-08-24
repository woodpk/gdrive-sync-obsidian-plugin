import { GoogleOAuthSession, ObsidianSecretStore, type OAuthClientConfiguration, type SecretStorageLike } from "./auth";
import { GoogleDriveAdapter } from "./google-drive-port";
import { createObsidianRequestUrlFetcher, type ObsidianRequestUrlLike } from "./obsidian-http";
import { GoogleHttpTransport, type RetryPolicy } from "./transport";

export interface ObsidianGoogleDriveBoundaryOptions {
  readonly oauth: OAuthClientConfiguration;
  readonly secretStorage: SecretStorageLike;
  readonly requestUrl: ObsidianRequestUrlLike;
  readonly retryPolicy?: RetryPolicy;
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
} {
  const secrets = new ObsidianSecretStore(options.secretStorage);
  const fetcher = createObsidianRequestUrlFetcher(options.requestUrl);
  const oauth = new GoogleOAuthSession(options.oauth, secrets, fetcher);
  const transport = new GoogleHttpTransport(oauth, fetcher, options.retryPolicy);
  return { oauth, drive: new GoogleDriveAdapter(oauth, transport, secrets) };
}
