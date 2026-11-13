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
  const events = Array.from({ length: 3 }, () => `test-event-${crypto.randomUUID()}`);
  const { getUser } = await import('../src/lib/store');
  const { categorySummaries, setCategorySubscription } = await import(
    '../src/lib/mobile/event-subscriptions'
  );
  const { notificationInbox } = await import('../src/lib/notification-store');
  const event = (id: string, status: string, topic: string, createdBy: string) =>
    JSON.stringify({ id, title: `Meetup ${id.slice(-4)}`, city: 'Hyderabad', status, topic, createdBy });
  try {
    for (const id of ids)
      await pool.query("INSERT INTO users(id,handle,name,role) VALUES($1,$1,$1,'member')", [id]);
    const [fan, other, host] = (await Promise.all(ids.map(id => getUser(id))))!;
    await setCategorySubscription(fan!, { id: 'tech', enabled: true });
    await setCategorySubscription(other!, { id: 'marathons', enabled: true });
    // The host subscribes too, but never hears about their own event.
    await setCategorySubscription(host!, { id: 'tech', enabled: true });
    const tech = (await categorySummaries(fan!)).find(item => item.id === 'tech');
    assert.equal(tech?.subscribed, true);
    assert.ok((tech?.subscribers ?? 0) >= 2);
    await assert.rejects(setCategorySubscription(fan!, { id: 'nope', enabled: true }), /not found/);

    // Pending then published: subscribers hear once, on the publish.
    await pool.query("INSERT INTO mobile_catalog(id,kind,data) VALUES($1,'event',$2)", [
      events[0],
      event(events[0], 'pending', 'Tech', host!.id),
    ]);
    await pool.query('UPDATE mobile_catalog SET data=$2 WHERE id=$1', [
      events[0],
      event(events[0], 'published', 'Tech', host!.id),
    ]);
    await pool.query('UPDATE mobile_catalog SET data=$2 WHERE id=$1', [
      events[0],
      event(events[0], 'published', 'Tech', host!.id),
    ]);
    // Published straight away in another topic.
    await pool.query("INSERT INTO mobile_catalog(id,kind,data) VALUES($1,'event',$2)", [
      events[1],
      event(events[1], 'published', 'Marathons', host!.id),
    ]);
    const heard = async (user: typeof fan, id: string) =>
      (await notificationInbox(user!)).items.filter(
        item => item.type === 'event_new_in_topic' && item.target.id === id,
      ).length;
    assert.equal(await heard(fan, events[0]), 1, 'Tech subscriber hears once');
    assert.equal(await heard(other, events[0]), 0, 'Marathons subscriber does not hear about Tech');
    assert.equal(await heard(host, events[0]), 0, 'the host is not told about their own event');
    assert.equal(await heard(other, events[1]), 1);

    // After unsubscribing, new events stay quiet.
    await setCategorySubscription(fan!, { id: 'tech', enabled: false });
    await pool.query("INSERT INTO mobile_catalog(id,kind,data) VALUES($1,'event',$2)", [
      events[2],
      event(events[2], 'published', 'Tech', host!.id),
    ]);
    assert.equal(await heard(fan, events[2]), 0);
    assert.equal((await categorySummaries(fan!)).find(item => item.id === 'tech')?.subscribed, false);
    console.log('event categories: subscribe, notify on publish once, skip the host, unsubscribe pass');
  } finally {
    await pool.query('DELETE FROM mobile_catalog WHERE id=ANY($1)', [events]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)', [ids]);
    await pool.end();
    await globalThis.betterHabitsPgPool?.end();
  }
}
void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
