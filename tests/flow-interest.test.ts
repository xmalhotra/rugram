import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicUser } from '../src/lib/types';
import { catalogFlows } from '../shared/flow-catalog';
import {
  adminInterest,
  flowInterestSchema,
  notifyRequesters,
  unwantFlow,
  wantFlow,
  wantedIds,
} from '../src/lib/flow-interest-store';

async function withDemo(run: () => Promise<void>) {
  const keys = ['QRAM_DEMO_MODE', 'BETTERHABITS_DEMO_MODE', 'RUGRAM_DEMO_MODE'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) process.env[key] = 'true';
  try {
    await run();
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const person = (id: string, role: PublicUser['role'] = 'member'): PublicUser => ({
  id,
  handle: id,
  name: id,
  role,
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

const sample = catalogFlows[0]!;
const other = catalogFlows.find(flow => flow.tileId !== sample.tileId)!;

test('want is idempotent and unwant removes only that flow', async () => {
  await withDemo(async () => {
  globalThis.qramFlowInterest = [];
  const member = person('interest-member');
  assert.deepEqual(await wantFlow(member, sample.id), [sample.id]);
  assert.deepEqual(await wantFlow(member, sample.id), [sample.id]);
  assert.deepEqual(await wantFlow(member, other.id), [sample.id, other.id]);
  assert.deepEqual(await unwantFlow(member, sample.id), [other.id]);
  assert.deepEqual(await wantedIds(member), [other.id]);
  await assert.rejects(() => wantFlow(member, 'not-a-flow'), /Unknown flow/);
  });
});

test('non-admins cannot read the queue or notify, and notify sends once', async () => {
  await withDemo(async () => {
  globalThis.qramFlowInterest = [];
  globalThis.betterHabitsInbox = [];
  const one = person('interest-one');
  const two = person('interest-two');
  const member = person('interest-member-blocked');
  const admin = person('interest-admin-notify', 'admin');
  await wantFlow(one, sample.id);
  await wantFlow(two, sample.id);
  await wantFlow(one, other.id);
  await assert.rejects(() => adminInterest(member), /Admin access required/);
  await assert.rejects(() => notifyRequesters(member, sample.id), /Admin access required/);
  assert.equal(await notifyRequesters(admin, sample.id), 2);
  assert.equal(await notifyRequesters(admin, sample.id), 0);
  const notices = (globalThis.betterHabitsInbox ?? []).filter(row => row.type === 'flow_ready');
  assert.equal(notices.length, 2);
  assert.ok(notices.every(row => row.title === `${sample.title} is ready. You asked for it.`));
  const queue = await adminInterest(admin);
  assert.equal(queue.flows[0]?.catalogFlowId, sample.id);
  assert.equal(queue.flows[0]?.count, 2);
  assert.equal(queue.flows[1]?.count, 1);
  await assert.rejects(() => notifyRequesters(admin, 'missing'), /Unknown flow/);
  });
});

test('a request carries no written details', () => {
  assert.equal(flowInterestSchema.safeParse({ action: 'want', catalogFlowId: sample.id }).success, true);
  assert.equal(
    flowInterestSchema.safeParse({ action: 'want', catalogFlowId: sample.id, note: 'hi' }).success,
    false,
  );
  assert.equal(flowInterestSchema.safeParse({ action: 'request', tileId: 'x', note: 'hi' }).success, false);
});
