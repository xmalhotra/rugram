import assert from 'node:assert/strict';
import test from 'node:test';
import { checkMetric, personalMetricInfo, personalMetricKeys } from '../shared/personal-metrics';
import { clockText, paceRange, paceText, riegel, swimPace, vdot } from '../shared/running-paces';
import { trainingCatalog } from '../shared/training-seed';

test('VDOT matches the published tables', () => {
  assert.equal(vdot(5000, 20 * 60), 49.8); // Daniels: VDOT 50 is a 19:57 5K
  assert.ok(Math.abs(vdot(42195, 3.5 * 3600)! - 44.6) < 0.1); // VDOT 44 is a 3:32 marathon
  assert.equal(vdot(800, 120), null);
  assert.equal(vdot(5000, 60), null);
});

test('paces at VDOT 50 sit where the tables put them', () => {
  const threshold = paceRange(50, 'threshold');
  const interval = paceRange(50, 'interval');
  assert.ok(threshold.fast >= 250 && threshold.fast <= 260, String(threshold.fast)); // table: 4:15/km
  assert.ok(interval.fast >= 230 && interval.fast <= 240, String(interval.fast)); // table: 3:55/km
  assert.ok(paceRange(50, 'easy').slow > threshold.slow);
  assert.match(paceText(threshold), /^4:1\d–4:\d\d \/km$/);
});

test('Riegel predictions, clock text and swim pace', () => {
  assert.equal(clockText(riegel(5000, 1200, 10000)), '41:42');
  assert.equal(clockText(3725), '1:02:05');
  assert.equal(swimPace(480), 120);
});

test('every metric validates its own value and belongs to a category', () => {
  assert.equal(checkMetric('run.recent', { distanceM: 5000, seconds: 1500 }).ok, true);
  assert.equal(checkMetric('run.recent', { distanceM: 100, seconds: 1500 }).ok, false);
  assert.equal(checkMetric('run.recent', { distanceM: 5000, seconds: 1500, extra: 1 }).ok, false);
  assert.equal(checkMetric('swim.400', { seconds: 500 }).ok, true);
  assert.equal(checkMetric('run.weekly', { km: -1 }).ok, false);
  for (const key of personalMetricKeys) assert.ok(personalMetricInfo[key].question, key);
});

test('running sessions say how hard each block is', () => {
  const sessions = trainingCatalog().sessions;
  const easy = sessions.find(session => session.id === 'easy-run')!;
  assert.equal(easy.blocks[0].intensity, 'easy');
  const intervals = sessions.find(session => session.id === 'vo2-intervals')!;
  assert.deepEqual(intervals.blocks.map(block => block.intensity), ['easy', 'interval', 'easy']);
});
