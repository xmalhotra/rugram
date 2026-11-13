import { useCallback, useEffect, useRef, useState } from 'react';
import type { HabitFlow } from '../../shared/mobile';
import {
  areasPlannedByNow,
  followedMapFlow,
  plannedExerciseIds,
  type MapFlow,
  type MapFlowFollow,
  type MapFlowItem,
  type MapFlowRef,
} from '../../shared/map-flow';
import type { MuscleArea } from '../../shared/muscle-map';
import type { PredictedArea } from '../../shared/predicted-body-flow';
import { trainingCatalog } from '../../shared/training-seed';
import { api } from './api';
import { useTrainingTick } from './training-route';

/** What GET /api/mobile/map-flows returns. `doneDates` feeds plannedByNow. */
export type MapFlowCard = MapFlow & {
  styleName: string;
  figure: PredictedArea[];
  items: MapFlowItem[];
  doneDates: string[];
};

export type MapFlowList = {
  slotCount: 5;
  followedId: string | null;
  follows: MapFlowFollow[];
  flows: MapFlowCard[];
};

export type MapFlowChange =
  | { action: 'create'; templateId: string; slot?: number; start?: string }
  | { action: 'copy'; mapFlowId: string; slot?: number; start?: string }
  | { action: 'rename'; mapFlowId: string; name: string }
  | { action: 'clear'; slot: number }
  | { action: 'follow'; mapFlowId: string; from: string }
  | { action: 'base'; from: string }
  | { action: 'let-go'; mapFlowId: string; index: number; on: string };

type Cache = {
  date: string;
  list: MapFlowList | null;
  loading: boolean;
  error: string;
};

let request = 0;
let cache: Cache = { date: '', list: null, loading: false, error: '' };
const listeners = new Set<() => void>();

function emit(next: Partial<Cache>) {
  cache = { ...cache, ...next };
  listeners.forEach(listener => listener());
}

export function loadMapFlows(date: string, force = false) {
  if (!force && cache.date === date && cache.loading) return Promise.resolve(cache.list);
  if (!force && cache.date === date && cache.list && !cache.error) return Promise.resolve(cache.list);
  const token = ++request;
  emit({
    date,
    loading: true,
    error: '',
    ...(cache.date === date ? {} : { list: null }),
  });
  return api<MapFlowList>(`/api/mobile/map-flows?date=${encodeURIComponent(date)}`)
    .then(list => {
      if (token === request) emit({ date, list, loading: false, error: '' });
      return list;
    })
    .catch((reason: unknown) => {
      if (token === request) emit({ loading: false, error: reason instanceof Error ? reason.message : 'Try again.' });
      return null;
    });
}

export function useMapFlows(date: string) {
  const [tick] = useTrainingTick();
  const [value, setValue] = useState(cache);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    let live = true;
    const listener = () => {
      if (live) setValue({ ...cache });
    };
    listeners.add(listener);
    const stale = seen.current !== null && seen.current !== tick;
    seen.current = tick;
    void loadMapFlows(date, stale);
    listener();
    return () => {
      live = false;
      listeners.delete(listener);
    };
  }, [date, tick]);
  const change = useCallback(
    async (body: MapFlowChange) => {
      const token = ++request;
      const list = await api<MapFlowList>(`/api/mobile/map-flows?date=${encodeURIComponent(date)}`, body);
      if (token === request) emit({ date, list, loading: false, error: '' });
      return list;
    },
    [date],
  );
  const reload = useCallback(() => loadMapFlows(date, true), [date]);
  const current = value.date === date ? value : { ...value, list: null, loading: true, error: '' };
  return { list: current.list, loading: current.loading, error: current.error, change, reload };
}

function exerciseIdsForPlan(ref: MapFlowRef, library: readonly HabitFlow[]) {
  const listed = plannedExerciseIds(ref);
  if (listed.length) return listed;
  if (ref.kind === 'session') {
    const blocks = trainingCatalog().sessions.find(session => session.id === ref.id)?.blocks ?? [];
    return [...new Set(blocks.flatMap(block => (block.exerciseId ? [block.exerciseId] : [])))];
  }
  const blocks = library.find(flow => flow.id === ref.id)?.workout?.blocks ?? [];
  return [...new Set(blocks.map(block => block.exerciseId))];
}

/** Areas the followed Map flow planned by now, using the library when a flow is not in the gym catalogue. */
export function followedPlanAreas(
  list: MapFlowList | null,
  today: string,
  range: { from: string; to: string } | undefined,
  library: readonly HabitFlow[],
): MuscleArea[] {
  if (!list) return [];
  const followed = followedMapFlow(list.flows, list.follows, today);
  if (!followed) return [];
  return areasPlannedByNow(
    followed.flow,
    followed.from,
    { doneDates: followed.flow.doneDates, letGo: followed.flow.released },
    today,
    range,
    ref => exerciseIdsForPlan(ref, library),
  );
}
