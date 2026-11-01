import type { FlowCardReference, PersonalFlow } from './personal-flows';

/**
 * Community flows are personal flows a member chose to publish. They only ever
 * hold references to catalogue cards, so publishing cannot introduce new,
 * unreviewed health claims; the author adds a title and a short description.
 *
 * Editing rules:
 * - A repost points at the original, so followers always see the latest version
 *   (marked "Edited", with a change list).
 * - "Add to mine" saves a copy at that version. Later edits never change the copy;
 *   the copy shows "Update available" and its owner decides whether to take it.
 * - Deleting the original removes reposts; saved copies stay as ordinary flows.
 */
export type CommunityTab = 'for-you' | 'following';

export type CommunityChange =
  | { kind: 'title'; from: string; to: string }
  | { kind: 'description' }
  | { kind: 'added'; title: string }
  | { kind: 'removed'; title: string }
  | { kind: 'reordered' };

export type CommunityVersion = {
  version: number;
  title: string;
  description: string;
  cards: FlowCardReference[];
  changes: CommunityChange[];
  createdAt: string;
};

export type CommunityFlow = {
  id: string;
  author: { id: string; name: string; handle: string };
  personalFlowId: string;
  title: string;
  description: string;
  cards: FlowCardReference[];
  version: number;
  publishedAt: string;
  editedAt: string | null;
  upvotes: number;
  reposts: number;
  viewer: { upvoted: boolean; reposted: boolean; followsAuthor: boolean; own: boolean };
};

export type CommunityFeedItem = {
  flow: CommunityFlow;
  /** Set when this entry is in the feed because someone you follow reposted it. */
  repostedBy: { id: string; name: string } | null;
  at: string;
};

/** A copy the viewer saved, compared with the original's current version. */
export type CommunityCopyStatus = {
  personalFlowId: string;
  publishedId: string;
  savedVersion: number;
  latestVersion: number | null;
};

export type CommunityFeed = {
  tab: CommunityTab;
  items: CommunityFeedItem[];
  /** The viewer's own published flows, keyed by the personal flow they came from. */
  mine: { personalFlowId: string; id: string; version: number; title: string; description: string; cards: FlowCardReference[] }[];
  copies: CommunityCopyStatus[];
};

export type CommunityAction =
  | { action: 'publish'; personalFlowId: string; description: string }
  | { action: 'unpublish'; id: string }
  | { action: 'upvote'; id: string; enabled: boolean }
  | { action: 'repost'; id: string; enabled: boolean }
  | { action: 'follow'; authorId: string; enabled: boolean }
  | { action: 'save'; id: string; personalFlowId: string }
  | { action: 'take-update'; personalFlowId: string };

export const communityLimits = {
  description: 280,
  minCards: 2,
  maxCards: 40,
  feedSize: 40,
} as const;

/** What changed between two published versions, in a form a member can read. */
export function communityChanges(
  previous: Pick<CommunityVersion, 'title' | 'description' | 'cards'>,
  next: Pick<CommunityVersion, 'title' | 'description' | 'cards'>,
): CommunityChange[] {
  const changes: CommunityChange[] = [];
  if (previous.title !== next.title)
    changes.push({ kind: 'title', from: previous.title, to: next.title });
  if (previous.description !== next.description) changes.push({ kind: 'description' });
  const before = new Set(previous.cards.map(card => card.cardId));
  const after = new Set(next.cards.map(card => card.cardId));
  for (const card of next.cards)
    if (!before.has(card.cardId)) changes.push({ kind: 'added', title: card.title });
  for (const card of previous.cards)
    if (!after.has(card.cardId)) changes.push({ kind: 'removed', title: card.title });
  const kept = (cards: FlowCardReference[], other: Set<string>) =>
    cards.filter(card => other.has(card.cardId)).map(card => card.cardId).join('|');
  if (kept(previous.cards, after) !== kept(next.cards, before)) changes.push({ kind: 'reordered' });
  return changes;
}

export function describeChange(change: CommunityChange) {
  if (change.kind === 'title') return `Renamed from “${change.from}” to “${change.to}”`;
  if (change.kind === 'description') return 'Description updated';
  if (change.kind === 'added') return `Added ${change.title}`;
  if (change.kind === 'removed') return `Removed ${change.title}`;
  return 'Cards reordered';
}

/** Whether the author's personal flow differs from what is currently published. */
export function hasUnpublishedChanges(
  personal: PersonalFlow,
  published: { title: string; cards: FlowCardReference[] } | undefined,
) {
  if (!published) return false;
  return communityChanges(
    { title: published.title, description: '', cards: published.cards },
    { title: personal.name, description: '', cards: personal.cards },
  ).length > 0;
}

/**
 * For you ranking: community signal decays with age (a gentle Hacker News style
 * curve), and flows built from cards in the viewer's own Home get a modest lift.
 */
export function forYouScore(
  flow: Pick<CommunityFlow, 'upvotes' | 'reposts' | 'publishedAt' | 'editedAt' | 'cards'>,
  now: number,
  homeFlowIds: ReadonlySet<string>,
) {
  const at = Date.parse(flow.editedAt ?? flow.publishedAt);
  const hours = Math.max(0, (now - at) / 3600000);
  const signal = 1 + flow.upvotes + 2 * flow.reposts;
  const overlap = flow.cards.filter(card => homeFlowIds.has(card.sourceFlowId)).length;
  const relevance = 1 + Math.min(overlap, 3) * 0.25;
  return (signal * relevance) / Math.pow(hours + 2, 1.5);
}

export function rankForYou(items: CommunityFeedItem[], now: number, homeFlowIds: ReadonlySet<string>) {
  return [...items].sort(
    (a, b) =>
      forYouScore(b.flow, now, homeFlowIds) - forYouScore(a.flow, now, homeFlowIds) ||
      b.flow.publishedAt.localeCompare(a.flow.publishedAt) ||
      a.flow.id.localeCompare(b.flow.id),
  );
}

/**
 * Following: newest activity first, one entry per flow. A repost by someone you
 * follow counts as activity on that flow; the newest reason wins.
 */
export function mergeFollowing(items: CommunityFeedItem[]) {
  const newest = new Map<string, CommunityFeedItem>();
  for (const item of items) {
    const current = newest.get(item.flow.id);
    if (!current || item.at > current.at) newest.set(item.flow.id, item);
  }
  return [...newest.values()].sort((a, b) => b.at.localeCompare(a.at) || a.flow.id.localeCompare(b.flow.id));
}
