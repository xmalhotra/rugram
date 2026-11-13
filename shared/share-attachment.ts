/**
 * A shared flow is a snapshot. Sets, reps, exercises, items and amounts travel.
 * Weights, body weight and logs do not. Later edits are offered, never pushed.
 */
import { z } from 'zod';
import { communityLimits } from './community-flows';
import { stripPrivate } from './follow';
import type { CopySource } from './map-flow';
import type { MapFlowEffort, MapFlowRepeat } from './map-flow';
import { mapFlowEfforts, mapFlowRepeats } from './map-flow';
import type { BodyPlan } from './predicted-body-flow';
import { routineCheckpoints } from './routines';
import type { ShareKind } from './share-thresholds';
import { exercise } from './exercises';

export const attachmentKinds = ['custom-flow', 'daily-flow', 'map-flow'] as const;
export type AttachmentKind = (typeof attachmentKinds)[number];

const exerciseSchema = z
  .object({
    exerciseId: z.string().min(1).max(120),
    sets: z.number().int().min(1).max(40),
    repsMin: z.number().int().min(0).max(1000).optional(),
    repsMax: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

const itemSchema = z
  .object({
    itemId: z.string().min(1).max(80),
    name: z.string().min(1).max(80),
    amount: z.string().min(1).max(120),
    checkpoint: z.enum(routineCheckpoints),
    timesPerDay: z.number().int().min(1).max(6),
  })
  .strict();

const flowSchema = z
  .object({
    kind: z.enum(['flow', 'session', 'community']),
    id: z.string().min(1).max(120),
    version: z.number().int().min(1).optional(),
    items: z.array(exerciseSchema).max(40).optional(),
  })
  .strict();

const daySchema = z
  .object({
    name: z.string().min(1).max(80),
    effort: z.enum(mapFlowEfforts),
    exercises: z.array(exerciseSchema).max(40),
    items: z.array(itemSchema).max(12),
    flows: z.array(flowSchema).max(8),
  })
  .strict();

export const attachmentSchema = z
  .object({
    kind: z.enum(attachmentKinds),
    sourceId: z.string().min(1).max(160),
    title: z.string().min(1).max(80),
    styleId: z.string().min(1).max(80),
    styleName: z.string().min(1).max(80),
    level: z.string().min(1).max(40),
    minutes: z.number().int().min(0).max(600),
    owner: z.object({ id: z.string().min(1).max(128), name: z.string().min(1).max(80) }).strict(),
    followedFor: z.string().min(1).max(40),
    exercises: z.array(exerciseSchema).max(80),
    items: z.array(itemSchema).max(24),
    days: z.array(daySchema).max(100),
    purposeIds: z.array(z.string().min(1).max(80)).max(8),
    repeat: z.enum(mapFlowRepeats),
    version: z.number().int().min(1).max(10000),
  })
  .strict();

export type FlowAttachment = z.infer<typeof attachmentSchema>;
export type AttachmentExercise = FlowAttachment['exercises'][number];

const privateWord = /^(weightKg|bodyWeightKg|bodyWeight|logs|ticks|weight|personalised)$/;

/** Builds the public snapshot. Private keys are dropped before the schema accepts the rest. */
export function buildAttachment(raw: unknown): FlowAttachment {
  return attachmentSchema.parse(stripPrivate(raw));
}

export function attachmentKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) attachmentKeys(item, found);
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    found.push(key);
    attachmentKeys(item, found);
  }
  return found;
}

export function attachmentHasPrivate(value: unknown) {
  return attachmentKeys(value).some(key => privateWord.test(key));
}

export function exerciseLabel(id: string) {
  return exercise(id)?.name ?? 'an exercise';
}

export function followedForLabel(kind: ShareKind | AttachmentKind, count: number) {
  if (kind === 'daily-flow') return count === 1 ? '1 day' : `${count} days`;
  if (kind === 'map-flow') return count === 1 ? '1 full pattern' : `${count} full patterns`;
  return count === 1 ? '1 session' : `${count} sessions`;
}

function digest(attachment: FlowAttachment) {
  return JSON.stringify({
    title: attachment.title,
    exercises: attachment.exercises,
    items: attachment.items,
    days: attachment.days,
    styleId: attachment.styleId,
    level: attachment.level,
  });
}

export function attachmentChanged(saved: FlowAttachment, current: FlowAttachment) {
  return digest(saved) !== digest(current);
}

function repsLine(item: AttachmentExercise) {
  if (item.repsMin == null && item.repsMax == null) return `${item.sets} sets`;
  if (item.repsMin === item.repsMax || item.repsMax == null) return `${item.sets} sets of ${item.repsMin}`;
  return `${item.sets} sets of ${item.repsMin}–${item.repsMax}`;
}

/** What changed, in words a member can read. Nothing here is applied for them. */
export function attachmentChanges(saved: FlowAttachment, current: FlowAttachment) {
  const changes: string[] = [];
  if (saved.title !== current.title) changes.push(`Renamed from “${saved.title}” to “${current.title}”`);
  const before = new Map(saved.exercises.map(item => [item.exerciseId, item]));
  const after = new Map(current.exercises.map(item => [item.exerciseId, item]));
  for (const item of current.exercises) {
    const previous = before.get(item.exerciseId);
    if (!previous) changes.push(`Added ${exerciseLabel(item.exerciseId)}`);
    else if (repsLine(previous) !== repsLine(item)) changes.push(`${exerciseLabel(item.exerciseId)} is now ${repsLine(item)}`);
  }
  for (const item of saved.exercises) {
    if (!after.has(item.exerciseId)) changes.push(`Removed ${exerciseLabel(item.exerciseId)}`);
  }
  const savedItems = new Map(saved.items.map(item => [item.itemId, item]));
  const nextItems = new Map(current.items.map(item => [item.itemId, item]));
  for (const item of current.items) {
    const previous = savedItems.get(item.itemId);
    if (!previous) changes.push(`Added ${item.name}`);
    else if (previous.amount !== item.amount) changes.push(`${item.name} is now ${item.amount}`);
  }
  for (const item of saved.items) {
    if (!nextItems.has(item.itemId)) changes.push(`Removed ${item.name}`);
  }
  if (saved.days.length !== current.days.length) changes.push(`The pattern is now ${current.days.length} days`);
  return changes;
}

export function updateOffer(saved: FlowAttachment, current: FlowAttachment) {
  if (!attachmentChanged(saved, current)) return null;
  const changes = attachmentChanges(saved, current);
  return { changes: changes.length ? changes : ['The flow was updated.'] };
}

export function attachmentPlan(attachment: FlowAttachment): BodyPlan {
  if (attachment.kind === 'map-flow' && attachment.days.length) {
    return {
      days: attachment.days.map(day => ({
        flows: day.flows.map(flow => ({
          id: flow.id,
          kind: flow.kind,
          ...(flow.version != null ? { version: flow.version } : {}),
          ...(flow.items?.length ? { items: flow.items.map(item => ({ exerciseId: item.exerciseId, sets: item.sets })) } : {}),
        })),
      })),
    };
  }
  return {
    days: [
      {
        flows: [
          {
            id: attachment.sourceId,
            kind: 'flow' as const,
            items: attachment.exercises.map(item => ({ exerciseId: item.exerciseId, sets: item.sets })),
          },
        ],
      },
    ],
  };
}

export function attachmentMap(attachment: FlowAttachment): CopySource | null {
  if (attachment.kind !== 'map-flow') return null;
  return {
    id: attachment.sourceId,
    name: attachment.title,
    styleId: attachment.styleId,
    purposeIds: [...attachment.purposeIds],
    repeat: attachment.repeat as MapFlowRepeat,
    days: attachment.days.map(day => ({
      name: day.name,
      effort: day.effort as MapFlowEffort,
      flows: day.flows.map(flow => ({
        kind: flow.kind,
        id: flow.id,
        ...(flow.version != null ? { version: flow.version } : {}),
        ...(flow.items?.length
          ? { items: flow.items.map(item => ({ exerciseId: item.exerciseId, sets: item.sets })) }
          : {}),
      })),
      items: day.items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        checkpoint: item.checkpoint,
        timesPerDay: item.timesPerDay,
      })),
    })),
  };
}

/** The shape Follow already understands. Private fields are not on the snapshot. */
export function attachmentToTheirFlow(attachment: FlowAttachment) {
  const map = attachmentMap(attachment);
  const sourceId =
    attachment.kind === 'daily-flow'
      ? (attachment.days.flatMap(day => day.flows.map(flow => flow.id))[0] ?? attachment.sourceId)
      : attachment.sourceId;
  return {
    title: attachment.title,
    fromName: attachment.owner.name,
    kind: attachment.kind === 'map-flow' ? ('map' as const) : attachment.kind === 'daily-flow' ? ('daily' as const) : ('custom' as const),
    source: { kind: 'qram-flow' as const, id: sourceId, version: null },
    items: attachment.exercises,
    ...(map ? { map } : {}),
  };
}

/** Optional words on a post, or a required remark. Same length rule as other posts. */
export function moderateShareText(value: string, optional: boolean) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!optional && !text) throw new Error('Write a remark.');
  if (text.length > communityLimits.description) throw new Error(`Keep it to ${communityLimits.description} characters.`);
  return text;
}

export function canWriteRemark(userId: string) {
  return userId.trim().length > 0;
}

/** The author of the shared flow can delete any remark. A member can delete their own. */
export function canDeleteRemark(actorId: string, postOwnerId: string, remarkAuthorId: string) {
  return actorId === postOwnerId || actorId === remarkAuthorId;
}

export type ShareFeedEntry<A, B> =
  | { kind: 'activity'; at: string; activity: A }
  | { kind: 'attachment'; at: string; post: B };

/** Finished-run posts and attachment posts, newest first. */
export function mergeShareFeed<A extends { at: string }, B extends { at: string }>(
  activities: readonly A[],
  attachments: readonly B[],
): ShareFeedEntry<A, B>[] {
  return [
    ...activities.map(activity => ({ kind: 'activity' as const, at: activity.at, activity })),
    ...attachments.map(post => ({ kind: 'attachment' as const, at: post.at, post })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}
