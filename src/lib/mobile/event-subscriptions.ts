import 'server-only';
import { z } from 'zod';
import { eventInterests } from '../../../shared/event-interests';
import type { EventCategorySummary } from '../../../shared/event-interests';
import { isDemoMode } from '../store';
import type { PublicUser } from '../types';
import { managedLibrary } from '../admin-content-store';
import { sqlClient } from './state';

/** Demo store: topic -> subscriber ids (declared beside the demo inbox that reads it). */
function demo() {
  return (globalThis.qramTopicSubscriptions ??= new Map());
}

export const categorySubscriptionSchema = z
  .object({ id: z.string().min(1).max(80), enabled: z.boolean() })
  .strict();

async function interests() {
  return (await managedLibrary()).settings.eventInterests ?? eventInterests;
}

/** Each category's subscriber count and whether the viewer follows all of its topics. */
export async function categorySummaries(user: PublicUser): Promise<EventCategorySummary[]> {
  const list = await interests();
  const topics = [...new Set(list.flatMap(item => item.topics))];
  const subscribers = new Map<string, Set<string>>();
  if (isDemoMode())
    for (const topic of topics) subscribers.set(topic, new Set(demo().get(topic) ?? []));
  else
    for (const row of await sqlClient()`SELECT topic,user_id FROM event_topic_subscriptions WHERE topic=ANY(${topics}::text[])`) {
      const set = subscribers.get(String(row.topic)) ?? new Set<string>();
      set.add(String(row.user_id));
      subscribers.set(String(row.topic), set);
    }
  return list.map(item => {
    const people = new Set(item.topics.flatMap(topic => [...(subscribers.get(topic) ?? [])]));
    return {
      id: item.id,
      subscribers: people.size,
      subscribed: item.topics.every(topic => subscribers.get(topic)?.has(user.id)),
    };
  });
}

export async function setCategorySubscription(user: PublicUser, raw: unknown) {
  const input = categorySubscriptionSchema.parse(raw);
  const interest = (await interests()).find(item => item.id === input.id);
  if (!interest) throw new Error('Category not found.');
  if (isDemoMode()) {
    for (const topic of interest.topics) {
      const set = demo().get(topic) ?? new Set<string>();
      if (input.enabled) set.add(user.id);
      else set.delete(user.id);
      demo().set(topic, set);
    }
  } else if (input.enabled)
    await sqlClient()`INSERT INTO event_topic_subscriptions(user_id,topic) SELECT ${user.id},topic FROM unnest(${interest.topics}::text[]) AS topic ON CONFLICT DO NOTHING`;
  else
    await sqlClient()`DELETE FROM event_topic_subscriptions WHERE user_id=${user.id} AND topic=ANY(${interest.topics}::text[])`;
  return (await categorySummaries(user)).find(item => item.id === input.id)!;
}
