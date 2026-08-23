import type {
  BinaryContentSource, ChangeCursor, GoogleDrivePort, LocalVaultPort, ManagedRemoteIdentity,
  ObservationToken, ProductControlPort, ProductSurfaceState, ProtocolVersion,
  RemoteObjectId, StateBackupReceipt, StateLoadContext, StateLoadResult,
  StateMigrationAssessment, StateRevision, StateSaveResult, SynchronizationPlan,
  SynchronizationPlanner, SynchronizationStateStore, TrustedSynchronizationState,
  UserAction, UserActionResult, VaultIdentity, VaultPath, VerifiedExecutionReceipt,
  AuthoritativeSuccessCommitter, CommitResult, PlannedOperation, PlanningInput,
  SynchronizationStatus, AuditRecord
} from "../contracts";
import type { ConfigurationClassification, LocalLifecycleEvent, LocalReadResult, LocalVaultChange, LocalVaultListing, PathValidationResult } from "../contracts/local-vault";
import type { DriveAuthenticationState, DriveResult, ManagedRemoteValidation, RemoteChangePage, RemoteCreateRequest, RemoteDownload, RemoteListing, RemoteMutationReceipt, RemoteProtocolInfo, RemoteUpdateRequest } from "../contracts/google-drive";
import type { LocalObservation, RemoteObservation } from "../contracts/snapshot";

export interface LocalVaultFakeHandlers {
  activeConfigurationDirectory?: () => Promise<VaultPath>;
  enumerate?: () => Promise<LocalVaultListing>;
  observe?: (path: VaultPath) => Promise<LocalObservation>;
  readFile?: (path: VaultPath, expectedToken?: ObservationToken) => Promise<LocalReadResult>;
  validatePath?: (path: VaultPath) => Promise<PathValidationResult>;
  classifyConfiguration?: (path: VaultPath) => Promise<ConfigurationClassification>;
}
export function createLocalVaultFake(h: LocalVaultFakeHandlers = {}): LocalVaultPort {
  return {
    activeConfigurationDirectory: h.activeConfigurationDirectory ?? (async () => ".config" as VaultPath),
    enumerate: h.enumerate ?? (async () => ({ entries: [], completeness: { status: "complete" } })),
    observe: h.observe ?? (async path => ({ status: "unknown", side: "local", path, reason: "not-configured" })),
    readFile: h.readFile ?? (async path => { throw new Error(`readFile not configured: ${String(path)}`); }),
    createFile: async (path, _content: BinaryContentSource) => ({ path }),
    replaceFile: async (path, _content: BinaryContentSource) => ({ path }),
    createFolder: async path => ({ path }),
    move: async (_from, to) => ({ path: to }), trash: async () => undefined,
    validatePath: h.validatePath ?? (async () => ({ status: "compatible", normalizedComparisonPath: "" })),
    classifyConfiguration: h.classifyConfiguration ?? (async () => ({ classification: "unknown", reason: "not-classified" })),
    onChange: (_listener: (change: LocalVaultChange) => void) => () => undefined,
    onLifecycle: (_listener: (event: LocalLifecycleEvent) => void) => () => undefined,
  };
}

export interface GoogleDriveFakeHandlers {
  authenticationState?: () => Promise<DriveAuthenticationState>;
  validateManagedRoot?: (identity: ManagedRemoteIdentity) => Promise<DriveResult<ManagedRemoteValidation>>;
  listForReconciliation?: (root: RemoteObjectId) => Promise<DriveResult<RemoteListing>>;
}
const failure = <T>(): DriveResult<T> => ({ ok: false, signal: { kind: "transient-failure", detail: "fake not configured" } });
export function createGoogleDriveFake(h: GoogleDriveFakeHandlers = {}): GoogleDrivePort {
  return {
    authenticationState: h.authenticationState ?? (async () => ({ status: "authentication-required" })),
    createManagedRoot: async (_vault: VaultIdentity, _version: ProtocolVersion) => failure(),
    pairManagedRoot: async () => failure(),
    validateManagedRoot: h.validateManagedRoot ?? (async () => failure()),
    protocolInfo: async () => failure<RemoteProtocolInfo>(),
    listForReconciliation: h.listForReconciliation ?? (async () => failure()),
    getStartCursor: async () => failure<ChangeCursor>(),
    readChanges: async () => failure<RemoteChangePage>(),
    observe: async () => failure<RemoteObservation>(),
    download: async () => failure<RemoteDownload>(),
    create: async (_root: RemoteObjectId, _request: RemoteCreateRequest) => failure<RemoteMutationReceipt>(),
    update: async (_request: RemoteUpdateRequest) => failure<RemoteMutationReceipt>(),
    move: async () => failure<RemoteMutationReceipt>(), trash: async () => failure<void>(),
  };
}

export class InMemorySynchronizationStateStore implements SynchronizationStateStore {
  loadResult: StateLoadResult = { status: "uninitialized" };
  readonly saved: TrustedSynchronizationState[] = [];
  async load(_context: StateLoadContext): Promise<StateLoadResult> { return this.loadResult; }
  async saveTrusted(state: TrustedSynchronizationState, _expectedRevision?: StateRevision): Promise<StateSaveResult> { this.saved.push(state); return { status: "saved", stateRevision: state.stateRevision }; }
  async createRecoveryBackup(): Promise<StateBackupReceipt> { return { backupId: "fake-backup" }; }
  async assessMigration(targetSchemaVersion: number): Promise<StateMigrationAssessment> { return { status: "compatible", toVersion: targetSchemaVersion }; }
  async exportDiagnosticState(): Promise<Uint8Array> { return new Uint8Array(); }
}
export class FakeSynchronizationPlanner implements SynchronizationPlanner {
  constructor(private readonly result: SynchronizationPlan) {}
  async plan(_input: PlanningInput): Promise<SynchronizationPlan> { return this.result; }
}
export class RecordingSuccessCommitter implements AuthoritativeSuccessCommitter {
  readonly commits: Array<{ operation: PlannedOperation; receipt: VerifiedExecutionReceipt }> = [];
  async commitVerifiedSuccess(operation: PlannedOperation, receipt: VerifiedExecutionReceipt): Promise<CommitResult> { this.commits.push({ operation, receipt }); return { status: "committed", newStateRevision: "fake-revision" as StateRevision }; }
}
export class RecordingProductControl implements ProductControlPort {
  readonly actions: UserAction[] = []; readonly audit: AuditRecord[] = [];
  status: SynchronizationStatus = { kind: "idle-ready" };
  currentSurface(): ProductSurfaceState { return { status: this.status, conflicts: [] }; }
  async request(action: UserAction): Promise<UserActionResult> { this.actions.push(action); return { status: "accepted" }; }
  onSurface(_listener: (surface: ProductSurfaceState) => void): () => void { return () => undefined; }
  async readAuditHistory(): Promise<readonly AuditRecord[]> { return this.audit; }
}
