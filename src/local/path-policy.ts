import type { PathValidationResult } from "../contracts/local-vault";
import type { VaultPath } from "../contracts/common";

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const WINDOWS_INVALID_COMPONENT = /[<>:"|?*\u0000-\u001F]/;
const MAX_WINDOWS_RELATIVE_PATH = 240;
const MAX_COMPONENT_LENGTH = 255;

export interface PathCollisionIndex {
  readonly caseFolded: ReadonlyMap<string, readonly string[]>;
  readonly unicodeFolded: ReadonlyMap<string, readonly string[]>;
}

export function normalizeVaultPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
}

export function normalizedComparisonPath(path: string): string {
  return normalizeVaultPath(path).normalize("NFC").toLocaleLowerCase("en-US");
}

export function buildCollisionIndex(paths: readonly string[]): PathCollisionIndex {
  const caseMap = new Map<string, string[]>();
  const unicodeMap = new Map<string, string[]>();
  for (const original of paths) {
    const normalized = normalizeVaultPath(original);
    const caseKey = normalized.toLocaleLowerCase("en-US");
    const unicodeKey = normalized.normalize("NFC").toLocaleLowerCase("en-US");
    const caseValues = caseMap.get(caseKey) ?? [];
    caseValues.push(original);
    caseMap.set(caseKey, caseValues);
    const unicodeValues = unicodeMap.get(unicodeKey) ?? [];
    unicodeValues.push(original);
    unicodeMap.set(unicodeKey, unicodeValues);
  }
  return { caseFolded: caseMap, unicodeFolded: unicodeMap };
}

function blockingCollision(
  candidate: string,
  originalPaths: readonly string[],
  kind: "case-collision" | "unicode-collision"
): PathValidationResult | undefined {
  const distinct = originalPaths.filter(existing => normalizeVaultPath(existing) !== candidate);
  if (distinct.length === 0) return undefined;
  return { status: "blocked", reason: kind, detail: `Collides with: ${distinct.join(", ")}` };
}

export function validateCrossPlatformPath(
  path: VaultPath | string,
  existingPaths: readonly string[] = []
): PathValidationResult {
  const original = String(path);
  const normalized = normalizeVaultPath(original);
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized) || /^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    return { status: "blocked", reason: "external-reference", detail: "Path must be vault-relative" };
  }

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

  const caseKey = normalized.toLocaleLowerCase("en-US");
  const unicodeKey = normalized.normalize("NFC").toLocaleLowerCase("en-US");
  const index = buildCollisionIndex(existingPaths);
  const unicodePeers = index.unicodeFolded.get(unicodeKey) ?? [];
  const unicodeCollision = blockingCollision(normalized, unicodePeers.filter(peer => normalizeVaultPath(peer).normalize("NFC") === normalized.normalize("NFC") || normalizeVaultPath(peer).normalize("NFC").toLocaleLowerCase("en-US") === unicodeKey), "unicode-collision");
  if (unicodeCollision && unicodePeers.some(peer => normalizeVaultPath(peer).normalize("NFC") !== normalized.normalize("NFC"))) return unicodeCollision;

  const casePeers = index.caseFolded.get(caseKey) ?? [];
  const caseCollision = blockingCollision(normalized, casePeers, "case-collision");
  if (caseCollision) return caseCollision;

  return { status: "compatible", normalizedComparisonPath: unicodeKey };
}
