import {
  IntegratedProductController as BaseIntegratedProductController,
  type ProductControllerOptions,
} from "./product-controller-base";
import { authoritativeDiagnostics, withExecutionLifecycleObserver } from "./authority-execution-diagnostics";
import { TrustedStateSynchronizationAuthorityStore } from "./trusted-state-authority-store";

export type {
  AutomaticExecutionDecision,
  PlannerFactory,
  ProductControllerOptions,
} from "./product-controller-base";

/**
 * Production controller entrypoint. The underlying orchestration implementation
 * is always supplied an authority store: callers may inject the frozen v1.1
 * store directly, otherwise authority is derived from the canonical durable
 * trusted synchronization state. There is no nominal-authority mutation path.
 */
export class IntegratedProductController extends BaseIntegratedProductController {
  constructor(options: ProductControllerOptions) {
    const diagnostics = authoritativeDiagnostics(options.diagnostics);
    const authorityStore = options.authorityStore
      ?? new TrustedStateSynchronizationAuthorityStore(options.stateStore, options.stateContext);
    super({
      ...options,
      ...(diagnostics.logger ? { diagnostics: diagnostics.logger } : {}),
      authorityStore: withExecutionLifecycleObserver(authorityStore, diagnostics.observer),
    });
  }
}
