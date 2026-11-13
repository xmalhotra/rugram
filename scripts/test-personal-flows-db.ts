import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { resolveVisualFlow } from '../shared/visual-flows';
import { resolvePersonalFlow } from '../shared/personal-flows';
import { flows } from '../shared/mobile';
dotenv.config({ path: '.env.local', quiet: true });

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/betterhabits_local')
    throw new Error('Use the isolated betterhabits_local Postgres database.');
  process.env.RUGRAM_DEMO_MODE = 'false';
  process.env.BETTERHABITS_DEMO_MODE = 'false';
  const pool = new Pool({ connectionString: url.toString() });
  const userId = randomUUID();
  const otherId = randomUUID();
  const { getUser } = await import('../src/lib/store');
  const { editPersonalFlow } = await import('../src/lib/mobile/personal-flows');
  const { getProfile, editAppearance } = await import('../src/lib/mobile/profile');
  const { exportAccount } = await import('../src/lib/account-store');
  try {
    for (const id of [userId, otherId])
      await pool.query(
        "INSERT INTO users(id,handle,name,role) VALUES($1,$1,'Personal flow test','member')",
        [id],
      );
    const user = (await getUser(userId))!;
    const other = (await getUser(otherId))!;
    const id = `personal-${randomUUID()}`;
    const source = flows.find(flow => flow.id === 'workout-animal-movements')!;
    const [first, ...rest] = resolveVisualFlow(source, flows).cards;
    const create = {
      action: 'personal-flow-create' as const,
      id,
      name: 'My flow',
      sourceFlowId: source.id,
      cardId: first.id,
    };
    await Promise.all(Array.from({ length: 4 }, () => editPersonalFlow(user, create)));
    assert.equal((await getProfile(user)).personalFlows?.length, 1);
    await Promise.all([
      ...rest.map(card =>
        editPersonalFlow(user, {
          action: 'personal-flow-add',
          id,
          sourceFlowId: source.id,
          cardId: card.id,
        }),
      ),
      editAppearance(user, 'dark'),
    ]);
    let profile = await getProfile(user);
    assert.equal(
      profile.personalFlows?.[0].cards.length,
      rest.length + 1,
      'Concurrent additions must not be lost',
    );
    assert.equal(profile.appearance, 'dark', 'Unrelated profile edits must survive');
    assert.equal(
      resolvePersonalFlow(profile.personalFlows![0], flows).cards.length,
      rest.length + 1,
    );
    await assert.rejects(
      editPersonalFlow(other, { action: 'personal-flow-rename', id, name: 'Not mine' }),
      /not found/,
    );
    assert.deepEqual((await getProfile(other)).personalFlows, undefined);
    await editPersonalFlow(user, { action: 'personal-flow-rename', id, name: 'Before work' });
    await editPersonalFlow(user, {
      action: 'personal-flow-move',
      id,
      cardId: first.id,
      direction: 'down',
    });
    profile = await getProfile(user);
    assert.equal(profile.personalFlows?.[0].name, 'Before work');
    assert.equal(profile.personalFlows?.[0].cards[1].cardId, first.id);
    await editPersonalFlow(user, { action: 'personal-flow-remove', id, cardId: first.id });
    assert.equal((await getProfile(user)).personalFlows?.[0].cards.length, rest.length);
    assert.ok(
      JSON.stringify(await exportAccount(user)).includes('Before work'),
      'Account export includes personal flows',
    );
    console.log(
      'PASS: isolated local Postgres persistence, concurrent create/add, JSON-field isolation, owner-only editing, rename/reorder/removal, account export.',
    );
  } finally {
    // These are the exact two disposable fixture accounts created above, not real users.
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [[userId, otherId]]);
    await pool.end();
    await globalThis.betterHabitsPgPool?.end();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
