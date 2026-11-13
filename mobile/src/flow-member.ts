import { largeMuscleArea } from '../../shared/focus-targets';
import {
  goalsFromFocus,
  memberLevel,
  sessionFacts,
  type FlowFacts,
  type FlowLevel,
  type FlowMember,
  type FlowOverrides,
} from '../../shared/flow-defaults';
import { catalogFlowLine, catalogFlows, type CatalogFlow } from '../../shared/flow-catalog';
import { gymFlowById } from '../../shared/gym-flows';
import type { MuscleArea } from '../../shared/muscle-map';
import { finisherKept, flowLevelOf, memberGymItems } from '../../shared/priority-finisher';
import type { Customflow } from '../../shared/customflows';
import { useBodyFlow, type BodyFlowPayload } from './body-flow';
import { usePaneState } from './pane-state';
import { usePersonalMetrics } from './personal-metrics';
import { useStrength } from './strength';

const levels: FlowLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

export function isFlowLevel(value: string): value is FlowLevel {
  return (levels as string[]).includes(value);
}

/** A catalogue card plus the facts the default view sorts on. The id is the catalogue id. */
export function describedCatalogFlow(flow: CatalogFlow): (FlowFacts & { id: string; flow: CatalogFlow }) | null {
  const gym = flow.flowId ? gymFlowById(flow.flowId) : undefined;
  if (!gym || !flow.goals?.length || !isFlowLevel(flow.level)) return null;
  return { flow, ...sessionFacts({ id: flow.id, level: flow.level, goals: flow.goals, items: gym.items }) };
}

/**
 * A gym session as search knows it (the gym flow id). Calisthenics sessions are
 * not gym catalogue flows, so they are left out.
 */
export function describedGymSession(gymId: string) {
  const listed = catalogFlows.find(item => item.flowId === gymId && item.tileId.startsWith('gym-'));
  const described = listed ? describedCatalogFlow(listed) : null;
  return described ? { ...described, id: gymId } : null;
}

function gapAreas(result: BodyFlowPayload): MuscleArea[] {
  return result.areas
    .filter(area => largeMuscleArea(area.area) && area.sets < area.band.low)
    .sort((a, b) => b.band.low - b.sets - (a.band.low - a.sets) || a.area.localeCompare(b.area))
    .map(area => area.area);
}

/** This week's logged weeks and gap areas, from the Body flow cache. */
function useTrainingSpan() {
  const week = useBodyFlow('week');
  const data = week.data;
  if (!data) return { loggedWeeks: 0, gaps: [] as MuscleArea[], graduatedFlows: 0 };
  return { loggedWeeks: data.loggedWeeks, gaps: gapAreas(data), graduatedFlows: data.graduatedFlows ?? 0 };
}

/** The For you chips. Account scope, so a choice follows the member across tiles. */
export function useFlowOverrides() {
  return usePaneState<FlowOverrides>('flowView', {}, 'account');
}

/** Level, goals, place, time and this week's gaps, plus any chip the member changed. */
export function useFlowMember(focusId?: string) {
  const strength = useStrength();
  const metrics = usePersonalMetrics();
  const span = useTrainingSpan();
  const [overrides, setOverrides] = useFlowOverrides();
  const weight = (pattern: 'hinge' | 'squat' | 'press') => strength?.anchors.find(item => item.pattern === pattern)?.weightKg;
  const decided = memberLevel({
    loggedWeeks: span.loggedWeeks,
    lifts: { deadliftKg: weight('hinge'), squatKg: weight('squat'), benchKg: weight('press') },
    bodyKg: strength?.body?.weightKg,
    lifestyle: strength?.body?.lifestyle,
    graduatedFlows: span.graduatedFlows,
  });
  const goals = goalsFromFocus(focusId ? [focusId] : []);
  const place = metrics['gym.place']?.place;
  const minutes = metrics['gym.minutes']?.minutes;
  const priorities = metrics['gym.priorities']?.areas;
  const member: FlowMember = {
    level: decided.level,
    ...(goals.length ? { goals } : {}),
    ...(place ? { place } : {}),
    ...(minutes ? { minutes } : {}),
    ...(priorities?.length ? { priorities } : {}),
    gaps: span.gaps,
    overrides,
  };
  return { member, setOverrides, reason: decided.reason };
}

/** The catalogue line, with the priority finisher counted when the member still has it. */
export function memberCatalogLine(flow: CatalogFlow, priorities: readonly MuscleArea[], customflow?: Customflow) {
  const plain = catalogFlowLine(flow);
  if (!priorities.length || !flow.flowId) return plain;
  const gym = gymFlowById(flow.flowId);
  if (!gym?.items.length) return plain;
  const level = flowLevelOf(gym.level);
  if (!finisherKept(gym.items, priorities, level, customflow)) return plain;
  return catalogFlowLine(flow, memberGymItems(gym.items, priorities, level, customflow));
}
