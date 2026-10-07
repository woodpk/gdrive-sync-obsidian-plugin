import { spawnSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import ts = require("typescript");

export type ChangeClass = "ordinary" | "authorized-governance";

export interface ArchitectureViolation {
  readonly rule: string;
  readonly path: string;
  readonly detail: string;
}

export interface GuardResult {
  readonly exitCode: number;
  readonly output: string;
  readonly violations: readonly ArchitectureViolation[];
}

interface BoundaryPolicy {
  readonly manifestPath: string;
  readonly productionRoots: readonly string[];
  readonly testPlatformRoot: string;
  readonly activeDevRoot: string;
  readonly archiveRoot: string;
  readonly productionForbiddenRoots: readonly string[];
  readonly shippingForbiddenRoots: readonly string[];
  readonly approvedProductionImports: readonly string[];
  readonly frozenSurfaces: readonly string[];
  readonly scenarioSpecificProductionAllowed: boolean;
  readonly productionValidationUiAllowed: boolean;
  readonly seamLocMax: number;
  readonly seamFilesMax: number;
  readonly coreLocMax: number;
  readonly liveLocMax: number;
  readonly scenarioTarget: number;
  readonly scenarioMax: number;
  readonly scenarioPowerShellMax: number;
  readonly bvpPowerShellCountMax: number;
  readonly bvpPowerShellLocMax: number;
  readonly scenarioProductionMax: number;
}

interface SnapshotReader {
  readonly paths: readonly string[];
  read(path: string): string | null;
}

interface Dependency {
  readonly kind: string;
  readonly specifier: string;
}

interface SourceAnalysis {
  readonly path: string;
  readonly dependencies: readonly Dependency[];
  readonly scenarioSignals: readonly { readonly kind: string; readonly name: string }[];
  readonly buildReferences: readonly string[];
  readonly declarativeScenario: boolean;
  readonly errors: readonly string[];
}

export interface ScenarioMetric {
  readonly scenario: string;
  readonly path: string;
  readonly logicalLoc: number;
  readonly targetExceeded: boolean;
  readonly hardMaxExceeded: boolean;
}

export interface MetricsSnapshot {
  readonly productionSourceLogicalLoc: number;
  readonly productionSeamLogicalLoc: number;
  readonly productionSeamFileCount: number;
  readonly productionSeamFiles: readonly string[];
  readonly frameworkCoreLogicalTsLoc: number;
  readonly platformCoreRuntimeModuleCount: number;
  readonly frameworkCoreFiles: readonly string[];
  readonly liveDeviceAgentRelayLogicalTsLoc: number;
  readonly liveDeviceAgentRelayFiles: readonly string[];
  readonly scenarioDefinitionLogicalLocTotal: number;
  readonly scenarioCount: number;
  readonly scenarios: readonly ScenarioMetric[];
  readonly productionModulesImportedCount: number;
  readonly productionModulesImported: readonly string[];
  readonly bvpPowerShellScriptCount: number;
  readonly bvpPowerShellLogicalLoc: number;
  readonly bvpPowerShellFiles: readonly string[];
  readonly scenarioSpecificPowerShellCount: number;
