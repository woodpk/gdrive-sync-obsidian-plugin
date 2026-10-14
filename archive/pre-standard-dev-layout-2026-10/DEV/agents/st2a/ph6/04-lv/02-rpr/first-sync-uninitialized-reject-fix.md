# REJECTION

Build rejected for C1.

# SCOPE

Correct C1 and only directly necessary tests/fallout. Do not redesign synchronization, migration, recovery, or authority contracts.

Entry SHA: `106284921be45e4dd58ecdb21f3cf4552d135584`

# CORRECTIONS

## C1 — uninitialized first sync is incorrectly routed through durable recovery

**FILE**
`src/product/product-controller.ts`

**LOCATION**
`authorityLearningAssembler(...)`, wrapper around `assemble` / `assembleFull` / `assembleRecovery`.

**DEFECT**
A clean new installation correctly assembles `state.status === "uninitialized"`, but the wrapper then unconditionally calls durable-intent recovery. That recovery requires existing trusted authority and converts `uninitialized` into `recovery-required`, so Verify/Reconcile produces no first-sync preview.

**REQUIRED CHANGE**
After the initial assembly returns, if `assembly.input.state.status === "uninitialized"`, return that assembly directly to normal planning. Do not call `persistLearnedRemoteBatch()` or `recoverOutstandingDurableIntents()` for that uninitialized assembly.

Use this structure:

```ts
let assembly = await original(...args);
if (assembly.input.state.status === "uninitialized") return assembly;
await persistLearnedRemoteBatch(assembly, authorityStore, options);
```

Leave the existing trusted-authority recovery path unchanged for non-uninitialized states.

**CONSTRAINTS**
- Preview must not initialize/write authority merely to display the first-sync plan.
- Keep existing execution-time initialization: `ensureTrustedState()` -> `SynchronizationStateAuthorityAdapter.saveTrusted()` -> current v1.1 authority creation before physical mutation.
- Do not weaken `recovery-required` handling for corrupt/missing-existing/trusted-authority recovery cases.
- No legacy migration work.

**RELATED CHANGES**
Add the smallest regression coverage in the existing product/controller test surface. Test only what is needed to prove:
1. absent state bytes + `new-installation` => Verify/Reconcile returns a first-sync plan, not `recovery-required`;
2. preview leaves durable state uninitialized;
3. reviewed execution initializes current authority before mutation;
4. an existing trusted authority path still invokes durable recovery as before.

**ACCEPTANCE**
The clean-state scenario that failed live A03 reaches a reviewable first-sync safe-union plan without preview-time persistence, while existing recovery semantics remain unchanged.

# VERIFICATION

Run:
- the directly affected test file(s);
- `npm run typecheck`;
- `npm test`;
- `npm run build`.

Report actual results only.

# CHANGE_MANIFEST

Report every file created, modified, or deleted.

# COMPLETION_RESPONSE

Return:
- C1 completed or blocked;
- verification commands/results;
- change manifest;
- resulting commit SHA;
- any remaining blocker.

# STOP

Stop after C1 and directly necessary regression tests are implemented and verified. Do not continue into release, installation, live testing, unrelated cleanup, or further diagnosis.
