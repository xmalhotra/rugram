import { catalogFlows, type CatalogFlow } from '../../shared/flow-catalog';

/**
 * Development builds only: a real flow to try the pages and the clock with while nothing is live.
 * Release builds never see it, so every catalog flow stays Coming soon there.
 */
const testFlows: Record<string, string> = __DEV__
  ? {
      'gym-supersets-back-biceps-superset': 'gym-back-biceps',
      'cal-upper-beginner': 'cal-upper-beginner',
      'cal-upper-intermediate': 'cal-upper-intermediate',
    }
  : {};

export function liveFlowId(flow: CatalogFlow) {
  return flow.status === 'live' ? flow.flowId : testFlows[flow.id];
}

/** The only old-library flows the app may show. Everything else stays out of sight. */
export const liveFlowIds = new Set(
  catalogFlows.flatMap(flow => {
    const id = liveFlowId(flow);
    return id ? [id] : [];
  }),
);
