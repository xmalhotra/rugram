import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { routineCatalog } from '../shared/routine-seed';
import { routineCheckpoints, routineTypes } from '../shared/routines';

const banned = /\b(recommended|should|cures|boosts)\b|amul|nestle|nescafe|maggi|horlicks|bournvita|pepsi|coca-cola|starbucks|muscleblaze|optimum nutrition|myprotein|gatorade|yakult|kellogg|quaker|nutella|cadbury|oreo|\bparle\b|britannia|haldiram|patanjali|dabur|centrum/i;

const required: Record<string, { type: string; main: string; also: string[]; parts: string[] }> = {
  'Warm lime water + creatine': {
    type: 'Drink',
    main: 'Wake up',
    also: [],
    parts: ['Warm water', 'Lime', 'Creatine'],
  },
  'Black coffee': { type: 'Drink', main: 'Wake up', also: ['Morning', 'Afternoon'], parts: ['Coffee'] },
  'Banana date smoothie': {
    type: 'Drink',
    main: 'Mid-morning',
    also: ['Morning'],
    parts: ['Yogurt', 'Banana', 'Dates', 'Milk', 'Honey'],
  },
  'Burrito bowl': {
    type: 'Food',
    main: 'Lunch',
    also: ['Dinner'],
    parts: ['Rice', 'Beans', 'Chicken', 'Salsa', 'Lettuce'],
  },
  'Pre-workout drink': { type: 'Supplement', main: 'Pre-workout', also: [], parts: ['Pre-workout powder', 'Water'] },
  'Whey protein shake': { type: 'Drink', main: 'Post-workout', also: [], parts: ['Whey protein', 'Water'] },
  'Fish oil, calcium + magnesium': {
    type: 'Supplement',
    main: 'Before bed',
    also: ['Dinner'],
    parts: ['Fish oil', 'Calcium', 'Magnesium'],
  },
};

test('the routine catalog is large, linked, and free of advice or brand names', () => {
  const { items, routines } = routineCatalog();
  assert.ok(items.length >= 400, `items ${items.length}`);
  assert.ok(routines.length >= 200, `routines ${routines.length}`);
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
  assert.equal(new Set(routines.map(routine => routine.id)).size, routines.length);
  assert.equal(new Set(routines.map(routine => routine.title.toLowerCase())).size, routines.length);
  const itemIds = new Set(items.map(item => item.id));
  const byId = new Map(items.map(item => [item.id, item]));
  for (const type of routineTypes) assert.ok(items.some(item => item.type === type));
  for (const type of routineTypes) assert.ok(routines.some(routine => routine.type === type));
  for (const checkpoint of routineCheckpoints) {
    const count = routines.filter(routine => routine.mainCheckpoint === checkpoint).length;
    assert.ok(count >= 15, `${checkpoint} has ${count} main`);
  }
  const food = routines.filter(routine => routine.type === 'Food');
  const composed = food.filter(routine => routine.parts.length >= 3).length;
  assert.ok(composed / food.length >= 0.7, `food with 3 or more parts ${composed}/${food.length}`);
  const paddedName = /\b(plate|piece|cup|glass|bowl|spoon)$/i;
  for (const item of items) assert.equal(paddedName.test(item.name), false, item.name);
  for (const routine of routines) {
    assert.ok(routineTypes.includes(routine.type));
    assert.ok(routine.checkpoints.includes(routine.mainCheckpoint));
    for (const checkpoint of routine.checkpoints) assert.ok(routineCheckpoints.includes(checkpoint));
    assert.ok(routine.parts.length > 0);
    for (const part of routine.parts) {
      assert.ok(itemIds.has(part.itemId));
      if (byId.get(part.itemId)?.name === routine.title) assert.equal(routine.parts.length, 1, routine.title);
    }
    const text = [routine.title, routine.region, ...routine.aliases, ...routine.parts.map(part => part.amount ?? '')].join(' ');
    assert.equal(banned.test(text), false, text);
  }
  for (const item of items) {
    const text = [item.name, item.serving ?? '', ...item.aliases].join(' ');
    assert.equal(banned.test(text), false, text);
  }
  for (const [title, spec] of Object.entries(required)) {
    const routine = routines.find(item => item.title === title);
    assert.ok(routine, title);
    assert.equal(routine.type, spec.type);
    assert.equal(routine.mainCheckpoint, spec.main);
    for (const checkpoint of spec.also) assert.ok(routine.checkpoints.includes(checkpoint as (typeof routineCheckpoints)[number]));
    assert.deepEqual(
      routine.parts.map(part => byId.get(part.itemId)?.name),
      spec.parts,
    );
  }
  const creatine = routines.find(routine => routine.title === 'Warm lime water + creatine');
  assert.equal(creatine?.parts.find(part => byId.get(part.itemId)?.name === 'Creatine')?.amount, '1 spoon');
  const route = readFileSync('src/app/api/mobile/routines/route.ts', 'utf8');
  assert.match(route, /routines-read:/);
  assert.match(route, /allowSharedRequest/);
  assert.match(route, /unauthorized/);
});
