/**
 * Personal metrics: the few numbers that make each kind of flow fit a member, one category at a time.
 * Every metric is optional and asked only for the categories a member uses; logs keep them current where
 * they can. Strength lifts and body weight live in the strength store (shared/strength.ts); everything
 * else is here. Each metric names its category, says why it's asked, and validates its own value.
 */
import { z } from 'zod';

export const personalCategories = [
  { id: 'gym', title: 'Gym' },
  { id: 'running', title: 'Running and endurance' },
  { id: 'calisthenics', title: 'Calisthenics and home' },
  { id: 'crossfit', title: 'CrossFit' },
] as const;
export type PersonalCategory = (typeof personalCategories)[number]['id'];

const runSchema = z
  .object({
    distanceM: z.number().min(1500).max(42195),
    seconds: z.number().int().min(210).max(5 * 3600),
  })
  .strict();

export const personalMetricSchemas = {
  /** A recent hard run (a race or time trial): paces for every running and endurance flow. */
  'run.recent': runSchema,
  /** Roughly how far they run each week, in km: how big a plan to start with. */
  'run.weekly': z.object({ km: z.number().min(0).max(250) }).strict(),
  /** A 400 m swim time: swim pace for triathlon flows. */
  'swim.400': z.object({ seconds: z.number().int().min(180).max(1800) }).strict(),
} as const;

export type PersonalMetricKey = keyof typeof personalMetricSchemas;
export type PersonalMetricValue<K extends PersonalMetricKey> = z.infer<(typeof personalMetricSchemas)[K]>;
export type PersonalMetrics = { [K in PersonalMetricKey]?: PersonalMetricValue<K> & { updatedAt: string } };

export const personalMetricInfo: Record<PersonalMetricKey, { category: PersonalCategory; question: string; essential: boolean }> = {
  'run.recent': { category: 'running', question: 'A recent run you went hard on: distance and time', essential: true },
  'run.weekly': { category: 'running', question: 'About how many km you run in a week', essential: false },
  'swim.400': { category: 'running', question: 'Your 400 m swim time (for triathlon)', essential: false },
};

export const personalMetricKeys = Object.keys(personalMetricSchemas) as [PersonalMetricKey, ...PersonalMetricKey[]];

/** A value checked against its own schema, or a reason it can't be saved. */
export function checkMetric(key: PersonalMetricKey, value: unknown) {
  const parsed = personalMetricSchemas[key].safeParse(value);
  return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const };
}
