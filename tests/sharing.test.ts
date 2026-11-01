import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { shareFlow, sharePick, shareEvent, contentLink } from '../shared/sharing';
import type { HabitFlow, Product, CityEvent } from '../shared/mobile';
test('flow messages include context and an encoded canonical link', () => {
  const result = shareFlow({ id: 'one space', title: 'A flow', steps: [{ id: 'a' }] } as HabitFlow);
  assert.match(result.message, /1 step ·/);
  assert.match(result.message, /qram:\/\/flow\/one%20space/);
  assert.equal(contentLink('pick', 'a/b'), 'qram://pick/a%2Fb');
});
test('pick sharing uses price-check context and unknown prices never become free', () => {
  const result = sharePick(
    { id: 'one', title: 'A pick', price: 1000, checkedAt: '2026-10-16T00:00:00Z' } as Product,
    new Date('2026-10-17T00:00:00Z'),
  );
  assert.match(result.message, /₹1,000/);
  assert.match(result.message, /Checked 1 day ago/);
  assert.match(
    sharePick({ id: 'two', title: 'Unknown', price: NaN } as Product).message,
    /Price unknown/,
  );
});
test('event sharing has IST time and venue but never guest or registration data', () => {
  const result = shareEvent({
    id: 'event',
    title: 'Tech meetup',
    startsAt: '2026-10-18T04:30:00Z',
    city: 'Hyderabad',
    venue: 'Community hall',
    guests: ['Private guest'],
  } as unknown as CityEvent);
  assert.match(result.message, /IST/);
  assert.match(result.message, /Community hall/);
  assert.doesNotMatch(result.message, /Private guest/);
});
test('ordinary sign-in lands in a real app root before parameterised link routes', () => {
  const layout = readFileSync('mobile/app/_layout.tsx', 'utf8');
  assert.ok(layout.indexOf('name="management"') < layout.indexOf('name="(tabs)"'));
  assert.ok(layout.indexOf('name="(tabs)"') < layout.indexOf('name="flow/[id]"'));
  const screen = readFileSync('mobile/src/ContentLinkScreen.tsx', 'utf8');
  assert.match(screen, /PhoneSignIn/);
  assert.match(screen, /mobile\/item/);
});
