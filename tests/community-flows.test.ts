import assert from 'node:assert/strict';
import test from 'node:test';
import {
  communityChanges,
  curateByKeywords,
  describeChange,
  promptTerms,
  forYouScore,
  hasUnpublishedChanges,
  mergeTimeline,
  mergeFollowing,
  rankForYou,
  type CommunityFeedItem,
  type CommunityFlow,
} from '../shared/community-flows';

const card = (cardId: string, sourceFlowId = 'source') => ({ sourceFlowId, cardId, title: cardId });

function flow(id: string, overrides: Partial<CommunityFlow> = {}): CommunityFlow {
  return {
    id,
    author: { id: 'author', name: 'Author', handle: 'author' },
    personalFlowId: `personal-${id}`,
    title: id,
    description: '',
    cards: [card('a'), card('b')],
    version: 1,
    publishedAt: '2026-11-01T00:00:00.000Z',
    editedAt: null,
    upvotes: 0,
    reposts: 0,
    viewer: { upvoted: false, reposted: false, followsAuthor: false, own: false },
    ...overrides,
  };
}
const item = (value: CommunityFlow, at: string, repostedBy: CommunityFeedItem['repostedBy'] = null) => ({
  flow: value,
  at,
  repostedBy,
});

test('edits are described as title, description, added, removed and reordered changes', () => {
  const before = { title: 'Morning', description: 'old', cards: [card('a'), card('b'), card('c')] };
  assert.deepEqual(communityChanges(before, before), []);
  const changes = communityChanges(before, {
    title: 'Calm morning',
    description: 'new',
    cards: [card('c'), card('a'), card('d')],
  });
  assert.deepEqual(
    changes.map(change => change.kind),
    ['title', 'description', 'added', 'removed', 'reordered'],
  );
  assert.deepEqual(changes.map(describeChange), [
    'Renamed from “Morning” to “Calm morning”',
    'Description updated',
    'Added d',
    'Removed b',
    'Cards reordered',
  ]);
  // Removing a card alone does not also count as a reorder.
  assert.deepEqual(
    communityChanges(before, { ...before, cards: [card('a'), card('c')] }).map(change => change.kind),
    ['removed'],
  );
});

test('the author sees unpublished changes only when title or cards differ', () => {
  const personal = {
    id: 'personal-1',
    name: 'Morning',
    cards: [card('a'), card('b')],
    createdAt: '',
    updatedAt: '',
  };
  assert.equal(hasUnpublishedChanges(personal, undefined), false);
  assert.equal(hasUnpublishedChanges(personal, { title: 'Morning', cards: personal.cards }), false);
  assert.equal(hasUnpublishedChanges(personal, { title: 'Evening', cards: personal.cards }), true);
  assert.equal(hasUnpublishedChanges(personal, { title: 'Morning', cards: [card('a')] }), true);
});

test('For you rewards upvotes, reposts and relevance, and decays with age', () => {
  const now = Date.parse('2026-11-02T00:00:00.000Z');
  const none = new Set<string>();
  const quiet = flow('quiet');
  const liked = flow('liked', { upvotes: 5 });
  const shared = flow('shared', { reposts: 3 });
  assert.ok(forYouScore(liked, now, none) > forYouScore(quiet, now, none));
  assert.ok(forYouScore(shared, now, none) > forYouScore(liked, now, none), 'a repost counts double');
  const old = flow('old', { upvotes: 5, publishedAt: '2026-10-01T00:00:00.000Z' });
  assert.ok(forYouScore(liked, now, none) > forYouScore(old, now, none));
  const relevant = flow('relevant', { cards: [card('a', 'home'), card('b', 'home')] });
  assert.ok(forYouScore(relevant, now, new Set(['home'])) > forYouScore(quiet, now, new Set(['home'])));
  // An edit counts as fresh activity.
  const edited = flow('edited', { publishedAt: '2026-10-01T00:00:00.000Z', editedAt: '2026-11-01T00:00:00.000Z' });
  assert.equal(forYouScore(edited, now, none), forYouScore(quiet, now, none));
  assert.deepEqual(
    rankForYou([quiet, shared, liked].map(value => item(value, value.publishedAt)), now, none).map(
      entry => entry.flow.id,
    ),
    ['shared', 'liked', 'quiet'],
  );
});

test('Following keeps one entry per flow, newest reason first', () => {
  const a = flow('a');
  const b = flow('b');
  const merged = mergeFollowing([
    item(a, '2026-11-01T01:00:00.000Z'),
    item(b, '2026-11-01T02:00:00.000Z'),
    item(a, '2026-11-01T03:00:00.000Z', { id: 'fan', name: 'Fan' }),
  ]);
  assert.deepEqual(
    merged.map(entry => [entry.flow.id, entry.repostedBy?.name ?? null]),
    [
      ['a', 'Fan'],
      ['b', null],
    ],
  );
});

test('keyword curation ranks close matches, drops incidental ones and keeps feed order on ties', () => {
  assert.deepEqual(promptTerms('Show me a CALM morning, calm!'), ['calm', 'morning']);
  const morning = flow('morning', { title: 'Calm morning', description: 'Water before work' });
  const workout = flow('workout', { title: 'Strength workout' });
  const run = flow('run', { title: 'Easy run week', cards: [card('Run / walk', 'running-styles')] });
  const items = [workout, run, morning].map(value => item(value, value.publishedAt));
  assert.deepEqual(
    curateByKeywords('a calm morning before work', items).map(pick => pick.flowId),
    ['morning'],
    'a one-word "work" hit on a workout is dropped',
  );
  assert.equal(curateByKeywords('easy runs', items)[0].reason, 'Matches “easy”, “runs”');
  assert.deepEqual(curateByKeywords('knitting', items), []);
  const twin = flow('twin', { title: 'Calm morning' });
  assert.deepEqual(
    curateByKeywords('calm morning', [item(twin, ''), item(morning, '')]).map(pick => pick.flowId),
    ['twin', 'morning'],
  );
});

test('timelines interleave posts and logged activity, newest first', () => {
  const post = item(flow('post'), '2026-11-01T02:00:00.000Z');
  const activity = (id: string, at: string) => ({
    id,
    user: { id: 'u', name: 'U', handle: 'u' },
    personalFlowId: 'personal-1',
    publishedId: null,
    title: 'Run',
    cards: [card('a')],
    total: 2,
    note: '',
    at,
    viewer: { own: false },
  });
  assert.deepEqual(
    mergeTimeline([post], [activity('old', '2026-11-01T01:00:00.000Z'), activity('new', '2026-11-01T03:00:00.000Z')]).map(
      entry => (entry.kind === 'post' ? entry.item.flow.id : entry.activity.id),
    ),
    ['new', 'post', 'old'],
  );
});
