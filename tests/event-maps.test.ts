import test from 'node:test';
import assert from 'node:assert/strict';
import { eventMapsUrl } from '../shared/event-maps';
test('maps query encodes the public venue and city without requesting location', () => {
  const url = new URL(eventMapsUrl({ venue: 'Hall A & B, Jubilee Hills', city: 'Hyderabad' })!);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'www.google.com');
  assert.equal(url.searchParams.get('query'), 'Hall A & B, Jubilee Hills, Hyderabad');
  assert.equal(url.searchParams.size, 2);
});
test('unconfirmed and online venues never get invented map locations', () => {
  for (const venue of ['', 'TBA', 'Online', 'To be announced', 'Venue to be announced'])
    assert.equal(eventMapsUrl({ venue, city: 'Hyderabad' }), null);
});
