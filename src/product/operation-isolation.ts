import type { PlannedOperation, VaultPath } from "../contracts";

function value(path: VaultPath | undefined): string | undefined { return path === undefined ? undefined : String(path).replace(/\\/g, "/").replace(/^\/+|\/+$/g, ""); }
function ancestor(parent: string, child: string): boolean { return child === parent || child.startsWith(`${parent}/`); }
function paths(operation: PlannedOperation): string[] {
  return [operation.path, operation.fromPath, operation.toPath, ...operation.preconditions.flatMap(precondition => "path" in precondition ? [precondition.path] : [])]
    .map(value).filter((path): path is string => path !== undefined);
}

/** Conservative dependency proof: a skipped ancestor/move/collision keeps dependants isolated too. */
export function dependsOnSkippedOperation(candidate: PlannedOperation, skipped: readonly PlannedOperation[]): boolean {
  const candidates = paths(candidate);
  for (const blocked of skipped) {
    const blockedPaths = paths(blocked);
    for (const blockedPath of blockedPaths) for (const candidatePath of candidates) {
      if (ancestor(blockedPath, candidatePath)) return true;
      if ((candidate.destructive || candidate.kind === "identity-preserving-move" || blocked.kind === "identity-preserving-move") && ancestor(candidatePath, blockedPath)) return true;
    }
  }
  return false;
}
