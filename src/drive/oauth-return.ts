import type { OAuthCallbackInput, OAuthCompletion, GoogleOAuthSession } from "./auth";

export const OBSIDIAN_OAUTH_ACTION = "brain-gdrive-oauth";
export interface ObsidianProtocolRegistrar {
  registerObsidianProtocolHandler(action: string, handler: (params: Record<string, string>) => void | Promise<void>): void;
}
export type GoogleOAuthCompletionDelegate = (input: OAuthCallbackInput) => Promise<OAuthCompletion>;
export function registerGoogleOAuthReturn(
  registrar: ObsidianProtocolRegistrar,
  completeAuthorization: GoogleOAuthCompletionDelegate,
  onComplete?: (result: OAuthCompletion) => void,
): void {
  registrar.registerObsidianProtocolHandler(OBSIDIAN_OAUTH_ACTION, async params => {
    const result = await completeAuthorization({ code: params.code, state: params.state, error: params.error });
    onComplete?.(result);
  });
}

export interface AuthorizationBrowserLauncher { openExternal(url: string): void | Promise<void>; }
export async function beginGoogleAuthorization(oauth: GoogleOAuthSession, browser: AuthorizationBrowserLauncher): Promise<{ readonly state: string; readonly expiresAtMs: number }> {
  const request = await oauth.beginAuthorization();
  await browser.openExternal(request.url);
  return { state: request.state, expiresAtMs: request.expiresAtMs };
}
