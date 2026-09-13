export type ExternalWindowOpen = (url?: string | URL, target?: string, features?: string) => unknown;

export class PreparedOAuthLaunchDiagnostic {
  private preparedUrl?: string;

  async prepare(runAuthentication: () => Promise<void>): Promise<void> {
    const originalOpen = globalThis.open;
    let capturedUrl: string | undefined;

    const captureOpen: ExternalWindowOpen = url => {
      if (capturedUrl !== undefined) throw new Error("Multiple external-browser launches were requested while preparing OAuth authorization.");
      if (typeof url === "string") capturedUrl = url;
      else if (url instanceof URL) capturedUrl = url.toString();
      else throw new Error("OAuth authorization did not provide a launchable URL.");
      return null;
    };

    try {
      globalThis.open = captureOpen as typeof globalThis.open;
      await runAuthentication();
    } finally {
      globalThis.open = originalOpen;
    }

    if (!capturedUrl) throw new Error("OAuth authorization preparation completed without producing an external-browser URL.");
    this.preparedUrl = capturedUrl;
  }

  hasPreparedAuthorization(): boolean { return Boolean(this.preparedUrl); }

  launchPrepared(): void {
    const url = this.preparedUrl;
    if (!url) throw new Error("Prepare Google authorization before launching it.");
    const opener = globalThis.open;
    if (typeof opener !== "function") throw new Error("The external browser launch mechanism is unavailable.");
    this.preparedUrl = undefined;
    opener(url, "_external");
  }

  clear(): void { this.preparedUrl = undefined; }
}
