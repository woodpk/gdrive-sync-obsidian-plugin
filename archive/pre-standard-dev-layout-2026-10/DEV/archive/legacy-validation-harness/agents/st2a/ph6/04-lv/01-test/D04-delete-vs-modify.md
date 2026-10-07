# D04 — Delete vs Independent Modify

Follow the shared protocol.

From one common synced text fixture, delete it on one device while independently modifying it on the other before either change is synchronized. Test one direction, restore a clean BASE, then repeat with device roles reversed.

Expected both times: modification survives and deletion conflict is surfaced; deletion must not silently erase the modification.

PASS: modified content remains recoverable/live as required and no newest-wins/destructive guess occurs.

Stop before D05.
