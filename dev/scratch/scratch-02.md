# PHASE 6 ALPHA LIVE OAUTH DEBUGGING AND REPAIR TASK

Agent:

`codex-P6-ALPHA-OAUTH-LIVE-01`

You have already received and ingested the project bootstrap.

Do not restart project discovery.

Your task is to diagnose and repair the current live Windows OAuth failure as far as the available evidence safely permits.

You may perform the engineering/build/install/debug cycle directly on this Windows machine.

---

# 1. STARTING STATE GATE

Repository:

`D:\obsidian-brain-dev`

Required starting integration branch:

`phase6-integration`

Required starting SHA:

`8a0ec575f808c610c29ee4e307deb8194ae451c9`

Before modifying anything:

```powershell
cd D:\obsidian-brain-dev
git status
git fetch origin
git checkout phase6-integration
git pull --ff-only origin phase6-integration
git rev-parse HEAD
```

Requirements:

- working tree must be clean;
- HEAD must equal exactly:

  `8a0ec575f808c610c29ee4e307deb8194ae451c9`

If not:

**STOP and report the discrepancy.**

Do not reset, force, rebase, or discard unknown work.

If correct, create:

`phase6-alpha-oauth-live-fix`

from that exact SHA.

Do all code work on that branch.

Do NOT modify `phase6-integration` or `master`.

---

# 2. PRIMARY OBJECTIVES

There are two already-proven defects/diagnostic gaps.

## Objective A — false browser-launch failure

Live behavior:

- `globalThis.open(...)` successfully opened the Google authorization browser;
- code nevertheless threw:
  `The system browser could not be opened.`

Repair this so that a falsy/null return from the browser-open call is **not by itself treated as proof of launch failure**.

An actual thrown exception or truly unavailable launch mechanism may still be treated as failure.

Preserve desktop/mobile compatibility.

Do not introduce Node/Electron-only dependencies into mobile-required code.

Add deterministic regression coverage.

---

## Objective B — safe token-exchange diagnostics

The real OAuth flow currently reaches:

`token-exchange-failed`

but useful Google error information is discarded or hidden.

Add a narrowly scoped diagnostic path that makes the next live failure useful.

At minimum, a failed token exchange should safely expose:

- phase: token exchange;
- HTTP status if an HTTP response was received;
- Google OAuth `error` identifier if present;
- sanitized `error_description` if present;
- otherwise a safe transport/service classification.

The user should be able to see or copy this information without exposing secrets.

Prefer structured diagnostic data internally rather than concatenating arbitrary raw response content.

Do not log or expose complete request or response bodies.

---

# 3. SANITIZATION REQUIREMENTS

Diagnostics MUST NOT contain:

- authorization code;
- access token;
- refresh token;
- PKCE verifier;
- client secret;
- cookies;
- Google password/MFA/passkey information;
- vault content.

For `error_description`:

- treat it as untrusted external text;
- remove control characters;
- impose a reasonable short maximum length;
- do not include URLs with query strings;
- redact obvious secret-bearing key/value material if present;
- do not persist an unsanitized version anywhere.

A Google OAuth error identifier such as:

`invalid_client`

is safe to expose.

HTTP status such as:

`400`

is safe to expose.

Do not add secret-bearing `console.log` calls.

---

# 4. INSPECT BEFORE EDITING

Before changing code, inspect the exact current implementations of:

- `src/main.ts`
- `src/product/runtime.ts`
- `src/drive/auth.ts`
- `src/drive/oauth-return.ts`
- `src/drive/runtime.ts`
- `src/drive/obsidian-http.ts`

and all directly relevant tests.

Trace the complete real path:

Authenticate button
→ runtime initialization
→ OAuth transaction creation
→ browser launch
→ hosted callback
→ Obsidian protocol return
→ current OAuth session
→ token exchange through `requestUrl`
→ parsing
→ result surfaced to user.

Do not guess.

Document your causal trace in your evidence.

---

# 5. TEST REQUIREMENTS

Add focused regression tests proving at least:

### Browser launch

1. a launcher/browser API may return null/falsy while launch is still considered initiated;
2. an actual thrown launch error is still surfaced;
3. repeated authentication does not reintroduce duplicate protocol-handler registration.

### Diagnostics

4. HTTP token failure preserves safe HTTP status;
5. Google OAuth `error` is surfaced;
6. sanitized `error_description` is surfaced;
7. authorization code is never present in diagnostic output;
8. PKCE verifier is never present;
9. access/refresh tokens are never present;
10. client secret is never present;
11. malformed/non-JSON/service failure produces a safe generic diagnostic rather than leaking raw data.

Preserve all existing Alpha Bug #3 lifecycle tests.

Do not weaken existing tests merely to make the repair pass.

---

# 6. LOCAL VERIFICATION

After implementation, run from a clean dependency state:

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

All must pass.

The previous suite contained 239 tests.

Your new suite may contain more.

Record:

- total tests;
- passed;
- failed;
- typecheck result;
- build result;
- build-verifier results;
- new `main.js` size;
- new SHA-256.

Do NOT expect the prior artifact hash to remain unchanged because production code may now change.

---

# 7. INSTALL INTO REAL WINDOWS OBSIDIAN

Only after the full local verification passes:

Installed plugin directory:

`C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync`

Preserve:

`data.json`

Do not delete it.

Fully close Obsidian before replacing the build if practical.

Install only the necessary plugin runtime files, principally:

- newly built `main.js`
- `manifest.json` if required/current

Do not copy source trees or generated legacy module directories.

Verify the installed file size/hash against the build you just produced.

Then launch/reload Obsidian and confirm:

- plugin enables;
- settings page loads;
- no initialization exception appears.

---

# 8. LIVE OAUTH TEST

Automatic synchronization must remain disabled.

Do NOT:

- create a managed remote;
- pair a remote;
- run Sync Now;
- run Verify/Reconcile Vault;
- enable automatic synchronization.

Use the plugin only for OAuth testing.

Start authentication once.

If the browser asks for:

- Google username/password;
- MFA;
- passkey;
- account approval;
- OAuth consent;

STOP interaction and tell the human:

`USER ACTION REQUIRED: complete the Google sign-in/consent flow, then return to Obsidian.`

Do not inspect or record credentials.

After the human completes that step and control returns to Obsidian:

1. inspect the safe plugin diagnostic;
2. inspect Obsidian console/logs if useful;
3. inspect any safe internal diagnostic state you implemented;
4. determine whether the token exchange succeeded or failed;
5. preserve only sanitized evidence.

---

# 9. ROOT-CAUSE REPAIR AUTHORITY

If the new live diagnostic produces **conclusive evidence** of the Alpha Bug #2 cause, continue within this same bounded OAuth task.

Examples of conclusive evidence include a specific Google OAuth error and description that directly identifies the failure class.

Do not infer a cause merely because it seems likely.

If the root cause is in repository code/configuration:

- implement the smallest correct repair;
- add regression coverage;
- rerun complete verification;
- rebuild;
- reinstall;
- repeat the live OAuth test.

You may repeat this bounded cycle until:

A. OAuth succeeds; or  
B. the remaining fix requires an external Google/Azure configuration decision; or  
C. evidence is still insufficient; or  
D. the repair would leave the bounded OAuth subsystem.

If the root cause requires changing Google Cloud or Azure configuration:

**DO NOT make the cloud change automatically.**

Instead report:

- exact observed OAuth error;
- exact safe description;
- why it points to that configuration;
- exact human configuration change required;
- whether any secret would be required.

Never ask the user to paste a client secret into chat/evidence.

---

# 10. SUCCESS BOUNDARY

For this task, OAuth success means:

- browser opens without the false launch-failure toast;
- Google authorization completes;
- callback returns to Obsidian;
- token exchange succeeds;
- Obsidian displays authentication success;
- exact `drive.file` scope invariant remains enforced.

If OAuth succeeds:

**STOP BEFORE remote creation, pairing, or synchronization.**

Those are later acceptance steps.

---

# 11. ALPHA BUG #3 PROTECTION

The already-approved protocol-handler lifecycle repair is frozen.

Verify throughout this work that:

- there is still exactly one plugin-lifetime registration;
- runtime reinitialization does not register another handler;
- callback dispatches to the current runtime/session;
- repeated Authenticate attempts do not create duplicate-action errors.

Do not redesign that lifecycle.

---

# 12. EVIDENCE

Maintain:

`dev/evidence/_ca-output.md`

as the primary build/debug evidence.

Also create:

`dev/evidence/_codex-P6-ALPHA-OAUTH-LIVE-01.md`

for detailed agent-specific evidence.

Evidence must include:

- exact starting SHA;
- branch name;
- files inspected;
- causal trace;
- live behavior before repair;
- files changed;
- reason for each change;
- tests added;
- exact verification commands;
- test totals/results;
- build size/hash;
- installation verification;
- sanitized live OAuth result;
- sanitized Google HTTP status/error/description if failure occurs;
- final root-cause conclusion and supporting evidence;
- whether OAuth ultimately succeeded;
- whether external configuration work remains;
- confirmation that no OAuth secret or vault content was recorded;
- confirmation Stage 3 did not begin.

Never place secrets in Git.

---

# 13. COMMIT / GITHUB BOUNDARY

Commit the bounded work on:

`phase6-alpha-oauth-live-fix`

Do NOT merge it.

Do NOT update:

- `phase6-integration`
- `master`

If GitHub authentication is available, push the branch and create/update a **draft PR** targeting:

`phase6-integration`

Do not merge the PR.

If GitHub authentication is unavailable, leave the local branch committed and report that fact.

---

# 14. FINAL REPORT

When the bounded task reaches a stopping condition, report:

1. starting integration SHA;
2. repair branch;
3. final repair SHA;
4. exact files changed;
5. false-browser-error repair;
6. diagnostic repair;
7. test totals/results;
8. typecheck result;
9. build result;
10. built artifact size/hash;
11. installed artifact size/hash;
12. live OAuth HTTP status if failure occurred;
13. live OAuth error identifier;
14. sanitized error description;
15. confirmed root cause, or explicitly `NOT YET CONFIRMED`;
16. any root-cause repair performed;
17. final live OAuth outcome;
18. confirmation Alpha Bug #3 remains intact;
19. confirmation no secrets were exposed;
20. confirmation no vault synchronization was performed;
21. PR/branch state;
22. confirmation Stage 3 has not begun.

Then STOP.

Do not continue into managed remote creation, pairing, synchronization, iOS validation, or Stage 3.