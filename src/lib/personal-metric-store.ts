import { z } from 'zod';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';
import { checkMetric, personalMetricKeys, type PersonalMetrics } from '../../shared/personal-metrics';

export class PersonalMetricError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const personalMetricActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set'), metric: z.enum(personalMetricKeys), value: z.unknown() }).strict(),
  z.object({ action: z.literal('clear'), metric: z.enum(personalMetricKeys) }).strict(),
]);
export type PersonalMetricAction = z.infer<typeof personalMetricActionSchema>;

type Stored = { userId: string; metric: string; value: Record<string, unknown>; updatedAt: string };

declare global {
  var qramPersonalMetrics: Stored[] | undefined;
}

function demo() {
  return demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramPersonalMetrics ??= []);
}

/** Every metric the member has given, each with when it was last set. Private. */
export async function readPersonalMetrics(user: PublicUser): Promise<PersonalMetrics> {
  const rows = demo()
    ? memory().filter(row => row.userId === user.id)
    : (
        await (await import('./database')).database()`SELECT metric, value, updated_at FROM personal_metrics WHERE user_id=${user.id}`
      ).map(row => ({
        userId: user.id,
        metric: String(row.metric),
        value: (row.value ?? {}) as Record<string, unknown>,
        updatedAt: new Date(String(row.updated_at)).toISOString(),
      }));
  const metrics: Record<string, unknown> = {};
  for (const row of rows) {
    // A metric whose shape changed since it was saved is left out rather than trusted.
    if (!personalMetricKeys.includes(row.metric as (typeof personalMetricKeys)[number])) continue;
    const checked = checkMetric(row.metric as (typeof personalMetricKeys)[number], row.value);
    if (checked.ok) metrics[row.metric] = { ...checked.value, updatedAt: row.updatedAt };
  }
  return metrics as PersonalMetrics;
}

export async function changePersonalMetric(user: PublicUser, action: PersonalMetricAction, now = Date.now()) {
  const at = new Date(now).toISOString();
  let value: Record<string, unknown> | null = null;
  if (action.action === 'set') {
    const checked = checkMetric(action.metric, action.value);
    if (!checked.ok) throw new PersonalMetricError('Check that number and try again.');
    value = checked.value as Record<string, unknown>;
  }
  if (demo()) {
    const list = memory().filter(row => !(row.userId === user.id && row.metric === action.metric));
    if (value) list.push({ userId: user.id, metric: action.metric, value, updatedAt: at });
    globalThis.qramPersonalMetrics = list;
  } else {
    const sql = (await import('./database')).database();
    if (value)
      await sql`INSERT INTO personal_metrics(user_id, metric, value, updated_at) VALUES(${user.id}, ${action.metric}, ${JSON.stringify(value)}::jsonb, ${at})
        ON CONFLICT (user_id, metric) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at`;
    else await sql`DELETE FROM personal_metrics WHERE user_id=${user.id} AND metric=${action.metric}`;
  }
  return readPersonalMetrics(user);
}
