import type { HabitFlow } from './mobile';
import { exercise } from './exercises';
import { restFor as exerciseRestFor } from './exercise-rest';
import { amountListLabel, schemeById, spreadAmounts } from './set-scheme-math';
import { catalogueSessions, intermediateBackBiceps } from './gym-flow-sessions';

export type SetTarget =
  | { kind: 'reps'; min: number; max: number }
  | { kind: 'hold'; minSeconds: number; maxSeconds: number }
  | { kind: 'max'; measure: 'reps' | 'hold' };

export type GymFlowItem = {
  exerciseId: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds?: number;
  /** Seconds or a max set. Rep flows keep using repsMin and repsMax. */
  target?: SetTarget;
  /** How reps and weight change across the sets. Missing means they stay put. */
  scheme?: string;
  /**
   * Superset label. Items that share a label and sit next to each other alternate
   * by set (A1, A2). A label on its own is just another exercise.
   */
  superset?: string;
};

export type GymFlow = {
  id: string;
  title: string;
  goal: string;
  level: string;
  items: GymFlowItem[];
};

const aimed = (exerciseId: string, sets: number, target: SetTarget, restSeconds = 60, scheme?: string): GymFlowItem => {
  const marked = scheme ? { scheme } : {};
  if (target.kind === 'reps') {
    return { exerciseId, sets, repsMin: target.min, repsMax: target.max, restSeconds, target, ...marked };
  }
  if (target.kind === 'hold') {
    return {
      exerciseId,
      sets,
      repsMin: target.minSeconds,
      repsMax: target.maxSeconds,
      restSeconds,
      target,
      ...marked,
    };
  }
  return { exerciseId, sets, repsMin: 1, repsMax: 1, restSeconds, target, ...marked };
};

export const gymFlows: GymFlow[] = [
  intermediateBackBiceps,
  {
    id: 'cal-upper-beginner',
    title: 'Upper Body at Home',
    goal: 'Press, tap the shoulders, and hold the trunk, using only the floor.',
    level: 'Beginner',
    items: [
      aimed('push-up', 3, { kind: 'reps', min: 8, max: 10 }, 60, 'descending'),
      aimed('v-taps', 4, { kind: 'reps', min: 6, max: 8 }, 60, 'descending'),
      aimed('superman-hold', 3, { kind: 'hold', minSeconds: 30, maxSeconds: 40 }, 60, 'descending'),
      aimed('seated-leg-lift', 2, { kind: 'max', measure: 'reps' }),
      aimed('straight-arm-plank', 3, { kind: 'hold', minSeconds: 45, maxSeconds: 60 }, 60, 'descending'),
    ],
  },
  {
    id: 'cal-upper-intermediate',
    title: 'Upper Body at Home',
    goal: 'Harder presses and a floor row, then a handstand and an L-sit.',
    level: 'Intermediate',
    items: [
      aimed('explosive-push-up', 3, { kind: 'reps', min: 8, max: 10 }, 60, 'descending'),
      aimed('pike-push-up', 4, { kind: 'reps', min: 6, max: 8 }, 60, 'descending'),
      aimed('no-bar-back-row', 3, { kind: 'reps', min: 8, max: 10 }, 60, 'descending'),
      aimed('wall-handstand', 3, { kind: 'hold', minSeconds: 10, maxSeconds: 15 }, 90, 'descending'),
      aimed('l-sit', 2, { kind: 'max', measure: 'hold' }, 90),
      aimed('forearm-plank', 3, { kind: 'hold', minSeconds: 45, maxSeconds: 60 }, 60, 'descending'),
    ],
  },
  ...catalogueSessions,
];

export function gymFlowById(id: string) {
  return gymFlows.find(flow => flow.id === id);
}

/** Live exactly when the gym flow exists and already has exercises. */
export function gymFlowIsLive(id: string | undefined) {
  const flow = id ? gymFlowById(id) : undefined;
  return Boolean(flow && flow.items.length > 0);
}

/**
 * Minutes for a session: each set is 45 seconds of work plus that exercise's rest,
 * then 6 minutes to warm up and set up. Six minutes is the middle of the 5–8 minute
 * range in the gym catalogue. A superset still counts each exercise's own rest.
 */
export function gymEstimatedMinutes(flow: { items: Pick<GymFlowItem, 'exerciseId' | 'sets' | 'restSeconds'>[] }) {
  const work = flow.items.reduce((total, entry) => total + entry.sets * (45 + gymRestSeconds(entry)), 0);
  return Math.round((work + 6 * 60) / 60);
}

/** The item's own rest, or the exercise's rest class when the flow didn't set one. */
export function gymRestSeconds(item: Pick<GymFlowItem, 'exerciseId' | 'restSeconds'>) {
  return item.restSeconds ?? exerciseRestFor(item.exerciseId);
}

export function resolveTarget(item: Pick<GymFlowItem, 'repsMin' | 'repsMax' | 'target'>): SetTarget {
  return item.target ?? { kind: 'reps', min: item.repsMin, max: item.repsMax };
}

export function gymTargetLabel(entry: GymFlowItem) {
  const target = resolveTarget(entry);
  if (entry.scheme) {
    const amounts = spreadAmounts(schemeById(entry.scheme), target, entry.sets);
    const changed = amountListLabel(entry.sets, amounts, target.kind === 'hold' ? ' sec' : '');
    if (changed) return changed;
  }
  if (target.kind === 'hold') {
    const span =
      target.minSeconds === target.maxSeconds
        ? `${target.minSeconds}`
        : `${target.minSeconds}–${target.maxSeconds}`;
    return `${entry.sets} × ${span} sec`;
  }
  if (target.kind === 'max') return `${entry.sets} × max${target.measure === 'hold' ? ' sec' : ''}`;
  const reps = target.min === target.max ? `${target.min}` : `${target.min}–${target.max}`;
  return `${entry.sets} × ${reps}`;
}

/** The text beside one set: "30–40 sec", "8–10", or "max". */
export function setTargetText(entry: GymFlowItem) {
  const target = resolveTarget(entry);
  if (target.kind === 'hold') {
    return target.minSeconds === target.maxSeconds
      ? `${target.minSeconds} sec`
      : `${target.minSeconds}–${target.maxSeconds} sec`;
  }
  if (target.kind === 'max') return 'max';
  return target.min === target.max ? `${target.min}` : `${target.min}–${target.max}`;
}

export function gymCardId(flowId: string, exerciseId: string) {
  return `${flowId}:${exerciseId}`;
}

/** Exercise id when `cardId` is a card from a gym flow. */
export function gymExerciseId(cardId: string) {
  const split = cardId.indexOf(':');
  if (split < 1) return null;
  const flowId = cardId.slice(0, split);
  const exerciseId = cardId.slice(split + 1);
  const flow = gymFlowById(flowId);
  if (!flow) return null;
  if (flow.items.some(entry => entry.exerciseId === exerciseId)) return exerciseId;
  // A Customflow swap puts the replacement's id on the card. It is still this flow's exercise.
  if (exercise(exerciseId)) return exerciseId;
  return null;
}

export function gymFlowItem(flowId: string, exerciseId: string) {
  return gymFlowById(flowId)?.items.find(entry => entry.exerciseId === exerciseId);
}

export function gymHabitCard(flow: GymFlow, entry: GymFlowItem): HabitFlow {
  const move = exercise(entry.exerciseId);
  const name = move?.name ?? entry.exerciseId;
  const target = gymTargetLabel(entry);
  return {
    id: gymCardId(flow.id, entry.exerciseId),
    title: name,
    goal: 'Workout',
    description: target,
    area: 'Fitness',
    pathId: 'workout',
    level: flow.level,
    guideId: 'gym-exercise',
    sessionGuide: {
      collection: flow.title,
      label: target,
      format: target,
      equipment: move?.equipment ?? 'Use what the exercise calls for',
      reviewedOn: '2026-11-06',
      cards: [
        {
          id: 'sets',
          title: name,
          metric: target,
          body: target,
          illustration: 'workout',
        },
      ],
    },
    steps: [{ id: entry.exerciseId, title: name, cue: target, duration: target }],
  };
}

export function gymHabitCards(flow: GymFlow) {
  return flow.items.map(entry => gymHabitCard(flow, entry));
}

export function gymHabitFlow(flow: GymFlow): HabitFlow {
  const cards = gymHabitCards(flow);
  return {
    id: flow.id,
    title: flow.title,
    goal: 'Workout',
    description: flow.goal,
    area: 'Fitness',
    pathId: 'workout',
    level: flow.level,
    rhythm: flow.id.startsWith('cal-') ? 'One session at home' : 'One gym session',
    milestone: flow.id.startsWith('cal-')
      ? 'Finish the exercises and keep what you did.'
      : `Finish the ${cards.length} exercises and keep the weights you used.`,
    review: flow.id.startsWith('cal-')
      ? 'Next time, do a little more only when the last session felt easy.'
      : 'Next time, raise a weight only if every set reached the top of its range.',
    guidance:
      'A general gym session, not a personal programme. Choose loads you can control and leave room for recovery. Stop if a movement hurts.',
    sources: [
      {
        title: 'WHO: physical activity',
        url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
      },
    ],
    relatedFlowIds: cards.map(card => card.id),
    sessionGuide: {
      collection: flow.title,
      label: flow.level,
      format: `${cards.length} exercises`,
      equipment: flow.id.startsWith('cal-') ? 'A clear floor' : 'A gym',
      reviewedOn: '2026-11-06',
      cards: [
        {
          id: 'session',
          title: flow.title,
          metric: `${cards.length} exercises`,
          body: flow.goal,
          illustration: 'workout',
        },
      ],
    },
    steps: flow.items.map(entry => {
      const name = exercise(entry.exerciseId)?.name ?? entry.exerciseId;
      const target = gymTargetLabel(entry);
      return { id: entry.exerciseId, title: name, cue: target, duration: target };
    }),
  };
}

/** Only sessions that have exercises join the library. Empty shells stay in the catalogue. */
export const gymHabitFlows: HabitFlow[] = gymFlows.filter(flow => flow.items.length > 0).map(gymHabitFlow);
