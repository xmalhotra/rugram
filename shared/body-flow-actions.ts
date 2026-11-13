import { exercise } from './exercises';
import { exerciseJoints, type Joint } from './joint-map';
import { exerciseMuscles, type MuscleArea } from './muscle-map';

export type BodyTarget = { kind: 'joint'; id: Joint } | { kind: 'area'; id: MuscleArea };

export type TargetExercise = {
  id: string;
  name: string;
  /** Joints have no helper tag, so every joint exercise is `main`. */
  role: 'main' | 'helper';
};

export type CoverageSource = {
  kind: 'flow' | 'session';
  id: string;
  title: string;
  exerciseIds: readonly string[];
};

export type CoverageRank = {
  kind: 'flow' | 'session';
  id: string;
  title: string;
  hits: number;
  total: number;
};

function named(id: string, role: TargetExercise['role']): TargetExercise {
  return { id, name: exercise(id)?.name ?? id, role };
}

/**
 * Exercises that work a joint or a muscle area.
 * Mains come before helpers. Within a role, ids in `ready` (a how-to loop and an icon) come first, then name.
 */
export function exercisesForTarget(target: BodyTarget, ready: ReadonlySet<string> = new Set()): TargetExercise[] {
  const rows: TargetExercise[] = [];
  if (target.kind === 'joint') {
    for (const [id, joints] of Object.entries(exerciseJoints)) {
      if (joints.includes(target.id)) rows.push(named(id, 'main'));
    }
  } else {
    for (const [id, tag] of Object.entries(exerciseMuscles)) {
      if (tag.main.includes(target.id)) rows.push(named(id, 'main'));
      else if (tag.helpers.includes(target.id)) rows.push(named(id, 'helper'));
    }
  }
  rows.sort((a, b) => {
    const role = Number(a.role === 'helper') - Number(b.role === 'helper');
    if (role) return role;
    const media = Number(!ready.has(a.id)) - Number(!ready.has(b.id));
    if (media) return media;
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
  return rows;
}

/** Flows and sessions that contain at least one of the target's exercises: the most focused first (share of
 * exercises that hit), then the most hits, so a short flow all about ankles beats a long one with a little. */
export function coverageForTarget(target: BodyTarget, sources: readonly CoverageSource[]): CoverageRank[] {
  const hitting = new Set(exercisesForTarget(target).map(item => item.id));
  const ranked: CoverageRank[] = [];
  for (const source of sources) {
    const unique = [...new Set(source.exerciseIds)];
    if (!unique.length) continue;
    const hits = unique.filter(id => hitting.has(id)).length;
    if (!hits) continue;
    ranked.push({ kind: source.kind, id: source.id, title: source.title, hits, total: unique.length });
  }
  ranked.sort((a, b) => b.hits / b.total - a.hits / a.total || b.hits - a.hits || a.title.localeCompare(b.title) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  return ranked;
}
