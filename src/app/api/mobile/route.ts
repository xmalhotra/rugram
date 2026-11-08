import { z } from 'zod';
import { apiError, apiJson, unauthorized } from '@/lib/http';
import { getSessionUser, updateMemberName, updateUsername } from '@/lib/store';
import { usernameClientError } from '../../../../shared/usernames';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import { observed, readMobileJson } from '@/lib/mobile-http';
import {
  updateCuratedEvent,
  editCardWallet,
  editProfile,
  endorseProduct,
  mobileBootstrap,
  reviewItem,
  rsvpEvent,
  submitItem,
  trackEventOpen,
  trackMobile,
} from '@/lib/mobile-store';
import { cardWalletActions } from '../../../../shared/card-wallet-validation';
import { productSchema as product } from '@/lib/product-validation';
import { eventDirectories } from '../../../../shared/event-discovery';
import { creatorEventSchema, eventLinkSchema } from '@/lib/event-validation';
import { markStorySeen, trackContentView, setCreatorEventLimit } from '@/lib/mobile-store';
import { changePendingSubmission, editAppearance } from '@/lib/mobile-store';
import { reviewCodes } from '../../../../shared/moderation';
import { personalFlowActions, editPersonalFlow } from '@/lib/mobile/personal-flows';

import { requestMemberEmail, verifyMemberEmail } from '@/lib/member-email';
import { createWorkout, workoutSchema } from '@/lib/exercise-store';
const id = z.string().min(1).max(128);
const url = z
  .string()
  .url()
  .refine(value => value.startsWith('https://'), 'Use an HTTPS source link.');
const event = z.object({
  title: z.string().trim().min(3).max(100),
  city: z.string().trim().min(2).max(80),
  venue: z.string().trim().min(3).max(160),
  startsAt: z
    .string()
    .datetime()
    .refine(value => new Date(value).getTime() > Date.now(), 'Choose a future date.'),
  capacity: z.number().int().min(1).max(10000),
  price: z.number().nonnegative().max(100000),
  description: z.string().trim().min(10).max(800),
});
const action = z.discriminatedUnion('action', [
  ...personalFlowActions,
  ...cardWalletActions,
  z
    .object({ action: z.literal('appearance'), value: z.enum(['system', 'light', 'dark']) })
    .strict(),
  z.object({ action: z.literal('profile-name'), name: z.string().trim().min(2).max(80) }).strict(),
  z.object({ action: z.literal('profile-username'), username: z.string().max(40) }).strict(),
  z
    .object({ action: z.literal('email-code'), email: z.string().trim().email().max(160) })
    .strict(),
  z
    .object({
      action: z.literal('email-verify'),
      challengeId: z.string().uuid(),
      code: z.string().regex(/^\d{6}$/),
    })
    .strict(),
  z.object({ action: z.literal('city'), id: z.string().trim().min(2).max(80) }),
  z.object({ action: z.literal('focus'), id: z.string().min(1).max(128) }),
  z.object({
    action: z.literal('workout-flow'),
    workout: workoutSchema,
    requestId: z.string().min(8).max(80),
  }),
  z.object({
    action: z.enum(['flow', 'save', 'complete', 'rsvp', 'equipment', 'save-event']),
    id,
    enabled: z.boolean(),
    completionDay: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    requestId: z.string().min(8).max(80).optional(),
    timeZone: z
      .string()
      .max(80)
      .optional()
      .refine(value => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, 'Invalid time zone.'),
  }),
  z
    .object({
      action: z.literal('review'),
      id,
      status: z.enum(['published', 'archived']),
      reviewNote: z.string().trim().max(500).optional(),
      reviewCode: z.enum(reviewCodes).optional(),
    })
    .strict(),
  z.object({ action: z.literal('submission-update'), id, data: z.unknown() }).strict(),
  z.object({ action: z.literal('submission-withdraw'), id }).strict(),
  z.object({ action: z.literal('product'), product, requestId: z.string().min(8).max(80) }),
  z.object({ action: z.literal('event'), event, requestId: z.string().min(8).max(80) }),
  z.object({
    action: z.literal('event-link'),
    event: z.union([eventLinkSchema, creatorEventSchema]),
    requestId: z.string().min(8).max(80),
  }),
  z
    .object({
      action: z.literal('creator-event-limit'),
      creatorHandle: z.string().trim().min(1).max(80),
      limit: z.number().int().min(0).max(100),
    })
    .strict(),
  z.object({ action: z.literal('event-update'), id, event: eventLinkSchema }),
  z.object({ action: z.literal('event-open'), id }),
  z.object({
    action: z.literal('content-view'),
    kind: z.enum(['flow', 'product', 'event', 'exercise', 'card', 'guide']),
    id,
  }),
  z
    .object({
      action: z.literal('search-open'),
      kind: z.enum(['flow', 'product', 'event', 'exercise']),
      id,
    })
    .strict(),
  z
    .object({ action: z.literal('share-opened'), kind: z.enum(['flow', 'product', 'event']), id })
    .strict(),
  z
    .object({
      action: z.literal('outbound-opened'),
      host: z
        .string()
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/)
        .max(253),
      affiliate: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal('story-seen'),
      flowId: id,
      cardId: z.string().min(1).max(400),
      key: z.string().min(1).max(500),
    })
    .strict(),
  z.object({
    action: z.literal('event-directory-open'),
    id: z.enum(eventDirectories.map(source => source.id) as [string, ...string[]]),
  }),
  z.object({
    action: z.literal('endorse'),
    id,
    sourceUrl: url,
    disclosure: z.string().trim().min(3).max(200),
  }),
]);
async function userFor(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}
export const GET = observed(async (request: Request) => {
  const user = await userFor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`mobile-read:${user.id}`, 120, 60000)))
    return apiError('Please slow down.', 429);
  const cursor = new URL(request.url).searchParams.get('cursor') ?? '';
  if (cursor.length > 128) return apiError('Invalid cursor.');
  return apiJson(await mobileBootstrap(user, cursor));
});
export const POST = observed(async (request: Request) => {
  const user = await userFor(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`mobile-action:${user.id}`, 120, 60000)))
    return apiError('Please slow down and try again.', 429);
  const parsed = action.safeParse(await readMobileJson(request));
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Check your entry.');
  try {
    const input = parsed.data;
    if ((input.action === 'event' || input.action === 'event-update') && user.role !== 'admin')
      return apiError('Admin access required to curate events.', 403);
    if (
      input.action === 'personal-flow-create' ||
      input.action === 'personal-flow-add' ||
      input.action === 'personal-flow-rename' ||
      input.action === 'personal-flow-remove' ||
      input.action === 'personal-flow-move'
    )
      await editPersonalFlow(user, input);
    else if (input.action === 'appearance') await editAppearance(user, input.value);
    else if (input.action === 'profile-name') await updateMemberName(user, input.name);
    else if (input.action === 'profile-username') await updateUsername(user, input.username);
    else if (input.action === 'email-code') {
      const emailChallenge = await requestMemberEmail(user, input.email);
      const fresh = (await userFor(request)) ?? user;
      return apiJson({ ...(await mobileBootstrap(fresh)), emailChallenge });
    } else if (input.action === 'email-verify')
      await verifyMemberEmail(user, input.challengeId, input.code);
    else if (input.action === 'creator-event-limit')
      await setCreatorEventLimit(user, input.creatorHandle, input.limit);
    else if (
      input.action === 'card-owned' ||
      input.action === 'card-fee' ||
      input.action === 'card-usage'
    )
      await editCardWallet(user, input);
    else if (input.action === 'submission-update' || input.action === 'submission-withdraw')
      await changePendingSubmission(
        user,
        input.id,
        input.action === 'submission-withdraw' ? 'withdraw' : 'edit',
        input.action === 'submission-update' ? input.data : undefined,
      );
    else if (input.action === 'review')
      await reviewItem(user, input.id, input.status, input.reviewNote, input.reviewCode);
    else if (input.action === 'workout-flow')
      await createWorkout(user, input.workout, input.requestId);
    else if (input.action === 'product')
      await submitItem(
        user,
        { ...input.product, id: '', createdBy: '', status: 'pending', endorsements: [] },
        input.requestId,
      );
    else if (input.action === 'event')
      return apiError('Use the curated Hyderabad tech event editor.', 410);
    else if (input.action === 'event-link') {
      const checked = // Any member can host; non-admin events use the host schema and wait for review.
        (user.role !== 'admin' ? creatorEventSchema : eventLinkSchema).safeParse(
        input.event,
      );
      if (!checked.success)
        return apiError(checked.error.issues[0]?.message ?? 'Check event details.');
      await submitItem(
        user,
        { ...checked.data, id: '', createdBy: '', status: 'pending', capacity: 0, price: 0 },
        input.requestId,
      );
    } else if (input.action === 'event-update')
      await updateCuratedEvent(user, input.id, input.event);
    else if (input.action === 'story-seen')
      await markStorySeen(user, input.flowId, input.cardId, input.key);
    else if (input.action === 'content-view') await trackContentView(user, input.kind, input.id);
    else if (input.action === 'search-open') {
      await trackContentView(user, input.kind, input.id);
      await trackMobile(user, 'search_open', { kind: input.kind, id: input.id });
    } else if (input.action === 'share-opened') {
      await trackContentView(user, input.kind, input.id);
      await trackMobile(user, 'share_opened', { kind: input.kind, id: input.id });
    } else if (input.action === 'outbound-opened')
      await trackMobile(user, 'outbound_opened', {
        kind: input.affiliate ? 'affiliate-host' : 'external-host',
        id: input.host,
      });
    else if (input.action === 'event-open') await trackEventOpen(user, input.id);
    else if (input.action === 'event-directory-open')
      await trackMobile(user, 'event_directory_opened');
    else if (input.action === 'endorse')
      await endorseProduct(user, input.id, input.sourceUrl, input.disclosure);
    else if (input.action === 'rsvp') await rsvpEvent(user, input.id, input.enabled);
    else if (input.action === 'city' || input.action === 'focus')
      await editProfile(user, input.action, input.id);
    else
      await editProfile(
        user,
        input.action,
        input.id,
        input.enabled,
        input.timeZone,
        input.completionDay,
        input.requestId,
      );
    const fresh = (await userFor(request)) ?? user;
    return apiJson(await mobileBootstrap(fresh));
  } catch (error) {
    if (error instanceof z.ZodError)
      return apiError(error.issues[0]?.message ?? 'Check your entry.');
    if ((error as { code?: string })?.code === '23514')
      return apiError(
        'Event not available for this edit: review capacity, registrations and cancellation.',
      );
    const message = error instanceof Error ? error.message : '';
    if (usernameClientError(message)) return apiError(message, 400);
    if (
      !/^(Personal flow |Completion |Creator not found|Creator event|Card not available|Card benefit|Add the card|Only creators|Admin access|Creator access|Equipment not available|Exercise not available|Flow not found|Focus not available|Join the flow|Product not available|Listing not found|Event not available|This event|Content event|Content cancelled|Your saved history|Account )/.test(
        message,
      )
    )
      throw error;
    return apiError(
      message,
      /^Creator event monthly/.test(message)
        ? 429
        : /access required|Only creators/.test(message)
          ? 403
          : 400,
    );
  }
});
