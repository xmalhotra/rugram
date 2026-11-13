import { z } from 'zod';
import { apiError, apiJson } from '@/lib/http';
import { allowSharedRequest } from '@/lib/rate-limit';
import { observed, readMobileJson } from '@/lib/mobile-http';
import { tokenId } from '@/lib/session';
import {
  verifiedPhoneUser,
  createSession,
  deleteSession,
  isDemoMode,
  simulatedPhoneUser,
} from '@/lib/store';
import { trackMobile } from '@/lib/mobile-store';
import { mockOtpAllowed, normalizePhone, OtpError } from '@/lib/otp';
import { simulatedAccounts, type QuickLoginAccount } from '../../../../../shared/auth';
import { seedSimulatedCommunity } from '@/lib/mobile/simulated-community';
import { otpProvider } from '@/lib/otp-provider';
import { clientAddress } from '@/lib/client-address';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request'), phone: z.string().max(40) }).strict(),
  z
    .object({
      action: z.literal('verify'),
      challengeId: z.uuid(),
      code: z.string().regex(/^\d{4}(?:\d{2})?$/),
    })
    .strict(),
  z
    .object({ action: z.literal('quick'), account: z.number().int().min(1).max(simulatedAccounts.length) })
    .strict(),
]);
/** Tap-to-login is limited to the local mock-SMS demo, never a deployed or database backend. */
const quickLoginAllowed = () => mockOtpAllowed(process.env, isDemoMode());
async function signIn(phone: string, quick: boolean) {
  const user = quick ? await simulatedPhoneUser(phone) : await verifiedPhoneUser(phone);
  const token = crypto.randomUUID();
  await createSession(user.id, tokenId(token), new Date(Date.now() + 30 * 86400000));
  await trackMobile(user, 'signed_in');
  return apiJson({ token });
}
export const runtime = 'nodejs';
export const POST = observed(async (request: Request) => {
  const ip = clientAddress(request.headers);
  if (!(await allowSharedRequest(`mobile-login:${ip}`, 60, 60000)))
    return apiError('Too many login attempts. Try again later.', 429);
  const parsed = schema.safeParse(await readMobileJson(request));
  if (!parsed.success)
    return apiError(
      'Enter a phone number or a valid verification code. Password sign-in is no longer supported.',
    );
  try {
    const provider = otpProvider();
    if (parsed.data.action === 'request') {
      const phone = normalizePhone(parsed.data.phone);
      if (!phone)
        return apiError(
          'Enter a valid phone number with country code, for example +91 followed by your number.',
        );
      if (!(await allowSharedRequest(`otp-phone:${tokenId(phone)}`, 5, 3600000)))
        return apiError('Too many code requests. Try again later.', 429);
      return apiJson(await provider.request(phone));
    }
    if (parsed.data.action === 'quick') {
      if (!quickLoginAllowed()) return apiError('Quick login is not available.', 404);
      await seedSimulatedCommunity();
      return signIn(simulatedAccounts[parsed.data.account - 1].phone, true);
    }
    if (!(await allowSharedRequest(`otp-verify:${parsed.data.challengeId}`, 10, 600000)))
      return apiError('Too many attempts for this code. Request a new code.', 429);
    return signIn(await provider.verify(parsed.data.challengeId, parsed.data.code), false);
  } catch (error) {
    if (error instanceof OtpError) return apiError(error.message, error.status);
    if (error instanceof Error && error.message === 'Account is suspended.')
      return apiError(error.message, 403);
    throw error;
  }
});
export const GET = observed(async () => {
  const accounts: QuickLoginAccount[] = quickLoginAllowed()
    ? simulatedAccounts.map(account => ({ number: account.phone.slice(3), name: account.name }))
    : [];
  return apiJson({ accounts });
});
export const DELETE = observed(async (request: Request) => {
  const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9-]{36})$/i)?.[1];
  if (token) await deleteSession(tokenId(token));
  return apiJson({ ok: true });
});
