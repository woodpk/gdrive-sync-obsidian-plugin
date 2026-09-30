# BVP-S06D Prerequisite — Generic Identity-Preserving REMOTE Move Fixture

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S06D  
**Predecessor:** accepted S06C reviewed integration state `e07dc3e93828180893882da2d43d378bdf9f4124`

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
