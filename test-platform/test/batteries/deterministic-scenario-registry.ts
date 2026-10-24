import { validateScenarioDefinition, type ScenarioDefinition } from "../../src/scenario/scenario-contract";
import { divergentNoBaseCollisionScenario } from "../../scenarios/06a/divergent-no-base-collision";
import { establishedEqualNoOpScenario } from "../../scenarios/06a/established-equal-no-op";
import { establishedLocalOnlyModificationScenario } from "../../scenarios/06a/established-local-only-modification";
import { establishedRemoteOnlyModificationScenario } from "../../scenarios/06a/established-remote-only-modification";
import { freshEqualCollisionScenario } from "../../scenarios/06a/fresh-equal-collision";
import { freshLocalOnlyScenario } from "../../scenarios/06a/fresh-local-only";
import { freshRemoteOnlyScenario } from "../../scenarios/06a/fresh-remote-only";
import { binaryConflictScenario } from "../../scenarios/06b/binary-conflict";
import { cleanTextMergeScenario } from "../../scenarios/06b/clean-text-merge";
import { localDeleteRemoteModifyScenario } from "../../scenarios/06b/local-delete-remote-modify";
import { remoteDeleteLocalModifyScenario } from "../../scenarios/06b/remote-delete-local-modify";
import { trueTextConflictScenario } from "../../scenarios/06b/true-text-conflict";
import { bothDeletedScenario } from "../../scenarios/06c/both-deleted";
import { clockSkewScenario } from "../../scenarios/06c/clock-skew";
import { localDeletionScenario } from "../../scenarios/06c/local-deletion";
import { noBaseAbsenceScenario } from "../../scenarios/06c/no-base-absence";
import { remoteDeletionScenario } from "../../scenarios/06c/remote-deletion";
import { staleDeviceReturnScenario } from "../../scenarios/06c/stale-device-return";
import { unreadableLocalPathScenario } from "../../scenarios/06c/unreadable-local-path";
import { ambiguousLocalMoveScenario } from "../../scenarios/06d/ambiguous-local-move";
import { caseCollisionScenario } from "../../scenarios/06d/case-collision";
import { destinationCollisionScenario } from "../../scenarios/06d/destination-collision";
import { invalidTargetPathScenario } from "../../scenarios/06d/invalid-target-path";
import { localRenameScenario } from "../../scenarios/06d/local-rename";
import { remoteRenameScenario } from "../../scenarios/06d/remote-rename";
import { unicodeCollisionScenario } from "../../scenarios/06d/unicode-collision";
import { deviceLocalConfigScenario } from "../../scenarios/06e/device-local-config";
import { emptyLocalFolderScenario } from "../../scenarios/06e/empty-local-folder";
import { emptyRemoteFolderScenario } from "../../scenarios/06e/empty-remote-folder";
import { excludedLocalDefaultScenario } from "../../scenarios/06e/excluded-local-default";
import { excludedRemoteDefaultScenario } from "../../scenarios/06e/excluded-remote-default";
import { hiddenDotfileIncludedScenario } from "../../scenarios/06e/hidden-dotfile-included";
import { ownPluginSettingsProtectedScenario } from "../../scenarios/06e/own-plugin-settings-protected";
import { protectedConfigScenario } from "../../scenarios/06e/protected-config";
import { thirdPartySettingsExcludedScenario } from "../../scenarios/06e/third-party-settings-excluded";
import { unknownBinaryLocalScenario } from "../../scenarios/06e/unknown-binary-local";
import { unknownBinaryRemoteScenario } from "../../scenarios/06e/unknown-binary-remote";
import { afterCanonicalStateWriteScenario } from "../../scenarios/07a/after-canonical-state-write";
import { afterRemoteEffectScenario } from "../../scenarios/07a/after-remote-effect";
import { ambiguousAppliedScenario } from "../../scenarios/07a/ambiguous-applied";
import { ambiguousNotAppliedScenario } from "../../scenarios/07a/ambiguous-not-applied";
import { beforeCanonicalStateWriteScenario } from "../../scenarios/07a/before-canonical-state-write";
import { beforeRemoteDispatchScenario } from "../../scenarios/07a/before-remote-dispatch";
import { corruptStateScenario } from "../../scenarios/07b/corrupt-state";
import { incompatibleRootProtocolScenario } from "../../scenarios/07b/incompatible-root-protocol";
import { incompatibleStateVersionScenario } from "../../scenarios/07b/incompatible-state-version";
import { lostChangeCursorScenario } from "../../scenarios/07b/lost-change-cursor";
import { missingManagedRootScenario } from "../../scenarios/07b/missing-managed-root";
import { partialChangePageScenario } from "../../scenarios/07b/partial-change-page";
import { partialRemoteListingScenario } from "../../scenarios/07b/partial-remote-listing";
import { rootIdentityMismatchScenario } from "../../scenarios/07b/root-identity-mismatch";
import { truncatedStateScenario } from "../../scenarios/07b/truncated-state";
import { cancelAfterEffectScenario } from "../../scenarios/07c/cancel-after-effect";
import { cancelBeforeEffectScenario } from "../../scenarios/07c/cancel-before-effect";
import { clonedStateDetectedScenario } from "../../scenarios/07c/cloned-state-detected";
import { repeatedCancellationScenario } from "../../scenarios/07c/repeated-cancellation";
import { restoredStaleStateReconcilesScenario } from "../../scenarios/07c/restored-stale-state-reconciles";
import { downloadIntegrityScenario } from "../../scenarios/07d/download-integrity";
import { localSourceChangedAfterPreviewScenario } from "../../scenarios/07d/local-source-changed-after-preview";
import { remoteSourceChangedAfterPreviewScenario } from "../../scenarios/07d/remote-source-changed-after-preview";
import { transientRemoteFailureScenario } from "../../scenarios/07d/transient-remote-failure";
import { uploadIntegrityScenario } from "../../scenarios/07d/upload-integrity";
import { destructiveBelowThresholdScenario } from "../../scenarios/07e/destructive-below-threshold";
import { destructiveThresholdBlockedScenario } from "../../scenarios/07e/destructive-threshold-blocked";
import { lifecycleReconstructionScenario } from "../../scenarios/07e/lifecycle-reconstruction";
import { localDiskFullScenario } from "../../scenarios/07e/local-disk-full";
import { protectedConfigChangeScenario } from "../../scenarios/07e/protected-config-change";
import { remoteQuotaExhaustionScenario } from "../../scenarios/07e/remote-quota-exhaustion";
import { multiDeviceConflictScenario } from "../../scenarios/multi-device-conflict";
import { ordinaryOneSidedSyncScenario } from "../../scenarios/ordinary-one-sided-sync";

/** DEC-351: compile-time allowlist of existing deterministic definitions, not a runner or plugin router.
 * Source paths are source-audit identifiers only and are never interpolated into dynamic imports.
 */
const DEFINITIONS: readonly { readonly source: string; readonly definition: ScenarioDefinition }[] = [
  { source: "06a/divergent-no-base-collision.ts", definition: divergentNoBaseCollisionScenario },
  { source: "06a/established-equal-no-op.ts", definition: establishedEqualNoOpScenario },
  { source: "06a/established-local-only-modification.ts", definition: establishedLocalOnlyModificationScenario },
  { source: "06a/established-remote-only-modification.ts", definition: establishedRemoteOnlyModificationScenario },
  { source: "06a/fresh-equal-collision.ts", definition: freshEqualCollisionScenario },
  { source: "06a/fresh-local-only.ts", definition: freshLocalOnlyScenario },
  { source: "06a/fresh-remote-only.ts", definition: freshRemoteOnlyScenario },
  { source: "06b/binary-conflict.ts", definition: binaryConflictScenario },
  { source: "06b/clean-text-merge.ts", definition: cleanTextMergeScenario },
  { source: "06b/local-delete-remote-modify.ts", definition: localDeleteRemoteModifyScenario },
  { source: "06b/remote-delete-local-modify.ts", definition: remoteDeleteLocalModifyScenario },
  { source: "06b/true-text-conflict.ts", definition: trueTextConflictScenario },
  { source: "06c/both-deleted.ts", definition: bothDeletedScenario },
  { source: "06c/clock-skew.ts", definition: clockSkewScenario },
  { source: "06c/local-deletion.ts", definition: localDeletionScenario },
  { source: "06c/no-base-absence.ts", definition: noBaseAbsenceScenario },
  { source: "06c/remote-deletion.ts", definition: remoteDeletionScenario },
  { source: "06c/stale-device-return.ts", definition: staleDeviceReturnScenario },
  { source: "06c/unreadable-local-path.ts", definition: unreadableLocalPathScenario },
  { source: "06d/ambiguous-local-move.ts", definition: ambiguousLocalMoveScenario },
  { source: "06d/case-collision.ts", definition: caseCollisionScenario },
  { source: "06d/destination-collision.ts", definition: destinationCollisionScenario },
  { source: "06d/invalid-target-path.ts", definition: invalidTargetPathScenario },
  { source: "06d/local-rename.ts", definition: localRenameScenario },
  { source: "06d/remote-rename.ts", definition: remoteRenameScenario },
  { source: "06d/unicode-collision.ts", definition: unicodeCollisionScenario },
  { source: "06e/device-local-config.ts", definition: deviceLocalConfigScenario },
  { source: "06e/empty-local-folder.ts", definition: emptyLocalFolderScenario },
  { source: "06e/empty-remote-folder.ts", definition: emptyRemoteFolderScenario },
  { source: "06e/excluded-local-default.ts", definition: excludedLocalDefaultScenario },
  { source: "06e/excluded-remote-default.ts", definition: excludedRemoteDefaultScenario },
  { source: "06e/hidden-dotfile-included.ts", definition: hiddenDotfileIncludedScenario },
  { source: "06e/own-plugin-settings-protected.ts", definition: ownPluginSettingsProtectedScenario },
  { source: "06e/protected-config.ts", definition: protectedConfigScenario },
  { source: "06e/third-party-settings-excluded.ts", definition: thirdPartySettingsExcludedScenario },
  { source: "06e/unknown-binary-local.ts", definition: unknownBinaryLocalScenario },
  { source: "06e/unknown-binary-remote.ts", definition: unknownBinaryRemoteScenario },
  { source: "07a/after-canonical-state-write.ts", definition: afterCanonicalStateWriteScenario },
  { source: "07a/after-remote-effect.ts", definition: afterRemoteEffectScenario },
  { source: "07a/ambiguous-applied.ts", definition: ambiguousAppliedScenario },
  { source: "07a/ambiguous-not-applied.ts", definition: ambiguousNotAppliedScenario },
  { source: "07a/before-canonical-state-write.ts", definition: beforeCanonicalStateWriteScenario },
  { source: "07a/before-remote-dispatch.ts", definition: beforeRemoteDispatchScenario },
  { source: "07b/corrupt-state.ts", definition: corruptStateScenario },
  { source: "07b/incompatible-root-protocol.ts", definition: incompatibleRootProtocolScenario },
  { source: "07b/incompatible-state-version.ts", definition: incompatibleStateVersionScenario },
  { source: "07b/lost-change-cursor.ts", definition: lostChangeCursorScenario },
  { source: "07b/missing-managed-root.ts", definition: missingManagedRootScenario },
  { source: "07b/partial-change-page.ts", definition: partialChangePageScenario },
  { source: "07b/partial-remote-listing.ts", definition: partialRemoteListingScenario },
  { source: "07b/root-identity-mismatch.ts", definition: rootIdentityMismatchScenario },
  { source: "07b/truncated-state.ts", definition: truncatedStateScenario },
  { source: "07c/cancel-after-effect.ts", definition: cancelAfterEffectScenario },
  { source: "07c/cancel-before-effect.ts", definition: cancelBeforeEffectScenario },
  { source: "07c/cloned-state-detected.ts", definition: clonedStateDetectedScenario },
  { source: "07c/repeated-cancellation.ts", definition: repeatedCancellationScenario },
  { source: "07c/restored-stale-state-reconciles.ts", definition: restoredStaleStateReconcilesScenario },
  { source: "07d/download-integrity.ts", definition: downloadIntegrityScenario },
  { source: "07d/local-source-changed-after-preview.ts", definition: localSourceChangedAfterPreviewScenario },
  { source: "07d/remote-source-changed-after-preview.ts", definition: remoteSourceChangedAfterPreviewScenario },
  { source: "07d/transient-remote-failure.ts", definition: transientRemoteFailureScenario },
  { source: "07d/upload-integrity.ts", definition: uploadIntegrityScenario },
  { source: "07e/destructive-below-threshold.ts", definition: destructiveBelowThresholdScenario },
  { source: "07e/destructive-threshold-blocked.ts", definition: destructiveThresholdBlockedScenario },
  { source: "07e/lifecycle-reconstruction.ts", definition: lifecycleReconstructionScenario },
  { source: "07e/local-disk-full.ts", definition: localDiskFullScenario },
  { source: "07e/protected-config-change.ts", definition: protectedConfigChangeScenario },
  { source: "07e/remote-quota-exhaustion.ts", definition: remoteQuotaExhaustionScenario },
  { source: "multi-device-conflict.ts", definition: multiDeviceConflictScenario },
  { source: "ordinary-one-sided-sync.ts", definition: ordinaryOneSidedSyncScenario },
];

const indexed = new Map<string, ScenarioDefinition>();
const seenSources = new Set<string>();
for (const entry of DEFINITIONS) {
  const { source, definition } = entry;
  const checked = validateScenarioDefinition(definition);
  if (!checked.ok || !definition.executionModes.includes("deterministic") ||
      definition.executionModes.includes("live") ||
      indexed.has(definition.id) || seenSources.has(source)) {
    throw new Error("deterministic-scenario-catalog-invalid");
  }
  indexed.set(definition.id, definition);
  seenSources.add(source);
}

export interface DeterministicScenarioListing {
  readonly id: string;
  readonly mode: "deterministic";
  readonly description: string;
}
const listing: readonly DeterministicScenarioListing[] = Object.freeze(
  [...indexed.values()].map(value => Object.freeze({
    id: value.id, mode: "deterministic" as const, description: value.description,
  })).sort((a, b) => a.id.localeCompare(b.id)),
);

export function listDeterministicScenarios(): readonly DeterministicScenarioListing[] {
  return listing;
}
export function getDeterministicScenario(id: string): ScenarioDefinition | undefined {
  return indexed.get(id);
}
export function deterministicScenarioSourceFiles(): readonly string[] {
  return Object.freeze(DEFINITIONS.map(row => row.source));
}
