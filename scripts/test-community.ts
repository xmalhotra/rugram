import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config({ path: '.env.local', quiet: true });
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/betterhabits_local')
    throw new Error('Use the isolated local test database.');
  process.env.RUGRAM_DEMO_MODE = 'false';
  const pool = new Pool({ connectionString: url.toString() });
  const ids = Array.from({ length: 3 }, () => crypto.randomUUID());
  const { getUser } = await import('../src/lib/store');
  const { editPersonalFlow } = await import('../src/lib/mobile/personal-flows');
  const { getProfile } = await import('../src/lib/mobile/profile');
  const { communityAction, communityFeed, communityFlow, communityStatus } =
    await import('../src/lib/mobile/community');
  const { notificationInbox } = await import('../src/lib/notification-store');
  const { flows } = await import('../shared/mobile');
  try {
    for (const id of ids)
      await pool.query("INSERT INTO users(id,handle,name,role) VALUES($1,$1,$1,'member')", [id]);
    const [author, fan, stranger] = (await Promise.all(ids.map(id => getUser(id))))!;
    const drinks = flows.filter(flow => flow.id.startsWith('morning-drink')).slice(0, 3);
    assert.equal(drinks.length, 3, 'fixture needs three catalogue drink cards');
    const personalFlowId = `personal-${crypto.randomUUID()}`;
    await editPersonalFlow(author!, {
      action: 'personal-flow-create',
      id: personalFlowId,
      name: 'Calm morning',
      sourceFlowId: drinks[0].id,
      cardId: drinks[0].id,
    });
    await assert.rejects(
      communityAction(author!, { action: 'publish', personalFlowId, description: '' }),
      /at least 2 cards/,
    );
    await editPersonalFlow(author!, {
      action: 'personal-flow-add',
      id: personalFlowId,
      sourceFlowId: drinks[1].id,
      cardId: drinks[1].id,
    });
    const { id } = await communityAction(author!, {
      action: 'publish',
      personalFlowId,
      description: '  Two calm   drinks  ',
    });
    assert.ok(id);

    const forYou = await communityFeed(fan!, 'for-you');
    const listed = forYou.items.find(item => item.flow.id === id);
    assert.equal(listed?.flow.description, 'Two calm drinks');
    assert.equal(listed?.flow.viewer.own, false);

    await communityAction(fan!, { action: 'upvote', id: id!, enabled: true });
    await communityAction(fan!, { action: 'upvote', id: id!, enabled: true });
    await communityAction(fan!, { action: 'repost', id: id!, enabled: true });
    await communityAction(fan!, { action: 'follow', authorId: author!.id, enabled: true });
    await assert.rejects(
      communityAction(author!, { action: 'upvote', id: id!, enabled: true }),
      /own flow/,
    );
    const copyId = `personal-${crypto.randomUUID()}`;
    await communityAction(fan!, { action: 'save', id: id!, personalFlowId: copyId });
    // Saving twice keeps a single copy.
    await communityAction(fan!, {
      action: 'save',
      id: id!,
      personalFlowId: `personal-${crypto.randomUUID()}`,
    });
    assert.equal(
      (await getProfile(fan!)).personalFlows?.filter(flow => flow.source?.publishedId === id).length,
      1,
    );

    // The stranger follows the fan only, so the original arrives as a repost.
    await communityAction(stranger!, { action: 'follow', authorId: fan!.id, enabled: true });
    const strangerFeed = await communityFeed(stranger!, 'following');
    const reposted = strangerFeed.items.find(item => item.flow.id === id);
    assert.equal(reposted?.repostedBy?.id, fan!.id);
    assert.equal(reposted?.flow.upvotes, 1, 'repeated upvotes count once');
    assert.equal(reposted?.flow.reposts, 1);

    await editPersonalFlow(author!, {
      action: 'personal-flow-add',
      id: personalFlowId,
      sourceFlowId: drinks[2].id,
      cardId: drinks[2].id,
    });
    await communityAction(author!, {
      action: 'publish',
      personalFlowId,
      description: 'Two calm drinks',
    });
    const detail = await communityFlow(fan!, id!);
    assert.equal(detail.flow.version, 2);
    assert.ok(detail.flow.editedAt);
    assert.deepEqual(
      detail.versions.map(version => version.version),
      [2, 1],
    );
    assert.ok(detail.versions[0].changes.some(change => change.kind === 'added'));
    const inbox = await notificationInbox(fan!);
    assert.ok(
      inbox.items.some(
        item => item.type === 'community_flow_edited' && item.target.kind === 'community' && item.target.id === id,
      ),
      'reposter is told about the edit',
    );
    // Republishing without changes does not create a version.
    await communityAction(author!, { action: 'publish', personalFlowId, description: 'Two calm drinks' });
    assert.equal((await communityFlow(fan!, id!)).flow.version, 2);

    let status = await communityStatus(fan!);
    assert.deepEqual(
      status.copies.map(copy => [copy.savedVersion, copy.latestVersion]),
      [[1, 2]],
    );
    assert.equal(
      (await getProfile(fan!)).personalFlows?.find(flow => flow.id === copyId)?.cards.length,
      2,
      'a saved copy is not changed by the author',
    );
    await communityAction(fan!, { action: 'take-update', personalFlowId: copyId });
    const updated = (await getProfile(fan!)).personalFlows?.find(flow => flow.id === copyId);
    assert.equal(updated?.cards.length, 3);
    assert.equal(updated?.source?.version, 2);

    await assert.rejects(
      communityAction(fan!, { action: 'unpublish', id: id! }),
      /Only the author/,
    );
    await communityAction(author!, { action: 'unpublish', id: id! });
    assert.ok(!(await communityFeed(stranger!, 'following')).items.some(item => item.flow.id === id));
    status = await communityStatus(fan!);
    assert.equal(status.copies[0].latestVersion, null, 'copy reports the original as removed');
    assert.ok((await getProfile(fan!)).personalFlows?.some(flow => flow.id === copyId));
    console.log('community flows: publish, vote, repost, follow, copy, edit and removal pass');
  } finally {
    await pool.query('DELETE FROM users WHERE id=ANY($1)', [ids]);
    await pool.end();
    await globalThis.betterHabitsPgPool?.end();
  }
}
void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
