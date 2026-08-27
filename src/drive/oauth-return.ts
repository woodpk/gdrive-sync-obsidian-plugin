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
  cancel?(): void;
}
export type AuthorizationWindowOpen = (url: string, target: string, features: string) => unknown;

export interface ReservedAuthorizationWindow {
  opener: unknown;
  readonly location: { replace(url: string): void };
  close(): void;
}
export type AuthorizationWindowReservation = (url: string, target: string) => ReservedAuthorizationWindow | null;

export function openAuthorizationInSystemBrowser(url: string, openWindow?: AuthorizationWindowOpen): void {
  const launcher = openWindow ?? (typeof globalThis.open === "function"
    ? (value: string, target: string, features: string) => { globalThis.open(value, target, features); }
    : undefined);
  if (!launcher) throw new Error("The system browser could not be opened because no browser launch mechanism is available.");
  launcher(url, "_blank", "noopener,noreferrer");
}

export function reserveAuthorizationInSystemBrowser(openWindow?: AuthorizationWindowReservation): AuthorizationBrowserLauncher {
  const reserve = openWindow ?? (typeof globalThis.open === "function"
    ? (value: string, target: string) => globalThis.open(value, target) as ReservedAuthorizationWindow | null
    : undefined);
  if (!reserve) throw new Error("The system browser could not be opened because no browser launch mechanism is available.");

  const reserved = reserve("about:blank", "_blank");
  if (!reserved) throw new Error("The system browser blocked the authorization window. Try Authenticate again and allow the browser window to open.");
  try { reserved.opener = null; }
  catch (error) {
    reserved.close();
    throw error;
  }

  let settled = false;
  return {
    openExternal(url: string): void {
      if (settled) throw new Error("The reserved authorization window has already been used.");
      reserved.location.replace(url);
      settled = true;
    },
    cancel(): void {
      if (settled) return;
      settled = true;
      reserved.close();
    },
  };
}

export async function beginGoogleAuthorization(oauth: GoogleOAuthSession, browser: AuthorizationBrowserLauncher): Promise<{ readonly state: string; readonly expiresAtMs: number }> {
  try {
    const request = await oauth.beginAuthorization();
    await browser.openExternal(request.url);
    return { state: request.state, expiresAtMs: request.expiresAtMs };
  } catch (error) {
    browser.cancel?.();
    throw error;
  }
}
