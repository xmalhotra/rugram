import 'server-only';
import { database } from './database';
import { isDemoMode, exportDemoIdentity, eraseDemoIdentity } from './store';
import { accountRetention, AccountError } from '../../shared/account';
import type { PublicUser } from './types';

export async function exportAccount(user: PublicUser) {
  if (isDemoMode()) {
    const state = globalThis.betterHabitsMobileState;
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      retention: accountRetention,
      account: exportDemoIdentity(user.id),
      profile: structuredClone(state?.profiles[user.id] ?? null),
      listings: structuredClone(state?.catalog.filter(item => item.createdBy === user.id) ?? []),
      analytics: structuredClone(state?.activities.filter(item => item.userId === user.id) ?? []),
      registrations: structuredClone(
        Object.values(globalThis.betterHabitsRegistrations ?? {}).filter(
          row => row.userId === user.id,
        ),
      ),
      inbox: structuredClone(
        (globalThis.betterHabitsInbox ?? []).filter(row => row.recipientId === user.id),
      ),
      reports: structuredClone(
        (globalThis.betterHabitsReports ?? []).filter(row => row.reporterId === user.id),
      ),
      completionReceipts: Object.fromEntries(
        Object.entries(state?.requests ?? {}).filter(([key]) =>
          key.startsWith(`${user.id}:completion:`),
        ),
      ),
    };
  }
  const sql = database();
  const [
    identity,
    profiles,
    listings,
    analytics,
    rsvps,
    registrations,
    following,
    likes,
    timeline,
    audit,
    inbox,
    reports,
    completionReceipts,
  ] = await sql.transaction([
    sql`SELECT id,handle,name,role,avatar_url,bio,instagram_url,phone_e164,phone_verified_at,created_at FROM users WHERE id=${user.id}`,
    sql`SELECT data FROM mobile_profiles WHERE user_id=${user.id}`,
    sql`SELECT data FROM mobile_catalog WHERE data->>'createdBy'=${user.id}`,
    sql`SELECT action,role,at,resource_kind,resource_id,metadata FROM mobile_analytics WHERE user_id=${user.id} ORDER BY at`,
    sql`SELECT event_id FROM mobile_rsvps WHERE user_id=${user.id}`,
    sql`SELECT event_id,status,requested_at,updated_at FROM mobile_event_registrations WHERE user_id=${user.id}`,
    sql`SELECT creator_id FROM follows WHERE user_id=${user.id}`,
    sql`SELECT creator_id,component_id FROM component_likes WHERE user_id=${user.id}`,
    sql`SELECT component_id,scheduled_for,start_time,timezone,status FROM timeline_entries WHERE user_id=${user.id}`,
    sql`SELECT kind,item_id,action,version,data,at FROM mobile_content_audit WHERE actor_id=${user.id}`,
    sql`SELECT type,title,body,target_kind,target_id,created_at,read_at FROM mobile_notifications WHERE recipient_id=${user.id} ORDER BY created_at DESC`,
    sql`SELECT kind,item_id,title,reason,note,status,outcome,created_at,resolved_at FROM mobile_reports WHERE reporter_id=${user.id} ORDER BY created_at DESC`,
    sql`SELECT request_id,body,created_at FROM mobile_completion_receipts WHERE user_id=${user.id} ORDER BY created_at`,
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    retention: accountRetention,
    account: identity[0],
    profiles,
    listings,
    analytics,
    rsvps,
    registrations,
    following,
    likes,
    timeline,
    audit,
    inbox,
    reports,
    completionReceipts,
  };
}

/** Self-service erasure never accepts another user's ID from the client. */
export async function deleteAccount(user: PublicUser) {
  // Administrative ownership must be handed over and this account demoted first.
  if (user.role === 'admin')
    throw new AccountError(
      'Transfer admin access and change this account to a member before deleting it.',
      409,
    );
  if (isDemoMode()) {
    globalThis.betterHabitsReports = (globalThis.betterHabitsReports ?? []).filter(
      row => row.reporterId !== user.id,
    );
    globalThis.betterHabitsInbox = (globalThis.betterHabitsInbox ?? []).filter(
      row => row.recipientId !== user.id,
    );
    for (const phone of exportDemoIdentity(user.id).phones)
      globalThis.betterHabitsMockOtp?.forgetPhone(phone);
    const state = globalThis.betterHabitsMobileState;
    const owned = new Set(
      state?.catalog.filter(item => item.createdBy === user.id).map(item => item.id) ?? [],
    );
    if (state) {
      delete state.profiles[user.id];
      state.catalog = state.catalog.filter(item => !owned.has(item.id));
      for (const item of state.catalog)
        if ('endorsements' in item)
          item.endorsements = item.endorsements.filter(row => row.creatorId !== user.id);
      state.activities = state.activities.filter(item => item.userId !== user.id);
      for (const key of Object.keys(state.requests))
        if (key.startsWith(`${user.id}:`)) delete state.requests[key];
      for (const id of owned) delete state.attendance[id];
    }
    const registrations = globalThis.betterHabitsRegistrations;
    if (registrations)
      for (const [key, row] of Object.entries(registrations))
        if (row.userId === user.id || owned.has(row.eventId)) delete registrations[key];
    const content = globalThis.betterHabitsContent;
    if (content) {
      for (const [key, row] of Object.entries(content.rows))
        if (
          owned.has(row.id) ||
          row.draft?.createdBy === user.id ||
          row.published?.createdBy === user.id
        )
          delete content.rows[key];
      content.audit = content.audit.filter(row => row.actor !== user.id && !owned.has(row.itemId));
    }
    eraseDemoIdentity(user.id);
    return;
  }
  const sql = database();
  // Row lock prevents role changes racing the privacy operation. The role guard
  // is rechecked in the database, not merely trusted from the session snapshot.
  await sql.transaction([
    sql`SELECT assert_mobile_account_deletable(${user.id})`,
    sql`DELETE FROM mobile_content_audit WHERE actor_id=${user.id} OR data->'endorsements' @> jsonb_build_array(jsonb_build_object('creatorId',${user.id}::text)) OR item_id IN(SELECT id FROM mobile_catalog WHERE data->>'createdBy'=${user.id})`,
    sql`DELETE FROM mobile_content WHERE id IN(SELECT id FROM mobile_catalog WHERE data->>'createdBy'=${user.id}) OR draft->>'createdBy'=${user.id} OR published->>'createdBy'=${user.id}
      OR draft->'endorsements' @> jsonb_build_array(jsonb_build_object('creatorId',${user.id}::text)) OR published->'endorsements' @> jsonb_build_array(jsonb_build_object('creatorId',${user.id}::text))`,
    sql`UPDATE mobile_catalog SET data=jsonb_set(data,'{endorsements}',COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(data->'endorsements') WHERE value->>'creatorId'<>${user.id}),'[]'::jsonb)) WHERE kind='product' AND data->'endorsements' IS NOT NULL`,
    sql`DELETE FROM mobile_catalog WHERE data->>'createdBy'=${user.id}`,
    sql`DELETE FROM mobile_workouts WHERE created_by=${user.id}`,
    sql`DELETE FROM phone_otp_challenges WHERE phone_e164=(SELECT phone_e164 FROM users WHERE id=${user.id})`,
    sql`DELETE FROM audit_log WHERE actor_id=${user.id} OR entity_id=${user.id}`,
    sql`DELETE FROM request_buckets WHERE key LIKE ${`%:${user.id}%`}`,
    sql`DELETE FROM users WHERE id=${user.id} AND role<>'admin'`,
  ]);
}
