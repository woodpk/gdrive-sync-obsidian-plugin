import { REQUIRED_DRIVE_SCOPE } from "../contracts/google-drive";

export const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DEFAULT_TRANSACTION_TTL_MS = 10 * 60 * 1000;

export interface SecretStorageLike {
  getSecret(id: string): string | null;
  setSecret(id: string, secret: string): void;
  deleteSecret?(id: string): void;
}

export class ObsidianSecretStore {
  constructor(private readonly storage: SecretStorageLike) {}
  get(id: string): string | undefined { return this.storage.getSecret(id) ?? undefined; }
  set(id: string, value: string): void { this.storage.setSecret(id, value); }
  delete(id: string): void { if (this.storage.deleteSecret) this.storage.deleteSecret(id); else this.storage.setSecret(id, ""); }
}

export interface OAuthClientConfiguration {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly clientSecretStorageKey?: string;
}
export interface OAuthTokens {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAtMs: number;
  readonly tokenType: string;
  readonly scope: string;
}
export interface OAuthAuthorizationRequest {
  readonly url: string;
  readonly state: string;
  readonly expiresAtMs: number;
}
export interface OAuthCallbackInput { readonly code?: string; readonly state?: string; readonly error?: string; }
export type OAuthCompletion = { readonly ok: true } | { readonly ok: false; readonly reason: "missing-transaction" | "expired-transaction" | "state-mismatch" | "authorization-denied" | "token-exchange-failed"; readonly detail?: string };
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Clock = () => number;

interface OAuthTransaction { readonly state: string; readonly verifier: string; readonly expiresAtMs: number; }
interface TokenResponse { access_token?: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string; error?: string; error_description?: string; }

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomBytes(size: number): Uint8Array { const value = new Uint8Array(size); crypto.getRandomValues(value); return value; }
async function sha256(value: string): Promise<Uint8Array> { return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))); }
function encodeTokens(tokens: OAuthTokens): string { return JSON.stringify(tokens); }
function decodeTokens(raw: string | undefined): OAuthTokens | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as Partial<OAuthTokens>;
    if (typeof value.accessToken !== "string" || typeof value.expiresAtMs !== "number" || typeof value.tokenType !== "string" || typeof value.scope !== "string") return undefined;
    return value as OAuthTokens;
  } catch { return undefined; }
}
function hasExactRequiredDriveScope(scope: string): boolean {
  const granted = scope.trim().split(/\s+/).filter(Boolean);
  return granted.length === 1 && granted[0] === REQUIRED_DRIVE_SCOPE;
}

export class GoogleOAuthSession {
  static readonly TOKEN_SECRET_ID = "brain-gdrive-oauth-tokens";
  private transaction?: OAuthTransaction;
  constructor(
    readonly config: OAuthClientConfiguration,
    private readonly secrets: ObsidianSecretStore,
    private readonly fetcher: FetchLike = fetch,
    private readonly now: Clock = () => Date.now(),
  ) {}

  async beginAuthorization(ttlMs = DEFAULT_TRANSACTION_TTL_MS): Promise<OAuthAuthorizationRequest> {
    const state = base64Url(randomBytes(32));
    const verifier = base64Url(randomBytes(64));
    const challenge = base64Url(await sha256(verifier));
    const expiresAtMs = this.now() + ttlMs;
    this.transaction = { state, verifier, expiresAtMs };
    const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", REQUIRED_DRIVE_SCOPE);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "false");
    return { url: url.toString(), state, expiresAtMs };
  }

  async completeAuthorization(input: OAuthCallbackInput): Promise<OAuthCompletion> {
    const tx = this.transaction;
    this.transaction = undefined;
    if (!tx) return { ok: false, reason: "missing-transaction" };
    if (this.now() > tx.expiresAtMs) return { ok: false, reason: "expired-transaction" };
    if (!input.state || input.state !== tx.state) return { ok: false, reason: "state-mismatch" };
    if (input.error || !input.code) return { ok: false, reason: "authorization-denied", detail: input.error };
    const body = new URLSearchParams({ client_id: this.config.clientId, code: input.code, code_verifier: tx.verifier, redirect_uri: this.config.redirectUri, grant_type: "authorization_code" });
    const clientSecret = this.config.clientSecretStorageKey ? this.secrets.get(this.config.clientSecretStorageKey) : undefined;
    if (clientSecret) body.set("client_secret", clientSecret);
    try {
      const response = await this.fetcher(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
      const parsed = await response.json() as TokenResponse;
      if (!response.ok || !parsed.access_token || !parsed.expires_in) return { ok: false, reason: "token-exchange-failed", detail: parsed.error ?? `http-${response.status}` };
      const previous = this.tokens();
      const previousRefreshToken =
        previous && hasExactRequiredDriveScope(previous.scope)
          ? previous.refreshToken
          : undefined;

      if (previous && !hasExactRequiredDriveScope(previous.scope)) {
        this.clearTokens();
      }

      const tokens: OAuthTokens = {
        accessToken: parsed.access_token,
        refreshToken: parsed.refresh_token ?? previousRefreshToken,
        expiresAtMs: this.now() + parsed.expires_in * 1000,
        tokenType: parsed.token_type ?? "Bearer",
        scope: parsed.scope ?? REQUIRED_DRIVE_SCOPE,
      };
      if (!hasExactRequiredDriveScope(tokens.scope)) return { ok: false, reason: "token-exchange-failed", detail: "oauth-scope-grant-not-exact-drive-file" };
      this.secrets.set(GoogleOAuthSession.TOKEN_SECRET_ID, encodeTokens(tokens));
      return { ok: true };
    } catch { return { ok: false, reason: "token-exchange-failed", detail: "network-or-service-failure" }; }
  }

  tokens(): OAuthTokens | undefined { return decodeTokens(this.secrets.get(GoogleOAuthSession.TOKEN_SECRET_ID)); }
  clearTokens(): void { this.secrets.delete(GoogleOAuthSession.TOKEN_SECRET_ID); }

  async accessToken(): Promise<string | undefined> {
    const current = this.tokens();
    if (!current) return undefined;
    if (!hasExactRequiredDriveScope(current.scope)) { this.clearTokens(); return undefined; }
    if (current.expiresAtMs - this.now() > 60_000) return current.accessToken;
    if (!current.refreshToken) { this.clearTokens(); return undefined; }
    const body = new URLSearchParams({ client_id: this.config.clientId, refresh_token: current.refreshToken, grant_type: "refresh_token" });
    const clientSecret = this.config.clientSecretStorageKey ? this.secrets.get(this.config.clientSecretStorageKey) : undefined;
    if (clientSecret) body.set("client_secret", clientSecret);
    try {
      const response = await this.fetcher(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
      const parsed = await response.json() as TokenResponse;
      if (!response.ok || !parsed.access_token || !parsed.expires_in) { this.clearTokens(); return undefined; }
      const refreshed: OAuthTokens = { accessToken: parsed.access_token, refreshToken: current.refreshToken, expiresAtMs: this.now() + parsed.expires_in * 1000, tokenType: parsed.token_type ?? current.tokenType, scope: parsed.scope ?? current.scope };
      if (!hasExactRequiredDriveScope(refreshed.scope)) { this.clearTokens(); return undefined; }
      this.secrets.set(GoogleOAuthSession.TOKEN_SECRET_ID, encodeTokens(refreshed));
      return refreshed.accessToken;
    } catch { return undefined; }
  }
}
