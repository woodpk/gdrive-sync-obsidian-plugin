# Phase 6 OAuth Housekeeping — `agt-CA-P6-OAUTH-HOUSEKEEPING-01`

Date: `2026-08-27`

## Initial repository state

- initial `master`: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- initial `phase6-integration`: `b8734bbbc571d40d23e1b9870a4b13b67136cd68`
- initial `phase6-alpha-ios-diagnostic-logging`: `a0fc805b5d93b056d6699fc48633e11782bd0bde`
- initial `phase6-alpha-ios-callback-handoff-fix`: `967f9bbfb7d3989bce1949230caf6e7b20a46d8b`
- housekeeping branch: `phase6-oauth-housekeeping`, created from `b8734bbbc571d40d23e1b9870a4b13b67136cd68`
- PR `#15`: open/draft/unmerged at initial inspection, `phase6-integration` -> `master`
- PR `#21`: open/unmerged at initial inspection, diagnostic branch -> `phase6-integration`

The validated callback repair was already present on `phase6-integration` through production integration/deployment commit `b8734bbbc571d40d23e1b9870a4b13b67136cd68`. Its callback HTML and callback regression test were verified byte-identical to the reviewed callback branch copies, so the production repair was not duplicated or redesigned.

## Housekeeping integration performed

PR `#21` was merged using a normal merge commit after the supplied physical iPhone acceptance satisfied its recorded physical-validation hold. Resulting `phase6-integration` merge commit: `315710a8458f5fc981de13065fbfffb3eb848f41`, with parents `b8734bbbc571d40d23e1b9870a4b13b67136cd68` and `a0fc805b5d93b056d6699fc48633e11782bd0bde`.

The callback-repair branch still carried unique append-only repair/deployment evidence even though its production HTML/test content was already integrated. That ancestry was preserved without rewriting by PR `#22` / merge commit `4a118d46aa3a3c4bd8901114ccbf2f163d513a9a`, with callback branch head `967f9bbfb7d3989bce1949230caf6e7b20a46d8b` as the additional parent. No OAuth production behavior was altered by that evidence-preservation merge.

The bounded diagnostic subsystem was retained. It remains device-local, structurally allow-listed, bounded-retention, and sanitizes/excludes authorization codes, OAuth state values, PKCE material, access/refresh tokens, client secrets, query-bearing authorization URLs, and vault content from diagnostic records.

The Phase 6 focused CI command was expanded to include the hosted callback regression file so the combined verification gate explicitly exercises callback + diagnostic + OAuth + export tests.

## Callback evidence wording clarification

An earlier repair entry stated categorically that OAuth values were not "rendered." That wording is clarified, not erased:

> OAuth code/state are not displayed as user-visible diagnostic text, logged, or persisted by the hosted callback page. They exist transiently only as required components of the constructed Obsidian callback URI.

The fallback anchor's `href` and the automatic navigation use the same transiently constructed callback target. This does not expose the values as visible diagnostic text.

## Supervisor-supplied physical iPhone OAuth acceptance

Platform: `mobile / iPhone / Obsidian`

Attempt: `attemptId: 7`

Authentication attempt began: `2026-08-27T23:17:34.749Z`

Observed sequence:

- authentication attempt started;
- PKCE/state transaction prepared;
- external browser authorization launched;
- plugin entered `result: "awaiting-callback"`;
- callback received at `2026-08-27T23:17:53.498Z` as `oauth.callback / callback-received`;
- `callbackRegistrationActive: true`;
- `runtimeInitialized: true`;
- `statePresent: true`;
- `codePresent: true`;
- `errorPresent: false`;
- `runtime-callback-exit` completed with `result: "completed"`;
- `callback-processing-complete` completed with `result: "completed"`;
- `authentication-attempt-completed` completed with `result: "authenticated"`.

**PHYSICAL IPHONE OAUTH ACCEPTANCE: PASS**

Demonstrated chain:

`Obsidian → Google OAuth → hosted Azure callback → Obsidian protocol callback → OAuth completion`

Evidence limitation: plugin diagnostics do not independently establish whether the successful return used the callback page's automatic `window.location.replace(...)` path or the manual `Open Obsidian to finish authentication` user-gesture fallback. No stronger causal claim is made.

Historical statements that physical iPhone acceptance had not yet been performed, callbacks had not yet arrived, or OAuth remained incomplete were correct for those earlier sessions and are retained as chronology. The supplied successful attempt above supersedes them for current OAuth acceptance status.

## Later mobile product-ready evidence

On the same mobile installation, later runtime initialization showed:

- `remoteRootPresent: true`;
- `vaultIdentityPresent: true`;
- OAuth boundary creation completed;
- mobile local-adapter creation completed;
- configuration-directory initialization completed;
- state-store initialization completed;
- audit-store initialization completed;
- scheduler startup completed;
- runtime reached `result: "product-ready"`.

The supplied runtime observation also states that plugin status showed a managed remote and completed first synchronization. No additional synchronization values, timestamps, counts, or content are inferred beyond the supplied evidence.

## Azure deployment mechanics

The inspected Azure Static Web Apps workflow deploys on pushes to `phase6-integration` and uses `./oauth-callback` as its application source. The repaired `oauth-callback/index.html` is present on that production-deploying branch.

Established production deployment evidence retained from the callback repair:

- production integration/deployment commit: `b8734bbbc571d40d23e1b9870a4b13b67136cd68`;
- Azure Static Web Apps run: `33125226203`;
- deployment job: `98701642078`;
- conclusion: `SUCCESS`;
- companion Phase 1 CI run: `33125229901` — `SUCCESS`.

That prior evidence also recorded a parameter-free live endpoint HTTP `200`, the repaired fallback label/automatic-attempt/neutral initial status, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and the restricted callback CSP.

The housekeeping PR's Azure preview runs are not used as production-deployment proof. Run `33129820326` failed specifically at the `Build And Deploy` step; the connector-visible job metadata does not expose a more specific failure message, so no unsupported cause is asserted. This does not negate the earlier successful production deployment of the unchanged callback page.

## Combined housekeeping verification

Exact verified housekeeping head: `8118707af62ec33890cf599912a880d56001e323`

Workflow: `Phase 6 Alpha Diagnostic Verification`

- run ID: `33129820333`
- job ID: `98716461301`
- conclusion: `SUCCESS`
- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npm test`: **296/296 PASS**, 0 fail, 0 cancelled, 0 skipped, 0 todo
- focused callback + diagnostic + OAuth + export suite: **38/38 PASS**, 0 fail, 0 cancelled, 0 skipped, 0 todo
- `npm run build`: PASS
- `npm run check`: PASS; repeated full suite **296/296 PASS** and all five build verifiers passed
- `git diff --check`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `main.js`: `329013` bytes
- SHA-256: `1225e9b1798d5238d7fd0e0a2241a40080b02b8c0e7d92970828ac1fa98726c6`
- workflow artifact ID: `9669805685`
- artifact digest: `sha256:f00d6e61bd1618b57246e937e679f9946af0a38f647f3d9d3bb4e4b3831d3954`

The previously observed two Windows drive-prefix test failures did **not** reproduce in this Ubuntu GitHub Actions environment; all 296 tests passed.

## Current boundary before master integration

- exact OAuth scope remains `https://www.googleapis.com/auth/drive.file`.
- no new plugin release was created.
- no OAuth redesign, token-exchange change, Drive pairing change, synchronization semantic change, or Stage 3 work was performed.
- `phase6-integration` is intentionally expected to remain after master integration because `dev/planning-and-building/project-state.yaml` still marks Phase 6 active and lists broader non-OAuth runtime/fault/resource validation plus the planned post-iPhone performance block.
- final master integration SHA and branch-retirement dispositions are to be appended after those operations complete.

## Final master integration and branch retirement

- pre-merge `phase6-integration` SHA: `3b2bdd550be4b9fb4dc3dcbecea1ad4ba9029dea`
- PR `#15` merge mechanism: normal GitHub merge commit; history preserved; no squash/rebase/force-push
- master integration merge SHA: `f02db659710e17383c17312553ec087d2d0b7d50`
- initial master parent: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- integrated Phase 6 parent: `3b2bdd550be4b9fb4dc3dcbecea1ad4ba9029dea`
- expected diagnostic head `a0fc805b5d93b056d6699fc48633e11782bd0bde`: reachable from master
- expected callback repair/evidence head `967f9bbfb7d3989bce1949230caf6e7b20a46d8b`: reachable from master
- housekeeping head `cd8497d61f75980cc3a949c70ff37e4cf993306a`: reachable from master
- `phase6-alpha-ios-diagnostic-logging` final SHA `a0fc805b5d93b056d6699fc48633e11782bd0bde`: **DELETED — fully merged and obsolete**
- `phase6-alpha-ios-callback-handoff-fix` final SHA `967f9bbfb7d3989bce1949230caf6e7b20a46d8b`: **DELETED — fully merged and obsolete**
- `phase6-alpha-ios-oauth-diagnostic` final SHA `d799e0139c36b629769a917f2d328de6ab84f44d`: **DELETED — fully merged/ancestor-only after explicit rollback and obsolete**
- `phase6-oauth-housekeeping` final SHA `cd8497d61f75980cc3a949c70ff37e4cf993306a`: **DELETED — fully merged and obsolete**
- `phase6-integration` SHA `3b2bdd550be4b9fb4dc3dcbecea1ad4ba9029dea`: **RETAINED** because the repository's authoritative project-state still marks broader Phase 6 work active and the production Azure callback workflow is branch-scoped to `phase6-integration`.
- open PR enumeration immediately before retirement: none.
- `NEW GITHUB PLUGIN RELEASE: NOT CREATED`.
- Stage 3 was not begun.
- remaining Phase 6 work is limited to the broader non-OAuth runtime/fault/resource validation and planned post-iPhone performance block already recorded by the authoritative project-state; OAuth physical acceptance itself is closed as PASS.

The master integration merge SHA above is the production integration point. This branch-retirement/evidence finalization is documentation/repository housekeeping only and introduces no production-code change.
