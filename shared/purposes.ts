/**
 * Purposes and the Daily flows Qram writes for them. Both are data.
 * Adding a purpose is a new object here, plus its days. No branch in the functions.
 *
 * A purpose is offered when it has questions, written days, and a ready Map flow.
 * The ready list is the Map flow templates, unless the caller passes one.
 */
import { z } from 'zod';
import { itemCanBeWritten, type DailyFlowItem } from './daily-flow-item';
import { dailyFlowItemById, dailyFlowItems } from './daily-flow-item-data';
import { addDailyItem, type DailyChecks } from './daily-checks';
import { gymFlowById } from './gym-flows';
import { animalMovementFlowId } from './animal-movements';
import { readyMapFlowPurposeIds } from './map-flow-templates';

export const demoPurposeId = 'gain-muscle';

const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  place: z.enum(['gym', 'dumbbells', 'bodyweight']).optional(),
  minutes: z.union([z.literal(30), z.literal(45), z.literal(60)]).optional(),
  days: z.number().int().min(1).max(7).optional(),
});

const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  why: z.string().min(1),
  /** gym-place and gym-time are asked only when this purpose leads to gym flows. */
  asks: z.enum(['gym-place', 'gym-time', 'days', 'level']).optional(),
  choices: z.array(choiceSchema).min(1),
});

export const purposeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Catalogue focus used when this purpose has no ready Map flow yet. */
  focusId: z.string().min(1),
  aliases: z.array(z.string().min(1)),
  areas: z.array(z.string().min(1)).min(1),
  skills: z.array(z.string().min(1)).min(1),
  questions: z.array(questionSchema).min(1),
});

export type Purpose = z.infer<typeof purposeSchema>;

export type WrittenStage = {
  fromWeek: number;
  itemIds: string[];
  /** Shown in the weekly review when this stage adds an item. Week 1 has none. */
  reason?: string;
};

export type WrittenDay = {
  id: string;
  purposeId: string;
  slot: string;
  flowIds: string[];
  stages: WrittenStage[];
};

const gymPlace = [
  { id: 'gym', label: 'Gym', place: 'gym' as const },
  { id: 'dumbbells', label: 'Home with dumbbells', place: 'dumbbells' as const },
  { id: 'bodyweight', label: 'Bodyweight only', place: 'bodyweight' as const },
];

const dayChoices = [
  { id: '2', label: '2 days', days: 2 },
  { id: '3', label: '3 days', days: 3 },
  { id: '4', label: '4 days', days: 4 },
  { id: '5', label: '5 days', days: 5 },
];

const purposesData = [
  {
    id: 'gain-muscle',
    name: 'Gain muscle',
    focusId: 'workout',
    aliases: ['build muscle', 'Build muscle'],
    areas: ['Chest', 'Back', 'Shoulders', 'Legs'],
    skills: ['Resistance training'],
    questions: [
      { id: 'place', prompt: 'Where do you train?', why: 'The day uses the equipment you have.', asks: 'gym-place' as const, choices: gymPlace },
      { id: 'days', prompt: 'How many days can you train?', why: 'The pattern follows that number.', asks: 'days' as const, choices: dayChoices },
      {
        id: 'lifting',
        prompt: 'Have you been lifting?',
        why: 'The day starts from the sessions you can finish.',
        asks: 'level' as const,
        choices: [
          { id: 'new', label: 'Not yet', level: 'Beginner' as const },
          { id: 'some', label: 'A few months', level: 'Intermediate' as const },
          { id: 'years', label: 'For years', level: 'Advanced' as const },
        ],
      },
    ],
  },
  {
    id: 'get-stronger',
    name: 'Get stronger',
    focusId: 'workout',
    aliases: ['strength'],
    areas: ['Chest', 'Back', 'Legs'],
    skills: ['Heavy compounds'],
    questions: [
      { id: 'place', prompt: 'Where do you train?', why: 'Strength work needs the kit you actually have.', asks: 'gym-place' as const, choices: gymPlace },
      {
        id: 'lifts',
        prompt: 'Which lifts do you already do?',
        why: 'The day starts from those lifts.',
        asks: 'level' as const,
        choices: [
          { id: 'none', label: 'None yet', level: 'Beginner' as const },
          { id: 'light', label: 'The main lifts, light', level: 'Intermediate' as const },
          { id: 'heavy', label: 'The main lifts, heavy', level: 'Advanced' as const },
        ],
      },
      { id: 'days', prompt: 'How many days can you train?', why: 'Heavy days need room between them.', asks: 'days' as const, choices: dayChoices },
    ],
  },
  {
    id: 'visible-abs',
    name: 'Visible abs',
    focusId: 'workout',
    aliases: ['abs'],
    areas: ['Core', 'Full body'],
    skills: ['Bracing'],
    questions: [
      { id: 'place', prompt: 'Where do you train?', why: 'The core day uses that place.', asks: 'gym-place' as const, choices: gymPlace },
      {
        id: 'eating',
        prompt: 'Are you eating less than usual?',
        why: 'Keeping muscle matters more when meals are smaller.',
        choices: [
          { id: 'less', label: 'Yes' },
          { id: 'same', label: 'About the same' },
        ],
      },
    ],
  },
  {
    id: 'move-better',
    name: 'Move better',
    focusId: 'workout',
    aliases: ['mobility'],
    areas: ['Hips', 'Shoulders', 'Ankles'],
    skills: ['Joint control'],
    questions: [
      {
        id: 'where',
        prompt: 'What feels tight?',
        why: 'The day starts with the joints you named.',
        choices: [
          { id: 'hips', label: 'Hips' },
          { id: 'shoulders', label: 'Shoulders' },
          { id: 'ankles', label: 'Ankles' },
          { id: 'several', label: 'A few places' },
        ],
      },
      {
        id: 'place',
        prompt: 'Can you get on the floor?',
        why: 'The session is on the ground.',
        choices: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'Not yet' },
        ],
      },
    ],
  },
  {
    id: 'handstand',
    name: 'Do a handstand',
    focusId: 'workout',
    aliases: ['handstand'],
    areas: ['Shoulders', 'Wrists', 'Core'],
    skills: ['Wall handstand'],
    questions: [
      {
        id: 'wall',
        prompt: 'Can you kick up to a wall?',
        why: 'The day starts at the wall if you can, or on the floor if you cannot.',
        asks: 'level' as const,
        choices: [
          { id: 'no', label: 'Not yet', level: 'Beginner' as const },
          { id: 'yes', label: 'I can kick up', level: 'Intermediate' as const },
        ],
      },
      {
        id: 'wrists',
        prompt: 'Do your wrists tolerate leaning on your hands?',
        why: 'The practice loads the wrists.',
        choices: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No' },
        ],
      },
    ],
  },
  {
    id: 'hyrox',
    name: 'Compete in HYROX',
    focusId: 'hyrox',
    aliases: ['hyrox', 'HYROX'],
    areas: ['Legs', 'Conditioning'],
    skills: ['Running and stations'],
    questions: [
      {
        id: 'race',
        prompt: 'Have you done a HYROX?',
        why: 'The day is a start, not a race plan.',
        asks: 'level' as const,
        choices: [
          { id: 'no', label: 'Not yet', level: 'Beginner' as const },
          { id: 'once', label: 'Once', level: 'Intermediate' as const },
          { id: 'few', label: 'A few times', level: 'Advanced' as const },
        ],
      },
      { id: 'days', prompt: 'How many days can you train?', why: 'Running and lifting share the week.', asks: 'days' as const, choices: dayChoices },
      { id: 'place', prompt: 'Where do you train?', why: 'The strength day uses that place.', asks: 'gym-place' as const, choices: gymPlace },
    ],
  },
];

const daysData: WrittenDay[] = [
  {
    id: 'gain-muscle-upper',
    purposeId: 'gain-muscle',
    slot: 'Upper day',
    flowIds: ['gym-splits-size-upper'],
    stages: [
      { fromWeek: 1, itemIds: ['creatine'] },
      {
        fromWeek: 3,
        itemIds: ['creatine', 'protein'],
        reason:
          'Week 3 can add a meal with 20–40 g of protein. That is the per-meal amount in the ISSN protein position stand for building and keeping muscle. Meals can cover it. A powder is for when they do not.',
      },
    ],
  },
  {
    id: 'gain-muscle-lower',
    purposeId: 'gain-muscle',
    slot: 'Lower day',
    flowIds: ['gym-splits-size-lower'],
    stages: [
      { fromWeek: 1, itemIds: ['creatine'] },
      {
        fromWeek: 3,
        itemIds: ['creatine', 'protein'],
        reason:
          'Week 3 can add a meal with 20–40 g of protein. That is the per-meal amount in the ISSN protein position stand for building and keeping muscle. Meals can cover it. A powder is for when they do not.',
      },
    ],
  },
  {
    id: 'get-stronger-upper',
    purposeId: 'get-stronger',
    slot: 'Strength upper',
    flowIds: ['gym-splits-power-upper'],
    stages: [
      { fromWeek: 1, itemIds: ['creatine'] },
      {
        fromWeek: 3,
        itemIds: ['creatine', 'protein'],
        reason:
          'Week 3 can add a meal with 20–40 g of protein. The ISSN protein position stand ties that per-meal amount to training adaptations. Meals can cover it.',
      },
    ],
  },
  {
    id: 'get-stronger-lower',
    purposeId: 'get-stronger',
    slot: 'Strength lower',
    flowIds: ['gym-splits-power-lower'],
    stages: [
      { fromWeek: 1, itemIds: ['creatine'] },
      {
        fromWeek: 3,
        itemIds: ['creatine', 'protein'],
        reason:
          'Week 3 can add a meal with 20–40 g of protein. The ISSN protein position stand ties that per-meal amount to training adaptations. Meals can cover it.',
      },
    ],
  },
  {
    id: 'visible-abs-core',
    purposeId: 'visible-abs',
    slot: 'Core day',
    flowIds: ['gym-core-dead-bug-and-plank'],
    stages: [{ fromWeek: 1, itemIds: ['protein'] }],
  },
  {
    id: 'visible-abs-full',
    purposeId: 'visible-abs',
    slot: 'Full body day',
    flowIds: ['gym-full-beginner-day-1'],
    stages: [{ fromWeek: 1, itemIds: ['protein'] }],
  },
  {
    id: 'move-better-day',
    purposeId: 'move-better',
    slot: 'Move day',
    flowIds: [animalMovementFlowId],
    stages: [{ fromWeek: 1, itemIds: [] }],
  },
  {
    id: 'handstand-day',
    purposeId: 'handstand',
    slot: 'Handstand practice',
    flowIds: ['cal-upper-intermediate'],
    stages: [{ fromWeek: 1, itemIds: [] }],
  },
  {
    id: 'hyrox-hybrid',
    purposeId: 'hyrox',
    slot: 'Hybrid day',
    flowIds: ['gym-splits-strength-conditioning'],
    stages: [
      { fromWeek: 1, itemIds: ['creatine'] },
      {
        fromWeek: 3,
        itemIds: ['creatine', 'beta-alanine'],
        reason:
          'Week 3 can add beta-alanine, 4–6 g a day in smaller doses. The ISSN position stand is about hard efforts of about 1 to 4 minutes. It does not give a finish time. Tingling is the side effect it names.',
      },
    ],
  },
];

export const purposes: Purpose[] = purposesData.map(purpose => purposeSchema.parse(purpose));

export const writtenDays: WrittenDay[] = daysData;

export function writtenDailyFlow(purposeId: string) {
  return writtenDays.filter(day => day.purposeId === purposeId);
}

export function stageAt(day: WrittenDay, week: number) {
  return [...day.stages].filter(stage => stage.fromWeek <= week).sort((a, b) => b.fromWeek - a.fromWeek)[0];
}

export function itemIdsAtWeek(day: WrittenDay, week: number) {
  return stageAt(day, week)?.itemIds ?? [];
}

/** Problems that keep a written day out: a missing source, a missing flow, or more than three items at the start. */
export function writtenFlowProblems(days: readonly WrittenDay[] = writtenDays) {
  const problems: string[] = [];
  for (const day of days) {
    if (!day.flowIds.length) problems.push(`${day.id} has no flow.`);
    for (const flowId of day.flowIds) {
      const gym = gymFlowById(flowId);
      if (flowId !== animalMovementFlowId && !(gym && gym.items.length)) problems.push(`${day.id} uses an unknown flow ${flowId}.`);
    }
    const start = [...day.stages].sort((a, b) => a.fromWeek - b.fromWeek)[0];
    if (!start) problems.push(`${day.id} has no stage.`);
    else if (start.itemIds.length > 3) problems.push(`${day.id} starts with more than three items.`);
    for (const stage of day.stages) {
      for (const itemId of stage.itemIds) {
        const item = dailyFlowItemById(itemId);
        if (!item || !itemCanBeWritten(item)) problems.push(`${day.id} item ${itemId} has no source.`);
        else if (!item.helps.some(help => help.purposeId === day.purposeId))
          problems.push(`${day.id} item ${itemId} does not say what it helps for ${day.purposeId}.`);
      }
    }
  }
  return problems;
}

export function purposeOffered(
  purpose: Purpose,
  days: readonly WrittenDay[],
  mapFlowPurposeIds?: readonly string[],
) {
  if (purpose.questions.length === 0) return false;
  if (days.length === 0) return false;
  if (writtenFlowProblems(days).length > 0) return false;
  if (mapFlowPurposeIds && !mapFlowPurposeIds.includes(purpose.id)) return false;
  return true;
}

/** Purposes Qram can tailor. Each one needs a ready Map flow. Pass a list to narrow that check. */
export function offeredPurposes(mapFlowPurposeIds?: readonly string[]) {
  const ready = mapFlowPurposeIds ?? readyMapFlowPurposeIds();
  return purposes.filter(purpose => purposeOffered(purpose, writtenDailyFlow(purpose.id), ready));
}

export function purposeByPhrase(phrase: string) {
  const clean = phrase.trim().toLowerCase();
  return purposes.find(
    purpose => purpose.name.toLowerCase() === clean || purpose.aliases.some(alias => alias.toLowerCase() === clean),
  );
}

export function memberPurposeId(input: { purposeId?: string; demoMode?: boolean }) {
  if (input.purposeId && purposes.some(purpose => purpose.id === input.purposeId)) return input.purposeId;
  if (input.demoMode) return demoPurposeId;
  return undefined;
}

export function itemsAtWeek(purposeId: string, week: number): DailyFlowItem[] {
  const ids: string[] = [];
  for (const day of writtenDailyFlow(purposeId)) {
    for (const itemId of itemIdsAtWeek(day, week)) if (!ids.includes(itemId)) ids.push(itemId);
  }
  return ids.flatMap(id => {
    const item = dailyFlowItemById(id);
    return item ? [item] : [];
  });
}

export type WrittenDayView = {
  purposeId: string;
  purposeName: string;
  slot: string;
  flowId: string;
  items: DailyFlowItem[];
};

/** The first written day for a purpose, at a given week. */
export function writtenDay(purposeId: string, week = 1): WrittenDayView | null {
  const purpose = purposes.find(item => item.id === purposeId);
  const day = writtenDailyFlow(purposeId)[0];
  const flowId = day?.flowIds[0];
  if (!purpose || !day || !flowId) return null;
  return {
    purposeId,
    purposeName: purpose.name,
    slot: day.slot,
    flowId,
    items: itemIdsAtWeek(day, week).flatMap(id => {
      const item = dailyFlowItemById(id);
      return item ? [item] : [];
    }),
  };
}

export function purposeWeek(startedOn: string | undefined, today: string) {
  if (!startedOn) return 1;
  const start = Date.parse(`${startedOn}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(now) || now < start) return 1;
  return Math.floor((now - start) / 86400000 / 7) + 1;
}

export type ItemProposal = {
  id: string;
  itemId: string;
  name: string;
  reason: string;
  fromWeek: number;
};

/** Later-week items the review can offer. Week 1 items are already on the written day. */
export function itemStageProposals(input: {
  purposeId: string;
  week: number;
  presentItemIds: readonly string[];
}): ItemProposal[] {
  const proposals: ItemProposal[] = [];
  const seen = new Set<string>();
  for (const day of writtenDailyFlow(input.purposeId)) {
    const opening = new Set(itemIdsAtWeek(day, 1));
    for (const stage of day.stages) {
      if (stage.fromWeek <= 1 || stage.fromWeek > input.week || !stage.reason) continue;
      for (const itemId of stage.itemIds) {
        if (opening.has(itemId) || seen.has(itemId) || input.presentItemIds.includes(itemId)) continue;
        const item = dailyFlowItemById(itemId);
        if (!item) continue;
        seen.add(itemId);
        proposals.push({
          id: `item:${itemId}:w${stage.fromWeek}`,
          itemId,
          name: item.name,
          reason: stage.reason,
          fromWeek: stage.fromWeek,
        });
      }
    }
  }
  return proposals;
}

/** Adds the proposed item. Call this only after the member says yes. */
export function applyItemProposal(checks: DailyChecks, proposal: ItemProposal) {
  const item = dailyFlowItemById(proposal.itemId);
  if (!item) return checks;
  return addDailyItem(checks, item.name, 1, proposal.itemId, item.checkpoint);
}

export { dailyFlowItems };
