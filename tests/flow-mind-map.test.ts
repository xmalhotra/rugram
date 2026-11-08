import assert from 'node:assert/strict';
import test from 'node:test';
import { flows, type HabitFlow } from '../shared/mobile';
import { flowMindMap } from '../shared/flow-mind-map';
import { defaultFlowCategoryGroups } from '../shared/flow-categories';
import { focusOptions } from '../shared/focus';

const focuses = focusOptions.map(item => ({ id: item.id, flowIds: [...item.flowIds] }));
const flow = (id: string, pathId = 'workout'): HabitFlow => ({ ...flows[0], id, pathId, title: id });

test('added flows branch under their category and keep addition order', () => {
  const map = flowMindMap(
    [
      flow('coding-focus-audio', 'coding'),
      flow('workout-cindy'),
      flow('lifestyle-morning-drinks', 'morning-drinks'),
      flow('workout-animal-movements'),
      flow('recipe-example', 'nutrition'),
    ],
    defaultFlowCategoryGroups,
    focuses,
  );
  assert.deepEqual(
    map.map(branch => [branch.title, branch.flowIds]),
    [
      ['Fitness', ['workout-cindy', 'workout-animal-movements']],
      ['Tech', ['coding-focus-audio']],
      ['Lifestyle', ['lifestyle-morning-drinks', 'recipe-example']],
    ],
  );
});

test('a flow outside the catalogue lands on More, and an empty collection has no branches', () => {
  assert.deepEqual(
    flowMindMap([flow('custom-note', 'missing')], defaultFlowCategoryGroups, focuses),
    [{ id: 'more', title: 'More', flowIds: ['custom-note'] }],
  );
  assert.deepEqual(flowMindMap([], defaultFlowCategoryGroups, focuses), []);
});
