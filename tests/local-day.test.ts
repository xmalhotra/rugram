import assert from 'node:assert/strict';
import test from 'node:test';
import { dialCode, offsetForPhone } from '../shared/phone-time';
import { appOffsetMinutes, forgetMemberOffset, localDay, memberOffsetMinutes } from '../src/lib/local-day';

test('a workout is dated on the local day, India time by default', () => {
  assert.equal(appOffsetMinutes({}), 330);
  // 05:00 IST on 13 Nov is 23:30 UTC on 12 Nov: the member trained on the 13th.
  assert.equal(localDay('2026-11-12T23:30:00.000Z', 330), '2026-11-13');
  assert.equal(localDay('2026-11-12T18:29:00.000Z', 330), '2026-11-12');
  assert.equal(localDay('2026-11-12T18:30:00.000Z', 330), '2026-11-13');
  assert.equal(localDay(new Date('2026-11-12T10:00:00.000Z'), 330), '2026-11-12');
});

test('the fallback zone can be set, and bad values fall back to India', () => {
  assert.equal(appOffsetMinutes({ QRAM_TZ_OFFSET_MINUTES: '0' }), 0);
  assert.equal(appOffsetMinutes({ QRAM_TZ_OFFSET_MINUTES: 'x' }), 330);
  assert.equal(appOffsetMinutes({ QRAM_TZ_OFFSET_MINUTES: '' }), 330);
  assert.equal(localDay('2026-11-12T23:30:00.000Z', 0), '2026-11-12');
});

test('the zone comes from the country code of the sign-in number', () => {
  assert.equal(dialCode('+919876543210'), '91');
  assert.equal(offsetForPhone('+919876543210'), 330);
  assert.equal(offsetForPhone('+971501234567'), 240);
  assert.equal(offsetForPhone('+447911123456'), 0);
  assert.equal(offsetForPhone('+12025550123'), -300);
  // Three-digit codes win over a shorter prefix: +977 is Nepal, not +97…
  assert.equal(offsetForPhone('+9779812345678'), 345);
  // No number, a malformed one, or an unlisted country counts in India time.
  assert.equal(offsetForPhone(null), 330);
  assert.equal(offsetForPhone('9876543210'), 330);
  assert.equal(offsetForPhone('+99912345678'), 330);
});

test('a member\'s days follow their own number, and another member\'s do not change them', async () => {
  const store = ((globalThis as { rugramDemoStore?: { users?: { id: string; phone?: string }[] } }).rugramDemoStore ??= { users: [] });
  store.users ??= [];
  const india = `tz-in-${crypto.randomUUID()}`;
  const uk = `tz-uk-${crypto.randomUUID()}`;
  const none = `tz-none-${crypto.randomUUID()}`;
  store.users.push({ id: india, phone: '+919876543210' }, { id: uk, phone: '+447911123456' }, { id: none });
  forgetMemberOffset();
  assert.equal(await memberOffsetMinutes(india, true), 330);
  assert.equal(await memberOffsetMinutes(uk, true), 0);
  assert.equal(await memberOffsetMinutes(none, true), 330);
  const finish = '2026-11-12T23:30:00.000Z';
  assert.equal(localDay(finish, await memberOffsetMinutes(india, true)), '2026-11-13');
  assert.equal(localDay(finish, await memberOffsetMinutes(uk, true)), '2026-11-12');
  store.users = store.users.filter(user => ![india, uk, none].includes(user.id));
  forgetMemberOffset();
});
