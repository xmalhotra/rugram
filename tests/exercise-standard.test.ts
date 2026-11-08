import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { seededHowTos } from '../shared/exercise-how-to';
import { gymFlowById, gymFlows } from '../shared/gym-flows';
import { completeCollections, exerciseStandard, resourceIds } from '../shared/exercise-standard';
import { buildExerciseUsage, cardExerciseIds, exerciseUsage } from '../shared/exercise-usage';
import { flows } from '../shared/mobile';
import { trainingCatalog } from '../shared/training-seed';

const frameIds = resourceIds(readFileSync('mobile/src/how-to-frames.ts', 'utf8'));
const iconIds = resourceIds(readFileSync('mobile/src/exercise-icons.ts', 'utf8'));
const howTos = seededHowTos();

function exercisesIn(flows = gymFlows, sessions = trainingCatalog().sessions) {
  const ids = new Set<string>();
  for (const flow of flows) for (const item of flow.items) ids.add(item.exerciseId);
  for (const session of sessions) for (const block of session.blocks) if (block.exerciseId) ids.add(block.exerciseId);
  return [...ids];
}

test('complete collections have a loop, an icon, how-to text and a focus area', () => {
  for (const id of completeCollections) {
    const flow = gymFlowById(id);
    assert.ok(flow, id);
    for (const item of flow.items) {
      const result = exerciseStandard(item.exerciseId, { frameIds, iconIds, howTos });
      assert.equal(result.loop, true, item.exerciseId);
      assert.equal(result.icon, true, item.exerciseId);
      assert.equal(result.howTo, true, item.exerciseId);
      assert.equal(result.focus, true, item.exerciseId);
      for (const part of ['Loop', 'Icon', 'How to do it', 'Focus area']) {
        assert.equal(result.missing.includes(part), false, `${item.exerciseId} ${part}`);
      }
    }
  }
});

test('every exercise in a flow or session has how-to text and a focus area', () => {
  for (const id of exercisesIn()) {
    const result = exerciseStandard(id, { frameIds, iconIds, howTos });
    assert.equal(result.howTo, true, id);
    assert.equal(result.focus, true, id);
  }
});

test('push-up is used in the beginner home flow, and usage stays sorted', () => {
  const push = exerciseUsage('push-up');
  assert.ok(push.some(row => row.kind === 'flow' && row.id === 'cal-upper-beginner' && row.title === 'Upper Body at Home'));
  const pull = exerciseUsage('mid-width-lat-pulldown');
  assert.deepEqual(
    pull.map(row => [row.kind, row.id]),
    [
      ['flow', 'gym-back-biceps'],
      ['session', 'upper-body-a'],
    ],
  );
  const calf = exerciseUsage('standing-calf-raise').map(row => row.title);
  assert.deepEqual(calf, ['Lower Body', 'Run-Specific Strength']);
});

test('a fixture flow with a new exercise appears with no code change', () => {
  const index = buildExerciseUsage({
    flows: [...gymFlows, { id: 'fixture-usage', title: 'Fixture Usage', items: [{ exerciseId: 'fixture-new-move' }] }],
    sessions: [],
  });
  assert.deepEqual(index.get('fixture-new-move'), [{ kind: 'flow', id: 'fixture-usage', title: 'Fixture Usage' }]);
});

test('usage and the standard do not branch on an exercise id', () => {
  for (const file of ['shared/exercise-usage.ts', 'shared/exercise-standard.ts']) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /switch\s*\(/, file);
    assert.doesNotMatch(source, /case\s+['"]/, file);
    assert.doesNotMatch(source, /===\s*['"][a-z0-9]+(?:-[a-z0-9]+)+['"]/, file);
    for (const id of exercisesIn()) {
      assert.equal(source.includes(`'${id}'`) || source.includes(`"${id}"`), false, `${file} ${id}`);
    }
  }
});

test('video is true only when the how-to carries a video url', () => {
  const sources = { frameIds: [] as string[], iconIds: [] as string[], howTos: [{ exerciseId: 'push-up', status: 'live' as const }] };
  assert.equal(exerciseStandard('push-up', sources).video, false);
  assert.equal(
    exerciseStandard('push-up', { ...sources, howTos: [{ exerciseId: 'push-up', status: 'live', videoUrl: 'https://youtu.be/abc' }] }).video,
    true,
  );
  assert.deepEqual(exerciseStandard('missing-move', { frameIds: [], iconIds: [], howTos: [] }).missing, [
    'Loop',
    'Icon',
    'How to do it',
    'Video',
    'Focus area',
  ]);
});

test('community cards resolve to the exercises they show', () => {
  const card = (sourceFlowId: string, cardId: string) => cardExerciseIds(flows, { sourceFlowId, cardId, title: '' });
  const gym = gymFlows[0];
  assert.deepEqual(card(gym.id, `${gym.id}:${gym.items[0].exerciseId}`), [gym.items[0].exerciseId]);
  assert.deepEqual(card('workout-cindy', 'cindy-pull-up'), ['pull-up']);
  assert.deepEqual(card('workout-cindy', 'cindy-squat'), ['air-squat']);
  assert.deepEqual(card('workout-animal-movements', 'workout-animal-bear'), ['bear-crawl']);
  assert.deepEqual(card('workout-core-foundations', 'workout-core-foundations:visual:1'), ['dead-bug']);
  assert.deepEqual(card('workout-animal-movements', 'workout-animal-crab'), []);
  assert.deepEqual(card('no-such-flow', 'nothing'), []);
});
