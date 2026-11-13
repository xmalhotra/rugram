import assert from 'node:assert/strict';
import test from 'node:test';
import { cardCell, cardTable, formatFee } from '../shared/card-table';
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

function card(id: string, benefits: CardBenefit[]): CreditCard {
  return {
    id,
    name: id,
    issuer: 'Test Bank',
    annualFee: 0,
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

test('cardCell prefers the highest cashback rate and shortens other kinds', () => {
  const sample = card('sample', [
    cashback('five', 'Online shopping', 5),
    cashback('ten', 'Online shopping', 10),
    benefit({ id: 'fuel', category: 'Fuel', kind: 'Reward points' }),
  ]);
  const online = cardCell(sample, 'Online shopping');
  assert.equal(online?.label, '10%');
  assert.equal(online?.benefit.id, 'ten');
  assert.equal(online?.best, false);
  assert.equal(cardCell(sample, 'Fuel')?.label, 'Points');
  assert.equal(cardCell(sample, 'Groceries'), null);
});

test('cardTable marks the highest cashback, ties, and skips empty categories', () => {
  const low = card('low', [
    cashback('low-online', 'Online shopping', 5),
    cashback('low-groc', 'Groceries', 10),
  ]);
  const high = card('high', [
    cashback('high-online', 'Online shopping', 10),
    cashback('high-groc', 'Groceries', 10),
    benefit({ id: 'points', category: 'Fuel', kind: 'Reward points' }),
  ]);
  const rows = cardTable([low, high]);
  assert.deepEqual(
    rows.map(row => row.category),
    ['Online shopping', 'Groceries', 'Fuel'],
  );
  const online = rows[0];
  assert.equal(online.cells[0]?.label, '5%');
  assert.equal(online.cells[0]?.best, false);
  assert.equal(online.cells[1]?.label, '10%');
  assert.equal(online.cells[1]?.best, true);
  const groceries = rows[1];
  assert.equal(groceries.cells[0]?.best, true);
  assert.equal(groceries.cells[1]?.best, true);
  const fuel = rows[2];
  assert.equal(fuel.cells[0], null);
  assert.equal(fuel.cells[1]?.label, 'Points');
  assert.equal(fuel.cells[1]?.best, false);
});

test('formatFee renders unconfirmed, free, and rupee amounts', () => {
  assert.equal(formatFee(null), 'Not confirmed');
  assert.equal(formatFee(0), 'Free');
  assert.equal(formatFee(3000), '₹3,000');
});

test('cardTable covers every published card in each populated category', () => {
  const rows = cardTable(creditCards);
  assert.ok(rows.length >= 1);
  for (const row of rows) assert.equal(row.cells.length, creditCards.length);
});
