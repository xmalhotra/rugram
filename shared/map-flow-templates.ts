/**
 * Ready Map flows. One record is a whole pattern. Adding one does not change
 * the functions. Days reuse the written Daily flows in shared/purposes.ts.
 * The running flow stands in for a hard run until a live run session exists.
 */
import { animalMovementFlowId } from './animal-movements';
import { dailyFlowItemById } from './daily-flow-item-data';
import type { FlowLevel, TrainPlace } from './flow-defaults';
import { gymFlowById } from './gym-flows';
import {
  mapFlowDaySchema,
  styleProblems,
  type MapFlowDay,
  type MapFlowEffort,
  type MapFlowRef,
  type MapFlowRepeat,
} from './map-flow';
import { z } from 'zod';

const allowedFlows = new Set([animalMovementFlowId, 'running']);

function flow(id: string, items?: MapFlowRef['items']): MapFlowRef {
  if (!gymFlowById(id) && !allowedFlows.has(id)) throw new Error(`Map flow template uses an unknown flow ${id}.`);
  return { kind: 'flow', id, ...(items ? { items } : {}) };
}

function day(name: string, effort: MapFlowEffort, flowIds: readonly (string | MapFlowRef)[], itemIds: readonly string[] = []): MapFlowDay {
  return mapFlowDaySchema.parse({
    name,
    effort,
    flows: flowIds.map(entry => (typeof entry === 'string' ? flow(entry) : entry)),
    items: itemIds.map(id => {
      const item = dailyFlowItemById(id);
      if (!item) throw new Error(`Map flow template uses an unknown item ${id}.`);
      return { itemId: item.id, name: item.name, checkpoint: item.checkpoint, timesPerDay: 1 };
    }),
  });
}

const rest: MapFlowDay = { name: 'Rest', effort: 'rest', flows: [], items: [] };

const moveItems = [
  { exerciseId: 'bird-dog', sets: 2 },
  { exerciseId: 'bear-crawl', sets: 2 },
  { exerciseId: 'inchworm', sets: 2 },
];

function moveDay() {
  return day('Move day', 'skill', [flow(animalMovementFlowId, moveItems)]);
}

function handstandDay(id: string) {
  return day('Handstand practice', 'skill', [id]);
}

const templateSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    purposeIds: z.array(z.string().min(1)).min(1),
    styleId: z.string().min(1),
    level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    place: z.enum(['gym', 'dumbbells', 'bodyweight']),
    minutes: z.union([z.literal(30), z.literal(45), z.literal(60)]),
    repeat: z.enum(['in-turn', 'weekdays']),
    days: z.array(mapFlowDaySchema).min(1).max(14),
  })
  .strict();

export type MapFlowTemplate = z.infer<typeof templateSchema> & {
  level: FlowLevel;
  place: TrainPlace;
  repeat: MapFlowRepeat;
};

function template(input: MapFlowTemplate): MapFlowTemplate {
  const parsed = templateSchema.parse(input);
  const problems = styleProblems(parsed.styleId, parsed.days);
  if (problems.length) throw new Error(`${parsed.id}: ${problems.join(' ')}`);
  return parsed;
}

const upper = day('Upper day', 'upper', ['gym-splits-size-upper'], ['creatine']);
const lower = day('Lower day', 'lower', ['gym-splits-size-lower'], ['creatine']);
const powerUpper = day('Strength upper', 'upper', ['gym-splits-power-upper'], ['creatine']);
const powerLower = day('Strength lower', 'heavy-lower', ['gym-splits-power-lower'], ['creatine']);
const hybridDay = day('Hybrid day', 'heavy-lower', ['gym-splits-strength-conditioning'], ['creatine']);
const hardRun = day('Run', 'hard-run', ['running']);
const core = day('Core day', 'core', ['gym-core-dead-bug-and-plank'], ['protein']);
const full = day('Full body day', 'full', ['gym-full-beginner-day-1'], ['protein']);

export const mapFlowTemplates: MapFlowTemplate[] = [
  template({
    id: 'gain-muscle-beginner',
    name: 'Upper and lower',
    purposeIds: ['gain-muscle'],
    styleId: 'body-part',
    level: 'Beginner',
    place: 'gym',
    minutes: 45,
    repeat: 'in-turn',
    days: [upper, lower, rest],
  }),
  template({
    id: 'gain-muscle-intermediate',
    name: 'Five day upper and lower',
    purposeIds: ['gain-muscle'],
    styleId: 'body-part',
    level: 'Intermediate',
    place: 'gym',
    minutes: 60,
    repeat: 'in-turn',
    days: [upper, lower, rest, upper, lower],
  }),
  template({
    id: 'gain-muscle-advanced',
    name: 'Paired sets',
    purposeIds: ['gain-muscle'],
    styleId: 'supersets',
    level: 'Advanced',
    place: 'gym',
    minutes: 60,
    repeat: 'in-turn',
    days: [
      day('Chest and arms', 'upper', ['gym-supersets-chest-triceps-advanced'], ['creatine']),
      rest,
      day('Back and arms', 'upper', ['gym-supersets-back-biceps-advanced'], ['creatine']),
      rest,
      day('Legs and core', 'lower', ['gym-supersets-legs-core-advanced'], ['creatine']),
    ],
  }),
  template({
    id: 'get-stronger-beginner',
    name: 'Strength days',
    purposeIds: ['get-stronger'],
    styleId: 'straight-sets',
    level: 'Beginner',
    place: 'gym',
    minutes: 45,
    repeat: 'in-turn',
    days: [powerUpper, powerLower, rest],
  }),
  template({
    id: 'get-stronger-intermediate',
    name: 'Five strength days',
    purposeIds: ['get-stronger'],
    styleId: 'straight-sets',
    level: 'Intermediate',
    place: 'gym',
    minutes: 60,
    repeat: 'in-turn',
    days: [powerUpper, powerLower, rest, powerUpper, powerLower],
  }),
  template({
    id: 'get-stronger-advanced',
    name: 'Heavy strength',
    purposeIds: ['get-stronger'],
    styleId: 'straight-sets',
    level: 'Advanced',
    place: 'gym',
    minutes: 60,
    repeat: 'in-turn',
    days: [
      powerUpper,
      rest,
      day('Heavy lower', 'heavy-lower', ['gym-legs-lower-body-strength'], ['creatine']),
      rest,
      powerLower,
    ],
  }),
  template({
    id: 'visible-abs-beginner',
    name: 'Full body and core',
    purposeIds: ['visible-abs'],
    styleId: 'full-body',
    level: 'Beginner',
    place: 'gym',
    minutes: 45,
    repeat: 'in-turn',
    days: [full, rest, core, rest],
  }),
  template({
    id: 'visible-abs-intermediate',
    name: 'Full body, with room',
    purposeIds: ['visible-abs'],
    styleId: 'full-body',
    level: 'Intermediate',
    place: 'gym',
    minutes: 45,
    repeat: 'in-turn',
    days: [full, rest, day('Core day', 'core', ['gym-core-anti-rotation-core'], ['protein']), rest, rest],
  }),
  template({
    id: 'visible-abs-advanced',
    name: 'Full body week',
    purposeIds: ['visible-abs'],
    styleId: 'full-body',
    level: 'Advanced',
    place: 'gym',
    minutes: 60,
    repeat: 'in-turn',
    days: [
      full,
      rest,
      day('Hanging core', 'core', ['gym-core-hanging-core-strength'], ['protein']),
      rest,
      day('Heavy full body', 'full', ['gym-full-advanced-day-1'], ['protein']),
      rest,
      rest,
    ],
  }),
  template({
    id: 'move-better-beginner',
    name: 'Move, then rest',
    purposeIds: ['move-better'],
    styleId: 'calisthenics',
    level: 'Beginner',
    place: 'bodyweight',
    minutes: 30,
    repeat: 'in-turn',
    days: [moveDay(), rest, rest],
  }),
  template({
    id: 'move-better-intermediate',
    name: 'Move twice',
    purposeIds: ['move-better'],
    styleId: 'calisthenics',
    level: 'Intermediate',
    place: 'bodyweight',
    minutes: 30,
    repeat: 'in-turn',
    days: [moveDay(), rest, moveDay(), rest, rest],
  }),
  template({
    id: 'move-better-advanced',
    name: 'Move through the week',
    purposeIds: ['move-better'],
    styleId: 'calisthenics',
    level: 'Advanced',
    place: 'bodyweight',
    minutes: 45,
    repeat: 'in-turn',
    days: [moveDay(), rest, moveDay(), rest, moveDay(), rest, rest],
  }),
  template({
    id: 'handstand-beginner',
    name: 'Floor practice',
    purposeIds: ['handstand'],
    styleId: 'calisthenics',
    level: 'Beginner',
    place: 'bodyweight',
    minutes: 30,
    repeat: 'in-turn',
    days: [handstandDay('cal-upper-beginner'), rest, rest],
  }),
  template({
    id: 'handstand-intermediate',
    name: 'Wall practice',
    purposeIds: ['handstand'],
    styleId: 'calisthenics',
    level: 'Intermediate',
    place: 'bodyweight',
    minutes: 45,
    repeat: 'in-turn',
    days: [handstandDay('cal-upper-intermediate'), rest, rest],
  }),
  template({
    id: 'handstand-advanced',
    name: 'Wall practice, twice',
    purposeIds: ['handstand'],
    styleId: 'calisthenics',
    level: 'Advanced',
    place: 'bodyweight',
    minutes: 45,
    repeat: 'in-turn',
    days: [handstandDay('cal-upper-intermediate'), rest, handstandDay('cal-upper-intermediate'), rest, rest],
  }),
  template({
    id: 'hyrox-beginner',
    name: 'Hybrid week',
    purposeIds: ['hyrox'],
    styleId: 'hybrid',
    level: 'Beginner',
    place: 'gym',
    minutes: 60,
    repeat: 'weekdays',
    days: [powerLower, powerUpper, hardRun, rest, hybridDay, day('Easy', 'easy', [animalMovementFlowId]), rest],
  }),
  template({
    id: 'hyrox-intermediate',
    name: 'Hybrid, in turn',
    purposeIds: ['hyrox'],
    styleId: 'hybrid',
    level: 'Intermediate',
    place: 'gym',
    minutes: 60,
    repeat: 'in-turn',
    days: [powerLower, powerUpper, hardRun, rest, hybridDay, day('Easy', 'easy', [animalMovementFlowId]), rest],
  }),
  template({
    id: 'hyrox-advanced',
    name: 'Hybrid five days',
    purposeIds: ['hyrox'],
    styleId: 'hybrid',
    level: 'Advanced',
    place: 'gym',
    minutes: 60,
    repeat: 'in-turn',
    days: [powerLower, powerUpper, hardRun, rest, hybridDay],
  }),
];

export function mapFlowTemplateById(id: string) {
  return mapFlowTemplates.find(item => item.id === id);
}

export function readyMapFlowPurposeIds() {
  return [...new Set(mapFlowTemplates.flatMap(item => item.purposeIds))];
}
