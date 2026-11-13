import 'server-only';
import { isDemoMode } from './store';
import { MockOtpProvider, mockOtpAllowed, OtpError, type OtpProvider } from './otp';
import { Msg91OtpProvider } from './msg91';
import { phoneChallengeStore } from './phone-challenge-store';
import { Msg91WidgetProvider } from './msg91-widget';
declare global {
  var betterHabitsMockOtp: MockOtpProvider | undefined;
}
export function otpProvider(): OtpProvider {
  if (process.env.SMS_PROVIDER === 'msg91-widget' && !isDemoMode()) {
    const length = process.env.MSG91_OTP_LENGTH ?? '6';
    if (!['4', '6'].includes(length))
      throw new OtpError('SMS code length is not configured correctly.', 503);
    return new Msg91WidgetProvider(
      process.env.MSG91_AUTH_KEY ?? '',
      process.env.MSG91_WIDGET_ID ?? '',
      phoneChallengeStore,
      undefined,
      undefined,
      length === '4' ? 4 : 6,
      process.env.MSG91_WIDGET_TOKEN ?? '',
    );
  }
  if (process.env.SMS_PROVIDER === 'msg91' && !isDemoMode())
    return new Msg91OtpProvider(
      process.env.MSG91_AUTH_KEY ?? '',
      process.env.MSG91_TEMPLATE_ID ?? '',
      phoneChallengeStore,
    );
  if (!mockOtpAllowed(process.env, isDemoMode()))
    throw new OtpError(
      'SMS sign-in is not configured. Connect a real SMS provider before deployment.',
      503,
    );
  return (globalThis.betterHabitsMockOtp ??= new MockOtpProvider());
}
