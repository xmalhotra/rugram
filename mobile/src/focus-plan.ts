import { useCallback, useEffect, useState } from 'react';
import type { FocusPlanView, FocusSuggestion } from '../../shared/focus-planner';
import { api } from './api';
import { reloadBodyFlow } from './body-flow';
import { reloadFlowSeries } from './flow-series';

export type { FocusPlanView, FocusSuggestion };

const empty = { data: null as FocusPlanView | null, loading: true, error: '' };
let view = empty;
let key = '';
let request = 0;
let inflight: Promise<typeof empty> | null = null;
let inflightKey = '';
const listeners = new Set<() => void>();

function emit(next: Partial<typeof empty>) {
  view = { ...view, ...next };
  listeners.forEach(listener => listener());
}

export function loadFocusPlan(date: string, force = false) {
  if (!force && key === date && view.data && !view.loading && !view.error) return Promise.resolve(view);
  if (!force && inflight && inflightKey === date) return inflight;
  const same = key === date;
  const token = ++request;
  key = date;
  inflightKey = date;
  emit(same && view.data ? { loading: true, error: '' } : { data: null, loading: true, error: '' });
  const pending = api<FocusPlanView>(`/api/mobile/focus?week=${encodeURIComponent(date)}`)
    .then(result => {
      if (token === request) emit({ data: result, loading: false, error: '' });
      return token === request ? view : { data: result, loading: false, error: '' };
    })
    .catch((reason: unknown) => {
      if (token === request) emit({ loading: false, error: reason instanceof Error ? reason.message : 'Try again.' });
      return view;
    })
    .finally(() => {
      if (token === request) inflight = null;
    });
  inflight = pending;
  return pending;
}

export function useFocusPlan(date: string) {
  const [value, setValue] = useState(() => (key === date ? view : empty));
  useEffect(() => {
    let live = true;
    const listener = () => {
      if (live) setValue(view);
    };
    listeners.add(listener);
    void loadFocusPlan(date);
    listener();
    return () => {
      live = false;
      listeners.delete(listener);
    };
  }, [date]);
  const reload = useCallback(() => loadFocusPlan(date, true), [date]);
  return { ...value, reload };
}

async function refresh(date: string) {
  await Promise.all([loadFocusPlan(date, true), reloadFlowSeries(), reloadBodyFlow()]);
}

export function applyFocusPlan(date: string, ids: string[]) {
  return api<FocusPlanView>('/api/mobile/focus', { action: 'apply', week: date, ids }).then(() => refresh(date));
}

export function undoFocusPlan(date: string, id: string) {
  return api<FocusPlanView>('/api/mobile/focus', { action: 'undo', week: date, id }).then(() => refresh(date));
}

/** Forget the last member's plan on sign-in and sign-out. */
export function resetFocusPlan() {
  key = '';
  inflightKey = '';
  inflight = null;
  request += 1;
  emit({ data: null, loading: true, error: '' });
}
