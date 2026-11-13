// The public "most requested" list: which flows people are asking Qram to build next.
// Totals only: never who asked, apart from whether the viewer did.
import { catalogFlow, type CatalogLevel } from './flow-catalog';

export type InterestRequest = { userId: string; catalogFlowId: string; createdAt: string };

export type LeaderboardFlow = {
  catalogFlowId: string;
  title: string;
  level: CatalogLevel;
  rank: number;
  count: number;
  /** Requests in the last seven days: where interest is heading. */
  thisWeek: number;
  requested: boolean;
};

export type FlowLeaderboard = { flows: LeaderboardFlow[]; totalRequests: number };

const weekMs = 7 * 24 * 60 * 60 * 1000;
export const leaderboardSize = 10;

/**
 * Flows still being curated, most requested first. Ties go to the one with more requests this week, then
 * by title. Live flows drop off: they're built. Equal counts share a rank.
 */
export function flowLeaderboard(
  requests: readonly InterestRequest[],
  viewerId: string,
  now: number,
  limit = leaderboardSize,
): FlowLeaderboard {
  const tally = new Map<string, { count: number; thisWeek: number; requested: boolean }>();
  let totalRequests = 0;
  for (const request of requests) {
    const flow = catalogFlow(request.catalogFlowId);
    if (!flow || flow.status !== 'coming-soon') continue;
    const row = tally.get(request.catalogFlowId) ?? { count: 0, thisWeek: 0, requested: false };
    row.count += 1;
    if (now - Date.parse(request.createdAt) <= weekMs) row.thisWeek += 1;
    if (request.userId === viewerId) row.requested = true;
    tally.set(request.catalogFlowId, row);
    totalRequests += 1;
  }
  const sorted = [...tally.entries()]
    .map(([catalogFlowId, row]) => {
      const flow = catalogFlow(catalogFlowId)!;
      return { catalogFlowId, title: flow.title, level: flow.level, ...row };
    })
    .sort((a, b) => b.count - a.count || b.thisWeek - a.thisWeek || a.title.localeCompare(b.title));
  const flows: LeaderboardFlow[] = [];
  sorted.slice(0, limit).forEach((flow, index) => {
    const previous = flows[index - 1];
    const rank = previous && previous.count === flow.count ? previous.rank : index + 1;
    flows.push({ ...flow, rank });
  });
  return { flows, totalRequests };
}
