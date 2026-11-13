/**
 * Which catalogue rows would stay out of a written Daily flow.
 * The rows stay in the catalogue. This only flags them.
 * The rule is written in docs/daily-flow-items.md.
 */
import { dailyFlowItemById } from './daily-flow-item-data';

/** Hygiene: it does not change the training outcome. Steps is listed so a later row is caught. */
export const hygieneSeedIds = [
  'water',
  'warm-water',
  'fill-a-water-bottle',
  'steps',
  'brush-teeth',
  'floss',
  'shower',
  'make-the-bed',
  'wash-face',
  'simple-skincare',
] as const;

export type SeedFlag = { id: string; name: string; reason: 'hygiene' | 'no-source' };

export function seedItemsOutsideBar(items: readonly { id: string; name: string }[]): SeedFlag[] {
  const flags: SeedFlag[] = [];
  for (const item of items) {
    if ((hygieneSeedIds as readonly string[]).includes(item.id)) flags.push({ id: item.id, name: item.name, reason: 'hygiene' });
    else if (!dailyFlowItemById(item.id)) flags.push({ id: item.id, name: item.name, reason: 'no-source' });
  }
  return flags;
}
