import "server-only";

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { creatorProfiles, initialPublications, memberAccount, routineComponents } from "./catalog";
import type { BootstrapPayload, CreatorPublication, PublicUser, Role, TimelineEntry } from "./types";

type PrivateUser = PublicUser & { passwordHash?: string; password?: string };
type UserState = { following: Set<string>; liked: Set<string>; timeline: TimelineEntry[] };

declare global {
  var rugramDemoStore: DemoStore | undefined;
}

class DemoStore {
  users: PrivateUser[] = [memberAccount, ...creatorProfiles].map((user) => ({ ...user, password: "12345" }));
  publications: Record<string, CreatorPublication[]> = structuredClone(initialPublications);
  state: Record<string, UserState> = {};
  sessions = new Map<string, { userId: string; expiresAt: number }>();

  userState(userId: string) {
    if (!this.state[userId]) this.state[userId] = { following: new Set(), liked: new Set(), timeline: [] };
    return this.state[userId];
  }
}

const demo = globalThis.rugramDemoStore ?? new DemoStore();
globalThis.rugramDemoStore = demo;

function demoMode() {
  return process.env.RUGRAM_DEMO_MODE === "true" || (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production");
}

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required when demo mode is disabled.");
  return neon(url);
}

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    handle: String(row.handle),
    name: String(row.name),
    role: row.role as Role,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    bio: row.bio ? String(row.bio) : null,
    instagramUrl: row.instagram_url ? String(row.instagram_url) : null,
  };
}

export async function authenticate(handle: string, password: string): Promise<PublicUser | null> {
  const normalized = handle.trim().toLowerCase().replace(/^@/, "");
  if (demoMode()) {
    const user = demo.users.find((candidate) => candidate.handle === normalized || candidate.id === normalized);
    return user?.password === password ? toPublicUser(user as unknown as Record<string, unknown>) : null;
  }
  const sql = database();
  const rows = await sql`SELECT id, handle, name, role, avatar_url, bio, instagram_url, password_hash FROM users WHERE lower(handle) = ${normalized} LIMIT 1`;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row || typeof row.password_hash !== "string" || !(await bcrypt.compare(password, row.password_hash))) return null;
  return toPublicUser(row);
}

export async function getUser(userId: string): Promise<PublicUser | null> {
  if (demoMode()) {
    const user = demo.users.find((candidate) => candidate.id === userId);
    return user ? toPublicUser(user as unknown as Record<string, unknown>) : null;
  }
  const sql = database();
  const rows = await sql`SELECT id, handle, name, role, avatar_url, bio, instagram_url FROM users WHERE id = ${userId} LIMIT 1`;
  return rows[0] ? toPublicUser(rows[0] as Record<string, unknown>) : null;
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  if (demoMode()) {
    demo.sessions.set(token, { userId, expiresAt: expiresAt.getTime() });
    return;
  }
  const sql = database();
  await sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt.toISOString()})`;
}

export async function getSessionUser(token: string): Promise<PublicUser | null> {
  if (demoMode()) {
    const session = demo.sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) return null;
    return getUser(session.userId);
  }
  const sql = database();
  const rows = await sql`SELECT u.id, u.handle, u.name, u.role, u.avatar_url, u.bio, u.instagram_url FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ${token} AND s.expires_at > now() LIMIT 1`;
  return rows[0] ? toPublicUser(rows[0] as Record<string, unknown>) : null;
}

export async function deleteSession(token: string) {
  if (demoMode()) { demo.sessions.delete(token); return; }
  const sql = database();
  await sql`DELETE FROM sessions WHERE id = ${token}`;
}

export async function getBootstrap(user: PublicUser): Promise<BootstrapPayload> {
  if (demoMode()) {
    const state = demo.userState(user.id);
    return {
      user,
      creators: creatorProfiles,
      components: routineComponents,
      publications: structuredClone(demo.publications),
      followingCreatorIds: [...state.following],
      likedPublicationKeys: [...state.liked],
      timeline: [...state.timeline],
    };
  }

  const sql = database();
  const [creatorRows, componentRows, publicationRows, followingRows, likeRows, timelineRows] = await Promise.all([
    sql`SELECT id, handle, name, role, avatar_url, bio, instagram_url FROM users WHERE role = 'creator' ORDER BY name`,
    sql`SELECT id, category, title, description, duration_label, suggested_time, evidence_level, source_label, source_url, safety_note FROM routine_components WHERE status = 'published' ORDER BY category, title`,
    sql`SELECT creator_id, component_id, weekday, start_time FROM creator_component_publications WHERE status = 'published' ORDER BY weekday, start_time, sort_order, created_at`,
    sql`SELECT creator_id FROM follows WHERE user_id = ${user.id}`,
    sql`SELECT creator_id, component_id FROM component_likes WHERE user_id = ${user.id}`,
    sql`SELECT id, component_id, scheduled_for, start_time, source_creator_id, timezone FROM timeline_entries WHERE user_id = ${user.id} AND status = 'active' ORDER BY scheduled_for, start_time`,
  ]);
  const publications: Record<string, CreatorPublication[]> = {};
  for (const row of publicationRows as Record<string, unknown>[]) {
    const creatorId = String(row.creator_id);
    (publications[creatorId] ??= []).push({ creatorId, componentId: String(row.component_id), weekday: String(row.weekday), startTime: String(row.start_time).slice(0, 5) });
  }
  return {
    user,
    creators: (creatorRows as Record<string, unknown>[]).map(toPublicUser),
    components: (componentRows as Record<string, unknown>[]).map((row) => ({
      id: String(row.id), category: String(row.category), title: String(row.title), description: String(row.description), durationLabel: String(row.duration_label), suggestedTime: String(row.suggested_time), evidenceLevel: row.evidence_level === "reviewed" ? "reviewed" : "reported", sourceLabel: String(row.source_label), sourceUrl: String(row.source_url), safetyNote: row.safety_note ? String(row.safety_note) : null,
    })),
    publications,
    followingCreatorIds: (followingRows as Record<string, unknown>[]).map((row) => String(row.creator_id)),
    likedPublicationKeys: (likeRows as Record<string, unknown>[]).map((row) => `${row.creator_id}:${row.component_id}`),
    timeline: (timelineRows as Record<string, unknown>[]).map((row) => ({ id: String(row.id), componentId: String(row.component_id), scheduledFor: new Date(String(row.scheduled_for)).toISOString().slice(0, 10), startTime: String(row.start_time).slice(0, 5), sourceCreatorId: row.source_creator_id ? String(row.source_creator_id) : null, timeZone: String(row.timezone) })),
  };
}

export async function getPublicCreator(handle: string) {
  const normalized = handle.trim().toLowerCase().replace(/^@/, "");
  if (demoMode()) {
    const creator = creatorProfiles.find((profile) => profile.handle === normalized);
    if (!creator) return null;
    const publications = demo.publications[creator.id] ?? [];
    const componentIds = new Set(publications.map((publication) => publication.componentId));
    return { creator, publications, components: routineComponents.filter((component) => componentIds.has(component.id)) };
  }
  const sql = database();
  const userRows = await sql`SELECT id, handle, name, role, avatar_url, bio, instagram_url FROM users WHERE lower(handle) = ${normalized} AND role = 'creator' LIMIT 1`;
  const userRow = userRows[0] as Record<string, unknown> | undefined;
  if (!userRow) return null;
  const creator = toPublicUser(userRow);
  const rows = await sql`SELECT p.creator_id, p.component_id, p.weekday, p.start_time, c.id, c.category, c.title, c.description, c.duration_label, c.suggested_time, c.evidence_level, c.source_label, c.source_url, c.safety_note FROM creator_component_publications p JOIN routine_components c ON c.id = p.component_id WHERE p.creator_id = ${creator.id} AND p.status = 'published' AND c.status = 'published' ORDER BY p.weekday, p.start_time, p.sort_order`;
  const publications: CreatorPublication[] = [];
  const components = [] as BootstrapPayload["components"];
  for (const row of rows as Record<string, unknown>[]) {
    publications.push({ creatorId: String(row.creator_id), componentId: String(row.component_id), weekday: String(row.weekday), startTime: String(row.start_time).slice(0, 5) });
    components.push({ id: String(row.id), category: String(row.category), title: String(row.title), description: String(row.description), durationLabel: String(row.duration_label), suggestedTime: String(row.suggested_time), evidenceLevel: row.evidence_level === "reviewed" ? "reviewed" : "reported", sourceLabel: String(row.source_label), sourceUrl: String(row.source_url), safetyNote: row.safety_note ? String(row.safety_note) : null });
  }
  return { creator, publications, components };
}

export async function setFollow(user: PublicUser, creatorId: string, follows: boolean) {
  if (user.role !== "member") throw new Error("Only members can follow creators.");
  if (demoMode()) {
    if (!creatorProfiles.some((creator) => creator.id === creatorId)) throw new Error("Creator not found.");
    const state = demo.userState(user.id);
    if (follows) state.following.add(creatorId); else state.following.delete(creatorId);
    return;
  }
  const sql = database();
  const creators = await sql`SELECT id FROM users WHERE id = ${creatorId} AND role = 'creator' LIMIT 1`;
  if (!creators[0]) throw new Error("Creator not found.");
  if (follows) await sql`INSERT INTO follows (user_id, creator_id) VALUES (${user.id}, ${creatorId}) ON CONFLICT DO NOTHING`;
  else await sql`DELETE FROM follows WHERE user_id = ${user.id} AND creator_id = ${creatorId}`;
}

export async function setLike(user: PublicUser, creatorId: string, componentId: string, liked: boolean) {
  if (demoMode()) {
    if (!(demo.publications[creatorId] ?? []).some((publication) => publication.componentId === componentId)) throw new Error("Published component not found.");
    const state = demo.userState(user.id);
    const key = `${creatorId}:${componentId}`;
    if (liked) state.liked.add(key); else state.liked.delete(key);
    return;
  }
  const sql = database();
  const publications = await sql`SELECT 1 FROM creator_component_publications WHERE creator_id = ${creatorId} AND component_id = ${componentId} AND status = 'published' LIMIT 1`;
  if (!publications[0]) throw new Error("Published component not found.");
  if (liked) await sql`INSERT INTO component_likes (user_id, creator_id, component_id) VALUES (${user.id}, ${creatorId}, ${componentId}) ON CONFLICT DO NOTHING`;
  else await sql`DELETE FROM component_likes WHERE user_id = ${user.id} AND creator_id = ${creatorId} AND component_id = ${componentId}`;
}

export async function addTimelineEntry(user: PublicUser, entry: Omit<TimelineEntry, "id">): Promise<TimelineEntry> {
  if (demoMode()) {
    if (!routineComponents.some((component) => component.id === entry.componentId)) throw new Error("Component not found.");
    if (entry.sourceCreatorId && !(demo.publications[entry.sourceCreatorId] ?? []).some((publication) => publication.componentId === entry.componentId)) throw new Error("Source publication not found.");
    const state = demo.userState(user.id);
    if (state.timeline.some((item) => item.componentId === entry.componentId && item.scheduledFor === entry.scheduledFor && item.startTime === entry.startTime)) throw new Error("This component is already on your timeline at that time.");
    const created = { ...entry, id: crypto.randomUUID() };
    state.timeline.push(created);
    return created;
  }
  const sql = database();
  const components = await sql`SELECT id FROM routine_components WHERE id = ${entry.componentId} AND status = 'published' LIMIT 1`;
  if (!components[0]) throw new Error("Component not found.");
  if (entry.sourceCreatorId) {
    const publications = await sql`SELECT 1 FROM creator_component_publications WHERE creator_id = ${entry.sourceCreatorId} AND component_id = ${entry.componentId} AND status = 'published' LIMIT 1`;
    if (!publications[0]) throw new Error("Source publication not found.");
  }
  const id = crypto.randomUUID();
  await sql`INSERT INTO timeline_entries (id, user_id, component_id, scheduled_for, start_time, source_creator_id, timezone, status) VALUES (${id}, ${user.id}, ${entry.componentId}, ${entry.scheduledFor}, ${entry.startTime}, ${entry.sourceCreatorId}, ${entry.timeZone}, 'active')`;
  return { ...entry, id };
}

export async function removeTimelineEntry(user: PublicUser, entryId: string) {
  if (demoMode()) {
    const state = demo.userState(user.id);
    state.timeline = state.timeline.filter((item) => item.id !== entryId);
    return;
  }
  const sql = database();
  await sql`UPDATE timeline_entries SET status = 'removed', updated_at = now() WHERE id = ${entryId} AND user_id = ${user.id}`;
}

export async function setPublication(user: PublicUser, publication: CreatorPublication, published: boolean) {
  if (user.role !== "creator") throw new Error("Only creators can publish routine components.");
  if (demoMode()) {
    if (!routineComponents.some((component) => component.id === publication.componentId)) throw new Error("Central component not found.");
    const current = demo.publications[user.id] ?? [];
    demo.publications[user.id] = published ? [...current.filter((item) => item.componentId !== publication.componentId), publication] : current.filter((item) => item.componentId !== publication.componentId);
    return;
  }
  const sql = database();
  const components = await sql`SELECT id FROM routine_components WHERE id = ${publication.componentId} AND status = 'published' LIMIT 1`;
  if (!components[0]) throw new Error("Central component not found.");
  if (published) await sql`INSERT INTO creator_component_publications (creator_id, component_id, weekday, start_time, status, sort_order) VALUES (${user.id}, ${publication.componentId}, ${publication.weekday}, ${publication.startTime}, 'published', 0) ON CONFLICT (creator_id, component_id) DO UPDATE SET weekday = EXCLUDED.weekday, start_time = EXCLUDED.start_time, status = 'published'`;
  else await sql`UPDATE creator_component_publications SET status = 'archived' WHERE creator_id = ${user.id} AND component_id = ${publication.componentId}`;
  await sql`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, metadata) VALUES (${crypto.randomUUID()}, ${user.id}, ${published ? "published" : "archived"}, 'creator_component_publication', ${`${user.id}:${publication.componentId}`}, ${JSON.stringify({ weekday: publication.weekday, startTime: publication.startTime })}::jsonb)`;
}

export function isDemoMode() {
  return demoMode();
}

export async function healthCheck() {
  if (demoMode()) return { mode: "demo" as const };
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not configured.");
  await database().query("SELECT 1");
  return { mode: "database" as const };
}
