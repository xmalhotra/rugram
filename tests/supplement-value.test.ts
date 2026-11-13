import assert from 'node:assert/strict';
import test from 'node:test';
import { againstTypicalLabel, packGrams, pricePer100g, valueEntries } from '../shared/supplement-value';
import type { Product } from '../shared/mobile';

const product = (id: string, packLabel: string, price: number) =>
  ({ id, title: id, packLabel, price }) as Product;

test('pack sizes are read only when they are in grams', () => {
  assert.equal(packGrams({ packLabel: '250 g' }), 250);
  assert.equal(packGrams({ packLabel: '1 kg' }), 1000);
  assert.equal(packGrams({ packLabel: '907 g · 2 lb' }), 907);
  assert.equal(packGrams({ packLabel: '25 servings' }), null);
  assert.equal(packGrams({ packLabel: '1 box' }), null);
  assert.equal(pricePer100g({ packLabel: '250 g', price: 500 }), 200);
  assert.equal(pricePer100g({ packLabel: '1 box', price: 500 }), null);
});

test('value is cheapest first against the middle price, leaving out unknown packs', () => {
  const entries = valueEntries([
    product('dear', '100 g', 400),
    product('box', '1 box', 100),
    product('cheap', '1 kg', 1000),
    product('mid', '250 g', 500),
  ]);
  assert.deepEqual(entries.map(entry => [entry.id, entry.per100g, entry.againstTypical]), [
    ['cheap', 100, -50],
    ['mid', 200, 0],
    ['dear', 400, 100],
  ]);
  assert.deepEqual(valueEntries([product('only', '1 kg', 1000)]), []);
  assert.equal(againstTypicalLabel(-50), '50% below typical');
  assert.equal(againstTypicalLabel(0), 'Typical price');
});
