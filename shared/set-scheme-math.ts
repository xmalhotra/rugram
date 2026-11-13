import { z } from 'zod';
import type { SetTarget } from './gym-flows';
import { setSchemes as seededSchemeData } from './set-schemes-data';

export type SetScheme = {
  id: string;
  title: string;
  /** One plain sentence, shown to members. */
  about: string;
  /** What happens to reps or seconds across sets, inside the target's min and max. */
  amount: 'hold' | 'down' | 'up';
  /** What happens to weight, using the equipment step. On an assisted machine, up is less on the stack. */
  load: 'hold' | 'up' | 'down';
  /** Multiples of the step per set. Defaults to 1. */
  loadSteps?: number;
  /** The final set has no number target. */
  lastSetToFailure?: boolean;
};

export type SchemeItem = {
  sets: number;
  repsMin: number;
  repsMax: number;
  target?: SetTarget;
};

const setSchemes: SetScheme[] = seededSchemeData;

let registeredSchemes: SetScheme[] = [];

/** Replace the schemes loaded from the server. An empty list leaves the seeded patterns. */
export function registerSchemes(list: SetScheme[]) {
  registeredSchemes = list.map(scheme => parseScheme(scheme));
}

const schemeSchema = z
  .object({
    id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,78}$/),
    title: z.string().trim().min(1).max(80),
    about: z.string().trim().min(1).max(200),
    amount: z.enum(['hold', 'down', 'up']),
    load: z.enum(['hold', 'up', 'down']),
    loadSteps: z.number().int().min(1).max(20).optional(),
    lastSetToFailure: z.boolean().optional(),
  })
  .strict();

export function parseScheme(input: unknown): SetScheme {
  const parsed = schemeSchema.safeParse(input);
  if (!parsed.success) throw new Error('Check the set scheme and try again.');
  return parsed.data;
}

/** Registered schemes, then the seeded ones. A missing or unknown id uses the pattern that holds reps and weight. */
export function schemeById(id?: string | null, extra: SetScheme[] = []): SetScheme {
  const found = id ? [...extra, ...registeredSchemes, ...setSchemes].find(scheme => scheme.id === id) : undefined;
  if (found) return found;
  return (
    setSchemes.find(scheme => scheme.amount === 'hold' && scheme.load === 'hold' && !scheme.lastSetToFailure) ??
    setSchemes[0]
  );
}

export function seededSchemes() {
  return setSchemes;
}

export function targetOf(item: SchemeItem): SetTarget {
  return item.target ?? { kind: 'reps', min: item.repsMin, max: item.repsMax };
}

function roundReps(value: number) {
  return Math.round(value);
}

/** Nearest 5 seconds. A tie, such as 52.5, goes to the lower 5. */
function roundSeconds(value: number) {
  const scaled = value / 5;
  const lower = Math.floor(scaled + 1e-9);
  const fraction = scaled - lower;
  if (fraction > 0.5 + 1e-9) return (lower + 1) * 5;
  return lower * 5;
}

export function measureOf(target: SetTarget): 'reps' | 'hold' {
  if (target.kind === 'hold') return 'hold';
  if (target.kind === 'max') return target.measure === 'hold' ? 'hold' : 'reps';
  return 'reps';
}

/** Reps or seconds for each set. A fixed target stays put. A max target stays empty. */
export function spreadAmounts(scheme: SetScheme, target: SetTarget, sets: number): (number | null)[] {
  if (target.kind === 'max' || sets < 1) return Array.from({ length: Math.max(0, sets) }, () => null);
  const min = target.kind === 'hold' ? target.minSeconds : target.min;
  const max = target.kind === 'hold' ? target.maxSeconds : target.max;
  const round = target.kind === 'hold' ? roundSeconds : roundReps;
  const start = scheme.amount === 'up' ? min : max;
  const end = scheme.amount === 'up' ? max : scheme.amount === 'down' ? min : max;
  return Array.from({ length: sets }, (_, index) => {
    if (scheme.lastSetToFailure && index === sets - 1) return null;
    if (sets === 1 || scheme.amount === 'hold' || min === max) return start;
    if (index === 0) return start;
    if (index === sets - 1) return end;
    const raw = start + ((end - start) * index) / (sets - 1);
    return round(raw);
  });
}

/** "3 sets: 12, 11, 10" when the numbers actually change. Otherwise nothing. */
export function amountListLabel(count: number, amounts: (number | null)[], suffix = ''): string | null {
  if (count < 2 || amounts.length !== count) return null;
  if (amounts.every(value => value == null)) return null;
  const numbers = amounts.filter((value): value is number => value != null);
  if (amounts.every(value => value != null) && numbers.every(value => value === numbers[0])) return null;
  const body = amounts.map(value => (value == null ? 'max' : String(value))).join(', ');
  return `${count} sets: ${body}${suffix}`;
}
