import { z } from 'zod';
import { exercise } from './exercises';
import { catalogTile } from './flow-catalog';
import { flows } from './mobile';
import { nextSetWeight, type LoggedSet } from './progression';
import { planWithScheme } from './set-schemes';
import { amountListLabel, schemeById, seededSchemes, spreadAmounts, type SchemeItem, type SetScheme } from './set-scheme-math';

export const inputKinds = ['number', 'duration', 'distance', 'rating', 'check'] as const;
export type InputKind = (typeof inputKinds)[number];

export type Field = {
  key: string;
  label: string;
  input: InputKind;
  unit?: string;
  required: boolean;
};

export type TrainingType = {
  id: string;
  title: string;
  about: string;
  iconKey: string;
  blockFields: Field[];
  sessionFields: Field[];
  canPost: boolean;
  usesExerciseRecords: boolean;
  status: 'draft' | 'live';
};

export type Target = { min?: number; max?: number; isMax?: boolean };

export type SessionBlock = {
  id: string;
  label?: string;
  exerciseId?: string;
  sets: number;
  restSeconds?: number;
  targets?: Record<string, Target>;
  /** How reps and weight change across the sets. Missing means they stay put. */
  scheme?: string;
};

export type TrainingSession = {
  id: string;
  typeId: string;
  title: string;
  goal: string;
  level?: string;
  note?: string;
  /** Catalog tiles where this session can be found on its own. */
  catalogTiles?: string[];
  blocks: SessionBlock[];
  status: 'draft' | 'live';
};

export type PlanItem =
  | { kind: 'session'; id: string; optional?: boolean }
  | { kind: 'flow'; id: string; optional?: boolean }
  | { kind: 'rest'; label?: string };

export type PlanSlot = { week: number; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; items: PlanItem[] };

export type TrainingPlan = {
  id: string;
  title: string;
  goal: string;
  level?: string;
  weeks: number;
  slots: PlanSlot[];
  status: 'draft' | 'live';
};

export type LogValue = number | boolean;

export class TrainingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = 'TrainingError';
  }
}

const slug = z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,78}$/);
const weekdaySchema = z.number().int().min(1).max(7);

const fieldSchema = z
  .object({
    key: z.string().trim().regex(/^[a-z][a-z0-9-]{0,30}$/),
    label: z.string().trim().min(1).max(40),
    input: z.enum(inputKinds),
    unit: z.string().trim().min(1).max(16).optional(),
    required: z.boolean(),
  })
  .strict();

const targetSchema = z
  .object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    isMax: z.boolean().optional(),
  })
  .strict();

const typeSchema = z
  .object({
    id: slug,
    title: z.string().trim().min(1).max(80),
    about: z.string().trim().min(1).max(400),
    iconKey: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,30}$/),
    blockFields: z.array(fieldSchema).max(8),
    sessionFields: z.array(fieldSchema).max(6),
    canPost: z.boolean(),
    usesExerciseRecords: z.boolean(),
    status: z.enum(['draft', 'live']),
  })
  .strict();

const blockSchema = z
  .object({
    id: slug,
    label: z.string().trim().min(1).max(60).optional(),
    exerciseId: slug.optional(),
    sets: z.number().int().min(1).max(30),
    restSeconds: z.number().int().min(0).max(900).optional(),
    targets: z.record(z.string(), targetSchema).optional(),
    scheme: slug.optional(),
  })
  .strict();

const sessionSchema = z
  .object({
    id: slug,
    typeId: slug,
    title: z.string().trim().min(1).max(80),
    goal: z.string().trim().min(1).max(240),
    level: z.string().trim().min(1).max(40).optional(),
    note: z.string().trim().min(1).max(400).optional(),
    catalogTiles: z.array(slug).max(8).optional(),
    blocks: z.array(blockSchema).min(1).max(20),
    status: z.enum(['draft', 'live']),
  })
  .strict();

const planItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('session'), id: slug, optional: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal('flow'), id: slug, optional: z.boolean().optional() }).strict(),
  z.object({ kind: z.literal('rest'), label: z.string().trim().min(1).max(40).optional() }).strict(),
]);

const planSchema = z
  .object({
    id: slug,
    title: z.string().trim().min(1).max(80),
    goal: z.string().trim().min(1).max(240),
    level: z.string().trim().min(1).max(40).optional(),
    weeks: z.number().int().min(1).max(52),
    slots: z
      .array(
        z
          .object({
            week: z.number().int().min(1),
            weekday: weekdaySchema,
            items: z.array(planItemSchema).min(1).max(8),
          })
          .strict(),
      )
      .max(366),
    status: z.enum(['draft', 'live']),
  })
  .strict();

function issues(error: z.ZodError) {
  return error.issues
    .map(issue => `${issue.path.join('.') || 'value'}: ${issue.message}`)
    .join('; ')
    .slice(0, 480);
}

function read<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new TrainingError(issues(parsed.error));
  return parsed.data;
}

function uniqueKeys(fields: Field[]) {
  const keys = fields.map(field => field.key);
  if (new Set(keys).size !== keys.length) throw new TrainingError('Each field needs its own key.');
}

function checkTarget(field: Field, target: Target) {
  if (field.input === 'check') throw new TrainingError(`${field.label} does not take a target.`);
  if (target.isMax && target.min == null && target.max == null) return;
  if (target.min == null && target.max == null) throw new TrainingError(`${field.label} needs a target.`);
  if (target.min != null && target.max != null && target.min > target.max)
    throw new TrainingError(`${field.label} has a range that runs backwards.`);
  const values = [target.min, target.max].filter((value): value is number => value != null);
  if (field.input === 'duration' || field.input === 'rating') {
    if (values.some(value => !Number.isInteger(value))) throw new TrainingError(`${field.label} uses whole numbers.`);
  }
  if (field.input === 'rating' && values.some(value => value < 1 || value > 10))
    throw new TrainingError(`${field.label} stays between 1 and 10.`);
  if ((field.input === 'number' || field.input === 'duration' || field.input === 'distance') && values.some(value => value < 0))
    throw new TrainingError(`${field.label} cannot be negative.`);
}

export function parseTrainingType(input: unknown): TrainingType {
  const type = read(typeSchema, input);
  uniqueKeys([...type.blockFields, ...type.sessionFields]);
  if (!type.blockFields.length && !type.sessionFields.length) throw new TrainingError('Add at least one field.');
  return type;
}

export function parseSession(input: unknown, types: TrainingType[], schemes: Pick<SetScheme, 'id'>[] = seededSchemes()): TrainingSession {
  const session = read(sessionSchema, input);
  const type = types.find(item => item.id === session.typeId);
  if (!type) throw new TrainingError('Unknown training type.');
  if (session.catalogTiles && new Set(session.catalogTiles).size !== session.catalogTiles.length)
    throw new TrainingError('Each catalog tile is listed once.');
  if (session.catalogTiles?.some(id => !catalogTile(id))) throw new TrainingError('Unknown catalog tile.');
  const blockIds = session.blocks.map(block => block.id);
  if (new Set(blockIds).size !== blockIds.length) throw new TrainingError('Each block needs its own id.');
  for (const block of session.blocks) {
    if (block.exerciseId && !exercise(block.exerciseId)) throw new TrainingError('Unknown exercise.');
    if (block.scheme && !schemes.some(scheme => scheme.id === block.scheme)) throw new TrainingError('Unknown set scheme.');
    for (const [key, target] of Object.entries(block.targets ?? {})) {
      const field = type.blockFields.find(item => item.key === key);
      if (!field) throw new TrainingError(`Unknown target ${key}.`);
      checkTarget(field, target);
    }
  }
  return session;
}

export type PlanCatalog = {
  sessions: Pick<TrainingSession, 'id' | 'status' | 'typeId'>[];
  types: Pick<TrainingType, 'id' | 'status'>[];
  flowIds?: Iterable<string>;
};

export function knownFlowIds() {
  return new Set(flows.map(flow => flow.id));
}

function flowSet(catalog: PlanCatalog) {
  return new Set(catalog.flowIds ?? knownFlowIds());
}

export function parsePlanItems(input: unknown, catalog: PlanCatalog): PlanItem[] {
  const items = read(z.array(planItemSchema).max(8), input);
  const seen = new Set<string>();
  for (const item of items) {
    if (item.kind === 'rest') continue;
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) throw new TrainingError('That day lists the same thing twice.');
    seen.add(key);
    if (item.kind === 'session' && !catalog.sessions.some(session => session.id === item.id))
      throw new TrainingError('Unknown session.');
    if (item.kind === 'flow' && !flowSet(catalog).has(item.id)) throw new TrainingError('Unknown flow.');
  }
  return items;
}

export function parsePlan(input: unknown, catalog: PlanCatalog): TrainingPlan {
  const plan = read(planSchema, input);
  const seen = new Set<string>();
  for (const slot of plan.slots) {
    if (slot.week > plan.weeks) throw new TrainingError('That week is outside this plan.');
    const key = `${slot.week}:${slot.weekday}`;
    if (seen.has(key)) throw new TrainingError('Each day is listed once.');
    seen.add(key);
    parsePlanItems(slot.items, catalog);
  }
  return { ...plan, slots: plan.slots.map(slot => ({ ...slot, weekday: slot.weekday as PlanSlot['weekday'] })) };
}

/** A live plan can only point at live sessions whose types are live. */
export function liveProblems(
  kind: 'type' | 'session' | 'plan',
  id: string,
  catalog: { types: TrainingType[]; sessions: TrainingSession[]; plans: TrainingPlan[] },
) {
  if (kind === 'session') {
    const session = catalog.sessions.find(item => item.id === id);
    if (!session) return 'Unknown session.';
    const type = catalog.types.find(item => item.id === session.typeId);
    if (!type || type.status !== 'live') return 'Publish the training type first.';
  }
  if (kind === 'plan') {
    const plan = catalog.plans.find(item => item.id === id);
    if (!plan) return 'Unknown plan.';
    for (const slot of plan.slots) {
      for (const item of slot.items) {
        if (item.kind !== 'session') continue;
        const session = catalog.sessions.find(row => row.id === item.id);
        if (!session || session.status !== 'live') return 'Publish every session in the plan first.';
        const type = catalog.types.find(row => row.id === session.typeId);
        if (!type || type.status !== 'live') return 'Publish every training type in the plan first.';
      }
    }
  }
  return null;
}

export function fieldRole(field: Field): 'weight' | 'reps' | 'seconds' | 'other' {
  if (field.input === 'duration') return 'seconds';
  if (field.input === 'number' && field.unit === 'kg') return 'weight';
  if (field.input === 'number' && (field.unit === 'reps' || field.unit == null)) return 'reps';
  return 'other';
}

/** Weight is part of a loaded exercise. A bodyweight exercise records the other fields. */
export function blockFields(type: TrainingType, block: Pick<SessionBlock, 'exerciseId'>): Field[] {
  const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
  if (move?.load !== 'bodyweight') return type.blockFields;
  return type.blockFields.filter(field => field.unit !== 'kg');
}

export function validateLogValues(type: TrainingType, values: unknown, where: 'block' | 'session' = 'block', fields = where === 'block' ? type.blockFields : type.sessionFields): Record<string, LogValue> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new TrainingError('Check the values and try again.');
  const source = values as Record<string, unknown>;
  const known = new Set(fields.map(field => field.key));
  for (const key of Object.keys(source)) {
    if (!known.has(key)) throw new TrainingError('Unknown value.');
  }
  const next: Record<string, LogValue> = {};
  for (const field of fields) {
    const value = source[field.key];
    if (value == null) {
      if (field.required) throw new TrainingError(`${field.label} is required.`);
      continue;
    }
    if (field.input === 'check') {
      if (typeof value !== 'boolean') throw new TrainingError(`${field.label} is a yes or no.`);
      next[field.key] = value;
      continue;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TrainingError(`${field.label} needs a number.`);
    if (field.input === 'rating') {
      if (!Number.isInteger(value) || value < 1 || value > 10) throw new TrainingError(`${field.label} is from 1 to 10.`);
    } else if (field.input === 'duration') {
      if (!Number.isInteger(value) || value < 0 || value > 86400) throw new TrainingError(`${field.label} is a time in seconds.`);
    } else if (field.input === 'distance') {
      if (value < 0 || value > 1_000_000) throw new TrainingError(`${field.label} is a distance in metres.`);
    } else if (value < 0 || value > 100000) {
      throw new TrainingError(`${field.label} is out of range.`);
    }
    next[field.key] = value;
  }
  if (fields.length > 1 && !fields.some(field => field.required) && !Object.keys(next).length)
    throw new TrainingError('Add at least one value.');
  return next;
}

function parseDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekdayOf(date: Date): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const day = date.getUTCDay();
  return (day === 0 ? 7 : day) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

function mondayOf(date: Date) {
  return addDays(date, -(weekdayOf(date) - 1));
}

export type PlanDay = {
  date: string;
  week: number;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  items: PlanItem[];
};

/** The plan repeats from the Monday of the week that contains the start date. */
export function planDay(plan: Pick<TrainingPlan, 'weeks' | 'slots'>, startDate: string, date: string): PlanDay | null {
  const start = parseDay(startDate);
  const target = parseDay(date);
  if (!start || !target || date < startDate) return null;
  const days = Math.round((mondayOf(target).getTime() - mondayOf(start).getTime()) / 86400000) + (weekdayOf(target) - 1);
  const cycle = plan.weeks * 7;
  const offset = ((days % cycle) + cycle) % cycle;
  const week = Math.floor(offset / 7) + 1;
  const weekday = ((offset % 7) + 1) as PlanDay['weekday'];
  const slot = plan.slots.find(item => item.week === week && item.weekday === weekday);
  return { date, week, weekday, items: slot?.items ?? [] };
}

export type LogMark = { planDate: string; itemId: string; status: 'done' | 'skipped' };

export type WeekDayView = {
  date: string;
  week: number;
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  items: PlanItem[];
  status: 'done' | 'open' | 'rest' | 'empty';
};

export function weekOf(
  plan: Pick<TrainingPlan, 'weeks' | 'slots'> | null,
  startDate: string | null,
  date: string,
  logs: LogMark[] = [],
): WeekDayView[] {
  const anchor = parseDay(date);
  if (!anchor) throw new TrainingError('Check the date and try again.');
  const monday = mondayOf(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const day = iso(addDays(monday, index));
    const weekday = (index + 1) as WeekDayView['weekday'];
    if (!plan || !startDate) return { date: day, week: 1, weekday, items: [], status: 'empty' as const };
    const planned = planDay(plan, startDate, day);
    const items = planned?.items ?? [];
    const required = items.filter((item): item is Extract<PlanItem, { id: string }> => item.kind !== 'rest' && !item.optional);
    let status: WeekDayView['status'] = 'empty';
    if (!items.length) status = 'empty';
    else if (!required.length) status = items.some(item => item.kind === 'rest') ? 'rest' : 'empty';
    else if (required.every(item => logs.some(log => log.planDate === day && log.itemId === item.id && log.status === 'done')))
      status = 'done';
    else status = 'open';
    return { date: day, week: planned?.week ?? 1, weekday, items, status };
  });
}

function clockUnit(seconds: number) {
  return seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds} sec`;
}

function numberText(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

function span(target: Target, format: (value: number) => string) {
  if (target.isMax && target.min == null && target.max == null) return 'max';
  const min = target.min;
  const max = target.max;
  if (min != null && max != null && min !== max) return `${format(min)}–${format(max)}`;
  const only = min ?? max;
  return only == null ? '' : format(only);
}

function schemeAmountLabel(field: Field, target: Target | undefined, sets: number | undefined, schemeId?: string) {
  if (!schemeId || !target || target.isMax || !sets || sets < 2) return null;
  const role = fieldRole(field);
  if (role !== 'reps' && role !== 'seconds') return null;
  const min = target.min ?? target.max ?? 1;
  const max = target.max ?? target.min ?? min;
  const item: SchemeItem =
    role === 'seconds'
      ? { sets, repsMin: min, repsMax: max, target: { kind: 'hold', minSeconds: min, maxSeconds: max } }
      : { sets, repsMin: min, repsMax: max, target: { kind: 'reps', min, max } };
  const amounts = spreadAmounts(schemeById(schemeId), item.target ?? { kind: 'reps', min, max }, sets);
  if (role === 'seconds') {
    const numbers = amounts.filter((value): value is number => value != null);
    if (numbers.length > 0 && numbers.every(value => value % 60 === 0)) {
      return amountListLabel(
        sets,
        amounts.map(value => (value == null ? null : value / 60)),
        ' min',
      );
    }
    return amountListLabel(sets, amounts, ' sec');
  }
  return amountListLabel(sets, amounts);
}

/** A target rendered from the field alone: "3 × 8–10", "5 × 3 min", "30–45 min". A scheme that changes the sets lists them. */
export function targetLabel(field: Field, target?: Target, sets?: number, schemeId?: string): string {
  const changed = schemeAmountLabel(field, target, sets, schemeId);
  if (changed) return changed;
  if (!target || (target.min == null && target.max == null && !target.isMax)) return '';
  const count = sets && sets > 1 ? sets : 0;
  if (field.input === 'duration') {
    const wholeMinutes = [target.min, target.max].every(value => value == null || (Number.isInteger(value) && value % 60 === 0));
    if (wholeMinutes && !target.isMax) {
      const minutes = (value: number) => String(value / 60);
      const body = span(target, minutes);
      if (!body) return '';
      return count ? `${count} × ${body} min` : `${body} min`;
    }
    const body = span(target, clockUnit);
    return count ? `${count} × ${body}` : body;
  }
  if (field.input === 'distance') {
    const format = (value: number) => (value >= 1000 ? `${numberText(value / 1000)} km` : `${numberText(value)} m`);
    const body = span(target, format);
    return count ? `${count} × ${body}` : body;
  }
  if (field.input === 'check') return 'Done';
  const body = span(target, numberText);
  const unit = field.unit && field.unit !== 'reps' ? ` ${field.unit}` : '';
  if (count) return `${count} × ${body}${unit}`;
  return `${body}${unit}`;
}

export function formatLogged(field: Field, value: LogValue): string {
  if (typeof value === 'boolean') return value ? field.label : '';
  if (field.input === 'duration') return clockUnit(value);
  if (field.input === 'distance') return value >= 1000 ? `${numberText(value / 1000)} km` : `${numberText(value)} m`;
  if (field.unit) return `${numberText(value)} ${field.unit}`;
  return numberText(value);
}

export function lastTimeLine(fields: Field[], values: Record<string, LogValue> | null | undefined): string | null {
  if (!values) return null;
  const weight = fields.find(field => fieldRole(field) === 'weight');
  const reps = fields.find(field => fieldRole(field) === 'reps');
  if (weight && reps && typeof values[weight.key] === 'number' && typeof values[reps.key] === 'number')
    return `Last time: ${numberText(values[weight.key] as number)} ${weight.unit ?? 'kg'} × ${numberText(values[reps.key] as number)}`;
  const parts = fields
    .map(field => (values[field.key] == null ? '' : formatLogged(field, values[field.key])))
    .filter(Boolean);
  return parts.length ? `Last time: ${parts.join(' · ')}` : null;
}

export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function parseClock(text: string) {
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function blockTargetItem(block: Pick<SessionBlock, 'sets' | 'targets'>): SchemeItem {
  const seconds = block.targets?.seconds;
  const reps = block.targets?.reps;
  if (seconds && !reps) {
    const min = seconds.min ?? seconds.max ?? 1;
    const max = seconds.max ?? seconds.min ?? min;
    return {
      sets: block.sets,
      repsMin: min,
      repsMax: max,
      target: seconds.isMax ? { kind: 'max', measure: 'hold' } : { kind: 'hold', minSeconds: min, maxSeconds: max },
    };
  }
  const min = reps?.min ?? reps?.max ?? 1;
  const max = reps?.max ?? reps?.min ?? min;
  return {
    sets: block.sets,
    repsMin: min,
    repsMax: max,
    ...(reps ? { target: reps.isMax ? ({ kind: 'max', measure: 'reps' } as const) : ({ kind: 'reps', min, max } as const) } : {}),
  };
}

export function setPrefill(
  type: TrainingType,
  block: SessionBlock,
  setIndex: number,
  lastRecords: LoggedSet[] | null | undefined,
  lastLogged: Record<string, LogValue> | null | undefined,
  schemes?: SetScheme[],
  /** Our estimated first weight, used only when there is no history. */
  start: number | null = null,
): Record<string, LogValue> {
  const fields = blockFields(type, block);
  const values: Record<string, LogValue> = {};
  const weight = fields.find(field => fieldRole(field) === 'weight');
  const reps = fields.find(field => fieldRole(field) === 'reps');
  const seconds = fields.find(field => fieldRole(field) === 'seconds');
  const move = block.exerciseId ? exercise(block.exerciseId) : undefined;
  const scheme = schemeById(block.scheme, schemes);
  if (move && (weight || reps || seconds)) {
    const planned = planWithScheme(move, blockTargetItem(block), scheme, lastRecords, start);
    const row = planned.sets[setIndex];
    if (weight && row?.weightKg != null) values[weight.key] = row.weightKg;
    if (reps && row?.reps != null && !block.targets?.[reps.key]?.isMax) values[reps.key] = row.reps;
    if (seconds && row?.seconds != null && !block.targets?.[seconds.key]?.isMax) values[seconds.key] = row.seconds;
  } else if (reps || seconds) {
    const item = blockTargetItem(block);
    const amounts = spreadAmounts(scheme, item.target ?? { kind: 'reps', min: item.repsMin, max: item.repsMax }, block.sets);
    const amount = amounts[setIndex];
    if (reps && amount != null && !block.targets?.[reps.key]?.isMax) values[reps.key] = amount;
    if (seconds && amount != null && !block.targets?.[seconds.key]?.isMax) values[seconds.key] = amount;
  }
  for (const field of fields) {
    const role = fieldRole(field);
    if (role === 'weight' || role === 'reps' || role === 'seconds') continue;
    const target = block.targets?.[field.key];
    if (!target || target.isMax || field.input === 'check') continue;
    const seed = target.min ?? target.max;
    if (seed != null) values[field.key] = seed;
  }
  if (lastLogged) {
    for (const field of fields) {
      const role = fieldRole(field);
      if (role === 'reps' || role === 'seconds') continue;
      if (role === 'weight' && values[field.key] != null) continue;
      const value = lastLogged[field.key];
      if (typeof value === 'number' || typeof value === 'boolean') values[field.key] = value;
    }
  }
  return values;
}

export function progressedWeight(
  type: TrainingType,
  block: SessionBlock,
  previous: { weight: number | null; reps: number },
) {
  if (!type.usesExerciseRecords || !block.exerciseId) return null;
  const fields = blockFields(type, block);
  const weight = fields.find(field => fieldRole(field) === 'weight');
  const reps = fields.find(field => fieldRole(field) === 'reps');
  const move = exercise(block.exerciseId);
  if (!weight || !reps || !move) return null;
  const target = block.targets?.[reps.key];
  return nextSetWeight({ weightKg: previous.weight, reps: previous.reps }, move, { repsMin: target?.min ?? target?.max ?? 1 });
}

/** A timeline post names the session and nothing that was recorded. */
export function completedSessionPost(title: string, sessionId: string, note: string) {
  const cleanTitle = title.replace(/\s+/g, ' ').trim().slice(0, 60);
  const cleanNote = note.replace(/\s+/g, ' ').trim().slice(0, 280);
  return {
    personalFlowId: sessionId,
    title: cleanTitle,
    cards: [{ sourceFlowId: sessionId, cardId: sessionId, title: cleanTitle }],
    total: 1,
    note: cleanNote,
  };
}
