import { z } from 'zod';
import { communityLimits } from '../../shared/community-flows';

const id = z.string().regex(/^community-[a-zA-Z0-9-]{8,80}$/);
const personalId = z.string().regex(/^personal-[a-zA-Z0-9-]{8,80}$/);
const activityId = z.string().regex(/^activity-[a-zA-Z0-9-]{8,80}$/);

/** Timeline posts come from a finished flow run. A direct log is not a valid action. */
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
    .object({
      action: z.literal('follow'),
      authorId: z.string().min(1).max(128),
      enabled: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal('save'), id, personalFlowId: personalId }).strict(),
  z.object({ action: z.literal('take-update'), personalFlowId: personalId }).strict(),
  z.object({ action: z.literal('unlog'), id: activityId }).strict(),
]);
