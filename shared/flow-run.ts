import { restFor as exerciseRestFor } from './exercise-rest';
import { exerciseTiming } from './set-detail';

/**
 * A flow run is a timestamped state machine. Nothing here starts a timer, so a
 * clock that was backgrounded catches up from `now` the next time `tick` runs.
 * Times are milliseconds for timestamps and whole seconds for card targets.
 */

export type RunCardStatus = 'pending' | 'done' | 'skipped';
export type RunPhase = 'card' | 'rest' | 'finished';

export type RunCard = {
  cardId: string;
  sourceFlowId: string;
  title: string;
  targetSeconds: number;
  status: RunCardStatus;
  seconds: number | null;
  /** Someone is typing or lifting, so the clock must not finish this card. */
  manual?: boolean;
  /** When this exercise's clock started. Optional on rows saved before it existed. */
  openedAt?: number;
  closedAt?: number;
  activeSeconds?: number;
  pausedSeconds?: number;
};

export type RunCardInput = {
  cardId: string;
  sourceFlowId: string;
  title: string;
  targetSeconds: number;
  manual?: boolean;
};

export type FlowRunState = {
  cards: RunCard[];
  index: number;
  phase: RunPhase;
  phaseStartedAt: number;
  pausedAt: number | null;
  pausedTotal: number;
  restSeconds: number;
};

function elapsedMs(state: FlowRunState, now: number) {
  const end = state.pausedAt ?? now;
  return Math.max(0, end - state.phaseStartedAt - state.pausedTotal);
}

function closeTiming(state: FlowRunState, endedAt: number) {
  const card = state.cards[state.index];
  const openedAt = card?.openedAt ?? state.phaseStartedAt;
  let pausedMs = state.pausedTotal;
  if (state.pausedAt != null) pausedMs += Math.max(0, endedAt - state.pausedAt);
  return { openedAt, closedAt: endedAt, ...exerciseTiming({ openedAt, closedAt: endedAt, pausedMs }) };
}

function finishCard(state: FlowRunState, status: RunCardStatus, seconds: number | null, endedAt: number): RunCard[] {
  const timing = closeTiming(state, endedAt);
  return state.cards.map((card, cardIndex) =>
    cardIndex === state.index ? { ...card, status, seconds, ...timing } : card,
  );
}

/** Rest begins at `endedAt`, unless this was the last card or a manual card. Pause does not carry over. */
function advanceAfterCard(state: FlowRunState, cards: RunCard[], endedAt: number): FlowRunState {
  const next = state.index + 1;
  const manual = cards[state.index]?.manual === true;
  if (next >= cards.length) {
    return {
      ...state,
      cards,
      phase: 'finished',
      phaseStartedAt: endedAt,
      pausedAt: null,
      pausedTotal: 0,
    };
  }
  if (manual) {
    return {
      ...state,
      cards,
      index: next,
      phase: 'card',
      phaseStartedAt: endedAt,
      pausedAt: null,
      pausedTotal: 0,
    };
  }
  return {
    ...state,
    cards,
    index: next,
    phase: 'rest',
    phaseStartedAt: endedAt,
    pausedAt: null,
    pausedTotal: 0,
  };
}

export function startRun(cards: RunCardInput[], restSeconds: number, now: number): FlowRunState {
  const built: RunCard[] = cards.map(card => ({
    cardId: card.cardId,
    sourceFlowId: card.sourceFlowId,
    title: card.title,
    targetSeconds: Math.max(0, Math.round(card.targetSeconds)),
    status: 'pending',
    seconds: null,
    ...(card.manual ? { manual: true } : {}),
  }));
  if (!built.length) {
    return {
      cards: [],
      index: 0,
      phase: 'finished',
      phaseStartedAt: now,
      pausedAt: null,
      pausedTotal: 0,
      restSeconds: Math.max(0, Math.round(restSeconds)),
    };
  }
  return {
    cards: built,
    index: 0,
    phase: 'card',
    phaseStartedAt: now,
    pausedAt: null,
    pausedTotal: 0,
    restSeconds: Math.max(0, Math.round(restSeconds)),
  };
}

/** Applies every card and rest the clock has already passed, including after a long absence. */
export function tick(state: FlowRunState, now: number): FlowRunState {
  if (state.pausedAt != null || state.phase === 'finished') return state;
  let current = state;
  const steps = state.cards.length * 2 + 2;
  for (let step = 0; step < steps; step += 1) {
    if (current.phase === 'finished') break;
    if (current.phase === 'card') {
      const card = current.cards[current.index];
      if (!card || card.status !== 'pending') break;
      if (card.manual) break;
      const end = current.phaseStartedAt + current.pausedTotal + card.targetSeconds * 1000;
      if (now < end) break;
      const cards = finishCard(current, 'done', card.targetSeconds, end);
      current = advanceAfterCard(current, cards, end);
      continue;
    }
    const end = current.phaseStartedAt + current.pausedTotal + current.restSeconds * 1000;
    if (now < end) break;
    current = {
      ...current,
      phase: 'card',
      phaseStartedAt: end,
      pausedAt: null,
      pausedTotal: 0,
    };
  }
  return current;
}

/** Records the active time so far and moves on. Pause time is left out. */
export function doneCard(state: FlowRunState, now: number): FlowRunState {
  if (state.phase !== 'card') return state;
  const card = state.cards[state.index];
  if (!card || card.status !== 'pending') return state;
  const seconds = Math.max(0, Math.round(elapsedMs(state, now) / 1000));
  return advanceAfterCard(state, finishCard(state, 'done', seconds, now), now);
}

/** Moves on without a time. The card is skipped. */
export function skipCard(state: FlowRunState, now: number): FlowRunState {
  if (state.phase !== 'card') return state;
  const card = state.cards[state.index];
  if (!card || card.status !== 'pending') return state;
  return advanceAfterCard(state, finishCard(state, 'skipped', null, now), now);
}

/** Manual exercises start their clock when the countdown ends. Timed cards are left as they are. */
export function beginCardClock(state: FlowRunState, now: number): FlowRunState {
  if (state.phase !== 'card' || state.pausedAt != null) return state;
  const card = state.cards[state.index];
  if (!card?.manual || card.status !== 'pending' || card.openedAt != null) return state;
  const openedAt = Math.max(state.phaseStartedAt, now);
  const cards = state.cards.map((item, index) => (index === state.index ? { ...item, openedAt } : item));
  return { ...state, cards, phaseStartedAt: openedAt, pausedTotal: 0 };
}

/** Ends the rest early and starts the card it was waiting on. */
export function endRest(state: FlowRunState, now: number): FlowRunState {
  if (state.phase !== 'rest') return state;
  return { ...state, phase: 'card', phaseStartedAt: now, pausedAt: null, pausedTotal: 0 };
}

export function pauseRun(state: FlowRunState, now: number): FlowRunState {
  if (state.pausedAt != null || state.phase === 'finished') return state;
  return { ...state, pausedAt: now };
}

export function resumeRun(state: FlowRunState, now: number): FlowRunState {
  if (state.pausedAt == null) return state;
  const added = Math.max(0, now - state.pausedAt);
  return { ...state, pausedAt: null, pausedTotal: state.pausedTotal + added };
}

/** Active seconds on the current card or rest, with pause time left out. */
export function elapsedSeconds(state: FlowRunState, now: number) {
  if (state.phase === 'finished') return 0;
  return Math.max(0, Math.floor(elapsedMs(state, now) / 1000));
}

export function remainingSeconds(state: FlowRunState, now: number) {
  if (state.phase === 'finished') return 0;
  const elapsed = elapsedMs(state, now) / 1000;
  const limit =
    state.phase === 'rest' ? state.restSeconds : (state.cards[state.index]?.targetSeconds ?? 0);
  return Math.max(0, Math.ceil(limit - elapsed - 1e-9));
}

/** Skipped cards do not block a post. At least one card has to be Done, after the run has finished. */
export function canPost(state: FlowRunState) {
  return state.phase === 'finished' && state.cards.some(card => card.status === 'done');
}

export type GymSetInput = {
  exerciseId: string;
  sets: number;
  restSeconds?: number;
  /** Shared with the neighbours that form one superset. A label with no neighbour does nothing. */
  superset?: string;
};

export type GymSetVisit = {
  exerciseId: string;
  /** 0-based set inside that exercise. */
  setIndex: number;
  /** Rest after this set, before the next visit. 0 means go straight to the partner. */
  restAfter: number;
  superset: string | null;
  /** 1-based place in the group. Null when this visit is not in a superset. */
  place: number | null;
  size: number | null;
};

function itemRest(item: GymSetInput) {
  return item.restSeconds ?? exerciseRestFor(item.exerciseId);
}

function supersetLabel(item: GymSetInput) {
  const label = item.superset?.trim();
  return label ? label : null;
}

/**
 * The order sets are performed. Neighbours that share a superset label alternate:
 * A1 set 1, A2 set 1, rest, A1 set 2, A2 set 2, rest. There is no rest inside the
 * pair. The rest after the pair is the longer of the two rests. When one exercise
 * has more sets, it finishes those alone on its own rest.
 * An exercise with no shared label keeps every set together, in flow order.
 * The label stays on the item, so a pair travels with those items. Neighbours still
 * pair after a reorder, including when the two swap places. Once a reorder puts
 * something between them, each one runs as its own straight sets.
 */
export function gymSetOrder(items: GymSetInput[]): GymSetVisit[] {
  const visits: GymSetVisit[] = [];
  let index = 0;
  while (index < items.length) {
    const label = supersetLabel(items[index]);
    let end = index + 1;
    if (label) {
      while (end < items.length && supersetLabel(items[end]) === label) end += 1;
    }
    const group = items.slice(index, label && end > index + 1 ? end : index + 1);
    if (label && group.length > 1) {
      const maxSets = Math.max(...group.map(item => Math.max(0, item.sets)));
      for (let setIndex = 0; setIndex < maxSets; setIndex += 1) {
        const round = group.filter(item => item.sets > setIndex);
        round.forEach((item, roundIndex) => {
          const lastInRound = roundIndex === round.length - 1;
          const restAfter = !lastInRound ? 0 : round.length === 1 ? itemRest(item) : Math.max(...round.map(itemRest));
          visits.push({
            exerciseId: item.exerciseId,
            setIndex,
            restAfter,
            superset: label,
            place: group.indexOf(item) + 1,
            size: group.length,
          });
        });
      }
      index = end;
      continue;
    }
    const item = items[index];
    const rest = itemRest(item);
    for (let setIndex = 0; setIndex < Math.max(0, item.sets); setIndex += 1) {
      visits.push({
        exerciseId: item.exerciseId,
        setIndex,
        restAfter: rest,
        superset: null,
        place: null,
        size: null,
      });
    }
    index += 1;
  }
  return visits;
}

/**
 * Where to go after `exerciseId` has just logged another set.
 * `logged` already includes that set. Counts are not a quota: a superset keeps
 * alternating past the plan. The member with fewer logged sets is next, and there
 * is no rest until everyone still in the group is level. Then the first of them
 * goes again and a rest is due. `closed` exercises have been left, so the partner
 * finishes alone on a rest. A straight exercise stays put, and a rest is due.
 */
export function nextAfterSet(
  items: readonly GymSetInput[],
  logged: Readonly<Record<string, number>>,
  exerciseId: string,
  closed: readonly string[] = [],
): { exerciseId: string; rest: boolean } {
  const left = new Set(closed);
  let index = 0;
  while (index < items.length) {
    const label = supersetLabel(items[index]);
    let end = index + 1;
    if (label) {
      while (end < items.length && supersetLabel(items[end]) === label) end += 1;
    }
    const span = label && end > index + 1 ? items.slice(index, end) : [items[index]];
    if (!span.some(item => item.exerciseId === exerciseId)) {
      index = label && end > index + 1 ? end : index + 1;
      continue;
    }
    const live = span.filter(item => !left.has(item.exerciseId));
    if (live.length < 2) return { exerciseId, rest: true };
    const mine = logged[exerciseId] ?? 0;
    const counts = live.map(item => logged[item.exerciseId] ?? 0);
    if (counts.every(count => count === mine)) return { exerciseId: live[0].exerciseId, rest: true };
    const least = Math.min(...counts);
    const next = live.find(item => (logged[item.exerciseId] ?? 0) === least) ?? live[0];
    return { exerciseId: next.exerciseId, rest: false };
  }
  return { exerciseId, rest: true };
}

function keysStayTogether(keys: readonly string[], orderedKeys: readonly string[]) {
  const indexes = keys.map(key => orderedKeys.indexOf(key));
  if (indexes.some(index => index < 0)) return false;
  const min = Math.min(...indexes);
  const max = Math.max(...indexes);
  return max - min + 1 === keys.length;
}

/**
 * Superset labels whose members were neighbours in `source` and are not neighbours in `ordered`.
 * Order inside the pair can change. A label is listed once. `gymSetOrder` then runs each side
 * as straight sets, because only neighbours share a pair.
 */
export function splitSupersetLabels<T extends { superset?: string }>(
  source: readonly T[],
  ordered: readonly T[],
  keyOf: (item: T) => string,
): string[] {
  const orderedKeys = ordered.map(keyOf);
  const split: string[] = [];
  let index = 0;
  while (index < source.length) {
    const label = source[index].superset?.trim();
    let end = index + 1;
    if (label) {
      while (end < source.length && source[end].superset?.trim() === label) end += 1;
    }
    if (label && end - index > 1) {
      const keys = source.slice(index, end).map(keyOf);
      if (!keysStayTogether(keys, orderedKeys) && !split.includes(label)) split.push(label);
    }
    index = label && end > index + 1 ? end : index + 1;
  }
  return split;
}

/** "Superset A · 1 of 2" for an exercise that is in a group, otherwise null. */
export function supersetCaption(visits: GymSetVisit[], exerciseId: string) {
  const visit = visits.find(item => item.exerciseId === exerciseId && item.superset && item.place != null && item.size != null);
  if (!visit?.superset || visit.place == null || visit.size == null) return null;
  return `Superset ${visit.superset} · ${visit.place} of ${visit.size}`;
}

/** The other member of this exercise's superset, the one named on the next-up line. */
export function supersetPartner(visits: GymSetVisit[], exerciseId: string) {
  const index = visits.findIndex(visit => visit.exerciseId === exerciseId && visit.superset);
  if (index < 0) return null;
  const label = visits[index].superset;
  let start = index;
  while (start > 0 && visits[start - 1].superset === label) start -= 1;
  let end = index;
  while (end + 1 < visits.length && visits[end + 1].superset === label) end += 1;
  const members: string[] = [];
  for (let cursor = start; cursor <= end; cursor += 1) {
    const id = visits[cursor].exerciseId;
    if (!members.includes(id)) members.push(id);
  }
  if (members.length < 2) return null;
  const place = members.indexOf(exerciseId);
  return members[(place + 1) % members.length] ?? null;
}

/** Marks one card done without moving on. Used when a superset member still has a partner to do. */
export function completeCard(state: FlowRunState, index: number, now: number): FlowRunState {
  const card = state.cards[index];
  if (!card || card.status !== 'pending') return state;
  if (index === state.index && state.phase === 'card') {
    const seconds = Math.max(0, Math.round(elapsedMs(state, now) / 1000));
    return { ...state, cards: finishCard(state, 'done', seconds, now) };
  }
  const cards = state.cards.map((item, cardIndex) =>
    cardIndex === index ? { ...item, status: 'done' as const, seconds: item.seconds ?? 0, closedAt: now } : item,
  );
  return { ...state, cards };
}

/** Shows a pending card with no rest in between. A superset partner is reached this way. */
export function showCard(state: FlowRunState, index: number, now: number): FlowRunState {
  if (state.phase === 'finished') return state;
  if (index < 0 || index >= state.cards.length) return state;
  if (state.cards[index]?.status !== 'pending') return state;
  if (state.index === index && state.phase === 'card' && state.pausedAt == null) return state;
  return {
    ...state,
    index,
    phase: 'card',
    phaseStartedAt: now,
    pausedAt: null,
    pausedTotal: 0,
  };
}

/** Ends the run once every card is done or skipped. */
export function finishRunIfDone(state: FlowRunState, now: number): FlowRunState {
  if (state.phase === 'finished') return state;
  if (state.cards.some(card => card.status === 'pending')) return state;
  return {
    ...state,
    phase: 'finished',
    phaseStartedAt: now,
    pausedAt: null,
    pausedTotal: 0,
  };
}
