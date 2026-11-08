import assert from 'node:assert/strict';
import test from 'node:test';
import { cardShelves, walletCheatSheet } from '../shared/card-shelves';
import { creditCards, type CardBenefit, type CreditCard } from '../shared/credit-cards';

function benefit(
  overrides: Pick<CardBenefit, 'id' | 'category' | 'kind'> & Partial<CardBenefit>,
): CardBenefit {
  return {
    title: overrides.id,
    summary: 'Summary',
    conditions: 'Conditions',
    sourceUrl: 'https://example.com/terms',
    ...overrides,
  };
}

function card(
  id: string,
  annualFee: number,
  benefits: CardBenefit[],
): CreditCard {
  return {
    id,
    name: id,
    issuer: 'Test Bank',
    annualFee,
    joiningFee: null,
    feeNote: '',
    waiver: '',
    checkedAt: '2026-01-01',
    revision: 'test',
    sourceUrl: 'https://example.com',
    benefits,
  };
}

const cashback = (id: string, category: CardBenefit['category'], rate: number): CardBenefit =>
  benefit({
    id,
    category,
    kind: 'Cashback',
    cashback: { rate, minimumTransaction: 0 },
  });

test('shelves list each populated category, then lifetime free, and a card can sit on several', () => {
  const groceries = card('groceries', 500, [
    benefit({ id: 'basket', category: 'Groceries', kind: 'Instant discount' }),
    benefit({ id: 'screen', category: 'Movies', kind: 'Instant discount' }),
  ]);
  const paid = card('paid', 1000, [cashback('shop', 'Online shopping', 5)]);
  const free = card('free', 0, [cashback('shop-free', 'Online shopping', 2)]);
  const shelves = cardShelves([groceries, paid, free]);
  assert.deepEqual(
    shelves.map(shelf => shelf.id),
    ['online-shopping', 'groceries', 'movies', 'lifetime-free'],
  );
  assert.deepEqual(shelves.find(shelf => shelf.id === 'groceries')?.cards.map(item => item.id), [
    'groceries',
  ]);
  assert.deepEqual(shelves.find(shelf => shelf.id === 'movies')?.cards.map(item => item.id), [
    'groceries',
  ]);
  assert.deepEqual(
    shelves.find(shelf => shelf.id === 'online-shopping')?.cards.map(item => item.id),
    ['paid', 'free'],
  );
  assert.deepEqual(
    shelves.find(shelf => shelf.id === 'lifetime-free')?.cards.map(item => item.id),
    ['free'],
  );
  assert.equal(
    shelves.find(shelf => shelf.id === 'fuel'),
    undefined,
  );
});

test('a higher cashback rate ranks ahead of a cheaper card', () => {
  const cheap = card('cheap', 0, [cashback('low', 'Fuel', 2)]);
  const rich = card('rich', 2000, [cashback('high', 'Fuel', 10)]);
  const [shelf] = cardShelves([cheap, rich]);
  assert.deepEqual(
    shelf.cards.map(item => item.id),
    ['rich', 'cheap'],
  );
});

test('the cheat sheet names the better held card and an empty wallet has no rows', () => {
  const cheap = card('cheap', 0, [cashback('low', 'Online shopping', 2)]);
  const rich = card('rich', 2000, [cashback('high', 'Online shopping', 10)]);
  const rows = walletCheatSheet([cheap, rich]);
  assert.deepEqual(rows, [
    { category: 'Online shopping', card: rich, label: '10%' },
  ]);
  assert.deepEqual(walletCheatSheet([]), []);
});

test('the published cards fill these shelves and no empty category', () => {
  const shelves = cardShelves(creditCards);
  assert.deepEqual(
    shelves.map(shelf => [shelf.title, shelf.cards.map(card => card.id)]),
    [
      ['Online shopping', ['sbi-cashback', 'hdfc-swiggy-blck', 'amazon-pay-icici', 'flipkart-axis', 'flipkart-sbi']],
      ['Groceries', ['axis-select']],
      ['Food & Instamart', ['hdfc-swiggy-blck']],
      ['Bills & recharges', ['airtel-axis', 'phonepe-hdfc-ultimo']],
      ['Fuel', ['rbl-indianoil-xtra']],
      ['Travel', ['axis-select']],
      ['Movies', ['axis-select']],
      ['Lifetime Free', ['amazon-pay-icici']],
    ],
  );
});
