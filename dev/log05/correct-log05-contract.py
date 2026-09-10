from pathlib import Path

files = [
    "src/state/persistent-state-store.ts",
    "src/product/synchronization-adapters.ts",
    "src/product/durable-intent-recovery.ts",
    "src/product/durable-intent-recovery-base.ts",
    "test/workstreams/state/state-authority-v1-1.test.ts",
    "test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts",
]

for name in files:
    p = Path(name)
    t = p.read_text(encoding="utf-8")
    t = t.replace('"state.remote-learning"', '"state.authority"')
    t = t.replace('"state.recovery"', '"recovery.durable"')
    t = t.replace('remoteBatchId:', 'batchId:')
    t = t.replace('effectCount:', 'count:')
    t = t.replace('decision:', 'classification:')
    t = t.replace('reconstructed: false', 'reconstruction: "failed"')
    t = t.replace('reconstructed: true', 'reconstruction: "succeeded"')
    t = t.replace('reconstructed: Boolean(reconstructed)', 'reconstruction: reconstructed ? "succeeded" : "failed"')
    t = t.replace('fields?.remoteBatchId', 'fields?.batchId')
    t = t.replace('fields?.reconstructed === true', 'fields?.reconstruction === "succeeded"')
    p.write_text(t, encoding="utf-8")

# Preserve subclass structural compatibility: one protected logger lives on the base;
# the adapter accepts it but does not redeclare a second private nominal member.
p = Path("src/state/persistent-state-store.ts")
t = p.read_text(encoding="utf-8")
old = 'private readonly diagnostics?: DiagnosticLogger) { this.semanticValidator = semanticValidator; }'
if t.count(old) != 1:
    raise RuntimeError(f"base diagnostics declaration expected 1, found {t.count(old)}")
t = t.replace(old, 'protected readonly diagnostics?: DiagnosticLogger) { this.semanticValidator = semanticValidator; }', 1)
p.write_text(t, encoding="utf-8")

p = Path("src/product/synchronization-adapters.ts")
t = p.read_text(encoding="utf-8")
old = 'constructor(private readonly source: PersistentSynchronizationStateStore, private readonly diagnostics?: DiagnosticLogger) {'
if t.count(old) != 1:
    raise RuntimeError(f"adapter diagnostics declaration expected 1, found {t.count(old)}")
t = t.replace(old, 'constructor(private readonly source: PersistentSynchronizationStateStore, diagnostics?: DiagnosticLogger) {', 1)
p.write_text(t, encoding="utf-8")

print("LOG-05 instrumentation aligned to frozen LOG-01 vocabulary and inheritance")
