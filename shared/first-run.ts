/**
 * The first two minutes: one purpose, only the questions that purpose needs,
 * then a ready Map flow. Skipped answers still leave a result.
 * Gym place and time are asked only when the purpose leads to gym flows.
 */
import { placeCanDo, type FlowLevel, type TrainPlace, type WorkoutMinutes } from './flow-defaults';
import { gymFlowById } from './gym-flows';
import { mapFlowStyleById } from './map-flow-styles';
import { mapFlowTemplates, type MapFlowTemplate } from './map-flow-templates';
import { purposes, writtenDailyFlow, type Purpose } from './purposes';

export type FirstRunAnswers = Record<string, string | null | undefined>;

export type FirstRunQuestion = Purpose['questions'][number];

const levelRank: Record<FlowLevel, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

/** How long a workout can be. Appended for a purpose whose Map flows are gym flows. */
const gymTimeQuestion: FirstRunQuestion = {
  id: 'gym-time',
  prompt: 'How long can a workout be?',
  why: 'The day stays inside that time.',
  asks: 'gym-time',
  choices: [
    { id: '30', label: '30 min', minutes: 30 },
    { id: '45', label: '45 min', minutes: 45 },
    { id: '60', label: '60 min', minutes: 60 },
  ],
};

const gymPlaceQuestion: FirstRunQuestion = {
  id: 'gym-place',
  prompt: 'Where do you train?',
  why: 'The day uses the equipment you have.',
  asks: 'gym-place',
  choices: [
    { id: 'gym', label: 'Gym', place: 'gym' },
    { id: 'dumbbells', label: 'Home with dumbbells', place: 'dumbbells' },
    { id: 'bodyweight', label: 'Bodyweight only', place: 'bodyweight' },
  ],
};

export type FirstRunSignals = {
  level: FlowLevel | null;
  place: TrainPlace | null;
  minutes: WorkoutMinutes | null;
  days: number | null;
};

export type FirstRunPick = {
  id: string;
  name: string;
  reason: string;
  level: FlowLevel;
  place: TrainPlace;
  minutes: WorkoutMinutes;
  styleName: string;
};

export type FirstRunResult =
  | { kind: 'map-flows'; purposeId: string; purposeName: string; focusId: string; fits: FirstRunPick[] }
  | { kind: 'starter'; purposeId: string; purposeName: string; focusId: string; line: string };

export type ConfirmLine = { id: string; prompt: string; said: string };

/** A purpose leads to gym flows when a ready Map flow needs a gym, or its written days do. */
export function purposeLeadsToGym(purposeId: string, templates: readonly MapFlowTemplate[] = mapFlowTemplates) {
  const own = templates.filter(template => template.purposeIds.includes(purposeId));
  if (own.some(template => template.place === 'gym')) return true;
  if (own.length) return false;
  return writtenDailyFlow(purposeId).some(day => day.flowIds.some(id => Boolean(gymFlowById(id))));
}

/** The purpose's own questions, plus gym place and time only when those Map flows are gym flows. */
export function questionsForPurpose(purposeId: string, templates: readonly MapFlowTemplate[] = mapFlowTemplates) {
  const purpose = purposes.find(item => item.id === purposeId);
  if (!purpose) return [];
  const gym = purposeLeadsToGym(purposeId, templates);
  const own = purpose.questions.filter(question => gym || (question.asks !== 'gym-place' && question.asks !== 'gym-time'));
  if (!gym) return own;
  const withPlace = own.some(question => question.asks === 'gym-place') ? own : [...own, gymPlaceQuestion];
  return withPlace.some(question => question.asks === 'gym-time') ? withPlace : [...withPlace, gymTimeQuestion];
}

function choiceFor(question: FirstRunQuestion, answers: FirstRunAnswers) {
  const value = answers[question.id];
  if (!value) return null;
  return question.choices.find(choice => choice.id === value) ?? null;
}

export function firstRunSignals(purposeId: string, answers: FirstRunAnswers, templates?: readonly MapFlowTemplate[]): FirstRunSignals {
  const signals: FirstRunSignals = { level: null, place: null, minutes: null, days: null };
  for (const question of questionsForPurpose(purposeId, templates)) {
    const choice = choiceFor(question, answers);
    if (!choice) continue;
    if (choice.level && (signals.level == null || levelRank[choice.level] > levelRank[signals.level])) signals.level = choice.level;
    if (choice.place) signals.place = choice.place;
    if (choice.minutes != null) signals.minutes = choice.minutes;
    if (choice.days != null) signals.days = choice.days;
  }
  return signals;
}

/** Place and time to keep, when the member actually answered them. */
export function gymSetupFromAnswers(purposeId: string, answers: FirstRunAnswers, templates?: readonly MapFlowTemplate[]) {
  const signals = firstRunSignals(purposeId, answers, templates);
  return { place: signals.place, minutes: signals.minutes };
}

function trainingDays(template: MapFlowTemplate) {
  return template.days.filter(day => day.effort !== 'rest').length;
}

function scoreTemplate(template: MapFlowTemplate, signals: FirstRunSignals) {
  let score = 0;
  if (signals.level) {
    const steps = Math.abs(levelRank[template.level] - levelRank[signals.level]);
    score += steps === 0 ? 1000 : -100 * steps;
  } else if (signals.days == null) {
    score += template.level === 'Beginner' ? 1000 : -100 * levelRank[template.level];
  } else {
    score += template.level === 'Beginner' ? 1 : 0;
  }
  if (signals.place) {
    if (template.place === signals.place) score += 100;
    else if (placeCanDo(template.place, signals.place)) score += 40;
    else score -= 500;
  }
  if (signals.minutes != null) score -= Math.abs(template.minutes - signals.minutes);
  if (signals.days != null) score -= Math.abs(trainingDays(template) - signals.days) * 10;
  return score;
}

function reasonFor(
  template: MapFlowTemplate,
  purposeName: string,
  questions: readonly FirstRunQuestion[],
  answers: FirstRunAnswers,
) {
  const parts: string[] = [];
  for (const question of questions) {
    const choice = choiceFor(question, answers);
    if (!choice) continue;
    if (choice.level && choice.level === template.level) parts.push(choice.label);
    if (choice.place && choice.place === template.place) parts.push(choice.label);
    else if (choice.place && !placeCanDo(template.place, choice.place)) parts.push('Needs a gym');
    if (choice.minutes != null) parts.push(`${template.minutes} min`);
    if (choice.days != null) parts.push(`${trainingDays(template)} training days`);
  }
  if (!parts.length) return `A starting Map flow for ${purposeName}.`;
  return `Because you said ${parts.join(', ')}.`;
}

function starterResult(purposeId: string, purpose: Purpose | undefined): FirstRunResult {
  const name = purpose?.name ?? 'This purpose';
  return {
    kind: 'starter',
    purposeId,
    purposeName: name,
    focusId: purpose?.focusId ?? 'workout',
    line: purpose ? `More is coming for ${purpose.name}.` : 'More is coming.',
  };
}

/** Ready Map flows for these answers, best first. No template yet means the starter, with a line that more is coming. */
export function firstRunResult(input: {
  purposeId: string;
  answers: FirstRunAnswers;
  templates?: readonly MapFlowTemplate[];
}): FirstRunResult {
  const templates = input.templates ?? mapFlowTemplates;
  const purpose = purposes.find(item => item.id === input.purposeId);
  const own = templates.filter(template => template.purposeIds.includes(input.purposeId));
  if (!purpose || !own.length) return starterResult(input.purposeId, purpose);
  const questions = questionsForPurpose(input.purposeId, templates);
  const signals = firstRunSignals(input.purposeId, input.answers, templates);
  const fits = own
    .map(template => ({ template, score: scoreTemplate(template, signals) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        levelRank[a.template.level] - levelRank[b.template.level] ||
        a.template.id.localeCompare(b.template.id),
    )
    .map(({ template }) => ({
      id: template.id,
      name: template.name,
      reason: reasonFor(template, purpose.name, questions, input.answers),
      level: template.level,
      place: template.place,
      minutes: template.minutes,
      styleName: mapFlowStyleById(template.styleId)?.name ?? template.styleId,
    }));
  return { kind: 'map-flows', purposeId: purpose.id, purposeName: purpose.name, focusId: purpose.focusId, fits };
}

/** Every answer said back, including a skip. */
export function confirmLines(purposeId: string, answers: FirstRunAnswers, templates?: readonly MapFlowTemplate[]): ConfirmLine[] {
  return questionsForPurpose(purposeId, templates).map(question => {
    const choice = choiceFor(question, answers);
    return { id: question.id, prompt: question.prompt, said: choice?.label ?? 'Skipped' };
  });
}

export function flowsNowFit(count: number) {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return n === 1 ? '1 flow now fits' : `${n} flows now fit`;
}

export function priorityAddedLine(count: number) {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return n === 1 ? 'Added to 1 flow' : `Added to ${n} flows`;
}
