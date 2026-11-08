import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { usePaneState } from './pane-state';

/**
 * The city whose events the Events tab shows. Null until the member picks one, so a new
 * member starts on the discovery screen. Remembered on this device per account.
 */
export function useEventCity(userId: string | undefined) {
  const key = `qram.eventCity.${userId ?? 'guest'}`.replace(/[^\w.-]/g, '_');
  const [city, setCityState] = usePaneState<string | null | undefined>('eventCity', undefined, 'account');
  useEffect(() => {
    if (city !== undefined) return;
    void SecureStore.getItemAsync(key)
      .then(value => setCityState(value || null))
      .catch(() => setCityState(null));
  }, [city, key, setCityState]);
  function setCity(next: string | null) {
    setCityState(next);
    void (next ? SecureStore.setItemAsync(key, next) : SecureStore.deleteItemAsync(key)).catch(
      () => undefined,
    );
  }
  // undefined while the saved choice loads, so the screen does not flash discovery first.
  return { city, setCity, loading: city === undefined };
}
