import assert from 'node:assert/strict';
import test from 'node:test';
import { searchCatalogue, recentSearches } from '../shared/search';
import type { MobilePayload } from '../shared/mobile';
import { flows } from '../shared/mobile';
import { exercises } from '../shared/exercises';
import { curatedFlowProducts } from '../shared/curated-flow-resources';
const data = {
  flows,
  exercises,
  products: curatedFlowProducts,
  events: [
    {
      id: 'event',
      title: 'Developer meetup',
      city: 'Hyderabad',
      venue: 'Community hall',
      topic: 'Tech',
      status: 'published',
    },
    { id: 'draft', title: 'Private draft', city: 'Hyderabad', status: 'pending' },
  ],
  demoMode: false,
} as unknown as MobilePayload;
test('known titles, exercise muscles and event cities are grouped correctly', () => {
  assert.ok(searchCatalogue(data, flows[0].title).flows.some(item => item.id === flows[0].id));
  assert.ok(
    searchCatalogue(data, curatedFlowProducts[0].title).picks.some(
      item => item.id === curatedFlowProducts[0].id,
    ),
  );
  assert.deepEqual(
    searchCatalogue(data, 'hyderabad').events.map(item => item.id),
    ['event'],
  );
  assert.ok(
    searchCatalogue(data, exercises[0].name).exercises.some(item => item.id === exercises[0].id),
  );
});
test('empty input, city and tier constraints never leak unmatched or moderated items', () => {
  assert.deepEqual(searchCatalogue(data, ' '), { flows: [], picks: [], events: [], exercises: [] });
  assert.deepEqual(searchCatalogue(data, 'meetup', { city: 'Mumbai' }).events, []);
  assert.deepEqual(searchCatalogue(data, 'Private draft').events, []);
  const result = searchCatalogue(data, '', { tier: 'Essential' });
  assert.deepEqual(result.picks, []);
  const title = curatedFlowProducts[0].title;
  assert.ok(
    searchCatalogue(data, title, { tier: 'Premium' }).picks.every(item => item.tier === 'Premium'),
  );
});
test('recent searches are trimmed, deduplicated, limited and clearable', () => {
  assert.deepEqual(recentSearches(['Whey', 'Running'], ' whey '), ['whey', 'Running']);
  assert.equal(
    recentSearches(
      Array.from({ length: 10 }, (_, i) => String(i)),
      'new',
    ).length,
    8,
  );
  assert.deepEqual(recentSearches([], ''), []);
  assert.equal(recentSearches([], 'x'.repeat(100))[0].length, 80);
});
