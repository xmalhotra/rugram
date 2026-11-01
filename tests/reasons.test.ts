import assert from 'node:assert/strict';
import test from 'node:test';
import { flowReason, pickReason, eventReason } from '../shared/reasons';
import { flows, type Product, type CityEvent } from '../shared/mobile';
test('focus reasons require a real catalogue association', () => {
  const options = [{ id: 'running', title: 'Running', flowIds: [flows[0].id] }];
  assert.equal(flowReason(flows[0], 'running', options), 'Because your focus is Running');
  assert.match(
    flowReason({ ...flows[1], level: undefined }, 'running', options),
    /Editor’s selection/,
  );
  assert.doesNotMatch(flowReason(flows[1], 'running', options), /Because/);
});
test('budget reasons require an actual fitting budget and price check', () => {
  const product = { price: 900, tier: 'Essential', checkedAt: '2026-10-16T00:00:00Z' } as Product;
  assert.equal(
    pickReason(product, 1000, new Date('2026-10-17T00:00:00Z')),
    'Fits your ₹1,000 budget · Essential tier · Checked 1 day ago',
  );
  assert.doesNotMatch(pickReason(product, 500), /Fits/);
  assert.doesNotMatch(pickReason(product), /budget/);
  assert.match(pickReason({ ...product, checkedAt: '' }), /not confirmed/);
});
test('event reasons use recorded city and IST date without fabricated trends', () => {
  assert.equal(
    eventReason({ city: 'Hyderabad', startsAt: '2026-10-17T20:00:00Z' } as CityEvent),
    'Hyderabad · Sun, 18 Oct',
  );
});
