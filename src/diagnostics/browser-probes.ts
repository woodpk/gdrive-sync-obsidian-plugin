import { openAuthorizationInExternalBrowser, type AuthorizationExternalOpen } from "../drive/oauth-return";
import type { DiagnosticLogger } from "./diagnostic-logger";
import { instrumentAuthorizationBrowserLauncher } from "./oauth-diagnostics";

export const EXTERNAL_BROWSER_TEST_URL = "https://www.google.com/";

function probeLauncher(logger: DiagnosticLogger, openWindow?: AuthorizationExternalOpen) {
  const browserApiPresent = Boolean(openWindow) || typeof globalThis.open === "function";
  return instrumentAuthorizationBrowserLauncher(
    logger,
    { openExternal: url => openAuthorizationInExternalBrowser(url, openWindow) },
    { component: "diagnostics.browser-probe", target: "_external", launcher: "diagnostic-probe", browserApiPresent },
  );
}

/** Direct probe: the external-browser invocation remains in the synchronous user-gesture call stack. */
export function runDirectExternalBrowserProbe(logger: DiagnosticLogger, openWindow?: AuthorizationExternalOpen): void {
  logger.info("diagnostics.browser-probe", "direct-probe-button-pressed", { source: "settings-button" });
  logger.trace("diagnostics.browser-probe", "direct-probe-enter", { asyncBoundary: false });
  probeLauncher(logger, openWindow).openExternal(EXTERNAL_BROWSER_TEST_URL);
  logger.trace("diagnostics.browser-probe", "direct-probe-exit", { result: "launcher-call-returned" });
}

/** Delayed probe: exactly one controlled microtask boundary precedes the same external-browser invocation. */
export async function runDelayedExternalBrowserProbe(logger: DiagnosticLogger, openWindow?: AuthorizationExternalOpen): Promise<void> {
  logger.info("diagnostics.browser-probe", "delayed-probe-button-pressed", { source: "settings-button" });
  logger.trace("diagnostics.browser-probe", "delayed-probe-async-boundary-enter", { asyncBoundary: true });
  await Promise.resolve();
  logger.trace("diagnostics.browser-probe", "delayed-probe-async-boundary-exit", { asyncBoundary: true });
  await probeLauncher(logger, openWindow).openExternal(EXTERNAL_BROWSER_TEST_URL);
  logger.trace("diagnostics.browser-probe", "delayed-probe-exit", { result: "launcher-call-returned" });
}
