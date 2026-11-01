import assert from 'node:assert/strict';
import test from 'node:test';
import { buyingComparison, newcomerDecision } from '../shared/pick-buying';
import { curatedEverydayProducts } from '../shared/curated-everyday-products';
import type { Product } from '../shared/mobile';

const creatine = curatedEverydayProducts.find(product => product.id === 'pick-creatine-nakpro')!;
const magnesium = curatedEverydayProducts.find(product => product.id === 'pick-magnesium-wellbeing')!;

test('a newcomer comparison prices the pack and refuses a brand story as proof', () => {
  const [getting, paying, money, process, trust] = buyingComparison([creatine]);
  assert.equal(getting.label, 'What you are getting');
  assert.match(getting.values[0], /Creatine monohydrate/);
  assert.match(paying.values[0], /250 g/);
  assert.match(money.values[0], /per 100 g/);
  assert.match(process.values[0], /Micronised|monohydrate/i);
  assert.match(trust.values[0], /not a test/);
  assert.match(newcomerDecision(creatine), /unflavoured creatine monohydrate/);
  assert.match(newcomerDecision(magnesium), /elemental magnesium/);
});

test('a named process is the trust line, and a missing amount is not turned into a unit price', () => {
  const named = {
    ...creatine,
    variantLabel: 'Creapure creatine monohydrate',
    packLabel: '60 capsules',
    specifications: [{ label: 'Listed form', value: 'Creapure', sourceUrl: creatine.url, checkedAt: creatine.checkedAt }],
  } as Product;
  const rows = buyingComparison([named]);
  assert.match(rows[3].values[0], /Creapure/);
  assert.match(rows[4].values[0], /process name/);
  assert.match(rows[2].values[0], /Pack price only/);
});
