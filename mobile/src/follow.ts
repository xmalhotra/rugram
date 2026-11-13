import { useCallback, useEffect, useState } from 'react';
import type { FollowSource } from '../../shared/follow';
import { api } from './api';
import { reloadFlowSeries } from './flow-series';
import { loadMapFlows } from './map-flows';

export type FollowView = {
  id: string;
  status: 'active' | 'returned' | 'kept' | 'stopped';
  where: 'replace' | 'add';
  sessionsTotal: 1 | 4 | null;
  sessionsLeft: number | null;
  after: 'return' | 'keep';
  fromName: string;
  title: string;
  ownTitle: string;
  startedOn: string;
  dates: string[];
  pausedSeriesId: string | null;
  replacementSeriesId: string;
  replacedFlowId: string | null;
  source: FollowSource;
  items: { exerciseId: string; sets: number }[];
  reviewLine: string | null;
  showsOn: string[];
};

export type FollowList = {
  follows: FollowView[];
  reviewLines: string[];
  placedSlot?: number | null;
};

type Cache = { date: string; list: FollowList | null; loading: boolean; error: string };

let request = 0;
let cache: Cache = { date: '', list: null, loading: false, error: '' };
const listeners = new Set<() => void>();

function emit(next: Partial<Cache>) {
  cache = { ...cache, ...next };
  listeners.forEach(listener => listener());
}

export function loadFollows(date: string, force = false) {
  if (!force && cache.date === date && cache.loading) return Promise.resolve(cache.list);
  if (!force && cache.date === date && cache.list && !cache.error) return Promise.resolve(cache.list);
  const token = ++request;
  emit({ date, loading: true, error: '', ...(cache.date === date ? {} : { list: null }) });
  return api<FollowList>(`/api/mobile/follows?date=${encodeURIComponent(date)}`)
    .then(list => {
      if (token === request) emit({ date, list, loading: false, error: '' });
      return list;
    })
    .catch((reason: unknown) => {
      if (token === request) emit({ loading: false, error: reason instanceof Error ? reason.message : 'Try again.' });
      return null;
    });
}

export function useFlowFollows(date: string) {
  const [value, setValue] = useState(cache);
  useEffect(() => {
    let live = true;
    const listener = () => {
      if (live) setValue(cache);
    };
    listeners.add(listener);
    void loadFollows(date);
    listener();
    return () => {
      live = false;
      listeners.delete(listener);
    };
  }, [date]);
  const reload = useCallback(() => loadFollows(date, true), [date]);
  return {
    follows: value.date === date ? value.list?.follows ?? [] : [],
    reviewLines: value.date === date ? value.list?.reviewLines ?? [] : [],
    loading: value.date === date && value.loading,
    error: value.date === date ? value.error : '',
    reload,
  };
}

export async function startFollow(body: {
  theirFlow: unknown;
  where?: { kind: 'replace'; flowId: string } | { kind: 'add'; date: string };
  sessions?: 1 | 4 | null;
  after?: 'return' | 'keep';
  today: string;
  replaceSlot?: number;
  confirmBase?: boolean;
}) {
  const list = await api<FollowList>(`/api/mobile/follows?date=${encodeURIComponent(body.today)}`, { action: 'start', ...body });
  emit({ date: body.today, list, loading: false, error: '' });
  await reloadFlowSeries();
  void loadMapFlows(body.today, true);
  return list;
}

export async function stopFollow(id: string, today: string) {
  const list = await api<FollowList>(`/api/mobile/follows?date=${encodeURIComponent(today)}`, { action: 'stop', id });
  emit({ date: today, list, loading: false, error: '' });
  await reloadFlowSeries();
  void loadMapFlows(today, true);
  return list;
}
