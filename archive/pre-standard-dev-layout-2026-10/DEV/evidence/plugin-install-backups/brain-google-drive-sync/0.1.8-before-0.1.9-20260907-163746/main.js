"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/contracts/common.ts
function operationalFailureProvenanceFromErrorV1_3(error) {
  return error instanceof OperationalFailureErrorV1_3 ? error.provenance : void 0;
}
var contractId, OperationalFailureErrorV1_3;
var init_common = __esm({
  "src/contracts/common.ts"() {
    "use strict";
    contractId = (value2) => value2;
    OperationalFailureErrorV1_3 = class extends Error {
      constructor(provenance2, message) {
        super(message ?? provenance2.detail ?? provenance2.kind);
        this.provenance = provenance2;
      }
      provenance;
      name = "OperationalFailureErrorV1_3";
    };
  }
});

// src/local/path-policy.ts
function normalizeVaultPath(path2) {
  return path2.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
}
function normalizedComparisonPath(path2) {
  return normalizeVaultPath(path2).normalize("NFC").toLocaleLowerCase("en-US");
}
function validateCrossPlatformPath(path2, existingPaths = []) {
  const original = String(path2);
  if (!original || /^[\\/]/.test(original) || /^[A-Za-z]:[\\/]/.test(original) || /^[a-z][a-z0-9+.-]*:\/\//i.test(original)) {
    return { status: "blocked", reason: "external-reference", detail: "Path must be vault-relative" };
  }
  const normalized = normalizeVaultPath(original);
  const components = normalized.split("/");
  if (components.some((component) => component === "" || component === "." || component === "..")) {
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
var WINDOWS_RESERVED, WINDOWS_INVALID_COMPONENT, MAX_WINDOWS_RELATIVE_PATH, MAX_COMPONENT_LENGTH;
var init_path_policy = __esm({
  "src/local/path-policy.ts"() {
    "use strict";
    WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
    WINDOWS_INVALID_COMPONENT = /[<>:"|?*\u0000-\u001F]/;
    MAX_WINDOWS_RELATIVE_PATH = 240;
    MAX_COMPONENT_LENGTH = 255;
  }
});

// src/local/config-policy.ts
var PORTABLE_CORE_FILES, DEVICE_LOCAL_NAMES, PROTECTED_NAME_PATTERNS, SelectiveConfigurationPolicy;
var init_config_policy = __esm({
  "src/local/config-policy.ts"() {
    "use strict";
    init_path_policy();
    PORTABLE_CORE_FILES = /* @__PURE__ */ new Map([
      ["app.json", "obsidian-core-app-settings-v1"],
      ["appearance.json", "obsidian-core-appearance-v1"],
      ["hotkeys.json", "obsidian-core-hotkeys-v1"],
      ["core-plugins.json", "obsidian-core-plugin-enablements-v1"]
    ]);
    DEVICE_LOCAL_NAMES = /* @__PURE__ */ new Set([
      "workspace.json",
      "workspace-mobile.json",
      "workspace",
      "cache",
      "cache.json"
    ]);
    PROTECTED_NAME_PATTERNS = [
      { matcher: /(?:^|\/)(?:oauth|auth|token|tokens|credentials|secret|secrets)(?:\.|\/|$)/i, reason: { classification: "protected", reason: "authentication-secret" } },
      { matcher: /(?:^|\/)(?:device-id|device-identity)(?:\.|\/|$)/i, reason: { classification: "protected", reason: "device-identity" } },
      { matcher: /(?:^|\/)(?:sync-state|base-state|change-cursor|cursor|checkpoint|journal|tombstone|recovery|audit|sync-cache|hash-cache|operation-log)(?:\.|\/|$)/i, reason: { classification: "protected", reason: "sync-operational-state" } }
    ];
    SelectiveConfigurationPolicy = class {
      classify(path2, activeConfigurationDirectory) {
        const configDir = normalizeVaultPath(String(activeConfigurationDirectory));
        const normalized = normalizeVaultPath(String(path2));
        if (!(normalized === configDir || normalized.startsWith(`${configDir}/`))) {
          return { classification: "unknown", reason: "Path is outside the active configuration directory" };
        }
        const relative2 = normalized === configDir ? "" : normalized.slice(configDir.length + 1);
        if (!relative2) return { classification: "device-local", reason: "Configuration root is a container, not a portable artifact" };
        for (const protectedPattern of PROTECTED_NAME_PATTERNS) {
          if (protectedPattern.matcher.test(relative2)) return protectedPattern.reason;
        }
        const lower = relative2.toLocaleLowerCase("en-US");
        const basename = lower.split("/").at(-1) ?? lower;
        if (DEVICE_LOCAL_NAMES.has(lower) || DEVICE_LOCAL_NAMES.has(basename) || /(?:^|\/)(?:cache|logs?|tmp|temp|lock)(?:\/|\.|$)/i.test(lower)) {
          return { classification: "device-local", reason: "Workspace, session, cache, log, temporary, or platform runtime state remains device-local" };
        }
        if (lower.startsWith("plugins/brain-google-drive-sync/")) {
          return { classification: "protected", reason: "sync-operational-state" };
        }
        if (lower.startsWith("plugins/")) {
          return { classification: "unknown", reason: "Third-party plugin configuration is not portable by default" };
        }
        const policyId = PORTABLE_CORE_FILES.get(lower);
        if (policyId) return { classification: "portable", policyId };
        return { classification: "unknown", reason: "Configuration artifact is not in the explicit portable allowlist" };
      }
      describePortablePolicy() {
        return [...PORTABLE_CORE_FILES.entries()].map(([relativePath, policyId]) => ({
          relativePath,
          classification: { classification: "portable", policyId }
        }));
      }
    };
  }
});

// src/local/exclusions.ts
function normalize(path2) {
  return path2.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
}
function escapeRegex(value2) {
  return value2.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}
function compileGlob(pattern) {
  const normalized = normalize(pattern);
  let out = "^";
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (ch === "*" && normalized[i + 1] === "*") {
      if (normalized[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (ch === "*") {
      out += "[^/]*";
    } else {
      out += escapeRegex(ch);
    }
  }
  return new RegExp(`${out}$`, "i");
}
function directoryRootMatch(candidate, pattern) {
  if (!pattern.endsWith("/**")) return false;
  const root = normalize(pattern.slice(0, -3));
  return candidate.toLocaleLowerCase("en-US") === root.toLocaleLowerCase("en-US");
}
var DEFAULT_RULES, LocalExclusionPolicy, defaultLocalExclusionRules;
var init_exclusions = __esm({
  "src/local/exclusions.ts"() {
    "use strict";
    DEFAULT_RULES = [
      { id: "git", pattern: ".git/**", source: "default", description: "Git repository metadata" },
      { id: "mac-ds-store", pattern: "**/.DS_Store", source: "default", description: "macOS Finder metadata" },
      { id: "windows-thumbs", pattern: "**/Thumbs.db", source: "default", description: "Windows Explorer thumbnail cache" },
      { id: "windows-desktop-ini", pattern: "**/desktop.ini", source: "default", description: "Windows Explorer folder metadata" },
      { id: "temporary-suffix", pattern: "**/*.tmp", source: "default", description: "Temporary files" },
      { id: "temporary-tilde", pattern: "**/*~", source: "default", description: "Editor backup/temporary files" },
      { id: "lock-files", pattern: "**/*.lock", source: "default", description: "Runtime lock files" },
      { id: "brain-sync-stage", pattern: "**/*.brain-sync-stage-*", source: "default", description: "BRAIN Sync incomplete local staging files" },
      { id: "brain-sync-backup", pattern: "**/*.brain-sync-backup-*", source: "default", description: "BRAIN Sync local replacement backup artifacts" },
      { id: "obsidian-trash", pattern: ".trash/**", source: "default", description: "Local recoverable trash" }
    ];
    LocalExclusionPolicy = class {
      rules;
      compiled;
      constructor(userPatterns = []) {
        const userRules = userPatterns.map((pattern, index) => ({
          id: `user-${index + 1}`,
          pattern,
          source: "user",
          description: "User-configured exclusion"
        }));
        this.rules = [...DEFAULT_RULES, ...userRules];
        this.compiled = this.rules.map((rule) => ({ rule, matcher: compileGlob(rule.pattern) }));
      }
      evaluate(path2, activeConfigurationDirectory) {
        const candidate = normalize(String(path2));
        const configDir = activeConfigurationDirectory ? normalize(String(activeConfigurationDirectory)) : void 0;
        if (configDir && (candidate === configDir || candidate.startsWith(`${configDir}/`))) {
          return {
            excluded: true,
            rule: {
              id: "active-configuration-directory",
              pattern: `${configDir}/**`,
              source: "configuration-boundary",
              description: "Active Obsidian configuration directory is handled by selective configuration policy"
            }
          };
        }
        const match = this.compiled.find((item) => directoryRootMatch(candidate, item.rule.pattern) || item.matcher.test(candidate));
        return match ? { excluded: true, rule: match.rule } : { excluded: false };
      }
    };
    defaultLocalExclusionRules = () => DEFAULT_RULES;
  }
});

// src/local/obsidian-local-vault.ts
function sleep(milliseconds) {
  return new Promise((resolve2) => globalThis.setTimeout(resolve2, milliseconds));
}
function asPath(path2) {
  return normalizeVaultPath(path2);
}
function statToken(path2, stat, generation) {
  return contractId(`${normalizeVaultPath(path2)}|${stat.type}|${stat.size}|${stat.mtime}|g${generation}`);
}
function sameStat(left, right) {
  if (!left || !right) return false;
  return left.type === right.type && left.size === right.size && left.mtime === right.mtime;
}
function classifyFailure(path2, error) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLocaleLowerCase("en-US");
  if (lower.includes("permission") || lower.includes("denied") || lower.includes("access") || lower.includes("external reference")) {
    return { status: "inaccessible", side: "local", path: path2, reason: message };
  }
  if (lower.includes("read") || lower.includes("io") || lower.includes("i/o")) {
    return { status: "unreadable", side: "local", path: path2, reason: message };
  }
  return { status: "unknown", side: "local", path: path2, reason: message };
}
function chunkArrayBuffer(chunk) {
  const copy = new Uint8Array(chunk.byteLength);
  copy.set(chunk);
  return copy.buffer;
}
function parentPath2(path2) {
  const slash = path2.lastIndexOf("/");
  return slash < 0 ? "" : path2.slice(0, slash);
}
function baseName(path2) {
  const slash = path2.lastIndexOf("/");
  return slash < 0 ? path2 : path2.slice(slash + 1);
}
function temporarySibling(path2, purpose) {
  const parent = parentPath2(path2);
  const leaf = baseName(path2);
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${parent ? `${parent}/` : ""}.${leaf}.brain-sync-${purpose}-${id}`;
}
function validateEnumeratedChild(parent, child) {
  if (typeof child !== "string") return { reason: "Adapter returned a non-string child path" };
  const normalized = normalizeVaultPath(child);
  const validation = validateCrossPlatformPath(child);
  if (validation.status === "blocked") return { reason: `Adapter child path is blocked by ${validation.reason}` };
  if (normalized !== child) return { reason: "Adapter returned a non-normalized child path" };
  const prefix = parent ? `${parent}/` : "";
  if (!normalized.startsWith(prefix)) return { reason: "Adapter child is outside the requested parent" };
  const remainder = normalized.slice(prefix.length);
  if (!remainder || remainder.includes("/")) return { reason: "Adapter child is not an immediate descendant of the requested parent" };
  return { path: normalized };
}
function parseContentRange(value2) {
  if (!value2) return void 0;
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(value2.trim());
  if (!match) return void 0;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !Number.isSafeInteger(total)) return void 0;
  return { start, end, total };
}
var LocalPlatformCapabilityError, UnavailableVaultAccessBoundary, LocalStaleObservationError, ResourceFetchContentSource, ObsidianLocalVaultAdapter;
var init_obsidian_local_vault = __esm({
  "src/local/obsidian-local-vault.ts"() {
    "use strict";
    init_common();
    init_config_policy();
    init_exclusions();
    init_path_policy();
    LocalPlatformCapabilityError = class extends Error {
      constructor(capability, message) {
        super(message);
        this.capability = capability;
        this.name = "LocalPlatformCapabilityError";
      }
      capability;
    };
    UnavailableVaultAccessBoundary = class {
      kind = "unavailable";
      async assertSafe(path2, _access) {
        throw new LocalPlatformCapabilityError(
          "external-reference-detection",
          `This runtime cannot prove that ${String(path2)} does not traverse an external filesystem reference. Synchronization access is blocked.`
        );
      }
    };
    LocalStaleObservationError = class extends Error {
      constructor(path2) {
        super(`Local observation became stale: ${String(path2)}`);
        this.path = path2;
        this.name = "LocalStaleObservationError";
      }
      path;
    };
    ResourceFetchContentSource = class {
      constructor(owner, path2, expectedToken, sizeBytes, fetchImpl, maxChunkBytes) {
        this.owner = owner;
        this.path = path2;
        this.expectedToken = expectedToken;
        this.fetchImpl = fetchImpl;
        this.maxChunkBytes = maxChunkBytes;
        this.sizeBytes = sizeBytes;
      }
      owner;
      path;
      expectedToken;
      fetchImpl;
      maxChunkBytes;
      sizeBytes;
      async *openChunks() {
        if (this.sizeBytes === void 0 || !Number.isSafeInteger(this.sizeBytes) || this.sizeBytes < 0) {
          throw new LocalPlatformCapabilityError(
            "bounded-local-read",
            `Cannot perform a bounded local read without a trustworthy byte size: ${String(this.path)}`
          );
        }
        if (this.sizeBytes === 0) {
          await this.owner.assertToken(this.path, this.expectedToken);
          return;
        }
        const resourceUrl = this.owner.adapter.getResourcePath(String(this.path));
        for (let start = 0; start < this.sizeBytes; start += this.maxChunkBytes) {
          await this.owner.assertToken(this.path, this.expectedToken);
          const requestedEnd = Math.min(start + this.maxChunkBytes - 1, this.sizeBytes - 1);
          const expectedLength = requestedEnd - start + 1;
          const response = await this.fetchImpl(resourceUrl, {
            headers: { Range: `bytes=${start}-${requestedEnd}` }
          });
          if (response.status === 200 && start === 0) {
            await this.assertContentLength(response, this.sizeBytes, false);
            yield* this.readResponseBody(response, this.sizeBytes);
            return;
          }
          if (response.status !== 206) {
            await this.cancelResponse(response);
            throw new LocalPlatformCapabilityError(
              "bounded-local-read",
              `Local resource runtime returned unsupported HTTP ${response.status} for ${String(this.path)}.`
            );
          }
          const contentRange = parseContentRange(response.headers.get("Content-Range"));
          if (!contentRange || contentRange.start !== start || contentRange.end !== requestedEnd || contentRange.total !== this.sizeBytes) {
            await this.cancelResponse(response);
            throw new LocalPlatformCapabilityError(
              "bounded-local-read",
              `Local resource returned an invalid Content-Range for ${String(this.path)}; expected bytes ${start}-${requestedEnd}/${this.sizeBytes}.`
            );
          }
          await this.assertContentLength(response, expectedLength, true);
          yield* this.readResponseBody(response, expectedLength);
        }
        await this.owner.assertToken(this.path, this.expectedToken);
      }
      async assertContentLength(response, expectedLength, boundedRange) {
        const declaredLength = response.headers.get("Content-Length");
        if (declaredLength === null) return;
        const parsedLength = /^\d+$/.test(declaredLength) ? Number(declaredLength) : Number.NaN;
        if (!Number.isSafeInteger(parsedLength) || parsedLength !== expectedLength || boundedRange && parsedLength > this.maxChunkBytes) {
          await this.cancelResponse(response);
          throw new LocalPlatformCapabilityError(
            "bounded-local-read",
            `Local resource returned an unsafe Content-Length for ${String(this.path)}: ${declaredLength}.`
          );
        }
      }
      async *readResponseBody(response, expectedLength) {
        if (!response.body) {
          throw new LocalPlatformCapabilityError(
            "bounded-local-read",
            "This runtime does not expose a readable response body for incremental local-file processing."
          );
        }
        const reader = response.body.getReader();
        let received = 0;
        let bytesSinceStaleCheck = 0;
        let completed = false;
        try {
          await this.owner.assertToken(this.path, this.expectedToken);
          while (true) {
            if (bytesSinceStaleCheck === this.maxChunkBytes) {
              await this.owner.assertToken(this.path, this.expectedToken);
              bytesSinceStaleCheck = 0;
            }
            const result = await reader.read();
            if (result.done) {
              completed = true;
              break;
            }
            let offset = 0;
            while (offset < result.value.byteLength) {
              if (bytesSinceStaleCheck === this.maxChunkBytes) {
                await this.owner.assertToken(this.path, this.expectedToken);
                bytesSinceStaleCheck = 0;
              }
              const remainingExpected = expectedLength - received;
              if (remainingExpected <= 0) {
                throw new LocalPlatformCapabilityError(
                  "bounded-local-read",
                  `Local resource returned more than the observed ${expectedLength} bytes for ${String(this.path)}.`
                );
              }
              const take = Math.min(
                result.value.byteLength - offset,
                this.maxChunkBytes - bytesSinceStaleCheck,
                remainingExpected
              );
              const chunk = result.value.subarray(offset, offset + take);
              offset += take;
              received += take;
              bytesSinceStaleCheck += take;
              yield chunk;
            }
          }
        } finally {
          if (!completed) {
            try {
              await reader.cancel();
            } catch {
            }
          }
          reader.releaseLock();
        }
        if (received !== expectedLength) {
          throw new LocalPlatformCapabilityError(
            "bounded-local-read",
            `Local resource returned ${received} bytes for an observed ${expectedLength}-byte file at ${String(this.path)}.`
          );
        }
        await this.owner.assertToken(this.path, this.expectedToken);
      }
      async cancelResponse(response) {
        try {
          await response.body?.cancel();
        } catch {
        }
      }
    };
    ObsidianLocalVaultAdapter = class {
      constructor(app, options = {}) {
        this.app = app;
        this.adapter = app.vault.adapter;
        this.exclusionPolicy = options.exclusionPolicy ?? new LocalExclusionPolicy();
        this.configurationPolicy = options.configurationPolicy ?? new SelectiveConfigurationPolicy();
        this.stabilityDelayMs = options.stabilityDelayMs ?? 150;
        this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
        this.readChunkSizeBytes = options.readChunkSizeBytes ?? 256 * 1024;
        if (!Number.isSafeInteger(this.readChunkSizeBytes) || this.readChunkSizeBytes <= 0) {
          throw new Error("readChunkSizeBytes must be a positive safe integer");
        }
        this.accessBoundary = options.accessBoundary ?? options.externalReferenceGuard ?? new UnavailableVaultAccessBoundary();
        this.contentSourceFactory = options.contentSourceFactory;
        this.adapterMutationFallback = options.adapterMutationFallback ?? false;
        this.installVaultEvents();
        this.installLifecycleEvents();
      }
      app;
      adapter;
      exclusionPolicy;
      configurationPolicy;
      stabilityDelayMs;
      fetchImpl;
      readChunkSizeBytes;
      accessBoundary;
      contentSourceFactory;
      adapterMutationFallback;
      changeListeners = /* @__PURE__ */ new Set();
      lifecycleListeners = /* @__PURE__ */ new Set();
      eventUnsubscribers = [];
      generations = /* @__PURE__ */ new Map();
      vaultReady = false;
      disposed = false;
      async activeConfigurationDirectory() {
        const value2 = this.app.vault.configDir;
        if (!value2 || typeof value2 !== "string") {
          throw new LocalPlatformCapabilityError("active-configuration-directory", "Obsidian runtime did not expose vault.configDir");
        }
        const validation = validateCrossPlatformPath(value2);
        if (validation.status === "blocked") {
          throw new LocalPlatformCapabilityError("active-configuration-directory", `Obsidian exposed an unsafe configuration directory (${validation.reason})`);
        }
        return asPath(value2);
      }
      async enumerate() {
        const entries = [];
        const configDir = await this.activeConfigurationDirectory();
        const visited = /* @__PURE__ */ new Set();
        const failures = [];
        const uncertainties = [];
        const recordFailure = (reason, scope, affectedPath) => {
          failures.push(reason);
          uncertainties.push(scope === "all" ? { scope, reason } : { scope, path: affectedPath, reason });
        };
        const visit = async (folder) => {
          const normalizedFolder = normalizeVaultPath(folder);
          if (visited.has(normalizedFolder)) {
            const reason = `Repeated directory encountered while enumerating: ${normalizedFolder || "/"}`;
            recordFailure(reason, normalizedFolder ? "subtree" : "all", normalizedFolder ? asPath(normalizedFolder) : void 0);
            return;
          }
          visited.add(normalizedFolder);
          if (normalizedFolder) {
            try {
              await this.accessBoundary.assertSafe(normalizedFolder, "enumerate");
            } catch (error) {
              const reason = `${normalizedFolder}: directory access boundary rejected enumeration (${error instanceof Error ? error.message : String(error)})`;
              recordFailure(reason, "subtree", asPath(normalizedFolder));
              return;
            }
          }
          let listing;
          try {
            listing = await this.adapter.list(normalizedFolder);
          } catch (error) {
            const reason = `${normalizedFolder || "/"}: ${error instanceof Error ? error.message : String(error)}`;
            recordFailure(reason, normalizedFolder ? "subtree" : "all", normalizedFolder ? asPath(normalizedFolder) : void 0);
            return;
          }
          if (!Array.isArray(listing?.folders) || !Array.isArray(listing?.files)) {
            const reason = `${normalizedFolder || "/"}: adapter returned a malformed directory listing`;
            recordFailure(reason, normalizedFolder ? "subtree" : "all", normalizedFolder ? asPath(normalizedFolder) : void 0);
            return;
          }
          const seenChildren = /* @__PURE__ */ new Set();
          const inspectChild = async (rawChild, expectedKind) => {
            const validated = validateEnumeratedChild(normalizedFolder, rawChild);
            if (!validated.path) {
              const reason = `${normalizedFolder || "/"}: enumeration child rejected (${validated.reason ?? "invalid child"})`;
              recordFailure(reason, normalizedFolder ? "subtree" : "all", normalizedFolder ? asPath(normalizedFolder) : void 0);
              return;
            }
            const comparison = normalizedComparisonPath(String(validated.path));
            if (seenChildren.has(comparison)) {
              const reason = `${normalizedFolder || "/"}: duplicate or colliding enumeration child rejected`;
              recordFailure(reason, normalizedFolder ? "subtree" : "all", normalizedFolder ? asPath(normalizedFolder) : void 0);
              return;
            }
            seenChildren.add(comparison);
            const path2 = validated.path;
            if (this.exclusionPolicy.evaluate(path2, configDir).excluded) return;
            try {
              await this.accessBoundary.assertSafe(path2, "enumerate");
            } catch (error) {
              const failure = classifyFailure(path2, error);
              entries.push(failure);
              const reason = expectedKind === "folder" ? `${String(path2)}: subtree not safely enumerable (${failure.status})` : `${String(path2)}: listed file was rejected by the access boundary (${failure.status})`;
              recordFailure(reason, expectedKind === "folder" ? "subtree" : "path", path2);
              return;
            }
            const observation = await this.observe(path2);
            entries.push(observation);
            if (observation.status !== "present" || observation.entityKind !== expectedKind) {
              const reason = `${String(path2)}: listed ${expectedKind} was not truthfully observed as ${expectedKind} (${observation.status})`;
              recordFailure(reason, expectedKind === "folder" ? "subtree" : "path", path2);
              return;
            }
            if (expectedKind === "folder") await visit(String(path2));
          };
          for (const folderPath of listing.folders) await inspectChild(folderPath, "folder");
          for (const filePath of listing.files) await inspectChild(filePath, "file");
        };
        await visit("");
        return {
          entries,
          completeness: failures.length === 0 ? { status: "complete" } : { status: "partial", reason: failures.join("; ") },
          ...uncertainties.length ? { uncertainties } : {}
        };
      }
      async observe(path2) {
        const normalized = asPath(String(path2));
        try {
          const safe = await this.safePath(path2, "observe");
          const safeRaw = String(safe);
          const exists = await this.adapter.exists(safeRaw, true);
          if (!exists) return { status: "absent", side: "local", path: safe };
          const first = await this.adapter.stat(safeRaw);
          if (!first) return { status: "unknown", side: "local", path: safe, reason: "Path exists but adapter.stat returned no metadata" };
          if (first.type === "folder") {
            return {
              status: "present",
              side: "local",
              path: safe,
              entityKind: "folder",
              stability: "stable",
              observationToken: statToken(safeRaw, first, this.generationFor(safe))
            };
          }
          if (first.type !== "file") {
            return { status: "unknown", side: "local", path: safe, reason: "Adapter exposed an unsupported local filesystem object" };
          }
          await sleep(this.stabilityDelayMs);
          const second = await this.adapter.stat(safeRaw);
          const stable = sameStat(first, second);
          const finalStat = second ?? first;
          if (finalStat.type !== "file") {
            return { status: "unknown", side: "local", path: safe, reason: "Local object kind changed during observation" };
          }
          return {
            status: "present",
            side: "local",
            path: safe,
            entityKind: "file",
            content: { sizeBytes: finalStat.size, advisoryModifiedTimeMs: finalStat.mtime },
            stability: stable ? "stable" : "unstable",
            observationToken: statToken(safeRaw, finalStat, this.generationFor(safe))
          };
        } catch (error) {
          return classifyFailure(normalized, error);
        }
      }
      async readFile(path2, expectedToken) {
        const observation = await this.observe(path2);
        if (observation.status !== "present" || observation.entityKind !== "file") {
          throw new Error(`Local file is not readable/present: ${String(path2)} (${observation.status})`);
        }
        if (observation.stability !== "stable" || !observation.observationToken) {
          throw new Error(`Local file is not stable: ${String(path2)}`);
        }
        if (expectedToken && expectedToken !== observation.observationToken) throw new LocalStaleObservationError(path2);
        const observedPath = observation.path;
        const token = observation.observationToken;
        const sizeBytes = observation.content?.sizeBytes;
        const content = this.contentSourceFactory?.create({
          path: observedPath,
          sizeBytes,
          maxChunkBytes: this.readChunkSizeBytes,
          assertUnchanged: () => this.assertToken(observedPath, token)
        }) ?? new ResourceFetchContentSource(this, observedPath, token, sizeBytes, this.fetchImpl, this.readChunkSizeBytes);
        return {
          content,
          evidence: observation.content ?? {},
          stability: "stable",
          observationToken: token
        };
      }
      async createFile(path2, content) {
        const target = await this.assertCompatible(path2);
        if (await this.adapter.exists(String(target), true)) throw new Error(`Cannot create existing local path: ${String(target)}`);
        const stage = await this.safePath(temporarySibling(String(target), "stage"), "mutation-target");
        try {
          await this.writeIncremental(stage, content);
          await this.adapter.rename(String(stage), String(target));
          await this.waitForPath(target);
          return this.receipt(target);
        } catch (error) {
          await this.removeIfExists(stage);
          throw error;
        }
      }
      async replaceFile(path2, content, expectedToken) {
        const target = await this.assertCompatible(path2);
        if (expectedToken) await this.assertToken(target, expectedToken);
        const stage = await this.safePath(temporarySibling(String(target), "stage"), "mutation-target");
        const backup = await this.safePath(temporarySibling(String(target), "backup"), "mutation-target");
        let backupCreated = false;
        try {
          await this.writeIncremental(stage, content);
          if (expectedToken) await this.assertToken(target, expectedToken);
          const exists = await this.adapter.exists(String(target), true);
          if (exists) {
            await this.adapter.rename(String(target), String(backup));
            backupCreated = true;
          }
          try {
            await this.adapter.rename(String(stage), String(target));
          } catch (error) {
            if (backupCreated) await this.adapter.rename(String(backup), String(target)).catch(() => void 0);
            throw error;
          }
          await this.waitForPath(target);
          if (backupCreated) await this.adapter.trashLocal(String(backup)).catch(() => void 0);
          return this.receipt(target);
        } catch (error) {
          await this.removeIfExists(stage);
          throw error;
        }
      }
      async createFolder(path2) {
        const target = await this.assertCompatible(path2);
        if (!await this.adapter.exists(String(target), true)) {
          if (this.adapterMutationFallback) await this.adapter.mkdir(String(target));
          else await this.app.vault.createFolder(String(target));
        }
        return this.receipt(target);
      }
      async move(fromPath, toPath) {
        const source = await this.safePath(fromPath, "mutation-source");
        const target = await this.assertCompatible(toPath);
        const file = this.app.vault.getAbstractFileByPath(String(source));
        if (file) await this.app.fileManager.renameFile(file, String(target));
        else if (this.adapterMutationFallback && await this.adapter.exists(String(source), true)) {
          await this.adapter.rename(String(source), String(target));
        } else throw new Error(`Cannot move missing local path: ${String(source)}`);
        return this.receipt(target);
      }
      async trash(path2) {
        const source = await this.safePath(path2, "mutation-source");
        const file = this.app.vault.getAbstractFileByPath(String(source));
        if (file) await this.app.fileManager.trashFile(file);
        else if (this.adapterMutationFallback && await this.adapter.exists(String(source), true)) {
          await this.adapter.trashLocal(String(source));
        } else throw new Error(`Cannot trash missing local path: ${String(source)}`);
      }
      async validatePath(path2) {
        const preliminary = validateCrossPlatformPath(path2);
        if (preliminary.status === "blocked") return preliminary;
        const listing = await this.enumerate();
        const existing = listing.entries.filter((entry2) => entry2.status === "present").map((entry2) => String(entry2.path));
        return validateCrossPlatformPath(path2, existing);
      }
      async classifyConfiguration(path2) {
        return this.configurationPolicy.classify(path2, await this.activeConfigurationDirectory());
      }
      onChange(listener) {
        this.changeListeners.add(listener);
        return () => this.changeListeners.delete(listener);
      }
      onLifecycle(listener) {
        this.lifecycleListeners.add(listener);
        if (this.vaultReady && !this.disposed) listener({ kind: "vault-ready" });
        return () => this.lifecycleListeners.delete(listener);
      }
      /** Phase 5/plugin lifecycle calls this; it is intentionally non-destructive. */
      dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.emitLifecycle({ kind: "unload" });
        for (const unsubscribe of this.eventUnsubscribers.splice(0)) unsubscribe();
        this.changeListeners.clear();
        this.lifecycleListeners.clear();
      }
      async assertToken(path2, expectedToken) {
        const observation = await this.observe(path2);
        if (observation.status !== "present" || observation.stability !== "stable" || observation.observationToken !== expectedToken) {
          throw new LocalStaleObservationError(path2);
        }
      }
      async writeIncremental(path2, content) {
        const target = await this.safePath(path2, "mutation-target");
        await this.adapter.writeBinary(String(target), new ArrayBuffer(0));
        try {
          for await (const chunk of content.openChunks()) {
            if (chunk.byteLength === 0) continue;
            await this.adapter.appendBinary(String(target), chunkArrayBuffer(chunk));
          }
        } catch (error) {
          await this.removeIfExists(target);
          throw error;
        }
      }
      async assertCompatible(path2) {
        const target = await this.safePath(path2, "mutation-target");
        const result = await this.validatePath(target);
        if (result.status === "blocked") throw new Error(`Blocked local path (${result.reason}): ${String(target)}${result.detail ? ` \u2014 ${result.detail}` : ""}`);
        return target;
      }
      async receipt(path2) {
        const observation = await this.observe(path2);
        return observation.status === "present" ? { path: path2, evidence: observation.content, observationToken: observation.observationToken } : { path: path2 };
      }
      async removeIfExists(path2) {
        try {
          const target = await this.safePath(path2, "mutation-target");
          if (await this.adapter.exists(String(target), true)) await this.adapter.remove(String(target));
        } catch {
        }
      }
      async waitForPath(path2) {
        const target = await this.safePath(path2, "observe");
        for (let attempt = 0; attempt < 10; attempt += 1) {
          if (this.app.vault.getAbstractFileByPath(String(target)) || await this.adapter.exists(String(target), true)) return;
          await sleep(25);
        }
        throw new Error(`Local mutation completed but path was not observable: ${String(target)}`);
      }
      async safePath(path2, access) {
        const validation = validateCrossPlatformPath(path2);
        if (validation.status === "blocked") {
          throw new Error(`Vault access boundary blocked ${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}`);
        }
        const normalized = asPath(String(path2));
        await this.accessBoundary.assertSafe(normalized, access);
        return normalized;
      }
      generationFor(path2) {
        return this.generations.get(String(path2)) ?? 0;
      }
      bump(path2) {
        const normalized = normalizeVaultPath(path2);
        this.generations.set(normalized, (this.generations.get(normalized) ?? 0) + 1);
      }
      installVaultEvents() {
        const register = (ref) => {
          this.eventUnsubscribers.push(() => this.app.vault.offref(ref));
        };
        register(this.app.vault.on("create", (file) => {
          this.bump(file.path);
          this.emitChange({ kind: "created", path: asPath(file.path) });
        }));
        register(this.app.vault.on("modify", (file) => {
          this.bump(file.path);
          this.emitChange({ kind: "modified", path: asPath(file.path) });
        }));
        register(this.app.vault.on("delete", (file) => {
          this.bump(file.path);
          this.emitChange({ kind: "deleted", path: asPath(file.path) });
        }));
        register(this.app.vault.on("rename", (file, oldPath) => {
          this.bump(oldPath);
          this.bump(file.path);
          this.emitChange({ kind: "renamed", fromPath: asPath(oldPath), toPath: asPath(file.path) });
        }));
      }
      installLifecycleEvents() {
        this.app.workspace.onLayoutReady(() => {
          this.vaultReady = true;
          this.emitLifecycle({ kind: "vault-ready" });
        });
        if (typeof document === "undefined") return;
        const visibility = () => this.emitLifecycle({ kind: document.visibilityState === "hidden" ? "suspend" : "resume" });
        const suspend = () => this.emitLifecycle({ kind: "suspend" });
        const resume = () => this.emitLifecycle({ kind: "resume" });
        document.addEventListener("visibilitychange", visibility);
        globalThis.addEventListener?.("pagehide", suspend);
        globalThis.addEventListener?.("pageshow", resume);
        this.eventUnsubscribers.push(() => document.removeEventListener("visibilitychange", visibility));
        this.eventUnsubscribers.push(() => globalThis.removeEventListener?.("pagehide", suspend));
        this.eventUnsubscribers.push(() => globalThis.removeEventListener?.("pageshow", resume));
      }
      emitChange(change) {
        if (!this.vaultReady || this.disposed) return;
        for (const listener of this.changeListeners) listener(change);
      }
      emitLifecycle(event) {
        if (this.disposed && event.kind !== "unload") return;
        for (const listener of this.lifecycleListeners) listener(event);
      }
    };
  }
});

// src/local/desktop-external-reference-guard.ts
function isWithin(basePath, candidatePath) {
  const rel = (0, import_node_path.relative)(basePath, candidatePath);
  return rel === "" || !rel.startsWith(`..${import_node_path.sep}`) && rel !== ".." && !(0, import_node_path.isAbsolute)(rel);
}
var import_promises, import_node_path, defaultOps, ExternalFilesystemReferenceError, DesktopExternalReferenceGuard;
var init_desktop_external_reference_guard = __esm({
  "src/local/desktop-external-reference-guard.ts"() {
    "use strict";
    import_promises = require("node:fs/promises");
    import_node_path = require("node:path");
    defaultOps = { lstat: import_promises.lstat, realpath: import_promises.realpath };
    ExternalFilesystemReferenceError = class extends Error {
      constructor(vaultPath, message) {
        super(message);
        this.vaultPath = vaultPath;
        this.name = "ExternalFilesystemReferenceError";
      }
      vaultPath;
    };
    DesktopExternalReferenceGuard = class {
      constructor(basePath, ops = defaultOps) {
        this.basePath = basePath;
        this.ops = ops;
      }
      basePath;
      ops;
      kind = "desktop-physical";
      canonicalBase;
      async assertSafe(path2, access) {
        await this.resolveSafePath(path2, access);
      }
      /**
       * Returns the same lexically-contained path whose components were checked by
       * this guard, so desktop readers do not introduce a second unchecked resolver.
       */
      async resolveSafePath(path2, _access) {
        const canonicalBase = await (this.canonicalBase ??= this.ops.realpath(this.basePath));
        const lexicalTarget = (0, import_node_path.resolve)(this.basePath, String(path2));
        if (!isWithin((0, import_node_path.resolve)(this.basePath), lexicalTarget)) {
          throw new ExternalFilesystemReferenceError(path2, `External reference blocked outside vault: ${String(path2)}`);
        }
        const relativeParts = String(path2).split("/").filter(Boolean);
        let current = (0, import_node_path.resolve)(this.basePath);
        for (let index = 0; index < relativeParts.length; index += 1) {
          current = (0, import_node_path.resolve)(current, relativeParts[index]);
          let status;
          try {
            status = await this.ops.lstat(current);
          } catch (error) {
            const code = error?.code;
            if (code === "ENOENT" || code === "ENOTDIR") {
              return lexicalTarget;
            }
            throw error;
          }
          if (status.isSymbolicLink()) {
            throw new ExternalFilesystemReferenceError(
              path2,
              `External reference blocked at symbolic-link/junction component: ${relativeParts.slice(0, index + 1).join("/")}`
            );
          }
          const canonicalCurrent = await this.ops.realpath(current);
          if (!isWithin(canonicalBase, canonicalCurrent)) {
            throw new ExternalFilesystemReferenceError(
              path2,
              `External reference resolved outside vault at: ${relativeParts.slice(0, index + 1).join("/")}`
            );
          }
        }
        return lexicalTarget;
      }
    };
  }
});

// src/local/desktop-local-vault.ts
var desktop_local_vault_exports = {};
__export(desktop_local_vault_exports, {
  DesktopBoundedContentSourceFactory: () => DesktopBoundedContentSourceFactory,
  createDesktopLocalVaultAdapter: () => createDesktopLocalVaultAdapter
});
function isDesktopDataAdapter(adapter) {
  return typeof adapter.getBasePath === "function";
}
function sameOpenFile(left, right) {
  return left.isFile() === right.isFile() && left.size === right.size && left.mtimeMs === right.mtimeMs && left.ctimeMs === right.ctimeMs && left.dev === right.dev && left.ino === right.ino;
}
function createDesktopLocalVaultAdapter(app, options = {}) {
  const adapter = app.vault.adapter;
  if (!isDesktopDataAdapter(adapter)) {
    throw new LocalPlatformCapabilityError(
      "desktop-filesystem-boundary",
      "Desktop local-vault construction requires Obsidian FileSystemAdapter.getBasePath()."
    );
  }
  const guard = new DesktopExternalReferenceGuard(adapter.getBasePath());
  return new ObsidianLocalVaultAdapter(app, {
    ...options,
    accessBoundary: guard,
    contentSourceFactory: new DesktopBoundedContentSourceFactory(guard)
  });
}
var import_promises2, defaultReadOps, DesktopBoundedContentSource, DesktopBoundedContentSourceFactory;
var init_desktop_local_vault = __esm({
  "src/local/desktop-local-vault.ts"() {
    "use strict";
    import_promises2 = require("node:fs/promises");
    init_desktop_external_reference_guard();
    init_obsidian_local_vault();
    defaultReadOps = {
      async open(path2) {
        return (0, import_promises2.open)(path2, "r");
      }
    };
    DesktopBoundedContentSource = class {
      constructor(context, guard, ops) {
        this.context = context;
        this.guard = guard;
        this.ops = ops;
        this.sizeBytes = context.sizeBytes;
      }
      context;
      guard;
      ops;
      sizeBytes;
      async *openChunks() {
        const { path: path2, maxChunkBytes } = this.context;
        if (this.sizeBytes === void 0 || !Number.isSafeInteger(this.sizeBytes) || this.sizeBytes < 0) {
          throw new LocalPlatformCapabilityError(
            "bounded-local-read",
            `Cannot perform a bounded desktop read without a trustworthy byte size: ${String(path2)}`
          );
        }
        await this.context.assertUnchanged();
        const physicalPath = await this.guard.resolveSafePath(path2, "observe");
        const handle = await this.ops.open(physicalPath);
        let primaryFailure;
        try {
          await this.guard.resolveSafePath(path2, "observe");
          const initial = await handle.stat();
          if (!initial.isFile()) {
            throw new LocalPlatformCapabilityError(
              "bounded-local-read",
              `Desktop bounded reader opened a non-file path: ${String(path2)}`
            );
          }
          if (initial.size !== this.sizeBytes) throw new LocalStaleObservationError(path2);
          let position = 0;
          while (position < this.sizeBytes) {
            await this.context.assertUnchanged();
            const requestedLength = Math.min(maxChunkBytes, this.sizeBytes - position);
            const chunk = new Uint8Array(requestedLength);
            let filled = 0;
            while (filled < requestedLength) {
              const result = await handle.read(chunk, filled, requestedLength - filled, position + filled);
              if (!Number.isSafeInteger(result.bytesRead) || result.bytesRead <= 0 || result.bytesRead > requestedLength - filled) {
                throw new LocalPlatformCapabilityError(
                  "bounded-local-read",
                  `Desktop file ended prematurely or returned an invalid read length at byte ${position + filled}: ${String(path2)}`
                );
              }
              filled += result.bytesRead;
            }
            position += filled;
            yield chunk;
          }
          const final = await handle.stat();
          if (!sameOpenFile(initial, final) || final.size !== this.sizeBytes) throw new LocalStaleObservationError(path2);
          await this.context.assertUnchanged();
          await this.guard.resolveSafePath(path2, "observe");
        } catch (error) {
          primaryFailure = error;
          throw error;
        } finally {
          try {
            await handle.close();
          } catch (closeError) {
            if (primaryFailure === void 0) throw closeError;
          }
        }
      }
    };
    DesktopBoundedContentSourceFactory = class {
      constructor(guard, ops = defaultReadOps) {
        this.guard = guard;
        this.ops = ops;
      }
      guard;
      ops;
      create(context) {
        return new DesktopBoundedContentSource(context, this.guard, this.ops);
      }
    };
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => BrainGoogleDriveSyncPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/contracts/google-drive.ts
var REQUIRED_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
function operationalFailureFromDriveSignalV1_3(signal) {
  switch (signal.kind) {
    case "authentication-required":
      return { kind: "authentication-required", source: "google-drive", ...signal.detail === void 0 ? {} : { detail: signal.detail } };
    case "transient-failure":
      return { kind: "transient-failure", source: "google-drive", ...signal.detail === void 0 ? {} : { detail: signal.detail } };
    case "rate-limited":
      return { kind: "rate-limited", source: "google-drive", ...signal.retryAfterMs === void 0 ? {} : { retryAfterMs: signal.retryAfterMs } };
    case "permission-denied":
      return { kind: "permission-denied", source: "google-drive", ...signal.detail === void 0 ? {} : { detail: signal.detail } };
    case "quota-exhausted":
      return { kind: "quota-exhausted", source: "google-drive", ...signal.detail === void 0 ? {} : { detail: signal.detail } };
    case "recovery-required":
      return { kind: "recovery-required", source: "google-drive", detail: signal.detail };
    case "not-found":
    case "conflict":
      return void 0;
  }
}

// src/drive/auth.ts
var GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
var GOOGLE_OAUTH_CLIENT_SECRET_ID = "brain-google-client-secret";
var DEFAULT_TRANSACTION_TTL_MS = 10 * 60 * 1e3;
var ObsidianSecretStore = class {
  constructor(storage) {
    this.storage = storage;
  }
  storage;
  get(id) {
    return this.storage.getSecret(id) ?? void 0;
  }
  set(id, value2) {
    this.storage.setSecret(id, value2);
  }
  delete(id) {
    if (this.storage.deleteSecret) this.storage.deleteSecret(id);
    else this.storage.setSecret(id, "");
  }
};
var ERROR_DESCRIPTION_MAX_LENGTH = 240;
var OAUTH_ERROR_IDENTIFIER = /^[A-Za-z0-9._-]{1,80}$/;
var SECRET_KEY_VALUE = /\b(access[_-]?token|refresh[_-]?token|code[_-]?verifier|client[_-]?secret|authorization[_-]?code|password|passcode|token|code)\s*([:=])\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
var URL_WITH_QUERY = /https?:\/\/[^\s<>"']*\?[^\s<>"']*/gi;
function escapeRegExp(value2) {
  return value2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function safeOAuthErrorIdentifier(value2) {
  return typeof value2 === "string" && OAUTH_ERROR_IDENTIFIER.test(value2) ? value2 : void 0;
}
function sanitizeOAuthErrorDescription(value2, sensitiveValues = []) {
  if (typeof value2 !== "string") return void 0;
  let sanitized = value2.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(URL_WITH_QUERY, "[redacted-url]").replace(SECRET_KEY_VALUE, (_match, key, separator) => `${key}${separator}[redacted]`);
  for (const sensitive of sensitiveValues) {
    if (sensitive && sensitive.length >= 4) sanitized = sanitized.replace(new RegExp(escapeRegExp(sensitive), "g"), "[redacted]");
  }
  sanitized = sanitized.replace(/\s+/g, " ").trim();
  if (!sanitized) return void 0;
  return sanitized.length <= ERROR_DESCRIPTION_MAX_LENGTH ? sanitized : `${sanitized.slice(0, ERROR_DESCRIPTION_MAX_LENGTH - 1)}\u2026`;
}
function tokenResponse(value2) {
  if (!value2 || typeof value2 !== "object" || Array.isArray(value2)) return void 0;
  const record = value2;
  return {
    access_token: typeof record.access_token === "string" ? record.access_token : void 0,
    refresh_token: typeof record.refresh_token === "string" ? record.refresh_token : void 0,
    expires_in: typeof record.expires_in === "number" && Number.isFinite(record.expires_in) ? record.expires_in : void 0,
    token_type: typeof record.token_type === "string" ? record.token_type : void 0,
    scope: typeof record.scope === "string" ? record.scope : void 0,
    error: typeof record.error === "string" ? record.error : void 0,
    error_description: typeof record.error_description === "string" ? record.error_description : void 0
  };
}
function formatOAuthDiagnosticSuffix(completion) {
  const diagnostic = completion.diagnostic;
  if (!diagnostic) return completion.detail ? `; detail=${completion.detail}` : "";
  const fields = [`phase=${diagnostic.phase}`, `classification=${diagnostic.classification}`];
  if (diagnostic.httpStatus !== void 0) fields.push(`http-status=${diagnostic.httpStatus}`);
  if (diagnostic.oauthError) fields.push(`oauth-error=${diagnostic.oauthError}`);
  if (diagnostic.errorDescription) fields.push(`description=${diagnostic.errorDescription}`);
  return `; ${fields.join("; ")}`;
}
function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomBytes(size) {
  const value2 = new Uint8Array(size);
  crypto.getRandomValues(value2);
  return value2;
}
async function sha256(value2) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value2)));
}
function encodeTokens(tokens) {
  return JSON.stringify(tokens);
}
function decodeTokens(raw) {
  if (!raw) return void 0;
  try {
    const value2 = JSON.parse(raw);
    if (typeof value2.accessToken !== "string" || typeof value2.expiresAtMs !== "number" || typeof value2.tokenType !== "string" || typeof value2.scope !== "string") return void 0;
    return value2;
  } catch {
    return void 0;
  }
}
function hasExactRequiredDriveScope(scope) {
  const granted = scope.trim().split(/\s+/).filter(Boolean);
  return granted.length === 1 && granted[0] === REQUIRED_DRIVE_SCOPE;
}
var GoogleOAuthSession = class _GoogleOAuthSession {
  constructor(config, secrets, fetcher = fetch, now = () => Date.now()) {
    this.config = config;
    this.secrets = secrets;
    this.fetcher = fetcher;
    this.now = now;
  }
  config;
  secrets;
  fetcher;
  now;
  static TOKEN_SECRET_ID = "brain-gdrive-oauth-tokens";
  transaction;
  diagnostics;
  setDiagnosticLogger(logger) {
    this.diagnostics = logger;
  }
  async beginAuthorization(ttlMs = DEFAULT_TRANSACTION_TTL_MS) {
    const diagnostics = this.diagnostics;
    diagnostics?.debug("oauth.transaction", "transaction-preparation-started", {
      operation: "begin-authorization",
      clientIdConfigured: Boolean(this.config.clientId),
      redirectUriConfigured: Boolean(this.config.redirectUri),
      scopeExact: true,
      transactionPrepared: false
    });
    diagnostics?.trace("oauth.transaction", "begin-authorization-enter", { stage: "transaction-preparation" });
    try {
      diagnostics?.trace("oauth.transaction", "pkce-state-generation-start", { stage: "state-generation" });
      const state = base64Url(randomBytes(32));
      diagnostics?.trace("oauth.transaction", "pkce-state-generation-complete", { stage: "state-generation" });
      diagnostics?.trace("oauth.transaction", "pkce-verifier-generation-start", { stage: "verifier-generation" });
      const verifier = base64Url(randomBytes(64));
      diagnostics?.trace("oauth.transaction", "pkce-verifier-generation-complete", { stage: "verifier-generation" });
      diagnostics?.trace("oauth.transaction", "pkce-sha256-start", { stage: "challenge-generation" });
      const challenge = base64Url(await sha256(verifier));
      diagnostics?.trace("oauth.transaction", "pkce-sha256-complete", { stage: "challenge-generation" });
      const expiresAtMs = this.now() + ttlMs;
      this.transaction = { state, verifier, expiresAtMs };
      diagnostics?.trace("oauth.transaction", "authorization-request-construction-start", { stage: "request-construction" });
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
      diagnostics?.trace("oauth.transaction", "authorization-request-constructed", { stage: "request-construction", transactionPrepared: true });
      diagnostics?.debug("oauth.transaction", "transaction-preparation-completed", {
        operation: "begin-authorization",
        clientIdConfigured: true,
        redirectUriConfigured: true,
        scopeExact: true,
        transactionPrepared: true,
        result: "prepared"
      });
      diagnostics?.trace("oauth.transaction", "begin-authorization-exit", { stage: "transaction-preparation", result: "prepared" });
      return { url: url.toString(), state, expiresAtMs };
    } catch (error) {
      diagnostics?.failure("oauth.transaction", "transaction-preparation-failed", error, {
        operation: "begin-authorization",
        stage: "transaction-preparation",
        classification: "oauth-transaction-preparation-failure",
        retryable: true,
        recoveryIntended: false,
        transactionPrepared: false
      });
      throw error;
    }
  }
  async completeAuthorization(input) {
    const tx = this.transaction;
    this.transaction = void 0;
    if (!tx) return { ok: false, reason: "missing-transaction" };
    if (this.now() > tx.expiresAtMs) return { ok: false, reason: "expired-transaction" };
    if (!input.state || input.state !== tx.state) return { ok: false, reason: "state-mismatch" };
    if (input.error || !input.code) return { ok: false, reason: "authorization-denied", detail: safeOAuthErrorIdentifier(input.error) ?? "authorization-denied" };
    const body = new URLSearchParams({ client_id: this.config.clientId, code: input.code, code_verifier: tx.verifier, redirect_uri: this.config.redirectUri, grant_type: "authorization_code" });
    const clientSecret = this.config.clientSecretStorageKey ? this.secrets.get(this.config.clientSecretStorageKey) : void 0;
    if (clientSecret) body.set("client_secret", clientSecret);
    let response;
    try {
      response = await this.fetcher(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    } catch {
      return {
        ok: false,
        reason: "token-exchange-failed",
        detail: "transport-or-service-failure",
        diagnostic: { phase: "token-exchange", classification: "transport-or-service-failure" }
      };
    }
    let parsed;
    try {
      parsed = tokenResponse(JSON.parse(await response.text()));
    } catch {
      parsed = void 0;
    }
    if (!parsed) {
      return {
        ok: false,
        reason: "token-exchange-failed",
        detail: "malformed-token-response",
        diagnostic: { phase: "token-exchange", classification: "malformed-response", httpStatus: response.status }
      };
    }
    if (!response.ok || !parsed.access_token || !parsed.expires_in) {
      const oauthError = safeOAuthErrorIdentifier(parsed.error);
      const errorDescription = sanitizeOAuthErrorDescription(parsed.error_description, [
        input.code,
        tx.verifier,
        clientSecret,
        parsed.access_token,
        parsed.refresh_token
      ]);
      return {
        ok: false,
        reason: "token-exchange-failed",
        detail: oauthError ?? (response.ok ? "invalid-token-response" : `http-${response.status}`),
        diagnostic: {
          phase: "token-exchange",
          classification: response.ok ? "invalid-token-response" : "http-error",
          httpStatus: response.status,
          ...oauthError ? { oauthError } : {},
          ...errorDescription ? { errorDescription } : {}
        }
      };
    }
    const previous = this.tokens();
    const previousRefreshToken = previous && hasExactRequiredDriveScope(previous.scope) ? previous.refreshToken : void 0;
    if (previous && !hasExactRequiredDriveScope(previous.scope)) {
      this.clearTokens();
    }
    const tokens = {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token ?? previousRefreshToken,
      expiresAtMs: this.now() + parsed.expires_in * 1e3,
      tokenType: parsed.token_type ?? "Bearer",
      scope: parsed.scope ?? REQUIRED_DRIVE_SCOPE
    };
    if (!hasExactRequiredDriveScope(tokens.scope)) {
      return {
        ok: false,
        reason: "token-exchange-failed",
        detail: "oauth-scope-grant-not-exact-drive-file",
        diagnostic: {
          phase: "token-exchange",
          classification: "scope-grant-not-exact-drive-file",
          httpStatus: response.status
        }
      };
    }
    this.secrets.set(_GoogleOAuthSession.TOKEN_SECRET_ID, encodeTokens(tokens));
    return { ok: true };
  }
  tokens() {
    return decodeTokens(this.secrets.get(_GoogleOAuthSession.TOKEN_SECRET_ID));
  }
  clearTokens() {
    this.secrets.delete(_GoogleOAuthSession.TOKEN_SECRET_ID);
  }
  async accessToken() {
    const current = this.tokens();
    if (!current) return void 0;
    if (!hasExactRequiredDriveScope(current.scope)) {
      this.clearTokens();
      return void 0;
    }
    if (current.expiresAtMs - this.now() > 6e4) return current.accessToken;
    if (!current.refreshToken) {
      this.clearTokens();
      return void 0;
    }
    const body = new URLSearchParams({ client_id: this.config.clientId, refresh_token: current.refreshToken, grant_type: "refresh_token" });
    const clientSecret = this.config.clientSecretStorageKey ? this.secrets.get(this.config.clientSecretStorageKey) : void 0;
    if (clientSecret) body.set("client_secret", clientSecret);
    try {
      const response = await this.fetcher(GOOGLE_TOKEN_ENDPOINT, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
      const parsed = await response.json();
      if (!response.ok || !parsed.access_token || !parsed.expires_in) {
        this.clearTokens();
        return void 0;
      }
      const refreshed = { accessToken: parsed.access_token, refreshToken: current.refreshToken, expiresAtMs: this.now() + parsed.expires_in * 1e3, tokenType: parsed.token_type ?? current.tokenType, scope: parsed.scope ?? current.scope };
      if (!hasExactRequiredDriveScope(refreshed.scope)) {
        this.clearTokens();
        return void 0;
      }
      this.secrets.set(_GoogleOAuthSession.TOKEN_SECRET_ID, encodeTokens(refreshed));
      return refreshed.accessToken;
    } catch {
      return void 0;
    }
  }
};

// src/drive/oauth-return.ts
var OBSIDIAN_OAUTH_ACTION = "brain-gdrive-oauth";
function registerGoogleOAuthReturn(registrar, completeAuthorization, onComplete) {
  registrar.registerObsidianProtocolHandler(OBSIDIAN_OAUTH_ACTION, async (params) => {
    const result = await completeAuthorization({ code: params.code, state: params.state, error: params.error });
    onComplete?.(result);
  });
}
function openAuthorizationInSystemBrowser(url, openWindow) {
  const launcher = openWindow ?? (typeof globalThis.open === "function" ? (value2, target, features) => {
    globalThis.open(value2, target, features);
  } : void 0);
  if (!launcher) throw new Error("The system browser could not be opened because no browser launch mechanism is available.");
  launcher(url, "_blank", "noopener,noreferrer");
}
function openAuthorizationInExternalBrowser(url, openWindow) {
  const launcher = openWindow ?? (typeof globalThis.open === "function" ? (value2, target) => {
    globalThis.open(value2, target);
  } : void 0);
  if (!launcher) throw new Error("The external browser could not be opened because no browser launch mechanism is available.");
  launcher(url, "_external");
}
async function beginGoogleAuthorization(oauth, browser) {
  const request = await oauth.beginAuthorization();
  await browser.openExternal(request.url);
  return { state: request.state, expiresAtMs: request.expiresAtMs };
}

// src/diagnostics/oauth-diagnostics.ts
function isPromiseLike(value2) {
  return Boolean(value2) && typeof value2.then === "function";
}
function instrumentAuthorizationBrowserLauncher(logger, browser, context) {
  const component = context.component ?? "oauth.browser";
  return {
    openExternal(url) {
      logger.info(component, "browser-launch-requested");
      logger.debug(component, "browser-launch-context", {
        target: context.target,
        launcher: context.launcher,
        browserApiPresent: context.browserApiPresent,
        runtimeInitialized: true
      });
      logger.trace(component, "browser-launch-invoke", { target: context.target, launcher: context.launcher });
      try {
        const result = browser.openExternal(url);
        if (isPromiseLike(result)) {
          return result.then(
            () => logger.trace(component, "browser-launch-return", { result: "javascript-call-returned" }),
            (error) => {
              logger.failure(component, "browser-launch-throw", error, {
                operation: "external-browser-launch",
                stage: "launcher-call",
                classification: "browser-launch-failure",
                retryable: true,
                recoveryIntended: false
              });
              throw error;
            }
          );
        }
        logger.trace(component, "browser-launch-return", { result: "javascript-call-returned" });
        return void 0;
      } catch (error) {
        logger.failure(component, "browser-launch-throw", error, {
          operation: "external-browser-launch",
          stage: "launcher-call",
          classification: "browser-launch-failure",
          retryable: true,
          recoveryIntended: false
        });
        throw error;
      }
    }
  };
}

// src/diagnostics/browser-probes.ts
var EXTERNAL_BROWSER_TEST_URL = "https://www.google.com/";
function probeLauncher(logger, openWindow) {
  const browserApiPresent = Boolean(openWindow) || typeof globalThis.open === "function";
  return instrumentAuthorizationBrowserLauncher(
    logger,
    { openExternal: (url) => openAuthorizationInExternalBrowser(url, openWindow) },
    { component: "diagnostics.browser-probe", target: "_external", launcher: "diagnostic-probe", browserApiPresent }
  );
}
function runDirectExternalBrowserProbe(logger, openWindow) {
  logger.info("diagnostics.browser-probe", "direct-probe-button-pressed", { source: "settings-button" });
  logger.trace("diagnostics.browser-probe", "direct-probe-enter", { asyncBoundary: false });
  probeLauncher(logger, openWindow).openExternal(EXTERNAL_BROWSER_TEST_URL);
  logger.trace("diagnostics.browser-probe", "direct-probe-exit", { result: "launcher-call-returned" });
}
async function runDelayedExternalBrowserProbe(logger, openWindow) {
  logger.info("diagnostics.browser-probe", "delayed-probe-button-pressed", { source: "settings-button" });
  logger.trace("diagnostics.browser-probe", "delayed-probe-async-boundary-enter", { asyncBoundary: true });
  await Promise.resolve();
  logger.trace("diagnostics.browser-probe", "delayed-probe-async-boundary-exit", { asyncBoundary: true });
  await probeLauncher(logger, openWindow).openExternal(EXTERNAL_BROWSER_TEST_URL);
  logger.trace("diagnostics.browser-probe", "delayed-probe-exit", { result: "launcher-call-returned" });
}

// src/diagnostics/diagnostic-logger.ts
var DIAGNOSTIC_LOG_LEVELS = ["off", "error", "warn", "info", "debug", "trace"];
var DEFAULT_DIAGNOSTIC_RETENTION = 2e3;
var MIN_DIAGNOSTIC_RETENTION = 100;
var MAX_DIAGNOSTIC_RETENTION = 5e3;
var LEVEL_RANK = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5
};
var ALLOWED_FIELD_KEYS = /* @__PURE__ */ new Set([
  "operation",
  "stage",
  "source",
  "target",
  "launcher",
  "method",
  "result",
  "reason",
  "classification",
  "errorName",
  "safeMessage",
  "retryable",
  "recoveryIntended",
  "runtimeInitialized",
  "clientIdConfigured",
  "redirectUriConfigured",
  "clientSecretConfigured",
  "callbackRegistrationActive",
  "browserApiPresent",
  "transactionPrepared",
  "scopeExact",
  "deviceIdentityPresent",
  "vaultIdentityPresent",
  "remoteRootPresent",
  "storeReady",
  "asyncBoundary",
  "codePresent",
  "statePresent",
  "errorPresent",
  "count",
  "retentionLimit",
  "enabled",
  "runMode",
  "trigger",
  "planDisposition",
  "stateStatus",
  "localCount",
  "remoteCount",
  "snapshotCount",
  "operationCount",
  "operationIndex",
  "operationKind",
  "direction",
  "preconditionCount",
  "failedPreconditionCount",
  "failedPreconditionKinds",
  "failedPreconditionSides",
  "conflictCount",
  "blockedCount",
  "attentionCount",
  "skippedCount",
  "safeCommittedCount",
  "attentionReasonCodes",
  "destructiveCount",
  "uploadCount",
  "downloadCount",
  "moveCount",
  "trashCount",
  "noopCount",
  "localCompleteness",
  "remoteCompleteness",
  "reviewed",
  "reconstruction",
  "cursorPresent"
]);
var URL_WITH_QUERY2 = /https?:\/\/[^\s<>"']*\?[^\s<>"']*/gi;
var SENSITIVE_ASSIGNMENT = /\b(access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|authorization[_ -]?code|oauth[_ -]?state|pkce[_ -]?(?:verifier|challenge)|code[_ -]?(?:verifier|challenge)|cookie|password|passcode)\s*([:=])\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi;
var OAUTH_QUERY_VALUE = /([?&](?:code|state|code_challenge|code_verifier|access_token|refresh_token)=)[^&#\s]+/gi;
var BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
var JWT_LIKE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
var MAX_TEXT_LENGTH = 320;
function sanitizeDiagnosticText(value2) {
  if (typeof value2 !== "string") return void 0;
  let sanitized = value2.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(URL_WITH_QUERY2, "[redacted-url]").replace(OAUTH_QUERY_VALUE, "$1[redacted]").replace(SENSITIVE_ASSIGNMENT, (_match, key, separator) => `${key}${separator}[redacted]`).replace(BEARER_TOKEN, "Bearer [redacted]").replace(JWT_LIKE, "[redacted-token]").replace(/\s+/g, " ").trim();
  if (!sanitized) return void 0;
  if (sanitized.length > MAX_TEXT_LENGTH) sanitized = `${sanitized.slice(0, MAX_TEXT_LENGTH - 1)}\u2026`;
  return sanitized;
}
function normalizeDiagnosticError(error, classification = "unexpected-failure") {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Non-Error failure";
  return {
    errorName: sanitizeDiagnosticText(name) ?? "Error",
    safeMessage: sanitizeDiagnosticText(message) ?? "Failure details were unavailable after sanitization.",
    classification: sanitizeDiagnosticText(classification) ?? "unexpected-failure"
  };
}
function normalizedRetention(value2) {
  if (!Number.isSafeInteger(value2)) return DEFAULT_DIAGNOSTIC_RETENTION;
  return Math.min(MAX_DIAGNOSTIC_RETENTION, Math.max(MIN_DIAGNOSTIC_RETENTION, value2));
}
function isDiagnosticLevel(value2) {
  return typeof value2 === "string" && DIAGNOSTIC_LOG_LEVELS.includes(value2);
}
function safeInteger(value2, fallback) {
  return Number.isSafeInteger(value2) && Number(value2) >= 1 ? Number(value2) : fallback;
}
function sanitizeFields(fields) {
  if (!fields) return void 0;
  const result = {};
  for (const [key, raw] of Object.entries(fields)) {
    if (!ALLOWED_FIELD_KEYS.has(key)) continue;
    if (typeof raw === "string") {
      const sanitized = sanitizeDiagnosticText(raw);
      if (sanitized !== void 0) result[key] = sanitized;
    } else if (typeof raw === "number" && Number.isFinite(raw)) result[key] = raw;
    else if (typeof raw === "boolean" || raw === null) result[key] = raw;
  }
  return Object.keys(result).length ? result : void 0;
}
function parsePersistedEvent(value2) {
  if (!value2 || typeof value2 !== "object" || Array.isArray(value2)) return void 0;
  const record = value2;
  if (typeof record.timestamp !== "string" || !Number.isSafeInteger(record.sequence) || Number(record.sequence) < 1) return void 0;
  if (!isDiagnosticLevel(record.level) || record.level === "off") return void 0;
  if (typeof record.component !== "string" || typeof record.event !== "string") return void 0;
  const platform = record.platform === "desktop" || record.platform === "mobile" ? record.platform : "unknown";
  const attemptId = Number.isSafeInteger(record.attemptId) && Number(record.attemptId) >= 1 ? Number(record.attemptId) : void 0;
  const runId = Number.isSafeInteger(record.runId) && Number(record.runId) >= 1 ? Number(record.runId) : void 0;
  const elapsedMs = typeof record.elapsedMs === "number" && Number.isFinite(record.elapsedMs) && record.elapsedMs >= 0 ? record.elapsedMs : void 0;
  return {
    timestamp: record.timestamp,
    sequence: Number(record.sequence),
    level: record.level,
    component: record.component,
    event: sanitizeDiagnosticText(record.event) ?? "invalid-event",
    ...attemptId !== void 0 ? { attemptId } : {},
    ...runId !== void 0 ? { runId } : {},
    platform,
    ...elapsedMs !== void 0 ? { elapsedMs } : {},
    ...record.fields && typeof record.fields === "object" && !Array.isArray(record.fields) ? { fields: sanitizeFields(record.fields) } : {}
  };
}
function sortedFields(fields) {
  if (!fields) return void 0;
  const ordered = {};
  for (const key of Object.keys(fields).sort()) ordered[key] = fields[key];
  return ordered;
}
function renderDiagnosticEvent(event) {
  return JSON.stringify({
    timestamp: event.timestamp,
    sequence: event.sequence,
    level: event.level,
    component: event.component,
    event: event.event,
    ...event.attemptId !== void 0 ? { attemptId: event.attemptId } : {},
    ...event.runId !== void 0 ? { runId: event.runId } : {},
    platform: event.platform,
    ...event.elapsedMs !== void 0 ? { elapsedMs: event.elapsedMs } : {},
    ...event.fields ? { fields: sortedFields(event.fields) } : {}
  });
}
var DiagnosticLogger = class {
  constructor(options) {
    this.options = options;
    this.level = options.level;
    this.retentionLimit = normalizedRetention(options.retentionLimit);
    this.consoleMirror = options.consoleMirror;
  }
  options;
  records = [];
  nextSequence = 1;
  nextAttemptId = 1;
  nextRunId = 1;
  activeAttemptId;
  attemptStarted = /* @__PURE__ */ new Map();
  runStarted = /* @__PURE__ */ new Map();
  level;
  retentionLimit;
  consoleMirror;
  persistChain = Promise.resolve();
  async initialize() {
    const raw = await this.options.persistence.loadDiagnostics();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
    const state = raw;
    const parsed = Array.isArray(state.records) ? state.records.map(parsePersistedEvent).filter((event) => Boolean(event)) : [];
    parsed.sort((a, b) => a.sequence - b.sequence);
    this.records = parsed.slice(-this.retentionLimit);
    const highestSequence = this.records.reduce((max, event) => Math.max(max, event.sequence), 0);
    this.nextSequence = Math.max(safeInteger(state.nextSequence, highestSequence + 1), highestSequence + 1);
    this.nextAttemptId = safeInteger(state.nextAttemptId, 1);
    this.nextRunId = safeInteger(state.nextRunId, 1);
  }
  configure(input) {
    this.level = input.level;
    this.retentionLimit = normalizedRetention(input.retentionLimit);
    this.consoleMirror = input.consoleMirror;
    if (this.records.length > this.retentionLimit) this.records = this.records.slice(-this.retentionLimit);
    this.queuePersist();
  }
  beginAttempt(source = "user") {
    const attemptId = this.nextAttemptId++;
    this.activeAttemptId = attemptId;
    this.attemptStarted.set(attemptId, this.monotonicNow());
    this.queuePersist();
    this.info("oauth.settings", "authentication-attempt-started", { source }, attemptId);
    return attemptId;
  }
  activateAttempt(attemptId) {
    if (!Number.isSafeInteger(attemptId) || attemptId < 1) return;
    this.activeAttemptId = attemptId;
    if (!this.attemptStarted.has(attemptId)) this.attemptStarted.set(attemptId, this.monotonicNow());
  }
  currentAttemptId() {
    return this.activeAttemptId;
  }
  endAttempt(attemptId = this.activeAttemptId) {
    if (attemptId === void 0) return;
    this.attemptStarted.delete(attemptId);
    if (this.activeAttemptId === attemptId) this.activeAttemptId = void 0;
  }
  beginSyncRun(source = "manual-sync") {
    const runId = this.nextRunId++;
    this.runStarted.set(runId, this.monotonicNow());
    this.queuePersist();
    this.syncInfo("sync.controller", "synchronization-run-started", runId, { source });
    return runId;
  }
  endSyncRun(runId) {
    this.runStarted.delete(runId);
  }
  syncError(component, event, runId, fields) {
    this.record("error", component, event, fields, void 0, runId);
  }
  syncWarn(component, event, runId, fields) {
    this.record("warn", component, event, fields, void 0, runId);
  }
  syncInfo(component, event, runId, fields) {
    this.record("info", component, event, fields, void 0, runId);
  }
  syncDebug(component, event, runId, fields) {
    this.record("debug", component, event, fields, void 0, runId);
  }
  syncTrace(component, event, runId, fields) {
    this.record("trace", component, event, fields, void 0, runId);
  }
  syncFailure(component, event, runId, error, context = {}) {
    const classification = typeof context.classification === "string" ? context.classification : "synchronization-failure";
    this.syncError(component, event, runId, {
      ...context,
      classification,
      errorName: error instanceof Error ? "Error" : "NonErrorFailure",
      safeMessage: "Synchronization failure details suppressed."
    });
  }
  error(component, event, fields, attemptId = this.activeAttemptId) {
    this.record("error", component, event, fields, attemptId);
  }
  warn(component, event, fields, attemptId = this.activeAttemptId) {
    this.record("warn", component, event, fields, attemptId);
  }
  info(component, event, fields, attemptId = this.activeAttemptId) {
    this.record("info", component, event, fields, attemptId);
  }
  debug(component, event, fields, attemptId = this.activeAttemptId) {
    this.record("debug", component, event, fields, attemptId);
  }
  trace(component, event, fields, attemptId = this.activeAttemptId) {
    this.record("trace", component, event, fields, attemptId);
  }
  failure(component, event, error, context = {}, attemptId = this.activeAttemptId) {
    this.error(component, event, { ...context, ...normalizeDiagnosticError(error, typeof context.classification === "string" ? context.classification : void 0) }, attemptId);
  }
  clear() {
    this.records = [];
    this.queuePersist();
  }
  summary() {
    const oldest = this.records[0];
    const newest = this.records[this.records.length - 1];
    return {
      count: this.records.length,
      ...oldest ? { oldest: { sequence: oldest.sequence, timestamp: oldest.timestamp } } : {},
      ...newest ? { newest: { sequence: newest.sequence, timestamp: newest.timestamp } } : {}
    };
  }
  snapshot() {
    return this.records.map((event) => ({ ...event, ...event.fields ? { fields: { ...event.fields } } : {} }));
  }
  renderText() {
    return this.records.map(renderDiagnosticEvent).join("\n");
  }
  async flush() {
    await this.persistChain;
  }
  record(level, component, event, fields, attemptId, runId) {
    if (this.level === "off" || LEVEL_RANK[level] > LEVEL_RANK[this.level]) return;
    const sanitizedEvent = sanitizeDiagnosticText(event) ?? "invalid-event";
    const safeFields = sanitizeFields(fields);
    const elapsedMs = attemptId !== void 0 ? this.elapsedMs(attemptId) : runId !== void 0 ? this.runElapsedMs(runId) : void 0;
    const retained = {
      timestamp: this.now().toISOString(),
      sequence: this.nextSequence++,
      level,
      component,
      event: sanitizedEvent,
      ...attemptId !== void 0 ? { attemptId } : {},
      ...runId !== void 0 ? { runId } : {},
      platform: this.options.platform,
      ...elapsedMs !== void 0 ? { elapsedMs } : {},
      ...safeFields ? { fields: safeFields } : {}
    };
    this.records.push(retained);
    if (this.records.length > this.retentionLimit) this.records.splice(0, this.records.length - this.retentionLimit);
    const rendered = renderDiagnosticEvent(retained);
    if (this.consoleMirror) (this.options.consoleSink ?? ((line) => console.log(line)))(rendered);
    this.queuePersist();
  }
  elapsedMs(attemptId) {
    const started = this.attemptStarted.get(attemptId);
    if (started === void 0) return void 0;
    return Math.max(0, Math.round((this.monotonicNow() - started) * 1e3) / 1e3);
  }
  runElapsedMs(runId) {
    const started = this.runStarted.get(runId);
    if (started === void 0) return void 0;
    return Math.max(0, Math.round((this.monotonicNow() - started) * 1e3) / 1e3);
  }
  now() {
    return this.options.now?.() ?? /* @__PURE__ */ new Date();
  }
  monotonicNow() {
    return this.options.monotonicNow?.() ?? globalThis.performance?.now?.() ?? Date.now();
  }
  queuePersist() {
    const state = {
      records: this.snapshot(),
      nextSequence: this.nextSequence,
      nextAttemptId: this.nextAttemptId,
      nextRunId: this.nextRunId
    };
    this.persistChain = this.persistChain.then(() => this.options.persistence.saveDiagnostics(state)).catch(() => void 0);
  }
};

// src/diagnostics/share-export.ts
var DIAGNOSTIC_LOG_FILENAME = "brain-sync-diagnostic-log.txt";
function createDiagnosticLogFile(text) {
  return new File([text], DIAGNOSTIC_LOG_FILENAME, { type: "text/plain" });
}
function canShareDiagnosticLogFile(navigatorLike = globalThis.navigator) {
  if (!navigatorLike?.share) return false;
  if (!navigatorLike.canShare) return true;
  try {
    return navigatorLike.canShare({ files: [createDiagnosticLogFile("")] });
  } catch {
    return false;
  }
}
function copyDiagnosticLogText(text, navigatorLike = globalThis.navigator) {
  const clipboard = navigatorLike?.clipboard;
  if (!clipboard?.writeText) {
    return Promise.reject(new Error("clipboard API is unavailable on this device"));
  }
  return clipboard.writeText(text);
}
function shareDiagnosticLogText(text, navigatorLike = globalThis.navigator) {
  if (!navigatorLike?.share) {
    return Promise.reject(new Error("file sharing is unavailable on this device"));
  }
  const file = createDiagnosticLogFile(text);
  if (navigatorLike.canShare && !navigatorLike.canShare({ files: [file] })) {
    return Promise.reject(new Error("this device cannot share the diagnostic text file"));
  }
  return navigatorLike.share({ files: [file] });
}

// src/diagnostics/sync-diagnostics.ts
function beginManualSyncDiagnostics(diagnostics, source = "sync-now-command") {
  const runId = diagnostics?.beginSyncRun(source);
  if (diagnostics && runId !== void 0) diagnostics.syncInfo("sync.controller", "sync-now-click-handler-enter", runId, { stage: "command-click", operation: "sync-now" });
  return runId;
}
function presentManualSyncPreview(present, presented, failed) {
  try {
    present();
    presented();
  } catch (error) {
    failed(error);
    throw error;
  }
}

// src/product/plan-modal.ts
var import_obsidian = require("obsidian");
var PlanPreviewModal = class extends import_obsidian.Modal {
  constructor(app, plan, controller, diagnosticRunId) {
    super(app);
    this.plan = plan;
    this.controller = controller;
    this.diagnosticRunId = diagnosticRunId;
  }
  plan;
  controller;
  diagnosticRunId;
  executionPending = false;
  executionAccepted = false;
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "BRAIN synchronization preview" });
    contentEl.createEl("p", { text: `${this.plan.operations.length} planned operation(s). Disposition: ${this.plan.executionDisposition}.` });
    const counts = /* @__PURE__ */ new Map();
    for (const operation of this.plan.operations) counts.set(operation.kind, (counts.get(operation.kind) ?? 0) + 1);
    const summary = contentEl.createEl("ul");
    for (const [kind, count] of [...counts.entries()].sort()) summary.createEl("li", { text: `${kind}: ${count}` });
    const details = contentEl.createEl("details");
    details.createEl("summary", { text: "Affected paths and reasons" });
    const list = details.createEl("ul");
    for (const operation of this.plan.operations) {
      list.createEl("li", { text: `${operation.kind} \u2014 ${String(operation.path)} \u2014 ${operation.reasons.map((reason) => reason.summary).join("; ")}` });
    }
    if (this.plan.executionDisposition === "blocked") {
      contentEl.createEl("p", { text: "This plan is blocked and cannot execute." });
      return;
    }
    const checkpoint = this.controller.pendingDestructiveCheckpoint();
    new import_obsidian.Setting(contentEl).addButton((button) => button.setButtonText(this.plan.recoveryCheckpointRequired ? "Approve checkpoint and execute" : "Execute").setCta().onClick(async () => {
      this.controller.recordExecuteClick(this.plan.planId, this.diagnosticRunId);
      this.executionPending = true;
      const result = this.plan.recoveryCheckpointRequired && checkpoint ? await this.controller.requestPreviewAction({ kind: "approve-destructive-plan", planId: this.plan.planId, recoveryCheckpointId: checkpoint }, this.diagnosticRunId) : await this.controller.requestPreviewAction({ kind: "execute-plan", planId: this.plan.planId }, this.diagnosticRunId);
      this.executionPending = false;
      if (result.status === "accepted") {
        this.executionAccepted = true;
        this.close();
      } else contentEl.createEl("p", { text: result.reason });
    }));
  }
  onClose() {
    if (!this.executionPending && !this.executionAccepted) this.controller.recordPreviewDismissed(this.plan.planId, this.diagnosticRunId);
    this.contentEl.empty();
  }
};

// src/product/history-modal.ts
var import_obsidian2 = require("obsidian");

// src/contracts/index.ts
init_common();

// src/contracts/execution.ts
function executionDispositionV1_3(result) {
  switch (result.status) {
    case "durable-verified-success":
      return { primary: "success", physicalReconciliationRequired: false, physicalRedispatchSafe: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "stale-precondition":
      return { primary: "stale-precondition", physicalReconciliationRequired: false, physicalRedispatchSafe: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "cancelled":
      return { primary: "cancelled", physicalReconciliationRequired: false, physicalRedispatchSafe: false, retryMode: "none", mutationRedispatchAuthorized: false };
    case "blocking-failure":
      return { primary: "blocking-failure", physicalReconciliationRequired: false, physicalRedispatchSafe: true, retryMode: "none", mutationRedispatchAuthorized: false };
    case "authentication-required":
      return { primary: "authentication-required", physicalReconciliationRequired: false, physicalRedispatchSafe: true, retryMode: "reauthenticate-then-retry", mutationRedispatchAuthorized: false };
    case "retryable-failure": {
      const retryAfterMs2 = result.operationalFailure.kind === "rate-limited" ? result.operationalFailure.retryAfterMs : void 0;
      return {
        primary: "deferred",
        physicalReconciliationRequired: false,
        physicalRedispatchSafe: true,
        retryMode: "ordinary-retry",
        ...retryAfterMs2 === void 0 ? {} : { retryAfterMs: retryAfterMs2 },
        mutationRedispatchAuthorized: false
      };
    }
    case "recovery-required":
      return { primary: "recovery-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
    case "uncertain": {
      const provenance2 = result.operationalFailure;
      if (!provenance2) {
        return { primary: "recovery-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
      }
      switch (provenance2.kind) {
        case "authentication-required":
          return { primary: "authentication-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reauthenticate-then-reconcile", mutationRedispatchAuthorized: false };
        case "transient-failure":
          return { primary: "deferred", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
        case "rate-limited":
          return {
            primary: "deferred",
            physicalReconciliationRequired: true,
            physicalRedispatchSafe: false,
            retryMode: "reconcile-before-redispatch",
            ...provenance2.retryAfterMs === void 0 ? {} : { retryAfterMs: provenance2.retryAfterMs },
            mutationRedispatchAuthorized: false
          };
        case "permission-denied":
        case "quota-exhausted":
          return { primary: "blocking-failure", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
        case "recovery-required":
        case "unclassified":
          return { primary: "recovery-required", physicalReconciliationRequired: true, physicalRedispatchSafe: false, retryMode: "reconcile-before-redispatch", mutationRedispatchAuthorized: false };
      }
    }
  }
}

// src/contracts/synchronization-foundation.ts
function exactBaseAuthorityMatches(expected, actual) {
  return expected.generation === actual.generation && expected.path === actual.path && expected.fingerprint === actual.fingerprint;
}
function classifyRemoteChangePage(values) {
  if (values.nextPageToken && values.newStartPageToken) return { status: "invalid", reason: "both-page-tokens-present" };
  if (values.nextPageToken) return { status: "valid", page: { kind: "intermediate", requestedToken: values.requestedToken, changes: values.changes, nextPageToken: values.nextPageToken } };
  if (values.newStartPageToken) return { status: "valid", page: { kind: "terminal", requestedToken: values.requestedToken, changes: values.changes, newStartPageToken: values.newStartPageToken } };
  return { status: "invalid", reason: "page-token-missing" };
}
function appendDurableRemoteChangeBatch(backlog, batch) {
  if (backlog.some((existing) => existing.checkpoint.batchId === batch.checkpoint.batchId)) return backlog;
  return [...backlog, batch];
}
function restartRecoveryDirective(effect) {
  if (effect.stage === "state-committed") return { action: "none" };
  if (effect.stage === "intent-persisted") return { action: "retire-unattempted-intent" };
  if (effect.stage === "effect-verified" && effect.verificationEvidenceRef) return { action: "finish-authoritative-state-commit", verificationEvidenceRef: effect.verificationEvidenceRef };
  return { action: "reconcile-physical-reality" };
}
function assessTextMergeEligibility(sizes, policy) {
  if (sizes.some((size) => size === void 0)) return { eligible: false, reason: "size-unknown" };
  const known = sizes;
  if (known.some((size) => size > policy.maximumInputBytesPerVersion)) return { eligible: false, reason: "version-too-large" };
  if (known.reduce((total, size) => total + size, 0) > policy.maximumCombinedInputBytes) return { eligible: false, reason: "combined-input-too-large" };
  return { eligible: true };
}

// src/contracts/synchronization-folder-create-foundation.ts
function recoverableOperationV1_1RestartRecoveryDirectives(intent) {
  return intent.effects.map((effect) => ({
    effectId: effect.effectId,
    directive: restartRecoveryDirective(effect)
  }));
}
function recoverableOperationV1_1IsComplete(intent) {
  return intent.effects.every((effect) => effect.stage === "state-committed");
}
function folderCreateDescriptorIsSelfConsistent(descriptor) {
  if (descriptor.targetPath !== descriptor.pathAuthority.targetPath) return false;
  if (descriptor.kind === "remote-folder-create") {
    return descriptor.intentId === descriptor.remoteMutation.intentId && descriptor.targetPath === descriptor.remoteMutation.path;
  }
  return true;
}
function verifyLocalFolderCreate(descriptor, observation) {
  if (!folderCreateDescriptorIsSelfConsistent(descriptor)) {
    return { status: "outcome-unknown", reason: "folder-create-descriptor-inconsistent" };
  }
  if (observation.status === "unobservable") {
    return { status: "outcome-unknown", reason: observation.reason };
  }
  if (observation.targetPath !== descriptor.targetPath || observation.pathComparisonKey !== descriptor.pathAuthority.pathComparisonKey) {
    return { status: "conflict-preserved", reason: "local-folder-path-authority-mismatch" };
  }
  if (observation.status === "authoritative-absent") {
    return { status: "verified-not-applied", reason: "authoritative-local-absence" };
  }
  if (observation.status === "occupied" && observation.entityKind !== "folder") {
    return { status: "conflict-preserved", reason: "local-folder-path-occupied-incompatibly" };
  }
  if (observation.status === "occupied") {
    return { status: "conflict-preserved", reason: "local-folder-object-not-proven-as-intended-effect" };
  }
  return {
    status: "verified-effect",
    proof: {
      kind: "local-folder-create",
      targetPath: observation.targetPath,
      pathComparisonKey: observation.pathComparisonKey,
      entityKind: "folder",
      observationToken: observation.observationToken
    }
  };
}
function verifyRemoteFolderCreate(descriptor, observation) {
  if (!folderCreateDescriptorIsSelfConsistent(descriptor)) {
    return { status: "outcome-unknown", reason: "folder-create-descriptor-inconsistent" };
  }
  if (observation.status === "unobservable") {
    return { status: "outcome-unknown", reason: observation.reason };
  }
  const reservedRemoteObjectId = descriptor.remoteMutation.reservedRemoteObjectId;
  if (observation.status === "authoritative-absent") {
    return observation.reservedRemoteObjectId === reservedRemoteObjectId ? { status: "verified-not-applied", reason: "reserved-remote-folder-authoritatively-absent" } : { status: "outcome-unknown", reason: "remote-absence-did-not-check-reserved-identity" };
  }
  if (observation.targetPath !== descriptor.targetPath || observation.pathComparisonKey !== descriptor.pathAuthority.pathComparisonKey) {
    return { status: "conflict-preserved", reason: "remote-folder-path-authority-mismatch" };
  }
  if (observation.status === "occupied") {
    return { status: "conflict-preserved", reason: "remote-folder-logical-path-occupied-by-non-authoritative-object" };
  }
  if (observation.remoteObjectId !== reservedRemoteObjectId || observation.parentRemoteObjectId !== descriptor.parentRemoteObjectId) {
    return { status: "conflict-preserved", reason: "remote-folder-identity-or-parent-mismatch" };
  }
  return {
    status: "verified-effect",
    proof: {
      kind: "remote-folder-create",
      targetPath: observation.targetPath,
      pathComparisonKey: observation.pathComparisonKey,
      entityKind: "folder",
      remoteObjectId: observation.remoteObjectId,
      parentRemoteObjectId: observation.parentRemoteObjectId,
      reservedRemoteObjectId
    }
  };
}

// src/product/history-modal.ts
var AuditHistoryModal = class extends import_obsidian2.Modal {
  constructor(app, load) {
    super(app);
    this.load = load;
  }
  load;
  async onOpen() {
    this.contentEl.empty();
    this.contentEl.createEl("h2", { text: "BRAIN synchronization history" });
    const records = await this.load();
    if (!records.length) {
      this.contentEl.createEl("p", { text: "No synchronization activity has been recorded on this device." });
      return;
    }
    const list = this.contentEl.createEl("ul");
    for (const record of [...records].reverse()) {
      const when = record.advisoryAtMs ? new Date(record.advisoryAtMs).toLocaleString() : "time unavailable";
      list.createEl("li", { text: `${when} \u2014 ${record.event}${record.path ? ` \u2014 ${String(record.path)}` : ""}${record.reasonCode ? ` \u2014 ${record.reasonCode}` : ""}` });
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
function idFor(assessment) {
  if (assessment.kind === "none") return void 0;
  if (assessment.kind === "clean-merge") return contractId(`conflict:clean:${String(assessment.path)}`);
  return assessment.conflictId;
}
var SyncAttentionModal = class extends import_obsidian2.Modal {
  constructor(app, controller, options = {}) {
    super(app);
    this.controller = controller;
    this.options = options;
  }
  controller;
  options;
  onOpen() {
    void this.render();
  }
  async render() {
    this.contentEl.empty();
    const surface = this.controller.currentSurface();
    this.contentEl.createEl("h2", { text: "BRAIN synchronization attention" });
    this.contentEl.createEl("p", { text: `Current status: ${surface.status.kind}` });
    const currentAttention = await this.options.loadAttention?.() ?? [];
    if (currentAttention.length) {
      this.contentEl.createEl("h3", { text: "Paths currently requiring attention" });
      const ledgerItems = this.contentEl.createEl("ul");
      for (const record of currentAttention) ledgerItems.createEl("li", { text: `${String(record.path)} \u2014 ${record.category} \u2014 ${record.humanReason}` });
    }
    if (this.options.loadAttentionCsv) {
      try {
        const csv = await this.options.loadAttentionCsv();
        if (this.options.copyAttentionCsv) {
          const copy = this.contentEl.createEl("button", { text: "Copy attention CSV" });
          copy.addEventListener("click", () => void this.options.copyAttentionCsv?.(csv));
        }
        if (this.options.shareAttentionCsv) {
          const share = this.contentEl.createEl("button", { text: "Share attention CSV file" });
          share.addEventListener("click", () => void this.options.shareAttentionCsv?.(csv));
        }
      } catch (error) {
        this.contentEl.createEl("p", { text: `Attention CSV is unavailable: ${error instanceof Error ? error.message : String(error)}` });
      }
    }
    if (surface.conflicts.length) {
      for (const conflict of surface.conflicts) {
        if (conflict.kind === "none" || conflict.kind === "clean-merge") continue;
        const id = idFor(conflict);
        if (!id) continue;
        const card = this.contentEl.createDiv();
        card.createEl("h3", { text: `${conflict.kind} \u2014 ${String(conflict.path)}` });
        card.createEl("p", { text: "The preserved versions remain unchanged until you choose a resolution. Every choice is revalidated against the exact planned versions immediately before mutation." });
        for (const [label, kind] of [["Keep local", "keep-local"], ["Keep remote", "keep-remote"], ["Keep both", "keep-both"]]) {
          const button = card.createEl("button", { text: label });
          button.addEventListener("click", () => void this.resolve(id, kind));
        }
        card.createEl("p", { text: "Manual resolution: edit the original local file in Obsidian until it contains the exact content you want to make authoritative, then use the action below. The controller\u2014not this UI\u2014captures and revalidates the current stable local version." });
        const manual = card.createEl("button", { text: "Use current local file as manual resolution" });
        manual.addEventListener("click", () => void this.resolveManual(id));
      }
    }
    if (surface.planPreview) {
      const items = this.contentEl.createEl("ul");
      for (const operation of surface.planPreview.operations.filter((operation2) => ["unresolved-conflict", "blocked-unsafe", "recovery-required"].includes(operation2.kind))) {
        items.createEl("li", { text: `${operation.kind} \u2014 ${String(operation.path)} \u2014 ${operation.reasons.map((reason) => reason.summary).join("; ")}` });
      }
    }
    if (surface.status.kind === "recovery-required") {
      this.contentEl.createEl("p", { text: "Destructive propagation and automatic synchronization remain disabled. Verify/Reconcile Vault produces a reviewable non-destructive safe-union reconstruction from current LOCAL + managed REMOTE reality; corrupt/missing prior state is never treated as an empty authoritative BASE." });
      if (this.options.recoveryBackupId) this.contentEl.createEl("p", { text: `Device-local recovery backup: ${this.options.recoveryBackupId}` });
      if (this.options.copyDiagnostics) {
        const diagnostics = this.contentEl.createEl("button", { text: "Copy recovery diagnostics" });
        diagnostics.addEventListener("click", () => void this.options.copyDiagnostics?.());
      }
    } else if (surface.status.kind === "destructive-plan-blocked") {
      this.contentEl.createEl("p", { text: "Review the exact manual plan and recovery checkpoint before approval. If reality changes, the semantic plan identity changes and the old approval cannot execute it." });
    }
  }
  async resolve(id, kind) {
    const result = await this.controller.request({ kind: "resolve-conflict", conflictId: id, resolution: { kind } });
    if (result.status === "rejected") this.contentEl.createEl("p", { text: `Resolution was not applied: ${result.reason}` });
    else void this.render();
  }
  async resolveManual(id) {
    const result = await this.controller.resolveWithCurrentLocal(id);
    if (result.status === "rejected") this.contentEl.createEl("p", { text: `Manual resolution was not applied: ${result.reason}` });
    else void this.render();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/product/sync-plan-errors-path.ts
init_path_policy();
var SYNC_PLAN_ERRORS_CSV_FILENAME = "sync-plan-errors.csv";
var SYNC_PLAN_ERRORS_STAGE_SUFFIX = ".brain-sync-stage";
var SYNC_PLAN_ERRORS_BACKUP_SUFFIX = ".brain-sync-backup";
var RESERVED_PORTABLE_CONFIGURATION_NAMESPACE = "__brain_sync_portable_config__";
function syncPlanErrorsOperationalPaths(path2) {
  return [path2, `${path2}${SYNC_PLAN_ERRORS_STAGE_SUFFIX}`, `${path2}${SYNC_PLAN_ERRORS_BACKUP_SUFFIX}`];
}
function syncPlanErrorsPathsEquivalent(first, second) {
  return normalizedComparisonPath(first) === normalizedComparisonPath(second);
}
function assertOperationalPathsCompatible(path2) {
  for (const candidate of syncPlanErrorsOperationalPaths(path2)) {
    const validation = validateCrossPlatformPath(candidate);
    if (validation.status === "blocked") {
      throw new Error(`Sync plan errors operational path must be cross-platform safe (${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}).`);
    }
  }
}
function resolveSyncPlanErrorsPath(directory) {
  const trimmed = directory.trim();
  if (!trimmed) {
    assertOperationalPathsCompatible(SYNC_PLAN_ERRORS_CSV_FILENAME);
    return { directory: "", path: SYNC_PLAN_ERRORS_CSV_FILENAME };
  }
  const normalized = normalizeVaultPath(trimmed);
  const validation = validateCrossPlatformPath(normalized);
  if (validation.status === "blocked") {
    throw new Error(`Sync plan errors directory must be a safe vault-relative directory (${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}).`);
  }
  if (normalized === RESERVED_PORTABLE_CONFIGURATION_NAMESPACE || normalized.startsWith(`${RESERVED_PORTABLE_CONFIGURATION_NAMESPACE}/`)) {
    throw new Error("Sync plan errors directory cannot use BRAIN Sync's reserved portable-configuration namespace.");
  }
  if (normalized.toLocaleLowerCase("en-US").endsWith(".csv")) {
    throw new Error("Configure a containing directory, not a CSV filename; the filename is fixed by BRAIN Sync.");
  }
  const path2 = `${normalized}/${SYNC_PLAN_ERRORS_CSV_FILENAME}`;
  assertOperationalPathsCompatible(path2);
  return { directory: normalized, path: path2 };
}
function directoryForSyncPlanErrorsPath(path2) {
  const suffix = `/${SYNC_PLAN_ERRORS_CSV_FILENAME}`;
  const directory = path2 === SYNC_PLAN_ERRORS_CSV_FILENAME ? "" : path2.endsWith(suffix) ? path2.slice(0, -suffix.length) : void 0;
  if (directory === void 0 || resolveSyncPlanErrorsPath(directory).path !== path2) {
    throw new Error("Sync plan errors relocation path is invalid.");
  }
  return directory;
}
function normalizeSyncPlanErrorsRelocationJournal(value2) {
  if (value2 === null || value2 === void 0) return null;
  if (typeof value2 !== "object") throw new Error("Sync plan errors relocation journal is invalid.");
  const candidate = value2;
  if (typeof candidate.sourcePath !== "string" || typeof candidate.destinationPath !== "string") {
    throw new Error("Sync plan errors relocation journal is invalid.");
  }
  directoryForSyncPlanErrorsPath(candidate.sourcePath);
  directoryForSyncPlanErrorsPath(candidate.destinationPath);
  if (syncPlanErrorsPathsEquivalent(candidate.sourcePath, candidate.destinationPath)) {
    throw new Error("Sync plan errors relocation journal has cross-platform-equivalent locations.");
  }
  return { sourcePath: candidate.sourcePath, destinationPath: candidate.destinationPath };
}
function withManagedSyncPlanErrorsExclusion(settings, directory = settings.syncPlanErrorsDirectory) {
  const resolved = resolveSyncPlanErrorsPath(directory);
  const priorManaged = settings.managedSyncPlanErrorsExclusion;
  const relocation = normalizeSyncPlanErrorsRelocationJournal(settings.syncPlanErrorsRelocation);
  const protectedPaths = [resolved.path, ...relocation ? [relocation.sourcePath, relocation.destinationPath] : []].filter((path2, index, values) => values.indexOf(path2) === index);
  const user = settings.userExclusionPatterns.filter((pattern) => pattern !== priorManaged && !protectedPaths.includes(pattern));
  return {
    ...settings,
    syncPlanErrorsDirectory: resolved.directory,
    managedSyncPlanErrorsExclusion: resolved.path,
    syncPlanErrorsRelocation: relocation,
    userExclusionPatterns: [...user, ...protectedPaths]
  };
}
function userExclusionsWithoutManaged(settings) {
  return settings.userExclusionPatterns.filter((pattern) => pattern !== settings.managedSyncPlanErrorsExclusion);
}

// src/product/plugin-data.ts
var DEFAULT_SETTINGS = {
  oauthClientId: "",
  oauthRedirectUri: "",
  remoteRootId: "",
  vaultIdentity: "",
  deviceIdentity: "",
  firstSyncCompleted: false,
  recoveryInProgress: false,
  recoveryBackupId: "",
  userExclusionPatterns: [],
  syncPlanErrorsDirectory: "",
  managedSyncPlanErrorsExclusion: "",
  syncPlanErrorsRelocation: null,
  scopeReconcileRequired: false,
  startupResumeEnabled: false,
  localChangeEnabled: false,
  periodicEnabled: false,
  periodicIntervalMinutes: 15,
  localDebounceMs: 1500,
  wifiOnlyAutomatic: true,
  wifiOnlyLargeTransfers: true,
  largeTransferThresholdBytes: 25 * 1024 * 1024,
  auditRetention: 500,
  diagnosticLogLevel: "info",
  diagnosticConsoleMirror: false,
  diagnosticRetention: DEFAULT_DIAGNOSTIC_RETENTION
};
var PluginDataRepository = class {
  constructor(host) {
    this.host = host;
  }
  host;
  loaded;
  saveChain = Promise.resolve();
  async loadSettings() {
    const settings = (await this.data()).settings;
    return { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
  }
  async saveSettings(settings) {
    const data = await this.data();
    data.settings = { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
    await this.persist(data);
  }
  async load() {
    return [...(await this.data()).audit];
  }
  async save(records) {
    const data = await this.data();
    data.audit = [...records];
    await this.persist(data);
  }
  async loadDiagnostics() {
    return (await this.data()).diagnostics;
  }
  async saveDiagnostics(state) {
    const data = await this.data();
    data.diagnostics = {
      records: state.records.map((record) => ({ ...record, ...record.fields ? { fields: { ...record.fields } } : {} })),
      nextSequence: state.nextSequence,
      nextAttemptId: state.nextAttemptId,
      nextRunId: state.nextRunId
    };
    await this.persist(data);
  }
  async loadSyncAttention() {
    return (await this.data()).syncAttention.map((record) => ({ ...record }));
  }
  async saveSyncAttention(records) {
    const data = await this.data();
    data.syncAttention = records.map((record) => ({ ...record }));
    await this.persist(data);
  }
  data() {
    this.loaded ??= this.host.loadData().then((raw) => {
      const value2 = raw && typeof raw === "object" ? raw : {};
      const merged = { ...DEFAULT_SETTINGS, ...value2.settings ?? {} };
      merged.userExclusionPatterns = Array.isArray(merged.userExclusionPatterns) ? merged.userExclusionPatterns.filter((value3) => typeof value3 === "string") : [];
      merged.syncPlanErrorsDirectory = typeof merged.syncPlanErrorsDirectory === "string" ? merged.syncPlanErrorsDirectory : "";
      merged.managedSyncPlanErrorsExclusion = typeof merged.managedSyncPlanErrorsExclusion === "string" ? merged.managedSyncPlanErrorsExclusion : "";
      merged.syncPlanErrorsRelocation = normalizeSyncPlanErrorsRelocationJournal(merged.syncPlanErrorsRelocation);
      merged.scopeReconcileRequired = Boolean(merged.scopeReconcileRequired);
      if (!["off", "error", "warn", "info", "debug", "trace"].includes(merged.diagnosticLogLevel)) merged.diagnosticLogLevel = DEFAULT_SETTINGS.diagnosticLogLevel;
      merged.diagnosticConsoleMirror = Boolean(merged.diagnosticConsoleMirror);
      if (!Number.isSafeInteger(merged.diagnosticRetention)) merged.diagnosticRetention = DEFAULT_DIAGNOSTIC_RETENTION;
      return { settings: merged, audit: Array.isArray(value2.audit) ? [...value2.audit] : [], diagnostics: value2.diagnostics, syncAttention: Array.isArray(value2.syncAttention) ? value2.syncAttention.map((record) => ({ ...record })) : [] };
    });
    return this.loaded;
  }
  async persist(data) {
    const payload = structuredClone({
      settings: { ...data.settings, userExclusionPatterns: [...data.settings.userExclusionPatterns] },
      audit: data.audit.map((record) => ({ ...record })),
      diagnostics: data.diagnostics,
      syncAttention: data.syncAttention.map((record) => ({ ...record }))
    });
    const write = this.saveChain.catch(() => void 0).then(() => this.host.saveData(payload));
    this.saveChain = write.catch(() => void 0);
    await write;
  }
};

// src/product/runtime.ts
var import_obsidian3 = require("obsidian");

// src/core/destructive-safety.ts
var DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS = {
  absoluteDestructiveLimit: 25,
  affectedFractionLimit: 0.2,
  abnormalMultiple: 3
};
var DestructiveSafetyPolicy = class {
  constructor(settings = DEFAULT_DESTRUCTIVE_SAFETY_SETTINGS) {
    this.settings = settings;
    if (settings.absoluteDestructiveLimit < 1) throw new Error("absoluteDestructiveLimit must be positive");
    if (!(settings.affectedFractionLimit > 0 && settings.affectedFractionLimit <= 1)) throw new Error("affectedFractionLimit must be in (0,1]");
    if (settings.abnormalMultiple < 1) throw new Error("abnormalMultiple must be >= 1");
  }
  settings;
  assess(operations, context) {
    const destructiveCount = operations.filter((operation) => operation.destructive).length;
    if (destructiveCount === 0) {
      return { suspicious: false, requiresApproval: false, recoveryCheckpointRequired: false, signals: [] };
    }
    const signals = [];
    if (destructiveCount >= this.settings.absoluteDestructiveLimit) signals.push("absolute-count");
    const denominator = Math.max(context.totalManagedPaths, destructiveCount, 1);
    if (destructiveCount / denominator >= this.settings.affectedFractionLimit) signals.push("affected-percentage");
    const recent = context.recentAverageDestructiveOperations;
    if (recent !== void 0 && recent > 0 && destructiveCount >= Math.max(2, Math.ceil(recent * this.settings.abnormalMultiple))) {
      signals.push("abnormal-divergence");
    }
    if (context.stateCondition !== "trusted") signals.push("state-integrity-or-rebuild");
    const suspicious = signals.length > 0;
    return {
      suspicious,
      requiresApproval: suspicious,
      recoveryCheckpointRequired: suspicious,
      signals
    };
  }
  /** Approval is scoped to the exact plan and requires a concrete recovery checkpoint. */
  authorizeReviewedPlan(plan, checkpointId) {
    if (!plan.recoveryCheckpointRequired || plan.executionDisposition !== "requires-user-approval" || plan.globalExecutionGate !== "destructive-approval-required") {
      throw new Error("plan is not eligible for destructive review approval");
    }
    const destructiveOperationIds = plan.operations.filter((operation) => operation.destructive).map((operation) => operation.operationId);
    if (destructiveOperationIds.length === 0) throw new Error("reviewed destructive plan contains no destructive operations");
    return { planId: plan.planId, checkpointId, destructiveOperationIds };
  }
};

// src/util/sha256.ts
init_common();
var K = new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
function rotr(value2, bits) {
  return value2 >>> bits | value2 << 32 - bits;
}
var Sha256 = class {
  h0 = 1779033703;
  h1 = 3144134277;
  h2 = 1013904242;
  h3 = 2773480762;
  h4 = 1359893119;
  h5 = 2600822924;
  h6 = 528734635;
  h7 = 1541459225;
  buffer = new Uint8Array(64);
  bufferLength = 0;
  bytesHashed = 0;
  finished = false;
  words = new Uint32Array(64);
  update(data) {
    if (this.finished) throw new Error("SHA-256 digest is already finalized");
    if (!data.byteLength) return this;
    this.bytesHashed += data.byteLength;
    let offset = 0;
    if (this.bufferLength) {
      const take = Math.min(64 - this.bufferLength, data.byteLength);
      this.buffer.set(data.subarray(0, take), this.bufferLength);
      this.bufferLength += take;
      offset += take;
      if (this.bufferLength === 64) {
        this.process(this.buffer);
        this.bufferLength = 0;
      }
    }
    while (offset + 64 <= data.byteLength) {
      this.process(data.subarray(offset, offset + 64));
      offset += 64;
    }
    if (offset < data.byteLength) {
      this.buffer.set(data.subarray(offset), 0);
      this.bufferLength = data.byteLength - offset;
    }
    return this;
  }
  digestHex() {
    if (!this.finished) this.finish();
    return [this.h0, this.h1, this.h2, this.h3, this.h4, this.h5, this.h6, this.h7].map((value2) => (value2 >>> 0).toString(16).padStart(8, "0")).join("");
  }
  finish() {
    const bytes = this.bytesHashed;
    const block = new Uint8Array(128);
    block.set(this.buffer.subarray(0, this.bufferLength));
    block[this.bufferLength] = 128;
    const padLength = this.bufferLength < 56 ? 64 : 128;
    const high = Math.floor(bytes / 536870912);
    const low = bytes * 8 >>> 0;
    block[padLength - 8] = high >>> 24 & 255;
    block[padLength - 7] = high >>> 16 & 255;
    block[padLength - 6] = high >>> 8 & 255;
    block[padLength - 5] = high & 255;
    block[padLength - 4] = low >>> 24 & 255;
    block[padLength - 3] = low >>> 16 & 255;
    block[padLength - 2] = low >>> 8 & 255;
    block[padLength - 1] = low & 255;
    this.process(block.subarray(0, 64));
    if (padLength === 128) this.process(block.subarray(64, 128));
    this.finished = true;
  }
  process(block) {
    const w = this.words;
    for (let i = 0; i < 16; i += 1) {
      const j = i * 4;
      w[i] = (block[j] << 24 | block[j + 1] << 16 | block[j + 2] << 8 | block[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15], y = w[i - 2];
      const s0 = rotr(x, 7) ^ rotr(x, 18) ^ x >>> 3;
      const s1 = rotr(y, 17) ^ rotr(y, 19) ^ y >>> 10;
      w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
    }
    let a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = e & f ^ ~e & g;
      const t1 = h + s1 + ch + K[i] + w[i] >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = a & b ^ a & c ^ b & c;
      const t2 = s0 + maj >>> 0;
      h = g;
      g = f;
      f = e;
      e = d + t1 >>> 0;
      d = c;
      c = b;
      b = a;
      a = t1 + t2 >>> 0;
    }
    this.h0 = this.h0 + a >>> 0;
    this.h1 = this.h1 + b >>> 0;
    this.h2 = this.h2 + c >>> 0;
    this.h3 = this.h3 + d >>> 0;
    this.h4 = this.h4 + e >>> 0;
    this.h5 = this.h5 + f >>> 0;
    this.h6 = this.h6 + g >>> 0;
    this.h7 = this.h7 + h >>> 0;
  }
};
function sha256Bytes(bytes) {
  return contractId(`sha256:${new Sha256().update(bytes).digestHex()}`);
}
function sha256Text(text) {
  return sha256Bytes(new TextEncoder().encode(text));
}
async function sha256BinarySource(source) {
  const hash2 = new Sha256();
  for await (const chunk of source.openChunks()) hash2.update(chunk);
  return contractId(`sha256:${hash2.digestHex()}`);
}
function isCanonicalSha256(value2) {
  return typeof value2 === "string" && /^sha256:[0-9a-f]{64}$/.test(value2);
}

// src/core/semantic-identifiers.ts
function canonicalize(value2) {
  if (value2 === void 0) return void 0;
  if (value2 === null || typeof value2 !== "object") return value2;
  if (Array.isArray(value2)) return value2.map(canonicalize);
  const record = value2;
  const result = {};
  for (const key of Object.keys(record).sort()) {
    const canonical2 = canonicalize(record[key]);
    if (canonical2 !== void 0) result[key] = canonical2;
  }
  return result;
}
function semanticFingerprint(value2) {
  return String(sha256Text(JSON.stringify(canonicalize(value2)))).slice("sha256:".length);
}
function semanticOperationId(intent, ordinal = 0) {
  return contractId(`op:${semanticFingerprint({ ordinal, intent })}`);
}
function withSemanticOperationId(intent, ordinal = 0) {
  return { operationId: semanticOperationId(intent, ordinal), ...intent };
}
function semanticPlanId(values) {
  return contractId(`plan:${semanticFingerprint({
    trigger: values.trigger,
    operations: values.operations.map((operation) => ({ operationId: operation.operationId })),
    executionDisposition: values.executionDisposition,
    recoveryCheckpointRequired: values.recoveryCheckpointRequired,
    globalExecutionGate: values.globalExecutionGate
  })}`);
}

// src/core/planner.ts
var branded = (value2) => contractId(value2);
function observed(snapshot, side) {
  const value2 = snapshot[side];
  return value2.status === "present" ? { path: value2.path, entityKind: value2.entityKind, content: value2.content, remoteObjectId: value2.remoteObjectId, observationToken: value2.observationToken } : void 0;
}
function fromBase(entry2) {
  return entry2 ? { path: entry2.path, entityKind: entry2.entityKind, content: entry2.content, remoteObjectId: entry2.remoteObjectId } : void 0;
}
function evidenceEqual(a, b, kind) {
  if (kind === "folder") return true;
  if (!a || !b) return false;
  if (a.hash && b.hash) return a.hash === b.hash;
  if (a.revision && b.revision) return a.revision === b.revision;
  return false;
}
function sameVersion(a, b) {
  return a.entityKind === b.entityKind && evidenceEqual(a.content, b.content, a.entityKind);
}
function makeOperation(path2, index, kind, extra = {}) {
  return withSemanticOperationId({ kind, path: path2, destructive: false, preconditions: [], reasons: [], ...extra }, index);
}
function blocked(path2, index, code, summary, recovery = false) {
  return makeOperation(path2, index, recovery ? "recovery-required" : "blocked-unsafe", { reasons: [{ code, summary }] });
}
function uncertainty(snapshot) {
  if (snapshot.base.status === "untrusted") return { code: "untrusted-base", summary: snapshot.base.reason, recovery: true };
  if (snapshot.identity.status !== "unambiguous") return { code: "identity-ambiguous", summary: snapshot.identity.reason };
  if (snapshot.local.status === "unreadable" || snapshot.local.status === "inaccessible" || snapshot.local.status === "unknown") return { code: `local-${snapshot.local.status}`, summary: snapshot.local.reason };
  if (snapshot.local.status === "present" && snapshot.local.entityKind === "file" && snapshot.local.stability !== "stable") return { code: "local-file-not-stable", summary: "Local content changed during stable-source validation; this path will be retried without blocking unrelated work." };
  if (snapshot.remote.status === "unreadable" || snapshot.remote.status === "inaccessible" || snapshot.remote.status === "unknown") return { code: `remote-${snapshot.remote.status}`, summary: snapshot.remote.reason };
  if (snapshot.remote.status === "absent" && snapshot.remoteEnumeration.status !== "complete") return { code: "remote-enumeration-incomplete", summary: snapshot.remoteEnumeration.reason };
  return void 0;
}
function localVersionPreconditions(version) {
  const values = [{ kind: "path-observation", side: "local", path: version.path, expected: "present", ...version.observationToken ? { observationToken: String(version.observationToken) } : {} }];
  if (version.content) values.push({ kind: "content-evidence", side: "local", path: version.path, expected: version.content });
  return values;
}
function remoteVersionPreconditions(version) {
  const values = [];
  if (version.remoteObjectId) values.push({ kind: "remote-object", remoteObjectId: version.remoteObjectId, ...version.content?.revision ? { expectedRevision: version.content.revision } : {} });
  if (version.content) values.push({ kind: "content-evidence", side: "remote", path: version.path, expected: version.content });
  return values;
}
function conflictOperation(path2, index, assessment) {
  if (assessment.kind === "clean-merge") {
    const remote = assessment.provenance.remote.version;
    return makeOperation(path2, index, "clean-text-merge", {
      remoteObjectId: remote.remoteObjectId,
      contentVersion: assessment.mergedVersion,
      preconditions: [
        { kind: "base-trusted" },
        { kind: "identity-unambiguous", path: path2 },
        ...localVersionPreconditions(assessment.provenance.local.version),
        ...remoteVersionPreconditions(remote)
      ],
      reasons: [{ code: "clean-three-way-merge", summary: "Concurrent text changes merge cleanly from the trusted base." }]
    });
  }
  if (assessment.kind === "none") return makeOperation(path2, index, "noop", { reasons: [{ code: "no-conflict", summary: "No mutation is required." }] });
  return makeOperation(path2, index, "unresolved-conflict", { conflictId: String(assessment.conflictId), reasons: [{ code: assessment.kind, summary: "Concurrent changes require preservation and explicit resolution." }] });
}
function strongHistoricalMatch(prior, snapshot) {
  if (snapshot.local.status !== "present" || snapshot.local.entityKind !== prior.entityKind) return false;
  if (prior.remoteObjectId && snapshot.local.remoteObjectId === prior.remoteObjectId) return true;
  if (prior.entityKind === "folder") return false;
  return Boolean(prior.content?.hash && snapshot.local.content?.hash && prior.content.hash === snapshot.local.content.hash);
}
var DeterministicSynchronizationPlanner = class {
  constructor(conflicts, destructiveSafety = new DestructiveSafetyPolicy(), options = {}) {
    this.conflicts = conflicts;
    this.destructiveSafety = destructiveSafety;
    this.options = options;
  }
  conflicts;
  destructiveSafety;
  options;
  async plan(input) {
    const operations = [];
    let index = 0;
    if (input.state.status === "recovery-required") {
      const targets = input.snapshots.length ? input.snapshots.map((s) => s.path) : [branded("__sync_state__")];
      for (const path2 of targets) operations.push(blocked(path2, index++, "state-recovery-required", input.state.detail ?? input.state.reason, true));
      return this.finish(input.state, input.snapshots.length, operations);
    }
    const handled = /* @__PURE__ */ new Set();
    if (input.state.status === "trusted") this.classifyProvenMoves(input.snapshots, input.state.state.base, operations, handled, () => index++);
    for (const snapshot of input.snapshots) {
      if (handled.has(String(snapshot.path))) continue;
      const unsafe = uncertainty(snapshot);
      if (unsafe) {
        operations.push(blocked(snapshot.path, index++, unsafe.code, unsafe.summary, unsafe.recovery));
        continue;
      }
      const local = observed(snapshot, "local");
      const remote = observed(snapshot, "remote");
      const baseEntry = snapshot.base.status === "trusted" ? snapshot.base.entry : void 0;
      const baseVersion2 = fromBase(baseEntry);
      if (input.state.status === "trusted" && snapshot.base.status === "trusted" && snapshot.base.tombstone && (local || remote) && input.state.state.knownDevices.some((d) => d.stale)) {
        operations.push(blocked(snapshot.path, index++, "tombstone-resurrection-blocked", "A known stale device exists; reconcile before accepting content that reappeared under a tombstone."));
        continue;
      }
      if (!local && !remote) {
        operations.push(makeOperation(snapshot.path, index++, "noop", baseEntry ? { preconditions: [{ kind: "base-trusted" }, { kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" }, { kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" }, { kind: "remote-enumeration-complete" }], reasons: [{ code: "both-deleted", summary: "Both sides are reliably absent from trusted prior state; record a durable tombstone transition." }] } : { reasons: [{ code: "both-absent", summary: "Neither side currently contains the never-established path." }] }));
        continue;
      }
      if (!local && remote) {
        if (!baseEntry?.localExisted || !baseEntry.remoteExisted) {
          operations.push(makeOperation(snapshot.path, index++, "download-create", { targetSide: "local", contentVersion: remote, remoteObjectId: remote.remoteObjectId, preconditions: [{ kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" }, ...remoteVersionPreconditions(remote)], reasons: [{ code: "safe-union-remote-only", summary: "Remote-only content is copied locally during safe union." }] }));
        } else if (!evidenceEqual(remote.content, baseEntry.content, remote.entityKind)) {
          operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, baseVersion2, void 0, remote)));
        } else {
          operations.push(makeOperation(snapshot.path, index++, "trash-remote", { targetSide: "remote", remoteObjectId: remote.remoteObjectId ?? baseEntry.remoteObjectId, destructive: true, preconditions: [{ kind: "base-trusted" }, { kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" }, { kind: "remote-enumeration-complete" }, ...remoteVersionPreconditions(remote)], reasons: [{ code: "attested-local-deletion", summary: "Trusted prior existence plus reliable local absence authorizes recoverable remote trash." }] }));
        }
        continue;
      }
      if (local && !remote) {
        if (!baseEntry?.localExisted || !baseEntry.remoteExisted) {
          if (snapshot.local.status === "present" && snapshot.local.stability !== "stable") operations.push(blocked(snapshot.path, index++, "local-file-not-stable", "Local content is not stable enough to upload."));
          else operations.push(makeOperation(snapshot.path, index++, "upload-create", { targetSide: "remote", contentVersion: local, preconditions: [{ kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" }, ...localVersionPreconditions(local), { kind: "file-stable", path: snapshot.path }], reasons: [{ code: "safe-union-local-only", summary: "Local-only content is copied remotely during safe union." }] }));
        } else if (!evidenceEqual(local.content, baseEntry.content, local.entityKind)) {
          operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, baseVersion2, local, void 0)));
        } else {
          operations.push(makeOperation(snapshot.path, index++, "trash-local", { targetSide: "local", destructive: true, preconditions: [{ kind: "base-trusted" }, { kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" }, { kind: "remote-enumeration-complete" }, ...localVersionPreconditions(local)], reasons: [{ code: "attested-remote-deletion", summary: "Trusted prior existence plus complete remote absence authorizes recoverable local trash." }] }));
        }
        continue;
      }
      if (sameVersion(local, remote)) {
        operations.push(makeOperation(snapshot.path, index++, "noop", { ...baseEntry ? {} : { contentVersion: remote }, reasons: [{ code: baseEntry ? "equal-current-content" : "safe-union-identical", summary: "Both sides contain equivalent content." }] }));
        continue;
      }
      if (!baseEntry) {
        operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, void 0, local, remote)));
        continue;
      }
      const localChanged = !evidenceEqual(local.content, baseEntry.content, local.entityKind);
      const remoteChanged = !evidenceEqual(remote.content, baseEntry.content, remote.entityKind);
      if (!localChanged && !remoteChanged) operations.push(makeOperation(snapshot.path, index++, "noop", { reasons: [{ code: "unchanged-from-base", summary: "Both sides match the trusted base." }] }));
      else if (localChanged && !remoteChanged) {
        if (snapshot.local.status === "present" && snapshot.local.stability !== "stable") operations.push(blocked(snapshot.path, index++, "local-file-not-stable", "Local modification is not stable enough to upload."));
        else operations.push(makeOperation(snapshot.path, index++, "upload-update", { targetSide: "remote", remoteObjectId: remote.remoteObjectId ?? baseEntry.remoteObjectId, contentVersion: local, preconditions: [{ kind: "base-trusted" }, ...localVersionPreconditions(local), ...remoteVersionPreconditions(remote), { kind: "file-stable", path: snapshot.path }], reasons: [{ code: "local-only-modification", summary: "Only local content differs from the trusted base." }] }));
      } else if (!localChanged && remoteChanged) {
        operations.push(makeOperation(snapshot.path, index++, "download-update", { targetSide: "local", remoteObjectId: remote.remoteObjectId ?? baseEntry.remoteObjectId, contentVersion: remote, preconditions: [{ kind: "base-trusted" }, ...localVersionPreconditions(local), ...remoteVersionPreconditions(remote)], reasons: [{ code: "remote-only-modification", summary: "Only remote content differs from the trusted base." }] }));
      } else operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, baseVersion2, local, remote)));
    }
    if (input.state.status === "trusted") {
      const trustedState = input.state.state;
      const currentDevice = trustedState.knownDevices.find((device) => device.deviceId === trustedState.deviceIdentity);
      if (currentDevice?.stale) {
        for (let i = 0; i < operations.length; i += 1) {
          const operation = operations[i];
          if (operation.destructive) operations[i] = blocked(operation.path, i, "stale-device-destructive-gate", "This device is stale and must reconcile before it can authorize destructive propagation.");
        }
      }
    }
    return this.finish(input.state, input.snapshots.length, operations);
  }
  classifyProvenMoves(snapshots, bases, operations, handled, nextIndex) {
    const byPath = new Map(snapshots.map((snapshot) => [String(snapshot.path), snapshot]));
    for (const prior of bases) {
      if (!prior.remoteObjectId) continue;
      const oldSnapshot = byPath.get(String(prior.path));
      if (!oldSnapshot || oldSnapshot.identity.status !== "unambiguous") continue;
      const remoteCandidates = snapshots.filter((snapshot) => snapshot.path !== prior.path && snapshot.identity.status === "unambiguous" && snapshot.remote.status === "present" && snapshot.remote.remoteObjectId === prior.remoteObjectId);
      const localCandidates = snapshots.filter((snapshot) => snapshot.path !== prior.path && snapshot.identity.status === "unambiguous" && strongHistoricalMatch(prior, snapshot));
      const oldRemoteGone = oldSnapshot.remote.status === "absent" && oldSnapshot.remoteEnumeration.status === "complete";
      const oldLocalGone = oldSnapshot.local.status === "absent";
      if (oldRemoteGone && oldSnapshot.local.status === "present") {
        if (remoteCandidates.length > 1) {
          operations.push(blocked(prior.path, nextIndex(), "ambiguous-remote-move", "Multiple current paths claim the same stable remote identity; identity reassignment is prohibited."));
          handled.add(String(prior.path));
          for (const candidate of remoteCandidates) handled.add(String(candidate.path));
          continue;
        }
        if (remoteCandidates.length === 1) {
          const target = remoteCandidates[0], targetRemote = observed(target, "remote");
          operations.push(makeOperation(target.path, nextIndex(), "identity-preserving-move", { targetSide: "local", fromPath: prior.path, toPath: target.path, remoteObjectId: prior.remoteObjectId, preconditions: [{ kind: "base-trusted" }, ...localVersionPreconditions(observed(oldSnapshot, "local")), ...remoteVersionPreconditions(targetRemote), { kind: "identity-unambiguous", path: target.path }], reasons: [{ code: "proven-remote-move", summary: "Stable remote object identity proves a remote rename/move." }] }));
          handled.add(String(prior.path));
          handled.add(String(target.path));
          continue;
        }
      }
      if (oldLocalGone && oldSnapshot.remote.status === "present") {
        if (localCandidates.length > 1) {
          operations.push(blocked(prior.path, nextIndex(), "ambiguous-local-move", "Multiple local paths match the same trusted historical identity/content evidence; the rename is not guessed."));
          handled.add(String(prior.path));
          for (const candidate of localCandidates) handled.add(String(candidate.path));
          continue;
        }
        if (localCandidates.length === 1) {
          const target = localCandidates[0], oldRemote = observed(oldSnapshot, "remote"), targetLocal = observed(target, "local");
          operations.push(makeOperation(target.path, nextIndex(), "identity-preserving-move", { targetSide: "remote", fromPath: prior.path, toPath: target.path, remoteObjectId: prior.remoteObjectId, preconditions: [{ kind: "base-trusted" }, ...remoteVersionPreconditions(oldRemote), ...localVersionPreconditions(targetLocal), { kind: "identity-unambiguous", path: target.path }], reasons: [{ code: "proven-local-move", summary: "Unique stable identity or trusted content evidence proves a local rename/move." }] }));
          handled.add(String(prior.path));
          handled.add(String(target.path));
        }
      }
    }
  }
  finish(state, totalManagedPaths, operations) {
    const safety = this.destructiveSafety.assess(operations, { totalManagedPaths, recentAverageDestructiveOperations: this.options.recentAverageDestructiveOperations, stateCondition: state.status === "trusted" ? "trusted" : state.status === "uninitialized" ? "reconstructed" : "untrusted" });
    const hasRecoveryRequired = operations.some((operation) => operation.kind === "recovery-required");
    let executionDisposition = "safe-auto-eligible";
    let globalExecutionGate2 = "none";
    if (hasRecoveryRequired) {
      executionDisposition = "blocked";
      globalExecutionGate2 = "globally-blocked";
    } else if (operations.some((operation) => operation.kind === "blocked-unsafe" || operation.kind === "unresolved-conflict") || safety.requiresApproval) executionDisposition = "requires-user-approval";
    if (!hasRecoveryRequired && safety.requiresApproval) globalExecutionGate2 = "destructive-approval-required";
    const trigger = this.options.trigger ?? "verify-reconcile";
    const recoveryCheckpointRequired = safety.recoveryCheckpointRequired;
    return { planId: semanticPlanId({ trigger, operations, executionDisposition, recoveryCheckpointRequired, globalExecutionGate: globalExecutionGate2 }), trigger, operations, executionDisposition, recoveryCheckpointRequired, globalExecutionGate: globalExecutionGate2 };
  }
};

// src/core/production-planner.ts
var ProductionSynchronizationPlanner = class {
  constructor(inner) {
    this.inner = inner;
  }
  inner;
  async plan(input) {
    const plan = await this.inner.plan(input);
    if (input.state.status !== "trusted") return plan;
    const trustedState = input.state.state;
    const currentDevice = trustedState.knownDevices.find((device) => device.deviceId === trustedState.deviceIdentity);
    if (!currentDevice?.stale || !plan.operations.some((operation) => operation.destructive)) return plan;
    if (plan.globalExecutionGate !== "none" || plan.recoveryCheckpointRequired) return plan;
    const operations = plan.operations.map((operation, index) => {
      if (!operation.destructive) return operation;
      return withSemanticOperationId({
        kind: "blocked-unsafe",
        path: operation.path,
        ...operation.fromPath ? { fromPath: operation.fromPath } : {},
        ...operation.toPath ? { toPath: operation.toPath } : {},
        destructive: false,
        preconditions: [],
        reasons: [{ code: "stale-device-destructive-gate", summary: "This device is stale and must reconcile before it can authorize destructive propagation." }]
      }, index);
    });
    const executionDisposition = "requires-user-approval";
    const globalExecutionGate2 = "none";
    return {
      ...plan,
      planId: semanticPlanId({ trigger: plan.trigger, operations, executionDisposition, recoveryCheckpointRequired: false, globalExecutionGate: globalExecutionGate2 }),
      operations,
      executionDisposition,
      recoveryCheckpointRequired: false,
      globalExecutionGate: globalExecutionGate2
    };
  }
};

// src/core/conflict-resolver.ts
var DEFAULT_TEXT_MERGE_RESOURCE_POLICY = {
  maximumInputBytesPerVersion: 512 * 1024,
  maximumCombinedInputBytes: 1536 * 1024
};
var DEFAULT_MAXIMUM_COMPARISON_CELLS = 4e6;
var textExtensions = /* @__PURE__ */ new Set([".md", ".txt"]);
function isSafelyRecognizedTextPath(path2) {
  const value2 = String(path2).toLowerCase();
  const dot = value2.lastIndexOf(".");
  return dot >= 0 && textExtensions.has(value2.slice(dot));
}
function provenance(source, version, deviceId) {
  return { source, version, deviceId, remoteObjectId: version.remoteObjectId, advisoryObservedAtMs: version.content?.advisoryModifiedTimeMs };
}
function stableConflictId(path2, kind) {
  return contractId(`conflict:${kind}:${String(path2)}`);
}
function exactContentMatch(a, b) {
  const ah = a.content?.hash;
  const bh = b.content?.hash;
  const as = a.content?.sizeBytes;
  const bs = b.content?.sizeBytes;
  return ah !== void 0 && bh !== void 0 && as !== void 0 && bs !== void 0 && ah === bh && as === bs;
}
function cancelled(signal) {
  return signal?.cancelled === true;
}
function lcsLengths(left, leftStart, leftEnd, right, rightStart, rightEnd, reverse, budget, signal) {
  const rightLength = rightEnd - rightStart;
  let previous = new Uint32Array(rightLength + 1);
  let current = new Uint32Array(rightLength + 1);
  const leftLength = leftEnd - leftStart;
  for (let li = 0; li < leftLength; li += 1) {
    if (cancelled(signal) || budget.exhausted) return void 0;
    current.fill(0);
    const leftIndex = reverse ? leftEnd - 1 - li : leftStart + li;
    for (let rj = 1; rj <= rightLength; rj += 1) {
      budget.remaining -= 1;
      if (budget.remaining < 0) {
        budget.exhausted = true;
        return void 0;
      }
      const rightIndex = reverse ? rightEnd - rj : rightStart + rj - 1;
      current[rj] = left[leftIndex] === right[rightIndex] ? previous[rj - 1] + 1 : Math.max(previous[rj], current[rj - 1]);
    }
    const swap = previous;
    previous = current;
    current = swap;
  }
  return previous;
}
function hirschbergMatches(base, baseStart, baseEnd, side, sideStart, sideEnd, budget, signal) {
  if (cancelled(signal) || budget.exhausted || baseStart >= baseEnd || sideStart >= sideEnd) return cancelled(signal) || budget.exhausted ? void 0 : [];
  if (baseEnd - baseStart === 1) {
    for (let j = sideStart; j < sideEnd; j += 1) {
      budget.remaining -= 1;
      if (budget.remaining < 0) {
        budget.exhausted = true;
        return void 0;
      }
      if (cancelled(signal)) return void 0;
      if (base[baseStart] === side[j]) return [{ baseIndex: baseStart, sideIndex: j }];
    }
    return [];
  }
  const middle = baseStart + Math.floor((baseEnd - baseStart) / 2);
  const forward = lcsLengths(base, baseStart, middle, side, sideStart, sideEnd, false, budget, signal);
  if (!forward) return void 0;
  const backward = lcsLengths(base, middle, baseEnd, side, sideStart, sideEnd, true, budget, signal);
  if (!backward) return void 0;
  const sideLength = sideEnd - sideStart;
  let splitOffset = 0;
  let best = -1;
  for (let offset = 0; offset <= sideLength; offset += 1) {
    const score = forward[offset] + backward[sideLength - offset];
    if (score > best) {
      best = score;
      splitOffset = offset;
    }
  }
  const sideMiddle = sideStart + splitOffset;
  const left = hirschbergMatches(base, baseStart, middle, side, sideStart, sideMiddle, budget, signal);
  if (!left) return void 0;
  const right = hirschbergMatches(base, middle, baseEnd, side, sideMiddle, sideEnd, budget, signal);
  return right ? [...left, ...right] : void 0;
}
function diffHunks(base, side, budget, signal) {
  const matches = hirschbergMatches(base, 0, base.length, side, 0, side.length, budget, signal);
  if (!matches) return void 0;
  const hunks = [];
  let baseCursor = 0;
  let sideCursor = 0;
  for (const match of matches) {
    if (match.baseIndex > baseCursor || match.sideIndex > sideCursor) {
      hunks.push({ start: baseCursor, end: match.baseIndex, replacement: side.slice(sideCursor, match.sideIndex) });
    }
    baseCursor = match.baseIndex + 1;
    sideCursor = match.sideIndex + 1;
  }
  if (baseCursor < base.length || sideCursor < side.length) {
    hunks.push({ start: baseCursor, end: base.length, replacement: side.slice(sideCursor) });
  }
  return hunks;
}
function sameReplacement(a, b) {
  return a.start === b.start && a.end === b.end && a.replacement.length === b.replacement.length && a.replacement.every((line, i) => line === b.replacement[i]);
}
function overlaps(a, b) {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  return a.start < b.end && b.start < a.end || a.start === a.end && a.start > b.start && a.start < b.end || b.start === b.end && b.start > a.start && b.start < a.end;
}
function mergeThreeWayText(baseText, localText, remoteText, options = {}) {
  if (cancelled(options.cancellation)) return { clean: false };
  if (localText === remoteText) return { clean: true, text: localText };
  if (localText === baseText) return { clean: true, text: remoteText };
  if (remoteText === baseText) return { clean: true, text: localText };
  const trailingNewline = baseText.endsWith("\n") || localText.endsWith("\n") || remoteText.endsWith("\n");
  const split = (value2) => {
    const lines = value2.split("\n");
    if (value2.endsWith("\n")) lines.pop();
    return lines;
  };
  const base = split(baseText);
  const budget = { remaining: options.maximumComparisonCells ?? DEFAULT_MAXIMUM_COMPARISON_CELLS, exhausted: false };
  const localHunks = diffHunks(base, split(localText), budget, options.cancellation);
  if (!localHunks) return { clean: false };
  const remoteHunks = diffHunks(base, split(remoteText), budget, options.cancellation);
  if (!remoteHunks || cancelled(options.cancellation)) return { clean: false };
  const combined = [...localHunks];
  for (const remote of remoteHunks) {
    const collision = combined.find((local) => overlaps(local, remote));
    if (collision) {
      if (!sameReplacement(collision, remote)) return { clean: false };
      continue;
    }
    combined.push(remote);
  }
  combined.sort((a, b) => b.start - a.start || b.end - a.end);
  const result = [...base];
  for (const hunk of combined) result.splice(hunk.start, hunk.end - hunk.start, ...hunk.replacement);
  return { clean: true, text: result.join("\n") + (trailingNewline ? "\n" : "") };
}
var ThreeWayConflictResolver = class {
  constructor(textProvider, mergedEvidence, localDeviceId, options = {}) {
    this.textProvider = textProvider;
    this.mergedEvidence = mergedEvidence;
    this.localDeviceId = localDeviceId;
    this.options = options;
    this.resourcePolicy = options.resourcePolicy ?? DEFAULT_TEXT_MERGE_RESOURCE_POLICY;
  }
  textProvider;
  mergedEvidence;
  localDeviceId;
  options;
  resourcePolicy;
  async assess(path2, base, local, remote) {
    if (!local || !remote) {
      if (base && (local || remote)) {
        const modifiedSide = local ? "local" : "remote";
        const modified = local ?? remote;
        return { kind: "delete-vs-modify", conflictId: stableConflictId(path2, "delete-modify"), path: path2, modifiedSide, modifiedVersion: provenance(modifiedSide, modified, modifiedSide === "local" ? this.localDeviceId : void 0), base: provenance("base", base) };
      }
      return { kind: "none" };
    }
    const preserved = { local: provenance("local", local, this.localDeviceId), remote: provenance("remote", remote), ...base ? { base: provenance("base", base) } : {} };
    if (!base || !isSafelyRecognizedTextPath(path2)) return { kind: "opaque-binary", conflictId: stableConflictId(path2, base ? "binary" : "no-base"), path: path2, preserved };
    const cleanFromVersion = (version) => ({
      kind: "clean-merge",
      path: path2,
      mergedVersion: { ...version, path: path2 },
      provenance: { base: provenance("base", base), local: preserved.local, remote: preserved.remote }
    });
    if (exactContentMatch(local, remote)) return cleanFromVersion(local);
    if (exactContentMatch(base, local)) return cleanFromVersion(remote);
    if (exactContentMatch(base, remote)) return cleanFromVersion(local);
    if (cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path2, "text-cancelled"), path: path2, preserved };
    const eligibility = assessTextMergeEligibility(
      [base.content?.sizeBytes, local.content?.sizeBytes, remote.content?.sizeBytes],
      this.resourcePolicy
    );
    if (eligibility.eligible === false) return { kind: "unresolved-text", conflictId: stableConflictId(path2, `text-${eligibility.reason}`), path: path2, preserved };
    const readOptions = { maximumBytes: this.resourcePolicy.maximumInputBytesPerVersion, cancellation: this.options.cancellation };
    const baseText = await this.textProvider.readText(base, readOptions);
    if (baseText === void 0 || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path2, "text-unavailable"), path: path2, preserved };
    const localText = await this.textProvider.readText(local, readOptions);
    if (localText === void 0 || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path2, "text-unavailable"), path: path2, preserved };
    const remoteText = await this.textProvider.readText(remote, readOptions);
    if (remoteText === void 0 || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path2, "text-unavailable"), path: path2, preserved };
    const merged = mergeThreeWayText(baseText, localText, remoteText, { cancellation: this.options.cancellation, maximumComparisonCells: this.options.maximumComparisonCells });
    if (!merged.clean || cancelled(this.options.cancellation)) return { kind: "unresolved-text", conflictId: stableConflictId(path2, "text"), path: path2, preserved };
    const evidence2 = await this.mergedEvidence?.evidenceFor(path2, merged.text);
    if (!evidence2?.hash || evidence2.sizeBytes === void 0) return { kind: "unresolved-text", conflictId: stableConflictId(path2, "text-evidence-unavailable"), path: path2, preserved };
    const mergedVersion = { path: path2, entityKind: local.entityKind, content: evidence2, remoteObjectId: remote.remoteObjectId };
    return { kind: "clean-merge", path: path2, mergedVersion, provenance: { base: provenance("base", base), local: preserved.local, remote: preserved.remote } };
  }
};

// src/drive/google-drive-port.ts
init_common();

// src/drive/transport.ts
var DEFAULT_RETRY_POLICY = { maxAttempts: 5, baseDelayMs: 500, maxDelayMs: 15e3, maxConcurrency: 3 };
var Semaphore = class {
  constructor(limit) {
    this.limit = limit;
  }
  limit;
  active = 0;
  waiting = [];
  async run(work) {
    if (this.active >= this.limit) await new Promise((resolve2) => this.waiting.push(resolve2));
    this.active++;
    try {
      return await work();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }
};
function retryAfterMs(response, nowMs) {
  const raw = response.headers.get("retry-after");
  if (!raw) return void 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - nowMs) : void 0;
}
async function errorReason(response) {
  try {
    const body = await response.clone().json();
    return body.error?.errors?.[0]?.reason ?? body.error?.status ?? body.error?.message ?? `http-${response.status}`;
  } catch {
    return `http-${response.status}`;
  }
}
function quotaReason(reason) {
  return /storageQuotaExceeded|quotaExceeded/i.test(reason) && !/rateLimit/i.test(reason);
}
function rateReason(reason) {
  return /rateLimitExceeded|userRateLimitExceeded|sharingRateLimitExceeded/i.test(reason);
}
function portableBody(body) {
  if (!(body instanceof Uint8Array)) return body;
  return body.slice().buffer;
}
var GoogleHttpTransport = class {
  constructor(oauth, fetcher = fetch, policy = DEFAULT_RETRY_POLICY, sleep3 = (ms) => new Promise((resolve2) => setTimeout(resolve2, ms)), random = Math.random, now = () => Date.now()) {
    this.oauth = oauth;
    this.fetcher = fetcher;
    this.policy = policy;
    this.sleep = sleep3;
    this.random = random;
    this.now = now;
    this.semaphore = new Semaphore(Math.max(1, policy.maxConcurrency));
  }
  oauth;
  fetcher;
  policy;
  sleep;
  random;
  now;
  semaphore;
  request(url, init = {}, retry = true) {
    return this.semaphore.run(async () => {
      for (let attempt = 0; attempt < this.policy.maxAttempts; attempt++) {
        const token = await this.oauth.accessToken();
        if (!token) return { ok: false, signal: { kind: "authentication-required", detail: "missing-or-expired-token" } };
        let response;
        try {
          const headers = new Headers(init.headers);
          headers.set("authorization", `Bearer ${token}`);
          const { body, ...rest } = init;
          response = await this.fetcher(url, { ...rest, headers, body: portableBody(body) });
        } catch {
          if (!retry || attempt + 1 >= this.policy.maxAttempts) return { ok: false, signal: { kind: "transient-failure", detail: "network-failure" } };
          await this.delay(attempt);
          continue;
        }
        if (response.ok || response.status === 308) return { ok: true, value: response };
        if (response.status === 401) {
          this.oauth.clearTokens();
          return { ok: false, signal: { kind: "authentication-required", detail: "google-rejected-token" } };
        }
        const reason = await errorReason(response);
        if (response.status === 404) return { ok: false, signal: { kind: "not-found" } };
        if (response.status === 409 || response.status === 412) return { ok: false, signal: { kind: "conflict", detail: reason } };
        if (response.status === 410) return { ok: false, signal: { kind: "recovery-required", detail: "drive-change-cursor-invalid" } };
        if (quotaReason(reason)) return { ok: false, signal: { kind: "quota-exhausted", detail: reason } };
        if (response.status === 429 || rateReason(reason)) {
          const serverDelay = retryAfterMs(response, this.now());
          if (!retry || attempt + 1 >= this.policy.maxAttempts) return { ok: false, signal: { kind: "rate-limited", retryAfterMs: serverDelay } };
          await this.delay(attempt, serverDelay);
          continue;
        }
        if (response.status === 403) return { ok: false, signal: { kind: "permission-denied", detail: reason } };
        if (response.status >= 500) {
          if (!retry || attempt + 1 >= this.policy.maxAttempts) return { ok: false, signal: { kind: "transient-failure", detail: reason } };
          await this.delay(attempt, retryAfterMs(response, this.now()));
          continue;
        }
        return { ok: false, signal: { kind: "transient-failure", detail: reason } };
      }
      return { ok: false, signal: { kind: "transient-failure", detail: "retry-budget-exhausted" } };
    });
  }
  async delay(attempt, minimum) {
    const exponential = Math.min(this.policy.maxDelayMs, this.policy.baseDelayMs * 2 ** attempt);
    const jittered = exponential * (0.5 + this.random() * 0.5);
    await this.sleep(Math.max(minimum ?? 0, jittered));
  }
};
var withRemoteId = (signal, id) => signal.kind === "not-found" ? { ...signal, remoteObjectId: id } : signal;

// src/drive/google-drive-port.ts
var DRIVE_API = "https://www.googleapis.com/drive/v3";
var DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
var FOLDER_MIME = "application/vnd.google-apps.folder";
var ROOT_ROLE = "brain-sync-root";
var CONTENT_ROLE = "brain-sync-content";
var PORTABLE_CONFIG_ROLE = "brain-sync-portable-config";
var PORTABLE_CONFIG_NAME = "__brain_sync_portable_config__";
var APP_ROLE = "brainSyncRole";
var APP_VAULT = "brainVaultIdentity";
var APP_PROTOCOL = "brainProtocolVersion";
var APP_MANAGED_ROOT = "brainManagedRootId";
var APP_DOMAIN = "brainSyncDomain";
var CONTENT_DOMAIN = "content";
var CONFIG_DOMAIN = "portable-config";
var ACCOUNT_SECRET = "brain-gdrive-paired-account";
var UPLOAD_CHUNK_BYTES = 256 * 1024;
var FIELDS = "id,name,mimeType,parents,trashed,size,sha256Checksum,md5Checksum,modifiedTime,version,appProperties";
var rid = (value2) => contractId(value2);
var vpath = (value2) => contractId(value2);
var cursor = (value2) => contractId(value2);
var pversion = (value2) => contractId(value2);
var hash = (value2) => contractId(value2);
var REMOTE_PROTOCOL_VERSION = pversion("1");
var escaped = (value2) => value2.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
var segmentName = (path2) => String(path2).split("/").filter(Boolean).at(-1) ?? "";
var parentPath = (path2) => vpath(String(path2).split("/").filter(Boolean).slice(0, -1).join("/"));
var joinPath = (parent, name) => vpath(parent ? `${parent}/${name}` : name);
var isConfigPath = (path2) => String(path2).startsWith(`${PORTABLE_CONFIG_NAME}/`);
var configRelativePath = (path2) => vpath(String(path2).slice(PORTABLE_CONFIG_NAME.length + 1));
var configLogicalPath = (relative2) => vpath(`${PORTABLE_CONFIG_NAME}/${String(relative2)}`);
var domainForLogicalPath = (path2) => isConfigPath(path2) ? CONFIG_DOMAIN : CONTENT_DOMAIN;
var pathComparisonKey = (path2) => String(path2).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "").normalize("NFC").toLocaleLowerCase("en-US");
function evidence(file) {
  return {
    ...file.sha256Checksum ? { hash: hash(`sha256:${file.sha256Checksum.toLowerCase()}`) } : {},
    ...file.size !== void 0 ? { sizeBytes: Number(file.size) } : {},
    ...file.version ? { revision: file.version } : {},
    ...file.modifiedTime ? { advisoryModifiedTimeMs: Date.parse(file.modifiedTime) } : {}
  };
}
function entry(path2, file) {
  return { path: path2, entityKind: file.mimeType === FOLDER_MIME ? "folder" : "file", remoteObjectId: rid(file.id), content: file.mimeType === FOLDER_MIME ? void 0 : evidence(file), trashed: Boolean(file.trashed) };
}
async function json(response) {
  return await response.json();
}
function partialReason(signal, fallback) {
  return signal.detail ?? signal.kind ?? fallback;
}
function streamSignalMessage(signal) {
  return "detail" in signal && signal.detail ? signal.detail : signal.kind;
}
function cancelled2(signal) {
  return Boolean(signal?.cancelled);
}
function canonicalMatches(file, proof) {
  const ev = evidence(file);
  return ev.sizeBytes === proof.sizeBytes && ev.hash === proof.hash;
}
function revisionMatches(file, expected) {
  return file.version === String(expected);
}
function failureFields(signal) {
  const operationalFailure = operationalFailureFromDriveSignalV1_3(signal);
  return operationalFailure ? { operationalFailure } : {};
}
function remoteMutationOutcomeWithDriveSignalV1_3(outcome, signal) {
  return { ...outcome, ...failureFields(signal) };
}
var DriveContentStreamError = class extends Error {
  driveSignal;
  constructor(signal) {
    super(`drive-download-${signal.kind}:${streamSignalMessage(signal)}`);
    this.name = "DriveContentStreamError";
    this.driveSignal = signal;
  }
};
function lazyDriveFailure(signal) {
  const provenance2 = operationalFailureFromDriveSignalV1_3(signal);
  return provenance2 ? new OperationalFailureErrorV1_3(provenance2, `drive-download-${signal.kind}:${streamSignalMessage(signal)}`) : new DriveContentStreamError(signal);
}
var GoogleDriveAdapter = class {
  constructor(oauth, transport, secrets) {
    this.oauth = oauth;
    this.transport = transport;
    this.secrets = secrets;
  }
  oauth;
  transport;
  secrets;
  pathCache = /* @__PURE__ */ new Map();
  async authenticationState() {
    const token = await this.oauth.accessToken();
    if (!token) return { status: "authentication-required", reason: "authorization-required" };
    const about = await this.transport.request(`${DRIVE_API}/about?fields=user(displayName,emailAddress,permissionId)`, {}, false);
    if (!about.ok) {
      if (about.signal.kind === "authentication-required") return { status: "authentication-required", reason: about.signal.detail };
      if (about.signal.kind === "transient-failure" || about.signal.kind === "rate-limited") return { status: "unavailable", reason: "service-unavailable" };
      return { status: "authentication-required", reason: "detail" in about.signal ? about.signal.detail ?? about.signal.kind : about.signal.kind };
    }
    const data = await json(about.value);
    const key = data.user?.permissionId ?? data.user?.emailAddress;
    const paired = this.secrets.get(ACCOUNT_SECRET);
    if (paired && key && paired !== key) return { status: "authentication-required", reason: "google-account-changed-repair-required" };
    return { status: "authenticated", ...data.user?.emailAddress || data.user?.displayName ? { accountHint: data.user.emailAddress ?? data.user.displayName } : {} };
  }
  async createManagedRoot(vaultIdentity, protocolVersion) {
    if (String(protocolVersion) !== String(REMOTE_PROTOCOL_VERSION)) return { ok: false, signal: { kind: "recovery-required", detail: "unsupported-remote-protocol-version" } };
    const auth = await this.currentAccountKey();
    if (!auth.ok) return auth;
    const created = await this.metadataCreate({ name: "BRAIN Sync", mimeType: FOLDER_MIME, appProperties: { [APP_ROLE]: ROOT_ROLE, [APP_VAULT]: String(vaultIdentity), [APP_PROTOCOL]: String(protocolVersion) } });
    if (!created.ok) return created;
    const rootId = rid(created.value.id);
    const content = await this.metadataCreate({ name: "vault", mimeType: FOLDER_MIME, parents: [created.value.id], appProperties: { [APP_ROLE]: CONTENT_ROLE } });
    if (!content.ok) return content;
    const config = await this.metadataCreate({ name: PORTABLE_CONFIG_NAME, mimeType: FOLDER_MIME, parents: [created.value.id], appProperties: { [APP_ROLE]: PORTABLE_CONFIG_ROLE } });
    if (!config.ok) return config;
    this.pathCache.clear();
    this.secrets.set(ACCOUNT_SECRET, auth.value);
    return { ok: true, value: { rootId, vaultIdentity, protocolVersion } };
  }
  async pairManagedRoot(rootId, expectedVaultIdentity) {
    const validation = await this.validateByExpected(rootId, expectedVaultIdentity);
    if (!validation.ok || validation.value.status !== "valid") return validation;
    const account = await this.currentAccountKey();
    if (!account.ok) return account;
    this.secrets.set(ACCOUNT_SECRET, account.value);
    return validation;
  }
  async validateManagedRoot(identity) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const result = await this.validateByExpected(identity.rootId, identity.vaultIdentity);
    if (!result.ok || result.value.status !== "valid") return result;
    if (String(result.value.identity.protocolVersion) !== String(identity.protocolVersion)) return { ok: true, value: { status: "incompatible-protocol", observedVersion: result.value.identity.protocolVersion } };
    return result;
  }
  async protocolInfo(rootId) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const file = await this.getFile(rootId);
    if (!file.ok) return file;
    const observed2 = file.value.appProperties?.[APP_PROTOCOL];
    if (!observed2) return { ok: false, signal: { kind: "recovery-required", detail: "remote-protocol-metadata-missing" } };
    return { ok: true, value: { currentVersion: pversion(observed2), compatible: observed2 === "1" } };
  }
  async listForReconciliation(rootId) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return roots;
    const entries = [];
    this.pathCache.clear();
    const ordinary = await this.listDomainReadOnly(roots.value.content.id, "", entries, { managedRootId: rootId, domain: CONTENT_DOMAIN });
    if (!ordinary.ok) {
      if (ordinary.signal.kind === "transient-failure" || ordinary.signal.kind === "rate-limited") return { ok: true, value: { entries, completeness: { status: "partial", reason: partialReason(ordinary.signal, "ordinary remote listing interrupted") } } };
      return ordinary;
    }
    const config = await this.listDomainReadOnly(roots.value.config.id, `${PORTABLE_CONFIG_NAME}/`, entries, { managedRootId: rootId, domain: CONFIG_DOMAIN });
    if (!config.ok) {
      if (config.signal.kind === "transient-failure" || config.signal.kind === "rate-limited") return { ok: true, value: { entries, completeness: { status: "partial", reason: partialReason(config.signal, "portable configuration listing interrupted") } } };
      return config;
    }
    const provenance2 = await this.validateManagedObjectProvenance(rootId, roots.value);
    if (!provenance2.ok) return provenance2;
    return { ok: true, value: { entries, completeness: { status: "complete" } } };
  }
  /** Explicit migration only; ordinary observation never calls this. */
  async migrateLegacyDomainProvenance(rootId) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return roots;
    let migrated = 0;
    for (const [root, domain] of [[roots.value.content, CONTENT_DOMAIN], [roots.value.config, CONFIG_DOMAIN]]) {
      const queue = [root.id];
      while (queue.length) {
        const parent = queue.shift();
        const children = await this.children(parent);
        if (!children.ok) return children;
        for (const file of children.value) {
          const before = file.appProperties?.[APP_MANAGED_ROOT] === String(rootId) && file.appProperties?.[APP_DOMAIN] === domain;
          const stamped = await this.ensureDomainProvenance(file, { managedRootId: rootId, domain });
          if (!stamped.ok) return stamped;
          if (!before) migrated++;
          if (file.mimeType === FOLDER_MIME) queue.push(file.id);
        }
      }
    }
    return { ok: true, value: migrated };
  }
  async getStartCursor(rootId) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return roots;
    const response = await this.transport.request(`${DRIVE_API}/changes/startPageToken?supportsAllDrives=false`);
    if (!response.ok) return response;
    const body = await json(response.value);
    return body.startPageToken ? { ok: true, value: cursor(body.startPageToken) } : { ok: false, signal: { kind: "recovery-required", detail: "drive-start-cursor-missing" } };
  }
  async readChangePage(identity, requestedToken, cancellation) {
    if (cancelled2(cancellation)) return { ok: false, signal: { kind: "transient-failure", detail: "synchronization-cancelled" } };
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const validated = await this.validateManagedRoot(identity);
    if (!validated.ok || validated.value.status !== "valid") return validated.ok ? { ok: false, signal: { kind: "recovery-required", detail: `managed-remote-${validated.value.status}` } } : validated;
    const roots = await this.domainRoots(identity.rootId);
    if (!roots.ok) return roots;
    const raw = await this.readChangeRaw(identity.rootId, roots.value, requestedToken, cancellation);
    if (!raw.ok) return raw;
    const classified = classifyRemoteChangePage({ requestedToken, changes: raw.value.changes, ...raw.value.nextPageToken ? { nextPageToken: cursor(raw.value.nextPageToken) } : {}, ...raw.value.newStartPageToken ? { newStartPageToken: cursor(raw.value.newStartPageToken) } : {} });
    return classified.status === "valid" ? { ok: true, value: classified.page } : { ok: false, signal: { kind: "recovery-required", detail: `drive-change-page-${classified.reason}` } };
  }
  async readChanges(rootId, changeCursor) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return roots;
    const raw = await this.readChangeRaw(rootId, roots.value, changeCursor);
    if (!raw.ok) return raw;
    if (raw.value.nextPageToken && raw.value.newStartPageToken) return { ok: false, signal: { kind: "recovery-required", detail: "drive-change-page-both-page-tokens-present" } };
    const next = raw.value.nextPageToken ?? raw.value.newStartPageToken;
    return next ? { ok: true, value: { changes: raw.value.changes, nextCursor: cursor(next), completeness: { status: "complete" } } } : { ok: false, signal: { kind: "recovery-required", detail: "drive-change-page-page-token-missing" } };
  }
  async readChangeRaw(rootId, roots, requestedToken, cancellation) {
    if (cancelled2(cancellation)) return { ok: false, signal: { kind: "transient-failure", detail: "synchronization-cancelled" } };
    const params = new URLSearchParams({ pageToken: String(requestedToken), spaces: "drive", pageSize: "1000", includeRemoved: "true", fields: `nextPageToken,newStartPageToken,changes(fileId,removed,file(${FIELDS}))` });
    const response = await this.transport.request(`${DRIVE_API}/changes?${params}`);
    if (!response.ok) return response;
    if (cancelled2(cancellation)) return { ok: false, signal: { kind: "transient-failure", detail: "synchronization-cancelled" } };
    const page = await json(response.value);
    const changes = [];
    for (const change of page.changes ?? []) {
      if ([String(rootId), roots.content.id, roots.config.id].includes(change.fileId)) {
        if (change.removed || change.file?.trashed) return { ok: false, signal: { kind: "recovery-required", detail: "managed-remote-root-structure-changed" } };
        continue;
      }
      if (change.removed || !change.file) {
        const lastKnownPath = this.pathCache.get(change.fileId);
        changes.push({ kind: "removed", remoteObjectId: rid(change.fileId), ...lastKnownPath ? { lastKnownPath } : {} });
        continue;
      }
      const p = await this.logicalPathForFile(change.file, roots);
      if (!p.ok) return p;
      if (!p.value) {
        const establishedRoot = change.file.appProperties?.[APP_MANAGED_ROOT];
        if (establishedRoot === String(rootId) || this.pathCache.has(change.fileId)) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-left-remote-domain:${change.fileId}` } };
        return { ok: false, signal: { kind: "recovery-required", detail: `drive-change-object-domain-unprovable:${change.fileId}` } };
      }
      const validation = this.validateFileProvenance(change.file, { managedRootId: rootId, domain: domainForLogicalPath(p.value) }, true);
      if (!validation.ok) return validation;
      this.pathCache.set(change.fileId, p.value);
      changes.push({ kind: "upsert", entry: entry(p.value, change.file) });
    }
    return { ok: true, value: { changes, ...page.nextPageToken ? { nextPageToken: page.nextPageToken } : {}, ...page.newStartPageToken ? { newStartPageToken: page.newStartPageToken } : {} } };
  }
  async observe(rootId, path2) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const resolution = await this.resolveLogicalPathCandidates(rootId, path2);
    if (!resolution.ok) return resolution;
    if (resolution.value.status === "ambiguous") return { ok: false, signal: { kind: "conflict", detail: `ambiguous-remote-path:${String(path2)}` } };
    if (resolution.value.status === "absent") return { ok: true, value: { status: "absent", side: "remote", path: path2 } };
    const file = resolution.value.file;
    const validation = this.validateFileProvenance(file, { managedRootId: rootId, domain: domainForLogicalPath(path2) }, true);
    if (!validation.ok) return validation;
    return { ok: true, value: { status: "present", side: "remote", path: path2, entityKind: file.mimeType === FOLDER_MIME ? "folder" : "file", remoteObjectId: rid(file.id), content: file.mimeType === FOLDER_MIME ? void 0 : evidence(file), stability: "stable" } };
  }
  async download(remoteObjectId) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const meta = await this.getFile(remoteObjectId);
    if (!meta.ok) return meta;
    if (meta.value.mimeType === FOLDER_MIME) return { ok: false, signal: { kind: "conflict", detail: "cannot-download-folder" } };
    return { ok: true, value: { content: this.rangeSource(remoteObjectId, meta.value), remoteObjectId, evidence: evidence(meta.value) } };
  }
  async downloadVersion(remoteObjectId, expectedRevision, expectedEvidence, cancellation) {
    if (cancelled2(cancellation)) return { ok: true, value: { status: "outcome-unknown", reason: "synchronization-cancelled" } };
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return this.coherentFailure(guard.signal, "coherent-read-auth");
    const before = await this.getFile(remoteObjectId);
    if (!before.ok) return this.coherentFailure(before.signal, "coherent-read-pre-observation");
    if (before.value.mimeType === FOLDER_MIME) return { ok: false, signal: { kind: "conflict", detail: "cannot-download-folder" } };
    if (!revisionMatches(before.value, expectedRevision) || !this.evidenceCompatible(evidence(before.value), expectedEvidence)) return { ok: true, value: { status: "changed-during-transfer", reason: "remote-version-or-evidence-precondition-mismatch" } };
    const self = this;
    const source = { ...before.value.size !== void 0 ? { sizeBytes: Number(before.value.size) } : {}, async *openChunks() {
      const hasher = new Sha256();
      let total = 0;
      for await (const bytes of self.rangeSource(remoteObjectId, before.value, cancellation).openChunks()) {
        if (cancelled2(cancellation)) throw new DriveContentStreamError({ kind: "transient-failure", detail: "synchronization-cancelled" });
        hasher.update(bytes);
        total += bytes.length;
        yield bytes;
      }
      const after = await self.getFile(remoteObjectId);
      if (!after.ok) throw lazyDriveFailure(withRemoteId(after.signal, remoteObjectId));
      const actualHash = hash(`sha256:${hasher.digestHex()}`);
      const expectedHash = expectedEvidence.hash ?? evidence(before.value).hash;
      if (!revisionMatches(after.value, expectedRevision) || after.value.version !== before.value.version || !self.evidenceCompatible(evidence(after.value), expectedEvidence) || expectedHash !== void 0 && actualHash !== expectedHash || expectedEvidence.sizeBytes !== void 0 && total !== expectedEvidence.sizeBytes) throw lazyDriveFailure({ kind: "recovery-required", detail: "remote-changed-during-coherent-download" });
    } };
    return { ok: true, value: { status: "coherent", remoteObjectId, revision: expectedRevision, evidence: evidence(before.value), content: source } };
  }
  async reserveFileCreateIdentity(root, intentId, path2, intendedContent2) {
    const valid = await this.validateManagedRoot(root);
    if (!valid.ok) return valid;
    if (valid.value.status !== "valid") return { ok: false, signal: { kind: "recovery-required", detail: `managed-remote-${valid.value.status}` } };
    if (intendedContent2.algorithm !== "sha256" || !String(intendedContent2.hash).startsWith("sha256:") || intendedContent2.sizeBytes < 0) return { ok: false, signal: { kind: "conflict", detail: "canonical-create-content-proof-required" } };
    const generated = await this.generateId();
    if (!generated.ok) return generated;
    return { ok: true, value: { kind: "reserved-file-create", intentId, reservedRemoteObjectId: generated.value, path: path2, intendedContent: intendedContent2 } };
  }
  async reserveFolderCreateIdentity(root, intentId, path2) {
    const valid = await this.validateManagedRoot(root);
    if (!valid.ok) return valid;
    if (valid.value.status !== "valid") return { ok: false, signal: { kind: "recovery-required", detail: `managed-remote-${valid.value.status}` } };
    const generated = await this.generateId();
    if (!generated.ok) return generated;
    return { ok: true, value: { kind: "reserved-folder-create", intentId, reservedRemoteObjectId: generated.value, path: path2 } };
  }
  async createReserved(identity, content, cancellation) {
    if (cancelled2(cancellation)) return { status: "verified-not-applied", reason: "synchronization-cancelled-before-dispatch" };
    const existing = await this.getFile(identity.reservedRemoteObjectId);
    if (existing.ok) return this.verifyReservedCreate(identity, existing.value);
    if (existing.signal.kind !== "not-found") return this.outcomeUnknown(existing.signal, "reserved-id-observation");
    const root = await this.uniqueManagedRoot();
    if (!root.ok) return this.outcomeUnknown(root.signal, "managed-root");
    const parent = await this.resolveUniqueParent(root.value.rootId, identity.path);
    if (!parent.ok) return this.outcomeFromSignal(parent.signal, "reserved-create-parent");
    if (!parent.value) return { status: "verified-not-applied", reason: "reserved-create-parent-absent" };
    const provenance2 = { managedRootId: root.value.rootId, domain: domainForLogicalPath(identity.path) };
    let dispatched;
    if (identity.kind === "reserved-folder-create") dispatched = await this.metadataCreate({ id: String(identity.reservedRemoteObjectId), name: segmentName(identity.path), mimeType: FOLDER_MIME, parents: [parent.value], appProperties: this.provenanceProperties(void 0, provenance2) });
    else {
      if (!content) return { status: "verified-not-applied", reason: "reserved-file-create-content-required" };
      if (content.sizeBytes !== void 0 && content.sizeBytes !== identity.intendedContent.sizeBytes) return { status: "verified-not-applied", reason: "reserved-file-create-size-precondition-mismatch" };
      dispatched = await this.resumableUpload("create", identity.reservedRemoteObjectId, identity.path, parent.value, content, { hash: identity.intendedContent.hash, sizeBytes: identity.intendedContent.sizeBytes }, provenance2);
    }
    if (cancelled2(cancellation)) return { status: "outcome-unknown", reason: "synchronization-cancelled-after-dispatch" };
    const observed2 = await this.getFile(identity.reservedRemoteObjectId);
    if (observed2.ok) return this.verifyReservedCreate(identity, observed2.value);
    if (!dispatched.ok && observed2.signal.kind === "not-found") return remoteMutationOutcomeWithDriveSignalV1_3({ status: "outcome-unknown", reason: `reserved-create-ambiguous:${dispatched.signal.kind}:reserved-id-absent-but-target-not-proven-clear` }, dispatched.signal);
    return this.outcomeUnknown(observed2.signal, "reserved-create-post-observation");
  }
  async updateExisting(identity, content, cancellation) {
    if (identity.updateProtocol !== "immutable-candidate-preservation") return { status: "outcome-unknown", reason: "unsupported-update-protocol" };
    if (cancelled2(cancellation)) return { status: "verified-not-applied", reason: "synchronization-cancelled-before-dispatch" };
    const predecessor = await this.getFile(identity.remoteObjectId);
    if (!predecessor.ok) return this.outcomeFromSignalValue(predecessor.signal, "update-predecessor");
    if (!revisionMatches(predecessor.value, identity.expectedRevision)) return { status: "conflict-preserved", reason: "remote-revision-precondition-failed", preservedRemoteObjectIds: [identity.remoteObjectId] };
    const root = await this.rootForFile(predecessor.value);
    if (root.ok === false) return this.outcomeUnknown(root.signal, "update-managed-root");
    if (!root.value) return { status: "outcome-unknown", reason: "update-managed-root-unprovable" };
    const roots = await this.domainRoots(root.value);
    if (!roots.ok) return this.outcomeUnknown(roots.signal, "update-domain");
    const actualPath = await this.logicalPathForFile(predecessor.value, roots.value);
    if (!actualPath.ok) return this.outcomeUnknown(actualPath.signal, "update-predecessor-path");
    if (!actualPath.value) return { status: "outcome-unknown", reason: "update-predecessor-path-unprovable" };
    if (actualPath.value !== identity.path || identity.identityAuthority.remoteObjectId !== identity.remoteObjectId || identity.identityAuthority.path !== identity.path) return { status: "conflict-preserved", reason: "update-identity-authority-mismatch", preservedRemoteObjectIds: [identity.remoteObjectId] };
    const candidateBefore = await this.getFile(identity.candidateRemoteObjectId);
    if (candidateBefore.ok) return this.verifyUpdateCandidate(identity, predecessor.value, candidateBefore.value, root.value);
    if (candidateBefore.signal.kind !== "not-found") return this.outcomeUnknown(candidateBefore.signal, "candidate-pre-observation");
    const parentId = predecessor.value.parents?.length === 1 ? predecessor.value.parents[0] : void 0;
    if (!parentId) return { status: "outcome-unknown", reason: "predecessor-parent-unobservable" };
    const provenance2 = { managedRootId: root.value, domain: domainForLogicalPath(identity.path) };
    const sent = await this.resumableUpload("create", identity.candidateRemoteObjectId, identity.path, parentId, content, { hash: identity.intendedContent.hash, sizeBytes: identity.intendedContent.sizeBytes }, provenance2);
    if (cancelled2(cancellation)) return { status: "outcome-unknown", reason: "synchronization-cancelled-after-candidate-dispatch" };
    const candidate = await this.getFile(identity.candidateRemoteObjectId);
    const predecessorAfter = await this.getFile(identity.remoteObjectId);
    if (!candidate.ok) {
      if (!sent.ok && candidate.signal.kind === "not-found") return remoteMutationOutcomeWithDriveSignalV1_3({ status: "outcome-unknown", reason: `candidate-dispatch-ambiguous:${sent.signal.kind}:candidate-absent-after-observation` }, sent.signal);
      return this.outcomeUnknown(candidate.signal, "candidate-post-observation");
    }
    if (!predecessorAfter.ok) return this.outcomeUnknown(predecessorAfter.signal, "predecessor-post-observation");
    return this.verifyUpdateCandidate(identity, predecessorAfter.value, candidate.value, root.value);
  }
  async moveExisting(identity, cancellation) {
    if (cancelled2(cancellation)) return { status: "verified-not-applied", reason: "synchronization-cancelled-before-dispatch" };
    if (identity.identityAuthority.remoteObjectId !== identity.remoteObjectId || identity.identityAuthority.path !== identity.fromPath) return { status: "outcome-unknown", reason: "move-identity-authority-inconsistent" };
    const file = await this.getFile(identity.remoteObjectId);
    if (!file.ok) return this.outcomeFromSignalValue(file.signal, "move-object");
    const root = await this.rootForFile(file.value);
    if (!root.ok) return this.outcomeUnknown(root.signal, "move-managed-root");
    if (!root.value) return { status: "outcome-unknown", reason: "move-managed-root-unprovable" };
    const roots = await this.domainRoots(root.value);
    if (!roots.ok) return this.outcomeUnknown(roots.signal, "move-domain");
    const actual = await this.logicalPathForFile(file.value, roots.value);
    if (!actual.ok) return this.outcomeUnknown(actual.signal, "move-source-path");
    if (!actual.value) return { status: "outcome-unknown", reason: "move-source-path-unprovable" };
    if (actual.value === identity.toPath) return this.moveVerified(identity, file.value);
    if (actual.value !== identity.fromPath) return { status: "conflict-preserved", reason: "move-source-no-longer-at-authorized-path", preservedRemoteObjectIds: [identity.remoteObjectId] };
    const targets = await this.resolveLogicalPathCandidates(root.value, identity.toPath);
    if (!targets.ok) return this.outcomeUnknown(targets.signal, "move-target");
    if (targets.value.status !== "absent") return { status: "conflict-preserved", reason: "move-target-occupied-or-ambiguous", preservedRemoteObjectIds: targets.value.files.map((f) => rid(f.id)) };
    const parent = await this.resolveUniqueParent(root.value, identity.toPath);
    if (!parent.ok) return this.outcomeFromSignalValue(parent.signal, "move-parent");
    if (!parent.value) return { status: "verified-not-applied", reason: "move-parent-absent" };
    const oldParents = (file.value.parents ?? []).join(",");
    const params = new URLSearchParams({ fields: FIELDS, addParents: parent.value });
    if (oldParents) params.set("removeParents", oldParents);
    const dispatched = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(identity.remoteObjectId))}?${params}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: segmentName(identity.toPath) }) });
    if (cancelled2(cancellation)) return { status: "outcome-unknown", reason: "synchronization-cancelled-after-move-dispatch" };
    const after = await this.getFile(identity.remoteObjectId);
    if (!after.ok) {
      if (!dispatched.ok) return remoteMutationOutcomeWithDriveSignalV1_3({ status: "outcome-unknown", reason: `move-post-observation-${after.signal.kind}` }, operationalFailureFromDriveSignalV1_3(after.signal) ? after.signal : dispatched.signal);
      return this.outcomeUnknown(after.signal, "move-post-observation");
    }
    const afterPath = await this.logicalPathForFile(after.value, roots.value);
    if (!afterPath.ok) return this.outcomeUnknown(afterPath.signal, "move-effect-verification");
    if (!afterPath.value) return { status: "outcome-unknown", reason: "move-effect-not-verifiable" };
    if (afterPath.value === identity.toPath) return this.moveVerified(identity, after.value);
    if (afterPath.value === identity.fromPath) {
      const safe = { status: "verified-not-applied", reason: "move-post-observation-still-at-source" };
      return !dispatched.ok ? remoteMutationOutcomeWithDriveSignalV1_3(safe, dispatched.signal) : safe;
    }
    return { status: "conflict-preserved", reason: "move-object-observed-at-unexpected-path", preservedRemoteObjectIds: [identity.remoteObjectId] };
  }
  async trashExisting(identity, cancellation) {
    if (cancelled2(cancellation)) return { status: "verified-not-applied", reason: "synchronization-cancelled-before-dispatch" };
    if (identity.identityAuthority.remoteObjectId !== identity.remoteObjectId || identity.identityAuthority.path !== identity.path || identity.baseAuthority.path !== identity.path) return { status: "outcome-unknown", reason: "trash-authority-inconsistent" };
    const before = await this.getFile(identity.remoteObjectId);
    if (!before.ok) return this.outcomeFromSignalValue(before.signal, "trash-object");
    if (before.value.trashed) return { status: "verified-effect", applicationProof: { kind: "trash", remoteObjectId: identity.remoteObjectId, path: identity.path, trashed: true } };
    const root = await this.rootForFile(before.value);
    if (!root.ok) return this.outcomeUnknown(root.signal, "trash-managed-root");
    if (!root.value) return { status: "outcome-unknown", reason: "trash-managed-root-unprovable" };
    const roots = await this.domainRoots(root.value);
    if (!roots.ok) return this.outcomeUnknown(roots.signal, "trash-domain");
    const actual = await this.logicalPathForFile(before.value, roots.value);
    if (!actual.ok) return this.outcomeUnknown(actual.signal, "trash-path");
    if (actual.value !== identity.path) return { status: "conflict-preserved", reason: "trash-object-no-longer-at-authorized-path", preservedRemoteObjectIds: [identity.remoteObjectId] };
    const dispatched = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(identity.remoteObjectId))}?fields=${encodeURIComponent(FIELDS)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) });
    if (cancelled2(cancellation)) return { status: "outcome-unknown", reason: "synchronization-cancelled-after-trash-dispatch" };
    const after = await this.getFile(identity.remoteObjectId);
    if (!after.ok) {
      if (!dispatched.ok) return remoteMutationOutcomeWithDriveSignalV1_3({ status: "outcome-unknown", reason: `trash-post-observation-${after.signal.kind}` }, operationalFailureFromDriveSignalV1_3(after.signal) ? after.signal : dispatched.signal);
      return this.outcomeUnknown(after.signal, "trash-post-observation");
    }
    if (after.value.trashed) return { status: "verified-effect", applicationProof: { kind: "trash", remoteObjectId: identity.remoteObjectId, path: identity.path, trashed: true } };
    const safe = { status: "verified-not-applied", reason: "trash-post-observation-not-trashed" };
    return !dispatched.ok ? remoteMutationOutcomeWithDriveSignalV1_3(safe, dispatched.signal) : safe;
  }
  async observeFolderCreateRecovery(descriptor, cancellation) {
    if (cancelled2(cancellation)) return { status: "unobservable", reason: "synchronization-cancelled" };
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return { status: "unobservable", reason: `authentication-or-remote-unavailable:${guard.signal.kind}` };
    const reserved = await this.getFile(descriptor.remoteMutation.reservedRemoteObjectId);
    if (reserved.ok) {
      if (cancelled2(cancellation)) return { status: "unobservable", reason: "synchronization-cancelled" };
      if (reserved.value.trashed) return { status: "unobservable", reason: "reserved-object-is-trashed" };
      if (reserved.value.parents?.length !== 1) return { status: "unobservable", reason: "reserved-object-parent-identity-incomplete" };
      const root2 = await this.rootForFile(reserved.value);
      if (!root2.ok || !root2.value) return { status: "unobservable", reason: "reserved-object-managed-root-unprovable" };
      const roots = await this.domainRoots(root2.value);
      if (!roots.ok) return { status: "unobservable", reason: `managed-domain-unobservable:${roots.signal.kind}` };
      const actualPath = await this.logicalPathForFile(reserved.value, roots.value);
      if (!actualPath.ok || !actualPath.value) return { status: "unobservable", reason: "reserved-object-structural-path-unprovable" };
      if (reserved.value.mimeType !== FOLDER_MIME) return { status: "occupied", targetPath: actualPath.value, pathComparisonKey: pathComparisonKey(actualPath.value), remoteObjectId: rid(reserved.value.id), entityKind: "file" };
      return { status: "folder", targetPath: actualPath.value, pathComparisonKey: pathComparisonKey(actualPath.value), remoteObjectId: rid(reserved.value.id), parentRemoteObjectId: rid(reserved.value.parents[0]) };
    }
    if (reserved.signal.kind !== "not-found") return { status: "unobservable", reason: `reserved-object-absence-unproven:${reserved.signal.kind}` };
    if (cancelled2(cancellation)) return { status: "unobservable", reason: "synchronization-cancelled" };
    const root = await this.uniqueManagedRoot();
    if (!root.ok) return { status: "unobservable", reason: `managed-root-unobservable:${root.signal.kind}` };
    const parent = await this.resolveUniqueParent(root.value.rootId, descriptor.targetPath);
    if (!parent.ok) return { status: "unobservable", reason: `target-parent-unobservable:${parent.signal.kind}` };
    if (!parent.value) return { status: "authoritative-absent", reservedRemoteObjectId: descriptor.remoteMutation.reservedRemoteObjectId };
    const matches = await this.children(parent.value, segmentName(descriptor.targetPath));
    if (!matches.ok) return { status: "unobservable", reason: `target-child-unobservable:${matches.signal.kind}` };
    if (matches.value.length === 0) return { status: "authoritative-absent", reservedRemoteObjectId: descriptor.remoteMutation.reservedRemoteObjectId };
    if (matches.value.length > 1) return { status: "unobservable", reason: "ambiguous-logical-path:multiple-candidates" };
    const file = matches.value[0];
    return { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: pathComparisonKey(descriptor.targetPath), remoteObjectId: rid(file.id), entityKind: file.mimeType === FOLDER_MIME ? "folder" : "file" };
  }
  async create(rootId, request) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const domain = await this.domainForPath(rootId, request.path);
    if (!domain.ok) return domain;
    const provenance2 = { managedRootId: rootId, domain: domainForLogicalPath(request.path) };
    const relative2 = isConfigPath(request.path) ? configRelativePath(request.path) : request.path;
    const parent = await this.ensureParentFrom(domain.value.id, parentPath(relative2), provenance2);
    if (!parent.ok) return parent;
    if (request.entityKind === "folder") {
      const created = await this.metadataCreate({ name: segmentName(relative2), mimeType: FOLDER_MIME, parents: [parent.value], appProperties: this.provenanceProperties(void 0, provenance2) });
      if (!created.ok) return created;
      return { ok: true, value: { remoteObjectId: rid(created.value.id), path: request.path } };
    }
    if (!request.content) return { ok: false, signal: { kind: "conflict", detail: "file-create-content-required" } };
    return this.resumableUpload("create", void 0, request.path, parent.value, request.content, request.expectedEvidence, provenance2);
  }
  async update(request) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const existing = await this.getFile(request.remoteObjectId);
    if (!existing.ok) return existing;
    if (request.expectedRemoteRevision && existing.value.version !== request.expectedRemoteRevision) return { ok: false, signal: { kind: "conflict", detail: "remote-revision-precondition-failed" } };
    const domain = await this.domainForPathFromExisting(request.path, existing.value);
    if (!domain.ok) return domain;
    return this.resumableUpload("update", request.remoteObjectId, request.path, existing.value.parents?.[0], request.content, request.expectedEvidence);
  }
  async move(remoteObjectId, _fromPath, toPath) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const file = await this.getFile(remoteObjectId);
    if (!file.ok) return file;
    const domain = await this.domainForPathFromExisting(toPath, file.value);
    if (!domain.ok) return domain;
    const relative2 = isConfigPath(toPath) ? configRelativePath(toPath) : toPath;
    const root = await this.rootForFile(file.value);
    if (!root.ok || !root.value) return { ok: false, signal: { kind: "recovery-required", detail: "managed-object-outside-remote-domain" } };
    const provenance2 = { managedRootId: root.value, domain: domainForLogicalPath(toPath) };
    const parent = await this.ensureParentFrom(domain.value.id, parentPath(relative2), provenance2);
    if (!parent.ok) return parent;
    const oldParents = (file.value.parents ?? []).join(",");
    const params = new URLSearchParams({ fields: FIELDS, addParents: parent.value });
    if (oldParents) params.set("removeParents", oldParents);
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(remoteObjectId))}?${params}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: segmentName(relative2), appProperties: this.provenanceProperties(file.value.appProperties, provenance2) }) });
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, remoteObjectId) };
    const moved = await json(response.value);
    return { ok: true, value: { remoteObjectId: rid(moved.id), path: toPath, evidence: moved.mimeType === FOLDER_MIME ? void 0 : evidence(moved) } };
  }
  async trash(remoteObjectId) {
    const guard = await this.guardPairedAccount();
    if (!guard.ok) return guard;
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(remoteObjectId))}?fields=id,trashed`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) });
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, remoteObjectId) };
    return { ok: true, value: void 0 };
  }
  coherentFailure(signal, prefix) {
    const operationalFailure = operationalFailureFromDriveSignalV1_3(signal);
    return operationalFailure ? { ok: true, value: { status: "outcome-unknown", reason: `${prefix}:${signal.kind}`, operationalFailure } } : { ok: false, signal };
  }
  outcomeUnknown(signal, prefix) {
    return remoteMutationOutcomeWithDriveSignalV1_3({ status: "outcome-unknown", reason: `${prefix}:${signal.kind}` }, signal);
  }
  async verifyReservedCreate(identity, file) {
    if (file.trashed) return { status: "conflict-preserved", reason: "reserved-object-is-trashed", preservedRemoteObjectIds: [rid(file.id)] };
    if (rid(file.id) !== identity.reservedRemoteObjectId) return { status: "outcome-unknown", reason: "reserved-object-id-mismatch" };
    const root = await this.rootForFile(file);
    if (!root.ok) return this.outcomeUnknown(root.signal, "reserved-object-managed-root");
    if (!root.value) return { status: "outcome-unknown", reason: "reserved-object-managed-root-unprovable" };
    const roots = await this.domainRoots(root.value);
    if (!roots.ok) return this.outcomeUnknown(roots.signal, "reserved-object-domain");
    const actualPath = await this.logicalPathForFile(file, roots.value);
    if (!actualPath.ok) return this.outcomeUnknown(actualPath.signal, "reserved-object-path");
    if (!actualPath.value) return { status: "outcome-unknown", reason: "reserved-object-path-unprovable" };
    if (actualPath.value !== identity.path) return { status: "conflict-preserved", reason: "reserved-object-observed-at-unintended-path", preservedRemoteObjectIds: [rid(file.id)] };
    if (identity.kind === "reserved-folder-create") {
      if (file.mimeType !== FOLDER_MIME) return { status: "conflict-preserved", reason: "reserved-folder-id-occupied-by-file", preservedRemoteObjectIds: [rid(file.id)] };
      return { status: "verified-effect", receipt: { remoteObjectId: rid(file.id), path: actualPath.value }, applicationProof: { kind: "reserved-create", remoteObjectId: rid(file.id), path: actualPath.value } };
    }
    if (file.mimeType === FOLDER_MIME || !canonicalMatches(file, identity.intendedContent)) return { status: "conflict-preserved", reason: "reserved-file-content-or-kind-mismatch", preservedRemoteObjectIds: [rid(file.id)] };
    return { status: "verified-effect", receipt: { remoteObjectId: rid(file.id), path: actualPath.value, evidence: evidence(file) }, applicationProof: { kind: "reserved-create", remoteObjectId: rid(file.id), path: actualPath.value, verifiedContent: identity.intendedContent } };
  }
  async verifyUpdateCandidate(identity, predecessor, candidate, rootId) {
    if (predecessor.trashed || !revisionMatches(predecessor, identity.expectedRevision) || predecessor.id !== String(identity.remoteObjectId)) return { status: "conflict-preserved", reason: "predecessor-not-preserved-at-expected-revision", preservedRemoteObjectIds: [rid(predecessor.id), rid(candidate.id)] };
    if (candidate.trashed || candidate.id !== String(identity.candidateRemoteObjectId) || !canonicalMatches(candidate, identity.intendedContent)) return { status: "conflict-preserved", reason: "candidate-content-not-authoritatively-verified", preservedRemoteObjectIds: [rid(predecessor.id), rid(candidate.id)] };
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return this.outcomeUnknown(roots.signal, "candidate-domain");
    const candidatePath = await this.logicalPathForFile(candidate, roots.value);
    if (!candidatePath.ok) return this.outcomeUnknown(candidatePath.signal, "candidate-path");
    if (candidatePath.value !== identity.path) return { status: "conflict-preserved", reason: "candidate-observed-at-unintended-path", preservedRemoteObjectIds: [rid(predecessor.id), rid(candidate.id)] };
    const resolution = await this.resolveLogicalPathCandidates(rootId, identity.path);
    if (!resolution.ok) return this.outcomeUnknown(resolution.signal, "update-path");
    const preserved = resolution.value.files.map((f) => rid(f.id));
    if (!preserved.includes(identity.remoteObjectId)) preserved.push(identity.remoteObjectId);
    if (!preserved.includes(identity.candidateRemoteObjectId)) preserved.push(identity.candidateRemoteObjectId);
    return { status: "verified-effect", receipt: { remoteObjectId: identity.candidateRemoteObjectId, path: identity.path, evidence: evidence(candidate) }, applicationProof: { kind: "immutable-candidate-preservation", candidateRemoteObjectId: identity.candidateRemoteObjectId, predecessorRemoteObjectId: identity.remoteObjectId, predecessorRevision: identity.expectedRevision, intendedContent: identity.intendedContent, verifiedContent: identity.intendedContent, preservedRemoteObjectIds: preserved } };
  }
  moveVerified(identity, file) {
    return { status: "verified-effect", receipt: { remoteObjectId: identity.remoteObjectId, path: identity.toPath, evidence: file.mimeType === FOLDER_MIME ? void 0 : evidence(file) }, applicationProof: { kind: "identity-preserving-move", remoteObjectId: identity.remoteObjectId, fromPath: identity.fromPath, toPath: identity.toPath } };
  }
  outcomeFromSignal(signal, prefix) {
    if (signal.kind === "conflict") return { status: "conflict-preserved", reason: `${prefix}:${signal.detail}`, preservedRemoteObjectIds: [] };
    if (signal.kind === "not-found") return { status: "verified-not-applied", reason: `${prefix}:not-found` };
    return this.outcomeUnknown(signal, prefix);
  }
  outcomeFromSignalValue(signal, prefix) {
    return this.outcomeFromSignal(signal, prefix);
  }
  evidenceCompatible(actual, expected) {
    return (expected.hash === void 0 || actual.hash === expected.hash) && (expected.sizeBytes === void 0 || actual.sizeBytes === expected.sizeBytes) && (expected.revision === void 0 || actual.revision === expected.revision);
  }
  rangeSource(remoteObjectId, meta, cancellation) {
    const size = meta.size !== void 0 ? Number(meta.size) : void 0;
    const self = this;
    return { ...size !== void 0 ? { sizeBytes: size } : {}, async *openChunks() {
      if (size === 0) return;
      let offset = 0;
      while (size === void 0 || offset < size) {
        if (cancelled2(cancellation)) throw new DriveContentStreamError({ kind: "transient-failure", detail: "synchronization-cancelled" });
        const end = size === void 0 ? offset + UPLOAD_CHUNK_BYTES - 1 : Math.min(size - 1, offset + UPLOAD_CHUNK_BYTES - 1);
        const result = await self.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(remoteObjectId))}?alt=media`, { headers: { range: `bytes=${offset}-${end}` } });
        if (!result.ok) throw lazyDriveFailure(withRemoteId(result.signal, remoteObjectId));
        const bytes = new Uint8Array(await result.value.arrayBuffer());
        if (!bytes.length) break;
        yield bytes;
        offset += bytes.length;
        if (size === void 0 && bytes.length < UPLOAD_CHUNK_BYTES) break;
      }
    } };
  }
  async generateId() {
    const response = await this.transport.request(`${DRIVE_API}/files/generateIds?count=1&space=drive&type=files`);
    if (!response.ok) return response;
    const body = await json(response.value);
    const value2 = body.ids?.[0];
    return value2 ? { ok: true, value: rid(value2) } : { ok: false, signal: { kind: "recovery-required", detail: "drive-generated-id-missing" } };
  }
  async uniqueManagedRoot() {
    const params = new URLSearchParams({ q: `appProperties has { key='${APP_ROLE}' and value='${ROOT_ROLE}' } and trashed=false`, fields: `files(${FIELDS})`, spaces: "drive", pageSize: "1000" });
    const response = await this.transport.request(`${DRIVE_API}/files?${params}`);
    if (!response.ok) return response;
    const roots = (await json(response.value)).files ?? [];
    if (roots.length !== 1) return { ok: false, signal: { kind: "recovery-required", detail: roots.length ? "managed-root-ambiguous" : "managed-root-missing" } };
    const file = roots[0], vaultId = file.appProperties?.[APP_VAULT], protocol = file.appProperties?.[APP_PROTOCOL];
    if (!vaultId || !protocol) return { ok: false, signal: { kind: "recovery-required", detail: "managed-root-identity-incomplete" } };
    return { ok: true, value: { rootId: rid(file.id), vaultIdentity: contractId(vaultId), protocolVersion: pversion(protocol) } };
  }
  async validateByExpected(rootId, expected) {
    const file = await this.getFile(rootId);
    if (!file.ok) return file.signal.kind === "not-found" ? { ok: true, value: { status: "missing-root" } } : file;
    if (file.value.trashed || file.value.mimeType !== FOLDER_MIME || file.value.appProperties?.[APP_ROLE] !== ROOT_ROLE) return { ok: true, value: { status: "missing-root" } };
    const observedVault = file.value.appProperties?.[APP_VAULT], observedProtocol = file.value.appProperties?.[APP_PROTOCOL];
    if (!observedVault) return { ok: true, value: { status: "ambiguous", reason: "managed-root-vault-identity-missing" } };
    if (observedVault !== String(expected)) return { ok: true, value: { status: "identity-mismatch", observedVaultIdentity: contractId(observedVault) } };
    if (!observedProtocol) return { ok: true, value: { status: "ambiguous", reason: "managed-root-protocol-version-missing" } };
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) {
      if (roots.signal.kind === "recovery-required" || roots.signal.kind === "conflict") return { ok: true, value: { status: "ambiguous", reason: "detail" in roots.signal ? roots.signal.detail : "managed-remote-domain-ambiguous" } };
      return roots;
    }
    const version = pversion(observedProtocol);
    if (observedProtocol !== "1") return { ok: true, value: { status: "incompatible-protocol", observedVersion: version } };
    return { ok: true, value: { status: "valid", identity: { rootId, vaultIdentity: expected, protocolVersion: version } } };
  }
  async guardPairedAccount() {
    const paired = this.secrets.get(ACCOUNT_SECRET);
    if (!paired) return { ok: false, signal: { kind: "authentication-required", detail: "explicit-remote-pairing-required" } };
    const current = await this.currentAccountKey();
    if (!current.ok) return current;
    return current.value === paired ? { ok: true, value: void 0 } : { ok: false, signal: { kind: "authentication-required", detail: "google-account-changed-repair-required" } };
  }
  async currentAccountKey() {
    const response = await this.transport.request(`${DRIVE_API}/about?fields=user(emailAddress,permissionId)`, {}, false);
    if (!response.ok) return response;
    const data = await json(response.value), key = data.user?.permissionId ?? data.user?.emailAddress;
    return key ? { ok: true, value: key } : { ok: false, signal: { kind: "authentication-required", detail: "google-account-identity-unavailable" } };
  }
  async getFile(id) {
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(id))}?fields=${encodeURIComponent(FIELDS)}`);
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, id) };
    return { ok: true, value: await json(response.value) };
  }
  async metadataCreate(metadata) {
    const response = await this.transport.request(`${DRIVE_API}/files?fields=${encodeURIComponent(FIELDS)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(metadata) });
    if (!response.ok) return response;
    return { ok: true, value: await json(response.value) };
  }
  async contentRoot(rootId) {
    const params = new URLSearchParams({ q: `'${escaped(String(rootId))}' in parents and appProperties has { key='${APP_ROLE}' and value='${CONTENT_ROLE}' }`, fields: `files(${FIELDS})`, spaces: "drive" });
    const response = await this.transport.request(`${DRIVE_API}/files?${params}`);
    if (!response.ok) return response;
    const files = (await json(response.value)).files ?? [];
    if (files.length !== 1 || files[0].trashed || files[0].mimeType !== FOLDER_MIME) return { ok: false, signal: { kind: "recovery-required", detail: files.length > 1 ? "managed-content-root-ambiguous" : "managed-content-root-missing" } };
    return { ok: true, value: files[0] };
  }
  async portableConfigRoot(rootId) {
    const matches = await this.children(String(rootId), PORTABLE_CONFIG_NAME);
    if (!matches.ok) return matches;
    const live = matches.value.filter((file) => !file.trashed);
    if (live.some((file) => file.appProperties?.[APP_ROLE] !== PORTABLE_CONFIG_ROLE)) return { ok: false, signal: { kind: "conflict", detail: "portable-config-namespace-unmarked-or-ambiguous" } };
    const marked = live.filter((file) => file.appProperties?.[APP_ROLE] === PORTABLE_CONFIG_ROLE && file.mimeType === FOLDER_MIME);
    if (marked.length !== 1 || marked.length !== live.length) return { ok: false, signal: { kind: "recovery-required", detail: marked.length > 1 ? "portable-config-root-ambiguous" : "portable-config-root-missing" } };
    return { ok: true, value: marked[0] };
  }
  async domainRoots(rootId) {
    const root = await this.getFile(rootId);
    if (!root.ok) return root;
    if (root.value.trashed || root.value.appProperties?.[APP_ROLE] !== ROOT_ROLE) return { ok: false, signal: { kind: "recovery-required", detail: "managed-remote-root-missing-or-invalid" } };
    const content = await this.contentRoot(rootId);
    if (!content.ok) return content;
    const config = await this.portableConfigRoot(rootId);
    if (!config.ok) return config;
    return { ok: true, value: { content: content.value, config: config.value } };
  }
  async domainForPath(rootId, path2) {
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return roots;
    return { ok: true, value: isConfigPath(path2) ? roots.value.config : roots.value.content };
  }
  async domainForPathFromExisting(path2, file) {
    const root = await this.rootForFile(file);
    if (!root.ok || !root.value) return { ok: false, signal: { kind: "recovery-required", detail: "managed-object-outside-remote-domain" } };
    const roots = await this.domainRoots(root.value);
    if (!roots.ok) return roots;
    const current = await this.findDomainAncestor(file, roots.value);
    if (!current.ok) return current;
    const wanted = isConfigPath(path2) ? roots.value.config : roots.value.content;
    if (current.value.id !== wanted.id) return { ok: false, signal: { kind: "conflict", detail: "cross-domain-config-vault-reclassification-refused" } };
    const provenance2 = await this.ensureDomainProvenance(file, { managedRootId: root.value, domain: domainForLogicalPath(path2) });
    if (!provenance2.ok) return provenance2;
    return { ok: true, value: wanted };
  }
  async listDomainReadOnly(rootId, prefix, entries, provenance2) {
    const queue = [{ id: rootId, path: "" }];
    while (queue.length) {
      const current = queue.shift();
      let pageToken;
      do {
        const params = new URLSearchParams({ q: `'${escaped(current.id)}' in parents and trashed=false`, fields: `nextPageToken,files(${FIELDS})`, spaces: "drive", pageSize: "1000" });
        if (pageToken) params.set("pageToken", pageToken);
        const response = await this.transport.request(`${DRIVE_API}/files?${params}`);
        if (!response.ok) return response;
        const page = await json(response.value);
        for (const file of page.files ?? []) {
          const validation = this.validateFileProvenance(file, provenance2, true);
          if (!validation.ok) return validation;
          const relative2 = joinPath(current.path, file.name ?? "");
          if (provenance2.domain === CONTENT_DOMAIN && current.id === rootId && file.name === PORTABLE_CONFIG_NAME) {
            const collision = vpath(PORTABLE_CONFIG_NAME);
            entries.push(entry(collision, file));
            this.pathCache.set(file.id, collision);
            continue;
          }
          const logical = vpath(`${prefix}${String(relative2)}`);
          entries.push(entry(logical, file));
          this.pathCache.set(file.id, logical);
          if (file.mimeType === FOLDER_MIME) queue.push({ id: file.id, path: String(relative2) });
        }
        pageToken = page.nextPageToken;
      } while (pageToken);
    }
    return { ok: true, value: void 0 };
  }
  async children(parentId, name) {
    const files = [];
    let pageToken;
    do {
      let q = `'${escaped(parentId)}' in parents and trashed=false`;
      if (name !== void 0) q += ` and name='${escaped(name)}'`;
      const params = new URLSearchParams({ q, fields: `nextPageToken,files(${FIELDS})`, spaces: "drive", pageSize: "1000" });
      if (pageToken) params.set("pageToken", pageToken);
      const response = await this.transport.request(`${DRIVE_API}/files?${params}`);
      if (!response.ok) return response;
      const page = await json(response.value);
      files.push(...page.files ?? []);
      pageToken = page.nextPageToken;
    } while (pageToken);
    return { ok: true, value: files };
  }
  async resolveLogicalPathCandidates(rootId, path2) {
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return roots;
    let root;
    let relative2;
    if (String(path2) === PORTABLE_CONFIG_NAME) {
      root = roots.value.content;
      relative2 = path2;
    } else if (isConfigPath(path2)) {
      root = roots.value.config;
      relative2 = configRelativePath(path2);
    } else {
      root = roots.value.content;
      relative2 = path2;
    }
    let parents = [root];
    const segments = String(relative2).split("/").filter(Boolean);
    if (!segments.length) return { ok: true, value: { status: "unique", file: root, files: [root] } };
    for (const [index, segment] of segments.entries()) {
      const next = [];
      for (const parent of parents) {
        const matches = await this.children(parent.id, segment);
        if (!matches.ok) return matches;
        next.push(...matches.value);
      }
      if (!next.length) return { ok: true, value: { status: "absent", files: [] } };
      if (index < segments.length - 1 && next.some((file) => file.mimeType !== FOLDER_MIME)) return { ok: false, signal: { kind: "conflict", detail: `non-folder-parent:${segment}` } };
      parents = next.filter((file) => index === segments.length - 1 || file.mimeType === FOLDER_MIME);
    }
    const dedup = [...new Map(parents.map((file) => [file.id, file])).values()];
    return dedup.length === 1 ? { ok: true, value: { status: "unique", file: dedup[0], files: dedup } } : { ok: true, value: { status: "ambiguous", files: dedup } };
  }
  async resolveUniqueParent(rootId, path2) {
    const wanted = parentPath(isConfigPath(path2) ? configRelativePath(path2) : path2);
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) return roots;
    const domain = isConfigPath(path2) ? roots.value.config : roots.value.content;
    if (!String(wanted)) return { ok: true, value: domain.id };
    let parents = [domain];
    for (const segment of String(wanted).split("/").filter(Boolean)) {
      const next = [];
      for (const parent of parents) {
        const matches = await this.children(parent.id, segment);
        if (!matches.ok) return matches;
        next.push(...matches.value.filter((f) => f.mimeType === FOLDER_MIME));
      }
      const dedup = [...new Map(next.map((file) => [file.id, file])).values()];
      if (dedup.length === 0) return { ok: true, value: void 0 };
      if (dedup.length > 1) return { ok: false, signal: { kind: "conflict", detail: `ambiguous-parent-path:${String(wanted)}` } };
      parents = dedup;
    }
    return { ok: true, value: parents[0].id };
  }
  async ensureParentFrom(rootId, path2, provenance2) {
    let parent = rootId;
    for (const segment of String(path2).split("/").filter(Boolean)) {
      const matches = await this.children(parent, segment);
      if (!matches.ok) return matches;
      const folders = matches.value.filter((file) => file.mimeType === FOLDER_MIME);
      if (matches.value.length > 1 || matches.value.length === 1 && folders.length !== 1) return { ok: false, signal: { kind: "conflict", detail: `ambiguous-parent-path:${String(path2)}` } };
      if (folders.length === 1) {
        const stamped = await this.ensureDomainProvenance(folders[0], provenance2);
        if (!stamped.ok) return stamped;
        parent = stamped.value.id;
      } else {
        const created = await this.metadataCreate({ name: segment, mimeType: FOLDER_MIME, parents: [parent], appProperties: this.provenanceProperties(void 0, provenance2) });
        if (!created.ok) return created;
        parent = created.value.id;
      }
    }
    return { ok: true, value: parent };
  }
  async logicalPathForFile(file, roots) {
    const config = await this.pathForFile(file, roots.config.id);
    if (!config.ok) return config;
    if (config.value) return { ok: true, value: configLogicalPath(config.value) };
    return this.pathForFile(file, roots.content.id);
  }
  async pathForFile(file, domainRootId) {
    const names = [file.name ?? ""];
    let current = file;
    const visited = /* @__PURE__ */ new Set();
    while (true) {
      if ((current.parents?.length ?? 0) > 1) return { ok: false, signal: { kind: "recovery-required", detail: "remote-parent-identity-ambiguous" } };
      const parentId = current.parents?.[0];
      if (!parentId) return { ok: true, value: void 0 };
      if (parentId === domainRootId) return { ok: true, value: vpath(names.reverse().join("/")) };
      if (visited.has(parentId)) return { ok: false, signal: { kind: "recovery-required", detail: "remote-parent-cycle" } };
      visited.add(parentId);
      const parent = await this.getFile(rid(parentId));
      if (!parent.ok) return parent.signal.kind === "not-found" ? { ok: true, value: void 0 } : parent;
      if (parent.value.appProperties?.[APP_ROLE] === ROOT_ROLE) return { ok: true, value: void 0 };
      names.push(parent.value.name ?? "");
      current = parent.value;
    }
  }
  async rootForFile(file) {
    let current = file;
    const visited = /* @__PURE__ */ new Set();
    while (current.parents?.length === 1) {
      const parentId = current.parents[0];
      if (visited.has(parentId)) return { ok: false, signal: { kind: "recovery-required", detail: "remote-parent-cycle" } };
      visited.add(parentId);
      const parent = await this.getFile(rid(parentId));
      if (!parent.ok) return parent.signal.kind === "not-found" ? { ok: true, value: void 0 } : parent;
      if (parent.value.appProperties?.[APP_ROLE] === ROOT_ROLE) return { ok: true, value: rid(parent.value.id) };
      current = parent.value;
    }
    return { ok: true, value: void 0 };
  }
  async findDomainAncestor(file, roots) {
    let current = file;
    const visited = /* @__PURE__ */ new Set();
    while (current.parents?.length === 1) {
      const parentId = current.parents[0];
      if (parentId === roots.content.id) return { ok: true, value: roots.content };
      if (parentId === roots.config.id) return { ok: true, value: roots.config };
      if (visited.has(parentId)) return { ok: false, signal: { kind: "recovery-required", detail: "remote-parent-cycle" } };
      visited.add(parentId);
      const parent = await this.getFile(rid(parentId));
      if (!parent.ok) return parent;
      current = parent.value;
    }
    return { ok: false, signal: { kind: "recovery-required", detail: "managed-object-domain-unprovable" } };
  }
  provenanceProperties(existing, provenance2) {
    return { ...existing ?? {}, [APP_MANAGED_ROOT]: String(provenance2.managedRootId), [APP_DOMAIN]: provenance2.domain };
  }
  validateFileProvenance(file, expected, allowLegacyMissing = false) {
    const establishedRoot = file.appProperties?.[APP_MANAGED_ROOT], establishedDomain = file.appProperties?.[APP_DOMAIN];
    if (!establishedRoot && !establishedDomain && allowLegacyMissing) return { ok: true, value: void 0 };
    if (establishedRoot && establishedRoot !== String(expected.managedRootId)) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-root-provenance-mismatch:${file.id}` } };
    if (establishedDomain && establishedDomain !== expected.domain) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-cross-domain-reclassification:${file.id}:${establishedDomain}->${expected.domain}` } };
    if (establishedRoot && !establishedDomain || !establishedRoot && establishedDomain) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-domain-provenance-incomplete:${file.id}` } };
    return { ok: true, value: void 0 };
  }
  async ensureDomainProvenance(file, provenance2) {
    const validation = this.validateFileProvenance(file, provenance2, true);
    if (!validation.ok) return validation;
    if (file.appProperties?.[APP_MANAGED_ROOT] === String(provenance2.managedRootId) && file.appProperties?.[APP_DOMAIN] === provenance2.domain) return { ok: true, value: file };
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(file.id)}?fields=${encodeURIComponent(FIELDS)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ appProperties: this.provenanceProperties(file.appProperties, provenance2) }) });
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, rid(file.id)) };
    return { ok: true, value: await json(response.value) };
  }
  async managedObjectsForRoot(rootId) {
    const files = [];
    let pageToken;
    do {
      const params = new URLSearchParams({ q: `appProperties has { key='${APP_MANAGED_ROOT}' and value='${escaped(String(rootId))}' } and trashed=false`, fields: `nextPageToken,files(${FIELDS})`, spaces: "drive", pageSize: "1000" });
      if (pageToken) params.set("pageToken", pageToken);
      const response = await this.transport.request(`${DRIVE_API}/files?${params}`);
      if (!response.ok) return response;
      const page = await json(response.value);
      files.push(...page.files ?? []);
      pageToken = page.nextPageToken;
    } while (pageToken);
    return { ok: true, value: files };
  }
  async validateManagedObjectProvenance(rootId, roots) {
    const managed = await this.managedObjectsForRoot(rootId);
    if (!managed.ok) return managed;
    for (const file of managed.value) {
      const established = file.appProperties?.[APP_DOMAIN];
      if (established !== CONTENT_DOMAIN && established !== CONFIG_DOMAIN) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-domain-provenance-invalid:${file.id}` } };
      const actual = await this.findDomainAncestor(file, roots);
      if (!actual.ok) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-left-remote-domain:${file.id}` } };
      const expectedRoot = established === CONTENT_DOMAIN ? roots.content.id : roots.config.id;
      if (actual.value.id !== expectedRoot) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-cross-domain-reclassification:${file.id}:${established}` } };
    }
    return { ok: true, value: void 0 };
  }
  async resumableUpload(mode, objectId, path2, parentId, content, expected, provenance2) {
    const logicalName = isConfigPath(path2) ? configRelativePath(path2) : path2;
    const metadata = { name: segmentName(logicalName) };
    if (mode === "create" && parentId) metadata.parents = [parentId];
    if (mode === "create" && objectId) metadata.id = String(objectId);
    if (mode === "create" && provenance2) metadata.appProperties = this.provenanceProperties(void 0, provenance2);
    const endpoint = mode === "create" ? `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=${encodeURIComponent(FIELDS)}` : `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(String(objectId))}?uploadType=resumable&fields=${encodeURIComponent(FIELDS)}`;
    const initHeaders = { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "application/octet-stream" };
    if (content.sizeBytes !== void 0) initHeaders["x-upload-content-length"] = String(content.sizeBytes);
    const init = await this.transport.request(endpoint, { method: mode === "create" ? "POST" : "PATCH", headers: initHeaders, body: JSON.stringify(metadata) });
    if (!init.ok) return init;
    const location = init.value.headers.get("location");
    if (!location) return { ok: false, signal: { kind: "transient-failure", detail: "resumable-session-location-missing" } };
    let offset = 0, finalResponse;
    for await (const part of rechunk(content, UPLOAD_CHUNK_BYTES)) {
      const end = offset + part.bytes.length - 1, total = part.final ? String(offset + part.bytes.length) : "*";
      const sent = await this.transport.request(location, { method: "PUT", headers: { "content-type": "application/octet-stream", "content-range": `bytes ${offset}-${end}/${total}` }, body: part.bytes }, false);
      if (!sent.ok) {
        const status = await this.queryUploadOffset(location, content.sizeBytes);
        if (!status.ok) return sent;
        if (status.value.completed) {
          finalResponse = status.value.response;
          break;
        }
        if (status.value.offset === end + 1 && !part.final) {
          finalResponse = new Response(null, { status: 308 });
          offset += part.bytes.length;
          continue;
        }
        if (status.value.offset !== offset) return { ok: false, signal: { kind: "recovery-required", detail: "ambiguous-resumable-upload-offset" } };
        const retry = await this.transport.request(location, { method: "PUT", headers: { "content-type": "application/octet-stream", "content-range": `bytes ${offset}-${end}/${total}` }, body: part.bytes });
        if (!retry.ok) return retry;
        finalResponse = retry.value;
      } else finalResponse = sent.value;
      if (finalResponse.status === 308) {
        offset += part.bytes.length;
        continue;
      }
      offset += part.bytes.length;
      break;
    }
    if (content.sizeBytes === 0) {
      const sent = await this.transport.request(location, { method: "PUT", headers: { "content-length": "0", "content-range": "bytes */0" }, body: new Uint8Array() });
      if (!sent.ok) return sent;
      finalResponse = sent.value;
    }
    if (!finalResponse || finalResponse.status === 308) return { ok: false, signal: { kind: "transient-failure", detail: "resumable-upload-incomplete" } };
    const uploaded = await json(finalResponse), ev = evidence(uploaded);
    if (expected?.sizeBytes !== void 0 && ev.sizeBytes !== expected.sizeBytes) return { ok: false, signal: { kind: "recovery-required", detail: "uploaded-size-integrity-mismatch" } };
    if (expected?.hash && String(expected.hash).startsWith("sha256:") && String(expected.hash) !== String(ev.hash ?? "")) return { ok: false, signal: { kind: "recovery-required", detail: "uploaded-hash-integrity-mismatch" } };
    this.pathCache.set(uploaded.id, path2);
    return { ok: true, value: { remoteObjectId: rid(uploaded.id), path: path2, evidence: ev } };
  }
  async queryUploadOffset(location, total) {
    const response = await this.transport.request(location, { method: "PUT", headers: { "content-length": "0", "content-range": `bytes */${total ?? "*"}` } }, false);
    if (!response.ok) return response;
    if (response.value.status !== 308) return { ok: true, value: { offset: total ?? 0, completed: true, response: response.value } };
    const range = response.value.headers.get("range"), end = range ? Number(range.split("-").at(-1)) : -1;
    return { ok: true, value: { offset: Number.isFinite(end) ? end + 1 : 0, completed: false } };
  }
};
async function* rechunk(source, size) {
  let pending = new Uint8Array(0);
  for await (const input of source.openChunks()) {
    if (!input.length) continue;
    const combined = new Uint8Array(pending.length + input.length);
    combined.set(pending);
    combined.set(input, pending.length);
    pending = combined;
    while (pending.length > size) {
      yield { bytes: pending.slice(0, size), final: false };
      pending = pending.slice(size);
    }
  }
  if (pending.length) yield { bytes: pending, final: true };
}

// src/drive/obsidian-http.ts
function headerRecord(headers) {
  const record = {};
  new Headers(headers).forEach((value2, key) => {
    record[key] = value2;
  });
  return record;
}
function requestBody(body) {
  if (body == null) return void 0;
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return body;
  if (ArrayBuffer.isView(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
  throw new Error("unsupported-obsidian-request-url-body");
}
function createObsidianRequestUrlFetcher(requestUrl2) {
  return async (input, init = {}) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const result = await requestUrl2({ url, method: init.method, headers: headerRecord(init.headers), body: requestBody(init.body), throw: false });
    return new Response(result.arrayBuffer, { status: result.status, headers: result.headers });
  };
}

// src/drive/runtime.ts
function createObsidianGoogleDriveBoundary(options) {
  const secrets = new ObsidianSecretStore(options.secretStorage);
  const fetcher = createObsidianRequestUrlFetcher(options.requestUrl);
  const oauth = new GoogleOAuthSession(options.oauth, secrets, fetcher);
  const transport = new GoogleHttpTransport(oauth, fetcher, options.retryPolicy);
  return { oauth, drive: new GoogleDriveAdapter(oauth, transport, secrets) };
}

// src/product/runtime.ts
init_obsidian_local_vault();

// src/local/mobile-vault-access-boundary.ts
init_path_policy();
var MobileVaultAccessBoundary = class {
  kind = "mobile-adapter";
  async assertSafe(path2, _access) {
    const validation = validateCrossPlatformPath(path2);
    if (validation.status === "blocked") {
      throw new Error(`Mobile vault access boundary blocked ${validation.reason}${validation.detail ? `: ${validation.detail}` : ""}`);
    }
  }
};

// src/state/indexeddb-state-storage.ts
var STATE_KEY = "current-state";
var STORE_NAME = "sync-state";
function clone(bytes) {
  return bytes.slice();
}
function equal(a, b) {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
function requestResult(request) {
  return new Promise((resolve2, reject) => {
    request.onsuccess = () => resolve2(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}
function transactionComplete(transaction) {
  return new Promise((resolve2, reject) => {
    transaction.oncomplete = () => resolve2();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}
function randomId() {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) throw new Error("secure random generation is unavailable");
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
var IndexedDbStateByteStorage = class {
  constructor(databaseName = "brain-google-drive-sync", indexedDb = globalThis.indexedDB) {
    this.databaseName = databaseName;
    this.indexedDb = indexedDb;
    if (!indexedDb) throw new Error("IndexedDB is unavailable in this runtime");
  }
  databaseName;
  indexedDb;
  database;
  async read() {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const value2 = await requestResult(transaction.objectStore(STORE_NAME).get(STATE_KEY));
    await transactionComplete(transaction);
    return value2 ? clone(value2) : void 0;
  }
  async write(bytes) {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(clone(bytes), STATE_KEY);
    await transactionComplete(transaction);
  }
  async compareAndSwap(expected, replacement) {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const current = await requestResult(store.get(STATE_KEY));
    const matched = equal(current, expected);
    if (matched) store.put(clone(replacement), STATE_KEY);
    await transactionComplete(transaction);
    return matched;
  }
  async backup(bytes) {
    const database = await this.open();
    const backupId = `backup:${randomId()}`;
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(clone(bytes), backupId);
    await transactionComplete(transaction);
    return backupId;
  }
  open() {
    this.database ??= new Promise((resolve2, reject) => {
      const request = this.indexedDb.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve2(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open synchronization state database"));
      request.onblocked = () => reject(new Error("Synchronization state database upgrade is blocked"));
    });
    return this.database;
  }
};

// src/state/persistent-state-store.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var stages = ["intent-persisted", "dispatch-authorized", "outcome-unknown", "effect-verified", "state-committed"];
function checksum(value2) {
  let hash2 = 2166136261;
  for (let i = 0; i < value2.length; i += 1) {
    hash2 ^= value2.charCodeAt(i);
    hash2 = Math.imul(hash2, 16777619) >>> 0;
  }
  return `fnv1a32:${hash2.toString(16).padStart(8, "0")}`;
}
function isString(value2) {
  return typeof value2 === "string" && value2.length > 0;
}
function isPathString(value2) {
  return typeof value2 === "string";
}
function isRecord(value2) {
  return typeof value2 === "object" && value2 !== null;
}
function unique(values) {
  return new Set(values).size === values.length;
}
function bytesEqual(a, b) {
  if (!a || !b) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}
function nextBrandedRevision(current, brand) {
  const match = /^(.*?)(\d+)$/.exec(current);
  const next = match ? `${match[1]}${Number(match[2]) + 1}` : `${current}:1`;
  return contractId(next);
}
function nextPersistenceRevision(current) {
  return nextBrandedRevision(String(current), "StateRevision");
}
function nextSemanticGeneration(current) {
  return nextBrandedRevision(String(current), "SemanticStateGeneration");
}
function validateLegacyStateShape(state) {
  if (!isRecord(state)) return false;
  if (!Number.isInteger(state.schemaVersion) || !isString(state.stateRevision) || !isString(state.vaultIdentity) || !isString(state.deviceIdentity)) return false;
  if (!Array.isArray(state.base) || !Array.isArray(state.remoteMappings) || !Array.isArray(state.tombstones) || !Array.isArray(state.operations) || !Array.isArray(state.knownDevices)) return false;
  const basePaths = state.base.map((entry2) => isRecord(entry2) ? String(entry2.path ?? "") : "");
  const mappingIds = state.remoteMappings.map((entry2) => isRecord(entry2) ? String(entry2.remoteObjectId ?? "") : "");
  const operationIds = state.operations.map((entry2) => isRecord(entry2) ? String(entry2.operationId ?? "") : "");
  const deviceIds = state.knownDevices.map((entry2) => isRecord(entry2) ? String(entry2.deviceId ?? "") : "");
  if (basePaths.some((path2) => path2.length === 0) || mappingIds.some((id) => id.length === 0) || operationIds.some((id) => id.length === 0) || deviceIds.some((id) => id.length === 0)) return false;
  return unique(basePaths) && unique(mappingIds) && unique(operationIds) && unique(deviceIds);
}
function hasAuthorityMarker(state) {
  return isRecord(state) && Object.prototype.hasOwnProperty.call(state, "authoritySchemaVersion");
}
function isStage(value2) {
  return typeof value2 === "string" && stages.includes(value2);
}
function isFolderDescriptorShape(descriptor) {
  if (!isRecord(descriptor)) return false;
  if (descriptor.kind !== "local-folder-create" && descriptor.kind !== "remote-folder-create") return false;
  if (!isString(descriptor.intentId) || !isPathString(descriptor.targetPath) || descriptor.mutationKind !== "create") return false;
  if (!isRecord(descriptor.pathAuthority)) return false;
  const authority = descriptor.pathAuthority;
  if (!isString(authority.generation) || !isPathString(authority.targetPath) || !isPathString(authority.parentPath) || !isString(authority.pathComparisonKey) || authority.expectedTarget !== "absent") return false;
  if (descriptor.kind === "local-folder-create") return descriptor.targetSide === "local";
  if (descriptor.targetSide !== "remote" || !isString(descriptor.parentRemoteObjectId) || !isRecord(descriptor.remoteMutation)) return false;
  const mutation = descriptor.remoteMutation;
  return mutation.kind === "reserved-folder-create" && isString(mutation.intentId) && isString(mutation.reservedRemoteObjectId) && isPathString(mutation.path);
}
function isV1DescriptorShape(descriptor) {
  if (!isRecord(descriptor) || !isString(descriptor.kind)) return false;
  return ["local-file", "remote-file", "move", "trash"].includes(descriptor.kind);
}
function isEffectV1_1Shape(effect) {
  if (!isRecord(effect) || !isString(effect.effectId) || !isStage(effect.stage)) return false;
  if (!isRecord(effect.descriptor)) return false;
  return isFolderDescriptorShape(effect.descriptor) || isV1DescriptorShape(effect.descriptor);
}
function isIntentV1_1Shape(intent) {
  if (!isRecord(intent) || !isString(intent.operationId) || !isString(intent.intentId) || !isRecord(intent.semanticAuthority) || !isString(intent.semanticAuthority.generation) || !Array.isArray(intent.effects)) return false;
  if (intent.logicalKind === "single-effect" && intent.effects.length !== 1) return false;
  if (intent.logicalKind === "clean-text-merge" && intent.effects.length < 2) return false;
  if (intent.logicalKind !== "single-effect" && intent.logicalKind !== "clean-text-merge") return false;
  return intent.effects.every(isEffectV1_1Shape);
}
function isAuthorityCommonShape(state) {
  if (!validateLegacyStateShape(state) || !isRecord(state)) return false;
  return isString(state.persistenceRevision) && state.persistenceRevision === state.stateRevision && isString(state.semanticGeneration) && Array.isArray(state.learnedRemoteBatches) && Array.isArray(state.pathConvergence) && Array.isArray(state.operationIntents) && Array.isArray(state.localTransactions) && Array.isArray(state.baseAuthority) && Array.isArray(state.learnedRemoteReductions);
}
function isDurableSynchronizationAuthorityStateV1(state) {
  if (!isAuthorityCommonShape(state) || !isRecord(state) || state.authoritySchemaVersion !== 1) return false;
  return state.operationIntents.every((intent) => {
    if (!isRecord(intent) || !Array.isArray(intent.effects)) return false;
    return intent.effects.every((effect) => isRecord(effect) && isRecord(effect.descriptor) && !["local-folder-create", "remote-folder-create"].includes(String(effect.descriptor.kind)));
  });
}
function isDurableSynchronizationAuthorityState(state) {
  return isAuthorityCommonShape(state) && isRecord(state) && state.authoritySchemaVersion === 2 && state.operationIntents.every(isIntentV1_1Shape);
}
function parseEnvelope(bytes) {
  const raw = decoder.decode(bytes);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const trimmed = raw.trim();
    return { status: trimmed.startsWith("{") && !trimmed.endsWith("}") ? "truncated" : "malformed", detail: error instanceof Error ? error.message : "invalid JSON" };
  }
  if (!isRecord(parsed)) return { status: "malformed", detail: "state envelope must be an object" };
  const envelope = parsed;
  if (envelope.envelopeVersion !== 1 || !isString(envelope.checksum) || !validateLegacyStateShape(envelope.state)) return { status: "internally-inconsistent", detail: "state envelope or required state fields are inconsistent" };
  const payload = JSON.stringify(envelope.state);
  if (checksum(payload) !== envelope.checksum) return { status: "integrity-check-failed", detail: "persisted state checksum does not match payload" };
  return { status: "ok", envelope };
}
function serialize(state) {
  const payload = JSON.stringify(state);
  return encoder.encode(JSON.stringify({ envelopeVersion: 1, checksum: checksum(payload), state }));
}
function semanticProjection(state) {
  return JSON.stringify({ vaultIdentity: state.vaultIdentity, deviceIdentity: state.deviceIdentity, base: state.base, baseAuthority: state.baseAuthority, remoteMappings: state.remoteMappings, tombstones: state.tombstones, changeCursor: state.changeCursor, learnedRemoteBatches: state.learnedRemoteBatches, learnedRemoteReductions: state.learnedRemoteReductions, pathConvergence: state.pathConvergence, knownDevices: state.knownDevices });
}
function sameSemanticAuthority(a, b) {
  return semanticProjection(a) === semanticProjection(b);
}
function issue(code, detail, path2, invariantCategory) {
  return { code, detail, ...path2 ? { path: path2 } : {}, ...invariantCategory ? { invariantCategory } : {} };
}
function folderJournalIssues(intent, effect) {
  const descriptor = effect.descriptor;
  if (descriptor.kind !== "local-folder-create" && descriptor.kind !== "remote-folder-create") return [];
  const issues = [];
  if (!folderCreateDescriptorIsSelfConsistent(descriptor)) issues.push(issue("other-semantic-inconsistency", "folder-create descriptor is internally inconsistent", descriptor.targetPath, "folder-journal-descriptor"));
  if (descriptor.intentId !== intent.intentId) issues.push(issue("journal-reference-incomplete", "folder descriptor intent identity disagrees with operation intent", descriptor.targetPath, "folder-journal-intent"));
  if (descriptor.targetPath !== descriptor.pathAuthority.targetPath || descriptor.pathAuthority.generation !== intent.semanticAuthority.generation) issues.push(issue("other-semantic-inconsistency", "folder target/path authority disagrees with durable operation authority", descriptor.targetPath, "folder-path-authority"));
  if (descriptor.kind === "remote-folder-create") {
    if (descriptor.remoteMutation.intentId !== descriptor.intentId || descriptor.remoteMutation.path !== descriptor.targetPath) issues.push(issue("other-semantic-inconsistency", "reserved remote folder mutation identity disagrees with descriptor path/intent", descriptor.targetPath, "folder-remote-identity"));
    if (!isString(descriptor.parentRemoteObjectId) || !isString(descriptor.remoteMutation.reservedRemoteObjectId)) issues.push(issue("other-semantic-inconsistency", "remote folder-create durable identity is incomplete", descriptor.targetPath, "folder-remote-identity"));
  }
  return issues;
}
var DurableSemanticStateValidator = class {
  constructor(extensionChecks = []) {
    this.extensionChecks = extensionChecks;
  }
  extensionChecks;
  validate(state) {
    const issues = [];
    const active = state.knownDevices.filter((device) => device.deviceId === state.deviceIdentity);
    if (active.length !== 1) issues.push(issue("active-device-missing", "active installation must appear exactly once in known-device authority", void 0, "device-authority"));
    const basePaths = state.base.map((entry2) => String(entry2.path));
    if (!unique(basePaths)) issues.push(issue("duplicate-base-path", "BASE contains duplicate logical paths", void 0, "base-uniqueness"));
    const mappingObjectIds = state.remoteMappings.map((mapping) => String(mapping.remoteObjectId));
    const mappingPaths = state.remoteMappings.map((mapping) => String(mapping.path));
    if (!unique(mappingObjectIds) || !unique(mappingPaths)) issues.push(issue("duplicate-remote-object-mapping", "remote mappings are not one-to-one", void 0, "remote-identity"));
    for (const mapping of state.remoteMappings) {
      const base = state.base.find((entry2) => entry2.path === mapping.path);
      if (!base || !base.remoteExisted || base.remoteObjectId && base.remoteObjectId !== mapping.remoteObjectId || base.entityKind !== mapping.entityKind) issues.push(issue("mapping-base-disagreement", "remote mapping disagrees with durable BASE authority", mapping.path, "mapping-base-consistency"));
    }
    for (const tombstone of state.tombstones) if (state.base.some((base) => base.path === tombstone.path)) issues.push(issue("base-tombstone-overlap", "a path cannot be both BASE-present and tombstoned", tombstone.path, "deletion-authority"));
    const baseAuthorityPaths = state.baseAuthority.map((entry2) => String(entry2.path));
    if (!unique(baseAuthorityPaths)) issues.push(issue("other-semantic-inconsistency", "BASE fingerprint authority contains duplicate paths", void 0, "base-fingerprint-uniqueness"));
    for (const authority of state.baseAuthority) if (!state.base.some((base) => base.path === authority.path)) issues.push(issue("other-semantic-inconsistency", "BASE fingerprint has no corresponding BASE entry", authority.path, "base-fingerprint-orphan"));
    const operationIds = state.operationIntents.map((intent) => String(intent.operationId));
    if (!unique(operationIds)) issues.push(issue("journal-reference-incomplete", "recoverable operation journal contains duplicate operation IDs", void 0, "journal-identity"));
    for (const intent of state.operationIntents) {
      const effectIds = intent.effects.map((effect) => effect.effectId);
      if (!unique(effectIds)) issues.push(issue("journal-reference-incomplete", "recoverable operation contains duplicate effect IDs", void 0, "journal-effects"));
      for (const effect of intent.effects) {
        if ((effect.stage === "effect-verified" || effect.stage === "state-committed") && !isString(effect.verificationEvidenceRef)) issues.push(issue("journal-reference-incomplete", "verified/committed effect lacks durable verification reference", void 0, "journal-verification"));
        issues.push(...folderJournalIssues(intent, effect));
      }
    }
    const batchIds = state.learnedRemoteBatches.map((batch) => String(batch.checkpoint.batchId));
    if (!unique(batchIds)) issues.push(issue("ingestion-checkpoint-inconsistent", "learned remote backlog contains duplicate batch IDs", void 0, "remote-ingestion"));
    const reductionIds = state.learnedRemoteReductions.map((reduction) => String(reduction.batchId));
    if (!unique(reductionIds)) issues.push(issue("ingestion-checkpoint-inconsistent", "remote-batch reductions contain duplicate batch IDs", void 0, "remote-ingestion"));
    for (const reduction of state.learnedRemoteReductions) {
      if (!state.learnedRemoteBatches.some((batch) => batch.checkpoint.batchId === reduction.batchId) && !reduction.complete) issues.push(issue("ingestion-checkpoint-inconsistent", "incomplete reduction references a batch no longer retained", void 0, "remote-ingestion"));
      if (reduction.complete && reduction.durableFactRefs.some((ref) => !isString(ref))) issues.push(issue("ingestion-checkpoint-inconsistent", "completed reduction contains an invalid durable fact reference", void 0, "remote-ingestion"));
    }
    if (state.persistenceRevision !== state.stateRevision) issues.push(issue("other-semantic-inconsistency", "persistenceRevision must equal the legacy stateRevision CAS sequence", void 0, "revision-domain"));
    for (const check of this.extensionChecks) {
      const detail = check(state);
      if (detail) issues.push(issue("other-semantic-inconsistency", detail, void 0, "extension-invariant"));
    }
    return issues;
  }
};
var MemoryStateByteStorage = class {
  bytes;
  backups = /* @__PURE__ */ new Map();
  async read() {
    return this.bytes ? this.bytes.slice() : void 0;
  }
  async write(bytes) {
    this.bytes = bytes.slice();
  }
  async compareAndSwap(expected, replacement) {
    if (!bytesEqual(this.bytes, expected)) return false;
    this.bytes = replacement.slice();
    return true;
  }
  async backup(bytes) {
    const id = `backup-${this.backups.size + 1}`;
    this.backups.set(id, bytes.slice());
    return id;
  }
};
var PersistentSynchronizationStateStore = class {
  constructor(storage, currentSchemaVersion = 1, semanticValidator = new DurableSemanticStateValidator()) {
    this.storage = storage;
    this.currentSchemaVersion = currentSchemaVersion;
    this.semanticValidator = semanticValidator;
  }
  storage;
  currentSchemaVersion;
  semanticValidator;
  async load(context) {
    const bytes = await this.storage.read();
    if (!bytes) return context.expectation === "new-installation" ? { status: "uninitialized" } : { status: "recovery-required", reason: "expected-state-missing" };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: parsed.status, detail: parsed.detail };
    const state = parsed.envelope.state;
    if (state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "incompatible-version", detail: `state schema ${state.schemaVersion}, runtime schema ${this.currentSchemaVersion}` };
    if (context.expectedVaultIdentity && state.vaultIdentity !== context.expectedVaultIdentity) return { status: "recovery-required", reason: "internally-inconsistent", detail: "vault identity does not match expected pairing" };
    if (context.expectedDeviceIdentity && state.deviceIdentity !== context.expectedDeviceIdentity) return { status: "recovery-required", reason: "clone-or-restore-suspected", detail: "persisted device identity does not match this installation" };
    if (hasAuthorityMarker(state)) {
      if (state.authoritySchemaVersion === 2) {
        if (!isDurableSynchronizationAuthorityState(state)) return { status: "recovery-required", reason: "internally-inconsistent", detail: "malformed v1.1 authority state" };
        const issues = this.semanticValidator.validate(state);
        if (issues.length) return { status: "recovery-required", reason: "internally-inconsistent", detail: issues.map((item) => `${item.code}:${item.invariantCategory ?? "state"}`).join(",") };
      } else if (state.authoritySchemaVersion === 1 && !isDurableSynchronizationAuthorityStateV1(state)) return { status: "recovery-required", reason: "internally-inconsistent", detail: "malformed v1 authority state" };
      else if (state.authoritySchemaVersion !== 1) return { status: "recovery-required", reason: "incompatible-version", detail: "unsupported authority schema" };
    }
    return { status: "trusted", state };
  }
  async saveTrusted(state, expectedRevision) {
    if (!validateLegacyStateShape(state) || state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "refusing to persist internally inconsistent trusted state" };
    if (hasAuthorityMarker(state)) {
      if (state.authoritySchemaVersion === 2 && (!isDurableSynchronizationAuthorityState(state) || this.semanticValidator.validate(state).length > 0)) return { status: "recovery-required", reason: "refusing to persist semantically inconsistent v1.1 authority state" };
      if (state.authoritySchemaVersion === 1 && !isDurableSynchronizationAuthorityStateV1(state)) return { status: "recovery-required", reason: "refusing to persist malformed v1 authority state" };
      if (state.authoritySchemaVersion !== 1 && state.authoritySchemaVersion !== 2) return { status: "recovery-required", reason: "refusing unsupported authority schema" };
    }
    const currentBytes = await this.storage.read();
    if (currentBytes) {
      const current = parseEnvelope(currentBytes);
      if (current.status !== "ok") return { status: "recovery-required", reason: `existing state is ${current.status}` };
      if (expectedRevision && current.envelope.state.stateRevision !== expectedRevision) return { status: "stale-revision", actualRevision: current.envelope.state.stateRevision };
    } else if (expectedRevision) return { status: "stale-revision" };
    const replacement = serialize(state);
    if (this.storage.compareAndSwap) {
      if (!await this.storage.compareAndSwap(currentBytes, replacement)) {
        const actual = await this.storage.read();
        if (!actual) return { status: "stale-revision" };
        const parsed = parseEnvelope(actual);
        if (parsed.status !== "ok") return { status: "recovery-required", reason: `concurrently written state is ${parsed.status}` };
        return { status: "stale-revision", actualRevision: parsed.envelope.state.stateRevision };
      }
    } else await this.storage.write(replacement);
    return { status: "saved", stateRevision: state.stateRevision };
  }
  async loadAuthority() {
    const bytes = await this.storage.read();
    if (!bytes) return { status: "uninitialized" };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", `persisted state is ${parsed.status}`, void 0, "envelope-integrity")] };
    const state = parsed.envelope.state;
    if (state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "authority product-state schema is incompatible with this runtime", void 0, "schema-version")] };
    if (isDurableSynchronizationAuthorityStateV1(state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "v1 authority requires explicit backup/CAS migration to v1.1", void 0, "authority-v1-migration")] };
    if (!isDurableSynchronizationAuthorityState(state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", hasAuthorityMarker(state) ? "malformed v1.1 authority cannot be interpreted safely" : "legacy state lacks v1.1 semantic-authority metadata and must be migrated/reconstructed", void 0, hasAuthorityMarker(state) ? "authority-v1.1-malformed" : "legacy-migration")] };
    const issues = this.semanticValidator.validate(state);
    return issues.length ? { status: "recovery-required", issues } : { status: "trusted", state };
  }
  async saveAuthority(state, expectedPersistenceRevision, expectedSemanticGeneration) {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "atomic compare-and-swap storage is required for authority writes", void 0, "persistence-cas")] };
    const currentBytes = await this.storage.read();
    if (!currentBytes) return { status: "stale-persistence" };
    const parsed = parseEnvelope(currentBytes);
    if (parsed.status !== "ok" || !isDurableSynchronizationAuthorityState(parsed.envelope.state)) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "current state is not trusted v1.1 semantic authority", void 0, "authority-load")] };
    const current = parsed.envelope.state;
    const currentIssues = this.semanticValidator.validate(current);
    if (currentIssues.length) return { status: "recovery-required", issues: currentIssues };
    if (current.persistenceRevision !== expectedPersistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: current.persistenceRevision };
    if (expectedSemanticGeneration && current.semanticGeneration !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: current.semanticGeneration };
    if (state.authoritySchemaVersion !== 2 || state.vaultIdentity !== current.vaultIdentity || state.deviceIdentity !== current.deviceIdentity) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "authority save cannot change schema/vault/device identity", void 0, "identity-authority")] };
    const semanticChanged = !sameSemanticAuthority(current, state);
    const persistenceRevision = nextPersistenceRevision(current.persistenceRevision);
    const semanticGeneration2 = semanticChanged ? nextSemanticGeneration(current.semanticGeneration) : current.semanticGeneration;
    const replacement = { ...state, stateRevision: persistenceRevision, persistenceRevision, semanticGeneration: semanticGeneration2 };
    const replacementIssues = this.semanticValidator.validate(replacement);
    if (replacementIssues.length) return { status: "recovery-required", issues: replacementIssues };
    if (!await this.storage.compareAndSwap(currentBytes, serialize(replacement))) {
      const actual = await this.readCurrentAuthorityBestEffort();
      return actual ? { status: "stale-persistence", actualPersistenceRevision: actual.persistenceRevision } : { status: "stale-persistence" };
    }
    return { status: "saved", persistenceRevision, semanticGeneration: semanticGeneration2 };
  }
  async commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status === "uninitialized") return { status: "stale-persistence" };
    if (loaded.status === "recovery-required") return { status: "recovery-required", issues: loaded.issues };
    const state = loaded.state;
    if (state.persistenceRevision !== expectedPersistenceRevision) return { status: "stale-persistence", actualPersistenceRevision: state.persistenceRevision };
    if (state.semanticGeneration !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
    let next;
    if (transition.kind === "verified-deletion") {
      const currentAuthority = state.baseAuthority.find((entry2) => entry2.path === transition.authority.path);
      if (!currentAuthority || !exactBaseAuthorityMatches(transition.authority, { generation: state.semanticGeneration, path: currentAuthority.path, fingerprint: currentAuthority.fingerprint })) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
      const prior = state.base.find((entry2) => entry2.path === transition.authority.path);
      if (!prior) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "verified deletion references missing BASE entry", transition.authority.path, "deletion-authority")] };
      next = { ...state, base: state.base.filter((entry2) => entry2.path !== transition.authority.path), baseAuthority: state.baseAuthority.filter((entry2) => entry2.path !== transition.authority.path), remoteMappings: state.remoteMappings.filter((mapping) => mapping.path !== transition.authority.path), tombstones: [...state.tombstones.filter((entry2) => entry2.path !== transition.authority.path), { path: transition.authority.path, entityKind: prior.entityKind, deletedOn: "both", remoteObjectId: prior.remoteObjectId, sourceDeviceId: state.deviceIdentity }] };
    } else {
      const proof = transition.proof;
      if (proof.generation !== state.semanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: state.semanticGeneration };
      if (proof.kind === "file-common") {
        if (proof.canonicalContent.algorithm !== "sha256" || !isString(proof.canonicalContent.hash) || !Number.isSafeInteger(proof.canonicalContent.sizeBytes) || proof.canonicalContent.sizeBytes < 0) return { status: "recovery-required", issues: [issue("other-semantic-inconsistency", "file BASE healing lacks exact canonical SHA-256 authority", proof.path, "common-file-proof")] };
        next = { ...state, base: [...state.base.filter((entry2) => entry2.path !== proof.path), { path: proof.path, entityKind: "file", localExisted: true, remoteExisted: true, content: { hash: proof.canonicalContent.hash, sizeBytes: proof.canonicalContent.sizeBytes, revision: String(proof.remoteRevision) }, remoteObjectId: proof.remoteObjectId }], baseAuthority: [...state.baseAuthority.filter((entry2) => entry2.path !== proof.path), { path: proof.path, fingerprint: transition.nextFingerprint }], remoteMappings: [...state.remoteMappings.filter((mapping) => mapping.path !== proof.path && mapping.remoteObjectId !== proof.remoteObjectId), { path: proof.path, remoteObjectId: proof.remoteObjectId, entityKind: "file" }], tombstones: state.tombstones.filter((entry2) => entry2.path !== proof.path), pathConvergence: [...state.pathConvergence.filter((entry2) => entry2.path !== proof.path), { path: proof.path, state: { status: "converged", generation: nextSemanticGeneration(state.semanticGeneration), baseFingerprint: transition.nextFingerprint } }] };
      } else if (proof.kind === "folder-common") {
        next = { ...state, base: [...state.base.filter((entry2) => entry2.path !== proof.path), { path: proof.path, entityKind: "folder", localExisted: true, remoteExisted: true, remoteObjectId: proof.remoteObjectId }], baseAuthority: [...state.baseAuthority.filter((entry2) => entry2.path !== proof.path), { path: proof.path, fingerprint: transition.nextFingerprint }], remoteMappings: [...state.remoteMappings.filter((mapping) => mapping.path !== proof.path && mapping.remoteObjectId !== proof.remoteObjectId), { path: proof.path, remoteObjectId: proof.remoteObjectId, entityKind: "folder" }], tombstones: state.tombstones.filter((entry2) => entry2.path !== proof.path), pathConvergence: [...state.pathConvergence.filter((entry2) => entry2.path !== proof.path), { path: proof.path, state: { status: "converged", generation: nextSemanticGeneration(state.semanticGeneration), baseFingerprint: transition.nextFingerprint } }] };
      } else {
        const prior = state.base.find((entry2) => entry2.path === proof.path);
        next = { ...state, base: state.base.filter((entry2) => entry2.path !== proof.path), baseAuthority: state.baseAuthority.filter((entry2) => entry2.path !== proof.path), remoteMappings: state.remoteMappings.filter((mapping) => mapping.path !== proof.path), tombstones: prior ? [...state.tombstones.filter((entry2) => entry2.path !== proof.path), { path: proof.path, entityKind: proof.entityKind, deletedOn: "both", remoteObjectId: prior.remoteObjectId, sourceDeviceId: state.deviceIdentity }] : state.tombstones, pathConvergence: state.pathConvergence.filter((entry2) => entry2.path !== proof.path) };
      }
    }
    return this.saveAuthority(next, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async appendLearnedRemoteBatch(batch, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    return this.saveAuthority({ ...loaded.state, learnedRemoteBatches: appendDurableRemoteChangeBatch(loaded.state.learnedRemoteBatches, batch), changeCursor: batch.checkpoint.terminalStartToken }, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async recordRemoteBatchReduction(batchId, durableFactRefs, complete, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (!loaded.state.learnedRemoteBatches.some((batch) => batch.checkpoint.batchId === batchId)) return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "cannot reduce a remote batch that is not durably learned", void 0, "remote-ingestion")] };
    return this.saveAuthority({ ...loaded.state, learnedRemoteReductions: [...loaded.state.learnedRemoteReductions.filter((entry2) => entry2.batchId !== batchId), { batchId, durableFactRefs: [...durableFactRefs], complete }] }, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async retireLearnedRemoteBatch(batchId, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const batch = loaded.state.learnedRemoteBatches.find((item) => item.checkpoint.batchId === batchId);
    if (!batch) return this.saveAuthority(loaded.state, expectedPersistenceRevision, expectedSemanticGeneration);
    const reduction = loaded.state.learnedRemoteReductions.find((item) => item.batchId === batchId);
    if (!reduction?.complete || batch.changes.length > 0 && reduction.durableFactRefs.length === 0) return { status: "recovery-required", issues: [issue("ingestion-checkpoint-inconsistent", "remote batch cannot retire until every needed fact is durably reduced", void 0, "remote-ingestion-retirement")] };
    return this.saveAuthority({ ...loaded.state, learnedRemoteBatches: loaded.state.learnedRemoteBatches.filter((item) => item.checkpoint.batchId !== batchId), learnedRemoteReductions: loaded.state.learnedRemoteReductions.filter((item) => item.batchId !== batchId) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async persistOperationIntent(intent, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    if (intent.semanticAuthority.generation !== expectedSemanticGeneration) return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    if (loaded.state.operationIntents.some((existing) => existing.operationId === intent.operationId)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation intent already exists", void 0, "journal-identity")] };
    const candidate = { ...loaded.state, operationIntents: [...loaded.state.operationIntents, intent] };
    const candidateIssues = this.semanticValidator.validate(candidate);
    if (candidateIssues.length) return { status: "recovery-required", issues: candidateIssues };
    return this.saveAuthority(candidate, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  replaceEffect(intent, effectId, replacement) {
    if (intent.logicalKind === "single-effect") return { ...intent, effects: [replacement] };
    const mapped = intent.effects.map((effect) => effect.effectId === effectId ? replacement : effect);
    const first = mapped[0];
    const second = mapped[1];
    if (!first || !second) throw new Error("clean-text-merge lost required durable effects");
    return { ...intent, effects: [first, second, ...mapped.slice(2)] };
  }
  async advanceOperationEffect(operationId, effectId, stage, verificationEvidenceRef, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const intent = loaded.state.operationIntents.find((item) => item.operationId === operationId);
    if (!intent) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect cannot advance without durable intent", void 0, "journal-reference")] };
    const currentEffect = intent.effects.find((effect) => effect.effectId === effectId);
    if (!currentEffect) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation effect ID is not durable", void 0, "journal-reference")] };
    const from = stages.indexOf(currentEffect.stage);
    const to = stages.indexOf(stage);
    const legalDirectVerification = currentEffect.stage === "dispatch-authorized" && stage === "effect-verified";
    const legalUnknownRecovery = currentEffect.stage === "outcome-unknown" && stage === "effect-verified";
    if (to < from || to > from + 1 && !legalDirectVerification && !legalUnknownRecovery) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", `illegal effect-stage transition ${currentEffect.stage}->${stage}`, void 0, "journal-stage-order")] };
    const proof = verificationEvidenceRef ?? currentEffect.verificationEvidenceRef;
    if ((stage === "effect-verified" || stage === "state-committed") && !isString(proof)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "verified/committed effect transition requires durable verification evidence", void 0, "journal-verification")] };
    const replacement = { ...currentEffect, stage, ...proof ? { verificationEvidenceRef: proof } : {} };
    const updatedIntent = this.replaceEffect(intent, effectId, replacement);
    return this.saveAuthority({ ...loaded.state, operationIntents: loaded.state.operationIntents.map((item) => item.operationId === operationId ? updatedIntent : item) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async garbageCollectCompletedOperation(operationId, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const intent = loaded.state.operationIntents.find((item) => item.operationId === operationId);
    if (!intent || !recoverableOperationV1_1IsComplete(intent)) return { status: "recovery-required", issues: [issue("journal-reference-incomplete", "operation journal can be collected only after every effect is state-committed", void 0, "journal-gc")] };
    return this.saveAuthority({ ...loaded.state, operationIntents: loaded.state.operationIntents.filter((item) => item.operationId !== operationId) }, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async restartRecoveryDirectives() {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") return [];
    return loaded.state.operationIntents.flatMap((intent) => recoverableOperationV1_1RestartRecoveryDirectives(intent).map((entry2) => ({ operationId: intent.operationId, ...entry2 })));
  }
  async createRecoveryBackup() {
    const bytes = await this.storage.read();
    const backupId = await this.storage.backup(bytes ?? new Uint8Array());
    let sourceRevision;
    if (bytes) {
      const parsed = parseEnvelope(bytes);
      if (parsed.status === "ok") sourceRevision = parsed.envelope.state.stateRevision;
    }
    return { backupId, ...sourceRevision ? { sourceRevision } : {} };
  }
  async replaceRecoveryState(state, context) {
    if (!validateLegacyStateShape(state) || state.schemaVersion !== this.currentSchemaVersion) return { status: "recovery-required", reason: "recovery candidate is not valid trusted state" };
    if (hasAuthorityMarker(state) && state.authoritySchemaVersion === 2 && (!isDurableSynchronizationAuthorityState(state) || this.semanticValidator.validate(state).length > 0)) return { status: "recovery-required", reason: "recovery candidate has v1.1 semantic contradictions" };
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "atomic compare-and-swap storage is required for recovery replacement" };
    const source = await this.storage.read();
    const loaded = await this.load(context);
    if (loaded.status !== "recovery-required") return { status: "not-recovery", reason: "current persisted state is not in a recovery condition" };
    const backupId = await this.storage.backup(source ?? new Uint8Array());
    let sourceRevision;
    if (source) {
      const parsed = parseEnvelope(source);
      if (parsed.status === "ok") sourceRevision = parsed.envelope.state.stateRevision;
    }
    const backup = { backupId, ...sourceRevision ? { sourceRevision } : {} };
    if (!await this.storage.compareAndSwap(source, serialize(state))) return { status: "concurrent-change", reason: "state changed after recovery backup; replacement refused", backup };
    return { status: "replaced", backup, stateRevision: state.stateRevision };
  }
  async assessMigration(targetSchemaVersion) {
    const bytes = await this.storage.read();
    if (!bytes) return { status: "compatible", toVersion: targetSchemaVersion };
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return { status: "incompatible", toVersion: targetSchemaVersion };
    const fromVersion = parsed.envelope.state.schemaVersion;
    if (fromVersion === targetSchemaVersion) return { status: "compatible", fromVersion, toVersion: targetSchemaVersion };
    if (fromVersion < targetSchemaVersion) return { status: "migration-required", fromVersion, toVersion: targetSchemaVersion };
    return { status: "incompatible", fromVersion, toVersion: targetSchemaVersion };
  }
  async migrate(targetSchemaVersion, migration) {
    const assessment = await this.assessMigration(targetSchemaVersion);
    if (assessment.status === "incompatible") return { status: "incompatible", reason: "state cannot be safely migrated to the requested schema" };
    if (assessment.status === "compatible") return { status: "incompatible", reason: "migration is not required" };
    const loadedBytes = await this.storage.read();
    if (!loadedBytes) return { status: "recovery-required", reason: "state disappeared before migration" };
    const parsed = parseEnvelope(loadedBytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: `state became ${parsed.status}` };
    const backup = await this.createRecoveryBackup();
    const migrated = migration(parsed.envelope.state, targetSchemaVersion);
    if (!validateLegacyStateShape(migrated) || migrated.schemaVersion !== targetSchemaVersion) return { status: "recovery-required", reason: "migration produced invalid target state" };
    const replacement = serialize(migrated);
    if (this.storage.compareAndSwap) {
      if (!await this.storage.compareAndSwap(loadedBytes, replacement)) return { status: "recovery-required", reason: "state changed concurrently during migration; migration was not committed" };
    } else await this.storage.write(replacement);
    return { status: "migrated", backup };
  }
  async migrateToAuthority(targetSchemaVersion, rebuild) {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "authority migration requires atomic compare-and-swap storage" };
    const source = await this.storage.read();
    if (!source) return { status: "recovery-required", reason: "state disappeared before authority migration" };
    const parsed = parseEnvelope(source);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: `state is ${parsed.status}` };
    const backupId = await this.storage.backup(source);
    const backup = { backupId, sourceRevision: parsed.envelope.state.stateRevision };
    const candidate = rebuild(parsed.envelope.state, targetSchemaVersion);
    if (!isDurableSynchronizationAuthorityState(candidate) || candidate.schemaVersion !== targetSchemaVersion) return { status: "recovery-required", reason: "authority migration did not reconstruct the required v1.1 durable authority schema" };
    const issues = this.semanticValidator.validate(candidate);
    if (issues.length) return { status: "recovery-required", reason: `authority migration remains semantically inconsistent: ${issues.map((item) => item.code).join(",")}` };
    if (!await this.storage.compareAndSwap(source, serialize(candidate))) return { status: "recovery-required", reason: "state changed concurrently after migration backup; migration was not committed" };
    return { status: "migrated", backup };
  }
  /** Explicit backup-first, CAS-bound upgrade of the historical v1 authority document. */
  async migrateAuthorityV1ToV1_1() {
    if (!this.storage.compareAndSwap) return { status: "recovery-required", reason: "v1 authority migration requires atomic compare-and-swap storage" };
    const sourceBytes = await this.storage.read();
    if (!sourceBytes) return { status: "recovery-required", reason: "authority state is missing" };
    const parsed = parseEnvelope(sourceBytes);
    if (parsed.status !== "ok") return { status: "recovery-required", reason: `authority state is ${parsed.status}` };
    if (isDurableSynchronizationAuthorityState(parsed.envelope.state)) return { status: "not-required", reason: "authority is already v1.1" };
    if (!isDurableSynchronizationAuthorityStateV1(parsed.envelope.state)) return { status: "recovery-required", reason: "persisted state is not a valid v1 authority document" };
    const source = parsed.envelope.state;
    const backupId = await this.storage.backup(sourceBytes);
    const backup = { backupId, sourceRevision: source.stateRevision };
    const persistenceRevision = nextPersistenceRevision(source.persistenceRevision);
    const candidate = {
      ...source,
      authoritySchemaVersion: 2,
      stateRevision: persistenceRevision,
      persistenceRevision,
      semanticGeneration: source.semanticGeneration,
      operationIntents: source.operationIntents
    };
    const issues = this.semanticValidator.validate(candidate);
    if (issues.length) return { status: "recovery-required", reason: `v1 authority cannot migrate safely: ${issues.map((item) => item.code).join(",")}` };
    if (!await this.storage.compareAndSwap(sourceBytes, serialize(candidate))) return { status: "recovery-required", reason: "authority changed concurrently after migration backup; migration was not committed" };
    return { status: "migrated", backup, persistenceRevision, semanticGeneration: candidate.semanticGeneration };
  }
  async exportDiagnosticState() {
    const bytes = await this.storage.read();
    if (!bytes) return encoder.encode(JSON.stringify({ status: "uninitialized" }));
    const parsed = parseEnvelope(bytes);
    if (parsed.status !== "ok") return encoder.encode(JSON.stringify({ status: "recovery-required", reason: parsed.status }));
    const state = parsed.envelope.state;
    const authority = isDurableSynchronizationAuthorityState(state) ? { authoritySchemaVersion: state.authoritySchemaVersion, persistenceRevision: state.persistenceRevision, semanticGeneration: state.semanticGeneration, learnedRemoteBatchCount: state.learnedRemoteBatches.length, pendingAuthorityOperationCount: state.operationIntents.filter((intent) => !recoverableOperationV1_1IsComplete(intent)).length, localTransactionCount: state.localTransactions.length } : isDurableSynchronizationAuthorityStateV1(state) ? { authoritySchemaVersion: 1, authorityV1MigrationRequired: true, pendingAuthorityOperationCount: state.operationIntents.length } : { authorityMigrationRequired: true };
    return encoder.encode(JSON.stringify({ schemaVersion: state.schemaVersion, stateRevision: state.stateRevision, vaultIdentity: state.vaultIdentity, deviceIdentity: state.deviceIdentity, base: state.base.map((entry2) => ({ path: entry2.path, entityKind: entry2.entityKind, localExisted: entry2.localExisted, remoteExisted: entry2.remoteExisted, contentEvidence: entry2.content, remoteObjectId: entry2.remoteObjectId })), remoteMappings: state.remoteMappings, tombstones: state.tombstones, changeCursor: state.changeCursor, operations: state.operations, knownDevices: state.knownDevices, ...authority }));
  }
  async readCurrentAuthorityBestEffort() {
    const bytes = await this.storage.read();
    if (!bytes) return void 0;
    const parsed = parseEnvelope(bytes);
    return parsed.status === "ok" && isDurableSynchronizationAuthorityState(parsed.envelope.state) ? parsed.envelope.state : void 0;
  }
};
function createInitialTrustedState(values) {
  return { schemaVersion: values.schemaVersion ?? 1, stateRevision: values.stateRevision, vaultIdentity: values.vaultIdentity, deviceIdentity: values.deviceIdentity, base: [], remoteMappings: [], tombstones: [], operations: [], knownDevices: [{ deviceId: values.deviceIdentity, stale: false }] };
}
function createInitialAuthorityState(values) {
  return { ...createInitialTrustedState({ stateRevision: values.persistenceRevision, vaultIdentity: values.vaultIdentity, deviceIdentity: values.deviceIdentity, schemaVersion: values.schemaVersion }), authoritySchemaVersion: 2, persistenceRevision: values.persistenceRevision, semanticGeneration: values.semanticGeneration, learnedRemoteBatches: [], learnedRemoteReductions: [], pathConvergence: [], operationIntents: [], localTransactions: [], baseAuthority: [] };
}

// src/state/state-policy.ts
var DEFAULT_TOMBSTONE_RETENTION = {
  retentionMs: 90 * 24 * 60 * 60 * 1e3
};
var DEFAULT_STALE_DEVICE_POLICY = {
  staleAfterMs: 30 * 24 * 60 * 60 * 1e3
};
function generateDeviceIdentity(randomBytes2) {
  const bytes = new Uint8Array(16);
  if (randomBytes2) randomBytes2(bytes);
  else {
    const cryptoApi = globalThis.crypto;
    if (!cryptoApi?.getRandomValues) throw new Error("secure random generation is unavailable");
    cryptoApi.getRandomValues(bytes);
  }
  const value2 = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (/^0+$/.test(value2)) throw new Error("device identity randomness produced an invalid all-zero identifier");
  return contractId(`device:${value2}`);
}

// src/product/audit-history.ts
var BoundedAuditHistory = class {
  constructor(persistence, limit = 500) {
    this.persistence = persistence;
    this.assertLimit(limit);
    this.limit = limit;
  }
  persistence;
  records = [];
  loaded = false;
  limit;
  async append(record) {
    await this.ensureLoaded();
    this.records.push(record);
    await this.trimAndPersist();
  }
  async read() {
    await this.ensureLoaded();
    return [...this.records];
  }
  async setLimit(limit) {
    this.assertLimit(limit);
    await this.ensureLoaded();
    this.limit = limit;
    await this.trimAndPersist();
  }
  currentLimit() {
    return this.limit;
  }
  async ensureLoaded() {
    if (this.loaded) return;
    this.records = [...await this.persistence.load()].slice(-this.limit);
    this.loaded = true;
  }
  async trimAndPersist() {
    if (this.records.length > this.limit) this.records.splice(0, this.records.length - this.limit);
    await this.persistence.save(this.records);
  }
  assertLimit(limit) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1e4) throw new Error("audit history limit must be an integer from 1 through 10000");
  }
};

// src/product/canonical-local-vault.ts
function sleep2(milliseconds) {
  return new Promise((resolve2) => globalThis.setTimeout(resolve2, milliseconds));
}
function staleObservationError(error) {
  return error instanceof Error && (error.name === "LocalStaleObservationError" || /^Local observation became stale:/u.test(error.message));
}
function changeTouches(change, path2) {
  return change.kind === "renamed" ? change.fromPath === path2 || change.toPath === path2 : change.path === path2;
}
var CanonicalEvidenceLocalVault = class {
  constructor(inner, options = {}, transactional) {
    this.inner = inner;
    this.transactional = transactional;
    this.staleRetryAttempts = options.staleRetryAttempts ?? 3;
    this.staleRetryDelayMs = options.staleRetryDelayMs ?? 25;
    if (!Number.isSafeInteger(this.staleRetryAttempts) || this.staleRetryAttempts < 1) throw new Error("staleRetryAttempts must be a positive safe integer");
    if (!Number.isSafeInteger(this.staleRetryDelayMs) || this.staleRetryDelayMs < 0) throw new Error("staleRetryDelayMs must be a non-negative safe integer");
  }
  inner;
  transactional;
  cache = /* @__PURE__ */ new Map();
  staleRetryAttempts;
  staleRetryDelayMs;
  changeListeners = /* @__PURE__ */ new Set();
  activeMutation;
  innerChangeUnsubscribe;
  activeConfigurationDirectory() {
    return this.inner.activeConfigurationDirectory();
  }
  async enumerate() {
    const listing = await this.inner.enumerate();
    const entries = [];
    for (const observation of listing.entries) entries.push(await this.enrich(observation));
    return { ...listing, entries };
  }
  async observe(path2) {
    return this.enrich(await this.inner.observe(path2));
  }
  async readFile(path2, expectedToken) {
    const observed2 = await this.observe(path2);
    if (observed2.status !== "present" || observed2.entityKind !== "file" || observed2.stability !== "stable" || !observed2.observationToken || !observed2.content?.hash) {
      throw new Error(`Canonical stable local file evidence unavailable: ${String(path2)} (${observed2.status})`);
    }
    if (expectedToken && expectedToken !== observed2.observationToken) throw new Error(`Local observation became stale: ${String(path2)}`);
    const result = await this.inner.readFile(path2, observed2.observationToken);
    return {
      ...result,
      evidence: { ...result.evidence, hash: observed2.content.hash },
      observationToken: observed2.observationToken
    };
  }
  /**
   * Authoritative integrity seam. This intentionally starts below this
   * decorator's evidence cache, consumes the current bytes, hashes them, then
   * proves the file remained the same stable observation across the read.
   */
  async readFileBypassingEvidenceCache(path2) {
    let current = await this.inner.observe(path2);
    for (let attempt = 0; attempt < this.staleRetryAttempts; attempt += 1) {
      if (current.status !== "present" || current.entityKind !== "file" || current.stability !== "stable" || !current.observationToken) {
        throw new Error(`Authoritative local integrity evidence unavailable: ${String(path2)} (${current.status})`);
      }
      const token = current.observationToken;
      try {
        const read = await this.inner.readFile(path2, token);
        const hash2 = await sha256BinarySource(read.content);
        const after = await this.inner.observe(path2);
        if (after.status === "present" && after.entityKind === "file" && after.stability === "stable" && after.observationToken === token) {
          this.cache.set(String(path2), { token, hash: hash2 });
          return {
            ...read,
            evidence: { ...read.evidence, ...after.content, hash: hash2 },
            observationToken: token
          };
        }
        current = after;
      } catch (error) {
        if (!staleObservationError(error)) throw error;
        current = await this.inner.observe(path2);
      }
      if (attempt + 1 < this.staleRetryAttempts && this.staleRetryDelayMs) await sleep2(this.staleRetryDelayMs * (attempt + 1));
    }
    throw new Error(`Authoritative local integrity read remained unstable after bounded retries: ${String(path2)}`);
  }
  async createFile(path2, content) {
    await this.inner.createFile(path2, content);
    return this.canonicalReceipt(path2);
  }
  async replaceFile(path2, content, expectedToken) {
    await this.inner.replaceFile(path2, content, expectedToken);
    return this.canonicalReceipt(path2);
  }
  async createFolder(path2) {
    return this.inner.createFolder(path2);
  }
  async move(fromPath, toPath) {
    this.cache.delete(String(fromPath));
    await this.inner.move(fromPath, toPath);
    return this.canonicalReceipt(toPath);
  }
  async trash(path2) {
    this.cache.delete(String(path2));
    await this.inner.trash(path2);
  }
  validatePath(path2) {
    return this.inner.validatePath(path2);
  }
  classifyConfiguration(path2) {
    return this.inner.classifyConfiguration(path2);
  }
  onChange(listener) {
    this.changeListeners.add(listener);
    if (!this.innerChangeUnsubscribe) this.innerChangeUnsubscribe = this.inner.onChange((change) => this.handleInnerChange(change));
    return () => {
      this.changeListeners.delete(listener);
      if (this.changeListeners.size === 0) {
        this.innerChangeUnsubscribe?.();
        this.innerChangeUnsubscribe = void 0;
      }
    };
  }
  onLifecycle(listener) {
    return this.inner.onLifecycle(listener);
  }
  async stageAndVerify(transaction, content, cancellation) {
    return this.requireTransactional().stageAndVerify(transaction, content, cancellation);
  }
  async commitVerifiedStage(transaction, cancellation) {
    const active = this.beginMutationCorrelation(transaction);
    try {
      const result = await this.requireTransactional().commitVerifiedStage(transaction, cancellation);
      await this.finishMutationCorrelation(active, result);
      if (result.status === "committed" || result.status === "recovered") this.cache.delete(String(transaction.path));
      return result;
    } catch (error) {
      this.flushCorrelation(active);
      throw error;
    }
  }
  async recover(transaction, cancellation) {
    const active = this.beginMutationCorrelation(transaction);
    try {
      const result = await this.requireTransactional().recover(transaction, cancellation);
      await this.finishMutationCorrelation(active, result);
      if (result.status === "committed" || result.status === "recovered") this.cache.delete(String(transaction.path));
      return result;
    } catch (error) {
      this.flushCorrelation(active);
      throw error;
    }
  }
  requireTransactional() {
    if (!this.transactional) throw new Error("Crash-safe local transactional mutation backend is not configured");
    return this.transactional;
  }
  beginMutationCorrelation(transaction) {
    if (this.activeMutation) throw new Error("Local mutation provenance correlation is already active");
    const active = {
      transaction,
      provenance: { source: "brain-sync", operationId: transaction.operationId, transactionId: transaction.transactionId },
      pending: []
    };
    this.activeMutation = active;
    return active;
  }
  async finishMutationCorrelation(active, result) {
    if (this.activeMutation !== active) return;
    this.activeMutation = void 0;
    if (result.status !== "committed" && result.status !== "recovered" || !result.resultingObservationToken) {
      this.emitChanges(active.pending);
      return;
    }
    const observed2 = await this.inner.observe(active.transaction.path);
    const exactResult = observed2.status === "present" && observed2.entityKind === "file" && observed2.stability === "stable" && observed2.observationToken === result.resultingObservationToken;
    const structuralOnly = active.pending.every((change) => this.isExactTransactionStructuralHint(change, active.transaction));
    if (!exactResult || !structuralOnly) this.emitChanges(active.pending);
  }
  isExactTransactionStructuralHint(change, transaction) {
    if (change.kind !== "renamed") return false;
    if (transaction.mutationKind === "create") {
      return change.fromPath === transaction.stagePath && change.toPath === transaction.path;
    }
    return change.fromPath === transaction.path && change.toPath === transaction.backupPath || change.fromPath === transaction.stagePath && change.toPath === transaction.path;
  }
  flushCorrelation(active) {
    if (this.activeMutation === active) this.activeMutation = void 0;
    this.emitChanges(active.pending);
  }
  handleInnerChange(change) {
    this.invalidateChange(change);
    const active = this.activeMutation;
    if (active && changeTouches(change, active.transaction.path)) {
      active.pending.push(change);
      return;
    }
    this.emitChanges([change]);
  }
  emitChanges(changes) {
    for (const change of changes) for (const listener of this.changeListeners) listener(change);
  }
  async canonicalReceipt(path2) {
    this.cache.delete(String(path2));
    const observed2 = await this.observe(path2);
    return observed2.status === "present" ? { path: path2, evidence: observed2.content, observationToken: observed2.observationToken } : { path: path2 };
  }
  async enrich(observation) {
    if (observation.status !== "present" || observation.entityKind !== "file") return observation;
    if (observation.stability !== "stable" || !observation.observationToken) return observation;
    const original = observation;
    let current = observation;
    for (let attempt = 0; attempt < this.staleRetryAttempts; attempt += 1) {
      if (current.status !== "present" || current.entityKind !== "file" || current.stability !== "stable" || !current.observationToken) {
        if (attempt + 1 < this.staleRetryAttempts) {
          if (this.staleRetryDelayMs) await sleep2(this.staleRetryDelayMs * (attempt + 1));
          current = await this.inner.observe(original.path);
          continue;
        }
        break;
      }
      const key = String(current.path), cached = this.cache.get(key);
      if (cached?.token === current.observationToken) return { ...current, content: { ...current.content, hash: cached.hash } };
      try {
        const read = await this.inner.readFile(current.path, current.observationToken);
        const hash2 = await sha256BinarySource(read.content);
        const after = await this.inner.observe(current.path);
        if (after.status === "present" && after.entityKind === "file" && after.stability === "stable" && after.observationToken === current.observationToken) {
          this.cache.set(key, { token: current.observationToken, hash: hash2 });
          return { ...after, content: { ...after.content, hash: hash2 } };
        }
        current = after;
      } catch (error) {
        if (!staleObservationError(error)) {
          return { status: "unknown", side: "local", path: current.path, reason: `canonical SHA-256 evidence unavailable: ${error instanceof Error ? error.message : String(error)}` };
        }
        current = await this.inner.observe(original.path);
      }
      if (attempt + 1 < this.staleRetryAttempts && this.staleRetryDelayMs) await sleep2(this.staleRetryDelayMs * (attempt + 1));
    }
    return { ...original, content: void 0, stability: "unstable", observationToken: void 0 };
  }
  invalidateChange(change) {
    if (change.kind === "renamed") {
      this.cache.delete(String(change.fromPath));
      this.cache.delete(String(change.toPath));
    } else this.cache.delete(String(change.path));
  }
};

// src/product/notification-policy.ts
function meaningfulNotification(surface) {
  const status = surface.status;
  switch (status.kind) {
    case "attention-required":
      if (status.phase === "planned") return void 0;
      return { key: `attention:completed:${status.attentionIdentity}:${status.attentionCount}:${status.safeOperationsCommitted}:${status.ledgerAvailable}`, message: status.attentionCount > 0 ? status.safeOperationsCommitted > 0 ? `BRAIN sync completed with ${status.attentionCount} path(s) requiring attention; ${status.safeOperationsCommitted} safe operation(s) synchronized.${status.ledgerAvailable ? "" : " The attention ledger could not be updated."}` : `BRAIN sync completed with ${status.attentionCount} path(s) requiring attention; no unsafe paths were changed.${status.ledgerAvailable ? "" : " The attention ledger could not be updated."}` : "BRAIN sync completed, but the device-local attention ledger could not be updated." };
    case "conflict-present":
      return { key: `attention:${status.conflictCount}:true`, message: `BRAIN sync has ${status.conflictCount} conflict(s) requiring attention.` };
    case "destructive-plan-blocked":
      return { key: `destructive:${String(status.planId)}`, message: "BRAIN sync blocked a destructive plan for review." };
    case "authentication-required":
      return { key: `auth:${status.reason}`, message: "BRAIN sync requires Google authentication." };
    case "recovery-required":
      return { key: `recovery:${status.reason}`, message: `BRAIN sync requires recovery: ${status.reason}` };
    case "error":
      return { key: `error:${status.code}:${status.message}`, message: `BRAIN sync error: ${status.message}` };
    default:
      return void 0;
  }
}
var MeaningfulNotificationFilter = class {
  lastKey;
  next(surface) {
    const notice = meaningfulNotification(surface);
    if (!notice) {
      if (surface.status.kind !== "planning" && surface.status.kind !== "syncing" && !(surface.status.kind === "attention-required" && surface.status.phase === "planned")) this.lastKey = void 0;
      return void 0;
    }
    if (notice.key === this.lastKey) return void 0;
    this.lastKey = notice.key;
    return notice.message;
  }
};

// src/product/path-scope.ts
init_config_policy();
init_exclusions();
var CONFIG_REMOTE_NAMESPACE = "__brain_sync_portable_config__";
var vp = (value2) => contractId(value2);
var norm = (value2) => value2.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
var ProductPathScope = class {
  constructor(configurationDirectory, settings, operationalExclusions = () => /* @__PURE__ */ new Set()) {
    this.configurationDirectory = configurationDirectory;
    this.settings = settings;
    this.operationalExclusions = operationalExclusions;
  }
  configurationDirectory;
  settings;
  operationalExclusions;
  configurationPolicy = new SelectiveConfigurationPolicy();
  portable = new Set(this.configurationPolicy.describePortablePolicy().filter((entry2) => entry2.classification.classification === "portable").map((entry2) => norm(entry2.relativePath)));
  isReservedLogical(path2) {
    const logical = norm(String(path2));
    return logical === CONFIG_REMOTE_NAMESPACE || logical.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`);
  }
  isManagedLogical(path2) {
    const logical = norm(String(path2));
    if (this.operationalExclusions().has(logical)) return false;
    if (logical === CONFIG_REMOTE_NAMESPACE) return true;
    if (logical.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`)) return this.portable.has(logical.slice(CONFIG_REMOTE_NAMESPACE.length + 1));
    return !new LocalExclusionPolicy(this.settings().userExclusionPatterns).evaluate(logical, this.configurationDirectory).excluded;
  }
  logicalToPhysical(path2) {
    const logical = norm(String(path2));
    if (logical === CONFIG_REMOTE_NAMESPACE) return void 0;
    if (!this.isManagedLogical(logical)) return void 0;
    if (logical.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`)) return vp(`${norm(String(this.configurationDirectory))}/${logical.slice(CONFIG_REMOTE_NAMESPACE.length + 1)}`);
    return vp(logical);
  }
  physicalToLogical(path2) {
    const physical = norm(String(path2));
    const config = norm(String(this.configurationDirectory));
    if (physical.startsWith(`${config}/`)) {
      const relative2 = physical.slice(config.length + 1);
      const classification = this.configurationPolicy.classify(vp(physical), this.configurationDirectory);
      return classification.classification === "portable" ? vp(`${CONFIG_REMOTE_NAMESPACE}/${relative2}`) : void 0;
    }
    if (this.isReservedLogical(physical)) return void 0;
    return this.isManagedLogical(physical) ? vp(physical) : void 0;
  }
  portableLogicalPaths() {
    return [...this.portable].map((relative2) => vp(`${CONFIG_REMOTE_NAMESPACE}/${relative2}`));
  }
  activeConfigurationDirectory() {
    return this.configurationDirectory;
  }
};
function mapObservation(observation, path2) {
  if (observation.status === "present") return { ...observation, path: path2 };
  if (observation.status === "absent") return { ...observation, path: path2 };
  return { ...observation, path: path2 };
}
var ScopedLocalVault = class {
  constructor(inner, scope) {
    this.inner = inner;
    this.scope = scope;
  }
  inner;
  scope;
  activeConfigurationDirectory() {
    return Promise.resolve(this.scope.activeConfigurationDirectory());
  }
  async enumerate() {
    const ordinary = await this.inner.enumerate();
    const ordinaryCollisions = ordinary.entries.filter((entry2) => this.scope.isReservedLogical(entry2.path));
    const entries = ordinary.entries.filter((entry2) => !this.scope.isReservedLogical(entry2.path) && this.scope.isManagedLogical(entry2.path));
    const collisionReason = ordinaryCollisions.length ? `ordinary vault content collides with reserved portable-configuration namespace ${CONFIG_REMOTE_NAMESPACE} at ${ordinaryCollisions.map((entry2) => String(entry2.path)).join(", ")}; configuration mapping is disabled until the collision is resolved` : void 0;
    if (collisionReason) {
      entries.push({ status: "unknown", side: "local", path: vp(CONFIG_REMOTE_NAMESPACE), reason: collisionReason });
    }
    const configFailures = [];
    const uncertainties = ordinary.completeness.status === "complete" ? [...ordinary.uncertainties ?? []] : ordinary.uncertainties?.length ? [...ordinary.uncertainties] : [{ scope: "all", reason: ordinary.completeness.reason }];
    for (const logical of this.scope.portableLogicalPaths()) {
      if (collisionReason) {
        entries.push({ status: "unknown", side: "local", path: logical, reason: collisionReason });
        continue;
      }
      const physical = this.scope.logicalToPhysical(logical);
      const observed2 = mapObservation(await this.inner.observe(physical), logical);
      entries.push(observed2);
      if (observed2.status === "unreadable" || observed2.status === "inaccessible" || observed2.status === "unknown") {
        const reason = `${String(logical)}: ${observed2.reason}`;
        configFailures.push(reason);
        uncertainties.push({ scope: "path", path: logical, reason });
      }
    }
    if (!configFailures.length) return { ...ordinary, entries, ...uncertainties.length ? { uncertainties } : {} };
    const prior = ordinary.completeness.status === "complete" ? [] : [ordinary.completeness.reason];
    return { entries, completeness: { status: "partial", reason: [...prior, ...configFailures].join("; ") }, uncertainties };
  }
  async observe(path2) {
    if (this.scope.isReservedLogical(path2) && await this.hasOrdinaryNamespaceCollision()) return this.collisionObservation(path2);
    const physical = this.scope.logicalToPhysical(path2);
    if (!physical) return { status: "unknown", side: "local", path: path2, reason: "path is outside the effective synchronization scope" };
    return mapObservation(await this.inner.observe(physical), path2);
  }
  async readFile(path2, expectedToken) {
    return this.inner.readFile(await this.requiredPhysical(path2), expectedToken);
  }
  async createFile(path2, content) {
    const receipt = await this.inner.createFile(await this.requiredPhysical(path2), content);
    return { ...receipt, path: path2 };
  }
  async replaceFile(path2, content, expectedToken) {
    const receipt = await this.inner.replaceFile(await this.requiredPhysical(path2), content, expectedToken);
    return { ...receipt, path: path2 };
  }
  async createFolder(path2) {
    const receipt = await this.inner.createFolder(await this.requiredPhysical(path2));
    return { ...receipt, path: path2 };
  }
  async move(fromPath, toPath) {
    const receipt = await this.inner.move(await this.requiredPhysical(fromPath), await this.requiredPhysical(toPath));
    return { ...receipt, path: toPath };
  }
  async trash(path2) {
    await this.inner.trash(await this.requiredPhysical(path2));
  }
  async validatePath(path2) {
    if (this.scope.isReservedLogical(path2) && await this.hasOrdinaryNamespaceCollision()) {
      return { status: "blocked", reason: "unsupported-object", detail: `ordinary vault content collides with reserved portable-configuration namespace ${CONFIG_REMOTE_NAMESPACE}` };
    }
    const physical = this.scope.logicalToPhysical(path2);
    if (!physical) return { status: "blocked", reason: "unsupported-object", detail: "path is outside the effective synchronization scope" };
    return this.inner.validatePath(physical);
  }
  async classifyConfiguration(path2) {
    return this.inner.classifyConfiguration(await this.requiredPhysical(path2));
  }
  onChange(listener) {
    return this.inner.onChange((change) => {
      if (change.kind === "renamed") {
        const fromPath = this.scope.physicalToLogical(change.fromPath), toPath = this.scope.physicalToLogical(change.toPath);
        if (fromPath && toPath) listener({ kind: "renamed", fromPath, toPath });
        else if (fromPath) listener({ kind: "deleted", path: fromPath });
        else if (toPath) listener({ kind: "created", path: toPath });
        return;
      }
      const path2 = this.scope.physicalToLogical(change.path);
      if (path2) listener({ ...change, path: path2 });
    });
  }
  onLifecycle(listener) {
    return this.inner.onLifecycle(listener);
  }
  async hasOrdinaryNamespaceCollision() {
    const observed2 = await this.inner.observe(vp(CONFIG_REMOTE_NAMESPACE));
    return observed2.status !== "absent";
  }
  collisionObservation(path2) {
    return {
      status: "unknown",
      side: "local",
      path: path2,
      reason: `ordinary vault content collides with reserved portable-configuration namespace ${CONFIG_REMOTE_NAMESPACE}; configuration mapping is disabled until the collision is resolved`
    };
  }
  async requiredPhysical(path2) {
    if (this.scope.isReservedLogical(path2) && await this.hasOrdinaryNamespaceCollision()) {
      throw new Error(`Blocked local path (unsupported-object): ${String(path2)} \u2014 ordinary vault content collides with reserved portable-configuration namespace`);
    }
    const physical = this.scope.logicalToPhysical(path2);
    if (!physical) throw new Error(`Blocked local path (unsupported-object): ${String(path2)} \u2014 outside effective synchronization scope`);
    return physical;
  }
};

// src/local/local-vault-access-boundary.ts
init_common();
function proofMatches(left, right) {
  return left.algorithm === right.algorithm && left.hash === right.hash && left.sizeBytes === right.sizeBytes;
}
function cancelled3(signal) {
  return signal?.cancelled === true;
}
function withStage(transaction, stage) {
  return { ...transaction, stage };
}
var ObsidianLocalMutationTransactions = class {
  constructor(adapter, local) {
    this.adapter = adapter;
    this.local = local;
  }
  adapter;
  local;
  async stageAndVerify(transaction, content, signal) {
    if (cancelled3(signal)) return this.blocked(transaction, "Cancellation accepted before local staging");
    const pathProblem = await this.validateTransactionPaths(transaction);
    if (pathProblem) return this.blocked(transaction, pathProblem);
    const precondition = await this.verifyExpectedTarget(transaction);
    if (precondition) return precondition;
    try {
      if (await this.adapter.exists(String(transaction.stagePath), true)) {
        return this.unknown(transaction, `Local transaction stage already exists: ${String(transaction.stagePath)}`);
      }
      if (await this.adapter.exists(String(transaction.backupPath), true)) {
        return this.unknown(transaction, `Local transaction backup unexpectedly exists before staging: ${String(transaction.backupPath)}`);
      }
      await this.writeIncremental(transaction.stagePath, content);
      const staged = withStage(transaction, "staged-unverified");
      if (cancelled3(signal)) return this.blocked(staged, "Cancellation accepted after stage write; target remains untouched");
      const stageProof = await this.readCanonical(transaction.stagePath);
      if (!proofMatches(stageProof.proof, transaction.expectedNewEvidence)) {
        await this.removeBestEffort(transaction.stagePath);
        return this.blocked(staged, "Staged local bytes failed canonical SHA-256/size verification; target was not displaced");
      }
      return { status: "staged-verified", transaction: withStage(transaction, "staged-verified"), resultingObservationToken: stageProof.read.observationToken };
    } catch (error) {
      const operationalFailure = operationalFailureProvenanceFromErrorV1_3(error);
      return {
        status: "outcome-unknown",
        reason: `Local staging outcome could not be established: ${this.message(error)}`,
        transaction,
        ...operationalFailure ? { operationalFailure } : {}
      };
    }
  }
  async commitVerifiedStage(transaction, signal) {
    if (cancelled3(signal)) return this.blocked(transaction, "Cancellation accepted before local commit");
    const pathProblem = await this.validateTransactionPaths(transaction);
    if (pathProblem) return this.blocked(transaction, pathProblem);
    try {
      const staged = await this.readCanonical(transaction.stagePath);
      if (!proofMatches(staged.proof, transaction.expectedNewEvidence)) {
        return this.blocked(transaction, "Verified stage is no longer the intended canonical content");
      }
      const precondition = await this.verifyExpectedTarget(transaction);
      if (precondition) return precondition;
      if (transaction.mutationKind === "create") return this.commitCreate(transaction);
      return this.commitReplace(transaction);
    } catch (error) {
      return this.unknown(transaction, `Local commit outcome could not be established: ${this.message(error)}`);
    }
  }
  async recover(transaction, signal) {
    if (cancelled3(signal)) return this.blocked(transaction, "Cancellation accepted before local recovery");
    const pathProblem = await this.validateTransactionPaths(transaction);
    if (pathProblem) return this.blocked(transaction, pathProblem);
    try {
      return transaction.mutationKind === "create" ? await this.recoverCreate(transaction) : await this.recoverReplace(transaction);
    } catch (error) {
      return this.unknown(transaction, `Local recovery outcome could not be established: ${this.message(error)}`);
    }
  }
  async commitCreate(transaction) {
    const target = await this.local.observe(transaction.path);
    if (target.status !== "absent") {
      return target.status === "present" ? this.stale(transaction, "Create target is no longer authoritatively absent") : this.unknown(transaction, `Create target state is ${target.status}; absence is not established`);
    }
    await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
    const final = await this.readCanonical(transaction.path);
    if (!proofMatches(final.proof, transaction.expectedNewEvidence)) {
      return this.unknown(withStage(transaction, "swap-committed"), "Created target does not match intended canonical content after swap");
    }
    await this.removeBestEffort(transaction.backupPath);
    return {
      status: "committed",
      transaction: withStage(transaction, "completed"),
      resultingObservationToken: final.read.observationToken
    };
  }
  async commitReplace(transaction) {
    if (await this.adapter.exists(String(transaction.backupPath), true)) {
      return this.unknown(transaction, "Replace backup already exists before target displacement; refusing to guess its provenance");
    }
    await this.adapter.rename(String(transaction.path), String(transaction.backupPath));
    const backedUp = withStage(transaction, "backup-established");
    let backup;
    try {
      backup = await this.readCanonical(transaction.backupPath);
    } catch (error) {
      return this.unknown(backedUp, `Expected replacement backup is missing or unreadable after displacement: ${this.message(error)}`);
    }
    if (!proofMatches(backup.proof, transaction.expectedTarget.canonicalContent)) {
      return this.unknown(backedUp, "Replacement backup canonical content contradicts the authorized old target");
    }
    await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
    const swapped = withStage(transaction, "swap-committed");
    const final = await this.readCanonical(transaction.path);
    if (!proofMatches(final.proof, transaction.expectedNewEvidence)) {
      return this.unknown(swapped, "Replacement target does not match intended canonical content after swap");
    }
    const cleanupSucceeded = await this.trashBestEffort(transaction.backupPath);
    return {
      status: "committed",
      transaction: withStage(transaction, cleanupSucceeded ? "completed" : "cleanup-pending"),
      resultingObservationToken: final.read.observationToken
    };
  }
  async recoverCreate(transaction) {
    if (await this.adapter.exists(String(transaction.backupPath), true)) {
      return this.unknown(transaction, "Create transaction has an unexpected backup artifact; refusing to reinterpret replacement state as create");
    }
    const target = await this.tryCanonical(transaction.path);
    if (target?.status === "present") {
      if (proofMatches(target.value.proof, transaction.expectedNewEvidence)) {
        await this.removeBestEffort(transaction.stagePath);
        return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: target.value.read.observationToken };
      }
      return this.stale(transaction, "Create recovery found independently populated target content");
    }
    if (target?.status !== "absent") return this.unknown(transaction, "Create recovery cannot authoritatively establish target absence");
    const stage = await this.tryCanonical(transaction.stagePath);
    if (stage?.status === "present" && proofMatches(stage.value.proof, transaction.expectedNewEvidence)) {
      await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
      const final = await this.readCanonical(transaction.path);
      if (!proofMatches(final.proof, transaction.expectedNewEvidence)) return this.unknown(withStage(transaction, "swap-committed"), "Recovered create swap failed canonical verification");
      return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: final.read.observationToken };
    }
    if (stage?.status === "present") await this.removeBestEffort(transaction.stagePath);
    return this.blocked(transaction, "Create recovery found no verified staged result; authoritative target absence is preserved");
  }
  async recoverReplace(transaction) {
    const [target, stage, backup] = await Promise.all([
      this.tryCanonical(transaction.path),
      this.tryCanonical(transaction.stagePath),
      this.tryCanonical(transaction.backupPath)
    ]);
    if (!target || !stage || !backup) return this.unknown(transaction, "Replace recovery encountered unreadable/unknown physical state");
    if (target.status === "present" && proofMatches(target.value.proof, transaction.expectedNewEvidence)) {
      if (backup.status === "present" && !proofMatches(backup.value.proof, transaction.expectedTarget.canonicalContent)) {
        return this.unknown(transaction, "Applied replacement is accompanied by a contradictory backup");
      }
      await this.removeBestEffort(transaction.stagePath);
      if (backup.status === "present") await this.trashBestEffort(transaction.backupPath);
      return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: target.value.read.observationToken };
    }
    if (target.status === "absent") {
      if (backup.status === "absent") {
        return this.unknown(transaction, "Replace recovery contradiction: target and required displaced-target backup are both absent");
      }
      if (!proofMatches(backup.value.proof, transaction.expectedTarget.canonicalContent)) {
        return this.unknown(transaction, "Replace recovery backup does not match the authorized old target");
      }
      if (stage.status === "present" && proofMatches(stage.value.proof, transaction.expectedNewEvidence)) {
        await this.adapter.rename(String(transaction.stagePath), String(transaction.path));
        const final = await this.readCanonical(transaction.path);
        if (!proofMatches(final.proof, transaction.expectedNewEvidence)) return this.unknown(withStage(transaction, "swap-committed"), "Recovered replacement swap failed canonical verification");
        await this.trashBestEffort(transaction.backupPath);
        return { status: "recovered", transaction: withStage(transaction, "completed"), resultingObservationToken: final.read.observationToken };
      }
      await this.adapter.rename(String(transaction.backupPath), String(transaction.path));
      const restored = await this.readCanonical(transaction.path);
      if (!proofMatches(restored.proof, transaction.expectedTarget.canonicalContent)) {
        return this.unknown(transaction, "Replacement recovery could not restore the authorized old target");
      }
      return this.blocked(withStage(transaction, "staged-unverified"), "Replacement stage is unavailable or corrupt; authorized old target was restored");
    }
    if (target.status === "present" && proofMatches(target.value.proof, transaction.expectedTarget.canonicalContent)) {
      if (backup.status === "present") {
        return this.unknown(transaction, "Replace recovery found both authoritative old target and a backup; physical history is contradictory");
      }
      if (stage.status === "present" && proofMatches(stage.value.proof, transaction.expectedNewEvidence)) {
        return this.commitVerifiedStage(withStage(transaction, "staged-verified"));
      }
      return this.blocked(transaction, "Replacement was not applied and no verified stage remains; old target is preserved");
    }
    return this.stale(transaction, "Replace recovery found target content that matches neither authorized old nor intended new content");
  }
  async verifyExpectedTarget(transaction) {
    const observation = await this.local.observe(transaction.path);
    if (transaction.mutationKind === "create") {
      if (observation.status === "absent") return void 0;
      if (observation.status === "present") return this.stale(transaction, "Create requires authoritative expected absence but target is present");
      return this.unknown(transaction, `Create requires authoritative expected absence but target state is ${observation.status}`);
    }
    if (observation.status !== "present" || observation.entityKind !== "file" || observation.stability !== "stable" || !observation.observationToken) {
      return observation.status === "absent" ? this.stale(transaction, "Replace requires exact expected presence but target is absent") : this.unknown(transaction, `Replace requires exact stable presence but target state is ${observation.status}`);
    }
    if (observation.observationToken !== transaction.expectedTarget.observationToken) {
      return this.stale(transaction, "Replace observation token no longer matches exact expected presence");
    }
    const canonical2 = await this.readCanonical(transaction.path, transaction.expectedTarget.observationToken);
    if (!proofMatches(canonical2.proof, transaction.expectedTarget.canonicalContent)) {
      return this.stale(transaction, "Replace canonical old content no longer matches exact expected presence");
    }
    return void 0;
  }
  async validateTransactionPaths(transaction) {
    const values = [transaction.path, transaction.stagePath, transaction.backupPath].map(String);
    if (new Set(values).size !== values.length) return "Local transaction target, stage, and backup paths must be distinct";
    for (const path2 of [transaction.path, transaction.stagePath, transaction.backupPath]) {
      const validation = await this.local.validatePath(path2);
      if (validation.status === "blocked") return `Local transaction path is blocked (${validation.reason}): ${String(path2)}`;
    }
    const targetParent = values[0].includes("/") ? values[0].slice(0, values[0].lastIndexOf("/")) : "";
    for (const artifact of values.slice(1)) {
      const artifactParent = artifact.includes("/") ? artifact.slice(0, artifact.lastIndexOf("/")) : "";
      if (artifactParent !== targetParent) return "Local transaction stage and backup must be siblings of the target";
    }
    return void 0;
  }
  async readCanonical(path2, expectedToken) {
    const read = await this.local.readFile(path2, expectedToken);
    const hash2 = await sha256BinarySource(read.content);
    const sizeBytes = this.authoritativeSize(read.evidence, read.content.sizeBytes);
    return { read, proof: { algorithm: "sha256", hash: hash2, sizeBytes } };
  }
  async tryCanonical(path2) {
    const observation = await this.local.observe(path2);
    if (observation.status === "absent") return { status: "absent" };
    if (observation.status !== "present" || observation.entityKind !== "file" || observation.stability !== "stable") return void 0;
    try {
      return { status: "present", value: await this.readCanonical(path2, observation.observationToken) };
    } catch {
      return void 0;
    }
  }
  authoritativeSize(evidence2, sourceSize) {
    const value2 = evidence2.sizeBytes ?? sourceSize;
    if (value2 === void 0 || !Number.isSafeInteger(value2) || value2 < 0) throw new Error("Canonical local byte size is unavailable");
    return value2;
  }
  async writeIncremental(path2, content) {
    await this.adapter.writeBinary(String(path2), new ArrayBuffer(0));
    try {
      for await (const chunk of content.openChunks()) {
        if (!chunk.byteLength) continue;
        const copy = new Uint8Array(chunk.byteLength);
        copy.set(chunk);
        await this.adapter.appendBinary(String(path2), copy.buffer);
      }
    } catch (error) {
      await this.removeBestEffort(path2);
      throw error;
    }
  }
  async removeBestEffort(path2) {
    try {
      if (await this.adapter.exists(String(path2), true)) await this.adapter.remove(String(path2));
      return true;
    } catch {
      return false;
    }
  }
  async trashBestEffort(path2) {
    try {
      if (await this.adapter.exists(String(path2), true)) await this.adapter.trashLocal(String(path2));
      return true;
    } catch {
      return false;
    }
  }
  stale(transaction, reason) {
    return { status: "stale", reason, transaction };
  }
  blocked(transaction, reason) {
    return { status: "blocked", reason, transaction };
  }
  unknown(transaction, reason) {
    return { status: "outcome-unknown", reason, transaction };
  }
  message(error) {
    return error instanceof Error ? error.message : String(error);
  }
};

// src/product/synchronization-adapters.ts
var vp2 = (value2) => contractId(value2);
var normalize2 = (value2) => value2.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
function nextSemanticGeneration2(current) {
  const value2 = String(current);
  const match = /^(.*?)(\d+)$/.exec(value2);
  const next = match ? `${match[1]}${Number(match[2]) + 1}` : `${value2}:1`;
  return contractId(next);
}
function semanticStateRevision(generation) {
  return contractId(`semantic-cas:${String(generation)}`);
}
function rebaseConvergenceGeneration(state, generation) {
  return {
    ...state,
    pathConvergence: state.pathConvergence.map((entry2) => entry2.state.status === "converged" ? { ...entry2, state: { ...entry2.state, generation } } : entry2)
  };
}
function physicalArtifactPath(target, role, seed) {
  const raw = normalize2(String(target));
  const slash = raw.lastIndexOf("/");
  const parent = slash >= 0 ? raw.slice(0, slash) : "";
  const name = slash >= 0 ? raw.slice(slash + 1) : raw;
  const token = String(sha256Text(String(seed))).slice(0, 24);
  return vp2(`${parent ? `${parent}/` : ""}.${name}.brain-sync-${role}-${token}`);
}
var ScopedLocalTransactionalMutationPort = class {
  constructor(adapter, rawLocal, scope) {
    this.scope = scope;
    this.delegate = new ObsidianLocalMutationTransactions(adapter, rawLocal);
  }
  scope;
  delegate;
  async stageAndVerify(transaction, content, cancellation) {
    const result = await this.delegate.stageAndVerify(this.toPhysical(transaction), content, cancellation);
    return this.toLogical(result, transaction);
  }
  async commitVerifiedStage(transaction, cancellation) {
    const result = await this.delegate.commitVerifiedStage(this.toPhysical(transaction), cancellation);
    return this.toLogical(result, transaction);
  }
  async recover(transaction, cancellation) {
    const result = await this.delegate.recover(this.toPhysical(transaction), cancellation);
    return this.toLogical(result, transaction);
  }
  toPhysical(transaction) {
    const target = this.physical(transaction.path);
    return {
      ...transaction,
      path: target,
      stagePath: physicalArtifactPath(target, "stage", transaction.stagePath),
      backupPath: physicalArtifactPath(target, "backup", transaction.backupPath)
    };
  }
  toLogical(result, logical) {
    return {
      ...result,
      transaction: { ...logical, stage: result.transaction.stage }
    };
  }
  physical(path2) {
    const logical = normalize2(String(path2));
    if (logical === CONFIG_REMOTE_NAMESPACE) throw new Error("reserved portable-configuration namespace is not a physical transaction target");
    if (logical.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`)) {
      const relative2 = logical.slice(CONFIG_REMOTE_NAMESPACE.length + 1);
      return vp2(`${normalize2(String(this.scope.activeConfigurationDirectory()))}/${relative2}`);
    }
    return vp2(logical);
  }
};
function authorityProjection(state) {
  return JSON.stringify({
    vaultIdentity: state.vaultIdentity,
    deviceIdentity: state.deviceIdentity,
    base: state.base,
    baseAuthority: state.baseAuthority,
    remoteMappings: state.remoteMappings,
    tombstones: state.tombstones,
    changeCursor: state.changeCursor,
    learnedRemoteBatches: state.learnedRemoteBatches,
    learnedRemoteReductions: state.learnedRemoteReductions,
    pathConvergence: state.pathConvergence,
    knownDevices: state.knownDevices
  });
}
function legacySemanticProjection(state) {
  return JSON.stringify({
    vaultIdentity: state.vaultIdentity,
    deviceIdentity: state.deviceIdentity,
    base: state.base,
    remoteMappings: state.remoteMappings,
    tombstones: state.tombstones,
    changeCursor: state.changeCursor,
    knownDevices: state.knownDevices
  });
}
function factForPath(state, path2) {
  return JSON.stringify({
    base: state.base.filter((entry2) => entry2.path === path2),
    mapping: state.remoteMappings.filter((entry2) => entry2.path === path2),
    tombstone: state.tombstones.filter((entry2) => entry2.path === path2)
  });
}
function changedCanonicalPaths(current, candidate) {
  const paths2 = /* @__PURE__ */ new Map();
  for (const entry2 of [...current.base, ...candidate.base, ...current.remoteMappings, ...candidate.remoteMappings, ...current.tombstones, ...candidate.tombstones]) {
    paths2.set(String(entry2.path), entry2.path);
  }
  return [...paths2.values()].filter((path2) => factForPath(current, path2) !== factForPath(candidate, path2));
}
function fingerprintForBase(entry2) {
  const hash2 = sha256Text(JSON.stringify({
    path: String(entry2.path),
    entityKind: entry2.entityKind,
    localExisted: entry2.localExisted,
    remoteExisted: entry2.remoteExisted,
    remoteObjectId: entry2.remoteObjectId ? String(entry2.remoteObjectId) : void 0,
    content: entry2.content ? {
      hash: entry2.content.hash ? String(entry2.content.hash) : void 0,
      sizeBytes: entry2.content.sizeBytes,
      revision: entry2.content.revision
    } : void 0
  }));
  return contractId(`base:${String(hash2)}`);
}
function canCarryExactBaseAuthority(entry2) {
  if (!entry2.localExisted || !entry2.remoteExisted || !entry2.remoteObjectId) return false;
  if (entry2.entityKind === "folder") return true;
  return Boolean(entry2.content?.hash) && entry2.content?.sizeBytes !== void 0 && Number.isSafeInteger(entry2.content.sizeBytes) && entry2.content.sizeBytes >= 0;
}
function reconcileCanonicalAuthority(current, legacyCandidate) {
  const semanticChanged = legacySemanticProjection(current) !== legacySemanticProjection(legacyCandidate);
  let candidate = {
    ...current,
    base: legacyCandidate.base,
    remoteMappings: legacyCandidate.remoteMappings,
    tombstones: legacyCandidate.tombstones,
    changeCursor: legacyCandidate.changeCursor,
    operations: legacyCandidate.operations,
    knownDevices: legacyCandidate.knownDevices
  };
  if (!semanticChanged) return candidate;
  const nextGeneration = nextSemanticGeneration2(current.semanticGeneration);
  const changed = new Set(changedCanonicalPaths(current, legacyCandidate).map(String));
  let baseAuthority2 = candidate.baseAuthority.filter((entry2) => !changed.has(String(entry2.path)));
  let pathConvergence = candidate.pathConvergence.filter((entry2) => !changed.has(String(entry2.path)));
  for (const pathValue of changed) {
    const entry2 = candidate.base.find((value2) => String(value2.path) === pathValue);
    if (!entry2 || !canCarryExactBaseAuthority(entry2)) continue;
    const mapping = candidate.remoteMappings.filter((value2) => value2.path === entry2.path);
    if (mapping.length !== 1 || mapping[0]?.remoteObjectId !== entry2.remoteObjectId || mapping[0]?.entityKind !== entry2.entityKind) continue;
    const fingerprint = fingerprintForBase(entry2);
    baseAuthority2 = [...baseAuthority2, { path: entry2.path, fingerprint }];
    pathConvergence = [...pathConvergence, {
      path: entry2.path,
      state: { status: "converged", generation: nextGeneration, baseFingerprint: fingerprint }
    }];
  }
  candidate = { ...candidate, baseAuthority: baseAuthority2, pathConvergence };
  return rebaseConvergenceGeneration(candidate, nextGeneration);
}
function authorityState(value2) {
  const candidate = value2;
  return candidate.authoritySchemaVersion === 2 && candidate.persistenceRevision !== void 0 && candidate.semanticGeneration !== void 0 && Array.isArray(candidate.learnedRemoteBatches) && Array.isArray(candidate.pathConvergence) && Array.isArray(candidate.operationIntents) && Array.isArray(candidate.localTransactions) && Array.isArray(candidate.baseAuthority);
}
function rebaseCompletedEffectSemanticAuthority(effect, generation) {
  const descriptor = effect.descriptor;
  if (descriptor.kind === "remote-file" && descriptor.remoteMutation.kind === "existing-file-content-update") {
    return {
      ...effect,
      descriptor: {
        ...descriptor,
        remoteMutation: {
          ...descriptor.remoteMutation,
          identityAuthority: { ...descriptor.remoteMutation.identityAuthority, generation }
        }
      }
    };
  }
  if (descriptor.kind === "move") {
    return {
      ...effect,
      descriptor: {
        ...descriptor,
        identityAuthority: { ...descriptor.identityAuthority, generation }
      }
    };
  }
  if (descriptor.kind === "trash") {
    return {
      ...effect,
      descriptor: {
        ...descriptor,
        baseAuthority: { ...descriptor.baseAuthority, generation },
        ...descriptor.identityAuthority ? { identityAuthority: { ...descriptor.identityAuthority, generation } } : {}
      }
    };
  }
  if (descriptor.kind === "local-folder-create" || descriptor.kind === "remote-folder-create") {
    return {
      ...effect,
      descriptor: {
        ...descriptor,
        pathAuthority: { ...descriptor.pathAuthority, generation }
      }
    };
  }
  return effect;
}
function rebaseCompletedIntentSemanticAuthority(state, generation) {
  let changed = false;
  const operationIntents = state.operationIntents.map((intent) => {
    if (intent.semanticAuthority.generation === generation || intent.effects.length === 0 || !intent.effects.every((effect) => effect.stage === "state-committed")) return intent;
    changed = true;
    if (intent.logicalKind === "single-effect") {
      return {
        ...intent,
        semanticAuthority: { ...intent.semanticAuthority, generation },
        effects: [rebaseCompletedEffectSemanticAuthority(intent.effects[0], generation)]
      };
    }
    const [first, second, ...rest] = intent.effects;
    return {
      ...intent,
      semanticAuthority: { ...intent.semanticAuthority, generation },
      effects: [
        rebaseCompletedEffectSemanticAuthority(first, generation),
        rebaseCompletedEffectSemanticAuthority(second, generation),
        ...rest.map((effect) => rebaseCompletedEffectSemanticAuthority(effect, generation))
      ]
    };
  });
  return changed ? { ...state, operationIntents } : state;
}
var SynchronizationStateAuthorityAdapter = class extends PersistentSynchronizationStateStore {
  constructor(source) {
    super(new MemoryStateByteStorage(), source.currentSchemaVersion);
    this.source = source;
  }
  source;
  async load(context) {
    const loaded = await this.source.load(context);
    if (loaded.status !== "trusted" || !authorityState(loaded.state)) return loaded;
    return {
      status: "trusted",
      state: { ...loaded.state, stateRevision: semanticStateRevision(loaded.state.semanticGeneration) }
    };
  }
  async saveTrusted(candidate, expectedRevision) {
    const authority = await this.source.loadAuthority();
    if (authority.status === "uninitialized") {
      const initial = createInitialAuthorityState({
        persistenceRevision: contractId(String(candidate.stateRevision)),
        semanticGeneration: contractId("semantic:0"),
        vaultIdentity: candidate.vaultIdentity,
        deviceIdentity: candidate.deviceIdentity,
        schemaVersion: candidate.schemaVersion
      });
      const saved2 = await this.source.saveTrusted(initial);
      return saved2.status === "saved" ? { status: "saved", stateRevision: semanticStateRevision(initial.semanticGeneration) } : saved2;
    }
    if (authority.status !== "trusted") return { status: "recovery-required", reason: "authoritative state requires recovery" };
    const current = authority.state;
    const semanticRevision = semanticStateRevision(current.semanticGeneration);
    if (expectedRevision && expectedRevision !== semanticRevision) return { status: "stale-revision", actualRevision: semanticRevision };
    const reconciled = reconcileCanonicalAuthority(current, candidate);
    const saved = await this.saveAuthority(reconciled, current.persistenceRevision, current.semanticGeneration);
    if (saved.status === "saved") return { status: "saved", stateRevision: semanticStateRevision(saved.semanticGeneration) };
    if (saved.status === "stale-persistence" || saved.status === "stale-semantic-authority") {
      const latest = await this.source.loadAuthority();
      return { status: "stale-revision", actualRevision: latest.status === "trusted" ? semanticStateRevision(latest.state.semanticGeneration) : void 0 };
    }
    return { status: "recovery-required", reason: saved.issues.map((issue2) => `${issue2.code}:${issue2.detail}`).join("; ") };
  }
  async loadAuthority() {
    return this.source.loadAuthority();
  }
  async saveAuthority(state, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") {
      return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    }
    const semanticChanged = authorityProjection(loaded.state) !== authorityProjection(state);
    const targetGeneration = semanticChanged ? nextSemanticGeneration2(loaded.state.semanticGeneration) : loaded.state.semanticGeneration;
    const withCompletedIntents = rebaseCompletedIntentSemanticAuthority(state, targetGeneration);
    const candidate = semanticChanged ? rebaseConvergenceGeneration(withCompletedIntents, targetGeneration) : withCompletedIntents;
    return this.source.saveAuthority(candidate, expectedPersistenceRevision, expectedSemanticGeneration);
  }
  async commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration) {
    const first = await this.source.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration);
    if (first.status !== "saved") return first;
    const loaded = await this.source.loadAuthority();
    if (loaded.status !== "trusted") return loaded.status === "uninitialized" ? { status: "stale-persistence" } : { status: "recovery-required", issues: loaded.issues };
    const staleConvergence = loaded.state.pathConvergence.some((entry2) => entry2.state.status === "converged" && entry2.state.generation !== loaded.state.semanticGeneration);
    if (!staleConvergence) return first;
    const candidate = rebaseConvergenceGeneration(loaded.state, nextSemanticGeneration2(loaded.state.semanticGeneration));
    return this.source.saveAuthority(candidate, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
  }
  async createRecoveryBackup() {
    return this.source.createRecoveryBackup();
  }
  async replaceRecoveryState(state, context) {
    const replacement = authorityState(state) ? state : createInitialAuthorityState({
      persistenceRevision: contractId(String(state.stateRevision)),
      semanticGeneration: contractId("semantic:recovery:0"),
      vaultIdentity: state.vaultIdentity,
      deviceIdentity: state.deviceIdentity,
      schemaVersion: state.schemaVersion
    });
    const result = await this.source.replaceRecoveryState(replacement, context);
    return result.status === "replaced" ? { ...result, stateRevision: semanticStateRevision(replacement.semanticGeneration) } : result;
  }
  async assessMigration(targetSchemaVersion) {
    return this.source.assessMigration(targetSchemaVersion);
  }
  async exportDiagnosticState() {
    return this.source.exportDiagnosticState();
  }
};

// src/core/commit-coordinator.ts
function nextRevision(current) {
  const value2 = String(current);
  const match = /^(.*?)(\d+)$/.exec(value2);
  const next = match ? `${match[1]}${Number(match[2]) + 1}` : `${value2}:1`;
  return contractId(next);
}
function upsertJournal(state, entry2) {
  const retained = state.operations.filter((item) => item.operationId !== entry2.operationId);
  return [...retained, entry2];
}
function applySuccessfulOperation(state, operation, receipt) {
  let base = [...state.base];
  let mappings = [...state.remoteMappings];
  let tombstones = [...state.tombstones];
  const oldBase = base.find((entry2) => entry2.path === operation.path || operation.fromPath && entry2.path === operation.fromPath);
  const entityKind2 = operation.contentVersion?.entityKind ?? oldBase?.entityKind ?? "file";
  const remoteObjectId = receipt.resultingRemoteObjectId ?? operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId ?? oldBase?.remoteObjectId;
  const localOnlyConflictCopy = operation.kind === "download-create" && operation.contentVersion !== void 0 && operation.path !== operation.contentVersion.path;
  if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
    base = base.filter((entry2) => entry2.path !== operation.path);
    base.push({
      path: operation.path,
      entityKind: entityKind2,
      localExisted: true,
      remoteExisted: !localOnlyConflictCopy,
      content: receipt.evidence ?? operation.contentVersion?.content,
      remoteObjectId: localOnlyConflictCopy ? void 0 : remoteObjectId
    });
    tombstones = tombstones.filter((entry2) => entry2.path !== operation.path);
    if (!localOnlyConflictCopy && remoteObjectId) {
      mappings = mappings.filter((mapping) => mapping.remoteObjectId !== remoteObjectId && mapping.path !== operation.path);
      mappings.push({ path: operation.path, remoteObjectId, entityKind: entityKind2 });
    }
  } else if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    base = base.filter((entry2) => entry2.path !== operation.path);
    mappings = mappings.filter((mapping) => mapping.path !== operation.path);
    tombstones = tombstones.filter((entry2) => entry2.path !== operation.path);
    tombstones.push({
      path: operation.path,
      entityKind: entityKind2,
      deletedOn: operation.kind === "trash-remote" ? "local" : "remote",
      remoteObjectId,
      sourceDeviceId: state.deviceIdentity
    });
  } else if (operation.kind === "noop" && operation.reasons.some((reason) => reason.code === "both-deleted") && oldBase) {
    base = base.filter((entry2) => entry2.path !== operation.path);
    mappings = mappings.filter((mapping) => mapping.path !== operation.path);
    tombstones = tombstones.filter((entry2) => entry2.path !== operation.path);
    tombstones.push({
      path: operation.path,
      entityKind: entityKind2,
      deletedOn: "both",
      remoteObjectId,
      sourceDeviceId: state.deviceIdentity
    });
  } else if (operation.kind === "noop" && operation.reasons.some((reason) => reason.code === "safe-union-identical") && operation.contentVersion) {
    base = base.filter((entry2) => entry2.path !== operation.path);
    base.push({
      path: operation.path,
      entityKind: entityKind2,
      localExisted: true,
      remoteExisted: true,
      content: receipt.evidence ?? operation.contentVersion.content,
      remoteObjectId
    });
    tombstones = tombstones.filter((entry2) => entry2.path !== operation.path);
    if (remoteObjectId) {
      mappings = mappings.filter((mapping) => mapping.remoteObjectId !== remoteObjectId && mapping.path !== operation.path);
      mappings.push({ path: operation.path, remoteObjectId, entityKind: entityKind2 });
    }
  } else if (operation.kind === "identity-preserving-move" && operation.fromPath && operation.toPath) {
    base = base.filter((entry2) => entry2.path !== operation.fromPath && entry2.path !== operation.toPath);
    base.push({
      path: operation.toPath,
      entityKind: entityKind2,
      localExisted: true,
      remoteExisted: true,
      content: receipt.evidence ?? oldBase?.content,
      remoteObjectId
    });
    tombstones = tombstones.filter((entry2) => entry2.path !== operation.fromPath && entry2.path !== operation.toPath);
    if (remoteObjectId) {
      mappings = mappings.filter((mapping) => mapping.remoteObjectId !== remoteObjectId && mapping.path !== operation.fromPath && mapping.path !== operation.toPath);
      mappings.push({ path: operation.toPath, remoteObjectId, entityKind: entityKind2 });
    }
  }
  return { ...state, base, remoteMappings: mappings, tombstones };
}
var StateCommitCoordinator = class {
  constructor(store, context) {
    this.store = store;
    this.context = context;
  }
  store;
  context;
  async markPending(operation, expectedStateRevision, checkpointId) {
    return this.writeJournal(operation, { operationId: operation.operationId, path: operation.path, status: "pending", checkpointId }, expectedStateRevision);
  }
  async markUncertain(operation, expectedStateRevision, checkpointId) {
    return this.writeJournal(operation, { operationId: operation.operationId, path: operation.path, status: "uncertain", checkpointId }, expectedStateRevision);
  }
  /** Remove an exact known-unmutated pending intent after a mutation-boundary stale check. */
  async discardPending(operation, expectedStateRevision) {
    const loaded = await this.store.load(this.context);
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `trusted state unavailable while retiring stale intent: ${loaded.status}` };
    if (loaded.state.stateRevision !== expectedStateRevision) return { status: "stale-state", actualRevision: loaded.state.stateRevision };
    const pending = loaded.state.operations.find((item) => item.operationId === operation.operationId);
    if (!pending || pending.status !== "pending" || pending.path !== operation.path) {
      return { status: "recovery-required", reason: "stale intent cannot be retired because its exact pending journal is unavailable" };
    }
    const updated = {
      ...loaded.state,
      stateRevision: nextRevision(loaded.state.stateRevision),
      operations: loaded.state.operations.filter((item) => item.operationId !== operation.operationId)
    };
    const saved = await this.store.saveTrusted(updated, loaded.state.stateRevision);
    if (saved.status === "saved") return { status: "committed", newStateRevision: saved.stateRevision };
    if (saved.status === "stale-revision") return { status: "stale-state", actualRevision: saved.actualRevision };
    return { status: "recovery-required", reason: saved.reason };
  }
  async commitVerifiedSuccess(operation, receipt, expectedStateRevision) {
    if (receipt.operationId !== operation.operationId) return { status: "recovery-required", reason: "execution receipt does not match planned operation" };
    if (receipt.durable !== true || receipt.integrityVerified !== true) return { status: "recovery-required", reason: "authoritative commit requires durable integrity-verified execution" };
    const loaded = await this.store.load(this.context);
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `trusted state unavailable during success commit: ${loaded.status}` };
    if (expectedStateRevision && loaded.state.stateRevision !== expectedStateRevision) return { status: "stale-state", actualRevision: loaded.state.stateRevision };
    const priorJournal = loaded.state.operations.find((item) => item.operationId === operation.operationId);
    const updatedEffectState = applySuccessfulOperation(loaded.state, operation, receipt);
    const newStateRevision = nextRevision(loaded.state.stateRevision);
    const updated = {
      ...updatedEffectState,
      stateRevision: newStateRevision,
      operations: upsertJournal(updatedEffectState, {
        operationId: operation.operationId,
        path: operation.path,
        status: "completed",
        verificationEvidenceRef: receipt.verificationEvidenceRef,
        checkpointId: priorJournal?.checkpointId
      })
    };
    const saved = await this.store.saveTrusted(updated, loaded.state.stateRevision);
    if (saved.status === "saved") return { status: "committed", newStateRevision: saved.stateRevision };
    if (saved.status === "stale-revision") return { status: "stale-state", actualRevision: saved.actualRevision };
    return { status: "recovery-required", reason: saved.reason };
  }
  async writeJournal(operation, entry2, expectedStateRevision) {
    const loaded = await this.store.load(this.context);
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `trusted state unavailable while journaling: ${loaded.status}` };
    if (expectedStateRevision && loaded.state.stateRevision !== expectedStateRevision) return { status: "stale-state", actualRevision: loaded.state.stateRevision };
    const updated = {
      ...loaded.state,
      stateRevision: nextRevision(loaded.state.stateRevision),
      operations: upsertJournal(loaded.state, entry2)
    };
    const saved = await this.store.saveTrusted(updated, loaded.state.stateRevision);
    if (saved.status === "saved") return { status: "committed", newStateRevision: saved.stateRevision };
    if (saved.status === "stale-revision") return { status: "stale-state", actualRevision: saved.actualRevision };
    return { status: "recovery-required", reason: saved.reason };
  }
};

// src/product/operation-isolation.ts
function value(path2) {
  return path2 === void 0 ? void 0 : String(path2).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}
function ancestor(parent, child) {
  return child === parent || child.startsWith(`${parent}/`);
}
function paths(operation) {
  return [operation.path, operation.fromPath, operation.toPath, ...operation.preconditions.flatMap((precondition) => "path" in precondition ? [precondition.path] : [])].map(value).filter((path2) => path2 !== void 0);
}
function dependsOnSkippedOperation(candidate, skipped) {
  const candidates = paths(candidate);
  for (const blocked2 of skipped) {
    const blockedPaths = paths(blocked2);
    for (const blockedPath of blockedPaths) for (const candidatePath of candidates) {
      if (ancestor(blockedPath, candidatePath)) return true;
      if ((candidate.destructive || candidate.kind === "identity-preserving-move" || blocked2.kind === "identity-preserving-move") && ancestor(candidatePath, blockedPath)) return true;
    }
  }
  return false;
}
function replaceEffect(intent, effectId, update) {
  const effects = intent.effects.map((effect) => effect.effectId === effectId ? update(effect) : effect);
  return { ...intent, effects };
}
function replaceIntentEffect(authority, operationId, effectId, update) {
  return {
    ...authority,
    operationIntents: authority.operationIntents.map((intent) => String(intent.operationId) === operationId ? replaceEffect(intent, effectId, update) : intent)
  };
}
function replaceLocalTransaction(authority, transaction) {
  const retained = authority.localTransactions.filter((existing) => existing.transactionId !== transaction.transactionId);
  return { ...authority, localTransactions: [...retained, transaction] };
}
function findEffect(authority, operationId, effectId) {
  return authority.operationIntents.find((intent) => String(intent.operationId) === operationId)?.effects.find((effect) => effect.effectId === effectId);
}
var DurableEffectLifecycleCoordinator = class {
  constructor(authorityStore, dispatcher) {
    this.authorityStore = authorityStore;
    this.dispatcher = dispatcher;
  }
  authorityStore;
  dispatcher;
  async loadAuthority() {
    const loaded = await this.authorityStore.loadAuthority();
    return loaded.status === "trusted" ? { status: "trusted", state: loaded.state } : { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
  }
  async persistIntent(intent, localTransactions = []) {
    if (intent.effects.some((effect) => effect.stage !== "intent-persisted")) {
      return { status: "recovery-required", reason: "new operation intent must begin with every physical effect at intent-persisted" };
    }
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    if (loaded.state.operationIntents.some((existing) => String(existing.operationId) === String(intent.operationId))) {
      return { status: "recovery-required", reason: "operation intent already exists; restart/recovery must consume durable evidence instead of replacing it" };
    }
    const existingTransactions = new Set(loaded.state.localTransactions.map((transaction) => String(transaction.transactionId)));
    if (localTransactions.some((transaction) => existingTransactions.has(String(transaction.transactionId)))) {
      return { status: "recovery-required", reason: "local mutation transaction identity is already present; restart/recovery must consume it" };
    }
    return this.save({
      ...loaded.state,
      operationIntents: [...loaded.state.operationIntents, intent],
      localTransactions: [...loaded.state.localTransactions, ...localTransactions]
    }, loaded.state);
  }
  /** Persist dispatch-authorized before returning the descriptor to the caller. */
  async authorizePersistedEffect(operationId, effectId) {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const effect = findEffect(loaded.state, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "persisted physical effect not found" };
    if (effect.stage !== "intent-persisted") {
      return { status: "already-progressed", stage: effect.stage, recoveryAction: restartRecoveryDirective(effect).action };
    }
    const dispatchAuthorized = replaceIntentEffect(loaded.state, operationId, effectId, (current) => ({ ...current, stage: "dispatch-authorized" }));
    const saved = await this.save(dispatchAuthorized, loaded.state);
    return saved.status === "persisted" ? { status: "dispatch-authorized", authority: saved.authority } : saved;
  }
  /** Persist the exact LOCAL transaction returned by the frozen transactional seam. */
  async persistLocalTransaction(transaction) {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    if (!loaded.state.localTransactions.some((existing) => existing.transactionId === transaction.transactionId)) {
      return { status: "recovery-required", reason: "LOCAL transaction progress cannot be persisted because its durable transaction intent is missing" };
    }
    return this.save(replaceLocalTransaction(loaded.state, transaction), loaded.state);
  }
  /**
   * Record a physical result after dispatch OR conservative restart reconciliation.
   * Only an exact verified-effect may advance to effect-verified. All ambiguous or
   * conflicting post-dispatch states remain outcome-unknown and restart-recoverable.
   */
  async recordPhysicalResult(operationId, effectId, physical) {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const effect = findEffect(loaded.state, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "persisted physical effect not found while recording outcome" };
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") {
      if (effect.stage === "effect-verified" || effect.stage === "state-committed") {
        return { status: "already-progressed", stage: effect.stage, recoveryAction: restartRecoveryDirective(effect).action };
      }
      return { status: "recovery-required", reason: `physical result cannot be recorded from ${effect.stage}` };
    }
    if (physical.status === "verified-effect") {
      const verified = replaceIntentEffect(loaded.state, operationId, effectId, (current) => ({
        ...current,
        stage: "effect-verified",
        verificationEvidenceRef: physical.verificationEvidenceRef
      }));
      const saved2 = await this.save(verified, loaded.state);
      return saved2.status === "persisted" ? { status: "effect-verified", authority: saved2.authority } : saved2;
    }
    const uncertain = replaceIntentEffect(loaded.state, operationId, effectId, (current) => ({ ...current, stage: "outcome-unknown" }));
    const saved = await this.save(uncertain, loaded.state);
    if (saved.status !== "persisted") return saved;
    return { status: physical.status, reason: physical.reason, authority: saved.authority };
  }
  /** Compatibility helper retained for isolated lifecycle tests; production may use the split methods above. */
  async dispatchPersistedEffect(operationId, effectId) {
    if (!this.dispatcher) return { status: "recovery-required", reason: "no physical dispatcher is configured" };
    const authorized = await this.authorizePersistedEffect(operationId, effectId);
    if (authorized.status !== "dispatch-authorized") return authorized;
    const effect = findEffect(authorized.authority, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "dispatch-authorized effect disappeared after durable save" };
    const physical = await this.dispatcher.dispatch(effect.descriptor);
    return this.recordPhysicalResult(operationId, effectId, physical);
  }
  /**
   * Retire only an exact current-generation intent for which dispatch authority
   * was never granted to any physical effect. This is the frozen restart
   * directive for intent-persisted: discard the unattempted authorization record,
   * then require ordinary planning/authority to decide whether work is still valid.
   */
  async retireUnattemptedIntent(operationId) {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const intent = loaded.state.operationIntents.find((existing) => String(existing.operationId) === operationId);
    if (!intent) return { status: "recovery-required", reason: "unattempted intent not found" };
    if (intent.semanticAuthority.generation !== loaded.state.semanticGeneration) {
      return { status: "recovery-required", reason: "stale-generation intent cannot be silently retired as current authority" };
    }
    if (!intent.effects.length || intent.effects.some((effect) => effect.stage !== "intent-persisted" || effect.verificationEvidenceRef !== void 0)) {
      return { status: "recovery-required", reason: "only wholly unattempted intent-persisted effects may be retired" };
    }
    const candidate = {
      ...loaded.state,
      operationIntents: loaded.state.operationIntents.filter((existing) => String(existing.operationId) !== operationId),
      localTransactions: loaded.state.localTransactions.filter((transaction) => String(transaction.operationId) !== operationId)
    };
    return this.save(candidate, loaded.state);
  }
  async markEffectStateCommitted(operationId, effectId, verificationEvidenceRef) {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
    const effect = findEffect(loaded.state, operationId, effectId);
    if (!effect) return { status: "recovery-required", reason: "verified physical effect not found" };
    if (effect.stage === "state-committed") return { status: "state-committed", authority: loaded.state };
    if (effect.stage !== "effect-verified" || effect.verificationEvidenceRef !== verificationEvidenceRef) {
      return { status: "recovery-required", reason: "state commit requires the exact durable physical verification reference" };
    }
    const committed = replaceIntentEffect(loaded.state, operationId, effectId, (current) => ({ ...current, stage: "state-committed" }));
    const saved = await this.save(committed, loaded.state);
    return saved.status === "persisted" ? { status: "state-committed", authority: saved.authority } : saved;
  }
  async save(candidate, expected) {
    const result = await this.authorityStore.saveAuthority(candidate, expected.persistenceRevision, expected.semanticGeneration);
    if (result.status === "saved") {
      return { status: "persisted", authority: { ...candidate, persistenceRevision: result.persistenceRevision, semanticGeneration: result.semanticGeneration } };
    }
    if (result.status === "stale-persistence") return { status: "stale-authority", reason: "persistence revision changed while advancing physical effect lifecycle" };
    if (result.status === "stale-semantic-authority") return { status: "stale-authority", reason: "semantic generation changed while advancing physical effect lifecycle" };
    return { status: "recovery-required", reason: "authoritative metadata failed semantic validation during physical effect lifecycle" };
  }
};

// src/core/execution-coordinator.ts
function baseAuthorityPath(operation) {
  return operation.kind === "identity-preserving-move" && operation.fromPath ? operation.fromPath : operation.path;
}
function operationRequiresIdentityAuthority(operation) {
  return ["upload-update", "trash-remote", "identity-preserving-move", "clean-text-merge"].includes(operation.kind);
}
function identityAuthorityPath(operation) {
  return operation.kind === "identity-preserving-move" && operation.fromPath ? operation.fromPath : operation.path;
}
function uniqueTrustedIdentityMapping(path2, expectedRemoteObjectId, mappings) {
  if (!expectedRemoteObjectId) return void 0;
  const byPath = mappings.filter((mapping2) => mapping2.path === path2);
  const byId = mappings.filter((mapping2) => mapping2.remoteObjectId === expectedRemoteObjectId);
  if (byPath.length !== 1 || byId.length !== 1) return void 0;
  const mapping = byPath[0];
  return mapping && mapping.remoteObjectId === expectedRemoteObjectId && byId[0]?.path === path2 && byId[0]?.remoteObjectId === mapping.remoteObjectId ? mapping : void 0;
}
function physicalOperation(operation) {
  return [
    "upload-create",
    "upload-update",
    "download-create",
    "download-update",
    "identity-preserving-move",
    "clean-text-merge",
    "trash-local",
    "trash-remote"
  ].includes(operation.kind);
}
function exactContentMatches(actual, expected) {
  if (!expected) return true;
  if (!actual) return false;
  if (expected.hash !== void 0 && actual.hash !== expected.hash) return false;
  if (expected.sizeBytes !== void 0 && actual.sizeBytes !== expected.sizeBytes) return false;
  return true;
}
function exactCanonicalCommitAlreadyApplied(state, operation, receipt) {
  if (!receipt.verificationEvidenceRef) return false;
  const journal = state.operations.find((entry2) => entry2.operationId === operation.operationId);
  if (!journal || journal.status !== "completed" || journal.path !== operation.path || journal.verificationEvidenceRef !== receipt.verificationEvidenceRef) return false;
  const expectedEvidence = receipt.evidence ?? operation.contentVersion?.content;
  const resultingRemoteObjectId2 = receipt.resultingRemoteObjectId ?? operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
  if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
    const entries = state.base.filter((entry3) => entry3.path === operation.path);
    if (entries.length !== 1) return false;
    const entry2 = entries[0];
    const entityKind2 = operation.contentVersion?.entityKind ?? entry2.entityKind;
    const localOnlyConflictCopy = operation.kind === "download-create" && operation.contentVersion !== void 0 && operation.path !== operation.contentVersion.path;
    if (entry2.entityKind !== entityKind2 || entry2.localExisted !== true || entry2.remoteExisted !== !localOnlyConflictCopy) return false;
    if (!exactContentMatches(entry2.content, expectedEvidence)) return false;
    if (localOnlyConflictCopy) return entry2.remoteObjectId === void 0 && state.remoteMappings.every((mapping) => mapping.path !== operation.path);
    if (!resultingRemoteObjectId2 || entry2.remoteObjectId !== resultingRemoteObjectId2) return false;
    const byPath = state.remoteMappings.filter((mapping) => mapping.path === operation.path);
    const byId = state.remoteMappings.filter((mapping) => mapping.remoteObjectId === resultingRemoteObjectId2);
    return byPath.length === 1 && byId.length === 1 && byPath[0]?.remoteObjectId === resultingRemoteObjectId2 && byId[0]?.path === operation.path && byPath[0]?.entityKind === entityKind2;
  }
  if (operation.kind === "identity-preserving-move" && operation.fromPath && operation.toPath) {
    if (!resultingRemoteObjectId2) return false;
    if (state.base.some((entry2) => entry2.path === operation.fromPath)) return false;
    if (state.remoteMappings.some((mapping) => mapping.path === operation.fromPath)) return false;
    const targetBase = state.base.filter((entry2) => entry2.path === operation.toPath);
    const targetMapping = state.remoteMappings.filter((mapping) => mapping.path === operation.toPath || mapping.remoteObjectId === resultingRemoteObjectId2);
    return targetBase.length === 1 && targetBase[0]?.remoteObjectId === resultingRemoteObjectId2 && targetMapping.length === 1 && targetMapping[0]?.path === operation.toPath && targetMapping[0]?.remoteObjectId === resultingRemoteObjectId2;
  }
  if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (state.base.some((entry2) => entry2.path === operation.path)) return false;
    if (state.remoteMappings.some((mapping) => mapping.path === operation.path)) return false;
    const expectedDeletedOn = operation.kind === "trash-remote" ? "local" : "remote";
    const tombstones = state.tombstones.filter((entry2) => entry2.path === operation.path && entry2.deletedOn === expectedDeletedOn);
    if (tombstones.length !== 1) return false;
    return !resultingRemoteObjectId2 || tombstones[0]?.remoteObjectId === resultingRemoteObjectId2;
  }
  return false;
}
function resolveAuthorityCompleteOperation(operation, authority, trustedRemoteMappings = []) {
  const preconditions = [];
  const requiresIdentity = operationRequiresIdentityAuthority(operation);
  for (const precondition of operation.preconditions) {
    if (precondition.kind === "base-trusted") {
      const authorityPath = baseAuthorityPath(operation);
      const pathAuthority = authority.pathConvergence.find((entry2) => entry2.path === authorityPath)?.state;
      if (!pathAuthority || pathAuthority.status !== "converged" || pathAuthority.generation !== authority.semanticGeneration) {
        return { status: "incomplete-authority", reason: `exact BASE authority unavailable for ${String(authorityPath)}` };
      }
      const exact = { generation: authority.semanticGeneration, path: authorityPath, fingerprint: pathAuthority.baseFingerprint };
      preconditions.push({ kind: "base-authority", authority: exact });
      continue;
    }
    if (precondition.kind === "identity-unambiguous") {
      continue;
    }
    if (requiresIdentity && precondition.kind === "identity-authority") {
      continue;
    }
    preconditions.push(precondition);
  }
  if (requiresIdentity) {
    const expectedRemoteObjectId = operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
    const authorityPath = identityAuthorityPath(operation);
    const pathAuthority = authority.pathConvergence.find((entry2) => entry2.path === authorityPath)?.state;
    if (!pathAuthority || pathAuthority.status !== "converged" || pathAuthority.generation !== authority.semanticGeneration) {
      return { status: "incomplete-authority", reason: `current-generation path authority unavailable for ${String(authorityPath)}` };
    }
    const mapping = uniqueTrustedIdentityMapping(authorityPath, expectedRemoteObjectId, trustedRemoteMappings);
    if (!mapping) return { status: "incomplete-authority", reason: `unique trusted remote identity mapping unavailable for ${String(authorityPath)}` };
    const proof = {
      generation: authority.semanticGeneration,
      status: "unique",
      path: mapping.path,
      remoteObjectId: mapping.remoteObjectId
    };
    preconditions.push({ kind: "identity-authority", proof });
  }
  return { status: "ready", operation: { ...operation, authorityComplete: true, preconditions } };
}
var AuthorityCompleteExecutionCoordinator = class {
  constructor(authorityStore, executor, committer, identityStateStore, stateContext) {
    this.authorityStore = authorityStore;
    this.executor = executor;
    this.committer = committer;
    this.identityStateStore = identityStateStore;
    this.stateContext = stateContext;
    this.observer = authorityStore.executionLifecycleObserver;
  }
  authorityStore;
  executor;
  committer;
  identityStateStore;
  stateContext;
  observer;
  async executeOperation(operation) {
    this.observe(operation, "operation-start");
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status === "uninitialized") return this.complete(operation, { status: "recovery-required", reason: "authoritative synchronization metadata is uninitialized" });
    if (loaded.status === "recovery-required") return this.complete(operation, { status: "recovery-required", reason: "authoritative synchronization metadata requires recovery" });
    if (!this.identityStateStore || !this.stateContext) {
      return this.complete(operation, { status: "recovery-required", reason: "trusted canonical synchronization state is unavailable for exact commit CAS" });
    }
    const canonicalAtStart = await this.identityStateStore.load(this.stateContext);
    if (canonicalAtStart.status !== "trusted") {
      return this.complete(operation, { status: "recovery-required", reason: "trusted canonical synchronization state is unavailable for exact commit CAS" });
    }
    const expectedStateRevision = canonicalAtStart.state.stateRevision;
    const mappings = operationRequiresIdentityAuthority(operation) ? canonicalAtStart.state.remoteMappings : [];
    const resolved = resolveAuthorityCompleteOperation(operation, loaded.state, mappings);
    if (resolved.status !== "ready") return this.complete(operation, { status: "recovery-required", reason: resolved.reason });
    const executable = resolved.operation;
    this.observe(executable, "operation-precondition-validation-start");
    let validation;
    try {
      validation = await this.executor.validatePreconditions(executable);
    } catch (error) {
      this.observe(executable, "operation-precondition-validation-failed", "threw", error);
      throw error;
    }
    this.observe(executable, "operation-precondition-validated", validation.status);
    const invalid = this.mapAuthoritativeValidation(validation);
    if (invalid) {
      this.observe(executable, "operation-precondition-validation-failed", invalid.status, void 0, validation.status === "stale" ? validation.failed : void 0);
      return this.complete(executable, invalid);
    }
    this.observe(executable, "content-mutation-start");
    let execution;
    try {
      execution = await this.executor.execute(executable);
    } catch (error) {
      const diagnosticStore = this.authorityStore;
      const stage = diagnosticStore.consumeAuthorityPersistenceFailureStage?.(error) ?? "content-mutation-failed";
      this.observe(executable, stage, "threw", error);
      throw error;
    }
    if (execution.status === "durable-verified-success") {
      this.observe(executable, "content-mutation-complete", execution.status);
      this.observe(executable, "integrity-verification-complete", "verified");
      const canonicalNow = await this.identityStateStore.load(this.stateContext);
      if (canonicalNow.status !== "trusted") {
        return this.complete(executable, { status: "recovery-required", reason: "canonical state became unavailable after physical verification" });
      }
      const priorCanonicalCommit = physicalOperation(executable) && exactCanonicalCommitAlreadyApplied(canonicalNow.state, executable, execution.receipt);
      if (priorCanonicalCommit) {
        this.observe(executable, "state-commit-start", "already-committed");
        const finalized = await this.finalizeDurableEffects(executable);
        if (!finalized.ok) {
          this.observe(executable, "state-commit-failed", "durable-finalization-failed");
          return this.complete(executable, { status: "recovery-required", reason: finalized.reason });
        }
        const commit2 = { status: "committed", newStateRevision: canonicalNow.state.stateRevision };
        this.observe(executable, "state-commit-complete", "already-committed");
        return this.complete(executable, { status: "committed", commit: commit2 });
      }
      if (physicalOperation(executable)) {
        const readiness = await this.authorityStore.loadAuthority();
        if (readiness.status !== "trusted") {
          return this.complete(executable, { status: "recovery-required", reason: "durable effect authority unavailable before canonical state commit" });
        }
        const intent = readiness.state.operationIntents.find((value2) => value2.operationId === executable.operationId);
        if (!intent) return this.complete(executable, { status: "recovery-required", reason: "durable physical intent missing before canonical state commit" });
        if (intent.effects.some((effect) => effect.stage === "state-committed")) {
          return this.complete(executable, { status: "recovery-required", reason: "state-committed durable marker lacks exact prior canonical commit proof" });
        }
        if (!intent.effects.every((effect) => effect.stage === "effect-verified" && Boolean(effect.verificationEvidenceRef))) {
          return this.complete(executable, { status: "recovery-required", reason: "canonical state commit requires every durable physical effect to remain effect-verified" });
        }
      }
      this.observe(executable, "state-commit-start");
      let commit;
      try {
        commit = await this.committer.commitVerifiedSuccess(executable, execution.receipt, expectedStateRevision);
      } catch (error) {
        this.observe(executable, "state-commit-failed", "threw", error);
        throw error;
      }
      this.observe(executable, "state-commit-complete", commit.status);
      if (commit.status === "committed") {
        const finalized = await this.finalizeDurableEffects(executable);
        if (!finalized.ok) {
          this.observe(executable, "state-commit-failed", "durable-finalization-failed");
          return this.complete(executable, { status: "recovery-required", reason: finalized.reason });
        }
        return this.complete(executable, { status: "committed", commit });
      }
      if (commit.status === "stale-state") {
        this.observe(executable, "state-commit-failed", commit.status);
        return this.complete(executable, { status: "stale-state", actualRevision: commit.actualRevision });
      }
      this.observe(executable, "state-commit-failed", commit.status);
      return this.complete(executable, { status: "recovery-required", reason: commit.reason });
    }
    this.observe(executable, "content-mutation-failed", execution.status, void 0, execution.status === "stale-precondition" ? execution.failed : void 0);
    return this.complete(executable, this.mapAuthoritativeExecution(execution));
  }
  async finalizeDurableEffects(operation) {
    if (!physicalOperation(operation)) return { ok: true };
    const lifecycle = new DurableEffectLifecycleCoordinator(this.authorityStore);
    const loaded = await lifecycle.loadAuthority();
    if (loaded.status !== "trusted") return { ok: false, reason: loaded.reason };
    const intent = loaded.state.operationIntents.find((value2) => value2.operationId === operation.operationId);
    if (!intent) return { ok: false, reason: "canonical state committed but durable physical intent is missing" };
    for (const effect of intent.effects) {
      if (effect.stage === "state-committed") continue;
      if (effect.stage !== "effect-verified" || !effect.verificationEvidenceRef) {
        return { ok: false, reason: `canonical state committed but durable effect ${effect.effectId} is ${effect.stage}` };
      }
      const finalized = await lifecycle.markEffectStateCommitted(String(operation.operationId), effect.effectId, effect.verificationEvidenceRef);
      if (finalized.status !== "state-committed") {
        return { ok: false, reason: `canonical state committed but durable effect ${effect.effectId} finalization failed (${finalized.status})` };
      }
    }
    return { ok: true };
  }
  complete(operation, result) {
    this.observe(operation, "operation-complete", result.status);
    return result;
  }
  observe(operation, stage, result, error, failed) {
    try {
      this.observer?.(operation, stage, result, error, failed);
    } catch {
    }
  }
  mapAuthoritativeValidation(result) {
    if (result.status === "valid") return void 0;
    if (result.status === "stale") return { status: "stale-precondition", reason: "exact executable authority changed before mutation", failed: result.failed };
    if (result.status === "blocked") return { status: "blocked", reason: result.reason };
    return { status: "recovery-required", reason: result.reason };
  }
  mapAuthoritativeExecution(result) {
    if (result.status === "stale-precondition") return { status: "stale-precondition", reason: result.reason, failed: result.failed };
    if (result.status === "blocking-failure") return { status: "blocked", reason: result.reason };
    if (result.status === "recovery-required") return { status: "recovery-required", reason: result.reason };
    if (result.status === "retryable-failure") return { status: "retryable-failure", reason: result.reason };
    if (result.status === "uncertain") return { status: "uncertain", reason: result.reason };
    return { status: "cancelled", reason: result.reason ?? "cancelled" };
  }
};

// src/core/run-coordinator.ts
var lifecycleState = "active";
var lifecycleEpoch = 0;
var deferredReconciliationAcrossLifecycle = false;
function synchronizationLifecycleState() {
  return lifecycleState;
}
function enterSynchronizationLifecycle(next) {
  if (lifecycleState === "unloading" && next !== "active") return;
  if (lifecycleState === next) return;
  lifecycleState = next;
  lifecycleEpoch += 1;
}
function noteDeferredReconciliationAcrossLifecycle() {
  deferredReconciliationAcrossLifecycle = true;
}
function consumeDeferredReconciliationAcrossLifecycle() {
  const value2 = deferredReconciliationAcrossLifecycle;
  deferredReconciliationAcrossLifecycle = false;
  return value2;
}
var MutableCancellationSignal = class {
  cancelledValue = false;
  listeners = /* @__PURE__ */ new Set();
  get cancelled() {
    return this.cancelledValue;
  }
  cancel() {
    if (this.cancelledValue) return;
    this.cancelledValue = true;
    for (const listener of [...this.listeners]) listener();
  }
  onCancellation(listener) {
    if (this.cancelledValue) {
      listener();
      return () => void 0;
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
};
var CoreRunCoordinator = class {
  constructor(vaultIdentity, deviceIdentity, leasePort, holderId) {
    this.vaultIdentity = vaultIdentity;
    this.deviceIdentity = deviceIdentity;
    this.leasePort = leasePort;
    this.holderId = holderId;
  }
  vaultIdentity;
  deviceIdentity;
  leasePort;
  holderId;
  active = false;
  acquiring = false;
  paused = false;
  deferredReconciliation = false;
  lease;
  cancellation = new MutableCancellationSignal();
  async beginRun() {
    if (this.paused) return { status: "paused" };
    if (lifecycleState !== "active") return { status: "stopping" };
    if (this.active || this.acquiring) {
      this.deferredReconciliation = true;
      return { status: "already-running" };
    }
    this.cancellation = new MutableCancellationSignal();
    this.acquiring = true;
    const expectedEpoch = lifecycleEpoch;
    let lease;
    try {
      lease = await this.leasePort.tryAcquire(this.vaultIdentity, this.deviceIdentity, this.holderId);
      if (!lease) return { status: "lease-unavailable" };
      if (this.active) {
        await lease.release();
        this.deferredReconciliation = true;
        return { status: "already-running" };
      }
      if (this.paused) {
        await lease.release();
        return { status: "paused" };
      }
      if (lifecycleState !== "active" || lifecycleEpoch !== expectedEpoch) {
        await lease.release();
        return { status: "stopping" };
      }
      if (this.cancellation.cancelled) {
        await lease.release();
        return { status: "cancelled" };
      }
      this.lease = lease;
      this.active = true;
      return { status: "started" };
    } finally {
      this.acquiring = false;
    }
  }
  requestCancellation() {
    if (this.active || this.acquiring) this.cancellation.cancel();
  }
  cancellationSignal() {
    return this.cancellation;
  }
  canStartNextOperation() {
    return this.active && !this.paused && lifecycleState === "active" && !this.cancellation.cancelled;
  }
  noteLocalOrRemoteChangeDuringRun() {
    if (this.active || this.acquiring) this.deferredReconciliation = true;
  }
  pause() {
    this.paused = true;
    this.requestCancellation();
  }
  resume() {
    this.paused = false;
  }
  isPaused() {
    return this.paused;
  }
  isCancellationRequested() {
    return this.cancellation.cancelled || lifecycleState !== "active";
  }
  isRunActive() {
    return this.active || this.acquiring;
  }
  async finishRun() {
    const reconcileAgain = this.deferredReconciliation;
    this.active = false;
    this.deferredReconciliation = false;
    const lease = this.lease;
    this.lease = void 0;
    if (lease) await lease.release();
    if (reconcileAgain && lifecycleState !== "active") {
      noteDeferredReconciliationAcrossLifecycle();
      return { reconcileAgain: false };
    }
    return { reconcileAgain };
  }
};

// src/product/remote-update-convergence.ts
function verifyPreservedRemoteUpdateConvergence(descriptor, entries) {
  const mutation = descriptor.remoteMutation;
  if (descriptor.mutationKind !== "update" || mutation.kind !== "existing-file-content-update") {
    return { status: "not-converged", reason: "descriptor is not an existing-file-content-update" };
  }
  if (descriptor.targetPath !== mutation.path || descriptor.intendedContent.algorithm !== "sha256" || mutation.intendedContent.algorithm !== "sha256" || descriptor.intendedContent.hash !== mutation.intendedContent.hash || descriptor.intendedContent.sizeBytes !== mutation.intendedContent.sizeBytes || mutation.identityAuthority.status !== "unique" || mutation.identityAuthority.path !== descriptor.targetPath || mutation.identityAuthority.remoteObjectId !== mutation.remoteObjectId) {
    return { status: "not-converged", reason: "persisted REMOTE update descriptor authority is inconsistent" };
  }
  if (mutation.remoteObjectId === mutation.candidateRemoteObjectId) {
    return { status: "not-converged", reason: "predecessor and candidate identities are not distinct" };
  }
  const samePath = entries.filter((entry2) => !entry2.trashed && entry2.path === descriptor.targetPath);
  if (samePath.length !== 2) {
    return { status: "not-converged", reason: "REMOTE update path does not contain exactly predecessor plus candidate" };
  }
  const predecessors = samePath.filter((entry2) => entry2.remoteObjectId === mutation.remoteObjectId);
  const candidates = samePath.filter((entry2) => entry2.remoteObjectId === mutation.candidateRemoteObjectId);
  if (predecessors.length !== 1 || candidates.length !== 1) {
    return { status: "not-converged", reason: "REMOTE update path lacks the exact persisted predecessor/candidate identities" };
  }
  const predecessor = predecessors[0];
  const candidate = candidates[0];
  if (predecessor.entityKind !== "file" || candidate.entityKind !== "file") {
    return { status: "not-converged", reason: "REMOTE update predecessor/candidate are not both files" };
  }
  if (predecessor.content?.revision !== String(mutation.expectedRevision)) {
    return { status: "not-converged", reason: "REMOTE update predecessor revision does not match persisted expectedRevision" };
  }
  if (candidate.content?.hash !== descriptor.intendedContent.hash || candidate.content.sizeBytes !== descriptor.intendedContent.sizeBytes) {
    return { status: "not-converged", reason: "REMOTE update candidate does not match persisted intended content" };
  }
  return { status: "converged", predecessor, candidate };
}

// src/product/authoritative-production-executor-base.ts
var cid = (value2) => contractId(value2);
var internal = (legacy) => legacy;
var intentIdFor = (operation) => cid(`intent:${String(operation.operationId)}`);
var effectIdFor = (operation, suffix) => `effect:${String(operation.operationId)}:${suffix}`;
function canonical(evidence2) {
  if (!evidence2?.hash || evidence2.sizeBytes === void 0) return void 0;
  return { algorithm: "sha256", hash: evidence2.hash, sizeBytes: evidence2.sizeBytes };
}
function baseAuthority(operation) {
  return operation.preconditions.find((value2) => value2.kind === "base-authority")?.authority;
}
function identityAuthority(operation) {
  return operation.preconditions.find((value2) => value2.kind === "identity-authority")?.proof;
}
function expectedRemoteRevision(operation, remoteObjectId) {
  const raw = operation.preconditions.find((value2) => value2.kind === "remote-object" && value2.remoteObjectId === remoteObjectId)?.expectedRevision;
  return raw ? cid(raw) : void 0;
}
function parentPath3(target) {
  const raw = String(target).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const split = raw.lastIndexOf("/");
  return cid(split < 0 ? "" : raw.slice(0, split));
}
function comparisonKey(target) {
  return String(target).replace(/\\/g, "/").normalize("NFC").toLocaleLowerCase("en-US");
}
function transactionPath(operation, role) {
  const token = String(sha256Text(`${String(operation.operationId)}\0${role}\0${String(operation.path)}`)).slice(0, 24);
  return cid(`.brain-sync/${role}/${token}`);
}
function evidenceRef(prefix, value2) {
  return `${prefix}:${String(sha256Text(JSON.stringify(value2)))}`;
}
function aggregateVerificationRef(operation, effects) {
  return evidenceRef("durable-effects", {
    operationId: String(operation.operationId),
    effects: effects.map((effect) => ({ effectId: effect.effectId, verificationEvidenceRef: effect.verificationEvidenceRef }))
  });
}
function resultingRemoteObjectId(operation, effects) {
  for (const descriptor of effects.map((effect) => effect.descriptor)) {
    if (descriptor.kind === "remote-folder-create") return descriptor.remoteMutation.reservedRemoteObjectId;
    if (descriptor.kind === "remote-file") {
      return descriptor.remoteMutation.kind === "reserved-file-create" ? descriptor.remoteMutation.reservedRemoteObjectId : descriptor.remoteMutation.candidateRemoteObjectId;
    }
    if (descriptor.kind === "move" && descriptor.targetSide === "remote" && descriptor.remoteObjectId) return descriptor.remoteObjectId;
    if (descriptor.kind === "trash" && descriptor.targetSide === "remote" && descriptor.remoteObjectId) return descriptor.remoteObjectId;
  }
  return operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
}
function success(operation, effects) {
  const receipt = {
    operationId: operation.operationId,
    durable: true,
    integrityVerified: true,
    evidence: operation.contentVersion?.content,
    resultingRemoteObjectId: resultingRemoteObjectId(operation, effects),
    verificationEvidenceRef: aggregateVerificationRef(operation, effects)
  };
  return { status: "durable-verified-success", receipt };
}
function physicalOperation2(operation) {
  return ["upload-create", "upload-update", "download-create", "download-update", "identity-preserving-move", "clean-text-merge", "trash-local", "trash-remote"].includes(operation.kind);
}
function mapRemoteOutcome(outcome) {
  if (outcome.status === "verified-effect") return { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-effect", outcome.applicationProof) };
  return { status: outcome.status, reason: outcome.reason };
}
function resultReason(value2, fallback) {
  return typeof value2 === "object" && value2 !== null && "reason" in value2 && typeof value2.reason === "string" ? value2.reason : fallback;
}
async function localOrRetainedSource(legacy, version) {
  const reads2 = internal(legacy);
  if (version.observationToken) {
    const read = await reads2.local.readFile(version.path, version.observationToken);
    if (version.content?.hash && read.evidence.hash !== version.content.hash) return void 0;
    return { content: reads2.textVersions?.capture(version, read.content) ?? read.content, evidence: read.evidence };
  }
  const content = await reads2.textVersions?.sourceForRetained(version);
  return content && version.content ? { content, evidence: version.content } : void 0;
}
async function remoteSource(legacy, version, remoteObjectId) {
  const read = await internal(legacy).drive.download(remoteObjectId);
  if (!read.ok || version.content?.hash && read.value.evidence.hash !== version.content.hash) return void 0;
  return { content: read.value.content, evidence: read.value.evidence };
}
async function folderParentId(operation, stateStore, context, root) {
  const parent = parentPath3(operation.path);
  if (String(parent) === "") return root.rootId;
  const loaded = await stateStore.load(context);
  if (loaded.status !== "trusted") return void 0;
  const matches = loaded.state.remoteMappings.filter((value2) => value2.path === parent && value2.entityKind === "folder");
  return matches.length === 1 ? matches[0]?.remoteObjectId : void 0;
}
function localTransaction(operation, intended, suffix, mutationKind) {
  const transactionId = cid(`local-tx:${String(operation.operationId)}:${suffix}`);
  const common = {
    transactionId,
    operationId: operation.operationId,
    path: operation.path,
    stagePath: transactionPath(operation, "stage"),
    backupPath: transactionPath(operation, "backup"),
    stage: "staging",
    expectedEntityKind: "file",
    expectedNewEvidence: intended
  };
  if (mutationKind === "create") return { ...common, mutationKind, expectedTarget: { status: "expected-absent" } };
  const present = operation.preconditions.find((value2) => value2.kind === "path-observation" && value2.side === "local" && value2.path === operation.path && value2.expected === "present");
  const priorEvidence = operation.preconditions.find((value2) => value2.kind === "content-evidence" && value2.side === "local" && value2.path === operation.path)?.expected;
  const prior = canonical(priorEvidence);
  if (!present?.observationToken || !prior) return void 0;
  return {
    ...common,
    mutationKind,
    expectedTarget: {
      status: "expected-present",
      observationToken: cid(present.observationToken),
      entityKind: "file",
      canonicalContent: prior
    }
  };
}
async function prepareIntent(operation, authority, legacy, deps, stateStore, context, root) {
  const intentId = intentIdFor(operation);
  const prepared = [];
  const add = (suffix, descriptor, content, tx) => {
    prepared.push({ effect: { effectId: effectIdFor(operation, suffix), descriptor, stage: "intent-persisted" }, content, localTransaction: tx });
  };
  const identity = identityAuthority(operation);
  const base = baseAuthority(operation);
  const remote = deps.reliableRemoteMutationPort;
  if (operation.kind === "upload-create") {
    const version = operation.contentVersion;
    if (!version || !remote) return { status: "blocked", reason: "REMOTE create lacks planned version or ReliableRemoteMutationPort" };
    if (version.entityKind === "folder") {
      const reserved = await remote.reserveFolderCreateIdentity(root, intentId, operation.path);
      if (!reserved.ok) return { status: "blocked", reason: `REMOTE folder identity reservation failed: ${reserved.signal.kind}` };
      const parentRemoteObjectId = await folderParentId(operation, stateStore, context, root);
      if (!parentRemoteObjectId) return { status: "blocked", reason: "REMOTE folder create lacks unique durable parent identity" };
      add("remote-folder", {
        kind: "remote-folder-create",
        targetSide: "remote",
        mutationKind: "create",
        intentId,
        targetPath: operation.path,
        parentRemoteObjectId,
        pathAuthority: {
          generation: authority.semanticGeneration,
          targetPath: operation.path,
          parentPath: parentPath3(operation.path),
          pathComparisonKey: comparisonKey(operation.path),
          expectedTarget: "absent"
        },
        remoteMutation: reserved.value
      });
    } else {
      const source = await localOrRetainedSource(legacy, version);
      const intended = canonical(source?.evidence ?? version.content);
      if (!source || !intended) return { status: "blocked", reason: "REMOTE file create requires canonical SHA-256 source" };
      const reserved = await remote.reserveFileCreateIdentity(root, intentId, operation.path, intended);
      if (!reserved.ok) return { status: "blocked", reason: `REMOTE file identity reservation failed: ${reserved.signal.kind}` };
      add("remote-file", { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: operation.path, remoteMutation: reserved.value, intendedContent: intended }, source.content);
    }
  } else if (operation.kind === "upload-update") {
    if (!operation.remoteObjectId || !operation.contentVersion || !identity || !remote) return { status: "blocked", reason: "REMOTE update lacks exact identity/reliable mutation authority" };
    const source = await localOrRetainedSource(legacy, operation.contentVersion);
    const intended = canonical(source?.evidence ?? operation.contentVersion.content);
    const revision = expectedRemoteRevision(operation, operation.remoteObjectId);
    if (!source || !intended || !revision) return { status: "blocked", reason: "REMOTE update requires canonical source and exact REMOTE revision" };
    const candidate = await remote.reserveFileCreateIdentity(root, intentId, operation.path, intended);
    if (!candidate.ok) return { status: "blocked", reason: `REMOTE update candidate reservation failed: ${candidate.signal.kind}` };
    add("remote-file", {
      kind: "remote-file",
      targetSide: "remote",
      mutationKind: "update",
      targetPath: operation.path,
      remoteMutation: {
        kind: "existing-file-content-update",
        intentId,
        remoteObjectId: operation.remoteObjectId,
        expectedRevision: revision,
        path: operation.path,
        updateProtocol: "immutable-candidate-preservation",
        candidateRemoteObjectId: candidate.value.reservedRemoteObjectId,
        intendedContent: intended,
        identityAuthority: identity
      },
      intendedContent: intended
    }, source.content);
  } else if (operation.kind === "download-create" || operation.kind === "download-update") {
    const version = operation.contentVersion;
    const remoteObjectId = version?.remoteObjectId ?? operation.remoteObjectId;
    if (!version || !remoteObjectId) return { status: "blocked", reason: "LOCAL mutation lacks exact REMOTE version identity" };
    if (version.entityKind === "folder") {
      if (operation.kind !== "download-create") return { status: "blocked", reason: "LOCAL folder replacement is not a valid synchronization mutation" };
      add("local-folder", {
        kind: "local-folder-create",
        targetSide: "local",
        mutationKind: "create",
        intentId,
        targetPath: operation.path,
        pathAuthority: {
          generation: authority.semanticGeneration,
          targetPath: operation.path,
          parentPath: parentPath3(operation.path),
          pathComparisonKey: comparisonKey(operation.path),
          expectedTarget: "absent"
        }
      });
    } else {
      const source = await remoteSource(legacy, version, remoteObjectId);
      const intended = canonical(source?.evidence ?? version.content);
      if (!source || !intended) return { status: "blocked", reason: "LOCAL file mutation requires canonical downloaded evidence" };
      const kind = operation.kind === "download-create" ? "create" : "replace";
      const tx = localTransaction(operation, intended, "file", kind);
      if (!tx) return { status: "blocked", reason: "LOCAL replace lacks exact pre-mutation observation/content authority" };
      add("local-file", { kind: "local-file", targetSide: "local", mutationKind: kind, targetPath: operation.path, localTransactionId: tx.transactionId, intendedContent: intended }, source.content, tx);
    }
  } else if (operation.kind === "identity-preserving-move") {
    if (!operation.fromPath || !operation.toPath || !identity) return { status: "blocked", reason: "move lacks exact identity/from/to authority" };
    add(operation.targetSide === "remote" ? "remote-move" : "local-move", {
      kind: "move",
      targetSide: operation.targetSide ?? "local",
      fromPath: operation.fromPath,
      toPath: operation.toPath,
      remoteObjectId: operation.remoteObjectId,
      identityAuthority: identity
    });
  } else if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (!base || operation.kind === "trash-remote" && (!operation.remoteObjectId || !identity)) return { status: "blocked", reason: "trash lacks exact BASE/identity authority" };
    add(operation.kind === "trash-remote" ? "remote-trash" : "local-trash", {
      kind: "trash",
      targetSide: operation.kind === "trash-remote" ? "remote" : "local",
      path: operation.path,
      remoteObjectId: operation.remoteObjectId,
      baseAuthority: base,
      identityAuthority: identity
    });
  } else if (operation.kind === "clean-text-merge") {
    const version = operation.contentVersion;
    if (!version || version.entityKind !== "file" || !operation.remoteObjectId || !identity || !remote) return { status: "blocked", reason: "clean merge lacks exact merged/REMOTE authority" };
    const source = await localOrRetainedSource(legacy, version);
    const intended = canonical(version.content);
    const revision = expectedRemoteRevision(operation, operation.remoteObjectId);
    if (!source || !intended || !revision) return { status: "blocked", reason: "clean merge lacks canonical retained bytes or REMOTE revision" };
    const tx = localTransaction(operation, intended, "merge", "replace");
    if (!tx) return { status: "blocked", reason: "clean merge LOCAL side lacks exact prior authority" };
    add("local-merge", { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: operation.path, localTransactionId: tx.transactionId, intendedContent: intended }, source.content, tx);
    const candidate = await remote.reserveFileCreateIdentity(root, intentId, operation.path, intended);
    if (!candidate.ok) return { status: "blocked", reason: `clean merge candidate reservation failed: ${candidate.signal.kind}` };
    add("remote-merge", {
      kind: "remote-file",
      targetSide: "remote",
      mutationKind: "update",
      targetPath: operation.path,
      remoteMutation: {
        kind: "existing-file-content-update",
        intentId,
        remoteObjectId: operation.remoteObjectId,
        expectedRevision: revision,
        path: operation.path,
        updateProtocol: "immutable-candidate-preservation",
        candidateRemoteObjectId: candidate.value.reservedRemoteObjectId,
        intendedContent: intended,
        identityAuthority: identity
      },
      intendedContent: intended
    }, source.content);
  }
  if (!prepared.length) return { status: "blocked", reason: `unsupported recoverable operation ${operation.kind}` };
  return {
    status: "ready",
    intent: {
      logicalKind: operation.kind === "clean-text-merge" ? "clean-text-merge" : "single-effect",
      operationId: operation.operationId,
      intentId,
      semanticAuthority: { generation: authority.semanticGeneration },
      effects: prepared.map((value2) => value2.effect)
    },
    prepared
  };
}
async function verifyRemote(legacy, descriptor) {
  const reads2 = internal(legacy);
  const result = await reads2.drive.listForReconciliation(reads2.runEvidence().managedRemote.rootId);
  if (!result.ok || result.value.completeness.status !== "complete") return { ok: false, reason: "complete current REMOTE listing unavailable for logical convergence" };
  const active = result.value.entries.filter((value2) => !value2.trashed);
  if (descriptor.kind === "remote-file") {
    if (descriptor.remoteMutation.kind === "existing-file-content-update") {
      const update = verifyPreservedRemoteUpdateConvergence(descriptor, active);
      return update.status === "converged" ? { ok: true } : { ok: false, reason: update.reason };
    }
    const expected = descriptor.remoteMutation.reservedRemoteObjectId;
    const matches = active.filter((value2) => value2.path === descriptor.targetPath);
    return matches.length === 1 && matches[0]?.remoteObjectId === expected ? { ok: true } : { ok: false, reason: "REMOTE file physical effect lacks independent conflict-free path convergence" };
  }
  if (descriptor.kind === "remote-folder-create") {
    const matches = active.filter((value2) => value2.path === descriptor.targetPath);
    return matches.length === 1 && matches[0]?.remoteObjectId === descriptor.remoteMutation.reservedRemoteObjectId && matches[0]?.entityKind === "folder" ? { ok: true } : { ok: false, reason: "REMOTE folder physical effect lacks independent conflict-free path convergence" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const matches = active.filter((value2) => value2.path === descriptor.toPath);
    return matches.length === 1 && matches[0]?.remoteObjectId === descriptor.remoteObjectId ? { ok: true } : { ok: false, reason: "REMOTE move destination is not uniquely converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return active.some((value2) => value2.remoteObjectId === descriptor.remoteObjectId) ? { ok: false, reason: "REMOTE trash target remains present" } : { ok: true };
  }
  return { ok: true };
}
async function verifyLocal(legacy, descriptor) {
  const local = internal(legacy).local;
  if (descriptor.kind === "local-file") {
    const observed2 = await local.observe(descriptor.targetPath);
    return observed2.status === "present" && observed2.entityKind === "file" && observed2.content?.hash === descriptor.intendedContent.hash && observed2.content.sizeBytes === descriptor.intendedContent.sizeBytes ? { ok: true } : { ok: false, reason: "LOCAL file exact intended content is not observable" };
  }
  if (descriptor.kind === "local-folder-create") {
    const observed2 = await local.observe(descriptor.targetPath);
    const folderObservation2 = observed2.status === "present" && observed2.entityKind === "folder" && observed2.observationToken ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed2.observationToken } : observed2.status === "absent" ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey } : observed2.status === "present" ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed2.entityKind } : { status: "unobservable", reason: "LOCAL folder observation incomplete" };
    const result = verifyLocalFolderCreate(descriptor, folderObservation2);
    return result.status === "verified-effect" ? { ok: true } : { ok: false, reason: result.reason };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([local.observe(descriptor.fromPath), local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present" ? { ok: true } : { ok: false, reason: "LOCAL move is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await local.observe(descriptor.path)).status === "absent" ? { ok: true } : { ok: false, reason: "LOCAL trash target remains present" };
  }
  return { ok: true };
}
async function convergenceFor(legacy, descriptor) {
  return descriptor.targetSide === "remote" ? verifyRemote(legacy, descriptor) : verifyLocal(legacy, descriptor);
}
async function recoverEffect(lifecycle, operation, effect, legacy, deps) {
  if (effect.stage === "state-committed") return void 0;
  if (effect.stage === "intent-persisted") return { status: "recovery-required", reason: "restart found unattempted durable intent; retire/replan before dispatch" };
  if (effect.stage === "dispatch-authorized" || effect.stage === "outcome-unknown") {
    let physical;
    if (effect.descriptor.kind === "remote-folder-create") {
      if (!deps.remoteFolderCreateRecoveryReadPort) return { status: "recovery-required", reason: "RemoteFolderCreateRecoveryReadPort unavailable" };
      const observation = await deps.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(effect.descriptor);
      const verified = verifyRemoteFolderCreate(effect.descriptor, observation);
      physical = verified.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-folder-recovery", verified.proof) } : verified;
    } else if (effect.descriptor.kind === "local-file") {
      if (!deps.localTransactionalMutationPort) return { status: "recovery-required", reason: "LocalTransactionalMutationPort unavailable" };
      const loaded2 = await lifecycle.loadAuthority();
      if (loaded2.status !== "trusted") return { status: "recovery-required", reason: loaded2.reason };
      const localDescriptor = effect.descriptor;
      const tx = loaded2.state.localTransactions.find((value2) => value2.transactionId === localDescriptor.localTransactionId);
      if (!tx) return { status: "recovery-required", reason: "LOCAL recovery transaction missing" };
      const recovered = await deps.localTransactionalMutationPort.recover(tx);
      const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
      if (persisted.status !== "persisted") return { status: "recovery-required", reason: "LOCAL recovery transaction progress was not durable" };
      const converged2 = await verifyLocal(legacy, localDescriptor);
      physical = recovered.status === "recovered" && converged2.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-file-recovery", String(tx.transactionId)) } : { status: "outcome-unknown", reason: recovered.status === "recovered" ? converged2.ok ? "LOCAL recovery convergence unavailable" : converged2.reason : resultReason(recovered, "LOCAL recovery unresolved") };
    } else {
      const converged2 = await convergenceFor(legacy, effect.descriptor);
      physical = converged2.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("restart-observation", effect.effectId) } : { status: "outcome-unknown", reason: converged2.reason };
    }
    const recorded = await lifecycle.recordPhysicalResult(String(operation.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && recorded.status !== "already-progressed") {
      return recorded.status === "conflict-preserved" ? { status: "blocking-failure", reason: recorded.reason } : { status: "uncertain", reason: resultReason(recorded, "physical recovery unresolved") };
    }
  }
  const loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return { status: "recovery-required", reason: loaded.reason };
  const current = loaded.state.operationIntents.find((value2) => value2.operationId === operation.operationId)?.effects.find((value2) => value2.effectId === effect.effectId);
  if (!current || current.stage !== "effect-verified" && current.stage !== "state-committed") return { status: "uncertain", reason: "recovered effect lacks durable verification" };
  if (current.stage === "state-committed") return void 0;
  const converged = await convergenceFor(legacy, current.descriptor);
  if (!converged.ok) return { status: "blocking-failure", reason: converged.reason };
  if (!current.verificationEvidenceRef) return { status: "recovery-required", reason: "verified effect lacks evidence reference" };
  return void 0;
}
async function dispatchEffect(lifecycle, operation, prepared, legacy, deps) {
  const authorized = await lifecycle.authorizePersistedEffect(String(operation.operationId), prepared.effect.effectId);
  if (authorized.status !== "dispatch-authorized") return { status: "recovery-required", reason: `dispatch authority not durably persisted (${authorized.status})` };
  const descriptor = prepared.effect.descriptor;
  let physical;
  if (descriptor.kind === "remote-file") {
    if (!deps.reliableRemoteMutationPort || !prepared.content) return { status: "recovery-required", reason: "REMOTE durable descriptor lacks frozen mutation port/content" };
    const outcome = descriptor.mutationKind === "create" ? await deps.reliableRemoteMutationPort.createReserved(descriptor.remoteMutation, prepared.content) : await deps.reliableRemoteMutationPort.updateExisting(descriptor.remoteMutation, prepared.content);
    physical = mapRemoteOutcome(outcome);
  } else if (descriptor.kind === "remote-folder-create") {
    if (!deps.reliableRemoteMutationPort || !deps.remoteFolderCreateRecoveryReadPort) return { status: "recovery-required", reason: "REMOTE folder frozen mutation/recovery port unavailable" };
    const outcome = await deps.reliableRemoteMutationPort.createReserved(descriptor.remoteMutation);
    if (outcome.status !== "verified-effect") {
      physical = mapRemoteOutcome(outcome);
    } else {
      const observed2 = await deps.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(descriptor);
      const verified = verifyRemoteFolderCreate(descriptor, observed2);
      physical = verified.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-folder", verified.proof) } : verified;
    }
  } else if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    if (!deps.reliableRemoteMutationPort || !descriptor.remoteObjectId) return { status: "recovery-required", reason: "REMOTE move frozen port/identity unavailable" };
    physical = mapRemoteOutcome(await deps.reliableRemoteMutationPort.moveExisting({
      kind: "identity-preserving-move",
      intentId: intentIdFor(operation),
      remoteObjectId: descriptor.remoteObjectId,
      fromPath: descriptor.fromPath,
      toPath: descriptor.toPath,
      identityAuthority: descriptor.identityAuthority
    }));
  } else if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    if (!deps.reliableRemoteMutationPort || !descriptor.remoteObjectId || !descriptor.identityAuthority) return { status: "recovery-required", reason: "REMOTE trash frozen port/identity unavailable" };
    physical = mapRemoteOutcome(await deps.reliableRemoteMutationPort.trashExisting({
      kind: "trash",
      intentId: intentIdFor(operation),
      remoteObjectId: descriptor.remoteObjectId,
      path: descriptor.path,
      baseAuthority: descriptor.baseAuthority,
      identityAuthority: descriptor.identityAuthority
    }));
  } else if (descriptor.kind === "local-file") {
    if (!deps.localTransactionalMutationPort || !prepared.content || !prepared.localTransaction) return { status: "recovery-required", reason: "LOCAL file frozen transaction port/intent unavailable" };
    const staged = await deps.localTransactionalMutationPort.stageAndVerify(prepared.localTransaction, prepared.content);
    let saved = await lifecycle.persistLocalTransaction(staged.transaction);
    if (saved.status !== "persisted") return { status: "recovery-required", reason: "LOCAL staged progress not durable" };
    if (staged.status !== "staged-verified") {
      physical = { status: "outcome-unknown", reason: resultReason(staged, "LOCAL stage unresolved") };
    } else {
      const committed = await deps.localTransactionalMutationPort.commitVerifiedStage(staged.transaction);
      saved = await lifecycle.persistLocalTransaction(committed.transaction);
      if (saved.status !== "persisted") return { status: "recovery-required", reason: "LOCAL commit progress not durable" };
      const converged2 = await verifyLocal(legacy, descriptor);
      physical = committed.status === "committed" && converged2.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-file", String(committed.transaction.transactionId)) } : { status: "outcome-unknown", reason: committed.status === "committed" ? converged2.ok ? "LOCAL convergence unavailable" : converged2.reason : resultReason(committed, "LOCAL transaction unresolved") };
    }
  } else if (descriptor.kind === "local-folder-create") {
    await internal(legacy).local.createFolder(descriptor.targetPath);
    const converged2 = await verifyLocal(legacy, descriptor);
    physical = converged2.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-folder", String(descriptor.targetPath)) } : { status: "outcome-unknown", reason: converged2.reason };
  } else if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    await internal(legacy).local.move(descriptor.fromPath, descriptor.toPath);
    const converged2 = await verifyLocal(legacy, descriptor);
    physical = converged2.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-move", [String(descriptor.fromPath), String(descriptor.toPath)]) } : { status: "outcome-unknown", reason: converged2.reason };
  } else if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    await internal(legacy).local.trash(descriptor.path);
    const converged2 = await verifyLocal(legacy, descriptor);
    physical = converged2.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-trash", String(descriptor.path)) } : { status: "outcome-unknown", reason: converged2.reason };
  } else {
    return { status: "recovery-required", reason: "unsupported durable descriptor" };
  }
  const recorded = await lifecycle.recordPhysicalResult(String(operation.operationId), prepared.effect.effectId, physical);
  if (recorded.status !== "effect-verified") {
    return recorded.status === "conflict-preserved" ? { status: "blocking-failure", reason: recorded.reason } : { status: "uncertain", reason: resultReason(recorded, `physical effect remained ${recorded.status}`) };
  }
  const converged = await convergenceFor(legacy, descriptor);
  if (!converged.ok) return { status: "blocking-failure", reason: converged.reason };
  const current = recorded.authority.operationIntents.find((value2) => value2.operationId === operation.operationId)?.effects.find((value2) => value2.effectId === prepared.effect.effectId);
  if (!current?.verificationEvidenceRef) return { status: "recovery-required", reason: "durable verification evidence missing" };
  return void 0;
}
function createAuthoritativeProductExecutor(legacy, authorityStore, identityStateStore, stateContext, managedRemote, explicitDependencies) {
  const dependencies = explicitDependencies ?? internal(legacy).recoverableProductionMutationDependencies ?? {};
  async function validateExact(operation) {
    const [authorityLoad, identityLoad] = await Promise.all([authorityStore.loadAuthority(), identityStateStore.load(stateContext)]);
    if (authorityLoad.status !== "trusted") return { status: "recovery-required", reason: "current authoritative synchronization metadata unavailable" };
    if (identityLoad.status !== "trusted") return { status: "recovery-required", reason: "current trusted remote identity mappings unavailable" };
    const failed = [];
    for (const precondition of operation.preconditions) {
      if (precondition.kind === "base-authority") {
        const current = authorityLoad.state.pathConvergence.find((value2) => value2.path === precondition.authority.path)?.state;
        if (!current || current.status !== "converged" || authorityLoad.state.semanticGeneration !== current.generation || !exactBaseAuthorityMatches(precondition.authority, { generation: current.generation, path: precondition.authority.path, fingerprint: current.baseFingerprint })) failed.push(precondition);
      } else if (precondition.kind === "identity-authority") {
        const proof = precondition.proof;
        const currentPath = authorityLoad.state.pathConvergence.find((value2) => value2.path === proof.path)?.state;
        const byPath = identityLoad.state.remoteMappings.filter((value2) => value2.path === proof.path);
        const byId = identityLoad.state.remoteMappings.filter((value2) => value2.remoteObjectId === proof.remoteObjectId);
        const mapping = byPath.length === 1 && byId.length === 1 && byPath[0] === byId[0] ? byPath[0] : void 0;
        if (!mapping || !currentPath || currentPath.status !== "converged" || currentPath.generation !== authorityLoad.state.semanticGeneration || proof.generation !== authorityLoad.state.semanticGeneration) {
          failed.push(precondition);
        } else {
          const observedPath = operation.kind === "identity-preserving-move" && operation.targetSide === "local" && operation.toPath ? operation.toPath : mapping.path;
          if (!await legacy.versionStillCurrent("remote", { path: observedPath, entityKind: mapping.entityKind, remoteObjectId: mapping.remoteObjectId }, managedRemote)) failed.push(precondition);
        }
      }
    }
    if (failed.length) return { status: "stale", failed };
    const ordinary = await legacy.validatePreconditions(operation);
    if (ordinary.status === "valid") return { status: "valid" };
    if (ordinary.status === "stale") {
      return { status: "stale", failed: ordinary.failed.filter((value2) => value2.kind !== "base-trusted" && value2.kind !== "identity-unambiguous") };
    }
    return ordinary;
  }
  return {
    validatePreconditions: validateExact,
    async execute(operation) {
      const validation = await validateExact(operation);
      if (validation.status === "stale") return { status: "stale-precondition", reason: "exact authority changed at production mutation boundary", failed: validation.failed };
      if (validation.status === "blocked") return { status: "blocking-failure", reason: validation.reason };
      if (validation.status === "recovery-required") return { status: "recovery-required", reason: validation.reason };
      if (!physicalOperation2(operation)) return legacy.execute(operation);
      const needsRemote = operation.targetSide === "remote" || operation.kind.startsWith("upload-") || operation.kind === "trash-remote" || operation.kind === "clean-text-merge";
      const needsLocalFile = (operation.kind === "download-create" || operation.kind === "download-update") && operation.contentVersion?.entityKind !== "folder" || operation.kind === "clean-text-merge";
      if (needsRemote && !dependencies.reliableRemoteMutationPort) return { status: "recovery-required", reason: "ReliableRemoteMutationPort unavailable; physical mutation disabled" };
      if (needsLocalFile && !dependencies.localTransactionalMutationPort) return { status: "recovery-required", reason: "LocalTransactionalMutationPort unavailable; physical mutation disabled" };
      if (operation.kind === "upload-create" && operation.contentVersion?.entityKind === "folder" && !dependencies.remoteFolderCreateRecoveryReadPort) return { status: "recovery-required", reason: "RemoteFolderCreateRecoveryReadPort unavailable; REMOTE folder mutation disabled" };
      const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
      const loaded = await lifecycle.loadAuthority();
      if (loaded.status !== "trusted") return { status: "recovery-required", reason: loaded.reason };
      const existing = loaded.state.operationIntents.find((value2) => value2.operationId === operation.operationId);
      if (existing) {
        if (existing.semanticAuthority.generation !== loaded.state.semanticGeneration) return { status: "recovery-required", reason: "persisted intent belongs to stale semantic authority" };
        for (const effect of existing.effects) {
          const result = await recoverEffect(lifecycle, operation, effect, legacy, dependencies);
          if (result) return result;
        }
        const final2 = await lifecycle.loadAuthority();
        if (final2.status !== "trusted") return { status: "recovery-required", reason: final2.reason };
        const recovered = final2.state.operationIntents.find((value2) => value2.operationId === operation.operationId);
        if (!recovered?.effects.every((value2) => (value2.stage === "effect-verified" || value2.stage === "state-committed") && Boolean(value2.verificationEvidenceRef))) {
          return { status: "recovery-required", reason: "restart did not recover every required effect to durable verification" };
        }
        return success(operation, recovered.effects);
      }
      const prepared = await prepareIntent(operation, loaded.state, legacy, dependencies, identityStateStore, stateContext, managedRemote);
      if (prepared.status === "blocked") return { status: "recovery-required", reason: prepared.reason };
      const persisted = await lifecycle.persistIntent(prepared.intent, prepared.prepared.flatMap((value2) => value2.localTransaction ? [value2.localTransaction] : []));
      if (persisted.status !== "persisted") return { status: "recovery-required", reason: `physical intent not durably persisted (${persisted.status})` };
      for (const effect of prepared.prepared) {
        const result = await dispatchEffect(lifecycle, operation, effect, legacy, dependencies);
        if (result) return result;
      }
      const final = await lifecycle.loadAuthority();
      if (final.status !== "trusted") return { status: "recovery-required", reason: final.reason };
      const verified = final.state.operationIntents.find((value2) => value2.operationId === operation.operationId);
      if (!verified?.effects.every((value2) => value2.stage === "effect-verified" && Boolean(value2.verificationEvidenceRef))) {
        return { status: "recovery-required", reason: "logical operation incomplete: required effect not effect-verified" };
      }
      return success(operation, verified.effects);
    }
  };
}

// src/product/durable-intent-recovery-base.ts
var legacyReads = (legacy) => legacy;
var physicalStages = /* @__PURE__ */ new Set(["dispatch-authorized", "outcome-unknown", "effect-verified", "state-committed"]);
function evidenceRef2(prefix, value2) {
  return `${prefix}:${String(sha256Text(JSON.stringify(value2)))}`;
}
function asEvidence(value2) {
  return { hash: value2.hash, sizeBytes: value2.sizeBytes };
}
function sameContent(a, b) {
  return Boolean(a && b && a.algorithm === b.algorithm && a.hash === b.hash && a.sizeBytes === b.sizeBytes);
}
function uniqueRemote(entries, path2, kind) {
  const matches = entries.filter((entry2) => !entry2.trashed && entry2.path === path2 && (!kind || entry2.entityKind === kind));
  return matches.length === 1 ? matches[0] : void 0;
}
function currentMappedRemoteId(state, path2) {
  const matches = state.remoteMappings.filter((mapping) => mapping.path === path2);
  return matches.length === 1 ? matches[0]?.remoteObjectId : void 0;
}
function entityKind(state, path2, remoteId) {
  return state.base.find((entry2) => entry2.path === path2)?.entityKind ?? state.tombstones.find((entry2) => entry2.path === path2)?.entityKind ?? state.remoteMappings.find((mapping) => mapping.path === path2 || remoteId !== void 0 && mapping.remoteObjectId === remoteId)?.entityKind ?? "file";
}
function intendedContent(intent) {
  const values = intent.effects.flatMap((effect) => {
    const descriptor = effect.descriptor;
    return descriptor.kind === "remote-file" || descriptor.kind === "local-file" ? [descriptor.intendedContent] : [];
  });
  if (!values.length) return void 0;
  return values.every((value2) => sameContent(values[0], value2)) ? values[0] : null;
}
function validateDescriptor(intent, effect, authority) {
  const descriptor = effect.descriptor;
  if (!effect.effectId || !physicalStages.has(effect.stage) && effect.stage !== "intent-persisted") return "durable effect stage or identity is malformed";
  if (intent.semanticAuthority.generation !== authority.semanticGeneration) return "persisted intent belongs to stale semantic authority";
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    if (descriptor.targetPath !== mutation.path || !sameContent(descriptor.intendedContent, mutation.intendedContent) || mutation.intentId !== intent.intentId) {
      return "REMOTE file descriptor contradicts persisted mutation identity/content";
    }
    if (mutation.kind === "reserved-file-create") return descriptor.mutationKind === "create" ? void 0 : "REMOTE file create descriptor has incompatible mutation kind";
    if (descriptor.mutationKind !== "update" || mutation.updateProtocol !== "immutable-candidate-preservation") return "REMOTE update descriptor lacks immutable-candidate authority";
    if (mutation.identityAuthority.generation !== intent.semanticAuthority.generation || mutation.identityAuthority.path !== descriptor.targetPath || mutation.identityAuthority.remoteObjectId !== mutation.remoteObjectId) {
      return "REMOTE update descriptor identity authority is contradictory";
    }
    return void 0;
  }
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") {
    if (!folderCreateDescriptorIsSelfConsistent(descriptor)) return "folder-create durable descriptor is internally inconsistent";
    return descriptor.intentId === intent.intentId && descriptor.pathAuthority.generation === intent.semanticAuthority.generation ? void 0 : "folder-create descriptor semantic authority is inconsistent";
  }
  if (descriptor.kind === "local-file") {
    const matches = authority.localTransactions.filter((tx2) => tx2.transactionId === descriptor.localTransactionId && tx2.operationId === intent.operationId);
    const tx = matches[0];
    return matches.length === 1 && tx?.path === descriptor.targetPath && tx.mutationKind === descriptor.mutationKind && sameContent(tx.expectedNewEvidence, descriptor.intendedContent) ? void 0 : "LOCAL file descriptor lacks one exact matching durable transaction authority";
  }
  if (descriptor.kind === "move") {
    return descriptor.identityAuthority.generation === intent.semanticAuthority.generation && descriptor.identityAuthority.path === descriptor.fromPath && (!descriptor.remoteObjectId || descriptor.remoteObjectId === descriptor.identityAuthority.remoteObjectId) ? void 0 : "move descriptor identity authority is contradictory";
  }
  if (descriptor.baseAuthority.generation !== intent.semanticAuthority.generation || descriptor.baseAuthority.path !== descriptor.path) return "trash descriptor BASE authority is contradictory";
  if (descriptor.targetSide === "remote") {
    if (!descriptor.remoteObjectId || !descriptor.identityAuthority || descriptor.identityAuthority.generation !== intent.semanticAuthority.generation || descriptor.identityAuthority.path !== descriptor.path || descriptor.identityAuthority.remoteObjectId !== descriptor.remoteObjectId) {
      return "REMOTE trash descriptor identity authority is contradictory";
    }
  }
  return void 0;
}
function validateIntent(intent, authority) {
  if (!intent.effects.length) return "durable operation intent contains no physical effects";
  if (intent.logicalKind === "single-effect" && intent.effects.length !== 1) return "single-effect durable intent contains multiple effects";
  if (intent.logicalKind === "clean-text-merge" && intent.effects.length < 2) return "clean merge durable intent is missing required effects";
  const ids = /* @__PURE__ */ new Set();
  for (const effect of intent.effects) {
    if (ids.has(effect.effectId)) return "durable operation intent contains duplicate effect identity";
    ids.add(effect.effectId);
    const invalid = validateDescriptor(intent, effect, authority);
    if (invalid) return invalid;
  }
  if (intent.effects.some((effect) => effect.stage === "intent-persisted") && intent.effects.some((effect) => effect.stage !== "intent-persisted")) return "durable operation intent mixes unattempted and physically progressed effects";
  if (intendedContent(intent) === null) return "durable operation intent contains contradictory persisted content authority";
  return void 0;
}
function aggregateVerificationRef2(intent) {
  if (!intent.effects.every((effect) => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) return void 0;
  const effects = [...intent.effects].sort((a, b) => a.effectId.localeCompare(b.effectId));
  return evidenceRef2("durable-recovery", {
    operationId: String(intent.operationId),
    semanticGeneration: String(intent.semanticAuthority.generation),
    effects: effects.map((effect) => ({ effectId: effect.effectId, descriptor: effect.descriptor, verificationEvidenceRef: effect.verificationEvidenceRef }))
  });
}
function remoteIdentity(intent, canonical2, entries) {
  const remote = intent.effects.map((effect) => effect.descriptor).find((descriptor2) => descriptor2.targetSide === "remote");
  if (remote?.kind === "remote-file") {
    const mutation = remote.remoteMutation;
    return mutation.kind === "reserved-file-create" ? { resulting: mutation.reservedRemoteObjectId } : { resulting: mutation.candidateRemoteObjectId, predecessor: mutation.remoteObjectId };
  }
  if (remote?.kind === "remote-folder-create") return { resulting: remote.remoteMutation.reservedRemoteObjectId };
  if (remote?.kind === "move") return { resulting: remote.remoteObjectId ?? remote.identityAuthority.remoteObjectId };
  if (remote?.kind === "trash") return { resulting: remote.remoteObjectId };
  const descriptor = intent.effects[0]?.descriptor;
  if (!descriptor) return void 0;
  const path2 = descriptor.kind === "local-file" || descriptor.kind === "local-folder-create" ? descriptor.targetPath : descriptor.kind === "move" ? descriptor.toPath : descriptor.kind === "trash" ? descriptor.path : void 0;
  if (!path2) return {};
  const observed2 = uniqueRemote(entries, path2, descriptor.kind === "local-folder-create" ? "folder" : void 0);
  const mapped = currentMappedRemoteId(canonical2, path2);
  if (observed2 && mapped && observed2.remoteObjectId !== mapped) return void 0;
  return { resulting: observed2?.remoteObjectId ?? mapped };
}
function reconstructDurableRecovery(intent, canonical2, entries) {
  const aggregate = aggregateVerificationRef2(intent);
  const content = intendedContent(intent);
  const identity = remoteIdentity(intent, canonical2, entries);
  if (!aggregate || content === null || !identity) return void 0;
  const first = intent.effects[0]?.descriptor;
  if (!first) return void 0;
  let operation;
  if (intent.logicalKind === "clean-text-merge") {
    const localEffects = intent.effects.filter((effect) => effect.descriptor.kind === "local-file");
    const remoteEffects = intent.effects.filter((effect) => effect.descriptor.kind === "remote-file");
    const local = localEffects[0]?.descriptor;
    const remote = remoteEffects[0]?.descriptor;
    if (!content || localEffects.length !== 1 || remoteEffects.length !== 1 || local?.kind !== "local-file" || remote?.kind !== "remote-file" || remote.remoteMutation.kind !== "existing-file-content-update" || local.targetPath !== remote.targetPath) return void 0;
    operation = {
      operationId: intent.operationId,
      kind: "clean-text-merge",
      path: remote.targetPath,
      targetSide: "remote",
      remoteObjectId: remote.remoteMutation.remoteObjectId,
      contentVersion: { path: remote.targetPath, entityKind: "file", content: asEvidence(content) },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized clean merge from durable descriptors." }]
    };
  } else if (first.kind === "remote-file") {
    if (!content) return void 0;
    const mutation = first.remoteMutation;
    if (mutation.kind === "reserved-file-create") {
      operation = {
        operationId: intent.operationId,
        kind: "upload-create",
        path: first.targetPath,
        targetSide: "remote",
        contentVersion: { path: first.targetPath, entityKind: "file", content: asEvidence(content) },
        destructive: false,
        preconditions: [],
        reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE file create." }]
      };
    } else {
      operation = {
        operationId: intent.operationId,
        kind: "upload-update",
        path: first.targetPath,
        targetSide: "remote",
        remoteObjectId: mutation.remoteObjectId,
        contentVersion: { path: first.targetPath, entityKind: "file", content: asEvidence(content) },
        destructive: false,
        preconditions: [],
        reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE file update." }]
      };
    }
  } else if (first.kind === "remote-folder-create") {
    operation = {
      operationId: intent.operationId,
      kind: "upload-create",
      path: first.targetPath,
      targetSide: "remote",
      contentVersion: { path: first.targetPath, entityKind: "folder" },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized REMOTE folder create." }]
    };
  } else if (first.kind === "local-file") {
    if (!content || !identity.resulting) return void 0;
    operation = {
      operationId: intent.operationId,
      kind: first.mutationKind === "create" ? "download-create" : "download-update",
      path: first.targetPath,
      targetSide: "local",
      remoteObjectId: identity.resulting,
      contentVersion: { path: first.targetPath, entityKind: "file", remoteObjectId: identity.resulting, content: asEvidence(content) },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized LOCAL file mutation." }]
    };
  } else if (first.kind === "local-folder-create") {
    if (!identity.resulting) return void 0;
    operation = {
      operationId: intent.operationId,
      kind: "download-create",
      path: first.targetPath,
      targetSide: "local",
      remoteObjectId: identity.resulting,
      contentVersion: { path: first.targetPath, entityKind: "folder", remoteObjectId: identity.resulting },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized LOCAL folder create." }]
    };
  } else if (first.kind === "move") {
    const remoteObjectId = first.remoteObjectId ?? first.identityAuthority.remoteObjectId;
    const kind = entityKind(canonical2, first.fromPath, remoteObjectId);
    const base = canonical2.base.find((entry2) => entry2.path === first.fromPath || entry2.path === first.toPath);
    operation = {
      operationId: intent.operationId,
      kind: "identity-preserving-move",
      path: first.fromPath,
      targetSide: first.targetSide,
      fromPath: first.fromPath,
      toPath: first.toPath,
      remoteObjectId,
      contentVersion: { path: first.toPath, entityKind: kind, remoteObjectId, ...base?.content ? { content: base.content } : {} },
      destructive: false,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized identity-preserving move." }]
    };
  } else {
    const rid2 = first.remoteObjectId ?? (first.targetSide === "local" ? currentMappedRemoteId(canonical2, first.path) : void 0);
    operation = {
      operationId: intent.operationId,
      kind: first.targetSide === "remote" ? "trash-remote" : "trash-local",
      path: first.path,
      targetSide: first.targetSide,
      ...rid2 ? { remoteObjectId: rid2 } : {},
      destructive: true,
      preconditions: [],
      reasons: [{ code: "durable-intent-recovery", summary: "Recovered exact previously authorized trash operation." }]
    };
  }
  return {
    operation,
    receipt: {
      operationId: intent.operationId,
      durable: true,
      integrityVerified: true,
      ...content ? { evidence: asEvidence(content) } : {},
      ...identity.resulting ? { resultingRemoteObjectId: identity.resulting } : {},
      verificationEvidenceRef: aggregate
    }
  };
}
function exactContent(actual, expected) {
  return !expected || Boolean(actual && (!expected.hash || actual.hash === expected.hash) && (expected.sizeBytes === void 0 || actual.sizeBytes === expected.sizeBytes));
}
function exactCanonicalCommit(state, operation, receipt) {
  if (!receipt.verificationEvidenceRef) return false;
  const journal = state.operations.find((entry2) => entry2.operationId === operation.operationId);
  if (!journal || journal.status !== "completed" || journal.path !== operation.path || journal.verificationEvidenceRef !== receipt.verificationEvidenceRef) return false;
  const rid2 = receipt.resultingRemoteObjectId ?? operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
  if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
    const base = state.base.filter((entry2) => entry2.path === operation.path);
    if (base.length !== 1 || base[0]?.entityKind !== operation.contentVersion?.entityKind || !exactContent(base[0]?.content, receipt.evidence)) return false;
    if (!rid2 || base[0]?.remoteObjectId !== rid2) return false;
    const byPath = state.remoteMappings.filter((mapping) => mapping.path === operation.path);
    const byId = state.remoteMappings.filter((mapping) => mapping.remoteObjectId === rid2);
    return byPath.length === 1 && byId.length === 1 && byPath[0]?.remoteObjectId === rid2 && byId[0]?.path === operation.path;
  }
  if (operation.kind === "identity-preserving-move" && operation.fromPath && operation.toPath) {
    if (!rid2 || state.base.some((entry2) => entry2.path === operation.fromPath) || state.remoteMappings.some((mapping) => mapping.path === operation.fromPath)) return false;
    return state.base.filter((entry2) => entry2.path === operation.toPath && entry2.remoteObjectId === rid2).length === 1 && state.remoteMappings.filter((mapping) => mapping.path === operation.toPath && mapping.remoteObjectId === rid2).length === 1;
  }
  if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (state.base.some((entry2) => entry2.path === operation.path) || state.remoteMappings.some((mapping) => mapping.path === operation.path)) return false;
    const deletedOn = operation.kind === "trash-remote" ? "local" : "remote";
    return state.tombstones.filter((entry2) => entry2.path === operation.path && entry2.deletedOn === deletedOn && (!rid2 || entry2.remoteObjectId === rid2)).length === 1;
  }
  return false;
}
async function remoteEntries(legacy, remote) {
  const listed = await legacyReads(legacy).drive.listForReconciliation(remote.rootId);
  return listed.ok && listed.value.completeness.status === "complete" ? listed.value.entries.filter((entry2) => !entry2.trashed) : void 0;
}
async function observePersistedEffect(legacy, descriptor, remote, deps) {
  if (descriptor.kind === "remote-folder-create") {
    if (!deps.remoteFolderCreateRecoveryReadPort) return { status: "outcome-unknown", reason: "RemoteFolderCreateRecoveryReadPort unavailable during durable recovery" };
    const result = verifyRemoteFolderCreate(descriptor, await deps.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(descriptor));
    return result.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-remote-folder", result.proof) } : result;
  }
  if (descriptor.kind === "local-folder-create") {
    const observed2 = await legacyReads(legacy).local.observe(descriptor.targetPath);
    const view = observed2.status === "present" && observed2.entityKind === "folder" && observed2.observationToken ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed2.observationToken } : observed2.status === "absent" ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey } : observed2.status === "present" ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed2.entityKind } : { status: "unobservable", reason: "LOCAL folder observation incomplete during durable recovery" };
    const result = verifyLocalFolderCreate(descriptor, view);
    return result.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-local-folder", result.proof) } : result;
  }
  if (descriptor.kind === "local-file") {
    const observed2 = await legacyReads(legacy).local.observe(descriptor.targetPath);
    return observed2.status === "present" && observed2.entityKind === "file" && observed2.content?.hash === descriptor.intendedContent.hash && observed2.content.sizeBytes === descriptor.intendedContent.sizeBytes ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-local-file", descriptor) } : { status: "outcome-unknown", reason: "LOCAL file does not prove persisted intended content" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([legacyReads(legacy).local.observe(descriptor.fromPath), legacyReads(legacy).local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-local-move", descriptor) } : { status: "outcome-unknown", reason: "LOCAL move physical reality is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await legacyReads(legacy).local.observe(descriptor.path)).status === "absent" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-local-trash", descriptor) } : { status: "outcome-unknown", reason: "LOCAL trash target remains present" };
  }
  const entries = await remoteEntries(legacy, remote);
  if (!entries) return { status: "outcome-unknown", reason: "complete REMOTE listing unavailable during durable recovery" };
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    const rid2 = mutation.kind === "reserved-file-create" ? mutation.reservedRemoteObjectId : mutation.candidateRemoteObjectId;
    const match = uniqueRemote(entries, descriptor.targetPath, "file");
    return match?.remoteObjectId === rid2 && match.content?.hash === descriptor.intendedContent.hash && match.content.sizeBytes === descriptor.intendedContent.sizeBytes ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-remote-file", { descriptor, observed: match }) } : { status: "outcome-unknown", reason: "REMOTE file does not prove persisted identity/content without ambiguity" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const rid2 = descriptor.remoteObjectId ?? descriptor.identityAuthority.remoteObjectId;
    const target = uniqueRemote(entries, descriptor.toPath);
    return target?.remoteObjectId === rid2 && !entries.some((entry2) => entry2.path === descriptor.fromPath && entry2.remoteObjectId === rid2) ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-remote-move", descriptor) } : { status: "outcome-unknown", reason: "REMOTE move is not uniquely converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return !entries.some((entry2) => entry2.remoteObjectId === descriptor.remoteObjectId) && !entries.some((entry2) => entry2.path === descriptor.path) ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-remote-trash", descriptor) } : { status: "outcome-unknown", reason: "REMOTE trash is not proven by exact ID/path absence" };
  }
  return { status: "outcome-unknown", reason: "unsupported durable recovery descriptor" };
}
async function recoverLocalFile(lifecycle, intent, effect, authority, legacy, deps) {
  const descriptor = effect.descriptor;
  if (descriptor.kind !== "local-file") return { status: "outcome-unknown", reason: "LOCAL file recovery invoked for non-file descriptor" };
  if (!deps.localTransactionalMutationPort) return { status: "outcome-unknown", reason: "LocalTransactionalMutationPort unavailable during durable recovery" };
  const tx = authority.localTransactions.find((value2) => value2.transactionId === descriptor.localTransactionId && value2.operationId === intent.operationId);
  if (!tx) return { status: "outcome-unknown", reason: "LOCAL durable transaction missing during recovery" };
  const recovered = await deps.localTransactionalMutationPort.recover(tx);
  const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
  if (persisted.status !== "persisted") return { status: "outcome-unknown", reason: "LOCAL transaction recovery progress could not be persisted" };
  if (recovered.status !== "recovered" && recovered.status !== "committed") return { status: "outcome-unknown", reason: "LOCAL transaction recovery did not establish completion" };
  const observed2 = await legacyReads(legacy).local.observe(descriptor.targetPath);
  return observed2.status === "present" && observed2.entityKind === "file" && observed2.content?.hash === descriptor.intendedContent.hash && observed2.content.sizeBytes === descriptor.intendedContent.sizeBytes ? { status: "verified-effect", verificationEvidenceRef: evidenceRef2("durable-recovery-local-file", { transactionId: String(tx.transactionId), descriptor }) } : { status: "outcome-unknown", reason: "LOCAL recovered transaction does not prove persisted intended content" };
}
async function finalizeIntent(lifecycle, intent) {
  for (const effect of intent.effects) {
    if (effect.stage === "state-committed") continue;
    if (effect.stage !== "effect-verified" || !effect.verificationEvidenceRef) return `durable effect ${effect.effectId} cannot finalize from ${effect.stage}`;
    const result = await lifecycle.markEffectStateCommitted(String(intent.operationId), effect.effectId, effect.verificationEvidenceRef);
    if (result.status !== "state-committed") return `durable effect ${effect.effectId} finalization failed (${result.status})`;
  }
  return void 0;
}
async function recoverOne(snapshot, legacy, authorityStore, stateStore, stateContext, remote, deps) {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  let authority = await lifecycle.loadAuthority();
  if (authority.status !== "trusted") return authority;
  const intent = authority.state.operationIntents.find((value2) => value2.operationId === snapshot.operationId);
  if (!intent) return { status: "recovered", changed: false, retired: false };
  const invalid = validateIntent(intent, authority.state);
  if (invalid) return { status: "recovery-required", reason: invalid };
  if (intent.effects.every((effect) => effect.stage === "state-committed")) return { status: "recovered", changed: false, retired: false };
  if (intent.effects.every((effect) => effect.stage === "intent-persisted")) {
    const retired = await lifecycle.retireUnattemptedIntent(String(intent.operationId));
    return retired.status === "persisted" ? { status: "recovered", changed: true, retired: true } : { status: "recovery-required", reason: `unattempted intent could not be retired (${retired.status})` };
  }
  for (const effect of intent.effects) {
    if (effect.stage === "state-committed" || effect.stage === "effect-verified") continue;
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") return { status: "recovery-required", reason: `unsupported outstanding durable stage ${effect.stage}` };
    const physical = effect.descriptor.kind === "local-file" ? await recoverLocalFile(lifecycle, intent, effect, authority.state, legacy, deps) : await observePersistedEffect(legacy, effect.descriptor, remote, deps);
    const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && recorded.status !== "already-progressed") {
      return { status: "recovery-required", reason: `durable effect ${effect.effectId} remains unresolved (${recorded.status}${"reason" in recorded ? `: ${recorded.reason}` : ""})` };
    }
  }
  authority = await lifecycle.loadAuthority();
  if (authority.status !== "trusted") return authority;
  const verified = authority.state.operationIntents.find((value2) => value2.operationId === intent.operationId);
  if (!verified) return { status: "recovery-required", reason: "durable intent disappeared during recovery" };
  const invalidVerified = validateIntent(verified, authority.state);
  if (invalidVerified) return { status: "recovery-required", reason: invalidVerified };
  if (!verified.effects.every((effect) => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) return { status: "recovery-required", reason: "not every durable physical effect reached verified authority" };
  const canonical2 = await stateStore.load(stateContext);
  if (canonical2.status !== "trusted") return { status: "recovery-required", reason: "trusted canonical state unavailable during durable recovery" };
  const entries = await remoteEntries(legacy, remote);
  if (!entries) return { status: "recovery-required", reason: "complete REMOTE observation unavailable for durable receipt reconstruction" };
  const reconstructed = reconstructDurableRecovery(verified, canonical2.state, entries);
  if (!reconstructed) return { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" };
  const priorCommit = exactCanonicalCommit(canonical2.state, reconstructed.operation, reconstructed.receipt);
  if (verified.effects.some((effect) => effect.stage === "state-committed") && !priorCommit) return { status: "recovery-required", reason: "state-committed durable marker lacks exact canonical commit proof" };
  if (!priorCommit) {
    const commit = await new StateCommitCoordinator(stateStore, stateContext).commitVerifiedSuccess(reconstructed.operation, reconstructed.receipt, canonical2.state.stateRevision);
    if (commit.status === "stale-state") return { status: "recovery-required", reason: "canonical state changed during recovery; verified physical evidence remains durable" };
    if (commit.status !== "committed") return { status: "recovery-required", reason: commit.reason };
  }
  const latest = await lifecycle.loadAuthority();
  if (latest.status !== "trusted") return latest;
  const latestIntent = latest.state.operationIntents.find((value2) => value2.operationId === verified.operationId);
  if (!latestIntent) return { status: "recovery-required", reason: "durable intent missing before finalization" };
  const failed = await finalizeIntent(lifecycle, latestIntent);
  return failed ? { status: "recovery-required", reason: failed } : { status: "recovered", changed: true, retired: false };
}
async function recoverOutstandingDurableIntents(legacy, authorityStore, stateStore, stateContext, remote, deps = {}) {
  const loaded = await new DurableEffectLifecycleCoordinator(authorityStore).loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  let changed = false;
  let recoveredCount = 0;
  let retiredCount = 0;
  for (const snapshot of loaded.state.operationIntents) {
    const result = await recoverOne(snapshot, legacy, authorityStore, stateStore, stateContext, remote, deps);
    if (result.status !== "recovered") return result;
    changed ||= result.changed;
    if (result.retired) retiredCount += 1;
    else if (result.changed) recoveredCount += 1;
  }
  return { status: "recovered", changed, recoveredCount, retiredCount };
}

// src/product/durable-intent-recovery.ts
var reads = (legacy) => legacy;
function evidenceRef3(prefix, value2) {
  return `${prefix}:${String(sha256Text(JSON.stringify(value2)))}`;
}
function sameContent2(left, right) {
  return Boolean(left && right && left.algorithm === right.algorithm && left.hash === right.hash && left.sizeBytes === right.sizeBytes);
}
function uniqueRemote2(entries, path2, kind) {
  const matches = entries.filter((entry2) => !entry2.trashed && entry2.path === path2 && (!kind || entry2.entityKind === kind));
  return matches.length === 1 ? matches[0] : void 0;
}
async function completeEntries(legacy, remote) {
  const result = await reads(legacy).drive.listForReconciliation(remote.rootId);
  return result.ok && result.value.completeness.status === "complete" ? result.value.entries.filter((entry2) => !entry2.trashed) : void 0;
}
function validateDescriptor2(intent, effect, authority) {
  const descriptor = effect.descriptor;
  if (!effect.effectId) return "durable effect identity is malformed";
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    if (descriptor.targetPath !== mutation.path || mutation.intentId !== intent.intentId || !sameContent2(descriptor.intendedContent, mutation.intendedContent)) {
      return "REMOTE file descriptor contradicts persisted mutation identity/content";
    }
    if (mutation.kind === "reserved-file-create") return descriptor.mutationKind === "create" ? void 0 : "REMOTE file create descriptor has incompatible mutation kind";
    if (descriptor.mutationKind !== "update" || mutation.updateProtocol !== "immutable-candidate-preservation") return "REMOTE update descriptor lacks immutable-candidate authority";
    if (mutation.identityAuthority.status !== "unique" || mutation.identityAuthority.generation !== intent.semanticAuthority.generation || mutation.identityAuthority.path !== descriptor.targetPath || mutation.identityAuthority.remoteObjectId !== mutation.remoteObjectId) return "REMOTE update descriptor identity authority is contradictory";
    return void 0;
  }
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") {
    if (!folderCreateDescriptorIsSelfConsistent(descriptor)) return "folder-create durable descriptor is internally inconsistent";
    return descriptor.intentId === intent.intentId && descriptor.pathAuthority.generation === intent.semanticAuthority.generation ? void 0 : "folder-create descriptor semantic authority is inconsistent";
  }
  if (descriptor.kind === "local-file") {
    const matches = authority.localTransactions.filter((transaction2) => transaction2.transactionId === descriptor.localTransactionId && transaction2.operationId === intent.operationId);
    const transaction = matches[0];
    return matches.length === 1 && transaction?.path === descriptor.targetPath && transaction.mutationKind === descriptor.mutationKind && sameContent2(transaction.expectedNewEvidence, descriptor.intendedContent) ? void 0 : "LOCAL file descriptor lacks one exact matching durable transaction authority";
  }
  if (descriptor.kind === "move") {
    return descriptor.identityAuthority.status === "unique" && descriptor.identityAuthority.generation === intent.semanticAuthority.generation && descriptor.identityAuthority.path === descriptor.fromPath && (!descriptor.remoteObjectId || descriptor.remoteObjectId === descriptor.identityAuthority.remoteObjectId) ? void 0 : "move descriptor identity authority is contradictory";
  }
  if (descriptor.baseAuthority.generation !== intent.semanticAuthority.generation || descriptor.baseAuthority.path !== descriptor.path) return "trash descriptor BASE authority is contradictory";
  if (descriptor.targetSide === "remote") {
    return descriptor.remoteObjectId && descriptor.identityAuthority?.status === "unique" && descriptor.identityAuthority.generation === intent.semanticAuthority.generation && descriptor.identityAuthority.path === descriptor.path && descriptor.identityAuthority.remoteObjectId === descriptor.remoteObjectId ? void 0 : "REMOTE trash descriptor identity authority is contradictory";
  }
  return void 0;
}
function validateIntent2(intent, authority) {
  if (intent.semanticAuthority.generation !== authority.semanticGeneration) return "persisted durable intent belongs to stale semantic generation";
  if (!intent.effects.length) return "durable operation intent contains no physical effects";
  if (intent.logicalKind === "single-effect" && intent.effects.length !== 1) return "single-effect durable intent contains multiple effects";
  if (intent.logicalKind === "clean-text-merge" && intent.effects.length < 2) return "clean merge durable intent is missing required effects";
  const ids = /* @__PURE__ */ new Set();
  for (const effect of intent.effects) {
    if (ids.has(effect.effectId)) return "durable operation intent contains duplicate effect identity";
    ids.add(effect.effectId);
    const invalid = validateDescriptor2(intent, effect, authority);
    if (invalid) return invalid;
  }
  if (intent.effects.some((effect) => effect.stage === "intent-persisted") && intent.effects.some((effect) => effect.stage !== "intent-persisted")) {
    return "durable operation intent mixes unattempted and physically progressed effects";
  }
  return void 0;
}
async function folderObservation(legacy, descriptor, dependencies) {
  if (descriptor.kind === "remote-folder-create") {
    const reader = dependencies.remoteFolderCreateRecoveryReadPort;
    if (!reader) return { status: "outcome-unknown", reason: "RemoteFolderCreateRecoveryReadPort unavailable during durable recovery" };
    const result2 = verifyRemoteFolderCreate(descriptor, await reader.observeFolderCreateRecovery(descriptor));
    return result2.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-remote-folder", result2.proof) } : result2;
  }
  const observed2 = await reads(legacy).local.observe(descriptor.targetPath);
  const view = observed2.status === "present" && observed2.entityKind === "folder" && observed2.observationToken ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed2.observationToken } : observed2.status === "absent" ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey } : observed2.status === "present" ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed2.entityKind } : { status: "unobservable", reason: "LOCAL folder observation incomplete during durable recovery" };
  const result = verifyLocalFolderCreate(descriptor, view);
  return result.status === "verified-effect" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-local-folder", result.proof) } : result;
}
async function observePhysicalReality(legacy, lifecycle, intent, effect, authority, remote, dependencies, remoteEntries2, recoverLocalTransaction) {
  const descriptor = effect.descriptor;
  if (descriptor.kind === "remote-folder-create" || descriptor.kind === "local-folder-create") return folderObservation(legacy, descriptor, dependencies);
  if (descriptor.kind === "local-file") {
    if (recoverLocalTransaction) {
      if (!dependencies.localTransactionalMutationPort) return { status: "outcome-unknown", reason: "LocalTransactionalMutationPort unavailable during durable recovery" };
      const transaction = authority.localTransactions.find((value2) => value2.transactionId === descriptor.localTransactionId && value2.operationId === intent.operationId);
      if (!transaction) return { status: "outcome-unknown", reason: "LOCAL durable transaction missing during recovery" };
      const recovered = await dependencies.localTransactionalMutationPort.recover(transaction);
      const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
      if (persisted.status !== "persisted") return { status: "outcome-unknown", reason: "LOCAL transaction recovery progress could not be persisted" };
      if (recovered.status !== "recovered" && recovered.status !== "committed") return { status: "outcome-unknown", reason: "LOCAL transaction recovery did not establish completion" };
    }
    const observed2 = await reads(legacy).local.observe(descriptor.targetPath);
    return observed2.status === "present" && observed2.entityKind === "file" && observed2.content?.hash === descriptor.intendedContent.hash && observed2.content.sizeBytes === descriptor.intendedContent.sizeBytes ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-local-file", { descriptor, observed: observed2.content }) } : { status: "outcome-unknown", reason: "LOCAL file does not prove persisted intended content" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([reads(legacy).local.observe(descriptor.fromPath), reads(legacy).local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-local-move", descriptor) } : { status: "outcome-unknown", reason: "LOCAL move physical reality is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await reads(legacy).local.observe(descriptor.path)).status === "absent" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-local-trash", descriptor) } : { status: "outcome-unknown", reason: "LOCAL trash target remains present" };
  }
  const entries = await remoteEntries2();
  if (!entries) return { status: "outcome-unknown", reason: "complete REMOTE observation unavailable during durable recovery" };
  if (descriptor.kind === "remote-file") {
    const mutation = descriptor.remoteMutation;
    if (mutation.kind === "existing-file-content-update") {
      const update = verifyPreservedRemoteUpdateConvergence(descriptor, entries);
      return update.status === "converged" ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-remote-update", { descriptor, predecessor: update.predecessor, candidate: update.candidate }) } : { status: "outcome-unknown", reason: update.reason };
    }
    const actual = uniqueRemote2(entries, descriptor.targetPath, "file");
    return actual?.remoteObjectId === mutation.reservedRemoteObjectId && actual.content?.hash === descriptor.intendedContent.hash && actual.content.sizeBytes === descriptor.intendedContent.sizeBytes ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-remote-file", { descriptor, observed: actual }) } : { status: "outcome-unknown", reason: "REMOTE file does not prove persisted identity/content without ambiguity" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const expectedId = descriptor.remoteObjectId ?? descriptor.identityAuthority.remoteObjectId;
    const destination = uniqueRemote2(entries, descriptor.toPath);
    return destination?.remoteObjectId === expectedId && !entries.some((entry2) => entry2.path === descriptor.fromPath && entry2.remoteObjectId === expectedId) ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-remote-move", { descriptor, destination }) } : { status: "outcome-unknown", reason: "REMOTE move is not uniquely converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return !entries.some((entry2) => entry2.remoteObjectId === descriptor.remoteObjectId) && !entries.some((entry2) => entry2.path === descriptor.path) ? { status: "verified-effect", verificationEvidenceRef: evidenceRef3("durable-recovery-remote-trash", { descriptor, exactAbsence: true }) } : { status: "outcome-unknown", reason: "REMOTE trash is not proven by exact ID/path absence" };
  }
  return { status: "outcome-unknown", reason: "unsupported durable recovery descriptor" };
}
async function verifyCurrentPhysicalReality(legacy, lifecycle, intent, effect, authority, remote, dependencies, cachedEntries) {
  const observed2 = await observePhysicalReality(legacy, lifecycle, intent, effect, authority, remote, dependencies, cachedEntries, false);
  return observed2.status === "verified-effect" ? void 0 : `${observed2.status}: ${observed2.reason}`;
}
async function preverifyOutstandingRemoteUpdates(legacy, authorityStore, remote, dependencies) {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  let loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded.reason;
  let remotePromise;
  const remoteEntries2 = () => remotePromise ??= completeEntries(legacy, remote);
  for (const intent of loaded.state.operationIntents) {
    const invalid = validateIntent2(intent, loaded.state);
    if (invalid) return invalid;
    for (const effect of intent.effects) {
      if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown" || effect.descriptor.kind !== "remote-file" || effect.descriptor.remoteMutation.kind !== "existing-file-content-update") continue;
      const observed2 = await observePhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries2, false);
      if (observed2.status !== "verified-effect") continue;
      const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, observed2);
      if (recorded.status !== "effect-verified" && !(recorded.status === "already-progressed" && (recorded.stage === "effect-verified" || recorded.stage === "state-committed"))) {
        return `durable REMOTE update ${effect.effectId} could not persist verified recovery (${recorded.status}${"reason" in recorded ? `: ${recorded.reason}` : ""})`;
      }
      loaded = await lifecycle.loadAuthority();
      if (loaded.status !== "trusted") return loaded.reason;
    }
  }
  return void 0;
}
async function preflightVerifiedEffects(legacy, authorityStore, remote, dependencies) {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  const loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded.reason;
  let remotePromise;
  const remoteEntries2 = () => remotePromise ??= completeEntries(legacy, remote);
  for (const intent of loaded.state.operationIntents) {
    const invalid = validateIntent2(intent, loaded.state);
    if (invalid) return invalid;
    for (const effect of intent.effects) {
      if (effect.stage !== "effect-verified") continue;
      if (!effect.verificationEvidenceRef) return `effect-verified durable effect ${effect.effectId} lacks verification evidence`;
      const failure = await verifyCurrentPhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries2);
      if (failure) return `${effect.effectId}: effect-verified physical reality is not currently converged (${failure})`;
    }
  }
  return void 0;
}
async function recoverMatchingDurableIntentToVerifiedReceipt(legacy, authorityStore, stateStore, stateContext, remote, operationId, dependencies = {}) {
  const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
  let loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  const matches = loaded.state.operationIntents.filter((intent2) => intent2.operationId === operationId);
  if (matches.length !== 1) return { status: "recovery-required", reason: matches.length ? "duplicate durable operation intent identity" : "matching durable operation intent is unavailable" };
  let intent = matches[0];
  const invalid = validateIntent2(intent, loaded.state);
  if (invalid) return { status: "recovery-required", reason: invalid };
  if (intent.effects.every((effect) => effect.stage === "intent-persisted")) {
    const retired = await lifecycle.retireUnattemptedIntent(String(intent.operationId));
    return retired.status === "persisted" ? { status: "retired" } : { status: "recovery-required", reason: `unattempted durable intent could not be retired (${retired.status})` };
  }
  let remotePromise;
  const remoteEntries2 = () => remotePromise ??= completeEntries(legacy, remote);
  for (const effect of intent.effects) {
    if (effect.stage === "state-committed") continue;
    if (effect.stage === "effect-verified") {
      if (!effect.verificationEvidenceRef) return { status: "recovery-required", reason: `effect-verified durable effect ${effect.effectId} lacks verification evidence` };
      const failure = await verifyCurrentPhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries2);
      if (failure) return { status: "recovery-required", reason: `${effect.effectId}: effect-verified physical reality is not currently converged (${failure})` };
      continue;
    }
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") {
      return { status: "recovery-required", reason: `unsupported matching durable stage ${effect.stage}` };
    }
    const physical = await observePhysicalReality(legacy, lifecycle, intent, effect, loaded.state, remote, dependencies, remoteEntries2, true);
    const recorded = await lifecycle.recordPhysicalResult(String(intent.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && !(recorded.status === "already-progressed" && (recorded.stage === "effect-verified" || recorded.stage === "state-committed"))) {
      return { status: "recovery-required", reason: `durable effect ${effect.effectId} remains unresolved (${recorded.status}${"reason" in recorded ? `: ${recorded.reason}` : ""})` };
    }
    loaded = await lifecycle.loadAuthority();
    if (loaded.status !== "trusted") return loaded;
    const refreshed2 = loaded.state.operationIntents.filter((value2) => value2.operationId === operationId);
    if (refreshed2.length !== 1) return { status: "recovery-required", reason: "durable intent identity changed during physical recovery" };
    intent = refreshed2[0];
  }
  loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return loaded;
  const refreshed = loaded.state.operationIntents.filter((value2) => value2.operationId === operationId);
  if (refreshed.length !== 1) return { status: "recovery-required", reason: "durable intent identity changed before receipt reconstruction" };
  intent = refreshed[0];
  const invalidVerified = validateIntent2(intent, loaded.state);
  if (invalidVerified) return { status: "recovery-required", reason: invalidVerified };
  if (!intent.effects.every((effect) => (effect.stage === "effect-verified" || effect.stage === "state-committed") && Boolean(effect.verificationEvidenceRef))) {
    return { status: "recovery-required", reason: "not every durable physical effect reached verified authority" };
  }
  const canonical2 = await stateStore.load(stateContext);
  if (canonical2.status !== "trusted") return { status: "recovery-required", reason: "trusted canonical state unavailable during durable receipt reconstruction" };
  const entries = await remoteEntries2();
  if (!entries) return { status: "recovery-required", reason: "complete REMOTE observation unavailable for durable receipt reconstruction" };
  const reconstructed = reconstructDurableRecovery(intent, canonical2.state, entries);
  return reconstructed ? { status: "verified", receipt: reconstructed.receipt } : { status: "recovery-required", reason: "persisted descriptors cannot reconstruct one verified recovery receipt" };
}
async function recoverOutstandingDurableIntents2(legacy, authorityStore, stateStore, stateContext, remote, dependencies = {}) {
  const updateFailure = await preverifyOutstandingRemoteUpdates(legacy, authorityStore, remote, dependencies);
  if (updateFailure) return { status: "recovery-required", reason: updateFailure };
  const failure = await preflightVerifiedEffects(legacy, authorityStore, remote, dependencies);
  if (failure) return { status: "recovery-required", reason: failure };
  return recoverOutstandingDurableIntents(legacy, authorityStore, stateStore, stateContext, remote, dependencies);
}

// src/product/authoritative-production-executor.ts
function expectedOperationShape(intent) {
  const first = intent.effects[0]?.descriptor;
  if (!first) return void 0;
  if (intent.logicalKind === "clean-text-merge") {
    const remote = intent.effects.map((effect) => effect.descriptor).find((descriptor) => descriptor.kind === "remote-file");
    return remote?.kind === "remote-file" ? { kind: "clean-text-merge", path: remote.targetPath, remoteObjectId: remote.remoteMutation.kind === "existing-file-content-update" ? remote.remoteMutation.remoteObjectId : void 0 } : void 0;
  }
  if (first.kind === "remote-file") {
    return first.remoteMutation.kind === "reserved-file-create" ? { kind: "upload-create", path: first.targetPath, remoteObjectId: first.remoteMutation.reservedRemoteObjectId } : { kind: "upload-update", path: first.targetPath, remoteObjectId: first.remoteMutation.remoteObjectId };
  }
  if (first.kind === "remote-folder-create") return { kind: "upload-create", path: first.targetPath, remoteObjectId: first.remoteMutation.reservedRemoteObjectId };
  if (first.kind === "local-file") return { kind: first.mutationKind === "create" ? "download-create" : "download-update", path: first.targetPath };
  if (first.kind === "local-folder-create") return { kind: "download-create", path: first.targetPath };
  if (first.kind === "move") return { kind: "identity-preserving-move", path: first.fromPath, remoteObjectId: first.remoteObjectId ?? first.identityAuthority.remoteObjectId };
  return { kind: first.targetSide === "remote" ? "trash-remote" : "trash-local", path: first.path, remoteObjectId: first.remoteObjectId };
}
function operationContradiction(operation, intent) {
  const expected = expectedOperationShape(intent);
  if (!expected) return "persisted durable intent cannot establish one logical operation shape";
  if (operation.kind !== expected.kind || operation.path !== expected.path) return "current operation contradicts persisted durable intent kind/path";
  if (operation.kind === "identity-preserving-move") {
    const descriptor = intent.effects[0]?.descriptor;
    if (descriptor?.kind !== "move" || operation.fromPath !== descriptor.fromPath || operation.toPath !== descriptor.toPath || operation.targetSide !== descriptor.targetSide) return "current move contradicts persisted durable move authority";
  }
  const claimedIds = [operation.remoteObjectId, operation.contentVersion?.remoteObjectId].filter((value2) => value2 !== void 0);
  if (expected.remoteObjectId && claimedIds.some((value2) => value2 !== expected.remoteObjectId)) return "current operation REMOTE identity contradicts persisted durable identity";
  return void 0;
}
async function outstandingIntent(authorityStore, operation) {
  const loaded = await authorityStore.loadAuthority();
  if (loaded.status !== "trusted") return { status: "recovery-required", reason: `authoritative metadata ${loaded.status}` };
  const intents = loaded.state.operationIntents.filter((value2) => value2.operationId === operation.operationId);
  if (!intents.length) return { status: "none" };
  if (intents.length !== 1) return { status: "recovery-required", reason: "duplicate durable operation intent identity" };
  const intent = intents[0];
  if (intent.semanticAuthority.generation !== loaded.state.semanticGeneration) return { status: "recovery-required", reason: "persisted durable intent belongs to stale semantic generation" };
  const contradiction = operationContradiction(operation, intent);
  return contradiction ? { status: "recovery-required", reason: contradiction } : { status: "found", intent };
}
function createAuthoritativeProductExecutor2(legacy, authorityStore, identityStateStore, stateContext, managedRemote, explicitDependencies) {
  const base = createAuthoritativeProductExecutor(legacy, authorityStore, identityStateStore, stateContext, managedRemote, explicitDependencies);
  const configured = explicitDependencies ?? legacy.recoverableProductionMutationDependencies ?? {};
  async function validatePreconditions(operation) {
    const existing = await outstandingIntent(authorityStore, operation);
    if (existing.status === "recovery-required") return { status: "recovery-required", reason: existing.reason };
    if (existing.status === "found") return { status: "valid" };
    return base.validatePreconditions(operation);
  }
  async function execute(operation) {
    const existing = await outstandingIntent(authorityStore, operation);
    if (existing.status === "recovery-required") return { status: "recovery-required", reason: existing.reason };
    if (existing.status === "none") return base.execute(operation);
    const recovery = await recoverMatchingDurableIntentToVerifiedReceipt(
      legacy,
      authorityStore,
      identityStateStore,
      stateContext,
      managedRemote,
      operation.operationId,
      {
        localTransactionalMutationPort: configured.localTransactionalMutationPort,
        remoteFolderCreateRecoveryReadPort: configured.remoteFolderCreateRecoveryReadPort
      }
    );
    if (recovery.status === "recovery-required") return { status: "recovery-required", reason: recovery.reason };
    if (recovery.status === "retired") return { status: "recovery-required", reason: "unattempted durable intent was retired; current work must be replanned under renewed authority" };
    return { status: "durable-verified-success", receipt: recovery.receipt };
  }
  return { validatePreconditions, execute };
}
function retrySafeVerifiedNotApplied() {
  return { status: "verified-no-unresolved-effect", basis: "verified-not-applied" };
}
function safeVerifiedNotAppliedResult(reason, operationalFailure) {
  const safety = retrySafeVerifiedNotApplied();
  if (!operationalFailure) return { status: "blocking-failure", reason, effectSafety: safety };
  switch (operationalFailure.kind) {
    case "authentication-required":
      return { status: "authentication-required", reason, operationalFailure, effectSafety: safety };
    case "transient-failure":
    case "rate-limited":
      return { status: "retryable-failure", reason, operationalFailure, retrySafety: safety };
    case "permission-denied":
    case "quota-exhausted":
      return { status: "blocking-failure", reason, operationalFailure, effectSafety: safety };
    case "recovery-required":
    case "unclassified":
      return { status: "recovery-required", reason, operationalFailure };
  }
}
function predecessorToV1_3(result) {
  switch (result.status) {
    case "durable-verified-success":
    case "stale-precondition":
    case "cancelled":
      return result;
    case "recovery-required":
      return { status: "recovery-required", reason: result.reason };
    case "uncertain":
      return { status: "uncertain", reason: result.reason };
    case "blocking-failure":
      return { status: "recovery-required", reason: result.reason };
    case "retryable-failure":
      return { status: "recovery-required", reason: result.reason };
  }
}
function createAuthoritativeProductExecutorV1_3(legacy, authorityStore, identityStateStore, stateContext, managedRemote, explicitDependencies) {
  const remoteOutcomes = [];
  const localResults = [];
  const remote = explicitDependencies.reliableRemoteMutationPort;
  const local = explicitDependencies.localTransactionalMutationPort;
  const adaptedDependencies = {
    ...remote ? {
      reliableRemoteMutationPort: {
        reserveFileCreateIdentity: (...args) => remote.reserveFileCreateIdentity(...args),
        reserveFolderCreateIdentity: (...args) => remote.reserveFolderCreateIdentity(...args),
        createReserved: async (...args) => {
          const outcome = await remote.createReserved(...args);
          remoteOutcomes.push(outcome);
          return outcome;
        },
        updateExisting: async (...args) => {
          const outcome = await remote.updateExisting(...args);
          remoteOutcomes.push(outcome);
          return outcome;
        },
        moveExisting: async (...args) => {
          const outcome = await remote.moveExisting(...args);
          remoteOutcomes.push(outcome);
          return outcome;
        },
        trashExisting: async (...args) => {
          const outcome = await remote.trashExisting(...args);
          remoteOutcomes.push(outcome);
          return outcome;
        }
      }
    } : {},
    ...local ? {
      localTransactionalMutationPort: {
        stageAndVerify: async (...args) => {
          const result = await local.stageAndVerify(...args);
          localResults.push(result);
          return result;
        },
        commitVerifiedStage: async (...args) => {
          const result = await local.commitVerifiedStage(...args);
          localResults.push(result);
          return result;
        },
        recover: async (...args) => {
          const result = await local.recover(...args);
          localResults.push(result);
          return result;
        }
      }
    } : {},
    remoteFolderCreateRecoveryReadPort: explicitDependencies.remoteFolderCreateRecoveryReadPort
  };
  const predecessor = createAuthoritativeProductExecutor2(
    legacy,
    authorityStore,
    identityStateStore,
    stateContext,
    managedRemote,
    adaptedDependencies
  );
  return {
    validatePreconditions: (operation) => predecessor.validatePreconditions(operation),
    async execute(operation) {
      remoteOutcomes.length = 0;
      localResults.length = 0;
      const result = await predecessor.execute(operation);
      const remoteOutcome = remoteOutcomes.at(-1);
      const localResult = localResults.at(-1);
      if (result.status === "uncertain") {
        if (remoteOutcome?.status === "outcome-unknown") {
          return {
            status: "uncertain",
            reason: result.reason,
            ...remoteOutcome.operationalFailure ? { operationalFailure: remoteOutcome.operationalFailure } : {}
          };
        }
        if (localResult?.status === "outcome-unknown") {
          return {
            status: "uncertain",
            reason: result.reason,
            ...localResult.operationalFailure ? { operationalFailure: localResult.operationalFailure } : {}
          };
        }
        if (remoteOutcome?.status === "verified-not-applied") {
          if (operation.kind === "clean-text-merge") {
            return {
              status: "uncertain",
              reason: result.reason,
              ...remoteOutcome.operationalFailure ? { operationalFailure: remoteOutcome.operationalFailure } : {}
            };
          }
          return safeVerifiedNotAppliedResult(
            remoteOutcome.reason,
            remoteOutcome.operationalFailure
          );
        }
      }
      return predecessorToV1_3(result);
    }
  };
}

// src/product/snapshot-assembler.ts
function path(value2) {
  return contractId(value2);
}
function signalMessage(signal, fallback) {
  return "detail" in signal && signal.detail ? signal.detail : fallback;
}
function absentLocal(p) {
  return { status: "absent", side: "local", path: p };
}
function absentRemote(p) {
  return { status: "absent", side: "remote", path: p };
}
function remoteObservation(entry2) {
  return { status: "present", side: "remote", path: entry2.path, entityKind: entry2.entityKind, remoteObjectId: entry2.remoteObjectId, content: entry2.content, stability: "stable" };
}
function applyChanges(target, changes, included) {
  for (const change of changes) {
    if (change.kind === "upsert") {
      if (included(change.entry.path)) target.set(String(change.entry.remoteObjectId), change.entry);
      else target.delete(String(change.entry.remoteObjectId));
    } else target.delete(String(change.remoteObjectId));
  }
}
function batchIdentity(startingToken, terminalStartToken, changes) {
  const normalized = changes.map((change) => change.kind === "removed" ? { kind: change.kind, remoteObjectId: String(change.remoteObjectId), lastKnownPath: change.lastKnownPath ? String(change.lastKnownPath) : void 0 } : {
    kind: change.kind,
    entry: {
      path: String(change.entry.path),
      entityKind: change.entry.entityKind,
      remoteObjectId: String(change.entry.remoteObjectId),
      trashed: change.entry.trashed,
      content: change.entry.content ? { hash: change.entry.content.hash ? String(change.entry.content.hash) : void 0, sizeBytes: change.entry.content.sizeBytes, revision: change.entry.content.revision } : void 0
    }
  });
  return contractId(`remote-batch:${String(sha256Text(JSON.stringify({ startingToken: String(startingToken), terminalStartToken: String(terminalStartToken), changes: normalized })))}`);
}
var SnapshotAssemblyError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "SnapshotAssemblyError";
  }
  code;
};
var ProductSnapshotAssembler = class {
  constructor(local, drive, state, stateContext, remoteIdentity2, pathIncluded = () => true, fullReconcileRequired = () => false, diagnostics, reliableChanges, authorityStore) {
    this.local = local;
    this.drive = drive;
    this.state = state;
    this.stateContext = stateContext;
    this.remoteIdentity = remoteIdentity2;
    this.pathIncluded = pathIncluded;
    this.fullReconcileRequired = fullReconcileRequired;
    this.diagnostics = diagnostics;
    this.reliableChanges = reliableChanges;
    this.authorityStore = authorityStore;
  }
  local;
  drive;
  state;
  stateContext;
  remoteIdentity;
  pathIncluded;
  fullReconcileRequired;
  diagnostics;
  reliableChanges;
  authorityStore;
  /** Orchestration binding; the store itself remains the frozen synchronization authority contract. */
  bindAuthorityStore(authorityStore) {
    this.authorityStore = authorityStore;
  }
  async assemble(preferIncremental = true, runId) {
    const managedRemote = await this.validatedRemote(runId);
    const loadedState = await this.loadState(runId);
    const incrementalAllowed = preferIncremental && !this.fullReconcileRequired() && Boolean(this.reliableChanges);
    if (incrementalAllowed && loadedState.status === "trusted" && loadedState.state.changeCursor) {
      const incremental = await this.assembleIncremental(managedRemote, loadedState, runId);
      if (incremental) return incremental;
    }
    return this.assembleFullWith(managedRemote, loadedState, runId);
  }
  async assembleFull(runId) {
    const managedRemote = await this.validatedRemote(runId);
    return this.assembleFullWith(managedRemote, await this.loadState(runId), runId);
  }
  /** Recovery deliberately projects current reality as an uninitialized safe union, never an empty authoritative BASE. */
  async assembleRecovery(reason, runId) {
    const managedRemote = await this.validatedRemote(runId);
    this.trace(runId, "remote-cursor-observation-start", { stage: "remote-observation", runMode: "full-recovery" });
    const cursorResult = await this.drive.getStartCursor(managedRemote.rootId);
    if (!cursorResult.ok) {
      const error = new SnapshotAssemblyError(cursorResult.signal.kind, signalMessage(cursorResult.signal, "recovery cursor acquisition failed"));
      this.failure(runId, "remote-observation-failed", error, "remote-observation");
      throw error;
    }
    this.trace(runId, "local-observation-start", { stage: "local-observation", runMode: "full-recovery" });
    this.trace(runId, "remote-observation-start", { stage: "remote-observation", runMode: "full-recovery" });
    const [localListing, remoteResult] = await Promise.all([
      this.local.enumerate().then((value2) => {
        this.debug(runId, "local-observation-complete", { stage: "local-observation", localCount: value2.entries.length, localCompleteness: value2.completeness.status });
        return value2;
      }).catch((error) => {
        this.failure(runId, "local-observation-failed", error, "local-observation");
        throw error;
      }),
      this.drive.listForReconciliation(managedRemote.rootId).then((value2) => {
        if (value2.ok) this.debug(runId, "remote-observation-complete", { stage: "remote-observation", remoteCount: value2.value.entries.length, remoteCompleteness: value2.value.completeness.status });
        else this.failure(runId, "remote-observation-failed", new SnapshotAssemblyError(value2.signal.kind, signalMessage(value2.signal, "remote observation failed")), "remote-observation");
        return value2;
      }).catch((error) => {
        this.failure(runId, "remote-observation-failed", error, "remote-observation");
        throw error;
      })
    ]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, signalMessage(remoteResult.signal, "recovery remote observation failed"));
    if (localListing.completeness.status !== "complete" || remoteResult.value.completeness.status !== "complete") {
      throw new SnapshotAssemblyError("recovery-required", `Recovery reconstruction requires complete LOCAL and REMOTE observation. LOCAL=${localListing.completeness.status}; REMOTE=${remoteResult.value.completeness.status}`);
    }
    const uninitialized = { status: "uninitialized" };
    const snapshots = this.makeSnapshots(uninitialized, this.filterLocal(localListing.entries), localListing.completeness, localListing.uncertainties, this.filterRemote(remoteResult.value.entries), remoteResult.value.completeness);
    return { input: { snapshots, state: uninitialized }, managedRemote, localEnumeration: localListing.completeness, remoteEnumeration: remoteResult.value.completeness, nextCursor: cursorResult.value, mode: "full", reconstruction: true, recoveryReason: reason };
  }
  async validatedRemote(runId) {
    this.trace(runId, "managed-remote-validation-start", { stage: "remote-precondition" });
    try {
      const managedRemote = await this.remoteIdentity();
      const validated = await this.drive.validateManagedRoot(managedRemote);
      if (!validated.ok) throw new SnapshotAssemblyError(validated.signal.kind, signalMessage(validated.signal, "managed remote validation failed"));
      if (validated.value.status !== "valid") throw new SnapshotAssemblyError(validated.value.status, "managed BRAIN Sync remote is not valid for this vault");
      this.trace(runId, "managed-remote-validation-complete", { stage: "remote-precondition", result: "valid" });
      return managedRemote;
    } catch (error) {
      this.failure(runId, "managed-remote-validation-failed", error, "remote-precondition");
      throw error;
    }
  }
  async assembleFullWith(managedRemote, loadedState, runId) {
    this.trace(runId, "remote-cursor-observation-start", { stage: "remote-observation", runMode: "full" });
    const cursorResult = await this.drive.getStartCursor(managedRemote.rootId);
    if (!cursorResult.ok) {
      const error = new SnapshotAssemblyError(cursorResult.signal.kind, signalMessage(cursorResult.signal, "remote start cursor acquisition failed"));
      this.failure(runId, "remote-observation-failed", error, "remote-observation");
      throw error;
    }
    this.trace(runId, "local-observation-start", { stage: "local-observation", runMode: "full" });
    this.trace(runId, "remote-observation-start", { stage: "remote-observation", runMode: "full" });
    const [localListing, remoteResult] = await Promise.all([
      this.local.enumerate().then((value2) => {
        this.debug(runId, "local-observation-complete", { stage: "local-observation", localCount: value2.entries.length, localCompleteness: value2.completeness.status });
        return value2;
      }).catch((error) => {
        this.failure(runId, "local-observation-failed", error, "local-observation");
        throw error;
      }),
      this.drive.listForReconciliation(managedRemote.rootId).then((value2) => {
        if (value2.ok) this.debug(runId, "remote-observation-complete", { stage: "remote-observation", remoteCount: value2.value.entries.length, remoteCompleteness: value2.value.completeness.status });
        else this.failure(runId, "remote-observation-failed", new SnapshotAssemblyError(value2.signal.kind, signalMessage(value2.signal, "remote observation failed")), "remote-observation");
        return value2;
      }).catch((error) => {
        this.failure(runId, "remote-observation-failed", error, "remote-observation");
        throw error;
      })
    ]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, signalMessage(remoteResult.signal, "remote reconciliation listing failed"));
    const snapshots = this.makeSnapshots(loadedState, this.filterLocal(localListing.entries), localListing.completeness, localListing.uncertainties, this.filterRemote(remoteResult.value.entries), remoteResult.value.completeness);
    return { input: { snapshots, state: loadedState }, managedRemote, localEnumeration: localListing.completeness, remoteEnumeration: remoteResult.value.completeness, nextCursor: cursorResult.value, mode: "full" };
  }
  async assembleIncremental(managedRemote, loadedState, runId) {
    const canonicalCursor = loadedState.state.changeCursor;
    const reliableChanges = this.reliableChanges;
    if (!canonicalCursor || !reliableChanges) return void 0;
    let authorityRevision = loadedState.state.stateRevision;
    let learnedBatches = [];
    if (this.authorityStore) {
      const authority = await this.authorityStore.loadAuthority();
      if (authority.status === "trusted") {
        authorityRevision = authority.state.persistenceRevision;
        learnedBatches = authority.state.learnedRemoteBatches;
      }
    }
    this.trace(runId, "local-observation-start", { stage: "local-observation", runMode: "incremental" });
    this.trace(runId, "remote-observation-start", { stage: "remote-observation", runMode: "incremental" });
    const localPromise = this.local.enumerate().then((value2) => {
      this.debug(runId, "local-observation-complete", { stage: "local-observation", localCount: value2.entries.length, localCompleteness: value2.completeness.status });
      return value2;
    }).catch((error) => {
      this.failure(runId, "local-observation-failed", error, "local-observation");
      throw error;
    });
    const reconstructed = this.remoteBaseline(loadedState.state);
    for (const durable of learnedBatches) applyChanges(reconstructed, durable.changes, this.pathIncluded);
    const effectiveCursor = learnedBatches.length ? learnedBatches[learnedBatches.length - 1].checkpoint.terminalStartToken : canonicalCursor;
    const changes = [];
    let requestedToken = effectiveCursor;
    let terminalCursor;
    while (!terminalCursor) {
      const result = await reliableChanges.readChangePage(managedRemote, requestedToken).catch((error) => {
        this.failure(runId, "remote-observation-failed", error, "remote-observation");
        throw error;
      });
      if (!result.ok) {
        if (result.signal.kind === "not-found" || result.signal.kind === "conflict") return void 0;
        const error = new SnapshotAssemblyError(result.signal.kind, signalMessage(result.signal, "incremental remote observation failed before terminal Changes authority"));
        this.failure(runId, "remote-observation-failed", error, "remote-observation");
        throw error;
      }
      if (result.value.requestedToken !== requestedToken) throw new SnapshotAssemblyError("recovery-required", "reliable Changes page did not prove the requested pagination token");
      changes.push(...result.value.changes);
      if (result.value.kind === "intermediate") {
        requestedToken = result.value.nextPageToken;
        continue;
      }
      terminalCursor = result.value.newStartPageToken;
    }
    const localListing = await localPromise;
    applyChanges(reconstructed, changes, this.pathIncluded);
    this.debug(runId, "remote-observation-complete", { stage: "remote-observation", remoteCount: changes.length, remoteCompleteness: "complete" });
    const remoteEntries2 = this.filterRemote([...reconstructed.values()]);
    const remoteCompleteness = { status: "complete" };
    const snapshots = this.makeSnapshots(loadedState, this.filterLocal(localListing.entries), localListing.completeness, localListing.uncertainties, remoteEntries2, remoteCompleteness);
    const remoteChangeBatch = {
      checkpoint: {
        batchId: batchIdentity(effectiveCursor, terminalCursor, changes),
        startingToken: effectiveCursor,
        terminalStartToken: terminalCursor,
        persistenceRevision: authorityRevision,
        status: "learned"
      },
      changes
    };
    return { input: { snapshots, state: loadedState }, managedRemote, localEnumeration: localListing.completeness, remoteEnumeration: remoteCompleteness, nextCursor: terminalCursor, remoteChangeBatch, mode: "incremental" };
  }
  async loadState(runId) {
    this.trace(runId, "base-state-load-start", { stage: "base-load" });
    let loaded;
    try {
      loaded = await this.state.load(this.stateContext);
    } catch (error) {
      this.failure(runId, "base-state-load-failed", error, "base-load");
      throw error;
    }
    this.debug(runId, "base-state-load-complete", { stage: "base-load", stateStatus: loaded.status, count: loaded.status === "trusted" ? loaded.state.base.length : 0, cursorPresent: loaded.status === "trusted" && Boolean(loaded.state.changeCursor) });
    return loaded;
  }
  trace(runId, event, fields) {
    if (runId !== void 0) this.diagnostics?.syncTrace("sync.plan", event, runId, fields);
  }
  debug(runId, event, fields) {
    if (runId !== void 0) this.diagnostics?.syncDebug("sync.plan", event, runId, fields);
  }
  failure(runId, event, error, stage) {
    if (runId !== void 0) this.diagnostics?.syncFailure("sync.plan", event, runId, error, { stage, classification: "planning-boundary-failure", result: "failed" });
  }
  remoteBaseline(state) {
    const byId = /* @__PURE__ */ new Map();
    for (const base of state.base) {
      if (!this.pathIncluded(base.path) || !base.remoteExisted || !base.remoteObjectId) continue;
      byId.set(String(base.remoteObjectId), { path: base.path, entityKind: base.entityKind, remoteObjectId: base.remoteObjectId, content: base.content, trashed: false });
    }
    return byId;
  }
  filterLocal(entries) {
    return entries.filter((entry2) => this.pathIncluded(entry2.path));
  }
  filterRemote(entries) {
    return entries.filter((entry2) => !entry2.trashed && this.pathIncluded(entry2.path));
  }
  makeSnapshots(loadedState, localEntries, localCompleteness, localUncertainties, remoteEntries2, remoteCompleteness) {
    const localByPath = new Map(localEntries.map((entry2) => [String(entry2.path), entry2]));
    const remoteEntriesByPath = /* @__PURE__ */ new Map();
    for (const entry2 of remoteEntries2) {
      const key = String(entry2.path);
      const values = remoteEntriesByPath.get(key) ?? [];
      values.push(entry2);
      remoteEntriesByPath.set(key, values);
    }
    const paths2 = /* @__PURE__ */ new Set([...localByPath.keys(), ...remoteEntriesByPath.keys()]);
    if (loadedState.status === "trusted") {
      for (const entry2 of loadedState.state.base) if (this.pathIncluded(entry2.path)) paths2.add(String(entry2.path));
      for (const tombstone of loadedState.state.tombstones) if (this.pathIncluded(tombstone.path)) paths2.add(String(tombstone.path));
    }
    const remoteIdCounts = /* @__PURE__ */ new Map();
    for (const entry2 of remoteEntries2) remoteIdCounts.set(String(entry2.remoteObjectId), (remoteIdCounts.get(String(entry2.remoteObjectId)) ?? 0) + 1);
    const namespaceCollision = localByPath.has(CONFIG_REMOTE_NAMESPACE) || remoteEntriesByPath.has(CONFIG_REMOTE_NAMESPACE);
    const inCollisionScope = (raw) => namespaceCollision && (raw === CONFIG_REMOTE_NAMESPACE || raw.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`));
    return [...paths2].sort().map((raw) => {
      const p = path(raw);
      let local = localByPath.get(raw) ?? absentLocal(p);
      if (local.status === "absent" && localCompleteness.status !== "complete") {
        const matching = localUncertainties?.filter((uncertainty2) => {
          if (uncertainty2.scope === "all") return true;
          const uncertainPath = String(uncertainty2.path);
          return uncertainty2.scope === "path" ? raw === uncertainPath : raw === uncertainPath || raw.startsWith(`${uncertainPath}/`);
        });
        if (!localUncertainties?.length || matching?.length) local = { status: "unknown", side: "local", path: p, reason: matching?.map((item) => item.reason).join("; ") || localCompleteness.reason };
      }
      if (raw === CONFIG_REMOTE_NAMESPACE && namespaceCollision && local.status === "absent") local = { status: "unknown", side: "local", path: p, reason: "remote ordinary-vault content collides with the reserved portable-configuration namespace" };
      const remoteCandidates = [...new Map((remoteEntriesByPath.get(raw) ?? []).map((entry2) => [String(entry2.remoteObjectId), entry2])).values()];
      const remote = remoteCandidates.length === 0 ? absentRemote(p) : remoteCandidates.length === 1 ? remoteObservation(remoteCandidates[0]) : { status: "unknown", side: "remote", path: p, reason: "multiple distinct remote objects occupy the same logical path" };
      let base = { status: "uninitialized" };
      if (loadedState.status === "recovery-required") base = { status: "untrusted", reason: loadedState.detail ?? loadedState.reason };
      if (loadedState.status === "trusted") base = { status: "trusted", entry: loadedState.state.base.find((entry2) => String(entry2.path) === raw), tombstone: loadedState.state.tombstones.find((entry2) => String(entry2.path) === raw) };
      let identity = { status: "unambiguous" };
      const candidateRemoteIds = remoteCandidates.map((entry2) => entry2.remoteObjectId);
      if (remoteCandidates.length > 1) identity = { status: "ambiguous", reason: "multiple distinct remote objects occupy the same logical path", candidateRemoteIds };
      else if (remoteCandidates[0] && (remoteIdCounts.get(String(remoteCandidates[0].remoteObjectId)) ?? 0) > 1) identity = { status: "ambiguous", reason: "multiple remote entries claim the same stable Drive identity", candidateRemoteIds };
      if (inCollisionScope(raw)) identity = { status: "ambiguous", reason: `reserved portable-configuration namespace collision isolates ${CONFIG_REMOTE_NAMESPACE} from ordinary vault synchronization`, candidateRemoteIds };
      return { path: p, local, remote, base, remoteEnumeration: remoteCompleteness, identity };
    });
  }
};

// src/product/product-controller-base.ts
var AUTOMATIC_TRIGGER_PRIORITY = { periodic: 1, "startup-resume": 2, "local-change": 3 };
var cid2 = (value2) => contractId(value2);
var auditId = () => globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}-${Math.random()}`;
function observedVersion(snapshot, side) {
  const value2 = snapshot[side];
  return value2.status === "present" ? { path: value2.path, entityKind: value2.entityKind, content: value2.content, remoteObjectId: value2.remoteObjectId, observationToken: value2.observationToken } : void 0;
}
function baseVersion(snapshot) {
  const value2 = snapshot.base.status === "trusted" ? snapshot.base.entry : void 0;
  return value2 ? { path: value2.path, entityKind: value2.entityKind, content: value2.content, remoteObjectId: value2.remoteObjectId } : void 0;
}
function assessmentKey(assessment) {
  if (assessment.kind === "none") return void 0;
  return assessment.kind === "clean-merge" ? cid2(`conflict:clean:${String(assessment.path)}`) : assessment.conflictId;
}
function localExact(version) {
  const preconditions = [{
    kind: "path-observation",
    side: "local",
    path: version.path,
    expected: "present",
    ...version.observationToken ? { observationToken: String(version.observationToken) } : {}
  }];
  if (version.content) preconditions.push({ kind: "content-evidence", side: "local", path: version.path, expected: version.content });
  return preconditions;
}
function remoteExact(version) {
  const preconditions = [];
  if (version.remoteObjectId) preconditions.push({
    kind: "remote-object",
    remoteObjectId: version.remoteObjectId,
    ...version.content?.revision ? { expectedRevision: version.content.revision } : {}
  });
  if (version.content) preconditions.push({ kind: "content-evidence", side: "remote", path: version.path, expected: version.content });
  return preconditions;
}
function safeToken(value2) {
  return (value2 ?? "na").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 32);
}
function conflictCopyBase(path2, provenance2) {
  const raw = String(path2);
  const slash = raw.lastIndexOf("/");
  const dir = slash >= 0 ? raw.slice(0, slash + 1) : "";
  const name = slash >= 0 ? raw.slice(slash + 1) : raw;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const identity = provenance2.deviceId ? `device-${safeToken(String(provenance2.deviceId))}` : provenance2.remoteObjectId ? `remote-${safeToken(String(provenance2.remoteObjectId))}` : "identity-na";
  const version = provenance2.version.content?.hash ? String(provenance2.version.content.hash) : provenance2.version.content?.revision ? `revision-${provenance2.version.content.revision}` : "version-na";
  const observedAt = provenance2.advisoryObservedAtMs ?? provenance2.version.content?.advisoryModifiedTimeMs;
  return cid2(`${dir}${stem} (conflict ${provenance2.source} ${identity} at-${observedAt ?? "na"} ${safeToken(version)})${ext}`);
}
function numbered(path2, number) {
  if (number === 1) return path2;
  const raw = String(path2);
  const slash = raw.lastIndexOf("/");
  const dot = raw.lastIndexOf(".");
  return cid2(`${dot > slash ? raw.slice(0, dot) : raw} (${number})${dot > slash ? raw.slice(dot) : ""}`);
}
function authenticationReason(reason) {
  const prefix = "authentication-required:";
  return reason.startsWith(prefix) ? reason.slice(prefix.length) || "authorization-required" : void 0;
}
function predecessorExecutionResult(result) {
  switch (result.status) {
    case "durable-verified-success":
    case "stale-precondition":
    case "recovery-required":
    case "uncertain":
    case "cancelled":
      return result;
    case "authentication-required":
    case "blocking-failure":
      return { status: "blocking-failure", reason: result.reason };
    case "retryable-failure":
      return { status: "retryable-failure", reason: result.reason };
  }
}
function readCapturedExecutionResult(capture) {
  return capture.result;
}
function capturingBinarySourceV1_3(source, capture) {
  return {
    ...source.sizeBytes === void 0 ? {} : { sizeBytes: source.sizeBytes },
    async *openChunks() {
      try {
        for await (const chunk of source.openChunks()) yield chunk;
      } catch (error) {
        const failure = operationalFailureProvenanceFromErrorV1_3(error);
        if (failure) capture.failure = failure;
        throw error;
      }
    }
  };
}
function capturingMutationDependenciesV1_3(dependencies, capture) {
  const local = dependencies.localTransactionalMutationPort;
  if (!local) return dependencies;
  return {
    ...dependencies,
    localTransactionalMutationPort: {
      stageAndVerify: (transaction, content, cancellation) => local.stageAndVerify(transaction, capturingBinarySourceV1_3(content, capture), cancellation),
      commitVerifiedStage: (...args) => local.commitVerifiedStage(...args),
      recover: (...args) => local.recover(...args)
    }
  };
}
function readCapturedOperationalFailureV1_3(capture) {
  return capture.failure;
}
function operationalSurfaceReasonV1_3(result) {
  if (!("operationalFailure" in result) || !result.operationalFailure) return "reason" in result ? result.reason : void 0;
  return result.operationalFailure.detail ?? result.operationalFailure.kind;
}
function globalExecutionGate(plan) {
  return plan.globalExecutionGate;
}
function attentionOperations(plan) {
  return plan.operations.filter((operation) => operation.kind === "blocked-unsafe" || operation.kind === "unresolved-conflict");
}
function planDiagnosticFields(plan, assembly) {
  const operations = plan.operations;
  const count = (predicate) => operations.filter(predicate).length;
  return {
    trigger: plan.trigger,
    runMode: assembly.mode,
    planDisposition: plan.executionDisposition,
    stateStatus: assembly.input.state.status,
    classification: assembly.reconstruction ? "recovery" : assembly.input.state.status === "uninitialized" ? "first-sync" : "normal",
    snapshotCount: assembly.input.snapshots.length,
    localCount: assembly.input.snapshots.filter((snapshot) => snapshot.local.status === "present").length,
    remoteCount: assembly.input.snapshots.filter((snapshot) => snapshot.remote.status === "present").length,
    operationCount: operations.length,
    conflictCount: count((operation) => operation.kind === "unresolved-conflict"),
    blockedCount: count((operation) => operation.kind === "blocked-unsafe" || operation.kind === "recovery-required"),
    attentionCount: count((operation) => operation.kind === "blocked-unsafe" || operation.kind === "unresolved-conflict"),
    destructiveCount: count((operation) => operation.destructive),
    uploadCount: count((operation) => operation.kind.startsWith("upload-")),
    downloadCount: count((operation) => operation.kind.startsWith("download-")),
    moveCount: count((operation) => operation.kind === "identity-preserving-move"),
    trashCount: count((operation) => operation.kind.startsWith("trash-")),
    noopCount: count((operation) => operation.kind === "noop"),
    remoteCompleteness: assembly.remoteEnumeration.status,
    ...assembly.localEnumeration ? { localCompleteness: assembly.localEnumeration.status } : {},
    reviewed: plan.trigger === "manual" || plan.trigger === "verify-reconcile",
    reconstruction: Boolean(assembly.reconstruction),
    cursorPresent: Boolean(assembly.nextCursor)
  };
}
function executionFailureBoundary(stage) {
  switch (stage) {
    case "operation-precondition-validation-failed":
      return { stage: "operation-precondition-validation", classification: "operation-precondition-validation-failure" };
    case "pending-journal-failed":
      return { stage: "pending-journal", classification: "pending-journal-failure" };
    case "pending-journal-discard-failed":
      return { stage: "pending-journal-discard", classification: "pending-journal-discard-failure" };
    case "content-mutation-failed":
      return { stage: "content-mutation", classification: "content-mutation-failure" };
    case "uncertain-state-journal-failed":
      return { stage: "uncertain-state-journal", classification: "uncertain-state-journal-failure" };
    case "state-commit-failed":
      return { stage: "state-commit", classification: "state-commit-failure" };
    default:
      return void 0;
  }
}
var ProductControllerBase = class {
  constructor(options) {
    this.options = options;
    this.runs = new CoreRunCoordinator(options.vaultIdentity, options.deviceIdentity, options.leasePort, options.holderId);
  }
  options;
  surface = { status: { kind: "idle-ready" }, conflicts: [] };
  listeners = /* @__PURE__ */ new Set();
  runs;
  conflictRegistry = /* @__PURE__ */ new Map();
  planned;
  runEvidence;
  pendingAutomaticTrigger;
  automaticDrain;
  currentSurface() {
    return this.surface;
  }
  onSurface(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  readAuditHistory() {
    return this.options.audit.read();
  }
  currentRunEvidence() {
    if (!this.runEvidence) throw new Error("no active synchronization run evidence");
    return this.runEvidence;
  }
  pendingDestructiveCheckpoint() {
    return this.planned?.checkpointId;
  }
  async previewManual(runId = this.options.diagnostics?.beginSyncRun("controller")) {
    this.syncInfo(runId, "manual-sync-request-enter", { operation: "preview-manual", trigger: "manual" });
    return this.createPlan("manual", true, true, runId);
  }
  async previewVerifyReconcile() {
    return this.createPlan("verify-reconcile", true, true);
  }
  noteChangeDuringRun() {
    this.runs.noteLocalOrRemoteChangeDuringRun();
  }
  recordPreviewPresented(planId, diagnosticRunId) {
    const planned = this.planned;
    if (planned?.plan.planId === planId) this.syncInfo(diagnosticRunId, "plan-preview-presented", { stage: "preview-presented", ...planDiagnosticFields(planned.plan, planned.assembly) });
  }
  recordPreviewPresentationFailure(_planId, error, diagnosticRunId) {
    this.syncFailure(diagnosticRunId, "sync-run-failed", error, { stage: "preview-presentation", classification: "preview-presentation-failure", result: "failed" });
    this.endDiagnosticRun(diagnosticRunId);
  }
  recordExecuteClick(planId, diagnosticRunId) {
    const planned = this.planned;
    this.syncInfo(diagnosticRunId, "execute-click-handler-enter", { stage: "execute-click", ...planned?.plan.planId === planId ? { operationCount: planned.plan.operations.length } : {} });
  }
  recordPreviewDismissed(_planId, diagnosticRunId) {
    if (diagnosticRunId === void 0) return;
    this.syncInfo(diagnosticRunId, "sync-run-cancelled", { stage: "preview-dismissed", result: "cancelled" });
    this.endDiagnosticRun(diagnosticRunId);
  }
  runAutomatic(trigger) {
    this.queueAutomaticTrigger(trigger);
    const drain = this.automaticDrain ?? this.startAutomaticDrain();
    return this.awaitAutomaticQuiescence(drain);
  }
  queueAutomaticTrigger(trigger) {
    if (!this.pendingAutomaticTrigger || AUTOMATIC_TRIGGER_PRIORITY[trigger] > AUTOMATIC_TRIGGER_PRIORITY[this.pendingAutomaticTrigger]) this.pendingAutomaticTrigger = trigger;
  }
  startAutomaticDrain() {
    const drain = Promise.resolve().then(() => this.drainAutomaticRuns());
    this.automaticDrain = drain;
    void drain.finally(() => {
      if (this.automaticDrain !== drain) return;
      this.automaticDrain = void 0;
      if (this.pendingAutomaticTrigger) this.startAutomaticDrain();
    }).catch(() => void 0);
    return drain;
  }
  async awaitAutomaticQuiescence(initial) {
    let drain = initial;
    while (drain) {
      await drain;
      drain = this.automaticDrain;
    }
  }
  async drainAutomaticRuns() {
    while (this.pendingAutomaticTrigger) {
      const trigger = this.pendingAutomaticTrigger;
      this.pendingAutomaticTrigger = void 0;
      await this.runAutomaticLifecycle(trigger);
    }
  }
  async runAutomaticLifecycle(trigger) {
    const runId = this.options.diagnostics?.beginSyncRun(`automatic:${trigger}`);
    this.syncInfo(runId, "automatic-sync-attempt-started", { trigger, stage: "automatic-entry" });
    if (this.options.recoveryActive?.()) {
      this.setStatus({ kind: "recovery-required", reason: "recovery reconstruction is incomplete" });
      this.syncInfo(runId, "sync-run-globally-blocked", { stage: "automatic-precondition", trigger, result: "globally-blocked", classification: "recovery-active" });
      this.endDiagnosticRun(runId);
      return;
    }
    const plan = await this.createPlan(trigger, false, false, runId);
    if (!plan) return;
    const planned = this.planned;
    if (!planned || planned.plan.planId !== plan.planId) {
      this.syncInfo(runId, "sync-run-globally-blocked", { stage: "execution-authority", trigger, result: "globally-blocked", classification: "automatic-plan-not-current" });
      this.endDiagnosticRun(runId);
      return;
    }
    if (planned.assembly.reconstruction || globalExecutionGate(plan) !== "none") {
      this.syncInfo(runId, "sync-run-globally-blocked", { stage: "execution-authority", trigger, result: "globally-blocked", classification: globalExecutionGate(plan) });
      this.endDiagnosticRun(runId);
      return;
    }
    const gate = this.options.automaticExecutionAllowed?.(plan) ?? { allowed: true };
    if (!gate.allowed) {
      this.setStatus({ kind: "offline-deferred", reason: gate.reason ?? "automatic synchronization deferred by device policy" });
      this.syncInfo(runId, "sync-run-deferred", { stage: "automatic-policy", trigger, result: "deferred" });
      this.endDiagnosticRun(runId);
      return;
    }
    await this.executePlanned(false, void 0, runId, planned);
  }
  async request(action) {
    return this.requestWithDiagnosticRun(action);
  }
  async requestPreviewAction(action, diagnosticRunId) {
    return this.requestWithDiagnosticRun(action, diagnosticRunId);
  }
  async requestWithDiagnosticRun(action, diagnosticRunId) {
    switch (action.kind) {
      case "pause":
        this.runs.pause();
        this.setStatus({ kind: "paused" });
        return { status: "accepted" };
      case "resume":
        this.runs.resume();
        this.setStatus(this.options.recoveryActive?.() ? { kind: "recovery-required", reason: "recovery reconstruction is incomplete" } : { kind: "idle-ready" });
        return { status: "accepted" };
      case "cancel-active-sync":
        this.runs.requestCancellation();
        await this.audit("sync-cancelled");
        return { status: "accepted" };
      case "verify-reconcile-vault":
        await this.previewVerifyReconcile();
        return { status: "accepted" };
      case "execute-plan": {
        const runId = diagnosticRunId ?? this.planned?.diagnosticRunId;
        if (!this.planned || this.planned.plan.planId !== action.planId) return this.rejectExecute("plan is stale or no longer current", "stale-plan", runId);
        if (!this.planned.reviewed) return this.rejectExecute("manual plan has not been reviewed", "unreviewed-plan", runId);
        if (this.planned.plan.recoveryCheckpointRequired) return this.rejectExecute("destructive plan requires exact checkpoint approval", "checkpoint-approval-required", runId);
        const outcome = await this.executePlanned(true, void 0, runId);
        return outcome !== "failed" ? { status: "accepted" } : this.rejectExecute("reviewed plan failed before safe progress could complete", "execution-failed", runId);
      }
      case "approve-destructive-plan": {
        const runId = diagnosticRunId ?? this.planned?.diagnosticRunId;
        if (!this.planned || this.planned.plan.planId !== action.planId) return this.rejectExecute("destructive plan is stale", "stale-destructive-plan", runId);
        if (!this.planned.checkpointId || this.planned.checkpointId !== action.recoveryCheckpointId) return this.rejectExecute("approval is not tied to the current recovery checkpoint", "checkpoint-mismatch", runId);
        await this.audit("destructive-plan-approved", { planId: action.planId });
        const outcome = await this.executePlanned(true, action.recoveryCheckpointId, runId);
        return outcome !== "failed" ? { status: "accepted" } : this.rejectExecute("approved destructive plan failed", "execution-failed", runId);
      }
      case "resolve-conflict":
        return this.resolveConflict(action.conflictId, action.resolution);
    }
  }
  async resolveWithCurrentLocal(id) {
    const assessment = this.conflictRegistry.get(String(id));
    if (!assessment || assessment.kind === "none") return { status: "rejected", reason: "conflict is stale or unavailable" };
    const version = await this.options.executor.currentLocalVersion(assessment.path);
    if (!version || version.entityKind !== "file") return { status: "rejected", reason: "a stable current local file is required for manual resolution" };
    return this.resolveConflict(id, { kind: "manual", resolvedVersion: version });
  }
  async createPlan(trigger, full, reviewed, diagnosticRunId) {
    if (this.runs.isPaused()) {
      this.setStatus({ kind: "paused" });
      this.syncInfo(diagnosticRunId, "sync-run-deferred", { stage: "planning-precondition", result: "paused" });
      this.endDiagnosticRun(diagnosticRunId);
      return void 0;
    }
    this.setStatus({ kind: "planning", trigger });
    this.syncInfo(diagnosticRunId, "planning-start", { stage: "planning", trigger, runMode: full ? "full" : "incremental-preferred" });
    try {
      let assembly;
      if (this.options.recoveryActive?.()) {
        assembly = await this.options.snapshotAssembler.assembleRecovery("persisted recovery gate", diagnosticRunId);
      } else {
        assembly = full ? await this.options.snapshotAssembler.assembleFull(diagnosticRunId) : await this.options.snapshotAssembler.assemble(true, diagnosticRunId);
        if (assembly.input.state.status === "recovery-required") {
          await this.options.onRecoveryGateChanged?.(true);
          await this.audit("recovery-entered", { reasonCode: assembly.input.state.reason });
          assembly = await this.options.snapshotAssembler.assembleRecovery(assembly.input.state.detail ?? assembly.input.state.reason, diagnosticRunId);
        }
      }
      this.syncDebug(diagnosticRunId, "planning-input-assembled", { stage: "planning-input", runMode: assembly.mode, stateStatus: assembly.input.state.status, snapshotCount: assembly.input.snapshots.length, remoteCompleteness: assembly.remoteEnumeration.status, reconstruction: Boolean(assembly.reconstruction), cursorPresent: Boolean(assembly.nextCursor) });
      this.syncTrace(diagnosticRunId, "planner-start", { stage: "planning" });
      const plan = await this.options.plannerForTrigger(trigger).plan(assembly.input);
      this.syncTrace(diagnosticRunId, "planning-complete", { stage: "planning", operationCount: plan.operations.length, planDisposition: plan.executionDisposition, attentionCount: attentionOperations(plan).length });
      await this.refreshConflicts(plan, assembly);
      let checkpointId;
      if (plan.recoveryCheckpointRequired && !assembly.reconstruction) {
        const backup = await this.options.stateStore.createRecoveryBackup();
        checkpointId = cid2(backup.backupId);
      }
      let attentionPersistenceFailed = false;
      if (!await this.recordAttentionEntries(attentionOperations(plan).map((operation) => this.attentionFor(operation, plan, diagnosticRunId)))) attentionPersistenceFailed = true;
      this.planned = { plan, assembly, checkpointId, reviewed, diagnosticRunId, attentionPersistenceFailed };
      await this.audit("plan-created", { planId: plan.planId, count: plan.operations.length });
      this.surface = { ...this.surface, planPreview: plan, conflicts: [...this.conflictRegistry.values()].filter((value2) => value2.kind !== "clean-merge") };
      if (assembly.reconstruction) this.setStatus({ kind: "recovery-required", reason: "review and execute this non-destructive reconstruction before recovery can complete" });
      else if (plan.operations.some((operation) => operation.kind === "recovery-required")) this.setStatus({ kind: "recovery-required", reason: "synchronization state or remote relationship requires recovery" });
      else if (this.surface.conflicts.length && !plan.operations.some((operation) => !["blocked-unsafe", "unresolved-conflict"].includes(operation.kind))) this.setStatus({ kind: "conflict-present", conflictCount: this.surface.conflicts.length });
      else if (plan.recoveryCheckpointRequired) this.setStatus({ kind: "destructive-plan-blocked", planId: plan.planId });
      else if (attentionOperations(plan).length) this.setStatus({ kind: "attention-required", attentionCount: attentionOperations(plan).length, attentionIdentity: await this.attentionIdentityFor(plan, !attentionPersistenceFailed), conflictCount: this.surface.conflicts.length, safeOperationsCommitted: 0, phase: "planned", ledgerAvailable: !attentionPersistenceFailed });
      else this.setStatus({ kind: "idle-ready" });
      this.syncInfo(diagnosticRunId, "plan-preview-preparation-start", { stage: "preview-prepared", ...planDiagnosticFields(plan, assembly) });
      return plan;
    } catch (error) {
      this.mapPlanningError(error);
      if (diagnosticRunId !== void 0) this.options.diagnostics?.syncFailure("sync.plan", "sync-run-failed", diagnosticRunId, error, { stage: "planning", classification: "planning-failure", result: "failed" });
      this.endDiagnosticRun(diagnosticRunId);
      return void 0;
    }
  }
  async refreshConflicts(plan, assembly) {
    const fresh = /* @__PURE__ */ new Map();
    for (const operation of plan.operations) {
      if (operation.kind !== "unresolved-conflict" && operation.kind !== "clean-text-merge") continue;
      const snapshot = assembly.input.snapshots.find((candidate) => candidate.path === operation.path);
      if (!snapshot) continue;
      const assessment = await this.options.conflictResolver.assess(snapshot.path, baseVersion(snapshot), observedVersion(snapshot, "local"), observedVersion(snapshot, "remote"));
      const key = assessmentKey(assessment);
      if (key) fresh.set(String(key), assessment);
      if (assessment.kind !== "none" && assessment.kind !== "clean-merge") await this.audit("conflict-created", { path: assessment.path, reasonCode: assessment.kind });
    }
    this.conflictRegistry.clear();
    for (const [key, value2] of fresh) this.conflictRegistry.set(key, value2);
  }
  async executePlanned(userInitiated, approvedCheckpoint, diagnosticRunId, automaticPlanned) {
    const planned = automaticPlanned ?? this.planned;
    if (!planned) return "failed";
    if (!userInitiated && globalExecutionGate(planned.plan) !== "none") return "failed";
    if (globalExecutionGate(planned.plan) === "globally-blocked") return "failed";
    if (planned.plan.recoveryCheckpointRequired && approvedCheckpoint !== planned.checkpointId) return "failed";
    const runId = diagnosticRunId ?? planned.diagnosticRunId;
    this.syncInfo(runId, "execution-start", { stage: "execution", operationCount: planned.plan.operations.length, planDisposition: planned.plan.executionDisposition });
    let begun;
    try {
      begun = await this.runs.beginRun();
    } catch (error) {
      this.syncFailure(runId, "sync-run-failed", error, { stage: "run-lease", classification: "run-lease-acquisition-failure", result: "failed" });
      this.endDiagnosticRun(runId);
      throw error;
    }
    if (begun.status !== "started") {
      if (begun.status === "paused") this.setStatus({ kind: "paused" });
      this.syncInfo(runId, "sync-run-deferred", { stage: "run-lease", result: begun.status });
      this.endDiagnosticRun(runId);
      return "failed";
    }
    this.setStatus({ kind: "syncing", planId: planned.plan.planId });
    let outcome = "failed";
    let anyCommitted = false;
    let partial = false;
    let stageFailureReported = false;
    let committedCount = 0;
    let skippedCount = 0;
    const skippedOperations = [...attentionOperations(planned.plan)];
    const skippedReasonCodes = /* @__PURE__ */ new Set();
    try {
      await this.ensureTrustedState(planned.assembly);
      this.runEvidence = { managedRemote: planned.assembly.managedRemote, remoteEnumerationComplete: planned.assembly.remoteEnumeration.status === "complete" };
      const operationIndexes = new Map(planned.plan.operations.map((operation, index) => [String(operation.operationId), index + 1]));
      let needsReplan = false;
      let globalFailure = false;
      const authorityStore = this.options.authorityStore;
      const v1_3Dependencies = this.options.executor.recoverableProductionMutationDependencies;
      const v1_3Capture = {};
      const v1_3OperationalCapture = {};
      const capturedV1_3Dependencies = v1_3Dependencies ? capturingMutationDependenciesV1_3(v1_3Dependencies, v1_3OperationalCapture) : void 0;
      const v1_3Executor = authorityStore && capturedV1_3Dependencies ? createAuthoritativeProductExecutorV1_3(this.options.executor, authorityStore, this.options.stateStore, this.options.stateContext, planned.assembly.managedRemote, capturedV1_3Dependencies) : void 0;
      const coordinatorExecutor = v1_3Executor ? {
        validatePreconditions: (operation) => v1_3Executor.validatePreconditions(operation),
        execute: async (operation) => {
          const exact = await v1_3Executor.execute(operation);
          v1_3Capture.result = exact;
          return predecessorExecutionResult(exact);
        }
      } : void 0;
      const coordinator = authorityStore && coordinatorExecutor ? new AuthorityCompleteExecutionCoordinator(
        authorityStore,
        coordinatorExecutor,
        new StateCommitCoordinator(this.options.stateStore, this.options.stateContext),
        this.options.stateStore,
        this.options.stateContext
      ) : void 0;
      if (!coordinator) {
        this.setStatus({ kind: "recovery-required", reason: "V1.3 authoritative synchronization execution dependencies are unavailable; ordinary mutation is disabled" });
        this.syncError(runId, "authority-complete-execution-unavailable", { stage: "execution-authority", classification: "authoritative-store-unavailable", result: "blocked" });
        globalFailure = true;
      }
      for (const operation of planned.plan.operations) {
        if (globalFailure || !coordinator) break;
        if (!this.runs.canStartNextOperation()) {
          partial = true;
          break;
        }
        if (operation.kind === "unresolved-conflict" || operation.kind === "blocked-unsafe") {
          partial = true;
          skippedCount += 1;
          for (const reason of operation.reasons) skippedReasonCodes.add(reason.code);
          continue;
        }
        if (operation.kind === "recovery-required") {
          globalFailure = true;
          break;
        }
        if (operation.destructive && planned.plan.recoveryCheckpointRequired && !approvedCheckpoint) {
          partial = true;
          continue;
        }
        if (dependsOnSkippedOperation(operation, skippedOperations)) {
          partial = true;
          skippedCount += 1;
          skippedOperations.push(operation);
          skippedReasonCodes.add("dependency-on-skipped-operation");
          if (!await this.recordAttentionEntries([this.attentionFor(operation, planned.plan, runId, "dependency-on-skipped-operation", "Operation depends on a path that was skipped earlier in this plan.")])) planned.attentionPersistenceFailed = true;
          continue;
        }
        this.recordExecutionStage(runId, operation, operationIndexes.get(String(operation.operationId)) ?? 0, "operation-start");
        this.recordExecutionStage(runId, operation, operationIndexes.get(String(operation.operationId)) ?? 0, "operation-precondition-validation-start");
        delete v1_3Capture.result;
        delete v1_3OperationalCapture.failure;
        const result = await coordinator.executeOperation(operation);
        this.recordExecutionStage(runId, operation, operationIndexes.get(String(operation.operationId)) ?? 0, result.status === "committed" ? "operation-complete" : "operation-precondition-validation-failed", result.status);
        if (result.status === "committed") {
          anyCommitted = true;
          committedCount += 1;
          await this.audit(operation.kind.startsWith("trash-") ? "trash-action" : "operation-completed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path });
          if (!await this.resolveAttentionFor(operation)) planned.attentionPersistenceFailed = true;
          continue;
        }
        await this.audit("operation-failed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path, reasonCode: result.status });
        const capturedV1_3 = readCapturedExecutionResult(v1_3Capture);
        const capturedOperationalFailure = readCapturedOperationalFailureV1_3(v1_3OperationalCapture);
        const exactV1_3 = capturedV1_3?.status === "uncertain" && capturedOperationalFailure ? { ...capturedV1_3, operationalFailure: capturedOperationalFailure } : capturedV1_3;
        if (exactV1_3 && exactV1_3.status !== "durable-verified-success") {
          const disposition = executionDispositionV1_3(exactV1_3);
          const surfaceReason = operationalSurfaceReasonV1_3(exactV1_3);
          if (disposition.primary === "authentication-required") {
            this.setStatus({ kind: "authentication-required", reason: surfaceReason ?? "authorization-required" });
            globalFailure = true;
            break;
          }
          if (disposition.primary === "deferred") {
            this.setStatus({ kind: "offline-deferred", reason: surfaceReason ?? "remote synchronization deferred" });
            globalFailure = true;
            break;
          }
          if (disposition.primary === "recovery-required") {
            this.setStatus({ kind: "recovery-required", reason: exactV1_3.reason ?? "physical reconciliation is required" });
            globalFailure = true;
            break;
          }
          if (disposition.primary === "blocking-failure") {
            this.setStatus({ kind: "error", code: "operation-blocked", message: exactV1_3.reason ?? "operation blocked" });
            globalFailure = true;
            break;
          }
        }
        if (result.status === "blocked") {
          const auth = authenticationReason(result.reason);
          if (auth) {
            this.setStatus({ kind: "authentication-required", reason: auth });
            globalFailure = true;
            break;
          }
          if (this.options.executor.failureScope(operation, result.reason) === "path") {
            partial = true;
            skippedCount += 1;
            skippedOperations.push(operation);
            skippedReasonCodes.add("runtime-path-blocked");
            if (!await this.recordAttentionEntries([this.attentionFor(operation, planned.plan, runId, "runtime-path-blocked", result.reason.replace(/^path-local:/, ""))])) planned.attentionPersistenceFailed = true;
            continue;
          }
        }
        if (result.status === "stale-precondition") {
          partial = true;
          skippedCount += 1;
          skippedOperations.push(operation);
          skippedReasonCodes.add("runtime-stale-precondition");
          if (!await this.recordAttentionEntries([this.attentionFor(operation, planned.plan, runId, "runtime-stale-precondition", result.reason)])) planned.attentionPersistenceFailed = true;
          continue;
        }
        if (result.status === "stale-state") {
          needsReplan = true;
          globalFailure = true;
          this.runs.noteLocalOrRemoteChangeDuringRun();
          break;
        }
        if (result.status === "recovery-required" || result.status === "uncertain") {
          this.setStatus({ kind: "recovery-required", reason: result.reason });
          globalFailure = true;
          break;
        }
        if (result.status === "retryable-failure") {
          this.setStatus({ kind: "offline-deferred", reason: result.reason });
          globalFailure = true;
          break;
        }
        if (result.status === "blocked") {
          this.setStatus({ kind: "error", code: "operation-blocked", message: result.reason });
          globalFailure = true;
          break;
        }
        partial = true;
        break;
      }
      if (!globalFailure && !needsReplan && !partial) {
        const cursorCommitted = planned.assembly.nextCursor ? await this.commitCursor(planned.assembly.nextCursor) : true;
        if (cursorCommitted) {
          const trusted = await this.options.stateStore.load(this.options.stateContext);
          if (trusted.status === "trusted") {
            outcome = "complete";
            const completeReviewedRecovery = Boolean(planned.assembly.reconstruction && planned.reviewed && planned.assembly.nextCursor);
            if (completeReviewedRecovery) {
              await this.options.onRecoveryGateChanged?.(false);
              await this.audit("recovery-completed");
            }
            if (planned.assembly.mode === "full" && planned.assembly.nextCursor) await this.options.onFullReconciliationCompleted?.();
            if (planned.reviewed) await this.options.onTrustedBaselineEstablished?.();
          }
        }
      } else if (!globalFailure && (partial || anyCommitted)) {
        outcome = "partial";
        const conflicts = this.surface.conflicts.length;
        const attentionCount = Math.max(skippedCount, attentionOperations(planned.plan).length);
        if (planned.assembly.reconstruction || this.options.recoveryActive?.()) this.setStatus({ kind: "recovery-required", reason: "reconstruction remains incomplete; destructive authority remains disabled" });
        else this.setStatus({ kind: "attention-required", attentionCount: attentionCount || 1, attentionIdentity: await this.attentionIdentityFor(planned.plan, !planned.attentionPersistenceFailed), conflictCount: conflicts, safeOperationsCommitted: committedCount, phase: "completed", ledgerAvailable: !planned.attentionPersistenceFailed });
      } else if (!globalFailure && planned.attentionPersistenceFailed) {
        this.setStatus({ kind: "attention-required", attentionCount: 0, attentionIdentity: await this.attentionIdentityFor(planned.plan, false), conflictCount: 0, safeOperationsCommitted: committedCount, phase: "completed", ledgerAvailable: false });
      }
    } catch (error) {
      if (!stageFailureReported) this.syncFailure(runId, "sync-run-failed", error, { stage: "execution", classification: "execution-failure", result: "failed" });
      throw error;
    } finally {
      const cancelled5 = this.runs.isCancellationRequested();
      this.runEvidence = void 0;
      try {
        const finished = await this.runs.finishRun();
        if (finished.reconcileAgain && !this.options.recoveryActive?.()) void this.runAutomatic("local-change");
        else if (this.surface.status.kind === "syncing") this.setStatus(this.options.recoveryActive?.() ? { kind: "recovery-required", reason: "recovery reconstruction is incomplete" } : { kind: "idle-ready" });
      } catch (error) {
        this.syncFailure(runId, "sync-run-failed", error, { stage: "run-lease-release", classification: "run-lease-release-failure", result: "failed" });
        throw error;
      } finally {
        this.syncInfo(runId, cancelled5 ? "sync-run-cancelled" : outcome === "failed" ? "sync-run-failed" : "sync-run-complete", { stage: "terminal", result: cancelled5 ? "cancelled" : outcome, safeCommittedCount: committedCount, skippedCount, attentionReasonCodes: [...skippedReasonCodes].sort().join(","), ...planDiagnosticFields(planned.plan, planned.assembly) });
        this.endDiagnosticRun(runId);
      }
    }
    return outcome;
  }
  async resolveConflict(id, resolution) {
    const assessment = this.conflictRegistry.get(String(id));
    const current = this.planned;
    if (!assessment || assessment.kind === "none" || !current) return { status: "rejected", reason: "conflict is stale or no longer present in the current plan" };
    if (!await this.assessmentStillCurrent(assessment, current.assembly)) {
      await this.createPlan("manual", true, true);
      return { status: "rejected", reason: "conflict evidence changed; a fresh plan is required before resolution" };
    }
    const operations = await this.resolutionOperations(id, assessment, resolution);
    if (!operations.length) return { status: "rejected", reason: "requested conflict resolution is not applicable to the current preserved versions" };
    const executionDisposition = "requires-user-approval";
    const recoveryCheckpointRequired = false;
    const resolutionPlan = {
      planId: semanticPlanId({ trigger: "manual", operations, executionDisposition, recoveryCheckpointRequired, globalExecutionGate: "none" }),
      trigger: "manual",
      operations,
      executionDisposition,
      recoveryCheckpointRequired,
      globalExecutionGate: "none"
    };
    const resolutionAssembly = { ...current.assembly, nextCursor: void 0, reconstruction: false };
    this.planned = { plan: resolutionPlan, assembly: resolutionAssembly, reviewed: false, attentionPersistenceFailed: false };
    if (await this.executePlanned(true) !== "complete") return { status: "rejected", reason: "conflict resolution did not complete authoritatively" };
    this.conflictRegistry.delete(String(id));
    this.surface = { ...this.surface, conflicts: [...this.conflictRegistry.values()].filter((value2) => value2.kind !== "clean-merge") };
    await this.audit("conflict-resolved", { path: assessment.path, reasonCode: resolution.kind });
    if (this.options.recoveryActive?.()) this.setStatus({ kind: "recovery-required", reason: "conflict resolution was preserved; run a fresh reviewed Verify/Reconcile before recovery can complete" });
    else {
      const currentAttention = await this.options.attentionLedger?.current() ?? [];
      this.setStatus(currentAttention.length ? { kind: "attention-required", attentionCount: currentAttention.length, attentionIdentity: await this.attentionIdentityFor(current.plan), conflictCount: this.surface.conflicts.length, safeOperationsCommitted: operations.length, phase: "completed", ledgerAvailable: true } : this.surface.conflicts.length ? { kind: "conflict-present", conflictCount: this.surface.conflicts.length } : { kind: "idle-ready" });
    }
    return { status: "accepted" };
  }
  async assessmentStillCurrent(assessment, assembly) {
    if (assessment.kind === "clean-merge") return await this.options.executor.versionStillCurrent("local", assessment.provenance.local.version, assembly.managedRemote) && await this.options.executor.versionStillCurrent("remote", assessment.provenance.remote.version, assembly.managedRemote);
    if (assessment.kind === "delete-vs-modify") return this.options.executor.versionStillCurrent(assessment.modifiedSide, assessment.modifiedVersion.version, assembly.managedRemote);
    return await this.options.executor.versionStillCurrent("local", assessment.preserved.local.version, assembly.managedRemote) && await this.options.executor.versionStillCurrent("remote", assessment.preserved.remote.version, assembly.managedRemote);
  }
  operation(index, intent) {
    return withSemanticOperationId(intent, index);
  }
  async freeConflictPath(path2, provenance2) {
    const base = conflictCopyBase(path2, provenance2);
    for (let number = 1; number <= 999; number += 1) {
      const candidate = numbered(base, number);
      const state = await this.options.executor.localPathState(candidate);
      if (state === "absent") return candidate;
      if (state === "blocked") throw new Error(`conflict copy path cannot be safely inspected: ${String(candidate)}`);
    }
    throw new Error("unable to allocate a collision-free conflict-copy path");
  }
  async resolutionOperations(_id, assessment, resolution) {
    const path2 = assessment.path;
    if (assessment.kind === "clean-merge") {
      if (resolution.kind !== "accept-clean-merge") return [];
      const remote2 = assessment.provenance.remote.version;
      return [this.operation(0, {
        kind: "clean-text-merge",
        path: path2,
        remoteObjectId: remote2.remoteObjectId,
        contentVersion: assessment.mergedVersion,
        destructive: false,
        preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path: path2 }, ...localExact(assessment.provenance.local.version), ...remoteExact(remote2)],
        reasons: [{ code: "user-accept-clean-merge", summary: "User accepted the exact materialized clean merge." }]
      })];
    }
    if (assessment.kind === "delete-vs-modify") {
      const modified = assessment.modifiedVersion.version;
      if (assessment.modifiedSide === "local" && (resolution.kind === "keep-local" || resolution.kind === "keep-both" || resolution.kind === "manual")) {
        const chosen = resolution.kind === "manual" ? resolution.resolvedVersion : modified;
        return [this.operation(0, {
          kind: "upload-create",
          path: path2,
          targetSide: "remote",
          contentVersion: chosen,
          destructive: false,
          preconditions: [{ kind: "path-observation", side: "remote", path: path2, expected: "absent" }, ...localExact(chosen), { kind: "file-stable", path: chosen.path }],
          reasons: [{ code: "user-preserve-modified", summary: "Preserve the exact local modified version over the deletion." }]
        })];
      }
      if (assessment.modifiedSide === "remote" && (resolution.kind === "keep-remote" || resolution.kind === "keep-both")) return [this.operation(0, {
        kind: "download-create",
        path: path2,
        targetSide: "local",
        contentVersion: modified,
        remoteObjectId: modified.remoteObjectId,
        destructive: false,
        preconditions: [{ kind: "path-observation", side: "local", path: path2, expected: "absent" }, ...remoteExact(modified)],
        reasons: [{ code: "user-preserve-modified", summary: "Preserve the exact remote modified version over the deletion." }]
      })];
      if (assessment.modifiedSide === "local" && resolution.kind === "keep-remote") return [this.operation(0, {
        kind: "trash-local",
        path: path2,
        targetSide: "local",
        destructive: true,
        preconditions: [{ kind: "base-trusted" }, ...localExact(modified)],
        reasons: [{ code: "user-keep-deletion", summary: "User chose the remote deletion after exact-version revalidation." }]
      })];
      if (assessment.modifiedSide === "remote" && resolution.kind === "keep-local") return [this.operation(0, {
        kind: "trash-remote",
        path: path2,
        targetSide: "remote",
        remoteObjectId: modified.remoteObjectId,
        destructive: true,
        preconditions: [{ kind: "base-trusted" }, ...remoteExact(modified)],
        reasons: [{ code: "user-keep-deletion", summary: "User chose the local deletion after exact-version revalidation." }]
      })];
      return [];
    }
    const local = assessment.preserved.local.version;
    const remote = assessment.preserved.remote.version;
    const remoteId = remote.remoteObjectId;
    if (!remoteId) return [];
    const keepLocal = this.operation(1, {
      kind: "upload-update",
      path: path2,
      targetSide: "remote",
      remoteObjectId: remoteId,
      contentVersion: local,
      destructive: false,
      preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path: path2 }, ...localExact(local), ...remoteExact(remote), { kind: "file-stable", path: local.path }],
      reasons: [{ code: "user-keep-local", summary: "User selected the exact preserved local version." }]
    });
    if (resolution.kind === "keep-local") return [keepLocal];
    if (resolution.kind === "keep-remote") return [this.operation(0, {
      kind: "download-update",
      path: path2,
      targetSide: "local",
      remoteObjectId: remoteId,
      contentVersion: remote,
      destructive: false,
      preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path: path2 }, ...localExact(local), ...remoteExact(remote)],
      reasons: [{ code: "user-keep-remote", summary: "User selected the exact preserved remote version." }]
    })];
    if (resolution.kind === "keep-both") {
      const copy = await this.freeConflictPath(path2, assessment.preserved.remote);
      return [this.operation(0, {
        kind: "download-create",
        path: copy,
        targetSide: "local",
        remoteObjectId: remoteId,
        contentVersion: remote,
        destructive: false,
        preconditions: [{ kind: "path-observation", side: "local", path: copy, expected: "absent" }, ...remoteExact(remote)],
        reasons: [{ code: "user-keep-both-copy", summary: "Preserve the attributable remote alternate without overwriting an existing conflict copy." }]
      }), keepLocal];
    }
    if (resolution.kind === "manual") {
      if (!await this.options.executor.versionStillCurrent("local", resolution.resolvedVersion, this.planned.assembly.managedRemote)) return [];
      return [this.operation(0, {
        kind: "upload-update",
        path: path2,
        targetSide: "remote",
        remoteObjectId: remoteId,
        contentVersion: resolution.resolvedVersion,
        destructive: false,
        preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path: path2 }, ...localExact(resolution.resolvedVersion), ...remoteExact(remote), { kind: "file-stable", path: resolution.resolvedVersion.path }],
        reasons: [{ code: "user-manual-resolution", summary: "Use the exact current local file as manual resolution." }]
      })];
    }
    return [];
  }
  async ensureTrustedState(assembly) {
    const persisted = await this.options.stateStore.load(this.options.stateContext);
    if (persisted.status === "trusted") return;
    if (assembly.reconstruction) {
      if (persisted.status !== "recovery-required") throw new Error("recovery replacement requires an objectively recovery-required source");
      const initial2 = createInitialTrustedState({ stateRevision: cid2("state:recovery:0"), vaultIdentity: this.options.vaultIdentity, deviceIdentity: this.options.deviceIdentity });
      const replaced = await this.options.stateStore.replaceRecoveryState(initial2, this.options.stateContext);
      if (replaced.status !== "replaced") throw new Error(`recovery state replacement refused: ${replaced.reason}`);
      await this.options.onRecoveryGateChanged?.(true, replaced.backup.backupId);
      await this.audit("recovery-entered", { reasonCode: assembly.recoveryReason ?? persisted.reason });
      return;
    }
    if (persisted.status === "recovery-required") throw new Error("cannot initialize trusted state while persisted state requires recovery");
    const initial = createInitialTrustedState({ stateRevision: cid2("state:0"), vaultIdentity: this.options.vaultIdentity, deviceIdentity: this.options.deviceIdentity });
    const saved = await this.options.stateStore.saveTrusted(initial);
    if (saved.status !== "saved") throw new Error(`unable to establish initial trusted state: ${saved.status}`);
  }
  async commitCursor(cursor2) {
    if (!cursor2) return true;
    const loaded = await this.options.stateStore.load(this.options.stateContext);
    if (loaded.status !== "trusted") return false;
    const current = String(loaded.state.stateRevision);
    const match = /^(.*?)(\d+)$/.exec(current);
    const next = cid2(match ? `${match[1]}${Number(match[2]) + 1}` : `${current}:1`);
    const saved = await this.options.stateStore.saveTrusted({ ...loaded.state, stateRevision: next, changeCursor: cursor2 }, loaded.state.stateRevision);
    if (saved.status !== "saved") {
      this.setStatus({ kind: "recovery-required", reason: "incremental Drive cursor could not be committed atomically" });
      return false;
    }
    return true;
  }
  mapPlanningError(error) {
    if (error instanceof SnapshotAssemblyError) {
      if (error.code === "authentication-required") this.setStatus({ kind: "authentication-required", reason: error.message });
      else if (error.code === "transient-failure" || error.code === "rate-limited") this.setStatus({ kind: "offline-deferred", reason: error.message });
      else if (["missing-root", "identity-mismatch", "incompatible-protocol", "ambiguous", "recovery-required", "not-found"].includes(error.code)) this.setStatus({ kind: "recovery-required", reason: error.message });
      else this.setStatus({ kind: "error", code: error.code, message: error.message });
      return;
    }
    this.setStatus({ kind: "error", code: "planning-failed", message: error instanceof Error ? error.message : String(error) });
  }
  recordExecutionStage(runId, operation, operationIndex, stage, result, error, failedPreconditions) {
    const failure = executionFailureBoundary(stage);
    const failedFields2 = failedPreconditions?.length ? {
      failedPreconditionCount: failedPreconditions.length,
      failedPreconditionKinds: [...new Set(failedPreconditions.map((precondition) => precondition.kind))].sort().join(","),
      failedPreconditionSides: [...new Set(failedPreconditions.map((precondition) => {
        if ("side" in precondition) return precondition.side;
        if (precondition.kind === "file-stable") return "local";
        if (precondition.kind === "remote-object" || precondition.kind === "remote-enumeration-complete") return "remote";
        if (precondition.kind === "base-trusted" || precondition.kind === "base-authority") return "state";
        return "identity";
      }))].sort().join(",")
    } : {};
    this.syncTrace(runId, stage, {
      stage,
      operationIndex,
      operationKind: operation.kind,
      direction: operation.kind.startsWith("upload-") ? "local-to-remote" : operation.kind.startsWith("download-") ? "remote-to-local" : operation.targetSide ?? "none",
      preconditionCount: operation.preconditions.length,
      destructiveCount: operation.destructive ? 1 : 0,
      ...failedFields2,
      ...result ? { result } : {}
    });
    if (!failure) return false;
    const fields = {
      stage: failure.stage,
      classification: failure.classification,
      operationIndex,
      operationKind: operation.kind,
      direction: operation.kind.startsWith("upload-") ? "local-to-remote" : operation.kind.startsWith("download-") ? "remote-to-local" : operation.targetSide ?? "none",
      ...failedFields2,
      ...result ? { result } : {}
    };
    if (error !== void 0) this.syncFailure(runId, stage, error, fields);
    else this.syncError(runId, stage, fields);
    return true;
  }
  attentionFor(operation, plan, runId, reasonCode, humanReason) {
    const reason = operation.reasons[0];
    return {
      runId,
      trigger: plan.trigger,
      path: operation.path,
      category: operation.kind,
      reasonCode: reasonCode ?? reason?.code ?? operation.kind,
      humanReason: humanReason ?? reason?.summary ?? "The operation could not be safely executed for this path."
    };
  }
  async attentionIdentityFor(plan, ledgerReliable = true) {
    try {
      if (ledgerReliable && this.options.attentionLedger) return await this.options.attentionLedger.currentIdentity();
    } catch {
    }
    const identities = attentionOperations(plan).map((operation) => {
      const reason = operation.reasons[0];
      return [String(operation.path), operation.kind, reason?.code ?? operation.kind, reason?.summary ?? ""].join("\0");
    }).sort();
    return String(sha256Text(JSON.stringify(identities)));
  }
  async recordAttentionEntries(entries) {
    if (!entries.length || !this.options.attentionLedger) return true;
    try {
      await this.options.attentionLedger.recordSkipped(entries);
      return true;
    } catch {
      this.syncError(entries[0]?.runId, "attention-ledger-write-failed", { stage: "attention-ledger", classification: "attention-ledger-persistence-failure", result: "failed" });
      return false;
    }
  }
  async resolveAttentionFor(operation) {
    if (!this.options.attentionLedger) return true;
    try {
      const paths2 = new Set([operation.path, operation.fromPath, operation.toPath].filter((path2) => path2 !== void 0));
      for (const path2 of paths2) await this.options.attentionLedger.resolvePath(path2);
      return true;
    } catch {
      this.syncError(this.planned?.diagnosticRunId, "attention-ledger-write-failed", { stage: "attention-ledger", classification: "attention-ledger-persistence-failure", result: "failed" });
      return false;
    }
  }
  syncInfo(runId, event, fields) {
    if (runId !== void 0) this.options.diagnostics?.syncInfo("sync.controller", event, runId, fields);
  }
  syncDebug(runId, event, fields) {
    if (runId !== void 0) this.options.diagnostics?.syncDebug("sync.plan", event, runId, fields);
  }
  syncTrace(runId, event, fields) {
    if (runId !== void 0) this.options.diagnostics?.syncTrace("sync.execute", event, runId, fields);
  }
  syncError(runId, event, fields) {
    if (runId !== void 0) this.options.diagnostics?.syncError("sync.execute", event, runId, fields);
  }
  syncFailure(runId, event, error, fields) {
    if (runId !== void 0) this.options.diagnostics?.syncFailure("sync.execute", event, runId, error, fields);
  }
  rejectExecute(reason, classification, runId) {
    this.syncError(runId, "execute-request-rejected", { stage: "execute-request", classification, result: "rejected" });
    return { status: "rejected", reason };
  }
  endDiagnosticRun(runId) {
    if (runId === void 0) return;
    this.options.diagnostics?.endSyncRun(runId);
  }
  setStatus(status) {
    this.surface = { ...this.surface, status };
    for (const listener of this.listeners) listener(this.surface);
  }
  async audit(event, values = {}) {
    await this.options.audit.append({ id: auditId(), event, advisoryAtMs: Date.now(), ...values });
  }
};

// src/product/authority-execution-diagnostics.ts
function failureBoundary(stage) {
  switch (stage) {
    case "operation-precondition-validation-failed":
      return { stage: "operation-precondition-validation", classification: "operation-precondition-validation-failure" };
    case "pending-journal-failed":
      return { stage: "pending-journal", classification: "pending-journal-failure" };
    case "pending-journal-discard-failed":
      return { stage: "pending-journal-discard", classification: "pending-journal-discard-failure" };
    case "content-mutation-failed":
      return { stage: "content-mutation", classification: "content-mutation-failure" };
    case "uncertain-state-journal-failed":
      return { stage: "uncertain-state-journal", classification: "uncertain-state-journal-failure" };
    case "state-commit-failed":
      return { stage: "state-commit", classification: "state-commit-failure" };
    default:
      return void 0;
  }
}
function failedFields(failed) {
  if (!failed?.length) return {};
  return {
    failedPreconditionCount: failed.length,
    failedPreconditionKinds: [...new Set(failed.map((precondition) => precondition.kind))].sort().join(","),
    failedPreconditionSides: [...new Set(failed.map((precondition) => {
      if ("side" in precondition) return precondition.side;
      if (precondition.kind === "file-stable") return "local";
      if (precondition.kind === "remote-object" || precondition.kind === "remote-enumeration-complete") return "remote";
      if (precondition.kind === "base-trusted" || precondition.kind === "base-authority") return "state";
      return "identity";
    }))].sort().join(",")
  };
}
function authoritativeDiagnostics(logger) {
  if (!logger) return {};
  let runId;
  let operationIndex = 0;
  const proxied = new Proxy(logger, {
    get(target, property, receiver) {
      if (property === "syncTrace") {
        return (component, event, currentRunId, fields) => {
          if (component === "sync.execute" && event === "operation-start") {
            runId = currentRunId;
            operationIndex = typeof fields?.operationIndex === "number" ? fields.operationIndex : operationIndex;
          }
          return target.syncTrace(component, event, currentRunId, fields);
        };
      }
      const value2 = Reflect.get(target, property, receiver);
      return typeof value2 === "function" ? value2.bind(target) : value2;
    }
  });
  const observer = (operation, stage, result, error, failed) => {
    if (runId === void 0) return;
    if (stage === "operation-start" || stage === "operation-precondition-validation-start") return;
    const failure = failureBoundary(stage);
    const fields = {
      stage: failure?.stage ?? stage,
      operationIndex,
      operationKind: operation.kind,
      direction: operation.kind.startsWith("upload-") ? "local-to-remote" : operation.kind.startsWith("download-") ? "remote-to-local" : operation.targetSide ?? "none",
      preconditionCount: operation.preconditions.length,
      destructiveCount: operation.destructive ? 1 : 0,
      ...failedFields(failed),
      ...result ? { result } : {},
      ...failure ? { classification: failure.classification } : {}
    };
    logger.syncTrace("sync.execute", stage, runId, fields);
    if (!failure) return;
    if (error !== void 0) logger.syncFailure("sync.execute", stage, runId, error, fields);
    else logger.syncError("sync.execute", stage, runId, fields);
  };
  return { logger: proxied, observer };
}
function activeIntent(state, operation) {
  return state.operationIntents.find((intent) => intent.operationId === operation.operationId);
}
function classifyAuthorityPersistenceTransition(previous, candidate, operation) {
  if (!previous || !operation) return void 0;
  const priorIntent = activeIntent(previous, operation);
  const candidateIntent = activeIntent(candidate, operation);
  if (!priorIntent && candidateIntent?.effects.length && candidateIntent.effects.every((effect) => effect.stage === "intent-persisted")) {
    return "pending-journal-failed";
  }
  if (!priorIntent || !candidateIntent) return void 0;
  const priorEffects = new Map(priorIntent.effects.map((effect) => [effect.effectId, effect.stage]));
  if (candidateIntent.effects.some((effect) => effect.stage === "outcome-unknown" && priorEffects.has(effect.effectId) && priorEffects.get(effect.effectId) !== "outcome-unknown")) {
    return "uncertain-state-journal-failed";
  }
  return void 0;
}
function withExecutionLifecycleObserver(store, observer) {
  if (!observer) return store;
  let activeOperation;
  let previousTrustedAuthority;
  let classifiedFailure;
  const trackedObserver = (operation, stage, result, error, failed) => {
    if (stage === "operation-start") activeOperation = operation;
    observer(operation, stage, result, error, failed);
  };
  return {
    executionLifecycleObserver: trackedObserver,
    loadAuthority: async () => {
      const loaded = await store.loadAuthority();
      if (loaded.status === "trusted") previousTrustedAuthority = loaded.state;
      return loaded;
    },
    saveAuthority: async (state, expectedPersistenceRevision, expectedSemanticGeneration) => {
      const stage = classifyAuthorityPersistenceTransition(previousTrustedAuthority, state, activeOperation);
      try {
        return await store.saveAuthority(state, expectedPersistenceRevision, expectedSemanticGeneration);
      } catch (error) {
        if (stage) classifiedFailure = { error, stage };
        throw error;
      }
    },
    commitBaseTransition: (transition, expectedPersistenceRevision, expectedSemanticGeneration) => store.commitBaseTransition(transition, expectedPersistenceRevision, expectedSemanticGeneration),
    consumeAuthorityPersistenceFailureStage: (error) => {
      if (!classifiedFailure || !Object.is(classifiedFailure.error, error)) return void 0;
      const stage = classifiedFailure.stage;
      classifiedFailure = void 0;
      return stage;
    }
  };
}

// src/product/trusted-state-authority-store.ts
function sortedBy(values, key) {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}
function semanticGeneration(state) {
  const semantic = {
    base: sortedBy(state.base, (entry2) => String(entry2.path)).map((entry2) => ({
      path: String(entry2.path),
      entityKind: entry2.entityKind,
      localExisted: entry2.localExisted,
      remoteExisted: entry2.remoteExisted,
      content: entry2.content ? {
        hash: entry2.content.hash ? String(entry2.content.hash) : void 0,
        sizeBytes: entry2.content.sizeBytes,
        revision: entry2.content.revision
      } : void 0,
      remoteObjectId: entry2.remoteObjectId ? String(entry2.remoteObjectId) : void 0
    })),
    remoteMappings: sortedBy(state.remoteMappings, (entry2) => `${String(entry2.path)}\0${String(entry2.remoteObjectId)}`).map((entry2) => ({
      path: String(entry2.path),
      entityKind: entry2.entityKind,
      remoteObjectId: String(entry2.remoteObjectId)
    })),
    tombstones: sortedBy(state.tombstones, (entry2) => String(entry2.path)).map((entry2) => ({
      path: String(entry2.path),
      entityKind: entry2.entityKind,
      deletedOn: entry2.deletedOn,
      remoteObjectId: entry2.remoteObjectId ? String(entry2.remoteObjectId) : void 0,
      sourceDeviceId: String(entry2.sourceDeviceId)
    }))
  };
  return contractId(`semantic:${String(sha256Text(JSON.stringify(semantic)))}`);
}
function baseFingerprint(entry2) {
  const exact = {
    path: String(entry2.path),
    entityKind: entry2.entityKind,
    localExisted: entry2.localExisted,
    remoteExisted: entry2.remoteExisted,
    content: entry2.content ? {
      hash: entry2.content.hash ? String(entry2.content.hash) : void 0,
      sizeBytes: entry2.content.sizeBytes,
      revision: entry2.content.revision
    } : void 0,
    remoteObjectId: entry2.remoteObjectId ? String(entry2.remoteObjectId) : void 0
  };
  return contractId(`base:${String(sha256Text(JSON.stringify(exact)))}`);
}
function deriveAuthority(state) {
  const generation = semanticGeneration(state);
  return {
    persistenceRevision: state.stateRevision,
    semanticGeneration: generation,
    learnedRemoteBatches: [],
    pathConvergence: state.base.map((entry2) => ({
      path: entry2.path,
      state: { status: "converged", generation, baseFingerprint: baseFingerprint(entry2) }
    })),
    operationIntents: [],
    localTransactions: []
  };
}
function recoveryIssue(detail) {
  return [{ code: "other-semantic-inconsistency", detail, invariantCategory: "trusted-state-authority-bridge" }];
}
var TrustedStateSynchronizationAuthorityStore = class {
  constructor(stateStore, context) {
    this.stateStore = stateStore;
    this.context = context;
  }
  stateStore;
  context;
  async loadAuthority() {
    const loaded = await this.stateStore.load(this.context);
    if (loaded.status === "uninitialized") return { status: "uninitialized" };
    if (loaded.status === "recovery-required") {
      return { status: "recovery-required", issues: recoveryIssue(`trusted synchronization state requires recovery: ${loaded.reason}`) };
    }
    return { status: "trusted", state: deriveAuthority(loaded.state) };
  }
  async saveAuthority(_state, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") {
      return { status: "recovery-required", issues: loaded.status === "recovery-required" ? loaded.issues : recoveryIssue("trusted synchronization state is uninitialized") };
    }
    if (loaded.state.persistenceRevision !== expectedPersistenceRevision) {
      return { status: "stale-persistence", actualPersistenceRevision: loaded.state.persistenceRevision };
    }
    if (expectedSemanticGeneration && loaded.state.semanticGeneration !== expectedSemanticGeneration) {
      return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    }
    return {
      status: "recovery-required",
      issues: recoveryIssue("read-through trusted-state authority bridge is not a writable durable SynchronizationAuthorityStoreV1_1")
    };
  }
  async commitBaseTransition(_transition, expectedPersistenceRevision, expectedSemanticGeneration) {
    const loaded = await this.loadAuthority();
    if (loaded.status !== "trusted") {
      return { status: "recovery-required", issues: loaded.status === "recovery-required" ? loaded.issues : recoveryIssue("trusted synchronization state is uninitialized") };
    }
    if (loaded.state.persistenceRevision !== expectedPersistenceRevision) {
      return { status: "stale-persistence", actualPersistenceRevision: loaded.state.persistenceRevision };
    }
    if (loaded.state.semanticGeneration !== expectedSemanticGeneration) {
      return { status: "stale-semantic-authority", actualSemanticGeneration: loaded.state.semanticGeneration };
    }
    return { status: "recovery-required", issues: recoveryIssue("BASE transitions require the concrete writable authority persistence adapter; read-through bridge is read-only") };
  }
};

// src/product/product-controller.ts
function nextRevision2(current) {
  const raw = String(current);
  const match = /^(.*?)(\d+)$/.exec(raw);
  return contractId(match ? `${match[1]}${Number(match[2]) + 1}` : `${raw}:1`);
}
async function persistLearnedRemoteBatch(assembly, authorityStore, options) {
  const batch = assembly.remoteChangeBatch;
  if (!batch) return;
  const loaded = await authorityStore.loadAuthority();
  if (loaded.status !== "trusted") throw new SnapshotAssemblyError("recovery-required", "terminal REMOTE Changes batch cannot be learned without trusted writable synchronization authority");
  const existing = loaded.state.learnedRemoteBatches.find((value2) => value2.checkpoint.batchId === batch.checkpoint.batchId);
  if (!existing) {
    const candidate = {
      ...loaded.state,
      learnedRemoteBatches: appendDurableRemoteChangeBatch(loaded.state.learnedRemoteBatches, {
        ...batch,
        checkpoint: { ...batch.checkpoint, persistenceRevision: loaded.state.persistenceRevision }
      })
    };
    const saved = await authorityStore.saveAuthority(candidate, loaded.state.persistenceRevision, loaded.state.semanticGeneration);
    if (saved.status !== "saved") throw new SnapshotAssemblyError("recovery-required", `terminal REMOTE Changes batch was fully read but could not be durably learned (${saved.status})`);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await options.stateStore.load(options.stateContext);
    if (state.status !== "trusted") throw new SnapshotAssemblyError("recovery-required", "durable REMOTE batch exists but trusted canonical cursor state is unavailable");
    if (state.state.changeCursor === batch.checkpoint.terminalStartToken) return;
    const candidate = { ...state.state, stateRevision: nextRevision2(state.state.stateRevision), changeCursor: batch.checkpoint.terminalStartToken };
    const saved = await options.stateStore.saveTrusted(candidate, state.state.stateRevision);
    if (saved.status === "saved") return;
    if (saved.status !== "stale-revision") throw new SnapshotAssemblyError("recovery-required", `durable REMOTE batch exists but cursor mirror could not advance: ${saved.reason}`);
  }
  throw new SnapshotAssemblyError("recovery-required", "durable REMOTE batch exists but cursor mirror repeatedly raced with trusted-state persistence");
}
function authorityLearningAssembler(assembler, authorityStore, options, recoveryDependencies) {
  const structural = assembler;
  structural.bindAuthorityStore?.(authorityStore);
  const methods = /* @__PURE__ */ new Map();
  for (const property of ["assemble", "assembleFull", "assembleRecovery"]) {
    const method = Reflect.get(assembler, property);
    if (typeof method === "function") methods.set(property, method.bind(assembler));
  }
  if (!methods.size) return assembler;
  return new Proxy(assembler, {
    get(target, property, receiver) {
      const original = methods.get(property);
      if (!original) return Reflect.get(target, property, receiver);
      return async (...args) => {
        let assembly = await original(...args);
        await persistLearnedRemoteBatch(assembly, authorityStore, options);
        const recovery = await recoverOutstandingDurableIntents2(
          options.executor,
          authorityStore,
          options.stateStore,
          options.stateContext,
          assembly.managedRemote,
          recoveryDependencies
        );
        if (recovery.status === "recovery-required") throw new SnapshotAssemblyError("recovery-required", recovery.reason);
        if (recovery.changed) {
          assembly = await original(...args);
          await persistLearnedRemoteBatch(assembly, authorityStore, options);
          const residual = await recoverOutstandingDurableIntents2(
            options.executor,
            authorityStore,
            options.stateStore,
            options.stateContext,
            assembly.managedRemote,
            recoveryDependencies
          );
          if (residual.status === "recovery-required") throw new SnapshotAssemblyError("recovery-required", residual.reason);
          if (residual.changed) throw new SnapshotAssemblyError("recovery-required", "durable recovery did not reach a stable pre-planning authority state in one bounded refresh");
        }
        return assembly;
      };
    }
  });
}
var ProductController = class extends ProductControllerBase {
  constructor(options) {
    const diagnostics = authoritativeDiagnostics(options.diagnostics);
    const rawAuthorityStore = options.authorityStore ?? new TrustedStateSynchronizationAuthorityStore(options.stateStore, options.stateContext);
    const authorityStore = withExecutionLifecycleObserver(rawAuthorityStore, diagnostics.observer);
    const dependencies = {
      reliableRemoteMutationPort: options.reliableRemoteMutationPort,
      localTransactionalMutationPort: options.localTransactionalMutationPort,
      remoteFolderCreateRecoveryReadPort: options.remoteFolderCreateRecoveryReadPort
    };
    const recoveryDependencies = {
      localTransactionalMutationPort: options.localTransactionalMutationPort,
      remoteFolderCreateRecoveryReadPort: options.remoteFolderCreateRecoveryReadPort
    };
    options.executor.recoverableProductionMutationDependencies = dependencies;
    super({
      ...options,
      snapshotAssembler: authorityLearningAssembler(options.snapshotAssembler, authorityStore, options, recoveryDependencies),
      ...diagnostics.logger ? { diagnostics: diagnostics.logger } : {},
      authorityStore
    });
  }
};

// src/product/production-executor.ts
function evidenceMatches(actual, expected) {
  if (!expected) return true;
  if (expected.hash) return actual?.hash === expected.hash;
  if (expected.revision) return actual?.revision === expected.revision;
  return false;
}
function signalMessage2(signal) {
  const detail = "detail" in signal && signal.detail ? signal.detail : signal.kind;
  return signal.kind === "authentication-required" ? `authentication-required:${detail}` : detail;
}
function thrownDriveSignal(error) {
  if (!error || typeof error !== "object" || !("driveSignal" in error)) return void 0;
  const signal = error.driveSignal;
  if (!signal || typeof signal !== "object" || !("kind" in signal)) return void 0;
  return signal;
}
function success2(operation, evidence2, ref, resultingRemoteObjectId2) {
  const receipt = { operationId: operation.operationId, durable: true, integrityVerified: true, evidence: evidence2, resultingRemoteObjectId: resultingRemoteObjectId2, verificationEvidenceRef: ref };
  return { status: "durable-verified-success", receipt };
}
var ProductSynchronizationExecutor = class {
  constructor(local, drive, state, stateContext, runEvidence, textVersions) {
    this.local = local;
    this.drive = drive;
    this.state = state;
    this.stateContext = stateContext;
    this.runEvidence = runEvidence;
    this.textVersions = textVersions;
  }
  local;
  drive;
  state;
  stateContext;
  runEvidence;
  textVersions;
  async validatePreconditions(operation) {
    const failed = [];
    let evidence2;
    const evidenceForPass = () => evidence2 ??= this.runEvidence();
    const localObservations = /* @__PURE__ */ new Map();
    const remoteObservations = /* @__PURE__ */ new Map();
    let stateLoad;
    const observeLocal = (path2) => {
      const key = String(path2);
      let observation = localObservations.get(key);
      if (!observation) {
        observation = this.local.observe(path2);
        localObservations.set(key, observation);
      }
      return observation;
    };
    const observeRemote = (path2) => {
      const key = String(path2);
      let observation = remoteObservations.get(key);
      if (!observation) {
        observation = this.drive.observe(evidenceForPass().managedRemote.rootId, path2);
        remoteObservations.set(key, observation);
      }
      return observation;
    };
    const moveRemoteObservationPath = operation.kind === "identity-preserving-move" && operation.targetSide === "remote" && operation.fromPath ? operation.fromPath : void 0;
    for (const precondition of operation.preconditions) {
      if (precondition.kind === "base-trusted") {
        const loaded = await (stateLoad ??= this.state.load(this.stateContext));
        if (loaded.status !== "trusted") return { status: "recovery-required", reason: "trusted synchronization base is unavailable" };
      } else if (precondition.kind === "remote-enumeration-complete") {
        if (!evidenceForPass().remoteEnumerationComplete) return { status: "blocked", reason: "remote enumeration is not complete" };
      } else if (precondition.kind === "identity-unambiguous") {
        continue;
      } else if (precondition.kind === "path-observation") {
        if (precondition.side === "local") {
          const observed2 = await observeLocal(precondition.path);
          if (observed2.status !== precondition.expected || precondition.observationToken && observed2.status === "present" && observed2.observationToken !== precondition.observationToken) failed.push(precondition);
        } else {
          const observed2 = await observeRemote(precondition.path);
          if (!observed2.ok) return this.mapDrivePreconditionFailure(observed2.signal);
          if (observed2.value.status !== precondition.expected) failed.push(precondition);
        }
      } else if (precondition.kind === "content-evidence") {
        if (precondition.side === "local") {
          const observed2 = await observeLocal(precondition.path);
          if (observed2.status !== "present" || !evidenceMatches(observed2.content, precondition.expected)) failed.push(precondition);
        } else {
          const remotePath = moveRemoteObservationPath && precondition.path === operation.fromPath ? moveRemoteObservationPath : precondition.path;
          const observed2 = await observeRemote(remotePath);
          if (!observed2.ok) return this.mapDrivePreconditionFailure(observed2.signal);
          if (observed2.value.status !== "present" || !evidenceMatches(observed2.value.content, precondition.expected)) failed.push(precondition);
        }
      } else if (precondition.kind === "file-stable") {
        const observed2 = await observeLocal(precondition.path);
        if (observed2.status !== "present" || observed2.stability !== "stable") failed.push(precondition);
      } else if (precondition.kind === "remote-object") {
        const remoteObjectPath = moveRemoteObservationPath ?? (operation.contentVersion?.remoteObjectId === precondition.remoteObjectId ? operation.contentVersion.path : operation.path);
        const observed2 = await observeRemote(remoteObjectPath);
        if (!observed2.ok) return this.mapDrivePreconditionFailure(observed2.signal);
        if (observed2.value.status !== "present" || observed2.value.remoteObjectId !== precondition.remoteObjectId || precondition.expectedRevision && observed2.value.content?.revision !== precondition.expectedRevision) failed.push(precondition);
      }
    }
    return failed.length ? { status: "stale", failed } : { status: "valid" };
  }
  async versionStillCurrent(side, version, remote) {
    if (side === "local") {
      const observed3 = await this.local.observe(version.path);
      return observed3.status === "present" && observed3.entityKind === version.entityKind && evidenceMatches(observed3.content, version.content) && (!version.observationToken || observed3.observationToken === version.observationToken);
    }
    const observed2 = await this.drive.observe(remote.rootId, version.path);
    return observed2.ok && observed2.value.status === "present" && observed2.value.entityKind === version.entityKind && (!version.remoteObjectId || observed2.value.remoteObjectId === version.remoteObjectId) && evidenceMatches(observed2.value.content, version.content);
  }
  async currentLocalVersion(path2) {
    const observed2 = await this.local.observe(path2);
    if (observed2.status !== "present" || observed2.stability !== "stable") return void 0;
    return { path: observed2.path, entityKind: observed2.entityKind, content: observed2.content, observationToken: observed2.observationToken };
  }
  async localPathState(path2) {
    const observed2 = await this.local.observe(path2);
    if (observed2.status === "absent") return "absent";
    if (observed2.status === "present") return "present";
    return "blocked";
  }
  failureScope(_operation, reason) {
    return reason.startsWith("path-local:") ? "path" : "global";
  }
  async execute(operation) {
    try {
      const boundary = await this.validatePreconditions(operation);
      if (boundary.status === "stale") return { status: "stale-precondition", reason: "planned versions changed after pending journal; mutation refused", failed: boundary.failed };
      if (boundary.status === "blocked") return { status: "blocking-failure", reason: boundary.reason };
      if (boundary.status === "recovery-required") return { status: "recovery-required", reason: boundary.reason };
      switch (operation.kind) {
        case "noop": {
          if (operation.reasons.some((reason) => reason.code === "safe-union-identical") && operation.contentVersion && this.textVersions && isSafelyRecognizedTextPath(operation.contentVersion.path)) {
            if (!await this.textVersions.retainVersion(operation.contentVersion)) return { status: "blocking-failure", reason: "recognized-text first-sync BASE could not be materialized exactly" };
          }
          return success2(operation, operation.contentVersion?.content, `noop:${String(operation.operationId)}`);
        }
        case "upload-create":
          return await this.uploadCreate(operation);
        case "upload-update":
          return await this.uploadUpdate(operation);
        case "download-create":
          return await this.downloadCreate(operation);
        case "download-update":
          return await this.downloadUpdate(operation);
        case "identity-preserving-move":
          return await this.move(operation);
        case "trash-local":
          await this.local.trash(operation.path);
          return success2(operation, void 0, `local-trash:${String(operation.path)}`);
        case "trash-remote": {
          if (!operation.remoteObjectId) return { status: "blocking-failure", reason: "remote trash requires stable remote object identity" };
          const result = await this.drive.trash(operation.remoteObjectId);
          return result.ok ? success2(operation, void 0, `remote-trash:${String(operation.remoteObjectId)}`) : this.mapDriveFailure(result.signal);
        }
        case "clean-text-merge":
          return await this.cleanTextMerge(operation);
        case "unresolved-conflict":
        case "blocked-unsafe":
          return { status: "blocking-failure", reason: `path-local:${operation.kind} cannot mutate content` };
        case "recovery-required":
          return { status: "recovery-required", reason: "recovery-required operation cannot mutate content" };
      }
    } catch (error) {
      const driveSignal = thrownDriveSignal(error);
      if (driveSignal) return this.mapDriveFailure(driveSignal);
      const message = error instanceof Error ? error.message : String(error);
      const pathLocal = /Blocked local path|invalid-name|reserved-name|case-collision|unicode-collision|path-too-long|unsupported-object/i.test(message);
      return { status: "blocking-failure", reason: pathLocal ? `path-local:${message}` : message };
    }
  }
  plannedLocalToken(operation, path2 = operation.path) {
    const value2 = operation.preconditions.find((precondition) => precondition.kind === "path-observation" && precondition.side === "local" && precondition.path === path2 && precondition.expected === "present");
    return value2?.observationToken;
  }
  expectedRemoteRevision(operation) {
    return operation.preconditions.find((precondition) => precondition.kind === "remote-object" && (!operation.remoteObjectId || precondition.remoteObjectId === operation.remoteObjectId))?.expectedRevision;
  }
  async ensureLocalTargetCompatible(path2) {
    const compatibility = await this.local.validatePath(path2);
    return compatibility.status === "blocked" ? { status: "blocking-failure", reason: `path-local:${compatibility.detail ?? compatibility.reason}` } : void 0;
  }
  async uploadCreate(operation) {
    const version = operation.contentVersion;
    if (!version) return { status: "blocking-failure", reason: "upload-create requires a planned content version" };
    if (version.entityKind === "folder") {
      const result2 = await this.drive.create(this.runEvidence().managedRemote.rootId, { path: operation.path, entityKind: "folder" });
      if (!result2.ok) return this.mapDriveFailure(result2.signal);
      const observed3 = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
      if (!observed3.ok || observed3.value.status !== "present" || observed3.value.remoteObjectId !== result2.value.remoteObjectId || observed3.value.entityKind !== "folder") return { status: "uncertain", reason: "created remote folder could not be re-observed by its allocated stable identity" };
      return success2(operation, observed3.value.content ?? result2.value.evidence, `remote-create:${String(result2.value.remoteObjectId)}`, result2.value.remoteObjectId);
    }
    const local = await this.local.readFile(version.path, version.observationToken);
    if (!evidenceMatches(local.evidence, version.content)) return { status: "stale-precondition", reason: "planned local upload-create source content changed before transfer" };
    const content = this.textVersions?.capture(version, local.content) ?? local.content;
    const result = await this.drive.create(this.runEvidence().managedRemote.rootId, { path: operation.path, entityKind: "file", content, expectedEvidence: version.content ?? local.evidence });
    if (!result.ok) return this.mapDriveFailure(result.signal);
    const observed2 = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
    if (!observed2.ok || observed2.value.status !== "present" || observed2.value.remoteObjectId !== result.value.remoteObjectId) return { status: "uncertain", reason: "created remote file could not be re-observed by its allocated stable identity" };
    const finalEvidence = observed2.value.content ?? result.value.evidence;
    if (!evidenceMatches(finalEvidence, version.content)) return { status: "uncertain", reason: "created remote file evidence does not match the planned stable source" };
    if (this.textVersions && isSafelyRecognizedTextPath(version.path)) {
      const finalVersion = { path: operation.path, entityKind: "file", content: finalEvidence, remoteObjectId: result.value.remoteObjectId };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "created recognized-text version could not be retained as future BASE" };
    }
    return success2(operation, finalEvidence, `remote-create:${String(result.value.remoteObjectId)}`, result.value.remoteObjectId);
  }
  async uploadUpdate(operation) {
    if (!operation.remoteObjectId || !operation.contentVersion) return { status: "blocking-failure", reason: "upload-update requires remote identity and content version" };
    const version = operation.contentVersion;
    const local = await this.local.readFile(version.path, version.observationToken);
    if (!evidenceMatches(local.evidence, version.content)) return { status: "stale-precondition", reason: "planned local upload-update source content changed before transfer" };
    const content = this.textVersions?.capture(version, local.content) ?? local.content;
    const result = await this.drive.update({ remoteObjectId: operation.remoteObjectId, path: operation.path, content, expectedEvidence: version.content ?? local.evidence, expectedRemoteRevision: this.expectedRemoteRevision(operation) });
    if (!result.ok) return this.mapDriveFailure(result.signal);
    const observed2 = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
    if (!observed2.ok || observed2.value.status !== "present" || observed2.value.remoteObjectId !== operation.remoteObjectId) return { status: "uncertain", reason: "updated object could not be re-observed by stable identity" };
    const finalEvidence = observed2.value.content ?? result.value.evidence;
    if (!evidenceMatches(finalEvidence, version.content)) return { status: "uncertain", reason: "updated remote content does not match canonical planned source evidence" };
    if (this.textVersions && isSafelyRecognizedTextPath(version.path)) {
      const finalVersion = { path: operation.path, entityKind: "file", content: finalEvidence, remoteObjectId: operation.remoteObjectId };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "updated recognized-text version could not be retained as future BASE" };
    }
    return success2(operation, finalEvidence, `remote:${String(operation.remoteObjectId)}`);
  }
  async downloadCreate(operation) {
    const version = operation.contentVersion;
    const remoteObjectId = version?.remoteObjectId ?? operation.remoteObjectId;
    if (!remoteObjectId || !version) return { status: "blocking-failure", reason: "download-create requires remote identity and version" };
    const blocked2 = await this.ensureLocalTargetCompatible(operation.path);
    if (blocked2) return blocked2;
    if (version.entityKind === "folder") {
      const receipt2 = await this.local.createFolder(operation.path);
      return success2(operation, receipt2.evidence, `local:${String(operation.path)}`);
    }
    const downloaded = await this.drive.download(remoteObjectId);
    if (!downloaded.ok) return this.mapDriveFailure(downloaded.signal);
    if (!evidenceMatches(downloaded.value.evidence, version.content)) return { status: "stale-precondition", reason: "planned remote download-create source content changed before transfer" };
    const content = this.textVersions?.capture(version, downloaded.value.content) ?? downloaded.value.content;
    const receipt = await this.local.createFile(operation.path, content);
    const observed2 = await this.local.observe(operation.path);
    if (observed2.status !== "present" || !evidenceMatches(observed2.content, version.content)) return { status: "uncertain", reason: "downloaded local file could not be verified against canonical remote evidence" };
    const finalEvidence = observed2.content ?? receipt.evidence;
    if (this.textVersions && isSafelyRecognizedTextPath(operation.path)) {
      const finalVersion = { path: operation.path, entityKind: "file", content: finalEvidence, observationToken: observed2.observationToken };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "downloaded recognized-text version could not be retained as future BASE" };
    }
    return success2(operation, finalEvidence, `local:${String(operation.path)}`);
  }
  async downloadUpdate(operation) {
    const version = operation.contentVersion;
    const remoteObjectId = version?.remoteObjectId ?? operation.remoteObjectId;
    if (!remoteObjectId || !version) return { status: "blocking-failure", reason: "download-update requires remote identity and version" };
    const blocked2 = await this.ensureLocalTargetCompatible(operation.path);
    if (blocked2) return blocked2;
    const downloaded = await this.drive.download(remoteObjectId);
    if (!downloaded.ok) return this.mapDriveFailure(downloaded.signal);
    if (!evidenceMatches(downloaded.value.evidence, version.content)) return { status: "stale-precondition", reason: "planned remote download-update source content changed before transfer" };
    const expectedToken = this.plannedLocalToken(operation);
    const content = this.textVersions?.capture(version, downloaded.value.content) ?? downloaded.value.content;
    const receipt = await this.local.replaceFile(operation.path, content, expectedToken);
    const observed2 = await this.local.observe(operation.path);
    if (observed2.status !== "present" || !evidenceMatches(observed2.content, version.content)) return { status: "uncertain", reason: "replaced local file could not be verified against canonical remote evidence" };
    const finalEvidence = observed2.content ?? receipt.evidence;
    if (this.textVersions && isSafelyRecognizedTextPath(operation.path)) {
      const finalVersion = { path: operation.path, entityKind: "file", content: finalEvidence, observationToken: observed2.observationToken };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "replaced recognized-text version could not be retained as future BASE" };
    }
    return success2(operation, finalEvidence, `local:${String(operation.path)}`);
  }
  async cleanTextMerge(operation) {
    const version = operation.contentVersion;
    const remoteObjectId = operation.remoteObjectId ?? version?.remoteObjectId;
    if (!version || !remoteObjectId || version.entityKind !== "file" || !this.textVersions) return { status: "blocking-failure", reason: "clean-text-merge requires a materialized recognized-text version and stable remote identity" };
    const expectedLocalToken = this.plannedLocalToken(operation);
    if (!expectedLocalToken) return { status: "stale-precondition", reason: "clean merge lacks the exact planned local observation token" };
    const sourceLocal = await this.textVersions.sourceForRetained(version);
    const sourceRemote = await this.textVersions.sourceForRetained(version);
    if (!sourceLocal || !sourceRemote) return { status: "blocking-failure", reason: "clean merge materialization is unavailable or corrupt under its exact canonical evidence" };
    try {
      await this.local.replaceFile(operation.path, sourceLocal, expectedLocalToken);
      const localAfter = await this.local.observe(operation.path);
      if (localAfter.status !== "present" || !evidenceMatches(localAfter.content, version.content)) return { status: "uncertain", reason: "clean merge local result could not be verified against merged evidence" };
      const remoteResult = await this.drive.update({ remoteObjectId, path: operation.path, content: sourceRemote, expectedEvidence: version.content, expectedRemoteRevision: this.expectedRemoteRevision(operation) });
      if (!remoteResult.ok) return { status: "uncertain", reason: `clean merge local side was written but remote outcome was not durably verified: ${signalMessage2(remoteResult.signal)}` };
      const remoteAfter = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
      if (!remoteAfter.ok || remoteAfter.value.status !== "present" || remoteAfter.value.remoteObjectId !== remoteObjectId || !evidenceMatches(remoteAfter.value.content, version.content)) return { status: "uncertain", reason: "clean merge remote result could not be verified against merged evidence" };
      const finalEvidence = version.content;
      const finalVersion = { path: operation.path, entityKind: "file", content: finalEvidence, remoteObjectId };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "verified clean merge could not be retained as future BASE" };
      return success2(operation, finalEvidence, `clean-merge:${String(remoteObjectId)}`);
    } catch (error) {
      const driveSignal = thrownDriveSignal(error);
      if (driveSignal) return this.mapDriveFailure(driveSignal);
      return { status: "uncertain", reason: `clean merge mutation may be partial: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
  async move(operation) {
    if (!operation.fromPath || !operation.toPath || !operation.targetSide) return { status: "blocking-failure", reason: "identity-preserving move requires explicit side and paths" };
    const compatibility = await this.local.validatePath(operation.toPath);
    if (compatibility.status === "blocked") return { status: "blocking-failure", reason: `path-local:${compatibility.detail ?? compatibility.reason}` };
    if (operation.targetSide === "local") {
      const receipt = await this.local.move(operation.fromPath, operation.toPath);
      const observed3 = await this.local.observe(operation.toPath);
      if (observed3.status !== "present") return { status: "uncertain", reason: "local move destination could not be re-observed" };
      return success2(operation, observed3.content ?? receipt.evidence, `local-move:${String(operation.toPath)}`);
    }
    if (!operation.remoteObjectId) return { status: "blocking-failure", reason: "remote move requires stable remote identity" };
    const result = await this.drive.move(operation.remoteObjectId, operation.fromPath, operation.toPath);
    if (!result.ok) return this.mapDriveFailure(result.signal);
    const observed2 = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.toPath);
    if (!observed2.ok || observed2.value.status !== "present" || observed2.value.remoteObjectId !== operation.remoteObjectId) return { status: "uncertain", reason: "remote move destination did not preserve the planned stable Drive identity" };
    return success2(operation, observed2.value.content ?? result.value.evidence, `remote-move:${String(operation.remoteObjectId)}`);
  }
  mapDrivePreconditionFailure(signal) {
    if (signal.kind === "authentication-required") return { status: "blocked", reason: signalMessage2(signal) };
    if (signal.kind === "recovery-required" || signal.kind === "not-found") return { status: "recovery-required", reason: signalMessage2(signal) };
    return { status: "blocked", reason: signalMessage2(signal) };
  }
  mapDriveFailure(signal) {
    if (signal.kind === "transient-failure") return { status: "retryable-failure", reason: signalMessage2(signal) };
    if (signal.kind === "rate-limited") return { status: "retryable-failure", reason: signal.kind, retryAfterMs: signal.retryAfterMs };
    if (signal.kind === "recovery-required" || signal.kind === "not-found") return { status: "recovery-required", reason: signalMessage2(signal) };
    return { status: "blocking-failure", reason: signalMessage2(signal) };
  }
};

// src/product/scheduler.ts
var TRIGGER_PRIORITY = { periodic: 1, "startup-resume": 2, "local-change": 3 };
function higherPriority(current, candidate) {
  return !current || TRIGGER_PRIORITY[candidate] > TRIGGER_PRIORITY[current] ? candidate : current;
}
var ProductSyncScheduler = class {
  constructor(local, controller, settings, integrity) {
    this.local = local;
    this.controller = controller;
    this.settings = settings;
    this.integrity = integrity;
  }
  local;
  controller;
  settings;
  integrity;
  changeTimer;
  delayedDrainTimer;
  periodicTimer;
  unsubscribers = [];
  started = false;
  startupOpportunityIssued = false;
  pendingTrigger;
  deferredInactiveTrigger;
  drain;
  integrityRunning = false;
  integrityPending = false;
  start() {
    if (this.started) return;
    this.started = true;
    this.startupOpportunityIssued = false;
    enterSynchronizationLifecycle("active");
    this.unsubscribers.push(this.local.onLifecycle((event) => {
      if (event.kind === "vault-ready") this.issueInitialStartupOpportunity();
      if (event.kind === "resume") this.handleResume();
      if (event.kind === "suspend") this.beginStopping("suspend");
      if (event.kind === "unload") this.beginStopping("unload");
    }));
    this.unsubscribers.push(this.local.onChange(() => this.handleLocalChange()));
    this.installPeriodic();
  }
  refresh() {
    this.clearPeriodic();
    if (this.started && synchronizationLifecycleState() === "active") this.installPeriodic();
  }
  /** Enter the unload gate synchronously before any awaited cleanup begins. */
  beginUnload() {
    this.beginStopping("unload");
  }
  stop() {
    if (!this.started) return;
    this.beginStopping("unload");
    this.started = false;
    this.startupOpportunityIssued = false;
    this.pendingTrigger = void 0;
    this.deferredInactiveTrigger = void 0;
    this.clearChangeTimer();
    this.clearDelayedDrain();
    this.clearPeriodic();
    for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
  }
  integrityPort() {
    if (this.integrity) return this.integrity;
    const candidate = this.local;
    return typeof candidate.readFileBypassingEvidenceCache === "function" ? candidate : void 0;
  }
  handleLocalChange() {
    if (!this.settings().localChangeEnabled) return;
    if (!this.started || synchronizationLifecycleState() !== "active") {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "local-change");
      noteDeferredReconciliationAcrossLifecycle();
      return;
    }
    this.clearChangeTimer();
    this.changeTimer = globalThis.setTimeout(() => {
      this.changeTimer = void 0;
      this.queueAutomatic("local-change");
    }, Math.max(0, this.settings().localDebounceMs));
  }
  issueInitialStartupOpportunity() {
    if (this.startupOpportunityIssued || !this.settings().startupResumeEnabled) return;
    this.startupOpportunityIssued = true;
    this.queueAutomatic("startup-resume");
  }
  handleResume() {
    if (!this.started || synchronizationLifecycleState() === "unloading") return;
    enterSynchronizationLifecycle("active");
    this.installPeriodic();
    const deferred = consumeDeferredReconciliationAcrossLifecycle();
    if (deferred) {
      if (this.settings().localChangeEnabled) this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "local-change");
      else if (this.settings().periodicEnabled) this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "periodic");
    }
    const replay = this.deferredInactiveTrigger;
    this.deferredInactiveTrigger = void 0;
    if (replay) this.queueAutomatic(replay);
    if (this.settings().startupResumeEnabled) this.queueAutomatic("startup-resume");
  }
  beginStopping(kind) {
    if (!this.started && kind === "suspend") return;
    const current = synchronizationLifecycleState();
    if (kind === "unload" && current === "unloading") return;
    if (kind === "suspend" && current !== "active") return;
    const target = kind === "unload" ? "unloading" : "suspending";
    enterSynchronizationLifecycle(target);
    if (this.changeTimer !== void 0 && this.settings().localChangeEnabled) {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, "local-change");
      noteDeferredReconciliationAcrossLifecycle();
    }
    if (this.pendingTrigger) {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, this.pendingTrigger);
      this.pendingTrigger = void 0;
      noteDeferredReconciliationAcrossLifecycle();
    }
    this.clearChangeTimer();
    this.clearDelayedDrain();
    this.clearPeriodic();
    void this.controller.request({ kind: "cancel-active-sync" }).finally(() => {
      if (kind === "suspend" && synchronizationLifecycleState() === "suspending") enterSynchronizationLifecycle("suspended");
    });
  }
  queueAutomatic(trigger) {
    if (!this.started) return;
    if (synchronizationLifecycleState() !== "active") {
      this.deferredInactiveTrigger = higherPriority(this.deferredInactiveTrigger, trigger);
      noteDeferredReconciliationAcrossLifecycle();
      return;
    }
    this.pendingTrigger = higherPriority(this.pendingTrigger, trigger);
    this.ensureDrain();
  }
  ensureDrain() {
    if (this.drain || this.delayedDrainTimer !== void 0 || !this.pendingTrigger) return;
    const activeDrain = Promise.resolve().then(() => this.drainAutomaticTriggers());
    this.drain = activeDrain;
    void activeDrain.finally(() => {
      if (this.drain === activeDrain) this.drain = void 0;
      if (!this.pendingTrigger || !this.started || synchronizationLifecycleState() !== "active") return;
      this.scheduleDelayedDrain();
    }).catch(() => void 0);
  }
  async drainAutomaticTriggers() {
    let runs = 0;
    while (runs < 2 && this.pendingTrigger && this.started && synchronizationLifecycleState() === "active") {
      const trigger = this.pendingTrigger;
      this.pendingTrigger = void 0;
      runs += 1;
      try {
        await this.controller.runAutomatic(trigger);
      } catch {
      }
    }
  }
  scheduleDelayedDrain() {
    if (this.delayedDrainTimer !== void 0 || !this.started || synchronizationLifecycleState() !== "active") return;
    const delay = Math.max(250, this.settings().localDebounceMs);
    this.delayedDrainTimer = globalThis.setTimeout(() => {
      this.delayedDrainTimer = void 0;
      this.ensureDrain();
    }, delay);
  }
  installPeriodic() {
    const settings = this.settings();
    if (!this.started || synchronizationLifecycleState() !== "active" || !settings.periodicEnabled || this.periodicTimer !== void 0) return;
    const interval = Math.max(6e4, settings.periodicIntervalMs);
    this.periodicTimer = globalThis.setInterval(() => this.requestPeriodicOpportunity(), interval);
  }
  requestPeriodicOpportunity() {
    if (!this.started || synchronizationLifecycleState() !== "active") return;
    if (this.integrityRunning) {
      this.integrityPending = true;
      return;
    }
    this.integrityRunning = true;
    void this.performIntegrityOpportunity().finally(() => {
      this.integrityRunning = false;
      if (this.integrityPending) {
        this.integrityPending = false;
        this.requestPeriodicOpportunity();
      }
    });
  }
  async performIntegrityOpportunity() {
    let mismatchObserved = false;
    const integrity = this.integrityPort();
    if (integrity && this.started && synchronizationLifecycleState() === "active") {
      try {
        const listing = await this.local.enumerate();
        for (const entry2 of listing.entries) {
          if (!this.started || synchronizationLifecycleState() !== "active") return;
          if (entry2.status !== "present" || entry2.entityKind !== "file") continue;
          try {
            const actual = await integrity.readFileBypassingEvidenceCache(entry2.path);
            const cachedHash = entry2.content?.hash;
            const actualHash = actual.evidence.hash;
            if (!cachedHash || !actualHash || cachedHash !== actualHash) mismatchObserved = true;
          } catch {
            mismatchObserved = true;
          }
        }
      } catch {
        mismatchObserved = true;
      }
    }
    if (!this.started || synchronizationLifecycleState() !== "active") return;
    this.queueAutomatic(mismatchObserved && this.settings().localChangeEnabled ? "local-change" : "periodic");
  }
  clearChangeTimer() {
    if (this.changeTimer !== void 0) globalThis.clearTimeout(this.changeTimer);
    this.changeTimer = void 0;
  }
  clearDelayedDrain() {
    if (this.delayedDrainTimer !== void 0) globalThis.clearTimeout(this.delayedDrainTimer);
    this.delayedDrainTimer = void 0;
  }
  clearPeriodic() {
    if (this.periodicTimer !== void 0) globalThis.clearInterval(this.periodicTimer);
    this.periodicTimer = void 0;
  }
};

// src/product/web-lock-run-lease.ts
function runtimeLocks() {
  const navigatorValue = globalThis.navigator;
  return navigatorValue?.locks;
}
var inProcessFallbackHolders = /* @__PURE__ */ new Map();
var WebLocksRunLeasePort = class {
  constructor(locks = runtimeLocks()) {
    this.locks = locks;
  }
  locks;
  async tryAcquire(vaultIdentity, _deviceIdentity, holderId) {
    const name = `brain-gdrive-sync:${String(vaultIdentity)}`;
    if (!this.locks) return this.tryAcquireInProcess(name, holderId);
    let releaseGate;
    let resolveAcquired;
    const acquired = new Promise((resolve2) => {
      resolveAcquired = resolve2;
    });
    const released = new Promise((resolve2) => {
      releaseGate = resolve2;
    });
    const requestCompletion = this.locks.request(name, { mode: "exclusive", ifAvailable: true }, async (lock) => {
      if (!lock) {
        resolveAcquired?.(false);
        return;
      }
      resolveAcquired?.(true);
      await released;
    }).catch(() => resolveAcquired?.(false));
    if (!await acquired) {
      await requestCompletion;
      return void 0;
    }
    let releasedOnce = false;
    return {
      release: async () => {
        if (!releasedOnce) {
          releasedOnce = true;
          releaseGate?.();
        }
        await requestCompletion;
      }
    };
  }
  async tryAcquireInProcess(name, holderId) {
    if (inProcessFallbackHolders.has(name)) return void 0;
    inProcessFallbackHolders.set(name, holderId);
    let released = false;
    return {
      release: async () => {
        if (released) return;
        released = true;
        if (inProcessFallbackHolders.get(name) === holderId) inProcessFallbackHolders.delete(name);
      }
    };
  }
};

// src/product/network-policy.ts
function connection() {
  const nav = globalThis.navigator;
  return nav?.connection;
}
function automaticNetworkDecision(plan, settings, mobile) {
  if (!mobile) return { allowed: true };
  const network = connection();
  const provenWifi = network?.type === "wifi";
  if (settings.wifiOnlyAutomatic && !provenWifi) return { allowed: false, reason: "Wi-Fi-only automatic sync is enabled and this host cannot prove a Wi-Fi connection." };
  const hasLargeTransfer = plan.operations.some((operation) => (operation.contentVersion?.content?.sizeBytes ?? 0) >= settings.largeTransferThresholdBytes);
  if (settings.wifiOnlyLargeTransfers && hasLargeTransfer && !provenWifi) return { allowed: false, reason: "A large automatic transfer is Wi-Fi-only and this host cannot prove a Wi-Fi connection." };
  return { allowed: true };
}

// src/product/text-version-store.ts
var IndexedDbTextVersionPersistence = class {
  constructor(databaseName) {
    this.databaseName = databaseName;
  }
  databaseName;
  databasePromise;
  async get(key) {
    const database = await this.database();
    return new Promise((resolve2, reject) => {
      const request = database.transaction("versions", "readonly").objectStore("versions").get(key);
      request.onsuccess = () => resolve2(typeof request.result === "string" ? request.result : void 0);
      request.onerror = () => reject(request.error ?? new Error("text-version IndexedDB read failed"));
    });
  }
  async put(key, text) {
    const database = await this.database();
    await new Promise((resolve2, reject) => {
      const transaction = database.transaction("versions", "readwrite");
      transaction.objectStore("versions").put(text, key);
      transaction.oncomplete = () => resolve2();
      transaction.onerror = () => reject(transaction.error ?? new Error("text-version IndexedDB write failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("text-version IndexedDB write aborted"));
    });
  }
  database() {
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise((resolve2, reject) => {
      const factory = globalThis.indexedDB;
      if (!factory) {
        reject(new Error("IndexedDB is unavailable for device-local text version storage"));
        return;
      }
      const request = factory.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("versions")) request.result.createObjectStore("versions");
      };
      request.onsuccess = () => resolve2(request.result);
      request.onerror = () => reject(request.error ?? new Error("text-version IndexedDB open failed"));
    });
    return this.databasePromise;
  }
};
function evidenceMatches2(actual, expected) {
  if (!expected) return true;
  if (expected.hash) return actual?.hash === expected.hash;
  if (expected.revision) return actual?.revision === expected.revision;
  return false;
}
function versionKey(version) {
  if (version.entityKind !== "file" || !isSafelyRecognizedTextPath(version.path) || !isCanonicalSha256(version.content?.hash)) return void 0;
  return `hash:${String(version.content.hash)}`;
}
function retainedMatches(version, text) {
  const expected = version.content?.hash;
  return isCanonicalSha256(expected) && sha256Text(text) === expected;
}
function cancelled4(signal) {
  return signal?.cancelled === true;
}
async function decodeBoundedUtf8(source, maximumBytes, expectedBytes, cancellation) {
  if (expectedBytes > maximumBytes || source.sizeBytes !== void 0 && source.sizeBytes !== expectedBytes || cancelled4(cancellation)) return void 0;
  const decoder2 = new TextDecoder("utf-8", { fatal: true });
  const parts = [];
  let bytesRead = 0;
  try {
    for await (const chunk of source.openChunks()) {
      if (cancelled4(cancellation)) return void 0;
      bytesRead += chunk.byteLength;
      if (bytesRead > maximumBytes || bytesRead > expectedBytes) return void 0;
      parts.push(decoder2.decode(chunk, { stream: true }));
    }
    if (bytesRead !== expectedBytes || cancelled4(cancellation)) return void 0;
    parts.push(decoder2.decode());
    return parts.join("");
  } catch {
    return void 0;
  }
}
function textSource(text) {
  return {
    sizeBytes: new TextEncoder().encode(text).byteLength,
    async *openChunks() {
      const encoder2 = new TextEncoder();
      const charsPerChunk = 64 * 1024;
      for (let offset = 0; offset < text.length; offset += charsPerChunk) yield encoder2.encode(text.slice(offset, offset + charsPerChunk));
      if (text.length === 0) yield new Uint8Array();
    }
  };
}
var ProductTextVersionStore = class {
  constructor(persistence, local, drive, maximumRetainedTextBytes = DEFAULT_TEXT_MERGE_RESOURCE_POLICY.maximumInputBytesPerVersion) {
    this.persistence = persistence;
    this.local = local;
    this.drive = drive;
    this.maximumRetainedTextBytes = maximumRetainedTextBytes;
  }
  persistence;
  local;
  drive;
  maximumRetainedTextBytes;
  async readText(version, options = {}) {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    const maximumBytes = Math.min(options.maximumBytes ?? this.maximumRetainedTextBytes, this.maximumRetainedTextBytes);
    if (!key || declaredSize === void 0 || declaredSize > maximumBytes || cancelled4(options.cancellation)) return void 0;
    const retained = await this.persistence.get(key);
    if (retained !== void 0) {
      if (cancelled4(options.cancellation)) return void 0;
      const retainedSize = new TextEncoder().encode(retained).byteLength;
      return retainedSize === declaredSize && retainedSize <= maximumBytes && retainedMatches(version, retained) ? retained : void 0;
    }
    if (version.observationToken) {
      const read = await this.local.readFile(version.path, version.observationToken);
      if (!evidenceMatches2(read.evidence, version.content)) return void 0;
      const text = await decodeBoundedUtf8(read.content, maximumBytes, declaredSize, options.cancellation);
      if (text === void 0 || !retainedMatches(version, text)) return void 0;
      await this.persistence.put(key, text);
      return text;
    }
    if (version.remoteObjectId) {
      const downloaded = await this.drive.download(version.remoteObjectId);
      if (!downloaded.ok || !evidenceMatches2(downloaded.value.evidence, version.content)) return void 0;
      const text = await decodeBoundedUtf8(downloaded.value.content, maximumBytes, declaredSize, options.cancellation);
      if (text === void 0 || !retainedMatches(version, text)) return void 0;
      await this.persistence.put(key, text);
      return text;
    }
    return void 0;
  }
  async evidenceFor(path2, mergedText) {
    const sizeBytes = new TextEncoder().encode(mergedText).byteLength;
    if (sizeBytes > this.maximumRetainedTextBytes) return void 0;
    const evidence2 = { hash: sha256Text(mergedText), sizeBytes };
    return await this.persistText({ path: path2, entityKind: "file", content: evidence2 }, mergedText) ? evidence2 : void 0;
  }
  async retainedText(version) {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    if (!key || declaredSize === void 0 || declaredSize > this.maximumRetainedTextBytes) return void 0;
    const text = await this.persistence.get(key);
    if (text === void 0) return void 0;
    const actualSize = new TextEncoder().encode(text).byteLength;
    return actualSize === declaredSize && actualSize <= this.maximumRetainedTextBytes && retainedMatches(version, text) ? text : void 0;
  }
  async retainVersion(version) {
    if (version.entityKind !== "file" || !isSafelyRecognizedTextPath(version.path)) return true;
    return await this.readText(version) !== void 0;
  }
  async persistText(version, text) {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    const actualSize = new TextEncoder().encode(text).byteLength;
    if (!key || declaredSize === void 0 || actualSize !== declaredSize || actualSize > this.maximumRetainedTextBytes || !retainedMatches(version, text)) return false;
    await this.persistence.put(key, text);
    return true;
  }
  async aliasText(from, to) {
    const text = await this.retainedText(from) ?? await this.readText(from);
    if (text === void 0) return false;
    return this.persistText(to, text);
  }
  capture(version, source) {
    const key = versionKey(version);
    const declaredSize = version.content?.sizeBytes;
    if (!key || declaredSize === void 0 || source.sizeBytes === void 0 || declaredSize !== source.sizeBytes || source.sizeBytes > this.maximumRetainedTextBytes) return source;
    const persistence = this.persistence;
    const maximumBytes = this.maximumRetainedTextBytes;
    return {
      sizeBytes: source.sizeBytes,
      async *openChunks() {
        const decoder2 = new TextDecoder("utf-8", { fatal: true });
        const parts = [];
        let bytesRead = 0;
        for await (const chunk of source.openChunks()) {
          bytesRead += chunk.byteLength;
          if (bytesRead > maximumBytes || bytesRead > declaredSize) throw new Error("captured recognized text exceeded admitted byte size");
          parts.push(decoder2.decode(chunk, { stream: true }));
          yield chunk;
        }
        if (bytesRead !== declaredSize) throw new Error("captured recognized text byte size did not match canonical evidence");
        parts.push(decoder2.decode());
        const text = parts.join("");
        if (!retainedMatches(version, text)) throw new Error("captured recognized text does not match its canonical evidence");
        await persistence.put(key, text);
      }
    };
  }
  async sourceForRetained(version) {
    const text = await this.retainedText(version);
    return text === void 0 ? void 0 : textSource(text);
  }
};

// src/product/sync-attention-ledger.ts
var DEFAULT_SYNC_ATTENTION_RETENTION = 500;
var SYNC_ATTENTION_CSV_FILENAME = SYNC_PLAN_ERRORS_CSV_FILENAME;
function keyOf(value2) {
  return `${String(value2.path)}\0${value2.category}\0${value2.reasonCode}`;
}
function formulaSafe(value2) {
  if (value2.startsWith("'")) return `'${value2}`;
  return /^[\t\r\n ]*[=+\-@]/u.test(value2) ? `'${value2}` : value2;
}
function csvCell(value2) {
  const raw = formulaSafe(value2 === void 0 ? "" : String(value2));
  return `"${raw.replace(/"/g, '""')}"`;
}
var CSV_HEADER = [
  "vault_relative_path",
  "status",
  "reason_code",
  "human_readable_reason",
  "planned_category",
  "first_seen",
  "last_seen",
  "occurrence_count",
  "last_run_identifier",
  "trigger",
  "resolved_at"
];
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("sync plan errors CSV contains an unterminated quoted field");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/u, ""));
    rows.push(row);
  }
  return rows;
}
function unprotectFormula(value2) {
  if (value2.startsWith("''")) return value2.slice(1);
  return /^'(?=[\t\r\n ]*[=+\-@])/u.test(value2) ? value2.slice(1) : value2;
}
function renderSyncAttentionRecordsCsv(records) {
  const rows = records.map((record) => [
    String(record.path),
    record.current ? "current" : "resolved",
    record.reasonCode,
    record.humanReason,
    record.category,
    new Date(record.firstSeenAtMs).toISOString(),
    new Date(record.lastSeenAtMs).toISOString(),
    record.occurrenceCount,
    record.runId,
    record.trigger,
    record.resolvedAtMs === void 0 ? "" : new Date(record.resolvedAtMs).toISOString()
  ]);
  return [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
function parseSyncAttentionRecordsCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length || rows[0].join("\0") !== CSV_HEADER.join("\0")) {
    throw new Error("sync plan errors CSV header is missing or incompatible");
  }
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row, index) => {
    if (row.length !== CSV_HEADER.length) throw new Error(`sync plan errors CSV row ${index + 2} has an invalid column count`);
    const [rawPath, status, rawReason, rawHuman, rawCategory, firstSeen, lastSeen, count, runId, rawTrigger, resolvedAt] = row;
    const path2 = unprotectFormula(rawPath);
    const reasonCode = unprotectFormula(rawReason);
    const humanReason = unprotectFormula(rawHuman);
    const category = unprotectFormula(rawCategory);
    const trigger = unprotectFormula(rawTrigger);
    const firstSeenAtMs = Date.parse(firstSeen);
    const lastSeenAtMs = Date.parse(lastSeen);
    const occurrenceCount = Number(count);
    const parsedRunId = runId ? Number(runId) : void 0;
    const resolvedAtMs = resolvedAt ? Date.parse(resolvedAt) : void 0;
    if (!path2 || !reasonCode || !humanReason || !category || !trigger || !Number.isFinite(firstSeenAtMs) || !Number.isFinite(lastSeenAtMs) || !Number.isSafeInteger(occurrenceCount) || occurrenceCount < 1 || parsedRunId !== void 0 && !Number.isSafeInteger(parsedRunId) || resolvedAtMs !== void 0 && !Number.isFinite(resolvedAtMs)) {
      throw new Error(`sync plan errors CSV row ${index + 2} contains invalid data`);
    }
    const recordPath = contractId(path2);
    const current = status === "current";
    if (!current && status !== "resolved") throw new Error(`sync plan errors CSV row ${index + 2} has an invalid status`);
    return {
      key: keyOf({ path: recordPath, category, reasonCode }),
      firstSeenAtMs,
      lastSeenAtMs,
      ...parsedRunId === void 0 ? {} : { runId: parsedRunId },
      trigger,
      path: recordPath,
      category,
      reasonCode,
      humanReason,
      occurrenceCount,
      current,
      ...resolvedAtMs === void 0 ? {} : { resolvedAtMs }
    };
  });
}
var SyncAttentionLedger = class {
  constructor(persistence, resolvedHistoryLimit = DEFAULT_SYNC_ATTENTION_RETENTION) {
    this.persistence = persistence;
    this.resolvedHistoryLimit = resolvedHistoryLimit;
    if (!Number.isSafeInteger(resolvedHistoryLimit) || resolvedHistoryLimit < 1) throw new Error("resolved sync attention history retention must be positive");
  }
  persistence;
  resolvedHistoryLimit;
  records;
  async current() {
    return (await this.load()).filter((record) => record.current).map((record) => ({ ...record }));
  }
  async all() {
    return (await this.load()).map((record) => ({ ...record }));
  }
  /** Privacy-safe identity for notification deduplication; the path-bearing source never leaves this ledger. */
  async currentIdentity() {
    const identities = (await this.load()).filter((record) => record.current).map((record) => [String(record.path), record.category, record.reasonCode, record.humanReason].join("\0")).sort();
    return String(sha256Text(JSON.stringify(identities)));
  }
  async recordSkipped(values) {
    if (!values.length) return;
    const records = (await this.load()).map((record) => ({ ...record }));
    const incomingByPath = /* @__PURE__ */ new Map();
    for (const value2 of values) {
      const path2 = String(value2.path);
      const keys = incomingByPath.get(path2) ?? /* @__PURE__ */ new Set();
      keys.add(keyOf(value2));
      incomingByPath.set(path2, keys);
    }
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      const authoritativeKeys = incomingByPath.get(String(record.path));
      if (record.current && authoritativeKeys && !authoritativeKeys.has(record.key)) records[index] = { ...record, current: false, resolvedAtMs: Date.now() };
    }
    for (const value2 of values) {
      const key = keyOf(value2);
      const at = value2.timestampMs ?? Date.now();
      const index = records.findIndex((record) => record.key === key);
      const next = index >= 0 ? { ...records[index], lastSeenAtMs: at, runId: value2.runId, trigger: value2.trigger, humanReason: value2.humanReason, occurrenceCount: records[index].occurrenceCount + 1, current: true, resolvedAtMs: void 0 } : { key, firstSeenAtMs: at, lastSeenAtMs: at, runId: value2.runId, trigger: value2.trigger, path: value2.path, category: value2.category, reasonCode: value2.reasonCode, humanReason: value2.humanReason, occurrenceCount: 1, current: true };
      if (index >= 0) records[index] = next;
      else records.push(next);
    }
    await this.persistBounded(records);
  }
  async resolvePath(path2) {
    const records = (await this.load()).map((record) => ({ ...record }));
    let changed = false;
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (record.current && record.path === path2) {
        records[index] = { ...record, current: false, resolvedAtMs: Date.now() };
        changed = true;
      }
    }
    if (changed) await this.persistBounded(records);
  }
  async renderCsv() {
    return renderSyncAttentionRecordsCsv(await this.all());
  }
  async load() {
    if (!this.records) this.records = [...await this.persistence.loadSyncAttention()].filter((record) => record && typeof record === "object").map((record) => ({ ...record }));
    return this.records;
  }
  async persistBounded(records) {
    const current = records.filter((record) => record.current);
    const resolved = records.filter((record) => !record.current).sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs).slice(0, this.resolvedHistoryLimit);
    const retained = [...current, ...resolved].sort((a, b) => a.lastSeenAtMs - b.lastSeenAtMs);
    await this.persistence.saveSyncAttention(retained.map((record) => ({ ...record })));
    this.records = retained;
  }
};
function createSyncAttentionCsvFile(csv) {
  return new File([csv], SYNC_ATTENTION_CSV_FILENAME, { type: "text/csv;charset=utf-8" });
}
function copySyncAttentionCsv(csv) {
  const clipboard = globalThis.navigator?.clipboard;
  return clipboard?.writeText ? clipboard.writeText(csv) : Promise.reject(new Error("clipboard API is unavailable on this device"));
}
function shareSyncAttentionCsv(csv) {
  const navigatorLike = globalThis.navigator;
  if (!navigatorLike?.share) return Promise.reject(new Error("file sharing is unavailable on this device"));
  const file = createSyncAttentionCsvFile(csv);
  if (navigatorLike.canShare && !navigatorLike.canShare({ files: [file] })) return Promise.reject(new Error("this device cannot share the attention CSV file"));
  return navigatorLike.share({ files: [file] });
}

// src/product/sync-plan-errors-csv.ts
function parentPath4(path2) {
  const slash = path2.lastIndexOf("/");
  return slash < 0 ? "" : path2.slice(0, slash);
}
function recordCopy(record) {
  return { ...record };
}
function recordStateAtMs(record) {
  return record.current ? record.lastSeenAtMs : Math.max(record.lastSeenAtMs, record.resolvedAtMs ?? record.lastSeenAtMs);
}
function stagePath(path2) {
  return syncPlanErrorsOperationalPaths(path2)[1];
}
function backupPath(path2) {
  return syncPlanErrorsOperationalPaths(path2)[2];
}
var SyncPlanErrorsCsvPersistence = class {
  constructor(app, csvPath, onPersistenceFailure = () => void 0) {
    this.app = app;
    this.csvPath = csvPath;
    this.onPersistenceFailure = onPersistenceFailure;
    syncPlanErrorsOperationalPaths(csvPath);
  }
  app;
  csvPath;
  onPersistenceFailure;
  records;
  saveChain = Promise.resolve();
  unsubscribe;
  disposed = false;
  internalMutationDepth = 0;
  path() {
    return this.csvPath;
  }
  async initialize(legacy = []) {
    try {
      return await this.enqueue(async () => {
        await this.ensureParent(this.csvPath);
        const recovered = await this.recoverFile(this.csvPath);
        const exists = recovered !== void 0;
        const current = recovered ?? [];
        const merged = this.mergeLegacy(current, legacy);
        if (!exists || merged.changed) await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv(merged.records));
        this.records = merged.records.map(recordCopy);
        return { migratedLegacyRecords: legacy.length > 0 };
      });
    } finally {
      this.installDeletionMonitor();
    }
  }
  async initializePendingRelocation(journal, activePath, legacy = []) {
    if (syncPlanErrorsPathsEquivalent(journal.sourcePath, journal.destinationPath)) {
      throw new Error("Pending sync plan errors relocation has cross-platform-equivalent locations.");
    }
    if (activePath !== journal.sourcePath && activePath !== journal.destinationPath) {
      throw new Error("Sync plan errors relocation journal does not match the configured active location.");
    }
    const fallbackPath = activePath === journal.sourcePath ? journal.destinationPath : journal.sourcePath;
    try {
      return await this.enqueue(async () => {
        await this.ensureParent(activePath);
        let current = await this.recoverFile(activePath);
        if (current === void 0) {
          const fallback = await this.recoverFile(fallbackPath);
          if (fallback === void 0) throw new Error("Pending sync plan errors relocation has no recoverable authoritative CSV.");
          current = fallback;
          await this.replaceFile(activePath, renderSyncAttentionRecordsCsv(current));
        }
        const merged = this.mergeLegacy(current, legacy);
        if (merged.changed) await this.replaceFile(activePath, renderSyncAttentionRecordsCsv(merged.records));
        this.csvPath = activePath;
        this.records = merged.records.map(recordCopy);
        return { migratedLegacyRecords: legacy.length > 0 };
      });
    } finally {
      this.installDeletionMonitor();
    }
  }
  async loadSyncAttention() {
    if (this.records) return this.records.map(recordCopy);
    return this.enqueue(async () => {
      await this.ensureParent(this.csvPath);
      const recovered = await this.recoverFile(this.csvPath);
      if (recovered === void 0) {
        await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv([]));
        this.records = [];
      } else this.records = recovered;
      return this.records.map(recordCopy);
    });
  }
  async saveSyncAttention(records) {
    const payload = records.map(recordCopy);
    await this.enqueue(async () => {
      await this.ensureParent(this.csvPath);
      await this.replaceFile(this.csvPath, renderSyncAttentionRecordsCsv(payload));
      this.records = payload.map(recordCopy);
    });
  }
  async relocate(nextPath, commitActiveLocation = async () => void 0) {
    if (nextPath === this.csvPath) return;
    if (syncPlanErrorsPathsEquivalent(nextPath, this.csvPath)) {
      throw new Error("Sync plan errors relocation cannot use a cross-platform-equivalent destination.");
    }
    syncPlanErrorsOperationalPaths(nextPath);
    await this.enqueue(async () => {
      const priorPath = this.csvPath;
      const sourceRecords = this.records ?? await this.recoverFile(priorPath);
      if (!sourceRecords) throw new Error("Sync plan errors source CSV is unavailable during relocation.");
      await this.ensureParent(nextPath);
      const existingDestination = await this.recoverFile(nextPath);
      const mergedRecords = this.mergeRecordSets(sourceRecords, existingDestination ?? []);
      await this.replaceFile(nextPath, renderSyncAttentionRecordsCsv(mergedRecords));
      const destination = await this.recoverFile(nextPath);
      if (!destination) throw new Error("Sync plan errors destination CSV was not durably established.");
      const validatedDestination = this.mergeRecordSets(destination);
      if (renderSyncAttentionRecordsCsv(validatedDestination) !== renderSyncAttentionRecordsCsv(mergedRecords)) {
        throw new Error("Sync plan errors destination CSV did not validate after relocation merge.");
      }
      await commitActiveLocation();
      this.csvPath = nextPath;
      this.records = destination.map(recordCopy);
      await this.removeFileAndResidue(priorPath);
    });
  }
  async cleanupRelocationSource(sourcePath) {
    if (syncPlanErrorsPathsEquivalent(sourcePath, this.csvPath)) {
      throw new Error("Cannot clean a cross-platform-equivalent active sync plan errors CSV location.");
    }
    await this.enqueue(async () => {
      const active = await this.recoverFile(this.csvPath);
      if (!active) throw new Error("Active sync plan errors destination is unavailable during relocation finalization.");
      this.records = active.map(recordCopy);
      await this.removeFileAndResidue(sourcePath);
    });
  }
  dispose() {
    this.disposed = true;
    this.unsubscribe?.();
    this.unsubscribe = void 0;
  }
  enqueue(operation) {
    const write = this.saveChain.catch(() => void 0).then(operation);
    this.saveChain = write.then(() => void 0, () => void 0);
    return write;
  }
  async ensureParent(path2) {
    const parent = parentPath4(path2);
    if (!parent) return;
    let current = "";
    for (const component of parent.split("/")) {
      current = current ? `${current}/${component}` : component;
      if (!await this.app.vault.adapter.exists(current, true)) await this.app.vault.adapter.mkdir(current);
      const stat = await this.app.vault.adapter.stat(current);
      if (!stat || stat.type !== "folder") throw new Error(`Sync plan errors parent is not a vault folder: ${current}`);
    }
  }
  async replaceFile(path2, text) {
    const adapter = this.app.vault.adapter;
    const stage = stagePath(path2);
    const backup = backupPath(path2);
    let backedUp = false;
    this.internalMutationDepth += 1;
    try {
      await this.recoverFile(path2);
      await adapter.write(stage, text);
      if (await adapter.exists(path2, true)) {
        await adapter.rename(path2, backup);
        backedUp = true;
      }
      await adapter.rename(stage, path2);
      if (backedUp && await adapter.exists(backup, true)) await adapter.remove(backup);
    } catch (error) {
      try {
        if (!await adapter.exists(path2, true) && backedUp && await adapter.exists(backup, true)) await adapter.rename(backup, path2);
        if (await adapter.exists(stage, true)) await adapter.remove(stage);
      } catch {
      }
      throw error;
    } finally {
      this.internalMutationDepth -= 1;
    }
  }
  async recoverFile(path2) {
    const adapter = this.app.vault.adapter;
    const stage = stagePath(path2), backup = backupPath(path2);
    this.internalMutationDepth += 1;
    try {
      const canonicalExists = await adapter.exists(path2, true);
      const backupExists = await adapter.exists(backup, true);
      const stageExists = await adapter.exists(stage, true);
      if (canonicalExists) {
        const records = parseSyncAttentionRecordsCsv(await adapter.read(path2));
        if (stageExists) await adapter.remove(stage);
        if (backupExists) await adapter.remove(backup);
        return records;
      }
      if (backupExists) {
        const records = parseSyncAttentionRecordsCsv(await adapter.read(backup));
        await adapter.rename(backup, path2);
        if (stageExists) await adapter.remove(stage);
        return records;
      }
      if (stageExists) {
        const records = parseSyncAttentionRecordsCsv(await adapter.read(stage));
        await adapter.rename(stage, path2);
        return records;
      }
      return void 0;
    } finally {
      this.internalMutationDepth -= 1;
    }
  }
  async removeFileAndResidue(path2) {
    this.internalMutationDepth += 1;
    try {
      for (const candidate of syncPlanErrorsOperationalPaths(path2)) {
        if (await this.app.vault.adapter.exists(candidate, true)) await this.app.vault.adapter.remove(candidate);
      }
    } finally {
      this.internalMutationDepth -= 1;
    }
  }
  mergeRecordSets(...sets) {
    const byKey = /* @__PURE__ */ new Map();
    for (const records of sets) {
      for (const incoming of records) {
        const prior = byKey.get(incoming.key);
        if (!prior) {
          byKey.set(incoming.key, recordCopy(incoming));
          continue;
        }
        const newer = incoming.lastSeenAtMs > prior.lastSeenAtMs ? incoming : prior;
        const priorStateAtMs = recordStateAtMs(prior);
        const incomingStateAtMs = recordStateAtMs(incoming);
        const current2 = incomingStateAtMs > priorStateAtMs ? incoming.current : incomingStateAtMs < priorStateAtMs ? prior.current : prior.current || incoming.current;
        const resolvedCandidates = [prior.resolvedAtMs, incoming.resolvedAtMs].filter((value2) => value2 !== void 0);
        byKey.set(incoming.key, {
          ...newer,
          firstSeenAtMs: Math.min(prior.firstSeenAtMs, incoming.firstSeenAtMs),
          lastSeenAtMs: Math.max(prior.lastSeenAtMs, incoming.lastSeenAtMs),
          occurrenceCount: Math.max(prior.occurrenceCount, incoming.occurrenceCount),
          current: current2,
          ...current2 ? { resolvedAtMs: void 0 } : resolvedCandidates.length ? { resolvedAtMs: Math.max(...resolvedCandidates) } : {}
        });
      }
    }
    const all = [...byKey.values()];
    const current = all.filter((record) => record.current);
    const resolved = all.filter((record) => !record.current).sort((a, b) => b.lastSeenAtMs - a.lastSeenAtMs || a.key.localeCompare(b.key)).slice(0, DEFAULT_SYNC_ATTENTION_RETENTION);
    return [...current, ...resolved].sort((a, b) => a.lastSeenAtMs - b.lastSeenAtMs || a.key.localeCompare(b.key)).map(recordCopy);
  }
  mergeLegacy(current, legacy) {
    const records = current.map(recordCopy);
    let changed = false;
    for (const incoming of legacy) {
      const index = records.findIndex((record) => record.key === incoming.key);
      if (index < 0) {
        records.push(recordCopy(incoming));
        changed = true;
        continue;
      }
      const prior = records[index];
      if (incoming.lastSeenAtMs <= prior.lastSeenAtMs && (!incoming.current || prior.current)) continue;
      records[index] = {
        ...prior,
        ...incoming,
        firstSeenAtMs: Math.min(prior.firstSeenAtMs, incoming.firstSeenAtMs),
        occurrenceCount: Math.max(prior.occurrenceCount, incoming.occurrenceCount),
        current: prior.current || incoming.current,
        ...prior.current || incoming.current ? { resolvedAtMs: void 0 } : {}
      };
      changed = true;
    }
    return { records, changed };
  }
  installDeletionMonitor() {
    if (this.unsubscribe || this.disposed) return;
    const recreate = (path2) => {
      const affected = path2 === this.csvPath || this.csvPath.startsWith(`${path2}/`);
      if (!affected || this.disposed || this.internalMutationDepth > 0) return;
      const payload = (this.records ?? []).map(recordCopy);
      void this.saveSyncAttention(payload).catch((error) => this.onPersistenceFailure(error));
    };
    const deleted = this.app.vault.on("delete", (file) => recreate(file.path));
    const renamed = this.app.vault.on("rename", (file, oldPath) => {
      if (oldPath === this.csvPath && file.path === backupPath(this.csvPath)) return;
      recreate(oldPath);
    });
    this.unsubscribe = () => {
      this.app.vault.offref(deleted);
      this.app.vault.offref(renamed);
    };
  }
};

// src/product/runtime.ts
var PROTOCOL_VERSION = contractId("1");
var NOOP_DIAGNOSTICS = {
  trace: () => void 0,
  debug: () => void 0,
  info: () => void 0,
  error: () => void 0,
  failure: () => void 0
};
function driveSignalMessage(signal) {
  return "detail" in signal && signal.detail ? signal.detail : signal.kind;
}
function exclusionsEqual(a, b) {
  return a.length === b.length && a.every((value2, index) => value2 === b[index]);
}
var ProductRuntime = class {
  constructor(host) {
    this.host = host;
  }
  host;
  local;
  boundary;
  state;
  controller;
  scheduler;
  audit;
  attention;
  attentionPersistence;
  operationalExclusions = /* @__PURE__ */ new Set();
  unsubscribeSurface;
  notifications = new MeaningfulNotificationFilter();
  productController() {
    return this.controller;
  }
  googleBoundary() {
    return this.boundary;
  }
  async initialize() {
    const diagnostics = this.host.diagnostics ?? NOOP_DIAGNOSTICS;
    diagnostics.trace("runtime", "initialize-enter", { stage: "runtime-initialize" });
    let settings = this.host.settings();
    diagnostics.debug("runtime", "initialize-context", {
      operation: "initialize",
      clientIdConfigured: Boolean(settings.oauthClientId),
      redirectUriConfigured: Boolean(settings.oauthRedirectUri),
      clientSecretConfigured: Boolean(this.host.app.secretStorage.getSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID)),
      deviceIdentityPresent: Boolean(settings.deviceIdentity),
      vaultIdentityPresent: Boolean(settings.vaultIdentity),
      remoteRootPresent: Boolean(settings.remoteRootId)
    });
    await this.disposeProduct();
    diagnostics.trace("runtime", "initialize-dispose-complete", { stage: "dispose-previous-runtime" });
    if (!settings.deviceIdentity) {
      diagnostics.trace("runtime", "device-identity-generation-start", { stage: "device-identity" });
      const generated = generateDeviceIdentity();
      settings = { ...settings, deviceIdentity: String(generated) };
      await this.host.saveSettings(settings);
      diagnostics.trace("runtime", "device-identity-generation-complete", { stage: "device-identity", deviceIdentityPresent: true });
    } else {
      diagnostics.trace("runtime", "device-identity-ready", { stage: "device-identity", deviceIdentityPresent: true });
    }
    const reconciled = withManagedSyncPlanErrorsExclusion(this.host.settings());
    if (reconciled.syncPlanErrorsDirectory !== this.host.settings().syncPlanErrorsDirectory || reconciled.managedSyncPlanErrorsExclusion !== this.host.settings().managedSyncPlanErrorsExclusion || !exclusionsEqual(reconciled.userExclusionPatterns, this.host.settings().userExclusionPatterns)) await this.host.saveSettings(reconciled);
    let current = this.host.settings();
    const errorsPath = resolveSyncPlanErrorsPath(current.syncPlanErrorsDirectory).path;
    const pendingRelocation = current.syncPlanErrorsRelocation;
    this.operationalExclusions.clear();
    this.protectSyncPlanErrorsPath(errorsPath);
    if (pendingRelocation) {
      this.protectSyncPlanErrorsPath(pendingRelocation.sourcePath);
      this.protectSyncPlanErrorsPath(pendingRelocation.destinationPath);
    }
    this.attentionPersistence = new SyncPlanErrorsCsvPersistence(this.host.app, errorsPath, (error) => {
      void error;
      diagnostics.error("sync.controller", "sync-plan-errors-csv-recreation-failed", { stage: "attention-ledger", classification: "attention-ledger-persistence-failure", result: "failed" });
      this.host.notify("BRAIN sync plan errors file could not be recreated; safe synchronization may continue, but attention persistence needs review.");
    });
    try {
      const legacy = await this.host.data.loadSyncAttention();
      const initialized = pendingRelocation ? await this.attentionPersistence.initializePendingRelocation(pendingRelocation, errorsPath, legacy) : await this.attentionPersistence.initialize(legacy);
      if (initialized.migratedLegacyRecords) await this.host.data.saveSyncAttention([]);
      if (pendingRelocation) {
        await this.recoverSyncPlanErrorsRelocation(pendingRelocation, errorsPath);
        current = this.host.settings();
      }
    } catch (error) {
      void error;
      diagnostics.error("sync.controller", "sync-plan-errors-csv-initialization-failed", { stage: "attention-ledger", classification: "attention-ledger-persistence-failure", result: "failed" });
      this.host.notify("BRAIN sync plan errors file is unavailable; safe synchronization may continue, but attention persistence needs review.");
    }
    this.attention = new SyncAttentionLedger(this.attentionPersistence);
    if (!current.oauthClientId || !current.oauthRedirectUri) {
      diagnostics.debug("runtime", "initialize-deferred", { reason: "oauth-configuration-incomplete", runtimeInitialized: false });
      diagnostics.trace("runtime", "initialize-exit", { result: "oauth-configuration-incomplete" });
      return;
    }
    diagnostics.trace("runtime", "oauth-boundary-create-enter", { stage: "oauth-boundary" });
    this.boundary = createObsidianGoogleDriveBoundary({
      oauth: {
        clientId: current.oauthClientId,
        redirectUri: current.oauthRedirectUri,
        clientSecretStorageKey: GOOGLE_OAUTH_CLIENT_SECRET_ID
      },
      secretStorage: this.host.app.secretStorage,
      requestUrl: import_obsidian3.requestUrl
    });
    this.boundary.oauth.setDiagnosticLogger(this.host.diagnostics);
    diagnostics.trace("runtime", "oauth-boundary-create-exit", { stage: "oauth-boundary", runtimeInitialized: true });
    if (!current.vaultIdentity || !current.remoteRootId) {
      diagnostics.info("runtime", "runtime-initialized", { result: "oauth-ready" });
      diagnostics.trace("runtime", "initialize-exit", { result: "oauth-ready" });
      return;
    }
    diagnostics.trace("runtime", "local-adapter-create-enter", { stage: "local-adapter" });
    const rawLocal = await this.createLocalAdapter();
    diagnostics.trace("runtime", "local-adapter-create-exit", { stage: "local-adapter", result: import_obsidian3.Platform.isDesktopApp ? "desktop-adapter" : "mobile-adapter" });
    const configurationDirectory = await rawLocal.activeConfigurationDirectory();
    diagnostics.trace("runtime", "configuration-directory-ready", { stage: "path-scope" });
    const scope = new ProductPathScope(
      configurationDirectory,
      () => ({ userExclusionPatterns: this.host.settings().userExclusionPatterns }),
      () => this.operationalExclusions
    );
    const scopedLocal = new ScopedLocalVault(rawLocal, scope);
    const localTransactions = new ScopedLocalTransactionalMutationPort(this.host.app.vault.adapter, rawLocal, scope);
    const canonicalLocal = new CanonicalEvidenceLocalVault(scopedLocal, {}, localTransactions);
    this.local = canonicalLocal;
    const vaultIdentity = contractId(current.vaultIdentity);
    const deviceIdentity = contractId(current.deviceIdentity);
    const remoteRootId = contractId(current.remoteRootId);
    const stateContext = {
      expectation: current.firstSyncCompleted || current.recoveryInProgress ? "existing-pairing" : "new-installation",
      expectedVaultIdentity: vaultIdentity,
      expectedDeviceIdentity: deviceIdentity
    };
    const durableState = new PersistentSynchronizationStateStore(new IndexedDbStateByteStorage(`brain-google-drive-sync:${current.vaultIdentity}:${current.deviceIdentity}`));
    this.state = new SynchronizationStateAuthorityAdapter(durableState);
    diagnostics.trace("runtime", "state-store-ready", { stage: "state-store", storeReady: true });
    const remoteIdentity2 = async () => ({ rootId: remoteRootId, vaultIdentity, protocolVersion: PROTOCOL_VERSION });
    const snapshots = new ProductSnapshotAssembler(
      this.local,
      this.boundary.drive,
      this.state,
      stateContext,
      remoteIdentity2,
      (path2) => scope.isManagedLogical(path2),
      () => this.host.settings().scopeReconcileRequired,
      this.host.diagnostics,
      this.boundary.drive,
      this.state
    );
    const textVersions = new ProductTextVersionStore(
      new IndexedDbTextVersionPersistence(`brain-google-drive-sync-text:${current.vaultIdentity}:${current.deviceIdentity}`),
      this.local,
      this.boundary.drive
    );
    const conflicts = new ThreeWayConflictResolver(textVersions, textVersions, deviceIdentity);
    this.audit = new BoundedAuditHistory(this.host.data, current.auditRetention);
    diagnostics.trace("runtime", "audit-store-ready", { stage: "audit-store", storeReady: true });
    let controller;
    const executor = new ProductSynchronizationExecutor(this.local, this.boundary.drive, this.state, stateContext, () => controller.currentRunEvidence(), textVersions);
    controller = new ProductController({
      vaultIdentity,
      deviceIdentity,
      stateContext,
      stateStore: this.state,
      authorityStore: this.state,
      snapshotAssembler: snapshots,
      executor,
      conflictResolver: conflicts,
      reliableRemoteMutationPort: this.boundary.drive,
      localTransactionalMutationPort: canonicalLocal,
      remoteFolderCreateRecoveryReadPort: this.boundary.drive,
      plannerForTrigger: (trigger) => new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts, void 0, { trigger })),
      leasePort: new WebLocksRunLeasePort(),
      audit: this.audit,
      holderId: `brain-sync:${String(deviceIdentity)}:${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      automaticExecutionAllowed: (plan) => {
        const live = this.host.settings();
        if (!live.firstSyncCompleted || live.recoveryInProgress) return { allowed: false, reason: "Automatic synchronization remains disabled until trustworthy synchronization state is established." };
        return automaticNetworkDecision(plan, live, import_obsidian3.Platform.isMobile);
      },
      recoveryActive: () => this.host.settings().recoveryInProgress,
      onRecoveryGateChanged: async (active, backupId) => {
        const live = this.host.settings();
        const changed = {
          ...live,
          recoveryInProgress: active,
          recoveryBackupId: backupId ?? (active ? live.recoveryBackupId : ""),
          ...active ? { startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false } : {}
        };
        await this.host.saveSettings(changed);
        this.scheduler?.refresh();
      },
      onFullReconciliationCompleted: async () => {
        const live = this.host.settings();
        if (live.scopeReconcileRequired) await this.host.saveSettings({ ...live, scopeReconcileRequired: false });
      },
      onTrustedBaselineEstablished: async () => {
        const live = this.host.settings();
        if (!live.firstSyncCompleted) {
          await this.host.saveSettings({ ...live, firstSyncCompleted: true });
          this.scheduler?.refresh();
        }
      },
      diagnostics: this.host.diagnostics,
      attentionLedger: this.attention
    });
    this.controller = controller;
    this.unsubscribeSurface = controller.onSurface((surface) => {
      const message = this.notifications.next(surface);
      if (message) this.host.notify(message);
    });
    this.scheduler = new ProductSyncScheduler(this.local, controller, () => {
      const live = this.host.settings();
      const automaticReady = live.firstSyncCompleted && !live.recoveryInProgress;
      return {
        startupResumeEnabled: automaticReady && live.startupResumeEnabled,
        localChangeEnabled: automaticReady && live.localChangeEnabled,
        periodicEnabled: automaticReady && live.periodicEnabled,
        periodicIntervalMs: Math.max(6e4, live.periodicIntervalMinutes * 6e4),
        localDebounceMs: Math.max(250, live.localDebounceMs)
      };
    });
    this.scheduler.start();
    diagnostics.trace("runtime", "scheduler-started", { stage: "scheduler" });
    diagnostics.info("runtime", "runtime-initialized", { result: "product-ready" });
    diagnostics.trace("runtime", "initialize-exit", { result: "product-ready" });
  }
  async applySettingsChange(previous, next) {
    if (previous.auditRetention !== next.auditRetention) await this.audit?.setLimit(next.auditRetention);
    if (previous.periodicEnabled !== next.periodicEnabled || previous.periodicIntervalMinutes !== next.periodicIntervalMinutes || previous.firstSyncCompleted !== next.firstSyncCompleted || previous.recoveryInProgress !== next.recoveryInProgress) this.scheduler?.refresh();
    if (previous.syncPlanErrorsDirectory !== next.syncPlanErrorsDirectory) {
      if (previous.syncPlanErrorsRelocation) {
        throw new Error("A prior sync plan errors relocation is pending restart recovery.");
      }
      const priorPath = resolveSyncPlanErrorsPath(previous.syncPlanErrorsDirectory).path;
      const nextPath = resolveSyncPlanErrorsPath(next.syncPlanErrorsDirectory).path;
      const relocation = { sourcePath: priorPath, destinationPath: nextPath };
      this.protectSyncPlanErrorsPath(priorPath);
      this.protectSyncPlanErrorsPath(nextPath);
      try {
        if (!this.attentionPersistence) throw new Error("Sync plan errors persistence is unavailable for relocation.");
        const pending = withManagedSyncPlanErrorsExclusion({
          ...next,
          syncPlanErrorsDirectory: previous.syncPlanErrorsDirectory,
          managedSyncPlanErrorsExclusion: priorPath,
          syncPlanErrorsRelocation: relocation
        }, previous.syncPlanErrorsDirectory);
        await this.host.saveSettings(pending);
        await this.attentionPersistence.relocate(nextPath, async () => {
          const transitioned = withManagedSyncPlanErrorsExclusion({
            ...this.host.settings(),
            syncPlanErrorsDirectory: next.syncPlanErrorsDirectory,
            managedSyncPlanErrorsExclusion: nextPath,
            syncPlanErrorsRelocation: relocation
          }, next.syncPlanErrorsDirectory);
          await this.host.saveSettings(transitioned);
        });
        await this.finalizeSyncPlanErrorsRelocation(relocation);
      } catch {
        this.host.diagnostics?.error("sync.controller", "sync-plan-errors-csv-relocation-failed", { stage: "attention-ledger", classification: "attention-ledger-persistence-failure", result: "failed" });
        this.host.notify("BRAIN sync plan errors file could not be moved; the durable relocation journal keeps both locations excluded for restart recovery.");
      }
    }
    if (!exclusionsEqual(userExclusionsWithoutManaged(previous), userExclusionsWithoutManaged(next))) {
      if (!next.scopeReconcileRequired) await this.host.saveSettings({ ...this.host.settings(), scopeReconcileRequired: true });
      this.controller?.noteChangeDuringRun();
    }
  }
  async exportDiagnosticStateText() {
    if (!this.state) return JSON.stringify({ status: "unavailable", reason: "synchronization state is not initialized" });
    return new TextDecoder().decode(await this.state.exportDiagnosticState());
  }
  async readSyncAttention() {
    return this.attention?.current() ?? [];
  }
  async exportSyncAttentionCsv() {
    if (!this.attention) throw new Error("synchronization attention ledger is unavailable");
    return this.attention.renderCsv();
  }
  protectSyncPlanErrorsPath(path2) {
    for (const candidate of syncPlanErrorsOperationalPaths(path2)) this.operationalExclusions.add(candidate);
  }
  unprotectSyncPlanErrorsPath(path2) {
    for (const candidate of syncPlanErrorsOperationalPaths(path2)) this.operationalExclusions.delete(candidate);
  }
  async recoverSyncPlanErrorsRelocation(relocation, activePath) {
    if (!this.attentionPersistence) throw new Error("Sync plan errors persistence is unavailable for relocation recovery.");
    if (activePath === relocation.sourcePath) {
      await this.attentionPersistence.relocate(relocation.destinationPath, async () => {
        const live = this.host.settings();
        const destinationDirectory = directoryForSyncPlanErrorsPath(relocation.destinationPath);
        await this.host.saveSettings(withManagedSyncPlanErrorsExclusion({
          ...live,
          syncPlanErrorsDirectory: destinationDirectory,
          managedSyncPlanErrorsExclusion: relocation.destinationPath,
          syncPlanErrorsRelocation: relocation
        }, destinationDirectory));
      });
    } else if (activePath === relocation.destinationPath) {
      await this.attentionPersistence.cleanupRelocationSource(relocation.sourcePath);
    } else {
      throw new Error("Sync plan errors relocation journal does not match the configured active location.");
    }
    await this.finalizeSyncPlanErrorsRelocation(relocation);
  }
  async finalizeSyncPlanErrorsRelocation(relocation) {
    const live = this.host.settings();
    const destinationDirectory = directoryForSyncPlanErrorsPath(relocation.destinationPath);
    if (resolveSyncPlanErrorsPath(live.syncPlanErrorsDirectory).path !== relocation.destinationPath) {
      throw new Error("Sync plan errors destination is not the configured active location.");
    }
    const finalSettings = withManagedSyncPlanErrorsExclusion({
      ...live,
      syncPlanErrorsDirectory: destinationDirectory,
      managedSyncPlanErrorsExclusion: relocation.destinationPath,
      syncPlanErrorsRelocation: null,
      userExclusionPatterns: live.userExclusionPatterns.filter((pattern) => pattern !== relocation.sourcePath)
    }, destinationDirectory);
    await this.host.saveSettings(finalSettings);
    this.unprotectSyncPlanErrorsPath(relocation.sourcePath);
    this.protectSyncPlanErrorsPath(relocation.destinationPath);
  }
  async completeGoogleAuthorization(input) {
    const diagnostics = this.host.diagnostics ?? NOOP_DIAGNOSTICS;
    diagnostics.trace("oauth.callback", "runtime-callback-enter", { stage: "callback-processing" });
    const oauth = this.boundary?.oauth;
    if (!oauth) {
      diagnostics.error("oauth.callback", "runtime-callback-unavailable", {
        operation: "complete-authorization",
        stage: "callback-processing",
        classification: "missing-oauth-runtime",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: false
      });
      return { ok: false, reason: "missing-transaction" };
    }
    const result = await oauth.completeAuthorization(input);
    diagnostics.trace("oauth.callback", "runtime-callback-exit", { stage: "callback-processing", result: result.ok ? "completed" : result.reason });
    return result;
  }
  async authenticate(browser = { openExternal: openAuthorizationInSystemBrowser }) {
    const diagnostics = this.host.diagnostics ?? NOOP_DIAGNOSTICS;
    diagnostics.trace("oauth.runtime", "runtime-authenticate-enter", { stage: "runtime-authenticate" });
    const boundary = this.boundary;
    if (!boundary) {
      const error = new Error("Configure OAuth client ID and redirect URI first.");
      diagnostics.failure("oauth.runtime", "runtime-authenticate-failed", error, {
        operation: "authenticate",
        stage: "precondition",
        classification: "oauth-runtime-unavailable",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: false
      });
      throw error;
    }
    const mobile = import_obsidian3.Platform.isMobileApp;
    diagnostics.debug("oauth.runtime", "authentication-context", {
      operation: "authenticate",
      runtimeInitialized: true,
      clientIdConfigured: Boolean(boundary.oauth.config.clientId),
      redirectUriConfigured: Boolean(boundary.oauth.config.redirectUri),
      clientSecretConfigured: Boolean(this.host.app.secretStorage.getSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID)),
      callbackRegistrationActive: true,
      browserApiPresent: typeof globalThis.open === "function",
      launcher: mobile ? "external-browser" : "system-browser",
      target: mobile ? "_external" : "_blank",
      transactionPrepared: false,
      scopeExact: true
    });
    const instrumentedBrowser = instrumentAuthorizationBrowserLauncher(diagnostics, browser, {
      target: mobile ? "_external" : "_blank",
      launcher: mobile ? "external-browser" : "system-browser",
      browserApiPresent: typeof globalThis.open === "function"
    });
    await beginGoogleAuthorization(boundary.oauth, instrumentedBrowser);
    diagnostics.trace("oauth.runtime", "runtime-authenticate-exit", { stage: "runtime-authenticate", result: "authorization-launch-call-returned" });
  }
  async createManagedRemote() {
    const boundary = this.boundary;
    if (!boundary) throw new Error("Configure and authenticate Google OAuth first.");
    let settings = this.host.settings();
    let vaultIdentity = settings.vaultIdentity;
    if (!vaultIdentity) {
      vaultIdentity = `vault:${globalThis.crypto.randomUUID()}`;
      settings = { ...settings, vaultIdentity };
      await this.host.saveSettings(settings);
    }
    const result = await boundary.drive.createManagedRoot(contractId(vaultIdentity), PROTOCOL_VERSION);
    if (!result.ok) throw new Error(driveSignalMessage(result.signal));
    await this.host.saveSettings({
      ...this.host.settings(),
      remoteRootId: String(result.value.rootId),
      vaultIdentity: String(result.value.vaultIdentity),
      firstSyncCompleted: false,
      recoveryInProgress: false,
      recoveryBackupId: "",
      scopeReconcileRequired: false,
      startupResumeEnabled: false,
      localChangeEnabled: false,
      periodicEnabled: false
    });
    await this.initialize();
    return result.value;
  }
  async pairManagedRemote() {
    const boundary = this.boundary;
    const settings = this.host.settings();
    if (!boundary) throw new Error("Configure and authenticate Google OAuth first.");
    if (!settings.vaultIdentity || !settings.remoteRootId) throw new Error("Enter the expected BRAIN vault identity and stable Drive remote root ID.");
    const expected = contractId(settings.vaultIdentity);
    const root = contractId(settings.remoteRootId);
    const result = await boundary.drive.pairManagedRoot(root, expected);
    if (!result.ok) throw new Error(driveSignalMessage(result.signal));
    if (result.value.status !== "valid") throw new Error(`Pairing refused: ${result.value.status}`);
    await this.host.saveSettings({ ...settings, firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "", scopeReconcileRequired: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.initialize();
    return result.value.identity;
  }
  async deauthorize() {
    this.boundary?.oauth.clearTokens();
    const settings = this.host.settings();
    await this.host.saveSettings({ ...settings, remoteRootId: "", firstSyncCompleted: false, recoveryInProgress: false, recoveryBackupId: "", scopeReconcileRequired: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false });
    await this.disposeProduct();
  }
  async disposeProduct() {
    this.scheduler?.stop();
    this.scheduler = void 0;
    this.unsubscribeSurface?.();
    this.unsubscribeSurface = void 0;
    await this.controller?.request({ kind: "cancel-active-sync" });
    this.controller = void 0;
    this.attentionPersistence?.dispose();
    this.attentionPersistence = void 0;
    const disposable = this.local;
    disposable?.dispose?.();
    this.local = void 0;
    this.boundary = void 0;
    this.state = void 0;
    this.audit = void 0;
    this.attention = void 0;
  }
  async createLocalAdapter() {
    if (import_obsidian3.Platform.isDesktopApp) {
      const module2 = await Promise.resolve().then(() => (init_desktop_local_vault(), desktop_local_vault_exports));
      return module2.createDesktopLocalVaultAdapter(this.host.app);
    }
    this.host.diagnostics?.info("runtime", "mobile-vault-boundary-selected", { result: "mobile-adapter" });
    return new ObsidianLocalVaultAdapter(this.host.app, {
      accessBoundary: new MobileVaultAccessBoundary(),
      adapterMutationFallback: true
    });
  }
};

// src/product/settings-tab.ts
var import_obsidian4 = require("obsidian");
init_exclusions();
init_config_policy();
var BrainSyncSettingsTab = class extends import_obsidian4.PluginSettingTab {
  constructor(host) {
    super(host.app, host.plugin);
    this.host = host;
  }
  host;
  display() {
    const settings = this.host.settings();
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "BRAIN Google Drive Sync" });
    containerEl.createEl("p", { text: `Device identity: ${settings.deviceIdentity || "not established"}` });
    containerEl.createEl("p", { text: `Vault identity: ${settings.vaultIdentity || "not established"}` });
    containerEl.createEl("p", { text: `Managed remote: ${settings.remoteRootId || "not paired"}` });
    containerEl.createEl("p", { text: `First synchronization: ${settings.firstSyncCompleted ? "completed" : "preview/execute still required; automatic sync remains disabled"}` });
    if (settings.recoveryInProgress) containerEl.createEl("p", { text: `Recovery reconstruction is active. Automatic/destructive authority remains gated. Backup: ${settings.recoveryBackupId || "created when reconstruction executes"}` });
    new import_obsidian4.Setting(containerEl).setName("Google OAuth client ID").setDesc("Client ID from your own Google Cloud project.").addText((text) => text.setValue(settings.oauthClientId).onChange(async (value2) => this.host.updateSettings({ oauthClientId: value2.trim() })));
    let pendingClientSecret = "";
    const clientSecretConfigured = Boolean(this.host.app.secretStorage.getSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID));
    new import_obsidian4.Setting(containerEl).setName("Google OAuth client secret").setDesc(clientSecretConfigured ? "Saved in this device's Obsidian SecretStorage. Enter a value only to replace it." : "Required by the configured Web application client. Saved only in this device's Obsidian SecretStorage.").addText((text) => {
      text.inputEl.type = "password";
      text.setPlaceholder(clientSecretConfigured ? "Saved locally" : "Enter client secret");
      text.onChange((value2) => {
        pendingClientSecret = value2;
      });
    }).addButton((button) => button.setButtonText("Save").onClick(() => {
      const secret = pendingClientSecret.trim();
      if (!secret) {
        new import_obsidian4.Notice("Enter a Google OAuth client secret before saving.");
        return;
      }
      this.host.app.secretStorage.setSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID, secret);
      pendingClientSecret = "";
      new import_obsidian4.Notice("Google OAuth client secret saved in this device's Obsidian SecretStorage.");
      this.display();
    })).addExtraButton((button) => button.setIcon("trash-2").setTooltip("Clear saved Google OAuth client secret").onClick(() => {
      this.host.app.secretStorage.setSecret(GOOGLE_OAUTH_CLIENT_SECRET_ID, "");
      pendingClientSecret = "";
      new import_obsidian4.Notice("Saved Google OAuth client secret cleared from this device.");
      this.display();
    }));
    new import_obsidian4.Setting(containerEl).setName("OAuth redirect URI").setDesc("HTTPS callback URL or supported return URI configured in the same Google OAuth client.").addText((text) => text.setValue(settings.oauthRedirectUri).onChange(async (value2) => this.host.updateSettings({ oauthRedirectUri: value2.trim() })));
    new import_obsidian4.Setting(containerEl).setName("Authenticate / reauthenticate").setDesc("Authorization opens outside the plugin and returns to this device.").addButton((button) => button.setButtonText("Authenticate").onClick(() => {
      const attemptId = this.host.authenticationButtonPressed();
      return this.host.authenticate(attemptId);
    }));
    new import_obsidian4.Setting(containerEl).setName("BRAIN vault identity").setDesc("Stable non-secret identity. Additional devices must deliberately confirm the same identity when pairing.").addText((text) => text.setValue(settings.vaultIdentity).onChange(async (value2) => this.host.updateSettings({ vaultIdentity: value2.trim() })));
    new import_obsidian4.Setting(containerEl).setName("Managed remote root ID").setDesc("Stable Google Drive folder ID for explicit pairing. A folder name alone is never sufficient.").addText((text) => text.setValue(settings.remoteRootId).onChange(async (value2) => this.host.updateSettings({ remoteRootId: value2.trim() })));
    new import_obsidian4.Setting(containerEl).setName("Create managed BRAIN Sync remote").addButton((button) => button.setButtonText("Create").onClick(() => this.host.createManagedRemote()));
    new import_obsidian4.Setting(containerEl).setName("Validate and pair existing remote").addButton((button) => button.setButtonText("Pair").onClick(() => this.host.pairManagedRemote()));
    new import_obsidian4.Setting(containerEl).setName("Deauthorize this device").setDesc("Clears authentication and local pairing only. It never deletes local or shared vault content.").addButton((button) => button.setButtonText("Deauthorize").setWarning().onClick(() => this.host.clearAuthenticationAndPairing()));
    containerEl.createEl("h3", { text: "Automatic synchronization" });
    this.toggle(containerEl, "Startup / resume", "Run after vault readiness or app resume.", settings.startupResumeEnabled, (value2) => ({ startupResumeEnabled: value2 }));
    this.toggle(containerEl, "Local changes", "Debounce local changes into a later synchronization pass.", settings.localChangeEnabled, (value2) => ({ localChangeEnabled: value2 }));
    this.toggle(containerEl, "Periodic remote reconciliation", "Poll remote changes at a conservative cadence.", settings.periodicEnabled, (value2) => ({ periodicEnabled: value2 }));
    new import_obsidian4.Setting(containerEl).setName("Periodic cadence (minutes)").addText((text) => text.setValue(String(settings.periodicIntervalMinutes)).onChange(async (value2) => {
      const parsed = Number(value2);
      if (Number.isFinite(parsed) && parsed >= 1) await this.host.updateSettings({ periodicIntervalMinutes: parsed });
    }));
    this.toggle(containerEl, "Wi-Fi only automatic sync on mobile", "If the mobile host cannot prove Wi-Fi, automatic work is deferred.", settings.wifiOnlyAutomatic, (value2) => ({ wifiOnlyAutomatic: value2 }));
    this.toggle(containerEl, "Wi-Fi only large transfers on mobile", "Large automatic transfers defer unless Wi-Fi is provable.", settings.wifiOnlyLargeTransfers, (value2) => ({ wifiOnlyLargeTransfers: value2 }));
    containerEl.createEl("h3", { text: "Vault exclusions" });
    const resolvedErrorsPath = resolveSyncPlanErrorsPath(settings.syncPlanErrorsDirectory);
    let pendingErrorsDirectory = settings.syncPlanErrorsDirectory;
    new import_obsidian4.Setting(containerEl).setName("Sync plan errors directory").setDesc("Optional safe vault-relative containing directory. Leave blank for the vault root; the filename is always sync-plan-errors.csv.").addText((text) => text.setPlaceholder("Vault root").setValue(settings.syncPlanErrorsDirectory).onChange((value2) => {
      pendingErrorsDirectory = value2;
    })).addButton((button) => button.setButtonText("Apply").onClick(async () => {
      try {
        const updated = withManagedSyncPlanErrorsExclusion(this.host.settings(), pendingErrorsDirectory);
        await this.host.updateSettings({
          syncPlanErrorsDirectory: updated.syncPlanErrorsDirectory,
          managedSyncPlanErrorsExclusion: updated.managedSyncPlanErrorsExclusion,
          userExclusionPatterns: updated.userExclusionPatterns
        });
        this.display();
      } catch (error) {
        new import_obsidian4.Notice(error instanceof Error ? error.message : String(error));
      }
    }));
    containerEl.createEl("p", { text: `Resolved sync plan errors file: ${resolvedErrorsPath.path}` });
    new import_obsidian4.Setting(containerEl).setName("Additional exclusion patterns").setDesc("One path/glob-like pattern per line. The exact sync-plan-errors.csv entry is managed automatically and cannot be removed.").addTextArea((area) => area.setValue(settings.userExclusionPatterns.join("\n")).onChange(async (value2) => {
      const patterns = value2.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      const updated = withManagedSyncPlanErrorsExclusion({ ...this.host.settings(), userExclusionPatterns: patterns });
      await this.host.updateSettings({
        userExclusionPatterns: updated.userExclusionPatterns,
        managedSyncPlanErrorsExclusion: updated.managedSyncPlanErrorsExclusion
      });
    }));
    const exclusions = containerEl.createEl("ul");
    for (const rule of defaultLocalExclusionRules()) exclusions.createEl("li", { text: `${rule.pattern} \u2014 ${rule.description}` });
    containerEl.createEl("h3", { text: "Audit/history" });
    new import_obsidian4.Setting(containerEl).setName("Audit retention records").setDesc("Bounded device-local metadata history; 1\u201310,000 records. No note content or OAuth secrets are stored in audit records.").addText((text) => text.setValue(String(settings.auditRetention)).onChange(async (value2) => {
      const parsed = Number(value2);
      if (Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 1e4) await this.host.updateSettings({ auditRetention: parsed });
    }));
    containerEl.createEl("h3", { text: "Diagnostics / Logging" });
    new import_obsidian4.Setting(containerEl).setName("Log detail level").setDesc("Higher detail adds execution context and ordering, never secret disclosure.").addDropdown((dropdown) => {
      for (const level of DIAGNOSTIC_LOG_LEVELS) dropdown.addOption(level, level.charAt(0).toUpperCase() + level.slice(1));
      dropdown.setValue(settings.diagnosticLogLevel).onChange(async (value2) => {
        await this.host.updateSettings({ diagnosticLogLevel: value2 });
      });
    });
    this.toggle(containerEl, "Console mirroring", "Mirror only the same already-sanitized retained records to the console.", settings.diagnosticConsoleMirror, (value2) => ({ diagnosticConsoleMirror: value2 }));
    new import_obsidian4.Setting(containerEl).setName("Maximum retained records").setDesc(`Device-local bounded ring buffer; ${MIN_DIAGNOSTIC_RETENTION}\u2013${MAX_DIAGNOSTIC_RETENTION} records.`).addText((text) => text.setValue(String(settings.diagnosticRetention)).onChange(async (value2) => {
      const parsed = Number(value2);
      if (Number.isSafeInteger(parsed) && parsed >= MIN_DIAGNOSTIC_RETENTION && parsed <= MAX_DIAGNOSTIC_RETENTION) {
        await this.host.updateSettings({ diagnosticRetention: parsed });
      }
    }));
    const summary = this.host.diagnosticsSummary();
    containerEl.createEl("p", { text: `Current retained records: ${summary.count}` });
    containerEl.createEl("p", { text: `Oldest retained record: ${summary.oldest ? `#${summary.oldest.sequence} (${summary.oldest.timestamp})` : "none"}` });
    containerEl.createEl("p", { text: `Newest retained record: ${summary.newest ? `#${summary.newest.sequence} (${summary.newest.timestamp})` : "none"}` });
    new import_obsidian4.Setting(containerEl).setName("Copy log to clipboard").setDesc("Copies the complete current bounded log as deterministic plaintext records.").addButton((button) => button.setButtonText("Copy log").onClick(() => this.host.copyDiagnosticLog()));
    const shareSupported = canShareDiagnosticLogFile();
    new import_obsidian4.Setting(containerEl).setName("Share / export log as .txt").setDesc(shareSupported ? "Opens the system share sheet with a real text file. On iPhone, choose Save to Files to place the log in the Files app." : "File sharing is not exposed by this runtime. Clipboard export remains available above.").addButton((button) => button.setButtonText("Share .txt").setDisabled(!shareSupported).onClick(() => this.host.shareDiagnosticLog()));
    new import_obsidian4.Setting(containerEl).setName("Clear log").setDesc("Clears diagnostic records on this device only; audit, OAuth credentials, pairing, and sync state are unchanged.").addButton((button) => button.setButtonText("Clear").setWarning().onClick(async () => {
      await this.host.clearDiagnosticLog();
      this.display();
    }));
    containerEl.createEl("h3", { text: "OAuth diagnostic probes" });
    new import_obsidian4.Setting(containerEl).setName("Test external browser").setDesc("Direct user-gesture probe. Opens a fixed harmless HTTPS page with the Obsidian _external target; no OAuth/runtime initialization occurs.").addButton((button) => button.setButtonText("Test external browser").onClick(() => this.host.testExternalBrowser()));
    new import_obsidian4.Setting(containerEl).setName("Test delayed external browser").setDesc("Same fixed page and _external target after one controlled Promise microtask boundary; no OAuth transaction occurs.").addButton((button) => button.setButtonText("Test delayed external browser").onClick(() => this.host.testDelayedExternalBrowser()));
    containerEl.createEl("h3", { text: "Portable configuration allowlist" });
    containerEl.createEl("p", { text: "Only the explicitly portable entries below are mapped through a private managed-remote namespace to the runtime active configuration directory; the configuration directory is never synchronized wholesale." });
    const portable = containerEl.createEl("ul");
    for (const entry2 of new SelectiveConfigurationPolicy().describePortablePolicy()) portable.createEl("li", { text: `${entry2.relativePath} \u2014 ${entry2.classification.classification}` });
    containerEl.createEl("p", { text: "Unknown configuration, third-party plugin settings, workspace/session state, secrets, device identity, synchronization operational state, and diagnostics remain device-local by default." });
  }
  toggle(container, name, description, value2, patch) {
    new import_obsidian4.Setting(container).setName(name).setDesc(description).addToggle((toggle) => toggle.setValue(value2).onChange(async (next) => this.host.updateSettings(patch(next))));
  }
};

// src/main.ts
var BrainGoogleDriveSyncPlugin = class extends import_obsidian5.Plugin {
  currentSettings = { ...DEFAULT_SETTINGS };
  dataRepository;
  diagnostics;
  runtime;
  statusEl;
  unsubscribeStatus;
  lastOAuthDiagnosticText = "No Google OAuth completion result is available for this plugin lifetime.";
  async onload() {
    this.dataRepository = new PluginDataRepository({ loadData: () => this.loadData(), saveData: (data) => this.saveData(data) });
    this.currentSettings = await this.dataRepository.loadSettings();
    this.diagnostics = new DiagnosticLogger({
      persistence: this.dataRepository,
      level: this.currentSettings.diagnosticLogLevel,
      retentionLimit: this.currentSettings.diagnosticRetention,
      consoleMirror: this.currentSettings.diagnosticConsoleMirror,
      platform: import_obsidian5.Platform.isMobileApp ? "mobile" : import_obsidian5.Platform.isDesktopApp ? "desktop" : "unknown"
    });
    await this.diagnostics.initialize();
    this.statusEl = this.addStatusBarItem();
    this.statusEl.setText("BRAIN sync: setup required");
    this.runtime = new ProductRuntime({
      app: this.app,
      plugin: this,
      diagnostics: this.diagnostics,
      settings: () => this.currentSettings,
      data: this.dataRepository,
      saveSettings: (settings) => this.replaceSettings(settings),
      notify: (message) => new import_obsidian5.Notice(message)
    });
    registerGoogleOAuthReturn(
      this,
      (input) => this.completeGoogleAuthorizationWithDiagnostics(input),
      (result) => {
        this.lastOAuthDiagnosticText = result.ok ? "Google authentication completed." : `Google authentication failed: ${result.reason}${formatOAuthDiagnosticSuffix(result)}`;
        new import_obsidian5.Notice(this.lastOAuthDiagnosticText, result.ok ? 5e3 : 3e4);
      }
    );
    this.diagnostics.debug("oauth.callback", "callback-registration-active", { callbackRegistrationActive: true });
    this.addSettingTab(new BrainSyncSettingsTab({
      app: this.app,
      plugin: this,
      settings: () => this.currentSettings,
      updateSettings: (patch) => this.updateSettings(patch),
      authenticationButtonPressed: () => this.authenticationButtonPressed(),
      authenticate: (attemptId) => this.authenticate(attemptId),
      createManagedRemote: () => this.createManagedRemote(),
      pairManagedRemote: () => this.pairManagedRemote(),
      clearAuthenticationAndPairing: () => this.deauthorize(),
      diagnosticsSummary: () => this.diagnosticsSummary(),
      copyDiagnosticLog: () => this.copyDiagnosticLog(),
      shareDiagnosticLog: () => this.shareDiagnosticLog(),
      clearDiagnosticLog: () => this.clearDiagnosticLog(),
      testExternalBrowser: () => this.testExternalBrowser(),
      testDelayedExternalBrowser: () => this.testDelayedExternalBrowser()
    }));
    this.addCommand({ id: "sync-now", name: "Sync now", callback: () => void this.openManualPreview() });
    this.addCommand({ id: "verify-reconcile-vault", name: "Verify/Reconcile Vault", callback: () => void this.openVerifyPreview() });
    this.addCommand({ id: "pause-sync", name: "Pause synchronization", callback: () => void this.control({ kind: "pause" }) });
    this.addCommand({ id: "resume-sync", name: "Resume synchronization", callback: () => void this.control({ kind: "resume" }) });
    this.addCommand({ id: "cancel-active-sync", name: "Cancel active synchronization", callback: () => void this.control({ kind: "cancel-active-sync" }) });
    this.addCommand({ id: "authenticate-google", name: "Authenticate with Google", callback: () => {
      const attemptId = this.beginAuthenticationAttempt("command");
      void this.authenticate(attemptId);
    } });
    this.addCommand({ id: "copy-last-oauth-diagnostic", name: "Copy last Google authentication diagnostic", callback: () => void this.copyLastOAuthDiagnostic() });
    this.addCommand({ id: "open-sync-attention", name: "Open synchronization attention", callback: () => this.openAttention() });
    this.addCommand({ id: "open-sync-history", name: "Open synchronization history", callback: () => this.openHistory() });
    this.addCommand({ id: "copy-sync-diagnostics", name: "Copy synchronization diagnostics", callback: () => void this.copyDiagnostics() });
    this.addCommand({ id: "copy-device-diagnostic-log", name: "Copy device diagnostic log", callback: () => void this.copyDiagnosticLog() });
    try {
      await this.runtime.initialize();
      this.bindStatus();
      this.refreshStatus();
    } catch (error) {
      this.diagnostics.failure("runtime", "initialization-failed", error, {
        operation: "initialize",
        stage: "plugin-onload",
        classification: "runtime-initialization-failure",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: false
      });
      const safe = normalizeDiagnosticError(error).safeMessage ?? "Initialization failed.";
      this.statusEl.setText("BRAIN sync: blocked");
      new import_obsidian5.Notice(`BRAIN sync initialization blocked: ${safe}`);
    }
  }
  async onunload() {
    this.unsubscribeStatus?.();
    this.unsubscribeStatus = void 0;
    await this.runtime?.disposeProduct();
    await this.diagnostics?.flush();
  }
  async replaceSettings(settings) {
    const durable = { ...settings, userExclusionPatterns: [...settings.userExclusionPatterns] };
    await this.dataRepository?.saveSettings(durable);
    this.currentSettings = durable;
  }
  async updateSettings(patch) {
    const previous = { ...this.currentSettings, userExclusionPatterns: [...this.currentSettings.userExclusionPatterns] };
    const next = { ...this.currentSettings, ...patch };
    if (!next.firstSyncCompleted || next.recoveryInProgress) {
      next.startupResumeEnabled = false;
      next.localChangeEnabled = false;
      next.periodicEnabled = false;
    }
    const relocatingSyncPlanErrors = previous.syncPlanErrorsDirectory !== next.syncPlanErrorsDirectory;
    if (relocatingSyncPlanErrors) {
      if (!this.runtime) throw new Error("Sync plan errors persistence is unavailable for relocation.");
      await this.runtime.applySettingsChange(previous, next);
    } else {
      await this.replaceSettings(next);
    }
    this.diagnostics?.configure({
      level: this.currentSettings.diagnosticLogLevel,
      retentionLimit: this.currentSettings.diagnosticRetention,
      consoleMirror: this.currentSettings.diagnosticConsoleMirror
    });
    if (!relocatingSyncPlanErrors) await this.runtime?.applySettingsChange(previous, this.currentSettings);
  }
  authenticationButtonPressed() {
    const attemptId = this.beginAuthenticationAttempt("settings-button");
    this.diagnostics?.trace("oauth.settings", "authenticate-click-handler-enter", { source: "settings-button" }, attemptId);
    return attemptId;
  }
  beginAuthenticationAttempt(source) {
    if (!this.diagnostics) return 1;
    return this.diagnostics.beginAttempt(source);
  }
  async authenticate(attemptId) {
    const diagnostics = this.diagnostics;
    diagnostics?.activateAttempt(attemptId);
    diagnostics?.trace("oauth.plugin", "plugin-authenticate-enter", { stage: "plugin-authenticate" }, attemptId);
    diagnostics?.debug("oauth.plugin", "authentication-preconditions", {
      operation: "authenticate",
      clientIdConfigured: Boolean(this.currentSettings.oauthClientId),
      redirectUriConfigured: Boolean(this.currentSettings.oauthRedirectUri),
      clientSecretConfigured: Boolean(this.app.secretStorage.getSecret("brain-google-client-secret")),
      runtimeInitialized: Boolean(this.runtime),
      callbackRegistrationActive: true,
      browserApiPresent: typeof globalThis.open === "function",
      launcher: import_obsidian5.Platform.isMobileApp ? "external-browser" : "system-browser",
      target: import_obsidian5.Platform.isMobileApp ? "_external" : "_blank"
    }, attemptId);
    try {
      if (!this.runtime) throw new Error("The synchronization runtime is unavailable.");
      if (!this.currentSettings.oauthClientId || !this.currentSettings.oauthRedirectUri) throw new Error("Configure OAuth client ID and redirect URI first.");
      diagnostics?.trace("oauth.plugin", "runtime-initialize-start", { stage: "runtime-initialize" }, attemptId);
      await this.runtime.initialize();
      diagnostics?.trace("oauth.plugin", "runtime-initialize-complete", { stage: "runtime-initialize", runtimeInitialized: true }, attemptId);
      this.bindStatus();
      diagnostics?.trace("oauth.plugin", "runtime-authenticate-call-start", { stage: "runtime-authenticate" }, attemptId);
      await this.runtime.authenticate(import_obsidian5.Platform.isMobileApp ? { openExternal: openAuthorizationInExternalBrowser } : void 0);
      diagnostics?.trace("oauth.plugin", "runtime-authenticate-call-return", { stage: "runtime-authenticate", result: "authorization-launch-call-returned" }, attemptId);
      diagnostics?.info("oauth.plugin", "authentication-method-returned", { result: "authorization-launch-call-returned" }, attemptId);
      diagnostics?.trace("oauth.plugin", "plugin-authenticate-exit", { stage: "plugin-authenticate", result: "awaiting-callback" }, attemptId);
    } catch (error) {
      diagnostics?.failure("oauth.plugin", "authentication-attempt-failed", error, {
        operation: "authenticate",
        stage: "initiation",
        classification: "authentication-initiation-failure",
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: Boolean(this.runtime)
      }, attemptId);
      const safe = normalizeDiagnosticError(error).safeMessage ?? "Authentication initiation failed.";
      new import_obsidian5.Notice(`Authentication could not start: ${safe}`);
      diagnostics?.endAttempt(attemptId);
    }
  }
  async completeGoogleAuthorizationWithDiagnostics(input) {
    const diagnostics = this.diagnostics;
    const attemptId = diagnostics?.currentAttemptId();
    diagnostics?.info("oauth.callback", "callback-received", void 0, attemptId);
    diagnostics?.debug("oauth.callback", "callback-context", {
      operation: "complete-authorization",
      codePresent: Boolean(input.code),
      statePresent: Boolean(input.state),
      errorPresent: Boolean(input.error),
      callbackRegistrationActive: true,
      runtimeInitialized: Boolean(this.runtime)
    }, attemptId);
    diagnostics?.trace("oauth.callback", "callback-processing-start", { stage: "callback-processing" }, attemptId);
    const result = this.runtime ? await this.runtime.completeGoogleAuthorization(input) : { ok: false, reason: "missing-transaction" };
    if (result.ok) {
      diagnostics?.trace("oauth.callback", "callback-processing-complete", { stage: "callback-processing", result: "completed" }, attemptId);
      diagnostics?.info("oauth.callback", "authentication-attempt-completed", { result: "authenticated" }, attemptId);
    } else {
      diagnostics?.error("oauth.callback", "authentication-attempt-failed", {
        operation: "complete-authorization",
        stage: "callback-processing",
        classification: `oauth-${result.reason}`,
        reason: result.reason,
        safeMessage: result.detail ?? result.reason,
        retryable: true,
        recoveryIntended: true,
        runtimeInitialized: Boolean(this.runtime)
      }, attemptId);
    }
    if (attemptId !== void 0) diagnostics?.endAttempt(attemptId);
    return result;
  }
  async createManagedRemote() {
    try {
      if (!this.runtime) return;
      const identity = await this.runtime.createManagedRemote();
      this.bindStatus();
      new import_obsidian5.Notice(`Created managed BRAIN Sync remote ${String(identity.rootId)}.`);
    } catch (error) {
      this.noticeError("Managed remote creation failed", error);
    }
  }
  async pairManagedRemote() {
    try {
      if (!this.runtime) return;
      const identity = await this.runtime.pairManagedRemote();
      this.bindStatus();
      new import_obsidian5.Notice(`Validated BRAIN Sync pairing for ${String(identity.vaultIdentity)}.`);
    } catch (error) {
      this.noticeError("Managed remote pairing failed", error);
    }
  }
  async deauthorize() {
    try {
      await this.runtime?.deauthorize();
      this.bindStatus();
      this.refreshStatus();
      new import_obsidian5.Notice("This device was deauthorized and unpaired locally. No local or shared vault content was deleted.");
    } catch (error) {
      this.noticeError("Device deauthorization failed", error);
    }
  }
  async openManualPreview() {
    const runId = beginManualSyncDiagnostics(this.diagnostics);
    const controller = this.runtime?.productController();
    if (!controller) {
      if (runId !== void 0) {
        this.diagnostics?.syncInfo("sync.controller", "sync-run-deferred", runId, { stage: "runtime-precondition", result: "runtime-unavailable", runtimeInitialized: false });
        this.diagnostics?.endSyncRun(runId);
      }
      new import_obsidian5.Notice("Complete Google authentication and explicit BRAIN remote pairing first.");
      return;
    }
    if (runId !== void 0) this.diagnostics?.syncDebug("sync.controller", "manual-sync-runtime-ready", runId, { stage: "runtime-precondition", runtimeInitialized: true });
    const plan = await controller.previewManual(runId);
    if (plan) {
      presentManualSyncPreview(
        () => new PlanPreviewModal(this.app, plan, controller, runId).open(),
        () => controller.recordPreviewPresented(plan.planId, runId),
        (error) => controller.recordPreviewPresentationFailure(plan.planId, error, runId)
      );
    }
  }
  async openVerifyPreview() {
    const controller = this.runtime?.productController();
    if (!controller) {
      new import_obsidian5.Notice("Complete Google authentication and explicit BRAIN remote pairing first.");
      return;
    }
    const plan = await controller.previewVerifyReconcile();
    if (plan) new PlanPreviewModal(this.app, plan, controller).open();
  }
  async control(action) {
    const controller = this.runtime?.productController();
    if (!controller) {
      new import_obsidian5.Notice("BRAIN synchronization is not currently configured.");
      return;
    }
    await controller.request(action);
  }
  openAttention() {
    const controller = this.runtime?.productController();
    if (!controller) {
      new import_obsidian5.Notice("BRAIN synchronization is not currently configured.");
      return;
    }
    new SyncAttentionModal(this.app, controller, {
      recoveryBackupId: this.currentSettings.recoveryBackupId,
      copyDiagnostics: () => this.copyDiagnostics(),
      loadAttention: () => this.runtime.readSyncAttention(),
      loadAttentionCsv: () => this.runtime.exportSyncAttentionCsv(),
      copyAttentionCsv: (csv) => copySyncAttentionCsv(csv).then(() => {
        new import_obsidian5.Notice("BRAIN synchronization attention CSV copied.");
      }).catch((error) => {
        this.noticeError("Attention CSV could not be copied", error);
      }),
      shareAttentionCsv: (csv) => shareSyncAttentionCsv(csv).catch((error) => {
        this.noticeError("Attention CSV could not be shared", error);
      })
    }).open();
  }
  openHistory() {
    const controller = this.runtime?.productController();
    if (!controller) {
      new import_obsidian5.Notice("BRAIN synchronization is not currently configured.");
      return;
    }
    new AuditHistoryModal(this.app, () => controller.readAuditHistory()).open();
  }
  async copyDiagnostics() {
    try {
      const text = await this.runtime?.exportDiagnosticStateText();
      if (!text) throw new Error("synchronization runtime is unavailable");
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error("clipboard API is unavailable on this device");
      await globalThis.navigator.clipboard.writeText(text);
      new import_obsidian5.Notice("BRAIN synchronization diagnostic state copied. It contains metadata only, not OAuth secrets or vault content.");
    } catch (error) {
      this.noticeError("Diagnostics could not be copied", error);
    }
  }
  async copyLastOAuthDiagnostic() {
    try {
      if (!globalThis.navigator?.clipboard?.writeText) throw new Error("clipboard API is unavailable on this device");
      await globalThis.navigator.clipboard.writeText(this.lastOAuthDiagnosticText);
      new import_obsidian5.Notice("Last Google authentication diagnostic copied. It contains sanitized metadata only.");
    } catch (error) {
      this.noticeError("Google authentication diagnostic could not be copied", error);
    }
  }
  diagnosticsSummary() {
    return this.diagnostics?.summary() ?? { count: 0 };
  }
  copyDiagnosticLog() {
    if (!this.diagnostics) {
      new import_obsidian5.Notice("Diagnostic logger is unavailable.");
      return Promise.resolve();
    }
    try {
      const pending = copyDiagnosticLogText(this.diagnostics.renderText());
      return pending.then(async () => {
        await this.diagnostics?.flush();
        new import_obsidian5.Notice("Device diagnostic log copied. The export contains sanitized metadata only.");
      }).catch((error) => {
        this.noticeError("Diagnostic log could not be copied", error);
      });
    } catch (error) {
      this.noticeError("Diagnostic log could not be copied", error);
      return Promise.resolve();
    }
  }
  shareDiagnosticLog() {
    if (!this.diagnostics) {
      new import_obsidian5.Notice("Diagnostic logger is unavailable.");
      return Promise.resolve();
    }
    try {
      const pending = shareDiagnosticLogText(this.diagnostics.renderText());
      return pending.then(() => {
        new import_obsidian5.Notice("Device diagnostic log handed to the system share sheet as a sanitized .txt file.");
      }).catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        this.noticeError("Diagnostic log could not be shared", error);
      });
    } catch (error) {
      this.noticeError("Diagnostic log could not be shared", error);
      return Promise.resolve();
    }
  }
  async clearDiagnosticLog() {
    if (!this.diagnostics) {
      new import_obsidian5.Notice("Diagnostic logger is unavailable.");
      return;
    }
    this.diagnostics.clear();
    await this.diagnostics.flush();
    new import_obsidian5.Notice("Device diagnostic log cleared. Synchronization history, credentials, pairing, and sync state were not changed.");
  }
  testExternalBrowser() {
    if (!this.diagnostics) {
      new import_obsidian5.Notice("Diagnostic logger is unavailable.");
      return;
    }
    try {
      runDirectExternalBrowserProbe(this.diagnostics);
      new import_obsidian5.Notice("External-browser test call returned. This does not prove the browser became visible; inspect the physical result and copied log.");
    } catch (error) {
      this.noticeError("External-browser test failed", error);
    }
  }
  async testDelayedExternalBrowser() {
    if (!this.diagnostics) {
      new import_obsidian5.Notice("Diagnostic logger is unavailable.");
      return;
    }
    try {
      await runDelayedExternalBrowserProbe(this.diagnostics);
      new import_obsidian5.Notice("Delayed external-browser test call returned. This does not prove the browser became visible; inspect the physical result and copied log.");
    } catch (error) {
      this.noticeError("Delayed external-browser test failed", error);
    }
  }
  bindStatus() {
    this.unsubscribeStatus?.();
    const controller = this.runtime?.productController();
    if (!controller) {
      this.unsubscribeStatus = void 0;
      this.refreshStatus();
      return;
    }
    this.unsubscribeStatus = controller.onSurface((surface) => {
      this.statusEl?.setText(`BRAIN sync: ${surface.status.kind}`);
    });
    this.refreshStatus();
  }
  refreshStatus() {
    const status = this.runtime?.productController()?.currentSurface().status.kind;
    this.statusEl?.setText(`BRAIN sync: ${status ?? (this.currentSettings.remoteRootId ? "synchronization blocked" : "setup required")}`);
  }
  noticeError(prefix, error) {
    const safe = normalizeDiagnosticError(error).safeMessage ?? "An error occurred.";
    new import_obsidian5.Notice(`${prefix}: ${safe}`);
  }
};
