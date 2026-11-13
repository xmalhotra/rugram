import 'server-only';
import { database } from './database';
import { isDemoMode } from './store';
import { getItem } from './mobile/catalog';
import { demoInboxPut } from './notification-store';
import type { PublicUser } from './types';
import type { MemberReport, reportOutcomes, reportReasons } from '../../shared/reports';
type Stored = MemberReport & { reporterId: string; resolvedBy?: string };
declare global {
  var betterHabitsReports: Stored[] | undefined;
}
export class ReportError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function publicRow(row: Record<string, unknown>): MemberReport {
  return {
    id: String(row.id),
    kind: row.kind as MemberReport['kind'],
    itemId: String(row.item_id),
    title: String(row.title),
    reason: row.reason as MemberReport['reason'],
    note: String(row.note),
    createdAt: new Date(String(row.created_at)).toISOString(),
    status: row.status as MemberReport['status'],
    outcome: row.outcome as MemberReport['outcome'],
    resolvedAt: row.resolved_at ? new Date(String(row.resolved_at)).toISOString() : null,
  };
}
const visible = (item: Stored): MemberReport => {
  const { reporterId, resolvedBy, ...value } = item;
  void reporterId;
  void resolvedBy;
  return value;
};
export async function ownReport(user: PublicUser, kind: MemberReport['kind'], itemId: string) {
  if (isDemoMode()) {
    const row = globalThis.betterHabitsReports?.find(
      item => item.reporterId === user.id && item.kind === kind && item.itemId === itemId,
    );
    return row ? visible(row) : null;
  }
  const rows =
    await database()`SELECT * FROM mobile_reports WHERE reporter_id=${user.id} AND kind=${kind} AND item_id=${itemId}`;
  return rows[0] ? publicRow(rows[0]) : null;
}
export async function createReport(
  user: PublicUser,
  input: {
    kind: MemberReport['kind'];
    itemId: string;
    reason: (typeof reportReasons)[number];
    note: string;
  },
) {
  const item = await getItem(input.itemId);
  if (
    !item ||
    item.status !== 'published' ||
    (input.kind === 'pick' ? !('category' in item) : !('city' in item))
  )
    throw new ReportError('This item is no longer available.', 404);
  if (isDemoMode()) {
    const rows = (globalThis.betterHabitsReports ??= []);
    const previous = rows.find(
      row => row.reporterId === user.id && row.kind === input.kind && row.itemId === input.itemId,
    );
    if (previous) return visible(previous);
    const next: Stored = {
      ...input,
      id: crypto.randomUUID(),
      reporterId: user.id,
      title: item.title,
      createdAt: new Date().toISOString(),
      status: 'open',
      outcome: null,
      resolvedAt: null,
    };
    rows.push(next);
    return visible(next);
  }
  const rows =
    await database()`INSERT INTO mobile_reports(id,reporter_id,item_id,kind,title,reason,note) VALUES(${crypto.randomUUID()},${user.id},${input.itemId},${input.kind},${item.title},${input.reason},${input.note}) ON CONFLICT(reporter_id,kind,item_id) DO UPDATE SET id=mobile_reports.id RETURNING *`;
  return publicRow(rows[0]);
}
export async function reportWorklist(user: PublicUser, cursor = '') {
  if (user.role !== 'admin') throw new ReportError('Admin access required.', 403);
  if (isDemoMode()) {
    const all = (globalThis.betterHabitsReports ?? [])
      .filter(item => item.status === 'open')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const start = cursor ? all.findIndex(item => item.id === cursor) + 1 : 0;
    const rows = all.slice(start, start + 50);
    return {
      items: rows.map(visible),
      total: all.length,
      nextCursor: start + 50 < all.length ? rows.at(-1)!.id : null,
    };
  }
  const sql = database();
  const [rows, total] = await Promise.all([
    sql`SELECT * FROM mobile_reports WHERE status='open' AND (${cursor}='' OR (created_at,id)>(SELECT created_at,id FROM mobile_reports WHERE id=${cursor})) ORDER BY created_at,id LIMIT 51`,
    sql`SELECT count(*)::int AS count FROM mobile_reports WHERE status='open'`,
  ]);
  return {
    items: rows.slice(0, 50).map(publicRow),
    total: Number(total[0].count),
    nextCursor: rows.length > 50 ? String(rows[49].id) : null,
  };
}
export async function resolveReport(
  user: PublicUser,
  id: string,
  outcome: (typeof reportOutcomes)[number],
) {
  if (user.role !== 'admin') throw new ReportError('Admin access required.', 403);
  if (isDemoMode()) {
    const item = globalThis.betterHabitsReports?.find(
      row => row.id === id && row.status === 'open',
    );
    if (!item)
      throw new ReportError('This report has already been decided. Refresh the worklist.', 409);
    Object.assign(item, {
      status: 'resolved',
      outcome,
      resolvedAt: new Date().toISOString(),
      resolvedBy: user.id,
    });
    demoInboxPut(item.reporterId, `report:${item.id}`, {
      type: 'report_resolved',
      title: 'Your report was reviewed',
      body: `${item.title}: ${outcome}`,
      target: { kind: item.kind, id: item.itemId },
    });
    return;
  }
  const rows =
    await database()`UPDATE mobile_reports SET status='resolved',outcome=${outcome},resolved_at=now(),resolved_by=${user.id} WHERE id=${id} AND status='open' RETURNING id`;
  if (!rows.length)
    throw new ReportError('This report has already been decided. Refresh the worklist.', 409);
}
