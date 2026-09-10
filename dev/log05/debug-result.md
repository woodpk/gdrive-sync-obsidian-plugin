# LOG-05 transform debug

exit: 1
```text
Traceback (most recent call last):
  File "/home/runner/work/gdrive-sync-obsidian-plugin/gdrive-sync-obsidian-plugin/repo/../tooling/dev/log05/apply-log05.py", line 520, in <module>
    t = once(t, '''  if (loaded.status !== "trusted") return loaded.reason;
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/home/runner/work/gdrive-sync-obsidian-plugin/gdrive-sync-obsidian-plugin/repo/../tooling/dev/log05/apply-log05.py", line 19, in once
    raise RuntimeError(f"{label}: expected exactly one match, found {count}")
RuntimeError: preverify entry: expected exactly one match, found 2
```
