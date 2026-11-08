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
