import { api } from './api';

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
