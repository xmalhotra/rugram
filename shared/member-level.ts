/**
 * One member level, used everywhere else.
 *
 * Catalogue (`memberLevel`): Beginner, Intermediate, Advanced.
 * A run starts at `runLevelFor`: Beginner stays Beginner, Intermediate is Regular,
 * Advanced is Trained. A level the member picks by hand for that flow is remembered
 * and wins over this.
 * Body flow bands use `focusLevelFor`: Beginner stays beginner, Intermediate and
 * Advanced are regular.
 * Two graduated flows lift that result by one level. The lift is a floor: a
 * stronger signal stays, and a quieter one cannot pull it back down.
 */
import type { Lifestyle, RunLevel } from './flow-benchmarks';
import type { FlowLevel } from './flow-defaults';
import type { FocusLevel } from './focus-targets';

/** Squat and bench as a share of the deadlift. OpenPowerlifting medians, see docs/strength-estimates.md. */
export const squatOfDeadlift = 0.85;
export const benchOfDeadlift = 0.53;

export type MemberLevelInput = {
  loggedWeeks: number;
  lifts: { deadliftKg?: number; squatKg?: number; benchKg?: number };
  bodyKg?: number;
  lifestyle?: Lifestyle;
  /** Flows this member has already outgrown. Two of them lift the floor one level. */
  graduatedFlows?: number;
};

const levelOrder: FlowLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

function graduationSteps(count: number | undefined) {
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 2) return 0;
  return Math.floor(count / 2);
}

function graduationReason(steps: number) {
  const flows = steps * 2;
  return flows === 2 ? 'Two flows graduated' : `${flows} flows graduated`;
}

export function memberLevel(input: MemberLevelInput): { level: FlowLevel; reason: string } {
  const base = baseLevel(input);
  const steps = graduationSteps(input.graduatedFlows);
  if (!steps) return base;
  const lifted = levelOrder[Math.min(levelOrder.length - 1, levelOrder.indexOf(base.level) + steps)];
  if (!lifted || lifted === base.level) return base;
  return { level: lifted, reason: graduationReason(steps) };
}

/**
 * Strongest signal first. More than 8 logged weeks is a floor of Intermediate:
 * a deadlift of 2× body weight can still raise that to Advanced, and a weaker
 * lift or a quiet lifestyle cannot pull it back down. With no deadlift, squat
 * and bench are converted (0.85 and 0.53) and the stronger one is used.
 * Graduation is applied afterwards, so it can only raise this.
 */
function baseLevel(input: MemberLevelInput): { level: FlowLevel; reason: string } {
  const lift = liftSignal(input);
  const fromLift = lift ? levelFromRatio(lift.ratio) : null;
  if (fromLift === 'Advanced' && lift) return { level: 'Advanced', reason: liftReason(lift.source, 'Advanced') };
  if (input.loggedWeeks > 8) return { level: 'Intermediate', reason: 'More than 8 weeks of training' };
  if (fromLift === 'Intermediate' && lift) return { level: 'Intermediate', reason: liftReason(lift.source, 'Intermediate') };
  if (input.lifestyle === 'sedentary') return { level: 'Beginner', reason: 'Mostly sitting' };
  if (input.lifestyle === 'light') return { level: 'Beginner', reason: 'Lightly active' };
  return { level: 'Beginner', reason: 'Starting out' };
}

/** The run screen's level for a catalogue level. */
export function runLevelFor(level: FlowLevel): RunLevel {
  if (level === 'Beginner') return 'Beginner';
  if (level === 'Advanced') return 'Trained';
  return 'Regular';
}

/** Body flow's band for a catalogue level. Intermediate and Advanced share regular. */
export function focusLevelFor(level: FlowLevel): FocusLevel {
  return level === 'Beginner' ? 'beginner' : 'regular';
}

type LiftSource = 'deadlift' | 'squat' | 'bench';

function liftSignal(input: MemberLevelInput): { ratio: number; source: LiftSource } | null {
  const body = input.bodyKg;
  if (!(typeof body === 'number' && body > 0)) return null;
  const { deadliftKg, squatKg, benchKg } = input.lifts;
  if (typeof deadliftKg === 'number' && deadliftKg > 0) return { ratio: deadliftKg / body, source: 'deadlift' };
  const options: { ratio: number; source: LiftSource }[] = [];
  if (typeof squatKg === 'number' && squatKg > 0) options.push({ ratio: squatKg / squatOfDeadlift / body, source: 'squat' });
  if (typeof benchKg === 'number' && benchKg > 0) options.push({ ratio: benchKg / benchOfDeadlift / body, source: 'bench' });
  if (!options.length) return null;
  return options.reduce((best, item) => (item.ratio > best.ratio ? item : best));
}

function levelFromRatio(ratio: number): FlowLevel | null {
  if (ratio >= 2 - 1e-6) return 'Advanced';
  if (ratio >= 1.5 - 1e-6) return 'Intermediate';
  return null;
}

function liftReason(source: LiftSource, level: 'Intermediate' | 'Advanced') {
  const multiple = level === 'Advanced' ? '2×' : '1.5×';
  if (source === 'deadlift') return `Deadlift is ${multiple} body weight`;
  const name = source === 'squat' ? 'Squat' : 'Bench';
  return `${name} works out to a deadlift of ${multiple} body weight`;
}
