import { randomUUID } from 'node:crypto';
import type { OtpChallenge } from '../../shared/auth';
import { normalizePhone, OtpError, type OtpProvider } from './otp';
import type { PhoneChallengeStore } from './msg91';
import { telemetryEnabled } from './runtime-config';

export interface WidgetChallengeStore extends PhoneChallengeStore {
  attachRequest(id: string, requestId: string, widgetId: string): Promise<boolean>;
  providerRequest(id: string, widgetId: string): Promise<string | null>;
}

/** MSG91's server-side widget REST contract; no secret or provider JWT reaches mobile. */
export class Msg91WidgetProvider implements OtpProvider {
  constructor(
    private key: string,
    private widgetId: string,
    private store: WidgetChallengeStore,
    private send: typeof fetch = fetch,
    private now = () => Date.now(),
    private otpLength: 4 | 6 = 6,
    private widgetToken: string = '',
  ) {
    if (!key.trim() || !widgetId.trim() || !widgetToken.trim())
      throw new OtpError('SMS widget sign-in is not configured.', 503);
  }

  private async call(action: string, body: Record<string, string>): Promise<string> {
    try {
      const serverVerification = action === 'verifyAccessToken';
      const payload = serverVerification
        ? { ...body, authkey: this.key }
        : { ...body, widgetId: this.widgetId, tokenAuth: this.widgetToken };
      const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
      };
      let url = new URL(`https://control.msg91.com/api/v5/widget/${action}`);
      let response = await this.send(url.href, options);
      // MSG91 can redirect between its two documented API hosts. Never let fetch
      // forward credentials automatically, change POST to GET, or follow arbitrary URLs.
      for (let redirects = 0; [301, 302, 307, 308].includes(response.status); redirects++) {
        const location = response.headers.get('location');
        const next = location ? new URL(location, url) : null;
        if (
          redirects >= 2 ||
          !next ||
          next.protocol !== 'https:' ||
          !['control.msg91.com', 'api.msg91.com'].includes(next.hostname) ||
          next.port ||
          next.username ||
          next.password ||
          next.search ||
          next.hash ||
          next.pathname !== `/api/v5/widget/${action}`
        ) {
          await response.body?.cancel();
          throw new OtpError('SMS service unavailable. Please try again.', 503);
        }
        await response.body?.cancel();
        url = next;
        response = await this.send(url.href, options);
      }
      const data: unknown = await response.json();
      const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
      if (telemetryEnabled()) {
        const message = typeof record.message === 'string' ? record.message : '';
        const reason = /captcha/i.test(message)
          ? 'captcha_required'
          : /auth|token/i.test(message)
            ? 'authentication_rejected'
            : /balance|credit/i.test(message)
              ? 'insufficient_balance'
              : /mobile|identifier/i.test(message)
                ? 'identifier_rejected'
                : /request.*allow|integration/i.test(message)
                  ? 'integration_rejected'
                  : record.type === 'success'
                    ? 'success'
                    : 'provider_rejected';
        // Never log upstream text, identifiers, request IDs, OTPs or credentials.
        console.info(
          JSON.stringify({
            event: 'otp_provider_response',
            action,
            httpStatus: response.status,
            reason,
            messageKind: typeof record.message,
            hasRequestId: typeof record.reqId === 'string',
            hasNestedRequestId:
              !!record.message &&
              typeof record.message === 'object' &&
              'reqId' in record.message &&
              typeof record.message.reqId === 'string',
          }),
        );
      }
      if (
        !response.ok ||
        !data ||
        typeof data !== 'object' ||
        !('type' in data) ||
        data.type !== 'success' ||
        !('message' in data) ||
        typeof data.message !== 'string' ||
        !data.message
      ) {
        throw new OtpError(
          action === 'verifyOtp'
            ? 'Incorrect or expired code. Please try again.'
            : 'SMS service unavailable. Please try again.',
          action === 'verifyOtp' ? 400 : 503,
        );
      }
      return data.message;
    } catch (error) {
      if (error instanceof OtpError) throw error;
      if (telemetryEnabled()) {
        const cause = error instanceof Error && 'cause' in error ? error.cause : null;
        const code = cause && typeof cause === 'object' && 'code' in cause ? cause.code : null;
        const reason =
          error instanceof SyntaxError
            ? 'invalid_json'
            : error instanceof Error && /Timeout|Abort/.test(error.name)
              ? 'timeout'
              : typeof code === 'string' &&
                  [
                    'ENOTFOUND',
                    'ECONNREFUSED',
                    'ETIMEDOUT',
                    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
                  ].includes(code)
                ? code
                : 'transport_failure';
        console.info(JSON.stringify({ event: 'otp_provider_failure', action, reason }));
      }
      throw new OtpError('SMS service unavailable. Please try again.', 503);
    }
  }

  async request(phone: string): Promise<OtpChallenge> {
    if (normalizePhone(phone) !== phone)
      throw new OtpError('Enter a valid phone number with country code.');
    const now = this.now();
    const item = {
      challengeId: randomUUID(),
      expiresAt: now + 300000,
      resendAt: now + 60000,
      otpLength: this.otpLength,
    };
    if (!(await this.store.reserve(phone, item)))
      throw new OtpError('Wait 60 seconds before requesting another code.', 429);
    try {
      const reqId = await this.call('sendOtpMobile', {
        identifier: phone.slice(1),
      });
      if (!(await this.store.attachRequest(item.challengeId, reqId, this.widgetId)))
        throw new OtpError('Code expired or unavailable. Request a new code.');
      return item;
    } catch (error) {
      await this.store.invalidate(item.challengeId);
      throw error;
    }
  }

  async verify(id: string, code: string): Promise<string> {
    if (!new RegExp(`^\\d{${this.otpLength}}$`).test(code))
      throw new OtpError(`Enter a valid ${this.otpLength}-digit code.`);
    const phone = await this.store.attempt(id);
    const reqId = phone ? await this.store.providerRequest(id, this.widgetId) : null;
    if (!phone || !reqId) throw new OtpError('Code expired or unavailable. Request a new code.');
    const token = await this.call('verifyOtp', { reqId, otp: code });
    const identifier = await this.call('verifyAccessToken', { 'access-token': token });
    // The verified token must refer to this challenge's phone, never a client-supplied identity.
    const verified = normalizePhone(identifier.startsWith('+') ? identifier : `+${identifier}`);
    if (verified !== phone) throw new OtpError('Phone verification failed. Request a new code.');
    if (!(await this.store.consume(id)))
      throw new OtpError('Code expired or unavailable. Request a new code.');
    return phone;
  }
}
