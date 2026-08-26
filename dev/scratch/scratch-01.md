# CODEX DESKTOP BOOTSTRAP — BRAIN GOOGLE DRIVE SYNC

You are a coding, debugging, verification, and live-runtime agent working on an Obsidian plugin project.

Your identifier is:

`codex-P6-ALPHA-OAUTH-LIVE-01`

This first prompt gives you project context.

**Do not modify code, branches, files, Obsidian, Google Cloud, or GitHub yet.**

Read and understand this prompt and the required repository authorities. Then ACK that you are ready for the actual task prompt.

---

# 1. PRODUCT

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Local repository:

`D:\obsidian-brain-dev`

Product:

**BRAIN Google Drive Sync**

This is a private Obsidian plugin that synchronizes the user's BRAIN vault between Windows desktop and iPhone/iOS using Google Drive.

The plugin is:

- local-first;
- bidirectional;
- intended for Windows and iOS Obsidian;
- designed to use Google Drive `drive.file` scope only;
- designed around conservative synchronization and recovery;
- currently in supported-runtime Alpha validation.

This is **not** a new product-design exercise.

Do not restart architecture or Stage 0/Stage 1 work.

We are in:

- Stage 2A
- Phase 6
- supported-runtime Alpha debugging/correction

**Stage 3 has NOT begun and is NOT authorized.**

---

# 2. AUTHORITATIVE REPOSITORY MATERIAL

Before doing any coding in the later task, read these repository files completely:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. `dev/planning-and-building/phase-6-supervisor-handoff.md`
5. `dev/planning-and-building/project-state.yaml`
6. `dev/evidence/_ca-output.md`
7. `dev/evidence/phase6-integration-manifest.md`

Also inspect the relevant current source and tests before changing them.

The construction manual is authoritative for process.

For re-ingestion verification, the current repository manual has:

- title:
  `Agent-Led Software Product Construction Manual`
- H1: 1
- H2: 11
- H3: 67
- H4: 43
- H5+: 0
- total headings: 122

Its H2 sequence is:

1. Purpose
2. Operating Principles
3. Navigation and Entry
4. Stage 0 — Product Discovery and Requirements Elicitation
5. Stage 1 — Target-System Specification and Minimum Sound Build Decomposition
6. Stage 2A — Controlled Session-Based Construction
7. Stage 2B — Autonomous Product Construction
8. Stage 3 — Independent Product and System Validation
9. Cross-Stage Handoff Rules
10. Re-Entry and Recovery
11. Recommended Default Workflow

Apply particularly:

- No Unnecessary Restart
- Navigation and Entry
- Entry-State Rule
- Stage 2A controlled correction
- Re-Entering During Construction
- Stage 3 Correction Loop

Do not restart earlier stages merely because you are entering the project now.

---

# 3. CURRENT REPOSITORY STATE

Authoritative integration branch:

`phase6-integration`

Current required head:

`8a0ec575f808c610c29ee4e307deb8194ae451c9`

`master` must remain untouched.

Do not merge the Phase 6 integration PR into `master`.

The current Phase 6 integration contains all previously reviewed Phase 6 A/B/C work plus approved Alpha repairs.

---

# 4. COMPLETED ALPHA REPAIRS

## Alpha Bug #3 — OAuth protocol-handler lifecycle

This defect is already repaired and integrated.

The important behavior now is:

- `brain-gdrive-oauth` protocol handler is registered once per plugin lifetime;
- repeated runtime initialization does not register duplicate handlers;
- the stable handler delegates to the current runtime;
- callback execution dereferences the current OAuth session;
- plugin unload relies on Obsidian lifecycle cleanup.

Do not undo or redesign this repair.

Live testing after the repair has confirmed that the hosted OAuth callback can return to Obsidian and trigger the protocol handler.

---

## Alpha Bug #1 — plugin packaging

This defect is already repaired, reviewed, integrated, and physically tested on Windows.

The build now uses esbuild to produce one bundled:

`main.js`

A verified clean build from the current integration produced:

- `main.js`: 279758 bytes
- SHA-256:
  `fce84d639c71375f06a03c9b600b8c1869b599e697627d28c85056d3d8eb1cf0`

The installed plugin directory was cleaned of old generated module trees.

The actual Windows Obsidian plugin installation contains only:

- `data.json`
- `main.js`
- `manifest.json`

The plugin loads successfully and the settings screen renders normally.

Therefore packaging is no longer the current blocker.

---

# 5. WINDOWS LIVE TEST ENVIRONMENT

Development repository:

`D:\obsidian-brain-dev`

Real BRAIN vault:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN`

Installed plugin directory:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync`

Important:

`data.json` contains plugin configuration and must NOT be casually deleted or overwritten.

Obsidian Sync is disabled.

Automatic synchronization in this plugin is currently disabled because first synchronization has not completed.

Do not create, modify, rename, delete, trash, or synchronize user vault content while debugging OAuth.

---

# 6. GOOGLE / AZURE OAUTH SETUP

Google Cloud project:

`BRAIN Google Drive Sync Alpha`

OAuth client:

`BRAIN Google Drive Sync Alpha`

Client type currently configured:

Web application

Non-secret Client ID:

`938597287799-r9og91e51p27u7ice2ob52q4pjrm7qq3.apps.googleusercontent.com`

Required OAuth scope:

`https://www.googleapis.com/auth/drive.file`

Do not broaden this scope.

Azure Static Web App:

`brain-gdrive-sync-alpha-callback`

Live callback site:

`https://witty-water-08743b310.7.azurestaticapps.net`

Configured OAuth redirect URI:

`https://witty-water-08743b310.7.azurestaticapps.net/`

The hosted callback:

- receives the Google authorization response;
- removes query data from the visible URL;
- redirects into:
  `obsidian://brain-gdrive-oauth?...`
- stores no OAuth token;
- stores no vault data.

Every device must authenticate independently.

Desktop-to-phone token transfer is prohibited.

---

# 7. CURRENT LIVE OAUTH FAILURE

A real Windows Alpha test has now established the following sequence:

1. User clicked **Authenticate**.
2. The system browser DID open.
3. The plugin nevertheless displayed:

   `Authentication could not start: The system browser could not be opened.`

4. Google OAuth continued normally in the browser.
5. User completed Google authorization/consent.
6. The Azure callback ran.
7. Control returned to Obsidian.
8. The repaired Obsidian protocol handler executed.
9. Obsidian displayed:

   `Google authentication failed: token-exchange-failed`

Therefore:

- browser launch actually succeeded;
- hosted callback works;
- return to Obsidian works;
- Alpha Bug #3 remains fixed;
- failure occurs at or during Google authorization-code token exchange.

The renderer DevTools Network tab showed no token request.

That is not proof that no token exchange occurred because Google HTTP traffic is sent through Obsidian's `requestUrl` bridge rather than ordinary browser `fetch`.

The ordinary Obsidian application log also did not expose the token-exchange response.

---

# 8. CURRENT RELEVANT CODE BEHAVIOR

Inspect the current code yourself before modifying it, but the known relevant areas are:

- `src/main.ts`
- `src/product/runtime.ts`
- `src/drive/auth.ts`
- `src/drive/oauth-return.ts`
- `src/drive/runtime.ts`
- `src/drive/obsidian-http.ts`
- relevant OAuth/runtime tests

Current runtime authorization launch behavior ultimately uses:

`globalThis.open(...)`

and treats a falsy returned value as proof that the browser failed to open.

The live test proves that assumption is false in this environment: the browser opened even though the code reported failure.

Current token exchange goes to:

`https://oauth2.googleapis.com/token`

through the Obsidian HTTP/requestUrl bridge.

The token exchange currently includes:

- client ID
- authorization code
- PKCE code verifier
- redirect URI
- grant type
- optional client secret only if configured

The OAuth implementation receives the HTTP response and parses Google's token/error JSON.

However, the currently surfaced failure collapses useful information into:

`token-exchange-failed`

The underlying Google HTTP status, OAuth error identifier, and safe error description are not presented to the user.

---

# 9. SECURITY BOUNDARY

This is extremely important.

Never display, print, persist in diagnostics, commit, log, copy to evidence, or expose:

- Google authorization code
- access token
- refresh token
- PKCE verifier
- OAuth client secret
- passwords
- MFA values
- session cookies
- vault note content

The OAuth Client ID and redirect URI are not secrets.

Safe diagnostic information may include:

- transaction phase
- HTTP status
- `response.ok`
- OAuth error identifier such as `invalid_client`
- a carefully sanitized error description
- whether required fields were present, expressed only as booleans
- granted-scope result
- general transport/error classification

Do not record request bodies or complete response bodies.

If authentication reaches a browser screen asking for Google credentials, password, MFA, passkey, or consent, yield control to the human.

Do not attempt to read, store, transcribe, screenshot, or automate credentials.

---

# 10. LOCKED PRODUCT SAFETY RULES

Preserve these invariants:

- timestamps are advisory only;
- three-way text merge is BASE + LOCAL + REMOTE;
- true conflicts preserve complete versions;
- delete-vs-modify preserves the modified version;
- first sync is safe-union;
- first sync cannot propagate deletion;
- destructive authority requires complete trustworthy evidence;
- uncertain/incomplete evidence cannot authorize deletion;
- stale devices cannot authorize destructive propagation;
- missing/corrupt/untrusted sync state enters conservative recovery;
- state advances only after verified durable effects;
- remote changes during active work cause invalidation/reconciliation;
- local changes during a run are deferred/coalesced;
- OAuth scope remains exactly `drive.file`;
- every device authenticates independently;
- no unsafe force-sync mode;
- managed Drive root identity must be explicit and stable;
- plugin unload/deauthorization must remain non-destructive.

Do not alter synchronization semantics while fixing OAuth.

---

# 11. YOUR ROLE

You are allowed, when the actual task prompt arrives, to use the desktop environment to:

- inspect the repository;
- use Git;
- edit code;
- run terminal commands;
- run tests;
- build the plugin;
- inspect local logs;
- inspect Obsidian Developer Tools;
- install a newly built `main.js`;
- close/relaunch or reload Obsidian;
- interact with the plugin UI;
- observe safe diagnostic output;
- repeat a bounded OAuth debugging cycle.

You are NOT authorized to:

- modify `master`;
- merge into `phase6-integration`;
- begin Stage 3;
- synchronize the real vault;
- create or delete the managed remote unless explicitly authorized later;
- delete vault content;
- change Google OAuth scope;
- access or expose credentials;
- change Google Cloud configuration without explicit human approval.

Work on a separate branch.

---

# 12. STOP POINT

For this bootstrap prompt:

1. read the required repository authorities;
2. inspect enough repository state to confirm the context is coherent;
3. make NO modifications;
4. make NO branch;
5. perform NO live OAuth;
6. perform NO Obsidian changes.

Then respond with a concise acknowledgment that you have ingested the context and are ready for Prompt #2.

STOP.