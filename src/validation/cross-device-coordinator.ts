import type { PortableRequestInit } from "../drive/transport";
import {
  PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
  VALIDATION_COORDINATION_SCHEMA_VERSION,
  evaluateValidationCoordinationMessage,
  type ValidationCoordinationAcceptance,
  type ValidationCoordinationMessage,
  type ValidationCoordinationMessageKind,
  type ValidationCoordinationRejectionReason,
  type ValidationCoordinationRole,
  type ValidationCoordinationState,
  type ValidationCoordinationTerminalClassification,
} from "./coordination-evidence-contracts";
import type { ValidationDeviceId, ValidationRunIdentity, ValidationStepId } from "./run-sandbox-checkpoint-contracts";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
export const VALIDATION_COORDINATION_DRIVE_ROOT_NAME = "BRAIN Validation Control" as const;
export const VALIDATION_COORDINATION_DRIVE_ROLE_KEY = "brainValidationRole" as const;
export const VALIDATION_COORDINATION_DRIVE_ROLE_ROOT = "coordination-root" as const;
export const VALIDATION_COORDINATION_DRIVE_ROLE_RECORD = "coordination-record" as const;
const RUN_PROPERTY = "brainValidationRunId";
const SCENARIO_PROPERTY = "brainValidationScenarioId";
const MESSAGE_PROPERTY = "brainValidationMessageId";
const DRIVE_FIELDS = "id,name,mimeType,parents,trashed,appProperties,description";

type ValidationNonTerminalTransition = {
  readonly status: "active" | "paused";
  readonly currentStepId: ValidationStepId;
  readonly owningRole: ValidationCoordinationRole;
  readonly expectedNextEvent: ValidationCoordinationMessageKind;
  readonly terminalClassification?: never;
};
type ValidationTerminalTransition = {
  readonly status: "terminal";
  readonly currentStepId: ValidationStepId;
  readonly owningRole: ValidationCoordinationRole;
  readonly expectedNextEvent: ValidationCoordinationMessageKind;
  readonly terminalClassification: ValidationCoordinationTerminalClassification;
};
export type ValidationCoordinationTransition = ValidationNonTerminalTransition | ValidationTerminalTransition;

/** Local scenario authority. Remote records can propose successors but cannot authorize them. */
export interface ValidationCoordinationTransitionAuthority {
  authorizeSuccessor(
    state: ValidationCoordinationState,
    message: ValidationCoordinationMessage,
  ): ValidationCoordinationTransition;
}

/** Immutable cross-device handoff. Both current-state and successor-state authority are checked before advancement. */
export interface ValidationCrossDeviceCoordinationRecord {
  readonly schemaVersion: typeof VALIDATION_COORDINATION_SCHEMA_VERSION;
  readonly harnessVersion: typeof PHASE6_LIVE_VALIDATION_HARNESS_VERSION;
  readonly message: ValidationCoordinationMessage;
  readonly stepOwner: ValidationCoordinationRole;
  readonly expectedNextEvent: ValidationCoordinationMessageKind;
  readonly next: ValidationCoordinationTransition;
}
export interface ValidationCoordinationTransport {
  publish(record: ValidationCrossDeviceCoordinationRecord): Promise<void>;
  read(run: ValidationRunIdentity): Promise<readonly ValidationCrossDeviceCoordinationRecord[]>;
}
export type ValidationCrossDeviceRejectionReason = ValidationCoordinationRejectionReason | "transition-mismatch";
export type ValidationCrossDeviceAcceptance =
  | { readonly status: "accepted"; readonly record: ValidationCrossDeviceCoordinationRecord; readonly state: ValidationCoordinationState }
  | {
      readonly status: "rejected";
      readonly record: ValidationCrossDeviceCoordinationRecord;
      readonly reason: ValidationCrossDeviceRejectionReason;
      readonly acceptance: ValidationCoordinationAcceptance;
    };

function transitionMatches(left: ValidationCoordinationTransition, right: ValidationCoordinationTransition): boolean {
  if (left.status !== right.status) return false;
  if (left.currentStepId !== right.currentStepId) return false;
  if (left.owningRole !== right.owningRole) return false;
  if (left.expectedNextEvent !== right.expectedNextEvent) return false;
  if (left.status === "terminal" && right.status === "terminal") {
    return left.terminalClassification === right.terminalClassification;
  }
  return left.status !== "terminal" && right.status !== "terminal";
}

function satisfiesTerminalTransitionInvariant(
  message: ValidationCoordinationMessage,
  transition: ValidationCoordinationTransition,
): boolean {
  if (message.kind !== "terminal") return transition.status !== "terminal";
  return transition.status === "terminal" && transition.terminalClassification === message.terminalClassification;
}

function isAuthorizedSuccessor(
  state: ValidationCoordinationState,
  message: ValidationCoordinationMessage,
  proposed: ValidationCoordinationTransition,
  authority: ValidationCoordinationTransitionAuthority,
): boolean {
  if (!satisfiesTerminalTransitionInvariant(message, proposed)) return false;
  const authorized = authority.authorizeSuccessor(state, message);
  if (!satisfiesTerminalTransitionInvariant(message, authorized)) return false;
  return transitionMatches(proposed, authorized);
}

export function coordinationRecord(
  state: ValidationCoordinationState,
  message: ValidationCoordinationMessage,
  next: ValidationCoordinationTransition,
  transitionAuthority: ValidationCoordinationTransitionAuthority,
): ValidationCrossDeviceCoordinationRecord {
  const acceptance = evaluateValidationCoordinationMessage(state, message.recipientDeviceId, message);
  if (acceptance.status !== "accepted") throw new Error(`Coordination record precondition rejected: ${acceptance.reason}`);
  if (!isAuthorizedSuccessor(state, message, next, transitionAuthority)) {
    throw new Error("Coordination successor transition rejected: transition-mismatch");
  }
  return Object.freeze({
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    message,
    stepOwner: state.owningRole,
    expectedNextEvent: state.expectedNextEvent,
    next: Object.freeze({ ...next }),
  });
}

function transitionedState(state: ValidationCoordinationState, record: ValidationCrossDeviceCoordinationRecord): ValidationCoordinationState {
  const common = {
    schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
    harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
    run: state.run,
    controllerDeviceId: state.controllerDeviceId,
    mobileParticipantDeviceId: state.mobileParticipantDeviceId,
    currentStepId: record.next.currentStepId,
    owningRole: record.next.owningRole,
    expectedNextEvent: record.next.expectedNextEvent,
    lastAcceptedSequenceByDevice: { ...state.lastAcceptedSequenceByDevice, [record.message.senderDeviceId]: record.message.sequence },
    evidenceRefs: [...new Set([...state.evidenceRefs, ...record.message.evidenceRefs])],
  } as const;
  return record.next.status === "terminal"
    ? Object.freeze({ ...common, status: "terminal" as const, terminalClassification: record.next.terminalClassification })
    : Object.freeze({ ...common, status: record.next.status });
}

function rejected(
  record: ValidationCrossDeviceCoordinationRecord,
  acceptance: ValidationCoordinationAcceptance,
  reason: ValidationCrossDeviceRejectionReason,
): ValidationCrossDeviceAcceptance {
  return { status: "rejected", record, reason, acceptance };
}

export function acceptValidationCoordinationRecord(
  state: ValidationCoordinationState,
  localDeviceId: ValidationDeviceId,
  record: ValidationCrossDeviceCoordinationRecord,
  transitionAuthority: ValidationCoordinationTransitionAuthority,
): ValidationCrossDeviceAcceptance {
  const acceptance = evaluateValidationCoordinationMessage(state, localDeviceId, record.message);
  if (acceptance.status === "rejected") return rejected(record, acceptance, acceptance.reason);
  if (record.stepOwner !== state.owningRole) return rejected(record, acceptance, "step-owner-mismatch");
  if (record.expectedNextEvent !== state.expectedNextEvent) return rejected(record, acceptance, "unexpected-event");
  if (!isAuthorizedSuccessor(state, record.message, record.next, transitionAuthority)) {
    return rejected(record, acceptance, "transition-mismatch");
  }
  return { status: "accepted", record, state: transitionedState(state, record) };
}

export interface ValidationCrossDeviceCoordinatorOptions {
  readonly state: ValidationCoordinationState;
  readonly localDeviceId: ValidationDeviceId;
  readonly localRole: ValidationCoordinationRole;
  readonly transport: ValidationCoordinationTransport;
  readonly transitionAuthority: ValidationCoordinationTransitionAuthority;
  readonly now?: () => string;
  readonly messageId?: () => string;
}
let fallbackMessageSequence = 1;
function defaultMessageId(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") return `validation-coordination:${globalThis.crypto.randomUUID()}`;
  } catch {
    // Fall back to a runtime-local suffix; run/device/sequence binding remains authoritative.
  }
  return `validation-coordination:${Date.now().toString(36)}:${fallbackMessageSequence++}`;
}
function oppositeParticipant(state: ValidationCoordinationState, localDeviceId: ValidationDeviceId): ValidationDeviceId {
  return localDeviceId === state.controllerDeviceId ? state.mobileParticipantDeviceId : state.controllerDeviceId;
}

export class ValidationCrossDeviceCoordinator {
  private stateValue: ValidationCoordinationState;
  private readonly now: () => string;
  private readonly messageId: () => string;
  constructor(private readonly options: ValidationCrossDeviceCoordinatorOptions) {
    if (options.state.controllerDeviceId === options.state.mobileParticipantDeviceId) throw new Error("Validation participants must have distinct device identities.");
    const expectedRole: ValidationCoordinationRole = options.localDeviceId === options.state.controllerDeviceId
      ? "controller"
      : options.localDeviceId === options.state.mobileParticipantDeviceId
        ? "mobile-participant"
        : (() => { throw new Error("Local validation device is not a run participant."); })();
    if (options.localRole !== expectedRole) throw new Error("Local validation role does not match device identity.");
    this.stateValue = options.state;
    this.now = options.now ?? (() => new Date().toISOString());
    this.messageId = options.messageId ?? defaultMessageId;
  }
  get state(): ValidationCoordinationState { return this.stateValue; }

  async send(kind: ValidationCoordinationMessageKind, next: ValidationCoordinationTransition, terminalClassification?: ValidationCoordinationTerminalClassification): Promise<ValidationCrossDeviceCoordinationRecord> {
    if (this.stateValue.status === "terminal") throw new Error("Cannot send coordination from terminal state.");
    if (this.stateValue.owningRole !== this.options.localRole) throw new Error("Local participant does not own the current validation step.");
    if (this.stateValue.expectedNextEvent !== kind) throw new Error(`Expected ${this.stateValue.expectedNextEvent}, not ${kind}.`);
    const sequence = (this.stateValue.lastAcceptedSequenceByDevice[this.options.localDeviceId] ?? 0) + 1;
    const base = {
      schemaVersion: VALIDATION_COORDINATION_SCHEMA_VERSION,
      harnessVersion: PHASE6_LIVE_VALIDATION_HARNESS_VERSION,
      messageId: this.messageId() as ValidationCoordinationMessage["messageId"],
      sequence,
      run: this.stateValue.run,
      senderDeviceId: this.options.localDeviceId,
      senderRole: this.options.localRole,
      recipientDeviceId: oppositeParticipant(this.stateValue, this.options.localDeviceId),
      stepId: this.stateValue.currentStepId,
      createdAt: this.now(),
      evidenceRefs: [],
    } as const;
    const message: ValidationCoordinationMessage = kind === "terminal"
      ? { ...base, kind, terminalClassification: terminalClassification ?? "blocked" }
      : { ...base, kind } as ValidationCoordinationMessage;
    const record = coordinationRecord(this.stateValue, message, next, this.options.transitionAuthority);
    await this.options.transport.publish(record);
    this.stateValue = transitionedState(this.stateValue, record);
    return record;
  }

  accept(record: ValidationCrossDeviceCoordinationRecord): ValidationCrossDeviceAcceptance {
    const result = acceptValidationCoordinationRecord(this.stateValue, this.options.localDeviceId, record, this.options.transitionAuthority);
    if (result.status === "accepted") this.stateValue = result.state;
    return result;
  }

  async poll(): Promise<readonly ValidationCrossDeviceAcceptance[]> {
    const records = await this.options.transport.read(this.stateValue.run);
    const candidates = records
      .filter(record => record.message.recipientDeviceId === this.options.localDeviceId)
      .slice()
      .sort((left, right) => left.message.createdAt.localeCompare(right.message.createdAt) || String(left.message.messageId).localeCompare(String(right.message.messageId)));
    return candidates.map(record => this.accept(record));
  }
}

interface DriveTransportResult<T> { readonly ok: true; readonly value: T }
interface DriveTransportFailure { readonly ok: false; readonly signal: { readonly kind: string; readonly detail?: string } }
export interface ValidationDriveRequestTransport {
  request(url: string, init?: PortableRequestInit, retry?: boolean): Promise<DriveTransportResult<Response> | DriveTransportFailure>;
}
interface ValidationDriveFile {
  readonly id: string;
  readonly name?: string;
  readonly mimeType?: string;
  readonly parents?: readonly string[];
  readonly trashed?: boolean;
  readonly appProperties?: Readonly<Record<string, string>>;
  readonly description?: string;
}
interface ValidationDriveList { readonly files?: readonly ValidationDriveFile[] }
function escaped(value: string): string { return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }
async function readJson<T>(response: Response): Promise<T> { return await response.json() as T; }
function requestFailure(prefix: string, failure: DriveTransportFailure): Error {
  return new Error(`${prefix}:${failure.signal.kind}${failure.signal.detail ? `:${failure.signal.detail}` : ""}`);
}
function parseStoredRecord(file: ValidationDriveFile): ValidationCrossDeviceCoordinationRecord {
  if (!file.description) throw new Error(`Validation coordination record ${file.id} has no payload.`);
  const parsed = JSON.parse(file.description) as Partial<ValidationCrossDeviceCoordinationRecord>;
  if (parsed.schemaVersion !== VALIDATION_COORDINATION_SCHEMA_VERSION || parsed.harnessVersion !== PHASE6_LIVE_VALIDATION_HARNESS_VERSION || !parsed.message || !parsed.next) {
    throw new Error(`Validation coordination record ${file.id} has an unsupported or malformed payload.`);
  }
  return parsed as ValidationCrossDeviceCoordinationRecord;
}

/** Drive-backed validation-control transport using existing drive.file authority and a top-level app-created namespace. */
export class DriveValidationCoordinationTransport implements ValidationCoordinationTransport {
  private rootId?: Promise<string>;
  constructor(private readonly transport: ValidationDriveRequestTransport) {}

  async publish(record: ValidationCrossDeviceCoordinationRecord): Promise<void> {
    const rootId = await this.coordinationRootId();
    const existing = await this.listRecords(rootId, record.message.run, String(record.message.messageId));
    const payload = JSON.stringify(record);
    if (existing.length > 1) throw new Error("Validation coordination message identity is ambiguous in Drive.");
    if (existing.length === 1) {
      if (existing[0].description !== payload) throw new Error("Validation coordination message ID already exists with different content.");
      return;
    }
    const created = await this.transport.request(`${DRIVE_API}/files?fields=${encodeURIComponent(DRIVE_FIELDS)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: `coordination-${String(record.message.messageId)}`,
        mimeType: "application/octet-stream",
        parents: [rootId],
        description: payload,
        appProperties: {
          [VALIDATION_COORDINATION_DRIVE_ROLE_KEY]: VALIDATION_COORDINATION_DRIVE_ROLE_RECORD,
          [RUN_PROPERTY]: String(record.message.run.runId),
          [SCENARIO_PROPERTY]: record.message.run.scenarioId,
          [MESSAGE_PROPERTY]: String(record.message.messageId),
        },
      }),
    }, false);
    if (!created.ok) throw requestFailure("validation-coordination-create-failed", created);
  }

  async read(run: ValidationRunIdentity): Promise<readonly ValidationCrossDeviceCoordinationRecord[]> {
    const rootId = await this.coordinationRootId();
    const files = await this.listRecords(rootId, run);
    return files.map(file => {
      const record = parseStoredRecord(file);
      if (record.message.run.runId !== run.runId) throw new Error("Validation coordination Drive record run identity mismatch.");
      if (record.message.run.scenarioId !== run.scenarioId) throw new Error("Validation coordination Drive record scenario identity mismatch.");
      return record;
    });
  }

  private async coordinationRootId(): Promise<string> {
    this.rootId ??= this.resolveCoordinationRootId();
    try { return await this.rootId; }
    catch (error) { this.rootId = undefined; throw error; }
  }
  private async resolveCoordinationRootId(): Promise<string> {
    const q = `appProperties has { key='${VALIDATION_COORDINATION_DRIVE_ROLE_KEY}' and value='${VALIDATION_COORDINATION_DRIVE_ROLE_ROOT}' } and trashed = false`;
    const params = new URLSearchParams({ q, spaces: "drive", fields: `files(${DRIVE_FIELDS})` });
    const listed = await this.transport.request(`${DRIVE_API}/files?${params}`);
    if (!listed.ok) throw requestFailure("validation-coordination-root-list-failed", listed);
    const files = (await readJson<ValidationDriveList>(listed.value)).files ?? [];
    const roots = files.filter(file => file.mimeType === FOLDER_MIME && !file.trashed);
    if (roots.length > 1) throw new Error("Validation coordination root is ambiguous in Drive.");
    if (roots.length === 1) return roots[0].id;
    const created = await this.transport.request(`${DRIVE_API}/files?fields=${encodeURIComponent(DRIVE_FIELDS)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: VALIDATION_COORDINATION_DRIVE_ROOT_NAME,
        mimeType: FOLDER_MIME,
        appProperties: { [VALIDATION_COORDINATION_DRIVE_ROLE_KEY]: VALIDATION_COORDINATION_DRIVE_ROLE_ROOT },
      }),
    }, false);
    if (!created.ok) throw requestFailure("validation-coordination-root-create-failed", created);
    const file = await readJson<ValidationDriveFile>(created.value);
    if (!file.id) throw new Error("Validation coordination root create returned no Drive identity.");
    return file.id;
  }

  private async listRecords(rootId: string, run: ValidationRunIdentity, messageId?: string): Promise<readonly ValidationDriveFile[]> {
    const clauses = [
      `'${escaped(rootId)}' in parents`,
      `appProperties has { key='${VALIDATION_COORDINATION_DRIVE_ROLE_KEY}' and value='${VALIDATION_COORDINATION_DRIVE_ROLE_RECORD}' }`,
      `appProperties has { key='${RUN_PROPERTY}' and value='${escaped(String(run.runId))}' }`,
      `appProperties has { key='${SCENARIO_PROPERTY}' and value='${escaped(run.scenarioId)}' }`,
      "trashed = false",
    ];
    if (messageId) clauses.push(`appProperties has { key='${MESSAGE_PROPERTY}' and value='${escaped(messageId)}' }`);
    const params = new URLSearchParams({ q: clauses.join(" and "), spaces: "drive", fields: `files(${DRIVE_FIELDS})` });
    const listed = await this.transport.request(`${DRIVE_API}/files?${params}`);
    if (!listed.ok) throw requestFailure("validation-coordination-record-list-failed", listed);
    return (await readJson<ValidationDriveList>(listed.value)).files ?? [];
  }
}
