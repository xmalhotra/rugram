import type { HabitFlow } from './mobile';
import { resolveVisualFlow, visualFlowCards } from './visual-flows';
import { nutritionCollectionForId } from './nutrition-ideas';

export type FlowCardReference = { sourceFlowId: string; cardId: string; title: string };
export type PersonalFlow = {
  id: string;
  name: string;
  cards: FlowCardReference[];
  createdAt: string;
  updatedAt: string;
  /** Set on a copy saved from a community flow, at the version that was saved. */
  source?: { publishedId: string; version: number; authorName: string };
};
export type PersonalFlowAction =
  | {
      action: 'personal-flow-create';
      id: string;
      name: string;
      sourceFlowId: string;
      cardId: string;
    }
  | { action: 'personal-flow-add'; id: string; sourceFlowId: string; cardId: string }
  | { action: 'personal-flow-rename'; id: string; name: string }
  | { action: 'personal-flow-remove'; id: string; cardId: string }
  | { action: 'personal-flow-move'; id: string; cardId: string; direction: 'up' | 'down' };

export function defaultPersonalFlowName(flows: PersonalFlow[]) {
  const names = new Set(flows.map(flow => flow.name.toLocaleLowerCase()));
  let number = 1;
  while (names.has(`flow ${number}`)) number++;
  return `Flow ${number}`;
}

/** A reference is resolved against published content, never client-supplied media or text. */
export function findFlowCard(library: HabitFlow[], sourceFlowId: string, cardId: string) {
  const source = library.find(flow => flow.id === sourceFlowId);
  if (!source) return undefined;
  const current = resolveVisualFlow(source, library).cards.find(card => card.id === cardId);
  if (current) return current;
  // Existing private saves retain their original illustration and ownership; never
  // replace an old plan/recipe card with a different food under the same index.
  if (nutritionCollectionForId(source.id) && cardId.startsWith(`${source.id}:visual:`))
    return visualFlowCards(source).find(card => card.id === cardId);
  return undefined;
}

export function resolvePersonalFlow(personal: PersonalFlow, library: HabitFlow[]) {
  const cards: HabitFlow[] = [];
  const missing: FlowCardReference[] = [];
  for (const reference of personal.cards) {
    const card = findFlowCard(library, reference.sourceFlowId, reference.cardId);
    // Generated legacy IDs contain an index. Do not silently substitute a different card
    // if an editor changes that source's order or plan later.
    if (!card || (card.visualCard && card.title !== reference.title)) missing.push(reference);
    else cards.push(card);
  }
  const flow: HabitFlow = {
    id: personal.id,
    title: personal.name,
    goal: 'Your flow',
    description: 'Cards you chose, in your order.',
    steps: [],
    relatedFlowIds: cards.map(card => card.id),
  };
  return { flow, cards, missing };
}

export function updatePersonalFlows(
  previous: PersonalFlow[],
  input: PersonalFlowAction,
  now: string,
  reference?: FlowCardReference,
): PersonalFlow[] {
  const existing = previous.find(flow => flow.id === input.id);
  if (input.action === 'personal-flow-create') {
    if (!reference) throw new Error('Personal flow card is not available.');
    if (existing) {
      if (
        existing.name === input.name.trim() &&
        existing.cards.some(card => card.cardId === reference.cardId)
      )
        return previous;
      throw new Error('Personal flow already exists. Choose a new flow.');
    }
    if (previous.length >= 50) throw new Error('Personal flow limit reached (50 flows).');
    const name = input.name.trim();
    if (!name || name.length > 60) throw new Error('Personal flow name must be 1–60 characters.');
    return [
      ...previous,
      { id: input.id, name, cards: [reference], createdAt: now, updatedAt: now },
    ];
  }
  if (!existing) throw new Error('Personal flow not found.');
  let next = { ...existing, cards: [...existing.cards], updatedAt: now };
  if (input.action === 'personal-flow-add') {
    if (!reference) throw new Error('Personal flow card is not available.');
    if (existing.cards.some(card => card.cardId === reference.cardId)) return previous;
    if (existing.cards.length >= 100) throw new Error('Personal flow limit reached (100 cards).');
    next.cards.push(reference);
  } else if (input.action === 'personal-flow-rename') {
    const name = input.name.trim();
    if (!name || name.length > 60) throw new Error('Personal flow name must be 1–60 characters.');
    next = { ...next, name };
  } else if (input.action === 'personal-flow-remove') {
    next.cards = next.cards.filter(card => card.cardId !== input.cardId);
  } else {
    const index = next.cards.findIndex(card => card.cardId === input.cardId);
    if (index < 0) throw new Error('Personal flow card not found.');
    const target = index + (input.direction === 'up' ? -1 : 1);
    if (target < 0 || target >= next.cards.length) return previous;
    [next.cards[index], next.cards[target]] = [next.cards[target], next.cards[index]];
  }
  return previous.map(flow => (flow.id === next.id ? next : flow));
}
