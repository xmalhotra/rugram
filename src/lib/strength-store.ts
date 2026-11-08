import 'server-only';
import { z } from 'zod';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';
import { readStrengthSets } from './exercise-log-store';
import { readFlowRuns } from './flow-run-store';
import {
  strengthPatterns,
  strengthProfile,
  type StrengthAnchor,
  type StrengthPattern,
} from '../../shared/strength';

export class StrengthError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const patternIds = strengthPatterns.map(item => item.id) as [StrengthPattern, ...StrengthPattern[]];

export const strengthActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('anchor'),
      pattern: z.enum(patternIds),
      weightKg: z.number().positive().max(500),
      reps: z.number().int().min(1).max(12),
    })
    .strict(),
  z.object({ action: z.literal('clear'), pattern: z.enum(patternIds) }).strict(),
]);
export type StrengthAction = z.infer<typeof strengthActionSchema>;

type StoredAnchor = StrengthAnchor & { userId: string };

declare global {
  var qramStrengthAnchors: StoredAnchor[] | undefined;
}

function demo() {
  return demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramStrengthAnchors ??= []);
}

function quarter(value: number) {
  return Math.round(value * 4) / 4;
}

async function readAnchors(user: PublicUser): Promise<StrengthAnchor[]> {
  if (demo())
    return memory()
      .filter(item => item.userId === user.id)
      .map(({ pattern, weightKg, reps, updatedAt }) => ({ pattern, weightKg, reps, updatedAt }));
  const { database } = await import('./database');
  const rows = await database()`SELECT pattern, weight_kg, reps, updated_at FROM strength_anchors WHERE user_id=${user.id}`;
  return rows
    .filter(row => patternIds.includes(String(row.pattern) as StrengthPattern))
    .map(row => ({
      pattern: String(row.pattern) as StrengthPattern,
      weightKg: Number(row.weight_kg),
      reps: Number(row.reps),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    }));
}

/** The member's anchors and the strength we estimate from them, their logged sets and their body weight. */
export async function readStrength(user: PublicUser, now = Date.now()) {
  const [anchors, sets, runs] = await Promise.all([readAnchors(user), readStrengthSets(user, undefined, now), readFlowRuns(user)]);
  const metrics = runs.metrics;
  return {
    anchors,
    profile: strengthProfile({
      anchors,
      sets,
      bodyWeightKg: metrics?.weightKg ?? null,
      lifestyle: metrics?.lifestyle ?? null,
      now,
    }),
  };
}

export async function changeStrength(user: PublicUser, action: StrengthAction, now = Date.now()) {
  const at = new Date(now).toISOString();
  if (demo()) {
    const list = memory();
    const index = list.findIndex(item => item.userId === user.id && item.pattern === action.pattern);
    if (index >= 0) list.splice(index, 1);
    if (action.action === 'anchor')
      list.push({ userId: user.id, pattern: action.pattern, weightKg: quarter(action.weightKg), reps: action.reps, updatedAt: at });
  } else {
    const { database } = await import('./database');
    const sql = database();
    if (action.action === 'anchor')
      await sql`INSERT INTO strength_anchors(user_id, pattern, weight_kg, reps, updated_at)
        VALUES(${user.id}, ${action.pattern}, ${quarter(action.weightKg)}, ${action.reps}, ${at})
        ON CONFLICT (user_id, pattern) DO UPDATE SET weight_kg=EXCLUDED.weight_kg, reps=EXCLUDED.reps, updated_at=EXCLUDED.updated_at`;
    else await sql`DELETE FROM strength_anchors WHERE user_id=${user.id} AND pattern=${action.pattern}`;
  }
  return readStrength(user, now);
}
