import 'server-only';
import { z } from 'zod';
import {
  communityChanges,
  communityLimits,
  describeChange,
  mergeFollowing,
  rankForYou,
  type CommunityAction,
  type CommunityCopyStatus,
  type CommunityFeed,
  type CommunityFeedItem,
  type CommunityFlow,
  type CommunityTab,
  type CommunityVersion,
} from '../../../shared/community-flows';
import { resolvePersonalFlow, type FlowCardReference, type PersonalFlow } from '../../../shared/personal-flows';
import { isDemoMode } from '../store';
import type { PublicUser } from '../types';
import { demoInboxPut } from '../notification-store';
import { cardLibrary, mutatePersonalFlows } from './personal-flows';
import { getProfile } from './profile';
import { sqlClient } from './state';

export class CommunityError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const id = z.string().regex(/^community-[a-zA-Z0-9-]{8,80}$/);
const personalId = z.string().regex(/^personal-[a-zA-Z0-9-]{8,80}$/);
export const communityActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('publish'),
      personalFlowId: personalId,
      description: z.string().max(communityLimits.description * 2),
    })
    .strict(),
  z.object({ action: z.literal('unpublish'), id }).strict(),
  z.object({ action: z.literal('upvote'), id, enabled: z.boolean() }).strict(),
  z.object({ action: z.literal('repost'), id, enabled: z.boolean() }).strict(),
  z
    .object({ action: z.literal('follow'), authorId: z.string().min(1).max(128), enabled: z.boolean() })
    .strict(),
  z.object({ action: z.literal('save'), id, personalFlowId: personalId }).strict(),
  z.object({ action: z.literal('take-update'), personalFlowId: personalId }).strict(),
]);

type Stored = {
  id: string;
  authorId: string;
  personalFlowId: string;
  title: string;
  description: string;
  cards: FlowCardReference[];
  version: number;
  publishedAt: string;
  editedAt: string | null;
};
type Author = CommunityFlow['author'];

type DemoCommunity = {
  flows: Map<string, Stored>;
  versions: Map<string, CommunityVersion[]>;
  votes: Map<string, Set<string>>;
  reposts: Map<string, Map<string, string>>;
  follows: Map<string, Set<string>>;
};
declare global {
  var qramDemoCommunity: DemoCommunity | undefined;
}
function demo() {
  return (globalThis.qramDemoCommunity ??= {
    flows: new Map(),
    versions: new Map(),
    votes: new Map(),
    reposts: new Map(),
    follows: new Map(),
  });
}

function cleanDescription(value: string) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length > communityLimits.description)
    throw new CommunityError(`Keep the description to ${communityLimits.description} characters.`);
  return text;
}

async function authors(ids: string[]): Promise<Map<string, Author>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  if (isDemoMode())
    return new Map(
      (globalThis.rugramDemoStore?.users ?? [])
        .filter(user => unique.includes(user.id) && !user.disabled)
        .map(user => [user.id, { id: user.id, name: user.name, handle: user.handle }]),
    );
  const rows =
    await sqlClient()`SELECT id,name,handle FROM users WHERE id=ANY(${unique}::text[]) AND NOT is_disabled`;
  return new Map(
    rows.map(row => [
      String(row.id),
      { id: String(row.id), name: String(row.name), handle: String(row.handle) },
    ]),
  );
}

/** Every card must still exist in the catalogue under the same title. */
async function verifiedCards(personal: PersonalFlow) {
  const { missing } = resolvePersonalFlow(personal, await cardLibrary());
  if (missing.length)
    throw new CommunityError('Some cards are no longer available. Remove them before publishing.');
  if (personal.cards.length < communityLimits.minCards)
    throw new CommunityError(`Add at least ${communityLimits.minCards} cards before publishing.`);
  if (personal.cards.length > communityLimits.maxCards)
    throw new CommunityError(`Published flows can have up to ${communityLimits.maxCards} cards.`);
  return personal.cards.map(({ sourceFlowId, cardId, title }) => ({ sourceFlowId, cardId, title }));
}

function newId() {
  return `community-${crypto.randomUUID()}`;
}

async function publish(user: PublicUser, personalFlowId: string, rawDescription: string) {
  const profile = await getProfile(user);
  const personal = profile.personalFlows?.find(flow => flow.id === personalFlowId);
  if (!personal) throw new CommunityError('Flow not found.', 404);
  const cards = await verifiedCards(personal);
  const next = { title: personal.name, description: cleanDescription(rawDescription), cards };
  const now = new Date().toISOString();
  if (isDemoMode()) {
    const store = demo();
    const existing = [...store.flows.values()].find(
      flow => flow.authorId === user.id && flow.personalFlowId === personalFlowId,
    );
    if (!existing) {
      const flow: Stored = {
        id: newId(),
        authorId: user.id,
        personalFlowId,
        ...next,
        version: 1,
        publishedAt: now,
        editedAt: null,
      };
      store.flows.set(flow.id, flow);
      store.versions.set(flow.id, [{ version: 1, ...next, changes: [], createdAt: now }]);
      return flow.id;
    }
    const changes = communityChanges(existing, next);
    if (!changes.length) return existing.id;
    Object.assign(existing, next, { version: existing.version + 1, editedAt: now });
    store.versions.get(existing.id)!.push({ version: existing.version, ...next, changes, createdAt: now });
    for (const reposter of store.reposts.get(existing.id)?.keys() ?? [])
      if (reposter !== user.id)
        demoInboxPut(reposter, `community:${existing.id}:${existing.version}`, {
          type: 'community_flow_edited',
          title: `${next.title} was edited`,
          body: changes.map(describeChange).join(' · '),
          target: { kind: 'community', id: existing.id },
        });
    return existing.id;
  }
  const sql = sqlClient();
  const rows =
    await sql`SELECT id,title,description,cards,version FROM community_flows WHERE author_id=${user.id} AND personal_flow_id=${personalFlowId}`;
  if (!rows[0]) {
    const flowId = newId();
    await sql.transaction([
      sql`INSERT INTO community_flows(id,author_id,personal_flow_id,title,description,cards) VALUES(${flowId},${user.id},${personalFlowId},${next.title},${next.description},${JSON.stringify(cards)}::jsonb)`,
      sql`INSERT INTO community_flow_versions(flow_id,version,title,description,cards) VALUES(${flowId},1,${next.title},${next.description},${JSON.stringify(cards)}::jsonb)`,
    ]);
    return flowId;
  }
  const current = rows[0];
  const changes = communityChanges(
    {
      title: String(current.title),
      description: String(current.description),
      cards: current.cards as FlowCardReference[],
    },
    next,
  );
  if (!changes.length) return String(current.id);
  const version = Number(current.version) + 1;
  const summary = changes.map(describeChange).join(' · ');
  // The version guard makes a concurrent second publish fail instead of skipping a version.
  const [updated] = await sql.transaction([
    sql`UPDATE community_flows SET title=${next.title},description=${next.description},cards=${JSON.stringify(cards)}::jsonb,version=${version},edited_at=now() WHERE id=${current.id} AND version=${version - 1} RETURNING id`,
    sql`INSERT INTO community_flow_versions(flow_id,version,title,description,cards,changes) SELECT ${current.id},${version},${next.title},${next.description},${JSON.stringify(cards)}::jsonb,${JSON.stringify(changes)}::jsonb WHERE EXISTS(SELECT 1 FROM community_flows WHERE id=${current.id} AND version=${version})`,
    sql`SELECT mobile_inbox_put(user_id,${`community:${current.id}:${version}`},'community_flow_edited',${`${next.title} was edited`},${summary},'community',${current.id}) FROM community_flow_reposts WHERE flow_id=${current.id} AND user_id<>${user.id} AND EXISTS(SELECT 1 FROM community_flows WHERE id=${current.id} AND version=${version})`,
  ]);
  if (!updated.length) throw new CommunityError('This flow changed in another session. Try again.', 409);
  return String(current.id);
}

async function stored(ids?: string[]): Promise<Stored[]> {
  if (isDemoMode()) {
    const all = [...demo().flows.values()];
    return ids ? all.filter(flow => ids.includes(flow.id)) : all;
  }
  const sql = sqlClient();
  const rows = ids
    ? await sql`SELECT * FROM community_flows WHERE id=ANY(${ids}::text[])`
    : await sql`SELECT * FROM community_flows ORDER BY published_at DESC, id LIMIT 300`;
  return rows.map(row => ({
    id: String(row.id),
    authorId: String(row.author_id),
    personalFlowId: String(row.personal_flow_id),
    title: String(row.title),
    description: String(row.description),
    cards: row.cards as FlowCardReference[],
    version: Number(row.version),
    publishedAt: new Date(row.published_at as string).toISOString(),
    editedAt: row.edited_at ? new Date(row.edited_at as string).toISOString() : null,
  }));
}

async function ownFlows(user: PublicUser) {
  if (isDemoMode()) return [...demo().flows.values()].filter(flow => flow.authorId === user.id);
  const ids = await sqlClient()`SELECT id FROM community_flows WHERE author_id=${user.id}`;
  return stored(ids.map(row => String(row.id)));
}

async function following(user: PublicUser) {
  if (isDemoMode()) return new Set<string>(demo().follows.get(user.id) ?? []);
  const rows = await sqlClient()`SELECT author_id FROM community_follows WHERE user_id=${user.id}`;
  return new Set(rows.map(row => String(row.author_id)));
}

/** Counts and the viewer's own votes/reposts for a set of flows. */
async function signals(user: PublicUser, ids: string[]) {
  const result = new Map(
    ids.map(flowId => [flowId, { upvotes: 0, reposts: 0, upvoted: false, reposted: false }]),
  );
  if (!ids.length) return result;
  if (isDemoMode()) {
    const store = demo();
    for (const flowId of ids) {
      const votes = store.votes.get(flowId) ?? new Set();
      const reposts = store.reposts.get(flowId) ?? new Map();
      result.set(flowId, {
        upvotes: votes.size,
        reposts: reposts.size,
        upvoted: votes.has(user.id),
        reposted: reposts.has(user.id),
      });
    }
    return result;
  }
  const rows = await sqlClient()`SELECT f.id,
      (SELECT count(*) FROM community_flow_votes v WHERE v.flow_id=f.id) AS upvotes,
      (SELECT count(*) FROM community_flow_reposts r WHERE r.flow_id=f.id) AS reposts,
      EXISTS(SELECT 1 FROM community_flow_votes v WHERE v.flow_id=f.id AND v.user_id=${user.id}) AS upvoted,
      EXISTS(SELECT 1 FROM community_flow_reposts r WHERE r.flow_id=f.id AND r.user_id=${user.id}) AS reposted
    FROM community_flows f WHERE f.id=ANY(${ids}::text[])`;
  for (const row of rows)
    result.set(String(row.id), {
      upvotes: Number(row.upvotes),
      reposts: Number(row.reposts),
      upvoted: Boolean(row.upvoted),
      reposted: Boolean(row.reposted),
    });
  return result;
}

async function present(user: PublicUser, flows: Stored[]): Promise<Map<string, CommunityFlow>> {
  const [people, counts, follows] = await Promise.all([
    authors(flows.map(flow => flow.authorId)),
    signals(user, flows.map(flow => flow.id)),
    following(user),
  ]);
  const result = new Map<string, CommunityFlow>();
  for (const flow of flows) {
    const author = people.get(flow.authorId);
    // Disabled or deleted authors' flows are not shown.
    if (!author) continue;
    const signal = counts.get(flow.id)!;
    result.set(flow.id, {
      id: flow.id,
      author,
      personalFlowId: flow.personalFlowId,
      title: flow.title,
      description: flow.description,
      cards: flow.cards,
      version: flow.version,
      publishedAt: flow.publishedAt,
      editedAt: flow.editedAt,
      upvotes: signal.upvotes,
      reposts: signal.reposts,
      viewer: {
        upvoted: signal.upvoted,
        reposted: signal.reposted,
        followsAuthor: follows.has(flow.authorId),
        own: flow.authorId === user.id,
      },
    });
  }
  return result;
}

async function followingItems(user: PublicUser, follows: Set<string>) {
  const people = [...follows];
  if (!people.length) return { flows: [] as Stored[], reposts: [] as { userId: string; flowId: string; at: string }[] };
  if (isDemoMode()) {
    const store = demo();
    const reposts = [...store.reposts.entries()].flatMap(([flowId, users]) =>
      [...users.entries()]
        .filter(([userId]) => follows.has(userId))
        .map(([userId, at]) => ({ userId, flowId, at })),
    );
    const ids = new Set([
      ...[...store.flows.values()].filter(flow => follows.has(flow.authorId)).map(flow => flow.id),
      ...reposts.map(repost => repost.flowId),
    ]);
    return { flows: [...store.flows.values()].filter(flow => ids.has(flow.id)), reposts };
  }
  const sql = sqlClient();
  const reposts = (
    await sql`SELECT user_id,flow_id,created_at FROM community_flow_reposts WHERE user_id=ANY(${people}::text[]) ORDER BY created_at DESC LIMIT 200`
  ).map(row => ({
    userId: String(row.user_id),
    flowId: String(row.flow_id),
    at: new Date(row.created_at as string).toISOString(),
  }));
  const authored = (
    await sql`SELECT id FROM community_flows WHERE author_id=ANY(${people}::text[]) ORDER BY published_at DESC LIMIT 200`
  ).map(row => String(row.id));
  return { flows: await stored([...new Set([...authored, ...reposts.map(item => item.flowId)])]), reposts };
}

async function copyStatuses(personal: PersonalFlow[]): Promise<CommunityCopyStatus[]> {
  const copies = personal.filter(flow => flow.source);
  if (!copies.length) return [];
  const current = new Map(
    (await stored(copies.map(flow => flow.source!.publishedId))).map(flow => [flow.id, flow.version]),
  );
  return copies.map(flow => ({
    personalFlowId: flow.id,
    publishedId: flow.source!.publishedId,
    savedVersion: flow.source!.version,
    latestVersion: current.get(flow.source!.publishedId) ?? null,
  }));
}

export async function communityFeed(user: PublicUser, tab: CommunityTab): Promise<CommunityFeed> {
  const profile = await getProfile(user);
  const follows = await following(user);
  let items: CommunityFeedItem[];
  if (tab === 'for-you') {
    const flows = await present(user, await stored());
    items = rankForYou(
      [...flows.values()].map(flow => ({
        flow,
        repostedBy: null,
        at: flow.editedAt ?? flow.publishedAt,
      })),
      Date.now(),
      new Set(profile.flowIds),
    );
  } else {
    const source = await followingItems(user, follows);
    const flows = await present(user, source.flows);
    const names = await authors(source.reposts.map(item => item.userId));
    items = mergeFollowing([
      ...[...flows.values()]
        .filter(flow => follows.has(flow.author.id))
        .map(flow => ({ flow, repostedBy: null, at: flow.publishedAt })),
      ...source.reposts.flatMap(repost => {
        const flow = flows.get(repost.flowId);
        const by = names.get(repost.userId);
        return flow && by ? [{ flow, repostedBy: { id: by.id, name: by.name }, at: repost.at }] : [];
      }),
    ]);
  }
  return { tab, items: items.slice(0, communityLimits.feedSize), ...(await communityStatus(user)) };
}

/** The viewer's published flows and saved copies, without a feed. */
export async function communityStatus(user: PublicUser): Promise<Pick<CommunityFeed, 'mine' | 'copies'>> {
  const [mine, profile] = await Promise.all([ownFlows(user), getProfile(user)]);
  return {
    mine: mine.map(flow => ({
      personalFlowId: flow.personalFlowId,
      id: flow.id,
      version: flow.version,
      title: flow.title,
      description: flow.description,
      cards: flow.cards,
    })),
    copies: await copyStatuses(profile.personalFlows ?? []),
  };
}

export async function communityFlow(user: PublicUser, flowId: string) {
  const [flow] = await stored([flowId]);
  const shown = flow && (await present(user, [flow])).get(flow.id);
  if (!shown) throw new CommunityError('This flow is no longer available.', 404);
  let versions: CommunityVersion[];
  if (isDemoMode()) versions = [...(demo().versions.get(flowId) ?? [])];
  else
    versions = (
      await sqlClient()`SELECT version,title,description,cards,changes,created_at FROM community_flow_versions WHERE flow_id=${flowId} ORDER BY version`
    ).map(row => ({
      version: Number(row.version),
      title: String(row.title),
      description: String(row.description),
      cards: row.cards as FlowCardReference[],
      changes: row.changes as CommunityVersion['changes'],
      createdAt: new Date(row.created_at as string).toISOString(),
    }));
  return { flow: shown, versions: versions.reverse() };
}

async function requirePublished(flowId: string) {
  const [flow] = await stored([flowId]);
  if (!flow) throw new CommunityError('This flow is no longer available.', 404);
  return flow;
}

function copyOf(flow: Stored, personalFlowId: string, authorName: string, now: string): PersonalFlow {
  return {
    id: personalFlowId,
    name: flow.title,
    cards: flow.cards,
    createdAt: now,
    updatedAt: now,
    source: { publishedId: flow.id, version: flow.version, authorName },
  };
}

export async function communityAction(user: PublicUser, raw: CommunityAction) {
  const input = communityActionSchema.parse(raw);
  const demoMode = isDemoMode();
  const sql = demoMode ? null : sqlClient();
  if (input.action === 'publish') return { id: await publish(user, input.personalFlowId, input.description) };
  if (input.action === 'follow') {
    if (input.authorId === user.id) throw new CommunityError('You cannot follow yourself.');
    if (!(await authors([input.authorId])).size) throw new CommunityError('Person not found.', 404);
    if (demoMode) {
      const follows = demo().follows.get(user.id) ?? new Set<string>();
      if (input.enabled) follows.add(input.authorId);
      else follows.delete(input.authorId);
      demo().follows.set(user.id, follows);
    } else if (input.enabled)
      await sql!`INSERT INTO community_follows(user_id,author_id) VALUES(${user.id},${input.authorId}) ON CONFLICT DO NOTHING`;
    else await sql!`DELETE FROM community_follows WHERE user_id=${user.id} AND author_id=${input.authorId}`;
    return {};
  }
  if (input.action === 'take-update') {
    const now = new Date().toISOString();
    const profile = await getProfile(user);
    const copy = profile.personalFlows?.find(flow => flow.id === input.personalFlowId);
    if (!copy?.source) throw new CommunityError('This flow was not saved from the community.');
    const original = await requirePublished(copy.source.publishedId);
    await mutatePersonalFlows(user, previous =>
      previous.map(flow =>
        flow.id === copy.id && flow.source
          ? {
              ...flow,
              cards: original.cards,
              updatedAt: now,
              source: { ...flow.source, version: original.version },
            }
          : flow,
      ),
    );
    return {};
  }
  const flow = await requirePublished(input.id);
  if (input.action === 'unpublish') {
    if (flow.authorId !== user.id && user.role !== 'admin')
      throw new CommunityError('Only the author can remove this flow.', 403);
    if (demoMode) {
      const store = demo();
      for (const map of [store.flows, store.versions, store.votes, store.reposts]) map.delete(flow.id);
    } else await sql!`DELETE FROM community_flows WHERE id=${flow.id}`;
    return {};
  }
  if (input.action === 'save') {
    const now = new Date().toISOString();
    const author = (await authors([flow.authorId])).get(flow.authorId);
    await mutatePersonalFlows(user, previous => {
      if (previous.some(item => item.source?.publishedId === flow.id)) return previous;
      if (previous.some(item => item.id === input.personalFlowId))
        throw new CommunityError('That flow already exists.');
      if (previous.length >= 50) throw new CommunityError('Personal flow limit reached (50 flows).');
      return [...previous, copyOf(flow, input.personalFlowId, author?.name ?? 'A member', now)];
    });
    return {};
  }
  if (flow.authorId === user.id)
    throw new CommunityError(
      input.action === 'upvote' ? 'You cannot upvote your own flow.' : 'You cannot repost your own flow.',
    );
  if (input.action === 'upvote') {
    if (demoMode) {
      const votes = demo().votes.get(flow.id) ?? new Set<string>();
      if (input.enabled) votes.add(user.id);
      else votes.delete(user.id);
      demo().votes.set(flow.id, votes);
    } else if (input.enabled)
      await sql!`INSERT INTO community_flow_votes(user_id,flow_id) VALUES(${user.id},${flow.id}) ON CONFLICT DO NOTHING`;
    else await sql!`DELETE FROM community_flow_votes WHERE user_id=${user.id} AND flow_id=${flow.id}`;
    return {};
  }
  if (demoMode) {
    const reposts = demo().reposts.get(flow.id) ?? new Map<string, string>();
    if (input.enabled) {
      if (!reposts.has(user.id)) reposts.set(user.id, new Date().toISOString());
    } else reposts.delete(user.id);
    demo().reposts.set(flow.id, reposts);
  } else if (input.enabled)
    await sql!`INSERT INTO community_flow_reposts(user_id,flow_id) VALUES(${user.id},${flow.id}) ON CONFLICT DO NOTHING`;
  else await sql!`DELETE FROM community_flow_reposts WHERE user_id=${user.id} AND flow_id=${flow.id}`;
  return {};
}
