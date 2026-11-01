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
  const itemId = `report-fixture-${crypto.randomUUID()}`;
  const { getUser, createSession } = await import('../src/lib/store');
  const { tokenId } = await import('../src/lib/session');
  const { createReport, ownReport, reportWorklist, resolveReport } =
    await import('../src/lib/report-store');
  const { notificationInbox } = await import('../src/lib/notification-store');
  const { exportAccount } = await import('../src/lib/account-store');
  const { GET, POST } = await import('../src/app/api/mobile/reports/route');
  try {
    for (const [index, id] of ids.entries())
      await pool.query('INSERT INTO users(id,handle,name,role) VALUES($1,$1,$1,$2)', [
        id,
        index === 0 ? 'admin' : index === 1 ? 'creator' : 'member',
      ]);
    const [admin, creator, member] = await Promise.all(ids.map(id => getUser(id)));
    await pool.query("INSERT INTO mobile_catalog(id,kind,data) VALUES($1,'product',$2)", [
      itemId,
      {
        id: itemId,
        title: 'Report test product',
        category: 'Tech',
        createdBy: creator!.id,
        status: 'published',
      },
    ]);
    const body = {
      kind: 'pick' as const,
      itemId,
      reason: 'Wrong price' as const,
      note: 'Seller price differs.',
    };
    const reports = await Promise.all(Array.from({ length: 4 }, () => createReport(member!, body)));
    assert.equal(new Set(reports.map(row => row.id)).size, 1, 'Concurrent duplicates merge');
    assert.equal(await ownReport(creator!, 'pick', itemId), null);
    await assert.rejects(reportWorklist(creator!), { status: 403 });
    await assert.rejects(resolveReport(member!, reports[0].id, 'Fixed'), { status: 403 });
    const worklist = await reportWorklist(admin!);
    const report = worklist.items.find(row => row.id === reports[0].id)!;
    assert.ok(report);
    assert.equal('reporterId' in report, false);
    assert.equal(JSON.stringify(report).includes(member!.id), false);
    const token = crypto.randomUUID();
    await createSession(member!.id, tokenId(token), new Date(Date.now() + 600000));
    assert.equal(
      (
        await GET(
          new Request('http://localhost/api/mobile/reports?view=open', {
            headers: { authorization: `Bearer ${token}` },
          }),
        )
      ).status,
      403,
    );
    assert.equal(
      (await GET(new Request(`http://localhost/api/mobile/reports?kind=pick&itemId=${itemId}`)))
        .status,
      401,
    );
    const tamper = await POST(
      new Request('http://localhost/api/mobile/reports', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...body, reporterId: creator!.id }),
      }),
    );
    assert.equal(tamper.status, 400);
    const decisions = await Promise.allSettled([
      resolveReport(admin!, report.id, 'Fixed'),
      resolveReport(admin!, report.id, 'No issue found'),
    ]);
    assert.equal(decisions.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal(decisions.filter(row => row.status === 'rejected').length, 1);
    const notifications = (await notificationInbox(member!)).items.filter(
      row => row.type === 'report_resolved',
    );
    assert.equal(notifications.length, 1);
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS count FROM mobile_content_audit WHERE item_id=$1 AND action='report_resolved'",
          [itemId],
        )
      ).rows[0].count,
      1,
    );
    const exported = await exportAccount(member!);
    assert.equal(exported.reports.length, 1);
    assert.equal((await exportAccount(creator!)).reports.length, 0);
    await pool.query(
      "UPDATE mobile_catalog SET data=jsonb_set(data,'{status}','\"archived\"') WHERE id=$1",
      [itemId],
    );
    await assert.rejects(createReport(creator!, body), { status: 404 });
    await pool.query('DELETE FROM users WHERE id=$1', [member!.id]);
    assert.equal(
      (
        await pool.query('SELECT count(*)::int AS count FROM mobile_reports WHERE reporter_id=$1', [
          member!.id,
        ])
      ).rows[0].count,
      0,
    );
    console.log(
      'PASS: reports authentication, duplicate races, creator anonymity, admin-only resolution, conflict protection, exactly-one inbox/audit, account export and deletion.',
    );
  } finally {
    await pool.query('DELETE FROM mobile_notifications WHERE target_id=$1', [itemId]);
    await pool.query('DELETE FROM mobile_content_audit WHERE item_id=$1', [itemId]);
    await pool.query('DELETE FROM mobile_catalog WHERE id=$1', [itemId]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])', [ids]);
    await pool.end();
    await globalThis.betterHabitsPgPool?.end();
  }
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
