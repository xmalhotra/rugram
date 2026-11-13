import { z } from 'zod';
import { readPersonalMetrics } from './personal-metric-store';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';
import { exercise } from '../../shared/exercises';
import { gymFlowById } from '../../shared/gym-flows';
import { flowLevelOf, finisherFor } from '../../shared/priority-finisher';
import { trainingCatalog } from '../../shared/training-seed';
import type { SessionBlock } from '../../shared/training';
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
  // `exerciseId: null` puts that one item back.
  z.object({ action: z.literal('swap'), source, key: itemKey, exerciseId: itemKey.nullable() }).strict(),
  // `out: false` puts that item back.
  z.object({ action: z.literal('remove'), source, key: itemKey, out: z.boolean() }).strict(),
  z.object({ action: z.literal('reset'), source }).strict(),
]);
export type CustomflowAction = z.infer<typeof customflowActionSchema>;

type Stored = Customflow & { userId: string };

function withFrom(flow: Customflow, fromName: string | null | undefined): Customflow {
  if (!fromName) {
    const next = { ...flow };
    delete next.fromName;
    return next;
  }
  return { ...flow, fromName };
}

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
        .map(({ source, changes, createdAt, updatedAt, fromName }) => withFrom({ source, changes, createdAt, updatedAt }, fromName))
    : (
        await (await import('./database')).database()`SELECT source_kind, source_id, source_version, changes, from_name, created_at, updated_at
          FROM customflows WHERE user_id=${user.id}`
      ).map(row =>
        withFrom(
          {
            source: {
              kind: String(row.source_kind) as CustomflowSource['kind'],
              id: String(row.source_id),
              version: row.source_version == null ? null : Number(row.source_version),
            },
            changes: (row.changes ?? {}) as Customflow['changes'],
            createdAt: new Date(String(row.created_at)).toISOString(),
            updatedAt: new Date(String(row.updated_at)).toISOString(),
          },
          row.from_name == null ? null : String(row.from_name),
        ),
      );
  return Object.fromEntries(list.map(item => [customflowKey(item.source.kind, item.source.id), item]));
}

function sessionBlock(sessionId: string, key: string): SessionBlock {
  const session = trainingCatalog().sessions.find(item => item.id === sessionId);
  if (!session) throw new CustomflowError('Unknown session.');
  const block = session.blocks.find(item => item.id === key);
  if (!block) throw new CustomflowError('That block is not in this session.');
  if (!block.exerciseId) throw new CustomflowError('That block has no exercise to swap.');
  return block;
}

/** The exercise another block already shows, once `key` is swapped to `exerciseId`. */
function sessionSwapAlreadyUsed(sessionId: string, swaps: Record<string, string>, key: string, exerciseId: string) {
  const session = trainingCatalog().sessions.find(item => item.id === sessionId);
  if (!session) return false;
  return session.blocks.some(block => {
    if (block.id === key || !block.exerciseId) return false;
    const current = swaps[block.id];
    const shown = current && current !== block.exerciseId ? current : block.exerciseId;
    return shown === exerciseId;
  });
}

/** The exercise another slot already shows, once `key` is swapped to `exerciseId`. */
function swapAlreadyUsed(
  flowId: string,
  swaps: Record<string, string>,
  key: string,
  exerciseId: string,
) {
  const flow = gymFlowById(flowId);
  if (!flow) return false;
  return flow.items.some(item => {
    if (item.exerciseId === key) return false;
    const current = swaps[item.exerciseId];
    const shown = current && current !== item.exerciseId ? current : item.exerciseId;
    return shown === exerciseId;
  });
}

function applySwap(
  target: CustomflowSource,
  existing: Customflow | undefined,
  key: string,
  exerciseId: string | null,
) {
  let ownExercise: string | null = null;
  if (target.kind === 'qram-flow') {
    const flow = gymFlowById(target.id);
    const inFlow = flow?.items.some(item => item.exerciseId === key) ?? false;
    // A priority finisher is not in the source. changeCustomflow already checked that this key is one.
    if (!inFlow && !exercise(key)) throw new CustomflowError('That exercise is not in this flow.');
    ownExercise = key;
  } else if (target.kind === 'qram-session') {
    ownExercise = sessionBlock(target.id, key).exerciseId ?? null;
  }
  const swaps = { ...(existing?.changes.swaps ?? {}) };
  if (exerciseId == null || exerciseId === ownExercise || exerciseId === key) delete swaps[key];
  else {
    if (!exercise(exerciseId)) throw new CustomflowError('Unknown exercise.');
    if (target.kind === 'qram-flow' && swapAlreadyUsed(target.id, swaps, key, exerciseId))
      throw new CustomflowError('This flow already includes that exercise.');
    if (target.kind === 'qram-session' && sessionSwapAlreadyUsed(target.id, swaps, key, exerciseId))
      throw new CustomflowError('This session already includes that exercise.');
    swaps[key] = exerciseId;
  }
  return withChange(existing?.changes ?? {}, 'swaps', Object.keys(swaps).length ? swaps : null);
}

function applyRemove(existing: Customflow | undefined, key: string, out: boolean) {
  const removed = [...(existing?.changes.removed ?? [])];
  const index = removed.indexOf(key);
  if (out) {
    if (index < 0) removed.push(key);
  } else if (index >= 0) removed.splice(index, 1);
  if (removed.length > maxCustomflowItems) throw new CustomflowError('Too many changes.');
  return withChange(existing?.changes ?? {}, 'removed', removed.length ? removed : null);
}

/** A flow item, or the priority finisher this member would currently be given. */
async function allowsFlowKey(user: PublicUser, flowId: string, key: string) {
  const flow = gymFlowById(flowId);
  if (!flow) return false;
  if (flow.items.some(item => item.exerciseId === key)) return true;
  const metrics = await readPersonalMetrics(user);
  const priorities = metrics['gym.priorities']?.areas ?? [];
  if (!priorities.length) return false;
  return finisherFor(flow.items, priorities, flowLevelOf(flow.level)).some(item => item.exerciseId === key);
}

export async function changeCustomflow(user: PublicUser, action: CustomflowAction, now = Date.now()) {
  const target = checkSource(action.source);
  const key = customflowKey(target.kind, target.id);
  const existing = (await readCustomflows(user))[key];
  if (action.action === 'swap' || action.action === 'remove') {
    if (target.kind === 'qram-flow') {
      const already = action.action === 'remove' && existing?.changes.removed?.includes(action.key);
      if (!already && !(await allowsFlowKey(user, target.id, action.key))) throw new CustomflowError('That exercise is not in this flow.');
    }
    if (action.action === 'remove' && target.kind === 'qram-session') sessionBlock(target.id, action.key);
  }
  const changes =
    action.action === 'reset'
      ? {}
      : action.action === 'order'
        ? withChange(existing?.changes ?? {}, 'order', action.keys ? [...new Set(action.keys)] : null)
        : action.action === 'remove'
          ? applyRemove(existing, action.key, action.out)
          : applySwap(target, existing, action.key, action.exerciseId);
  const at = new Date(now).toISOString();
  const keep = hasChanges(changes);
  if (demo()) {
    const list = memory();
    const index = list.findIndex(item => item.userId === user.id && customflowKey(item.source.kind, item.source.id) === key);
    if (index >= 0) list.splice(index, 1);
    if (keep)
      list.push({
        userId: user.id,
        source: target,
        changes,
        createdAt: existing?.createdAt ?? at,
        updatedAt: at,
        ...(existing?.fromName ? { fromName: existing.fromName } : {}),
      });
  } else {
    const sql = (await import('./database')).database();
    if (keep)
      await sql`INSERT INTO customflows(user_id, source_kind, source_id, source_version, changes, from_name, created_at, updated_at)
        VALUES(${user.id}, ${target.kind}, ${target.id}, ${target.version}, ${JSON.stringify(changes)}::jsonb, ${existing?.fromName ?? null}, ${at}, ${at})
        ON CONFLICT (user_id, source_kind, source_id) DO UPDATE SET source_version=EXCLUDED.source_version,
          changes=EXCLUDED.changes, updated_at=EXCLUDED.updated_at,
          from_name=COALESCE(EXCLUDED.from_name, customflows.from_name)`;
    else await sql`DELETE FROM customflows WHERE user_id=${user.id} AND source_kind=${target.kind} AND source_id=${target.id}`;
  }
  if (keep) {
    const { attributeFollowEdit } = await import('./follow-store');
    await attributeFollowEdit(user, target.id);
  }
  return readCustomflows(user);
}

/** Writes a Custom flow that keeps "from q_name". Used when a trial is kept. */
export async function saveAttributedCustomflow(user: PublicUser, flow: Customflow & { fromName: string }, now = Date.now(), useDemo?: boolean) {
  const at = new Date(now).toISOString();
  const saved = { ...flow, createdAt: flow.createdAt || at, updatedAt: at };
  if (useDemo ?? demo()) {
    const list = memory();
    const key = customflowKey(saved.source.kind, saved.source.id);
    const index = list.findIndex(item => item.userId === user.id && customflowKey(item.source.kind, item.source.id) === key);
    const row: Stored = { userId: user.id, ...saved };
    if (index >= 0) list[index] = { ...row, createdAt: list[index]?.createdAt ?? saved.createdAt };
    else list.push(row);
    return;
  }
  const sql = (await import('./database')).database();
  await sql`INSERT INTO customflows(user_id, source_kind, source_id, source_version, changes, from_name, created_at, updated_at)
    VALUES(${user.id}, ${saved.source.kind}, ${saved.source.id}, ${saved.source.version}, ${JSON.stringify(saved.changes)}::jsonb, ${saved.fromName}, ${saved.createdAt}, ${saved.updatedAt})
    ON CONFLICT (user_id, source_kind, source_id) DO UPDATE SET source_version=EXCLUDED.source_version,
      changes=EXCLUDED.changes, from_name=EXCLUDED.from_name, updated_at=EXCLUDED.updated_at`;
}
