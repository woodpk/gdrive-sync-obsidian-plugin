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

export interface AuthorizationBrowserLauncher {
  openExternal(url: string): void | Promise<void>;
}
export type AuthorizationWindowOpen = (url: string, target: string, features: string) => unknown;
export type AuthorizationExternalOpen = (url: string, target: string) => unknown;

export function openAuthorizationInSystemBrowser(url: string, openWindow?: AuthorizationWindowOpen): void {
  const launcher = openWindow ?? (typeof globalThis.open === "function"
    ? (value: string, target: string, features: string) => { globalThis.open(value, target, features); }
    : undefined);
  if (!launcher) throw new Error("The system browser could not be opened because no browser launch mechanism is available.");
  launcher(url, "_blank", "noopener,noreferrer");
}

export function openAuthorizationInExternalBrowser(url: string, openWindow?: AuthorizationExternalOpen): void {
  const launcher = openWindow ?? (typeof globalThis.open === "function"
    ? (value: string, target: string) => { globalThis.open(value, target); }
    : undefined);
  if (!launcher) throw new Error("The external browser could not be opened because no browser launch mechanism is available.");
  launcher(url, "_external");
}

export async function beginGoogleAuthorization(oauth: GoogleOAuthSession, browser: AuthorizationBrowserLauncher): Promise<{ readonly state: string; readonly expiresAtMs: number }> {
  const request = await oauth.beginAuthorization();
  await browser.openExternal(request.url);
  return { state: request.state, expiresAtMs: request.expiresAtMs };
}
