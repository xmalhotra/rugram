import { gymFlows } from './gym-flows';
import { trainingCatalog } from './training-seed';

export type ExerciseUsage = { kind: 'flow' | 'session'; id: string; title: string };

let built: Map<string, ExerciseUsage[]> | null = null;

function remember(index: Map<string, ExerciseUsage[]>, exerciseId: string, entry: ExerciseUsage) {
  const list = index.get(exerciseId);
  if (list) list.push(entry);
  else index.set(exerciseId, [entry]);
}

type UsageSources = {
  flows: { id: string; title: string; items: { exerciseId: string }[] }[];
  sessions: { id: string; title: string; blocks: { exerciseId?: string }[] }[];
};

/** Pure: builds the index from any flow and session lists. */
export function buildExerciseUsage({ flows, sessions }: UsageSources) {
  const index = new Map<string, ExerciseUsage[]>();
  for (const flow of flows) {
    const seen = new Set<string>();
    for (const item of flow.items) {
      if (seen.has(item.exerciseId)) continue;
      seen.add(item.exerciseId);
      remember(index, item.exerciseId, { kind: 'flow', id: flow.id, title: flow.title });
    }
  }
  for (const session of sessions) {
    const seen = new Set<string>();
    for (const block of session.blocks) {
      if (!block.exerciseId || seen.has(block.exerciseId)) continue;
      seen.add(block.exerciseId);
      remember(index, block.exerciseId, { kind: 'session', id: session.id, title: session.title });
    }
  }
  for (const list of index.values()) {
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'flow' ? -1 : 1;
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
    });
  }
  return index;
}

function index() {
  built ??= buildExerciseUsage({ flows: gymFlows, sessions: trainingCatalog().sessions });
  return built;
}

/** Flows first, then sessions, each group by title. Derived once from the flows and sessions. */
export function exerciseUsage(exerciseId: string): ExerciseUsage[] {
  return index().get(exerciseId) ?? [];
}

/** Every exercise that appears in a flow or a seeded session, in id order. */
export function usedExerciseIds() {
  return [...index().keys()].sort();
}
