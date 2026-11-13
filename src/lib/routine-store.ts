import { z } from 'zod';
import { routineCatalog } from '../../shared/routine-seed';
import {
  routineCheckpoints,
  routineTypes,
  type Routine,
  type RoutineCard,
  type RoutineCheckpoint,
  type RoutineItem,
  type RoutineType,
} from '../../shared/routines';
import { demoModeEnabled } from './runtime-config';

const pageSize = 24;

const listSchema = z
  .object({
    checkpoint: z.enum(routineCheckpoints).optional(),
    type: z.enum(routineTypes).optional(),
    q: z.string().trim().max(80).optional(),
    cursor: z.string().regex(/^\d{1,8}$/).optional(),
    id: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

export type RoutineList = { routines: RoutineCard[]; nextCursor: string | null };
export type RoutineOne = { routine: RoutineCard };

type Query = z.infer<typeof listSchema>;

function escapeLike(value: string) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

function includes(value: string, needle: string) {
  return value.toLowerCase().includes(needle);
}

function matches(routine: Routine, needle: string, items: Map<string, RoutineItem>) {
  if (includes(routine.title, needle) || routine.aliases.some(alias => includes(alias, needle))) return true;
  return routine.parts.some(part => {
    const item = items.get(part.itemId);
    return Boolean(item && (includes(item.name, needle) || item.aliases.some(alias => includes(alias, needle))));
  });
}

function toCard(routine: Routine, items: Map<string, RoutineItem>): RoutineCard {
  return {
    id: routine.id,
    title: routine.title,
    type: routine.type,
    mainCheckpoint: routine.mainCheckpoint,
    checkpoints: routine.checkpoints,
    parts: [...routine.parts]
      .sort((a, b) => a.position - b.position)
      .map(part => ({ name: items.get(part.itemId)?.name ?? part.itemId, amount: part.amount })),
  };
}

function memoryPage(query: Query): RoutineList | RoutineOne {
  const { items, routines } = routineCatalog();
  const byId = new Map(items.map(item => [item.id, item]));
  if (query.id) {
    const found = routines.find(routine => routine.id === query.id);
    if (!found) return { routine: null as unknown as RoutineCard };
    return { routine: toCard(found, byId) };
  }
  const needle = query.q?.toLowerCase() ?? '';
  const filtered = routines.filter(routine => {
    if (query.checkpoint && !routine.checkpoints.includes(query.checkpoint)) return false;
    if (query.type && routine.type !== query.type) return false;
    if (needle && !matches(routine, needle, byId)) return false;
    return true;
  });
  filtered.sort((a, b) => {
    const aMain = query.checkpoint && a.mainCheckpoint === query.checkpoint ? 0 : 1;
    const bMain = query.checkpoint && b.mainCheckpoint === query.checkpoint ? 0 : 1;
    if (aMain !== bMain) return aMain - bMain;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.id.localeCompare(b.id);
  });
  const offset = query.cursor ? Number(query.cursor) : 0;
  const slice = filtered.slice(offset, offset + pageSize);
  const next = offset + pageSize;
  return { routines: slice.map(routine => toCard(routine, byId)), nextCursor: next < filtered.length ? String(next) : null };
}

function rowCard(
  row: Record<string, unknown>,
  parts: { name: string; amount: string | null }[],
): RoutineCard {
  return {
    id: String(row.id),
    title: String(row.title),
    type: String(row.type) as RoutineType,
    mainCheckpoint: String(row.main_checkpoint) as RoutineCheckpoint,
    checkpoints: (row.checkpoints as RoutineCheckpoint[]) ?? [],
    parts,
  };
}

async function databasePage(query: Query): Promise<RoutineList | RoutineOne> {
  const { database } = await import('./database');
  const sql = database();
  if (query.id) {
    const rows = await sql`SELECT id, title, type, main_checkpoint, checkpoints FROM routines WHERE id = ${query.id}`;
    if (!rows.length) return { routine: null as unknown as RoutineCard };
    const parts = await sql`SELECT i.name, p.amount FROM routine_parts p JOIN routine_items i ON i.id = p.item_id WHERE p.routine_id = ${query.id} ORDER BY p.position`;
    return {
      routine: rowCard(
        rows[0],
        parts.map(part => ({ name: String(part.name), amount: part.amount == null ? null : String(part.amount) })),
      ),
    };
  }
  const checkpoint = query.checkpoint ?? '';
  const type = query.type ?? '';
  const needle = query.q?.trim() ?? '';
  const like = escapeLike(needle);
  const offset = query.cursor ? Number(query.cursor) : 0;
  const rows = await sql`SELECT id, title, type, main_checkpoint, checkpoints, rank FROM routines
    WHERE (${checkpoint} = '' OR ${checkpoint} = ANY(checkpoints))
    AND (${type} = '' OR type = ${type})
    AND (${needle} = '' OR title ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(aliases) alias WHERE alias ILIKE ${like})
      OR EXISTS (SELECT 1 FROM routine_parts p JOIN routine_items i ON i.id = p.item_id
        WHERE p.routine_id = routines.id AND (i.name ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(i.aliases) alias WHERE alias ILIKE ${like}))))
    ORDER BY CASE WHEN ${checkpoint} <> '' AND main_checkpoint = ${checkpoint} THEN 0 ELSE 1 END, rank, id
    LIMIT ${pageSize} OFFSET ${offset}`;
  const ids = rows.map(row => String(row.id));
  const partRows = ids.length
    ? await sql`SELECT p.routine_id, i.name, p.amount, p.position FROM routine_parts p JOIN routine_items i ON i.id = p.item_id WHERE p.routine_id = ANY(${ids}::text[]) ORDER BY p.routine_id, p.position`
    : [];
  const grouped = new Map<string, { name: string; amount: string | null }[]>();
  for (const part of partRows) {
    const id = String(part.routine_id);
    const list = grouped.get(id) ?? [];
    list.push({ name: String(part.name), amount: part.amount == null ? null : String(part.amount) });
    grouped.set(id, list);
  }
  const more = await sql`SELECT 1 FROM routines
    WHERE (${checkpoint} = '' OR ${checkpoint} = ANY(checkpoints))
    AND (${type} = '' OR type = ${type})
    AND (${needle} = '' OR title ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(aliases) alias WHERE alias ILIKE ${like})
      OR EXISTS (SELECT 1 FROM routine_parts p JOIN routine_items i ON i.id = p.item_id
        WHERE p.routine_id = routines.id AND (i.name ILIKE ${like} OR EXISTS (SELECT 1 FROM unnest(i.aliases) alias WHERE alias ILIKE ${like}))))
    OFFSET ${offset + pageSize} LIMIT 1`;
  return {
    routines: rows.map(row => rowCard(row, grouped.get(String(row.id)) ?? [])),
    nextCursor: more.length ? String(offset + pageSize) : null,
  };
}

export async function routineGet(
  url: string,
  deps: { user: { id: string } | null; allow: boolean; demo?: boolean },
): Promise<{ status: number; body: RoutineList | RoutineOne | { error: string } }> {
  if (!deps.user) return { status: 401, body: { error: 'Please log in to continue.' } };
  if (!deps.allow) return { status: 429, body: { error: 'Please slow down.' } };
  const params = new URL(url).searchParams;
  const parsed = listSchema.safeParse({
    checkpoint: params.get('checkpoint') || undefined,
    type: params.get('type') || undefined,
    q: params.get('q') || undefined,
    cursor: params.get('cursor') || undefined,
    id: params.get('id') || undefined,
  });
  if (!parsed.success) return { status: 400, body: { error: 'Check the request and try again.' } };
  const demo = deps.demo ?? demoModeEnabled(process.env);
  try {
    const body = demo ? memoryPage(parsed.data) : await databasePage(parsed.data);
    if ('routine' in body && !body.routine) return { status: 404, body: { error: 'Routine not found.' } };
    return { status: 200, body };
  } catch {
    return { status: 503, body: { error: 'Service temporarily unavailable. Please try again.' } };
  }
}
