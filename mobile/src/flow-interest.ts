import { api } from './api';
import type { FlowLeaderboard } from '../../shared/flow-leaderboard';

export function flowInterestIds() {
  return api<{ catalogFlowIds: string[] }>('/api/mobile/flow-interest');
}

export function wantCatalogFlow(catalogFlowId: string) {
  return api<{ catalogFlowIds: string[] }>('/api/mobile/flow-interest', {
    action: 'want',
    catalogFlowId,
  });
}

export function unwantCatalogFlow(catalogFlowId: string) {
  return api<{ catalogFlowIds: string[] }>('/api/mobile/flow-interest', {
    action: 'unwant',
    catalogFlowId,
  });
}

export type FlowInterestAdmin = {
  flows: { catalogFlowId: string; title: string; count: number }[];
};

export function flowInterestAdmin() {
  return api<FlowInterestAdmin>('/api/mobile/flow-interest?scope=admin');
}

export function notifyCatalogFlow(catalogFlowId: string) {
  return api<{ notified: number }>('/api/mobile/flow-interest', { action: 'notify', catalogFlowId });
}

/** The most requested flows still being curated. */
export function flowLeaderboard() {
  return api<FlowLeaderboard>('/api/mobile/flow-interest?scope=leaderboard');
}
