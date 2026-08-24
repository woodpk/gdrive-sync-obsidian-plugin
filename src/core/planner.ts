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

function id<T extends string>(kind: T, value: string): ReturnType<typeof contractId<T>> {
  return contractId<T>(value);
}

function versionFromObservation(snapshot: PathSnapshot, side: "local" | "remote"): VersionReference | undefined {
  const observation = snapshot[side];
  if (observation.status !== "present") return undefined;
  return {
    path: observation.path,
    entityKind: observation.entityKind,
    content: observation.content,
    remoteObjectId: observation.remoteObjectId,
    observationToken: observation.observationToken,
  };
}

function versionFromBase(entry: BaseEntry | undefined): VersionReference | undefined {
  if (!entry) return undefined;
  return { path: entry.path, entityKind: entry.entityKind, content: entry.content, remoteObjectId: entry.remoteObjectId };
}

function evidenceEqual(a: ContentEvidence | undefined, b: ContentEvidence | undefined, entityKind: "file" | "folder"): boolean {
  if (entityKind === "folder") return true;
  if (!a || !b) return false;
  if (a.hash && b.hash) return a.hash === b.hash;
  if (a.revision && b.revision) return a.revision === b.revision;
  if (a.sizeBytes !== undefined && b.sizeBytes !== undefined && a.sizeBytes === b.sizeBytes && !a.hash && !b.hash && !a.revision && !b.revision) return false;
  return false;
}

function presentEqual(a: VersionReference, b: VersionReference): boolean {
  return a.entityKind === b.entityKind && evidenceEqual(a.content, b.content, a.entityKind);
}

function operation(path: VaultPath, index: number, kind: PlannedOperation["kind"], values: Partial<PlannedOperation> = {}): PlannedOperation {
  return {
    operationId: id("OperationId", `op:${index}:${kind}:${String(path)}`),
    kind,
    path,
    destructive: false,
    preconditions: [],
    reasons: [],
    ...values,
  } as PlannedOperation;
}

function block(path: VaultPath, index: number, code: string, summary: string, recovery = false): PlannedOperation {
  return operation(path, index, recovery ? "recovery-required" : "blocked-unsafe", {
    reasons: [{ code, summary }],
  });
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
    return operation(path, index, "clean-text-merge", {
      contentVersion: assessment.mergedVersion,
      preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }],
      reasons: [{ code: "clean-three-way-merge", summary: "Both sides changed from the trusted base and merged without overlap." }],
    });
  }
  if (assessment.kind === "none") return operation(path, index, "noop", { reasons: [{ code: "no-conflict", summary: "No conflict requires mutation." }] });
  return operation(path, index, "unresolved-conflict", {
    conflictId: String(assessment.conflictId),
    reasons: [{ code: assessment.kind, summary: "Concurrent changes require preservation and explicit resolution." }],
  });
}

/** Pure synchronization policy over frozen snapshots and state; it never calls local/remote mutation ports. */
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
      const targets = input.snapshots.length > 0 ? input.snapshots.map(snapshot => snapshot.path) : [id("VaultPath", "__sync_state__")];
      for (const path of targets) operations.push(block(path, index++, "state-recovery-required", input.state.detail ?? input.state.reason, true));
      return this.finish(input.state, input.snapshots.length, operations);
    }

    const handled = new Set<string>();
    if (input.state.status === "trusted") this.classifyProvenMoves(input, operations, handled, () => index++);

    for (const snapshot of input.snapshots) {
      if (handled.has(String(snapshot.path))) continue;
      const unsafe = uncertainty(snapshot);
      if (unsafe) {
        operations.push(block(snapshot.path, index++, unsafe.code, unsafe.summary, unsafe.recovery));
        continue;
      }

      const local = versionFromObservation(snapshot, "local");
      const remote = versionFromObservation(snapshot, "remote");
      const baseEntry = snapshot.base.status === "trusted" ? snapshot.base.entry : undefined;
      const base = versionFromBase(baseEntry);

      if (input.state.status === "trusted" && snapshot.base.status === "trusted" && snapshot.base.tombstone && (local || remote)) {
        const staleDeviceExists = input.state.state.knownDevices.some(device => device.stale);
        if (staleDeviceExists) {
          operations.push(block(snapshot.path, index++, "tombstone-resurrection-blocked", "Content reappeared while a known device is stale; reconcile before accepting resurrection."));
          continue;
        }
      }

      if (!local && !remote) {
        operations.push(operation(snapshot.path, index++, "noop", { reasons: [{ code: baseEntry ? "both-deleted" : "both-absent", summary: "Neither side currently contains the path." }] }));
        continue;
      }

      if (!local && remote) {
        if (!baseEntry || !baseEntry.localExisted || !baseEntry.remoteExisted) {
          operations.push(operation(snapshot.path, index++, "download-create", {
            targetSide: "local", contentVersion: remote,
            preconditions: [{ kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" }],
            reasons: [{ code: "safe-union-remote-only", summary: "Remote-only content is copied locally without deletion inference." }],
          }));
          continue;
        }
        const remoteChanged = !evidenceEqual(remote.content, baseEntry.content, remote.entityKind);
        if (remoteChanged) {
          operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, base, undefined, remote)));
        } else {
          operations.push(operation(snapshot.path, index++, "trash-remote", {
            targetSide: "remote", remoteObjectId: remote.remoteObjectId ?? baseEntry.remoteObjectId, destructive: true,
            preconditions: [{ kind: "base-trusted" }, { kind: "path-observation", side: "local", path: snapshot.path, expected: "absent" }, { kind: "remote-enumeration-complete" }],
            reasons: [{ code: "attested-local-deletion", summary: "Trusted prior two-sided existence plus reliable local absence authorizes recoverable remote trash." }],
          }));
        }
        continue;
      }

      if (local && !remote) {
        if (!baseEntry || !baseEntry.localExisted || !baseEntry.remoteExisted) {
          if (local.entityKind === "file" && local.content === undefined) {
            operations.push(block(snapshot.path, index++, "insufficient-local-content-evidence", "Local file lacks content evidence required for safe creation."));
          } else if (snapshot.local.status === "present" && snapshot.local.stability !== "stable") {
            operations.push(block(snapshot.path, index++, "local-file-not-stable", "Local file is not stable enough to upload."));
          } else {
            operations.push(operation(snapshot.path, index++, "upload-create", {
              targetSide: "remote", contentVersion: local,
              preconditions: [{ kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" }, { kind: "file-stable", path: snapshot.path }],
              reasons: [{ code: "safe-union-local-only", summary: "Local-only content is copied remotely without deletion inference." }],
            }));
          }
          continue;
        }
        const localChanged = !evidenceEqual(local.content, baseEntry.content, local.entityKind);
        if (localChanged) {
          operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, base, local, undefined)));
        } else {
          operations.push(operation(snapshot.path, index++, "trash-local", {
            targetSide: "local", destructive: true,
            preconditions: [{ kind: "base-trusted" }, { kind: "path-observation", side: "remote", path: snapshot.path, expected: "absent" }, { kind: "remote-enumeration-complete" }],
            reasons: [{ code: "attested-remote-deletion", summary: "Trusted prior two-sided existence plus complete remote absence authorizes recoverable local trash." }],
          }));
        }
        continue;
      }

      // Both sides present.
      if (presentEqual(local!, remote!)) {
        operations.push(operation(snapshot.path, index++, "noop", { reasons: [{ code: baseEntry ? "equal-current-content" : "safe-union-identical", summary: "Both sides contain equivalent content." }] }));
        continue;
      }

      if (!baseEntry) {
        operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, undefined, local, remote)));
        continue;
      }

      const localChanged = !evidenceEqual(local!.content, baseEntry.content, local!.entityKind);
      const remoteChanged = !evidenceEqual(remote!.content, baseEntry.content, remote!.entityKind);
      if (!localChanged && !remoteChanged) {
        operations.push(operation(snapshot.path, index++, "noop", { reasons: [{ code: "unchanged-from-base", summary: "Both sides match the trusted base." }] }));
      } else if (localChanged && !remoteChanged) {
        if (snapshot.local.status === "present" && snapshot.local.stability !== "stable") {
          operations.push(block(snapshot.path, index++, "local-file-not-stable", "Local modification is not stable enough to upload."));
        } else {
          operations.push(operation(snapshot.path, index++, "upload-update", {
            targetSide: "remote", remoteObjectId: remote!.remoteObjectId ?? baseEntry.remoteObjectId, contentVersion: local,
            preconditions: [{ kind: "base-trusted" }, { kind: "content-evidence", side: "remote", path: snapshot.path, expected: baseEntry.content ?? {} }, { kind: "file-stable", path: snapshot.path }],
            reasons: [{ code: "local-only-modification", summary: "Only local content differs from the trusted base." }],
          }));
        }
      } else if (!localChanged && remoteChanged) {
        operations.push(operation(snapshot.path, index++, "download-update", {
          targetSide: "local", contentVersion: remote,
          preconditions: [{ kind: "base-trusted" }, { kind: "content-evidence", side: "local", path: snapshot.path, expected: baseEntry.content ?? {} }],
          reasons: [{ code: "remote-only-modification", summary: "Only remote content differs from the trusted base." }],
        }));
      } else {
        operations.push(conflictOperation(snapshot.path, index++, await this.conflicts.assess(snapshot.path, base, local, remote)));
      }
    }

    return this.finish(input.state, input.snapshots.length, operations);
  }

  private classifyProvenMoves(input: PlanningInput & { state: Extract<StateLoadResult, { status: "trusted" }> }, operations: PlannedOperation[], handled: Set<string>, nextIndex: () => number): void {
    const byPath = new Map(input.snapshots.map(snapshot => [String(snapshot.path), snapshot]));
    for (const prior of input.state.state.base) {
      if (!prior.remoteObjectId) continue;
      const oldSnapshot = byPath.get(String(prior.path));
      if (!oldSnapshot || oldSnapshot.identity.status !== "unambiguous") continue;
      const candidates = input.snapshots.filter(snapshot => snapshot.path !== prior.path && snapshot.identity.status === "unambiguous" && ((snapshot.remote.status === "present" && snapshot.remote.remoteObjectId === prior.remoteObjectId) || (snapshot.local.status === "present" && snapshot.local.remoteObjectId === prior.remoteObjectId)));
      if (candidates.length !== 1) continue;
      const target = candidates[0];
      if (target.remote.status === "present" && target.remote.remoteObjectId === prior.remoteObjectId && oldSnapshot.local.status === "present" && oldSnapshot.remote.status === "absent" && oldSnapshot.remoteEnumeration.status === "complete") {
        operations.push(operation(target.path, nextIndex(), "identity-preserving-move", {
          targetSide: "local", fromPath: prior.path, toPath: target.path, remoteObjectId: prior.remoteObjectId,
          preconditions: [{ kind: "base-trusted" }, { kind: "remote-object", remoteObjectId: prior.remoteObjectId }, { kind: "identity-unambiguous", path: target.path }],
          reasons: [{ code: "proven-remote-move", summary: "Stable remote object identity proves a remote rename/move; apply identity-preserving move locally." }],
        }));
        handled.add(String(prior.path)); handled.add(String(target.path));
      } else if (target.local.status === "present" && target.local.remoteObjectId === prior.remoteObjectId && oldSnapshot.remote.status === "present" && oldSnapshot.local.status === "absent") {
        operations.push(operation(target.path, nextIndex(), "identity-preserving-move", {
          targetSide: "remote", fromPath: prior.path, toPath: target.path, remoteObjectId: prior.remoteObjectId,
          preconditions: [{ kind: "base-trusted" }, { kind: "remote-object", remoteObjectId: prior.remoteObjectId }, { kind: "identity-unambiguous", path: target.path }],
          reasons: [{ code: "proven-local-move", summary: "Stable identity/history proves a local rename/move; preserve remote object identity." }],
        }));
        handled.add(String(prior.path)); handled.add(String(target.path));
      }
    }
  }

  private finish(state: StateLoadResult, totalManagedPaths: number, operations: PlannedOperation[]): SynchronizationPlan {
    const hasRecovery = operations.some(op => op.kind === "recovery-required");
    const hasBlocked = operations.some(op => op.kind === "blocked-unsafe");
    const hasConflict = operations.some(op => op.kind === "unresolved-conflict");
    const safety = this.destructiveSafety.assess(operations, {
      totalManagedPaths,
      recentAverageDestructiveOperations: this.options.recentAverageDestructiveOperations,
      stateCondition: state.status === "trusted" ? "trusted" : state.status === "uninitialized" ? "reconstructed" : "untrusted",
    });
    let executionDisposition: PlanExecutionDisposition = "safe-auto-eligible";
    if (hasRecovery || hasBlocked) executionDisposition = "blocked";
    else if (hasConflict || safety.requiresApproval) executionDisposition = "requires-user-approval";
    return {
      planId: id("PlanId", `plan:${operations.map(op => `${op.kind}:${String(op.path)}`).join("|")}`),
      trigger: this.options.trigger ?? "verify-reconcile",
      operations,
      executionDisposition,
      recoveryCheckpointRequired: safety.recoveryCheckpointRequired,
    };
  }
}
