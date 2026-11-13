import type { HabitFlow, MobileProfile } from './mobile';
import { habitDay } from './format';
export type TodayStep = {
  flowId: string;
  flowTitle: string;
  stepId: string;
  title: string;
  cue: string;
  duration: string;
  done: boolean;
};
export function todaySteps(
  flows: HabitFlow[],
  profile: MobileProfile,
  now = new Date(),
  timeZone = 'Asia/Kolkata',
): TodayStep[] {
  const day = habitDay(now, timeZone);
  const completed = new Set(profile.completed);
  return [...new Set(profile.flowIds)].flatMap(id => {
    const flow = flows.find(item => item.id === id);
    return flow
      ? flow.steps.map(step => ({
          flowId: flow.id,
          flowTitle: flow.title,
          stepId: `${flow.id}:${step.id}`,
          title: step.title,
          cue: step.cue,
          duration: step.duration,
          done: completed.has(`${day}:${flow.id}:${step.id}`),
        }))
      : [];
  });
}

export type TodayWorkout = {
  title: string;
  /** 1-based exercise on screen. */
  exercise: number;
  exerciseCount: number;
  timer: string;
};

export type TodayQuestion = {
  id: string;
  title: string;
  reason: string;
};

export type TodayEntry = {
  id: string;
  kind: 'flow' | 'item';
  title: string;
  detail: string;
  done: boolean;
  version?: number;
};

export type TodaySuggestion = {
  id: string;
  title: string;
  reason: string;
};

export type TodayStarter = {
  id: string;
  title: string;
  reason: string;
};

export type TodayFacts = {
  workout: TodayWorkout | null;
  /** The next unfinished first question. Null once those questions are finished. */
  question: TodayQuestion | null;
  /**
   * What is on today's Daily flow, in day order.
   * Null means there is no Daily flow yet. An empty list is a day with nothing on it.
   */
  today: TodayEntry[] | null;
  tomorrow: TodayEntry | null;
  /** A flow that would cover a missed area, with the reason in plain words. */
  missed: TodaySuggestion | null;
  starter: TodayStarter | null;
  doneSummary: string;
};

export type TodayChoice =
  | { rule: 'continue'; workout: TodayWorkout }
  | { rule: 'question'; question: TodayQuestion }
  | { rule: 'start'; entry: TodayEntry }
  | { rule: 'suggest'; suggestion: TodaySuggestion }
  | { rule: 'starter'; starter: TodayStarter | null }
  | { rule: 'done'; summary: string; tomorrow: TodayEntry | null };

/**
 * The one card for Home → Yours. The first matching rule wins.
 * A workout in progress, then an unfinished first question, then the next thing on today's
 * Daily flow (a flow before a lifestyle item), then a missed area when nothing is scheduled
 * today, then the starter when there is no Daily flow, then a finished day and tomorrow.
 */
export function chooseToday(facts: TodayFacts): TodayChoice {
  if (facts.workout) return { rule: 'continue', workout: facts.workout };
  if (facts.question) return { rule: 'question', question: facts.question };
  const pending = (facts.today ?? []).filter(entry => !entry.done);
  const next = pending.find(entry => entry.kind === 'flow') ?? pending[0] ?? null;
  if (facts.today && next) return { rule: 'start', entry: next };
  const nothingToday = facts.today == null || facts.today.length === 0;
  if (nothingToday && facts.missed) return { rule: 'suggest', suggestion: facts.missed };
  if (facts.today == null) return { rule: 'starter', starter: facts.starter };
  return { rule: 'done', summary: facts.doneSummary, tomorrow: facts.tomorrow };
}
