import type {
  BaseEntry,
  ConflictAssessment,
  ConflictResolver,
  ContentEvidence,
  PathSnapshot,
  PlannedOperation,
  PlanExecutionDisposition,
  PlanningInput,
  StateLoadResult,
  SynchronizationPlan,
  SynchronizationPlanner,
  VaultPath,
  VersionReference,
} from "../contracts";
import { contractId } from "../contracts";
import { DestructiveSafetyPolicy } from "./destructive-safety";

export interface PlannerOptions {
  readonly trigger?: SynchronizationPlan["trigger"];
  readonly recentAverageDestructiveOperations?: number;
}

const branded = <T extends string>(value: string) => contractId<T>(value);

function observed(snapshot: PathSnapshot, side: "local" | "remote"): VersionReference | undefined {
  const value = snapshot[side];
  return value.status === "present"
    ? { path: value.path, entityKind: value.entityKind, content: value.content, remoteObjectId: value.remoteObjectId, observationToken: value.observationToken }
    : undefined;
}

function fromBase(entry?: BaseEntry): VersionReference | undefined {
  return entry ? { path: entry.path, entityKind: entry.entityKind, content: entry.content, remoteObjectId: entry.remoteObjectId } : undefined;
}

function evidenceEqual(a: ContentEvidence | undefined, b: ContentEvidence | undefined, kind: "file" | "folder"): boolean {
  if (kind === "folder") return true;
  if (!a || !b) return false;
  if (a.hash && b.hash) return a.hash === b.hash;
  if (a.revision && b.revision) return a.revision === b.revision;
  return false;
}

function sameVersion(a: VersionReference, b: VersionReference): boolean {
  return a.entityKind === b.entityKind && evidenceEqual(a.content, b.content, a.entityKind);
}

function makeOperation(path: VaultPath, index: number, kind: PlannedOperation["kind"], extra: Partial<PlannedOperation> = {}): PlannedOperation {
  return {
    operationId: branded<"OperationId">(`op:${index}:${kind}:${String(path)}`),
    kind,
    path,
    destructive: false,
    preconditions: [],
    reasons: [],
    ...extra,
  } as PlannedOperation;
}

function blocked(path: VaultPath, index: number, code: string, summary: string, recovery = false): PlannedOperation {
  return makeOperation(path, index, recovery ? "recovery-required" : "blocked-unsafe", { reasons: [{ code, summary }] });
}

function uncertainty(snapshot: PathSnapshot): { code: string; summary: string; recovery?: boolean } | undefined {
  if (snapshot.base.status === "untrusted") return { code: "untrusted-base", summary: snapshot.base.reason, recovery: true };
  if (snapshot.identity.status !== "unambiguous") return { code: "identity-ambiguous", summary: snapshot.identity.reason };
  if (snapshot.local.status === "unreadable" || snapshot.local.status === "inaccessible" || snapshot.local.status === "unknown") {
    return { code: `local-${snapshot.local.status}`, summary: snapshot.local.reason };
  }
  if (snapshot.remote.status === "unreadable" || snapshot.remote.status === "inaccessible" || snapshot.remote.status === "unknown") {
    return { code: `remote-${snapshot.remote.status}`, summary: snapshot.remote.reason };
  }
  if (snapshot.remote.status === "absent" && snapshot.remoteEnumeration.status !== "complete") {
    return { code: "remote-enumeration-incomplete", summary: snapshot.remoteEnumeration.reason };
  }
  return undefined;
}

function conflictOperation(path: VaultPath, index: number, assessment: ConflictAssessment): PlannedOperation {
  if (assessment.kind === "clean-merge") {
    return makeOperation(path, index, "clean-text-merge", {
      contentVersion: assessment.mergedVersion,
      preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }],
      reasons: [{ code: "clean-three-way-merge", summary: "Concurrent text changes merge cleanly from the trusted base." }],
    });
  }
  if (assessment.kind === "none") return makeOperation(path, index, "noop", { reasons: [{ code: "no-conflict", summary: "No mutation is required." }] });
  return makeOperation(path, index, "unresolved-conflict", {
    conflictId: String(assessment.conflictId),
    reasons: [{ code: assessment.kind, summary: "Concurrent changes require preservation and explicit resolution." }],
  });
}

function strongHistoricalMatch(prior: BaseEntry, snapshot: PathSnapshot): boolean {
  if (snapshot.local.status !== "present" || snapshot.local.entityKind !== prior.entityKind) return false;
  if (prior.remoteObjectId && snapshot.local.remoteObjectId === prior.remoteObjectId) return true;
  if (prior.entityKind === "folder") return false;
  return Boolean(prior.content?.hash && snapshot.local.content?.hash && prior.content.hash === snapshot.local.content.hash);
}

export class DeterministicSynchronizationPlanner implements SynchronizationPlanner {
  constructor(
    private readonly conflicts: ConflictResolver,
    private readonly destructiveSafety = new DestructiveSafetyPolicy(),
    private readonly options: PlannerOptions = {},
  ) {}

  async plan(input: PlanningInput): Promise<SynchronizationPlan> {
    const operations: PlannedOperation[] = [];
    let index = 0;

    if (input.state.status === "recovery-required") {
      const targets = input.snapshots.length ? input.snapshots.map(s => s.path) : [branded<"VaultPath">("__sync_state__")];
      for (const path of targets) operations.push(blocked(path, index++, "state-recovery-required", input.state.detail ?? input.state.reason, true));
      return this.finish(input.state, input.snapshots.length, operations);
    }

    const handled = new Set<string>();
    if (input.state.status === "trusted") {
      this.classifyProvenMoves(input.snapshots, input.state.state.base, operations, handled, () => index++);
    }

    for (const snapshot of input.snapshots) {
      if (handled.has(String(snapshot.path))) continue;
      const unsafe = uncertainty(snapshot);
      if (unsafe) {
        operations.push(blocked(snapshot.path, index++, unsafe.code, unsafe.summary, unsafe.recovery));
        continue;
      }

      const local = observed(snapshot, "local");
      const remote = observed(snapshot, "remote");
      const baseEntry = snapshot.base.status === "trusted" ? snapshot.base.entry : undefined;
      const baseVersion = fromBase(baseEntry);

      if (input.state.status === "trusted" && snapshot.base.status === "trusted" && snapshot.base.tombstone && (local || remote) && input.state.state.knownDevices.some(d => d.stale)) {
        operations.push(blocked(snapshot.path, index++, "tombstone-resurrection-blocked", "A known stale device exists; reconcile before accepting content that reappeared under a tombstone."));
        continue;
      }

      if (!local && !remote) {
        operations.push(makeOperation(snapshot.path, index++, "noop", baseEntry ? {
          preconditions: [
            { kind: "base-trusted" },
            { kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" },
            { kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" },
            { kind: "remote-enumeration-complete" },
          ],
          reasons: [{ code: "both-deleted", summary: "Both sides are reliably absent from trusted prior state; record a durable tombstone transition." }],
        } : { reasons: [{ code: "both-absent", summary: "Neither side currently contains the never-established path." }] }));
        continue;
      }

      if (!local && remote) {
        if (!baseEntry?.localExisted || !baseEntry.remoteExisted) {
          operations.push(makeOperation(snapshot.path, index++, "download-create", {
            targetSide: "local", contentVersion: remote,
            preconditions: [{ kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" }],
            reasons: [{ code: "safe-union-remote-only", summary: "Remote-only content is copied locally during safe union." }],
          }));
        } else if (!evidenceEqual(remote.content, baseEntry.content, remote.entityKind)) {
          operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, baseVersion, undefined, remote)));
        } else {
          operations.push(makeOperation(snapshot.path, index++, "trash-remote", {
            targetSide: "remote", remoteObjectId: remote.remoteObjectId ?? baseEntry.remoteObjectId, destructive: true,
            preconditions: [{ kind: "base-trusted" }, { kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" }, { kind: "remote-enumeration-complete" }],
            reasons: [{ code: "attested-local-deletion", summary: "Trusted prior existence plus reliable local absence authorizes recoverable remote trash." }],
          }));
        }
        continue;
      }

      if (local && !remote) {
        if (!baseEntry?.localExisted || !baseEntry.remoteExisted) {
          if (snapshot.local.status === "present" && snapshot.local.stability !== "stable") {
            operations.push(blocked(snapshot.path, index++, "local-file-not-stable", "Local content is not stable enough to upload."));
          } else {
            operations.push(makeOperation(snapshot.path, index++, "upload-create", {
              targetSide: "remote", contentVersion: local,
              preconditions: [{ kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" }, { kind: "file-stable", path: snapshot.path }],
              reasons: [{ code: "safe-union-local-only", summary: "Local-only content is copied remotely during safe union." }],
            }));
          }
        } else if (!evidenceEqual(local.content, baseEntry.content, local.entityKind)) {
          operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, baseVersion, local, undefined)));
        } else {
          operations.push(makeOperation(snapshot.path, index++, "trash-local", {
            targetSide: "local", destructive: true,
            preconditions: [{ kind: "base-trusted" }, { kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" }, { kind: "remote-enumeration-complete" }],
            reasons: [{ code: "attested-remote-deletion", summary: "Trusted prior existence plus complete remote absence authorizes recoverable local trash." }],
          }));
        }
        continue;
      }

      if (sameVersion(local!, remote!)) {
        operations.push(makeOperation(snapshot.path, index++, "noop", { reasons: [{ code: baseEntry ? "equal-current-content" : "safe-union-identical", summary: "Both sides contain equivalent content." }] }));
        continue;
      }
      if (!baseEntry) {
        operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, undefined, local, remote)));
        continue;
      }

      const localChanged = !evidenceEqual(local!.content, baseEntry.content, local!.entityKind);
      const remoteChanged = !evidenceEqual(remote!.content, baseEntry.content, remote!.entityKind);
      if (!localChanged && !remoteChanged) {
        operations.push(makeOperation(snapshot.path, index++, "noop", { reasons: [{ code: "unchanged-from-base", summary: "Both sides match the trusted base." }] }));
      } else if (localChanged && !remoteChanged) {
        if (snapshot.local.status === "present" && snapshot.local.stability !== "stable") {
          operations.push(blocked(snapshot.path, index++, "local-file-not-stable", "Local modification is not stable enough to upload."));
        } else {
          operations.push(makeOperation(snapshot.path, index++, "upload-update", {
            targetSide: "remote", remoteObjectId: remote!.remoteObjectId ?? baseEntry.remoteObjectId, contentVersion: local,
            preconditions: [{ kind: "base-trusted" }, { kind: "content-evidence", side: "remote", path: snapshot.path, expected: baseEntry.content ?? {} }, { kind: "file-stable", path: snapshot.path }],
            reasons: [{ code: "local-only-modification", summary: "Only local content differs from the trusted base." }],
          }));
        }
      } else if (!localChanged && remoteChanged) {
        operations.push(makeOperation(snapshot.path, index++, "download-update", {
          targetSide: "local", contentVersion: remote,
          preconditions: [{ kind: "base-trusted" }, { kind: "content-evidence", side: "local", path: snapshot.path, expected: baseEntry.content ?? {} }],
          reasons: [{ code: "remote-only-modification", summary: "Only remote content differs from the trusted base." }],
        }));
      } else {
        operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, baseVersion, local, remote)));
      }
    }

    if (input.state.status === "trusted") {
      const trustedState = input.state.state;
      const currentDevice = trustedState.knownDevices.find(device => device.deviceId === trustedState.deviceIdentity);
      if (currentDevice?.stale) {
        for (let i = 0; i < operations.length; i += 1) {
          const operation = operations[i];
          if (!operation.destructive) continue;
          operations[i] = blocked(operation.path, i, "stale-device-destructive-gate", "This device is stale and must reconcile before it can authorize destructive propagation.");
        }
      }
    }

    return this.finish(input.state, input.snapshots.length, operations);
  }

  private classifyProvenMoves(
    snapshots: readonly PathSnapshot[],
    bases: readonly BaseEntry[],
    operations: PlannedOperation[],
    handled: Set<string>,
    nextIndex: () => number,
  ): void {
    const byPath = new Map(snapshots.map(snapshot => [String(snapshot.path), snapshot]));
    for (const prior of bases) {
      if (!prior.remoteObjectId) continue;
      const oldSnapshot = byPath.get(String(prior.path));
      if (!oldSnapshot || oldSnapshot.identity.status !== "unambiguous") continue;

      const remoteCandidates = snapshots.filter(snapshot => snapshot.path !== prior.path && snapshot.identity.status === "unambiguous" && snapshot.remote.status === "present" && snapshot.remote.remoteObjectId === prior.remoteObjectId);
      const localCandidates = snapshots.filter(snapshot => snapshot.path !== prior.path && snapshot.identity.status === "unambiguous" && strongHistoricalMatch(prior, snapshot));
      const oldRemoteGone = oldSnapshot.remote.status === "absent" && oldSnapshot.remoteEnumeration.status === "complete";
      const oldLocalGone = oldSnapshot.local.status === "absent";

      if (oldRemoteGone && oldSnapshot.local.status === "present") {
        if (remoteCandidates.length > 1) {
          operations.push(blocked(prior.path, nextIndex(), "ambiguous-remote-move", "Multiple current paths claim the same stable remote identity; identity reassignment is prohibited."));
          handled.add(String(prior.path));
          for (const candidate of remoteCandidates) handled.add(String(candidate.path));
          continue;
        }
        if (remoteCandidates.length === 1) {
          const target = remoteCandidates[0];
          operations.push(makeOperation(target.path, nextIndex(), "identity-preserving-move", {
            targetSide: "local", fromPath: prior.path, toPath: target.path, remoteObjectId: prior.remoteObjectId,
            preconditions: [{ kind: "base-trusted" }, { kind: "remote-object", remoteObjectId: prior.remoteObjectId }, { kind: "identity-unambiguous", path: target.path }],
            reasons: [{ code: "proven-remote-move", summary: "Stable remote object identity proves a remote rename/move." }],
          }));
          handled.add(String(prior.path)); handled.add(String(target.path));
          continue;
        }
      }

      if (oldLocalGone && oldSnapshot.remote.status === "present") {
        if (localCandidates.length > 1) {
          operations.push(blocked(prior.path, nextIndex(), "ambiguous-local-move", "Multiple local paths match the same trusted historical identity/content evidence; the rename is not guessed."));
          handled.add(String(prior.path));
          for (const candidate of localCandidates) handled.add(String(candidate.path));
          continue;
        }
        if (localCandidates.length === 1) {
          const target = localCandidates[0];
          operations.push(makeOperation(target.path, nextIndex(), "identity-preserving-move", {
            targetSide: "remote", fromPath: prior.path, toPath: target.path, remoteObjectId: prior.remoteObjectId,
            preconditions: [{ kind: "base-trusted" }, { kind: "remote-object", remoteObjectId: prior.remoteObjectId }, { kind: "identity-unambiguous", path: target.path }],
            reasons: [{ code: "proven-local-move", summary: "Unique stable identity or trusted content evidence proves a local rename/move." }],
          }));
          handled.add(String(prior.path)); handled.add(String(target.path));
        }
      }
    }
  }

  private finish(state: StateLoadResult, totalManagedPaths: number, operations: PlannedOperation[]): SynchronizationPlan {
    const safety = this.destructiveSafety.assess(operations, {
      totalManagedPaths,
      recentAverageDestructiveOperations: this.options.recentAverageDestructiveOperations,
      stateCondition: state.status === "trusted" ? "trusted" : state.status === "uninitialized" ? "reconstructed" : "untrusted",
    });
    let executionDisposition: PlanExecutionDisposition = "safe-auto-eligible";
    if (operations.some(op => op.kind === "recovery-required" || op.kind === "blocked-unsafe")) executionDisposition = "blocked";
    else if (operations.some(op => op.kind === "unresolved-conflict") || safety.requiresApproval) executionDisposition = "requires-user-approval";
    return {
      planId: branded<"PlanId">(`plan:${operations.map(op => `${op.kind}:${String(op.path)}`).join("|")}`),
      trigger: this.options.trigger ?? "verify-reconcile",
      operations,
      executionDisposition,
      recoveryCheckpointRequired: safety.recoveryCheckpointRequired,
    };
  }
}
