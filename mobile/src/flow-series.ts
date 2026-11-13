import { useEffect, useRef, useState } from 'react';
import type { FlowSeries, Recurrence, SeriesEnd, SeriesOccurrence, SeriesTime } from '../../shared/flow-series';
import { api } from './api';
import { useTrainingTick } from './training-route';

export type SeriesBundle = { series: FlowSeries[]; occurrences: SeriesOccurrence[] };
/** What a screen needs to tell apart "still loading", "nothing on" and "the fetch failed". */
export type SeriesView = SeriesBundle & { loading: boolean; error: string };

const empty: SeriesView = { series: [], occurrences: [], loading: true, error: '' };
let view: SeriesView = empty;
let rangeKey = '';
let request = 0;
const listeners = new Set<() => void>();

function emit(next: Partial<SeriesView>) {
  view = { ...view, ...next };
  listeners.forEach(listener => listener());
}

export function loadFlowSeries(from: string, to: string, force = false) {
  const key = `${from}|${to}`;
  const fresh = rangeKey === key;
  if (!force && fresh && !view.loading && !view.error) return Promise.resolve(view);
  const token = ++request;
  rangeKey = key;
  // Another range's rows would read as this one's, so drop them until the answer lands.
  emit(fresh ? { loading: true, error: '' } : { series: [], occurrences: [], loading: true, error: '' });
  return api<SeriesBundle>(`/api/mobile/series?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
    .then(result => {
      if (token === request) emit({ series: result.series, occurrences: result.occurrences, loading: false, error: '' });
      return token === request ? view : { ...result, loading: false, error: '' };
    })
    .catch((reason: unknown) => {
      if (token === request) emit({ loading: false, error: reason instanceof Error ? reason.message : 'Try again.' });
      return view;
    });
}

export function useFlowSeries(from: string, to: string) {
  // A finished training session bumps this tick, and a done item should drop its Start.
  const [tick] = useTrainingTick();
  const [value, setValue] = useState(view);
  const seenTick = useRef<number | null>(null);
  useEffect(() => {
    let live = true;
    const listener = () => {
      if (live) setValue(view);
    };
    listeners.add(listener);
    const stale = seenTick.current !== null && seenTick.current !== tick;
    seenTick.current = tick;
    void loadFlowSeries(from, to, stale);
    listener();
    return () => {
      live = false;
      listeners.delete(listener);
    };
  }, [from, to, tick]);
  return value;
}

/** Fetch the range on screen again, after a failure or a change. */
export function reloadFlowSeries() {
  if (!rangeKey) return Promise.resolve(view);
  const split = rangeKey.indexOf('|');
  return loadFlowSeries(rangeKey.slice(0, split), rangeKey.slice(split + 1), true);
}

export type SeriesDraft = {
  itemKind: 'flow' | 'session' | 'community';
  itemId: string;
  /** Required when itemKind is community: the published version this series keeps running. */
  version?: number;
  start: string;
  time: SeriesTime;
  recurrence: Recurrence;
  end: SeriesEnd;
};

/** Read a range without replacing the calendar's cached window. */
export function peekFlowSeries(from: string, to: string) {
  return api<SeriesBundle>(`/api/mobile/series?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

async function write(body: object) {
  await api('/api/mobile/series', body);
  await reloadFlowSeries();
}

export function createSeries(draft: SeriesDraft) {
  return write({ action: 'create', ...draft });
}

export function updateSeries(
  id: string,
  fields: Partial<Pick<SeriesDraft, 'itemId' | 'start' | 'time' | 'recurrence' | 'end' | 'version'>>,
) {
  return write({ action: 'update-series', id, ...fields });
}

/** Keep the series, and run the author's current published version from now on. */
export function adoptSeriesVersion(id: string, version: number) {
  return updateSeries(id, { version });
}

export function deleteSeries(id: string) {
  return write({ action: 'delete-series', id });
}

export function skipOccurrence(seriesId: string, date: string) {
  return write({ action: 'skip-one', seriesId, date });
}

export function moveOccurrence(seriesId: string, date: string, to: { date?: string; time?: SeriesTime }) {
  return write({ action: 'move-one', seriesId, date, to });
}

/** Forget the last member's series on sign-in and sign-out. */
export function resetFlowSeries() {
  rangeKey = '';
  request += 1;
  emit(empty);
}
