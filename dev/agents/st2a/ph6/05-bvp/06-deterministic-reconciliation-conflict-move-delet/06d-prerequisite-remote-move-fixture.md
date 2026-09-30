# BVP-S06D Prerequisite — Generic Identity-Preserving REMOTE Move Fixture

## 0. Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Parent:** BVP-S06D  
**Predecessor:** accepted S06C reviewed integration state `e07dc3e93828180893882da2d43d378bdf9f4124`

## 0.1 Acceptance Record

This prerequisite is complete and accepted.

- accepted prerequisite input / PHX-CI base: `57601299ca6613b127fe35c76b5a33f6b7a84c04`;
- accepted implementation SHA: `ee96323b74a60d9cceeb71b7012e95af1da0f270`;
- authoritative PHX-CI evidence SHA: `24a49a6c3400c18bf9d4e24da645df83298b4aea`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused prerequisite verification: PASS, 22/22;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- framework core: 3,851 / 4,000 logical TypeScript LOC (+10);
- production seam: unchanged at 113 logical LOC / 1 file;
- scenario catalog: unchanged at 21 scenarios / 551 logical LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production: 0;
- scenario-specific PowerShell: 0;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted prerequisite adds only a `move-remote` variant to the existing fixture family and delegates directly to the existing in-memory Drive identity-preserving move operation. No new move algorithm, runner family, persistence system, production behavior, or architecture family was introduced.

This file is now a historical completion record and authorizes no further prerequisite implementation work.

## 1. Objective

Expose the already-existing identity-preserving in-memory Drive move operation through the existing declarative scenario `fixture` family so S06D can model an external REMOTE rename/move without replacing stable remote identity.

## 2. Required Capability

Add exactly one fixture variant:

`move-remote`

Required fields:

- `fromPath`
- `toPath`

Runner semantics:

1. resolve visible REMOTE objects at `fromPath`;
2. fail deterministically if zero or more than one candidate exists;
3. call the existing `world.drive.move(remoteObjectId, fromPath, toPath)`;
4. preserve the same remote object ID;
5. return the existing Drive failure classification when the move fails.

No new move algorithm is permitted.

## 3. Writable Allowlist

Exactly:

- `test-platform/src/scenario/scenario-contract.ts`
- `test-platform/src/scenario/scenario-runner.ts`
- `test-platform/test/scenario-contract.test.ts`
- `test-platform/test/scenario-runner.test.ts`

No production, seam, PowerShell, PHX-CI, evidence, checkpoint, persistence, governance, or scenario-definition changes are authorized.

## 4. Acceptance

Prove:

- valid `move-remote` definition validates;
- missing/extra fields fail closed;
- runner moves the exact existing remote object;
- remote object ID is unchanged after move;
- source path becomes absent and destination becomes present;
- unrelated remote objects remain unchanged;
- existing scenario behavior is unaffected;
- architecture guard/metrics and authoritative PHX-CI pass.

Stop after prerequisite acceptance. Do not begin S06D scenarios until this prerequisite is accepted and frozen.
