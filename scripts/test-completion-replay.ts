import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { habitDay } from '../shared/format';
dotenv.config({ path: '.env.local', quiet: true });
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/betterhabits_local')
    throw new Error('Use isolated local Postgres.');
  process.env.RUGRAM_DEMO_MODE = 'false';
  const pool = new Pool({ connectionString: url.toString() });
  const id = crypto.randomUUID();
  const { getUser } = await import('../src/lib/store');
  const { editProfile, getProfile } = await import('../src/lib/mobile/profile');
  try {
    await pool.query("INSERT INTO users(id,handle,name,role) VALUES($1,$1,$1,'member')", [id]);
    const user = (await getUser(id))!;
    await editProfile(user, 'flow', 'morning', true);
    const today = habitDay();
    const previous = new Date(`${today}T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    const day = previous.toISOString().slice(0, 10);
    const requestId = crypto.randomUUID();
    await Promise.all(
      Array.from({ length: 5 }, () =>
        editProfile(user, 'complete', 'morning:water', true, 'Asia/Kolkata', day, requestId),
      ),
    );
    let profile = await getProfile(user);
    assert.equal(profile.completed.filter(key => key === `${day}:morning:water`).length, 1);
    assert.equal(profile.completed.includes(`${today}:morning:water`), false);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS count FROM mobile_analytics WHERE user_id=$1 AND action='habit_completed'",
          [id],
        )
      ).rows[0].count,
      1,
    );
    await editProfile(
      user,
      'complete',
      'morning:water',
      false,
      'Asia/Kolkata',
      day,
      crypto.randomUUID(),
    );
    await editProfile(user, 'complete', 'morning:water', true, 'Asia/Kolkata', day, requestId);
    profile = await getProfile(user);
    assert.equal(
      profile.completed.includes(`${day}:morning:water`),
      false,
      'A delayed retry cannot undo a later action',
    );
    await assert.rejects(
      editProfile(user, 'complete', 'morning:water', false, 'Asia/Kolkata', day, requestId),
      /Completion request ID/,
    );
    await assert.rejects(
      editProfile(
        user,
        'complete',
        'morning:water',
        true,
        'Asia/Kolkata',
        '2099-01-01',
        crypto.randomUUID(),
      ),
      /Completion date/,
    );
    await editProfile(user, 'flow', 'morning', false);
    await assert.rejects(
      editProfile(
        user,
        'complete',
        'morning:water',
        true,
        'Asia/Kolkata',
        day,
        crypto.randomUUID(),
      ),
      /Join the flow/,
    );
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    assert.equal(
      (
        await pool.query(
          'SELECT count(*)::int AS count FROM mobile_completion_receipts WHERE user_id=$1',
          [id],
        )
      ).rows[0].count,
      0,
    );
    console.log(
      'PASS: original-day replay, concurrent idempotency, atomic analytics, opposite-action retry safety, request-body conflict, date bounds, joined-flow guard and erasure.',
    );
  } finally {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    await pool.end();
    await globalThis.betterHabitsPgPool?.end();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
