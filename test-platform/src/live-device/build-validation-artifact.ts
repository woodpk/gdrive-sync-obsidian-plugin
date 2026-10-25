/** Build-authoring is Node-only framework tooling; runtime device code remains in live-device/. */
export * from "../build-validation-artifact";
import { buildValidationArtifact } from "../build-validation-artifact";
if (require.main === module) buildValidationArtifact().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
