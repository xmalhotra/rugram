import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runFooterState } from '../shared/run-footer';

test('next stays closed until every set is ticked or skipped', () => {
  const none = runFooterState([
    { ticked: false, skipped: false },
    { ticked: false, skipped: false },
    { ticked: false, skipped: false },
  ]);
  assert.equal(none.ready, false);
  assert.equal(none.remaining, 3);
  assert.equal(none.skipLabel, 'Skip');
  assert.equal(none.hint, 'Finish or skip 3 more sets');

  const oneLeft = runFooterState([
    { ticked: true, skipped: false },
    { ticked: false, skipped: false },
  ]);
  assert.equal(oneLeft.ready, false);
  assert.equal(oneLeft.remaining, 1);
  assert.equal(oneLeft.skipLabel, 'Skip 1 set');
  assert.equal(oneLeft.hint, 'Finish or skip 1 more set');

  const twoLeft = runFooterState([
    { ticked: true, skipped: false },
    { ticked: false, skipped: false },
    { ticked: false, skipped: false },
  ]);
  assert.equal(twoLeft.ready, false);
  assert.equal(twoLeft.remaining, 2);
  assert.equal(twoLeft.skipLabel, 'Skip 2 sets');
  assert.equal(twoLeft.hint, 'Finish or skip 2 more sets');

  const allDone = runFooterState([
    { ticked: true, skipped: false },
    { ticked: true, skipped: false },
  ]);
  assert.equal(allDone.ready, true);
  assert.equal(allDone.remaining, 0);
  assert.equal(allDone.skipLabel, null);
  assert.equal(allDone.hint, '');
});

test('skipped sets count as dealt with, and a max set is just another set', () => {
  const mix = runFooterState([
    { ticked: true, skipped: false },
    { ticked: false, skipped: true },
    { ticked: false, skipped: false },
  ]);
  assert.equal(mix.ready, false);
  assert.equal(mix.remaining, 1);
  assert.equal(mix.skipLabel, 'Skip 1 set');

  const skippedOnly = runFooterState([
    { ticked: false, skipped: true },
    { ticked: false, skipped: false },
  ]);
  assert.equal(skippedOnly.skipLabel, 'Skip');
  assert.equal(skippedOnly.remaining, 1);

  const allSkipped = runFooterState([
    { ticked: false, skipped: true },
    { ticked: false, skipped: true },
  ]);
  assert.equal(allSkipped.ready, true);
  assert.equal(allSkipped.skipLabel, null);

  const maxOpen = runFooterState([
    { ticked: true, skipped: false },
    { ticked: false, skipped: false },
  ]);
  assert.equal(maxOpen.remaining, 1);
  assert.equal(maxOpen.ready, false);
  const maxDone = runFooterState([
    { ticked: false, skipped: true },
    { ticked: true, skipped: false },
  ]);
  assert.equal(maxDone.ready, true);
});

test('a running hold counts as open', () => {
  const holding = runFooterState([
    { ticked: true, skipped: false },
    { ticked: false, skipped: false, running: true },
  ]);
  assert.equal(holding.ready, false);
  assert.equal(holding.remaining, 1);
  assert.equal(holding.skipLabel, 'Skip 1 set');
  assert.equal(holding.hint, 'Finish or skip 1 more set');

  const stillRunning = runFooterState([{ ticked: true, skipped: false, running: true }]);
  assert.equal(stillRunning.ready, false);
  assert.equal(stillRunning.skipLabel, 'Skip');
});

test('the workout screens keep the loop on the card and leave ticked sets editable', () => {
  const flow = readFileSync('mobile/src/FlowRun.tsx', 'utf8');
  const session = readFileSync('mobile/src/TrainingSession.tsx', 'utf8');
  const picture = readFileSync('mobile/src/ExerciseRunMedia.tsx', 'utf8');
  assert.equal(flow.includes('HowToLink'), false);
  assert.equal(session.includes('HowToLink'), false);
  assert.equal(flow.includes('editable={!row.ticked}'), false);
  assert.equal(session.includes('editable={!row.ticked}'), false);
  assert.match(flow, /ExercisePicture/);
  assert.match(flow, /FocusArea/);
  assert.match(session, /ExercisePicture/);
  assert.match(session, /FocusArea/);
  assert.match(picture, /HowToLoop/);
  assert.match(picture, /About \$\{name\}/);
});
