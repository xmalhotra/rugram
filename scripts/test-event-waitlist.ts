import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config({ path: '.env.local', quiet: true });
// Five people: one curator hosts a 3-seat event with a waitlist and a meal question;
// four guests register, one withdraws, and the waitlisted guest takes the seat.
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/betterhabits_local')
    throw new Error('Use the isolated local test database.');
  process.env.RUGRAM_DEMO_MODE = 'false';
  const pool = new Pool({ connectionString: url.toString() });
  const ids = Array.from({ length: 5 }, () => crypto.randomUUID());
  const eventId = `test-waitlist-${crypto.randomUUID()}`;
  const { getUser } = await import('../src/lib/store');
  const { changeRegistration, registrationView } = await import('../src/lib/event-registration-store');
  const { notificationInbox } = await import('../src/lib/notification-store');
  try {
    for (const [index, id] of ids.entries())
      await pool.query('INSERT INTO users(id,handle,name,role) VALUES($1,$1,$2,$3)', [
        id,
        `Person ${index}`,
        index === 0 ? 'creator' : 'member',
      ]);
    const [curator, meera, kabir, zoya, rohan] = (await Promise.all(ids.map(id => getUser(id)))).map(
      user => user!,
    );
    await pool.query("INSERT INTO mobile_catalog(id,kind,data) VALUES($1,'event',$2)", [
      eventId,
      JSON.stringify({
        id: eventId,
        title: 'Founders breakfast',
        city: 'Hyderabad',
        venue: 'T-Hub',
        location: { name: 'T-Hub', address: 'Knowledge City, Hyderabad', lat: 17.43, lng: 78.38 },
        startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        status: 'published',
        createdBy: curator.id,
        registrationMode: 'approval',
        requireApproval: false,
        waitlist: true,
        guestCapacity: 3,
        entryFee: 0,
        questions: [
          { id: 'meal', label: 'Meal', kind: 'choice', options: ['Veg', 'Non-veg', 'Jain'], required: true },
          { id: 'company', label: 'Company', kind: 'text', required: false },
        ],
      }),
    ]);
    const register = (user: typeof meera, answers: Record<string, string>) =>
      changeRegistration(user, eventId, 'request', undefined, answers);

    await assert.rejects(register(meera, {}), /Answer: Meal/);
    await assert.rejects(register(meera, { meal: 'Vegan' }), /Choose an option/);
    await assert.rejects(register(meera, { meal: 'Veg', shoe: '9' }), /only this event/);
    assert.equal((await register(meera, { meal: 'Veg', company: 'Acme' })).ownStatus, 'approved');
    assert.equal((await register(kabir, { meal: 'Non-veg' })).ownStatus, 'approved');
    assert.equal((await register(zoya, { meal: 'Veg' })).ownStatus, 'approved');
    const waiting = await register(rohan, { meal: 'Jain' });
    assert.deepEqual([waiting.ownStatus, waiting.waitlistPosition, waiting.approvedCount], ['waitlisted', 1, 3]);

    // The curator sees the full house, the waitlist and the meal tally.
    let host = await registrationView(curator, eventId);
    assert.deepEqual([host.approvedCount, host.waitlistCount, host.canManage], [3, 1, true]);
    assert.deepEqual(host.answerTally?.[0].counts, { Veg: 2, 'Non-veg': 1, Jain: 1 });

    // Kabir withdraws: his seat goes to Rohan at once, and Rohan is told.
    await changeRegistration(kabir, eventId, 'cancel');
    const promoted = await registrationView(rohan, eventId);
    assert.deepEqual([promoted.ownStatus, promoted.waitlistPosition], ['approved', undefined]);
    const inbox = await notificationInbox(rohan);
    assert.ok(inbox.items.some(item => item.title === "A seat opened: you're in" && item.target.id === eventId));
    assert.ok(inbox.items.some(item => item.type === 'registration_waitlisted'));
    host = await registrationView(curator, eventId);
    assert.deepEqual([host.approvedCount, host.waitlistCount], [3, 0]);
    assert.deepEqual(host.answerTally?.[0].counts, { Veg: 2, 'Non-veg': 0, Jain: 1 });

    // Kabir comes back: the event is full again, so he joins the waitlist.
    assert.equal((await register(kabir, { meal: 'Veg' })).ownStatus, 'waitlisted');
    // Declining an approved guest also frees the seat for the waitlist.
    await changeRegistration(curator, eventId, 'decline', zoya.id);
    assert.equal((await registrationView(kabir, eventId)).ownStatus, 'approved');
    console.log('event waitlist: seats, questions, waitlist, withdrawal promotion and host tally pass');
  } finally {
    await pool.query('DELETE FROM mobile_catalog WHERE id=$1', [eventId]);
    await pool.query('DELETE FROM users WHERE id=ANY($1)', [ids]);
    await pool.end();
    await globalThis.betterHabitsPgPool?.end();
  }
}
void main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
