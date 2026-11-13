/**
 * Posts that carry one flow. Demo mode keeps them in memory. Postgres uses flow_posts.
 * The server checks that the member finished the flow. The snapshot is public.
 */
import { z } from 'zod';
import { applyCustomflow, customflowKey, hasChanges, type Customflows } from '../../shared/customflows';
import { dailyFlowItemById } from '../../shared/daily-flow-item-data';
import { gymEstimatedMinutes, gymFlowById, type GymFlowItem } from '../../shared/gym-flows';
import type { MapFlow, MapFlowDay } from '../../shared/map-flow';
import { mapFlowStyleById } from '../../shared/map-flow-styles';
import { mapFlowTemplateById } from '../../shared/map-flow-templates';
import { reportReasons } from '../../shared/reports';
import {
  attachmentSchema,
  attachmentToTheirFlow,
  buildAttachment,
  canDeleteRemark,
  canWriteRemark,
  followedForLabel,
  moderateShareText,
  updateOffer,
  type AttachmentKind,
  type FlowAttachment,
} from '../../shared/share-attachment';
import {
  classifyShares,
  patternProgress,
  shareStanding,
  type FinishedMark,
  type ShareKind,
  type ShareSubject,
} from '../../shared/share-eligibility';
import { isRestDay, withShareDetails } from '../../shared/share-list';
import { demoModeEnabled } from './runtime-config';
import type { PublicUser } from './types';

export class ShareError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const text = z.string().max(600);
export const shareActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('post'), kind: z.enum(['custom-flow', 'daily-flow', 'map-flow']), sourceId: z.string().trim().min(1).max(160), text }).strict(),
  z.object({ action: z.literal('remark'), postId: z.string().uuid(), text }).strict(),
  z.object({ action: z.literal('delete-remark'), id: z.string().uuid() }).strict(),
  z
    .object({
      action: z.literal('follow'),
      postId: z.string().uuid(),
      today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      where: z.unknown().optional(),
      sessions: z.union([z.literal(1), z.literal(4), z.null()]).optional(),
      after: z.enum(['return', 'keep']).optional(),
      replaceSlot: z.number().int().min(1).max(5).optional(),
      confirmBase: z.boolean().optional(),
    })
    .strict(),
  z.object({ action: z.literal('accept-update'), postId: z.string().uuid() }).strict(),
  z
    .object({
      action: z.literal('report'),
      kind: z.enum(['post', 'remark']),
      itemId: z.string().min(1).max(80),
      reason: z.enum(reportReasons),
      note: z.string().max(200).default(''),
    })
    .strict(),
  z.object({ action: z.literal('block'), userId: z.string().min(1).max(128) }).strict(),
]);

export type ShareRemark = {
  id: string;
  postId: string;
  userId: string;
  name: string;
  text: string;
  at: string;
};

export type SharePost = {
  id: string;
  at: string;
  text: string;
  attachment: FlowAttachment;
  following: number;
  finished: number;
  remarkCount: number;
  viewer: { own: boolean; following: boolean; followsAuthor: boolean; update: string[] | null };
};

type StoredPost = { id: string; userId: string; text: string; attachment: FlowAttachment; at: string };
type StoredCopy = { userId: string; postId: string; snapshot: FlowAttachment; at: string };
type StoredReport = { id: string; reporterId: string; kind: 'post' | 'remark'; itemId: string; reason: string; note: string; at: string };
type StoredBlock = { userId: string; blockedId: string };

type Memory = {
  posts: StoredPost[];
  remarks: ShareRemark[];
  copies: StoredCopy[];
  reports: StoredReport[];
  blocks: StoredBlock[];
};

declare global {
  var qramFlowPosts: Memory | undefined;
}

function demo(flag?: boolean) {
  return flag ?? demoModeEnabled(process.env);
}

function memory(): Memory {
  return (globalThis.qramFlowPosts ??= { posts: [], remarks: [], copies: [], reports: [], blocks: [] });
}

function asJson(value: unknown) {
  if (typeof value === 'string') return JSON.parse(value) as unknown;
  return value;
}

function asInstant(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function dayOf(at: string) {
  return at.slice(0, 10);
}

function attachmentKind(kind: ShareKind): AttachmentKind {
  return kind === 'flow' ? 'custom-flow' : kind;
}

function minutesOf(items: { exerciseId: string; sets: number; restSeconds?: number }[]) {
  if (!items.length) return 0;
  return gymEstimatedMinutes({ items });
}

function exercisesFrom(items: GymFlowItem[]) {
  return items.map(item => ({
    exerciseId: item.exerciseId,
    sets: item.sets,
    repsMin: item.repsMin,
    repsMax: item.repsMax,
  }));
}

function flowExercises(id: string, custom: Customflows) {
  const gym = gymFlowById(id);
  if (!gym) return [];
  const own = custom[customflowKey('qram-flow', id)];
  return exercisesFrom(applyCustomflow(gym.items, own, item => item.exerciseId));
}

function publicItem(item: MapFlowDay['items'][number]) {
  const known = dailyFlowItemById(item.itemId);
  return {
    itemId: item.itemId,
    name: known?.name ?? item.name,
    amount: known?.amount ?? `${item.timesPerDay} a day`,
    checkpoint: item.checkpoint,
    timesPerDay: item.timesPerDay,
  };
}

function dayPublic(day: MapFlowDay, custom: Customflows) {
  const flows = day.flows.map(ref => {
    const items = flowExercises(ref.id, custom);
    return {
      kind: ref.kind,
      id: ref.id,
      ...(ref.version != null ? { version: ref.version } : {}),
      ...(items.length ? { items } : {}),
      exercises: items,
    };
  });
  return {
    name: day.name,
    effort: day.effort,
    exercises: flows.flatMap(flow => flow.exercises),
    items: day.items.map(publicItem),
    flows: flows.map(flow => ({
      kind: flow.kind,
      id: flow.id,
      ...(flow.version != null ? { version: flow.version } : {}),
      ...(flow.items ? { items: flow.items } : {}),
    })),
  };
}

function levelOf(flow: MapFlow) {
  if (flow.sourceKind === 'template' && flow.sourceId) return mapFlowTemplateById(flow.sourceId)?.level ?? 'Beginner';
  const first = flow.days.flatMap(day => day.flows)[0];
  return (first && gymFlowById(first.id)?.level) || 'Beginner';
}

function snapshotFor(
  user: PublicUser,
  subject: ShareSubject,
  maps: MapFlow[],
  custom: Customflows,
  done: number,
): FlowAttachment {
  const owner = { id: user.id, name: user.name };
  const followedFor = followedForLabel(subject.kind, Math.max(done, 1));
  if (subject.kind === 'map-flow') {
    const flow = maps.find(item => item.id === subject.id);
    if (!flow) throw new ShareError('That Map flow is gone.', 404);
    const days = flow.days.map(day => dayPublic(day, custom));
    const items = days.flatMap(day => day.items).filter((item, index, list) => list.findIndex(row => row.itemId === item.itemId) === index);
    return buildAttachment({
      kind: 'map-flow',
      sourceId: flow.id,
      title: flow.name,
      styleId: flow.styleId,
      styleName: mapFlowStyleById(flow.styleId)?.name ?? 'Your mix',
      level: levelOf(flow),
      minutes: Math.max(0, ...days.map(day => minutesOf(day.exercises))),
      owner,
      followedFor,
      exercises: days.flatMap(day => day.exercises),
      items,
      days,
      purposeIds: flow.purposeIds,
      repeat: flow.repeat,
      version: 1,
    });
  }
  if (subject.kind === 'daily-flow') {
    const [mapId, indexText] = subject.id.split(':');
    const flow = maps.find(item => item.id === mapId);
    const day = flow?.days[Number(indexText)];
    if (!flow || !day) throw new ShareError('That day is gone.', 404);
    const built = dayPublic(day, custom);
    return buildAttachment({
      kind: 'daily-flow',
      sourceId: subject.id,
      title: day.name,
      styleId: flow.styleId,
      styleName: mapFlowStyleById(flow.styleId)?.name ?? 'Your mix',
      level: levelOf(flow),
      minutes: minutesOf(built.exercises),
      owner,
      followedFor,
      exercises: built.exercises,
      items: built.items,
      days: [built],
      purposeIds: flow.purposeIds,
      repeat: flow.repeat,
      version: 1,
    });
  }
  const gym = gymFlowById(subject.id);
  const exercises = flowExercises(subject.id, custom);
  if (!gym || !exercises.length) throw new ShareError('That flow is not ready to share.', 404);
  const day = {
    name: gym.title,
    effort: 'full' as const,
    exercises,
    items: [],
    flows: [{ kind: 'flow' as const, id: gym.id, items: exercises }],
  };
  return buildAttachment({
    kind: 'custom-flow',
    sourceId: gym.id,
    title: gym.title,
    styleId: 'member',
    styleName: 'Your flow',
    level: gym.level,
    minutes: minutesOf(exercises),
    owner,
    followedFor,
    exercises,
    items: [],
    days: [day],
    purposeIds: [],
    repeat: 'in-turn',
    version: 1,
  });
}

async function context(user: PublicUser, useDemo: boolean) {
  const { listMapFlows } = await import('./map-flow-store');
  const { readCustomflows } = await import('./customflow-store');
  const { routineCompletions } = await import('./training-store');
  const [listed, custom, completions] = await Promise.all([
    listMapFlows(user, useDemo),
    readCustomflows(user),
    routineCompletions(user.id, useDemo, '2000-01-01', '2099-12-31'),
  ]);
  const finished: FinishedMark[] = completions.map(item => ({ id: item.itemId, date: item.date }));
  const subjects: ShareSubject[] = [];
  const seen = new Set<string>();
  const addFlow = (id: string, customised: boolean) => {
    const key = `${customised ? 'custom' : 'flow'}:${id}`;
    if (seen.has(key)) return;
    seen.add(key);
    const gym = gymFlowById(id);
    if (!gym) return;
    subjects.push({ kind: customised ? 'custom-flow' : 'flow', id, title: gym.title });
  };
  for (const flow of Object.values(custom)) {
    if (flow.source.kind === 'qram-flow' && hasChanges(flow.changes)) addFlow(flow.source.id, true);
  }
  for (const flow of listed.flows) {
    subjects.push({
      kind: 'map-flow',
      id: flow.id,
      title: flow.name,
      pattern: flow.days.map(day => ({ flowIds: day.flows.map(item => item.id) })),
    });
    flow.days.forEach((day, index) => {
      // A rest day has nothing to share, so it is never offered.
      if (isRestDay(day)) return;
      subjects.push({
        kind: 'daily-flow',
        id: `${flow.id}:${index}`,
        title: day.name,
        from: flow.name,
        dayFlowIds: day.flows.map(item => item.id),
      });
      for (const ref of day.flows) addFlow(ref.id, false);
    });
  }
  for (const mark of finished) addFlow(mark.id, false);
  const customIds = new Set(subjects.filter(item => item.kind === 'custom-flow').map(item => item.id));
  return {
    maps: listed.flows,
    custom,
    finished,
    subjects: subjects.filter(item => item.kind !== 'flow' || !customIds.has(item.id)),
  };
}

function findSubject(subjects: ShareSubject[], kind: AttachmentKind, sourceId: string) {
  if (kind === 'custom-flow') {
    return subjects.find(item => item.kind === 'custom-flow' && item.id === sourceId) ?? subjects.find(item => item.kind === 'flow' && item.id === sourceId);
  }
  return subjects.find(item => item.kind === kind && item.id === sourceId);
}

function didFinish(attachment: FlowAttachment, marks: FinishedMark[], since: string) {
  const later = marks.filter(mark => mark.date >= since);
  if (attachment.kind === 'map-flow') {
    return patternProgress(attachment.days.map(day => ({ flowIds: day.flows.map(flow => flow.id) })), later).passes >= 1;
  }
  if (attachment.kind === 'daily-flow') {
    const ids = [...new Set(attachment.days.flatMap(day => day.flows.map(flow => flow.id)))];
    return shareStanding({ kind: 'daily-flow', id: attachment.sourceId, title: attachment.title, dayFlowIds: ids }, later).earned;
  }
  return later.some(mark => mark.id === attachment.sourceId);
}

async function liveAttachment(owner: PublicUser, attachment: FlowAttachment, useDemo: boolean) {
  try {
    const loaded = await context(owner, useDemo);
    const subject = findSubject(loaded.subjects, attachment.kind, attachment.sourceId);
    if (!subject) return attachment;
    const standing = shareStanding(subject, loaded.finished);
    return snapshotFor(owner, subject, loaded.maps, loaded.custom, standing.done);
  } catch {
    return attachment;
  }
}

function ownerUser(attachment: FlowAttachment): PublicUser {
  return {
    id: attachment.owner.id,
    handle: attachment.owner.id,
    name: attachment.owner.name,
    role: 'member',
    avatarUrl: null,
    bio: null,
    instagramUrl: null,
  };
}

async function blocksOf(user: PublicUser, useDemo: boolean) {
  if (useDemo) return new Set(memory().blocks.filter(row => row.userId === user.id).map(row => row.blockedId));
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT blocked_id FROM member_blocks WHERE user_id=${user.id}`;
  return new Set(rows.map(row => String(row.blocked_id)));
}

async function readPosts(useDemo: boolean): Promise<StoredPost[]> {
  if (useDemo) return [...memory().posts];
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT id, user_id, body, snapshot, created_at FROM flow_posts ORDER BY created_at DESC LIMIT 80`;
  return rows.flatMap(row => {
    const parsed = attachmentSchema.safeParse(asJson(row.snapshot));
    if (!parsed.success) return [];
    return [{ id: String(row.id), userId: String(row.user_id), text: String(row.body), attachment: parsed.data, at: asInstant(row.created_at) }];
  });
}

async function readRemarks(postId: string, useDemo: boolean): Promise<ShareRemark[]> {
  if (useDemo) return memory().remarks.filter(row => row.postId === postId);
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT id, post_id, user_id, author_name, body, created_at FROM flow_post_remarks WHERE post_id=${postId} ORDER BY created_at, id`;
  return rows.map(row => ({
    id: String(row.id),
    postId: String(row.post_id),
    userId: String(row.user_id),
    name: String(row.author_name),
    text: String(row.body),
    at: asInstant(row.created_at),
  }));
}

async function readCopies(postIds: string[], useDemo: boolean): Promise<StoredCopy[]> {
  if (!postIds.length) return [];
  if (useDemo) return memory().copies.filter(row => postIds.includes(row.postId));
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT user_id, post_id, snapshot, created_at FROM flow_post_copies WHERE post_id=ANY(${postIds}::uuid[])`;
  return rows.flatMap(row => {
    const parsed = attachmentSchema.safeParse(asJson(row.snapshot));
    if (!parsed.success) return [];
    return [{ userId: String(row.user_id), postId: String(row.post_id), snapshot: parsed.data, at: asInstant(row.created_at) }];
  });
}

async function remarkCounts(postIds: string[], useDemo: boolean) {
  const counts = new Map<string, number>();
  if (!postIds.length) return counts;
  if (useDemo) {
    for (const remark of memory().remarks) {
      if (!postIds.includes(remark.postId)) continue;
      counts.set(remark.postId, (counts.get(remark.postId) ?? 0) + 1);
    }
    return counts;
  }
  const sql = (await import('./database')).database();
  const rows = await sql`SELECT post_id, count(*)::int AS count FROM flow_post_remarks WHERE post_id=ANY(${postIds}::uuid[]) GROUP BY post_id`;
  for (const row of rows) counts.set(String(row.post_id), Number(row.count));
  return counts;
}

async function finishedCount(copies: StoredCopy[], useDemo: boolean) {
  let count = 0;
  const { routineCompletions } = await import('./training-store');
  for (const copy of copies) {
    const marks = (await routineCompletions(copy.userId, useDemo, dayOf(copy.at), '2099-12-31')).map(item => ({
      id: item.itemId,
      date: item.date,
    }));
    if (didFinish(copy.snapshot, marks, dayOf(copy.at))) count += 1;
  }
  return count;
}

async function present(
  user: PublicUser,
  post: StoredPost,
  copies: StoredCopy[],
  remarks: number,
  useDemo: boolean,
  authors?: Set<string>,
): Promise<SharePost> {
  const mine = copies.filter(copy => copy.postId === post.id);
  const ownCopy = mine.find(copy => copy.userId === user.id);
  let update: string[] | null = null;
  if (ownCopy && ownCopy.userId !== post.userId) {
    const live = await liveAttachment(ownerUser(post.attachment), post.attachment, useDemo);
    update = updateOffer(ownCopy.snapshot, live)?.changes ?? null;
  }
  return {
    id: post.id,
    at: post.at,
    text: post.text,
    attachment: post.attachment,
    following: mine.length,
    finished: await finishedCount(mine, useDemo),
    remarkCount: remarks,
    viewer: {
      own: post.userId === user.id,
      following: Boolean(ownCopy),
      followsAuthor: authors?.has(post.userId) ?? false,
      update,
    },
  };
}

async function savePost(post: StoredPost, useDemo: boolean) {
  if (useDemo) {
    memory().posts.unshift(post);
    return;
  }
  const sql = (await import('./database')).database();
  await sql`INSERT INTO flow_posts (id, user_id, kind, source_id, body, snapshot, created_at) VALUES (${post.id}, ${post.userId}, ${post.attachment.kind}, ${post.attachment.sourceId}, ${post.text}, ${JSON.stringify(post.attachment)}::jsonb, ${post.at})`;
}

async function saveRemark(remark: ShareRemark, useDemo: boolean) {
  if (useDemo) {
    memory().remarks.push(remark);
    return;
  }
  const sql = (await import('./database')).database();
  await sql`INSERT INTO flow_post_remarks (id, post_id, user_id, author_name, body, created_at) VALUES (${remark.id}, ${remark.postId}, ${remark.userId}, ${remark.name}, ${remark.text}, ${remark.at})`;
}

async function saveCopy(copy: StoredCopy, useDemo: boolean) {
  if (useDemo) {
    const list = memory().copies;
    const index = list.findIndex(item => item.userId === copy.userId && item.postId === copy.postId);
    if (index >= 0) list[index] = copy;
    else list.push(copy);
    return;
  }
  const sql = (await import('./database')).database();
  await sql`INSERT INTO flow_post_copies (user_id, post_id, snapshot, created_at) VALUES (${copy.userId}, ${copy.postId}, ${JSON.stringify(copy.snapshot)}::jsonb, ${copy.at}) ON CONFLICT (user_id, post_id) DO UPDATE SET snapshot=EXCLUDED.snapshot`;
}

export async function shareYours(user: PublicUser, useDemo?: boolean) {
  const active = demo(useDemo);
  const loaded = await context(user, active);
  const grouped = classifyShares(loaded.subjects, loaded.finished);
  const subjectOf = (row: { kind: ShareSubject['kind']; id: string }) =>
    loaded.subjects.find(item => item.kind === row.kind && item.id === row.id)!;
  // Two rows that would read the same carry their Map flow's name.
  const details = new Map(
    withShareDetails([...grouped.earned, ...grouped.close].map(row => ({ ...row, from: subjectOf(row).from }))).map(row => [
      `${row.kind}:${row.id}`,
      row.detail,
    ]),
  );
  const card = async (row: (typeof grouped.earned)[number]) => ({
    kind: attachmentKind(row.kind),
    id: row.id,
    title: row.title,
    detail: details.get(`${row.kind}:${row.id}`) ?? null,
    reason: row.reason,
    line: row.line,
    attachment: snapshotFor(user, subjectOf(row), loaded.maps, loaded.custom, row.done),
  });
  return {
    earned: await Promise.all(grouped.earned.map(card)),
    close: grouped.close.map(row => ({
      kind: attachmentKind(row.kind),
      id: row.id,
      title: row.title,
      detail: details.get(`${row.kind}:${row.id}`) ?? null,
      reason: row.reason,
      line: row.line,
      done: row.done,
      need: row.need,
    })),
  };
}

/** `authors` is who the member follows, so the Home feed can mark posts from everyone else. */
export async function shareFeed(user: PublicUser, useDemo?: boolean, authors?: Set<string>) {
  const active = demo(useDemo);
  const blocked = await blocksOf(user, active);
  const posts = (await readPosts(active)).filter(post => !blocked.has(post.userId) && !blocked.has(post.attachment.owner.id));
  const ids = posts.map(post => post.id);
  const [copies, counts] = await Promise.all([readCopies(ids, active), remarkCounts(ids, active)]);
  const shown = [];
  for (const post of posts) shown.push(await present(user, post, copies, counts.get(post.id) ?? 0, active, authors));
  return { posts: shown };
}

export async function sharePost(user: PublicUser, id: string, useDemo?: boolean) {
  const active = demo(useDemo);
  const blocked = await blocksOf(user, active);
  const post = (await readPosts(active)).find(item => item.id === id);
  if (!post || blocked.has(post.userId)) throw new ShareError('That post is gone.', 404);
  const copies = await readCopies([id], active);
  const remarks = (await readRemarks(id, active)).filter(remark => !blocked.has(remark.userId));
  return { post: await present(user, post, copies, remarks.length, active), remarks };
}

async function requirePost(id: string, useDemo: boolean) {
  const post = (await readPosts(useDemo)).find(item => item.id === id);
  if (!post) throw new ShareError('That post is gone.', 404);
  return post;
}

export async function changeShare(user: PublicUser, body: unknown, useDemo?: boolean) {
  const parsed = shareActionSchema.safeParse(body);
  if (!parsed.success) throw new ShareError(parsed.error.issues[0]?.message ?? 'Check that and try again.');
  const active = demo(useDemo);
  const action = parsed.data;
  if (action.action === 'post') {
    let words = '';
    try {
      words = moderateShareText(action.text, true);
    } catch (error) {
      throw new ShareError(error instanceof Error ? error.message : 'Check the words and try again.');
    }
    const loaded = await context(user, active);
    const subject = findSubject(loaded.subjects, action.kind, action.sourceId);
    if (!subject) throw new ShareError('Finish it before you post it.');
    const standing = shareStanding(subject, loaded.finished);
    if (!standing.earned) throw new ShareError('Finish it before you post it.');
    const attachment = snapshotFor(user, subject, loaded.maps, loaded.custom, standing.done);
    const post: StoredPost = { id: crypto.randomUUID(), userId: user.id, text: words, attachment, at: new Date().toISOString() };
    await savePost(post, active);
    return sharePost(user, post.id, active);
  }
  if (action.action === 'remark') {
    if (!canWriteRemark(user.id)) throw new ShareError('Sign in to write a remark.', 401);
    let words = '';
    try {
      words = moderateShareText(action.text, false);
    } catch (error) {
      throw new ShareError(error instanceof Error ? error.message : 'Check the words and try again.');
    }
    const post = await requirePost(action.postId, active);
    const remark: ShareRemark = {
      id: crypto.randomUUID(),
      postId: post.id,
      userId: user.id,
      name: user.name,
      text: words,
      at: new Date().toISOString(),
    };
    await saveRemark(remark, active);
    return sharePost(user, post.id, active);
  }
  if (action.action === 'delete-remark') {
    const remark = active
      ? memory().remarks.find(item => item.id === action.id)
      : (await (async () => {
          const sql = (await import('./database')).database();
          const rows = await sql`SELECT id, post_id, user_id FROM flow_post_remarks WHERE id=${action.id}`;
          return rows[0] ? { id: String(rows[0].id), postId: String(rows[0].post_id), userId: String(rows[0].user_id) } : undefined;
        })());
    if (!remark) throw new ShareError('That remark is gone.', 404);
    const post = await requirePost(remark.postId, active);
    if (!canDeleteRemark(user.id, post.userId, remark.userId)) throw new ShareError('You can delete your own remark, or any remark on a flow you shared.', 403);
    if (active) memory().remarks = memory().remarks.filter(item => item.id !== remark.id);
    else {
      const sql = (await import('./database')).database();
      await sql`DELETE FROM flow_post_remarks WHERE id=${remark.id}`;
    }
    return sharePost(user, post.id, active);
  }
  if (action.action === 'follow') {
    const post = await requirePost(action.postId, active);
    if (post.userId === user.id) throw new ShareError('This is already your flow.');
    const { startFlowFollow } = await import('./follow-store');
    const followed = await startFlowFollow(
      user,
      {
        action: 'start',
        theirFlow: attachmentToTheirFlow(post.attachment),
        today: action.today,
        ...(action.where ? { where: action.where } : {}),
        ...(action.sessions !== undefined ? { sessions: action.sessions } : {}),
        ...(action.after ? { after: action.after } : {}),
        ...(action.replaceSlot != null ? { replaceSlot: action.replaceSlot } : {}),
        ...(action.confirmBase != null ? { confirmBase: action.confirmBase } : {}),
      },
      active,
    );
    await saveCopy({ userId: user.id, postId: post.id, snapshot: post.attachment, at: new Date().toISOString() }, active);
    const detail = await sharePost(user, post.id, active);
    return { ...detail, placedSlot: followed.placedSlot ?? null, follows: followed.follows };
  }
  if (action.action === 'accept-update') {
    const post = await requirePost(action.postId, active);
    const copies = await readCopies([post.id], active);
    const copy = copies.find(item => item.userId === user.id);
    if (!copy) throw new ShareError('Follow it before taking an update.');
    const live = await liveAttachment(ownerUser(post.attachment), post.attachment, active);
    const offer = updateOffer(copy.snapshot, live);
    if (!offer) throw new ShareError('Nothing has changed.');
    await saveCopy({ ...copy, snapshot: { ...live, version: copy.snapshot.version + 1 } }, active);
    return sharePost(user, post.id, active);
  }
  if (action.action === 'report') {
    const note = action.note.replace(/\s+/g, ' ').trim();
    if (note.length > 200) throw new ShareError('Keep the note to 200 characters.');
    if (action.kind === 'post') await requirePost(action.itemId, active);
    else {
      const remark = active
        ? memory().remarks.find(item => item.id === action.itemId)
        : await (async () => {
            const sql = (await import('./database')).database();
            const rows = await sql`SELECT id FROM flow_post_remarks WHERE id=${action.itemId}`;
            return rows[0];
          })();
      if (!remark) throw new ShareError('That remark is gone.', 404);
    }
    if (active) {
      const existing = memory().reports.find(item => item.reporterId === user.id && item.kind === action.kind && item.itemId === action.itemId);
      if (existing) return { report: existing };
      const report: StoredReport = {
        id: crypto.randomUUID(),
        reporterId: user.id,
        kind: action.kind,
        itemId: action.itemId,
        reason: action.reason,
        note,
        at: new Date().toISOString(),
      };
      memory().reports.push(report);
      return { report };
    }
    const sql = (await import('./database')).database();
    const rows = await sql`INSERT INTO flow_post_reports (id, reporter_id, kind, item_id, reason, note) VALUES (${crypto.randomUUID()}, ${user.id}, ${action.kind}, ${action.itemId}, ${action.reason}, ${note}) ON CONFLICT (reporter_id, kind, item_id) DO UPDATE SET id=flow_post_reports.id RETURNING id, reporter_id, kind, item_id, reason, note, created_at`;
    const row = rows[0];
    return {
      report: {
        id: String(row.id),
        reporterId: String(row.reporter_id),
        kind: row.kind as 'post' | 'remark',
        itemId: String(row.item_id),
        reason: String(row.reason),
        note: String(row.note),
        at: asInstant(row.created_at),
      },
    };
  }
  if (action.userId === user.id) throw new ShareError('You cannot block yourself.');
  if (active) {
    if (!memory().blocks.some(row => row.userId === user.id && row.blockedId === action.userId)) {
      memory().blocks.push({ userId: user.id, blockedId: action.userId });
    }
  } else {
    const sql = (await import('./database')).database();
    await sql`INSERT INTO member_blocks (user_id, blocked_id) VALUES (${user.id}, ${action.userId}) ON CONFLICT DO NOTHING`;
  }
  return shareFeed(user, active);
}
