import type { AuthorizationBrowserLauncher } from "../drive/oauth-return";
import type { DiagnosticComponent, DiagnosticLogger } from "./diagnostic-logger";

export interface BrowserDiagnosticContext {
  readonly component?: DiagnosticComponent;
  readonly target: "_external" | "_blank";
  readonly launcher: "external-browser" | "system-browser" | "diagnostic-probe";
  readonly browserApiPresent: boolean;
}

function isPromiseLike(value: void | Promise<void>): value is Promise<void> {
  return Boolean(value) && typeof (value as Promise<void>).then === "function";
}

/**
 * Wraps a browser launcher without ever receiving or retaining a loggable URL field.
 * The wrapped URL passes directly to the launcher and is never added to diagnostics.
 */
export function instrumentAuthorizationBrowserLauncher(
  logger: DiagnosticLogger,
  browser: AuthorizationBrowserLauncher,
  context: BrowserDiagnosticContext,
): AuthorizationBrowserLauncher {
  const component = context.component ?? "oauth.browser";
  return {
    openExternal(url: string): void | Promise<void> {
      logger.info(component, "browser-launch-requested");
      logger.debug(component, "browser-launch-context", {
        target: context.target,
        launcher: context.launcher,
        browserApiPresent: context.browserApiPresent,
        runtimeInitialized: true,
      });
      logger.trace(component, "browser-launch-invoke", { target: context.target, launcher: context.launcher });
      try {
        const result = browser.openExternal(url);
        if (isPromiseLike(result)) {
          return result.then(
            () => logger.trace(component, "browser-launch-return", { result: "javascript-call-returned" }),
            error => {
              logger.failure(component, "browser-launch-throw", error, {
                operation: "external-browser-launch",
                stage: "launcher-call",
                classification: "browser-launch-failure",
                retryable: true,
                recoveryIntended: false,
              });
              throw error;
            },
          );
        }
        logger.trace(component, "browser-launch-return", { result: "javascript-call-returned" });
        return undefined;
      } catch (error) {
        logger.failure(component, "browser-launch-throw", error, {
          operation: "external-browser-launch",
          stage: "launcher-call",
          classification: "browser-launch-failure",
          retryable: true,
          recoveryIntended: false,
        });
        throw error;
      }
    },
  };
}
