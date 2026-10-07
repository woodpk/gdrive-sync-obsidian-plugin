# B01 Watcher Health Gate

- Approved repair branch: `codex/phase6-windows-watcher-compat-repair-r2`
- Approved repair HEAD: `4622ac5523c29fc140db962cdd47f3b910cf7648`
- Approved watcher SHA-256: `ef1af9730db24ff5e7992fdd30005dc2ff972c4ff7f0dad4c625e0ddd8d68939`
- Runtime: Windows PowerShell 5.1 Desktop
- Validation root: live BRAIN vault
- Plugin-state monitoring: size/SHA-256 only
- Initial sandboxed launch could not write the evidence CSV and was stopped before any fixture mutation.
- The identical approved watcher was restarted with evidence-folder write access before any fixture mutation.
- Watcher console output/exceptions after restart: none
- Resource telemetry is advancing; 90 samples were present at the pre-action snapshot.
- Four Obsidian processes were observed and all were responsive.
- No degraded monitoring fallback is in use.
