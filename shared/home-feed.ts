import type { HabitFlow, MobilePayload } from './mobile';
import { eventsForFlow, eventCost, eventDates, picksForHabit } from './flow-connections';
import { eventWebsite } from './event-discovery';
import { morningDrinksFlowId } from './morning-drinks';
import { trainingSupplementFlowIds } from './training-supplements';
import { codingCollectionIds } from './coding-flows';
export type StoryTarget = { kind: 'flow' | 'pick' | 'event'; id: string };
export type StoryCard = {
  imageUrl?: string;
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  target: StoryTarget;
};
export type StoryGroup = { id: string; title: string; initials: string; cards: StoryCard[] };
export function storyIndex(index: number, count: number) {
  return Math.max(
    0,
    Math.min(Number.isFinite(index) ? Math.trunc(index) : 0, Math.max(0, count - 1)),
  );
}
export function stepStory(
  groups: StoryGroup[],
  groupId: string,
  index: number,
  direction: 1 | -1,
): { groupId: string; index: number } | null {
  const available = groups.filter(group => group.cards.length > 0);
  const at = available.findIndex(group => group.id === groupId);
  if (at < 0) return null;
  const current = available[at];
  const next = storyIndex(index, current.cards.length) + direction;
  if (next >= 0 && next < current.cards.length) return { groupId, index: next };
  if (direction === 1)
    return available[at + 1] ? { groupId: available[at + 1].id, index: 0 } : null;
  return available[at - 1]
    ? { groupId: available[at - 1].id, index: available[at - 1].cards.length - 1 }
    : { groupId, index: 0 };
}
export function addedFlows(data: MobilePayload) {
  const library = new Map(data.flows.map(flow => [flow.id, flow]));
  return [...new Set(data.profile.flowIds)]
    .reverse()
    .flatMap(id => (library.get(id) ? [library.get(id)!] : []));
}
/** Recognition metadata, not a daily checklist or an instruction paragraph. */
export function homeFlowSummary(flow: HabitFlow) {
  if (flow.sessionGuide) return flow.sessionGuide.format;
  if (flow.workout) return `${flow.workout.blocks.length} movements`;
  if (flow.recipe) return 'Recipe guide';
  return `${flow.steps.length} ${flow.steps.length === 1 ? 'step' : 'steps'}`;
}
function relatedIds(flow: HabitFlow, library: HabitFlow[]) {
  // The eight drink records are pages inside one flow, not separate recommendations.
  if (flow.id === morningDrinksFlowId) return [];
  if (trainingSupplementFlowIds.includes(flow.id)) return [];
  if (codingCollectionIds.includes(flow.id)) return [];
  if (flow.relatedFlowIds) return flow.relatedFlowIds;
  if (flow.recipe)
    return [
      `nutrition-protein-${flow.recipe.preference}`,
      ...library
        .filter(
          item =>
            item.recipe &&
            item.id !== flow.id &&
            item.recipe.preference === flow.recipe!.preference,
        )
        .map(item => item.id),
    ];
  if (flow.id.startsWith('nutrition-')) {
    const activity = flow.id.split('-').at(-1);
    if (['running', 'gym', 'hyrox'].includes(activity ?? ''))
      return ['pre', 'intra', 'post'].map(stage => `nutrition-${stage}-${activity}`);
    if (flow.goal === 'Everyday protein')
      return library.filter(item => item.recipe?.preference === activity).map(item => item.id);
  }
  const context: Record<string, string[]> = {
    'fitness-hyrox-base': ['nutrition-pre-hyrox', 'nutrition-intra-hyrox', 'nutrition-post-hyrox'],
    'fitness-running-start': ['nutrition-pre-running', 'nutrition-post-running'],
    'fitness-workout-start': ['nutrition-pre-gym', 'nutrition-post-gym'],
    'fitness-strength-log': ['nutrition-pre-gym', 'nutrition-post-gym'],
  };
  return context[flow.id] ?? [];
}
export function buildStoryGroups(data: MobilePayload, now = Date.now()): StoryGroup[] {
  const products = [
    ...new Map(
      [...data.products, ...data.flowResources.products].map(item => [item.id, item]),
    ).values(),
  ];
  const events = [
    ...new Map(
      [...data.events, ...data.flowResources.events].map(item => [item.id, item]),
    ).values(),
  ];
  return addedFlows(data)
    .map(flow => {
      const cards: StoryCard[] = (flow.storyCards ?? [])
        .map(card => ({
          id: `${flow.id}:editorial:${card.id}`,
          title: card.title,
          body: card.body,
          eyebrow: card.eyebrow,
          action: card.action,
          imageUrl: card.imageUrl,
          target: { kind: card.targetKind, id: card.targetId },
        }))
        .filter(card => resolveStoryTarget(data, card.target, now));
      for (const id of relatedIds(flow, data.flows)
        .filter(id => id !== flow.id && !data.profile.flowIds.includes(id))
        .slice(0, 2)) {
        const next = data.flows.find(item => item.id === id);
        if (next)
          cards.push({
            id: `${flow.id}:flow:${id}`,
            eyebrow: 'RELATED FLOW',
            title: next.title,
            body: next.description,
            action: 'Explore flow',
            target: { kind: 'flow', id },
          });
      }
      const useCases = [
        ...new Set(
          flow.steps.flatMap(step => (step.pickContext ? [step.pickContext.useCase] : [])),
        ),
      ].filter(tag => !data.profile.availableSupportIds?.includes(tag));
      const matches = [
        ...new Map(
          useCases.flatMap(tag => picksForHabit(products, tag)).map(item => [item.id, item]),
        ).values(),
      ];
      for (const pick of matches.slice(0, 2))
        cards.push({
          id: `${flow.id}:pick:${pick.id}`,
          eyebrow: 'OPTIONAL PICK',
          title: pick.title,
          body: `${pick.packLabel ?? 'Compare your options'}. ${pick.demo ? 'Demo listing only.' : 'See seller links for prices and checkout terms.'} A purchase is not required.`,
          action: 'View pick',
          target: { kind: 'pick', id: pick.id },
        });
      for (const event of eventsForFlow(events, flow, now).slice(0, 2))
        cards.push({
          id: `${flow.id}:event:${event.id}`,
          eyebrow: 'RELATED EVENT',
          title: event.title,
          body: `${eventDates(event)} · ${event.city}. ${eventCost(event)}. ${event.registrationStatus ?? 'Check provider'}.`,
          action: 'View event',
          target: { kind: 'event', id: event.id },
        });
      return {
        id: flow.id,
        title: flow.goal,
        initials: flow.goal
          .split(/\s+/)
          .slice(0, 2)
          .map(word => word[0])
          .join('')
          .toUpperCase(),
        cards,
      };
    })
    .filter(group => group.cards.length > 0);
}
export function storyReadKey(card: StoryCard) {
  const value = JSON.stringify(card);
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${card.id}@${(hash >>> 0).toString(16)}`;
}
export function storyGroupSeen(group: StoryGroup, reads: string[] = []) {
  return group.cards.length > 0 && group.cards.every(card => reads.includes(storyReadKey(card)));
}
export function resolveStoryTarget(data: MobilePayload, target: StoryTarget, now = Date.now()) {
  if (target.kind === 'flow') {
    const value = data.flows.find(item => item.id === target.id);
    return value ? { kind: 'flow' as const, value } : null;
  }
  if (target.kind === 'pick') {
    const value = [...data.flowResources.products, ...data.products].find(
      item => item.id === target.id && item.status === 'published',
    );
    return value ? { kind: 'pick' as const, value } : null;
  }
  const value = [...data.flowResources.events, ...data.events].find(
    item =>
      item.id === target.id &&
      item.status === 'published' &&
      Boolean(
        item.registrationMode === 'approval' ||
        (item.registrationUrl && eventWebsite(item.registrationUrl)),
      ) &&
      new Date(item.endsAt ?? item.startsAt).getTime() > now,
  );
  return value ? { kind: 'event' as const, value } : null;
}
