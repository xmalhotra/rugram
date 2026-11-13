import type { RoutineCard, RoutineCheckpoint, RoutineType } from '../../shared/routines';
import { api } from './api';

export type RoutineQuery = {
  checkpoint?: RoutineCheckpoint;
  type?: RoutineType;
  q?: string;
  cursor?: string;
};

export type RoutinePage = { routines: RoutineCard[]; nextCursor: string | null };

const pages = new Map<string, RoutinePage>();
const singles = new Map<string, RoutineCard>();
const remembered = 8;

function remember(key: string, page: RoutinePage) {
  pages.delete(key);
  pages.set(key, page);
  while (pages.size > remembered) {
    const oldest = pages.keys().next().value;
    if (oldest === undefined) break;
    pages.delete(oldest);
  }
}

function keyFor(query: RoutineQuery) {
  return JSON.stringify(query);
}

/** The last pages read, kept in memory so a checkpoint opens again without waiting. */
export async function fetchRoutines(query: RoutineQuery): Promise<RoutinePage> {
  const key = keyFor(query);
  const cached = pages.get(key);
  if (cached) {
    remember(key, cached);
    return cached;
  }
  const params = new URLSearchParams();
  if (query.checkpoint) params.set('checkpoint', query.checkpoint);
  if (query.type) params.set('type', query.type);
  if (query.q) params.set('q', query.q);
  if (query.cursor) params.set('cursor', query.cursor);
  const page = await api<RoutinePage>(`/api/mobile/routines?${params.toString()}`);
  remember(key, page);
  for (const routine of page.routines) singles.set(routine.id, routine);
  return page;
}

export async function fetchRoutine(id: string): Promise<RoutineCard> {
  const cached = singles.get(id);
  if (cached) return cached;
  const result = await api<{ routine: RoutineCard }>(`/api/mobile/routines?id=${encodeURIComponent(id)}`);
  singles.set(id, result.routine);
  return result.routine;
}
