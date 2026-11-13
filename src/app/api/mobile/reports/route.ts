import { z } from 'zod';
import { apiJson, apiError, unauthorized } from '@/lib/http';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { getSessionUser } from '@/lib/store';
import { tokenId } from '@/lib/session';
import { allowSharedRequest } from '@/lib/rate-limit';
import {
  ownReport,
  createReport,
  resolveReport,
  reportWorklist,
  ReportError,
} from '@/lib/report-store';
import { reportReasons, reportOutcomes } from '../../../../../shared/reports';
async function viewer(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  return token ? getSessionUser(tokenId(token)) : null;
}
const target = { kind: z.enum(['pick', 'event']), itemId: z.string().min(1).max(128) };
export const GET = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (!(await allowSharedRequest(`reports-read:${user.id}`, 60, 60000)))
    return apiError('Please slow down.', 429);
  const params = Object.fromEntries(new URL(request.url).searchParams);
  try {
    if (params.view === 'open') {
      const input = z
        .object({ view: z.literal('open'), cursor: z.string().max(128).optional() })
        .strict()
        .safeParse(params);
      if (!input.success) return apiError('Choose a valid worklist.');
      return apiJson(await reportWorklist(user, input.data.cursor));
    }
    const input = z.object(target).strict().safeParse(params);
    if (!input.success) return apiError('Choose a pick or event.');
    return apiJson({ report: await ownReport(user, input.data.kind, input.data.itemId) });
  } catch (error) {
    if (error instanceof ReportError) return apiError(error.message, error.status);
    throw error;
  }
});
export const POST = observed(async (request: Request) => {
  const user = await viewer(request);
  if (!user) return unauthorized();
  if (
    !(await allowSharedRequest(
      `reports-write:${user.id}`,
      user.role === 'admin' ? 120 : 10,
      3600000,
    ))
  )
    return apiError('You have sent several reports. Please try later.', 429);
  const input = z
    .discriminatedUnion('action', [
      z
        .object({
          action: z.literal('create'),
          ...target,
          reason: z.enum(reportReasons),
          note: z
            .string()
            .trim()
            .max(200)
            .refine(value => !/[\r\n]/.test(value), 'Use one line.')
            .default(''),
        })
        .strict(),
      z
        .object({
          action: z.literal('resolve'),
          id: z.string().min(1).max(128),
          outcome: z.enum(reportOutcomes),
        })
        .strict(),
    ])
    .safeParse(await readMobileJson(request));
  if (!input.success) return apiError('Choose a report reason and a note of up to 200 characters.');
  try {
    if (input.data.action === 'resolve') {
      await resolveReport(user, input.data.id, input.data.outcome);
      return apiJson({ ok: true });
    }
    return apiJson({ report: await createReport(user, input.data) });
  } catch (error) {
    if (error instanceof ReportError) return apiError(error.message, error.status);
    throw error;
  }
});
