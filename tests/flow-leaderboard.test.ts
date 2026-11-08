import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogFlows } from '../shared/flow-catalog';
import { flowLeaderboard } from '../shared/flow-leaderboard';

const now = Date.parse('2026-11-08T12:00:00Z');
const ago = (days: number) => new Date(now - days * 86400000).toISOString();
const [a, b, c] = catalogFlows.filter(flow => flow.status === 'coming-soon').map(flow => flow.id);
const ask = (userId: string, catalogFlowId: string, days = 30) => ({ userId, catalogFlowId, createdAt: ago(days) });

test('most requested first, with this week and whether the viewer asked', () => {
  const board = flowLeaderboard(
    [ask('u1', a), ask('u2', a, 2), ask('u3', a, 1), ask('me', b, 3), ask('u2', b)],
    'me',
    now,
  );
  assert.deepEqual(
    board.flows.map(flow => [flow.catalogFlowId, flow.rank, flow.count, flow.thisWeek, flow.requested]),
    [
      [a, 1, 3, 2, false],
      [b, 2, 2, 1, true],
    ],
  );
  assert.equal(board.totalRequests, 5);
});

test('equal counts share a rank and the busier week goes first', () => {
  const board = flowLeaderboard([ask('u1', a), ask('u2', b, 1), ask('u3', c)], 'me', now);
  assert.equal(board.flows[0].catalogFlowId, b);
  assert.deepEqual(board.flows.map(flow => flow.rank), [1, 1, 1]);
});

test('unknown flows are ignored and the list is capped', () => {
  const ids = catalogFlows.filter(flow => flow.status === 'coming-soon').slice(0, 12).map(flow => flow.id);
  const board = flowLeaderboard([...ids.map(id => ask('u1', id)), ask('u1', 'not-a-flow')], 'me', now);
  assert.equal(board.flows.length, 10);
  assert.equal(board.totalRequests, 12);
  assert.deepEqual(flowLeaderboard([], 'me', now), { flows: [], totalRequests: 0 });
});
