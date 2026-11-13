/**
 * The one flow to offer before a member has a routine or a logged set.
 * It is the first row of the same default view the catalogue uses.
 */
import { targetBand, type FocusLevel } from './focus-targets';
import { defaultFlowView, type FlowFacts, type FlowMember } from './flow-defaults';

export function suggestStarter<T extends FlowFacts>(flows: readonly T[], member: FlowMember): T | null {
  return defaultFlowView(flows, member)[0] ?? null;
}

/**
 * The weekly set target shown before any area has a number of its own.
 * Ten is the low end of the regular band, the dose the map measures against once training starts.
 */
/** The same band the empty Body flow map is measured against, so the sentence and the shading agree. */
export function starterWeeklyLine(level: FocusLevel = 'beginner') {
  const band = targetBand('lats', level);
  return `${band.low}–${band.high} sets per muscle a week to start`;
}
