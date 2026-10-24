/**
 * Test-only preloader used by BVP_CLI_RESULT_FINALIZATION.
 * Patches only a newly reserved FileHandle.close() for a compiled child-process
 * test, then throws AFTER the real close. This verifies the caller does not
 * report success until file finalization has succeeded.
 *
 * Never imported by the public CLI, scenario catalog, or shipping production.
 * The public command accepts no fault-injection flags.
 */
const fsPromises = require("node:fs/promises") as {
  open: typeof import("node:fs/promises").open;
};
const originalOpen = fsPromises.open.bind(fsPromises);
fsPromises.open = async (path, flags, mode) => {
  const handle = await originalOpen(path, flags, mode);
  if (flags === "wx") {
    const closeNormally = handle.close.bind(handle);
    handle.close = async () => {
      await closeNormally();
      throw new Error("test-only-result-file-close-failure");
    };
  }
  return handle;
};
