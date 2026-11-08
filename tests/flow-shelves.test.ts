import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryShelves } from '../shared/flow-shelves';
import type { HabitFlow } from '../shared/mobile';

const flow = (id: string, extra: Partial<HabitFlow> = {}) =>
  ({ id, title: id, goal: '', description: '', steps: [], ...extra }) as HabitFlow;

test('category shelves split fresh flows without repeats and keep a full catalog', () => {
  const library = [
    flow('owned', { relatedFlowIds: ['linked'] }),
    flow('start-small', { level: 'Getting started' }),
    flow('linked'),
    flow('same-topic'),
    flow('other-a'),
    flow('other-b'),
  ];
  const rows = [
    { flow: library[0], focusId: 'workout' },
    { flow: library[1], focusId: 'running' },
    { flow: library[2], focusId: 'hyrox' },
    { flow: library[3], focusId: 'workout' },
    { flow: library[4], focusId: 'running' },
    { flow: library[5], focusId: 'running' },
    { flow: library[4], focusId: 'running' },
  ];
  const shelves = categoryShelves(rows, ['owned'], library);
  assert.deepEqual(shelves.getStarted.map(row => row.flow.id), ['start-small']);
  assert.deepEqual(shelves.recommended.map(row => row.flow.id), ['linked', 'same-topic']);
  assert.deepEqual(shelves.startFollowing.map(row => row.flow.id), ['other-a', 'other-b']);
  const top = [...shelves.getStarted, ...shelves.recommended, ...shelves.startFollowing];
  assert.ok(!top.some(row => row.flow.id === 'owned'), 'flows you follow are not suggested');
  assert.equal(new Set(top.map(row => row.flow.id)).size, top.length);
  assert.deepEqual(
    shelves.catalog.map(section => [section.focusId, section.flows.length]),
    [['workout', 2], ['running', 3], ['hyrox', 1]],
  );
});
