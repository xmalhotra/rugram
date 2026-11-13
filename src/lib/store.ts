import "server-only";

import bcrypt from "bcryptjs";
import { database } from './database';
import { creatorProfiles, initialPublications, memberAccount, routineComponents } from "./catalog";
import type { BootstrapPayload, CreatorPublication, PublicUser, Role, TimelineEntry } from "./types";
import {mockPhoneAccounts,simulatedAccounts} from '../../shared/auth';
import { usernameFromHandle,memberHandle,planUsernameChange,searchPeopleList,sqlLikeLiteral} from '../../shared/usernames';
import {demoModeEnabled} from './runtime-config';
import {normalizePhone} from './otp';
import {accountChangeNeedsReason,type AccountAudit,type AccountSnapshot} from '../../shared/admin-content';

type PrivateUser = PublicUser & { passwordHash?: string; password?: string;disabled?:boolean;phone?:string|null;email?:string|null;handleChangedAt?:string|null };
type UserState = { following: Set<string>; liked: Set<string>; timeline: TimelineEntry[] };

declare global {
  var rugramDemoStore: DemoStore | undefined;
}

class DemoStore {
  users: PrivateUser[] = [memberAccount, ...creatorProfiles, { ...memberAccount, id: "creator", handle: "creator", name: "Demo Creator", role: "creator" as const }, { ...memberAccount, id: "admin", handle: "admin", name: "Admin", role: "admin" as const }].map((user) => ({ ...user, handle: usernameFromHandle(user.handle), password: "12345" }));
  publications: Record<string, CreatorPublication[]> = structuredClone(initialPublications);
  state: Record<string, UserState> = {};
  sessions = new Map<string, { userId: string; expiresAt: number }>();
  phoneUsers = new Map<string,string>();
  accountAudit: AccountAudit[] = [];

  userState(userId: string) {
    if (!this.state[userId]) this.state[userId] = { following: new Set(), liked: new Set(), timeline: [] };
    return this.state[userId];
  }
}

const demo = globalThis.rugramDemoStore ?? new DemoStore();
globalThis.rugramDemoStore = demo;
demo.phoneUsers ??= new Map<string,string>();

/** Only callable after the local mock provider verifies its challenge. */
export async function mockPhoneUser(phone:string):Promise<PublicUser> {
  if(process.env.NODE_ENV==='production' || !demoMode())throw new Error('Mock phone accounts are disabled.');
  const fixture=mockPhoneAccounts.find(account=>account.phone===phone);
  let user=demo.users.find(account=>account.id===demo.phoneUsers.get(phone))??(fixture?demo.users.find(account=>account.id===fixture.handle):undefined);
  if(!user){
    const id=crypto.randomUUID();
    user={id,handle:memberHandle(id,candidate=>demo.users.some(account=>account.handle.toLowerCase()===candidate)),name:'New member',role:'member',avatarUrl:null,bio:null,instagramUrl:null,handleChangedAt:null};
    demo.users.push(user);demo.phoneUsers.set(phone,id);
  }
  user.phone=phone;
  demo.phoneUsers.set(phone,user.id);
  if(user.disabled)throw new Error('Account is suspended.');
  return toPublicUser(user as unknown as Record<string,unknown>);
}

function demoMode() {
  return demoModeEnabled(process.env);
}

/** Local demo only: signs in as a named simulated account without a code. */
export async function simulatedPhoneUser(phone:string):Promise<PublicUser> {
  const account=simulatedAccounts.find(item=>item.phone===phone);
  if(!account)throw new Error('Unknown simulated account.');
  const user=await mockPhoneUser(phone);
  const row=demo.users.find(item=>item.id===user.id)!;
  row.name=account.name;row.handle=usernameFromHandle(account.handle);
  if('role' in account)row.role=account.role;
  return toPublicUser(row as unknown as Record<string,unknown>);
}

/** Call only with the phone returned by a successful server-side OTP verification.
 * Never link legacy handles to a phone or grant roles from fixture numbers. */
export async function verifiedPhoneUser(phone:string):Promise<PublicUser> {
  if(demoMode())return mockPhoneUser(phone);
  if(normalizePhone(phone)!==phone)throw new Error('Invalid verified phone.');
  const sql=database();
  const id=crypto.randomUUID();
  const rows=await sql`INSERT INTO users(id,handle,name,role,phone_e164,phone_verified_at)
    VALUES(${id},${memberHandle(id)},'New member','member',${phone},now())
    ON CONFLICT(phone_e164) DO UPDATE SET phone_e164=EXCLUDED.phone_e164
    RETURNING id,handle,name,role,avatar_url,bio,instagram_url,is_disabled`;
  if(rows[0].is_disabled)throw new Error('Account is suspended.');
  return toPublicUser(rows[0]);
}

export async function memberContact(user: PublicUser) {
  if (demoMode()) {
    const row = demo.users.find(item => item.id === user.id);
    let phone = row?.phone ?? null;
    if (!phone) for (const [value, id] of demo.phoneUsers) if (id === user.id) phone = value;
    return { phone, email: row?.email ?? null };
  }
  const rows = await (async () => {
    try {
      return await database()`SELECT phone_e164, email FROM users WHERE id=${user.id}`;
    } catch (error) {
      if ((error as { code?: string })?.code !== '42703') throw error;
      return database()`SELECT phone_e164 FROM users WHERE id=${user.id}`;
    }
  })();
  return {
    phone: rows[0]?.phone_e164 ? String(rows[0].phone_e164) : null,
    email: rows[0]?.email ? String(rows[0].email) : null,
  };
}

export async function updateMemberName(user: PublicUser, name: string) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2 || clean.length > 80)
    throw new Error('Account name needs 2 to 80 characters.');
  if (demoMode()) {
    const row = demo.users.find(item => item.id === user.id);
    if (!row) throw new Error('Account not found.');
    row.name = clean;
    return;
  }
  await database()`UPDATE users SET name=${clean} WHERE id=${user.id}`;
}

function uniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === '23505';
}

export async function updateUsername(user: PublicUser, input: string) {
  if (demoMode()) {
    const row = demo.users.find(item => item.id === user.id);
    if (!row) throw new Error('Account not found.');
    const plan = planUsernameChange(
      { id: row.id, handle: row.handle, handleChangedAt: row.handleChangedAt ?? null },
      input,
      demo.users.map(item => ({ id: item.id, handle: item.handle })),
    );
    if (!plan.ok) throw new Error(plan.error);
    if (!plan.changed) return;
    row.handle = plan.handle;
    row.handleChangedAt = plan.handleChangedAt;
    return;
  }
  const sql = database();
  const rows = await sql`SELECT handle, handle_changed_at FROM users WHERE id=${user.id}`;
  const current = rows[0];
  if (!current) throw new Error('Account not found.');
  const normalized = input.trim().toLowerCase().replace(/^@/, '');
  const candidate = normalized.startsWith('q_') ? normalized : `q_${normalized}`;
  const clash = await sql`SELECT id, handle FROM users WHERE lower(handle)=${candidate} AND id<>${user.id} LIMIT 1`;
  const changedAt = current.handle_changed_at ? new Date(String(current.handle_changed_at)).toISOString() : null;
  const plan = planUsernameChange(
    { id: user.id, handle: String(current.handle), handleChangedAt: changedAt },
    input,
    clash.map(row => ({ id: String(row.id), handle: String(row.handle) })),
  );
  if (!plan.ok) throw new Error(plan.error);
  if (!plan.changed) return;
  try {
    await sql`UPDATE users SET handle=${plan.handle}, handle_changed_at=${plan.handleChangedAt} WHERE id=${user.id}`;
  } catch (error) {
    if (uniqueViolation(error)) throw new Error('That username is taken.');
    throw error;
  }
}

export async function searchPeople(user: PublicUser, query: string) {
  const term = query.trim().replace(/^@/, '');
  if (term.length < 2) throw new Error('Type at least 2 characters.');
  if (demoMode())
    return searchPeopleList(
      user.id,
      query,
      demo.users.map(person => ({
        id: person.id,
        name: person.name,
        handle: person.handle,
        avatarUrl: person.avatarUrl ?? null,
        disabled: Boolean(person.disabled),
      })),
    );
  const literal = sqlLikeLiteral(term);
  const contains = `%${literal}%`;
  const prefix = `${literal}%`;
  const rows = await database()`SELECT id, name, handle, avatar_url FROM users
    WHERE NOT is_disabled AND id<>${user.id}
      AND (name ILIKE ${contains} ESCAPE '\\' OR handle ILIKE ${contains} ESCAPE '\\')
    ORDER BY CASE WHEN name ILIKE ${prefix} ESCAPE '\\' OR handle ILIKE ${prefix} ESCAPE '\\' THEN 0 ELSE 1 END, lower(name), id
    LIMIT 20`;
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    handle: String(row.handle),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  }));
}

export async function setMemberEmail(user: PublicUser, email: string) {
  const clean = email.trim().toLowerCase();
  if (demoMode()) {
    const taken = demo.users.find(item => item.id !== user.id && item.email === clean);
    if (taken) throw new Error('Account email is already used.');
    const row = demo.users.find(item => item.id === user.id);
    if (!row) throw new Error('Account not found.');
    row.email = clean;
    return;
  }
  const clash =
    await database()`SELECT id FROM users WHERE lower(email)=${clean} AND id<>${user.id}`;
  if (clash.length) throw new Error('Account email is already used.');
  await database()`UPDATE users SET email=${clean}, email_verified_at=now() WHERE id=${user.id}`;
}

function toPublicUser(row: Record<string, unknown>): PublicUser {
  return {
    id: String(row.id),
    handle: String(row.handle),
    name: String(row.name),
    role: row.role as Role,
    avatarUrl: row.avatar_url||row.avatarUrl ? String(row.avatar_url??row.avatarUrl) : null,
    bio: row.bio ? String(row.bio) : null,
    instagramUrl: row.instagram_url||row.instagramUrl ? String(row.instagram_url??row.instagramUrl) : null,
  };
}

export async function authenticate(handle: string, password: string): Promise<PublicUser | null> {
  const normalized = handle.trim().toLowerCase().replace(/^@/, "");
  if (demoMode()) {
    const user = demo.users.find((candidate) => candidate.handle === usernameFromHandle(normalized) || candidate.id === normalized);
    return user?.password === password ? toPublicUser(user as unknown as Record<string, unknown>) : null;
  }
  const sql = database();
  const rows = await sql`SELECT id, handle, name, role, avatar_url, bio, instagram_url, password_hash FROM users WHERE lower(handle) IN (${normalized}, ${usernameFromHandle(normalized)}) LIMIT 1`;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row || typeof row.password_hash !== "string" || !(await bcrypt.compare(password, row.password_hash))) return null;
  return toPublicUser(row);
}

export async function getCreatorAccount(handle:string):Promise<PublicUser|null>{
  if(isDemoMode()){const user=demo.users.find(user=>user.role==='creator'&&user.handle.toLowerCase()===usernameFromHandle(handle));return user?toPublicUser(user as unknown as Record<string,unknown>):null;}
  const rows=await database()`SELECT id,handle,name,role FROM users WHERE lower(handle)=${usernameFromHandle(handle)} AND role='creator' LIMIT 1`;
  return rows[0]?toPublicUser(rows[0]):null;
}
export const peoplePageSize=50;
export async function adminPeople(admin:PublicUser,search='',offset=0){
  if(admin.role!=='admin')throw new Error('Admin access required.');
  let people:(PublicUser&{disabled:boolean})[];
  if(isDemoMode())people=demo.users.filter(user=>`${user.name} ${user.handle}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.handle.localeCompare(b.handle)).slice(offset,offset+peoplePageSize+1).map(user=>({...toPublicUser(user as unknown as Record<string,unknown>),disabled:Boolean(user.disabled)}));
  else people=(await database()`SELECT id,handle,name,role,avatar_url,bio,instagram_url,is_disabled FROM users WHERE name ILIKE ${`%${search}%`} OR handle ILIKE ${`%${search}%`} ORDER BY handle,id LIMIT ${peoplePageSize+1} OFFSET ${offset}`).map(row=>({...toPublicUser(row),disabled:Boolean(row.is_disabled)}));
  return {people:people.slice(0,peoplePageSize),nextOffset:people.length>peoplePageSize?offset+peoplePageSize:null};
}
export async function userNames(ids:(string|null|undefined)[]):Promise<Record<string,string>>{
  const unique=[...new Set(ids.filter((id):id is string=>Boolean(id)))];if(!unique.length)return {};
  if(isDemoMode())return Object.fromEntries(demo.users.filter(user=>unique.includes(user.id)).map(user=>[user.id,`${user.name} (@${user.handle})`]));
  return Object.fromEntries((await database()`SELECT id,name,handle FROM users WHERE id=ANY(${unique}::text[])`).map(row=>[String(row.id),`${row.name} (@${row.handle})`]));
}
export async function adminUpdatePerson(admin:PublicUser,input:{id:string;name:string;handle:string;role:Role;bio:string;instagramUrl:string;avatarUrl:string;disabled:boolean;reason?:string}){
  if(admin.role!=='admin')throw new Error('Admin access required.');
  input={...input,handle:usernameFromHandle(input.handle)};
  if(input.id===admin.id&&(input.role!=='admin'||input.disabled))throw new Error('Content cannot remove your own admin access.');
  const reason=input.reason?.trim()||null;
  if(reason&&reason.length<3)throw new Error('Content reason must be at least 3 characters.');
  const after:AccountSnapshot={name:input.name,handle:input.handle,role:input.role,disabled:input.disabled};
  const fields={name:input.name,handle:input.handle,role:input.role,bio:input.bio,instagramUrl:input.instagramUrl,avatarUrl:input.avatarUrl,disabled:input.disabled};
  if(isDemoMode()){
    const user=demo.users.find(user=>user.id===input.id);if(!user)throw new Error('Content account not found.');
    const before:AccountSnapshot={name:user.name,handle:user.handle,role:user.role,disabled:Boolean(user.disabled)};
    if(accountChangeNeedsReason(before,after)&&!reason)throw new Error('Content role and suspension changes need a reason.');
    if(demo.users.some(user=>user.id!==input.id&&user.handle.toLowerCase()===input.handle.toLowerCase()))throw new Error('Content username is already used.');
    if(user.role==='admin'&&(input.role!=='admin'||input.disabled)&&demo.users.filter(user=>user.role==='admin'&&!user.disabled).length<=1)throw new Error('Content must retain an active admin.');
    const revoke=user.role!==input.role||input.disabled;
    Object.assign(user,fields);
    let sessionsRevoked=0;
    if(revoke)for(const [token,session] of demo.sessions)if(session.userId===input.id){demo.sessions.delete(token);sessionsRevoked++;}
    (demo.accountAudit??=[]).push({id:crypto.randomUUID(),actor:admin.id,actorName:null,target:input.id,before,after,reason,sessionsRevoked,at:new Date().toISOString()});
    return {sessionsRevoked};
  }
  const sql=database();
  const current=(await sql`SELECT name,handle,role,is_disabled FROM users WHERE id=${input.id}`)[0];
  if(!current)throw new Error('Content account not found.');
  if(accountChangeNeedsReason({name:String(current.name),handle:String(current.handle),role:current.role as Role,disabled:Boolean(current.is_disabled)},after)&&!reason)throw new Error('Content role and suspension changes need a reason.');
  const result=await sql.transaction([
    sql`SELECT id FROM users WHERE role='admin' ORDER BY id FOR UPDATE`,
    sql`WITH previous AS MATERIALIZED (SELECT id,name,handle,role,is_disabled FROM users WHERE id=${input.id} FOR UPDATE),
      changed AS (UPDATE users SET name=${input.name},handle=${input.handle},role=${input.role},bio=${input.bio},instagram_url=${input.instagramUrl||null},avatar_url=${input.avatarUrl||null},is_disabled=${input.disabled}
        WHERE id=${input.id} AND EXISTS(SELECT 1 FROM previous) AND EXISTS(SELECT 1 FROM users WHERE id=${admin.id} AND role='admin' AND NOT is_disabled)
        AND (${reason}::text IS NOT NULL OR EXISTS(SELECT 1 FROM previous WHERE previous.role=${input.role} AND previous.is_disabled=${input.disabled}))
        AND (role<>'admin' OR (${input.role}='admin' AND NOT ${input.disabled}) OR (SELECT count(*) FROM users WHERE role='admin' AND NOT is_disabled)>1) RETURNING id),
      revoked AS (DELETE FROM sessions WHERE user_id=${input.id} AND EXISTS(SELECT 1 FROM changed JOIN previous USING(id) WHERE previous.role<>${input.role} OR ${input.disabled}) RETURNING id),
      logged AS (INSERT INTO account_audit(id,actor_id,target_id,before,after,reason,sessions_revoked)
        SELECT ${crypto.randomUUID()},${admin.id},previous.id,jsonb_build_object('name',previous.name,'handle',previous.handle,'role',previous.role,'disabled',previous.is_disabled),
          jsonb_build_object('name',${input.name}::text,'handle',${input.handle}::text,'role',${input.role}::text,'disabled',${input.disabled}::boolean),${reason}::text,(SELECT count(*) FROM revoked)
        FROM previous JOIN changed USING(id))
      SELECT id,(SELECT count(*) FROM revoked) AS revoked_count FROM changed`,
  ]);if(!result[1].length)throw new Error('Content account update denied; retain an active admin.');
  return {sessionsRevoked:Number(result[1][0].revoked_count)};
}
export async function adminPersonHistory(admin:PublicUser,id:string):Promise<AccountAudit[]>{
  if(admin.role!=='admin')throw new Error('Admin access required.');
  const entries:AccountAudit[]=isDemoMode()
    ?structuredClone((demo.accountAudit??=[]).filter(entry=>entry.target===id).slice(-50).reverse())
    :(await database()`SELECT * FROM account_audit WHERE target_id=${id} ORDER BY at DESC,id LIMIT 50`).map(row=>({id:String(row.id),actor:row.actor_id?String(row.actor_id):null,actorName:null,target:String(row.target_id),before:row.before as AccountSnapshot,after:row.after as AccountSnapshot,reason:row.reason?String(row.reason):null,sessionsRevoked:Number(row.sessions_revoked),at:new Date(String(row.at)).toISOString()}));
  const names=await userNames(entries.map(entry=>entry.actor));
  return entries.map(entry=>({...entry,actorName:entry.actor?names[entry.actor]??null:null}));
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
  const result=await sql.transaction([
    sql`SELECT id FROM users WHERE id=${userId} AND NOT is_disabled FOR UPDATE`,
    sql`INSERT INTO sessions(id,user_id,expires_at) SELECT ${token},id,${expiresAt.toISOString()} FROM users WHERE id=${userId} AND NOT is_disabled RETURNING id`,
  ]);
  if(!result[1].length)throw new Error('Account is suspended or unavailable.');
}

export async function getSessionUser(token: string): Promise<PublicUser | null> {
  if (demoMode()) {
    const session = demo.sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) return null;
    if(demo.users.find(user=>user.id===session.userId)?.disabled)return null;
    return getUser(session.userId);
  }
  const sql = database();
  const rows = await sql`SELECT u.id, u.handle, u.name, u.role, u.avatar_url, u.bio, u.instagram_url FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ${token} AND s.expires_at > now() AND NOT u.is_disabled LIMIT 1`;
  return rows[0] ? toPublicUser(rows[0] as Record<string, unknown>) : null;
}

export async function deleteSession(token: string) {
  if (demoMode()) { demo.sessions.delete(token); return; }
  const sql = database();
  await sql`DELETE FROM sessions WHERE id = ${token}`;
}

export function exportDemoIdentity(id:string) {
  const user=demo.users.find(item=>item.id===id);
  return {user:user?toPublicUser(user as unknown as Record<string,unknown>):null,
    phones:[...demo.phoneUsers].filter(([,userId])=>userId===id).map(([phone])=>phone),
    following:[...(demo.state[id]?.following??[])],liked:[...(demo.state[id]?.liked??[])],timeline:structuredClone(demo.state[id]?.timeline??[])};
}
export function eraseDemoIdentity(id:string) {
  demo.users=demo.users.filter(user=>user.id!==id);delete demo.state[id];delete demo.publications[id];
  for(const [phone,userId]of demo.phoneUsers)if(userId===id)demo.phoneUsers.delete(phone);
  for(const [token,session]of demo.sessions)if(session.userId===id)demo.sessions.delete(token);
  for(const state of Object.values(demo.state)){state.following.delete(id);state.timeline=state.timeline.filter(entry=>entry.sourceCreatorId!==id);}
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
    sql`SELECT id, category, title, description, duration_label, suggested_time, placement, profile_group, evidence_level, source_label, source_url, safety_note FROM routine_components WHERE status = 'published' ORDER BY category, title`,
    sql`SELECT creator_id, component_id, weekday, start_time FROM creator_component_publications WHERE status = 'published' ORDER BY weekday, start_time, sort_order, created_at`,
    sql`SELECT creator_id FROM follows WHERE user_id = ${user.id}`,
    sql`SELECT creator_id, component_id FROM component_likes WHERE user_id = ${user.id}`,
    sql`SELECT id, component_id, scheduled_for, start_time, source_creator_id, timezone FROM timeline_entries WHERE user_id = ${user.id} AND status = 'active' ORDER BY scheduled_for NULLS LAST, start_time NULLS LAST, created_at`,
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
      id: String(row.id), category: String(row.category), title: String(row.title), description: String(row.description), durationLabel: String(row.duration_label), suggestedTime: String(row.suggested_time), placement: row.placement === "preference" ? "preference" : "timeline", profileGroup: row.profile_group ? String(row.profile_group) : null, evidenceLevel: row.evidence_level === "reviewed" ? "reviewed" : "reported", sourceLabel: String(row.source_label), sourceUrl: String(row.source_url), safetyNote: row.safety_note ? String(row.safety_note) : null,
    })),
    publications,
    followingCreatorIds: (followingRows as Record<string, unknown>[]).map((row) => String(row.creator_id)),
    likedPublicationKeys: (likeRows as Record<string, unknown>[]).map((row) => `${row.creator_id}:${row.component_id}`),
    timeline: (timelineRows as Record<string, unknown>[]).map((row) => ({ id: String(row.id), componentId: String(row.component_id), scheduledFor: row.scheduled_for ? new Date(String(row.scheduled_for)).toISOString().slice(0, 10) : null, startTime: row.start_time ? String(row.start_time).slice(0, 5) : null, sourceCreatorId: row.source_creator_id ? String(row.source_creator_id) : null, timeZone: String(row.timezone) })),
  };
}

export async function getPublicCreator(handle: string) {
  // Old links without the q_ prefix keep working.
  const normalized = usernameFromHandle(handle);
  if (demoMode()) {
    const creator = creatorProfiles.find((profile) => usernameFromHandle(profile.handle) === normalized);
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
  const rows = await sql`SELECT p.creator_id, p.component_id, p.weekday, p.start_time, c.id, c.category, c.title, c.description, c.duration_label, c.suggested_time, c.placement, c.profile_group, c.evidence_level, c.source_label, c.source_url, c.safety_note FROM creator_component_publications p JOIN routine_components c ON c.id = p.component_id WHERE p.creator_id = ${creator.id} AND p.status = 'published' AND c.status = 'published' ORDER BY p.weekday, p.start_time, p.sort_order`;
  const publications: CreatorPublication[] = [];
  const components = [] as BootstrapPayload["components"];
  for (const row of rows as Record<string, unknown>[]) {
    publications.push({ creatorId: String(row.creator_id), componentId: String(row.component_id), weekday: String(row.weekday), startTime: String(row.start_time).slice(0, 5) });
    components.push({ id: String(row.id), category: String(row.category), title: String(row.title), description: String(row.description), durationLabel: String(row.duration_label), suggestedTime: String(row.suggested_time), placement: row.placement === "preference" ? "preference" : "timeline", profileGroup: row.profile_group ? String(row.profile_group) : null, evidenceLevel: row.evidence_level === "reviewed" ? "reviewed" : "reported", sourceLabel: String(row.source_label), sourceUrl: String(row.source_url), safetyNote: row.safety_note ? String(row.safety_note) : null });
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
    if (state.timeline.some((item) => item.componentId === entry.componentId)) throw new Error("This routine is already in your profile.");
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
  await sql`INSERT INTO timeline_entries (id, user_id, component_id, scheduled_for, start_time, source_creator_id, timezone, status) VALUES (${id}, ${user.id}, ${entry.componentId}, ${entry.scheduledFor ?? null}, ${entry.startTime ?? null}, ${entry.sourceCreatorId}, ${entry.timeZone}, 'active')`;
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

export async function scheduleTimelineEntry(user: PublicUser, entryId: string, scheduledFor: string, startTime: string) {
  if (demoMode()) {
    const entry = demo.userState(user.id).timeline.find((item) => item.id === entryId);
    if (!entry) throw new Error("Routine not found.");
    entry.scheduledFor = scheduledFor;
    entry.startTime = startTime;
    return entry;
  }
  const sql = database();
  const rows = await sql`UPDATE timeline_entries SET scheduled_for = ${scheduledFor}, start_time = ${startTime}, updated_at = now() WHERE id = ${entryId} AND user_id = ${user.id} AND status = 'active' RETURNING id, component_id, scheduled_for, start_time, source_creator_id, timezone`;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error("Routine not found.");
  return { id: String(row.id), componentId: String(row.component_id), scheduledFor: new Date(String(row.scheduled_for)).toISOString().slice(0, 10), startTime: String(row.start_time).slice(0, 5), sourceCreatorId: row.source_creator_id ? String(row.source_creator_id) : null, timeZone: String(row.timezone) };
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

/** A member sets their own display name, e.g. a web guest registering for an event. */
export async function setOwnName(user: PublicUser, raw: string): Promise<PublicUser> {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 60) throw new Error('Use a name of 2 to 60 characters.');
  if (demoMode()) {
    const row = demo.users.find(item => item.id === user.id);
    if (row) row.name = name;
    return { ...user, name };
  }
  await database()`UPDATE users SET name=${name} WHERE id=${user.id}`;
  return { ...user, name };
}

/** Demo profiles keep the public avatar URL on the in-memory user. */
export function setDemoUserAvatar(userId: string, avatarUrl: string | null) {
  const row = demo.users.find(item => item.id === userId);
  if (row) row.avatarUrl = avatarUrl;
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
