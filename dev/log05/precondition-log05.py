from pathlib import Path

p = Path("src/product/durable-intent-recovery.ts")
t = p.read_text(encoding="utf-8")
start = t.index("async function preflightVerifiedEffects(")
end = t.index("export async function recoverMatchingDurableIntentToVerifiedReceipt(", start)
prefix, section, suffix = t[:start], t[start:end], t[end:]
old_entry = '  if (loaded.status !== "trusted") return loaded.reason;\n  let remotePromise'
new_entry = '  if (loaded.status !== "trusted") { return loaded.reason; }\n  let remotePromise'
old_validation = '    const invalid = validateIntent(intent, loaded.state);\n    if (invalid) return invalid;\n    for (const effect of intent.effects) {'
new_validation = '    const invalid = validateIntent(intent, loaded.state);\n    if (invalid) { return invalid; }\n    for (const effect of intent.effects) {'
if section.count(old_entry) != 1:
    raise RuntimeError(f"preflight entry precondition expected 1, found {section.count(old_entry)}")
if section.count(old_validation) != 1:
    raise RuntimeError(f"preflight validation precondition expected 1, found {section.count(old_validation)}")
section = section.replace(old_entry, new_entry, 1).replace(old_validation, new_validation, 1)
p.write_text(prefix + section + suffix, encoding="utf-8")
print("LOG-05 preflight duplicate anchors disambiguated")
