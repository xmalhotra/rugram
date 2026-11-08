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

/**
 * A finished flow run posted to the timeline.
 * It records the cards marked Done and an optional note. It never changes the flow.
 */
export type CommunityActivity = {
  id: string;
  user: CommunityFlow['author'];
  personalFlowId: string;
  /** The published sequence it came from, when there is one to open. */
  publishedId: string | null;
  title: string;
  cards: FlowCardReference[];
  total: number;
  note: string;
  at: string;
  viewer: { own: boolean };
};

export type CommunityFeed = {
  tab: CommunityTab;
  items: CommunityFeedItem[];
  /** Logged activity from you and people you follow; empty on For you. */
  activities: CommunityActivity[];
  /** The viewer's own published flows, keyed by the personal flow they came from. */
  mine: { personalFlowId: string; id: string; version: number; title: string; description: string; cards: FlowCardReference[] }[];
  copies: CommunityCopyStatus[];
};

/** A member's profile: who they are and their own posts and reposts, newest first. */
export type CommunityMember = {
  member: CommunityFlow['author'] & {
    followers: number;
    following: number;
    published: number;
    /** Upvotes across everything they published. */
    upvotes: number;
    followedByViewer: boolean;
    own: boolean;
  };
  items: CommunityFeedItem[];
  activities: CommunityActivity[];
  copies: CommunityCopyStatus[];
};

export type CommunityAction =
  | { action: 'publish'; personalFlowId: string; description: string }
  | { action: 'unpublish'; id: string }
  | { action: 'upvote'; id: string; enabled: boolean }
  | { action: 'repost'; id: string; enabled: boolean }
  | { action: 'follow'; authorId: string; enabled: boolean }
  | { action: 'save'; id: string; personalFlowId: string }
  | { action: 'take-update'; personalFlowId: string }
  | { action: 'unlog'; id: string };

/** Posts and activity in one newest-first timeline. */
export type TimelineEntry =
  | { kind: 'post'; at: string; item: CommunityFeedItem }
  | { kind: 'activity'; at: string; activity: CommunityActivity };
export function mergeTimeline(
  items: CommunityFeedItem[],
  activities: CommunityActivity[],
): TimelineEntry[] {
  return [
    ...items.map(item => ({ kind: 'post' as const, at: item.at, item })),
    ...activities.map(activity => ({ kind: 'activity' as const, at: activity.at, activity })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

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

/**
 * Prompted curation: a member describes what they want and gets a short list of
 * published sequences. The model only reorders and explains flows that exist;
 * without a model, `curateByKeywords` matches the prompt against the text.
 */
export type CuratedItem = CommunityFeedItem & { reason: string };
export type CommunityCuration = {
  prompt: string;
  summary: string;
  engine: 'ai' | 'keywords';
  items: CuratedItem[];
  copies: CommunityCopyStatus[];
};
export const curationLimits = { prompt: 200, picks: 8 };

const stopWords = new Set(
  'a an and are for from get give how i in is it me my of on or show some that the this to want what with you your'.split(
    ' ',
  ),
);
export function promptTerms(prompt: string) {
  const words = prompt.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return [...new Set(words.filter(word => word.length > 2 && !stopWords.has(word)))];
}

/** Matches whole words and simple plurals ("runs" finds "run"). */
function mentions(text: string, term: string) {
  const stem = term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : term;
  return new RegExp(`\\b${stem}`, 'i').test(text);
}

export function curateByKeywords(
  prompt: string,
  items: CommunityFeedItem[],
): { flowId: string; reason: string }[] {
  const terms = promptTerms(prompt);
  return (
    items
      .map((item, rank) => {
        const { title, description, cards } = item.flow;
        const cardText = cards
          .map(card => `${card.title} ${card.sourceFlowId.replace(/-/g, ' ')}`)
          .join(' ');
        const matched = terms.filter(
          term => mentions(title, term) || mentions(description, term) || mentions(cardText, term),
        );
        const score = terms.reduce(
          (sum, term) =>
            sum +
            (mentions(title, term) ? 3 : 0) +
            (mentions(description, term) ? 2 : 0) +
            (mentions(cardText, term) ? 1 : 0),
          0,
        );
        return { item, rank, score, matched };
      })
      .filter(entry => entry.score > 0)
      // Feed rank breaks ties, so upvotes and reposts still count.
      .sort((a, b) => b.score - a.score || a.rank - b.rank)
      // Drop incidental one-word hits once a closer match exists.
      .filter((entry, _, sorted) => entry.score * 2 >= sorted[0].score)
      .slice(0, curationLimits.picks)
      .map(({ item, matched }) => ({
        flowId: item.flow.id,
        reason: `Matches ${matched.map(term => `“${term}”`).join(', ')}`,
      }))
  );
}
