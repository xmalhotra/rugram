import { z } from 'zod';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';
import { gymFlowById } from '../../shared/gym-flows';
import {
  customflowKey,
  customflowSourceKinds,
  hasChanges,
  maxCustomflowItems,
  withChange,
  type Customflow,
  type CustomflowSource,
  type Customflows,
} from '../../shared/customflows';

export class CustomflowError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const itemKey = z.string().trim().min(1).max(160);
const source = z
  .object({
    kind: z.enum(customflowSourceKinds),
    id: z.string().trim().min(1).max(160),
    version: z.number().int().min(1).nullable().optional(),
  })
  .strict();

export const customflowActionSchema = z.discriminatedUnion('action', [
  // `keys: null` puts the source order back.
  z.object({ action: z.literal('order'), source, keys: z.array(itemKey).min(1).max(maxCustomflowItems).nullable() }).strict(),
  z.object({ action: z.literal('reset'), source }).strict(),
]);
export type CustomflowAction = z.infer<typeof customflowActionSchema>;

type Stored = Customflow & { userId: string };

declare global {
  var qramCustomflows: Stored[] | undefined;
}

function demo() {
  return demoModeEnabled(process.env);
}

function memory() {
  return (globalThis.qramCustomflows ??= []);
}

/** A Qram flow must be one whose items are exercises; community flows need their version. */
function checkSource(raw: z.infer<typeof source>): CustomflowSource {
  if (raw.kind === 'qram-flow' && !gymFlowById(raw.id)) throw new CustomflowError('Only exercise flows can be customised.');
  if (raw.kind === 'community-flow') {
    if (!/^community-[a-zA-Z0-9-]{8,80}$/.test(raw.id)) throw new CustomflowError('Unknown community flow.');
    if (raw.version == null) throw new CustomflowError('Say which version of the community flow you changed.');
  }
  return { kind: raw.kind, id: raw.id, version: raw.kind === 'community-flow' ? (raw.version ?? null) : null };
}

/** Every Customflow the member has, by "kind:id". Private. */
export async function readCustomflows(user: PublicUser): Promise<Customflows> {
  const list: Customflow[] = demo()
    ? memory()
        .filter(item => item.userId === user.id)
        .map(({ source, changes, createdAt, updatedAt }) => ({ source, changes, createdAt, updatedAt }))
    : (
        await (await import('./database')).database()`SELECT source_kind, source_id, source_version, changes, created_at, updated_at
          FROM customflows WHERE user_id=${user.id}`
      ).map(row => ({
        source: {
          kind: String(row.source_kind) as CustomflowSource['kind'],
          id: String(row.source_id),
          version: row.source_version == null ? null : Number(row.source_version),
        },
        changes: (row.changes ?? {}) as Customflow['changes'],
        createdAt: new Date(String(row.created_at)).toISOString(),
        updatedAt: new Date(String(row.updated_at)).toISOString(),
      }));
  return Object.fromEntries(list.map(item => [customflowKey(item.source.kind, item.source.id), item]));
}

export async function changeCustomflow(user: PublicUser, action: CustomflowAction, now = Date.now()) {
  const target = checkSource(action.source);
  const key = customflowKey(target.kind, target.id);
  const existing = (await readCustomflows(user))[key];
  const changes =
    action.action === 'reset'
      ? {}
      : withChange(existing?.changes ?? {}, 'order', action.keys ? [...new Set(action.keys)] : null);
  const at = new Date(now).toISOString();
  const keep = hasChanges(changes);
  if (demo()) {
    const list = memory();
    const index = list.findIndex(item => item.userId === user.id && customflowKey(item.source.kind, item.source.id) === key);
    if (index >= 0) list.splice(index, 1);
    if (keep) list.push({ userId: user.id, source: target, changes, createdAt: existing?.createdAt ?? at, updatedAt: at });
  } else {
    const sql = (await import('./database')).database();
    if (keep)
      await sql`INSERT INTO customflows(user_id, source_kind, source_id, source_version, changes, created_at, updated_at)
        VALUES(${user.id}, ${target.kind}, ${target.id}, ${target.version}, ${JSON.stringify(changes)}::jsonb, ${at}, ${at})
        ON CONFLICT (user_id, source_kind, source_id) DO UPDATE SET source_version=EXCLUDED.source_version,
          changes=EXCLUDED.changes, updated_at=EXCLUDED.updated_at`;
    else await sql`DELETE FROM customflows WHERE user_id=${user.id} AND source_kind=${target.kind} AND source_id=${target.id}`;
  }
  return readCustomflows(user);
}
