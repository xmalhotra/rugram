import type { CatalogFlow } from './flow-catalog';

export type Lifestyle = 'sedentary' | 'light' | 'active' | 'athlete';
export type RunLevel = 'Beginner' | 'Regular' | 'Trained';
export type UserMetrics = { birthYear: number; weightKg: number; lifestyle: Lifestyle };

export type CardBenchmark = { seconds: number; reps?: number; loadPerKg?: number };
export type ResolvedBenchmark = CardBenchmark & { authored: boolean };

/**
 * Authored targets, keyed by flow id. Empty until a flow is written with its own numbers.
 * A card entry lists every level; missing flows fall back to the card's duration.
 */
export const flowBenchmarks: Record<
  string,
  {
    restSeconds?: Record<RunLevel, number>;
    cards: Record<string, Record<RunLevel, CardBenchmark>>;
  }
> = {};

const levelOrder: RunLevel[] = ['Beginner', 'Regular', 'Trained'];
const scale: Record<RunLevel, number> = { Beginner: 1.25, Regular: 1, Trained: 0.8 };

/** Mostly sitting and lightly active start at Beginner. Active is Regular. Athlete is Trained. */
const lifestyleLevel: Record<Lifestyle, RunLevel> = {
  sedentary: 'Beginner',
  light: 'Beginner',
  active: 'Regular',
  athlete: 'Trained',
};

const durationPattern = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/i;

function durationSeconds(value: string) {
  const match = durationPattern.exec(value);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const unit = match[2].toLowerCase();
  const seconds = unit.startsWith('h') ? amount * 3600 : unit.startsWith('m') ? amount * 60 : amount;
  return Math.round(seconds);
}

function fallbackSeconds(card: unknown) {
  if (!card || typeof card !== 'object') return null;
  const record = card as Record<string, unknown>;
  if (typeof record.duration === 'string') {
    const parsed = durationSeconds(record.duration);
    if (parsed != null) return parsed;
  }
  if (!Array.isArray(record.steps)) return null;
  for (const step of record.steps) {
    if (!step || typeof step !== 'object') continue;
    const duration = (step as Record<string, unknown>).duration;
    if (typeof duration !== 'string') continue;
    const parsed = durationSeconds(duration);
    if (parsed != null) return parsed;
  }
  return null;
}

/** Year of birth only: someone born 50 years before `now` steps down one level. */
export function startingLevel(metrics: UserMetrics, now: number): RunLevel {
  let level = lifestyleLevel[metrics.lifestyle];
  const age = new Date(now).getFullYear() - metrics.birthYear;
  if (age >= 50) level = levelOrder[Math.max(0, levelOrder.indexOf(level) - 1)];
  return level;
}

export function benchmarkFor(
  flowId: string,
  cardId: string,
  level: RunLevel,
  card?: unknown,
): ResolvedBenchmark {
  const authored = flowBenchmarks[flowId]?.cards[cardId]?.[level];
  if (authored) return { ...authored, authored: true };
  const base = fallbackSeconds(card) ?? 60;
  return { seconds: Math.max(1, Math.round(base * scale[level])), authored: false };
}

/** Where body weight is used: kilograms of load, to the nearest 0.5. */
export function targetLoadKg(benchmark: CardBenchmark, metrics: UserMetrics) {
  if (benchmark.loadPerKg == null) return null;
  return Math.round(benchmark.loadPerKg * metrics.weightKg * 2) / 2;
}

export function defaultRest(level: RunLevel) {
  if (level === 'Beginner') return 60;
  if (level === 'Regular') return 45;
  return 30;
}

export function restFor(flowId: string, level: RunLevel) {
  return flowBenchmarks[flowId]?.restSeconds?.[level] ?? defaultRest(level);
}

/**
 * The next catalog entry when this run was faster than its benchmark and that
 * entry is live. Coming-soon links stay dormant.
 */
export function nextFlowSuggestion(
  flowId: string,
  totalSeconds: number,
  benchmarkSeconds: number,
  catalog: readonly CatalogFlow[],
): CatalogFlow | null {
  if (!(totalSeconds < benchmarkSeconds)) return null;
  const entry = catalog.find(item => item.id === flowId || item.flowId === flowId);
  if (!entry?.next?.length) return null;
  for (const id of entry.next) {
    const next = catalog.find(item => item.id === id);
    if (next?.status === 'live') return next;
  }
  return null;
}
