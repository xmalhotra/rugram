import { catalogFlows, type CatalogFlow } from '../../shared/flow-catalog';
import { gymFlowById, gymFlowIsLive } from '../../shared/gym-flows';

/**
 * The runnable flow id when this catalogue entry is live.
 * A gym flow is live exactly when it has exercises. That is the same rule the catalogue uses for status.
 */
export function liveFlowId(flow: CatalogFlow) {
  if (!flow.flowId) return undefined;
  if (gymFlowById(flow.flowId)) return gymFlowIsLive(flow.flowId) ? flow.flowId : undefined;
  return flow.status === 'live' ? flow.flowId : undefined;
}

/** The only old-library flows the app may show. Everything else stays out of sight. */
export const liveFlowIds = new Set(
  catalogFlows.flatMap(flow => {
    const id = liveFlowId(flow);
    return id ? [id] : [];
  }),
);
