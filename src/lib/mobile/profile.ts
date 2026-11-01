import 'server-only';
import type { AppearancePreference } from '../../../shared/appearance';
import { flows, type MobileProfile } from '../../../shared/mobile';
import { isDemoMode } from '.././store';
import { type PublicUser } from '.././types';
import { workoutCatalog } from '.././exercise-store';
import { supportKindIds } from '../../../shared/gym-supports';
import { benefitPeriod, type BenefitUsage } from '../../../shared/credit-cards';
import { cardWalletSchema, type CardWalletAction } from '../../../shared/card-wallet-validation';
import { isHyderabadTech } from '../../../shared/hyderabad-tech';
import { managedLibrary } from '.././admin-content-store';
import { buildStoryGroups, storyReadKey } from '../../../shared/home-feed';
import { mobileBootstrap } from './bootstrap';
import { getItem } from './catalog';
import { trackMobile } from './analytics';
import { state, initialProfile, sqlClient } from './state';
import { completionDay } from '../../../shared/completion-input';

export async function getProfile(user: PublicUser): Promise<MobileProfile> {
  if (isDemoMode()) return structuredClone((state.profiles[user.id] ??= initialProfile()));
  const sql = sqlClient();
  await sql`INSERT INTO mobile_profiles(user_id) VALUES(${user.id}) ON CONFLICT DO NOTHING`;
  const rows = await sql`SELECT data FROM mobile_profiles WHERE user_id=${user.id}`;
  return rows[0].data as MobileProfile;
}

export async function editAppearance(user: PublicUser, preference: AppearancePreference) {
  if (!['system', 'light', 'dark'].includes(preference))
    throw new Error('Content invalid appearance preference.');
  await getProfile(user);
  if (isDemoMode()) state.profiles[user.id].appearance = preference;
  else
    await sqlClient()`UPDATE mobile_profiles SET data=jsonb_set(data,'{appearance}',${JSON.stringify(preference)}::jsonb),updated_at=now() WHERE user_id=${user.id}`;
}
export async function editProfile(
  user: PublicUser,
  action: 'city' | 'focus' | 'flow' | 'save' | 'complete' | 'equipment' | 'save-event',
  id: string,
  enabled = true,
  timeZone = 'Asia/Kolkata',
  originalDay?: string,
  requestId?: string,
) {
  const profileBefore = await getProfile(user);
  if (action === 'save-event') {
    if (enabled) {
      const item = await getItem(id);
      if (
        !item ||
        !('city' in item) ||
        item.status !== 'published' ||
        !isHyderabadTech(item, (await managedLibrary()).settings) ||
        item.registrationStatus === 'Cancelled' ||
        Date.parse(item.endsAt ?? item.startsAt) <= Date.now()
      )
        throw new Error('Event not available.');
    }
    let changed = false;
    if (isDemoMode()) {
      const profile = state.profiles[user.id];
      const values = profile.savedEventIds ?? [];
      if (enabled && values.length >= 1000 && !values.includes(id))
        throw new Error('Your saved history limit is reached.');
      changed = values.includes(id) !== enabled;
      profile.savedEventIds = enabled
        ? [...new Set([...values, id])]
        : values.filter(value => value !== id);
    } else {
      const sql = sqlClient();
      changed =
        (
          await sql`UPDATE mobile_profiles SET data=jsonb_set(data,'{savedEventIds}',CASE WHEN ${enabled} THEN COALESCE(data->'savedEventIds','[]'::jsonb)||${JSON.stringify([id])}::jsonb ELSE COALESCE(data->'savedEventIds','[]'::jsonb)-${id} END),updated_at=now() WHERE user_id=${user.id} AND (COALESCE(data->'savedEventIds','[]'::jsonb)?${id})<>${enabled} AND (NOT ${enabled} OR jsonb_array_length(COALESCE(data->'savedEventIds','[]'::jsonb))<1000) RETURNING user_id`
        ).length > 0;
      if (
        enabled &&
        !changed &&
        !profileBefore.savedEventIds?.includes(id) &&
        (profileBefore.savedEventIds?.length ?? 0) >= 1000
      )
        throw new Error('Your saved history limit is reached.');
    }
    if (changed)
      await trackMobile(user, enabled ? 'event_saved' : 'event_unsaved', {
        kind: 'event',
        id,
      });
    return;
  }
  if (action === 'equipment') {
    if (!supportKindIds.some(kind => kind === id)) throw new Error('Equipment not available.');
    let changed = false;
    if (isDemoMode()) {
      const profile = state.profiles[user.id];
      const values = profile.availableSupportIds ?? [];
      changed = values.includes(id) !== enabled;
      profile.availableSupportIds = enabled
        ? [...new Set([...values, id])]
        : values.filter(value => value !== id);
    } else {
      const sql = sqlClient();
      changed =
        (
          await sql`UPDATE mobile_profiles SET data=jsonb_set(data,'{availableSupportIds}',CASE WHEN ${enabled} THEN COALESCE(data->'availableSupportIds','[]'::jsonb)||${JSON.stringify([id])}::jsonb ELSE COALESCE(data->'availableSupportIds','[]'::jsonb)-${id} END),updated_at=now() WHERE user_id=${user.id} AND (COALESCE(data->'availableSupportIds','[]'::jsonb)?${id})<>${enabled} RETURNING user_id`
        ).length > 0;
    }
    if (changed) await trackMobile(user, enabled ? 'equipment_available' : 'equipment_removed');
    return;
  }
  const dynamic = await managedLibrary([...flows, ...(await workoutCatalog()).workouts]);
  const availableFlows = dynamic.flows;
  if (action === 'focus') {
    if (!dynamic.focus.some(option => option.id === id)) throw new Error('Focus not available.');
    let changed = false;
    if (isDemoMode()) {
      changed = state.profiles[user.id].focusId !== id;
      state.profiles[user.id].focusId = id;
    } else
      changed =
        (
          await sqlClient()`UPDATE mobile_profiles SET data=jsonb_set(data,'{focusId}',${JSON.stringify(id)}::jsonb),updated_at=now() WHERE user_id=${user.id} AND data->>'focusId' IS DISTINCT FROM ${id} RETURNING user_id`
        ).length > 0;
    if (changed) await trackMobile(user, 'focus_selected', { kind: 'focus', id });
    return;
  }
  if (action === 'flow' && !availableFlows.some(flow => flow.id === id))
    throw new Error('Flow not found.');
  if (action === 'save' && enabled) {
    const item = await getItem(id);
    if (!item || !('category' in item) || item.status !== 'published')
      throw new Error('Product not available.');
  }
  if (
    action === 'complete' &&
    !availableFlows.some(
      flow =>
        profileBefore.flowIds.includes(flow.id) &&
        flow.steps.some(step => `${flow.id}:${step.id}` === id),
    )
  )
    throw new Error('Join the flow before completing its steps.');
  const day = completionDay(action === 'complete' ? originalDay : undefined, timeZone);
  if (action === 'complete' && requestId) {
    const flow = availableFlows.find(flow =>
      flow.steps.some(step => `${flow.id}:${step.id}` === id),
    )!;
    if (!isDemoMode()) {
      await sqlClient()`SELECT mobile_complete_once(${user.id},${requestId},${flow.id},${id},${day},${timeZone},${enabled})`;
      return;
    }
    const requestKey = `${user.id}:completion:${requestId}`;
    const body = JSON.stringify({ id, day, timeZone, enabled });
    if (state.requests[requestKey]) {
      if (state.requests[requestKey] !== body)
        throw new Error('Completion request ID was already used for another change.');
      return;
    }
    // Record only after the ordinary in-memory validation/mutation succeeds below.
  }
  const key = action === 'complete' ? `${day}:${id}` : id;
  const field = action === 'flow' ? 'flowIds' : action === 'save' ? 'savedProductIds' : 'completed';
  if (action === 'complete') {
    const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    if (isDemoMode())
      state.profiles[user.id].completed = state.profiles[user.id].completed.filter(
        value => value.slice(0, 10) >= cutoff,
      );
    else
      await sqlClient()`UPDATE mobile_profiles SET data=jsonb_set(data,'{completed}',COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(data->'completed') value WHERE left(value #>> '{}',10)>=${cutoff}),'[]'::jsonb)) WHERE user_id=${user.id} AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(data->'completed') value WHERE left(value,10)<${cutoff})`;
  }
  let changed = false;
  if (isDemoMode()) {
    const profile = state.profiles[user.id];
    if (action === 'city') {
      changed = profile.city !== id;
      profile.city = id;
    } else {
      const values = profile[field];
      changed = values.includes(key) !== enabled;
      if (enabled && !values.includes(key) && values.length >= 1000)
        throw new Error('Your saved history limit is reached. Remove older entries first.');
      profile[field] = enabled
        ? [...new Set([...values, key])]
        : values.filter(value => value !== key);
    }
  } else {
    const sql = sqlClient();
    if (action === 'city')
      changed =
        (
          await sql`UPDATE mobile_profiles SET data=jsonb_set(data,'{city}',${JSON.stringify(id)}::jsonb),updated_at=now() WHERE user_id=${user.id} AND data->>'city'<>${id} RETURNING user_id`
        ).length > 0;
    else {
      const rows =
        await sql`UPDATE mobile_profiles SET data=jsonb_set(data,ARRAY[${field}],CASE WHEN ${enabled} THEN (data->${field}) || ${JSON.stringify([key])}::jsonb ELSE (data->${field}) - ${key} END),updated_at=now() WHERE user_id=${user.id} AND ((data->${field}) ? ${key})<>${enabled} AND (NOT ${enabled} OR jsonb_array_length(data->${field})<1000) RETURNING user_id`;
      changed = rows.length > 0;
      if (
        enabled &&
        !changed &&
        !profileBefore[field].includes(key) &&
        profileBefore[field].length >= 1000
      )
        throw new Error('Your saved history limit is reached.');
    }
  }
  if (changed)
    await trackMobile(
      user,
      action === 'complete'
        ? !enabled
          ? 'habit_uncompleted'
          : 'habit_completed'
        : action === 'save'
          ? !enabled
            ? 'product_unsaved'
            : 'product_saved'
          : action === 'flow'
            ? !enabled
              ? 'flow_removed'
              : 'flow_joined'
            : 'city_changed',
      action === 'complete'
        ? {
            kind: 'flow',
            id: id.split(':')[0],
            activityId: id.split(':').slice(1).join(':'),
          }
        : action === 'flow'
          ? { kind: 'flow', id }
          : action === 'save'
            ? { kind: 'product', id }
            : undefined,
    );
  if (action === 'complete' && requestId)
    state.requests[`${user.id}:completion:${requestId}`] = JSON.stringify({
      id,
      day,
      timeZone,
      enabled,
    });
}

export async function editCardWallet(user: PublicUser, raw: CardWalletAction) {
  const input = cardWalletSchema.parse(raw);
  const card = (await managedLibrary()).cards.find(value => value.id === input.id);
  if (!card) throw new Error('Card not available.');
  const profile = await getProfile(user);
  let record: BenefitUsage | undefined;
  if (input.action !== 'card-owned' && !profile.cardWallet?.[card.id])
    throw new Error('Add the card before recording benefits.');
  if (input.action === 'card-usage') {
    const benefit = card.benefits.find(value => value.id === input.benefitId);
    if (
      !benefit?.tracker ||
      input.used > benefit.tracker.limit ||
      (benefit.tracker.unit === 'uses' && !Number.isInteger(input.used))
    )
      throw new Error('Card benefit usage is outside its limit.');
    const period = benefitPeriod(
      benefit.tracker.period,
      new Date(),
      input.start && input.end ? { start: input.start, end: input.end } : undefined,
    );
    if (!period)
      throw new Error('Card benefit needs a valid current billing cycle (maximum 45 days).');
    if (input.start !== period.start || input.end !== period.end)
      throw new Error('Card benefit period changed. Refresh and check usage again.');
    record = {
      ...period,
      used: input.used,
      eligible: input.eligible,
      termsVersion: card.revision,
      checkedAt: new Date().toISOString(),
    };
  }
  let changed = false;
  if (isDemoMode()) {
    const wallet = (state.profiles[user.id].cardWallet ??= {});
    if (input.action === 'card-owned') {
      changed = Boolean(wallet[card.id]) !== input.enabled;
      if (input.enabled) wallet[card.id] ??= { usage: {} };
      else delete wallet[card.id];
    } else {
      const entry = wallet[card.id];
      if (!entry) throw new Error('Add the card before recording benefits.');
      if (input.action === 'card-fee') {
        changed = (entry.annualFeeOverride ?? null) !== input.annualFee;
        if (input.annualFee === null) delete entry.annualFeeOverride;
        else entry.annualFeeOverride = input.annualFee;
      } else {
        const before = entry.usage[input.benefitId];
        changed =
          !before ||
          before.used !== record!.used ||
          before.eligible !== record!.eligible ||
          before.start !== record!.start ||
          before.end !== record!.end ||
          before.termsVersion !== record!.termsVersion;
        if (changed) entry.usage[input.benefitId] = record!;
      }
    }
  } else {
    const sql = sqlClient();
    if (input.action === 'card-owned')
      changed =
        (input.enabled
          ? await sql`UPDATE mobile_profiles SET data=jsonb_set(data,'{cardWallet}',COALESCE(data->'cardWallet','{}'::jsonb)||${JSON.stringify({ [card.id]: { usage: {} } })}::jsonb),updated_at=now() WHERE user_id=${user.id} AND NOT (COALESCE(data->'cardWallet','{}'::jsonb)?${card.id}) RETURNING user_id`
          : await sql`UPDATE mobile_profiles SET data=jsonb_set(data,'{cardWallet}',COALESCE(data->'cardWallet','{}'::jsonb)-${card.id}),updated_at=now() WHERE user_id=${user.id} AND COALESCE(data->'cardWallet','{}'::jsonb)?${card.id} RETURNING user_id`
        ).length > 0;
    else if (input.action === 'card-fee')
      changed =
        (
          await sql`UPDATE mobile_profiles SET data=CASE WHEN ${input.annualFee === null} THEN data #- ARRAY['cardWallet',${card.id},'annualFeeOverride'] ELSE jsonb_set(data,ARRAY['cardWallet',${card.id},'annualFeeOverride'],${JSON.stringify(input.annualFee)}::jsonb) END,updated_at=now() WHERE user_id=${user.id} AND (data->'cardWallet')?${card.id} AND NULLIF(data->'cardWallet'->${card.id}->'annualFeeOverride','null'::jsonb) IS DISTINCT FROM NULLIF(${JSON.stringify(input.annualFee)}::jsonb,'null'::jsonb) RETURNING user_id`
        ).length > 0;
    else {
      const value = { ...record! };
      const { checkedAt: ignored, ...comparison } = value;
      void ignored;
      changed =
        (
          await sql`UPDATE mobile_profiles SET data=jsonb_set(data,ARRAY['cardWallet',${card.id},'usage',${input.benefitId}],${JSON.stringify(value)}::jsonb),updated_at=now() WHERE user_id=${user.id} AND (data->'cardWallet')?${card.id} AND ((data->'cardWallet'->${card.id}->'usage'->${input.benefitId})-'checkedAt') IS DISTINCT FROM ${JSON.stringify(comparison)}::jsonb RETURNING user_id`
        ).length > 0;
    }
  }
  if (changed)
    await trackMobile(
      user,
      input.action === 'card-owned'
        ? input.enabled
          ? 'card_added'
          : 'card_removed'
        : input.action === 'card-fee'
          ? 'card_fee_updated'
          : 'card_usage_updated',
      { kind: 'card', id: card.id },
    );
}

export async function markStorySeen(user: PublicUser, flowId: string, cardId: string, key: string) {
  const data = await mobileBootstrap(user);
  const group = buildStoryGroups(data).find(group => group.id === flowId);
  const card = group?.cards.find(card => card.id === cardId);
  if (!card || storyReadKey(card) !== key)
    throw new Error('Flow not found or story changed. Refresh your feed.');
  let changed = false;
  if (isDemoMode()) {
    const profile = state.profiles[user.id];
    const reads = profile.storyReads ?? [];
    changed = !reads.includes(key);
    if (changed) profile.storyReads = [...reads.slice(-999), key];
  } else {
    const sql = sqlClient();
    changed =
      (
        await sql`UPDATE mobile_profiles SET data=jsonb_set(data,'{storyReads}',COALESCE((SELECT jsonb_agg(value ORDER BY ord) FROM (SELECT value,ord FROM jsonb_array_elements(COALESCE(data->'storyReads','[]'::jsonb)) WITH ORDINALITY AS entries(value,ord) ORDER BY ord DESC LIMIT 999) recent),'[]'::jsonb)||${JSON.stringify([key])}::jsonb),updated_at=now() WHERE user_id=${user.id} AND NOT(COALESCE(data->'storyReads','[]'::jsonb)?${key}) RETURNING user_id`
      ).length > 0;
  }
  if (changed)
    await trackMobile(user, 'story_viewed', {
      kind: 'flow',
      id: flowId,
      activityId: cardId,
    });
}
