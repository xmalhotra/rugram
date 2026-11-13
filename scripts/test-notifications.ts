import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import { Pool } from 'pg';
dotenv.config({ path: '.env.local', quiet: true });
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/betterhabits_local')
    throw new Error('Use the isolated betterhabits_local database.');
  process.env.RUGRAM_DEMO_MODE = 'false';
  const pool = new Pool({ connectionString: url.toString() });
  const ids = Array.from({ length: 4 }, () => crypto.randomUUID());
  const eventId = `inbox-event-${crypto.randomUUID()}`;
  const productId = `inbox-product-${crypto.randomUUID()}`;
  const { getUser, createSession } = await import('../src/lib/store');
  const { tokenId } = await import('../src/lib/session');
  const { notificationInbox, readNotifications } = await import('../src/lib/notification-store');
  const { changeRegistration, manageHostedEvent } =
    await import('../src/lib/event-registration-store');
  const { reviewItem } = await import('../src/lib/mobile-store');
  const { GET, POST } = await import('../src/app/api/mobile/notifications/route');
  const { GET: readSharedItem } = await import('../src/app/api/mobile/item/route');
  const { GET: searchItems } = await import('../src/app/api/mobile/search/route');
  try {
    for (const [index, id] of ids.entries())
      await pool.query('INSERT INTO users(id,handle,name,role) VALUES($1,$1,$1,$2)', [
        id,
        index === 0 ? 'admin' : index === 1 ? 'creator' : 'member',
      ]);
    const [admin, creator, guest, stranger] = await Promise.all(ids.map(id => getUser(id)));
    const event = {
      id: eventId,
      title: 'Disposable inbox fixture',
      city: 'Hyderabad',
      country: 'IN',
      topic: 'Tech',
      venue: 'Test space',
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      createdBy: creator!.id,
      status: 'published',
      registrationMode: 'approval',
      registrationStatus: 'Registration link available',
      guestCapacity: 100,
    };
    await pool.query("INSERT INTO mobile_catalog(id,kind,data) VALUES($1,'event',$2::jsonb)", [
      eventId,
      JSON.stringify(event),
    ]);
    await changeRegistration(guest!, eventId, 'request');
    assert.equal(
      (await notificationInbox(creator!)).items.filter(
        item => item.type === 'registration_requested',
      ).length,
      1,
    );
    await changeRegistration(creator!, eventId, 'approve', guest!.id);
    await changeRegistration(creator!, eventId, 'approve', guest!.id);
    let inbox = await notificationInbox(guest!);
    assert.equal(
      inbox.items.filter(item => item.type === 'registration_approved').length,
      1,
      'Repeated approval is idempotent',
    );
    const approval = inbox.items[0];
    await readNotifications(stranger!, approval.id);
    assert.equal(
      (await notificationInbox(guest!)).items[0].readAt,
      null,
      'Non-recipient cannot mark another account read',
    );
    const token = crypto.randomUUID();
    await createSession(stranger!.id, tokenId(token), new Date(Date.now() + 600000));
    const response = await GET(
      new Request('http://localhost/api/mobile/notifications', {
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).items.length, 0);
    const sharedUrl = `http://localhost/api/mobile/item?kind=event&id=${eventId}`;
    assert.equal((await readSharedItem(new Request(sharedUrl))).status, 401);
    const shared = await readSharedItem(
      new Request(sharedUrl, { headers: { authorization: `Bearer ${token}` } }),
    );
    assert.equal(shared.status, 200);
    const sharedBody = await shared.json();
    assert.equal(sharedBody.item.id, eventId);
    assert.equal(sharedBody.item.guests, undefined);
    const searchRequest = (query: string) =>
      new Request(`http://localhost/api/mobile/search?q=${encodeURIComponent(query)}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    assert.equal(
      (await searchItems(new Request('http://localhost/api/mobile/search?q=Hyderabad'))).status,
      401,
    );
    const searchResult = await searchItems(searchRequest('Hyderabad'));
    assert.equal(searchResult.status, 200);
    assert.ok(
      (await searchResult.json()).events.some((item: { id: string }) => item.id === eventId),
    );
    assert.equal((await searchItems(searchRequest('%%'))).status, 200);
    const literalSearch = await searchItems(searchRequest('%%'));
    assert.equal((await literalSearch.json()).events.length, 0, 'Wildcards are literal query text');
    assert.equal((await searchItems(searchRequest('x'.repeat(81)))).status, 400);
    const tampered = await POST(
      new Request('http://localhost/api/mobile/notifications', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'read-all', recipientId: guest!.id }),
      }),
    );
    assert.equal(tampered.status, 400);
    await readNotifications(guest!, approval.id);
    assert.ok((await notificationInbox(guest!)).items[0].readAt);
    await manageHostedEvent(creator!, eventId, 'cancel-event');
    inbox = await notificationInbox(guest!);
    assert.equal(inbox.items.filter(item => item.type === 'event_cancelled').length, 1);
    assert.match(inbox.items.find(item => item.type === 'event_cancelled')!.body, /calendar/);
    const product = {
      id: productId,
      title: 'Disposable listing',
      createdBy: creator!.id,
      status: 'pending',
      category: 'Tech',
    };
    await pool.query("INSERT INTO mobile_catalog(id,kind,data) VALUES($1,'product',$2::jsonb)", [
      productId,
      JSON.stringify(product),
    ]);
    await reviewItem(admin!, productId, 'archived', 'Please include a current source.', 'sources');
    assert.equal(
      (
        await readSharedItem(
          new Request(`http://localhost/api/mobile/item?kind=pick&id=${productId}`, {
            headers: { authorization: `Bearer ${token}` },
          }),
        )
      ).status,
      404,
    );
    const rejection = (await notificationInbox(creator!)).items.find(
      item => item.type === 'listing_rejected',
    );
    const hiddenSearch = await searchItems(searchRequest('Disposable listing'));
    assert.ok(
      !(await hiddenSearch.json()).products.some((item: { id: string }) => item.id === productId),
      'Archived picks are not searchable',
    );
    assert.ok(rejection);
    assert.match(rejection.body, /current source/);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE mobile_event_registrations SET status='declined' WHERE event_id=$1 AND user_id=$2",
        [eventId, guest!.id],
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    assert.equal(
      (await notificationInbox(guest!)).items.some(item => item.type === 'registration_declined'),
      false,
      'Rolled-back decisions do not notify',
    );
    await readNotifications(guest!);
    assert.equal((await notificationInbox(guest!)).unreadCount, 0);
    await pool.query(
      "UPDATE mobile_notifications SET read_at=now()-interval '31 days' WHERE recipient_id=$1",
      [guest!.id],
    );
    assert.equal(
      (await notificationInbox(guest!)).items.length,
      0,
      'Read items expire after 30 days',
    );
    console.log(
      'PASS: transactional notifications, idempotent approval, host requests, cancellation, listing rejection reasons, recipient privacy, API body protection, rollback and 30-day read retention.',
    );
  } finally {
    await pool.query(
      'DELETE FROM mobile_notifications WHERE target_id=ANY($1::text[]) OR business_key LIKE ANY($2::text[])',
      [
        [eventId, productId],
        [`catalog:${eventId}:%`, `catalog:${productId}:%`],
      ],
    );
    await pool.query('DELETE FROM mobile_content_audit WHERE item_id=ANY($1::text[])', [
      [eventId, productId],
    ]);
    await pool.query('DELETE FROM mobile_catalog WHERE id=ANY($1::text[])', [[eventId, productId]]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [ids]);
    await pool.end();
    await globalThis.betterHabitsPgPool?.end();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
