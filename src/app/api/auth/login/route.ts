import {apiError} from '@/lib/http';
// Do not leave the archived website password endpoint as an auth bypass.
export async function POST() {
  return apiError('Password sign-in has been removed. Use phone OTP in the mobile app.',410);
}
