/**
 * How much doing earns a post. Keep these low: the point is honesty, not a hurdle.
 * Adding a row is data. The rule that reads them is shared/share-eligibility.ts.
 */
export const shareThresholds = [
  { kind: 'flow', need: 1, unit: 'session' },
  { kind: 'custom-flow', need: 1, unit: 'session' },
  { kind: 'daily-flow', need: 1, unit: 'day' },
  { kind: 'map-flow', need: 1, unit: 'pattern' },
] as const;

export type ShareThreshold = (typeof shareThresholds)[number];
export type ShareKind = ShareThreshold['kind'];

export function thresholdFor(kind: ShareKind) {
  const row = shareThresholds.find(item => item.kind === kind);
  if (!row) throw new Error('Unknown share.');
  return row;
}
