# BVP-S08D — Minimal Command Mailbox and Windows Relay

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.


## 0.1 Final Dispatch Binding

Repository coordinates:

- exact accepted S08C predecessor / PHX-CI base: `03d0d8da3c860a35943f214c9b90c83bfdb9a132`;
- task branch: `bvp-s08d-minimal-command-mailbox`;
- accepted S08C command protocol: `test-platform/src/live-device/device-command-agent.ts`;
- accepted validation composition: `test-platform/src/live-device/build-validation-artifact.ts` + `validation-entrypoint.ts`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework version: `0.2.0-dev.2`;
- ordinary shipping artifact baseline: `main.js` 885,307 bytes / SHA-256 `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`;
- current live-device/relay surface: 482 / 750 logical TypeScript LOC, leaving 268 LOC;
- framework core remains frozen at 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- production seam remains 187 / 350 logical LOC / 3 of 4 files and is frozen for this child.

Selected transport authority:

- ordinary Google Drive `drive` space under the already-frozen exact OAuth scope `https://www.googleapis.com/auth/drive.file`;
- one dedicated app-created folder named `BRAIN BVP Mailbox`, outside the managed BRAIN Sync remote, marked with private Drive `appProperties` `brainBvpMailbox=1`;
- mailbox record files are likewise marked `brainBvpRecord=1` plus bounded record kind metadata;
- `appDataFolder` is explicitly not used because it requires an additional OAuth scope, which is forbidden.

Credential boundary:

- test-platform source may not import production Drive/OAuth modules directly;
- the generated validation-only composition wrapper may reuse the already-shipping production OAuth classes `GoogleOAuthSession`, `ObsidianSecretStore`, `createObsidianRequestUrlFetcher`, and `GoogleHttpTransport`;
- that wrapper reads only persisted public plugin settings via `Plugin.loadData()`, uses the device's own `app.secretStorage`, and passes a narrow authenticated Drive-request closure into validation-only mailbox code;
- no access/refresh token, authorization code, client secret, or OAuth transaction value may be placed in mailbox records, relay files, results, logs, or external-runner state.

Windows relay:

- required because the external controller must not receive the device OAuth token;
- the relay is validation-only and runs inside the Windows validation artifact using Obsidian's vault adapter;
- local relay root is `.obsidian/plugins/<plugin-id>/.bvp-relay`, with `outbox/`, `sent/`, and `inbox/`;
- the external controller writes one bounded S08C command JSON file to `outbox/`;
- the relay publishes it to Drive and moves the exact local file to `sent/`;
- after an exact correlated Drive result appears, the relay writes it to `inbox/` and removes the corresponding `sent/` record;
- relay restart reconstructs only from the exact files in `sent/`; it stores no scenario graph, branch state, verdict, or future-step intent.

Drive mailbox semantics:

- record payload is the exact bounded S08C command/result JSON, maximum 128 KiB;
- metadata creation and media upload are separate Drive operations; incomplete/invalid files are ignored rather than interpreted optimistically;
- mailbox listing is bounded and fails closed if the record set exceeds one page;
- duplicate command records are allowed by transport; S08C sequence safety prevents repeated effects;
- conflicting duplicate result payloads for the same run/device/sequence/command identity fail closed;
- result lookup requires exact run/device/sequence/command identity;
- a device pump processes addressed commands through the accepted S08C agent and publishes its typed bounded result;
- transport acknowledgement or mailbox presence never becomes synchronization success.

Exact writable-path allowlist:

- NEW `test-platform/src/live-device/drive-mailbox.ts`;
- `test-platform/src/live-device/validation-entrypoint.ts`;
- `test-platform/src/live-device/build-validation-artifact.ts`;
- NEW `test-platform/test/s08d-drive-mailbox-relay.test.ts`;
- `test-platform/test/s08b-validation-build-entrypoint.test.ts` only for validation-input/runtime wiring expectations;
- `test-platform/test/architecture-metrics.test.ts` only for the actual post-S08D live-device/relay baseline;
- this S08D task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No production, governance, PowerShell, PHX-CI, package, manifest, OAuth-scope, scenario, or external-runner implementation path is writable.

Focused proof must cover:

- Drive mailbox root is a separately tagged app-created folder and never a managed BRAIN Sync content/config root;
- command/result round trip and exact correlation;
- wrong-run and wrong-device records are filtered before agent execution;
- duplicate/reordered command delivery cannot repeat effects when passed through S08C;
- conflicting duplicate result fails closed;
- unavailable Drive requester yields explicit unavailable/failure rather than optimistic success;
- Windows relay outbox -> Drive -> sent transition;
- relay reconstruction from `sent/` after restart;
- correlated result -> inbox transition with exact command removal;
- device pump publishes the S08C typed result;
- mailbox record size/privacy bounds;
- validation artifact contains mailbox/relay wiring while ordinary production artifact retains the accepted S08C shipping hash;
- architecture metrics remain at or below 750 live-device/relay LOC.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08d-drive-mailbox-relay.test.js .test-build/bvp/test-platform/test/s08c-device-command-agent.test.js .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

BVP-GOV-010 size gate: PASS. This child is limited to one compact validation-only Drive-mailbox/relay module plus bounded validation-composition wiring and focused tests; it creates no general message broker, backend, queue platform, scenario engine, second evidence schema, new OAuth scope, or production transport.


## 0.2 Ready-for-Verification Record

BVP-S08D is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic implementation HEAD: `91f667d502e3fc418c15636954d87e2527b317a3`;
- exact accepted S08C predecessor / PHX-CI base: `03d0d8da3c860a35943f214c9b90c83bfdb9a132`;
- branch: `bvp-s08d-minimal-command-mailbox`;
- selected transport is one separately tagged app-created ordinary-Drive mailbox under the already-authorized exact `drive.file` scope;
- `appDataFolder`, new OAuth scopes, token export, developer-hosted backend, and production synchronization transport are absent;
- device authentication is reused only inside the generated validation composition through existing shipping OAuth/HTTP classes and device-local Obsidian SecretStorage;
- Windows external-controller bridging is validation-only through `.obsidian/plugins/brain-google-drive-sync/.bvp-relay/{outbox,sent,inbox}`;
- the relay directory is covered by the production configuration policy's protected `plugins/brain-google-drive-sync/**` sync-operational-state rule;
- the relay stores only exact pending command/result records and reconstructs no scenario graph, final verdict, or future-step state.

Runtime implementation delta:

- NEW `test-platform/src/live-device/drive-mailbox.ts`;
- `test-platform/src/live-device/validation-entrypoint.ts` installs a bounded mailbox runtime;
- `test-platform/src/live-device/build-validation-artifact.ts` composes device-local OAuth/Drive request authority into the validation-only plugin subclass;
- no production source, production seam, governance, PowerShell, PHX-CI, package, manifest, OAuth-scope, scenario, or external-runner implementation changes.

Safety proof includes:

- separately tagged mailbox root with no BRAIN managed-sync role;
- bounded 128 KiB command/result records;
- sensitive credential-key rejection and unknown-command-field sanitization;
- exact run/device/sequence/command result correlation;
- wrong-run/wrong-device filtering;
- conflicting duplicate result rejection;
- explicit Drive-unavailable state;
- device pump preservation of typed S08C results;
- reordered and duplicate mailbox delivery through the real S08C agent without repeated effects;
- Windows outbox -> Drive -> sent and correlated result -> inbox transitions;
- relay restart reconstruction from exact `sent/` records only;
- unavailable relay leaves the pending local command intact;
- ordinary production bundle excludes mailbox markers while validation bundle includes them.

Architecture projection:

- production source/seam: unchanged at 16,813 logical LOC and 187 / 350 seam LOC across 3 / 4 seam files;
- framework core: unchanged at 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- live-device agent/relay: **572 / 750 logical TypeScript LOC**, leaving 178 LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,492 LOC;
- scenario-specific production and PowerShell: 0 / 0.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08d-drive-mailbox-relay.test.js .test-build/bvp/test-platform/test/s08c-device-command-agent.test.js .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

S08D is not accepted until authoritative PHX-CI passes and the exact persisted JSON, Markdown, and complete execution log are reviewed.

## 1. Objective

Implement the simplest no-backend transport that can move bounded S08C commands/results between the external controller and live validation participants, using only already-permitted user-owned authority and an optional thin Windows relay where host credential access requires it.

Transport is test-control metadata only.

## 2. Required End State

The transport can:

- publish/address one bounded command to a run + device + sequence;
- let the intended validation participant receive it;
- publish one bounded typed result for that command;
- reject/ignore stale, duplicate, or misaddressed records in coordination with S08C sequence safety;
- retain enough run-scoped records for interruption/resume and evidence correlation;
- operate without developer-hosted backend;
- operate without adding Google OAuth scope;
- avoid exporting device Google tokens/credentials to the external host.

A Windows relay, if required by actual credential boundaries, moves bounded records only and remains stateless regarding scenario meaning.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08C predecessor SHA;
- task branch;
- selected already-permitted transport authority/mechanism based on current product/user credentials;
- exact existing Drive/app-data APIs available to the validation artifact/Windows host;
- whether a Windows relay is necessary;
- exact mailbox/relay/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current live-agent/relay LOC budget.

Binding chooses among already-authorized simple mechanisms; it may not introduce a hosted service or new OAuth scope.

## 4. Required Semantics

### 4.1 Run-scoped metadata

Transport records contain only bounded test-control fields and bounded results. They are not vault content and not synchronization state.

### 4.2 Addressing

Each command/result includes sufficient run/device/sequence identity to prevent another device/run from treating it as current work.

### 4.3 Duplicate/stale delivery

Transport may be at-least-once. Safety comes from S08C run/sequence validation.

The transport must not assume exactly-once delivery if the underlying mechanism cannot guarantee it.

### 4.4 No synchronization authority

Mailbox presence, ordering, or contents cannot override production planner/state authority.

### 4.5 Credential boundary

No device access/refresh token is exported to the external runner merely to access the mailbox.

If the host lacks safe direct credential access, the Windows relay may use already-owned local authority to copy addressed command/result records.

### 4.6 Relay minimality

The relay does not:

- interpret whole scenarios;
- choose next steps;
- aggregate verdicts;
- mutate production synchronization state;
- implement a second queue/workflow platform.

## Invariants

- Transport carries bounded run-scoped test-control metadata only.
- Transport ordering/delivery never becomes synchronization authority.
- Run/device/sequence safety remains enforced even with duplicate or reordered delivery.
- No developer-hosted backend, new OAuth scope, or token export is introduced.
- Any Windows relay remains stateless with respect to scenario meaning and final verdict.
- Mailbox/relay code remains validation-only and excluded from the ordinary production bundle.

## 5. Privacy / Safety

Mailbox records must exclude:

- OAuth secrets;
- authorization codes;
- access/refresh tokens;
- unrelated user note content.

Fixture/result payloads remain bounded to test-safe metadata/content needed by the command contract.

## 6. Material Edge / Failure Cases

Tests must cover:

- correct command/result round trip;
- wrong-device record ignored/rejected;
- wrong-run record ignored/rejected;
- stale/duplicate record does not repeat effect;
- result correlates to exact command;
- transport reordering does not bypass sequence safety;
- unavailable transport produces BLOCKED/unavailable, not optimistic success;
- relay restart does not require scenario-state reconstruction;
- mailbox metadata cannot be mistaken for managed vault synchronization content.

## 7. Engineering Discretion

The agent may choose the simplest record naming/serialization/polling mechanism consistent with the selected existing authority and bounded live-validation needs.

Do not add a generalized message broker, backend, durable workflow service, or broad transport abstraction family.

## 8. Dependencies

Consumes S08C command/result protocol. S08E consumes this transport through a narrow executor-facing interface.

## 9. Acceptance Criteria

Acceptance requires command/result delivery with run/device/sequence safety, no hosted backend, no new OAuth scope/token export, stateless scenario-meaning relay, privacy constraints, live-agent/relay budget compliance, shipping exclusion, architecture guard/metrics PASS, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- scenario sequencing/verdict;
- production synchronization transport;
- arbitrary file sync over the mailbox;
- human checkpoint policy;
- S09 physical scenario catalog.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, selected transport authority, relay necessity, round-trip/stale/duplicate results, live-agent/relay LOC, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08E.