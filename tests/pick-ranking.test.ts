import assert from 'node:assert/strict';
import test from 'node:test';
import { productScore, rankProducts } from '../shared/pick-ranking';
import type { Product } from '../shared/mobile';

const now = Date.parse('2026-11-02T00:00:00Z');
const product = (id: string, extra: Partial<Product> = {}) =>
  ({
    id,
    title: id,
    category: 'Supplements',
    price: 1000,
    tier: 'Essential',
    summary: '',
    url: 'https://example.com',
    checkedAt: '2026-10-20T00:00:00Z',
    status: 'published',
    createdBy: 'admin',
    endorsements: [],
    ...extra,
  }) as Product;

test('editorial judgement and evidence outrank price alone', () => {
  const cheap = product('cheap', { price: 400 });
  const reviewed = product('reviewed', {
    assessment: {
      bestFor: 'x',
      notFor: 'y',
      whyChosen: 'Third-party tested',
      tradeoffs: [],
      criteria: ['purity', 'dose'],
      sourceUrls: ['https://example.com/test'],
      checkedAt: '2026-10-20',
    },
  });
  const endorsed = product('endorsed', {
    endorsements: [{ creatorId: 'c', creatorName: 'C', sourceUrl: 'https://x.y', disclosure: '' }],
  });
  const stale = product('stale', { checkedAt: '2024-01-01T00:00:00Z' });
  const demo = product('demo', { demo: true, price: 100 });
  const order = rankProducts([cheap, stale, demo, endorsed, reviewed], { now }).map(
    entry => entry.product.id,
  );
  assert.deepEqual(order, ['reviewed', 'cheap', 'endorsed', 'stale', 'demo']);
  assert.ok(productScore(reviewed, [reviewed], { now }).reasons.includes('Reviewed with sources'));
  assert.ok(
    productScore(cheap, [cheap, reviewed, endorsed], { now }).reasons.includes(
      'Good value for its category',
    ),
  );
});

test('featured and explicit editorial order lift a product; equal scores go cheaper first', () => {
  const a = product('a', { price: 900 });
  const b = product('b', { price: 900 });
  assert.deepEqual(
    rankProducts([a, b], { now, editorialOrder: ['b', 'a'] }).map(entry => entry.product.id),
    ['b', 'a'],
  );
  assert.deepEqual(
    rankProducts([a, b], { now, featuredIds: ['a'] }).map(entry => entry.product.id),
    ['a', 'b'],
  );
  const pricey = product('pricey', { price: 1200 });
  const same = product('same', { price: 1200 });
  assert.equal(rankProducts([pricey, same], { now })[0].product.id, 'pricey');
});
