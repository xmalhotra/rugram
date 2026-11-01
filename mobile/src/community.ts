import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type {
  CommunityAction,
  CommunityFeed,
  CommunityFlow,
  CommunityTab,
  CommunityVersion,
} from '../../shared/community-flows';

type Status = Pick<CommunityFeed, 'mine' | 'copies'>;

// Any successful action refreshes every mounted feed, status and detail view.
const listeners = new Set<() => void>();
function changed() {
  listeners.forEach(listener => listener());
}
function useChanges(reload: () => void) {
  useEffect(() => {
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);
}

export function newPersonalFlowId() {
  return `personal-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export async function communityAct(action: CommunityAction) {
  const result = await api<{ id?: string }>('/api/mobile/community', action);
  changed();
  return result;
}

function useRemote<T>(path: string | null) {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path));
  const load = useCallback(() => {
    if (!path) return;
    let live = true;
    setLoading(true);
    api<T>(path)
      .then(next => {
        if (!live) return;
        setValue(next);
        setError('');
      })
      .catch(reason => {
        if (live) setError(reason instanceof Error ? reason.message : 'Could not load.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [path]);
  useEffect(() => load(), [load]);
  useChanges(load);
  return { value, setValue, error, loading, reload: load };
}

export function useCommunityFeed(tab: CommunityTab) {
  const remote = useRemote<CommunityFeed>(`/api/mobile/community?tab=${tab}`);
  return { ...remote, feed: remote.value, setFeed: remote.setValue };
}

export function useCommunityStatus() {
  return useRemote<Status>('/api/mobile/community?status=mine');
}

export function useCommunityFlow(id: string | null) {
  return useRemote<{ flow: CommunityFlow; versions: CommunityVersion[] }>(
    id ? `/api/mobile/community?id=${encodeURIComponent(id)}` : null,
  );
}
