export interface DiagnosticShareNavigator {
  readonly share?: (data: ShareData) => Promise<void>;
  readonly canShare?: (data?: ShareData) => boolean;
}

export interface DiagnosticClipboardNavigator {
  readonly clipboard?: {
    readonly writeText?: (text: string) => Promise<void>;
  };
}

export const DIAGNOSTIC_LOG_FILENAME = "brain-sync-diagnostic-log.txt";

export function createDiagnosticLogFile(text: string): File {
  return new File([text], DIAGNOSTIC_LOG_FILENAME, { type: "text/plain" });
}

export function canShareDiagnosticLogFile(
  navigatorLike: DiagnosticShareNavigator | undefined = globalThis.navigator,
): boolean {
  if (!navigatorLike?.share) return false;
  if (!navigatorLike.canShare) return true;
  try {
    return navigatorLike.canShare({ files: [createDiagnosticLogFile("")] });
  } catch {
    return false;
  }
}

/**
 * Writes diagnostic text to the Clipboard API immediately. The protected
 * writeText() call occurs before this function returns its Promise, so callers
 * can invoke it directly from a user gesture without an intervening await.
 */
export function copyDiagnosticLogText(
  text: string,
  navigatorLike: DiagnosticClipboardNavigator | undefined = globalThis.navigator,
): Promise<void> {
  const clipboard = navigatorLike?.clipboard;
  if (!clipboard?.writeText) {
    return Promise.reject(new Error("clipboard API is unavailable on this device"));
  }
  return clipboard.writeText(text);
}

/**
 * Hands a real text File directly to the platform Web Share API.
 * Deliberately passes only `files` because iOS file sharing has historically
 * been less reliable when title/text/url fields are mixed into the same share.
 * The caller should invoke this directly from a user gesture; no async boundary
 * occurs before navigator.share() is called.
 */
export function shareDiagnosticLogText(
  text: string,
  navigatorLike: DiagnosticShareNavigator | undefined = globalThis.navigator,
): Promise<void> {
  if (!navigatorLike?.share) {
    return Promise.reject(new Error("file sharing is unavailable on this device"));
  }
  const file = createDiagnosticLogFile(text);
  if (navigatorLike.canShare && !navigatorLike.canShare({ files: [file] })) {
    return Promise.reject(new Error("this device cannot share the diagnostic text file"));
  }
  return navigatorLike.share({ files: [file] });
}
