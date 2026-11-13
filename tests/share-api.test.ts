import assert from 'node:assert/strict';
import test from 'node:test';
import { changeCustomflow } from '../src/lib/customflow-store';
import { changeMapFlow, listMapFlows } from '../src/lib/map-flow-store';
import { changeShare, shareFeed, sharePost, shareYours, type SharePost, type ShareRemark } from '../src/lib/share-store';
import { gymFlowById } from '../shared/gym-flows';
import { attachmentHasPrivate } from '../shared/share-attachment';
import { mergeShareFeed } from '../shared/share-attachment';
import type { PublicUser } from '../src/lib/types';

const user = (id: string, name = id): PublicUser => ({
  id,
  handle: id,
  name,
  role: 'member',
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
});

function asPost(value: unknown) {
  const row = value as { post?: SharePost; remarks?: ShareRemark[]; placedSlot?: number | null; follows?: unknown };
  if (!row.post || !row.remarks) throw new Error('Expected a post.');
  return row as { post: SharePost; remarks: ShareRemark[]; placedSlot: number | null };
}

function asFeed(value: unknown) {
  const row = value as { posts?: SharePost[] };
  if (!row.posts) throw new Error('Expected a feed.');
  return row.posts;
}

function rememberRun(run: { userId: string; status: string; updatedAt: string; flowId: string }) {
  const bag = (globalThis.qramFlowRuns ??= { metrics: [], runs: [] }) as {
    runs: { userId: string; status: string; updatedAt: string; flowId: string }[];
  };
  bag.runs.push(run);
}

test('the server refuses a flow the member has not finished', async () => {
  const owner = user(`share-none-${crypto.randomUUID()}`);
  await assert.rejects(
    () => changeShare(owner, { action: 'post', kind: 'custom-flow', sourceId: 'gym-splits-size-upper', text: 'try this' }, true),
    /Finish it before you post it/,
  );
});

test('a finished flow can be posted, remarked on, and the author can delete any remark', async () => {
  const owner = user(`share-owner-${crypto.randomUUID()}`, 'Ava');
  const reader = user(`share-reader-${crypto.randomUUID()}`, 'Ben');
  const stranger = user(`share-stranger-${crypto.randomUUID()}`, 'Cam');
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  const posted = asPost(await changeShare(owner, { action: 'post', kind: 'custom-flow', sourceId: 'gym-splits-size-upper', text: 'try this' }, true));
  assert.equal(posted.post.text, 'try this');
  assert.equal(attachmentHasPrivate(posted.post.attachment), false);
  assert.equal(JSON.stringify(posted).includes('weightKg'), false);
  assert.equal(posted.post.attachment.exercises.some(item => item.exerciseId === 'dumbbell-bench-press'), true);
  const remarked = asPost(await changeShare(reader, { action: 'remark', postId: posted.post.id, text: 'How did the last set feel?' }, true));
  const remark = remarked.remarks.find(item => item.userId === reader.id);
  assert.ok(remark);
  await assert.rejects(
    () => changeShare(stranger, { action: 'delete-remark', id: remark.id }, true),
    /You can delete your own remark/,
  );
  const still = await sharePost(owner, posted.post.id, true);
  assert.equal(still.remarks.some(item => item.id === remark.id), true);
  const removed = asPost(await changeShare(owner, { action: 'delete-remark', id: remark.id }, true));
  assert.equal(removed.remarks.some(item => item.id === remark.id), false);
  const own = asPost(await changeShare(reader, { action: 'remark', postId: posted.post.id, text: 'I will try it.' }, true));
  const mine = own.remarks.find(item => item.text === 'I will try it.');
  assert.ok(mine);
  const gone = asPost(await changeShare(reader, { action: 'delete-remark', id: mine.id }, true));
  assert.equal(gone.remarks.some(item => item.id === mine.id), false);
});

test('words that are too long are refused', async () => {
  const owner = user(`share-long-${crypto.randomUUID()}`);
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  await assert.rejects(
    () => changeShare(owner, { action: 'post', kind: 'custom-flow', sourceId: 'gym-splits-size-upper', text: 'x'.repeat(281) }, true),
    /280/,
  );
  const posted = asPost(await changeShare(owner, { action: 'post', kind: 'custom-flow', sourceId: 'gym-splits-size-upper', text: '' }, true));
  await assert.rejects(() => changeShare(owner, { action: 'remark', postId: posted.post.id, text: '   ' }, true), /remark/);
});

test('following a post copies the snapshot and a later edit is an offer', async () => {
  const owner = user(`share-edit-${crypto.randomUUID()}`, 'Ava');
  const reader = user(`share-follow-${crypto.randomUUID()}`, 'Ben');
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  const posted = asPost(await changeShare(owner, { action: 'post', kind: 'custom-flow', sourceId: 'gym-splits-size-upper', text: '' }, true));
  const followed = asPost(
    await changeShare(reader, { action: 'follow', postId: posted.post.id, today: '2026-11-16', sessions: 1, after: 'return' }, true),
  );
  assert.equal(followed.post.following, 1);
  assert.equal(attachmentHasPrivate(followed.post.attachment), false);
  const exerciseId = gymFlowById('gym-splits-size-upper')?.items[0]?.exerciseId;
  assert.ok(exerciseId);
  await changeCustomflow(
    owner,
    { action: 'remove', source: { kind: 'qram-flow', id: 'gym-splits-size-upper', version: null }, key: exerciseId, out: true },
    Date.now(),
  );
  const offered = await sharePost(reader, posted.post.id, true);
  assert.ok(offered.post.viewer.update?.some(line => line.startsWith('Removed')));
  assert.equal(offered.post.attachment.exercises.some(item => item.exerciseId === exerciseId), true);
  const taken = asPost(await changeShare(reader, { action: 'accept-update', postId: posted.post.id }, true));
  assert.equal(taken.post.viewer.update, null);
  const feed = await shareFeed(reader, true);
  const activity = { id: 'run', at: '2026-11-01T00:00:00.000Z' };
  const ordered = mergeShareFeed([activity], feed.posts.map(post => ({ id: post.id, at: post.at })));
  assert.equal(ordered[0]?.kind, 'attachment');
});

test('a full set of slots asks for a replacement and will not take slot 1 without a warning', async () => {
  const owner = user(`share-map-${crypto.randomUUID()}`, 'Ava');
  const reader = user(`share-slots-${crypto.randomUUID()}`, 'Ben');
  const made = await changeMapFlow(owner, { action: 'create', templateId: 'gain-muscle-beginner', slot: 1, start: '2026-11-01' }, true);
  const map = made.flows.find(flow => flow.slot === 1);
  assert.ok(map);
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-01T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-02T12:00:00.000Z', flowId: 'gym-splits-size-lower' });
  const yours = await shareYours(owner, true);
  assert.equal(yours.earned.some(item => item.kind === 'map-flow' && item.id === map.id), true);
  const posted = asPost(await changeShare(owner, { action: 'post', kind: 'map-flow', sourceId: map.id, text: 'try this' }, true));
  let filled = await changeMapFlow(reader, { action: 'create', templateId: 'gain-muscle-beginner', slot: 1, start: '2026-11-01' }, true);
  for (let slot = 2; slot <= 5; slot += 1) {
    const source = filled.flows[0];
    assert.ok(source);
    filled = await changeMapFlow(reader, { action: 'copy', mapFlowId: source.id, slot, start: '2026-11-01' }, true);
  }
  assert.equal((await listMapFlows(reader, true)).flows.length, 5);
  await assert.rejects(
    () => changeShare(reader, { action: 'follow', postId: posted.post.id, today: '2026-11-16' }, true),
    /Choose one to replace/,
  );
  await assert.rejects(
    () => changeShare(reader, { action: 'follow', postId: posted.post.id, today: '2026-11-16', replaceSlot: 1 }, true),
    /Slot 1/,
  );
  const placed = asPost(
    await changeShare(reader, { action: 'follow', postId: posted.post.id, today: '2026-11-16', replaceSlot: 2 }, true),
  );
  assert.equal(placed.placedSlot, 2);
  assert.equal(placed.post.following, 1);
});

test('a report is kept and a block hides that member', async () => {
  const owner = user(`share-block-${crypto.randomUUID()}`, 'Ava');
  const reader = user(`share-hide-${crypto.randomUUID()}`, 'Ben');
  rememberRun({ userId: owner.id, status: 'finished', updatedAt: '2026-11-16T12:00:00.000Z', flowId: 'gym-splits-size-upper' });
  const posted = asPost(await changeShare(owner, { action: 'post', kind: 'custom-flow', sourceId: 'gym-splits-size-upper', text: 'try this' }, true));
  const report = (await changeShare(reader, { action: 'report', kind: 'post', itemId: posted.post.id, reason: 'Other', note: '' }, true)) as {
    report: { itemId: string };
  };
  assert.equal(report.report.itemId, posted.post.id);
  const hidden = asFeed(await changeShare(reader, { action: 'block', userId: owner.id }, true));
  assert.equal(hidden.some(post => post.id === posted.post.id), false);
  const visible = await shareFeed(owner, true);
  assert.equal(visible.posts.some(post => post.id === posted.post.id), true);
});
