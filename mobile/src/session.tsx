import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api, onSessionExpired, restoreToken, setToken } from './api';
import type { MobilePayload } from '../../shared/mobile';
import type { OtpChallenge } from '../../shared/auth';
import { ApiError } from '../../shared/api-response';
import { clearSearches } from './local-searches';
import { resetStrength } from './strength';
type Session = {
  data: MobilePayload | null;
  loading: boolean;
  busy: boolean;
  error: string;
  updatedAt: Date | null;
  bootstrapFailed: boolean;
  setData: React.Dispatch<React.SetStateAction<MobilePayload | null>>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
  refresh: () => Promise<void>;
  requestOtp: (phone: string) => Promise<OtpChallenge | null>;
  verifyOtp: (challengeId: string, code: string) => Promise<void>;
  quickLogin: (account: number) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MobilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const generation = useRef(0);
  useEffect(
    () =>
      onSessionExpired(() => {
        generation.current++;
        setData(null);
        setBootstrapFailed(false);
        setUpdatedAt(null);
        setError('Session expired, please sign in again.');
      }),
    [],
  );
  useEffect(() => {
    let alive = true;
    const current = generation.current;
    void (async () => {
      try {
        if (await restoreToken()) {
          const value = await api<MobilePayload>('/api/mobile');
          if (alive && current === generation.current) {
            setData(value);
            setUpdatedAt(new Date());
          }
        }
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Could not connect.');
          setBootstrapFailed(!(e instanceof ApiError && e.status === 401));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function refresh() {
    const current = generation.current;
    setBusy(true);
    try {
      const value = await api<MobilePayload>('/api/mobile');
      if (current === generation.current) {
        setData(value);
        setUpdatedAt(new Date());
        setBootstrapFailed(false);
        setError('');
      }
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Could not refresh.');
    } finally {
      setBusy(false);
    }
  }
  async function requestOtp(phone: string) {
    setBusy(true);
    setError('');
    try {
      return await api<OtpChallenge>('/api/mobile/auth', { action: 'request', phone });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not request a code.');
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function verifyOtp(challengeId: string, code: string) {
    await signIn({ action: 'verify', challengeId, code });
  }
  /** Local demo only: the server refuses this outside its mock-SMS demo mode. */
  async function quickLogin(account: number) {
    await signIn({ action: 'quick', account });
  }
  async function signIn(body: object) {
    const current = ++generation.current;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ token: string }>('/api/mobile/auth', body);
      if (current !== generation.current) return;
      await setToken(result.token);
      // Strength numbers are per member: never show the last account's.
      resetStrength();
      const value = await api<MobilePayload>('/api/mobile');
      if (current === generation.current) {
        setData(value);
        setUpdatedAt(new Date());
      }
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    generation.current++;
    if (data) void clearSearches(data.user.id).catch(() => undefined);
    const revoke = api('/api/mobile/auth', undefined, 'DELETE').catch(() => undefined);
    setData(null);
    setBootstrapFailed(false);
    setUpdatedAt(null);
    setError('');
    setBusy(false);
    await setToken(null);
    // Strength numbers are per member: never show the last account's.
    resetStrength();
    void revoke;
  }
  return (
    <Context.Provider
      value={{
        data,
        loading,
        busy,
        error,
        updatedAt,
        bootstrapFailed,
        setData,
        setBusy,
        setError,
        refresh,
        requestOtp,
        verifyOtp,
        quickLogin,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider is required.');
  return value;
}
