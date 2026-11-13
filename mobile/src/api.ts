import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { ApiError, readApiResponse } from '../../shared/api-response';
const lanHost = Constants.expoConfig?.hostUri?.split(':')[0];
const developmentPort = process.env.EXPO_PUBLIC_API_PORT ?? '3001';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ && lanHost ? `http://${lanHost}:${developmentPort}` : '');
let token: string | null = null;
const expiredListeners = new Set<() => void>();
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}
export async function restoreToken() {
  token = await SecureStore.getItemAsync('qram-token');
  return Boolean(token);
}
export async function setToken(value: string | null) {
  token = value;
  if (value) await SecureStore.setItemAsync('qram-token', value);
  else await SecureStore.deleteItemAsync('qram-token');
}
export async function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  if (!API_URL) throw new Error('Configure EXPO_PUBLIC_API_URL to connect to your backend.');
  if (!__DEV__ && !API_URL.startsWith('https://'))
    throw new Error('Production builds require an HTTPS backend URL.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const requestToken = token;
    const response = await fetch(`${API_URL}${path}`, {
      method: method ?? (body ? 'POST' : 'GET'),
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401 && requestToken && token === requestToken) {
      await setToken(null);
      for (const listener of expiredListeners) listener();
    }
    if (requestToken && token !== requestToken)
      throw new ApiError('Session changed. Please try again.', 401);
    return await readApiResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error(
        'Connection timed out. Check that your phone and backend can reach each other.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
