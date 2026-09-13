# F02 — Large Transfer / Integrity / Resource Safety

Follow the shared protocol. Use a disposable large file sized to exercise the production transfer path without stressing the account/device unsafely.

Sync Windows → remote → iPhone, then reverse with a distinct changed version.

PASS: transferred hashes match exactly; no partial file is exposed as final; memory/concurrency remain bounded enough for iOS; interruption is not required here; no unrelated content changes.

Record file size, hashes, elapsed transfer observations, and any resource warning.

Stop.
