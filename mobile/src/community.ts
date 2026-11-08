import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import { usePaneState } from './pane-state';
import type {
  CommunityAction,
  CommunityCuration,
  CommunityFeed,
  CommunityFlow,
  CommunityMember,
  CommunityTab,
  CommunityVersion,
} from '../../shared/community-flows';
import type { PersonHit } from '../../shared/usernames';

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

const noop = () => undefined;
function useRemote<T>(path: string | null, live = true) {
  // Kept per account across remounts, so switching tabs shows the last result at once
  // while it refreshes, instead of flashing a loader.
  const [value, setValue] = usePaneState<T | null>(`remote:${path ?? ''}`, null, 'account');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(path) && value === null);
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
  }, [path, setValue]);
  useEffect(() => load(), [load]);
  useChanges(live ? load : noop);
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

/** Curation can call a paid model, so it loads once per prompt and never on feed changes. */
export function useCuration(prompt: string) {
  return useRemote<CommunityCuration>(
    prompt ? `/api/mobile/community?curate=${encodeURIComponent(prompt)}` : null,
    false,
  );
}

/** Debounced people search for the Following tab. Empty until the query has 2 characters. */
export function usePeopleSearch(query: string) {
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const term = debounced.trim().replace(/^@/, '');
  const path =
    term.length >= 2 ? `/api/mobile/community?people=${encodeURIComponent(debounced.trim())}` : null;
  const remote = useRemote<{ people: PersonHit[] }>(path, false);
  return { ...remote, people: remote.value?.people ?? [], active: term.length >= 2 };
}

export function useCommunityMember(id: string | null) {
  return useRemote<CommunityMember>(
    id ? `/api/mobile/community?member=${encodeURIComponent(id)}` : null,
  );
}
