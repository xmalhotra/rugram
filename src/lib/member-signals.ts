/**
 * Deadlift, squat, bench, body weight and lifestyle, from the same rows the strength profile reads.
 * Demo tests and the Postgres path both come through here. Database is imported only when this
 * is not a demo, so a demo test can load the module without a database.
 */
import type { Lifestyle } from '../../shared/flow-benchmarks';

export type MemberSignals = {
  lifts: { deadliftKg?: number; squatKg?: number; benchKg?: number };
  bodyKg?: number;
  lifestyle?: Lifestyle;
};

const lifestyles = ['sedentary', 'light', 'active', 'athlete'] as const;

function asLifestyle(value: unknown): Lifestyle | undefined {
  return lifestyles.includes(value as Lifestyle) ? (value as Lifestyle) : undefined;
}

function liftWeight(anchors: { pattern: string; weightKg: number }[], pattern: string) {
  const found = anchors.find(item => item.pattern === pattern && item.weightKg > 0);
  return found ? found.weightKg : undefined;
}

/**
 * Null when none of those are known, so a caller can fall back to the set span.
 */
export async function memberSignals(userId: string, useDemo: boolean): Promise<MemberSignals | null> {
  let anchors: { pattern: string; weightKg: number }[] = [];
  let body: { weightKg: number; lifestyle?: Lifestyle } | null = null;
  if (useDemo) {
    const anchorRows =
      (globalThis as { qramStrengthAnchors?: { userId: string; pattern: string; weightKg: number }[] }).qramStrengthAnchors ?? [];
    anchors = anchorRows.filter(row => row.userId === userId).map(row => ({ pattern: String(row.pattern), weightKg: Number(row.weightKg) }));
    const bodyRows = (globalThis as { qramStrengthBody?: { userId: string; weightKg: number; lifestyle: string }[] }).qramStrengthBody ?? [];
    const given = bodyRows.find(row => row.userId === userId);
    const metrics = (globalThis as { qramFlowRuns?: { metrics: { userId: string; weightKg: number; lifestyle: string }[] } }).qramFlowRuns?.metrics.find(
      row => row.userId === userId,
    );
    const source = given ?? metrics ?? null;
    if (source) body = { weightKg: Number(source.weightKg), lifestyle: asLifestyle(source.lifestyle) };
  } else {
    const { database } = await import('./database');
    const sql = database();
    const [anchorRows, bodyRows, metricRows] = await Promise.all([
      sql`SELECT pattern, weight_kg FROM strength_anchors WHERE user_id=${userId}`,
      sql`SELECT weight_kg, lifestyle FROM strength_body WHERE user_id=${userId}`,
      sql`SELECT weight_kg, lifestyle FROM user_metrics WHERE user_id=${userId}`,
    ]);
    anchors = (anchorRows as Record<string, unknown>[]).map(row => ({ pattern: String(row.pattern), weightKg: Number(row.weight_kg) }));
    const given = (bodyRows as Record<string, unknown>[])[0];
    const metrics = (metricRows as Record<string, unknown>[])[0];
    const source = given ?? metrics;
    if (source) body = { weightKg: Number(source.weight_kg), lifestyle: asLifestyle(source.lifestyle) };
  }
  const lifts = {
    deadliftKg: liftWeight(anchors, 'hinge'),
    squatKg: liftWeight(anchors, 'squat'),
    benchKg: liftWeight(anchors, 'press'),
  };
  const lifestyle = body?.lifestyle;
  if (lifts.deadliftKg == null && lifts.squatKg == null && lifts.benchKg == null && !lifestyle) return null;
  return { lifts, bodyKg: body && body.weightKg > 0 ? body.weightKg : undefined, lifestyle };
}
