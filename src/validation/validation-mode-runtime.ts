import type { RemoteObjectId, SynchronizationPlan } from "../contracts";
import { IndexedDbStateByteStorage } from "../state/indexeddb-state-storage";
import type {
  ValidationPlanExecutionAuthorization,
  ValidationPlanExpectation,
  ValidationProductionDriverResult,
} from "./driver-plan-fault-verifier-contracts";
import { assertValidationPlan } from "./plan-assertion-engine";
import {
  ValidationProductionPathDriver,
  type ValidationProductionRuntimePort,
} from "./production-path-driver";
import {
  VALIDATION_RUNNER_MODULE_IDS,
  VALIDATION_RUNNER_SCENARIO_IDS,
  type ValidationRunnerHumanCheckpointResumePort,
  type ValidationRunnerModuleId,
  type ValidationRunnerPersistentState,
  type ValidationRunnerResult,
  type ValidationRunnerScenarioDefinition,
  type ValidationRunnerStateStore,
} from "./scenario-runner-contracts";
import {
  type ValidationRunnerApprovedModuleDelegate,
  type ValidationRunnerApprovedModuleDelegates,
  type ValidationRunnerApprovedModuleResult,
  type ValidationRunnerModuleOperationRequest,
  type ValidationRunnerPrerequisiteDelegate,
} from "./scenario-runner-module-adapter";
import {
  type ValidationRunnerResumeAdoptionJournal,
  type ValidationRunnerResumeAdoptionStore,
} from "./scenario-runner-durable-state";
import { composeValidationScenarioRunner, type IntegratedValidationScenarioRunner } from "./scenario-runner";
import {
  isValidationScenarioId,
  validationRunIdentity,
  type ValidationDeviceIdentity,
  type ValidationDevicePlatform,
  type ValidationRunIdentity,
  type ValidationScenarioId,
  type ValidationStepId,
} from "./run-sandbox-checkpoint-contracts";


export function classifyValidationDevicePlatform(input: {
  readonly isDesktopApp: boolean;
  readonly userAgent: string;
  readonly maxTouchPoints: number;
}): ValidationDevicePlatform {
  if (input.isDesktopApp) return "windows-desktop";

  const iPadLike = /\biPad\b/i.test(input.userAgent)
    || (/\bMacintosh\b/i.test(input.userAgent) && input.maxTouchPoints > 1);

  return iPadLike ? "ipad" : "iphone";
}

export type ValidationModeActionResult =
  | { readonly status: "disabled"; readonly reason: string }
  | { readonly status: "unavailable"; readonly reason: string }
  | { readonly status: "runner"; readonly result: ValidationRunnerResult };

export type ValidationModeModuleOverrides = Partial<
  Record<ValidationRunnerModuleId, ValidationRunnerApprovedModuleDelegate>
>;

export interface ValidationPlanAuthorityCycleInput {
  readonly authorityCycleId: string;
}

export interface ValidationPlanAssertionStepInput extends ValidationPlanAuthorityCycleInput {
  readonly assertionId: string;
  readonly expectation: Omit<ValidationPlanExpectation, "run">;
}

/**
 * Runtime-only verifier publication fact. This is deliberately not part of the
 * frozen H0 module-result contracts or production persistence.
 */
export interface ValidationRuntimeRemoteIdentityBindingFact {
  readonly bindingName: string;
  readonly remoteObjectId: RemoteObjectId;
}

/**
 * Trusted state-convergence-verifier delegates may return this structural
 * extension. The H6B runtime publishes it only after successful verification
 * with objective evidence.
 */
export type ValidationRemoteIdentityPublishingVerifierResult =
  ValidationRunnerApprovedModuleResult & {
    readonly remoteIdentityBindings?: readonly ValidationRuntimeRemoteIdentityBindingFact[];
  };

export interface ValidationRemoteIdentityPublishingVerifierDelegate {
  execute(
    request: ValidationRunnerModuleOperationRequest,
  ): Promise<ValidationRemoteIdentityPublishingVerifierResult | null | undefined>;
}

/**
 * Static assertion-side extension consumed and removed by H6B before the
 * frozen assertion engine is called.
 */
export interface ValidationRuntimeRemoteIdentityExpectationReference {
  readonly remoteObjectIdBinding?: string;
}

export interface ValidationModeRuntimeOptions {
  readonly productionRuntime: ValidationProductionRuntimePort;
  readonly definitions?: readonly ValidationRunnerScenarioDefinition[];
  readonly stateStore?: ValidationRunnerStateStore;
  readonly resumeAdoptionStore?: ValidationRunnerResumeAdoptionStore;
  readonly prerequisites?: ValidationRunnerPrerequisiteDelegate;
  readonly moduleOverrides?: ValidationModeModuleOverrides;
  readonly humanCheckpoints?: ValidationRunnerHumanCheckpointResumePort;
  readonly currentDevice?: () => ValidationDeviceIdentity | undefined;
  readonly createRunId?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

function sameRun(left: ValidationRunIdentity, right: ValidationRunIdentity): boolean {
  return left.runId === right.runId && left.scenarioId === right.scenarioId;
}

type ValidationAuthorityCycleParse =
  | { readonly status: "absent" }
  | { readonly status: "invalid" }
  | { readonly status: "valid"; readonly cycleId: string };

function parseAuthorityCycle(input: unknown): ValidationAuthorityCycleParse {
  if (!isRecord(input) || !Object.prototype.hasOwnProperty.call(input, "authorityCycleId")) {
    return { status: "absent" };
  }
  return validText(input.authorityCycleId)
    ? { status: "valid", cycleId: input.authorityCycleId }
    : { status: "invalid" };
}

interface RetainedValidationPlanAuthority {
  readonly run: ValidationRunIdentity;
  readonly cycleId: string;
  readonly previewStepId: ValidationStepId;
  readonly plan: SynchronizationPlan;
  readonly assertionStepId?: ValidationStepId;
  readonly authorization?: ValidationPlanExecutionAuthorization;
}

/**
 * Validation-only, composition-scoped handoff authority.
 *
 * This state is intentionally not durable. Recreating the H6B composition
 * drops every retained plan/authorization so a resumed durable runner fails
 * closed and must restart from a safe production preview/assertion sequence.
 */
class ValidationRunScopedPlanAuthority {
  private readonly entries = new Map<string, RetainedValidationPlanAuthority>();

  beginPreview(run: ValidationRunIdentity, cycleId: string): void {
    this.entries.delete(this.key(run, cycleId));
  }

  retainObservedPlan(input: {
    readonly run: ValidationRunIdentity;
    readonly cycleId: string;
    readonly previewStepId: ValidationStepId;
    readonly plan: SynchronizationPlan;
  }): boolean {
    const key = this.key(input.run, input.cycleId);
    if (this.entries.has(key)) return false;
    this.entries.set(key, Object.freeze({
      run: input.run,
      cycleId: input.cycleId,
      previewStepId: input.previewStepId,
      plan: input.plan,
    }));
    return true;
  }

  observedPlan(run: ValidationRunIdentity, cycleId: string): SynchronizationPlan | undefined {
    const entry = this.entries.get(this.key(run, cycleId));
    return entry && sameRun(entry.run, run) && entry.cycleId === cycleId ? entry.plan : undefined;
  }

  retainAuthorization(input: {
    readonly run: ValidationRunIdentity;
    readonly cycleId: string;
    readonly assertionStepId: ValidationStepId;
    readonly authorization: ValidationPlanExecutionAuthorization;
  }): boolean {
    const key = this.key(input.run, input.cycleId);
    const entry = this.entries.get(key);
    if (
      !entry
      || !sameRun(entry.run, input.run)
      || entry.cycleId !== input.cycleId
      || !sameRun(input.authorization.run, input.run)
      || input.authorization.executionAuthorized !== true
      || input.authorization.planId !== entry.plan.planId
    ) {
      return false;
    }
    this.entries.set(key, Object.freeze({
      ...entry,
      assertionStepId: input.assertionStepId,
      authorization: input.authorization,
    }));
    return true;
  }

  consumeAuthorization(
    run: ValidationRunIdentity,
    cycleId: string,
  ): ValidationPlanExecutionAuthorization | undefined {
    const key = this.key(run, cycleId);
    const entry = this.entries.get(key);
    if (!entry || !entry.authorization) return undefined;
    this.entries.delete(key);
    if (
      !sameRun(entry.run, run)
      || entry.cycleId !== cycleId
      || !sameRun(entry.authorization.run, run)
      || entry.authorization.executionAuthorized !== true
      || entry.authorization.planId !== entry.plan.planId
    ) {
      return undefined;
    }
    return entry.authorization;
  }

  clearRun(run: ValidationRunIdentity): void {
    for (const [key, entry] of this.entries) {
      if (sameRun(entry.run, run)) this.entries.delete(key);
    }
  }

  clearAll(): void {
    this.entries.clear();
  }

  private key(run: ValidationRunIdentity, cycleId: string): string {
    return `${String(run.scenarioId)}\u0000${String(run.runId)}\u0000${cycleId}`;
  }
}

interface RetainedValidationRemoteIdentityBinding {
  readonly run: ValidationRunIdentity;
  readonly bindingName: string;
  readonly remoteObjectId: RemoteObjectId;
  readonly verifierStepId: ValidationStepId;
  readonly evidenceRefs: readonly string[];
}

type ValidationRemoteIdentityRetainResult =
  | { readonly status: "retained" }
  | { readonly status: "rejected"; readonly summary: string };

/**
 * Composition-scoped, validation-only authority for exact remote identities
 * learned by the trusted convergence verifier. Facts are intentionally
 * ephemeral and cannot survive runtime/composition reconstruction.
 */
class ValidationRunScopedRemoteIdentityAuthority {
  private readonly entries = new Map<string, RetainedValidationRemoteIdentityBinding>();

  retainVerified(input: {
    readonly run: ValidationRunIdentity;
    readonly verifierStepId: ValidationStepId;
    readonly evidenceRefs: readonly string[];
    readonly bindings: readonly ValidationRuntimeRemoteIdentityBindingFact[];
  }): ValidationRemoteIdentityRetainResult {
    const staged = new Map<string, ValidationRuntimeRemoteIdentityBindingFact>();
    for (const binding of input.bindings) {
      const duplicate = staged.get(binding.bindingName);
      if (duplicate) {
        return {
          status: "rejected",
          summary: `Verifier publication contains duplicate remote-identity binding name ${binding.bindingName}.`,
        };
      }
      staged.set(binding.bindingName, binding);
    }

    for (const binding of input.bindings) {
      const existing = this.entries.get(this.key(input.run, binding.bindingName));
      if (existing && existing.remoteObjectId !== binding.remoteObjectId) {
        return {
          status: "rejected",
          summary: `Remote-identity binding ${binding.bindingName} conflicts with previously verified authority for this run.`,
        };
      }
    }

    for (const binding of input.bindings) {
      const key = this.key(input.run, binding.bindingName);
      if (this.entries.has(key)) continue;
      this.entries.set(key, Object.freeze({
        run: input.run,
        bindingName: binding.bindingName,
        remoteObjectId: binding.remoteObjectId,
        verifierStepId: input.verifierStepId,
        evidenceRefs: Object.freeze([...input.evidenceRefs]),
      }));
    }
    return { status: "retained" };
  }

  resolve(run: ValidationRunIdentity, bindingName: string): RemoteObjectId | undefined {
    const entry = this.entries.get(this.key(run, bindingName));
    if (!entry || !sameRun(entry.run, run) || entry.bindingName !== bindingName) return undefined;
    return entry.remoteObjectId;
  }

  clearRun(run: ValidationRunIdentity): void {
    for (const [key, entry] of this.entries) {
      if (sameRun(entry.run, run)) this.entries.delete(key);
    }
  }

  clearAll(): void {
    this.entries.clear();
  }

  private key(run: ValidationRunIdentity, bindingName: string): string {
    return `${String(run.scenarioId)}\u0000${String(run.runId)}\u0000${bindingName}`;
  }
}

function parseAssertionStepInput(input: unknown): {
  readonly cycleId: string;
  readonly assertionId: string;
  readonly expectation: Record<string, unknown>;
} | undefined {
  if (!isRecord(input)) return undefined;
  const cycle = parseAuthorityCycle(input);
  if (cycle.status !== "valid" || !validText(input.assertionId) || !isRecord(input.expectation)) {
    return undefined;
  }
  return {
    cycleId: cycle.cycleId,
    assertionId: input.assertionId,
    expectation: input.expectation,
  };
}

type ValidationRemoteIdentityPublicationParse =
  | { readonly status: "absent" }
  | { readonly status: "invalid"; readonly summary: string }
  | { readonly status: "valid"; readonly bindings: readonly ValidationRuntimeRemoteIdentityBindingFact[] };

function parseRemoteIdentityPublications(
  result: ValidationRunnerApprovedModuleResult,
): ValidationRemoteIdentityPublicationParse {
  const rawResult = result as unknown as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(rawResult, "remoteIdentityBindings")) {
    return { status: "absent" };
  }
  const rawBindings = rawResult.remoteIdentityBindings;
  if (!Array.isArray(rawBindings) || rawBindings.length === 0) {
    return {
      status: "invalid",
      summary: "Verifier remoteIdentityBindings must be a non-empty array when present.",
    };
  }

  const bindings: ValidationRuntimeRemoteIdentityBindingFact[] = [];
  const names = new Set<string>();
  for (const rawBinding of rawBindings) {
    if (
      !isRecord(rawBinding)
      || !validText(rawBinding.bindingName)
      || !validText(rawBinding.remoteObjectId)
    ) {
      return {
        status: "invalid",
        summary: "Verifier remote-identity publication requires non-empty bindingName and remoteObjectId values.",
      };
    }
    if (names.has(rawBinding.bindingName)) {
      return {
        status: "invalid",
        summary: `Verifier remote-identity publication duplicates binding name ${rawBinding.bindingName}.`,
      };
    }
    names.add(rawBinding.bindingName);
    bindings.push(Object.freeze({
      bindingName: rawBinding.bindingName,
      remoteObjectId: rawBinding.remoteObjectId as RemoteObjectId,
    }));
  }
  return { status: "valid", bindings: Object.freeze(bindings) };
}

function trustedVerifierDelegate(
  delegate: ValidationRunnerApprovedModuleDelegate,
  identityAuthority: ValidationRunScopedRemoteIdentityAuthority,
): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      const result = await delegate.execute(request);
      if (!result || result.status !== "completed") return result;

      const publication = parseRemoteIdentityPublications(result);
      if (publication.status === "absent") return result;
      if (publication.status === "invalid") {
        return {
          status: "blocked",
          summary: publication.summary,
          evidenceRefs: Array.isArray(result.evidenceRefs) ? result.evidenceRefs : [],
        };
      }
      if (
        !Array.isArray(result.evidenceRefs)
        || result.evidenceRefs.length === 0
        || !result.evidenceRefs.every(validText)
      ) {
        return {
          status: "blocked",
          summary: "Remote-identity publication requires successful verifier completion with objective evidence.",
          evidenceRefs: [],
        };
      }

      const retained = identityAuthority.retainVerified({
        run: request.run,
        verifierStepId: request.stepId,
        evidenceRefs: result.evidenceRefs,
        bindings: publication.bindings,
      });
      if (retained.status === "rejected") {
        return {
          status: "blocked",
          summary: retained.summary,
          evidenceRefs: result.evidenceRefs,
        };
      }
      return result;
    },
  };
}

type ValidationMaterializedExpectation =
  | { readonly status: "materialized"; readonly expectation: Record<string, unknown> }
  | { readonly status: "blocked"; readonly summary: string };

function materializeRemoteIdentityBindings(input: {
  readonly run: ValidationRunIdentity;
  readonly expectation: Record<string, unknown>;
  readonly identityAuthority: ValidationRunScopedRemoteIdentityAuthority;
}): ValidationMaterializedExpectation {
  const rawOperations = input.expectation.expectedOperations;
  if (!Array.isArray(rawOperations)) {
    return { status: "materialized", expectation: { ...input.expectation } };
  }

  const expectedOperations: unknown[] = [];
  for (const rawOperation of rawOperations) {
    if (!isRecord(rawOperation)) {
      expectedOperations.push(rawOperation);
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(rawOperation, "remoteObjectIdBinding")) {
      expectedOperations.push({ ...rawOperation });
      continue;
    }

    const bindingName = rawOperation.remoteObjectIdBinding;
    if (!validText(bindingName)) {
      return {
        status: "blocked",
        summary: "Plan assertion remoteObjectIdBinding must be a non-empty, trim-stable binding name.",
      };
    }
    const boundRemoteObjectId = input.identityAuthority.resolve(input.run, bindingName);
    if (!boundRemoteObjectId) {
      return {
        status: "blocked",
        summary: `No verified remote-identity binding named ${bindingName} exists for this validation run.`,
      };
    }

    if (Object.prototype.hasOwnProperty.call(rawOperation, "remoteObjectId")) {
      if (!validText(rawOperation.remoteObjectId)) {
        return {
          status: "blocked",
          summary: `Static remoteObjectId paired with binding ${bindingName} is malformed.`,
        };
      }
      if (rawOperation.remoteObjectId !== boundRemoteObjectId) {
        return {
          status: "blocked",
          summary: `Runtime binding ${bindingName} cannot weaken conflicting static remoteObjectId expectation ${rawOperation.remoteObjectId}.`,
        };
      }
    }

    const { remoteObjectIdBinding: _bindingReference, ...staticOperation } = rawOperation;
    expectedOperations.push({
      ...staticOperation,
      remoteObjectId: boundRemoteObjectId,
    });
  }

  return {
    status: "materialized",
    expectation: {
      ...input.expectation,
      expectedOperations,
    },
  };
}

function revisionOf(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0) {
    throw new Error("Validation durable state has no valid revision.");
  }
  return Number(value.revision);
}

class IndexedDbValidationJsonCasStore<T extends { readonly revision: number }> {
  private readonly storage: IndexedDbStateByteStorage;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();

  constructor(databaseName: string) {
    this.storage = new IndexedDbStateByteStorage(databaseName);
  }

  async load(): Promise<unknown> {
    const bytes = await this.storage.read();
    if (bytes === undefined) return null;
    return JSON.parse(this.decoder.decode(bytes)) as unknown;
  }

  async compareAndSet(expectedRevision: number | null, next: T | null): Promise<boolean> {
    const currentBytes = await this.storage.read();
    const current = currentBytes === undefined
      ? null
      : JSON.parse(this.decoder.decode(currentBytes)) as unknown;
    if (revisionOf(current) !== expectedRevision) return false;
    const compareAndSwap = this.storage.compareAndSwap;
    if (!compareAndSwap) throw new Error("Validation state storage does not provide atomic compare-and-swap.");
    const replacement = this.encoder.encode(JSON.stringify(next));
    return await compareAndSwap.call(this.storage, currentBytes, replacement);
  }
}

function defaultPrerequisites(): ValidationRunnerPrerequisiteDelegate {
  return {
    async evaluate(input) {
      return input.prerequisiteIds.map(prerequisiteId => ({
        prerequisiteId,
        status: "blocked" as const,
        summary: "This validation prerequisite has not been bound by an installed scenario package.",
        evidenceRefs: [],
      }));
    },
  };
}

function defaultHumanCheckpoints(): ValidationRunnerHumanCheckpointResumePort {
  return {
    async consumeResume() {
      return { status: "empty" };
    },
  };
}

function blockedModule(moduleId: ValidationRunnerModuleId): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute() {
      return {
        status: "blocked",
        summary: `${moduleId} runtime authority is not bound by this H6B build.`,
        evidenceRefs: [],
      };
    },
  };
}

function productionFailure(
  result: Exclude<ValidationProductionDriverResult, { readonly status: "plan-observed" | "request-accepted" }>,
): ReturnType<ValidationRunnerApprovedModuleDelegate["execute"]> {
  const summary = result.status === "no-plan-observed" ? result.reason : result.reason;
  return Promise.resolve({
    status: result.status === "request-failed" ? "failed" : "blocked",
    summary,
    evidenceRefs: [],
  });
}

function productionDelegate(
  driver: ValidationProductionPathDriver,
  authority: ValidationRunScopedPlanAuthority,
): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      let result: ValidationProductionDriverResult;
      switch (request.operation) {
        case "preview-manual":
        case "preview-verify-reconcile": {
          const cycle = parseAuthorityCycle(request.input);
          if (cycle.status === "invalid") {
            return { status: "blocked", summary: "Production preview authorityCycleId is malformed.", evidenceRefs: [] };
          }
          if (cycle.status === "valid") authority.beginPreview(request.run, cycle.cycleId);
          result = request.operation === "preview-manual"
            ? await driver.dispatch({ kind: "preview-manual", run: request.run, stepId: request.stepId })
            : await driver.dispatch({ kind: "preview-verify-reconcile", run: request.run, stepId: request.stepId });
          if (result.status === "plan-observed" && cycle.status === "valid") {
            const retained = authority.retainObservedPlan({
              run: request.run,
              cycleId: cycle.cycleId,
              previewStepId: request.stepId,
              plan: result.plan,
            });
            if (!retained) {
              return { status: "blocked", summary: "Production preview produced ambiguous duplicated run-scoped plan authority.", evidenceRefs: [] };
            }
          }
          break;
        }
        case "run-automatic": {
          const trigger = isRecord(request.input) ? request.input.trigger : undefined;
          if (trigger !== "startup-resume" && trigger !== "local-change" && trigger !== "periodic") {
            return { status: "blocked", summary: "run-automatic requires an approved automatic trigger.", evidenceRefs: [] };
          }
          result = await driver.dispatch({ kind: "run-automatic", run: request.run, stepId: request.stepId, trigger });
          break;
        }
        case "execute-asserted-plan": {
          const cycle = parseAuthorityCycle(request.input);
          if (cycle.status !== "valid") {
            return { status: "blocked", summary: "execute-asserted-plan requires a valid run-scoped authorityCycleId.", evidenceRefs: [] };
          }
          if (isRecord(request.input) && Object.prototype.hasOwnProperty.call(request.input, "authorization")) {
            return { status: "blocked", summary: "Caller-supplied execution authorization is prohibited; authorization must come from the shared assertion handoff.", evidenceRefs: [] };
          }
          const authorization = authority.consumeAuthorization(request.run, cycle.cycleId);
          if (!authorization) {
            return { status: "blocked", summary: "No asserted execution authorization exists for this validation run and authority cycle.", evidenceRefs: [] };
          }
          result = await driver.dispatch({
            kind: "execute-asserted-plan",
            run: request.run,
            stepId: request.stepId,
            authorization,
          });
          break;
        }
        case "cancel-active-sync":
          result = await driver.dispatch({ kind: "cancel-active-sync", run: request.run, stepId: request.stepId });
          break;
        default:
          return {
            status: "blocked",
            summary: `Unsupported production-path validation operation: ${request.operation}`,
            evidenceRefs: [],
          };
      }

      if (result.status === "plan-observed" || result.status === "request-accepted") {
        return { status: "completed", evidenceRefs: [] };
      }
      return await productionFailure(result);
    },
  };
}

function planAssertionDelegate(
  authority: ValidationRunScopedPlanAuthority,
  identityAuthority: ValidationRunScopedRemoteIdentityAuthority,
): ValidationRunnerApprovedModuleDelegate {
  return {
    async execute(request) {
      if (request.operation !== "assert-observed-plan") {
        return {
          status: "blocked",
          summary: `Unsupported plan-assertion validation operation: ${request.operation}`,
          evidenceRefs: [],
        };
      }
      const input = parseAssertionStepInput(request.input);
      if (!input) {
        return {
          status: "blocked",
          summary: "assert-observed-plan requires authorityCycleId, assertionId, and a plan expectation.",
          evidenceRefs: [],
        };
      }
      const plan = authority.observedPlan(request.run, input.cycleId);
      if (!plan) {
        return {
          status: "blocked",
          summary: "No observed production plan exists for this validation run and authority cycle.",
          evidenceRefs: [],
        };
      }

      const materialized = materializeRemoteIdentityBindings({
        run: request.run,
        expectation: input.expectation,
        identityAuthority,
      });
      if (materialized.status === "blocked") {
        return {
          status: "blocked",
          summary: materialized.summary,
          evidenceRefs: [],
        };
      }

      let assertion;
      try {
        assertion = assertValidationPlan({
          assertionId: input.assertionId,
          expectation: { ...materialized.expectation, run: request.run } as unknown as ValidationPlanExpectation,
          plan,
        });
      } catch (error) {
        return {
          status: "blocked",
          summary: error instanceof Error ? error.message : "Plan assertion input is malformed.",
          evidenceRefs: [],
        };
      }

      if (assertion.status === "mismatch") {
        return {
          status: "failed",
          summary: assertion.failures.map(failure => failure.summary).join(" | "),
          evidenceRefs: [],
        };
      }

      if (!authority.retainAuthorization({
        run: request.run,
        cycleId: input.cycleId,
        assertionStepId: request.stepId,
        authorization: assertion.authorization,
      })) {
        return {
          status: "blocked",
          summary: "Plan assertion authorization no longer matches the retained run-scoped production plan.",
          evidenceRefs: [],
        };
      }

      return { status: "completed", evidenceRefs: [] };
    },
  };
}

function buildModules(
  driver: ValidationProductionPathDriver,
  authority: ValidationRunScopedPlanAuthority,
  identityAuthority: ValidationRunScopedRemoteIdentityAuthority,
  overrides: ValidationModeModuleOverrides | undefined,
): ValidationRunnerApprovedModuleDelegates {
  if (overrides?.["production-path-driver"]) {
    throw new Error("The production-path-driver runtime binding is fixed and cannot be overridden.");
  }
  if (overrides?.["plan-assertion-engine"]) {
    throw new Error("The plan-assertion-engine runtime binding is fixed and cannot be overridden.");
  }
  const modules = Object.fromEntries(
    VALIDATION_RUNNER_MODULE_IDS.map(moduleId => [moduleId, blockedModule(moduleId)]),
  ) as unknown as Record<ValidationRunnerModuleId, ValidationRunnerApprovedModuleDelegate>;
  modules["production-path-driver"] = productionDelegate(driver, authority);
  modules["plan-assertion-engine"] = planAssertionDelegate(authority, identityAuthority);
  const verifier = overrides?.["state-convergence-verifier"];
  if (verifier) {
    modules["state-convergence-verifier"] = trustedVerifierDelegate(verifier, identityAuthority);
  }
  for (const [moduleId, delegate] of Object.entries(overrides ?? {})) {
    if (!delegate || moduleId === "state-convergence-verifier") continue;
    modules[moduleId as ValidationRunnerModuleId] = delegate;
  }
  return modules as ValidationRunnerApprovedModuleDelegates;
}

function defaultRunId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return `vh15:${random ?? `${Date.now()}:${Math.random().toString(16).slice(2)}`}`;
}

/**
 * Validation-only runtime gate.
 *
 * Ordinary product synchronization owns no reference to this class. The H6A
 * runner, its state stores, and all module delegates are constructed lazily
 * only after explicit activation. Disabling validation mode drops the live
 * harness composition without deleting its device-local durable checkpoint.
 */
export class ValidationModeRuntime {
  private active = false;
  private composition?: IntegratedValidationScenarioRunner;
  private authority?: ValidationRunScopedPlanAuthority;
  private identityAuthority?: ValidationRunScopedRemoteIdentityAuthority;
  private readonly definitions = new Map<ValidationScenarioId, ValidationRunnerScenarioDefinition>();

  constructor(private readonly options: ValidationModeRuntimeOptions) {
    for (const definition of options.definitions ?? []) {
      if (this.definitions.has(definition.scenarioId)) {
        throw new Error(`Duplicate validation scenario definition: ${definition.scenarioId}`);
      }
      this.definitions.set(definition.scenarioId, definition);
    }
  }

  enabled(): boolean {
    return this.active;
  }

  setEnabled(enabled: boolean): void {
    this.active = enabled;
    if (!enabled) {
      this.authority?.clearAll();
      this.identityAuthority?.clearAll();
      this.authority = undefined;
      this.identityAuthority = undefined;
      this.composition = undefined;
    }
  }

  scenarioIds(): readonly ValidationScenarioId[] {
    return this.active ? VALIDATION_RUNNER_SCENARIO_IDS : [];
  }

  installedScenarioIds(): readonly ValidationScenarioId[] {
    return this.active ? Object.freeze([...this.definitions.keys()]) : [];
  }

  async startScenario(scenarioId: string): Promise<ValidationModeActionResult> {
    if (!this.active) return { status: "disabled", reason: "Validation mode is disabled." };
    if (!isValidationScenarioId(scenarioId)) {
      return { status: "unavailable", reason: `Unsupported Phase 6 validation scenario: ${scenarioId}` };
    }
    const definition = this.definitions.get(scenarioId);
    if (!definition) {
      return {
        status: "unavailable",
        reason: `Scenario ${scenarioId} is not installed in this H6B build; scenario packages H7-H10 own executable definitions.`,
      };
    }
    const run = validationRunIdentity((this.options.createRunId ?? defaultRunId)(), scenarioId);
    const harness = this.harness();
    this.authority?.clearRun(run);
    this.identityAuthority?.clearRun(run);
    const result = await harness.runner.startScenario({ run, definition });
    return await this.drive(result);
  }

  async resumeCurrent(): Promise<ValidationModeActionResult> {
    if (!this.active) return { status: "disabled", reason: "Validation mode is disabled." };
    const runner = this.harness().runner;
    const current = await runner.current();
    if (!current) return { status: "unavailable", reason: "No durable validation scenario is available to resume." };
    if (current.lifecycle.kind === "terminal") {
      return { status: "unavailable", reason: "The durable validation scenario is already terminal." };
    }

    if (current.lifecycle.kind === "paused-human-action" || current.lifecycle.kind === "resumable") {
      const currentDevice = this.options.currentDevice?.();
      if (!currentDevice) {
        return { status: "unavailable", reason: "Current validation device identity is unavailable." };
      }
      const checkpoint = current.lifecycle.kind === "paused-human-action"
        ? current.lifecycle.checkpoint
        : current.lifecycle.resume.checkpoint;
      const resumed = await runner.resume({
        run: current.run,
        checkpointId: checkpoint.checkpointId,
        currentDevice,
        expectedRevision: current.revision,
      });
      return await this.drive(resumed);
    }

    const advanced = await runner.advance({
      run: current.run,
      expectedRevision: current.revision,
    });
    return await this.drive(advanced);
  }

  private harness(): IntegratedValidationScenarioRunner {
    if (!this.active) throw new Error("Validation mode is disabled.");
    if (this.composition) return this.composition;

    const stateStore = this.options.stateStore
      ?? new IndexedDbValidationJsonCasStore<ValidationRunnerPersistentState>(
        "brain-google-drive-sync-validation-runner-v1",
      );
    const resumeAdoptionStore = this.options.resumeAdoptionStore
      ?? new IndexedDbValidationJsonCasStore<ValidationRunnerResumeAdoptionJournal>(
        "brain-google-drive-sync-validation-resume-adoptions-v1",
      );
    const driver = new ValidationProductionPathDriver(this.options.productionRuntime);
    const authority = new ValidationRunScopedPlanAuthority();
    const identityAuthority = new ValidationRunScopedRemoteIdentityAuthority();
    this.authority = authority;
    this.identityAuthority = identityAuthority;

    this.composition = composeValidationScenarioRunner({
      stateStore,
      resumeAdoptionStore,
      prerequisites: this.options.prerequisites ?? defaultPrerequisites(),
      modules: buildModules(driver, authority, identityAuthority, this.options.moduleOverrides),
      humanCheckpoints: this.options.humanCheckpoints ?? defaultHumanCheckpoints(),
      definitions: [...this.definitions.values()],
    });
    return this.composition;
  }

  private async drive(initial: ValidationRunnerResult): Promise<ValidationModeActionResult> {
    let result = initial;
    for (let transitions = 0; transitions < 1024 && result.status === "RUNNING"; transitions += 1) {
      result = await this.harness().runner.advance({
        run: result.state.run,
        expectedRevision: result.state.revision,
      });
    }
    if (result.status === "RUNNING") {
      return {
        status: "unavailable",
        reason: "Validation scenario exceeded the bounded H6B orchestration transition limit.",
      };
    }
    if (result.status === "PASS" || result.status === "FAIL" || result.status === "BLOCKED") {
      this.authority?.clearRun(result.state.run);
      this.identityAuthority?.clearRun(result.state.run);
    }
    return { status: "runner", result };
  }
}
