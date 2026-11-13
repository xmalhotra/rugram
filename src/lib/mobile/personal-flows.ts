import 'server-only';
import { z } from 'zod';
import { flows } from '../../../shared/mobile';
import {
  findFlowCard,
  updatePersonalFlows,
  type PersonalFlow,
  type PersonalFlowAction,
  type FlowCardReference,
} from '../../../shared/personal-flows';
import { isDemoMode } from '../store';
import type { PublicUser } from '../types';
import { managedLibrary } from '../admin-content-store';
import { workoutCatalog } from '../exercise-store';
import { getProfile } from './profile';
import { sqlClient, state } from './state';

const id = z.string().min(1).max(128);
const flowId = z.string().regex(/^personal-[a-zA-Z0-9-]{8,80}$/);
const name = z.string().trim().min(1).max(60);
export const personalFlowActions = [
  z
    .object({
      action: z.literal('personal-flow-create'),
      id: flowId,
      name,
      sourceFlowId: id,
      cardId: id,
    })
    .strict(),
  z
    .object({ action: z.literal('personal-flow-add'), id: flowId, sourceFlowId: id, cardId: id })
    .strict(),
  z.object({ action: z.literal('personal-flow-rename'), id: flowId, name }).strict(),
  z.object({ action: z.literal('personal-flow-remove'), id: flowId, cardId: id }).strict(),
  z
    .object({
      action: z.literal('personal-flow-move'),
      id: flowId,
      cardId: id,
      direction: z.enum(['up', 'down']),
    })
    .strict(),
] as const;
const schema = z.discriminatedUnion('action', personalFlowActions);

export async function editPersonalFlow(user: PublicUser, raw: PersonalFlowAction) {
  const input = schema.parse(raw);
  let reference: FlowCardReference | undefined;
  if (input.action === 'personal-flow-create' || input.action === 'personal-flow-add') {
    const card = findFlowCard(await cardLibrary(), input.sourceFlowId, input.cardId);
    if (!card) throw new Error('Personal flow card is not available.');
    reference = { sourceFlowId: input.sourceFlowId, cardId: card.id, title: card.title };
  }
  const now = new Date().toISOString();
  await mutatePersonalFlows(user, previous => updatePersonalFlows(previous, input, now, reference));
}

/** Library of cards a personal or community flow may reference. */
export async function cardLibrary() {
  const workouts = await workoutCatalog();
  const library = await managedLibrary([
    ...new Map([...flows, ...workouts.workouts].map(flow => [flow.id, flow])).values(),
  ]);
  return library.flows;
}

/** Applies `change` to the member's personal flows; returns the list before the change. */
export async function mutatePersonalFlows(
  user: PublicUser,
  change: (previous: PersonalFlow[]) => PersonalFlow[],
) {
  await getProfile(user);
  if (isDemoMode()) {
    const profile = state.profiles[user.id];
    const previous = profile.personalFlows ?? [];
    profile.personalFlows = change(previous);
    return previous;
  }
  const sql = sqlClient();
  // Compare-and-swap only this JSON field, so concurrent card additions cannot overwrite
  // each other or unrelated saves/preferences. Ownership always comes from the session.
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows =
      await sql`SELECT COALESCE(data->'personalFlows','[]'::jsonb) AS personal FROM mobile_profiles WHERE user_id=${user.id}`;
    const previous = rows[0].personal as PersonalFlow[];
    const next = change(previous);
    const saved =
      await sql`UPDATE mobile_profiles SET data=jsonb_set(data,'{personalFlows}',${JSON.stringify(next)}::jsonb),updated_at=now() WHERE user_id=${user.id} AND COALESCE(data->'personalFlows','[]'::jsonb)=${JSON.stringify(previous)}::jsonb RETURNING user_id`;
    if (saved.length) return previous;
  }
  throw new Error('Personal flow changed in another session. Please try again.');
}
