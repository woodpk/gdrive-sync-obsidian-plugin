# Governance Locks

Purpose: durable machine-readable or documentary locks that prevent unauthorized drift from accepted architecture, process, or repository boundaries.

Allowed artifact classes: frozen boundary manifests, architecture locks, process locks, and similar accepted constraints.

Prohibited artifact classes: ordinary tests, transient state, task prompts, PHX-CI run output, or historical review notes.

Authority status: a lock is authoritative only when established through the project authority system.

Naming: lowercase kebab-case descriptive filenames unless an existing locked filename must be preserved.
