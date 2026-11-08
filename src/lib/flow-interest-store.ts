import { z } from 'zod';
import { demoModeEnabled } from './runtime-config';
import { catalogFlow } from '../../shared/flow-catalog';
import { demoInboxPut } from './demo-inbox';
import type { PublicUser } from './types';

export class FlowInterestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const id = z.string().trim().min(1).max(80);
export const flowInterestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('want'), catalogFlowId: id }).strict(),
  z.object({ action: z.literal('unwant'), catalogFlowId: id }).strict(),
  z.object({ action: z.literal('notify'), catalogFlowId: id }).strict(),
]);

type InterestRow = {
  id: string;
  userId: string;
  catalogFlowId: string;
  createdAt: string;
  notifiedAt: string | null;
};

declare global {
  var qramFlowInterest: InterestRow[] | undefined;
}

function demoMode() {
  return demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramFlowInterest ??= []);
}

function requireKnownFlow(catalogFlowId: string) {
  const flow = catalogFlow(catalogFlowId);
  if (!flow) throw new FlowInterestError('Unknown flow.', 400);
  return flow;
}

function requireAdmin(user: PublicUser) {
  if (user.role !== 'admin') throw new FlowInterestError('Admin access required.', 403);
}

export async function wantedIds(user: PublicUser) {
  if (demoMode())
    return memory()
      .filter(row => row.userId === user.id)
      .map(row => row.catalogFlowId);
  const { database } = await import('./database');
  const rows = await database()`SELECT catalog_flow_id FROM flow_interest WHERE user_id=${user.id} ORDER BY created_at, id`;
  return rows.map(row => String(row.catalog_flow_id));
}

export async function wantFlow(user: PublicUser, catalogFlowId: string) {
  requireKnownFlow(catalogFlowId);
  if (demoMode()) {
    const rows = memory();
    if (!rows.some(row => row.userId === user.id && row.catalogFlowId === catalogFlowId))
      rows.push({
        id: crypto.randomUUID(),
        userId: user.id,
        catalogFlowId,
        createdAt: new Date().toISOString(),
        notifiedAt: null,
      });
    return wantedIds(user);
  }
  const { database } = await import('./database');
  await database()`INSERT INTO flow_interest(id, user_id, catalog_flow_id) VALUES(${crypto.randomUUID()}, ${user.id}, ${catalogFlowId}) ON CONFLICT(user_id, catalog_flow_id) DO NOTHING`;
  return wantedIds(user);
}

export async function unwantFlow(user: PublicUser, catalogFlowId: string) {
  requireKnownFlow(catalogFlowId);
  if (demoMode()) {
    globalThis.qramFlowInterest = memory().filter(
      row => !(row.userId === user.id && row.catalogFlowId === catalogFlowId),
    );
    return wantedIds(user);
  }
  const { database } = await import('./database');
  await database()`DELETE FROM flow_interest WHERE user_id=${user.id} AND catalog_flow_id=${catalogFlowId}`;
  return wantedIds(user);
}

export type FlowInterestQueue = {
  flows: { catalogFlowId: string; title: string; count: number }[];
};

export async function adminInterest(user: PublicUser): Promise<FlowInterestQueue> {
  requireAdmin(user);
  if (demoMode()) {
    const counts = new Map<string, number>();
    for (const row of memory()) counts.set(row.catalogFlowId, (counts.get(row.catalogFlowId) ?? 0) + 1);
    const flows = [...counts.entries()]
      .map(([catalogFlowId, count]) => ({
        catalogFlowId,
        title: catalogFlow(catalogFlowId)?.title ?? catalogFlowId,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
    return { flows };
  }
  const { database } = await import('./database');
  const ranked = await database()`SELECT catalog_flow_id, count(*)::int AS count FROM flow_interest GROUP BY catalog_flow_id`;
  const flows = ranked
    .map(row => ({
      catalogFlowId: String(row.catalog_flow_id),
      title: catalogFlow(String(row.catalog_flow_id))?.title ?? String(row.catalog_flow_id),
      count: Number(row.count),
    }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
  return { flows };
}

/** Tells each person who asked and has not been told yet. A second call sends nothing new. */
export async function notifyRequesters(user: PublicUser, catalogFlowId: string) {
  requireAdmin(user);
  const flow = requireKnownFlow(catalogFlowId);
  const sentence = `${flow.title} is ready. You asked for it.`;
  const businessKey = `flow-ready:${catalogFlowId}`;
  if (demoMode()) {
    const pending = memory().filter(row => row.catalogFlowId === catalogFlowId && !row.notifiedAt);
    const now = new Date().toISOString();
    for (const row of pending) {
      demoInboxPut(row.userId, businessKey, {
        type: 'flow_ready',
        title: sentence,
        body: sentence,
        target: { kind: 'flow', id: catalogFlowId },
      });
      row.notifiedAt = now;
    }
    return pending.length;
  }
  const { database } = await import('./database');
  const rows = await database()`WITH pending AS (
      SELECT user_id FROM flow_interest WHERE catalog_flow_id=${catalogFlowId} AND notified_at IS NULL
    ), noted AS (
      SELECT user_id, mobile_inbox_put(user_id, ${businessKey}, 'flow_ready', ${sentence}, ${sentence}, 'flow', ${catalogFlowId}) AS sent FROM pending
    )
    UPDATE flow_interest AS interest SET notified_at=now()
    FROM noted WHERE interest.user_id=noted.user_id AND interest.catalog_flow_id=${catalogFlowId} AND interest.notified_at IS NULL
    RETURNING interest.user_id`;
  return rows.length;
}
