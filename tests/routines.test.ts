import assert from 'node:assert/strict';
import test from 'node:test';
import { routineGet, type RoutineList, type RoutineOne } from '../src/lib/routine-store';

const user = { id: 'routine-reader' };
const allow = { user, allow: true, demo: true as const };

test('routine pages filter by checkpoint and type, search aliases, and stay impersonal', async () => {
  const denied = await routineGet('http://local/api/mobile/routines', { user: null, allow: true, demo: true });
  assert.equal(denied.status, 401);
  const limited = await routineGet('http://local/api/mobile/routines', { user, allow: false, demo: true });
  assert.equal(limited.status, 429);
  const bad = await routineGet('http://local/api/mobile/routines?checkpoint=Breakfast', allow);
  assert.equal(bad.status, 400);

  const wake = await routineGet('http://local/api/mobile/routines?checkpoint=Wake%20up', allow);
  assert.equal(wake.status, 200);
  const wakeBody = wake.body as RoutineList;
  assert.ok(wakeBody.routines.length > 0);
  const firstOther = wakeBody.routines.findIndex(routine => routine.mainCheckpoint !== 'Wake up');
  if (firstOther >= 0)
    assert.ok(wakeBody.routines.slice(0, firstOther).every(routine => routine.mainCheckpoint === 'Wake up'));
  assert.ok(wakeBody.routines.every(routine => routine.checkpoints.includes('Wake up')));

  const drinks = await routineGet('http://local/api/mobile/routines?checkpoint=Wake%20up&type=Drink', allow);
  const drinkBody = drinks.body as RoutineList;
  assert.ok(drinkBody.routines.every(routine => routine.type === 'Drink' && routine.checkpoints.includes('Wake up')));

  const search = await routineGet('http://local/api/mobile/routines?q=nimbu', allow);
  const found = search.body as RoutineList;
  assert.ok(found.routines.some(routine => routine.title === 'Warm lime water + creatine'));
  assert.equal(JSON.stringify(found).includes(user.id), false);

  const first = await routineGet('http://local/api/mobile/routines?checkpoint=Lunch', allow);
  const firstBody = first.body as RoutineList;
  assert.ok(firstBody.nextCursor);
  const second = await routineGet(`http://local/api/mobile/routines?checkpoint=Lunch&cursor=${firstBody.nextCursor}`, allow);
  const secondBody = second.body as RoutineList;
  const ids = new Set(firstBody.routines.map(routine => routine.id));
  assert.ok(secondBody.routines.every(routine => !ids.has(routine.id)));

  const one = await routineGet(`http://local/api/mobile/routines?id=${encodeURIComponent(found.routines[0].id)}`, allow);
  const single = one.body as RoutineOne;
  assert.equal(single.routine.id, found.routines[0].id);
  assert.ok(single.routine.parts.length > 0);
  const missing = await routineGet('http://local/api/mobile/routines?id=missing-routine', allow);
  assert.equal(missing.status, 404);
});
