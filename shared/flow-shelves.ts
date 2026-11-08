import type { HabitFlow } from './mobile';

/** A flow as it appears under a category, with the topic it came from. */
export type ShelfFlow = { flow: HabitFlow; focusId: string };
export type CategoryShelves = {
  /** Rows of three, paged sideways: flows to pick up next. */
  startFollowing: ShelfFlow[];
  /** Beginner-friendly flows. */
  getStarted: ShelfFlow[];
  /** Related to what you already follow. */
  recommended: ShelfFlow[];
  /** Everything in the category, by topic. */
  catalog: { focusId: string; flows: ShelfFlow[] }[];
};

const beginner = (flow: HabitFlow) =>
  /begin|getting started|start/i.test(flow.level ?? '') || /start|first|beginner/i.test(`${flow.id} ${flow.title}`);

/**
 * Splits a category's flows into Spotify-style shelves. Each flow appears in at most one of
 * the three top shelves; the catalog always lists everything.
 */
export function categoryShelves(
  rows: ShelfFlow[],
  ownedIds: readonly string[],
  library: HabitFlow[],
  limits = { startFollowing: 9, getStarted: 8, recommended: 8 },
): CategoryShelves {
  const unique = rows.filter((row, index) => rows.findIndex(other => other.flow.id === row.flow.id) === index);
  const owned = new Set(ownedIds);
  const fresh = unique.filter(row => !owned.has(row.flow.id));
  const used = new Set<string>();
  const take = (candidates: ShelfFlow[], limit: number) => {
    const picked = candidates.filter(row => !used.has(row.flow.id)).slice(0, limit);
    picked.forEach(row => used.add(row.flow.id));
    return picked;
  };
  const getStarted = take(fresh.filter(row => beginner(row.flow)), limits.getStarted);
  // Related: flows linked from, or sharing a topic with, flows you already follow.
  const ownedFlows = library.filter(flow => owned.has(flow.id));
  const linked = new Set(ownedFlows.flatMap(flow => flow.relatedFlowIds ?? []));
  const ownedTopics = new Set(unique.filter(row => owned.has(row.flow.id)).map(row => row.focusId));
  const related = fresh.filter(row => linked.has(row.flow.id) || ownedTopics.has(row.focusId));
  const recommended = take(related.length ? related : fresh.slice().reverse(), limits.recommended);
  const startFollowing = take(fresh, limits.startFollowing);
  const catalog: CategoryShelves['catalog'] = [];
  for (const row of unique) {
    const section = catalog.find(item => item.focusId === row.focusId);
    if (section) section.flows.push(row);
    else catalog.push({ focusId: row.focusId, flows: [row] });
  }
  return { startFollowing, getStarted, recommended, catalog };
}
