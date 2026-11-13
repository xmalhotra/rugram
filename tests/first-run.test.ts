import assert from 'node:assert/strict';
import test from 'node:test';
import {
  confirmLines,
  firstRunResult,
  flowsNowFit,
  priorityAddedLine,
  questionsForPurpose,
} from '../shared/first-run';
import { mapFlowTemplateById } from '../shared/map-flow-templates';

test('a purpose asks only its own questions, and gym place and time only when it leads to gym flows', () => {
  const muscle = questionsForPurpose('gain-muscle').map(question => question.id);
  assert.deepEqual(muscle, ['place', 'days', 'lifting', 'gym-time']);
  assert.equal(questionsForPurpose('gain-muscle').some(question => question.asks === 'gym-place'), true);
  assert.equal(questionsForPurpose('gain-muscle').some(question => question.asks === 'gym-time'), true);

  const handstand = questionsForPurpose('handstand');
  assert.deepEqual(
    handstand.map(question => question.id),
    ['wall', 'wrists'],
  );
  assert.equal(handstand.some(question => question.asks === 'gym-place' || question.asks === 'gym-time'), false);

  const move = questionsForPurpose('move-better');
  assert.equal(move.some(question => question.asks === 'gym-time' || question.asks === 'gym-place'), false);
  assert.equal(move.find(question => question.id === 'place')?.prompt, 'Can you get on the floor?');

  const homeOnly = mapFlowTemplateById('gain-muscle-beginner');
  assert.ok(homeOnly);
  const withoutGym = questionsForPurpose('gain-muscle', [{ ...homeOnly, place: 'bodyweight' }]);
  assert.equal(withoutGym.some(question => question.asks === 'gym-place' || question.asks === 'gym-time'), false);
  assert.deepEqual(
    withoutGym.map(question => question.id),
    ['days', 'lifting'],
  );
});

test('answers pick the matching Map flow, and the best one is first', () => {
  const years = firstRunResult({
    purposeId: 'gain-muscle',
    answers: { place: 'gym', days: '4', lifting: 'years', 'gym-time': '60' },
  });
  assert.equal(years.kind, 'map-flows');
  if (years.kind !== 'map-flows') return;
  assert.equal(years.fits[0].id, 'gain-muscle-advanced');
  assert.match(years.fits[0].reason, /For years/);
  assert.match(years.fits[0].reason, /Gym/);
  assert.ok(years.fits.length > 1);
  assert.notEqual(years.fits[1].id, years.fits[0].id);

  const days = firstRunResult({ purposeId: 'gain-muscle', answers: { days: '4' } });
  assert.equal(days.kind, 'map-flows');
  if (days.kind !== 'map-flows') return;
  assert.equal(days.fits[0].id, 'gain-muscle-intermediate');
  assert.match(days.fits[0].reason, /4 training days/);

  const wall = firstRunResult({ purposeId: 'handstand', answers: { wall: 'yes' } });
  assert.equal(wall.kind, 'map-flows');
  if (wall.kind !== 'map-flows') return;
  assert.equal(wall.fits[0].id, 'handstand-intermediate');
});

test('skipped answers still give a Map flow, and a purpose with none gives the starter line', () => {
  const skipped = firstRunResult({
    purposeId: 'gain-muscle',
    answers: { place: null, days: null, lifting: null, 'gym-time': null },
  });
  assert.equal(skipped.kind, 'map-flows');
  if (skipped.kind !== 'map-flows') return;
  assert.equal(skipped.fits[0].id, 'gain-muscle-beginner');
  assert.match(skipped.fits[0].reason, /A starting Map flow for Gain muscle/);
  assert.deepEqual(confirmLines('gain-muscle', { place: null, days: '3' }).map(line => line.said), [
    'Skipped',
    '3 days',
    'Skipped',
    'Skipped',
  ]);

  const coming = firstRunResult({ purposeId: 'gain-muscle', answers: {}, templates: [] });
  assert.equal(coming.kind, 'starter');
  if (coming.kind !== 'starter') return;
  assert.equal(coming.line, 'More is coming for Gain muscle.');
  assert.equal(coming.focusId, 'workout');

  const unknown = firstRunResult({ purposeId: 'not-a-purpose', answers: {} });
  assert.equal(unknown.kind, 'starter');
  if (unknown.kind !== 'starter') return;
  assert.equal(unknown.line, 'More is coming.');
});

test('personalise says how many flows fit, and how many gained a priority', () => {
  assert.equal(flowsNowFit(12), '12 flows now fit');
  assert.equal(flowsNowFit(1), '1 flow now fits');
  assert.equal(priorityAddedLine(4), 'Added to 4 flows');
  assert.equal(priorityAddedLine(1), 'Added to 1 flow');
});
