import type { PathValidationResult } from "../contracts/local-vault";
import type { VaultPath } from "../contracts/common";

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const WINDOWS_INVALID_COMPONENT = /[<>:"|?*\u0000-\u001F]/;
const MAX_WINDOWS_RELATIVE_PATH = 240;
const MAX_COMPONENT_LENGTH = 255;

export function normalizeVaultPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
}

export function normalizedComparisonPath(path: string): string {
  return normalizeVaultPath(path).normalize("NFC").toLocaleLowerCase("en-US");
}

export function validateCrossPlatformPath(
  path: VaultPath | string,
  existingPaths: readonly string[] = []
): PathValidationResult {
  const original = String(path);
  if (!original || /^[\\/]/.test(original) || /^[A-Za-z]:[\\/]/.test(original) || /^[a-z][a-z0-9+.-]*:\/\//i.test(original)) {
    return { status: "blocked", reason: "external-reference", detail: "Path must be vault-relative" };
  }
  const normalized = normalizeVaultPath(original);
  const components = normalized.split("/");
  if (components.some(component => component === "" || component === "." || component === "..")) {
    return { status: "blocked", reason: "external-reference", detail: "Path traversal or empty components are not allowed" };
  }
  for (const component of components) {
    if (component.length > MAX_COMPONENT_LENGTH || WINDOWS_INVALID_COMPONENT.test(component) || /[ .]$/.test(component)) {
      return { status: "blocked", reason: "invalid-name", detail: `Invalid cross-platform path component: ${component}` };
    }
    if (WINDOWS_RESERVED.test(component)) {
      return { status: "blocked", reason: "reserved-name", detail: `Windows reserved device name: ${component}` };
    }
  }
  if (normalized.length > MAX_WINDOWS_RELATIVE_PATH) {
    return { status: "blocked", reason: "path-too-long", detail: `Relative path exceeds conservative Windows compatibility limit of ${MAX_WINDOWS_RELATIVE_PATH} characters` };
  }

  const candidateNfc = normalized.normalize("NFC");
  const candidateFolded = candidateNfc.toLocaleLowerCase("en-US");
  for (const existing of existingPaths) {
    const peer = normalizeVaultPath(existing);
    if (peer === normalized) continue;
    const peerNfc = peer.normalize("NFC");
    if (peerNfc === candidateNfc) {
      return { status: "blocked", reason: "unicode-collision", detail: `Unicode-equivalent collision with: ${existing}` };
    }
    if (peerNfc.toLocaleLowerCase("en-US") === candidateFolded) {
      return { status: "blocked", reason: "case-collision", detail: `Case-insensitive collision with: ${existing}` };
    }
  }

  return { status: "compatible", normalizedComparisonPath: candidateFolded };
}
