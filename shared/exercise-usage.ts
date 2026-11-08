import { gymExerciseId, gymFlows } from './gym-flows';
import type { HabitFlow } from './mobile';
import { findFlowCard, type FlowCardReference } from './personal-flows';
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

/**
 * The exercises a saved or published card stands for: a gym flow card, a workout card,
 * or a generated card from a workout flow (one per exercise, in block order).
 */
export function cardExerciseIds(library: HabitFlow[], card: FlowCardReference): string[] {
  const gym = gymExerciseId(card.cardId);
  if (gym) return [gym];
  const blocks = (flow?: HabitFlow) => [...new Set(flow?.workout?.blocks.map(block => block.exerciseId) ?? [])];
  const resolved = findFlowCard(library, card.sourceFlowId, card.cardId);
  if (resolved?.exerciseId) return [resolved.exerciseId];
  if (resolved?.workout) return blocks(resolved);
  const generated = /:visual:(\d+)$/.exec(card.cardId);
  if (!generated) return [];
  const id = blocks(library.find(flow => flow.id === card.sourceFlowId))[Number(generated[1]) - 1];
  return id ? [id] : [];
}
